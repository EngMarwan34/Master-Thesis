"use strict";
document.documentElement.setAttribute("dir", "rtl"); document.documentElement.setAttribute("lang", "ar");
const DAYS = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const pd = s => { if (!s) return null; const d = new Date(s + "T00:00:00Z"); return isNaN(d) ? null : d; };
const fmt = d => d ? d.toISOString().slice(0,10).replace(/-/g,"/") : "";
const dayName = d => d ? DAYS[d.getUTCDay()] : "";
const num = v => (v === "" || v == null || isNaN(+v)) ? null : +v;
const nz = v => v == null ? "" : (Math.round(v*100)/100);
const emptyRows = n => Array.from({length:n}, () => ({}));
const pad = (rows, n) => Array.from({length:n}, (_, i) => rows[i] || {});
const sig = (...t) => `<div class="sig">${t.map(x=>`<span>${x}</span>`).join("")}</div>`;
const mark = `<span style="font-size:18px">✔</span>`;

const DEPTS = ["صيانة الرياض","صيانة جدة","صيانة المدينة","صيانة الخبر"];
const NAMES = {
  "صيانة المدينة": ["علي عدنان","فرمان قدير","مصطفى بسطاوي"],
  "صيانة جدة": ["محمد رجب","محمود فتحي","محمد زبير","عمر فاروق","محمد ناصر","مد افضل","شايك","عادل"],
  "صيانة الرياض": ["زهير","افتاب","جليل","امجاد","خالد","فهد خان","شيبو","احمد الهربوك","محمد مجدي","محمد صابر"],
  "صيانة الخبر": ["اسد الله","صادق","بونا","عبدالحميد"]
};
const OTHER = "__other";

/* يعيد ترتيب ورقة طلب الشراء حسب عدد العملاء: كتلة العميل = 5 صفوف (18-22) تتكرر، وما بعدها (28-47) ينزل/يطلع */
function restructure(ws, n) {
  const COLS = 10, jc = x => JSON.parse(JSON.stringify(x));
  const snap = (r1, r2) => { const cells = [], merges = [], heights = {};
    for (let r = r1; r <= r2; r++) { heights[r] = ws.getRow(r).height;
      for (let c = 1; c <= COLS; c++) { const cell = ws.getCell(r, c);
        cells.push({r, c, style: jc(cell.style), value: cell.isMerged && cell.master !== cell ? null : cell.value}); } }
    for (const m of ws.model.merges) { const [a, b] = m.split(":").map(x => ws.getCell(x));
      if (a.row >= r1 && b.row <= r2) merges.push([a.row, a.col, b.row, b.col]); }
    return {cells, merges, heights}; };
  const block = snap(18, 22), rest = snap(28, 47);
  for (const m of [...ws.model.merges]) if (ws.getCell(m.split(":")[0]).row >= 18) ws.unMergeCells(m);
  for (let r = 18; r <= 47; r++) { ws.getRow(r).height = undefined; for (let c = 1; c <= COLS; c++) { const x = ws.getCell(r, c); x.value = null; x.style = {}; } }
  const put = (s, off) => {
    for (const {r, c, style, value} of s.cells) { const x = ws.getCell(r + off, c); x.style = jc(style); if (value != null) x.value = value; }
    for (const [r1, c1, r2, c2] of s.merges) ws.mergeCells(r1 + off, c1, r2 + off, c2);
    for (const r in s.heights) if (s.heights[r]) ws.getRow(+r + off).height = s.heights[r]; };
  for (let k = 0; k < n; k++) { put(block, 5*k); ws.getCell(18 + 5*k, 2).value = `CUSTOMER ( ${k+1} )`; }
  put(rest, 5*n - 10);
}

