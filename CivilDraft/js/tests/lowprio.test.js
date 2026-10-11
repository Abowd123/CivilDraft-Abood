/* ═══ أربعةٌ من الأولوية المنخفضة ═══ §٣
   ١) قياسُ المساحة الحرّة بالنقر — لا كيانَ ولا خطوةَ تاريخ.
   ٢) سهمُ ميلِ الصرف — نقطتانِ ونسبةٌ، والنصُّ مُشتَقٌّ لا مخزَّن.
   ٣) ترقيمُ الغرفِ المتسلسل — ترتيبٌ **مكانيٌّ** (صفوفٌ ثم يمينٌ
      إلى يسار) بدلاً من ترتيبِ المساحة الذي لا يُتتبَّع بالعين.
   ٤) قصُّ المنفذ بحدٍّ غيرِ مستطيل — محدَّبٌ وحدَه، والمقعَّرُ يُرفَض
      لأنّ Sutherland–Hodgman تُنتج به أضلاعاً وهميةً بلا خطأٍ ظاهر.
   التشغيل:  node js/tests/lowprio.test.js                          */
import {shim,group,ok,eq,near,deep,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,clearHistory,edit,undo,historyTimeline,
       shapeNotes}=await import("../core/state.js");
const A =await import("../core/areas.js");
const B =await import("../core/batch.js");
const D =await import("../core/dims.js");
const SH=await import("../core/sheet.js");
const GM=await import("../core/geom.js");
const EN=await import("../core/ents.js");
const RN=await import("../core/render.js");
const W =await import("../core/walls.js");

const reset=()=>{newState(); ensureShape(); clearHistory()};
const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
const mkArea=(x0,y0,x1,y1)=>{let a=null;
 edit(()=>{a=A.addArea(rect(x0,y0,x1,y1))},"منطقة"); return a};

/* ══════════ ١ — قياسُ المساحة الحرّة ══════════ */
group("قياسُ المساحة: الحلقةُ من مصدرِ الخبزِ نفسِه",()=>{
 reset();
 /* غرفةٌ مغلقةٌ بأربعةِ جدران */
 edit(()=>{
  W.addWall([0,0],[6000,0],200,"int","c");
  W.addWall([6000,0],[6000,4000],200,"int","c");
  W.addWall([6000,4000],[0,4000],200,"int","c");
  W.addWall([0,4000],[0,0],200,"int","c");
 },"جدران");
 const ring=A.regionAt(RN.regionLoops(),3000,2000);
 ok(!!ring,"الحلقةُ تُقرَأ داخلَ الجدران");
 const ar=Math.abs(GM.pArea(ring));
 /* المساحةُ الصافيةُ داخلَ جدرانٍ سماكتُها ٢٠٠ مركزية: 5.8×3.8 */
 near(ar/1e6,5.8*3.8,0.05,"والمساحةُ صافيةٌ داخلَ الجدران");
 /* والرقمُ **مطابقٌ** لما تُعطيه منطقةٌ مخبوزة — لا تقديرٌ ثانٍ */
 const a=mkArea(0,0,0,0)&&null;
 let baked=null;
 edit(()=>{baked=A.addArea(ring)},"خبز");
 near(A.netArea(baked)/1e6,ar/1e6,0.001,
  "ومساحةُ المنطقةِ المخبوزةِ من الحلقةِ نفسِها هي هي");
});

group("القياسُ لا يكتب شيئاً — ولا خطوةَ تاريخ",()=>{
 reset();
 edit(()=>{
  W.addWall([0,0],[6000,0],200,"int","c");
  W.addWall([6000,0],[6000,4000],200,"int","c");
  W.addWall([6000,4000],[0,4000],200,"int","c");
  W.addWall([0,4000],[0,0],200,"int","c");
 },"جدران");
 const n0=S.areas.length, t0=historyTimeline().length;
 /* الأداةُ تقرأ `regionAt` وتحسب وتُبلِّغ — لا منفذَ كتابةٍ فيها */
 const ring=A.regionAt(RN.regionLoops(),3000,2000);
 ok(!!ring&&Math.abs(GM.pArea(ring))>0,"قُرِئت وحُسِبت");
 eq(S.areas.length,n0,"ولا منطقةَ أُنشِئت");
 eq(historyTimeline().length,t0,"ولا خطوةَ تاريخٍ دُفِعت");
});

