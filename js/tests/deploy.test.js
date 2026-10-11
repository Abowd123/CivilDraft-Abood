/* ═══ جاهزيةُ النشر ═══ القسم 06
   P6-001 أيقوناتٌ 192/512 وmaskable وid وorientation · P6-002 العاملُ
   وقائمةُ CORE والترقيةُ تصل المستخدم · P6-003 حزمةُ نشرٍ نظيفةٌ
   تُتحقَّق بنيوياً · P6-005 الرؤوسُ الثلاثة · P6-006 التجميعُ اختياريّ ·
   P6-007 404.html · P6-008 الوصفُ وOG · P6-010 إصدارٌ واحدٌ في ثلاثة
   مواضع · P6-011 وثيقةُ النشر والتراجع.
   ولا مضيفٌ حيّ: هذا فحصُ ملفّاتٍ لا فحصُ رؤوسٍ على الشبكة —
   قائمةُ ما بعد النشر في docs/DEPLOY.md §٤.
   التشغيل:  node js/tests/deploy.test.js                           */
import {readFileSync,existsSync,statSync,readdirSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {group,groupAsync,ok,eq,summary} from "./harness.js";
const ROOT=join(fileURLToPath(new URL(".",import.meta.url)),"..","..");
const rd=p=>readFileSync(join(ROOT,p),"utf8");
const has=p=>existsSync(join(ROOT,p));

/* نزعُ التعليقات قبل الحكم على محتوى ملفٍّ: التعليقاتُ شرحٌ لا سلوك،
   والمطابقةُ عليها تُنتج فشلاً كاذباً. ثلاثةُ أنماطٍ تكفي هنا. */
const noCmt=(t,kind)=>kind==="js"
 ? t.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"")
 : kind==="html"
 ? t.replace(/<!--[\s\S]*?-->/g,"")
 : t.replace(/^\s*#.*$/gm,"");

import {VERSION,CACHE_NAME,VERSION_LABEL} from "../core/version.js";

/* استيرادٌ حقيقيٌّ لا قراءةُ نصٍّ فقط: الثوابتُ الثلاثةُ تُستهلَك هنا
   فعلاً، فتُنسَب لها تغطيةٌ سلوكيةٌ ولا تحتاج عذراً في الدفتر. */
group("P6-010أ · الثوابتُ الثلاثةُ كما صُدِّرت",()=>{
 ok(/^\d+\.\d+\.\d+$/.test(VERSION),`VERSION semver (${VERSION})`);
 eq(CACHE_NAME,`civildraft-v${VERSION}`,"واسمُ الكاش مشتقٌّ منه");
 eq(VERSION_LABEL,`CivilDraft ${VERSION}`,"ونصُّ العرض يحمله");
 ok(!CACHE_NAME.includes("undefined"),"ولا «undefined» في الاسم");
});

group("P6-010 · إصدارٌ واحدٌ في ثلاثة مواضع",()=>{
 ok(has("js/core/version.js"),"ثابتُ الإصدار موجود");
 const v=rd("js/core/version.js");
 const m=/export const VERSION="([^"]+)"/.exec(v);
 ok(!!m,"ومُصدَّرٌ بصيغةٍ مقروءة");
 const V=m[1];
 ok(/^\d+\.\d+\.\d+$/.test(V),`وصيغتُه semver (${V})`);
 const pkg=JSON.parse(rd("package.json"));
 eq(pkg.version,V,"package.json يطابقه");
 const sw=rd("sw.js");
 const ms=/const VERSION="([^"]+)"/.exec(sw);
 ok(!!ms,"وsw.js يحمل الرقمَ نصّاً (عاملٌ بلا وحدات)");
 eq(ms[1],V,"ويطابقه حرفاً — فلا ينحرف أحدُهما");
 /* واسمُ الكاش مشتقٌّ لا مكتوبٌ بيد */
 ok(/const CACHE=`civildraft-v\$\{VERSION\}`/.test(sw),
  "واسمُ الكاش مشتقٌّ من الرقم");
 ok(/CACHE_NAME/.test(v),"والثابتُ يُصدِّر اسمَ الكاش كذلك");
 /* ويظهر في الواجهة */
 const app=rd("js/app.js");
 ok(/VERSION_LABEL/.test(app),"والواجهةُ تقرأ نصَّ العرض");
 ok(/stVer/.test(app)&&/stVer/.test(rd("js/ui/statusbar.js")),
  "وشارةُ الإصدار في شريط الحالة");
 ok(/dataset\.ver=VERSION/.test(app),"ويُوسَم به <html> للتشخيص");
});

