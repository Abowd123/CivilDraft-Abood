/* ═══ تخصيص الشريط — الأساس قارّ والدلتا فوقه ═══
   schema.js وصفٌ أساسيٌّ لا يُمسّ. التخصيصُ دلتا تُحفَظ لكل مستخدمٍ
   في localStorage (تفضيلُ نافذةٍ كخيارات الأدوات) — لا تدخل S ولا
   pack() ولا ملفّ المشروع ولا التاريخ.

   mergeRibbon يعيد نسخةً جديدةً ولا يمسّ الأساس. دلتا قديمةٌ أو تالفة:
   ما زال معرّفُه من الأساس يُطرح ويُجمَع تنبيه — فلا يكسر الإقلاع.
   ?safe في الرابط يتجاوز التخصيص كلّه (حرس الإقلاع). */
import {RIBBON as BASE} from "./schema.js";

const RK="civildraft.ribbon";
const RK_OLD="mistar.ribbon";
const VER=1;

/* مفتاحُ عنصرٍ قارٌّ من وصفه — c:أداة · a:فعل · t:مفتاح */
export const itemKey=it=>{
 if(!it||typeof it!=="object")return null;
 if(it.cmd!==undefined&&it.cmd!==null)return "c:"+it.cmd;
 if(it.act)return "a:"+it.act;
 if(it.tog)return "t:"+it.tog;
 return null;
};

/* تسطيحُ الأعمدة إلى أوراق عناصر — للمطابقة والتحرير */
export function flatItems(items){
 const out=[];
 (items||[]).forEach(it=>{
  if(!it)return;
  if(it.group)out.push(...flatItems(it.group));
  else out.push(it);
 });
 return out;
}

const RT=()=>{
 try{
  if(typeof localStorage==="undefined")return null;
  let raw=localStorage.getItem(RK);
  if(raw==null){const o=localStorage.getItem(RK_OLD);if(o!=null)raw=o}
  /* P2-008: كان يُعيد أيَّ ناتج — مصفوفةٌ تمرّ من isObj لاحقاً في
     بعض المسارات، ورقمٌ يصير «دلتا». كائنٌ مستوٍ وحده. */
  const v=raw?JSON.parse(raw):null;
  return (!!v&&typeof v==="object"&&!Array.isArray(v))?v:null;
 }catch(e){return null}
};

const isObj=o=>!!o&&typeof o==="object"&&!Array.isArray(o);
const emptyDelta=()=>({version:VER,tabs:{},tabOrder:[],
 panels:{},panelOrder:{},items:{}});
const cleanLabel=v=>(typeof v==="string"&&v.trim())?v.trim().slice(0,60):"";
const pick=o=>{
 const v={};
 if(isObj(o)){
  if(o.hidden)v.hidden=1;
  const l=cleanLabel(o.label);
  if(l)v.label=l;
 }
 return v;
};

/* ═══ التطبيع ═══ يطرح ما لا يقابله موجودٌ في الأساس ويجمع تنبيهاته.
   يُعيد دلتا نظيفة {version,tabs,tabOrder,panels,panelOrder,items}.
   base اختياري (للاختبار بأساسٍ اصطناعي). */
