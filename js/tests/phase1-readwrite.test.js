/* ═══ المرحلة 1.1 — فصل القراءة عن الكتابة ═══
   عقدٌ من جزأين، يفرضهما كلاهما:

   أ) حارسٌ ساكن: ملفّات القراءة (الفاحص · lint · جداول BOQ · التسعير ·
      حالة الفتحات) لا تستدعي touch/touchGeom/touchOpen/touchView أو
      pushHistory أو autosave أو edit — لو استدعت أحدها لدخلت الكتابةُ
      من طريقٍ خلفيّ لا يمرّ بـ edit()، فتُنتج touch() «عشوائياً» داخل
      مسارٍ يُفترَض أنه قراءةٌ محضة. الفحص نصّيّ (كـredguard.test.js)
      لا وقتيّ: يمنع الانحدار حتى لو صادف السيناريو الحالي حالةً لا
      تُسقِط الفارق وقت التشغيل.

   ب) حارسٌ وقتيّ: استدعاء كل دالّة قراءةٍ فعلياً على حالةٍ مليئة، ثم
      التأكّد أن VER (n·g·o) والتاريخ (canUndo/canRedo) ولقطة الحالة
      نفسها لم تتحرّك قيد أنملة. هذا يضبط السلوك الفعليّ وقت التشغيل،
      لا الشفرة المصدرية وحدها — فدالّةٌ تُغيّر S مباشرةً بلا touch()
      صريح (تسرّبٌ آخر) تُكشَف هنا أيضاً لأن snapshot() يقارن كل شيء. */
import {readFileSync} from "node:fs";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {shim,group,ok,eq,summary} from "./harness.js";
shim();

const HERE=dirname(fileURLToPath(import.meta.url));
const CORE=join(HERE,"..","core");
const AI=join(HERE,"..","ai");

/* ═══ أ) الحارس الساكن ═══
   قائمة ملفّات القراءة المحضة: لا تُعدِّل S ولا تدفع خطوة تاريخ.
   ملفّاتٌ أخرى (walls.js·opens.js·modify.js…) تخلط قراءةً وكتابةً
   عمداً (addWall بجانب wallLen) فلا تدخل هذه القائمة — فصلها كتلةً
   كاملةً مهمّةٌ أكبر من 1.1 (خطوات 1.2 وما بعدها). هذه القائمة تضمن
   الملفّات التي *يُفترَض* أنها قراءةٌ محضة بالاسم والغرض. */
const READ_ONLY_FILES=[
 [CORE,"inspect.js"],     /* الفاحص — رأسه يقول صراحةً «لا يصلح شيئاً» */
 [AI,"lint.js"],          /* نفس دور الفاحص، واجهةٌ نصّية */
 [CORE,"boq.js"],         /* جداول الكمّيّات — قراءةٌ واشتقاق */
 [CORE,"pricing.js"],     /* التسعير: price/getRate — قراءةٌ حسابية.
                              setRate/setCurrency تُعدِّلان تهيئة الأسعار
                              لا مشروعاً (لا S)، فخارج نطاق edit() أصلاً؛
                              الحارس أدناه يستثنيها بالاسم صراحةً. */
];
const FORBIDDEN=/\b(touch|touchGeom|touchOpen|touchView|pushHistory|autosave|edit)\s*\(/;
/* أسطرٌ مستثناة بالاسم: توثيقٌ يذكر الكلمات (كهذا التعليق) لا نداء
   فعليّ. نفحص الشفرة بعد نزع التعليقات السطرية والكتلية بتبسيطٍ كافٍ
   لهذه الملفّات (لا تحتوي عناوين URL ولا نصوصاً بها //). */
function stripComments(src){
 return src
  .replace(/\/\*[\s\S]*?\*\//g,"")
  .replace(/(^|[^:])\/\/.*$/gm,"$1");
}

group("[أ] ملفّات القراءة المحضة لا تستدعي دوالّ الكتابة",()=>{
 READ_ONLY_FILES.forEach(([dir,name])=>{
  const path=join(dir,name);
  const src=stripComments(readFileSync(path,"utf8"));
  const hit=FORBIDDEN.exec(src);
  ok(!hit,`${name} خالٍ من نداءات الكتابة`+
   (hit?` — وُجد «${hit[0]}»`:""));
 });
});

/* ═══ ب) الحارس الوقتيّ ═══ */
const {S,VER,newState,ensureShape,edit,canUndo,canRedo,snapshot}=
 await import("../core/state.js");
const W=await import("../core/walls.js");
const O=await import("../core/opens.js");
const INSPECT=await import("../core/inspect.js");
const LINT=await import("../ai/lint.js");
const BOQ=await import("../core/boq.js");
const PRICING=await import("../core/pricing.js");

function reset(){
 newState(); ensureShape();
 edit(()=>{
  const w=W.addWall([0,0],[4000,0],200,"int","c");
  O.addOpen(w.id,1500,"door",900,2100,0);
 },"تجهيز");
}

function readGuard(label,fn){
 reset();
 const v0={n:VER.n,g:VER.g,o:VER.o};
 const u0=canUndo(), r0=canRedo();
 const before=snapshot();
 fn();
 eq(VER.n,v0.n,`${label}: VER.n لم يتحرّك`);
 eq(VER.g,v0.g,`${label}: VER.g لم يتحرّك`);
 eq(VER.o,v0.o,`${label}: VER.o لم يتحرّك`);
 eq(canUndo(),u0,`${label}: canUndo() لم يتغيّر`);
 eq(canRedo(),r0,`${label}: canRedo() لم يتغيّر`);
 ok(snapshot()===before,`${label}: لقطة الحالة مطابقةٌ حرفاً بعد الاستدعاء`);
}

group("[ب] استدعاء دوالّ القراءة الفعليّ لا يحرّك VER أو التاريخ",()=>{
 readGuard("inspect()",()=>{INSPECT.inspect()});
 readGuard("lint()",()=>{LINT.lint()});
 readGuard("boq()",()=>{BOQ.boq()});
 readGuard("openSchedule()",()=>{O.openSchedule()});
 readGuard("badOpens()+openState()",()=>{
  O.badOpens().forEach(o=>O.openState(o));
  S.opens.forEach(o=>O.openState(o));
 });
 readGuard("pricing: getRate/allRates/price",()=>{
  PRICING.allRates();
  PRICING.getRate("wall.int");
  PRICING.price([]);
 });
});

process.exit(summary()?1:0);
