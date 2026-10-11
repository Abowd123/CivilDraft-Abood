/* المرحلة C-ب — إدارة الطوابق (15) وربط F7:
   المنطق الخالص على Node بلا DOM.  node js/tests/phaseC-b.test.js */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const {S,newState,undo}=await import("../core/state.js");
const {addCol}=await import("../core/cols.js");
const {addWall}=await import("../core/walls.js");
const {levelDef,levelDefs}=await import("../core/level.js");
const LM=await import("../tools/levelmgr.js");
const {inspect}=await import("../core/inspect.js");

group("15 · صفوف الطوابق",()=>{
 newState();
 const r=LM.levelRows();
 eq(r.length,1,"طابقٌ واحدٌ افتراضيّ"); eq(r[0].n,0,"أرضي"); ok(r[0].active,"نشط");
});
group("15 · إضافة طابق: رقمٌ تالٍ ومنسوبٌ فوق السابق",()=>{
 newState();
 LM.addLevel();
 const d=levelDef(S,1);
 ok(d,"عُرِّف الطابق 1"); eq(d.elev,3000,"المنسوب = منسوب الأرضي + ارتفاعه");
 LM.addLevel();
 ok(levelDef(S,2),"ثمّ الطابق 2 بلا اصطدام");
 undo();
 eq(levelDefs(S).length,2,"تراجعٌ واحد يزيل الأخير");
});
group("15 · الإضافة لا تصطدم بتعريفٍ خالٍ",()=>{
 newState();
 S.levelDefs.push({n:1,name:"x",elev:3000,h:3000,slab:200,color:"#cccccc"});
 LM.addLevel();
 ok(levelDef(S,2),"أُضيف 2 لا 1 (المكرَّر كان سيُرفض)");
});
group("15 · حفظ: تطبيعٌ وحدود",()=>{
 newState(); LM.addLevel();
 const res=LM.applyLevels([
  {n:0,name:"  القبو  ",elev:"-3000",h:"99999",slab:"5000",color:"bad"},
  {n:1,name:"أول",elev:"3200",h:"100",slab:"-5",color:"#112233"}]);
 eq(res.saved,2,"حُفظ الاثنان"); eq(res.fail.length,0,"بلا رفض");
 const a=levelDef(S,0), b=levelDef(S,1);
 eq(a.name,"القبو","الاسم يُقصّ"); eq(a.elev,-3000,"منسوبٌ سالبٌ مقبول (قبو)");
 eq(a.h,8000,"الارتفاع يُقيَّد 8000"); eq(a.slab,1000,"البلاطة 1000");
 eq(a.color,"#cccccc","لونٌ فاسد → افتراضي");
 eq(b.h,2000,"الأدنى 2000"); eq(b.slab,0,"البلاطة ≥0"); eq(b.color,"#112233","لونٌ صالح");
});
group("15 · حفظ: صفٌّ فاسدٌ يُرفَض وحده ويُبلَّغ",()=>{
 newState(); LM.addLevel();
 const res=LM.applyLevels([
  {n:0,name:"",elev:0,h:3000,slab:200,color:"#cccccc"},
  {n:1,name:"ب",elev:"abc",h:3000,slab:200,color:"#cccccc"},
  {n:7,name:"شبح",elev:0,h:3000,slab:200,color:"#cccccc"},
  {n:1,name:"سليم",elev:3000,h:3000,slab:200,color:"#cccccc"}]);
 eq(res.saved,1,"الرابع فقط"); eq(res.fail.length,3,"ثلاثة رُفضت");
 eq(levelDef(S,0).name,"أرضي","الاسم الفارغ لم يمسح الاسم القديم");
 eq(levelDef(S,1).name,"سليم","الأخير سرى");
});
group("15 · حفظ: خطوةُ تراجعٍ واحدة",()=>{
 newState(); LM.addLevel();
 LM.applyLevels([{n:0,name:"س",elev:0,h:4000,slab:300,color:"#aa0000"},
  {n:1,name:"ص",elev:4000,h:3500,slab:250,color:"#00aa00"}],true);
 eq(S.opt.fill,"solid","poché فُعِّل");
 undo();
 eq(levelDef(S,0).name,"أرضي","تراجعٌ واحد يعيد الأوّل"); eq(levelDef(S,1).h,3000,"والثاني");
 eq(S.opt.fill,"none","والـpoché");
});
group("15 · poché: المفعَّل (hatch) يبقى",()=>{
 newState(); S.opt.fill="hatch";
 LM.applyLevels([],true);  eq(S.opt.fill,"hatch","لا يُبدَّل hatch بـsolid");
 LM.applyLevels([],false); eq(S.opt.fill,"none","إيقافٌ");
 LM.applyLevels([]);       eq(S.opt.fill,"none","undefined لا يمسّ");
});
group("15 · تنبيهات المنسوب والاسم",()=>{
 newState(); LM.addLevel();
 eq(LM.levelWarnings().length,0,"وضعٌ سليم");
 LM.applyLevels([{n:1,name:"أرضي",elev:0,h:3000,slab:200,color:"#cccccc"}]);
 eq(LM.levelWarnings().length,2,"منسوبٌ لا يعلو + اسمٌ مكرَّر");
});
group("F7 · الفاحص يقول عن انحراف المحاذاة",()=>{
 newState();
 S.meta.level=0; addCol("rect",[0,0],300,300,0,"conc");
 S.meta.level=1; addCol("rect",[2000,0],300,300,0,"conc");
 const r=inspect(null);
 const a=r.list.filter(f=>f.code==="align");
 eq(a.length,1,"ملاحظةٌ واحدة من نوع align"); eq(a[0].sev,"wr","تنبيه");
 ok(a[0].p,"لها هدف قفز");
 newState();
 S.meta.level=0; addCol("rect",[0,0],300,300,0,"conc");
 S.meta.level=1; addCol("rect",[10,0],300,300,0,"conc");
 eq(inspect(null).list.filter(f=>f.code==="align").length,0,"محاذٍ ضمن 50مم: لا ملاحظة");
});
process.exit(summary());
