-- =====================================================================
-- ترقية ٣: صيانة وقائية/طارئة + صلاحيات حذف/تعديل
-- شغّلها مرة واحدة في SQL Editor (بعد schema.sql و migration_002)
-- =====================================================================

-- نوع الزيارة: وقائية (فحص شامل لكل الأجهزة) أو طارئة (جهاز واحد محدَّد يُكلَّف
-- به فني بعينه). target_asset_id يُستخدم فقط في الزيارات الطارئة.
alter table visits add column if not exists visit_type text not null default 'preventive'
  check (visit_type in ('preventive','emergency'));
alter table visits add column if not exists target_asset_id uuid references assets(id) on delete set null;

create index if not exists visits_technician_open_idx on visits(technician_id, status);

-- ---------------------------------------------------------------------
-- ملاحظة مهمة: صلاحيات الحذف/التعديل على العملاء والأجهزة والزيارات
-- كانت موجودة أصلاً في سياسات RLS من schema.sql (p_clients_write،
-- p_assets_update/delete، p_visits_delete — كلها "supervisor" فقط ضمن
-- فرعه). هذه الترقية لا تغيّر الصلاحيات، فقط تضيف عمودَي نوع الزيارة
-- والجهاز المستهدف. القيود اللي كانت تظهر بالواجهة ("ما اقدر أحذف/أعدّل")
-- كانت غياب أزرار في الواجهة نفسها فقط، لا نقصاً في صلاحيات القاعدة.
-- =====================================================================
