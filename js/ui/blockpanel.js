/* ═══ لوحة العناصر: نقر أو سحب لبدء إدراج كتلة ═══
   MT3: أزرار إنشاء/إعادة تسمية/حذف، وأمر mkblock يجمّد التحديد
   الحالي في كتلةٍ جديدة — الزرّ والأمر كلاهما يمرّان بالبوّابة
   نفسها (blockops → defineFromPrims → V("blockDef") → checkPrims). */
import { blockList, makeInstance, explode, bbox } from "../core/blocks.js";
import { startInsert } from "../tools/blocks.js";
import { pal } from "./theme.js";
import { selList } from "./canvas.js";
import { defTool, H } from "../tools/registry.js";
import { collectFromSel } from "../tools/blockcollect.js";
import { createBlock, renameBlock, deleteBlock } from "../tools/blockops.js";
import { editFailed } from "../core/state.js";

const ID = "blkPanel";
let root = null, listEl = null, mounted = false;

function thumb(name) {
  const w = 46, h = 38, pad = 6, cv = document.createElement("canvas");
  cv.width = w; cv.height = h; cv.className = "blk-th";
  const ctx = cv.getContext("2d"), inst = makeInstance(name),
        prims = explode(inst), bb = bbox(inst);
  const bw = Math.max(1e-6, bb.maxX - bb.minX),
        bh = Math.max(1e-6, bb.maxY - bb.minY);
  const s = Math.min((w - 2 * pad) / bw, (h - 2 * pad) / bh);
  const ox = (w - bw * s) / 2 - bb.minX * s,
        oy = (h - bh * s) / 2 - bb.minY * s;
  const T = ([x, y]) => [ox + x * s, h - (oy + y * s)];
  ctx.strokeStyle = pal().dflt || "#e9edf2"; ctx.lineWidth = 1.2;
  for (const p of prims) {
    ctx.beginPath();
    if (p.t === "line") {
      const a = T(p.a), b = T(p.b);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    } else if (p.t === "arc") {
      const c = T([p.cx, p.cy]), rp = T([p.cx + p.r, p.cy]);
      const rr = Math.max(0.2, Math.abs(rp[0] - c[0]));
      ctx.arc(c[0], c[1], rr, -p.a1 * Math.PI / 180, -p.a0 * Math.PI / 180,
        (p.a1 - p.a0) < 0);
    } else {
      p.pts.forEach((pt, i) => {
        const q = T(pt);
        if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]);
      });
      if (p.closed) ctx.closePath();
    }
    ctx.stroke();
  }
  return cv;
}

function build() {
  root = document.getElementById(ID);
  if (!root) {
    root = document.createElement("aside");
    root.id = ID; root.hidden = true; root.dir = "rtl";
    root.innerHTML =
      `<header class="blk-h"><span class="blk-title">العناصر</span>` +
      `<button class="blk-x" data-act="new" title="أنشئ كتلة من التحديد">+</button>` +
      `<button class="blk-x" data-act="ren" title="إعادة تسمية كتلة">اسم</button>` +
      `<button class="blk-x" data-act="del" title="حذف كتلة">حذف</button>` +
      `<button class="blk-x" data-act="close" title="إغلاق">✕</button></header>` +
      `<div class="blk-sc">` +
      `<label class="blk-scale"><span>عرض ×</span>` +
      `<input id="blkSx" type="number" min="0.05" step="0.05" value="1"></label>` +
      `<label class="blk-scale"><span>ارتفاع ×</span>` +
      `<input id="blkSy" type="number" min="0.05" step="0.05" value="1"></label>` +
      `</div><div class="blk-body"></div>`;
    document.body.appendChild(root);
  }
  listEl = root.querySelector(".blk-body");
  root.addEventListener("click", onClick);
}

function render() {
  if (!listEl) return;
  listEl.innerHTML = "";
  for (const b of blockList()) {
    const it = document.createElement("button");
    it.className = "blk-it"; it.dataset.name = b.name;
    it.title = b.title; it.draggable = true;
    it.appendChild(thumb(b.name));
    const lbl = document.createElement("span");
    lbl.className = "blk-lbl"; lbl.textContent = b.title;
    it.appendChild(lbl);
    it.addEventListener("dragstart", e => {
      e.dataTransfer.setData("application/x-civildraft-block", b.name);
      e.dataTransfer.setData("application/x-civildraft-block-scale",
        JSON.stringify(scaleOpts()));
    });
    listEl.appendChild(it);
  }
}

