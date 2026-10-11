/* ═══ الحقول: مصدرٌ واحد ═══
   ثلاث قواعد يقوم عليها هذا الملفّ كلّه:

   ١ · لا يُكتب حقلٌ لم تكتبه. القراءة تُخبرك «متعدّد» ولا تُسوّي.
   ٢ · كل كتابةٍ تتحقّق قبل أن تقع، فالرفض لا يترك أثراً نصفياً.
   ٣ · الحقل يُطبَّق على من يملكه، ويُذكَر عدد من تخطّاه.

   ═══ وكان الوصفُ منقسماً ثلاثاً ═══
   FLD تحمل الاسمَ والنوعَ · SET تحمل الحدودَ والرسائلَ والقواعدَ ·
   وprops.js تحمل نسخةً ثالثةً من الحدود في سِمات HTML. فالحدُّ
   يُكتَب ثلاثاً وينجرف، والقاعدةُ المقسورة تسكن مُثبِّتَ حقلٍ آخر
   فتعمل من مدخلٍ وتغيب من مدخل.

   وبعد اليوم: الوصفُ بياناتٌ في FLD، والتحقّقُ في parseVal وحده،
   وما لا يُعبَّر عنه بمدىً يبقى شفرةً في GUARD — وهي ثلاثةٌ من
   سبعةَ عشرَ حقلاً لا أكثر.

   ═══ ومفرداتُ الوصف ═══
   k n t items      قائمةٌ كما هي — لا تتبدّل، فأشكالُ العناصر عقد
   hint             سطرٌ مساعد تحت الحقل
   min max          عددٌ أو دالّةٌ (e)=>عدد — والتابعُ يُنقَل ولا يُنسَخ
   minWhy maxWhy    نصٌّ أو دالّة — الرسالةُ تسمّي السبب لا تُبهِمه
   clip             "min" | "max" | "both" | 0 (رفض)
                    والسياسةُ مستخرَجةٌ من SET نفسها: الحدُّ الثابتُ
                    كان يُقصَر صامتاً (clamp) والتابعُ يُرفَض برسالة —
                    لأن القصرَ إلى قيمةٍ تتبدّل بحاضنها تضليل،
                    والقصرَ إلى ثابتٍ موثَّقٍ تسهيل.
   int wrap step    تدويرٌ · طيُّ زاويةٍ (deg) · خطوةُ العدّاد
   trim             نصٌّ يُقلَّم قبل القصّ
   read write after خطّافاتٌ حيث الحقلُ ليس e[k]=v
   force forceWhy   قاعدةٌ مقسورة تُقرأ من موضعٍ واحد
   accept           قيَمٌ تُقبَل ولا تُعرَض — لِلاأشكلٍ قائمٍ سلفاً    */
import {S,edit} from "./state.js";
import {Mx,Nx,deg,m3,rng3} from "./units.js";
import {entOf,NAME,KORDER,bumpOf,touchFn} from "./ents.js";
import {pickable} from "./layers.js";
import {wallById,wallLen,WTYPE,ALIGN,TMIN,TMAX} from "./walls.js";
import {opensOf,span,allowed,saySpans,OK,OKINDS,okName,
        MINW as OMINW} from "./opens.js";
import {areaById,netArea,FILLS} from "./areas.js";
import {bboxOf} from "./geom.js";
import {dimById,dimValue,DK} from "./dims.js";
import {dsList,dsOk} from "./dimstyles.js";
import {colById,CK,CT} from "./cols.js";
import {FK,FKINDS} from "./fixt.js";
import {blockList,getBlock} from "./blocks.js";
import {SMIN_W} from "./stairs.js";

const R=v=>Math.round(v);
/* الحدُّ المحسوب: عددٌ أو دالّةٌ تقرأ الكيان */
const lim=(v,e)=>(typeof v==="function")?v(e):v;
const say=(v,e)=>(typeof v==="function")?v(e):v;
/* items مصفوفةُ أزواج [قيمة, تسمية] — والشكلُ عقدٌ مع quickprops */
const iVals =d=>(d.items||[]).map(x=>x[0]);
const iNames=d=>(d.items||[]).map(x=>x[1]);
/* الاسمُ في الرسالة بلا وحدته: «الارتفاع م: الأقصى ٢٫١٠ م» تكرارٌ */
const NM=d=>String((d&&d.n)||"").replace(/\s*[م°×]$/,"").trim();
/* حدُّ الكوّة من سماكة حاضنها — حسبةٌ واحدةٌ لثلاثة مواضع */
const wallT=o=>{
 const w=wallById(o&&o.wall);
 return (w&&w.t)||150;
};
const depWhy=o=>`المدى ${rng3(20,wallT(o)-40,"م")} في جدار `
 +`${m3(wallT(o))} م`;

