/* ═══ التأشير: الأبعاد والسلاسل والنصوص والمحاور ═══
   البُعد نقطتان صريحتان وموضعُ خطٍّ صريح. لا يرتبط بجدار ولا يزحف:
   القيمة المعروضة تُحسب من نقطتيه المخزَّنتين، فإن تغيّرت الهندسة
   بقي حيث هو وأُبلغتَ أنه «معلَّق».
   السلسلة قيَمٌ مكتوبة لا مطابَقة: تُرسَم كما كتبتها، والمقارنة
   بالهندسة تقريرٌ يُطلَب لا تصحيحٌ يقع. */
import {S,VER,edit,touchView,txtH} from "./state.js";
import {V} from "./validate.js";
import {newId,clamp,norm,deg,D2R,R2D,rng} from "./units.js";
import {dist,bboxOf,distSeg} from "./geom.js";
import {arcParams} from "./arcmath.js";
import {band} from "./walls.js";
import {styleOf,dsOk} from "./dimstyles.js";
import {LIM} from "./limits.js";

const R=v=>Math.round(v);
export const DK={h:"أفقي",v:"رأسي",al:"محاذٍ",rad:"نصف قطر",dia:"قطر",ang:"زاوي"};
export const dimById  =id=>S.dims.find(d=>d.id===id)||null;
export const chainById=id=>S.chains.find(c=>c.id===id)||null;
export const annoById =id=>S.anno.find(a=>a.id===id)||null;

/* ═══ القيمة والصيغة ═══ */
export const dimValue=d=>{
 if(!d)return 0;
 if(d.kind==="h")return Math.abs(d.b[0]-d.a[0]);
 if(d.kind==="v")return Math.abs(d.b[1]-d.a[1]);
 if(d.kind==="rad")return Math.abs(+d.r||0);
 if(d.kind==="dia")return Math.abs(+d.r||0)*2;
 if(d.kind==="ang"){
  /* زاويّ: من a0/a1 إن وُجدتا، وإلا من p1/vertex/p2 */
  let a0=d.a0, a1=d.a1;
  if(a0==null||a1==null){
   if(!d.vertex||!d.p1||!d.p2)return 0;
   a0=Math.atan2(d.p1[1]-d.vertex[1],d.p1[0]-d.vertex[0])*R2D;
   a1=Math.atan2(d.p2[1]-d.vertex[1],d.p2[0]-d.vertex[0])*R2D;
  }
  let diff=Math.abs(a1-a0)%360;
  if(diff>180)diff=360-diff;
  return diff; /* بالدرجات — ليس مم */
 }
 return dist(d.a,d.b);
};
export const fmtLen=(v,dec)=>{
 const n=clamp(Math.round((dec==null)?(parseInt(S.meta.dimDec,10)||0):dec),0,3);
 return ((v||0)/1000).toFixed(n);
};
export const fmtAng=v=>(Math.abs(+v||0)).toFixed(1)+"°";
export const dimText=(d,dec)=>{
 if(d.txt)return String(d.txt);
 if(d.kind==="ang")return fmtAng(dimValue(d));
 if(d.kind==="rad")return "R "+fmtLen(dimValue(d),dec);
 if(d.kind==="dia")return "⌀ "+fmtLen(dimValue(d),dec);
 return fmtLen(dimValue(d),dec);
};
export const isOverridden=d=>!!(d&&d.txt);
/* ═══ حلّ هيئة الكيان (بُعد أو سلسلة) عبر طرازه الاختياري ═══
   غياب e.style أو جهالته يعيد الافتراضي من meta — انظر styleOf. */
const tickOf=e=>styleOf(e&&e.style).tick;
const decOf =e=>styleOf(e&&e.style).dec;
const hOf   =e=>styleOf(e&&e.style).hMul;

/* ═══ هندسة البُعد ═══
   pos: للأفقي y خطّ البُعد · للرأسي x · للمحاذي إزاحة عمودية موقَّعة */
export function dimGeom(d){
 if(!d||!d.a||!d.b)return null;     /* القطريُّ والزاويُّ لهما dimGeomRad/Ang */
 if(d.kind==="h"){
  const y=d.pos;
  return {p1:[d.a[0],y], p2:[d.b[0],y], u:[1,0], n:[0,1], rot:0};
 }
 if(d.kind==="v"){
  const x=d.pos;
  return {p1:[x,d.a[1]], p2:[x,d.b[1]], u:[0,1], n:[-1,0], rot:90};
 }
 const dx=d.b[0]-d.a[0], dy=d.b[1]-d.a[1], L=Math.hypot(dx,dy);
 if(L<1)return null;
 const ux=dx/L, uy=dy/L, nx=-uy, ny=ux, o=d.pos;
 return {p1:[R(d.a[0]+nx*o),R(d.a[1]+ny*o)],
         p2:[R(d.b[0]+nx*o),R(d.b[1]+ny*o)],
         u:[ux,uy], n:[nx,ny], rot:deg(Math.atan2(uy,ux)*R2D)};
}
/* ═══ هندسة القطري والزاويّ ═══ */
export function dimGeomRad(d){
 if(!d||(d.kind!=="rad"&&d.kind!=="dia"))return null;
 if(!d.c||!isFinite(d.r))return null;
 return {c:[R(d.c[0]),R(d.c[1])], r:Math.abs(+d.r),
  leader:d.leader?[R(d.leader[0]),R(d.leader[1])]:null};
}
export function dimGeomAng(d){
 if(!d||d.kind!=="ang")return null;
 if(!d.vertex)return null;
 let a0=d.a0, a1=d.a1, r=Math.abs(+d.r||2000);
 if(a0==null||a1==null){
  if(!d.p1||!d.p2)return null;
  a0=Math.atan2(d.p1[1]-d.vertex[1],d.p1[0]-d.vertex[0])*R2D;
  a1=Math.atan2(d.p2[1]-d.vertex[1],d.p2[0]-d.vertex[0])*R2D;
 }
 /* طبّع إلى -180..180 */
 a0=deg(a0); a1=deg(a1);
 let sweep=a1-a0;
 while(sweep<=-180)sweep+=360;
 while(sweep>180)sweep-=360;
 return {vertex:[R(d.vertex[0]),R(d.vertex[1])], a0, a1:a0+sweep,
  r:R(r), sweep};
}
/* منتصفُ البُعد لموضع الملاحظة — والقطريُّ عند نصّه والزاويُّ عند رأسه.
   كان يمرّر كلَّ بُعدٍ إلى dimGeom فيسقط الفاحص (F7) ببُعد نصف قطر:
   «Cannot read properties of undefined (reading '0')». */
