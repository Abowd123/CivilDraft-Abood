/* ═══ الجدول المركزي للأفعال "العابرة" (Cross-cutting actions) ═══
   يضمّ الأفعال التي لا تعتمد على حالةٍ محليةٍ مغلقة (closure) في
   wire.js — كل فعلٍ هنا وكالةٌ بحتة تنقر زرّاً قائماً في لوحته بعد
   كشفها (نفس نمط proxy() الأصلي)، أو استيراد كسول لا يمسّ الواجهة.

   ما لم يُنقَل إلى هنا عمداً: أفعال القشرة والسِّمة وأسطح العمل
   والإرساء وسطر الأوامر والخصائص السريعة وشريط الحالة (rbMin،
   clean، theme، shell، wsMenu/wsArch/wsAnnot/wsOut، dockAutoS/E،
   dockTabS/E، cmdMode/cmdFloat/cmdBottom، qpTog، rclick، st*).
   هذه كلّها تستدعي دوالّاً محليّة معرَّفة في wire.js نفسه
   (setMin/setClean/setTheme/setShell/wsMenuOpen/wsApply/setAuto/
   setMode/layout/cmdMenu/setCmdMode/qpToggle/uiSet/stSheet/stLock/
   custOpen/runInspect) — نقلها هنا يفرض إمّا نسخ تلك الدوالّ (فيصير
   لكل فعلٍ نسختان تتفرّقان) أو استيراد wire.js من هنا بينما wire.js
   يستورد ACTIONS من هنا — وهذا استيرادٌ دائريّ حقيقي. فبقيت في
   موضعها، وwire.js يدمجها مع هذا الجدول في ACT المُصدَّر كما كان.

   القاعدة: أضِف هنا فقط ما لا يحتاج غير revealPanel وHOOK. */
import {revealPanel} from "./dock.js";
import {HOOK,lazy} from "./bus.js";
import {errMsg} from "../core/escape.js";

const $=s=>document.querySelector(s);

/* ═══ كشف قسم ═══ نفس دالّة wire.js حرفياً — لا نسخةٌ ثانية تتفرّق،
   وwire.js يعيد تصديرها بنفس الاسم للحفاظ على كل الاستيرادات القائمة
   (app.js وappmenu.js يستوردانها من "./ribbon/wire.js"). */
export function revealSec(sec){
 return sec?revealPanel(sec):null;
}

/* ═══ الوكالة ═══ لا يُنقَر زرٌّ معطَّل — الرسالة أوضح من نقرةٍ لا
   تفعل شيئاً. مطابقةٌ لسلوك proxy() الأصلي في wire.js حرفاً بحرف. */
function proxy(sel,sec){
 return ()=>{
  if(sec)revealSec(sec);
  const el=$(sel);
  if(!el){HOOK.report("wr",`لا زرَّ «${sel}» — لوحته غير مبنيّة`);
   return false}
  if(el.disabled){HOOK.report("in","غير متاح الآن"); return false}
  el.click();
  return true;
 };
}
/* enabled اختيارية: تُستشار قبل fn في runSpec — لا تمنع proxy من
   إعادة نفس الرسالة لو استُدعيت مباشرة، فهي حارسٌ إضافي لا بديل. */
const enabledOf=sel=>()=>{const el=$(sel); return !!el&&!el.disabled};

