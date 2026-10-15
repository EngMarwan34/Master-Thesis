-- =====================================================================
-- ترقية ٨: إضافة فني إلى فريق زيارة وقائية جارية (مساعدة أثناء العمل)
-- شغّلها بعد migration_007 في SQL Editor
-- =====================================================================

create or replace function add_visit_technician(p_visit_id uuid, p_technician_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare v visits%rowtype;
begin
  select * into v from visits where id=p_visit_id for update;
  if v.id is null or not can_see_client(v.client_id) then raise exception 'Visit access denied'; end if;
  if not (my_role()='supervisor' or is_visit_technician(v.id)) then raise exception 'Visit team membership required'; end if;
  if v.status not in ('draft','rejected') then raise exception 'Visit is no longer editable'; end if;
  if v.visit_type <> 'preventive' then raise exception 'Additional technicians are only supported for preventive visits'; end if;
  if not exists (
    select 1 from profiles p join clients c on c.id = v.client_id
    where p.id = p_technician_id and p.role='technician' and p.active and p.branch = c.branch
  ) then raise exception 'Select an active technician from this branch'; end if;
  insert into visit_technicians(visit_id, technician_id) values (p_visit_id, p_technician_id) on conflict do nothing;
end $$;

revoke all on function add_visit_technician(uuid,uuid) from public;
grant execute on function add_visit_technician(uuid,uuid) to authenticated;
