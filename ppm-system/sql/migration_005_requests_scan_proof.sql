-- =====================================================================
-- ترقية ٥: طلبات الصيانة من العميل عبر مسح الملصق + إثبات المسح في الموقع
-- شغّلها مرة واحدة في SQL Editor (بعد migration_004). آمنة على بيانات قائمة.
-- =====================================================================

-- ---------- ١. إثبات حضور الفني: هل فُحص الجهاز بمسح ملصقه؟ ----------
alter table visit_items add column if not exists scanned    boolean not null default false;
alter table visit_items add column if not exists scanned_at timestamptz;

-- ---------- ٢. طلبات الصيانة من العميل ----------
create table if not exists service_requests (
  id              uuid primary key default gen_random_uuid(),
  asset_id        uuid not null references assets(id) on delete cascade,
  client_id       uuid not null references clients(id) on delete cascade,
  requester_name  text,
  requester_phone text,
  description     text not null,
  photo_url       text,
  status          text not null default 'new' check (status in ('new','assigned','closed')),
  visit_id        uuid references visits(id) on delete set null,   -- الزيارة الطارئة المُنشأة له
  created_by      uuid,                                             -- null = بلا حساب (مسح عام)
  created_at      timestamptz default now()
);
create index if not exists service_requests_status_idx on service_requests(client_id, status);
create index if not exists service_requests_asset_idx  on service_requests(asset_id, created_at);

alter table service_requests enable row level security;

-- القراءة: موظفو الفرع، أو حساب العميل نفسه (يرى طلباته)
drop policy if exists p_req_read on service_requests;
create policy p_req_read on service_requests for select using (
  (is_staff() and can_see_client(client_id))
  or (my_role() = 'client' and client_id = my_client())
);
-- التعديل والحذف: المشرف فقط ضمن فرعه
drop policy if exists p_req_update on service_requests;
create policy p_req_update on service_requests for update
  using (my_role() = 'supervisor' and can_see_client(client_id))
  with check (my_role() = 'supervisor' and can_see_client(client_id));
drop policy if exists p_req_delete on service_requests;
create policy p_req_delete on service_requests for delete
  using (my_role() = 'supervisor' and can_see_client(client_id));
-- لا توجد سياسة INSERT عمداً: الإضافة فقط عبر الدالة submit_service_request أدناه

-- معلومات محدودة جداً عن الجهاز لمن يمسح الملصق بلا حساب
-- (اسم الجهاز ورقمه واسم العميل فقط — لا سجل ولا صور ولا بيانات أخرى)
create or replace function public_asset_info(p_code text)
returns table(asset_no text, name_ar text, name_en text, location_text text,
              client_name_ar text, client_name_en text) as $$
  select a.asset_no, a.name_ar, a.name_en, a.location_text, c.name_ar, c.name_en
  from assets a join clients c on c.id = a.client_id
  where a.qr_code = p_code and a.active
  limit 1;
$$ language sql stable security definer;
grant execute on function public_asset_info(text) to anon, authenticated;

-- إنشاء طلب صيانة (بحساب أو بدون) مع تحقق وحدّ للتكرار
create or replace function submit_service_request(
  p_code text, p_name text, p_phone text, p_description text, p_photo_url text
) returns uuid as $$
declare a record; rid uuid;
begin
  select id, client_id into a from assets where qr_code = p_code and active limit 1;
  if a.id is null then raise exception 'unknown_code'; end if;

  if p_description is null or length(trim(p_description)) < 3 then raise exception 'description_required'; end if;
  if length(p_description) > 1500 or length(coalesce(p_name,'')) > 120
     or length(coalesce(p_phone,'')) > 30 then raise exception 'too_long'; end if;
  if p_photo_url is not null
     and p_photo_url not like '%/storage/v1/object/public/visit-photos/requests/%' then
    raise exception 'bad_photo';
  end if;

  -- حدّ للإساءة: 5 طلبات كحد أقصى لنفس الجهاز خلال ساعة
  if (select count(*) from service_requests
      where asset_id = a.id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too_many_requests';
  end if;

  insert into service_requests(asset_id, client_id, requester_name, requester_phone,
                               description, photo_url, created_by)
  values (a.id, a.client_id, nullif(trim(p_name),''), nullif(trim(p_phone),''),
          trim(p_description), p_photo_url, auth.uid())
  returning id into rid;
  return rid;
end; $$ language plpgsql security definer;
grant execute on function submit_service_request(text,text,text,text,text) to anon, authenticated;

-- صورة العطل: يُسمح لمن ليس له حساب برفع صور فقط داخل مجلد requests/
drop policy if exists p_storage_anon_requests on storage.objects;
create policy p_storage_anon_requests on storage.objects for insert to anon
  with check (bucket_id = 'visit-photos'
              and (storage.foldername(name))[1] = 'requests'
              and lower(storage.extension(name)) in ('jpg','jpeg','png','webp'));

-- عند اعتماد الزيارة الطارئة المرتبطة بطلب → يُغلق الطلب تلقائياً
create or replace function close_request_on_approve() returns trigger as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update service_requests set status = 'closed' where visit_id = new.id;
  end if;
  return new;
end; $$ language plpgsql security definer;

drop trigger if exists trg_close_request on visits;
create trigger trg_close_request after update on visits
  for each row execute function close_request_on_approve();
