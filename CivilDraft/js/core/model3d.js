/* ═══ نموذج العرض الثلاثي — قراءةٌ محضة ═══
   يحوّل المخطّط (S) إلى وجوهٍ ثلاثية بالمليمتر يرسمها ui/view3d.js
   بالإسقاط الأكسونومتري من proj3d.js. لا Canvas ولا DOM، ولا يُكتَب في
   S حرفٌ: يُسأل فيجيب، فيُختبَر في Node.

   المخرَج: { faces, pts, levels }
     faces  [{pts:[[x,y,z]..], n:[nx,ny,nz], kind, level}]
            kind ∈ wall | col | slab | roof
     pts    كل رؤوس الوجوه — لملاءمة العرض
     levels الطوابق التي فيها شيء

   الفتحات (أبواب · شبابيك · فتحات صافية · مقنطرة) تُثقَب في الجدران
   المستقيمة عبر wallFaces: يُقطَع الجدار إلى مقاطع مصمتة بين الفتحات،
   وتُضاف وصلةٌ فوق كل فتحة وجلسةٌ تحتها إن وُجدت، ووجوه الحشوة
   الجانبية ليُرى عمق الجدار. الاستثناءات المعلنة: الجدار القوسي يبقى
   مصمتاً (عدّه model.arcSolid) · الكوّة (part) لا تقطع · والفتحة
   المعطوبة (خارج مدى جدارها أو متراكبة مع أخرى) تُتجاهل كما يفعل
   openState. للواجهات المقيسة أمرُ ELEV. */
import {band,centerLine,dir,isArc} from "./walls.js";
import {OK,EDGE} from "./opens.js";
import {wallHeight} from "./elevation.js";
import {colPoly} from "./cols.js";
import {levelOf,levelElev,levelHeight,levelDef} from "./level.js";

/* حدّ الوجوه: يمنع مشروعاً ضخماً من تجميد المتصفّح — المتجاوَز يُبلَّغ */
export const MAX_FACES = 60000;

const area2 = ring => {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i], q = ring[(i + 1) % ring.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
};

/* موشورٌ رأسيّ من حلقةٍ أرضية بين z0 وz1: جدرانٌ جانبية + غطاء علويّ.
   الأسفل لا يُرسَم (لا يُرى من فوق). الحلقة تُقلَب إلى CCW فتخرج
   الأعمدةُ الجانبية للخارج. */
export function extrude(ring, z0, z1, kind, level) {
  if (!Array.isArray(ring) || ring.length < 3 || !(z1 > z0)) return [];
  let r = ring.filter(p => p && isFinite(p[0]) && isFinite(p[1]));
  if (r.length < 3) return [];
  if (area2(r) < 0) r = r.slice().reverse();
  const out = [];
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy);
    if (L < 1e-6) continue;
    out.push({
      pts: [[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]],
      n: [dy / L, -dx / L, 0], kind, level
    });
  }
  out.push({ pts: r.map(p => [p[0], p[1], z1]), n: [0, 0, 1], kind, level });
  return out;
}

/* ═══ السقفُ المائل ═══ (فحصُ ما بعد المرحلة ٧)
   «جمالون» و«هرمي» و«مائل» كانت تُبنى كلّها لوحاً مسطّحاً سماكته 150.
   الآن للحلقة المستطيلة (أربعةُ أركانٍ قائمة) سطوحٌ مائلةٌ حقيقية،
   والارتفاعُ = الميل٪ × المسافة الأفقية: الجمالون والهرمي على نصف
   العرض الأقصر، والمائلُ على العرض كلّه. وما ليس مستطيلاً يبقى مسطّحاً
   ويُعَدّ (roofFlat) فيُقال — لا تقريبَ صامت. */
