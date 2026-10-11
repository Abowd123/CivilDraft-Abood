/* ═══ المرحلة A — سحابة المراجعة RC ═══
   node js/tests/phaseA-clouds.test.js */
import {shim,group,ok,eq,throws,summary} from "./harness.js";
shim();
const {S,newState,ensureShape}=await import("../core/state.js");
const C=await import("../core/clouds.js");
const LY=await import("../core/layers.js");
const RN=await import("../core/render.js");
const reset=()=>{newState(); ensureShape(); RN.invalidate()};
const SQ=n=>[[0,0],[n,0],[n,n],[0,n]];

group("الإنشاء والتسمية",()=>{
 reset();
 throws(()=>C.addCloud([[0,0],[100,0],[100,100]]),null,"حلقة أدنى من 1 م² تُرفض");
 eq(S.clouds.length,0,"لا كتابة عند الرفض");
 const a=C.addCloud(SQ(2000),{}), b=C.addCloud(SQ(3000),{});
 eq(a.label,"RC1","الأولى RC1"); eq(b.label,"RC2","الثانية RC2");
 ok(/^RC\d+$/.test(a.id),"المعرّف بسابقة RC");
 C.delCloud(a);
 eq(C.nextCloudLabel(),"RC1","أول فجوة حرة بعد الحذف");
 eq(C.addCloud(SQ(2000),{label:"مراجعة 3"}).label,"مراجعة 3","تسمية صريحة");
 eq(C.addCloud(SQ(2000),{r:99999}).r,5000,"نصف القطر يُقيَّد");
 ok(C.cloudById(b.id)===b,"cloudById");
 ok(!C.delCloud(a),"حذف ثانٍ false");
});

group("الإصابة والأوّليات",()=>{
 reset();
 const big=C.addCloud(SQ(6000),{}), small=C.addCloud([[1000,1000],[3000,1000],[3000,3000],[1000,3000]],{});
 ok(C.cloudAt(2000,2000)===small,"الأصغر مساحةً يُفضَّل");
 ok(C.cloudAt(5000,5000)===big,"داخل الكبيرة فقط");
 ok(C.cloudAt(9000,9000)===null,"خارج الكل");
 const pr=C.cloudPrims(small);
 ok(pr.filter(g=>g.t==="arc").length>=8,"فَلَقات قوسية");
 ok(!pr.some(g=>g.t==="line"),"لا ضلع مستقيم في السحابة — أقواس ونصّ فقط");
 ok(pr.every(g=>g.L==="A-CLOUD"&&g.oid===small.id),"طبقة وهوية");
 const tx=pr.filter(g=>g.t==="text");
 ok(tx.length===1&&tx[0].s===small.label,"الوسم في المنتصف");
});

group("الطبقة والمشهد وENSURE",()=>{
 reset();
 eq(LY.plots("A-CLOUD"),false,"A-CLOUD لا تُطبَع مصنعياً");
 const c=C.addCloud(SQ(2000),{});
 ok(RN.scene().P.some(g=>g.L==="A-CLOUD"&&g.oid===c.id),"تظهر في المشهد");
 S.clouds.push({id:"RC90",ring:[[0,0],[1,1]]},{id:"RC91",ring:[[0,0],[9,9],[NaN,1]]});
 ensureShape();
 eq(S.clouds.length,1,"الفاسدة تُسقَط");
});

process.exit(summary()?1:0);
