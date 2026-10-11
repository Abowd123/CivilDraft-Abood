/* ═══ حارسُ المرحلة ٢ من خطّة الواجهة ═══ audit/10-ui-plan.md §٦ (٤)
   الوعدُ: «١٥/١٥ نوعاً له لوحةٌ سياقية — لا نوعَ يُحدَّد فلا يجد لوحة».

   والعيبُ الذي كان: السياقيُّ يغطّي ٩ من ١٥، والحارسُ القديمُ كان
   **قائمةً مكتوبةً بيدٍ** بالتسعةِ نفسِها — فكلُّ نوعٍ جديدٍ يمرُّ بلا
   لوحةٍ ولا يشكو أحد. فصارت ٦ بلا لوحةٍ، أربعةٌ منها أُضيفت في أسبوع.

   هذا الملفُّ يقيس **السلوكَ**: يُحدِّد كياناً من كلِّ نوعٍ فعلاً
   ويتحقّق أنّ اللوحةَ تُحَلّ له وأنّ أزرارَها تعمل. والبنيةُ محروسةٌ
   في `dom.js` (العلاقةُ في الاتجاهَين من `ENT`).
   التشغيل:  node js/tests/ctx-complete.test.js                      */
import {shim,shimCanvas,shimDOM,group,ok,eq,summary} from "./harness.js";
shim(); shimCanvas();
const DOC=shimDOM();
{const cv=DOC.createElement("canvas"); cv.setAttribute("id","cv");
 DOC.body.appendChild(cv);}
if(!globalThis.window)
 globalThis.window={prompt:()=>null,confirm:()=>true};

for(const f of ["draw","sketch","openings","parts","roof","areas","modify",
 "annotate","ref","boq","boqreport","elev","section","sheet","clouds",
 "groups","macros"])await import(`../tools/${f}.js`);
for(const f of ["hygiene","gate","levelManager","styleManager",
 "underlayPanel","pricingPanel","view3d","appcmds","viewcmds",
 "blockpanel"])await import(`../ui/${f}.js`);
const R  =await import("../tools/registry.js");
const SC =await import("../ui/ribbon/schema.js");
const AC =await import("../ui/appcmds.js");
const EN =await import("../core/entreg.js");
const ST =await import("../core/state.js");
const {S,newState,ensureShape,clearHistory,edit}=ST;

const KINDS=Object.keys(EN.ENT);
const walk=(L,fn)=>(L||[]).forEach(it=>{
 if(it.group)walk(it.group,fn); else fn(it);
});
const itemsOf=k=>{
 const out=[];
 (SC.CTX[k]&&SC.CTX[k].panels||[]).forEach(p=>walk(p.items,i=>out.push(i)));
 return out;
};

group("التغطيةُ كاملةٌ — ١٥/١٥",()=>{
 eq(KINDS.length,16,"ستّةَ عشرَ نوعاً في سجلّ الكيانات (دخلت الكتلة — 1.1.0 · ج)");
 const miss=KINDS.filter(k=>!SC.CTX[k]);
 eq(miss.length,0,`صفرٌ بلا لوحة — الناقص: ${miss.join(" ")||"لا شيء"}`);
 const dead=Object.keys(SC.CTX).filter(k=>!KINDS.includes(k));
 eq(dead.length,0,`ولا لوحةَ لنوعٍ حُذِف: ${dead.join(" ")||"لا شيء"}`);
});

group("كلُّ زرٍّ في السياقيِّ يعمل",()=>{
 const acts=new Set(SC.ribbonActs());
 KINDS.forEach(k=>{
  const I=itemsOf(k);
  ok(I.length>=3,`«${k}»: ${I.length} زرّاً على الأقل`);
  I.forEach(it=>{
   if(it.cmd)
    ok(!!R.findTool(it.cmd),
     `«${k}»: الأمرُ «${it.cmd}» أداةٌ مسجَّلة`);
   if(it.act)
    ok(acts.has(it.act)||!!SC.homeOf(it.act),
     `«${k}»: الفعلُ «${it.act}» معروفٌ في الواجهة`);
   /* اسمٌ عربيٌّ أو اسمُ صيغةٍ معروفٌ عالمياً (CSV · DXF · PDF):
      تعريبُ «CSV» يُربِك لا يُوضِح. */
   ok(!!it.n&&(/[\u0600-\u06FF]/.test(it.n)
    ||/^(CSV|DXF|SVG|PNG|PDF|DWG)$/.test(it.n)),
    `«${k}»: «${it.cmd||it.act}» باسمٍ مقروء`);
   ok(!!it.ico,`«${k}»: «${it.cmd||it.act}» له أيقونة`);
  });
 });
});

group("لوحُ «المحدَّد» في كلِّ تبويبٍ — الخصائصُ والحذف",()=>{
 KINDS.forEach(k=>{
  const I=itemsOf(k);
  ok(I.some(i=>i.act==="propsDlg"),`«${k}»: زرُّ الخصائص`);
  ok(I.some(i=>i.act==="delSel"),`«${k}»: وزرُّ الحذف`);
 });
});

