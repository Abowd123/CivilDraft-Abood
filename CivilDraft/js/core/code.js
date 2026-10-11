/* ═══ فاحص الاشتراطات ═══
   الفاحص الحالي يفحص الهندسة: أطرافٌ لا تلتقي، فتحةٌ تخرج عن
   جدارها، منطقةٌ قديمة. وهذه طبقةٌ ثانية تفحص التصميم نفسه:
   أعرضُ البابُ كافٍ؟ أللغرفة ضوءٌ وتهوية؟ أالممرّ يمرّ منه اثنان؟

   والعقد نفسه يسري: يخبر ولا يصلح، وكل نتيجةٍ تقفز إلى موضعها.

   القيَم أدناه إرشاديةٌ لا نصّ نظام: تُعدَّل لتطابق الكود المعتمد
   في بلدك ومشروعك. وهي بالمليمتر كبقيّة الحالة. */
import {writePref} from "./delegate.js";
import {S} from "./state.js";
import {m2,sqm,rng,rng2} from "./units.js";
import {bboxOf,centroid} from "./geom.js";
import {wallById} from "./walls.js";
import {openPt,okName} from "./opens.js";
import {netArea,labelPt} from "./areas.js";
import {stGeoms} from "./stairs.js";

/* هجرةٌ كأختها في pricing.js: النسخ لا النقل */
const K="civildraft.code";
const OLD_K="mistar.code";
export const CODE={
 on:1,
 doorW:800,      /* باب غرفة */
 doorWet:700,    /* باب دورة مياه */
 doorExt:900,    /* باب على جدار خارجي */
 doorH:2000,
 sillLow:800,    /* جلسة أدنى منها تحتاج حماية */
 light:0.10,     /* مساحة الزجاج ÷ مساحة الأرضية */
 vent:0.05,      /* القابل للفتح ÷ مساحة الأرضية */
 roomMin:6e6,    /* ٦ م² بالمليمتر المربّع */
 wetMin:1.5e6,
 corrW:1000,
 ceilH:2600,
 /* ═══ الدرج ═══ P-تحسين
    كان الفاحصُ يغطّي الأبواب والشبابيكَ والمناطقَ وارتفاعَ الدور،
    ولا سطرَ واحداً عن الدرج — وهو أكثرُ ما يُخالَف في المخطّطات
    السكنية، وأخطرُه (السقوطُ على الدرج لا يُغتفَر كبابٍ ضيّق).
    والبياناتُ كانت كلُّها موجودةً سلفاً: `stGeoms` تحسب `rise`
    و`tread` لكلِّ رحلةٍ من ارتفاع الدرج وعدد قوائمه — فلا قياسَ
    جديدٌ يُشتَقّ، إنما حدودٌ تُقارَن.

    والقيَمُ إرشاديةٌ شائعة: النهوضُ 150–190، والنائمةُ 250 أدنى،
    وصيغةُ بلونديل (2×نهوض + نائمة) بين 600 و640 — وهي ما يجعل
    الدرجَ مريحاً لا مجرّد قانونيّ. وأقصى قوائمَ في رحلةٍ 18 قبل
    بسطةٍ إلزامية. */
 riseMin:150,
 riseMax:190,
 runMin:250,
 blonMin:600,
 blonMax:640,
 stairW:900,
 flightMax:18};

const KEYS=Object.keys(CODE);
/* نسخة المصنع: تُؤخَذ قبل أيّ تحميل، فـ«استعِد الافتراضي» يعيد ما كُتب
   هنا لا ما حُفِظ في المتصفّح. مجمَّدة لئلا يعدّلها أحد ظنّاً أنها نسخته. */
export const CODE_DEF=Object.freeze(Object.assign({},CODE));

/* ═══ الحقول القابلة للتعديل ═══
   القيَم مخزَّنة بوحدات الحالة (مليمتر · مليمتر مربّع · نسبة ٠–١) لأن
   codeCheck يقارنها بأرقام المشروع مباشرة، والواجهة تعرضها بوحدةٍ يقرؤها
   الإنسان: f معامل التحويل من المخزَّن إلى المعروض. min/max بالمعروض —
   وحدودٌ معقولة لا تمنع كوداً غريباً بل تمنع خطأ الكتابة (٨٠٠ بدل ٠٫٨). */
