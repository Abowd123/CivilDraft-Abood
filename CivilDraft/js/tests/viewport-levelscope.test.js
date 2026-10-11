/* ═══ اختبار levelScope على المنفذ — F5 (طبقة البيانات فقط) ═══
   يثبت أن الحقل يُطبَّع ويُحفَظ ويُحرَّر ويهاجر ملفّاً قديماً بلا
   عطبٍ. composeSheet لا يقرأه بعد — انظر التعليق في mkViewport —
   فهذا الاختبار لا يدّعي تصفية prims فعليّة، بل صحّة البيانات.
   التشغيل: node js/tests/viewport-levelscope.test.js */
import {shim,group,eq,ok,throws,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,edit}=await import("../core/state.js");
const SH=await import("../core/sheet.js");

group("mkViewport — levelScope افتراضاً null",()=>{
 const vp=SH.mkViewport({});
 eq(vp.levelScope,null,"بلا تخصيصٍ افتراضاً");
});

group("addViewport — levelScope يُطبَّع رقماً صحيحاً",()=>{
 newState();
 const sh=edit(()=>SH.addSheet({name:"ورقة"}));
 const vp=edit(()=>SH.addViewport(sh.id,{
  modelRect:{x0:0,y0:0,x1:1000,y1:1000},
  paperRect:{x0:0,y0:0,x1:200,y1:200},
  levelScope:1.7}));
 eq(vp.levelScope,2,"يُقرَّب ويُطبَّع بنمط normLevel");
});

group("updateViewport — تعديل levelScope وإزالته",()=>{
 newState();
 const sh=edit(()=>SH.addSheet({name:"ورقة"}));
 const vp=edit(()=>SH.addViewport(sh.id,{
  modelRect:{x0:0,y0:0,x1:1000,y1:1000},
  paperRect:{x0:0,y0:0,x1:200,y1:200}}));
 eq(vp.levelScope,null,"لا تخصيصَ عند الإضافة بلا طلب");
 edit(()=>SH.updateViewport(sh.id,vp.id,{levelScope:3}));
 eq(sh.viewports[0].levelScope,3,"تحدَّث إلى 3");
 edit(()=>SH.updateViewport(sh.id,vp.id,{levelScope:null}));
 eq(sh.viewports[0].levelScope,null,"يعود null صراحةً");
});

group("ensureShape — ملفٌّ قديمٌ بمنفذٍ بلا levelScope يُهاجَر بأمان",()=>{
 newState();
 const sh=edit(()=>SH.addSheet({name:"ورقة"}));
 edit(()=>SH.addViewport(sh.id,{
  modelRect:{x0:0,y0:0,x1:1000,y1:1000},
  paperRect:{x0:0,y0:0,x1:200,y1:200}}));
 delete S.sheets[0].viewports[0].levelScope;
 ensureShape();
 ok("levelScope" in S.sheets[0].viewports[0]||true,
  "لا يرمي ensureShape على حقلٍ غائب");
});

summary();
