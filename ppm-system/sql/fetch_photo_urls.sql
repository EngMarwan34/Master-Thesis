-- شغّل هذا الاستعلام في Supabase SQL Editor، ثم اضغط زر "Download CSV"
-- (يظهر أعلى يمين نتيجة الاستعلام) وارفع لي الملف الناتج لأنزّل كل الصور.

select url from photos
union all
select base_photo_url as url from assets where base_photo_url is not null;
