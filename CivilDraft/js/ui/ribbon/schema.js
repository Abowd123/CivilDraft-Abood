/* ═══ مخطّط الشريط ═══
   وصفٌ لا كود: كل تبويبٍ ولوحٍ وزرّ سطرٌ في هذا الملفّ، فتحريك
   أمرٍ لا يمسّ المصيّر ولا الموصِّل.

   قواعد التنظيم (المرحلة ٤ من audit/10-ui-plan.md):
     • سبعةُ تبويبات: ستَّةٌ بالوظيفةِ وسابعٌ للإدارة.
     • **خمسةُ ألواحٍ لكلِّ تبويبٍ لا أكثر** — مقيسٌ ومحروس.
     • **ثلاثون عنصراً مقروءاً لكلِّ تبويبٍ لا أكثر**؛ وبلاطاتُ
       المكتباتِ الصغيرةُ تُستثنى لأنّها تُمسَح بالعينِ لا تُقرَأ.
     • **لا أمرَ في لوحَين** — قاعدةٌ مطلقةٌ في الشريط.
     • ما للوحِ لوحةٌ جانبية فله مُفتتِح (dlg) في ذيله.
     • ترتيب اللوحات ترتيبُ عملٍ: ارسم ثم عدّل ثم حرّر.

   ثلاثة أنواعٍ من العناصر، ولا رابع:
     {cmd}  أداة مسجَّلة — تُنادى بـ R.begin مباشرةً
     {act}  نقرٌ بالوكالة على زرٍّ قائم في اللوحة الجانبية
     {tog}  مفتاح حالةٍ يعكس حالة هدفه ويُبدّلها بنقره
   وثلاثةُ مقاساتٍ **كلُّها ظاهرة**: big كبيرةٌ · الافتراضُ متوسّطةٌ ·
   sm صغيرةٌ (أيقونةٌ وحدَها، للمكتبات). و{group:[…]} بقيَ للسياقيِّ
   وحدَه — ولا عمودَ في الشريطِ الأساسيِّ بعدَ اليوم.

   وأسطحُ التسريعِ مستثناةٌ من قاعدةِ الموضعِ الواحدِ صراحةً، وهي
   ثلاثةٌ لا رابع: التبويبُ السياقيُّ · شريطُ الوصولِ السريع (QAT) ·
   قائمةُ التطبيق. وكلٌّ منها **بيتٌ معلَنٌ** يعرفه `homeOf`. */

const G=(...items)=>({group:items});

/* ═══ التبويبات الثابتة ═══
   ترتيبها ترتيبُ عمل: ارسم وعدّل وأشير ثم سلّم، فالمعماري
   والتأشيري المتخصصان، فالإدراج والعرض، فالإخراج فالإدارة.
   D12-EP4: «رئيسي» أُعيد بناؤه أربعَ لوحاتٍ فقط ترتّب سطح
   التسريع، والمواضع الأساسية للأوامر في تبويباتها. */
/* ═══ التبويباتُ السبعةُ ═══ المرحلة ٤ من audit/10-ui-plan.md
   سِتَّةٌ **بالوظيفةِ** (ما يُنشئ · ما يُغيِّر · ما يصف · ما يُضاف ·
   ما يُرى · ما يخرج) وسابعٌ للإدارةِ: ما يضبط المشروعَ لا ما يرسمه.
   و«رئيسي» **حُذِف**: كان ٤٤ عنصراً، ٣٣ منها نسخةٌ من بيتِها الحقيقيّ
   — وسطحُ التسريعِ صار شريطَ «مؤخّراً» الذي **يتعلَّم من الاستعمالِ**
   (المرحلة ١) لا قائمةً ثابتةً خمَّنها كاتبُ المخطَّط.

   ولا عمودَ مجموعةٍ `G()` في هذا المخطَّطِ بعدَ اليوم: كلُّ عنصرٍ
   بلاطةٌ ظاهرةٌ بأحدِ ثلاثةِ مقاسات — `big` كبيرةٌ (أيقونةٌ فوق نصٍّ)
   للأشيعِ، والافتراضُ متوسّطةٌ (أيقونةٌ بجانبِ نصٍّ)، و`sm` صغيرةٌ
   (أيقونةٌ وحدَها) لمكتباتِ الرموز. والمنسدلُ بقيَ لشيءٍ واحدٍ:
   **الفيضانُ الحقيقيُّ** عند ضيقِ النافذةِ في `overflow.js`.

   وقاعدةُ الموضعِ الواحدِ صارت مطلقةً في الشريط: **لا أمرَ في
   لوحَين**. والسياقيُّ وشريطُ الوصولِ السريعِ وقائمةُ التطبيقِ أسطحُ
   تسريعٍ مُستثناةٌ صراحةً — ويحرسها `ribbon-shape.test.js`. */
