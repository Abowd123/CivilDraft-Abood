/* ═══ حالات الاختبار ═══
   تُقاس بها العقود المعلَنة في هذا المشروع، لا التفاصيل الداخلية.
   التشغيل:  node js/tests/run.js
   الخروج بصفرٍ إن نجحت كلّها. */
import {shim,shimCanvas,group,groupAsync,ok,eq,near,deep,throws,
        noThrow,skip,summary} from "./harness.js";
shim();
shimCanvas();          /* io/png و io/pdf يحتاجانه */

const {S,newState,ensureShape,touch,touchView,edit,editFailed,pushHistory,
 snapshot,undo,redo,pack,loadState,setRefLost,refStore,
 VER}=await import("../core/state.js");
const U=await import("../core/units.js");
const G=await import("../core/geom.js");
const CO=await import("../core/coords.js");
const W=await import("../core/walls.js");
const O=await import("../core/opens.js");
const A=await import("../core/areas.js");
const D=await import("../core/dims.js");
const K=await import("../core/cols.js");
const FX=await import("../core/fixt.js");
const ST=await import("../core/stairs.js");
const SH=await import("../core/sheet.js");
const L=await import("../core/layers.js");
const RN=await import("../core/render.js");
const EN=await import("../core/ents.js");
const ER=await import("../core/entreg.js");
const MD=await import("../core/modify.js");
const BT=await import("../core/batch.js");
const RF=await import("../core/ref.js");
const IN=await import("../core/inspect.js");
const DXF=await import("../io/dxf.js");
const DXI=await import("../io/dxfin.js");
const CP1=await import("../io/cp1256.js");
const SVG=await import("../io/svg.js");
const STY=await import("../io/style.js");
const PRJ=await import("../io/project.js");
const SI=await import("../core/sindex.js");
const PNG=await import("../io/png.js");
const PDF=await import("../io/pdf.js");

