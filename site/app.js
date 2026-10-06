"use strict";
const DAYS = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const pd = s => { if (!s) return null; const d = new Date(s + "T00:00:00Z"); return isNaN(d) ? null : d; };
const fmt = d => d ? d.toISOString().slice(0,10).replace(/-/g,"/") : "";
const dayName = d => d ? DAYS[d.getUTCDay()] : "";
const num = v => (v === "" || v == null || isNaN(+v)) ? null : +v;
const nz = v => v == null ? "" : (Math.round(v*100)/100);
function hoursBetween(a, b) {
  if (!a || !b) return null;
  const [h1,m1] = a.split(":").map(Number), [h2,m2] = b.split(":").map(Number);
  let h = (h2*60+m2 - h1*60 - m1) / 60; if (h < 0) h += 24;
  return Math.round(h*100)/100;
}
const emptyRows = n => Array.from({length:n}, () => ({}));
const pad = (rows, n) => Array.from({length:n}, (_, i) => rows[i] || {});
const sig = (...t) => `<div class="sig">${t.map(x=>`<span>${x}</span>`).join("")}</div>`;
const mark = `<span style="font-size:18px">✔</span>`;

/* ---------------- definitions ---------------- */
const FORMS = {
 overtime: {
  title: "كشف الساعات الإضافية", file: "كشف_الساعات_الاضافية",
  fields: [["from","من تاريخ","date"],["to","إلى تاريخ","date"],["branch","الإدارة / الفرع","text","بجده"],["dept","القسم","text","المالية"],["project","اسم المشروع","text"],["project_no","رقم المشروع","text"]],
  pics: [["old",[0,68581,0,60960],[6,754380,7,191135]]],
  nrows: 14,
  cols: [["name","الاسم","text"],["date","التاريخ","date"],["start","من","time"],["end","إلى","time"],["hours","ساعات (تلقائي)","number"]],
  hint: "اليوم يُحسب من التاريخ، والساعات من الفرق بين الوقتين إن تركتها فارغة.",
  hrs: r => num(r.hours) ?? hoursBetween(r.start, r.end),
  render(d) {
    const rows = pad(d.rows, 14); let tot = 0;
    const body = rows.map((r,i) => { const h = this.hrs(r); if (h) tot += h; const dt = pd(r.date);
      return `<tr><td>${i+1}</td><td>${esc(r.name)}</td><td>${dayName(dt)}</td><td>${fmt(dt)}</td><td>${esc(r.start)}</td><td>${esc(r.end)}</td><td>${nz(h)}</td></tr>`; }).join("");
    return `<img class="hd" src="${IMG.old}">
    <div class="t1">كشف اجمالي ساعات العمل الاضافيه</div>
    <div class="t1">عن الفتره من :- ${fmt(pd(d.from))} الي ${fmt(pd(d.to))}</div>
    <div class="ln" style="margin-top:14px">الاداره :- ${esc(d.branch)}</div>
    <div class="ln">القسم :- ${esc(d.dept)}</div>
    <div class="ln" style="display:flex;justify-content:space-between"><span>اسم المشروع :- ${esc(d.project)}</span><span>رقم المشروع :- ${esc(d.project_no)}</span></div>
    <table style="margin-top:4px"><tr><th rowspan="2" style="width:34px">م</th><th rowspan="2" style="width:200px">الاســـــم</th><th rowspan="2">اليوم</th><th rowspan="2">التاريخ</th><th colspan="2">ساعات الدوام</th><th rowspan="2" style="width:70px">عدد الساعات الاضافيه</th></tr>
    <tr><th>من</th><th>الي</th></tr>${body}
    <tr class="tot"><td colspan="6">الاجمالي</td><td>${nz(tot)}</td></tr></table>
    ${sig("رئيس القسم","الاداره الماليه","المدير العام")}`;
  },
  excel(ws, d) {
    ws.getCell("A10").value = `عن الفتره من :- ${fmt(pd(d.from))} الي ${fmt(pd(d.to))}`;
    ws.getCell("A12").value = d.branch ? `الاداره :- ${d.branch}` : null;
    ws.getCell("A13").value = `القسم :- ${d.dept}`;
    ws.getCell("A14").value = `اسم المشروع :- ${d.project}`;
    ws.getCell("D14").value = `رقم المشروع :- ${d.project_no}`;
    pad(d.rows,14).forEach((r,i) => { const n = 17+i, dt = pd(r.date), h = this.hrs(r);
      ws.getCell("B"+n).value = r.name || null; ws.getCell("C"+n).value = dayName(dt) || null;
      ws.getCell("D"+n).value = fmt(dt) || null; ws.getCell("E"+n).value = r.start || null;
      ws.getCell("F"+n).value = r.end || null; ws.getCell("G"+n).value = h; });
    ws.getCell("G31").value = {formula:"SUM(G17:G30)"};
  }
 },
 meals: {
  title: "بدل وجبة", file: "بدل_وجبة",
  fields: [["dept","القسم","text","صيانة المدينة"],["date","التاريخ","date"],["client","اسم العميل","text"],["project","اسم المشروع","text"],["project_no","رقم المشروع","text"],["price","قيمة الوجبة الافتراضية","number","25"]],
  pics: [["meals",[1,76201,1,9525],[8,1485900,10,28574]]],
  nrows: 10,
  cols: [["name","الاسم","text"],["from","من","date"],["to","إلى","date"],["days","الأيام (تلقائي)","number"],["price","قيمة الوجبة","number"]],
  calc(r, d) { const a = pd(r.from), b = pd(r.to);
    const days = num(r.days) ?? (a && b ? Math.round((b-a)/864e5)+1 : null);
    const has = r.name || a || b || days != null, price = has ? (num(r.price) ?? num(d.price)) : null;
    return {a,b,days,price,tot: days != null && price != null ? days*price : null}; },
  render(d) {
    let tot = 0;
    const body = pad(d.rows,10).map((r,i) => { const c = this.calc(r,d); if (c.tot) tot += c.tot;
      return `<tr><td>${i+1}</td><td>${esc(r.name)}</td><td>${fmt(c.a)}</td><td>${fmt(c.b)}</td><td>${nz(c.days)}</td><td>${nz(c.price)}</td><td>${nz(c.tot)}</td><td></td></tr>`; }).join("");
    return `<img class="hd" src="${IMG.meals}">
    <div class="t1" style="margin-top:14px">بدل وجبة للعاملين</div>
    <div class="t1" style="display:flex;justify-content:center;gap:50px"><span>اسم القسم :- ${esc(d.dept)}</span><span>التاريخ :- ${fmt(pd(d.date))}</span></div>
    <div class="ln" style="font-size:14px;margin-top:8px">اسم العميل: ${esc(d.client)}</div>
    <div class="ln" style="font-size:14px">اسم المشروع: ${esc(d.project)}</div>
    <div class="ln" style="font-size:14px;margin-bottom:6px">رقم المشروع : ${esc(d.project_no)}</div>
    <table><tr><th rowspan="2" style="width:34px">م</th><th rowspan="2" style="width:190px">الاســــــــم</th><th colspan="2">من</th><th rowspan="2" style="width:56px">اجمالي الايام</th><th rowspan="2" style="width:56px">قيمه الوجبه</th><th rowspan="2" style="width:72px">الاجمالي</th><th rowspan="2" style="width:110px">التوقيع</th></tr>
    <tr><th>من</th><th>الى</th></tr>${body}
    <tr class="tot"><td colspan="6">TOTAL</td><td>${nz(tot)}</td><td class="blk"></td></tr></table>
    ${sig("مدير القسم","الاداره الماليه","المدير العام")}`;
  },
  excel(ws, d) {
    ws.getCell("A13").value = `اسم القسم :-  ${d.dept}          التاريخ :-  ${fmt(pd(d.date))}`;
    ws.getCell("A14").value = `اسم العميل: ${d.client}`;
    ws.getCell("A15").value = `اسم المشروع:  ${d.project}`;
    ws.getCell("A16").value = `رقم المشروع : ${d.project_no}`;
    pad(d.rows,10).forEach((r,i) => { const n = 20+i, c = this.calc(r,d);
      ws.getCell("C"+n).value = r.name || null;
      for (const [col,v] of [["D",c.a],["E",c.b]]) { ws.getCell(col+n).value = v; ws.getCell(col+n).numFmt = "yyyy/mm/dd"; }
      ws.getCell("F"+n).value = c.days; ws.getCell("G"+n).value = c.price;
      ws.getCell("H"+n).value = c.tot != null ? {formula:`G${n}*F${n}`, result:c.tot} : null; });
    ws.getCell("H30").value = {formula:"SUM(H20:H29)"};
  }
 },
 purchase: {
  title: "طلب شراء", file: "طلب_شراء",
  fields: [["date","التاريخ","date"],["dept","القسم","text"],["supplier","المورد","text","","w"]],
  customers: true,
  pics: [["new",[1,66675,0,57150],[8,1533525,9,171450]],["check",[8,485776,21,7902],[8,1066800,21,307973]],["check",[8,485776,26,7902],[8,1066800,26,307973]]],
  nrows: 5,
  cols: [["desc","البيان","text"],["qty","الكمية","number"],["price","سعر الوحدة","number"]],
  hint: "القيمة الكلية والإجمالي تُحسب تلقائيًا.",
  render(d) {
    const dt = pd(d.date);
    const cust = (n, c) => `<div class="sp" style="font-family:serif">CUSTOMER ( ${n} )</div>
     <table style="width:84%;margin-right:auto"><tr><td style="width:34%" class="lb">اسم المشروع / العميل</td><td>${esc(c.project)}</td></tr>
     <tr><td class="lb">رقم عرض السعر</td><td>${esc(c.quote)}</td></tr><tr><td class="lb">رقم المشروع علي النظام</td><td>${esc(c.sys)}</td></tr>
     <tr><td class="lb2">دفعه مقدمه من العميل</td><td><div style="display:flex;justify-content:space-between;align-items:center"><span style="width:60px">${nz(num(c.advance))}</span><span class="lb2" style="padding:0 6px">عميل اجل</span><span style="width:30px">${c.type==="credit"?mark:""}</span><span class="lb2" style="padding:0 6px">نقدي</span><span style="width:30px">${c.type==="cash"?mark:""}</span></div></td></tr></table>`;
    let tot = 0;
    const body = pad(d.rows,5).map((r,i) => { const q = num(r.qty), p = num(r.price), t = q!=null && p!=null ? q*p : null; if (t) tot += t;
      return `<tr><td>${i+1}</td><td style="text-align:right">${esc(r.desc)}</td><td>${nz(q)}</td><td>${nz(p)}</td><td>${nz(t)}</td></tr>`; }).join("");
    return `<img class="hd" src="${IMG.new}">
    <div class="sp" style="font-size:20px">طلب شراء</div><div class="sp" style="font-size:24px;font-family:serif">PURCHASE REQUEST</div>
    <div class="sp" style="font-size:14px">خاص بالمورد</div>
    <table style="width:84%;margin-right:auto"><tr><td style="width:34%" class="lb">اليوم</td><td>${dayName(dt)}</td></tr><tr><td class="lb">التاريخ</td><td>${fmt(dt)}</td></tr>
    <tr><td class="lb">القسم</td><td>${esc(d.dept)}</td></tr><tr><td class="lb">المورد</td><td>${esc(d.supplier)}</td></tr></table>
    ${cust(1,d.c1)}${cust(2,d.c2)}
    <div style="font-size:12px;margin:2px 0">ملحوظه - في حاله دفعه مقدمه من العميل نرجو ارفاق صوره التحويل مع الطلب</div>
    <div class="sp" style="font-size:14px">بيان ( بالقطع / الاعمال ) المطلوبه</div>
    <table><tr><th style="width:34px">م</th><th>البيـــــــــــــــــــان</th><th style="width:70px">الكميه</th><th style="width:90px">سعر الوحده</th><th style="width:100px">القيمه الكليه</th></tr>${body}
    <tr class="tot"><td colspan="4">الاجمالي</td><td>${nz(tot)}</td></tr></table>
    ${sig("مقدم الطلب","مدير القسم","اداره المشتريات")}
    <div class="sp" style="margin-top:34px">اعتماد مدير الصيانه</div>`;
  },
  excel(ws, d) {
    const dt = pd(d.date);
    ws.getCell("D14").value = dayName(dt) || null; ws.getCell("D15").value = fmt(dt) || null;
    ws.getCell("D16").value = d.dept || null; ws.getCell("D17").value = d.supplier || null;
    for (const [b,c] of [[19,d.c1],[24,d.c2]]) {
      ws.getCell("D"+b).value = c.project || null; ws.getCell("D"+(b+1)).value = c.quote || null; ws.getCell("D"+(b+2)).value = c.sys || null;
      const r = b+3; ws.getCell("D"+r).value = num(c.advance);
      ws.getCell("F"+r).value = c.type==="credit" ? "✔" : null; ws.getCell("H"+r).value = c.type==="cash" ? "✔" : null; }
    pad(d.rows,5).forEach((r,i) => { const n = 31+i, q = num(r.qty), p = num(r.price);
      ws.getCell("C"+n).value = r.desc || null; ws.getCell("G"+n).value = q; ws.getCell("H"+n).value = p;
      ws.getCell("I"+n).value = q!=null && p!=null ? {formula:`G${n}*H${n}`, result:q*p} : null; });
    ws.getCell("I36").value = {formula:"SUM(I31:I35)"};
  }
 }
};