/* ══════════ ٢ — سهمُ ميلِ الصرف ══════════ */
group("الميل: العقدُ معلَنٌ والصيغةُ عرضٌ لا حقيقة",()=>{
 ok(D.SLOPE_MIN>0&&D.SLOPE_MAX>D.SLOPE_MIN,"حدّانِ معلَنان");
 ok(D.SLOPE_FMTS.pct&&D.SLOPE_FMTS.ratio,"وصيغتانِ معلَنتان");
 /* القيمةُ مخزَّنةٌ مئويةً دائماً، والصيغةُ تُغيِّر العرضَ وحدَه */
 eq(D.slopeStr({slope:1,fmt:"pct"}),"1%","المئويةُ كما هي");
 eq(D.slopeStr({slope:1,fmt:"ratio"}),"1:100","والنسبةُ ١:١٠٠");
 eq(D.slopeStr({slope:2,fmt:"ratio"}),"1:50","و٢٪ = ١:٥٠");
 /* الكسرُ يُقرَّب: ١:٦٦٫٧ لا تُنفَّذ في الموقع و١:٦٧ تُنفَّذ */
 eq(D.slopeStr({slope:1.5,fmt:"ratio"}),"1:67","والكسرُ يُقرَّب للتنفيذ");
});

group("الميل: نقطتانِ وسهمٌ نحو المنحدَر",()=>{
 reset();
 let a=null;
 edit(()=>{a=D.addSlope([[0,0],[5000,0]],1,"pct")},"ميل");
 eq(a.kind,"slope","نوعٌ في anno لا كيانٌ جديد");
 eq(a.slope,1,"والنسبةُ محفوظةٌ مئويةً");
 eq(a.pts.length,2,"ونقطتانِ لا أكثر");
 const P=D.annoPrims(a);
 ok(P.some(g=>g.t==="line"),"خطٌّ");
 ok(P.some(g=>g.t==="poly"&&g.cl===1),"ورأسُ سهمٍ مصمَّت");
 const tx=P.find(g=>g.t==="text");
 eq(tx.s,"1%","والنسبةُ مكتوبةٌ عليه");
 /* رأسُ السهمِ عند الطرفِ الثاني — حيث يجري الماء */
 const head=P.find(g=>g.t==="poly");
 deep(head.pts[0],[5000,0],"ورأسُ السهمِ عند طرفِ المنحدَر");
});

group("الميل: النصُّ مُشتَقٌّ لا مخزَّن",()=>{
 reset();
 let a=null;
 edit(()=>{a=D.addSlope([[0,0],[5000,0]],1,"pct")},"ميل");
 eq(D.annoPrims(a).find(g=>g.t==="text").s,"1%","قبل التغيير");
 edit(()=>{a.fmt="ratio"},"صيغة");
 eq(D.annoPrims(a).find(g=>g.t==="text").s,"1:100",
  "وتغييرُ الصيغةِ يظهر فوراً — فلا نصٌّ مخزَّنٌ يتعارض مع مصدره");
 edit(()=>{a.slope=2},"قيمة");
 eq(D.annoPrims(a).find(g=>g.t==="text").s,"1:50","وتغييرُ القيمةِ كذلك");
});

