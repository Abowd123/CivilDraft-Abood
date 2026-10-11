/* ═══ سجلّ الأدوات ═══
   الأداة = خيارات + خطوات + معاينة. تبقى فعّالة بعد كل عنصر
   حتى Esc، وخياراتها لزجة بين الجلسات.

   الخطوة: {p, k?, loop?, min?, restart?, base?, ent?, ang?,
            confirm?, opts?, each?}
   لا يوجد نظام سكربت: سطر الإدخال يقبل إحداثيات وأسماء أدوات فقط. */

import {writePref,parseObj,isPlain} from "../core/delegate.js";
import {S,snapshot,pushHistory,touch,autosave,loadState,
        joinTxn} from "../core/state.js";
import {norm,M,Mx,Nx,clamp} from "../core/units.js";
import {parsePt,angOf,lenOf,D2R} from "../core/coords.js";
import {findById,shapeOf} from "../core/ents.js";
import {jrAdd,jrTaint} from "../core/journal.js";
/* لا دورة: ents.js لا يستورد tools/* */

export const H={
 draw:()=>{}, rep:()=>{}, prompt:()=>{}, refresh:()=>{},
 hit:()=>null, sel:()=>[], setSel:()=>{}, del:()=>null,
 /* خطّافٌ جديد (مرحلة ٩أ، القسم 16.2) — منفصلٌ عن H_KEYS التي
    يبدّلها guide/engine.js وقت الجلسة المعزولة (انظر تلك القائمة:
    لا تتضمّن begin)، فيبقى فعّالاً حتى أثناء درسٍ معزول. لا علاقة
    له بمعاملة begin() أدناه ولا يمسّ S/OPT/T.hist. */
 begin:()=>{}};

/* وضع الدفعة: تنفيذٌ متسلسل بخطوة تراجعٍ واحدة يديرها المُنادي */
export const BATCH={on:0};
export const setBatch=v=>{BATCH.on=v?1:0};

export const TOOLS={};
export const T={id:null,def:null,steps:null,i:0,ctx:null,
 snap:null,ghost:null,hover:null,lock:null,lenLock:null,last:null,lastArg:null,
 hist:[]};

export function defTool(d){
 TOOLS[d.id]=d;
 /* findTool تطبّع الاسم (حروف صغيرة) — معرّفٌ بحروفٍ كبيرة مثل levelMgr
    كان يتعذّر بلوغه بمعرّفه */
 TOOLS[norm(d.id)]=d;
 (d.alias||"").split(/\s+/).filter(Boolean)
  .forEach(a=>{TOOLS[norm(a)]=d});
 return d;
}
export const findTool=n=>TOOLS[norm(n||"")]||null;
export const toolList=()=>[...new Set(Object.values(TOOLS))];
export const active=()=>!!T.def;
export const step=()=>T.steps?T.steps[T.i]:null;

/* ═══ الأداة الهادمة ═══
   تقصّ أو تحرّك ما هو مرسوم سلفاً. العلَم مُعلَنٌ في تعريف الأداة
   فلا تتخلّف قائمةٌ ثانية عن السجلّ — وكان جدولٌ يدويّ في
   ai/plan.js يفوته «نقل» و«دوران» و«مرآة»، وثلاثتها تحرّك ما هو
   مرسوم. ويُعلَن في lang.js فيراه المزوّد نصّاً، والبوّابة تقرؤه
   كوداً — والتعليمات يمكن التحدّث حولها، والكود لا.
   وموضعُه بعد toolList بقصد: destructList تنادِيه. */
export const isDestruct=d=>!!(d&&d.destruct);
export const destructList=()=>toolList()
 .filter(d=>d&&d.id&&d.destruct)
 .map(d=>({id:d.id,label:d.label}));

/* ═══ خيارات الأدوات — لزجة ═══ */
const OKEY="civildraft.opts";
/* هجرة لمرةٍ واحدة من «mistar.opts»: نسخٌ خام إن لم يوجد الجديد،
   والقديم يبقى نسخةً احتياطية صامتة */
