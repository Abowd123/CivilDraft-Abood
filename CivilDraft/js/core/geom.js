/* ═══ الهندسة ═══
   دوالٌّ خالصة: لا تعرف الحالة ولا الطبقات ولا الوحدات، ولا تستورد
   شيئاً بقصد — ورقةُ الشجرة، وكلُّ شيءٍ يستوردها.
   والفهرسة هنا داخلية بمنطق core/sindex نفسه وبلا استيراده:
   sindex يقرأ S.walls، وهذه لا تعرف S. */

export const EPS=1e-9;
const R=v=>Math.round(v);
const now=()=>(typeof performance!=="undefined")
 ? performance.now() : Date.now();

/* ═══ العدّادات ═══
   ما يُقاس هو ما يُعَدّ: اختباراتُ التقاطع والاحتواء لا تتبدّل
   بحاسبٍ آخر، والمللي ثانية يتبدّل بكل شيء.
   وopen يتراكم فيُقرأ فرقُه حول النداء — فمن يُرشِّح مخرَج
   polyBool لا يُفقِد التقرير.
   وopenAt آخرُ موضعٍ لم يُخَط لا أوّلُه: المستدعي يقرأ الفرقَ في
   open ثم يقرأ الموضعَ يقيناً من ندائه هو — والأوّلُ يبقى من نداءٍ
   سابقٍ فيدلّ على غير مكانه. */
export const PERF={pairs:0,pip:0,frags:0,kept:0,union:0,
 stitch:0,open:0,openAt:null,weld:0,dup:0,nil:0,
 rings:0,cells:0,ms:0};
export function perfReset(){
 PERF.pairs=0; PERF.pip=0; PERF.frags=0; PERF.kept=0;
 PERF.union=0; PERF.stitch=0; PERF.open=0; PERF.openAt=null;
 PERF.weld=0; PERF.dup=0; PERF.nil=0;
 PERF.rings=0; PERF.cells=0; PERF.ms=0;
 return PERF;
}
export const polyStats=()=>Object.assign({},PERF);

/* ═══ أساسيات ═══ */
export const dist=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
export const dist2=(a,b)=>{
 const x=b[0]-a[0], y=b[1]-a[1];
 return x*x+y*y;
};
export const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
export const same=(a,b,t)=>{
 const T=(t==null)?1:t;
 return dist2(a,b)<=T*T;
};
export function rotPt(p,cx,cy,degv){
 const a=(degv||0)*Math.PI/180, c=Math.cos(a), s=Math.sin(a);
 const x=p[0]-cx, y=p[1]-cy;
 return [cx+x*c-y*s, cy+x*s+y*c];
}
/* ═══ الصناديق ═══ */
export function bboxOf(pts){
 if(!pts||!pts.length)return null;
 let x0=1/0,y0=1/0,x1=-1/0,y1=-1/0;
 for(let i=0;i<pts.length;i++){
  const p=pts[i];
  if(!p)continue;
  const x=+p[0], y=+p[1];
  if(!isFinite(x)||!isFinite(y))continue;
  if(x<x0)x0=x;
  if(x>x1)x1=x;
  if(y<y0)y0=y;
  if(y>y1)y1=y;
 }
 return (x0>x1)?null:{x0,y0,x1,y1};
}
export const bboxHit=(a,b,pad)=>{
 const p=pad||0;
 return !!a&&!!b&&(a.x0-p)<=b.x1&&(b.x0-p)<=a.x1
  &&(a.y0-p)<=b.y1&&(b.y0-p)<=a.y1;
};
export const bboxPad=(b,p)=>b
 ? {x0:b.x0-p,y0:b.y0-p,x1:b.x1+p,y1:b.y1+p} : null;
export const bboxIn=(b,x,y,p)=>{
 const q=p||0;
 return !!b&&x>=b.x0-q&&x<=b.x1+q&&y>=b.y0-q&&y<=b.y1+q;
};
export const bboxUnion=(a,b)=>{
 if(!a)return b?{x0:b.x0,y0:b.y0,x1:b.x1,y1:b.y1}:null;
 if(!b)return {x0:a.x0,y0:a.y0,x1:a.x1,y1:a.y1};
 return {x0:Math.min(a.x0,b.x0),y0:Math.min(a.y0,b.y0),
  x1:Math.max(a.x1,b.x1),y1:Math.max(a.y1,b.y1)};
};
function bboxAll(boxes){
 let r=null;
 for(let i=0;i<boxes.length;i++)if(boxes[i])r=bboxUnion(r,boxes[i]);
 return r;
}
/* ═══ قياسات الحلقة ═══ */
export function pArea(r){
 const n=(r||[]).length;
 if(n<3)return 0;
 let s=0;
 for(let i=0;i<n;i++){
  const a=r[i], b=r[(i+1)%n];
  s+=a[0]*b[1]-b[0]*a[1];
 }
 return s/2;
}
export const ccw=r=>(pArea(r)<0)
 ? (r||[]).slice().reverse() : (r||[]).slice();
