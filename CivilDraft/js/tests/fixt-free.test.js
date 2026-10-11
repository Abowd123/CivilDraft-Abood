/* ═══ ما يُعلَّق بالسقف أو يقف حرّاً لا يُلصَق بالجدار افتراضاً ═══ (مسحُ ما قبل المرحلة ٦) */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,summary} from "./harness.js";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const rig=toolRig(R,{});
const room=()=>{ST.newState(); ST.ensureShape(); rig.clear(); R.setOpt("wall","t","0.2");
 R.begin("wall"); [[0,0],[5000,0],[5000,4000],[0,4000]].forEach(p=>rig.at(...p)); rig.type("c"); rig.esc(); rig.clear()};
const at=(id,p)=>{room(); rig.defs(id); R.begin(id); rig.at(...p); R.cancel(true); const f=ST.S.fixt.at(-1); return f&&[Math.round(f.x),Math.round(f.y)].join(",")};
group("السقفيُّ والحرُّ يبقى حيث نُقر (متر من الجدار)",()=>{
 for(const id of ["elamp","espot","efan","ftable","ftablec","fchair"])eq(at(id,[2500,3000]),"2500,3000",id);
});
group("والجداريُّ يُلصَق كما كان",()=>{
 for(const id of ["wc","lav","esoc","esw1","eac","fbed2","fwardr","fkcab"])eq(at(id,[2500,3000]),"2500,3900",id);
});
group("والخيارُ باقٍ: تفعيلُه يُلصِق الإنارة",()=>{
 room(); rig.defs("elamp"); R.setOpt("elamp","snap",1); R.begin("elamp"); rig.at(2500,3000); R.cancel(true);
 const f=ST.S.fixt.at(-1); eq(f&&Math.round(f.y),3900,"مُلصَقة");
});
process.exit(summary()?1:0);
