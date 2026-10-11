/* ═══ «سلسلة» تقرأ قيَمها حيّة ═══ (حلقة «الأبعاد» · المرحلة ٥)
   كانت تُقرأ عند البدء وحده: الحقلُ الفارغ يرفض الأداة فلا يظهر حقلُها
   (طريقٌ مسدود لأول استعمال)، وتغييرُ القيَم بعد البدء يُهمَل بصمت. */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,summary} from "./harness.js";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
const D=await import("../core/dims.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const rig=toolRig(R,{});
group("البدءُ بحقلٍ فارغ ثم الكتابةُ في الشريط",()=>{
 ST.newState(); ST.ensureShape(); rig.clear(); R.setOpt("chain","vals","");
 R.begin("chain"); ok(R.active(),"تبدأ");
 R.setOpt("chain","vals","5 3.5");
 rig.at(0,0); rig.at(0,-1200); R.cancel(true);
 eq(ST.S.chains.length,1,"سلسلةٌ واحدة");
 eq(JSON.stringify(D.chainVals(ST.S.chains[0])),"[5000,3500]","بالقيَم المكتوبة بعد البدء");
});
group("تغييرُ القيَم بين النقرتين يُؤخذ",()=>{
 ST.newState(); ST.ensureShape(); rig.clear(); R.setOpt("chain","vals","3 3");
 R.begin("chain"); rig.at(0,0); R.setOpt("chain","vals","4 2 1"); rig.at(0,-1200); R.cancel(true);
 eq(JSON.stringify(D.chainVals(ST.S.chains[0])),"[4000,2000,1000]","آخرُ ما في الحقل");
});
process.exit(summary()?1:0);
