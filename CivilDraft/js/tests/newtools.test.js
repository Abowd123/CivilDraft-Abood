/* ═══ الأدواتُ الثلاثُ الجديدة ═══ الأولويةُ العالية ١–٣
   `fillet` (كانت نواتُها جاهزةً بلا أداة) · `scale` (كانت ناقصةً
   تماماً) · `explode` (مثيلُ الكتلة لا يُحدَّد فالإصابةُ تُبنى في
   الأداة). والاختبارُ على النواةِ والعقد: السلوكُ لا الرسم.
   التشغيل:  node js/tests/newtools.test.js                         */
import {shim,group,ok,eq,near,summary} from "./harness.js";
shim();

const ST=await import("../core/state.js");
const {S,DEF,loadState,clearHistory,undo,canUndo,
       editFailed,setEditError}=ST;
const W =await import("../core/walls.js");
const M =await import("../core/modify.js");
const O =await import("../core/opens.js");
const C =await import("../core/cols.js");
const AM=await import("../core/arcmath.js");
const D =await import("../core/dims.js");
const BLK=await import("../core/blocks.js");
const BOP=await import("../tools/blockops.js");
const R=await import("../tools/registry.js");
await import("../tools/modify.js");

const reset=()=>{loadState(DEF(),true); clearHistory(); LAST=""};
const sel=list=>M.grab(list);
/* edit() تبتلع الاستثناء وتُعلن editFailed() وتُبلّغ النصَّ عبر
   setEditError — فالرفضُ يُقرأ من هنا لا من try/catch. */
let LAST="";
setEditError(m=>{LAST=String(m||"")});

/* ═══ ١ · الأدواتُ الثلاثُ مسجَّلةٌ بعقدٍ كامل ═══ */
group("الأدواتُ الثلاثُ في السجلّ",()=>{
 [["fillet","استدارة الركن",1],["scale","مقياس",1],
  ["explode","تفكيك كتلة",1]].forEach(([id,label,destr])=>{
  const d=R.findTool(id);
  ok(!!d,`${id} مسجَّلة`);
  if(!d)return;
  eq(d.label,label,`${id}: الملصق`);
  ok(!!d.hint,`${id}: لها تلميح`);
  ok(!!d.alias,`${id}: ولها اسمٌ بديل`);
  eq(d.destruct?1:0,destr,`${id}: مُعلَنةٌ هادمة`);
  /* كلُّ لقبٍ يُحَلّ إليها — ولا يسرق لقبَ أداةٍ أخرى */
  String(d.alias).split(/\s+/).filter(Boolean).forEach(a=>
   ok(R.findTool(a)===d,`${id}: اللقب «${a}» يُحَلّ إليها`));
 });
 /* والعربيةُ تعمل: اللقبُ المُطبَّع يُحَلّ */
 ok(R.findTool("استداره")===R.findTool("fillet"),"«استداره» ⇒ fillet");
 ok(R.findTool("مقياس")===R.findTool("scale"),"«مقياس» ⇒ scale");
 ok(R.findTool("تفكيك")===R.findTool("explode"),"«تفكيك» ⇒ explode");
});

/* ═══ ٢ · fillet — الأداةُ تصل إلى النواة ═══ */
group("fillet — الأداةُ موصولةٌ بالنواة الجاهزة",()=>{
 reset();
 const d=R.findTool("fillet");
 /* الخياراتُ: نصفُ القطر وحده، وافتراضُه نصفُ متر */
 eq((d.opts||[]).length,1,"خيارٌ واحد: نصف القطر");
 eq(d.opts[0].k,"r","مفتاحُه r");
 eq(d.opts[0].type,"len","ونوعُه طول");
 eq(d.opts[0].def,"0.5","وافتراضُه 0.5 م");
 /* ثلاثُ خطوات: جدارٌ · جدارٌ · تأكيد */
 eq((d.steps||[]).length,3,"ثلاثُ خطوات");
 eq(d.steps[0].ent,"wall","الأولى على جدار");
 eq(d.steps[1].ent,"wall","والثانية كذلك");
 eq(d.steps[2].confirm?1:0,1,"والثالثةُ تأكيدٌ صريح — لا تنفيذٌ صامت");
 ok(typeof d.prev==="function","ولها معاينة");
});

