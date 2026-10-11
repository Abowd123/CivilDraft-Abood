/* ═══ خيارٌ قائمتُه دالّة يُكتب في سطر الأوامر ═══ (كشفه فيديو «فيلا العرض»)
   «tb» ثم «kind=sym» كان يسقط بخطأ برمجيّ «(f.items || []).some is not a
   function»: قائمة أنواع الجدول تُبنى عند الطلب، وسطر الإدخال يعاملها مصفوفة.
   التشغيل:  node js/tests/opt-items-fn.test.js                          */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,summary} from "./harness.js";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const rig=toolRig(R,{});
ST.newState(); ST.ensureShape();
group("قائمةُ الخيار دالّة: تُقرأ عند الكتابة",()=>{
 const d=R.findTool("table"); const f=d.opts.find(o=>o.k==="kind");
 eq(typeof f.items,"function","قائمةُ أنواع الجدول دالّة (هذا ما كشف العيب)");
 rig.clear(); R.begin("tb");
 ok(R.feedText("kind=sym")===true,"«kind=sym» يُقبل");
 eq(R.ov("table","kind"),"sym","ويُضبط");
 eq(rig.errs().length,0,"بلا خطأ برمجيّ");
 let msg=""; try{R.feedText("kind=xyz")}catch(e){msg=e.message}
 const er=msg||rig.errs().join(" ");
 ok(/xyz/.test(er)&&/sym/.test(er),"والقيمةُ الخاطئة تُرفض برسالةٍ تعدّد الأنواع الصحيحة");
 R.cancel(true); R.setOpt("table","kind","open");
});
group("والقائمةُ المصفوفة كما كانت",()=>{
 R.begin("w"); ok(R.feedText("type=ext")===true,"type=ext للجدار"); R.cancel(true); R.setOpt("wall","type","int");
});
process.exit(summary()?1:0);