export const dimMid=d=>{
 if(d&&(d.kind==="rad"||d.kind==="dia")){const p=d.leader||d.c; return p?[R(p[0]),R(p[1])]:[0,0]}
 if(d&&d.kind==="ang"){const p=d.vertex; return p?[R(p[0]),R(p[1])]:[0,0]}
 const g=dimGeom(d);
 return g?[R((g.p1[0]+g.p2[0])/2),R((g.p1[1]+g.p2[1])/2)]:[0,0];
};
/* موضع خطّ البُعد من نقرة — يُخزَّن إحداثياً لا إزاحةً محسوبة */
export function posFromPt(kind,a,b,p){
 if(kind==="h")return R(p[1]);
 if(kind==="v")return R(p[0]);
 const dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy);
 if(L<1)return 0;
 return R(((p[0]-a[0])*(-dy/L))+((p[1]-a[1])*(dx/L)));
}
/* ═══ البُعد المعلَّق ═══
   طرفٌ لا يصادف عقدةً ولا وجهاً — تقريرٌ بصريّ لا تعديل.
   والمراسي من الجدران وحدها، فمفتاحها النسخة الهندسية: كانت على
   النسخة العامّة فتُبنى مع كل إطارٍ أثناء سحب أي شيء. */
let ANC=null, ANCV=-1;
export function anchors(){
 if(ANCV===VER.g&&ANC)return ANC;
 const P=[];
 S.walls.forEach(w=>{
  P.push(w.a,w.b);
  const b=band(w);
  if(b)b.forEach(q=>P.push(q));
 });
 ANC=P; ANCV=VER.g;
 return P;
}
const ACELL=500;
let AG=null, AGV=-1;
/* مراسي الربط (للبُعد المعلَّق وحده — chainCompare يبقى على أركان الجدران):
   ومعها مركزُ الجدار القوسيّ («بعد نصف قطر» يلتقطه) ومراكزُ الأعمدة
   ورؤوسُ الخطوط المتعدّدة (رأسُ «بعد زاوي» يقع عليها). */
function linkAnchors(){
 const P=anchors().slice();
 S.walls.forEach(w=>{const A=arcParams(w); if(A)P.push([Math.round(A.cx),Math.round(A.cy)])});
 (S.cols||[]).forEach(c=>{if(isFinite(c.x)&&isFinite(c.y))P.push([c.x,c.y])});
 (S.plines||[]).forEach(p=>(p.pts||[]).forEach(q=>P.push(q)));
 return P;
}
function anchorGrid(){
 if(AGV===VER.g&&AG)return AG;
 const g=new Map();
 linkAnchors().forEach(p=>{
  const k=Math.floor(p[0]/ACELL)+","+Math.floor(p[1]/ACELL);
  let a=g.get(k);
  if(!a){a=[]; g.set(k,a)}
  a.push(p);
 });
 AG=g; AGV=VER.g;
 return AG;
}
function nearAnchor(p,T){
 const G=anchorGrid();
 const r=Math.ceil(T/ACELL);
 const cx=Math.floor(p[0]/ACELL), cy=Math.floor(p[1]/ACELL);
 for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++){
  const a=G.get((cx+i)+","+(cy+j));
  if(!a)continue;
  for(const q of a)
   if(Math.abs(q[0]-p[0])<=T&&Math.abs(q[1]-p[1])<=T)return true;
 }
 return false;
}
/* ═══ وجوهُ الجدران ═══ طرفُ البُعد على وجه جدارٍ (لا ركنه) مربوطٌ أيضاً —
   «أبعاد الغرفة» تقيس بين الوجوه الداخلية، فركنُها تقاطعُ وجهين لا ركنُ
   جدار. كان هذا يُعدّ «معلَّقاً» فيصيح الفاحصُ على بُعدٍ صحيحٍ أنشأه البرنامج. */
let FACES=null, FV=-1;
function faces(){
 if(FV===VER.g&&FACES)return FACES;
 const L=[];
 S.walls.forEach(w=>{
  const b=band(w); if(!b||b.length<2)return;
  for(let i=0;i<b.length;i++){
   const a=b[i], c=b[(i+1)%b.length];
   L.push({a,b:c,x0:Math.min(a[0],c[0]),x1:Math.max(a[0],c[0]),y0:Math.min(a[1],c[1]),y1:Math.max(a[1],c[1])});
  }
 });
 FACES=L; FV=VER.g; return L;
}
function onFace(p,T){
 for(const f of faces()){
  if(p[0]<f.x0-T||p[0]>f.x1+T||p[1]<f.y0-T||p[1]>f.y1+T)continue;
  if(distSeg(f.a,f.b,p[0],p[1])<=T)return true;
 }
 return false;
}
const attached=(p,T)=>!!p&&(nearAnchor(p,T)||onFace(p,T));
export function dimLoose(d,tol){
 const T=Math.max(1,tol||30);
 if(d.kind==="rad"||d.kind==="dia")return !nearAnchor(d.c,T);
 if(d.kind==="ang")return !nearAnchor(d.vertex,T);
 return !attached(d.a,T)||!attached(d.b,T);
}
export const looseDims=tol=>S.dims.filter(d=>dimLoose(d,tol));

