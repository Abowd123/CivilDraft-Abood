/* ═══ أنواع الخطوط: بيانات مشروع ═══
   كانت الأنواع جدولاً ثابتاً في laydef.js فلا يتغيّر ما يقرؤه resolve
   إلا بتغيير المصنع نفسه. هنا تصير بياناتَ مشروعٍ كحالات الطبقات
   (S.layst): تُحفَظ وتدخل التاريخ عبر KEYS/DEF، وتُطبَّع في
   ensureShape، وتُدار بمعاملات ذرّية.

   ولا يمسّ هذا الملفّ المصدرين الأربعة: dash يخرج من resolve إلى
   style.js كما كان، وقرار القطع في CAPS.dxf.cut وحده.

   والدورتان الظاهرتان (layers↔ltypes عبر invalidate، وstate↔ltypes
   عبر normLtypes) آمنتان كدورة state↔layers الموثّقة: كل نداءٍ
   يقع وقت التشغيل لا وقت التحميل. */
import {S, edit} from "./state.js";
import {LT} from "./laydef.js";
import {invalidate} from "./layers.js";
import {LIM} from "./limits.js";

/* المصنع — نسخة تُملَك لا تُشارَك: تعديلُها لا يمسّ laydef */
export const defLtypes = () => {
  const o = {};
  Object.keys(LT).forEach(k => {
    o[k] = { n: LT[k].n, dxf: LT[k].dxf, mm: (LT[k].mm || []).slice() };
  });
  return o;
};

const NAME_OK = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;
export const ltNameOk = n => NAME_OK.test(String(n || ""));
export const isCustomLt = n => !!(S.ltypes && S.ltypes[n] && !LT[n]);

/* قيم الحقل شكلاً — لا دخولَ لسطرٍ فاسد إلى الجدول */
const dashOk = v => {
  if (!Array.isArray(v)) return [];
  return v
    .map(x => {
      const n = +x;
      return isFinite(n) && n > 0 ? Math.min(Math.max(0.1, n), 200) : 0;
    })
    .filter(x => x > 0)
    .slice(0, 16);
};
const dxfOk = v => {
  const s = String(v == null ? "" : v).trim();
  return /^[A-Za-z0-9_$.-]{1,31}$/.test(s) ? s : "CONTINUOUS";
};

/* الوصول: الحيُّ ثم المصنع ثم solid رجوعاً */
export const ltDef = k => {
  const o = S.ltypes && S.ltypes[k];
  if (o) return o;
  return LT[k] || LT.solid;
};
export const ltOk = k => {
  const s = String(k || "");
  if (LT[s]) return s;
  if (S.ltypes && S.ltypes[s]) return s;
  return null;
};
export const ltLabel = k => (ltOk(k) ? ltDef(k).n : String(k || ""));
export const ltDashes = k => (ltDef(k).mm || []).slice();

/* قائمة المدير: المصنع بترتيبه ثم المخصصة مرتّبة */
export const ltList = () => {
  const seen = new Set(), out = [];
  Object.keys(LT).forEach(k => {
    seen.add(k);
    out.push({ k, label: LT[k].n, dashes: LT[k].mm || [], custom: 0 });
  });
  Object.keys(S.ltypes || {})
    .filter(k => !seen.has(k))
    .sort()
    .forEach(k => {
      const t = S.ltypes[k];
      out.push({
        k,
        label: (t && t.n) || k,
        dashes: (t && t.mm) || [],
        custom: 1
      });
    });
  return out;
};

/* التطبيع — من ensureShape قبل normLays */
export function normLtypes() {
  const ix =
    S.ltypes && typeof S.ltypes === "object" && !Array.isArray(S.ltypes)
      ? S.ltypes
      : {};
  const out = defLtypes();
  const keys = Object.keys(ix).filter(k => !LT[k] && ltNameOk(k));
  if (keys.length > LIM.ltypes.max) keys.length = LIM.ltypes.max;
  keys.forEach(k => {
    const r = ix[k];
    if (!r || typeof r !== "object") return;
    const mm = dashOk(r.mm);
    if (!mm.length) return;
    out[k] = {
      n: String(r.n == null ? "" : r.n).slice(0, 40) || k,
      dxf: dxfOk(r.dxf),
      mm
    };
  });
  S.ltypes = out;
  return Object.keys(out).length;
}

/* الكتابة — معاملات ذرّية · bump:view لا geom: النمط هيئةٌ لا هندسة */
export function addLtype(name, label, dxf, mm) {
  return edit(() => {
    const k = String(name || "").trim();
    if (!ltNameOk(k))
      throw new Error(
        "اسم النوع لاتيني يبدأ بحرفٍ ويحوي أحرفاً وأرقاماً وشرطاتٍ " +
          "فحسب (مثل MB-DOUBLE) — الوصفُ العربيّ في خانة الوصف"
      );
    if (LT[k]) return false; /* المصنعيّ لا يُظلَّل */
    if (!S.ltypes || typeof S.ltypes !== "object" || Array.isArray(S.ltypes))
      S.ltypes = defLtypes();
    const custom = Object.keys(S.ltypes).filter(x => !LT[x]);
    if (!S.ltypes[k] && custom.length >= LIM.ltypes.max)
      throw new Error(
        `بلغت الأنواعُ المخصصةُ حدّها الأقصى ${LIM.ltypes.max}`
      );
    const mm2 = dashOk(mm);
    if (!mm2.length)
      throw new Error("نمطُ الشرطة يحتاج أطوالاً موجبة — مثل 8 2 1 2");
    S.ltypes[k] = {
      n: String(label == null ? "" : label).slice(0, 40) || k,
      dxf: dxfOk(dxf),
      mm: mm2
    };
    invalidate();
    return k;
  }, "إضافة نوع خط مخصص", { bump: "view" });
}

export function delLtype(name) {
  return edit(() => {
    const k = String(name || "");
    const o = S.ltypes && S.ltypes[k];
    if (!o) return false;
    if (LT[k]) return false; /* المصنعيّ لا يُحذَف */
    const used = (S.layers || []).filter(l => l.lt === k).length;
    if (used)
      throw new Error(
        `تستعمله ${used} من الطبقات — انقلها إلى نوعٍ آخر قبل حذفه`
      );
    delete S.ltypes[k];
    invalidate();
    return true;
  }, "حذف نوع خط مخصص", { bump: "view" });
}

export function resetLtypes() {
  return edit(() => {
    const used = [
      ...new Set(
        (S.layers || []).filter(l => l.lt && !LT[l.lt]).map(l => l.lt)
      )
    ];
    if (used.length)
      throw new Error(
        `لا يُعاد المصنع — ${used.length} من الطبقات تستعمل أنواعاً ` +
          `مخصصة (مثل ${used[0]}). انقلها أو احذفها أولاً`
      );
    S.ltypes = defLtypes();
    invalidate();
    return Object.keys(S.ltypes).length;
  }, "إعادة مصنع أنواع الخطوط", { bump: "view" });
}
