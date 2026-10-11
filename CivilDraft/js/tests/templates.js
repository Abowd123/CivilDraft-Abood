import assert from "node:assert/strict";
import { installDefaults, templateList, build, apply, wallArgs, defineTemplate } from "../core/templates.js";
import { newState, S, editFailed } from "../core/state.js";
import { calibrate, setScale, state } from "../core/underlay.js";
let p = 0, f = 0;
const test = (n, fn) => { try { fn(); p++; console.log("✓ " + n); } catch (e) { f++; console.error("✗ " + n + " → " + (e.message || e)); } };

test("القوالب المدمجة", () => { installDefaults(); const names = templateList().map(t => t.name); ["room", "studio", "office"].forEach(n => assert.ok(names.includes(n))); });

test("build يعيد جدراناً وفتحاتٍ", () => {
  const s = build("studio");
  assert.equal(s.walls.length, 4);
  assert.equal(s.opens.length, 2, "بابٌ وشباك");
  assert.ok(s.opens.some(o => o.kind === "door"));
  assert.ok(s.opens.some(o => o.kind === "window"));
  assert.equal(s.meta.scale, 75);
});

/* ═══ apply — معاملةٌ حقيقية على الحالة ═══
   لم تعد hooks خارجية: apply() تكتب في S نفسها عبر addWall/addOpen
   الحقيقيتَين، فالبابُ فتحةٌ حقيقية على جدارٍ حقيقيّ — لا رمزٌ
   زخرفيّ فوق جدارٍ صلب. */
test("apply ينشئ جدراناً وفتحاتٍ حقيقية في الحالة", () => {
  newState();
  const r = apply("room");
  assert.ok(r, "apply نجحت");
  assert.equal(S.walls.length, 4, "أربعة جدران حقيقية في S");
  assert.equal(S.opens.length, 1, "فتحةٌ حقيقية واحدة");
  assert.equal(S.opens[0].kind, "door", "من النوع باب");
  assert.equal(S.meta.scale, 50, "المقياس من meta القالب");
  assert.equal(r.walls.length, 4);
  assert.equal(r.opens.length, 1);
});

test("apply — office: بابان وشباك على جدرانهم الصحيحة", () => {
  newState();
  apply("office");
  assert.equal(S.walls.length, 5, "أربعةٌ محيطة وقاطعٌ واحد");
  assert.equal(S.opens.length, 3, "بابان وشباك");
  const kinds = S.opens.map(o => o.kind).sort();
  assert.deepEqual(kinds, ["door", "door", "window"]);
});

/* ═══ الذرّية: فتحةٌ فاسدة تُرجِع كلّ القالب لا نصفه ═══
   قالبٌ فيه جدارٌ واحد وفتحةٌ تشير إلى فهرس جدارٍ غير موجود —
   addOpen لن تصل أصلاً (target غير معرَّف) فنرمي قبلها، وedit()
   تلتقط الرميةَ وتُعيد اللقطة: لا يبقى الجدارُ الذي أُضيف قبل
   الفتحة الفاسدة معلَّقاً في الحالة. */
test("فشل فتحةٍ يُرجِع الجدران أيضاً — لا نصف قالب", () => {
  newState();
  defineTemplate({ name: "broken", build: () => ({
    walls: [{ a: [0, 0], b: [3000, 0], th: 200, type: "ext" }],
    opens: [{ wallIndex: 5, s: 100, kind: "door", w: 900, h: 2100 }]
  })});
  const r = apply("broken");
  assert.equal(r, undefined, "apply لا تعيد شيئاً عند الفشل");
  assert.ok(editFailed(), "edit() سجّلت الفشل");
  assert.equal(S.walls.length, 0, "الجدارُ الذي سبق الفتحةَ الفاسدة لم يبق");
  assert.equal(S.opens.length, 0);
});

test("١١: محيطُ القوالب خارجيّ والقواطعُ داخلية", () => {
  const off = build("office");
  assert.equal(off.walls.length, 5);
  assert.equal(off.walls.filter(w => w.type === "ext").length, 4, "الأربعةُ المحيطة ext");
  assert.equal(off.walls.filter(w => w.type === "int").length, 1, "والقاطعُ int");
  ["room", "studio"].forEach(n => assert.ok(build(n).walls.every(w => w.type === "ext"), n + ": ext"));
});

/* ═══ وسائط addWall — دالّةٌ خالصة، تُختبَر بلا حالة ولا hooks ═══ */
test("١١: النوع يصل إلى وسائط addWall والغائبُ int", () => {
  const off = build("office");
  const seen = off.walls.map(wallArgs);
  assert.deepEqual(seen.map(a => a[3]), ["ext", "ext", "ext", "ext", "int"]);
  assert.equal(seen[0][4], "c", "والمحاذاة مركزية");
  defineTemplate({ name: "legacy", build: () => ({ walls: [{ a: [0, 0], b: [1000, 0], th: 150 }] }) });
  const legacy = build("legacy").walls.map(wallArgs);
  assert.equal(legacy[0][3], "int", "قالبٌ بلا type يبقى داخلياً كما كان");
  assert.deepEqual(wallArgs({ a: [0, 0], b: [1, 0], th: 1, type: "low", h: 900 }).slice(3), ["low", "c", 900],
    "والسترةُ تحمل ارتفاعها");
});

test("معايرة الصورة", () => { setScale(0.01); const before = state().mpp; assert.equal(calibrate({ x: 0, y: 0 }, { x: 2, y: 0 }, 4), before * 2); });
console.log(`\n${p} ناجح، ${f} فاشل`); process.exit(f ? 1 : 0);