/* ═══ إنشاء كتلة ═══ */
function askNameTitle() {
  const name = prompt("اسم الكتلة — لاتيني يبدأ بحرف (مثل MY-BLOCK):");
  if (name == null) return null;
  const title = prompt("العنوان العربي (اختياري):", "");
  if (title === null) return null;
  return { name, title: String(title || "").trim() };
}
function mkBlockFromSelection() {
  const list = selList();
  if (!list.length) {
    H.rep("wr", "لا عناصر محددة — حدّد العناصر أولاً ثم أنشئ الكتلة");
    return false;
  }
  const c = collectFromSel(list);
  if (!c.prims.length) {
    H.rep("wr", c.excluded
      ? `كل المحدد غير قابل للطباعة أو مخفي (${c.excluded} عنصراً)`
      : "لا بدائيات صالحة للتجميد في التحديد");
    return false;
  }
  const q = askNameTitle();
  if (!q) return false;
  const cx = (c.bb.x0 + c.bb.x1) / 2, cy = (c.bb.y0 + c.bb.y1) / 2;
  const r = createBlock(q.name, q.title, c.prims,
    [Math.round(cx), Math.round(cy)]);
  if (editFailed() || !r) { render(); return false; }
  H.rep("ok", `أُنشئت كتلة «${r.name}» من ${list.length} عنصر`
    + (c.excluded ? ` — استُبعد ${c.excluded} مخفيّاً أو غير قابلٍ للطباعة` : ""));
  render(); H.refresh(); H.draw();
  return false;
}
function renamePrompt() {
  const from = prompt("الكتلة المراد إعادة تسميتها:");
  if (from == null) return;
  const known = blockList().find(b => b.name === from);
  const to = prompt("الاسم الجديد:", from);
  if (to == null) return;
  const title = prompt("العنوان الجديد (اختياري):", known ? known.title : from);
  if (title === null) return;
  const r = renameBlock(from, to, title);
  if (editFailed() || !r) { render(); return; }
  H.rep("ok", `أُعيدت تسمية «${r.from}» إلى «${r.to}»`
    + (r.moved ? ` — نُقل ${r.moved} مثيلاً` : ""));
  render(); H.refresh(); H.draw();
}
function deletePrompt() {
  const name = prompt("حذف كتلة — تُرفَض إن كانت مستعملةً في رسمٍ:");
  if (name == null) return;
  if (!confirm(`حذف كتلة «${name}»؟`)) return;
  const r = deleteBlock(name);
  if (editFailed()) { render(); return; }   /* الرسالة فُصِّلت في النواة: تسمّي عدد المثيلات */
  H.rep(r === true ? "ok" : "wr",
    r === true ? `حُذفت «${name}»`
    : r === false ? `لا كتلة اسمها «${name}»`
    : "تعذّر الحذف");
  render(); H.refresh(); H.draw();
}

function onClick(e) {
  const act = e.target.closest("[data-act]");
  if (act) {
    const a = act.dataset.act;
    if (a === "close") return closeBlockPanel();
    if (a === "new") return mkBlockFromSelection();
    if (a === "ren") return renamePrompt();
    if (a === "del") return deletePrompt();
  }
  const it = e.target.closest(".blk-it");
  if (it) startInsert(it.dataset.name, scaleOpts());
}

/* مثيل الكتلة ليس كياناً قابلاً للتحديد فلا يُعدَّل مقياسه بعد الإدراج؛
   يُدخَل وقت الإدراج من الحقلين (الأسهم أثناء الإدراج تبقى تعدّله). */
function scaleOpts() {
  const num = id => {
    const v = parseFloat(root && root.querySelector(id)?.value);
    return Number.isFinite(v) && v > 0 ? v : 1;
  };
  return { scaleX: num("#blkSx"), scaleY: num("#blkSy") };
}

export function initBlockPanel() {
  if (mounted) return; build(); mounted = true; render();
}
export function openBlockPanel() {
  if (!mounted) initBlockPanel(); root.hidden = false; render();
}
export function closeBlockPanel() { if (root) root.hidden = true; }
export function toggleBlockPanel() {
  if (!mounted) initBlockPanel();
  root.hidden = !root.hidden;
  if (!root.hidden) render();
}

/* ═══ أمر سطر الإدخال — MT3 ═══
   الكلمة «mkblock» (أو «بلوك» أو «كتلةجديدة») تنادي المسار نفسه
   الذي تناديه الزرّ، فليس ثمّة مسارٌ مختصرٌ بين واجهتين.
   own:1 لازمة: بلا هذا العلَم يُغلَّف start() بـjoinTxn من registry.js
   فيرى edit() الداخليّ في blockops.js أن TXN>0 ولا يأخذ لقطته الخاصّة
   ولا يدفع تاريخاً ولا يستدعي autosave — فيضيع الإنشاء من التراجع
   والحفظ التلقائي صامتاً (نفس عقد أداة «حذف» في tools/modify.js). */
defTool({
  id: "mkblock", alias: "mkblock كتلةجديدة بلوك",
  label: "كتلة من التحديد",
  hint: "يجمّد التحديد الحالي في كتلةٍ جديدة",
  destruct: 0, own: 1,
  steps: [],
  start() { mkBlockFromSelection(); return false; }
});