/* ═══ الجدول ═══ id يطابق دوماً مفتاحه — يفحصه validateActions. */
export const ACTIONS={
 /* الملفّ والتصدير */
 fnew:  {id:"fnew",  n:"مشروع جديد",           ico:"fnew",  sec:"state",  fn:proxy("#bNew","state")},
 xOpen: {id:"xOpen", n:"افتح مشروعاً",          ico:"open",  sec:"export", fn:proxy("#xOpen","export")},
 xSave: {id:"xSave", n:"احفظ المشروع",          ico:"save",  sec:"export", fn:proxy("#xSave","export")},
 xDxf:  {id:"xDxf",  n:"تصدير DXF",             ico:"dxf",   sec:"export", fn:proxy("#xDxf","export")},
 xSvg:  {id:"xSvg",  n:"تصدير SVG",             ico:"svg",   sec:"export", fn:proxy("#xSvg","export")},
 xPng:  {id:"xPng",  n:"تصدير PNG",             ico:"png",   sec:"export", fn:proxy("#xPng","export")},
 xPdf:  {id:"xPdf",  n:"تصدير PDF",             ico:"pdf",   sec:"export", fn:proxy("#xPdf","export")},
 asCsv: {id:"asCsv", n:"تصدير جدول الكميات CSV", ico:"csv",  sec:"sched",  fn:proxy("#bAsCsv","sched")},
 osCsv: {id:"osCsv", n:"تصدير جدول الفتحات CSV", ico:"csv",  sec:"osched", fn:proxy("#bOsCsv","osched")},

 /* ═══ النسخةُ الاحتياطيةُ الخارجية ═══ فعلٌ واحدٌ يقلب الحالة:
    زرّان (فعّل/أطفئ) يفترقان في الترجمة ويظهران معاً وأحدهما كاذبٌ
    دائماً. والاستيرادُ كسولٌ لأنّ backup.js يلمس IndexedDB، فلا
    يُحمَّل إلّا لمن طلبه. واسمُ الملفِّ المقترح من اسم المشروع إن
    وُجِد — وتُقرأ الحالةُ من الوحدة لا من ذاكرةٍ ثانيةٍ هنا. */
 bkTog: {id:"bkTog", n:"نسخة احتياطية خارجية", ico:"save",
  fn:()=>lazy(()=>import("../io/backup.js").then(async M=>{
   if(!M.supported()){
    HOOK.report("in","المتصفّحُ لا يدعم الكتابةَ في ملفٍّ مختار — استعمل «احفظ المشروع»");
    return false;
   }
   if(M.BK.on){
    await M.disable();
    HOOK.report("ok","أُطفئت النسخةُ الاحتياطيةُ الخارجية");
    return true;
   }
   let nm="civildraft";
   try{
    const St=await import("../core/state.js");
    nm=(St.S&&St.S.meta&&St.S.meta.name)||nm;
   }catch(e){}
   const r=await M.enable(nm);
   if(!r.ok&&!r.cancelled)HOOK.report("wr",r.msg||"لم تُفعَّل");
   return !!r.ok;
  }),"النسخة الاحتياطية")},

 /* المرجع */
 rImp: {id:"rImp", n:"استورد DXF مرجعاً", ico:"ref", sec:"ref", fn:proxy("#rImp","ref")},
 rClr: {id:"rClr", n:"امسح المرجع",       ico:"ref", sec:"ref", fn:proxy("#rClr","ref")},
 rRst: {id:"rRst", n:"صفّر معايرة المرجع", ico:"ref", sec:"ref", fn:proxy("#rRst","ref")},
 underlayDlg:{id:"underlayDlg", n:"تحميل صورة مرجعية", ico:"underlay",
  fn:()=>lazy(()=>import("./appcmds.js").then(M=>M.chooseUnderlay()),"الصورة المرجعية")},

 /* الطبقات والفحص */
 lAll:    {id:"lAll",    n:"أظهر كل الطبقات",      ico:"layers",  sec:"lays", fn:proxy("#lAll","lays")},
 lUnlock: {id:"lUnlock", n:"افتح قفل كل الطبقات",  ico:"layers",  sec:"lays", fn:proxy("#lUnlock","lays")},
 inspect: {id:"inspect", n:"افحص المخطّط",          ico:"inspect", sec:"insp", fn:proxy("#bInsp","insp")},

 /* العامّة */
 undo: {id:"undo", n:"تراجع",   ico:"undo", fn:proxy("#bUndo"), enabled:enabledOf("#bUndo")},
 redo: {id:"redo", n:"إعادة",   ico:"redo", fn:proxy("#bRedo"), enabled:enabledOf("#bRedo")},
 fit:  {id:"fit",  n:"ملاءمة",  ico:"fit",  fn:proxy("#bFit")},
 help: {id:"help", n:"المساعدة", ico:"help", fn:proxy("#bHelp")},

 /* الورقة والمحاور والافتراضات */
 shCenter: {id:"shCenter", n:"وسّط الورقة",       ico:"sheet", sec:"sheet", fn:proxy("#shCenter","sheet")},
 axClr:    {id:"axClr",    n:"امسح المحاور",       ico:"axis",  sec:"axes",  fn:proxy("#bAxClr","axes")},
 dRst:     {id:"dRst",     n:"صفّر الافتراضات",     ico:"shell", sec:"defs",  fn:proxy("#dRst","defs")},
 osPop:    {id:"osPop",    n:"قائمة الالتقاط",     ico:"osnap",  fn:proxy("#osBtn")},

 /* السياقية — أزرارٌ تظهر بحسب المحدَّد */
 delSel:    {id:"delSel",    n:"احذف المحدَّد",      ico:"del", sec:"props", fn:proxy("#pDel","props")},
 renumCols: {id:"renumCols", n:"رقّم الأعمدة",       ico:"renum", sec:"props", fn:proxy("[data-brenum]","props")},
 clrDimTxt: {id:"clrDimTxt", n:"امسح نصّ الأبعاد",   ico:"dim", sec:"props", fn:proxy("[data-bcleartxt]","props")},
 nameSeq:   {id:"nameSeq",   n:"سمِّ بالتسلسل",      ico:"renum", sec:"props", fn:proxy("[data-bname]","props")},
 fixSnap:   {id:"fixSnap",   n:"أصلح الالتقاط",     ico:"weld", sec:"props", fn:proxy("[data-fsnap]","props")},

 /* فتح اللوحات مباشرة (بلا زرّ وكالة — كشفٌ صرف) */
 propsDlg:  {id:"propsDlg",  n:"لوحة الخصائص",    ico:"panel",   fn:()=>revealSec("props")},
 laysDlg:   {id:"laysDlg",   n:"لوحة الطبقات",     ico:"layers",  fn:()=>revealSec("lays")},
 schedDlg:  {id:"schedDlg",  n:"جدول الكميات",     ico:"table",   fn:()=>revealSec("sched")},
 oschedDlg: {id:"oschedDlg", n:"جدول الفتحات",     ico:"table",   fn:()=>revealSec("osched")},
 refDlg:    {id:"refDlg",    n:"لوحة المرجع",      ico:"ref",     fn:()=>revealSec("ref")},
 sheetDlg:  {id:"sheetDlg",  n:"لوحة الورقة",      ico:"sheet",   fn:()=>revealSec("sheet")},
 inspDlg:   {id:"inspDlg",   n:"لوحة الفاحص",      ico:"inspect", fn:()=>revealSec("insp")},
 projDlg:   {id:"projDlg",   n:"لوحة المشروع",     ico:"props",   fn:()=>revealSec("proj")},
 defsDlg:   {id:"defsDlg",   n:"لوحة الافتراضات",  ico:"shell",   fn:()=>revealSec("defs")},
 stateDlg:  {id:"stateDlg",  n:"لوحة الحالة",      ico:"grid",    fn:()=>revealSec("state")},
 aiDlg:     {id:"aiDlg",     n:"لوحة المساعد",     ico:"ai",      fn:()=>revealSec("ai")},
 /* ═══ الدليلُ التعليميّ ═══ المرحلة ٥ من audit/10-ui-plan.md
    عيبٌ مقيس: من أربعَ عشرةَ لوحةً كانت **ثلاثَ عشرةَ** تُفتَح بنقرةٍ
    و`guide` **بلا مُفتتِحٍ أصلاً** — لا فعلٌ ولا `dlg:` في لوحٍ. فمن
    لم يُفعِّل سطحَ العملِ «كامل» لم يبلغها أبداً، ولوحةٌ لا تُفتَح
    لوحةٌ غيرُ موجودةٍ من حيثُ المستخدم. وحارسُ `dock-reach.test.js`
    يفرض الآن أنّ **كلَّ** لوحةٍ لها مُفتتِحٌ معروضٌ. */
 guideDlg:  {id:"guideDlg",  n:"الدليل التعليمي",  ico:"help",    fn:()=>revealSec("guide")},
 installApp: {id:"installApp", n:"ثبّت التطبيق", ico:"down",
  fn:()=>lazy(()=>import("./install.js").then(M=>M.installApp()),"ثبّت التطبيق")},
 aboutDlg:  {id:"aboutDlg",  n:"عن CivilDraft",   ico:"info",
  fn:()=>lazy(()=>import("./about.js").then(M=>M.openAbout()),"عن CivilDraft")},

 /* التسليم والتنظيف — نوافذ تُحمَّل كسولاً (لا تقيّد الإقلاع) */
 gateDlg:    {id:"gateDlg",    n:"بوابة التسليم", ico:"inspect",
  fn:()=>lazy(()=>import("./gate.js").then(M=>M.openGate()),"بوابة التسليم")},
 cleanupDlg: {id:"cleanupDlg", n:"تنظيف المشروع", ico:"clear",
  fn:()=>lazy(()=>import("./hygiene.js").then(M=>M.openCleanup()),"تنظيف المشروع")},
 dedupDlg:   {id:"dedupDlg",   n:"مسح التكرار",   ico:"copy",
  fn:()=>lazy(()=>import("./hygiene.js").then(M=>M.openDedup()),"مسح التكرار")},
 levelMgrDlg:{id:"levelMgrDlg", n:"إدارة الطوابق", ico:"layers",
  fn:()=>lazy(()=>import("./levelManager.js").then(M=>M.openLevelManager()),"إدارة الطوابق")},
 styleMgrDlg:{id:"styleMgrDlg", n:"أنماط الرسم", ico:"props",
  fn:()=>lazy(()=>import("./styleManager.js").then(M=>M.openStyleManager()),"أنماط الرسم")},
 underlayCtlDlg:{id:"underlayCtlDlg", n:"ضبط الصورة المرجعية", ico:"underlay",
  fn:()=>lazy(()=>import("./underlayPanel.js").then(M=>M.openUnderlayPanel()),"ضبط الصورة المرجعية")},
 pricingDlg:{id:"pricingDlg", n:"التسعير", ico:"boq",
  fn:()=>lazy(()=>import("./pricingPanel.js").then(M=>M.openPricingPanel()),"التسعير")},
 /* الواجهة التعليمية — المشروعُ نفسُه يصير الدرس (js/learn/) */
 learn:{id:"learn", n:"الواجهة التعليمية", ico:"learn",
  fn:()=>lazy(()=>import("./learn.js").then(M=>M.openLearn()),"الواجهة التعليمية")},
 presenter:{id:"presenter", n:"وضع العرض", ico:"cmdl",
  fn:()=>lazy(()=>import("./presenter.js").then(M=>{
   const on=M.togglePresenter();
   HOOK.report("in",on?"وضع العرض: ما تكتبه ومفاتيحك تظهر كبيرةً على الشاشة":"أُطفئ وضع العرض");
  }),"وضع العرض")},
 view3dDlg:{id:"view3dDlg", n:"العرض الثلاثي", ico:"cube",
  fn:()=>lazy(()=>import("./view3d.js").then(M=>M.open3d()),"العرض الثلاثي")},
 ribbonEditDlg:{id:"ribbonEditDlg", n:"تخصيص الشريط", ico:"shell",
  fn:()=>lazy(()=>import("./ribbon/editor.js")
   .then(M=>M.openRibbonEditor()),"تخصيص الشريط")},

 /* المسح الكامل — لا زرَّ له، الأصل هنا (منقولةٌ حرفياً من wire.js) */
 purgeAll: {id:"purgeAll", n:"امسح كل ما هو محفوظ محلّياً", ico:"del", fn:()=>{
  if(!confirm("مسحُ كلِّ ما هو محفوظ في هذا المتصفّح؟\n\n"
   +"• المشروع الجاري وجلسته\n"
   +"• تفضيلات الواجهة وأسطح العمل والمناظر\n"
   +"• خيارات الأدوات وافتراضاتها\n"
   +"• إعداد المزوّد ومفتاحه\n\n"
   +"لا يمسّ الملفّات التي حفظتها على قرصك. "
   +"احفظ مشروعك أوّلاً إن أردت الإبقاء عليه."))return;
  import("../io/store.js")
   .then(M=>M.purge())
   .then(r=>{
    HOOK.report("ok",`مُسح ${r.keys.length} مفتاحاً`
     +(r.idb?" وقاعدة البيانات":"")
     +" — أعِد تحميل الصفحة للبدء من المصنع");
   })
   .catch(e=>HOOK.report("er","المسح: "+errMsg(e)));
 }},

 /* القياس — منقولةٌ حرفياً من wire.js */
 perfShow: {id:"perfShow", n:"القياس", ico:"info", fn:()=>{
  lazy(()=>import("../core/perf.js").then(M=>{
   if(!M.P.on){
    M.perfOn(1);
    HOOK.report("in","القياس مُشتغِل — حرّك شيئاً أو اسحب مقبضاً، "
     +"ثم اختر «القياس» مرّةً أخرى للحصيلة");
    return;
   }
   M.perfReport().split("\n").forEach(l=>{
    HOOK.report(/^⚠/.test(l)?"wr":"in",l);
   });
   M.perfOn(0);
   HOOK.report("ok","أُطفئ القياس");
  }),"القياس");
 }}
};