/* ═══ طراز الأبعاد ═══ القائمة حيّة: الطُرز بياناتُ مشروعٍ تتبدّل، فلا
   تُنسخ عند التحميل. «-» رمزُ «بلا طراز» — لا يصطدم باسمٍ صالح لأنّ
   الأسماء تبدأ بحرف، وهو قيمةٌ غير فارغة فتعبر skipBlank في الجماعية
   (الفراغُ هناك «لا تكتب»). */
const DS_NONE="-";
const dsItems=()=>[[DS_NONE,"افتراضيّ المشروع"]].concat(
 dsList().map(s=>[s.k,(s.label&&s.label!==s.k)?`${s.label} (${s.k})`:s.k]));
const styleFld=()=>({k:"style",n:"طراز الأبعاد",t:"sel",
 get items(){return dsItems()},
 read:e=>dsOk(e.style)||DS_NONE,
 write:(e,v)=>{if(v===DS_NONE)delete e.style; else e.style=v},
 hint:"الطُرز تُنشأ من «أنماط الرسم» (تبويب إدارة) — الافتراضيُّ يتبع إعدادات المشروع"});

/* ═══ وصف الحقول ═══ t: len | num | sel | chk | text ═══
   وقوائمُ العناصر مشتقّةٌ من مصادرها (ALIGN · WTYPE · OK · CK · CT ·
   FK · FILLS · DK) لا منسوخةً — فوسمٌ يتبدّل هناك يتبدّل هنا. */