/* ═══ ٣ · scale — الهندسةُ والمقاساتُ معاً ═══ */
group("scale — موحَّدٌ ويقيس المقاسات معه",()=>{
 reset();
 const w=W.addWall([0,0],[4000,0],200,"int","c");
 const r=M.scaleAll(sel([{k:"wall",id:w.id}]),[0,0],2);
 eq(r.walls,1,"عنصرٌ واحدٌ قُيس");
 eq(r.k,2,"بالمعامل 2");
 eq(w.b[0],8000,"الطولُ تضاعف");
 eq(w.t,400,"والسماكةُ معه — مقياسٌ لا تشويه");
 eq(w.a[0],0,"ونقطةُ الأساس لم تتحرّك");
 ok(canUndo(),"وخطوةُ تراجعٍ واحدة");
 undo();
 /* التراجعُ يستبدل الكائناتَ لا يعدّلها، فالمرجعُ القديم منفصلٌ
    بعده — تُقرأ النسخةُ الحيّةُ بالمعرّف. */
 const w2=W.wallById(w.id);
 eq(w2.b[0],4000,"والتراجعُ يعيد الطول");
 eq(w2.t,200,"والسماكة");
});

group("scale — التصغيرُ ونقطةُ أساسٍ غيرُ الأصل",()=>{
 reset();
 const w=W.addWall([2000,0],[6000,0],400,"int","c");
 M.scaleAll(sel([{k:"wall",id:w.id}]),[2000,0],0.5);
 eq(w.a[0],2000,"الأساسُ ثابت");
 eq(w.b[0],4000,"والطرفُ الآخر قرُب");
 eq(w.t,200,"والسماكةُ نصفت");
});

group("scale — القوسُ ينجو قوساً (bulge ثابتٌ تحت المقياس)",()=>{
 reset();
 const w=W.addWall([0,0],[4000,0],200,"int","c",undefined,0.5);
 ok(AM.isArc(w),"الجدارُ قوسيٌّ قبل القياس");
 const b0=w.bulge;
 const P0=AM.arcParams(w);
 M.scaleAll(sel([{k:"wall",id:w.id}]),[0,0],3);
 ok(AM.isArc(w),"وقوسيٌّ بعده");
 eq(w.bulge,b0,"وbulge لم يتغيّر — لا يعتمد على نصف القطر");
 const P1=AM.arcParams(w);
 near(P1.R,P0.R*3,1,"ونصفُ القطر تثلّث فعلاً");
});

group("scale — الفتحةُ تتبع جدارَها موضعاً وعرضاً",()=>{
 reset();
 const w=W.addWall([0,0],[6000,0],200,"int","c");
 const op=O.addOpen(w,2000,"door",900,2100);
 M.scaleAll(sel([{k:"wall",id:w.id}]),[0,0],2);
 eq(op.s,4000,"موضعُ الفتحة على المسار تضاعف");
 eq(op.w,1800,"وعرضُها — وإلّا صارت فتحةٌ أعرضُ من نسبتها");
});

group("scale — العمودُ مركزاً ومقطعاً",()=>{
 reset();
 const c=C.addCol("rect",[1000,1000],300,300,0);
 M.scaleAll(sel([{k:"col",id:c.id}]),[0,0],2);
 eq(c.x,2000,"المركزُ انتقل");
 eq(c.w,600,"والمقطعُ كبر");
 eq(c.h,600,"بُعدَيه");
});

group("scale — قيَمُ السلسلة تُقاس (مكتوبةٌ لا محسوبة)",()=>{
 reset();
 const ch=D.addChain("h",[0,0],-1000,[1000,2000],0,0);
 M.scaleAll(sel([{k:"chain",id:ch.id}]),[0,0],2);
 eq(ch.vals.join(","),"2000,4000",
  "القيَمُ تضاعفت — ولو بقيت لكذب الرقمُ على المسافة");
});

group("scale — الرفضُ قبل أيِّ كتابة",()=>{
 reset();
 const w=W.addWall([0,0],[4000,0],900,"int","c");
 const G=sel([{k:"wall",id:w.id}]);
 /* 900×2 = 1800 > LIM.thickness.max (1000) */
 let m=""; try{M.scaleAll(G,[0,0],2)}catch(e){m=e.message}
 ok(/السماكة/.test(m),`الرفضُ يسمّي السماكة: ${m.slice(0,60)}`);
 ok(/1/.test(m),"ويذكر الحدّ");
 eq(w.t,900,"ولا شيءَ كُتِب — السماكةُ كما هي");
 eq(w.b[0],4000,"ولا الهندسة");
 ok(!canUndo(),"ولا خطوةَ تراجعٍ عن عدمٍ");
});

