/* ═══ أدوات التأشير ═══
   البُعد ثلاث نقرات: طرف، طرف، موضع الخطّ — كلّها صريحة.
   السلسلة تُبنى من قيَم تكتبها، لا من مطابقة تُخمَّن. */
import {S,edit,editFailed,txtH} from "../core/state.js";
import {addLive,refreshLive,liveWouldChange} from "../core/live.js";
import {regionAt} from "../core/areas.js";
import {isArc} from "../core/walls.js";
import {arcParams} from "../core/arcmath.js";
import {colW} from "../core/cols.js";
import {regionLoops} from "../core/render.js";
import {roomDims} from "../core/autodim.js";
import {m2,m3,Mx} from "../core/units.js";
import {addDim,posFromPt,dimValue,fmtLen,dimGeom,DK,
        addDimRad,addDimDia,addDimAng,
        parseVals,addChain,chainSum,chainCompare,
        addText,addLead,addLevel,addAxis,
        addMText,mtLines,mtWrap,MT_LEAD,
        addSlope,slopeStr,SLOPE_FMTS,
        axLabel,levelStr,gridExtent} from "../core/dims.js";
import {defTool,H,rec,dirty,ov,ovLen,ovNum,ovOn,
        pvLine,pvRect,pvText} from "./registry.js";
import {addTable,tableSize,tblName,TBK,TBKINDS}
 from "../core/tables.js";

const GRN="#5cd98e", YEL="#ffd06b", PNK="#ff9aa2";

/* ═══ بُعد ═══ */
defTool({
 id:"dim", alias:"d1 بعد قياسات", label:"بُعد",
 hint:"طرف · طرف · موضع الخطّ",
 opts:[
  {k:"kind",label:"النوع",type:"sel",
   items:[["h","أفقي"],["v","رأسي"],["al","محاذٍ"]],def:"h"},
  {k:"txt", label:"نصّ بديل",type:"text",def:"",
   hint:"يُعرَض بدل المقاس مع علامة *"}],
 steps:[
  {p:"الطرف الأول"},
  /* box:1 — الطرفُ الثاني ليس امتداداً للأول: النوعُ يختار الاتجاهَ المقيس.
     مع التعامد المفعَّل افتراضاً كان يُسقَط على محور، فالأفقيُّ يصير 0
     («النقطتان متطابقتان») والمحاذي يقيس ضلعاً غير المطلوب بصمت. */
  {p:"الطرف الثاني", base:0, box:1},
  {p:"موضع خطّ البُعد", base:"none", restart:1,
   each(ctx,p){
    const a=ctx.pts[0], b=ctx.pts[1];
    const kind=ov("dim","kind");
    const d=addDim(kind,a,b,posFromPt(kind,a,b,p),
     String(ov("dim","txt")||"").trim());
    rec(ctx,d,"dims");
    H.rep("ok",`${d.id} ${DK[d.kind]} ${fmtLen(dimValue(d))} م`
     +(d.txt?` · نصّ بديل «${d.txt}» — علامة * تدلّ عليه`:""));
   }}],
 prev(ctx,g){
  const P=ctx.pts;
  if(!g)return [];
  if(P.length===1)return [pvLine(P[0],g,YEL)];
  if(P.length>=2){
   const kind=ov("dim","kind");
   const gm=dimGeom({kind,a:P[0],b:P[1],
    pos:posFromPt(kind,P[0],P[1],g)});
   if(!gm)return [pvLine(P[0],P[1],YEL)];
   return [pvLine(P[0],P[1],"#4b5a6b"),
           pvLine(gm.p1,gm.p2,GRN),
           pvLine(P[0],gm.p1,"#3d4a58"),
           pvLine(P[1],gm.p2,"#3d4a58")];
  }
  return [];
 }});

