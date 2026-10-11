/* ═══ اختباراتٌ حمراء للعيوب المعروفة ═══
   كل مجموعةٍ هنا تُثبت عيباً حقيقياً في الشفرة الحالية: فُحص أوّلاً
   بمسبارٍ منفصل ثم كُتب اختباره. **هي تفشل الآن عمداً.**

   لماذا ليست في السويت الأخضر؟ npm test يجب أن يبقى مقياساً للسلامة؛
   وخللٌ معروفٌ يُسقِطه بلا إصلاحٍ يعلّم الفريق تجاهل الأحمر. فالعيوب
   تعيش هنا، ويحرسها js/tests/redguard.test.js (في السويت الأخضر):
     • كل مجموعةٍ [Dnn] مسجَّلةٌ في KNOWN-DEFECTS.md (لا خللٌ بلا تذكرة)
     • كل تذكرةٍ لها مجموعةٌ هنا (لا تذكرةٌ بلا اختبار)
     • كل مجموعةٍ ما زالت حمراء — فإن اخضرّت (أُصلح العيب) يُسقِط
       الحارسُ البناء ويطلب نقلها إلى السويت الأخضر وحذفها من هنا.

   التشغيل:  npm run test:red     (يخرج بكودٍ غير صفريٍّ ما دام العيب) */
import {shim,shimCanvas,shimDOM,group,ok,eq,summary} from "../harness.js";
shim();
const {S,newState,ensureShape,edit,undo,redo,canUndo,snapshot}=
 await import("../../core/state.js");
const W=await import("../../core/walls.js");
const O=await import("../../core/opens.js");
const U=await import("../../core/underlay.js");
const PRJ=await import("../../io/project.js");
await import("../../tools/draw.js");           /* يسجّل أداة «wall» */
const R=await import("../../tools/registry.js");
const RUN=await import("../../ai/run.js");

const reset=()=>{newState(); ensureShape()};
const wall=(a,b)=>W.addWall(a,b,200,"int","c");

/* ═══ فارغٌ عمداً ═══ لا عيبَ مفتوحاً اليوم (KNOWN-DEFECTS.md بلا
   تذاكر Dnn)، فالملفُّ يخرج بصفرٍ و0/0. هذا ليس اختباراً وهمياً:
   redguard.test.js يفرض أنّ الخروجَ بصفرٍ يقابل قائمةً فارغة.
   عيبٌ جديد؟ أضِف مجموعةً [Dnn] هنا وسطرَها في KNOWN-DEFECTS.md. */
process.exit(summary()?1:0);
