/* ═══ طبقة المنصّة ═══
   نقطةٌ واحدة تعرف هل نعمل داخل غلاف سطح المكتب (window.civilDesktop من
   desktop/preload.cjs) أم في المتصفّح. نسخة الويب لا تتغيّر: كل ما هنا
   يرجع إلى السلوك القديم حين لا يوجد الجسر.

   ما يفعله الغلاف:
   · قائمة التطبيق (جديد/فتح/حفظ) ترسل أوامر تُحوَّل هنا إلى نقر الأزرار
     نفسها — فلا مسارَ ثانياً للحفظ والفتح يخالف الأوّل.
   · فتح ملفٍّ بالنقر المزدوج يصل نصّاً إلى openText نفسها التي يستعملها
     زرّ «افتح»، فيمرّ بنفس الفحوص والتأكيد والتقرير. */

import {PROJECT_ACCEPT} from "./project.js";

export const isDesktop=()=>typeof window!=="undefined"
 &&!!(window.civilDesktop&&window.civilDesktop.isDesktop);

/* الويب يحفظ .json كما كان؛ سطح المكتب .cdraft ليرتبط بالبرنامج */
const WEB_EXT="json";
const DESKTOP_EXT="cdraft";
export const projectExt=()=>isDesktop()?DESKTOP_EXT:WEB_EXT;

/* أمرُ القائمة ⇐ الزرّ الذي ينفّذه */
const COMMANDS={new:"#bNew", open:"#xOpen", save:"#xSave"};

export function runCommand(cmd,doc){
 const sel=Object.prototype.hasOwnProperty.call(COMMANDS,cmd)?COMMANDS[cmd]:null;
 if(!sel)return false;
 const d=doc||(typeof document!=="undefined"?document:null);
 const el=d&&d.querySelector(sel);
 if(!el||el.disabled)return false;
 el.click();
 return true;
}

/* «فتح» من القائمة: نافذةُ <input type=file> يحجبها Chromium بلا إيماءةِ مستخدمٍ داخل الصفحة
   («File chooser dialog can only be shown with a user activation»)، والنقرُ بالفأرة على قائمة
   الغلاف الأصلية ليس إيماءةً في الصفحة — فكان «فتح» يفشل بصمت. نافذةُ النظام عبر الجسر
   (dialog.showOpenDialog في الغلاف) لا تحتاج إيماءة، ويمرّ ما تُرجعه من openText نفسها
   فنفسُ الفحص والتأكيد والتقرير. ينقلب إلى النقر القديم إن غاب الجسر أو تعذّر. */
/* الامتدادات من مصدرٍ واحد (PROJECT_ACCEPT في project.js) — فلا يتكرّر هنا اسمٌ قديم
   ولا تنحرف قائمة الحوار عن قائمة <input type=file>. */
const OPEN_FILTERS=[
 {name:"مشروع CivilDraft",
  extensions:PROJECT_ACCEPT.split(",").filter(x=>x[0]===".").map(x=>x.slice(1))},
 {name:"كل الملفات",extensions:["*"]}];

function nativeOpen(D,openText,doc){
 return Promise.resolve().then(()=>D.openFile(OPEN_FILTERS,false)).then(r=>{
  if(r&&r.canceled)return;                         /* ألغى المستخدم */
  if(r&&r.ok&&typeof r.data==="string")
   openText(r.data.replace(/^\uFEFF/,""),String(r.name||""));  /* FileReader يحذف BOM؛ هنا نحذفه */
  else openText(null,"");                          /* تعذّرت القراءة (حجمٌ زائد…): openText تُبلِّغ */
 }).catch(()=>{runCommand("open",doc)});
}

/* openText(txt,name): نفسُ ما يستعمله زرّ «افتح». تُستدعى مرّةً عند التركيب.
   تعيد true إذا كان الجسر موجوداً وفُعِّل. */
export function bindDesktop(openText,doc){
 if(!isDesktop())return false;
 const D=window.civilDesktop;
 if(typeof D.onCommand==="function")D.onCommand(c=>{
  if(c==="open"&&typeof D.openFile==="function"){
   const d=doc||(typeof document!=="undefined"?document:null);
   const el=d&&d.querySelector(COMMANDS.open);
   if(el&&!el.disabled){nativeOpen(D,openText,doc); return}
  }
  runCommand(c,doc);
 });
 if(typeof D.onOpenFile==="function")D.onOpenFile(f=>{
  if(f&&typeof f.data==="string")openText(f.data,String(f.name||""));
 });
 /* المستمعون جاهزون: الغلاف يسلّم الآن ما انتظر (ملفٌّ فُتح عند الإطلاق) */
 if(typeof D.ready==="function")D.ready();
 return true;
}
