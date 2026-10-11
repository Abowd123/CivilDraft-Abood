/* ═══ guide/peek.js — معاينة مصغّرة سريعة (Quick-peek) ═══
   بطاقة معاينة خفيفة (عنوان + هدف أول + زر "الشرح الكامل")، بلا
   سحبٍ ولا أوضاعٍ ثلاثة — طبقة استكشافٍ سريع قبل الالتزام بفتح
   floater.js الكامل. لا تستبدل floater.js بل تسبقه اختيارياً؛ لا
   تُنشَأ ولا تُستدعى تلقائياً من wire.js أو app.js — عميلٌ مستقبليٌّ
   (مثلاً تلميحٌ سياقيٌّ يفتح معاينةً بدل إغراق المستخدم في الدليل
   الكامل عند أول احتكاكٍ بأداة) يستوردها صراحةً حين يحتاجها.
   مرحلة ٩ب، القسم 16.6 — منقولةٌ من وحدة «تعلّم» بعد تكييفها مع
   catalog.js الفعلي (lessonById) بدل واجهة learn الأبسط. */
import { lessonById } from "./catalog.js";
import { escapeHtml as esc } from "../core/escape.js";

let box = null;

function ensure() {
  if (box && document.body.contains(box)) return box;
  box = document.createElement("div");
  box.id = "gdPeek";
  box.hidden = true;
  box.dir = "rtl";
  document.body.appendChild(box);
  return box;
}

/* يعرض معاينة الدرس id، أو يُخفي الصندوق إن لم يوجد. onFull(id) —
   يُنادى عند النقر على «الشرح الكامل»، فيُغلق المعاينة أولاً كي لا
   تبقى طافيةً فوق النافذة العائمة الكاملة. */
export function peekOpen(id, onFull) {
  const L = lessonById(id);
  const b = ensure();
  if (!L) { b.hidden = true; return b; }
  b.innerHTML = `
 <div class="gd-peek-hd"><b>${esc(L.title)}</b>
  <button type="button" class="gd-peek-x" data-peekx="1" aria-label="إغلاق">✕</button></div>
 <p class="gd-peek-goal">${esc((L.goals || [])[0] || "")}</p>
 <button type="button" class="gd-peek-full" data-peekfull="${esc(id)}">الشرح الكامل</button>`;
  b.hidden = false;
  const x = b.querySelector("[data-peekx]");
  if (x) x.onclick = () => { b.hidden = true; };
  const full = b.querySelector("[data-peekfull]");
  if (full) full.onclick = () => { b.hidden = true; if (onFull) onFull(id); };
  return b;
}

export function peekClose() { if (box) box.hidden = true; }
export const peekIsOpen = () => !!(box && !box.hidden);