/* ---------------- UI ---------------- */
let cur = "overtime";
const state = {};
function blank(k) {
  const f = FORMS[k], o = {rows: emptyRows(f.nrows)};
  f.fields.forEach(x => o[x[0]] = x[3] || "");
  if (f.customers) { o.c1 = {type:""}; o.c2 = {type:""}; }
  return o;
}
for (const k in FORMS) state[k] = blank(k);
try { const s = JSON.parse(localStorage.getItem("forms-v1")); if (s) for (const k in s) if (state[k]) state[k] = s[k]; } catch {}

const inp = (attrs, val) => `<input ${attrs} value="${esc(val)}">`;
function buildPanel() {
  const f = FORMS[cur], d = state[cur];
  let h = `<div class="g">` + f.fields.map(([n,l,t,,w]) => `<label class="${w||""}">${l}${inp(`data-f="${n}" type="${t}" ${t==="number"?'step="any"':""}`, d[n])}</label>`).join("") + `</div>`;
  if (f.customers) for (const c of ["c1","c2"]) {
    h += `<h3>العميل (${c==="c1"?1:"2 — اختياري"})</h3><div class="g">` +
     [["project","اسم المشروع / العميل","text","w"],["quote","رقم عرض السعر","text"],["sys","رقم المشروع على النظام","text"],["advance","دفعة مقدمة (مبلغ)","number"]].map(([n,l,t,w]) => `<label class="${w||""}">${l}${inp(`data-c="${c}" data-f="${n}" type="${t}" step="any"`, d[c][n])}</label>`).join("") +
     `<label>النوع<select data-c="${c}" data-f="type">${[["","—"],["credit","عميل آجل"],["cash","نقدي"]].map(([v,t])=>`<option value="${v}" ${d[c].type===v?"selected":""}>${t}</option>`).join("")}</select></label></div>`;
  }
  h += `<h3>${f.customers ? "البنود" : "الصفوف"} (حتى ${f.nrows})</h3><div class="rows"><table><tr><td></td>${f.cols.map(c=>`<td class="h">${c[1]}</td>`).join("")}</tr>` +
    d.rows.map((r,i) => `<tr><td class="n">${i+1}</td>${f.cols.map(([n,,t]) => `<td>${inp(`data-r="${i}" data-f="${n}" type="${t}" ${t==="number"?'step="any"':""}`, r[n]||"")}</td>`).join("")}</tr>`).join("") + `</table></div>`;
  if (f.hint) h += `<div class="hint">${f.hint}</div>`;
  $("#panel").innerHTML = h;
}
function scale() {
  const s = Math.min(1, ($("#scaler").clientWidth || 794) / 794);
  $("#page").style.transform = `scale(${s})`; $("#scaler").style.height = (1123*s) + "px";
}
function draw() { $("#page").innerHTML = FORMS[cur].render(state[cur]); scale(); }
function save() { try { localStorage.setItem("forms-v1", JSON.stringify(state)); } catch {} }

