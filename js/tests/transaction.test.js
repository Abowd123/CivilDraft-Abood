/* ═══ المعاملة الموحَّدة: edit() وعمقُها ═══
   العقد: لقطةٌ قبل → تنفيذٌ كامل → رجوعٌ عند الخطأ → touch واحد →
   pushHistory واحد → autosave واحد. والمتداخلة تنضمّ إلى الخارجية.
   (D07 كانت هنا عيباً أحمر — انظر KNOWN-DEFECTS.md)                    */
import {shim,group,groupAsync,toolRig,ok,eq,deep,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,edit,transaction,undo,redo,canUndo,canRedo,
 snapshot,inTransaction,editFailed,setAfterEdit,setEditError,VER,
 clearHistory,historyTimeline,joinTxn}=
 await import("../core/state.js");
const W=await import("../core/walls.js");
const B=await import("../core/blocks.js");
const U=await import("../core/underlay.js");
const AR=await import("../core/areas.js");
const LY=await import("../core/layers.js");
const MD=await import("../core/modify.js");
const BT=await import("../core/batch.js");
const RN=await import("../core/render.js");
const RUN=await import("../ai/run.js");
await import("../tools/draw.js");
const REG=await import("../tools/registry.js");
const rig=toolRig(REG,{invalidate:()=>RN.invalidate()});
const steps=()=>historyTimeline().current;
const reset=()=>{newState(); ensureShape()};
const wall=(y)=>W.addWall([0,y],[3000,y],200,"int","c");

group("D07: edit المتداخلة خطوة تراجعٍ واحدة بلا خطوةٍ شبح",()=>{
 reset();
 edit(()=>{
  wall(0);
  edit(()=>{wall(1000)},"داخلية");
  wall(2000);
 },"خارجية");
 eq(S.walls.length,3,"العملية نُفّذت");
 undo();
 eq(S.walls.length,0,"تراجعٌ واحد يُعيد ما قبل العملية كلّها");
 ok(!canUndo(),"ولا تبقى خطوةٌ شبحٌ في السجلّ");
 redo();
 eq(S.walls.length,3,"والإعادة تُعيدها كلّها دفعةً");
 ok(!canRedo(),"بلا خطوة إعادةٍ زائدة");
});
group("خطأٌ في الطبقة الداخلية يُرجِع العملية الخارجية كلّها",()=>{
 reset();
 const before=snapshot();
 let msg=null; setEditError(m=>{msg=m});
 const r=edit(()=>{
  wall(0);
  edit(()=>{wall(1000); throw new Error("داخلي")},"داخلية");
  wall(2000);                              /* لا تُنفَّذ: الخطأ صعد */
 },"خارجية");
 setEditError(null);
 eq(r,undefined,"edit تُعيد undefined عند الفشل");
 ok(editFailed(),"ويُعلَن الفشل");
 eq(msg,"داخلي","والرسالة الأصلية تصل إلى المُبلِّغ");
 ok(snapshot()===before,"والحالة مطابقةٌ للقطة السابقة حرفاً (لا نصف عملية)");
 ok(!canUndo(),"ولا خطوة تاريخ");
});
group("خطأٌ خارجيٌّ بعد داخليةٍ ناجحة يُرجِع الداخلية أيضاً",()=>{
 reset();
 const before=snapshot();
 edit(()=>{
  edit(()=>{wall(0)},"داخلية");
  throw new Error("خارجي");
 },"خارجية");
 ok(snapshot()===before,"الداخلية الناجحة لم تنجُ منفردةً");
 ok(!canUndo(),"ولا خطوة تاريخ");
});
group("touch وAFTER مرّةً واحدة لعمليةٍ مركّبة",()=>{
 reset();
 const v0=VER.n; let after=0;
 setAfterEdit(()=>{after++});
 edit(()=>{
  wall(0); edit(()=>{wall(1000)},"أ"); edit(()=>{wall(2000)},"ب");
 },"مركّبة");
 setAfterEdit(null);
 eq(after,1,"AFTER نُودي مرّةً واحدة");
 ok(VER.n-v0<=4,`VER.n تقدّم ${VER.n-v0} خطوة فقط (لا touch لكل داخلية)`);
});
group("inTransaction() تعكس العمق",()=>{
 reset();
 eq(inTransaction(),false,"خارج المعاملة");
 let a=null,b=null;
 edit(()=>{a=inTransaction(); edit(()=>{b=inTransaction()},"د")},"خ");
 ok(a===true&&b===true,"داخلها وداخل المتداخلة");
 eq(inTransaction(),false,"وبعدها");
 edit(()=>{throw new Error("x")},"فشل");
 eq(inTransaction(),false,"وبعد فشلٍ لا يبقى العمق عالقاً");
 edit(()=>{wall(0)},"ناجحة");
 eq(S.walls.length,1,"والمعاملة التالية تعمل عادةً");
});