export const RIBBON=[

/* ── رسم ── */
{id:"draw", n:"رسم", kt:"1", panels:[
 /* ما يُنشئ هيئةً مستقيمةً أو قوسيّة */
 {id:"shapes", n:"جدران وأشكال", dlg:"proj", items:[
  {cmd:"wall", n:"جدار", ico:"wall", big:1},
  {cmd:"rect", n:"مستطيل", ico:"rect", big:1},
  {cmd:"arcwall", n:"جدار قوسي", ico:"arcwall", big:1}]},
 /* الخطُّ المتعدّدُ والخربشةُ: هيئةٌ بلا سماكةِ جدار */
 {id:"free", n:"خطوط حرّة", items:[
  {cmd:"pline", n:"خطّ متعدّد", ico:"pline", big:1},
  {cmd:"sketch", n:"خربشة", ico:"sketch", big:1}]},
 /* كلُّ ما يُثقَب في جدارٍ — نوعٌ واحدٌ وستُّ صور */
 {id:"opens", n:"فتحات", items:[
  {cmd:"door", n:"باب", ico:"door", big:1},
  {cmd:"win", n:"شباك", ico:"window", big:1},
  {cmd:"fixed", n:"شباك ثابت", ico:"fixed"},
  {cmd:"opening", n:"فتحة", ico:"opening"},
  {cmd:"arch", n:"مقنطرة", ico:"arch"},
  {cmd:"niche", n:"كوّة", ico:"niche"}]},
 /* المنطقةُ وتحديثُها وتهشيرُها — الحدُّ ثمّ ملؤه */
 {id:"areas", n:"مناطق وتهشير", dlg:"sched", items:[
  {cmd:"area", n:"منطقة", ico:"area", big:1},
  {cmd:"arearef", n:"تحديث", ico:"arearef"},
  {cmd:"hatch", n:"تهشير", ico:"hatch"}]},
 /* المرجعُ مدخلٌ للرسمِ لا إدارةٌ له: تستورد لترسمَ فوقه */
 {id:"ref", n:"المرجع", dlg:"ref", items:[
  {act:"rImp", n:"استورد DXF", ico:"ref", big:1},
  {act:"underlayDlg", n:"صورة مرجعية", ico:"underlay", big:1},
  {act:"underlayCtlDlg", n:"ضبط الصورة", ico:"underlay"},
  {cmd:"refalign", n:"محاذاة", ico:"refalign"},
  {cmd:"refcal", n:"معايرة", ico:"refcal"},
  {cmd:"refmove", n:"نقل", ico:"refmove"},
  {act:"rRst", n:"صفّر التحويل", ico:"undo"},
  {act:"rClr", n:"أزِل المرجع", ico:"del"}]}
]},

/* ── تعديل ── */
{id:"edit", n:"تعديل", kt:"2", panels:[
 /* ما ينقل الجسمَ ولا يغيّر هيئتَه */
 {id:"xform", n:"تحويل", items:[
  {cmd:"move", n:"نقل", ico:"move", big:1},
  {cmd:"copy", n:"نسخ", ico:"copy", big:1},
  {cmd:"rotate", n:"دوران", ico:"rotate"},
  {cmd:"mirror", n:"مرآة", ico:"mirror"},
  {cmd:"scale", n:"مقياس", ico:"scale"},
  {cmd:"offset", n:"إزاحة", ico:"offset"}]},
 /* ما يلتقي فيه جسمان: ركنٌ أو طرفٌ أو قطع */
 {id:"ends", n:"أركان وأطراف", items:[
  {cmd:"chamfer", n:"كسر الركن", ico:"chamfer", big:1},
  {cmd:"fillet", n:"استدارة الركن", ico:"fillet", big:1},
  {cmd:"trim", n:"قصّ", ico:"trim"},
  {cmd:"extend", n:"تمديد", ico:"extend"},
  {cmd:"stretch", n:"شدّ", ico:"stretch"},
  {cmd:"break", n:"قطع", ico:"brk"},
  {cmd:"divide", n:"قسمة", ico:"divide"},
  {cmd:"weld", n:"لحم", ico:"weld"}]},
 /* التكرارُ المنظَّمُ والتسوية */
 {id:"arr", n:"مصفوفات وتسوية", items:[
  {cmd:"array", n:"مصفوفة", ico:"array", big:1},
  {cmd:"arraypolar", n:"مصفوفة قطبية", ico:"arraypol"},
  {cmd:"arraypath", n:"مصفوفة على مسار", ico:"arraypath"},
  {cmd:"align", n:"تسوية", ico:"align"}]},
 /* ما يغيّر داخلَ الجسمِ لا موضعَه */
 {id:"nodes", n:"تحرير العقَد", items:[
  {cmd:"pedit", n:"تحرير الخطّ", ico:"pedit", big:1},
  {cmd:"match", n:"مطابقة", ico:"match"},
  {cmd:"explode", n:"تفكيك كتلة", ico:"explode"}]},
 /* المجموعةُ تنظيمٌ للتحديدِ لا كيانٌ في الرسم */
 {id:"grp", n:"مجموعات", items:[
  {cmd:"group", n:"تجميع", ico:"grp", big:1},
  {cmd:"ungroup", n:"فكّ تجميع", ico:"ug", big:1},
  {cmd:"gselect", n:"تحديد مجموعة", ico:"gsel"},
  {cmd:"gmove", n:"تحريك مجموعة", ico:"gm"}]}
]},

/* ── تأشير ── */
{id:"annt", n:"تأشير", kt:"3", panels:[
 /* كلُّ ما يُقاس ويُكتَب رقمُه */
 {id:"dims", n:"أبعاد", dlg:"props", items:[
  {cmd:"dim", n:"بُعد", ico:"dim", big:1},
  {cmd:"chain", n:"سلسلة", ico:"chain", big:1},
  {cmd:"roomdim", n:"أبعاد الغرفة", ico:"dim"},
  {cmd:"dimrad", n:"نصف قطر", ico:"dimrad"},
  {cmd:"dimdia", n:"قطر", ico:"dimdia"},
  {cmd:"dimang", n:"زاوي", ico:"dimang"},
  {cmd:"chaincmp", n:"قارن السلسلة", ico:"chaincmp"},
  {cmd:"measure", n:"قياس", ico:"measure"},
  {cmd:"marea", n:"قياس مساحة", ico:"marea"}]},
 /* كلُّ ما يُكتَب حرفاً: نصٌّ وفقرةٌ وقائدٌ وحقلٌ حيّ */
 {id:"txt", n:"نصوص وقوائد", items:[
  {cmd:"text", n:"نصّ", ico:"text", big:1},
  {cmd:"mtext", n:"فقرة", ico:"mtext", big:1},
  {cmd:"lead", n:"قائد", ico:"lead", big:1},
  {cmd:"livetext", n:"حقل حيّ", ico:"live"},
  {cmd:"liverefresh", n:"تحديث الحقول", ico:"liver"}]},
 /* ما يصف ارتفاعاً أو ميلاً أو يجمع صفوفاً */
 {id:"tbl", n:"مناسيب وميل وجداول", items:[
  {cmd:"level", n:"منسوب", ico:"level", big:1},
  {cmd:"slope", n:"سهم ميل", ico:"slope", big:1},
  {cmd:"table", n:"ضَع جدولاً", ico:"table", big:1}]},
 /* المحاورُ وأبعادُها وأعمدتُها */
 {id:"axg", n:"المحاور", dlg:"axes", items:[
  {cmd:"axis", n:"محور", ico:"axis", big:1},
  {cmd:"griddim", n:"أبعاد المحاور", ico:"griddim"},
  {cmd:"gridcols", n:"أعمدة المحاور", ico:"gridcols"},
  {act:"axClr", n:"امسح المحاور", ico:"del"}]},
 /* سحابةُ المراجعةِ — تأشيرٌ على التأشير */
 {id:"rev", n:"مراجعة", items:[
  {cmd:"cloud", n:"سحابة مراجعة", ico:"cloud", big:1},
  {cmd:"cloude", n:"سحابة حول التحديد", ico:"cloude", big:1}]}
]},

/* ── خدمات ── */
{id:"serv", n:"خدمات", kt:"4", panels:[
 /* العناصرُ الإنشائيةُ: مقاسُها من المهندسِ لا من حساب */
 {id:"stru", n:"إنشائيّ", items:[
  {cmd:"col", n:"عمود", ico:"col", big:1},
  {cmd:"beam", n:"كمرة", ico:"beam", big:1},
  {cmd:"footing", n:"قاعدة", ico:"footing"},
  {cmd:"slab", n:"بلاطة", ico:"slab"}]},
 /* ما يربط منسوبَين: درجٌ وسقف */
 {id:"vert", n:"درج وسقف", items:[
  {cmd:"stair", n:"درج", ico:"stair", big:1},
  {cmd:"roof", n:"سقف", ico:"roof", big:1},
  {cmd:"stairl", n:"درج L", ico:"stair"},
  {cmd:"stairu", n:"درج U", ico:"stair"}]},
 /* مكتبةُ رموزٍ تُمسَح بالعينِ لا تُقرأ — شبكةُ أيقونات */
 {id:"san", n:"صحّية", lib:1, items:[
  {cmd:"wc", n:"كرسي", ico:"wc", sm:1},
  {cmd:"lav", n:"مغسلة", ico:"lav", sm:1},
  {cmd:"bidet", n:"شطّاف", ico:"bidet", sm:1},
  {cmd:"ur", n:"مبولة", ico:"ur", sm:1},
  {cmd:"shower", n:"دُش", ico:"shower", sm:1},
  {cmd:"tub", n:"بانيو", ico:"tub", sm:1},
  {cmd:"sink", n:"مجلى", ico:"sink", sm:1},
  {cmd:"wm", n:"غسّالة", ico:"wm", sm:1},
  {cmd:"fd", n:"صفاية", ico:"fd", sm:1}]},
 /* مكتبةُ رموزِ الكهرباءِ على طبقةِ A-ELEC وحدها */
 {id:"elec", n:"كهرباء", lib:1, items:[
  {cmd:"esoc", n:"فيشة", ico:"soc", sm:1},
  {cmd:"esoc2", n:"فيشة مزدوجة", ico:"soc", sm:1},
  {cmd:"esocw", n:"فيشة محميّة", ico:"soc", sm:1},
  {cmd:"esw1", n:"مفتاح", ico:"sw", sm:1},
  {cmd:"esw2", n:"مفتاح مزدوج", ico:"sw", sm:1},
  {cmd:"eswd", n:"مفتاح باهت", ico:"sw", sm:1},
  {cmd:"elamp", n:"إنارة سقف", ico:"lampc", sm:1},
  {cmd:"elampw", n:"إنارة جدار", ico:"lampw", sm:1},
  {cmd:"espot", n:"سبوت", ico:"spot", sm:1},
  {cmd:"efan", n:"مروحة", ico:"fan", sm:1},
  {cmd:"eexfan", n:"شفّاط", ico:"exfan", sm:1},
  {cmd:"eac", n:"مكيّف", ico:"acu", sm:1},
  {cmd:"edb", n:"لوحة توزيع", ico:"db", sm:1},
  {cmd:"etel", n:"هاتف/شبكة", ico:"telp", sm:1},
  {cmd:"etv", n:"تلفاز", ico:"tvp", sm:1}]},
 /* مكتبةُ الأثاثِ على طبقةِ A-FURN وحدها */
 {id:"furn", n:"أثاث", lib:1, items:[
  {cmd:"fbed2", n:"سرير مزدوج", ico:"bed", sm:1},
  {cmd:"fbed1", n:"سرير مفرد", ico:"bed", sm:1},
  {cmd:"fwardr", n:"خزانة ملابس", ico:"wardr", sm:1},
  {cmd:"fsofa3", n:"كنبة ثلاثة", ico:"sofa", sm:1},
  {cmd:"fsofa2", n:"كنبة مقعدين", ico:"sofa", sm:1},
  {cmd:"fchair", n:"كرسي", ico:"chairf", sm:1},
  {cmd:"ftable", n:"طاولة", ico:"tabl", sm:1},
  {cmd:"ftablec", n:"طاولة دائرية", ico:"tablc", sm:1},
  {cmd:"fdesk", n:"مكتب", ico:"desk", sm:1},
  {cmd:"fkcab", n:"خزانة مطبخ", ico:"wardr", sm:1},
  {cmd:"ffridge", n:"ثلاجة", ico:"fridge", sm:1},
  {cmd:"fstove", n:"بوتاجاز", ico:"stove", sm:1}]}
]},

/* ── عرض ── */
{id:"view", n:"عرض", kt:"5", panels:[
 /* ما يُظهِر ويُخفي: طبقاتٌ وطوابق */
 {id:"lays", n:"طبقات ومستويات", dlg:"lays", items:[
  {act:"laysDlg", n:"مدير الطبقات", ico:"layers", big:1},
  {act:"levelMgrDlg", n:"إدارة الطوابق", ico:"layers", big:1},
  {act:"lAll", n:"أظهر الكل", ico:"grid"},
  {act:"lUnlock", n:"افتح المقفل", ico:"unlock"}]},
 /* ما يغيّر الرؤيةَ لا البيان */
 {id:"look", n:"مناظر ومجسَّم", dlg:"proj", items:[
  {act:"view3dDlg", n:"عرض ثلاثي", ico:"cube", big:1},
  {act:"fit", n:"ملاءمة", ico:"fit", big:1},
  {act:"clean", n:"شاشة نظيفة", ico:"clean"},
  {act:"presenter", n:"وضع العرض", ico:"cmdl"},
  {tog:"#oJoins", n:"دمج الأركان", ico:"weld"},
  {tog:"#oSolo", n:"أعمدة مستقلّة", ico:"col"}]},
 /* الواجهةُ والمقطعُ: رؤيةٌ أخرى للمبنى نفسِه */
 {id:"gen", n:"واجهات ومقاطع", items:[
  {cmd:"elev", n:"واجهة", ico:"elev", big:1},
  {cmd:"section", n:"مقطع", ico:"section", big:1}]},
 /* مساعداتُ الرسمِ — مفاتيحُ حالٍ تُمسَح بالعين */
 {id:"aids", n:"التقاط وشبكة", items:[
  {tog:"[data-rb=\"ortho\"]", n:"تعامد", ico:"ortho", sm:1},
  {tog:"[data-rb=\"polar\"]", n:"قطبي", ico:"polar", sm:1},
  {tog:"[data-rb=\"snap\"]", n:"التقاط", ico:"osnap", sm:1},
  {tog:"[data-rb=\"grips\"]", n:"مقابض", ico:"grips", sm:1},
  {tog:"[data-rb=\"ends\"]", n:"أطراف", ico:"ends", sm:1},
  {tog:"[data-rb=\"grid\"]", n:"الشبكة", ico:"grid", sm:1},
  {tog:"[data-rb=\"gsnap\"]", n:"خطوة الشبكة", ico:"gsnap", sm:1},
  {tog:"[data-rb=\"paths\"]", n:"المسارات", ico:"paths", sm:1},
  {tog:"[data-rb=\"dyn\"]", n:"إدخال حركي", ico:"dyn", sm:1},
  {act:"osPop", n:"أنماط الالتقاط", ico:"osnap"}]},
 /* ما يُرى في الورقةِ لا على الشاشة */
 {id:"plot", n:"الورقة والتخطيط", items:[
  {act:"stSheet", n:"الورقة", ico:"sheet"},
  {act:"stPlots", n:"طباعة فقط", ico:"print"},
  {act:"stLock", n:"قفل التخطيط", ico:"lock"}]}
]},

/* ── إخراج ── */
{id:"out", n:"إخراج", kt:"6", panels:[
 /* الورقةُ وتنقُّلُها */
 {id:"sht", n:"أوراق", dlg:"sheet", items:[
  {act:"sheetDlg", n:"الورقة والعنوان", ico:"sheet", big:1},
  {cmd:"addsheet", n:"ورقة جديدة", ico:"sheet"},
  {cmd:"prevsheet", n:"السابقة", ico:"undo"},
  {cmd:"nextsheet", n:"التالية", ico:"redo"},
  {cmd:"renamesheet", n:"أعِد التسمية", ico:"sheet"},
  {cmd:"delsheet", n:"حذف ورقة", ico:"del"},
  {act:"shCenter", n:"تمركز على الرسم", ico:"fit"}]},
 /* ما يُقتطَع من الرسمِ إلى الورقة */
 {id:"vp", n:"منافذ وتفصيلات", items:[
  {cmd:"vport", n:"منفذ ورقة", ico:"fit", big:1},
  {cmd:"vpclip", n:"قص المنفذ", ico:"vpclip"},
  {cmd:"detail", n:"وسم تفصيلة", ico:"detail"}]},
 /* ما يخرج ملفّاً */
 {id:"exp", n:"التصدير", dlg:"export", items:[
  {act:"xDxf", n:"DXF", ico:"dxf", big:1},
  {act:"xSvg", n:"SVG", ico:"svg", big:1},
  {act:"xPng", n:"PNG", ico:"png"},
  {act:"xPdf", n:"PDF", ico:"pdf"},
  {act:"asCsv", n:"مساحات CSV", ico:"csv"},
  {act:"osCsv", n:"فتحات CSV", ico:"csv"}]},
 /* ما يخرج رقماً: حصرٌ وتسعيرٌ وجداولُ مصدر */
 {id:"qty", n:"حصر وتسعير", items:[
  {act:"pricingDlg", n:"التسعير", ico:"boq", big:1},
  {cmd:"boq", n:"جدول الكميات", ico:"boq", big:1},
  {cmd:"boqlvl", n:"حصر كل طابق", ico:"levels"},
  {cmd:"report", n:"تقرير العميل", ico:"report"},
  {act:"schedDlg", n:"جدول المساحات", ico:"table"},
  {act:"oschedDlg", n:"جدول الفتحات", ico:"table"}]},
 /* آخرُ ما يُفعَل قبل التسليم */
 {id:"hand", n:"فحص وتسليم", dlg:"insp", items:[
  {act:"inspect", n:"افحص", ico:"inspect", big:1},
  {act:"gateDlg", n:"بوابة التسليم", ico:"inspect", big:1},
  {act:"cleanupDlg", n:"تنظيف المشروع", ico:"clear"},
  {act:"dedupDlg", n:"مسح التكرار", ico:"copy"}]}
]},

/* ── إدارة ── */
{id:"mng", n:"إدارة", kt:"7", panels:[
 /* ضبطُ المشروعِ لا ضبطُ البرنامج */
 {id:"set", n:"الإعدادات", dlg:"proj", items:[
  {act:"projDlg", n:"إعداد المشروع", ico:"props", big:1},
  {act:"styleMgrDlg", n:"أنماط الرسم", ico:"props", big:1},
  {act:"defsDlg", n:"افتراضات الأدوات", ico:"shell", big:1}]},
 /* الملفُّ ونسختُه الخارجية */
 {id:"fil", n:"الملفّ", items:[
  {act:"fnew", n:"جديد", ico:"fnew", big:1},
  {act:"xOpen", n:"افتح", ico:"open", big:1},
  {act:"xSave", n:"احفظ", ico:"save", big:1},
  {act:"bkTog", n:"نسخة خارجية", ico:"save"}]},
 /* مُفتتِحاتُ اللوحات — تُجمَع في المرحلةِ ٥ في لوحةٍ واحدة */
 {id:"pan", n:"اللوحات", items:[
  {act:"propsDlg", n:"الخصائص", ico:"panel"},
  {act:"inspDlg", n:"الفاحص", ico:"inspect"},
  {act:"refDlg", n:"المرجع", ico:"ref"},
  {act:"stateDlg", n:"الحالة", ico:"grid"},
  {act:"aiDlg", n:"المساعد", ico:"ai"},
  {act:"histTog", n:"سجلّ التاريخ", ico:"info"}]},
 /* أسطحُ العملِ والإرساء */
 {id:"ws", n:"الأسطح والإرساء", items:[
  {act:"wsMenu", n:"أسطح العمل", ico:"ws", big:1},
  {act:"wsArch", n:"معماري", ico:"wall"},
  {act:"wsAnnot", n:"تأشير", ico:"dim"},
  {act:"wsOut", n:"إخراج", ico:"xport"},
  {act:"dockAutoS", n:"إخفاء العمود الأيمن", ico:"autohide"},
  {act:"dockTabS", n:"تبويبات الأيمن", ico:"tabs"},
  {act:"dockAutoE", n:"إخفاء العمود الأيسر", ico:"autohide"},
  {act:"dockTabE", n:"تبويبات الأيسر", ico:"tabs"}]},
 /* الماكرو والسجلُّ وصيانةُ التحديد */
 {id:"mac", n:"ماكرو وسجلّ وصيانة", dlg:"defs", items:[
  {cmd:"macrorec", n:"تسجيل / إيقاف", ico:"save", big:1},
  {cmd:"macroplay", n:"شغّل…", ico:"redo"},
  {cmd:"macrolist", n:"القائمة", ico:"copy"},
  {cmd:"macrodel", n:"احذف…", ico:"del"},
  {cmd:"jrreplay", n:"أعد السجلّ", ico:"redo"},
  {cmd:"jrcopy", n:"انسخ السجلّ", ico:"copy"},
  {cmd:"jrclear", n:"امسح السجلّ", ico:"del"},
  {cmd:"sel", n:"تحديد بالمعرّف", ico:"selid"},
  {cmd:"del", n:"حذف", ico:"del"}]}
]}
];

