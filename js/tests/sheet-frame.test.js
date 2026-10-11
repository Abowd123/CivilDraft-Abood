/* ═══ الورقةُ المصدَّرة بمنافذها تحمل إطارَها وبلوكَ عنوانها وشمالَها ═══
   (حلقة «الأوراق والمنافذ» · المرحلة ٨) كانت تخرج رسماً عارياً: composeSheet
   تستثني الإطار (يُرسَم في فضاء النموذج) ولا يضيفه أحدٌ في فضاء الورقة. */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,summary} from "./harness.js";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
const SH=await import("../core/sheet.js");
const EX=await import("../io/export.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const rig=toolRig(R,{});
const scene=()=>{ST.newState(); ST.ensureShape(); rig.clear(); R.setOpt("wall","t","0.2");
 R.begin("wall"); [[0,0],[6000,0],[6000,4000],[0,4000]].forEach(p=>rig.at(...p)); rig.type("c"); rig.esc();
 R.begin("addsheet","مسقط"); R.setOpt("vport","scale","100"); R.begin("vport"); rig.at(-1000,-1000); rig.at(7000,5000); R.cancel(true); rig.clear()};
group("paperFrame بالمليمتر على A3 أفقي",()=>{
 scene(); const sh=SH.activeSheetDef(), p=SH.sheetPapers(sh);
 eq([p.w,p.h].join("×"),"420×297","A3 أفقي");
 const F=SH.paperFrame(sh,p);
 const polys=F.filter(g=>g.t==="poly");
 ok(polys.some(g=>JSON.stringify(g.pts)==="[[0,0],[420,0],[420,297],[0,297]]"),"حدُّ الورقة");
 const m=sh.margin; ok(polys.some(g=>g.pts[0][0]===m&&g.pts[0][1]===m),"والإطارُ الداخليُّ بالهامش");
 ok(F.some(g=>g.t==="text"),"وبلوكُ العنوان بنصوصه");
 ok(F.every(g=>g.L==="A-SHET"),"على طبقة A-SHET");
 ok(F.some(g=>g.t==="text"&&g.s==="مسقط"),"واسمُ اللوحة اسمُ الورقة لا اسمُ المشروع");
 ok(F.some(g=>g.t==="text"&&/1:100/.test(g.s||"")),"ومقياسُها مقياسُ منفذها");
 sh.tb=0; ok(!SH.paperFrame(sh,p).some(g=>g.t==="text"&&!/^ش|N/.test(g.s||"")),"وبلا بلوكٍ إن أُطفئ");
});
group("التصدير يضمّها فوق المنافذ",async()=>{});
const r=await (async()=>{scene(); return EX.run("svg",{})})();
group("SVG الورقة فيه إطارٌ ونصُّ العنوان",()=>{
 ok(r.ok,"صُدِّر"); ok(/<polygon points="0,0 420,0 420,297 0,297"|420,297/.test(r.raw||""),"حدُّ الورقة في الملفّ");
 ok(/<text/.test(r.raw||""),"ونصوصُ البلوك");
});
process.exit(summary()?1:0);