export const CODE_FIELDS=[
 {k:"doorW",  n:"عرض باب الغرفة",      u:"م",  f:1e-3, min:0.5, max:2.5, step:0.05},
 {k:"doorWet",n:"عرض باب دورة المياه",  u:"م",  f:1e-3, min:0.4, max:2.5, step:0.05},
 {k:"doorExt",n:"عرض الباب الخارجي",    u:"م",  f:1e-3, min:0.5, max:3,   step:0.05},
 {k:"doorH",  n:"ارتفاع الباب",         u:"م",  f:1e-3, min:1.5, max:3.5, step:0.05},
 {k:"sillLow",n:"أدنى جلسة شبّاك",      u:"م",  f:1e-3, min:0.1, max:1.5, step:0.05},
 {k:"light",  n:"الإضاءة (زجاج÷أرضية)", u:"%",  f:100,  min:1,   max:50,  step:1},
 {k:"vent",   n:"التهوية (قابل للفتح)", u:"%",  f:100,  min:1,   max:50,  step:1},
 {k:"roomMin",n:"أدنى مساحة غرفة",      u:"م²", f:1e-6, min:1,   max:60,  step:0.5},
 {k:"wetMin", n:"أدنى مساحة دورة مياه", u:"م²", f:1e-6, min:0.5, max:20,  step:0.1},
 {k:"corrW",  n:"أدنى عرض ممرّ",        u:"م",  f:1e-3, min:0.5, max:3,   step:0.05},
 {k:"ceilH",  n:"أدنى ارتفاع دور",      u:"م",  f:1e-3, min:2,   max:5,   step:0.05},
 /* الدرج: بالسنتيمتر لا المتر — النهوضُ 17 سم يُقرأ، و0.17 م لا */
 {k:"riseMin",n:"أدنى نهوض درجة",       u:"سم", f:0.1,  min:10,  max:25,  step:0.5},
 {k:"riseMax",n:"أقصى نهوض درجة",       u:"سم", f:0.1,  min:10,  max:25,  step:0.5},
 {k:"runMin", n:"أدنى نائمة درجة",      u:"سم", f:0.1,  min:15,  max:45,  step:0.5},
 {k:"blonMin",n:"أدنى بلونديل (2ن+ئ)",  u:"سم", f:0.1,  min:50,  max:80,  step:0.5},
 {k:"blonMax",n:"أقصى بلونديل (2ن+ئ)",  u:"سم", f:0.1,  min:50,  max:80,  step:0.5},
 {k:"stairW", n:"أدنى عرض درج",          u:"م",  f:1e-3, min:0.6, max:3,   step:0.05},
 {k:"flightMax",n:"أقصى قوائم في رحلة", u:"",   f:1,    min:3,   max:40,  step:1}];
const FLD=new Map(CODE_FIELDS.map(d=>[d.k,d]));

/* تحويلٌ مقرَّب: ألا يظهر ٠٫٧٩٩٩٩٩ في حقل، ولا يُخزَّن ما لا يُقرأ */
const toShow=(d,raw)=>+(raw*d.f).toFixed(d.f===1e-3?3:(d.f===1e-6?3:1));
const toRaw=(d,shown)=>{
 const r=shown/d.f;
 return (d.f===100)?+r.toFixed(4):Math.round(r);
};
export const codeShown=k=>{
 const d=FLD.get(k);
 return d?toShow(d,CODE[k]):null;
};
/* هل القيمة المخزَّنة (لا المعروضة) مقبولة؟ — يحرس التحميل من التخزين
   المحلّي أيضاً: ملفٌّ محرَّر يدوياً بـdoorW:-5 يُتجاهَل فيبقى الافتراضي. */