$("#panel").addEventListener("input", e => {
  const t = e.target, f = t.dataset.f; if (!f) return; const d = state[cur];
  if (t.dataset.r != null) d.rows[+t.dataset.r][f] = t.value;
  else if (t.dataset.c) d[t.dataset.c][f] = t.value;
  else d[f] = t.value;
  save(); draw();
});
const tabs = $("#tabs");
for (const k in FORMS) { const b = document.createElement("button"); b.textContent = FORMS[k].title; b.dataset.k = k; b.onclick = () => go(k); tabs.append(b); }
function go(k) { cur = k; tabs.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.k === k)); buildPanel(); draw(); $("#msg").textContent = ""; }
$("#clr").onclick = () => { if (confirm("مسح كل الحقول؟")) { state[cur] = blank(cur); save(); buildPanel(); draw(); } };
$("#print").onclick = () => window.print();
window.addEventListener("resize", scale);

const stamp = () => { const n = new Date(), p = x => String(x).padStart(2,"0"); return `${n.getFullYear()}${p(n.getMonth()+1)}${p(n.getDate())}_${p(n.getHours())}${p(n.getMinutes())}`; };
function save_blob(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }

$("#dlpdf").onclick = async () => {
  const page = $("#page"), old = page.style.transform; $("#msg").textContent = "جاري إنشاء PDF…";
  page.style.transform = "none";
  try {
    await html2pdf().set({margin:0, filename:`${FORMS[cur].file}_${stamp()}.pdf`, image:{type:"jpeg",quality:0.98},
      html2canvas:{scale:2, useCORS:true, backgroundColor:"#fff", scrollX:0, scrollY:0}, jsPDF:{unit:"px", format:[794,1123], hotfixes:["px_scaling"]}}).from(page).save();
    $("#msg").textContent = "تم التنزيل ✓";
  } catch (e) { $("#msg").textContent = "تعذر إنشاء PDF: " + e.message; }
  page.style.transform = old;
};
$("#dlxls").onclick = async () => {
  $("#msg").textContent = "جاري إنشاء Excel…";
  try {
    const bin = atob(window.TEMPLATES[cur]), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.buffer);
    const ws = wb.worksheets[0];
    FORMS[cur].excel(ws, state[cur]);
    for (const [key, tl, br] of FORMS[cur].pics) {
      const id = wb.addImage({base64: IMG[key], extension: "jpeg"});
      const a = ([c,co,r,ro]) => ({nativeCol:c, nativeColOff:co, nativeRow:r, nativeRowOff:ro});
      ws.addImage(id, {tl:a(tl), br:a(br), editAs:"oneCell"});
    }
    const buf = await wb.xlsx.writeBuffer();
    save_blob(new Blob([buf], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}), `${FORMS[cur].file}_${stamp()}.xlsx`);
    $("#msg").textContent = "تم التنزيل ✓";
  } catch (e) { $("#msg").textContent = "تعذر إنشاء Excel: " + e.message; }
};
go("overtime");
