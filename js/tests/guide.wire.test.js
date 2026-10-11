/* ═══ بوابة G4: الأجزاء الخالصة من الربط ═══
   يفحص الفهرس والتغطية والبحث ونصّ الدرس — كلُّ ما لا يلمس DOM
   من wire.js، فالجزء غير المغطّى هنا هو طبقة فتح النافذة وحدها. */
import * as A from "node:assert";
import "../tools/draw.js";
import "../tools/openings.js";
import "../tools/areas.js";
import { toolList } from "../tools/registry.js";
import { lessons, lessonById, search, coverage, guideEntries }
  from "../guide/catalog.js";
import { COURSES, courseById } from "../guide/courses.js";
import { lessonText } from "../guide/viewer.js";

let passed = 0, failed = 0;
const ok = (n, fn) => {
  try { fn(); passed++; console.log("✓ " + n); }
  catch (e) { failed++; console.error("✗ " + n + "\n  " + e.message); }
};

ok("التغطية تغطي كل أداةٍ عبر البطاقة الآلية", () => {
  const c = coverage();
  const ids = toolList().map(d => d.id);
  A.equal(c.total, ids.length, "عدد الأدوات في التغطية مخالف للسجل");
  A.equal(c.covered, c.total, `أدواتٌ بلا بطاقة: ${c.missing.join(" · ")}`);
  A.ok(c.pct >= 0 && c.pct <= 100, "نسبة تغطية خارج المدى");
});

ok("البحث العربي يعيد درس «جدار»", () => {
  const r = search("جدار");
  A.ok(r.length > 0, "لا نتيجة لـ جدار");
  A.ok(r[0].it.id === "wall", "أول نتيجة ليست الدرس المتوقع");
});

ok("البحث بالاسم البديل يصل إلى الدرس نفسه", () => {
  const r = search("wall");
  A.ok(r.some(x => x.it.id === "wall"), "بحث wall لا يعيد درس wall");
});

ok("مدخلات لوحة الأوامر كاملة الدروس والمسارات", () => {
  const e = guideEntries();
  A.ok(e.length >= lessons().length, "أنقص من عدد الدروس");
  A.ok(e.some(x => x.kind === "lesson"), "لا مدخل درسٍ واحد");
  A.ok(e.some(x => x.kind === "course"), "لا مدخل مسارٍ واحد");
  e.forEach(x => A.ok(x.hay && x.hay.length > 0,
    `مدخلٌ بلا hay قابل للبحث: ${x.id}`));
});

ok("المسارات تُقرأ بوحداتها", () => {
  A.ok(COURSES.length >= 4, "مسارات أقل من المتوقَّع");
  const c = courseById("flow.smallflat");
  A.ok(c, "مسار الشقة غير موجود");
  A.ok(c.units.length > 0, "مسار الشقة بلا وحدات");
  c.units.forEach(u => u.lessons.forEach(id =>
    A.ok(lessonById(id), `درس «${id}» في مسار «${c.id}» غير مسجَّل`)));
});

ok("نصّ الدرس ثابت ومكتفٍ", () => {
  const w = lessonById("wall");
  A.ok(w, "درس wall غير موجود");
  const t = lessonText(w);
  A.ok(t.includes("«جدار»"), "نص الدرس لا يحمل عنوانه");
  A.ok(t.includes("الأهداف"), "نص الدرس بلا قسم أهداف");
  A.ok(t.includes("لماذا"), "نص الدرس بلا قسم لماذا");
  A.equal(lessonText(w), t, "نصّ الدرس غير محدَّد لقراءتين متتاليتين");
});

ok("درسٌ بلا بطاقة بشرية ما زال يُعرض من الآلية", () => {
  const some = toolList().find(d => d.id);
  A.ok(lessonById(some.id), `أداة «${some.id}» بلا بطاقة مولَّدة إطلاقاً`);
});

process.exitCode = failed ? 1 : 0;
console.log(`\nG4: ${passed}/${passed + failed}`);