/* ═══ الكتل: تغيير التعريف داخل edit خطوةٌ واحدة ═══ */
group("حذف تعريف كتلة داخل edit: خطوةٌ واحدة بلا شبح",()=>{
 reset();
 B.defineBlock({name:"txn-block",prims:[]});
 clearHistory();
 edit(()=>{B.removeBlock("txn-block")},"حذف تعريف كتلة");
 eq(B.hasBlock("txn-block"),false,"التعريف حُذف");
 eq(steps(),1,"خطوةٌ واحدة لا اثنتان");
 undo();
 ok(B.hasBlock("txn-block"),"التراجع أعاد التعريف");
 ok(!canUndo(),"ولا خطوةَ تاريخٍ شبحاً");
});
group("حذف كتلة بعد تعديلٍ في المعاملة نفسها: خطوةٌ واحدة (لقطتان مختلفتان)",()=>{
 /* pushHistory تتخلّص من لقطتين متطابقتين متجاورتين، فحذفٌ وحده يُخفي
    الخطوةَ الشبح. مع جدارٍ قبله تختلف اللقطتان فيظهر العيب. */
 reset();
 B.defineBlock({name:"txn-b4",prims:[]});
 clearHistory();
 edit(()=>{wall(0); B.removeBlock("txn-b4")},"مركّبة");
 eq(steps(),1,"خطوةٌ واحدة لا اثنتان");
 undo();
 ok(B.hasBlock("txn-b4")&&S.walls.length===0,"والتراجعُ يعيد الجدارَ والكتلة معاً");
 ok(!canUndo(),"ولا شبح");
});
group("تعريف كتلة داخل edit فاشلة يُرجَع مع الحالة",()=>{
 reset();
 clearHistory();
 edit(()=>{
  B.defineBlock({name:"txn-b2",prims:[]});
  wall(0);
  throw new Error("فشل بعد التعريف");
 },"مركّبة");
 eq(B.hasBlock("txn-b2"),false,"التعريف رُجع");
 eq(S.walls.length,0,"والجدار");
 ok(!canUndo(),"ولا تاريخ");
});
group("تعريف كتلة منفرداً ما زال خطوةً واحدة",()=>{
 reset(); clearHistory();
 B.defineBlock({name:"txn-b3",prims:[]});
 eq(steps(),1,"خطوةٌ واحدة (الخطاف يعمل خارج المعاملة)");
 undo();
 eq(B.hasBlock("txn-b3"),false,"والتراجع يُزيله");
});
group("transaction: اسمٌ موثّق لـedit بترتيبٍ طبيعي (label, fn)",()=>{
 reset(); clearHistory();
 const r=transaction("خطوة",()=>{wall(0); return 42});
 eq(r,42,"القيمة المُعادة تصل كما تعيدها edit");
 eq(S.walls.length,1,"الكتابة وقعت");
 eq(steps(),1,"خطوةٌ واحدة في التاريخ");
 undo();
 eq(S.walls.length,0,"والتراجعُ يعمل كما مع edit تماماً");
});
group("transaction: الفشل يُرجِع الحالة كـedit سواءً بسواء",()=>{
 reset(); clearHistory();
 const before=snapshot();
 let msg=null; setEditError(m=>{msg=m});
 const r=transaction("فاشلة",()=>{wall(0); throw new Error("عطل")});
 setEditError(null);
 eq(r,undefined,"لا قيمة عند الفشل");
 eq(msg,"عطل","والرسالة تصل");
 ok(snapshot()===before,"والحالة حرفاً كما قبل");
 ok(!canUndo(),"ولا خطوة تاريخٍ شبح");
});
group("joinTxn: edit داخلها تنضمّ ولا تدفع",()=>{
 reset(); clearHistory();
 joinTxn(()=>{
  edit(()=>{wall(0)},"أ");
  edit(()=>{wall(1000)},"ب");
 });
 eq(S.walls.length,2,"الكتابة وقعت");
 eq(steps(),0,"ولا تاريخ — المالك يدفع");
 eq(inTransaction(),false,"والعمق عاد");
 let e=null;
 try{joinTxn(()=>{throw new Error("x")})}catch(err){e=err}
 ok(!!e&&!inTransaction(),"الخطأ يصعد والعمق لا يعلق");
});