/* ═══ التبويبات السياقية ═══
   تظهر عند تحديدٍ متجانس، وتزول بزواله. أوامرها هي أوامر النوع
   لا أكثر — فلا يظهر «إزاحة» عند تحديد بُعد. */
const CTX_COMMON=(kind)=>({id:"ctx-act", n:"المحدَّد", items:[
 {act:"propsDlg",n:"الخصائص",ico:"props",big:1},
 {act:"delSel",  n:"حذف",    ico:"del",  big:1}]});

export const CTX={
 wall:{n:"جدار", panels:[
  {id:"cw1", n:"تعديل الجدار", items:[
   {cmd:"offset",n:"إزاحة",ico:"offset",big:1},
   {cmd:"weld",  n:"لحم",  ico:"weld",  big:1},
   {cmd:"chamfer",n:"كسر الركن",ico:"chamfer",big:1},
   {cmd:"fillet", n:"استدارة الركن",ico:"fillet",big:1},
   G({cmd:"break", n:"قطع",  ico:"brk"},
     {cmd:"divide",n:"قسمة", ico:"divide"},
     {cmd:"trim",  n:"قصّ",   ico:"trim"}),
   G({cmd:"extend", n:"تمديد",ico:"extend"},
     {cmd:"stretch",n:"شدّ",   ico:"stretch"},
     {cmd:"match",  n:"مطابقة",ico:"match"})]},
  {id:"cw2", n:"فتحات عليه", items:[
   G({cmd:"door",n:"باب", ico:"door"},
     {cmd:"win", n:"شباك",ico:"window"},
     {cmd:"niche",n:"كوّة",ico:"niche"})]},
  CTX_COMMON("wall")]},

 open:{n:"فتحة", panels:[
  {id:"co1", n:"الفتحة", items:[
   {cmd:"match",n:"مطابقة",ico:"match",big:1},
   G({act:"oschedDlg",n:"جدول الفتحات",ico:"table"},
     {act:"osCsv",    n:"CSV",          ico:"csv"})]},
  CTX_COMMON("open")]},

 area:{n:"منطقة", panels:[
  {id:"ca1", n:"المنطقة", items:[
   {cmd:"arearef",n:"تحديث",ico:"arearef",big:1},
   G({act:"nameSeq", n:"سمِّ بالتسلسل",  ico:"renum"},
     {act:"schedDlg",n:"جدول المساحات",ico:"table"},
     {act:"asCsv",   n:"CSV",           ico:"csv"})]},
  CTX_COMMON("area")]},

 dim:{n:"بُعد", panels:[
  {id:"cd1", n:"البُعد", items:[
   {cmd:"match",     n:"مطابقة",           ico:"match",big:1},
   {act:"clrDimTxt", n:"امسح النصّ البديل", ico:"del"}]},
  CTX_COMMON("dim")]},

 chain:{n:"سلسلة", panels:[
  {id:"cc1", n:"السلسلة", items:[
   {cmd:"chaincmp",n:"قارن بالهندسة",ico:"chaincmp",big:1}]},
  CTX_COMMON("chain")]},

 anno:{n:"تأشير", panels:[
  {id:"ct1", n:"التأشير", items:[
   {cmd:"match",n:"مطابقة",ico:"match",big:1}]},
  CTX_COMMON("anno")]},

 col:{n:"عمود", panels:[
  {id:"ck1", n:"العمود", items:[
   {cmd:"match",      n:"مطابقة",     ico:"match",big:1},
   {act:"renumCols",  n:"أعد الترقيم", ico:"renum"},
   G({cmd:"array",     n:"مصفوفة",       ico:"array"},
     {cmd:"arraypolar",n:"مصفوفة قطبية", ico:"arraypol"},
     {cmd:"arraypath", n:"مصفوفة على مسار",ico:"arraypath"},
     {cmd:"align",     n:"تسوية",        ico:"align"},
     {cmd:"pedit",     n:"تحرير الخطّ",   ico:"pedit"})]},
  CTX_COMMON("col")]},

 fix:{n:"أداة صحية", panels:[
  {id:"cf1", n:"الأداة", items:[
   {cmd:"match",   n:"مطابقة",             ico:"match",big:1},
   {act:"fixSnap", n:"ألصِق بأقرب جدار",    ico:"weld"}]},
  CTX_COMMON("fix")]},

 stair:{n:"درج", panels:[
  {id:"cs1", n:"الدرج", items:[
   {cmd:"match",n:"مطابقة",ico:"match",big:1}]},
  CTX_COMMON("stair")]},

 /* ═══ المرحلة ٢ من خطّة الواجهة ═══ audit/10-ui-plan.md
    العيبُ المقيس: السياقيُّ كان يغطّي ٩ من ١٥ نوعاً، وأربعةٌ من
    الستّةِ الناقصةِ أُضيفت حديثاً — فالعيبُ **يتفاقم** مع كلِّ ميزة.
    تُحدِّد بلاطةً أو كمرةً أو سحابةً فلا تجد لوحةً، فتظنّ أنّ المشروعَ
    ناقصٌ وهو ليس كذلك.

    وكلُّ لوحةٍ أدناه تحمل أفعالاً **حقيقيةً لنوعها** لا حشواً:
    `match` يُدرَج فقط حيث للنوعِ خصائصُ تُنسَخ، والمصفوفاتُ فقط حيث
    يُعقَل تكرارُه. ولوحةٌ فيها زرٌّ لا معنى له أسوأُ من لا لوحة:
    تُعلِّم المستخدمَ أنّ الموضعَ لا يُقرَأ. */

 /* الخطُّ المتعدّد: تحريرُ عقَدِه هو كلُّ ما يُطلَب منه — وهو الأداةُ
    التي أُضيفت للتوِّ (§٣/١٠) ولم يكن لها مدخلٌ سياقيّ. */
 pline:{n:"خطّ متعدّد", panels:[
  {id:"cpl1", n:"الخطّ", items:[
   {cmd:"pedit", n:"حرّر العقَد", ico:"pedit", big:1},
   {cmd:"arraypath",n:"مصفوفة على مساره",ico:"arraypath",big:1},
   G({cmd:"vpclip",n:"اجعله حدَّ منفذ",ico:"vpclip"},
     {cmd:"hatch", n:"تهشير",          ico:"hatch"})]},
  CTX_COMMON("pline")]},

 /* سحابةُ المراجعة: لا خصائصَ تُنسَخ ولا تكرارَ يُعقَل — الحذفُ
    والخصائصُ وحدَهما، مع جارتِها في المعنى (وسمُ المراجعة). */
 cloud:{n:"سحابة مراجعة", panels:[
  {id:"ccl1", n:"المراجعة", items:[
   {cmd:"cloud", n:"سحابةٌ أخرى", ico:"cloud", big:1},
   {cmd:"detail",n:"وسم تفصيلة",  ico:"detail"}]},
  CTX_COMMON("cloud")]},

 /* السقف: `match` مفيدٌ (ميلٌ وسماكةٌ تُنسَخ)، والواجهاتُ والمقاطعُ
    هي ما يُطلَب بعد رسمِه. */
 roof:{n:"سقف", panels:[
  {id:"crf1", n:"السقف", items:[
   {cmd:"match", n:"مطابقة", ico:"match", big:1},
   G({cmd:"elev",   n:"واجهة", ico:"elev"},
     {cmd:"section",n:"مقطع",  ico:"section"})]},
  CTX_COMMON("roof")]},

 /* الحقلُ الحيُّ: قيمتُه مُشتقّةٌ فلا تُنسَخ ولا تُكرَّر — والتحديثُ
    هو فعلُه الوحيدُ الحقيقيّ. */
 live:{n:"حقل حيّ", panels:[
  {id:"clv1", n:"الحقل", items:[
   {cmd:"liverefresh",n:"حدّث الحقول", ico:"arearef", big:1},
   {cmd:"livetext",   n:"حقلٌ آخر",    ico:"live"}]},
  CTX_COMMON("live")]},

 /* الجدول: صفوفُه حيّةٌ (لا نسخةَ مخزَّنة)، فالمفيدُ هو جداولُ
    المصدرِ وتصديرُها — ومفتاحُ الرسمِ نوعٌ ثالثٌ منه. */
 table:{n:"جدول", panels:[
  {id:"ctb1", n:"الجدول", items:[
   {cmd:"table", n:"جدولٌ آخر", ico:"table", big:1},
   G({act:"schedDlg", n:"جدول المساحات",ico:"table"},
     {act:"oschedDlg",n:"جدول الفتحات", ico:"table"},
     {act:"asCsv",    n:"مساحات CSV",   ico:"csv"},
     {act:"osCsv",    n:"فتحات CSV",    ico:"csv"})]},
  CTX_COMMON("table")]},

 /* العنصرُ الإنشائيّ: `match` ينسخ المقطعَ، والمصفوفاتُ هي عملُه
    اليوميُّ (كمراتٌ متوازيةٌ · قواعدُ تحت شبكةِ أعمدة)، والحصرُ
    يقرأ حجمَه. */
 struct:{n:"عنصر إنشائيّ", panels:[
  {id:"cst1", n:"العنصر", items:[
   {cmd:"match", n:"مطابقة", ico:"match", big:1},
   G({cmd:"array",     n:"مصفوفة",         ico:"array"},
     {cmd:"arraypath", n:"مصفوفة على مسار",ico:"arraypath"},
     {cmd:"align",     n:"تسوية",          ico:"align"},
     {cmd:"scale",     n:"مقياس",          ico:"scale"}),
   G({act:"schedDlg",n:"جدول الكميّات",ico:"table"},
     {cmd:"boq",     n:"حصر",            ico:"boq"})]},
  CTX_COMMON("struct")]},

 /* ═══ مثيلُ الكتلة ═══ (1.1.0 · ج) — صار كياناً فله لوحتُه */
 blk:{n:"كتلة", panels:[
  {id:"cbk1", n:"الكتلة", items:[
   {cmd:"explode", n:"تفكيك",  ico:"explode",big:1},
   {cmd:"match",   n:"مطابقة", ico:"match",  big:1},
   G({cmd:"rotate",    n:"دوران",          ico:"rotate"},
     {cmd:"mirror",    n:"مرآة",           ico:"mirror"},
     {cmd:"scale",     n:"مقياس",          ico:"scale"}),
   G({cmd:"array",     n:"مصفوفة",         ico:"array"},
     {cmd:"arraypath", n:"مصفوفة على مسار",ico:"arraypath"},
     {cmd:"align",     n:"تسوية",          ico:"align"})]},
  CTX_COMMON("blk")]}
};