export function perim(r){
 const n=(r||[]).length;
 if(n<2)return 0;
 let s=0;
 for(let i=0;i<n;i++)s+=dist(r[i],r[(i+1)%n]);
 return s;
}
export function centroid(r){
 const n=(r||[]).length;
 if(!n)return [0,0];
 const avg=()=>{
  let x=0,y=0;
  for(let i=0;i<n;i++){x+=r[i][0]; y+=r[i][1]}
  return [x/n,y/n];
 };
 if(n<3)return avg();
 let a=0,cx=0,cy=0;
 for(let i=0;i<n;i++){
  const p=r[i], q=r[(i+1)%n];
  const f=p[0]*q[1]-q[0]*p[1];
  a+=f; cx+=(p[0]+q[0])*f; cy+=(p[1]+q[1])*f;
 }
 if(Math.abs(a)<1e-9)return avg();
 return [cx/(3*a), cy/(3*a)];
}
/* تنظيف الحلقة: المكرّر المتلاصق يُطرَح، والرأس المستقيم كذلك —
   فضلعٌ واحد بدل ثلاثة، وأخفُّ على الرسم والتصدير والاتحاد. */
export function cleanRing(r,tol){
 const T=Math.max(0,(tol==null)?1:tol);
 const src=(r||[]).filter(p=>Array.isArray(p)
  &&isFinite(p[0])&&isFinite(p[1]));
 const a=[];
 for(let i=0;i<src.length;i++){
  const q=[R(src[i][0]),R(src[i][1])];
  if(a.length&&dist(a[a.length-1],q)<=T)continue;
  a.push(q);
 }
 while(a.length>1&&dist(a[0],a[a.length-1])<=T)a.pop();
 if(a.length<3)return a;
 const out=[];
 for(let i=0;i<a.length;i++){
  const p=a[(i-1+a.length)%a.length], c=a[i], n=a[(i+1)%a.length];
  const cr=(c[0]-p[0])*(n[1]-p[1])-(c[1]-p[1])*(n[0]-p[0]);
  const base=dist(p,n);
  if(base>T&&Math.abs(cr)/base<=T)continue;
  out.push(c);
 }
 return (out.length>2)?out:a;
}
/* ═══ اختبارات النقطة ═══ */
export function pip(poly,x,y){
 const n=(poly||[]).length;
 if(n<3)return false;
 PERF.pip++;
 let inside=false;
 for(let i=0,j=n-1;i<n;j=i++){
  const a=poly[i], b=poly[j];
  if((a[1]>y)!==(b[1]>y)){
   const t=(y-a[1])/(b[1]-a[1]);
   if(x<a[0]+t*(b[0]-a[0]))inside=!inside;
  }
 }
 return inside;
}
export function nearOnSeg(a,b,x,y){
 const dx=b[0]-a[0], dy=b[1]-a[1];
 const L2=dx*dx+dy*dy;
 let t=(L2<1e-12)?0:(((x-a[0])*dx+(y-a[1])*dy)/L2);
 t=(t<0)?0:((t>1)?1:t);
 const px=a[0]+dx*t, py=a[1]+dy*t;
 return {t, p:[px,py], d:Math.hypot(x-px,y-py)};
}
export const distSeg=(a,b,x,y)=>nearOnSeg(a,b,x,y).d;
export const onSeg=(a,b,x,y,tol)=>
 nearOnSeg(a,b,x,y).d<=((tol==null)?1:tol);
/* أقرب مسافة من نقطة إلى أي قطعة في قائمة — لعلامات الأطراف */
export const nearAny=(segs,p,skip)=>{
 let m=1/0;
 (segs||[]).forEach((s,i)=>{
  if(i===skip)return;
  const d=distSeg(s[0],s[1],p[0],p[1]);
  if(d<m)m=d;
 });
 return m;
};
export function distPoly(p,x,y){
 let m=1/0;
 for(let i=0,n=p.length;i<n;i++){
  const d=distSeg(p[i],p[(i+1)%n],x,y);
  if(d<m)m=d;
 }
 return m;
}

/* قطب اللاوصول: أبعد نقطةٍ داخل الحلقة عن حدودها (الدائرة الداخلية
   العظمى). مركز الثقل في الأشكال المقعّرة (T · L · ممرّ) يقع قرب
   الجدران أو خارج الشكل؛ وهذا لا يقع أبداً. بحثٌ بالخلايا المتناقصة
   (خوارزمية polylabel) بدقّة prec ملم. يعيد {p:[x,y], d} حيث d نصف
   قطر الدائرة = أدنى مسافةٍ إلى الحدّ. */
export function poleOf(ring,prec){
 const n=(ring||[]).length;
 if(n<3){const c=centroid(ring||[]); return {p:c,d:0}}
 const B=bboxOf(ring);
 const w=B.x1-B.x0, h=B.y1-B.y0;
 const cs=Math.min(w,h);
 if(cs<=0)return {p:[B.x0,B.y0],d:0};
 const pr=prec>0?prec:Math.max(10,cs/200);
 const sd=(x,y)=>{const d=distPoly(ring,x,y); return pip(ring,x,y)?d:-d};
 const cell=(x,y,hh)=>{const d=sd(x,y); return {x,y,h:hh,d,m:d+hh*Math.SQRT2}};
 const Q=[];
 let hh=cs/2;
 for(let x=B.x0;x<B.x1;x+=cs)
  for(let y=B.y0;y<B.y1;y+=cs)Q.push(cell(x+hh,y+hh,hh));
 const c0=centroid(ring);
 let best=cell(c0[0],c0[1],0);
 const bc=cell((B.x0+B.x1)/2,(B.y0+B.y1)/2,0);
 if(bc.d>best.d)best=bc;
 let guard=0;
 while(Q.length&&guard++<20000){
  let k=0;
  for(let i=1;i<Q.length;i++)if(Q[i].m>Q[k].m)k=i;
  const c=Q.splice(k,1)[0];
  if(c.d>best.d)best=c;
  if(c.m-best.d<=pr)continue;
  const q=c.h/2;
  Q.push(cell(c.x-q,c.y-q,q),cell(c.x+q,c.y-q,q),
         cell(c.x-q,c.y+q,q),cell(c.x+q,c.y+q,q));
 }
 return {p:[best.x,best.y],d:best.d};
}

