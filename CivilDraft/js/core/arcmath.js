/* ═══ رياضيّات الأقواس — ورقةٌ خالصة ═══
   كانت arcParams/isArc داخل walls.js، فتعذّر على geom.js وغيره
   استعمالها. هذه الوحدة لا تستورد شيئاً، فتُستورَد من أيّ مكانٍ بلا
   دورة، وwalls.js يُعيد تصديرها للتوافق الخلفي. */

export const isArc=w=>!!(w&&isFinite(+w.bulge)&&Math.abs(+w.bulge)>1e-4);

export function arcParams(w){
 if(!isArc(w)||!w.a||!w.b)return null;
 const ax=w.a[0],ay=w.a[1],bx=w.b[0],by=w.b[1];
 const dx=bx-ax, dy=by-ay, L=Math.hypot(dx,dy);
 if(L<1e-6)return null;
 const bg=+w.bulge;
 const k=(1-bg*bg)/(2*bg);
 const cx=ax+dx/2-dy/2*k, cy=ay+dy/2+dx/2*k;
 const R=Math.hypot(ax-cx,ay-cy);
 const a0=Math.atan2(ay-cy,ax-cx);
 const sweep=4*Math.atan(bg);          /* موقَّع */
 const a1=a0+sweep;
 return {cx,cy,R,a0,a1,sweep,L,bulge:bg};
}

const TAU=2*Math.PI;
/* هل الزاوية a داخل مدى القوس؟ الفرق مُطبَّعٌ إلى اتجاه القوس */
export const inSweep=(P,a)=>{
 let d=(a-P.a0)%TAU;
 if(P.sweep>=0){ if(d<0)d+=TAU; return d<=P.sweep+1e-9; }
 if(d>0)d-=TAU;
 return d>=P.sweep-1e-9;
};

/* تقاطع دائرة القوس مع قطعةٍ مستقيمة a→b (نقاطٌ داخل القطعة والمدى) */
export function arcLineInt(w,a,b){
 const P=arcParams(w); if(!P)return [];
 const dx=b[0]-a[0], dy=b[1]-a[1];
 const A=dx*dx+dy*dy;
 if(A<1e-9)return [];
 const fx=a[0]-P.cx, fy=a[1]-P.cy;
 const B=2*(fx*dx+fy*dy);
 const C=fx*fx+fy*fy-P.R*P.R;
 const D=B*B-4*A*C;
 if(D<-1e-9)return [];
 const ts=D<0?[-B/(2*A)]
  :[(-B-Math.sqrt(D))/(2*A),(-B+Math.sqrt(D))/(2*A)];
 const out=[];
 for(const t of ts){
  if(t<-1e-9||t>1+1e-9)continue;
  const x=a[0]+dx*t, y=a[1]+dy*t;
  if(inSweep(P,Math.atan2(y-P.cy,x-P.cx)))out.push([x,y]);
 }
 return out;
}

/* تقاطع قوسين — على مستوى الدائرتين ثم تصفيةٌ بالمدى */
export function arcArcInt(w1,w2){
 const P1=arcParams(w1), P2=arcParams(w2);
 if(!P1||!P2)return [];
 const dx=P2.cx-P1.cx, dy=P2.cy-P1.cy, d=Math.hypot(dx,dy);
 if(d<1e-9)return [];
 if(d>P1.R+P2.R+1e-9||d<Math.abs(P1.R-P2.R)-1e-9)return [];
 const a=(P1.R*P1.R-P2.R*P2.R+d*d)/(2*d);
 const h2=P1.R*P1.R-a*a;
 if(h2<-1e-9)return [];
 const h=Math.sqrt(Math.max(0,h2));
 const xm=P1.cx+a*dx/d, ym=P1.cy+a*dy/d;
 const rx=-dy*(h/d), ry=dx*(h/d);
 const pts=h<1e-9?[[xm,ym]]:[[xm+rx,ym+ry],[xm-rx,ym-ry]];
 return pts.filter(([x,y])=>
  inSweep(P1,Math.atan2(y-P1.cy,x-P1.cx))
  &&inSweep(P2,Math.atan2(y-P2.cy,x-P2.cx)));
}

/* عدد القطع لسهمٍ أقصاه tol مم (أقصى بعدٍ بين القوس ووتره).
   يُحصَر بين 6 و360. */
export function arcSegsTol(P,tol){
 const t=(tol==null)?0.5:Math.max(0.05,+tol||0.5);
 if(!P||!(P.R>=1))return 6;
 const maxSag=Math.min(t,P.R*0.9);
 const c=1-maxSag/P.R;
 if(c<=-1)return 360;
 const step=2*Math.acos(c);
 if(!(step>0))return 360;
 const n=Math.ceil(Math.abs(P.sweep)/step);
 return n<6?6:(n>360?360:n);
}

/* الطول الحقيقيّ للقوس */
export const arcLenOf=P=>P?Math.abs(P.sweep)*P.R:0;

/* ═══ قوس من انتفاخ بين نقطتين — للخطّ المتعدّد PL وسحابة المراجعة RC ═══
   يعمل على انتفاخ DXF نفسه الذي تقرؤه arcParams (نفس المعادلة)، لكن على
   نقطتين صريحتين لا على جدار. تعيد {cx,cy,r,a0,a1,sweep,bulge} بالراديان
   (الحقول a0/sweep متوافقة مع inSweep أعلاه) أو null إن كان مستقيماً/منحلّاً.
   inSweep موجودة أصلاً في هذا الملف — فلا نسخة ثانية. */
export function bulgeArc(a,b,bg){
 if(!a||!b)return null;
 const dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy);
 if(L<1e-9)return null;
 const B=+bg;
 if(!isFinite(B)||Math.abs(B)<1e-4)return null;
 const k=(1-B*B)/(2*B);
 const cx=a[0]+dx/2-dy/2*k, cy=a[1]+dy/2+dx/2*k;
 const r=Math.hypot(a[0]-cx,a[1]-cy);
 const a0=Math.atan2(a[1]-cy,a[0]-cx);
 const sweep=4*Math.atan(B);
 const a1=a0+sweep;
 return {cx,cy,r,a0,a1,sweep,bulge:B};
}
