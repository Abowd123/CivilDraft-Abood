/* ═══ guide/floater.js — نافذة الدليل العائمة ═══
   حاوية ذاتية لا تعتمد واجهةَ الإرساء اليوم: تُبنى مرةً وتُعرض
   وتُخفى. سحبٌ بسيطٌ بمقبضها العلوي. وواجهتُها المعنية بالعميل —
   floaterOpen/Close/Body — تبقى ثابتةً ولو رُقّيت لاحقاً إلى
   الإرساء الكامل عبر dock.js. */
let root = null;

export function ensureFloater() {
  if (root && document.body.contains(root)) return root;
  const stage = (typeof document !== "undefined" && document.getElementById("stage"))
    || document.body;
  root = document.createElement("aside");
  root.id = "gdFloater";
  root.dir = "rtl";
  root.hidden = true;
  root.innerHTML = `
 <header class="gd-fh"><b>الدليل التعليمي</b>
  <button class="gd-fx" title="إغلاق" aria-label="إغلاق">✕</button></header>
 <div class="gd-body"></div>`;
  stage.appendChild(root);

  const head = root.querySelector(".gd-fh");
  const closeBtn = root.querySelector(".gd-fx");
  if (closeBtn) closeBtn.onclick = () => floaterClose();

  let drag = null;
  head.addEventListener("pointerdown", e => {
    drag = { x: e.clientX - root.offsetLeft, y: e.clientY - root.offsetTop };
    if (head.setPointerCapture) head.setPointerCapture(e.pointerId);
  });
  /* ═══ سحبٌ منطقيٌّ يعمل في RTL ═══ P5-007
     كان يكتب `left` و`right:auto` فوق نافذةٍ موضوعةٍ أصلاً بـ
     `inset-inline-end`: خلطُ نظامَي إحداثيّات. في RTL تنقلب الجهةُ
     فتقفز النافذةُ إلى موضعٍ غير متوقَّع أو تعود إلى الحافة.
     الآن إحداثيٌّ منطقيٌّ واحد: المسافةُ تُقاس من بداية السطر —
     وفي RTL هي من اليمين، فتُحوَّل مرّةً واحدةً هنا بتحويلٍ موثَّق. */
  const isRtl = () => {
    try{
      if (typeof getComputedStyle === "function")
        return getComputedStyle(root).direction === "rtl";
    }catch(_){}
    return (document.documentElement.getAttribute("dir") || "") === "rtl";
  };
  head.addEventListener("pointermove", e => {
    if (!drag) return;
    const px = e.clientX - drag.x, py = e.clientY - drag.y;
    const host = root.offsetParent || document.documentElement;
    const hw = (host && host.clientWidth) || 0;
    /* بدايةُ السطر: اليسارُ في LTR، وفي RTL ما بقي على يمين النافذة */
    const start = isRtl() ? (hw - (px + root.offsetWidth)) : px;
    root.style.setProperty("inset-inline-start", Math.round(start) + "px");
    root.style.setProperty("inset-inline-end", "auto");
    root.style.setProperty("inset-block-start", Math.round(py) + "px");
    root.style.setProperty("inset-block-end", "auto");
  });
  /* P5-014: التحريرُ صريحٌ، والفقدانُ يُنظِّف */
  const endDrag = e => {
    drag = null;
    try{
      if (e && head.releasePointerCapture && head.hasPointerCapture
          && head.hasPointerCapture(e.pointerId))
        head.releasePointerCapture(e.pointerId);
    }catch(_){}
  };
  head.addEventListener("pointerup", endDrag);
  head.addEventListener("pointercancel", endDrag);
  head.addEventListener("lostpointercapture", () => { drag = null; });

  return root;
}

export function floaterOpen() {
  const r = ensureFloater();
  r.hidden = false;
  return r;
}
export function floaterClose() { if (root) root.hidden = true; }
export function floaterIsOpen() { return !!(root && !root.hidden); }
export function floaterBody() {
  const r = ensureFloater();
  return r.querySelector(".gd-body");
}
