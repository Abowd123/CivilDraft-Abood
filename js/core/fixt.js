/* ═══ الأدوات الصحية والمطبخية ═══
   رموزٌ فوق الجسم لا جزءٌ منه: لا تدخل الاتحاد ولا تقطع جداراً ولا
   تُطرَح منه — لأنها أثاثٌ لا بناء.

   الإطار المحلّي: الأصل ظهر الأداة (ما يلاصق الجدار)، u على عرضها
   و v إلى الأمام. فوضعها على جدار يعني ضبط دورانها وحده.
   والإلصاق أمرٌ يُنفَّذ عند الوضع، لا رابطةٌ تُحفَظ. */
import {S,touchView} from "./state.js";
import {V} from "./validate.js";
import {newId,clamp,D2R,deg,dm2} from "./units.js";
import {pip,bboxOf,bboxHit,nearOnSeg,distSeg,segSeg,
        convexHit} from "./geom.js";
import {band} from "./walls.js";
import {normLevel} from "./level.js";

const R=v=>Math.round(v);
export const FK={
 wc:    {n:"كرسي إفرنجي", w:400,  d:700},
 bidet: {n:"شطّاف",        w:380,  d:600},
 ur:    {n:"مبولة",        w:380,  d:350},
 lav:   {n:"مغسلة",        w:550,  d:450},
 sink:  {n:"حوض مطبخ",     w:800,  d:500},
 shower:{n:"دُش",           w:900,  d:900},
 tub:   {n:"بانيو",        w:1700, d:750},
 wm:    {n:"غسّالة",        w:600,  d:600},
 fd:    {n:"صفاية أرضية",  w:150,  d:150},

 /* ═══ أثاث ═══ P-جديد (الأولوية ٦)
    كانت تسعُ قطعٍ صحيةٍ وحدَها: بلا أثاثٍ لا يُقنِع المخطَّطُ عميلاً
    ولا يُختبَر اتّساعُ غرفةٍ فعلاً. المقاساتُ مقاساتُ سوقٍ شائعة
    بالمليمتر، وكلُّها قابلةٌ للتعديل في الشريط.
    و`lay` لكلِّ نوعٍ طبقتُه: الأثاثُ على A-FURN يُطفَأ وحدَه. */
 bed1:  {n:"سرير مفرد",    w:1000, d:2000, lay:"A-FURN"},
 bed2:  {n:"سرير مزدوج",   w:1600, d:2000, lay:"A-FURN"},
 sofa2: {n:"كنبة مقعدين",  w:1500, d:850,  lay:"A-FURN"},
 sofa3: {n:"كنبة ثلاثة",   w:2100, d:900,  lay:"A-FURN"},
 tablr: {n:"طاولة مستطيلة",w:1600, d:900,  lay:"A-FURN"},
 tablc: {n:"طاولة دائرية", w:1200, d:1200, lay:"A-FURN"},
 chair: {n:"كرسي",          w:450,  d:500,  lay:"A-FURN"},
 desk:  {n:"مكتب",          w:1400, d:700,  lay:"A-FURN"},
 wardr: {n:"خزانة ملابس",   w:1800, d:600,  lay:"A-FURN"},
 kcab:  {n:"خزانة مطبخ",    w:600,  d:600,  lay:"A-FURN"},
 fridge:{n:"ثلاجة",         w:700,  d:700,  lay:"A-FURN"},
 stove: {n:"بوتاجاز",       w:600,  d:600,  lay:"A-FURN"},

 /* ═══ كهرباء ═══ P-جديد (الأولوية ٥)
    المخطَّطُ المعماريُّ العربيُّ يُطلب منه مخطَّطُ كهرباءٍ دائماً، وكانت
    هذه الطبقةُ غائبةً بالكامل. والرموزُ رموزٌ لا أجسام: مقاسُها
    مقاسُ رمزٍ على الورق لا مقاسُ الجهاز، فلا يُقاس بشريطِ قياس.
    وكلُّها على A-ELEC فتُطفَأ طبقةُ الخدمات بنقرة. */
 sw1:   {n:"مفتاح مفرد",    w:200,  d:100, lay:"A-ELEC"},
 sw2:   {n:"مفتاح مزدوج",   w:260,  d:100, lay:"A-ELEC"},
 swd:   {n:"مفتاح باهت",    w:220,  d:120, lay:"A-ELEC"},
 soc:   {n:"فيشة عادية",    w:200,  d:120, lay:"A-ELEC"},
 soc2:  {n:"فيشة مزدوجة",   w:300,  d:120, lay:"A-ELEC"},
 socw:  {n:"فيشة محميّة",   w:220,  d:140, lay:"A-ELEC"},
 lampc: {n:"إنارة سقف",     w:300,  d:300, lay:"A-ELEC"},
 lampw: {n:"إنارة جدار",    w:260,  d:140, lay:"A-ELEC"},
 spot:  {n:"سبوت",           w:160,  d:160, lay:"A-ELEC"},
 fan:   {n:"مروحة سقف",     w:1200, d:1200,lay:"A-ELEC"},
 exfan: {n:"شفّاط",          w:300,  d:300, lay:"A-ELEC"},
 db:    {n:"لوحة توزيع",    w:500,  d:150, lay:"A-ELEC"},
 tel:   {n:"نقطة هاتف/شبكة",w:200,  d:120, lay:"A-ELEC"},
 tv:    {n:"نقطة تلفاز",    w:200,  d:120, lay:"A-ELEC"},
 ac:    {n:"مكيّف سبليت",    w:900,  d:220, lay:"A-ELEC"}
};
/* طبقةُ النوع: الصحّياتُ على A-FIXT كما كانت، وما أُعلِن له lay
   يذهب إليها. مصدرٌ واحدٌ يقرؤه الرسمُ وسجلُّ الكيانات معاً. */
