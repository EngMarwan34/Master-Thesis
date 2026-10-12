-- =====================================================================
-- عميل جديد: مستشفى السلامة — مطبخ المستشفى (مشروع المرجان)
-- المصدر: KITCHEN EQUIPMENT SCHEDULE REV-02 (30/03/2023) — 217 بنداً
-- استُورد منها 66 بنداً = 77 جهازاً قابلاً للصيانة (كهربائي/ميكانيكي/تبريد).
-- البنود الثابتة التي لا تحتاج صيانة دورية لم تُضف (انظر القائمة في آخر الملف).
-- رقم الأصل = SLM- + رقم البند في الجدول (مع -1 / -2 للكميات المتعددة)
-- ليسهل الرجوع لجدول المقاول والمخططات.
-- آمن التكرار: تشغيله مرتين لا يُنشئ عميلاً أو أجهزة مكرّرة.
-- =====================================================================
-- ---------------------------------------------------------------------
-- بنود الجدول التي لم تُضف (ثابتة، لا تحتاج صيانة وقائية أو ملصق QR):
--   أحواض غسيل اليدين، أحواض وطاولات العمل، طاولات متحركة، الرفوف بأنواعها،
--   صناديق النفايات والمكونات، مصارف الأرضية (Floor gulley)، بكرات الخراطيم،
--   عربات GN وعربات الصواني/الأطباق/أدوات المائدة، موزعات الصواني والأطباق،
--   لوح تقطيع متحرك، واقيات العطس، كاونتر التقديم الثابت، Work Top On Open
--   Base، نظام توزيع الخدمات SDU، حوض المسح، والبنود "By others" و"Spare".
-- غير مشمولة بعقد الصيانة: الشفاطات (Ventilation canopy) وصواعق الحشرات.
-- بنود محل قرار (لم تُضف — أخبرني إن كانت ضمن عقد الصيانة لأضيفها):
--   موازين (1.02, 1.06, 5.06, 7.09, 9.11)، أنظمة إطفاء ANSUL R102
--   (17.10, 18.04, 19.14, 20.15 — تحتاج عادة مقاولاً معتمداً)،
--   Glass Ringer (21.15)، عربات الوجبات TTW/M (21.16, 21.22) إن كانت مسخّنة/مبرّدة.
-- =====================================================================

-- الفرع: يُضبط تلقائياً على فرع المشرف مروان (المشرف لا يرى إلا عملاء فرعه).
-- لو لم يُعثر عليه يُستخدم 'جدة'. لتغييره لاحقاً: update clients set branch='...' where id='e9c1a2b0-5555-4a2a-9b1a-000000000005';
insert into clients (id, name_ar, name_en, type, branch, city)
select 'e9c1a2b0-5555-4a2a-9b1a-000000000005', 'مستشفى السلامة', 'Al-Salama Hospital', 'مستشفى',
       coalesce((select branch from profiles where role = 'supervisor' and full_name like 'مروان%' and branch is not null limit 1), 'جدة'),
       'جدة'
on conflict (id) do update set branch = excluded.branch;