export function pitchedRoof(ring, z0, type, slope, level) {
  if (!Array.isArray(ring) || ring.length !== 4 || !(slope > 0)) return null;
  const P = ring.map(p => [+p[0], +p[1]]);
  for (let i = 0; i < 4; i++) {
    const a = P[i], b = P[(i + 1) % 4], c = P[(i + 2) % 4];
    const ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - b[0], vy = c[1] - b[1];
    const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
    if (lu < 1 || lv < 1 || Math.abs(ux * vx + uy * vy) / (lu * lv) > 0.02) return null;
  }
  /* المحورُ الطويل: الضلعُ 0→1 أو 1→2 */
  const L01 = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]);
  const L12 = Math.hypot(P[2][0] - P[1][0], P[2][1] - P[1][1]);
  const Q = L01 >= L12 ? P : [P[1], P[2], P[3], P[0]];
  const a = Math.max(L01, L12), b2 = Math.min(L01, L12) / 2;   /* الطول · نصف العرض */
  const k = slope / 100;
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const cx = (Q[0][0] + Q[2][0]) / 2, cy = (Q[0][1] + Q[2][1]) / 2;
  const out = [];
  const face = (pts) => {
    /* ناظمٌ بطريقة نيويل ثم يُوجَّه للخارج عن مركز الجسم */
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      nx += (p[1] - q[1]) * (p[2] + q[2]); ny += (p[2] - q[2]) * (p[0] + q[0]); nz += (p[0] - q[0]) * (p[1] + q[1]);
    }
    const ln = Math.hypot(nx, ny, nz); if (ln < 1e-9) return;
    nx /= ln; ny /= ln; nz /= ln;
    const fc = pts.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]).map(v => v / pts.length);
    if (nx * (fc[0] - cx) + ny * (fc[1] - cy) + nz * (fc[2] - z0) < 0) { nx = -nx; ny = -ny; nz = -nz; pts = pts.slice().reverse(); }
    out.push({ pts, n: [nx, ny, nz], kind: "roof", level });
  };
  const E = p => [p[0], p[1], z0];
  if (type === "shed") {
    /* المائل: الضلعُ 2→3 عالٍ بـ k×العرض كلّه */
    const H = k * 2 * b2, U = p => [p[0], p[1], z0 + H];
    face([E(Q[0]), E(Q[1]), U(Q[2]), U(Q[3])]);
    face([E(Q[1]), U(Q[2]), E(Q[2])]);
    face([E(Q[0]), E(Q[3]), U(Q[3])]);
    face([E(Q[2]), U(Q[2]), U(Q[3]), E(Q[3])]);
    return out;
  }
  const H = k * b2;
  const m0 = mid(Q[3], Q[0]), m1 = mid(Q[1], Q[2]);          /* طرفا الجمالون على الضلعين القصيرين */
  let r0 = m0, r1 = m1;
  if (type === "hip") {
    const ux = (m1[0] - m0[0]) / a, uy = (m1[1] - m0[1]) / a, s = Math.min(b2, a / 2);
    r0 = [m0[0] + ux * s, m0[1] + uy * s]; r1 = [m1[0] - ux * s, m1[1] - uy * s];
  }
  const R0 = [r0[0], r0[1], z0 + H], R1 = [r1[0], r1[1], z0 + H];
  face([E(Q[0]), E(Q[1]), R1, R0]);
  face([E(Q[2]), E(Q[3]), R0, R1]);
  face([E(Q[3]), E(Q[0]), R0]);
  face([E(Q[1]), E(Q[2]), R1]);
  return out;
}

/* ═══ جدارٌ مثقوب ═══
   الفتحات القابلة للثقب: من نوعٍ يقطع (sub) ذات أبعادٍ سليمة، ضمن مدى
   جدارها بهامش EDGE، وغير متراكبة مع فتحةٍ أخرى — الحالتان over وclash
   في openState تُتجاهلان هنا (والمتراكبتان كلتاهما). مرتّبةٌ بالموضع. */