const reset=()=>{newState(); ensureShape(); RN.invalidate()};
/* غرفة مغلقة: مستطيل بأربعة جدران مركزية */
function room(w,h,t){
 const T=t||200;
 const Q=[[0,0],[w,0],[w,h],[0,h]];
 return Q.map((p,i)=>W.addWall(p,Q[(i+1)%4],T,"ext","c"));
}
/* ═══ ١ · الوحدات والإحداثيات ═══ */
group("الوحدات والإحداثيات",()=>{
 eq(U.M("3"),3000,"3 ⇒ ٣٠٠٠ مم");
 eq(U.M("3.5"),3500,"3.5 ⇒ ٣٥٠٠");
 eq(U.M("٤"),4000,"الرقم العربي يُقرأ");
 eq(U.M("2,5"),2500,"الفاصلة العربية عشرية");
 eq(U.mnum(1500),"1.5","المخرَج بالمتر");
 eq(U.deg(-90),270,"تطبيع الزاوية");
 eq(U.clamp(15,0,10),10,"الحدّ الأعلى");
 const a=CO.parsePt("3,4",null,null);
 deep(a.p,[3000,4000],"المطلق");
 const b=CO.parsePt("@5,0",[1000,1000],null);
 deep(b.p,[6000,1000],"النسبي");
 const c=CO.parsePt("@10<90",[0,0],null);
 near(c.p[1],10000,1,"القطبي: y=١٠ م");
 near(c.p[0],0,1,"القطبي: x=٠");
 const d=CO.parsePt("5",[0,0],[1,0]);
 deep(d.p,[5000,0],"الطول على الاتجاه");
 eq(CO.parsePt("<30",[0,0],null).k,"ang","قفل الزاوية يُميَّز");
 const e=CO.parsePt("9x14",[0,0],null);
 eq(e.k,"dim","المقاس يُميَّز");
 eq(CO.parsePt("سلام",null,null),null,"النصّ ليس إحداثياً");
 const cn=CO.constrain([0,0],[1000,120],"ortho");
 near(cn.p[1],0,1,"التعامد يُسقِط y");
 /* عزل الاتجاه: محرفان غير مرئيَّين حول المقدار وحده */
 eq(U.ltr("9×14"),"\u20669×14\u2069","ltr يعزل");
 eq(U.dim2(9,14,"م"),"\u20669×14\u2069 م","والوحدة خارج العزل");
 eq(U.scl(100),"\u20661:100\u2069","والمقياس معزول");
 eq(U.rng2(500,4500,"م"),"\u20660.50–4.50\u2069 م","والمدى");
 eq(U.pt2([3000,4000]),"\u20663.00 , 4.00\u2069","والنقطة");
 /* الترتيب المنطقي لا يتغيّر — العزل عرضٌ لا تحويل */
 ok(U.dim2(9,14).replace(/[\u2066\u2069]/g,"")==="9×14",
  "والمحتوى كما هو بعد نزع المحارف");
});
/* ═══ ٢ · الهندسة ═══ */
group("الهندسة",()=>{
 const sq=[[0,0],[100,0],[100,100],[0,100]];
 eq(G.pArea(sq),10000,"مساحة المربّع");
 ok(G.pip(sq,50,50),"نقطة داخلية");
 ok(!G.pip(sq,150,50),"نقطة خارجية");
 deep(G.centroid(sq),[50,50],"المركز");
 near(G.perim(sq),400,1,"المحيط");
 const x=G.lineX([0,0],[10,0],[5,-5],[5,5]);
 deep(x,[5,0],"تقاطع مستقيمين");
 eq(G.lineX([0,0],[10,0],[0,1],[10,1]),null,"المتوازيان لا يتقاطعان");
 const bp=G.bandPoly(0,0,100,0,20);
 eq(bp.length,4,"الشريط أربع نقاط");
 near(Math.abs(G.pArea(bp)),2000,1,"مساحة الشريط");
 /* الاتحاد: مربّعان متلاصقان ⇒ حلقة واحدة */
 const u=G.polyBool([
  [[0,0],[100,0],[100,100],[0,100]],
  [[90,0],[190,0],[190,100],[90,100]]]);
 eq(u.length,1,"الاتحاد يدمج المتلاصقين");
 near(Math.abs(G.pArea(u[0])),19000,60,"مساحة الاتحاد");
 const h=G.hull([[0,0],[50,10],[100,0],[100,100],[0,100]]);
 ok(h.length<=5,"الهيكل المحدَّب لا يزيد على المدخل");
 ok(G.cleanRing([[0,0],[0,0],[100,0],[100,100]],2).length===3,
  "cleanRing يحذف المكرّر");
});
/* ═══ ٣ · الجدران: ما رسمته يُخزَّن ═══ */
group("الجدران",()=>{
 reset();
 const w=W.addWall([0,0],[5000,0],200,"ext","c");
 eq(W.wallLen(w),5000,"الطول ٥ م");
 eq(w.t,200,"السماكة كما طُلبت");
 near(W.dir(w).ang,0,0.01,"الزاوية صفر");
 deep(W.band(w),[[0,100],[5000,100],[5000,-100],[0,-100]],
  "الجسم المركزي متناظر");
 /* المحاذاة l: الجسم يمتدّ إلى يسار المسار (n=(-uy,ux)) */
 const l=W.addWall([0,1000],[5000,1000],200,"int","l");
 const cl=W.centerLine(l);
 near(cl.a[1],900,1,"align=l يُزيح المحور −t/2");
 const bl=W.band(l);
 near(Math.min(...bl.map(p=>p[1])),800,1,"الوجه السفلي عند ٠٫٨");
 near(Math.max(...bl.map(p=>p[1])),1000,1,
  "الوجه العلوي على المسار نفسه");
 throws(()=>W.addWall([0,0],[10,0],200,"int","c"),/أقل|أقصر/,
  "الجدار الأقصر من ٥ سم يُرفَض");
 /* الأطراف الحرّة معلومةُ عرضٍ لا تعديل */
 reset();
 W.addWall([0,0],[3000,0],200,"int","c");
 W.addWall([3050,0],[3050,3000],200,"int","c");
 eq(W.looseEnds(2).length,4,"أربعة أطراف حرّة (لا لحم تلقائي)");
 eq(W.looseEnds(100).length,2,"بتفاوت ١٠ سم يبقى طرفان");
 const before=JSON.stringify(S.walls);
 W.looseEnds(100);
 eq(JSON.stringify(S.walls),before,"الفحص لا يعدّل البيانات");
});
/* ═══ ٤ · الفتحات: لا زحف ولا تقليم ═══ */
group("الفتحات",()=>{
 reset();
 const w=W.addWall([0,0],[5000,0],200,"ext","c");
 const o=O.addOpen(w,2500,"door",900,2100,0);
 eq(o.s,2500,"الموضع كما طُلب");
 eq(O.openState(o),"ok","سليمة");
 deep(O.span(o),[2050,2950],"المدى");
 throws(()=>O.addOpen(w,2600,"window",900,1400,900),
  /تتراكب/,"التراكب يُرفَض ويُسمّى الجارَ");
 throws(()=>O.addOpen(w,50,"door",900,2100,0),
  /يخرج|المدى/,"الخروج عن المدى يُرفَض ويُذكَر المسموح");
 throws(()=>O.addOpen(w,2500,"door",9000,2100,0),
  /يتّسع|الأقصى/,"ما لا يتّسع يُرفَض ويُذكَر الأقصى");
 const al=O.allowed(w,900,o);
 eq(al.lo,500,"أدنى موضع = نصف العرض + حاشية");
 eq(al.hi,4500,"أقصى موضع");
 /* تقصير الجدار لا يزحف الفتحة الباقية */
 w.b=[2600,0];
 touch();
 eq(o.s,2500,"الفتحة لم تُزحَف بتقصير الجدار");
 eq(O.openState(o),"over","بل صارت معطوبة — تقريرٌ لا إصلاح");
 eq(O.badOpens().length,1,"تُعَدّ في المعطوبة");
 /* الحذف يعيد الجدار كاملاً: الطرح عرضٌ لا بيانات */
 reset();
 const w2=W.addWall([0,0],[5000,0],200,"ext","c");
 const o2=O.addOpen(w2,2500,"door",900,2100,0);
 const withOpen=o2.id.length;
 O.delOpen(o2);
 RN.invalidate();
 const after=RN.scene().solid;
 eq(after.length,1,"بعد الحذف حلقة واحدة");
 near(Math.abs(G.pArea(after[0])),5000*200,2000,
  "الجدار عاد كاملاً بلا أثر");
 ok(withOpen>=1,"وقبل الحذف كان مقطوعاً");
});
/* ═══ ٥ · العرض: الدمج والطرح ═══ */
group("العرض",()=>{
 reset();
 room(6000,4000,200);
 const sc=RN.scene();
 eq(sc.solid.length,2,"الغرفة: حلقة خارجية وداخلية");
 const ar=sc.solid.map(l=>Math.abs(G.pArea(l))).sort((a,b)=>b-a);
 near(ar[0],6200*4200,1000,"الحلقة الخارجية");
 near(ar[1],5800*3800,1000,"الحلقة الداخلية");
 /* الحلقات تتجاهل الفتحات: الباب لا يوسّع الغرفة */
 const w=S.walls[0];
 O.addOpen(w,3000,"door",1000,2100,0);
 RN.invalidate();
 const lp=RN.regionLoops();
 const inner=lp.map(l=>Math.abs(G.pArea(l))).sort((a,b)=>a-b)[0];
 near(inner,5800*3800,1000,"الحلقة الداخلية لم تتسرّب من الباب");
 /* الأعمدة تدخل الحلقات ولو عُرضت مستقلّة */
 K.addCol("rect",[3000,2000],400,400,0,"conc");
 RN.invalidate();
 eq(RN.regionLoops().length,3,"العمود المنفرد يصنع حلقة ثالثة");
 /* الكوّة تُرقّق ولا تقطع */
 reset();
 const w3=W.addWall([0,0],[4000,0],300,"int","c");
 O.addOpen(w3,2000,"niche",600,1200,900,{dep:120});
 RN.invalidate();
 eq(RN.scene().solid.length,1,"الكوّة لا تقطع الجسم");
});
/* ═══ ٦ · المناطق: خبزٌ مرّةً وبصمةٌ تُنبّه ═══ */
group("المناطق",()=>{
 reset();
 room(6000,4000,200);
 const c=[3000,2000];
 const ring=A.regionAt(RN.regionLoops(),c[0],c[1]);
 ok(!!ring,"وُجدت الحلقة المحيطة");
 const a=A.addArea(ring,"مجلس");
 near(A.netArea(a),5800*3800,2000,"المساحة صافية بين الوجوه");
 ok(!A.isStale(a),"جديدة فبصمتها مطابقة");
 /* تغيير جدار: المنطقة لا تتحرّك، لكنها تصير قديمة */
 const snapArea=JSON.stringify(a.ring);
 S.walls[0].t=300;
 touch();
 eq(JSON.stringify(a.ring),snapArea,"الحلقة المخزَّنة لم تُمَسّ");
 ok(A.isStale(a),"صارت «قديمة» — تنبيهٌ لا إصلاح");
 eq(A.staleAreas().length,1,"تُعَدّ في القديمة");
 /* التثبيت يقبل الوضع · التحديث يعيد الخبز */
 A.restamp(a);
 ok(!A.isStale(a),"التثبيت يقبل البصمة بلا تغيير الحلقة");
 S.walls[0].t=400; touch(); RN.invalidate();
 const r=A.rebake(a,RN.regionLoops());
 ok(r.after!==r.before,"التحديث يعيد الخبز ويذكر الفرق");
 ok(!A.isStale(a),"وبعده ليست قديمة");
 /* الفتحة لا تغيّر البصمة: الباب ليس تغييراً هندسياً للغرفة */
 const st0=A.stampOf(a.ring);
 O.addOpen(S.walls[1],2000,"door",900,2100,0);
 eq(A.stampOf(a.ring),st0,"إضافة باب لا تُقدِّم المنطقة");
 throws(()=>A.addArea([[0,0],[100,0],[100,100],[0,100]]),
  /الأصغر|أقلّ/,"المنطقة الضئيلة تُرفَض بذكر الحدّ");
});
/* ═══ ٧ · التأشير: البُعد لا يزحف والسلسلة تُكتَب ═══ */
group("التأشير",()=>{
 reset();
 const d=D.addDim("h",[0,0],[5000,0],-800);
 eq(D.dimValue(d),5000,"المقاس من نقطتيه");
 eq(D.dimText(d),"5.00","الصيغة بعشريتين");
 d.txt="≈5";
 eq(D.dimText(d),"≈5","النصّ البديل يُعرَض");
 ok(D.isOverridden(d),"ويُعلَم أنه بديل");
 delete d.txt;
 eq(D.dimText(d),"5.00","إفراغه يعيد المقاس");
 /* البُعد لا يرتبط بجدار: يبقى حيث هو ويُبلَّغ */
 const w=W.addWall([0,0],[5000,0],200,"int","c");
 touch();
 ok(!D.dimLoose(d,60),"طرفاه على هندسة");
 w.b=[3000,0]; touch();
 eq(D.dimValue(d),5000,"البُعد لم يتغيّر بتقصير الجدار");
 ok(D.dimLoose(d,30),"بل صار «معلَّقاً» — تقرير");
 /* السلسلة قيَمٌ مكتوبة */
 const V=D.parseVals("3 2.5 4");
 deep(V,[3000,2500,4000],"القراءة");
 deep(D.parseVals("1.2*3"),[1200,1200,1200],"التكرار");
 throws(()=>D.parseVals("سلام"),/ليست قيمة/,"غير الرقم يُرفَض");
 const ch=D.addChain("h",[0,0],-1500,V,1);
 eq(D.chainSum(ch),9500,"المجموع");
 deep(D.chainBounds(ch),[0,3000,5500,9500],"الحدود");
 const cmp=D.chainCompare(ch,60);
 eq(D.chainSum(ch),9500,"المقارنة لم تُعدّل المجموع");
 deep(ch.vals,V,"ولا القيَم — تقريرٌ محض");
 ok(cmp.rows.length===4,"تقرير لكل حدّ");
 const lv=D.addLevel([0,0],-1500,"ت.م");
 eq(D.levelStr(lv),"ت.م −1.500","المنسوب السالب بعلامته");
});
/* ═══ ٨ · الأعمدة والأدوات والدرج ═══ */
group("الأجزاء",()=>{
 reset();
 const c=K.addCol("rect",[1000,1000],400,600,0,"conc","C1");
 eq(K.colW(c),400,"العرض"); eq(K.colH(c),600,"العمق");
 near(K.colArea(c),240000,1,"المساحة");
 eq(K.nextTag("C"),"C2","الترقيم التالي");
 throws(()=>K.addCol("rect",[1005,1000],400,400,0,"conc"),
  /المركز نفسه/,"العمود على المركز نفسه يُرفَض بالإحداثي");
 const cc=K.addCol("circ",[3000,1000],500);
 eq(K.colH(cc),500,"الدائري: العمق = القطر");
 eq(K.colPoly(cc).length,32,"الدائرة ٣٢ ضلعاً في الاتحاد");
 /* الأداة: الأصل ظهرها */
 const f=FX.addFix("wc",[0,0],0);
 const p=FX.fixPoly(f);
 near(p[0][1],0,1,"الظهر على v=0");
 near(p[2][1],FX.fixD(f),1,"الأمام على v=d");
 const sn=FX.snapToWall([2000,150],1500);
 eq(sn,null,"لا جدار ⇒ لا إلصاق");
 W.addWall([0,1000],[5000,1000],200,"int","c"); touch();
 const sn2=FX.snapToWall([2000,1200],1500);
 ok(!!sn2,"وُجد وجه جدار");
 near(sn2.p[1],1100,2,"أُلصِق على الوجه الأعلى");
 near(sn2.rot,0,1,"والدوران يوجّه الظهر إليه");
 /* الدرج: يُقاس ولا يُصحَّح */
 reset();
 const s=ST.addStair([0,0],[4000,0],1100,17,{h:3000});
 const g=ST.stGeom(s);
 eq(g.treads,16,"النائمات = القوائم − ١");
 near(g.tread,250,1,"النائمة ٢٥ سم");
 near(g.rise,176.5,1,"القائمة");
 const chk=ST.stCheck(s);
 near(chk.rule,2*g.rise+g.tread,1,"قاعدة 2ق+ن");
 const n0=s.flights[0].n, L0=ST.stGeom(s).L;
 ST.stCheck(s);
 eq(s.flights[0].n,n0,"الفحص لم يغيّر عدد القوائم");
 near(ST.stGeom(s).L,L0,1,"ولا الطول");
 const bad=ST.addStair([0,3000],[2000,3000],700,20,{h:3000});
 ok(!ST.stCheck(bad).ok,"الدرج الضيّق الحادّ يُبلَّغ");
 ok(ST.stCheck(bad).msgs.length>=2,"بعدّة ملاحظات");
 ok(ST.stCheck({a:[0,0],b:[0,0],w:1000,n:10}).rise===0,
  "الدرج الصفري يعيد حقولاً كاملة لا ينكسر");
});
/* ═══ ٩ · الطبقات: المخفيّ خارج كلّ شيء ═══ */
group("الطبقات",()=>{
 reset();
 room(6000,4000,200);
 const w=S.walls[0];
 O.addOpen(w,3000,"door",900,2100,0);
 K.addCol("rect",[500,500],400,400,0,"conc");
 eq(L.hiddenCount(),0,"لا مخفيّ ابتداءً");
 L.toggleOff("A-COLS");
 ok(!L.vis("A-COLS"),"الطبقة مخفيّة");
 eq(L.hiddenCount(),1,"يُعَدّ الكيان المخفيّ");
 ok(!L.pickable({k:"col",id:S.cols[0].id}),"المخفيّ لا يُحدَّد");
 RN.invalidate();
 const P=RN.scene().P;
 ok(!P.some(g=>g.L==="A-COLS"),"ولا يُرسَم ولا يُصدَّر");
 /* لكن الهندسة لا تُخفى */
 eq(RN.regionLoops().length,3,"الحلقات ما زالت تشمل العمود");
 L.showAll();
 ok(L.vis("A-COLS"),"أظهر الكل يعيده");
 L.toggleLock("A-WALL");
 ok(L.locked("A-WALL"),"الطبقة مقفلة");
 ok(!L.pickable({k:"wall",id:w.id}),"المقفل لا يُحدَّد");
 RN.invalidate();
 ok(RN.scene().P.some(g=>g.L==="A-WALL"),"لكنه يُرى");
 const r=EN.delEnts([{k:"wall",id:w.id}]);
 eq(r.walls,0,"ولا يُحذَف");
 eq(r.skipped,1,"ويُذكَر أنه تُخطّي");
 L.unlockAll();
});
/* ═══ ١٠ · الكيانات والحذف ═══ */
group("الكيانات",()=>{
 reset();
 room(6000,4000,200);
 const w=S.walls[0];
 O.addOpen(w,2000,"door",900,2100,0);
 O.addOpen(w,4000,"window",1200,1400,900);
 eq(O.opensOf(w.id).length,2,"فتحتان على الجدار");
 const r=EN.delEnts([{k:"wall",id:w.id}]);
 eq(r.walls,1,"حُذف الجدار");
 eq(r.opens,2,"وفتحتاه معه — الحاضن زال");
 eq(S.opens.length,0,"لم تبقَ فتحة يتيمة");
 /* المنطقة لا تُحذَف بحذف جدار */
 reset();
 room(6000,4000,200);
 const a=A.addArea(A.regionAt(RN.regionLoops(),3000,2000),"غرفة");
 EN.delEnts([{k:"wall",id:S.walls[0].id}]);
 eq(S.areas.length,1,"المنطقة باقية");
 ok(A.isStale(a),"لكنها صارت قديمة");
 /* الإصابة بترتيب الصِّغَر */
 reset();
 W.addWall([0,0],[5000,0],400,"ext","c");
 const c=K.addCol("rect",[2000,0],400,400,0,"conc");
 const hit=EN.hitTest(2000,0,150);
 eq(hit.k,"col","العمود يسبق الجدار في الإصابة");
 eq(hit.id,c.id,"وبمعرّفه");
 /* المقابض */
 eq(EN.gripsOf({k:"wall",id:S.walls[0].id}).length,3,
  "الجدار ثلاثة مقابض");
 eq(EN.gripsOf({k:"col",id:c.id}).length,3,
  "العمود المستطيل: مركز ومقاس ودوران");
 eq(EN.gripsOf({k:"col",id:K.addCol("circ",[9000,0],400).id}).length,
  2,"والدائري: مركز وقطر");
});
/* ═══ ١١ · التعديل: من اللقطة لا من الحالة ═══ */
group("التعديل",()=>{
 reset();
 const w=W.addWall([0,0],[5000,0],200,"int","c");
 O.addOpen(w,2500,"door",900,2100,0);
 const Gr=MD.grab([{k:"wall",id:w.id}]);
 MD.moveAll(Gr,1000,1000);
 deep(w.a,[1000,1000],"النقل من اللقطة");
 MD.moveAll(Gr,2000,0);
 deep(w.a,[2000,0],"السحب المتكرّر لا يتراكم");
 eq(O.opensOf(w.id)[0].s,2500,"الفتحة تبعت مجّاناً (s نسبيّ)");
 /* المرآة تقلب المحاذاة وجهة الفتح */
 reset();
 const w2=W.addWall([0,0],[5000,0],200,"int","l");
 const o2=O.addOpen(w2,2500,"door",900,2100,0);
 const sw0=o2.swing;
 MD.mirrorAll(MD.grab([{k:"wall",id:w2.id}]),[0,0],[0,1000],false);
 eq(w2.align,"r","align l ⇒ r فيبقى الجسم على وجهه");
 ok(o2.swing!==sw0,"وجهة فتح الباب تُقلَب");
 /* الدوران يرفض البُعد الأفقي بغير مضاعفات ٩٠ */
 reset();
 const d=D.addDim("h",[0,0],[5000,0],-800);
 const r1=MD.rotateAll(MD.grab([{k:"dim",id:d.id}]),[0,0],37,false);
 eq(r1.refused.length,1,"رُفض البُعد الأفقي بزاوية ٣٧°");
 eq(D.dimValue(d),5000,"ولم يُمَسّ — لا رقمَ خاطئاً بهيئة يقين");
 const r2=MD.rotateAll(MD.grab([{k:"dim",id:d.id}]),[0,0],90,false);
 eq(r2.refused.length,0,"وقُبل بـ ٩٠°");
 eq(d.kind,"v","وتبدّل نوعه إلى رأسي");
 /* القطع: الفتحة العابرة تُحذَف والباقية تنتقل */
 reset();
 const w3=W.addWall([0,0],[8000,0],200,"int","c");
 O.addOpen(w3,1000,"door",800,2100,0);
 O.addOpen(w3,4000,"window",1000,1400,900);
 O.addOpen(w3,7000,"door",800,2100,0);
 const br=MD.breakWall(w3.id,[4000,0]);
 eq(br.lost,1,"الفتحة على نقطة القطع حُذفت");
 eq(br.moved,1,"وما بعدها انتقل إلى الجدار الجديد");
 eq(O.opensOf(w3.id).length,1,"وبقيت واحدة على الأصل");
 eq(O.opensOf(br.nw.id)[0].s,3000,"وأُعيد قياس s من البداية الجديدة");
 throws(()=>MD.breakWall(w3.id,[10,0]),/تبعد/,
  "القطع قرب الطرف يُرفَض بذكر الحدّ");
 /* اللحم: خطّة تُعرَض ثم تُطبَّق */
 reset();
 W.addWall([0,0],[3000,0],200,"int","c");
 W.addWall([3040,0],[3040,3000],200,"int","c");
 const pl=MD.weldPlan(S.walls.map(x=>x.id),50);
 ok(pl.moves.length>0,"الخطّة تعدّ الأطراف التي ستتحرّك");
 ok(pl.moves.every(m=>m.d<=50),"كلّها داخل التفاوت");
 const b4=JSON.stringify(S.walls);
 MD.weldPlan(S.walls.map(x=>x.id),50);
 eq(JSON.stringify(S.walls),b4,"التخطيط وحده لا يحرّك شيئاً");
 const ap=MD.weldApply(pl);
 ok(ap.moved>0,"والتطبيق ينفّذ الخطّة");
 eq(MD.weldPlan(S.walls.map(x=>x.id),50).moves.length,0,
  "وبعده لا يبقى ما يُلحَم");
 /* الشدّ لا يمسّ الفتحات */
 reset();
 const w4=W.addWall([0,0],[5000,0],200,"int","c");
 O.addOpen(w4,4500,"door",800,2100,0);
 const sg=MD.stretchGrab({x0:4000,y0:-500,x1:6000,y1:500});
 MD.stretchApply(sg,-2000,0);
 eq(W.wallLen(w4),3000,"قُصِر الجدار");
 eq(O.opensOf(w4.id)[0].s,4500,"والفتحة لم تُزحَف ولم تُحذَف");
 eq(O.openState(O.opensOf(w4.id)[0]),"over","بل تُبلَّغ معطوبة");
});
/* ═══ الحقول المشتقّة في التحويل ═══
   المرآة والدوران يقرآن اللقطة لا الحالة، فالحقول المميّزة
   (kind · axis · rot) يجب أن تنجو من كل مسار. */
