-- =====================================================================
-- ترقية ١٣: حذف جهاز بسبب موثّق — يقدر عليها المشرف والفني
-- شغّلها بعد migration_012 في SQL Editor
-- =====================================================================
begin;

-- سجل يحفظ أي جهاز يُحذف مع سببه (للمراجعة لاحقاً)، حتى بعد حذف الجهاز نفسه
create table if not exists removed_assets (
  id         uuid primary key default gen_random_uuid(),
  asset_no   text,
  name_ar    text,
  client_id  uuid,
  category   text,
  reason     text not null,
  removed_by uuid references profiles(id),
  removed_at timestamptz default now()
);
alter table removed_assets enable row level security;
drop policy if exists p_removed_assets_read on removed_assets;
create policy p_removed_assets_read on removed_assets for select using (my_role() = 'supervisor');

-- حذف جهاز بثقة: يسجّل السبب، ينبّه المشرفين إذا حذفه فني، ثم يحذف
-- الجهاز (وما يتبعه من سجل صيانات وصور عبر on delete cascade).
create or replace function admin_delete_asset(p_asset_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare a assets%rowtype; actor_name text; r record;
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A reason is required to remove a device';
  end if;
  select * into a from assets where id = p_asset_id for update;
  if a.id is null then raise exception 'Device not found'; end if;
  if not (is_staff() and can_see_client(a.client_id)) then
    raise exception 'Access denied';
  end if;
  select full_name into actor_name from profiles where id = auth.uid();

  insert into removed_assets(asset_no, name_ar, client_id, category, reason, removed_by)
    values (a.asset_no, a.name_ar, a.client_id, a.category, p_reason, auth.uid());

  if my_role() = 'technician' then
    for r in
      select p.id from profiles p join clients c on c.id = a.client_id
      where p.role = 'supervisor' and p.branch = c.branch and p.active
    loop
      insert into notifications(profile_id, message, link) values (r.id,
        coalesce(actor_name,'فني') || ' حذف الجهاز "' || coalesce(a.name_ar,'') ||
        '" (' || coalesce(a.asset_no,'') || ') — السبب: ' || p_reason, null);
    end loop;
  end if;

  delete from assets where id = p_asset_id;
end $$;
revoke all on function admin_delete_asset(uuid,text) from public;
grant execute on function admin_delete_asset(uuid,text) to authenticated;

commit;
