/* ═══ رسم مثيل كتلة على القماش أو في المصغّرة ═══ */
import { explode } from "../core/blocks.js";
import { pal } from "./theme.js";

export function drawInstance(ctx, inst, toScreen, opts = {}) {
  const prims = explode(inst);
  if (!prims.length) return;
  const P = pal();
  ctx.save();
  ctx.lineWidth = opts.lineWidth || 1.4;
  ctx.strokeStyle = opts.color || (opts.ghost ? (P.ghost || P.pre) : (P.dflt || "#e9edf2"));
  if (opts.ghost) { ctx.globalAlpha = 0.6; ctx.setLineDash([5, 4]); }
  for (const p of prims) {
    ctx.beginPath();
    if (p.t === "line") {
      const a = toScreen(p.a), b = toScreen(p.b);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    } else if (p.t === "arc") {
      const c = toScreen([p.cx, p.cy]);
      const rp = toScreen([p.cx + p.r, p.cy]);
      const rr = Math.max(0.2, Math.abs(rp[0] - c[0]));
      ctx.arc(c[0], c[1], rr, -p.a1 * Math.PI / 180, -p.a0 * Math.PI / 180,
        (p.a1 - p.a0) < 0);
    } else {
      p.pts.forEach((pt, i) => {
        const s = toScreen(pt);
        if (i) ctx.lineTo(s[0], s[1]); else ctx.moveTo(s[0], s[1]);
      });
      if (p.closed) ctx.closePath();
    }
    ctx.stroke();
  }
  ctx.restore();
}