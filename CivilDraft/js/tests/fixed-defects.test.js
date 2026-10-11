/* ═══ عيوبٌ أُصلحت — حرّاسٌ خضراء ═══
   انتقلت هنا من js/tests/red/defects.red.js بعد إصلاحها (المرحلة 1)،
   وحُذفت تذكرتاها من KNOWN-DEFECTS.md — كما يفرض redguard.test.js:
   الإصلاح يُنقَل ولا يُترَك في المجلّد الأحمر.
     D03  مُعدِّلات المرجع كانت تحوّل غير الرقمي إلى صفر (underlay.js)
     D10  trial() كان يرمي فلا يستعيد الحالة (ai/run.js)
     D04  addWall كان يقبل NaN (المرحلة 2.3 — core/validate.js)
     D11  فشل fromJSON كان يترك مشروعاً مختلطاً ويمسح التاريخ
          (المرحلتان 2.5 و2.6 — io/project.js)
     D05  openState لم يطبّق EDGE (المرحلة 4.2 — core/opens.js)
     D06  الفاحص لم يقرأ الطبقة (المرحلة 4.5 — core/inspect.js)
     D13  colOnWall تعدّ الفراغَ داخل وتر الجدار القوسي جداراً
          (المرحلة 1.2 — core/cols.js + geom.polyHit)
     D01  undo/redo كانا يقلبان أوضاع الرسم S.rb (المرحلة 1 — core/state.js)
     D02  undo كان يقلب شفافية الصورة المرجعية (المرحلة 1 — core/state.js)
     D12  تعادل الطابع الزمني __t بين idb وls كان يرجّح idb لا كتابة
          الإغلاق الفعلية (io/store.js) */
import {shim,group,groupAsync,ok,eq,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,snapshot,edit,canUndo,undo,redo}=await import("../core/state.js");
const PRJ=await import("../io/project.js");
const W=await import("../core/walls.js");
const O=await import("../core/opens.js");
const M=await import("../core/modify.js");
const U=await import("../core/underlay.js");
const L=await import("../core/layers.js");
const I=await import("../core/inspect.js");
const CO=await import("../core/cols.js");
const FX=await import("../core/fixt.js");
await import("../tools/draw.js");           /* يسجّل أداة «wall» */
const R=await import("../tools/registry.js");
const RUN=await import("../ai/run.js");
const reset=()=>{newState(); ensureShape()};
const wall=(a,b)=>W.addWall(a,b,200,"int","c");

/* ═══ كان D03 — قيمةٌ غير صالحة تتحوّل إلى صفر ═══
   الضبط بـ (+v||0): "abc" ⇒ 0 فتختفي الصورة (شفافية 0)، ويُدار المرجع
   إلى 0 rad، وتقفز إلى (0,0). الصحيح: رفضٌ يترك القيمة كما هي. */
group("[كان D03] مُعدِّلات المرجع ترفض غير الرقمي ولا تصفّره",()=>{
 reset();
 S.underlay.w=100; S.underlay.h=100;
 S.underlay.x=500; S.underlay.y=700; S.underlay.rot=0.3; S.underlay.opacity=0.8;
 ["abc","",undefined,NaN].forEach(bad=>{
  U.setOpacity(bad);
  eq(S.underlay.opacity,0.8,`setOpacity(${String(bad)}) لم تُصفِّر الشفافية`);
  U.setRotation(bad);
  eq(S.underlay.rot,0.3,`setRotation(${String(bad)}) لم تُصفِّر الزاوية`);
 });
 U.move("abc","x");
 eq([S.underlay.x,S.underlay.y].join(),"500,700",
  "move('abc','x') لم تنقل الصورة إلى الأصل (0,0)");
});

/* ═══ كان D10 — trial() يرمي فلا يستعيد ═══
   الأخطاء داخل السطر تُمسَك وتُبلَّغ، أمّا ما يفلت (مُكرِّر خطّة يرمي،
   خطأ في touch/cancel) فيترك الجدران المصنوعة في الحالة بلا لقطة
   يستطيع المستدعي الرجوع إليها — إذ لم يُعِد trial شيئاً. */