group("المرآة والدوران",()=>{
 reset();
 /* عمود حول محورٍ رأسي: الزاوية بالدرجات لا بالراديان */
 const c=K.addCol("rect",[2000,0],600,400,30,"conc");
 MD.mirrorAll(MD.grab([{k:"col",id:c.id}]),[0,0],[0,1000],false);
 near(c.x,-2000,1,"x انعكس");
 near(c.rot,150,0.02,"والدوران 2×90−30 = 150° لا 3.14°");
 /* بُعد أفقي حول محورٍ رأسي: يُقبَل وpos محفوظ */
 const d=D.addDim("h",[0,0],[5000,0],-800);
 const r=MD.mirrorAll(MD.grab([{k:"dim",id:d.id}]),
  [0,0],[0,1000],false);
 eq(r.refused.length,0,"المحور الرأسي محورٌ قائم");
 eq(d.kind,"h","والنوع لا يتبدّل");
 eq(d.pos,-800,"وموضع الخطّ لم ينزل على الهندسة");
 eq(D.dimValue(d),5000,"والمقاس محفوظ");
 /* حول قطريّ: يتبدّل النوع فلا يُقاس المسقط الخطأ */
 const d2=D.addDim("h",[0,0],[5000,0],-800);
 MD.mirrorAll(MD.grab([{k:"dim",id:d2.id}]),[0,0],[1000,1000],false);
 eq(d2.kind,"v","القطريّ يبدّل الأفقي رأسياً");
 eq(D.dimValue(d2),5000,"والمقاس لا يصير صفراً");
 /* الدوران ٩٠°: pos يدور مع خطّه */
 const d3=D.addDim("h",[0,0],[5000,0],-800);
 MD.rotateAll(MD.grab([{k:"dim",id:d3.id}]),[0,0],90,false);
 eq(d3.kind,"v","صار رأسياً");
 eq(d3.pos,800,"وموضع خطّه دار معه لا صُفِّر");
 /* السلسلة: المحور من اللقطة */
 const ch=D.addChain("h",[0,0],-1500,[3000,2000],0);
 MD.mirrorAll(MD.grab([{k:"chain",id:ch.id}]),[0,0],[0,1000],false);
 eq(ch.axis,"h","المحور الرأسي لا يبدّل السلسلة الأفقية");
 deep(ch.vals,[3000,2000],"والقيَم مكتوبة فلا تُمَسّ");
});
/* ═══ اللواحق في سطر الإدخال ═══ */
group("لواحق الوحدات",()=>{
 eq(CO.parsePt("50cm",[0,0],[1,0]).p[0],500,
  "50cm ⇒ 0.50 م لا 50 م");
 eq(CO.parsePt("200mm",[0,0],[1,0]).p[0],200,"و200mm ⇒ 0.20 م");
 eq(CO.parsePt("@2m<0",[0,0],null).p[0],2000,"واللاحقة في القطبي");
 eq(CO.parsePt("سم",[0,0],[1,0]),null,"واللاحقة وحدها ليست طولاً");
 eq(U.Mx("سماكة"),null,"Mx ترفض ما لا تفهم");
 eq(U.M("سماكة"),0,"وM المتساهل يبقى على سلوكه");
 eq(U.Nx("خمسة"),null,"وNx كذلك");
});
/* ═══ محاذاة المستطيل ═══
   التسمية عقدٌ مع المستخدم: «داخلي صافٍ» يجب أن يعطي المقاس
   المكتوب صافياً بين الوجوه. */
