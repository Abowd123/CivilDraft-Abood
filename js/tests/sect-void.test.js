/* ═══ الفتحةُ المقطوعةُ فراغٌ في المقطع ═══ (حلقة «الواجهات والمقاطع» · المرحلة ٧)
   كان الجدارُ مستطيلاً كاملاً تُرسَم الفتحةُ فوقه: خطّا الوجهين يعبران الباب،
   و«التسويد» يملأ الفتحة. الآن: قطعٌ صلبةٌ فوق الباب وتحت الشباك وفوقه. */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,summary} from "./harness.js";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
const SC=await import("../core/section.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const EN=await import("../core/ents.js");
const RN=await import("../core/render.js");
const rig=toolRig(R,{hit:(x,y,k)=>EN.hitTest(x,y,150,k),invalidate:()=>RN.invalidate()});
const scene=()=>{ST.newState(); ST.ensureShape(); rig.clear(); R.setOpt("wall","t","0.2"); R.setOpt("wall","type","ext");
 R.begin("wall"); [[0,0],[6000,0],[6000,4000],[0,4000]].forEach(p=>rig.at(...p)); rig.type("c"); rig.esc();
 rig.defs("door"); R.begin("door"); rig.at(3000,0); rig.esc(); rig.defs("win"); R.begin("win"); rig.at(3000,4000); rig.esc(); rig.clear();
 return SC.buildSect([3000,-1000],[3000,5000],{})};
const spans=(P,x)=>P.filter(p=>p.t==="poly"&&Math.abs(Math.min(...p.pts.map(q=>q[0]))-x)<2)
 .map(p=>[Math.min(...p.pts.map(q=>q[1])),Math.max(...p.pts.map(q=>q[1]))]).sort((a,b)=>a[0]-b[0]);
group("بابٌ مقطوع: جدارٌ فوقه وحده، ولا شيءَ في الفتحة",()=>{
 const e=scene(); ok(e.n.walls===2&&e.n.opens===2,"جداران وفتحتان");
 const P=SC.sectPrims(e,0,0);
 const door=e.shapes.find(s=>s.kindOf==="door"), wall=e.shapes.find(s=>s.role==="wall"&&s.wall===door.wall);
 const sp=spans(P,wall.x);
 eq(JSON.stringify(sp),JSON.stringify([[door.y+door.h,wall.h]]),"قطعةٌ صلبةٌ واحدة من رأس الباب إلى أعلى الجدار");
});
group("شباكٌ مقطوع: جلسةٌ تحته وجدارٌ فوقه وإطارُ زجاجه",()=>{
 const e=scene(); const P=SC.sectPrims(e,0,0);
 const win=e.shapes.find(s=>s.kindOf==="window"), wall=e.shapes.find(s=>s.role==="wall"&&s.wall===win.wall);
 const sp=spans(P,wall.x).map(a=>a.join("-"));
 ok(sp.includes(`0-${win.y}`),"الجلسة"); ok(sp.includes(`${win.y+win.h}-${wall.h}`),"وما فوقه");
 ok(sp.includes(`${win.y}-${win.y+win.h}`),"وإطارُ الزجاج");
});
group("التسويدُ لا يملأ الفتحة",()=>{
 const e=scene(); const P=SC.sectPrims(e,0,0,{poche:"solid"});
 const door=e.shapes.find(s=>s.kindOf==="door");
 const bad=P.filter(p=>p.t==="fill").some(f=>{const ys=f.ring.map(q=>q[1]); const xs=f.ring.map(q=>q[0]);
  return Math.min(...xs)<=door.x+1&&Math.max(...xs)>=door.x+door.w-1&&Math.min(...ys)<door.y+door.h-1&&Math.max(...ys)>door.y+1});
 ok(!bad,"لا تسويدَ داخل الباب");
});
process.exit(summary()?1:0);