const OLD_OKEY="mistar.opts";
function migrateOpts(){
 try{
  if(localStorage.getItem(OKEY)!==null)return;
  const v=localStorage.getItem(OLD_OKEY);
  if(v!==null)localStorage.setItem(OKEY,v);
 }catch(e){}
}
/* ═══ هجرةُ أسماء المفاتيح ═══ P5-012
   `griddim.left/right` صارا `xmin/xmax` (السببُ في annotate.js).
   المفاتيحُ القديمةُ محفوظةٌ عند كلِّ من استعمل الأداة، فتُنقَل قيمُها
   ولا يفقد اختيارَه. والجدولُ صريحٌ لا اشتقاقٌ بالاسم: مفتاحُ
   `left` في أداةٍ أخرى ليس هذا المفتاح.
   القاعدة: الجديدُ يفوز إن وُجِد (لا يُكتَب فوقه)، والقديمُ يُحذَف
   بعد النقل فلا تبقى قيمةٌ ميتةٌ تُربِك قارئاً لاحقاً. والهجرةُ
   تُطبَّق على الكائن بعد قراءته لا على النصّ — فملفٌّ تالفٌ لا يُكتَب. */
/* والجدولُ ثلاثياتٌ لا مفاتيحُ كائن: كتابةُ `left:` هنا كانت تُشعِل
   حارسَ الاتجاه في dom.js بحقٍّ (لا يعرف أنها هجرةٌ لا إزاحة)،
   وإضعافُ الحارس ثمنٌ أعلى من تغيير شكلِ جدول. */
export const OPTRENAME=[
 ["griddim","left","xmin"],
 ["griddim","right","xmax"]];
export function renameOpts(o){
 let n=0;
 if(!isPlain(o))return n;
 OPTRENAME.forEach(([tid,old,nk])=>{
  const t=o[tid];
  if(!isPlain(t)||!(old in t))return;
  if(t[nk]===undefined){t[nk]=t[old]; n++}
  delete t[old];
 });
 return n;
}
export const OPT={};
export function loadOpts(){
 migrateOpts();
 /* P2-008: كان أيُّ ناتجٍ يُمرَّر إلى Object.assign — مصفوفةٌ أو رقمٌ
    يُعطِب OPT، وقيمةٌ غيرُ كائنٍ لأداةٍ تُسقِط قارئاتها بعد ذلك.
    الآن كائنٌ مستوٍ وحده، وقيمةُ كلِّ أداةٍ كائنٌ مستوٍ وحدها. */
 /* لا تخزينَ في Node: المصنعُ وحده — وكان try/catch القديم يُخفي
    هذا الفرقَ بدل أن يُعلنه */
 const d=(typeof localStorage==="undefined")
  ?null:parseObj(localStorage.getItem(OKEY));
 if(d)Object.keys(d).forEach(k=>{
  if(isPlain(d[k]))OPT[k]=d[k];
 });
 /* P5-012: أسماءٌ قديمةٌ تُنقَل قبل ملء الافتراضات — وإلّا كُتِب
    الافتراضُ فوق اختيار المستخدم وضاع. وإن نُقِل شيءٌ حُفِظ فوراً
    فلا تتكرّر الهجرةُ كلَّ إقلاع. */
 if(renameOpts(OPT))saveOpts();
 toolList().forEach(d=>{
  const o=OPT[d.id]=OPT[d.id]||{};
  (d.opts||[]).forEach(f=>{if(o[f.k]===undefined)o[f.k]=f.def});
 });
}
export function saveOpts(){
 return writePref(OKEY,OPT);        /* P2-005 */
}
export function setOpt(tid,k,v){
 (OPT[tid]=OPT[tid]||{})[k]=v;
 saveOpts();
}
/* قارئات القيَم — يستعملها كل أمر رسم */
export const ov=(tid,k)=>{
 const o=OPT[tid]||{};
 return (o[k]===undefined)?null:o[k];
};
export const ovLen=(tid,k)=>M(String(ov(tid,k)==null?"":ov(tid,k)));
export const ovNum=(tid,k)=>{
 const v=parseFloat(ov(tid,k));
 return isFinite(v)?v:0;
};
export const ovOn=(tid,k)=>{
 const v=ov(tid,k);
 return v===1||v===true||v==="1"||v==="true";
};
/* ═══ نقطة الأساس والاتجاه ═══ */
export function baseOf(){
 const st=step();
 if(!st)return null;
 const P=T.ctx?T.ctx.pts:[];
 if(st.base==="none")return null;
 if(typeof st.base==="number")
  return P[st.base<0?P.length+st.base:st.base]||null;
 return P.length?P[P.length-1]:null;
}
/* ═══ أساسُ الالتقاط ═══ (1.1.0) الركنُ المقابل لإطارٍ (مستطيل · شدّ · منفذ)
   ليس امتداداً لخطّ: التعامدُ المفعَّل افتراضاً كان يُسقطه على محورٍ من الركن
   الأول فيصير الإطارُ خطّاً بارتفاعٍ صفريّ («لا أطراف داخل الإطار» · «أصغر من
   0.5 م»). فالخطوةُ المعلَّمة box:1 تُلتقَط بلا تقييد — وbaseOf يبقى كما هو
   للإدخال النسبيّ (@) والمعاينة. */
