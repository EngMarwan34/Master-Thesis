-- =====================================================================
-- ترقية ١٤: تعليق معتمد بلغتين (عربي/إنجليزي) يظهر في التقرير النهائي
-- منفصل تماماً عن ملاحظات الفني لكل جهاز. شغّلها بعد migration_013.
-- =====================================================================
begin;

alter table visits add column if not exists recommendations_en text;

drop function if exists approve_visit(uuid, text, jsonb);

create or replace function approve_visit(p_visit_id uuid, p_recommendations text, p_recommendations_en text, p_items jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare v visits%rowtype; patch jsonb;
begin
  select * into v from visits where id = p_visit_id for update;
  if my_role() is distinct from 'supervisor' or v.id is null or v.status <> 'submitted'
    or not can_see_client(v.client_id) then raise exception 'Submitted visit and supervisor access required'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Invalid corrections'; end if;
  for patch in select value from jsonb_array_elements(p_items) loop
    update visit_items set technician_notes = nullif(trim(patch->>'notes'),''),
      parts_needed_text = nullif(trim(patch->>'parts'),'')
      where id = (patch->>'id')::uuid and visit_id = p_visit_id;
    if not found then raise exception 'Invalid visit item'; end if;
  end loop;
  update visits set status = 'approved', approved_by = auth.uid(),
    recommendations = nullif(trim(p_recommendations),''),
    recommendations_en = nullif(trim(p_recommendations_en),'')
    where id = p_visit_id;
end $$;
revoke all on function approve_visit(uuid,text,text,jsonb) from public;
grant execute on function approve_visit(uuid,text,text,jsonb) to authenticated;

commit;