group("محاذاة المستطيل",()=>{
 reset();
 const t=250, LW=9000, LH=6000;
 const Q=[[0,0],[LW,0],[LW,LH],[0,LH]];
 for(let i=0;i<4;i++)W.addWall(Q[i],Q[(i+1)%4],t,"ext","l");
 RN.invalidate();
 const A=RN.regionLoops().map(l=>Math.abs(G.pArea(l)))
  .sort((a,b)=>b-a);
 near(A[1],LW*LH,6000,"align=l ⇒ المرسوم صافٍ داخلياً");
 near(A[0],(LW+2*t)*(LH+2*t),9000,"والجسم يمتدّ خارجاً");
 reset();
 for(let i=0;i<4;i++)W.addWall(Q[i],Q[(i+1)%4],t,"ext","r");
 RN.invalidate();
 const B=RN.regionLoops().map(l=>Math.abs(G.pArea(l)))
  .sort((a,b)=>b-a);
 near(B[0],LW*LH,6000,"وalign=r ⇒ المرسوم كلّيّ خارجياً");
});
/* ═══ المُثبِّت يرفض ما ليس طولاً ═══ */
group("تصديق القيَم",()=>{
 reset();
 const w=W.addWall([0,0],[5000,0],200,"int","c");
 const r=BT.applyField("wall",[{k:"wall",id:w.id}],"t","سماكة");
 eq(r.refused.length,1,"«سماكة» تُرفَض");
 eq(w.t,200,"ولا تصير 5 سم");
 ok(/ليس طولاً/.test(r.refused[0].msg),"والرسالة تسمّي السبب");
});
/* ═══ ١٢ · التعديل الجماعي: لا يُكتب حقلٌ لم تكتبه ═══ */
group("التعديل الجماعي",()=>{
 reset();
 const a=W.addWall([0,0],[5000,0],200,"int","c");
 const b=W.addWall([0,1000],[5000,1000],300,"ext","l");
 const sel=[{k:"wall",id:a.id},{k:"wall",id:b.id}];
 const rt=BT.readField("wall",sel,"t");
 eq(rt.mixed,1,"السماكة مختلفة ⇒ متعدّد");
 eq(rt.value,null,"فلا قيمة تُعرَض");
 const ra=BT.readField("wall",sel,"align");
 eq(ra.mixed,1,"والمحاذاة كذلك");
 b.t=200; touch();
 eq(BT.readField("wall",sel,"t").value,200,"وبتساويهما تُقرأ");
 const ap=BT.applyField("wall",sel,"t","0.25");
 eq(ap.done,2,"كُتبت على الاثنين");
 eq(a.t,250,"الأول"); eq(b.t,250,"الثاني");
 /* من لا يملك الحقل يُعَدّ ولا يُلام */
 reset();
 const w=W.addWall([0,0],[5000,0],250,"int","c");
 const o1=O.addOpen(w,1500,"door",900,2100,0);
 const o2=O.addOpen(w,3500,"window",1200,1400,900);
 const so=[{k:"open",id:o1.id},{k:"open",id:o2.id}];
 const rs=BT.applyField("open",so,"swing","right");
 eq(rs.done,1,"جهة الفتح تُكتَب على الباب وحده");
 eq(rs.noown,1,"والشباك يُعَدّ لا يملكها");
 ok(!BT.ownsField("open",o2,"swing"),"وذلك صريح لا استنتاج");
 /* المُثبِّت يتحقّق قبل أن يكتب */
 const nw=O.addOpen(w,4600,"niche",600,1200,900,{dep:200});
 const rf=BT.applyField("wall",[{k:"wall",id:w.id}],"t","0.15");
 eq(rf.refused.length,1,"سماكة لا تكفي الكوّة تُرفَض");
 eq(w.t,250,"ولم يُكتب شيء — لا أثر نصفيّ");
 ok(/كوّة/.test(rf.refused[0].msg),"والرسالة تسمّي السبب");
 /* الترقيم من أعلى اليمين */
 reset();
 const c1=K.addCol("rect",[0,0],400,400,0,"conc");
 const c2=K.addCol("rect",[5000,5000],400,400,0,"conc");
 const rr=BT.renumberCols([{k:"col",id:c1.id},{k:"col",id:c2.id}],"C");
 eq(rr.n,2,"عمودان");
 eq(c2.tag,"C1","الأعلى يميناً أوّلاً");
 eq(c1.tag,"C2","ثم الأسفل");
});
/* ═══ ١٣ · التاريخ والحالة ═══ */
group("التاريخ",()=>{
 reset();
 const w=W.addWall([0,0],[5000,0],200,"int","c");
 const v0=VER.n;
 const sn=snapshot();
 pushHistory(sn);
 w.t=400; touch();
 ok(VER.n>v0,"النسخة تتقدّم بالتغيير");
 ok(undo(),"التراجع متاح");
 eq(W.wallById(w.id).t,200,"وأعاد السماكة");
 ok(redo(),"والإعادة متاحة");
 eq(W.wallById(w.id).t,400,"وأعادت التغيير");
 /* الحفظ والفتح: كل شيء صريح */
 reset();
 room(6000,4000,200);
 O.addOpen(S.walls[0],3000,"door",900,2100,0);
 A.addArea(A.regionAt(RN.regionLoops(),3000,2000),"مجلس");
 K.addCol("rect",[1000,1000],400,400,0,"conc","C1");
 D.addDim("h",[0,0],[6000,0],-900);
 L.toggleOff("A-DIMS");
 const txt=PRJ.toJSON();
 reset();
 const rd=PRJ.fromJSON(txt);
 eq(rd.walls,4,"أربعة جدران");
 eq(rd.opens,1,"فتحة"); eq(rd.areas,1,"منطقة");
 eq(rd.cols,1,"عمود"); eq(rd.dims,1,"بُعد");
 eq(S.areas[0].name,"مجلس","والاسم محفوظ");
 ok(!L.vis("A-DIMS"),"والإخفاء محفوظ — عرضٌ لا حذف");
 ok(!A.isStale(S.areas[0]),"والبصمة تُطابق بعد الفتح");
 throws(()=>PRJ.fromJSON("{}"),/جدران|مِسطَر/,
  "الملفّ الغريب يُرفَض بوضوح");
 L.showAll();
 /* الفشل يُعرَف: العائد undefined لا يتميّز عن قيمةٍ شرعية */
 reset();
 const w2=W.addWall([0,0],[5000,0],200,"int","c");
 const ok1=edit(()=>{w2.t=300; return 7});
 eq(ok1,7,"النجاح يعيد قيمة الدالّة");
 ok(!editFailed(),"ولا يُعلَم فشلاً");
 const bad=edit(()=>{throw new Error("سببٌ معلَن")});
 eq(bad,undefined,"والفشل يعيد undefined");
 ok(editFailed(),"لكنه يُعلَم — فلا تُطبَع رسالتان متناقضتان");
 eq(W.wallById(w2.id).t,300,"والحالة أُرجِعت إلى ما قبل الفشل");
});
/* ═══ ١٤ · الفاحص: يخبر ولا يصلح ═══ */
group("الفاحص",()=>{
 reset();
 W.addWall([0,0],[3000,0],200,"int","c");
 W.addWall([3050,0],[3050,3000],200,"int","c");
 const f=IN.inspect(null);
 ok(f.wr>0,"يُنبّه على الأطراف غير المتّصلة");
 ok(f.list.some(x=>x.code==="end"),"بشفرة end");
 ok(f.list.every(x=>x.msg&&x.msg.length>6),"وكل رسالة مفيدة");
 ok(f.list.filter(x=>x.p).every(x=>Array.isArray(x.p)),
  "ولها هدف قفز");
 const b4=JSON.stringify(pack());
 IN.inspect(null);
 eq(JSON.stringify(pack()),b4,"والفحص لا يعدّل شيئاً");
 /* الفتحة المعطوبة والدرج والمنطقة القديمة */
 reset();
 const w=W.addWall([0,0],[5000,0],200,"int","c");
 const o=O.addOpen(w,4500,"door",800,2100,0);
 w.b=[3000,0]; touch();
 const f2=IN.inspect(null);
 ok(f2.list.some(x=>x.code==="open"),"يُبلّغ الفتحة الخارجة");
 ok(f2.list.some(x=>/لم تُزحَف/.test(x.msg)),
  "ويصرّح أنها لم تُزحَف");
 eq(o.s,4500,"وفعلاً لم تُزحَف");
 reset();
 ST.addStair([0,0],[2000,0],700,20,{h:3000});
 ok(IN.inspect(null).list.some(x=>x.code==="stair"),
  "ويقيس الدرج");
});
/* ═══ ١٥ · الورقة ═══ */
group("الورقة",()=>{
 reset();
 S.meta.scale=100;
 S.sheet.size="A3"; S.sheet.orient="l"; S.sheet.on=1;
 deep(SH.paperMM(),[420,297],"A3 أفقياً");
 deep(SH.paperModel(),[42000,29700],"بالمليمتر النموذجي 1:100");
 room(6000,4000,200);
 RN.invalidate();
 ok(SH.fitsSheet(RN.sceneBBox()).ok,"غرفة ٦×٤ تدخل A3 1:100");
 reset();
 S.meta.scale=50; S.sheet.on=1;
 room(30000,20000,200);
 RN.invalidate();
 const fs=SH.fitsSheet(RN.sceneBBox());
 ok(!fs.ok,"و٣٠×٢٠ م لا تدخل A3 1:50");
 ok(fs.over>0,"ويُقاس التجاوز بالمليمتر");
 S.meta.scale=100;
});
/* ═══ ١٥ب · مقاسات A3+ وA2+ والمخصّص ═══
   جدولان (SIZES في core وAPS في io) يجب أن يتّفقا لكل مقاسٍ واتجاه،
   والمقاس يبقى بعد الحفظ والفتح — ويُصلَح المجهول إلى A3. */
const EXPT=await import("../io/export.js");
group("الورقة: المقاسات الموسّعة",()=>{
 const mmEq=(tag)=>{
  const a=SH.paperMM(), b=EXPT.paperMM();
  deep([b.w,b.h],a,`${tag}: جدولا core وio متّفقان`);
 };
 ["A4","A3","A3+","A2","A2+","A1","A0"].forEach(z=>["l","p"].forEach(o=>{
  reset(); S.sheet.size=z; S.sheet.orient=o; mmEq(`${z}/${o}`);
 }));
 reset(); S.sheet.size="A3+"; S.sheet.orient="l";
 deep(SH.paperMM(),[483,329],"A3+ أفقياً 483×329");
 S.sheet.orient="p"; deep(SH.paperMM(),[329,483],"A3+ رأسياً");
 reset(); S.sheet.size="A2+"; S.sheet.orient="l";
 deep(SH.paperMM(),[610,430],"A2+ أفقياً 610×430");
 /* المخصّص */
 reset(); S.sheet.size="custom"; S.sheet.customW=500; S.sheet.customH=350;
 S.sheet.orient="l"; mmEq("custom/l");
 deep(SH.paperMM(),[500,350],"مخصّص 500×350 أفقياً");
 S.sheet.orient="p"; mmEq("custom/p");
 deep(SH.paperMM(),[350,500],"ويُقلَب رأسياً");
 eq(EXPT.paperMM().n,"مخصص","واسمه «مخصص» لا custom");
 /* الحفظ والفتح */
 reset(); S.sheet.size="A3+"; S.sheet.on=1;
 const t1=PRJ.toJSON(); reset(); PRJ.fromJSON(t1);
 eq(S.sheet.size,"A3+","A3+ تبقى بعد الحفظ والفتح");
 reset(); S.sheet.size="custom"; S.sheet.customW=777; S.sheet.customH=555;
 const t2=PRJ.toJSON(); reset(); PRJ.fromJSON(t2);
 eq(S.sheet.size,"custom","custom تبقى");
 eq(S.sheet.customW,777,"والعرض محفوظ"); eq(S.sheet.customH,555,"والارتفاع");
 /* الإصلاح والقصّ */
 reset(); S.sheet.size="A9"; ensureShape();
 eq(S.sheet.size,"A3","المجهول ⇒ A3");
 reset(); S.sheet.size="A4+"; ensureShape();
 eq(S.sheet.size,"A3","A4+ ليست مقاساً ⇒ A3 (لا تمرّ بنمط A[0-4]+)");
 reset(); S.sheet.size="custom"; S.sheet.customW=99999; S.sheet.customH=-5;
 ensureShape();
 eq(S.sheet.customW,2000,"العرض يُقصّ إلى 2000");
 eq(S.sheet.customH,100,"والسالب يُقصّ إلى الحدّ الأدنى 100");
 /* ورقة من S.sheets */
 reset(); const sh0=SH.mkSheet({size:"custom",customW:600,customH:400,orient:"p"});
 deep(Object.values(SH.sheetPapers(sh0)),[400,600],"sheetPapers للمخصّص رأسياً");
 eq(SH.sizeName(sh0),"مخصص","sizeName");
 ok(SH.isCustom(sh0)&&!SH.isCustom({size:"A3"}),"isCustom");
deep(SH.customDims({customW:500,customH:350}),[500,350],"customDims");
 deep(SH.baseDims({size:"A2+"}),[610,430],"baseDims لمقاسٍ قياسي");
 deep(SH.baseDims({size:"custom",customW:500,customH:350}),[500,350],"baseDims للمخصّص");
 /* تجريد بلوك العنوان: هويّة التسليم تبقى، هويّة المحرّر تذهب */
 const stv=SH.stripTitle({proj:"P",owner:"O",loc:"L",sheet:"A-101",rev:"2",by:"me"});
 deep(stv,{proj:"",owner:"",loc:"",sheet:"A-101",rev:"2",by:""},"stripTitle");
 reset(); S.title.by="المحرّر"; S.title.proj="مشروع";
 const rowsIn=()=>SH.titleRows().map(r=>r.v).join("|");
 ok(/المحرّر/.test(rowsIn()),"بلوك العنوان يحمل المصمّم عادةً");
 let inside="";
 SH.withTitle(true,()=>{inside=rowsIn()});
 ok(!/المحرّر|مشروع/.test(inside),"ومجرَّدٌ داخل withTitle(true)");
 ok(/المحرّر/.test(rowsIn())&&S.title.by==="المحرّر","والأصل سليمٌ بعدها");
 const j=JSON.parse(PRJ.toJSON({stripAuthor:1}));
 eq(j.title.by,"","toJSON(stripAuthor) يُفرّغ المصمّم");
 eq(S.title.by,"المحرّر","ولا يمسّ S.title الأصلية");
 eq(JSON.parse(PRJ.toJSON()).title.by,"المحرّر","والافتراضي يحفظه كما كان");
 reset();
});
/* ═══ ١٥ج · «طباعة فقط» — عرضٌ لا كتابة ═══ */
group("طباعة فقط",()=>{
 reset(); room(6000,4000,200); RN.invalidate();
 const lays0=JSON.stringify(S.layers);
 const hasL=(n)=>RN.scene().P.some(g=>(g.L||"0")===n);
 ok(hasL("A-WALL"),"الجدران ظاهرة افتراضياً");
 L.setLay("A-WALL","plot",0); RN.invalidate();
 ok(hasL("A-WALL"),"طبقةٌ لا تُطبَع تبقى ظاهرةً على الشاشة عادةً");
 const lays1=JSON.stringify(S.layers);
 S.opt.plotsOnly=1; touchView();
 ok(!hasL("A-WALL"),"ومع plotsOnly تختفي من العرض");
 eq(JSON.stringify(S.layers),lays1,"ولا يُكتَب شيءٌ في S.layers");
 S.opt.plotsOnly=0; touchView();
 ok(hasL("A-WALL"),"وتعود بإطفائه");
 S.opt.plotsOnly=1; ensureShape();
 eq(S.opt.plotsOnly,1,"ensureShape يُبقي 1");
 S.opt.plotsOnly="x"; ensureShape();
 eq(S.opt.plotsOnly,1,"ويُطبِّع القيمة إلى 0/1");
 S.opt.plotsOnly=0; ensureShape();
 eq(S.opt.plotsOnly,0,"ويُبقي 0");
 ok(lays0!==lays1,"(ضابط: تغيّر plot فعلاً قبل التبديل)");
 reset();
});
/* ═══ ١٦ · DXF كتابةً وقراءةً ═══ */
group("DXF",()=>{
 /* الشرطة تُكسَر قطعاً حقيقية */
 const sg=DXF.dashSegs([0,0],[1000,0],[100,50]);
 ok(sg.length>4,"الشرطة إلى قطع");
 ok(sg.every(s=>s[0][0]<=s[1][0]),"بترتيب الطول");
 near(sg[0][1][0],100,1,"طول القطعة الأولى");
 /* الهاشور خطوطاً مقصوصة */
 const hl=DXF.hatchLines([[[0,0],[1000,0],[1000,1000],[0,1000]]],
  45,200);
 ok(hl.lines.length>2,`الهاشور ${hl.lines.length} خطّاً مولَّداً`);
 eq(hl.cut,0,"ولا بتر — والحدُّ يُعلَن ولا يُسكَت عنه");
 /* الملفّ الكامل */
 reset();
 S.opt.fill="hatch";
 room(6000,4000,200);
 O.addOpen(S.walls[0],3000,"door",900,2100,0);
 ST.addStair([1000,1000],[4000,1000],1100,16,{h:3000});
 D.addDim("h",[0,0],[6000,0],-900);
 D.addText([3000,-2000],"مِسطَر",1,0,"bc");
 RN.invalidate();
 const P=RN.scene().P;
 const txt=DXF.toDXF(P,RN.sceneBBox());
 ok(/^0\nSECTION/.test(txt),"يبدأ بقسم");
 ok(/AC1015/.test(txt),"إصدار R2000 — يقبل وزن الخطّ الذي نكتبه");
 ok(/\n370\n/.test(txt),"ووزن الخطّ مكتوبٌ فعلاً");
 ok(/ANSI_1256/.test(txt),"صفحة الترميز العربية");
 ok(/\nENDSEC\n0\nEOF\n$/.test(txt),"وينتهي بـ EOF");
 ok(/2\nA-WALL\n/.test(txt),"طبقة الجدران معرَّفة");
 ok(/0\nTEXT\n/.test(txt),"والنصّ كيان TEXT");
 ok(!/0\nHATCH\n/.test(txt),"ولا HATCH — قرارٌ معلَن");
 /* ═══ البايتات بالصفحة المُعلَنة ═══
    تمريرُ نصٍّ إلى Blob كان يجعل الإعلان كاذباً والعربية خربشةً
    في أوتوكاد — والدورة الداخلية سليمةٌ فلا تظهر العلّة إلّا حين
    يفتح رسمَك غيرك. */
 const rb=DXF.toDXFBytes(P,RN.sceneBBox());
 ok(rb.bytes instanceof Uint8Array,"toDXFBytes يعيد بايتات");
 eq(rb.bad,0,"وكلُّ نصوصنا في CP1256");
 ok(rb.bytes.indexOf(0x3F)<0||!/[\u0600-\u06FF]/.test(txt),
  "ولا «؟» مكان محرفٍ عربي");
 const back2=CP1.decode(rb.bytes);
 ok(/مِسطَر/.test(back2),"والفكّ بالصفحة نفسها يعيد العربية");
 ok(!/[\u2066-\u2069]/.test(back2),
  "ومحارف عزل الاتجاه تُطرَح — بطاقة الدرج تحملها للعرض");
 ok(/صاعد/.test(back2),"وبطاقة الدرج تُصدَّر سليمة");
 /* دورةٌ كاملة: نكتب بايتاتٍ ثم نفكّها ثم نقرأها */
 const back=DXI.parseDXF(back2,{unit:1});
 ok(back.ents.length>10,"القارئ يعيد كياناتٍ من مخرَجنا");
 ok(back.ents.some(e=>e.t==="t"&&/[\u0600-\u06FF]/.test(e.s)),
  "ومنها نصٌّ عربي");
 ok(Object.keys(back.src).includes("A-WALL"),"وطبقاتنا فيها");
 eq(back.stop,"","ولا توقّف — مخرَجنا لا يُعلِّق قارئنا");
 eq(back.clipped,0,"ولا قصّ");
 /* وحدات ومتسامحات القارئ */
 const mini=["0","SECTION","2","ENTITIES",
  "0","LINE","8","W","10","0","20","0","11","1","21","0",
  "0","ENDSEC","0","EOF"].join("\n");
 const r2=DXI.parseDXF(mini,{unit:1000});
 eq(r2.ents.length,1,"خطّ واحد");
 deep(r2.ents[0].b,[1000,0],"والمتر ⇒ ١٠٠٠ مم");
 throws(()=>DXI.parseDXF("0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nEOF"),
  /ENTITIES/,"بلا كيانات يُرفَض بوضوح");
 eq(DXI.UNITS[6][1],1000,"جدول الوحدات: المتر");
 eq(DXI.UNITS[1][1],25.4,"والبوصة");
});
/* ═══ سقف المرجع في الحالة ═══
   ملفُّ مشروعٍ محرَّرٌ يدوياً منفذٌ ثانٍ إلى الحالة: الحدود التي
   يفرضها القارئ يجب أن يفرضها التطبيع كذلك. */
