/* ═══ الجدران ═══
   الجدار كائن صريح: مسار a→b وسماكة ومحاذاة.
   لا heal · لا لحم تلقائي · لا تقريب صامت — ما رسمته هو ما يُخزَّن.

   align: أي وجه يقع عليه المسار المرسوم
     c  المسار في المنتصف
     l  المسار على الوجه الأيسر  (الجسم يمتدّ يميناً)
     r  المسار على الوجه الأيمن  (الجسم يمتدّ يساراً)
   واليسار واليمين بالنسبة لاتجاه الرسم a→b. */
import {S,VER,touchGeom} from "./state.js";
import {V} from "./validate.js";
import {newId,R2D,clamp,m3} from "./units.js";
import {bandPoly,nearOnSeg,pip,bboxOf,distSeg,cleanRing} from "./geom.js";
import {LIM} from "./limits.js";
import {isArc,arcParams,arcSegsTol} from "./arcmath.js";
import {normLevel} from "./level.js";
/* إعادة تصدير للتوافق: من كان يستورد isArc/arcParams من walls.js يبقى
   عاملاً. المصدر الحقيقيّ الآن core/arcmath.js. */
export {isArc,arcParams};

const R=v=>Math.round(v);
export const MINW=50;                 /* أقصر جدار مقبول */
export const TMIN=50, TMAX=1000;      /* حدود السماكة */

export const WTYPE={
 ext:{n:"خارجي",lay:"A-WALL"},
 int:{n:"داخلي",lay:"A-WALL"},
 low:{n:"سترة", lay:"A-WALL-LOW"}};
export const ALIGN={c:"مركزي",l:"الوجه الأيسر",r:"الوجه الأيمن"};
export const isWType=t=>!!WTYPE[t];
export const isLow=w=>!!(w&&w.type==="low");
export const lowH=w=>Math.max(200,Math.round(+(w&&w.h)||1000));

export function dir(w){
 if(!w||!w.a||!w.b)return null;
 const dx=w.b[0]-w.a[0], dy=w.b[1]-w.a[1], L=Math.hypot(dx,dy);
 if(L<1e-6)return null;
 const ux=dx/L, uy=dy/L;
 return {ux,uy,nx:-uy,ny:ux,L,ang:Math.atan2(uy,ux)*R2D};
}
const straightLen=w=>(w&&w.a&&w.b)
 ? Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]) : 0;
/* طول الجدار: الوتر للمستقيم، وطول القوس الفعلي للقوسي — BOQ
   والفاحص وأي مستهلكٍ آخر يريد الطول الحقيقي لا الوتر، فلا نُبقي
   الفرق صامتاً (يخالف عقد المشروع). */
export const wallLen=w=>{
 if(!isArc(w))return straightLen(w);
 const P=arcParams(w);
 return P?Math.abs(P.sweep)*P.R:straightLen(w);
};

/* ═══ الجدران القوسية ═══
   القوس يُمثَّل بحقلٍ اختياريّ bulge = tan(θ/4) بأسلوب DXF: θ زاوية
   القوس المحصورة من a إلى b، وإشارته تحدّد الجهة (موجب = عكس عقارب
   الساعة). bulge=0/غياب ⇒ جدارٌ مستقيمٌ بسلوكه القديم تماماً.
   والقوسُ يُقطَّع إلى مضلّعٍ في band() فيمرّ عبر الالتقاط والمناطق
   والصناديق دون أن تعرف بقيّةُ المحرّك أنه قوس. */
/* عدد القطع كافٍ لنعومةٍ لا تُرى زواياها في أي تكبير معقول */
const arcSegs=P=>arcSegsTol(P,LIM.arcTol.def);
/* نقاط على القوس المُزاح off عن مساره (off=0 المسار نفسه).
   الإزاحة نصفُ قطرٍ نحو المركز أو بعيداً عنه بحسب الإشارة. */
