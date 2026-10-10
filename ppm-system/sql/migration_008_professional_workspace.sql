-- Apply after 007. No changes to photo storage or attachments.
begin;
create table if not exists user_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  language text not null default 'ar' check(language in ('ar','en')),
  theme text not null default 'system' check(theme in ('light','dark','system')),
  density text not null default 'comfortable' check(density in ('comfortable','compact')),
  notifications boolean not null default true,
  report_language text not null default 'bilingual' check(report_language in ('ar','en','bilingual')),
  updated_at timestamptz not null default now()
);
alter table user_preferences enable row level security;
drop policy if exists own_preferences on user_preferences;
create policy own_preferences on user_preferences for all to authenticated
  using(user_id=auth.uid() and my_role() is not null)
  with check(user_id=auth.uid() and my_role() is not null);

alter table scheduled_visits add column if not exists expected_duration_minutes integer not null default 120
  check(expected_duration_minutes between 15 and 1440);
-- A batch may move onto a date another selected row is vacating.
alter table scheduled_visits drop constraint if exists scheduled_visits_contract_id_due_date_key;
alter table scheduled_visits add constraint scheduled_visits_contract_id_due_date_key unique(contract_id,due_date) deferrable initially immediate;
create or replace function create_preventive_plan_with_duration(p_client_id uuid,p_start_date date,p_end_date date,
  p_frequency text,p_technician_ids uuid[],p_dates jsonb,p_previous jsonb,p_duration integer) returns uuid
language plpgsql security definer set search_path=public as $$
declare cid uuid;
begin
  if p_duration is null or p_duration not between 15 and 1440 then raise exception 'Invalid expected duration'; end if;
  cid:=create_preventive_plan(p_client_id,p_start_date,p_end_date,p_frequency,p_technician_ids,p_dates,p_previous);
  update scheduled_visits set expected_duration_minutes=p_duration where contract_id=cid;
  return cid;
end $$;
create or replace function schedule_existing_plan_with_duration(p_contract_id uuid,p_technician_ids uuid[],p_dates jsonb,p_previous jsonb,p_duration integer) returns void
language plpgsql security definer set search_path=public as $$
begin
  if p_duration is null or p_duration not between 15 and 1440 then raise exception 'Invalid expected duration'; end if;
  perform schedule_existing_plan(p_contract_id,p_technician_ids,p_dates,p_previous);
  update scheduled_visits set expected_duration_minutes=p_duration where contract_id=p_contract_id;
end $$;
create table if not exists schedule_changes (
  id uuid primary key default gen_random_uuid(),
  branch text not null,
  actor_id uuid not null references profiles(id),
  reason text not null check(length(trim(reason)) between 1 and 1000),
  before_rows jsonb not null,
  after_rows jsonb not null,
  created_at timestamptz not null default now(),
  undone_at timestamptz
);
alter table schedule_changes enable row level security;
drop policy if exists schedule_changes_read on schedule_changes;
create policy schedule_changes_read on schedule_changes for select to authenticated
  using(is_staff() and branch=my_branch());

