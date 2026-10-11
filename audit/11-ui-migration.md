# جدولُ هجرةِ الشريط — المرحلة ٤

> **ما يُثبِته هذا الجدول:** أنّ إعادةَ كتابةِ الشريطِ **لم تُسقِط
> مدخلاً واحداً**. كلُّ سطرٍ قرارٌ يُراجَع لا تخمينٌ يُصدَّق، و
> `js/tests/ribbon-shape.test.js` يقابل هذا الجدولَ بالواقعِ **في
> الاتجاهَين**: لا سطرَ بلا مدخلٍ ولا مدخلَ بلا سطر.

**209** مدخلاً: **153** انتقل · **41** بقيَ في موضعه ·
**15** خرج من الشريطِ إلى سطحٍ آخرَ **ببيتٍ معلَن**.

| المفتاح | التسمية | البيتُ القديم | البيتُ الجديد | المقاس |
|---|---|---|---|---|
| `c:wall` | جدار | home/draw | draw/shapes | كبيرة |
| `c:rect` | مستطيل | home/draw | draw/shapes | كبيرة |
| `c:door` | باب | home/draw | draw/opens | كبيرة |
| `c:win` | شباك | home/draw | draw/opens | كبيرة |
| `c:col` | عمود | home/draw | serv/stru | كبيرة |
| `c:beam` | كمرة | home/draw | serv/stru | كبيرة |
| `c:footing` | قاعدة | home/draw | serv/stru | متوسّطة |
| `c:slab` | بلاطة | home/draw | serv/stru | متوسّطة |
| `c:stair` | درج | home/draw | serv/vert | كبيرة |
| `c:area` | منطقة | home/draw | draw/areas | كبيرة |
| `c:opening` | فتحة | home/draw | draw/opens | متوسّطة |
| `c:niche` | كوّة | home/draw | draw/opens | متوسّطة |
| `c:move` | نقل | home/mod | edit/xform | كبيرة |
| `c:copy` | نسخ | home/mod | edit/xform | كبيرة |
| `c:rotate` | دوران | home/mod | edit/xform | متوسّطة |
| `c:mirror` | مرآة | home/mod | edit/xform | متوسّطة |
| `c:scale` | مقياس | home/mod | edit/xform | متوسّطة |
| `c:offset` | إزاحة | home/mod | edit/xform | متوسّطة |
| `c:trim` | قصّ | home/mod | edit/ends | متوسّطة |
| `c:extend` | تمديد | home/mod | edit/ends | متوسّطة |
| `c:stretch` | شدّ | home/mod | edit/ends | متوسّطة |
| `c:weld` | لحم | home/mod | edit/ends | متوسّطة |
| `c:divide` | قسمة | home/mod | edit/ends | متوسّطة |
| `c:match` | مطابقة | home/mod | edit/nodes | متوسّطة |
| `c:explode` | تفكيك كتلة | home/mod | edit/nodes | متوسّطة |
| `c:dim` | بُعد | home/ann | annt/dims | كبيرة |
| `c:text` | نصّ | home/ann | annt/txt | كبيرة |
| `c:mtext` | فقرة | home/ann | annt/txt | كبيرة |
| `c:slope` | سهم ميل | home/ann | annt/tbl | كبيرة |
| `c:chain` | سلسلة | home/ann | annt/dims | كبيرة |
| `c:lead` | قائد | home/ann | annt/txt | كبيرة |
| `c:level` | منسوب | home/ann | annt/tbl | كبيرة |
| `c:axis` | محور | home/ann | annt/axg | كبيرة |
| `c:griddim` | أبعاد المحاور | home/ann | annt/axg | متوسّطة |
| `c:measure` | قياس | home/ann | annt/dims | متوسّطة |
| `c:marea` | قياس مساحة | home/ann | annt/dims | متوسّطة |
| `a:inspect` | افحص | home/hand | out/hand | كبيرة |
| `a:xPdf` | PDF | home/hand | out/exp | متوسّطة |
| `a:xSave` | احفظ | home/hand | mng/fil | كبيرة |
| `a:xOpen` | افتح | home/hand | mng/fil | كبيرة |
| `a:undo` | تراجع | home/hand | وصول سريع | — |
| `a:redo` | إعادة | home/hand | وصول سريع | — |
| `a:fit` | ملاءمة | home/hand | view/look | كبيرة |
| `a:help` | مساعدة | home/hand | سياقيّ | — |
| `c:arcwall` | جدار قوسي | arch/walls | draw/shapes | كبيرة |
| `c:pline` | خطّ متعدّد | arch/walls | draw/free | كبيرة |
| `c:sketch` | خربشة | arch/walls | draw/free | كبيرة |
| `c:chamfer` | كسر الركن | arch/wedit | edit/ends | كبيرة |
| `c:fillet` | استدارة الركن | arch/wedit | edit/ends | كبيرة |
| `c:break` | قطع | arch/wedit | edit/ends | متوسّطة |
| `c:array` | مصفوفة | arch/wedit | edit/arr | كبيرة |
| `c:arraypolar` | مصفوفة قطبية | arch/wedit | edit/arr | متوسّطة |
| `c:arraypath` | مصفوفة على مسار | arch/wedit | edit/arr | متوسّطة |
| `c:align` | تسوية | arch/wedit | edit/arr | متوسّطة |
| `c:pedit` | تحرير الخطّ | arch/wedit | edit/nodes | كبيرة |
| `c:fixed` | شباك ثابت | arch/opens | draw/opens | متوسّطة |
| `c:arch` | مقنطرة | arch/opens | draw/opens | متوسّطة |
| `c:stairl` | درج L | arch/parts | serv/vert | متوسّطة |
| `c:stairu` | درج U | arch/parts | serv/vert | متوسّطة |
| `c:roof` | سقف | arch/parts | serv/vert | كبيرة |
| `c:wc` | كرسي | arch/fixt | serv/san | صغيرة |
| `c:lav` | مغسلة | arch/fixt | serv/san | صغيرة |
| `c:bidet` | شطّاف | arch/fixt | serv/san | صغيرة |
| `c:shower` | دُش | arch/fixt | serv/san | صغيرة |
| `c:tub` | بانيو | arch/fixt | serv/san | صغيرة |
| `c:fd` | صفاية | arch/fixt | serv/san | صغيرة |
| `c:sink` | مجلى | arch/fixt | serv/san | صغيرة |
| `c:wm` | غسّالة | arch/fixt | serv/san | صغيرة |
| `c:ur` | مبولة | arch/fixt | serv/san | صغيرة |
| `c:fbed2` | سرير مزدوج | arch/furn | serv/furn | صغيرة |
| `c:fbed1` | سرير مفرد | arch/furn | serv/furn | صغيرة |
| `c:fwardr` | خزانة ملابس | arch/furn | serv/furn | صغيرة |
| `c:fsofa3` | كنبة ثلاثة | arch/furn | serv/furn | صغيرة |
| `c:fsofa2` | كنبة مقعدين | arch/furn | serv/furn | صغيرة |
| `c:fchair` | كرسي | arch/furn | serv/furn | صغيرة |
| `c:ftable` | طاولة | arch/furn | serv/furn | صغيرة |
| `c:ftablec` | طاولة دائرية | arch/furn | serv/furn | صغيرة |
| `c:fdesk` | مكتب | arch/furn | serv/furn | صغيرة |
| `c:fkcab` | خزانة مطبخ | arch/furn | serv/furn | صغيرة |
| `c:ffridge` | ثلاجة | arch/furn | serv/furn | صغيرة |
| `c:fstove` | بوتاجاز | arch/furn | serv/furn | صغيرة |
| `c:esoc` | فيشة | arch/elec | serv/elec | صغيرة |
| `c:esoc2` | فيشة مزدوجة | arch/elec | serv/elec | صغيرة |
| `c:esocw` | فيشة محميّة | arch/elec | serv/elec | صغيرة |
| `c:esw1` | مفتاح | arch/elec | serv/elec | صغيرة |
| `c:esw2` | مفتاح مزدوج | arch/elec | serv/elec | صغيرة |
| `c:eswd` | مفتاح باهت | arch/elec | serv/elec | صغيرة |
| `c:elamp` | إنارة سقف | arch/elec | serv/elec | صغيرة |
| `c:elampw` | إنارة جدار | arch/elec | serv/elec | صغيرة |
| `c:espot` | سبوت | arch/elec | serv/elec | صغيرة |
| `c:efan` | مروحة | arch/elec | serv/elec | صغيرة |
| `c:eexfan` | شفّاط | arch/elec | serv/elec | صغيرة |
| `c:eac` | مكيّف | arch/elec | serv/elec | صغيرة |
| `c:edb` | لوحة توزيع | arch/elec | serv/elec | صغيرة |
| `c:etel` | هاتف/شبكة | arch/elec | serv/elec | صغيرة |
| `c:etv` | تلفاز | arch/elec | serv/elec | صغيرة |
| `c:arearef` | تحديث | arch/areas | draw/areas | متوسّطة |
| `c:hatch` | تهشير | arch/areas | draw/areas | متوسّطة |
| `c:group` | تجميع | arch/grp | edit/grp | كبيرة |
| `c:gselect` | تحديد مجموعة | arch/grp | edit/grp | متوسّطة |
| `c:gmove` | تحريك مجموعة | arch/grp | edit/grp | متوسّطة |
| `c:ungroup` | فكّ تجميع | arch/grp | edit/grp | كبيرة |
| `c:roomdim` | أبعاد الغرفة | annt/dims | annt/dims | متوسّطة |
| `c:chaincmp` | قارن السلسلة | annt/dims | annt/dims | متوسّطة |
| `c:dimrad` | نصف قطر | annt/dims | annt/dims | متوسّطة |
| `c:dimdia` | قطر | annt/dims | annt/dims | متوسّطة |
| `c:dimang` | زاوي | annt/dims | annt/dims | متوسّطة |
| `c:livetext` | حقل حيّ | annt/txt | annt/txt | متوسّطة |
| `c:liverefresh` | تحديث الحقول | annt/txt | annt/txt | متوسّطة |
| `c:cloud` | سحابة مراجعة | annt/rev | annt/rev | كبيرة |
| `c:cloude` | سحابة حول التحديد | annt/rev | annt/rev | كبيرة |
| `a:rImp` | استورد DXF | ins/ref | draw/ref | كبيرة |
| `a:underlayDlg` | صورة مرجعية | ins/ref | draw/ref | كبيرة |
| `a:underlayCtlDlg` | ضبط الصورة | ins/ref | draw/ref | متوسّطة |
| `c:refalign` | محاذاة | ins/ref | draw/ref | متوسّطة |
| `c:refcal` | معايرة | ins/ref | draw/ref | متوسّطة |
| `c:refmove` | نقل | ins/ref | draw/ref | متوسّطة |
| `a:rRst` | صفّر التحويل | ins/ref | draw/ref | متوسّطة |
| `a:rClr` | أزِل المرجع | ins/ref | draw/ref | متوسّطة |
| `a:schedDlg` | جدول المساحات | ins/data | out/qty | متوسّطة |
| `a:oschedDlg` | جدول الفتحات | ins/data | out/qty | متوسّطة |
| `c:table` | ضَع جدولاً | ins/data | annt/tbl | كبيرة |
| `c:gridcols` | أعمدة المحاور | ins/axg | annt/axg | متوسّطة |
| `a:axClr` | امسح المحاور | ins/axg | annt/axg | متوسّطة |
| `a:clean` | شاشة نظيفة | view/nav | view/look | متوسّطة |
| `a:presenter` | وضع العرض | — (جديد 1.1.0) | view/look | متوسّطة |
| `a:rbMin` | اطوِ الشريط | view/nav | قائمة التطبيق | — |
| `a:theme` | السِّمة | view/nav | قائمة التطبيق | — |
| `a:density` | الكثافة | view/nav | قائمة التطبيق | — |
| `a:shell` | القشرة | view/nav | قائمة التطبيق | — |
| `a:beginner` | وضع المبتدئ | view/nav | قائمة التطبيق | — |
| `a:ribbonEditDlg` | تخصيص الشريط | view/nav | قائمة التطبيق | — |
| `t:[data-rb="ortho"]` | تعامد | view/aids | view/aids | صغيرة |
| `t:[data-rb="polar"]` | قطبي | view/aids | view/aids | صغيرة |
| `t:[data-rb="snap"]` | التقاط | view/aids | view/aids | صغيرة |
| `t:[data-rb="grips"]` | مقابض | view/aids | view/aids | صغيرة |
| `t:[data-rb="ends"]` | أطراف | view/aids | view/aids | صغيرة |
| `a:osPop` | أنماط الالتقاط | view/aids | view/aids | متوسّطة |
| `t:[data-rb="grid"]` | الشبكة | view/aids | view/aids | صغيرة |
| `t:[data-rb="gsnap"]` | خطوة الشبكة | view/aids | view/aids | صغيرة |
| `t:[data-rb="paths"]` | المسارات | view/aids | view/aids | صغيرة |
| `a:stSheet` | الورقة | view/aids | view/plot | متوسّطة |
| `a:stPlots` | طباعة فقط | view/aids | view/plot | متوسّطة |
| `a:stLock` | قفل التخطيط | view/aids | view/plot | متوسّطة |
| `t:[data-rb="dyn"]` | إدخال حركي | view/inp | view/aids | صغيرة |
| `a:qpTog` | خصائص سريعة | view/inp | قائمة التطبيق | — |
| `a:rclick` | الزرّ الأيمن | view/inp | قائمة التطبيق | — |
| `a:cmdMode` | موضع سطر الأوامر | view/inp | قائمة التطبيق | — |
| `a:cmdFloat` | سطر أوامر عائم | view/inp | قائمة التطبيق | — |
| `a:cmdBottom` | أعِده إلى الأسفل | view/inp | قائمة التطبيق | — |
| `t:#oJoins` | دمج الأركان | view/disp | view/look | متوسّطة |
| `t:#oSolo` | أعمدة مستقلّة | view/disp | view/look | متوسّطة |
| `a:view3dDlg` | عرض ثلاثي | view/disp | view/look | كبيرة |
| `a:propsDlg` | الخصائص | view/pan | mng/pan | متوسّطة |
| `a:inspDlg` | الفاحص | view/pan | mng/pan | متوسّطة |
| `a:refDlg` | المرجع | view/pan | mng/pan | متوسّطة |
| `a:stateDlg` | الحالة | view/pan | mng/pan | متوسّطة |
| `a:aiDlg` | المساعد | view/pan | mng/pan | متوسّطة |
| `a:histTog` | سجلّ التاريخ | view/pan | mng/pan | متوسّطة |
| `a:wsMenu` | أسطح العمل | view/dock | mng/ws | كبيرة |
| `a:wsArch` | معماري | view/dock | mng/ws | متوسّطة |
| `a:wsAnnot` | تأشير | view/dock | mng/ws | متوسّطة |
| `a:wsOut` | إخراج | view/dock | mng/ws | متوسّطة |
| `a:dockAutoS` | إخفاء العمود الأيمن | view/dock | mng/ws | متوسّطة |
| `a:dockTabS` | تبويبات الأيمن | view/dock | mng/ws | متوسّطة |
| `a:dockAutoE` | إخفاء العمود الأيسر | view/dock | mng/ws | متوسّطة |
| `a:dockTabE` | تبويبات الأيسر | view/dock | mng/ws | متوسّطة |
| `c:elev` | واجهة | out/gen | view/gen | كبيرة |
| `c:section` | مقطع | out/gen | view/gen | كبيرة |
| `a:sheetDlg` | الورقة والعنوان | out/sht | out/sht | كبيرة |
| `a:shCenter` | تمركز على الرسم | out/sht | out/sht | متوسّطة |
| `c:vport` | منفذ ورقة | out/sht | out/vp | كبيرة |
| `c:vpclip` | قص المنفذ | out/sht | out/vp | متوسّطة |
| `c:detail` | وسم تفصيلة | out/sht | out/vp | متوسّطة |
| `c:addsheet` | ورقة جديدة | out/sht | out/sht | متوسّطة |
| `c:prevsheet` | السابقة | out/sht | out/sht | متوسّطة |
| `c:nextsheet` | التالية | out/sht | out/sht | متوسّطة |
| `c:renamesheet` | أعِد التسمية | out/sht | out/sht | متوسّطة |
| `c:delsheet` | حذف ورقة | out/sht | out/sht | متوسّطة |
| `a:xDxf` | DXF | out/exp | out/exp | كبيرة |
| `a:xSvg` | SVG | out/exp | out/exp | كبيرة |
| `a:xPng` | PNG | out/exp | out/exp | متوسّطة |
| `a:asCsv` | مساحات CSV | out/exp | out/exp | متوسّطة |
| `a:osCsv` | فتحات CSV | out/exp | out/exp | متوسّطة |
| `a:pricingDlg` | التسعير | out/qty | out/qty | كبيرة |
| `c:boq` | جدول الكميات | out/qty | out/qty | كبيرة |
| `c:boqlvl` | حصر كل طابق | out/qty | out/qty | متوسّطة |
| `c:report` | تقرير العميل | out/qty | out/qty | متوسّطة |
| `a:fnew` | جديد | out/fil | mng/fil | كبيرة |
| `a:bkTog` | نسخة خارجية | out/fil | mng/fil | متوسّطة |
| `a:laysDlg` | مدير الطبقات | mng/laym | view/lays | كبيرة |
| `a:lAll` | أظهر الكل | mng/laym | view/lays | متوسّطة |
| `a:lUnlock` | افتح المقفل | mng/laym | view/lays | متوسّطة |
| `a:projDlg` | إعداد المشروع | mng/styl | mng/set | كبيرة |
| `a:styleMgrDlg` | أنماط الرسم | mng/styl | mng/set | كبيرة |
| `a:defsDlg` | افتراضات الأدوات | mng/styl | mng/set | كبيرة |
| `a:gateDlg` | بوابة التسليم | mng/hnd | out/hand | كبيرة |
| `a:cleanupDlg` | تنظيف المشروع | mng/hnd | out/hand | متوسّطة |
| `a:dedupDlg` | مسح التكرار | mng/hnd | out/hand | متوسّطة |
| `c:macrorec` | تسجيل / إيقاف | mng/mac | mng/mac | كبيرة |
| `c:macroplay` | شغّل… | mng/mac | mng/mac | متوسّطة |
| `c:macrolist` | القائمة | mng/mac | mng/mac | متوسّطة |
| `c:macrodel` | احذف… | mng/mac | mng/mac | متوسّطة |
| `c:jrreplay` | أعد السجلّ | mng/mac | mng/mac | متوسّطة |
| `c:jrcopy` | انسخ السجلّ | mng/mac | mng/mac | متوسّطة |
| `c:jrclear` | امسح السجلّ | mng/mac | mng/mac | متوسّطة |
| `a:levelMgrDlg` | إدارة الطوابق | mng/prj | view/lays | كبيرة |
| `c:sel` | تحديد بالمعرّف | mng/prj | mng/mac | متوسّطة |
| `c:del` | حذف | mng/prj | mng/mac | متوسّطة |
| `a:dRst` | أعِد المصنع | mng/prj | قائمة التطبيق | — |
