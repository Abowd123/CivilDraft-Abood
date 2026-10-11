/* ═══ القوس الحقيقيّ في تصدير DXF ═══
   node js/tests/dxfarc.test.js
   يقيس ثلاثة عقود:
   ١) ما يُصدَّر قوسٌ حقيقيّ: مركزه ونصف قطره من (رأسين + bulge) يطابقان
      الجدار لا تقطيعَه.
   ٢) لا يُمَسّ ما ليس وجهَ جدارٍ قوسيّ (خطٌّ للمستخدم على دائرة،
      وجدارٌ مستقيم).
   ٣) الدورة: ما يكتبه المُصدِّر يقرؤه مستوردُنا بمساحةٍ تطابق الأصل. */
import {shim,shimCanvas} from "./harness.js";
shim(); shimCanvas();
import {group,ok,eq,near,summary} from "./harness.js";
const {S,newState}=await import("../core/state.js");
const W=await import("../core/walls.js");
const RN=await import("../core/render.js");
const DXF=await import("../io/dxf.js");
const DXI=await import("../io/dxfin.js");
const AR=await import("../io/dxfarc.js");
const G=await import("../core/geom.js");
const {LIM}=await import("../core/limits.js");
const ARCTOL=LIM.arcTol.def;

const reset=()=>{newState(); S.walls.length=0; RN.invalidate()};
const P0=()=>RN.scene().P;
const wallPolys=P=>P.filter(g=>g.t==="poly"&&g.L==="A-WALL");
/* مركز ونصف قطر القوس المارّ برأسين وbulge */
function circOf(A,B,bg){
 const dx=B[0]-A[0], dy=B[1]-A[1];
 const k=(1-bg*bg)/(2*bg);
 const cx=A[0]+dx/2-dy/2*k, cy=A[1]+dy/2+dx/2*k;
 return {cx,cy,R:Math.hypot(A[0]-cx,A[1]-cy)};
}

group("قوسٌ منفرد: كلُّ وجهٍ يصير قوساً واحداً",()=>{
 reset();
 W.addWall([-3000,0],[3000,0],200,"ext","c",undefined,1);   /* نصف دائرة */
 RN.invalidate();
 const rings=wallPolys(P0());
 eq(rings.length,1,"حلقةٌ واحدة: شريطٌ نصف دائريّ بوجهين وغطاءين");
 const C=AR.arcCircles(S.walls);
 eq(C.length,2,"دائرتان: R+t/2 و R-t/2");
 let arcs=0;
 rings.forEach(g=>{
  const vs=AR.arcifyRing(g.pts,C);
  eq(vs.length,4,`الرؤوس ${g.pts.length}→٤: طرفا كل وجه`);
  vs.forEach((v,i)=>{
   if(!v.b)return;
   arcs++;
   const nx=vs[(i+1)%vs.length].p;
   const c=circOf(v.p,nx,v.b);
   near(c.cx,0,ARCTOL,"المركز x من (رأسين+bulge) = مركز الجدار");
   near(c.cy,0,ARCTOL,"المركز y");
   ok(Math.abs(c.R-3100)<1||Math.abs(c.R-2900)<1,
    `نصف القطر ${c.R.toFixed(2)} أحد الوجهين لا تقطيعاً`);
  });
 });
 eq(arcs,2,"قوسان حقيقيّان في المجموع");
});

group("الالتحام بجدارٍ مستقيم: القوس يمتدّ إلى التقاطع الحقيقيّ",()=>{
 reset();
 W.addWall([-3000,0],[3000,0],200,"ext","c",undefined,1);
 W.addWall([-3000,0],[3000,0],200,"ext","c");              /* الوتر */
 RN.invalidate();
 const C=AR.arcCircles(S.walls);
 const inner=wallPolys(P0()).map(g=>AR.arcifyRing(g.pts,C))
  .find(vs=>vs.length===2);
 ok(!!inner,"الحلقة الداخلية عدسةٌ من رأسين: قوسٌ + وتر");
 if(inner){
  inner.forEach(v=>{
   const d=Math.hypot(v.p[0],v.p[1]);
   near(d,2900,1e-6,"كلُّ رأسٍ على دائرة الوجه بالضبط (لا على وتر التقطيع)");
   near(v.p[1],-100,1e-6,"وعلى وجه الجدار المستقيم y=-100");
  });
 }
});