/* ═══ ما يقف حرّاً أو يُعلَّق بالسقف ═══ لا يُلصَق بالجدار افتراضاً (tools/parts.js)
   ولا يُنبَّه أنّ «ظهره لا يلاصق جداراً» (core/inspect.js) — مصدرٌ واحد للاثنين. */
export const FREE_KINDS=new Set(["lampc","spot","fan","tablr","tablc","chair","fd"]);
export const fixFree=f=>FREE_KINDS.has(f&&f.kind);
/* المعلَّقُ بالسقف لا يصطدم بما على الأرض: إنارةٌ فوق طاولةٍ وضعٌ صحيح */
export const CEIL_KINDS=new Set(["lampc","spot","fan"]);
export const fixCeil=f=>CEIL_KINDS.has(f&&f.kind);
export const fkLay=k=>(FK[k]&&FK[k].lay)||"A-FIXT";
export const fixLay=f=>fkLay(f&&f.kind);
/* تصنيفٌ للواجهة: ثلاثُ مجموعاتٍ لا قائمةٌ من أربعين */
export const FGROUP={
 "A-FIXT":"صحّيات", "A-FURN":"أثاث", "A-ELEC":"كهرباء"
};
export const fkOfGroup=lay=>FKINDS.filter(k=>fkLay(k)===lay);
export const FKINDS=Object.keys(FK);
export const fkOf=k=>FK[k]||FK.wc;
export const fixById=id=>S.fixt.find(f=>f.id===id)||null;
export const fixW=f=>Math.max(80,+((f&&f.w))||fkOf(f&&f.kind).w);
export const fixD=f=>Math.max(80,+((f&&f.d))||fkOf(f&&f.kind).d);
export const fixName=f=>fkOf(f&&f.kind).n;

