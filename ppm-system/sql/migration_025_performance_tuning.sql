-- =====================================================================
-- ترقية ٢٥: تحسينات أداء بحتة — لا تغيّر أي سلوك أو صلاحية، فقط أسرع.
--
-- ١. كل صلاحية (RLS policy) كانت تستدعي auth.uid() مباشرة، فيُعاد
--    تقييمها لكل صف على حدة في الاستعلامات الكبيرة. تغليفها بـ
--    (select auth.uid()) يجعل Postgres يحسبها مرة واحدة فقط للاستعلام
--    كله — نفس النتيجة بالضبط، فقط أسرع مع نمو عدد الصفوف.
-- ٢. ٢٢ عمود مفتاح أجنبي (foreign key) بلا فهرس مغطٍّ، ما يُبطئ أي
--    استعلام يربط عبرها (أهمها هنا: الصور بالبند، الزيارات بالعقد/
--    بالجهاز المستهدف، الفنيين بالزيارة المجدولة). إضافة فهرس لكل
--    واحد منها.
-- شغّلها بعد migration_024.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- ١. تغليف auth.uid() في الصلاحيات التسع التي أشار إليها فاحص الأداء.
-- ---------------------------------------------------------------------
drop policy if exists p_client_access_read on client_access;
create policy p_client_access_read on client_access for select using (
  profile_id = (select auth.uid()) or my_role() = 'supervisor'
);

drop policy if exists p_resolution_insert on fault_resolutions;
create policy p_resolution_insert on fault_resolutions for insert with check (
  my_role() = 'supervisor' and resolved_by = (select auth.uid()) and exists (
    select 1 from visit_items i join visits v on v.id = i.visit_id
    where i.id = fault_resolutions.visit_item_id
      and v.status = any (array['submitted','approved'])
      and can_see_client(v.client_id))
);

drop policy if exists p_notifications_select on notifications;
create policy p_notifications_select on notifications for select using (
  profile_id = (select auth.uid())
);
drop policy if exists p_notifications_update on notifications;
create policy p_notifications_update on notifications for update using (
  profile_id = (select auth.uid())
) with check (
  profile_id = (select auth.uid())
);

drop policy if exists own_preferences on user_preferences;
create policy own_preferences on user_preferences for all using (
  user_id = (select auth.uid()) and my_role() is not null
) with check (
  user_id = (select auth.uid()) and my_role() is not null
);

drop policy if exists comments_insert on visit_comments;
create policy comments_insert on visit_comments for insert with check (
  author_id = (select auth.uid()) and can_discuss_visit(visit_id)
);

drop policy if exists start_resets_read on visit_start_resets;
create policy start_resets_read on visit_start_resets for select using (
  is_staff() and can_see_client(client_id) and (my_role() = 'supervisor' or reset_by = (select auth.uid()))
);

drop policy if exists p_visits_insert on visits;
create policy p_visits_insert on visits for insert with check (
  can_see_client(client_id) and (my_role() = 'supervisor'
    or (my_role() = 'technician' and technician_id = (select auth.uid()) and status = 'draft'))
);

drop policy if exists p_profiles_self on profiles;
create policy p_profiles_self on profiles for select using (
  id = (select auth.uid()) or
  (my_role()='supervisor' and branch=my_branch()) or
  (my_role()='technician' and role='technician' and branch=my_branch() and active) or
  (my_role()='supervisor' and role='client' and (
    (client_id is not null and can_see_client(client_id))
    or exists(select 1 from client_access ca where ca.profile_id=profiles.id and can_see_client(ca.client_id))
  ))
);

-- ---------------------------------------------------------------------
-- ٢. فهارس للمفاتيح الأجنبية غير المفهرسة.
-- ---------------------------------------------------------------------
create index if not exists idx_assets_location_id on assets(location_id);
create index if not exists idx_client_access_client_id on client_access(client_id);
create index if not exists idx_contracts_client_id on contracts(client_id);
create index if not exists idx_fault_resolutions_resolved_by on fault_resolutions(resolved_by);
create index if not exists idx_inspection_checklists_recorded_by on inspection_checklists(recorded_by);
create index if not exists idx_locations_client_id on locations(client_id);
create index if not exists idx_photos_visit_item_id on photos(visit_item_id);
create index if not exists idx_profiles_client_id on profiles(client_id);
create index if not exists idx_removed_assets_removed_by on removed_assets(removed_by);
create index if not exists idx_schedule_changes_actor_id on schedule_changes(actor_id);
create index if not exists idx_scheduled_visit_technicians_technician_id on scheduled_visit_technicians(technician_id);
create index if not exists idx_scheduled_visits_external_recorded_by on scheduled_visits(external_recorded_by);
create index if not exists idx_scheduled_visits_technician_id on scheduled_visits(technician_id);
create index if not exists idx_service_requests_visit_id on service_requests(visit_id);
create index if not exists idx_visit_comments_author_id on visit_comments(author_id);
create index if not exists idx_visit_items_performed_by on visit_items(performed_by);
create index if not exists idx_visit_start_resets_reset_by on visit_start_resets(reset_by);
create index if not exists idx_visit_start_resets_scheduled_visit_id on visit_start_resets(scheduled_visit_id);
create index if not exists idx_visit_technicians_technician_id on visit_technicians(technician_id);
create index if not exists idx_visits_approved_by on visits(approved_by);
create index if not exists idx_visits_contract_id on visits(contract_id);
create index if not exists idx_visits_target_asset_id on visits(target_asset_id);

commit;
