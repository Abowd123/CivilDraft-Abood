/* ═══ اختبار 2.5: blocks.fromJSON يتحقّق قبل المسح ═══
   تعريفٌ فاسدٌ في قائمةٍ لا يمسّ DEFS إطلاقاً — لا مسحَ جزئيّ.     */
import {shim,group,ok,eq,deep,summary} from "./harness.js";
shim();
const B=await import("../core/blocks.js");

group("fromJSON — بيانات سليمة",()=>{
 B.installDefaults();
 const r=B.fromJSON({defs:[
  {name:"test1",title:"اختبار",prims:[{t:"line",a:[0,0],b:[1000,0]}]}
 ]});
 eq(r.ok,1,"نجح"); eq(r.n,1,"تعريفٌ واحد");
 ok(B.hasBlock("test1"),"test1 موجود");
 ok(!B.hasBlock("door"),"door زال (استُبدل)");
});
group("fromJSON — تعريفٌ فاسدٌ لا يمسّ الحالة إطلاقاً",()=>{
 B.installDefaults();
 const before=B.blockList().map(b=>b.name).sort();
 const r=B.fromJSON({defs:[
  {name:"good",prims:[{t:"line",a:[0,0],b:[1000,0]}]},
  {name:"bad",prims:[{t:"line",a:[NaN,0],b:[1000,0]}]}
 ]});
 eq(r.ok,0,"رُفض"); ok(r.bad.length>=1,"تعريفٌ فاسدٌ مسجَّل");
 ok(/bad/.test(r.bad[0].name),"الاسم مذكور");
 const after=B.blockList().map(b=>b.name).sort();
 deep(after,before,"الحالة لم تتغيّر حرفاً");
 ok(!B.hasBlock("good"),"good لم يُدخَل رغم صحّته (كلٌّ أو لا شيء)");
 ok(B.hasBlock("door"),"door ما زال موجوداً");
});
group("fromJSON — أشكال الرفض",()=>{
 ok(B.fromJSON({}).ok===0,"لا defs");
 ok(/defs/.test(B.fromJSON({}).why),"السبب يذكر defs");
 ok(B.fromJSON({defs:"abc"}).ok===0,"defs ليست مصفوفة");
 ok(B.fromJSON({defs:[{prims:[]}]}).ok===0,"تعريفٌ بلا اسم");
 ok(B.fromJSON({defs:[{name:"",prims:[]}]}).ok===0,"اسمٌ فارغ");
 ok(B.fromJSON({defs:[{name:"x",prims:"abc"}]}).ok===0,"prims ليست مصفوفة");
 const big=new Array(600).fill({t:"line",a:[0,0],b:[1,1]});
 ok(B.fromJSON({defs:[{name:"big",prims:big}]}).ok===0,"prims فوق حدّ الأوّليات");
 ok(B.fromJSON({defs:[{name:"x",prims:[{t:"مجهول"}]}]}).ok===0,"نوعُ أوّليةٍ مجهول");
 ok(/مجهول/.test(B.fromJSON({defs:[{name:"x",prims:[{t:"z"}]}]}).bad[0].why),
  "والسبب يذكر النوع");
 ok(B.fromJSON({defs:[{name:"x",prims:[{t:"pline",pts:[[0,0]]}]}]}).ok===0,
  "pline بنقطةٍ واحدة");
 ok(B.fromJSON({defs:[{name:"x",prims:[{t:"circle",c:[0,0],r:0}]}]}).ok===0,
  "circle نصف قطرٍ صفري");
 const many=[]; for(let i=0;i<2100;i++)many.push({name:"b"+i,prims:[]});
 ok(B.fromJSON({defs:many}).ok===0,"عدد التعريفات فوق الحدّ");
 /* G9-4-09: نفحص why وbad[i].why مباشرةً لا نصّ JSON (ترتيب المفاتيح) */
 const dup=B.fromJSON({defs:[{name:"x",prims:[]},{name:"x",prims:[]}]});
 ok(dup.ok===0&&(/مكرّر/.test(dup.why||"")||dup.bad.some(b=>/مكرّر/.test(b.why||""))),
  "اسمٌ مكرّر داخل نفس الملفّ يُرفَض");
});
group("fromJSON — أوّليات صالحة ونجاحٌ كامل",()=>{
 B.installDefaults();
 const r=B.fromJSON({defs:[
  {name:"arc1",prims:[{t:"arc",c:[0,0],r:1000,a0:0,a1:Math.PI/2}]},
  {name:"empty",prims:[]},
  {name:"poly",prims:[{t:"pline",pts:[[0,0],[100,0],[100,100]],closed:1}]}
 ]});
 eq(r.ok,1,"نجح"); eq(r.n,3,"ثلاثة تعاريف");
 ok(B.hasBlock("arc1")&&B.hasBlock("empty")&&B.hasBlock("poly"),"الثلاثة موجودة");
});
group("checkDefs — تحقّقٌ بلا كتابة",()=>{
 B.installDefaults();
 const before=B.blockList().map(b=>b.name).sort();
 const c=B.checkDefs({defs:[{name:"x",prims:[{t:"circle",c:[0,0],r:-1}]}]});
 eq(c.ok,0,"يفشل");
 deep(B.blockList().map(b=>b.name).sort(),before,"وDEFS لم تتغيّر إطلاقاً");
});
group("defineBlock — سقف LIM.blockDefs.max (D3-06)",()=>{
 const MAX=2000;
 B.fromJSON({defs:[]});
 for(let i=0;i<MAX;i++)B.defineBlock({name:"c"+i,prims:[]});
 eq(B.blockList().length,MAX,"2000 تعريف دخلت بلا خطأ");
 let msg=null;
 try{B.defineBlock({name:"c"+MAX,prims:[]})}catch(e){msg=e.message}
 ok(!!msg,"التعريف رقم 2001 يرمي");
 ok(msg&&/الحدّ الأقصى/.test(msg)&&/2000/.test(msg),"الرسالة عربية وتذكر الحدّ: "+msg);
 ok(!B.hasBlock("c"+MAX),"ولم يدخل DEFS");
 eq(B.blockList().length,MAX,"والعدد لم يتغيّر");
 /* تعديل تعريفٍ قائم عند السقف لا يُحتسَب */
 let edited=true;
 try{B.defineBlock({name:"c5",title:"معدَّل",prims:[{t:"line",a:[0,0],b:[10,0]}]})}
 catch(e){edited=false}
 ok(edited,"تعديل تعريفٍ قائم عند السقف مسموح");
 eq(B.getBlock("c5").title,"معدَّل","والتعديل طُبِّق");
 eq(B.blockList().length,MAX,"والعدد ثابت بعد التعديل");
 /* حذفٌ ثم تعريف جديد يعود ممكناً */
 B.removeBlock("c0");
 ok((()=>{try{B.defineBlock({name:"fresh",prims:[]});return true}catch(e){return false}})(),
  "بعد حذف تعريفٍ يعود التعريف الجديد ممكناً");
 /* مشروع بـ2000 تعريف يُحفظ ويُفتح (عبر blocks.toJSON/fromJSON) */
 const json=JSON.parse(JSON.stringify(B.toJSON()));
 eq(json.defs.length,MAX,"الحفظ: 2000 تعريف");
 const r=B.fromJSON(json);
 eq(r.ok,1,"الفتح ينجح"); eq(r.n,MAX,"بـ2000 تعريف");
 B.fromJSON({defs:[]});
});
{
 const {S,newState,ensureShape}=await import("../core/state.js");
 const PRJ=await import("../io/project.js");
 group("مشروع كامل بـ2000 تعريف يُحفظ ويُفتح (D3-06)",()=>{
  newState(); ensureShape();
  B.fromJSON({defs:[]});
  for(let i=0;i<2000;i++)B.defineBlock({name:"p"+i,prims:[]});
  const txt=PRJ.toJSON();
  let opened=true,err="";
  try{PRJ.fromJSON(txt)}catch(e){opened=false;err=e.message}
  ok(opened,"المشروع المحفوظ يُفتح"+(err?" — "+err:""));
  eq(B.blockList().length,2000,"وتعريفاته الـ2000 كلها موجودة");
  let threw=false;
  try{B.defineBlock({name:"p2000",prims:[]})}catch(e){threw=true}
  ok(threw,"والتعريف رقم 2001 مرفوض بعد الفتح");
 });
}
process.exit(summary()?1:0);
