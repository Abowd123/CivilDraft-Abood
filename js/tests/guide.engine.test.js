/* ═══ بوابة G2: عزل المعيد التعليمي ═══
   يثبت أن تشغيل درسٍ على النواة الحقيقية لا يلوّث مشروع المستخدم:
   الحالة سليمة، والخيارات وسجلّ الأوامر والتاريخ لا يتسرّب إليها
   شيء، والأعطاب وسط السيناريو لا تترك نصف درس. */
import * as A from "node:assert";
import { S, DEF, snapshot, loadState, clearHistory, canUndo }
  from "../core/state.js";
import * as R from "../tools/registry.js";
import { BATCH } from "../tools/registry.js";
import { createSession } from "../guide/engine.js";
import { runCheck, CHECKS } from "../guide/assert.js";

/* تسجيل أدوات النظام لتكون جاهزةً لنا وللمعيد في العقدة */
import "../tools/draw.js";
import "../tools/openings.js";
import "../tools/areas.js";

let passed = 0, failed = 0;
const ok = (name, fn) => {
  try { fn(); passed++; console.log("✓ " + name); }
  catch (e) { failed++; console.error("✗ " + name + "\n  " + e.message); }
};
const jsonOf = (s) => JSON.parse(s);
const snapEq = (a, b) => A.deepStrictEqual(jsonOf(a), jsonOf(b));

/* إعدادٌ نظيف قبل كل اختبار: مصنع فارغ بلا تاريخ */
function reset() {
  loadState(DEF(), true);
}
/* ضبط خيار أداةٍ قبل الدرس ليطمئنّ أن العزل يعيده */
function seedOpt() {
  R.loadOpts();
  R.setOpt("wall", "t", "0.99");
}

/* ═══ ١ ═══ الدرس ينفَّذ على حالةٍ بديلة ثم يعود كل شيء */
ok("تشغيل درسٍ ثم استعادةٌ حرفية", () => {
  reset(); seedOpt();
  const before = snapshot();
  const s = createSession("wall");

  A.equal(s.started, false, "الجلسة تبدأ خاملة");
  s.start();
  A.equal(BATCH.on, 1, "وضع الدفعة مفعّل أثناء الدرس");
  A.equal(S.walls.length, 0, "بدأنا من مصنع الدرس النظيف");

  s.run([
    { do: "say", say: "ارسم جداراً" },
    { do: "begin" },
    { do: "feed", val: [0, 0] },
    { do: "feed", val: [3000, 0] },
    { do: "finish" }
  ]);

  A.equal(S.walls.length, 1, "أنشأ الدرس جداراً واحداً داخل عزلته");

  s.restore();

  snapEq(snapshot(), before);
  A.equal(BATCH.on, 0, "وضع الدفعة عاد إلى الراحة");
  A.deepStrictEqual(Object.keys(R.H).sort(), Object.keys(s.realH).sort(),
    "الخطافات عادت");
});

/* ═══ ٢ ═══ الخيارات وسجلّ الأوامر يعودان بعد الدرس */
ok("خيارات الأدوات وسجلّ الأوامر يُستعادان", () => {
  reset(); seedOpt();
  R.T.hist = ["3,4"];               /* سطر أوامر المستخدم قائم */
  const beforeOpt = JSON.parse(JSON.stringify(R.OPT));
  const beforeHist = R.T.hist.slice();

  const s = createSession("wall");
  s.start();
  s.run([
    { do: "setOpt", arg: { k: "t" }, val: "0.12" },
    { do: "begin" },
    { do: "feed", val: [0, 0] },
    { do: "feed", val: [2000, 0] },
    { do: "finish" }
  ]);
  A.equal(R.BATCH.on, 1, "لا زلنا في الدرس");
  s.restore();

  A.deepStrictEqual(R.OPT, beforeOpt);
  A.deepStrictEqual(R.T.hist, beforeHist);
});

/* ═══ ٣ ═══ الدرس لا يدفع خطوة تاريخٍ شبحاً */
ok("لا history أثناء الدرس وبعد الاستعادة يبقى نظيفاً", () => {
  reset(); clearHistory();
  A.equal(canUndo(), false, "سجل التاريخ يبدأ فارغاً");

  const s = createSession("rect");
  s.start();
  s.run([
    { do: "setOpt", arg: { k: "t" }, val: "0.25" },
    { do: "setOpt", arg: { k: "type" }, val: "ext" },
    { do: "setOpt", arg: { k: "align" }, val: "l" },
    { do: "begin" },
    { do: "feed", val: [0, 0] },
    { do: "feed", val: "4x3" },
    { do: "finish" }
  ]);

  A.equal(canUndo(), false, "لم تُدفَع خطوة تراجع من داخل الدرس");
  A.equal(S.walls.length, 4, "المستطيل أُنشئ في العزل أربعة جدران");

  s.restore();
  A.equal(canUndo(), false, "الاستعادة لم تضف خطوةً هي الأخرى");
});

/* ═══ ٤ ═══ خطوة فاسدة تُسجَّل ولا تكسر العزل */
ok("السيناريو الفاسد يُسجَّل ويبقى الاستعادة صالحاً", () => {
  reset();
  const before = snapshot();
  const s = createSession("wall");
  s.start();
  const n = s.events.length;
  s._step({ do: "bogus" });
  A.ok(s.events.length > n, "الخطوة المجهولة لم تُسجَّل حدثاً");

  s.restore();
  snapEq(snapshot(), before);
});

/* ═══ ٥ ═══ الاستعادة عاطلة التكرار ولا ترمي */
ok("restore عاطل التكرار ويسمح بتكراره", () => {
  reset();
  const before = snapshot();
  const s = createSession("wall");
  s.start();
  s.run([
    { do: "begin" },
    { do: "feed", val: [0, 0] },
    { do: "feed", val: [1000, 0] },
    { do: "finish" }
  ]);
  s.restore();
  s.restore();               /* ثانيةٌ لا تغيّر ولا ترمي */
  A.equal(s.finished, true, "انتهت الجلسة");
  snapEq(snapshot(), before);
});

/* ═══ ٦ ═══ assert.js تلفّ دوال النواة الحقيقية — لا معيار ثانٍ */
ok("runCheck يتحقق جدار ٣ أمتار عبر الحالة المعزولة", () => {
  reset();
  const s = createSession("wall");
  s.start();
  s.run([
    { do: "begin" },
    { do: "feed", val: [0, 0] },
    { do: "feed", val: [3000, 0] },
    { do: "finish" }
  ]);
  A.equal(runCheck("wall.len3", S), true, "الحالة المعزولة تجتاز فحص wall.len3");
  s.restore();
});

ok("runCheck يتحقق القوس الحقيقي ويرمي على اسمٍ مجهول", () => {
  reset();
  const s = createSession("arcwall");
  s.start();
  s.run([
    { do: "begin" },
    { do: "feed", val: [1000, 5000] },
    { do: "feed", val: [6000, 5000] },
    { do: "feed", val: [3500, 7500] },
    { do: "finish" }
  ]);
  A.equal(runCheck("wall.arc", S), true, "الجدار المرسوم قوسٌ حقيقي (bulge)");
  s.restore();
  A.throws(() => runCheck("no.such.check", S), /فحصٌ غير معروف/,
    "اسمٌ مجهول يُكشَف لا يُتجاهَل");
  A.ok(Object.keys(CHECKS).length >= 6, "سجل الفحوص يحوي الفحوص الستة الموثَّقة");
});

process.exitCode = failed ? 1 : 0;
console.log(`\nG2: ${passed}/${passed + failed}`);
