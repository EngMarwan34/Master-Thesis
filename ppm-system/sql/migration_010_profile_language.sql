-- =====================================================================
-- ترقية ١٠: لغة واجهة لكل حساب (عربي/إنجليزي)
-- شغّلها بعد migration_009 في SQL Editor
-- =====================================================================

alter table profiles add column if not exists language text not null default 'ar'
  check (language in ('ar','en'));

-- مثال: تغيير حساب فني معيّن للإنجليزية (عدّل الاسم حسب الحاجة)
-- update profiles set language='en' where full_name='عدنان' and role='technician';

drop function if exists update_staff_profile(uuid,text,text,boolean);
create or replace function update_staff_profile(p_id uuid,p_full_name text,p_phone text,p_active boolean,p_language text default 'ar') returns void
language plpgsql security definer set search_path=public as $$
begin
  if my_role() is distinct from 'supervisor' or not exists(
    select 1 from profiles p where p.id=p_id and p.branch=my_branch() and p.role='technician') then
    raise exception 'Technician in your branch required'; end if;
  if nullif(trim(p_full_name),'') is null or length(p_full_name)>100 or length(coalesce(p_phone,''))>40 or p_active is null
     or p_language not in ('ar','en') then
    raise exception 'Invalid technician details'; end if;
  update profiles set full_name=trim(p_full_name),phone=nullif(trim(p_phone),''),active=p_active,language=p_language where id=p_id;
end $$;
revoke all on function update_staff_profile(uuid,text,text,boolean,text) from public;
grant execute on function update_staff_profile(uuid,text,text,boolean,text) to authenticated;
