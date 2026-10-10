-- Apply after migrations 002, 003 and 004. Additive, transactional and repeatable.
-- Public photo/attachment storage and URLs are intentionally unchanged.
begin;

-- Inactive accounts have no staff write privileges.
create or replace function my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active;
$$;

-- Technician writes require ownership, branch access and an editable visit.
create or replace function can_edit_visit(vid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from visits v where v.id = vid and can_see_client(v.client_id)
    and ((my_role() = 'supervisor' and v.status <> 'approved') or (my_role() = 'technician'
      and v.technician_id = auth.uid() and v.status in ('draft','rejected'))));
$$;

drop policy if exists p_visits_insert on visits;
create policy p_visits_insert on visits for insert to authenticated with check (
  can_see_client(client_id) and (my_role() = 'supervisor' or
    (my_role() = 'technician' and technician_id = auth.uid() and status = 'draft')));
drop policy if exists p_visits_update on visits;
create policy p_visits_update on visits for update to authenticated using (
  can_see_client(client_id) and (my_role() = 'supervisor' or
    (my_role() = 'technician' and technician_id = auth.uid() and status in ('draft','rejected')))
) with check (can_see_client(client_id) and (my_role() = 'supervisor' or
    (my_role() = 'technician' and technician_id = auth.uid() and status in ('draft','submitted'))));

drop policy if exists p_items_write on visit_items;
create policy p_items_write on visit_items for all to authenticated
  using (can_edit_visit(visit_id)) with check (can_edit_visit(visit_id) and exists (
    select 1 from visits v join assets a on a.client_id = v.client_id
    where v.id = visit_id and a.id = asset_id
      and (v.visit_type = 'preventive' or v.target_asset_id = a.id)));
drop policy if exists p_photos_write on photos;
create policy p_photos_write on photos for all to authenticated
  using (exists (select 1 from visit_items i where i.id = visit_item_id and can_edit_visit(i.visit_id)))
  with check (exists (select 1 from visit_items i where i.id = visit_item_id and can_edit_visit(i.visit_id)));

create table if not exists scheduled_visits (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  due_date date not null,
  technician_id uuid references profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  unique(contract_id, due_date)
);
alter table visits add column if not exists scheduled_visit_id uuid references scheduled_visits(id) on delete set null;
create unique index if not exists visits_schedule_unique on visits(scheduled_visit_id) where scheduled_visit_id is not null;
create index if not exists scheduled_visits_due_idx on scheduled_visits(due_date);
alter table scheduled_visits enable row level security;
drop policy if exists p_schedule_read on scheduled_visits;
create policy p_schedule_read on scheduled_visits for select to authenticated using (
  is_staff() and exists (select 1 from contracts c where c.id = contract_id and can_see_client(c.client_id)));
drop policy if exists p_schedule_write on scheduled_visits;
create policy p_schedule_write on scheduled_visits for all to authenticated using (
  my_role() = 'supervisor' and exists (select 1 from contracts c where c.id = contract_id and can_see_client(c.client_id))
) with check (my_role() = 'supervisor' and exists (
  select 1 from contracts c where c.id = contract_id and can_see_client(c.client_id)
    and due_date between c.start_date and c.end_date) and (technician_id is null or exists (
  select 1 from profiles p where p.id = technician_id and p.role = 'technician' and p.active and p.branch = my_branch())));

