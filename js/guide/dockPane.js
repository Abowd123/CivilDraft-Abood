/* ═══ guide/dockPane.js — قسمٌ في عمود الإرساء يعرض فهرساً مصغّراً
   (نفس catalog.search) ويفتح القراءة الكاملة في floater.js عبر
   guideOpen(id) نفسها — بديلٌ فوريّ لا ينتظر توقيع
   openPanel/closePanel (القسم 16.1 من خطة مرحلة ٩أ).
   ملفٌّ جديد صغير، لا يُعدَّل عليه floater.js ولا wire.js ولا
   engine.js — استهلاكٌ بحتٌ لواجهتَي catalog.search وwire.guideOpen
   الموجودتين أصلاً. عند وصول توقيع openPanel/closePanel لاحقاً،
   يُستبدَل هذا الملف بإرساءٍ كامل دون أن يتأثر أي شيء آخر. */
import { UILIM } from "../core/limits.js";
import { search, coverage } from "./catalog.js";
import { escapeHtml as esc } from "../core/escape.js";
import { bindOnce } from "../core/delegate.js";

export function wireDockPane(sel, reg, openFn) {
  if (!document.querySelector(sel)) return;
  reg("guide", sel, el => {
    const c = coverage();
    el.innerHTML = `
      <div class="gd-prow">
        <input id="gdQp" type="search" autocomplete="off" placeholder="ابحث في الدليل…">
        <button data-gfull="1">فتح الدليل الكامل</button>
      </div>
      <p class="hint">${c.covered} من ${c.total} أداة موثّقة (${c.pct}%)</p>
      <div id="gdList"></div>`;
    const q = el.querySelector("#gdQp");
    const list = el.querySelector("#gdList");
    const paint = () => {
      const r = search(q.value || "");
      list.innerHTML = r.length
        ? r.slice(0, UILIM.searchResults.def).map(x => `
          <button class="gd-t" data-open="${esc(x.it.id)}">
            <span>${esc(x.it.title)}</span>
            <small>${x.it.kind === "course" ? "مسار" : "أداة/مقال"}</small>
          </button>`).join("")
        : `<p class="hint">لا نتائج</p>`;
    };
    let TM = null;
    q.addEventListener("input", () => { clearTimeout(TM); TM = setTimeout(paint, UILIM.debounceMs.def); });
    q.addEventListener("keydown", e => e.stopPropagation());
    /* P2-002: الحاضنُ el باقٍ بين النداءات (قد تُعيد اللوحةُ بناءه
       من callbackها)، فكان كلُّ نداءٍ يضيف مستمعاً جديداً. التفويضُ
       مرّةً واحدة — وq/list جديدانِ مع كل innerHTML فلا يُسرِّبان. */
    bindOnce(el, "click", e => {
      if (e.target.closest("[data-gfull]")) { openFn(); return; }
      const b = e.target.closest("[data-open]");
      if (b) openFn(b.dataset.open);
    }, "gdPane");
    paint();
  });
}
