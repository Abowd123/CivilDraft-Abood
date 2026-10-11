/* ═══ قائمة السياق على اللوحة ═══
   تُبنى من الحال: أداةٌ نشطة ⇒ تأكيدٌ وخياراتُ خطوتها وتراجعٌ
   وإلغاء · تحديدٌ قائم ⇒ أوامر نوعه من مخطّط الشريط نفسه (فلا
   قائمتان تتخلّف إحداهما) · سكونٌ ⇒ إعادةُ آخر أداة وأشيعُ الأوامر.

   والتنفيذ عبر runSpec نفسه الذي ينفّذ به الشريط. */
import {CTX} from "./ribbon/schema.js";
import {icon} from "./icons.js";
import {UIS} from "./store.js";
import * as R from "../tools/registry.js";
import {selList,draw} from "./canvas.js";
import {NAME} from "../core/ents.js";
import {pickable} from "../core/layers.js";
import {runSpec} from "./ribbon/wire.js";
import {HOOK,lazy} from "./bus.js";
import {escapeHtml as esc} from "../core/escape.js";

const $=s=>document.querySelector(s);
const ic=(n,s)=>UIS.icons?icon(n,s||14):"";
const rtl=()=>getComputedStyle(document.documentElement)
 .direction==="rtl";
const cl=(v,a,b)=>v<a?a:(v>b?b:v);

let ROWS=[];

const flat=(items,out)=>{
 (items||[]).forEach(it=>{
  if(it.group)flat(it.group,out); else out.push(it);
 });
 return out;
};
function rowsFor(){
 const out=[];
 const H=n=>out.push({h:n});
 const S2=()=>out.push({s:1});
 if(R.active()){
  const st=R.step();
  H(R.T.def.label+(st?" · "+st.p:""));
  out.push({fn:"enter",n:"تأكيد (Enter)",ico:"select"});
  if(st&&st.opts)Object.keys(st.opts).forEach(k=>out.push({
   fn:"opt:"+k,n:st.opts[k].n+` (${k.toUpperCase()})`,ico:"ctx"}));
  out.push({fn:"ustep",n:"تراجع خطوة",ico:"undo"});
  S2();
  out.push({fn:"cancel",n:"إلغاء الأداة (Esc)",ico:"close"});
  return out;
 }
 const L=selList();
 let kind=null;
 if(L.length){
  kind=L[0].k;
  for(const s of L)if(s.k!==kind){kind=null; break}
 }
 if(L.length){
  /* عنصرٌ من طبقةٍ مخفيّة أو مقفلة لا يقبل تعديلاً — نفس الفحص
     المُستعمَل في canvas.js (pruneSel وتحديد الصندوق) لا نسخةٌ ثانية
     من منطق الطبقات هنا. */
  const canEdit=L.every(pickable);
  H(L.length>1?`${L.length} عنصر`
   :`${L[0].id} ${NAME[L[0].k]||L[0].k}`);
  if(canEdit)
   ["move","copy","rotate","mirror"].forEach(c=>out.push(
    {cmd:c,n:{move:"نقل",copy:"نسخ",rotate:"دوران",
     mirror:"مرآة"}[c],ico:c}));
  if(kind&&CTX[kind]&&canEdit){
   S2();
   const seen=new Set();
   (CTX[kind].panels||[]).forEach(p=>flat(p.items,[])
    .forEach(it=>{
     const id=it.cmd||it.act;
     if(!id||seen.has(id))return;
     if(["move","copy","rotate","mirror"].includes(it.cmd))return;
     seen.add(id);
     out.push({cmd:it.cmd,act:it.act,n:it.n,ico:it.ico});
    }));
  }
  S2();
  out.push({fn:"clear",n:"ألغِ التحديد",ico:"close"});
  return out;
 }
 H("لا تحديد");
 if(R.T.last){
  const d=R.TOOLS[R.T.last];
  out.push({cmd:R.T.last,
   n:`أعِد «${d?d.label:R.T.last}»`,ico:"redo"});
  S2();
 }
 [["wall","جدار","wall"],["rect","مستطيل","rect"],
  ["dim","بُعد","dim"],["text","نصّ","text"]]
  .forEach(([c,n,i])=>out.push({cmd:c,n,ico:i}));
 S2();
 out.push({fn:"all",n:"تحديد المرئيّ (Ctrl+A)",ico:"select"});
 out.push({act:"fit",n:"ملاءمة",ico:"fit"});
 out.push({act:"undo",n:"تراجع",ico:"undo"});
 out.push({act:"inspect",n:"افحص",ico:"inspect"});
 return out;
}
export function ctxOpen(x,y){
 const m=$("#ctxMenu");
 if(!m)return false;
 ROWS=rowsFor();
 m.innerHTML=ROWS.map((r,i)=>r.s?`<div class="pmS"></div>`
  :(r.h?`<div class="pmH">${esc(r.h)}</div>`
  :`<button type="button" class="pmI" data-ctx="${i}">`
   +`${ic(r.ico||"ctx")}<span>${esc(r.n)}</span></button>`)).join("");
 m.hidden=false;
 const w=m.offsetWidth||220, h=m.offsetHeight||260;
 m.style.insetInlineStart=Math.round(
  cl(rtl()?(innerWidth-x-4):(x-w+4),4,innerWidth-w-4))+"px";
 m.style.insetBlockStart=Math.round(cl(y+2,4,innerHeight-h-8))+"px";
 const f=m.querySelector(".pmI");
 if(f)f.focus();
 return true;
}
export const ctxClose=()=>{
 const m=$("#ctxMenu");
 if(m&&!m.hidden){m.hidden=true; ROWS=[]}
};
export const ctxIsOpen=()=>{
 const m=$("#ctxMenu");
 return !!m&&!m.hidden;
};
function run(i){
 const r=ROWS[i];
 ctxClose();
 if(!r)return;
 if(r.cmd||r.act){runSpec(r); return}
 const f=r.fn||"";
 if(f==="enter"){R.enter(); HOOK.prompt(); draw(); return}
 if(f==="cancel"){R.cancel(); HOOK.prompt(); draw(); return}
 if(f==="ustep"){R.undoStep(); return}
 if(f.startsWith("opt:")){
  R.feedText(f.slice(4));
  HOOK.prompt(); draw();
  return;
 }
 if(f==="clear"){
  lazy(()=>import("./canvas.js").then(C=>{C.setSel([],null); C.draw()}),"إلغاء التحديد");
  return;
 }
 if(f==="all"){
  import("./canvas.js").then(C=>{
   HOOK.status(`${C.selectAll()} محدد`);
  });
 }
}
export function wireCtx(){
 const m=$("#ctxMenu");
 if(!m)return false;
 m.addEventListener("click",e=>{
  const b=e.target.closest("[data-ctx]");
  if(b)run(+b.dataset.ctx);
 });
 addEventListener("mousedown",e=>{
  if(ctxIsOpen()&&!m.contains(e.target))ctxClose();
 },true);
 addEventListener("keydown",e=>{
  if(!ctxIsOpen())return;
  if(e.key==="Escape"){
   e.preventDefault(); e.stopPropagation(); ctxClose();
   const cv=document.getElementById("cv");
   if(cv)cv.focus();
   return;
  }
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){
   e.preventDefault(); e.stopPropagation();
   const B=[...m.querySelectorAll(".pmI")];
   const i=B.indexOf(document.activeElement);
   const j=(i+(e.key==="ArrowDown"?1:-1)+B.length)%B.length;
   if(B[j])B[j].focus();
  }
 },true);
 return true;
}