/* القيَمُ من الشريط: null إن لم تُكتب بعد · strict يرمي برسالة الطريقة */
function chainVals(strict){
 try{return parseVals(ov("chain","vals"))}
 catch(e){if(strict)throw new Error(e.message+" — في حقل «القيَم» بالشريط"); return null}
}
const sc=()=>Math.max(1,+S.meta.scale||100);
const tblW=()=>ovLen("table","w")||Math.round(140*sc());
const tblRH=()=>ovLen("table","rh")||Math.round(7*sc());
/* ═══ سلسلة أبعاد بقيَم مكتوبة ═══ */
defTool({
 id:"chain", alias:"ch سلسله", label:"سلسلة",
 hint:"اكتب القيَم في الشريط ثم انقر البداية وموضع الخطّ",
 opts:[
  {k:"vals", label:"القيَم م",type:"text",def:"",
   hint:"مثل: 3 2.5 4 · أو 3*4 لتكرار"},
  {k:"axis", label:"المحور",type:"sel",
   items:[["h","أفقي"],["v","رأسي"]],def:"h"},
  {k:"total",label:"خطّ المجموع",type:"chk",def:1},
  {k:"flip", label:"المجموع للجهة المقابلة",type:"chk",def:0,
   hint:"للسلاسل أسفل الرسم أو يمينه — حيث «خارج» عكسُ الافتراضي"}],
 /* القيَمُ تُقرأ حيّةً من الشريط (حلقة «الأبعاد» · المرحلة ٥): كانت تُقرأ عند
    البدء وحده، فالأداةُ تُرفَض إن كان الحقلُ فارغاً — وحقلُها لا يظهر إلا
    والأداةُ فعّالة، فأوّلُ استعمالٍ طريقٌ مسدود — وتغييرُها بعد البدء يُهمَل. */
 start(ctx){
  const v=chainVals(), raw=String(ov("chain","vals")||"").trim();
  if(!v&&raw){try{chainVals(true)}catch(e){H.rep("wr",e.message)}}
  else if(!v)H.rep("wr","اكتب القيَم في حقل «القيَم» بالشريط — مثل: 3 2.5 4 · أو 3*4 — ثم انقر البداية");
  else H.rep("in",`${v.length} قيمة · المجموع ${fmtLen(v.reduce((s,x)=>s+x,0))} م`);
  return true;
 },
 steps:[
  {p:"نقطة بداية السلسلة",
   each(ctx){ctx.v.vals=chainVals(true)}},
  {p:"موضع خطّ السلسلة", base:0, restart:1,
   each(ctx,p){
    ctx.v.vals=chainVals(true);
    const ax=ov("chain","axis");
    const c=addChain(ax,ctx.pts[0],(ax==="h")?p[1]:p[0],
     ctx.v.vals, ovOn("chain","total")?1:0,
     ovOn("chain","flip")?1:0);
    rec(ctx,c,"chains");
    H.rep("ok",`${c.id} ${ctx.v.vals.length} قيمة · `
     +`${fmtLen(chainSum(c))} م · القيَم كما كتبتها`);
   }}],
 prev(ctx,g){
  ctx.v.vals=chainVals()||ctx.v.vals;
  if(!ctx.pts.length||!g||!ctx.v.vals)return [];
  const ax=ov("chain","axis");
  const b=ctx.pts[0];
  const pos=(ax==="h")?g[1]:g[0];
  const pt=v=>(ax==="h")?[b[0]+v,pos]:[pos,b[1]+v];
  const o=[pvLine(b,pt(0),"#3d4a58")];
  let s=0;
  ctx.v.vals.forEach(v=>{
   o.push(pvLine(pt(s),pt(s+v),GRN));
   s+=v;
  });
  return o;
 }});

/* ═══ مقارنة السلسلة بالهندسة — تقرير ═══ */
defTool({
 id:"chaincmp", stay:1, alias:"cc قارن", label:"قارن السلسلة",
 hint:"يعرض فرق كل حدٍّ عن أقرب عقدة — بلا تعديل",
 opts:[{k:"tol",label:"التفاوت م",type:"len",def:"0.06"}],
 start(ctx){
  const L=H.sel().filter(s=>s.k==="chain");
  if(!L.length){H.rep("wr","حدّد سلسلة أولاً");return false}
  L.forEach(s=>{
   const c=S.chains.find(x=>x.id===s.id);
   if(!c)return;
   const r=chainCompare(c,ovLen("chaincmp","tol"));
   H.rep(r.off?"wr":"ok",
    `${c.id}: المجموع ${fmtLen(r.sum)} م · `
    +`${r.off?`${r.off} حدّاً خارج التفاوت`:"كل الحدود مطابقة"}`);
   r.rows.forEach(x=>{
    if(x.ok)return;
    H.rep("in",`  الحدّ ${x.i}: على ${m3(x.at)} م · `
     +`أقرب عقدة ${x.near==null?"—":m3(x.near)} م · `
     +`الفرق ${x.d==null?"—":m3(x.d)} م`);
   });
  });
  H.rep("in","تقرير فقط — لم تُعدَّل قيمة واحدة");
  return false;
 },
 steps:[]});

/* ═══ أبعاد الغرفة ═══
   نقرةٌ داخل غرفةٍ مغلقة ← بُعدٌ أفقيّ أسفلها ورأسيّ يسارها وملصقٌ
   «العرض×الطول · المساحة» في وسطها (core/autodim.js — دالّةٌ خالصة).
   والأبعاد هي أبعادُ الصندوق المحيط بالحلقة: مطابقةٌ للمستطيل، أمّا
   غرفةٌ بشكلٍ آخر (L · قوس) فيُقال ذلك صراحةً — رقمُ العرض×الطول
   لغرفةٍ غير مستطيلة بلا تنبيهٍ يُقرأ كأنّه مساحتُها. المساحة في
   الملصق هي الفعليّة للحلقة دائماً. */
