/* ═══ المرجع المستورد ═══
   جامدٌ بالتصميم: لا يُحدَّد ولا يُحرَّر ولا يدخل الاتحاد ولا الحلقات
   ولا المساحات ولا البصمات. تراه وتقيس عليه وتلتقط نقاطه، ثم ترسم
   جدرانك فوقه بيدك — ولا يُستنتَج منه جدار.

   الإحداثيات تُخزَّن مرّةً بالمليمتر، والتحويل يُخزَّن صريحاً
   ويُطبَّق عند العرض — فالمحاذاة المتكرّرة لا تتراكم. */
import {S,touch,refBump} from "./state.js";
import {clamp,deg,D2R,R2D} from "./units.js";
import {dist,bboxOf,bboxUnion} from "./geom.js";
import {PT} from "./coords.js";
import {LIM} from "./limits.js";

const R=v=>Math.round(v);
export const RLAY="A-REFR";
export const hasRef=()=>!!(S.ref&&S.ref.ents&&S.ref.ents.length);
export const refCount=()=>hasRef()?S.ref.ents.length:0;
export const KIND={l:"خطّ",p:"مضلّع",a:"قوس",t:"نصّ",x:"نقطة"};

/* ═══ التحويل ═══ */
export const refTr=()=>{
 const t=(S.ref&&S.ref.tr)||{};
 return {k:(+t.k||1), rot:deg(+t.rot||0),
  dx:R(+t.dx||0), dy:R(+t.dy||0)};
};
export const isIdent=()=>{
 const t=refTr();
 return Math.abs(t.k-1)<1e-9&&t.rot===0&&!t.dx&&!t.dy;
};
export function mapper(round){
 const t=refTr(), a=t.rot*D2R;
 const ca=Math.cos(a)*t.k, sa=Math.sin(a)*t.k;
 return (round===false)
  ? p=>[p[0]*ca-p[1]*sa+t.dx, p[0]*sa+p[1]*ca+t.dy]
  : p=>[R(p[0]*ca-p[1]*sa+t.dx), R(p[0]*sa+p[1]*ca+t.dy)];
}
/* تركيب تحويلٍ متشابهٍ جديد على القائم — لا استبدال، فلا نفقد
   المعايرة السابقة عند المحاذاة */
export function applySim(m,adeg,tx,ty){
 const t=refTr(), a=adeg*D2R;
 const ca=Math.cos(a), sa=Math.sin(a);
 S.ref.tr={
  k:clamp(t.k*m,1e-4,1e4),
  rot:deg(t.rot+adeg),
  dx:R(m*(t.dx*ca-t.dy*sa)+tx),
  dy:R(m*(t.dx*sa+t.dy*ca)+ty)};
 touch();
 return S.ref.tr;
}
export function alignRef(p1,p2,q1,q2){
 const d1=dist(p1,p2), d2=dist(q1,q2);
 if(d1<1)throw new Error("نقطتا المرجع متطابقتان");
 if(d2<1)throw new Error("نقطتا الهدف متطابقتان");
 const m=d2/d1;
 const a=deg(Math.atan2(q2[1]-q1[1],q2[0]-q1[0])*R2D
  -Math.atan2(p2[1]-p1[1],p2[0]-p1[0])*R2D);
 const ar=a*D2R, ca=Math.cos(ar), sa=Math.sin(ar);
 applySim(m,a, q1[0]-m*(p1[0]*ca-p1[1]*sa),
               q1[1]-m*(p1[0]*sa+p1[1]*ca));
 return {k:m,rot:a,from:d1,to:d2};
}
export function calRef(p1,p2,real){
 const d=dist(p1,p2);
 if(d<1)throw new Error("النقطتان متطابقتان");
 if(!(real>=1))throw new Error("المسافة الحقيقية غير صالحة");
 const m=real/d;
 applySim(m,0, p1[0]*(1-m), p1[1]*(1-m));
 return {k:m,was:d,now:real};
}
export function moveRef(from,to){
 applySim(1,0, to[0]-from[0], to[1]-from[1]);
 return {dx:to[0]-from[0], dy:to[1]-from[1]};
}
export function resetRef(){
 S.ref.tr={k:1,rot:0,dx:0,dy:0};
 touch();
}
/* ═══ التحميل والإزالة ═══ */
/* ═══ setRef — 2.5 ═══
   كان يقبل ما يجيء من القارئ بلا فحصٍ ثانٍ. والقارئ (io/dxfin.js)
   يفحص فعلاً، لكنّ setRef منفذٌ ثانٍ (اختبارٌ، أو استيرادٌ من غير
   القارئ): حدُّ عددٍ صريح، وفحصٌ لكلّ كيانٍ بالحدود نفسها
   (limits.js) — فحدٌّ واحدٌ لا ينجرف. ما يُنبَذ يُعدّ ويُكتَب في
   res.rejected ليُبلِّغ المستدعي، ولا يدخل الحالة. */