export function snapBase(){
 const st=step();
 return (st&&st.box)?null:baseOf();
}
/* أساسُ الالتقاط (لا التقييد): الخطوةُ box:1 لا تُقيَّد بالتعامد، لكنّ
   الالتقاطَ يحتاج أساسَها ليُحسَب «عمودي» منه ولا تُلتقَط هي نفسُها */
export const osBase=()=>baseOf();
export function dirOf(){
 const b=baseOf();
 if(!b)return null;
 if(T.lock!=null)
  return [Math.cos(T.lock*D2R),Math.sin(T.lock*D2R)];
 if(!T.ghost)return null;
 const dx=T.ghost[0]-b[0], dy=T.ghost[1]-b[1];
 const L=Math.hypot(dx,dy);
 return L>1?[dx/L,dy/L]:null;
}
export function promptText(){
 const st=step();
 if(!st)return {tool:"",p:"أداة:",live:""};
 let p=st.p;
 if(st.opts)p+=" ["+Object.keys(st.opts)
  .map(k=>`${st.opts[k].n}(${k.toUpperCase()})`).join("/")+"]";
 const b=baseOf();
 let live="";
 if(b&&T.ghost){
  live=`${(lenOf(b,T.ghost)/1000).toFixed(3)} م  `
      +`${angOf(b,T.ghost).toFixed(1)}°`;
  if(T.lock!=null)live+=`  ⟨قفل ${T.lock}°⟩`;
  if(T.lenLock!=null)live+=`  ⟨طول ${(T.lenLock/1000).toFixed(3)}⟩`;
 }
 return {tool:T.def.label||T.id,p:p+":",live};
}
/* ═══ الدخول والخروج ═══ */
function reset(){
 T.id=null; T.def=null; T.steps=null; T.i=0;
 T.ctx=null; T.snap=null; T.lock=null; T.lenLock=null; T.ghost=null; T.hover=null;
}
/* ═══ معاملةُ الجلسة ═══
   الأداةُ تلتقط لقطتها عند begin وتدفع خطوةً واحدة عند finish. وعملياتُ
   core (moveAll · copyAll · rebake …) معاملاتٌ بنفسها — فتُنادى دوالُّ
   الأداة (start · each · done) داخل joinTxn لتنضمّ إلى هذه المعاملة
   ولا تدفع كلُّ نقرةٍ خطوةَ تاريخٍ شبحاً. ومن علّم تعريفه بـown:1
   (أمرٌ لحظيّ يفوّض إلى edit() كالحذف) يبقى start عنده معاملةً قائمة
   بذاتها. */
/* الوسيط: سطر الإدخال يقتطعه بعد اسم الأداة، والأداة تقرؤه من
   ctx.arg. ومن لا يعرفه يتجاهله — فالتعديل لا يمسّ أداةً قائمة. */
/* ═══ خياراتٌ في الوسيط ═══ (مسحُ ما قبل المرحلة ٧)
   الأمرُ اللحظيّ (أبعاد المحاور · سحابة حول التحديد · واجهة · تقرير …)
   لا يبقى فعّالاً، فشريطُ خياراته لا يظهر أبداً: «الجهات» و«الخلوص»
   و«نصف القطر» كانت بلا طريق. الآن «GD top=0 gap=1.5» أو «RCLE r=0.3»
   تضبط الخيارَ ثم تنفّذ — لكلّ أداةٍ لا للحظية وحدها — وما ليس خياراً
   يبقى وسيطاً كما كان («ELEV S fmt=svg» ⇒ الوسيط S). */
