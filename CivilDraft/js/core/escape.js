/* ═══ التهريب المركزي (٣.٤) ═══
   نقطة توحيدٍ واحدة لكل تهريب HTML في المشروع. كانت هذه الدالّة
   مكرَّرةً محلياً باسم esc() في نحو عشرين ملفّاً (انظر PHASE3-INVENTORY)
   بنسختين متطابقتين تقريباً — عدا نسختين ناقصتين لم تُهرِّبا `"` ولا
   `'` (cmdpalette.js وhistorypanel.js)، وهي المكان الذي كان يمكن أن
   ينكسر فيه سمة title="..." فعلياً.

   escapeHtml: لمحتوى نصّي يُدرَج داخل HTML (بين وسمين، أو داخل سمة
   بين علامتي اقتباس مزدوجتين — وهي القالب المستعمل حصراً في هذا
   المشروع). تُهرِّب الخمسة الحروف الخطرة كلّها بما فيها `'` احتياطاً
   (النسخ القديمة لم تكن تُهرِّبها، وهذا كان يكفي فقط لأن القوالب لا
   تستعمل علامة الاقتباس المفردة حول السمات — لكن لا داعي للاعتماد
   على ذلك).

   escapeAttr: مرادفٌ صريح لاستعمالها داخل سمة HTML — نفس السلوك،
   اسمٌ مختلف ليقرأ الموضع في الشفرة بوضوح (توثيقٌ لا فرقٌ وظيفي).

   setText: بديلٌ مباشر لعنصر.textContent = قيمة، لا يحتاج تهريباً
   أصلاً لأن المتصفّح لا يُحلِّل textContent كـHTML — لكنه يُصدَّر هنا
   ليكون النمط المرجعي (كما في helpbot.js وblockpanel.js) قابلاً
   للاستيراد بدل إعادة كتابته في كل ملفّ. */

const HAS = /[&<>"']/;

export function escapeHtml(s) {
  if (s == null) return "";
  const t = String(s);
  if (!HAS.test(t)) return t; /* أكثر النصوص لا تحوي أيّاً من الخمسة */
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const escapeAttr = escapeHtml;

export function setText(el, value) {
  if (el) el.textContent = value == null ? "" : String(value);
  return el;
}

/* للتحقّق: هل النصّ يحوي محرفاً قد يُفسَّر كـHTML؟ مفيدةٌ حيث
   يُراد فرعٌ مختلفٌ للنصّ النظيف (مثلاً: تخطّي بناء DOM إضافي). */
export const hasHtml = s => HAS.test(String(s == null ? "" : s));

/* ═══ رسالة خطأ آمنة — دفعة 3.5 ═══
   تستخرج رسالةً من كائن خطأ أو قيمة، بصيغةٍ موحَّدة. تُستعمَل في
   كل موضعٍ يُعرَض فيه e.message أو ردّ مزوّد أو اسم ملفّ/كتلة/
   طبقة كخطأ — بدل النمط المكرَّر String(e.message||e) الذي كان
   مبعثَراً بنسخٍ متفرّقة في عدّة ملفّات.

   السلوك:
     null/undefined         → ""
     نصّ                    → كما هو
     Error/كائن بـmessage  → e.message (إن لم تكن فارغة)
     غير ذلك (أو message فارغة) → String(e)

   وهي تُعيد نصّاً خاماً (بلا تهريب)، فيصلح للسياقين:
     rep("er","تعذّر: "+errMsg(e));           // نصّ (textContent)
     ctx.fillText("تعذّر: "+errMsg(e),x,y);   // قماش
   وللعرض في HTML استعمل errMsgHtml أدناه. */
export function errMsg(e) {
  if (e == null) return "";
  if (typeof e === "string") return e;
  if (typeof e === "object" && typeof e.message === "string" && e.message)
    return e.message;
  return String(e);
}

/* للعرض في HTML: استخراج + تهريب في نداءٍ واحد.
   الاستعمال:
     el.innerHTML=`<p>تعذّر: ${errMsgHtml(e)}</p>`; */
export const errMsgHtml = e => escapeHtml(errMsg(e));

/* ═══ تنقية النصّ الخارجي — دفعة 3.8 ═══
   كل نصّ يأتي من مزوّد ذكاء اصطناعي أو ملفّ مستورد هو نصّ غير
   موثوق: قد يحوي محاولات حقن أوامر (prompt injection) تهدف إلى
   جعل النموذج يتجاهل تعليماته الأصلية. هذه الدالّة تُزيل العلامات
   المعروفة قبل أن يُخزَّن النصّ أو يُعاد إرساله.

   العلامات المُزالة:
     • <|im_start|> / <|im_end|>  (ChatML — OpenAI)
     • [INST] / [/INST]            (Llama)
     • <<SYS>> / <</SYS>>          (Llama 2)
     • ### Instruction: / ### Response: / ### Human: / ### Assistant:
       (Alpaca)
     • system: / user: / assistant:  في بداية سطر
     • <script> / </script>        (احتياط — يُهرَّب عند العرض)
     • محارف تحكّم (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F)

   ولا تُهرِّب النصّ (escapeHtml تفعل ذلك عند العرض) — فقط تُزيل
   العلامات. الاستعمال:
     const safe=sanitizeExternal(providerResponse); */
const INJECTION=[
 /<\|im_(start|end)\|>/gi,
 /\[\/?INST\]/gi,
 /<<\/?SYS>>/gi,
 /^###\s*(Instruction|Response|Human|Assistant|System)\s*:?\s*/gim,
 /^(system|user|assistant)\s*:\s*/gim,
 /<\/?script\b[^>]*>/gi
];
const CTRL=/[\x00-\x08\x0B\x0C\x0E-\x1F]/g;

export function sanitizeExternal(s){
 if(s==null)return "";
 let t=String(s);
 INJECTION.forEach(re=>{t=t.replace(re,"")});
 t=t.replace(CTRL,"");
 return t;
}