/* ═══ trial ═══ */
group("trial: خطأ المُولِّد يُرجِع الحالة ويُطفئ batch والأداة",()=>{
 reset(); rig.clear();
 const before=snapshot();
 function* lines(){
  yield {kind:"tool",tool:"wall"};
  yield {kind:"text",s:"0,0"};
  yield {kind:"text",s:"3000,0"};   /* الأداةُ فعّالةٌ وجدارٌ صُنع */
  throw new Error("iterator failure");
 }
 let error=null;
 try{RUN.trial(lines())}catch(e){error=e}
 eq(error&&error.message,"iterator failure","الخطأ يصل للمستدعي");
 ok(snapshot()===before,"الحالة عادت حرفياً");
 eq(S.walls.length,0,"لا جدارَ نصف منفَّذ");
 eq(REG.BATCH.on,0,"وbatch مُطفأ");
 eq(REG.active(),false,"والأداةُ لا تبقى فعّالةً على حالةٍ ملغاة");
});
group("commit/rollback يرفضان لقطةً فاسدة",()=>{
 reset();
 let a=null,b=null;
 try{RUN.commit({})}catch(e){a=e}
 try{RUN.rollback(null)}catch(e){b=e}
 ok(a&&/غير صالحة/.test(a.message),"commit");
 ok(b&&/غير صالحة/.test(b.message),"rollback");
});
group("trial→commit خطوةٌ واحدة والتراجعُ يعيد الكلّ",()=>{
 reset(); rig.clear(); clearHistory();
 const t=RUN.trial([{kind:"tool",tool:"wall"},{kind:"text",s:"0,0"},
  {kind:"text",s:"3000,0"},{kind:"enter"},{kind:"esc"}]);
 eq(steps(),0,"المعاينة لا تدفع تاريخاً");
 RUN.commit(t,"خطة");
 eq(steps(),1,"commit خطوةٌ واحدة");
 undo();
 eq(S.walls.length,0,"التراجعُ يعيد ما قبل الخطة");
});

/* ═══ الصورة المرجعية ═══ */
const withImg=()=>{
 reset();
 S.underlay.src="data:image/png;base64,AA"; S.underlay.w=100; S.underlay.h=100;
 clearHistory();
};
group("underlay: النقل والدوران والمقياس والمعايرة خطوةٌ واحدة تُتراجَع",()=>{
 withImg();
 S.underlay.x=0; S.underlay.y=0;
 U.move(500,700);
 eq(steps(),1,"النقل");
 undo(); eq(S.underlay.x,0,"تراجع النقل");
 clearHistory();
 U.setRotation(0.5); eq(steps(),1,"الدوران");
 undo(); eq(S.underlay.rot,0,"تراجع الدوران");
 clearHistory();
 const m0=S.underlay.mpp;
 U.setScale(0.5); eq(steps(),1,"المقياس");
 undo(); eq(S.underlay.mpp,m0,"تراجع المقياس");
});
group("underlay: المرفوض لا يكتب ولا يدفع تاريخاً",()=>{
 withImg();
 S.underlay.x=7; S.underlay.rot=0.3; S.underlay.mpp=0.02; S.underlay.opacity=0.8;
 eq(U.move("abc",1),false,"move");
 eq(U.setRotation(NaN),false,"setRotation");
 eq(U.setRotation(""),false,"setRotation('')");
 eq(U.setScale(0),false,"setScale(0)");
 eq(U.setScale(-1),false,"setScale(-1)");
 eq(U.setScale(Infinity),false,"setScale(∞)");
 eq(U.setOpacity("abc"),false,"setOpacity");
 eq(U.setOpacity(undefined),false,"setOpacity(undefined)");
 U.calibrate({x:0,y:0},{x:0,y:0},5);
 U.calibrate({x:0,y:NaN},{x:1,y:0},5);
 deep([S.underlay.x,S.underlay.rot,S.underlay.mpp,S.underlay.opacity],
  [7,0.3,0.02,0.8],"لا شيء تغيّر");
 eq(steps(),0,"ولا خطوة");
});
group("underlay: setScale يُقيَّد كما تُقيّده ensureShape",()=>{
 withImg();
 U.setScale(5000);
 eq(S.underlay.mpp,1000,"الحدّ الأعلى");
 U.setScale(1e-12);
 eq(S.underlay.mpp,1e-9,"والأدنى");
});