export function arcTess(w,off){
 const P=arcParams(w);
 if(!P)return null;
 const N=arcSegs(P), out=[];
 /* الجهة: القوس عكس/مع الساعة يحدّد أيّ إزاحةٍ تُقرِّب من المركز.
    نستعمل نصف قطرٍ فعّال: R - off*sign(sweep) لا يهم للبناء طالما
    الوجهان متماثلان في band. */
 const s=(P.sweep>=0)?1:-1;
 const Roff=P.R - (off||0)*s;
 /* ═══ دفاعٌ ثانٍ ═══
    addWall يرفضها عند الإنشاء، وهذا الفحص يمسك ما تسلّل من
    ملفٍّ محرَّرٍ يدوياً أو من إصدارٍ أقدم أو من patchٍ مستقبليّ.
    الرفض صامت (null) لأن band يعرف كيف يتعامل مع الغياب —
    فيسقط الجدار من الاتحاد بلا انفجار، وتكشفه الطبقة الثالثة
    عند التحميل التالي (ensureShape يطرح bulge فيعود مستقيماً). */
 if(Roff<=1)return null;
 for(let i=0;i<=N;i++){
  const a=P.a0+P.sweep*i/N;
  out.push([P.cx+Roff*Math.cos(a), P.cy+Roff*Math.sin(a)]);
 }
 return out;
}
export function arcLen(w){
 const P=arcParams(w);
 return P?Math.abs(P.sweep)*P.R:wallLen(w);
}
/* ═══ نقاط القوس الفعلية ═══
   dir/centerLine/faces كلُّها تعمل على الوتر: منتصفُ الوتر ليس على
   الجسم أصلاً (ربع دائرةٍ نصف قطرها ١ م: ٢٩٣ مم عن القوس)، ووجهاه
   المحسوبان بإزاحة الوتر ليسا وجهَي الجدار. فما يريد نقطةً على
   القوس أو قرباً منه يسأل هذه الدوالّ، لا الوتر.

   القوسُ متماثلٌ حول مساره دائماً (band لا تقرأ align)، فمساره هو
   محور جسمه. */
/* نقطةٌ على القوس عند الجزء u∈[0,1] من مداه، مُزاحةً off عن مساره
   بالاصطلاح نفسه في arcTess (موجب = نحو الخارج للقوس الموجب). */
export function arcPoint(w,u,off){
 const P=arcParams(w);
 if(!P)return null;
 const s=(P.sweep>=0)?1:-1;
 const Ro=P.R-(off||0)*s;
 if(Ro<=1)return null;
 const a=P.a0+P.sweep*clamp(u,0,1);
 return [P.cx+Ro*Math.cos(a), P.cy+Ro*Math.sin(a)];
}
export function arcMidPoint(w){
 const p=arcPoint(w,0.5,0);
 return p?[R(p[0]),R(p[1])]:null;
}
/* هل الزاوية a داخل مدى القوس؟ — الفرق موقَّعاً مطبَّعاً إلى مدى
   الاتجاه (لا مقارنة خامّة: القوس قد يعبر ±π) */
const inSweep=(P,a)=>{
 const TAU=2*Math.PI;
 let d=(a-P.a0)%TAU;
 if(P.sweep>=0){ if(d<0)d+=TAU; return d<=P.sweep+1e-9; }
 if(d>0)d-=TAU;
 return d>=P.sweep-1e-9;
};
/* أقربُ نقطةٍ على مسار القوس من (x,y): على الدائرة إن وقعت زاويتها
   داخل المدى، وإلا فأقربُ طرفَي القوس. تعيد {p,d} كما nearOnSeg. */
