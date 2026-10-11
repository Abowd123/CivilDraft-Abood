/* ═══ أمانةُ الملفّ والحالة ═══
   P3-001 حفظان متتاليان لحالةٍ واحدة يتطابقان حرفاً · P3-004 الحقلُ
   الناقص لا يُبدَّل بصمت والذهابُ والعودةُ لا يغيّران شيئاً ·
   P4-004 المفاتيحُ المكرّرة تُكتشَف قبل الاستبدال · P4-005 النوعُ
   الخاطئ يُسجَّل لا يُبتلَع · P2-004 نسخةُ المرجع تصمد في الاستعادة ·
   P4-008 سقفُ الطول المعلن مفروضٌ عند إنشاء الجدار.
   التشغيل:  node js/tests/fidelity.test.js                       */
import {shim,group,ok,eq,deep,throws,summary} from "./harness.js";
shim();
const ST=await import("../core/state.js");
const {S,newState,ensureShape,edit,snapshot,shapeNotes}=ST;
const W=await import("../core/walls.js");
const {LIM}=await import("../core/limits.js");
const PRJ=await import("../io/project.js");

const reset=()=>{newState(); ensureShape(); PRJ.resetSaveStamp(); shapeNotes()};
const wall=(a,b)=>W.addWall(a,b,200,"int","c");
const strip=s=>{const d=JSON.parse(s); delete d.__saved; return d};

group("P3-001 · حفظان متتاليان لحالةٍ واحدة يتطابقان حرفاً",()=>{
 reset();
 edit(()=>wall([0,0],[3000,0]),"جدار");
 const a=PRJ.toJSON();
 const b=PRJ.toJSON();
 eq(a,b,"نفسُ النصّ حرفاً — لا طابعَ متجدّد بلا سبب");
 ok(JSON.parse(a).__saved,"والطابعُ موجودٌ لا محذوف");
 /* ثم تتغيّر الحالة: الطابعُ يتجدّد لأنه طابعُ حفظٍ فعليّ */
 edit(()=>wall([0,1000],[3000,1000]),"جدار");
 const c=PRJ.toJSON();
 ok(c!==a,"الحالةُ تغيّرت فالنصُّ تغيّر");
 ok(JSON.parse(c).__saved!==JSON.parse(a).__saved,
  "والطابعُ تجدّد مع التغيّر");
});

group("P3-001+P3-004 · حفظٌ ثمّ تحميلٌ ثمّ حفظٌ — تطابقٌ تامّ",()=>{
 reset();
 edit(()=>{
  wall([0,0],[4000,0]);
  wall([4000,0],[4000,3000]);
 },"جدارانِ");
 const a=PRJ.toJSON();
 PRJ.fromJSON(a);
 const b=PRJ.toJSON();
 deep(strip(b),strip(a),"المتنُ متطابقٌ بعد الذهاب والعودة");
 eq(b,a,"والنصُّ كلُّه متطابقٌ حرفاً — الطابعُ لم يتجدّد بلا تغيّر");
});

group("P3-004 · التأشير الناقص يُقال لا يُبدَّل بصمت",()=>{
 reset();
 /* hm:null قيمةٌ حاضرةٌ غيرُ صالحة — كانت تصير 1 بلا سطرٍ واحد */
 S.anno=[{id:"AN1",kind:"text",x:0,y:0,s:"نصّ",hm:null,al:"bc",rot:0}];
 ensureShape();
 eq(S.anno.length,1,"التأشيرُ باقٍ — لا يُسقَط");
 eq(S.anno[0].hm,1,"والحقلُ قُوِّم إلى الافتراضيّ");
 const n=shapeNotes();
 ok(n.some(([,m])=>/hm/.test(m)),"والتقويمُ مسجَّلٌ باسم الحقل");
});

group("P4-005 · النوعُ الخاطئ يُسجَّل لا يُبتلَع",()=>{
 reset();
 S.walls="سلسلةٌ لا مصفوفة";
 S.opens={};
 ensureShape();
 eq(S.walls.length,0,"أُفرغت فلا تنهار الحالة");
 ok(Array.isArray(S.opens),"والأخرى كذلك");
 const n=shapeNotes();
 ok(n.some(([,m])=>/walls/.test(m)),"وسجلُّ التطبيع يذكر «walls»");
 ok(n.some(([,m])=>/opens/.test(m)),"ويذكر «opens»");
 /* والغيابُ التامّ ليس تبديلاً فلا يُسجَّل */
 reset();
 delete S.plines;
 ensureShape();
 ok(!shapeNotes().some(([,m])=>/plines/.test(m)),
  "والحقلُ الغائبُ أصلاً لا يُحتسَب فقداً");
});