group("scale — حدودُ المعامل نفسُه",()=>{
 reset();
 const w=W.addWall([0,0],[4000,0],200,"int","c");
 const G=sel([{k:"wall",id:w.id}]);
 const no=k=>{let m=""; try{M.scaleAll(G,[0,0],k)}catch(e){m=e.message} return m};
 ok(/موجب/.test(no(0)),"صفرٌ مرفوضٌ بسببٍ مقروء");
 ok(/موجب/.test(no(-2)),"والسالبُ كذلك");
 ok(/موجب/.test(no(NaN)),"وما ليس رقماً");
 ok(/المدى/.test(no(1000)),"وما خرج عن المدى الأعلى");
 ok(/المدى/.test(no(0.0001)),"والأدنى");
 ok(/لا شيءَ يتغيّر/.test(no(1)),"والمعامل ١ يُرفض لا يُنفَّذ صامتاً");
 eq(w.t,200,"ولم يُكتَب شيءٌ في كلِّ ذلك");
 eq(M.SCL_MIN,0.01,"والمدى معلَنٌ للقارئ");
 eq(M.SCL_MAX,100,"حدَّيه");
});

group("scale — ما لا يُقاس يُرفَض بالاسم لا بالصمت",()=>{
 reset();
 const w=W.addWall([0,0],[4000,0],200,"int","c");
 const dr=D.addDimRad([1000,1000],500,[2000,2000]);
 const r=M.scaleAll(sel([{k:"wall",id:w.id},{k:"dim",id:dr.id}]),
  [0,0],2);
 eq(r.walls,1,"الجدارُ قُيس");
 eq(r.refused.length,1,"والبُعدُ نصفُ القطر رُفض");
 ok(/R|rad|ق/.test(r.refused[0])||r.refused[0].includes(dr.id),
  `والرفضُ يسمّيه: ${r.refused[0]}`);
});

group("scale — النسخةُ تُبقي الأصل",()=>{
 reset();
 const w=W.addWall([0,0],[4000,0],200,"int","c");
 const r=M.scaleAll(sel([{k:"wall",id:w.id}]),[0,0],2,1,1);
 eq(S.walls.length,2,"جدارانِ: الأصلُ والمقيس");
 eq(w.b[0],4000,"والأصلُ لم يُمَسّ");
 eq((r.made||[]).length,1,"والمُنتَجُ مُبلَّغ");
});

/* ═══ ٤ · explode — من مثيلٍ لا يُحدَّد إلى خطوطٍ تُحدَّد ═══ */
group("explode — إصابةُ المثيل مبنيّةٌ في الأداة",()=>{
 reset();
 BLK.defineFromPrims("tstx","تجربة",
  [{t:"line",a:[0,0],b:[1000,0]},
   {t:"line",a:[1000,0],b:[1000,1000]}],[0,0]);
 const inst=BLK.makeInstance("tstx",{x:5000,y:5000});
 S.blocks=[inst];
 /* النقرةُ على أحد الخطَّين تجده */
 ok(BOP.instanceAt([5500,5000],300)===inst,"نقرةٌ على خطٍّ تجد المثيل");
 ok(BOP.instanceAt([5000,5000],300)===inst,"ونقرةٌ على الركن");
 eq(BOP.instanceAt([9000,9000],300),null,"والبعيدُ لا يُصاب");
 /* والسماحيةُ تُحترَم */
 eq(BOP.instanceAt([5500,5400],300),null,"وخارجَ السماحية لا شيء");
 ok(BOP.instanceAt([5500,5400],600)===inst,"وبسماحيةٍ أوسعَ يُصاب");
 /* والقائمةُ تُمرَّر صريحةً فالدالّةُ خالصة */
 eq(BOP.instanceAt([5500,5000],300,[]),null,"وقائمةٌ فارغةٌ ⇒ null");
});

