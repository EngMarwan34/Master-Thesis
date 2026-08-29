-- =====================================================================
-- نظام تقارير الصيانة الوقائية (PPM) — شركة المحتسب
-- مخطط قاعدة البيانات + سياسات RLS لـ Supabase (PostgreSQL)
-- =====================================================================
-- طريقة التنفيذ: افتح مشروعك في supabase.com → SQL Editor → الصق هذا
-- الملف كاملاً → Run. الملف آمن لإعادة التشغيل (idempotent) قدر الإمكان.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) الإضافات المطلوبة
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1) الأنواع المعدودة (ENUMs)
-- ---------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('branch_admin', 'technician', 'client');
exception when duplicate_object then null; end $$;

do $$ begin
  create type asset_category as enum ('refrigeration', 'cooking', 'ac', 'laundry');
exception when duplicate_object then null; end $$;

do $$ begin
  create type asset_condition as enum (
    'sound',            -- سليم
    'needs_maintenance',-- يحتاج صيانة
    'needs_parts',      -- يحتاج قطع غيار
    'out_of_service',   -- متوقف عن العمل
    'not_accessible'    -- غير متاح للفحص
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type visit_status as enum ('draft', 'pending_approval', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type photo_type as enum ('general', 'defect');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2) الجداول
-- ---------------------------------------------------------------------

-- ملف المستخدم (يمتد auth.users). client_id إضافة على مخطط المواصفة
-- لدعم حساب "عميل اطلاع" المرتبط بعميل واحد تحديداً.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        user_role not null default 'technician',
  branch      text,                              -- الفرع (لمشرف الفرع والفني)
  phone       text,
  active      boolean not null default true,
  client_id   uuid,                              -- لحساب دور 'client' فقط
  created_at  timestamptz not null default now()
);

create table if not exists public.clients (
  id            uuid primary key default gen_random_uuid(),
  name_ar       text not null,
  name_en       text,
  type          text,                            -- مستشفى / فندق / مصنع ...
  branch        text not null,
  city          text,
  contact_name  text,
  contact_phone text,
  logo_url      text,
  created_at    timestamptz not null default now()
);

do $$ begin
  alter table public.profiles
    add constraint profiles_client_id_fkey
    foreign key (client_id) references public.clients(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.locations (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.assets (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  location_id     uuid references public.locations(id) on delete set null,
  asset_no        text not null,
  qr_code         text not null unique default replace(gen_random_uuid()::text, '-', ''),
  name_ar         text not null,
  name_en         text,
  category        asset_category not null,
  brand           text,
  model           text,
  serial_no       text,
  base_photo_url  text,
  active          boolean not null default true,
  field_added     boolean not null default false,  -- أُضيف ميدانياً من الفني
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  unique (client_id, asset_no)
);

create table if not exists public.contracts (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  contract_no     text not null,
  start_date      date not null,
  end_date        date not null,
  frequency_months integer not null default 3,     -- كل كم شهر تُنفَّذ زيارة
  visits_planned  integer not null default 4,       -- إجمالي الزيارات المخطط لها لكامل مدة العقد
  created_at      timestamptz not null default now()
);

create table if not exists public.visits (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  contract_id       uuid references public.contracts(id) on delete set null,
  technician_id     uuid not null references public.profiles(id),
  visit_date        date not null default current_date,
  check_in          timestamptz,
  check_out         timestamptz,
  status            visit_status not null default 'draft',
  general_notes     text,
  recommendations   text,
  approved_by       uuid references public.profiles(id),
  approved_at       timestamptz,
  rejection_reason  text,
  report_no         text unique,
  share_token       uuid not null default gen_random_uuid(),
  created_at        timestamptz not null default now()
);

create table if not exists public.visit_items (
  id                  uuid primary key default gen_random_uuid(),
  visit_id            uuid not null references public.visits(id) on delete cascade,
  asset_id            uuid not null references public.assets(id) on delete cascade,
  condition           asset_condition,
  technician_notes    text,
  parts_needed_text   text,
  created_at          timestamptz not null default now(),
  unique (visit_id, asset_id)
);

create table if not exists public.photos (
  id              uuid primary key default gen_random_uuid(),
  visit_item_id   uuid not null references public.visit_items(id) on delete cascade,
  url             text not null,
  type            photo_type not null default 'general',
  taken_at        timestamptz not null default now()
);

-- فهارس مساعدة
create index if not exists idx_assets_client on public.assets(client_id);
create index if not exists idx_assets_qr on public.assets(qr_code);
create index if not exists idx_visits_client on public.visits(client_id);
create index if not exists idx_visits_technician on public.visits(technician_id);
create index if not exists idx_visits_status on public.visits(status);
create index if not exists idx_visit_items_visit on public.visit_items(visit_id);
create index if not exists idx_visit_items_asset on public.visit_items(asset_id);
create index if not exists idx_photos_visit_item on public.photos(visit_item_id);

-- ---------------------------------------------------------------------
-- 3) دوال مساعدة لقراءة هوية المستخدم الحالي (SECURITY DEFINER لتفادي
--    التكرار اللانهائي في سياسات RLS على جدول profiles نفسه)
-- ---------------------------------------------------------------------
create or replace function public.current_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_branch()
returns text
language sql stable security definer set search_path = public as $$
  select branch from public.profiles where id = auth.uid();
$$;

create or replace function public.current_client_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select client_id from public.profiles where id = auth.uid();
$$;

-- هل يملك المستخدم الحالي صلاحية الوصول لهذا العميل (client row)؟
create or replace function public.can_access_client(p_client_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select case public.current_role()
    when 'branch_admin' then exists (select 1 from public.clients c where c.id = p_client_id and c.branch = public.current_branch())
    when 'technician'   then exists (select 1 from public.clients c where c.id = p_client_id and c.branch = public.current_branch())
    when 'client'       then p_client_id = public.current_client_id()
    else false
  end;
$$;

-- ---------------------------------------------------------------------
-- 3.5) صلاحيات مستوى الجدول للأدوار (احتياطية إن لم تكن مضبوطة افتراضياً
--      على مشروعك). الحماية الفعلية تبقى سياسات RLS أعلاه؛ هذه فقط تسمح
--      لمستخدم "authenticated" بمحاولة القراءة/الكتابة أصلاً قبل أن تُقرِّر
--      RLS إن كان مسموحاً له بصف بعينه.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.profiles, public.clients, public.locations, public.assets,
  public.contracts, public.visits, public.visit_items, public.photos
  to authenticated;
grant usage, select on sequence public.report_no_seq to authenticated;

-- ---------------------------------------------------------------------
-- 4) تفعيل RLS
-- ---------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.clients      enable row level security;
alter table public.locations    enable row level security;
alter table public.assets       enable row level security;
alter table public.contracts    enable row level security;
alter table public.visits       enable row level security;
alter table public.visit_items  enable row level security;
alter table public.photos       enable row level security;

