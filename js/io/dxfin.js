/* ═══ قارئ DXF ═══
   يقرأ R12 وما بعده قراءةً متسامحة، ويعيد أوّليات مرجعية بالمليمتر.
   لا يستنتج جداراً ولا سماكةً ولا محاذاة: يعيد ما في الملفّ.
   وما لا يفهمه يعدّه بنوعه ولا يخترع له هيئة.

   وهو المنفذ الوحيد الذي يستقبل ملفّاً من طرفٍ ثالث، فحرسُه
   ثلاثيّ: حدُّ عملٍ عامّ يمنع التعليق، وسقفُ رؤوسٍ لكل كيان،
   ومدىً نموذجيّ يُنبَذ ما خرج عنه. */
import {clamp,deg,D2R,R2D} from "../core/units.js";
import {decode as cpDecode} from "./cp1256.js";
import {LIM} from "../core/limits.js";

const R=v=>Math.round(v);
/* ═══ 2.5: الحدود من core/limits.js ═══
   كانت محليّةً هنا، ونسخٌ حرفيّة في ref.js وensureShape. مصدرٌ
   واحد: حدُّ الرؤوس في القارئ هو حدُّه في setRef وفي ensureShape. */
export const MAXENT=LIM.refEnts.max;
export const MAXOPS=4000000;   /* حدُّ عملٍ عامّ لا حدُّ مستوى */
export const MAXPTS=LIM.refPts.max; /* أكبر عددِ رؤوسٍ لكيانٍ واحد */
export const MAXSEC=20000;     /* أقصى زمنٍ للتحليل بالمللي */
/* ═══ 4.1: سقوفُ الإدخال قبل حجز الذاكرة ═══
   كان القارئ يبني مصفوفة الأسطر ثم مصفوفة الأزواج كلَّها قبل أن
   يرى سقفَ الكيانات، فملفٌّ بخمسين ميغابايت يستنزف الكومة ويقتل
   العملية قبل أن يصل إلى MAXENT. فالسقفُ الآن على البايت والسطر
   والزوج، ويُفحَص قبل الحجز وأثناء المسح لا بعده. */
export const MAXBYTES=32*1024*1024;  /* بايتات الملفّ الخام */
export const MAXCHARS=32*1024*1024;  /* محارف النصّ بعد الفكّ */
export const MAXLINES=6000000;       /* أسطرٌ نمسحها زوجاً زوجاً */
export const MAXPAIRS=3000000;       /* أزواجٌ نحتفظ بها فعلاً */
const MB=n=>(n/1048576).toFixed(1);
const tooBig=(what,got,cap,unit)=>new Error(
 `ملفّ DXF أكبر من الحدّ: ${what} ${got}${unit} والسقف ${cap}${unit}`
 +" — صدّر طبقاتٍ أقلّ أو قسّم الملفّ");

/* ═══ المدى النموذجي ═══
   ±١٠⁹ مم = ألف كيلومتر. ما خرج عنه ليس هندسةً معمارية بل
   قيمةٌ معطوبة أو وحدةٌ خاطئة، وتمريرها يُفسِد الصندوق فيصفّر
   التكبير وتخلو الشاشة بلا رسالة.
   والفحص يقع بعد ضرب معامل الوحدة لا قبله: ملفٌّ بالأقدام
   قيمتُه 1e8 يصير 3e10 مم — صالحٌ خامّاً وشاذٌّ محوَّلاً. */
export const MAXCO=LIM.coord.max;
const fin=v=>(typeof v==="number"&&isFinite(v));
const okPt=p=>Array.isArray(p)&&fin(p[0])&&fin(p[1])
 &&Math.abs(p[0])<=MAXCO&&Math.abs(p[1])<=MAXCO;

/* الوحدة → معامل التحويل إلى مليمتر */
export const UNITS={
 0:["مجهولة",1], 1:["بوصة",25.4], 2:["قدم",304.8],
 3:["ميل",1609344], 4:["مليمتر",1], 5:["سنتيمتر",10],
 6:["متر",1000], 8:["ميكرون",0.001], 14:["دسيمتر",100]};

/* ═══ الترميز ═══
   $DWGCODEPAGE أوّلاً إن أعلنه الملفّ: نصٌّ عربيٌّ قصير بـCP1256 قد
   يكون صالح البايتات في UTF-8 فيُفَكّ خطأً صامتاً — والعلّة لا
   تظهر إلّا حين تقرأ رسمَ غيرك. وإن لم يُعلن: UTF-8 صارماً ثم
   CP1256، وهو الشائع في الملفّات العربية القديمة. */
