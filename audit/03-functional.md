الحالة: جزئي — 4 قضايا مؤكدة · حرج: 0 · مهم: 4 · تحسين: 0

## النتائج

| المعرّف | الخطورة | الملف:السطر | الوصف | الدليل/طريقة التأكد | الإصلاح المقترح |
|---|---|---|---|---|---|
| P3-001 | مهم | `js/io/project.js:51–60` | الحفظ المتكرر لا يكون byte-identical لأن `toJSON()` يولّد `__saved` جديداً في كل مرة. | `/tmp/probe_project.mjs`: بعد `toJSON → fromJSON → toJSON` كانت `equal:false`، مع اختلاف طابعَي الزمن فقط في المشروع البسيط. | ثبّت `__saved` ضمن بيانات المشروع أو استبعده من معيار الحفظ الحتمي؛ لا تولّده عشوائياً عند كل حفظ إذا كان العقد byte-identical. |
| P3-002 | مهم | `js/io/dxf.js:88–103` | قوس DXF ذي الاتجاه السالب يُصدّر بعد تبديل الزاويتين؛ بذلك لا يُحفظ اتجاه القوس CW في round-trip. | `/tmp/probe_dxf_round.mjs`: دخلت زوايا `149.036 → 30.964`، وخرجت `30.964 → 149.036`، ثم أعاد المستورد القوس بالترتيب CCW. | حوّل القوس السالب إلى تمثيل يحفظ اتجاهه، أو tessellate إلى polyline/bulge مع اتجاه صحيح قبل التصدير؛ اختبر round-trip للاتجاهين. |
| P3-003 | مهم | `js/ui/levelManager.js:83–84`، التسجيل عبر `defTool` | الأداة المسجّلة الإضافية غير الموثقة هي `levelMgr`. المقارنة الفعلية أعطت 108 معرفات مسجّلة مقابل 108 صفوف أوامر مستخرجة، لكن `levels` موثق وغير مسجّل، و`levelMgr` مسجّل وغير موثق؛ وبمعيار الاختبار الأساسي ذي 107 يظهر الفرق كأداة زائدة. | `/tmp/probe_tools_diff.mjs`: بعد تحميل كل `js/tools/*.js` ثم `appcmds.js`, `viewcmds.js`, `blockpanel.js`, `levelManager.js`: `extra:["levelMgr"]`, `missing:["levels"]`. | وحّد الاسم في registry/docs/schema: إمّا توثيق `levelMgr` وإزالة/تغيير `levels`، أو تسجيل `levels` فعلاً وإزالة `levelMgr` من سطح الأوامر. حدّث اختبار العدد بعد القرار. |
| P3-004 | مهم | `js/core/state.js:199,577` أثناء `ensureShape()` | مشروع غني يفقد fidelity عند load: annotation ناقص الحقل `hm` يعود بعد التحميل بـ`hm:1`، كما أُسقطت المجموعة التي أُنشئت يدوياً بصيغة غير صالحة. بعد حذف `__saved` بقيت السلسلتان مختلفتين؛ أول فرق هو `/anno/0/hm`: `null → 1`. | `/tmp/probe_rich.mjs`: مشروع يحوي 3 جدران (منها قوس)، فتحة، طبقتين معدّلتين، block definition+insert، sheet+viewport، مستويين إضافيين، annotation، group؛ النتيجة `equal:false`, `first:["/anno/0/hm",null,1]`, `count:6`. | اجعل التطبيع canonical قبل أول حفظ، أو احفظ الحقول الافتراضية صراحةً عند الإنشاء. لا تُسقط group غير الصالح بصمت؛ سجّل سبب الإسقاط وأصلح صيغة إنشاء المجموعة أو ارفضها مبكراً. |

## تفاصيل القضايا

### P3-001

**خطوات إعادة الإنتاج:**

```bash
node /tmp/probe_project.mjs
```

المسبار الأساسي:

```js
let a = PR.toJSON();
PR.fromJSON(a);
let b = PR.toJSON();
console.log({equal: a === b,
  aSaved: JSON.parse(a).__saved,
  bSaved: JSON.parse(b).__saved});
```

**المتوقع:** `a === b` بعد `save → load → save`.

**الفعلي:** `equal:false`؛ `__saved` اختلف من `...59.542Z` إلى `...59.548Z`.

### P3-002

**خطوات إعادة الإنتاج:**

```bash
node /tmp/probe_dxf_round.mjs
```

المسبار الأساسي:

```js
const prim = [{t:"arc", L:"A-WALL", cx:2000, cy:-1500,
  r:2500, a0:149.036, a1:30.964}];
const txt = DX.toDXF(prim, bbox, {});
console.log(txt.match(/0\nARC[\s\S]*?0\nENDSEC/)[0]);
console.log(DI.parseDXF(txt, {}).ents[0]);
```

**المتوقع:** بقاء اتجاه القوس السالب بعد التصدير والاستيراد.

**الفعلي:** DXF احتوى `50=30.964`, `51=149.036`؛ أي صار الاتجاه CCW. ملاحظة: بنية DXF الأساسية نفسها احتوت `ENDSEC` و`EOF` بصورة سليمة في الحالات الأخرى.

### P3-003

**خطوات إعادة الإنتاج:**

```bash
node /tmp/probe_tools_diff.mjs
```

المسبار الأساسي:

```js
for (const f of readdirSync("js/tools").filter(x => x.endsWith(".js")))
  await import(`js/tools/${f}`);
for (const f of ["appcmds.js","viewcmds.js","blockpanel.js","levelManager.js"])
  await import(`js/ui/${f}`);
const ids = new Set(R.toolList().map(x => x.id));
const docs = new Set(/* أول command في صفوف docs/tools.md */);
console.log({extra:[...ids].filter(x => !docs.has(x)),
  missing:[...docs].filter(x => !ids.has(x))});
```

