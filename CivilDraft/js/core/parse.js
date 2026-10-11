/* ═══ المحلّل الموحَّد — 2.1 ═══
   نقطة دخولٍ واحدة لكل نصٍّ يكتبه المستخدم أو يأتي من مزوّد
   الذكاء: أرقام · أطوال · زوايا · نقاط · منطقيّ. تقبل الأرقام
   العربية والفارسية والفواصل العشرية ٫ ، والوحدات mm/cm/m.

   ولا تُسقِط فاشلاً إلى صفر: ما لا يُفهَم يُرمى بـParseError له
   code ثابت ورسالةٌ تقول السبب. (M المتساهل في units.js للإدخال
   الحيّ وحده — انظر mharden.test.js.)

   الأكواد: EMPTY · NOT_A_NUMBER · NOT_FINITE · OUT_OF_RANGE ·
   NOT_A_LENGTH · NOT_A_POINT · BASE_MISSING · BAD_BASE · NO_DIR ·
   ANGLE_LOCK · LENGTH_ONLY · DIMENSION · NOT_A_BOOL · وأكواد
   validate.js. */
import {norm, Mx, deg, dim2} from "./units.js";
import {parsePt} from "./coords.js";
import {LIM, limMin, limMax} from "./limits.js";

export class ParseError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = "ParseError";
    this.code = code;
    this.detail = (detail === undefined) ? null : detail;
  }
}

function checkRange(n, lim, name) {
  if (!lim) return n;
  const lo = limMin(lim), hi = limMax(lim);
  if (lo != null && n < lo)
    throw new ParseError("OUT_OF_RANGE",
      `${name} ${n} أصغر من الحدّ الأدنى ${lo}`);
  if (hi != null && n > hi)
    throw new ParseError("OUT_OF_RANGE",
      `${name} ${n} أكبر من الحدّ الأقصى ${hi}`);
  return n;
}
const isEmpty = v => v == null || (typeof v === "string" && v.trim() === "");

/* ═══ الأرقام ═══ بلا وحدات (الوحدات في parseLength) */
export function parseNumber(v, opts) {
  const o = opts || {};
  if (isEmpty(v)) {
    if (o.def !== undefined) return o.def;
    throw new ParseError("EMPTY", "لا رقم");
  }
  if (typeof v === "number") {
    if (!isFinite(v)) throw new ParseError("NOT_FINITE", "رقمٌ غير منتهٍ");
    return checkRange(v, o.lim, "الرقم");
  }
  const s = norm(String(v)).replace(/\s+/g, "").replace(/,/g, ".");
  if (!/^-?\d*\.?\d+$/.test(s))
    throw new ParseError("NOT_A_NUMBER", `«${v}» ليس رقماً`, s);
  const n = parseFloat(s);
  if (!isFinite(n))
    throw new ParseError("NOT_FINITE", `«${v}» ليس رقماً منتهياً`);
  return checkRange(n, o.lim, "الرقم");
}

/* ═══ الأطوال ═══ تعيد المليمتر. الرقم بلا وحدة = متر. */
export function parseLength(v, opts) {
  const o = opts || {};
  if (isEmpty(v)) {
    if (o.def !== undefined) return o.def;
    throw new ParseError("EMPTY", "لا طول");
  }
  const mm = Mx(v);
  if (mm == null)
    throw new ParseError("NOT_A_LENGTH", `«${v}» ليس طولاً صالحاً`);
  return checkRange(mm, o.lim || LIM.length, "الطول");
}

/* ═══ الزوايا ═══ بالدرجات، ويقبل ° لاحقةً. {wrap:false} بلا لفّ. */
export function parseAngle(v, opts) {
  const o = opts || {};
  if (isEmpty(v)) {
    if (o.def !== undefined) return o.def;
    throw new ParseError("EMPTY", "لا زاوية");
  }
  let s = v;
  if (typeof s === "string") s = s.replace(/°\s*$/, "").trim();
  const n = parseNumber(s);
  return checkRange((o.wrap === false) ? n : deg(n), o.lim, "الزاوية");
}

/* ═══ النقاط ═══ تفوِّض إلى coords.parsePt وتحوّل نتيجتها إلى رمي.
   ما ليس نقطةً يُرمى برمزٍ صريح: ANGLE_LOCK · LENGTH_ONLY ·
   DIMENSION. وما لا صيغةَ له NOT_A_POINT. */
export function parsePoint(s, base, dir, opts) {
  const o = opts || {};
  if (isEmpty(s)) {
    if (o.def !== undefined) return o.def;
    throw new ParseError("EMPTY", "لا نقطة");
  }
  const r = parsePt(s, base, dir);
  if (!r) throw new ParseError("NOT_A_POINT", `«${s}» ليس نقطةً صالحة`);
  if (r.k === "pt") return r.p;
  if (r.k === "err") throw new ParseError(r.c || "NOT_A_POINT", r.m);
  if (r.k === "ang")
    throw new ParseError("ANGLE_LOCK", `قفل زاوية ${r.a}° — ليست نقطة`);
  if (r.k === "len")
    throw new ParseError("LENGTH_ONLY", `طولٌ ${r.L} بلا اتجاه — ليس نقطة`);
  if (r.k === "dim")
    throw new ParseError("DIMENSION", `مقاس ${dim2(r.w,r.d)} — ليس نقطة`);
  throw new ParseError("NOT_A_POINT", `«${s}» ليس نقطةً صالحة`);
}

/* ═══ المنطقيّ ═══ */
export function parseBool(v, opts) {
  const o = opts || {};
  if (isEmpty(v)) {
    if (o.def !== undefined) return o.def;
    throw new ParseError("EMPTY", "لا قيمة منطقية");
  }
  if (typeof v === "boolean") return v;
  const s = norm(String(v));
  if (/^(1|true|yes|on|نعم|صحيح)$/.test(s)) return true;
  if (/^(0|false|no|off|لا|خطا)$/.test(s)) return false;
  throw new ParseError("NOT_A_BOOL", `«${v}» ليست قيمةً منطقية`);
}
