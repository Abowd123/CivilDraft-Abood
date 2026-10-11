/* ═══ أنماط الرسم — الواجهة ═══
   ثلاثة جداولَ كانت بلا مدخلٍ من الواجهة رغم أن نواتها كاملة:
   أنواع الخطوط (core/ltypes.js) · أنماط التهشير (core/hatches.js) ·
   طُرز الأبعاد (core/dimstyles.js). كل تعديلٍ يمرّ بمعاملة edit() الذرّية
   في النواة فيدخل التاريخ ويُتراجَع، والرفضُ (اسمٌ مكرَّر، نوعٌ مستعمَل)
   تُبلِّغه النواة نفسُها ونكتفي هنا بقراءة editFailed().
   المصنعيّ للقراءة فقط. لا onclick ولا style مضمَّن (CSP)، وكل نصٍّ من
   المشروع يمرّ بـesc. */
import {escapeHtml as esc} from "../core/escape.js";
import {editFailed} from "../core/state.js";
import {ltList,addLtype,delLtype,resetLtypes} from "../core/ltypes.js";
import {patList,addHatch,delHatch,resetHatches} from "../core/hatches.js";
import {dsList,addDimstyle,delDimstyle,resetDimstyles} from "../core/dimstyles.js";
import {defTool,H} from "../tools/registry.js";
import {rptOpen,rptClose,rptBox} from "./rpt.js";

const TABS=[["lt","أنواع الخطوط"],["ht","التهشير"],["ds","طرز الأبعاد"]];
let tab="lt";

const NAME_HINT="لاتيني: حرفٌ ثم أحرفٌ وأرقامٌ وشرطات (مثل MB-DOUBLE)";
const nums=s=>String(s||"").split(/[\s,;]+/).filter(Boolean).map(Number);

/* ═══ أجسام التبويبات ═══ */
function bodyLt(){
 const rows=ltList().map(r=>{
  const dash=r.dashes.length?r.dashes.join(" "):"متّصل";
  if(!r.custom)
   return `<tr><td class="mono">${esc(r.k)}</td><td>${esc(r.label)}</td>`
    +`<td class="mono">${esc(dash)}</td><td></td><td>مصنعيّ</td></tr>`;
  return `<tr data-k="${esc(r.k)}"><td class="mono">${esc(r.k)}</td>`
   +`<td><input data-f="label" maxlength="40" value="${esc(r.label)}"></td>`
   +`<td><input data-f="mm" class="mono" value="${esc(r.dashes.join(" "))}"></td>`
   +`<td><button type="button" data-do="lt-save">حفظ</button></td>`
   +`<td><button type="button" data-do="lt-del">حذف</button></td></tr>`;
 }).join("");
 return `<table class="rpt-tbl"><tr><th>الاسم</th><th>الوصف</th>`
  +`<th>الشرطات (مم)</th><th></th><th></th></tr>${rows}</table>`
  +`<h4>نوعٌ جديد</h4>`
  +`<div class="sm-add" data-add="lt">`
  +`<input data-f="name" placeholder="MB-DOUBLE" maxlength="32" aria-label="اسم النوع">`
  +`<input data-f="label" placeholder="الوصف" maxlength="40" aria-label="الوصف">`
  +`<input data-f="mm" placeholder="8 2 1 2" aria-label="الشرطات بالمليمتر">`
  +`<button type="button" data-do="lt-add">أضف</button></div>`
  +`<p class="hint">${esc(NAME_HINT)} — الشرطات أطوالٌ متناوبة: خطّ، فراغ، خطّ، فراغ…</p>`
  +`<div class="rpt-act"><button type="button" data-do="lt-reset">إعادة المصنع</button></div>`;
}

