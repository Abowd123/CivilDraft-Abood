/* ═══ المرحلة B — أدوات المجموعات (5) ═══
   node js/tests/phaseB-gtools.test.js */
import {shim,toolRig,group,ok,eq,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,undo,clearHistory,canUndo}=await import("../core/state.js");
const W=await import("../core/walls.js");
const CL=await import("../core/cols.js");
const RN=await import("../core/render.js");
await import("../tools/groups.js");
const R=await import("../tools/registry.js");
const rig=toolRig(R,{invalidate:()=>RN.invalidate()});
const reset=()=>{newState(); ensureShape(); clearHistory(); RN.invalidate();
 rig.pick([]); rig.clear(); if(R.active())R.cancel(true)};
const mk=()=>{
 const w1=W.addWall([0,0],[4000,0],200,"int","c");
 const w2=W.addWall([0,0],[0,3000],200,"int","c");
 const c1=CL.addCol("rect",[1000,1000],400,400,0,"conc","C");
 return {w1,w2,c1,all:[{k:"wall",id:w1.id},{k:"wall",id:w2.id},{k:"col",id:c1.id}]};
};

group("group",()=>{
 reset(); const t=mk();
 rig.pick([t.all[0]]); R.begin("group","زمرة");
 eq(S.groups.length,0,"عنصر واحد لا يُجمَّع"); ok(rig.said(/عنصرين/,"wr"),"تنبيه"); ok(!R.active(),"الأداة انتهت");
 rig.pick(t.all); R.begin("group");
 eq(S.groups.length,0,"بلا اسم لا تجميع"); ok(rig.said(/اسماً/,"wr"),"إرشاد الاسم");
 R.begin("group","زمرة");
 eq(S.groups.length,1,"تجميع بالوسيط"); eq(S.groups[0].members.length,3,"بثلاثة أعضاء");
 ok(rig.said(/GR\d+/,"ok"),"ويُبلَّغ بالمعرّف"); ok(!R.active(),"لحظي");
});

group("التراجع بخطوة واحدة",()=>{
 reset(); const t=mk(); rig.pick(t.all);
 R.begin("group","زمرة"); eq(S.groups.length,1,"مجموعة");
 ok(canUndo(),"دخلت التاريخ"); undo(); eq(S.groups.length,0,"Ctrl+Z يزيلها");
 R.begin("group","زمرة"); rig.pick([]); rig.clear();
 R.begin("ungroup","زمرة"); eq(S.groups.length,0,"فكّ بالاسم");
 undo(); eq(S.groups.length,1,"والتراجع يعيدها");
});

group("ungroup",()=>{
 reset(); const t=mk(); rig.pick(t.all); R.begin("group","زمرة");
 rig.pick([t.all[2]]); R.begin("ungroup");
 eq(S.groups.length,0,"فكّ بالتحديد"); ok(rig.said(/فُكّت 1/,"ok"),"يُبلَّغ");
 rig.clear(); R.begin("ungroup","لا_وجود");
 ok(rig.said(/لا مجموعة/,"wr"),"اسم مجهول");
 rig.pick([]); rig.clear(); R.begin("ungroup"); ok(rig.said(/لا مجموعة بين/,"wr"),"لا تحديد");
});

group("gselect",()=>{
 reset(); const t=mk(); rig.pick(t.all); R.begin("group","زمرة");
 const id=S.groups[0].id; rig.pick([]);
 R.begin("gselect"); ok(rig.said(/معرّف/,"wr"),"بلا وسيط");
 R.begin("gselect","لا_وجود"); ok(rig.said(/لا مجموعة/,"wr"),"مجهول");
 R.begin("gselect",id);
 ok(rig.said(/زمرة/,"ok"),"بالمعرّف يُبلَّغ");
});

group("gmove",()=>{
 reset(); const t=mk(); rig.pick(t.all); R.begin("group","زمرة");
 rig.clear(); R.begin("gmove"); ok(rig.said(/gm/,"wr")&&!R.active(),"بلا وسيط");
 R.begin("gmove","لا_وجود"); ok(!R.active(),"مجهول");
 R.begin("gmove","زمرة"); ok(R.active(),"الأداة فعّالة بالاسم");
 rig.at(0,0); rig.at(500,250);
 eq(t.w1.a[0],500,"الجدار الأول تحرّك"); eq(t.w2.a[1],250,"والثاني");
 eq(t.c1.p?t.c1.p[0]:t.c1.x,1500,"والعمود"); ok(!R.active(),"انتهت بعد الوجهة");
 ok(R.T.def===null,"لا حالة معلّقة");
 undo(); eq(S.walls[0].a[0],0,"تُتراجَع بخطوة واحدة");
 eq(S.groups.length,1,"والمجموعة باقية (خطوة التحريك وحدها)");
 ok(R.findTool("gmove").destruct===1&&R.isDestruct(R.findTool("gmove")),"مُعلَنة هادمة");
 ok(!R.isDestruct(R.findTool("group")),"والتجميع ليس هادماً");
});

process.exit(summary()?1:0);
