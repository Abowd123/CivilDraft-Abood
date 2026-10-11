/* ═══ بوابة G5: المولّد المستقل ═══
   سلامة البناء والتهريب والثبات — بلا متصفح. */
import * as A from "node:assert";
import "../tools/draw.js";
import "../tools/openings.js";
import "../tools/areas.js";
import { toolList } from "../tools/registry.js";
import { buildStandalone, exportGuideHTML } from "../guide/exporter.js";

let passed = 0, failed = 0;
const ok = (n, fn) => {
  try { fn(); passed++; console.log("✓ " + n); }
  catch (e) { failed++; console.error("✗ " + n + "\n  " + e.message); }
};

ok("يولّد مستنداً كاملاً", () => {
  const h = exportGuideHTML();
  A.ok(h.length > 3000, "المستند أقصر من المتوقَّع");
  A.ok(/^<!doctype html>/i.test(h), "ليس مستند HTML");
  A.ok(h.includes('dir="rtl"'), "يفتقر لاتجاه RTL");
  A.ok(h.includes('lang="ar"'), "يفتقر للغة العربية");
});

ok("كل أداةٍ لها بطاقة أو اسم في الفهرس", () => {
  const h = exportGuideHTML();
  toolList().forEach(d => {
    A.ok(h.includes(`data-tool="${d.id}"`),
      `لا قسم لأداة ${d.id} في الدليل المستقل`);
  });
});

ok("التهريب يمنع حقن العلامات", () => {
  const evil = {
    id: "x", kind: "tool", title: "<script>alert(1)</script>",
    level: 1, minutes: 1, placement: null, goals: ["<img onerror=x>"],
    why: [], script: [], exercises: [], mistakes: [], faq: [], body: null
  };
  const h = buildStandalone({ lessons: [evil], courses: [], ribbon: [] });
  A.ok(!h.includes("<script>alert(1)</script>"), "وصل سكربت خام");
  A.ok(h.includes("&lt;script&gt;"), "لم يُهرَّب النصّ");
  A.ok(!h.includes("<img onerror=x>"), "وصلت صورة خام");
});

/* ── ملاحظة تصحيح موثّقة في المصدر الأصلي ──
   السطر الثاني للتحقق كان به لفظ دخيل، وصُحّح إلى ما يلي: */
ok("العقود والاختصارات حاضرة كمصدر ثابت", () => {
  const h = exportGuideHTML();
  A.ok(h.includes("لا لحام تلقائي"), "عقدٌ أساسي ناقص");
  A.ok(h.includes("فهرس الأدوات") && h.includes("بطاقات الأدوات"), "لا فهرس دروس");
});

ok("التوليد ثابت (تحديديّة)", () => {
  A.equal(exportGuideHTML(), exportGuideHTML(),
    "مخرَجان مختلفان لنفس المصادر");
});

process.exitCode = failed ? 1 : 0;
console.log(`\nG5: ${passed}/${passed + failed}`);