function bodyHt(){
 const rows=patList().map(r=>{
  if(!r.custom)
   return `<tr><td class="mono">${esc(r.k)}</td><td>${esc(r.label)}</td>`
    +`<td>${r.ang}°</td><td>${r.mm}</td><td>${r.solid?"مصمت":"خطوط"}</td><td></td><td>مصنعيّ</td></tr>`;
  return `<tr data-k="${esc(r.k)}"><td class="mono">${esc(r.k)}</td>`
   +`<td><input data-f="label" maxlength="40" value="${esc(r.label)}"></td>`
   +`<td><input data-f="ang" type="number" inputmode="decimal" min="0" max="360" value="${r.ang}"></td>`
   +`<td><input data-f="mm" type="number" inputmode="decimal" min="0.2" max="200" step="0.5" value="${r.mm}"></td>`
   +`<td><input data-f="solid" type="checkbox"${r.solid?" checked":""} aria-label="مصمت"></td>`
   +`<td><button type="button" data-do="ht-save">حفظ</button></td>`
   +`<td><button type="button" data-do="ht-del">حذف</button></td></tr>`;
 }).join("");
 return `<table class="rpt-tbl"><tr><th>الاسم</th><th>الوصف</th><th>الزاوية</th>`
  +`<th>التباعد (مم)</th><th>مصمت</th><th></th><th></th></tr>${rows}</table>`
  +`<h4>نمطٌ جديد</h4>`
  +`<div class="sm-add" data-add="ht">`
  +`<input data-f="name" placeholder="MB-BRICK" maxlength="32" aria-label="اسم النمط">`
  +`<input data-f="label" placeholder="الوصف" maxlength="40" aria-label="الوصف">`
  +`<input data-f="ang" type="number" inputmode="decimal" value="45" min="0" max="360" aria-label="الزاوية">`
  +`<input data-f="mm" type="number" inputmode="decimal" value="3" min="0.2" max="200" step="0.5" aria-label="التباعد">`
  +`<button type="button" data-do="ht-add">أضف</button></div>`
  +`<p class="hint">${esc(NAME_HINT)} — الزاوية والتباعد يسريان فوراً على كل هاشورٍ يستعمل النمط.</p>`
  +`<div class="rpt-act"><button type="button" data-do="ht-reset">إعادة المصنع</button></div>`;
}

const decSel=v=>`<select data-f="dec"><option value=""${v==null?" selected":""}>افتراضيّ المشروع</option>`
 +[0,1,2,3].map(n=>`<option value="${n}"${v===n?" selected":""}>${n}</option>`).join("")+`</select>`;
const tickSel=v=>`<select data-f="tick"><option value="slash"${v!=="arrow"?" selected":""}>شرطة مائلة</option>`
 +`<option value="arrow"${v==="arrow"?" selected":""}>سهم</option></select>`;

function bodyDs(){
 const list=dsList();
 const rows=list.map(r=>
  `<tr data-k="${esc(r.k)}"><td class="mono">${esc(r.k)}</td>`
  +`<td><input data-f="label" maxlength="40" value="${esc(r.label)}"></td>`
  +`<td>${tickSel(r.tick)}</td><td>${decSel(r.dec)}</td>`
  +`<td><input data-f="hMul" type="number" inputmode="decimal" min="0.4" max="4" step="0.1" value="${r.hMul}"></td>`
  +`<td><button type="button" data-do="ds-save">حفظ</button></td>`
  +`<td><button type="button" data-do="ds-del">حذف</button></td></tr>`).join("");
 return (list.length
  ?`<table class="rpt-tbl"><tr><th>الاسم</th><th>الوصف</th><th>الرأس</th>`
   +`<th>الكسور</th><th>حجم النص ×</th><th></th><th></th></tr>${rows}</table>`
  :`<div class="ln in">لا طرزَ بعد — الأبعاد تقرأ هيئتها من إعدادات المشروع. `
   +`أضف طرازاً ثم أسنده إلى بُعدٍ من لوحة الخصائص.</div>`)
  +`<h4>طرازٌ جديد</h4>`
  +`<div class="sm-add" data-add="ds">`
  +`<input data-f="name" placeholder="DS-WORK" maxlength="32" aria-label="اسم الطراز">`
  +`<input data-f="label" placeholder="الوصف" maxlength="40" aria-label="الوصف">`
  +tickSel("slash")+decSel(null)
  +`<input data-f="hMul" type="number" inputmode="decimal" value="1" min="0.4" max="4" step="0.1" aria-label="حجم النص">`
  +`<button type="button" data-do="ds-add">أضف</button></div>`
  +`<p class="hint">${esc(NAME_HINT)}</p>`
  +`<div class="rpt-act"><button type="button" data-do="ds-reset">إعادة المصنع</button></div>`;
}

const BODY={lt:bodyLt, ht:bodyHt, ds:bodyDs};

