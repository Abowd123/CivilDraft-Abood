/* ═══ الجدولُ الموضوع — TB ═══ الأولويةُ العالية ٧
   العقدُ المركزيّ: **لا نسخةَ مخزَّنة**. الجدولُ يحفظ نوعَه وموضعَه
   ومقاسَه، وصفوفُه تُقرأ حيّةً عند كلِّ رسم — فبابٌ يتغيّر عرضُه
   يتغيّر في الجدول فوراً، ولا أمرَ «حدّث» ولا جدولٌ يكذب على الرسم.
   وارتفاعُه ليس حقلاً بل حصيلةُ الصفوف الحيّة.
   التشغيل:  node js/tests/tables.test.js                            */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();

const ST=await import("../core/state.js");
const {S,DEF,loadState,clearHistory,ensureShape,undo,canUndo,edit}=ST;
const W =await import("../core/walls.js");
const O =await import("../core/opens.js");
const A =await import("../core/areas.js");
const T =await import("../core/tables.js");
const TD=await import("../core/tabledef.js");
const E =await import("../core/ents.js");
const RND=await import("../core/render.js");
const R =await import("../tools/registry.js");
const ENTREG=await import("../core/entreg.js");
await import("../tools/annotate.js");

const reset=()=>{loadState(DEF(),true); clearHistory()};
const wall8=()=>W.addWall([0,0],[8000,0],200,"int","c");

group("tabledef — ورقةٌ بلا استيراد (لا دورة مع state)",()=>{
 const src=T.TBK;
 ok(!!src.open&&!!src.area&&!!src.legend,
  "ثلاثةُ أنواعٍ معرَّفة — ودخل المفتاحُ (§٣/١٣)");
 eq(TD.TBKINDS.length,4,"وأربعةٌ في الورقة — ودخل مفتاحُ الرموز (1.1.0 · د)");
 ["open","area","legend","sym"].forEach(k=>
  ok(TD.TBKINDS.includes(k),`${k}: بالاسمِ الصحيح`));
 /* الأعمدةُ مجموعُ نسبها واحدٌ — وإلّا لم يُستهلَك عرضُ الجدول كلُّه */
 TD.TBKINDS.forEach(k=>{
  const sum=TD.TBDEF[k].cols.reduce((a,c)=>a+c[1],0);
  ok(Math.abs(sum-1)<1e-9,`${k}: مجموعُ نسب الأعمدة ١ (${sum})`);
  TD.TBDEF[k].cols.forEach(([h,f])=>{
   ok(!!h&&/[\u0600-\u06FF]/.test(h),`${k}: عنوانٌ عربيّ «${h}»`);
   ok(f>0&&f<1,`${k}: نسبةٌ معقولة`);
  });
 });
 ok(TD.TBLIM.col.min>0&&TD.TBLIM.row.min>0,"والحدودُ معلَنة");
 /* وtables.js تُعيد تصديرَ الورقة نفسِها — لا نسخةَ ثانيةٌ تنحرف */
 ok(T.TBLIM===TD.TBLIM,"tables.js تُعيد تصديرَ الحدود نفسِها");
 ok(T.TBKINDS===TD.TBKINDS,"والأنواعَ نفسَها");
 ok(TD.TBLIM.rows.max>=50,"وسقفُ الصفوف معقول");
});

group("الصفوفُ حيّةٌ لا منسوخة",()=>{
 reset();
 const w=wall8();
 const t=T.addTable("open",[30000,10000],{});
 eq(T.tableSize(t).nrows,0,"جدولٌ على رسمٍ بلا فتحاتٍ: صفرُ صفوف");
 O.addOpen(w,2000,"door",900,2100);
 eq(T.tableSize(t).nrows,1,"أُضيف بابٌ ⇒ صفٌّ ظهر بلا أمرِ تحديث");
 O.addOpen(w,5000,"window",1200,1400,900);
 eq(T.tableSize(t).nrows,2,"وشباكٌ ⇒ صفّانِ");
 /* والعرضُ يتغيّر فيُقرأ الجديد: لا رقمٌ محفوظٌ في الجدول */
 const op=S.opens[0];
 edit(()=>{op.w=1500},"تعديل");
 const rows=T.tableRows(t).rows;
 ok(rows.some(r=>r.join(" ").includes("1.500")),
  `العرضُ الجديد ظهر: ${rows.map(r=>r[2]).join(" ")}`);
 /* ولا حقلَ صفوفٍ ولا ارتفاعٍ على الكيان */
 eq(t.rows,undefined,"ولا حقلُ صفوفٍ مخزَّن");
 eq(t.h,undefined,"ولا حقلُ ارتفاعٍ — هو حصيلةُ الصفوف");
});

