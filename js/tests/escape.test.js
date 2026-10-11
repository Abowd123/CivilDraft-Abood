/* ═══ اختبار ٣.٤: التهريب المركزي ═══
   escapeHtml/escapeAttr/setText من core/escape.js — الدالّة الوحيدة
   التي يستوردها الآن نحو عشرين ملفّ واجهة بدل تكرار esc() محلياً
   (راجع PHASE3-INVENTORY وCHANGES.md § ٣.٤).                       */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const {escapeHtml,escapeAttr,setText,hasHtml}=await import("../core/escape.js");

group("escapeHtml — الحروف الخمسة الخطرة",()=>{
 eq(escapeHtml("&"),"&amp;","&");
 eq(escapeHtml("<"),"&lt;","<");
 eq(escapeHtml(">"),"&gt;",">");
 eq(escapeHtml('"'),"&quot;",'"');
 eq(escapeHtml("'"),"&#39;","'");
 eq(escapeHtml("&<>\"'"),"&amp;&lt;&gt;&quot;&#39;","مجتمعةً بالترتيب");
});

group("escapeHtml — حقن نموذجيّ",()=>{
 eq(escapeHtml('<img src=x onerror=alert(1)>'),
  "&lt;img src=x onerror=alert(1)&gt;","وسمٌ كامل");
 eq(escapeHtml('"><script>alert(1)</script>'),
  "&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;","إفلاتٌ من سمة");
 eq(escapeHtml("' onmouseover='alert(1)"),
  "&#39; onmouseover=&#39;alert(1)","إفلاتٌ من سمةٍ مفردة الاقتباس");
});

group("escapeHtml — قيمٌ حدّية",()=>{
 eq(escapeHtml(null),"","null ⇒ فارغ");
 eq(escapeHtml(undefined),"","undefined ⇒ فارغ");
 eq(escapeHtml(""),"","فارغ يبقى فارغاً");
 eq(escapeHtml(0),"0","الصفر لا يُطوى إلى فارغ");
 eq(escapeHtml(42),"42","رقمٌ يُحوَّل إلى نصّ");
 eq(escapeHtml("نصٌّ عربيّ بلا حروفٍ خطرة"),
  "نصٌّ عربيّ بلا حروفٍ خطرة","العربية تمرّ بلا مساس");
});

group("escapeAttr — مرادفٌ لـescapeHtml",()=>{
 eq(escapeAttr,escapeHtml,"نفس الدالّة بالضبط (اسمٌ للتوثيق فقط)");
 eq(escapeAttr('"quoted"'),"&quot;quoted&quot;","يُهرِّب علامات الاقتباس");
});

group("setText — لا يحتاج تهريباً (textContent)",()=>{
 let seen=null;
 const fakeEl={set textContent(v){seen=v},get textContent(){return seen}};
 setText(fakeEl,'<b>لن يُحلَّل</b>');
 eq(seen,'<b>لن يُحلَّل</b>',"تُكتَب كما هي — لا تحليل HTML في textContent");
 setText(fakeEl,null);
 eq(seen,"","null ⇒ نصٌّ فارغ");
 setText(fakeEl,7);
 eq(seen,"7","رقمٌ يُحوَّل إلى نصّ");
 eq(setText(null,"x"),null,"عنصرٌ غائب لا يرمي");
});

group("hasHtml — كشف النصّ المشتبه (فرعٌ سريع في escapeHtml نفسها)",()=>{
 ok(!hasHtml("نصٌّ عربيّ نظيف"),"نظيف ⇒ false");
 ok(!hasHtml(null),"null ⇒ false");
 ok(!hasHtml(""),"فارغ ⇒ false");
 ok(hasHtml("<b>"),"< ⇒ true");
 ok(hasHtml("a&b"),"& ⇒ true");
 ok(hasHtml('"'),'" ⇒ true');
 ok(hasHtml("'"),"' ⇒ true");
});

process.exit(summary());
