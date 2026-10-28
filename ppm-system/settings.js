const defaultPreferences={display_name:'المحتسب',support_phone:'',brand_color:'blue',reminder_days:7,default_frequency:1};
let preferences={...defaultPreferences};
async function loadPreferences(){
  if(me.role==='client')return;
  const {data,error}=await sb.from('branch_settings').select('*').eq('branch',me.branch).maybeSingle();
  if(error)throw new Error('تعذر تحميل إعدادات الفرع. تأكد من تطبيق الترقية 007.');
  preferences={...defaultPreferences,...data};applyPreferences();
}
function applyPreferences(){
  const colors={blue:['#255ee8','#194bc4','#edf2ff'],teal:['#087b70','#076358','#e8f6f3'],purple:['#6d48bd','#543495','#f2edfb']};
  const palette=colors[preferences.brand_color]||colors.blue;
  ['--brand','--brand-deep','--brand-soft'].forEach((key,i)=>document.documentElement.style.setProperty(key,palette[i]));
}
function reminderEnd(){const date=new Date(todayISO()+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+preferences.reminder_days);return date.toISOString().slice(0,10);}
async function settingsPage(tab='general'){
  if(me.role!=='supervisor')return homePage();
  const tabs={general:'عام',users:'الفنيون',clients:'العملاء',assets:'الأجهزة',plans:'الخطط والفرق'};
  if(!tabs[tab])tab='general';
  let body=`<section class="settings-intro"><span class="eyebrow">إدارة الفرع</span><h2>إعدادات واضحة، تحكم كامل</h2><p class="muted">أدر الفنيين والعملاء والأجهزة وخطط الصيانة من مكان واحد.</p></section><nav class="settings-tabs" aria-label="أقسام الإعدادات">${Object.entries(tabs).map(([key,label])=>`<a href="#/settings/${key}" class="${key===tab?'active':''}">${label}</a>`).join('')}</nav>`;
  if(tab==='general')body+=generalSettings();
  if(tab==='users')body+=await userSettings();
  if(tab==='clients')body+=await clientSettings();
  if(tab==='assets')body+=await assetSettings();
  if(tab==='plans')body+=await planSettings();
  shell('الإعدادات',body);
}
function generalSettings(){
  return `<div class="card"><h3>هوية الفرع وتفضيلات المتابعة</h3><form onsubmit="savePreferences(event)"><div class="grid2"><div><label for="displayName">اسم المنشأة في مساحة العمل</label><input id="displayName" required maxlength="80" value="${esc(preferences.display_name)}"></div><div><label for="supportPhone">هاتف التواصل</label><input id="supportPhone" type="tel" maxlength="40" value="${esc(preferences.support_phone)}"></div><div><label for="brandColor">لون الواجهة</label><select id="brandColor">${[['blue','أزرق'],['teal','أخضر'],['purple','بنفسجي']].map(([v,l])=>`<option value="${v}" ${v===preferences.brand_color?'selected':''}>${l}</option>`).join('')}</select></div><div><label for="reminderDays">تنبيه داخل اللوحة قبل الموعد بـ (أيام)</label><input id="reminderDays" type="number" min="0" max="30" value="${preferences.reminder_days}" required></div><div><label for="defaultFrequency">الدورية الافتراضية للخطة الجديدة</label><select id="defaultFrequency">${[[1,'شهري'],[3,'ربع سنوي'],[6,'نصف سنوي'],[12,'سنوي']].map(([v,l])=>`<option value="${v}" ${v===preferences.default_frequency?'selected':''}>${l}</option>`).join('')}</select></div><div><label>الفرع</label><input readonly value="${esc(me.branch)}"></div></div><div class="form-actions"><button type="submit" class="btn">حفظ الإعدادات</button></div></form></div><div class="card"><h3>أمان حسابي</h3><p class="muted">غيّر كلمة مرور حسابك. إدارة حسابات الفنيين متاحة في قسم الفنيين.</p><button class="btn quiet" onclick="ownPasswordForm()">تغيير كلمة مروري</button></div>`;
}
async function savePreferences(event){
  event.preventDefault();const data={branch:me.branch,display_name:$('#displayName').value.trim(),support_phone:$('#supportPhone').value.trim(),brand_color:$('#brandColor').value,reminder_days:+$('#reminderDays').value,default_frequency:+$('#defaultFrequency').value,updated_at:new Date().toISOString()};
  const button=event.target.querySelector('[type=submit]');button.disabled=true;
  try{const {error}=await sb.from('branch_settings').upsert(data);if(error)throw error;preferences={...defaultPreferences,...data};applyPreferences();toast('حُفظت إعدادات الفرع');await route();}
  catch(e){toast('تعذر الحفظ: '+e.message);button.disabled=false;}
}
function ownPasswordForm(){
  openSheet(`<h2>تغيير كلمة المرور</h2><form onsubmit="saveOwnPassword(event)"><label for="ownPassword">كلمة المرور الجديدة</label><input id="ownPassword" type="password" required minlength="8" autocomplete="new-password"><label for="ownPasswordConfirm">تأكيد كلمة المرور</label><input id="ownPasswordConfirm" type="password" required minlength="8" autocomplete="new-password"><div class="form-actions"><button type="button" class="btn quiet" onclick="closeSheet()">إلغاء</button><button type="submit" class="btn">حفظ كلمة المرور</button></div></form>`);
}
async function saveOwnPassword(event){
  event.preventDefault();const password=$('#ownPassword').value;if(password!==$('#ownPasswordConfirm').value)return toast('كلمتا المرور غير متطابقتين');
  const button=event.target.querySelector('[type=submit]');button.disabled=true;
  const {error}=await sb.auth.updateUser({password});if(error){button.disabled=false;return toast('تعذر التغيير: '+error.message);}closeSheet();toast('تم تغيير كلمة المرور');
}
async function userSettings(){
  const {data,error}=await sb.from('profiles').select('id,full_name,full_name_en,full_name_en_auto,phone,active,language').eq('role','technician').order('full_name');if(error)throw error;window._settingsTechnicians=data;
  return `<div class="card"><div class="spread"><h3>فنيّو الفرع</h3><button class="btn" onclick="inviteTechnicianForm()">+ إضافة فني</button></div><p class="muted">الفني الموقوف لا يستطيع تعديل الزيارات. تبقى زياراته السابقة محفوظة. الاسم بالإنجليزية يظهر في التقرير الإنجليزي — إن تُرك فارغاً يُحوَّل تلقائياً من الاسم العربي.</p><div class="list">${data.map(t=>`<div class="item"><span class="avatar">${esc(t.full_name.slice(0,1))}</span><span class="body"><span class="t">${esc(t.full_name)}</span><span class="s">${esc(t.full_name_en||t.full_name_en_auto||'')}${t.full_name_en?'':(t.full_name_en_auto?' (تلقائي)':' — لا يوجد اسم إنجليزي بعد')} · ${esc(t.phone||'لا يوجد هاتف')}</span></span><span class="status-tag ${t.active?'ok':'neutral'}">${t.active?'مفعّل':'موقوف'}</span><button class="btn quiet sm" onclick="editTechnician('${t.id}')">تعديل</button></div>`).join('')||'<p class="empty">أضف أول فني في فرعك.</p>'}</div></div>`;
}
function inviteTechnicianForm(){
  openSheet(`<div class="sheet-heading"><span class="eyebrow">عضو جديد في فريق الصيانة</span><h2>إضافة فني</h2><p class="muted">تصل دعوة إلى بريد الفني ليختار كلمة مروره. يُضاف إلى فرعك بصلاحية فني.</p></div><form onsubmit="inviteTechnician(event)"><label for="newTechnicianName">الاسم الكامل</label><input id="newTechnicianName" required maxlength="100"><label for="newTechnicianEmail">البريد الإلكتروني</label><input id="newTechnicianEmail" type="email" required autocomplete="email"><label for="newTechnicianPhone">الهاتف</label><input id="newTechnicianPhone" type="tel" maxlength="40"><div class="form-actions"><button type="button" class="btn quiet" onclick="closeSheet()">إلغاء</button><button type="submit" class="btn">إضافة وإرسال الدعوة</button></div></form>`);
}
async function inviteTechnician(event){
  event.preventDefault();const form=event.target,button=form.querySelector('[type=submit]');button.disabled=true;
  try{
    const {data,error}=await sb.functions.invoke('manage-technicians',{body:{full_name:$('#newTechnicianName').value,email:$('#newTechnicianEmail').value,phone:$('#newTechnicianPhone').value,...(form.dataset.pendingUser?{pending_user_id:form.dataset.pendingUser}:{})}});
    let result=data;if(error?.context instanceof Response)result=await error.context.clone().json().catch(()=>null);
    if(result?.pending_user_id){form.dataset.pendingUser=result.pending_user_id;$('#newTechnicianEmail').readOnly=true;button.textContent='إكمال ربط حساب الفني';}
    if(error||result?.error)throw new Error(result?.error||'تعذر إضافة الفني. تأكد من تفعيل خدمة إضافة الفنيين.');
    if(result?.id) transliterateNameAsync(result.id,$('#newTechnicianName').value);
    closeSheet();toast('أُضيف الفني وأُرسلت دعوة إلى بريده');await route();
  }catch(e){toast(e.message,6000);button.disabled=false;}
}
function editTechnician(id){
  const t=window._settingsTechnicians.find(t=>t.id===id);
  openSheet(`<h2>تعديل الفني</h2><form onsubmit="saveTechnician(event,'${id}')"><label for="technicianName">الاسم الكامل</label><input id="technicianName" required maxlength="100" value="${esc(t.full_name)}"><label for="technicianNameEn">الاسم بالإنجليزية (يظهر في التقرير الإنجليزي)</label><input id="technicianNameEn" maxlength="100" value="${esc(t.full_name_en||'')}" placeholder="${esc(t.full_name_en_auto||'اتركه فاضياً للتحويل التلقائي')}"><label for="technicianPhone">الهاتف</label><input id="technicianPhone" type="tel" maxlength="40" value="${esc(t.phone||'')}"><label for="technicianLanguage">لغة الواجهة</label><select id="technicianLanguage"><option value="ar" ${t.language!=='en'?'selected':''}>عربي</option><option value="en" ${t.language==='en'?'selected':''}>English</option></select><label class="team-option"><input id="technicianActive" type="checkbox" ${t.active?'checked':''}><span>الحساب مفعّل</span></label><p class="muted">إيقاف الحساب يمنع الوصول لبيانات الفرع دون حذف سجلاته.</p><div class="form-actions"><button type="button" class="btn quiet" onclick="closeSheet()">إلغاء</button><button type="submit" class="btn">حفظ التعديلات</button></div></form>`);
}
async function saveTechnician(event,id){
  event.preventDefault();const nameAr=$('#technicianName').value,nameEn=$('#technicianNameEn').value.trim();
  await settingsMutation(event,()=>sb.rpc('update_staff_profile',{p_id:id,p_full_name:nameAr,p_phone:$('#technicianPhone').value,p_active:$('#technicianActive').checked,p_language:$('#technicianLanguage').value,p_full_name_en:nameEn}));
  if(!nameEn) transliterateNameAsync(id,nameAr);
}
/* تحويل احتياطي للاسم العربي لحروف لاتينية بالذكاء الاصطناعي — فقط إن
   تُرك الاسم الإنجليزي فارغاً. لا تنتظره الواجهة ولا يمنع حفظ الفني أبداً. */
