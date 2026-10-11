/* ═══ أداة إدراج العناصر ═══ */
import { makeInstance } from "../core/blocks.js";
import { edit } from "../core/state.js";
import { H } from "./registry.js";

let hooks = null;
let active = null;

export function initBlockTool(h) { hooks = h || null; }
export const isInserting = () => !!active;
export const ghost = () => active;
const snap = w => (hooks && hooks.snap && hooks.snap(w)) || w;
const defaultLayer = () => typeof hooks?.defaultLayer === "function"
  ? hooks.defaultLayer() : (hooks?.defaultLayer || "0");

export function startInsert(name, opts = {}) {
  active = {
    block: name, x: 0, y: 0,
    rot: Number.isFinite(+opts.rot) ? +opts.rot : 0,
    scale: Number.isFinite(+opts.scale) && +opts.scale > 0 ? +opts.scale : 1,
    /* scaleX/scaleY: تمريرٌ اختياريٌّ لمن يريد إدراجاً بعرضٍ وارتفاعٍ
       مستقلَّين (مثلاً نافذة بعرض مغاير) — الافتراضي 1 يُبقي السلوك
       القديم (المقياس الموحَّد وحده) كما هو تماماً. وحتى هذا التعديل
       كان opts.scaleX/scaleY الطريق الوحيد للوصول إليهما: لا مستدعٍ
       (لوحة الكتل blockpanel.js تنادي startInsert(name) بلا opts، ولا
       لوحة خصائصَ بعد الإدراج) كان يمرّرهما فعلياً — فالفجوة التي
       سدّها core/blocks.js (المراجعة #1) بقيت بلا طريقٍ يبلغها
       المستخدم. الأسهم أثناء الإدراج (أدناه) هي ذلك الطريق الآن. */
    scaleX: Number.isFinite(+opts.scaleX) && +opts.scaleX > 0 ? +opts.scaleX : 1,
    scaleY: Number.isFinite(+opts.scaleY) && +opts.scaleY > 0 ? +opts.scaleY : 1,
    mirror: !!opts.mirror, layer: opts.layer || defaultLayer()
  };
  H.rep?.("in", "إدراج: انقر للموضع · R تدوير · M مرآة · "
    + "◀▶ عرض △▽ ارتفاع · +/- مقياسٌ موحَّد · Esc إلغاء");
  hooks?.redraw?.();
  return active;
}

export function onMove(world) {
  if (!active) return;
  const p = snap(world);
  active.x = p[0] ?? p.x ?? 0;
  active.y = p[1] ?? p.y ?? 0;
  hooks?.redraw?.();
}

export function onClick(world) {
  if (!active) return null;
  const p = snap(world);
  const x = p[0] ?? p.x ?? 0, y = p[1] ?? p.y ?? 0;
  const inst = makeInstance(active.block, {
    x, y, rot: active.rot, scale: active.scale,
    scaleX: active.scaleX, scaleY: active.scaleY,
    mirror: active.mirror, layer: active.layer
  });
  edit(() => hooks?.addInstance?.(inst), "إدراج " + active.block);
  H.rep?.("in", "أُدرج عنصر");
  hooks?.redraw?.();
  return inst;
}

export function onKey(e) {
  if (!active) return false;
  if (e.key === "Escape") { cancel(); return true; }
  if (e.key === "r" || e.key === "R") {
    active.rot += (e.shiftKey ? -1 : 1) * Math.PI / 2;
    hooks?.redraw?.(); return true;
  }
  if (e.key === "m" || e.key === "M") {
    active.mirror = !active.mirror;
    hooks?.redraw?.(); return true;
  }
  if (e.key === "+" || e.key === "=") {
    active.scale *= 1.1; hooks?.redraw?.(); return true;
  }
  if (e.key === "-" || e.key === "_") {
    active.scale /= 1.1; hooks?.redraw?.(); return true;
  }
  /* ═══ مقياسٌ مستقلٌّ لكل محور أثناء الإدراج ═══
     ◀▶ للعرض (scaleX) و△▽ للارتفاع (scaleY) — القيمة نفسها التي
     يحملها المثيل عند onClick إلى makeInstance. بلا هذا كان
     scaleX/scaleY حقلاً حياً في core/blocks.js لا طريق مستخدمٍ
     يبلغه، فتبقى كل الكتل الموضوعة عملياً 1:1 كما كانت قبل
     المراجعة رغم أن الرياضيات تدعم الاستطالة المستقلّة. */
  if (e.key === "ArrowRight") {
    active.scaleX *= 1.1; hooks?.redraw?.(); return true;
  }
  if (e.key === "ArrowLeft") {
    active.scaleX = Math.max(0.05, active.scaleX / 1.1);
    hooks?.redraw?.(); return true;
  }
  if (e.key === "ArrowUp") {
    active.scaleY *= 1.1; hooks?.redraw?.(); return true;
  }
  if (e.key === "ArrowDown") {
    active.scaleY = Math.max(0.05, active.scaleY / 1.1);
    hooks?.redraw?.(); return true;
  }
  return false;
}

export function cancel() {
  active = null;
  H.rep?.("in", "أُلغي الإدراج");
  hooks?.redraw?.();
}