/* ═══ شريط الوصول السريع ═══ */
export const QAT=[
 {act:"fnew", n:"جديد", ico:"fnew"},
 {act:"xOpen",n:"افتح", ico:"open"},
 {act:"xSave",n:"احفظ", ico:"save"},
 {act:"xPdf", n:"طبع PDF",ico:"print"},
 {sep:1},
 {act:"undo",n:"تراجع", ico:"undo"},
 {act:"redo",n:"إعادة", ico:"redo"},
 {sep:1},
 {act:"fit",  n:"ملاءمة",ico:"fit"},
 {act:"inspect",n:"افحص",ico:"inspect"},
 {sep:1},
 {act:"learn",n:"الواجهة التعليمية",ico:"learn"}
];

/* ═══ استخلاصٌ للفحص الساكن ═══ */
const walk=(items,fn)=>(items||[]).forEach(it=>{
 if(it.group)walk(it.group,fn); else fn(it);
});
export function allItems(){
 const out=[];
 const tabs=RIBBON.concat(Object.keys(CTX).map(k=>CTX[k]));
 tabs.forEach(t=>(t.panels||[]).forEach(p=>walk(p.items,i=>out.push(i))));
 walk(QAT,i=>{if(!i.sep)out.push(i)});
 return out;
}
/* ═══ بيتُ الأداة ═══ المرحلة ١ من خطّة الواجهة (audit/10-ui-plan.md)
   العيبُ المقيسُ: ٨١٪ من عناصرِ الشريطِ وراءَ منسدلة. فالمستخدمُ
   الذي **يعرف** أنّ الأداةَ موجودةٌ يظلُّ ينقر مجموعاتٍ ليجدها.

   ولوحةُ الأوامرِ (`palette.js`) تجدها بالكتابةِ في لحظة — لكنّها
   كانت تُنفِّذ ولا **تُعلِّم**: تكتب «استدارة» فتعمل الأداةُ ولا تعرف
   أين هي، فتعود إلى البحثِ في المرّة القادمةِ أبداً.

   `homeOf` تُعيد المسارَ المقروءَ «تبويب ◂ لوح»، فاللوحةُ تعرضه مع
   كلِّ نتيجة. والنتيجة: البحثُ يُنفِّذ **ويُعلِّم موضعَها** — فمن
   أراد السرعةَ بحث، ومن أراد التعلُّمَ وجد الطريق.

   والسياقيُّ يُعلَن سياقياً صراحةً (لا «تبويب ◂ لوح»): هو ليس بيتاً
   بل اختصارٌ لحظيٌّ لما هو محدَّد — وخلطُه بالبيتِ يُوهِم أنّ الأداةَ
   هناك دائماً. وما لا بيتَ له يُعاد `null` لا سلسلةً فارغة: الفرقُ
   بين «لا أعرف» و«بلا بيت» يُقرأ في الحارس. */
