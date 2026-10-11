/* ═══ مطابقة النيّة ═══ يعيد استخدام norm من units.js (نفس تطبيع
   registry) لاتساق البحث مع سلوك الأداة. لا يلمس الحالة. */
import {norm} from "../../core/units.js";
import {knowledgeEntries} from "./kb.js";

const VERB=[
 {re:["ابني","ارسم","انشئ","اضف","اعمل","سو","سوي"],intent:"create"},
 {re:["احذف","امسح","ازل","الغِ","الغاء","شيل"],intent:"delete"},
 {re:["عدل","غير","حرك","انقل","انسخ","دور","كبر","صغر"],intent:"modify"},
 {re:["قِس","قياس","ابعاد","بعد","مسافة"],intent:"measure"},
 {re:["احفظ","حفظ","صدر","تصدير"],intent:"save"},
 {re:["تراجع","الغاء","اعادة","خطأ","غلط"],intent:"undo"}
];
const INTENT_HINT={ delete:["delete"],undo:["undo"],save:["save"],
 measure:["dim","chain"],create:[],modify:[] };

let _idx=null;
function index(){
 if(_idx) return _idx;
 _idx=knowledgeEntries().map(e=>({...e,
  _norm:(e.keywords||[]).map(k=>norm(String(k))).filter(Boolean),
  _title:norm(String(e.title||""))}));
 return _idx;
}
export function rebuildIndex(){ _idx=null; return index(); }
/* ═══ كلماتُ الاستفهام والحروف لا تُطابَق ═══
   «كيف أنقل عنصر؟» كانت تُجيب بـ«مكيّف سبليت»: المطابقةُ تحتوائيةٌ
   (`_title.includes(w)`) و«مكيف» تحتوي «كيف» فتفوز على «نقل».
   عيبٌ كامنٌ ظهر لحظةَ دخلت أسماءٌ جديدةٌ إلى السجلّ — والصوابُ أنّ
   أداةَ الاستفهام ليست موضوعَ السؤال فلا تُسهم في ترتيبه.
   والقائمةُ حروفٌ واستفهامٌ فقط: لا فعلَ فيها، فـ`detectIntent`
   (الذي يقرأ VERB من الكلمات نفسِها) لا يتأثّر. */
const STOP=new Set(["كيف","كيفيه","كيفية","ماذا","ما","ماهو","ماهي",
 "هل","لماذا","ليش","وش","ايش","متى","اين","وين","هنا","هناك",
 "من","الى","على","في","عن","مع","او","ثم","لكن","هذا","هذه","ذلك",
 "التي","الذي","ان","انه","قد","كل","بعض","يعني","طيب"]
 .map(w=>norm(w)));
const words=q=>norm(String(q||"")).split(/[^\p{L}\p{N}]+/u)
 .filter(w=>w.length>1&&!STOP.has(w));

function score(entry,qWords){
 let s=0;
 for(const w of qWords){
  if(entry._title===w) s+=6;
  else if(w.length>=3 && entry._title.includes(w)) s+=3;
  for(const k of entry._norm){ if(k===w) s+=4;
   else if(w.length>=3 && k.length>=3 && (k.includes(w)||w.includes(k))) s+=1.5; } }
 return s;
}
export function detectIntent(q){
 const qWords=words(q);
 for(const v of VERB){
  if(v.re.some(t=>qWords.includes(norm(t)))) return v.intent; }
 return null;
}
export function matchIntent(question,{limit=5}={}){
 const qWords=words(question); const idx=index();
 const intent=detectIntent(question);
 let ranked=idx.map(e=>{ let sc=score(e,qWords);
  const hints=INTENT_HINT[intent]||[]; if(hints.includes(e.id)) sc+=5;
  if(e.kind==="article" && intent && e.id===intent) sc+=4; // تعزيز المقال
  return {kind:e.kind,id:e.id,title:e.title,score:sc,
   card:e.card||null,article:e.article||null}; })
  .filter(r=>r.score>0).sort((a,b)=>b.score-a.score);
 const matches=ranked.slice(0,limit); const best=matches[0]||null;
 let confidence=0;
 if(best){ const top=best.score, second=matches[1]?matches[1].score:0;
  confidence=Math.min(1,(top/8)*(top>second?1:0.7)); }
 return {best,matches,intent,confidence};
}
export function isConfident(res,threshold=0.45){
 return !!(res&&res.best&&res.confidence>=threshold);
}