const CPRE=/ANSI_1256|CP1256|WINDOWS-1256/i;
function headCP(txt){
 /* الترويسة أوّل الملفّ — ٦٠ ألف حرفٍ تكفي وتزيد */
 const h=txt.slice(0,60000);
 const i=h.indexOf("$DWGCODEPAGE");
 if(i<0)return "";
 const seg=h.slice(i,i+120);
 const m=/\n\s*3\s*\r?\n\s*([^\r\n]+)/.exec(seg);
 return m?m[1].trim():"";
}
export function decodeDXF(buf){
 const b=(buf instanceof ArrayBuffer)?new Uint8Array(buf):buf;
 /* الحدُّ قبل أيّ فكّ ترميز: الفكّ نفسه يحجز نصّاً بحجم الملفّ */
 if(b.length>MAXBYTES)
  throw tooBig("الحجم",MB(b.length),MB(MAXBYTES)," م.ب");
 let head="";
 for(let i=0;i<Math.min(22,b.length);i++)
  head+=String.fromCharCode(b[i]);
 if(/AutoCAD Binary/.test(head))
  throw new Error("ملفّ DXF ثنائي — احفظه نصّياً (ASCII DXF)");
 /* ═══ 4.3: UTF-16 ═══
    كان يفشل في UTF-8 الصارم فيُفَكّ كـCP1256، فيخرج نصٌّ مشوَّهٌ
    فيه NUL بين كل حرفين ولا رسالة. والكشف بعلامة الترتيب أو
    بكثافة NUL في مقدّمة الملفّ — فنصُّ DXF لا يحمل NUL أصلاً. */
 if(b.length>=2&&((b[0]===0xFF&&b[1]===0xFE)||(b[0]===0xFE&&b[1]===0xFF)))
  throw new Error(
   "ملفّ DXF بترميز UTF-16 — احفظه نصّياً بـUTF-8 أو CP1256");
 const probe=Math.min(512,b.length);
 let nul=0;
 for(let i=0;i<probe;i++)if(b[i]===0)nul++;
 if(probe>=16&&nul>probe/4)
  throw new Error(
   "ملفّ DXF بترميز UTF-16 — احفظه نصّياً بـUTF-8 أو CP1256");
 const cp1256=()=>{
  if(typeof TextDecoder!=="undefined")
   return new TextDecoder("windows-1256").decode(b);
  return cpDecode(b);            /* Node العاري في المِعمَل */
 };
 let u8=null;
 try{
  u8=(typeof TextDecoder!=="undefined")
   ? new TextDecoder("utf-8",{fatal:true}).decode(b)
   : Buffer.from(b).toString("utf8");
 }catch(e){}
 if(u8==null)return {txt:cp1256(),enc:"CP1256"};
 /* البايتات صالحةٌ في UTF-8 — لكن الإعلان يحكم */
 if(CPRE.test(headCP(u8)))return {txt:cp1256(),enc:"CP1256"};
 return {txt:u8,enc:"UTF-8"};
}
/* ═══ أزواج (رمز، قيمة) ═══
   مسحٌ متدفّقٌ زوجاً زوجاً: لا split يبني مصفوفة أسطرٍ كاملة
   بحجم الملفّ قبل أن نعرف إن كان مقبولاً. والسقوف تُفحَص داخل
   الحلقة فيتوقّف العمل عند أوّل تجاوزٍ برسالةٍ تذكر الحجم
   والسقف، لا بانهيار الكومة. */
