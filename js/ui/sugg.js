/* ═══ اقتراحات الأدوات في سطر الإدخال ═══ D12-EP7: مستخرَجة من app.js
   بلا تغيير سلوك. قائمةٌ بسيطة من أسماء الأدوات المسجَّلة تُبنى أثناء
   الكتابة، تُدوَّر بـ Tab وتُنفَّذ بالنقر أو Enter (حين تُبرَز فعلاً). */
import {lazy} from "./bus.js";
import * as R from "../tools/registry.js";
import {jrAdd} from "../core/journal.js";
import {escapeHtml as esc} from "../core/escape.js";
import {clamp} from "../core/units.js";
import {draw,setSel,selList} from "./canvas.js";
import {rep} from "./props.js";
import {help} from "./helppan.js";

let C=null, hist=-1;
let sugList=[], sugIdx=-1, sugNav=false;

function sugHide(){sugList=[];sugIdx=-1;sugNav=false;
 if(C&&C.clSug){C.clSug.hidden=true;C.clSug.innerHTML=""}}
function sugRender(){
 if(!C||!C.clSug)return;
 C.clSug.innerHTML=sugList.map((k,i)=>
  `<div class="it${i===sugIdx?" sel":""}" data-i="${i}">${esc(k)}</div>`
 ).join("");
}
function sugBuild(){
 if(!C||!C.clSug)return;
 sugNav=false;
 const v=C.cl.value.trim().toLowerCase();
 if(!v||R.active()){sugHide();return}
 sugList=[...new Set(Object.keys(R.TOOLS))]
  .filter(k=>k.startsWith(v)).sort().slice(0,8);
 if(!sugList.length){sugHide();return}
 sugIdx=0;
 sugRender();
 C.clSug.hidden=false;
}
function sugRotate(dir){
 if(!sugList.length)return;
 sugNav=true;
 sugIdx=(sugIdx+dir+sugList.length)%sugList.length;
 sugRender();
}
function sugCommit(v){
 C.cl.value=""; hist=-1; sugHide();
 if(R.active()){
  if(v){jrAdd(v); R.feedText(v)}
  else{jrAdd("enter"); R.enter()}
 }else if(v){
  /* ؟ يُحوّل السطر إلى المساعد — بادئةٌ صريحة */
  if(/^[?؟]/.test(v)){
   const q=v.replace(/^[?؟]\s*/,"").trim();
   if(!q){
    rep("in","اكتب سؤالك بعد ؟ زي كده: ؟ ارسم أوضة 4 في 5");
    C.syncPrompt(); return;
   }
   jrAdd(v);
   R.histAdd(v);
   lazy(()=>import("./ai.js").then(A=>A.askFromLine(q)),"سؤال المساعد");
   C.syncPrompt(); return;
  }
  jrAdd(v);
  R.histAdd(v);
  let d=R.findTool(v), arg=null;
  if(!d){
   const i=v.search(/\s/);
   if(i>0){
    const t=R.findTool(v.slice(0,i));
    if(t&&R.tailOk(t,v.slice(i+1).trim())){d=t; arg=v.slice(i+1).trim()}
   }
  }
  if(d)R.begin(d,arg);
  else rep("er",`مافيش أداة اسمها «${v}» — جرّب Ctrl+K ودوّر عليها`);
 }else if(R.T.last){
  jrAdd("enter");        /* تكرارُ آخر أداة */
  R.begin(R.T.last,R.T.lastArg);
 }
 C.syncPrompt(); draw();
}

export function initSugg(ctx){
 C=ctx;
 const cl=C.cl, clSug=C.clSug;
 if(clSug)clSug.addEventListener("mousedown",e=>{
  const it=e.target.closest("[data-i]");
  if(!it)return;
  e.preventDefault();
  sugCommit(sugList[+it.dataset.i]);
 });
 cl.addEventListener("keydown",e=>{
  const k=e.key, ck=e.ctrlKey||e.metaKey;
  if(k==="Escape"){
   e.preventDefault();
   if(sugList.length)sugHide();
   else if(cl.value)cl.value="";
   else if(R.active()){jrAdd("esc"); R.cancel()}
   else{jrAdd("esc"); setSel([],null)}
   C.syncPrompt(); draw(); return;
  }
  if(k==="ArrowUp"||k==="ArrowDown"){
   if(!cl.value&&selList().length)return;  /* اترك الأمر يصعد للنُدج */
   if(!R.T.hist.length)return;
   e.preventDefault();
   if(hist<0)hist=R.T.hist.length;
   hist=clamp(hist+(k==="ArrowUp"?-1:1),0,R.T.hist.length);
   cl.value=(hist<R.T.hist.length)?R.T.hist[hist]:"";
   sugHide();
   return;
  }
  if((k==="ArrowLeft"||k==="ArrowRight")&&!cl.value)return;
  const argTool=()=>{
   if(R.active())return false;
   const h=cl.value.trim().split(/\s+/)[0];
   const d=h?R.findTool(h):null;
   return !!(d&&d.arg);
  };
  const freeText=/^[?؟]/.test(cl.value)
   ||(R.active()&&R.step()&&R.step().text)
   ||argTool();
  if(k==="Enter"||(k===" "&&!freeText&&!cl.value.includes(" "))){
   e.preventDefault();
   if(sugNav&&sugList.length){sugCommit(sugList[sugIdx]);return}
   const v=cl.value.trim();
   /* وضعُ العرض يُري السطرَ المنفَّذ فقاعةً (presenter.js) — حدثٌ لا استيراد */
   if(v&&typeof CustomEvent==="function")document.dispatchEvent(new CustomEvent("cd:cmd",{detail:{s:v}}));
   sugCommit(v);
   return;
  }
  if(k==="F1"){e.preventDefault();help();return}
  if(k==="Tab"){
   if(!sugList.length)return;
   e.preventDefault();
   sugRotate(e.shiftKey?-1:1);
   return;
  }
  if(ck||/^F\d+$/.test(k))return;   /* لا نوقف: تصعد إلى المعالج العامّ */
  if(!cl.value&&(k==="Delete"||k==="Backspace"))return;
  e.stopPropagation();
 });
 cl.addEventListener("input",()=>{sugBuild()});
 cl.addEventListener("blur",()=>sugHide());
}
