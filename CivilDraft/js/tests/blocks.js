import assert from "node:assert/strict";
import { defineBlock, makeInstance, explode, bbox, installDefaults, blockList, toJSON, fromJSON, hasBlock, removeBlock, installBlockHook, blockUses, installBlockUsageFn } from "../core/blocks.js";
import { S, ensureShape, DEF, pack, edit, undo, canUndo } from "../core/state.js";
import { setIdc } from "../core/units.js";
import { BLK_LAY, AUX } from "../core/laydef.js";
import { filterPrims, setLay, hasLay } from "../core/layers.js";
let p = 0, f = 0;
const test = (n, fn) => { try { fn(); p++; console.log("✓ " + n); } catch (e) { f++; console.error("✗ " + n + " → " + (e.message || e)); } };
const approx = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) <= e, `${a} ≈ ${b}`);
test("تعريف كتلة وإدراج مثيل", () => {
  defineBlock({ name: "seg", title: "قطعة", prims: [{ t: "line", a: [0, 0], b: [1000, 0] }] });
  assert.ok(hasBlock("seg"));
  const pr = explode(makeInstance("seg", { x: 2000, y: 3000 }));
  assert.deepEqual(pr[0].a, [2000, 3000]); assert.deepEqual(pr[0].b, [3000, 3000]);
});
test("الدوران 90°", () => { const pr = explode(makeInstance("seg", { rot: Math.PI / 2 })); approx(pr[0].b[0], 0); approx(pr[0].b[1], 1000); });
test("المقياس والمرآة", () => { approx(explode(makeInstance("seg", { scale: 2 }))[0].b[0], 2000); approx(explode(makeInstance("seg", { mirror: true }))[0].b[0], -1000); });
test("مقياسٌ مستقلٌّ لكل محور (scaleX/scaleY) — إصلاح المراجعة #1", () => {
  defineBlock({ name: "box", prims: [
    { t: "pline", pts: [[0, 0], [1000, 0], [1000, 500], [0, 500]], closed: true }
  ]});
  /* scaleX وحده يمدّد العرض ولا يمسّ الارتفاع */
  const pr1 = explode(makeInstance("box", { scaleX: 3 }));
  approx(pr1[0].pts[1][0], 3000); approx(pr1[0].pts[2][1], 500);
  /* scaleY وحده يمدّد الارتفاع ولا يمسّ العرض */
  const pr2 = explode(makeInstance("box", { scaleY: 2 }));
  approx(pr2[0].pts[1][0], 1000); approx(pr2[0].pts[2][1], 1000);
  /* scale الموحَّد يبقى مضروباً فوق scaleX/scaleY */
  const pr3 = explode(makeInstance("box", { scale: 2, scaleX: 3, scaleY: 2 }));
  approx(pr3[0].pts[1][0], 6000); approx(pr3[0].pts[2][1], 2000);
  /* غياب scaleX/scaleY (مشروعٌ قديم) = 1،1 — بلا أثر، كما كان */
  const legacy = makeInstance("box", { scale: 2 });
  assert.equal(legacy.scaleX, 1); assert.equal(legacy.scaleY, 1);
});
test("المكتبة المدمجة", () => { installDefaults(); const names = blockList().map(b => b.name); ["door", "window", "table"].forEach(n => assert.ok(names.includes(n))); });
test("صندوق الإحاطة", () => { const bb = bbox(makeInstance("seg")); approx(bb.minX, 0); approx(bb.maxX, 1000); });
test("الحفظ والاسترجاع", () => { const snap = toJSON(); fromJSON({ defs: [] }); assert.equal(hasBlock("seg"), false); fromJSON(snap); assert.equal(hasBlock("seg"), true); });
test("معرّفات الكتل تدخل العدّاد الموحَّد — لا تصادم مع b1", () => {
  Object.assign(S, DEF());
  S.blocks = [{ block: "door", x: 0, y: 0, id: "b3" },
              { block: "door", x: 100, y: 0, id: "b7" }];
  setIdc(0);
  ensureShape();
  installDefaults();
  const fresh = makeInstance("door", {});
  assert.equal(fresh.id, "b8", `متوقّع b8، جاء ${fresh.id}`);
});
test("3.2: اللقطة تشمل تعريفات الكتل", () => {
  ensureShape();   /* تسجّل installBlockHook — لازمةٌ قبل الحذف/التعريف أدناه */
  defineBlock({ name: "custom", title: "كتلة تجريبية",
   prims: [{ t: "line", a: [0, 0], b: [100, 100] }] });
  assert.ok(hasBlock("custom"), "التعريف لم يُسجَّل");

  const snap = pack();
  assert.ok(snap._blocks && Array.isArray(snap._blocks.defs),
   "pack لا تُدرِج _blocks");
  assert.ok(snap._blocks.defs.some(d => d.name === "custom"),
   "التعريف المخصّص ليس في اللقطة");

  removeBlock("custom");
  assert.equal(hasBlock("custom"), false, "الحذف لم يقع");
  fromJSON(snap._blocks);
  assert.ok(hasBlock("custom"), "التعريف لم يُستَعَد من اللقطة");
});
test("3.2: removeBlock يُبلِّغ الحالة", () => {
  defineBlock({ name: "custom2", prims: [] });
  let called = false, arg = null;
  installBlockHook((w, n) => { called = true; arg = { w, n }; });
  removeBlock("custom2");
  assert.ok(called && arg.w === "remove" && arg.n === "custom2",
   "removeBlock لم يُبلِّغ المستمع");

  called = false;
  removeBlock("custom2");   /* محذوفة سلفاً */
  assert.equal(called, false, "حذفُ كتلةٍ غير موجودة أطلق المستمع");
  installBlockHook(null);   /* لا تُبقِ مستمعاً للاختبارات التالية */
});
test("3.2: التراجع يُعيد تعريف كتلةٍ محذوفة", () => {
  defineBlock({ name: "tmp", prims: [] });
  edit(() => { removeBlock("tmp"); }, "حذف كتلة");
  assert.equal(hasBlock("tmp"), false, "الحذف لم يقع");
  assert.ok(canUndo(), "الحذف لم يدخل التاريخ");
  undo();
  assert.ok(hasBlock("tmp"), "التراجع لم يُعِد الكتلة المحذوفة");
});
test("3.2/7.2: removeBlock خارج edit() يدخل التاريخ بخطوةٍ واحدة صحيحة", () => {
  ensureShape();   /* تُسجَّل installBlockHook + installBlockSnapshotFn */
  defineBlock({ name: "solo", prims: [] });
  const before = canUndo();   /* defineBlock نفسها لا تدخل خطوة (فقط الحذف يُختبَر هنا) */
  removeBlock("solo");        /* بلا edit() من حولها — الحذفُ وحده */
  assert.equal(hasBlock("solo"), false, "الحذف لم يقع");
  assert.ok(canUndo(), "removeBlock خارج edit() لم يدخل التاريخ");
  undo();
  assert.ok(hasBlock("solo"),
   "التراجع لم يُعِد الكتلة — كان الإصلاح القديم يدفع لقطةَ (بعد) فلا يُغيّر شيئاً عند التراجع");
});
test("3.2/7.2: حذفان متتاليان خارج edit() — كل تراجعٍ يعيد كتلته هو، لا الأخرى", () => {
  ensureShape();
  defineBlock({ name: "a1", prims: [] });
  defineBlock({ name: "a2", prims: [] });
  removeBlock("a1");
  removeBlock("a2");
  assert.equal(hasBlock("a1"), false); assert.equal(hasBlock("a2"), false);
  undo();   /* يُفترض أن يُعيد a2 (آخر ما حُذف) دون a1 */
  assert.ok(hasBlock("a2"), "التراجع الأول لم يُعِد a2");
  assert.equal(hasBlock("a1"), false, "التراجع الأول أعاد a1 خطأً");
  undo();   /* يُعيد a1 أيضاً */
  assert.ok(hasBlock("a1"), "التراجع الثاني لم يُعِد a1");
});