group("سقف المرجع",()=>{
 reset();
 const mk=o=>PRJ.fromJSON(JSON.stringify(Object.assign({
  __app:"mistar",__ver:1,meta:{name:"T",scale:100},
  walls:[{id:"W1",a:[0,0],b:[5000,0],t:200,type:"int",align:"c"}],
  opens:[],areas:[],dims:[],chains:[],anno:[],cols:[],fixt:[],
  stairs:[]},o)));
 /* مضلّعٌ بأربعين ألف رأس */
 mk({ref:{name:"b.dxf",tr:{k:1,rot:0,dx:0,dy:0},
  ents:[{t:"p",pts:Array.from({length:40000},(_,i)=>[i,0]),
   cl:0,sl:"0"}]}});
 ok(S.ref.ents[0].pts.length<=20000,
  `الرؤوس ${S.ref.ents[0].pts.length} ≤ 20000`);
 /* والقيَم الشاذّة تُنبَذ أو تُقسَر */
 mk({ref:{name:"x.dxf",tr:{k:1e9,rot:"س",dx:NaN,dy:0},
  ents:[
   {t:"l",a:[0,0],b:[1000,0],sl:"0"},
   {t:"l",a:[0,0],b:[1e300,0],sl:"0"},
   {t:"a",c:[0,0],r:1e300,a0:0,a1:360,sl:"0"},
   {t:"t",p:[0,0],s:"نصّ",h:1e300,rot:0,sl:"0"},
   {t:"z",p:[0,0],sl:"0"}]}});
 eq(S.ref.ents.filter(e=>e.t==="l").length,1,
  "الخطّ الشاذّ يُنبَذ والصالح يبقى");
 ok(!S.ref.ents.some(e=>e.t==="z"),"والنوع المجهول يُنبَذ");
 const arc=S.ref.ents.find(e=>e.t==="a");
 ok(!arc||arc.r<=1e9,"ونصف القطر يُقسَر");
 const tx=S.ref.ents.find(e=>e.t==="t");
 ok(!tx||tx.h<=1e7,"وارتفاع النصّ");
 ok(S.ref.tr.k<=1e4,"ومعامل التحويل");
 eq(S.ref.tr.rot,0,"والدوران غير الرقمي");
 eq(S.ref.tr.dx,0,"والإزاحة");
});
/* ═══ ١٧ · SVG ═══ */
group("SVG",()=>{
 reset();
 room(6000,4000,200);
 D.addText([3000,2000],"مجلس",1,0,"mc");
 RN.invalidate();
 const r=SVG.toSVG(RN.scene().P,RN.sceneBBox(),{pad:800});
 const s=r.txt;
 ok(/^<\?xml/.test(s),"ترويسة XML");
 ok(/width="\d+(\.\d+)?mm"/.test(s),"المقاس بالمليمتر الورقي");
 ok(/direction="rtl"/.test(s),"والنصّ من اليمين");
 ok(/مجلس/.test(s),"والعربية نصٌّ متّجه لا صورة");
 ok(/<\/svg>/.test(s),"ومغلق");
 ok(Array.isArray(r.notes),"ويُعيد ما فُقِد");
 eq(r.notes.length,0,"ولا شيء يُفقَد في SVG");
});
/* ═══ ١٨ · المرجع: جامدٌ لا يدخل شيئاً ═══ */
group("المرجع",()=>{
 reset();
 RF.setRef({ents:[
  {t:"l",a:[0,0],b:[1000,0],sl:"0"},
  {t:"l",a:[0,0],b:[0,1000],sl:"REF"}],
  src:{"0":1,"REF":1}, units:{name:"مليمتر",f:1}},"t.dxf");
 eq(RF.refCount(),2,"كيانان");
 ok(RF.isIdent(),"والتحويل هويّة ابتداءً");
 /* المعايرة: مسافة ١ م تُقرأ ٢ م */
 const cal=RF.calRef([0,0],[1000,0],2000);
 eq(cal.k,2,"المعامل ٢");
 near(RF.refTr().k,2,1e-9,"وخُزِّن");
 /* والتركيب لا يستبدل: معايرة ثانية تضاعف */
 RF.calRef([0,0],[2000,0],4000);
 near(RF.refTr().k,4,1e-9,"المحاذاة تتركّب ولا تفقد السابقة");
 deep(RF.visEnts().map(e=>e.a),[[0,0],[0,0]],
  "والإحداثيات المستوردة لم تُمَسّ");
 RF.resetRef();
 near(RF.refTr().k,1,1e-9,"والتصفير يعيد الهويّة");
 /* المرجع لا يدخل الحلقات ولا المساحات */
 room(6000,4000,200);
 RN.invalidate();
 const n=RN.regionLoops().length;
 RF.setRef({ents:[{t:"p",pts:[[0,0],[9000,0],[9000,9000]],cl:1,
  sl:"X"}],src:{X:1},units:{name:"مليمتر",f:1}},"big.dxf");
 RN.invalidate();
 eq(RN.regionLoops().length,n,"مضلّع مرجعي لا يصنع حلقة");
 const a=A.addArea(A.regionAt(RN.regionLoops(),3000,2000),"غ");
 const st=A.stampOf(a.ring);
 RF.clearRef();
 eq(A.stampOf(a.ring),st,"وإزالته لا تُقدِّم منطقةً");
 eq(RF.refCount(),0,"وأُزيل");
});
/* ═══ المرجع خارج اللقطة ═══
   الكيانات جامدة، فلا تُسلسَل في كل خطوة. والتحويل يُتراجَع عنه. */
group("التاريخ والمرجع",()=>{
 reset();
 RF.setRef({ents:Array.from({length:5000},(_,i)=>({t:"l",
  a:[i,0],b:[i,1000],sl:"0"})),src:{"0":5000},
  units:{name:"مليمتر",f:1}},"big.dxf");
 eq(RF.refCount(),5000,"خمسة آلاف كيان مرجعي");
 /* اللقطة صغيرة: الكيانات إشارةٌ لا محتوى */
 const full=JSON.stringify(pack()).length;
 const sn=snapshot();
 ok(sn.length*20<full,
  `اللقطة ${sn.length} مقابل ${full} حرفاً — أصغر بعشرين مرّة`);
 ok(/__rv/.test(sn),"وفيها رقم نسخة المرجع");
 ok(!/"sl":"0"/.test(sn),"ولا كيانٌ واحد");
 /* والتراجع يعيد الكيانات كاملةً */
 edit(()=>W.addWall([0,0],[5000,0],200,"int","c"));
 eq(S.walls.length,1,"جدارٌ واحد");
 ok(undo(),"تراجع");
 eq(S.walls.length,0,"زال الجدار");
 eq(RF.refCount(),5000,"والمرجع كامل — لم يُفقَد بالمشاركة");
 /* والتحويل يدخل التاريخ فعلاً */
 edit(()=>RF.calRef([0,0],[1000,0],2000));
 near(RF.refTr().k,2,1e-9,"عُوير ×2");
 ok(undo(),"تراجع");
 near(RF.refTr().k,1,1e-9,"وعاد التحويل — tr داخل اللقطة");
 eq(RF.refCount(),5000,"والكيانات باقية");
 /* التراجع المتكرّر لا يُزحِم مخزن النسخ: ensureShape يحفظ
    هويّة المصفوفة إن لم يُنبَذ منها شيء */
 const n0=refStore().n;
 for(let i=0;i<12;i++){redo(); undo()}
 eq(refStore().n,n0,"اثنتا عشرة دورةَ تراجعٍ لا تُنشئ نسخةً");
 eq(RF.refCount(),5000,"والمرجع باقٍ بعدها");
 /* pack يحمل كل شيء — الحفظ ليس التاريخ */
 const p=pack();
 eq((p.ref.ents||[]).length,5000,"وpack كاملٌ للحفظ والتصدير");
 /* والنسخة الضائعة تُقال ولا تُخترَع كيانات */
 reset();
 const mk=n=>({ents:Array.from({length:n},(_,i)=>({t:"l",
  a:[i,0],b:[i,10],sl:"0"})),src:{"0":n},
  units:{name:"مليمتر",f:1}});
 RF.setRef(mk(10),"a.dxf");
 const snA=snapshot();
 let lost=0;
 setRefLost(()=>{lost++});
 for(let i=0;i<10;i++)RF.setRef(mk(11+i),"x"+i+".dxf");
 loadState(JSON.parse(snA),false);
 eq(lost,1,"النسخة التي تجاوزت الحدّ تُبلَّغ مرّةً");
 eq(RF.refCount(),0,"والمرجع يزول ولا تُخترَع كياناتٌ");
 eq(S.walls.length,0,"والرسم يُستعاد كما كان");
 setRefLost(null);
});
/* ═══ اتّساق المصدِّرين ═══
   العقد: مشهدٌ واحد ⇒ مخرَجاتٌ تتّفق في الطبقات المستعملة وفي ما
   تحمله كلٌّ منها. والعجز يُعلَن لا يُسكَت عنه. */
