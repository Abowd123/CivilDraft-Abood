/* ═══ المُدقِّق الموحَّد — 2.3 ═══
   جدولٌ واحد (VLD) يصف كلَّ كيانٍ وحقولَه ونوعَ كلِّ حقل. كل
   منفذ إدخالٍ إلى الحالة (addX · مسار المزوّد · تعريف كتلة)
   يمرّ بـV(kind,obj) قبل أن يكتب شيئاً: ما لا يُفهَم يُرمى بـ
   ParseError له code وحقلٌ مسمّى — لا NaN يُخزَّن ولا نقطةٌ
   ناقصة تصير أصلاً.

   ما يفحصه: النوعُ والانتهاء (لا NaN/Infinity) والإحداثيُّ داخل
   LIM.coord وأطوالُ المصفوفات والنصوص. وما لا يفحصه: الحدودُ
   «الناعمة» (سماكةٌ فوق TMAX تُقسَر كما كانت) — تلك يُبقيها
   كلُّ addX على سلوكه القائم، فلا يتغيّر شيءٌ لمن كانت مدخلاتُه
   سليمة.

   والاعتمادُ باتجاهٍ واحد: هذا الملفّ يستورد parse/coords/limits
   ولا يستورد state — فلا دورة. وvalidate.test.js يفرض أنّ كل
   addX في COVER يستدعي V بنوعه. */
import {ParseError} from "./parse.js";
import {PT} from "./coords.js";
import {LIM} from "./limits.js";

const isNum=v=>typeof v==="number"&&isFinite(v);
const inCo=v=>Math.abs(v)<=LIM.coord.max;

/* أسماء الكيانات للرسائل */
const LBL={wall:"جدار",open:"فتحة",area:"منطقة",col:"عمود",fix:"أداة",
 stair:"درج",roof:"سقف",dim:"بُعد",dimRad:"بُعد نصف قطر",dimAng:"بُعد زاوي",
 chain:"سلسلة",text:"نصّ",lead:"قائد",
 level:"منسوب",blockDef:"تعريف كتلة",
 sheet:"ورقة",vpv:"منفذ",
 pline:"خطّ متعدّد",cloud:"سحابة مراجعة",callout:"وسم تفصيلة",
 table:"جدول",
 group:"مجموعة",live:"حقل حيّ"};

/* ═══ الجدول ═══ t: نوع الحقل · req: إلزاميّ · باقي المفاتيح لكل نوع
   pt   نقطة [x,y] مليمتر — تُقرَّب
   fpt  نقطة بلا تقريب (إحداثيّات كتلةٍ محلّية)
   num  رقم منتهٍ · lim اختياريّ
   str  نصّ · max
   sel  أحد items
   (الإلزاميّ req يقتصر على ما لا معنى للكيان بدونه؛ وما له رسالةٌ
    خاصّة في addX — «الحلقة أقلّ من ثلاثة» — يبقى اختيارياً هنا
    فتبقى رسالته)
   pts/ring  مصفوفة نقاط · min/max
   vals مصفوفة أرقام · max
   prims أوّليات كتلة */
