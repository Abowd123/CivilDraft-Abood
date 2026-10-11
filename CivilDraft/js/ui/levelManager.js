/* ═══ إدارة الطوابق — الواجهة ═══
   المنطق الخالص في tools/levelmgr.js (يُختبَر بلا DOM). هنا النافذة
   وتسجيل الأمر: اسمٌ ومنسوبٌ وارتفاعٌ وبلاطةٌ ولون، وخيار poché،
   وفحص المحاذاة (نفسُه الذي يظهر في F7). كل نصٍّ من المشروع يمرّ
   بـesc، ولا onclick ولا style مضمَّن (CSP). */
import {escapeHtml as esc} from "../core/escape.js";
import {S} from "../core/state.js";
import {findMisaligned} from "../core/levelAlign.js";
import {defTool,H} from "../tools/registry.js";
import {levelRows,levelWarnings,applyLevels,addLevel} from "../tools/levelmgr.js";
import {rptOpen,rptClose,rptBox} from "./rpt.js";
import {bindOnce} from "../core/delegate.js";

const F=["name","elev","h","slab","color"];

function body(){
 const rows=levelRows();
 let h=`<table class="rpt-tbl"><tr><th>#</th><th>الاسم</th><th>المنسوب</th>`
  +`<th>الارتفاع</th><th>البلاطة</th><th>اللون</th><th>كيانات</th></tr>`;
 h+=rows.map(r=>`<tr data-n="${r.n}"><td>${r.n}${r.active?" ●":""}</td>`
  +`<td><input data-f="name" maxlength="40" value="${esc(r.name)}"></td>`
  +`<td><input data-f="elev" type="number" inputmode="decimal" value="${r.elev}"></td>`
  +`<td><input data-f="h" type="number" inputmode="decimal" min="2000" max="8000" value="${r.h}"></td>`
  +`<td><input data-f="slab" type="number" inputmode="decimal" min="0" max="1000" value="${r.slab}"></td>`
  +`<td><input data-f="color" type="color" value="${esc(r.color)}"></td>`
  +`<td>${r.ents}</td></tr>`).join("");
 h+=`</table>`;
 const w=levelWarnings(rows);
 if(w.length)h+=w.map(x=>`<div class="ln wr">⚠ ${esc(x)}</div>`).join("");
 h+=`<label><input type="checkbox" data-poche `
  +`${S.opt.fill!=="none"?"checked":""}> Poché (تعبئة الجدران)</label>`
  +`<div class="rpt-act">`
  +`<button type="button" data-do="add">+ طابق</button>`
  +`<button type="button" data-do="save">حفظ</button>`
  +`<button type="button" data-do="align">فحص المحاذاة</button>`
  +`<button type="button" data-rpt="close">إغلاق</button></div>`
  +`<div data-align></div>`;
 return h;
}

function readRows(box){
 return [...box.querySelectorAll("tr[data-n]")].map(tr=>{
  const r={n:+tr.dataset.n};
  F.forEach(f=>{ r[f]=tr.querySelector(`[data-f="${f}"]`).value });
  return r;
 });
}

export function openLevelManager(){
 const box=rptOpen("إدارة الطوابق",body());
 wire(box);
}

/* ═══ مستمعٌ واحدٌ مفوَّض ═══ P2-001
   كان redraw يُعيد نداءَ wire(box)، فكلُّ حفظٍ أو إضافةٍ يضيف مستمعَ
   click جديداً إلى نفس الصندوق: بعد n عمليةٍ تعمل n معاودات وتبقى
   closures حيّةً بالنافذة. والتفويضُ لا يحتاج إعادةَ ربط: المحتوى
   يُستبدَل و«closest» يصل إلى الهدف، فredraw يرسم ولا يربط. */
function wire(box){
 const redraw=()=>{
  const b=box.querySelector(".rpt-b");
  if(b)b.innerHTML=body();
 };
 bindOnce(box,"click",e=>{
  const t=e.target.closest&&e.target.closest("[data-do]");
  if(!t||rptBox()!==box)return;
  const a=t.dataset.do;
  if(a==="add"){
   /* احفظ ما كُتب قبل إعادة الرسم كي لا يضيع */
   applyLevels(readRows(box));
   try{ addLevel() }catch(err){ H.rep("er",err.message) }
   H.refresh(); redraw();
  }else if(a==="save"){
   const p=box.querySelector("[data-poche]");
   const res=applyLevels(readRows(box),p?p.checked:undefined);
   H.rep(res.fail.length?"wr":"ok",
    `حُفظ ${res.saved} طابق`
    +(res.fail.length?` — رُفض: ${res.fail.join(" · ")}`:""));
   H.refresh(); redraw();
  }else if(a==="align"){
   const mis=findMisaligned(S,50);
   box.querySelector("[data-align]").innerHTML=mis.length
    ?mis.map(m=>`<div class="ln wr">⚠ ${esc(m.msg)}</div>`).join("")
    :`<div class="ln rpt-ok">✅ كل الطوابق محاذية</div>`;
  }
 },"levelMgr");
}

defTool({
 id:"levelMgr", alias:"levels floors طوابق ادوار إدارة_الطوابق",
 label:"إدارة الطوابق",
 hint:"اسم كل طابق ومنسوبه وارتفاعه وبلاطته، وpoché، وفحص المحاذاة",
 ico:"layers", own:1, nojr:1, noplan:1,
 start(){ openLevelManager(); return false; }
});
export {rptClose};
