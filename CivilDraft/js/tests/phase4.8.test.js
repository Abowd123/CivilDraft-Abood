/* ═══ دفعة 4.8 — اختبار تغييرات الطبقات ═══
   node js/tests/phase4.8.test.js

   البند الثامن من خطة المرحلة 4: إخفاء/إظهار طبقة باب · قفل/فتح
   طبقة جدار · تغيير نوع فتحة (شباك←→باب) · تغيير نوع جدار إلى
   سترة · تراجع/إعادة بعد كل تغيير · مقارنة نتيجة الفهرس (pickable/
   vis وBOQ ومشهد الرسم والفاحص) بحسابٍ خطّيٍّ مرجعيّ.

   والفارق عن 4.7: هناك كانت الفهارس تتبع تعديلاً "ثابت الطبقة"
   (إضافة/حذف/نقل). هنا الطبقة نفسها متحرّكة — طبقة الفتحة مُشتقّةٌ
   من kind (`lay:o=>okOf(o.kind).lay` في entreg.js) وطبقة الجدار من
   type (`lay:w=>isLow(w)?"A-WALL-LOW":"A-WALL"`) — فتبديل الحقل عبر
   applyOne ينقل الكيان بين طبقتين دون أي كتابةٍ صريحة لحقل "طبقة"،
   ودون أي نداء invalidate من الاختبار: إن نسي مسارٌ إبطال كاش
   pickable أو تجميع BOQ أو مشهد الرسم عند هذا الانتقال الضمنيّ،
   يظهر ذلك هنا تفاوتاً مع المسح الخطّي أو مع تجميعٍ طازج. */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,undo,redo,edit}
 =await import("../core/state.js");
const {vis,locked,pickable,entVis,setLay,layOfEnt}
 =await import("../core/layers.js");
const W=await import("../core/walls.js");
const O=await import("../core/opens.js");
const {applyOne}=await import("../core/batch.js");
const RENDER=await import("../core/render.js");
const BOQ=await import("../core/boq.js");
const INSPECT=await import("../core/inspect.js");
const {delEnts}=await import("../core/ents.js");

const reset=()=>{newState(); ensureShape()};
const wall=(a,b,type)=>W.addWall(a,b,200,type||"int","c");

/* ═══ 1 · إخفاء طبقة الأبواب (A-DOOR) وإظهارها: تُستبعَد الفتحةُ
   من المشهد وBOQ والفاحص فوراً، ودون أن تمسّ فتحةً على A-GLAZ ═══ */
group("[4.8] إخفاء/إظهار A-DOOR: يستبعد الباب وحده من كل تقرير",()=>{
 reset();
 const w=wall([0,0],[6000,0]);
 const door=O.addOpen(w,1500,"door",900,2100,0);
 const win=O.addOpen(w,4500,"window",1200,1200,900);
 ok(vis("A-DOOR")&&vis("A-GLAZ"),"الطبقتان ظاهرتان ابتداءً");
 let sc=RENDER.scene();
 ok(sc.P.some(p=>p.oid===door.id),"الباب يدخل المشهد قبل الإخفاء");
 ok(sc.P.some(p=>p.oid===win.id),"والشباك كذلك");
 let rows=BOQ.openRows();
 eq(rows.total,2,"BOQ يعدّ الفتحتين معاً قبل الإخفاء");
 setLay("A-DOOR","off",1);
 ok(!entVis({k:"open",id:door.id}),"entVis تعكس إخفاء الباب فوراً");
 ok(entVis({k:"open",id:win.id}),"ولا تمسّ الشباك على A-GLAZ");
 sc=RENDER.scene();
 ok(!sc.P.some(p=>p.oid===door.id),"المشهد التالي يستبعد الباب بلا نداءٍ يدويّ");
 ok(sc.P.some(p=>p.oid===win.id),"ويُبقي الشباك كما هو");
 rows=BOQ.openRows();
 eq(rows.total,1,"BOQ يستبعد الباب المخفيّ من العدّ الكلّي");
 eq(rows.hidden,1,"ويُبلِغ عدد المخفيّ صراحةً بدل أن يُسقطه بصمت");
 ok(rows.rows.every(r=>r.kind!=="door"),"صفّ الأبواب يختفي من الجدول");
 setLay("A-DOOR","off",0);
 ok(entVis({k:"open",id:door.id}),"وبعد الإظهار: الباب يعود ظاهراً");
 rows=BOQ.openRows();
 eq(rows.total,2,"وBOQ يعود لعدّ الفتحتين معاً");
});