export function usableOpens(w, opens, L) {
  const r = (opens || []).filter(o => o && OK[o.kind] && OK[o.kind].sub
    && isFinite(+o.s) && isFinite(+o.w) && isFinite(+o.h) && +o.w > 0 && +o.h > 0)
    .map(o => ({ o, a: +o.s - o.w / 2, b: +o.s + o.w / 2,
      sill: Math.max(0, +o.sill || 0), h: +o.h, bad: false }))
    .filter(x => !(x.a < EDGE - 1 || x.b > L - EDGE + 1));
  r.sort((p, q) => p.a - q.a);
  for (let i = 0; i < r.length; i++)
    for (let j = i + 1; j < r.length && r[j].a < r[i].b - 1; j++)
      r[i].bad = r[j].bad = true;
  return r.filter(x => !x.bad);
}

/* وجوه جدارٍ مستقيمٍ بفتحاته. تعيد null حين لا تنطبق (جدارٌ قوسيّ ·
   بلا فتحاتٍ صالحة · مسارٌ فاسد) فيرجع المستدعي إلى extrude المصمت.
   إحداثيات الفتحة على المحور الطولي للخطّ المركزي كما في opens.js:
   s من بداية المسار. لا وجهَ داخليّ: كل وجهٍ هنا ظاهرٌ فعلاً. */
export function wallFaces(w, opens, z0, H, level) {
  if (!w || isArc(w) || !(H > 0) || !(w.t > 0)) return null;
  const d = dir(w), c = centerLine(w);
  if (!d || !c) return null;
  const L = d.L, h = w.t / 2, z1 = z0 + H;
  const U = usableOpens(w, opens, L)
    .filter(x => x.sill < H - 1e-6);
  if (!U.length) return null;

  const P = (u, v, z) => [c.a[0] + d.ux * u + d.nx * v,
                          c.a[1] + d.uy * u + d.ny * v, z];
  const out = [];
  const add = (pts, n) => out.push({ pts, n, kind: "wall", level });
  const NL = [d.nx, d.ny, 0], NR = [-d.nx, -d.ny, 0];
  /* وجهان طوليان (جهتا الجدار) وغطاءٌ علويّ على [u0,u1] من za إلى zb */
  const slab = (u0, u1, za, zb, cap) => {
    add([P(u0, h, za), P(u1, h, za), P(u1, h, zb), P(u0, h, zb)], NL);
    add([P(u0, -h, za), P(u1, -h, za), P(u1, -h, zb), P(u0, -h, zb)], NR);
    if (cap) add([P(u0, h, zb), P(u1, h, zb), P(u1, -h, zb), P(u0, -h, zb)], [0, 0, 1]);
  };
  /* وجهٌ عرضيّ: نهاية جدار أو حشوة فتحة. sg=+1 ناظمه نحو +u */
  const endFace = (u, za, zb, sg) =>
    add([P(u, h, za), P(u, -h, za), P(u, -h, zb), P(u, h, zb)], [sg * d.ux, sg * d.uy, 0]);

  let pos = 0;
  U.forEach(x => {
    if (x.a - pos > 1e-6) slab(pos, x.a, z0, z1, true);   /* مقطعٌ مصمت */
    if (pos === 0 && x.a > 1e-6) endFace(0, z0, z1, -1);   /* نهاية الجدار */
    const top = Math.min(x.sill + x.h, H);                 /* أعلى الفتحة */
    endFace(x.a, z0 + x.sill, z0 + top, +1);               /* جانبا الفتحة */
    endFace(x.b, z0 + x.sill, z0 + top, -1);
    if (x.sill > 0) slab(x.a, x.b, z0, z0 + x.sill, true);      /* الجلسة */
    if (top < H - 1e-6) slab(x.a, x.b, z0 + top, z1, true);     /* الوصلة */
    pos = x.b;
  });
  if (L - pos > 1e-6) {
    slab(pos, L, z0, z1, true);
    endFace(L, z0, z1, +1);
  }
  return out;
}

