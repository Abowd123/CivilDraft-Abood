/* ═══ مشغّل الملفّات ═══ المصدر الوحيد للحقيقة: هذا الملف هو ما
   ينفّذه كلٌّ من "npm test" و"npm run test:all" — فلا قائمتين
   تنحرفان عن بعضهما (كان test القديم يعدّد 30 ملفاً يدوياً بينما
   اكتشاف هذا الملف كان يلتقط الملفّات المنتهية بـ.test.js فقط،
   فيفوته كل ملفّ اختبارٍ بالتسمية القديمة بلا .test.js).
   كل ملفٍّ عمليّةٌ منفصلة، لأن كلاً منها يختم بـprocess.exit —
   واستيرادُه في عمليّةٍ واحدة يقتلها عند أوّل ختام.
   الاكتشاف شاملٌ الآن: كل ملفّ .js في هذا المجلّد عدا ما في
   DENYLIST صراحةً (أدواتٌ مشتركة لا اختبارات قائمة بذاتها) وعدا
   هذا الملف نفسه. قائمة استثناءٍ صغيرة أسلم من قائمة تضمين تكبر
   وتُنسى — ملفّ اختبارٍ جديد يُشغَّل تلقائياً بلا تسجيل، وملفّ
   أداةٍ جديد غير قابل للتشغيل مباشرةً يُضاف هنا صراحةً. */
import {spawnSync} from "node:child_process";
import {readdirSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const SELF="all.js";
/* أدواتٌ مشتركة تُستورَد من ملفّات الاختبار ولا تُشغَّل مباشرةً.
   مُصدَّرةٌ لأن cover.js يتحقّق أن كل ملفّ اختبارٍ مُكتشَفٌ هنا فعلاً —
   لا قائمتين مستقلّتين يمكن أن تنحرفا. */
export const DENYLIST=["harness.js"];
/* دالّةٌ خالصة — قابلة للاستيراد من cover.js بلا تشغيل شيء.
   التنفيذُ الفعليّ (أسفل) مشروطٌ بأن يكون هذا الملف نقطة الدخول. */
export function discoverTestFiles(dir=here){
 return readdirSync(dir,{withFileTypes:true})
  .filter(d=>d.isFile()&&d.name.endsWith(".js"))
  .map(d=>d.name)
  .filter(f=>f!==SELF&&!DENYLIST.includes(f))
  .sort();
}

/* لا نُشغِّل شيئاً عند الاستيراد — فقط عند التشغيل المباشر
   (node js/tests/all.js). هذا يسمح لـ cover.js باستيراد
   discoverTestFiles/DENYLIST بأمانٍ دون تشغيل كل السويت. */
const isMain=process.argv[1]&&
 fileURLToPath(import.meta.url)===process.argv[1];
if(isMain){
 const files=discoverTestFiles();
 let bad=0;
 files.forEach(f=>{
  console.log(`\n══════════ ${f} ══════════`);
  const r=spawnSync(process.execPath,[join(here,f)],{stdio:"inherit"});
  if(r.status)bad++;
 });
 console.log(`\n${files.length-bad}/${files.length} ملفّاً نجح`);
 process.exit(bad?1:0);
}
