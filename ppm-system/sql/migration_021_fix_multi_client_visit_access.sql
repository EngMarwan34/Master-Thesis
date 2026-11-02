-- =====================================================================
-- ترقية ٢١: إصلاح — حساب العميل متعدد المنشآت (عبر client_access) لم يكن
-- يرى سجل الزيارات ولا حالة الأجهزة ولا الصور، رغم أنه يرى أسماء الأجهزة.
-- السبب: صلاحيات القراءة على visits/visit_items/photos كانت تتحقق من
-- المساواة المباشرة (client_id = my_client()) بدل can_see_client()، وهذه
-- الأخيرة فقط هي التي تَعرف جدول client_access الجديد.
-- آمنة للرجوع: تعيد تعريف نفس الصلاحيات والدوال بشرط أوسع فقط، لا حذف
-- ولا تعديل على بيانات موجودة. شغّلها بعد migration_020.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- ١. الزيارات: العميل يرى المعتمدة من أي منشأة يصل إليها (قديمة أو
--    عبر client_access)، بدل منشأته الوحيدة فقط.
-- ---------------------------------------------------------------------
drop policy if exists p_visits_read on visits;
create policy p_visits_read on visits for select using (
  (is_staff() and can_see_client(client_id))
  or (my_role() = 'client' and can_see_client(client_id) and status = 'approved')
);

-- ---------------------------------------------------------------------
-- ٢. بنود الزيارة (حالة كل جهاز) — نفس الإصلاح.
-- ---------------------------------------------------------------------
drop policy if exists p_items_read on visit_items;
create policy p_items_read on visit_items for select using (
  exists (select 1 from visits v where v.id = visit_id and (
    (is_staff() and can_see_client(v.client_id))
    or (my_role() = 'client' and can_see_client(v.client_id) and v.status = 'approved')))
);

-- ---------------------------------------------------------------------
-- ٣. الصور — نفس الإصلاح.
-- ---------------------------------------------------------------------
drop policy if exists p_photos_read on photos;
create policy p_photos_read on photos for select using (
  exists (select 1 from visit_items i join visits v on v.id = i.visit_id
          where i.id = visit_item_id and (
            (is_staff() and can_see_client(v.client_id))
            or (my_role() = 'client' and can_see_client(v.client_id) and v.status = 'approved')))
);

-- ---------------------------------------------------------------------
-- ٤. دالة فريق الزيارة (تستخدمها صفحة التقرير) — نفس الإصلاح.
-- ---------------------------------------------------------------------
create or replace function visit_team(p_visit_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare v visits%rowtype; result jsonb;
begin
  select * into v from visits where id=p_visit_id;
  if v.id is null or not ((is_staff() and can_see_client(v.client_id)) or
    (my_role()='client' and can_see_client(v.client_id) and v.status='approved')) then raise exception 'Visit access denied'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('technician_id',p.id,'full_name',p.full_name,
      'full_name_en',p.full_name_en,'full_name_en_auto',p.full_name_en_auto) order by p.full_name),'[]'::jsonb)
    into result from profiles p where p.id=v.technician_id or exists (
      select 1 from visit_technicians t where t.visit_id=v.id and t.technician_id=p.id);
  return result;
end $$;

-- ---------------------------------------------------------------------
-- ٥. طلب صيانة طارئة من العميل — نفس الإصلاح على التحقق من ملكية الجهاز.
-- ---------------------------------------------------------------------
create or replace function request_emergency_visit(p_asset_id uuid, p_note text) returns uuid
language plpgsql security definer set search_path = public as $$
declare a assets%rowtype; new_id uuid;
begin
  if my_role() <> 'client' then raise exception 'Client access required'; end if;
  select * into a from assets where id = p_asset_id;
  if a.id is null or not can_see_client(a.client_id) then
    raise exception 'Asset not found';
  end if;
  insert into visits(client_id, target_asset_id, visit_type, general_notes, status)
    values (a.client_id, p_asset_id, 'emergency', nullif(trim(p_note),''), 'draft')
    returning id into new_id;
  return new_id;
end $$;
revoke all on function request_emergency_visit(uuid,text) from public;
grant execute on function request_emergency_visit(uuid,text) to authenticated;

commit;
