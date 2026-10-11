/* ═══ دفعة 4.7 — توحيد تحديث الفهارس ═══
   node js/tests/phase4.7.test.js

   الفهارس والكاشات المعنيّة، ومفتاح كلٍّ منها:
     sindex.js  (الفهرس المكاني)         → VER.n
     layers.js  IX  (اسم←طبقة)           → VER.g + invalidate() صريح
     layers.js  RC  (resolve)            → VER.g + invalidate() صريح
     layers.js  PK  (pickable)           → VER.n/g/o + LV + هويّة S.layers
     opens.js   OX  (جدار←فتحاته · معرّف←فتحة)
                                          → هويّة S.opens + طولها + VER.n/g/o
                                            + invalidateOpens() صريحاً حين
                                            يتغيّر o.wall في موضعه
     walls.js   MAP (معرّف←جدار)         → VER.g
     walls.js   BG  (شبكة صناديق الأجسام) → VER.g
     walls.js   LCACHE (الأطراف الحرّة)   → VER.g + التفاوت
     render.js  CACHE (المشهد)           → VER.n، وكل نطاقٍ بمفتاحه
                                            الخاصّ (goKey/gKey/nKey) زائداً
                                            layVer() للتصفية

   هذا الملفّ لا يعدّل — يثبّت أن الانضباط الموصوف في تعليق
   state.js (نسخ VER الثلاث) وتعليق opens.js (الهويّة والطول
   والنسخ الثلاث، وإبطالٌ صريحٌ لما لا يُغيّر أيّاً منها) يعمل
   فعلياً عبر مسارات التطبيق الحقيقية — لا عبر نداء invalidate()
   يدويٍّ يُضيفه الاختبار نفسه. فكل تحقّقٍ هنا يقارن نتيجة الفهرس
   بحساب خطّيّ مرجعيّ (linear scan) بعد عملية تطبيقٍ عادية
   (addWall · edit() · undo/redo · breakWall …) بلا أي نداء
   invalidate/invalidateOpens من الاختبار نفسه — فإن نسي مسارٌ في
   الكود الإبطال، يظهر ذلك هنا تفاوتاً بين الفهرس والمسح الخطّي. */
import {shim,group,ok,eq,deep,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,undo,redo,edit,VER}
 =await import("../core/state.js");
const {vis,locked,pickable,resolve,layOf,setLay,resetLays,layVer}
 =await import("../core/layers.js");
const W=await import("../core/walls.js");
const O=await import("../core/opens.js");
const MOD=await import("../core/modify.js");
const RENDER=await import("../core/render.js");
const BOQ=await import("../core/boq.js");
const SI=await import("../core/sindex.js");
const {delEnts}=await import("../core/ents.js");
const {addDim}=await import("../core/dims.js");

const reset=()=>{newState(); ensureShape()};
const wall=(a,b,type)=>W.addWall(a,b,200,type||"int","c");

/* ═══ 1 · الفهرس المكاني: يطابق المسح الخطّي بعد إضافةٍ وحذفٍ
   وتراجعٍ وإعادة — بلا أي نداء SI.invalidate() من الاختبار ═══ */
group("[4.7] sindex: يطابق المسح الخطّي عبر إضافة/حذف/تراجع",()=>{
 reset();
 const w1=wall([0,0],[3000,0]);
 const w2=wall([0,0],[0,3000]);
 /* صندوقٌ في منتصف w1 بعيداً عن ركن w2 عند الأصل، فلا يُصيب سواه */
 let hit=SI.entsIn({x0:1000,y0:-50,x1:2000,y1:50},"wall");
 eq(hit.length,1,"صندوقٌ حول منتصف w1 وحده يصيب جداراً واحداً");
 ok(hit[0]===w1,"وهو w1 نفسه بالمرجع");
 /* w3 يُضاف ثم يُحذَف كلٌّ منهما عبر edit() — كخطوتَي تاريخٍ
    حقيقيّتين، لا عبر addWall/delWall مباشرةً (بلا تاريخ) */
 const w3=edit(()=>wall([5000,5000],[8000,5000]),"إضافة جدار");
 hit=SI.entsIn({x0:4950,y0:4950,x1:8050,y1:5050},"wall");
 eq(hit.length,1,"الجدار المُضاف حديثاً يدخل الفهرس بلا نداءٍ يدويّ");
 ok(hit[0]===w3,"وهو w3 نفسه");
 edit(()=>W.delWall(w3),"حذف جدار");
 hit=SI.entsIn({x0:4950,y0:4950,x1:8050,y1:5050},"wall");
 eq(hit.length,0,"بعد الحذف لا يبقى أثرٌ للجدار في الفهرس");
 /* undo يتراجع عن خطوة الحذف (آخر ما دخل التاريخ) عبر لقطةٍ كاملة
    (apply): مصفوفةٌ جديدة الهويّة يبنيها الفهرس من جديد */
 undo();
 hit=SI.entsIn({x0:4950,y0:4950,x1:8050,y1:5050},"wall");
 eq(hit.length,1,"undo يُعيد الجدار إلى الفهرس المكاني كذلك");
 redo();
 hit=SI.entsIn({x0:4950,y0:4950,x1:8050,y1:5050},"wall");
 eq(hit.length,0,"و redo يُعيد حذفه — الفهرس يتبع اللقطة لا الذاكرة");
});

