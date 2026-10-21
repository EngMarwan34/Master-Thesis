-- شغّل هذا الاستعلام في Supabase SQL Editor، ثم اضغط زر "Download CSV"
-- (يظهر أعلى يمين نتيجة الاستعلام) وأرسل لي الملف الناتج لأترجمه.

select a.id, c.name_ar as client, a.category, a.name_ar as device_name, a.location_text as location
from assets a
join clients c on c.id = a.client_id
where a.active = true
order by c.name_ar, a.asset_no;