export function pairs(txt,lim){
 const s=String(txt);
 const O=lim||{};
 const cChars=O.maxChars||MAXCHARS;
 const cLines=O.maxLines||MAXLINES;
 const cPairs=O.maxPairs||MAXPAIRS;
 if(s.length>cChars)
  throw tooBig("النصّ",MB(s.length),MB(cChars)," م.ب");
 const P=[];
 const n=s.length;
 let i=0, lines=0, code=null;
 while(i<n){
  let e=s.indexOf("\n",i);
  if(e<0)e=n;
  let a=i, b=e;
  if(b>a&&s.charCodeAt(b-1)===13)b--;   /* \r\n و\r وحده */
  i=e+1;
  if(++lines>cLines)
   throw tooBig("الأسطر",String(lines),String(cLines)," سطراً");
  if(code===null){
   let ta=a, tb=b;
   while(ta<tb&&s.charCodeAt(ta)<=32)ta++;
   while(tb>ta&&s.charCodeAt(tb-1)<=32)tb--;
   if(ta>=tb)continue;                  /* سطرٌ فارغٌ قبل الرمز */
   const c=parseInt(s.slice(ta,tb),10);
   if(!isFinite(c))continue;
   code=c;
   continue;
  }
  /* القيمة تُؤخَذ كما هي بلا تقليم — نصُّ DXF قد يبدأ بفراغ */
  if(P.length>=cPairs)
   throw tooBig("الأزواج",String(P.length+1),String(cPairs),"");
  P.push([code,s.slice(a,b)]);
  code=null;
 }
 return P;
}
const NUM=(g,c,d)=>{
 const a=g[c];
 const v=a?parseFloat(a[0]):NaN;
 return isFinite(v)?v:(d||0);
};
const STR=(g,c,d)=>{const a=g[c]; return a?a[0]:(d==null?"":d)};
const ARR=(g,c)=>(g[c]||[]).map(v=>parseFloat(v));
const INT=(g,c,d)=>{
 const a=g[c];
 const v=a?parseInt(a[0],10):NaN;
 return isFinite(v)?v:(d||0);
};
/* ═══ المصفوفة ═══ */
const mul=(m,n)=>({
 a:m.a*n.a+m.c*n.b, b:m.b*n.a+m.d*n.b,
 c:m.a*n.c+m.c*n.d, d:m.b*n.c+m.d*n.d,
 e:m.a*n.e+m.c*n.f+m.e, f:m.b*n.e+m.d*n.f+m.f});
const ap=(m,p)=>[m.a*p[0]+m.c*p[1]+m.e, m.b*p[0]+m.d*p[1]+m.f];
const sxOf=m=>Math.hypot(m.a,m.b);
const syOf=m=>Math.hypot(m.c,m.d);
const rotOf=m=>Math.atan2(m.b,m.a)*R2D;
const detOf=m=>m.a*m.d-m.b*m.c;
const uni=m=>{
 const x=sxOf(m), y=syOf(m);
 return detOf(m)>0 && Math.abs(x-y)<=1e-6*Math.max(x,1);
};
/* ═══ التجميع الخام ═══
   السقف على القيَم لا على الأسطر: نمضي في الملفّ ولا نجمع.
   ومضلّعٌ بعشرة ملايين رأسٍ كان يمرّ إلى الحالة والتاريخ والحفظ. */
const GCAP=MAXPTS*3;      /* لكل رمزٍ في كيانٍ واحد */
const GKEYS=4096;         /* أقصى عددِ رموزٍ مختلفة في كيان */
function grab(P,i){
 const t=String(P[i][1]).trim(), g={};
 let j=i+1, cut=0, keys=0;
 for(;j<P.length&&P[j][0]!==0;j++){
  const c=P[j][0];
  let a=g[c];
  if(a===undefined){
   /* كيانٌ فيه مليون رمزٍ مختلف يبني مليون مصفوفة ولو كانت
      كلٌّ بقيمةٍ واحدة — فالسقف على الرموز أيضاً */
   if(keys>=GKEYS){cut++; continue}
   a=g[c]=[]; keys++;
  }
  if(a.length>=GCAP){cut++; continue}
  a.push(P[j][1]);
 }
 return {type:t,g,j,cut};
}
function collect(P,from,to){
 const out=[];
 let i=from;
 while(i<to){
  if(P[i][0]!==0){i++; continue}
  const t=String(P[i][1]).trim();
  if(t==="ENDSEC"||t==="ENDBLK"||t==="BLOCK")break;
  const r=grab(P,i);
  i=r.j;
  if(t==="SEQEND")continue;
  if(t==="POLYLINE"){
   const vs=[];
   let vcut=0;
   while(i<to&&P[i][0]===0){
    const nt=String(P[i][1]).trim();
    if(nt==="VERTEX"){
     const v=grab(P,i); i=v.j;
     if(vs.length<MAXPTS)vs.push(v.g); else vcut++;
     continue;
    }
    if(nt==="SEQEND"){const s=grab(P,i); i=s.j}
    break;
   }
   out.push({type:t,g:r.g,vs,vcut});
   continue;
  }
  out.push({type:t,g:r.g});
 }
 return {list:out,end:i};
}
/* ═══ 4.2: الأقسام ═══
   كان يبحث عن ENDSEC ولا يفرض العثور عليه: قسمٌ مبتورٌ يصل آخر
   الملفّ فيُقرأ كأنّه تامّ. فالآن يُبلَّغ البتر باسم القسم. */
