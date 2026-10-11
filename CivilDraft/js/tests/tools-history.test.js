/* ═══ الأدوات لا تُنتج خطواتِ تاريخٍ شبحاً ═══
   عمليات core/modify.js معاملاتٌ بنفسها (atomic). والأداةُ تلتقط لقطتها
   عند begin وتدفع خطوةً واحدة عند finish. فلو لم تنضمّ عمليةُ الأداة إلى
   معاملة السجلّ لدفعت كلُّ نقرةٍ خطوتَها: N نقرةٍ ⇒ N+1 خطوة.
   العقد: جلسةُ أداةٍ كاملة = خطوةُ تراجعٍ واحدة، والتراجعُ يُعيد ما قبلها. */
import {shim,toolRig,group,ok,eq,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,undo,historyTimeline,clearHistory,edit}=
 await import("../core/state.js");
const W =await import("../core/walls.js");
const O =await import("../core/opens.js");
const RN=await import("../core/render.js");
const EN=await import("../core/ents.js");
await import("../tools/draw.js");
await import("../tools/modify.js");
const R=await import("../tools/registry.js");
const rig=toolRig(R,{hit:(x,y)=>EN.hitTest(x,y,150),
 invalidate:()=>RN.invalidate()});

const steps=()=>historyTimeline().current;
const fresh=()=>{
 newState(); ensureShape(); RN.invalidate();
 rig.pick([]); rig.clear();
 if(R.active())R.cancel(true);
 const w=W.addWall([0,0],[5000,0],200,"int","c");
 O.addOpen(w,2500,"door",900,2100,0);
 RN.invalidate(); clearHistory();
 return w;
};
const sel=w=>rig.pick([{k:"wall",id:w.id}]);

group("move: جلسةٌ = خطوةٌ واحدة والتراجعُ يعيد الأصل",()=>{
 const w=fresh(); rig.defs("move"); sel(w);
 R.begin("move"); rig.at(0,0); rig.at(0,1000);
 eq(steps(),1,"خطوةٌ واحدة");
 undo();
 eq(S.walls[0].a[1],0,"والتراجعُ يُعيد الموضع");
 eq(steps(),0,"ولا خطوةَ شبحاً");
});
group("copy: ثلاثُ نقراتٍ ثم Esc = خطوةٌ واحدة",()=>{
 const w=fresh(); rig.defs("copy"); sel(w);
 R.begin("copy"); rig.at(0,0); rig.at(0,1000); rig.at(0,2000); rig.at(0,3000);
 rig.esc();
 eq(S.walls.length,4,"ثلاث نسخٍ");
 eq(steps(),1,"خطوةٌ واحدة لا N+1");
 undo();
 eq(S.walls.length,1,"تراجعٌ واحد يُزيلها كلَّها");
 eq(S.opens.length,1,"وفتحاتُها");
});
group("offset: نقراتٌ متكرّرة = خطوةٌ واحدة",()=>{
 const w=fresh(); rig.defs("offset"); sel(w);
 R.begin("offset"); rig.at(1000,0); /* اختيار الجدار */
 rig.at(1000,1500); rig.at(1000,3000);
 rig.esc();
 ok(S.walls.length>=2,`نُسخ الجدار (${S.walls.length})`);
 eq(steps(),1,"خطوةٌ واحدة");
 undo();
 eq(S.walls.length,1,"والتراجعُ يُعيد جداراً واحداً");
});
group("break: خطوةٌ واحدة",()=>{
 const w=fresh(); rig.defs("break");
 R.begin("break"); rig.at(1000,0); rig.at(1000,0);
 rig.esc();
 eq(steps(),1,"خطوةٌ واحدة");
});
group("rotate بنسخة: خطوةٌ واحدة",()=>{
 const w=fresh(); rig.defs("rotate"); sel(w);
 R.setOpt("rotate","copy",1);
 R.begin("rotate"); rig.at(0,0); rig.at(1000,0); rig.at(0,1000);
 rig.esc();
 R.setOpt("rotate","copy",0);
 ok(steps()<=1,`لا أكثر من خطوةٍ (${steps()})`);
});


group("mirror بنسخة: خطوةٌ واحدة",()=>{
 const w=fresh(); rig.defs("mirror"); sel(w);
 R.setOpt("mirror","keep",1);
 R.begin("mirror"); rig.at(0,0); rig.at(0,1000);
 if(R.active())rig.esc();
 R.setOpt("mirror","keep",0);
 ok(steps()<=1,`لا أكثر من خطوةٍ (${steps()})`);
});
group("array: خطوةٌ واحدة والتراجعُ يُزيل كل الخلايا",()=>{
 const w=fresh(); rig.defs("array"); sel(w);
 R.begin("array"); rig.at(0,0); rig.at(6000,1000);
 if(R.active())rig.esc();
 ok(S.walls.length>1,`نُسخت خلايا (${S.walls.length})`);
 eq(steps(),1,"خطوةٌ واحدة");
 undo();
 eq(S.walls.length,1,"والتراجعُ يُعيد جداراً واحداً");
});
group("weld: تأكيدٌ واحد = خطوةٌ واحدة",()=>{
 newState(); ensureShape(); RN.invalidate(); rig.pick([]); rig.clear();
 if(R.active())R.cancel(true);
 const a=W.addWall([0,0],[3000,0],200,"int","c");
 const b=W.addWall([3010,0],[3010,3000],200,"int","c");
 RN.invalidate(); clearHistory(); rig.defs("weld");
 rig.pick([{k:"wall",id:a.id},{k:"wall",id:b.id}]);
 R.begin("weld"); R.enter();
 eq(steps(),1,"خطوةٌ واحدة");
 undo();
 eq(S.walls[0].b[0],3000,"والتراجعُ يُعيد الطرف");
});
group("del: أمرٌ لحظيّ يفوّض إلى edit = خطوةٌ واحدة (own:1)",()=>{
 const w=fresh(); sel(w);
 const oldDel=R.H.del;
 R.H.del=()=>edit(()=>EN.delEnts([{k:"wall",id:w.id}]),"حذف");
 try{R.begin("del")}finally{R.H.del=oldDel}
 eq(S.walls.length,0,"حُذف الجدار");
 eq(steps(),1,"خطوةٌ واحدة — لم تبتلعها joinTxn");
 undo();
 eq(S.walls.length,1,"ويُستعاد");
});
group("وضع الدفعة (trial): لا خطوةَ تاريخٍ من الأدوات",()=>{
 const w=fresh(); rig.defs("copy"); sel(w);
 R.setBatch(1);
 try{
  R.begin("copy"); rig.at(0,0); rig.at(0,1000); rig.at(0,2000); rig.esc();
 }finally{R.setBatch(0)}
 eq(S.walls.length,3,"النسخُ نُفّذ");
 eq(steps(),0,"ولم تُدفع خطوةٌ — commit وحده يدفع");
});
process.exit(summary()?1:0);
