/* ═══ تحذيرُ المخطّطِ الكبير ═══ (المرحلة ٥ من خطّة الفحص · مخاطرة P4-006)
   يُقال مرّةً عند كلِّ عتبة · لا يتكرّر مع كلِّ تعديل · يعود إن نزل
   الحجمُ تحت ٨٠٪ ثم عبرها ثانيةً · والتقديرُ بالثواني من القياسِ المعلن.
   التشغيل:  node js/tests/bigplan.test.js                              */
import {shim,group,ok,eq,summary} from "./harness.js";
import {readFileSync} from "node:fs";
shim();
const ST=await import("../core/state.js");
const {S,newState}=ST;

group("العتباتُ والتكرار",()=>{
 eq(ST.sizeNotice(100),null,"صغيرٌ: لا شيء");
 const a=ST.sizeNotice(5000); ok(a&&a.sev==="in","5000: تنبيهٌ معلوماتيّ");
 ok(a&&/5000 عنصراً/.test(a.msg)&&/0\.8 ث/.test(a.msg),"يذكر العددَ والزمنَ المقدَّر (5000×165 م.ث/ألف ≈ 0.8 ث)");
 eq(ST.sizeNotice(5200),null,"ولا يتكرّر مع التعديل التالي");
 const b=ST.sizeNotice(10000); ok(b&&b.sev==="wr","10000: تحذير");
 ok(b&&/قسّمه/.test(b.msg),"ويقترح ما يُفعَل");
 eq(ST.sizeNotice(10500),null,"ولا يتكرّر");
 eq(ST.sizeNotice(3000),null,"نزل تحت ٨٠٪ من العتبتين: صامت");
 ok(ST.sizeNotice(5100),"وعاد للتسليح: يُقال ثانيةً");
});
group("القفزُ مباشرةً إلى ١٠ آلاف: رسالةٌ واحدةٌ لا اثنتان",()=>{
 ST.sizeNotice(0);
 ok(ST.sizeNotice(12000).sev==="wr","التحذير"); eq(ST.sizeNotice(12000),null,"ثم صمت");
 eq(ST.sizeNotice(6000),null,"ونزولٌ إلى 6000 (فوق 80٪ من 5000) لا يُعيد التنبيه الأصغر");
});
group("planSize يعدّ كلَّ المجموعات",()=>{
 newState(); eq(ST.planSize(),0,"مشروعٌ جديد = 0");
 ST.COLLS.forEach(c=>S[c].push({id:"x"})); eq(ST.planSize(),ST.COLLS.length,"عنصرٌ في كلِّ مجموعة");
 newState();
});
group("موصولٌ في المواضع الثلاثة: بعد التعديل · عند الإقلاع · عند الفتح",()=>{
 const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
 const ins=readFileSync(new URL("../ui/inspector.js",import.meta.url),"utf8");
 eq((app.match(/sizeNotice\(\)/g)||[]).length,2,"app.js: الخطّافُ والإقلاع");
 ok(/sizeNotice\(\)/.test(ins),"inspector.js: فتحُ ملفّ");
 eq(ST.BIG_PLAN.msPerK,165,"والمعامل يطابق القياس المعلن في KNOWN-DEFECTS");
});
process.exit(summary()?1:0);
