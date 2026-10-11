/* ═══ المناطق المخبوزة ═══
   المنطقة كائن صريح: حلقة إحداثيات مخزَّنة، لا استنتاج يُعاد.
   تنقر داخل حلقة مغلقة مرّة، فتُخبَز مضلعاً يُسمّى ويُقاس ويُحرَّر
   بمقابضه. تغيير جدار لا يحرّكها: يجعلها «قديمة» بحدٍّ متقطّع،
   وأنت تحدّثها أو تثبّت بصمتها أو تتركها.

   لا تستورد render.js: الحلقات تُمرَّر إليها وسيطاً، فلا دورة.
   ولا sindex.js: فهرس صناديق الأجسام في walls.js — وهي تستورده
   سلفاً، فلا اتجاهَ يُقلَب. */
import {S,VER,edit,txtH} from "./state.js";
import {V} from "./validate.js";
import {patOk} from "./hatches.js";
import {newId,sqm} from "./units.js";
import {pArea,ccw,centroid,perim,pip,bboxOf,bboxHit,
        cleanRing,distPoly,poleOf,segRect} from "./geom.js";
import {band,wallsIn} from "./walls.js";
import {bump} from "./perf.js";
import {normLevel} from "./level.js";

const R=v=>Math.round(v);
export const MINA=250000;          /* أصغر منطقة مقبولة: ٠٫٢٥ م² */
export const FILLS={none:"بلا",tint:"صبغة",hatch:"هاشور"};
export const areaById=id=>S.areas.find(a=>a.id===id)||null;

/* ═══ المساحة والمحيط ═══
   صافية بين الوجوه الداخلية، لأن الحلقة هي حدّ الفراغ نفسه. */
export const netArea=a=>Math.abs(pArea((a&&a.ring)||[]));
export const netPerim=a=>perim((a&&a.ring)||[]);
/* ═══ تخطيط التسمية ═══
   موضع الاسم والمساحة وحجم خطّهما يُحسبان من شكل المنطقة لا من مركز
   ثقلها وحده: في الممرّات على شكل T أو L يقع المركز قرب الجدران أو
   خارج الشكل، فيتداخل النصّ مع الحدود.
   · الحجم المفضَّل يتناسب مع √المساحة (حول ١٢ م² = خطّ المقياس).
   · يُخفَّض الحجم بخطواتٍ حتى تتّسع كتلة النصّ كاملةً (الاسم والمساحة
     و«قديمة») داخل الحلقة بهامشٍ عن كل ضلع.
   · الموضع: مركز الثقل إن اتّسع فيه (فالمستطيل كما كان)، وإلا قطب
     اللاوصول، وإلا أوسع النقاط الداخلية.
   · الموضع الصريح lp لا يُنقَل: يُخفَّض الحجم وحده ليتّسع.
   التقدير 0.62×الارتفاع للحرف كما في render (حدود النصّ). */
