/* ═══ شريط التنقّل والمناظر المسمّاة ═══
   بديل عجلة أوتوكاد: أزرارٌ صريحة على حافة اللوحة.
   «تكبير نافذة» و«تحريك» وضعان مؤقّتان تُلغيهما Esc، ولا يدخلان
   سجلّ الأدوات لأنهما لا يُنشئان شيئاً ولا يعدّلان بياناتٍ — تنقّلٌ
   محض. ولهذا لا يظهران في المساعدة كأداتين.

   والمنظر إحداثيُّ عرضٍ لا بياناتُ رسم، فيسكن مخزن الواجهة: يبقى
   بين الجلسات ولا يُحمَل في ملفّ المشروع إلى حاسبٍ آخر. */
import {icon} from "./icons.js";
import {UIS,saveUI} from "./store.js";
import {V,fit,fitBox,zoomAt,navSet,navMode,zoomPrev,canPrev,
        draw} from "./canvas.js";
import {HOOK} from "./bus.js";
import {escapeHtml as esc} from "../core/escape.js";

const $=s=>document.querySelector(s);
const ic=(n,s)=>UIS.icons?icon(n,s||16):"";

const BTN=[
 {act:"fit",   n:"ملاءمة",       ico:"fit"},
 {act:"zwin",  n:"تكبير نافذة",  ico:"zwin",  mode:"zw"},
 {act:"zprev", n:"المنظر السابق",ico:"zprev"},
 {act:"zin",   n:"تكبير",        ico:"zin"},
 {act:"zout",  n:"تصغير",        ico:"zout"},
 {act:"pan",   n:"تحريك",        ico:"pan",   mode:"pan"},
 {act:"views", n:"مناظر مسمّاة", ico:"view"}
];
export function buildNav(){
 const n=$("#navbar");
 if(!n)return 0;
 n.innerHTML=BTN.map(b=>
  `<button type="button" data-nav="${esc(b.act)}" `
  +`title="${esc(b.n)}" aria-label="${esc(b.n)}">`
  +`${ic(b.ico)}</button>`).join("");
 return BTN.length;
}
export function syncNav(){
 const n=$("#navbar");
 if(!n)return;
 const m=navMode();
 n.querySelectorAll("[data-nav]").forEach(b=>{
  const d=BTN.find(x=>x.act===b.dataset.nav);
  b.classList.toggle("on",!!(d&&d.mode&&d.mode===m));
 });
 const p=n.querySelector('[data-nav="zprev"]');
 if(p)p.disabled=!canPrev();
}
/* ═══ المناظر ═══ */
const views=()=>{
 if(!Array.isArray(UIS.views))UIS.views=[];
 return UIS.views;
};
export function viewSave(name){
 const nm=String(name||"").trim().slice(0,28);
 if(!nm){HOOK.report("wr","الاسم فارغ"); return false}
 const A=views();
 const v={n:nm,k:V.k,cx:Math.round(V.cx),cy:Math.round(V.cy)};
 const i=A.findIndex(x=>x.n===nm);
 if(i>=0)A[i]=v; else A.push(v);
 if(A.length>24)A.shift();
 saveUI();
 HOOK.report("ok",`حُفظ المنظر «${nm}»`);
 return true;
}
export function viewGo(name){
 const v=views().find(x=>x.n===name);
 if(!v)return false;
 navSet(null);
 const w=V.w/Math.max(1e-6,v.k), h=V.h/Math.max(1e-6,v.k);
 fitBox({x0:v.cx-w/2,y0:v.cy-h/2,x1:v.cx+w/2,y1:v.cy+h/2},0);
 HOOK.report("in",`المنظر «${name}»`);
 return true;
}
export function viewDel(name){
 const A=views();
 const i=A.findIndex(x=>x.n===name);
 if(i<0)return false;
 A.splice(i,1);
 saveUI();
 HOOK.report("ok",`حُذف المنظر «${name}»`);
 return true;
}
function vmOpen(x,y){
 const m=$("#vMenu");
 if(!m)return;
 const A=views();
 m.innerHTML=`<div class="pmH">مناظر مسمّاة</div>`
  +(A.length?A.map(v=>
   `<button type="button" class="pmI" data-vma="go:${esc(v.n)}">`
   +`${ic("view",14)}<span>${esc(v.n)}</span>`
   +`<span class="ky mono num">1:${Math.round(1/Math.max(1e-9,v.k))}`
   +`</span></button>`
   +`<button type="button" class="pmI pmDel" `
   +`data-vma="del:${esc(v.n)}" title="حذف">${ic("close",14)}`
   +`</button>`).join("")
   :`<div class="pmE">لا مناظر محفوظة</div>`)
  +`<div class="pmS"></div>`
  +`<button type="button" class="pmI" data-vma="save">`
  +`${ic("save",14)}<span>احفظ المنظر الحالي…</span></button>`;
 m.hidden=false;
 const rtl=getComputedStyle(document.documentElement)
  .direction==="rtl";
 const w=m.offsetWidth||234, h=m.offsetHeight||220;
 const cl=(v,a,b)=>v<a?a:(v>b?b:v);
 m.style.insetInlineStart=Math.round(
  cl(rtl?(innerWidth-x+4):(x-w-4),4,innerWidth-w-4))+"px";
 m.style.insetBlockStart=Math.round(cl(y,4,innerHeight-h-8))+"px";
}
const vmClose=()=>{const m=$("#vMenu"); if(m)m.hidden=true};

