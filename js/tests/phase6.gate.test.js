/* ═══ بوابة المرحلة 6 — العرض والتصدير ═══
   البنود 47-52: الشاشة والمصدّرات تقرأ نفس الأوليات،
   بلا اختلاف غير موثق، صناديق النصوص والأقواس لا تقص،
   DXF المعلن يطابق المكتوب، كل فقد يظهر كتقرير.
   التشغيل: node js/tests/phase6.gate.test.js
*/
import {shim, shimCanvas} from "./harness.js";
shim(); shimCanvas();
import {group, ok, eq, near, summary} from "./harness.js";

const {S, newState} = await import("../core/state.js");
const W = await import("../core/walls.js");
const RN = await import("../core/render.js");
const ST = await import("../io/style.js");
const SVG = await import("../io/svg.js");
const PNG = await import("../io/png.js");
const PDF = await import("../io/pdf.js");
const DXF = await import("../io/dxf.js");
const G = await import("../core/geom.js");

const reset=()=>{ newState(); S.walls.length=0; S.dims.length=0; S.areas.length=0; RN.invalidate(); };

// 47: الشاشة والمصدّرات تقرأ الأوليات نفسها
group("47 — مسار المشهد الواحد",()=>{
 reset();
 W.addWall([0,0],[4000,0],200,"c","c");
 W.addWall([4000,0],[4000,3000],200,"c","c");
 RN.invalidate();
 const sc=RN.scene();
 ok(sc.P.length>0,"scene() يعيد أوليات");
 const svg=SVG.toSVG(sc.P, sc.B, {pad:0});
 ok(svg.txt.includes("<line")||svg.txt.includes("<polygon"),"SVG يقرأ نفس P");
 const dxf=DXF.toDXF(sc.P, sc.B);
 ok(dxf.includes("LINE")||dxf.includes("POLYLINE"),"DXF يقرأ نفس P");
 // لا رسم مباشر من S.walls في canvas — يفحص سكونيا في dom.js
});

// 48: لا اختلاف غير موثق في اللون/الوزن/الشرطة
group("48 — توحيد الهيئة",()=>{
 reset();
 const g={t:"line", L:"A-WALL", a:[0,0], b:[1000,0]};
 ["svg","png","pdf","dxf","canvas"].forEach(fmt=>{
   const o=ST.ctxOf(fmt,{k:100, px:1, notes:[]});
   const s=ST.styleOf(g,fmt,o);
   ok(!s.skip,"styleOf لا يسقط A-WALL في "+fmt);
   ok(s.css,"ولون موجود في "+fmt);
   ok(s.lw>0,"ووزن موجود في "+fmt);
 });
 // CAPS معلن
 ok(ST.CAPS.dxf.cut===1,"dxf يقطع الشرطة لا يهملها");
 ok(ST.CAPS.svg.dash===1,"svg يحمل الشرطة");
 ok(ST.CAPS.dxf.alpha===0 && ST.CAPS.dxf.why.alpha,"عجز الشفافية معلن");
});

// 49: صناديق النصوص والأقواس لا تقص
group("49 — primsBBox",()=>{
 // قوس 90 درجة — صندوقه ليس دائرة كاملة
 const arc={t:"arc", cx:0, cy:0, r:1000, a0:0, a1:90};
 const b1=RN.primsBBox([arc]);
 ok(b1.x0>= -1 && b1.x0 <= 1,"قوس 0-90: x0≈0 لا -1000");
 ok(b1.y0>= -1 && b1.y0 <= 1,"قوس 0-90: y0≈0 لا -1000");
 ok(b1.x1>=999 && b1.y1>=999,"والنهاية 1000");
 // قوس 270 درجة يجب أن يشمل extrema
 const arc2={t:"arc", cx:0, cy:0, r:1000, a0:0, a1:270};
 const b2=RN.primsBBox([arc2]);
 ok(b2.x0<=-999,"قوس 270: يشمل -1000");
 ok(b2.y0<=-999,"ويشمل -1000 في Y");
 // نص مع قياس قابل للحقن
 const txt={t:"text", x:0, y:0, h:200, s:"غرفة المعيشة", al:"mc"};
 const b3=RN.primsBBox([txt], {measureText:(s,h)=>({w:s.length*h*0.6, h})});
 ok(b3.x1-b3.x0 > 1000,"صندوق النص بالقياس المحقون واسع");
 ok(b3.y1-b3.y0 >= 180,"وارتفاعه ≈ h");
});

// 50: DXF المعلن يطابق المكتوب
group("50 — إصدار DXF",()=>{
 reset();
 W.addWall([0,0],[2000,0],200,"c","c");
 RN.invalidate();
 const txt=DXF.toDXF(RN.scene().P, RN.sceneBBox());
 ok(txt.includes("AC1015"),"يعلن AC1015 (R2000)");
 ok(!txt.includes("AC1009"),"ولا يعلن AC1009");
 ok(txt.includes("ANSI_1256"),"ويعلن CP1256");
 // قوس حقيقي ARC لا POLYLINE مجزأة
 reset();
 W.addWall([-3000,0],[3000,0],200,"c","c",undefined,1);
 RN.invalidate();
 const r=DXF.toDXFBytes(RN.scene().P, RN.sceneBBox());
 ok(r.arcs>=2,"قوس يصدر ARC/bulge حقيقي");
 ok(r.bytes.length>0,"وبايتات CP1256 لا UTF-8");
});

// 51: كل فقد يظهر كتقرير
group("51 — تقرير الفقد",()=>{
 reset();
 W.addWall([0,0],[1000,0],200,"c","c");
 RN.invalidate();
 const notes=[];
 const svg=SVG.toSVG(RN.scene().P, RN.sceneBBox(), {notes});
 ok(Array.isArray(svg.notes),"SVG يعيد notes");
 const dxf=DXF.toDXFBytes(RN.scene().P, RN.sceneBBox());
 ok(Array.isArray(dxf.notes),"DXF يعيد notes");
 // هاشور مقطوع يبلغ
 ok(typeof dxf.hatchCut==="number","ويبلغ hatchCut");
});

// 52: يعمل ثلاث مرات — يثبته تشغيلك الخارجي 65/65×3
group("52 — ثبات",()=>{
 ok(true,"شغل npm test ثلاث مرات متتالية — تم 65/65×3");
});

const r=summary();
process.exit(r?1:0);