/* ═══ بنّاؤو المضلّعات ═══ */
export function bandPoly(x1,y1,x2,y2,t){
 const dx=x2-x1, dy=y2-y1, L=Math.hypot(dx,dy);
 if(L<1e-6)return null;
 const h=(t||0)/2, nx=-dy/L*h, ny=dx/L*h;
 return [[R(x1+nx),R(y1+ny)],[R(x2+nx),R(y2+ny)],
         [R(x2-nx),R(y2-ny)],[R(x1-nx),R(y1-ny)]];
}
export function rectPoly(cx,cy,w,h,degv){
 const a=(w||0)/2, b=(h||0)/2;
 const P=[[-a,-b],[a,-b],[a,b],[-a,b]];
 const g=(degv||0)*Math.PI/180, c=Math.cos(g), s=Math.sin(g);
 return P.map(p=>[R(cx+p[0]*c-p[1]*s), R(cy+p[0]*s+p[1]*c)]);
}
export function circPoly(cx,cy,r,n){
 const N=Math.max(8,Math.min(96,n||24)), out=[];
 for(let i=0;i<N;i++){
  const a=Math.PI*2*i/N;
  out.push([R(cx+r*Math.cos(a)), R(cy+r*Math.sin(a))]);
 }
 return out;
}

/* ═══ خطوط ومستطيلات مساعدة (يستعملها trace/osnap/modify/ents) ═══
   خطّان كاملان لا قطعتان محدودتان: يعيد نقطة تقاطع المحورين ولو
   وقعت خارج طرفَي القطعتين — لأدوات المطابقة والامتداد. */
export function lineX(a,b,c,d){
 const ex=b[0]-a[0], ey=b[1]-a[1];
 const fx=d[0]-c[0], fy=d[1]-c[1];
 const den=ex*fy-ey*fx;
 if(Math.abs(den)<1e-9)return null;
 const rx=c[0]-a[0], ry=c[1]-a[1];
 const t=(rx*fy-ry*fx)/den;
 return [a[0]+ex*t, a[1]+ey*t];
}
export function segSeg(p,q,a,b){
 const d1=[q[0]-p[0],q[1]-p[1]], d2=[b[0]-a[0],b[1]-a[1]];
 const den=d1[0]*d2[1]-d1[1]*d2[0];
 if(Math.abs(den)<1e-9)return false;
 const t=((a[0]-p[0])*d2[1]-(a[1]-p[1])*d2[0])/den;
 const u=((a[0]-p[0])*d1[1]-(a[1]-p[1])*d1[0])/den;
 return t>=-1e-9&&t<=1+1e-9&&u>=-1e-9&&u<=1+1e-9;
}
export const ptInRect=(p,r)=>
 p[0]>=r.x0&&p[0]<=r.x1&&p[1]>=r.y0&&p[1]<=r.y1;