function sections(P){
 const S={};
 const open=[];
 for(let i=0;i<P.length;i++){
  if(P[i][0]!==0||String(P[i][1]).trim()!=="SECTION")continue;
  let nm="";
  for(let j=i+1;j<P.length&&P[j][0]!==0;j++)
   if(P[j][0]===2)nm=String(P[j][1]).trim();
  let e=i+1, found=0;
  for(;e<P.length;e++)
   if(P[e][0]===0&&String(P[e][1]).trim()==="ENDSEC"){found=1; break}
  if(!found)open.push(nm||"(بلا اسم)");
  S[nm]=[i+1,e];
  i=e;
 }
 return {sec:S,open};
}
/* آخرُ زوجٍ برمز 0 يجب أن يكون EOF — وإلّا فالملفّ مبتور */
function hasEOF(P){
 for(let i=P.length-1;i>=0;i--)
  if(P[i][0]===0)return String(P[i][1]).trim()==="EOF";
 return false;
}
/* ═══ الانتفاخ → قوس مقطَّع ═══
   قسمةٌ على جيبٍ صفريّ تعطي r=∞ ثم نقاط NaN ثم مفاتيح
   "NaN,NaN" في شبكة الالتقاط — فالحرس عند القسمة نفسها. */
function bulgePts(p1,p2,bg){
 const b=+bg||0;
 if(!isFinite(b)||Math.abs(b)<1e-9)return [];
 if(Math.abs(b)>1e6)return [];        /* انتفاخٌ لا معنى له */
 const th=4*Math.atan(b);
 const dx=p2[0]-p1[0], dy=p2[1]-p1[1], ch=Math.hypot(dx,dy);
 if(ch<1e-9)return [];
 const sn=Math.sin(Math.abs(th)/2);
 if(sn<1e-9)return [];                /* قسمةٌ على صفر ⇒ ∞ ⇒ NaN */
 const r=ch/(2*sn);
 if(!isFinite(r)||r>MAXCO)return [];
 const h=r*Math.cos(th/2);
 const mx=(p1[0]+p2[0])/2, my=(p1[1]+p2[1])/2;
 const sg=(th>0)?1:-1;
 const cx=mx-h*(dy/ch)*sg, cy=my+h*(dx/ch)*sg;
 if(!isFinite(cx)||!isFinite(cy))return [];
 const a0=Math.atan2(p1[1]-cy,p1[0]-cx);
 const n=clamp(Math.ceil(Math.abs(th)/(Math.PI/12)),2,48);
 const out=[];
 for(let i=1;i<n;i++)
  out.push([cx+r*Math.cos(a0+th*i/n), cy+r*Math.sin(a0+th*i/n)]);
 return out.filter(okPt);
}
/* ═══ السياق والحدّ العامّ ═══ */
function mkCtx(cap,ops,ms){
 return {out:[],cap:cap||MAXENT,trunc:0,skip:{},
  approx:{arc:0,spline:0,ellipse:0},src:{},
  ops:0, maxOps:ops||MAXOPS, maxMs:ms||MAXSEC,
  stop:"", clipped:0, t0:Date.now()};
}
const skip=(x,t)=>{x.skip[t]=(x.skip[t]||0)+1};
/* ═══ الحدّ العامّ ═══
   الحدود الموضعية (عمق التعشيق ٥ · حجم المصفوفة ٤٠٠) تحدّ كلَّ
   مستوىً ولا تحدّ حاصلها: بلوكٌ يُدرِج بلوكاً بمصفوفة ٢٠×٢٠ في
   كل مستوى يعطي 400⁵ ≈ 10¹³ نداءَ convert. وput تتوقّف عن
   الإضافة بعد ستّين ألفاً ولا توقف المسح — فالنتيجة تعليقٌ تامّ
   للخيط بلا إلغاءٍ ولا مؤقّت.
   والحدُّ هنا واحدٌ للتحليل كلّه، يُفحَص في كل مدخلٍ ومع كل
   تكرار، فيتوقّف التحليل ويُبلَّغ. */
function tick(x,n){
 if(x.stop)return false;
 x.ops+=(n||1);
 if(x.ops>x.maxOps){x.stop="ops"; return false}
 /* حدٌّ زمنيٌّ ثانٍ: ملفٌّ عريضٌ لا عميق قد يبلغ الوقت قبل العدد.
    والقناع يمنع نداء Date.now في كل عملية. */
 if((x.ops&1023)<8&&Date.now()-x.t0>x.maxMs){
  x.stop="time"; return false;
 }
 return true;
}
/* ═══ الحرس الأخير قبل الحالة ═══
   قيمةٌ شاذّة تُنبَذ وتُعَدّ باسمها، ولا تُصحَّح — الاختراع أسوأ
   من النبذ. وهو بعد تحويل الوحدة يقيناً. */