const rawOk=(k,v)=>{
 if(typeof v!=="number"||!isFinite(v))return false;
 if(k==="on")return v===0||v===1;
 const d=FLD.get(k);
 if(!d)return false;
 const x=v*d.f;
 return x>=d.min-1e-9&&x<=d.max+1e-9;
};
export function loadCode(){
 if(typeof localStorage==="undefined")return CODE;
 try{
  let raw=localStorage.getItem(K);
  if(raw==null){
   const old=localStorage.getItem(OLD_K);
   if(old!=null){
    /* انسخ لا تنقل — القديم يبقى نسخةً احتياطية صامتة */
    localStorage.setItem(K,old);
    raw=old;
   }
  }
  const d=JSON.parse(raw||"null")||{};
  KEYS.forEach(k=>{if(rawOk(k,d[k]))CODE[k]=d[k]});
 }catch(e){}
 return CODE;
}
export function saveCode(){
 /* P2-005: النتيجةُ تُعاد، والامتلاءُ يُقال مرّةً */
 return writePref(K,CODE);
}
/* ═══ التعديل ═══
   shown بالوحدة المعروضة (م · م² · %). القيمة المرفوضة لا تُكتَب
   ويُعاد سببها نصّاً — والواجهة تعرضه وتعيد الحقل إلى قيمته.
   والقبول يحفظ فوراً: تعديلٌ لا يُحفَظ يضيع عند الإغلاق ويُفاجئ. */
export function setCodeVal(k,shown){
 const d=FLD.get(k);
 if(!d)return {ok:false,msg:`حقلٌ غير معروف: ${k}`};
 const x=(typeof shown==="string")
  ? parseFloat(shown.replace(/[٠-٩]/g,c=>"٠١٢٣٤٥٦٧٨٩".indexOf(c))
     .replace("٫",".").replace(",","."))
  : +shown;
 if(!isFinite(x))return {ok:false,msg:`${d.n}: قيمةٌ غير رقمية`};
 if(x<d.min||x>d.max)
  return {ok:false,
   msg:`${d.n}: ${x} خارج المدى المعقول ${rng(d.min,d.max,d.u)}`};
 CODE[k]=toRaw(d,x);
 saveCode();
 return {ok:true,v:CODE[k]};
}
export function setCodeOn(on){
 CODE.on=on?1:0;
 saveCode();
 return CODE.on;
}
/* هل عُدِّل شيءٌ عن المصنع؟ — للتنبيه في الواجهة */
export const codeChanged=()=>KEYS.filter(k=>CODE[k]!==CODE_DEF[k]);
export function resetCode(){
 KEYS.forEach(k=>{CODE[k]=CODE_DEF[k]});
 saveCode();
 return CODE;
}

/* ═══ الربط بين الفتحة والمنطقة ═══
   المنطقة حلقةٌ على أوجه الجدران، والفتحة نقطةٌ على مسار جدارها —
   فالقرب من الحلقة هو الانتماء. تفاوتٌ بسماكة الجدار لأن المسار
   قد يكون محورياً والحلقة على الوجه. */
function segD(p,a,b){
 const dx=b[0]-a[0], dy=b[1]-a[1];
 const L2=dx*dx+dy*dy;
 if(L2<1)return Math.hypot(p[0]-a[0],p[1]-a[1]);
 let t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L2;
 t=t<0?0:(t>1?1:t);
 return Math.hypot(p[0]-a[0]-dx*t, p[1]-a[1]-dy*t);
}
function onRing(ring,p,tol){
 for(let i=0;i<ring.length;i++){
  if(segD(p,ring[i],ring[(i+1)%ring.length])<=tol)return true;
 }
 return false;
}
/* تصنيفٌ بالاسم: الفراغات تُسمّى بالعربية، والاسم أصدق دليلٍ
   متاح على وظيفة الفراغ. ما لا يُعرَف لا يُحاسَب بقاعدةٍ خاصّة. */
const CLS=[
 [/(دوره|دورة|حمام|حمّام|مرحاض|بانيو|wc)/i,"wet"],
 [/(ممر|ممشى|بهو|مدخل|درج)/i,"corr"],
 [/(مطبخ)/i,"kitchen"],
 [/(نوم|مجلس|صاله|صالة|معيشه|معيشة|مكتب|غرف)/i,"room"]];
const classOf=a=>{
 const n=String(a.name||"");
 for(const [rx,c] of CLS)if(rx.test(n))return c;
 return "";
};
const GLASS=/^(window|fixed)$/;
const DOORS=/^(door|double|sliding)$/;

