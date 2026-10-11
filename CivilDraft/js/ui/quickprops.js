/* ═══ الخصائص السريعة ═══
   بطاقةٌ صغيرة قرب المحدَّد تحمل أهمّ حقوله. لا مُثبِّتَ فيها ولا
   قراءةَ خاصّة: تبثّ سمتي data-bk= وdata-bf= نفسيهما اللتين
   يبثّهما التعديل الجماعي (عبر fldCtl في props.js)، فيتولّاها
   معالج props.js بمُثبِّتات batch.js ورسائل رفضها وخطوة تراجعها —
   والحقل المختلف يظهر «متعدّداً» ولا يُكتب من تلقائه، كما في
   اللوحة الكاملة تماماً.

   وتُسجَّل في panels.js فتُرسَم مع المرئيّ وتُوسَم متّسخةً كغيرها. */
import {FLD,readField,groupSel} from "../core/batch.js";
import {NAME} from "../core/ents.js";
import "../core/units.js";
import {UIS,uiSet,saveUI} from "./store.js";
import {icon} from "./icons.js";
import {reg,renderPanel,markDirty} from "./panels.js";
import {selList,shapeOfSel,W2S,V} from "./canvas.js";
import {HOOK} from "./bus.js";
/* ═══ المتحكِّمُ من المولِّد الواحد ═══
   والغلافُ .qf يبقى هيئتَها: المُوحَّدُ عقدُ الحقل — اسمُ السمة
   وقائمةُ العناصر والحدُّ وحالُ التعدّد — لا صفُّ العرض. */
import {fldCtl} from "./props.js";
import {escapeHtml as esc} from "../core/escape.js";

const $=s=>document.querySelector(s);
const ic=(n,s)=>UIS.icons?icon(n,s||14):"";
const cl=(v,a,b)=>v<a?a:(v>b?b:v);

/* أهمّ حقولٍ لكل نوع — والباقي في اللوحة الكاملة */
export const QF={
 wall:["t","align","type"],
 open:["kind","w","h","sill"],
 col:["kind","w","h","type"],
 fix:["kind","w","d","mir"],
 stair:["w","n","up"],
 area:["name","fill","showArea"],
 dim:["kind","txt"],
 chain:["total"],
 anno:["hm","al","pre"]
};
export const qpOn=()=>!!UIS.qp;