export function runNav(act){
 if(act==="fit"){navSet(null); fit(); HOOK.status("مُلوئم"); return}
 if(act==="zin"){zoomAt(V.w/2,V.h/2,1.25); return}
 if(act==="zout"){zoomAt(V.w/2,V.h/2,1/1.25); return}
 if(act==="zprev"){
  if(!zoomPrev())HOOK.report("in","لا منظر سابق");
  syncNav(); return;
 }
 if(act==="zwin"||act==="pan"){
  const m=(act==="zwin")?"zw":"pan";
  const on=navSet(navMode()===m?null:m);
  HOOK.status(on==="zw"?"اسحب إطار التكبير · Esc يلغي"
   :(on==="pan"?"اسحب لتحريك المنظر · Esc يلغي":""));
  syncNav(); draw(); return;
 }
 if(act==="views"){
  const b=document.querySelector('[data-nav="views"]');
  const r=b?b.getBoundingClientRect():{left:innerWidth-60,top:120};
  vmOpen(r.left,r.top);
 }
}
export function wireNav(){
 buildNav();
 const n=$("#navbar");
 if(!n)return false;
 n.addEventListener("click",e=>{
  const b=e.target.closest("[data-nav]");
  if(b&&!b.disabled)runNav(b.dataset.nav);
 });
 document.addEventListener("click",e=>{
  const a=e.target.closest("[data-vma]");
  if(!a)return;
  const v=a.dataset.vma;
  const g=/^go:(.+)$/.exec(v);
  if(g){vmClose(); viewGo(g[1]); return}
  const d=/^del:(.+)$/.exec(v);
  if(d){
   if(!confirm(`حذف المنظر «${d[1]}»؟`))return;
   viewDel(d[1]);
   const b=document.querySelector('[data-nav="views"]');
   const r=b?b.getBoundingClientRect():{left:innerWidth-60,top:120};
   vmOpen(r.left,r.top);
   return;
  }
  if(v==="save"){
   vmClose();
   const nm=prompt("اسم المنظر:","منظر "+(views().length+1));
   if(nm!=null)viewSave(nm);
  }
 });
 addEventListener("mousedown",e=>{
  const m=$("#vMenu");
  if(m&&!m.hidden&&!m.contains(e.target)
   &&!e.target.closest('[data-nav="views"]'))vmClose();
 },true);
 addEventListener("keydown",e=>{
  const m=$("#vMenu");
  if(e.key==="Escape"&&m&&!m.hidden){
   e.preventDefault(); e.stopPropagation(); vmClose();
  }
 },true);
 return true;
}
export {vmClose};