defTool({
 id:"roomdim", alias:"rd أبعادالغرفة", label:"أبعاد الغرفة",
 hint:"انقر داخل غرفةٍ مغلقة · Enter ينهي",
 opts:[
  {k:"off",  label:"إزاحة البُعد م", type:"len", def:"1"},
  {k:"label",label:"ملصق الأبعاد والمساحة", type:"chk", def:1}],
 steps:[
  {p:"انقر داخل الغرفة (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const ring=regionAt(regionLoops(),p[0],p[1]);
    if(!ring)throw new Error(
     "لا حلقة مغلقة تحيط بهذه النقطة — أغلق الجدران أوّلاً");
    const rd=roomDims(ring,{off:ovLen("roomdim","off")||1000});
    if(!rd)throw new Error("الغرفة أصغر من أن تُبعَّد (٣٠ سم)");
    rd.dims.forEach(d=>rec(ctx,addDim(d.kind,d.a,d.b,d.pos),"dims"));
    if(ovOn("roomdim","label"))
     rec(ctx,addText(rd.center,`${rd.sizeText} · ${rd.areaText}`,1,0,"mc"),
      "anno");
    H.rep("ok",`${rd.sizeText} م · ${rd.areaText} — بُعدان`
     +(ovOn("roomdim","label")?" وملصق":""));
    /* الصندوقُ ≠ الغرفة؟ فرقٌ فوق ٢٪ بين المساحة الفعلية وعرض×طول */
    const box=rd.w*rd.h;
    if(box>0&&Math.abs(box-rd.area)/box>0.02)
     H.rep("wr",`الغرفة ليست مستطيلة — العرض×الطول لصندوقها المحيط `
      +`(${(box/1e6).toFixed(2)} م²) والمساحة الفعلية ${rd.areaText}`);
   }}]});

/* ═══ نصّ ═══ */
defTool({
 id:"text", alias:"t نص", label:"نصّ",
 hint:"اكتب النصّ في الشريط ثم انقر موضعه · Enter ينهي",
 opts:[
  {k:"s",  label:"النصّ",type:"text",def:""},
  {k:"hm", label:"الحجم ×",type:"num",def:1},
  {k:"rot",label:"الدوران °",type:"num",def:0},
  {k:"al", label:"المحاذاة",type:"sel",
   items:[["bc","وسط"],["bl","يسار"],["mc","وسط أوسط"]],def:"bc"}],
 steps:[
  {p:"موضع النصّ (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const a=addText(p,ov("text","s"),ovNum("text","hm"),
     ovNum("text","rot"),ov("text","al"));
    rec(ctx,a,"anno");
    H.rep("ok",`${a.id} «${a.s}»`);
   }}]});

/* ═══ فقرةٌ ═══ §٣/١٤
   `نصّ` سطرٌ واحد، فالملاحظاتُ العامةُ على الورقة كانت تُكتَب سطراً
   سطراً بأيدي الناس وكلُّ تعديلٍ يُعيد ترتيبَها كلَّها. هنا عرضٌ
   ثابتٌ واللفُّ يُحسَب عند الرسم، ونقرتانِ تحدّدانِ العمودَ: موضعُه
   ثم عرضُه — فترى العرضَ ولا تكتبه رقماً تُخمّنه.
   و`\n` في حقل النصّ يبدأ سطراً صريحاً (بندٌ جديد). */
