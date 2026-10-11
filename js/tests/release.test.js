/* ═══ النشر: workflow الإصدار والتحديث والتوقيع ═══
   node js/tests/release.test.js
   فحصُ ملفّاتٍ لا تشغيلُ GitHub: يحرس ما ينفلق بصمت إن انحرف —
   · الوسم v* وبناءٌ على windows-latest ورفعٌ إلى Release
   · التوقيع اختياريّ: يعمل بلا الأسرار ويفشل عند نصف زوج
   · لا سرّ مكتوباً في أي ملفّ (الأسرار تُقرأ من secrets فقط)
   · التحديث: الاعتمادية موجودة، المحمولة معطَّلة، وapp-update.yml مشروط */
import {readFileSync,existsSync,readdirSync,statSync} from "node:fs";
import {join,dirname,relative,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {group,ok,eq,summary} from "./harness.js";

const require=createRequire(import.meta.url);
const {inspect}=require("../../scripts/after-pack.cjs");
const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..","..");
const rd=f=>readFileSync(join(ROOT,f),"utf8");
const wf=rd(".github/workflows/release.yml");
const wfCode=wf.replace(/^\s*#.*$/gm,"");        /* التعليقات شرحٌ لا سلوك */

group("release.yml: المشغِّل والبيئة",()=>{
 ok(/on:\s*\n\s*push:\s*\n\s*tags:\s*\[\s*"v\*"\s*\]/.test(wfCode),"يعمل على دفع وسم v*");
 ok(!/branches:/.test(wfCode),"لا يعمل على دفع فرعٍ");
 ok(/runs-on:\s*windows-latest/.test(wfCode),"يبني على windows-latest");
 ok(/permissions:\s*\n\s*contents:\s*write/.test(wfCode),"صلاحيةٌ دنيا: contents: write");
 ok(/actions\/checkout@v4/.test(wfCode)&&/actions\/setup-node@v4/.test(wfCode),"checkout وsetup-node");
 ok(/node-version:\s*20/.test(wfCode),"Node 20 (كـ.node-version)");
 eq(rd(".node-version").trim(),"20","…ويطابق .node-version");
 ok(/timeout-minutes:/.test(wfCode),"مهلةٌ محدّدة");
});

group("release.yml: الحرّاس قبل البناء",()=>{
 ok(/GITHUB_REF_NAME#v/.test(wfCode)&&/package\.json/.test(wfCode),"الوسم يُقارَن بإصدار package.json");
 const iBuild=wfCode.indexOf("npx electron-builder"), iGate=wfCode.indexOf("npm run test:release");
 ok(iGate>0&&iGate<iBuild,"الفحوص قبل التغليف");
 ok(/npm run build\b/.test(wfCode),"npm run build (يفحص sw.js ثم يبني dist)");
 ok(wfCode.indexOf("npm run build")<iBuild,"dist يُبنى قبل التغليف");
 ok(/latest\.yml/.test(wfCode)&&/test -f release\/latest\.yml/.test(wfCode),"يفشل إن غاب latest.yml");
});

group("release.yml: التغليف والرفع",()=>{
 ok(/npx electron-builder --win --publish never/.test(wfCode),"electron-builder لا يرفع بنفسه");
 ok(/-c\.publish\.provider=github/.test(wfCode),"publish=github على سطر الأوامر");
 ok(/-c\.publish\.owner=\$\{\{\s*github\.repository_owner\s*\}\}/.test(wfCode)&&
    /-c\.publish\.repo=\$\{\{\s*github\.event\.repository\.name\s*\}\}/.test(wfCode),"owner/repo من سياق GitHub لا من نصٍّ ثابت");
 ok(/softprops\/action-gh-release@v2/.test(wfCode),"الرفع إلى Release");
 ["release/*.exe","release/*.blockmap","release/latest.yml","release/SHA256SUMS.txt"].forEach(p=>
  ok(wfCode.includes(p),"يُرفَع: "+p));
 ok(/fail_on_unmatched_files:\s*true/.test(wfCode),"يفشل إن لم يُوجَد ملفٌّ مطلوب");
 ok(/draft:\s*\$\{\{\s*env\.RELEASE_DRAFT\s*==\s*'true'\s*\}\}/.test(wfCode)&&/RELEASE_DRAFT:\s*"true"/.test(wfCode),"مسوّدةٌ افتراضياً");
 ok(/prerelease:\s*\$\{\{\s*contains\(github\.ref_name,\s*'-'\)\s*\}\}/.test(wfCode),"وسمٌ بشرطة (v1.2.0-beta.1) ⇒ prerelease");
 ok(/release:info -- --sums/.test(wfCode),"SHA256SUMS.txt يُولَّد");
});

group("release.yml: التوقيع اختياريّ",()=>{
 ok(/secrets\.CSC_LINK\s*!=\s*''/.test(wfCode)&&/secrets\.CSC_KEY_PASSWORD\s*!=\s*''/.test(wfCode),"يفحص وجود السرّين");
 ok(/signed=true/.test(wfCode)&&/signed=false/.test(wfCode),"مساران: موقَّع/غير موقَّع");
 ok(/::warning::/.test(wfCode),"تحذيرٌ حين لا توقيع");
 ok(/::error::أحد السرّين/.test(wfCode),"نصف الزوج ⇒ خطأ");
 ok(/CSC_LINK:\s*\$\{\{\s*steps\.sign\.outputs\.signed\s*==\s*'true'\s*&&\s*secrets\.CSC_LINK\s*\|\|\s*''\s*\}\}/.test(wfCode),
  "CSC_LINK يُمرَّر فقط حين signed=true (وإلا فارغ)");
 ok(/CSC_KEY_PASSWORD:\s*\$\{\{\s*steps\.sign\.outputs\.signed/.test(wfCode),"وكذلك CSC_KEY_PASSWORD");
 ok(/Get-AuthenticodeSignature/.test(wfCode)&&/if:\s*steps\.sign\.outputs\.signed\s*==\s*'true'/.test(wfCode),"تحقّقٌ من التوقيع حين يُفعَّل");
});

group("لا أسرار في المستودع",()=>{
 /* كل ذكرٍ لـsecrets. في workflow الإصدار هو مرجعٌ ${{ secrets.X }} لا قيمة */
 const refs=wf.match(/secrets\.[A-Z_]+/g)||[];
 ok(refs.length>0&&refs.every(r=>/^secrets\.(CSC_LINK|CSC_KEY_PASSWORD)$/.test(r)),"أسرارٌ معروفة فقط: "+[...new Set(refs)].join(" "));
 ok(!/(CSC_LINK|CSC_KEY_PASSWORD)\s*[:=]\s*["']?[A-Za-z0-9+\/]{12,}/.test(wfCode.replace(/\$\{\{[^}]*\}\}/g,"")),"لا قيمةٌ حرفيةٌ للسرّين");
 const gi=rd(".gitignore");
 ["*.pfx","*.p12",".env"].forEach(p=>ok(gi.split(/\r?\n/).includes(p),".gitignore يستثني "+p));
 /* مسحٌ للمستودع: لا شهادة ولا رمزٌ شبيه بـGitHub token */
 const SKIP=new Set(["node_modules",".git","dist","release"]);
 const bad=[]; const walk=d=>readdirSync(d).forEach(n=>{
  if(SKIP.has(n))return; const p=join(d,n), st=statSync(p);
  if(st.isDirectory())return walk(p);
  const rel=relative(ROOT,p).split(sep).join("/");
  if(/\.(pfx|p12|pem|key|cer|crt)$/i.test(n)||/^\.env/.test(n))bad.push("ملفّ سرّيّ: "+rel);
  if(st.size<2e6&&/\.(js|cjs|mjs|json|ya?ml|md|html|toml|txt)$/i.test(n)){
   const t=readFileSync(p,"utf8");
   if(/gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,}|-----BEGIN (RSA |EC |ENCRYPTED )?PRIVATE KEY-----/.test(t))bad.push("سرٌّ محتمل: "+rel);
  }
 });
 walk(ROOT);
 eq(bad.join(" | "),"","لا ملفّ سرّيّ ولا رمزٌ مكتوب");
});

group("التحديث: الاعتمادية والإعداد",()=>{
 const pj=JSON.parse(rd("package.json"));
 ok(pj.dependencies&&/^\^?6\./.test(pj.dependencies["electron-updater"]||""),"electron-updater ^6 في dependencies (لا devDependencies)");
 ok(!(pj.devDependencies||{})["electron-updater"],"…وليس في devDependencies");
 ok(/desktop\/updater\.cjs/.test(pj.scripts["check:desktop"]),"check:desktop يفحص updater.cjs");
 ok(existsSync(join(ROOT,"desktop","updater.cjs")),"desktop/updater.cjs موجود");
 const y=rd("electron-builder.yml").replace(/^\s*#.*$/gm,"");
 ok(!/^publish:/m.test(y),"لا قسم publish في yml (يمرَّر في CI فقط)");
 ok(/^  - desktop\/\*\*$/m.test(y),"desktop/** يُحزَم (يشمل updater.cjs)");
});

group("التحديث: ربط main.cjs",()=>{
 const m=rd("desktop/main.cjs");
 ok(/require\("\.\/updater\.cjs"\)/.test(m),"يستورد updater.cjs");
 ok(/التحقّق من التحديثات/.test(m),"عنصر قائمة «التحقّق من التحديثات»");
 ok(/if \(!maybeWelcome\(\)\) scheduleUpdateCheck\(\)/.test(m),"لا فحص فوق نافذة الترحيب");
 ok(/support\.enabled/.test(m),"الجدولة مشروطة بتفعيل الدعم");
 ok(!/autoUpdater/.test(m),"لا autoUpdater مباشرةً في main (كلّه خلف updater.cjs)");
 const u=rd("desktop/updater.cjs");
 ok(/autoDownload = false/.test(u),"autoDownload=false");
 ok(/PORTABLE_EXECUTABLE_FILE/.test(u),"كشفُ المحمولة");
 ok(/require\("electron-updater"\)/.test(u)&&!/^const .*require\("electron-updater"\)/m.test(u),"electron-updater يُحمَّل كسولاً");
});

group("after-pack: اعتمادياتُ الإنتاج (electron-updater)",()=>{
 const good=["/desktop","/desktop/main.cjs","/desktop/updater.cjs","/dist","/dist/index.html","/build","/build/icon.ico","/package.json"];
 const deps=["/node_modules","/node_modules/electron-updater/out/main.js","/node_modules/builder-util-runtime/README.md",
  "/node_modules/semver/docs/x.md","/node_modules/foo/dist/foo.js.map","/node_modules/lodash/js/tests/a.js"];
 eq(inspect([...good,...deps],{hasDeps:true}).problems.length,0,"محتوى node_modules الخارجي لا يُحاسَب (md/map/docs/tests)");
 ok(inspect([...good,...deps]).problems.length>0,"…وبلا اعتماديات يبقى node_modules مرفوضاً");
 ok(inspect([...good,"/dist/README.md"],{hasDeps:true}).problems.length>0,"md في dist يبقى مرفوضاً حتى مع الاعتماديات");
 ok(inspect([...good,"/dist/js/tests/a.js"],{hasDeps:true}).problems.length>0,"tests في dist يبقى مرفوضاً");
 ok(inspect([...good,"/js/app.js"],{hasDeps:true}).problems.length>0,"جذر js يبقى مرفوضاً");
});
summary();
