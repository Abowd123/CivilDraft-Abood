/* ═══ خطّةُ التسوية تتبع الخيارات ═══
   كشفته حلقة الفيديو «مصفوفة على مسار · تسوية»: المعاينةُ ورسالتُها
   تُحسبان عند البدء وحده، فتغييرُ «المرجع» من الشريط بعدها يُبقي العرضَ
   على «الوسط» وEnter ينفّذ «الأدنى» بلا عرض. */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,summary} from "./harness.js";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const EN=await import("../core/ents.js");
const RN=await import("../core/render.js");
const rig=toolRig(R,{hit:(x,y,k)=>EN.hitTest(x,y,150,k),invalidate:()=>RN.invalidate()});
const cols=()=>{ST.newState(); ST.ensureShape(); rig.clear();
 [[0,0],[2000,800],[4000,1600]].forEach(p=>{R.begin("col"); rig.at(...p); rig.esc()});
 rig.clear(); rig.pick(ST.S.cols.map(c=>({k:"col",id:c.id})));
 R.setOpt("align","ax","y"); R.setOpt("align","md","mid")};
const Y=()=>ST.S.cols.map(c=>Math.round(c.y)).join(",");

group("تغييرُ المرجع بعد البدء يُعيد المعاينةَ والرسالة",()=>{
 cols(); R.begin("align"); ok(/الوسط/.test(rig.last()),"البدء: «الوسط»");
 R.setOpt("align","md","min"); R.prevOf?R.prevOf():R.active()&&R.T&&R.T.def.prev(R.T.ctx);
 ok(/الأدنى/.test(rig.last()),"بعد التغيير: الرسالةُ «الأدنى»");
 rig.enter(); eq(Y(),"0,0,0","والتنفيذُ هو المعروض");
 R.cancel&&R.cancel(true);
});

group("بلا إعادة رسم: Enter لا ينفّذ ما لم يُعرَض",()=>{
 cols(); R.begin("align"); const b4=Y();
 R.setOpt("align","md","max"); rig.enter();
 eq(Y(),b4,"لا حركة عند أوّل Enter بعد تغيير الخيار");
 ok(rig.said(/الأقصى/),"وعُرضت الخطّةُ الجديدة");
 rig.enter(); eq(Y(),"1600,1600,1600","وEnter الثاني ينفّذها");
 R.cancel&&R.cancel(true);
});
/* ═══ وشقيقُها: اللحمُ يتبع التفاوت ═══ */
const gap=()=>{ST.newState(); ST.ensureShape(); rig.clear(); R.setOpt("wall","t","0.2");
 R.begin("wall"); rig.at(0,0); rig.at(3000,0); rig.esc();
 R.begin("wall"); rig.at(3040,0); rig.at(3040,3000); rig.esc();
 rig.clear(); rig.pick(ST.S.walls.map(w=>({k:"wall",id:w.id})))};
group("لحم: تفاوتٌ ضيّقٌ ثم أوسع بعد البدء",()=>{
 gap(); R.setOpt("weld","tol","0.06"); R.begin("weld"); ok(R.active(),"يبدأ بخطّة (4 سم < 6 سم)");
 const b4=JSON.stringify(ST.S.walls);
 R.setOpt("weld","tol","0.01"); rig.enter();
 eq(JSON.stringify(ST.S.walls),b4,"تضييقُ التفاوت بعد العرض: لا حركة عند Enter");
 ok(rig.said(/لا طرف يحتاج لحماً عند تفاوت 0.01/),"ويُقال بالتفاوت الجديد");
 R.setOpt("weld","tol","0.06"); rig.enter(); rig.enter();
 ok(rig.said(/لُحم/),"وإعادتُه تعرض ثم تنفّذ");
 R.cancel(true);
});
group("لحم: بلا حركةٍ عند البدء تبقى ليُوسَّع التفاوت",()=>{
 gap(); R.setOpt("weld","tol","0.01"); R.begin("weld");
 ok(R.active(),"تبقى فعّالة (كانت تُغلق فلا يظهر حقلُ التفاوت)");
 R.setOpt("weld","tol","0.06"); rig.enter(); rig.enter();
 ok(rig.said(/لُحم/),"وتوسيعُه من الشريط ثم Enter يلحم");
 R.cancel(true);
});
process.exit(summary()?1:0);