function okEnt(e){
 if(!e)return false;
 if(e.t==="l")return okPt(e.a)&&okPt(e.b);
 if(e.t==="x")return okPt(e.p);
 if(e.t==="p"){
  if(!Array.isArray(e.pts)||e.pts.length<2)return false;
  e.pts=e.pts.filter(okPt);
  return e.pts.length>1;
 }
 if(e.t==="a")return okPt(e.c)&&fin(e.r)&&e.r>0&&e.r<=MAXCO
  &&fin(e.a0)&&fin(e.a1);
 if(e.t==="t")return okPt(e.p)&&fin(e.h)&&e.h>0&&e.h<=MAXCO
  &&fin(e.rot);
 return false;
}
function put(x,e,sl){
 if(x.out.length>=x.cap){x.trunc++; return}
 if(!okEnt(e)){skip(x,"قيمة خارج المدى"); return}
 e.sl=sl||"0";
 x.src[e.sl]=(x.src[e.sl]||0)+1;
 x.out.push(e);
}
function tess(x,M,c,r,a0,a1,sl,dash){
 let sw=((a1-a0)%360+360)%360;
 if(sw<1e-6)sw=360;
 const n=clamp(Math.ceil(sw/7.5),6,96);
 const pts=[];
 for(let i=0;i<=n;i++){
  const a=(a0+sw*i/n)*D2R;
  pts.push(ap(M,[c[0]+r*Math.cos(a), c[1]+r*Math.sin(a)]).map(R));
 }
 const cl=(sw>=359.99)?1:0;
 if(cl)pts.pop();
 tick(x,n);
 put(x,{t:"p",pts,cl,dash:dash||null},sl);
}
function arcOut(x,M,c,r,a0,a1,sl){
 if(!fin(r)||r<=0)return;
 if(uni(M)){
  const k=sxOf(M), rr=rotOf(M);
  /* ═══ الاجتياح لا الطرفان ═══ P3-002
     deg() يطوي الزاوية إلى [0,360) فيُفقِد علامةَ الاجتياح: قوسٌ
     سالبٌ ٩٠° كان يعود موجباً ٢٧٠°، وقوسٌ يعبر الصفر كان ينقلب
     اتجاهه. البدايةُ تُطوى وحدها، والاجتياحُ يُضاف إليها كما هو. */
  const sw=(a1||0)-(a0||0);
  const s0=deg((a0||0)+rr);
  put(x,{t:"a",c:ap(M,c).map(R),r:R(r*k),a0:s0,a1:s0+sw},sl);
  return;
 }
 x.approx.arc++;                 /* مقياس غير متساوٍ أو معكوس */
 tess(x,M,c,r,a0,a1,sl);
}
const AL72=["l","c","r","l","c"];
const AL73=["b","b","m","t"];
const ATT=["","tl","tc","tr","ml","mc","mr","bl","bc","br"];
const mtClean=s=>String(s||"")
 .replace(/\\P/g," ").replace(/\\[A-Za-z][^;\\]*;/g,"")
 .replace(/[{}]/g,"").replace(/\\\\/g,"\\").trim();