group("[كان D10] trial() الذي يرمي يستعيد الحالة ويُطفئ الدفعة",()=>{
 reset();
 wall([0,0],[3000,0]);
 const before=snapshot();
 function* lines(){
  yield {kind:"tool",tool:"wall"};
  yield {kind:"text",s:"0,1000"};
  yield {kind:"text",s:"3000,1000"};
  yield {kind:"enter"};
  throw new Error("iter boom");
 }
 let thrown=null;
 try{RUN.trial(lines(),{stopOnError:1})}catch(e){thrown=e.message}
 eq(thrown,"iter boom","الاستثناء يصل إلى المستدعي (لا يُبتلَع)");
 ok(snapshot()===before,"والحالة عادت إلى ما قبل trial");
 eq(R.BATCH.on,0,"وعلَم الدفعة أُطفئ");
 ok(!R.active(),"ولا أداةَ عالقة");
});

/* ═══ كان D04 — addWall يقبل NaN ═══
   Math.hypot(NaN..)<MINW خطأٌ دائماً، فيمرّ الجدار ويُخزَّن NaN
   (يُسلسَل null). والسماكة "abc" تصير NaN كذلك. */
group("[كان D04] addWall يرفض الإحداثيات والسماكة غير المنتهية",()=>{
 reset();
 let threw=false;
 try{W.addWall([0,0],[NaN,0],200,"int","c")}catch(e){threw=true}
 ok(threw,"إحداثيٌّ NaN يُرفَض برمي");
 eq(S.walls.length,0,"ولا يدخل جدارٌ");
 try{W.addWall([0,0],[3000,0],"abc","int","c")}catch(e){}
 ok(S.walls.every(w=>Number.isFinite(w.t)&&w.a.concat(w.b).every(Number.isFinite)),
  "لا قيمة غير منتهية في أي جدار (سماكةٌ نصّية ترفض أو تعود للافتراضي)");
 ok(!JSON.stringify(S.walls).includes("null"),
  "والجدران المُسلسَلة لا تحمل null (أثر NaN)");
});

/* ═══ كان D11 — فشل تحميل JSON بعد استبدال الحالة ═══
   fromJSON تتحقّق من الشكل ثم تستبدل الحالة (loadState) ثم تحمّل
   blockDefs — فإن رمى الأخير وُجد مشروعٌ مختلط (جدرانٌ جديدة،
   تعريفاتٌ قديمة) والتاريخ ممسوح، فلا رجعة. */
group("[كان D11] فشل fromJSON لا يغيّر المشروع الحالي ولا تاريخه",()=>{
 reset();
 edit(()=>{wall([0,0],[3000,0])},"جدار");
 const before=snapshot();
 ok(canUndo(),"في التاريخ خطوة (شرطٌ مسبق)");
 const bad=JSON.stringify({__app:"civildraft",
  walls:[{id:"W9",a:[0,0],b:[9000,0],t:200,type:"int",align:"c"}],
  blockDefs:{defs:[null]}});
 let threw=false;
 try{PRJ.fromJSON(bad)}catch(e){threw=true}
 ok(threw,"الملفّ الفاسد يُرفَض (شرطٌ مسبق)");
 ok(snapshot()===before,"المشروع الحالي لم يتغيّر حرفاً");
 ok(canUndo(),"والتاريخ لم يُمسَح");
});

/* ═══ كان D05 — openState لا يعرف EDGE ═══
   addOpen يرفض فتحةً يبقى دونها أقلّ من EDGE=50مم على أي جانب، لكن
   openState (الذي يُلوّن الأحمر ويغذّي الفاحص) كان يقبل ما دام داخل
   الجدار. فشدُّ الجدار كان يترك بابًا على ٣٠مم من الطرف «سليماً». */