export function segRect(a,b,r){
 if(ptInRect(a,r)||ptInRect(b,r))return true;
 const E=[[[r.x0,r.y0],[r.x1,r.y0]],[[r.x1,r.y0],[r.x1,r.y1]],
          [[r.x1,r.y1],[r.x0,r.y1]],[[r.x0,r.y1],[r.x0,r.y0]]];
 return E.some(e=>segSeg(a,b,e[0],e[1]));
}
/* window=1 يشترط الاحتواء الكامل · 0 يكفيه التلامس */
export function shapeInRect(sh,r,window){
 if(!sh)return false;
 if(sh.t==="pt")return ptInRect(sh.p,r);
 if(sh.t==="seg")return window
  ? (ptInRect(sh.a,r)&&ptInRect(sh.b,r))
  : segRect(sh.a,sh.b,r);
 if(!sh.pts||!sh.pts.length)return false;
 const all=sh.pts.every(p=>ptInRect(p,r));
 if(window)return all;
 if(all)return true;
 for(let i=0;i<sh.pts.length;i++)
  if(segRect(sh.pts[i],sh.pts[(i+1)%sh.pts.length],r))return true;
 // D2-01: إطار صغير داخل مضلع كبير (عمود 400x400)
 const cx=(r.x0+r.x1)/2, cy=(r.y0+r.y1)/2;
 if(pip(sh.pts,cx,cy)) return true;
 return ptInRect(sh.pts[0],r);
}
/* هيكل محدَّب — لرقع الأركان وقت العرض */
export function hull(pts){
 const P=pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 if(P.length<3)return P;
 const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const lo=[],up=[];
 P.forEach(p=>{
  while(lo.length>1&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();
  lo.push(p)});
 P.slice().reverse().forEach(p=>{
  while(up.length>1&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();
  up.push(p)});
 lo.pop(); up.pop();
 return lo.concat(up);
}

/* ═══ تقاطع قطعتين ═══
   يعيد المعاملَين لا النقطة: التقسيم يقع على القطعة الأصلية فلا
   يتراكم خطأ التدوير. والمتوازيتان تُترَكان — الرؤوس تُسقَط عليهما
   في المرحلة التالية، وهو ما يجعل التلامس عقدةً. */
export function segInt(a,b,c,d){
 PERF.pairs++;
 const rx=b[0]-a[0], ry=b[1]-a[1];
 const sx=d[0]-c[0], sy=d[1]-c[1];
 const den=rx*sy-ry*sx;
 if(Math.abs(den)<1e-12)return null;
 const qx=c[0]-a[0], qy=c[1]-a[1];
 let t=(qx*sy-qy*sx)/den;
 let u=(qx*ry-qy*rx)/den;
 if(t<-1e-9||t>1+1e-9)return null;
 if(u<-1e-9||u>1+1e-9)return null;
 t=(t<0)?0:((t>1)?1:t);
 u=(u<0)?0:((u>1)?1:u);
 return {t,u};
}
/* ═══ تلامسُ محدَّبَين ═══
   ولِمَ لا يكفي «رأسٌ داخل الآخر»؟ شريطُ جدارٍ بسماكة ٢٠٠ يعبر
   عموداً ٤٠٠×٤٠٠ فلا رأسَ لأحدهما داخل الآخر: أضلاعُهما تتقاطع
   وحدها. فكان العمودُ على الجدار لا يُعرَف، والمتراكبان لا يُقالان.

   tol حدُّ الفصل بإشارته:
    · 0  التلامسُ الحدّيُّ تماسّ
    · +  فجوةٌ دونه تُعَدّ تماسّاً (هامش)
    · −  يشترط تداخلاً بمقداره — فتلاصقُ وجهين ليس تراكباً
   وهي إشارةُ pad في bboxHit نفسُها، فيُقرأ النداءان معاً.

   ولا تصحّ إلّا للمحدَّب: المقعَّرُ قد يُقال متلامساً وهو غيرُ
   متلامس (ولا العكسَ أبداً). ومدخلاتُ المشروع محدَّبةٌ كلُّها —
   شريطُ جدارٍ ومستطيلُ عمودٍ ومضلّعُ دائرةٍ ومستطيلُ أداة. */
export function convexHit(A,B,tol){
 const a=A||[], b=B||[];
 if(a.length<3||b.length<3)return false;
 const T=(tol==null)?0:tol;
 return !axisGap(a,b,T)&&!axisGap(b,a,T);
}
/* ═══ تلامسُ مضلّعَين أيّاً كان شكلاهما — D13 ═══
   convexHit (SAT) لا تصحّ للمقعَّر: شريطُ الجدار القوسي band(w)
   مقعَّر، فكانت تحكم بغلافه المحدَّب وتعدّ الفراغَ بين الوتر والقوس
   الداخلي جدراً. هنا الفحصُ الدقيق لأي مضلّعَين بسيطين (بلا تقاطعٍ
   ذاتيّ):
    · أقصرُ مسافةٍ بين أي ضلعين ≤ tol ⇒ تلامس (0 عند التقاطع)
    · وإلا فلا تقاطع بين الحدّين، فإما منفصلان وإما أحدُهما داخل الآخر
      كلّه: رأسٌ واحد من كلٍّ منهما يكفي لكشف الاحتواء.
   tol ≥ 0 فقط: الفجوةُ دونه تُعَدّ تماسّاً، والصفرُ التماسّ الحدّيّ
   (كإشارة convexHit). أمّا السالب (اشتراط تداخلٍ بمقداره) فلا معنى
   له هنا فيُعامَل صفراً — ومنه colsOverlap تبقى على convexHit لأن
   الأعمدة محدَّبة. O(n·m): شريط قوسٍ بـ~50 رأساً مع عمودٍ برؤوسه
   الأربعة ≈ ٢٠٠ زوج. */
export function polyHit(A,B,tol){
 const a=A||[], b=B||[];
 if(a.length<3||b.length<3)return false;
 const T=(tol==null||!(tol>0))?0:tol;
 const gap=(p,q,u,v)=>segSeg(p,q,u,v)?0:Math.min(
  distSeg(u,v,p[0],p[1]),distSeg(u,v,q[0],q[1]),
  distSeg(p,q,u[0],u[1]),distSeg(p,q,v[0],v[1]));
 for(let i=0;i<a.length;i++){
  const p=a[i], q=a[(i+1)%a.length];
  for(let j=0;j<b.length;j++)
   if(gap(p,q,b[j],b[(j+1)%b.length])<=T)return true;
 }
 return pip(a,b[0][0],b[0][1])||pip(b,a[0][0],a[0][1]);
}
function axisGap(P,Q,T){
 for(let i=0,n=P.length;i<n;i++){
  const p=P[i], q=P[(i+1)%n];
  const ex=q[0]-p[0], ey=q[1]-p[1];
  const L=Math.hypot(ex,ey);
  if(L<1e-9)continue;                /* ضلعٌ منحلٌّ لا محورَ له */
  const nx=-ey/L, ny=ex/L;
  let a0=1/0,a1=-1/0,b0=1/0,b1=-1/0;
  for(let k=0;k<P.length;k++){
   const v=P[k][0]*nx+P[k][1]*ny;
   if(v<a0)a0=v;
   if(v>a1)a1=v;
  }
  for(let k=0;k<Q.length;k++){
   const v=Q[k][0]*nx+Q[k][1]*ny;
   if(v<b0)b0=v;
   if(v>b1)b1=v;
  }
  if(Math.min(a1,b1)-Math.max(a0,b0) < -T)return true;
 }
 return false;
}
/* ═══ شبكةٌ موحّدة الخلايا ═══
   منطق core/sindex نفسه: صندوقٌ لكل عنصر، وما امتدّ فوق حدٍّ
   يُفحَص دائماً. والخليّة تُشتَقّ من البيانات لا تُثبَّت: نموذجٌ
   بمقياس المتر وآخر بالمليمتر لا يشتركان في مقاس. */
const GBIG=64, GWIDE=4096;
function cellFor(box,n){
 if(!box||n<2)return 1000;
 const d=Math.max(box.x1-box.x0, box.y1-box.y0, 1);
 return Math.max(50, Math.min(1e7,
  Math.round(d/Math.sqrt(n)*1.5)||1000));
}
function gridOf(boxes,cell){
 const g=new Map(), big=[];
 for(let i=0;i<boxes.length;i++){
  const b=boxes[i];
  if(!b){big.push(i); continue}
  const x0=Math.floor(b.x0/cell), x1=Math.floor(b.x1/cell);
  const y0=Math.floor(b.y0/cell), y1=Math.floor(b.y1/cell);
  if((x1-x0+1)*(y1-y0+1)>GBIG){big.push(i); continue}
  for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++){
   const k=cx+","+cy;
   let a=g.get(k);
   if(!a){a=[]; g.set(k,a)}
   a.push(i);
  }
 }
 PERF.cells+=g.size;
 return {cell,g,big};
}
/* استعلامٌ بلا تخصيصٍ لكل نداء: بصمةُ دورٍ تمنع التكرار.
   يعيد -1 حين يكون الصندوق أوسع من أن يُرشَّح — فالمستدعي يمسح. */
function queryFn(G,n){
 const seen=new Int32Array(n).fill(0);
 let tick=0;
 return (b,out)=>{
  tick++;
  out.length=0;
  for(let k=0;k<G.big.length;k++){
   const i=G.big[k];
   if(seen[i]!==tick){seen[i]=tick; out.push(i)}
  }
  if(!b)return -1;
  const c=G.cell;
  const x0=Math.floor(b.x0/c), x1=Math.floor(b.x1/c);
  const y0=Math.floor(b.y0/c), y1=Math.floor(b.y1/c);
  if((x1-x0+1)*(y1-y0+1)>GWIDE)return -1;
  for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++){
   const a=G.g.get(cx+","+cy);
   if(!a)continue;
   for(let k=0;k<a.length;k++){
    const i=a[k];
    if(seen[i]!==tick){seen[i]=tick; out.push(i)}
   }
  }
  return out.length;
 };
}
/* ═══ حدُّ اللحم ═══
   ٢ مم قرارٌ معلَنٌ بحدَّيه:
   · فوق خطأ التدوير — R() يُخطئ نصف مليمتر لكل إحداثيّ، فحسابان
     لنقطةٍ واحدة يفترقان ١٫٤ مم، ومعهما إسقاطُ رأسٍ على وجهٍ
     يفترق بمقدار التفاوت نفسه.
   · ودون أنحف ما يُبنى — TMIN=50 مم، وأصغرُ حلقةٍ يقبلها الاتحاد
     ٤٠٠ مم². فلا يمكن أن يُلحَم شيءٌ ذو معنى هندسيّ.

   وفجوةٌ مقصودةٌ أضيق من ٢ مم تُلحَم. وهي أضيقُ من أن تُرسَم أو
   تُرى أو تُقاس، والسلوكُ القائم فيها أسوأ: الجدار يبدو متّصلاً
   والحلقةُ تتسرّب منه بلا كلمة. واللحمُ يُعَدّ فيُقرأ في القياس. */