export const VLD={
 wall:{a:{t:"pt",req:1}, b:{t:"pt",req:1}, t:{t:"num"},
  type:{t:"str",max:20}, align:{t:"str",max:4}, h:{t:"num"},
  bulge:{t:"num"}},
 open:{s:{t:"num",req:1}, W:{t:"num"}, H:{t:"num"}, sill:{t:"num"},
  kind:{t:"str",max:20}},
 area:{ring:{t:"ring",max:LIM.vertices.max},
  name:{t:"str",max:400}},
 col:{p:{t:"pt",req:1}, w:{t:"num"}, h:{t:"num"}, rot:{t:"num"},
  kind:{t:"str",max:10}, type:{t:"str",max:10}},
 fix:{p:{t:"pt",req:1}, rot:{t:"num"}, kind:{t:"str",max:10},
  /* المرحلة ٣ · F3: الأداة الصحية منسوبةٌ لطابقٍ كسائر المكانيات */
  level:{t:"num"}},
 stair:{a:{t:"pt",req:1}, b:{t:"pt",req:1}, w:{t:"num"}, n:{t:"num"}},
 /* المرحلة B2: السقف — الحلقة مطلوبةٌ هنا ونقصُ أضلاعها (<3) يبقى
    رسالتَه في addRoof كما في المنطقة؛ النوع نصٌّ لا sel فيبقى
    السقوطُ الصامت إلى flat على ما كان في الخطة */
 roof:{ring:{t:"ring",max:LIM.vertices.max},
  name:{t:"str",max:400}, type:{t:"str",max:20},
  slope:{t:"num"}, h:{t:"num"}},
 dim:{a:{t:"pt",req:1}, b:{t:"pt",req:1}, pos:{t:"num"},
  kind:{t:"str",max:10}},
 /* المرحلة C1: أبعاد نصف القطر/القطر — c مركزٌ وr نصف قطر؛
    الزاويّ vertex/p1/p2 صريحةٌ وr نصف قطر قوس البعد (اختياريّ
    الحدّ الأدنى بلا فحصٍ هنا فرسالة addDimAng الخاصّة تبقى) */
 dimRad:{c:{t:"pt",req:1}, r:{t:"num",req:1}},
 dimAng:{vertex:{t:"pt",req:1}, p1:{t:"pt",req:1}, p2:{t:"pt",req:1},
  r:{t:"num"}},
 chain:{base:{t:"pt",req:1}, pos:{t:"num",req:1},
  vals:{t:"vals",max:5000}, axis:{t:"str",max:2}},
 text:{p:{t:"pt",req:1}, s:{t:"str",max:2000}, hm:{t:"num"},
  rot:{t:"num"}},
 /* الفقرة: كالنصّ وزيادةُ عرضِ العمود — واللفُّ يُحسَب عند الرسم */
 mtext:{p:{t:"pt",req:1}, s:{t:"str",max:2000}, wid:{t:"num"}, hm:{t:"num"}},
 /* العناصرُ الإنشائية §٣/١٢ — كلُّ نوعٍ بحقوله: خلطُها في مخطَّطٍ
    واحدٍ كان سيقبل بلاطةً بطرفَين أو كمرةً برؤوس */
 beam:{a:{t:"pt",req:1}, b:{t:"pt",req:1}, w:{t:"num"}, d:{t:"num"}},
 footing:{p:{t:"pt",req:1}, w:{t:"num"}, h:{t:"num"}, rot:{t:"num"}},
 slab:{pts:{t:"pts",req:1,min:3}, th:{t:"num"}},
 /* سهمُ ميلِ الصرف §٣ — نقطتانِ ونسبةٌ مئوية */
 slope:{pts:{t:"pts",req:1,min:2}, slope:{t:"num"}},
 lead:{pts:{t:"pts",max:LIM.vertices.max}, s:{t:"str",max:2000},
  hm:{t:"num"}},
 level:{p:{t:"pt",req:1}, z:{t:"num"}, pre:{t:"str",max:200}},
 /* تعريف الكتلة: إحداثيّاتٌ محلّية بالمليمتر وزوايا القوس راديان */
 blockDef:{name:{t:"str",req:1,nonempty:1,max:80},
  title:{t:"str",max:120}, base:{t:"fpt"},
  prims:{t:"prims",max:LIM.blockPrims.max}},
 /* ═══ الأوراق المتعددة والمنافذ — المرحلة 4 ═══
    sheet بياناتُ مشروعٍ (ليست كياناً مكانياً): مقاسُ ورقةٍ واتجاهها
    وبلوكُ عنوانها. vpv منفذٌ يربط مستطيلَ نموذجٍ بمستطيلِ ورقةٍ —
    modelRect/paperRect إلزاميّان، فبلا ربطٍ لا معنى للمنفذ. */
 sheet:{name:{t:"str",max:200},
  size:{t:"sel",items:["A0","A1","A2","A2+","A3","A3+","A4","custom"]},
  customW:{t:"num",lim:LIM.sheetCustom},
  customH:{t:"num",lim:LIM.sheetCustom},
  orient:{t:"sel",items:["l","p"]}, margin:{t:"num"},
  tb:{t:"num"}, north:{t:"num"}, cx:{t:"num"}, cy:{t:"num"}},
 vpv:{name:{t:"str",max:200},
  modelRect:{t:"rect",req:1}, paperRect:{t:"rect",req:1},
  layers:{t:"strs",max:500}, frozen:{t:"strs",max:500},
  visible:{t:"num"}, levelScope:{t:"num"}},
 /* المرحلة A: خطّ متعدّد · سحابة مراجعة · وسم تفصيلة */
 /* الجدولُ موضعٌ ونوعٌ فقط — الصفوفُ حيّةٌ فلا تُصدَّق هنا (P-جديد ٧) */
 table:{kind:{t:"str",max:16}, p:{t:"pt"}},
 pline:{pts:{t:"pts",max:LIM.vertices.max},
  closed:{t:"num"}, bulge:{t:"vals",max:LIM.vertices.max}},
 cloud:{ring:{t:"ring",max:LIM.vertices.max},
  r:{t:"num"}, label:{t:"str",max:60}},
 callout:{label:{t:"str",max:4},
  srcSheet:{t:"str",req:1,max:200}, srcVp:{t:"str",req:1,max:200},
  tgtSheet:{t:"str",req:1,max:200}, tgtVp:{t:"str",req:1,max:200},
  pos:{t:"pt",req:1}},
 group:{name:{t:"str",max:80},
  members:{t:"group",max:LIM.groupMembers.max}},
 /* الحقل الحيّ: مصدرٌ معلنٌ وموضعٌ صريح، والباقي عرضٌ مطبَّع */
 live:{src:{t:"str",req:1,max:200}, pos:{t:"pt",req:1},
  fmt:{t:"str",max:8}, pre:{t:"str",max:40}, suf:{t:"str",max:40},
  rot:{t:"num"}, hm:{t:"num"}}
};
export const KINDS=Object.keys(VLD);

