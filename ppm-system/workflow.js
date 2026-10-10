/* Contract planning and fault follow-up. Public attachment storage is unchanged. */
function todayISO(){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
function filterClients(value){filterPagedItems('#clientList [data-search]',value.trim().toLocaleLowerCase(),'search','#noClients');}

function contractDates(first,end,months){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(first)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||first>end||![1,3,6,12].includes(months))return [];
  const [year,month,day]=first.split('-').map(Number),dates=[];
  for(let i=0;i<=120;i++){
    const anchor=new Date(Date.UTC(year,month-1+i*months,1));
    const last=new Date(Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth()+1,0)).getUTCDate();
    anchor.setUTCDate(Math.min(day,last));
    const date=anchor.toISOString().slice(0,10);if(date>end)break;if(dates.length===120)return [];dates.push(date);
  }
  return dates;
}
function scheduleState(row){
  if(row.completed_externally_on)return {label:'منفّذة سابقًا',tone:'ok',historical:true};
  const v=row.visits?.[0];
  if(v)return {label:v.status==='approved'?'مكتملة ومعتمدة':v.status==='submitted'?'بانتظار الاعتماد':'قيد التنفيذ',tone:v.status==='approved'?'ok':'brand',visit:v};
  if(row.due_date<todayISO())return {label:'متأخرة',tone:'danger'};
  if(row.due_date===todayISO())return {label:'مستحقة اليوم',tone:'warning'};
  return {label:'قادمة',tone:'neutral'};
}
async function resolveFault(id){
  if(me.role!=='supervisor')return;
  openSheet(`<div class="sheet-heading"><span class="eyebrow">متابعة الأعطال</span><h2>إغلاق العطل</h2><p class="muted">وثّق الإجراء المنفذ. يبقى الفحص الأصلي محفوظًا في تقرير الزيارة.</p></div>
    <form onsubmit="submitResolution(event,'${id}')"><label for="resolutionNotes">ما الإجراء الذي تم؟</label><textarea id="resolutionNotes" required maxlength="2000" placeholder="مثال: استبدال القطعة وفحص التشغيل…"></textarea><div class="form-actions"><button type="button" class="btn quiet" onclick="closeSheet()">إلغاء</button><button class="btn" type="submit">تأكيد الإغلاق</button></div></form>`);
}
async function submitResolution(event,id){
  event.preventDefault();const notes=$('#resolutionNotes').value.trim();if(!notes)return toast('اكتب إجراء الإغلاق');
  const button=event.target.querySelector('[type=submit]');button.disabled=true;
  try{
    const {error}=await sb.from('fault_resolutions').insert({visit_item_id:id,resolution_notes:notes,resolved_by:me.id});
    if(error)throw error;closeSheet();toast('أُغلق العطل وحُفظ سجل المعالجة');await route();
  }catch(e){toast('تعذر الإغلاق: '+e.message,5000);button.disabled=false;}
}
async function schedulePage(){
  if(me.role==='client')return clientHome();
  const clientId=location.hash.split('/')[2]||null;
  const [scheduleResult,contractResult]=await Promise.all([
    sb.from('scheduled_visits').select('*,contracts(*,clients(name_ar)),scheduled_visit_technicians(technician_id),visits!scheduled_visit_id(id,status)').order('due_date'),
    sb.from('contracts').select('*,clients(name_ar)').order('end_date')
  ]);
  if(scheduleResult.error||contractResult.error)throw scheduleResult.error||contractResult.error;
  const rows=(scheduleResult.data||[]).filter(r=>!clientId||r.contracts.client_id===clientId);
  const contracts=(contractResult.data||[]).filter(c=>!clientId||c.client_id===clientId);
  window._scheduleRows=rows;
  const overdue=rows.filter(r=>scheduleState(r).tone==='danger').length;
  const upcoming=rows.filter(r=>!r.visits?.length&&!r.completed_externally_on&&r.due_date>=todayISO()&&r.due_date<=reminderEnd()).length;
  let body=`<section class="dashboard-hero"><div><span class="eyebrow">من الخطة إلى التنفيذ</span><h2>كل زيارة في موعدها</h2><p>جدول الوقائية باسم العميل، كلّف فريق العمل، وسجّل الزيارات السابقة.</p></div>${me.role==='supervisor'?`<button class="btn hero-action" onclick="newContract('${clientId||''}')">+ خطة وقائية جديدة</button>`:''}</section>
    <div class="kpi"><div class="b"><span class="metric-icon">${icon('calendar')}</span><div class="n">${contracts.length}</div><div class="muted">خطة وقائية</div></div><div class="b"><span class="metric-icon danger">${icon('calendar')}</span><div class="n">${overdue}</div><div class="muted">زيارة متأخرة لم تبدأ</div></div><div class="b"><span class="metric-icon">${icon('check')}</span><div class="n">${upcoming}</div><div class="muted">زيارة خلال ${preferences.reminder_days} أيام</div></div></div>
    <div class="card">${me.role==='supervisor'?`<div class="bulk-toolbar"><span>${tr('اختر المواعيد غير المبدوءة لتعديلها معًا','Select unstarted dates to reschedule together')}</span><button class="btn quiet" onclick="bulkRescheduleForm()">${tr('إعادة جدولة المختار','Reschedule selected')}</button></div>`:''}<div class="spread"><h3>جدول الزيارات</h3><select id="scheduleFilter" aria-label="تصفية الزيارات" class="compact-select" onchange="filterSchedule(this.value)"><option value="all">كل الزيارات</option><option value="danger">المتأخرة</option><option value="upcoming">القادمة والمستحقة</option><option value="done">المكتملة</option></select></div>
    <div class="list" style="margin-top:16px">${rows.map(r=>{
      const state=scheduleState(r),v=state.visit;
      const canStart=me.role==='supervisor'||scheduledForMe(r);
      const destination=v?(v.status==='approved'?'report':v.status==='submitted'&&me.role==='supervisor'?'review':'visit'):null;
      return `<div class="item schedule-item" data-schedule="${state.historical?'done':v?(v.status==='approved'?'done':'progress'):state.tone==='danger'?'danger':'upcoming'}">${me.role==='supervisor'&&!state.historical&&!v?`<input class="schedule-check" type="checkbox" name="scheduleSelection" value="${r.id}" aria-label="${tr('اختيار موعد','Select date')} ${esc(r.contracts.clients.name_ar)} ${r.due_date}">`:''}<span class="date-tile"><strong>${r.due_date.slice(8)}</strong><small>${r.due_date.slice(0,7)}</small></span><span class="body"><span class="t">${esc(r.contracts.clients.name_ar)}</span><span class="s">${fmt(r.due_date)} · ${durationLabel(r.expected_duration_minutes||120)}${state.historical?' · نُفّذت '+fmt(r.completed_externally_on):''}${r.external_notes?' · '+esc(r.external_notes):''}</span></span><span class="status-tag ${state.tone}">${state.label}</span>${state.historical?`<span class="muted">مسجّلة خارج النظام</span>`:v?`<a class="btn quiet sm" href="#/${destination}/${v.id}">فتح الزيارة</a>`:canStart?`<div class="row"><button class="btn sm" onclick="startVisit('${r.contracts.client_id}','${r.id}','${r.contract_id}')">بدء الزيارة</button>${me.role==='supervisor'?`<button class="btn quiet sm" onclick="recordPreviousVisit('${r.id}')">نُفّذت سابقًا</button>`:''}</div>`:`<span class="muted">مكلّفة لفني آخر</span>`}</div>`;
    }).join('')}</div><p class="empty" id="emptySchedule" ${rows.length?'hidden':''}>لا توجد زيارات مطابقة. أضف خطة وقائية باسم العميل.</p></div>
    <div class="card"><h3>خطط العملاء وتقدم التنفيذ</h3><div class="list" style="margin-top:16px">${contracts.map(c=>{
      const related=rows.filter(r=>r.contract_id===c.id),done=related.filter(r=>r.completed_externally_on||r.visits?.[0]?.status==='approved').length;
      const total=related.length||c.visits_planned||0,pct=total?Math.round(done/total*100):0;
      return `<div class="contract-card"><div class="spread"><a href="#/client/${c.client_id}"><strong>${esc(c.clients.name_ar)}</strong></a><span class="status-tag ${c.end_date&&c.end_date<todayISO()?'neutral':'brand'}">${c.end_date&&c.end_date<todayISO()?'منتهي':'خطة وقائية'}</span></div><p class="muted">${esc(c.frequency||'بدون دورية')}<br>${fmt(c.start_date)} — ${fmt(c.end_date)}</p><div class="spread"><span>زيارات منفّذة</span><strong>${done} من ${total}</strong></div><div class="rail"><span style="width:${pct}%"></span></div>${!related.length?`<p class="muted">لا توجد مواعيد لهذه الخطة بعد.</p>${me.role==='supervisor'?`<button class="btn quiet sm" onclick="planExistingContract('${c.id}')">جدولة الزيارات</button>`:''}`:''}</div>`;
    }).join('')||'<p class="empty">لا توجد خطط وقائية بعد.</p>'}</div></div>`;
  window._contracts=contracts;shell('جدولة الوقائية',body);
}
function filterSchedule(value){
  let count=0;document.querySelectorAll('[data-schedule]').forEach(el=>{el.hidden=value!=='all'&&el.dataset.schedule!==value;if(!el.hidden)count++;});
  $('#emptySchedule').hidden=count>0;
}
function scheduledForMe(row){
  const team=row.scheduled_visit_technicians||[];
  return team.length?team.some(t=>t.technician_id===me.id):!row.technician_id||row.technician_id===me.id;
}
function technicianFields(selected=[]){
  return `<fieldset class="team-picker"><legend>فريق الزيارة الوقائية</legend><p class="muted">اختر فنيًا واحدًا أو أكثر. يعمل الفريق على الزيارة نفسها.</p>${(window._technicians||[]).map((t,i)=>`<label class="team-option"><input type="checkbox" name="assignedTech" onchange="suggestDuration()" value="${t.id}" ${selected.includes(t.id)||(!selected.length&&i===0)?'checked':''}><span>${esc(t.full_name)}</span></label>`).join('')||'<p class="empty">لا يوجد فنيون مفعّلون في الفرع.</p>'}</fieldset>`;
}
function selectedTechnicians(){return [...document.querySelectorAll('[name=assignedTech]:checked')].map(el=>el.value);}
async function newContract(clientId=''){
  const [clients,technicians]=await Promise.all([sb.from('clients').select('id,name_ar').order('name_ar'),sb.from('profiles').select('id,full_name').eq('role','technician').eq('active',true)]);
  if(clients.error||technicians.error)return toast('تعذر تحميل العملاء والفنيين');
  window._technicians=technicians.data||[];
  openSheet(`<div class="sheet-heading"><span class="eyebrow">تخطيط الصيانة الوقائية</span><h2>خطة وقائية باسم العميل</h2><p class="muted">لا تحتاج رقم عقد. اختر الفترة والفريق، وحدّد الزيارات التي نُفّذت قبل استخدام النظام.</p></div><form onsubmit="saveContract(event)"><label for="contractClient">العميل</label><select id="contractClient" required onchange="delete document.getElementById('expectedDuration').dataset.manual;suggestDuration(this.value)">${(clients.data||[]).map(c=>`<option value="${c.id}" ${c.id===clientId?'selected':''}>${esc(c.name_ar)}</option>`).join('')}</select><div class="grid2"><div><label for="contractStart">بداية فترة الصيانة</label><input type="date" id="contractStart" value="${todayISO()}" required oninput="$('#firstVisit').value=this.value;refreshHistoryOptions()"></div><div><label for="contractEnd">نهاية فترة الصيانة</label><input type="date" id="contractEnd" required oninput="refreshHistoryOptions()"></div></div>${planningFields()}<div id="previousVisits"></div><div class="form-actions"><button class="btn quiet" type="button" onclick="closeSheet()">إلغاء</button><button class="btn" type="submit">حفظ خطة الزيارات</button></div></form>`);
  await suggestDuration();
}
function planningFields(){
  return `<div class="grid2"><div><label for="firstVisit">أول موعد في الخطة</label><input type="date" id="firstVisit" required value="${todayISO()}" oninput="refreshHistoryOptions()"></div><div><label for="frequency">الدورية</label><select id="frequency" onchange="refreshHistoryOptions()">${[[1,'شهري'],[3,'ربع سنوي'],[6,'نصف سنوي'],[12,'سنوي']].map(([n,l])=>`<option value="${n}" ${n===preferences.default_frequency?'selected':''}>${l}</option>`).join('')}</select></div></div><label for="expectedDuration">${tr('المدة المتوقعة لكل زيارة (دقيقة)','Expected duration per visit (minutes)')}</label><input id="expectedDuration" type="number" min="15" max="1440" step="1" required value="120" oninput="this.dataset.manual='true'"><p id="durationSuggestion" class="muted">${tr('مدة تقديرية قابلة للتعديل حسب الأجهزة والموقع','An estimate adjustable for equipment and site conditions')}</p>${technicianFields()}`;
}
function previousValues(){
  return [...document.querySelectorAll('.history-entry')].filter(el=>el.querySelector('[type=checkbox]').checked).map(el=>({due_date:el.dataset.due,completed_on:el.querySelector('[type=date]').value,notes:el.querySelector('[type=text]').value}));
}
function refreshHistoryOptions(){
  const container=$('#previousVisits');if(!container)return;
  const existing=new Map(previousValues().map(p=>[p.due_date,p]));
  const end=$('#contractEnd')?.value||window._planningEnd;
  const dates=contractDates($('#firstVisit').value,end||'',+$('#frequency').value);
  const past=dates.filter(d=>d<=todayISO());
  container.innerHTML=dates.length?`<div class="history-planning"><h3>${dates.length} زيارة في الخطة</h3><p class="muted">هل نُفّذت زيارة قبل استخدام النظام؟ علّم موعدها وأدخل التاريخ الفعلي. المواعيد غير المحدّدة تبقى مستحقة.</p>${past.map(d=>{
    const prev=existing.get(d);return `<div class="history-entry" data-due="${d}"><label class="team-option"><input type="checkbox" ${prev?'checked':''} onchange="this.closest('.history-entry').querySelector('.history-fields').hidden=!this.checked"><span>نُفّذت زيارة موعد ${fmt(d)}</span></label><div class="history-fields" ${prev?'':'hidden'}><label>تاريخ التنفيذ الفعلي</label><input type="date" value="${prev?.completed_on||d}" max="${todayISO()}"><label>ملاحظات الزيارة السابقة</label><input type="text" maxlength="2000" value="${esc(prev?.notes||'')}" placeholder="مثال: زيارة منفّذة قبل تشغيل النظام"></div></div>`;
  }).join('')||'<p class="muted">كل مواعيد هذه الخطة قادمة.</p>'}</div>`:'';
}
async function saveContract(event){
  event.preventDefault();const start=$('#contractStart').value,end=$('#contractEnd').value,first=$('#firstVisit').value;
  if(start>end||first<start||first>end)return toast('تأكد أن أول موعد داخل فترة الصيانة');
  const frequency=$('#frequency'),dates=contractDates(first,end,+frequency.value),team=selectedTechnicians();
  if(!dates.length)return toast('تأكد من المواعيد؛ الحد الأقصى 120 زيارة للخطة');
  if(!team.length)return toast('اختر فنيًا واحدًا على الأقل');
  const previous=previousValues();if(previous.some(p=>!p.completed_on||p.completed_on>todayISO()||p.completed_on<start||p.completed_on>end))return toast('تأكد من تواريخ تنفيذ الزيارات السابقة');
  const button=event.target.querySelector('[type=submit]');button.disabled=true;
  try{
    const {error}=await sb.rpc('create_preventive_plan_with_duration',{p_duration:+$('#expectedDuration').value,p_client_id:$('#contractClient').value,
      p_start_date:start,p_end_date:end,p_frequency:frequency.options[frequency.selectedIndex].text,
      p_technician_ids:team,p_dates:dates,p_previous:previous});
    if(error)throw error;closeSheet();toast(`حُفظت الخطة وجُدولت ${dates.length} زيارة`);await route();
  }catch(e){toast('تعذر الحفظ: '+e.message,5000);button.disabled=false;}
}
async function planExistingContract(id){
  const c=window._contracts.find(c=>c.id===id);
  if(!c?.start_date||!c.end_date)return toast('حدّد بداية ونهاية فترة الصيانة أولًا');
  const {data,error}=await sb.from('profiles').select('id,full_name').eq('role','technician').eq('active',true);
  if(error)return toast('تعذر تحميل الفنيين');window._technicians=data;window._planningEnd=c.end_date;
  openSheet(`<h2>جدولة وقائية · ${esc(c.clients.name_ar)}</h2><p class="muted">${fmt(c.start_date)} — ${fmt(c.end_date)}</p><form onsubmit="saveExistingSchedule(event,'${id}')">${planningFields()}<div id="previousVisits"></div><div class="form-actions"><button class="btn quiet" type="button" onclick="closeSheet()">إلغاء</button><button class="btn" type="submit">حفظ المواعيد</button></div></form>`);
  $('#firstVisit').value=c.start_date;refreshHistoryOptions();
}
async function saveExistingSchedule(event,id){
  event.preventDefault();const c=window._contracts.find(c=>c.id===id),first=$('#firstVisit').value;
  if(first<c.start_date||first>c.end_date)return toast('أول موعد يجب أن يكون داخل فترة الصيانة');
  const dates=contractDates(first,c.end_date,+$('#frequency').value),team=selectedTechnicians();
  if(!dates.length||!team.length)return toast('اختر الفنيين وحدّد مواعيد صالحة');
  const button=event.target.querySelector('[type=submit]');button.disabled=true;
  try{
    const {error}=await sb.rpc('schedule_existing_plan_with_duration',{p_duration:+$('#expectedDuration').value,p_contract_id:id,p_technician_ids:team,p_dates:dates,p_previous:previousValues()});
    if(error)throw error;closeSheet();toast('حُفظ جدول الزيارات');await route();
  }catch(e){toast('تعذر الجدولة: '+e.message,5000);button.disabled=false;}
}
async function recordPreviousVisit(id){
  const row=window._scheduleRows.find(r=>r.id===id);if(!row||me.role!=='supervisor')return;
  openSheet(`<div class="sheet-heading"><span class="eyebrow">زيارة وقائية منفّذة خارج النظام</span><h2>${esc(row.contracts.clients.name_ar)}</h2><p class="muted">موعد الخطة: ${fmt(row.due_date)}. ستُحتسب الزيارة منفّذة دون إنشاء تقرير أو نتائج فحص غير مسجّلة.</p></div><form onsubmit="savePreviousVisit(event,'${id}')"><label for="previousDate">تاريخ التنفيذ الفعلي</label><input id="previousDate" type="date" required min="${row.contracts.start_date}" max="${todayISO()<row.contracts.end_date?todayISO():row.contracts.end_date}" value="${row.due_date<=todayISO()?row.due_date:todayISO()}"><label for="previousNotes">ملاحظات</label><textarea id="previousNotes" maxlength="2000" placeholder="تفاصيل الزيارة السابقة، إن توفرت"></textarea><div class="form-actions"><button class="btn quiet" type="button" onclick="closeSheet()">إلغاء</button><button class="btn" type="submit">تسجيل الزيارة السابقة</button></div></form>`);
}
async function savePreviousVisit(event,id){
  event.preventDefault();const button=event.target.querySelector('[type=submit]');button.disabled=true;
  try{
    const {error}=await sb.rpc('record_previous_preventive_visit',{p_schedule_id:id,p_completed_on:$('#previousDate').value,p_notes:$('#previousNotes').value});
    if(error)throw error;closeSheet();toast('سُجّلت الزيارة السابقة واحتُسبت في تقدم الخطة');await route();
  }catch(e){toast('تعذر التسجيل: '+e.message,5000);button.disabled=false;}
}
async function chooseVisitTeam(clientId,scheduleId=null){
  const {data,error}=await sb.from('profiles').select('id,full_name').eq('role','technician').eq('active',true);
  if(error)return toast('تعذر تحميل الفنيين');window._technicians=data;
  openSheet(`<h2>فريق الزيارة الوقائية</h2><form onsubmit="beginTeamVisit(event,'${clientId}',${scheduleId?`'${scheduleId}'`:'null'})">${technicianFields(me.role==='technician'?[me.id]:[])}<div class="form-actions"><button type="button" class="btn quiet" onclick="closeSheet()">إلغاء</button><button type="submit" class="btn">بدء زيارة الفريق</button></div></form>`);
}
async function beginTeamVisit(event,clientId,scheduleId=null){
  event.preventDefault();const team=selectedTechnicians();if(!team.length)return toast('اختر فنيًا واحدًا على الأقل');
  const button=event.target.querySelector('[type=submit]');button.disabled=true;
  try{const {data,error}=await sb.rpc('start_preventive_visit',{p_client_id:clientId,p_technician_ids:team,...(scheduleId?{p_schedule_id:scheduleId}:{})});if(error)throw error;closeSheet();location.hash='#/visit/'+data;}
  catch(e){toast('تعذر البدء: '+e.message);button.disabled=false;}
}