export function arcNear(w,x,y){
 const P=arcParams(w);
 if(!P)return nearOnSeg(w.a,w.b,x,y);
 const th=Math.atan2(y-P.cy,x-P.cx);
 if(Math.hypot(x-P.cx,y-P.cy)>1e-9&&inSweep(P,th)){
  const p=[P.cx+P.R*Math.cos(th),P.cy+P.R*Math.sin(th)];
  return {p,d:Math.hypot(p[0]-x,p[1]-y)};
 }
 const da=Math.hypot(w.a[0]-x,w.a[1]-y), db=Math.hypot(w.b[0]-x,w.b[1]-y);
 return da<=db?{p:[w.a[0],w.a[1]],d:da}:{p:[w.b[0],w.b[1]],d:db};
}
/* أقدامُ العمود من نقطةٍ على المسار: العمودُ على الدائرة يمرّ
   بمركزها، فالقدمان على الشعاع من المركز عبر النقطة (في الاتجاهين)،
   وتُقبَل ما وقعت في المدى. */
export function arcPerp(w,x,y){
 const P=arcParams(w);
 if(!P||Math.hypot(x-P.cx,y-P.cy)<1e-9)return [];
 const th=Math.atan2(y-P.cy,x-P.cx);
 return [th,th+Math.PI].filter(a=>inSweep(P,a))
  .map(a=>[P.cx+P.R*Math.cos(a),P.cy+P.R*Math.sin(a)]);
}
/* حساب bulge من ثلاث نقاط: بداية، نهاية، ونقطة على القوس */
export function bulgeFrom3(a,b,onArc){
 const ax=a[0],ay=a[1],bx=b[0],by=b[1],px=onArc[0],py=onArc[1];
 /* مركز الدائرة المارّة بالنقاط الثلاث */
 const d=2*(ax*(by-py)+bx*(py-ay)+px*(ay-by));
 if(Math.abs(d)<1e-6)return 0;               /* على استقامة */
 const ux=((ax*ax+ay*ay)*(by-py)+(bx*bx+by*by)*(py-ay)
   +(px*px+py*py)*(ay-by))/d;
 const uy=((ax*ax+ay*ay)*(px-bx)+(bx*bx+by*by)*(ax-px)
   +(px*px+py*py)*(bx-ax))/d;
 const cx=ux, cy=uy;
 const a0=Math.atan2(ay-cy,ax-cx);
 const a1=Math.atan2(by-cy,bx-cx);
 const ap=Math.atan2(py-cy,px-cx);
 /* الاتّجاه: هل النقطة على القوس بين a وb عكس الساعة؟ */
 const norm=x=>{while(x<=-Math.PI)x+=2*Math.PI;while(x>Math.PI)x-=2*Math.PI;return x};
 let sweepCCW=norm(a1-a0); if(sweepCCW<0)sweepCCW+=2*Math.PI;
 let toP=norm(ap-a0); if(toP<0)toP+=2*Math.PI;
 let sweep=(toP<=sweepCCW)?sweepCCW:(sweepCCW-2*Math.PI);
 const bg=Math.tan(sweep/4);
 return Math.abs(bg)<1e-4?0:clamp(bg,-8,8);
}

/* إزاحة محور الجسم عن المسار على العمود الأيسر n=(-uy,ux) */
export const alignOff=w=>{
 const t=(w&&w.t)||0;
 return (w.align==="l")?(-t/2):((w.align==="r")?(t/2):0);
};
/* الخطّ المركزي الفعلي — عليه تُقاس الفتحات */
export function centerLine(w){
 const d=dir(w);
 if(!d)return null;
 const o=alignOff(w);
 return {a:[w.a[0]+d.nx*o, w.a[1]+d.ny*o],
         b:[w.b[0]+d.nx*o, w.b[1]+d.ny*o]};
}
/* جسم الجدار مستطيلاً — بلا أي تعديل على البيانات.
   القوسي: شريطٌ بين قوسين مُزاحين ±t/2، مضلّعاً مغلقاً. */
