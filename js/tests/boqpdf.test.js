/* ═══ جداول PDF لحصر الكميات ═══
   يفحص البنّاء الخالص (boqPDFPrims: أوّلياتٌ ومربّعٌ بلا قماش)
   ثم التنفيذ الفعليّ (boqSchedulePDF: يمرّ فعلاً بـio/pdf.js#toPDFz
   عبر شِبه القماش) — نفس نمط js/tests/arc-direction.test.js.
   التشغيل:  node js/tests/boqpdf.test.js */
import {shim,shimCanvas,group,groupAsync,ok,eq,summary} from "./harness.js";
shim(); shimCanvas();
const {S,newState,ensureShape}=await import("../core/state.js");
const {addWall}=await import("../core/walls.js");
const {addOpen}=await import("../core/opens.js");
const {addArea}=await import("../core/areas.js");
const {addCol}=await import("../core/cols.js");
const {boq}=await import("../core/boq.js");
const {boqPDFPrims,boqSchedulePDF}=await import("../io/boqpdf.js");
const dec=new TextDecoder();

function build(){
 newState();
 S.meta.name="بيت التجربة"; S.meta.scale=100; S.meta.date="2026-09-26";
 const w1=addWall([0,0],[4000,0],250,"ext","c");
 addWall([4000,0],[4000,3000],250,"ext","c");
 addWall([4000,3000],[0,3000],250,"ext","c");
 addWall([0,3000],[0,0],250,"ext","c");
 addOpen(w1,900,"door",900,2100,0);
 addOpen(w1,2500,"window",1200,1400,900);
 addArea([[0,0],[4000,0],[4000,3000],[0,3000]],"صالة");
 addCol("rect",[300,300],400,400,0,"conc");
 ensureShape();
}

group("boqPDFPrims — بنّاءٌ خالص بلا قماش",()=>{
 build();
 const r=boqPDFPrims(boq());
 ok(Array.isArray(r.prims)&&r.prims.length>0,"أوّليات تُعاد");
 ok(!r.empty,"المشروع فيه فتحات وأعمدة ومناطق — ليس فارغاً");
 eq(r.n.opens,2,"نوعا فتحتين: باب وشباك");
 eq(r.n.cols,1,"نوع عمودٍ واحد");
 eq(r.n.areas,1,"منطقةٌ واحدة");
 const texts=r.prims.filter(g=>g.t==="text").map(g=>g.s);
 ok(texts.includes("جدول الفتحات"),"عنوان جدول الفتحات");
 ok(texts.includes("جدول الأعمدة"),"عنوان جدول الأعمدة");
 ok(texts.includes("جدول المناطق"),"عنوان جدول المناطق");
 ok(texts.includes("باب مفرد")||texts.some(s=>/باب/.test(s)),
  "اسم الباب العربي في صفّ الفتحات");
 ok(texts.includes("صالة"),"اسم المنطقة في صفّها");
 ok(texts.some(s=>s==="0.90"),"عرض الباب 0.90 م بالنقطة العشرية");
 eq(r.box.x1,297*Math.max(1,S.meta.scale),
  "الصندوق مضروبٌ بمقياس المشروع (توافقاً مع قسمة toPDF عليه)");
 eq(r.page.w,297,"صفحة A4 أفقية — العرض 297مم");
 eq(r.page.h,210,"صفحة A4 أفقية — الارتفاع 210مم");
 eq(r.over,0,"لا تجاوز صفحةٍ لمشروعٍ صغير كهذا");
});

group("boqPDFPrims — لا فتحات ولا أعمدة ولا مناطق ⇒ empty",()=>{
 newState(); ensureShape();
 const r=boqPDFPrims(boq());
 ok(r.empty,"مشروعٌ بلا جدرانٍ حتى — فارغٌ من الجداول الثلاثة");
 eq(r.prims.length,2,"العنوان والمقياس فقط — بلا أيّ جدول");
});

await groupAsync("boqSchedulePDF — PDF فعليّ عبر الكاتب الموحَّد",async()=>{
 build();
 const r=await boqSchedulePDF(boq());
 ok(r.bytes instanceof Uint8Array&&r.bytes.length>0,"بايتاتٌ حقيقية تُعاد");
 ok(!r.empty,"غير فارغ");
 eq(r.n.opens,2,"نوعا فتحتين مُمرَّران في النتيجة");
 ok(r.bytes.length>4&&dec.decode(r.bytes.slice(0,5))==="%PDF-",
  "الرأس %PDF- في أوّل الملفّ");
 ok(r.arabic>0,"نصوصٌ عربية أُدرجت (قناعٌ لكلّ نصٍّ فريد)");
});

process.exit(summary());