/* الإطار: P(u,v) — u على العرض من المركز، v من الظهر إلى الأمام */
export function frameOf(f){
 const a=(f.rot||0)*D2R, ca=Math.cos(a), sa=Math.sin(a);
 const m=(f.mir?-1:1);
 return (u,v)=>[R(f.x+(u*m)*ca-v*sa), R(f.y+(u*m)*sa+v*ca)];
}
export function fixPoly(f){
 const P=frameOf(f), w=fixW(f)/2, d=fixD(f);
 return [P(-w,0),P(w,0),P(w,d),P(-w,d)];
}
export const fixBBox=f=>bboxOf(fixPoly(f));
export const fixCenter=f=>{
 const P=frameOf(f);
 return P(0,fixD(f)/2);
};
export const fixAt=(x,y)=>{
 let best=null,ba=1/0;
 S.fixt.forEach(f=>{
  if(!pip(fixPoly(f),x,y))return;
  const a=fixW(f)*fixD(f);
  if(a<ba){ba=a;best=f}
 });
 return best;
};
export function addFix(kind,p,rot,ex){
 V("fix",{p,rot});                    /* 2.3 */
 /* ═══ D3-03 ═══ نوعٌ مجهول لا يُستبدَل بـ"wc" صامتاً — الاستبدال
    الصامت يُخفي خطأً برمجياً (استدعاءٌ بنوعٍ خاطئ) خلف أداةٍ صحية
    ظاهرة الصحة. ارمِ خطأً بدل ذلك. */
 if(!FK[kind])
  throw new Error(`نوع أداة صحية مجهول «${String(kind).slice(0,40)}» — `
   +`الأنواع المتاحة: ${FKINDS.join("، ")}`);
 const K=kind;
 const d=fkOf(K);
 const f={id:newId("F"),kind:K,x:R(p[0]),y:R(p[1]),
  rot:deg(+rot||0), w:d.w, d:d.d,
  level:normLevel(S.meta.level)};
 if(ex){
  if(ex.w)f.w=clamp(R(ex.w),80,4000);
  if(ex.d)f.d=clamp(R(ex.d),80,4000);
  if(ex.mir)f.mir=1;
 }
 S.fixt.push(f); touchView();
 return f;
}
export function delFix(f){
 const i=S.fixt.indexOf(f);
 if(i<0)return false;
 S.fixt.splice(i,1); touchView();
 return true;
}
/* ═══ الإسناد إلى جدار ═══
   يبحث عن أقرب وجهِ جدارٍ ويعيد الموضع والدوران — أمرٌ يُنفَّذ عند
   الوضع، لا رابطةٌ تُحفَظ. الأداة بعده إحداثيات صريحة. */
export function snapToWall(p,tol){
 const T=Math.max(50,tol||1200);
 let best=null, bd=T;
 S.walls.forEach(w=>{
  const bp=band(w);
  if(!bp)return;
  for(let i=0;i<bp.length;i++){
   const A=bp[i], B=bp[(i+1)%bp.length];
   const r=nearOnSeg(A,B,p[0],p[1]);
   if(r.d>=bd)continue;
   const dx=B[0]-A[0], dy=B[1]-A[1], L=Math.hypot(dx,dy);
   if(L<1)continue;
   /* العمود الداخل إلى الفراغ: من الوجه نحو النقطة */
   let nx=-dy/L, ny=dx/L;
   if((p[0]-r.p[0])*nx+(p[1]-r.p[1])*ny<0){nx=-nx;ny=-ny}
   bd=r.d;
   best={p:[R(r.p[0]),R(r.p[1])],
    rot:deg(Math.atan2(ny,nx)*180/Math.PI-90),
    wall:w.id, d:R(r.d)};
  }
 });
 return best;
}
/* المسافةُ بين قطعتين — الظهرُ مع وجه الجدار. محلّيّةٌ لا مُصدَّرة:
   عقدُ هذا الملفّ لا عقدُ الهندسة. */
const segGap=(p,q,a,b)=>segSeg(p,q,a,b)?0
 :Math.min(distSeg(a,b,p[0],p[1]), distSeg(a,b,q[0],q[1]),
           distSeg(p,q,a[0],a[1]), distSeg(p,q,b[0],b[1]));

