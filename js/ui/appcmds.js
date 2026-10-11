// js/ui/appcmds.js
/* ═══ أوامر التطبيق النصية ═══
   جسرٌ بين سطر الإدخال وأفعال اللوحات الوكالية: كل أمرٍ يفكّ إلى
   فعله الموجود في actions.js عبر runSpec، أو إلى دالّةِ نافذة —
   فلا منطقَ ثانٍ يتخلّف عن الأول. ملفّ ui/ لا tools/: الاتجاه
   core ← tools ← ui ثابت، والتسجيل عبر defTool من tools/registry
   (نفس نمط mkblock في blockpanel.js). كلها لحظية own:1 بلا خطوات.
   أعلام التعريف (كما في tools/macros.js):
   · nojr   — خارج سجلّ الأوامر: وإلا أعادت jrreplay نفسها بلا نهاية،
              ولأعاد السجلُّ «new» و«save» على مشروعٍ آخر؛
   · noplan — لا تُقبَل داخل خطة (parsePlan): لا تصدير ولا مسح أثناء معاينة.
   وتُسجَّل أسماؤها في jrIgnore فيُحجَب حتى ما يكتبه المستخدم بها. */
import {defTool,TOOLS} from "../tools/registry.js";
import * as R from "../tools/registry.js";
import {runSpec} from "./ribbon/wire.js";
import {HOOK} from "./bus.js";
import {JR,jrText,jrPlan,jrClear,jrCount,jrTainted,jrMute,jrIgnore}
 from "../core/journal.js";
import {recActive} from "../core/macros.js";
import {parsePlan,planReady} from "../ai/plan.js";
import {trial,commit,rollback} from "../ai/run.js";
import {setImage as setUnderlayImage,MAX_SRC as UNDERLAY_MAX_SRC}
 from "../core/underlay.js";
import {tourStart} from "./tour.js";

const FLAGS={own:1,nojr:1,noplan:1,steps:[]};
const mk=d=>defTool(Object.assign({},FLAGS,d));
const IDS=[];              /* تُحجَب من السجلّ في آخر الملف */

/* ═══ أمر⇒فعل: يفوّض إلى runSpec فيبقى التنفيذُ وكيلاً واحداً ═══ */
/* ═══ أداةٌ تفوّض إلى فعلٍ في الشريط ═══
   المرحلة ١ من خطّة الواجهة: الربطُ `أداة ← فعل` كان محفوظاً في
   `act()` وحدَها، فمن أراد معرفةَ **بيتِ** هذه الأدواتِ في الشريطِ
   نسخ الجدولَ عنده (فعله `ui-reach.test.js` بجدولٍ مكتوبٍ بيدٍ
   يتقادم). الآن يُصدَّر: مصدرُ حقيقةٍ واحدٌ تقرؤه لوحةُ الأوامرِ
   لتُظهِر البيتَ، ويقرؤه الحارسُ ليتحقّق. */
export const ACTOF={};
const act=(id,actId,alias,label,hint)=>{
 IDS.push(id);
 ACTOF[id]=actId;
 return mk({id, alias, label, hint,
  start(){runSpec({act:actId}); return false}});
};
act("dxf",     "xDxf",       "dxf DXF",                 "تصدير DXF",     "يصدّر DXF من نطاق الطباعة");
act("svg",     "xSvg",       "svg",                     "تصدير SVG",     "يصدّر SVG متّجهاً");
act("png",     "xPng",       "png",                     "تصدير PNG",     "يصدّر PNG بدقة لوحة التصدير");
act("pdf",     "xPdf",       "pdf PDF",                 "تصدير PDF",     "يصدّر PDF 1.4");
act("save",    "xSave",      "save احفظ حفظ",           "حفظ المشروع",   "ينزّل ملف المشروع (Ctrl+S)");
act("open",    "xOpen",      "open افتح فتح_ملف",       "فتح مشروع",     "يفتح ملف مشروع");
act("new",     "fnew",       "new جديد",                "مشروع جديد",    "يفرّغ المشروع (يسأل إن وُجد رسم)");
act("areacsv", "asCsv",      "areacsv مساحات",          "مساحات CSV",    "يصدّر جدول المساحات CSV");
act("opencsv", "osCsv",      "opencsv فتحات",           "فتحات CSV",     "يصدّر جدول الفتحات CSV");
act("inspect", "inspect",    "inspect check عاين افحص", "افحص المخطط",   "يجمع ملاحظات الفاحص (F7)");
act("cleanup", "cleanupDlg", "cleanup purge تنظيف",     "تنظيف المشروع", "يفتح نافذة التنظيف (تقرير قبل الحذف)");
act("dedup",   "dedupDlg",   "dedup overkill تكرار مسح_التكرار", "مسح التكرار",   "يفتح نافذة كشف المكرّرات");
/* «levels» مسجَّلة في ui/levelManager.js باسم levelMgr — تُحجَب من السجلّ هنا */
IDS.push("levelMgr");
act("gate",    "gateDlg",    "gate handover تسليم بوابة بوابة_التسليم", "بوابة التسليم", "يفتح فحص التسليم قبل التصدير");