/* ═══ إنشاء البُعد ═══ */
export function addDim(kind,a,b,pos,txt){
 V("dim",{a,b,pos});                  /* 2.3 */
 const K=DK[kind]?kind:"h";
 const A=[R(a[0]),R(a[1])], B=[R(b[0]),R(b[1])];
 const d={id:newId("D"),kind:K,a:A,b:B,pos:R(pos||0)};
 const v=dimValue(d);
 if(v<10)throw new Error(
  `المقاس ${fmtLen(v)} م — النقطتان متطابقتان في هذا الاتجاه`);
 if(txt)d.txt=String(txt).slice(0,24);
 S.dims.push(d); touchView();
 return d;
}
export function addDimRad(c,r,leader,txt){
 V("dimRad",{c,r});
 const C=[R(c[0]),R(c[1])];
 const Rr=Math.max(10,Math.round(+r||0));
 if(Rr<10)throw new Error("نصف القطر أقل من 10 مم");
 const d={id:newId("D"),kind:"rad",c:C,r:Rr,
  leader:leader?[R(leader[0]),R(leader[1])]:[R(C[0]+Rr),R(C[1])]};
 if(txt)d.txt=String(txt).slice(0,24);
 S.dims.push(d); touchView();
 return d;
}
export function addDimDia(c,r,leader,txt){
 V("dimRad",{c,r});
 const C=[R(c[0]),R(c[1])];
 const Rr=Math.max(10,Math.round(+r||0));
 if(Rr<10)throw new Error("نصف القطر أقل من 10 مم");
 const d={id:newId("D"),kind:"dia",c:C,r:Rr,
  leader:leader?[R(leader[0]),R(leader[1])]:[R(C[0]+Rr),R(C[1])]};
 if(txt)d.txt=String(txt).slice(0,24);
 S.dims.push(d); touchView();
 return d;
}
export function addDimAng(vertex,p1,p2,r,txt){
 V("dimAng",{vertex,p1,p2,r});
 const Vc=[R(vertex[0]),R(vertex[1])];
 const P1=[R(p1[0]),R(p1[1])], P2=[R(p2[0]),R(p2[1])];
 const Rr=clamp(Math.round(+r||2000),200,20000);
 const a0=Math.atan2(P1[1]-Vc[1],P1[0]-Vc[0])*R2D;
 const a1=Math.atan2(P2[1]-Vc[1],P2[0]-Vc[0])*R2D;
 if(Math.abs(a1-a0)<1)throw new Error("الزاوية أقل من 1°");
 const d={id:newId("D"),kind:"ang",vertex:Vc,p1:P1,p2:P2,r:Rr,
  a0:deg(a0),a1:deg(a1)};
 if(txt)d.txt=String(txt).slice(0,24);
 S.dims.push(d); touchView();
 return d;
}
export function delDim(d){
 const i=S.dims.indexOf(d);
 if(i<0)return false;
 S.dims.splice(i,1); touchView();
 return true;
}
/* ═══ العلامات ═══ شرطة معمارية أو سهم ═══ */
function tickPrims(L,p,u,n,s,style){
 if(style==="arrow"){
  const a=[p[0]+u[0]*s*1.6, p[1]+u[1]*s*1.6];
  return [
   {t:"line",L,a:[R(p[0]),R(p[1])],
    b:[R(a[0]+n[0]*s*0.4),R(a[1]+n[1]*s*0.4)]},
   {t:"line",L,a:[R(p[0]),R(p[1])],
    b:[R(a[0]-n[0]*s*0.4),R(a[1]-n[1]*s*0.4)]}];
 }
 const d=[(u[0]+n[0])*s, (u[1]+n[1])*s];
 return [{t:"line",L,
  a:[R(p[0]-d[0]),R(p[1]-d[1])], b:[R(p[0]+d[0]),R(p[1]+d[1])]}];
}
export function dimPrimsRad(d){
 const g=dimGeomRad(d);
 if(!g)return [];
 const L="A-DIMS", h=txtH()*hOf(d), ts=h*0.42;
 const out=[];
 /* نقطة المركز */
 out.push({t:"arc",L,cx:g.c[0],cy:g.c[1],r:2,a0:0,a1:359.9});
 /* خط القائد من المركز إلى leader */
 const ang=Math.atan2(g.leader[1]-g.c[1],g.leader[0]-g.c[0]);
 const edge=[R(g.c[0]+Math.cos(ang)*g.r),R(g.c[1]+Math.sin(ang)*g.r)];
 out.push({t:"line",L,a:g.c,b:edge});
 out.push({t:"line",L,a:edge,b:g.leader});
 /* سهم واحد عند الحافة */
 const ux=Math.cos(ang), uy=Math.sin(ang), nx=-uy, ny=ux, s=ts;
 const tip=edge;
 const a1=[tip[0]+ux*s*1.6,tip[1]+uy*s*1.6];
 out.push({t:"line",L,a:tip,b:[R(a1[0]+nx*s*0.4),R(a1[1]+ny*s*0.4)]});
 out.push({t:"line",L,a:tip,b:[R(a1[0]-nx*s*0.4),R(a1[1]-ny*s*0.4)]});
 /* نص */
 const m=[R((edge[0]+g.leader[0])/2),R((edge[1]+g.leader[1])/2+h*0.42)];
 out.push({t:"text",L,s:dimText(d,decOf(d)),x:m[0],y:m[1],h,al:"bc",rot:0});
 return out;
}
export function dimPrimsAng(d){
 const g=dimGeomAng(d);
 if(!g)return [];
 const L="A-DIMS", h=txtH()*hOf(d), ts=h*0.42;
 const out=[];
 const rd=a=>a*Math.PI/180;
 /* خطا الامتداد */
 const p1a=[R(g.vertex[0]+Math.cos(rd(g.a0))*g.r*1.15),
  R(g.vertex[1]+Math.sin(rd(g.a0))*g.r*1.15)];
 const p2a=[R(g.vertex[0]+Math.cos(rd(g.a1))*g.r*1.15),
  R(g.vertex[1]+Math.sin(rd(g.a1))*g.r*1.15)];
 const e1=[R(g.vertex[0]+Math.cos(rd(g.a0))*g.r),
  R(g.vertex[1]+Math.sin(rd(g.a0))*g.r)];
 const e2=[R(g.vertex[0]+Math.cos(rd(g.a1))*g.r),
  R(g.vertex[1]+Math.sin(rd(g.a1))*g.r)];
 out.push({t:"line",L,a:g.vertex,b:p1a});
 out.push({t:"line",L,a:g.vertex,b:p2a});
 /* قوس البعد */
 out.push({t:"arc",L,cx:g.vertex[0],cy:g.vertex[1],r:g.r,a0:g.a0,a1:g.a1});
 /* شرطة عند الطرفين */
 [[e1,g.a0],[e2,g.a1]].forEach(([p,a])=>{
  const ux=Math.cos(rd(a+90)), uy=Math.sin(rd(a+90));
  out.push({t:"line",L,a:[R(p[0]-ux*ts),R(p[1]-uy*ts)],
   b:[R(p[0]+ux*ts),R(p[1]+uy*ts)]});
 });
 /* نص في منتصف القوس */
 const mid=(g.a0+g.a1)/2;
 const mx=R(g.vertex[0]+Math.cos(rd(mid))*(g.r+h*0.6));
 const my=R(g.vertex[1]+Math.sin(rd(mid))*(g.r+h*0.6));
 out.push({t:"text",L,s:dimText(d),x:mx,y:my,h,al:"mc",rot:0});
 return out;
}
export function dimPrims(d){
 if(d.kind==="rad"||d.kind==="dia")return dimPrimsRad(d);
 if(d.kind==="ang")return dimPrimsAng(d);
 const g=dimGeom(d);
 if(!g)return [];
 const L="A-DIMS", h=txtH()*hOf(d), ts=h*0.42;
 const gap=h*0.32, over=h*0.55;
 const st=tickOf(d);
 const out=[];
 const warn=dimLoose(d,30)?1:0;
 /* خطوط الامتداد: من النقطة الملتقطة إلى خطّ البُعد، بفجوة وتجاوز */
 [[d.a,g.p1],[d.b,g.p2]].forEach(([q,p])=>{
  const dx=p[0]-q[0], dy=p[1]-q[1], L2=Math.hypot(dx,dy);
  if(L2<gap+2)return;
  const ux=dx/L2, uy=dy/L2;
  out.push({t:"line",L,warn,
   a:[R(q[0]+ux*gap),R(q[1]+uy*gap)],
   b:[R(p[0]+ux*over),R(p[1]+uy*over)]});
 });
 out.push({t:"line",L,a:g.p1,b:g.p2,warn});
 tickPrims(L,g.p1,g.u,g.n,ts,st)
  .forEach(x=>out.push(Object.assign(x,{warn})));
 tickPrims(L,g.p2,[-g.u[0],-g.u[1]],g.n,ts,st)
  .forEach(x=>out.push(Object.assign(x,{warn})));
 const m=dimMid(d);
 let rot=g.rot;
 if(rot>90.001&&rot<=270)rot=deg(rot+180);   /* لا يُقرأ مقلوباً */
 const nx=Math.cos((rot+90)*D2R), ny=Math.sin((rot+90)*D2R);
 out.push({t:"text",L,s:dimText(d,decOf(d))+(d.txt?" *":""),
  x:R(m[0]+nx*h*0.42), y:R(m[1]+ny*h*0.42),
  h, al:"bc", rot, warn:warn||(d.txt?1:0)});
 return out;
}
/* ═══ السلاسل: قيَمٌ مكتوبة ═══ */
export const chainVals=c=>(c&&Array.isArray(c.vals))?c.vals:[];
export const chainSum=c=>chainVals(c).reduce((s,v)=>s+(+v||0),0);
export function chainBounds(c){
 const out=[0];
 let s=0;
 chainVals(c).forEach(v=>{s+=(+v||0); out.push(s)});
 return out;
}
/* 3 2.5 4 · أو 1.2*3 للتكرار */
export function parseVals(str){
 const T=norm(String(str||"")).split(/[\s,;+]+/).filter(Boolean);
 const out=[];
 T.forEach(t=>{
  const m=/^(\d*\.?\d+)(?:[x*](\d+))?$/.exec(t);
  if(!m)throw new Error(`«${t}» ليست قيمة — اكتب مثل: 3 2.5 4 أو 3*4`);
  const v=R(parseFloat(m[1])*1000);
  if(v<10)throw new Error(`القيمة «${t}» أصغر من سنتيمتر`);
  const n=m[2]?clamp(parseInt(m[2],10),1,60):1;
  for(let i=0;i<n;i++)out.push(v);
 });
 if(!out.length)throw new Error("لا قيَم — اكتب مثل: 3 2.5 4");
 if(out.length>60)throw new Error("أكثر من 60 قيمة");
 return out;
}
export function addChain(axis,base,pos,vals,total,flip){
 V("chain",{base,pos,vals});             /* 2.3 */
 const VS=(vals||[]).map(v=>Math.max(10,R(+v||0)));
 if(!VS.length)throw new Error("السلسلة بلا قيَم");
 const c={id:newId("C"),axis:(axis==="v")?"v":"h",
  base:[R(base[0]),R(base[1])], pos:R(pos),
  vals:VS.slice(0,60), total:total?1:0};
 /* flip: خطُّ المجموع إلى الجهة المقابلة — للسلاسل أسفل الرسم
    وعلى يمينه حيث «خارج» عكسُ الجهة الافتراضية. حقلٌ اختياريّ:
    غيابُه يُبقي كلّ سلسلةٍ قديمةٍ كما رُسِمَت. */
 if(flip)c.flip=1;
 S.chains.push(c); touchView();
 return c;
}
export function delChain(c){
 const i=S.chains.indexOf(c);
 if(i<0)return false;
 S.chains.splice(i,1); touchView();
 return true;
}
/* ═══ تعيين طراز البُعد/السلسلة — حقلُ تعديلٍ لا وسيطُ إنشاء ═══
   الاسمُ الفارغ يخلع الطرازَ فيعود الكيان إلى الافتراضي meta،
   ومجهولُه يُرفَض بسببه. والمعاملةُ view وحدها: لا هندسةَ تُمَسّ. */