group("الميل: المرفوضُ يُسمّى والتطبيعُ يُصلِح",()=>{
 reset();
 const bad=fn=>{let m=""; edit(()=>{try{fn()}catch(e){m=e.message;throw e}},"x"); return m};
 ok(/خارج/.test(bad(()=>D.addSlope([[0,0],[5000,0]],0.01))),
  "ميلٌ دون الأدنى مرفوضٌ — ماءٌ راكد");
 ok(/خارج/.test(bad(()=>D.addSlope([[0,0],[5000,0]],99))),
  "وفوق الأقصى مرفوضٌ — منحدَرٌ لا سطح");
 ok(/يُقرَأ|أبعد/.test(bad(()=>D.addSlope([[0,0],[10,0]],1))),
  "وسهمٌ أقصرُ من أن يُقرَأ");
 eq(S.anno.length,0,"ولا نصفَ تنفيذ");
 /* وملفٌّ محرَّرٌ يدوياً بنسبةٍ مستحيلةٍ يُصحَّح ويُقال */
 let a=null;
 edit(()=>{a=D.addSlope([[0,0],[5000,0]],1)},"ميل");
 a.slope=500;
 ensureShape();
 eq(S.anno.length,1,"السهمُ لم يُسقَط");
 ok(S.anno[0].slope<=D.SLOPE_MAX,"ونسبتُه أُعيدت إلى حدّها");
 ok(/slope/.test(JSON.stringify(shapeNotes())),"والإصلاحُ مُسجَّل");
});

group("الميل: كيانٌ كاملُ العضوية",()=>{
 reset();
 let a=null;
 edit(()=>{a=D.addSlope([[0,0],[5000,0]],1)},"ميل");
 const h=EN.hitTest(2500,0,150);
 ok(h&&h.k==="anno"&&h.id===a.id,"النقرةُ تصيب الخطَّ لا المرساةَ وحدها");
 const g=EN.gripsOf({k:"anno",id:a.id});
 eq(g.length,2,"ومقبضانِ لطرفَيه");
 /* سحبُ طرفٍ يقلب جهةَ الجريان — الجهةُ معنًى لا شكل */
 const o=EN.grabOf({k:"anno",id:a.id});
 edit(()=>{EN.dragGrip({s:{k:"anno",id:a.id},k:"p1"},o,[-5000,0])},"سحب");
 deep(a.pts[1],[-5000,0],"والجهةُ تنقلب بسحبِ الطرف");
 undo();
 ok(S.anno.length===1,"والتراجعُ يعمل");
});

/* ══════════ ٣ — ترقيمُ الغرفِ المكانيّ ══════════ */
group("الترقيم: الترتيبُ المكانيُّ هو الافتراض",()=>{
 deep(B.AREA_ORDERS,["plan","size"],"ترتيبانِ معلَنان");
 reset();
 /* صفٌّ أعلى بثلاثِ غرفٍ وصفٌّ أسفلُ بغرفتَين */
 const L=[mkArea(0,5000,3000,9000), mkArea(4000,5000,8000,9000),
  mkArea(9000,5000,12000,9000), mkArea(0,0,6000,4000),
  mkArea(7000,0,12000,4000)];
 const sel=L.map(a=>({k:"area",id:a.id}));
 const r=B.nameAreasSeq(sel,"غ");
 eq(r.order,"plan","والافتراضُ مكانيّ");
 eq(r.n,5,"خمسُ غرف");
 const nameOf=a=>A.areaById(a.id).name;
 /* الصفُّ الأعلى: من اليمين (x الأكبر) إلى اليسار */
 eq(nameOf(L[2]),"غ 1","أعلى يمينٍ أوّلاً");
 eq(nameOf(L[1]),"غ 2","ثم ما يساره");
 eq(nameOf(L[0]),"غ 3","ثم أعلى يسار");
 /* ثم الصفُّ الأسفل بالترتيب نفسه */
 eq(nameOf(L[4]),"غ 4","ثم أسفلُ يمين");
 eq(nameOf(L[3]),"غ 5","ثم أسفلُ يسار");
});

group("الترقيم: ترتيبُ المساحةِ باقٍ خياراً",()=>{
 reset();
 const big=mkArea(0,0,10000,10000);
 const mid=mkArea(0,12000,6000,16000);
 const sml=mkArea(0,18000,2000,20000);
 const sel=[big,mid,sml].map(a=>({k:"area",id:a.id}));
 const r=B.nameAreasSeq(sel,"غ","size");
 eq(r.order,"size","الخيارُ القديمُ لم يُلغَ");
 eq(A.areaById(big.id).name,"غ 1","الأكبرُ أوّلاً");
 eq(A.areaById(sml.id).name,"غ 3","والأصغرُ آخراً");
});