function optArgs(d,arg){
 if(arg==null||typeof arg!=="string"||!(d.opts||[]).length)return arg;
 const keep=[];
 String(arg).trim().split(/\s+/).forEach(tok=>{
  const m=/^([A-Za-z][A-Za-z0-9]*)=(.*)$/.exec(tok);
  const f=m&&(d.opts||[]).find(o=>o.k.toLowerCase()===m[1].toLowerCase());
  if(f){setOpt(d.id,f.k,m[2]); H.rep("in",`${f.label||f.k} = ${m[2]}`)}
  else keep.push(tok);
 });
 return keep.join(" ");
}
/* هل يقبل الأمرُ هذا الذيل؟ وسيطٌ إن أعلنه (arg)، وإلا فخياراتٌ key=value كلُّها */
export function tailOk(d,rest){
 if(!d||!rest)return false;
 if(d.arg)return true;
 const toks=String(rest).trim().split(/\s+/);
 return toks.every(tok=>{const m=/^([A-Za-z][A-Za-z0-9]*)=(.*)$/.exec(tok);
  return m&&(d.opts||[]).some(o=>o.k.toLowerCase()===m[1].toLowerCase())});
}
export function begin(id,arg){
 const d=(id&&typeof id==="object")?id:findTool(id);
 if(!d){H.rep("wr",`أداة غير معروفة: ${id}`);return false}
 if(T.def)cancel(true);
 T.def=d; T.id=d.id;
 T.steps=(d.steps||[]).slice();
 T.i=0; T.lock=null; T.lenLock=null; T.ghost=null;
 arg=optArgs(d,arg);
 T.ctx={pts:[],v:{},n:0,made:[],
  arg:(arg==null||arg==="")?null:arg};
 T.snap=snapshot();
 T.last=d.id; T.lastArg=T.ctx.arg;
 jrAdd(d.id);
 H.begin(d);   /* خطّافٌ جديد، منفصل عن H_KEYS التي يبدّلها engine.js وقت الجلسة */
 if(T.ctx.arg&&!d.nojr)jrTaint("وسيط أداة");   /* nojr: أوامر الماكرو خارج السجلّ */
 if(d.start){
  const sn=T.snap, lbl=d.label||d.id;
  let ok=true, threw=false;
  try{ok=d.own?d.start(T.ctx):joinTxn(()=>d.start(T.ctx))}
  catch(e){H.rep("er",e.message);ok=false;threw=true}
  /* ═══ البقاءُ بعد أمرٍ لحظيٍّ قارئ ═══ (مسحُ ما قبل المرحلة ٧)
     «واجهة» و«تقرير» و«حصر لكل طابق» و«قارن السلسلة» تقرأ ولا تعدّل،
     وخياراتُها (الاتجاه · التصدير · …) في شريطٍ لا يظهر إلا والأداةُ فعّالة:
     من الشريط كانت «واجهة» تكتب سطراً في السجلّ ولا تصدّر شيئاً أبداً.
     stay:1 ⇒ تُنفَّذ فوراً كما كانت، ثم تبقى فعّالةً ليظهر شريطُها،
     وEnter يعيدها بالخيارات الجديدة، وEsc يخرج. لا تاريخَ يُدفَع: لا تعديل. */
  if(ok===false&&d.stay&&!threw&&!madeReal(T.ctx)){
   T.steps=[{p:`Enter يعيد «${lbl}» بالخيارات في الشريط · Esc يخرج`,confirm:1,
    each(ctx){ctx.arg=null; d.start(ctx); T.i=-1}}];
   T.i=0;
   H.prompt(); H.draw();
   return true;
  }
  if(ok===false){
   const n=madeReal(T.ctx);
   reset();
   if(threw){
    /* فشلٌ حقيقيّ: ما صنعه start() جزئياً — إن صنع — يُرجَع كلّه.
       لا يُعامَل نصف التنفيذ نجاحاً (كان هذا عيباً معروفاً D08:
       begin كان يُثبّت n>0 في التاريخ حتى لو رمى start). */
    rollbackTool(sn);
   }else if(n){
    /* رجوعٌ صريحٌ بـfalse بلا رمي: أمرٌ لحظيّ اختار إثبات ما صنعه
       (تحديدٌ ناقص مثلاً) — هذا سلوكٌ مقصود لا فشل. */
    touch();
    if(!BATCH.on){pushHistory(sn,lbl); H.refresh(); autosave()}
   }
   H.prompt(); H.draw();
   return true;
  }
 }
 H.prompt(); H.draw();
 return true;
}
/* رجوعٌ كامل إلى لقطة ما قبل الأداة — يُستعمَل حين يرمي start/done
   بعد أن عدّل بعضاً من الحالة. لا touch عاديّاً ولا pushHistory: هذه
   ليست خطوة عملٍ ناجحة تدخل التاريخ، بل استعادةٌ لما كان قائماً —
   وحدها H.refresh() تُبطِل كاشات العرض لأن loadState تستدعي touch()
   داخلياً فتُحدَّث VER، ولا داعي لاستدعاءٍ ثانٍ. */