/* ═══ الجولة ═══ */
IDS.push("tour");
mk({id:"tour", alias:"tour جوله جولة", label:"جولة",
 hint:"يبدأ جولة أول تشغيل",
 start(){tourStart(); return false}});

/* ═══ سجلّ الأوامر ═══ */
IDS.push("jrcopy","jrreplay","jrclear");
mk({id:"jrcopy", alias:"انسخ_السجل jrcopy", label:"انسخ سجلّ الأوامر",
 hint:"ينسخ أسطر السجلّ نصّاً",
 start(){
  const n=jrCount();
  if(!n){HOOK.report("in","سجلّ الأوامر فارغ"); return false}
  if(navigator.clipboard&&navigator.clipboard.writeText)
   navigator.clipboard.writeText(jrText()).then(
    ()=>HOOK.report("ok",`نُسخ ${n} سطراً${jrTainted()?" · مشوب":""}`),
    ()=>HOOK.report("er","تعذّر النسخ — المتصفّح منع الحافظة"));
  else HOOK.report("er","الحافظة غير متاحة");
  return false;
 }});

/* إعادة التشغيل تُؤجَّل إلى ما بعد انتهاء begin() (microtask): الأداة
   الجارية حينها — هذه نفسها — لا تزال «فعّالة»، وtrial ينادي R.begin
   الذي يُلغي الأداة الفعّالة ويصفّر سياقها فيرمي begin الخارجي.
   نفس النمط المتّبع في tools/macros.js (play). */
function replayJournal(){
 if(R.active()){HOOK.report("wr","أنهِ الأداة الجارية (Esc) قبل إعادة السجلّ"); return false}
 if(recActive()){HOOK.report("wr","أوقف تسجيل الماكرو أولاً"); return false}
 const n=jrCount();
 if(!n){HOOK.report("in","سجلّ الأوامر فارغ"); return false}
 if(jrTainted()&&!confirm(`السجلّ مشوب بـ ${jrTainted()} عملية لا يُعبَّر `
  +"عنه بسطر. الإعادة ستختلف. متابعة؟"))return false;
 const p=parsePlan(jrPlan(),1,JR.max);
 if(!planReady(p)){HOOK.report("er","السجلّ غير قابل للإعادة: "
  +(p.errs[0]||"سطر غير مفهوم"));return false}
 jrMute(1); let r=null;
 try{
  try{r=trial(p.lines,{stopOnError:1})}finally{jrMute(0)}
  if(!r||r.errs){
   if(r)rollback(r);
   HOOK.report("er","تعذّرت الإعادة — أُرجِع كل شيء");
   HOOK.refresh(1);
   return false;
  }
  const made=commit(r,"إعادة سجلّ الأوامر");
  HOOK.report("ok",`أُعيد ${r.ran} سطراً · ${made} كياناً — Ctrl+Z يتراجع عنه كلّه`);
  HOOK.refresh(1);
  return true;
 }catch(e){
  try{if(r)rollback(r)}catch(_){}
  HOOK.report("er",(e&&e.message)||String(e));
  HOOK.refresh(1);
  return false;
 }
}
mk({id:"jrreplay", alias:"اعد_السجل jrreplay", label:"أعد تشغيل السجلّ",
 hint:"يُنفَّذ على الحالة الجارية · كلّه أو لا شيء",
 start(){queueMicrotask(replayJournal); return false}});

mk({id:"jrclear", alias:"امسح_السجل jrclear", label:"امسح سجلّ الأوامر",
 hint:"يبدأ التسجيل من الآن",
 start(){jrClear(); HOOK.report("in","مُسح سجلّ الأوامر"); return false}});

/* ═══ الصورة المرجعية — مُنتقي ملفٍ واحد مشترك مع مسار الزرّ ═══ */
export function chooseUnderlay(){
 const i=document.createElement("input");
 i.type="file"; i.accept="image/*";
 i.onchange=()=>{
  const f=i.files&&i.files[0]; if(!f)return;
  /* الحدّ على محارف data: URL؛ base64 يضخّم الملف بنحو 4/3 */
  if(f.size>UNDERLAY_MAX_SRC*0.75){
   HOOK.report("er",`الصورة ${(f.size/1e6).toFixed(1)} م.ب — الحدّ `
    +`${(UNDERLAY_MAX_SRC/1e6).toFixed(0)} م.ب تقريباً`);
   return;
  }
  const r=new FileReader();
  r.onload=()=>{setUnderlayImage(String(r.result||""));
   HOOK.status("حُمّلت الصورة المرجعية")};
  r.onerror=()=>HOOK.report("er","تعذّرت قراءة الصورة");
  r.readAsDataURL(f);
 };
 i.click();
}
IDS.push("underlay");
mk({id:"underlay", alias:"underlay صورة_مرجعية", label:"صورة مرجعية",
 hint:"يختار صورة خلفية للتتبّع والمعايرة",
 start(){chooseUnderlay(); return false}});

/* ═══ خارج السجلّ — بالمطبَّع وبالنصّ الخام كما يكتبه المستخدم ═══ */
export function ignoreInJournal(ids){
 ids.forEach(id=>{
  const d=TOOLS[id]; if(!d)return;
  jrIgnore(id);
  String(d.alias||"").split(/\s+/).filter(Boolean).forEach(jrIgnore);
 });
}
ignoreInJournal(IDS);
