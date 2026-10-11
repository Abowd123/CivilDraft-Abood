/* ═══ طُرز الأبعاد: بيانات مشروع ═══
   البُعد اليوم يقرأ هيئته من meta (dimDec · dimTick) مباشرة. هنا
   طرازٌ مسمّى يُشار إليه اختيارياً من بُعدٍ أو سلسلة، فيلبس هيئته
   فوق الافتراضي. غياب الطراز يبقي المسار القديم حرفياً — فلا
   ينكسر مشروعٌ محفوظ.

   كسائر جداول الهيئة (ltypes) تُحفَظ وتدخل التاريخ عبر KEYS/DEF
   وتُطبَّع في ensureShape. ولا تصديرَ خاصّاً بها: أثرها يصل
   المشهدَ عبر dimPrims/chainPrims وحدها، فالمصدرون الأربعة لا
   يدرون بها أصلاً. */
import {S, edit} from "./state.js";
import {LIM} from "./limits.js";

const NAME_OK = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;
export const dsNameOk = n => NAME_OK.test(String(n || ""));

const tickOk = v => (v === "arrow" || v === "slash") ? v : null;
const decOk = v => {
  /* الفارغ يعني «افتراضيّ المشروع» لا صفرَ كسور: +null و+"" يساويان 0
     فكان الغياب يُخزَّن صفراً ويُحجَب افتراضيّ meta.dimDec */
  if (v == null || v === "") return null;
  const n = Math.round(+v);
  return (n >= 0 && n <= 3) ? n : null;
};
const hOk = v => {
  const n = +v;
  return (isFinite(n) && n >= 0.4 && n <= 4) ? Math.min(Math.max(n, 0.4), 4) : null;
};

/* المصنع فارغ: لا طرازَ مدمجاً، فالسلوك الافتراضي meta خالصٌ كما كان.
   ولو أُريد طرازٌ قياسيٌّ مدمج أُضيف هنا لاحقاً بلا مساسٍ بملفٍّ قديم. */
export const defDimstyles = () => ({});

/* ═══ الوصول ═══ */
export const dsOk = k => {
  const s = String(k || "");
  return (S.dimstyles && S.dimstyles[s] && !Array.isArray(S.dimstyles)) ? s : null;
};
export const dsLabel = k => {
  const o = (dsOk(k) && S.dimstyles[k]) || null;
  return (o && o.n) || String(k || "");
};
export const dsList = () => {
  const out = [];
  Object.keys(S.dimstyles || {})
    .filter(k => S.dimstyles[k] && typeof S.dimstyles[k] === "object" && !Array.isArray(S.dimstyles[k]))
    .sort()
    .forEach(k => {
      const o = S.dimstyles[k];
      out.push({
        k,
        label: (o && o.n) || k,
        tick: (o && o.tick === "arrow") ? "arrow" : "slash",
        dec: (o && o.dec != null) ? o.dec : 2,
        hMul: (o && o.hMul) || 1
      });
    });
  return out;
};

/* ═══ حلّ طراز كيان ═══
   يعيد صفّةً ثابتة الحقول {tick, dec, hMul} دائماً — الافتراضي من
   meta إن غاب الطراز أو كان مجهولاً، فالاستدعاء الواحد يكفي ولا
   يقرأ المستدعي meta بيده. */
export const styleOf = name => {
  const k = String(name || "").trim();
  const o = (S.dimstyles && S.dimstyles[k] &&
    !Array.isArray(S.dimstyles[k]) && typeof S.dimstyles[k] === "object")
    ? S.dimstyles[k] : null;
  return {
    tick: (o && (o.tick === "arrow")) ? "arrow" : "slash",
    dec: (o && o.dec != null && isFinite(+o.dec)) ?
      Math.min(Math.max(Math.round(+o.dec), 0), 3) :
      Math.min(Math.max(parseInt(S.meta.dimDec, 10) || 0, 0), 3),
    hMul: (o && isFinite(+o.hMul) && +o.hMul >= 0.4 && +o.hMul <= 4) ?
      +o.hMul : 1
  };
};