group("[كان D05] openState يطبّق EDGE كما يطبّقه addOpen",()=>{
 reset();
 const w=wall([0,0],[6000,0]);
 const o=O.addOpen(w,3000,"door",900,2100,0);
 eq(O.openState(o),"ok","سليمة عند التركيب (شرطٌ مسبق)");
 /* نقصّر الجدار فيبقى ٣٠مم بعد الباب: ٣٤٨٠ − ٣٤٥٠ */
 const G=M.stretchGrab({x0:5500,x1:6500,y0:-100,y1:100});
 M.stretchApply(G,-2520,0);
 eq(W.wallLen(w),3480,"الجدار قُصّر إلى ٣٤٨٠ (شرطٌ مسبق)");
 ok(O.openState(o)!=="ok",
  "باب يبقى بعده ٣٠مم < EDGE لا يُعدّ سليماً");
 ok(O.badOpens().includes(o),"وتدخل قائمة المعطوبة (الفاحص والتلوين)");
 /* الحدّ نفسه سليم: بعد الباب ٥٠مم بالضبط */
 const G2=M.stretchGrab({x0:3000,x1:4000,y0:-100,y1:100});
 M.stretchApply(G2,20,0);                   /* الطول ٣٥٠٠ ⇒ بقيّة ٥٠ */
 eq(O.openState(o),"ok","وعند EDGE بالضبط سليمة (لا مبالغة)");
});

/* ═══ كان D06 — الفاحص لم يمرّ بطبقةٍ إطلاقاً ═══
   رأس inspect.js كان يقول «المخفيّ والمقفل خارج الحساب» لكن فحوص
   الجدران (وبقيّة الأنواع) لم تكن تقرأ الطبقة أصلاً — فمخفيٌّ ومقفلٌ
   كلاهما يُبلَّغ عنه بلا فرق. والمرحلة 4.5 حسمت السؤال المفتوح في
   KNOWN-DEFECTS.md: المخفيّ وحده يُستثنى (لا يُرسَم ولا يُصدَّر)،
   والمقفل يُفحَص لأنه يُرسَم ويُصدَّر فعلياً — إخفاء خطئه عن الفاحص
   يُخفي خطأً حقيقياً في المخرج النهائي. اختباران بنوعَي كيانٍ
   مختلفين (جدار وعمود) كي لا يبقى الحسم خاصّاً بمسارٍ واحد. */
group("[كان D06] الفاحص يستثني المخفيّ ويفحص المقفل — جدار",()=>{
 reset();
 wall([0,0],[3000,0]);                       /* جدارٌ مفرد ⇒ طرفان سائبان */
 const ends=()=>I.inspect().list.filter(f=>f.code==="end"&&f.id).length;
 ok(ends()>0,"مرئياً: يُبلَّغ عن أطرافه السائبة (شرطٌ مسبق)");
 L.setLay("A-WALL","off",1);
 eq(ends(),0,"مخفياً: لا بلاغ عن أطرافه");
 L.setLay("A-WALL","off",0);
 ok(ends()>0,"عاد مرئياً: عاد البلاغ (شرطٌ مسبق للفقرة التالية)");
 L.setLay("A-WALL","lk",1);
 ok(ends()>0,"مقفلاً: يبقى البلاغ قائماً — يُرسَم ويُصدَّر فعلياً");
 L.setLay("A-WALL","lk",0);
});
group("[كان D06] الفاحص يستثني المخفيّ ويفحص المقفل — عمود",()=>{
 reset();
 const c=CO.addCol("rect",[9000,9000],300,300,0,"conc"); /* بعيدٌ عن أي جدار */
 const kfree=()=>I.inspect().list.some(f=>f.code==="kfree"&&f.id===c.id);
 ok(kfree(),"عمودٌ منفردٌ مرئيّ: يُبلَّغ عنه (شرطٌ مسبق)");
 L.setLay("A-COLS","off",1);
 ok(!kfree(),"مخفياً: لا بلاغ عنه");
 L.setLay("A-COLS","off",0);
 L.setLay("A-COLS","lk",1);
 ok(kfree(),"مقفلاً: يبقى البلاغ — يُرسَم ويُصدَّر فعلياً");
 L.setLay("A-COLS","lk",0);
});