const TW=0.62, LMIN=0.5, LMAX=1.6, AREF=12e6, SHRINK=0.88;
const blockOf=(a,h,stale)=>{
 const two=!!(a.name&&a.showArea), it=[];
 if(a.name)it.push({k:"n",s:a.name,dy:R(two?h*0.35:-h*0.5),h});
 if(a.showArea)
  it.push({k:"a",s:`${sqm(netArea(a))} م²`,dy:R(two?-h*1.35:-h*0.5),
   h:h*0.82});
 if(stale)it.push({k:"s",s:"قديمة",dy:R(a.name?h*1.9:h*1.1),h:h*0.7});
 return it;
};
const boxOf=it=>{
 let hw=0,y0=1/0,y1=-1/0;
 it.forEach(g=>{
  hw=Math.max(hw,String(g.s).length*g.h*TW/2);
  y0=Math.min(y0,g.dy-g.h/2);
  y1=Math.max(y1,g.dy+g.h/2);
 });
 return it.length?{hw,y0,y1}:{hw:0,y0:0,y1:0};
};
/* الكتلة بهامش m حول مركزٍ c لا تمسّ ضلعاً وتقع داخل الحلقة */
const fitsAt=(ring,c,bx,m)=>{
 const r={x0:c[0]-bx.hw-m,x1:c[0]+bx.hw+m,
          y0:c[1]+bx.y0-m,y1:c[1]+bx.y1+m};
 if(!pip(ring,c[0],c[1]+(bx.y0+bx.y1)/2))return false;
 for(let i=0,n=ring.length;i<n;i++)
  if(segRect(ring[i],ring[(i+1)%n],r))return false;
 return true;
};
const LC=new WeakMap();
function candidates(a,ring){
 if(a.lp)return [a.lp.slice()];
 const cen=centroid(ring), pole=poleOf(ring);
 const out=[];
 const dc=pip(ring,cen[0],cen[1])?distPoly(ring,cen[0],cen[1]):-1;
 /* مركز الثقل أوّلاً ما دام قريباً من أوسع نقطة: المستطيل يبقى مركزه */
 if(dc>=0.85*pole.d&&dc>0)out.push(cen);
 out.push(pole.p);
 /* احتياط: أوسع النقاط الداخلية بشبكةٍ خشنة */
 const B=bboxOf(ring);
 if(B){
  const st=Math.max(100,Math.min(B.x1-B.x0,B.y1-B.y0)/25);
  const g=[];
  for(let x=B.x0+st/2;x<B.x1;x+=st)
   for(let y=B.y0+st/2;y<B.y1;y+=st)
    if(pip(ring,x,y))g.push({p:[R(x),R(y)],d:distPoly(ring,x,y)});
  g.sort((u,v)=>v.d-u.d);
  g.slice(0,60).forEach(q=>out.push(q.p));
 }
 return out;
}
export function labelLayout(a,base){
 const ring=(a&&a.ring)||[];
 const b=base>0?base:txtH();
 if(ring.length<3)return {c:[0,0],h:b,it:[]};
 const stale=isStale(a);
 const key=[ring.map(p=>p[0]+","+p[1]).join(";"),b,a.name||"",
  a.showArea?1:0,stale?1:0,a.lp?a.lp.join(","):""].join("|");
 const hit=LC.get(ring);
 if(hit&&hit.key===key)return hit.v;
 const f=Math.min(LMAX,Math.max(LMIN,Math.sqrt(netArea(a)/AREF)));
 const hPref=b*f, hMin=b*LMIN;
 const C=candidates(a,ring);
 let v=null;
 for(let h=hPref;!v;h*=SHRINK){
  const hh=Math.max(h,hMin);
  const it=blockOf(a,hh,stale), bx=boxOf(it), m=hh*0.3;
  const c=C.find(q=>fitsAt(ring,q,bx,m));
  if(c)v={c:[R(c[0]),R(c[1])],h:hh,it};
  else if(hh<=hMin){
   /* لا يتّسع حتى بالأصغر: أوسع نقطةٍ بالحجم الأصغر — أفضل المتاح */
   v={c:[R(C[0][0]),R(C[0][1])],h:hh,it};
  }
 }
 LC.set(ring,{key,v});
 return v;
}
export const labelPt=a=>(a.lp?a.lp.slice():labelLayout(a).c.slice());

/* ═══ البصمة ═══
   بصمة الجدران المجاورة للحلقة. حسّاسة بقصد: تُنبّه ولا تُصلح.
   لا تعرف الفتحات — الباب لا يغيّر امتداد الغرفة.
   ولا تعرف حالة العرض — إخفاء طبقة ليس تغييراً هندسياً. */