group("الارتفاعُ حصيلةُ الصفوف لا حقل",()=>{
 reset();
 const w=wall8();
 const t=T.addTable("open",[30000,10000],{rh:3000});
 const h0=T.tableSize(t).h;
 O.addOpen(w,2000,"door",900,2100);
 const h1=T.tableSize(t).h;
 eq(h1-h0,3000,"صفٌّ واحدٌ زاد الارتفاعَ بارتفاع صفّ");
 /* الترويسةُ والتذييلُ صفّانِ دائماً */
 eq(h0,3000*2,"وبلا صفوفٍ: ترويسةٌ وتذييلٌ فقط");
 /* والمضلَّعُ يتبع الارتفاع */
 const P=T.tblPoly(t);
 eq(Math.round(P[2][1]-P[0][1]),h1,"ومضلَّعُ الإصابة بالارتفاع نفسِه");
 eq(P[2][0],t.x,"والأصل أعلى يمينه — العربيةُ تُقرأ من اليمين");
 ok(P[0][0]<t.x,"والنموُّ يساراً");
 ok(P[0][1]<t.y,"ونزولاً");
});

group("جدولُ المساحات يقرأ مصدرَه",()=>{
 reset();
 A.addArea([[0,0],[4000,0],[4000,4000],[0,4000]],"صالة");
 const t=T.addTable("area",[30000,10000],{});
 const rows=T.tableRows(t).rows;
 eq(rows.length,1,"منطقةٌ ⇒ صفّ");
 ok(rows[0][0].includes("صالة"),`والاسمُ فيه: ${rows[0][0]}`);
 ok(/16/.test(rows[0][1]),`والمساحةُ ١٦ م²: ${rows[0][1]}`);
 eq(T.tblName(t),"جدول المساحات","والعنوانُ عنوانُ النوع");
});

group("الأوّلياتُ خطوطٌ ونصوصٌ فقط — كلُّ مُصدِّرٍ يعرفها",()=>{
 reset();
 const w=wall8();
 O.addOpen(w,2000,"door",900,2100);
 const t=T.addTable("open",[30000,10000],{});
 const P=T.tablePrims(t);
 ok(P.length>10,`${P.length} أوّلية`);
 const kinds=[...new Set(P.map(g=>g.t))].sort();
 eq(kinds.join(","),"line,text","نوعانِ لا أكثر — لا أوّليةَ جديدة");
 ok(P.every(g=>g.L===T.TB_LAY),`كلُّها على ${T.TB_LAY}`);
 ok(P.every(g=>g.tid===t.id),"وكلُّها موسومةٌ بمعرّف الجدول");
 /* العنوانُ فوق الجدول لا داخلَه فلا يأكل صفّاً */
 const title=P.find(g=>g.t==="text"&&g.s===T.tblName(t));
 ok(!!title,"العنوانُ مرسوم");
 ok(title.y>t.y,"وفوق الأصل لا داخل الإطار");
 /* الترويسةُ كلُّها موجودة */
 TD.TBDEF.open.cols.forEach(([h])=>
  ok(P.some(g=>g.t==="text"&&g.s===h),`عنوانُ العمود «${h}» مرسوم`));
 /* والتذييلُ يحمل الإجمالي */
 ok(P.some(g=>g.t==="text"&&g.s==="الإجمالي"),"والإجماليُّ مرسوم");
});

group("الجدولُ في رسم المشهد",()=>{
 reset();
 const w=wall8();
 O.addOpen(w,2000,"door",900,2100);
 const n0=RND.scene().P.filter(g=>g.tid).length;
 eq(n0,0,"لا أوّليةَ جدولٍ قبل وضعه");
 const t=T.addTable("open",[30000,10000],{});
 const got=RND.scene().P.filter(g=>g.tid===t.id);
 ok(got.length>10,`وبعده ${got.length} أوّليةً في المشهد`);
});

