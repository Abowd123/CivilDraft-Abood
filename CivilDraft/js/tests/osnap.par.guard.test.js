/* ═══ R4 — حارس وضع «موازٍ» ═══
   القائمة قالت «معلنٌ في MODES ولا يُستدعى» ثم ثبت من القراءة
   أنه مُنفَّذ وموصول. فهذا حارسُ انحدارٍ يثبّت الطبقات الثلاث
   كي لا يعود الانطباعُ حقيقةً بلا اختبارٍ يفشل:
   ١ · الإعلان: par في MODES وله علامة parl واسمٌ في MNAME.
   ٢ · التنفيذ: مع أساسٍ (from) وS.os.par=1 تعيد osnap نتيجةً
       موازيةً على الشعاع الموازي للجدار — لا نقطةَ سقوطٍ صامتة.
   ٣ · الوصول التفاعليّ: لوحة الالتقاط تبني MODES كلها، وcanvas.js
       يمرّر وسيط الأساس from صراحةً إلى osnap — فالفرع له مستدعٍ
       حقيقيٌّ لا ترميزٌ ميت.
   التشغيل: node js/tests/osnap.par.guard.test.js */
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {shim,group,ok,summary} from "./harness.js";
shim();
const {S,newState}=await import("../core/state.js");
const {osnap,MODES,MNAME}=await import("../core/osnap.js");
const {addWall}=await import("../core/walls.js");
const APP=readFileSync(
 fileURLToPath(new URL("../app.js",import.meta.url)),"utf8");
const CANV=readFileSync(
 fileURLToPath(new URL("../ui/canvas.js",import.meta.url)),"utf8");

group("R4 — حارس وضع الموازي",()=>{

 /* ١ · الإعلان في جدول الأنماط */
 const pm=MODES.find(m=>m.k==="par");
 ok(!!pm,"par مُعلَنٌ في MODES");
 ok(pm&&pm.mk==="parl","علامته parl (يُميَّز في الرسم)");
 ok(pm&&pm.n&&MNAME.par,"له اسمٌ عربيٌّ ومدخلٌ في MNAME");

 /* ٢ · التنفيذ الفعليّ بنقطة أساس */
 newState();
 addWall([0,0],[3000,0],200,"int","c");
 const saved=S.os;
 S.os={end:0,mid:0,int:0,nod:0,per:0,par:1,near:0,ref:0};
 const r=osnap(1500,120,200,[500,100]);   /* الأساس [500,100] */
 S.os=saved;
 ok(r&&r.m==="par",`osnap تعيد m:"par" (فعلياً: ${r&&r.m})`);
 ok(r&&Math.hypot(r.p[0]-1500,r.p[1]-100)<5,
  "النقطة الناتجة على الشعاع الموازي للجدار");

 /* ٣ · الوصول التفاعليّ — قائمتان لا تكذبان بعضهما */
 ok(/MODES\.map/.test(APP),
  "لوحة الالتقاط (renderOsPop) تبني MODES كلها");
 ok(/osnap\([^()]*\bfrom\b[^()]*\)/.test(CANV),
  "canvas.js يمرّر وسيط الأساس from إلى osnap");
});

process.exit(summary()?1:0);
