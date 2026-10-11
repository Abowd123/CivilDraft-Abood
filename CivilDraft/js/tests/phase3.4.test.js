/* ═══ دفعة 3.4 — التهريب المركزي ═══
   node js/tests/phase3.4.test.js

   يفحص:
     • escapeHtml تُهرِّب الخمسة (& < > " ')
     • escapeHtml تتعامل مع null/undefined/الأرقام
     • escapeHtml لا تُهرِّب النصّ النظيف (كفاءة)
     • escapeAttr هو escapeHtml نفسه
     • setText يكتب textContent ولا يُهرِّب
     • hasHtml يكشف النصّ المشتبه
     • لا esc() محلية باقية في أي ملفّ
     • كل ملفّ كان فيه esc() يستورد escapeHtml من core/escape.js
     • الاستيراد بـalias esc (توافق مع الاسم المحلي)

   والغاية: أن يبقى التهريب موحَّداً — أي esc() محلية جديدة
   تُسقِط هذا الملفّ فوراً. */
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

const {escapeHtml,escapeAttr,setText,hasHtml}=await import("../core/escape.js");

group("escapeHtml: الحالات الأساسية",()=>{
 eq(escapeHtml(null),"","null → فارغ");
 eq(escapeHtml(undefined),"","undefined → فارغ");
 eq(escapeHtml(""),"","فارغ → فارغ");
 eq(escapeHtml(0),"0","صفر → '0'");
 eq(escapeHtml(42),"42","رقم → نصّ");
 eq(escapeHtml("abc"),"abc","نصّ نظيف");
 eq(escapeHtml("مرحبا"),"مرحبا","نصّ عربي");
});

group("escapeHtml: تهريب الخمسة",()=>{
 eq(escapeHtml("&"),"&amp;","&");
 eq(escapeHtml("<"),"&lt;","<");
 eq(escapeHtml(">"),"&gt;",">");
 eq(escapeHtml('"'),"&quot;",'"');
 eq(escapeHtml("'"),"&#39;","'");
 eq(escapeHtml("<script>"),"&lt;script&gt;","<script>");
 eq(escapeHtml('a"b'),"a&quot;b",'a"b');
 eq(escapeHtml("a'b"),"a&#39;b","a'b");
 eq(escapeHtml("a&b<c>d\"e'f"),"a&amp;b&lt;c&gt;d&quot;e&#39;f",
  "الخمسة معاً");
});

group("escapeHtml: حالات XSS محدَّدة",()=>{
 eq(escapeHtml('<img src=x onerror=alert(1)>'),
  "&lt;img src=x onerror=alert(1)&gt;","وسم img خبيث");
 eq(escapeHtml('"><script>alert(1)</script>'),
  "&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;","كسر سمة");
 eq(escapeHtml("</div><script>x</script>"),
  "&lt;/div&gt;&lt;script&gt;x&lt;/script&gt;","إغلاق مبكر");
});

group("escapeAttr: نفس escapeHtml",()=>{
 eq(escapeAttr,escapeHtml,"مرجعٌ واحد");
 eq(escapeAttr('a"b'),"a&quot;b",'a"b');
 eq(escapeAttr("a'b"),"a&#39;b","a'b");
});

group("setText: بديلٌ صريح عن textContent",()=>{
 const el={textContent:"initial"};
 setText(el,"new");
 eq(el.textContent,"new","كتابة نصّ");
 setText(el,null);
 eq(el.textContent,"","null → فارغ");
 setText(el,42);
 eq(el.textContent,"42","رقم → نصّ");
 setText(null,"x");
 ok(true,"null el لا يرمي");
});

group("hasHtml: كشف النصّ المشتبه",()=>{
 ok(!hasHtml("abc"),"نصّ نظيف");
 ok(!hasHtml("مرحبا"),"عربي نظيف");
 ok(hasHtml("<"),"<");
 ok(hasHtml("&"),"&");
 ok(hasHtml('"'),'"');
 ok(hasHtml("'"),"'");
 ok(hasHtml("<script>"),"<script>");
 ok(!hasHtml(null),"null");
 ok(!hasHtml(""),"فارغ");
});

group("لا esc() محلية باقية في أي ملفّ HTML (io/pdf.js خارج النطاق — تهريب PDF لا HTML)",()=>{
 const bad=[];
 JS.forEach(([f,src])=>{
  if(f==="js/core/escape.js")return;
  if(f==="js/io/pdf.js")return; /* esc() هناك تُهرِّب \ و( و) لبنية PDF النصّية — دالّةٌ مختلفة تماماً بالاسم فقط */
  if(f==="js/tests/cover.js")return; /* esc() هناك لهروب regex، غير معنيّة بـHTML */
  if(/^\s*const\s+esc\s*=/m.test(src))bad.push(f+": const esc=");
  if(/^\s*function\s+esc\s*\(/m.test(src))bad.push(f+": function esc(");
 });
 eq(bad.length,0,"لا esc() محلية باقية"+
  (bad.length?" — "+bad.join(" · "):""));
});

group("كل ملفّ كان فيه esc() يستورد escapeHtml",()=>{
 const files=[
  "js/app.js",
  "js/ui/props.js","js/ui/dock.js",
  "js/ui/ribbon/render.js","js/ui/optbar.js","js/ui/statusbar.js",
  "js/ui/cmdline.js","js/ui/dyninput.js",
  "js/ui/ctxmenu.js","js/ui/overlay.js","js/ui/navbar.js",
  "js/ui/appmenu.js","js/ui/defaults.js","js/ui/quickprops.js",
  "js/ui/inspector.js","js/ui/historypanel.js",
  "js/ui/ai.js","js/ui/palette.js"
 ];
 files.forEach(f=>{
  const src=rd(f);
  ok(/from\s+["'][^"']*core\/escape\.js["']/.test(src),
   `${f}: يستورد core/escape.js`);
 });
});

group("الاستيراد بـalias esc (توافق مع الاسم المحلي)",()=>{
 const withAlias=[
  "js/ui/props.js","js/ui/dock.js","js/ui/ribbon/render.js",
  "js/ui/optbar.js","js/ui/statusbar.js","js/ui/cmdline.js",
  "js/ui/dyninput.js","js/ui/ctxmenu.js",
  "js/ui/overlay.js","js/ui/navbar.js","js/ui/appmenu.js",
  "js/ui/defaults.js","js/ui/quickprops.js","js/ui/inspector.js",
  "js/ui/historypanel.js","js/ui/ai.js","js/ui/palette.js"
 ];
 withAlias.forEach(f=>{
  const src=rd(f);
  ok(/escapeHtml\s+as\s+esc/.test(src),
   `${f}: escapeHtml as esc`);
 });
});

process.exit(summary());