const hash=s=>{
 let h=0x811c9dc5;
 for(let i=0;i<s.length;i++){
  h^=s.charCodeAt(i);
  h=(h*0x01000193)>>>0;
 }
 return h.toString(36);
};
export function stampOf(ring){
 const b=bboxOf(ring);
 if(!b)return "";
 const pad=400;
 const Rc={x0:b.x0-pad,y0:b.y0-pad,x1:b.x1+pad,y1:b.y1+pad};
 const parts=[];
 /* المرشَّحون من فهرس الأجسام: جدارٌ صندوقه لا يلمس الحلقة لا
    يمكن أن يجاورها. والفحص بعده هو الفحص نفسه حرفاً بحرف،
    فالبصمة لا تتبدّل — ولو تبدّلت لصارت كل منطقةٍ محفوظة
    «قديمة» بمجرّد فتح الملفّ. */
 wallsIn(Rc).forEach(w=>{
  const wb=bboxOf(band(w)||[w.a,w.b]);
  if(!wb||!bboxHit(wb,Rc,0))return;
  parts.push(`${w.id}:${w.a[0]},${w.a[1]},${w.b[0]},${w.b[1]},`
   +`${w.t},${w.align},${w.type},${w.bulge||0}`);
 });
 parts.sort();
 return parts.length?hash(parts.join("|")):"—";
}
/* ═══ كاش البصمة ═══
   isStale كان يُنادى مرّتين لكل منطقة في areaPrims، ثم في scene،
   ثم في inspect — أربع مرّاتٍ لكل منطقة في كل إطار.

   والمفتاح شيئان: النسخة الهندسية (تغيّر الجدران) وتوقيعُ الحلقة
   (تحرّك رأسٍ أو نقل المنطقة). والثاني لازم لأن سحب رأس منطقةٍ
   يغيّر جوارها ولا يُقدّم النسخة الهندسية — فمفتاحٌ بها وحدها
   يعرضها قديمةً وهي ليست، أو بالعكس. وتوقيعُ الحلقة رخيصٌ
   (ثمانية أزواج) مقابل stampOf التي تمسح الجوار وتبني band.

   وما يُخزَّن هو البصمة المحسوبة لا نتيجةُ المقارنة: فتثبيتُ
   البصمة (restamp) يقلب الجواب بلا إبطالٍ يدويّ. */
const SC=new Map();
const ringSig=r=>{
 const R2=r||[];
 let s=R2.length+":";
 for(let i=0;i<R2.length;i++)s+=R2[i][0]+","+R2[i][1]+";";
 return s;
};
export function stampNow(a){
 if(!a)return "";
 const rs=ringSig(a.ring);
 const hit=SC.get(a.id);
 if(hit&&hit.g===VER.g&&hit.rs===rs)return hit.sp;
 const sp=stampOf(a.ring);
 bump("stamp");
 if(SC.size>600)SC.clear();      /* لا ينمو بلا حدّ */
 SC.set(a.id,{g:VER.g,rs,sp});
 return sp;
}
export const isStale=a=>!!a&&a.stamp!==stampNow(a);
export const staleAreas=()=>S.areas.filter(isStale);
/* العدّ يمسح S.areas لا الكاش: منطقةٌ محذوفة تبقى في الكاش،
   ولو عُدَّ منه لأُبلِغتَ عن قديمةٍ لا وجود لها. */
export const staleCount=()=>{
 let n=0;
 S.areas.forEach(a=>{if(isStale(a))n++});
 return n;
};
export const stampStats=()=>({n:SC.size});
export const restamp=a=>edit(()=>{
 a.stamp=stampOf(a.ring);
 return a;
},"تثبيت بصمة المنطقة",{bump:"view"});

