/* ═══ التحديث التلقائي: القرار والسلوك ═══
   node js/tests/updater.test.js
   لا Electron ولا شبكة: app/dialog/autoUpdater مزيَّفة. ما يُفحَص:
   · متى يُعطَّل (محمولة، تطوير، غير ويندوز، بلا app-update.yml، opt-out)
   · لا تنزيل قبل موافقة المستخدم، ولا تثبيت قبل موافقته الثانية
   · الفحص الصامت لا يُزعج عند «لا جديد» أو انقطاع الاتصال */
import {createRequire} from "node:module";
import {group,groupAsync,ok,eq,summary} from "./harness.js";
const require=createRequire(import.meta.url);
const {updateSupport,setupUpdater,notesText}=require("../../desktop/updater.cjs");

const RES="/app/resources";
const base={isPackaged:true,platform:"win32",env:{},resourcesPath:RES,existsSync:()=>true};

group("updateSupport: متى يُعطَّل",()=>{
 eq(updateSupport(base).enabled,true,"مثبَّت على ويندوز بإعداد تحديث: مفعّل");
 eq(updateSupport({...base,env:{PORTABLE_EXECUTABLE_FILE:"C:\\x.exe"}}).reason,"portable","المحمولة (FILE) معطَّلة");
 eq(updateSupport({...base,env:{PORTABLE_EXECUTABLE_DIR:"C:\\d"}}).reason,"portable","المحمولة (DIR) معطَّلة");
 eq(updateSupport({...base,isPackaged:false}).reason,"dev","التطوير معطَّل");
 eq(updateSupport({...base,platform:"linux"}).reason,"platform","غير ويندوز معطَّل");
 eq(updateSupport({...base,existsSync:()=>false}).reason,"no-config","بلا app-update.yml معطَّل");
 eq(updateSupport({...base,env:{CIVILDRAFT_NO_UPDATE:"1"}}).reason,"optout","opt-out معطَّل");
 eq(updateSupport({...base,env:{CIVILDRAFT_NO_UPDATE:"0"}}).enabled,true,"القيمة 0 لا تعطّل");
 eq(updateSupport({...base,resourcesPath:""}).enabled,false,"بلا resourcesPath معطَّل");
 eq(updateSupport().enabled,false,"بلا وسائط لا يرمي ويعطَّل");
});

group("notesText",()=>{
 eq(notesText({releaseNotes:"<p>إصلاح <b>خطأ</b></p>"}),"إصلاح خطأ","يُنزَع HTML");
 eq(notesText({releaseNotes:[{note:"أ"},{note:"ب"}]}),"أ ب","مصفوفة");
 eq(notesText({}),"","بلا ملاحظات");
 eq(notesText({releaseNotes:"x".repeat(1000)}).length,400,"مقصوصة");
});

/* مزيِّفات */
function mk(over={}){
 const handlers={}, calls={download:0,install:0,check:0,progress:[]}, boxes=[];
 const au={autoDownload:true,autoInstallOnAppQuit:false,allowPrerelease:true,allowDowngrade:true,
  on:(e,f)=>{handlers[e]=f},
  checkForUpdates:async()=>{calls.check++; if(over.checkThrows)throw new Error("offline"); if(over.onCheck)await over.onCheck(handlers)},
  downloadUpdate:async()=>{calls.download++; if(over.dlThrows)throw new Error("net")},
  quitAndInstall:()=>{calls.install++}};
 const responses=[...(over.responses||[])];
 const win={setProgressBar:v=>calls.progress.push(v),isDestroyed:()=>false};
 const dialog={showMessageBox:async(...a)=>{const o=a[a.length-1];boxes.push(o);return {response:responses.length?responses.shift():0}}};
 const u=setupUpdater({app:{isPackaged:true,getVersion:()=>"1.1.0"},dialog,getWindow:()=>win,
  platform:"win32",env:over.env||{},resourcesPath:RES,existsSync:()=>over.noConfig?false:true,
  loadUpdater:()=>au});
 return {u,au,handlers,calls,boxes};
}
const tick=()=>new Promise(r=>setTimeout(r,5));

await groupAsync("الإعداد: لا تنزيل تلقائي",async()=>{
 const t=mk(); await t.u.check(false);
 eq(t.au.autoDownload,false,"autoDownload=false");
 eq(t.au.autoInstallOnAppQuit,true,"التثبيت عند الإغلاق بعد الموافقة");
 eq(t.au.allowPrerelease,false,"لا prerelease");
 eq(t.au.allowDowngrade,false,"لا downgrade");
});