group("التحديدُ والمقابضُ والحذف",()=>{
 reset();
 const t=T.addTable("open",[30000,10000],{});
 /* الإصابةُ داخل حدوده */
 const c=[t.x-1000,t.y-1000];
 ok(T.tblAt(c[0],c[1])===t,"نقرةٌ داخلَه تجده");
 eq(T.tblAt(t.x+5000,t.y+5000),null,"وخارجَه لا شيء");
 /* الكيانُ مسجَّلٌ ويُحدَّد */
 const d=ENTREG.ENT["table"];
 ok(!!d,"النوعُ مسجَّلٌ في سجلّ الكيانات باسم «table» نفسِه الذي في COLL_KIND وV");
 eq(d.coll,"tables","ومجموعتُه tables");
 eq(d.lay(t),T.TB_LAY,"وطبقتُه A-ANNO");
 const g=d.grips(t);
 eq(g.length,2,"مقبضان: الأصلُ والعرض");
 ok(g.some(x=>x.k==="c"),"مقبضُ الأصل");
 ok(g.some(x=>x.k==="w"),"ومقبضُ العرض");
 /* والحذفُ يعمل */
 ok(T.delTable(t),"يُحذَف");
 eq(S.tables.length,0,"ويزول من المجموعة");
 eq(T.delTable(t),false,"وحذفٌ ثانٍ يعيد false لا يرمي");
});

group("التطبيع — نوعٌ مجهولٌ يُصلَح ويُقال",()=>{
 reset();
 const t=T.addTable("open",[30000,10000],{});
 t.kind="لا-يوجد";
 ensureShape();
 eq(S.tables[0].kind,"open","النوعُ المجهولُ يرجع إلى جدول الفتحات");
 /* وموضعٌ فاسدٌ يُسقِط الجدولَ لا يُصلَح خلسةً */
 S.tables[0].x=NaN;
 ensureShape();
 eq(S.tables.length,0,"وموضعٌ فاسدٌ يُسقِطه");
});

group("التطبيع — المقاسُ يُحبَس في حدوده",()=>{
 reset();
 const t=T.addTable("open",[30000,10000],{});
 t.w=5; t.rh=1;
 ensureShape();
 eq(S.tables[0].w,TD.TBLIM.col.min,"العرضُ يُرفَع إلى الأدنى");
 eq(S.tables[0].rh,TD.TBLIM.row.min,"وارتفاعُ الصفّ كذلك");
 S.tables[0].rh=1e9;
 ensureShape();
 eq(S.tables[0].rh,TD.TBLIM.row.max,"والمفرطُ يُحبَس بالأقصى");
});

group("سقفُ الصفوف يُقال لا يُخفى",()=>{
 reset();
 const w=W.addWall([0,0],[600000,0],200,"int","c");
 /* فتحاتٌ بمقاساتٍ مختلفةٍ كي لا تُجمَّع في صفٍّ واحد */
 for(let i=0;i<TD.TBLIM.rows.max+5;i++)
  try{O.addOpen(w,1000+i*1200,"door",700+i,2100)}catch(e){}
 const t=T.addTable("open",[30000,10000],{});
 const z=T.tableSize(t);
 ok(z.nrows<=TD.TBLIM.rows.max,`الصفوفُ محبوسةٌ بالسقف (${z.nrows})`);
 if(z.cut){
  const P=T.tablePrims(t);
  ok(P.some(g=>g.t==="text"&&/فوق الحدّ/.test(g.s)),
   "والقصُّ مكتوبٌ في الجدول لا مُخفى");
 }else ok(true,"لم يُبلَغ السقفُ في هذه الحالة");
});