group("P6-001 · أيقوناتُ PWA والبيان",()=>{
 const man=JSON.parse(rd("manifest.json"));
 ok(!!man.id,"id معلَن");
 ok(!!man.orientation,"وorientation");
 ok(!!man.description,"ووصف");
 const by=s=>man.icons.filter(i=>i.sizes===s);
 ok(by("192x192").length>=1,"أيقونة 192");
 ok(by("512x512").length>=1,"وأيقونة 512");
 const mask=man.icons.filter(i=>i.purpose==="maskable");
 ok(mask.length>=2,`وmaskable (${mask.length})`);
 ok(mask.some(i=>i.sizes==="192x192")&&mask.some(i=>i.sizes==="512x512"),
  "بمقاسَيها");
 /* والملفّاتُ موجودةٌ فعلاً وبالمقاس الصحيح — تُقرأ ترويسةُ PNG */
 const png=p=>{
  const b=readFileSync(join(ROOT,p));
  ok(b[0]===0x89&&b[1]===0x50,`${p}: ترويسةُ PNG صحيحة`);
  return {w:b.readUInt32BE(16),h:b.readUInt32BE(20),bytes:b.length};
 };
 man.icons.filter(i=>/\.png$/.test(i.src)).forEach(i=>{
  ok(has(i.src),`${i.src} موجود`);
  if(!has(i.src))return;
  const d=png(i.src);
  const [w,h]=i.sizes.split("x").map(Number);
  eq(d.w,w,`${i.src}: العرض ${w}`);
  eq(d.h,h,`${i.src}: الارتفاع ${h}`);
  ok(d.bytes>500,`${i.src}: ليس فارغاً (${d.bytes} بايت)`);
 });
 /* وسكربتُ التوليد موجودٌ ويُعلن أهدافَه */
 ok(has("scripts/gen-icons.js"),"وسكربتُ التوليد موجود");
 const g=rd("scripts/gen-icons.js");
 ok(/rsvg-convert/.test(g)&&/magick/.test(g)&&/cairosvg/.test(g),
  "ويجرّب ثلاثَ أدوات");
 ok(/process\.exit\(1\)/.test(g),"ويفشل بلا أداةٍ بدل ملفٍّ فارغ");
 ok(/0\.8/.test(g),"وmaskable يُصغَّر إلى المنطقة الآمنة 80%");
});

await groupAsync("P6-002 · العاملُ وقائمةُ CORE والترقية",async()=>{
 const sw=rd("sw.js");
 /* CORE مولَّدةٌ ومحدَّثة */
 const G=await import("../../scripts/gen-sw-core.js");
 const want=G.coreList();
 ok(want.length>100,`${want.length} مورداً في CORE — لا خمسةٌ`);
 const missing=want.filter(u=>!sw.includes(JSON.stringify(u)));
 eq(missing.length,0,"وكلُّها مكتوبةٌ في sw.js — القائمةُ محدَّثة"
  +(missing.length?" — "+missing.slice(0,3).join(" · "):""));
 /* الوحداتُ الكسولةُ الأربعُ داخلةٌ الآن */
 ["./js/guide/dockPane.js","./js/guide/usage.js",
  "./js/ui/ribbon/editor.js","./js/ui/viewport.js"].forEach(u=>
  ok(sw.includes(JSON.stringify(u)),`الكسولةُ ${u} مخزَّنة`));
 /* وCSS كلُّه والأيقونات */
 readdirSync(join(ROOT,"css")).filter(n=>/\.css$/.test(n))
  .forEach(n=>ok(sw.includes(`"./css/${n}"`),`css/${n} في CORE`));
 /* التثبيتُ مرِنٌ: لا addAll ذرّيّة */
 ok(!/addAll\(/.test(sw),"لا addAll — ملفٌّ فاشلٌ لا يُسقِط التثبيت");
 ok(/for\(const u of CORE\)/.test(sw),"بل إضافةٌ واحدةً واحدة");
 /* لا skipWaiting أعمى في install */
 const inst=/addEventListener\("install"[\s\S]*?\}\);/.exec(sw);
 ok(!!inst,"مستمعُ install موجود");
 /* نزعُ التعليقات أولاً: ذِكرُ skipWaiting في شرحٍ عربيٍّ ليس استدعاءً.
    بدون هذا النزع يفشل الاختبارُ على نصٍّ سليم — عيبٌ في الاختبار لا في المنتَج. */
 ok(!/skipWaiting/.test(noCmt(inst[0],"js")),
  "ولا skipWaiting فيه — الترقيةُ لا تُفرَض على صفحةٍ حيّة");
 ok(/type==="SKIP_WAITING"/.test(sw),"بل برسالةٍ من الصفحة بعد موافقة");
 ok(/SW_ACTIVATED/.test(sw),"ويُبلِّغ الصفحاتَ عند التفعيل");
 /* حذفُ القديم وحدُّ الحجم */
 ok(/k!==CACHE\)\.map\(k=>caches\.delete\(k\)\)/.test(sw),
  "والكاشاتُ القديمة تُحذَف");
 ok(/MAXENTRIES/.test(sw),"وحدٌّ لعدد المدخلات");
 /* والصفحةُ تسأل ثم تُعيد التحميلَ مرّةً */
 const app=rd("js/app.js");
 ok(/updatefound/.test(app),"والصفحةُ تنتظر updatefound");
 ok(/SKIP_WAITING/.test(app),"وترسل SKIP_WAITING بعد موافقة");
 ok(/controllerchange/.test(app),"وتُعيد التحميل عند تبدّل المتحكّم");
 ok(/reloaded/.test(app),"بحارسٍ يمنع حلقةَ إعادةِ تحميل");
});

