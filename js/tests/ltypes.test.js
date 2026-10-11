/* ═══ أنواع الخطوط المخصصة — تراجع وحفظ ومصنع وحذف مرفوض ═══
   التشغيل: node js/tests/ltypes.test.js
   يغطّي المصنعَ والتراجعَ واللقطةَ وحدَّ الرفض، وحرّاساً مصدريةً
   تمنع انجراف resolve إلى الجدول الثابت وانقلاب الترتيب في
   ensureShape. */
import {shim, group, ok, eq, summary} from "./harness.js";
shim();
import {readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = r =>
  readFileSync(join(ROOT, r), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const ST = await import("../core/state.js");
const {S, DEF, loadState, clearHistory, snapshot, canUndo, undo, editFailed} = ST;
const LTN = await import("../core/ltypes.js");
const LAY = await import("../core/layers.js");
const {LIM} = await import("../core/limits.js");

const reset = () => {
  loadState(DEF(), true);
  clearHistory();
};

group("ltypes — المصنع سليم ولا يُظلَّل ولا يُحذَف", () => {
  reset();
  eq(
    Object.keys(S.ltypes).length,
    Object.keys(LTN.defLtypes()).length,
    "المصنع يُعاد بناؤه كاملاً في DEF"
  );
  eq(LTN.ltDef("solid").dxf, "CONTINUOUS", "solid");
  eq(LTN.ltDef("hidden").mm.join(","), "3,2", "hidden");
  eq(LTN.ltOk("solid"), "solid", "ltOk تقبل المصنع");
  eq(LTN.ltOk("مجهول"), null, "وتطرح المجهول");
  eq(LTN.addLtype("solid", "x", "x", [1, 1]), false,
    "إضافةٌ باسم مصنع تُرفَض");
  eq(LTN.delLtype("solid"), false, "وحذفُ المصنع يُرفَض");
  eq(LTN.ltLabel("hidden"), "مخفيّ", "الوصف من المصنع");
});

group("ltypes — إضافةٌ تصل resolve فوراً", () => {
  reset();
  LTN.addLtype("MB-DOUBLE", "مزدوج مكسور", "CONTINUOUS", [10, 3, 10, 3]);
  LAY.setLay("A-DIMS", "lt", "MB-DOUBLE");
  const r = LAY.resolve("A-DIMS", "plot");
  eq(r.dash.join(","), "10,3,10,3", "الأطوال تخرج من resolve عبر الطبقة");
  eq(r.dxf, "CONTINUOUS", "وdxf يحمل اسم النمط");
  LAY.setLay("A-DIMS", "lt", "solid");
});

group("ltypes — التراجع يزيل الإضافة ويعيد العدّ", () => {
  reset();
  const before = Object.keys(S.ltypes).length;
  LTN.addLtype("MB-DOUBLE", "مزدوج", "CONTINUOUS", [10, 3]);
  ok(canUndo(), "خطوةٌ مضافة");
  undo();
  eq(LTN.ltOk("MB-DOUBLE"), null, "تراجعٌ واحد يزيل الإضافة");
  eq(Object.keys(S.ltypes).length, before, "ويعود العدّ كما كان");
});

group("ltypes — حذفٌ مرفوض ما دام مستعملاً، وسليمٌ بعد فكّه", () => {
  reset();
  LTN.addLtype("MB-USED", "مستعمل", "CONTINUOUS", [8, 2]);
  LAY.setLay("A-DOOR", "lt", "MB-USED");
  eq(LTN.delLtype("MB-USED"), undefined,
    "الحذف لا يمرّ والنوع مستعمل");
  ok(editFailed(), "وeditFailed معلَّم بالسبب");
  ok(LTN.ltOk("MB-USED"), "والنوع باقٍ");
  LAY.setLay("A-DOOR", "lt", "solid");
  eq(LTN.delLtype("MB-USED"), true, "بعد فكّ الاستعمال يُحذَف");
  eq(LTN.ltOk("MB-USED"), null, "وزال فعلاً");
});

group("ltypes — مدخلاتٌ غير صالحة لا تكتب شيئاً", () => {
  reset();
  eq(LTN.addLtype("اسم عربي", "وصف", "CONTINUOUS", [5, 5]), undefined,
    "اسمٌ غير لاتيني مرفوض داخل المعاملة");
  ok(editFailed(), "وعلّم الفشل");
  eq(LTN.ltOk("اسم عربي"), null, "ولم يُكتب");
  const n0 = Object.keys(S.ltypes).length;
  eq(LTN.addLtype("MB-BAD", "وصف", "CONTINUOUS", [0]), undefined,
    "نمطٌ بلا أطوالٍ موجبة مرفوض");
  eq(LTN.ltOk("MB-BAD"), null, "ولم يُكتب");
  eq(Object.keys(S.ltypes).length, n0, "والعدّ لم يتغيّر");
  eq(LTN.ltOk("solid"), "solid", "المصنع سليمٌ بعد كل المحاولات");
});

group("ltypes — حفظٌ وفتح: المخصصة تنجو والملفّ القديم لا ينكسر", () => {
  reset();
  LTN.addLtype("MB-SPEC", "خاص", "CONTINUOUS", [20, 4]);
  const snap = snapshot();

  reset();
  eq(LTN.ltOk("MB-SPEC"), null, "الإعادة تمحو المخصصة");
  loadState(JSON.parse(snap), true);
  eq(LTN.ltOk("MB-SPEC"), "MB-SPEC", "ثم تعود من اللقطة");
  eq(LTN.ltDef("MB-SPEC").mm.join(","), "20,4", "وبأطواله نفسها");

  /* ملفٌّ قديم بلا مفتاح ltypes: نُحاكي الإقلاع (S=DEF أولاً) ثم
     نفتح ملفاً لا يحمل المفتاح — فالمصنع يعود بلا عطلٍ ولا مخصصة. */
  const d = JSON.parse(snap);
  delete d.ltypes;
  reset();                 /* ← يعيد S.ltypes إلى المصنع كما يفعل الإقلاع */
  loadState(d, true);
  eq(
    Object.keys(S.ltypes).length,
    Object.keys(LTN.defLtypes()).length,
    "غيابُ المفتاح يُبقي المصنع كاملاً"
  );
  eq(LTN.ltOk("MB-SPEC"), null, "والمخصصة زالت بلا عطل");
});

group("ltypes — الدوالّ المساعدة المتبقية: تسمية، تخصيص، قائمة، إعادة", () => {
  reset();
  ok(LTN.ltNameOk("MB-DOUBLE"), "اسمٌ لاتينيٌّ سليم مقبول");
  eq(LTN.ltNameOk("١خطأ"), false, "واسمٌ غير لاتينيٍّ مرفوض");
  eq(LTN.isCustomLt("solid"), false, "المصنعيّ ليس مخصَّصاً");
  eq(LTN.isCustomLt("MB-DOUBLE"), false, "ولا نوعٌ غير موجود بعد");
  LTN.addLtype("MB-DOUBLE", "مزدوج", "CONTINUOUS", [10, 3]);
  ok(LTN.isCustomLt("MB-DOUBLE"), "وبعد الإضافة يصير مخصَّصاً");
  eq(LTN.ltDashes("hidden").join(","), "3,2", "ltDashes تقرأ المصنع");
  eq(LTN.ltDashes("MB-DOUBLE").join(","), "10,3", "وتقرأ المخصَّص كذلك");
  const base = Object.keys(LTN.defLtypes()).length;
  const list = LTN.ltList();
  eq(list.length, base + 1, "القائمة تضمّ المصنعَ زائد المخصَّص");
  eq(list.filter(x => x.custom).length, 1, "ومخصَّصٌ واحدٌ مُعلَّم");
  eq(LTN.resetLtypes(), base, "الإعادة تنجح لعدم استعمال المخصَّص وتعيد العدد");
  eq(LTN.ltOk("MB-DOUBLE"), null, "والمخصَّص زال بعد الإعادة");
});

group("ltypes — حرّاسٌ مصدرية", () => {
  const lay = src("js/core/layers.js");
  const sta = src("js/core/state.js");
  ok(/ltDef\(l\.lt\)/.test(lay),
    "resolve تقرأ ltDef (الحيّ) لا ltOf الثابت");
  ok(!/const t=ltOf\(l\.lt\)/.test(lay), "ولا أثرَ للقراءة من الثابت");
  ok(/from\s*"\.\/ltypes\.js"/.test(lay), "layers يستورد ltypes");
  ok(
    /LTN\.normLtypes\(\)/.test(sta) &&
      sta.indexOf("LTN.normLtypes()") < sta.indexOf("LY.normLays()"),
    "ensureShape تُطبِّع الأنواعَ قبل الطبقات"
  );
  ok(/"layers","layst","ltypes"/.test(sta), "ltypes داخل KEYS عند الحفظ");
  ok(/ltypes:LTN\.defLtypes\(\)/.test(sta), "وDEF تملؤه من المصنع");
});

process.exit(summary() ? 1 : 0);
