/* ═══ سحابة المراجعة — RC ═══
   حلقة مغلقة تُرسم فَلَقات بأقواس حقيقية (bulgeArc). طبقتها A-CLOUD
   مصنعُها «لا تُطبَع» → تُرى على الشاشة وتخرج تلقائياً من الأربع صيغ
   ومن BOQ بمعيار الطباعة — ولا صفّ لها في boq.js أصلاً (استبعادٌ مطلق). */
import {S,touchView,txtH} from "./state.js";
import {V} from "./validate.js";
import {newId,clamp,sqm} from "./units.js";
import {pArea,pip,ccw,cleanRing,centroid} from "./geom.js";
import {bulgeArc} from "./arcmath.js";
import {normLevel} from "./level.js";

const R=v=>Math.round(v);
export const cloudById=id=>S.clouds.find(c=>c.id===id)||null;

/* التسمية: أول فجوة حرة (RC1 · RC2 …) — تُعيَّن عند الإنشاء وتُخزَّن صريحة */
export const nextCloudLabel=()=>{
 const used=new Set((S.clouds||[]).map(c=>String(c.label||"")));
 let i=1;
 while(used.has("RC"+i))i++;
 return "RC"+i;
};

export function addCloud(ring,opt){
 const o=opt||{};
 V("cloud",{ring:ring||[],r:o.r,label:o.label});
 const rng=ccw(cleanRing(ring,2));
 if(rng.length<3)throw new Error("حلقة السحابة أقلّ من 3 أضلاع");
 if(Math.abs(pArea(rng))<1e6)
  throw new Error(`السحابة ${sqm(Math.abs(pArea(rng)))} م² — الأصغر 1.00 م²`);
 const c={id:newId("RC"), ring:rng,
  r:clamp(Math.round(+o.r||500),50,5000),
  label:(o.label!=null&&String(o.label).trim())
   ?String(o.label).trim().slice(0,60):nextCloudLabel(),
  level:normLevel(S.meta.level)};
 S.clouds.push(c); touchView();
 return c;
}
export function delCloud(c){
 const i=S.clouds.indexOf(c);
 if(i<0)return false;
 S.clouds.splice(i,1); touchView();
 return true;
}
export const cloudAt=(x,y,cand)=>{
 let best=null, ba=1/0;
 (cand||S.clouds||[]).forEach(c=>{
  if(!pip(c.ring,x,y))return;
  const ar=Math.abs(pArea(c.ring));
  if(ar<ba){ba=ar;best=c}
 });
 return best;
};

/* الفَلَقات: كل ضلع يُقسَّم لخطوات بطول ≈ r، كلٌّ قوسٌ بانتفاخٍ متناوب
   الإشارة؛ bulge = tan(θ/4) حيث sin(θ/2) = نصف الوتر / r */
export function cloudPrims(c){
 const L="A-CLOUD", out=[], h=txtH(), rr=c.r||500;
 const P=c.ring||[], n=P.length;
 if(n<3)return out;
 for(let i=0;i<n;i++){
  const a=P[i], b=P[(i+1)%n], len=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(len<2)continue;
  const k=Math.max(1,Math.round(len/rr));
  for(let s=0;s<k;s++){
   const p0=[R(a[0]+(b[0]-a[0])*s/k),R(a[1]+(b[1]-a[1])*s/k)];
   const p1=[R(a[0]+(b[0]-a[0])*(s+1)/k),R(a[1]+(b[1]-a[1])*(s+1)/k)];
   const sl=Math.hypot(p1[0]-p0[0],p1[1]-p0[1]);
   if(sl<2)continue;
   const x=Math.max(-1,Math.min(1,sl/(2*rr)));
   const bulge=Math.tan(Math.asin(x)/2)*((s%2)?-1:1);
   const A=bulgeArc(p0,p1,bulge);
   out.push(A
    ?{t:"arc",L,cx:R(A.cx),cy:R(A.cy),r:R(A.r),
      a0:A.a0*180/Math.PI,a1:A.a1*180/Math.PI,oid:c.id}
    :{t:"line",L,a:p0,b:p1,oid:c.id});
  }
 }
 const cp=centroid(P);
 out.push({t:"text",L,s:c.label||"",x:R(cp[0]),y:R(cp[1]-h*0.5),
  h:R(h*0.82),al:"mc",oid:c.id});
 return out;
}
