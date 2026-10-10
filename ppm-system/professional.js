/* Personal workspace, short inspections, internal discussion and report preview. */
const personalDefaults={language:'ar',theme:'system',density:'comfortable',notifications:true,report_language:'bilingual'};
let personal={...personalDefaults};
const tr=(ar,en)=>personal.language==='en'?en:ar;
const uiWords={
  'لوحة المتابعة':'Dashboard','جدولة الوقائية':'Preventive scheduling','الإعدادات':'Settings','تقاريري':'My reports',
  'مساحة العمل':'Workspace','إدارة الصيانة':'Maintenance management','مشرف فرع':'Branch supervisor','فني ميداني':'Field technician','حساب عميل':'Client account',
  'العملاء':'Clients','الأجهزة':'Equipment','الفنيون':'Technicians','الخطط والفرق':'Plans and teams','عام':'General',
  'رجوع':'Back','إغلاق':'Close','إلغاء':'Cancel','حفظ':'Save','تعديل':'Edit','فتح':'Open','متابعة':'Continue','مراجعة':'Review',
  'العميل':'Client','الجهاز':'Equipment','رقم الأصل':'Asset number','الحالة':'Condition','القطع المطلوبة':'Spare parts','المتابعة':'Follow-up',
  'اسم العميل':'Client name','اسم الجهاز':'Equipment name','الاسم بالإنجليزية':'English name','الماركة':'Brand','الموديل':'Model',
  'الرقم التسلسلي':'Serial number','الموقع':'Location','الفئة':'Category','المدينة':'City','نوع العميل':'Client type','هاتف التواصل':'Contact phone',
  'اسم مسؤول التواصل':'Contact person','الاسم الكامل':'Full name','الهاتف':'Phone','البريد الإلكتروني':'Email','كلمة المرور':'Password',
  'تسجيل الدخول':'Sign in','دخول':'Sign in','تسجيل الخروج':'Sign out','خروج':'Sign out','تغيير كلمة مروري':'Change my password',
  'كلمة المرور الجديدة':'New password','تأكيد كلمة المرور':'Confirm password','حفظ كلمة المرور':'Save password',
  'اسم المنشأة في مساحة العمل':'Workspace organization name','لون الواجهة':'Brand color','أزرق':'Blue','أخضر':'Teal','بنفسجي':'Purple',
  'الدورية الافتراضية للخطة الجديدة':'Default plan frequency','الفرع':'Branch','حفظ الإعدادات':'Save settings','هوية الفرع وتفضيلات المتابعة':'Branch preferences',
  'أمان حسابي':'Account security','مفعّل':'Active','موقوف':'Disabled','نشط':'Active','مؤرشف':'Archived','الحساب مفعّل':'Account enabled',
  'إضافة فني':'Add technician','+ إضافة فني':'+ Add technician','إضافة وإرسال الدعوة':'Invite by email','حفظ التعديلات':'Save changes',
  'تعديل الفني':'Edit technician','فنيّو الفرع':'Branch technicians','لا يوجد هاتف':'No phone','بيانات العملاء':'Client details',
  '+ إضافة عميل':'+ Add client','إضافة عميل':'Add client','عميل جديد':'New client','تعديل العميل':'Edit client','تعديل البيانات':'Edit details','حفظ العميل':'Save client',
  'الأجهزة والأصول':'Equipment and assets','تعديل بيانات الجهاز':'Edit equipment','حفظ الجهاز':'Save inspection',
  'البحث عن عميل':'Search clients','البحث عن جهاز':'Search equipment','ابحث عن عميل أو مدينة…':'Search clients or cities…',
  'اسم الجهاز، رقم الأصل أو العميل…':'Equipment, asset number or client…','لا توجد نتائج مطابقة.':'No matching results.',
  'لا يوجد عملاء بعد.':'No clients yet.','لا توجد أجهزة بعد.':'No equipment yet.','لا يوجد عملاء بعد':'No clients yet',
  'الصيانة تحت السيطرة':'Maintenance at a glance','وضوح أكبر. متابعة أسرع.':'Clarity for your maintenance team.',
  'راجع الزيارات، تابع الأعطال، وخطّط للخطوة التالية.':'Review visits, track faults and plan the next step.',
  'جدولة الزيارات':'Schedule visits','زيارة بانتظار اعتمادك':'Visits awaiting your approval','جهاز يحتاج تدخّلًا':'Equipment requiring action',
  'زيارة متأخرة لم تبدأ':'Overdue visits not started','زيارات بانتظار الاعتماد':'Visits awaiting approval','مهامي المفتوحة':'My open tasks',
  'لا توجد مهام مفتوحة حالياً.':'No open tasks.','لا توجد زيارات بانتظارك.':'No visits awaiting approval.',
  'أعطال مفتوحة · أحدث حالة لكل جهاز':'Open faults · latest equipment condition','سجل الإغلاق':'Closure history','تصدير Excel':'Export Excel',
  'إغلاق العطل':'Close fault','سجل إغلاق الأعطال':'Fault closure history','ما الإجراء الذي تم؟':'What action was taken?','تأكيد الإغلاق':'Confirm closure',
  'كل زيارة في موعدها':'Every visit on schedule','من الخطة إلى التنفيذ':'From planning to execution',
  'جدول الوقائية باسم العميل، كلّف فريق العمل، وسجّل الزيارات السابقة.':'Plan by client, assign the team and record past visits.',
  '+ خطة وقائية جديدة':'+ New preventive plan','خطة وقائية':'Preventive plan','جدول الزيارات':'Visit schedule','كل الزيارات':'All visits',
  'المتأخرة':'Overdue','القادمة والمستحقة':'Upcoming and due','المكتملة':'Completed','قادمة':'Upcoming','متأخرة':'Overdue','مستحقة اليوم':'Due today',
  'قيد التنفيذ':'In progress','أُعيدت للتعديل':'Returned for correction','بانتظار الاعتماد':'Awaiting approval','معتمدة':'Approved',
  'بدء الزيارة':'Start visit','فتح الزيارة':'Open visit','نُفّذت سابقًا':'Completed previously','مسجّلة خارج النظام':'Recorded outside the system',
  'مكلّفة لفني آخر':'Assigned to another technician','خطط العملاء وتقدم التنفيذ':'Client plans and progress','زيارات منفّذة':'Completed visits',
  'منتهي':'Ended','بدون دورية':'No frequency','بداية فترة الصيانة':'Maintenance period starts','نهاية فترة الصيانة':'Maintenance period ends',
  'أول موعد في الخطة':'First scheduled date','الدورية':'Frequency','شهري':'Monthly','ربع سنوي':'Quarterly','نصف سنوي':'Every six months','سنوي':'Yearly',
  'فريق الزيارة الوقائية':'Preventive visit team','اختر فنيًا واحدًا أو أكثر. يعمل الفريق على الزيارة نفسها.':'Choose one or more technicians for this shared visit.',
  'حفظ خطة الزيارات':'Save visit plan','حفظ المواعيد':'Save dates','تاريخ التنفيذ الفعلي':'Actual completion date','ملاحظات':'Notes',
  'ملاحظات الزيارة السابقة':'Previous visit notes','تسجيل الزيارة السابقة':'Record previous visit','خطط الوقائية':'Preventive plans',
  'تعديل الفترة':'Edit period','المواعيد وفرق العمل':'Dates and teams','الموعد والفريق':'Date and team','الموعد':'Date',
  'حفظ الموعد والفريق':'Save date and team','فرق الزيارات الجارية':'Teams for ongoing visits','تعديل فريق الزيارة':'Edit visit team','حفظ الفريق':'Save team',
  'زيارة صيانة وقائية':'Preventive maintenance visit','صيانة طارئة':'Emergency maintenance','الأجهزة':'Equipment',
  'مسح ملصق الجهاز':'Scan equipment label','فتح الكاميرا':'Open camera','لم يُفحص':'Not inspected','إنهاء الزيارة':'Submit visit','إنهاء الطلب':'Submit request',
  'جهاز غير مسجّل':'Unregistered equipment','تعديل بيانات CRM':'Edit CRM details','حالة الجهاز':'Equipment condition',
  'سليم':'Good','يحتاج صيانة':'Needs maintenance','يحتاج قطع غيار':'Needs spare parts','متوقف عن العمل':'Out of service','غير متاح للفحص':'Not accessible',
  'تبريد':'Refrigeration','طبخ':'Cooking','تكييف':'HVAC','غسيل':'Laundry','أخرى':'Other','ملاحظات الفني':'Technician notes',
  'اختياري':'Optional','اكتب سبب تعذر الفحص':'Explain why inspection was not possible','مراجعة الزيارة':'Review visit','البنود':'Inspection items',
  'ملاحظة الفني':'Technician note','التوصيات العامة':'Recommendations','إعادة للفني':'Return to technician','اعتماد وإصدار التقرير':'Approve and issue report',
  'Excel للقطع':'Parts Excel','مشاركة':'Share','طباعة / PDF':'Print / PDF','لا توجد تقارير معتمدة بعد.':'No approved reports yet.',
  'إعدادات واضحة، تحكم كامل':'Clear settings, full control','إدارة الفرع':'Branch management',
  'أدر الفنيين والعملاء والأجهزة وخطط الصيانة من مكان واحد.':'Manage technicians, clients, equipment and maintenance plans in one place.'
};
Object.assign(uiWords,{
  "ملصقات QR": "QR labels",
  "استيراد Excel": "Import Excel",
  "إضافة جهاز": "Add equipment",
  "حذف العميل": "Delete client",
  "حذف": "Delete",
  "الزيارات": "Visits",
  "بدء زيارة جديدة": "Start new visit",
  "مسودة": "Draft",
  "مُعادة للفني": "Returned to technician",
  "الصورة المرجعية": "Reference photo",
  "طلب صيانة طارئة": "Emergency maintenance request",
  "الجهاز:": "Equipment:",
  "الفني المكلَّف": "Assigned technician",
  "وصف الحالة / سبب الطلب (اختياري)": "Description / reason (optional)",
  "إنشاء الطلب": "Create request",
  "استيراد": "Import",
  "التصنيف": "Category",
  "طباعة الملصقات": "Print labels",
  "رقم التذكرة": "Ticket number",
  "بيانات تذكرة CRM": "CRM ticket details",
  "رقم التذكرة يُنسخ يدوياً من نظام CRM المعتمد بالشركة. التقرير نفسه يبقى من هذا النظام.": "Copy the ticket number from the company CRM. Maintenance reports are issued here.",
  "أُعيدت الزيارة للتعديل": "Visit returned for correction",
  "تنبيه:": "Notice:",
  "سُجّلت ملاحظات على هذا الجهاز في زيارة سابقة.": "This equipment had findings in a previous visit.",
  "لا يوجد سجل صيانة سابق لهذا الجهاز.": "No previous maintenance record for this equipment.",
  "صورة الجهاز (إلزامية)": "Equipment photo (required)",
  "صور العيب (إلزامية)": "Defect photos (required)",
  "+ صورة": "+ Photo",
  "تقدر تعدّل كتابة الفني كاملة (الملاحظات والقطع المطلوبة) قبل الاعتماد — يدوياً أو بزر التصحيح أعلاه، ثم راجعها قبل الحفظ.": "Edit technician notes and parts before approval. Review any automatic corrections before saving.",
  "✨ صحّح الكشف إملائياً بالذكاء الاصطناعي": "Correct report spelling with AI",
  "لا توجد زيارات.": "No visits yet.",
  "لا توجد أجهزة. ابدأ باستيراد ملف Excel.": "No equipment yet. Start by importing an Excel file.",
  "لا توجد أعطال مفتوحة. كل شيء جاهز للزيارة التالية.": "No open faults. Ready for the next visit.",
  "لا يوجد وصف إضافي — افتح الجهاز أدناه وسجّل حالته.": "No additional description. Open the equipment below and record its condition.",
  "⚡ طلب صيانة طارئة": "Emergency maintenance request",
  "تقارير الصيانة الوقائية": "Preventive maintenance reports",
  "نسيت كلمة المرور؟": "Forgot password?",
  "تعيين كلمة مرور جديدة": "Set a new password",
  "أدخل كلمة المرور الجديدة لحسابك ثم سجّل دخولك بها.": "Set a new password, then sign in with it.",
  "نظام تقارير الصيانة الوقائية": "Preventive maintenance reporting",
  "طابق أعمدة ملفك بحقول النظام. اسم الجهاز ورقم الأصل مطلوبان.": "Match file columns to system fields. Equipment name and asset number are required.",
  "لا توجد صورة مرجعية لهذا الجهاز بعد — أضِفها للتأكد من هوية الجهاز عند كل زيارة.": "No reference photo yet. Add one to help identify the equipment.",
  "أضف أول فني في فرعك.": "Add your branch’s first technician.",
  "إضافة جهاز من صفحة العميل": "Add equipment from the client page",
  "إلغاء التفعيل يؤرشف الجهاز ويحافظ على سجله السابق.": "Disabling archives the equipment and preserves its history.",
  "إيقاف الحساب يمنع الوصول لبيانات الفرع دون حذف سجلاته.": "Disabling blocks branch access without deleting records.",
  "الجدولة والزيارات السابقة": "Scheduling and previous visits",
  "بداية الفترة": "Period starts",
  "نهاية الفترة": "Period ends",
  "الفني الموقوف لا يستطيع تعديل الزيارات. تبقى زياراته السابقة محفوظة.": "Disabled technicians cannot edit visits. Their previous visits remain available.",
  "تصل دعوة إلى بريد الفني ليختار كلمة مروره. يُضاف إلى فرعك بصلاحية فني.": "An email invitation lets the technician choose a password. The account joins your branch as a technician.",
  "تغيير الدورية لا يعيد جدولة المواعيد الموجودة. يمكن تعديلها من المواعيد وفرق العمل.": "Changing frequency does not move existing dates. Edit them under dates and teams.",
  "تغيير كلمة المرور": "Change password",
  "تنبيه داخل اللوحة قبل الموعد بـ (أيام)": "Dashboard reminder days before a visit",
  "جهاز نشط في الزيارات الجديدة": "Equipment active for new visits",
  "حفظ الفترة": "Save period",
  "عضو جديد في فريق الصيانة": "New maintenance team member",
  "غيّر كلمة مرور حسابك. إدارة حسابات الفنيين متاحة في قسم الفنيين.": "Change your own password. Manage technician accounts under Technicians.",
  "فريق الزيارة الجارية": "Ongoing visit team",
  "لا توجد خطط بعد.": "No plans yet.",
  "لا توجد زيارات جارية.": "No ongoing visits.",
  "لا توجد مواعيد قابلة للتعديل.": "No editable dates.",
  "يمكن تعديل الموعد والفريق قبل بدء الزيارة.": "Edit the date and team before the visit starts.",
  "آخر 50 إجراء": "Latest 50 actions",
  "بدء زيارة الفريق": "Start team visit",
  "تخطيط الصيانة الوقائية": "Preventive maintenance planning",
  "خطة وقائية باسم العميل": "Preventive plan by client",
  "زيارة وقائية منفّذة خارج النظام": "Preventive visit completed outside the system",
  "تم الإغلاق": "Closed",
  "كل مواعيد هذه الخطة قادمة.": "All dates in this plan are upcoming.",
  "لا تحتاج رقم عقد. اختر الفترة والفريق، وحدّد الزيارات التي نُفّذت قبل استخدام النظام.": "No contract number required. Select the period and team, then mark previously completed visits.",
  "لا توجد إجراءات إغلاق مسجلة بعد.": "No recorded closure actions yet.",
  "لا توجد خطط وقائية بعد.": "No preventive plans yet.",
  "لا توجد زيارات مطابقة. أضف خطة وقائية باسم العميل.": "No matching visits. Add a preventive plan by client.",
  "لا توجد مواعيد لهذه الخطة بعد.": "No dates scheduled for this plan yet.",
  "لا يوجد فنيون مفعّلون في الفرع.": "No active technicians in this branch.",
  "هل نُفّذت زيارة قبل استخدام النظام؟ علّم موعدها وأدخل التاريخ الفعلي. المواعيد غير المحدّدة تبقى مستحقة.": "Mark dates completed before using this system and enter their actual completion dates. Unmarked dates remain due.",
  "وثّق الإجراء المنفذ. يبقى الفحص الأصلي محفوظًا في تقرير الزيارة.": "Record the action taken. The original inspection stays in its visit report.",
  "متابعة الأعطال": "Fault follow-up",
  "منفّذة سابقًا": "Completed previously",
  "مكتملة ومعتمدة": "Completed and approved"
});
function localize(root=document.body){
  if(personal.language!=='en')return;
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement?.closest('script,style,textarea,.report,[data-user-content]')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  let node;while((node=walk.nextNode())){const value=node.textContent.trim();
    if(uiWords[value]){if(node.parentElement.tagName==='OPTION'&&!node.parentElement.hasAttribute('value'))node.parentElement.value=value;node.textContent=node.textContent.replace(value,uiWords[value]);}
    else if(/^(زيارة |تقرير |تذكرة CRM: |الإجمالي |زيارة خلال )/.test(value)){
      node.textContent=node.textContent.replace(/^زيارة خلال (\d+) أيام$/,'Visits within $1 days').replace(/^زيارة /,'Visit ').replace(/^تقرير /,'Report ').replace(/^تذكرة CRM: /,'CRM ticket: ').replace(/^الإجمالي /,'Total ');
    }
  }
  root.querySelectorAll('[placeholder],[aria-label],[title],[data-label]').forEach(el=>['placeholder','aria-label','title','data-label'].forEach(a=>{const value=el.getAttribute(a);if(uiWords[value])el.setAttribute(a,uiWords[value]);}));
}
async function loadPersonalPreferences(){
  try{personal={...personalDefaults,...JSON.parse(localStorage.getItem('ppm:preferences:'+me.id)||'{}')};}catch{personal={...personalDefaults};}
  applyPersonal();
  const {data,error}=await sb.from('user_preferences').select('*').eq('user_id',me.id).maybeSingle();
  if(error){toast(tr('تعذر تحميل تفضيلات الحساب. تأكد من تفعيل التحديث الجديد.','Account preferences could not load. Activate the latest update.'),5000);return;}
  if(data)personal={...personalDefaults,...data};applyPersonal();
}
function applyPersonal(){
  const dark=personal.theme==='dark'||(personal.theme==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.dataset.density=personal.density;
  document.documentElement.lang=personal.language;document.documentElement.dir=personal.language==='en'?'ltr':'rtl';
  if(typeof me!=='undefined'&&me)localStorage.setItem('ppm:preferences:'+me.id,JSON.stringify(personal));
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(personal.theme==='system')applyPersonal();});
function workspaceEnhance(){
  const collapsed=localStorage.getItem('ppm:sidebar:'+me.id)==='collapsed';
  $('.workspace-shell')?.classList.toggle('sidebar-collapsed',collapsed);
  const toggle=$('#sidebarToggle');if(toggle)toggle.setAttribute('aria-expanded',String(!collapsed));
  localize(app);accessibleFields(app);pageLists(app);
  const priorities=personal.notifications?$('#dashboardPriority'):null;if(priorities)priorities.hidden=false;
}
function toggleSidebar(){
  const collapsed=$('.workspace-shell').classList.toggle('sidebar-collapsed');
  localStorage.setItem('ppm:sidebar:'+me.id,collapsed?'collapsed':'expanded');$('#sidebarToggle').setAttribute('aria-expanded',String(!collapsed));
}
function accessibleFields(root){
  root.querySelectorAll('button[title]:not([aria-label])').forEach(el=>el.setAttribute('aria-label',uiWords[el.title]&&personal.language==='en'?uiWords[el.title]:el.title));
  root.querySelectorAll('label:not([for])').forEach(label=>{
    const field=label.querySelector('input,select,textarea')||label.nextElementSibling;
    if(field?.matches('input,select,textarea')){if(!field.id)field.id='field-'+crypto.randomUUID();label.htmlFor=field.id;}
  });
}
function pageLists(root){
  root.querySelectorAll('.list:not([data-no-page])').forEach(list=>{
    const rows=[...list.children];if(rows.length<=40||list.dataset.paged)return;
    list.dataset.paged='true';list.dataset.visibleCount='40';let count=40;
    rows.forEach((row,i)=>{if(i>=count)row.dataset.pageHidden='true';});
    const button=document.createElement('button');button.className='btn quiet list-more';button.textContent=tr('عرض المزيد','Load more');
    button.onclick=()=>{count+=40;list.dataset.visibleCount=String(count);rows.slice(0,count).forEach(row=>delete row.dataset.pageHidden);button.hidden=count>=rows.length;};list.after(button);
  });
}
function filterPagedItems(selector,query,key,emptySelector){
  const rows=[...document.querySelectorAll(selector)],list=rows[0]?.parentElement;let count=0;
  rows.forEach((row,i)=>{row.hidden=!row.dataset[key].toLocaleLowerCase().includes(query);if(!row.hidden)count++;
    if(query||i<Number(list?.dataset.visibleCount||rows.length))delete row.dataset.pageHidden;else row.dataset.pageHidden='true';});
  const more=list?.nextElementSibling;if(more?.classList.contains('list-more'))more.hidden=!!query||Number(list.dataset.visibleCount)>=rows.length;
  const empty=$(emptySelector);if(empty)empty.hidden=count>0;
}
function preferencesPage(){
  const select=(id,value,options)=>`<select id="${id}">${options.map(([v,ar,en])=>`<option value="${v}" ${v===value?'selected':''}>${tr(ar,en)}</option>`).join('')}</select>`;
  shell(tr('تفضيلاتي','My preferences'),`<section class="settings-intro"><span class="eyebrow">${tr('تجربة تناسبك','Your workspace, your way')}</span><h2>${tr('إعدادات حسابك الشخصية','Personal account preferences')}</h2><p class="muted">${tr('تُحفظ لحسابك وتتوفر عند تسجيل الدخول من جهاز آخر.','Saved to your account and available on other devices.')}</p></section>
    <div class="card"><form onsubmit="savePersonalPreferences(event)"><div class="grid2"><div><label for="personalLanguage">${tr('لغة الواجهة','Interface language')}</label>${select('personalLanguage',personal.language,[['ar','العربية','Arabic'],['en','الإنجليزية','English']])}</div><div><label for="personalTheme">${tr('المظهر','Appearance')}</label>${select('personalTheme',personal.theme,[['system','حسب الجهاز','System'],['light','فاتح','Light'],['dark','داكن','Dark']])}</div><div><label for="personalDensity">${tr('حجم العرض','Content density')}</label>${select('personalDensity',personal.density,[['comfortable','مريح','Comfortable'],['compact','مضغوط','Compact']])}</div><div><label for="personalReportLanguage">${tr('لغة التقارير الافتراضية','Default report language')}</label>${select('personalReportLanguage',personal.report_language,[['ar','العربية','Arabic'],['en','الإنجليزية','English'],['bilingual','العربية والإنجليزية','Arabic and English']])}</div></div>
    <label class="team-option"><input id="personalNotifications" type="checkbox" ${personal.notifications?'checked':''}><span>${tr('إظهار ملخص تنبيهات المواعيد داخل اللوحة','Show schedule alerts on the dashboard')}</span></label><div class="form-actions"><button type="submit" class="btn">${tr('حفظ التفضيلات','Save preferences')}</button></div></form></div><div class="card"><h3>${tr('أمان حسابي','Account security')}</h3><button class="btn quiet" onclick="ownPasswordForm()">${tr('تغيير كلمة مروري','Change my password')}</button></div>`);
}
async function savePersonalPreferences(event){
  event.preventDefault();const button=event.target.querySelector('[type=submit]');button.disabled=true;
  const values={user_id:me.id,language:$('#personalLanguage').value,theme:$('#personalTheme').value,density:$('#personalDensity').value,
    report_language:$('#personalReportLanguage').value,notifications:$('#personalNotifications').checked,updated_at:new Date().toISOString()};
  try{const {error}=await sb.from('user_preferences').upsert(values);if(error)throw error;personal={...personalDefaults,...values};applyPersonal();await route();toast(tr('حُفظت تفضيلاتك','Your preferences were saved'));}
  catch(e){button.disabled=false;toast(tr('تعذر حفظ التفضيلات. حاول مرة أخرى.','Could not save preferences. Please retry.'),5000);recordError('preferences',e);}
}
const undoActions=new Map();
function offerUndo(message,operation){
  const id=crypto.randomUUID();undoActions.set(id,operation);
  const el=document.createElement('div');el.className='toast undo-toast noprint';el.setAttribute('role','status');
  el.innerHTML=`<span>${esc(message)}</span><button class="btn quiet sm">${tr('تراجع','Undo')}</button>`;
  el.querySelector('button').onclick=async()=>{const action=undoActions.get(id);if(!action)return;el.querySelector('button').disabled=true;
    try{await action();undoActions.delete(id);el.remove();await route();toast(tr('تم التراجع','Change undone'));}
    catch(e){el.remove();undoActions.delete(id);toast(tr('تعذر التراجع؛ ربما عُدّلت البيانات أو بدأت الزيارة.','Undo unavailable; data may have changed or the visit started.'),6000);recordError('undo',e);}};
  document.body.appendChild(el);setTimeout(()=>{el.remove();undoActions.delete(id);},60000);
}
function durationLabel(minutes){return personal.language==='en'?`${minutes} min`:`${minutes} دقيقة`;}
const assetCountCache=new Map();
async function suggestDuration(clientId=$('#contractClient')?.value){
  const field=$('#expectedDuration');if(!field||!clientId||field.dataset.manual==='true')return;
  try{
    let cached=assetCountCache.get(clientId);
    if(!cached||Date.now()-cached.time>60000){
      const {count,error}=await sb.from('assets').select('id',{count:'exact',head:true}).eq('client_id',clientId).eq('active',true);
      if(error)throw error;if(typeof count!=='number')return;cached={count,time:Date.now()};assetCountCache.set(clientId,cached);
    }
    if(!field.isConnected||field.dataset.manual==='true'||($('#contractClient')&&$('#contractClient').value!==clientId))return;
    const team=Math.max(1,selectedTechnicians().length);
    field.value=Math.max(45,Math.min(1440,Math.ceil(cached.count*8/team/15)*15));
    $('#durationSuggestion').textContent=tr(`اقتراح لـ ${cached.count} جهاز: 8 دقائق للجهاز موزعة على الفريق. عدّله حسب الموقع.`,`Estimate for ${cached.count} assets: 8 minutes per asset, shared by the team. Adjust for the site.`);
  }catch(e){recordError('duration-estimate',e);}
}
function bulkRescheduleForm(){
  const ids=[...document.querySelectorAll('[name=scheduleSelection]:checked')].map(el=>el.value);
  if(!ids.length)return toast(tr('اختر المواعيد التي تريد تأجيلها','Select the dates to reschedule'));
  window._rescheduleSelection=window._scheduleRows.filter(r=>ids.includes(r.id));
  openSheet(`<h2>${tr('إعادة جدولة جماعية','Bulk rescheduling')}</h2><p class="muted">${tr('تُعدّل المواعيد المختارة معًا، ويُحفظ سبب التغيير.','Selected dates change together and the reason is recorded.')}</p><form onsubmit="saveBulkReschedule(event)"><label for="shiftDays">${tr('نقل المواعيد بعدد أيام','Shift dates by days')}</label><input id="shiftDays" type="number" min="-366" max="366" step="1" value="7" required oninput="previewScheduleShift()"><label for="shiftReason">${tr('سبب التغيير','Reason for change')}</label><textarea id="shiftReason" required maxlength="1000"></textarea><div id="shiftPreview" class="list" data-no-page></div><div class="form-actions"><button class="btn quiet" type="button" onclick="closeSheet()">${tr('إلغاء','Cancel')}</button><button class="btn" type="submit">${tr('تأكيد إعادة الجدولة','Confirm rescheduling')}</button></div></form>`);
  previewScheduleShift();
}
function shiftDate(date,days){const result=new Date(date+'T12:00:00Z');result.setUTCDate(result.getUTCDate()+days);return result.toISOString().slice(0,10);}
function previewScheduleShift(){
  const days=Number($('#shiftDays').value);if(!Number.isInteger(days)||Math.abs(days)>366)return;
  $('#shiftPreview').innerHTML=window._rescheduleSelection.map(r=>`<div class="item"><span data-user-content>${esc(r.contracts.clients.name_ar)}</span><span>${fmt(r.due_date)} ← ${fmt(shiftDate(r.due_date,days))}</span></div>`).join('');
}
async function saveBulkReschedule(event){
  event.preventDefault();const rows=window._rescheduleSelection,days=Number($('#shiftDays').value),reason=$('#shiftReason').value.trim();
  if(!Number.isInteger(days)||Math.abs(days)>366||days===0||!reason)return toast(tr('حدد عدد الأيام وسبب التغيير','Enter a nonzero day shift and reason'));
  const dates=rows.map(r=>shiftDate(r.due_date,days));
  if(rows.some((r,i)=>dates[i]<r.contracts.start_date||dates[i]>r.contracts.end_date))return toast(tr('أحد المواعيد الجديدة خارج فترة الخطة؛ لم يتغير أي موعد.','A new date is outside its plan period; no dates were changed.'));
  const button=event.target.querySelector('[type=submit]');button.disabled=true;
  try{const {data,error}=await sb.rpc('reschedule_preventive_visits',{p_ids:rows.map(r=>r.id),p_dates:dates,p_expected_dates:rows.map(r=>r.due_date),p_reason:reason});if(error)throw error;
    closeSheet();await route();offerUndo(tr('تم تعديل المواعيد','Dates rescheduled'),async()=>{const {error}=await sb.rpc('undo_schedule_change',{p_change_id:data});if(error)throw error;});}
  catch(e){button.disabled=false;toast(tr('تعذر تعديل المواعيد. حدّث الصفحة وتأكد أنها لم تبدأ.','Could not reschedule. Reload and check that the visits have not started.'),6000);recordError('reschedule',e);}
}
function inspectionQuestions(category){
  const questions={
    'تبريد':[['التبريد يعمل بصورة طبيعية؟','Is cooling operating normally?'],['التوصيلات والأبواب آمنة؟','Are connections and doors safe?'],['المكثف ومجرى التصريف نظيفان؟','Are the condenser and drain clean?']],
    'طبخ':[['التسخين والتشغيل يعملان؟','Are heating and operation working?'],['التوصيلات وأنظمة الحماية سليمة؟','Are connections and safety systems sound?'],['الأسطح والأجزاء المتحركة نظيفة؟','Are surfaces and moving parts clean?']],
    'تكييف':[['التبريد وتدفق الهواء طبيعيان؟','Are cooling and airflow normal?'],['التوصيلات والتثبيت سليمان؟','Are connections and mounting safe?'],['الفلاتر ومجرى التصريف نظيفان؟','Are filters and drainage clean?']],
    'غسيل':[['دورة التشغيل تعمل بصورة طبيعية؟','Does the operating cycle work normally?'],['الباب والتوصيلات والحماية سليمة؟','Are the door, connections and guards safe?'],['الفلاتر ومجرى التصريف نظيفان؟','Are filters and drainage clean?']],
    'أخرى':[['التشغيل الأساسي يعمل؟','Does the main operation work?'],['التوصيلات ووسائل الحماية سليمة؟','Are connections and safeguards sound?'],['التنظيف والصيانة الأساسية مكتملان؟','Are cleaning and basic servicing complete?']]
  };return (questions[category]||questions['أخرى']).map(([ar,en],i)=>({key:['operation','safety','service'][i],ar,en}));
}
function checklistFields(asset,item,readOnly){
  const answers=item?.inspection_checklists?.answers||item?.inspection_checklists?.[0]?.answers||{};
  window._draft.answers={...answers};
  return `<fieldset class="short-checklist"><legend>${tr('فحص سريع · ثلاثة أسئلة','Quick inspection · three questions')}</legend>${inspectionQuestions(asset.category).map(q=>`<div><label for="check_${q.key}">${tr(q.ar,q.en)}</label><select id="check_${q.key}" ${readOnly?'disabled':''} onchange="window._draft.answers['${q.key}']=this.value"><option value="">${tr('اختر الإجابة','Choose an answer')}</option>${[['yes','نعم','Yes'],['no','لا','No'],['na','لا ينطبق / تعذر الفحص','Not applicable / inaccessible']].map(([v,ar,en])=>`<option value="${v}" ${answers[q.key]===v?'selected':''}>${tr(ar,en)}</option>`).join('')}</select></div>`).join('')}</fieldset>`;
}
async function discussionCard(v){
  if(me.role==='client'||!(me.role==='supervisor'||(v.team||[]).some(t=>t.technician_id===me.id)||v.technician_id===me.id))return '';
  const {data,error}=await sb.rpc('visit_discussion',{p_visit_id:v.id});if(error)throw error;
  return `<section class="card discussion-card"><h3>${tr('تعليقات الفريق الداخلية','Internal team discussion')}</h3><p class="muted">${tr('مرئية للفريق والمشرف فقط، ولا تظهر في تقرير العميل.','Visible to the assigned team and supervisor; excluded from client reports.')}</p><div class="list" data-no-page>${(data||[]).map(c=>`<article class="comment"><div class="spread"><strong data-user-content>${esc(c.full_name)}</strong><time>${fmt(c.created_at)} · ${time(c.created_at)}</time></div><p data-user-content>${esc(c.body)}</p></article>`).join('')||`<p class="empty">${tr('ابدأ النقاش مع فريق الزيارة','Start a discussion with the visit team')}</p>`}</div><form onsubmit="saveVisitComment(event,'${v.id}')"><label for="visitComment">${tr('تعليق جديد','New comment')}</label><textarea id="visitComment" required maxlength="2000"></textarea><div class="form-actions"><button class="btn" type="submit">${tr('إرسال التعليق','Post comment')}</button></div></form></section>`;
}
async function saveVisitComment(event,id){
  event.preventDefault();const body=$('#visitComment').value.trim();if(!body)return;const button=event.target.querySelector('button');button.disabled=true;
  try{const {error}=await sb.from('visit_comments').insert({visit_id:id,author_id:me.id,body});if(error)throw error;await route();toast(tr('أُضيف التعليق الداخلي','Internal comment posted'));}
  catch(e){button.disabled=false;toast(tr('تعذر إرسال التعليق. نصك ما زال محفوظًا هنا.','Could not post comment. Your text is still here.'),5000);recordError('comment',e);}
}
const libraryLoads=new Map();
async function ensureLibrary(name){
  if(window[name])return;
  if(libraryLoads.has(name))return libraryLoads.get(name);
  const urls={QRCode:'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',Html5Qrcode:'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js',XLSX:'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'};
  const loading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=urls[name];script.async=true;
    const timer=setTimeout(()=>{script.remove();reject(new Error('Library load timed out'));},15000);
    script.onload=()=>{clearTimeout(timer);window[name]?resolve():reject(new Error('Library unavailable'));};script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('Library unavailable'));};document.head.appendChild(script);});
  libraryLoads.set(name,loading);try{await loading;}catch(e){libraryLoads.delete(name);toast(tr('تعذر تحميل الأداة. تحقق من الإنترنت وأعد المحاولة.','Could not load this tool. Check your connection and retry.'),5000);throw e;}
}
function recordError(area,error){
  // Technical diagnostics stay in this browser; no account data or remote telemetry.
  const entry={area,time:new Date().toISOString(),code:error?.code||error?.name||'Error'};
  try{const list=JSON.parse(sessionStorage.getItem('ppm:errors')||'[]');sessionStorage.setItem('ppm:errors',JSON.stringify([...list.slice(-19),entry]));}catch{}
  console.error('PPM '+area,error);
}
window.addEventListener('error',event=>recordError('runtime',event.error));
window.addEventListener('unhandledrejection',event=>{recordError('promise',event.reason);toast(tr('تعذر إكمال العملية. حاول مرة أخرى.','The operation could not finish. Please retry.'),5000);});