group("اتّساق المصدِّرين",()=>{
 reset();
 S.opt.fill="hatch";
 S.opt.colSolo=1;
 room(8000,5000,250);
 O.addOpen(S.walls[0],4000,"door",900,2100,0);
 K.addCol("rect",[2000,2000],400,400,0,"conc");   /* هاشوره A-COLS */
 A.addArea(A.regionAt(RN.regionLoops(),4000,2500),"صالة");
 D.addDim("h",[0,0],[8000,0],-1200);
 D.addText([4000,-2000],"مِسطَر",1,0,"bc");
 RN.invalidate();
 const P=RN.scene().P, BB=RN.sceneBBoxAll();

 /* الطبقات المستعملة نفسها في الاثنين */
 const used=new Set();
 P.forEach(g=>{if(L.plots(g.L||"0"))used.add(g.L||"0")});
 const txt=DXF.toDXF(P,BB);
 used.forEach(n=>{
  if(n==="0")return;
  ok(txt.includes(`\n2\n${n}\n`),`DXF يُعلن ${n}`);
 });
 const sv=SVG.toSVG(P,BB,{});
 ok(sv.txt.length>500,"SVG يُبنى");
 used.forEach(n=>{
  if(n==="0")return;
  ok(sv.txt.includes(L.resolve(n,"plot").css),
   `وSVG يستعمل لون ${n}`);
 });
 /* DXF يُعلن عجزه صريحاً */
 const nn=[];
 DXF.toDXF(P,BB,{notes:nn});
 ok(nn.length>0,"وDXF يُعلن ما لا يحمله");
 ok(nn.some(m=>/تعبئة|حدُّ المنطقة/.test(m)),
  "ومنه صبغة المنطقة");

 /* هاشور العمود بطبقته لا بطبقة تعبئة الجدران */
 const hc=P.find(g=>g.t==="hatch"&&g.L==="A-COLS");
 ok(!!hc,"العمود المستقلّ له هاشورٌ على A-COLS");
 const hs=STY.hatchOf(hc,"svg",{k:100,px:1});
 eq(hs.css,L.resolve("A-COLS","plot").css,
  "وهيئته من طبقته — كان يُصدَّر بلون A-WALL-PATT");
 /* وإيقاف طبع تعبئة الجدران لا يُخفيه */
 edit(()=>L.setLay("A-WALL-PATT","plot",0));
 ok(!STY.hatchOf(hc,"svg",{k:100,px:1}).skip,
  "ولا يغيب بإيقاف طبع طبقةٍ أخرى");
 edit(()=>L.setLay("A-WALL-PATT","plot",1));

 /* solid تشابكٌ في الأربعة */
 const sset=STY.hatchOf({L:"A-WALL-PATT",pat:"SOLID",sc:300},
  "svg",{k:100,px:1}).sets;
 eq(sset.length,2,"solid اتجاهان — كان خطّاً واحداً في SVG");
 eq(STY.hatchOf({L:"A-WALL-PATT",pat:"ANSI31",sc:300},
  "svg",{k:100,px:1}).sets.length,1,"وANSI31 اتجاهٌ واحد");

 /* شرطة الطبقة تُطبَّق حيث تُحمَل وتُقطَّع حيث لا تُحمَل */
 edit(()=>L.setLay("A-GRID","lt","dash"));
 const g0={t:"line",L:"A-GRID",a:[0,0],b:[1000,0]};
 ok(STY.styleOf(g0,"svg",{k:100,px:1}).dash,"شرطة الطبقة في SVG");
 const n2=[];
 const sd=STY.styleOf(g0,"dxf",{k:100,px:1,notes:n2});
 ok(sd.dash&&sd.cut,"وتُقطَّع في DXF لا تُهمَل");
 ok(n2.some(m=>/LTYPE|تُقطَّع/.test(m)),"ويُعلَن السبب");
 /* والقطعُ فعلاً في المخرَج: خطٌّ واحد يصير قطعاً */
 const one=DXF.toDXF([g0],{x0:0,y0:0,x1:1000,y1:1000});
 const nLine=(one.match(/\n0\nLINE\n/g)||[]).length;
 ok(nLine>1,`شرطة الطبقة قُطِّعت إلى ${nLine} قطعة`);
 edit(()=>L.setLay("A-GRID","lt","solid"));
 const two=DXF.toDXF([g0],{x0:0,y0:0,x1:1000,y1:1000});
 eq((two.match(/\n0\nLINE\n/g)||[]).length,1,
  "والمتّصل خطٌّ واحد");

 /* الشفافية */
 edit(()=>L.setLay("A-AREA","op",40));
 const g1={t:"line",L:"A-AREA",a:[0,0],b:[1,0]};
 near(STY.styleOf(g1,"png",{k:100,px:1}).alpha,0.6,0.01,
  "الشفافية في PNG");
 const n3=[];
 eq(STY.styleOf(g1,"dxf",{k:100,px:1,notes:n3}).alpha,1,
  "وتُسقَط في DXF");
 ok(n3.length>0,"ويُعلَن");
 edit(()=>L.setLay("A-AREA","op",0));

 /* ألوان التنبيه: خيارٌ لا حكم */
 const gb={t:"line",L:"A-DIMS",bad:1,a:[0,0],b:[1,0]};
 eq(STY.styleOf(gb,"svg",{k:100,px:1,showWarn:true}).css,
  STY.WARN.bad,"التنبيه يُصدَّر بطلبه");
 eq(STY.styleOf(gb,"svg",{k:100,px:1,showWarn:false}).css,
  L.resolve("A-DIMS","plot").css,"ولا يُصدَّر بغيره");
 eq(STY.CAPS.dxf.warn,0,"وDXF لا يحمله أصلاً");

 /* المخفيّ خارج الاثنين */
 edit(()=>L.toggleOff("A-DIMS"));
 RN.invalidate();
 const P2=RN.scene().P;
 ok(!P2.some(g=>g.L==="A-DIMS"),"المخفيّة ليست في المشهد");
 ok(!DXF.toDXF(P2,BB).includes("\n2\nA-DIMS\n"),"ولا في DXF");
 edit(()=>L.showAll());
 /* وما لا يُطبَع يبقى في المشهد ويُستثنى من المخرَج */
 edit(()=>L.setLay("A-DIMS","plot",0));
 RN.invalidate();
 const P3=RN.scene().P;
 ok(P3.some(g=>g.L==="A-DIMS"),"ما لا يُطبَع يُرى على الشاشة");
 ok(!DXF.toDXF(P3,BB).includes("\n2\nA-DIMS\n"),
  "ويُستثنى من DXF");
 ok(!SVG.toSVG(P3,BB,{}).txt
  .includes(L.resolve("A-DIMS","plot").css),"ومن SVG");
 edit(()=>L.plotAll());
 /* والمُحلّ يعلن ذلك */
 edit(()=>L.setLay("A-DIMS","plot",0));
 ok(STY.styleOf({t:"line",L:"A-DIMS",a:[0,0],b:[1,0]},
  "svg",{k:100,px:1}).skip,"styleOf يُسقط ما لا يُطبَع");
 edit(()=>L.plotAll());
});
/* ═══ نطاق التصدير ═══
   التأشير خارج صندوق الهندسة، فالنطاق يجب أن يشمله. */
group("نطاق التصدير",()=>{
 reset();
 room(6000,4000,200);
 D.addDim("h",[0,0],[6000,0],-1200);     /* خطُّه ١٢٠٠ خارج */
 RN.invalidate();
 const B=RN.sceneBBox(), All=RN.sceneBBoxAll();
 ok(All.y0<B.y0-1000,"صندوق الأوّليات أوسع من صندوق الهندسة");
 /* والمخرَج يُبنى على الأوسع: الهامش ٨٠٠ لا يكفي ١٢٠٠ */
 const pad=Math.max(1,S.meta.scale)*8;
 ok(B.y0-pad>All.y0,"الهامش وحده لا يبلغ خطّ البُعد");
 const sv=SVG.toSVG(RN.scene().P,All,{pad});
 const vb=/viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(sv.txt);
 ok(!!vb,"viewBox موجود");
 near(+vb[2],(All.y1-All.y0)+pad*2,2,
  "وارتفاعه يشمل التأشير كلَّه");
 /* وصندوق الحبر يستثني الورقة فيُقاس التجاوز صحيحاً */
 S.sheet.on=1; S.meta.scale=200;
 RN.invalidate();
 const ink=RN.sceneBBoxInk();
 const all2=RN.sceneBBoxAll();
 ok(all2.x1>=ink.x1,"صندوق الكلّ يشمل الورقة");
 const R2=SH.sheetRect(RN.sceneBBox());
 ok(all2.x1>=R2.x1-1,"وحدُّه عند حدّ الورقة");
 ok(ink.x1<R2.x1,"وصندوق الحبر داخلها");
 S.sheet.on=0; S.meta.scale=100;
});
/* ═══ النقطيّ والمطبوع ═══
   العقد: الأربعة يقرأون المُحلّ نفسه، فما يُستثنى من أحدهم يُستثنى
   من الجميع، وما فُقِد يُقال. */
