-- =====================================================================
-- ترقية ١٥: ترجمة تلقائية ثنائية اللغة لملاحظات وقطع كل بند فحص
-- (منفصلة عن النص الأصلي الذي كتبه الفني — لا يُحذف ولا يُعدَّل أبداً)
-- آمنة للرجوع: كل عمود جديد يقبل NULL ولا تُعدَّل أي بيانات قديمة.
-- شغّلها بعد migration_014.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- ١. أعمدة جديدة على بنود الزيارة: نسخ عربية/إنجليزية نظيفة لكل من
--    الملاحظات والقطع المطلوبة، مع لغة النص الأصلي، وحالة "بانتظار
--    الترجمة"، وأقفال تمنع الترجمة التلقائية من الكتابة فوق تعديل
--    يدوي للمكتب.
-- ---------------------------------------------------------------------
alter table visit_items add column if not exists notes_ar text;
alter table visit_items add column if not exists notes_en text;
alter table visit_items add column if not exists parts_ar text;
alter table visit_items add column if not exists parts_en text;
alter table visit_items add column if not exists source_lang text check (source_lang in ('ar','en','mixed','empty'));
alter table visit_items add column if not exists translation_pending boolean not null default false;
alter table visit_items add column if not exists notes_ar_locked boolean not null default false;
alter table visit_items add column if not exists notes_en_locked boolean not null default false;
alter table visit_items add column if not exists parts_ar_locked boolean not null default false;
alter table visit_items add column if not exists parts_en_locked boolean not null default false;

-- يعرف المكتب أن اسم الجهاز العربي تمت تعبئته تلقائياً ويحتاج مراجعة
alter table assets add column if not exists name_ar_auto boolean not null default false;

-- ---------------------------------------------------------------------
-- ٢. تحديث save_visit_item: يبقي notes/parts كما كتبهما الفني بالضبط
--    (المصدر الأصلي)، ويعلّم البند "بانتظار الترجمة" فقط إذا تغيّر
--    النص فعلياً، ويمسح الترجمة القديمة (وأقفالها) عند تغيّر النص
--    الذي تُرجمت عنه حتى لا تظهر ترجمة قديمة لنص صار مختلفاً.
-- ---------------------------------------------------------------------
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

  insert into visit_items(visit_id,asset_id,condition,technician_notes,parts_needed_text,translation_pending)
    values(p_visit_id,p_asset_id,p_condition,new_notes,new_parts,(new_notes is not null or new_parts is not null))
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
    returning id into result_id;
  delete from photos where visit_item_id = result_id;
  insert into photos(visit_item_id,url,type)
    select result_id,p->>'url',p->>'type' from jsonb_array_elements(p_photos) p;
  return result_id;
end $$;
revoke all on function save_visit_item(uuid,uuid,text,text,text,jsonb) from public;
grant execute on function save_visit_item(uuid,uuid,text,text,text,jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- ٣. حفظ نتيجة الترجمة التلقائية لبند واحد — يحترم الأقفال (لا يكتب
--    فوق حقل عدّله المكتب يدوياً)، يستخدمها الفني (ترجمة فورية بعد
--    الحفظ) وشاشة المراجعة (الترجمة الجماعية).
-- ---------------------------------------------------------------------
create or replace function save_item_translation(
  p_item_id uuid, p_source_lang text,
  p_notes_ar text, p_notes_en text, p_parts_ar text, p_parts_en text
) returns void
language plpgsql security definer set search_path = public as $$
declare it visit_items%rowtype; v visits%rowtype;
begin
  select * into it from visit_items where id = p_item_id for update;
  if it.id is null then raise exception 'Item not found'; end if;
  select * into v from visits where id = it.visit_id;
  if not (is_staff() and can_see_client(v.client_id)) then raise exception 'Access denied'; end if;
  update visit_items set
    source_lang = coalesce(p_source_lang, source_lang),
    notes_ar = case when notes_ar_locked then notes_ar else coalesce(p_notes_ar, notes_ar) end,
    notes_en = case when notes_en_locked then notes_en else coalesce(p_notes_en, notes_en) end,
    parts_ar = case when parts_ar_locked then parts_ar else coalesce(p_parts_ar, parts_ar) end,
    parts_en = case when parts_en_locked then parts_en else coalesce(p_parts_en, parts_en) end,
    translation_pending = false
  where id = p_item_id;
end $$;
revoke all on function save_item_translation(uuid,text,text,text,text,text) from public;
grant execute on function save_item_translation(uuid,text,text,text,text,text) to authenticated;

-- نفس الشيء دفعة واحدة — لزر "ترجمة/إعادة ترجمة الكل" في شاشة المراجعة
create or replace function save_item_translations_bulk(p_items jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare row record;
begin
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Invalid payload'; end if;
  for row in select * from jsonb_to_recordset(p_items) as x(
    id uuid, source_lang text, notes_ar text, notes_en text, parts_ar text, parts_en text)
  loop
    perform save_item_translation(row.id, row.source_lang, row.notes_ar, row.notes_en, row.parts_ar, row.parts_en);
  end loop;
end $$;
revoke all on function save_item_translations_bulk(jsonb) from public;
grant execute on function save_item_translations_bulk(jsonb) to authenticated;

-- تعديل يدوي لحقل ترجمة واحد من المشرف — يقفله فوراً حتى لا تكتب
-- الترجمة التلقائية فوقه لاحقاً
create or replace function set_item_translation_field(p_item_id uuid, p_field text, p_value text) returns void
language plpgsql security definer set search_path = public as $$
declare it visit_items%rowtype; v visits%rowtype;
begin
  if p_field not in ('notes_ar','notes_en','parts_ar','parts_en') then raise exception 'Invalid field'; end if;
  select * into it from visit_items where id = p_item_id for update;
  if it.id is null then raise exception 'Item not found'; end if;
  select * into v from visits where id = it.visit_id;
  if not (my_role() = 'supervisor' and can_see_client(v.client_id)) then raise exception 'Supervisor access required'; end if;
  execute format('update visit_items set %I = $1, %I = true where id = $2', p_field, p_field || '_locked')
    using nullif(trim(p_value),''), p_item_id;
end $$;
revoke all on function set_item_translation_field(uuid,text,text) from public;
grant execute on function set_item_translation_field(uuid,text,text) to authenticated;

-- حفظ التعليق المعتمد (عربي/إنجليزي) بدون اعتماد الزيارة — زر مستقل
create or replace function save_visit_recommendations(p_visit_id uuid, p_recommendations text, p_recommendations_en text) returns void
language plpgsql security invoker set search_path = public as $$
declare v visits%rowtype;
begin
  select * into v from visits where id = p_visit_id for update;
  if v.id is null or my_role() <> 'supervisor' or v.status <> 'submitted' or not can_see_client(v.client_id) then
    raise exception 'Submitted visit and supervisor access required';
  end if;
  update visits set
    recommendations = nullif(trim(p_recommendations),''),
    recommendations_en = nullif(trim(p_recommendations_en),'')
    where id = p_visit_id;
end $$;
revoke all on function save_visit_recommendations(uuid,text,text) from public;
grant execute on function save_visit_recommendations(uuid,text,text) to authenticated;

commit;
