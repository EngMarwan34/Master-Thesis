-- =====================================================================
-- ترقية ٩: إشعارات للفني والمشرف + حذف/إرجاع زيارة بدالة موثوقة
-- شغّلها بعد migration_008 في SQL Editor
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- جدول الإشعارات. الإدراج فيه يتم فقط من دوال/محفّزات بصلاحية الخادم
-- (security definer)، لا من تطبيق المتصفح مباشرة.
-- ---------------------------------------------------------------------
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  message    text not null,
  link       text,
  read       boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists notifications_profile_idx on notifications(profile_id, read);

alter table notifications enable row level security;
drop policy if exists p_notifications_select on notifications;
create policy p_notifications_select on notifications for select using (profile_id = auth.uid());
drop policy if exists p_notifications_update on notifications;
create policy p_notifications_update on notifications for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ---------------------------------------------------------------------
-- حذف زيارة بثقة: دالة واحدة موثوقة بدل الاعتماد على سياسات RLS مباشرة
-- (كانت تفشل بصمت أحياناً بدون رسالة خطأ واضحة). تستخدمها كل من "حذف
-- الزيارة" من صفحة العميل و"إرجاعها لم تبدأ" من صفحة الجدولة.
-- ---------------------------------------------------------------------
create or replace function admin_delete_visit(p_visit_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v visits%rowtype; client_name text; r record;
begin
  select * into v from visits where id = p_visit_id for update;
  if v.id is null then raise exception 'Visit not found'; end if;
  if my_role() <> 'supervisor' or not can_see_client(v.client_id) then
    raise exception 'Supervisor access required';
  end if;
  select name_ar into client_name from clients where id = v.client_id;
  for r in
    select distinct tech_id from (
      select v.technician_id as tech_id
      union select technician_id from visit_technicians where visit_id = v.id
    ) t where tech_id is not null
  loop
    insert into notifications(profile_id, message, link)
      values (r.tech_id, 'أُلغى بدء زيارة ' || coalesce(client_name,'') || ' بواسطة المشرف', null);
  end loop;
  delete from visits where id = p_visit_id;
end $$;
revoke all on function admin_delete_visit(uuid) from public;
grant execute on function admin_delete_visit(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- إشعارات تلقائية عند أي تغيّر مهم في زيارة: طلب طارئة جديد، إرسال
-- للاعتماد، اعتماد، أو إعادة للفني.
-- ---------------------------------------------------------------------
create or replace function notify_visit_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare branch_val text; client_name text; actor_name text; link text; msg text; r record;
begin
  select c.branch, c.name_ar into branch_val, client_name from clients c
    where c.id = coalesce(new.client_id, old.client_id);
  select full_name into actor_name from profiles where id = auth.uid();

  if tg_op = 'INSERT' and new.visit_type = 'emergency' and new.technician_id is not null then
    insert into notifications(profile_id, message, link)
      values (new.technician_id, 'طلب صيانة طارئة جديد: ' || coalesce(client_name,''), '#/visit/' || new.id);
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'submitted' then
      link := '#/review/' || new.id;
      msg := coalesce(actor_name,'فني') || ' أرسل زيارة ' || coalesce(client_name,'') || ' للاعتماد';
      for r in select id from profiles where role = 'supervisor' and branch = branch_val and active loop
        insert into notifications(profile_id, message, link) values (r.id, msg, link);
      end loop;
    elsif new.status = 'approved' then
      link := '#/report/' || new.id;
      msg := 'اعتُمدت زيارة ' || coalesce(client_name,'');
      for r in
        select distinct tech_id from (
          select new.technician_id as tech_id
          union select technician_id from visit_technicians where visit_id = new.id
        ) t where tech_id is not null
      loop
        insert into notifications(profile_id, message, link) values (r.tech_id, msg, link);
      end loop;
    elsif new.status = 'rejected' then
      link := '#/visit/' || new.id;
      msg := 'أُعيدت زيارة ' || coalesce(client_name,'') || ' للتعديل'
        || case when new.reject_reason is not null then ': ' || new.reject_reason else '' end;
      for r in
        select distinct tech_id from (
          select new.technician_id as tech_id
          union select technician_id from visit_technicians where visit_id = new.id
        ) t where tech_id is not null
      loop
        insert into notifications(profile_id, message, link) values (r.tech_id, msg, link);
      end loop;
    end if;
  end if;
  return new;
end $$;
-- اسم يبدأ بـ z عمداً ليعمل بعد محفّز attach_preventive_team (ترتيب
-- محفّزات AFTER على نفس الجدول أبجدي حسب اسم المحفّز).
drop trigger if exists z_notify_visit_change on visits;
create trigger z_notify_visit_change after insert or update on visits
  for each row execute function notify_visit_change();

-- إشعار الفني لما يُضاف كمساعد على زيارة جارية
create or replace function add_visit_technician(p_visit_id uuid, p_technician_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare v visits%rowtype; client_name text;
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
  select name_ar into client_name from clients where id = v.client_id;
  insert into notifications(profile_id, message, link)
    values (p_technician_id, 'أُضفت لفريق زيارة ' || coalesce(client_name,''), '#/visit/' || p_visit_id);
end $$;

revoke all on function add_visit_technician(uuid,uuid) from public;
grant execute on function add_visit_technician(uuid,uuid) to authenticated;

commit;
