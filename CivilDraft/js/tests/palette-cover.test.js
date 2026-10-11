/* ═══ حارسُ المرحلة ١ من خطّة الواجهة ═══ audit/10-ui-plan.md §٦
   الوعدُ: «البحثُ مُواطنٌ من الدرجةِ الأولى — يجد كلَّ أداةٍ ويُظهِر
   بيتَها». وخطّةٌ بلا حارسٍ تتآكل في ثلاثة أشهر، فهذا الحارسُ يُثبِّت
   الوعدَ عدداً لا رأياً:
     ١) لكلِّ أداةٍ بيتٌ معروفٌ — صفرٌ بلا بيت.
     ٢) لا مدخلٌ معلَنٌ ميّتٌ في `HOME_ELSEWHERE` و`TOOL_ACT`.
     ٣) الزرُّ الظاهرُ موجودٌ في index.html ويفتح اللوحة.
     ٤) «مؤخّراً» يتعلّم ويُحَدّ ويُنظِّف نفسَه.
     ٥) خطُّ أساسِ شكلِ الشريطِ مُثبَّتٌ — فالمرحلةُ ٤ تُقاس عليه.
   التشغيل:  node js/tests/palette-cover.test.js                     */
import {shim,shimCanvas,shimDOM,group,ok,eq,summary} from "./harness.js";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {join} from "node:path";
shim(); shimCanvas();
const DOC=shimDOM();
{const cv=DOC.createElement("canvas"); cv.setAttribute("id","cv");
 DOC.body.appendChild(cv);}
if(!globalThis.window)
 globalThis.window={prompt:()=>null,confirm:()=>true};

const ROOT=join(fileURLToPath(new URL(".",import.meta.url)),"..","..");
const src=f=>{try{return readFileSync(join(ROOT,f),"utf8")}catch(e){return ""}};

for(const f of ["draw","sketch","openings","parts","roof","areas","modify",
 "annotate","ref","boq","boqreport","elev","section","sheet","clouds",
 "groups","macros"])await import(`../tools/${f}.js`);
for(const f of ["hygiene","gate","levelManager","styleManager",
 "underlayPanel","pricingPanel","view3d","appcmds","viewcmds",
 "blockpanel"])await import(`../ui/${f}.js`);
const R =await import("../tools/registry.js");
const SC=await import("../ui/ribbon/schema.js");
const AC=await import("../ui/appcmds.js");
const RB=await import("../ui/recentbar.js");
const ST=await import("../ui/store.js");

const ids=[...new Set(R.toolList().filter(d=>d&&d.id).map(d=>d.id))];
const home=id=>SC.homeOfTool(id,AC.ACTOF);

group("لكلِّ أداةٍ بيتٌ معروف",()=>{
 ok(ids.length>=150,`${ids.length} أداةً مسجَّلة`);
 const no=ids.filter(i=>!home(i));
 eq(no.length,0,
  `صفرٌ بلا بيت — الباقي: ${no.slice(0,8).join(" ")||"لا شيء"}`);
 /* والمسارُ نصٌّ عربيٌّ مقروءٌ لا معرّفٌ تقنيّ */
 ids.forEach(i=>{
  const h=home(i);
  ok(h&&h.path&&/[\u0600-\u06FF]/.test(h.path),
   `${i}: مسارٌ عربيٌّ مقروء`);
 });
});

