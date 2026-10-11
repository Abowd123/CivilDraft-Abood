/* ═══ تجميد طبقة لكل منفذ — اختبار تكامل composeSheet ═══
   يثبت أن التجميد إنكارٌ محلّي في المنفذ وحده: مشهدُ العمل يحتفظ
   بالطبقة، والتركيب يُسقطها بصمتٍ (بلا عدّاد قَصّ)، وفكُّ التجميد
   يعيدها. التشغيل: node js/tests/vpfrozen.test.js */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();

const {S,DEF,loadState,clearHistory,edit,ensureShape}=
 await import("../core/state.js");
const RN=await import("../core/render.js");
const SH=await import("../core/sheet.js");
const W=await import("../core/walls.js");
const D=await import("../core/dims.js");

const reset=()=>{
 loadState(DEF(),true); clearHistory(); ensureShape();
};

group("vpfrozen — التجميد يُسقِط من المنفذ وحدَه بصمت",()=>{
 reset();
 edit(()=>W.addWall([0,0],[5000,0],200,"int","c"),"جدار"); /* A-WALL */
 edit(()=>D.addDim("h",[0,0],[3000,0],1200),"بُعد");        /* A-DIMS */
 const world=RN.scene().P;
 ok(world.some(g=>g.L==="A-WALL"),"المشهد يحمل الجدار");
 ok(world.some(g=>g.L==="A-DIMS"),"المشهد يحمل البعد");

 const sh=edit(()=>SH.addSheet({name:"ورقة",size:"A3",orient:"l"}),"ورقة");
 const vp=edit(()=>SH.addViewport(sh.id,{
  modelRect:{x0:0,y0:0,x1:5000,y1:3000},
  paperRect:{x0:0,y0:0,x1:420,y1:252}}),"منفذ");
 edit(()=>SH.updateViewport(sh.id,vp.id,{frozen:["A-DIMS"]}),"تجميد");

 const c=SH.composeSheet(sh,RN.scene().P,{});
 ok(c.prims.some(g=>g.L==="A-WALL"),"الجدار باقٍ في المنفذ");
 ok(!c.prims.some(g=>g.L==="A-DIMS"),"البعد المتجمَّد سقط من المنفذ");
 eq(c.dropped,0,"وعدّاد القصّ لم يَمْتَصّ التجميد (إسقاط صامت)");
 /* محلّيٌّ لا عالمي: مشهدُ العمل لم يتأثّر */
 ok(RN.scene().P.some(g=>g.L==="A-DIMS"),"البعدُ ما زال في المشهد العالمي");
});

group("vpfrozen — السماحُ والتجميد معاً، والفكّ يعيد الطبقة",()=>{
 reset();
 edit(()=>W.addWall([0,0],[5000,0],200,"int","c"),"جدار");
 edit(()=>D.addDim("h",[0,0],[3000,0],1200),"بُعد");

 const sh=edit(()=>SH.addSheet({name:"ورقة",size:"A3",orient:"l"}),"ورقة");
 const vp=edit(()=>SH.addViewport(sh.id,{
  modelRect:{x0:0,y0:0,x1:5000,y1:3000},
  paperRect:{x0:0,y0:0,x1:420,y1:252}}),"منفذ");
 edit(()=>SH.updateViewport(sh.id,vp.id,
  {layers:["A-WALL","A-DIMS"], frozen:["A-DIMS"]}),"سماح وتجميد");

 const c1=SH.composeSheet(sh,RN.scene().P,{});
 ok(c1.prims.some(g=>g.L==="A-WALL"),"السماح يمرّر الجدار");
 ok(!c1.prims.some(g=>g.L==="A-DIMS"),"التجميد فوق السماح يُسقط البعد");

 /* فكّ التجميد يعيد البعد إلى المنفذ */
 edit(()=>SH.updateViewport(sh.id,vp.id,{frozen:[]}),"فكّ التجميد");
 const c2=SH.composeSheet(sh,RN.scene().P,{});
 ok(c2.prims.some(g=>g.L==="A-DIMS"),"الفكّ يعيد البعد إلى المنفذ");
});

group("vpfrozen — تطبيع الحقل في ensureShape",()=>{
 reset();
 S.sheets=[{
  id:"sh1",name:"ورقة",size:"A3",orient:"l",margin:12,tb:0,north:0,
  viewports:[{
   id:"vp1",name:"منفذ",
   modelRect:{x0:0,y0:0,x1:4000,y1:3000},
   paperRect:{x0:0,y0:0,x1:100,y1:75},
   frozen:["A-WALL",0,"A-DOOR","x".repeat(120)]
  }]
 }];
 S.activeSheet="sh1";
 ensureShape();
 const fz=S.sheets[0].viewports[0].frozen;
 ok(Array.isArray(fz),"التجميد مصفوفة");
 eq(fz.filter(x=>typeof x!=="string").length,0,"غير النصيّ يُطرَح");
 ok(fz.every(s=>s.length<=80),"والاسم يُقصّ عند 80");
 eq(fz.includes("A-WALL")&&fz.includes("A-DOOR"),true,"الصالح يبقى");
});

process.exit(summary()?1:0);
