/* ═══ حراسة إدخال DXF ═══ P4-001 · P4-002 · P4-003
   ثلاثة عيوبٍ في المنفذ الوحيد الذي يستقبل ملفّ طرفٍ ثالث:
   ملفٌّ ضخمٌ كان يستنزف الكومة قبل أيّ سقف، وملفٌّ مبتورٌ كان
   يُقرأ كأنّه تامّ، وUTF-16 كان يُفَكّ كـCP1256 فيخرج مشوَّهاً.
   التشغيل:  node js/tests/dxf-guard.test.js                     */
import {shim,group,ok,eq,throws,summary} from "./harness.js";
shim();
const D=await import("../io/dxfin.js");

const dxf=(...p)=>p.join("\n");
const wrap=body=>dxf("0","SECTION","2","ENTITIES",body,
 "0","ENDSEC","0","EOF");

group("P4-001 · سقفُ الحجم قبل حجز الذاكرة",()=>{
 ok(D.MAXCHARS>0&&D.MAXBYTES>0&&D.MAXPAIRS>0,
  "السقوف معلنةٌ ومصدَّرة");
 /* نصٌّ أكبر من السقف يُرفَض عند أوّل فحصٍ بلا بناء مصفوفة */
 const unit="0\nLINE\n";
 const big=unit.repeat(Math.ceil((D.MAXCHARS+4096)/unit.length));
 ok(big.length>D.MAXCHARS,"المولَّد فوق السقف فعلاً");
 throws(()=>D.pairs(big),/أكبر من الحدّ/,
  "pairs يرفض النصّ الضخم");
 throws(()=>D.pairs(big),/السقف/,"والرسالة تذكر السقف");
 throws(()=>D.parseDXF(big),/أكبر من الحدّ/,
  "وparseDXF يرفضه كذلك بلا انهيار");
 /* سقفُ البايت يُفحَص قبل أيّ فكّ ترميز */
 throws(()=>D.decodeDXF(new Uint8Array(D.MAXBYTES+1)),
  /أكبر من الحدّ/,"decodeDXF يرفض البايتات الزائدة");
 /* والسقفُ قابلٌ للتضييق فيوقف المسح عند الزوج لا بعد الملفّ */
 throws(()=>D.pairs(wrap(dxf("0","LINE","10","0","20","0",
  "11","1","21","0")),{maxPairs:3}),/الأزواج/,
  "ويتوقّف عند سقف الأزواج");
 throws(()=>D.pairs("0\nLINE\n0\nLINE\n",{maxLines:2}),
  /الأسطر/,"وعند سقف الأسطر");
 /* ولا ينكسر السلوك السليم: الأزواج كما كانت */
 const P=D.pairs("  10 \r\n 1000\n20\n0\n");
 eq(P.length,2,"زوجان من نصٍّ سليم");
 eq(P[0][0],10,"الرمز مقروءٌ مقلَّماً");
 eq(P[0][1]," 1000","والقيمة كما هي بلا تقليم");
});

group("P4-002 · البترُ يُرفَض لا يُخترَع",()=>{
 const body=dxf("0","LINE","8","W","10","0","20","0",
  "11","1000","21","0");
 /* قسمٌ بلا ENDSEC */
 throws(()=>D.parseDXF(dxf("0","SECTION","2","ENTITIES",body),
  {unit:1}),/مبتور/,"قسمٌ بلا ENDSEC يُرفَض");
 /* ملفٌّ بلا EOF */
 throws(()=>D.parseDXF(dxf("0","SECTION","2","ENTITIES",body,
  "0","ENDSEC"),{unit:1}),/EOF/,"وملفٌّ بلا EOF يُرفَض");
 /* LINE ناقص الإحداثيات يُعَدّ ولا يصير خطّاً صفريّاً */
 const r=D.parseDXF(wrap(dxf("0","LINE","8","W","10","0","20","0")),
  {unit:1});
 eq(r.ents.length,0,"LINE ناقصٌ لا يُنتِج كياناً");
 eq(r.skip["LINE ناقص الإحداثيات"],1,"بل يُعَدّ باسمه");
 /* والسليم ما زال يمرّ */
 const g=D.parseDXF(wrap(body),{unit:1});
 eq(g.ents.length,1,"والتامّ يمرّ كما كان");
});

group("P4-003 · UTF-16 يُكتشَف ويُرفَض",()=>{
 const src="0\nSECTION\n2\nENTITIES\n0\nENDSEC\n0\nEOF\n";
 const le=new Uint8Array(2+src.length*2);
 le[0]=0xFF; le[1]=0xFE;
 for(let i=0;i<src.length;i++){
  le[2+i*2]=src.charCodeAt(i)&255; le[3+i*2]=0;
 }
 throws(()=>D.decodeDXF(le),/UTF-16/,"علامةُ الترتيب LE تُرفَض");
 const be=new Uint8Array([0xFE,0xFF,0,0x30,0,0x0A]);
 throws(()=>D.decodeDXF(be),/UTF-16/,"وBE كذلك");
 /* بلا BOM: كثافةُ NUL تكفي دليلاً */
 const nob=le.slice(2);
 throws(()=>D.decodeDXF(nob),/UTF-16/,"وبلا BOM يكشفه NUL");
 /* ولا يُرفَض UTF-8 ولا CP1256 */
 const u8=new TextEncoder().encode(src+"مجلس\n");
 eq(D.decodeDXF(u8).enc,"UTF-8","وUTF-8 يمرّ");
});

process.exit(summary()?1:0);
