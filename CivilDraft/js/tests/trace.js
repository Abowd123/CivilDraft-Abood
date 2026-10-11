/* ═══ اختبار الاستنباط وعمليات المزوّد ═══
   بلا شبكة وبلا متصفّح.  node js/tests/trace.js */
import {shim,group,ok,eq,near,deep,throws,summary} from "./harness.js";
shim();

const TR=await import("../core/trace.js");
const {S,newState,ensureShape,edit}=await import("../core/state.js");
const W=await import("../core/walls.js");
const O=await import("../core/opens.js");
const RN=await import("../core/render.js");
const AI=await import("../ai/ops.js");
const {parsePlan}=await import("../ai/plan.js");

const reset=()=>{newState(); ensureShape(); RN.invalidate()};
/* مولّد عشوائيّ ثابت: الاختبار يعيد نفسه دائماً */
const lcg=s=>()=>((s=(s*1103515245+12345)&0x7fffffff)/0x7fffffff);
/* يرسم مضلعاً بضربةٍ واحدة مرتجفة */
function scribble(Q,amp,per,seed,close){
 const r=lcg(seed||7), out=[];
 const N=Q.length-(close?0:1);
 for(let i=0;i<N;i++){
  const a=Q[i], b=Q[(i+1)%Q.length];
  const L=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const n=Math.max(3,Math.round(L/(per||300)));
  const ux=(b[0]-a[0])/L, uy=(b[1]-a[1])/L;
  for(let k=0;k<n;k++){
   const t=k/n;
   const e=(r()-0.5)*2*(amp||80);
   out.push([a[0]+ux*L*t-uy*e, a[1]+uy*L*t+ux*e]);
  }
 }
 if(close)out.push([Q[0][0]+(r()-0.5)*amp*3,
                    Q[0][1]+(r()-0.5)*amp*3]);
 else out.push(Q[Q.length-1].slice());
 return out;
}
const RECT=(w,h)=>[[0,0],[w,0],[w,h],[0,h]];
const nodeKeys=segs=>{
 const m=new Map();
 segs.forEach(s=>[s.a,s.b].forEach(p=>{
  const k=p[0]+","+p[1];
  m.set(k,(m.get(k)||0)+1);
 }));
 return m;
};
/* ═══ ١ · التبسيط ═══ */
group("التبسيط",()=>{
 const P=[[0,0],[100,5],[200,-4],[300,3],[400,0]];
 deep(TR.rdp(P,50),[[0,0],[400,0]],"الخطّ المرتجف يُبسَّط إلى طرفين");
 eq(TR.rdp(P,1).length,5,"وبتفاوتٍ ضيّق تبقى النقاط");
 const L=[[0,0],[1000,0],[1000,1000]];
 eq(TR.rdp(L,50).length,3,"الركن يُحفَظ");
 eq(TR.cleanStroke([[0,0],[1,1],[500,0]],8).length,2,
  "النقاط المتلاصقة تُسقَط");
});
/* ═══ ٢ · دوران الشبكة ═══ */
group("دوران الشبكة",()=>{
 const mk=a=>({ang:a,L:5000});
 near(TR.gridAngle([mk(0),mk(90),mk(180),mk(270)]),0,0.2,
  "المستقيم يعطي صفراً");
 near(TR.gridAngle([mk(12),mk(102),mk(192),mk(282)]),12,0.2,
  "المائل ١٢° يُستخرَج");
 near(TR.gridAngle([mk(89),mk(179),mk(1),mk(271)]),0,1.2,
  "الالتفاف حول ٩٠ محسوب");
});
/* ═══ ٣ · مستطيل مخربَش ═══ */
group("مستطيل مخربَش",()=>{
 const P=TR.trace([scribble(RECT(6000,4000),80,300,11,1)]);
 eq(P.stat.segs,4,"أربعة مسارات");
 ok(P.segs.every(s=>s.snapped),"كلّها مقصوصة على الشبكة");
 near(P.rot,0,0.6,"الدوران صفر");
 ok(P.segs.every(s=>s.dev<0.25),
  "والانحراف بعد اللحم يتلاشى — الركن تقاطعُ محورَين");
 const A=P.segs.map(s=>s.L).sort((a,b)=>b-a);
 near(A[0],6000,600,"الضلع الطويل ≈ ٦ م");
 near(A[3],4000,600,"والقصير ≈ ٤ م");
 const N=nodeKeys(P.segs);
 eq(N.size,4,"أربع عقد");
 ok([...N.values()].every(v=>v===2),
  "كلٌّ درجتها ٢ — الحلقة مغلقة بلا طرفٍ حرّ");
 ok(P.stat.axis>=3,"الأركان حُلَّت بتقاطع المحورين لا بالقطب");
});
/* ═══ ٤ · حرف L والضجيج ═══ */
group("حرف L والضجيج",()=>{
 const Q=[[0,0],[8000,0],[8000,3000],[4000,3000],
          [4000,6000],[0,6000]];
 const P=TR.trace([scribble(Q,70,300,23,1)]);
 eq(P.stat.segs,6,"ستّة مسارات");
 ok(P.segs.every(s=>s.snapped),"كلّها مقصوصة");
 /* خربشةُ رقمٍ بخطّ اليد: ضربةٌ قصيرة متعرّجة تُسقَط */
 const noise=[[9000,1000],[9150,1200],[9000,1400],
              [9160,1600],[9010,1750]];
 const P2=TR.trace([scribble(Q,70,300,23,1),noise]);
 eq(P2.stat.segs,6,"الضجيج لا يصير جداراً");
 ok(P2.stat.noise+P2.stat.short>0,"بل يُعَدّ ويُبلَّغ");
});
/* ═══ ٥ · الضربة المزدوجة ═══ */
group("الدمج",()=>{
 const a=[[0,0],[3000,0],[6000,0]];
 const b=[[200,90],[3200,-70],[6000,60]];
 const P=TR.trace([a,b],{minSeg:400});
 eq(P.stat.segs,1,"ضربتان على الخطّ نفسه ⇒ مسارٌ واحد");
 ok(P.segs[0].merged>1,"ويُذكَر أنه مدموج");
 near(P.segs[0].L,6000,400,"بطولٍ يغطّي الاثنين");
});
/* ═══ ٦ · المعايرة والتقريب ═══ */
group("المعايرة",()=>{
 const P=TR.trace([scribble(RECT(6000,4000),60,300,5,1)]);
 const was=P.segs[0].L;
 TR.scalePlan(P.segs,2);
 near(P.segs[0].L,was*2,3,"المضاعفة تضاعف الطول");
 const ang=P.segs.map(s=>s.ang);
 TR.scalePlan(P.segs,0.5);
 deep(P.segs.map(s=>s.ang),ang,"والزوايا لا تتغيّر بالمقياس");
 const sh=TR.snapPts(P.segs,100);
 ok(sh<=71,"التقريب إلى ١٠ سم يُبلَّغ بأكبر إزاحة");
 ok(P.segs.every(s=>s.a[0]%100===0&&s.a[1]%100===0),
  "والنقاط صارت على الشبكة");
});
/* ═══ ٧ · الخطّة لا تلمس الحالة ═══ */
group("الخطّة اقتراح",()=>{
 reset();
 const P=TR.trace([scribble(RECT(6000,4000),80,300,3,1)]);
 eq(S.walls.length,0,"الاستنباط لم يُنشئ جداراً");
 const n=edit(()=>{
  let c=0;
  P.segs.forEach(s=>{W.addWall(s.a,s.b,200,"ext","c"); c++});
  return c;
 });
 eq(n,4,"والتطبيق الصريح أنشأ أربعة");
 eq(S.walls.length,4,"وهي في الحالة");
 RN.invalidate();
 eq(RN.scene().solid.length,2,"وتصنع غرفةً مغلقة: حلقتان");
 eq(W.looseEnds(2).length,0,"ولا طرفَ حرّاً — الأركان محلولة");
});
/* ═══ ٨ · عمليات المزوّد: التصديق ═══ */
group("تصديق العمليات",()=>{
 const v=AI.validate([
  {op:"wall",a:[0,0],b:[5,0]},
  {op:"wall",a:"سلام",b:[5,0]},
  {op:"eval",s:"alert(1)"},
  {op:"open",wall:"X1",kind:"door",at:2,w:0.9},
  {op:"open",wall:"W1",kind:"طائر",at:2,w:0.9},
  {op:"field",kind:"open",ids:["O1"],field:"مجهول",value:1},
  {op:"note",s:"مرحباً"}]);
 eq(v.ok.length,2,"قُبلت الصالحتان وحدهما");
 eq(v.bad.length,5,"ورُفضت الخمس");
 ok(v.bad.every(b=>b.why&&b.why.length>4),"وكلٌّ برسالة");
 ok(v.bad.some(b=>/مجهولة/.test(b.why)),"العملية المجهولة تُسمّى");
 deep(v.ok[0].a,[0,0],"والمتر تحوّل مليمتراً");
 deep(v.ok[0].b,[5000,0],"في الطرف الآخر كذلك");
 ok(/JSON/.test(AI.SPEC)&&/op/.test(AI.SPEC),
  "والعقد المُعلَن يذكر الصيغة");
});
/* ═══ ٩ · عمليات المزوّد: التطبيق ═══ */
group("تطبيق العمليات",()=>{
 reset();
 const r=edit(()=>AI.applyOps([
  {op:"wall",a:[0,0],b:[6,0],t:0.25,type:"ext"},
  {op:"wall",a:[6,0],b:[6,4],t:0.25,type:"ext"},
  {op:"wall",a:[6,4],b:[0,4],t:0.25,type:"ext"},
  {op:"wall",a:[0,4],b:[0,0],t:0.25,type:"ext"},
  {op:"note",s:"غرفة ٦×٤"}]));
 eq(r.done,4,"أُنشئت أربعة جدران");
 eq(S.walls.length,4,"وهي في الحالة");
 eq(r.notes.length,1,"والملاحظة بلا أثر");
 eq(r.refused.length,0,"ولا رفض");
 /* القيود تعمل: المزوّد لا يعرفها ولا يحتاج */
 const w=S.walls[0];
 const r2=edit(()=>AI.applyOps([
  {op:"open",wall:w.id,kind:"door",at:3,w:0.9,h:2.1},
  {op:"open",wall:w.id,kind:"window",at:3.2,w:1.2,h:1.4,sill:0.9},
  {op:"open",wall:w.id,kind:"door",at:0.05,w:0.9,h:2.1}]));
 eq(r2.done,1,"الفتحة السليمة وحدها كُتبت");
 eq(r2.refused.length,2,"والمتراكبة والخارجة رُفضتا");
 ok(r2.refused.some(x=>/تتراكب/.test(x)),"بذكر التراكب");
 ok(r2.refused.some(x=>/يخرج|المدى/.test(x)),"وبذكر المدى");
 eq(S.opens.length,1,"ولم يبقَ إلا الصحيح");
 /* الحقل الجماعي يمرّ من applyField نفسه */
 const r3=edit(()=>AI.applyOps([{op:"field",kind:"open",
  ids:[S.opens[0].id],field:"swing",value:"right"}]));
 eq(S.opens[0].swing,"right","جهة الفتح كُتبت");
 eq(r3.refused.length,0,"بلا رفض");
 /* المنطقة تحتاج حلقةً مغلقة */
 RN.invalidate();
 const r4=edit(()=>AI.applyOps([
  {op:"area",at:[3,2],name:"مجلس"},
  {op:"area",at:[90,90],name:"لا شيء"}]));
 eq(r4.done,1,"المنطقة داخل الحلقة قُبلت");
 eq(S.areas[0].name,"مجلس","بالاسم المطلوب");
 ok(r4.refused.some(x=>/حلقة/.test(x)),"والخارجة رُفضت بسببها");
});
/* ═══ ١٠ · الحزمة المُرسَلة ═══ */
group("حزمة السياق",()=>{
 const c=AI.contextOf({walls:1,opens:1,areas:1});
 eq(c.unit,"م","الوحدة مُعلَنة");
 ok(Array.isArray(c.walls)&&c.walls.length===4,"الجدران فيها");
 ok(c.walls.every(w=>Math.abs(w.a[0])<100),
  "بالمتر لا بالمليمتر");
 ok(!c.refLayers,"ولا يُرسَل المرجع إلا بطلب");
 ok(!c.cols,"ولا الأجزاء");
 const b=AI.bytesOf(c);
 ok(b.n>50&&b.n<20000,`الحجم ${b.n} بايت — يُطبَع قبل الإرسال`);
});
/* ═══ ١١ · المعرّف الصغير يُطبَّع فحصاً وتنفيذاً ═══ */
group("plan / تطبيع المعرّفات",()=>{
 reset();
 edit(()=>AI.applyOps([
  {op:"wall",a:[0,0],b:[6,0],t:0.2,type:"ext"},
  {op:"wall",a:[6,0],b:[6,4],t:0.2,type:"ext"}]));

 /* خطّة يكتب فيها المزوّد المعرّف صغيراً — وops.js تُخرجه كبيراً */
 const txt="```plan\nw1\n```\n\n";
 const p=parsePlan(txt,0,50);
 eq(p.lines.length,1,"سطرٌ واحدٌ في الخطّة");
 eq(p.lines[0].s,"W1","المطبَّع في rec.s هو المعروض والمُنفَّذ");
 ok(!p.lines[0].bad,"ولا يُرفض — «w1» و«W1» العنصرُ نفسه");

 /* معرّفٌ مختلَقٌ يبقى رفضاً صريحاً */
 const p2=parsePlan("```plan\nq99\n```",0,50);
 ok(p2.lines[0].bad&&/مُختلَق/.test(p2.lines[0].bad),
  "المختلَق يُرفض بذكر السبب");
});
process.exit(summary()?1:0);