**المتوقع:** تطابق كامل بين registry والوثائق.

**الفعلي:** `levelMgr` مسجّل ولا يظهر في docs، بينما `levels` موثق ولا يظهر في registry بعد تحميل مسار التسجيل الحقيقي.

### P3-004

**خطوات إعادة الإنتاج:**

```bash
node /tmp/probe_rich.mjs
```

المسبار الأساسي:

```js
let a = PR.toJSON();
PR.fromJSON(a);
let b = PR.toJSON();
const stripSaved = s => { const d = JSON.parse(s); delete d.__saved; return d };
const diff = firstDeepDifference(stripSaved(a), stripSaved(b));
console.log({equal: !diff.length, first: diff[0], count: diff.length});
```

**المتوقع:** مشروع غني يحافظ على كل الحقول والكيانات، وتكون السلسلتان متطابقتين بعد تجاهل metadata الزمنية.

**الفعلي:** `equal:false`، أول فرق `/anno/0/hm`, من `null` إلى `1`؛ وعدد الفروق 6. كما كان `groups` الناتج بعد التحميل صفراً في fixture اليدوي لأن صيغة العضو اليدوية لم تكن الصيغة التي يقبلها التطبيع.

## ما فُحص وتبيّن سليماً

- **osnap:** شُغّلت كل مفاتيح `MODES`: `end, mid, cen, int, nod, per, par, tan, near, ref` على جدران مستقيمة وقوسية. نجحت حالات arc `end` و`mid` و`near` و`per`، ونجح `par` عند تفعيله (`S.os.par=1`)، بينما الإعداد الافتراضي بقي `0` كما هو معلن. لم تثبت قضية مستقلة من هذه الجولة.
- **BOQ:** fixture مستطيل 4×3 م بأربعة جدران خارجية سماكة 200 مم وفتحة باب واحدة أعاد: طول 14,000 مم، face `42,000,000` مم²، volume `8,400,000,000` مم³، والفتحة `2,100,000` مم²؛ وهي الحسابات اليدوية المتوقعة.
- **Pricing:** عند بندين `2×10` و`3×5` وضريبة 15%: subtotal `35`، tax `5.25`، total `40.25`.
- **Arabic CP1256:** `سلام عربي` ترمّز إلى CP1256 ثم عادت كما هي عبر `toDXFBytes → decodeDXF → parseDXF`; `bad=0`، واحتفظ المستورد بالنص العربي.
- **PDF:** الناتج بدأ `%PDF-1.4` وانتهى `%%EOF`; فحصت offsets من xref وكانت جميع مراجع الكائنات صحيحة في fixture الخط الواحد.
- **SVG:** أُنتج خط ومسار arc بصيغة SVG صحيحة في fixture التصدير.
- **AI error paths:** network error، HTTP 500، invalid JSON، truncated JSON، وAbortError أعادت رسائل خطأ ولم تغيّر الحالة. `runOps(...,{atomic:1})` و`runAtomic` أعادا الحالة بلا جدار جزئي في اختبارات الفشل.
- **Migrations:** فُتحت payloads بإصداري 0 و1، و`mistar` القديم؛ نجحت الهجرة إلى بنية حديثة في الحالات المختبرة، مع تطبيع الفتحة وإضافة defaults.
- **Undo/redo المباشر:** الجدار، القوس، الفتحة، النقل، الدوران، والمرآة أعادت snapshot متطابقاً بعد undo ثم redo في probe المصحح؛ لم أعتبر ذلك تغطيةً كاملة لكل أدوات الواجهة.

## لم يُفحص

- لم تُستكمل قيادة **كل أدوات draw/edit** عبر registry، ولم يوجد tool id مستقل باسم `scale` في المسار الذي فُحص؛ لا أستنتج من ذلك سلامة أو عطباً في مقياس إدراج الكتل أو مقياس viewport.
- لم تُستكمل كل حالات `section` و`elevation` من خلال أدوات الواجهة؛ الاستدعاء المباشر احتاج عقداً دقيقاً للوسائط، وتعذر إنهاء probe الجامع قبل المهلة.
- لم تُستكمل أدوات `roof`, `section`, `elev`, `boq`, `boqreport`, `levelmgr` مع undo/redo لكل جلسة.
- لم تُستكمل حالات صحيحة كاملة لـ`cloud` و`detail callout` مع أوراق ومنافذ متعددة من خلال matching tools.
- لم تُفحص كل عمليات `groups`, `compare`, `plines`, `clouds`, `callouts` عبر الأدوات المطابقة؛ فُحصت بعض core APIs فقط.
- لم تُفحص كل حقول rich project (خصوصاً blocks/sheets/levels/groups) بصيغة fixture منشأة بالكامل بواسطة أدواتها، ولا كل فروق الـ6 الناتجة بعد أول فرق.
- لم يُنفّذ timeout حقيقي ينتظر 60 ثانية؛ لم تثبت سلامة مسار timeout الكامل، والمسبار العالق أُلغي خارجياً.
- لم تُستكمل `macrorun`/`plan`/`review` مع مزود mock وجميع حالات الإلغاء/الردود الجزئية.
- لم تُفحص وحدة PDF متعددة الصفحات، الصور، Arabic PDF، أو جميع خيارات الوحدات.
- لم تُفحص قائمة كل commands في `schema.js`, `palette.js`, `keymap.js` مقابل registry؛ فحص P3-003 غطى registry/docs بعد تحميل مسارات التسجيل الأساسية فقط.
- لا تُعدّ أي نقطة في هذا القسم سليمة إلا حيث ذُكرت نتيجة تشغيلية وأرقامها صراحةً.