group("النقطيّ والمطبوع",()=>{
 reset();
 S.opt.fill="hatch";
 S.opt.colSolo=1;
 room(8000,5000,250);
 O.addOpen(S.walls[0],4000,"door",900,2100,0);
 K.addCol("rect",[2000,2000],400,400,0,"conc");
 A.addArea(A.regionAt(RN.regionLoops(),4000,2500),"صالة");
 D.addDim("h",[0,0],[8000,0],-1200);
 D.addText([4000,-2000],"مِسطَر",1,0,"bc");
 D.addText([4000,-2600],"A-101",1,0,"bc");   /* لاتينيّ */
 RN.invalidate();
 const P=RN.scene().P, BB=RN.sceneBBoxAll();

 /* ═══ ما لا يُطبَع يُستثنى من الأربعة ═══
    وكان PNG وPDF يُصدِّرانه: filterPrims يصفّي vis وحده. */
 ["png","pdf"].forEach(f=>{
  eq(STY.styleOf({t:"line",L:"A-DIMS",a:[0,0],b:[1,0]},
   f,{k:100,px:1}).skip,0,`${f}: الطبقة الطابعة تمرّ`);
 });
 edit(()=>L.setLay("A-DIMS","plot",0));
 ["png","pdf","svg","dxf"].forEach(f=>{
  ok(STY.styleOf({t:"line",L:"A-DIMS",a:[0,0],b:[1,0]},
   f,{k:100,px:1}).skip,`${f}: وما لا يُطبَع يُستثنى`);
 });
 const pdfNo=PDF.toPDF(P,BB,{});
 edit(()=>L.plotAll());
 const pdfYes=PDF.toPDF(P,BB,{});
 ok(pdfYes.bytes.length>pdfNo.bytes.length,
  "وPDF يصغر بإيقاف طبع طبقة — كان يُصدِّرها");

 /* ═══ الشفافية في PDF ═══ CAPS تُعلنها فلا تكون للصبغة وحدها */
 edit(()=>L.setLay("A-GRID","op",40));
 D.addAxis("x",0);
 RN.invalidate();
 const pa=PDF.toPDF(RN.scene().P,RN.sceneBBoxAll(),{});
 ok(pa.gs>=1,`حالةُ شفافيةٍ واحدة على الأقلّ (${pa.gs})`);
 const txt=new TextDecoder("latin1").decode(pa.bytes);
 ok(/\/ExtGState/.test(txt),"ومُعلَنةٌ في الموارد");
 ok(/\/ca 0\.6/.test(txt),"وبقيمتها");
 ok(/\/GA\d+ gs/.test(txt),"ومُستعمَلةٌ في المحتوى");
 edit(()=>L.setLay("A-GRID","op",0));

 /* ═══ قناع النصّ العربي ═══ */
 const pm=PDF.toPDF(P,BB,{});
 const t2=new TextDecoder("latin1").decode(pm.bytes);
 ok(pm.arabic>=1,`${pm.arabic} نصّاً عربياً`);
 ok(/\/ImageMask true/.test(t2),"يُدرَج قناعاً");
 ok(/\/Decode \[1 0\]/.test(t2),"بترميز الطلاء الصحيح");
 ok(/\/BitsPerComponent 1/.test(t2),"وبِتٌّ لكل بكسل");
 ok(!/\/DCTDecode/.test(t2),"ولا JPEG بخلفيةٍ معتمة");
 ok(!/\/ColorSpace/.test(t2),"ولا فضاءَ لونٍ — القناع بلا لون");
 ok(/rg [\d.]+ [\d.]+ [\d.]+ [\d.]+ [\d.-]+ [\d.-]+ cm/.test(t2)
  ||/rg /.test(t2),"ويُطلى بلون التعبئة الجاري");
 /* واللاتينيّ يبقى متّجهاً */
 ok(/\(A-101\) Tj/.test(t2),"والنصّ اللاتينيّ متّجهٌ بـHelvetica");
 /* والقناع يُشارَك بين المتطابقَين */
 D.addText([1000,-2000],"مِسطَر",1,0,"bc");
 RN.invalidate();
 const pm2=PDF.toPDF(RN.scene().P,RN.sceneBBoxAll(),{});
 eq(pm2.arabic,pm.arabic+1,"نصٌّ عربيٌّ إضافي");
 eq(pm2.images,pm.images,"وقناعٌ واحد — المتطابقان يتشاركانه");

 /* ═══ المنطقة المهشَّرة في الأربعة ═══ */
 const fh=STY.fillOf({t:"fill",L:"A-AREA",style:"hatch"},
  "pdf",{k:100,px:1,hs:550});
 ok(fh.hatch,"الصبغة المهشَّرة تُعلَن هاشوراً");
 eq(fh.css,L.resolve("A-AREA","plot").css,
  "بلون طبقتها لا بلون تعبئة الجدران");
 near(fh.sp,550,1,"وبتباعُدها");
 /* والمنطقة الصبغيّة تأخذ TINT_A واحدةً */
 const ft=STY.fillOf({t:"fill",L:"A-AREA",style:"tint"},
  "svg",{k:100,px:1});
 near(ft.a,STY.TINT_A,1e-9,"والصبغة بشفافيةٍ واحدة للأربعة");
 eq(STY.fillOf({t:"fill",L:"A-AREA",style:"tint"},
  "dxf",{k:100,px:1}).edgeOnly,1,"وDXF حدٌّ وحده");

 /* ═══ حدّ المساحة في PNG ═══ */
 eq(PNG.MAXSIDE,12000,"حدُّ الضلع مُعلَن");
 eq(PNG.MAXAREA,64e6,"وحدُّ المساحة");
 const big=PNG.renderCanvas(P,BB,{dpi:1200,pad:0});
 ok(big.px*big.py<=PNG.MAXAREA+1,
  `${big.px}×${big.py} = ${big.px*big.py} ≤ الحدّ`);
 ok(big.px<=PNG.MAXSIDE&&big.py<=PNG.MAXSIDE,"والضلعان");
 ok(big.scaled,"ويُعلَن أن الدقّة خُفِّضت");
 const sm=PNG.renderCanvas(P,BB,{dpi:96,pad:0});
 ok(!sm.scaled,"والصغيرة لا تُخفَّض");
 eq(sm.dpi,96,"وتبقى بدقّتها");

 /* ═══ الرسم لا يُبقي حالةً ═══ */
 const cv=document.createElement("canvas");
 cv.width=cv.height=200;
 const cx=cv.getContext("2d");
 cx.globalAlpha=1;
 edit(()=>L.setLay("A-AREA","op",50));
 RN.invalidate();
 PNG.paintTo(cx,RN.scene().P,{x0:0,y1:5000,k:0.02},{});
 near(cx.globalAlpha,1,1e-9,
  "الشفافية تُصفَّر بعد الرسم — وإلّا أبهتت كل ما بعدها");
 edit(()=>L.setLay("A-AREA","op",0));
 ok(typeof PNG.clearPatCache==="function","وكاش النقش يُفرَّغ");

 /* ═══ ما فُقِد يُقال ═══ */
 const nn=[];
 PDF.toPDF(P,BB,{notes:nn});
 eq(nn.length,0,"PDF لا يُفقِد شيئاً");
 const nd=[];
 DXF.toDXF(P,BB,{notes:nd});
 ok(nd.length>0,"وDXF يُعلن ما لا يحمله");
 S.opt.colSolo=0;
});
/* ═══ ضغط PDF ═══ CompressionStream إن وُجد ═══ */
await groupAsync("ضغط PDF",async()=>{
 reset();
 room(6000,4000,200);
 D.addDim("h",[0,0],[6000,0],-900);
 RN.invalidate();
 const P=RN.scene().P, BB=RN.sceneBBoxAll();
 const a=PDF.toPDF(P,BB,{});
 ok(a.stream&&a.stream.length>200,"مجرى المحتوى مُعاد");
 const b=await PDF.toPDFz(P,BB,{});
 ok(b.bytes instanceof Uint8Array,"toPDFz يعيد بايتات");
 if(typeof CompressionStream==="undefined"){
  skip("CompressionStream غير متاح — يعود إلى غير المضغوط");
  eq(b.bytes.length,a.bytes.length,"وبالحجم نفسه");
  return;
 }
 ok(b.zip,"وضُغِط المحتوى");
 ok(b.zip.to<b.zip.from,
  `${b.zip.from} ⇒ ${b.zip.to} بايت`);
 ok(b.bytes.length<a.bytes.length,"والملفّ أصغر");
 const t=new TextDecoder("latin1").decode(b.bytes);
 ok(/\/Filter \/FlateDecode/.test(t),"والمُرشِّح مُعلَن");
 ok(/%%EOF/.test(t),"والملفّ مغلق");
 /* والبنية سليمة: xref يشير إلى موضعٍ داخل الملفّ */
 const m=/startxref\s+(\d+)/.exec(t);
 ok(!!m,"startxref موجود");
 ok(+m[1]>0&&+m[1]<b.bytes.length,"وموضعه داخل الملفّ");
 ok(t.slice(+m[1],+m[1]+4)==="xref","ويشير إلى جدولٍ فعليّ");
});
/* ═══ ١٩ · العقد الجامع ═══
   حالةٌ واحدة تمرّ على كل ما وعدنا به. */
group("العقد الجامع",()=>{
 reset();
 room(8000,5000,250);
 const w=S.walls[0];
 const o=O.addOpen(w,4000,"door",1000,2100,0);
 const a=A.addArea(A.regionAt(RN.regionLoops(),4000,2500),"صالة");
 const d=D.addDim("h",[0,0],[8000,0],-1200);
 const c=K.addCol("rect",[1200,1200],400,400,0,"conc","C1");
 const snap0=JSON.stringify(pack());

 /* ١ — العرض لا يعدّل البيانات: بناء المشهد مرّتين */
 RN.invalidate(); RN.scene();
 RN.invalidate(); RN.scene();
 eq(JSON.stringify(pack()),snap0,"بناء المشهد لا يمسّ البيانات");

 /* ٢ — الفاحص لا يُصلح */
 IN.inspect(RN.sceneBBox());
 eq(JSON.stringify(pack()),snap0,"والفاحص كذلك");

 /* ٣ — التصدير لا يُصلح */
 DXF.toDXF(RN.scene().P,RN.sceneBBox());
 DXF.toDXFBytes(RN.scene().P,RN.sceneBBox());
 const r=SVG.toSVG(RN.scene().P,RN.sceneBBox(),{});
 eq(JSON.stringify(pack()),snap0,"والتصدير كذلك");
 ok(!!r.txt,"وSVG أنتج نصاً");

 /* ٤ — تقصير الجدار: كل شيء يبقى ويُبلَّغ
    (الجدار المجاور يتبع الركن نفسه ليبقى المسار متّصلاً، فينكشف
    الطرفُ البعيد للبُعد من أيّ عقدة — لا يكفي تحريك جدارٍ وحده
    مع بقاء جاره على الركن القديم) */
 w.b=[4000,0]; S.walls[1].a=[4000,0]; touch(); RN.invalidate();
 eq(o.s,4000,"الفتحة لم تُزحَف");
 eq(D.dimValue(d),8000,"والبُعد لم يُقلَّم");
 eq(A.netArea(a),A.netArea(a),"والمنطقة لم تُحدَّث تلقائياً");
 ok(A.isStale(a),"بل صارت قديمة");
 ok(O.openState(o)!=="ok","والفتحة معطوبة");
 ok(D.dimLoose(d,30),"والبُعد معلَّق");
 const sc=RN.scene();
 eq(sc.bad,1,"والمشهد يعدّ المعطوب");
 eq(sc.stale,1,"والقديم");
 eq(sc.loose,1,"والمعلَّق");

 /* ٥ — والعلامات تُرى ولو أُخفيت طبقتها */
 L.toggleOff("A-GLAZ"); L.toggleOff("A-DOOR");
 RN.invalidate();
 ok(RN.scene().P.some(g=>g.bad),
  "علامة العطب تُرى دائماً — تقريرٌ عن حالتك لا زينة");
 L.showAll();

 /* ٦ — وحذف الفتحة يعيد الجدار كاملاً */
 O.delOpen(o); RN.invalidate();
 eq(RN.scene().bad,0,"زال العطب بزوال سببه");
 eq(S.cols[0].tag,"C1","والعمود لم يُمَسّ في كل ذلك");
});
/* ═══ ٢٠ · جدول الأنواع ═══
   العقد: نوعٌ واحد = سطرٌ واحد. فكل نوعٍ يجب أن يحمل عمليّاته
   كلّها، وأن يُقابِل مجموعةً في الحالة، وأن يكون ترتيبه فريداً —
   وإلّا عاد التفرّق الذي كان. */