/* ---------------- definitions ---------------- */
const FORMS = {
 meals: {
  title: "بدل وجبة", file: "بدل_وجبة",
  fields: [["dept","القسم","dept","صيانة المدينة"],["date","التاريخ","date","today"],["client","اسم العميل","text"],["project","اسم المشروع","text"],["project_no","رقم المشروع","text"],["price","قيمة الوجبة الافتراضية","number","25"]],
  pics: [["meals",[1,76201,1,9525],[8,1485900,10,28574]]],
  nrows: 10,
  cols: [["name","الاسم","name"],["from","من","date"],["to","إلى","date"],["days","الأيام (تلقائي)","number"],["price","قيمة الوجبة","number"]],
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
  fields: [["date","التاريخ","date","today"],["dept","القسم","dept"],["supplier","المورد","text","","w"]],
  customers: true,
  pics: d => [["new",[1,66675,0,57150],[8,1533525,9,171450]], ...d.custs.map((_, k) => { const r = 21 + 5*k; return ["check",[8,485776,r,7902],[8,1066800,r,307973]]; })],
  nrows: 5,
  cols: [["desc","البيان","text"],["qty","الكمية","number"],["price","سعر الوحدة","number"]],
  hint: "القيمة الكلية والإجمالي تُحسب تلقائيًا.",
  render(d) {
    const dt = pd(d.date);
    const cust = (n, c) => `<div class="sp" style="font-family:serif">CUSTOMER ( ${n} )</div>
     <table style="width:84%;margin:0 auto"><tr><td style="width:34%" class="lb">اسم المشروع / العميل</td><td>${esc(c.project)}</td></tr>
     <tr><td class="lb">رقم عرض السعر</td><td>${esc(c.quote)}</td></tr><tr><td class="lb">رقم المشروع علي النظام</td><td>${esc(c.sys)}</td></tr>
     <tr><td class="lb2">دفعه مقدمه من العميل</td><td><div style="display:flex;justify-content:space-between;align-items:center"><span style="width:60px">${nz(num(c.advance))}</span><span class="lb2" style="padding:0 6px">عميل اجل</span><span style="width:30px">${c.type==="credit"?mark:""}</span><span class="lb2" style="padding:0 6px">نقدي</span><span style="width:30px">${c.type==="cash"?mark:""}</span></div></td></tr></table>`;
    let tot = 0;
    const body = pad(d.rows,5).map((r,i) => { const q = num(r.qty), p = num(r.price), t = q!=null && p!=null ? q*p : null; if (t) tot += t;
      return `<tr><td>${i+1}</td><td style="text-align:right">${esc(r.desc)}</td><td>${nz(q)}</td><td>${nz(p)}</td><td>${nz(t)}</td></tr>`; }).join("");
    return `<img class="hd" src="${IMG.new}">
    <div class="sp" style="font-size:20px">طلب شراء</div><div class="sp" style="font-size:24px;font-family:serif">PURCHASE REQUEST</div>
    <div class="sp" style="font-size:14px">خاص بالمورد</div>
    <table style="width:84%;margin:0 auto"><tr><td style="width:34%" class="lb">اليوم</td><td>${dayName(dt)}</td></tr><tr><td class="lb">التاريخ</td><td>${fmt(dt)}</td></tr>
    <tr><td class="lb">القسم</td><td>${esc(d.dept)}</td></tr><tr><td class="lb">المورد</td><td>${esc(d.supplier)}</td></tr></table>
    ${d.custs.map((c,i) => cust(i+1,c)).join("")}
    <div style="font-size:12px;margin:2px 0">ملحوظه - في حاله دفعه مقدمه من العميل نرجو ارفاق صوره التحويل مع الطلب</div>
    <div class="sp" style="font-size:14px">بيان ( بالقطع / الاعمال ) المطلوبه</div>
    <table><tr><th style="width:34px">م</th><th>البيـــــــــــــــــــان</th><th style="width:70px">الكميه</th><th style="width:90px">سعر الوحده</th><th style="width:100px">القيمه الكليه</th></tr>${body}
    <tr class="tot"><td colspan="4">الاجمالي</td><td>${nz(tot)}</td></tr></table>
    ${sig("مقدم الطلب","مدير القسم","اداره المشتريات")}
    <div class="sp" style="margin-top:34px">اعتماد مدير الصيانه</div>`;
  },
  excel(ws, d) {
    const n = d.custs.length, S = 5*n - 10;
    restructure(ws, n);
    const dt = pd(d.date);
    ws.getCell("D14").value = dayName(dt) || null; ws.getCell("D15").value = fmt(dt) || null;
    ws.getCell("D16").value = d.dept || null; ws.getCell("D17").value = d.supplier || null;
    d.custs.forEach((c, k) => { const b = 19 + 5*k;
      ws.getCell("D"+b).value = c.project || null; ws.getCell("D"+(b+1)).value = c.quote || null; ws.getCell("D"+(b+2)).value = c.sys || null;
      const r = b+3; ws.getCell("D"+r).value = num(c.advance);
      ws.getCell("F"+r).value = c.type==="credit" ? "✔" : null; ws.getCell("H"+r).value = c.type==="cash" ? "✔" : null; });
    pad(d.rows,5).forEach((r,i) => { const n2 = 31+S+i, q = num(r.qty), p = num(r.price);
      ws.getCell("C"+n2).value = r.desc || null; ws.getCell("G"+n2).value = q; ws.getCell("H"+n2).value = p;
      ws.getCell("I"+n2).value = q!=null && p!=null ? {formula:`G${n2}*H${n2}`, result:q*p} : null; });
    ws.getCell("I"+(36+S)).value = {formula:`SUM(I${31+S}:I${35+S})`};
    ws.pageSetup.fitToPage = true; ws.pageSetup.fitToWidth = 1; ws.pageSetup.fitToHeight = 1;
    ws.pageSetup.printArea = `B1:I${47+S}`;
  }
 }
};