await groupAsync("P6-003 · حزمةُ نشرٍ نظيفة",async()=>{
 ok(has("scripts/build-dist.js"),"سكربتُ البناء موجود");
 const B=await import("../../scripts/build-dist.js");
 const files=B.plan();
 ok(files.length>200,`${files.length} ملفاً في الخطّة`);
 /* ولا شيءَ ممّا لا يُنشَر */
 const leak=files.filter(f=>B.NEVER.some(x=>f===x||f.startsWith(x+"/")));
 eq(leak.length,0,"ولا ملفَّ ممّا لا يُنشَر"
  +(leak.length?" — "+leak.slice(0,3).join(" · "):""));
 ["js/tests","audit","package.json","CHANGES.md","KNOWN-DEFECTS.md",
  "scripts","serving","docs"].forEach(x=>
  ok(B.NEVER.includes(x),`«${x}» في قائمة الممنوع`));
 ok(files.includes("index.html"),"وindex.html داخل");
 ok(files.includes("404.html"),"و404.html");
 ok(files.includes("sw.js"),"وsw.js");
 ok(files.includes("manifest.json"),"وmanifest.json");
 ok(files.includes("_headers"),"و_headers");
 ok(files.some(f=>f.startsWith("icons/")),"والأيقونات");
 ok(files.some(f=>f.startsWith("css/")),"وCSS");
 ok(files.filter(f=>f.startsWith("js/")).length>180,"وكلُّ JS التطبيق");
 ok(!files.some(f=>f.startsWith("js/tests/")),"ولا اختبارٌ واحد");
 /* وnetlify ينشر dist لا الجذر */
 const nt=rd("netlify.toml");
 ok(/publish = "dist"/.test(nt),"netlify.toml ينشر dist");
 ok(/command =/.test(nt),"وله أمرُ بناء");
 ok(/gen-sw-core\.js --check/.test(nt),
  "والبناءُ يفشل إن كانت CORE قديمة");
 ok(/build-dist\.js/.test(nt),"ويُشغّل سكربتَ الحزمة");
});

group("P6-005 · الرؤوسُ الثلاثة في الموضعين",()=>{
 ["netlify.toml","_headers"].forEach(f=>{
  const s=rd(f);
  ok(/Permissions-Policy/.test(s),`${f}: Permissions-Policy`);
  ok(/Cross-Origin-Opener-Policy/.test(s),`${f}: COOP`);
  ok(/Strict-Transport-Security/.test(s),`${f}: HSTS`);
  ok(/same-origin/.test(s),`${f}: COOP = same-origin`);
  ok(/max-age=31536000/.test(s),`${f}: HSTS سنة`);
  ok(!/preload/.test(noCmt(s,"conf")),`${f}: ولا preload — قرارُ مالكِ النطاق`);
  /* وأقلُّ صلاحية: لا "*" في Permissions-Policy */
  const pp=/Permissions-Policy\s*[:=]\s*"?([^"\n]+)/.exec(s);
  ok(!!pp,`${f}: القيمةُ مقروءة`);
  ok(!/\*/.test(pp[1]),`${f}: ولا "*" عمياء`);
  ["camera=()","microphone=()","geolocation=()"].forEach(k=>
   ok(pp[1].includes(k),`${f}: ${k}`));
  /* والقديمةُ كما كانت */
  ok(/X-Frame-Options/.test(s),`${f}: X-Frame-Options باقٍ`);
  ok(/X-Content-Type-Options/.test(s),`${f}: nosniff باقٍ`);
  ok(/Referrer-Policy/.test(s),`${f}: Referrer-Policy باقٍ`);
 });
});