/* ═══ إيجاد الحلقة المحيطة ═══
   حلقاتُ الأجسام تُقرأ بالتناوب — وهو ما يفعله الطلاءُ نفسه
   بـfill("evenodd"): عددٌ فرديٌّ من الحلقات الحاوية يعني صمتاً،
   وزوجيٌّ فراغاً حدُّه أعمقُها. والحلقاتُ الحاويةُ لنقطةٍ واحدة
   متداخلةٌ حتماً — مخرَجُ اتحادٍ لا تتقاطع حلقاتُه — فأصغرُها
   مساحةً هو أعمقُها.

   وكان «الأصغرُ مساحةً» وحدَه ثلاثةَ أعطاب: مركزُ عمودٍ منفردٍ
   يُعيد حلقتَه (٠٫١٦ م²) فترفضها addArea بحدِّ ٠٫٢٥، وجسمُ
   الجدار يُعيد قِشرةَ البناء كلَّها فتُخبَز منطقةٌ بمساحة المبنى،
   ورebake لغرفةٍ قطبُها في الصمت يعيد الخبزَ على القِشرة بلا كلمة. */
export function regionAt(loops,x,y){
 let n=0, best=null, ba=1/0;
 (loops||[]).forEach(lp=>{
  if(!lp||lp.length<3)return;
  if(!pip(lp,x,y))return;
  n++;
  const ar=Math.abs(pArea(lp));
  if(ar<ba){ba=ar; best=lp}
 });
 if(!n||(n&1))return null;          /* لا حلقةَ · أو صمت */
 return best.map(p=>[R(p[0]),R(p[1])]);
}
export const areaAt=(x,y,list)=>{
 let best=null, ba=1/0;
 (list||S.areas).forEach(a=>{
  if(!pip(a.ring,x,y))return;
  const ar=netArea(a);
  if(ar<ba){ba=ar;best=a}
 });
 return best;
};
/* ═══ الخبز ═══ */
/* التحقّق يقع قبل edit() وخارجها: الرفضُ رميٌ يصل المستدعي كما كان
   (edit تبتلع الأخطاء وتُعيد undefined)، ولا يبقى سببُه رسالةً في
   مُبلِّغٍ عامّ. والكتابةُ وحدها ذرّية. */
export function addArea(ring,name,ex){
 V("area",{ring});                   /* 2.3 */
 const r=cleanRing(ccw(ring||[]),2);
 if(r.length<3)throw new Error("الحلقة أقلّ من ثلاثة أضلاع");
 const ar=Math.abs(pArea(r));
 if(ar<MINA)
  throw new Error(`المنطقة ${sqm(ar)} م² — الأصغر المقبول `
   +`${sqm(MINA)} م²`);
 return edit(()=>{
  const a={id:newId("A"),ring:r,name:String(name||"").slice(0,40),
   level:normLevel(S.meta.level),
   stamp:stampOf(r),showArea:ex&&ex.showArea===0?0:1,
   fill:(ex&&FILLS[ex.fill])?ex.fill:"tint"};
  /* ═══ نمطُ الهاشور المسمّى ═══ P-جديد (الأولوية ٤)
     كان الهاشورُ زاويةً ثابتةً 45° مهما كان النمط — قيدٌ مُعلَنٌ في
     رأس core/hatches.js. الآن المنطقةُ تحمل اسمَ نمطٍ كجدار
     (`pat`)، وتُصدِر أوّليةَ `hatch` الحقيقيةَ لا `fill` بنمط،
     فتسري الزاويةُ والتباعدُ والمصمتُ في الخمسةِ كلِّها بلا نسخةٍ
     سادسةٍ من الرياضيات. والحقلُ اختياريٌّ: غيابُه ⇒ ANSI31. */
  if(ex&&ex.pat&&patOk(ex.pat))a.pat=ex.pat;
  S.areas.push(a);
  return a;
 },"خبز منطقة",{bump:"view"});
}
/* ═══ ضبطُ التعبئة والنمط ═══ P-جديد (الأولوية ٤)
   معاملةٌ واحدةٌ لقائمةٍ كاملة: عشرُ مناطقَ تُهشَّر بخطوة تراجعٍ
   واحدة لا عشر. والنمطُ يُكتَب مع `hatch` وحدها ويُحذَف مع غيرها —
   فلا يبقى حقلٌ يصف ما لا يُرسَم. */
