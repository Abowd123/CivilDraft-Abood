/* ═══ دفعة 3.6 — حماية بيانات المشروع ═══
   node js/tests/phase3.6.test.js

   يفحص:
     • stairProps في props.js يُهرِّب كل رسالة من c.msgs فردياً
     • كل مواضع عرض بيانات المشروع تستعمل esc() أو textContent
     • أسماء المناطق/الطبقات/المرجع/الأبعاد/التأشير/المزوّد مُهرَّبة
     • historypanel.js: أسماء خطوات التاريخ مُهرَّبة داخل title="..."

   والغاية: أن تبقى بيانات المشروع آمنةً بعد كل تعديل — أي
   متغيّر مشروعٍ يُدرَج خاماً في قالبٍ يُسقِط هذا الملفّ فوراً.

   ملاحظة: هذا فحصٌ ساكن (يقرأ المصادر ولا يُنفِّذها) يمنع رجوع
   الأسطح غير المُهرَّبة، لا اختبارٌ سلوكيٌّ بتحقين فعليّ. */
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const rd=p=>readFileSync(join(ROOT,p),"utf8");
const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,"")
 .replace(/^\s*\/\/.*$/gm,"");

group("stairProps: كل رسالة تُهرَّب فردياً",()=>{
 const src=rd("js/ui/props.js");
 ok(/c\.msgs\.map\(esc\)\.join\("<br>"\)/.test(src),
  "c.msgs.map(esc).join(\"<br>\")");
 ok(!/c\.msgs\.join\("<br>"\)/.test(strip(src)),
  "لا c.msgs.join(\"<br>\") بلا تهريب");
});

group("props.js: مواضع عرض بيانات المشروع مُهرَّبة",()=>{
 const src=rd("js/ui/props.js");
 const need=[
  [/esc\(r\.name\)/,           "اسم المنطقة في الجدول (renderSched)"],
  [/esc\(x\.n\)/,              "اسم الطبقة (renderLays)"],
  [/esc\(l\.d\|\|nm\)/,        "وصف الطبقة (laysEditor)"],
  [/esc\(n\)/,                 "اسم حالة الطبقات (laysStates)"],
  [/esc\(w\.id\)/,             "معرّف الجدار (wallProps)"],
  [/esc\(o\.id\)/,             "معرّف الفتحة (openProps)"],
  [/esc\(a\.id\)/,             "معرّف المنطقة/التأشير (areaProps/annoProps)"],
  [/esc\(d\.id\)/,             "معرّف البُعد (dimProps)"],
  [/esc\(c\.id\)/,             "معرّف السلسلة/العمود (chainProps/colProps)"],
  [/esc\(fixName\(f\)\)/,      "اسم الأداة الصحية (fixProps)"],
  [/esc\(summary\(G\)\)/,      "ملخّص التحديد (multiProps)"],
  [/esc\(d\.n\)/,              "تسمية الحقل (fldLab)"],
  [/esc\(d\.hint\)/,           "تلميح الحقل (fldTip)"]
 ];
 need.forEach(([re,label])=>{ ok(re.test(src),label); });
});

group("inspector.js: مواضع عرض بيانات المشروع مُهرَّبة",()=>{
 const src=rd("js/ui/inspector.js");
 const need=[
  [/esc\(f\.msg\)/,             "رسالة الفاحص (renderFindings)"],
  [/esc\(SEV\[f\.sev\]\)/,      "شِدّة الملاحظة"],
  [/esc\(r\.name\|\|"بلا اسم"\)/, "اسم المرجع (renderRef)"],
  [/esc\(r\.units\)/,           "وحدة المرجع"],
  [/esc\(r\.enc\)/,             "ترميز المرجع"],
  [/esc\(n\)/,                  "اسم طبقة DXF"],
  [/esc\(d\.n\)/,               "تسمية اشتراط (renderCodeBox)"],
  [/esc\(d\.u\)/,               "وحدة اشتراط"]
 ];
 need.forEach(([re,label])=>{ ok(re.test(src),label); });
});

group("ai.js: مواضع عرض بيانات المزوّد مُهرَّبة",()=>{
 const src=rd("js/ui/ai.js");
 const need=[
  [/esc\(AI\.model\)/,          "موديل المزوّد"],
  [/esc\(hostOf\(\)\)/,         "مضيف المزوّد"],
  [/esc\(PLAN\.prose\)/,        "نصّ الخطّة"],
  [/esc\(L\.s\)/,               "سطر الخطّة"],
  [/esc\(opLine\(o\)\)/,        "سطر العملية"],
  [/esc\(b\.why\)/,             "سبب الرفض"],
  [/esc\(OPS\.prose\)/,         "نصّ العمليات"],
  [/esc\(x\.s\)/,               "سطر التجربة"],
  [/esc\(x\.err\)/,             "خطأ التجربة"],
  [/esc\(x\)/,                  "اسم الموديل في القائمة (wireAI)"]
 ];
 need.forEach(([re,label])=>{ ok(re.test(src),label); });
});

group("historypanel.js: أسماء خطوات التاريخ مُهرَّبة داخل title",()=>{
 const src=rd("js/ui/historypanel.js");
 ok(/esc\(steps\[a-1\]\)/.test(src),"esc(steps[a-1])");
 ok(/title="\$\{esc\(steps\[a-1\]\)\}"/.test(src),
  "esc داخل title=\"...\"");
});

group("كل ملفّ يستورد escapeHtml من core/escape.js",()=>{
 const files=[
  "js/ui/props.js",
  "js/ui/inspector.js",
  "js/ui/ai.js",
  "js/ui/historypanel.js"
 ];
 files.forEach(f=>{
  const src=rd(f);
  ok(/\{[^}]*escapeHtml as esc[^}]*\}\s*from\s*["'][^"']*core\/escape\.js["']/.test(src),
   `${f}: يستورد escapeHtml من core/escape.js`);
 });
});

group("gallery.js: سطح 3.7 — تحقّق أنه أُصلح فعلاً (لا مؤجَّل)",()=>{
 /* خلافاً للخطّة الأصلية (كانت تفترض gallery.js مؤجَّلاً إلى 3.7)،
    الكودُ الفعليّ أظهر أن card() تستعمل بالفعل createElement+
    textContent — فنُثبِت ذلك هنا بدل توثيق تأجيلٍ لم يعد قائماً،
    و٣.٧ يتحقّق من نفس الشيء بتفصيلٍ أكبر (القيد البنيويّ). */
 const src=rd("js/ui/gallery.js");
 ok(/item\.label/.test(src),"gallery.js يستعمل item.label");
 ok(/title\.textContent\s*=\s*item\.label/.test(src),
  "gallery.js: title.textContent = item.label (لا innerHTML)");
});

process.exit(summary());
