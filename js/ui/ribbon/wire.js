/* ═══ موصِّل الشريط ═══
   الأدوات تُنادى مباشرةً. وكل ما عداها ينقر زرَّه القائم في
   اللوحة الجانبية بعد فتح قسمه — فلا منطقَ مكرّراً، ولوحةٌ واحدة
   هي المرجع، ويرى المستخدم أين يسكن الأمر فيتعلّم موضعه.
   ولهذا يبقى #tools في الشجرة مخفيّاً: معالجه هو المرجع. */
import {CTX} from "./schema.js";
import {shownRibbon} from "./beginner.js";
import {buildRibbon,setTab,curTab,setCtx,setMin,syncRibbon,syncRibbonTogs,showKT,invalidateSync,rebuildRibbon} from "./render.js";
import {UIS,uiSet,saveUI} from "../store.js";
import {errMsg} from "../../core/escape.js";
import "../panels.js";
import * as R from "../../tools/registry.js";
import {draw,selList,setTheme as setCanvasTheme} from "../canvas.js";
import {HOOK} from "../bus.js";
import {dockClean,wsMenuOpen,wsApply,setAuto,setMode,layout} from "../dock.js";
import "../layout.js";
import {cmdMenu,setCmdMode,applyCmd} from "../cmdline.js";
import {qpToggle,quickSel} from "../quickprops.js";
import {stSheet,stPlots,stLock,custOpen,syncStatus} from "../statusbar.js";
import {toggleHistoryPanel} from "../historypanel.js";
import {runInspect} from "../inspector.js";
import {syncOverlay} from "../overlay.js";
import {ACTIONS,revealSec} from "../actions.js";

const $=s=>document.querySelector(s);
const focusCl=()=>{const c=$("#clIn"); if(c)c.focus()};
const rtlDoc=()=>getComputedStyle(document.documentElement)
 .direction==="rtl";

/* ═══ إظهار لوحة ═══
   الدالّة الحقيقية معرَّفة في actions.js (وكالةٌ بحتة إلى
   dock.js:revealPanel) — هنا فقط إعادة تصدير بنفس الاسم، فلا
   يتغيّر شيء في app.js أو appmenu.js اللذين يستوردانها من هذا
   الملفّ. */
export {revealSec};

/* ═══ جدول الأفعال المحلّية ═══ ما يحتاج حالةً أو دوالّ مغلقة هنا
   في wire.js نفسه (القشرة والسِّمة وأسطح العمل والإرساء وسطر
   الأوامر والخصائص السريعة وشريط الحالة) — أسماؤها مطابقةٌ حرفياً
   لِـ LOCAL_TO_WIRE في actions.js، وactions.js نفسه يفحص هذا
   التطابق (validateActions). كل عنصرٍ بشكل {fn,enabled?} كما في
   ACTIONS — شكلٌ واحد يقرأه runSpec لا شكلان. */
