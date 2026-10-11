/* ═══ دفعة 3.3 — سياسة CSP موحَّدة ═══
   node js/tests/phase3.3.test.js

   الفحوص الأساسية (بلا unsafe-inline في المواضع الثلاثة · لا
   style= ولا <style> في JS) في csp.test.js. هذا الملفّ يفحص ما
   فوقها:
     • التطابق الحرفيّ للنصّ الكامل بين index.html و_headers
       وnetlify.toml — فلا يفترق مصدرٌ عن آخر بصمت
     • وجود كل توجيه بنصّه الصحيح في المواضع الثلاثة
     • غياب التوجيهات الخطرة (unsafe-eval · unsafe-hashes ·
       unsafe-inline · wildcard '*' كامل)
     • connect-src مضيّقٌ إلى المضيفين الفعليين الأربعة ومنفذَي
       الخدمة المحلّية — لا 'https:' مفتوحة (P6-004، قرارُ المالك:
       المزوّدُ المخصّصُ غير مدعوم). ولا مخطّط
       بعيد غير مشفّر، ولا مضيفٍ عامّ)
     • رؤوس الأمان الأخرى (X-Frame-Options · nosniff ·
       Referrer-Policy) في الموضعين
     • no-cache على js وcss في الموضعين — لا كاش طويل بلا بصمة

   والغاية: أن يبقى CSP موحَّداً بعد كل تعديل — أي انحرافٍ في
   مصدرٍ واحد يُسقِط هذا الملفّ فوراً. */
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const rd=p=>readFileSync(join(ROOT,p),"utf8");

const HTML=rd("index.html");
const HEADERS=rd("_headers");
const NETLIFY=rd("netlify.toml");

/* تطبيع الفراغات: index.html يكتب السياسة على أسطر، والموضعان
   الآخران على سطرٍ واحد. المقارنة على النصّ المُطبَّع. */
/* G9-6-08: ترتيب التوجيهات لا يُغيّر المعنى — نرتّبها أبجدياً بعد التطبيع */
const norm=s=>String(s||"").replace(/\s+/g," ").trim()
 .split(";").map(x=>x.trim()).filter(Boolean).sort().join("; ");

function cspOfIndex(){
 const m=HTML.match(
  /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/);
 return m?norm(m[1]):null;
}
function cspOfHeaders(){
 const m=HEADERS.match(/Content-Security-Policy:\s*([^\n]+)/);
 return m?norm(m[1]):null;
}
function cspOfNetlify(){
 const m=NETLIFY.match(
  /Content-Security-Policy\s*=\s*"([^"]+)"/);
 return m?norm(m[1]):null;
}

const CSP_I=cspOfIndex();
const CSP_H=cspOfHeaders();
const CSP_N=cspOfNetlify();

group("السياسة موجودة في المواضع الثلاثة",()=>{
 ok(!!CSP_I,"index.html: وسم CSP");
 ok(!!CSP_H,"_headers: رأس CSP");
 ok(!!CSP_N,"netlify.toml: رأس CSP");
});

group("التطابق الحرفيّ الكامل بين المواضع الثلاثة",()=>{
 ok(CSP_I&&CSP_H&&CSP_N,"الثلاثة موجودة");
 eq(CSP_H,CSP_I,"_headers يطابق index.html");
 eq(CSP_N,CSP_I,"netlify.toml يطابق index.html");
});

group("التوجيهات المطلوبة بنصّها الصحيح",()=>{
 const need=[
  ["default-src 'self'",  "default-src"],
  ["script-src 'self'",   "script-src"],
  ["style-src 'self'",    "style-src"],
  ["img-src 'self' data: blob:", "img-src (data: وblob: للصور)"],
  /* P6-004: ضُيّق إلى المضيفين الفعليين بقرار المالك — لا 'https:' */
  ["connect-src 'self' http://localhost:11434 http://localhost:8080 "
   +"http://127.0.0.1:11434 http://127.0.0.1:8080 "
   +"https://api.openai.com https://api.groq.com "
   +"https://generativelanguage.googleapis.com https://openrouter.ai",
   "connect-src مضيّقٌ إلى المضيفين الفعليين"],
  ["object-src 'none'",   "object-src منع"],
  ["base-uri 'none'",     "base-uri منع"],
  ["form-action 'none'",  "form-action منع"],
  ["frame-ancestors 'none'", "frame-ancestors منع"]
 ];
 need.forEach(([txt,label])=>{
  ok(CSP_I.includes(txt),`index.html: ${label}`);
  ok(CSP_H.includes(txt),`_headers: ${label}`);
  ok(CSP_N.includes(txt),`netlify.toml: ${label}`);
 });
});