function okRefEnt(e){
 if(!e||typeof e!=="object")return false;
 const okp=p=>!!PT(p);
 const t=e.t;
 if(t==="l")return okp(e.a)&&okp(e.b);
 if(t==="p")return Array.isArray(e.pts)&&e.pts.length>1
  &&e.pts.length<=LIM.refPts.max&&e.pts.every(okp);
 if(t==="a")return okp(e.c)&&typeof e.r==="number"&&isFinite(e.r)
  &&e.r>0&&e.r<=LIM.coord.max;
 if(t==="t")return okp(e.p)&&typeof e.s==="string"&&e.s.length>0;
 if(t==="x")return okp(e.p);
 return false;
}
export function setRef(res,name){
 const ents=Array.isArray(res.ents)?res.ents:[];
 if(ents.length>LIM.refEnts.max)
  throw new Error(`المرجع ${ents.length} كياناً — الأقصى ${LIM.refEnts.max}`);
 const good=ents.filter(okRefEnt);
 /* الهويّة تُحفَظ إن لم يُنبَذ شيء: مخزنُ REFS يوازن بالهويّة */
 res.rejected=ents.length-good.length;
 S.ref={name:String(name||"").slice(0,80),
  units:(res.units&&res.units.name)||"",
  uf:(res.units&&res.units.f)||1, enc:res.enc||"",
  guessed:res.guessed?1:0,
  tr:{k:1,rot:0,dx:0,dy:0},
  ents:res.rejected?good:ents, src:res.src||{}, off:{},
  skip:res.skip||{}, trunc:res.trunc||0,
  approx:res.approx||{}};
 refBump();          /* نسخةٌ جديدة: اللقطات بعدها تشير إليها */
 touch();
 return S.ref;
}
export function clearRef(){
 const n=refCount();
 S.ref={name:"",units:"",uf:1,enc:"",guessed:0,
  tr:{k:1,rot:0,dx:0,dy:0},ents:[],src:{},off:{},
  skip:{},trunc:0,approx:{}};
 refBump();
 touch();
 return n;
}
/* ═══ طبقات المصدر ═══
   ملفّ DXF يحمل عشرات الطبقات، أكثرها ضجيج. الإخفاء هنا فرديّ
   وداخل المرجع، ولا علاقة له بطبقات مِسطَر. */
export const srcOn=n=>!(S.ref.off&&S.ref.off[n]);
export function srcSet(n,off){
 if(!S.ref.off)S.ref.off={};
 if(off)S.ref.off[n]=1; else delete S.ref.off[n];
 touch();
 return srcOn(n);
}
export const srcList=()=>Object.keys(S.ref.src||{})
 .sort((a,b)=>(S.ref.src[b]-S.ref.src[a])||a.localeCompare(b));
export const srcShown=()=>srcList().filter(srcOn).length;
export const visEnts=()=>hasRef()
 ? S.ref.ents.filter(e=>srcOn(e.sl||"0")) : [];

/* ═══ الأوّليات ═══ */
export function refPrims(){
 if(!hasRef())return [];
 const P=mapper(), t=refTr(), out=[];
 visEnts().forEach(e=>{
  if(e.t==="l")out.push({t:"line",L:RLAY,a:P(e.a),b:P(e.b),
   dash:e.dash||null,ref:1});
  else if(e.t==="p"){
   if(!e.pts||e.pts.length<2)return;
   out.push({t:"poly",L:RLAY,pts:e.pts.map(P),
    cl:e.cl?1:0,dash:e.dash||null,ref:1});
  }
  else if(e.t==="a"){
   const c=P(e.c);
   out.push({t:"arc",L:RLAY,cx:c[0],cy:c[1],
    r:Math.max(1,R(e.r*t.k)),
    a0:deg(e.a0+t.rot),a1:deg(e.a1+t.rot),ref:1});
  }
  else if(e.t==="t"){
   const p=P(e.p);
   out.push({t:"text",L:RLAY,s:e.s,x:p[0],y:p[1],
    h:Math.max(1,R(e.h*t.k)),rot:deg((e.rot||0)+t.rot),
    al:e.al||"bl",ref:1});
  }
  else if(e.t==="x"){
   const p=P(e.p), d=Math.max(30,R(60*t.k));
   out.push({t:"line",L:RLAY,ref:1,
    a:[p[0]-d,p[1]], b:[p[0]+d,p[1]]});
   out.push({t:"line",L:RLAY,ref:1,
    a:[p[0],p[1]-d], b:[p[0],p[1]+d]});
  }
 });
 return out;
}
export function refBBox(){
 if(!hasRef())return null;
 const P=mapper(), t=refTr();
 let B=null;
 visEnts().forEach(e=>{
  if(e.t==="l")B=bboxUnion(B,bboxOf([P(e.a),P(e.b)]));
  else if(e.t==="p")B=bboxUnion(B,bboxOf(e.pts.map(P)));
  else if(e.t==="a"){
   const c=P(e.c), r=e.r*t.k;
   B=bboxUnion(B,{x0:c[0]-r,y0:c[1]-r,x1:c[0]+r,y1:c[1]+r});
  }
  else B=bboxUnion(B,bboxOf([P(e.p)]));
 });
 return B;
}
/* ═══ نقاط الالتقاط ═══
   شبكة خلايا تُبنى مرّةً لكل نسخة حالة — فالتقاطٌ على ملفٍّ كبير
   لا يمسح ستّين ألف كيان في كل حركة مؤشّر. */