-- إن كان قد أُنشئ عميل "السلامة" يدوياً من التطبيق وهو فارغ (بلا أجهزة ولا زيارات)
-- يُحذف حتى لا يظهر عميلان بنفس الاسم
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
  ('SLM-17.01', 'ثلاجة قائمة بابين', '2 door upright refrigerator', 'تبريد', 'INFRICO', 'AGB 1402', 'المخبز / Bakery Area'),
  ('SLM-17.05', 'شواية بانيني', 'Panini grill', 'طبخ', 'Roller Grill', 'MAJESTIC', 'المخبز / Bakery Area'),
  ('SLM-17.07', 'موقد كهربائي 4 عيون', '4 burner electric range on open base', 'طبخ', 'SILKO', 'NECE94G', 'المخبز / Bakery Area'),
  ('SLM-17.08', 'فرن 3 أدوار مع مخمّر', '3-deck oven with proofer', 'طبخ', 'Pizza Master', 'PM 723ED + UBC 720 PROOFER', 'المخبز / Bakery Area'),
  ('SLM-17.11', 'عجانة 60 لتر', '60 L planetary mixer', 'طبخ', 'Varimixer', 'AR 60', 'المخبز / Bakery Area'),
  ('SLM-18.01', 'ثلاجة قائمة بابين', '2 door upright refrigerator', 'تبريد', 'INFRICO', 'AGB 1402', 'الحمية الخاصة / Special Diet Area'),
  ('SLM-18.02', 'موقد كهربائي 4 عيون', '4 burner electric range on open base', 'طبخ', 'SILKO', 'NECE94G', 'الحمية الخاصة / Special Diet Area'),
  ('SLM-18.06', 'عجانة 10 لتر', '10 L mixer', 'طبخ', 'Varimixer', 'CR10', 'الحمية الخاصة / Special Diet Area'),
  ('SLM-19.09-1', 'قدر غلي كهربائي 100 لتر (رقم 1)', 'Electric indirect heated boiling pan 100 L No-1', 'طبخ', 'SILKO', 'NEPE9I10', 'الطبخ بالجملة / Bulk Cooking Area'),
  ('SLM-19.09-2', 'قدر غلي كهربائي 100 لتر (رقم 2)', 'Electric indirect heated boiling pan 100 L No-2', 'طبخ', 'SILKO', 'NEPE9I10', 'الطبخ بالجملة / Bulk Cooking Area'),
  ('SLM-19.11', 'قلاية إمالة (برات بان) 100 لتر', 'Bratt pan 100 L', 'طبخ', 'Firex', 'BR9E0901', 'الطبخ بالجملة / Bulk Cooking Area'),
  ('SLM-20.02', 'محضرة طعام', 'Food processor', 'طبخ', 'Robot Coupe', 'R752', 'الطبخ الساخن / Hot Cooking Area'),
  ('SLM-20.09-1', 'فرن كومبي 20 صينية (رقم 1)', 'Combination oven 20 x 1/1 GN No-1', 'طبخ', 'Rational', 'iCombi Classic 20-1/1', 'الطبخ الساخن / Hot Cooking Area'),
  ('SLM-20.09-2', 'فرن كومبي 20 صينية (رقم 2)', 'Combination oven 20 x 1/1 GN No-2', 'طبخ', 'Rational', 'iCombi Classic 20-1/1', 'الطبخ الساخن / Hot Cooking Area'),
  ('SLM-20.11-1', 'موقد كهربائي 4 عيون (رقم 1)', '4 burner electric range on open base No-1', 'طبخ', 'SILKO', 'NECE94G', 'الطبخ الساخن / Hot Cooking Area'),
  ('SLM-20.11-2', 'موقد كهربائي 4 عيون (رقم 2)', '4 burner electric range on open base No-2', 'طبخ', 'SILKO', 'NECE94G', 'الطبخ الساخن / Hot Cooking Area'),
  ('SLM-20.11-3', 'موقد كهربائي 4 عيون (رقم 3)', '4 burner electric range on open base No-3', 'طبخ', 'SILKO', 'NECE94G', 'الطبخ الساخن / Hot Cooking Area'),
  ('SLM-20.11-4', 'موقد كهربائي 4 عيون (رقم 4)', '4 burner electric range on open base No-4', 'طبخ', 'SILKO', 'NECE94G', 'الطبخ الساخن / Hot Cooking Area'),
  ('SLM-20.12-1', 'شواية كهربائية 80 سم (رقم 1)', 'Electric grill 80 cm on open base No-1', 'طبخ', 'SILKO', 'NEGVRE94G', 'الطبخ الساخن / Hot Cooking Area'),
  ('SLM-20.12-2', 'شواية كهربائية 80 سم (رقم 2)', 'Electric grill 80 cm on open base No-2', 'طبخ', 'SILKO', 'NEGVRE94G', 'الطبخ الساخن / Hot Cooking Area'),
  ('SLM-20.12F-1', 'صاج كهربائي (فراي توب) (رقم 1)', 'Electric fry top on open base No-1', 'طبخ', 'SILKO', 'NEBE94GMC', 'الطبخ الساخن / Hot Cooking Area'),
  ('SLM-20.12F-2', 'صاج كهربائي (فراي توب) (رقم 2)', 'Electric fry top on open base No-2', 'طبخ', 'SILKO', 'NEBE94GMC', 'الطبخ الساخن / Hot Cooking Area'),
  ('SLM-20.13-1', 'قلاية زيت كهربائية 2×22 لتر (رقم 1)', 'Electric deep fat fryer 2 x 22 L No-1', 'طبخ', 'SILKO', 'NEFE94222', 'الطبخ الساخن / Hot Cooking Area'),
  ('SLM-20.13-2', 'قلاية زيت كهربائية 2×22 لتر (رقم 2)', 'Electric deep fat fryer 2 x 22 L No-2', 'طبخ', 'SILKO', 'NEFE94222', 'الطبخ الساخن / Hot Cooking Area'),
  ('SLM-21.02', 'موقد حثي (إندكشن)', 'Induction hob', 'طبخ', 'HATCO', 'IRNG-PC1-30', 'تجميع الوجبات / Meal Assembly'),
  ('SLM-21.07-1', 'طاولة طعام ساخن (رقم 1)', 'Hot food table No-1', 'طبخ', 'HUPFER', 'SPA EB-4', 'تجميع الوجبات / Meal Assembly'),
  ('SLM-21.07-2', 'طاولة طعام ساخن (رقم 2)', 'Hot food table No-2', 'طبخ', 'HUPFER', 'SPA EB-4', 'تجميع الوجبات / Meal Assembly'),
  ('SLM-21.07-3', 'طاولة طعام ساخن (رقم 3)', 'Hot food table No-3', 'طبخ', 'HUPFER', 'SPA EB-4', 'تجميع الوجبات / Meal Assembly'),
  ('SLM-21.09', 'ثلاجة قائمة بابين', '2 door upright refrigerator', 'تبريد', 'INFRICO', 'AGB 1402', 'تجميع الوجبات / Meal Assembly'),
  ('SLM-21.10', 'محمصة سير', 'Conveyor toaster', 'طبخ', 'HATCO', 'TQ-10', 'تجميع الوجبات / Meal Assembly'),
  ('SLM-21.12', 'غلاية ماء (موزع ماء ساخن)', 'Water dispenser / boiler', 'طبخ', 'Marco', 'Ecoboiler UC4', 'تجميع الوجبات / Meal Assembly'),
  ('SLM-21.14', 'مكينة قهوة أوتوماتيك', 'Fully automatic coffee machine', 'أخرى', 'WMF', '1500S', 'تجميع الوجبات / Meal Assembly'),
  ('SLM-21.19-1', 'ثلاجة ستارة هوائية (رقم 1)', 'Air curtain refrigerator No-1', 'تبريد', 'HUPFER', 'CoolMultiMobil', 'تجميع الوجبات / Meal Assembly'),
  ('SLM-21.19-2', 'ثلاجة ستارة هوائية (رقم 2)', 'Air curtain refrigerator No-2', 'تبريد', 'HUPFER', 'CoolMultiMobil', 'تجميع الوجبات / Meal Assembly'),
  ('SLM-21.23', 'سير توزيع الوجبات', 'Meal distribution conveyor belt', 'أخرى', 'HUPFER', 'spv/g', 'تجميع الوجبات / Meal Assembly'),
  ('SLM-23.04', 'غسالة أطباق سير', 'Conveyor type dishwash machine', 'غسيل', 'MEIKO', 'UPster K-S 160 (L-R)', 'غسيل الأطباق / Dish Wash Area'),
  ('SLM-24.04', 'مبخر - غسيل العربات', 'Evaporator - Cart Wash', 'تبريد', 'Friga Bohn', 'Friga Bohn', 'غسيل العربات / Cart Wash'),
  ('SLM-24.05', 'كمبروسر - غسيل العربات', 'Compressor - Cart Wash', 'تبريد', 'Carrier/Bitzer', 'CUSTOM 1 hp', 'غسيل العربات / Cart Wash'),
  ('SLM-25.03', 'سطح تسخين زجاجي (كاونتر التقديم)', 'Glass-ceramic hob (servery)', 'طبخ', 'INFRICO', 'EEVC4', 'كاونتر التقديم / Servery Counter'),
  ('SLM-25.06', 'وحدة عرض مبردة مدمجة', 'Drop-in refrigerated display', 'تبريد', 'INFRICO', 'EEPF4', 'كاونتر التقديم / Servery Counter')
) as v(asset_no, name_ar, name_en, category, brand, model, location_text)
where not exists (select 1 from assets a where a.client_id = 'e9c1a2b0-5555-4a2a-9b1a-000000000005' and a.asset_no = v.asset_no);

-- الشفاطات وصواعق الحشرات غير مشمولة بعقد الصيانة — إن كان الملف شُغّل سابقاً
-- بنسخته الأولى، يحذف السطر التالي تلك الأجهزة (عميل جديد بلا زيارات بعد)
delete from assets where client_id = 'e9c1a2b0-5555-4a2a-9b1a-000000000005' and (asset_no like 'SLM-01.01%' or asset_no in
  ('SLM-03.01','SLM-05.01','SLM-09.12','SLM-12.09-1','SLM-12.09-2','SLM-16.02','SLM-19.01-1','SLM-19.01-2',
   'SLM-17.09','SLM-18.03','SLM-19.13','SLM-20.14','SLM-23.05'));

-- النتيجة (تظهر أسفل محرر SQL): اسم العميل، الفرع، وعدد الأجهزة (المتوقع 77)
select c.name_ar as "العميل", c.branch as "الفرع", count(a.id) as "عدد الأجهزة"
from clients c left join assets a on a.client_id = c.id
where c.id = 'e9c1a2b0-5555-4a2a-9b1a-000000000005'
group by c.name_ar, c.branch;