-- ---------------------------------------------------------------------
-- 5) سياسات profiles
-- ---------------------------------------------------------------------
-- ملاحظة: مستخدم جديد يُنشأ من لوحة Supabase يصل بلا فرع (branch is null)
-- حتى يُعيّنه مشرف الفرع من شاشة "إدارة المستخدمين" — لذا تسمح السياسات
-- لمشرف الفرع برؤية/تعديل ملفات بلا فرع أيضاً، لا فرعه فقط.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (
    id = auth.uid()
    or (public.current_role() = 'branch_admin' and (branch = public.current_branch() or branch is null))
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (
    id = auth.uid()
    or (public.current_role() = 'branch_admin' and (branch = public.current_branch() or branch is null))
  );

-- إدراج صف الملف الشخصي يتم تلقائياً عبر المُشغّل handle_new_user أدناه.
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid());

-- عند إنشاء مستخدم جديد في Supabase Auth (من لوحة التحكم)، أنشئ له
-- تلقائياً صف profile بالقيم الافتراضية، ثم يُكمل مشرف الفرع الاسم/الفرع/الدور
-- من داخل شاشة "إدارة المستخدمين" في النظام.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role, branch)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'technician'),
    new.raw_user_meta_data->>'branch'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 6) سياسات clients / locations / assets / contracts
-- ---------------------------------------------------------------------
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients for select
  using (public.can_access_client(id));

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients for insert
  with check (public.current_role() = 'branch_admin' and branch = public.current_branch());
drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients for update
  using (public.current_role() = 'branch_admin' and branch = public.current_branch());
drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients for delete
  using (public.current_role() = 'branch_admin' and branch = public.current_branch());

drop policy if exists locations_select on public.locations;
create policy locations_select on public.locations for select
  using (public.can_access_client(client_id));
drop policy if exists locations_insert on public.locations;
create policy locations_insert on public.locations for insert
  with check (public.current_role() in ('branch_admin','technician') and public.can_access_client(client_id));
drop policy if exists locations_update on public.locations;
create policy locations_update on public.locations for update
  using (public.current_role() in ('branch_admin','technician') and public.can_access_client(client_id));
drop policy if exists locations_delete on public.locations;
create policy locations_delete on public.locations for delete
  using (public.current_role() = 'branch_admin' and public.can_access_client(client_id));

drop policy if exists assets_select on public.assets;
create policy assets_select on public.assets for select
  using (public.can_access_client(client_id));
drop policy if exists assets_insert on public.assets;
create policy assets_insert on public.assets for insert
  with check (public.current_role() in ('branch_admin','technician') and public.can_access_client(client_id));
