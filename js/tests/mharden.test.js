/* ═══ حارس 2.2: M المتساهل لا يتسلّل إلى النواة ═══
   الواجهةُ التفاعلية (ui · tools) وحدها يحقّ لها استيراد M من
   units.js، لأنّ الحقلَ الفارغ هناك صفرٌ مقصود. والنواةُ (core)
   والذكاءُ (ai) والملفّاتُ (io) لا: كلُّ تحويلٍ هناك بـMx أو
   parse أو coords.PT، وما يفشل يُرفَض بسبب.

   الحارسُ لا يمنع كتابة الحرف M (modify.js فيه معاملٌ اسمه M) —
   يمنع استيراده من units.js في هذه المجلّدات. والدَّينُ المعلَن
   KNOWN فارغٌ الآن: أُصلح آخرُ مستورِدٍ (ai/ops.js) في 2.2.
   ويفحص كذلك أنّ التعريف المحلّي القديم «PT الصامتة» لم يعد.       */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
import {readFileSync,readdirSync,statSync} from "node:fs";
import {dirname,join,relative} from "node:path";
import {fileURLToPath} from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,"..","..");
const GUARDED=["js/core","js/ai","js/io"];
const KNOWN=new Set([]);      /* دَينٌ معلَن: فارغ */

const walk=(d,out)=>{
 readdirSync(d).forEach(n=>{
  const p=join(d,n);
  if(statSync(p).isDirectory())walk(p,out);
  else if(n.endsWith(".js"))out.push(p);
 });
 return out;
};
/* ما يُستورَد من units.js: {a,M,b} و{M as X}، وعلى أسطرٍ متعدّدة —
   وكذلك استيراد المجال import * as X من units.js متبوعاً باستعمال
   X.M( في الملفّ نفسه (تحايلٌ يفلت من فحص الأسماء المسمّاة) */
function importsM(src){
 const RE=/import\s*\{([^}]*)\}\s*from\s*["'][^"']*units\.js["']/g;
 let m;
 while((m=RE.exec(src))){
  const names=m[1].split(",").map(s=>s.trim().split(/\s+as\s+/)[0]);
  if(names.includes("M"))return true;
 }
 const NS=/import\s*\*\s*as\s+(\w+)\s*from\s*["'][^"']*units\.js["']/g;
 while((m=NS.exec(src))){
  const alias=m[1];
  const call=new RegExp("\\b"+alias+"\\.M\\(");
  if(call.test(src))return true;
 }
 return false;
}
const files=[];
GUARDED.forEach(d=>walk(join(root,d),files));
const rel=f=>relative(root,f).replace(/\\/g,"/");

group("mharden — لا استيرادَ لـM في core/ai/io",()=>{
 const bad=files.filter(f=>importsM(readFileSync(f,"utf8"))
  &&!KNOWN.has(rel(f))).map(rel);
 bad.forEach(f=>ok(false,`${f} يستورد M من units.js — استعمل Mx أو parse`));
 if(!bad.length)ok(true,`${files.length} ملفّاً محروساً — لا استيرادَ لـM`);
 ok(files.length>40,"الحارس يرى الملفّات فعلاً (لا مسحَ فارغ)");
});
group("mharden — الحارس يكشف ما يُفترَض أن يكشفه",()=>{
 /* عيّناتٌ تُبنى بلا سلسلة "from \"./units.js"" حرفية — وإلا طابقها
    فاحص المسارات النسبية (phase0-check) بوصفها استيراداً حقيقياً
    من ملفٍّ غير موجود بجوار هذا الاختبار. */
 const F="fr"+"om", U="./"+"units.js";
 ok(importsM(`import {a, M, b} ${F} "${U}";`),"استيرادٌ عاديّ");
 ok(importsM(`import {\n  clamp,\n  M\n} ${F} "../core/units.js";`),"متعدّد الأسطر");
 ok(importsM(`import {M as Mm} ${F} "../core/units.js"`),"مع as");
 ok(!importsM(`import {Mx, norm} ${F} "${U}";`),"Mx ليست M");
 ok(!importsM(`import {m2} ${F} "${U}"`),"m2 ليست M");
 /* واستيراد المجال: import * as X من units.js مع X.M( لاحقاً */
 ok(importsM(`import * as X ${F} "${U}";\nconst v=X.M(p);`),
  "استيراد المجال مع X.M( يُكشَف");
 ok(!importsM(`import * as X ${F} "${U}";\nconst v=X.Mx(p);`),
  "استيراد المجال مع X.Mx( لا يُكشَف خطأً");
});
group("mharden — لا PT صامتة في state.js",()=>{
 const st=readFileSync(join(root,"js/core/state.js"),"utf8");
 ok(/import\s*\{PT\}\s*from\s*"\.\/coords\.js"/.test(st),
  "state.js تستورد PT الصارمة من coords");
 ok(!/const PT\s*=/.test(st)&&!/function PT\s*\(/.test(st),
  "ولا تعرّف PT محلّية");
 ok(!/\(p&&\+p\[0\]\)\|\|0/.test(st),"وأثرُ الإسقاط الصامت زال");
 const ops=readFileSync(join(root,"js/ai/ops.js"),"utf8");
 ok(!/\bM\(/.test(ops.replace(/\/\*[\s\S]*?\*\//g,"")),
  "وops.js لا تنادي M (بعد حذف التعليقات)");
});
process.exit(summary()?1:0);
