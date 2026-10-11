/* ═══ سطر الأوامر: الموضع والسجل ═══
   العُقَد تُنقَل ولا تُبنى — كعقد dock.js نفسه: #cmdWrap ينتقل بين
   أسفل اللوحة وأعلاها ونافذةٍ عائمة، فيحفظ مستمعيه وقيمة الحقل
   وموضع تمرير السجل. وإعادة بنائه كانت ستُفقِد ما يكتبه المستخدم
   وسط أمر. */
import {UIS,uiSet,saveUI} from "./store.js";
import {keepObserver} from "../core/delegate.js";
import {icon} from "./icons.js";
import {HOOK} from "./bus.js";
import {escapeHtml as esc} from "../core/escape.js";

const $=s=>document.querySelector(s);
const ic=(n,s)=>UIS.icons?icon(n,s||14):"";
const rtl=()=>getComputedStyle(document.documentElement)
 .direction==="rtl";
const cl=(v,a,b)=>v<a?a:(v>b?b:v);

export const CMODES={bottom:"أسفل اللوحة",top:"أعلى اللوحة",
 float:"نافذة عائمة"};
export const LOGH={0:"بلا سجل",84:"منخفض",120:"متوسط",200:"مرتفع"};
export const OPAS={100:"معتم",88:"شفافية خفيفة",72:"شفافية أوسع"};

/* ═══ طيّ السجل ═══ زرٌّ جوار ⋮: إخفاءٌ بصريّ لا مساسٌ بارتفاع
   المستخدم المفضَّل (logH). المطويُّ يُفتَح يدوياً فحسب — بلا نكسةٍ
   تلقائيةٍ تقفز فوق حالةٍ أطواها المستخدم عمداً. */
let LOG_FOLDED=false;
function syncFoldBtn(){
 const b=$("#clFoldBtn");
 if(!b)return;
 b.textContent=LOG_FOLDED?"▼":"▲";
 b.setAttribute("aria-pressed",LOG_FOLDED?"true":"false");
 b.title=LOG_FOLDED?"افتح السجل":"اطوِ السجل";
}
function toggleFold(){
 LOG_FOLDED=!LOG_FOLDED;
 applyCmd();
}

/* ═══ طباعة السجل (A4) ═══
   في النافذة نفسها لا نافذةٍ منبثقة: CSP المشروع (style-src 'self')
   يمنع الأنماط المضمَّنة في about:blank، وحاجبُ المنبثقات يقتلها.
   فتُستنسَخ عقدُ #log إلى ورقةٍ مؤقّتة #logPrint، ويقوم @media print في
   cmd.css بإخفاء كل ما عداها وضبط @page على A4. cloneNode لا
   innerHTML: لا إعادةَ تحليلٍ للنصّ، ولا يُمَسّ السجلّ الأصل. */