export function band(w){
 if(isArc(w)){
  const outer=arcTess(w, w.t/2), inner=arcTess(w, -w.t/2);
  if(!outer||!inner)return null;
  const poly=outer.concat(inner.slice().reverse())
   .map(p=>[R(p[0]),R(p[1])]);
  return cleanRing(poly,0.5);
 }
 const c=centerLine(w);
 if(!c)return null;
 return bandPoly(c.a[0],c.a[1],c.b[0],c.b[1],w.t);
}
/* وجهَا الجدار قطعتين — لأدوات القياس والمرجع */
export function faces(w){
 const c=centerLine(w), d=dir(w);
 if(!c||!d)return null;
 const h=w.t/2;
 return {
  l:[[R(c.a[0]+d.nx*h),R(c.a[1]+d.ny*h)],
     [R(c.b[0]+d.nx*h),R(c.b[1]+d.ny*h)]],
  r:[[R(c.a[0]-d.nx*h),R(c.a[1]-d.ny*h)],
     [R(c.b[0]-d.nx*h),R(c.b[1]-d.ny*h)]]};
}
/* ═══ خريطة المعرّفات ═══
   على النسخة الهندسية: تحرّكُ بُعدٍ أو نصٍّ لا يبنيها من جديد. */
let MAP=null, MVER=-1, MREF=null;
export function wallById(id){
 if(MVER!==VER.g || MREF!==S.walls){
  MAP=new Map();
  S.walls.forEach(w=>MAP.set(w.id,w));
  MVER=VER.g; MREF=S.walls;
 }
 return MAP.get(id)||null;
}
export function addWall(a,b,t,type,align,h,bulge){
 /* 2.3: لا NaN ولا نقطةٌ ناقصة تدخل الحالة (D04) */
 V("wall",{a,b,t,type,align,h,bulge});
 const A=[R(a[0]),R(a[1])], B=[R(b[0]),R(b[1])];
 const len=Math.hypot(B[0]-A[0],B[1]-A[1]);
 if(len<MINW)
  throw new Error("الطول أقل من 5 سم");
 /* ═══ السقفُ المعلن يُفرَض ═══ P4-008
    LIM.length.max كان معلناً ولا يُفحَص هنا: إحداثيّان صالحان داخل
    ±1e9 يعطيان طولاً 2e9، فيدخل الحالةَ جدارٌ يخالف عقدَها المعلن.
    الفحصُ بعد التقريب وقبل الإدخال. */
 if(len>LIM.length.max)
  throw new Error(`الطول ${Math.round(len)} مم أكبر من الحدّ `
   +`${LIM.length.max} مم`);
 const ty=isWType(type)?type:"int";
 const df=(ty==="ext")?S.meta.tExt
  :((ty==="low")?S.meta.tLow:S.meta.tInt);
 const w={id:newId("W"),a:A,b:B,
  t:clamp(R(t||df),TMIN,TMAX), type:ty,
  align:ALIGN[align]?align:"c",
  level:normLevel(S.meta.level)};
 if(ty==="low")w.h=Math.max(200,R(h||S.meta.lowH));
 const bg=+bulge;
 if(isFinite(bg)&&Math.abs(bg)>1e-4){
  w.bulge=clamp(bg,-8,8);
  /* ═══ فحص نصف القطر ═══
     القوس يُبنى شريطاً بين قوسين مُزاحين ±t/2 عن مساره. فإن كان
     نصف قطره أصغر من نصف السماكة صار نصفُ القطر الفعّال سالباً
     لأحد الجانبين، فيُرسم القوس معكوساً مرآةً حول مركزه، ويتقاطع
     المضلّع مع نفسه، وpolyBool يستقبل مضلّعاً مريراً فيفسد
     الاتحادُ والبصماتُ والالتقاط صامتاً.

     والرفض هنا لا القسر: قوسٌ بهذا الشكل لا معنى هندسيّاً له،
     وقسرُه إلى مستقيم يخالف «ما رسمته هو ما يُخزَّن». */
  const P=arcParams(w);
  if(!P)
   throw new Error("القوس غير قابل للبناء — نقطتاه متطابقتان");
  if(w.t/2>=P.R-1)
   throw new Error(
    `القوس: نصف قطره ${m3(P.R)} م لا يكفي سماكة الجدار `
    +`${m3(w.t)} م — الأدنى لنصف القطر ${m3(w.t/2+1)} م. `
    +`صغّر السماكة أو كبّر انحناء القوس`
   );
 }
 S.walls.push(w); touchGeom();
 return w;
}
export function delWall(w){
 const i=S.walls.indexOf(w);
 if(i<0)return false;
 S.walls.splice(i,1); touchGeom();
 return true;
}
/* إصابة: داخل الجسم أوّلاً، وإلا قرب المسار بتفاوت الشاشة.
   list مرشَّحو الفهرس — والغياب يعني المسح الكامل. */