export const FLD={
 wall:[
  {k:"t",n:"السماكة م",t:"len",min:TMIN,max:TMAX,clip:"both",
   hint:"وتنحيفُه دون كوّةٍ فيه يُرفَض ويُسمّى سببُه"},
  {k:"align",n:"المحاذاة",t:"sel",
   items:Object.keys(ALIGN).map(k=>[k,ALIGN[k]])},
  {k:"type",n:"النوع",t:"sel",
   items:Object.keys(WTYPE).map(k=>[k,WTYPE[k].n]),
   /* أثرٌ لا يقبله e[k]=v — منقولٌ من SET.wall.type */
   after:(w,v)=>{
    if(v==="low"&&w.h==null)w.h=S.meta.lowH;
    if(v!=="low")delete w.h;
   }},
  {k:"level",n:"المستوى",t:"num",min:0,int:1,clip:"min",
   hint:"0 أرضي · 1 طابق أول · ويبقى لكل عنصرٍ مستواه"}],
 open:[
  {k:"kind",n:"النوع",t:"sel",items:OKINDS.map(k=>[k,okName(k)])},
  {k:"level",n:"المستوى",t:"num",min:0,int:1,clip:"min"},
  {k:"w",n:"العرض م",t:"len",min:OMINW,clip:"min",
   hint:"المواضعُ الحرّة تحكمه — والرفضُ يذكرها"},
  {k:"h",n:"الارتفاع م",t:"len",min:100,clip:"min",
   /* منقولةٌ من SET.open.h — وحُذفت هناك، فلا نسختان */
   max:o=>Math.max(200,(+S.meta.wallH||3000)-(+o.sill||0)),
   maxWhy:o=>`مع جلسةٍ ${m3(+o.sill||0)} م من ارتفاع دورٍ `
    +`${m3(+S.meta.wallH||3000)} م`},
  {k:"sill",n:"الجلسة م",t:"len",min:0,clip:"min",
   max:o=>Math.max(0,(+S.meta.wallH||3000)-(+o.h||0)),
   maxWhy:o=>`مع ارتفاعٍ ${m3(+o.h||0)} م من ارتفاع دورٍ `
    +`${m3(+S.meta.wallH||3000)} م`,
   read:o=>o.sill||0,
   /* ═══ خرجت من مُثبِّتَين ═══
      SET.open.kind كانت تكتب o.sill=0 صامتةً، وSET.open.sill
      ترفض برسالة — مصدران لقاعدةٍ واحدة: تعمل عند تبديل النوع
      وتغيب عند كتابة الجلسة، ولا تعرفها اللوحةُ فلا تُقال.
      وهذه واحدةٌ تُقرأ في المسارَين، والقسرُ يُعلَن. */
   force:o=>/^(door|double|sliding)$/.test(o.kind||"")?0:null,
   forceWhy:"الباب جلسته صفر — غيّر نوعه أوّلاً"},
  {k:"swing",n:"جهة الفتح",t:"sel",
   /* بلفظِ اللوحة المفردة الأغنى — كان يفترق بين اللوحتين */
   items:[["left","يسار المسار"],["right","يمينه"]]},
  {k:"dep",n:"عمق الكوّة م",t:"len",clip:0,
   min:20, max:o=>wallT(o)-40,
   minWhy:depWhy, maxWhy:depWhy,
   read:o=>(o.dep!=null)?o.dep:R(wallT(o)*0.45),
   hint:"من وجه الجدار إلى قاع الكوّة"}],
 col:[
  {k:"kind",n:"الشكل",t:"sel",
   items:Object.keys(CK).map(k=>[k,CK[k]]),
   after:(c,v)=>{if(v==="circ"){c.h=c.w; c.rot=0}}},
  {k:"w",n:"العرض / القطر م",t:"len",min:100,max:4000,clip:"both",
   after:c=>{if(c.kind==="circ")c.h=c.w}},
  {k:"h",n:"العمق م",t:"len",min:100,max:4000,clip:"both"},
  {k:"rot",n:"الدوران °",t:"num",wrap:360},
  {k:"type",n:"المادة",t:"sel",
   items:Object.keys(CT).map(k=>[k,CT[k]])},
  {k:"level",n:"المستوى",t:"num",min:0,int:1,clip:"min"}],
 fix:[
  {k:"kind",n:"النوع",t:"sel",items:FKINDS.map(k=>[k,FK[k].n]),
   after:(f,v)=>{f.w=FK[v].w; f.d=FK[v].d}},
  {k:"w",n:"العرض م",t:"len",min:80,max:4000,clip:"both"},
  {k:"d",n:"العمق م",t:"len",min:80,max:4000,clip:"both"},
  {k:"rot",n:"الدوران °",t:"num",wrap:360},
  {k:"mir",n:"معكوسة",t:"chk",
   read:f=>f.mir?1:0,
   write:(f,v)=>{if(v)f.mir=1; else delete f.mir}}],
 /* ═══ مثيلُ الكتلة ═══ (1.1.0 · ج) — الدورانُ مخزَّنٌ راديان ويُعرَض درجات */
 blk:[
  {k:"block",n:"التعريف",t:"sel",
   get items(){return blockList().map(d=>[d.name,d.title||d.name])},   /* حيّة: التعريفاتُ تتغيّر */
   write:(b,v)=>{if(!getBlock(v))throw new Error(`لا تعريفَ باسم «${v}»`); b.block=v}},
  {k:"rot",n:"الدوران °",t:"num",wrap:360,
   read:b=>Math.round(((+b.rot||0)*180/Math.PI)*10)/10,
   write:(b,v)=>{b.rot=deg(+v)*Math.PI/180}},
  {k:"scale",n:"المقياس ×",t:"num",min:0.01,max:100,clip:"both"},
  {k:"mirror",n:"معكوسة",t:"chk",
   read:b=>b.mirror?1:0,
   write:(b,v)=>{b.mirror=v?1:0}}],
 stair:[
  {k:"w",n:"العرض م",t:"len",min:SMIN_W,max:6000,clip:"both"},
  {k:"n",n:"عدد القوائم",t:"num",min:2,max:80,clip:"both",int:1,
   read:t=>t.flights.reduce((s,f)=>s+f.n,0),
   /* في L وU يُوزَّع المجموع على الرحلتين بنسبة قوائمهما الحاليّة */
   write:(t,v)=>{
    const F=t.flights, old=F.reduce((s,f)=>s+f.n,0)||1;
    if(F.length===1){F[0].n=v; return}
    const n0=Math.min(78,Math.max(2,Math.round(v*F[0].n/old)));
    F[0].n=n0; F[1].n=Math.min(80,Math.max(2,v-n0));
   },
   hint:"القائمة = ارتفاع الدور ÷ العدد · والنائماتُ قائمةٌ أقلّ"},
  {k:"h",n:"ارتفاع الدور م",t:"len",min:200,max:8000,clip:"both",
   read:t=>(t.h!=null?t.h:S.meta.wallH)},
  {k:"up",n:"الاتجاه",t:"sel",
   items:[["up","صاعد"],["dn","هابط"]]},
  {k:"cut",n:"خطّ القطع",t:"num",min:0,max:0.95,clip:"both",
   step:0.05,hint:"نسبةٌ من الطول — صفرٌ يعني بلا قطع"}],
 area:[
  {k:"name",n:"الاسم",t:"text",max:40,read:a=>a.name||""},
  {k:"level",n:"المستوى",t:"num",min:0,int:1,clip:"min"},
  {k:"fill",n:"التعبئة",t:"sel",
   items:Object.keys(FILLS).map(k=>[k,FILLS[k]])},
  {k:"showArea",n:"أظهر المساحة",t:"chk"}],
 dim:[
  {k:"kind",n:"النوع",t:"sel",
   items:Object.keys(DK).map(k=>[k,DK[k]])},
  {k:"txt",n:"نصّ بديل",t:"text",max:24,trim:1,
   read:d=>d.txt||"",
   write:(d,v)=>{if(v)d.txt=v; else delete d.txt},
   hint:"يُكتَب مكان الرقم المقيس بعلامة * — والمُصدِّر يُبلِّغ عنه"},
  styleFld()],
 chain:[
  {k:"total",n:"خطّ المجموع",t:"chk"},
  styleFld()],
 anno:[
  {k:"hm",n:"الحجم ×",t:"num",min:0.4,max:6,clip:"both",step:0.1},
  {k:"al",n:"المحاذاة",t:"sel",
   items:[["bc","وسط"],["bl","يسار"],["mc","وسط أوسط"]],
   /* SET.anno.al كانت تقبل ml والقائمةُ لا تعرضه — لاأشكلٌ قائم.
      accept يُبقي القبول ولا يُغيّر ما يُعرَض. أضِف
      ["ml","وسط يسار"] إلى items إن أردتَ عرضه واحذف accept. */
   accept:["ml"]},
  {k:"pre",n:"سابقة المنسوب",t:"text",max:8,read:a=>a.pre||""}]
};
export const fldOf=(k,f)=>(FLD[k]||[]).find(x=>x.k===f)||null;
export const fldName=(k,f)=>{
 const x=fldOf(k,f);
 return x?x.n:f;
};

