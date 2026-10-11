/* ═══ شاشة التسعير ═══
   النواة (core/pricing.js) تملك أسعار الوحدة والعملة ونسبة الضريبة، لكن
   الواجهة لم تكن تعرض غير نتيجتها داخل ملفّ CSV. هذا اللوح يوصل الدوال
   setRate وsetCurrency وsetTaxRate وgetRate بحقولٍ فقط ولا يضيف منطقاً:
   · التسعير ليس جزءاً من التاريخ (لا edit ولا تراجع) — تفضيلٌ يُحفَظ في
     المتصفّح ويُكتَب في ملفّ المشروع عند الحفظ، كما قرّرت النواة.
   · الجدول لا يعرض إلا البنود التي يُخرجها الحصر فعلاً
     (tools/boq.js#pricingItems) — «أرضيات» و«أبعاد» في جدول النواة لا
     يستهلكهما أحد، فعرضُ سعرٍ لهما وهمٌ.
   · المساحات والأدوات الصحية والدرج سعرها صفر افتراضياً: يُنبَّه إلى بندٍ
     له كميّةٌ في المشروع وسعره صفر، فلا يظنّ المستخدم الإجماليَّ كاملاً.
   · المعاينة (الكميّات والمبالغ والإجمالي) تُقرأ من boq() الحيّ وتُحدَّث
     في مكانها فلا يضيع تركيزٌ ولا تُقطَع كتابة.
   لا onclick ولا style مضمَّن (CSP)، وكل نصٍّ من المشروع يمرّ بـesc. */
import {escapeHtml as esc} from "../core/escape.js";
import {boq} from "../core/boq.js";
import {pricingItems} from "../tools/boq.js";
import {allRates,setRate,resetRates,currency,setCurrency,taxRate,
 setTaxRate,price,round2,formatMoney} from "../core/pricing.js";
import {ltr} from "../core/units.js";
import {defTool,H} from "../tools/registry.js";
import {rptOpen,rptBox} from "./rpt.js";

/* البنود بترتيب العرض — هي بالضبط ما يُخرجه pricingItems.
   wall: احتياطيّ لنوع جدارٍ غير معروف (boqWallKey). */
const KEYS=["wall_ext","wall_int","wall_low","wall","area","door","window",
 "column","fixture","stair"];

function quantities(){
 const items=pricingItems(boq());
 const q={};
 items.forEach(it=>{q[it.key]=(q[it.key]||0)+(+it.qty||0)});
 return {items,q};
}

const num=n=>ltr(String(round2(n)));

function bodyRows(R,q){
 return KEYS.filter(k=>R[k]).map(k=>{
  const r=R[k], qty=q[k]||0;
  return `<tr data-k="${esc(k)}"><td>${esc(r.label||k)}</td><td>${esc(r.unit||"")}</td>`
   +`<td><input data-f="rate" type="number" min="0" step="any" `
   +`aria-label="سعر ${esc(r.label||k)}" value="${+r.rate||0}"></td>`
   +`<td data-o="qty">${num(qty)}</td>`
   +`<td data-o="amt">${esc(formatMoney(qty*(+r.rate||0)))}</td>`
   +`<td data-o="warn"></td></tr>`;
 }).join("");
}

function body(){
 const R=allRates(), {q}=quantities();
 return `<div class="pr-cfg">`
  +`<label>العملة<input data-f="currency" maxlength="12" value="${esc(currency())}"></label>`
  +`<label>الضريبة (٪)<input data-f="tax" type="number" min="0" max="100" `
  +`step="any" value="${round2(taxRate()*100)}"></label></div>`
  +`<table class="rpt-tbl"><tr><th>البند</th><th>الوحدة</th><th>سعر الوحدة</th>`
  +`<th>الكمية الحالية</th><th>المبلغ</th><th></th></tr>`
  +`<tbody data-o="rows">${bodyRows(R,q)}</tbody></table>`
  +`<div class="pr-tot" data-o="tot"></div>`
  +`<p class="hint">المساحات والأدوات الصحية والدرج سعرها صفر افتراضياً — `
  +`اضبطها إن أردتها في الإجمالي. التسعير لا يدخل سجلّ التراجع؛ `
  +`تُحفَظ الأسعار في هذا المتصفّح وتُكتَب في ملفّ المشروع عند حفظه.</p>`
  +`<div class="rpt-act"><button type="button" data-pr="reset">استعادة الأسعار الافتراضية</button>`
  +`<button type="button" data-rpt="close">إغلاق</button></div>`;
}

