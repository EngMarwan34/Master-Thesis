-- =====================================================================
-- نسخة احتياطية يدوية كاملة من بيانات النظام
-- شغّله بـ Supabase SQL Editor، ثم اضغط "Download CSV" فوق النتيجة
-- واحفظ الملف بمكان آمن (Google Drive، بريدك الإلكتروني، جهازك).
-- يُنصح تكراره أسبوعياً على الأقل.
-- =====================================================================

select
  (select coalesce(jsonb_agg(t), '[]') from clients t) as clients,
  (select coalesce(jsonb_agg(t), '[]') from assets t) as assets,
  (select coalesce(jsonb_agg(t), '[]') from contracts t) as contracts,
  (select coalesce(jsonb_agg(t), '[]') from scheduled_visits t) as scheduled_visits,
  (select coalesce(jsonb_agg(t), '[]') from scheduled_visit_technicians t) as scheduled_visit_technicians,
  (select coalesce(jsonb_agg(t), '[]') from visits t) as visits,
  (select coalesce(jsonb_agg(t), '[]') from visit_technicians t) as visit_technicians,
  (select coalesce(jsonb_agg(t), '[]') from visit_items t) as visit_items,
  (select coalesce(jsonb_agg(t), '[]') from photos t) as photos,
  (select coalesce(jsonb_agg(t), '[]') from fault_resolutions t) as fault_resolutions,
  (select coalesce(jsonb_agg(t), '[]') from profiles t) as profiles,
  (select coalesce(jsonb_agg(t), '[]') from branch_settings t) as branch_settings,
  (select coalesce(jsonb_agg(t), '[]') from notifications t) as notifications;
