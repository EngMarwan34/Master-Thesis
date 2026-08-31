-- =====================================================================
-- تزويد حسابَي الفنيين: مصطفى بسطاوي + علي عدنان
-- =====================================================================
-- الخطوات (لكل فني):
-- ١) Supabase ← Authentication ← Users ← Add user
--      مصطفى بسطاوي  → marwan12142@gmail.com  (ضع أي كلمة مرور تجريبية)
--      علي عدنان     → marwan432144@gmail.com (ضع أي كلمة مرور تجريبية)
-- ٢) بعد إنشاء كل مستخدم، انسخ الـ UUID الظاهر بجانب بريده في القائمة،
--    والصقه أدناه مكان PASTE_UUID_HERE_1 / PASTE_UUID_HERE_2.
-- ٣) عدّل "الفرع" إن اختلف عن "جدة"، ثم شغّل الملف كاملاً في SQL Editor.
-- =====================================================================

-- مصطفى بسطاوي — marwan12142@gmail.com
insert into profiles (id, full_name, role, branch)
values ('PASTE_UUID_HERE_1', 'مصطفى بسطاوي', 'technician', 'جدة');

-- علي عدنان — marwan432144@gmail.com
insert into profiles (id, full_name, role, branch)
values ('PASTE_UUID_HERE_2', 'علي عدنان', 'technician', 'جدة');

-- تحقق:
-- select id, full_name, role, branch, active from profiles where role = 'technician';
