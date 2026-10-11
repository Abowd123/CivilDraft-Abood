/* ═══ المرحلة 5 — تأليف الأقواس يدوياً ═══
   يثبت أن collectFromSel يحفظ العمودَ الدائريّ دائرةً والجدارَ
   القوسيَّ قوساً لا مضلّعاً، وأن القوس ينجو من explode وصولاً إلى
   DXF (ARC/CIRCLE) — فيغلق المسار الكامل: تحديد ← كتلة ← إدراج ←
   تصدير، بلا لمس core/blocks.js السليم مسبقاً (D14). */
import "./harness.js";
import {S,DEF,loadState} from "../core/state.js";
import {isArc} from "../core/walls.js";
import {collectFromSel} from "../tools/blockcollect.js";
import * as BLK from "../core/blocks.js";
import {toDXF} from "../io/dxf.js";

let PASS=0, FAIL=0;
const chk=(n,f)=>{
 try{f(); PASS++; console.log("  ✓ "+n)}
 catch(e){FAIL++; console.error("  ✗ "+n+"\n    "+((e&&e.message)||e))}
};
const ok=(c,m)=>{if(!c)throw new Error(m||"شرطٌ خاطئ")};
const eq=(a,b,m)=>{
 const A=JSON.stringify(a), B=JSON.stringify(b);
 if(A!==B)throw new Error((m||"")+"\nمتوقّع: "+B+"\nفعلي: "+A);
};

console.log("═ phase5.blockcollect-arc.test.js ═");
loadState(DEF(),true);

/* جدار قوسي L=1000, bulge=0.5 ⇐ R=625, زاوية 4·atan(0.5)≈1.854 */
S.walls.push({id:"W3",a:[0,0],b:[1000,0],t:200,type:"ext",
 align:"c",bulge:0.5});
/* عمود دائري نصف قطره 300 */
S.cols.push({id:"K1",x:500,y:500,w:600,h:600,rot:0,
 kind:"circ",type:"conc"});

const coll=collectFromSel([{k:"wall",id:"W3"},{k:"col",id:"K1"}]);

chk("جدار قوسي محدَّد يتحوّل arc لا pline",()=>{
 ok(coll.prims.length===2,`العدد ${coll.prims.length}`);
 ok(coll.prims.some(p=>p.t==="arc"),"لا قوس بين البدائيات");
 ok(!coll.prims.some(p=>p.t==="pline"),"قُسِّم إلى مضلّع");
});

chk("نصف قطر القوس صحيح من bulge",()=>{
 const p=coll.prims.find(x=>x.t==="arc");
 ok(Math.abs(p.r-625)<2,`R=${p.r} لا 625`);
 ok(Math.abs((p.a1-p.a0)-4*Math.atan(0.5))<0.02,
  "زاوية الاجتياح غير 4·atan(b)");
});

chk("عمود دائري يتحوّل circle لا مضلّعاً",()=>{
 const p=coll.prims.find(x=>x.t==="circle");
 ok(!!p,"لا دائرة للعمود");
 ok(p.r===300,`r=${p.r} لا 300`);
});

chk("explode يخرج القوس حقيقياً بالدرجات (D14)",()=>{
 BLK.defineFromPrims("arcblk","اختبار",coll.prims,[0,0]);
 const ex=BLK.explode(BLK.makeInstance("arcblk"));
 /* arc + circle الصلبة تخرجان arc بعد explode */
 eq(ex.length,2);
 ok(ex.every(p=>p.t==="arc"),"لم ينجُ القوس من explode");
});

chk("DXF يكتب ARC وقوساً كاملاً CIRCLE",()=>{
 BLK.defineFromPrims("arcblk2","اختبار2",coll.prims,[0,0]);
 const ex=BLK.explode(BLK.makeInstance("arcblk2"));
 const d=toDXF(ex,{x0:-2000,y0:-2000,x1:2000,y1:2000});
 ok(d.includes("ARC"),"لا كيان ARC");
 ok(d.includes("CIRCLE"),"القوس الكامل لم يُكتب دائرةً");
});

console.log(`\n${PASS} نجح · ${FAIL} فشل —`);
if(FAIL)process.exitCode=1;