/* ═══ المناطق ═══ */
const box=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
group("areas: الخبز والحذف والتثبيت خطوةٌ واحدة تُتراجَع",()=>{
 reset(); clearHistory();
 const a=AR.addArea(box(0,0,3000,3000),"غ");
 eq(steps(),1,"الخبز"); eq(S.areas.length,1,"منطقة");
 AR.delArea(a); eq(steps(),2,"الحذف"); eq(S.areas.length,0,"حُذفت");
 undo(); eq(S.areas.length,1,"تراجع الحذف");
 undo(); eq(S.areas.length,0,"تراجع الخبز");
});
group("areas: الرفضُ يبقى رمياً ولا يترك أثراً",()=>{
 reset(); clearHistory();
 let m1=null,m2=null;
 try{AR.addArea([[0,0],[1,1]],"x")}catch(e){m1=e.message}
 try{AR.addArea(box(0,0,100,100),"x")}catch(e){m2=e.message}
 ok(/ثلاثة/.test(m1||""),"حلقةٌ ناقصة تُرمى");
 ok(/الأصغر المقبول/.test(m2||""),"ومساحةٌ صغيرة");
 eq(S.areas.length,0,"لا منطقة");
 eq(steps(),0,"ولا خطوة");
});
group("areas: الخبز لا يُقدّم النسخة الهندسية (عقد ENT.bump=view)",()=>{
 reset();
 const g=VER.g;
 AR.addArea(box(0,0,3000,3000),"غ");
 eq(VER.g,g,"addArea");
 AR.restamp(S.areas[0]);
 eq(VER.g,g,"restamp");
 AR.delArea(S.areas[0]);
 eq(VER.g,g,"delArea");
});
group("bump: داخلية خفيفة لا تُخفِّض معاملةً هندسية",()=>{
 reset();
 const g=VER.g;
 edit(()=>{
  AR.addArea(box(0,0,3000,3000),"غ");   /* view */
  wall(0);                                /* هندسة */
 },"مركّبة");
 ok(VER.g>g,"النسخة الهندسية تقدّمت — الأقوى يغلب");
 const g2=VER.g;
 edit(()=>{AR.restamp(S.areas[0])},"خارجية افتراضية");
 ok(VER.g>g2,"والافتراضُ الآمن geom لمن لم يُعلن");
});

/* ═══ الطبقات ═══ */
group("layers: كل كاتبٍ خطوةٌ واحدة والتراجعُ يُعيد",()=>{
 reset(); clearHistory();
 const n=LY.layNames()[0];
 LY.setLay(n,"off",1); eq(steps(),1,"setLay");
 ok(!LY.vis(n),"مخفية");
 undo(); ok(LY.vis(n),"تراجع setLay");
 clearHistory();
 LY.isolate(n); eq(steps(),1,"isolate خطوةٌ واحدة لعدّة طبقات");
 undo(); eq(LY.hiddenLayers().length,0,"تراجع isolate كلّها");
 LY.stateSave("حالةٌ"); LY.setLay(n,"lk",1);
 clearHistory();
 eq(LY.stateApply("حالةٌ"),1,"stateApply يُغيّر واحدة");
 eq(steps(),1,"خطوةٌ واحدة");
});
group("layers: المنضمّ داخل edit مركّبة لا يدفع خطوةً ثانية",()=>{
 reset(); clearHistory();
 const n=LY.layNames()[0];
 edit(()=>{LY.setLay(n,"off",1); wall(0); LY.showAll()},"مركّبة");
 eq(steps(),1,"خطوةٌ واحدة");
});