function convert(list,M,B,depth,x){
 if(x.stop)return;
 for(const E of (list||[])){
  if(!tick(x))return;              /* الخروج من الحلقة لا تخطّيها */
  const g=E.g, sl=(STR(g,8,"0").trim()||"0");
  const T=E.type;
  if(T==="LINE"){
   /* 4.2: الإحداثيّ الإلزامي الناقص كان يصير صفراً عبر NUM،
      فيخرج خطٌّ صفريّ الطول بدل رفض الكيان المعطوب. */
   if(!(g[10]&&g[20]&&g[11]&&g[21])){
    skip(x,"LINE ناقص الإحداثيات"); continue;
   }
   put(x,{t:"l",a:ap(M,[NUM(g,10),NUM(g,20)]).map(R),
    b:ap(M,[NUM(g,11),NUM(g,21)]).map(R)},sl);
   continue;
  }
  if(T==="POINT"){
   put(x,{t:"x",p:ap(M,[NUM(g,10),NUM(g,20)]).map(R)},sl);
   continue;
  }
  if(T==="CIRCLE"){
   arcOut(x,M,[NUM(g,10),NUM(g,20)],NUM(g,40),0,360,sl);
   continue;
  }
  if(T==="ARC"){
   arcOut(x,M,[NUM(g,10),NUM(g,20)],NUM(g,40),
    NUM(g,50),NUM(g,51),sl);
   continue;
  }
  if(T==="LWPOLYLINE"||T==="POLYLINE"){
   const fl=INT(g,70,0);
   if(T==="POLYLINE"&&(fl&16||fl&64)){skip(x,"POLYMESH"); continue}
   const V=[];
   if(T==="LWPOLYLINE"){
    const xs=ARR(g,10), ys=ARR(g,20), bs=g[42]?ARR(g,42):[];
    const n0=Math.min(xs.length,ys.length);
    const n=Math.min(n0,MAXPTS);
    if(n<n0)x.clipped++;
    for(let i=0;i<n;i++){const pv={p:[xs[i],ys[i]],b:bs[i]||0}; V.push(pv)}
   }else{
    if(E.vcut)x.clipped++;
    (E.vs||[]).forEach(v=>V.push({
     p:[NUM(v,10),NUM(v,20)], b:NUM(v,42,0)}));
   }
   tick(x,V.length);          /* الرؤوس عملٌ يُحتسَب */
   if(V.length<2){
    if(V.length)put(x,{t:"x",p:ap(M,V[0].p).map(R)},sl);
    continue;
   }
   const cl=!!(fl&1);
   /* ═══ القطعة المنتفخة الواحدة ═══ P3-002
      قطعةٌ واحدةٌ مفتوحةٌ ذاتُ bulge هي قوسٌ حقيقيّ بطرفيه واتجاهه
      (هكذا يُصدَّر القوسُ السالب أعلاه). تُعاد قوساً لا مضلّعاً
      مقطّعاً، فيكتمل الذهاب والعودة بلا فقد. */
   if(!cl&&V.length===2&&V[0].b){
    const A=V[0].p, Bp=V[1].p, bg=+V[0].b;
    const dx=Bp[0]-A[0], dy=Bp[1]-A[1], ch=Math.hypot(dx,dy);
    const th=4*Math.atan(bg);
    const sn=Math.sin(Math.abs(th)/2);
    if(ch>1e-9&&sn>1e-9&&Math.abs(bg)<1e6){
     const rr=ch/(2*sn), h=rr*Math.cos(th/2);
     const sg=(th>0)?1:-1;
     const cx=(A[0]+Bp[0])/2-h*(dy/ch)*sg;
     const cy=(A[1]+Bp[1])/2+h*(dx/ch)*sg;
     if(isFinite(cx)&&isFinite(cy)&&isFinite(rr)&&rr<=MAXCO){
      const a0=Math.atan2(A[1]-cy,A[0]-cx)*R2D;
      arcOut(x,M,[cx,cy],rr,a0,a0+th*R2D,sl);
      continue;
     }
    }
   }
   const pts=[];
   const n=cl?V.length:V.length-1;
   for(let i=0;i<n;i++){
    const A=V[i].p, Bp=V[(i+1)%V.length].p;
    pts.push(ap(M,A).map(R));
    bulgePts(A,Bp,V[i].b).forEach(q=>pts.push(ap(M,q).map(R)));
   }
   if(!cl)pts.push(ap(M,V[V.length-1].p).map(R));
   put(x,{t:"p",pts,cl:cl?1:0},sl);
   continue;
  }
  if(T==="SOLID"||T==="TRACE"||T==="3DFACE"){
   const Q=[[10,20],[11,21],[13,23],[12,22]]
    .map(([a,b])=>ap(M,[NUM(g,a),NUM(g,b)]).map(R));
   const U=Q.filter((p,i)=>i===0
    ||Math.hypot(p[0]-Q[i-1][0],p[1]-Q[i-1][1])>1);
   if(U.length>2)put(x,{t:"p",pts:U,cl:1},sl);
   continue;
  }
  if(T==="TEXT"){
   const j72=INT(g,72,0), j73=INT(g,73,0);
   const use2=(j72>0||j73>0)&&g[11];
   const p=use2?[NUM(g,11),NUM(g,21)]:[NUM(g,10),NUM(g,20)];
   const hz=AL72[clamp(j72,0,4)]||"l";
   const vt=AL73[clamp(j73,0,3)]||"b";
   put(x,{t:"t",p:ap(M,p).map(R),
    s:String(STR(g,1,"")).replace(/%%[dcpu]/gi,""),
    h:Math.max(1,R(NUM(g,40,2.5)*sxOf(M))),
    rot:deg(NUM(g,50,0)+rotOf(M)),
    al:((vt==="t"||vt==="m")?"m":"b")+hz},sl);
   continue;
  }
  if(T==="MTEXT"){
   const s=mtClean((g[3]||[]).join("")+STR(g,1,""));
   if(!s)continue;
   const at=ATT[clamp(INT(g,71,1),1,9)]||"bl";
   put(x,{t:"t",p:ap(M,[NUM(g,10),NUM(g,20)]).map(R),s,
    h:Math.max(1,R(NUM(g,40,2.5)*sxOf(M))),
    rot:deg(NUM(g,50,0)+rotOf(M)),
    al:(at[0]==="b"?"b":"m")+at[1]},sl);
   continue;
  }
  if(T==="ELLIPSE"){
   x.approx.ellipse++;
   const c=[NUM(g,10),NUM(g,20)];
   const mj=[NUM(g,11),NUM(g,21)];
   const rt=NUM(g,40,1);
   const t0=NUM(g,41,0), t1=NUM(g,42,Math.PI*2);
   const ra=Math.hypot(mj[0],mj[1]);
   const ph=Math.atan2(mj[1],mj[0]);
   const full=Math.abs((t1-t0)-Math.PI*2)<1e-6;
   const n=clamp(Math.ceil(Math.abs(t1-t0)/(Math.PI/24)),8,96);
   tick(x,n);
   const pts=[];
   for(let i=0;i<=n;i++){
    const t=t0+(t1-t0)*i/n;
    const u=ra*Math.cos(t), v=ra*rt*Math.sin(t);
    pts.push(ap(M,[c[0]+u*Math.cos(ph)-v*Math.sin(ph),
     c[1]+u*Math.sin(ph)+v*Math.cos(ph)]).map(R));
   }
   if(full)pts.pop();
   put(x,{t:"p",pts,cl:full?1:0},sl);
   continue;
  }
  if(T==="SPLINE"){
   /* تقريبٌ متقطّع: التقطيع علامةُ التقريب فلا يُلبَس يقيناً */
   x.approx.spline++;
   const fx=ARR(g,11), fy=ARR(g,21);
   const cx=ARR(g,10), cy=ARR(g,20);
   const X=(fx.length>1)?fx:cx, Y=(fx.length>1)?fy:cy;
   const n0=Math.min(X.length,Y.length);
   const n=Math.min(n0,MAXPTS);
   if(n<n0)x.clipped++;
   tick(x,n);
   const pts=[];
   for(let i=0;i<n;i++)pts.push(ap(M,[X[i],Y[i]]).map(R));
   if(pts.length>1)
    put(x,{t:"p",pts,cl:(INT(g,70,0)&1)?1:0,dash:[600,400]},sl);
   continue;
  }
  if(T==="INSERT"||T==="DIMENSION"){
   const nm=STR(g,2,"").trim();
   const blk=B[nm];
   if(!blk){skip(x,T+" بلا بلوك"); continue}
   if(depth>=5){skip(x,"تعشيق عميق"); continue}
   if(T==="DIMENSION"){
    convert(blk.list,M,B,depth+1,x);
    continue;
   }
   const ins=[NUM(g,10),NUM(g,20)];
   const sx=NUM(g,41,1)||1, sy=NUM(g,42,1)||1;
   const rot=NUM(g,50,0)*D2R;
   const ca=Math.cos(rot), sa=Math.sin(rot);
   const cols=clamp(INT(g,70,1)||1,1,200);
   const rows=clamp(INT(g,71,1)||1,1,200);
   const cs=NUM(g,44,0), rs=NUM(g,45,0);
   if(cols*rows>400){skip(x,"مصفوفة INSERT كبيرة"); continue}
   /* الحلقة تُفحَص في كل تكرار: الحدّ الموضعيّ (٤٠٠) يحدّ هذا
      المستوى، والحاصل هو ما يُعلِّق — فالفحص هنا لا هناك. */
   for(let r0=0;r0<rows&&!x.stop;r0++)
   for(let c0=0;c0<cols&&!x.stop;c0++){
    if(!tick(x))break;
    const off={a:1,b:0,c:0,d:1,
     e:ins[0]+c0*cs*ca-r0*rs*sa,
     f:ins[1]+c0*cs*sa+r0*rs*ca};
    const RS={a:ca*sx,b:sa*sx,c:-sa*sy,d:ca*sy,e:0,f:0};
    const BB={a:1,b:0,c:0,d:1,e:-blk.base[0],f:-blk.base[1]};
    convert(blk.list, mul(M,mul(off,mul(RS,BB))), B, depth+1, x);
   }
   continue;
  }
  if(T==="VIEWPORT"||T==="ATTDEF"||T==="ATTRIB")continue;
  skip(x,T);
 }
}
/* ═══ المدخل ═══ */
export function parseDXF(txt,opt){
 const O=Object.assign({cap:MAXENT,unit:null,maxOps:MAXOPS,
  maxMs:MAXSEC},opt||{});
 const P=pairs(txt,O);
 if(!P.length)throw new Error("الملفّ لا يحمل أزواج DXF");
 const SX=sections(P), SEC=SX.sec;
 if(!SEC.ENTITIES)
  throw new Error("لا قسم ENTITIES — ليس ملفّ DXF صالحاً");
 /* البتر يُرفَض قبل التحويل: كيانٌ نصفُه مقروءٌ أسوأ من رفضٍ صريح */
 if(SX.open.length)
  throw new Error("ملفّ DXF مبتور — القسم "+SX.open[0]
   +" بلا ENDSEC؛ أعِد تصديره كاملاً");
 if(!hasEOF(P))
  throw new Error("ملفّ DXF مبتور — لا EOF في آخره؛"
   +" أعِد تصديره كاملاً");
 /* الترويسة */
 let iu=0, cp="";
 if(SEC.HEADER){
  const [a,b]=SEC.HEADER;
  for(let i=a;i<b;i++){
   if(P[i][0]!==9)continue;
   const k=String(P[i][1]).trim();
   for(let j=i+1;j<b&&P[j][0]!==9;j++){
    if(k==="$INSUNITS"&&P[j][0]===70)iu=parseInt(P[j][1],10)||0;
    if(k==="$DWGCODEPAGE"&&P[j][0]===3)cp=String(P[j][1]).trim();
   }
  }
 }
 const U=(O.unit!=null)?[String(O.unit),+O.unit||1]
  :(UNITS[iu]||UNITS[0]);
 /* معامل الوحدة يضرب كل إحداثيّ، فقيمةٌ شاذّة فيه تُفسِد الملفّ
    كلَّه بلا كلمة. وO.unit يأتي من قائمةٍ مغلقة في الواجهة، لكن
    الحرس رخيص — والقسر إلى ١ أصدق من نبذ الملفّ. */
 const f=(isFinite(U[1])&&U[1]>0&&U[1]<1e6)?U[1]:1;
 /* البلوكات */
 const B={};
 if(SEC.BLOCKS){
  const [a,b]=SEC.BLOCKS;
  let i=a;
  while(i<b){
   if(P[i][0]!==0){i++; continue}
   if(String(P[i][1]).trim()!=="BLOCK"){i++; continue}
   const hd=grab(P,i);
   const nm=STR(hd.g,2,"").trim();
   const base=[NUM(hd.g,10),NUM(hd.g,20)];
   const c=collect(P,hd.j,b);
   if(nm)B[nm]={base,list:c.list};
   i=c.end;
   if(i<b&&P[i][0]===0&&String(P[i][1]).trim()==="ENDBLK")
    i=grab(P,i).j;
  }
 }
 /* الكيانات — معامل الوحدة مصفوفةُ الجذر، فالحرس في put يقع
    بعد التحويل يقيناً */
 const x=mkCtx(O.cap,O.maxOps,O.maxMs);
 const [ea,eb]=SEC.ENTITIES;
 const E=collect(P,ea,eb);
 convert(E.list,{a:f,b:0,c:0,d:f,e:0,f:0},B,0,x);
 return {ents:x.out, src:x.src, skip:x.skip, trunc:x.trunc,
  approx:x.approx, blocks:Object.keys(B).length,
  units:{code:iu,name:U[0],f}, codepage:cp,
  guessed:(O.unit==null&&!UNITS[iu]),
  stop:x.stop, ops:x.ops, clipped:x.clipped,
  ms:Date.now()-x.t0};
}
/* drop: مفاتيحُ تُذكَر برسالةٍ خاصّة فلا تُعاد في الملخّص العامّ */
export const skipSummary=(s,drop)=>Object.keys(s||{})
 .filter(k=>!(drop||[]).includes(k))
 .map(k=>`${k} ×${s[k]}`).join(" · ");