group("P4-004 · المفاتيحُ المكرّرة تُرفَض قبل أيّ كتابة",()=>{
 reset();
 edit(()=>wall([0,0],[3000,0]),"جدار");
 const before=snapshot();
 const bad='{"__app":"civildraft","__ver":2,"walls":[],'
  +'"walls":[{"id":"W9","a":[0,0],"b":[9000,0],"t":200,"type":"int",'
  +'"align":"c","level":0}],"opens":[]}';
 throws(()=>PRJ.fromJSON(bad),/مكرّر/,"يُرمى باسم المكرّر");
 throws(()=>PRJ.fromJSON(bad),/walls/,"والرسالةُ تسمّي المفتاح");
 eq(snapshot(),before,"والمشروعُ لم يُمَسّ");
 /* الكشفُ معجميٌّ: مفتاحٌ مكرّرٌ عميقٌ يُكتشَف كذلك */
 deep(PRJ.dupKeys('{"a":{"b":1,"b":2}}'),["b"],"والعمقُ مفحوصٌ");
 /* ولا إنذارٌ كاذب: قيمةٌ نصّيةٌ تشبه مفتاحاً، ومفتاحٌ متكرّرٌ في
    كائنَين مختلفَين، ومفاتيحُ تحمل ':' أو '{' داخل سلسلتها */
 deep(PRJ.dupKeys('{"a":{"x":1},"b":{"x":2}}'),[],
  "كائنانِ مختلفانِ لهما نفسُ المفتاح — سليم");
 deep(PRJ.dupKeys('{"a":"{\\"a\\":1,\\"a\\":2}"}'),[],
  "ومفتاحٌ داخل سلسلةٍ لا يُحتسَب");
 deep(PRJ.dupKeys('[{"a":1},{"a":2}]'),[],"ومصفوفةُ كائناتٍ سليمة");
 deep(PRJ.dupKeys('{"a:b":1,"c":2}'),[],"ونقطتانِ داخل الاسم");
 /* والملفُّ السليمُ يمرّ كما كان */
 const good=PRJ.toJSON();
 deep(PRJ.dupKeys(good),[],"وملفُّنا نحن بلا تكرار");
 ok(PRJ.fromJSON(good),"ويُحمَّل");
});

group("P2-004 · نسخةُ المرجع تصمد في الاستعادة",()=>{
 reset();
 /* مرجعٌ بكياناتٍ ⇒ snapshot يُخرِجها إلى المخزن ويضع __rv */
 S.ref={ents:[{t:"l",a:[0,0],b:[100,0],L:"0"}],name:"r.dxf"};
 const snap=snapshot();
 const d=JSON.parse(snap);
 ok(d.ref.__rv!=null,"اللقطةُ تحمل رقم النسخة");
 const rv=d.ref.__rv;
 /* الاستعادة: الكياناتُ تعود، و__rv لا يُفلِت من الحالة */
 ST.loadState(JSON.parse(snap),true);
 eq(S.ref.ents.length,1,"الكياناتُ عادت من المخزن");
 ok(S.ref.__rv===undefined,"ولا يبقى __rv في الحالة");
 /* ولقطةٌ تالية تُعيد النسخةَ نفسها — دليلُ أن refCur لم يصر undefined */
 eq(JSON.parse(snapshot()).ref.__rv,rv,"والنسخةُ الجارية كما هي");
});

group("P4-008 · سقفُ الطول المعلن مفروض",()=>{
 reset();
 const mx=LIM.length.max;
 /* إحداثيّانِ صالحانِ كلٌّ منهما داخل ±1e9، والطولُ بينهما 1.4e9 —
    وهو ما كان يمرّ رغم السقف المعلن */
 const h=Math.round(mx*0.7);
 throws(()=>wall([-h,0],[h,0]),/أكبر من الحدّ/,
  "طولٌ فوق السقف يُرفَض وإحداثيّاه صالحان");
 throws(()=>wall([-h,0],[h,0]),new RegExp(String(mx)),
  "والرسالةُ تذكر السقف");
 eq(S.walls.length,0,"ولا يدخل الحالة");
 /* وما دون السقف يمرّ كما كان */
 edit(()=>wall([0,0],[Math.round(mx*0.5),0]),"جدار");
 eq(S.walls.length,1,"وطولٌ مقبولٌ يمرّ");
});

process.exit(summary()?1:0);