export function wallAt(x,y,tol,list){
 let best=null,bd=1/0;
 (list||S.walls).forEach(w=>{
  const p=band(w);
  /* القوسيّ يُقاس من مساره الفعلي لا من وتره: الوترُ يُصيب حيث لا
     جسم (منتصفُه ٢٩٣ مم عن قوسٍ ربعيّ) ويُخطئ الجسمَ الذي يُرى. */
  const arc=isArc(w);
  if(p&&pip(p,x,y)){
   let d;
   if(arc)d=arcNear(w,x,y).d;
   else{
    const c=centerLine(w);
    d=nearOnSeg(c.a,c.b,x,y).d;
   }
   if(d<bd){bd=d;best=w}
   return;
  }
  const r=arc?arcNear(w,x,y):nearOnSeg(w.a,w.b,x,y);
  if(r.d<(tol||200)&&r.d<bd){bd=r.d;best=w}
 });
 return best;
}
export const wallsBBox=()=>{
 const P=[];
 S.walls.forEach(w=>{
  const p=band(w);
  if(p)p.forEach(q=>P.push(q));
  else{P.push(w.a);P.push(w.b)}
 });
 return bboxOf(P);
};
/* ═══ فهرس صناديق الأجسام ═══
   شبكةٌ بخلايا مترين — كشبكة الأطراف وشبكة المراسي، وبعقدها:
   تُبنى مرّةً لكل نسخةٍ هندسية.

   تخدم بصمة المناطق: كانت تمسح S.walls كلَّها وتبني band لكلٍّ،
   لكل منطقةٍ في كل إطار — خمسون منطقةً وثلاث مئة جدارٍ = ١٥٠٠٠
   بناء band. وموضعها هنا لا في core/sindex لأن areas → sindex
   → entreg → areas دورةٌ حقيقية: جسم entreg يُنفَّذ أوّلاً فيقع
   areaById في نطاق التصريح المؤقّت. والمشروع يتجنّبها سلفاً
   بتمرير المرشَّحين وسيطاً (colOnWall · fixOnWall). */
const BCELL=2000;
let BG=null, BGV=-1, BGREF=null;
function bandGrid(){
 if(BGV===VER.g && BG && BGREF===S.walls) return BG;
 const g=new Map(), big=[];
 const put=(k,i)=>{
  let a=g.get(k);
  if(!a){a=[]; g.set(k,a)}
  a.push(i);
 };
 S.walls.forEach((w,i)=>{
  const b=bboxOf(band(w)||[w.a,w.b]);
  if(!b){big.push(i); return}
  const x0=Math.floor(b.x0/BCELL), x1=Math.floor(b.x1/BCELL);
  const y0=Math.floor(b.y0/BCELL), y1=Math.floor(b.y1/BCELL);
  /* الجدار الممتدّ لا يُحشَر في مئة خليّة: يُفحَص دائماً */
  if((x1-x0+1)*(y1-y0+1)>64){big.push(i); return}
  for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++)
   put(cx+","+cy,i);
 });
 BG={g,big}; BGV=VER.g; BGREF=S.walls;
 return BG;
}
/* الجدران التي قد يلمس جسمها الصندوق — مرشَّحون لا قرار.
   والترتيب بترتيب S.walls فلا يتبدّل جوابٌ يعتمد عليه، ولا
   تتبدّل بصمةُ منطقةٍ محفوظة. */