/* ═══ المُحلّلُ العامّ ═══
   مصدرُ التحقّق الوحيد: يقرأ t وitems وmin/max وclip من FLD ولا
   يعرف نوعَ كيانٍ باسمه. ولا يكتب — فصار الحدُّ قابلاً للسؤال قبل
   الكتابة، وهو ما يجعل اللوحةَ تعرضه بدل أن تُكرّره.
   ويعيد {ok,v} أو {ok:0,why} — والرميُ في applyVal وحدها، فيبقى
   عقدُ applyField كما هو. */
export function parseVal(d,raw,e){
 if(!d)return {ok:0,why:"حقلٌ مجهول"};
 if(d.t==="chk")return {ok:1,
  v:(raw===1||raw===true||raw==="1"||raw==="on"||raw==="true")?1:0};
 if(d.t==="sel"){
  const s=String(raw==null?"":raw);
  if(!iVals(d).some(v=>String(v)===s)&&!(d.accept||[]).includes(s))
   return {ok:0,why:`ليس من: ${iNames(d).join(" · ")}`};
  return {ok:1,v:s};
 }
 if(d.t==="text"){
  let s=String(raw==null?"":raw);
  if(d.trim)s=s.trim();
  const mx=lim(d.max,e);
  return {ok:1,v:(mx!=null)?s.slice(0,mx):s};
 }
 /* Mx للطول (مترٌ ⇒ مليمتر) وNx للعدد — كما في SET حرفاً بحرف،
    فحدُّ القبول والأرقامُ الهندية والفاصلةُ العربية لا تتبدّل. */
 const q=(d.t==="len")?Mx(raw):Nx(raw);
 if(q==null)return {ok:0,
  why:`«${raw}» ${(d.t==="len")?"ليس طولاً":"ليس رقماً"}`};
 if(d.wrap)return {ok:1,v:deg(q)};
 let v=(d.t==="len"||d.int)?R(q):q;
 const mn=lim(d.min,e), mx=lim(d.max,e);
 const fm=n=>(d.t==="len")?`${m3(n)} م`:String(n);
 const cl=d.clip||0;
 if(mn!=null&&v<mn){
  if(cl==="min"||cl==="both")v=mn;
  else{
   const w=say(d.minWhy,e);
   return {ok:0,why:`${NM(d)}: الأدنى ${fm(mn)}`+(w?` — ${w}`:"")};
  }
 }
 if(mx!=null&&v>mx){
  if(cl==="max"||cl==="both")v=mx;
  else{
   const w=say(d.maxWhy,e);
   return {ok:0,why:`${NM(d)}: الأقصى ${fm(mx)}`+(w?` — ${w}`:"")};
  }
 }
 return {ok:1,v};
}
/* ═══ ما لا يُعبَّر عنه بمدىً ═══
   ثلاثةٌ من سبعةَ عشرَ. تُعيد رسالةً أو "" ولا تكتب، وتُنادى بعد
   الكتابة فتقرأ الحالةَ الجديدة، والرفضُ يُرجِع القديمة.
   ورسائلُها منقولةٌ حرفاً بحرف — هي عقدٌ مع المستخدم. */