export function normalizeDelta(raw,warn,base){
 const W=Array.isArray(warn)?warn:[];
 const B=Array.isArray(base)?base:BASE;
 const out=emptyDelta();
 if(raw==null)return out;
 if(!isObj(raw)){W.push("دلتا الشريط تالفة — أُهملت");return out}
 if(raw.version!==undefined&&raw.version!==VER){
  W.push(`دلتا بإصدارٍ غير معروف (${raw.version}) — أُهملت`);
  return out;
 }
 const tabIds=new Set((B||[]).map(t=>t.id));
 const panelIds=new Set();
 const itemIds=new Set();
 (B||[]).forEach(t=>(t.panels||[]).forEach(p=>{
  panelIds.add(t.id+"/"+p.id);
  flatItems(p.items).forEach(it=>{
   const k=itemKey(it);
   if(k)itemIds.add(t.id+"/"+p.id+"/"+k);
  });
 }));

 if(isObj(raw.tabs))Object.keys(raw.tabs).forEach(id=>{
  if(!tabIds.has(id)){W.push(`في الدلتا تبويبٌ زال: ${id}`);return}
  const v=pick(raw.tabs[id]);
  if(Object.keys(v).length)out.tabs[id]=v;
 });
 if(Array.isArray(raw.tabOrder)){
  raw.tabOrder.forEach(id=>{
   if(!tabIds.has(id))W.push(`في ترتيب الدلتا تبويبٌ زال: ${id}`);
  });
  out.tabOrder=[...new Set(raw.tabOrder.filter(id=>tabIds.has(id)))];
 }
 if(isObj(raw.panels))Object.keys(raw.panels).forEach(key=>{
  if(!panelIds.has(key)){W.push(`في الدلتا لوحٌ زال: ${key}`);return}
  const v=pick(raw.panels[key]);
  if(Object.keys(v).length)out.panels[key]=v;
 });
 if(isObj(raw.panelOrder))Object.keys(raw.panelOrder).forEach(tid=>{
  if(!tabIds.has(tid)){W.push(`في ترتيب الدلتا تبويبٌ زال: ${tid}`);return}
  const src=raw.panelOrder[tid];
  if(!Array.isArray(src)){W.push(`ترتيب لوحاتٍ تالف في: ${tid}`);return}
  src.forEach(pid=>{
   if(!panelIds.has(tid+"/"+pid))W.push(`في ترتيب الدلتا لوحٌ زال: ${pid}`);
  });
  const kept=[...new Set(src.filter(pid=>panelIds.has(tid+"/"+pid)))];
  if(kept.length)out.panelOrder[tid]=kept;
 });
 if(isObj(raw.items))Object.keys(raw.items).forEach(key=>{
  if(!itemIds.has(key)){W.push(`في الدلتا عنصرٌ زال: ${key}`);return}
  const v=pick(raw.items[key]);
  if(Object.keys(v).length)out.items[key]=v;
 });
 return out;
}

/* ═══ الكاش ═══ لا قراءة storage ولا JSON.parse في كل رسم */
let CACHE=null;
export const invalidateRibbonCache=()=>{CACHE=null};
/* ═══ ترتيبٌ صريح ═══ P2-012
   كان هذا المستمعُ يُركَّب أثناء تقييم الوحدة — أثرٌ جانبيٌّ من
   الاستيراد. يعني ذلك أن ترتيبَ الاستيرادات في app.js يحدّد هل
   يُركَّب أم لا، وأن استيراداً يُنقَل أو يفشل يترك الكاشَ بلا إبطال
   بين التبويبات بلا كلمة. الآن نداءٌ صريحٌ من app.js، ومرّةً واحدةً
   مهما تكرّر — فالترتيبُ مقروءٌ في موضعٍ واحد لا مُستنتَجٌ. */
let WIRED=false;
export function initRibbonCustom(){
 if(WIRED)return false;
 if(typeof addEventListener!=="function")return false;
 WIRED=true;
 addEventListener("storage",e=>{
  if(e&&(e.key===RK||e.key===RK_OLD||e.key==null))CACHE=null;
 });
 return true;
}
export const ribbonCustomWired=()=>WIRED;

let LAST_WARN=[];
export function loadRibbonDelta(){
 LAST_WARN=[];
 const delta=normalizeDelta(RT(),LAST_WARN);
 return {delta,warnings:LAST_WARN.slice()};
}
export const lastRibbonWarnings=()=>LAST_WARN.slice();
export function saveRibbonDelta(delta){
 const d=normalizeDelta(delta,[]);
 if(typeof localStorage==="undefined")return false;
 try{
  localStorage.setItem(RK,JSON.stringify(d));
  invalidateRibbonCache();
  return true;
 }catch(e){return false}
}
export function resetRibbonDelta(){
 invalidateRibbonCache();
 if(typeof localStorage==="undefined")return false;
 try{
  localStorage.removeItem(RK);
  localStorage.removeItem(RK_OLD);
  return true;
 }catch(e){return false}
}

