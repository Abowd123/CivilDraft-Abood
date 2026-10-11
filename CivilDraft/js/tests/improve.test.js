/* ═══ تحسيناتُ فحص الأدوات ═══
   DXF يحفظ بنيةَ الكتل (BLOCK/INSERT) · القياسُ يُثبَّت أبعاداً ·
   أدواتُ الأوراق الستُّ لها تلميحٌ ولقب.
   والأهمُّ: هنا يُسجَّل أنّ تشخيصَ الأداء في التقرير **كان خاطئاً**
   وقياسُه الصحيح — فلا يُصلَح ما ليس عاطلاً.
   التشغيل:  node js/tests/improve.test.js                           */
import {shim,group,groupAsync,ok,eq,summary} from "./harness.js";
shim();

const ST=await import("../core/state.js");
const {S,DEF,loadState,clearHistory}=ST;
const BLK=await import("../core/blocks.js");
const DX =await import("../io/dxf.js");
const D  =await import("../core/dims.js");
const G  =await import("../core/geom.js");
const R  =await import("../tools/registry.js");
await import("../tools/draw.js");
await import("../tools/sheet.js");

import {readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
const ROOT=join(fileURLToPath(new URL(".",import.meta.url)),"..","..");
const rd=f=>{try{return readFileSync(join(ROOT,f),"utf8")}catch(e){return ""}};
const GEOM=rd("js/core/geom.js");
const DXSRC=rd("js/io/dxf.js");
const SRC={};
["js/core/ents.js","js/core/osnap.js","js/core/inspect.js"]
 .forEach(f=>{SRC[f]=rd(f)});

const reset=()=>{loadState(DEF(),true); clearHistory()};
const mkBlock=()=>{
 BLK.defineFromPrims("tbl1","كرسي",
  [{t:"line",a:[0,0],b:[500,0]},
   {t:"line",a:[500,0],b:[500,500]},
   {t:"arc",c:[250,0],r:250,a0:0,a1:Math.PI},
   {t:"circle",c:[250,250],r:60},
   {t:"pline",pts:[[0,0],[100,0],[100,100]],closed:0}],[0,0]);
};

group("DXF — قسمُ BLOCKS ومثيلاتُ INSERT",()=>{
 reset(); mkBlock();
 const inst=BLK.makeInstance("tbl1",{x:3000,y:2000,
  rot:Math.PI/4,scale:2,layer:"A-BLKS"});
 S.blocks=[inst];
 const prims=[
  {t:"line",L:"A-WALL",a:[0,0],b:[1000,0]},
  /* الأوّليةُ المفكَّكةُ موسومةٌ بمعرّف المثيل */
  {t:"line",L:"A-BLKS",a:[3000,2000],b:[3500,2000],bid:inst.id}];
 const o={blocks:{defs:BLK.toJSON().defs,insts:S.blocks}};
 const txt=DX.toDXF(prims,{x0:0,y0:0,x1:9000,y1:9000},o);
 ok(/\n\s*2\r?\n\s*BLOCKS/.test(txt),"قسمُ BLOCKS مكتوب");
 ok(txt.includes("ENDBLK"),"وكلُّ تعريفٍ مُغلَق");
 ok(/\n\s*0\r?\n\s*INSERT/.test(txt),"ومثيلٌ INSERT");
 eq(o.blocksOut,1,"مثيلٌ واحدٌ صُدِّر");
 eq(o.blockDefsOut,1,"وتعريفٌ واحد");
 /* الاسمُ مُطهَّرٌ للصيغة */
 ok(txt.includes("tbl1"),"والاسمُ مكتوب");
 /* والموضعُ والدورانُ والمقياسُ على المثيل */
 const ins=/\n\s*0\r?\n\s*INSERT[\s\S]{0,300}/.exec(txt)[0];
 ok(/\n\s*10\r?\n\s*3000/.test(ins),"الموضعُ س");
 ok(/\n\s*20\r?\n\s*2000/.test(ins),"والموضعُ ص");
 ok(/\n\s*50\r?\n\s*45\./.test(ins),"والدورانُ ٤٥ درجةً لا راديان");
 ok(/\n\s*41\r?\n\s*2\./.test(ins),"ومقياسُ س");
 ok(/\n\s*42\r?\n\s*2\./.test(ins),"ومقياسُ ص");
 ok(/\n\s*8\r?\n\s*A-BLKS/.test(ins),"والطبقةُ من المثيل");
 /* ولا رسمٌ مزدوج: الأوّليةُ المفكَّكةُ استُبعِدت */
 ok(!txt.includes("3500.0"),
  "والأوّليةُ المفكَّكةُ لم تُكتَب — لا رسمٌ مرّتَين");
 /* وما ليس من كتلةٍ باقٍ */
 ok(/\n\s*0\r?\n\s*LINE/.test(txt),"وجدارُ المشهد باقٍ");
});

group("DXF — المرآةُ مقياسٌ سالبٌ على س",()=>{
 reset(); mkBlock();
 S.blocks=[BLK.makeInstance("tbl1",{x:0,y:0,mirror:true})];
 const o={blocks:{defs:BLK.toJSON().defs,insts:S.blocks}};
 const txt=DX.toDXF([],{x0:0,y0:0,x1:1000,y1:1000},o);
 const ins=/\n\s*0\r?\n\s*INSERT[\s\S]{0,300}/.exec(txt)[0];
 ok(/\n\s*41\r?\n\s*-1/.test(ins),
  "المرآةُ 41 = -1 — DXF لا تعرف mirror على INSERT");
 ok(/\n\s*42\r?\n\s*1\./.test(ins),"وص موجبٌ كما هو");
});

group("DXF — تعريفٌ مفقودٌ يبقى مفكَّكاً لا يغيب",()=>{
 reset();
 /* مثيلٌ لتعريفٍ غير موجود: لا INSERT له، والأوّليةُ المفكَّكةُ تبقى */
 const ghost={id:"bZ",block:"لا-يوجد",x:0,y:0,rot:0,
  scale:1,scaleX:1,scaleY:1,mirror:false,layer:"A-BLKS"};
 S.blocks=[ghost];
 const prims=[{t:"line",L:"A-BLKS",a:[10,10],b:[990,10],bid:"bZ"}];
 const o={blocks:{defs:BLK.toJSON().defs,insts:S.blocks}};
 const txt=DX.toDXF(prims,{x0:0,y0:0,x1:1000,y1:1000},o);
 eq(o.blocksOut,0,"لا مثيلَ صُدِّر");
 ok(!txt.includes("INSERT"),"ولا INSERT");
 ok(txt.includes("990.0"),
  "والأوّليةُ المفكَّكةُ كُتبت — فلا يغيب شيءٌ من الملفّ");
});

group("DXF — ملفٌّ بلا كتلٍ لم يتغيّر حرفاً",()=>{
 reset();
 const prims=[{t:"line",L:"A-WALL",a:[0,0],b:[1000,0]}];
 const a=DX.toDXF(prims,{x0:0,y0:0,x1:1000,y1:1000},{});
 const b=DX.toDXF(prims,{x0:0,y0:0,x1:1000,y1:1000},
  {blocks:{defs:[],insts:[]}});
 eq(a,b,"لا قسمَ BLOCKS يُكتَب بلا كتلٍ مستعملة");
 ok(!a.includes("BLOCKS"),"ولا ذِكرَ له");
});

group("القياس — «ثبّت» يحوّله أبعاداً محاذية",()=>{
 reset();
 const d=R.findTool("measure");
 ok(!!d,"الأداةُ موجودة");
 const k=(d.opts||[]).find(o=>o.k==="keep");
 ok(!!k,"وخيارُ «ثبّت» معلَن");
 eq(k.def,0,"ومُطفأٌ افتراضاً — القياسُ سؤالٌ لا تأشير");
 ok((d.opts||[]).some(o=>o.k==="off"),"وإزاحةُ البُعد خيارٌ كذلك");
 /* والهندسةُ نفسُها: pos إزاحةٌ على عمود الضلع */
 const dm=D.addDim("al",[0,0],[3000,4000],500);
 eq(D.dimValue(dm),5000,"والقيمةُ طولُ الضلع لا مسقطُه");
 const g=D.dimGeom(dm);
 const dx=g.p2[0]-g.p1[0], dy=g.p2[1]-g.p1[1];
 eq(Math.round(Math.hypot(dx,dy)),5000,"وخطُّ البُعد موازٍ بطوله");
 /* والإزاحةُ عموديةٌ فعلاً: المسافةُ من الضلع = pos */
 const dist=G.distSeg([0,0],[3000,4000],g.p1[0],g.p1[1]);
 eq(Math.round(dist),500,"والبعدُ عن الخطّ المقيس هو الإزاحة");
});

group("أدواتُ الأوراق — لكلٍّ تلميحٌ ولقب",()=>{
 ["vport","addsheet","renamesheet","delsheet",
  "nextsheet","prevsheet"].forEach(id=>{
  const d=R.findTool(id);
  ok(!!d,`${id} مسجَّلة`);
  if(!d)return;
  ok(!!d.hint&&d.hint.length>10,`${id}: تلميحٌ ذو معنى`);
  ok(!!d.alias,`${id}: ولها لقب`);
  String(d.alias).split(/\s+/).filter(Boolean).forEach(a=>
   ok(R.findTool(a)===d,`${id}: اللقب «${a}» يُحَلّ إليها`));
 });
 /* ولا أداةَ في السجلّ كلِّه بلا تلميحٍ أو لقبٍ بعد اليوم */
 const bad=R.toolList().filter(d=>!d.hint||!d.alias).map(d=>d.id);
 eq(bad.join(" "),"","ولا أداةَ ناقصةَ العقد في السجلّ كلِّه");
});

group("الأداء — تشخيصُ التقرير كان خاطئاً، وهذا القياس",()=>{
 /* التقريرُ (audit/09 §٤٫١) قال إنّ render.js لا يستعمل الفهرسَ
    المكانيَّ فمن هنا بطؤه. والقياسُ كذّبه:
      · زمنُ `scene()` كلُّه تقريباً في `bodies()` (اتحادُ الجدران).
      · و`polyBool` **مُفهرسٌ مكانياً أصلاً**: شبكتانِ للمضلّعات
        وللقطع (gridOf/queryFn/cellFor) — لا حلقةٌ تربيعية.
      · والتحجيمُ خطّيٌّ لا تربيعيّ: 1k=102 م.ث · 5k=354 · 10k=664.
    فالـ700 م.ث كلفةُ اتحادٍ منطقيٍّ لأربعين ألفَ قطعةٍ لا عيبُ فهرسة،
    و«أضِف سطرَ استيراد» لم يكن ليصلح شيئاً.
    وهذا الحارسُ يمنع عودةَ التشخيص الخاطئ: يُلزِم بقاءَ الفهرسة في
    polyBool، فمن يحذفها يُسقِط البناءَ بدل أن يُبطئ صامتاً. */
 ok(/gridOf\(pBox/.test(GEOM),
  "polyBool يُفهرس المضلّعات مكانياً");
 ok(/gridOf\(sBox/.test(GEOM),"ويُفهرس القطعَ كذلك");
 ok(/queryFn\(SG,ns\)/.test(GEOM),"ويسأل الفهرسَ لا الكلَّ");
 ok(/const n2=qSeg\(/.test(GEOM),
  "وحلقةُ التقسيم تقرأ مرشَّحي الفهرس");
 ok(/full\?ns:cand\.length/.test(GEOM),
  "والمسحُ الكاملُ مسارُ رجوعٍ مُعلَنٌ لا الافتراض");
 /* والفهرسُ المكانيُّ العامُّ مستعملٌ حيث يُجدي */
 ["js/core/ents.js","js/core/osnap.js","js/core/inspect.js"]
  .forEach(f=>ok(SRC[f]&&/sindex\.js/.test(SRC[f]),
   `${f} يستورد الفهرس`));
});

/* ═══ قواعدُ الدرج في الفاحص ═══ P-تحسين
   الفاحصُ كان يغطّي الأبوابَ والشبابيكَ والمناطقَ وارتفاعَ الدور، ولا
   سطرَ عن الدرج — وهو أكثرُ ما يُخالَف في السكنيّ وأخطرُه.
   وتصحيحٌ للتقرير: «أدنى مساحةِ غرفةٍ وعرضُ الممرِّ والتهوية» كانت
   مُنفَّذةً سلفاً، فذِكرُها في §٤٫٧ كان خطأً في القراءة. */
await groupAsync("كودُ البناء — الدرج",async()=>{
 const SS=await import("../core/stairs.js");
 const C =await import("../core/code.js");
 const codes=f=>f.filter(x=>/^c-(rise|run|blon|stw|flight)$/.test(x.code));

 /* ١ — درجٌ سليمٌ لا يُبلَّغ عنه: ارتفاع 3000 و18 قائمةً ⇒ نهوض 166.7،
       وطول 4760 على 17 نائمةً ⇒ 280. وبلونديل 2×167+280 = 614. */
 reset();
 const good=SS.addStair([0,0],[4760,0],1000,18);
 const g0=SS.stGeoms(good)[0];
 eq(Math.round(g0.rise),167,"النهوضُ 167 مم");
 eq(Math.round(g0.tread),280,"والنائمةُ 280 مم");
 eq(codes(C.codeCheck()).length,0,"ودرجٌ سليمٌ لا مخالفةَ له");

 /* ٢ — درجٌ مخالفٌ في كلِّ شيء: 10 قوائمَ لارتفاع 3000 ⇒ نهوض 300،
       وطول 1500 على 9 ⇒ نائمة 167، وعرض 700. */
 reset();
 SS.addStair([0,0],[1500,0],700,10);
 const F=codes(C.codeCheck());
 const by=c=>F.find(x=>x.code===c);
 ok(!!by("c-rise"),"النهوضُ المفرطُ يُبلَّغ");
 eq(by("c-rise").sev,"er","وبدرجة «خطأ» — خطرُ تعثّر لا تنبيه");
 ok(/زِد عددَ القوائم/.test(by("c-rise").msg),
  "والرسالةُ تقول ما يُفعَل لا أنّ ثمّة خطأً");
 ok(!!by("c-run"),"والنائمةُ القصيرةُ تُبلَّغ");
 eq(by("c-run").sev,"er","وبدرجة «خطأ» كذلك");
 ok(/لا تكفي القدم/.test(by("c-run").msg),"بسببٍ مفهوم");
 ok(!!by("c-stw"),"والعرضُ الناقصُ يُبلَّغ");
 ok(!!by("c-blon"),"وبلونديل");
 eq(by("c-blon").sev,"in","وبدرجة «معلومة» — قانونيٌّ لكنّه غيرُ مريح");
 /* وكلُّها تحمل موضعاً ومعرّفاً فالفاحصُ يقفز إليها */
 F.forEach(x=>{
  eq(x.k,"stair",`${x.code}: النوعُ stair فيُقفَز إليه`);
  ok(!!x.id,`${x.code}: ومعرّفُ الدرج`);
  ok(Array.isArray(x.p)&&x.p.length===2,`${x.code}: وموضعٌ على القماش`);
 });

 /* ٣ — رحلةٌ طويلةٌ بلا بسطة */
 reset();
 SS.addStair([0,0],[6000,0],1000,22);
 ok(codes(C.codeCheck()).some(x=>x.code==="c-flight"),
  "٢٢ قائمةً في رحلةٍ واحدةٍ تُبلَّغ — الأقصى 18 قبل بسطة");

 /* ٤ — المفتاحُ العامُّ يُسكِت الدرجَ كما يُسكِت غيرَه */
 reset();
 SS.addStair([0,0],[1500,0],700,10);
 ok(codes(C.codeCheck()).length>0,"مخالفاتٌ قائمةٌ قبل الإطفاء");
 const was=C.CODE.on;
 C.setCodeOn(0);
 eq(C.codeCheck().length,0,"والإطفاءُ يُسكِت الفاحصَ كلَّه");
 C.setCodeOn(was);

 /* ٥ — الحدودُ قابلةٌ للتعديل كغيرها، وبالسنتيمتر لا المتر */
 ["riseMin","riseMax","runMin","blonMin","blonMax","stairW","flightMax"]
  .forEach(k=>{
   const d=C.CODE_FIELDS.find(x=>x.k===k);
   ok(!!d,`${k}: حقلٌ قابلٌ للتعديل`);
   ok(!!d.n&&/[\u0600-\u06FF]/.test(d.n),`${k}: باسمٍ عربيّ`);
   ok(d.min<d.max,`${k}: ومدًى صالح`);
  });
 const r=C.CODE_FIELDS.find(x=>x.k==="riseMin");
 eq(r.u,"سم","النهوضُ بالسنتيمتر — 17 سم تُقرأ و0.17 م لا");
 /* ورفضُ القيمة المستحيلة كما لغيرها */
 /* العقدُ {ok,msg} لا {err} */
 const bad=C.setCodeVal("riseMax",99);
 eq(bad.ok,false,"نهوضُ 99 سم مرفوض");
 ok(/خارج المدى/.test(bad.msg),`بسببٍ مقروء: ${bad.msg}`);
 eq(C.CODE.riseMax,190,"ولم تُكتَب القيمةُ المرفوضة");
});

process.exit(summary()?1:0);
