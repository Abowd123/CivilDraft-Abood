/* ═══ الحدود الموحَّدة — 2.1 ═══
   جدولٌ واحد لكل سقفٍ في المشروع. كانت الأسقف مبعثرة: MAXCO في
   units.js، وMAXENT/MAXPTS في io/dxfin.js، ونسخٌ حرفيّة (1e9 ·
   60000 · 20000) داخل ensureShape. نسخٌ متعدّدة ⇒ تنجرف: القارئ
   يقبل ما يرفضه المُثبِّت. اليوم مصدرٌ واحد يستورده الجميع.

   لا يستورد هذا الملفّ شيئاً — فيستورده أيُّ ملفّ بلا دورة.
   وكلُّ حدٍّ {min,max}، والوحدة مذكورة هنا:
     coord       مم — مطلق (±١٠٠٠كم)
     length      مم
     thickness   مم — هي TMIN/TMAX في walls.js
     height      مم — ارتفاع الجدار (meta.wallH)
     geomTol · weldTol · arcTol   تفاوتات الهندسة بالمم — def هو
                 الافتراضيّ الفعّال (يقرؤه walls.js لـ arcTol)
     vertices    عدد رؤوس كيانٍ واحد
     elements    عدد كيانات المرجع
     text        محارف نصٍّ واحد (تأشير)
     imageBytes  محارف data: URL للصورة المرجعية
     refEnts · refPts   حدود المرجع المستورد
     blockPrims · blockDefs   حدود تعريف الكتلة وعدد التعريفات
     aiQuestion  محارف سؤال المستخدم إلى المزوّد (بند 98)
     aiContext   محارف خلاصة المشروع المُرسَلة (digest) وتعليمات النظام
     aiResponse  محارف ردّ المزوّد قبل التحليل
     aiOps       عمليات JSON في كتلة ops واحدة (بند 57)
     rvItems · rvMsg · rvSug   حدود ردّ «المراجعة الذكية» (المرحلة E)
     (aiQuestion/aiContext/aiResponse نسخٌ يكرّرها ai/net.js — ورقةٌ
      بلا استيراد — ويحرس تطابقَها phase8.gate.test.js) */
