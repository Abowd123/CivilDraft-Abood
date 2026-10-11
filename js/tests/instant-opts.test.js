/* ═══ خياراتُ الأوامر اللحظية من سطر الإدخال ═══ (مسحُ ما قبل المرحلة ٧)
   الأمرُ اللحظيّ لا يبقى فعّالاً فلا يظهر شريطُ خياراته: «أبعاد المحاور»
   و«سحابة حول التحديد» و«أعمدة المحاور» … كانت خياراتُها بلا طريق.
   الآن «GD top=0 gap=1.5» تضبط ثم تنفّذ، وما ليس خياراً يبقى وسيطاً. */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,summary} from "./harness.js";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
const DM=await import("../core/dims.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const rig=toolRig(R,{});
const axes=()=>{ST.newState(); ST.ensureShape(); rig.clear();
 [0,4000,8000].forEach(x=>DM.addAxis("x",x)); [0,4500].forEach(y=>DM.addAxis("y",y))};
group("كلُّ أمرٍ لحظيٍّ بخيارات يقبلها في الذيل",()=>{
 const L=R.toolList().filter(d=>!(d.steps||[]).length&&(d.opts||[]).length);
 ok(L.length>=5,"أوامرُ لحظيةٌ بخيارات: "+L.map(d=>d.id).join(" "));
 L.forEach(d=>ok(R.tailOk(d,d.opts[0].k+"=1"),`${d.id}: «${d.opts[0].k}=1» مقبول`));
 ok(!R.tailOk(R.findTool("griddim"),"كلام"),"وما ليس خياراً لا يُقبَل لأمرٍ بلا وسيط");
});
group("GD top=0 bot=0: سلسلتان بدل أربع",()=>{
 axes(); rig.defs("griddim"); R.begin("griddim"); const n4=ST.S.chains.length;
 axes(); rig.defs("griddim"); R.begin("griddim","top=0 bot=0");
 eq(n4,4,"الافتراض: أربع جهات"); eq(ST.S.chains.length,2,"و top=0 bot=0 ⇒ اثنتان");
 eq(String(R.ov("griddim","top")),"0","والخيارُ محفوظٌ كأنه من الشريط");
 rig.defs("griddim");
});
group("الوسيطُ غيرُ الخياريّ يبقى وسيطاً",()=>{
 ST.newState(); ST.ensureShape(); rig.clear(); rig.defs("elev");
 const d=R.findTool("elev"); ok(R.tailOk(d,"S fmt=none"),"ELEV S fmt=none مقبول");
 R.begin("elev","S fmt=none"); eq(String(R.ov("elev","fmt")),"none","fmt ضُبط");
 rig.defs("elev");
});
group("«واجهة» من الشريط: تُنفَّذ ثم تبقى ليظهر شريطُها، وEnter يعيدها",()=>{
 ST.newState(); ST.ensureShape(); rig.clear(); rig.defs("elev"); R.setOpt("wall","t","0.2"); R.setOpt("wall","type","ext");
 R.begin("wall"); [[0,0],[6000,0],[6000,4000],[0,4000]].forEach(p=>rig.at(...p)); rig.type("c"); rig.esc(); rig.clear();
 const h0=JSON.stringify(ST.S);
 R.begin("elev");
 ok(rig.said(/الواجهة الجنوبية/),"نُفّذت فوراً كما كانت");
 ok(R.active(),"وبقيت فعّالة — فيظهر شريطُ «الاتجاه» و«التصدير»");
 R.setOpt("elev","view","N"); R.setOpt("elev","fmt","svg"); R.setOpt("elev","save",0); rig.clear();
 rig.enter();
 ok(rig.said(/الواجهة الشمالية/),"Enter يعيدها بالاتجاه الجديد");
 ok(rig.said(/جاهز/),"وبالتصدير الجديد");
 ok(R.active(),"وتبقى لإعادةٍ أخرى");
 R.cancel(true); ok(!R.active(),"وEsc يخرج");
 eq(JSON.stringify(ST.S),h0,"ولا شيءَ في المشروع تغيّر");
 rig.defs("elev");
});
group("والأمرُ المُنشئ (أبعاد المحاور) لا يبقى — لا تكرارَ بـEnter",()=>{
 axes(); rig.defs("griddim"); R.begin("griddim"); ok(!R.active(),"لا يبقى");
});
process.exit(summary()?1:0);
