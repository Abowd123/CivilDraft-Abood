/* ═══ guide/sketch.js — الرمل المصغّر ═══ (✅ رُوجعت في مرحلة ٨ ضد
   core/render.js#scene · io/style.js#styleOf/fillOf ·
   tools/registry.js#preview — كل الواجهات المستعملة أدناه (scene().P،
   scene().B بحقول x0/y0/x1/y1 عبر bboxUnion في core/geom.js، وR.preview())
   مطابقةٌ حرفياً للمصدر الفعلي، فلا تقديرَ متبقٍّ هنا)
   رسّامٌ خاص للدرس، لا يشارك حالة الكانفاس الرئيسي: يرسم
   scene().P بنفس أنماط canvas.paint، ثم يضيف أشباح الأداة
   الجارية (R.preview()) كالقماش الرئيسي حرفياً.

   لا التقاطٌ ولا تحديد: النقر يُعيد إحداثياتِ عالمٍ للأمر،
   وخطوات st.ent تُغذّى نصياً داخل الدرس — فالرمل عرضٌ وتعليم
   لا محرّك إدخال كامل. */
import { scene } from "../core/render.js";
import { txtH } from "../core/state.js";
import { styleOf, fillOf } from "../io/style.js";
import * as R from "../tools/registry.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ═══ طلاء الأوّليات ═══
   نفس أنماط canvas.paint مبسّطةً إلى ما يحتاجه الرمل:
   fill ثم hatch ثم line/poly/arc/text — بلا شبكة ولا مقابض. */
function paintList(cx, P, SO, V, W2S) {
  /* صبغة المناطق تحت كل شيء */
  for (const g of P) {
    if (g.t !== "fill") continue;
    const f = fillOf(g, "canvas", SO);
    if (f.skip) continue;
    const r = g.ring;
    if (!r || r.length < 3) continue;
    cx.save();
    cx.beginPath();
    r.forEach((q, i) => {
      const p = W2S(q[0], q[1]);
      i ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1]);
    });
    cx.closePath();
    if (f.hatch) { cx.fillStyle = f.css; cx.globalAlpha = 0.4; }
    else { cx.fillStyle = f.css; cx.globalAlpha = f.a; }
    cx.fill();
    cx.restore();
  }
  cx.globalAlpha = 1;

  for (const g of P) {
    if (g.t === "fill") continue;
    const st = styleOf(g, "canvas", SO);
    if (st.skip && g.t !== "hatch") continue;
    cx.save();
    if (g.t === "hatch") {
      const hs = g.loops || [];
      if (!hs.length) { cx.restore(); continue; }
      cx.beginPath();
      hs.forEach(lp => {
        lp.forEach((q, i) => {
          const p = W2S(q[0], q[1]);
          i ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1]);
        });
        cx.closePath();
      });
      cx.globalAlpha = st.alpha;
      cx.fillStyle = st.css;
      cx.fill("evenodd");
      cx.restore();
      continue;
    }
    cx.strokeStyle = st.css; cx.fillStyle = st.css;
    cx.globalAlpha = st.alpha;
    cx.lineWidth = Math.min(2.5, st.lw);
    cx.setLineDash((st.dash || []).map(v => Math.max(1, v)));

    if (g.t === "line") {
      const a = W2S(g.a[0], g.a[1]), b = W2S(g.b[0], g.b[1]);
      cx.beginPath(); cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]); cx.stroke();
    } else if (g.t === "poly") {
      if (g.pts && g.pts.length > 1) {
        cx.beginPath();
        g.pts.forEach((q, i) => {
          const p = W2S(q[0], q[1]);
          i ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1]);
        });
        if (g.cl !== 0) cx.closePath();
        cx.stroke();
      }
    } else if (g.t === "arc") {
      const c = W2S(g.cx, g.cy), r = Math.abs(g.r) * V.k;
      const a0 = g.a0 || 0, a1 = g.a1 || 0;
      cx.beginPath();
      cx.arc(c[0], c[1], r, -a1 * Math.PI / 180, -a0 * Math.PI / 180, (a1 - a0) < 0);
      cx.stroke();
    } else if (g.t === "text") {
      const px = g.h * V.k;
      cx.setLineDash([]);
      cx.font = `${px}px Tahoma,Arial,sans-serif`;
      cx.textAlign = /m/.test(g.al || "") ? "center" : "start";
      cx.textBaseline = /m/.test(g.al || "") ? "middle" : "alphabetic";
      const p = W2S(g.x, g.y);
      cx.save();
      cx.translate(p[0], p[1]);
      cx.fillText(String(g.s), 0, 0);
      cx.restore();
    }
    cx.restore();
  }
  cx.setLineDash([]);
  cx.globalAlpha = 1;
}

