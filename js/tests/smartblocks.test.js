/* ═══ اختبار معرض القوالب والكتل الذكية ═══
   بلا شبكة وبلا متصفّح.  node js/tests/smartblocks.test.js */
import {shim,group,ok,eq,near,deep,throws,summary} from "./harness.js";
shim();

const {S,newState,ensureShape}=await import("../core/state.js");
const RN=await import("../core/render.js");
const SB=await import("../ai/smartblocks.js");
const TL=await import("../ai/templates_lib.js");

const reset=()=>{newState(); ensureShape(); RN.invalidate()};

group("smartblocks: كتلة غرفة",()=>{
 reset();
 const r=SB.placeBlock("room",[0,0],null,{commit:true});
 eq(r.generated,4,"أربع عمليات جدار مولَّدة");
 eq(r.rejected.length,0,"ولا رفضَ لها");
 ok(r.committed,"والتزمت في الحالة");
 eq(S.walls.length,4,"وأربعة جدران فعلاً في S.walls");
 eq(S.areas.length,0,"ولا منطقة — الاسم فارغٌ افتراضياً");
});

group("smartblocks: غرفة باسمٍ تُنشئ منطقة",()=>{
 reset();
 const r=SB.placeBlock("room",[0,0],{w:4,h:4,name:"صالة"},{commit:true});
 ok(r.committed,"التزمت");
 eq(S.areas.length,1,"ومنطقةٌ واحدة أُنشئت");
});

group("smartblocks: غرفة بباب — معاملة واحدة",()=>{
 reset();
 const r=SB.placeBlock("iconDoor",[0,0],null,{commit:true});
 eq(S.walls.length,4,"أربعة جدران");
 eq(S.opens.length,1,"وفتحةٌ واحدة (باب) على الجدار الصحيح");
 ok(!!r.doorResult,"وتقرير المرحلة الثانية (الباب) موجود");
 eq(r.doorResult.made[0].k,"open","والعنصر المُدرَج من نوع open");
 const wid=r.result.made[0].id;
 eq(S.opens[0].wall,wid,"والباب على الجدار الجنوبي (أول جدارٍ مُدرَج)");
});

group("smartblocks: كتلة غير معروفة",()=>{
 reset();
 const r=SB.placeBlock("لا_يوجد",[0,0],null,{commit:true});
 ok(!!r.error,"تُعيد خطأً واضحاً");
 eq(S.walls.length,0,"ولا تكتب شيئاً في الحالة");
});

group("smartblocks: bath وkitchen يضيفان منطقة مسمّاة",()=>{
 reset();
 SB.placeBlock("bath",[0,0],null,{commit:true});
 SB.placeBlock("kitchen",[5,0],null,{commit:true});
 eq(S.areas.length,2,"منطقتان");
 deep(S.areas.map(a=>a.name).sort(),["حمام","مطبخ"].sort(),
  "بالاسمين الصحيحين");
});

group("smartblocks: المعاينة بلا التزام لا تكتب شيئاً",()=>{
 reset();
 const r=SB.placeBlock("room",[0,0],null,{commit:false});
 ok(!r.committed,"غير مُلتَزمة");
 eq(S.walls.length,0,"والحالة لم تتغيّر");
});

group("templates_lib: شقة صغيرة كاملة",()=>{
 reset();
 const r=TL.placeTemplate("apt_small",{commit:true});
 ok(r.committed,"التزمت");
 eq(r.rejected.length,0,"بلا رفضٍ لأيّ عملية");
 /* ٤ كتل × ٤ جدران = 16، لكن الضلع الشرقيّ للصالة والغربيّ للغرفة
    مقطعٌ واحدٌ بعينه (4,0)↔(4,4): dedupeWalls تُبقي واحداً (بند 81)
    — وإلا تكرّر الجدار وتضاعفت كمّيّتُه في الحصر. */
 eq(S.walls.length,15,"خمسة عشر جداراً: 16 مولَّداً − ضلعٌ مشترك مكرَّر");
 eq(S.areas.length,4,"وأربع مناطق مسمّاة");
});

group("templates_lib: قالب غير معروف",()=>{
 reset();
 const r=TL.placeTemplate("لا_يوجد",{commit:true});
 ok(!!r.error,"تُعيد خطأً واضحاً");
 eq(S.walls.length,0,"ولا تكتب شيئاً في الحالة");
});

group("smartblocks/templates_lib: القوائم غير فارغة",()=>{
 ok(SB.blockList.length>=3,"blockList فيها كتلٌ عدّة");
 ok(TL.templateList.length>=2,"templateList فيها قوالب عدّة");
 ok(SB.blockList.every(b=>b.id&&b.label),"كل كتلةٍ لها id وlabel");
 ok(TL.templateList.every(t=>t.id&&t.label),"كل قالبٍ له id وlabel");
});

process.exit(summary()?1:0);
