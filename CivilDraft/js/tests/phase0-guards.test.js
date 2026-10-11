/* ═══ حرّاسٌ خضراء — سلوكياتٌ فُحصت فتبيّن سلامتها ═══
   ما أُدرج في قائمة العيوب المحتمَلة لكنّ المسبار أثبت أنه سليم.
   تبقى اختباراتٍ خضراء كي لا ينحدر لاحقاً — خصوصاً وأن مرحلة ١
   ستُعيد بناء المعاملات تحت أقدامها.                                   */
import {shim,shimCanvas,shimDOM,group,ok,eq,summary} from "./harness.js";
shim(); shimCanvas();
const doc=shimDOM();
doc.body.innerHTML=`<div id="stage"></div>`;
(()=>{
 const cv=doc.createElement("canvas"); cv.setAttribute("id","cv");
 doc.getElementById("stage").appendChild(cv);
 const g=doc.getElementById.bind(doc);
 doc.getElementById=id=>(id==="cv")?cv:g(id);
})();
const {S,newState,ensureShape,edit,undo,canUndo,snapshot,clearHistory}=
 await import("../core/state.js");
const W=await import("../core/walls.js");
const O=await import("../core/opens.js");
const B=await import("../core/batch.js");
const BL=await import("../core/blocks.js");
const BT=await import("../tools/blocks.js");
await import("../tools/draw.js");
const RUN=await import("../ai/run.js");
const reset=()=>{newState(); ensureShape()};

group("إدراج كتلة ثم undo يُعيد الحالة",()=>{
 reset(); BL.installDefaults();
 /* الإقلاع الحقيقيّ يُنادي installDefaults قبل أن يُركَّب خطّاف
    التاريخ (ensureShape لم تجرِ بعد) فلا خطوات؛ هنا العكس، فنمسح */
 clearHistory();
 BT.initBlockTool({addInstance:i=>{(S.blocks||(S.blocks=[])).push(i)},
  snap:w=>w,defaultLayer:()=>"0"});
 BT.startInsert("door"); BT.onClick([100,100]);
 eq(S.blocks.length,1,"أُدرجت");
 undo();
 eq(S.blocks.length,0,"وزالت بالتراجع");
 ok(!canUndo(),"ولا خطوة زائدة");
});
group("addOpen يفرض EDGE ويرفض الخروج عن الجدار",()=>{
 reset();
 const w=W.addWall([0,0],[6000,0],200,"int","c");
 [0,100,5950,6100,-500].forEach(s=>{
  let threw=false; try{O.addOpen(w,s,"door",900,2100,0)}catch(e){threw=true}
  ok(threw&&S.opens.length===0,`الموضع ${s} يُرفَض ولا تُضاف فتحة`);
 });
 O.addOpen(w,3000,"door",900,2100,0);
 eq(S.opens.length,1,"والموضع السليم يُقبَل");
});
group("applyField يرفض الطول غير الصالح ولا يصفّره",()=>{
 reset();
 const w=W.addWall([0,0],[6000,0],200,"int","c");
 ["abc","","   ",null,undefined,"1e999","-"].forEach(raw=>{
  const r=B.applyField("wall",[{k:"wall",id:w.id}],"t",raw);
  ok(r.done===0&&r.refused.length===1&&w.t===200,
   `«${String(raw)}» رُفض والسماكة ما زالت ٢٠٠`);
 });
});
group("trial ثم rollback يستعيد اللقطة حرفاً",()=>{
 reset(); W.addWall([0,0],[3000,0],200,"int","c");
 const before=snapshot();
 const t=RUN.trial([{kind:"tool",tool:"wall"},{kind:"text",s:"0,1000"},
  {kind:"text",s:"3000,1000"},{kind:"enter"},{kind:"text",s:"zzz"}],
  {stopOnError:1});
 ok(t.errs>=1,"خطأٌ داخل السطر أُبلغ");
 RUN.rollback(t);
 ok(snapshot()===before,"والإرجاع أعاد الحالة حرفاً");
});
group("edit يرجع كاملاً عند الرمي ولا يدفع تاريخاً",()=>{
 reset(); const before=snapshot();
 edit(()=>{W.addWall([0,0],[3000,0],200,"int","c");
  W.addWall([0,1000],[3000,1000],200,"int","c"); throw new Error("x")},"فشل");
 ok(snapshot()===before,"عادت الحالة بعد جدارين ثم رمي");
 ok(!canUndo(),"ولا خطوة في التاريخ");
});
const W2=await import("../ui/ribbon/wire.js");
const SC=await import("../ui/ribbon/schema.js");
group("ACT: كل فعلٍ في schema.js مربوطٌ بدالّةٍ حيّة",()=>{
 const acts=SC.ribbonActs();
 ok(acts.length>=50,`${acts.length} فعلاً في الشريط`);
 const bad=acts.filter(a=>typeof (W2.ACT[a]&&W2.ACT[a].fn)!=="function");
 eq(bad.length,0,"لا فعلٌ بلا دالّة"+(bad.length?" — "+bad.join(" · "):""));
});
process.exit(summary()?1:0);
