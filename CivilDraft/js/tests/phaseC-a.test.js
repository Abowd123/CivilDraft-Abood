/* المرحلة C-أ — تنظيف المشروع (25) · مسح التكرار (26) · بوابة التسليم (9):
   المنطق الخالص على Node بلا DOM.  node js/tests/phaseC-a.test.js */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const {S,newState,undo}=await import("../core/state.js");
const {addWall}=await import("../core/walls.js");
const {addCol}=await import("../core/cols.js");
const {addLay,layOf}=await import("../core/layers.js");
const BLK=await import("../core/blocks.js");
const CL=await import("../tools/cleanup.js");
const DD=await import("../tools/dedup.js");

group("25 · تنظيف: تقريرٌ قبل الحذف",()=>{
 newState();
 addLay("C-TEST","اختبار");
 const r=CL.buildReport();
 ok(r.emptyLayers.some(l=>l.n==="C-TEST"),"الطبقة الفارغة في التقرير");
 ok(!r.emptyLayers.some(l=>l.n==="A-WALL"),"المصنعيّة لا تظهر");
 ok(layOf("C-TEST"),"لم يُحذف شيءٌ بعد التقرير");
});
group("25 · تنظيف: الكتل",()=>{
 newState();
 BLK.defineBlock({name:"tmpb",title:"مؤقتة",prims:[{t:"line",a:[0,0],b:[1,0]}],base:[0,0]});
 BLK.defineBlock({name:"usedb",title:"مستعملة",prims:[{t:"line",a:[0,0],b:[1,0]}],base:[0,0]});
 S.blocks.push(BLK.makeInstance("usedb",{x:0,y:0}));
 const r=CL.buildReport();
 ok(r.unusedBlocks.some(b=>b.name==="tmpb"),"غير المستعملة تظهر");
 ok(!r.unusedBlocks.some(b=>b.name==="usedb"),"المستعملة لا تظهر");
 ["door","window","table"].forEach(n=>
  ok(!r.unusedBlocks.some(b=>b.name===n),`الافتراضية «${n}» محميّة`));
});
group("25 · تنظيف: التنفيذ خطوةُ تراجعٍ واحدة",()=>{
 newState();
 addLay("C-A","أ"); addLay("C-B","ب");
 BLK.defineBlock({name:"tmpb",title:"م",prims:[{t:"line",a:[0,0],b:[1,0]}],base:[0,0]});
 const res=CL.applyCleanup(["C-A","C-B"],["tmpb"]);
 eq(res.lays,2,"حُذفت طبقتان"); eq(res.blks,1,"وكتلة");
 ok(!layOf("C-A")&&!BLK.hasBlock("tmpb"),"اختفت");
 undo();
 ok(layOf("C-A")&&layOf("C-B"),"تراجعٌ واحد يعيد الطبقتين");
});
group("25 · تنظيف: الرفض يُبلَّغ لا يُبتلَع",()=>{
 newState();
 const res=CL.applyCleanup(["A-WALL"],[]);
 eq(res.lays,0,"المصنعيّة لا تُحذَف");
});

group("26 · تكرار: الجدران",()=>{
 newState();
 addWall([0,0],[3000,0],200,"int","c");
 addWall([3000,0],[0,0],200,"int","c");           /* معكوس */
 addWall([0,1000],[3000,1000],200,"int","c");
 eq(DD.findDupes().filter(d=>d.k==="wall").length,1,"زوجٌ واحد (المعكوس يُكتشف)");
});
group("26 · تكرار: تسامح 1مم",()=>{
 newState();
 addWall([0,0],[3000,0],200,"int","c");
 addWall([0,0],[3000,1],200,"int","c");
 eq(DD.findDupes().length,1,"فرق 1مم = تكرار");
 newState();
 addWall([0,0],[3000,0],200,"int","c");
 addWall([0,0],[3000,50],200,"int","c");
 eq(DD.findDupes().length,0,"فرق 50مم ليس تكراراً");
});
group("26 · تكرار: الطابقُ شرطٌ (لا تحميل رأسيّ خاطئ)",()=>{
 newState();
 S.meta.level=0; addWall([0,0],[3000,0],200,"int","c");
 S.meta.level=1; addWall([0,0],[3000,0],200,"int","c");
 eq(DD.findDupes().length,0,"جداران على طابقين مختلفين ليسا تكراراً");
 newState();
 S.meta.level=0; addCol("rect",[0,0],300,300,0,"conc");
 S.meta.level=1; addCol("rect",[0,0],300,300,0,"conc");
 eq(DD.findDupes().length,0,"عمودان على طابقين ليسا تكراراً");
});
group("26 · تكرار: الحذف يأخذ الثاني وخطوةً واحدة",()=>{
 newState();
 const a=addWall([0,0],[3000,0],200,"int","c");
 const b=addWall([3000,0],[0,0],200,"int","c");
 const d=DD.findDupes();
 const r=DD.applyDedup(d,[0]);
 eq(r.res.walls,1,"حُذف جدارٌ واحد");
 ok(S.walls.length===1&&S.walls[0].id===a.id,"بقي الأوّل");
 undo();
 eq(S.walls.length,2,"تراجعٌ واحد يعيده");
});
group("26 · تكرار: ثلاثيّةٌ متطابقة لا تحذف مرّتين",()=>{
 newState();
 addWall([0,0],[3000,0],200,"int","c");
 addWall([0,0],[3000,0],200,"int","c");
 addWall([0,0],[3000,0],200,"int","c");
 const d=DD.findDupes();
 const r=DD.applyDedup(d,d.map((_,i)=>i));
 eq(S.walls.length,1,"بقي جدارٌ واحد");
});
process.exit(summary());