defTool({
 id:"mtext", alias:"mt فقره فقرة نص_فقرة", label:"فقرة",
 hint:"اكتب النصّ في الشريط · انقر موضعه ثم اسحب عرضَ العمود",
 opts:[
  {k:"s", label:"النصّ",type:"text",def:""},
  {k:"hm",label:"الحجم ×",type:"num",def:1},
  {k:"al",label:"المحاذاة",type:"sel",
   items:[["ar","يمين (عربيّ)"],["bl","يسار"]],def:"ar"}],
 steps:[
  {p:"الزاويةُ العليا للفقرة"},
  {p:"اسحب عرضَ العمود", base:0,
   each(ctx,p){
    const a0=ctx.pts[0];
    const w=Math.abs(p[0]-a0[0]);
    const at=[Math.min(a0[0],p[0]),a0[1]];
    const a=addMText(at,ov("mtext","s"),w,ovNum("mtext","hm"),
     ov("mtext","al"));
    rec(ctx,a,"anno");
    const n=mtLines(a).length;
    H.rep("ok",`${a.id} فقرةٌ بعرض ${m3(a.wid)} م · ${n} سطراً`);
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g)return [];
  const a0=ctx.pts[0];
  const w=Math.max(200,Math.abs(g[0]-a0[0]));
  const x0=Math.min(a0[0],g[0]);
  /* اللفُّ الحقيقيُّ في المعاينة: ترى الأسطرَ كما ستكون لا صندوقاً
     فارغاً — وهو ما يجعل سحبَ العرضِ قراراً مرئياً. */
  const h=txtH()*(ovNum("mtext","hm")||1);
  const lines=mtWrap(ov("mtext","s"),w,h);
  const step=h*MT_LEAD;
  const H2=step*lines.length;
  const o=[pvRect([x0,a0[1]-H2],[x0+w,a0[1]],YEL)];
  const right=(ov("mtext","al")!=="bl");
  lines.forEach((t,i)=>{
   if(t)o.push(pvText([right?x0+w:x0, a0[1]-step*(i+1)+h*0.28],t,GRN));
  });
  o.push(pvText([x0+w/2,a0[1]+h*0.6],
   `${m3(w)} م · ${lines.length} سطراً`,YEL));
  return o;
 }});

/* ═══ سهمُ ميلِ الصرف ═══ §٣ (أولوية منخفضة)
   كلُّ سطحٍ ودورةِ مياهٍ ومَمشًى خارجيٍّ يحتاج ميلاً مُعلَناً نحو
   مصرفٍ. وكان يُرسَم بخطٍّ وسهمٍ ونصٍّ منفصلَين — ثلاثةُ كياناتٍ لا
   رابطَ بينها، فإن نُقِل أحدُها تفرّقت.
   والنقرةُ الأولى الطرفُ الأعلى والثانيةُ المنحدَر: السهمُ يشير
   حيث يجري الماءُ، وهو العرفُ المعماريّ. */
defTool({
 id:"slope", alias:"sp ميل ميل_صرف انحدار", label:"سهم ميل",
 hint:"من الأعلى إلى المنحدَر — السهمُ يشير حيث يجري الماء",
 opts:[
  {k:"v",  label:"الميل ٪",type:"num",def:1,
   hint:"0.1–25٪ · ما دونها ماءٌ راكدٌ وما فوقها منحدَر"},
  {k:"fmt",label:"الصيغة",type:"sel",
   items:Object.keys(SLOPE_FMTS).map(k=>[k,SLOPE_FMTS[k]]),def:"pct"},
  {k:"hm", label:"الحجم ×",type:"num",def:1}],
 steps:[
  {p:"الطرفُ الأعلى"},
  {p:"طرفُ المنحدَر (حيث يجري الماء)", base:0,
   each(ctx,p){
    const a=addSlope([ctx.pts[0],p],ovNum("slope","v"),
     ov("slope","fmt"),ovNum("slope","hm"));
    rec(ctx,a,"anno");
    H.rep("ok",`${a.id} ميلٌ ${slopeStr(a)} على `
     +`${m3(Math.hypot(p[0]-ctx.pts[0][0],p[1]-ctx.pts[0][1]))} م`);
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g)return [];
  const a=ctx.pts[0];
  /* النسبةُ تُعرَض بصيغتها المختارةِ قبل الإنشاء: تختار «نسبة»
     فترى ١:١٠٠ لا ١٪ — فلا مفاجأةَ بعد النقر. */
  const fake={slope:ovNum("slope","v"),fmt:ov("slope","fmt")};
  const L=Math.hypot(g[0]-a[0],g[1]-a[1]);
  return [pvLine(a,g,YEL),
   pvText([(a[0]+g[0])/2,(a[1]+g[1])/2],
    `${slopeStr(fake)} · ${m3(L)} م`,GRN)];
 }});

/* ═══ قائد ═══ */
defTool({
 id:"lead", alias:"le قائد", label:"قائد",
 hint:"رأس السهم ثم كسرات ثم Enter · النصّ من الشريط",
 opts:[
  {k:"s", label:"النصّ",type:"text",def:""},
  {k:"hm",label:"الحجم ×",type:"num",def:1}],
 steps:[
  {p:"رأس السهم"},
  {p:"نقطة الكسر (Enter ينهي القائد)", loop:1, base:-1, min:1}],
 done(ctx){
  if(ctx.pts.length<2)return;
  const a=addLead(ctx.pts,ov("lead","s"),ovNum("lead","hm"));
  rec(ctx,a,"anno");
  H.rep("ok",`${a.id} قائد «${a.s}» · ${ctx.pts.length} نقطة`);
 },
 prev(ctx,g){
  const P=ctx.pts.concat(g?[g]:[]), o=[];
  for(let i=0;i<P.length-1;i++)o.push(pvLine(P[i],P[i+1],PNK));
  return o;
 }});

/* ═══ منسوب ═══ */
defTool({
 id:"level", alias:"lv منسوب", label:"منسوب",
 hint:"انقر الموضع · القيمة من الشريط · Enter ينهي",
 opts:[
  {k:"z",  label:"المنسوب م",type:"text",def:"0"},
  {k:"pre",label:"سابقة",   type:"text",def:"",hint:"مثل: ت.م"}],
 steps:[
  {p:"موضع المنسوب (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const raw=String(ov("level","z")||"0").trim();
    const neg=/^-/.test(raw);
    /* M() المتساهلة تعيد 0 لكل نصٍّ غير رقمي فيُنشأ «+0.000» بصمت —
       Mx تعيد null فنرفض قبل أي تعديل للحالة */
    const zz=Mx(raw.replace(/^-/,""));
    if(zz==null)throw new Error(`«${raw}» ليست قيمة منسوب صالحة`);
    const z=zz*(neg?-1:1);
    const a=addLevel(p,z,ov("level","pre"));
    rec(ctx,a,"anno");
    H.rep("ok",`${a.id} ${levelStr(a)}`);
   }}]});

/* ═══ محور ═══ */
defTool({
 id:"axis", alias:"ax محور", label:"محور",
 hint:"انقر موضع المحور · Enter ينهي",
 opts:[
  {k:"dir",label:"الاتجاه",type:"sel",
   items:[["x","رأسي (حرف)"],["y","أفقي (رقم)"]],def:"x"}],
 steps:[
  {p:"موضع المحور (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const d=ov("axis","dir");
    const v=addAxis(d,(d==="x")?p[0]:p[1]);
    dirty(ctx);
    const A=(d==="y")?S.grid.ys:S.grid.xs;
    H.rep("ok",`محور ${axLabel(d,A.indexOf(v))} على `
     +`${m3(v)} م · ${A.length} محوراً`);
   }}],
 prev(ctx,g){
  if(!g)return [];
  const d=ov("axis","dir"), L=9e5;
  return [(d==="x")
   ? pvLine([g[0],g[1]-L],[g[0],g[1]+L],YEL)
   : pvLine([g[0]-L,g[1]],[g[0]+L,g[1]],YEL)];
 }});