/* يُحدّث الأرقام في مكانها — لا يُعيد بناء DOM */
function sync(){
 const b=rptBox(); if(!b||!b.classList.contains("pr"))return;
 const {items,q}=quantities();
 const P=price(items);
 const R=allRates();
 b.querySelectorAll("tr[data-k]").forEach(tr=>{
  const k=tr.dataset.k, rate=+(R[k]&&R[k].rate)||0, qty=q[k]||0;
  const set=(o,t)=>{const el=tr.querySelector(`[data-o="${o}"]`); if(el)el.textContent=t};
  set("qty",num(qty));
  set("amt",formatMoney(qty*rate));
  set("warn",(qty>0&&rate===0)?"غير مسعَّر":"");
  const inp=tr.querySelector('[data-f="rate"]');
  if(inp&&inp!==document.activeElement)inp.value=String(rate);
 });
 const tot=b.querySelector('[data-o="tot"]');
 if(tot){
  tot.innerHTML=`<div class="ln">المجموع قبل الضريبة: <b>${esc(formatMoney(P.subtotal))}</b></div>`
   +`<div class="ln">الضريبة (${esc(ltr(String(round2(P.taxRate*100))))}٪): `
   +`<b>${esc(formatMoney(P.tax))}</b></div>`
   +`<div class="ln">الإجمالي: <b>${esc(formatMoney(P.total))}</b></div>`;
 }
}
/* يُنادى بعد تراجعٍ أو تحميل مشروعٍ فتتبدّل الكميّات خلف اللوح */
export function refreshPricingPanel(){
 const b=rptBox();
 if(b&&b.classList.contains("pr"))sync();
}

function reject(msg){H.rep("wr",msg)}

function onField(f,el){
 const v=String(el.value).trim();
 if(f==="rate"){
  const tr=el.closest("tr[data-k]"); if(!tr)return;
  const n=Number(v);
  if(v===""||!isFinite(n)||n<0){
   reject("سعر الوحدة يجب أن يكون رقماً غير سالب");
   el.value=String(+(allRates()[tr.dataset.k]||{}).rate||0);
  }else setRate(tr.dataset.k,n);
 }else if(f==="currency"){
  if(!v){reject("اكتب رمز العملة"); el.value=currency()}
  else setCurrency(v);
 }else if(f==="tax"){
  const n=Number(v);
  if(v===""||!isFinite(n)||n<0||n>100){
   reject("نسبة الضريبة بين 0 و100");
   el.value=String(round2(taxRate()*100));
  }else setTaxRate(n/100);
 }
 sync();
}

export function openPricingPanel(){
 const box=rptOpen("التسعير",body());
 box.classList.add("pr");
 box.addEventListener("change",e=>{
  if(rptBox()!==box)return;
  const el=e.target.closest&&e.target.closest("[data-f]");
  if(el)onField(el.dataset.f,el);
 });
 box.addEventListener("click",e=>{
  if(rptBox()!==box)return;
  const d=e.target.closest&&e.target.closest("[data-pr]");
  if(!d)return;
  if(d.dataset.pr==="reset"){
   resetRates();
   const bd=box.querySelector(".rpt-b"); if(bd)bd.innerHTML=body();
   sync();
   H.rep("ok","أُعيدت الأسعار الافتراضية (العملة والضريبة لم تتغيّرا)");
  }
 });
 sync();
 return box;
}

/* فتح اللوح من سطر الأوامر ولوحة الأوامر */
defTool({
 id:"pricing", alias:"rates prices pricingpanel أسعار تسعير اسعار_الكميات",
 label:"التسعير",
 hint:"أسعار الوحدة والعملة ونسبة الضريبة لجدول الكميات",
 ico:"boq", own:1, nojr:1, noplan:1,
 start(){ openPricingPanel(); return false; }
});