/* ---------------- UI ---------------- */
let cur = "meals";
const state = {};
const today = () => { const n = new Date(), p = x => String(x).padStart(2,"0"); return `${n.getFullYear()}-${p(n.getMonth()+1)}-${p(n.getDate())}`; };
function blank(k) {
  const f = FORMS[k], o = {rows: emptyRows(f.nrows)};
  f.fields.forEach(x => o[x[0]] = x[3] === "today" ? today() : (x[3] || ""));
  if (f.customers) o.custs = [{type:""}];
  return o;
}
for (const k in FORMS) state[k] = blank(k);
try { const s = JSON.parse(localStorage.getItem("forms-v3")); if (s) for (const k in s) if (state[k]) state[k] = s[k]; } catch {}

const inp = (attrs, val) => `<input ${attrs} value="${esc(val)}">`;
function nameCell(d, r, i) {
  const names = NAMES[d.dept] || [], other = r.other || (r.name && !names.includes(r.name));
  return `<select data-r="${i}" data-nm="1"><option value="">— اختر الفني —</option>${names.map(x => `<option ${!other && r.name===x?"selected":""}>${x}</option>`).join("")}<option value="${OTHER}" ${other?"selected":""}>غير موجود (اكتب الاسم)</option></select>` +
    (other ? `<input data-r="${i}" data-f="name" type="text" placeholder="اسم الفني" value="${esc(r.name)}">` : "");
}
function buildPanel() {
  const f = FORMS[cur], d = state[cur];
  let h = `<div class="g">` + f.fields.map(([n,l,t,,w]) => t === "dept" ? `<label class="${w||""}">${l}<select data-f="dept"><option value="">— اختر —</option>${DEPTS.map(x => `<option ${d.dept===x?"selected":""}>${x}</option>`).join("")}</select></label>` : `<label class="${w||""}">${l}${inp(`data-f="${n}" type="${t}" ${t==="number"?'step="any"':""}`, d[n])}</label>`).join("") + `</div>`;
  if (f.customers) {
    d.custs.forEach((cu, i) => {
      h += `<h3>العميل (${i+1})${i>0?` <button type="button" class="sec add" data-act="delc" data-i="${i}">حذف</button>`:""}</h3><div class="g">` +
       [["project","اسم المشروع / العميل","text","w"],["quote","رقم عرض السعر","text"],["sys","رقم المشروع على النظام","text"],["advance","دفعة مقدمة (مبلغ)","number"]].map(([n,l,ty,w]) => `<label class="${w||""}">${l}${inp(`data-c="${i}" data-f="${n}" type="${ty}" step="any"`, cu[n])}</label>`).join("") +
       `<label>النوع<select data-c="${i}" data-f="type">${[["","—"],["credit","عميل آجل"],["cash","نقدي"]].map(([v,tx])=>`<option value="${v}" ${cu.type===v?"selected":""}>${tx}</option>`).join("")}</select></label></div>`;
    });
    if (d.custs.length < 4) h += `<button type="button" class="sec add" data-act="addc">+ إضافة عميل (${d.custs.length+1})</button>`;
  }
  h += `<h3>${f.customers ? "البنود" : "الصفوف"} (حتى ${f.nrows})</h3><div class="rows"><table><tr><td></td>${f.cols.map(c=>`<td class="h">${c[1]}</td>`).join("")}</tr>` +
    d.rows.map((r,i) => `<tr><td class="n">${i+1}</td>${f.cols.map(([n,,t]) => t === "name" ? `<td>${nameCell(d, r, i)}</td>` : `<td>${inp(`data-r="${i}" data-f="${n}" type="${t}" ${t==="number"?'step="any"':""}`, r[n]||"")}</td>`).join("")}</tr>`).join("") + `</table></div>`;
  if (f.hint) h += `<div class="hint">${f.hint}</div>`;
  $("#panel").innerHTML = h;
}
function scale() {
  const s = Math.min(1, ($("#scaler").clientWidth || 794) / 794);
  $("#page").style.transform = `scale(${s})`; $("#page").style.marginInline = s < 1 ? "0" : "auto"; $("#scaler").style.height = (1123*s) + "px";
}
function draw() {
  const pg = $("#page"); pg.innerHTML = `<div class="in">${FORMS[cur].render(state[cur])}</div>`;
  const inn = pg.firstChild, room = 1123 - 56, h = inn.offsetHeight;   // يصغّر المحتوى ليبقى في صفحة واحدة
  if (h > room) { const k = room / h; inn.style.cssText = `transform:scale(${k});transform-origin:top right;width:${100/k}%`; }
  scale();
}
function save() { try { localStorage.setItem("forms-v3", JSON.stringify(state)); } catch {} }

