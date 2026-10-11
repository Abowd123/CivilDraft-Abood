/* ═══ js/guide/usage.js — طبقة فوق coverage() لا بديلاً عنها ═══
   coverage() في catalog.js (القسم 8.5) يقيس فقط: هل للأداة بطاقة
   (بشرية أو آلية)؟ — لا يقيس هل استخدمها المتعلّم فعلاً في عمله
   اليومي خارج الدروس. هذا الملف يضيف ذلك التمييز (القسم 16.2 من
   خطة مرحلة ٩أ) بواجهةٍ صرفٍ مستقلّةٍ تماماً عن engine.js: لا يدخل
   pack() ولا التاريخ، بنفس فلسفة حمايات engine.js الخمس — لا يلمس
   S ولا OPT ولا T.hist مطلقاً. */
const KEY = "civildraft.guide.usage";
export const USED = {};
let T = null;

export function loadUsage() {
  if (typeof localStorage === "undefined") return false;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (d && typeof d === "object") {
      Object.keys(d).slice(0, 400).forEach(k => { USED[k] = d[k] ? 1 : 0; });
    }
    return true;
  } catch (e) { return false; }
}
function saveUsage() {
  if (typeof localStorage === "undefined") return;
  if (T) clearTimeout(T);
  T = setTimeout(() => {
    T = null;
    try { localStorage.setItem(KEY, JSON.stringify(USED)); } catch (e) {}
  }, 500);
}
export const usedBefore = id => !!USED[id];
export function markUsed(id) {
  if (!id || USED[id]) return false;
  USED[id] = 1; saveUsage();
  return true;
}

/* تقرير مركّب: تغطية البطاقات (من catalog) × استخدام فعلي */
export function usageCoverage(coverageFn) {
  const c = coverageFn();
  const usedCount = Object.keys(USED).filter(k => USED[k]).length;
  return { ...c, usedCount, usedPct: c.total ? Math.round(usedCount / c.total * 100) : 0 };
}
