/* ═══ المزوّد الاحتياطي ═══ يُستدعى عند فشل المطابقة المحلية.
   سياقٌ مقيّد (toolsSpec فقط، لا حالة مشروع). يعيد استخدام net.ask. */
import {ask, ready, validateUrl, AI, MAX_QUESTION} from "../net.js";
import {toolsSpec} from "../lang.js";

function helpSystem(){
 return `أنت «مرشد استخدام» داخل تطبيق «CivilDraft» لرسم المخططات المعمارية.`
  +` مهمّتك شرح كيفية استخدام الأداة خطوةً بخطوة بالعربية.`
  +`\n\nقواعد صارمة:`
  +`\n· اشرح الخطوات فقط — لا تُخرِج أوامر ولا كتل plan/ops ولا كوداً.`
  +`\n· لا تدّعِ وجود أداةٍ ليست في القائمة أدناه.`
  +`\n· إن لم تعرف، قل ذلك واقترح أقرب أداةٍ موجودة.`
  +`\n· أجب بإيجازٍ ووضوح بالعربية.`
  +`\n\nالأدوات المتاحة (لا غيرها):\n${toolsSpec()}`;
}
export const providerReady=()=>ready();
/* سقف سؤال المرشد: 500 محرف — أضيق من MAX_QUESTION عامداً، فمرشد
   الاستخدام لا يحتاج أكثر ولا يُرسَل إليه مشروعٌ أصلاً. */
const HELP_Q=Math.min(500,MAX_QUESTION);
export async function askProvider(question){
 if(!ready())
  throw new Error("المزوّد غير مُهيَّأ — فعّله من لوحة «المساعد».");
 validateUrl(AI.url);        /* قبل أي نداء — لا ننتظر ask() */
 const q=String(question||"").trim().slice(0,HELP_Q);
 const {txt,ms}=await ask(helpSystem(),q);
 return {text:String(txt||"").trim(),ms};
}
