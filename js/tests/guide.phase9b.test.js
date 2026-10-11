/* ═══ مرحلة ٩ب — تتمّة البنود المنقولة من وحدة «تعلّم» (16.5–16.6) ═══
   16.4 (بوّابة اختبار عكسية للمفاتيح اليتيمة) أُضيفت إلى
   guide.catalog.test.js مباشرةً — نفس الملف الذي يحرس التغطية
   الأمامية، بلا نسخ محرّك بحثٍ آخر. هذا الملف يغطّي الاثنين
   الباقيَين: تمييز مدخل «شرح:» في لوحة الأوامر (catalog.js#entryOf)
   ومعاينة Quick-peek المستقلّة (guide/peek.js).
   التشغيل: node js/tests/guide.phase9b.test.js */
import { shim, shimDOM, click, group, ok, eq, summary } from "./harness.js";
shim();
const doc = shimDOM();

await import("../tools/draw.js");
const { guideEntries, search, lessons } = await import("../guide/catalog.js");

/* ═══ 16.5 — عنوانٌ مُميَّز لدروس الأدوات وحدها في لوحة الأوامر ═══ */
group("16.5: مدخل «شرح:» يميّز درس الأداة عن تنفيذها في Ctrl+K", () => {
  const e = guideEntries();
  const wall = e.find(x => x.kind === "lesson" && x.id === "wall");
  ok(!!wall, "لا مدخل لوحة أوامر لدرس wall");
  eq(wall.title, "شرح: " + lessons().find(l => l.id === "wall").title,
    "عنوان مدخل الأداة يبدأ بـ«شرح:» فوق عنوان الدرس الأصلي");

  const course = e.find(x => x.kind === "course");
  ok(course && !course.title.startsWith("شرح:"),
    "عناوين المسارات لا تُمسّ — التمييز لدروس الأدوات فقط");

  const article = e.find(x => x.kind === "lesson" && x.lesson && x.lesson.kind === "article");
  if (article) ok(!article.title.startsWith("شرح:"),
    "عناوين المقالات لا تُمسّ كذلك — «شرح:» لأدوات tool فقط");
});

group("16.5: هيّة البحث أوسع — «شرح جدار» يصل إلى نفس الدرس", () => {
  const r = search("شرح جدار");
  ok(r.some(x => x.it.kind === "lesson" && x.it.id === "wall"),
    "بحث «شرح جدار» لا يصل إلى درس wall");
});

/* ═══ 16.6 — guide/peek.js: معاينة مصغّرة مستقلّة عن floater.js ═══ */
const P = await import("../guide/peek.js");

group("16.6: peekOpen يبني الصندوق ويملؤه من الدرس الحقيقي", () => {
  ok(!P.peekIsOpen(), "لا معاينة مفتوحة قبل أوّل نداء");
  let fullId = null;
  const b = P.peekOpen("wall", id => { fullId = id; });
  ok(!!doc.getElementById("gdPeek"), "الصندوق #gdPeek أُنشئ في DOM");
  ok(b.hidden === false, "الصندوق ظاهرٌ بعد الفتح");
  ok(P.peekIsOpen(), "peekIsOpen يعكس ذلك");
  ok(b.innerHTML.includes("جدار"), "عنوان الدرس الحقيقي ظاهرٌ في المعاينة");
  ok(b.innerHTML.includes("الشرح الكامل"), "زرّ الانتقال للشرح الكامل ظاهر");

  const full = b.querySelector("[data-peekfull]");
  ok(!!full, "زرّ «الشرح الكامل» قابلٌ للنقر");
  click(full);
  eq(fullId, "wall", "النقر يُنادي onFull(id) بمعرّف الدرس المفتوح");
  ok(b.hidden === true, "والنقر يُغلق المعاينة أوّلاً قبل تفويض الفتح الكامل");
});

group("16.6: زرّ الإغلاق وpeekClose يُخفيان الصندوق بلا استدعاء onFull", () => {
  let called = false;
  const b = P.peekOpen("wall", () => { called = true; });
  const x = b.querySelector("[data-peekx]");
  ok(!!x, "زرّ الإغلاق موجود");
  click(x);
  ok(b.hidden === true, "الإغلاق يُخفي الصندوق");
  ok(!called, "الإغلاق لا يُنادي onFull إطلاقاً");

  P.peekOpen("wall", () => {});
  P.peekClose();
  ok(!P.peekIsOpen(), "peekClose يُخفي المعاينة من أيّ مكان");
});

group("16.6: معرّفٌ غير موجود يُخفي الصندوق بأمان بلا رمي", () => {
  P.peekOpen("wall", () => {});
  ok(P.peekIsOpen(), "معاينة مفتوحة قبل الاختبار");
  const b = P.peekOpen("لا-يوجد-هذا-المعرّف", () => {});
  ok(b.hidden === true, "معرّفٌ وهميّ يُخفي الصندوق بدل رميه خطأً");
});

process.exit(summary());