group("لا مدخلٌ معلَنٌ ميّت",()=>{
 /* الإعلانُ يتقادم: أداةٌ صار لها زرٌّ في الشريطِ يبقى إعلانُها
    يكذب. فكلُّ مفتاحٍ في الجدولَين يجب أن يكون أداةً حيّةً **وبلا**
    بيتٍ في الشريطِ نفسِه. */
 const S1=new Set(ids);
 Object.keys(SC.HOME_ELSEWHERE).forEach(k=>{
  ok(S1.has(k),`HOME_ELSEWHERE: «${k}» أداةٌ حيّة`);
  ok(!SC.homeOf(k)||SC.homeOf(k).via==="elsewhere",
   `HOME_ELSEWHERE: «${k}» ليس له زرٌّ في الشريطِ (وإلّا فالإعلانُ ميّت)`);
 });
 const acts=new Set(SC.ribbonActs());
 Object.keys(SC.TOOL_ACT).forEach(k=>{
  ok(S1.has(k),`TOOL_ACT: «${k}» أداةٌ حيّة`);
  ok(acts.has(SC.TOOL_ACT[k]),
   `TOOL_ACT: فعلُ «${k}» (${SC.TOOL_ACT[k]}) زرٌّ قائمٌ في الشريط`);
 });
 /* وACTOF يُبنى آلياً من `act()` فلا يتقادم — يُتحقَّق أنّه مبنيٌّ فعلاً */
 ok(Object.keys(AC.ACTOF).length>=10,
  `ACTOF مبنيٌّ آلياً من act() — ${Object.keys(AC.ACTOF).length} مدخلاً`);
 Object.keys(AC.ACTOF).forEach(k=>ok(acts.has(AC.ACTOF[k]),
  `ACTOF: فعلُ «${k}» زرٌّ قائم`));
});

group("البيتُ يُفرِّق بين الثابتِ والسياقيّ",()=>{
 /* السياقيُّ ليس بيتاً بل اختصارٌ لحظيٌّ لما هو محدَّد — وخلطُه
    بالبيتِ يُوهِم أنّ الأداةَ هناك دائماً. */
 const w=home("offset");
 ok(w&&!w.ctx,"«إزاحة» لها بيتٌ ثابتٌ لا سياقيٌّ فقط");
 ok(/◂/.test(w.path),"ومسارُها «تبويب ◂ لوح»");
 const h=SC.homeOf("wall");
 ok(h&&!h.ctx&&/◂/.test(h.path),"و«جدار» كذلك");
});

