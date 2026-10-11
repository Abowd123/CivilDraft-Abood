/* ═══ دفعة 4.4 — سياسة المخفي والمقفل: التعريف الملزم ═══
   node js/tests/phase4.4.test.js

   العقد (README): «المخفيّ لا يُرسَم ولا يُصدَّر، والمقفل يُرى
   ولا يُلمَس.» هذا الملفّ يثبّته حارساً عبر كل مسارٍ يمسّ عنصراً:

     vis()      → الرسم (render.js) · BOQ (boq.js) · التصدير
                  (style.js: dxf/svg/pdf/png) · الالتقاط (osnap.js)
     pickable() → التحديد (ents.js) · السحب (modify.js) · الحذف
                  (ents.js) · التعديل الجماعي (batch.js) · عمليات
                  الذكاء الاصطناعي (ai/ops.js)

   وحالةٌ حدّية موثَّقة صراحةً هنا لا في الكود: حذف جدارٍ غير مقفل
   يحذف فتحاته حتى لو كانت على طبقةٍ مقفلة (A-DOOR) — لأن الحاضن
   زال فلا معنى هندسياً لبقاء فتحةٍ بلا جدار؛ هذا امتدادٌ بنيويّ
   (cascade) لا مسارَ تعديلٍ يُختار، فلا يخالف «المقفل لا يُلمَس»
   التي تحكم الاختيار والسحب والحذف المباشر والدفعة والذكاء
   الاصطناعي — لا سلامةَ البيانات المرجعية. */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,edit}=await import("../core/state.js");
const {vis,locked,plots,pickable,setLay,toggleOff,toggleLock}
 =await import("../core/layers.js");
const W=await import("../core/walls.js");
const O=await import("../core/opens.js");
const ENTS=await import("../core/ents.js");
const MOD=await import("../core/modify.js");
const BATCH=await import("../core/batch.js");
const RENDER=await import("../core/render.js");
const BOQ=await import("../core/boq.js");
const OSNAP=await import("../core/osnap.js");
const STYLE=await import("../io/style.js");
const DXF=await import("../io/dxf.js");
const AIOPS=await import("../ai/ops.js");
const SI=await import("../core/sindex.js");

const reset=()=>{newState(); ensureShape()};
const wall=(a,b,type)=>W.addWall(a,b,200,type||"int","c");

/* ═══ 1 · الرسم: المخفيّ لا يُرسَم ═══ */
group("[4.4] vis(): الرسم يستبعد الطبقة المخفيّة",()=>{
 reset();
 const w=wall([0,0],[3000,0]);
 RENDER.invalidate();
 let sc=RENDER.scene();
 ok(sc.P.some(g=>g.L==="A-WALL"),
  "الجدار الظاهر موجودٌ في المشهد قبل الإخفاء");
 setLay("A-WALL","off",1);
 RENDER.invalidate();
 sc=RENDER.scene();
 ok(!sc.P.some(g=>g.L==="A-WALL"),
  "طبقة A-WALL بعد إخفائها غائبةٌ عن المشهد كلّياً");
 setLay("A-WALL","off",0);
});

/* ═══ 2 · الرسم: المقفل يُرى ═══ */
group("[4.4] vis()/locked(): المقفل يبقى في الرسم",()=>{
 reset();
 wall([0,0],[3000,0]);
 setLay("A-WALL","lk",1);
 RENDER.invalidate();
 const sc=RENDER.scene();
 ok(sc.P.some(g=>g.L==="A-WALL"),
  "الجدار المقفل (لا المخفيّ) يبقى مرئياً في المشهد");
 ok(locked("A-WALL")&&vis("A-WALL"),
  "الطبقة مقفلة ومرئية معاً — لا تناقض بين الحالتين");
 setLay("A-WALL","lk",0);
});

/* ═══ 3 · BOQ: نفس معيار vis&&plots ═══ */
group("[4.4] BOQ: يستبعد المخفيّ ويُبقي المقفل",()=>{
 reset();
 wall([0,0],[3000,0]);
 let R=BOQ.wallRows();
 eq(R.n,1,"جدارٌ واحدٌ يدخل الجدول قبل أي تعديل طبقة");
 setLay("A-WALL","off",1);
 R=BOQ.wallRows();
 eq(R.n,0,"الجدار المخفيّ خارج جدول الكميات كلّياً");
 eq(R.hidden,1,"وعددُه يُذكَر صراحةً في hidden — لا اختفاءَ صامت");
 setLay("A-WALL","off",0);
 setLay("A-WALL","lk",1);
 R=BOQ.wallRows();
 eq(R.n,1,"الجدار المقفل يبقى داخل الجدول — القفل لا يستبعد");
 setLay("A-WALL","lk",0);
});