const bad=(code,kind,name,msg,detail)=>
 new ParseError(code,`${LBL[kind]||kind}.${name}: ${msg}`,
  Object.assign({kind,field:name},detail||{}));

function fpt(v){
 return Array.isArray(v)&&v.length>=2&&isNum(v[0])&&isNum(v[1])
  &&inCo(v[0])&&inCo(v[1]);
}

function field(kind,name,F,v){
 switch(F.t){
  case "pt":{
   const q=PT(v);
   if(!q)throw bad("BAD_POINT",kind,name,
    "ليست نقطةً صالحة (إحداثيٌّ ناقص أو غير منتهٍ أو خارج الحدّ)");
   return q;
  }
  case "fpt":
   if(!fpt(v))throw bad("BAD_POINT",kind,name,"ليست نقطةً صالحة");
   return [v[0],v[1]];
  case "num":
   if(!isNum(v))throw bad("BAD_NUMBER",kind,name,
    `«${String(v).slice(0,30)}» ليس رقماً منتهياً`);
   if(F.lim&&(v<F.lim.min||v>F.lim.max))
    throw bad("OUT_OF_RANGE",kind,name,`${v} خارج الحدّ`);
   return v;
  case "str":
   if(typeof v!=="string")throw bad("BAD_TYPE",kind,name,"ليست نصّاً");
   if(F.nonempty&&!v.trim())throw bad("EMPTY",kind,name,"فارغة");
   if(F.max!=null&&v.length>F.max)
    throw bad("TOO_LONG",kind,name,`${v.length} محرفاً — الأقصى ${F.max}`);
   return v;
  case "sel":
   if(!F.items.includes(String(v)))
    throw bad("BAD_ENUM",kind,name,`«${v}» ليست من ${F.items.join("|")}`);
   return String(v);
  case "pts":case "ring":{
   if(!Array.isArray(v))throw bad("NOT_ARRAY",kind,name,"ليست مصفوفة");
   if(F.max!=null&&v.length>F.max)
    throw bad("TOO_MANY",kind,name,`${v.length} — الأقصى ${F.max}`);
   return v.map((p,i)=>{
    const q=PT(p);
    if(!q)throw bad("BAD_POINT",kind,`${name}[${i}]`,
     "ليست نقطةً صالحة",{index:i});
    return q;
   });
  }
  case "vals":{
   if(!Array.isArray(v))throw bad("NOT_ARRAY",kind,name,"ليست مصفوفة");
   if(F.max!=null&&v.length>F.max)
    throw bad("TOO_MANY",kind,name,`${v.length} — الأقصى ${F.max}`);
   v.forEach((x,i)=>{
    const ok=isNum(x)||(typeof x==="string"&&x.trim()!==""&&isFinite(+x));
    if(!ok)throw bad("BAD_NUMBER",kind,`${name}[${i}]`,"ليست رقماً",
     {index:i});
   });
   return v.slice();
  }
  case "rect":{
   if(!v||typeof v!=="object"||Array.isArray(v))
    throw bad("BAD_POINT",kind,name,"ليس مستطيلاً صالحاً");
   const x0=+v.x0, y0=+v.y0, x1=+v.x1, y1=+v.y1;
   if(![x0,y0,x1,y1].every(isNum))
    throw bad("BAD_POINT",kind,name,"إحداثيٌّ غير منتهٍ");
   if(![x0,y0,x1,y1].every(inCo))
    throw bad("BAD_POINT",kind,name,"إحداثيٌّ خارج الحدّ");
   if(x1<x0||y1<y0)
    throw bad("BAD_POINT",kind,name,"x1 أو y1 أصغر من طرف البداية");
   return {x0:Math.round(x0),y0:Math.round(y0),
           x1:Math.round(x1),y1:Math.round(y1)};
  }
  case "strs":{
   if(!Array.isArray(v))throw bad("NOT_ARRAY",kind,name,"ليست مصفوفة");
   if(F.max!=null&&v.length>F.max)
    throw bad("TOO_MANY",kind,name,`${v.length} — الأقصى ${F.max}`);
   return v.map((s,i)=>{
    if(typeof s!=="string")
     throw bad("BAD_TYPE",kind,`${name}[${i}]`,"ليست نصّاً",{index:i});
    return s.slice(0,80);
   });
  }
  case "group":{
   if(!Array.isArray(v))throw bad("NOT_ARRAY",kind,name,"ليست مصفوفة");
   if(F.max!=null&&v.length>F.max)
    throw bad("TOO_MANY",kind,name,`${v.length} — الأقصى ${F.max}`);
   return v.map((s,i)=>{
    if(!s||typeof s!=="object"||Array.isArray(s))
     throw bad("BAD_POINT",kind,`${name}[${i}]`,"عضوٌ ليس {k,id}");
    const k=String(s.k||"").slice(0,16);
    const id=String(s.id==null?"":s.id).slice(0,80);
    if(!k||!id)
     throw bad("BAD_POINT",kind,`${name}[${i}]`,"عضوٌ بلا k أو id",{index:i});
    return {k,id};
   });
  }
  case "prims":return parsePrims(v,F.max);
  default:
   throw new ParseError("BAD_SCHEMA",`نوع حقلٍ مجهول: ${F.t}`);
 }
}

