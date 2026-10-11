/* MT3 — إنشاء كتلة من التحديد: جمعُ الشكل، التجميد، والتحقق من
   البوّابة.  node js/tests/mkblock.test.js */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const {S,newState}=await import("../core/state.js");
const {addWall}=await import("../core/walls.js");
const {collectFromSel}=await import("../tools/blockcollect.js");
const OPS=await import("../tools/blockops.js");

group("جمع تحديد الجدار وكتلة منه",()=>{
 newState();
 addWall([0,0],[4000,0],200,"int","c");
 const w=S.walls[0];
 const c=collectFromSel([{k:"wall",id:w.id}]);
 ok(c.prims.length===1,"جُمع الجدار كبدائية واحدة");
 ok(c.prims[0].t==="pline"&&c.prims[0].closed===true,"مضلّعاً مغلقاً");
 const cx=(c.bb.x0+c.bb.x1)/2, cy=(c.bb.y0+c.bb.y1)/2;
 const d=OPS.createBlock("fromsel","من تحديد",c.prims,
  [Math.round(cx),Math.round(cy)]);
 ok(d&&d.name==="fromsel","أُنشئت كتلة من البوّابة");
 eq(d.base[0],0,"الإحداثيات محليّة حول مركز الأساس");
});

process.exit(summary());
