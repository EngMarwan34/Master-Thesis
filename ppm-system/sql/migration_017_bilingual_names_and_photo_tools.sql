-- =====================================================================
-- ترقية ١٧: اسم إنجليزي لكل فني (مع تحويل تلقائي احتياطي من العربي)،
-- واسم الجهاز بلغة واحدة في التقرير حسب اللغة المختارة، + أدوات صور:
-- تدوير ٩٠° (ينشئ نسخة جديدة ويبقي الأصلية) وإخفاء مكرر من التقرير
-- (دون حذفه من التخزين) وبصمة بصرية (dHash) لكشف التكرار.
-- آمنة للرجوع: كل عمود جديد يقبل NULL، لا حذف لأي بيانات أو ملفات.
-- شغّلها بعد migration_016.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- ١. اسم الفني بالإنجليزية: full_name_en (يدخله المشرف يدوياً، يُطبع
--    في التقرير الإنجليزي كما هو) و full_name_en_auto (يُعبّأ تلقائياً
--    بالذكاء الاصطناعي إن تُرك الأول فارغاً — احتياطي فقط).
-- ---------------------------------------------------------------------
alter table profiles add column if not exists full_name_en text;
alter table profiles add column if not exists full_name_en_auto text;

drop function if exists update_staff_profile(uuid,text,text,boolean,text);
create or replace function update_staff_profile(p_id uuid,p_full_name text,p_phone text,p_active boolean,
  p_language text default 'ar', p_full_name_en text default null) returns void
language plpgsql security definer set search_path=public as $$
begin
  if my_role() is distinct from 'supervisor' or not exists(
    select 1 from profiles p where p.id=p_id and p.branch=my_branch() and p.role='technician') then
    raise exception 'Technician in your branch required'; end if;
  if nullif(trim(p_full_name),'') is null or length(p_full_name)>100 or length(coalesce(p_phone,''))>40 or p_active is null
     or p_language not in ('ar','en') or length(coalesce(p_full_name_en,''))>100 then
    raise exception 'Invalid technician details'; end if;
  update profiles set full_name=trim(p_full_name),phone=nullif(trim(p_phone),''),active=p_active,language=p_language,
    full_name_en=nullif(trim(p_full_name_en),'') where id=p_id;
end $$;
revoke all on function update_staff_profile(uuid,text,text,boolean,text,text) from public;
grant execute on function update_staff_profile(uuid,text,text,boolean,text,text) to authenticated;

-- يُستدعى بعد نجاح الترجمة الآلية لاسم الفني (لا يكتب فوق اسم أدخله
-- المشرف يدوياً بعد ذلك — full_name_en لازم يبقى فارغاً)
create or replace function set_profile_name_en_auto(p_id uuid, p_name_en_auto text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if my_role() is distinct from 'supervisor' or not exists(
    select 1 from profiles p where p.id=p_id and p.branch=my_branch()) then
    raise exception 'Access denied'; end if;
  update profiles set full_name_en_auto=nullif(trim(p_name_en_auto),'')
    where id=p_id and full_name_en is null;
end $$;
revoke all on function set_profile_name_en_auto(uuid,text) from public;
grant execute on function set_profile_name_en_auto(uuid,text) to authenticated;

-- فريق الزيارة: أضِف full_name_en/full_name_en_auto ليستخدمها التقرير
create or replace function visit_team(p_visit_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare v visits%rowtype; result jsonb;
begin
  select * into v from visits where id=p_visit_id;
  if v.id is null or not ((is_staff() and can_see_client(v.client_id)) or
    (my_role()='client' and v.client_id=my_client() and v.status='approved')) then raise exception 'Visit access denied'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('technician_id',p.id,'full_name',p.full_name,
      'full_name_en',p.full_name_en,'full_name_en_auto',p.full_name_en_auto) order by p.full_name),'[]'::jsonb)
    into result from profiles p where p.id=v.technician_id or exists (
      select 1 from visit_technicians t where t.visit_id=v.id and t.technician_id=p.id);
  return result;
end $$;

-- ---------------------------------------------------------------------
-- ٢. صور: بصمة بصرية (dHash) لكشف التكرار + علم "مخفاة من التقرير"
--    (الصورة تبقى في قاعدة البيانات والتخزين، فقط لا تُطبع).
-- ---------------------------------------------------------------------
alter table photos add column if not exists phash text;
alter table photos add column if not exists hidden boolean not null default false;