test("٣: حذفُ تعريفٍ له مثيلاتٌ يُرفَض ويُسمّي السبب", () => {
  Object.assign(S, DEF());
  ensureShape();
  defineBlock({ name: "used", prims: [{ t: "line", a: [0, 0], b: [10, 0] }] });
  S.blocks = [makeInstance("used", { x: 1 }), makeInstance("used", { x: 2 }),
              makeInstance("seg", { x: 3 })];
  assert.equal(blockUses("used"), 2, "العدُّ لا يشمل مثيلات كتلةٍ أخرى");
  assert.equal(blockUses("nothing"), 0, "وكتلةٌ بلا مثيلات صفر");
  assert.throws(() => removeBlock("used"), /«used».*2 مثيلاً/,
    "الرفضُ يُسمّي الكتلة وعدد مثيلاتها");
  assert.ok(hasBlock("used"), "والتعريفُ باقٍ بعد الرفض");
  assert.equal(S.blocks.length, 3, "والمثيلاتُ لم تُمَسّ");
});
test("٣: بعد حذف المثيلات يُقبَل الحذف، وforce يحذف عن علم", () => {
  S.blocks = S.blocks.filter(b => b.block !== "used");
  assert.equal(removeBlock("used"), true, "بلا مثيلات: يُحذَف");
  assert.equal(hasBlock("used"), false);
  defineBlock({ name: "used2", prims: [] });
  S.blocks = [makeInstance("used2")];
  assert.equal(removeBlock("used2", { force: true }), true, "force يحذف رغم المثيلات");
  assert.equal(S.blocks.length, 1, "والمثيلُ يبقى معلَّقاً — يُبلِّغ عنه الفاحص (bdef)");
  assert.equal(removeBlock("never-defined"), false, "وغيرُ المعرَّفة: false بلا رفض");
  S.blocks = [];
});
test("١٢: مثيلات الكتل على طبقةٍ حقيقية في الجدول", () => {
  Object.assign(S, DEF());
  ensureShape();
  assert.equal(makeInstance("seg").layer, BLK_LAY, "الافتراضيُّ A-BLKS لا «0»");
  assert.equal(makeInstance("seg", { layer: "A-FIXT" }).layer, "A-FIXT",
    "وما سُمّي صراحةً يبقى");
  assert.ok(hasLay(BLK_LAY), "والطبقةُ في جدول المصنع");
  assert.ok(AUX.has(BLK_LAY), "ومساعدة: لا كيانَ يُحدَّد عليها فلا قفلَ");
  assert.equal(setLay(BLK_LAY, "lk", 1), false, "والقفلُ عليها مرفوض");
  const prim = { t: "line", L: BLK_LAY, a: [0, 0], b: [1, 1] };
  assert.equal(filterPrims([prim]).length, 1, "ظاهرةٌ في المصنع");
  setLay(BLK_LAY, "off", 1);
  assert.equal(filterPrims([prim]).length, 0, "وتُخفى من المدير — كانت «0» لا تُخفى");
  setLay(BLK_LAY, "off", 0);
});
test("١٢: ensureShape يُهاجر «0» والفارغ ويُبقي المسمّى", () => {
  Object.assign(S, DEF());
  S.blocks = [
    { block: "seg", x: 0, y: 0, layer: "0" },
    { block: "seg", x: 1, y: 0 },
    { block: "seg", x: 2, y: 0, layer: "" },
    { block: "seg", x: 3, y: 0, layer: "A-FIXT" },
    { block: "seg", x: 4, y: 0, layer: "طبقتي" }];
  ensureShape();
  assert.deepEqual(S.blocks.map(b => b.layer),
    [BLK_LAY, BLK_LAY, BLK_LAY, "A-FIXT", "طبقتي"]);
});
test("٣: عدُّ الاستعمال مُسجَّل: الغياب صفرٌ، والمسجَّل يُستشار", () => {
  Object.assign(S, DEF());
  ensureShape();
  defineBlock({ name: "probe", prims: [] });
  try {
    installBlockUsageFn(() => 5);
    assert.throws(() => removeBlock("probe"), /5 مثيلاً/, "الدالّةُ المسجَّلة هي التي تُستشار");
    installBlockUsageFn(null);
    assert.equal(blockUses("probe"), 0, "بلا تسجيل: لا مثيلات (blocks.js وحدها)");
    assert.equal(removeBlock("probe"), true, "فيُقبَل الحذف");
  } finally {
    /* أعِد ما يسجّله state.js — لئلا يتسرّب الاختبار إلى ما بعده */
    installBlockUsageFn(name => (S.blocks || []).filter(b => b && b.block === name).length);
  }
  defineBlock({ name: "probe2", prims: [] });
  S.blocks = [makeInstance("probe2")];
  assert.throws(() => removeBlock("probe2"), /«probe2»/, "والحقيقيّ عاد يعمل");
  S.blocks = [];
  removeBlock("probe2");
});
console.log(`\n${p} ناجح، ${f} فاشل`); process.exit(f ? 1 : 0);