function ctl(kind,f,r){
 const C={kind, val:r.mixed?null:r.value, mixed:!!r.mixed,
  own:r.own};
 const c=fldCtl(f,C.val,C);
 if(f.t==="chk")
  return `<label class="chk">${c} ${esc(f.n)}</label>`;
 return `<span class="qf"><label>${esc(f.n)}</label>${c}</span>`;
}
export function renderQuick(box){
 const L=selList();
 if(!L.length){box.innerHTML=""; return}
 const G=groupSel(L);
 const KS=Object.keys(G).filter(k=>G[k].length);
 if(KS.length!==1){
  box.innerHTML=`<p class="hint">${L.length} عنصر من `
   +`${KS.length||0} نوعاً — افتح «الخصائص» للتعديل الجماعي</p>`;
  return;
 }
 const kind=KS[0], arr=G[kind];
 const keys=QF[kind]||[];
 const rows=[];
 keys.forEach(k=>{
  const f=(FLD[kind]||[]).find(x=>x.k===k);
  if(!f)return;
  const r=readField(kind,arr,k);
  if(!r.own)return;
  rows.push(ctl(kind,f,r));
 });
 box.innerHTML=rows.length?rows.join("")
  :`<p class="hint">لا حقولَ سريعة لهذا النوع</p>`;
 box.querySelectorAll('[data-mix="1"]')
  .forEach(el=>{el.indeterminate=true});
}
function head(){
 const h=$("#qpHead");
 if(!h)return;
 const L=selList();
 if(!L.length){h.textContent=""; return}
 const G=groupSel(L);
 const KS=Object.keys(G).filter(k=>G[k].length);
 h.textContent=(L.length===1)
  ? `${L[0].id} ${NAME[L[0].k]||L[0].k}`
  : `${L.length} ${KS.length===1?(NAME[KS[0]]||KS[0]):"عنصر"}`;
}
/* الموضع: قرب المحدَّد عند كل تحديدٍ جديد، إلّا إن سحبتَها فتثبت */
function place(){
 const card=$("#qpCard");
 if(!card)return;
 if(UIS.qpFree){
  card.style.insetInlineStart=(+UIS.qpX||16)+"px";
  card.style.insetBlockStart=(+UIS.qpY||16)+"px";
  return;
 }
 const L=selList();
 let p=null;
 if(L.length){
  const sh=shapeOfSel(L[L.length-1]);
  if(sh)p=W2S(sh[0],sh[1]);
 }
 const w=card.offsetWidth||236, h=card.offsetHeight||120;
 const x=p?cl(p[0]+22,4,Math.max(4,V.w-w-4)):8;
 const y=p?cl(p[1]+18,4,Math.max(4,V.h-h-4)):8;
 card.style.insetInlineStart=Math.round(x)+"px";
 card.style.insetBlockStart=Math.round(y)+"px";
}
export function quickSel(){
 const card=$("#qpCard");
 if(!card)return;
 const L=selList();
 const show=qpOn()&&L.length>0&&!UIS.clean;
 card.hidden=!show;
 if(!show)return;
 head();
 markDirty("quick");
 renderPanel("quick");
 place();
}
export function qpToggle(){
 uiSet("qp",UIS.qp?0:1);
 quickSel();
 HOOK.report("in",`الخصائص السريعة: ${UIS.qp?"ظاهرة":"مخفيّة"}`);
 HOOK.toggles();
 return UIS.qp;
}
let DRG=null;
export function wireQuick(){
 const card=$("#qpCard");
 if(!card)return false;
 reg("quick","#qpBody",renderQuick,"خصائص سريعة");
 card.addEventListener("click",e=>{
  if(e.target.closest("#qpClose")){qpToggle(); return}
 });
 card.addEventListener("keydown",e=>{
  if(e.key==="Escape"){e.target.blur(); return}
  e.stopPropagation();
 });
 /* السحب من الترويسة — وأوّل سحبةٍ تفكّ التتبّع فتثبت البطاقة */
 card.addEventListener("mousedown",e=>{
  if(UIS.lockUI)return;
  if(!e.target.closest(".qpH")||e.target.closest("button"))return;
  const r=card.getBoundingClientRect();
  const st=$("#stage").getBoundingClientRect();
  DRG={px:e.clientX,py:e.clientY,
   x:r.left-st.left,y:r.top-st.top,on:0,
   rtl:getComputedStyle(document.documentElement).direction==="rtl"};
  document.documentElement.classList.add("dragging");
 });
 addEventListener("mousemove",e=>{
  if(!DRG)return;
  const dx=e.clientX-DRG.px, dy=e.clientY-DRG.py;
  if(!DRG.on&&Math.hypot(dx,dy)<4)return;
  DRG.on=1;
  const card2=$("#qpCard");
  const w=card2.offsetWidth||236, h=card2.offsetHeight||120;
  const ix=DRG.rtl?(V.w-DRG.x-w):DRG.x;
  UIS.qpX=Math.round(cl(ix+(DRG.rtl?-dx:dx),0,Math.max(0,V.w-w)));
  UIS.qpY=Math.round(cl(DRG.y+dy,0,Math.max(0,V.h-h)));
  UIS.qpFree=1;
  place();
 });
 addEventListener("mouseup",()=>{
  if(!DRG)return;
  const on=DRG.on;
  DRG=null;
  document.documentElement.classList.remove("dragging");
  if(on)saveUI();
 });
 /* ═══ D6-08 ═══ قفّازةٌ إلى الحرّية (qpFree=1) بلا رجوع — نقرةٌ
    مزدوجة على الترويسة تُعيد البطاقة لتتبّع التحديد. */
 card.addEventListener("dblclick",e=>{
  if(!e.target.closest(".qpH")||e.target.closest("button"))return;
  UIS.qpFree=0; UIS.qpX=16; UIS.qpY=16;
  place(); saveUI();
 });
 return true;
}