group("التوجيهات الخطرة غائبة",()=>{
 const bad=[
  ["unsafe-inline","unsafe-inline محجوب"],
  ["unsafe-eval",  "unsafe-eval محجوب"],
  ["unsafe-hashes","unsafe-hashes محجوب"],
  ["strict-dynamic","strict-dynamic غائب (لا حاجة له)"],
  ["'*'",          "wildcard '*' كاملٌ غائب"]
 ];
 bad.forEach(([txt,label])=>{
  ok(!CSP_I.includes(txt),`index.html: ${label}`);
  ok(!CSP_H.includes(txt),`_headers: ${label}`);
  ok(!CSP_N.includes(txt),`netlify.toml: ${label}`);
 });
 const sc=/script-src\s+([^;]+)/.exec(CSP_I);
 ok(sc&&!/data:|blob:/.test(sc[1]),
  "script-src لا يحوي data: ولا blob:");
 const st=/style-src\s+([^;]+)/.exec(CSP_I);
 ok(st&&!/data:|blob:/.test(st[1]),
  "style-src لا يحوي data: ولا blob:");
 const cn=/connect-src\s+([^;]+)/.exec(CSP_I);
 ok(cn&&!/\bhttp:\s/.test(cn[1]),
  "connect-src لا يقبل http: العاري");
 ok(cn&&/https:/.test(cn[1]),
  "connect-src يقبل https: لمزوّد AI الخارجي");
 ok(cn&&/http:\/\/localhost/.test(cn[1]),
  "connect-src يقبل http://localhost لمزوّد Ollama المحلّي");
 ok(cn&&/http:\/\/127\.0\.0\.1/.test(cn[1]),
  "connect-src يقبل http://127.0.0.1");
});

group("رؤوس الأمان الأخرى في الموضعين",()=>{
 const need=[
  ["X-Frame-Options","DENY"],
  ["X-Content-Type-Options","nosniff"],
  ["Referrer-Policy","no-referrer"]
 ];
 need.forEach(([h,v])=>{
  const rh=new RegExp(`${h}:\\s*${v}`,"i");
  ok(rh.test(HEADERS),`_headers: ${h}: ${v}`);
  const rn=new RegExp(`${h}\\s*=\\s*"${v}"`,"i");
  ok(rn.test(NETLIFY),`netlify.toml: ${h} = "${v}"`);
 });
});

group("no-cache على js وcss في الموضعين",()=>{
 ok(/\/\*\.js\s*\n\s*Cache-Control:\s*no-cache/.test(HEADERS),
  "_headers: no-cache على *.js");
 ok(/\/\*\.css\s*\n\s*Cache-Control:\s*no-cache/.test(HEADERS),
  "_headers: no-cache على *.css");
 const njs=/for\s*=\s*"\/\*\.js"\s*\n\s*\[headers\.values\]\s*\n\s*Cache-Control\s*=\s*"no-cache"/;
 const ncss=/for\s*=\s*"\/\*\.css"\s*\n\s*\[headers\.values\]\s*\n\s*Cache-Control\s*=\s*"no-cache"/;
 ok(njs.test(NETLIFY),"netlify.toml: no-cache على *.js");
 ok(ncss.test(NETLIFY),"netlify.toml: no-cache على *.css");
 ok(!/Cache-Control:\s*[^\n]*immutable/i.test(HEADERS),
  "_headers: لا immutable في قيمة Cache-Control فعلية");
 ok(!/Cache-Control\s*=\s*"[^"]*immutable/i.test(NETLIFY),
  "netlify.toml: لا immutable في قيمة Cache-Control فعلية");
});

group("CSP لا يسمح بمخطّطاتٍ بعيدة غير مشفّرة",()=>{
 ["ws:","wss:","ftp:","file:"].forEach(s=>{
  ok(!CSP_I.includes(s),`index.html: لا ${s}`);
  ok(!CSP_H.includes(s),`_headers: لا ${s}`);
  ok(!CSP_N.includes(s),`netlify.toml: لا ${s}`);
 });
 ok(/frame-ancestors 'none'/.test(CSP_I),
  "frame-ancestors 'none' (المتصفّحات الحديثة)");
 ok(/X-Frame-Options:\s*DENY/.test(HEADERS),
  "X-Frame-Options: DENY (احتياطٌ للمتصفّحات القديمة)");
});

process.exit(summary());
