-- مستشفى السلامة — الجزء 1 من 2 (العميل + أول 38 جهازاً). شغّله ثم شغّل الجزء 2.
insert into clients (id, name_ar, name_en, type, branch, city)
select 'e9c1a2b0-5555-4a2a-9b1a-000000000005', 'مستشفى السلامة', 'Al-Salama Hospital', 'مستشفى',
       coalesce((select branch from profiles where role = 'supervisor' and full_name like 'مروان%' and branch is not null limit 1), 'جدة'),
       'جدة'
on conflict (id) do update set branch = excluded.branch;
delete from clients c
where c.id <> 'e9c1a2b0-5555-4a2a-9b1a-000000000005' and c.name_ar like '%السلامة%'
  and not exists (select 1 from assets a where a.client_id = c.id)
  and not exists (select 1 from visits v where v.client_id = c.id);

insert into assets (client_id, asset_no, name_ar, name_en, category, brand, model, location_text)
select 'e9c1a2b0-5555-4a2a-9b1a-000000000005', v.asset_no, v.name_ar, v.name_en, v.category, v.brand, v.model, v.location_text
from (values
  ('SLM-03.02', 'غرفة تبريد - الثلاجة العامة', 'Modular cold room - General Chiller', 'تبريد', 'HRCO', 'CUSTOM', 'ثلاجة عامة / General Chiller'),
  ('SLM-03.03', 'مبخر - الثلاجة العامة', 'Evaporator - General Chiller', 'تبريد', 'Friga Bohn', 'Part of cold room', 'ثلاجة عامة / General Chiller'),
  ('SLM-03.04', 'كمبروسر - الثلاجة العامة', 'Compressor - General Chiller', 'تبريد', 'Carrier/Bitzer', 'Part of cold room', 'ثلاجة عامة / General Chiller'),
  ('SLM-04.01', 'غرفة تجميد - الفريزر العام', 'Modular cold room - General Freezer', 'تبريد', 'HRCO', 'CUSTOM', 'فريزر عام / General Freezer'),
  ('SLM-04.02', 'مبخر - الفريزر العام', 'Evaporator - General Freezer', 'تبريد', 'Friga Bohn', 'Part of cold room', 'فريزر عام / General Freezer'),
  ('SLM-04.03', 'كمبروسر - الفريزر العام', 'Compressor - General Freezer', 'تبريد', 'Carrier/Bitzer', 'Part of cold room', 'فريزر عام / General Freezer'),
  ('SLM-05.05', 'معقم سكاكين', 'Knife sterilizer', 'أخرى', 'Tournus', '816 422', 'تحضير الخضار / Veg Prep Area'),
  ('SLM-05.08', 'قطاعة عمودية أرضية', 'Floor standing vertical cutter', 'أخرى', 'Robot Coupe', 'R60', 'تحضير الخضار / Veg Prep Area'),
  ('SLM-05.09', 'كاونتر مبرد بابين', '2 door refrigerated counter', 'تبريد', 'INFRICO', 'BMGN 1470 II', 'تحضير الخضار / Veg Prep Area'),
  ('SLM-05.12', 'محضرة خضار طاولة', 'Table top veg processor', 'أخرى', 'Robot Coupe', 'R301 Ultra', 'تحضير الخضار / Veg Prep Area'),
  ('SLM-06.01', 'غرفة تبريد - ثلاجة الخضار', 'Modular cold room - Veg Chiller', 'تبريد', 'HRCO', 'CUSTOM', 'ثلاجة الخضار / Veg Chiller'),
  ('SLM-06.02', 'مبخر - ثلاجة الخضار', 'Evaporator - Veg Chiller', 'تبريد', 'Friga Bohn', 'Part of cold room', 'ثلاجة الخضار / Veg Chiller'),
  ('SLM-06.03', 'كمبروسر - ثلاجة الخضار', 'Compressor - Veg Chiller', 'تبريد', 'Carrier/Bitzer', 'Part of cold room', 'ثلاجة الخضار / Veg Chiller'),
  ('SLM-07.08', 'كاونتر مبرد بابين', '2 door refrigerated counter', 'تبريد', 'INFRICO', 'BMGN 1470 II', 'المطبخ البارد / Cold Kitchen'),
  ('SLM-07.11', 'خلاط طاولة', 'Table top mixer', 'أخرى', 'Robot Coupe', 'R10 E', 'المطبخ البارد / Cold Kitchen'),
  ('SLM-08.01', 'غرفة تبريد - ثلاجة المطبخ البارد', 'Modular cold room - Cold Chiller', 'تبريد', 'HRCO', 'CUSTOM', 'ثلاجة المطبخ البارد / Cold Chiller'),
  ('SLM-08.02', 'مبخر - ثلاجة المطبخ البارد', 'Evaporator - Cold Chiller', 'تبريد', 'Friga Bohn', 'Part of cold room', 'ثلاجة المطبخ البارد / Cold Chiller'),
  ('SLM-08.03', 'كمبروسر - ثلاجة المطبخ البارد', 'Compressor - Cold Chiller', 'تبريد', 'Carrier/Bitzer', 'Part of cold room', 'ثلاجة المطبخ البارد / Cold Chiller'),
  ('SLM-09.04', 'منشار لحوم أرضي', 'Floor standing band saw', 'أخرى', 'SAP Italy', 'SM183', 'تحضير اللحوم / Meat Prep Area'),
  ('SLM-09.06', 'كاونتر مبرد 3 أبواب', '3 door refrigerated counter', 'تبريد', 'INFRICO', 'BMGN 1960 II', 'تحضير اللحوم / Meat Prep Area'),
  ('SLM-09.07', 'فرامة لحم طاولة', 'Table top meat mincer', 'أخرى', 'SAP Italy', 'TC22', 'تحضير اللحوم / Meat Prep Area'),
  ('SLM-09.09', 'معقم سكاكين', 'Knife sterilizer', 'أخرى', 'Tournus', '816 422', 'تحضير اللحوم / Meat Prep Area'),
  ('SLM-09.10', 'جهاز تغليف بالتفريغ', 'Vacuum packer', 'أخرى', 'Henkelman', 'Boxer 42', 'تحضير اللحوم / Meat Prep Area'),
  ('SLM-10.01', 'غرفة تبريد - ثلاجة اللحوم', 'Modular cold room - Meat Chiller', 'تبريد', 'HRCO', 'CUSTOM', 'ثلاجة اللحوم / Meat Chiller'),
  ('SLM-10.02', 'مبخر - ثلاجة اللحوم', 'Evaporator - Meat Chiller', 'تبريد', 'Friga Bohn', 'Part of cold room', 'ثلاجة اللحوم / Meat Chiller'),
  ('SLM-10.03', 'كمبروسر - ثلاجة اللحوم', 'Compressor - Meat Chiller', 'تبريد', 'Carrier/Bitzer', 'Part of cold room', 'ثلاجة اللحوم / Meat Chiller'),
  ('SLM-11.01', 'غرفة تجميد - فريزر اللحوم', 'Modular cold room - Meat Freezer', 'تبريد', 'HRCO', 'CUSTOM', 'فريزر اللحوم / Meat Freezer'),
  ('SLM-11.02', 'مبخر - فريزر اللحوم', 'Evaporator - Meat Freezer', 'تبريد', 'Friga Bohn', 'Part of cold room', 'فريزر اللحوم / Meat Freezer'),
  ('SLM-11.03', 'كمبروسر - فريزر اللحوم', 'Compressor - Meat Freezer', 'تبريد', 'Carrier/Bitzer', 'Part of cold room', 'فريزر اللحوم / Meat Freezer'),
  ('SLM-12.04', 'كاونتر مبرد 3 أبواب', '3 door refrigerated counter', 'تبريد', 'INFRICO', 'BMGN 1960 II', 'تحضير الأسماك / Fish Prep Area'),
  ('SLM-12.08', 'معقم سكاكين', 'Knife sterilizer', 'أخرى', 'Tournus', '816 422', 'تحضير الأسماك / Fish Prep Area'),
  ('SLM-13.01', 'غرفة تجميد - فريزر الأسماك', 'Modular cold room - Fish Freezer', 'تبريد', 'HRCO', 'CUSTOM', 'فريزر الأسماك / Fish Freezer'),
  ('SLM-13.02', 'مبخر - فريزر الأسماك', 'Evaporator - Fish Freezer', 'تبريد', 'Friga Bohn', 'Part of cold room', 'فريزر الأسماك / Fish Freezer'),
  ('SLM-13.03', 'كمبروسر - فريزر الأسماك', 'Compressor - Fish Freezer', 'تبريد', 'Carrier/Bitzer', 'Part of cold room', 'فريزر الأسماك / Fish Freezer'),
  ('SLM-14.01', 'غرفة تبريد - ثلاجة الأسماك', 'Modular cold room - Fish Chiller', 'تبريد', 'HRCO', 'CUSTOM', 'ثلاجة الأسماك / Fish Chiller'),
  ('SLM-14.02', 'مبخر - ثلاجة الأسماك', 'Evaporator - Fish Chiller', 'تبريد', 'Friga Bohn', 'Part of cold room', 'ثلاجة الأسماك / Fish Chiller'),
  ('SLM-14.03', 'كمبروسر - ثلاجة الأسماك', 'Compressor - Fish Chiller', 'تبريد', 'Carrier/Bitzer', 'Part of cold room', 'ثلاجة الأسماك / Fish Chiller'),
  ('SLM-17.01', 'ثلاجة قائمة بابين', '2 door upright refrigerator', 'تبريد', 'INFRICO', 'AGB 1402', 'المخبز / Bakery Area')
) as v(asset_no, name_ar, name_en, category, brand, model, location_text)
where not exists (select 1 from assets a where a.client_id = 'e9c1a2b0-5555-4a2a-9b1a-000000000005' and a.asset_no = v.asset_no);

select c.name_ar as "العميل", c.branch as "الفرع", count(a.id) as "عدد الأجهزة"
from clients c left join assets a on a.client_id = c.id
where c.id = 'e9c1a2b0-5555-4a2a-9b1a-000000000005'
group by c.name_ar, c.branch;