const GUARD={
 "wall.t":(w,t)=>{
  const n=opensOf(w.id).find(o=>o.kind==="niche"
   &&(+o.dep||0)>t-40);
  return n?`${n.id} كوّة عمقها ${m3(n.dep)} م — `
   +`السماكة ${m3(t)} م لا تكفيها`:"";
 },
 /* allowed(w,nw,o) تستثني o بالهويّة ولا تقرأ o.w، وحلقةُ التراكب
    تتخطّاه كذلك — فالفحصُ بعد الكتابة يطابق ما قبلها. */
 "open.w":(o,nw)=>{
  const w=wallById(o.wall);
  if(!w)return "جدارها غير موجود";
  const A=allowed(w,nw,o);
  if(!A.fits)
   return `${m3(nw)} م لا تتّسع في ${w.id} `
    +`(طوله ${m3(wallLen(w))} م)`;
  if(!A.spans.some(([a,b])=>o.s>=a-1&&o.s<=b+1))
   return `التوسيع إلى ${m3(nw)} م حول موضعها ${m3(o.s)} م `
    +`لا يتّسع — المواضع الحرّة ${saySpans(A)} م`;
  const lo=o.s-nw/2, hi=o.s+nw/2;
  for(const x of opensOf(w.id)){
   if(x===o)continue;
   const [a,b]=span(x);
   if(lo<b-1&&a<hi-1)
    return `التوسيع يصطدم بـ ${x.id} ${okName(x.kind)} `
     +`على ${m3(x.s)} م`;
  }
  return "";
 },
 "dim.kind":d=>(dimValue(d)<10)
  ? `${d.id}: نقطتاه متطابقتان في هذا الاتجاه` : ""
};

/* من يملك الحقل: قرارٌ صريح لا استنتاج من نجاح الكتابة.
   ولا when في FLD بقصد — ownsField هي الحكم، ولو أضفتُها صار
   للسؤال جوابان. ومفاتيحُ SET كانت ≡ مفاتيحَ FLD في كل نوعٍ بلا
   استثناء، فالاحتياطُ يقرأ الجدولَ نفسه. */
export function ownsField(kind,e,field){
 if(kind==="open"&&field==="swing")return !!OK[e.kind].sw;
 if(kind==="open"&&field==="dep")  return e.kind==="niche";
 if(kind==="col" &&field==="h")    return e.kind!=="circ";
 if(kind==="col" &&field==="rot")  return e.kind!=="circ";
 if(kind==="anno"&&field==="al")   return e.kind==="text";
 if(kind==="anno"&&field==="hm")   return e.kind!=="level";
 if(kind==="anno"&&field==="pre")  return e.kind==="level";
 return !!fldOf(kind,field);
}
/* ═══ قراءةُ القيمة ═══ من FLD لا من سلسلةِ شروط ═══
   واللوحتان تقرآن قراءةً واحدة — كان عمقُ الكوّة يُقرأ بدالّتين. */
export function fieldVal(kind,e,field){
 const d=fldOf(kind,field);
 if(d&&typeof d.read==="function")return d.read(e);
 const v=e[field];
 return (v==null)?"":v;
}
/* ═══ الكتابةُ الواحدة ═══
   بديلٌ حرفيٌّ لنداء SET[kind][field](e,raw): تعيد true/false
   (‏false = لا يملكه) وترمي Error على الرفض. */
export function applyVal(kind,field,e,raw){
 const d=fldOf(kind,field);
 if(!d)return false;
 if(!ownsField(kind,e,field))return false;
 const r=parseVal(d,raw,e);
 if(!r.ok)throw new Error(r.why);
 /* القاعدةُ المقسورة على حقلها: رفضٌ لا قسر — طلبتَ ما تمنعه
    القاعدة، والتصريحُ خيرٌ من تبديلٍ صامت. وهي رسالةُ SET نفسها. */
 if(typeof d.force==="function"){
  const f=d.force(e);
  if(f!=null&&String(f)!==String(r.v))
   throw new Error(d.forceWhy||`${NM(d)}: قيمةٌ مقسورة`);
 }
 const had=Object.prototype.hasOwnProperty.call(e,field);
 const old=e[field];
 if(typeof d.write==="function")d.write(e,r.v); else e[field]=r.v;
 const g=GUARD[`${kind}.${field}`];
 if(g){
  const msg=g(e,r.v,old);
  if(msg){
   if(had)e[field]=old; else delete e[field];
   throw new Error(msg);
  }
 }
 if(typeof d.after==="function")d.after(e,r.v,old);
 return true;
}
/* ═══ القواعدُ المقسورة بعد كتابةِ أيِّ حقل ═══
   تُطبَّق حين تُبدِّل نافذةً باباً كما تُطبَّق حين تكتب الجلسة،
   وتُعاد مُعلَنةً فتُقال. وكانت كتابةً صامتةً داخل مُثبِّتٍ آخر. */