group("جدول الأنواع",()=>{
 const K=ER.KINDS;
 eq(K.length,16,"ستّةَ عشرَ نوعاً — ودخل مثيلُ الكتلة (1.1.0 · ج)");
 eq(new Set(K).size,K.length,"بمفاتيحٍ فريدة");
 const P=ER.ORD.map(d=>d.pick), H=ER.HORD.map(d=>d.hitO);
 eq(new Set(P).size,P.length,"ترتيب العدّ فريد");
 eq(new Set(H).size,H.length,"وترتيب الإصابة كذلك");
 const pre=ER.ORD.map(d=>d.pre);
 eq(new Set(pre).size,pre.length,"وسوابق المعرّفات فريدة");
 ER.ORD.forEach(d=>{
  ok(Array.isArray(S[d.coll]),`${d.k}: مجموعته «${d.coll}» موجودة`);
  ok(!!d.n,`${d.k}: له تسمية`);
  ["byId","lay","hit","shape","grips","grab","drag","move","del"]
   .forEach(f=>ok(typeof d[f]==="function",`${d.k}: له ${f}`));
 });
 /* الترتيبان يوافقان ما كان: الأداة أوّل الإصابة والمنطقة آخرها */
 eq(ER.HORD[0].k,"fix","الأداة أوّل الإصابة");
 eq(ER.HORD[ER.HORD.length-1].k,"cloud","والسحابة آخرها — تغطّي ما تحتها فلا تسبقه");
 eq(ER.HORD[ER.HORD.length-2].k,"pline","والخطّ المتعدّد قبلها");
 eq(ER.HORD[ER.HORD.length-3].k,"roof","والسقف قبله");
 eq(ER.HORD[ER.HORD.length-4].k,"area","والمنطقة قبل السقف");
 eq(ER.ORD[0].k,"wall","والجدار أوّل العدّ");
 /* COLL و NAME مشتقّان لا منسوخان */
 eq(EN.COLL.wall,"walls","COLL مشتقّ");
 eq(EN.NAME.stair,"درج","و NAME كذلك");
 deep(EN.KORDER,K,"وترتيب التجميع واحد");
 eq(BT.groupOrder({wall:[1],dim:[1],col:[1]}).join(","),
  "wall,col,dim","groupOrder يتبع الترتيب نفسه");
 /* الحاضن يجرّ محتضنه بالإعلان لا بشرطٍ مبثوث */
 ok(typeof ER.ENT.wall.cascade==="function",
  "الجدار له cascade — حذفه يجرّ فتحاته");
 ok(!!ER.ENT.open.noDup,"والفتحة لا تُنسَخ وحدها");
 deep(ER.ENT.col.dupDrop,["tag"],"ووسم العمود لا يُنسَخ");
 /* الطبقة تُقرأ من الجدول: نوعٌ على طبقتين */
 reset();
 const w1=W.addWall([0,0],[3000,0],200,"int","c");
 const w2=W.addWall([0,1000],[3000,1000],200,"low","c");
 eq(L.layOfEnt({k:"wall",id:w1.id}),"A-WALL","الجدار العادي");
 eq(L.layOfEnt({k:"wall",id:w2.id}),"A-WALL-LOW","والسترة");
 const o=O.addOpen(w1,1500,"door",900,2100,0);
 eq(L.layOfEnt({k:"open",id:o.id}),"A-DOOR","والباب");
 const o2=O.addOpen(w1,600,"window",600,1400,900);
 eq(L.layOfEnt({k:"open",id:o2.id}),"A-GLAZ","والشبّاك");
 const c=L.layCounts();
 eq(c["A-WALL"],1,"العدّ يفرّق الطبقتين");
 eq(c["A-WALL-LOW"],1,"لكلٍّ عددُه");
 eq(c["A-DOOR"]+c["A-GLAZ"],2,"والفتحتان على طبقتيهما");
});

/* ═══ ٢١ · فهرس المكان ═══
   العقد المفحوص: يرشّح ولا يُسقِط، ولا يبدّل ترتيباً. */
group("فهرس المكان",()=>{
 reset();
 room(8000,6000,250);
 O.addOpen(S.walls[0],4000,"door",900,2100,0);
 for(let i=0;i<6;i++)
  K.addCol("rect",[1000+i*1200,1000],400,400,0,"conc");
 FX.addFix("wc",[500,5000],0);
 ST.addStair([2000,3000],[5000,3000],1100,16,{h:3000});
 A.addArea(A.regionAt(RN.regionLoops(),4000,3000),"صالة");
 D.addDim("h",[0,0],[8000,0],-1200);
 D.addLead([[1000,4000],[2000,4600],[3000,4600]],"قائد",1);

 const st=SI.stats();
 ok(st.n>=16,`${st.n} كياناً مفهرساً`);
 ok(st.cells>4,`${st.cells} خليّة`);

 /* الترتيب بترتيب المصفوفة لا الخلايا */
 const q=SI.query({x0:-2000,y0:-2000,x1:10000,y1:8000},["col"]);
 const idx=q.col.map(r=>r.i);
 deep(idx,idx.slice().sort((a,b)=>a-b),"المرشَّحون تصاعديّاً");
 deep(q.col.map(r=>r.e.id),S.cols.map(c=>c.id),
  "ويطابق ترتيب المجموعة تماماً");

 /* لا يُسقِط: كل ما يُصاب موجودٌ في مرشَّحيه */
 let miss=0, hits=0;
 for(let x=0;x<=8000;x+=400)for(let y=0;y<=6000;y+=400){
  const h=EN.hitTest(x,y,150);
  if(!h)continue;
  hits++;
  if(!SI.entsAt(x,y,400,h.k).some(e=>e.id===h.id))miss++;
 }
 ok(hits>50,`${hits} إصابة مُختبَرة`);
 eq(miss,0,"كلّها تظهر في المرشَّحين");

 /* الأزواج: المجموعة نفسها والترتيب نفسه */
 const P1=[];
 for(let i=0;i<S.cols.length;i++)
  for(let j=i+1;j<S.cols.length;j++)
   if(K.colsOverlap(S.cols[i],S.cols[j]))P1.push(i+"/"+j);
 const P2=[];
 SI.forPairs("col",(a,b,i,j)=>{
  if(K.colsOverlap(a,b))P2.push(i+"/"+j);
 });
 deep(P2,P1,"أزواج التراكب نفسها بالترتيب نفسه");
 /* والزوج يُعدّ ولو تراكبا فعلاً — مركزٌ قريب لا مطابق، فلا
    يصطدم بحارس «التطابق التامّ» في addCol */
 K.addCol("rect",[1150,1000],500,500,0,"conc");
 let over=0;
 SI.forPairs("col",(a,b)=>{if(K.colsOverlap(a,b))over++});
 ok(over>=1,"التراكب الفعلي يُلتقَط");

 /* النسخة تُبطل الفهرس */
 const n0=SI.stats().n;
 K.addCol("rect",[7000,5000],400,400,0,"conc");
 eq(SI.stats().n,n0+1,"إضافةٌ تُبطل الفهرس فيُعاد بناؤه");

 /* الاختيار بإطارٍ يحوي الكلّ: العدد والترتيب كما كانا */
 const R2={x0:-2000,y0:-2000,x1:10000,y1:8000};
 const all=EN.pickInRect(R2,0,false,[]);
 eq(all.length,EN.allEnts().length,"إطارٌ يحوي الكلّ يحدّد الكلّ");
 deep(all.map(s=>s.k),EN.allEnts().map(s=>s.k),
  "بترتيب الأنواع ثم المصفوفات");

 /* الفتحة تُصاب على محور الجسم لا على المسار — والمحاذاة تُزيحه */
 reset();
 const wl=W.addWall([0,0],[6000,0],400,"int","l");
 const op=O.addOpen(wl,3000,"door",1000,2100,0);
 const c=O.openPt(wl,op.s);
 const h2=EN.hitTest(c[0],c[1],150);
 ok(h2&&h2.id===op.id,"الفتحة المُزاحة بالمحاذاة تُصاب في موضعها");

 /* الأطراف الحرّة: التفاوت الأوسع من الخليّة تتّسع له الجيرة */
 reset();
 W.addWall([0,0],[3000,0],200,"int","c");
 W.addWall([3050,0],[3050,3000],200,"int","c");
 eq(W.looseEnds(2).length,4,"أربعة أطراف حرّة");
 eq(W.looseEnds(100).length,2,"وبتفاوت ١٠ سم اثنان");
 eq(W.looseEnds(3000).length,2,
  "وبتفاوت ٣ م اثنان — الجيرة تتّسع لتفاوتٍ أوسع من الخليّة");
});

/* ═══ الفترات الحرّة ═══
   العقد: ما يُعلَن حرّاً يُقبَل فعلاً، وما يُرفَض يُذكَر سببه.
   وكان المدى غلافاً متّصلاً يَعِد بموضعٍ مشغول. */
group("الفترات الحرّة",()=>{
 reset();
 const w=W.addWall([0,0],[10000,0],200,"int","c");
 const o=O.addOpen(w,5000,"door",1000,2100,0);
 const F=O.freeSpans(w,1000,null);
 eq(F.spans.length,2,"فتحةٌ في الوسط تقطع المدى فترتين");
 deep(F.spans[0],[550,4000],"الفترة الأولى تنتهي قبلها");
 deep(F.spans[1],[6000,9450],"والثانية تبدأ بعدها");
 const A=O.allowed(w,1000,null);
 ok(A.split,"والغلاف يُعلن أنه متقطّع");
 /* الوعد يصدق: كل موضعٍ في فترةٍ حرّة يُقبَل فعلاً */
 F.spans.forEach(([a,b])=>{
  noThrow(()=>{
   const t=O.addOpen(w,Math.round((a+b)/2),"window",1000,1400,900);
   O.delOpen(t);
  },`منتصف الفترة ${U.m2(a)}–${U.m2(b)} مقبول`);
 });
 /* والموضع المشغول يُرفَض ولو كان بين lo وhi */
 ok(A.lo<5000&&5000<A.hi,"الموضع المشغول داخل الغلاف");
 throws(()=>O.addOpen(w,5000,"window",1000,1400,900),/تتراكب/,
  "ومع ذلك يُرفَض — فالغلاف وحده لا يكفي");
 /* nearestFree لا يعبر فتحةً قائمة */
 eq(O.nearestFree(w,1000,5000,null),4000,
  "أقرب حرٍّ إلى المشغول هو حدُّ الفترة");
 eq(O.nearestFree(w,1000,5200,null),6000,"من الجهة الأخرى");
 eq(O.nearestFree(w,1000,3000,null),3000,"والحرّ يبقى كما هو");
 /* سحب مقبض المركز: لا يُنشئ clash */
 const o2=O.addOpen(w,8000,"window",1000,1400,900);
 const g=EN.gripsOf({k:"open",id:o2.id}).find(x=>x.k==="c");
 const grab=EN.grabOf({k:"open",id:o2.id});
 EN.dragGrip({s:{k:"open",id:o2.id},k:"c"},grab,[5000,0],0,0);
 eq(O.openState(o2),"ok","السحب فوق فتحةٍ قائمة لا يُنشئ تراكباً");
 eq(o2.s,6000,"بل يتوقّف عند حدّ الفترة الحرّة");
});
/* ═══ عمق الكوّة: قيدٌ عند كل منفذ ═══ */
group("عمق الكوّة",()=>{
 reset();
 const w=W.addWall([0,0],[5000,0],150,"int","c");
 throws(()=>O.addOpen(w,2500,"niche",600,1200,900,{dep:500}),
  /لا يكفيه|الأقصى/,"عمقٌ أكبر من الجدار يُرفَض عند الإنشاء");
 const n=O.addOpen(w,2500,"niche",600,1200,900,{dep:100});
 eq(n.dep,100,"والمقبول يُكتَب");
 /* ولا يوقع الجدار في فخّ: السماكة تبقى قابلةً للتعديل */
 const r=BT.applyField("wall",[{k:"wall",id:w.id}],"t","0.30");
 eq(r.done,1,"وتوسيع الجدار مقبول");
 const r2=BT.applyField("wall",[{k:"wall",id:w.id}],"t","0.10");
 eq(r2.refused.length,1,"وتنحيفه دون الكوّة يُرفَض");
 eq(w.t,300,"ولا يُكتَب شيء");
});

process.exit(summary()?1:0);