async function clientAccountSettings(){
  const [accounts,clients]=await Promise.all([sb.from('profiles').select('id,full_name,phone,client_id,active').eq('role','client').eq('branch',me.branch).order('full_name'),sb.from('clients').select('id,name_ar').order('name_ar')]);
  if(accounts.error||clients.error)throw accounts.error||clients.error;
  window._clientAccounts=accounts.data||[];window._accountClients=clients.data||[];
  return `<div class="card"><div class="spread"><h3>${tr('حسابات العملاء','Client accounts')}</h3><button class="btn" onclick="clientAccountForm()">${tr('+ حساب عميل','+ Client account')}</button></div><p class="muted">${tr('كل حساب يرى تقارير عميله المعتمدة فقط. الإيقاف يحفظ التقارير والسجلات.','Each account sees only its own client’s approved reports. Disabling preserves reports and records.')}</p><div class="list">${window._clientAccounts.map(a=>`<div class="item"><span class="avatar">${esc(a.full_name.slice(0,1))}</span><span class="body" data-user-content><strong>${esc(a.full_name)}</strong><small>${esc(window._accountClients.find(c=>c.id===a.client_id)?.name_ar||'')}</small></span><span class="status-tag ${a.active?'ok':'neutral'}">${a.active?tr('مفعّل','Active'):tr('موقوف','Disabled')}</span><button class="btn quiet sm" onclick="clientAccountForm('${a.id}')">${tr('تعديل','Edit')}</button></div>`).join('')||`<p class="empty">${tr('لم تُضف حسابات عملاء بعد','No client accounts yet')}</p>`}</div></div>`;
}
function clientAccountForm(id=null){
  const account=window._clientAccounts.find(a=>a.id===id)||{};
  if(!window._accountClients.length)return toast(tr('أضف العميل أولًا ثم أنشئ حسابه','Add a client before creating an account'));
  openSheet(`<h2>${id?tr('تعديل حساب العميل','Edit client account'):tr('دعوة حساب عميل','Invite client account')}</h2><form onsubmit="saveClientAccount(event,${id?`'${id}'`:'null'})"><label for="accountName">${tr('الاسم الكامل','Full name')}</label><input id="accountName" required maxlength="100" value="${esc(account.full_name||'')}">${id?'':`<label for="accountEmail">${tr('البريد الإلكتروني','Email')}</label><input id="accountEmail" type="email" required>`}<label for="accountPhone">${tr('الهاتف','Phone')}</label><input id="accountPhone" type="tel" maxlength="40" value="${esc(account.phone||'')}"><label for="accountClient">${tr('العميل المسموح للحساب','Assigned client')}</label><select id="accountClient" required>${window._accountClients.map(c=>`<option value="${c.id}" ${c.id===account.client_id?'selected':''}>${esc(c.name_ar)}</option>`).join('')}</select>${id?`<label class="team-option"><input id="accountActive" type="checkbox" ${account.active?'checked':''}><span>${tr('الحساب مفعّل','Account enabled')}</span></label>`:`<p class="muted">${tr('ستصل دعوة إلى البريد لتعيين كلمة المرور.','An email invitation will let the client set a password.')}</p>`}<div class="form-actions"><button type="button" class="btn quiet" onclick="closeSheet()">${tr('إلغاء','Cancel')}</button><button type="submit" class="btn">${id?tr('حفظ الحساب','Save account'):tr('إرسال الدعوة','Send invitation')}</button></div></form>`);
}
async function saveClientAccount(event,id){
  event.preventDefault();const form=event.target,button=form.querySelector('[type=submit]');button.disabled=true;
  const values={full_name:$('#accountName').value.trim(),phone:$('#accountPhone').value.trim(),client_id:$('#accountClient').value};
  try{
    if(id){const {error}=await sb.rpc('update_client_account',{p_id:id,p_full_name:values.full_name,p_phone:values.phone,p_client_id:values.client_id,p_active:$('#accountActive').checked});if(error)throw error;}
    else{const {data,error}=await sb.functions.invoke('manage-client-accounts',{body:{...values,email:$('#accountEmail').value,...(form.dataset.pendingUser?{pending_user_id:form.dataset.pendingUser}:{})}});
      let result=data;if(error?.context instanceof Response)result=await error.context.clone().json().catch(()=>null);
      if(result?.pending_user_id){form.dataset.pendingUser=result.pending_user_id;$('#accountEmail').readOnly=true;$('#accountClient').disabled=true;button.textContent=tr('إكمال ربط الحساب','Complete account linking');}
      if(error||result?.error)throw new Error(result?.error||tr('تعذر إرسال الدعوة. تأكد من تفعيل خدمة حسابات العملاء.','Could not invite the client. Activate the client account service.'));}
    closeSheet();await route();toast(id?tr('حُفظ حساب العميل','Client account saved'):tr('أُرسلت دعوة العميل','Client invitation sent'));
  }catch(e){button.disabled=false;toast(e.message,6000);recordError('client-account',e);}
}

