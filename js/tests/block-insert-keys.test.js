import assert from "node:assert/strict";
import { defineBlock } from "../core/blocks.js";
import { startInsert, onKey, onClick, cancel, ghost } from "../tools/blocks.js";

let p = 0, f = 0;
const test = (n, fn) => {
  try { fn(); p++; console.log("✓ " + n); }
  catch (e) { f++; console.error("✗ " + n + " → " + (e.message || e)); }
};
const approx = (a, b, e = 1e-6) =>
  assert.ok(Math.abs(a - b) <= e, `${a} ≈ ${b}`);
const key = k => ({ key: k, preventDefault(){} });

defineBlock({ name: "kbox", prims: [
  { t: "pline", pts: [[0, 0], [1000, 0], [1000, 500], [0, 500]], closed: true }
]});

/* ═══ إكمال إصلاح المراجعة #1 ═══
   core/blocks.js يحمل scaleX/scaleY منذ الإصلاح الأوّل (js/tests/
   blocks.js)، لكن لا startInsert(name) في blockpanel.js ولا أيّ
   لوحة خصائصَ بعد الإدراج كانا يمرّرانهما فعلياً — فالحقل كان حيّاً
   في النموذج وميتاً من منظور المستخدم. هذه الحالات تثبت أن أسهم
   لوحة المفاتيح أثناء الإدراج (المضافة في tools/blocks.js) تبلغه
   الآن، وتنتهي بمثيلٍ فعليٍّ محفوظٍ بقيم scaleX/scaleY الصحيحة —
   لا فحص onKey وحده بمعزلٍ عن الإدراج الفعلي. */
test("◀▶ تضبط scaleX دون مسّ scaleY أثناء الإدراج", () => {
  startInsert("kbox");
  assert.equal(ghost().scaleX, 1); assert.equal(ghost().scaleY, 1);
  assert.ok(onKey(key("ArrowRight")));
  approx(ghost().scaleX, 1.1); approx(ghost().scaleY, 1);
  cancel();
});
test("△▽ تضبط scaleY دون مسّ scaleX أثناء الإدراج", () => {
  startInsert("kbox");
  assert.ok(onKey(key("ArrowUp")));
  approx(ghost().scaleY, 1.1); approx(ghost().scaleX, 1);
  cancel();
});
test("◀ لا تنزل تحت 0.05 (لا مقياسَ سالباً أو صفريّاً)", () => {
  startInsert("kbox");
  for (let i = 0; i < 200; i++) onKey(key("ArrowLeft"));
  assert.ok(ghost().scaleX >= 0.05, `scaleX=${ghost().scaleX}`);
  cancel();
});
test("المثيل المُدرَج فعلياً يحمل scaleX/scaleY المضبوطين بالأسهم", () => {
  startInsert("kbox");
  onKey(key("ArrowRight")); onKey(key("ArrowRight")); /* ×1.1 مرّتين */
  onKey(key("ArrowUp"));
  const inst = onClick([2000, 3000]);
  assert.ok(inst, "onClick أعاد المثيل");
  approx(inst.scaleX, 1.1 * 1.1);
  approx(inst.scaleY, 1.1);
  assert.equal(inst.scale, 1, "المقياس الموحَّد لم يتأثّر بالأسهم");
});

console.log(`\n${p}/${p + f} نجحت`);
if (f) process.exit(1);