/* ═══ 4أ · التصدير — الخط الأول: vis() يُطبَّق في المنبع الوحيد
   (render.js: filterPrims → scene().P) الذي يقرأ منه export.js
   لكل الصيغ الأربع (dxf مباشرةً وsvg/pdf/png عبر القماش) — فمخفيٌّ
   لا يصل مصدِّراً واحداً لأنه لا يصل قائمة الأوّليات أصلاً ═══ */
group("[4.4] التصدير: vis() يُطبَّق في منبعٍ واحد قبل كل مصدِّر",()=>{
 reset();
 wall([0,0],[3000,0]);
 setLay("A-WALL","off",1);
 RENDER.invalidate();
 const P=RENDER.scene().P;
 ok(!P.some(g=>g.L==="A-WALL"),
  "المخفيّ غائبٌ عن P قبل أن يصل toDXF/toSVG/toPDF/toPNG — "
  +"فلا مصدِّرٌ يحتاج فحصَه بنفسه");
 const txt=DXF.toDXF(P,{x0:0,y0:0,x1:1000,y1:1000},{notes:[]});
 ok(!txt.includes("A-WALL"),
  "ملفّ DXF الناتج لا يحمل ذكراً لطبقة A-WALL المخفيّة");
 setLay("A-WALL","off",0);
});

/* ═══ 4ب · التصدير — الخط الثاني: styleOf/hatchOf/fillOf (style.js)
   يطبّقن plots() على كل أوّليةٍ تصل إليهنّ من الصيغ الأربع، ولا
   تفرّقن حسب القفل — فالمقفل يخرج كأيّ ظاهرة ═══ */
group("[4.4] styleOf: plots() تحكم الإخراج، والقفل لا يستبعد",()=>{
 const g={t:"line",L:"A-WALL",a:[0,0],b:[1000,0]};
 ["dxf","svg","pdf","png"].forEach(fmt=>
  ok(!STYLE.styleOf(g,fmt,{}).skip,
   `${fmt}: طبقةٌ ظاهرة قابلة للطباعة لا تُسقَط`));
 setLay("A-WALL","plot",0);
 ["dxf","svg","pdf","png"].forEach(fmt=>
  ok(STYLE.styleOf(g,fmt,{}).skip,
   `${fmt}: طبقةٌ لا تُطبَع تُسقَط في الصيغ الأربع`));
 setLay("A-WALL","plot",1);
 setLay("A-WALL","lk",1);
 ["dxf","svg","pdf","png"].forEach(fmt=>
  ok(!STYLE.styleOf(g,fmt,{}).skip,
   `${fmt}: الطبقة المقفلة (لا المخفيّة) تُصدَّر كأيّ ظاهرة`));
 setLay("A-WALL","lk",0);
});

/* ═══ 5 · الالتقاط (osnap): لا يلتقط نقاط الطبقة المخفيّة ═══ */
group("[4.4] osnap(): يستثني هندسة الطبقة المخفيّة",()=>{
 reset();
 wall([0,0],[3000,0]);
 SI.invalidate();
 let r=OSNAP.osnap(0,0,50);
 ok(r&&r.m==="end","نهاية الجدار الظاهر تُلتقَط عند تفعيل end");
 setLay("A-WALL","off",1);
 SI.invalidate();
 r=OSNAP.osnap(0,0,50);
 ok(!r,"بعد إخفاء A-WALL لا يُلتقَط شيءٌ عند نفس النقطة");
 setLay("A-WALL","off",0);
});
group("[4.4] osnap(): يلتقط هندسة الطبقة المقفلة",()=>{
 reset();
 wall([0,0],[3000,0]);
 setLay("A-WALL","lk",1);
 SI.invalidate();
 const r=OSNAP.osnap(0,0,50);
 ok(r&&r.m==="end","المقفل يُرى فيُلتقَط — القفل لا يمنع القراءة");
 setLay("A-WALL","lk",0);
});

