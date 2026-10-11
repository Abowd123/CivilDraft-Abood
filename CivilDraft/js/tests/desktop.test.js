/* ═══ سطح المكتب: طبقة المنصّة + تحليل وسائط الإطلاق ═══
   node js/tests/desktop.test.js
   لا Electron هنا: الجسر مزيَّف. ما يُفحَص هو المنطق الذي ينفلق بصمت إن انحرف:
   · نسخة الويب بلا الجسر لا تتغيّر (json، لا استماع)
   · أوامر القائمة تُترجَم إلى الأزرار نفسها فقط، ومجهولها يُرفَض
   · الملفّ الذي يصل من النظام يمرّ من openText بنصّه واسمه
   · وسائط الإطلاق: امتدادٌ معروف + ملفٌّ موجود + حجمٌ مقبول */
import {createRequire} from "node:module";
import {resolve} from "node:path";
import {shim,group,groupAsync,ok,eq,summary} from "./harness.js";
shim();
const require=createRequire(import.meta.url);
const P=await import("../io/platform.js");
const {PROJECT_ACCEPT}=await import("../io/project.js");
const {findProjectArg,MAX_OPEN_BYTES}=require("../../desktop/argv.cjs");

group("الويب بلا جسر: السلوك القديم",()=>{
 delete globalThis.window;
 eq(P.isDesktop(),false,"ليس سطح مكتب");
 eq(P.projectExt(),"json","الحفظ json");
 eq(P.bindDesktop(()=>{}),false,"لا ربط");
 eq(P.runCommand("open",null),false,"لا مستند");
 ok(PROJECT_ACCEPT.includes(".json")&&PROJECT_ACCEPT.includes(".mistar")
  &&PROJECT_ACCEPT.includes(".cdraft"),"القبول يشمل الثلاثة");
});

group("سطح المكتب: الأوامر والفتح",()=>{
 const cmds=[], opens=[]; let readied=0, onC=null, onO=null;
 globalThis.window={civilDesktop:{isDesktop:true,
  onCommand:f=>{onC=f}, onOpenFile:f=>{onO=f}, ready:()=>{readied++}}};
 eq(P.isDesktop(),true,"سطح مكتب");
 eq(P.projectExt(),"cdraft","الحفظ cdraft");
 const clicked=[];
 const doc={querySelector:s=>s==="#xSave"?{click:()=>clicked.push(s),disabled:false}
  :s==="#xOpen"?{click:()=>clicked.push(s),disabled:true}:null};
 eq(P.bindDesktop((t,n)=>opens.push([t,n]),doc),true,"رُبط");
 eq(readied,1,"ready مرّةً بعد التسجيل");
 onC("save"); eq(clicked.join(),"#xSave","save ينقر #xSave");
 onC("open"); eq(clicked.length,1,"زرّ معطّل لا يُنقَر");
 onC("new");  eq(clicked.length,1,"زرّ غائب لا يُنقَر ولا يرمي");
 eq(P.runCommand("__proto__",doc),false,"اسمٌ من النموذج الأوّل مرفوض");
 eq(P.runCommand("rm -rf",doc),false,"أمرٌ مجهول مرفوض");
 onO({name:"a.cdraft",data:"{}"}); eq(JSON.stringify(opens),'[["{}","a.cdraft"]]',"النصّ والاسم");
 onO({name:"b",data:5}); onO(null); eq(opens.length,1,"حمولةٌ ليست نصّاً تُهمَل");
 delete globalThis.window;
});