export function codeCheck(){
 const F=[];
 const add=(sev,code,msg,k,id,p)=>F.push({sev,code,msg,k,id,
  p:p?[Math.round(p[0]),Math.round(p[1])]:null});
 if(!+CODE.on)return F;

 if(S.meta.wallH&&S.meta.wallH<CODE.ceilH)
  add("wr","c-ceil",
   `ارتفاع الدور ${m2(S.meta.wallH)} م دون الحدّ الإرشادي `
   +`${m2(CODE.ceilH)} م`,null,null,null);

 /* الربط يُبنى مرّةً: الفتحة قد تخصّ منطقتين (باب بينهما) */
 const inArea=new Map();          /* معرّف المنطقة ← فتحاتها */
 const ofOpen=new Map();          /* معرّف الفتحة ← مناطقها */
 S.areas.forEach(a=>inArea.set(a.id,[]));
 S.opens.forEach(o=>{
  const w=wallById(o.wall);
  if(!w)return;
  const q=openPt(w,o.s);
  const tol=Math.max(w.t,200);
  S.areas.forEach(a=>{
   if(!a.ring||a.ring.length<3)return;
   if(!onRing(a.ring,q,tol))return;
   inArea.get(a.id).push({o,w});
   const L=ofOpen.get(o.id)||[];
   L.push(a); ofOpen.set(o.id,L);
  });
 });

 /* ═══ الأبواب ═══ */
 S.opens.filter(o=>DOORS.test(o.kind)).forEach(o=>{
  const w=wallById(o.wall);
  if(!w)return;
  const p=openPt(w,o.s);
  const AS=ofOpen.get(o.id)||[];
  const wet=AS.some(a=>classOf(a)==="wet");
  const ext=(w.type==="ext");
  const min=ext?CODE.doorExt:(wet?CODE.doorWet:CODE.doorW);
  const why=ext?"على جدار خارجي":(wet?"لدورة مياه":"لغرفة");
  if(o.w<min)add(ext?"wr":"in","c-dw",
   `${o.id} ${okName(o.kind)}: عرضه ${m2(o.w)} م — الحدّ `
   +`الإرشادي ${m2(min)} م ${why}`,"open",o.id,p);
  if(o.h<CODE.doorH)add("in","c-dh",
   `${o.id}: ارتفاعه ${m2(o.h)} م دون ${m2(CODE.doorH)} م`,
   "open",o.id,p);
 });

 /* ═══ الشبابيك: الجلسة المنخفضة ═══ */
 S.opens.filter(o=>GLASS.test(o.kind)).forEach(o=>{
  if(o.sill>=CODE.sillLow)return;
  const w=wallById(o.wall);
  add("in","c-sill",
   `${o.id} ${okName(o.kind)}: جلسته ${m2(o.sill)} م دون `
   +`${m2(CODE.sillLow)} م — يحتاج حمايةً أو زجاجاً أمان`,
   "open",o.id,w?openPt(w,o.s):null);
 });

 /* ═══ الدرج ═══ P-تحسين
    `stGeoms` تحسب النهوضَ والنائمةَ لكلِّ رحلة. والنهوضُ واحدٌ لكلِّ
    الدرج (الارتفاعُ ÷ مجموعِ القوائم) فيُبلَّغ مرّةً، والنائمةُ لكلِّ
    رحلةٍ (طولُها ÷ قوائمها) فتُبلَّغ لمن خالف.
    والمقارنةُ بالمقرَّب إلى المليمتر: نهوضٌ 190.4 ليس خرقاً. */
 S.stairs.forEach(st=>{
  const gs=stGeoms(st);
  if(!gs.length)return;
  const at=gs[0].a;
  const nm=st.id;
  /* العرض */
  const wdt=Math.max(0,+st.w||0);
  if(wdt&&wdt<CODE.stairW)add("wr","c-stw",
   `${nm}: عرضه ${m2(wdt)} م دون الحدّ الإرشادي `
   +`${m2(CODE.stairW)} م`,"stair",st.id,at);
  /* النهوضُ واحدٌ لكلِّ الدرج */
  const rise=Math.round(gs[0].rise);
  if(rise<Math.round(CODE.riseMin))add("wr","c-rise",
   `${nm}: نهوضُ الدرجة ${m2(rise)} م دون `
   +`${m2(CODE.riseMin)} م — درجٌ مُسطَّحٌ يُتعِب ويطول`,
   "stair",st.id,at);
  else if(rise>Math.round(CODE.riseMax))add("er","c-rise",
   `${nm}: نهوضُ الدرجة ${m2(rise)} م فوق `
   +`${m2(CODE.riseMax)} م — خطرُ تعثّر. زِد عددَ القوائم أو `
   +`اخفض ارتفاعَ الدور`,"stair",st.id,at);
  /* النائمةُ وبلونديل لكلِّ رحلة */
  gs.forEach((g,i)=>{
   const run=Math.round(g.tread);
   const ttl=(gs.length>1)?`${nm} الرحلة ${i+1}`:nm;
   if(run<Math.round(CODE.runMin))add("er","c-run",
    `${ttl}: نائمةُ الدرجة ${m2(run)} م دون `
    +`${m2(CODE.runMin)} م — لا تكفي القدم. أطِل الرحلةَ أو `
    +`أنقص قوائمَها`,"stair",st.id,g.a);
   const bl=2*rise+run;
   if(bl<Math.round(CODE.blonMin)||bl>Math.round(CODE.blonMax))
    add("in","c-blon",
     `${ttl}: صيغةُ بلونديل (٢×نهوض + نائمة) = ${m2(bl)} م، `
     +`والمريحُ ${rng2(CODE.blonMin,CODE.blonMax,"م")} — `
     +`قانونيٌّ لكنّه غيرُ مريح`,"stair",st.id,g.a);
   if(g.n>Math.round(CODE.flightMax))add("wr","c-flight",
    `${ttl}: ${g.n} قائمةً في رحلةٍ واحدة — الأقصى الإرشاديُّ `
    +`${Math.round(CODE.flightMax)} قبل بسطة`,"stair",st.id,g.a);
  });
 });

 /* ═══ المناطق: المساحة والضوء والتهوية والعرض ═══ */
 S.areas.forEach(a=>{
  if(!a.ring||a.ring.length<3)return;
  const cls=classOf(a);
  const A=netArea(a);
  const at=labelPt(a)||centroid(a.ring);
  const nm=a.name||a.id;

  if(cls==="room"&&A<CODE.roomMin)add("wr","c-amin",
   `${a.id} ${nm}: ${sqm(A)} م² دون الحدّ الإرشادي `
   +`${sqm(CODE.roomMin)} م² للغرفة`,"area",a.id,at);
  if(cls==="wet"&&A<CODE.wetMin)add("in","c-amin",
   `${a.id} ${nm}: ${sqm(A)} م² دون ${sqm(CODE.wetMin)} م² `
   +`لدورة المياه`,"area",a.id,at);

  /* الممرّ: أدنى ضلعٍ لصندوقه المحيط تقريبٌ معلَن، لا قياسُ عرضٍ
     حقيقي لمضلّعٍ منحرف. يُنبّه ولا يُجزَم. */
  if(cls==="corr"){
   const b=bboxOf(a.ring);
   const wdt=b?Math.min(b.x1-b.x0,b.y1-b.y0):0;
   if(wdt&&wdt<CODE.corrW)add("wr","c-corr",
    `${a.id} ${nm}: أضيق بُعدٍ لصندوقه ${m2(wdt)} م دون `
    +`${m2(CODE.corrW)} م — تقريبٌ من الصندوق المحيط، تحقّق `
    +`بالقياس`,"area",a.id,at);
  }
  if(cls!=="room"&&cls!=="kitchen")return;

  /* الضوء من الزجاج على الجدران الخارجية وحدها */
  const L=inArea.get(a.id)||[];
  const gl=L.filter(x=>GLASS.test(x.o.kind)&&x.w.type==="ext")
   .reduce((s,x)=>s+x.o.w*x.o.h,0);
  const vt=L.filter(x=>x.o.kind==="window"&&x.w.type==="ext")
   .reduce((s,x)=>s+x.o.w*x.o.h,0);
  if(!A)return;
  if(gl/A<CODE.light)add(gl?"wr":"er","c-light",
   `${a.id} ${nm}: زجاج ${sqm(gl)} م² على أرضية ${sqm(A)} م² `
   +`= ${(gl/A*100).toFixed(1)}% دون `
   +`${(CODE.light*100).toFixed(0)}% للإضاءة`
   +(gl?"":" — لا شباك على جدارٍ خارجي"),"area",a.id,at);
  else if(vt/A<CODE.vent)add("wr","c-vent",
   `${a.id} ${nm}: القابل للفتح ${sqm(vt)} م² `
   +`= ${(vt/A*100).toFixed(1)}% دون `
   +`${(CODE.vent*100).toFixed(0)}% للتهوية — الثابت لا يُهوّي`,
   "area",a.id,at);
 });
 return F;
}