export function forceRules(kind,e){
 const out=[];
 (FLD[kind]||[]).forEach(d=>{
  if(typeof d.force!=="function")return;
  if(!ownsField(kind,e,d.k))return;
  const f=d.force(e);
  if(f==null)return;
  const cur=e[d.k];
  if(String(cur==null?"":cur)===String(f))return;
  if(typeof d.write==="function")d.write(e,f); else e[d.k]=f;
  out.push({k:d.k,n:NM(d),t:d.t,v:f,why:d.forceWhy||""});
 });
 return out;
}
/* ═══ التجميع ═══ */
export function groupSel(list){
 const G={};
 (list||[]).forEach(s=>{
  if(!s||!FLD[s.k])return;
  if(!pickable(s))return;                /* المخفيّ والمقفل خارج */
  if(!entOf(s))return;
  (G[s.k]=G[s.k]||[]).push(s);
 });
 return G;
}
export const groupOrder=G=>KORDER.filter(k=>G[k]&&G[k].length);

/* ═══ القراءة ═══
   mixed=1 يعني «متعدّد»: الحقل يُعرَض فارغاً ولا يُكتب من تلقائه.
   وvalue:null نوعٌ لا يتصادم بنصٍّ حقيقيّ — فلا سلسلةَ خاصّة. */
export function readField(kind,list,field){
 if(!fldOf(kind,field))return {mixed:0,value:null,own:0,n:0};
 let v=null, first=1, mixed=0, own=0;
 (list||[]).forEach(s=>{
  const e=entOf(s);
  if(!e||!ownsField(kind,e,field))return;
  own++;
  const cur=fieldVal(kind,e,field);
  if(first){v=cur; first=0}
  else if(String(cur)!==String(v))mixed=1;
 });
 return {mixed,value:mixed?null:v,own,n:(list||[]).length};
}
/* ═══ التطبيق ═══
   خطوة تراجع واحدة. ما قُبل يُكتَب، وما رُفض يُذكَر باسمه وسببه،
   وما لا يملك الحقل يُعَدّ ولا يُلام. */
export function applyField(kind,list,field,raw,opt){
 const O=opt||{};
 const d=fldOf(kind,field);
 /* خطأ الاستعمال يُرمى خارج edit(): تبتلع edit الرميَ وتُعيد
    undefined، فيسقط المستدعي على r.done بدل أن يرى السبب. */
 if(!d)throw new Error(`لا حقل «${field}» في ${NAME[kind]||kind}`);
 /* ═══ الفراغُ معنيان ═══
    في اللوحة الجماعية «لا تكتب»، وفي المفردة «اكتب فراغاً» (مسحُ
    اسمِ منطقةٍ أو نصٍّ بديل). ومظهرٌ واحدٌ لمعنيين لا يُحسَم
    بالتخمين ولا بسلوكٍ مخفيٍّ في مستمع الحدث: وسيطٌ صريح في موضع
    النداء — فيلزم modify.js وai/ops كما يلزم اللوحة.
    ومسحُ نصٍّ جماعياً يحتاج زرّاً لا معنىً ثانياً للفراغ. */
 if(O.skipBlank&&(raw===""||raw==null))
  return {field, kind, done:0, ids:[], refused:[],
   noown:0, skipped:0, forced:[], blank:1};
 /* عقدُ الدفعة: ما قُبل يُكتَب، وما رُفض يُذكَر باسمه وسببه — لا
    ذرّيةَ كاملة بقصد (رفضُ عنصرٍ لا يُسقط التسعةَ الصالحة). أمّا
    الفشلُ غير المتوقَّع في أيّ عنصرٍ فيُرجِع الدفعةَ كلّها. */
 return edit(()=>{
  const done=[], ref=[], noown=[], gone=[], forced=[];
  (list||[]).forEach(s=>{
   if(!pickable(s)){gone.push(s.id); return}
   const e=entOf(s);
   if(!e){gone.push(s.id); return}
   if(!ownsField(kind,e,field)){noown.push(s.id); return}
   try{
    if(applyVal(kind,field,e,raw)===false){noown.push(s.id); return}
    done.push(s.id);
    /* بعد كلِّ كتابةٍ ناجحة — فالقاعدةُ تُطبَّق من كل مدخل */
    forceRules(kind,e).forEach(x=>
     forced.push(Object.assign({id:s.id},x)));
   }catch(err){ref.push({id:s.id,msg:err.message})}
  });
  if(done.length){
   /* النوع يُعلن نسختَه: تعديلُ نصٍّ بديلٍ في مئة بُعد لا يُبطِل
      اتحاد المضلّعات. والجدول هو المرجع لا شرطٌ هنا. */
   touchFn(bumpOf([{k:kind}]))();
  }
  return {field, kind, done:done.length, ids:done,
   refused:ref, noown:noown.length, skipped:gone.length, forced};
 },`تعديل ${fldName(kind,field)}`,{bump:bumpOf([{k:kind}])});
}
/* ═══ التثبيت المفرد ═══
   غلافٌ على applyField: كيانٌ واحد وحقلٌ واحد، فلا مسارَ ثانٍ
   بحدودٍ مكرَّرة. وبلا skipBlank — الفراغُ في المفردة قيمة. */