drop policy if exists assets_update on public.assets;
create policy assets_update on public.assets for update
  using (public.current_role() in ('branch_admin','technician') and public.can_access_client(client_id));
drop policy if exists assets_delete on public.assets;
create policy assets_delete on public.assets for delete
  using (public.current_role() = 'branch_admin' and public.can_access_client(client_id));

drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts for select
  using (public.can_access_client(client_id));
drop policy if exists contracts_insert on public.contracts;
create policy contracts_insert on public.contracts for insert
  with check (public.current_role() = 'branch_admin' and public.can_access_client(client_id));
drop policy if exists contracts_update on public.contracts;
create policy contracts_update on public.contracts for update
  using (public.current_role() = 'branch_admin' and public.can_access_client(client_id));
drop policy if exists contracts_delete on public.contracts;
create policy contracts_delete on public.contracts for delete
  using (public.current_role() = 'branch_admin' and public.can_access_client(client_id));

-- ---------------------------------------------------------------------
-- 7) سياسات visits
--    - الفني: يرى زياراته فقط، ويُنشئ وينشئ زياراته، ويعدّلها ما دامت
--      ليست معتمدة بعد.
--    - مشرف الفرع: يرى كل زيارات عملاء فرعه، ويعتمد/يرفض.
--    - العميل: يرى فقط الزيارات المعتمدة الخاصة بعميله.
-- ---------------------------------------------------------------------
drop policy if exists visits_select on public.visits;
create policy visits_select on public.visits for select
  using (
    (public.current_role() = 'technician' and technician_id = auth.uid())
    or (public.current_role() = 'branch_admin' and public.can_access_client(client_id))
    or (public.current_role() = 'client' and client_id = public.current_client_id() and status = 'approved')
  );

drop policy if exists visits_insert on public.visits;
create policy visits_insert on public.visits for insert
  with check (
    public.current_role() = 'technician'
    and technician_id = auth.uid()
    and public.can_access_client(client_id)
  );

drop policy if exists visits_update on public.visits;
create policy visits_update on public.visits for update
  using (
    (public.current_role() = 'technician' and technician_id = auth.uid() and status in ('draft','rejected'))
    or (public.current_role() = 'branch_admin' and public.can_access_client(client_id))
  );

-- ---------------------------------------------------------------------
-- 8) سياسات visit_items و photos (عبر الزيارة الأم)
-- ---------------------------------------------------------------------
create or replace function public.visit_owner_editable(p_visit_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.visits v
    where v.id = p_visit_id
      and v.technician_id = auth.uid()
      and v.status in ('draft','rejected')
  );
$$;

create or replace function public.visit_admin_editable(p_visit_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.visits v
    where v.id = p_visit_id
      and public.can_access_client(v.client_id)
  );
$$;

create or replace function public.visit_viewable(p_visit_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.visits v
    where v.id = p_visit_id
      and (
        (public.current_role() = 'technician' and v.technician_id = auth.uid())
        or (public.current_role() = 'branch_admin' and public.can_access_client(v.client_id))
        or (public.current_role() = 'client' and v.client_id = public.current_client_id() and v.status = 'approved')
      )
  );
$$;

drop policy if exists visit_items_select on public.visit_items;
create policy visit_items_select on public.visit_items for select
  using (public.visit_viewable(visit_id));

drop policy if exists visit_items_insert on public.visit_items;
create policy visit_items_insert on public.visit_items for insert
  with check (public.visit_owner_editable(visit_id));

drop policy if exists visit_items_update on public.visit_items;
create policy visit_items_update on public.visit_items for update
  using (public.visit_owner_editable(visit_id) or public.current_role() = 'branch_admin' and public.visit_admin_editable(visit_id));

drop policy if exists visit_items_delete on public.visit_items;
create policy visit_items_delete on public.visit_items for delete
  using (public.visit_owner_editable(visit_id));

drop policy if exists photos_select on public.photos;
create policy photos_select on public.photos for select
  using (exists (select 1 from public.visit_items vi where vi.id = visit_item_id and public.visit_viewable(vi.visit_id)));

drop policy if exists photos_insert on public.photos;
create policy photos_insert on public.photos for insert
  with check (exists (select 1 from public.visit_items vi where vi.id = visit_item_id and public.visit_owner_editable(vi.visit_id)));

drop policy if exists photos_delete on public.photos;
create policy photos_delete on public.photos for delete
  using (exists (select 1 from public.visit_items vi where vi.id = visit_item_id and public.visit_owner_editable(vi.visit_id)));

-- ---------------------------------------------------------------------
-- 9) توليد رقم التقرير تلقائياً عند الاعتماد
-- ---------------------------------------------------------------------
create sequence if not exists public.report_no_seq start 1;