const CELL=2000, MAXPT=240000;
let GRID=null, GVER=-1;
const key=(x,y)=>Math.floor(x/CELL)+","+Math.floor(y/CELL);
function addPt(G,p,kind,n){
 if(n.c>=MAXPT)return;
 const k=key(p[0],p[1]);
 let a=G.get(k);
 if(!a){a=[]; G.set(k,a)}
 a.push({p:[R(p[0]),R(p[1])],kind});
 n.c++;
}
const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
function build(){
 const G=new Map(), n={c:0};
 if(!hasRef())return G;
 const P=mapper(false), t=refTr();
 visEnts().forEach(e=>{
  if(e.t==="l"){
   const a=P(e.a), b=P(e.b);
   addPt(G,a,"end",n); addPt(G,b,"end",n);
   addPt(G,mid(a,b),"mid",n);
  }else if(e.t==="p"){
   const q=e.pts.map(P);
   const m=e.cl?q.length:q.length-1;
   q.forEach(p=>addPt(G,p,"end",n));
   for(let i=0;i<m;i++)
    addPt(G,mid(q[i],q[(i+1)%q.length]),"mid",n);
  }else if(e.t==="a"){
   const c=P(e.c), r=e.r*t.k;
   addPt(G,c,"cen",n);
   for(let i=0;i<4;i++){
    const a=(i*90+t.rot)*D2R;
    addPt(G,[c[0]+r*Math.cos(a),c[1]+r*Math.sin(a)],"qua",n);
   }
   const s=(e.a0+t.rot)*D2R, f=(e.a1+t.rot)*D2R;
   addPt(G,[c[0]+r*Math.cos(s),c[1]+r*Math.sin(s)],"end",n);
   addPt(G,[c[0]+r*Math.cos(f),c[1]+r*Math.sin(f)],"end",n);
  }else addPt(G,P(e.p),"ins",n);
 });
 return G;
}
export function refGrid(){
 if(GVER===S.__ver&&GRID)return GRID;
 GRID=build();
 GVER=S.__ver;
 return GRID;
}
/* أقرب نقطة مرجعية داخل نصف قطر — أو null */
export function refSnap(x,y,r){
 if(!hasRef())return null;
 if(!+((S.os&&S.os.ref)!=null?S.os.ref:1))return null;
 const G=refGrid(), rad=Math.max(1,r||150);
 let best=null, bd=rad;
 const cx=Math.floor(x/CELL), cy=Math.floor(y/CELL);
 for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){
  const a=G.get((cx+i)+","+(cy+j));
  if(!a)continue;
  for(const q of a){
   const d=Math.hypot(q.p[0]-x,q.p[1]-y);
   if(d<bd){bd=d; best={p:q.p,kind:q.kind,d,src:"ref"}}
  }
 }
 return best;
}
export const refSnapCount=()=>{
 let n=0;
 refGrid().forEach(a=>{n+=a.length});
 return n;
};
/* ═══ التقرير ═══ */
export function refStats(){
 if(!hasRef())return null;
 const B=refBBox(), t=refTr();
 const by={};
 S.ref.ents.forEach(e=>{by[e.t]=(by[e.t]||0)+1});
 return {name:S.ref.name, n:refCount(), shown:visEnts().length,
  units:S.ref.units, guessed:!!S.ref.guessed, enc:S.ref.enc,
  layers:srcList().length, shownLayers:srcShown(),
  k:t.k, rot:t.rot, dx:t.dx, dy:t.dy, by, bbox:B,
  skip:S.ref.skip||{}, trunc:S.ref.trunc||0,
  approx:S.ref.approx||{}};
}