/* ═══ كان D13 — convexHit (SAT) خاطئ للجدار القوسي ═══
   band(w) لجدارٍ قوسيّ مضلّعٌ مقعَّر، وconvexHit تفترض محدَّبَين: SAT
   تحكم بالغلاف المحدَّب فتعدّ الفراغَ بين الوتر والقوس الداخلي جدراً.
   ربع دائرة R=1000 حول (0,0) بسماكة 200 = الشريط بين نصفَي القطر
   900 و1100. عمودٌ 300×300 عند (300,300) أقصى زواياه (450,450) على
   بعد 636 من المركز، أي 264مم داخل الحلقة، ومع ذلك أعادت colOnWall
   «W1» فاختفى بلاغ «عمود منفرد» kfree عن الفاحص.
   الإصلاح: للقوس polyHit (أقصر مسافة بين الأضلاع + الاحتواء)، وللمستقيم
   يبقى convexHit (محدَّب فلا خطأ). ملاحظة: عمودٌ 300×300 عند (500,500)
   يلامس فعلاً — زاويته (650,650) على بعد 919 > 900 داخل الحلقة —
   فجوابه W1 صحيح لا إيجابيٌّ كاذب.                                    */
const colAt=(x,y,o)=>{
 const c=CO.addCol(o&&o.kind||"rect",[x,y],o&&o.w||300,o&&o.h||300,
  o&&o.rot||0,"conc");
 const on=CO.colOnWall(c,o&&o.tol); CO.delCol(c); return on;
};
const quarter=(a,b,bg)=>{
 reset();
 const w=W.addWall(a,b,200,"ext","c",undefined,bg);
 const P=W.arcParams(w);
 ok(P&&Math.abs(P.cx)<1&&Math.abs(P.cy)<1&&Math.abs(P.R-1000)<1,
  "شرطٌ مسبق: القوس ربع دائرة R=1000 مركزها (0,0)");
 return w;
};
group("[كان D13] colOnWall — ربع دائرة: داخل الوتر لا يُعدّ جداراً",()=>{
 const arc=quarter([1000,0],[0,1000],Math.tan(Math.PI/8));
 eq(colAt(300,300),null,"عمود (300,300) داخل الوتر بعيداً عن القوس ⇒ null");
 eq(colAt(350,350),null,"وعند (350,350)");
 eq(colAt(400,400),null,"وعند (400,400)");
 eq(colAt(0,0),null,"وعند مركز القوس (0,0)");
 eq(colAt(707,707),arc.id,"وعمودٌ على منتصف القوس (707,707) ⇒ الجدار");
 eq(colAt(500,500),arc.id,
  "وعند (500,500) يلامس الداخلَ بزاويته (نصفُ القطر 919>900) ⇒ الجدار");
 eq(colAt(900,900),arc.id,"وعند (900,900) يلامس الخارج فعلاً");
 eq(colAt(1000,1000),null,"وخارج القوس بفجوة ⇒ null (بلا تغيير عن السابق)");
 eq(colAt(1000,0),arc.id,"وعمودٌ على طرف القوس (1000,0)");
 eq(colAt(0,1000),arc.id,"وعلى الطرف الآخر (0,1000)");
});
group("[كان D13] colOnWall — قوسٌ باتجاهٍ معاكس (bulge سالب)",()=>{
 const arc=quarter([0,1000],[1000,0],-Math.tan(Math.PI/8));
 eq(colAt(300,300),null,"(300,300) ⇒ null");
 eq(colAt(707,707),arc.id,"(707,707) ⇒ الجدار");
 eq(colAt(1000,1000),null,"(1000,1000) ⇒ null");
});
group("[كان D13] colOnWall — نصف دائرة (تقعّرٌ أكبر) وعمودٌ دائريّ ومائل",()=>{
 reset();
 const arc=W.addWall([1000,0],[-1000,0],200,"ext","c",undefined,1);
 const P=W.arcParams(arc);
 ok(P&&Math.abs(P.cx)<1&&Math.abs(P.cy)<1&&Math.abs(P.sweep-Math.PI)<1e-6,
  "شرطٌ مسبق: نصف دائرة R=1000 مركزها (0,0)");
 eq(colAt(0,500),null,"عمودٌ داخل نصف الدائرة (0,500) ⇒ null");
 eq(colAt(0,0),null,"وعند المركز ⇒ null");
 eq(colAt(0,1000),arc.id,"وعلى قمّة القوس ⇒ الجدار");
 eq(colAt(-707,707),arc.id,"وعلى الجهة الأخرى ⇒ الجدار");
 eq(colAt(0,500,{kind:"circ",w:400}),null,"عمودٌ دائريّ داخل الوتر ⇒ null");
 eq(colAt(0,1000,{kind:"circ",w:400}),arc.id,"ودائريٌّ على القوس ⇒ الجدار");
 eq(colAt(0,500,{rot:45}),null,"وعمودٌ مائل داخل الوتر ⇒ null");
});
group("[كان D13] colOnWall — التفاوت على وجه القوس الداخلي",()=>{
 quarter([1000,0],[0,1000],Math.tan(Math.PI/8));
 const d=v=>[v*Math.SQRT1_2,v*Math.SQRT1_2];
 const at=(v,tol)=>{ const p=d(v);
  return colAt(p[0],p[1],{kind:"circ",w:200,tol}) };
 /* دائرةٌ نصف قطرها 100 على الشعاع 45°: أبعدُ رأسٍ عن المركز v+100،
    والوجه الداخلي عند 900 */
 eq(at(790),null,"فجوة ≈10 وتفاوتٌ افتراضيّ ٢ ⇒ null");
 eq(at(790,5),null,"وتفاوت ٥ ⇒ null");
 ok(at(790,20)!==null,"وتفاوت ٢٠ (فوق الفجوة) ⇒ تلامس");
 ok(at(810)!==null,"وتداخلٌ حقيقيّ (910>900) ⇒ تلامس");
});
group("[كان D13] الجدار المستقيم بلا تغيير",()=>{
 reset();
 const w=W.addWall([0,0],[6000,0],200,"ext","c");
 eq(colAt(3000,0),w.id,"عمودٌ على الجدار ⇒ الجدار");
 eq(colAt(3000,250),w.id,"وحافّتُه تلامس وجه الجدار (فجوة ٠) ⇒ الجدار");
 eq(colAt(3000,251),w.id,"وفجوة ١ ضمن التفاوت الافتراضيّ ⇒ الجدار");
 eq(colAt(3000,253),null,"وفجوة ٣ فوقه ⇒ null");
 eq(colAt(3000,600),null,"وبعيداً ⇒ null");
 eq(colAt(3000,0,{rot:45}),w.id,"والمائل على الجدار ⇒ الجدار");
});
group("[كان D13] الفاحص يُبلِّغ عن العمود المنفرد قرب جدارٍ قوسيّ",()=>{
 quarter([1000,0],[0,1000],Math.tan(Math.PI/8));
 const far=CO.addCol("rect",[300,300],300,300,0,"conc");
 const near=CO.addCol("rect",[707,707],300,300,0,"conc");
 const kfree=id=>I.inspect().list.some(f=>f.code==="kfree"&&f.id===id);
 ok(kfree(far.id),"العمود داخل الوتر منفردٌ ⇒ kfree");
 ok(!kfree(near.id),"والعمود على القوس ليس منفرداً");
});
group("[كان D13] fixOnWall على الجدار القوسي (حارسٌ: لا يستعمل SAT أصلاً)",()=>{
 quarter([1000,0],[0,1000],Math.tan(Math.PI/8));
 const on=(x,y)=>{ const f=FX.addFix("wc",[x,y],0);
  const r=FX.fixOnWall(f,150); return r };
 eq(on(300,300),null,"أداةٌ داخل الوتر بعيداً ⇒ null");
 eq(on(0,0),null,"وعند المركز ⇒ null");
 ok(on(707,707)!==null,"وعلى القوس ⇒ الجدار");
});

