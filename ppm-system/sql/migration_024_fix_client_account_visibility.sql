-- =====================================================================
-- ترقية ٢٤: إصلاح — حسابات بوابة العملاء (manage-clients) كانت تُنشأ
-- وتعمل بشكل صحيح للعميل نفسه، لكنها لا تظهر إطلاقاً للمشرف في
-- الإعدادات. السبب: صلاحية قراءة profiles تشترط أن يطابق عمود
-- branch فرع المشرف، وحسابات العملاء لا تحمل فرعاً أصلاً (تعتمد على
-- client_id/client_access بدلاً منه) — فكانت تُستبعد دائماً.
-- الإصلاح: يرى المشرف حساب عميل فقط إذا كانت إحدى منشآته (القديمة عبر
-- client_id أو عبر client_access) تتبع فرعه فعلاً — بنفس منطق can_see_client
-- المستخدم بكل مكان آخر. آمنة للرجوع: توسيع شرط فقط.
-- شغّلها بعد migration_023.
-- =====================================================================
begin;

drop policy if exists p_profiles_self on profiles;
create policy p_profiles_self on profiles for select using (
  id=auth.uid() or
  (my_role()='supervisor' and branch=my_branch()) or
  (my_role()='technician' and role='technician' and branch=my_branch() and active) or
  (my_role()='supervisor' and role='client' and (
    (client_id is not null and can_see_client(client_id))
    or exists(select 1 from client_access ca where ca.profile_id=profiles.id and can_see_client(ca.client_id))
  ))
);

commit;