export function setAreaFill(list,fill,pat){
 const L=(list||[]).filter(Boolean);
 if(!L.length)throw new Error("لا منطقةَ مستهدفة");
 if(!FILLS[fill])throw new Error(`نوعُ تعبئةٍ غير معروف «${fill}»`);
 if(fill==="hatch"&&pat&&!patOk(pat))
  throw new Error(`نمطُ هاشورٍ غير معرَّف «${pat}»`);
 return edit(()=>{
  let n=0;
  L.forEach(a=>{
   if(!a||S.areas.indexOf(a)<0)return;
   a.fill=fill;
   if(fill==="hatch"&&pat)a.pat=pat;
   else delete a.pat;
   n++;
  });
  if(!n)throw new Error("لم تبقَ منطقةٌ من المستهدفات — أعِد الأداة");
  return n;
 },`تعبئة ${L.length} منطقة`,{bump:"view"});
}
export function delArea(a){
 return edit(()=>{
  const i=S.areas.indexOf(a);
  if(i<0)return false;
  S.areas.splice(i,1);
  return true;
 },"حذف منطقة",{bump:"view"});
}
/* إعادة الخبز من الهندسة الحالية · الاسم والخيارات تبقى.
   القطب المحسوب مرجعُ البحث؛ الموضع الصريح للاسم لا يُمَسّ. */
export function rebake(a,loops){
 const c=centroid(a.ring);
 const r=regionAt(loops,c[0],c[1]);
 if(!r)throw new Error(`${a.id}: لا حلقة مغلقة عند قطبها — `
  +`أغلق الجدران أو حرّك المنطقة`);
 const ar=Math.abs(pArea(r));
 if(ar<MINA)throw new Error(`${a.id}: الحلقة الجديدة ${sqm(ar)} م² فقط`);
 return edit(()=>{
  const before=netArea(a);
  a.ring=cleanRing(ccw(r),2);
  a.stamp=stampOf(a.ring);
  return {before,after:netArea(a)};
 },"إعادة خبز منطقة",{bump:"view"});
}
/* ═══ جدول المساحات ═══ */
export function schedule(){
 const rows=S.areas.map(a=>({id:a.id,
  name:a.name||"(بلا اسم)",
  ar:netArea(a), pr:netPerim(a), stale:isStale(a)}));
 rows.sort((x,y)=>y.ar-x.ar);
 return {rows,total:rows.reduce((s,r)=>s+r.ar,0)};
}
/* ═══ الأوّليات ═══
   القديمة: حدّ متقطّع وشارة — لا شيء يُصلَح خلسة.
   وisStale يُنادى مرّةً واحدة هنا فيُقرأ من الكاش. */
export function areaPrims(a,txtH){
 const out=[];
 const st=isStale(a);
 /* الصبغةُ تعبئةٌ، والهاشورُ أوّليةُ هاشورٍ حقيقيةٌ بنمطها المسمّى —
    لا «تعبئةٌ نمطُها هاشور» بزاويةٍ مطبوعةٍ في كلِّ قارئ. */
 if(a.fill==="tint")
  out.push({t:"fill",L:"A-AREA",ring:a.ring,style:"tint",aid:a.id});
 else if(a.fill==="hatch")
  out.push({t:"hatch",L:"A-AREA",loops:[a.ring],
   pat:a.pat||"ANSI31",aid:a.id});
 out.push({t:"poly",L:"A-AREA",pts:a.ring,cl:1,aid:a.id,
  dash:st?[420,300]:null, warn:st?1:0});
 /* الحجم والموضع من تخطيط الشكل — انظر labelLayout */
 const L=labelLayout(a,txtH), c=L.c;
 L.it.forEach(g=>out.push({t:"text",L:"A-AREA",s:g.s,x:c[0],
  y:R(c[1]+g.dy),h:g.h,al:"mc",aid:a.id,warn:st?1:0}));
 return out;
}
export const areaLabel=a=>`${a.name||"(بلا اسم)"} · ${sqm(netArea(a))} م²`
 +(isStale(a)?" · قديمة":"");