export function setDimStyle(id,name){
 return edit(()=>{
  const d=dimById(id);
  if(!d)return false;
  if(name==null||String(name).trim()===""){delete d.style; touchView(); return true}
  const k=String(name).slice(0,32);
  if(!dsOk(k))throw new Error(`طرازُ أبعادٍ غير معروف: ${k}`);
  d.style=k; touchView(); return true;
 },"تعيين طراز البُعد",{bump:"view"});
}
export function setChainStyle(id,name){
 return edit(()=>{
  const c=chainById(id);
  if(!c)return false;
  if(name==null||String(name).trim()===""){delete c.style; touchView(); return true}
  const k=String(name).slice(0,32);
  if(!dsOk(k))throw new Error(`طرازُ أبعادٍ غير معروف: ${k}`);
  c.style=k; touchView(); return true;
 },"تعيين طراز السلسلة",{bump:"view"});
}
export const chainPt=(c,s)=>(c.axis==="h")
 ? [R(c.base[0]+s), c.pos]
 : [c.pos, R(c.base[1]+s)];

export function chainPrims(c){
 const L="A-DIMS", h=txtH()*hOf(c), ts=h*0.42;
 const st=tickOf(c);
 const u=(c.axis==="h")?[1,0]:[0,1];
 const n=(c.axis==="h")?[0,1]:[-1,0];
 const B=chainBounds(c), out=[];
 if(B.length<2)return out;
 const p0=chainPt(c,B[0]), pN=chainPt(c,B[B.length-1]);
 out.push({t:"line",L,a:p0,b:pN});
 B.forEach(s=>tickPrims(L,chainPt(c,s),u,n,ts,st)
  .forEach(x=>out.push(x)));
 const rot=(c.axis==="h")?0:90;
 const nx=Math.cos((rot+90)*D2R), ny=Math.sin((rot+90)*D2R);
 const V=chainVals(c);
 for(let i=0;i<V.length;i++){
  const m=chainPt(c,(B[i]+B[i+1])/2);
  out.push({t:"text",L,s:fmtLen(V[i],decOf(c)),
   x:R(m[0]+nx*h*0.42), y:R(m[1]+ny*h*0.42), h, al:"bc", rot});
 }
 if(c.total){
  const off=h*2.1*(c.flip?-1:1);
  const q1=[R(p0[0]+nx*off),R(p0[1]+ny*off)];
  const q2=[R(pN[0]+nx*off),R(pN[1]+ny*off)];
  out.push({t:"line",L,a:q1,b:q2});
  tickPrims(L,q1,u,n,ts,st).forEach(x=>out.push(x));
  tickPrims(L,q2,[-u[0],-u[1]],n,ts,st).forEach(x=>out.push(x));
  const m=chainPt(c,(B[0]+B[B.length-1])/2);
  out.push({t:"text",L,s:fmtLen(chainSum(c),decOf(c)),
   x:R(m[0]+nx*(off+(c.flip?-h*1.0:h*0.42))),
   y:R(m[1]+ny*(off+(c.flip?-h*1.0:h*0.42))),
   h, al:"bc", rot});
 }
 return out;
}
/* ═══ المقارنة بالهندسة — تقرير لا تصحيح ═══
   لكل حدٍّ في السلسلة: أقرب إحداثيّ هندسيّ على المحور وفرقه.
   لا تُعدَّل قيمةٌ واحدة: أنت تقرأ وتقرّر. */