-- All selected rows are locked before validating; a failure rolls back the entire batch.
create or replace function reschedule_preventive_visits(p_ids uuid[],p_dates date[],p_expected_dates date[],p_reason text,
  p_duration integer default null,p_team uuid[] default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare s scheduled_visits%rowtype; c contracts%rowtype; i integer; bid uuid;
  before_data jsonb:='[]'; after_data jsonb:='[]'; old_team uuid[]; new_team uuid[];
begin
  if my_role() is distinct from 'supervisor' then raise exception 'Supervisor access required'; end if;
  if p_ids is null or cardinality(p_ids) not between 1 and 200 or
    cardinality(p_dates) is distinct from cardinality(p_ids) or cardinality(p_expected_dates) is distinct from cardinality(p_ids)
    or (select count(distinct x) from unnest(p_ids) x)<>cardinality(p_ids)
    or nullif(trim(p_reason),'') is null or length(p_reason)>1000 then raise exception 'Invalid rescheduling request'; end if;
  if (p_duration is not null and (cardinality(p_ids)<>1 or p_duration not between 15 and 1440)) or
    (p_team is not null and cardinality(p_ids)<>1) then raise exception 'Invalid duration or team'; end if;
  perform 1 from scheduled_visits where id=any(p_ids) order by id for update;
  set constraints scheduled_visits_contract_id_due_date_key deferred;
  for i in 1..cardinality(p_ids) loop
    select * into s from scheduled_visits where id=p_ids[i];
    select * into c from contracts where id=s.contract_id;
    if s.id is null or not can_see_client(c.client_id) then raise exception 'Schedule access denied'; end if;
    if s.completed_externally_on is not null or exists(select 1 from visits where scheduled_visit_id=s.id) then
      raise exception 'Started or completed visits cannot be rescheduled'; end if;
    if p_expected_dates[i] is distinct from s.due_date then raise exception 'Schedule changed; reload and try again'; end if;
    if p_dates[i] is null or p_dates[i] not between c.start_date and c.end_date then raise exception 'Date outside plan period'; end if;
    select coalesce(array_agg(technician_id order by technician_id),'{}') into old_team
      from scheduled_visit_technicians where scheduled_visit_id=s.id;
    new_team:=old_team;
    if p_team is not null then
      perform validate_preventive_team(c.client_id,p_team);
      select array_agg(distinct x order by x) into new_team from unnest(p_team) x;
    end if;
    before_data:=before_data||jsonb_build_array(jsonb_build_object('id',s.id,'due_date',s.due_date,
      'duration',s.expected_duration_minutes,'team',old_team,'technician_id',s.technician_id));
    update scheduled_visits set due_date=p_dates[i],expected_duration_minutes=coalesce(p_duration,s.expected_duration_minutes),
      technician_id=case when p_team is null then s.technician_id else p_team[1] end where id=s.id;
    if p_team is not null then
      delete from scheduled_visit_technicians where scheduled_visit_id=s.id;
      insert into scheduled_visit_technicians select s.id,x from unnest(new_team) x;
    end if;
    after_data:=after_data||jsonb_build_array(jsonb_build_object('id',s.id,'due_date',p_dates[i],
      'duration',coalesce(p_duration,s.expected_duration_minutes),'team',new_team,
      'technician_id',case when p_team is null then s.technician_id else p_team[1] end));
  end loop;
  insert into schedule_changes(branch,actor_id,reason,before_rows,after_rows)
    values(my_branch(),auth.uid(),trim(p_reason),before_data,after_data) returning id into bid;
  set constraints scheduled_visits_contract_id_due_date_key immediate;
  return bid;
end $$;

create or replace function undo_schedule_change(p_change_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare batch schedule_changes%rowtype; old_row jsonb; new_row jsonb; s scheduled_visits%rowtype;
  current_team uuid[]; restore_team uuid[]; c contracts%rowtype;
begin
  select * into batch from schedule_changes where id=p_change_id for update;
  if my_role() is distinct from 'supervisor' or batch.id is null or batch.actor_id<>auth.uid() or batch.branch<>my_branch()
    then raise exception 'Undo access denied'; end if;
  if batch.undone_at is not null or batch.created_at<now()-interval '10 minutes' then raise exception 'Undo expired or already used'; end if;
  perform 1 from scheduled_visits where id in(select (x->>'id')::uuid from jsonb_array_elements(batch.before_rows) x) order by id for update;
  set constraints scheduled_visits_contract_id_due_date_key deferred;
  for old_row in select * from jsonb_array_elements(batch.before_rows) loop
    select * into s from scheduled_visits where id=(old_row->>'id')::uuid;
    select * into c from contracts where id=s.contract_id;
    select x into new_row from jsonb_array_elements(batch.after_rows) x where x->>'id'=old_row->>'id';
    select coalesce(array_agg(technician_id order by technician_id),'{}') into current_team
      from scheduled_visit_technicians where scheduled_visit_id=s.id;
    if s.id is null or not can_see_client(c.client_id) or s.completed_externally_on is not null or
      exists(select 1 from visits where scheduled_visit_id=s.id) or
      s.due_date is distinct from (new_row->>'due_date')::date or s.expected_duration_minutes<>(new_row->>'duration')::integer or
      to_jsonb(current_team) is distinct from new_row->'team' or
      s.technician_id is distinct from (new_row->>'technician_id')::uuid then raise exception 'Schedule changed; undo unavailable'; end if;
    if (old_row->>'due_date')::date not between c.start_date and c.end_date then raise exception 'Original date outside plan period'; end if;
    select coalesce(array_agg(value::uuid),'{}') into restore_team from jsonb_array_elements_text(old_row->'team');
    if cardinality(restore_team)>0 then perform validate_preventive_team(c.client_id,restore_team); end if;
    if old_row->>'technician_id' is not null and not exists(select 1 from profiles where id=(old_row->>'technician_id')::uuid
      and active and role='technician' and branch=my_branch()) then raise exception 'Original technician is inactive'; end if;
    update scheduled_visits set due_date=(old_row->>'due_date')::date,expected_duration_minutes=(old_row->>'duration')::integer,
      technician_id=(old_row->>'technician_id')::uuid where id=s.id;
    delete from scheduled_visit_technicians where scheduled_visit_id=s.id;
    insert into scheduled_visit_technicians select s.id,x from unnest(restore_team) x;
  end loop;
  update schedule_changes set undone_at=now() where id=batch.id;
  set constraints scheduled_visits_contract_id_due_date_key immediate;
end $$;

create table if not exists inspection_checklists (
  visit_item_id uuid primary key references visit_items(id) on delete cascade,
  answers jsonb not null check(jsonb_typeof(answers)='object'),
  recorded_by uuid not null references profiles(id),
  updated_at timestamptz not null default now()
);
alter table inspection_checklists enable row level security;
drop policy if exists checklist_read on inspection_checklists;
create policy checklist_read on inspection_checklists for select to authenticated using(
  exists(select 1 from visit_items i join visits v on v.id=i.visit_id where i.id=visit_item_id));
-- Writes go through save_inspection, which holds the visit lock and checks editable status.
create or replace function save_inspection(p_visit_id uuid,p_asset_id uuid,p_condition text,p_notes text,p_parts text,p_photos jsonb,p_answers jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare iid uuid; v visits%rowtype;
begin
  select * into v from visits where id=p_visit_id for update;
  if v.id is null or v.status not in ('draft','rejected') or not can_edit_visit(v.id) then raise exception 'Visit is not editable'; end if;
  if not exists(select 1 from assets where id=p_asset_id and client_id=v.client_id) or
    (v.visit_type='emergency' and p_asset_id is distinct from v.target_asset_id) then raise exception 'Asset belongs to another visit'; end if;
  if jsonb_typeof(p_answers) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_answers))<>3 or
    not (p_answers ?& array['operation','safety','service']) or exists(select 1 from jsonb_each_text(p_answers) where value is null or value not in ('yes','no','na')) then
    raise exception 'Answer the three inspection questions'; end if;
  iid:=save_visit_item(p_visit_id,p_asset_id,p_condition,p_notes,p_parts,p_photos);
  insert into inspection_checklists values(iid,p_answers,auth.uid(),now())
    on conflict(visit_item_id) do update set answers=excluded.answers,recorded_by=excluded.recorded_by,updated_at=now();
  return iid;
end $$;

create table if not exists visit_comments (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references visits(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null check(length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
alter table visit_comments enable row level security;
create or replace function can_discuss_visit(vid uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select is_staff() and exists(select 1 from visits v where v.id=vid and can_see_client(v.client_id)
    and (my_role()='supervisor' or is_visit_technician(v.id)));
$$;
drop policy if exists comments_read on visit_comments;
create policy comments_read on visit_comments for select to authenticated using(can_discuss_visit(visit_id));
drop policy if exists comments_insert on visit_comments;
create policy comments_insert on visit_comments for insert to authenticated with check(author_id=auth.uid() and can_discuss_visit(visit_id));
create or replace function visit_discussion(p_visit_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not can_discuss_visit(p_visit_id) then raise exception 'Internal discussion access denied'; end if;
  return coalesce((select jsonb_agg(x order by x.created_at) from (
    select c.id,c.body,c.created_at,p.full_name from visit_comments c join profiles p on p.id=c.author_id
      where c.visit_id=p_visit_id order by c.created_at desc limit 100) x),'[]');
end $$;

create or replace function update_client_account(p_id uuid,p_full_name text,p_phone text,p_client_id uuid,p_active boolean) returns void
language plpgsql security definer set search_path=public as $$
begin
  if my_role() is distinct from 'supervisor' or not exists(select 1 from profiles p join clients c on c.id=p.client_id
    where p.id=p_id and p.role='client' and p.branch=my_branch() and c.branch=my_branch()) or
    not exists(select 1 from clients where id=p_client_id and branch=my_branch()) then raise exception 'Client account access denied'; end if;
  if nullif(trim(p_full_name),'') is null or length(p_full_name)>100 or length(coalesce(p_phone,''))>40 or p_active is null then
    raise exception 'Invalid account details'; end if;
  update profiles set full_name=trim(p_full_name),phone=nullif(trim(p_phone),''),client_id=p_client_id,active=p_active where id=p_id;
end $$;
create or replace function set_asset_activity(p_id uuid,p_active boolean,p_expected boolean) returns void
language plpgsql security definer set search_path=public as $$
declare a assets%rowtype;
begin
  select * into a from assets where id=p_id for update;
  if my_role() is distinct from 'supervisor' or a.id is null or not can_see_client(a.client_id) then raise exception 'Asset access denied'; end if;
  if p_active is null or a.active is distinct from p_expected then raise exception 'Asset changed; reload first'; end if;
  update assets set active=p_active where id=a.id;
end $$;

create index if not exists clients_branch_name_idx on clients(branch,name_ar,id);
create index if not exists visits_client_date_idx on visits(client_id,visit_date desc);
create index if not exists visits_status_checkout_idx on visits(status,check_out);
create index if not exists inspections_asset_visit_idx on visit_items(asset_id,visit_id);
create index if not exists comments_visit_date_idx on visit_comments(visit_id,created_at);
revoke all on function create_preventive_plan_with_duration(uuid,date,date,text,uuid[],jsonb,jsonb,integer),
  schedule_existing_plan_with_duration(uuid,uuid[],jsonb,jsonb,integer),reschedule_preventive_visits(uuid[],date[],date[],text,integer,uuid[]),undo_schedule_change(uuid),
  save_inspection(uuid,uuid,text,text,text,jsonb,jsonb),can_discuss_visit(uuid),visit_discussion(uuid),
  update_client_account(uuid,text,text,uuid,boolean),set_asset_activity(uuid,boolean,boolean) from public;
grant execute on function create_preventive_plan_with_duration(uuid,date,date,text,uuid[],jsonb,jsonb,integer),
  schedule_existing_plan_with_duration(uuid,uuid[],jsonb,jsonb,integer),reschedule_preventive_visits(uuid[],date[],date[],text,integer,uuid[]),undo_schedule_change(uuid),
  save_inspection(uuid,uuid,text,text,text,jsonb,jsonb),can_discuss_visit(uuid),visit_discussion(uuid),
  update_client_account(uuid,text,text,uuid,boolean),set_asset_activity(uuid,boolean,boolean) to authenticated;
grant select,insert,update,delete on user_preferences to authenticated;
grant select on schedule_changes,inspection_checklists to authenticated;
grant select,insert on visit_comments to authenticated;
commit;