/* ═══ ترتيبٌ بمفاتيحَ كاملةٍ ═══ القائمة من المحرِّر كاملةٌ دائماً،
   وغير المذكور يبقى بعدها بترتيب أساسه (فرزٌ مستقرّ). */
function applyOrder(list,orderArr,keyFn){
 const arr=(list||[]).slice();
 const pos=new Map();
 (orderArr||[]).forEach((k,i)=>{if(!pos.has(k))pos.set(k,i)});
 arr.sort((a,b)=>{
  const ia=pos.has(keyFn(a))?pos.get(keyFn(a)):1e6;
  const ib=pos.has(keyFn(b))?pos.get(keyFn(b)):1e6;
  return ia-ib;
 });
 return arr;
}

function applyItem(tab,panelId,it,itemsOver){
 const key=itemKey(it);
 if(!key)return Object.assign({},it);
 const o=itemsOver[tab.id+"/"+panelId+"/"+key]||{};
 if(o.hidden)return null;
 const n=Object.assign({},it);
 if(o.label)n.n=o.label;
 return n;
}
function mergeItems(tab,panelId,items,itemsOver){
 const out=[];
 (items||[]).forEach(it=>{
  if(!it)return;
  if(it.group){
   const kids=[];
   (it.group||[]).forEach(k=>{
    const kept=applyItem(tab,panelId,k,itemsOver);
    if(kept)kids.push(kept);
   });
   if(kids.length)out.push({group:kids});
   return;
  }
  const kept=applyItem(tab,panelId,it,itemsOver);
  if(kept)out.push(kept);
 });
 return out;
}
function mergePanels(tab,panelsOver,panelOrder,itemsOver){
 const out=[];
 (tab.panels||[]).forEach(p=>{
  const key=tab.id+"/"+p.id;
  const o=panelsOver[key]||{};
  if(o.hidden)return;
  const np=Object.assign({},p);
  if(o.label)np.n=o.label;
  np.items=mergeItems(tab,p.id,p.items||[],itemsOver);
  out.push(np);
 });
 return applyOrder(out,panelOrder||[],x=>x.id||null);
}

export function mergeRibbon(base,delta){
 const d=delta||{};
 const tabs=[];
 (base||[]).forEach(t=>{
  const o=(d.tabs||{})[t.id]||{};
  if(o.hidden)return;
  const nt=Object.assign({},t);
  if(o.label)nt.n=o.label;
  nt.panels=mergePanels(t,d.panels||{},
   (d.panelOrder||{})[t.id]||[],d.items||{});
  tabs.push(nt);
 });
 return applyOrder(tabs,d.tabOrder||[],x=>x.id||null);
}

const isSafe=()=>typeof location!=="undefined"
 &&/[?&]safe(=|&|$)/.test(location.search||"");

/* الشريط الفعّال — الأساس إن غابت الدلتا (أو بطلت أو ?safe).
   ⚠️ يعيد المرجع نفسه المخزَّن: لا يجوز للمستهلك تعديله. */
export function effectiveRibbon(){
 if(isSafe())return BASE.slice();
 if(CACHE)return CACHE;
 const d=loadRibbonDelta().delta;
 const empty=!Object.keys(d.tabs).length&&!d.tabOrder.length
  &&!Object.keys(d.panels).length&&!Object.keys(d.panelOrder).length
  &&!Object.keys(d.items).length;
 CACHE=empty?BASE.slice():mergeRibbon(BASE,d);
 return CACHE;
}