function rollbackTool(sn){
 loadState(JSON.parse(sn),false);
 H.refresh();
}
export function finish(msg){
 const ctx=T.ctx, sn=T.snap, d=T.def, lbl=(d&&(d.label||d.id))||null;
 reset();
 let threw=false;
 if(d&&d.done&&ctx){
  try{joinTxn(()=>d.done(ctx))}
  catch(e){H.rep("er",e.message); threw=true}
 }
 if(threw){
  /* عيبٌ سابق D09: نصف عمليةٍ كانت تُثبَّت في التاريخ لأن الرمي كان
     يُمسَك ويُتجاهَل. اليوم الفشل بعد تعديلٍ يُرجِع الحالة كلّها. */
  rollbackTool(sn);
  H.prompt(); H.draw();
  return;
 }
 const n=madeReal(ctx);
 if(n){
  touch();
  if(!BATCH.on){pushHistory(sn,lbl); H.refresh(); autosave()}
 }
 /* الرسالةُ نصٌّ وحدَه: كان finish(ctx) في «مقياس» و«تحرير الخطّ» يطبع
    «[object Object]» في سطر الأوامر (المرحلة ٣ من خطّة الفحص) */
 if(typeof msg==="string"&&msg)H.rep(n?"ok":"in",msg);
 H.prompt(); H.draw();
}
export function cancel(quiet){
 const ctx=T.ctx, sn=T.snap, lbl=(T.def&&(T.def.label||T.def.id))||null;
 const n=madeReal(ctx);
 reset();
 if(ctx)jrAdd("esc");
 if(n){
  touch();
  if(!BATCH.on){pushHistory(sn,lbl); H.refresh(); autosave()}
 }
 if(!quiet)H.rep("in",n?`أُلغي — بقي ${n} عنصر`:"أُلغي");
 H.prompt(); H.draw();
}
/* restart: الأداة تعيد نفسها من الخطوة الأولى بعد كل عنصر —
   تنفيذاً لقاعدة «الأداة تبقى فعّالة حتى Esc» */
function restart(){
 T.i=0; T.lock=null; T.lenLock=null; T.ghost=null;
 if(T.ctx){T.ctx.pts.length=0; T.ctx.v={}; T.ctx.n=0}
 H.prompt();
}
function advance(){
 const st=step();
 if(st&&st.restart){restart(); return}
 if(st&&st.loop){T.ctx.n++; T.lock=null; T.lenLock=null;
  H.prompt(); return}
 T.i++; T.lock=null; T.lenLock=null;
 if(!step())finish(); else H.prompt();
}
export const nextStep=advance;
/* إنهاءُ سلسلةٍ مع بقاء الأداة فعّالة: تبدأ سلسلةً جديدة من الخطوة الأولى
   والجدرانُ المرسومة تبقى في الأداة حتى Esc (خطوة تاريخٍ واحدة) */
export const endChain=()=>{restart(); H.draw()};
/* إدراج خطوات فرعية بعد الجارية — للأدوات المتفرّعة مثل rotate R */
export const pushSteps=arr=>{
 if(T.steps)T.steps.splice(T.i+1,0,...(arr||[]));
};
export const rec=(ctx,e,coll)=>{
 if(e&&ctx)ctx.made.push({id:e.id,coll:coll||"walls"});
 return e;
};
export const dirty=ctx=>{if(ctx)ctx.made.push({id:"~",coll:"__"})};

/* عدد ما أُنشئ أو عُدِّل فعلاً — يستثني علامة الخطوة الداخلية
   (__step) وحدها؛ علامة dirty (__) تمثّل تعديلاً حقيقياً على كيانٍ
   قائم (move/weld وغيرهما لا تُنشئ كياناتٍ جديدة) فتُحسَب. */
export const madeReal=ctx=>ctx
 ? ctx.made.filter(x=>x.coll!=="__step").length : 0;

/* حدُّ خطوةٍ داخل ctx.made: تُدفَع قبيل تنفيذ each في feedPoint،
   فتصير مخلوقات الخطوة الواحدة محصورةً بين حدَّين. */
const STEP_MARK={id:"+",coll:"__step"};
function markStep(){ if(T.ctx) T.ctx.made.push(STEP_MARK); }

/* ═══ الإدخال بالكتابة على خطوات الكيانات ═══
   يشترك فيه النقر والكتابة: النقر يعطي hit مباشرة، والكتابة
   تحلّ المعرّف أولاً ثم تمرّ بالمسار نفسه (entVia والرفض). */