group("الزرُّ الظاهرُ موجودٌ ويفتح اللوحة",()=>{
 const H=src("index.html");
 ok(/id="srchBtn"/.test(H),"زرُّ البحثِ في الصفحة");
 ok(/id="recent"/.test(H),"وحاملُ «مؤخّراً»");
 ok(/hidden/.test(H.slice(H.indexOf('id="recent"'),
  H.indexOf('id="recent"')+200)),
  "و«مؤخّراً» مخفيٌّ ابتداءً — لا مساحةٌ تطلب انتباهاً بلا محتوى");
 const P=src("js/ui/palette.js");
 ok(/#srchBtn/.test(P)&&/paletteOpen\(\)/.test(P),
  "واللوحةُ تربطه بفتحها");
 /* والاختصارُ باقٍ: الزرُّ إضافةٌ لا استبدال */
 const K=src("js/ui/keymap.js");
 ok(/paletteToggle\(\)/.test(K),"واختصارُ Ctrl+K باقٍ");
 /* وفي CSS هدفٌ لمسيٌّ وخطٌّ مقروء (P5-001/P5-002) */
 const C=src("css/base.css");
 const blk=C.slice(C.indexOf("#srchBtn{"),C.indexOf("#srchBtn{")+400);
 ok(/min-height:44px/.test(blk),"وهدفُ اللمسِ ٤٤ بكسلاً");
 ok(/max\(16px/.test(blk),"والخطُّ ١٦ بكسلاً على الأقل");
});

group("اللوحةُ تُظهِر البيتَ والاختصارَ في كلِّ سطر",()=>{
 const P=src("js/ui/palette.js");
 ok(/homeOfTool/.test(P),"تستعمل خريطةَ البيوت");
 ok(/class="hm/.test(P),"وتكتب البيتَ في السطر");
 ok(/class="sc"/.test(P),"والاختصارَ");
 const C=src("css/palette.css");
 ok(/#palette \.it \.hm\{/.test(C),"وللبيتِ نمطٌ معرَّف");
 ok(/#palette \.it \.sc\{/.test(C),"وللاختصار");
});

group("«مؤخّراً» يتعلّم ويُحَدّ ويُنظِّف",()=>{
 eq(RB.RECENT_MAX,6,"ستٌّ لا أكثر — الثباتُ هو كلُّ قيمةِ الشريط");
 RB.clearRecent();
 eq(RB.recentList().length,0,"يبدأ فارغاً");
 ok(RB.noteUse("wall"),"يسجّل استعمالاً");
 eq(RB.recentList()[0],"wall","والأحدثُ أوّلاً");
 RB.noteUse("door");
 eq(RB.recentList()[0],"door","ثم الأحدثُ منه");
 eq(RB.recentList().length,2,"ولا تكرار");
 RB.noteUse("wall");
 eq(RB.recentList()[0],"wall","وإعادةُ استعمالٍ تُقدِّمه");
 eq(RB.recentList().length,2,"ولا تُضاف نسخةٌ ثانية");
 /* السقفُ محروس */
 ["rect","dim","text","move","copy","offset","measure"]
  .forEach(t=>RB.noteUse(t));
 eq(RB.recentList().length,RB.RECENT_MAX,"والسقفُ يُحترَم");
 /* معرّفٌ ميّتٌ لا يُسجَّل ولا يُعرَض */
 eq(RB.noteUse("أداةٌ_لا_وجودَ_لها"),false,"ومعرّفٌ ميّتٌ يُرفَض");
 /* والحالةُ تعبر الجلسات */
 ok(Array.isArray(ST.UIS.recent),"والحالةُ في تفضيلاتِ الواجهة");
 ok(ST.UIS.recent.length<=RB.RECENT_MAX,"محدودةً فيها أيضاً");
 /* وملفٌّ محرَّرٌ يدوياً لا يُعطِب الشريط */
 ST.UIS.recent=[{bad:1},"wall",null,"x".repeat(99)];
 ok(RB.recentList().every(v=>typeof v==="string"),
  "وقيَمٌ فاسدةٌ تُرشَّح لا تُعطِب");
 RB.clearRecent();
});

group("شكلُ الشريطِ بعد المرحلةِ ٤",()=>{
 const sh=SC.ribbonShape();
 eq(sh.tabs,7,"سبعةُ تبويبات: ستَّةٌ بالوظيفةِ وسابعٌ للإدارة");
 ok(sh.panels<=35,`وخمسةٌ وثلاثون لوحاً على الأكثر (${sh.panels})`);
 /* الخطُّ القديمُ كان ٢٤٢ عنصراً، ٣٣ منها نسخةٌ في «رئيسي».
    وحذفُ التكرارِ وحدَه أنزل العددَ دون أن تُفقَد أداةٌ واحدةٌ —
    وحارسُ `ui-reach` هو الذي يُثبِت أنّها لم تُفقَد. */
 ok(sh.total>=190&&sh.total<=215,`و${sh.total} عنصراً بلا تكرار`);
 /* و«ظاهرٌ مباشرةً» بلغ ١٠٠٪ لأنّ المخطَّطَ الجديدَ **بلا أعمدةٍ
    أصلاً**: ثلاثةُ مقاساتٍ كلُّها مرئيّة. والحارسُ هنا ليس هدفاً
    يُسعى إليه بل **منعاً للعودة**: أوّلُ `G()` يعود إلى الشريطِ
    الأساسيِّ يُسقِط البناء. */
 eq(sh.groups,0,"لا عمودَ مجموعةٍ في الشريطِ الأساسيّ");
 eq(sh.inGroup,0,"فلا عنصرَ داخلَ عمود");
 eq(sh.flatPct,100,`الظاهرُ مباشرةً ${sh.flatPct}٪ — والهدفُ كان ≥٧٠٪`);
 ok(sh.lib>=3,`وثلاثةُ ألواحِ مكتباتٍ على الأقلّ (${sh.lib})`);
});

process.exit(summary()?1:0);