function body(){
 const tabs=`<div class="sm-tabs" role="tablist">`+TABS.map(([k,n])=>
  `<button type="button" role="tab" data-tab="${k}" aria-selected="${k===tab}"`
  +`${k===tab?` class="on"`:""}>${esc(n)}</button>`).join("")+`</div>`;
 return tabs+`<div data-sm-body>${BODY[tab]()}</div>`
  +`<div class="rpt-act"><button type="button" data-rpt="close">إغلاق</button></div>`;
}

/* ═══ قراءة الحقول ═══ */
const val=(root,f)=>{
 const el=root.querySelector(`[data-f="${f}"]`);
 if(!el)return undefined;
 return el.type==="checkbox"?el.checked:el.value;
};
const decOf=v=>(v===""||v==null)?null:+v;

/* تنفيذ معاملةٍ وإبلاغ: النواة تُبلِّغ الرفض بنفسها عبر ONERR */
function run(fn,okMsg){
 fn();
 if(editFailed())return false;
 H.refresh();
 if(okMsg)H.rep("ok",okMsg);
 return true;
}

function act(a,row,add){
 switch(a){
  case "lt-add":
   return run(()=>addLtype(val(add,"name"),val(add,"label"),"",nums(val(add,"mm"))),"أُضيف نوع الخطّ");
  case "lt-save":
   return run(()=>addLtype(row.dataset.k,val(row,"label"),"",nums(val(row,"mm"))),"حُفظ نوع الخطّ");
  case "lt-del":
   return run(()=>delLtype(row.dataset.k),"حُذف نوع الخطّ");
  case "lt-reset":
   return run(()=>resetLtypes(),"أُعيد مصنع أنواع الخطوط");
  case "ht-add":
   return run(()=>addHatch(val(add,"name"),val(add,"label"),+val(add,"ang"),+val(add,"mm"),0),"أُضيف نمط التهشير");
  case "ht-save":
   return run(()=>addHatch(row.dataset.k,val(row,"label"),+val(row,"ang"),+val(row,"mm"),val(row,"solid")),"حُفظ نمط التهشير");
  case "ht-del":
   return run(()=>delHatch(row.dataset.k),"حُذف نمط التهشير");
  case "ht-reset":
   return run(()=>resetHatches(),"أُعيد مصنع أنماط التهشير");
  case "ds-add":
   return run(()=>addDimstyle(val(add,"name"),val(add,"label"),val(add,"tick"),decOf(val(add,"dec")),+val(add,"hMul")),"أُضيف طراز الأبعاد");
  case "ds-save":
   return run(()=>addDimstyle(row.dataset.k,val(row,"label"),val(row,"tick"),decOf(val(row,"dec")),+val(row,"hMul")),"حُفظ طراز الأبعاد");
  case "ds-del":
   return run(()=>delDimstyle(row.dataset.k),"حُذف طراز الأبعاد");
  case "ds-reset":
   return run(()=>resetDimstyles(),"أُعيد مصنع طرز الأبعاد");
 }
 return false;
}

export function openStyleManager(which){
 if(TABS.some(t=>t[0]===which))tab=which;
 const box=rptOpen("أنماط الرسم",body());
 box.classList.add("sm");
 wire(box);
 return box;
}

function wire(box){
 const redraw=()=>{
  const b=box.querySelector(".rpt-b");
  if(b)b.innerHTML=body();
 };
 box.addEventListener("click",e=>{
  if(rptBox()!==box)return;
  const t=e.target.closest&&e.target.closest("[data-tab]");
  if(t){tab=t.dataset.tab; redraw(); return}
  const d=e.target.closest&&e.target.closest("[data-do]");
  if(!d)return;
  const row=d.closest("tr[data-k]");
  const add=d.closest("[data-add]");
  if(act(d.dataset.do,row,add))redraw();
 });
}

/* يُعاد رسمها من الخارج (مثلاً بعد تراجع) إن كانت مفتوحة */
export function refreshStyleManager(){
 const b=rptBox();
 if(b&&b.classList.contains("sm")){
  const body_=b.querySelector(".rpt-b");
  if(body_)body_.innerHTML=body();
 }
}

defTool({
 id:"styleMgr", alias:"styles ltypes hatches dimstyles linetypes أنماط أنماط_الرسم أنواع_الخطوط تهشير طرز_الأبعاد",
 label:"أنماط الرسم",
 hint:"أنواع الخطوط وأنماط التهشير وطُرز الأبعاد: إضافةٌ وتعديلٌ وحذف",
 ico:"props", own:1, nojr:1, noplan:1,
 start(){ openStyleManager(); return false; }
});
export {rptClose};