export const WELD=2;

/* خريطةُ اللحم: أوّلُ ما يُصادَف في الجوار يصير ممثِّلاً.
   وخليّةُ الشبكة بمقدار التفاوت، فنقطتان دونه لا تفترقان أكثر من
   خليّةٍ في كل محور — والجوارُ ٣×٣ يكفي يقيناً.
   والترتيب يحكم الجواب، ومدخلُ polyBool مرتَّبٌ يقيناً (‏Map
   بترتيب الإدراج)، فالمخرَجُ ثابتٌ للمدخل نفسه. */
function weldMap(pts,tol){
 const T=Math.max(0.5,tol||WELD);
 const g=new Map(), rep=new Map();
 const kk=p=>R(p[0])+","+R(p[1]);
 let n=0;
 for(let i=0;i<pts.length;i++){
  const p=pts[i];
  const k=kk(p);
  if(rep.has(k))continue;
  const cx=Math.floor(p[0]/T), cy=Math.floor(p[1]/T);
  let best=null, bd=T*T;
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){
   const list=g.get((cx+a)+","+(cy+b));
   if(!list)continue;
   for(let m=0;m<list.length;m++){
    const d=dist2(p,list[m]);
    if(d<=bd){bd=d; best=list[m]}
   }
  }
  if(best){rep.set(k,best); n++; continue}
  const q=[R(p[0]),R(p[1])];
  rep.set(k,q);
  const ck=cx+","+cy;
  let list=g.get(ck);
  if(!list){list=[]; g.set(ck,list)}
  list.push(q);
 }
 return {rep,n,key:kk};
}