export function printLog(){
 const lg=$("#log");
 if(!lg||!lg.childNodes.length){
  HOOK.report("in","السجل فارغ — لا شيء يُطبَع");
  return false;
 }
 const old=$("#logPrint");
 if(old)old.remove();
 const sheet=document.createElement("div");
 sheet.id="logPrint";
 const h=document.createElement("h3");
 h.textContent="سجل الأوامر — CivilDraft — "+new Date().toLocaleString("ar");
 const body=lg.cloneNode(true);
 body.removeAttribute("id");
 body.removeAttribute("hidden");
 body.removeAttribute("style");
 body.className="logPrintBody";
 sheet.appendChild(h);
 sheet.appendChild(body);
 document.body.appendChild(sheet);
 const root=document.documentElement;
 root.classList.add("printLog");
 const done=()=>{
  root.classList.remove("printLog");
  sheet.remove();
  removeEventListener("afterprint",done);
 };
 addEventListener("afterprint",done);
 try{print()}catch(e){done(); HOOK.report("er","تعذّرت الطباعة"); return false}
 return true;
}
/* ═══ التطبيق ═══ */
export function applyCmd(){
 const w=$("#cmdWrap"), work=$("#work"), fl=$("#cmdFloat"),
       stage=$("#stage"), lg=$("#log");
 if(!w||!work)return;
 const m=CMODES[UIS.cmdMode]?UIS.cmdMode:"bottom";
 w.dataset.mode=m;
 if(m==="float"){
  fl.appendChild(w);
  placeCmd();
 }else if(m==="top"){
  work.insertBefore(w,stage);
 }else{
  work.appendChild(w);
 }
 if(lg){
  const h=LOGH[UIS.logH]!==undefined?+UIS.logH:120;
  lg.hidden=(h===0)||!!UIS.clean||LOG_FOLDED;
  if(h>0)lg.style.height=h+"px";
 }
 syncFoldBtn();
 w.style.setProperty("--cmdOpa",String((+UIS.cmdOpa||100)/100));
 w.hidden=!!UIS.clean;
 dispatchEvent(new Event("resize"));
}
function placeCmd(){
 const w=$("#cmdWrap");
 if(!w||UIS.cmdMode!=="float")return;
 const W=innerWidth, H=innerHeight;
 UIS.cmdW=Math.round(cl(+UIS.cmdW||620,320,Math.max(360,W-40)));
 UIS.cmdX=Math.round(cl(+UIS.cmdX||24,-UIS.cmdW+120,Math.max(0,W-140)));
 UIS.cmdY=Math.round(cl(+UIS.cmdY||(H-220),40,Math.max(60,H-90)));
 w.style.insetInlineStart=UIS.cmdX+"px";
 w.style.insetBlockStart=UIS.cmdY+"px";
 w.style.inlineSize=UIS.cmdW+"px";
}
export function setCmdMode(m){
 if(!CMODES[m])return false;
 uiSet("cmdMode",m);
 applyCmd();
 HOOK.report("in",`سطر الأوامر: ${CMODES[m]}`);
 const c=$("#clIn");
 if(c)c.focus();
 return true;
}
export function setLogH(h){
 uiSet("logH",+h||0);
 applyCmd();
 HOOK.report("in",`السجل: ${LOGH[+h]||h+" بكسل"}`);
}
export function setCmdOpa(v){
 uiSet("cmdOpa",cl(Math.round(+v||100),40,100));
 applyCmd();
}
export function clearLog(){
 const lg=$("#log");
 if(lg)lg.innerHTML="";
 HOOK.report("in","فُرّغ السجل");
}
/* ═══ القائمة ═══ */
export function cmdMenu(x,y){
 const m=$("#cMenu");
 if(!m)return;
 const row=(a,n,i,on)=>`<button type="button" class="pmI" `
  +`data-cma="${esc(a)}">${ic(i)}<span>${esc(n)}</span>`
  +`<span class="ky">${on?"●":""}</span></button>`;
 m.innerHTML=`<div class="pmH">سطر الأوامر</div>`
  +Object.keys(CMODES).map(k=>row("m:"+k,CMODES[k],
   k==="float"?"float":(k==="top"?"up":"down"),
   UIS.cmdMode===k)).join("")
  +`<div class="pmS"></div>`
  +Object.keys(LOGH).map(k=>row("h:"+k,LOGH[k],"cmdl",
   String(UIS.logH)===k)).join("")
  +`<div class="pmS"></div>`
  +Object.keys(OPAS).map(k=>row("o:"+k,OPAS[k],"opa",
   String(UIS.cmdOpa)===k)).join("")
  +`<div class="pmS"></div>`
  +`<button type="button" class="pmI" data-cma="clr">`
  +`${ic("clear")}<span>فرّغ السجل</span></button>`;
 m.hidden=false;
 const w=m.offsetWidth||230, h=m.offsetHeight||330;
 m.style.insetInlineStart=Math.round(
  cl(rtl()?(innerWidth-x-4):(x-w+4),4,innerWidth-w-4))+"px";
 m.style.insetBlockStart=Math.round(cl(y-h-6,4,innerHeight-h-8))+"px";
}
export const cmdMenuClose=()=>{
 const m=$("#cMenu");
 if(m)m.hidden=true;
};
function cmdRun(a){
 cmdMenuClose();
 const m=/^m:(\w+)$/.exec(a);
 if(m)return setCmdMode(m[1]);
 const h=/^h:(\d+)$/.exec(a);
 if(h)return setLogH(h[1]);
 const o=/^o:(\d+)$/.exec(a);
 if(o)return setCmdOpa(o[1]);
 if(a==="clr")return clearLog();
}
/* ═══ التوصيل ═══ */
let DRG=null;
export function wireCmd(){
 const bar=$("#cmdline");
 if(!bar)return false;
 if(!$("#clFoldBtn"))bar.insertAdjacentHTML("beforeend",
  `<button type="button" id="clFoldBtn" title="اطوِ السجل"`
  +` aria-label="اطوِ السجل" aria-pressed="false">▲</button>`);
 if(!$("#clPrintBtn"))bar.insertAdjacentHTML("beforeend",
  `<button type="button" id="clPrintBtn" title="اطبع السجل (A4)"`
  +` aria-label="اطبع السجل">⎙</button>`);
 if(!$("#clMenuBtn"))bar.insertAdjacentHTML("beforeend",
  `<button type="button" id="clMenuBtn" title="موضع سطر الأوامر"`
  +` aria-label="خيارات سطر الأوامر">⋮</button>`);
 document.addEventListener("click",e=>{
  if(e.target.closest("#clFoldBtn")){toggleFold(); return}
  if(e.target.closest("#clPrintBtn")){printLog(); return}
  if(e.target.closest("#clMenuBtn")){
   const r=e.target.closest("#clMenuBtn").getBoundingClientRect();
   cmdMenu(rtl()?r.left:r.right,r.top);
   return;
  }
  const a=e.target.closest("[data-cma]");
  if(a)cmdRun(a.dataset.cma);
 });
 /* P5-006: المنفِّذُ واحدٌ للماوس وللمس — انظر الشرح في ui/dock.js */
 const notMouse=e=>!e||e.pointerType!=="mouse";
 const onCmdDown=e=>{
  const m=$("#cMenu");
  if(m&&!m.hidden&&!m.contains(e.target)
   &&!e.target.closest("#clMenuBtn"))cmdMenuClose();
  /* السحب في الوضع العائم: من الشريط لا من الحقل */
  if(UIS.cmdMode!=="float"||UIS.lockUI)return;
  const b=e.target.closest("#cmdline");
  if(!b||e.target.closest("input,button"))return;
  DRG={px:e.clientX,py:e.clientY,x:+UIS.cmdX||24,y:+UIS.cmdY||0,on:0};
  document.documentElement.classList.add("dragging");
  if(e.pointerId!=null&&b.setPointerCapture){
   try{b.setPointerCapture(e.pointerId)}catch(_){}
  }
 };
 addEventListener("mousedown",onCmdDown,true);
 addEventListener("pointerdown",e=>{if(notMouse(e))onCmdDown(e)},true);
 const onCmdMove=e=>{
  if(!DRG)return;
  const dx=e.clientX-DRG.px, dy=e.clientY-DRG.py;
  if(!DRG.on&&Math.hypot(dx,dy)<4)return;
  DRG.on=1;
  UIS.cmdX=Math.round(DRG.x+(rtl()?-dx:dx));
  UIS.cmdY=Math.round(DRG.y+dy);
  placeCmd();
 };
 addEventListener("mousemove",onCmdMove);
 addEventListener("pointermove",e=>{if(notMouse(e))onCmdMove(e)});
 const onCmdUp=()=>{
  if(!DRG)return;
  const on=DRG.on;
  DRG=null;
  document.documentElement.classList.remove("dragging");
  if(on)saveUI();
 };
 addEventListener("mouseup",onCmdUp);
 addEventListener("pointerup",e=>{if(notMouse(e))onCmdUp()});
 addEventListener("pointercancel",e=>{if(notMouse(e))onCmdUp()});
 addEventListener("lostpointercapture",onCmdUp);
 addEventListener("keydown",e=>{
  const m=$("#cMenu");
  if(e.key==="Escape"&&m&&!m.hidden){
   e.preventDefault(); e.stopPropagation(); cmdMenuClose();
  }
 },true);
 addEventListener("resize",()=>placeCmd());
 if(typeof ResizeObserver!=="undefined"){
  const w=$("#cmdWrap");
  let t=null;
  /* P2-013: يُسجَّل باسمه — إعادةُ النداء تفصل القديم قبل الجديد */
  keepObserver("cmdWrap",new ResizeObserver(()=>{
   if(UIS.cmdMode!=="float")return;
   UIS.cmdW=Math.round(w.offsetWidth);
   if(t)clearTimeout(t);
   t=setTimeout(()=>{t=null; saveUI()},400);
  })).observe(w);
 }
 applyCmd();
 return true;
}
/* ═══ حفظ التركيز ═══
   يُنادى عقب كل عمليةٍ تُعيد بناء أجزاء الواجهة كي لا يقفز التركيز
   من الحقل إلى body. يُعيده فقط إن كان قد ضاع فعلاً (body أو لا شيء):
   لا يسرق التركيز من حقلٍ آخر يكتب فيه المستخدم. */
export function keepFocus(){
 setTimeout(()=>{
  const i=$("#clIn");
  const a=document.activeElement;
  if(i&&(!a||a===document.body))i.focus();
 },0);
}
