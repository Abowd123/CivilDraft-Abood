/* MT3 — عمليات تأليف الكتل الخلفية: إنشاءٌ من بدائيات، إعادةُ
   تسميةٍ تنقل المثيلات، حمايةُ الحذف من التعريف المستعمَل، وتعديلُ
   العنوان.  node js/tests/blockops.test.js */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const {S,newState,editFailed,setEditError}=await import("../core/state.js");
const BLK=await import("../core/blocks.js");
const OPS=await import("../tools/blockops.js");

group("إنشاء تعريف من بدائيات",()=>{
 newState();
 const prims=[
  {t:"line",a:[0,0],b:[1000,0]},
  {t:"arc",c:[0,0],r:900,a0:0,a1:Math.PI/2}
 ];
 const d=OPS.createBlock("bench","مقعد",prims,[0,0]);
 ok(d&&d.name==="bench","أُنشئ التعريف");
 ok(BLK.hasBlock("bench"),"وظهر في DEFS");
 const inst=BLK.makeInstance("bench",{x:0,y:0});
 const lines=BLK.explode(inst);
 ok(lines.length===2,"فُرّغ التعريف إلى أوّليتيه");
});

group("إعادة تسمية تنقل المثيلات",()=>{
 newState();
 OPS.createBlock("old","قديم",[{t:"line",a:[0,0],b:[1,0]}],[0,0]);
 S.blocks.push(BLK.makeInstance("old",{x:100,y:0}));
 const r=OPS.renameBlock("old","new","جديد");
 ok(r&&r.moved===1,"نُقل مثيلٌ واحد");
 eq(S.blocks[0].block,"new","المثيل يشير إلى الاسم الجديد");
 ok(BLK.hasBlock("new")&&!BLK.hasBlock("old"),"القديم زال والجديد ظهر");
});

group("حذف تعريفٍ مستعمَل يُرفَض ويُسمّي العدد",()=>{
 /* edit() تبتلع الاستثناء داخلياً (ترجع اللقطة وتُعلن editFailed())
    ولا تُعيد رميه إلى المتصل — فالاختبار الصحيح يقرأ الرسالة عبر
    setEditError لا try/catch حول deleteBlock نفسها. */
 newState();
 OPS.createBlock("item","بند",[{t:"line",a:[0,0],b:[10,0]}],[0,0]);
 S.blocks.push(BLK.makeInstance("item"));
 let msg=null; setEditError(m=>{msg=m});
 const r=OPS.deleteBlock("item");
 setEditError(null);
 ok(r===undefined,"الحذفُ لم يُنفَّذ — لا عائد");
 ok(editFailed(),"الفشل مُعلَن");
 ok(/1 مثيلاً/.test(msg||""),"الرسالة تذكر العدد");
 ok(BLK.hasBlock("item"),"التعريف بقي — لم يُحذف صامتاً");
});

group("حذفٌ آمن بعد تفريغ المثيلات وتعديل العنوان",()=>{
 newState();
 OPS.createBlock("tmp","مؤقت",[{t:"line",a:[0,0],b:[5,0]}],[0,0]);
 ok(OPS.setBlockTitle("tmp","مؤقت معدَّل"),"العنوان تعدَّل");
 S.blocks.push(BLK.makeInstance("tmp"));
 S.blocks.length=0;                    /* أُفرغت المثيلات */
 ok(OPS.deleteBlock("tmp"),"حُذف التعريف بعد التفريغ");
});

process.exit(summary());
