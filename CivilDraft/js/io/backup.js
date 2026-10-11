/* ═══ نسخةٌ احتياطيةٌ خارج المتصفّح ═══ P-تحسين
   التخزينُ كلُّه محلّيٌّ: IndexedDB وlocalStorage. وأُصلح سابقاً فقدانُ
   العمل بين تبويبَين (مراجعةٌ وcompare-and-swap في io/store.js)، لكنّ
   **متصفّحاً يُمسَح = مشروعٌ يضيع**. ولا خادمَ لهذا المشروع ولا حسابَ،
   فالمزامنةُ السحابيةُ ليست خياراً.

   الحلُّ بلا خادم: المستخدمُ يختار ملفاً **مرّةً واحدةً** بـFile System
   Access API، ونكتب فيه نسخةً كلَّما تغيّر المشروعُ (بمهلةٍ تمنع
   الكتابةَ عند كلِّ ضربةِ مفتاح). والمقبضُ يُحفَظ في IndexedDB فينجو
   من إعادة التحميل، ويحتاج إذناً واحداً عند أوّلِ فتحٍ في الجلسة.

   وثلاثةُ قراراتٍ صريحة:
   ١) **لا تلقائيةَ بلا اختيار.** لا نطلب ملفاً من تلقائنا: زرٌّ يُفعِّل
      ويُطفئ، وحالةٌ تُقرأ. الكتابةُ في قرص المستخدم بلا طلبٍ خرقٌ لثقة.
   ٢) **الفشلُ يُقال لا يُبلَع.** إذنٌ سُحِب أو قرصٌ ممتلئٌ يُبلَّغ مرّةً
      (لا كلَّ محاولة) — كسياسة writePref في P2-005 نفسِها.
   ٣) **المتصفّحُ غيرُ الدّاعم يُعلَن.** Safari وFirefox لا يملكان
      `showSaveFilePicker` بعد، فتُعرَض الحالةُ «غيرُ مدعوم» ويبقى
      «حفظ باسم» اليدويُّ طريقَ الجميع — لا تعطّلٌ صامت.

   ولا يستورد هذا الملفُّ الحالةَ (`S`): يأخذ نصَّ المشروع من مُنادِيه،
   فيُختبَر في Node بمقبضٍ مزيَّفٍ بلا متصفّح. */
import {writePref} from "../core/delegate.js";

const PREF="civildraft.backup";
const DBN ="civildraft-backup";
const STORE="h";
const KEY ="handle";

export const BK={on:0, name:"", at:0, err:"", n:0};
let HANDLE=null, T=null, SAID="", PENDING=null;
let SAY=()=>{};
/* المُبلِّغ من الواجهة — كـsetPrefError */
export const onBackupSay=f=>{SAY=(typeof f==="function")?f:(()=>{})};
const say=(lv,m)=>{
 if(SAID===m)return;          /* مرّةً لا كلَّ محاولة */
 SAID=m;
 try{SAY(lv,m)}catch(e){}
};

export const supported=()=>
 typeof window!=="undefined"
 && typeof window.showSaveFilePicker==="function";

/* ═══ مقبضٌ باقٍ ═══ IndexedDB لأنّ المقابض لا تُسلسَل في
   localStorage — وهي الطريقةُ الوحيدةُ المتاحة لحفظها. */
function idb(){
 return new Promise((res,rej)=>{
  if(typeof indexedDB==="undefined")return rej(new Error("لا IndexedDB"));
  const q=indexedDB.open(DBN,1);
  q.onupgradeneeded=()=>{
   const d=q.result;
   if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE);
  };
  q.onsuccess=()=>res(q.result);
  q.onerror=()=>rej(q.error||new Error("فتحُ القاعدة فشل"));
 });
}
async function putHandle(h){
 try{
  const d=await idb();
  await new Promise((res,rej)=>{
   const tx=d.transaction(STORE,"readwrite");
   tx.objectStore(STORE).put(h,KEY);
   tx.oncomplete=res; tx.onerror=()=>rej(tx.error);
  });
  d.close();
  return true;
 }catch(e){return false}
}
async function getHandle(){
 try{
  const d=await idb();
  const h=await new Promise((res,rej)=>{
   const tx=d.transaction(STORE,"readonly");
   const q=tx.objectStore(STORE).get(KEY);
   q.onsuccess=()=>res(q.result||null);
   q.onerror=()=>rej(q.error);
  });
  d.close();
  return h;
 }catch(e){return null}
}
async function clearHandle(){
 try{
  const d=await idb();
  await new Promise(res=>{
   const tx=d.transaction(STORE,"readwrite");
   tx.objectStore(STORE).delete(KEY);
   tx.oncomplete=res; tx.onerror=res;
  });
  d.close();
 }catch(e){}
}

const stamp=()=>{BK.at=Date.now(); writePref(PREF,{on:BK.on,name:BK.name,at:BK.at})};

