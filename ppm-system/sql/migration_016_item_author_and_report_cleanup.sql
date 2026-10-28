-- =====================================================================
-- ترقية ١٦: تسجيل مين فحص كل جهاز بالضبط (يفيد بالزيارات الجماعية).
-- آمنة للرجوع: عمود جديد يقبل NULL، لا تُعدَّل أي بيانات قديمة.
-- شغّلها بعد migration_015.
-- =====================================================================
begin;

alter table visit_items add column if not exists performed_by uuid references profiles(id);

-- يسجَّل تلقائياً أول مرة يُنشأ فيها البند (من حسّب الفني اللي فتح
-- الجلسة وحفظ الفحص فعلياً) ولا يتغيّر بعد ذلك حتى لو عدّله غيره لاحقاً.
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
      -- ملاحظة: performed_by عمداً غير موجود بالتحديث هنا، يبقى على أول من أنشأ البند
    returning id into result_id;
  delete from photos where visit_item_id = result_id;
  insert into photos(visit_item_id,url,type)
    select result_id,p->>'url',p->>'type' from jsonb_array_elements(p_photos) p;
  return result_id;
end $$;
revoke all on function save_visit_item(uuid,uuid,text,text,text,jsonb) from public;
grant execute on function save_visit_item(uuid,uuid,text,text,text,jsonb) to authenticated;

commit;
