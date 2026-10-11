/* ═══ معرض القوالب الجاهزة ═══
   يستخدم الكتل البارامترية في smartblocks.js لتكوين نماذج أكبر
   (شقق، فلل، مكاتب). القوالب هنا لا تستعمل كتلة البابِ، فتُثبَّت
   عملياتها كلّها في معاملة edit() واحدة ذرّية: كلٌّ أو لا شيء —
   وخطوةُ تراجعٍ واحدة (بند 81–83).

   الجدارُ المشترك بين كتلتين متجاورتين تبنيه كلتاهما، فيتكرّر
   قطعةً واحدةً مرّتين (وتُحتسب كمّيّتُه مرّتين). dedupeWalls تُبقي
   أوّلَه وتُسقط ما طابقه هندسياً — أيّ اتجاهٍ كتب المقطعَ.

   ⚠ العملياتُ تُغذَّى إلى applyOps خاماً بالمتر لا مخرَج
   validate().ok (بالمليمتر) — راجع رأس ops.js. */
import {blockOps} from "./smartblocks.js";
import {validate} from "./ops.js";
import {runAtomic} from "./opsrun.js";
import {LIM} from "../core/limits.js";

export const TEMPLATES = {
  apt_small: { id: "apt_small", label: "شقة صغيرة", cat:"سكني",
    desc: "صالة + غرفة نوم + مطبخ + حمام (7×8)",
    place: [
      {block: "room", at: [0,0], params: {w:4, h:4, name: "صالة"}},
      {block: "room", at: [4,0], params: {w:4, h:4, name: "غرفة"}},
      {block: "kitchen", at: [0,4], params: {w:3, h:3}},
      {block: "bath", at: [3,4], params: {w:1.5, h:2}}
    ]
  },
  villa_gf: { id: "villa_gf", label: "فيلا دور أرضي مبسط", cat:"سكني",
    desc: "مجلس + صالة + مطبخ + طعام ضيوف (10×12)",
    place: [
      {block: "room", at: [0,0], params: {w:5, h:6, name: "مجلس"}},
      {block: "room", at: [5,0], params: {w:5, h:6, name: "صالة"}},
      {block: "kitchen", at: [0,6], params: {w:4, h:4}},
      {block: "bath", at: [4,6], params: {w:1.5, h:2}},
      {block: "room", at: [6,6], params: {w:4, h:4, name: "طعام"}}
    ]
  },
  office: { id: "office", label: "مكتب مفتوح + غرفة اجتماعات", cat:"تجاري",
    desc: "مساحة عمل مفتوحة + غرفة اجتماعات (8×10)",
    place: [
      {block: "room", at: [0,0], params: {w:6, h:8, name: "مكتب"}},
      {block: "room", at: [6,0], params: {w:4, h:4, name: "اجتماعات"}},
      {block: "bath", at: [6,5], params: {w:1.5, h:2}}
    ]
  }
};

export const templateList = Object.values(TEMPLATES)
  .map(t => ({id: t.id, label: t.label, cat: t.cat, desc: t.desc, blocks: t.place.length}));

/* يُسقط الجدار المكرَّر: المقطع نفسه بالاتجاهين (a→b أو b→a).
   المقارنة بالمليمتر المقرَّب كي لا يُفلت التطابقُ بفرقِ كسرٍ عائم
   (0.1+0.2). يُبقي الأوّل ولا يمسّ غير الجدران. */
export function dedupeWalls(ops) {
  const key = p => `${Math.round(p[0]*1000)},${Math.round(p[1]*1000)}`;
  const seen = new Set();
  return (ops || []).filter(o => {
    if (!o || o.op !== "wall" || !Array.isArray(o.a) || !Array.isArray(o.b)) return true;
    const ka = key(o.a), kb = key(o.b);
    const k = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function template(templateId) {
  const t = TEMPLATES[templateId];
  if (!t) return {ops:[], unknown: templateId};
  const all = [];
  for (const item of t.place) {
    const built = blockOps(item.block, item.at, item.params);
    if (built.error) return {ops:[], error: `${item.block}: ${built.error}`};
    all.push(...(built.ops || []));
  }
  return {ops: dedupeWalls(all)};
}

export function placeTemplate(templateId, {commit=false}={}) {
  const {ops, unknown, error} = template(templateId);
  if (unknown) return {error: `قالب غير معروف: ${unknown}`, ops:[], valid:false};
  if (error) return {template: templateId, error, generated: 0, valid: 0,
    rejected: [{i:0, why: error}], committed: false};
  /* السقف قبل كل شيء: قالبٌ يتجاوز حدّ العمليات يُرفَض كلُّه — لا
     يُقصّ فيُدرَج نصفُ مبنى */
  if (ops.length > LIM.aiOps.max)
    return {template: templateId, generated: ops.length, valid: 0,
      rejected: [{i:0, why: `${ops.length} عملية — الحدّ ${LIM.aiOps.max}`}],
      error: `القالب يتجاوز ${LIM.aiOps.max} عملية`, committed: false};
  const {ok, bad} = validate(ops);   /* الإحداثيات داخل LIM.coord: Mx ترفض ما جاوزها */
  const report = {template: templateId, generated: ops.length, valid: ok.length, rejected: bad};
  if (!commit || !ok.length) return report;
  if (bad.length) {
    report.committed = false;
    report.error = `رُفضت ${bad.length} عملية — لم يُدرَج شيء`;
    return report;
  }
  /* دفعةٌ واحدة ذرّية — لا نصفَ مبنى (بند 81–83) */
  const r = runAtomic(`إدراج قالب «${TEMPLATES[templateId].label}»`,
    apply => ({r1: apply(ops)}));
  if (!r.ok) {
    report.committed = false;
    report.rolledBack = true;
    report.error = `لم يُدرَج شيء — ${r.error}`;
    return report;
  }
  report.result = r.out.r1;
  report.committed = true;
  return report;
}