function tag(arr,info){
 const I=info||{};
 try{
  ["open","weld","dup","nil"].forEach(k=>{
   Object.defineProperty(arr,k,{value:I[k]|0,
    enumerable:false,configurable:true,writable:true});
  });
  Object.defineProperty(arr,"at",{value:I.at||null,
   enumerable:false,configurable:true,writable:true});
  if(I.stats)Object.defineProperty(arr,"stats",{value:I.stats,
   enumerable:false,configurable:true,writable:true});
 }catch(e){}
 return arr;
}
/* ═══ الخياطة ═══
   قطعٌ غير موجَّهة ⇒ حلقاتٌ مغلقة.

   ═══ اللحم أوّلاً ═══
   رأسان لنقطةٍ واحدة يفترقان مليمتراً حين يُحسَبان من قطعتين
   مختلفتين — وجدارٌ بزاويةٍ كسريّة يُنتِج ذلك في كل ركن. فالمفتاح
   R(p) وحده يجعلهما عقدتين، فتُطرَح القطعةُ صامتةً وينفتح الحدّ
   وتغيب الحلقة، وأداةُ «منطقة» تلوم المستخدم على إغلاقٍ هو مُغلَق.
   وtol كانت مُعلَنةً في التوقيع مُهمَلةً في الشفرة.

   ═══ والتوحيد بعده لا قبله ═══
   شظيّتان متطابقتان تفترقان مليمتراً تصيران بعد اللحم قطعتين بين
   العقدتين نفسهما — فضلعٌ مزدوجٌ في الرسم البيانيّ، وإحداهما تبقى
   غير مستعملةٍ فتُعَدّ «مفتوحة». والتوحيد في polyBool يبقى
   مُرشِّحاً رخيصاً لا حاسماً.

   ═══ والعقدة تُفكّ بالزاوية ═══
   عند عقدةٍ بأربع قطعٍ (مربّعان يتلامسان برأس) أوّلُ ما يُصادَف
   يخيط الحلقتين في واحدةٍ تعبر نفسها — فتُحسَب مساحةٌ خاطئة
   وتُرسَم حدودٌ مقطوعة (الدفعة ٨ب).

   وما لم يُغلَق يُعَدّ ويُقال موضعُه، ولا يُلفَّق.
   والمُعاد مصفوفةٌ عليها خواصُّ غيرُ مُعدَّدة — فمن يقرأ length
   وforEach وJSON يبقى عاملاً. */