let HOME=null;
function buildHome(){
 const m=new Map();
 const put=(k,v)=>{if(k&&!m.has(k))m.set(k,v)};
 RIBBON.forEach(t=>(t.panels||[]).forEach(p=>{
  walk(p.items,i=>{
   const key=i.cmd||i.act;
   if(key)put(key,{tab:t.id,tabName:t.n,panel:p.id,
    panelName:p.n,path:`${t.n} ◂ ${p.n}`,ctx:0,kt:t.kt||""});
  });
 }));
 /* السياقيُّ بعد الشريطِ: فأداةٌ لها بيتٌ ثابتٌ تُعرَف به، والسياقيةُ
    وحدَها تُعرَف سياقاً. و`put` لا تكتب فوق موجودٍ لهذا السبب. */
 Object.keys(CTX).forEach(k=>{
  const t=CTX[k];
  (t.panels||[]).forEach(p=>walk(p.items,i=>{
   const key=i.cmd||i.act;
   if(key)put(key,{tab:"ctx:"+k,tabName:t.n,panel:p.id,
    panelName:p.n,path:`سياقيّ: ${t.n}`,ctx:1,kt:""});
  }));
 });
 walk(QAT,i=>{
  const key=i.cmd||i.act;
  if(key&&!i.sep)put(key,{tab:"qat",tabName:"وصولٌ سريع",panel:"qat",
   panelName:"وصولٌ سريع",path:"وصولٌ سريع",ctx:0,kt:""});
 });
 /* وقائمةُ التطبيقِ آخراً: فما له زرٌّ في الشريطِ يُعرَف بزرِّه، وما
    لا زرَّ له يُعرَف بالقائمةِ — لا العكس. */
 HOME_MENU.forEach(k=>put(k,{tab:"appmenu",tabName:"قائمةُ التطبيق",
  panel:"appmenu",panelName:"قائمةُ التطبيق",
  path:"قائمةُ التطبيق",ctx:0,kt:""}));
 return m;
}
/* ═══ بيوتٌ معلَنةٌ خارجَ الشريط ═══
   أدواتٌ مدخلُها لوحةٌ أو نافذةٌ لا زرُّ شريط. تُعلَن هنا **بنصِّ
   الموضعِ** لا بـnull: المستخدمُ يسأل «أين هي؟» فالجوابُ «في لوحة
   العناصر» أنفعُ من صمت. والحارسُ يفرض أن تكون المجموعةُ مضبوطةً:
   لا أداةَ بلا بيتٍ ولا مدخلَ معلَنٌ لأداةٍ صار لها زرٌّ (فيُحذَف). */