function reportLanguageOptions(value){return [['ar','العربية'],['en','English'],['bilingual','العربية / English']].map(([v,l])=>`<option value="${v}" ${value===v?'selected':''}>${l}</option>`).join('');}
function reportMarkup(v,assets,items,language,preview=false){
  const bi=language==='bilingual',en=language==='en',label=(ar,english)=>en?english:bi?`${ar}<span class="bi">${english}</span>`:ar;
  const map=new Map(assets.map(a=>[a.id,a]));const counts=STATES.map(s=>[s,items.filter(i=>i.condition===s.k).length]);
  const healthy=items.length?Math.round(counts[0][1]/items.length*100):0;
  const reportFmt=d=>d?new Date(d).toLocaleDateString(en?'en-GB':'ar-SA-u-ca-gregory',{year:'numeric',month:'2-digit',day:'2-digit'}):'—';
  return `<article class="report" dir="${en?'ltr':'rtl'}" lang="${en?'en':'ar'}"><header class="rhead"><img src="${LOGO}" alt="Al-Mohtaseb"><div style="flex:1"><h2>${label(v.visit_type==='emergency'?'تقرير صيانة طارئة':'تقرير زيارة صيانة وقائية',v.visit_type==='emergency'?'Emergency Maintenance Report':'Preventive Maintenance Visit Report')}</h2><strong>${esc(en?(v.clients.name_en||v.clients.name_ar):v.clients.name_ar)}</strong>${bi?`<div class="bi">${esc(v.clients.name_en||'')}</div>`:''}</div><div class="report-meta"><strong>${preview?label('مسودة للمعاينة','Preview draft'):esc(v.report_no||'—')}</strong><div>${label('التاريخ','Date')}: ${reportFmt(v.visit_date)}</div><div>${label('الفريق','Team')}: ${esc((v.team||[]).map(t=>t.full_name).join(en?', ':'، '))}</div><div>${label('وقت الزيارة','Visit time')}: ${time(v.check_in)} — ${time(v.check_out)}</div></div></header>
    <div class="sum">${counts.map(([s,n])=>`<div><div class="n" style="color:var(${s.v})">${n}</div><div>${label(s.k,s.en)}</div></div>`).join('')}<div><div class="n">${healthy}%</div>${label('نسبة السليم','Healthy rate')}</div></div>
    <table class="rtable"><thead><tr>${[['رقم الأصل','Asset No.'],['الجهاز','Equipment'],['الموقع','Location'],['الماركة والموديل','Brand / model'],['الحالة','Condition'],['القطع والملاحظات','Parts / notes'],['الصورة','Photo']].map(([ar,e])=>`<th>${label(ar,e)}</th>`).join('')}</tr></thead><tbody>${items.map(i=>{const a=map.get(i.asset_id)||{},s=stateOf(i.condition)||STATES[4],photo=i.photos?.[0];return `<tr><td>${esc(a.asset_no||'')}</td><td>${esc(en?(a.name_en||a.name_ar):a.name_ar||'')}${bi?`<div class="bi">${esc(a.name_en||'')}</div>`:''}</td><td>${esc(a.location_text||'—')}</td><td>${esc(a.brand||'')} ${esc(a.model||'')}</td><td>${label(i.condition,s.en)}</td><td>${esc(i.parts_needed_text||'—')}${i.technician_notes?`<p>${esc(i.technician_notes)}</p>`:''}</td><td>${photo?`<img src="${photo.url}" alt="${esc(en?'Equipment':'الجهاز')}">`:'—'}</td></tr>`;}).join('')}</tbody></table>
    ${v.recommendations?`<section class="report-recommendations"><b>${label('التوصيات العامة','Recommendations')}</b><p>${esc(v.recommendations)}</p></section>`:''}<div class="sign"><div>${label('ممثل شركة المحتسب','Al-Mohtaseb representative')}</div><div>${label('ممثل العميل','Client representative')}</div></div><footer class="report-footer">${label('سجل نتائج الصيانة','Maintenance inspection record')} · ${preview?'—':esc(v.report_no||'—')}</footer></article>`;
}
function previewReport(){
  const v={...window._v,recommendations:$('#rec').value};
  const items=window._items.map(i=>({...i,technician_notes:$('#note_'+i.id)?.value??i.technician_notes,parts_needed_text:$('#parts_'+i.id)?.value??i.parts_needed_text}));
  window._previewReport={v,assets:window._assets,items};
  openSheet(`<div class="spread"><h2>${tr('معاينة التقرير قبل الاعتماد','Preview before approval')}</h2><button class="btn quiet" onclick="closeSheet()">${tr('العودة للمراجعة','Back to review')}</button></div><p class="muted">${tr('تعرض التعديلات الحالية دون حفظها أو إصدار تقرير معتمد.','Shows current edits without saving or issuing an approved report.')}</p><label for="previewLanguage">${tr('لغة التقرير','Report language')}</label><select id="previewLanguage" class="compact-select" onchange="renderPreviewReport(this.value)">${reportLanguageOptions(personal.report_language)}</select><div id="reportPreviewContent"></div>`);
  $('#sheetEl').classList.add('report-preview');renderPreviewReport(personal.report_language);
}
function renderPreviewReport(language){const {v,assets,items}=window._previewReport;$('#reportPreviewContent').innerHTML=reportMarkup(v,assets,items,language,true);}
function renderFinalReport(language){const {v,assets,items}=window._finalReport;$('#finalReportContent').innerHTML=reportMarkup(v,assets,items,language);}