const LOCAL_ACT={
 rbMin: {fn:()=>setMin(!UIS.ribbonMin)},
 clean: {fn:()=>setClean(!UIS.clean)},
 theme: {fn:()=>setTheme(UIS.theme==="dark"?"light":"dark")},
 /* الكثافةُ تدور على ثلاثٍ كالسمةِ تدور على اثنتَين — زرٌّ واحدٌ
    يكفي، وثلاثةُ أزرارٍ أحدُها «الحالية» تُزحِم اللوحَ (المرحلة ٣). */
 density: {fn:()=>densityCycle()},
 shell: {fn:()=>setShell(UIS.shell==="ribbon"?"classic":"ribbon")},
 beginner: {fn:()=>setBeginner(!UIS.beginner)},

 /* ═══ الإرساء وأسطح العمل ═══ */
 wsMenu: {fn:()=>{
  const b=document.querySelector('[data-act="wsMenu"]');
  const mid=innerWidth/2;
  const r=b?b.getBoundingClientRect()
   :{bottom:120,["l"+"eft"]:mid,["r"+"ight"]:mid};
  wsMenuOpen(rtlDoc()?r.left:r.right,r.bottom);
 }},
 wsArch:  {fn:()=>wsApply("arch")},
 wsAnnot: {fn:()=>wsApply("annot")},
 wsOut:   {fn:()=>wsApply("out")},
 dockAutoS: {fn:()=>setAuto("s",!layout().auto.s)},
 dockAutoE: {fn:()=>setAuto("e",!layout().auto.e)},
 dockTabS:  {fn:()=>setMode("s",layout().mode.s==="acc"?"tab":"acc")},
 dockTabE:  {fn:()=>setMode("e",layout().mode.e==="acc"?"tab":"acc")},

 /* ═══ سطر الأوامر والخصائص السريعة والزرّ الأيمن ═══ */
 cmdMode: {fn:()=>{
  const b=document.querySelector('[data-act="cmdMode"]');
  const r=b?b.getBoundingClientRect()
   :{left:innerWidth/2,right:innerWidth/2,top:innerHeight-40};
  cmdMenu(rtlDoc()?r.left:r.right,r.top);
 }},
 cmdFloat:  {fn:()=>setCmdMode("float")},
 cmdBottom: {fn:()=>setCmdMode("bottom")},
 qpTog:     {fn:()=>qpToggle()},
 rclick: {fn:()=>{
  const O=["auto","enter","menu"];
  const N={auto:"تلقائي — Enter مع أداة وقائمةٌ في السكون",
   enter:"Enter دائماً",menu:"قائمة دائماً"};
  const i=(O.indexOf(UIS.rclick)+1)%O.length;
  uiSet("rclick",O[i]);
  HOOK.report("in",`الزرّ الأيمن: ${N[O[i]]}`);
 }},

 /* ═══ شريط الحالة ═══ */
 /* ═══ تكاملٌ مع شريط الحالة ═══ */
 histTog:  {fn:()=>toggleHistoryPanel()},
 joinsTog: {fn:()=>{const t=document.querySelector("#oJoins"); if(t)t.click(); syncStatus()}},
 soloTog:  {fn:()=>{const t=document.querySelector("#oSolo"); if(t)t.click(); syncStatus()}},
 stSheet: {fn:()=>stSheet()},
 stPlots: {fn:()=>stPlots()},
 stLock:  {fn:()=>stLock()},
 stScale: {fn:()=>revealSec("proj")},
 stWarn:  {fn:()=>{runInspect(); revealSec("insp")}},
 stCust:  {fn:()=>{
  const b=document.querySelector('[data-act="stCust"]');
  const r=b?b.getBoundingClientRect()
   :{top:innerHeight-30,left:innerWidth/2,right:innerWidth/2};
  custOpen(rtlDoc()?r.left:r.right, r.top);
 }}
};
/* ═══ الجدول الكلّي ═══ دمجٌ بين المركزي (actions.js) والمحلّي —
   لا نسخةٌ ثالثة: appmenu.js وctxmenu.js وpalette.js يستوردون
   runSpec/ACT من هذا الملفّ وحده كما كانوا. */
export const ACT={...ACTIONS,...LOCAL_ACT};
/* ═══ السِّمة والشاشة النظيفة والقشرة ═══ */
export function setTheme(t){
 const v=(t==="light")?"light":"dark";
 uiSet("theme",v);
 setCanvasTheme(v);          /* يضبط data-theme ويُبطل كاش النقوش */
 HOOK.report("in",`السمة اتغيّرت: ${v==="light"?"فاتحة":"داكنة"} — على طول`);
}
/* ═══ الكثافة ═══ المرحلة ٣ من audit/10-ui-plan.md
   ثلاثُ كثافاتٍ بمضاعفٍ واحدٍ في `css/tokens.css` لا بثلاثِ أوراقِ
   أنماطٍ تتفرّق. والتبديلُ سمةٌ على <html> فلا إعادةَ بناءٍ للواجهةِ
   ولا قياسَ عناصرَ — المتصفّحُ يعيد التخطيطَ وحدَه.
   و«مريحة» تُزيل السمةَ لا تكتبها: الافتراضُ غيابٌ لا قيمةٌ ثالثةٌ
   تُقرأ في كلِّ مكان. */