/* ═══ 2 · قفل/فتح طبقة الجدران (A-WALL): يمنع التعديل والالتقاط لا
   الرسم ولا التقرير — يطابق عقد README حرفياً على كيانٍ حيّ ═══ */
group("[4.8] قفل/فتح A-WALL: يمنع اللمس لا الرسم ولا BOQ ولا الفاحص",()=>{
 reset();
 const w1=wall([0,0],[3000,0]);
 /* طرفٌ سائبٌ متعمَّد (لا يلامس شيئاً) ليكون للفاحص ما يبلّغه */
 const s={k:"wall",id:w1.id};
 ok(pickable(s)&&!locked("A-WALL"),"قابلٌ للّمس وغير مقفلة ابتداءً");
 let f=INSPECT.inspect().list;
 ok(f.some(x=>x.k==="wall"&&x.id===w1.id),
  "الفاحص يبلّغ عن طرف الجدار السائب قبل القفل");
 let rows=BOQ.wallRows();
 ok(rows.n>0,"BOQ يعدّ الجدار قبل القفل");
 setLay("A-WALL","lk",1);
 ok(locked("A-WALL")&&vis("A-WALL"),"مقفلةٌ والآن — لكنها تبقى ظاهرة");
 ok(!pickable(s),"الجدار لم يعد قابلاً للّمس بعد القفل");
 f=INSPECT.inspect().list;
 ok(f.some(x=>x.k==="wall"&&x.id===w1.id),
  "لكن الفاحص يبلّغ عنه كما كان — المقفل يُفحَص (4.5)");
 rows=BOQ.wallRows();
 ok(rows.n>0&&rows.hidden===0,
  "وBOQ يُبقيه في الجدول ولا يعدّه ضمن المخفيّ — القفل ليس إخفاءً");
 /* الحرس ضدّ حذف المقفل مكانه delEnts (تقرأ pickable) — لا كل
    مسارٍ يقرأه بنفسه، كما يوثّق تعليقها («الحرس الأخير: لا يُحذَف
    ما لا يُحدَّد») */
 const before=S.walls.length;
 edit(()=>delEnts([{k:"wall",id:w1.id}]),"محاولة حذف جدارٍ مقفل عبر delEnts");
 eq(S.walls.length,before,
  "delEnts يرفض حذف الجدار المقفل — pickable هو الحرس الفعليّ");
 setLay("A-WALL","lk",0);
 edit(()=>delEnts([{k:"wall",id:w1.id}]),"حذفٌ بعد فكّ القفل");
 eq(S.walls.length,before-1,"وبعد فكّ القفل: نفس المسار يحذفه فعلياً");
});

/* ═══ 3 · تبديل نوع فتحةٍ من شباك إلى باب عبر applyOne: الطبقة
   الفعليّة تتبع kind — فتحةٌ واحدة تنتقل بين A-GLAZ وA-DOOR بلا أي
   كتابةٍ صريحة لحقل طبقة، وBOQ والمشهد يتبعانها في نفس اللحظة ═══ */