/* ═══ 2 · جدول الطبقات (layOf/vis/locked/pickable/resolve): يعكس
   التعديل فوراً بالاعتماد على touch() الافتراضية في edit() وحدها،
   بلا أي نداء layers.invalidate() من الاختبار ═══ */
group("[4.7] layers: IX/RC/PK تتحدّث تلقائياً بعد setLay بلا نداءٍ يدويّ",()=>{
 reset();
 const w=wall([0,0],[3000,0]);
 const s={k:"wall",id:w.id};
 ok(vis("A-WALL")&&pickable(s),"قبل أي تعديلٍ: ظاهرة وقابلة للّمس");
 const r0=resolve("A-WALL","dark");
 ok(!r0.off,"resolve() تقرأ off=0 قبل الإخفاء");
 setLay("A-WALL","off",1);
 ok(!vis("A-WALL"),"vis() تعكس الإخفاء فوراً — بلا نداء invalidate()");
 ok(!pickable(s),"pickable() كذلك — الكاش الداخليّ تابعٌ لا مستقلّ");
 const r1=resolve("A-WALL","dark");
 ok(r1.off,"resolve() تعكس off=1 فوراً كذلك");
 setLay("A-WALL","off",0);
 setLay("A-WALL","lk",1);
 ok(vis("A-WALL")&&!pickable(s)&&locked("A-WALL"),
  "والقفل: ظاهرة، مقفلة، غير قابلة للّمس — كلّها فوريّة");
 setLay("A-WALL","lk",0);
 ok(vis("A-WALL")&&pickable(s),"وبعد الفكّ تعود كما كانت");
});

/* ═══ 3 · استبدال جدول الطبقات كاملاً (resetLays): الفهرس
   والكاشات تتبع الهويّة الجديدة لا القديمة ═══ */
group("[4.7] layers: resetLays يستبدل المصفوفة والفهرس يتبعها",()=>{
 reset();
 const w=wall([0,0],[3000,0]);
 setLay("A-WALL","off",1);
 ok(!vis("A-WALL"),"الطبقة مخفيّةٌ قبل إعادة المصنع");
 const before=S.layers;
 resetLays();
 ok(S.layers!==before,"resetLays يستبدل هويّة المصفوفة فعلياً");
 ok(vis("A-WALL"),"وبعد إعادة المصنع: A-WALL ظاهرةٌ من جديد");
 ok(pickable({k:"wall",id:w.id}),"والجدار عاد قابلاً للّمس تبعاً لذلك");
});

/* ═══ 4 · فهرس الفتحات (opensOf/openById): إعادة تعيين o.wall في
   موضعه (breakWall → shiftOpensTo) يُبطِل الفهرس رغم بقاء هويّة
   S.opens وطولها كما هما — عبر invalidateOpens() الصريحة، لا عبر
   VER ولا عبر هويّة المصفوفة (لم تتغيّر) ═══ */
group("[4.7] opens: breakWall ينقل فتحةً بين جدارَين والفهرس يتبعها",()=>{
 reset();
 const w=wall([0,0],[6000,0]);
 const o=O.addOpen(w,4500,"door",900,2100,0);
 let onOld=O.opensOf(w.id);
 eq(onOld.length,1,"الفتحة تنتمي لجدارها الأصلي قبل القطع");
 const beforeOpens=S.opens, beforeLen=S.opens.length;
 const r=MOD.breakWall(w.id,[2000,0]);
 ok(S.opens===beforeOpens,
  "breakWall لا يستبدل مصفوفة S.opens (طول العنصر لم يتغيّر)");
 eq(S.opens.length,beforeLen,"ولا عددها");
 onOld=O.opensOf(w.id);
 eq(onOld.length,0,
  "الفهرس يعلم أن الفتحة غادرت الجدار القديم رغم بقاء المصفوفة");
 const onNew=O.opensOf(r.nw.id);
 eq(onNew.length,1,"وتظهر تحت الجدار الجديد في الفهرس فوراً");
 ok(O.openById(o.id)===onNew[0],
  "openById يعيد الكائن نفسه بالمرجع — لا نسخة");
 /* مطابقةٌ مع مسحٍ خطّي مباشر على S.opens نفسها */
 const linear=S.opens.filter(x=>x.wall===r.nw.id);
 deep(linear.map(x=>x.id),onNew.map(x=>x.id).slice(),
  "الفهرس يطابق المسح الخطّي المباشر على S.opens");
});

/* ═══ 5 · حذف الجدار يستبدل S.opens بمصفوفةٍ جديدة (cascade)،
   والفهرس يتبع الهويّة الجديدة فوراً بلا نداءٍ يدويّ ═══ */