$("#panel").addEventListener("click", e => {
  const a = e.target.dataset.act; if (!a) return;
  const cs = state[cur].custs;
  if (a === "addc" && cs.length < 4) cs.push({type:""});
  if (a === "delc") cs.splice(+e.target.dataset.i, 1);
  save(); buildPanel(); draw();
});
$("#panel").addEventListener("input", e => {
  const t = e.target, f = t.dataset.f, d = state[cur];
  if (t.dataset.nm) {                       // قائمة أسماء الفنيين
    const r = d.rows[+t.dataset.r];
    if (t.value === OTHER) { r.other = true; r.name = ""; } else { r.other = false; r.name = t.value; }
    save(); buildPanel(); draw(); return;
  }
  if (f === "dept" && t.tagName === "SELECT") {   // تغيير القسم يحدّث قوائم الفنيين
    d.dept = t.value; const names = NAMES[d.dept] || [];
    (d.rows || []).forEach(r => { if (r.name && !r.other && !names.includes(r.name)) r.name = ""; });
    save(); buildPanel(); draw(); return;
  }
  if (!f) return;
  if (t.dataset.r != null) d.rows[+t.dataset.r][f] = t.value;
  else if (t.dataset.c != null) d.custs[+t.dataset.c][f] = t.value;
  else d[f] = t.value;
  save(); draw();
});
const tabs = $("#tabs");
for (const k in FORMS) { const b = document.createElement("button"); b.textContent = FORMS[k].title; b.dataset.k = k; b.onclick = () => go(k); tabs.append(b); }
function go(k) { cur = k; tabs.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.k === k)); buildPanel(); draw(); $("#msg").textContent = ""; }
$("#clr").onclick = () => { if (confirm("مسح كل الحقول؟")) { state[cur] = blank(cur); save(); buildPanel(); draw(); } };
window.addEventListener("resize", scale);

const stamp = () => { const n = new Date(), p = x => String(x).padStart(2,"0"); return `${n.getFullYear()}${p(n.getMonth()+1)}${p(n.getDate())}_${p(n.getHours())}${p(n.getMinutes())}`; };
async function save_blob(blob, name) {
  const dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null;
  if (dl) { await dl.save({filename: name, data: blob}); return; }   // داخل claude.ai
  saveLocal(blob, name);
}
function saveLocal(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }

$("#dlpdf").onclick = async () => {
  const page = $("#page"), old = page.style.transform; $("#msg").textContent = "جاري إنشاء PDF…";
  page.style.transform = "none"; page.style.marginInline = "0";
  try {
    const pdf = await html2pdf().set({margin:0, filename:`${FORMS[cur].file}_${stamp()}.pdf`, image:{type:"jpeg",quality:0.98},
      html2canvas:{scale:2, useCORS:true, backgroundColor:"#fff", scrollX:0, scrollY:0}, jsPDF:{unit:"px", format:[794,1123], hotfixes:["px_scaling"]}}).from(page).outputPdf("blob");
    await save_blob(pdf, `${FORMS[cur].file}_${stamp()}.pdf`);
    $("#msg").textContent = "تم التنزيل ✓";
  } catch (e) { $("#msg").textContent = e && e.code === "declined" ? "" : "تعذر إنشاء PDF: " + (e.message || e); }
  scale();
};
$("#dlxls").onclick = async () => {
  $("#msg").textContent = "جاري إنشاء Excel…";
  try {
    const bin = atob(window.TEMPLATES[cur]), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.buffer);
    const ws = wb.worksheets[0];
    FORMS[cur].excel(ws, state[cur]);
    const pics = typeof FORMS[cur].pics === "function" ? FORMS[cur].pics(state[cur]) : FORMS[cur].pics;
    for (const [key, tl, br] of pics) {
      const id = wb.addImage({base64: IMG[key], extension: "jpeg"});
      const a = ([c,co,r,ro]) => ({nativeCol:c, nativeColOff:co, nativeRow:r, nativeRowOff:ro});
      ws.addImage(id, {tl:a(tl), br:a(br), editAs:"oneCell"});
    }
    const buf = await wb.xlsx.writeBuffer();
    await save_blob(new Blob([buf], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}), `${FORMS[cur].file}_${stamp()}.xlsx`);
    $("#msg").textContent = "تم التنزيل ✓";
  } catch (e) { $("#msg").textContent = e && e.code === "declined" ? "" : "تعذر إنشاء Excel: " + (e.message || e); }
};
go("meals");