group("[4.8] applyOne kind: شباك→باب ينقل الفتحة بين الطبقتين حيّاً",()=>{
 reset();
 const w=wall([0,0],[6000,0]);
 setLay("A-DOOR","off",1);   /* الأبواب مخفيّةٌ سلفاً */
 const o=O.addOpen(w,1500,"window",1200,1200,900);
 ok(entVis({k:"open",id:o.id}),"شباكٌ على A-GLAZ الظاهرة: مرئيٌّ ابتداءً");
 let rows=BOQ.openRows();
 eq(rows.total,1,"يدخل BOQ ضمن نطاقه");
 const r=applyOne({k:"open",id:o.id},"kind","door");
 ok(r.ok,"applyOne تقبل تبديل النوع");
 eq(o.kind,"door","الكائن نفسه صار kind=door (لا نسخة)");
 ok(!entVis({k:"open",id:o.id}),
  "وبات على A-DOOR المخفيّة: entVis تعكس ذلك فوراً بلا نداءٍ يدويّ");
 rows=BOQ.openRows();
 eq(rows.total,0,"BOQ لم يعد يعدّه — انتقل إلى طبقةٍ مخفيّة");
 eq(rows.hidden,1,"ويُحسَب ضمن المخفيّ صراحةً");
 let sc=RENDER.scene();
 ok(!sc.P.some(p=>p.oid===o.id),"والمشهد يستبعده كذلك");
 setLay("A-DOOR","off",0);
 rows=BOQ.openRows();
 eq(rows.total,1,"وبإظهار A-DOOR: يعود للعدّ — بابٌ الآن لا شباك");
 ok(rows.rows.some(x=>x.kind==="door"),"وضمن صفّ الأبواب");
});

/* ═══ 4 · تبديل نوع جدارٍ إلى سترة (low) عبر applyOne: الطبقة تتبع
   isLow(w) — ينتقل من A-WALL إلى A-WALL-LOW حيّاً كذلك ═══ */
group("[4.8] applyOne type: جدارٌ إلى سترة ينقله من A-WALL إلى A-WALL-LOW",()=>{
 reset();
 const w=wall([0,0],[4000,0],"int");
 setLay("A-WALL-LOW","off",1);   /* السَّتَر مخفيّةٌ سلفاً */
 ok(entVis({k:"wall",id:w.id}),"جدارٌ داخليّ على A-WALL الظاهرة: مرئيّ");
 let rows=BOQ.wallRows();
 ok(rows.rows.some(x=>x.type==="int"),"يدخل جدول BOQ كنوعٍ داخليّ");
 const r=applyOne({k:"wall",id:w.id},"type","low");
 ok(r.ok,"applyOne تقبل تحويله إلى سترة");
 eq(w.type,"low","الكائن نفسه صار type=low");
 ok(!entVis({k:"wall",id:w.id}),
  "وبات على A-WALL-LOW المخفيّة: entVis تعكس ذلك فوراً");
 rows=BOQ.wallRows();
 ok(!rows.rows.some(x=>x.type==="low"),"BOQ لا يعدّه — طبقته مخفيّة الآن");
 ok(rows.hidden>0,"ويُحسَب ضمن المخفيّ");
 setLay("A-WALL-LOW","off",0);
 ok(entVis({k:"wall",id:w.id}),"وبإظهار A-WALL-LOW: يعود مرئياً");
 rows=BOQ.wallRows();
 ok(rows.rows.some(x=>x.type==="low"),"ويعود صفّاً في BOQ كسترة");
});

/* ═══ 5 · التراجع/الإعادة بعد تبديل نوعٍ ينقل بين طبقتين: الحقل
   نفسه يعود، والطبقة الفعليّة (المُشتقّة) تعود تبعاً له تلقائياً —
   لا حقل "طبقة" منفصلٌ يحتاج تراجعاً خاصّاً به ═══ */