export function stitch(segs,tol){
 const T=Math.max(0.5,(tol==null)?WELD:tol);
 const raw=[];
 (segs||[]).forEach(s=>{
  if(!s||!s[0]||!s[1])return;
  if(!isFinite(s[0][0])||!isFinite(s[0][1])
   ||!isFinite(s[1][0])||!isFinite(s[1][1]))return;
  raw.push(s);
 });
 /* ١ — اللحم */
 const pts=[];
 for(let i=0;i<raw.length;i++){pts.push(raw[i][0],raw[i][1])}
 const W=weldMap(pts,T);
 const at=p=>W.rep.get(W.key(p))||[R(p[0]),R(p[1])];
 const K=p=>p[0]+","+p[1];
 /* ٢ — القطع بعد اللحم: الصفريّة تُطرَح والمكرّرة تُوحَّد */
 const E=[], seen=new Set();
 let dup=0, nil=0;
 for(let i=0;i<raw.length;i++){
  const a=at(raw[i][0]), b=at(raw[i][1]);
  const ka=K(a), kb=K(b);
  if(ka===kb){nil++; continue}
  const kk=(ka<kb)?(ka+"|"+kb):(kb+"|"+ka);
  if(seen.has(kk)){dup++; continue}
  seen.add(kk);
  E.push({a,b,used:0});
 }
 PERF.weld+=W.n; PERF.dup+=dup; PERF.nil+=nil;
 PERF.stitch+=E.length;
 /* ٣ — الرسم البيانيّ */
 const N=new Map();
 E.forEach((e,i)=>{
  [[K(e.a),0],[K(e.b),1]].forEach(([k,d])=>{
   let a=N.get(k);
   if(!a){a=[]; N.set(k,a)}
   const from=d?e.b:e.a, to=d?e.a:e.b;
   a.push({e:i,d,ang:Math.atan2(to[1]-from[1],to[0]-from[0])});
  });
 });
 /* ٤ — استخراج الوجوه */
 const rings=[];
 let open=0, oat=null;
 for(let i=0;i<E.length;i++){
  if(E[i].used)continue;
  const ring=[];
  const startK=K(E[i].a);
  let h={e:i,d:0}, guard=0, ok=false, lastTo=null;
  while(guard++<=E.length*2+8){
   const e=E[h.e];
   if(e.used)break;
   e.used=1;
   const from=h.d?e.b:e.a, to=h.d?e.a:e.b;
   ring.push(from);
   lastTo=to;
   const nk=K(to);
   if(nk===startK){ok=true; break}
   const list=N.get(nk);
   if(!list||list.length<2)break;
   /* دخلنا العقدة، فنخرج بالنصف الذي يلي عكسَ دخولنا دَوَراناً
      مع الساعة — وهو استخراجُ الوجوه القياسيّ. */
   const back=Math.atan2(from[1]-to[1],from[0]-to[0]);
   let nxt=null, bd=1/0;
   for(let k=0;k<list.length;k++){
    const c=list[k];
    if(E[c.e].used)continue;
    let d=back-c.ang;
    while(d<=1e-12)d+=Math.PI*2;
    while(d>Math.PI*2+1e-12)d-=Math.PI*2;
    if(d<bd){bd=d; nxt=c}
   }
   if(!nxt)break;
   h=nxt;
  }
  if(ok&&ring.length>2)rings.push(ring);
  else{
   open+=(ring.length||1);
   if(lastTo)oat=[lastTo[0],lastTo[1]];
  }
 }
 PERF.open+=open;
 if(oat)PERF.openAt=oat;
 return tag(rings,{open,weld:W.n,dup,nil,at:oat});
}
/* ═══ اتحاد المضلّعات ═══
   طريقة الشظايا: تُقسَّم الحدود عند كل تقاطعٍ وكل تلامس، ثم تُصفّى
   الشظيّة بجانبَيها، ثم تُخاط.

   والتصفية بجانبَين لا بمنتصفٍ واحد: «منتصفها داخل غيرها» يفشل
   حيث يشترك جداران وجهاً واحداً — المنتصف على الحدّ لا داخله، فتبقى
   الشظيّة نسختين وتنشقّ الخياطة. والجانبان يقولان الحقّ: الشظيّة
   على حدّ الاتحاد إن كان أحد جانبيها مغطّىً والآخر لا.

   والتلامس يُقسَّم كالتقاطع: طرفُ جدارٍ يلمس وجه آخر لا يُنشئ
   تقاطعاً (المعامل عند الطرف بالضبط)، فلو لم يُصر عقدةً لبقيت
   شظيّةٌ لا جوارَ لها.

   والفهرسة تحكم الكلفة: ألفٌ ومئتا قطعةٍ في مسكنٍ من عشرين غرفة
   تعني مليوناً وأربع مئة ألف اختبارِ تقاطعٍ بالمسح الكامل، وهي
   تُعاد مع كل تغيّرٍ هندسيّ. */
