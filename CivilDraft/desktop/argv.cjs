/* CivilDraft — استخراج مسار ملفّ المشروع من وسائط التشغيل.
   وحدةٌ خالصة بلا electron، فيُختبَر في Node (js/tests/desktop.test.js).
   تُستعمل عند النقر المزدوج على ملفّ، وعند فتح ملفٍّ والبرنامجُ يعمل أصلاً. */
"use strict";
const path = require("node:path");
const fs = require("node:fs");

/* .cdraft الامتداد الجديد لنسخة سطح المكتب · .json و.mistar تُفتَح فقط
   (لا يُربَط .json بالبرنامج في ويندوز — أوسعُ من أن يُستولى عليه) */
const PROJECT_EXTS = [".cdraft", ".json", ".mistar"];
const MAX_OPEN_BYTES = 64 * 1024 * 1024;

/* argv: كما يصل من العملية · cwd: مجلّد عمل العملية التي أُطلقت
   (workingDirectory في second-instance) · stat: للاختبار */
function findProjectArg(argv, cwd, stat) {
  const st = stat || (p => fs.statSync(p));
  const list = Array.isArray(argv) ? argv.slice(1) : [];
  for (const a of list) {
    if (typeof a !== "string" || !a || a.startsWith("-")) continue;
    if (!PROJECT_EXTS.includes(path.extname(a).toLowerCase())) continue;
    const abs = path.resolve(cwd || process.cwd(), a);
    try {
      const s = st(abs);
      if (s.isFile() && s.size <= MAX_OPEN_BYTES) return abs;
    } catch { /* غير موجود — تابِع */ }
  }
  return null;
}

module.exports = { PROJECT_EXTS, MAX_OPEN_BYTES, findProjectArg };
