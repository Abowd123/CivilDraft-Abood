/* ═══ ميزانية الأداء ═══ P4-006
   كان المحروسُ شيئين: نموٌّ خطّيٌّ، وسقفٌ مطلقٌ *يُحذِّر في console
   ولا يُفشِل*. فلا حارسَ أداءٍ فعليّاً: انحدارٌ يضاعف زمنَ بناء
   المشهد يمرّ من البناء كأنّ شيئاً لم يكن.

   الآن ثلاثةٌ، وكلُّها تُفشِل:
   ١) ميزانيةٌ مرتبطةٌ بحجم المشروع (1k و10k كياناً) — ثابتٌ + كلفةٌ
      لكل ألف، مضروبةً بمعامل الآلة المُعاير (انظر core/perf.js).
   ٢) النموُّ خطّيّ: أربعةُ أمثالِ الجدران لا تُكلِّف أكثرَ من ثمانيةِ
      أمثالِ الزمن (الانهيار التربيعيّ = ١٦×).
   ٣) الحارسُ نفسُه يَعُضّ: زمنٌ مُفتعَلٌ فوق السقف يُرفَض — فلو صار
      الفحصُ لا-عملياً لانكشف هنا.

   ولم يُعَد تصميمُ render: الأرقامُ الفعلية مسجَّلةٌ في
   KNOWN-DEFECTS.md كما قيست، وهذه حراسةُ انحدارٍ لا وعدُ تجربة.
   التشغيل:  node js/tests/perf.budget.test.js                      */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();

const {newState,ensureShape,touchGeom}=await import("../core/state.js");
const RN=await import("../core/render.js");
const PF=await import("../core/perf.js");
const W=await import("../core/walls.js");

/* جدرانٌ متباعدة: لا التقاء ولا اتحاد — تكلفةُ البناء وحدها */
function build(n){
 newState(); ensureShape(); RN.invalidate();
 PF.perfOn(1);
 for(let i=0;i<n;i++)
  W.addWall([i*1000,0],[i*1000+400,0],200,"int","c");
 touchGeom();
 const t0=performance.now();
 RN.scene();
 return performance.now()-t0;
}
const warn=console.warn; console.warn=()=>{};   /* تحذير >16مس متوقَّع هنا */

group("P4-006 · الحارسُ يَعُضّ — الميزانيةُ ليست تحذيراً",()=>{
 ok(PF.SCENE_BUDGET.base>0&&PF.SCENE_BUDGET.perK>0,
  "الميزانيةُ معلنةٌ: ثابتٌ وكلفةٌ لكل ألف");
 ok(Object.isFrozen(PF.SCENE_BUDGET),"ومجمَّدةٌ فلا تُرخى بالخطأ");
 /* الميزانيةُ تنمو بالحجم ولا تتجاوز سقفها */
 const b1=PF.sceneBudget(1000,1), b10=PF.sceneBudget(10000,1);
 ok(b10>b1,`ميزانيةُ 10k (${b10.toFixed(0)}مس) أكبرُ من 1k (${b1.toFixed(0)}مس)`);
 eq(PF.sceneBudget(1e9,1),PF.SCENE_BUDGET.max,"وسقفٌ أعلى لا يُخترَق");
 /* ومعاملُ الآلة لا يُضيّق الميزانيةَ أبداً */
 ok(PF.machineFactor()>=1,"معاملُ الآلة ≥ 1 — الأسرعُ لا تُوسَّع له");
 /* والمعايرةُ نفسُها تقيس شيئاً: زمنٌ موجبٌ ومنتهٍ، وثباتٌ معقول */
 const c1=PF.calibrate(), c2=PF.calibrate();
 ok(c1>0&&isFinite(c1),`المعايرةُ تعيد زمناً موجباً (${c1.toFixed(1)}مس)`);
 ok(c2<c1*6+6,"وتتكرّر بثباتٍ معقول — فليست ضجيجاً");
 ok(PF.machineFactor(1)>=1,"وإعادةُ المعايرة قسراً تعمل");
 /* والحارسُ يرفض فعلاً */
 ok(!PF.withinSceneBudget(1000,1e7,1).ok,"زمنٌ هائلٌ يُرفَض");
 ok(PF.withinSceneBudget(1000,1,1).ok,"وزمنٌ صغيرٌ يُقبَل");
 const r=PF.withinSceneBudget(1000,1e7,1);
 eq(r.n,1000,"والتفصيلُ يذكر الحجم");
 ok(r.limit>0,"والسقف");
 ok(r.ms===1e7,"والمقيس");
});

group("P4-006 · بناءُ المشهد داخل ميزانيته عند 1k و10k",()=>{
 const k=PF.machineFactor();
 build(200);                              /* تسخين */
 PF.perfOn(0);
 const t1k=build(1000);
 PF.perfOn(0);
 const r1=PF.withinSceneBudget(1000,t1k,k);
 ok(r1.ok,`1k كياناً: ${t1k.toFixed(0)}مس ≤ ${r1.limit.toFixed(0)}مس `
  +`(معامل الآلة ${k.toFixed(2)})`);
 const t10k=build(10000);
 PF.perfOn(0);
 const r10=PF.withinSceneBudget(10000,t10k,k);
 ok(r10.ok,`10k كياناً: ${t10k.toFixed(0)}مس ≤ ${r10.limit.toFixed(0)}مس `
  +`(معامل الآلة ${k.toFixed(2)})`);
 /* النموُّ ما زال خطّياً: عشرةُ أمثالٍ لا أكثرَ من أربعين */
 ok(t10k<40*Math.max(t1k,10),
  `نموٌّ خطّيّ: 1k→10k ${t1k.toFixed(0)}→${t10k.toFixed(0)}مس `
  +`(${(t10k/Math.max(t1k,1)).toFixed(1)}× لعشرة أمثال)`);
});

group("P4-006 · عدّاداتُ القياس كما كانت",()=>{
 const t1=build(500);
 const mid=PF.P.scene_ms;
 PF.perfOn(0);
 const t2=build(2000);
 ok(t2<8*Math.max(t1,10),
  `نموٌّ خطّيّ: 500→2000 جدار ${t1.toFixed(0)}→${t2.toFixed(0)}مس `
  +`(${(t2/Math.max(t1,1)).toFixed(1)}× لأربعة أمثال)`);
 ok(PF.P.scene_ms>0,"والمقياس يسجّل زمن المشهد");
 ok(mid>0,"وفي كل تشغيل");
 ok(PF.BUDGET.scene>0,"وللمشهد ميزانيةٌ معلنة");
 ok(PF.bumpMs("scene",0)===true,"وزمنٌ صفريّ لا يتجاوز الميزانية");
 ok(PF.bumpMs("scene",1e6)===false,"وزمنٌ هائل يتجاوزها ويُعدّ");
 PF.perfOn(0);
});
console.warn=warn;
process.exit(summary()?1:0);
