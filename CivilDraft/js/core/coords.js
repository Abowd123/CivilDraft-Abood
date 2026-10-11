/* ═══ فكّ الإحداثيات · التقييد الزاوي ═══
   مساعدة إدخال خالصة: تعينك على إصابة النقطة التي قصدتها،
   ولا تُعدّل شيئاً بعد وقوعها.

   2.2 — لا إسقاطَ صامت إلى الصفر:
   · PT الصارمة تعيد null لا [0,0] لما ليس نقطةً كاملةً منتهيةً
     داخل الحدّ. ولا تُنادي M المتساهلة إطلاقاً.
   · parsePt تفحص X وY معاً: كان الفاشل منهما يصير صفراً ويُكتَب
     الآخر، فتنشأ نقطةٌ في الأصل بلا تنبيه.
   · parsePt: null = لا صيغةَ تطابق (قرارُ المستدعي: قد يكون اسمَ
     أداة) · {k:"err",c,m} = صيغةٌ مطابقة وقيمتها مرفوضة بسببٍ ·
     ولا تَرمي أبداً — الرفض قرارُ المستدعي (parse.js يحوّله رمياً). */
import {Mx,norm,D2R,R2D,deg,dim2} from "./units.js";
import {LIM} from "./limits.js";
export {D2R,R2D};

export const polar=(o,L,a)=>
 [Math.round(o[0]+L*Math.cos(a*D2R)),Math.round(o[1]+L*Math.sin(a*D2R))];
export const angOf=(a,b)=>deg(Math.atan2(b[1]-a[1],b[0]-a[0])*R2D);
export const lenOf=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);

/* ═══ PT الصارمة ═══ عددان منتهيان (نوعُهما number) داخل LIM.coord.
   العنصر الزائد بعد الثاني يُهمَل. تقرِّب إلى مليمترٍ صحيح. */
export function PT(p){
 if(!Array.isArray(p)||p.length<2)return null;
 const x=p[0], y=p[1], MX=LIM.coord.max;
 if(typeof x!=="number"||typeof y!=="number"||!isFinite(x)||!isFinite(y))
  return null;
 const a=Math.round(x), b=Math.round(y);
 if(Math.abs(a)>MX||Math.abs(b)>MX)return null;
 return [a,b];
}
/* حيث الصمتُ أسوأ: يرمي برسالةٍ تسمّي الموضع */
export function needPT(p,what){
 const q=PT(p);
 if(!q)throw new Error(`${what||"النقطة"} غير صالحة — إحداثيٌّ ناقص أو `
  +`غير منتهٍ أو خارج الحدّ`);
 return q;
}

/* ═══ أكواد الرفض ═══ رسالةٌ واحدة لكل كود */
export const PE={
 EMPTY:"الإحداثيّ فارغ",
 BASE_MISSING:"@ يحتاج نقطة أساس",
 BAD_BASE:"نقطة الأساس غير صالحة",
 NO_DIR:"حرّك المؤشر لتحديد الاتجاه ثم اكتب المسافة",
 OUT_OF_RANGE:"خارج الحدّ المسموح"
};
const err=c=>({k:"err",c,m:PE[c]});
const errT=(c,what)=>({k:"err",c,m:`${what} ${PE[c]}`});
/* رقمٌ بوحدةٍ اختيارية */
const NUM="-?\\d*\\.?\\d+(?:mm|cm|m|مم|سم|م)?";
const RE_POLAR=new RegExp("^("+NUM+")<(-?\\d+(?:\\.\\d+)?)$");
const RE_XY=new RegExp("^("+NUM+")[,]("+NUM+")$");
const RE_LEN=new RegExp("^("+NUM+")$");

/* 3,4 مطلق · @5,3 نسبي · 5<45 قطبي · @5<45 قطبي نسبي
   5 مسافة في الاتجاه الحالي · <45 قفل زاوية · 3x4 مقاس
   والوحدات mm/cm/m تُقبَل لاحقةً لكل رقم. */