export function chainCompare(c,tol){
 const T=Math.max(1,tol||60);
 const idx=(c.axis==="h")?0:1;
 const uniq=[...new Set(anchors().map(p=>R(p[idx])))];
 const rows=chainBounds(c).map((s,i)=>{
  const q=chainPt(c,s)[idx];
  let best=null,bd=1/0;
  uniq.forEach(v=>{
   const d=Math.abs(v-q);
   if(d<bd){bd=d;best=v}
  });
  return {i,at:q,near:best,d:(best==null)?null:R(best-q),
   ok:(best!=null&&Math.abs(best-q)<=T)};
 });
 return {rows,sum:chainSum(c),off:rows.filter(r=>!r.ok).length};
}
/* ═══ النصوص والقوائد والمناسيب ═══
   مجموعة واحدة بحقل kind — أوفر من ثلاث مجموعات متشابهة. */
export const AK={text:"نصّ",lead:"قائد",level:"منسوب"};
export function addText(p,s,hMul,rot,al){
 V("text",{p,s,hm:hMul,rot});         /* 2.3 */
 const a={id:newId("T"),kind:"text",x:R(p[0]),y:R(p[1]),
  s:String(s==null?"":s).trim().slice(0,120),
  hm:clamp(+hMul||1,0.4,6), rot:deg(+rot||0),
  al:/^(bl|bc|ml|mc)$/.test(al)?al:"bc"};
 if(!a.s)throw new Error("النصّ فارغ");
 S.anno.push(a); touchView();
 return a;
}
/* ═══ فقرةٌ ═══ §٣/١٤
   النصُّ يُحفَظ كما كُتِب بأسطره الصريحة: `\n` معنًى لا زينة (بندٌ
   يبدأ سطراً). والقصُّ عند `LIM.text.max` كغيره، لكنّ الحدَّ هنا
   يُستهلَك بسرعةٍ أكبر — فالفقرةُ أطولُ من بطاقة. */
export function addMText(p,s,wid,hMul,al){
 V("mtext",{p,s,wid,hm:hMul});
 const a={id:newId("T"),kind:"mtext",x:R(p[0]),y:R(p[1]),
  s:String(s==null?"":s).replace(/\r\n?/g,"\n").trim()
   .slice(0,LIM.text.max),
  wid:clamp(R(wid||3000),MT_WMIN,MT_WMAX),
  hm:clamp(+hMul||1,0.4,6),
  rot:0,
  al:(al==="bl")?"bl":"ar"};
 if(!a.s)throw new Error("النصّ فارغ");
 S.anno.push(a); touchView();
 return a;
}
/* ═══ الميل ═══ §٣
   القيمةُ مخزَّنةٌ **مئويةً** دائماً، والصيغةُ عرضٌ. والحدود:
   ٠٫١٪ أدنى ميلٍ يُصرِّف فعلاً (ما دونه ماءٌ راكد)، و٢٥٪ فوقها
   منحدَرٌ لا سطحٌ مائل. */