/* ═══ كان D01 — التراجع يقلب أوضاع الرسم ═══
   S.rb (تعامد · التقاط · قطبي …) تفضيلُ جلسةٍ لا بيانات مشروع، لكنها
   كانت في KEYS فتدخل كل لقطة، فيستعيدها undo() من اللقطة القديمة.
   النتيجة: تُطفئ التعامد ثم تتراجع عن جدارٍ فيعود التعامد مشغَّلاً بلا
   سبب. الإصلاح: apply() تستثني S.rb إلا عند تحميل مشروعٍ كامل
   (loadState تمرّر {full:true})؛ undo/redo وتراجعُ edit() الفاشل لا
   يمسّون حالة الجلسة. */
group("[كان D01] undo/redo لا يقلبان أوضاع الرسم S.rb",()=>{
 reset();
 edit(()=>{wall([0,0],[6000,0])},"جدار");
 S.rb.ortho=0; S.rb.snap=0;                 /* كما يفعل app.js:452 */
 undo();
 eq(S.walls.length,0,"التراجع نفّذ فعلاً (شرطٌ مسبق)");
 eq(S.rb.ortho,0,"التعامد المُطفَأ بقي مُطفَأً بعد التراجع");
 eq(S.rb.snap,0,"والالتقاط كذلك");
 S.rb.ortho=1;
 redo();
 eq(S.rb.ortho,1,"والإعادة لا تقلب التعامد المُشغَّل");
});

