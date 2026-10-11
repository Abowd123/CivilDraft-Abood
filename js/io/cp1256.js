/* ═══ ترميز CP1256 ═══
   DXF R12 لا يحمل وسم ترميزٍ لكل نصّ: الملفّ كلّه بصفحة رمزٍ
   واحدة يُعلنها $DWGCODEPAGE. وكان المُصدِّر يُعلن ANSI_1256
   ويكتب بايتات UTF-8 (‏Blob يُرمِّز السلاسل بها دائماً) — فالإعلان
   والبايتات متناقضان، والنصّ العربي يصل أوتوكاد خربشةً.
   والدورة الداخلية كانت سليمةً ومغلقةً على نفسها لأن decodeDXF
   يجرّب UTF-8 أوّلاً، فالعلّة لا تظهر إلّا عند من يفتح ملفّك.

   الجدول للنطاق 0x80–0xFF وحده؛ ما دون 0x80 مطابقٌ لـASCII.
   وما لا يُرمَّز يصير «؟» ويُعَدّ، فيُقال للمستخدم لا يُكتَم. */

/* موضع البايت 0x80+i ⇒ نقطة يونيكود */
const HI=[
 0x20AC,0x067E,0x201A,0x0192,0x201E,0x2026,0x2020,0x2021,
 0x02C6,0x2030,0x0679,0x2039,0x0152,0x0686,0x0698,0x0688,
 0x06AF,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,
 0x06A9,0x2122,0x0691,0x203A,0x0153,0x200C,0x200D,0x06BA,
 0x00A0,0x060C,0x00A2,0x00A3,0x00A4,0x00A5,0x00A6,0x00A7,
 0x00A8,0x00A9,0x06BE,0x00AB,0x00AC,0x00AD,0x00AE,0x00AF,
 0x00B0,0x00B1,0x00B2,0x00B3,0x00B4,0x00B5,0x00B6,0x00B7,
 0x00B8,0x00B9,0x061B,0x00BB,0x00BC,0x00BD,0x00BE,0x061F,
 0x06C1,0x0621,0x0622,0x0623,0x0624,0x0625,0x0626,0x0627,
 0x0628,0x0629,0x062A,0x062B,0x062C,0x062D,0x062E,0x062F,
 0x0630,0x0631,0x0632,0x0633,0x0634,0x0635,0x0636,0x00D7,
 0x0637,0x0638,0x0639,0x063A,0x0640,0x0641,0x0642,0x0643,
 0x00E0,0x0644,0x00E2,0x0645,0x0646,0x0647,0x0648,0x00E7,
 0x00E8,0x00E9,0x00EA,0x00EB,0x0649,0x064A,0x00EE,0x00EF,
 0x064B,0x064C,0x064D,0x064E,0x00F4,0x064F,0x0650,0x00F7,
 0x0651,0x00F9,0x0652,0x00FB,0x00FC,0x200E,0x200F,0x06D2];

/* الأرقامُ الهندية (٠-٩ و۰-۹) ليست في الصفحة 1256: الأوتوكاد العربيّ يرسم
   الأرقامَ اللاتينية ويُشكِّلها، فكانت «غرفة نوم ٢» تخرج «غرفة نوم ?». */
const DIG={}; for(let i=0;i<10;i++){DIG[0x0660+i]=String(i); DIG[0x06F0+i]=String(i)}
const FOLD={...DIG,0x2212:"-",0x2010:"-",0x2011:"-",0x2012:"-",0x2013:"-",0x2014:"-",0x2015:"-",
 0x2018:"'",0x2019:"'",0x201C:'"',0x201D:'"',0x00A0:" ",0x2009:" ",0x202F:" ",0x2007:" ",0x2026:"...",0x2032:"'",0x2033:'"'};
let MAP=null;
const map=()=>{
 if(MAP)return MAP;
 MAP=new Map();
 for(let i=0;i<HI.length;i++)MAP.set(HI[i],0x80+i);
 /* أشباهٌ مقبولة: محارف عزل الاتجاه (الدفعة ٢) لا وجود لها في
    الصفحة، وهي غير مرئية — فتُطرَح لا تُبدَّل بعلامة استفهام.
    وعلاماتُ الترقيم العربية موجودةٌ في الجدول أصلاً. */
 [0x2066,0x2067,0x2068,0x2069,0xFEFF].forEach(c=>MAP.set(c,-1));
 return MAP;
};
/* نصٌّ ⇒ بايتات · تُعيد {bytes, bad} — bad عددُ ما لم يُرمَّز.
   الطول ×2 لأن ما فوق BMP زوجُ وحداتٍ في JS ويصير بايتاً واحداً
   («؟») هنا، فلا يفيض. */
export function encode(str){
 const M=map(), s=String(str==null?"":str);
 const out=new Uint8Array(s.length*2+8);
 let n=0, bad=0;
 for(const ch of s){
  const c=ch.codePointAt(0);
  if(c<0x80){out[n++]=c; continue}
  /* الطباعيُّ إلى ما يقابله في الصفحة: علامةُ الطرح «−» (U+2212) يكتبها
     المنسوبُ (−0.150) وكانت تخرج «?0.150» في الأوتوكاد، ومثلُها الشرطاتُ
     والمسافاتُ الرفيعة وعلامتا الاقتباس المنحنيتان. */
  const f=FOLD[c];
  if(f){for(const q of f)out[n++]=q.charCodeAt(0); continue}
  const b=M.get(c);
  if(b===-1)continue;              /* يُطرَح بلا أثر */
  if(b!==undefined){out[n++]=b; continue}
  out[n++]=0x3F;                   /* ؟ */
  bad++;
 }
 return {bytes:out.subarray(0,n), bad};
}
export const canEncode=str=>encode(str).bad===0;

/* الفكّ — لبيئةٍ بلا TextDecoder (Node العاري في المِعمَل) وللدورة
   الكاملة في الاختبار. والمتصفّح يستعمل TextDecoder المدمج. */
export function decode(bytes){
 const b=(bytes instanceof ArrayBuffer)?new Uint8Array(bytes):bytes;
 let s="";
 for(let i=0;i<b.length;i++){
  const v=b[i];
  s+=(v<0x80)?String.fromCharCode(v)
   :String.fromCodePoint(HI[v-0x80]);
 }
 return s;
}
export const CP=1256;
