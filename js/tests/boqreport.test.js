/* MT4 — تقرير العميل: HTML يبني أقسام BOQ الحقيقية، وCSV الفتحات
   بأعمدته، والمستبعَد (مخفيّ/غير قابل للطباعة) يُعلَن عدداً لا يُخفى.
   التشغيل: node js/tests/boqreport.test.js */
import {shim,group,ok,summary} from "./harness.js";
shim();
const {S,newState,ensureShape}=await import("../core/state.js");
const {addWall}=await import("../core/walls.js");
const {addOpen}=await import("../core/opens.js");
const {addArea}=await import("../core/areas.js");
const {addCol}=await import("../core/cols.js");
const {setLay}=await import("../core/layers.js");
const {boq}=await import("../core/boq.js");
const {boqHTML,opensCSV}=await import("../io/boqreport.js");

function build(){
 newState();
 S.meta.name="بيت التجربة"; S.meta.scale=100;
 S.meta.date="2026-09-26"; S.meta.wallH=3000;
 addWall([0,0],[4000,0],250,"ext","c");
 addWall([4000,0],[4000,3000],250,"ext","c");
 addWall([4000,3000],[0,3000],250,"ext","c");
 const w=addWall([0,3000],[0,0],250,"ext","c");
 const wi=addWall([2000,0],[2000,3000],150,"int","c");
 addOpen(wi,500,"door",900,2100,0);
 addOpen(w,1000,"window",1200,1400,900);
 addArea([[0,0],[2000,0],[2000,3000],[0,3000]],"صالة");
 addCol("rect",[1000,1500],400,400,0,"conc");
 ensureShape();
}

group("HTML — الترويسة وأسماء الأقسام",()=>{
 build();
 const H=boqHTML(boq());
 ok(H.includes("بيت التجربة"),"اسم المشروع حاضر");
 ok(/المقياس 1:100/.test(H),"المقياس حاضر");
 ok(H.includes("الجدران")&&H.includes("الفتحات")&&H.includes("المناطق"),
  "أقسام الجدران والفتحات والمناطق حاضرة");
 ok(H.includes("الأعمدة"),"قسم الأعمدة حاضر (مشروعٌ فيه عمود)");
 ok(H.includes("باب مفرد")&&H.includes("شباك")&&H.includes("صالة"),
  "أسماء الأصناف العربية في الصفوف");
});

group("HTML — المستبعَد يُعلَن لا يُخفى",()=>{
 build();
 setLay("A-DOOR","off",1);
 const H=boqHTML(boq());
 ok(/1 عنصراً مخفيّاً/.test(H),"تحذير المخفي بعدده");
});

group("CSV — BOM والأعمدة والأرقام",()=>{
 build();
 const C=opensCSV(boq());
 ok(C.charCodeAt(0)===0xFEFF,"BOM أوّل الملف");
 const L=C.slice(1).split("\r\n");
 ok(L[0].startsWith("النوع,العدد"),"ترويسة الأعمدة العربية");
 ok(L.some(s=>s.startsWith("باب مفرد,")),"صفّ الباب");
 ok(L.some(s=>s.startsWith("شباك,")),"صفّ الشباك");
 ok(/0\.90/.test(C)&&/1\.20/.test(C),"العروض بالنقطة العشرية");
 ok(!/٫/.test(C),"لا فاصلة عربية في الأرقام");
});

group("HTML — مشروعٌ فارغ لا يكسر البانِي",()=>{
 newState(); ensureShape();
 const H=boqHTML(boq());
 ok(H.includes("<table "),"يبني الهيكل حتى بلا بيانات");
});

process.exit(summary());