/* ═══ التطبيع — من ensureShape ═══
   المفقود يُنشأ فارغاً، والمجهول يُطرَح (بلا اسمٍ آمنٍ أو حقولٍ
   فاسدة) والمخصصة تُستكمَل بما نقص من افتراضٍ آمن. */
export function normDimstyles() {
  const ix = (S.dimstyles && typeof S.dimstyles === "object" &&
    !Array.isArray(S.dimstyles)) ? S.dimstyles : {};
  const out = {};
  const keys = Object.keys(ix).filter(k => dsNameOk(k));
  if (keys.length > LIM.dimstyles.max) keys.length = LIM.dimstyles.max;
  keys.forEach(k => {
    const r = ix[k];
    if (!r || typeof r !== "object" || Array.isArray(r)) return;
    out[k] = {
      n: String(r.n == null ? "" : r.n).slice(0, 40) || k,
      tick: (r.tick === "arrow") ? "arrow" : "slash",
      dec: (r.dec != null && r.dec !== "" && isFinite(+r.dec) &&
        +r.dec >= 0 && +r.dec <= 3) ?
        Math.round(+r.dec) : null,
      hMul: hOk(r.hMul)
    };
    if (out[k].dec == null) delete out[k].dec;
    if (out[k].hMul == null) delete out[k].hMul;
  });
  S.dimstyles = out;
  return Object.keys(out).length;
}

/* ═══ الكتابة ═══ bump:view — أثرها يسري عبر touchView إلى نطاق dim
   في المشهد (مفتاحه nKey)، ولا هندسةَ تُمَس. إعادةُ الاسم تُحدّثه. */
export function addDimstyle(name, label, tick, dec, hMul) {
  return edit(() => {
    const k = String(name || "").trim();
    if (!dsNameOk(k))
      throw new Error(
        "اسم الطراز لاتيني يبدأ بحرفٍ ويحوي أحرفاً وأرقاماً وشرطاتٍ " +
          "فحسب (مثل DS-WORK) — الوصفُ العربيّ في خانة الوصف"
      );
    if (!S.dimstyles || typeof S.dimstyles !== "object" || Array.isArray(S.dimstyles))
      S.dimstyles = defDimstyles();
    const custom = Object.keys(S.dimstyles);
    if (!S.dimstyles[k] && custom.length >= LIM.dimstyles.max)
      throw new Error(`بلغت الطُرزُ حدّها الأقصى ${LIM.dimstyles.max}`);
    const o = {
      n: String(label == null ? "" : label).slice(0, 40) || k,
      tick: (tick === "arrow") ? "arrow" : "slash",
      dec: decOk(dec),
      hMul: hOk(hMul)
    };
    if (o.dec == null) delete o.dec;
    if (o.hMul == null) delete o.hMul;
    S.dimstyles[k] = o;
    return k;
  }, "إضافة طراز أبعاد", {bump: "view"});
}
export function delDimstyle(name) {
  const k = String(name || "");
  return edit(() => {
    if (!(S.dimstyles && S.dimstyles[k])) return false;
    const usedD = (S.dims || []).filter(d => d.style === k).length;
    const usedC = (S.chains || []).filter(c => c.style === k).length;
    if (usedD + usedC)
      throw new Error(`تستعمله ${usedD + usedC} من الأبعاد والسلاسل — `
        + "انقلها إلى طرازٍ آخر قبل حذفه");
    delete S.dimstyles[k];
    return true;
  }, "حذف طراز أبعاد", {bump: "view"});
}
export function resetDimstyles() {
  return edit(() => {
    const used = (S.dims || []).filter(d => d.style).length +
      (S.chains || []).filter(c => c.style).length;
    if (used)
      throw new Error(`لا يُعاد المصنع — ${used} من الأبعاد والسلاسل `
        + "تحمل أسماءَ طرزٍ. أفرِغها من الطراز أولاً");
    S.dimstyles = defDimstyles();
    return 0;
  }, "إعادة مصنع طُرز الأبعاد", {bump: "view"});
}
