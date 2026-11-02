-- =====================================================================
-- ترقية ٢٠: حساب عميل واحد يشرف على أكثر من منشأة (مثلاً مجموعة فنادق).
-- profiles.client_id يبقى يعمل كما هو لحسابات العميل القديمة (منشأة
-- واحدة) — هذه الترقية تُضيف إمكانية ربط عدة منشآت بنفس الحساب دون أي
-- تأثير على الحسابات الحالية.
-- آمنة للرجوع: لا حذف أو تعديل على بيانات موجودة.
-- شغّلها بعد migration_019.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- ١. جدول الربط: أي منشآت يرى حساب عميل معيّن، بالإضافة لـ profiles.client_id
--    (إن وُجد). التعديل عليه فقط من دالة set_client_access أدناه.
-- ---------------------------------------------------------------------
create table if not exists client_access (
  profile_id uuid not null references profiles(id) on delete cascade,
  client_id  uuid not null references clients(id) on delete cascade,
  primary key (profile_id, client_id)
);
alter table client_access enable row level security;
drop policy if exists p_client_access_read on client_access;
create policy p_client_access_read on client_access for select using (
  profile_id = auth.uid() or my_role() = 'supervisor'
);

-- ---------------------------------------------------------------------
-- ٢. can_see_client: للعميل الآن تتحقق من client_id القديم أو جدول
--    الربط الجديد معاً — أي حساب عميل حالي يستمر يعمل بدون أي تغيير.
-- ---------------------------------------------------------------------
create or replace function can_see_client(cid uuid) returns boolean as $$
  select case
    when my_role() = 'supervisor' then exists (select 1 from clients c where c.id = cid and c.branch = my_branch())
    when my_role() = 'technician' then exists (select 1 from clients c where c.id = cid and c.branch = my_branch())
    when my_role() = 'client'     then cid = my_client()
      or exists (select 1 from client_access ca where ca.profile_id = auth.uid() and ca.client_id = cid)
    else false end;
$$ language sql stable security definer;

-- ---------------------------------------------------------------------
-- ٣. قائمة كل المنشآت التي يراها حساب العميل الحالي (منشأة واحدة أو
--    أكثر) — تستخدمها صفحة العميل لعرض قائمة الفنادق إن كانت أكثر من
--    واحدة، أو الدخول مباشرة إن كانت واحدة فقط.
-- ---------------------------------------------------------------------
create or replace function my_client_list() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name_ar',c.name_ar,'name_en',c.name_en,
      'type',c.type,'city',c.city) order by c.name_ar),'[]'::jsonb)
  from clients c
  where my_role() = 'client' and (
    c.id = my_client()
    or exists (select 1 from client_access ca where ca.profile_id = auth.uid() and ca.client_id = c.id)
  );
$$;
revoke all on function my_client_list() from public;
grant execute on function my_client_list() to authenticated;

-- ---------------------------------------------------------------------
-- ٤. يستبدل المشرف قائمة المنشآت الكاملة لحساب عميل مُعيّن بقائمة
--    جديدة (كل المنشآت المختارة فقط ضمن فرعه). تستخدمها شاشة الإعدادات
--    عند إنشاء الحساب أو تعديل منشآته لاحقاً.
-- ---------------------------------------------------------------------
create or replace function set_client_access(p_profile_id uuid, p_client_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if my_role() <> 'supervisor' then raise exception 'Supervisor access required'; end if;
  if not exists (select 1 from profiles p where p.id = p_profile_id and p.role = 'client') then
    raise exception 'Client account not found';
  end if;
  if exists (select 1 from unnest(p_client_ids) cid where not can_see_client(cid)) then
    raise exception 'All clients must be in your branch';
  end if;
  delete from client_access where profile_id = p_profile_id;
  insert into client_access(profile_id, client_id)
    select p_profile_id, cid from unnest(p_client_ids) cid
    on conflict do nothing;
end $$;
revoke all on function set_client_access(uuid,uuid[]) from public;
grant execute on function set_client_access(uuid,uuid[]) to authenticated;

commit;
