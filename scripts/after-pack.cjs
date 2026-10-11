/* ═══ حارسُ الحزمة ═══ afterPack: بعد التغليف وقبل صنع المثبّت/المحمول.
   يقرأ app.asar الفعليَّ (لا الإعداد) ويُفشِل البناءَ إن وجد فيه غير ما يلزم:
     · جذرٌ غير desktop · dist · build/icon.ico · package.json (+ node_modules إن وُجدت اعتمادياتُ إنتاج)
     · js/tests أو audit أو docs أو خرائط مصدر أو *.md
     · dist بلا index.html
   الدالّةُ الخالصة inspect() مكشوفةٌ للاختبار (js/tests/packaging.test.js).
   إن تعذّر تحميل @electron/asar يُحذَّر ويُتجاوَز الفحص — لا يُكسَر البناء بسببه. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const norm = (e) => String(e).replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");

function inspect(entries, opts) {
  const hasDeps = !!(opts && opts.hasDeps);
  const topOk = new Set(["desktop", "dist", "build", "package.json"]);
  if (hasDeps) topOk.add("node_modules");
  const set = new Set(entries.map(norm).filter(Boolean));
  const problems = new Set();
  const count = { dist: 0, desktop: 0, total: 0 };
  for (const e of set) {
    const top = e.split("/")[0];
    count.total++;
    if (top === "dist") count.dist++;
    if (top === "desktop") count.desktop++;
    if (!topOk.has(top)) { problems.add("جذرٌ غير مسموح: " + top + "/"); continue; }
    /* node_modules (اعتماديات الإنتاج مثل electron-updater): شيفرةُ غيرنا — نقبلها كما هي.
       قواعدُ md/map/docs/tests أدناه تحرس ملفّاتنا نحن، وقد تحوي الحزم الخارجية شيئاً منها. */
    if (top === "node_modules") continue;
    if (top === "build" && e !== "build" && e !== "build/icon.ico") problems.add("داخل build غير الأيقونة: " + e);
    if (/(^|\/)(js\/tests|audit|docs)(\/|$)/.test(e)) problems.add("اختبارات/تدقيق/وثائق: " + e);
    if (/^desktop\/e2e(\/|$)/.test(e)) problems.add("اختبارات e2e: " + e);
    if (/\.map$/i.test(e)) problems.add("خريطة مصدر: " + e);
    if (/\.md$/i.test(e)) problems.add("ملفّ markdown: " + e);
  }
  if (!set.has("dist/index.html")) problems.add("dist/index.html غائب — لم يُبنَ dist قبل التغليف؟");
  if (!set.has("desktop/main.cjs")) problems.add("desktop/main.cjs غائب");
  if (!set.has("package.json")) problems.add("package.json غائب");
  return { problems: [...problems], count };
}

function walk(dir, base, out) {
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n), rel = base ? base + "/" + n : n;
    out.push(rel);
    if (fs.statSync(p).isDirectory()) walk(p, rel, out);
  }
  return out;
}

async function afterPack(ctx) {
  const res = path.join(ctx.appOutDir, "resources");
  const asarPath = path.join(res, "app.asar");
  let entries;
  if (fs.existsSync(asarPath)) {
    let asar;
    try {
      const m = await import("@electron/asar");
      asar = m.default && m.default.listPackage ? m.default : m;
    } catch (e) {
      console.warn("  • after-pack: تعذّر تحميل @electron/asar — تُخطِّي فحصُ الحزمة");
      return;
    }
    entries = asar.listPackage(asarPath, {});
  } else if (fs.existsSync(path.join(res, "app"))) {
    entries = walk(path.join(res, "app"), "", []);
  } else {
    console.warn("  • after-pack: لا app.asar ولا resources/app — تُخطِّي الفحص");
    return;
  }
  let hasDeps = false;
  try {
    const pj = JSON.parse(fs.readFileSync(path.join(ctx.packager.projectDir, "package.json"), "utf8"));
    hasDeps = Object.keys(pj.dependencies || {}).length > 0;
  } catch (e) { /* يبقى الأشدّ */ }
  const r = inspect(entries, { hasDeps });
  const tag = path.basename(ctx.appOutDir);
  if (r.problems.length) {
    throw new Error("after-pack [" + tag + "]: الحزمة تحوي ما لا يجب (" + r.problems.length + "):\n  - "
      + r.problems.slice(0, 20).join("\n  - ") + (r.problems.length > 20 ? "\n  … والمزيد" : ""));
  }
  console.log("  • after-pack [" + tag + "]: ✓ " + r.count.total + " مدخلاً — dist=" + r.count.dist
    + " · desktop=" + r.count.desktop + " — بلا tests/audit/docs");
}

module.exports = afterPack;
module.exports.inspect = inspect;