/* ═══ أبعاد المحاور ═══
   أمرٌ يُنفَّذ مرّة على S.grid: لكل جهةٍ تختارها سلسلةٌ واحدة قيَمُها
   الفروقُ بين المحاور المتجاورة كما هي في البيانات — لا تقريبَ ولا
   مطابقةَ هندسةٍ. والسلسلة كيانٌ عاديّ بعد ذلك: تحرّكها وتحرّرها
   وتحذفها كأيّ سلسلةٍ كتبتَها بيدك.
   الموضع من gridExtent نفسها التي ترسم البالونات، فلا تتقاطع
   السلسلةُ مع بالونةٍ ولا تنفصل عنها. */
/* ═══ مفاتيحُ الجهات ═══ P5-012
   كانت `left`/`right`. وهما الكلمتانِ الوحيدتانِ اللتانِ تنقلبان في
   RTL، فيقرؤهما حارسُ الاتجاه في dom.js إخفاقاً دائماً — وكان
   مُعفًى بإعفاءٍ موثَّق. صارتا `xmin`/`xmax`: تسميةٌ من مدى الرسم
   نفسِه (`E.x0`/`E.x1`) لا من جهةِ شاشة، فلا معنى لها يتغيّر باتجاه
   الواجهة ولا بديلَ منطقيٌّ تحتاجه.
   و`top`/`bot` بقيتا: المحورُ الكتليّ لا يُعكَس في RTL فلا غموضَ
   فيهما، وتغييرُهما يمسّ تفضيلاتِ المستخدمين بلا سبب.
   والمفتاحانِ يُخزَّنان في `civildraft.opts`، فالقديمُ يُهاجَر في
   `registry.js` ولا يفقد المستخدمُ اختيارَه. والملصقاتُ العربية كما
   هي: المستخدمُ يرى يسارَ الرسم ويمينَه لا أسماءَ المفاتيح. */
const SIDES=[["top","أعلى"],["bot","أسفل"],["xmin","يسار"],["xmax","يمين"]];
defTool({
 id:"griddim", alias:"gd ابعاد_المحاور قياسات_المحاور",
 label:"أبعاد المحاور",
 hint:"سلسلةُ أبعادٍ من تباعُد المحاور على الجهات التي تختارها · مثل: gd top=0 gap=1.5",
 /* ═══ الجهاتُ الأربعُ ضابطٌ واحدٌ ═══ المرحلة ٦
    حدُّ «ثلاثةٌ ظاهرةٌ» على **ما يُقرَأ** لا على عددِ المدخلات. وهذه
    الأربعُ تُقرأ سؤالاً واحداً: «على أيِّ الجهاتِ؟» — فعدُّها أربعةً
    كان سيُخرِج أداةً سليمةً عن الحدِّ، وتفريقُها ثلاثاً ظاهرةً ورابعةً
    وراءَ «المزيد» أسوأُ من إظهارِها كلِّها: جهةٌ منسيّةٌ في جيبٍ.
    فـ`grp` يجمعها ضابطاً مركَّباً واحداً يُعَدُّ واحداً. */
 opts:[
  {k:"top",  label:"أعلى", type:"chk",def:1,grp:"sides",grpLabel:"الجهات"},
  {k:"bot",  label:"أسفل", type:"chk",def:1,grp:"sides",grpLabel:"الجهات"},
  {k:"xmin", label:"يسار", type:"chk",def:1,grp:"sides",grpLabel:"الجهات"},
  {k:"xmax", label:"يمين", type:"chk",def:1,grp:"sides",grpLabel:"الجهات"},
  {k:"gap",  label:"الخلوص م",type:"len",def:"1.2",
   hint:"بُعد السلسلة عن بالونات المحاور"},
  {k:"total",label:"خطّ المجموع",type:"chk",def:1}],
 start(ctx){
  const X=S.grid.xs, Y=S.grid.ys;
  if(X.length<2&&Y.length<2){
   H.rep("wr","تحتاج محورين على الأقلّ في اتجاهٍ واحد — "
    +"استعمل أداة «محور»");
   return false;
  }
  const want=SIDES.filter(([k])=>ovOn("griddim",k)).map(([k])=>k);
  if(!want.length){
   H.rep("wr","لا جهةَ مختارة — أشّر جهةً واحدةً على الأقلّ");
   return false;
  }
  const gap=Math.max(0,ovLen("griddim","gap"));
  const tot=ovOn("griddim","total")?1:0;
  const E=gridExtent(null);
  const diffs=A=>A.slice(1).map((v,i)=>v-A[i]);
  /* جهةٌ ← [اتجاه السلسلة، المحاور، الموضع، قلبُ خطّ المجموع]
     أسفل الرسم ويمينه: «خارج» عكسُ الجهة الافتراضية فيُقلَب. */
  const PLAN={
   top:  ["h",X, E.y1+gap, 0],
   bot:  ["h",X, E.y0-gap, 1],
   xmin: ["v",Y, E.x0-gap, 0],
   xmax: ["v",Y, E.x1+gap, 1]};
  let made=0, skip=0;
  want.forEach(k=>{
   const [ax,A,pos,flip]=PLAN[k];
   if(A.length<2){skip++; return}
   const base=(ax==="h")?[A[0],pos]:[pos,A[0]];
   const c=addChain(ax,base,pos,diffs(A),tot,flip);
   rec(ctx,c,"chains");
   made++;
   H.rep("in",`${SIDES.find(s=>s[0]===k)[1]}: ${c.id} · `
    +`${diffs(A).length} حدّاً · ${fmtLen(chainSum(c))} م`);
  });
  H.rep(made?"ok":"wr",`${made} سلسلةً من `
   +`${X.length} محوراً رأسياً و${Y.length} أفقياً · `
   +`القيَم تباعُدُ المحاور كما هو`);
  if(skip)H.rep("in",`تُخطّي ${skip} جهةً اتجاهُها بأقلّ من محورين`);
  return false;                    /* أمر لحظي — لا خطوات */
 },
 steps:[]});

