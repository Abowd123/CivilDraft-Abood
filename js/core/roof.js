/* ═══ السقف — B2 ═══
   حلقة + نوع (flat/gable/hip/shed) + ميل + خطّ جمالون + مصارف.
   لا بصمة ولا stale: يرسمه المستخدم فلا شيء مشتقّ يُعاد حسابه.
   الأصل المخزَّن: ring و type و slope و h و ridge و drains؛ والمساحة
   والبطاقة تُحسَبان عند الطلب ولا تُخزَّنان. */
import {S,touchView,txtH} from "./state.js";
import {V} from "./validate.js";
import {newId,clamp,sqm} from "./units.js";
import {pArea,ccw,centroid,pip,cleanRing} from "./geom.js";
import {normLevel} from "./level.js";

const R=v=>Math.round(v);
export const RTYPE={flat:"مسطح", gable:"جمالون", hip:"هرمي", shed:"مائل"};
export const roofById=id=>S.roofs.find(r=>r.id===id)||null;
export const roofArea=r=>Math.abs(pArea((r&&r.ring)||[]));
export const roofLabel=r=>
 `${r.name||"سقف"} · ${RTYPE[r.type]||RTYPE.flat} ${r.slope}% · ${sqm(roofArea(r))} م²`;

/* أصغر سقفٍ يحوي النقطة — فالسقف الداخلي يغلب الخارجي المحيط به */
export const roofAt=(x,y,cand)=>{
 let best=null, ba=1/0;
 (cand||S.roofs||[]).forEach(r=>{
  if(!pip(r.ring,x,y))return;
  const ar=roofArea(r);
  if(ar<ba){ba=ar; best=r}
 });
 return best;
};

export function addRoof(ring,opt){
 const o=opt||{};
 /* الحلقة والحقول الرقميّة تمرّ بالمُدقِّق قبل أن يُكتب شيء */
 V("roof",{ring,
  name:(o.name==null)?undefined:String(o.name),
  slope:o.slope, h:o.h});
 const r=cleanRing(ccw(ring||[]),2);
 if(r.length<3)throw new Error("حلقة السقف أقلّ من 3 أضلاع");
 const ar=Math.abs(pArea(r));
 if(ar<1e6)throw new Error(`السقف ${sqm(ar)} م² — الأصغر 1.00 م²`);
 const roof={
  id:newId("RF"),
  ring:r,
  name:String(o.name||"").slice(0,40),
  type:RTYPE[o.type]?o.type:"flat",
  slope:clamp(Math.round(+o.slope||5),0,45),
  h:clamp(Math.round(+o.h||S.meta.wallH),200,8000),
  level:normLevel(S.meta.level),
  ridge:null,
  drains:[]
 };
 if(Array.isArray(o.ridge)&&o.ridge.length===2){
  roof.ridge=[[R(o.ridge[0][0]),R(o.ridge[0][1])],
              [R(o.ridge[1][0]),R(o.ridge[1][1])]];
 }
 if(Array.isArray(o.drains))
  roof.drains=o.drains.map(p=>[R(p[0]),R(p[1])]).slice(0,20);
 S.roofs.push(roof); touchView();
 return roof;
}

export function delRoof(r){
 const i=S.roofs.indexOf(r);
 if(i<0)return false;
 S.roofs.splice(i,1); touchView();
 return true;
}

export function roofPrims(r){
 const out=[], h=txtH(), L="A-ROOF";
 /* حدّ السقف */
 out.push({t:"poly",L,pts:r.ring,cl:1,rid:r.id});
 /* تعبئةٌ للسقف غير المسطّح */
 if(r.type!=="flat")
  out.push({t:"hatch",L:"A-ROOF-PATT",loops:[r.ring],pat:"ANSI31",
   sc:Math.max(8,h*1.1),rid:r.id});
 /* خطّ الجمالون */
 if(r.ridge)
  out.push({t:"line",L,a:r.ridge[0],b:r.ridge[1],dash:[6,3],rid:r.id});
 /* المصارف */
 (r.drains||[]).forEach(p=>{
  out.push({t:"arc",L,cx:p[0],cy:p[1],r:80,a0:0,a1:359.9,rid:r.id});
  out.push({t:"text",L,s:"◉",x:p[0],y:p[1],h:h*0.8,al:"mc",rid:r.id});
 });
 /* البطاقة */
 const c=centroid(r.ring);
 out.push({t:"text",L,s:roofLabel(r),x:R(c[0]),y:R(c[1]-h*0.5),
  h:h*0.82,al:"mc",rid:r.id});
 return out;
}