group("الترقيم: الصفُّ يُقتَنص بعتبةٍ نسبيةٍ لا ثابتة",()=>{
 reset();
 /* غرفتانِ في صفٍّ واحدٍ بفرقٍ رأسيٍّ صغير (٢٠٠ مم) — صفٌّ واحد */
 const a=mkArea(0,0,4000,3000);
 const b=mkArea(5000,200,9000,3200);
 const r=B.nameAreasSeq([a,b].map(x=>({k:"area",id:x.id})),"غ");
 eq(A.areaById(b.id).name,"غ 1","الأيمنُ أوّلاً — فهما صفٌّ واحد");
 eq(A.areaById(a.id).name,"غ 2","ثم الأيسر");
 /* وغرفتانِ متباعدتانِ رأسياً صفّانِ */
 reset();
 const c=mkArea(0,0,4000,3000);
 const d=mkArea(5000,9000,9000,12000);
 B.nameAreasSeq([c,d].map(x=>({k:"area",id:x.id})),"غ");
 eq(A.areaById(d.id).name,"غ 1","الأعلى أوّلاً — صفّانِ متباعدان");
});

/* ══════════ ٤ — قصُّ المنفذ بحدٍّ غيرِ مستطيل ══════════ */
group("التحدّب: المقعَّرُ يُعرَف ولا يُخمَّن",()=>{
 ok(GM.isConvexRing(rect(0,0,100,100)),"المربّعُ محدَّب");
 ok(GM.isConvexRing([[0,0],[100,0],[50,80]]),"والمثلّثُ كذلك");
 ok(!GM.isConvexRing([[0,0],[100,0],[50,50],[100,100],[0,100]]),
  "والمقعَّرُ يُعرَف");
 ok(!GM.isConvexRing([[0,0],[100,0]]),"ورأسانِ ليسا حلقة");
 /* رؤوسٌ على استقامةٍ واحدةٍ ليست حلقةً محدَّبة */
 ok(!GM.isConvexRing([[0,0],[50,0],[100,0]]),"ولا المستقيمة");
 /* وضلعٌ مقسومٌ ليس تقعّراً */
 ok(GM.isConvexRing([[0,0],[50,0],[100,0],[100,100],[0,100]]),
  "وضلعٌ مقسومٌ يبقى محدَّباً");
 /* والاتجاهانِ مقبولان */
 ok(GM.isConvexRing(rect(0,0,100,100).slice().reverse()),
  "والاتجاهُ المعاكسُ مقبول");
});

group("القصُّ بمضلّعٍ محدَّب: قطعةٌ وحلقة",()=>{
 const sq=rect(0,0,100,100);
 deep(SH.clipSegToPoly([10,10],[90,90],sq),[[10,10],[90,90]],
  "الداخلةُ كما هي");
 deep(SH.clipSegToPoly([-50,50],[150,50],sq),[[0,50],[100,50]],
  "والعابرةُ تُقَصّ عند الحدَّين");
 eq(SH.clipSegToPoly([200,200],[300,300],sq),null,"والخارجةُ تُسقَط");
 /* حلقةٌ عابرةٌ تُقَصّ حلقةً صالحةً لا أضلاعاً وهمية */
 const r=SH.clipPolyToPoly(rect(-20,-20,60,60),sq);
 ok(r&&r.length>=4,"والحلقةُ تُقَصّ حلقةً");
 near(Math.abs(GM.pArea(r))/1,60*60,1,"بمساحةِ التقاطعِ بالضبط");
 eq(SH.clipPolyToPoly(rect(200,200,300,300),sq),null,
  "وما خرج كلُّه يُسقَط");
});

