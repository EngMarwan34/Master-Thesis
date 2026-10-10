"""UI regression tests using fixture responses; never connects to production Supabase."""
from pathlib import Path
import subprocess, time, json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path('/tmp/ppm-ui-check');OUT.mkdir(exist_ok=True)
MOCK=r'''
const client={id:'c1',name_ar:'فندق نُزُل رويال',name_en:'Nozol Royal',branch:'المدينة المنورة',type:'فندق',city:'المدينة المنورة'};
const asset={id:'a1',client_id:'c1',name_ar:'ثلاجة المطبخ الرئيسية',name_en:'Kitchen refrigerator',asset_no:'NR-001',category:'تبريد',brand:'Electrolux',location_text:'المطبخ الرئيسي',active:true};
const technician={id:'t1',full_name:'مصطفى بسطاوي',role:'technician',active:true,branch:'المدينة المنورة'};
const secondTechnician={id:'t2',full_name:'علي عدنان',role:'technician',active:true,branch:'المدينة المنورة'};
const supervisor={id:'s1',full_name:'مروان صالح ناصر',role:'supervisor',active:true,branch:'المدينة المنورة'};
const visit={id:'v1',client_id:'c1',technician_id:'t1',visit_date:'2026-10-10',check_in:'2026-10-10T08:00:00Z',check_out:'2026-10-10T10:00:00Z',status:'submitted',visit_type:'preventive',clients:client};
const item={id:'i1',asset_id:'a1',visit_id:'v1',condition:'يحتاج قطع غيار',technician_notes:'ضعف في التبريد',parts_needed_text:'ترموستات',photos:[],assets:asset,visits:visit};
const contract={id:'ct1',client_id:'c1',contract_no:'PPM-2026-014',start_date:'2026-01-01',end_date:'2027-12-31',frequency:'شهري',visits_planned:12,clients:client};
window.fixture={profile:supervisor,rpcError:false,calls:[],rows:{clients:[client,{id:'c2',name_ar:'فندق مادن طيبة',type:'فندق',city:'المدينة المنورة'}],profiles:[supervisor,technician,secondTechnician],visits:[visit],assets:[{...asset,clients:client}],visit_items:[item],contracts:[contract],scheduled_visits:[{id:'sc1',contract_id:'ct1',due_date:'2026-01-01',contracts:contract,visits:[],technician_id:'t1'},{id:'sc2',contract_id:'ct1',due_date:'2027-10-10',contracts:contract,visits:[],technician_id:'t1'}]}};
class Query{
 constructor(table){this.table=table;this.filters=[];this.one=false;this.op='select';}
 select(){return this;}order(){return this;}limit(){return this;}neq(k,v){this.filters.push(x=>x[k]!==v);return this;}
 eq(k,v){this.filters.push(x=>x[k]===v);return this;}in(k,vs){this.filters.push(x=>vs.includes(x[k]));return this;}
 single(){this.one=true;return this;}maybeSingle(){this.one=true;return this;}
 upsert(payload){this.op='upsert';this.payload=payload;return this;}insert(payload){this.op='insert';this.payload=payload;return this;}update(payload){this.op='update';this.payload=payload;return this;}delete(){this.op='delete';return this;}
 then(resolve,reject){fixture.calls.push({table:this.table,op:this.op,payload:this.payload});let data=fixture.rows[this.table]||[];
 if(this.table==='profiles'&&this.one)data=[fixture.profile];else data=data.filter(x=>this.filters.every(f=>f(x)));
 if(this.op==='insert'&&this.table==='visits')data=[{id:'newvisit',...this.payload}];
 if(this.table==='visits'&&this.one)data=data[0]||visit;else if(this.one)data=data[0]||null;
 return Promise.resolve({data,error:null,count:this.table==='assets'?data.length:undefined}).then(resolve,reject);}
}
window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'s1'}}}}),signOut:async()=>({}),updateUser:async payload=>({error:null})},from:t=>new Query(t),functions:{invoke:async(name,options)=>{fixture.calls.push({function:name,payload:options.body});return {data:{ok:true},error:null};}},rpc:async(name,payload)=>{
 fixture.calls.push({rpc:name,payload});if(fixture.rpcError)return {error:{message:'fixture failure'}};
 let data=null;if(name==='visit_discussion')data=[];if(name==='reschedule_preventive_visits')data='change1';if(name==='current_faults')data=[item];
 if(name==='visit_team')data=fixture.teamOverride||fixture.rows.profiles.filter(p=>p.id===visit.technician_id).map(p=>({technician_id:p.id,full_name:p.full_name}));
 if(name==='my_open_visits')data=fixture.rows.visits;
 if(name==='record_previous_preventive_visit'){const row=fixture.rows.scheduled_visits.find(r=>r.id===payload.p_schedule_id);row.completed_externally_on=payload.p_completed_on;row.external_notes=payload.p_notes;}
 if(name==='reset_preventive_visit'){const v=fixture.rows.visits.find(v=>v.id===payload.p_visit_id);data=v.scheduled_visit_id;fixture.rows.visits=fixture.rows.visits.filter(v=>v.id!==payload.p_visit_id);fixture.rows.scheduled_visits.find(r=>r.id===data).visits=[];}
 if(name==='start_preventive_visit')data='v1';return {data,error:null};}})};

'''
server=subprocess.Popen(['python3','-m','http.server','8776','--bind','127.0.0.1','--directory',str(ROOT)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 time.sleep(.3)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':1100},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def routes(route):
   if '127.0.0.1' in route.request.url:route.continue_()
   elif 'supabase.js' in route.request.url:route.fulfill(content_type='application/javascript',body=MOCK)
   elif route.request.resource_type=='script':route.fulfill(content_type='application/javascript',body='')
   else:route.abort()
  page.route('**/*',routes)
  page.goto('http://127.0.0.1:8776/')
  page.get_by_role('heading',name='الصيانة تحت السيطرة').wait_for()
  page.evaluate('document.fonts.ready');page.evaluate("document.querySelectorAll('.toast').forEach(t=>t.remove())");page.screenshot(path=str(OUT/'dashboard-desktop.png'),full_page=True)
  page.get_by_role('searchbox',name='البحث عن عميل').fill('رويال')
  assert page.locator('#clientList .item:visible').count()==1
  page.get_by_role('searchbox',name='البحث عن عميل').fill('لايوجد')
  assert page.locator('#noClients').is_visible()
  page.get_by_role('searchbox',name='البحث عن عميل').fill('')
  page.get_by_role('button',name='سجل الإغلاق',exact=True).click()
  page.get_by_role('heading',name='سجل إغلاق الأعطال',exact=True).wait_for()
  page.get_by_role('button',name='إغلاق',exact=True).click()
  page.get_by_role('button',name='إغلاق العطل').click()
  page.locator('#resolutionNotes').fill('استبدال الترموستات واختبار التشغيل')
  page.get_by_role('button',name='تأكيد الإغلاق').click()
  page.wait_for_function("fixture.calls.some(c=>c.table==='fault_resolutions'&&c.op==='insert')")
  page.get_by_role('link',name='جدولة الوقائية',exact=True).click()
  page.get_by_role('heading',name='كل زيارة في موعدها').wait_for()
  assert page.locator('#schedulePeriod').input_value()=='month'
  assert page.locator('#scheduleMonth').input_value()==page.evaluate('todayISO().slice(0,7)')
  assert page.locator('#emptySchedule').is_visible()
  # Date and status filters compose, clear hidden selections, and page matching results.
  page.evaluate("""async()=>{
    fixture.originalSchedule=fixture.rows.scheduled_visits.slice();
    const base=new Date(todayISO()+'T00:00:00Z');
    fixture.rows.scheduled_visits.push(...[-15,-14,-1,0,13,14].map((offset,i)=>{
      const d=new Date(base);d.setUTCDate(d.getUTCDate()+offset);
      return {...fixture.originalSchedule[0],id:'period'+i,due_date:d.toISOString().slice(0,10)};
    }));await schedulePage();
  }""")
  assert page.locator('[data-schedule]:visible').count()==page.evaluate("fixture.rows.scheduled_visits.filter(r=>r.due_date.startsWith(todayISO().slice(0,7))).length")
  page.locator('#schedulePeriod').select_option('next14')
  assert page.locator('[data-schedule]:visible').count()==2
  page.locator('#scheduleFilter').select_option('danger');assert page.locator('#emptySchedule').is_visible()
  page.locator('#scheduleFilter').select_option('all')
  page.locator('#schedulePeriod').select_option('past14');assert page.locator('[data-schedule]:visible').count()==2
  assert page.locator('#scheduleMonthControls').is_hidden()
  page.locator('#schedulePeriod').select_option('month');page.locator('#scheduleMonth').fill('2027-10')
  assert page.locator('[data-schedule]:visible').count()==1
  page.locator('[name=scheduleSelection][value=sc2]').check()
  page.get_by_role('button',name='الشهر السابق',exact=True).click()
  assert page.locator('#scheduleMonth').input_value()=='2027-09'
  assert not page.locator('[name=scheduleSelection][value=sc2]').is_checked()
  page.get_by_role('button',name='الشهر التالي',exact=True).click()
  assert page.locator('#scheduleMonth').input_value()=='2027-10'
  page.get_by_role('button',name='الشهر الحالي',exact=True).click()
  assert page.locator('#scheduleMonth').input_value()==page.evaluate('todayISO().slice(0,7)')
  page.evaluate("async()=>{fixture.rows.scheduled_visits.push(...Array.from({length:42},(_,i)=>({...fixture.originalSchedule[0],id:'large'+i,due_date:todayISO()})));await schedulePage();}")
  page.locator('#schedulePeriod').select_option('next14')
  assert page.locator('[data-schedule]:visible').count()==40
  page.locator('#scheduleMore').click();assert page.locator('[data-schedule]:visible').count()==44
  page.evaluate("async()=>{fixture.rows.scheduled_visits=fixture.originalSchedule;await schedulePage();}")
  page.locator('#schedulePeriod').select_option('all')
  page.evaluate("document.querySelectorAll('.toast').forEach(t=>t.remove())");page.screenshot(path=str(OUT/'schedule-desktop.png'),full_page=True)
  page.locator('#scheduleFilter').select_option('danger');assert page.locator('[data-schedule]:visible').count()==1
  page.locator('#scheduleFilter').select_option('done');assert page.locator('#emptySchedule').is_visible()
  page.locator('#scheduleFilter').select_option('all')
  page.get_by_role('button',name='+ خطة وقائية جديدة').click()
  assert page.locator('#contractNo').count()==0
  page.wait_for_function("document.getElementById('expectedDuration').value==='45'")
  page.locator('#expectedDuration').fill('180')
  page.locator('#contractStart').fill('2026-01-01');page.locator('#contractEnd').fill('2026-04-30');page.locator('#firstVisit').fill('2026-01-31');page.locator('[name=assignedTech][value=t2]').check()
  page.locator('.history-entry [type=checkbox]').first.check()
  page.get_by_role('button',name='حفظ خطة الزيارات').click()
  page.wait_for_function("fixture.calls.some(c=>c.rpc==='create_preventive_plan_with_duration')")
  call=page.evaluate("fixture.calls.find(c=>c.rpc==='create_preventive_plan_with_duration')")
  assert call['payload']['p_dates']==['2026-01-31','2026-02-28','2026-03-31','2026-04-30']
  assert call['payload']['p_technician_ids']==['t1','t2']
  assert call['payload']['p_duration']==180
  assert call['payload']['p_previous'][0]['due_date']=='2026-01-31'
  # Read-only access to another technician's visit.
  page.evaluate("me=fixture.rows.profiles[1];fixture.rows.visits[0].status='draft';fixture.rows.visits[0].technician_id='other';location.hash='#/visit/v1'")
  page.get_by_role('heading',name='زيارة صيانة وقائية',exact=True).wait_for()
  assert page.get_by_role('button',name='إنهاء الزيارة',exact=True).count()==0
  # Assigned second technician can edit the same shared visit.
  page.evaluate("me=fixture.rows.profiles[2];fixture.rows.visits[0].technician_id='t1';fixture.teamOverride=[{technician_id:'t1',full_name:'مصطفى'},{technician_id:'t2',full_name:'علي'}];route()")
  page.get_by_role('button',name='إنهاء الزيارة',exact=True).wait_for()
  # Failed atomic save keeps the form and data; no success is reported.
  page.evaluate("me=fixture.rows.profiles[1];fixture.rows.visits[0].technician_id='t1';route()")
  page.get_by_role('button',name='ثلاجة المطبخ الرئيسية',exact=False).click()
  assert page.locator('.short-checklist select').count()==3
  # The condition labels remain readable in dark mode, including the selected button.
  page.evaluate("personal.theme='dark';applyPersonal()")
  page.wait_for_function("!document.getAnimations().some(a=>a.playState==='running')")
  assert page.locator('#states .state').count()==5
  contrast=page.locator('#states .state').evaluate_all("""buttons=>{
    const luminance=rgb=>{const c=rgb.match(/[\\d.]+/g).slice(0,3).map(Number).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
    return buttons.map(b=>{const s=getComputedStyle(b),a=luminance(s.color),z=luminance(s.backgroundColor);return {text:b.textContent.trim(),background:s.backgroundColor,ratio:(Math.max(a,z)+.05)/(Math.min(a,z)+.05)};});
  }""")
  assert all(b['text'] and b['background']!='rgb(255, 255, 255)' and b['ratio']>=4.5 for b in contrast),contrast
  page.evaluate("document.querySelectorAll('.toast').forEach(t=>t.remove())")
  page.screenshot(path=str(OUT/'inspection-dark.png'))
  page.evaluate("personal.theme='light';applyPersonal()")
  page.locator('#notes').fill('نص يجب ألا يضيع')
  page.evaluate("window._draft.photos=[{url:'https://example.test/photo',type:'general'},{url:'https://example.test/defect',type:'defect'}];fixture.rpcError=true")

  for key in ['operation','safety','service']:
   if page.locator('#check_'+key).count():page.locator('#check_'+key).select_option('yes')
  page.get_by_role('button',name='حفظ الجهاز',exact=True).click()
  page.wait_for_function("document.body.innerText.includes('تعذر الحفظ. بياناتك ما زالت هنا')")
  assert page.locator('#notes').input_value()=='نص يجب ألا يضيع'
  assert not page.locator('#saveItemButton').is_disabled()
  page.evaluate('fixture.rpcError=false')

  for key in ['operation','safety','service']:
   if page.locator('#check_'+key).count():page.locator('#check_'+key).select_option('yes')
  page.get_by_role('button',name='حفظ الجهاز',exact=True).click();page.wait_for_function("!document.querySelector('#sheetEl')")
  # Mobile supervisor dashboard and schedule, and print layout.
  page.evaluate("me=fixture.rows.profiles[0];fixture.rows.visits[0].status='submitted';location.hash='#/'")
  page.get_by_role('heading',name='الصيانة تحت السيطرة').wait_for()
  page.set_viewport_size({'width':390,'height':844});page.evaluate("document.querySelectorAll('.toast').forEach(t=>t.remove())");page.screenshot(path=str(OUT/'dashboard-mobile.png'),full_page=True)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.get_by_role('link',name='جدولة الوقائية',exact=True).click();page.get_by_role('heading',name='كل زيارة في موعدها').wait_for()
  page.locator('#schedulePeriod').select_option('month')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.evaluate("document.querySelectorAll('.toast').forEach(t=>t.remove())");page.screenshot(path=str(OUT/'schedule-mobile.png'),full_page=True)
  page.locator('#schedulePeriod').select_option('all')
  # Record an old visit and verify it disappears from overdue schedules.
  page.get_by_role('button',name='نُفّذت سابقًا').first.click()
  page.locator('#previousDate').fill('2026-01-15');page.locator('#previousNotes').fill('نُفّذت قبل بدء النظام')
  page.get_by_role('button',name='تسجيل الزيارة السابقة',exact=True).click()
  page.wait_for_function("fixture.calls.some(c=>c.rpc==='record_previous_preventive_visit')")
  page.locator('#scheduleFilter').select_option('done');assert page.locator('[data-schedule]:visible').count()==1
  # Supervisor settings: preferences, staff invitations, client/asset editing, and teams.
  page.get_by_role('link',name='الإعدادات',exact=True).click()
  page.get_by_role('heading',name='إعدادات واضحة، تحكم كامل').wait_for()
  page.locator('#displayName').fill('إدارة الصيانة');page.locator('#brandColor').select_option('teal');page.locator('#reminderDays').fill('14')
  page.get_by_role('button',name='حفظ الإعدادات',exact=True).click();page.wait_for_function("fixture.calls.some(c=>c.table==='branch_settings'&&c.op==='upsert')")
  page.evaluate("document.querySelectorAll('.toast').forEach(t=>t.remove())");page.screenshot(path=str(OUT/'settings-mobile.png'),full_page=True)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.get_by_role('link',name='الفنيون',exact=True).click();page.get_by_role('button',name='+ إضافة فني').click()
  page.locator('#newTechnicianName').fill('فني تجريبي');page.locator('#newTechnicianEmail').fill('test@example.test')
  page.get_by_role('button',name='إضافة وإرسال الدعوة').click();page.wait_for_function("fixture.calls.some(c=>c.function==='manage-technicians')")
  page.get_by_role('button',name='تعديل',exact=True).first.click();page.locator('#technicianName').fill('اسم معدل');page.locator('#technicianActive').uncheck()
  page.get_by_role('button',name='حفظ التعديلات',exact=True).click();page.wait_for_function("fixture.calls.some(c=>c.rpc==='update_staff_profile')")
  page.get_by_role('link',name='العملاء',exact=True).click();page.get_by_role('button',name='تعديل البيانات').first.click()
  page.locator('#client_name_ar').fill('اسم عميل معدل');page.get_by_role('button',name='حفظ العميل',exact=True).click();page.wait_for_function("fixture.calls.some(c=>c.table==='clients'&&c.op==='update')")
  page.get_by_role('link',name='الأجهزة',exact=True).click();page.get_by_role('button',name='تعديل',exact=True).click();page.locator('#asset_active').uncheck()

  for key in ['operation','safety','service']:
   if page.locator('#check_'+key).count():page.locator('#check_'+key).select_option('yes')
  page.get_by_role('button',name='حفظ الجهاز',exact=True).click();page.wait_for_function("fixture.calls.some(c=>c.table==='assets'&&c.op==='update')")
  page.get_by_role('link',name='الخطط والفرق',exact=True).click();page.get_by_role('button',name='الموعد والفريق').first.click()
  page.locator('[name=assignedTech][value=t2]').check();page.locator('#editedDueDate').fill('2027-01-01');page.locator('#scheduleReason').fill('تغيير موعد بطلب العميل');page.get_by_role('button',name='حفظ الموعد والفريق',exact=True).click()
  page.wait_for_function("fixture.calls.some(c=>c.rpc==='reschedule_preventive_visits')")
  page.set_viewport_size({'width':1440,'height':1100});page.evaluate("document.querySelectorAll('.toast').forEach(t=>t.remove())");page.screenshot(path=str(OUT/'settings-desktop.png'),full_page=True)
  # Supervisor preview retains unsaved review text and switches report language.
  page.evaluate("fixture.rows.visits[0].status='submitted';location.hash='#/review/v1'")
  page.locator('#rec').fill('توصية لم تُحفظ بعد')
  page.get_by_role('button',name='معاينة التقرير',exact=True).click()
  page.get_by_role('heading',name='معاينة التقرير قبل الاعتماد').wait_for()
  assert page.locator('#reportPreviewContent').inner_text().find('توصية لم تُحفظ بعد')>=0
  page.locator('#previewLanguage').select_option('en')
  assert page.locator('#reportPreviewContent .report').get_attribute('dir')=='ltr'
  assert 'Preventive Maintenance Visit Report' in page.locator('#reportPreviewContent').inner_text()
  assert 'تقرير زيارة صيانة وقائية' not in page.locator('#reportPreviewContent').inner_text()
  page.keyboard.press('Escape');assert page.locator('#rec').input_value()=='توصية لم تُحفظ بعد'
  # Private discussion and exactly three inspection questions.
  page.evaluate("fixture.rows.visits[0].status='draft';location.hash='#/visit/v1'")
  page.locator('#visitComment').fill('ملاحظة تنسيق داخلية')
  page.get_by_role('button',name='إرسال التعليق',exact=True).click()
  page.wait_for_function("fixture.calls.some(c=>c.table==='visit_comments'&&c.op==='insert')")
  page.get_by_role('link',name='جدولة الوقائية',exact=True).click()
  page.locator('#scheduleFilter').select_option('all')
  page.locator('[name=scheduleSelection]').first.check()
  page.get_by_role('button',name='إعادة جدولة المختار',exact=True).click()
  page.locator('#shiftReason').fill('تأجيل بطلب العميل')
  page.locator('#shiftDays').fill('7');assert page.locator('#shiftPreview .item').count()==1
  page.get_by_role('button',name='تأكيد إعادة الجدولة',exact=True).click()
  page.wait_for_function("fixture.calls.some(c=>c.rpc==='reschedule_preventive_visits'&&c.payload.p_reason==='تأجيل بطلب العميل')")
  page.locator('.undo-toast button').last.click()
  page.wait_for_function("fixture.calls.some(c=>c.rpc==='undo_schedule_change')")
  # An accidental empty start needs confirmation; failed requests preserve the visit.
  page.evaluate("""()=>{
    const v={...fixture.rows.visits[0],id:'emptyVisit',status:'draft',check_out:null,scheduled_visit_id:'scReset'};
    fixture.rows.visits.push(v);
    fixture.rows.scheduled_visits.push({...fixture.rows.scheduled_visits[1],id:'scReset',due_date:todayISO(),visits:[{id:v.id,status:v.status}]});
    location.hash='#/visit/emptyVisit';
  }""")
  page.get_by_role('button',name='بدأت الزيارة بالخطأ',exact=True).click()
  page.get_by_role('button',name='الاحتفاظ بالزيارة',exact=True).click()
  assert not page.evaluate("fixture.calls.some(c=>c.rpc==='reset_preventive_visit')")
  page.get_by_role('button',name='بدأت الزيارة بالخطأ',exact=True).click()
  page.evaluate('fixture.rpcError=true')
  page.get_by_role('button',name='تأكيد التراجع عن البدء',exact=True).click()
  page.wait_for_function("document.body.innerText.includes('تعذر التراجع عن البدء')")
  assert not page.get_by_role('button',name='تأكيد التراجع عن البدء',exact=True).is_disabled()
  assert page.evaluate("fixture.rows.visits.some(v=>v.id==='emptyVisit')")
  page.evaluate('fixture.rpcError=false')
  page.get_by_role('button',name='تأكيد التراجع عن البدء',exact=True).click()
  page.get_by_role('heading',name='كل زيارة في موعدها',exact=True).wait_for()
  assert not page.evaluate("fixture.rows.visits.some(v=>v.id==='emptyVisit')")
  assert page.locator('[name=scheduleSelection][value=scReset]').is_visible()
  page.evaluate("location.hash='#/visit/v1'")
  page.get_by_role('button',name='إنهاء الزيارة',exact=True).wait_for()
  assert page.get_by_role('button',name='بدأت الزيارة بالخطأ',exact=True).count()==0
  # Client invitations are separate from technician invitations.
  page.goto('http://127.0.0.1:8776/#/settings/accounts')
  page.get_by_role('button',name='+ حساب عميل',exact=True).click()
  page.locator('#accountName').fill('ممثل العميل');page.locator('#accountEmail').fill('client@example.test')
  page.get_by_role('button',name='إرسال الدعوة',exact=True).click()
  page.wait_for_function("fixture.calls.some(c=>c.function==='manage-client-accounts'&&c.payload.client_id==='c1')")
  # Personal settings save language, appearance and density; navigation keeps accessible names.
  page.get_by_role('link',name='تفضيلاتي',exact=True).click()
  page.locator('#personalLanguage').select_option('en');page.locator('#personalTheme').select_option('dark');page.locator('#personalDensity').select_option('compact')
  page.get_by_role('button',name='حفظ التفضيلات',exact=True).click()
  page.get_by_role('heading',name='My preferences',exact=True).wait_for()
  assert page.locator('html').get_attribute('dir')=='ltr'
  assert page.locator('html').get_attribute('data-theme')=='dark'
  assert page.locator('html').get_attribute('data-density')=='compact'
  page.get_by_role('button',name='Collapse or expand navigation').click()
  assert page.get_by_role('button',name='Collapse or expand navigation').get_attribute('aria-expanded')=='false'
  page.get_by_role('link',name='Dashboard',exact=True).click()
  assert page.locator('html').get_attribute('data-theme')=='dark'
  assert page.locator('.kpi .b').first.evaluate("el=>getComputedStyle(el).backgroundColor!== 'rgb(255, 255, 255)'")
  page.evaluate("document.querySelectorAll('.toast').forEach(t=>t.remove())")
  page.screenshot(path=str(OUT/'professional-dark.png'),full_page=True)
  page.goto('http://127.0.0.1:8776/#/settings/assets')
  page.get_by_role('button',name='Edit',exact=True).click()
  assert page.locator('#asset_category').input_value()=='تبريد'
  assert 'Refrigeration' in page.locator('#asset_category').inner_text()
  page.keyboard.press('Escape')
  page.get_by_role('link',name='My preferences',exact=True).click()
  page.locator('#personalLanguage').select_option('ar');page.locator('#personalTheme').select_option('light')
  page.get_by_role('button',name='Save preferences',exact=True).click()
  page.set_viewport_size({'width':390,'height':844})
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  page.evaluate("document.querySelectorAll('.toast').forEach(t=>t.remove())")
  page.screenshot(path=str(OUT/'professional-mobile.png'),full_page=True)
  page.set_viewport_size({'width':1440,'height':1100})
  page.evaluate("fixture.rows.clients.push(...Array.from({length:61},(_,i)=>({id:'extra'+i,name_ar:'عميل '+i,city:'المدينة'})));location.hash='#/'")
  page.wait_for_function("document.querySelectorAll('#clientList .item').length===63")
  assert page.locator('#clientList .item:visible').count()==40
  page.get_by_role('searchbox',name='البحث عن عميل').fill('عميل 60')
  assert page.locator('#clientList .item:visible').count()==1
  page.get_by_role('searchbox',name='البحث عن عميل').fill('')
  assert page.locator('#clientList .item:visible').count()==40
  page.locator('#clientList + .list-more').click()
  assert page.locator('#clientList .item:visible').count()==63
  page.evaluate("fixture.rows.visits[0].status='approved';location.hash='#/report/v1'")
  page.get_by_role('heading',name='تقرير زيارة صيانة وقائية').wait_for()
  page.locator('#reportLanguage').select_option('ar');assert page.locator('.report').get_attribute('dir')=='rtl'
  page.locator('#reportLanguage').select_option('en');assert page.locator('.report').get_attribute('dir')=='ltr'
  page.locator('#reportLanguage').select_option('bilingual')
  page.emulate_media(media='print');page.pdf(path=str(OUT/'report.pdf'),format='A4')
  assert (OUT/'report.pdf').stat().st_size>1000
  assert not errors,errors
  print('PASS current-month/two-week filters, month navigation, filtered pagination, hidden selection clearing, dark inspection contrast, accidental-start confirmation/failure/retry, desktop/mobile and existing workspace workflows')
  print('Screenshots:',OUT)
  browser.close()
finally:server.terminate();server.wait()