const entPt=hit=>{
 const sh=shapeOf(hit);
 if(!sh)return null;
 if(sh.t==="pt")return sh.p.slice();
 if(sh.t==="seg")return [Math.round((sh.a[0]+sh.b[0])/2),
                         Math.round((sh.a[1]+sh.b[1])/2)];
 const P=sh.pts||[];
 if(!P.length)return null;
 return [Math.round(P.reduce((s,p)=>s+p[0],0)/P.length),
         Math.round(P.reduce((s,p)=>s+p[1],0)/P.length)];
};
/* نقطة على مسار الكيان بمسافةٍ من بدايته · السالب من نهايته */
const entAlong=(hit,v)=>{
 const sh=shapeOf(hit);
 if(!sh||sh.t!=="seg")
  throw new Error("المسافة على المسار للجدران والدرج وحدها");
 const dx=sh.b[0]-sh.a[0], dy=sh.b[1]-sh.a[1];
 const L=Math.hypot(dx,dy);
 if(L<1)throw new Error("مسارٌ صفري");
 const t=clamp((v<0)?(L+v):v,0,L);
 return [Math.round(sh.a[0]+dx/L*t), Math.round(sh.a[1]+dy/L*t)];
};
function useEnt(st,hit,p){
 if(st.ent!==1&&hit.k!==st.ent){
  /* entVia: بديلٌ مصرَّح به — النقر على فتحةٍ يعني جدارها */
  const via=st.entVia&&st.entVia[hit.k];
  const alt=via?via(hit):null;
  if(!alt)throw new Error(`انقر على ${st.entName||st.ent}`
   +" — أو اكتب معرّفه");
  hit=alt;
 }
 T.ctx.v[st.k||"ent"]=hit;
 if(st.each)joinTxn(()=>st.each(T.ctx,hit,p||entPt(hit)));
 advance();
}

/* ═══ التغذية ═══ */
/* raw: النقرة الخام قبل الالتقاط (snap) — الالتقاطُ يُزيح النقطة عن الكيان
   أحياناً، فاختيارُ الكيان يكون من الخام والموضعُ من p */
export function feedPoint(p,raw){
 const st=step();
 if(!st)return false;
 if(st.confirm){
  H.rep("wr","هذه الخطوة تحتاج Enter للتأكيد لا نقرة");
  return false;
 }
 /* خطوةُ نصٍّ حرّ لا تُنقَر (كشفه مسحُ الأدوات قبل المرحلة ٥): كانت النقرةُ
    تُحوَّل نصّاً «600,700» فيُقال «لا منفذ بمعرّف «600,700»» وتُدفَع
    النقطةُ في ctx.pts. الآن تُرفَض بلا أثر وتُقال الطريقة. */
 if(st.text){
  H.rep("wr",`«${st.p}» يُكتب في سطر الإدخال — النقرةُ هنا لا تُقرأ`);
  return false;
 }
 try{
  markStep();
  if(st.ent){
   const q=raw||p;
   /* النوع المطلوب (وبدائله entVia) أولاً؛ وإلا فالالتقاط العام لرسالة
      الرفض الصحيحة «انقر على جدار» عند الإصابة بنوعٍ آخر */
   const kinds=(st.ent===1)?null
    :[st.ent].concat(Object.keys(st.entVia||{}));
   const hit=(kinds&&H.hit(q[0],q[1],kinds))||H.hit(q[0],q[1]);
   if(!hit)throw new Error("لا عنصر هنا");
   useEnt(st,hit,p);
  }else if(st.ang){
   const b=baseOf();
   if(!b)throw new Error("لا نقطة أساس للزاوية");
   const a=angOf(b,p);
   T.ctx.v[st.k||"a"]=a;
   if(st.each)joinTxn(()=>st.each(T.ctx,a));
   advance();
  }else{
   T.ctx.pts.push(p);
   if(st.k)T.ctx.v[st.k]=p;
   if(st.each)joinTxn(()=>st.each(T.ctx,p));
   advance();
  }
 }catch(e){H.rep("er",e.message); H.prompt(); H.draw(); return false}
  jrAdd(`${(p[0]/1000).toFixed(3)},${(p[1]/1000).toFixed(3)}`);
  H.draw(); return true;
}
/* ═══ الضربة الحرّة ═══
   الخطوة تبقى فعّالة: الرسم يتراكم حتى Enter، ولا يُنشأ شيء منه. */
