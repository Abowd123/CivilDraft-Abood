/* ═══ خصائص هندسية ═══
   عيّناتٌ مولَّدة بمولّدٍ ثابت البذرة (لا Math.random) فيتكرّر
   الفشل إن وقع. لا واجهة — نواةٌ فقط.
   التشغيل:  node js/tests/geom.property.test.js                    */
import {shim,group,ok,near,summary} from "./harness.js";
shim();
import {dist,rotPt,pArea,hasSelfInt} from "../core/geom.js";
import {isArc,arcParams,arcLineInt,arcArcInt,arcSegsTol,
        inSweep,arcLenOf} from "../core/arcmath.js";
import {wallLen} from "../core/walls.js";

let seed=12345;
const rnd=()=>{seed=(seed*1664525+1013904223)>>>0; return seed/4294967296};

group("geom.property: المسافة",()=>{
 for(let i=0;i<100;i++){
  const a=[rnd()*1e6,rnd()*1e6], b=[rnd()*1e6,rnd()*1e6];
  ok(dist(a,b)>=0,"dist ≥ 0");
  ok(dist(a,b)===dist(b,a),"وتماثلية");
  ok(dist(a,a)===0,"وdist(a,a)=0");
 }
});
group("geom.property: الدوران والمساحة",()=>{
 const p=[1000,0];
 for(const d of [30,90,180]){
  const q=rotPt(p,0,0,d);
  ok(Math.abs(dist([0,0],p)-dist([0,0],q))<1e-6,`الدوران ${d}° يحفظ البعد`);
 }
 ok(Math.abs(Math.abs(pArea([[0,0],[1000,0],[1000,1000],[0,1000]]))-1e6)<1,
  "مساحة مربّع 1م");
});
group("geom.property: الأقواس",()=>{
 const w={a:[0,0],b:[1000,0],bulge:0.2,t:200};
 const P=arcParams(w);
 ok(P&&P.R>100,"نصف قطرٍ معقول");
 ok(isArc(w),"bulge=0.2 قوس");
 near(wallLen(w),Math.abs(P.sweep)*P.R,1,"طول الجدار القوسي = طول القوس");
 near(arcLenOf(P),wallLen(w),1e-6,"وarcLenOf يطابقه");
 /* طرفا القوس على الدائرة */
 near(Math.hypot(w.a[0]-P.cx,w.a[1]-P.cy),P.R,1e-6,"a على الدائرة");
 near(Math.hypot(w.b[0]-P.cx,w.b[1]-P.cy),P.R,1e-6,"b على الدائرة");
 /* تقاطع خطٍّ مع القوس: كلُّ نقطةٍ على الدائرة وداخل المدى */
 const hits=arcLineInt(w,[500,-2000],[500,2000]);
 ok(hits.length>=1,"خطٌّ عموديّ يقطع القوس");
 hits.forEach(h=>{
  near(Math.hypot(h[0]-P.cx,h[1]-P.cy),P.R,1e-6,"نقطة التقاطع على الدائرة");
  ok(inSweep(P,Math.atan2(h[1]-P.cy,h[0]-P.cx)),"وداخل المدى");
 });
 ok(arcLineInt(w,[0,5000],[1000,5000]).length===0,"خطٌّ بعيد لا يقطع");
 /* قوسان متماثلان حول الوتر يتقاطعان عند الطرفين */
 const w2={a:[0,0],b:[1000,0],bulge:-0.2,t:200};
 ok(arcArcInt(w,w2).length>=1,"قوسان متقابلان يتقاطعان");
 /* الدقّة: تفاوتٌ أصغر ⇒ قطعٌ أكثر أو مساوية */
 ok(arcSegsTol(P,0.1)>=arcSegsTol(P,2),"تفاوتٌ أدقّ ⇒ قطعٌ أكثر");
 const n=arcSegsTol(P,0.5);
 ok(n>=6&&n<=360,"عدد القطع ضمن الحدّين");
});
group("geom.property: التقاطع الذاتي",()=>{
 ok(!hasSelfInt([[0,0],[1000,0],[1000,1000],[0,1000]]),"مربّعٌ بسيط");
 ok(hasSelfInt([[0,0],[1000,1000],[1000,0],[0,1000]]),"ربطةُ عنق");
 ok(!hasSelfInt([[0,0],[1,1]]),"أقلّ من 4 رؤوس");
});
process.exit(summary()?1:0);
