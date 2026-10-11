/* ═══ اختبار قارئ DXF ═══
   المنفذ الوحيد الذي يستقبل ملفّاً من طرفٍ ثالث، وكان بصفر
   حالات. الحالات هنا معاديةٌ بقصد: ملفٌّ مصنوعٌ ليُعلِّق أو
   ليمرّر قيمةً تُفسِد الصندوق.
   التشغيل:  node js/tests/dxfin.js                              */
import {shim,group,ok,eq,near,deep,throws,summary} from "./harness.js";
shim();

const D=await import("../io/dxfin.js");
const CP=await import("../io/cp1256.js");

const dxf=(...pairs)=>pairs.join("\n");
const wrap=body=>dxf("0","SECTION","2","ENTITIES",body,
 "0","ENDSEC","0","EOF");

group("الأساس",()=>{
 const r=D.parseDXF(wrap(dxf("0","LINE","8","W",
  "10","0","20","0","11","1000","21","0")),{unit:1});
 eq(r.ents.length,1,"خطٌّ واحد");
 deep(r.ents[0].b,[1000,0],"بإحداثياته");
 eq(r.stop,"","ولا توقّف");
 eq(r.clipped,0,"ولا قصّ");
 throws(()=>D.parseDXF("0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nEOF"),
  /ENTITIES/,"بلا كيانات يُرفَض");
 const bin=new Uint8Array(24);
 "AutoCAD Binary DXF".split("").forEach((c,i)=>{
  bin[i]=c.charCodeAt(0)});
 throws(()=>D.decodeDXF(bin),/ثنائي/,"والثنائي يُرفَض بوضوح");
});
group("قنبلة التعشيق",()=>{
 /* بلوكٌ يُدرِج بلوكاً بمصفوفة ٢٠×٢٠ في كل مستوى.
    الحدود الموضعية تسمح: 5 مستوياتٍ × 400 = 10¹³ نداءً. */
 const arr=(nm,cols,rows)=>dxf("0","INSERT","8","0","2",nm,
  "10","0","20","0","70",String(cols),"71",String(rows),
  "44","10","45","10");
 const blk=(nm,body)=>dxf("0","BLOCK","2",nm,
  "10","0","20","0",body,"0","ENDBLK");
 const src=dxf("0","SECTION","2","BLOCKS",
  blk("L4",dxf("0","LINE","10","0","20","0","11","1","21","1")),
  blk("L3",arr("L4",20,20)),
  blk("L2",arr("L3",20,20)),
  blk("L1",arr("L2",20,20)),
  "0","ENDSEC",
  "0","SECTION","2","ENTITIES",arr("L1",20,20),
  "0","ENDSEC","0","EOF");
 const t0=Date.now();
 const r=D.parseDXF(src,{unit:1,maxOps:200000});
 const ms=Date.now()-t0;
 /* الزمن المطلق يتبدّل بالحاسب — تحذيرٌ لا فشل. المحروس فعلاً
    هو التوقّف بالعدّاد (stop=="ops") وسقف العمليات/الكيانات أدناه */
 if(ms>=5000)console.warn(`[تحذير أداء] قنبلة التعشيق انتهت في ${ms} مس`);
 eq(r.stop,"ops","وأُعلن سبب التوقّف");
 ok(r.ops<=260000,`وعندَ الحدّ (${r.ops} عملية)`);
 ok(r.ents.length<=D.MAXENT,"ولم يتجاوز سقف الكيانات");
 /* وبلا حدٍّ صريح: الافتراض يحرس كذلك */
 const t1=Date.now();
 const r2=D.parseDXF(src,{unit:1});
 const ms1=Date.now()-t1;
 if(ms1>=25000)console.warn(`[تحذير أداء] الافتراضُ استغرق ${ms1} مس`);
 ok(r2.stop==="ops"||r2.stop==="time","ويُعلن سببه");
});
group("سقف الرؤوس",()=>{
 const N=60000;
 const P=[];
 for(let i=0;i<N;i++){P.push("10",String(i),"20","0")}
 const r=D.parseDXF(wrap(dxf("0","LWPOLYLINE","8","0",
  "90",String(N),"70","0",P.join("\n"))),{unit:1});
 eq(r.ents.length,1,"مضلّعٌ واحد");
 ok(r.ents[0].pts.length<=D.MAXPTS,
  `رؤوسه ${r.ents[0].pts.length} ≤ ${D.MAXPTS}`);
 eq(r.clipped,1,"والقصّ يُعَدّ فيُقال");
 /* وPOLYLINE بـVERTEX كذلك */
 const V=[];
 for(let i=0;i<30000;i++)
  V.push("0","VERTEX","10",String(i),"20","0");
 const r2=D.parseDXF(wrap(dxf("0","POLYLINE","8","0","70","0",
  V.join("\n"),"0","SEQEND")),{unit:1});
 ok(r2.ents[0].pts.length<=D.MAXPTS,"والرؤوس المستقلّة تُقصّ");
 eq(r2.clipped,1,"ويُعَدّ");
});
group("القيَم الشاذّة",()=>{
 const r=D.parseDXF(wrap(dxf(
  "0","LINE","10","0","20","0","11","1e300","21","0",
  "0","CIRCLE","10","0","20","0","40","1e300",
  "0","TEXT","10","0","20","0","40","1e300","1","نصّ",
  "0","LINE","10","0","20","0","11","1000","21","0")),{unit:1});
 eq(r.ents.length,1,"الصالح وحده يمرّ");
 ok(r.skip["قيمة خارج المدى"]>=3,"والشاذّ يُنبَذ ويُعَدّ");
 /* الانتفاخ الذي يقسم على صفر */
 const b=D.parseDXF(wrap(dxf("0","LWPOLYLINE","8","0","90","2",
  "70","0","10","0","20","0","42","1e12","10","1000","21","0")),
  {unit:1});
 b.ents.forEach(e=>(e.pts||[]).forEach(p=>{
  ok(isFinite(p[0])&&isFinite(p[1]),"لا NaN في الرؤوس");
 }));
 /* معامل الوحدة الشاذّ يُقسَر ولا يُفسِد كل إحداثيّ */
 const u=D.parseDXF(wrap(dxf("0","LINE","10","0","20","0",
  "11","1000","21","0")),{unit:1e9});
 eq(u.ents.length,1,"الوحدة الشاذّة تُقسَر إلى ١");
 deep(u.ents[0].b,[1000,0],"فالإحداثيّ يبقى كما هو");
 /* والحرس بعد التحويل لا قبله: قيمةٌ صالحةٌ خامّاً وشاذّةٌ محوَّلة */
 const f=D.parseDXF(wrap(dxf("0","LINE","10","0","20","0",
  "11","1e7","21","0")),{unit:1000});
 eq(f.ents.length,0,"1e7 متر = 1e10 مم ⇒ تُنبَذ");
 ok(f.skip["قيمة خارج المدى"]>=1,"وتُعَدّ");
 /* والملخّص يقبل استثناءَ ما ذُكر برسالةٍ خاصّة */
 ok(!/خارج المدى/.test(D.skipSummary(f.skip,["قيمة خارج المدى"])),
  "skipSummary يُستثنى منه ما يُقال وحده");
 ok(/خارج المدى/.test(D.skipSummary(f.skip)),"ويشمله بلا استثناء");
});
group("الترميز",()=>{
 const e=CP.encode("غرفة 5");
 eq(e.bad,0,"العربية تُرمَّز كاملةً");
 /* «غ» = 0x63A ⇒ 0xDB في CP1256 */
 eq(e.bytes[0],0xDB,"وبالبايت الصحيح");
 eq(e.bytes[e.bytes.length-1],0x35,"وASCII كما هو");
 const bad=CP.encode("日本");
 eq(bad.bad,2,"وما ليس في الصفحة يُعَدّ");
 eq(bad.bytes[0],0x3F,"ويُكتَب ؟");
 /* محارف عزل الاتجاه تُطرَح ولا تصير ؟ */
 const iso=CP.encode("\u20669×14\u2069");
 eq(iso.bad,0,"محارف العزل لا تُعَدّ خطأً");
 eq(iso.bytes.length,4,"وتُطرَح من البايتات");
 /* دورةٌ كاملة */
 eq(CP.decode(CP.encode("مجلس · صالة").bytes),"مجلس · صالة",
  "والدورة تعيد النصّ");
 eq(CP.decode(CP.encode("ABC 123 م").bytes),"ABC 123 م",
  "والمختلط كذلك");
 ok(CP.canEncode("صالة الطعام"),"canEncode يصدق");
 ok(!CP.canEncode("日本"),"ويكذّب");
});
group("الترميز في القارئ",()=>{
 /* ملفٌّ يُعلن ANSI_1256 وبايتاته CP1256: يُفَكّ بالصفحة
    المُعلَنة لا بالتخمين. والنصّ العربي القصير قد يمرّ من
    UTF-8 صامتاً — وهي العلّة التي كانت. */
 const txt=dxf("0","SECTION","2","HEADER",
  "9","$DWGCODEPAGE","3","ANSI_1256","0","ENDSEC",
  "0","SECTION","2","ENTITIES",
  "0","TEXT","8","0","10","0","20","0","40","100","1","صالة",
  "0","ENDSEC","0","EOF");
 const bytes=CP.encode(txt).bytes;
 const d=D.decodeDXF(bytes);
 eq(d.enc,"CP1256","الصفحة المُعلَنة تُقرأ");
 ok(/صالة/.test(d.txt),"والنصّ يُفَكّ صحيحاً");
 const r=D.parseDXF(d.txt,{unit:1});
 eq(r.ents.length,1,"وكيانٌ واحد");
 eq(r.ents[0].s,"صالة","بنصّه العربي");
 /* وUTF-8 يبقى مقبولاً حين لا إعلان */
 const u=new TextEncoder().encode(wrap(dxf("0","TEXT","8","0",
  "10","0","20","0","40","100","1","مجلس")));
 const du=D.decodeDXF(u);
 eq(du.enc,"UTF-8","وبلا إعلانٍ يُجرَّب UTF-8");
 ok(/مجلس/.test(du.txt),"ويصدق");
});
process.exit(summary()?1:0);