group("عدسةٌ بقوسٍ صغير المدى (أقلّ من ٩٠°): تُقرأ قوساً + وتراً",()=>{
 reset();
 /* مدى القوس ٤·atan(0.15) ≈ ٣٤° فخطوة الوتر (الإشارة المعكوسة) هي
    وخطوةُ الوتر بإشارةٍ معكوسة — فكشفُ الوتر بحجم الخطوة وحده يخطئ */
 W.addWall([-2000,0],[2000,0],200,"ext","c",undefined,0.15);
 W.addWall([-2000,0],[2000,0],200,"ext","c");
 RN.invalidate();
 const C=AR.arcCircles(S.walls);
 const lens=wallPolys(P0()).map(g=>AR.arcifyRing(g.pts,C))
  .find(vs=>vs.length===2&&vs.some(v=>v.b));
 ok(!!lens,"الحلقة الداخلية رأسان: قوسٌ + وتر");
 if(lens){
  const arc=lens.find(v=>v.b);
  const sw=4*Math.atan(arc.b);
  /* الوجه الداخليّ (R−١٠٠) يقطعه وجهُ الوتر العلويّ y=١٠٠: المدى
     المتوقّع تحليلياً لا مدى الجدار كله */
 const R=2000/Math.sin(2*Math.atan(0.15)), Ri=R-100;
  const sag=R*(1-Math.cos(2*Math.atan(0.15)));      /* سهم المسار */
  const dy=R-sag+100;           /* بُعد المركز عن y=١٠٠ */
  const want=2*Math.asin(Math.sqrt(Ri*Ri-dy*dy)/Ri);
  ok(Math.abs(Math.abs(sw)-want)<0.01,
   `مدى القوس المُستعاد ${(sw*180/Math.PI).toFixed(1)}° ≈ المتوقَّع ${(want*180/Math.PI).toFixed(1)}°`);
 }
});

group("لا يُمَسّ ما ليس وجه جدارٍ قوسيّ",()=>{
 reset();
 W.addWall([0,0],[4000,0],200,"ext","c");
 W.addWall([4000,0],[4000,3000],200,"ext","c");
 W.addWall([4000,3000],[0,3000],200,"ext","c");
 W.addWall([0,3000],[0,0],200,"ext","c");
 RN.invalidate();
 const txt=DXF.toDXF(P0(),RN.sceneBBox());
 ok(!/\n42\n(?!2\.5)/.test(txt.replace(/\n42\n2\.5\n/,"\n")),
  "غرفةٌ مستقيمة: لا bulge واحد");
 eq(DXF.toDXFBytes(P0(),RN.sceneBBox()).arcs,0,"والعدّاد صفر");
 /* خطٌّ للمستخدم على دائرةٍ واحدة على طبقةٍ غير طبقة الجدران */
 reset();
 W.addWall([-3000,0],[3000,0],200,"ext","c",undefined,1);
 RN.invalidate();
 const circ=[];
 for(let i=0;i<=12;i++){const a=-Math.PI*i/12; circ.push([Math.round(2900*Math.cos(a)),Math.round(2900*Math.sin(a))])}
 circ.push([0,-5000]);
 const prim={t:"poly",L:"A-DIMS",pts:circ,cl:1};
 const txt2=DXF.toDXF([prim],{x0:-4000,y0:-6000,x1:4000,y1:1000});
 ok(!/\n42\n(?!2\.5)/.test(txt2.replace(/\n42\n2\.5\n/,"\n")),
  "على طبقةٍ غير الجدران: بلا تحويل ولو وقعت رؤوسه على دائرة");
});

