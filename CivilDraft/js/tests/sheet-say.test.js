/* ═══ التنقّلُ بين الأوراق يقول أين صرت ═══ (مسحُ ما قبل المرحلة ٨) */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,summary} from "./harness.js";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const rig=toolRig(R,{});
group("التالية والسابقة",()=>{
 ST.newState(); ST.ensureShape(); rig.clear();
 R.begin("addsheet","مسقط"); R.begin("addsheet","واجهات"); rig.clear();
 R.begin("nextsheet"); ok(rig.said(/«مسقط» · 1 من 2/,"ok"),"التالية تدور إلى «مسقط» وتقوله");
 rig.clear(); R.begin("prevsheet"); ok(rig.said(/«واجهات» · 2 من 2/,"ok"),"والسابقة كذلك");
});
process.exit(summary()?1:0);