export const HOME_ELSEWHERE={
 mkblock:"لوحة العناصر ◂ زرّ +",
 ulcal:"لوحة الصورة المرجعية ◂ معايرة بنقطتين",
 tour:"نافذة الترحيب ◂ جولة سريعة",
 view:"شريط المناظر ◂ القائمة",
 viewsave:"شريط المناظر ◂ احفظ المنظر",
 viewdel:"شريط المناظر ◂ احذف منظراً"};
/* ═══ قائمةُ التطبيقِ بيتٌ معلَنٌ ═══ المرحلة ٤
   ضبطُ البرنامجِ نُقِل إليها (انظر `appmenu.js`)، فلا بدَّ أن يعرفها
   `homeOf` وإلّا صارت هذه الأفعالُ «بلا بيتٍ» وسقط حارسُ الوصول.
   وتُعلَن هنا **بمفاتيحِها** لا بالاستيرادِ: `appmenu` يستورد `wire`
   و`wire` يستورد هذا الملفَّ، فاستيرادُه عكساً دورة. والحارسُ
   `ribbon-shape.test.js` يقابل هذه القائمةَ بـ`ROWS` المعروضةِ فعلاً
   فلا تفترق الواحدةُ عن الأخرى. */
export const HOME_MENU=["shell","theme","density","clean","rbMin",
 "beginner","ribbonEditDlg","qpTog","rclick","cmdMode","cmdFloat",
 "cmdBottom","dRst","perfShow","purgeAll","help","guideDlg","installApp","aboutDlg"];