export const DENSITIES=["comfy","compact","touch"];
const DNAME={comfy:"مريحة",compact:"مدمَجة",touch:"لمسيّة"};
export function applyDensity(){
 const v=DENSITIES.includes(UIS.density)?UIS.density:"comfy";
 const el=document.documentElement;
 if(v==="comfy")el.removeAttribute("data-density");
 else el.setAttribute("data-density",v);
 return v;
}
export function setDensity(v){
 const d=DENSITIES.includes(v)?v:"comfy";
 uiSet("density",d);
 applyDensity();
 /* أهدافُ اللمسِ مفروضةٌ بـmin-height لا بالحشو (P5-001)، فالمدمَجةُ
    تضغط الفراغَ ولا تُصغّر ما يُنقَر — وحارسٌ يفرض ذلك. */
 HOOK.report("in",`الكثافة: ${DNAME[d]}`
  +(d==="compact"?" — فراغٌ أقلُّ ومساحةُ رسمٍ أكثر، وأهدافُ اللمسِ كما هي"
   :d==="touch"?" — فراغٌ أوسعُ للإصبع":""));
 return d;
}
export const densityCycle=()=>{
 const i=DENSITIES.indexOf(UIS.density);
 return setDensity(DENSITIES[(i+1)%DENSITIES.length]);
};
export function setClean(on){
 const v=on?1:0;
 uiSet("clean",v);
 document.documentElement.classList.toggle("clean",!!v);
 dockClean();                    /* مزامنةٌ فقط — العلَم مملوكٌ هنا */
 applyCmd();                     /* سطر الأوامر والسجل: مالكهما cmdline */
 const rb=$("#ribbon");
 if(rb&&UIS.shell==="ribbon")rb.hidden=!!v;
 const tb=$("#tools");
 if(tb&&UIS.shell==="classic")tb.hidden=!!v;
 quickSel();                     /* البطاقة السريعة تختفي وتعود */
 syncOverlay();                  /* البوصلة وبطاقة المنظور */
 dispatchEvent(new Event("resize"));
 HOOK.report("in",v?"شاشة نظيفة — Ctrl+0 يرجّع كل حاجة زي ما كانت"
  :"الواجهة رجعت زي الأول");
}
export function setShell(s){
 const v=(s==="ribbon")?"ribbon":"classic";
 uiSet("shell",v);
 const rb=$("#ribbon"), tb=$("#tools");
 if(v==="ribbon"){
  if(rb&&!rb.dataset.built){buildRibbon(); rb.dataset.built="1"}
  setMin(UIS.ribbonMin);
  if(rb)rb.hidden=!!UIS.clean;
  if(tb)tb.hidden=true;
  invalidateSync();
  syncRibbon(); syncRibbonTogs(); ribbonSel();
 }else{
  if(rb)rb.hidden=true;
  if(tb)tb.hidden=!!UIS.clean;
 }
 document.documentElement.dataset.shell=v;
 dispatchEvent(new Event("resize"));
 HOOK.report("in",`القشرة بقت ${v==="ribbon"?"شريط أوامر مجمّع":"شريط مسطّح"}`);
 return v;
}
/* ═══ وضع المبتدئ ═══ تفضيلُ نافذة: يُعيد بناء الشريط ولا يمسّ الرسم.
   الأدوات المخفيّة تبقى في سطر الأوامر ولوحة الأوامر. */
export function setBeginner(on){
 const v=on?1:0;
 uiSet("beginner",v);
 if(UIS.shell==="ribbon")rebuildRibbon();
 HOOK.report("in",v?"وضع المبتدئ: الأدوات الأساسية فقط — الباقي في سطر الأوامر و Ctrl+K"
  :"الوضع الاحترافي: كل الأدوات ظاهرة");
 return v;
}
/* ═══ التبويب السياقي من التحديد ═══ */
let lastSig=null;
export function ribbonSel(){
 if(UIS.shell!=="ribbon"){lastSig=null; return}
 const L=selList();
 let kind=null;
 if(L.length){
  kind=L[0].k;
  for(const s of L)if(s.k!==kind){kind=null; break}
 }
 const sig=kind?(kind+":"+L.length):"";
 if(sig===lastSig)return;
 lastSig=sig;
 setCtx(CTX[kind]?kind:null);
 invalidateSync();
 syncRibbon();
}
/* ═══ التنفيذ ═══
   runSpec يقبل الوصف مباشرةً، فتشترك فيه قائمةُ السياق والشريط
   وقائمةُ التطبيق — مُنفِّذٌ واحد لا ثلاثة. */
