-- =====================================================================
-- ترقية ٢٣: إصلاح — الاعتماد مرة أخرى (ترقية ٢٢) كان يفشل برسالة
-- "Invalid visit item" لأن صلاحية الكتابة الفعلية على visit_items/photos
-- (p_items_write، p_photos_write) تمر عبر can_edit_visit()، وهذه الدالة
-- كانت تستثني صراحة أي زيارة "approved" حتى للمشرف — فمنعت تعديل بنود
-- زيارة معتمدة رغم سماح approve_visit نفسها بذلك. كذلك حفظ "التعليق
-- المعتمد" وحده (save_visit_recommendations) كان مقيّداً بالحالة
-- submitted فقط. آمنة للرجوع: توسيع شرط فقط، لا حذف ولا تعديل بيانات.
-- شغّلها بعد migration_022.
-- =====================================================================
begin;

create or replace function can_edit_visit(vid uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from visits v where v.id=vid and can_see_client(v.client_id) and (
    my_role()='supervisor' or
    (is_visit_technician(v.id) and v.status in ('draft','rejected'))));
$$;

create or replace function save_visit_recommendations(p_visit_id uuid, p_recommendations text, p_recommendations_en text) returns void
language plpgsql security invoker set search_path = public as $$
declare v visits%rowtype;
begin
  select * into v from visits where id = p_visit_id for update;
  if v.id is null or my_role() <> 'supervisor' or v.status not in ('submitted','approved') or not can_see_client(v.client_id) then
    raise exception 'Submitted/approved visit and supervisor access required';
  end if;
  update visits set
    recommendations = nullif(trim(p_recommendations),''),
    recommendations_en = nullif(trim(p_recommendations_en),'')
    where id = p_visit_id;
end $$;
revoke all on function save_visit_recommendations(uuid,text,text) from public;
grant execute on function save_visit_recommendations(uuid,text,text) to authenticated;

commit;
