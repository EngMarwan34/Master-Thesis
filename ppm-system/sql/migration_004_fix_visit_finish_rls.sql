-- =====================================================================
-- ترقية ٤: إصلاح خطأ "new row violates row-level security policy for
-- table visits" عند ضغط الفني "إنهاء الزيارة/الطلب"
-- =====================================================================
-- السبب: سياسة p_visits_update لم تُحدِّد WITH CHECK منفصلاً، فاستخدم
-- Postgres شرط USING نفسه للتحقق من الصف بعد التعديل أيضاً. وبما أن ذلك
-- الشرط يشترط أن تكون حالة الزيارة "draft" أو "rejected" لسماح الفني
-- بالتعديل، وإنهاء الزيارة يغيّر الحالة إلى "submitted" — يتناقض الشرط مع
-- نفسه ويُرفض التحديث دائماً. الإصلاح: تحقّق من الحالة القديمة فقط via
-- USING (يحدّد أي الصفوف يقدر الفني يبدأ تعديلها)، وWITH CHECK منفصل لا
-- يشترط الحالة (فقط إنه ما زال فنيها المكلَّف)، فيسمح بالانتقال لأي حالة.
-- =====================================================================

drop policy if exists p_visits_update on visits;
create policy p_visits_update on visits for update
  using (
    (my_role() = 'supervisor' and can_see_client(client_id))
    or (my_role() = 'technician' and technician_id = auth.uid() and status in ('draft','rejected'))
  )
  with check (
    (my_role() = 'supervisor' and can_see_client(client_id))
    or (my_role() = 'technician' and technician_id = auth.uid())
  );
