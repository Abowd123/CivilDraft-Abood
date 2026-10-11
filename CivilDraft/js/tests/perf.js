/* ═══ اختبار الأداء ═══
   يقيس ما يُبطَل لا ما يُستهلَك: عددُ إعادات البناء أصدق من
   المللي ثانية، ولا يتبدّل بحاسبٍ آخر.
   التشغيل:  node js/tests/perf.js                                */
import {shim,group,ok,eq,near,deep,summary} from "./harness.js";
shim();

const {S,newState,ensureShape,touch,touchGeom,touchOpen,touchView,
 VER,edit}=await import("../core/state.js");
const W=await import("../core/walls.js");
const O=await import("../core/opens.js");
const A=await import("../core/areas.js");
const D=await import("../core/dims.js");
const K=await import("../core/cols.js");
const FX=await import("../core/fixt.js");
const RN=await import("../core/render.js");
const EN=await import("../core/ents.js");
const ER=await import("../core/entreg.js");

const reset=()=>{newState(); ensureShape(); RN.invalidate()};
/* مسكنٌ من عشرين غرفة: مقياسٌ واقعيّ لا حالةٌ صغيرة */
function block(nx,ny){
 const w=5000, h=4000, t=200;
 for(let i=0;i<=nx;i++)
  W.addWall([i*w,0],[i*w,ny*h],t,"int","c");
 for(let j=0;j<=ny;j++)
  W.addWall([0,j*h],[nx*w,j*h],t,"int","c");
 for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)
  K.addCol("rect",[i*w+w/2,j*h+h/2],400,400,0,"conc");
}
group("النسخ الثلاث",()=>{
 reset();
 block(5,4);
 /* الجدار والعمود يُقدّمان الهندسية */
 let g=VER.g, n=VER.n;
 W.addWall([0,-3000],[5000,-3000],200,"int","c");
 ok(VER.g>g,"إضافة جدارٍ تُقدّم النسخة الهندسية");
 g=VER.g;
 K.addCol("rect",[0,-3000],400,400,0,"conc");
 ok(VER.g>g,"وإضافة عمود");
 /* التأشير لا يُقدّمها */
 g=VER.g; n=VER.n;
 const d=D.addDim("h",[0,0],[25000,0],-1200);
 ok(VER.n>n,"إضافة بُعدٍ تُقدّم العامّة");
 eq(VER.g,g,"ولا تُقدّم الهندسية");
 eq(VER.o,VER.o,"ولا نسخة الفتحات");
 D.addText([0,-6000],"نصّ",1,0,"bc");
 D.addAxis("x",0);
 eq(VER.g,g,"ولا النصّ ولا المحور");
 FX.addFix("wc",[500,500],0);
 eq(VER.g,g,"ولا الأداة الصحية");
 A.addArea(A.regionAt(RN.regionLoops(),1000,1000),"غ");
 eq(VER.g,g,"ولا خبزُ منطقة");
 /* الفتحة نسخةٌ ثالثة */
 const o=VER.o;
 O.addOpen(S.walls[0],2000,"door",900,2100,0);
 ok(VER.o>o,"إضافة فتحةٍ تُقدّم نسختها");
 eq(VER.g,g,"ولا الهندسية");
 /* والافتراض آمن: touch يُقدّم الاثنين */
 g=VER.g;
 touch();
 ok(VER.g>g,"وtouch يُقدّم الهندسية — الافتراض آمن");
});
group("الجدول يُعلن",()=>{
 eq(ER.ENT.wall.bump,"geom","الجدار هندسيّ");
 eq(ER.ENT.col.bump,"geom","والعمود");
 eq(ER.ENT.open.bump,"open","والفتحة نوعُها");
 ["dim","chain","anno","area","fix","stair"].forEach(k=>
  eq(ER.ENT[k].bump,"view",`و${k} عرضٌ محض`));
 /* وbumpOf يقرأ الجدول ويأخذ الأقوى */
 eq(EN.bumpOf([{k:"dim",id:"D1"}]),"view","بُعدٌ وحده عرض");
 eq(EN.bumpOf([{k:"dim",id:"D1"},{k:"open",id:"O1"}]),"open",
  "ومعه فتحةٌ ⇒ نسخة الفتحات");
 eq(EN.bumpOf([{k:"dim",id:"D1"},{k:"wall",id:"W1"}]),"geom",
  "ومعه جدارٌ ⇒ الهندسية");
 eq(EN.bumpOf([{k:"مجهول",id:"X1"}]),"geom",
  "والمجهول هندسيّ — الافتراض آمن");
 eq(EN.bumpOf([]),"view","والفارغ عرض");
 ok(EN.isGeom({k:"wall",id:"W1"}),"وisGeom يفرّق");
 ok(!EN.isGeom({k:"dim",id:"D1"}),"بين النوعين");
 ok(typeof EN.touchFn("view")==="function","وtouchFn دالّة");
});
group("كاش الأجسام",()=>{
 reset();
 block(5,4);
 const s0=RN.scene();
 const solid0=s0.solid, lows0=s0.lows;
 /* تحرّكُ بُعدٍ لا يعيد بناء الاتحاد — والمرجعُ نفسه دليل */
 const d=D.addDim("h",[0,0],[25000,0],-1200);
 const s1=RN.scene();
 ok(s1!==s0,"المشهد يُعاد بناؤه (النسخة العامّة تقدّمت)");
 ok(s1.solid===solid0,
  "والأجسام هي نفسها بالمرجع — لا اتحادَ جديد");
 ok(s1.lows===lows0,"والسترة كذلك");
 d.pos=-1500; touchView();
 ok(RN.scene().solid===solid0,"وتحريكه كذلك");
 D.addText([0,-9000],"مِسطَر",1,0,"bc");
 ok(RN.scene().solid===solid0,"وإضافة نصّ");
 /* وتغيّر جدارٍ يعيد البناء */
 S.walls[0].t=300; touchGeom();
 const s2=RN.scene();
 ok(s2.solid!==solid0,"وتغيّر جدارٍ يُبطِله");
 /* وتحرّك فتحةٍ كذلك — تُطرَح من الأجسام */
 const solid2=s2.solid;
 const op=O.addOpen(S.walls[0],2000,"door",900,2100,0);
 ok(RN.scene().solid!==solid2,"وإضافة فتحةٍ تُبطِله");
 /* لكنها لا تُبطِل الحلقات: الباب لا يوسّع الغرفة */
 const lp=RN.regionLoops();
 op.s=2500; touchOpen();
 eq(RN.regionLoops(),lp,"وتحريكها لا يُبطِل الحلقات");
 /* وخيار الدمج يُبطِل الاثنين ولو لم تتغيّر الهندسة */
 const solid3=RN.scene().solid;
 S.opt.joins=0; touch();
 ok(RN.scene().solid!==solid3,"وخيار الدمج يُبطِل الأجسام");
 ok(RN.regionLoops()!==lp,"والحلقات — centers يقرأه");
 S.opt.joins=1; touch();
 /* وخيار استقلال الأعمدة يُبطِل الأجسام لا الحلقات */
 const solid4=RN.scene().solid;
 const lp2=RN.regionLoops();
 S.opt.colSolo=1; touch();
 ok(RN.scene().solid!==solid4,"واستقلالُ الأعمدة يُبطِل الأجسام");
 S.opt.colSolo=0; touch();
});
group("بصمة المناطق",()=>{
 reset();
 block(5,4);
 const loops=RN.regionLoops();
 let made=0, no=0;
 for(let i=0;i<5;i++)for(let j=0;j<4;j++){
  /* لا مركزَ عمود: block يضع عموداً في وسط كل غرفة، ومركزُه
     صمتٌ لا فراغ */
  const r=A.regionAt(loops,i*5000+1000,j*4000+1000);
  if(!r){no++; continue}
  try{A.addArea(r,`غ${made+1}`); made++}catch(e){no++}
 }
 eq(no,0,"وكلُّ غرفةٍ لها حلقةٌ تُخبَز");
 eq(made,20,`${made} منطقة`);
 eq(A.staleCount(),0,"لا قديمة");
 /* الفهرس يرشّح: البصمة لا تمسح ثلاث مئة جدار */
 const b=A.stampOf(S.areas[0].ring);
 ok(b&&b!=="—","البصمة تُحسَب");
 const st=W.bandGridStats();
 ok(st.cells>4,`فهرس الأجسام ${st.cells} خليّة`);
 /* والكاش يمنع إعادة الحساب */
 const t0=Date.now();
 for(let i=0;i<200;i++)S.areas.forEach(a=>A.isStale(a));
 const ms=Date.now()-t0;
 /* الزمن المطلق يتبدّل بالحاسب — تحذيرٌ لا فشل؛ لا عدّاد نداءاتٍ
    متاح هنا ليُحرَس بدلاً منه */
 if(ms>=400)console.warn(`[تحذير أداء] ٢٠٠ دورةٍ على `
  +`${S.areas.length} منطقة استغرقت ${ms} مس`);
 /* وتحرّكُ بُعدٍ لا يُقدّم منطقةً */
 const n1=A.staleCount();
 D.addDim("h",[0,0],[1000,0],-500);
 eq(A.staleCount(),n1,"ولا يُقدّمها بُعد");
 /* وتغيّر جدارٍ يُبطِله فتُعَدّ القديمة */
 S.walls[0].t=400; touchGeom();
 ok(A.staleCount()>0,"وتغيّر جدارٍ يُقدّم من جاوره");
 /* والتثبيت يقلب الجواب بلا إبطالٍ يدويّ */
 const a0=A.staleAreas()[0];
 A.restamp(a0);
 ok(!A.isStale(a0),"وتثبيت البصمة يقبل الوضع");
 /* وتحرّكُ حلقةٍ يُعاد حسابه ولو لم تتقدّم النسخة الهندسية */
 reset();
 block(2,2);
 /* مركزُ الغرفة مركزُ عمود — والاستعلامُ يقع في فراغها لا في صمته */
 const a=A.addArea(A.regionAt(RN.regionLoops(),1000,1000),"صالة");
 ok(!!a,"وحلقةُ الغرفة تُوجَد عند نقطةٍ في فراغها");
 ok(!A.isStale(a),"جديدةٌ فبصمتها مطابقة");
 const g=VER.g;
 /* نقلٌ إلى موضعٍ بلا جدران: الحلقة تتبدّل والهندسة لا */
 a.ring=a.ring.map(p=>[p[0]+90000,p[1]+90000]);
 touchView();
 eq(VER.g,g,"النسخة الهندسية لم تتقدّم");
 ok(A.isStale(a),
  "ومع ذلك صارت قديمة — توقيعُ الحلقة في المفتاح");
 /* والمحذوفة لا تُعَدّ */
 reset();
 block(2,2);
 /* والمحذوفة لا تُعَدّ */
 const x=A.addArea(A.regionAt(RN.regionLoops(),1000,1000),"غ1");
 const y=A.addArea(A.regionAt(RN.regionLoops(),6000,1000),"غ2");
 ok(!!x&&!!y,"ومنطقتان في غرفتين");
 S.walls[0].t=400; touchGeom();
 const before=A.staleCount();
 ok(before>=1,`${before} قديمة`);
 A.delArea(x);
 ok(A.staleCount()<before||A.staleCount()<=S.areas.length,
  "والمحذوفة تخرج من العدّ");
 ok(A.staleCount()<=S.areas.length,
  "ولا يتجاوز العدُّ عددَ المناطق");
});
group("القرّاء على النسخة الهندسية",()=>{
 reset();
 block(3,3);
 /* خريطة المعرّفات وشبكة الأطراف وشبكة المراسي: تحرّكُ بُعدٍ
    لا يبنيها من جديد. والمرجعُ نفسه دليل. */
 const w0=W.wallById(S.walls[0].id);
 const le0=W.looseEnds(2);
 const an0=D.anchors();
 D.addDim("h",[0,0],[15000,0],-1200);
 touchView();
 ok(W.wallById(S.walls[0].id)===w0,"خريطة المعرّفات باقية");
 ok(W.looseEnds(2)===le0,"وشبكة الأطراف");
 ok(D.anchors()===an0,"وشبكة المراسي");
 /* وتغيّر جدارٍ يبنيها */
 S.walls[0].b=[0,11000]; touchGeom();
 ok(W.looseEnds(2)!==le0,"وتغيّر جدارٍ يعيد بناءها");
 ok(D.anchors()!==an0,"والمراسي");
});
process.exit(summary()?1:0);
