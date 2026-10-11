/* ═══ اختبار روبوت الإرشاد ═══
   يُشغَّل بالمِعمَل الحاليّ بلا مكتبات — نفس أسلوب tools.js: يستورد
   ملفّات الأدوات جانبيّاً فتُسجَّل في registry.js، ثم يفحص كتلة
   المساعدة (kb/intent/answer) على السجلّ الحقيقيّ لا سجلٍّ مُصطنَع،
   فلا يتخلّف الاختبار عن الأدوات الفعلية.

   المزوّد (provider.js) غير جاهزٍ افتراضياً (AI.on=0)، فمسار
   الرجوع إليه يُفحَص عبر السلوك الحقيقي — بلا محاكاةٍ لشبكةٍ لا
   ينبغي لهذا الاختبار لمسها.

   التشغيل:  node js/tests/help.test.js                            */
import {shim,group,groupAsync,ok,eq,deep,summary} from "./harness.js";
shim();

/* الاستيرادُ يسجّل — والأدواتُ تُعلَن عند التحميل (كما في tools.js) */
await import("../tools/draw.js");
await import("../tools/sketch.js");
await import("../tools/openings.js");
await import("../tools/parts.js");
await import("../tools/areas.js");
await import("../tools/modify.js");
await import("../tools/annotate.js");
await import("../tools/ref.js");
await import("../tools/boq.js");
await import("../tools/elev.js");
await import("../tools/section.js");

const {cardById,cardByName,allCards,knowledgeEntries,ARTICLES}=
 await import("../ai/help/kb.js");
const {matchIntent,detectIntent,isConfident,rebuildIndex}=
 await import("../ai/help/intent.js");
const {buildAnswer,answerQuestion,suggestTopics}=
 await import("../ai/help/answer.js");
const {providerReady}=await import("../ai/help/provider.js");
const NET=await import("../ai/net.js");

group("kb / toolCard — على السجلّ الحقيقي",()=>{
 const wall=cardByName("جدار");
 ok(!!wall,"«جدار» يُحلّ عبر الاسم العربي (alias)");
 eq(wall.id,"wall","معرّف الجدار");
 ok(wall.steps.length>=1,"للجدار خطوةٌ واحدةٌ على الأقلّ");
 deep(wall.steps[0],{n:1,text:"نقطة البداية"},"نصّ الخطوة الأولى");

 const typeOpt=wall.opts.find(o=>o.key==="type");
 ok(!!typeOpt,"خيار «النوع» موجودٌ على الجدار");
 deep(typeOpt.choices,["داخلي","خارجي","سترة"],
  "خيارات النوع بالعربية من TY");

 const move=cardByName("move");
 ok(!!move,"cardByName يعمل بالمعرّف الإنجليزي أيضاً");
 ok(move.destructive,"«نقل» مُعلَمةٌ هادمة (destruct:1)");
 ok(move.text.includes("⚠"),"نصّ البطاقة يحمل علامة التحذير");

 const dim=cardById("dim");
 ok(!!dim,"cardById يجد «بُعد»");
 eq(dim.steps.length,3,"لبُعد ثلاث خطوات: طرف · طرف · موضع");

 ok(cardByName("غير موجود قطعاً")===null,"اسمٌ غير معروف يعيد null");
});

group("kb / knowledgeEntries و ARTICLES",()=>{
 const entries=knowledgeEntries();
 ok(entries.some(e=>e.kind==="tool"),"تحوي أدواتٍ من السجلّ");
 ok(entries.some(e=>e.kind==="article"),"وتحوي مقالاتٍ ثابتة");
 eq(entries.filter(e=>e.kind==="article").length,ARTICLES.length,
  "عدد المقالات في الفهرس يطابق ARTICLES");
 ok(allCards().length>=30,
  `عدد الأدوات المكتشَفة كبيرٌ كما في tools.js (${allCards().length})`);
});

group("intent / matchIntent — على السجلّ الحقيقي",()=>{
 rebuildIndex();
 eq(matchIntent("كيف أرسم جدار؟").best.id,"wall","سؤالٌ عن الجدار");
 eq(matchIntent("كيف أقيس مسافة؟").best.id,"dim","سؤالٌ عن القياس");
 eq(matchIntent("كيف أحذف عنصراً؟").best.id,"delete",
  "سؤالٌ عامٌّ عن الحذف يُفضِّل المقال الشارح على معرّف الأداة الخام");
 eq(detectIntent("كيف احذف عنصر"),"delete","اكتشاف نيّة الحذف");
 eq(detectIntent("سؤالٌ لا فعل فيه"),null,"لا نيّةَ فعلٍ فتُعاد null");
 ok(!isConfident(matchIntent("شيء غريب هنا تماماً")),
  "ثقةٌ منخفضة لسؤالٍ غامض");
 eq(matchIntent("جِدَار").best.id,matchIntent("جدار").best.id,
  "التطبيع يتجاهل التشكيل فتتساوى النتيجتان");
});

