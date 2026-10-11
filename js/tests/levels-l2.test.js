/* ═══ المرحلة 3 — L2: المستوى في BOQ والواجهة ═══
   يثبت أن الفتحات تُسنَد للمستوى النشط، وأن BOQ يُقسَّم، وأن
   الواجهة تُعلن عمّا أُسقط من مستوياتٍ أخرى.
   التشغيل: node js/tests/levels-l2.test.js */
import {shim,group,eq,ok,summary} from "./harness.js";
shim();
const {S,newState,ensureShape}=await import("../core/state.js");
const {addWall}=await import("../core/walls.js");
const {addOpen}=await import("../core/opens.js");
const {addArea}=await import("../core/areas.js");
const {boqLevel,levelGroups}=await import("../core/boq.js");
const {elevation}=await import("../core/elevation.js");

function twoLevels(){
 newState(); S.meta.scale=100; S.meta.wallH=3000;
 S.meta.level=0;
 const w=addWall([0,0],[5000,0],250,"ext","c");
 addOpen(w,1000,"door",900,2100,0);
 addArea([[0,0],[5000,0],[5000,4000],[0,4000]],"أرضي");
 S.meta.level=1;
 addWall([0,2000],[5000,2000],200,"ext","c");
 addArea([[0,6000],[4000,6000],[4000,9000],[0,9000]],"علوي");
 S.meta.level=0;
}

group("addOpen يأخذ المستوى النشط",()=>{
 newState(); S.meta.level=3;
 const w=addWall([0,0],[5000,0],250,"ext","c");
 const o=addOpen(w,1000,"door",900,2100,0);
 eq(o.level,3,"فتحةُ الطابق الثالث");
});

group("BOQ يُقسَّم بالمستوى",()=>{
 twoLevels();
 const g=levelGroups();
 eq(g.active,0,"المستوى النشط أرضي");
 const g0=g.groups.find(x=>x.level===0);
 const g1=g.groups.find(x=>x.level===1);
 eq(g0.walls.n,1,"جدارُ الأرضي وحده في مجموعته");
 eq(g1.walls.n,1,"وجدارُ العلوي وحده");
 eq(g0.opens.total,1,"فتحةُ الأرضي في أرضي");
 eq(g1.opens.total,0,"لا فتحات للعلوي");
 eq(g0.areas.n,1,"منطقةُ الأرضي في أرضي");
 eq(g.shared?g.shared.areas:0,0,"لا مشاركة مصطنعة للجداول الكاملة");
});

group("الواجهة تُعلن عمّا أُسقط من المستويات",()=>{
 twoLevels();
 S.meta.level=1;
 const e=elevation("S",{level:0});
 ok(e.level===0,"الواجهة على المستوى 0 صراحةً");
 ok(e.skip&&e.skip["طابق 1"]>=1,"وأُعلن أن طابق 1 أُسقط منها");
 ok(e.runs.every(r=>
  S.walls.find(w=>w.id===r.id).level===0),
  "وكل جدرانها في المستوى المختار");
});

process.exit(summary());