export const SLOPE_MIN=0.1, SLOPE_MAX=25;
export const SLOPE_FMTS={pct:"مئوية (١٪)",ratio:"نسبة (١:١٠٠)"};
export function slopeStr(a){
 const v=+a.slope||0;
 if(a.fmt==="ratio"){
  /* ١:ن حيث ن = ١٠٠ ÷ النسبة — والكسرُ يُقرَّب لأنّ ١:٦٦٫٧ لا
     تُنفَّذ في الموقع، و١:٦٧ تُنفَّذ */
  const n=v>0?Math.round(100/v):0;
  return n?`1:${n}`:"—";
 }
 return `${(Math.round(v*100)/100)}%`;
}
export function addSlope(pts,slope,fmt,hMul){
 V("slope",{pts,slope});
 const P=(pts||[]).slice(0,2).map(p=>[R(p[0]),R(p[1])]);
 if(P.length<2)throw new Error("سهمُ الميل يحتاج نقطتين");
 const L=Math.hypot(P[1][0]-P[0][0],P[1][1]-P[0][1]);
 if(L<100)
  throw new Error("طولُ السهمِ أصغرُ من أن يُقرَأ — انقر أبعد");
 const v=+slope;
 if(!isFinite(v)||v<SLOPE_MIN||v>SLOPE_MAX)
  throw new Error(`الميل ${v} خارج ${rng(SLOPE_MIN,SLOPE_MAX,"%")}`
   +" — ما دون الأدنى ماءٌ راكدٌ وما فوق الأقصى منحدَر");
 const a={id:newId("T"),kind:"slope",pts:P,
  slope:Math.round(v*100)/100,
  fmt:(fmt==="ratio")?"ratio":"pct",
  hm:clamp(+hMul||1,0.4,6)};
 /* ولا نصَّ يُخزَّن: يُبنى عند الرسم من `slope` و`fmt`، فتغييرُ
    الصيغةِ يظهر فوراً ولا يتعارض مع مصدره. والتطبيعُ لا يشترط
    نصّاً لهذا النوعِ لهذا السبب. */
 S.anno.push(a); touchView();
 return a;
}
export function addLead(pts,s,hMul){
 V("lead",{pts,s,hm:hMul});           /* 2.3 */
 const P=(pts||[]).map(p=>[R(p[0]),R(p[1])]);
 if(P.length<2)throw new Error("القائد يحتاج نقطتين على الأقلّ");
 const a={id:newId("T"),kind:"lead",pts:P,
  s:String(s==null?"":s).trim().slice(0,120),
  hm:clamp(+hMul||1,0.4,6)};
 if(!a.s)throw new Error("نصّ القائد فارغ");
 S.anno.push(a); touchView();
 return a;
}
export function addLevel(p,z,pre){
 V("level",{p,z,pre});                /* 2.3 */
 const a={id:newId("T"),kind:"level",x:R(p[0]),y:R(p[1]),
  z:R(z||0), pre:String(pre==null?"":pre).slice(0,8)};
 S.anno.push(a); touchView();
 return a;
}
export function delAnno(a){
 const i=S.anno.indexOf(a);
 if(i<0)return false;
 S.anno.splice(i,1); touchView();
 return true;
}
export const annoPt=a=>{
 if(!a)return [0,0];
 if(a.kind==="lead")return a.pts[a.pts.length-1].slice();
 /* سهمُ الميل: منتصفُه هو موضعُه — عليه النسبةُ وبه يُنقَل */
 if(a.kind==="slope"&&a.pts&&a.pts.length>1)
  return [R((a.pts[0][0]+a.pts[1][0])/2),
          R((a.pts[0][1]+a.pts[1][1])/2)];
 return [a.x,a.y];
};
export const levelStr=a=>{
 const v=(a.z||0)/1000;
 const s=(v>=0?"+":"−")+Math.abs(v).toFixed(3);
 return (a.pre?a.pre+" ":"")+s;
};
/* ═══ النصُّ بفقرة ═══ §٣/١٤
   `text` سطرٌ واحد، و`eText` في DXF يسحق `\n` إلى مسافة — فالملاحظاتُ
   العامةُ على الورقة (وهي فقراتٌ دائماً) كانت تُكتَب سطراً سطراً
   بأيدي الناس، وكلُّ تعديلٍ يُعيد ترتيبَها كلَّها.

   والحلُّ هنا **لفٌّ بعرضٍ ثابت**: الكيانُ يحمل النصَّ كما كُتِب
   و`wid` عرضَ العمود، واللفُّ يُحسَب **عند الرسم** لا عند الحفظ —
   فتغييرُ العرضِ أو ارتفاعِ الخطّ يُعيد اللفَّ من تلقائه، ولا
   يُخزَّن ناتجٌ يتعارض مع مصدره.

   والمخرَجُ أسطرُ `text` عاديةٌ: كلُّ مصدِّرٍ (DXF · SVG · PNG · PDF)
   يعرفها سلفاً فلا تمسُّه هذه الإضافةُ بحرف. وهذا هو الفرقُ بين
   إضافةٍ تُدمَج وإضافةٍ تُلحَق.

   وتقديرُ عرضِ المحرف: لا قياسَ نصٍّ في النواة (لا قماشَ هنا)، فالعرضُ
   يُقدَّر بـ`MT_ADV` من ارتفاع الخطّ. تقديرٌ مُعلَنٌ لا قياسٌ: الخطُّ
   العربيُّ متناسبٌ، فالسطرُ قد يَقصُر أو يَطول قليلاً — وهو مقبولٌ في
   ملاحظةٍ ومرفوضٌ في جدول (ولذلك `table` يرسم أعمدةً بعرضٍ صريح). */
export const MT_ADV=0.52;          /* عرضُ المحرف ÷ ارتفاع الخطّ */
export const MT_LEAD=1.45;         /* تباعدُ الأسطر ÷ ارتفاع الخطّ */
export const MT_WMIN=200, MT_WMAX=200000;
/* اللفُّ: يحترم `\n` الصريحَ ويلفُّ ما طال. الكلمةُ الأطولُ من العمود
   تُترَك على سطرها ولا تُقطَع: قطعُ كلمةٍ عربيةٍ يفسد شكلَها. */