export function runSpec(sp){
 if(!sp)return false;
 if(sp.cmd!==undefined&&sp.cmd!==null){
  if(!sp.cmd)R.cancel(true); else R.begin(sp.cmd);
  HOOK.prompt(); draw(); focusCl();
  return true;
 }
 if(sp.tog){
  const t=document.querySelector(sp.tog);
  if(t)t.click();
  syncRibbonTogs();
  return true;
 }
 const act=sp.act;
 if(!act)return false;
 if(act.startsWith("dlg:")){revealSec(act.slice(4)); return true}
 const a=ACT[act];
 if(!a){HOOK.report("wr",`فعلٌ غير معروف: ${act}`); return false}
 if(a.enabled&&!a.enabled()){HOOK.report("in","غير متاح الآن"); return false}
 try{a.fn()}
 catch(e){HOOK.report("er",errMsg(e))}
 return true;
}
export function runItem(el){
 if(!el)return false;
 if(el.dataset.act==="wsMenu")el.dataset.wsx="1";
 return runSpec({cmd:el.dataset.cmd,act:el.dataset.act,
  tog:el.dataset.tog});
}
/* ═══ التوصيل ═══ */
export function wireRibbon(){
 const rb=$("#ribbon");
 if(!rb)return false;

 rb.addEventListener("click",e=>{
  const tab=e.target.closest("[data-tab]");
  if(tab){setTab(tab.dataset.tab); saveUI(); return}
  if(e.target.closest("#rbToggle")){setMin(!UIS.ribbonMin);
   saveUI(); dispatchEvent(new Event("resize")); return}
  runItem(e.target.closest("[data-cmd],[data-act],[data-tog]"));
 });
 /* نقرتان على التبويب النشط تطويان — كما في أوتوكاد */
 rb.addEventListener("dblclick",e=>{
  const tab=e.target.closest("[data-tab]");
  if(!tab)return;
  e.preventDefault();
  if(tab.dataset.tab===curTab()){setMin(!UIS.ribbonMin); saveUI();
   dispatchEvent(new Event("resize"))}
 });
 /* الأسهم بين التبويبات · وMenu/Home/End — ARIA كاملة */
 const tabList=()=>[...rb.querySelectorAll(".rbTab")];
 rb.addEventListener("keydown",e=>{
  const T=tabList();
  const i=T.findIndex(b=>b===document.activeElement);
  if(i<0)return;
  /* RTL: السهم الأيمن يتقدّم في القراءة العربية */
  const step=(e.key==="ArrowLeft")?1:((e.key==="ArrowRight")?-1:0);
  let j=-1;
  if(step)j=(i+step+T.length)%T.length;
  else if(e.key==="Home")j=0;
  else if(e.key==="End")j=T.length-1;
  else return;
  e.preventDefault();
  T[j].focus();
  setTab(T[j].dataset.tab); saveUI();
 });
 const q=$("#qat");
 if(q)q.addEventListener("click",e=>{
  runItem(e.target.closest("[data-act]"));
 });
 wireKT();
 return true;
}
/* ═══ KeyTips ═══
   Alt وحده يُظهر الدلائل، ثم رقمٌ مفردٌ ينتقل — لا Alt+رقم لأن
   المتصفّح يحتجزه. والأرقام أثبت من الحروف في لوحةٍ عربية: مفتاحها
   الفيزيائي واحدٌ في كل تخطيط، فنقرأ e.code لا e.key.
   ونُنصت في طور الالتقاط لنسبق قاعدة app.js التي تُرسل كل حرفٍ
   مطبوعٍ إلى سطر الإدخال. */
let KT=false, altOnly=false;
function ktOff(){if(!KT)return; KT=false; showKT(false)}

function wireKT(){
 addEventListener("keydown",e=>{
  if(e.key==="Alt"&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey){
   if(!e.repeat)altOnly=true;
   return;
  }
  altOnly=false;
  if(!KT)return;
  if(e.key==="Escape"){e.preventDefault(); e.stopPropagation();
   ktOff(); return}
  const m=/^Digit([0-9])$/.exec(e.code||"");
  if(m&&!e.ctrlKey&&!e.altKey&&!e.metaKey){
   e.preventDefault(); e.stopPropagation();
   const d=m[1];
   ktOff();
   if(d==="0"){const b=$("#appBtn"); if(b)b.click(); return}
   const t=shownRibbon().find(x=>x.kt===d);
   if(t){setTab(t.id); saveUI();
    const b=document.querySelector(`[data-tab="${t.id}"]`);
    if(b)b.focus();
   }
   return;
  }
  ktOff();               /* أي مفتاحٍ آخر يُغلق ويمرّ */
 },true);

 addEventListener("keyup",e=>{
  if(e.key!=="Alt")return;
  if(!altOnly)return;
  altOnly=false;
  e.preventDefault();
  if(UIS.shell!=="ribbon")return;
  KT=!KT;
  showKT(KT);
 },true);

 addEventListener("mousedown",()=>ktOff(),true);
 addEventListener("blur",()=>ktOff());
}
export const ktOn=()=>KT;

/* ═══ الارتفاع ═══
   الشاشة القصيرة تُطوى مرّةً واحدة ولا تُقاوَم بعدها: إن فتحها
   المستخدم بقيت مفتوحة. */
let autoDone=false;
export function autoFit(){
 if(UIS.shell!=="ribbon"||autoDone)return;
 /* الهاتف/التابلت باللمس: لا يُطوى الشريط تلقائياً (ارتفاع الشاشة القصير
    هو الحالة الطبيعية هناك، والطيّ كان يُخفي الأزرار كلّها). وإن كان
    الطيّ محفوظاً من جلسةٍ سابقة فُتح مرّةً واحدة ليرى المستخدم أزراره. */
 const touchy=matchMedia("(pointer:coarse)").matches||innerWidth<=1100;
 if(touchy){
  autoDone=true;
  if(UIS.ribbonMin){setMin(0); saveUI()}
  return;
 }
 if(innerHeight<760&&!UIS.ribbonMin){
  autoDone=true;
  setMin(1); saveUI();
  HOOK.report("in","طُوي الشريط لضيق الشاشة · Ctrl+F1 يفتحه");
 }
}