export const LIM = Object.freeze({
  coord:      Object.freeze({min: -1e9, max: 1e9}),
  length:     Object.freeze({min: 0,    max: 1e9}),
  thickness:  Object.freeze({min: 50,   max: 1000}),
  height:     Object.freeze({min: 0,    max: 8000}),
  /* تفاوتات الهندسة — def هو الافتراضيّ الفعّال */
  geomTol:    Object.freeze({min: 0.1,  max: 5,   def: 1}),
  weldTol:    Object.freeze({min: 0.5,  max: 5,   def: 2}),
  arcTol:     Object.freeze({min: 0.1,  max: 2,   def: 0.5}),
  vertices:   Object.freeze({min: 0,    max: 20000}),
  elements:   Object.freeze({min: 0,    max: 60000}),
  text:       Object.freeze({min: 0,    max: 120}),
  imageBytes: Object.freeze({min: 0,    max: 4 * 1024 * 1024}),
  refEnts:    Object.freeze({min: 0,    max: 60000}),
  refPts:     Object.freeze({min: 0,    max: 20000}),
  blockPrims: Object.freeze({min: 0,    max: 500}),
  blockDefs:  Object.freeze({min: 0,    max: 2000}),
  ltypes:     Object.freeze({min: 0,    max: 100}),
  dimstyles:  Object.freeze({min: 0,    max: 100}),
  hatches:    Object.freeze({min: 0,    max: 100}),
  aiQuestion: Object.freeze({min: 0,    max: 8000}),
  aiContext:  Object.freeze({min: 0,    max: 20000}),
  aiResponse: Object.freeze({min: 0,    max: 1024 * 1024}),
  aiOps:      Object.freeze({min: 0,    max: 200}),
  /* مراجعة الذكاء الاصطناعي (E) — قراءةٌ فقط، ردٌّ مُصدَّق بقائمة سماح:
     rvItems  بنود المراجعة في الردّ الواحد
     rvMsg    أقصى طول msg في بندٍ واحد
     rvSug    أقصى طول sug (الاقتراح — لا يُنفَّذ) */
  rvItems:    Object.freeze({min: 0,    max: 200}),
  rvMsg:      Object.freeze({min: 0,    max: 300}),
  rvSug:      Object.freeze({min: 0,    max: 200}),
  /* ═══ الأوراق المتعددة والمنافذ — المرحلة 4 ═══
     sheets              أقصى عدد أوراق في المشروع
     viewportsPerSheet   أقصى عدد منافذ في الورقة الواحدة
     vpModelRectMM       أكبر بعدٍ جانبي لمستطيل النموذج لمنفذ واحد
     vpPaperRectMM       أكبر بعدٍ جانبي لمستطيل الورقة لمنفذ واحد */
  sheets:            Object.freeze({min: 0, max: 200}),
  /* sheetCustom: بُعدا الورقة المخصّصة (مم) — أدنى/أقصى لكلٍّ منهما */
  sheetCustom:       Object.freeze({min: 100, max: 2000}),
  viewportsPerSheet: Object.freeze({min: 0, max: 50}),
  vpModelRectMM:     Object.freeze({min: 1, max: 1e7}),
  vpPaperRectMM:     Object.freeze({min: 1, max: 100000}),
  /* أوسمة التفاصيل — بيانات مشروع غير مكانية */
  callouts:          Object.freeze({min: 0, max: 2000}),
  /* المجموعات — جدول مراجع {k,id} لا كيانات مكانية */
  groups:            Object.freeze({min: 0, max: 500}),
  groupMembers:      Object.freeze({min: 0, max: 60000}),
  /* الحقول الحيّة — نصوص مشتقّة بموضع صريح */
  livefields:        Object.freeze({min: 0, max: 500})
});
/* ═══ حدودُ العرض ═══ P2-011
   أرقامُ قصٍّ ومُهَلٍ كانت منتشرةً في ملفّات الواجهة: 12 نتيجةً هنا
   و10 هناك و120 في ثالث، وdebounce 120ms، و400 سجلٍّ في لوحة
   السجلّ، و60 طبقةً في العرض. ليست ثغراتٍ، لكن تعديلَ حدٍّ في موضعٍ
   دون بقيّته يُنتج سلوكَين مختلفَين لنفس القائمة — وهو انحرافٌ لا
   يمنعه شيء. مصدرٌ واحدٌ هنا، ويُقرأ منه.
   وهي حدودُ عرضٍ لا حدودُ بيانات: لا تمسّ ما يُحفَظ ولا ما يُصدَّر. */
export const UILIM=Object.freeze({
 searchResults:   Object.freeze({min: 1, max: 12,  def: 12}),  /* فهرس الدليل */
 paletteResults:  Object.freeze({min: 1, max: 120, def: 120}), /* لوحة الأوامر */
 menuResults:     Object.freeze({min: 1, max: 10,  def: 10}),  /* قائمة التطبيق */
 layerRows:       Object.freeze({min: 1, max: 60,  def: 60}),  /* صفوف الطبقات */
 logRows:         Object.freeze({min: 1, max: 400, def: 400}), /* سجلّ الأوامر */
 debounceMs:      Object.freeze({min: 0, max: 1000, def: 120}),/* بحثٌ أثناء الكتابة */
 saveDebounceMs:  Object.freeze({min: 0, max: 5000, def: 400}),/* حفظُ تفضيلٍ بعد سكون */
});


/* min/max بلا افتراض: غياب الحدّ يعني «بلا سقف» لا صفراً */
export const limMin = lim => (lim && lim.min != null) ? lim.min : null;
export const limMax = lim => (lim && lim.max != null) ? lim.max : null;

/* هل القيمة داخل الحدّ (شاملاً الطرفين)؟ بلا حدّ ⇒ مقبولة إن كانت منتهية */
export function inLim(v, lim) {
  if (typeof v !== "number" || !isFinite(v)) return false;
  const lo = limMin(lim), hi = limMax(lim);
  if (lo != null && v < lo) return false;
  if (hi != null && v > hi) return false;
  return true;
}