/* ═══ التفعيل ═══ اختيارُ الملفِّ مرّةً واحدة ═══ */
export async function enable(suggested){
 if(!supported()){
  BK.err="المتصفّحُ لا يدعم الكتابةَ في ملفٍّ مختار";
  say("in",BK.err+" — استعمل «حفظ باسم» اليدويّ");
  return {ok:false,msg:BK.err};
 }
 let h=null;
 try{
  h=await window.showSaveFilePicker({
   suggestedName:String(suggested||"civildraft")+".json",
   types:[{description:"مشروع CivilDraft",
    accept:{"application/json":[".json"]}}]
  });
 }catch(e){
  /* الإلغاءُ ليس خطأً */
  return {ok:false,msg:"أُلغي الاختيار",cancelled:1};
 }
 HANDLE=h;
 BK.on=1; BK.name=h.name||""; BK.err=""; SAID="";
 await putHandle(h);
 stamp();
 say("ok",`النسخةُ الاحتياطية مُفعَّلةٌ إلى «${BK.name}»`);
 return {ok:true,name:BK.name};
}
export async function disable(){
 BK.on=0; HANDLE=null; BK.err=""; SAID="";
 /* المعلَّقُ يُلغى مع المهلة: نصٌّ ناجٍ من إطفاءٍ سيُكتَب في الملفِّ
    التالي الذي يختاره المستخدم — وهو نصُّ مشروعٍ قد يكون غيرَه.
    كشفه اختبارُ «الإطفاءُ يُلغي ما لم يُكتَب». */
 if(T){clearTimeout(T); T=null}
 PENDING=null;
 await clearHandle();
 stamp();
 return {ok:true};
}
/* ═══ الاستعادةُ عند الإقلاع ═══
   المقبضُ يُقرأ ولا يُستعمَل حتى يُمنَح الإذن: المتصفّحُ يطلبه بإيماءةِ
   مستخدمٍ وحدَها، فنؤجّله إلى أوّل كتابةٍ بعد تفاعل. */
export async function restore(){
 if(!supported())return {ok:false};
 const h=await getHandle();
 if(!h)return {ok:false};
 HANDLE=h;
 BK.name=h.name||"";
 BK.on=1;
 return {ok:true,name:BK.name};
}
async function allowed(h){
 if(!h||typeof h.queryPermission!=="function")return true;
 try{
  if(await h.queryPermission({mode:"readwrite"})==="granted")return true;
  return (await h.requestPermission({mode:"readwrite"}))==="granted";
 }catch(e){return false}
}

/* ═══ الكتابة ═══ نصُّ المشروع من المُنادي: لا حالةَ هنا ═══ */
export async function writeNow(txt){
 if(!BK.on||!HANDLE)return {ok:false,msg:"غيرُ مُفعَّلة"};
 if(!(await allowed(HANDLE))){
  BK.err="الإذنُ غيرُ ممنوح";
  say("wr","النسخةُ الاحتياطية تحتاج إذناً — انقر «فعّل» من جديد");
  return {ok:false,msg:BK.err};
 }
 try{
  const w=await HANDLE.createWritable();
  await w.write(String(txt==null?"":txt));
  await w.close();
  BK.n++; BK.err=""; SAID="";
  stamp();
  return {ok:true,n:BK.n};
 }catch(e){
  BK.err=(e&&e.message)?e.message:"الكتابةُ فشلت";
  say("er",`النسخةُ الاحتياطية فشلت: ${BK.err}`);
  return {ok:false,msg:BK.err};
 }
}
/* ═══ المجدولة ═══ مهلةٌ تجمع التغييرات، وآخرُ نصٍّ يفوز ═══ */
export const BK_DELAY=15000;
export function schedule(txt,ms){
 if(!BK.on||!HANDLE)return false;
 PENDING=txt;
 if(T)return true;                 /* مهلةٌ قائمةٌ — لا تُجدَّد */
 T=setTimeout(()=>{
  T=null;
  const t=PENDING; PENDING=null;
  if(t!=null)writeNow(t);
 },Math.max(1000,+ms||BK_DELAY));
 /* في Node المؤقّتُ مِقبضٌ حيٌّ يمنع خروجَ العملية — كالقناة في
    io/store.js. unref موجودةٌ في Node لا في المتصفّح. */
 if(T&&typeof T.unref==="function")T.unref();
 return true;
}
export function flushSoon(){
 if(!T)return false;
 clearTimeout(T); T=null;
 const t=PENDING; PENDING=null;
 if(t==null)return false;
 writeNow(t);
 return true;
}
/* للاختبار ولإعادة الضبط: مقبضٌ مزيَّفٌ يُركَّب بلا متصفّح */
export function _setHandle(h,name){
 HANDLE=h;
 BK.on=h?1:0;
 BK.name=name||(h&&h.name)||"";
 BK.err=""; SAID="";
 if(T){clearTimeout(T); T=null}
 PENDING=null;
 return BK.on;
}
export const _pending=()=>PENDING;
export const backupState=()=>({on:BK.on,name:BK.name,at:BK.at,
 err:BK.err,n:BK.n,supported:supported()});