/* ═══ كان D02 — التراجع يقلب شفافية المرجع ═══
   نفس علّة D01: S.underlay.opacity تفضيلُ عرضٍ لا تاريخ، فكانت undo()
   تعيدها من اللقطة القديمة. الإصلاح ضمن apply() نفسها (انظر أعلاه). */
group("[كان D02] undo لا يقلب شفافية الصورة المرجعية (تفضيلُ عرض)",()=>{
 reset();
 edit(()=>{wall([0,0],[6000,0])},"جدار");
 U.setOpacity(0.9);
 undo();
 eq(S.walls.length,0,"التراجع نفّذ فعلاً (شرطٌ مسبق)");
 eq(S.underlay.opacity,0.9,"الشفافية بقيت ٠٫٩ بعد التراجع عن جدارٍ لا علاقة له");
});

/* ═══ كان D12 — تعادل __t يرجّح idb لا كتابة الإغلاق ═══
   رأس io/store.js يقول صراحةً إن الكتابة الأخيرة (flushSync عند
   الإغلاق، تقع في ls) لا يجوز أن تُحجَب بنسخةٍ أقدم في idb. الشرط
   الفعلي كان tI>=tL فيرجّح idb أيضاً حين يتساويان تماماً — وارد فعلاً
   إذ Date.now() بدقّة المللي‑ثانية. الإصلاح: تشديد الشرط الحاسم في
   load() إلى tI>tL صارماً، فعند التعادل التامّ تفوز ls. */
function fakeIDB12(){
 const M=new Map();
 const later=fn=>setTimeout(fn,0);
 const store={
  put:(v,k)=>{M.set(k,v)},
  delete:k=>{M.delete(k)},
  get:k=>{
   const rq={result:undefined};
   later(()=>{rq.result=M.get(k); if(rq.onsuccess)rq.onsuccess()});
   return rq;
  }};
 const db={
  objectStoreNames:{contains:()=>true},
  createObjectStore:()=>store,
  close:()=>{},
  transaction:()=>{
   const tx={objectStore:()=>store};
   later(()=>{if(tx.oncomplete)tx.oncomplete()});
   return tx;
  }};
 globalThis.indexedDB={
  open:()=>{
   const rq={result:db};
   later(()=>{if(rq.onsuccess)rq.onsuccess()});
   return rq;
  },
  deleteDatabase:()=>{M.clear()}};
 return M;
}
await groupAsync("[كان D12] عند تعادل __t تفوز ls (كتابة الإغلاق) لا idb",async()=>{
 const ST12=await import("../io/store.js?d12fixed=1");
 const IDB=fakeIDB12();
 localStorage.clear();
 const realNow=Date.now;
 Date.now=()=>1000000;
 try{
  const doc=n=>({walls:Array.from({length:n},(_,i)=>({id:"W"+i,
    a:[0,i],b:[1,i],t:200,type:"int",align:"c"})),
   opens:[],areas:[],dims:[],chains:[],anno:[],cols:[],fixt:[],
   stairs:[],meta:{name:"T",scale:100},
   ref:{name:"r",tr:{k:1,rot:0,dx:0,dy:0},src:{},off:{},ents:[]}});
  ST12.flushSync(doc(5));
  IDB.set("doc",Object.assign({},doc(9),{__t:1000000}));
  const l=await ST12.load();
  eq(l&&l.via,"ls","عند التعادل التامّ تفوز ls (كتابة الإغلاق) لا idb");
  eq(l&&l.data.walls.length,5,"فالمحتوى محتوى الإغلاق الفعليّ (٥) لا idb (٩)");
 }finally{Date.now=realNow}
});

process.exit(summary()?1:0);