export function build3d(S, opt) {
  const o = opt || {};
  const only = (o.level == null || o.level === "all") ? null : Math.round(+o.level);
  const faces = [];
  const seen = new Set();
  let truncated = 0, arcSolid = 0, roofFlat = 0;
  const byWall = new Map();
  (S.opens || []).forEach(o => {
    let a = byWall.get(o.wall);
    if (!a) { a = []; byWall.set(o.wall, a); }
    a.push(o);
  });

  const push = arr => {
    for (const f of arr) {
      if (faces.length >= MAX_FACES) { truncated++; continue; }
      faces.push(f);
    }
  };
  const take = L => {
    if (only != null && L !== only) return false;
    seen.add(L);
    return true;
  };

  (S.walls || []).forEach(w => {
    const L = levelOf(w);
    if (!take(L)) return;
    const ring = band(w);
    if (!ring) return;
    const z0 = levelElev(S, L), H = wallHeight(w);
    const ops = byWall.get(w.id);
    if (ops) {
      const wf = wallFaces(w, ops, z0, H, L);
      if (wf) { push(wf); return; }
      if (isArc(w) && ops.some(o => OK[o.kind] && OK[o.kind].sub)) arcSolid++;
    }
    push(extrude(ring, z0, z0 + H, "wall", L));
  });

  (S.cols || []).forEach(c => {
    const L = levelOf(c);
    if (!take(L)) return;
    const ring = colPoly(c);
    if (!ring) return;
    const z0 = levelElev(S, L);
    push(extrude(ring, z0, z0 + levelHeight(S, L), "col", L));
  });

  /* البلاطة: تحت كل منطقةٍ من منسوب طابقها بسماكة البلاطة المعرَّفة */
  (S.areas || []).forEach(a => {
    const L = levelOf(a);
    if (!take(L)) return;
    const d = levelDef(S, L);
    const t = d ? Math.max(0, +d.slab || 0) : 200;
    if (!(t > 0) || !a.ring) return;
    const z1 = levelElev(S, L);
    push(extrude(a.ring, z1 - t, z1, "slab", L));
  });

  /* ═══ البلاطةُ الإنشائية والكمرة ═══ (فحصُ ما بعد المرحلة ٧)
     أداةُ «بلاطة» تحسب مساحتها وحجمها، لكنّ المجسّمَ كان يقرأ المناطق
     وحدها فلا تظهر فيه. الآن تُبنى كبلاطة المنطقة (تحت منسوب طابقها
     بسماكتها هي)، والكمرةُ تحت سقف طابقها بعمقها. */
  (S.struct || []).forEach(g => {
    const L = levelOf(g);
    if (!take(L)) return;
    const z0 = levelElev(S, L);
    if (g.kind === "slab" && Array.isArray(g.pts) && g.pts.length >= 3) {
      const t = Math.max(1, +g.th || 150);
      push(extrude(g.pts, z0 - t, z0, "slab", L));
    } else if (g.kind === "beam" && g.a && g.b) {
      const dx = g.b[0] - g.a[0], dy = g.b[1] - g.a[1], Lb = Math.hypot(dx, dy);
      if (Lb < 1) return;
      const w2 = Math.max(1, +g.w || 250) / 2, nx = -dy / Lb * w2, ny = dx / Lb * w2;
      const ring = [[g.a[0] + nx, g.a[1] + ny], [g.b[0] + nx, g.b[1] + ny], [g.b[0] - nx, g.b[1] - ny], [g.a[0] - nx, g.a[1] - ny]];
      const top = z0 + levelHeight(S, L), d = Math.max(1, +g.d || 500);
      push(extrude(ring, top - d, top, "col", L));
    }
  });

  (S.roofs || []).forEach(r => {
    const L = levelOf(r);
    if (!take(L)) return;
    const z0 = levelElev(S, L) + (+r.h || S.meta.wallH || 3000);
    const pitched = r.type !== "flat" ? pitchedRoof(r.ring, z0, r.type, +r.slope || 0, L) : null;
    if (pitched) { push(pitched); return; }
    if (r.type !== "flat") roofFlat++;
    push(extrude(r.ring, z0, z0 + 150, "roof", L));
  });

  const pts = [];
  faces.forEach(f => f.pts.forEach(p => pts.push(p)));
  return { faces, pts, levels: [...seen].sort((a, b) => a - b), truncated, arcSolid, roofFlat };
}