group("وسائط الإطلاق",()=>{
 /* المسارات تُحلَّل بـresolve ليصحّ الاختبار على ويندوز ولينكس معاً */
 const R=resolve;
 const files={[R("/w/a.cdraft")]:10,[R("/w/b.JSON")]:10,
  [R("/w/big.cdraft")]:MAX_OPEN_BYTES+1,[R("/w/c.txt")]:1};
 const st=p=>{ if(!(p in files))throw new Error("ENOENT");
  return {isFile:()=>true,size:files[p]} };
 eq(findProjectArg(["app.exe","/w/a.cdraft"],"/",st),R("/w/a.cdraft"),"مسار مطلق");
 eq(findProjectArg(["app.exe","a.cdraft"],"/w",st),R("/w/a.cdraft"),"نسبيٌّ إلى cwd");
 eq(findProjectArg(["app.exe","b.JSON"],"/w",st),R("/w/b.JSON"),"الامتداد غير حسّاس للحالة");
 eq(findProjectArg(["app.exe","--flag","/w/a.cdraft"],"/",st),R("/w/a.cdraft"),"يتخطّى الخيارات");
 eq(findProjectArg(["app.exe","/w/c.txt"],"/",st),null,"امتدادٌ غير معروف");
 eq(findProjectArg(["app.exe","/w/none.cdraft"],"/",st),null,"غير موجود");
 eq(findProjectArg(["app.exe","/w/big.cdraft"],"/",st),null,"أكبر من السقف");
 eq(findProjectArg(["/w/a.cdraft"],"/",st),null,"الوسيط الأوّل هو البرنامج نفسه");
 eq(findProjectArg(null,"/",st),null,"argv غير مصفوفة");
});

/* «فتح» من القائمة يمرّ بنافذة النظام عبر الجسر لا بنقر <input type=file>:
   Chromium يحجب ذاك بلا إيماءةِ مستخدمٍ في الصفحة، ونقرةُ الفأرة على قائمة الغلاف ليست إيماءةً فيها. */
await groupAsync("فتح من القائمة: نافذة النظام",async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));
 const mk=(openFile)=>{
  const clicked=[], opens=[]; let onC=null;
  globalThis.window={civilDesktop:{isDesktop:true,onCommand:f=>{onC=f},onOpenFile:()=>{},ready:()=>{},openFile}};
  const doc={querySelector:s=>s==="#xOpen"?{click:()=>clicked.push(s),disabled:false}:null};
  P.bindDesktop((t,n)=>opens.push([t,n]),doc);
  return {clicked,opens,cmd:c=>onC(c)};
 };
 /* نجاح: النصّ والاسم يصلان openText، ولا نقر على الزرّ */
 let args=null;
 let t=mk(async(f,b)=>{args=[f,b]; return {ok:true,name:"p.cdraft",data:"\uFEFF{\"a\":1}"}});
 t.cmd("open"); await tick(); await tick();
 eq(JSON.stringify(t.opens),'[["{\\"a\\":1}","p.cdraft"]]',"النصّ بلا BOM والاسم");
 eq(t.clicked.length,0,"لا نقرَ على #xOpen (يحجبه Chromium)");
 ok(args&&args[1]===false,"قراءةٌ نصّية لا ثنائية");
 const ext=args[0][0].extensions;
 ok(["cdraft","json","mistar"].every(x=>ext.includes(x)),"المرشّح يقبل cdraft وjson وmistar");
 ok(args[0].some(f=>f.extensions.includes("*")),"وخيار «كل الملفات»");
 /* إلغاء المستخدم: لا openText ولا نقر */
 t=mk(async()=>({ok:false,canceled:true}));
 t.cmd("open"); await tick(); await tick();
 eq(t.opens.length+t.clicked.length,0,"الإلغاء لا يفعل شيئاً");
 /* تعذّرت القراءة (حجمٌ زائد): openText تُستدعى بـnull لتُبلِّغ */
 t=mk(async()=>({ok:false,error:"size"}));
 t.cmd("open"); await tick(); await tick();
 eq(JSON.stringify(t.opens),'[[null,""]]',"الفشل يُبلَّغ عبر openText(null)");
 /* رفضُ الوعد ⇒ النقر القديم */
 t=mk(async()=>{throw new Error("ipc")});
 t.cmd("open"); await tick(); await tick();
 eq(t.clicked.join(),"#xOpen","عطلُ الجسر ⇒ ينقلب إلى نقر #xOpen");
 /* لا openFile في الجسر (نسخةٌ قديمة) ⇒ النقر القديم */
 t=mk(undefined);
 t.cmd("open"); await tick();
 eq(t.clicked.join(),"#xOpen","بلا openFile ⇒ نقر");
 /* save لا يتأثّر */
 t=mk(async()=>({ok:true,name:"x",data:"{}"}));
 t.cmd("save"); await tick();
 eq(t.opens.length,0,"save لا يفتح شيئاً");
 delete globalThis.window;
});
summary();