group("[4.8] undo/redo بعد applyOne kind/type: الطبقة المشتقّة تتبع الحقل",()=>{
 reset();
 const w=wall([0,0],[6000,0]);
 const o=O.addOpen(w,1500,"window",1200,1200,900);
 setLay("A-DOOR","off",1);
 applyOne({k:"open",id:o.id},"kind","door");
 eq(o.kind,"door","بعد التبديل: door");
 ok(!entVis({k:"open",id:o.id}),"ومخفيٌّ تبعاً لطبقة الباب");
 undo();
 const oAfter=O.openById(o.id);
 eq(oAfter.kind,"window","undo يعيد kind إلى window");
 ok(entVis({k:"open",id:oAfter.id}),
  "والطبقة الفعليّة عادت A-GLAZ الظاهرة تبعاً لذلك — بلا أي حقلٍ "
  +"مستقلّ يحتاج استعادةً يدويّة");
 redo();
 const oRedo=O.openById(o.id);
 eq(oRedo.kind,"door","redo يعيد kind إلى door");
 ok(!entVis({k:"open",id:oRedo.id}),"ويعود مخفيّاً تبعاً لطبقة الباب");
 setLay("A-DOOR","off",0);

 const w2=wall([0,0],[0,4000],"int");
 setLay("A-WALL-LOW","off",1);
 applyOne({k:"wall",id:w2.id},"type","low");
 ok(!entVis({k:"wall",id:w2.id}),"الجدار الآن سترةٌ مخفيّة");
 undo();
 /* undo يستعيد لقطةً كاملة (apply): الكائن قد لا يكون بالمرجع
    نفسه بعد الآن — إعادة الجلب بمعرّفه كما في نمط phase4.7،
    لا الاعتماد على w2 القديم */
 let w2b=W.wallById(w2.id);
 ok(w2b&&w2b.type==="int"&&entVis({k:"wall",id:w2b.id}),
  "undo يعيد النوع int والرؤية معاً من طبقة A-WALL الظاهرة");
 redo();
 w2b=W.wallById(w2.id);
 ok(w2b&&w2b.type==="low"&&!entVis({k:"wall",id:w2b.id}),
  "redo يعيدها سترةً مخفيّة من جديد");
 setLay("A-WALL-LOW","off",0);
});

/* ═══ 6 · pickable() المُكاش يطابق حساباً خطّياً طازجاً (entVis+
   locked مباشرةً على layOfEnt) عبر تسلسل إخفاء/قفل/تبديل نوعٍ/
   تراجعٍ متتابع — لا فجوة بين الكاش والحساب الطازج في أي خطوة ═══ */
group("[4.8] pickable(): يطابق حساباً طازجاً عبر تسلسل تغييرات طبقةٍ متتابع",()=>{
 reset();
 const w=wall([0,0],[6000,0],"int");
 const o=O.addOpen(w,1500,"window",1200,1200,900);
 const fresh=s=>{
  const L=layOfEnt(s);
  return L?(vis(L)&&!locked(L)):true;
 };
 const both=s=>[pickable(s),fresh(s)];
 const sw={k:"wall",id:w.id}, so={k:"open",id:o.id};

 let [pw,fw]=both(sw), [po,fo]=both(so);
 eq(pw,fw,"الجدار: الكاش يطابق الطازج قبل أي تعديل");
 eq(po,fo,"والفتحة كذلك");

 setLay("A-GLAZ","off",1);
 [po,fo]=both(so); eq(po,fo,"بعد إخفاء A-GLAZ: يطابقان (كلاهما false)");
 setLay("A-GLAZ","off",0);

 setLay("A-WALL","lk",1);
 [pw,fw]=both(sw); eq(pw,fw,"بعد قفل A-WALL: يطابقان (كلاهما false)");

 applyOne({k:"wall",id:w.id},"type","low");
 setLay("A-WALL-LOW","lk",1);   /* الطبقة الجديدة مقفلةٌ أيضاً */
 [pw,fw]=both(sw);
 eq(pw,fw,"بعد الانتقال إلى A-WALL-LOW (وهي مقفلةٌ كذلك): يطابقان");

 setLay("A-WALL","lk",0); setLay("A-WALL-LOW","lk",0);
 undo();   /* تراجعٌ عن تبديل النوع */
 [pw,fw]=both(sw);
 eq(pw,fw,"بعد undo (عودةٌ إلى A-WALL غير المقفلة): يطابقان");
 ok(pw===true,"وقيمتُهما معاً true — لا قفل ولا إخفاء الآن");

 redo();
 [pw,fw]=both(sw);
 eq(pw,fw,"وبعد redo (عودةٌ إلى A-WALL-LOW): يطابقان أيضاً");

 applyOne({k:"open",id:o.id},"kind","door");
 [po,fo]=both(so); eq(po,fo,"وتبديل نوع الفتحة إلى باب: يطابقان");
});

process.exit(summary()?1:0);