/* ═══ أوّليات الكتلة ═══ line · pline · circle · arc.
   لا تمرّ بـparsePoint: قيمُها أعدادٌ بالمليمتر المحلّي لا نصوصَ
   بالمتر، وزاويةُ القوس راديان (الباب الافتراضيّ: π/2) لا درجات. */
export function parsePrims(prims,max){
 const cap=(max==null)?LIM.blockPrims.max:max;
 if(!Array.isArray(prims))
  throw new ParseError("NOT_ARRAY","prims ليست مصفوفة");
 if(prims.length>cap)
  throw new ParseError("TOO_MANY",`${prims.length} أوّلية — الأقصى ${cap}`);
 return prims.map((p,i)=>parsePrim(p,i));
}
function parsePrim(p,i){
 const w=m=>new ParseError("BAD_PRIM",`الأوّلية ${i}: ${m}`,{index:i});
 if(!p||typeof p!=="object"||Array.isArray(p))throw w("ليست كائناً");
 const t=String(p.t||"");
 if(t==="line"){
  if(!fpt(p.a)||!fpt(p.b))throw w("a أو b ليست نقطةً صالحة");
  return Object.assign({},p,{a:[p.a[0],p.a[1]],b:[p.b[0],p.b[1]]});
 }
 if(t==="pline"){
  if(!Array.isArray(p.pts))throw w("pts ليست مصفوفة");
  if(p.pts.length<2)throw w("نقطتان على الأقل");
  if(p.pts.length>LIM.vertices.max)throw w(`${p.pts.length} رأساً`);
  if(!p.pts.every(fpt))throw w("في pts نقطةٌ غير صالحة");
  return Object.assign({},p,{pts:p.pts.map(q=>[q[0],q[1]])});
 }
 if(t==="circle"||t==="arc"){
  if(!fpt(p.c))throw w("المركز ليس نقطةً صالحة");
  if(!isNum(p.r)||p.r<=0||p.r>LIM.coord.max)
   throw w("نصف القطر يجب أن يكون موجباً ومنتهياً");
  if(t==="arc"){
   if(!isNum(p.a0)||!isNum(p.a1)||Math.abs(p.a0)>1e4||Math.abs(p.a1)>1e4)
    throw w("زاويتا القوس (راديان) غير منتهيتين");
  }
  return Object.assign({},p,{c:[p.c[0],p.c[1]]});
 }
 throw w(`نوع «${t}» مجهول`);
}

