-- =====================================================================
-- ترقية ٢ — نظام تقارير الصيانة الوقائية — شركة المحتسب
-- شغّل هذا الملف مرة واحدة في مشروع Supabase الحالي (SQL Editor ← New query)
-- آمن للتشغيل على قاعدة بيانات تحتوي بيانات فعلية — لا يحذف ولا يُعدّل شيئاً قائماً.
-- =====================================================================

-- رقم تذكرة الـCRM وعرض السعر المرفق (يُدخلان يدوياً من نظام CRM المعتمد بالشركة)
alter table visits add column if not exists crm_ticket_no text;
alter table visits add column if not exists quote_url text;

-- تحديث "الصورة المرجعية" لجهاز فقط (دون فتح صلاحية تعديل بقية بيانات الجهاز
-- للفني) — يستخدمها الفني أو المشرف لتأكيد هوية الجهاز عند الفحص الميداني
create or replace function set_asset_base_photo(p_asset_id uuid, p_photo_url text) returns void as $$
begin
  if not (is_staff() and exists (
    select 1 from assets a where a.id = p_asset_id and can_see_client(a.client_id)
  )) then
    raise exception 'not authorized';
  end if;
  update assets set base_photo_url = p_photo_url where id = p_asset_id;
end; $$ language plpgsql security definer;

grant execute on function set_asset_base_photo(uuid, text) to authenticated;