group("الحدُّ نسبيٌّ فلا ينجرف بتحريكِ المنفذ",()=>{
 const vp=()=>({id:"v1",name:"منفذ",visible:1,
  modelRect:{x0:0,y0:0,x1:10000,y1:10000},
  paperRect:{x0:0,y0:0,x1:100,y1:100}});
 const v=vp();
 /* مثمَّنٌ في فضاءِ النموذج */
 const oct=[];
 for(let i=0;i<8;i++){
  const a=i/8*Math.PI*2;
  oct.push([5000+4000*Math.cos(a),5000+4000*Math.sin(a)]);
 }
 eq(SH.vpSetClip(v,oct).n,8,"أُسنِد بثمانيةِ رؤوس");
 ok(v.clip.every(p=>p[0]>=-0.01&&p[0]<=1.01),
  "والمخزَّنُ نسبٌ من مستطيلِ الورقةِ (٠–١)");
 const before=JSON.stringify(v.clip);
 /* نحرّك المنفذَ على الورقة: النسبُ لا تتغيّر، والورقيُّ يتبع */
 const p0=SH.vpClipPaper(v)[0];
 v.paperRect={x0:200,y0:300,x1:300,y1:400};
 eq(JSON.stringify(v.clip),before,"والنسبُ لم تتغيّر بتحريكِ المنفذ");
 const p1=SH.vpClipPaper(v)[0];
 near(p1[0]-p0[0],200,0.01,"والحدُّ الورقيُّ تحرّك معه بالضبط");
});

group("المقعَّرُ يُرفَض عند الإسناد لا يُقَصّ كذباً",()=>{
 const v={id:"v1",name:"منفذ",visible:1,
  modelRect:{x0:0,y0:0,x1:10000,y1:10000},
  paperRect:{x0:0,y0:0,x1:100,y1:100}};
 let e="";
 try{SH.vpSetClip(v,[[0,0],[10000,0],[5000,5000],[10000,10000],[0,10000]])}
 catch(x){e=x.message}
 ok(/مقعَّر/.test(e),`يُرفَض: ${e.slice(0,40)}`);
 ok(/وهمي/.test(e),"والسببُ مكتوبٌ: أضلاعٌ وهميةٌ بلا خطأٍ ظاهر");
 ok(!v.clip,"ولم يُكتَب شيء");
 /* ودون الحدِّ الأدنى المعلَنِ يُرفَض — بالرقمِ نفسِه */
 ok(SH.VPCLIP_MIN>=3,"الحدُّ الأدنى للرؤوسِ معلَنٌ ومصدَّر");
 ok(SH.VPCLIP_MAX>SH.VPCLIP_MIN,"والأقصى كذلك");
 e="";
 try{SH.vpSetClip(v,[[0,0],[100,0]])}catch(x){e=x.message}
 ok(/رؤوس/.test(e),"ورأسانِ مرفوضان");
 ok(new RegExp(String(SH.VPCLIP_MIN)).test(e),
  "والرسالةُ تذكر الرقمَ المعلَنَ لا رقماً مبثوثاً");
 /* ورؤوسٌ على استقامةٍ واحدة */
 e="";
 try{SH.vpSetClip(v,[[0,0],[5000,0],[10000,0]])}catch(x){e=x.message}
 ok(e.length>0,`والمستقيمةُ مرفوضةٌ: ${e.slice(0,30)}`);
});

