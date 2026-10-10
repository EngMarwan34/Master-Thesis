-- Apply after 006. Settings are scoped to the supervisor's branch.
begin;
create table if not exists branch_settings (
  branch text primary key,
  display_name text not null default 'المحتسب' check(length(trim(display_name)) between 1 and 80),
  support_phone text not null default '' check(length(support_phone)<=40),
  brand_color text not null default 'blue' check(brand_color in ('blue','teal','purple')),
  reminder_days integer not null default 7 check(reminder_days between 0 and 30),
  default_frequency integer not null default 1 check(default_frequency in (1,3,6,12)),
  updated_at timestamptz not null default now()
);
alter table branch_settings enable row level security;
drop policy if exists p_branch_settings_read on branch_settings;
create policy p_branch_settings_read on branch_settings for select to authenticated using (is_staff() and branch=my_branch());
drop policy if exists p_branch_settings_write on branch_settings;
create policy p_branch_settings_write on branch_settings for all to authenticated using (
  my_role()='supervisor' and branch=my_branch()) with check (my_role()='supervisor' and branch=my_branch());

create or replace function update_staff_profile(p_id uuid,p_full_name text,p_phone text,p_active boolean) returns void
language plpgsql security definer set search_path=public as $$
begin
  if my_role() is distinct from 'supervisor' or not exists(
    select 1 from profiles p where p.id=p_id and p.branch=my_branch() and p.role='technician') then
    raise exception 'Technician in your branch required'; end if;
  if nullif(trim(p_full_name),'') is null or length(p_full_name)>100 or length(coalesce(p_phone,''))>40 or p_active is null then
    raise exception 'Invalid technician details'; end if;
  update profiles set full_name=trim(p_full_name),phone=nullif(trim(p_phone),''),active=p_active where id=p_id;
end $$;
create or replace function update_schedule_team(p_schedule_id uuid,p_technician_ids uuid[],p_due_date date) returns void
language plpgsql security definer set search_path=public as $$
declare s scheduled_visits%rowtype; c contracts%rowtype;
begin
  select * into s from scheduled_visits where id=p_schedule_id for update;
  select * into c from contracts where id=s.contract_id;
  if my_role() is distinct from 'supervisor' or s.id is null or not can_see_client(c.client_id) then raise exception 'Supervisor access required'; end if;
  if s.completed_externally_on is not null or exists(select 1 from visits where scheduled_visit_id=s.id) then raise exception 'Started or completed visits keep their original schedule'; end if;
  perform validate_preventive_team(c.client_id,p_technician_ids);
  if p_due_date is null or p_due_date not between c.start_date and c.end_date then raise exception 'Date outside plan period'; end if;
  update scheduled_visits set due_date=p_due_date,technician_id=p_technician_ids[1] where id=s.id;
  delete from scheduled_visit_technicians where scheduled_visit_id=s.id;
  insert into scheduled_visit_technicians select s.id,m from unnest(p_technician_ids) m on conflict do nothing;
end $$;
create or replace function update_visit_team(p_visit_id uuid,p_technician_ids uuid[]) returns void
language plpgsql security definer set search_path=public as $$
declare v visits%rowtype;
begin
  select * into v from visits where id=p_visit_id for update;
  if my_role() is distinct from 'supervisor' or v.id is null or not can_see_client(v.client_id) then raise exception 'Supervisor access required'; end if;
  if v.visit_type<>'preventive' or v.status not in ('draft','rejected') then raise exception 'Editable preventive visit required'; end if;
  perform validate_preventive_team(v.client_id,p_technician_ids);
  update visits set technician_id=p_technician_ids[1] where id=v.id;
  delete from visit_technicians where visit_id=v.id;
  insert into visit_technicians select v.id,m from unnest(p_technician_ids) m on conflict do nothing;
end $$;
create or replace function update_preventive_plan(p_id uuid,p_start_date date,p_end_date date,p_frequency text) returns void
language plpgsql security definer set search_path=public as $$
declare c contracts%rowtype;
begin
  select * into c from contracts where id=p_id for update;
  if my_role() is distinct from 'supervisor' or c.id is null or not can_see_client(c.client_id) then raise exception 'Supervisor access required'; end if;
  if p_start_date is null or p_end_date is null or p_start_date>p_end_date or p_frequency not in ('شهري','ربع سنوي','نصف سنوي','سنوي') then raise exception 'Invalid plan period'; end if;
  if exists(select 1 from scheduled_visits where contract_id=c.id and
    (due_date not between p_start_date and p_end_date or completed_externally_on not between p_start_date and p_end_date)) then
    raise exception 'Existing appointments must remain within the plan period'; end if;
  update contracts set start_date=p_start_date,end_date=p_end_date,frequency=p_frequency where id=c.id;
end $$;
revoke all on function update_staff_profile(uuid,text,text,boolean) from public;
revoke all on function update_schedule_team(uuid,uuid[],date) from public;
revoke all on function update_visit_team(uuid,uuid[]) from public;
revoke all on function update_preventive_plan(uuid,date,date,text) from public;
grant execute on function update_staff_profile(uuid,text,text,boolean) to authenticated;
grant execute on function update_schedule_team(uuid,uuid[],date) to authenticated;
grant execute on function update_visit_team(uuid,uuid[]) to authenticated;
grant execute on function update_preventive_plan(uuid,date,date,text) to authenticated;
commit;
