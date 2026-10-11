/* ═══ رجوع السحب عند فشل التحويل (مرحلة 1.2 بند 5) ═══
   E.dragGrip/E.moveEnt حسابٌ صرفٌ لا يرمي فعلياً اليوم (لا throw في
   core/ents.js) — فلا سيناريو تشغيليّ حقيقيّ يُثبت هذا الحارس، ووحدات
   ES لا تسمح بتبديل دالّةٍ مستوردةٍ من اختبارٍ خارجيّ (ربطٌ للقراءة
   فقط). الفحصُ إذن ساكنٌ كأمثاله في dom.js: يتأكّد أنّ نداءَي
   التحويل في ui/canvas.js محاطان بـtry/catch يستدعي dragRollback()
   عند الرمي — ضمانٌ دفاعيّ لا سلوكٌ يُلاحَظ وقت التشغيل اليوم، لكنّه
   يمنع رجوعاً صامتاً لو صار التحويل يرمي مستقبلاً (تحقّقٌ إضافيّ،
   حدودٌ جديدة، …). انظر الشرح في تعليق dragRollback نفسه. */
import {readFileSync} from "node:fs";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {group,ok,summary} from "./harness.js";

const HERE=dirname(fileURLToPath(import.meta.url));
const src=readFileSync(join(HERE,"..","ui","canvas.js"),"utf8");

group("[1.2·5] سحبُ المقبض والتحريك المباشر يرجعان عند فشل التحويل",()=>{
 ok(/function dragRollback\(/.test(src),
  "dragRollback موجودةٌ");
 ok(/dragRollback[\s\S]{0,120}loadState\(/.test(src),
  "وتستعيد الحالة عبر loadState لا تلاعباً يدوياً بـS");

 /* بالوجود لا بالتقاط كتلٍ هشّ: بدل الاعتماد على غلاف "\n }" الدقيق
    (يتكسّر بأيّ إعادة تنسيقٍ أو مسافةٍ إضافية)، نحدّد بداية كلّ قسمٍ
    بعلامته الحرفية ونهايته ببداية العلامة التالية — تحقّقٌ بالوجود
    القريب من دون افتراض شكل القوس الخاتم */
 const giGrip=src.indexOf("if(drag&&drag.grip)");
 const giMove=src.indexOf("if(drag&&drag.move)");
 ok(giGrip>=0,"كتلة سحب المقبض موجودة في onMove");
 ok(giMove>=0,"كتلة التحريك المباشر موجودة في onMove");
 const gripChunk=giGrip>=0?src.slice(giGrip,giMove>giGrip?giMove:undefined):"";
 const moveChunk=giMove>=0?src.slice(giMove,giMove+1500):"";

 ok(/try\{[\s\S]*?E\.dragGrip\([\s\S]*?\}catch\(e\)\{[\s\S]*?dragRollback\(/
  .test(gripChunk),
  "ونداء E.dragGrip داخل try/catch يستدعي dragRollback عند الرمي");
 ok(/try\{[\s\S]*?E\.moveEnt\([\s\S]*?\}catch\(e\)\{[\s\S]*?dragRollback\(/
  .test(moveChunk),
  "ونداء E.moveEnt داخل try/catch يستدعي dragRollback عند الرمي");

 /* لا تاريخ شبحٌ: pushHistory ما زالت تُنادى مرّةً واحدة لكل سحب
    (عند أوّل حركة)، لا في كل try — لو دخلت pushHistory داخل try
    الجديد لصار كل إطارٍ خطوة تاريخ، وهو عكسُ بند 1.2/5 الثاني. */
 const pushCalls=(gripChunk.match(/pushHistory\(/g)||[]).length;
 ok(pushCalls===1,"pushHistory مرّةً واحدة فقط في كتلة سحب المقبض");
});

process.exit(summary()?1:0);
