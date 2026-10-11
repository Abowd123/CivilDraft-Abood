import {shim,group,eq,ok,summary} from "./harness.js";
shim();
const {S,newState}=await import("../core/state.js");
const R=await import("../tools/registry.js");
await import("../tools/draw.js");    /* يسجّل wall/arcwall/rect */

group("تراجع المستطيل دفعةً واحدة — W4",()=>{
 R.loadOpts();
 newState();
 R.begin("rect");
 R.feedPoint([0,0]);
 R.feedPoint([4000,3000]);
 eq(S.walls.length,4,"أُنشئت الجدران الأربعة دفعةً واحدة");
 ok(R.active(),"الأداة لا تزال فعّالة (التكرار)");
 R.undoStep();
 eq(S.walls.length,0,"ضغطة U واحدة أزالت الأربعة");
});

process.exit(summary());
