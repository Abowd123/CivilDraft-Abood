/* ═══ اللحمُ مع جدارٍ قوسيّ ═══
   كشفته حلقة الفيديو «مقياس · استدارة · قطع · لحم»: الاستدارةُ تُنتج
   قوساً وكانت رسالتُها تنصح بـ«لحم»، واللحمُ يرفض التحديدَ كلّه إن
   كان فيه قوس. الآن القوسُ مرساة: طرفُه هدفٌ تلتحم إليه الجدرانُ
   المستقيمة، ولا يتحرّك هو (تحريكُه يغيّر نصفَ قطره). */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,summary} from "./harness.js";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
const MOD=await import("../core/modify.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const EN=await import("../core/ents.js");
const RN=await import("../core/render.js");
const rig=toolRig(R,{hit:(x,y,k)=>EN.hitTest(x,y,150,k),invalidate:()=>RN.invalidate()});
const W=()=>ST.S.walls;
const wall=(a,b)=>{R.begin("wall"); rig.at(...a); rig.at(...b); rig.esc()};

group("استدارة ثم لحم: لا رفض، والقوسُ لا يتحرّك",()=>{
 ST.newState(); ST.ensureShape(); rig.clear(); R.setOpt("wall","t","0.2");
 wall([0,0],[4000,0]); wall([4000,0],[4000,3000]); rig.clear();
 R.setOpt("fillet","r","1"); R.begin("fillet"); rig.at(2000,0); rig.at(4000,1500); rig.enter(); rig.esc();
 const arc=W().find(w=>w.bulge); ok(arc,"الاستدارةُ أنتجت قوساً"+(arc?"":" · "+rig.errs().join("/")+" · "+W().length));
 ok(!/استعمل «لحم»/.test(rig.last()),"ولم تعد تنصح بلحمٍ لا يلزم");
 const b4=JSON.stringify(arc); rig.clear();
 rig.pick(W().map(w=>({k:"wall",id:w.id}))); R.begin("weld"); rig.esc();
 ok(!rig.errs().length,"اللحمُ لا يرفض التحديد"+(rig.errs().length?": "+rig.errs()[0]:""));
 eq(JSON.stringify(W().find(w=>w.id===arc.id)),b4,"والقوسُ بحرفه");
});

group("طرفٌ مستقيمٌ قريبٌ من طرف قوس يلتحم إليه هو",()=>{
 ST.newState(); ST.ensureShape(); rig.clear();
 R.begin("arcwall"); rig.at(0,0); rig.at(4000,0); rig.at(2000,1500); rig.esc();
 const arc=W()[0]; ok(arc&&arc.bulge,"قوس");
 wall([4020,15],[4020,3000]);
 const st=W().find(w=>!w.bulge);
 const pl=MOD.weldPlan(W().map(w=>w.id),30);
 eq(pl.moves.length,1,"حركةٌ واحدة");
 eq(pl.moves[0]&&pl.moves[0].id,st.id,"للجدار المستقيم وحده");
 eq(JSON.stringify(pl.moves[0]&&pl.moves[0].to),JSON.stringify(arc.b.map(Math.round)),"إلى طرف القوس نفسه لا إلى المنتصف");
});

group("قوسان متقاربان: لا شيءَ يتحرّك ولا خطأ",()=>{
 ST.newState(); ST.ensureShape(); rig.clear();
 R.begin("arcwall"); rig.at(0,0); rig.at(4000,0); rig.at(2000,1500); rig.esc();
 R.begin("arcwall"); rig.at(4020,10); rig.at(8000,0); rig.at(6000,-1500); rig.esc();
 let msg=""; let pl; try{pl=MOD.weldPlan(W().map(w=>w.id),30)}catch(e){msg=e.message}
 eq(msg,"","بلا استثناء"); eq(pl&&pl.moves.length,0,"ولا حركة");
});
process.exit(summary()?1:0);