/* ═══ نصفُ القطرِ الحقيقيّ ═══ (حلقة «أقواس وزوايا وقياس» · المرحلة ٥)
   «نقطة على القوس» كانت تُقاس بُعداً من المركز إلى النقرة: نقرةٌ تبعد
   سنتيمترين عن الخطّ تُعطي نصفَ قطرٍ ناقصاً سنتيمترين بصمت. فإن كان
   للمركز قوسٌ أو عمودٌ دائريٌّ حقيقيّ وكانت النقرةُ قريبةً منه أُخذ
   نصفُ قطره هو بحرفه وقيل. */
function trueRadius(c,r){
 let best=null;
 const T=(cx,cy,R0,what)=>{
  if(Math.hypot(cx-c[0],cy-c[1])>5)return;
  const d=Math.abs(R0-r);
  if(d<=Math.max(150,R0*0.08)&&(!best||d<best.d))best={r:R0,d,what};
 };
 (S.walls||[]).forEach(w=>{if(isArc(w)){const P=arcParams(w); if(P)T(P.cx,P.cy,P.R,w.id)}});
 (S.cols||[]).forEach(k=>{if(k.kind==="circ")T(k.x,k.y,colW(k)/2,k.id)});
 return best;
}
const radStep=(ctx,p)=>{
 const c=ctx.pts[0];
 const r=Math.hypot(p[0]-c[0], p[1]-c[1]);
 if(r<10)throw new Error("نصف القطر أقل من 10 مم — انقر نقطةً أبعد عن المركز");
 const t=trueRadius(c,r);
 ctx.v.r=t?t.r:r;
 if(t&&t.d>0.5)H.rep("in",`نصفُ القطر من ${t.what} بحرفه: ${fmtLen(t.r)} م (النقرةُ على بُعد ${fmtLen(t.d)} م منه)`);
};
/* ═══ بُعد نصف قطر ═══
   مركز القوس · نقطة على القوس · موضع النصّ. المركز يُلتقَط بـcen
   (osnap.js). القيمة تُخزَّن r صريحةً لا مرتبطةً بالقوس. */