/* ═══ V — الوضع الصارم: يرمي على أيّ فشل ═══
   opts.keep: أبقِ الحقول غير المذكورة في الجدول (تعريفات الكتل) ·
   opts.fill: املأ الافتراضيّات (def) للحقول الغائبة. */
export function V(kind,obj,opts){
 const S=VLD[kind];
 if(!S)throw new ParseError("BAD_SCHEMA",`كيانٌ مجهول: ${kind}`);
 if(!obj||typeof obj!=="object"||Array.isArray(obj))
  throw new ParseError("NOT_OBJECT",`${LBL[kind]||kind}: ليس كائناً`,
   {kind});
 const o=(opts&&opts.keep)?Object.assign({},obj):{};
 Object.keys(S).forEach(k=>{
  const F=S[k], v=obj[k];
  if(v===undefined||v===null){
   if(F.req)throw bad("MISSING",kind,k,"إلزاميّ وغائب");
   if(opts&&opts.fill&&F.def!==undefined)o[k]=F.def;
   return;
  }
  o[k]=field(kind,k,F,v);
 });
 return o;
}
/* الوضع الآمن: يعيد {ok:1,v} أو {ok:0,why,err} — لا يرمي */
export function safeV(kind,obj,opts){
 try{return {ok:1,v:V(kind,obj,opts)}}
 catch(e){return {ok:0,why:(e&&e.message)||String(e),err:e}}
}
/* جدول التغطية: كلُّ كيانٍ وعددُ حقوله وإلزاميِّها */
export function coverage(){
 return KINDS.map(k=>{
  const F=Object.keys(VLD[k]), r=F.filter(f=>VLD[k][f].req).length;
  return {kind:k,fields:F.length,required:r,optional:F.length-r};
 });
}