export function mtWrap(txt,wid,h){
 const adv=Math.max(1,(h||1)*MT_ADV);
 const cols=Math.max(1,Math.floor((+wid||0)/adv));
 const out=[];
 String(txt==null?"":txt).split(/\r?\n/).forEach(para=>{
  const words=para.split(/[ \t]+/).filter(w=>w!=="");
  if(!words.length){out.push(""); return}
  let line="";
  words.forEach(w=>{
   if(!line){line=w; return}
   if((line.length+1+w.length)<=cols)line+=" "+w;
   else{out.push(line); line=w}
  });
  if(line)out.push(line);
 });
 return out.length?out:[""];
}
export const mtLines=a=>mtWrap(a.s,a.wid,txtH()*(a.hm||1));
/* صندوقُ الفقرة — للإصابة والمقابض: العرضُ معلَنٌ والارتفاعُ محسوب */
export function mtBox(a){
 const h=txtH()*(a.hm||1);
 const n=mtLines(a).length;
 const H=h*MT_LEAD*n;
 const w=Math.max(MT_WMIN,+a.wid||MT_WMIN);
 /* المرساةُ أعلى يسار العمود في اتجاه الكتابة: النصُّ ينزل منها */
 return {x0:a.x, y0:a.y-H, x1:a.x+w, y1:a.y};
}

export function annoPrims(a){
 const L="A-ANNO", h=txtH()*(a.hm||1);
 if(a.kind==="text")
  return [{t:"text",L,s:a.s,x:a.x,y:a.y,h,al:a.al||"bc",
   rot:a.rot||0}];
/* ═══ سهمُ ميلِ الصرف ═══ §٣ (أولوية منخفضة)
   كلُّ سطحٍ وكلُّ دورةِ مياهٍ وكلُّ مَمشًى خارجيٍّ يحتاج ميلاً
   مُعلَناً نحو مصرفٍ، وإلّا تجمّع الماء. والمعماريُّ كان يرسمه
   بخطٍّ وسهمٍ ونصٍّ منفصلَين — ثلاثةُ كياناتٍ لا رابطَ بينها، فإن
   نُقِل أحدُها تفرّقت.

   والعرفُ المعماريُّ: السهمُ يشير **نحو المنحدَر** (إلى حيث يجري
   الماء) والنسبةُ مكتوبةٌ عليه. والنسبةُ تُكتَب بصيغتَين في
   المهنة — مئويةٍ (١٪) ونسبةِ ارتفاعٍ إلى طول (١:١٠٠) — فالصيغةُ
   خيارٌ لا فرضٌ، والقيمةُ المخزَّنةُ واحدةٌ (مئويةٌ) فلا تتفرّق
   الحقائقُ باختيارِ عرض.

   ولا حسابَ انحدارٍ من المناسيب: المنسوبُ كيانٌ آخرُ لا رابطَ له
   بهذا، وادّعاءُ اشتقاقٍ لا يقع كذب. المستخدمُ يُعلِن الميلَ. */
 if(a.kind==="slope"){
  const A=a.pts[0], B=a.pts[1];
  const dx=B[0]-A[0], dy=B[1]-A[1], D2=Math.hypot(dx,dy)||1;
  const ux=dx/D2, uy=dy/D2, nx=-uy, ny=ux;
  const out=[{t:"line",L,a:A,b:B}];
  /* رأسُ السهمِ عند B — جهةُ الانحدار */
  const sz=h*0.55;
  out.push({t:"poly",L,cl:1,pts:[[B[0],B[1]],
   [R(B[0]-ux*sz*2+nx*sz*0.5),R(B[1]-uy*sz*2+ny*sz*0.5)],
   [R(B[0]-ux*sz*2-nx*sz*0.5),R(B[1]-uy*sz*2-ny*sz*0.5)]]});
  /* شرطةُ البداية: عرفاً تُعلِم الطرفَ الأعلى فلا يُقرأ السهمُ
     مقلوباً حين يقصُر */
  out.push({t:"line",L,
   a:[R(A[0]+nx*sz),R(A[1]+ny*sz)],
   b:[R(A[0]-nx*sz),R(A[1]-ny*sz)]});
  /* النسبةُ فوق منتصفِه بميلِه — تُقرأ مع الخطِّ لا منفصلةً */
  let rot=deg(Math.atan2(dy,dx)*R2D);
  if(rot>90.001&&rot<=270)rot=deg(rot+180);
  out.push({t:"text",L,s:slopeStr(a),
   x:R((A[0]+B[0])/2+nx*h*0.5), y:R((A[1]+B[1])/2+ny*h*0.5),
   h:h*0.9, al:"bc", rot});
  return out;
 }
 if(a.kind==="mtext"){
  /* سطرٌ لكلِّ لفّة، من الأعلى إلى الأسفل. والمحاذاةُ إلى اليمين هي
     الافتراضُ لنصٍّ عربيّ: `ar` تعني يمينَ العمود. */
  const lines=mtLines(a);
  const step=h*MT_LEAD;
  const right=(a.al!=="bl");
  const w=Math.max(MT_WMIN,+a.wid||MT_WMIN);
  return lines.map((s,i)=>({t:"text",L,s,
   x:right?R(a.x+w):a.x,
   y:R(a.y-step*(i+1)+h*0.28),
   h, al:right?"br":"bl", rot:a.rot||0}));
 }
 if(a.kind==="lead"){
  const out=[], P=a.pts;
  for(let i=0;i<P.length-1;i++)
   out.push({t:"line",L,a:P[i],b:P[i+1]});
  /* رأس السهم عند النقطة الأولى — الاتجاه من الثانية إليها */
  const p=P[0], q=P[1];
  const dx=p[0]-q[0], dy=p[1]-q[1], D=Math.hypot(dx,dy)||1;
  const ux=dx/D, uy=dy/D, nx=-uy, ny=ux, s=h*0.5;
  out.push({t:"poly",L,cl:1,pts:[[p[0],p[1]],
   [R(p[0]-ux*s*1.9+nx*s*0.42),R(p[1]-uy*s*1.9+ny*s*0.42)],
   [R(p[0]-ux*s*1.9-nx*s*0.42),R(p[1]-uy*s*1.9-ny*s*0.42)]]});
  const e=P[P.length-1], b=P[P.length-2];
  const right=(e[0]>=b[0]);
  /* خطّ الكتف تحت النصّ */
  out.push({t:"line",L,a:e,
   b:[R(e[0]+(right?h*0.4:-h*0.4)),e[1]]});
  out.push({t:"text",L,s:a.s,
   x:R(e[0]+(right?h*0.5:-h*0.5)), y:R(e[1]+h*0.28),
   h, al:right?"bl":"bc"});
  return out;
 }
 /* المنسوب: مثلّث مفتوح وخطّ أرضية والقيمة */
 const s=txtH()*0.62;
 return [
  {t:"poly",L,cl:0,pts:[[R(a.x-s),R(a.y+s)],[a.x,a.y],
   [R(a.x+s),R(a.y+s)]]},
  {t:"line",L,a:[R(a.x-s*1.7),R(a.y+s)],b:[R(a.x+s*1.7),R(a.y+s)]},
  {t:"text",L,s:levelStr(a),x:a.x,y:R(a.y+s*1.5),
   h:txtH(),al:"bc"}];
}
/* ═══ المحاور ═══
   إحداثيات صريحة في S.grid · حروف للرأسي وأرقام للأفقي. */