group("explode — الخطوطُ تصير خطوطاً متعدّدةً والمثيلُ يزول",()=>{
 reset();
 BLK.defineFromPrims("tstx2","تجربة",
  [{t:"line",a:[0,0],b:[1000,0]},
   {t:"line",a:[1000,0],b:[1000,1000]}],[0,0]);
 S.blocks=[BLK.makeInstance("tstx2",{x:0,y:0})];
 const n0=S.plines.length;
 const r=BOP.explodeInstance(S.blocks[0]);
 eq(r.count,2,"أوّليتانِ ⇒ خطّانِ متعدّدان");
 eq(S.plines.length,n0+2,"وأُضيفا فعلاً");
 eq(S.blocks.length,0,"والمثيلُ أُزيل");
 eq(r.skipped,0,"ولا أوّليةَ متخطَّاة");
 ok(canUndo(),"وخطوةُ تراجعٍ واحدة");
 undo();
 eq(S.plines.length,n0,"والتراجعُ يسحب الخطوط");
 eq(S.blocks.length,1,"ويعيد المثيل");
});

group("explode — القوسُ يبقى قوساً لا مضلّعاً مقرَّباً",()=>{
 reset();
 BLK.defineFromPrims("tstarc","قوس",
  [{t:"arc",c:[0,0],r:1000,a0:0,a1:Math.PI/2}],[0,0]);
 S.blocks=[BLK.makeInstance("tstarc",{x:0,y:0})];
 const r=BOP.explodeInstance(S.blocks[0]);
 eq(r.count,1,"قوسٌ واحدٌ ⇒ خطٌّ متعدّدٌ واحد");
 const pl=S.plines[S.plines.length-1];
 eq(pl.pts.length,2,"نقطتانِ لا ستّة عشر — لا تقطيع");
 ok(Array.isArray(pl.bulge)&&Math.abs(pl.bulge[0])>0.1,
  `وbulge يحمل الانحناء: ${pl.bulge&&pl.bulge[0]}`);
 near(Math.abs(pl.bulge[0]),Math.tan(Math.PI/8),0.01,
  "وقيمتُه tan(ربع الاجتياح) بالضبط");
});

group("explode — الدائرةُ الكاملةُ نصفان",()=>{
 reset();
 BLK.defineFromPrims("tstcir","دائرة",
  [{t:"circle",c:[0,0],r:500}],[0,0]);
 S.blocks=[BLK.makeInstance("tstcir",{x:0,y:0})];
 BOP.explodeInstance(S.blocks[0]);
 const pl=S.plines[S.plines.length-1];
 eq(pl.pts.length,2,"نقطتانِ متقابلتان");
 eq(pl.closed,1,"والحلقةُ مغلقة");
 ok(Math.abs(Math.abs(pl.bulge[0])-1)<1e-6,
  "وbulge = ١ (نصفُ دائرة) — قطعةٌ واحدةٌ لا تصف 360°");
});

group("explode — الرفضُ بسببٍ مقروءٍ ولا كتابةَ جزئية",()=>{
 reset();
 eq(BOP.explodeInstance(null),undefined,"لا مثيلَ ⇒ لا ناتج");
 ok(editFailed(),"والفشلُ مُعلَن");
 ok(/كتلة/.test(LAST),`والسببُ مقروء: ${LAST.slice(0,50)}`);
 /* مثيلٌ لتعريفٍ غائب: explode تعيد [] */
 reset();
 const ghost={id:"bX",block:"لا-يوجد",x:0,y:0,rot:0,scale:1,
  scaleX:1,scaleY:1,mirror:false,layer:"A-BLKS"};
 S.blocks=[ghost];
 BOP.explodeInstance(ghost);
 ok(editFailed(),"تعريفٌ غائب ⇒ فشلٌ مُعلَن");
 ok(/مفقود|فارغ/.test(LAST),`بسببٍ يسمّيه: ${LAST.slice(0,50)}`);
 eq(S.blocks.length,1,"والمثيلُ لم يُزَل — لا تفكيكَ بلا ناتج");
 eq(S.plines.length,0,"ولا خطَّ مكتوبٌ جزئياً");
 /* ومثيلٌ ليس في القائمة */
 reset();
 BLK.defineFromPrims("tstz","ز",[{t:"line",a:[0,0],b:[100,0]}],[0,0]);
 const out=BLK.makeInstance("tstz",{x:0,y:0});
 S.blocks=[];
 BOP.explodeInstance(out);
 ok(editFailed(),"مثيلٌ خارج القائمة ⇒ فشل");
 ok(/لم يبقَ/.test(LAST),`بسببٍ يسمّيه: ${LAST.slice(0,40)}`);
 eq(S.plines.length,0,"ولا كتابةَ");
});

process.exit(summary()?1:0);