export function parsePt(s,base,dir){
 const t=norm(s).replace(/\s+/g,"");
 if(!t)return err("EMPTY");
 let rel=false, body=t;
 if(body[0]==="@"){
  rel=true; body=body.slice(1);
  /* الأساسُ يُفحَص فوراً — لا نُكمل بنقطةٍ مهترئة */
  if(!base)return err("BASE_MISSING");
  base=PT(base);
  if(!base)return err("BAD_BASE");
 }
 const fin=(p,what)=>PT(p)?{k:"pt",p:PT(p)}:errT("OUT_OF_RANGE",what);
 let m=/^<(-?\d+(?:\.\d+)?)$/.exec(body);
 if(m)return {k:"ang",a:+m[1]};
 m=RE_POLAR.exec(body);
 if(m){
  const L=Mx(m[1]);
  if(L==null)return errT("OUT_OF_RANGE",`الطول «${m[1]}»`);
  return fin(polar(rel?base:[0,0],L,+m[2]),"النقطة");
 }
 /* X وY معاً: كان الفاشل يُسقَط صفراً ويُكتَب الآخر */
 m=RE_XY.exec(body);
 if(m){
  const x=Mx(m[1]), y=Mx(m[2]);
  if(x==null||y==null)
   return errT("OUT_OF_RANGE",`الإحداثيّ («${m[1]}» , «${m[2]}»)`);
  return fin(rel?[base[0]+x,base[1]+y]:[x,y],"النقطة");
 }
 /* ═══ D1-05 ═══ x/* الآليّان مقبولان أصلاً؛ × (الرمز الذي تعرضه
    الواجهة نفسها عبر dim2) لم يكن مقبولاً إدخالاً — وكذا رقمٌ يحمل
    وحدته الخاصة في كلّ طرف (3m×4m، 3000x4000mm). كلّ رقمٍ يقبل
    وحدته المستقلة كما في NUM. */
 m=new RegExp("^("+NUM+")[x*×]("+NUM+")$").exec(body);
 if(m){
  /* الطرف الأول بلا وحدة يرث وحدة الثاني: 3000x4000mm = 3000×4000 مم
     (وليس 3000 متر). كلاهما بلا وحدة ⇒ أمتار كما كان. */
  const UN=/(mm|cm|m|مم|سم|م)$/;
  const u2=UN.exec(m[2]);
  const a1=(!UN.test(m[1])&&u2)?m[1]+u2[1]:m[1];
  const w=Mx(a1), d=Mx(m[2]);
  if(w==null||d==null)return errT("OUT_OF_RANGE",`المقاس «${dim2(m[1],m[2])}»`);
  return {k:"dim",w,d};
 }
 m=RE_LEN.exec(body);
 if(m){
  const L=Mx(m[1]);
  if(L==null)return errT("OUT_OF_RANGE",`المسافة «${m[1]}»`);
  if(!base)return {k:"len",L};
  if(!dir)return err("NO_DIR");
  const r=fin([base[0]+dir[0]*L,base[1]+dir[1]*L],"النقطة");
  if(r.k==="pt")r.dde=1;
  return r;
 }
 return null;                       /* لا صيغةَ تطابق — قرارُ المستدعي */
}
export function trackAngles(mode,inc,extra){
 if(mode==="ortho")return [0,90,180,270];
 if(mode!=="polar")return null;
 const st=Math.max(1,Math.min(90,inc||15)), A=[];
 for(let a=0;a<360;a+=st)A.push(a);
 (extra||[]).forEach(v=>{const x=deg(+v); if(!A.includes(x))A.push(x)});
 return A.sort((a,b)=>a-b);
}
/* يقيّد p على أقرب زاوية متاحة — إسقاط عمودي */
export function constrain(base,p,mode,inc,extra,tolDeg){
 if(!base)return null;
 const A=trackAngles(mode,inc,extra); if(!A)return null;
 const dx=p[0]-base[0], dy=p[1]-base[1];
 if(Math.hypot(dx,dy)<1)return null;
 const a=deg(Math.atan2(dy,dx)*R2D);
 let best=null,bd=1e9;
 A.forEach(t=>{
  let d=Math.abs(t-a); if(d>180)d=360-d;
  if(d<bd){bd=d;best=t}
 });
 if(best==null)return null;
 const tol=(tolDeg!=null)?tolDeg
  :((mode==="ortho")?90:Math.min(12,(inc||15)/2));
 if(bd>tol)return null;
 const ux=Math.cos(best*D2R), uy=Math.sin(best*D2R);
 const t=dx*ux+dy*uy;
 return {a:best,L:t,
  p:[Math.round(base[0]+ux*t),Math.round(base[1]+uy*t)]};
}