async function transliterateNameAsync(profileId,fullNameAr){
  if(!(fullNameAr||'').trim()) return;
  try{
    const {data,error}=await sb.functions.invoke('transliterate-name',{body:{items:[{id:'x',text:fullNameAr}]}});
    if(error) throw error;
    const r=(data?.items||[])[0];if(!r?.name_en) return;
    await sb.rpc('set_profile_name_en_auto',{p_id:profileId,p_name_en_auto:r.name_en});
  }catch(e){ console.error('transliterateNameAsync failed',e); }
}
async function clientSettings(){
  const {data,error}=await sb.from('clients').select('*').order('name_ar');if(error)throw error;window._settingsClients=data;
  return `<div class="card"><div class="spread"><h3>بيانات العملاء</h3><button class="btn" onclick="settingsClientForm()">+ إضافة عميل</button></div><div class="list">${data.map(c=>`<div class="item"><span class="body"><span class="t">${esc(c.name_ar)}</span><span class="s">${esc(c.name_en||'')} · ${esc(c.city||'')} · ${esc(c.contact_phone||'')}</span></span><a class="btn quiet sm" href="#/client/${c.id}">فتح</a><button class="btn quiet sm" onclick="settingsClientForm('${c.id}')">تعديل البيانات</button></div>`).join('')||'<p class="empty">لا يوجد عملاء بعد.</p>'}</div></div>`;
}
function settingsClientForm(id=null){
  const c=id?window._settingsClients.find(c=>c.id===id):{};
  openSheet(`<h2>${id?'تعديل العميل':'إضافة عميل'}</h2><form onsubmit="saveSettingsClient(event,${id?`'${id}'`:'null'})">${[['name_ar','اسم العميل','text',true],['name_en','الاسم بالإنجليزية','text'],['type','نوع العميل','text'],['city','المدينة','text'],['contact_name','اسم مسؤول التواصل','text'],['contact_phone','هاتف التواصل','tel']].map(([key,label,type,required])=>`<label for="client_${key}">${label}</label><input id="client_${key}" type="${type}" ${required?'required':''} maxlength="200" value="${esc(c[key]||'')}">`).join('')}<div class="form-actions"><button type="button" class="btn quiet" onclick="closeSheet()">إلغاء</button><button type="submit" class="btn">حفظ العميل</button></div></form>`);
}
async function saveSettingsClient(event,id){
  event.preventDefault();const values=Object.fromEntries(['name_ar','name_en','type','city','contact_name','contact_phone'].map(key=>[key,$('#client_'+key).value.trim()]));
  if(!values.name_ar)return toast('أدخل اسم العميل');
  await settingsMutation(event,()=>id?sb.from('clients').update(values).eq('id',id):sb.from('clients').insert({...values,branch:me.branch}));
}
async function assetSettings(){
  const {data,error}=await sb.from('assets').select('*,clients(name_ar)').order('asset_no');if(error)throw error;window._settingsAssets=data;
  return `<div class="card"><div class="spread"><h3>الأجهزة والأصول</h3><a class="btn quiet" href="#/">إضافة جهاز من صفحة العميل</a></div>
    <div class="row" style="margin-bottom:8px">
      <button class="btn ghost sm" onclick="findMissingArabicNames()">إكمال الأسماء الناقصة بالذكاء الاصطناعي</button>
      <button class="btn ghost sm" onclick="findBrandModelDuplicates()">تنظيف الماركة والموديل المكررة</button>
    </div>
    <div class="search-field">${icon('search')}<input type="search" aria-label="البحث عن جهاز" placeholder="اسم الجهاز، رقم الأصل أو العميل…" oninput="filterSettingsAssets(this.value)"></div><div class="list">${data.map(a=>`<div class="item" data-asset-search="${esc(a.name_ar+' '+a.asset_no+' '+(a.clients?.name_ar||''))}"><span class="body"><span class="t">${esc(a.name_ar)}${a.name_ar_auto?' <span class="muted" style="font-size:11px">(اسم مترجَم تلقائياً — يحتاج مراجعة)</span>':''}</span><span class="s">${esc(a.asset_no)} · ${esc(a.clients?.name_ar||'')} · ${esc(a.location_text||'')}</span></span><span class="status-tag ${a.active?'ok':'neutral'}">${a.active?'نشط':'مؤرشف'}</span><button class="btn quiet sm" onclick="settingsAssetForm('${a.id}')">تعديل</button></div>`).join('')||'<p class="empty">لا توجد أجهزة بعد.</p>'}</div><p id="noSettingsAssets" class="empty" hidden>لا توجد نتائج مطابقة.</p></div>`;
}
/* ---------------------- تنظيف الكلمات المكررة في الماركة/الموديل ---------------------- */
function dedupPhrase(s){
  if(!s) return s;
  const words=s.trim().split(/\s+/);
  const n=words.length;
  if(n<2 || n%2!==0) return s;
  const half=n/2;
  const a=words.slice(0,half).join(' ').toLowerCase();
  const b=words.slice(half).join(' ').toLowerCase();
  return a===b ? words.slice(0,half).join(' ') : s;
}
function findBrandModelDuplicates(){
  const rows=(window._settingsAssets||[]).map(a=>({asset:a, brand:dedupPhrase(a.brand), model:dedupPhrase(a.model)}))
    .filter(r=>r.brand!==(r.asset.brand||null) || r.model!==(r.asset.model||null));
  if(!rows.length) return toast('لا توجد ماركات أو موديلات مكررة');
  window._brandModelFixes=rows;
  openSheet(`<h2>تنظيف الماركة والموديل (${rows.length})</h2>
    <p class="muted">سيُطبَّق فقط على الحقول المعروضة أدناه — لا يتغيّر رقم الأصل ولا رمز الباركود.</p>
    <div class="list" style="max-height:60vh;overflow:auto">${rows.map(r=>`
      <div class="item"><span class="body">
        <span class="s">${esc(r.asset.asset_no)} · ${esc(r.asset.clients?.name_ar||'')}</span>
        ${r.brand!==(r.asset.brand||null)?`<span class="t">${esc(r.asset.brand||'')} ← ${esc(r.brand||'')}</span>`:''}
        ${r.model!==(r.asset.model||null)?`<span class="t">${esc(r.asset.model||'')} ← ${esc(r.model||'')}</span>`:''}
      </span></div>`).join('')}</div>
    <div class="form-actions"><button type="button" class="btn quiet" onclick="closeSheet()">إلغاء</button>
    <button class="btn" onclick="applyBrandModelFixes()">تطبيق التنظيف</button></div>`);
}
async function applyBrandModelFixes(){
  const rows=window._brandModelFixes||[];
  try{
    for(const r of rows){
      const {error}=await sb.from('assets').update({brand:r.brand,model:r.model}).eq('id',r.asset.id);
      if(error) throw error;
    }
    closeSheet(); toast(`تم تنظيف ${rows.length} سجلاً`); await route();
  }catch(e){ toast('تعذر الحفظ: '+(e.message||'')); }
}
/* ---------------------- إكمال الأسماء العربية الناقصة بالذكاء الاصطناعي ---------------------- */
function looksLikeMissingArabicName(a){
  const ar=(a.name_ar||'').trim(); const en=(a.name_en||'').trim();
  if(!ar) return false;
  const hasArabicChars=/[؀-ۿ]/.test(ar);
  if(!hasArabicChars) return true;
  if(en && ar.toLowerCase()===en.toLowerCase()) return true;
  return false;
}
async function findMissingArabicNames(){
  const candidates=(window._settingsAssets||[]).filter(looksLikeMissingArabicName);
  if(!candidates.length) return toast('كل الأجهزة لها اسم عربي مختلف عن الإنجليزي');
  openSheet(`<h2>إكمال الأسماء الناقصة</h2><p class="muted">جارٍ توليد مقترحات بالذكاء الاصطناعي لـ ${candidates.length} جهازاً…</p>`);
  try{
    const items=candidates.map(a=>({id:a.id,text:a.name_en||a.name_ar}));
    const CHUNK=80; const results=new Map();
    for(let i=0;i<items.length;i+=CHUNK){
      const batch=items.slice(i,i+CHUNK);
      const {data,error}=await sb.functions.invoke('translate-text',{body:{items:batch}});
      if(error) throw error;
      (data?.items||[]).forEach(r=>results.set(r.id,r));
    }
    window._nameSuggestions=candidates.map(a=>({asset:a, suggested:results.get(a.id)?.text_ar||a.name_ar}));
    renderNameSuggestionsReview();
  }catch(e){ closeSheet(); toast('تعذر توليد المقترحات: '+(e.message||'')); }
}
function renderNameSuggestionsReview(){
  const rows=window._nameSuggestions||[];
  openSheet(`<h2>راجع الأسماء المقترحة (${rows.length})</h2>
    <p class="muted">لن يتغيّر رقم الأصل ولا رمز الباركود لأي جهاز. عدّل المقترح إذا احتجت، ثم احفظ المعتمد فقط.</p>
    <div class="list" style="max-height:60vh;overflow:auto">${rows.map((r,i)=>`
      <div class="item" style="align-items:center">
        <label class="team-option"><input type="checkbox" id="nameInc_${i}" checked></label>
        <span class="body">
          <span class="s">${esc(r.asset.asset_no)} · ${esc(r.asset.clients?.name_ar||'')} · ${esc(r.asset.name_en||r.asset.name_ar)}</span>
          <input id="nameSug_${i}" value="${esc(r.suggested)}" style="margin-top:6px">
        </span>
      </div>`).join('')}</div>
    <div class="form-actions"><button type="button" class="btn quiet" onclick="closeSheet()">إلغاء</button>
    <button class="btn" onclick="applyNameSuggestions()">حفظ المعتمد</button></div>`);
}
async function applyNameSuggestions(){
  const rows=window._nameSuggestions||[];
  const updates=[];
  rows.forEach((r,i)=>{
    if($('#nameInc_'+i)?.checked){
      const val=($('#nameSug_'+i)?.value||'').trim();
      if(val) updates.push({id:r.asset.id,name_ar:val});
    }
  });
  if(!updates.length) return toast('لم تختر أي صف');
  try{
    for(const u of updates){
      const {error}=await sb.from('assets').update({name_ar:u.name_ar,name_ar_auto:true}).eq('id',u.id);
      if(error) throw error;
    }
    closeSheet(); toast(`تم تحديث ${updates.length} اسماً`); await route();
  }catch(e){ toast('تعذر الحفظ: '+(e.message||'')); }
}
function filterSettingsAssets(query){let count=0;document.querySelectorAll('[data-asset-search]').forEach(el=>{el.hidden=!el.dataset.assetSearch.toLowerCase().includes(query.trim().toLowerCase());if(!el.hidden)count++;});$('#noSettingsAssets').hidden=count>0;}
function settingsAssetForm(id){
  const a=window._settingsAssets.find(a=>a.id===id);
  openSheet(`<h2>تعديل بيانات الجهاز</h2><p class="muted">${esc(a.clients?.name_ar||'')}</p>${a.name_ar_auto?'<div class="card" style="background:#FEF6E7;border-color:var(--maint);padding:10px;margin-bottom:10px"><b style="color:var(--maint)">تنبيه:</b> الاسم العربي عُبّئ تلقائياً بالذكاء الاصطناعي — راجعه.</div>':''}<form onsubmit="saveSettingsAsset(event,'${id}')"><div class="grid2">${[['asset_no','رقم الأصل'],['name_ar','اسم الجهاز'],['name_en','الاسم بالإنجليزية'],['brand','الماركة'],['model','الموديل'],['serial_no','الرقم التسلسلي'],['location_text','الموقع'],['location_text_en','الموقع بالإنجليزية']].map(([key,label])=>`<div><label for="asset_${key}">${label}</label><input id="asset_${key}" ${['asset_no','name_ar'].includes(key)?'required':''} maxlength="200" value="${esc(a[key]||'')}"></div>`).join('')}<div><label for="asset_category">الفئة</label><select id="asset_category">${CATS.map(c=>`<option ${c===a.category?'selected':''}>${c}</option>`).join('')}</select></div></div><label class="team-option"><input type="checkbox" id="asset_active" ${a.active?'checked':''}><span>جهاز نشط في الزيارات الجديدة</span></label><p class="muted">إلغاء التفعيل يؤرشف الجهاز ويحافظ على سجله السابق.</p><div class="form-actions"><button type="button" class="btn quiet" onclick="closeSheet()">إلغاء</button><button type="submit" class="btn">حفظ الجهاز</button></div></form>`);
}
async function saveSettingsAsset(event,id){
  event.preventDefault();const values=Object.fromEntries(['asset_no','name_ar','name_en','brand','model','serial_no','location_text','location_text_en','category'].map(key=>[key,$('#asset_'+key).value.trim()]));values.active=$('#asset_active').checked;
  values.brand=dedupPhrase(values.brand);values.model=dedupPhrase(values.model);values.name_ar_auto=false;
  if(!values.name_ar||!values.asset_no)return toast('أدخل الاسم ورقم الأصل');await settingsMutation(event,()=>sb.from('assets').update(values).eq('id',id));
}
async function planSettings(){
  const [plans,rows,visits]=await Promise.all([sb.from('contracts').select('*,clients(name_ar)').order('end_date'),sb.from('scheduled_visits').select('*,contracts(*,clients(name_ar)),scheduled_visit_technicians(technician_id),visits!scheduled_visit_id(id,status)').order('due_date'),sb.from('visits').select('*,clients(name_ar)').eq('visit_type','preventive').in('status',['draft','rejected']).order('visit_date',{ascending:false})]);
  if(plans.error||rows.error||visits.error)throw plans.error||rows.error||visits.error;
  window._settingsPlans=plans.data;window._scheduleRows=rows.data;window._settingsVisits=visits.data;
  return `<div class="card"><div class="spread"><h3>خطط الوقائية</h3><a class="btn" href="#/schedule">الجدولة والزيارات السابقة</a></div><div class="list">${plans.data.map(c=>`<div class="item"><span class="body"><span class="t">${esc(c.clients.name_ar)}</span><span class="s">${fmt(c.start_date)} — ${fmt(c.end_date)} · ${esc(c.frequency||'')}</span></span><button class="btn quiet sm" onclick="settingsPlanForm('${c.id}')">تعديل الفترة</button></div>`).join('')||'<p class="empty">لا توجد خطط بعد.</p>'}</div></div><div class="card"><h3>المواعيد وفرق العمل</h3><p class="muted">يمكن تعديل الموعد والفريق قبل بدء الزيارة.</p><div class="list">${rows.data.filter(r=>!r.visits?.length&&!r.completed_externally_on).map(r=>`<div class="item"><span class="body"><span class="t">${esc(r.contracts.clients.name_ar)}</span><span class="s">${fmt(r.due_date)}</span></span><button class="btn quiet sm" onclick="editScheduledTeam('${r.id}')">الموعد والفريق</button></div>`).join('')||'<p class="empty">لا توجد مواعيد قابلة للتعديل.</p>'}</div></div><div class="card"><h3>فرق الزيارات الجارية</h3><div class="list">${visits.data.map(v=>`<div class="item"><span class="body"><span class="t">${esc(v.clients.name_ar)}</span><span class="s">${fmt(v.visit_date)}</span></span><button class="btn quiet sm" onclick="editCurrentVisitTeam('${v.id}')">تعديل فريق الزيارة</button></div>`).join('')||'<p class="empty">لا توجد زيارات جارية.</p>'}</div></div>`;
}
function settingsPlanForm(id){
  const c=window._settingsPlans.find(c=>c.id===id);
  openSheet(`<h2>فترة الصيانة · ${esc(c.clients.name_ar)}</h2><form onsubmit="saveSettingsPlan(event,'${id}')"><label for="planStart">بداية الفترة</label><input id="planStart" type="date" required value="${c.start_date||''}"><label for="planEnd">نهاية الفترة</label><input id="planEnd" type="date" required value="${c.end_date||''}"><label for="planFrequency">الدورية</label><select id="planFrequency">${['شهري','ربع سنوي','نصف سنوي','سنوي'].map(f=>`<option ${f===c.frequency?'selected':''}>${f}</option>`).join('')}</select><p class="muted">تغيير الدورية لا يعيد جدولة المواعيد الموجودة. يمكن تعديلها من المواعيد وفرق العمل.</p><div class="form-actions"><button type="button" class="btn quiet" onclick="closeSheet()">إلغاء</button><button type="submit" class="btn">حفظ الفترة</button></div></form>`);
}
async function saveSettingsPlan(event,id){event.preventDefault();await settingsMutation(event,()=>sb.rpc('update_preventive_plan',{p_id:id,p_start_date:$('#planStart').value,p_end_date:$('#planEnd').value,p_frequency:$('#planFrequency').value}));}
async function editScheduledTeam(id){
  const row=window._scheduleRows.find(r=>r.id===id),{data,error}=await sb.from('profiles').select('id,full_name').eq('role','technician').eq('active',true);if(error)return toast('تعذر تحميل الفنيين');window._technicians=data;
  openSheet(`<h2>موعد وفريق · ${esc(row.contracts.clients.name_ar)}</h2><form onsubmit="saveScheduledTeam(event,'${id}')"><label for="editedDueDate">الموعد</label><input id="editedDueDate" type="date" required min="${row.contracts.start_date}" max="${row.contracts.end_date}" value="${row.due_date}">${technicianFields((row.scheduled_visit_technicians||[]).map(t=>t.technician_id))}<div class="form-actions"><button type="button" class="btn quiet" onclick="closeSheet()">إلغاء</button><button type="submit" class="btn">حفظ الموعد والفريق</button></div></form>`);
}
async function saveScheduledTeam(event,id){event.preventDefault();if(!selectedTechnicians().length)return toast('اختر فنيًا واحدًا على الأقل');await settingsMutation(event,()=>sb.rpc('update_schedule_team',{p_schedule_id:id,p_technician_ids:selectedTechnicians(),p_due_date:$('#editedDueDate').value}));}
async function editCurrentVisitTeam(id){
  const [tech,team]=await Promise.all([sb.from('profiles').select('id,full_name').eq('role','technician').eq('active',true),sb.rpc('visit_team',{p_visit_id:id})]);if(tech.error||team.error)return toast('تعذر تحميل الفريق');window._technicians=tech.data;
  openSheet(`<h2>فريق الزيارة الجارية</h2><form onsubmit="saveCurrentVisitTeam(event,'${id}')">${technicianFields(team.data.map(t=>t.technician_id))}<div class="form-actions"><button type="button" class="btn quiet" onclick="closeSheet()">إلغاء</button><button type="submit" class="btn">حفظ الفريق</button></div></form>`);
}
async function saveCurrentVisitTeam(event,id){event.preventDefault();if(!selectedTechnicians().length)return toast('اختر فنيًا واحدًا على الأقل');await settingsMutation(event,()=>sb.rpc('update_visit_team',{p_visit_id:id,p_technician_ids:selectedTechnicians()}));}
async function settingsMutation(event,operation){
  const button=event.target.querySelector('[type=submit]');button.disabled=true;
  try{const {error}=await operation();if(error)throw error;closeSheet();toast('حُفظت التعديلات');await route();}
  catch(e){toast('تعذر الحفظ: '+e.message,5000);button.disabled=false;}
}
