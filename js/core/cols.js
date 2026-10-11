/* ═══ الأعمدة ═══
   العمود كائن مستقلّ بمركز ومقاس ودوران. يُدمَج في الجسم المصمَّت
   وقت العرض — لا في البيانات — فحذفه يعيد الجدار كما كان.

   الدائرة تُقرَّب 32 ضلعاً في الاتحاد لأن polyBool تعمل على
   مضلّعات؛ وعند العرض المستقلّ تُرسَم قوساً حقيقياً وتُصدَّر CIRCLE. */
import {S,touchGeom,txtH} from "./state.js";
import {V} from "./validate.js";
import {newId,clamp,D2R,deg,m2,ltr,dm2,pt2} from "./units.js";
import {pip,bboxOf,bboxHit,nearOnSeg,convexHit,polyHit} from "./geom.js";
import {band,isArc} from "./walls.js";
import {normLevel} from "./level.js";

const R=v=>Math.round(v);
const NSEG=32;

export const CK={rect:"مستطيل",circ:"دائري"};
export const CT={conc:"خرسانة",steel:"حديد",stone:"حجر"};
export const CMIN=100, CMAX=4000;

export const colById=id=>S.cols.find(c=>c.id===id)||null;
export const colW=c=>Math.max(CMIN,(c&&c.w)||CMIN);
export const colH=c=>(c&&c.kind==="circ")
 ? colW(c) : Math.max(CMIN,(c&&c.h)||CMIN);
export const colArea=c=>(c.kind==="circ")
 ? Math.PI*(colW(c)/2)*(colW(c)/2) : colW(c)*colH(c);

/* ═══ المضلّع العالميّ ═══ */
export function colPoly(c){
 if(!c)return null;
 if(c.kind==="circ"){
  const r=colW(c)/2, out=[];
  for(let i=0;i<NSEG;i++){
   const a=i/NSEG*Math.PI*2;
   out.push([R(c.x+r*Math.cos(a)), R(c.y+r*Math.sin(a))]);
  }
  return out;
 }
 const a=(c.rot||0)*D2R, ca=Math.cos(a), sa=Math.sin(a);
 const hw=colW(c)/2, hh=colH(c)/2;
 return [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]]
  .map(p=>[R(c.x+p[0]*ca-p[1]*sa), R(c.y+p[0]*sa+p[1]*ca)]);
}
export const colBBox=c=>bboxOf(colPoly(c));
const nearRing=(ring,x,y)=>{
 let d=1/0;
 for(let i=0;i<ring.length;i++){
  const r=nearOnSeg(ring[i],ring[(i+1)%ring.length],x,y);
  if(r.d<d)d=r.d;
 }
 return d;
};
export const colAt=(x,y,tol)=>{
 const T=tol||0;
 let best=null, ba=1/0;
 S.cols.forEach(c=>{
  const p=colPoly(c);
  if(!p)return;
  if(!(pip(p,x,y)||(T>0&&nearRing(p,x,y)<=T)))return;
  const ar=colArea(c);
  if(ar<ba){ba=ar;best=c}
 });
 return best;
};
/* ═══ الإنشاء ═══ */
export function addCol(kind,p,w,h,rot,type,tag){
 V("col",{p,w,h,rot});                /* 2.3 */
 const K=CK[kind]?kind:"rect";
 const W=clamp(R(w||300),CMIN,CMAX);
 const H=(K==="circ")?W:clamp(R(h||W),CMIN,CMAX);
 const c={id:newId("K"),kind:K,
  x:R(p[0]),y:R(p[1]),w:W,h:H,
  rot:(K==="circ")?0:deg(+rot||0),
  level:normLevel(S.meta.level),
  type:CT[type]?type:"conc"};
 /* التطابق التامّ في المركز لا معنى له — التراكب يُبلَّغ ولا يُرفَض.
    الفحصُ بمستوى الجديد وحده: عمودان بمركزٍ واحد على طابقَين
    متتاليَين تكرارٌ مقصودٌ (تحميلٌ رأسيّ) لا خطأ — انظر
    core/levelAlign.js التي تتوقّع هذا التطابق بالذات. */
 const dup=S.cols.find(o=>o.level===c.level
  &&Math.abs(o.x-c.x)<20&&Math.abs(o.y-c.y)<20);
 if(dup)throw new Error(`${dup.id} على المركز نفسه `
  +`${pt2([c.x,c.y])} — أزِحه أو عدّل مقاسه`);
 if(tag)c.tag=String(tag).slice(0,10);
 S.cols.push(c); touchGeom();
 return c;
}
export function delCol(c){
 const i=S.cols.indexOf(c);
 if(i<0)return false;
 S.cols.splice(i,1); touchGeom();
 return true;
}
export const nextTag=pre=>{
 const P=String(pre||"C").replace(/\d+$/,"").slice(0,6)||"C";
 const re=new RegExp("^"+P.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")
  +"(\\d+)$");
 let n=0;
 S.cols.forEach(c=>{
  const m=re.exec(c.tag||"");
  if(m)n=Math.max(n,parseInt(m[1],10));
 });
 return P+(n+1);
};
/* ═══ العمود على جدار؟ ═══ تقريرٌ للفاحص لا رابطة تُحفَظ ═══
   walls مرشَّحو الفهرس — والغياب يعني المسح الكامل. */
