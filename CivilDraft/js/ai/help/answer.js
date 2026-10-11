/* ═══ بناء الإجابة ═══ محليٌّ أولاً، ثم مزوّدٌ عند عدم الثقة.
   لا يلمس الحالة — يصف الإجراء فقط. */
import {matchIntent, isConfident} from "./intent.js";
import {cardById} from "./kb.js";
import {askProvider, providerReady} from "./provider.js";
import {lint, lintText} from "../lint.js";
import {sanitizeExternal} from "../../core/escape.js";

export function buildAnswer(question){
 const res=matchIntent(question,{limit:5});
 const confident=isConfident(res);
 if(!res.best){
  return {kind:"empty",title:"لم أفهم السؤال",
   text:"جرّب صياغةً أخرى، مثل: «كيف أبني غرفة؟» أو «كيف أحذف عنصراً؟».",
   actions:[],related:suggestTopics(),confident:false}; }
 const b=res.best;
 const related=res.matches.slice(1,4)
  .map(m=>({id:m.id,title:m.title,kind:m.kind}));
 if(b.kind==="command" && b.id==="gallery"){
  return {
   kind:"command", title:"القوالب والكتل",
   text:"افتح معرض القوالب والكتل الجاهزة لإدراج غرفة أو شقة أو"
     +" فيلا. كلها تمرّ عبر المدقّق قبل الإدراج.",
   actions:[{label:"افتح المعرض", type:"openGallery"}],
   related:res.matches.slice(1,4)
     .map(m=>({id:m.id,title:m.title,kind:m.kind})),
   confident:true };
 }
 if(b.kind==="command" && b.id==="lint"){
  const rep=lint();
  return { kind:"command", title:"فحص الرسم", text:lintText(rep),
   actions:[{label:"إعادة الفحص",type:"runLint"}],
   related:res.matches.slice(1,4)
     .map(m=>({id:m.id,title:m.title,kind:m.kind})),
   confident:true };
 }
 if(b.kind==="tool"){
  const card=b.card||cardById(b.id);
  const actions=[{label:`ابدأ أداة «${card.label}»`,
   type:"activateTool",toolId:card.id}];
  return {kind:"tool",title:card.label,text:card.text,actions,related,
   confident,
   warn:card.destructive
    ?"هذه أداةٌ تعدّل ما هو مرسوم — تأكّد من التحديد.":null}; }
 const a=b.article;
 return {kind:"article",title:a.title,text:a.body,actions:[],related,confident};
}
export function suggestTopics(){
 return [{id:"__q_room",title:"كيف أبني غرفة؟"},
  {id:"__q_del",title:"كيف أحذف عنصراً؟"},
  {id:"__q_dim",title:"كيف أقيس مسافة؟"},
  {id:"__q_lint",title:"افحص رسمي"},
  {id:"__q_save",title:"كيف أحفظ عملي؟"}];
}
export const TOPIC_Q={ __q_room:"كيف أبني غرفة؟",__q_del:"كيف أحذف عنصراً؟",
 __q_dim:"كيف أقيس مسافة؟",__q_lint:"افحص رسمي",__q_save:"كيف أحفظ عملي؟" };

export async function answerQuestion(question){
 const local=buildAnswer(question);
 if(local.confident || !providerReady()) return local;
 try{ const {text,ms}=await askProvider(question);
  return {kind:"provider",title:"إجابة المساعد",
   text:sanitizeExternal(text),actions:local.actions,
   related:local.related,confident:true,ms}; }
 catch(e){ return Object.assign({},local,
   {text:local.text+`\n\n(تعذّر سؤال المزوّد: ${e.message})`}); }
}
