/* ═══ المرحلة A — الخطّ المتعدّد PL ═══
   node js/tests/phaseA-plines.test.js */
import {shim,group,ok,eq,throws,summary} from "./harness.js";
shim();
const {S,newState,ensureShape}=await import("../core/state.js");
const P=await import("../core/plines.js");
const AM=await import("../core/arcmath.js");
const RN=await import("../core/render.js");
const reset=()=>{newState(); ensureShape(); RN.invalidate()};

group("الرياضيات: bulgeArc وinSweep",()=>{
 eq(AM.bulgeArc([0,0],[10,0],0),null,"انتفاخ صفر = مستقيم");
 eq(AM.bulgeArc([0,0],[0,0],1),null,"وترٌ منحلّ");
 const A=AM.bulgeArc([0,0],[2000,0],1);
 ok(A&&Math.abs(A.r-1000)<1e-6,"انتفاخ 1 = نصف دائرة نصف قطرها نصف الوتر");
 ok(Math.abs(A.sweep-Math.PI)<1e-9,"المدى π");
 ok(AM.inSweep(A,A.a0+A.sweep/2),"منتصف المدى داخل");
 ok(!AM.inSweep(A,A.a0-0.5),"خارج المدى");
 const B=AM.bulgeArc([0,0],[2000,0],-1);
 ok(B.sweep<0&&AM.inSweep(B,B.a0+B.sweep/2),"الاتجاه المعاكس");
});

group("الإنشاء والرفض",()=>{
 reset();
 throws(()=>P.addPline([[0,0]]),null,"نقطة واحدة تُرفض");
 eq(S.plines.length,0,"لا كتابة عند الرفض");
 const p=P.addPline([[0,0],[3000,0],[3000,2000]],{});
 ok(/^PL\d+$/.test(p.id),"المعرّف بسابقة PL");
 eq(Math.round(P.plineLen(p)),5000,"طول المفتوح = مجموع الأضلاع");
 eq(P.plineArea(p),0,"المفتوح بلا مساحة");
 const c=P.addPline([[0,0],[4000,0],[4000,3000]],{closed:1});
 eq(Math.round(P.plineLen(c)),12000,"المغلق يضيف ضلع الإغلاق");
 eq(Math.round(P.plineArea(c)),6e6,"مساحة المثلث المغلق");
 const d=P.addPline([[0,0],[0,0],[1000,0]],{});
 eq(d.pts.length,2,"المكرّر المتلاصق يُسقَط");
 ok(P.plineById(p.id)===p,"plineById");
});

group("الأقواس والأوّليات والإصابة",()=>{
 reset();
 const q=P.addPline([[0,0],[2000,0]],{bulge:[0.5]});
 const pr=P.plinePrims(q);
 ok(pr.length===1&&pr[0].t==="arc"&&pr[0].L==="A-PLINE"&&pr[0].oid===q.id,"bulge → arc بطبقتها وهويتها");
 ok(P.plineLen(q)>2000,"طول القوس أكبر من الوتر");
 const p=P.addPline([[0,0],[3000,0],[3000,2000]],{});
 const lp=P.plinePrims(p);
 ok(lp.length===2&&lp.every(g=>g.t==="line"),"ضلعان مستقيمان");
 ok(P.plineAt(1500,10,[p],150)===p,"إصابة على الضلع");
 ok(P.plineAt(1500,900,[p],150)===null,"لا إصابة بعيداً");
 const arc=P.plinePrims(q)[0];
 ok(P.plineAt(arc.cx+arc.r*Math.cos(arc.a0*Math.PI/180+0.3),
  arc.cy+arc.r*Math.sin(arc.a0*Math.PI/180+0.3),[q],150)===q,"إصابة على القوس");
 const c=P.addPline([[0,0],[4000,0],[4000,3000],[0,3000]],{closed:1});
 ok(P.plineAt(2000,1500,[c],150)===c,"داخل المغلق يصيب");
 eq(P.plinePrims(c).length,4,"المغلق 4 أضلاع");
});

group("الصندوق المحيط plineBox",()=>{
 reset();
 const a=P.addPline([[0,0],[3000,0],[3000,2000]],{});
 const B=P.plineBox(a);
 ok(B.x0===0&&B.x1===3000&&B.y0===0&&B.y1===2000,"مستقيم: صندوق النقاط");
 const q=P.addPline([[0,0],[2000,0]],{bulge:[1]});
 const Q=P.plineBox(q);
 ok(Q.y0<0&&Q.y1>0,"الانتفاخ يوسّع الصندوق");
 eq(P.plineBox({pts:[]}),null,"فارغ = null");
});

group("الحذف والتطبيع والمشهد",()=>{
 reset();
 const p=P.addPline([[0,0],[3000,0]],{});
 ok(RN.scene().P.some(g=>g.L==="A-PLINE"&&g.oid===p.id),"يظهر في المشهد");
 ok(P.delPline(p)&&!P.delPline(p),"delPline مرّة واحدة");
 S.plines.push({id:"PL9",pts:[[0,0]]},{id:"PL10",pts:[[0,0],[NaN,1]]},
  {id:"PL11",pts:[[0,0],[10,0]],bulge:[0,0],closed:2});
 ensureShape();
 eq(S.plines.length,1,"الفاسد يُسقَط");
 ok(S.plines[0].closed===1&&!S.plines[0].bulge,"closed 0/1 والانتفاخ الصفري يُحذف");
});

process.exit(summary()?1:0);