async function showResolutionHistory(){
  if(me.role!=='supervisor')return;
  const {data,error}=await sb.from('fault_resolutions')
    .select('*,resolver:profiles!resolved_by(full_name),visit_items!inner(assets(name_ar,asset_no),visits!inner(clients(name_ar)))')
    .order('resolved_at',{ascending:false}).limit(50);
  if(error)return toast('تعذر تحميل سجل الإغلاق: '+error.message);
  openSheet(`<div class="sheet-heading"><span class="eyebrow">آخر 50 إجراء</span><h2>سجل إغلاق الأعطال</h2></div><div class="list">${(data||[]).map(r=>`<article class="contract-card"><div class="spread"><strong>${esc(r.visit_items?.assets?.name_ar||'جهاز')}</strong><span class="status-tag ok">تم الإغلاق</span></div><p class="muted">${esc(r.visit_items?.visits?.clients?.name_ar||'')} · ${esc(r.visit_items?.assets?.asset_no||'')}</p><p>${esc(r.resolution_notes)}</p><small class="muted">${fmt(r.resolved_at)} · ${esc(r.resolver?.full_name||'المشرف')}</small></article>`).join('')||'<p class="empty">لا توجد إجراءات إغلاق مسجلة بعد.</p>'}</div><div class="form-actions"><button class="btn quiet" onclick="closeSheet()">إغلاق</button></div>`);
}