export function colOnWall(c,tol,walls){
 const T=(tol==null)?2:tol;      /* والصفرُ صفرٌ — لا افتراضٌ يمحوه */
 const b=colBBox(c);
 if(!b)return null;
 const cp=colPoly(c);
 for(const w of (walls||S.walls)){
  const bp=band(w);
  if(!bp)continue;
  const wb=bboxOf(bp);
  if(!wb||!bboxHit(wb,b,T))continue;
  /* بالأضلاع لا بالرؤوس: عمودٌ مركزُه على محور جدارٍ أنحفَ منه
     لا يُدخِل رأساً في الآخر، ومع ذلك يعبره.
     والجدار القوسي شريطُه مقعَّر (D13): SAT تحكم بغلافه المحدَّب
     فتعدّ الفراغ داخل الوتر جداراً — له فحصٌ دقيق. المستقيم محدَّب
     فيبقى على convexHit. */
  if(isArc(w)?polyHit(cp,bp,T):convexHit(cp,bp,T))return w.id;
 }
 return null;
}
export function colsOverlap(a,b){
 const A=colPoly(a), B=colPoly(b);
 if(!A||!B)return false;
 if(!bboxHit(bboxOf(A),bboxOf(B),-1))return false;
 return convexHit(A,B,-1);       /* التلاصقُ وجهاً بوجهٍ ليس تراكباً */
}
/* ═══ الأوّليات ═══
   المدمَج لا حدّ خاصّ له: حدّه من الاتحاد نفسه، ويبقى الوسم
   وصليب المركز. المستقلّ يُرسَم محيطاً وهاشوراً. */
export function colPrims(c,solo){
 const L="A-COLS", out=[], h=txtH();
 if(solo){
  if(c.kind==="circ")
   out.push({t:"arc",L,cx:c.x,cy:c.y,r:R(colW(c)/2),
    a0:0,a1:359.9,kid:c.id});
  else
   out.push({t:"poly",L,pts:colPoly(c),cl:1,kid:c.id});
  out.push({t:"hatch",L,loops:[colPoly(c)],
   pat:(c.type==="steel")?"ANSI31":"SOLID",
   sc:h*(c.type==="steel"?2.2:1.0), kid:c.id});
 }
 /* صليب المركز — علامة خفيفة تدلّ على مركز الشبكة */
 const s=Math.max(60,Math.min(colW(c),colH(c))*0.18);
 out.push({t:"line",L,a:[R(c.x-s),c.y],b:[R(c.x+s),c.y],kid:c.id});
 out.push({t:"line",L,a:[c.x,R(c.y-s)],b:[c.x,R(c.y+s)],kid:c.id});
 if(c.tag)
  out.push({t:"text",L,s:c.tag,x:c.x,
   y:R(c.y+Math.max(colH(c),colW(c))/2+h*0.35),
   h:h*0.9,al:"bc",kid:c.id});
 return out;
}
export const colLabel=c=>(c.kind==="circ")
 ? ltr(`⌀${m2(colW(c))}`)+" م" : dm2(colW(c),colH(c),"م");
export const colName=c=>`${CK[c.kind]||"عمود"} ${colLabel(c)}`
 +` · ${CT[c.type]||""}`;
