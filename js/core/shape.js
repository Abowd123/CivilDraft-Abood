/* ═══ سجلّ التطبيع — 2.4 ═══
   ensureShape كانت تنقّي صامتة: تُصلح حقلاً أو تُسقِط كياناً بلا
   أثر، وتُبلِّغ فقط عمّا نُصِب له عدّادٌ صريح. اليوم سجلٌّ واحد
   منظَّم، وكلُّ تعديلٍ يُسجَّل بأحد ثلاثة أنواع:
     normalize — قيمةٌ قُوِّمت (سماكةٌ فوق الحدّ ⇒ الحدّ · نوعٌ مجهول
                 ⇒ الافتراضيّ) — مع القيمة قبل وبعد.
     repair    — كيانٌ أُصلح شكلُه (قوسٌ استُقيم · رؤوسٌ فاسدة أُسقطت).
     drop      — كيانٌ أُسقِط (إحداثيٌّ ناقص · حاضنٌ زال).

   يُجمَّع بحسب (النوع · الكيان · السبب) لا بالعدد المجرَّد: القارئ
   يرى كم وأيّ معرّفات ولماذا. والسجلّ سقفٌ في عدد سطوره الخام
   (MAXENT) لا في عدّاده — فملفٌّ فيه ستون ألف كيانٍ فاسد لا يُنمي
   الذاكرة، ويبقى العدد صحيحاً.

   لا يعرف هذا الملفّ S ولا الواجهة: state.js يبني السجلّ ويقرأه. */
import {arrow} from "./units.js";

const MAXENT=300;

/* اسمُ الكيان للعرض + جنسُه لصيغة الفعل: حُذفت (مؤنّث) / حُذف */
const NAME={
 wall:["جدار",0], open:["فتحة",1], area:["منطقة",1], dim:["بُعد",0],
 chain:["سلسلة",1], anno:["تأشير",0], col:["عمود",0], fix:["أداة",1],
 stair:["درج",0], block:["كتلة",1], refEnt:["كيان مرجع",0],
 meta:["إعداد",0], grid:["محور",0], sheet:["ورقة",1], title:["عنوان",0],
 underlay:["صورة مرجعية",1], ref:["مرجع",0], vpv:["منفذ",0]
};
const nm=k=>(NAME[k]||[k,0])[0];
const fem=k=>!!(NAME[k]||[0,0])[1];

export function newLog(){
 return {entries:[], g:[], n:0};
}
function slot(log,type,kind,verb,noun,why){
 const key=[type,kind,verb||"",noun||"",why||""].join("|");
 let s=log.g.find(x=>x.key===key);
 if(!s){s={key,type,kind,verb,noun,why,n:0,ids:[],ex:[]}; log.g.push(s)}
 return s;
}
export function add(log,e){
 if(!log||!e)return;
 const k=e.n||1;           /* e.n: عددُ ما يمثّله السطر (حذفٌ بالجملة) */
 log.n+=k;
 if(log.entries.length<MAXENT)log.entries.push(e);
 const s=slot(log,e.type,e.kind,e.verb,e.noun,e.why);
 s.n+=k;
 if(e.id!=null&&s.ids.length<5)s.ids.push(e.id);
 if(e.type==="normalize"&&s.ex.length<3)
  s.ex.push({field:e.field,before:e.before,after:e.after});
}
/* opts: {verb,noun} تُبدِّل الفعلَ والاسمَ في الرسالة (استُقيم …) */
export const norm=(log,kind,id,field,before,after,why)=>
 add(log,{type:"normalize",kind,id,field,before,after,why});
export const repair=(log,kind,id,why,o)=>
 add(log,Object.assign({type:"repair",kind,id,why},o||{}));
export const drop=(log,kind,id,why,o)=>
 add(log,Object.assign({type:"drop",kind,id,why},o||{}));

export const count=log=>(log?log.n:0);
export const empty=log=>!log||log.n===0;
export const dump=log=>(log&&log.entries?log.entries.slice():[]);
/* تجميعٌ بالنوع فالكيان: {drop:{wall:n},repair:{…},normalize:{…}} */
export function totals(log){
 const t={normalize:{},repair:{},drop:{}};
 ((log&&log.g)||[]).forEach(s=>{
  t[s.type][s.kind]=(t[s.type][s.kind]||0)+s.n;
 });
 return t;
}
const short=v=>{
 const s=(typeof v==="string")?v:JSON.stringify(v);
 return (s==null)?"—":(s.length>24?s.slice(0,24)+"…":s);
};

/* ═══ الرسائل ═══ الترتيب مقصود: drop أخطرها فrepair فnormalize.
   [sev,msg]: «wr» لما فُقِد أو تغيّر شكلاً · «in» لما قُوِّم قيمةً. */
export function notes(log){
 const out=[];
 const gs=(log&&log.g)||[];
 ["drop","repair"].forEach(ty=>{
  gs.filter(s=>s.type===ty).forEach(s=>{
   const verb=s.verb||(ty==="drop"?(fem(s.kind)?"حُذفت":"حُذف")
    :(fem(s.kind)?"أُصلحت":"أُصلح"));
   const noun=s.noun||nm(s.kind);
   const ids=s.ids.length
    ?` (${s.ids.join(" · ")}${s.n>s.ids.length?` و${s.n-s.ids.length} غيرها`:""})`
    :"";
   out.push(["wr",`${verb} ${s.n} ${noun} عند التحميل${ids}`
    +(s.why?` — ${s.why}`:"")]);
  });
 });
 const N=gs.filter(s=>s.type==="normalize");
 if(N.length){
  const tot=N.reduce((a,s)=>a+s.n,0);
  const per={};
  N.forEach(s=>{per[s.kind]=(per[s.kind]||0)+s.n});
  const kinds=Object.keys(per).map(k=>`${per[k]} ${nm(k)}`);
  const ex=[];
  N.forEach(s=>s.ex.forEach(e=>{
   if(ex.length<3)ex.push(`${nm(s.kind)}.${e.field} ${arrow(short(e.before),short(e.after))}`);
  }));
  out.push(["in",`قُوِّمت ${tot} قيمة عند التحميل: ${kinds.join(" · ")}`
   +(ex.length?` — مثلاً ${ex.join("، ")}`:"")]);
 }
 return out;
}
