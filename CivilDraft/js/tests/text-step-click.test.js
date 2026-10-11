/* ═══ النقرةُ على خطوةِ نصٍّ حرّ ═══
   كشفه مسحُ الأدوات قبل المرحلة ٥: «وسم تفصيلة» و«تحديد بالمعرّف» تنتظران
   كتابة، والنقرةُ كانت تتحوّل نصّاً «x,y» فتخرج رسالةٌ مضلِّلة وتُدفَع
   النقطةُ في ctx.pts. الآن تُرفَض بلا أثر وتقول أين يُكتب. */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,summary} from "./harness.js";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const rig=toolRig(R,{});
const textTools=R.toolList().filter(d=>(d.steps||[]).length&&d.steps[0].text);
ok(textTools.length>=2,"أدواتٌ تبدأ بخطوة نصّ: "+textTools.map(d=>d.id).join(" "));
for(const d of textTools){
 group(`«${d.label}»: النقرةُ على خطوة النصّ`,()=>{
  ST.newState(); ST.ensureShape(); rig.clear();
  if(R.begin(d.id)===false||!R.active()){ok(true,"لا تبدأ في مشروعٍ فارغ"); return}
  const i0=R.T.i, n0=R.T.ctx.pts.length;
  eq(R.feedPoint([600,700]),false,"تُرفَض");
  ok(!rig.said(/600,700/),"ولا تُقرأ نصّاً «600,700»");
  ok(rig.said(/سطر الإدخال/,"wr"),"وتقول أين يُكتب");
  eq(R.T.i,i0,"والخطوةُ نفسها"); eq(R.T.ctx.pts.length,n0,"ولا نقطةَ مدفوعة");
  R.cancel(true);
 });
}
process.exit(summary()?1:0);
