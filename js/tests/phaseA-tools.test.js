/* ═══ المرحلة A — الأدوات: pline · cloud · cloude · detail ═══
   node js/tests/phaseA-tools.test.js */
import {shim,toolRig,group,ok,eq,summary} from "./harness.js";
shim();
const {S,newState,ensureShape}=await import("../core/state.js");
const RN=await import("../core/render.js");
const SH=await import("../core/sheet.js");
await import("../tools/draw.js");
await import("../tools/clouds.js");
await import("../tools/sheet.js");
const R=await import("../tools/registry.js");
const rig=toolRig(R,{invalidate:()=>RN.invalidate()});
const reset=()=>{newState(); ensureShape(); RN.invalidate();
 rig.pick([]); rig.clear(); if(R.active())R.cancel(true)};

group("أداة pline",()=>{
 reset(); rig.defs("pline"); R.begin("pline");
 rig.at(0,0); rig.at(3000,0); rig.at(3000,2000); R.enter();
 eq(S.plines.length,1,"Enter ينهي مفتوحاً بكيانٍ واحد");
 eq(S.plines[0].pts.length,3,"بثلاث نقاط");
 eq(S.plines[0].closed,0,"مفتوح");
 ok(rig.said(/PL\d+/,"ok"),"ويُبلَّغ بمعرّفه");
 reset(); rig.defs("pline"); R.begin("pline");
 rig.at(0,0); rig.at(3000,0); rig.at(3000,2000); rig.type("c");
 eq(S.plines.length,1,"C يغلق"); eq(S.plines[0].closed,1,"مغلق");
 reset(); rig.defs("pline"); R.begin("pline");
 rig.at(0,0); rig.at(3000,0); rig.type("c");
 eq(S.plines.length,0,"C بعد نقطتين لا يُنشئ");
 ok(rig.errs().length>0||rig.said(/ثلاث/,"wr")||R.active(),"رسالة الإغلاق");
 if(R.active())R.cancel(true);
 reset(); rig.defs("pline"); R.begin("pline");
 rig.at(0,0); rig.at(1000,0);
 ok(R.T.def.prev(R.T.ctx,[2000,500]).length>=2,"المعاينة ترسم القطع");
 rig.esc(); eq(S.plines.length,0,"Esc لا يُنشئ");
});

group("أداة cloud",()=>{
 reset(); rig.defs("cloud"); R.begin("cloud");
 rig.at(0,0); rig.at(3000,0); rig.at(3000,3000); rig.at(0,3000); R.enter();
 eq(S.clouds.length,1,"سحابة واحدة"); eq(S.clouds[0].label,"RC1","RC1");
 ok(rig.said(/RC1/,"ok"),"ويُبلَّغ");
 reset(); rig.defs("cloud"); R.begin("cloud");
 rig.at(0,0); rig.at(3000,0); rig.at(3000,3000);
 ok(R.T.def.prev(R.T.ctx,[0,3000]).length===1,"المعاينة");
 rig.esc(); eq(S.clouds.length,0,"Esc");
});

group("أداة cloude",()=>{
 reset(); rig.defs("cloude");
 R.begin("cloude");
 ok(rig.said(/حدّد/,"wr")||S.clouds.length===0,"بلا تحديد: تنبيه ولا كتابة");
 eq(S.clouds.length,0,"لا سحابة بلا تحديد");
 if(R.active())R.cancel(true);
});

group("أداة detail",()=>{
 reset();
 const a=SH.addSheet({name:"أ"}), b=SH.addSheet({name:"ب"});
 const rc={modelRect:{x0:0,y0:0,x1:10000,y1:10000},paperRect:{x0:10,y0:10,x1:200,y1:150}};
 const v1=SH.addViewport(a.id,rc), v2=SH.addViewport(b.id,rc);
 R.begin("detail");
 rig.type(v1.id); rig.type(v2.id); rig.at(4000,4000);
 eq(S.callouts.length,1,"وسمٌ واحد");
 const c=S.callouts[0];
 ok(c.srcSheet===a.id&&c.tgtSheet===b.id&&c.srcVp===v1.id&&c.tgtVp===v2.id,"المصدر والهدف");
 eq(c.label,"A","الوسم A");
 if(R.active())R.cancel(true);
 R.begin("detail"); rig.type("مجهول");
 eq(S.callouts.length,1,"معرّف منفذ مجهول لا يُنشئ");
 if(R.active())R.cancel(true);
});

process.exit(summary()?1:0);
