-- =====================================================================
-- نظام تقارير الصيانة الوقائية — شركة المحتسب
-- قاعدة البيانات وسياسات الحماية (Supabase / PostgreSQL)
-- شغّل هذا الملف مرة واحدة في: Supabase ← SQL Editor ← New query ← Run
-- =====================================================================

-- ---------- ١. الجداول ----------

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        text not null check (role in ('supervisor','technician','client')),
  branch      text,                 -- جدة / المدينة  (للموظفين)
  client_id   uuid,                 -- لحسابات العملاء فقط
  phone       text,
  active      boolean default true,
  created_at  timestamptz default now()
);

create table if not exists clients (
  id            uuid primary key default gen_random_uuid(),
  name_ar       text not null,
  name_en       text,
  type          text,               -- فندق / مستشفى / مطعم
  branch        text not null,
  city          text,
  contact_name  text,
  contact_phone text,
  created_at    timestamptz default now()
);

do $$ begin
  alter table profiles
    add constraint profiles_client_fk foreign key (client_id) references clients(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists locations (
  id        uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name      text not null           -- المطبخ الرئيسي / الدور الثالث / قسم الغسيل
);

create table if not exists assets (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references clients(id) on delete cascade,
  location_id    uuid references locations(id) on delete set null,
  location_text  text,
  asset_no       text not null,
  qr_code        text unique not null default encode(gen_random_bytes(6),'hex'),
  name_ar        text not null,
  name_en        text,
  category       text check (category in ('تبريد','طبخ','تكييف','غسيل','أخرى')) default 'أخرى',
  brand          text,
  model          text,
  serial_no      text,
  base_photo_url text,
  field_added    boolean default false,
  active         boolean default true,
  created_at     timestamptz default now()
);
create index if not exists assets_client_idx on assets(client_id);

create table if not exists contracts (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,
  contract_no   text,
  start_date    date,
  end_date      date,
  frequency     text,               -- شهري / ربع سنوي / نصف سنوي
  visits_planned int default 0
);

create sequence if not exists report_seq;

create table if not exists visits (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  contract_id     uuid references contracts(id) on delete set null,
  technician_id   uuid references profiles(id),
  visit_date      date not null default current_date,
  check_in        timestamptz default now(),
  check_out       timestamptz,
  status          text not null default 'draft'
                  check (status in ('draft','submitted','approved','rejected')),
  general_notes   text,
  recommendations text,
  reject_reason   text,
  report_no       text,
  approved_by     uuid references profiles(id),
  approved_at     timestamptz,
  created_at      timestamptz default now()
);
create index if not exists visits_client_idx on visits(client_id, status);

create table if not exists visit_items (
  id                uuid primary key default gen_random_uuid(),
  visit_id          uuid not null references visits(id) on delete cascade,
  asset_id          uuid not null references assets(id) on delete cascade,
  condition         text not null check (condition in
                    ('سليم','يحتاج صيانة','يحتاج قطع غيار','متوقف عن العمل','غير متاح للفحص')),
  technician_notes  text,
  parts_needed_text text,
  created_at        timestamptz default now(),
  unique (visit_id, asset_id)
);

create table if not exists photos (
  id            uuid primary key default gen_random_uuid(),
  visit_item_id uuid not null references visit_items(id) on delete cascade,
  url           text not null,
  type          text not null check (type in ('general','defect')),
  taken_at      timestamptz default now()
);

-- ترقيم التقارير تلقائياً عند الاعتماد
create or replace function set_report_no() returns trigger as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') and new.report_no is null then
    new.report_no := 'PPM-' || to_char(now(),'YYYY') || '-' || lpad(nextval('report_seq')::text, 4, '0');
    new.approved_at := now();
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_report_no on visits;
create trigger trg_report_no before update on visits
  for each row execute function set_report_no();

-- ---------- ٢. دوال مساعدة للصلاحيات ----------

create or replace function my_role() returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function my_branch() returns text as $$
  select branch from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function my_client() returns uuid as $$
  select client_id from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function is_staff() returns boolean as $$
  select coalesce(my_role() in ('supervisor','technician'), false);
$$ language sql stable security definer;

-- العميل مرئي لي؟ (موظف في نفس الفرع، أو حساب العميل نفسه)
create or replace function can_see_client(cid uuid) returns boolean as $$
  select case
    when my_role() = 'supervisor' then exists (select 1 from clients c where c.id = cid and c.branch = my_branch())
    when my_role() = 'technician' then exists (select 1 from clients c where c.id = cid and c.branch = my_branch())
    when my_role() = 'client'     then cid = my_client()
    else false end;
$$ language sql stable security definer;

-- ---------- ٣. تفعيل RLS ----------

alter table profiles    enable row level security;
alter table clients     enable row level security;
alter table locations   enable row level security;
alter table assets      enable row level security;
alter table contracts   enable row level security;
alter table visits      enable row level security;
alter table visit_items enable row level security;
alter table photos      enable row level security;

-- الملفات الشخصية
drop policy if exists p_profiles_self on profiles;
create policy p_profiles_self on profiles for select using (
  id = auth.uid() or my_role() = 'supervisor'
);
drop policy if exists p_profiles_write on profiles;
create policy p_profiles_write on profiles for all using (my_role() = 'supervisor')
  with check (my_role() = 'supervisor');

-- العملاء
drop policy if exists p_clients_read on clients;
create policy p_clients_read on clients for select using (can_see_client(id));
drop policy if exists p_clients_write on clients;
create policy p_clients_write on clients for all
  using (my_role() = 'supervisor' and branch = my_branch())
  with check (my_role() = 'supervisor' and branch = my_branch());

-- المواقع
drop policy if exists p_loc_read on locations;
create policy p_loc_read on locations for select using (can_see_client(client_id));
drop policy if exists p_loc_write on locations;
create policy p_loc_write on locations for all using (is_staff() and can_see_client(client_id))
  with check (is_staff() and can_see_client(client_id));

-- الأجهزة: الفني يضيف، المشرف يعدّل ويحذف
drop policy if exists p_assets_read on assets;
create policy p_assets_read on assets for select using (can_see_client(client_id));
drop policy if exists p_assets_insert on assets;
create policy p_assets_insert on assets for insert
  with check (is_staff() and can_see_client(client_id));
drop policy if exists p_assets_update on assets;
create policy p_assets_update on assets for update
  using (my_role() = 'supervisor' and can_see_client(client_id));
drop policy if exists p_assets_delete on assets;
create policy p_assets_delete on assets for delete
  using (my_role() = 'supervisor' and can_see_client(client_id));

-- العقود
drop policy if exists p_contracts_read on contracts;
create policy p_contracts_read on contracts for select using (can_see_client(client_id));
drop policy if exists p_contracts_write on contracts;
create policy p_contracts_write on contracts for all
  using (my_role() = 'supervisor' and can_see_client(client_id))
  with check (my_role() = 'supervisor' and can_see_client(client_id));

-- الزيارات: العميل لا يرى إلا المعتمدة
drop policy if exists p_visits_read on visits;
create policy p_visits_read on visits for select using (
  (is_staff() and can_see_client(client_id))
  or (my_role() = 'client' and client_id = my_client() and status = 'approved')
);
drop policy if exists p_visits_insert on visits;
create policy p_visits_insert on visits for insert
  with check (is_staff() and can_see_client(client_id));
drop policy if exists p_visits_update on visits;
create policy p_visits_update on visits for update using (
  (my_role() = 'supervisor' and can_see_client(client_id))
  or (my_role() = 'technician' and technician_id = auth.uid() and status in ('draft','rejected'))
);
drop policy if exists p_visits_delete on visits;
create policy p_visits_delete on visits for delete
  using (my_role() = 'supervisor' and can_see_client(client_id));

-- بنود الزيارة
drop policy if exists p_items_read on visit_items;
create policy p_items_read on visit_items for select using (
  exists (select 1 from visits v where v.id = visit_id and (
    (is_staff() and can_see_client(v.client_id))
    or (my_role() = 'client' and v.client_id = my_client() and v.status = 'approved')))
);
drop policy if exists p_items_write on visit_items;
create policy p_items_write on visit_items for all using (
  exists (select 1 from visits v where v.id = visit_id and is_staff() and can_see_client(v.client_id)
          and (my_role() = 'supervisor' or v.status in ('draft','rejected')))
) with check (
  exists (select 1 from visits v where v.id = visit_id and is_staff() and can_see_client(v.client_id)
          and (my_role() = 'supervisor' or v.status in ('draft','rejected')))
);

-- الصور
drop policy if exists p_photos_read on photos;
create policy p_photos_read on photos for select using (
  exists (select 1 from visit_items i join visits v on v.id = i.visit_id
          where i.id = visit_item_id and (
            (is_staff() and can_see_client(v.client_id))
            or (my_role() = 'client' and v.client_id = my_client() and v.status = 'approved')))
);
drop policy if exists p_photos_write on photos;
create policy p_photos_write on photos for all using (
  exists (select 1 from visit_items i join visits v on v.id = i.visit_id
          where i.id = visit_item_id and is_staff() and can_see_client(v.client_id))
) with check (
  exists (select 1 from visit_items i join visits v on v.id = i.visit_id
          where i.id = visit_item_id and is_staff() and can_see_client(v.client_id))
);

-- ---------- ٤. تخزين الصور ----------
-- أنشئ في Supabase ← Storage ← New bucket باسم: visit-photos  واجعله Public
-- ثم شغّل السياسات التالية:

insert into storage.buckets (id, name, public)
values ('visit-photos','visit-photos', true)
on conflict (id) do nothing;

drop policy if exists p_storage_read on storage.objects;
create policy p_storage_read on storage.objects for select
  using (bucket_id = 'visit-photos');

drop policy if exists p_storage_write on storage.objects;
create policy p_storage_write on storage.objects for insert to authenticated
  with check (bucket_id = 'visit-photos');

-- ---------- ٥. إنشاء أول حساب مشرف ----------
-- ١) Authentication ← Users ← Add user  (بريدك وكلمة مرور)
-- ٢) انسخ الـ UUID الظاهر، وشغّل السطر التالي بعد وضعه مكان PASTE_UUID:
--
-- insert into profiles (id, full_name, role, branch)
-- values ('PASTE_UUID', 'مروان صالح ناصر', 'supervisor', 'جدة');
--
-- كرّر الخطوتين لكل فني، مع role = 'technician'
-- ولحساب العميل: role = 'client' و client_id = معرّف العميل، وbranch فارغ