/* ═══ 6 · التحديد: pickInRect/pickEnts يتخطّيان المخفيّ والمقفل ═══ */
group("[4.4] pickable(): التحديد يستثني المخفيّ والمقفل",()=>{
 reset();
 const w=wall([0,0],[3000,0]);
 const sel0=ENTS.pickInRect({x0:-100,y0:-100,x1:3100,y1:100});
 ok(sel0.some(s=>s.k==="wall"&&s.id===w.id),
  "الجدار الظاهر غير المقفل يدخل التحديد بالمستطيل");
 setLay("A-WALL","off",1);
 const sel1=ENTS.pickInRect({x0:-100,y0:-100,x1:3100,y1:100});
 ok(!sel1.some(s=>s.k==="wall"&&s.id===w.id),
  "المخفيّ لا يدخل التحديد بالمستطيل");
 setLay("A-WALL","off",0);
 setLay("A-WALL","lk",1);
 const sel2=ENTS.pickInRect({x0:-100,y0:-100,x1:3100,y1:100});
 ok(!sel2.some(s=>s.k==="wall"&&s.id===w.id),
  "المقفل لا يدخل التحديد بالمستطيل — يُرى ولا يُلمَس");
 ok(!ENTS.pickEnts().some(s=>s.k==="wall"&&s.id===w.id),
  "ولا يظهر في pickEnts (تحديد الكلّ)");
 setLay("A-WALL","lk",0);
});

/* ═══ 7 · السحب: grab() يتخطّى المقفل ═══ */
group("[4.4] modify.grab(): يرفض عنصراً على طبقةٍ مقفلة",()=>{
 reset();
 const w=wall([0,0],[3000,0]);
 const s={k:"wall",id:w.id};
 let G=MOD.grab([s]);
 eq(G.length,1,"الجدار غير المقفل يُلقَط للسحب");
 setLay("A-WALL","lk",1);
 G=MOD.grab([s]);
 eq(G.length,0,"الجدار المقفل لا يُلقَط للسحب — لا معاملة عليه");
 setLay("A-WALL","lk",0);
});

/* ═══ 8 · الحذف: delEnts يرفض المقفل والمخفيّ صراحةً ويُحصي المتخطّى ═══ */
group("[4.4] delEnts(): يرفض حذف عنصرٍ مقفل أو مخفيّ",()=>{
 reset();
 const w=wall([0,0],[3000,0]);
 setLay("A-WALL","lk",1);
 let r=ENTS.delEnts([{k:"wall",id:w.id}]);
 eq(S.walls.length,1,"الجدار المقفل لم يُحذَف");
 eq(r.skipped,1,"وعددُ المتخطّى (skipped) يُبلَّغ لا يُسكَت عنه");
 setLay("A-WALL","lk",0);
 setLay("A-WALL","off",1);
 r=ENTS.delEnts([{k:"wall",id:w.id}]);
 eq(S.walls.length,1,"الجدار المخفيّ أيضاً لا يُحذَف عبر هذا المسار");
 eq(r.skipped,1,"ويُحصى متخطّىً كذلك");
 setLay("A-WALL","off",0);
 r=ENTS.delEnts([{k:"wall",id:w.id}]);
 eq(S.walls.length,0,"وبعد فكّ القفل والإظهار يُحذَف كالمعتاد");
});

/* ═══ 9 · التعديل الجماعي (batch.js): يستثني المقفل والمخفيّ ═══ */
group("[4.4] batch: groupSel/applyField يستثنيان غير القابل للّمس",()=>{
 reset();
 const w=wall([0,0],[3000,0]);
 const s={k:"wall",id:w.id};
 let G=BATCH.groupSel([s]);
 eq((G.wall||[]).length,1,"الجدار الظاهر غير المقفل يدخل التجميع");
 setLay("A-WALL","lk",1);
 G=BATCH.groupSel([s]);
 eq((G.wall||[]).length,0,"المقفل خارج التجميع (خارج اللوحة الجماعية)");
 /* الحقل len بوحدة الإدخال (م): 0.25 م = 250مم */
 const r=BATCH.applyField("wall",[s],"t","0.25");
 eq(r.done,0,"وapplyField لا يكتب على المقفل");
 eq(r.skipped,1,"بل يُدرجه في skipped صراحةً");
 eq(S.walls.find(x=>x.id===w.id).t,200,"السماكة لم تتغيّر فعلياً");
 setLay("A-WALL","lk",0);
 const r2=BATCH.applyField("wall",[s],"t","0.25");
 eq(r2.done,1,"وبعد فكّ القفل يُكتَب الحقل بنجاح");
 eq(S.walls.find(x=>x.id===w.id).t,250,"والسماكة تغيّرت فعلياً الآن");
});