export function wallsIn(box){
 if(!box)return S.walls.slice();
 const {g,big}=bandGrid();
 const x0=Math.floor(box.x0/BCELL), x1=Math.floor(box.x1/BCELL);
 const y0=Math.floor(box.y0/BCELL), y1=Math.floor(box.y1/BCELL);
 if((x1-x0+1)*(y1-y0+1)>4096)return S.walls.slice();
 const seen=new Set(big);
 for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++){
  const a=g.get(cx+","+cy);
  if(a)a.forEach(i=>seen.add(i));
 }
 return [...seen].sort((a,b)=>a-b).map(i=>S.walls[i]);
}
export const bandGridStats=()=>{
 const {g,big}=bandGrid();
 return {cells:g.size,big:big.length,ver:BGV};
};
/* ═══ الأطراف غير المتّصلة — معلومة عرض لا تعديل ═══
   الطرف حرّ إن لم يلامس مسار جدار آخر بتفاوت مذكور.
   تُرسَم عليه علامة، ولا يُلحَم إلا بأمرك على تحديد صريح.

   كاش على النسخة الهندسية وعلى تفاوت الاستدعاء معاً — يُستدعى مع
   كل حركة مؤشّر عبر drawEnds. وكان على النسخة العامّة، فيُعاد
   بناؤه مع كل إطارٍ أثناء سحب أي شيء. */
const ECELL=2000;
function segGrid(){
 const g=new Map();
 const put=(k,i)=>{
  let a=g.get(k);
  if(!a){a=[]; g.set(k,a)}
  a.push(i);
 };
 S.walls.forEach((w,i)=>{
  const x0=Math.floor(Math.min(w.a[0],w.b[0])/ECELL);
  const x1=Math.floor(Math.max(w.a[0],w.b[0])/ECELL);
  const y0=Math.floor(Math.min(w.a[1],w.b[1])/ECELL);
  const y1=Math.floor(Math.max(w.a[1],w.b[1])/ECELL);
  /* جدارٌ ممتدّ جدّاً يُفحَص دائماً بدل أن يُحشَر في مئة خليّة */
  if((x1-x0+1)*(y1-y0+1)>64){put("*",i); return}
  for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++)
   put(cx+","+cy,i);
 });
 return g;
}
let LCACHE=null, LVER=-1, LTOL=null;
export function looseEnds(tol){
 const T=Math.max(1,tol==null?2:tol);
 if(LVER===VER.g&&LTOL===T&&LCACHE)return LCACHE;
 const G=segGrid();
 const r=Math.ceil(T/ECELL);
 const test=(list,p,skip)=>{
  if(!list)return false;
  for(const j of list){
   if(j===skip)continue;
   const w=S.walls[j];
   if(distSeg(w.a,w.b,p[0],p[1])<=T)return true;
  }
  return false;
 };
 const free=(p,skip)=>{
  const cx=Math.floor(p[0]/ECELL), cy=Math.floor(p[1]/ECELL);
  for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)
   if(test(G.get((cx+i)+","+(cy+j)),p,skip))return false;
  return !test(G.get("*"),p,skip);
 };
 const out=[];
 S.walls.forEach((w,i)=>{
  [["a",w.a],["b",w.b]].forEach(([k,p])=>{
   if(!free(p,i))return;
   out.push({id:w.id,end:k,p:p.slice(),w});
  });
 });
 LCACHE=out; LVER=VER.g; LTOL=T;
 return LCACHE;
}

