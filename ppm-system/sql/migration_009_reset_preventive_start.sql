-- Apply after 008. Only an empty, unsubmitted preventive visit can be reset.
begin;

create table if not exists visit_start_resets (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null,
  client_id uuid not null references clients(id) on delete cascade,
  scheduled_visit_id uuid references scheduled_visits(id) on delete set null,
  reset_by uuid not null references profiles(id),
  started_at timestamptz,
  reset_at timestamptz not null default now(),
  team_ids uuid[] not null
);
alter table visit_start_resets enable row level security;
drop policy if exists start_resets_read on visit_start_resets;
create policy start_resets_read on visit_start_resets for select to authenticated using (
  is_staff() and can_see_client(client_id) and (my_role()='supervisor' or reset_by=auth.uid())
);

create or replace function reset_preventive_visit(p_visit_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare v visits%rowtype; sid uuid; members uuid[];
begin
  select * into v from visits where id=p_visit_id;
  if v.id is null or not coalesce(is_staff() and can_see_client(v.client_id)
    and (my_role()='supervisor' or is_visit_technician(v.id)),false)
    then raise exception 'Visit access denied'; end if;
  sid:=v.scheduled_visit_id;
  -- Match start_preventive_visit's lock order. Inspections lock the visit row too.
  if sid is not null then perform 1 from scheduled_visits where id=sid for update; end if;
  select * into v from visits where id=p_visit_id for update;
  if v.id is null or v.scheduled_visit_id is distinct from sid
    or not coalesce(is_staff() and can_see_client(v.client_id)
      and (my_role()='supervisor' or is_visit_technician(v.id)),false)
    then raise exception 'Visit access denied'; end if;
  if v.visit_type<>'preventive' or v.status<>'draft'
    then raise exception 'Only an unsubmitted preventive visit can be reset'; end if;
  if exists(select 1 from visit_items where visit_id=v.id)
    or exists(select 1 from visit_comments where visit_id=v.id)
    or v.check_out is not null or v.approved_by is not null or v.approved_at is not null
    or nullif(trim(v.general_notes),'') is not null or nullif(trim(v.recommendations),'') is not null
    or nullif(trim(v.reject_reason),'') is not null or nullif(trim(v.report_no),'') is not null
    or nullif(trim(v.crm_ticket_no),'') is not null or nullif(trim(v.quote_url),'') is not null
    then raise exception 'Visit is not empty'; end if;
  select coalesce(array_agg(distinct technician_id),'{}'::uuid[]) into members
    from (select technician_id from visit_technicians where visit_id=v.id
      union select v.technician_id where v.technician_id is not null) team;
  insert into visit_start_resets(visit_id,client_id,scheduled_visit_id,reset_by,started_at,team_ids)
    values(v.id,v.client_id,sid,auth.uid(),v.check_in,members);
  -- Removing this empty draft releases the schedule; its date, duration and team stay intact.
  delete from visits where id=v.id;
  return sid;
end $$;

revoke all on visit_start_resets from public;
grant select on visit_start_resets to authenticated;
revoke all on function reset_preventive_visit(uuid) from public;
grant execute on function reset_preventive_visit(uuid) to authenticated;
create index if not exists start_resets_client_date_idx on visit_start_resets(client_id,reset_at);
commit;