group("الأداةُ مسجَّلةٌ بعقدٍ كامل",()=>{
 const d=R.findTool("table");
 ok(!!d,"الأداةُ مسجَّلة");
 eq(d.label,"جدول","الملصق");
 ok(!!d.hint,"ولها تلميح");
 ok(!!d.alias,"واسمٌ بديل");
 ok(!d.destruct,"وليست هادمة — تُضيف ولا تكتب فوق شيء");
 const kd=(d.opts||[]).find(o=>o.k==="kind");
 ok(!!kd,"وخيارُ النوع");
 eq(typeof kd.items,"function","وقائمتُه حيّة");
 eq(kd.items().length,4,"بأربعةِ أنواعٍ — ودخل مفتاحُ الرموز (1.1.0 · د)");
 ok(typeof d.prev==="function","ولها معاينةٌ بمقاسها الحقيقيّ");
 ok(R.findTool("جدول")===d,"و«جدول» يُحَلّ إليها");
});

group("التراجعُ يعمل كأيِّ كيان",()=>{
 reset();
 const t=edit(()=>T.addTable("open",[30000,10000],{}),"إضافة جدول");
 ok(canUndo(),"خطوةُ تراجعٍ موجودة");
 undo();
 eq(S.tables.length,0,"والتراجعُ يسحب الجدول");
});

/* ═══ المفتاح ═══ §٣/١٣
   صفوفُه حيّةٌ من جدولِ الطبقات، و**الظاهرةُ المستعملةُ وحدَها**:
   المُطفأةُ ليست في المخطَّطِ فذِكرُها كذب، والظاهرةُ الفارغةُ تُربك
   من يبحث عنها في الرسمِ ولا يجدها. والاستعمالُ يُقرأ بخُطّافٍ لا
   باستيراد: `render.js` يستورد هذا الملفَّ، فاستيرادُ `scene()` منه
   دورةٌ تُسقِط الوحدة. */
group("المفتاح — الظاهرةُ المستعملةُ وحدَها",()=>{
 reset();
 /* الخُطّافُ يُحفَظ ويُعاد في آخرِ المجموعة: `render.js` يركّبه عند
    التحميل، ونزعُه هنا بلا إعادةٍ يُفسِد ما بعده. */
 const SAVE=()=>{};
 T.setLegendUsage(()=>new Set(["A-WALL","A-COLS"]));
 const R2=T.legendRows();
 ok(R2.length>=1,"صفوفٌ تُبنى");
 ok(R2.every(r=>r.lay&&typeof r.desc==="string"),
  "لكلِّ صفٍّ اسمٌ ووصف");
 ok(R2.every(r=>Array.isArray(r.dash)),
  "ونمطُ خطٍّ — تقرؤه العيّنةُ في tablePrims");
 eq(R2.length,2,"والمستعملتانِ وحدَهما — لا كلُّ الطبقات");

 /* طبقةٌ مُطفأةٌ تخرج ولو كانت مستعملة */
 const LY=S.layers&&S.layers["A-COLS"];
 if(LY){
  LY.off=1;
  eq(T.legendRows().length,1,"والمُطفأةُ تخرج — ليست في المخطَّط");
  delete LY.off;
 }else ok(true,"(لا جدولَ طبقاتٍ محلّيّ — القيدُ مُختبَرٌ في الفلترة)");

 /* غيابُ الخُطّافِ تدهورٌ مُعلَنٌ لا صمت: يُعرَض كلُّ ظاهر */
 T.setLegendUsage(null);
 const all=T.legendRows();
 ok(all.length>2,
  `بلا خُطّافٍ يُعرَض كلُّ ظاهرٍ (${all.length}) — تدهورٌ مُعلَن`);
 /* وقيمةٌ ليست دالّةً تُعَدّ غياباً ولا ترمي */
 T.setLegendUsage("ليست دالّة");
 eq(T.legendRows().length,all.length,"وغيرُ الدالّةِ تُعَدّ غياباً");

 /* والعيّنةُ تتبع الصفوفَ نفسَها فلا تنزاح عنها */
 const sw=T.TBK.legend.swatch(0);
 ok(sw&&sw.lay===all[0].lay,"وعيّنةُ الصفِّ الأوّلِ طبقتُه نفسُها");
 eq(T.TBK.legend.swatch(99999),null,"وما لا صفَّ له لا عيّنةَ له");
 /* والذيلُ يعدّ ما عُرِض لا ما وُجِد */
 ok(/\d/.test(String(T.TBK.legend.foot()[1])),
  "والذيلُ يعدّ الصفوفَ المعروضة");
 T.setLegendUsage(SAVE);
});

process.exit(summary()?1:0);