create or replace function public.set_report_no()
returns trigger
language plpgsql as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    if new.approved_at is null then
      new.approved_at := now();
    end if;
    if new.report_no is null then
      new.report_no := 'MHT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.report_no_seq')::text, 6, '0');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_report_no on public.visits;
create trigger trg_set_report_no
  before update on public.visits
  for each row execute function public.set_report_no();

-- ---------------------------------------------------------------------
-- 10) دالة عامة (Public RPC) لعرض تقرير معتمد عبر رابط مشاركة بدون تسجيل
--     دخول — تُستدعى من الواجهة عبر supabase.rpc('rpc_public_report', ...)
-- ---------------------------------------------------------------------
create or replace function public.rpc_public_report(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_visit public.visits;
  v_client public.clients;
  v_result jsonb;
begin
  select * into v_visit from public.visits where share_token = p_token and status = 'approved';
  if not found then
    return null;
  end if;
  select * into v_client from public.clients where id = v_visit.client_id;

  select jsonb_build_object(
    'visit', to_jsonb(v_visit),
    'client', to_jsonb(v_client),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'item', to_jsonb(vi),
        'asset', to_jsonb(a),
        'location', to_jsonb(l),
        'photos', (select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) from public.photos p where p.visit_item_id = vi.id)
      )), '[]'::jsonb)
      from public.visit_items vi
      join public.assets a on a.id = vi.asset_id
      left join public.locations l on l.id = a.location_id
      where vi.visit_id = v_visit.id
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.rpc_public_report(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 11) دالة لسجل الجهاز التاريخي (لعرضه في بطاقة الفحص أثناء الزيارة)
-- ---------------------------------------------------------------------
create or replace function public.rpc_asset_history(p_asset_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_client_id uuid;
  v_result jsonb;
begin
  select client_id into v_client_id from public.assets where id = p_asset_id;
  if v_client_id is null or not public.can_access_client(v_client_id) then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'visit_date', v.visit_date,
    'status', v.status,
    'condition', vi.condition,
    'technician_notes', vi.technician_notes,
    'parts_needed_text', vi.parts_needed_text,
    'photos', (select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) from public.photos p where p.visit_item_id = vi.id)
  ) order by v.visit_date desc), '[]'::jsonb)
  into v_result
  from public.visit_items vi
  join public.visits v on v.id = vi.visit_id
  where vi.asset_id = p_asset_id
    and v.status in ('approved','pending_approval');

  return v_result;
end;
$$;

grant execute on function public.rpc_asset_history(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 12) تخزين الصور (Storage) — Bucket واحد للصور المرجعية وصور الزيارات.
--     القراءة عامة (لازمة لرابط مشاركة التقرير عبر واتساب دون تسجيل دخول)،
--     والكتابة مقصورة على المستخدمين المسجّلين حسب الفرع/العميل.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('ppm-photos', 'ppm-photos', true)
on conflict (id) do nothing;

-- مسار الملف المتفق عليه في الواجهة: {client_id}/{...}.jpg
-- بذلك يمكن التحقق من صلاحية الوصول بقراءة أول جزء من المسار كـ client_id.
drop policy if exists ppm_photos_public_read on storage.objects;
create policy ppm_photos_public_read on storage.objects for select
  using (bucket_id = 'ppm-photos');

drop policy if exists ppm_photos_write on storage.objects;
create policy ppm_photos_write on storage.objects for insert
  with check (
    bucket_id = 'ppm-photos'
    and public.current_role() in ('branch_admin','technician')
    and public.can_access_client((storage.foldername(name))[1]::uuid)
  );

drop policy if exists ppm_photos_update on storage.objects;
create policy ppm_photos_update on storage.objects for update
  using (
    bucket_id = 'ppm-photos'
    and public.current_role() in ('branch_admin','technician')
    and public.can_access_client((storage.foldername(name))[1]::uuid)
  );

drop policy if exists ppm_photos_delete on storage.objects;
create policy ppm_photos_delete on storage.objects for delete
  using (
    bucket_id = 'ppm-photos'
    and public.current_role() in ('branch_admin','technician')
    and public.can_access_client((storage.foldername(name))[1]::uuid)
  );

-- شعارات العملاء يمكن حفظها أيضاً داخل نفس الـ bucket تحت مسار logos/{client_id}.jpg
-- وهي مغطاة بنفس السياسات أعلاه.

-- =====================================================================
-- تمّ. بعد التشغيل: أنشئ أول مستخدم "مشرف فرع" من Authentication → Add user
-- في لوحة Supabase، ثم نفّذ في SQL Editor مرة واحدة فقط لترقيته:
--
--   update public.profiles set role = 'branch_admin', branch = 'الرياض',
--          full_name = 'اسمك', active = true
--   where id = '<UUID المستخدم من صفحة Authentication>';
-- =====================================================================