export function fixOnWall(f,tol,walls){
 const T=(tol==null)?120:tol;
 const P=frameOf(f), w=fixW(f)/2;
 const p=P(-w,0), q=P(w,0);      /* الظهرُ قطعةٌ لا ثلاثُ نقاط:
    ثلاثُ عيّناتٍ تفوت جداراً قصيراً يقع بينها. */
 const fb=bboxOf([p,q]);
 for(const wl of (walls||S.walls)){
  const bp=band(wl);
  if(!bp)continue;
  const wb=bboxOf(bp);
  if(!wb||!bboxHit(wb,fb,T))continue;
  for(let i=0;i<bp.length;i++)
   if(segGap(p,q,bp[i],bp[(i+1)%bp.length])<=T)return wl.id;
 }
 return null;
}
export function fixOverlap(a,b){
 const A=fixPoly(a), B=fixPoly(b);
 if(!bboxHit(bboxOf(A),bboxOf(B),-1))return false;
 return convexHit(A,B,-1);
}
/* ═══ الرموز ═══ */
const ELL=(P,cu,cv,ru,rv,n)=>{
 const out=[], N=n||20;
 for(let i=0;i<N;i++){
  const a=i/N*Math.PI*2;
  out.push(P(cu+ru*Math.cos(a), cv+rv*Math.sin(a)));
 }
 return out;
};
export function fixPrims(f){
 const L=fixLay(f), out=[], P=frameOf(f);
 const w=fixW(f), d=fixD(f), hw=w/2;
 const LN=(a,b)=>out.push({t:"line",L,a,b,fid:f.id});
 const PL=(pts,cl)=>out.push({t:"poly",L,pts,
  cl:cl===0?0:1,fid:f.id});
 const AR=(c,r)=>out.push({t:"arc",L,cx:c[0],cy:c[1],
  r:R(Math.max(2,r)),a0:0,a1:359.9,fid:f.id});
 const K=f.kind;

 if(K==="wc"||K==="bidet"){
  /* خزّان عند الظهر ثم قصعة بيضاوية */
  const tk=d*0.20;
  PL([P(-hw,0),P(hw,0),P(hw,tk),P(-hw,tk)],1);
  PL(ELL(P,0,tk+(d-tk)*0.52,hw*0.92,(d-tk)*0.50,22),1);
  if(K==="wc")LN(P(0,tk),P(0,tk+(d-tk)*0.12));
  return out;
 }
 if(K==="ur"){
  PL([P(-hw,0),P(hw,0),P(hw,d*0.30),
      P(hw*0.62,d*0.86),P(0,d),P(-hw*0.62,d*0.86),
      P(-hw,d*0.30)],1);
  PL(ELL(P,0,d*0.46,hw*0.52,d*0.30,16),1);
  return out;
 }
 if(K==="lav"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  PL(ELL(P,0,d*0.52,hw*0.74,d*0.34,22),1);
  AR(P(0,d*0.52),Math.min(hw,d)*0.07);
  LN(P(0,0),P(0,d*0.12));                   /* الخلّاط */
  return out;
 }
 if(K==="sink"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  const g=Math.min(w,d)*0.08;
  PL([P(-hw+g,g),P(hw-g,g),P(hw-g,d-g),P(-hw+g,d-g)],1);
  AR(P(-w*0.22,d*0.5),Math.min(hw,d)*0.06);
  AR(P( w*0.22,d*0.5),Math.min(hw,d)*0.06);
  LN(P(0,0),P(0,g*1.4));
  return out;
 }
 if(K==="shower"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  LN(P(-hw,0),P(hw,d)); LN(P(hw,0),P(-hw,d));
  AR(P(0,d*0.5),Math.min(hw,d)*0.11);
  return out;
 }
 if(K==="tub"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  const g=Math.min(w,d)*0.09;
  PL(ELL(P,0,d*0.5,hw-g,d*0.5-g,26),1);
  AR(P(-hw+g*2.2,d*0.5),Math.min(hw,d)*0.06);
  return out;
 }
 if(K==="wm"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  AR(P(0,d*0.55),Math.min(hw,d)*0.42);
  LN(P(-hw,d*0.18),P(hw,d*0.18));
  return out;
 }
 if(K==="fd"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  LN(P(-hw,0),P(hw,d)); LN(P(hw,0),P(-hw,d));
  return out;
 }

 /* ═══ أثاث ═══ P-جديد
    صندوقٌ خارجيٌّ ثم ملامحُ تميّزُ القطعةَ بالعين من فوق — لا
    تفصيلٌ لا يُقرأ بمقياس 1:100. */
 if(K==="bed1"||K==="bed2"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  LN(P(-hw,d*0.22),P(hw,d*0.22));               /* حدُّ الوسادة */
  const pw=(K==="bed2")?hw*0.44:hw*0.72;
  const pg=hw-pw*(K==="bed2"?2:1)*0.5;
  if(K==="bed2"){
   PL([P(-hw+pg*0.4,d*0.04),P(-pw*0.1,d*0.04),
       P(-pw*0.1,d*0.18),P(-hw+pg*0.4,d*0.18)],1);
   PL([P(pw*0.1,d*0.04),P(hw-pg*0.4,d*0.04),
       P(hw-pg*0.4,d*0.18),P(pw*0.1,d*0.18)],1);
  }else{
   PL([P(-pw*0.5,d*0.04),P(pw*0.5,d*0.04),
       P(pw*0.5,d*0.18),P(-pw*0.5,d*0.18)],1);
  }
  LN(P(-hw,d*0.62),P(hw,d*0.62));               /* ثنيةُ الغطاء */
  return out;
 }
 if(K==="sofa2"||K==="sofa3"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  const bk=d*0.26, ar=w*0.11;
  LN(P(-hw,bk),P(hw,bk));                        /* الظهر */
  LN(P(-hw+ar,bk),P(-hw+ar,d));                  /* المسندان */
  LN(P(hw-ar,bk),P(hw-ar,d));
  const n=(K==="sofa3")?3:2;
  const iw=(w-2*ar)/n;
  for(let i=1;i<n;i++)
   LN(P(-hw+ar+iw*i,bk),P(-hw+ar+iw*i,d));
  return out;
 }
 if(K==="tablr"||K==="desk"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  if(K==="desk")LN(P(-hw,d*0.78),P(hw,d*0.78));  /* حدُّ الدُرج */
  return out;
 }
 if(K==="tablc"){
  AR(P(0,d*0.5),Math.min(hw,d*0.5));
  return out;
 }
 if(K==="chair"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  LN(P(-hw,d*0.22),P(hw,d*0.22));                /* الظهر */
  return out;
 }
 if(K==="wardr"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  /* قطرانِ من الظهر: اصطلاحُ «خزانةٌ تُفتَح إلى الأمام» */
  LN(P(-hw,0),P(0,d)); LN(P(hw,0),P(0,d));
  return out;
 }
 if(K==="kcab"){
  /* خزانةُ المطبخ تُرسَم بحدِّ سطحِ العمل لا بقطرَي الخزانة:
     فتُفرَّق عن خزانة الملابس بالعين لا بالمقاس وحده. */
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  LN(P(-hw,d*0.86),P(hw,d*0.86));              /* حدُّ سطح العمل */
  LN(P(-hw,0),P(hw,d*0.86));                   /* قطرٌ واحد */
  return out;
 }
 if(K==="fridge"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  LN(P(-hw,d*0.72),P(hw,d*0.72));
  AR(P(0,d*0.36),Math.min(hw,d)*0.13);
  return out;
 }
 if(K==="stove"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  const r=Math.min(hw,d)*0.17;
  [[-0.26,0.32],[0.26,0.32],[-0.26,0.72],[0.26,0.72]]
   .forEach(([u,v])=>AR(P(u*w,v*d),r));
  return out;
 }

 /* ═══ كهرباء ═══ P-جديد
    رموزٌ اصطلاحية: دائرةٌ على خطِّ الجدار للفيشة، ودائرةٌ بأشعّةٍ
    للإنارة، وشَولةٌ للمفتاح — تُقرأ من فوق بمقياس 1:100. */
 if(K==="sw1"||K==="sw2"||K==="swd"){
  /* المفتاح: دائرةٌ صغيرةٌ على الجدار وذراعٌ مائل، والعددُ شُرَطٌ */
  const r=Math.min(hw,d)*0.55;
  AR(P(0,d*0.5),r);
  LN(P(0,d*0.5),P(hw*0.9,d*1.5));
  const n=(K==="sw2")?2:1;
  for(let i=0;i<n;i++)
   LN(P(hw*0.55+i*hw*0.3,d*1.1),P(hw*0.85+i*hw*0.3,d*1.6));
  if(K==="swd")AR(P(0,d*0.5),r*0.45);           /* الباهتُ بقلبٍ */
  return out;
 }
 if(K==="soc"||K==="soc2"||K==="socw"||K==="tel"||K==="tv"){
  /* الفيشة: نصفُ دائرةٍ مفتوحةٌ إلى الأمام وقاعدةٌ على الجدار */
  const r=Math.min(hw,d)*0.8;
  LN(P(-hw,0),P(hw,0));
  out.push({t:"arc",L,cx:P(0,0)[0],cy:P(0,0)[1],r:R(Math.max(2,r)),
   a0:R((f.rot||0)),a1:R((f.rot||0)+180),fid:f.id});
  const n=(K==="soc2")?2:1;
  for(let i=0;i<n;i++)
   LN(P(-r*0.3+i*r*0.6,r*0.25),P(-r*0.3+i*r*0.6,r*0.75));
  if(K==="socw")PL([P(-r,r*0.9),P(r,r*0.9),P(r,r*1.2),
   P(-r,r*1.2)],1);                              /* غلافُ الحماية */
  if(K==="tel")LN(P(-r*0.5,r*0.5),P(r*0.5,r*0.5));
  if(K==="tv"){LN(P(-r*0.5,r*0.4),P(r*0.5,r*0.4));
   LN(P(0,r*0.4),P(0,r*0.9))}
  return out;
 }
 if(K==="lampc"||K==="spot"){
  const r=Math.min(hw,d*0.5);
  AR(P(0,d*0.5),r*0.52);
  if(K==="lampc"){
   /* أشعّةٌ أربع: الاصطلاحُ المعماريُّ للإنارة السقفية */
   LN(P(-r,d*0.5),P(-r*0.55,d*0.5));
   LN(P(r*0.55,d*0.5),P(r,d*0.5));
   LN(P(0,d*0.5-r),P(0,d*0.5-r*0.55));
   LN(P(0,d*0.5+r*0.55),P(0,d*0.5+r));
  }else AR(P(0,d*0.5),r*0.2);
  return out;
 }
 if(K==="lampw"){
  LN(P(-hw,0),P(hw,0));
  AR(P(0,d*0.55),Math.min(hw,d)*0.42);
  LN(P(0,0),P(0,d*0.2));
  return out;
 }
 if(K==="fan"||K==="exfan"){
  const r=Math.min(hw,d*0.5);
  AR(P(0,d*0.5),r);
  if(K==="fan"){
   /* أربعُ ريشٍ بخطوطٍ قطرية */
   [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([a,b])=>
    LN(P(0,d*0.5),P(a*r*0.72,d*0.5+b*r*0.72)));
  }else{
   LN(P(-r*0.7,d*0.5-r*0.7),P(r*0.7,d*0.5+r*0.7));
   LN(P(r*0.7,d*0.5-r*0.7),P(-r*0.7,d*0.5+r*0.7));
  }
  return out;
 }
 if(K==="db"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  const g=Math.min(w,d)*0.16;
  PL([P(-hw+g,g*0.6),P(hw-g,g*0.6),P(hw-g,d-g*0.6),
      P(-hw+g,d-g*0.6)],1);
  LN(P(-hw+g,d*0.5),P(hw-g,d*0.5));
  return out;
 }
 if(K==="ac"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  /* شبكُ النفخ: ثلاثةُ خطوطٍ موازيةٍ للوجه */
  [0.4,0.6,0.8].forEach(t=>LN(P(-hw*0.9,d*t),P(hw*0.9,d*t)));
  return out;
 }
 /* المجهول: صندوقٌ وقطران — لا غيابَ صامت */
 PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
 LN(P(-hw,0),P(hw,d)); LN(P(hw,0),P(-hw,d));
 return out;
}
export const fixLabel=f=>`${fixName(f)} ${dm2(fixW(f),fixD(f),"م")}`;