export function homeOf(key){
 if(!HOME)HOME=buildHome();
 const k=String(key||"");
 const h=HOME.get(k);
 if(h)return h;
 const e=HOME_ELSEWHERE[k];
 if(e)return {tab:"elsewhere",tabName:"مدخلٌ خاصّ",panel:"",
  panelName:"",path:e,ctx:0,kt:"",via:"elsewhere"};
 return null;
}
/* بيتُ أداةٍ تفوّض إلى فعلٍ في الشريط: الفعلُ له بيتٌ فالأداةُ تسكنه.
   و`actOf` تُمرَّر من المُنادي (`appcmds.ACTOF`) فلا يستورد الشريطُ
   الأوامرَ — الاتجاهُ `appcmds → schema` قائمٌ، والعكسُ دورة. */
/* أدواتٌ تُسجَّل في وحدةِ لوحتِها لا في `appcmds`، فلا تمرُّ بـ`act()`
   ولا تدخل `ACTOF`. تُعلَن هنا بفعلِها، والحارسُ يفرض أنّ كلَّ فعلٍ
   منها **زرٌّ قائمٌ في الشريط** — فإن حُذِف الزرُّ سقط البناء. */
export const TOOL_ACT={
 styleMgr:"styleMgrDlg", levelMgr:"levelMgrDlg",
 underlay:"underlayDlg", underlayCtl:"underlayCtlDlg",
 pricing:"pricingDlg", view3d:"view3dDlg"};