export function applyOne(s,field,raw){
 const r=applyField(s.k,[s],field,raw);
 if(r.done)return {ok:1, forced:r.forced,
  /* القسرُ يُقال: قيمةٌ تتبدّل بلا كلمةٍ أسوأُ من رفضٍ مُعلَن */
  msg:(r.forced&&r.forced.length)?sayForced(r.forced):""};
 if(r.refused.length)return {ok:0,msg:r.refused[0].msg};
 if(r.skipped)return {ok:0,msg:"الكيان لم يعد موجوداً"};
 return {ok:0,msg:`لا يملك ${NAME[s.k]||s.k} الحقل «${field}»`};
}
/* ═══ أوامر جماعية صريحة ═══ */
/* التحقّق من التحديد قبل edit() وخارجها — كما في applyField: الرفضُ
   رميٌ يصل المستدعي. والكتابةُ وحدها معاملة. */
export function renumberCols(list,prefix){
 const P=String(prefix||"C").replace(/\d+$/,"").slice(0,6)||"C";
 const C=(list||[]).filter(pickable).map(s=>colById(s.id))
  .filter(Boolean);
 if(!C.length)throw new Error("لا أعمدة قابلة للترقيم");
 return edit(()=>{
  /* الترتيب من أعلى اليمين: y نازلاً ثم x نازلاً — قراءةً عربية */
  C.sort((a,b)=>(b.y-a.y)||(b.x-a.x));
  C.forEach((c,i)=>{c.tag=P+(i+1)});
  return {n:C.length,first:C[0].tag,last:C[C.length-1].tag};
 },"إعادة ترقيم الأعمدة");
}
export function clearDimTxt(list){
 return edit(()=>{
  let n=0;
  (list||[]).filter(pickable).forEach(s=>{
   const d=dimById(s.id);
   if(d&&d.txt!=null){delete d.txt; n++}
  });
  return n;
 },"مسح النصوص البديلة",{bump:"view"});
}
/* ═══ مسحُ الأسماء ═══
   الفراغُ في الجماعية يعني «لا تكتب»، فمسحُ أسماء عشرِ مناطقَ
   دفعةً واحدة لا سبيلَ إليه من الحقل. وزرٌّ صريحٌ خيرٌ من معنىً
   ثانٍ للفراغ يقع خلسة — كزرِّ «امسح النصّ البديل» للأبعاد. */
export function clearAreaNames(list){
 return edit(()=>{
  let n=0;
  (list||[]).filter(pickable).forEach(s=>{
   const a=areaById(s.id);
   if(a&&a.name){a.name=""; n++}
  });
  return n;
 },"مسح أسماء المناطق",{bump:"view"});
}
/* ═══ ترقيمُ الغرفِ المتسلسل ═══ §٣ (أولوية منخفضة)
   كان الترتيبُ **بالمساحة**: الأكبرُ أوّلاً. وهو ترتيبٌ معقولٌ لجدولِ
   كمّياتٍ ولا معنى له على ورقة: من يقرأ المخطَّطَ يتتبّع الغرفَ
   بعينه صفّاً صفّاً، فيجد ١ في زاويةٍ و٢ في الزاويةِ المقابلةِ و٣
   وسطَ الدار. والترقيمُ الذي لا يُتتبَّع لا يُستعمَل.

   فأُضيف ترتيبٌ **مكانيٌّ** هو الافتراضُ الآن: صفوفٌ من الأعلى إلى
   الأسفل، وداخلَ الصفِّ من اليمين إلى اليسار — اتجاهُ القراءةِ
   العربيّ. والصفُّ يُقتَنص بعتبةٍ: مركزانِ يفترقان رأسياً أقلَّ من
   `ROWTOL` في صفٍّ واحد. والعتبةُ نسبيةٌ لا ثابتة: تُشتَقُّ من
   وسيطِ ارتفاعاتِ الغرف، فشقّةٌ صغيرةٌ وفيلّا تُقرآنِ بالعرفِ نفسه.

   والترتيبُ القديمُ باقٍ خياراً (`by:"size"`): جدولُ الكمّياتِ يريده،
   وتغييرُ سلوكٍ قائمٍ بلا بديلٍ خسارةٌ لا تحسين. */
