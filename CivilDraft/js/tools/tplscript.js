/* ═══ منفِّذُ القوالب المبنيّة بالأدوات ═══
   القالبُ هنا قائمةُ أفعال كما تفعلها اليد: تفعيلُ أداة، ونقرةٌ بالمليمتر،
   وكتابةٌ في سطر الأوامر، وخيارُ أداة، وتحديد. كلُّها تمرّ بـregistry
   نفسِه الذي تمرّ به اللوحة، داخل معاملةٍ واحدة (edit) ووضعِ الدفعة:
   خطوةُ تراجعٍ واحدة للقالب كلِّه، وأيُّ رسالة خطأ من أداةٍ تُرجِع كلَّ شيء
   (لا قالبَ نصفُه مرسوم).

   الأفعال:
     {tool:"id", arg?}    تفعيل أداة (وسيطٌ لأدوات arg:1)
     {at:[x,y]} أو {at:[[x,y],...]}   نقرة أو نقرات (مم)
     {type:"..."} {enter:1} {esc:1}
     {opt:[tool,k,v]}     خيار أداة · يُعاد كلُّ خيارٍ إلى ما كان بعد القالب
     {pick:"last:k"|"first:k"|"all:k"|"last:k:n"|"idx:k:0,2"|"none"}
     {layer:[L,f,v]}      طبقة
     {addLevel:1} {onLevel:n}   طابقٌ جديد · الطابق النشط
     {meta:{...}}         وصف المشروع (المقياس، الاسم…)
     {ch:"عنوان"} {say:"شرح"}   علاماتٌ يقرؤها فيديو البناء وورقة الخطوات فقط */
import {S,edit,editFailed} from "../core/state.js";
import * as R from "./registry.js";
import {setScriptRunner} from "../core/templates.js";
import {COLL} from "../core/ents.js";
import {setLay} from "../core/layers.js";
import {addLevel} from "./levelmgr.js";

function pickOf(spec){
 if(spec==="none")return [];
 const q=/^idx:(\w+):([\d,]+)$/.exec(String(spec||""));
 if(q){
  const L=S[COLL[q[1]]]||[];
  return q[2].split(",").map(i=>{const e=L[+i]; if(!e)throw new Error(`لا ${q[1]} بالترتيب ${i}`); return {k:q[1],id:e.id}});
 }
 const m=/^(last|first|all):(\w+)(?::(\d+))?$/.exec(String(spec||""));
 if(!m)throw new Error(`تحديدٌ غير مفهوم: ${spec}`);
 const L=S[COLL[m[2]]]||[];
 const n=+m[3]||1;
 const E=m[1]==="all"?L:(m[1]==="last"?L.slice(-n):L.slice(0,n));
 return E.map(e=>({k:m[2],id:e.id}));
}
const P=p=>[Math.round(p[0]),Math.round(p[1])];
function act(a){
 if(a.tool){if(R.active())R.cancel(true); R.begin(a.tool,a.arg)}
 else if(a.at){const L=Array.isArray(a.at[0])?a.at:[a.at]; L.forEach(p=>R.feedPoint(P(p),P(p)))}
 else if(a.type!=null){if(R.feedText(String(a.type))===false)throw new Error(`رُفض الإدخال «${a.type}»`)}
 else if(a.enter)R.enter();
 else if(a.esc)R.cancel(true);
 else if(a.opt)R.setOpt(a.opt[0],a.opt[1],a.opt[2]);
 else if(a.pick)R.H.setSel(pickOf(a.pick));
 else if(a.layer)setLay(a.layer[0],a.layer[1],a.layer[2]);
 else if(a.addLevel)addLevel();
 else if(a.onLevel!=null)S.meta.level=+a.onLevel;
 else if(a.meta)Object.assign(S.meta,a.meta);
 else if(a.ch!=null||a.say!=null){}   /* علاماتُ الفصول والشرح: للفيديو وورقة الخطوات، لا أثرَ لها في الرسم */
 else throw new Error("فعلٌ مجهول في القالب: "+JSON.stringify(a));
}
/* يعيد {ok,made,errs} — وعند الفشل يرمي برسالة أوّل خطأ وموضعه */
export function runScript(t){
 const acts=t.script||[];
 const opt0=JSON.stringify(R.OPT), rb0=JSON.stringify(S.rb||{});
 const rep0=R.H.rep, errs=[];
 let at=-1, out=null, why="";
 R.H.rep=(c,m)=>{if(String(c)==="er")errs.push({at,m:String(m)}); return rep0(c,m)};
 try{
  out=edit(()=>{
   /* التعامدُ والقطبيُّ أوضاعُ يد: القالبُ يعطي إحداثيّاته كما هي */
   if(S.rb){S.rb.ortho=0; S.rb.polar=0}
   /* الخياراتُ لزجةٌ بين الجلسات: القالبُ يبدأ من إعلان كلِّ أداة لا من
      آخر ما اختاره المستخدم، وإلّا تغيّر القالبُ بتغيّر يده (شباكٌ بارتفاعٍ
      تركه المستخدم 0.6 فيصير كلُّ شبابيك القالب 0.6). ثم يعود ما اختاره. */
   R.toolList().forEach(d=>(d.opts||[]).forEach(f=>{if(f.def!==undefined)R.OPT[d.id]=Object.assign(R.OPT[d.id]||{},{[f.k]:f.def})}));
   R.setBatch(1);
   try{
    acts.forEach((a,i)=>{
     at=i; act(a);
     if(errs.length)throw new Error(`الخطوة ${i+1}: ${errs[0].m}`);
    });
    if(R.active())R.cancel(true);
   }catch(e){
    why=(e&&e.message)||String(e);
    try{if(R.active())R.cancel(true)}catch(_){}
    throw e;
   }finally{R.setBatch(0); R.H.setSel([])}
   return {ok:1,steps:acts.length};
  },`قالب ${t.title||t.name}`);
 }finally{
  R.H.rep=rep0;
  const o=JSON.parse(opt0);
  Object.keys(R.OPT).forEach(k=>{if(!(k in o))delete R.OPT[k]});
  Object.assign(R.OPT,o); R.saveOpts();
  if(S.rb)Object.assign(S.rb,JSON.parse(rb0));
 }
 if(!out||editFailed())throw new Error(why||`تعذّر بناء القالب «${t.title||t.name}»`);
 return out;
}
setScriptRunner(runScript);