/* ═══ core/modify ═══ */
group("modify: عمليةٌ فاشلة تُرجِع الحالة حرفياً وتُعيد رمي الخطأ",()=>{
 reset();
 const w=wall(0);
 clearHistory();
 const before=snapshot();
 let err=null;
 try{MD.breakWall(w.id,[10,0])}catch(e){err=e}      /* قريبةٌ من الطرف */
 ok(err&&/يجب أن تبعد/.test(err.message),"رسالة السبب تصل");
 ok(snapshot()===before,"الحالة حرفاً");
 eq(steps(),0,"ولا خطوة");
});
group("modify: نجاحٌ منفرد = خطوةٌ واحدة والتراجعُ يُعيد",()=>{
 reset();
 const w=wall(0);
 clearHistory();
 const G=MD.grab([{k:"wall",id:w.id}]);
 MD.copyAll(G,0,1000,3,true);
 eq(S.walls.length,4,"ثلاث نسخ");
 eq(steps(),1,"خطوةٌ واحدة لا N");
 undo();
 eq(S.walls.length,1,"تراجعٌ واحد");
 redo();
 eq(S.walls.length,4,"والإعادة");
});
group("modify: مركّبةٌ داخل edit خارجية = خطوةٌ واحدة",()=>{
 reset();
 const w=wall(0);
 clearHistory();
 edit(()=>{
  const G=MD.grab([{k:"wall",id:w.id}]);
  MD.moveAll(G,0,500);
  MD.breakWall(w.id,[1500,500]);
  MD.copyAll(MD.grab([{k:"wall",id:w.id}]),0,2000,1,true);
 },"مركّبة");
 eq(steps(),1,"خطوةٌ واحدة");
 undo();
 eq(S.walls.length,1,"وتراجعٌ واحد يعيد الأصل");
 eq(S.walls[0].a[1],0,"في موضعه");
});
group("modify: فشلٌ في منتصف مركّبة يُرجِع ما نجح قبله",()=>{
 reset();
 const w=wall(0);
 clearHistory();
 const before=snapshot();
 edit(()=>{
  MD.moveAll(MD.grab([{k:"wall",id:w.id}]),0,500);
  MD.breakWall(w.id,[3,0]);            /* ترمي */
 },"مركّبة");
 ok(snapshot()===before,"النقل الناجح رُجع أيضاً");
 ok(editFailed(),"والفشل مُعلَن");
});
group("modify: dupEnt لما لا يُنسَخ لا يدفع خطوةً",()=>{
 reset(); clearHistory();
 eq(MD.dupEnt({k:"wall",id:"لا-وجود"}),null,"لا كيان");
 eq(steps(),0,"ولا خطوة");
});

/* ═══ batch ═══ */
group("batch.applyField: خطوةٌ واحدة لعدّة عناصر وتُتراجَع دفعةً",()=>{
 reset();
 const a=wall(0), b=wall(2000), c=wall(4000);
 clearHistory();
 const L=[a,b,c].map(x=>({k:"wall",id:x.id}));
 const r=BT.applyField("wall",L,"t","0.30");
 eq(r.done,3,"ثلاثة");
 eq(steps(),1,"خطوةٌ واحدة");
 undo();
 ok(S.walls.every(w=>w.t===200),"التراجعُ يُعيد الكلّ");
});
group("batch.applyField: الحقل المجهول يُرمى لا يُبتلَع",()=>{
 reset();
 let e=null;
 try{BT.applyField("wall",[],"لا-حقل","1")}catch(x){e=x}
 ok(e&&/لا حقل/.test(e.message),"رميٌ برسالةٍ تسمّي الحقل");
});
group("batch: التقارير الجماعية معاملاتٌ ورفضُها يبقى رمياً",()=>{
 reset(); clearHistory();
 let e=null;
 try{BT.nameAreasSeq([],"غ")}catch(x){e=x}
 ok(e&&/لا مناطق/.test(e.message),"nameAreasSeq");
 e=null;
 try{BT.renumberCols([],"C")}catch(x){e=x}
 ok(e&&/لا أعمدة/.test(e.message),"renumberCols");
 eq(steps(),0,"ولا خطوة من المرفوض");
 const a=AR.addArea(box(0,0,3000,3000),"");
 const b=AR.addArea(box(5000,0,2000,2000),"");
 clearHistory();
 BT.nameAreasSeq([{k:"area",id:a.id},{k:"area",id:b.id}],"غ");
 eq(steps(),1,"nameAreasSeq خطوةٌ واحدة");
 /* الافتراضُ صار **مكانياً** لا بالمساحة (§٣): الغرفتانِ في صفٍّ
    واحدٍ (y=0) فالأيمنُ (x=5000) أوّلاً — اتجاهُ القراءةِ العربيّ.
    وترتيبُ المساحةِ باقٍ خياراً صريحاً. */
 eq(S.areas[1].name,"غ 1","الأيمنُ أوّلاً — ترتيبٌ مكانيّ");
 eq(S.areas[0].name,"غ 2","ثم الأيسر");
 undo();
 eq(S.areas[0].name,"","والتراجع");
 BT.nameAreasSeq([{k:"area",id:a.id},{k:"area",id:b.id}],"غ","size");
 eq(S.areas[0].name,"غ 1","وبخيار «size» الأكبرُ أوّلاً كما كان");
 undo();
});
process.exit(summary()?1:0);