export const AREA_ORDERS=["plan","size"];
const ROWTOL_MIN=800;
/* صفوفٌ ثم يمينٌ إلى يسار — مركزُ الصندوقِ هو المرجع، لا المركزُ
   الهندسيُّ: غرفةٌ على شكلِ L مركزُها الهندسيُّ قد يقع خارجَها. */
function planOrder(A){
 const box=a=>{
  const b=bboxOf(a.ring||[]);
  return b?{cx:(b.x0+b.x1)/2, cy:(b.y0+b.y1)/2, h:b.y1-b.y0}:null;
 };
 const M=A.map(a=>({a,b:box(a)})).filter(x=>x.b);
 if(M.length<2)return A.slice();
 /* العتبةُ من وسيطِ الارتفاعات: نصفُه يكفي لفصلِ صفٍّ عن صفّ */
 const hs=M.map(x=>x.b.h).sort((p,q)=>p-q);
 const med=hs[Math.floor(hs.length/2)]||0;
 const tol=Math.max(ROWTOL_MIN,med*0.5);
 M.sort((p,q)=>q.b.cy-p.b.cy);        /* الأعلى أوّلاً */
 const rows=[];
 M.forEach(x=>{
  const r=rows[rows.length-1];
  if(r&&Math.abs(r.cy-x.b.cy)<=tol){
   r.items.push(x);
   /* مرجعُ الصفِّ متوسّطُ ما فيه: غرفةٌ واحدةٌ شاذّةٌ لا تجرُّ الصفَّ */
   r.cy=r.items.reduce((s,y)=>s+y.b.cy,0)/r.items.length;
   return;
  }
  rows.push({cy:x.b.cy,items:[x]});
 });
 const out=[];
 rows.forEach(r=>{
  r.items.sort((p,q)=>q.b.cx-p.b.cx);  /* اليمينُ أوّلاً — عربيّ */
  r.items.forEach(x=>out.push(x.a));
 });
 /* ما لا صندوقَ له (حلقةٌ فاسدة) يُلحَق آخراً ولا يُسقَط بلا ذكر */
 A.forEach(a=>{if(out.indexOf(a)<0)out.push(a)});
 return out;
}
export function nameAreasSeq(list,prefix,by){
 const P=String(prefix||"").trim().slice(0,24);
 const ORD=(by==="size")?"size":"plan";
 const A=(list||[]).filter(pickable).map(s=>areaById(s.id))
  .filter(Boolean);
 if(!A.length)throw new Error("لا مناطق محدَّدة");
 return edit(()=>{
  const O=(ORD==="size")
   ? A.slice().sort((a,b)=>netArea(b)-netArea(a))
   : planOrder(A);
  O.forEach((a,i)=>{a.name=(P?`${P} ${i+1}`:String(i+1))});
  return {n:O.length,first:O[0].name,order:ORD,
   last:O[O.length-1].name};
 },"تسمية المناطق بالتسلسل",{bump:"view"});
}
/* ═══ التقرير ═══ */
const fmtV=(t,v)=>(t==="len")?`${m3(v)} م`:String(v);
export const sayForced=F=>(F||[]).map(x=>
 `${x.n} قُسِرت إلى ${fmtV(x.t,x.v)}`+(x.why?` — ${x.why}`:""))
 .join(" · ");
/* والقسرُ مجموعٌ بسببه في الجماعية: عشرون قسراً بسببٍ واحدٍ
   سطرٌ واحد. */
export function groupForced(F){
 const m=new Map();
 (F||[]).forEach(x=>{
  const k=x.n+"|"+x.why+"|"+fmtV(x.t,x.v);
  m.set(k,(m.get(k)||0)+1);
 });
 const out=[];
 m.forEach((n,k)=>{
  const [nm,why,v]=k.split("|");
  out.push(`${nm} قُسِرت إلى ${v} في ${n} عنصراً`
   +(why?` — ${why}`:""));
 });
 return out;
}
export function sayApply(r){
 const F=fldName(r.kind,r.field);
 const P=[`${F}: ${r.done} من ${NAME[r.kind]||r.kind}`];
 if(r.noown)P.push(`تُخطِّي ${r.noown} لا يملكها`);
 if(r.skipped)P.push(`${r.skipped} مخفيّ أو مقفل`);
 if(r.refused.length)P.push(`رُفض ${r.refused.length}`);
 if(r.forced&&r.forced.length)
  P.push(`قُسِرت ${r.forced.length} قيمة`);
 return P.join(" · ");
}
export const summary=G=>groupOrder(G)
 .map(k=>`${G[k].length} ${NAME[k]||k}`).join(" · ");