-- Validate ownership and allowed column/status changes even for direct API calls.
create or replace function guard_visit_workflow() returns trigger
language plpgsql security definer set search_path = public as $$
declare actor text := my_role();
begin
  -- SQL Editor imports and service-role maintenance have no end-user identity.
  if auth.uid() is null then return new; end if;
  if not is_staff() or not can_see_client(new.client_id) then raise exception 'Visit access denied'; end if;
  if actor = 'technician' then
    if new.technician_id is distinct from auth.uid() then raise exception 'Visit ownership required'; end if;
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
  if new.technician_id is not null and not exists (
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
      and (actor = 'supervisor' or s.technician_id is null or s.technician_id = auth.uid())
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

-- All item and photo metadata writes succeed together or roll back together.
create or replace function save_visit_item(p_visit_id uuid, p_asset_id uuid,
  p_condition text, p_notes text, p_parts text, p_photos jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare result_id uuid; v visits%rowtype;
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
  insert into visit_items(visit_id,asset_id,condition,technician_notes,parts_needed_text)
    values(p_visit_id,p_asset_id,p_condition,nullif(trim(p_notes),''),
      case when p_condition in ('سليم','غير متاح للفحص') then null else nullif(trim(p_parts),'') end)
    on conflict (visit_id,asset_id) do update set condition = excluded.condition,
      technician_notes = excluded.technician_notes, parts_needed_text = excluded.parts_needed_text
    returning id into result_id;
  delete from photos where visit_item_id = result_id;
  insert into photos(visit_item_id,url,type)
    select result_id,p->>'url',p->>'type' from jsonb_array_elements(p_photos) p;
  return result_id;
end $$;
revoke all on function save_visit_item(uuid,uuid,text,text,text,jsonb) from public;
grant execute on function save_visit_item(uuid,uuid,text,text,text,jsonb) to authenticated;

create table if not exists fault_resolutions (
  visit_item_id uuid primary key references visit_items(id) on delete cascade,
  resolution_notes text not null check (length(trim(resolution_notes)) > 0),
  resolved_by uuid not null default auth.uid() references profiles(id),
  resolved_at timestamptz not null default now()
);
alter table fault_resolutions enable row level security;
drop policy if exists p_resolution_read on fault_resolutions;
create policy p_resolution_read on fault_resolutions for select to authenticated using (
  is_staff() and exists (select 1 from visit_items i where i.id = visit_item_id));
drop policy if exists p_resolution_insert on fault_resolutions;
create policy p_resolution_insert on fault_resolutions for insert to authenticated with check (
  my_role() = 'supervisor' and resolved_by = auth.uid() and exists (
    select 1 from visit_items i join visits v on v.id = i.visit_id
    where i.id = visit_item_id and v.status in ('submitted','approved') and can_see_client(v.client_id)));

-- Latest inspected condition per active asset; inaccessible visits don't erase a known fault.
-- Invoker functions apply the caller's RLS, including branch isolation.
create or replace function current_faults() returns jsonb
language sql stable security invoker set search_path = public as $$
  with latest as (
    select distinct on (i.asset_id) i.*, v.client_id, v.visit_date, v.status, v.created_at as visit_created
    from visit_items i join visits v on v.id = i.visit_id join assets a on a.id = i.asset_id
    where v.status in ('submitted','approved') and a.active and i.condition <> 'غير متاح للفحص'
    order by i.asset_id,v.visit_date desc,v.created_at desc,i.created_at desc,i.id desc
  ) select coalesce(jsonb_agg(jsonb_build_object(
    'id',i.id,'condition',i.condition,'parts_needed_text',i.parts_needed_text,
    'assets',jsonb_build_object('id',a.id,'name_ar',a.name_ar,'asset_no',a.asset_no),
    'visits',jsonb_build_object('id',i.visit_id,'visit_date',i.visit_date,'status',i.status,
      'clients',jsonb_build_object('name_ar',c.name_ar))) order by i.visit_date desc),'[]'::jsonb)
  from latest i join assets a on a.id = i.asset_id join clients c on c.id = i.client_id
  where is_staff() and i.condition in ('يحتاج قطع غيار','يحتاج صيانة','متوقف عن العمل')
    and not exists (select 1 from fault_resolutions r where r.visit_item_id = i.id);
$$;
revoke all on function current_faults() from public;
grant execute on function current_faults() to authenticated;

-- Restrict supervisor profile management to their branch, including new assignments.
drop policy if exists p_profiles_self on profiles;
create policy p_profiles_self on profiles for select using (
  id = auth.uid() or (my_role() = 'supervisor' and branch = my_branch()));
drop policy if exists p_profiles_write on profiles;
create policy p_profiles_write on profiles for all using (
  my_role() = 'supervisor' and branch = my_branch()) with check (
  my_role() = 'supervisor' and branch = my_branch());

create or replace function approve_visit(p_visit_id uuid, p_recommendations text, p_items jsonb) returns void
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
  update visits set status = 'approved', approved_by = auth.uid(), recommendations = p_recommendations
    where id = p_visit_id;
end $$;
revoke all on function approve_visit(uuid,text,jsonb) from public;
grant execute on function approve_visit(uuid,text,jsonb) to authenticated;

create or replace function create_contract_schedule(p_client_id uuid, p_contract_no text,
  p_start_date date, p_end_date date, p_frequency text, p_technician_id uuid, p_dates jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare cid uuid;
begin
  if my_role() is distinct from 'supervisor' or not can_see_client(p_client_id) then raise exception 'Supervisor access required'; end if;
  if p_start_date is null or p_end_date is null or p_start_date > p_end_date or nullif(trim(p_contract_no),'') is null
    or jsonb_typeof(p_dates) is distinct from 'array' or jsonb_array_length(p_dates) not between 1 and 120 then
    raise exception 'Invalid contract schedule'; end if;
  insert into contracts(client_id,contract_no,start_date,end_date,frequency,visits_planned)
    values(p_client_id,trim(p_contract_no),p_start_date,p_end_date,p_frequency,jsonb_array_length(p_dates)) returning id into cid;
  insert into scheduled_visits(contract_id,due_date,technician_id)
    select cid,(value #>> '{}')::date,p_technician_id from jsonb_array_elements(p_dates);
  return cid;
end $$;
revoke all on function create_contract_schedule(uuid,text,date,date,text,uuid,jsonb) from public;
grant execute on function create_contract_schedule(uuid,text,date,date,text,uuid,jsonb) to authenticated;

commit;