group("answer (محلي) — بلا شبكة",()=>{
 const a=buildAnswer("كيف أرسم جدار؟");
 eq(a.kind,"tool","إجابة أداة");
 deep(a.actions[0],{label:"ابدأ أداة «جدار»",type:"activateTool",toolId:"wall"},
  "زرّ تفعيلٍ يحمل معرّف الأداة الصحيح");
 ok(!a.warn,"لا تحذير لأداةٍ غير هادمة");

 const w=buildAnswer("كيف أنقل عنصر؟");
 ok(!!w.warn,"تحذيرٌ لأداةٍ هادمة (نقل)");

 const empty=buildAnswer("xyz قطقط لا معنى له");
 eq(empty.kind,"empty","لا فهمَ لسؤالٍ عشوائي");
 ok(empty.related.length>0,"تُقترَح مواضيعُ بديلة");

 ok(suggestTopics().length>=5,"suggestTopics تعرض ٥ مواضيع فأكثر");
});

await groupAsync("answer (المزوّد) — سلوكٌ حقيقي بلا محاكاة",async()=>{
 ok(!providerReady(),
  "المزوّد غير مُفعَّلٍ افتراضياً (AI.on=0) — كما في net.js");
 const confident=await answerQuestion("كيف أرسم جدار؟");
 eq(confident.kind,"tool","سؤالٌ واثقٌ يُجاب محلياً حتى مع مزوّدٍ مُطفأ");

 const vague=await answerQuestion("طقطق برطم زgrowl 999 هظظظ");
 eq(vague.kind,"empty",
  "سؤالٌ بلا أي تداخلٍ مع الكلمات المفتاحية يعود فارغاً حتى بلا مزوّد");
});

group("provider / helpSystem — لا يسرّب حالة المشروع",()=>{
 ok(!NET.ready(),"net.ready() تتّفق مع providerReady()");
});

group("net / PRESETS وmodelsUrl — قائمة سماح المزوّدين",()=>{
 /* PRESETS تُصدَّق شكلاً: كلّها معرَّفةٌ وموسومة، و«مخصّص»
    وحده بلا عنوان — فالعنوان بيد المستخدم */
 ok(NET.PRESETS.length>=6,"قائمة المزوّدين غير فارغة");
 ok(NET.PRESETS.every(p=>p.id&&p.label&&typeof p.url==="string"),
  "كل مزوّدٍ له id وlabel وurl (ولو فارغاً لـ«مخصّص»)");
 eq(new Set(NET.PRESETS.map(p=>p.id)).size,NET.PRESETS.length,
  "لا معرّف مزوّدٍ مكرّراً");
 ok(NET.PRESETS.some(p=>p.id==="gemini"&&
  /generativelanguage\.googleapis\.com\/v1beta\/openai\//
   .test(p.url)),"عنوان Gemini عبر نقطة OpenAI-المتوافقة");
 ok(NET.PRESETS.some(p=>p.id==="custom"&&!p.url),
  "«مخصّص» بلا عنوان مفروض");

 /* modelsUrl تشتقّ /models من عنوان النداء: يُنزَع
    «chat/completions» إن وُجد، وإلّا يُلحَق بالأساس */
 const was=NET.AI.url;
 try{ /* G9-5-09: الإعادة في finally فلا يتسرّب العنوان لو رمى تأكيدٌ */
  NET.AI.url="https://api.groq.com/openai/v1/chat/completions";
  eq(NET.modelsUrl(),"https://api.groq.com/openai/v1/models",
   "يُنزَع chat/completions ويُلحَق models");
  NET.AI.url="http://localhost:11434/v1";
  eq(NET.modelsUrl(),"http://localhost:11434/v1/models",
   "عنوان أساس بلا chat/completions يُلحَق به models مباشرة");
  NET.AI.url="https://x.test/v1/chat/completions/";
  eq(NET.modelsUrl(),"https://x.test/v1/models",
   "شرطةُ الذيل لا تكسر الاشتقاق");
 }finally{NET.AI.url=was}
});

process.exit(summary());
