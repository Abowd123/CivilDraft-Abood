/* ═══ تسعير حصر الكميات ═══ */

import {writePref,parseObj,isPlain} from "./delegate.js";
/* ═══ هجرة التخزين من «mistar» إلى «civildraft» ═══
   كسابقتها في normLays وio/store.js: النسخ لا النقل، والقديم
   يبقى نسخةً احتياطيةً صامتةً لا تُقرَأ ولا يُكتَب فيها.
   وشرطُ الهجرة: توجد نسخةٌ قديمة ولا توجد جديدة — الجديدُ
   الموجودُ لا يُكتَب فوقه أبداً. */
const CFG = { currency: "ر.س", taxRate: 0.15, key: "civildraft:pricing" };
const OLD_KEY = "mistar:pricing";
/* العملة ونسبة الضريبة مفتاحٌ مستقلّ: مفتاح الأسعار يُفرَد كلّه في RATES،
   فلا يُخلَط بهما. يُمسَح مع المسح الكامل (بادئة civildraft: في purge). */
const CFG_KEY = "civildraft:pricing-cfg";
const DEFAULTS = {
  wall: { label: "جدران", unit: "م²", rate: 120 },
  /* مفاتيحُ الجدران المفصّلة — التسعيرُ من تصنيف BOQ نفسه:
     ext/int/low لا تُسعَّر كلُّها بما يخصّ «جدران» العامّ (W5). */
  wall_ext: { label: "جدران خارجية", unit: "م²", rate: 120 },
  wall_int: { label: "جدران داخلية", unit: "م²", rate: 120 },
  wall_low: { label: "جدران سترة",    unit: "م²", rate: 120 },
  floor: { label: "أرضيات", unit: "م²", rate: 90 },
  area: { label: "مساحات", unit: "م²", rate: 0 },
  door: { label: "أبواب", unit: "عدد", rate: 350 },
  window: { label: "نوافذ", unit: "عدد", rate: 420 },
  column: { label: "أعمدة", unit: "عدد", rate: 250 },
  /* fixture/stair: بندان جديدان — المراجعة #5. سعرُهما 0 افتراضياً
     (لا "column" الذي كان له سعرٌ افتراضيٌّ سابقاً بلا مستهلكٍ
     أصلاً — راجع tools/boq.js): لا اختراع سعرٍ لأداةٍ صحيةٍ أو
     درجٍ باختلافٍ هائلٍ بين النوع والمادّة، فمن يريد تسعيرهما
     يضبط الرقم بنفسه عبر setRate. */
  fixture: { label: "أدوات صحية", unit: "عدد", rate: 0 },
  stair: { label: "درج", unit: "عدد", rate: 0 },
  dim: { label: "أبعاد", unit: "عدد", rate: 0 }
};
let RATES = load();
loadCfg();
function load() {
  try {
    let raw = localStorage.getItem(CFG.key);
    if (raw == null) {
      const old = localStorage.getItem(OLD_KEY);
      if (old != null) {
        /* انسخ لا تنقل — القديم يبقى للطوارئ */
        localStorage.setItem(CFG.key, old);
        raw = old;
      }
    }
    /* P2-008: كان أيُّ كائنٍ يُدمَج كما هو — بندٌ بسعرٍ نصّيٍّ أو
       مصفوفةٌ كاملةٌ تدخل جدولَ الأسعار فتُعطِب الحصيلة صامتاً.
       الآن بنودٌ ذاتُ rate رقميٍّ منتهٍ وحدها تُقبَل. */
    const d = parseObj(raw);
    const out = { ...DEFAULTS };
    if (d) Object.keys(d).forEach(k => {
      const e = d[k];
      if (!isPlain(e)) return;
      const r = +e.rate;
      if (!isFinite(r)) return;
      out[k] = { ...e, rate: r };
    });
    return out;
  } catch (_) { return { ...DEFAULTS }; }
}
function loadCfg() {
  try {
    const c = JSON.parse(localStorage.getItem(CFG_KEY) || "null");
    if (!c) return;
    if (typeof c.currency === "string" && c.currency.trim()) CFG.currency = c.currency;
    if (typeof c.taxRate === "number" && isFinite(c.taxRate)) CFG.taxRate = Math.max(0, c.taxRate);
  } catch (_) {}
}
/* P2-005: كانا يبتلعان الامتلاء فتضيع العملةُ والضريبةُ والأسعار */
function persistCfg() {
  return writePref(CFG_KEY, { currency: CFG.currency, taxRate: CFG.taxRate });
}
function persist() { return writePref(CFG.key, RATES); }
export const getRate = key => RATES[key]?.rate ?? 0;
export const allRates = () => JSON.parse(JSON.stringify(RATES));
export function setRate(key, rate, meta = {}) { RATES[key] = { ...(RATES[key] || {}), ...meta, rate: +rate || 0 }; persist(); }
export function resetRates() {
  RATES = { ...DEFAULTS };
  try { localStorage.removeItem(CFG.key); } catch (_) {}
  /* ولا نمسّ OLD_KEY: هي نسخةٌ احتياطية صامتة، والمسح الكامل
     يقع في purge (io/store.js) حيث يُعرَف نطاقُ «كلّ ما هو محفوظ». */
}
export const currency = () => CFG.currency;
export const setCurrency = c => { if (c) { CFG.currency = c; persistCfg(); } };
export const taxRate = () => CFG.taxRate;
export const setTaxRate = r => { CFG.taxRate = Math.max(0, +r || 0); persistCfg(); };
export const round2 = n => Math.round((+n + Number.EPSILON) * 100) / 100;
export const formatMoney = n => `${round2(n).toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${CFG.currency}`;
export function price(items) {
  const rows = (items || []).map(it => {
    const def = RATES[it.key] || {};
    const rate = it.rate ?? def.rate ?? 0;
    const qty = +it.qty || 0;
    return { key: it.key, label: it.label || def.label || it.key, unit: it.unit || def.unit || "", qty, rate, amount: round2(qty * rate) };
  });
  const subtotal = round2(rows.reduce((s, r) => s + r.amount, 0));
  const tax = round2(subtotal * CFG.taxRate);
  return { rows, subtotal, tax, total: round2(subtotal + tax), currency: CFG.currency, taxRate: CFG.taxRate };
}
export const toJSON = () => ({ currency: CFG.currency, taxRate: CFG.taxRate, rates: RATES });
export function fromJSON(d) {
  if (!d) return;
  if (d.currency) CFG.currency = d.currency;
  if (typeof d.taxRate === "number") CFG.taxRate = Math.max(0, d.taxRate);
  if (d.rates) RATES = { ...DEFAULTS, ...d.rates };
}