create or replace function save_visit_item(p_visit_id uuid, p_asset_id uuid,
  p_condition text, p_notes text, p_parts text, p_photos jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare result_id uuid; v visits%rowtype; new_notes text; new_parts text;
begin
  select * into v from visits where id = p_visit_id for update;
  if v.id is null or not can_edit_visit(p_visit_id) then raise exception 'Visit is not editable'; end if;
  if jsonb_typeof(p_photos) is distinct from 'array' or jsonb_array_length(p_photos) > 30 then
    raise exception 'Invalid photos'; end if;
  if not exists (select 1 from jsonb_array_elements(p_photos) p where p->>'type' = 'general' and length(p->>'url') > 0)
    then raise exception 'General photo required'; end if;
  if p_condition not in ('سليم','غير متاح للفحص') and (
    nullif(trim(p_parts),'') is null or not exists (
      select 1 from jsonb_array_elements(p_photos) p where p->>'type' = 'defect' and length(p->>'url') > 0))
    then raise exception 'Defect photo and description required'; end if;
  if p_condition = 'غير متاح للفحص' and nullif(trim(p_notes),'') is null then
    raise exception 'Explain why the asset is inaccessible'; end if;

  new_notes := nullif(trim(p_notes),'');
  new_parts := case when p_condition in ('سليم','غير متاح للفحص') then null else nullif(trim(p_parts),'') end;

  insert into visit_items(visit_id,asset_id,condition,technician_notes,parts_needed_text,translation_pending,performed_by)
    values(p_visit_id,p_asset_id,p_condition,new_notes,new_parts,(new_notes is not null or new_parts is not null),auth.uid())
    on conflict (visit_id,asset_id) do update set
      condition = excluded.condition,
      technician_notes = excluded.technician_notes,
      parts_needed_text = excluded.parts_needed_text,
      translation_pending = case
        when excluded.technician_notes is distinct from visit_items.technician_notes
          or excluded.parts_needed_text is distinct from visit_items.parts_needed_text
        then (excluded.technician_notes is not null or excluded.parts_needed_text is not null)
        else visit_items.translation_pending end,
      notes_ar = case when excluded.technician_notes is distinct from visit_items.technician_notes then null else visit_items.notes_ar end,
      notes_en = case when excluded.technician_notes is distinct from visit_items.technician_notes then null else visit_items.notes_en end,
      parts_ar = case when excluded.parts_needed_text is distinct from visit_items.parts_needed_text then null else visit_items.parts_ar end,
      parts_en = case when excluded.parts_needed_text is distinct from visit_items.parts_needed_text then null else visit_items.parts_en end,
      notes_ar_locked = case when excluded.technician_notes is distinct from visit_items.technician_notes then false else visit_items.notes_ar_locked end,
      notes_en_locked = case when excluded.technician_notes is distinct from visit_items.technician_notes then false else visit_items.notes_en_locked end,
      parts_ar_locked = case when excluded.parts_needed_text is distinct from visit_items.parts_needed_text then false else visit_items.parts_ar_locked end,
      parts_en_locked = case when excluded.parts_needed_text is distinct from visit_items.parts_needed_text then false else visit_items.parts_en_locked end
      -- performed_by عمداً غير موجود بالتحديث هنا، يبقى على أول من أنشأ البند
    returning id into result_id;
  delete from photos where visit_item_id = result_id;
  insert into photos(visit_item_id,url,type,phash,hidden)
    select result_id, p->>'url', p->>'type', nullif(p->>'phash',''), coalesce((p->>'hidden')::boolean,false)
    from jsonb_array_elements(p_photos) p;
  return result_id;
end $$;
revoke all on function save_visit_item(uuid,uuid,text,text,text,jsonb) from public;
grant execute on function save_visit_item(uuid,uuid,text,text,text,jsonb) to authenticated;

-- تدوير صورة ٩٠°: يرفع الفني/التطبيق نسخة مدوَّرة جديدة إلى التخزين،
-- وهذه الدالة تسجّلها وتُخفي (لا تحذف) الأصل. للمشرف فقط من شاشة المراجعة.
create or replace function add_rotated_photo(p_old_photo_id uuid, p_new_url text) returns uuid
language plpgsql security invoker set search_path=public as $$
declare old photos%rowtype; new_id uuid;
begin
  if my_role() <> 'supervisor' then raise exception 'Supervisor access required'; end if;
  select * into old from photos where id=p_old_photo_id;
  if old.id is null then raise exception 'Photo not found or access denied'; end if;
  if nullif(trim(p_new_url),'') is null then raise exception 'Missing url'; end if;
  insert into photos(visit_item_id,url,type,phash,hidden) values(old.visit_item_id,p_new_url,old.type,null,false) returning id into new_id;
  update photos set hidden=true where id=p_old_photo_id;
  return new_id;
end $$;
revoke all on function add_rotated_photo(uuid,text) from public;
grant execute on function add_rotated_photo(uuid,text) to authenticated;

-- إخفاء/إظهار صورة في التقرير فقط (تبقى محفوظة بالكامل). للمشرف فقط.
create or replace function set_photo_hidden(p_photo_id uuid, p_hidden boolean) returns void
language plpgsql security invoker set search_path=public as $$
declare ph photos%rowtype;
begin
  if my_role() <> 'supervisor' then raise exception 'Supervisor access required'; end if;
  select * into ph from photos where id=p_photo_id;
  if ph.id is null then raise exception 'Photo not found or access denied'; end if;
  update photos set hidden=p_hidden where id=p_photo_id;
end $$;
revoke all on function set_photo_hidden(uuid,boolean) from public;
grant execute on function set_photo_hidden(uuid,boolean) to authenticated;

commit;