export const getAct=id=>ACTIONS[id]||null;

/* ═══ أفعالٌ مقصودٌ بقاؤها خارج هذا الجدول ═══
   تُستثنى من تحذير "act غير مستخدم" لأنها إمّا (أ) مُعرَّفةٌ محلياً
   في wire.js وتُدمَج معه في ACT الكلّي، أو (ب) لا تظهر في schema.js
   لأنها تُستدعى برمجياً (شريط الحالة، القائمة السياقية للخصائص). */
export const LOCAL_TO_WIRE=new Set([
 "rbMin","clean","theme","shell","beginner",
 "wsMenu","wsArch","wsAnnot","wsOut",
 "dockAutoS","dockAutoE","dockTabS","dockTabE",
 "cmdMode","cmdFloat","cmdBottom","qpTog","rclick",
 "stSheet","stPlots","stLock","stScale","stWarn","stCust",
 "histTog","joinsTog","soloTog"
]);

/* ═══ الفحص ═══ يحقق البنود 4 و 5:
   - act مذكور في schema.js لكن غير مُعرَّف هنا ولا في LOCAL_TO_WIRE
     ⇒ فعلٌ مجهول (خطأ فعلي، يمنع التشغيل الصامت).
   - act مُعرَّف هنا لكن لا يستعمله أي عنصر schema ولا استثناءٌ صريح
     ⇒ فعلٌ ميت (تحذير: يُحذف أو يُستعمَل).
   allKnownIds تُمرَّر من wire.js (Object.keys(ACT الكلّي)) حتى لا
   يُبلَّغ خطأً بأفعالٍ محليةٍ صحيحة معرَّفة هناك فقط. */
export function validateActions(schemaItems,allKnownIds){
 const known=allKnownIds instanceof Set?allKnownIds
  :new Set(allKnownIds||Object.keys(ACTIONS));
 const errs=[];
 const seenInSchema=new Set();
 for(const it of (schemaItems||[])){
  if(!it.act)continue;
  if(!known.has(it.act))errs.push(`act مجهول في schema: ${it.act}`);
  seenInSchema.add(it.act);
 }
 for(const id in ACTIONS){
  if(!seenInSchema.has(id)&&!LOCAL_TO_WIRE.has(id))
   errs.push(`act معرَّف في actions.js ولا يستعمله أي عنصر schema: ${id}`);
 }
 return errs;
}
