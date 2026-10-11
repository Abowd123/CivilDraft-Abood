/* ═══ guide/viewer.js — عارض الدرس ═══ (✅ رُوجعت في مرحلة ٨ ضد
   css/guide.css وschema.js: كل أصناف DOM المُصدَرة هنا (gd-head/gd-t/
   gd-m/gd-sec/gd-modes/gd-canvas/gd-events/gd-ev/gd-foot/gd-try/gd-rel)
   لها تنسيقٌ مطابقٌ فعلي في css/guide.css، فلا تقديرَ متبقٍّ هنا)
   عرضٌ فقط؛ التنفيذ كلّه في engine.js. يفصل التحضير
   (lessonSections/lessonText) عن الرسم في DOM (renderLesson)
   ليكون الاختبار بلا متصفح ممكناً، ولتُعاد قراءة النصوص في
   المولّد المستقل من مصدرٍ واحد. */
import { escapeHtml as esc } from "../core/escape.js";

const LEVEL_N = { 1: "مبتدئ", 2: "متوسط", 3: "متقدم" };

/* ═══ أقسام الدرس منظّمةً ═══
   بلا DOM — تُفحَص في Node وتُغذّي المولّد المستقل أيضاً. */
export function lessonSections(L) {
  return {
    header: {
      title: L.title, kind: L.kind, level: L.level,
      minutes: L.minutes, placement: L.placement || null
    },
    goals: L.goals || [],
    why: L.why || [],
    body: L.body || null,
    script: L.script || [],
    exercises: L.exercises || [],
    mistakes: L.mistakes || [],
    faq: L.faq || [],
    related: L.related || []
  };
}

/* ═══ نصّ الدرس ═══
   يُستعمل للملخّص السريع وللمولّد المستقل — لا يُكرَّر في مكانين. */
export function lessonText(L) {
  const s = lessonSections(L);
  const out = [];
  out.push(`«${s.header.title}»`
    + (s.header.placement ? ` — ${s.header.placement.tab} ← ${s.header.placement.panel}` : ""));
  if (s.goals.length) { out.push("الأهداف:"); s.goals.forEach(g => out.push("• " + g)); }
  if (s.why.length) { out.push("لماذا:"); s.why.forEach(w => out.push("• " + w)); }
  if (s.mistakes.length) {
    out.push("أخطاء شائعة:");
    s.mistakes.forEach(m => out.push(`• ${m.when} — ${m.why}`));
  }
  if (s.faq.length) {
    out.push("أسئلة شائعة:");
    s.faq.forEach(f => out.push(`س: ${f.q}\n   ج: ${f.a}`));
  }
  return out.join("\n");
}

/* ═══ رسم الدرس في حاوية DOM ═══
   handlers: {onMode(m), onTry(), onRelated(id)} — اختيارية.
   يعيد {canvas, setStep(t), showEvent(n), clearEvents()}
   كي يعلّق المحرّكُ أحداثَ R.H.rep حيّةً في شريط الأحداث. */
export function renderLesson(container, L, handlers) {
  if (!container || !L) return null;
  const h = handlers || {};
  const s = lessonSections(L);
  container.dir = "rtl";

  const part = (title, cls, items, mk) =>
    (items && items.length)
      ? `<div class="gd-sec"><h5>${esc(title)}</h5><ul class="${cls || ""}">${items.map(mk).join("")}</ul></div>`
      : "";

  container.innerHTML = `
 <header class="gd-head">
  <div class="gd-t">${esc(s.header.title)}</div>
  <div class="gd-m">${s.header.placement ? esc(s.header.placement.tab + " ← " + s.header.placement.panel) + " · " : ""}${LEVEL_N[s.header.level] || ""} · ${esc(String(s.header.minutes))} دقائق</div>
 </header>
 ${part("ماذا تتعلم", "gd-goals", s.goals, g => `<li>${esc(g)}</li>`)}
 ${part("لماذا", "gd-why", s.why, w => `<li>${esc(w)}</li>`)}
 ${s.body ? `<section class="gd-sec gd-body">${esc(s.body)}</section>` : ""}
 ${s.script && s.script.length ? `
 <section class="gd-replay">
  <div class="gd-modes">
   <button data-gd-m="demo">▶ عرض تلقائي</button>
   <button data-gd-m="guide">✋ تدرّب موجّه</button>
   <button data-gd-m="exercise">📝 تمرين حر</button>
  </div>
  <div class="gd-step"></div>
  <canvas class="gd-canvas"></canvas>
  <div class="gd-events"></div>
 </section>` : ""}
 ${s.exercises && s.exercises.length ? `<section class="gd-sec"><h5>تمارين</h5><ul class="gd-ex">${
   s.exercises.map(x => `<li><b>${esc(x.goal)}</b>${x.why ? `<div class="gd-why">${esc(x.why)}</div>` : ""}</li>`).join("")
 }</ul></section>` : ""}
 ${s.mistakes && s.mistakes.length ? `<section class="gd-sec"><h5>أخطاء شائعة</h5><ul>${
   s.mistakes.map(m => `<li><b>${esc(m.when)}</b> — ${esc(m.why)}</li>`).join("")
 }</ul></section>` : ""}
 ${s.faq && s.faq.length ? `<section class="gd-sec"><h5>أسئلة شائعة</h5><dl>${
   s.faq.map(f => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join("")
 }</dl></section>` : ""}
 <footer class="gd-foot">
  <button data-gd-try class="gd-try">جرّب في مشروعي</button>
  ${s.related.map(id => `<button class="gd-rel" data-gd-rel="${esc(id)}">${esc(id)}</button>`).join("")}
 </footer>`;

  /* ربطٌ بالتفويض لا بالاستماع لكل زرّ وحده */
  const evr = container.querySelector(".gd-replay");
  if (evr) evr.addEventListener("click", e => {
    const b = e.target.closest("[data-gd-m]");
    if (b && h.onMode) h.onMode(b.dataset.gdM);
  });
  const tr = container.querySelector("[data-gd-try]");
  if (tr) tr.onclick = () => { if (h.onTry) h.onTry(); };
  container.querySelectorAll("[data-gd-rel]").forEach(b => {
    b.onclick = () => { if (h.onRelated) h.onRelated(b.dataset.gdRel); };
  });

  const stepEl = container.querySelector(".gd-step");
  const eventsEl = container.querySelector(".gd-events");
  const canvas = container.querySelector(".gd-canvas");

  return {
    canvas,
    setStep(t) { if (stepEl) stepEl.textContent = t || ""; },
    showEvent(n) {
      if (!eventsEl) return;
      const d = document.createElement("div");
      d.className = "gd-ev"
        + ((n && n.c === "er") ? " err" : (n && n.c === "ok") ? " ok" : "");
      d.textContent = n ? ((n.m) || (n.text) || "") : "";
      eventsEl.appendChild(d);
      eventsEl.scrollTop = eventsEl.scrollHeight;
    },
    clearEvents() { if (eventsEl) eventsEl.innerHTML = ""; }
  };
}