group("P6-007 · صفحةُ 404 بالعربية",()=>{
 ok(has("404.html"),"الملفُّ موجود");
 const s=rd("404.html");
 ok(/lang="ar"/.test(s)&&/dir="rtl"/.test(s),"عربيٌّ وRTL");
 ok(/٤٠٤|404/.test(s),"ويذكر الرمز");
 ok(/href="\.\/"/.test(s),"وفيه طريقُ العودة");
 ok(/noindex/.test(s),"ولا تُفهرَس");
 /* لا سكربتَ ولا style= — نفسُ سياسة CSP */
 ok(!/<script/i.test(s),"ولا سكربت");
 ok(!/\sstyle\s*=/.test(noCmt(s,"html")),"ولا سمةَ style");
 /* ولا إعادةَ توجيهٍ عمياء تُخفي أصلاً مفقوداً */
 const nt=rd("netlify.toml");
 ok(!/status = 200/.test(nt),"ولا SPA fallback أعمى في netlify.toml");
 ok(!has("_redirects")||!/200/.test(rd("_redirects")),"ولا في _redirects");
});

group("P6-008 · بياناتُ الصفحة",()=>{
 const s=rd("index.html");
 ok(/<meta name="description" content="[^"]{40,}/.test(s),"وصفٌ ذو معنى");
 ok(/rel="canonical"/.test(s),"وcanonical");
 ["og:type","og:title","og:description","og:url","og:image","og:site_name"]
  .forEach(k=>ok(s.includes(k),`${k}`));
 ["twitter:card","twitter:title","twitter:description","twitter:image"]
  .forEach(k=>ok(s.includes(k),`${k}`));
 ok(/og:image" content="icons\/icon-512\.png"/.test(s),
  "وog:image يشير إلى أيقونةٍ موجودة");
 ok(has("icons/icon-512.png"),"والأيقونةُ موجودةٌ فعلاً");
 /* وما كان موجوداً باقٍ */
 ok(/lang="ar"/.test(s)&&/dir="rtl"/.test(s),"وlang/dir باقيان");
 ok(/theme-color/.test(s),"وtheme-color");
 ok(/name="viewport"/.test(s),"وviewport");
});

group("P6-006 · التجميعُ اختياريٌّ لا إجباريّ",()=>{
 const b=rd("scripts/build-dist.js");
 ok(/--bundle/.test(b),"خيارُ --bundle معلَن");
 ok(/esbuild/.test(b),"ويستعمل esbuild إن توفّر");
 ok(/لا تجميع/.test(b),"ويُكمل بلا تجميعٍ إن لم يتوفّر");
 ok(/modulepreload/.test(b),"ويُزيل preload من dist المجمَّع");
 const pkg=JSON.parse(rd("package.json"));
 ok(pkg.scripts["build"],"وأمرُ build معلَن");
 ok(pkg.scripts["build:bundle"],"وbuild:bundle");
 /* والتشغيلُ غيرُ المجمَّع باقٍ */
 ok(pkg.scripts["serve"],"والخدمةُ المحلّية باقية");
 ok(/modulepreload/.test(rd("index.html")),
  "وindex.html الأصليُّ ما زال بـpreload — التطويرُ غيرُ مجمَّع");
});

group("P6-011 · وثيقةُ النشر والتراجع",()=>{
 ok(has("docs/DEPLOY.md"),"الوثيقةُ موجودة");
 const d=rd("docs/DEPLOY.md");
 ok(d.length>2000,"وليست سطرَين");
 ["قبل النشر","rollback","التراجع","service worker","unregister",
  "قائمةُ فحصٍ بعد النشر","kill switch"].forEach(k=>
  ok(new RegExp(k,"i").test(d),`تذكر «${k}»`));
 ok(/caches\.delete/.test(d),"وفيها أمرُ تنظيف الكاش");
 ok(/unregister/.test(d),"وإلغاءُ تسجيل العامل");
 ok(/لا تمسح بيانات المستخدم/.test(d),
  "وتحذّر من مسح بيانات المستخدم");
 ok(/المعاينة/.test(d),"وتُلزِم تجربةَ التراجع على المعاينة");
 /* وعددُ بنود قائمة الفحص معقول */
 const boxes=(d.match(/- \[ \]/g)||[]).length;
 ok(boxes>=12,`وقائمةُ الفحص فيها ${boxes} بنداً`);
});

process.exit(summary()?1:0);
