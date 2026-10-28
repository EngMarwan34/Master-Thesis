-- =====================================================================
-- ترقية ١٨: إصلاح خطأ "row-level security policy" عند الضغط على زر
-- "تدوير" أو "إخفاء من التقرير" في شاشة المراجعة.
--
-- السبب: الدالتان add_rotated_photo و set_photo_hidden كانتا بصلاحية
-- المستخدم نفسه (security invoker)، فيعتمد إدخال/تعديل صف في جدول
-- photos على سياسة RLS الخاصة بالجدول — وهذه السياسة لم تكن تتحقق
-- بشكل موثوق من داخل الدالتين. الإصلاح: صلاحية مرتفعة مضبوطة
-- (security definer) معها فحص صريح داخل الدالة نفسها: المستخدم لازم
-- يكون مشرف فرع، والجهاز يتبع عميلاً يراه هذا المشرف (نفس الفرع) —
-- تماماً نفس الحماية التي كانت تفرضها RLS، لكن بشكل مباشر وموثوق.
--
-- آمنة للرجوع: لا تغيير على البيانات، لا حذف لأي صور. شغّلها بعد
-- migration_017.
-- =====================================================================
begin;

create or replace function add_rotated_photo(p_old_photo_id uuid, p_new_url text) returns uuid
language plpgsql security definer set search_path=public as $$
declare old photos%rowtype; vi visit_items%rowtype; v visits%rowtype; new_id uuid;
begin
  if my_role() <> 'supervisor' then raise exception 'Supervisor access required'; end if;
  select * into old from photos where id=p_old_photo_id;
  if old.id is null then raise exception 'Photo not found'; end if;
  select * into vi from visit_items where id=old.visit_item_id;
  select * into v from visits where id=vi.visit_id;
  if v.id is null or not can_see_client(v.client_id) then raise exception 'Access denied'; end if;
  if nullif(trim(p_new_url),'') is null then raise exception 'Missing url'; end if;
  insert into photos(visit_item_id,url,type,phash,hidden) values(old.visit_item_id,p_new_url,old.type,null,false) returning id into new_id;
  update photos set hidden=true where id=p_old_photo_id;
  return new_id;
end $$;
revoke all on function add_rotated_photo(uuid,text) from public;
grant execute on function add_rotated_photo(uuid,text) to authenticated;

create or replace function set_photo_hidden(p_photo_id uuid, p_hidden boolean) returns void
language plpgsql security definer set search_path=public as $$
declare ph photos%rowtype; vi visit_items%rowtype; v visits%rowtype;
begin
  if my_role() <> 'supervisor' then raise exception 'Supervisor access required'; end if;
  select * into ph from photos where id=p_photo_id;
  if ph.id is null then raise exception 'Photo not found'; end if;
  select * into vi from visit_items where id=ph.visit_item_id;
  select * into v from visits where id=vi.visit_id;
  if v.id is null or not can_see_client(v.client_id) then raise exception 'Access denied'; end if;
  update photos set hidden=p_hidden where id=p_photo_id;
end $$;
revoke all on function set_photo_hidden(uuid,boolean) from public;
grant execute on function set_photo_hidden(uuid,boolean) to authenticated;

commit;