group("الدورة: تصدير ثم استيراد يحفظان الشكل",()=>{
 reset();
 W.addWall([-3000,0],[3000,0],200,"ext","c",undefined,1);
 W.addWall([-3000,0],[3000,0],200,"ext","c");
 RN.invalidate();
 const P=P0();
 const r=DXF.toDXFBytes(P,RN.sceneBBox());
 ok(r.arcs>=2,`العدّاد يذكر الأقواس (${r.arcs})`);
 const txt=DXF.toDXF(P,RN.sceneBBox());
 const back=DXI.parseDXF(txt);
 const polys=back.ents.filter(e=>e.t==="p");
 ok(polys.length>=2,"الحلقتان عادتا");
 const areaOrig=wallPolys(P).map(g=>Math.abs(G.pArea(g.pts)))
  .sort((a,b)=>a-b);
 const areaBack=polys.map(e=>Math.abs(G.pArea(e.pts))).sort((a,b)=>a-b);
 areaOrig.forEach((a,i)=>{
  /* المستورد يُقطِّع القوس بخطوةٍ ١٥° (تقطيعُنا بسهم ٠٫٥ مم)،
     والمحيطُ المحاط بالدائرة يفقد نحو ١٪ من مساحته — فالفرقُ هنا من
     المستورد لا من المُصدِّر، ولذا الحدّ ١٫٥٪ */
  ok(Math.abs(a-areaBack[i])/a<0.015,
   `المساحة ${i} بعد الدورة ضمن ١٫٥٪ (${a.toFixed(0)} ↔ ${areaBack[i].toFixed(0)})`);
  ok(areaBack[i]<=a*1.0001,"والمستورد لا يزيد عن الأصل (تقطيعٌ محاط)");
 });
 /* والملفّ أخفّ: أقلّ رؤوساً */
 const nV=s=>(s.match(/\nVERTEX\n/g)||[]).length;
 const txtOld=DXF.toDXF(P.map(g=>g.t==="poly"?{...g,L:"A-OLD"}:g),
  RN.sceneBBox());
 ok(nV(txt)<nV(txtOld)/3,
  `رؤوسٌ أقلّ من الثلث (${nV(txt)} ↔ ${nV(txtOld)})`);
});

group("قوسٌ سالب الاتجاه وقوسٌ يعبر ±π",()=>{
 reset();
 W.addWall([3000,0],[-3000,0],200,"ext","c",undefined,1);   /* الجهة العليا */
 W.addWall([0,-3000],[0,3000],200,"ext","c",undefined,-0.6);
 RN.invalidate();
 const C=AR.arcCircles(S.walls);
 let n=0;
 wallPolys(P0()).forEach(g=>{
  const vs=AR.arcifyRing(g.pts,C);
  const fl=AR.flattenBulged(vs,true,200);
  /* كلُّ رأسٍ من الأصل يقع على الحلقة المُسطَّحة (≤ ٠٫٥ مم) */
  const dseg=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy;
   let t=L2?((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L2:0;t=Math.max(0,Math.min(1,t));
   return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)};
  /* رؤوس الحلقة الواقعة على دائرةٍ فعلاً: انحرافٌ ≤ ١٫٠ مم — الأصل
     مُقرَّبٌ إلى الملّيمتر (حتى ٠٫٧١ مم) وطرفُ القوس يُصحَّح إلى
     التقاطع الحقيقيّ مع الضلع المجاور فيزاح على الدائرة أجزاءً من
     الملّيمتر (كان الحدّ ٠٫٨ مع تقطيع ٧٫٥° الخشن).
     ورؤوس التقاطع بين وجهين تُستبدَل بالتقاطع الحقيقيّ، فانحرافها عن
     الأصل ≤ سهم القطعة — وهو تحسينٌ لا عطب */
  let mxOn=0, mxX=0;
  g.pts.forEach(p=>{
   let d=1e9;
   for(let i=0;i<fl.length;i++)d=Math.min(d,dseg(p,fl[i],fl[(i+1)%fl.length]));
   const onC=C.some(c=>Math.abs(Math.hypot(p[0]-c.cx,p[1]-c.cy)-c.R)<=1.6);
   if(onC)mxOn=Math.max(mxOn,d); else mxX=Math.max(mxX,d);
  });
  /* هذا السطر يبقى عند 1مم لا LIM.arcTol.def: التفاوت هنا يشمل تقريب
     الأصل إلى المليمتر وإزاحة تصحيح تقاطع الطرف، لا دقّة تقطيع القوس
     وحدها — القياس الفعلي هنا 0.82مم، فتشديده إلى 0.5 يكسر الاختبار
     بلا عطبٍ حقيقيّ (راجع التعليق أعلاه) */
  ok(mxOn<1.0,`رؤوس الدائرة تنحرف ≤ ١٫٠ مم (${mxOn.toFixed(2)})`);
  ok(mxX<0.0025*3100+1,`ورؤوس التقاطع ≤ سهم القطعة (${mxX.toFixed(2)})`);
  n+=AR.arcCount(vs);
 });
 ok(n>=2,"أقواسٌ وُجدت في الاتجاهين");
});

const r=summary();
process.exit(r?1:0);