group("التركيب: ما خرج عن الحدِّ يُسقَط ويُعَدّ",()=>{
 const v={id:"v1",name:"منفذ",visible:1,
  modelRect:{x0:0,y0:0,x1:10000,y1:10000},
  paperRect:{x0:0,y0:0,x1:100,y1:100}};
 const oct=[];
 for(let i=0;i<8;i++){
  const a=i/8*Math.PI*2;
  oct.push([5000+4000*Math.cos(a),5000+4000*Math.sin(a)]);
 }
 SH.vpSetClip(v,oct);
 const prims=[
  {t:"line",L:"A-WALL",a:[5000,5000],b:[6000,5000]},   /* وسطُ المثمَّن */
  {t:"line",L:"A-WALL",a:[100,100],b:[300,300]},        /* زاويةٌ خارجَه */
  {t:"text",L:"A-ANNO",s:"داخل",x:5000,y:5000,h:200},
  {t:"text",L:"A-ANNO",s:"خارج",x:200,y:200,h:200}];
 const r=SH.composeSheet({viewports:[v],size:"A3"},prims);
 const kept=r.prims.map(g=>g.s).filter(Boolean);
 ok(r.prims.some(g=>g.t==="line"),"ما في الوسطِ بقي");
 ok(kept.indexOf("داخل")>=0,"ونصُّ الوسطِ بقي");
 ok(kept.indexOf("خارج")<0,"ونصُّ الزاويةِ أُسقط");
 ok(r.dropped>=1,"والإسقاطُ معدودٌ لا صامت");
 /* ونزعُ الحدِّ يُعيد المستطيلَ فيعود ما كان خارجَه */
 ok(SH.vpClearClip(v),"نُزِع الحدّ");
 const r2=SH.composeSheet({viewports:[v],size:"A3"},prims);
 ok(r2.prims.length>r.prims.length,
  "وعاد ما كان خارجَ المضلّعِ داخلَ المستطيل");
 eq(SH.vpClearClip(v),false,"ونزعٌ ثانٍ لا يفعل شيئاً");
});

group("القوسُ يُفتَّت أضلاعاً مع حدٍّ مضلّعٍ — مُعلَن",()=>{
 ok(SH.ARC_SEGS>=16,"عددُ الأضلاعِ معلَنٌ لا مبثوث");
 const v={id:"v1",name:"منفذ",visible:1,
  modelRect:{x0:0,y0:0,x1:10000,y1:10000},
  paperRect:{x0:0,y0:0,x1:100,y1:100}};
 const circle=[{t:"circle",L:"A-WALL",cx:5000,cy:5000,r:2000}];
 /* بلا حدٍّ: قوسٌ يبقى قوساً (القصُّ الهندسيُّ الحقيقيّ) */
 const r0=SH.composeSheet({viewports:[v],size:"A3"},circle);
 ok(r0.prims.some(g=>g.t==="arc"),"بلا حدٍّ يبقى قوساً");
 /* ومع حدٍّ مضلّعٍ يصير أضلاعاً */
 const oct=[];
 for(let i=0;i<8;i++){
  const a=i/8*Math.PI*2;
  oct.push([5000+4000*Math.cos(a),5000+4000*Math.sin(a)]);
 }
 SH.vpSetClip(v,oct);
 const r1=SH.composeSheet({viewports:[v],size:"A3"},circle);
 ok(!r1.prims.some(g=>g.t==="arc"),"ومع حدٍّ مضلّعٍ لا قوسَ يبقى");
 ok(r1.prims.filter(g=>g.t==="line").length>8,
  "بل أضلاعٌ كثيرةٌ تقارب الدائرة");
});

group("التطبيعُ ينزع حدّاً مقعَّراً من ملفٍّ محرَّرٍ يدوياً",()=>{
 reset();
 if(!Array.isArray(S.sheets)||!S.sheets.length){
  ok(true,"(لا أوراقَ في المشروع الجديد — القيدُ مُختبَرٌ في vpSetClip)");
  return;
 }
 const sh=S.sheets[0];
 sh.viewports=[{id:"v1",name:"منفذ",visible:1,
  modelRect:{x0:0,y0:0,x1:10000,y1:10000},
  paperRect:{x0:0,y0:0,x1:100,y1:100},
  clip:[[0,0],[1,0],[0.5,0.5],[1,1],[0,1]]}];
 ensureShape();
 const vp=S.sheets[0].viewports[0];
 ok(vp&&!vp.clip,"الحدُّ المقعَّرُ نُزِع");
 ok(vp,"والمنفذُ نفسُه لم يُسقَط — الحدُّ زينةٌ لا شرطُ وجود");
 ok(/مقعَّر/.test(JSON.stringify(shapeNotes())),"والنزعُ مُسجَّلٌ لا صامت");
});

process.exit(summary()?1:0);