export function homeOfTool(key,actOf){
 const h=homeOf(key);
 if(h)return h;
 const a=(actOf&&actOf[String(key||"")])||TOOL_ACT[String(key||"")];
 if(!a)return null;
 const ha=homeOf(a);
 return ha?Object.assign({},ha,{via:"act",act:a}):null;
}
/* يُبطِل الكاشَ — يستعمله محرّرُ الشريط بعد التخصيص */
export const resetHome=()=>{HOME=null};
/* ═══ إحصاءُ الظهور ═══
   كان هذا الحسابُ يُقرأ هدفاً للمرحلةِ ٤ («≥٧٠٪ ظاهر»)، وقد **تبيّن
   بالقياسِ أنّ تسميةَ `inGroup` كانت تُقرأ خطأً «مخفيٌّ وراءَ منسدلة»**
   وليست كذلك: `.rbCol` في `css/ribbon.css` عمودُ flex **ظاهرٌ** بلا
   `display:none` ولا منبثقة. فما كان «٧٢٪ وراءَ منسدلة» كان في
   الحقيقةِ ٧٢٪ **في أعمدةٍ ظاهرة**. التصحيحُ مكتوبٌ في
   audit/10-ui-plan.md §٢، والرقمُ الذي يُقاس عليه اليومَ هو
   `shape()`: ألواحٌ لكلِّ تبويبٍ وعناصرُ مقروءةٌ لكلِّ تبويبٍ وتكرار.
   و`flatPct` بقيَ لأنّ المخطَّطَ الجديدَ بلا أعمدةٍ أصلاً، فقيمتُه
   ١٠٠٪ وحارسٌ يُثبِّتها — لا كهدفٍ بل كمنعٍ للعودة. */
export function ribbonShape(){
 let flat=0, inGroup=0, groups=0, panels=0, lib=0;
 RIBBON.forEach(t=>(t.panels||[]).forEach(p=>{
  panels++; if(p.lib)lib++;
  (p.items||[]).forEach(i=>{
   if(i&&i.group){groups++; inGroup+=i.group.length}
   else if(i&&(i.cmd||i.act||i.tog))flat++;
  });
 }));
 const tot=flat+inGroup;
 return {tabs:RIBBON.length,panels,lib,flat,inGroup,groups,total:tot,
  flatPct:tot?Math.round(flat/tot*1000)/10:0};
}
/* ═══ شكلُ كلِّ تبويبٍ ═══ هو ما تُقاس عليه المرحلةُ ٤ فعلاً.
   و«المقروء» يستثني بلاطاتِ المكتباتِ الصغيرةَ (`sm`) **بسببٍ
   مكتوب**: خمسةَ عشرَ رمزَ كهرباءٍ لا تُقرأ خمسةَ عشرَ نصّاً بل
   تُمسَح شبكةً واحدةً بالعين. فعدُّها عناصرَ مقروءةً يُخرِج لوحاً
   سليماً عن الحدِّ ويدفع إلى إخفاءِ رموزٍ لا سببَ لإخفائها. */
export const RB_MAX_PANELS=5;
export const RB_MAX_READ=30;
export const RB_MAX_LIB=16;
export function tabShape(){
 return RIBBON.map(t=>{
  let read=0, icons=0, maxLib=0;
  (t.panels||[]).forEach(p=>{
   let n=0;
   (p.items||[]).forEach(i=>{
    if(i&&i.group){read+=i.group.length; return}
    if(!i||!(i.cmd||i.act||i.tog))return;
    if(i.sm){icons++; n++} else read++;
   });
   if(n>maxLib)maxLib=n;
  });
  return {id:t.id,n:t.n,panels:(t.panels||[]).length,read,icons,maxLib};
 });
}
/* ═══ التكرارُ في الشريط ═══ قاعدةُ الموضعِ الواحدِ صارت مطلقةً:
   «رئيسي» كان ينسخ ٣٣ أمراً من بيوتِها، وقد حُذِف. وما يُعاد هنا
   مفتاحٌ ومواضعُه — فإن عاد تكرارٌ سقط البناءُ لا نُسِي. */
export function ribbonDups(){
 const seen=new Map();
 RIBBON.forEach(t=>(t.panels||[]).forEach(p=>{
  walk(p.items,i=>{
   const k=i.cmd||i.act||i.tog;
   if(!k)return;
   if(!seen.has(k))seen.set(k,[]);
   seen.get(k).push(`${t.id}/${p.id}`);
  });
 }));
 return [...seen].filter(([,v])=>v.length>1)
  .map(([k,v])=>({key:k,at:v}));
}

export const ribbonCmds=()=>[...new Set(allItems()
 .filter(i=>i.cmd).map(i=>i.cmd))];
export const ribbonActs=()=>[...new Set(allItems()
 .filter(i=>i.act).map(i=>i.act))];
export const ribbonIcons=()=>[...new Set(allItems()
 .filter(i=>i.ico).map(i=>i.ico))];
export const ribbonDlgs=()=>[...new Set([]
 .concat(...RIBBON.map(t=>(t.panels||[]).map(p=>p.dlg)))
 .filter(Boolean))];
export const tabIds=()=>RIBBON.map(t=>t.id);
export const panelIdList=()=>[]
 .concat(...RIBBON.map(t=>(t.panels||[]).map(p=>t.id+"/"+p.id)));
