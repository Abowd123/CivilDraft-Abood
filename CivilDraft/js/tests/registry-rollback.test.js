/* ═══ رجوع الأداة كاملةً عند رمي start/done (كانا D08 وD09) ═══
   begin() وfinish() يُثبّتان الآن معاملةً واحدة حول d.start/d.done:
   رمي بعد تعديلٍ جزئيّ يُرجِع الحالة حرفاً إلى ما قبل الأداة — لا
   يُعامِل نصف التنفيذ نجاحاً. انظر rollbackTool في tools/registry.js
   وسجلّ الإصلاح في CHANGES.md (مرحلة 1.2).                         */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,snapshot,canUndo}=
 await import("../core/state.js");
const W=await import("../core/walls.js");
const R=await import("../tools/registry.js");
await import("../tools/draw.js");          /* يسجّل أداة «wall» فعلياً،
                                                لا تحتاجها هذه الحالات
                                                لكن استيرادها يطابق
                                                بيئة الأدوات الحقيقية */

const reset=()=>{newState(); ensureShape()};
const wall=(a,b)=>W.addWall(a,b,200,"int","c");

group("[كان D08] فشل start بعد تعديلٍ يُرجَع كلّه",()=>{
 reset();
 const before=snapshot();
 R.defTool({id:"boom_start",label:"انفجار",steps:[{p:"x"}],
  start:ctx=>{
   const a=wall([0,0],[3000,0]); ctx.made.push({id:a.id,coll:"walls"});
   const b=wall([0,1000],[3000,1000]); ctx.made.push({id:b.id,coll:"walls"});
   throw new Error("boom");
  }});
 R.begin("boom_start");
 eq(S.walls.length,0,"لا جدران نصف منفَّذة");
 ok(!canUndo(),"ولا خطوة تاريخٍ لعمليةٍ فاشلة");
 ok(snapshot()===before,"والحالة مطابقةٌ للقطة السابقة حرفاً");
});

group("[كان D09] فشل done بعد تعديلٍ يُرجَع كلّه",()=>{
 reset();
 const before=snapshot();
 R.defTool({id:"boom_done",label:"انفجار٢",steps:[{p:"x"}],
  done:ctx=>{
   const a=wall([0,0],[3000,0]); ctx.made.push({id:a.id,coll:"walls"});
   throw new Error("boom");
  }});
 R.begin("boom_done"); R.finish();
 eq(S.walls.length,0,"لا جدران نصف منفَّذة");
 ok(!canUndo(),"ولا خطوة تاريخٍ لعمليةٍ فاشلة");
 ok(snapshot()===before,"والحالة مطابقةٌ للقطة السابقة حرفاً");
});

group("start ناجحٌ بعد تعديلٍ ما زال يُثبَّت كسابق عهده",()=>{
 reset();
 R.defTool({id:"ok_start",label:"سليم",steps:[{p:"x"}],
  start:ctx=>{
   const a=wall([0,0],[3000,0]); ctx.made.push({id:a.id,coll:"walls"});
  }});
 R.begin("ok_start");
 R.finish();
 eq(S.walls.length,1,"الجدار بقي — لا رجوع بلا رمي");
 ok(canUndo(),"ودخل التاريخ خطوةً واحدة");
});

group("رجوعٌ صريحٌ بـfalse بلا رمي يُثبّت ما صُنع (لا فشل)",()=>{
 reset();
 R.defTool({id:"soft_false",label:"لحظيّ",steps:[{p:"x"}],
  start:ctx=>{
   const a=wall([0,0],[3000,0]); ctx.made.push({id:a.id,coll:"walls"});
   return false;               /* تحديدٌ ناقص — لا خطأ */
  }});
 R.begin("soft_false");
 eq(S.walls.length,1,"الجدار الذي صنعه قبل الرجوع اللحظيّ بقي");
 ok(canUndo(),"ودخل التاريخ — هذا ليس فشلاً بل أمرٌ لحظيّ");
});

process.exit(summary()?1:0);
