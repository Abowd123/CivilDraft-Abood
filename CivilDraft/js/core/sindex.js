/* ═══ فهرس المكان ═══
   شبكة خلايا بعرض مترين — كخلايا refGrid نفسها، وبعقد الكاش نفسه:
   تُبنى مرّةً لكل نسخة حالة (VER.n) فلا استنتاجَ يُعاد.

   وعقدٌ صريح: الفهرس يرشّح ولا يقرّر.
   يعيد المرشَّحين مرتَّبين بترتيب مجموعتهم في الحالة، لا بترتيب
   الخلايا — فترجيح التعادل يبقى كما كان: أوّلُ ما في المصفوفة
   يفوز، تماماً كالحلقة التي كانت تمسحها كلّها. ولو رتّبناهم
   بالخلايا لتبدّل ما يُصاب عند التراكب بلا سببٍ ظاهر.

   والكيان الضخم لا يُحشَر في مئة خليّة: يذهب إلى قائمة «الكبار»
   وتُفحَص مع كل سؤال. */
import {S,VER} from "./state.js";
import {bboxOf,bboxUnion,bboxHit} from "./geom.js";
import {ORD,ENT} from "./entreg.js";

export const CELL=2000;   /* مترَان */
const MAXC=48;            /* أكبر عددٍ من الخلايا لكيانٍ واحد */
const MAXQ=4096;          /* فوقه: المسح أرخص من عدّ الخلايا */

let VN=-1, G=null, QT=0, GREFS=null;
const kx=v=>Math.floor(v/CELL);
const key=(cx,cy)=>cx+","+cy;

/* الصندوق يجمع المحيط والشكل ومنطقة الإصابة إن أُعلنت — فلا يفوت
   الفهرسَ موضعٌ قد يُسأل عنه */
function bboxEnt(d,e){
 let B=null;
 if(d.hbox){
  const h=d.hbox(e);
  if(h)B=bboxUnion(B,h);
 }
 if(d.outline){
  const o=d.outline(e);
  if(o&&o.length)B=bboxUnion(B,bboxOf(o));
 }
 if(d.shape){
  const sh=d.shape(e);
  if(sh){
   if(sh.t==="pt")B=bboxUnion(B,bboxOf([sh.p]));
   else if(sh.t==="seg")B=bboxUnion(B,bboxOf([sh.a,sh.b]));
   else if(sh.pts&&sh.pts.length)B=bboxUnion(B,bboxOf(sh.pts));
  }
 }
 return B;
}
function build(){
 const g={cell:new Map(), big:[], rec:{}, all:[], n:0};
 ORD.forEach(d=>{
  const A=S[d.coll]||[];
  const R=g.rec[d.k]=new Array(A.length);
  for(let i=0;i<A.length;i++){
   const e=A[i];
   const r={k:d.k,i,e,b:bboxEnt(d,e),q:0};
   R[i]=r; g.all.push(r); g.n++;
   if(!r.b){g.big.push(r); continue}
   const x0=kx(r.b.x0), x1=kx(r.b.x1);
   const y0=kx(r.b.y0), y1=kx(r.b.y1);
   if((x1-x0+1)*(y1-y0+1)>MAXC){g.big.push(r); continue}
   for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++){
    const k=key(cx,cy);
    let a=g.cell.get(k);
    if(!a){a=[]; g.cell.set(k,a)}
    a.push(r);
   }
  }
 });
 return g;
}
export function grid(){
 const curRefs=ORD.map(d=>S[d.coll]);
 const same = G && VN===VER.n && GREFS && GREFS.length===curRefs.length && GREFS.every((v,i)=>v===curRefs[i]);
 if(same) return G;
 G=build(); VN=VER.n; GREFS=curRefs.slice();
 return G;
}
export const invalidate=()=>{VN=-1};
export const stats=()=>{
 const g=grid();
 return {n:g.n, cells:g.cell.size, big:g.big.length};
};
export const expand=(b,t)=>({x0:b.x0-t,y0:b.y0-t,
 x1:b.x1+t,y1:b.y1+t});
export const boxAt=(x,y,t)=>({x0:x-t,y0:y-t,x1:x+t,y1:y+t});

/* ═══ السؤال ═══ {نوع: [سجلّ,…]} مرتَّبةً بترتيب المصفوفة ═══ */
export function query(box,kinds){
 const g=grid();
 const want=kinds
  ? new Set(Array.isArray(kinds)?kinds:[kinds]) : null;
 const out={};
 QT++;
 const put=r=>{
  if(r.q===QT)return;
  r.q=QT;
  if(want&&!want.has(r.k))return;
  if(r.b&&!bboxHit(r.b,box,0))return;
  (out[r.k]=out[r.k]||[]).push(r);
 };
 const x0=kx(box.x0), x1=kx(box.x1);
 const y0=kx(box.y0), y1=kx(box.y1);
 if((x1-x0+1)*(y1-y0+1)>MAXQ){
  g.all.forEach(put);
 }else{
  for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++){
   const a=g.cell.get(key(cx,cy));
   if(a)a.forEach(put);
  }
  g.big.forEach(put);
 }
 Object.keys(out).forEach(k=>out[k].sort((a,b)=>a.i-b.i));
 return out;
}
export function entsIn(box,kind){
 const q=query(box,[kind]);
 return (q[kind]||[]).map(r=>r.e);
}
export const entsAt=(x,y,t,kind)=>entsIn(boxAt(x,y,t||0),kind);

/* ═══ الأزواج ═══
   بترتيب i<j نفسه الذي كانت عليه الحلقتان المتداخلتان، فترتيب
   تقارير الفاحص لا يتبدّل. والفحص الدقيق يبقى عند المستدعي. */
/* ═══ الأزواج ═══
   بترتيب i<j نفسه الذي كانت عليه الحلقتان المتداخلتان، فترتيب
   تقارير الفاحص لا يتبدّل. والفحص الدقيق يبقى عند المستدعي.

   filter اختياريّ يُنفَّذ على كل طرفٍ قبل الفحص: الفاحص يمرّر
   دالّة تستبعد كيانَ الطبقة المخفيّة أو المقفلة فلا يُبلَّغ عنه —
   عقد «المخفيّ ليس في المشهد» يسري على التقارير كما يسري على
   الرسم. وهذا الملفّ لا يعرف اسم تلك السياسة ولا يستوردها: هو
   يرشّح بما يُعطى، ولا يقرّر ما يُستبعَد — القرارُ عند المستدعي. */
export function forPairs(kind,fn,pad,filter){
 const g=grid();
 const A=S[(ENT[kind]||{}).coll]||[];
 const R=g.rec[kind]||[];
 const P=pad||0;
 for(let i=0;i<A.length;i++){
  if(filter&&!filter(A[i]))continue;
  const r=R[i];
  const C=(r&&r.b)?(query(expand(r.b,P),[kind])[kind]||[]):R;
  for(let j=0;j<C.length;j++){
   const o=C[j];
   if(!o||o.i<=i)continue;
   if(filter&&!filter(A[o.i]))continue;
   fn(A[i],A[o.i],i,o.i);
  }
 }
}