const LTR="ABCDEFGHJKLMNPQRSTUVWXYZ";
export const axLabel=(dirv,i)=>(dirv==="x")
 ? (LTR[i%LTR.length]
   +(i>=LTR.length?String(1+Math.floor(i/LTR.length)):""))
 : String(i+1);
export function addAxis(dirv,v){
 const A=(dirv==="y")?S.grid.ys:S.grid.xs;
 const q=R(v);
 if(A.some(x=>Math.abs(x-q)<20))
  throw new Error("يوجد محور على هذا الإحداثي");
 A.push(q);
 A.sort((a,b)=>a-b);
 touchView();
 return q;
}
export function delAxis(dirv,v){
 const A=(dirv==="y")?S.grid.ys:S.grid.xs;
 let bi=-1, bd=1/0;
 A.forEach((x,i)=>{
  const d=Math.abs(x-v);
  if(d<bd){bd=d;bi=i}
 });
 if(bi<0||bd>200)return false;
 A.splice(bi,1); touchView();
 return true;
}
/* ═══ مسحُ المحاور كلّها ═══ (مسحُ ما قبل المرحلة ٥)
   كان زرُّ «امسح المحاور» يُفرِغ المصفوفتين في اللوحة مباشرةً بلا
   touchView ولا فحصِ فشلِ التعديل، ويصمت إن لم تكن محاور. هنا يُفرَغان
   ويُبطَل العرض، ويُعاد العددُ ليُقال. */
export function clearAxes(){
 const n=S.grid.xs.length+S.grid.ys.length;
 if(!n)return 0;
 S.grid.xs=[]; S.grid.ys=[];
 touchView();
 return n;
}
/* ═══ امتداد الشبكة ═══ المستطيل الذي تمتدّ إليه خطوط المحاور
   وبالوناتها. واحدةٌ يقرأها الرسمُ وأداةُ أبعاد المحاور معاً فلا
   تنفصل البالونة عن السلسلة. off إزاحةٌ صريحةٌ من الشريط (مم ورقي)
   تُضرَب بالمقياس كارتفاع النصّ — و0 يُبقي الخلوص القديم. */
export function gridExtent(bbox){
 const X=S.grid.xs, Y=S.grid.ys;
 const h=txtH();
 let B=bbox;
 if(!B){
  const P=[];
  X.forEach(x=>P.push([x,0]));
  Y.forEach(y=>P.push([0,y]));
  B=bboxOf(P)||{x0:0,y0:0,x1:1000,y1:1000};
 }
 const off=Math.max(0,+S.grid.off||0)*Math.max(1,S.meta.scale);
 const pad=h*3.2+off;
 return {
  x0:Math.min(B.x0,...(X.length?X:[B.x0]))-pad,
  x1:Math.max(B.x1,...(X.length?X:[B.x1]))+pad,
  y0:Math.min(B.y0,...(Y.length?Y:[B.y0]))-pad,
  y1:Math.max(B.y1,...(Y.length?Y:[B.y1]))+pad,
  pad, off, r:h*1.1};
}
/* إزاحةُ البالونات — حقلُ مشروعٍ يُكتَب داخل edit() كغيره */
export function setGridOff(v){
 const q=+v;
 S.grid.off=(isFinite(q)&&q>0)?Math.min(120,Math.round(q)):0;
 touchView();
 return S.grid.off;
}
export function gridPrims(bbox){
 const X=S.grid.xs, Y=S.grid.ys;
 if(!X.length&&!Y.length)return [];
 const L="A-GRID", h=txtH(), r=h*1.1;
 const E=gridExtent(bbox);
 const x0=E.x0, x1=E.x1, y0=E.y0, y1=E.y1;
 const out=[], dash=[h*1.6,h*0.7,h*0.25,h*0.7];
 X.forEach((x,i)=>{
  out.push({t:"line",L,a:[x,R(y0)],b:[x,R(y1)],dash});
  [[x,R(y1+r)],[x,R(y0-r)]].forEach(c=>{
   out.push({t:"arc",L,cx:c[0],cy:c[1],r:R(r),a0:0,a1:359.9});
   out.push({t:"text",L,s:axLabel("x",i),x:c[0],
    y:R(c[1]-h*0.36),h:h*0.92,al:"bc"});
  });
 });
 Y.forEach((y,i)=>{
  out.push({t:"line",L,a:[R(x0),y],b:[R(x1),y],dash});
  [[R(x0-r),y],[R(x1+r),y]].forEach(c=>{
   out.push({t:"arc",L,cx:c[0],cy:c[1],r:R(r),a0:0,a1:359.9});
   out.push({t:"text",L,s:axLabel("y",i),x:c[0],
    y:R(c[1]-h*0.36),h:h*0.92,al:"bc"});
  });
 });
 return out;
}
