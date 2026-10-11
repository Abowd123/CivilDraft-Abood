/* ═══ دفعة 3.5 — رسائل الأخطاء الآمنة ═══
   node js/tests/phase3.5.test.js

   يفحص:
     • errMsg تستخرج الرسالة من Error/كائن/نصّ/null
     • errMsgHtml تُهرِّب النصّ الخبيث
     • panels.js:renderPanel يستعمل errMsgHtml لا e.message خام
     • لا String(e.message||e) باقية في أي ملفّ (عدا escape.js نفسها)
     • لا ${e.message} خام في قالب innerHTML
     • كل ملفّ من الستة يستورد errMsg من core/escape.js ويستعملها

   والغاية: أن تبقى رسائل الأخطاء آمنةً بعد كل تعديل — أي
   e.message خام في innerHTML يُسقِط هذا الملفّ فوراً. */
import {readFileSync,readdirSync,statSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const rd=p=>readFileSync(join(ROOT,p),"utf8");
const walk=(d,out)=>{readdirSync(d).forEach(n=>{const p=join(d,n);
 if(statSync(p).isDirectory()){ if(n!=="tests"&&n!=="node_modules")walk(p,out) }
 else if(/\.js$/.test(n))out.push(p)}); return out};
const JS=walk(join(ROOT,"js"),[])
 .map(p=>[p.slice(ROOT.length),readFileSync(p,"utf8")]);
const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,"")
 .replace(/^\s*\/\/.*$/gm,"");

const {errMsg,errMsgHtml,escapeHtml}=await import("../core/escape.js");

group("errMsg: الحالات الأساسية",()=>{
 eq(errMsg(null),"","null → فارغ");
 eq(errMsg(undefined),"","undefined → فارغ");
 eq(errMsg(""),"","فارغ → فارغ");
 eq(errMsg("خطأ بسيط"),"خطأ بسيط","نصّ كما هو");
 eq(errMsg(42),"42","رقم → نصّ");
 eq(errMsg(new Error("فشل الاتصال")),"فشل الاتصال","Error");
 eq(errMsg({message:"فشل"}),"فشل","كائن بـmessage");
 eq(errMsg({message:""}),"[object Object]",
  "كائن بـmessage فارغة → String(e)");
 eq(errMsg({}),"[object Object]","كائن بلا message");
});

group("errMsgHtml: تهريب الرسالة",()=>{
 eq(errMsgHtml(new Error("<script>alert(1)</script>")),
  "&lt;script&gt;alert(1)&lt;/script&gt;","Error خبيث");
 eq(errMsgHtml({message:'a"b'}),"a&quot;b",'message فيه "');
 eq(errMsgHtml({message:"a'b"}),"a&#39;b","message فيه '");
 eq(errMsgHtml({message:"a&b<c>d\"e'f"}),
  "a&amp;b&lt;c&gt;d&quot;e&#39;f","الخمسة معاً");
 eq(errMsgHtml(null),"","null → فارغ");
 eq(errMsgHtml("نصّ نظيف"),"نصّ نظيف","نصّ نظيف بلا تهريب");
 eq(errMsgHtml(new Error("x")),escapeHtml(errMsg(new Error("x"))),
  "errMsgHtml = escapeHtml(errMsg(e))");
});

group("panels.js: يستعمل errMsgHtml لا e.message خام",()=>{
 const src=rd("js/ui/panels.js");
 ok(/import\s*\{errMsgHtml\}\s*from\s*["'][^"']*core\/escape\.js["']/.test(src),
  "يستورد errMsgHtml من core/escape.js");
 ok(/errMsgHtml\(e\)/.test(src),"يستعمل errMsgHtml(e)");
 ok(!/\$\{String\(e\.message\|\|e\)\}/.test(strip(src)),
  "لا String(e.message||e) خام");
 ok(!/\$\{e\.message\}/.test(strip(src)),
  "لا ${e.message} خام");
});

group("لا String(e.message||e) باقية في أي ملفّ",()=>{
 const bad=[];
 JS.forEach(([f,src])=>{
  if(f==="js/core/escape.js")return;
  if(/String\(\s*e\.message\s*\|\|\s*e\s*\)/.test(strip(src)))
   bad.push(f);
 });
 eq(bad.length,0,"لا String(e.message||e) باقية"+
  (bad.length?" — "+bad.join(" · "):""));
});

group("لا e.message خام في قالب innerHTML (نطاق 3.5 الموثَّق)",()=>{
 /* النطاق الموثَّق في PHASE3-INVENTORY لـ3.5: panels.js (مُفحوصةٌ
    أعلاه) + الستة أدناه. ملفّاتٌ أخرى (ai/net.js, helpbot.js,
    ai/help/answer.js, tools/*) تستعمل e.message في رسائل نصّية
    أو throw أو textContent — خارج نطاق هذه الدفعة، ولا تُدرِجه في
    innerHTML، فلا تُفحَص هنا. */
 const scope=["js/app.js","js/ui/canvas.js","js/ui/ribbon/wire.js",
  "js/ui/inspector.js","js/ui/ai.js"];
 const bad=[];
 scope.forEach(f=>{
  const c=strip(rd(f));
  if(/\$\{e\.message(\|\|e)?\}/.test(c))bad.push(f+": ${e.message}");
 });
 eq(bad.length,0,"لا e.message خام في قالب"+
  (bad.length?" — "+bad.join(" · "):""));
});

group("كل ملفّ من الستة يستورد errMsg ويستعملها",()=>{
 const files=[
  "js/app.js",
  "js/ui/canvas.js",
  "js/ui/ribbon/wire.js",
  "js/ui/inspector.js",
  "js/ui/ai.js"
 ];
 files.forEach(f=>{
  const src=rd(f);
  ok(/\{[^}]*\berrMsg\b[^}]*\}\s*from\s*["'][^"']*core\/escape\.js["']/.test(src),
   `${f}: يستورد errMsg من core/escape.js`);
  ok(/errMsg\(e\)/.test(src),`${f}: يستعمل errMsg(e)`);
 });
});

group("لا +e.message خام في الستة (نطاق 3.5 الموثَّق)",()=>{
 const scope=["js/app.js","js/ui/canvas.js","js/ui/ribbon/wire.js",
  "js/ui/inspector.js","js/ui/ai.js"];
 const bad=[];
 scope.forEach(f=>{
  const c=strip(rd(f));
  if(/[+`]\s*e\.message\b/.test(c)&&!/errMsg\(e\)/.test(c))
   bad.push(f+": +e.message خام");
 });
 eq(bad.length,0,"لا +e.message خام"+
  (bad.length?" — "+bad.join(" · "):""));
});

process.exit(summary());