group("[4.7] opens: cascade حذف الجدار يستبدل مصفوفة S.opens والفهرس يتبعها",()=>{
 reset();
 const w=wall([0,0],[3000,0]);
 O.addOpen(w,1500,"window",900,1200,0);
 const before=S.opens;
 delEnts([{k:"wall",id:w.id}]);
 ok(S.opens!==before,"cascade يستبدل هويّة S.opens (filter يعيد مصفوفةً جديدة)");
 eq(S.opens.length,0,"والفتحة حُذفت فعلياً مع حاضنها");
 eq(O.opensOf(w.id).length,0,"وفهرس الفتحات يعكس ذلك فوراً");
});

/* ═══ 6 · خريطة معرّفات الجدران (wallById): تتبع VER.g عبر
   الحذف والتراجع والإعادة، وتطابق البحث الخطّي في كل خطوة ═══ */
group("[4.7] walls: wallById يطابق البحث الخطّي عبر حذف/تراجع/إعادة",()=>{
 reset();
 const w1=wall([0,0],[3000,0]);
 const w2=wall([0,0],[0,3000]);
 ok(W.wallById(w1.id)===w1,"wallById يجد w1 بالمرجع");
 edit(()=>W.delWall(w1),"حذف جدار");
 ok(W.wallById(w1.id)===null,"بعد الحذف: wallById لا يجده");
 ok(S.walls.find(x=>x.id===w1.id)===undefined,
  "والمسح الخطّي على S.walls يوافقه (لا وجود فعلياً)");
 undo();
 const back=S.walls.find(x=>x.id===w1.id);
 ok(back&&W.wallById(w1.id)===back,
  "undo يستعيده والخريطة تعيد كائنه المُستعاد نفسه — لا نسخةً غيره");
 redo();
 ok(W.wallById(w1.id)===null,"redo يعيد حذفه والخريطة تتبعه");
});

/* ═══ 7 · كاش المشهد (render.scene): يعكس تعديلاً هندسياً وتعديلَ
   طبقةٍ معاً بعد edit() واحدة — الاعتماد الوحيد على bump="geom"
   الافتراضية في edit()، لا على render.invalidate() يدويّ ═══ */
group("[4.7] render.scene(): يتحدّث بعد إضافةٍ وتعديل طبقةٍ بلا نداءٍ يدويّ",()=>{
 reset();
 const sc0=RENDER.scene();
 eq(sc0.P.filter(g=>g.L==="A-WALL").length,0,"لا جدران في المشهد ابتداءً");
 wall([0,0],[3000,0]);
 const sc1=RENDER.scene();
 ok(sc1.P.some(g=>g.L==="A-WALL"),
  "الجدار المُضاف يدخل المشهد فور scene() التالية — بلا invalidate()");
 setLay("A-WALL","off",1);
 const sc2=RENDER.scene();
 ok(!sc2.P.some(g=>g.L==="A-WALL"),
  "وبعد إخفاء الطبقة: scene() التالية تستبعده فوراً كذلك");
 setLay("A-WALL","off",0);
});

/* ═══ 8 · BOQ يقرأ المشهد نفسه — فلا فجوة بين ما يُرسَم وما يُحسَب
   بعد أي تسلسل إضافةٍ/إخفاءٍ/تراجع ═══ */
group("[4.7] BOQ: يطابق حالة الطبقات الحيّة عبر تسلسل تعديلاتٍ متتابع",()=>{
 reset();
 wall([0,0],[3000,0]);
 eq(BOQ.wallRows().n,1,"جدارٌ واحد يدخل الجدول");
 setLay("A-WALL","off",1);
 eq(BOQ.wallRows().n,0,"إخفاؤها يُخرجه من الجدول فوراً");
 undo();   /* يتراجع عن setLay (last edit) لا عن addWall */
 eq(BOQ.wallRows().n,1,"وتراجعٌ عن إخفاء الطبقة يُعيده إلى الجدول");
 setLay("A-WALL","off",0);
});

/* ═══ 9 · نسخ VER الثلاث تتحرّك بدرجاتٍ مختلفة: تعديل بُعدٍ (view)
   لا يُبطل فهرس الفتحات ولا الفهرس المكاني للجدران عبثاً؛ وتعديل
   فتحةٍ (open) يُبطل badOpens دون إبطال هويّة جدول الطبقات ═══ */
group("[4.7] VER: الدرجات لا تتداخل — تعديلٌ خفيف لا يُبطل كاشاً أثقل بلا داعٍ",()=>{
 reset();
 const w=wall([0,0],[3000,0]);
 const g0=VER.g;
 addDim("h",[0,-500],[3000,-500],-800);
 eq(VER.g,g0,"إضافة بُعدٍ (view) لا تُبطل النسخة الهندسية g");
 const o=O.addOpen(w,1500,"door",900,2100,0);
 const gAfterOpen=VER.g;
 ok(VER.o>0,"إضافة فتحةٍ تُقدّم نسخة الفتحات o");
 setLay("A-DIMS","off",1);   /* تعديل طبقةٍ (عبر edit() الافتراضية) */
 ok(VER.g>gAfterOpen,
  "لكن تعديل حقل طبقةٍ عبر setLay يستعمل bump الافتراضي (geom) فيُقدّم g — "
  +"آمنٌ لا خفيف، كما يوثّق state.js");
 setLay("A-DIMS","off",0);
});

process.exit(summary()?1:0);
