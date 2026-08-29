-- =====================================================================
-- تزويد حسابَي الفنيين: مصطفى بسطاوي + علي عدنان
-- =====================================================================
-- الخطوات (لكل فني):
-- ١) Supabase ← Authentication ← Users ← Add user
--    أدخل بريده الإلكتروني وكلمة مرور مبدئية، ثم انسخ الـ UUID الظاهر
--    بجانب اسمه في القائمة.
-- ٢) استبدل PASTE_UUID_HERE أدناه بذلك الـ UUID، وعدّل "الفرع" إن لزم،
--    ثم شغّل السطرين في Supabase ← SQL Editor.
-- =====================================================================

insert into profiles (id, full_name, role, branch)
values ('PASTE_UUID_HERE_1', 'مصطفى بسطاوي', 'technician', 'جدة');

insert into profiles (id, full_name, role, branch)
values ('PASTE_UUID_HERE_2', 'علي عدنان', 'technician', 'جدة');

-- تحقق:
-- select id, full_name, role, branch, active from profiles where role = 'technician';
