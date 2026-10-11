/* ب — إصلاح D14: القوس ينجو من explode، والدوران/المرآة/الإهليج
   تُعامل بما يليق.  node js/tests/block-arc-fixed.test.js */
import {shim,group,ok,summary} from "./harness.js";
shim();
const {S,newState,ensureShape}=await import("../core/state.js");
const BLK=await import("../core/blocks.js");
const RN=await import("../core/render.js");

group("ب — هوية التطابق تُبقي قوس التعريف",()=>{
 newState(); BLK.installDefaults();
 const out=BLK.explode(BLK.makeInstance("door"));
 const a=out.find(p=>p.t==="arc");
 ok(!!a,"الناتج يحمل قوساً لا متعدداً");
 ok(Math.abs(a.a0)<1e-6&&Math.abs(a.a1-90)<1e-6,"0°→90° بالدرجات");
});
group("ب — الدوران يُدير والمرآة تعكس",()=>{
 newState(); BLK.installDefaults();
 const inst=BLK.makeInstance("door",{rot:Math.PI/2,mirror:true});
 const a=BLK.explode(inst).find(p=>p.t==="arc");
 ok(!!a&&Math.abs(a.a0-270)<1e-6&&Math.abs(a.a1-180)<1e-6,
  "مرآة+دوران 90°: 270°→180° (اجتياحٌ سالب مثل النموذج)");
});
group("ب — الإهليج يسقط للتقطيع لا للفساد",()=>{
 newState(); BLK.installDefaults();
 const out=BLK.explode(BLK.makeInstance("door",{scaleX:1,scaleY:2}));
 ok(!out.some(p=>p.t==="arc"),"لا قوس في مقياسٍ غير موحّد");
 ok(out.some(p=>p.t==="pline"),"بل متعددٌ مقطّع كما كان");
});
group("ب — المشهد يرى قوس الكتلة لا يُهمله",()=>{
 newState(); BLK.installDefaults();
 S.blocks.push(BLK.makeInstance("door"));
 RN.invalidate();
 ok(RN.scene().P.some(g=>g.t==="arc"&&g.bid),
  "قوسُ الكتلة في أوّليات المشهد");
});
process.exit(summary());