/* ═══ 10 · عمليات الذكاء الاصطناعي: ترفض المقفل والمخفيّ بالاسم ═══ */
group("[4.4] ai/ops.applyOps: ترفض فتحاً على جدارٍ مقفل، وحقلاً على مقفل",()=>{
 reset();
 const w=wall([0,0],[3000,0]);
 /* at/w بوحدة الإدخال (م): 1.5 م موضعاً · 0.9 م عرضاً — Mx تعامل
    الرقم الخام معاملة المتر، فـ900 كانت لتعني ٩٠٠ متر لا ٩٠٠مم */
 setLay("A-WALL","lk",1);
 let res=AIOPS.applyOps([
  {op:"open",wall:w.id,kind:"door",at:1.5,w:0.9}]);
 eq(res.done,0,"لا فتحة تُضاف على جدارٍ مقفل عبر الذكاء الاصطناعي");
 ok(res.refused.some(m=>/مخفيّ|مقفل/.test(m)),
  "ورسالة الرفض تسمّي السبب (مخفيّ أو مقفل) لا تصمت");
 setLay("A-WALL","lk",0);
 res=AIOPS.applyOps([
  {op:"open",wall:w.id,kind:"door",at:1.5,w:0.9}]);
 eq(res.done,1,"وبعد فكّ القفل تُقبَل نفس العملية");
 const openId=res.made[0].id;
 setLay("A-DOOR","lk",1);
 res=AIOPS.applyOps([
  {op:"field",kind:"open",ids:[openId],field:"w",value:1000}]);
 eq(res.done,0,"تعديل حقل فتحةٍ على طبقةٍ مقفلة (A-DOOR) يُرفَض");
 ok(res.refused.some(m=>m.includes(openId)),
  "الرفض يسمّي معرّف العنصر المقفل");
 setLay("A-DOOR","lk",0);
});

/* ═══ G9-7-05: سياسة القفل عند الإنشاء عبر ai/ops ═══
   المقفل يحمي الموجود (تعديل حقل، فتحة على جدارٍ مقفل — مرفوضان أعلاه)،
   ولا يمنع إنشاء عنصرٍ جديد على طبقته (كما في CAD). موثَّق هنا حتى لا يتغيّر
   بالمصادفة. */
group("[4.4] ai/ops: الإنشاء على طبقةٍ مقفلة مسموحٌ — القفل للموجود",()=>{
 reset();
 setLay("A-WALL","lk",1);
 let res=AIOPS.applyOps([{op:"wall",a:[0,0],b:[3,0]}]);
 eq(res.done,1,"جدارٌ جديد على A-WALL المقفلة يُنشأ (لا مساس بموجود)");
 setLay("A-WALL","lk",0);
 setLay("A-ANNO","lk",1);
 res=AIOPS.applyOps([{op:"text",at:[1,1],s:"x"}]);
 eq(res.done,1,"نصٌّ جديد على A-ANNO المقفلة يُنشأ");
 setLay("A-ANNO","lk",0);
});

/* ═══ 11 · حالة حدّية موثَّقة: حذف الجدار يسحب فتحته المقفلة معه ═══
   هذا امتدادٌ بنيويّ (الفتحة تُعرَّف بموضعٍ على جدارها، فلا معنى
   لبقائها بلا حاضن) لا مسارَ اختيارٍ أو سحبٍ أو حذفٍ مباشر يُختار
   على الفتحة نفسها — فلا يخالف العقد الذي يحكم تلك المسارات. */
group("[4.4] حالةٌ حدّية موثَّقة: cascade حذف الجدار يطال فتحته المقفلة",()=>{
 reset();
 const w=wall([0,0],[3000,0]);
 const o=O.addOpen(w,1000,"door",900,2100,0);
 setLay("A-DOOR","lk",1);
 ok(!pickable({k:"open",id:o.id}),
  "الفتحة نفسها غير قابلةٍ للّمس مباشرةً وهي مقفلة (كما يُتوقَّع)");
 const r=ENTS.delEnts([{k:"wall",id:w.id}]);
 eq(S.walls.length,0,"حذف الجدار غير المقفل يُنفَّذ");
 eq(S.opens.length,0,
  "وفتحته تُسحَب معه رغم قفل طبقتها — الحاضن زال فلا بقاء لها");
 eq((r.opens||0),1,"والعدد يُبلَّغ صراحةً في تقرير الحذف (لا صمت)");
 setLay("A-DOOR","lk",0);
});

/* ═══ 12 · الطبقة المجهولة (كيانٌ فقد طبقته) تُرى ولا تُقفَل ═══
   سياسةٌ موثَّقة في layers.js: ما لا يُعرَف لا يُخفى صامتاً. */
group("[4.4] طبقةٌ مجهولة: تُرى دائماً ولا تُقفَل أبداً",()=>{
 reset();
 ok(vis("NO-SUCH-LAYER"),"طبقةٌ غير موجودة تُعَدّ ظاهرة");
 ok(!locked("NO-SUCH-LAYER"),"ولا تُعَدّ مقفلة أبداً");
 ok(pickable({k:"wall",id:"W999"}),
  "وكيانٌ بلا تعريفٍ معروف (pickable الافتراضي) لا يُحجَب ظلماً");
});

process.exit(summary()?1:0);