export function feedStroke(pts){
 const st=step();
 if(!st||!st.freehand)return false;
 const P=(pts||[])
  .filter(p=>p&&isFinite(p[0])&&isFinite(p[1]))
  .map(p=>[Math.round(p[0]),Math.round(p[1])]);
 if(P.length<2)return false;
 try{
  if(st.each)joinTxn(()=>st.each(T.ctx,P));
  T.ctx.n++;
 }catch(e){H.rep("er",e.message)}
 H.prompt(); H.draw();
 return true;
}
export function feedText(s){
 const st=step();
 if(!st)return false;
 s=String(s==null?"":s).trim();
 if(!s)return enter();
 if(st.opts){
  const k=norm(s);
  if(k.length===1&&st.opts[k]){
   try{joinTxn(()=>st.opts[k].run(T.ctx))}
   catch(e){H.rep("er",e.message)}
   H.prompt(); H.draw(); return true;
  }
 }
 try{
  /* خطوة نصٍّ حرّ — تُستعملها أداة التحديد وأدوات التأشير */
  if(st.text){
   if(st.each)joinTxn(()=>st.each(T.ctx,s));
   jrAdd(s);
   advance();
   H.draw(); return true;
  }
  /* ضبط خيار الأداة من سطر الإدخال: t=0.2 · type=ext · chain=0 */
  const oa=/^([A-Za-z][A-Za-z0-9]*)=(.*)$/.exec(s);
  if(oa&&T.def){
   const f=(T.def.opts||[]).find(x=>
    x.k.toLowerCase()===oa[1].toLowerCase());
   if(f){
    let v=oa[2].trim();
    if(f.type==="chk")v=/^(1|on|y|yes|نعم)$/i.test(v)?1:0;
    else if(f.type==="sel"){
     /* القائمةُ قد تكون دالّةً تُبنى عند الطلب (أنواع الجدول مثلاً) —
        كانت تُعامَل مصفوفةً فيسقط «kind=sym» بخطأ برمجيّ */
     const IT=(typeof f.items==="function"?f.items():f.items)||[];
     if(!IT.some(([iv])=>String(iv)===v))
      throw new Error(`«${v}» ليس من: `
       +IT.map(x=>x[0]).join(" · "));
    }else if(f.type==="len"){
     if(v!==""&&Mx(v)==null)throw new Error(`«${v}» ليس طولاً`);
    }else if(f.type==="num"){
     if(v!==""&&Nx(v)==null)throw new Error(`«${v}» ليس رقماً`);
    }
    setOpt(T.def.id,f.k,v);
    jrAdd(`${f.k}=${v}`);
    H.rep("in",`${f.label}: `
     +((f.type==="chk")?(v?"مُشغّل":"مُوقف"):v));
    H.prompt(); H.draw(); return true;
   }
  }
  /* خطوة الزاوية تقبل رقماً مباشراً */
  if(st.ang){
   const v=parseFloat(s);
   if(!isFinite(v))throw new Error(`«${s}» ليست زاوية`);
   T.ctx.v[st.k||"a"]=v;
   jrAdd(String(v));
   if(st.each)joinTxn(()=>st.each(T.ctx,v));
   advance();
   H.draw(); return true;
  }
  /* خطوة كيان: W7 يعني منتصفه · W7@2.4 مسافةٌ على مساره */
  if(st.ent){
   const m=/^([A-Za-z]+\d+)(?:@(.+))?$/.exec(s);
   const hit=m?findById(m[1]):null;
   if(!hit)throw new Error("هذه الخطوة تحتاج نقرة على عنصر — أو "
    +"اكتب معرّفه مثل W7 أو W7@2.4");
   jrAdd(s);
   let atPt=null;
   if(m[2]!=null){
    const off=Mx(m[2].trim());
    if(off==null)throw new Error(`«${m[2]}» ليست مسافة صالحة`);
    atPt=entAlong(hit,off);
   }
   useEnt(st,hit,atPt);
   H.draw(); return true;
  }
  const q=parsePt(s,baseOf(),dirOf());
  if(!q){
   /* اسم أداةٍ صريح وسط أداة ⇒ تبديل لا رفض.
      begin يلغي الحالية ويُثبّت ما صنعتَه قبلها. */
   const d=(s.length>1)?findTool(s):null;
   if(d){histAdd(s); begin(d); return true}
   throw new Error(`«${s}» ليست إحداثياً ولا اسم أداة`);
  }
  if(q.k==="err")throw new Error(q.m);
  if(q.k==="ang"){
   T.lock=q.a;
   H.rep("in",`زاوية مقفلة ${q.a}°`);
   H.prompt(); H.draw(); return true;
  }
  if(q.k==="len")throw new Error("حدّد نقطة الأساس أولاً");
  if(q.k==="dim"){
   const b=baseOf();
   if(!b)throw new Error("المقاس يحتاج نقطة أساس");
   const sx=(T.ghost&&T.ghost[0]<b[0])?-1:1;
   const sy=(T.ghost&&T.ghost[1]<b[1])?-1:1;
   return feedPoint([b[0]+q.w*sx,b[1]+q.d*sy]);
  }
  return feedPoint(q.p);
 }catch(e){H.rep("er",e.message); H.prompt(); H.draw(); return false}
}
export function enter(){
 const st=step();
 if(!st){
  /* الإعادة تحمل الوسيط: بعد «ELEV S» تعيد الجنوبية لا الخيار
     الافتراضي */
  if(T.last){begin(T.last,T.lastArg); return true}
  return false;
 }
 if(st.confirm){
  if(st.each){
   try{joinTxn(()=>st.each(T.ctx))}
   catch(e){H.rep("er",e.message); return false}
  }
  T.i++; jrAdd("."); T.lock=null; T.lenLock=null;
  if(!step())finish(); else {H.prompt(); H.draw()}
  return true;
 }
 if(st.loop){
  if(st.min&&T.ctx.n<st.min){
   H.rep("wr",`تحتاج ${st.min} على الأقل`);
   return false;
  }
  /* chainRestart: Enter يُنهي السلسلة الجارية فقط وتبقى الأداة فعّالة
     لسلسلةٍ جديدة؛ الخروج منها بـEsc */
  if(st.chainRestart){jrAdd("."); restart(); H.draw(); return true}
  T.i++; jrAdd("."); T.lock=null; T.lenLock=null;
  if(!step())finish(); else {H.prompt(); H.draw()}
  return true;
 }
 H.rep("wr",`${T.def.label}: ${st.p} مطلوب`);
 return false;
}
export function undoStep(){
 T.lock=null; T.lenLock=null;
 jrTaint("تراجع خطوة داخل أداة");
 const ctx=T.ctx;
 if(!ctx)return false;
 /* تُزال كيانات آخر خطوةِ إدخالٍ كلُّها دفعةً واحدة: أداة المستطيل
    تُنشئ أربعة جدرانٍ بنقرةٍ واحدة، فيردّها U كلَّها لا جداراً جداراً.
    الحدُّ هو STEP_MARK المدفوعة في feedPoint قبل تنفيذ each. */
 let removed=0;
 while(ctx.made.length){
  const m=ctx.made.pop();
  if(m===STEP_MARK)break;
  if(m.coll==="__")continue;            /* dirty: لا كيان خلفه */
  if(Array.isArray(S[m.coll])){
   S[m.coll]=S[m.coll].filter(e=>e.id!==m.id);
   removed++;
  }
 }
 if(!removed){
  if(ctx.pts.length){ctx.pts.pop(); H.prompt(); H.draw(); return true}
  return false;
 }
 if(ctx.pts.length>1)ctx.pts.pop();
 if(ctx.n>0)ctx.n--;
 touch(); H.rep("in","تراجع خطوة"); H.prompt(); H.draw();
 return true;
}
export function preview(){
 const d=T.def;
 if(!d||!d.prev||!T.ctx)return [];
 try{return d.prev(T.ctx,T.ghost)||[]}
 catch(e){return []}
}
export const pvLine=(a,b,c)=>({t:"l",a,b,c});
export const pvRect=(a,b,c)=>({t:"r",a,b,c});
export const pvBand=(a,b,t,c)=>({t:"b",a,b,w:t,c});
export const pvPoly=(pts,c,cl)=>({t:"pg",pts,c,cl:cl===0?0:1});
export const pvText=(p,s,c)=>({t:"tx",p,s,c});

export function histAdd(s){
 s=String(s||"").trim();
 if(!s)return;
 if(T.hist[T.hist.length-1]===s)return;
 T.hist.push(s);
 if(T.hist.length>60)T.hist.shift();
}

/* ═══ القفل من الإدخال الحركي ═══
   قيمةٌ يكتبها المستخدم فتُقيّد المؤشّر حتى ينقر — مساعدةُ إدخال
   خالصة، لا تعدّل شيئاً بعد وقوع النقطة. */
export function lockLen(mm){
 T.lenLock=(mm==null)?null:Math.max(1,Math.round(mm));
 H.prompt(); H.draw();
 return T.lenLock;
}
export function lockAng(a){
 T.lock=(a==null)?null:a;
 H.prompt(); H.draw();
 return T.lock;
}