defTool({
 id:"dimrad", alias:"dra نصف_قطر", label:"بعد نصف قطر",
 hint:"مركز القوس · نقطة على القوس · موضع النصّ",
 steps:[
  {p:"مركز القوس (التقط cen)"},
  /* box:1 — النقطةُ على المحيط ليست امتداداً من المركز بالتعامد:
     كان يُسقطها على محورٍ فيقصر نصفُ القطر بصمت */
  {p:"نقطة على القوس", base:0, box:1,
   each(ctx,p){radStep(ctx,p)}},
  {p:"موضع النصّ", base:0, restart:1,
   each(ctx,p){
    const c=ctx.pts[0];
    const d=addDimRad(c,ctx.v.r,p);
    rec(ctx,d,"dims");
    H.rep("ok",`${d.id} R ${fmtLen(dimValue(d))} م`);
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g)return [];
  const c=ctx.pts[0];
  const r=ctx.v.r||Math.hypot(g[0]-c[0], g[1]-c[1]);
  const ang=Math.atan2(g[1]-c[1], g[0]-c[0]);
  const edge=[c[0]+Math.cos(ang)*r, c[1]+Math.sin(ang)*r];
  return [pvLine(c,edge,YEL), pvLine(edge,g,GRN)];
 }});

/* ═══ بُعد قطر ═══ */
defTool({
 id:"dimdia", alias:"ddi قطر", label:"بعد قطر",
 hint:"مركز الدائرة · نقطة على المحيط · موضع النصّ",
 steps:[
  {p:"مركز الدائرة (التقط cen)"},
  /* box:1 — النقطةُ على المحيط ليست امتداداً من المركز بالتعامد:
     كان يُسقطها على محورٍ فيقصر نصفُ القطر بصمت */
  {p:"نقطة على المحيط", base:0, box:1,
   each(ctx,p){radStep(ctx,p)}},
  {p:"موضع النصّ", base:0, restart:1,
   each(ctx,p){
    const c=ctx.pts[0];
    const d=addDimDia(c,ctx.v.r,p);
    rec(ctx,d,"dims");
    H.rep("ok",`${d.id} ⌀ ${fmtLen(dimValue(d))} م`);
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g)return [];
  const c=ctx.pts[0];
  const r=ctx.v.r||Math.hypot(g[0]-c[0], g[1]-c[1]);
  const ang=Math.atan2(g[1]-c[1], g[0]-c[0]);
  const e1=[c[0]+Math.cos(ang)*r, c[1]+Math.sin(ang)*r];
  const e2=[c[0]-Math.cos(ang)*r, c[1]-Math.sin(ang)*r];
  return [pvLine(e1,e2,YEL), pvLine(e1,g,GRN)];
 }});

/* ═══ بُعد زاويّ ═══
   رأس · نقطة على الضلع الأول · نقطة على الضلع الثاني. نصف قطر القوس
   يُشتقّ من طول الضلع الأول (٦٠٪ منه بين ٠.٨ و٤ م). */
defTool({
 id:"dimang", alias:"dan زاوي", label:"بعد زاوي",
 hint:"رأس الزاوية · نقطة على الضلع 1 · نقطة على الضلع 2",
 steps:[
  {p:"رأس الزاوية"},
  {p:"نقطة على الضلع الأول", base:0, box:1},
  {p:"نقطة على الضلع الثاني", base:0, box:1, restart:1,
   each(ctx,p){
    const vc=ctx.pts[0], p1=ctx.pts[1];
    const r=Math.max(800,
     Math.min(4000, Math.hypot(p1[0]-vc[0],p1[1]-vc[1])*0.6));
    const d=addDimAng(vc,p1,p,r);
    rec(ctx,d,"dims");
    H.rep("ok",`${d.id} ${dimValue(d).toFixed(1)}°`);
   }}],
 prev(ctx,g){
  if(!g)return [];
  if(ctx.pts.length===1)return [pvLine(ctx.pts[0],g,YEL)];
  if(ctx.pts.length===2)
   return [pvLine(ctx.pts[0],ctx.pts[1],"#6d7987"),
           pvLine(ctx.pts[0],g,GRN)];
  return [];
 }});

/* ═══ حقل حيّ ═══ المصدر المجهول يُرفَض عند الإنشاء برسالةٍ تسمّي صورته
   المقبولة — لا حقلُ «—» يُنشأ. */
const LVF=[["raw","خام"],["m","متر"],["m2","م²"],["mm","مم"]];
defTool({
 id:"livetext", alias:"lf حقل_حي نص_مشتق", label:"حقل حيّ",
 hint:"اكتب المصدر في الشريط ثم انقر موضعه · Enter ينهي",
 /* المرحلة ٦: المصدرُ والصيغةُ هما الحقلُ الحيُّ نفسُه، والدورانُ
    وضعُه. والسابقةُ واللاحقةُ والحجمُ زينةُ نصٍّ تُضبَط مرّةً — وراءَ
    «المزيد»، والنقطةُ تُنادي إن غُيِّرت فلا تُنسى. */
 opts:[
  {k:"src",label:"المصدر",type:"text",def:"meta:scale",
   hint:"مثل meta:scale · meta:wallH · area:A3:area · dim:D7:value · count:walls:count"},
  {k:"fmt",label:"الصيغة",type:"sel",items:LVF,def:"raw"},
  {k:"rot",label:"الدوران °",type:"num",def:0},
  {k:"pre",label:"سابقة",type:"text",def:""},
  {k:"suf",label:"لاحقة",type:"text",def:""},
  {k:"hm",label:"الحجم ×",type:"num",def:1}],
 steps:[
  {p:"موضع الحقل (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const f=addLive(String(ov("livetext","src")||"").trim(),p,{
     fmt:ov("livetext","fmt"), pre:ov("livetext","pre"),
     suf:ov("livetext","suf"), rot:ovNum("livetext","rot"),
     hm:ovNum("livetext","hm")});
    rec(ctx,f,"livefields");
    H.rep("ok",`${f.id} «${f.cached}» · ${f.src}`
     +(f.stale?" · متوسَّم قديماً (*)":""));
   }}]});

/* ═══ تحديث الحقول — الأمر الصريح الوحيد الذي يغيّر النصّ المشتقّ.
   يمرّ بـ edit() ⇒ خطوة تراجع واحدة، والفشل يُرجَع كلّه. وفحصٌ مسبق
   بلا كتابة يمنع خطوة تراجعٍ فارغة حين لا يتغيّر شيء. أمرٌ لحظيّ:
   يعيد false فلا يبقى في وضع أداة. */