await groupAsync("تحديث متاح: يسأل قبل التنزيل",async()=>{
 const t=mk({responses:[0]});                       /* «لاحقاً» */
 await t.u.check(false); await t.handlers["update-available"]({version:"1.2.0"}); await tick();
 eq(t.calls.download,0,"«لاحقاً» ⇒ لا تنزيل");
 eq(t.boxes.length,1,"سؤالٌ واحد");
 ok(t.boxes[0].message.includes("1.2.0")&&t.boxes[0].detail.includes("1.1.0"),"يذكر الإصدارين");
 const t2=mk({responses:[1,0]});                    /* «تنزيل الآن» ثم «لاحقاً» عند الجاهزية */
 await t2.u.check(false); await t2.handlers["update-available"]({version:"1.2.0"}); await tick();
 eq(t2.calls.download,1,"«تنزيل الآن» ⇒ تنزيلٌ واحد");
 await t2.handlers["update-downloaded"]({version:"1.2.0"}); await tick();
 eq(t2.calls.install,0,"«لاحقاً» عند الجاهزية ⇒ لا إعادة تشغيل");
 eq(t2.calls.progress[t2.calls.progress.length-1],-1,"شريط التقدّم يُزال");
 const t3=mk({responses:[1,1]});
 await t3.u.check(false); await t3.handlers["update-available"]({version:"1.2.0"}); await tick();
 await t3.handlers["update-downloaded"]({version:"1.2.0"}); await tick();
 eq(t3.calls.install,1,"موافقةٌ ثانية ⇒ quitAndInstall");
});

await groupAsync("التقدّم والإخفاق",async()=>{
 const t=mk(); await t.u.check(false);
 t.handlers["download-progress"]({percent:42}); t.handlers["download-progress"]({percent:140}); t.handlers["download-progress"]({});
 eq(t.calls.progress.join(),"0.42,1","نسبةٌ مقيَّدة 0..1 وتُهمَل الحمولة الفاسدة");
 const f=mk({responses:[1],dlThrows:true});
 await f.u.check(false); await f.handlers["update-available"]({version:"1.2.0"}); await tick();
 eq(f.boxes[f.boxes.length-1].type,"error","فشل التنزيل يُعلَن");
});

await groupAsync("لا تكرار للسؤال في الجلسة",async()=>{
 const t=mk({responses:[0,0]});
 await t.u.check(false); await t.handlers["update-available"]({version:"1.2.0"}); await tick();
 await t.handlers["update-available"]({version:"1.2.0"}); await tick();
 eq(t.boxes.length,1,"الإصدار نفسه لا يُسأل عنه مرّتين تلقائياً");
});

await groupAsync("الفحص الصامت والفحص اليدوي",async()=>{
 const s=mk(); await s.u.check(false); s.handlers["update-not-available"]();
 await s.handlers.error(new Error("x")); await tick();
 eq(s.boxes.length,0,"التلقائي: لا جديد/انقطاع ⇒ صمت");
 const off=mk({checkThrows:true}); const r=await off.u.check(false);
 eq(r,false,"checkForUpdates يرمي ⇒ يُبتلَع"); eq(off.boxes.length,0,"…بصمت");
 const m=mk(); await m.u.check(true); m.handlers["update-not-available"](); await tick();
 eq(m.boxes.length,1,"اليدويّ: «أنت على أحدث إصدار»");
 const me=mk({checkThrows:true}); await me.u.check(true); await tick();
 eq(me.boxes[0].type,"warning","اليدويّ + انقطاع ⇒ تحذير");
});

await groupAsync("المعطَّل: لا يحمّل المكتبة أبداً",async()=>{
 for(const env of [{PORTABLE_EXECUTABLE_FILE:"x"},{CIVILDRAFT_NO_UPDATE:"1"}]){
  const t=mk({env}); eq(await t.u.check(false),false,"التلقائي لا يفعل شيئاً");
  eq(t.calls.check,0,"لا checkForUpdates"); eq(t.boxes.length,0,"ولا نافذة");
  await t.u.check(true); eq(t.calls.check,0,"اليدويّ أيضاً لا يفحص"); eq(t.boxes.length,1,"لكنه يشرح السبب");
 }
 const t=mk({noConfig:true}); await t.u.check(true);
 ok(t.boxes[0].detail.includes("بناءٌ محلّيّ"),"بلا app-update.yml: يشرح أنه بناءٌ محلّيّ");
 let loaded=0;
 const u=setupUpdater({app:{isPackaged:true,getVersion:()=>"1"},dialog:{showMessageBox:async()=>({response:0})},
  getWindow:()=>null,platform:"win32",env:{PORTABLE_EXECUTABLE_FILE:"x"},resourcesPath:RES,existsSync:()=>true,
  loadUpdater:()=>{loaded++;return {}}});
 await u.check(false); await u.check(true); eq(loaded,0,"loadUpdater لا يُستدعى في المحمولة");
});

summary();
