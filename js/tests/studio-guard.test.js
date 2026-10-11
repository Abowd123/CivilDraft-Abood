/* ═══ الاستوديو لا يمسح مشروع المستخدم بلا رجعة ═══
   كلُّ درسٍ يبدأ بمشروعٍ فارغ أو قالب، فكان «شغّل الدرس» يمسح ما على
   اللوحة بلا سؤالٍ ولا لقطة. الآن: لقطةٌ قبل الدرس وزرُّ «أرجع مشروعي»،
   وسطحُ العمل يعود بعد درسٍ يبدّله.
   التشغيل:  node js/tests/studio-guard.test.js                      */
import {shim,shimCanvas,shimDOM,group,ok,eq,summary} from "./harness.js";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const E=await import("../tutor/engine.js");
const L=await import("../tutor/lessons.js");
group("أيُّ درسٍ يمسح المشروع وأيُّه يبدّل سطح العمل",()=>{
 ok(L.SERIES.every(E.lessonWipes),"كلُّ دروس السلسلة تبدأ بمشروعٍ فارغ أو قالب");
 ok(!E.lessonWipes({steps:[{a:[{tool:"wall"},{ui:"projDlg"}]}]}),"ودرسٌ بلا fresh/tpl لا يمسح");
 eq(L.SERIES.filter(E.lessonMovesUI).map(x=>x.id).join(","),"l12","درسُ أسطح العمل وحده يبدّل السطح");
 ok(!E.lessonWipes(null)&&!E.lessonMovesUI({}),"والمدخلُ الناقص لا يكسر");
});
const src=readFileSync(HERE+"../ui/studio.js","utf8");
const body=n=>{const i=src.indexOf(n); return i<0?"":src.slice(i,src.indexOf("\n}\n",i))};
group("التشغيلُ يحفظ قبل أن يمسح",()=>{
 const p=body("async function play(");
 ok(p.indexOf("guard()")>0&&p.indexOf("guard()")<p.indexOf("runLesson("),"«شغّل الدرس»: اللقطةُ قبل الدرس");
 ok(p.indexOf("guard()")<p.indexOf("recStart()"),"وقبل نافذة التسجيل");
 ok(p.includes("restoreWs()"),"وسطحُ العمل يعود بعده");
 const s=body("async function stepOnce(");
 ok(s.indexOf("guard()")>0&&s.indexOf("guard()")<s.indexOf("runStep("),"«خطوة واحدة»: اللقطةُ قبل الخطوة الأولى");
 const g=body("async function guard(");
 ok(g.includes("snapTake(")&&g.includes("confirm("),"لقطة، وإن تعذّرت يُسأل المستخدم");
 ok(/data-s="back"/.test(src)&&body("async function backHome(").includes("snapRestore("),"وزرُّ «أرجع مشروعي» يستعيد اللقطة");
});
process.exit(summary()?1:0);