defTool({
 id:"liverefresh", alias:"lvr حدث_الحقول حقل_حي_تحديث", label:"تحديث الحقول",
 hint:"يعيد حساب نصوص الحقول الحيّة وحدها — الغائب يبقى «—» متوسَّماً",
 own:1,
 start(){
  if(!(S.livefields||[]).length){
   H.rep("in","لا حقول حيّة في المشروع");
   return false;
  }
  if(!liveWouldChange()){
   H.rep("in","لا تغيير — النصوص محدَّثة");
   return false;
  }
  const r=edit(()=>refreshLive(),"تحديث الحقول الحيّة",{bump:"view"});
  if(r===undefined||editFailed()){
   H.rep("er","تعذّر تحديث الحقول — أُرجعت الحالة");
   return false;
  }
  H.rep(r.n?"ok":"in",
   `حُدِّث ${r.n} حقل`+(r.stale?` · ${r.stale} ما زال قديماً`:""));
  if(r.stale)
   H.rep("wr","الحقل المتوسَّم بعلامة * مصدرُه قديم أو غائب — "
    +"يُعاد حسابه عند زوال علّته أو إصلاح مصدره.");
  return false;
 },
 steps:[]});

/* ═══ جدولٌ على الورقة ═══ P-جديد (الأولوية ٧)
   جدولُ الأبواب والنوافذ وجدولُ المساحات كانا يُعرَضان في لوحٍ
   ويُصدَّران CSV وPDF — ولا يمكن وضعُ أحدهما في الرسم. وهو عنصرٌ
   إلزاميٌّ في التسليم المعماريّ.

   والصفوفُ حيّةٌ لا منسوخة: بابٌ يتغيّر عرضُه يتغيّر في الجدول فوراً.
   فلا أمرَ «حدّث الجدول» ولا جدولٌ يكذب على الرسم. */
defTool({
 id:"table", alias:"tb جدول جدول_فتحات", label:"جدول",
 hint:"انقر الموضع — الأصل أعلى يمين الجدول، وصفوفُه حيّة",
 opts:[
  {k:"kind",label:"النوع",type:"sel",
   items:()=>TBKINDS.map(k=>[k,TBK[k].n]), def:"open"},
  /* الافتراضُ ورقيٌّ يتبع المقياس (حلقة «مناسيب وميل وجداول» · المرحلة ٥):
     كان 20 م × 3 م ثابتاً — على 1:100 جدولٌ عرضُه 20 سم ونصُّه 14 مم، أضخمُ
     من المخطّط نفسِه وسبعةُ أضعاف نصّ الرسم. الفارغُ الآن 140 × 7 مم ورقيّاً. */
  {k:"w",  label:"العرض م",type:"len",def:"",
   hint:"فارغ = 140 مم ورقيّاً بمقياس الرسم"},
  {k:"rh", label:"ارتفاع الصفّ م",type:"len",def:"",
   hint:"فارغ = 7 مم ورقيّاً بمقياس الرسم"},
  /* لمفتاح الرموز وحدَه: مفتاحٌ شاملٌ أو لطبقةٍ واحدة (1.1.0 · د) */
  {k:"lay",label:"نطاق المفتاح",type:"sel",def:"",
   items:()=>[["","كلّ الطبقات"],["A-FIXT","صحّيات"],["A-FURN","أثاث"],
    ["A-ELEC","كهرباء"],["A-DOOR","أبواب"],["A-GLAZ","شبابيك"],
    ["A-COLS","أعمدة"],["A-BLKS","كتل"]]}],
 steps:[
  {p:"موضع الجدول — أعلى يمينه (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const kind=ov("table","kind")||"open";
    const t=addTable(kind,p,{w:tblW(),rh:tblRH(),lay:ov("table","lay")||""});
    rec(ctx,t,"tables");
    const z=tableSize(t);
    H.rep(z.nrows?"ok":"wr",
     `${t.id} ${tblName(t)} · ${z.nrows} صفّاً`
     +(z.nrows?" · الصفوفُ حيّةٌ تتبع الرسم"
       :" — لا صفوفَ بعد: ارسم ما يُجدَّل أولاً، والجدولُ يملأ نفسَه"));
   }}],
 prev(ctx,g){
  if(!g)return [];
  const kind=ov("table","kind")||"open";
  const w=tblW();
  const rh=tblRH();
  /* معاينةٌ بمقاسه الحقيقيّ: الصفوفُ تُقرأ حيّةً فترى ارتفاعَه
     الفعليَّ قبل أن تضعه */
  const z=tableSize({kind,x:g[0],y:g[1],w,rh,lay:ov("table","lay")||undefined});
  const P=[[g[0]-z.w,g[1]-z.h],[g[0],g[1]-z.h],
           [g[0],g[1]],[g[0]-z.w,g[1]]];
  const o=P.map((q,i)=>({t:"l",a:q,b:P[(i+1)%4],c:GRN}));
  for(let i=1;i<1+z.nrows+1;i++){
   const y=g[1]-z.rh*i;
   o.push({t:"l",a:[g[0]-z.w,y],b:[g[0],y],c:GRN});
  }
  o.push(pvText([g[0]-z.w/2,g[1]+z.rh*0.4],
   `${TBK[kind].n} · ${z.nrows} صفّاً`,GRN));
  return o;
 }});