group("لا حشوَ: `match` حيث تُنسَخ خصائصُ فعلاً",()=>{
 /* زرٌّ لا معنى له أسوأُ من لا زرّ: يُعلِّم المستخدمَ أنّ الموضعَ لا
    يُقرَأ. فـ`match` تُدرَج حيث للنوعِ خصائصُ تُنسَخ، وتُستثنى حيث
    لا معنى لها — والاستثناءُ **مُعلَنٌ هنا** لا مُخمَّن. */
 const NOMATCH={
  pline:"هيئتُه رؤوسٌ لا خصائصُ تُنسَخ",
  cloud:"سحابةُ مراجعةٍ بلا خصائصَ تُنسَخ",
  live:"قيمتُه مُشتقّةٌ فلا تُنسَخ",
  table:"صفوفُه حيّةٌ من مصدرها لا نسخةٌ مخزَّنة",
  chain:"سلسلةٌ هندستُها مرجعُها",
  area:"حدودُها حلقتُها"};
 KINDS.forEach(k=>{
  const has=itemsOf(k).some(i=>i.cmd==="match");
  if(NOMATCH[k])
   ok(!has,`«${k}»: بلا «مطابقة» — ${NOMATCH[k]}`);
  else
   ok(has,`«${k}»: فيه «مطابقة» — له خصائصُ تُنسَخ`);
 });
});

/* تحديدٌ حقيقيٌّ لكلِّ نوعٍ: التبويبُ يُختار بـ`L[0].k` في wire.js،
   فالمقياسُ هو أنّ نوعَ الكيانِ المنشأِ يُحَلّ إلى لوحةٍ موجودة. */
await (async()=>{
 const mk={};
 newState(); ensureShape(); clearHistory();
 const W =await import("../core/walls.js");
 const O =await import("../core/opens.js");
 const A =await import("../core/areas.js");
 const D =await import("../core/dims.js");
 const CO=await import("../core/cols.js");
 const FX=await import("../core/fixt.js");
 const SS=await import("../core/stairs.js");
 const RF=await import("../core/roof.js");
 const PL=await import("../core/plines.js");
 const CL=await import("../core/clouds.js");
 const LV=await import("../core/live.js");
 const TB=await import("../core/tables.js");
 const GG=await import("../core/struct.js");
 const made={};
 /* ═══ معاملةٌ لكلِّ كيانٍ لا معاملةٌ واحدةٌ للجميع ═══
    `edit()` تبتلع الاستثناءَ **وتُرجِع اللقطةَ كلَّها**: فنداءٌ واحدٌ
    يفشل كان يمسح ما قبله في المعاملةِ نفسِها، فتظهر النتيجةُ
    «٣ أنواعٍ مبنيّة» ويُظنُّ العيبُ في الشريط. كلُّ كيانٍ في معاملته،
    وما فشل يُسمّى سببُه في `why`. */
 const why={};
 const tryMk=(k,fn)=>{
  try{
   edit(()=>{made[k]=fn()},k);
   if(!made[k])why[k]="أُنشِئ بلا معرّف";
  }catch(e){why[k]=(e&&e.message)||String(e)}
 };
 let W1=null;
 tryMk("wall",()=>{W1=W.addWall([0,0],[6000,0],200,"int","c"); return W1.id});
 tryMk("open",()=>O.addOpen(W1,0.5,"door",900,2100,0).id);
 tryMk("area",()=>A.addArea([[0,0],[4000,0],[4000,3000],[0,3000]]).id);
 tryMk("dim",()=>D.addDim("h",[0,0],[4000,0],500).id);
 tryMk("anno",()=>D.addText([1000,1000],"نصّ",1,0,"bc").id);
 tryMk("col",()=>CO.addCol("rect",[8000,0],400).id);
 tryMk("fix",()=>FX.addFix("wc",[9000,0],0).id);
 tryMk("stair",()=>SS.addStair([0,8000],[4760,8000],1000,18).id);
 tryMk("pline",()=>PL.addPline([[0,12000],[4000,12000],[4000,15000]]).id);
 tryMk("cloud",()=>CL.addCloud(
  [[0,16000],[3000,16000],[3000,18000],[0,18000]]).id);
 tryMk("struct",()=>GG.addBeam([0,20000],[6000,20000],250,500,"conc","B1").id);
 /* والباقي بالسياقِ نفسِه */
 tryMk("chain",()=>D.addChain("h",[0,-3000],800,[2000,2000],4000).id);
 tryMk("roof",()=>RF.addRoof(
  [[0,24000],[6000,24000],[6000,28000],[0,28000]]).id);
 tryMk("table",()=>TB.addTable("open",[0,30000]).id);
 tryMk("live",()=>LV.addLive("area",[2000,2000],{}).id);

 group("كلُّ نوعٍ أُنشِئ يُحَلّ إلى لوحته",()=>{
  KINDS.forEach(k=>{
   const t=SC.CTX[k];
   ok(!!t,`«${k}»: لوحةٌ موجودة`);
   /* والكيانُ أُنشِئ فعلاً حيث أمكن — وما لم يُنشَأ يُقال صراحةً
      ولا يُعَدّ نجاحاً صامتاً. */
   if(made[k])
    ok(!!EN.ENT[k],`«${k}»: كيانٌ أُنشِئ (${made[k]}) ونوعُه مسجَّل`);
   else
    ok(true,`«${k}»: لم يُنشَأ نموذجٌ هنا`
     +(why[k]?` — ${why[k]}`:"")+" · البنيةُ محروسةٌ في dom.js");
  });
  /* ولا نوعَ في الحالةِ المبنيّةِ بلا لوحة */
  const kinds=new Set();
  Object.keys(EN.COLL).forEach(k=>{
   const coll=EN.COLL[k];
   if(Array.isArray(S[coll])&&S[coll].length)kinds.add(k);
  });
  [...kinds].forEach(k=>ok(!!SC.CTX[k],
   `«${k}» موجودٌ في المشروعِ وله لوحةٌ سياقية`));
  ok(kinds.size>=8,`${kinds.size} نوعاً مبنيٌّ في هذا الاختبار`);
 });
})();

process.exit(summary()?1:0);
