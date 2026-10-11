/* ═══ بوابة G1: الفهرس الحيّ ═══
   يثبت أن الفهرس يُبنى من سجل الأدوات، وأن البحث يعيد المتوقَّع،
   وأن التغطية تعيد ما هو ناقصٌ بدل أن تخفيه.
   الاستيرادُ يسجّل — والأدواتُ تُعلَن عند التحميل (كما في help.test.js). */
import * as A from "node:assert";
await import("../tools/draw.js");
await import("../tools/sketch.js");
await import("../tools/openings.js");
await import("../tools/parts.js");
await import("../tools/areas.js");
await import("../tools/modify.js");
await import("../tools/annotate.js");
await import("../tools/ref.js");
await import("../tools/boq.js");
await import("../tools/elev.js");
await import("../tools/section.js");
await import("../tools/sheet.js");
await import("../tools/presets.js");
await import("../tools/blockcollect.js");
await import("../tools/boqreport.js");
await import("../tools/blocks.js");
await import("../tools/blockops.js");
const { lessons, lessonById, search, coverage, guideEntries } =
  await import("../guide/catalog.js");
const { toolList, findTool } = await import("../tools/registry.js");
const { validateLesson } = await import("../guide/schema.js");
const { LES } = await import("../guide/lessons.js");
const { ARTICLES } = await import("../ai/help/kb.js");

let passed = 0, failed = 0;
const ok = (name, fn) => {
  try { fn(); passed++; console.log("✓ " + name); }
  catch (e) { failed++; console.error("✗ " + name + "\n  " + e.message); }
};

ok("كل أداةٍ لها بطاقةٌ مولّدة", () => {
  const ids = new Set(toolList().map(d => d.id));
  const have = new Set(lessons().filter(l => l.kind === "tool").map(l => l.id));
  A.ok(ids.size > 0, "سجلّ الأدوات فارغ — تُسجَّل الأدوات قبل الاختبار");
  ids.forEach(id => A.ok(have.has(id), `أداةٌ بلا بطاقة آلية: ${id}`));
});

ok("الدرس الواحد يُقرأ بلا نسخ منسوخ", () => {
  const w = lessonById("wall");
  A.ok(w, "لا درس «wall»");
  A.equal(w.kind, "tool");
  A.ok(Array.isArray(w.goals) && w.goals.length > 0, "درس wall بلا أهداف بشرية");
  A.ok(Array.isArray(w.why) && w.why.length > 0, "درس wall بلا سرد عقدي");
});

ok("بحث عربي يعيد «جدار» قبل غيره", () => {
  const r = search("جدار");
  A.ok(r.length > 0, "لا نتيجة لكلمة جدار");
  A.ok(r[0].it.kind === "lesson", "أول نتيجة ليست درساً");
  A.ok(r[0].it.id === "wall" || r[0].it.title.includes("جدار"),
    "أول نتيجة لا تطابق «جدار»: " + r[0].it.title);
});

ok("مسارات التعلّم تدخل الفهرس", () => {
  const r = search("شقة");
  A.ok(r.some(x => x.it.kind === "course" && x.it.id === "flow.smallflat"),
    "مسار «ارسم شقة صغيرة» غير قابل للبحث");
});

ok("التغطية تخبر ولا تُخفي", () => {
  const c = coverage();
  A.equal(typeof c.total, "number");
  A.ok(c.total >= c.covered, "المغطّى أكبر من الكل — خطأ حساب");
  A.ok(Array.isArray(c.missing), "missing ليست مصفوفة");
  A.ok(c.covered === c.total,
    `أدواتٌ بلا بطاقات في هذه الدفعة: ${c.missing.join(" · ")}`);
});

ok("قائمة لوحة الأوامر شاملة الدروس والمسارات", () => {
  const e = guideEntries();
  A.ok(e.length >= lessons().length, "القائمة أنقص من عدد الدروس");
  A.ok(e.some(x => x.kind === "course"), "لا مسارات في قائمة لوحة الأوامر");
});

ok("كل درسٍ مولَّد يجتاز مُدقِّق schema.js", () => {
  const msgs = lessons().flatMap(l => validateLesson(l, l.id));
  A.deepEqual(msgs, [], "دروسٌ مخالفة للشكل: " + msgs.join(" · "));
});

/* ═══ 16.4 — بوّابة اختبار عكسية: لا مفاتيح بشرية يتيمة في lessons.js ═══
   بوابات القسم أعلاه تتحقق أن كل أداةٍ لها بطاقة؛ هذه تتحقق بالاتجاه
   المعاكس: هل كل مفتاحٍ بشري مكتوب يدوياً في LES يطابق أداةً حقيقية
   في TOOLS أو مقالاً حقيقياً في ARTICLES؟ بدونها قد تتراكم دروسٌ
   بشرية لأدواتٍ حُذفت لاحقاً من التطبيق دون أن يُلاحَظ. */
ok("لا مفاتيح بشرية يتيمة في lessons.js", () => {
  const toolIds = new Set(toolList().map(d => d.id));
  const artIds = new Set(ARTICLES.map(a => a.id));
  const orphans = Object.keys(LES)
    .filter(k => !toolIds.has(k) && !findTool(k) && !artIds.has(k));
  A.deepEqual(orphans, [], "مفاتيح بشرية بلا أداة أو مقال حقيقي: " + orphans.join(" · "));
});

process.exitCode = failed ? 1 : 0;
console.log(`\nG1: ${passed}/${passed + failed}`);
