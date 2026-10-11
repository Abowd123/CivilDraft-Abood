/* ═══ F2 — تقسيم تصدير BOQ بالطوابق ═══
   node js/tests/boq-levels.test.js
   يثبت أن CSV وHTML وPDF الصفحة يحملون وسم المستوى حين يُبنَون من
   boqLevel، وأنّ boq() الكاملة بلا tag لم يتغيّر شكلها. */
import {shim,group,eq,ok,summary} from "./harness.js";
shim();
const {S,newState} = await import("../core/state.js");
const {addWall} = await import("../core/walls.js");
const {addOpen} = await import("../core/opens.js");
const {levelGroups,boqLevel,boq} = await import("../core/boq.js");
const {toCSV} = await import("../io/boq.js");
const {boqHTML} = await import("../io/boqreport.js");

group("F2 — CSV/HTML يحملان وسم المستوى",()=>{
 newState(); S.meta.name="فلة"; S.meta.wallH=3000;
 S.meta.level=0;
 const w=addWall([0,0],[5000,0],250,"ext","c");
 addOpen(w,1000,"door",900,2100,0);
 S.meta.level=1;
 addWall([0,2000],[5000,2000],200,"ext","c");
 S.meta.level=0;

 const g=levelGroups();
 eq(g.groups.length,2,"مجموعتان: أرضي وطابق 1");

 const B1=boqLevel(1), C1=toCSV(B1);
 ok(C1.txt.includes("المستوى"),"سطر المستوى في CSV");
 ok(C1.txt.includes("طابق 1"),"الوسم العربي في CSV");

 const B0=boqLevel(0), C0=toCSV(B0);
 ok(C0.txt.includes("أرضي"),"أرضي في CSV");

 const H1=boqHTML(B1);
 ok(H1.includes("طابق 1"),"وسم المستوى في HTML");

 /* boq() الكاملة بلا tag لم تُضَف إليها سطر مستوى */
 const C=toCSV(boq());
 ok(!C.txt.includes("المستوى"),"جدول «الكل» بلا سطر مستوى زائد");
});

process.exit(summary()?1:0);