/* ═══ أشباح الأداة الجارية ═══
   أنماط pv* من registry: خط l · مستطيل r · متعدد pg · نص tx —
   من canvas.drawPreview. */
function paintPhantoms(cx, list, V, W2S) {
  cx.save();
  cx.lineWidth = 1.6;
  list.forEach(g => {
    const col = g.c || "#5cd98e";
    cx.strokeStyle = col;
    cx.fillStyle = col;
    cx.setLineDash([6, 4]);
    if (g.t === "l") {
      const a = W2S(g.a[0], g.a[1]), b = W2S(g.b[0], g.b[1]);
      cx.beginPath(); cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]); cx.stroke();
    } else if (g.t === "r") {
      const a = W2S(g.a[0], g.a[1]), b = W2S(g.b[0], g.b[1]);
      cx.strokeRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]),
        Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    } else if (g.t === "pg") {
      if (!g.pts || g.pts.length < 2) return;
      cx.beginPath();
      g.pts.forEach((q, i) => {
        const t = W2S(q[0], q[1]);
        i ? cx.lineTo(t[0], t[1]) : cx.moveTo(t[0], t[1]);
      });
      if (g.cl !== 0) cx.closePath();
      cx.stroke();
    } else if (g.t === "tx") {
      const t = W2S(g.p[0], g.p[1]);
      cx.setLineDash([]);
      cx.font = "12px Consolas,monospace";
      cx.direction = "rtl"; cx.textAlign = "center"; cx.textBaseline = "middle";
      const w = cx.measureText(String(g.s)).width + 10;
      cx.fillStyle = "#2c3e50";
      cx.fillRect(t[0] - w / 2, t[1] - 10, w, 20);
      cx.fillStyle = "#fff";
      cx.fillText(String(g.s), t[0], t[1]);
    }
  });
  cx.setLineDash([]);
  cx.restore();
}

/* ═══ صانع الرمل ═══
   canvas عنصر <canvas> يملكه العارض. التخصيص صفرٌ بلا try/catch
   داخلي سوى بناء المشهد — تماماً كما يصنع canvas.js. */
export function makeSketch(canvas) {
  if (!canvas) throw new Error("الرمل يحتاج قماشاً");
  const cx = canvas.getContext("2d");
  if (!cx) throw new Error("تعذّر سياق الرسم 2d في الرمل");

  const V = { k: 0.05, cx: 6000, cy: 4000, w: 0, h: 0, dpr: 1 };

  function resize() {
    const r = canvas.parentElement ? canvas.parentElement.getBoundingClientRect() : null;
    V.w = Math.max(200, Math.round(r ? r.width : canvas.width));
    V.h = Math.max(160, Math.round(r ? r.height : canvas.height));
    V.dpr = Math.min(2,
      (typeof devicePixelRatio !== "undefined" ? devicePixelRatio : 1) || 1);
    canvas.width = Math.round(V.w * V.dpr);
    canvas.height = Math.round(V.h * V.dpr);
    canvas.style.width = V.w + "px";
    canvas.style.height = V.h + "px";
    cx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
  }

  const W2S = (x, y, out) => {
    const o = out || [0, 0];
    o[0] = (x - V.cx) * V.k + V.w / 2;
    o[1] = V.h / 2 - (y - V.cy) * V.k;
    return o;
  };

  function fitTo(B) {
    if (!B) return;
    const w = Math.max(1, B.x1 - B.x0), h = Math.max(1, B.y1 - B.y0);
    V.k = clamp(Math.min(V.w / (w * 1.25), V.h / (h * 1.25)), 1e-5, 3);
    V.cx = (B.x0 + B.x1) / 2; V.cy = (B.y0 + B.y1) / 2;
  }

  function paint() {
    resize();
    cx.clearRect(0, 0, V.w, V.h);
    const sc = scene();
    const SO = { textH: Math.max(8, txtH() * 2 * V.k) };
    paintList(cx, sc.P, SO, V, W2S);
    const prev = R.preview();
    if (prev && prev.length) paintPhantoms(cx, prev, V, W2S);
  }

  const toWorld = (px, py, out) => {
    const o = out || [0, 0];
    o[0] = V.cx + (px - V.w / 2) / V.k;
    o[1] = V.cy - (py - V.h / 2) / V.k;
    return o;
  };

  return { paint, toWorld, fit: fitTo, get view() { return V; } };
}
