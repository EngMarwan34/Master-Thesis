-- Apply after 005. Existing plans, visits and public media are preserved.
begin;
create table if not exists scheduled_visit_technicians (
  scheduled_visit_id uuid not null references scheduled_visits(id) on delete cascade,
  technician_id uuid not null references profiles(id),
  primary key(scheduled_visit_id, technician_id)
);
create table if not exists visit_technicians (
  visit_id uuid not null references visits(id) on delete cascade,
  technician_id uuid not null references profiles(id),
  primary key(visit_id, technician_id)
);
alter table scheduled_visits add column if not exists completed_externally_on date;
alter table scheduled_visits add column if not exists external_notes text;
alter table scheduled_visits add column if not exists external_recorded_by uuid references profiles(id);
alter table scheduled_visits add column if not exists external_recorded_at timestamptz;
insert into scheduled_visit_technicians select id,technician_id from scheduled_visits where technician_id is not null on conflict do nothing;
insert into visit_technicians select id,technician_id from visits where technician_id is not null and visit_type='preventive' on conflict do nothing;
alter table scheduled_visit_technicians enable row level security;
alter table visit_technicians enable row level security;

create or replace function is_visit_technician(vid uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select my_role()='technician' and exists(select 1 from visits v where v.id=vid and can_see_client(v.client_id)
    and (v.technician_id=auth.uid() or (v.visit_type='preventive' and exists (
      select 1 from visit_technicians t where t.visit_id=v.id and t.technician_id=auth.uid()))));
$$;
create or replace function is_scheduled_technician(sid uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select my_role()='technician' and exists(select 1 from scheduled_visits s join contracts c on c.id=s.contract_id
    where s.id=sid and can_see_client(c.client_id) and (
      exists(select 1 from scheduled_visit_technicians t where t.scheduled_visit_id=s.id and t.technician_id=auth.uid())
      or (not exists(select 1 from scheduled_visit_technicians t where t.scheduled_visit_id=s.id)
        and (s.technician_id is null or s.technician_id=auth.uid()))));
$$;
create or replace function can_edit_visit(vid uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from visits v where v.id=vid and can_see_client(v.client_id) and (
    (my_role()='supervisor' and v.status<>'approved') or
    (is_visit_technician(v.id) and v.status in ('draft','rejected'))));
$$;
drop policy if exists p_visits_update on visits;
create policy p_visits_update on visits for update to authenticated using (
  can_see_client(client_id) and (my_role()='supervisor' or (is_visit_technician(id) and status in ('draft','rejected')))
) with check (can_see_client(client_id) and (my_role()='supervisor' or (is_visit_technician(id) and status in ('draft','submitted'))));

-- Team tables are readable within the branch; changes go through validated functions.
drop policy if exists p_schedule_team_read on scheduled_visit_technicians;
create policy p_schedule_team_read on scheduled_visit_technicians for select to authenticated using (
  is_staff() and exists(select 1 from scheduled_visits s where s.id=scheduled_visit_id));
drop policy if exists p_visit_team_read on visit_technicians;
create policy p_visit_team_read on visit_technicians for select to authenticated using (
  exists(select 1 from visits v where v.id=visit_id));
drop policy if exists p_profiles_self on profiles;
create policy p_profiles_self on profiles for select using (id=auth.uid() or
  (my_role()='supervisor' and branch=my_branch()) or
  (my_role()='technician' and role='technician' and branch=my_branch() and active));

create or replace function validate_preventive_team(cid uuid, members uuid[]) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not is_staff() or not can_see_client(cid) then raise exception 'Client access required'; end if;
  if cardinality(members) not between 1 and 20 or members is null or exists (
    select 1 from unnest(members) m where m is null or not exists (
      select 1 from profiles p join clients c on c.id=cid where p.id=m and p.role='technician' and p.active and p.branch=c.branch))
    then raise exception 'Select active technicians from this branch'; end if;
end $$;
create or replace function guard_visit_workflow() returns trigger
language plpgsql security definer set search_path = public as $$
declare actor text := my_role();
begin
  -- SQL Editor imports and service-role maintenance have no end-user identity.
  if auth.uid() is null then return new; end if;
  if not is_staff() or not can_see_client(new.client_id) then raise exception 'Visit access denied'; end if;
  if actor = 'technician' then
    if tg_op = 'INSERT' and new.technician_id is distinct from auth.uid() then raise exception 'Visit ownership required'; end if;
    if tg_op = 'UPDATE' and not is_visit_technician(old.id) then raise exception 'Visit team membership required'; end if;
    if tg_op = 'INSERT' then
      if new.status <> 'draft' or new.approved_by is not null or new.approved_at is not null
        or new.report_no is not null or new.crm_ticket_no is not null or new.quote_url is not null then
        raise exception 'Technician must create a draft visit';
      end if;
    else
      if old.status not in ('draft','rejected') or new.status not in ('draft','submitted') then
        raise exception 'Only supervisors can approve or reject visits';
      end if;
      if (to_jsonb(new) - array['status','check_out','recommendations','reject_reason'])
        is distinct from (to_jsonb(old) - array['status','check_out','recommendations','reject_reason']) then
        raise exception 'Technician cannot change assignment, CRM or approval fields';
      end if;
    end if;
  end if;
  if new.technician_id is not null and (tg_op='INSERT' or old.technician_id is distinct from new.technician_id or old.client_id is distinct from new.client_id) and not exists (
    select 1 from profiles p join clients c on c.id = new.client_id
    where p.id = new.technician_id and p.role in ('technician','supervisor') and p.active and p.branch = c.branch
  ) then raise exception 'Invalid assigned staff member'; end if;
  if new.contract_id is not null and not exists (
    select 1 from contracts c where c.id = new.contract_id and c.client_id = new.client_id
  ) then raise exception 'Contract belongs to another client'; end if;
  if new.target_asset_id is not null and not exists (
    select 1 from assets a where a.id = new.target_asset_id and a.client_id = new.client_id
  ) then raise exception 'Asset belongs to another client'; end if;
  if new.scheduled_visit_id is not null and not exists (
    select 1 from scheduled_visits s join contracts c on c.id = s.contract_id
    where s.id = new.scheduled_visit_id and c.client_id = new.client_id
      and new.contract_id = c.id and new.visit_type = 'preventive'
      and s.completed_externally_on is null and (actor = 'supervisor' or is_scheduled_technician(s.id))
  ) then raise exception 'Invalid scheduled visit assignment'; end if;
  if new.status = 'approved' then
    if tg_op = 'INSERT' or old.status not in ('submitted','approved') then
      raise exception 'Submit visit before approval';
    end if;
    new.approved_by := auth.uid();
  end if;
  return new;
end $$;
drop trigger if exists a_guard_visit_workflow on visits;
create trigger a_guard_visit_workflow before insert or update on visits
  for each row execute function guard_visit_workflow();

-- Populate the same team for everyone who opens a scheduled preventive visit.
create or replace function attach_preventive_team() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.visit_type='preventive' then
    if new.scheduled_visit_id is not null then
      insert into visit_technicians select new.id,t.technician_id from scheduled_visit_technicians t
        where t.scheduled_visit_id=new.scheduled_visit_id on conflict do nothing;
    end if;
    if new.technician_id is not null then
      insert into visit_technicians values(new.id,new.technician_id) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists attach_preventive_team on visits;
create trigger attach_preventive_team after insert on visits for each row execute function attach_preventive_team();

create or replace function visit_team(p_visit_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare v visits%rowtype; result jsonb;
begin
  select * into v from visits where id=p_visit_id;
  if v.id is null or not ((is_staff() and can_see_client(v.client_id)) or
    (my_role()='client' and v.client_id=my_client() and v.status='approved')) then raise exception 'Visit access denied'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('technician_id',p.id,'full_name',p.full_name) order by p.full_name),'[]'::jsonb)
    into result from profiles p where p.id=v.technician_id or exists (
      select 1 from visit_technicians t where t.visit_id=v.id and t.technician_id=p.id);
  return result;
end $$;
create or replace function my_open_visits() returns jsonb
language sql stable security invoker set search_path=public as $$
  select coalesce(jsonb_agg(to_jsonb(v)||jsonb_build_object('clients',jsonb_build_object('name_ar',c.name_ar),
    'target_asset',jsonb_build_object('name_ar',a.name_ar,'asset_no',a.asset_no)) order by v.created_at desc),'[]'::jsonb)
  from visits v join clients c on c.id=v.client_id left join assets a on a.id=v.target_asset_id
  where is_visit_technician(v.id) and v.status in ('draft','rejected');
$$;

create or replace function start_preventive_visit(p_client_id uuid, p_schedule_id uuid default null,
  p_technician_ids uuid[] default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare s scheduled_visits%rowtype; cid uuid; vid uuid; members uuid[];
begin
  if not is_staff() or not can_see_client(p_client_id) then raise exception 'Client access denied'; end if;
  if p_schedule_id is not null then
    select * into s from scheduled_visits where id=p_schedule_id for update;
    select client_id into cid from contracts where id=s.contract_id;
    if s.id is null or cid is distinct from p_client_id or s.completed_externally_on is not null or
      not (my_role()='supervisor' or is_scheduled_technician(s.id)) then raise exception 'Schedule access denied'; end if;
    select array_agg(technician_id order by technician_id) into members from scheduled_visit_technicians where scheduled_visit_id=s.id;
    if members is null then members:=case when s.technician_id is not null then array[s.technician_id] else p_technician_ids end; end if;
    select id into vid from visits where scheduled_visit_id=s.id;
    if vid is not null then return vid; end if;
  else members:=p_technician_ids; end if;
  if members is null and my_role()='technician' then members:=array[auth.uid()]; end if;
  perform validate_preventive_team(p_client_id,members);
  if my_role()='technician' and not (auth.uid()=any(members)) then raise exception 'Technician must be part of the team'; end if;
  insert into visits(client_id,technician_id,contract_id,scheduled_visit_id)
    values(p_client_id,case when my_role()='technician' then auth.uid() else members[1] end,s.contract_id,p_schedule_id)
    returning id into vid;
  insert into visit_technicians select vid,m from unnest(members) m on conflict do nothing;
  return vid;
end $$;

-- Record work done outside the system without generating a fictional approved report.
create or replace function record_previous_preventive_visit(p_schedule_id uuid,p_completed_on date,p_notes text) returns void
language plpgsql security definer set search_path=public as $$
declare s scheduled_visits%rowtype; c contracts%rowtype;
begin
  select * into s from scheduled_visits where id=p_schedule_id for update;
  select * into c from contracts where id=s.contract_id;
  if my_role() is distinct from 'supervisor' or s.id is null or not can_see_client(c.client_id) then raise exception 'Supervisor access required'; end if;
  if p_completed_on is null or p_completed_on>(now() at time zone 'Asia/Riyadh')::date or
     p_completed_on not between c.start_date and c.end_date then raise exception 'Invalid historical visit date'; end if;
  if s.completed_externally_on is not null or exists(select 1 from visits where scheduled_visit_id=s.id) then raise exception 'Schedule already has a visit'; end if;
  update scheduled_visits set completed_externally_on=p_completed_on,external_notes=nullif(trim(p_notes),''),
    external_recorded_by=auth.uid(),external_recorded_at=now() where id=s.id;
end $$;
create or replace function create_preventive_plan(p_client_id uuid,p_start_date date,p_end_date date,
  p_frequency text,p_technician_ids uuid[],p_dates jsonb,p_previous jsonb default '[]') returns uuid
language plpgsql security definer set search_path=public as $$
declare cid uuid; previous jsonb; sid uuid;
begin
  if my_role() is distinct from 'supervisor' or not can_see_client(p_client_id) then raise exception 'Supervisor access required'; end if;
  perform validate_preventive_team(p_client_id,p_technician_ids);
  if p_start_date is null or p_end_date is null or p_start_date>p_end_date or
     jsonb_typeof(p_dates) is distinct from 'array' or jsonb_array_length(p_dates) not between 1 and 120 or
     jsonb_typeof(p_previous) is distinct from 'array' then raise exception 'Invalid preventive plan'; end if;
  if exists(select 1 from jsonb_array_elements_text(p_dates) d where d::date not between p_start_date and p_end_date) then raise exception 'Schedule outside plan period'; end if;
  insert into contracts(client_id,start_date,end_date,frequency,visits_planned)
    values(p_client_id,p_start_date,p_end_date,p_frequency,jsonb_array_length(p_dates)) returning id into cid;
  insert into scheduled_visits(contract_id,due_date,technician_id)
    select cid,d::date,p_technician_ids[1] from jsonb_array_elements_text(p_dates) d;
  insert into scheduled_visit_technicians select s.id,m from scheduled_visits s cross join unnest(p_technician_ids) m
    where s.contract_id=cid on conflict do nothing;
  for previous in select value from jsonb_array_elements(p_previous) loop
    select id into sid from scheduled_visits where contract_id=cid and due_date=(previous->>'due_date')::date;
    if sid is null then raise exception 'Historical visit must correspond to a planned date'; end if;
    perform record_previous_preventive_visit(sid,(previous->>'completed_on')::date,previous->>'notes');
  end loop;
  return cid;
end $$;

create or replace function schedule_existing_plan(p_contract_id uuid,p_technician_ids uuid[],p_dates jsonb,p_previous jsonb default '[]') returns void
language plpgsql security definer set search_path=public as $$
declare c contracts%rowtype; previous jsonb; sid uuid;
begin
  select * into c from contracts where id=p_contract_id for update;
  if my_role() is distinct from 'supervisor' or c.id is null or not can_see_client(c.client_id) then raise exception 'Supervisor access required'; end if;
  perform validate_preventive_team(c.client_id,p_technician_ids);
  if c.start_date is null or c.end_date is null or jsonb_typeof(p_dates) is distinct from 'array'
    or jsonb_array_length(p_dates) not between 1 and 120 or jsonb_typeof(p_previous) is distinct from 'array'
    or exists(select 1 from jsonb_array_elements_text(p_dates) d where d::date not between c.start_date and c.end_date)
    then raise exception 'Invalid plan dates'; end if;
  insert into scheduled_visits(contract_id,due_date,technician_id)
    select c.id,d::date,p_technician_ids[1] from jsonb_array_elements_text(p_dates) d;
  insert into scheduled_visit_technicians select s.id,m from scheduled_visits s cross join unnest(p_technician_ids) m
    where s.contract_id=c.id and s.due_date in(select d::date from jsonb_array_elements_text(p_dates) d) on conflict do nothing;
  for previous in select value from jsonb_array_elements(p_previous) loop
    select id into sid from scheduled_visits where contract_id=c.id and due_date=(previous->>'due_date')::date;
    if sid is null then raise exception 'Historical visit must correspond to a planned date'; end if;
    perform record_previous_preventive_visit(sid,(previous->>'completed_on')::date,previous->>'notes');
  end loop;
  update contracts set visits_planned=(select count(*) from scheduled_visits where contract_id=c.id) where id=c.id;
end $$;
revoke all on function schedule_existing_plan(uuid,uuid[],jsonb,jsonb) from public;
grant execute on function schedule_existing_plan(uuid,uuid[],jsonb,jsonb) to authenticated;

revoke all on function validate_preventive_team(uuid,uuid[]) from public;
revoke all on function start_preventive_visit(uuid,uuid,uuid[]) from public;
revoke all on function record_previous_preventive_visit(uuid,date,text) from public;
revoke all on function create_preventive_plan(uuid,date,date,text,uuid[],jsonb,jsonb) from public;
revoke all on function visit_team(uuid) from public;
revoke all on function my_open_visits() from public;
grant execute on function start_preventive_visit(uuid,uuid,uuid[]) to authenticated;
grant execute on function record_previous_preventive_visit(uuid,date,text) to authenticated;
grant execute on function create_preventive_plan(uuid,date,date,text,uuid[],jsonb,jsonb) to authenticated;
grant execute on function visit_team(uuid) to authenticated;
grant execute on function my_open_visits() to authenticated;
commit;
