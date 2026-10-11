/* ═══ تثبيتُ التطبيق كـPWA ═══
   يلتقط `beforeinstallprompt` (Chrome/Edge على الحاسوب) ويحتفظ به حتى
   يضغط المستخدمُ «ثبّت التطبيق»، فيُفتح CivilDraft في نافذةٍ مستقلّةٍ
   بأيقونته بلا شريط تبويباتٍ (manifest: display=standalone).
   الحدثُ يُطلَق مرّةً واحدة وقد يسبق بناءَ الواجهة، فيُسجَّل المستمعُ عند
   استيراد الوحدة (app.js يستوردها ساكناً). Safari وFirefox لا يُطلقانه:
   فيُعرَض للمستخدم المسارُ اليدويّ بدل أن يصمت الزرّ. */
import {HOOK} from "./bus.js";

let deferred=null;
const subs=new Set();

export function isStandalone(){
 try{
  return (window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)
   ||(window.matchMedia&&window.matchMedia("(display-mode: window-controls-overlay)").matches)
   ||window.navigator.standalone===true;
 }catch(e){return false}
}
export const canPromptInstall=()=>!!deferred;
/* يُنادى كلَّما تغيّرت الحالة (صار قابلاً للتثبيت / تمّ التثبيت) */
export function onInstallChange(fn){subs.add(fn); return ()=>subs.delete(fn)}
const fire=()=>subs.forEach(f=>{try{f()}catch(e){}});

export function initInstall(){
 if(typeof window==="undefined"||initInstall.done)return;
 initInstall.done=true;
 window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault();          /* نحتفظ به ونعرضه بزرّنا نحن */
  deferred=e; fire();
 });
 window.addEventListener("appinstalled",()=>{
  deferred=null; fire();
  HOOK.report("in","✅ تمّ تثبيت CivilDraft — افتحه من أيقونته على سطح المكتب أو قائمة ابدأ");
 });
}

export async function installApp(){
 if(isStandalone()){
  HOOK.report("in","التطبيق مثبَّتٌ ويعمل الآن في نافذته المستقلّة");
  return "standalone";
 }
 if(deferred){
  const ev=deferred; deferred=null; fire();
  try{
   await ev.prompt();
   const r=await ev.userChoice;
   if(r&&r.outcome==="accepted")return "accepted";
   HOOK.report("in","أُلغي التثبيت — يمكنك المحاولة من نفس الزرّ لاحقاً");
   return "dismissed";
  }catch(e){
   HOOK.report("wr","تعذّر فتح نافذة التثبيت: "+(e&&e.message||e));
   return "error";
  }
 }
 HOOK.report("in",
  "التثبيت اليدويّ: في Chrome/Edge اضغط أيقونة «تثبيت» في شريط العنوان "
  +"(أو القائمة ⋮ ← «تثبيت CivilDraft»). في Safari على ماك: ملف ← «إضافة إلى Dock». "
  +"Firefox لا يدعم تثبيت التطبيقات على الحاسوب.");
 return "manual";
}