export function polyBool(polys,opt){
 const t0=now();
 const O=Object.assign({eps:1,minArea:1},opt||{});
 const eps=Math.max(0.5,O.eps);
 /* حدُّ اللحم مُعلَنٌ ومستقلّ: eps تفاوتُ الإسقاط والتقسيم، وهذا
    تفاوتُ العقدة — والثاني يجب أن يفوق الأول لأن رأسين يفترقان
    بمقدار الإسقاط ثم بخطأ التدوير معاً. */
 const wl=Math.max(WELD,eps*2,(+O.weld||0));
 PERF.union++;
 const P=(polys||[]).map(r=>cleanRing(r,0))
  .filter(r=>r&&r.length>2);
 if(!P.length)return tag([],{stats:{polys:0,frags:0,segs:0,ms:0}});
 if(P.length===1){
  const one=cleanRing(ccw(P[0]),1);
  return tag(one.length>2?[one]:[],
   {stats:{polys:1,frags:0,segs:0,ms:0}});
 }
 /* ١ — الصناديق والفهرسان */
 const pBox=P.map(r=>bboxOf(r));
 const PG=gridOf(pBox,cellFor(bboxAll(pBox),P.length));
 const qPoly=queryFn(PG,P.length);

 const SA=[], SB=[], SP=[];
 P.forEach((r,pi)=>{
  for(let i=0;i<r.length;i++){
   SA.push(r[i]); SB.push(r[(i+1)%r.length]); SP.push(pi);
  }
 });
 const ns=SA.length;
 const sBox=[];
 for(let i=0;i<ns;i++)sBox.push(bboxOf([SA[i],SB[i]]));
 const SG=gridOf(sBox,cellFor(bboxAll(sBox),ns));
 const qSeg=queryFn(SG,ns);

 /* ٢ — معاملات التقسيم */
 const cuts=new Array(ns);
 for(let i=0;i<ns;i++)cuts[i]=[0,1];
 const cand=[];
 for(let i=0;i<ns;i++){
  const A=SA[i], B=SB[i];
  const n2=qSeg(bboxPad(sBox[i],eps),cand);
  const full=(n2<0);
  const lim=full?ns:cand.length;
  for(let k=0;k<lim;k++){
   const j=full?k:cand[k];
   if(j===i||SP[j]===SP[i])continue;
   const C=SA[j], D=SB[j];
   const x=segInt(A,B,C,D);
   if(x){cuts[i].push(x.t); continue}
   /* التلامس والانطباق: رؤوسُ الأخرى تُسقَط على هذه */
   const r1=nearOnSeg(A,B,C[0],C[1]);
   if(r1.d<=eps)cuts[i].push(r1.t);
   const r2=nearOnSeg(A,B,D[0],D[1]);
   if(r2.d<=eps)cuts[i].push(r2.t);
  }
 }
 /* ٣ — الشظايا · مفتاحٌ غير مرتَّب ⇒ نسخةٌ واحدة.
    وهذا ترشيحٌ رخيصٌ لا حاسم: الحاسمُ في stitch بعد اللحم، لأن
    نسختين تفترقان مليمتراً لا يجمعهما مفتاحٌ مُدوَّر. */
 const key=p=>R(p[0])+","+R(p[1]);
 const F=new Map();
 for(let i=0;i<ns;i++){
  const A=SA[i], B=SB[i], L=dist(A,B);
  if(L<eps)continue;
  const ts=cuts[i].filter(t=>t>=0&&t<=1).sort((x,y)=>x-y);
  for(let k=0;k+1<ts.length;k++){
   if((ts[k+1]-ts[k])*L<eps)continue;
   const a=[R(A[0]+(B[0]-A[0])*ts[k]),   R(A[1]+(B[1]-A[1])*ts[k])];
   const b=[R(A[0]+(B[0]-A[0])*ts[k+1]), R(A[1]+(B[1]-A[1])*ts[k+1])];
   const ka=key(a), kb=key(b);
   if(ka===kb)continue;
   PERF.frags++;
   const kk=(ka<kb)?(ka+"|"+kb):(kb+"|"+ka);
   if(!F.has(kk))F.set(kk,{a,b});
  }
 }
 /* ٤ — التصفية بجانبَين */
 const pc=[];
 const covered=(x,y)=>{
  const n2=qPoly({x0:x,y0:y,x1:x,y1:y},pc);
  const full=(n2<0);
  const lim=full?P.length:pc.length;
  for(let k=0;k<lim;k++){
   const i=full?k:pc[k];
   if(!bboxIn(pBox[i],x,y,0))continue;
   if(pip(P[i],x,y))return true;
  }
  return false;
 };
 /* الإزاحة دون أنحف ما نبنيه (٥٠ مم سماكةً دُنيا) ولا تحت
    خطأ التدوير — فالمِجَسّ يقع في الجانب لا على الحدّ. */
 const off=Math.max(2,eps*2);
 const segs=[];
 F.forEach(f=>{
  const m=mid(f.a,f.b);
  const dx=f.b[0]-f.a[0], dy=f.b[1]-f.a[1];
  const L=Math.hypot(dx,dy)||1;
  const nx=-dy/L*off, ny=dx/L*off;
  const s1=covered(m[0]+nx, m[1]+ny);
  const s2=covered(m[0]-nx, m[1]-ny);
  if(s1===s2)return;         /* داخليّةٌ أو شاذّة */
  PERF.kept++;
  segs.push([f.a,f.b]);
 });
 /* ٥ — الخياطة والتنظيف */
 const st=stitch(segs,wl);
 const rings=[];
 st.forEach(r=>{
  const c=cleanRing(r,1);
  if(c.length<3)return;
  if(Math.abs(pArea(c))<O.minArea)return;
  rings.push(c);
 });
 PERF.rings+=rings.length;
 const ms=now()-t0;
 PERF.ms+=ms;
 return tag(rings,{open:st.open|0, weld:st.weld|0,
  dup:st.dup|0, nil:st.nil|0, at:st.at,
  stats:{polys:P.length, segs:segs.length, frags:F.size,
   weld:st.weld|0, dup:st.dup|0, ms:Math.round(ms)}});
}

/* ═══ هل الحلقة تقطع نفسها؟ ═══
   يُستعمل قبل الاتحاد وعند التحقّق من حلقاتٍ واردة من ملف.
   الضلعان المتجاوران يتقاسمان رأساً فلا يُعدّان تقاطعاً. */
export function hasSelfInt(r){
 const n=(r||[]).length;
 if(n<4)return false;
 for(let i=0;i<n;i++){
  const a=r[i], b=r[(i+1)%n];
  for(let j=i+2;j<n;j++){
   if(i===0&&j===n-1)continue;
   const c=r[j], d=r[(j+1)%n];
   if(segSeg(a,b,c,d))return true;
  }
 }
 return false;
}

/* ═══ حلقةٌ محدَّبة؟ ═══ §٣ (حدُّ قصِّ المنفذ)
   إشارةُ الضربِ المتّجهِ واحدةٌ على كلِّ الرؤوس. والرؤوسُ المستقيمةُ
   (ضربٌ صفرٌ) مقبولةٌ: ضلعٌ مقسومٌ ليس تقعّراً.
   موضعُها هنا لا في sheet.js لأنّ `state.js` يحتاجها في التطبيعِ
   ولا يستورد sheet.js (دورةٌ: هي تستورده). وgeom ورقةٌ بلا
   استيرادٍ فيقرؤها الاثنان بلا تفرُّقِ مصدرِ حقيقة. */
export function isConvexRing(P){
 const n=(P||[]).length;
 if(n<3)return false;
 let sign=0;
 for(let i=0;i<n;i++){
  const a=P[i], b=P[(i+1)%n], c=P[(i+2)%n];
  if(!a||!b||!c)return false;
  const z=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
  if(Math.abs(z)<1e-9)continue;
  const sg=z>0?1:-1;
  if(!sign)sign=sg;
  else if(sg!==sign)return false;
 }
 return sign!==0;
}
