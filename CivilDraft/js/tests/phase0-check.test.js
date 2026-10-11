/* ═══ فحص المرحلة ٠ الموسَّع ═══
   يكمل ما لا تغطّيه dom.js وcsp.test.js:
     ١. node --check على كل ملفّات js تحت js/ (بحثاً متعمّقاً) — لا خطأ صياغةٍ صامت.
     ٢. كل مسار import نسبي في كل ملفٍّ موجودٌ فعلاً على القرص.
     ٣. كل رابط CSS وكل أيقونة (favicon/apple-touch-icon) في index.html
        مذكورةٌ ↔ موجودة، بالاتجاهين.
     ٤. "mistar" لا يظهر إلا في ملفّاتٍ/سطورٍ تخصّ طبقة الترحيل
        (توافق القراءة مع الاسم القديم) — قائمة السماح صريحة ومُعلَّلة،
        لا رخصة صامتة.
   الفحوصُ الأخرى المطلوبة (أفعال الشريط في ACT، data-* المطلوبة،
   style/style.cssText بعد CSP) موجودةٌ فعلاً في dom.js وcsp.test.js
   فلا تُكرَّر هنا.

   التشغيل:  node js/tests/phase0-check.test.js                    */
import {spawnSync} from "node:child_process";
import {readdirSync,readFileSync,statSync,existsSync} from "node:fs";
import {join,dirname,relative,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {group,ok,eq,summary} from "./harness.js";

const HERE=fileURLToPath(new URL(".",import.meta.url));
const ROOT=join(HERE,"..","..");
const REL=p=>relative(ROOT,p).split(sep).join("/");

const walk=(d,out)=>{
 let E=[];
 try{E=readdirSync(d)}catch(e){return out}
 E.forEach(n=>{
  if(n==="node_modules"||n[0]==="."||n==="dist"||n==="build"
   ||n==="coverage")return;
  const p=join(d,n);
  let st=null;
  try{st=statSync(p)}catch(e){return}
  if(st.isDirectory()){walk(p,out); return}
  if(/\.js$/.test(n))out.push(p);
 });
 return out;
};
const FILES=walk(join(ROOT,"js"),[])
 .concat(walk(join(ROOT,"serving"),[])).sort();
const SRC=new Map(FILES.map(p=>[REL(p),readFileSync(p,"utf8")]));

group("node --check: كل ملفّات js/**/*.js صياغتها صحيحة",()=>{
 ok(FILES.length>50,`${FILES.length} ملفّاً مفحوصاً`);
 const bad=[];
 FILES.forEach(p=>{
  const r=spawnSync(process.execPath,["--check",p],{encoding:"utf8"});
  if(r.status!==0)bad.push(REL(p)+": "+(r.stderr||"").split("\n")[0]);
 });
 eq(bad.length,0,"لا خطأ صياغةٍ في أيّ ملفّ"+
  (bad.length?" — "+bad.join(" · "):""));
});

group("كل مسار import نسبي موجودٌ فعلاً",()=>{
 const missing=[];
 SRC.forEach((txt,rel)=>{
  const dir=dirname(rel);
  const specs=[];
  const RE1=/\bfrom\s*["']([^"']+)["']/g;
  const RE2=/\bimport\(\s*["']([^"']+)["']\s*\)/g;
  let m;
  while((m=RE1.exec(txt)))specs.push(m[1]);
  while((m=RE2.exec(txt)))specs.push(m[1]);
  specs.forEach(rawSpec=>{
   if(rawSpec[0]!==".")return; /* بلا استيراداتٍ نسبية لا تعنينا هنا */
   /* معامل استعلامٍ (?...) في import() الديناميكي هو كسرُ ذاكرةٍ
      تخزينٍ مؤقتةٍ متعمَّد (نسخةٌ جديدة من الوحدة) لا جزءٌ من المسار —
      يُقطَع قبل فحص وجود الملفّ، وإلا اعتُبر «مسارٌ مكسور» ما هو إلا
      وسمٌ صالح. */
   const spec=rawSpec.split("?")[0].split("#")[0];
   const stack=dir.split("/").filter(x=>x&&x!==".");
   spec.split("/").forEach(seg=>{
    if(seg===""||seg===".")return;
    if(seg==="..")stack.pop(); else stack.push(seg);
   });
   let resolved=stack.join("/");
   const candidates=[resolved,resolved+".js",resolved+"/index.js"];
   if(!candidates.some(c=>existsSync(join(ROOT,c))))
    missing.push(`${rel} → ${spec}`);
  });
 });
 eq(missing.length,0,"لا مسار استيرادٍ مكسور"+
  (missing.length?" — "+missing.join(" · "):""));
});

group("index.html: كل رابط CSS/أيقونة موجودٌ، وكل ملفّ css مربوط",()=>{
 const html=readFileSync(join(ROOT,"index.html"),"utf8");
 const links=[...html.matchAll(/<link\s+rel="(?:stylesheet|icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)]
  .map(m=>m[1]);
 ok(links.length>=17,`روابط الأنماط/الأيقونات (${links.length})`);
 links.forEach(h=>ok(existsSync(join(ROOT,h)),`${h} موجود على القرص`));
 const cssFiles=readdirSync(join(ROOT,"css")).filter(n=>n.endsWith(".css"));
 cssFiles.forEach(n=>ok(links.includes("css/"+n),`css/${n} مربوطٌ في index.html`));
 ["favicon.ico","favicon.svg","apple-touch-icon.png"].forEach(n=>
  ok(existsSync(join(ROOT,n))&&links.includes(n),`${n} مربوطٌ وموجود`));
});

group('"mistar" لا يظهر إلا في طبقة الترحيل صراحةً',()=>{
 /* كل سطرٍ فيه "mistar" خارج js/tests يجب أن يكون مفتاح/قاعدة توافقٍ
    قديمة صريحة — لا استخدامٌ فعّالٌ جديد (مثل الكتابة في ملفٍّ محفوظٍ
    حديثاً). القائمة أدناه ملفّاتُ الترحيل المعروفة؛ أيّ ظهورٍ خارجها
    يُفشِل الفحص فوراً كي لا يتسرّب الاسم القديم صامتاً. */
 const MIGRATION_FILES=new Set([
  "js/core/code.js",            // OLD_K: مفتاح تخزينٍ قديم يُقرأ فقط
  "js/core/migrate-autosave.js",// اسم قاعدة IndexedDB القديمة
  "js/io/project.js",           // قبول __app القديم عند الاستيراد فقط
  "js/io/snaps.js",             // مفتاح لقطاتٍ قديم يُقرأ فقط
  "js/io/store.js",             // مفاتيح/قاعدة توافقٍ قديمة تُقرأ فقط
  "js/ui/store.js",             // مفتاح واجهةٍ قديم يُقرأ فقط
  "js/ui/tour.js",              // مفتاح جولةٍ قديم يُقرأ فقط
  "js/app.js",                  // تعليقٌ يشرح الترحيل، لا كودٌ فعّال
  "js/ai/net.js",                // مفتاح تخزين مساعد الذكاء القديم يُقرأ فقط
  "js/core/pricing.js",          // مفتاح تسعيرٍ قديم يُقرأ فقط
  "js/tools/registry.js",        // مفتاح خيارات أدواتٍ قديم يُقرأ فقط
  "js/ui/ribbon/custom.js",      // مفتاح تخصيص الشريط القديم mistar.ribbon يُقرأ فقط
 ]);
 const leaks=[];
 SRC.forEach((txt,rel)=>{
  if(rel.startsWith("js/tests/"))return; /* الاختبارات تُحاكي الملفّات القديمة عمداً */
  if(!/mistar/i.test(txt))return;
  if(MIGRATION_FILES.has(rel))return;
  leaks.push(rel);
 });
 eq(leaks.length,0,"لا ظهور لـ«mistar» خارج طبقات الترحيل المُعلَنة"+
  (leaks.length?" — "+leaks.join(" · "):""));
 /* وحصر إضافي: toJSON (الحفظ) لا يكتب "mistar" — القراءة فقط تقبلها */
 const proj=SRC.get("js/io/project.js")||"";
 const toJSONBody=proj.slice(proj.indexOf("export function toJSON"),
  proj.indexOf("export function fromJSON"));
 ok(!/mistar/.test(toJSONBody),
  "toJSON (حفظ ملفّ جديد) لا يكتب __app:\"mistar\"");
});

process.exit(summary()?1:0);
