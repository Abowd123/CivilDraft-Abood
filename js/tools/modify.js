/* ═══ أدوات التعديل ═══
   كلّها تعمل على تحديد قائم أو على عناصر تنقرها صراحةً.
   لا حدود ضمنية ولا «كل الجدران» — تحدّد الحدّ بيدك.
   الفتحات تتبع النسخ افتراضاً، ويمنعها خيار في الشريط،
   والسجل يذكر عددها دائماً.

   النقل والنسخ والدوران والمرآة تعمل على الأنواع كلّها.
   والإزاحة والقطع والقصّ والتمديد والشدّ واللحم للجدران وحدها. */
import {snapshot,loadState,edit} from "../core/state.js";
import {m2,m3,mnum,clamp,norm,pt2,arrow,dim2} from "../core/units.js";
import {angOf} from "../core/coords.js";
import {wallById,dir,MINW} from "../core/walls.js";
import * as PLN from "../core/plines.js";
import {NAME,COLL,findById,pickEnts,delSay} from "../core/ents.js";
import {pickable} from "../core/layers.js";
import {FLD,readField,applyField} from "../core/batch.js";
import {grab,segsOf,moveAll,copyAll,rotP,rotateAll,mirrorAll,offsetWall,breakWall,trimWall,extendWall,stretchGrab,stretchApply,stretchPrev,arrayRect,arrayPolar,chamferPlan,chamferApply,alignPlan,alignAll,alignWhy,arrayPath,pathSamples,pathAt,filletPlan,filletApply,scaleAll,weldPlan,weldApply,WHY} from "../core/modify.js";
import {defTool,H,T,rec,dirty,finish,pushSteps,nextStep,
        ov,ovLen,ovNum,ovOn,pvLine,pvRect,pvBand,
        pvText} from "./registry.js";

import {instanceAt,explodeInstance} from "./blockops.js";
import * as BLKX from "../core/blocks.js";

const GRN="#5cd98e", YEL="#ffd06b", RED="#ff6f6f";
const OPTS_OPEN={k:"opens",label:"انسخ الفتحات",type:"chk",def:1};

/* التحديد المطلوب — يُقرأ مرّة عند بدء الأداة */
function needSel(ctx,msg,wallOnly){
 let L=H.sel();
 if(wallOnly)L=L.filter(s=>s.k==="wall");
 if(!L.length){
  H.rep("wr",msg||(wallOnly
   ? "حدّد جدراناً أولاً ثم نفّذ الأداة"
   : "حدّد عناصر أولاً ثم نفّذ الأداة"));
  return false;
 }
 ctx.v.list=L;
 ctx.v.G=grab(L);
 if(!ctx.v.G.length){
  H.rep("wr","لا عنصر قابل للتحويل — المخفيّ والمقفل خارج");
  return false;
 }
 return true;
}
const sayR=(r,verb)=>{
 const P=[`${r.walls} عنصر`];
 if(r.opens)P.push(`${r.opens} فتحة`);
 H.rep("ok",`${verb} ${P.join(" و ")}`);
 (r.refused||[]).slice(0,6).forEach(x=>H.rep("wr",
  `  رُفض ${x} — التحويل يفسد قياسه`));
 if((r.refused||[]).length>6)
  H.rep("in",`  … و ${r.refused.length-6} رفضاً آخر`);
};
/* ═══ نقل ═══ */
/* هادمة: تحرّك ما هو مرسوم سلفاً */
defTool({
 id:"move", alias:"m انقل", label:"نقل",
 destruct:1,
 hint:"نقطة أساس ثم وجهة — المحدّد وحده يتحرّك",
 opts:[],
 start(ctx){return needSel(ctx)},
 steps:[
  {p:"نقطة الأساس"},
  {p:"نقطة الوجهة أو الإزاحة", base:0,
   each(ctx,p){
    const a=ctx.pts[0];
    const n=moveAll(ctx.v.G,p[0]-a[0],p[1]-a[1]);
    dirty(ctx);
    H.rep("ok",`نُقل ${n} عنصر ${pt2([p[0]-a[0],p[1]-a[1]])} م`
     +` · الفتحات تبعت جدرانها`);
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g)return [];
  const a=ctx.pts[0], dx=g[0]-a[0], dy=g[1]-a[1];
  const o=[pvLine(a,g,YEL)];
  segsOf(ctx.v.G).forEach(s=>o.push(
   pvLine([s[0][0]+dx,s[0][1]+dy],[s[1][0]+dx,s[1][1]+dy],GRN)));
  return o;
 }});

/* ═══ نسخ ═══ */
/* ليست هادمة: تُنشئ نسخاً ولا تمسّ الأصل */
defTool({
 id:"copy", alias:"cp انسخ", label:"نسخ",
 hint:"نقطة أساس ثم نقطة لكل نسخة · Enter ينهي",
 opts:[
  {k:"n",label:"عدد النسخ",type:"num",def:1,hint:"لكل نقرة"},
  OPTS_OPEN],
 start(ctx){return needSel(ctx)},
 steps:[
  {p:"نقطة الأساس"},
  {p:"نقطة النسخة (Enter ينهي)", loop:1, base:0,
   each(ctx,p){
    const a=ctx.pts[0];
    const r=copyAll(ctx.v.G,p[0]-a[0],p[1]-a[1],
     Math.round(ovNum("copy","n"))||1, ovOn("copy","opens"));
    /* النسخ كائنات جديدة — تُسجَّل ليتراجع عنها Esc أو U */
    (r.made||[]).forEach(s=>rec(ctx,{id:s.id},COLL[s.k]));
    sayR(r,"نُسخ");
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g)return [];
  const a=ctx.pts[0], dx=g[0]-a[0], dy=g[1]-a[1];
  const n=clamp(Math.round(ovNum("copy","n"))||1,1,20);
  const o=[pvLine(a,g,YEL)];
  for(let i=1;i<=n;i++)
   segsOf(ctx.v.G).forEach(s=>o.push(pvLine(
    [s[0][0]+dx*i,s[0][1]+dy*i],[s[1][0]+dx*i,s[1][1]+dy*i],GRN)));
  return o;
 }});

/* ═══ دوران ═══ */
function applyRot(ctx){
 const c=ctx.pts[0];
 const d=(ctx.v.a1||0)-(ctx.v.a0||0);
 const r=rotateAll(ctx.v.G,c,d,ovOn("rotate","copy"),
  ovOn("rotate","opens"));
 if(ovOn("rotate","copy"))
  (r.made||[]).forEach(s=>rec(ctx,{id:s.id},COLL[s.k]));
 else dirty(ctx);
 H.rep("ok",`دُوِّر ${r.walls} عنصر ${d.toFixed(1)}°`
  +(r.opens?` · ${r.opens} فتحة`:"")
  +(ovOn("rotate","copy")?" (نسخة)":""));
 (r.refused||[]).forEach(x=>H.rep("wr",
  `  رُفض ${x} — البُعد الأفقي أو الرأسي لا يدور إلا بمضاعفات 90°`));
}
defTool({
 id:"rotate", alias:"ro دور تدوير", label:"دوران",
 destruct:1,
 hint:"نقطة الدوران ثم الزاوية · R للزاوية المرجعية",
 opts:[
  {k:"copy",label:"نسخة",type:"chk",def:0},
  OPTS_OPEN],
 start(ctx){return needSel(ctx)},
 steps:[
  {p:"نقطة الدوران"},
  {p:"الزاوية أو انقر الاتجاه", k:"a1", ang:1,
   opts:{r:{n:"مرجع",run(){
    pushSteps([
     {p:"الزاوية المرجعية",k:"a0",ang:1},
     {p:"الزاوية الجديدة",k:"a1",ang:1,each(c){applyRot(c)}}]);
    nextStep();
   }}},
   each(ctx){applyRot(ctx)}}],
 prev(ctx,g){
  if(!ctx.v.G||!ctx.pts.length||!g)return [];
  const c=ctx.pts[0];
  const a=angOf(c,g)-(ctx.v.a0||0);
  const o=[pvLine(c,g,YEL)];
  segsOf(ctx.v.G).forEach(s=>o.push(
   pvLine(rotP(s[0],c,a),rotP(s[1],c,a),GRN)));
  return o;
 }});

/* ═══ مرآة ═══ */
/* هادمة: «أبقِ الأصل» خيارٌ قد يُطفأ */
defTool({
 id:"mirror", alias:"mr مراه اعكس", label:"مرآة",
 destruct:1,
 hint:"نقطتان على محور المرآة · جهة فتح الأبواب تُقلَب",
 opts:[
  {k:"keep",label:"أبقِ الأصل",type:"chk",def:1},
  OPTS_OPEN],
 start(ctx){return needSel(ctx)},
 steps:[
  {p:"أول نقطة على محور المرآة"},
  {p:"ثاني نقطة على المحور", base:0,
   each(ctx,p){
    const keep=ovOn("mirror","keep");
    const r=mirrorAll(ctx.v.G,ctx.pts[0],p,keep,
     ovOn("mirror","opens"));
    if(keep)(r.made||[]).forEach(s=>rec(ctx,{id:s.id},COLL[s.k]));
    else dirty(ctx);
    H.rep("ok",`انعكس ${r.walls} عنصر`
     +(r.opens?` و ${r.opens} فتحة`:"")
     +(keep?" · بقي الأصل":""));
    (r.refused||[]).forEach(x=>H.rep("wr",
     `  رُفض ${x} — يحتاج محوراً قائماً أو قطرياً`));
   }}],
 prev(ctx,g){
  const P=ctx.pts;
  if(P.length===1&&g)return [pvLine(P[0],g,YEL)];
  if(P.length<2)return [];
  const a=P[0], b=P[1];
  const dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy);
  const o=[pvLine(a,b,YEL)];
  if(L<1)return o;
  const ux=dx/L, uy=dy/L;
  const M=p=>{
   const px=p[0]-a[0], py=p[1]-a[1], t=px*ux+py*uy;
   return [Math.round(a[0]+2*ux*t-px),Math.round(a[1]+2*uy*t-py)];
  };
  segsOf(ctx.v.G).forEach(s=>o.push(pvLine(M(s[0]),M(s[1]),GRN)));
  return o;
 }});

/* ═══ إزاحة ═══ */
/* ليست هادمة: تُنشئ موازياً ولا تمسّ الأصل */
defTool({
 id:"offset", alias:"of ازح موازي", label:"إزاحة",
 hint:"اختر جداراً ثم انقر الجهة · Enter ينهي",
 opts:[
  {k:"d",    label:"المسافة م",type:"len",def:"1"},
  {k:"clear",label:"صافية",    type:"chk",def:0,
   hint:"بين الوجهَين لا المحورين"},
  {k:"t",    label:"سماكة الجديد م",type:"len",def:"",
   hint:"فارغ = مثل الأصل"},
  OPTS_OPEN],
 steps:[
  {p:"اختر الجدار", ent:"wall", entName:"جدار", k:"w"},
  {p:"انقر الجهة (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const w=wallById(ctx.v.w.id);
    if(!w)throw new Error("الجدار غير موجود");
    const u=dir(w);
    if(!u)throw new Error("الجدار صفري");
    const sg=(u.nx*(p[0]-w.a[0])+u.ny*(p[1]-w.a[1]))>0?1:-1;
    const t=ovLen("offset","t");
    const r=offsetWall(w.id, ovLen("offset","d"), sg,
     ovOn("offset","clear"), t||null, null,
     ovOn("offset","opens"));
    rec(ctx,r.wall,"walls");
    /* السلسلة: الجديد يصير أصلاً للإزاحة التالية */
    ctx.v.w={k:"wall",id:r.wall.id};
    H.rep("ok",`${r.wall.id} موازٍ ${m2(r.d)} م `
     +`${ovOn("offset","clear")?"صافياً":"محورياً"}`
     +(r.opens?` · ${r.opens} فتحة`:"")
     +` · الأطراف لم تُلحَم — استعمل «لحم» إن أردت`);
   }}],
 prev(ctx,g){
  const s=ctx.v.w;
  if(!s||!g)return [];
  const w=wallById(s.id);
  if(!w)return [];
  const u=dir(w);
  if(!u)return [];
  const sg=(u.nx*(g[0]-w.a[0])+u.ny*(g[1]-w.a[1]))>0?1:-1;
  const t2=ovLen("offset","t")||w.t;
  const D=ovLen("offset","d")
   +(ovOn("offset","clear")?(w.t+t2)/2:0);
  const px=u.nx*sg*D, py=u.ny*sg*D;
  return [pvBand([w.a[0]+px,w.a[1]+py],[w.b[0]+px,w.b[1]+py],
   t2, GRN)];
 }});

/* ═══ قطع ═══ */
defTool({
 id:"break", alias:"br اقطع", label:"قطع",
 destruct:1,
 hint:"جدار ثم نقطة القطع · الفتحة العابرة تُحذَف ويُذكر عددها",
 opts:[],
 steps:[
  {p:"اختر الجدار", ent:"wall", entName:"جدار", k:"w"},
  {p:"نقطة القطع", base:"none", restart:1,
   each(ctx,p){
    const r=breakWall(ctx.v.w.id,p);
    rec(ctx,r.nw,"walls");
    H.rep(r.lost?"wr":"ok",
     `قُطع إلى ${m2(r.a)} + ${m2(r.b)} م → ${r.nw.id}`
     +(r.moved?` · ${r.moved} فتحة انتقلت`:"")
     +(r.lost?` · حُذفت ${r.lost} فتحة تعبر نقطة القطع`:""));
   }}],
 prev(ctx,g){
  const s=ctx.v.w;
  if(!s||!g)return [];
  const w=wallById(s.id);
  if(!w)return [];
  const u=dir(w);
  if(!u)return [];
  const t=clamp((g[0]-w.a[0])*u.ux+(g[1]-w.a[1])*u.uy,0,u.L);
  const q=[w.a[0]+u.ux*t, w.a[1]+u.uy*t];
  const h=Math.max(w.t,300);
  return [pvLine([q[0]+u.nx*h,q[1]+u.ny*h],
                 [q[0]-u.nx*h,q[1]-u.ny*h],RED)];
 }});

/* ═══ قصّ ═══ */
defTool({
 id:"trim", alias:"tr قص", label:"قصّ",
 destruct:1,
 hint:"حدّد الحدود بالنقر (Enter ينهي) ثم انقر الجزء المُزال",
 opts:[],
 steps:[
  {p:"انقر حدّاً (Enter ينهي التحديد)",
   ent:"wall", entName:"جدار", loop:1, min:1,
   each(ctx,hit){
    (ctx.v.cut=ctx.v.cut||[]).push(hit.id);
    H.rep("in",`${hit.id} حدّ قصّ · المجموع ${ctx.v.cut.length}`);
   }},
  {p:"انقر الجزء المراد إزالته",
   ent:"wall", entName:"جدار", loop:1,
   each(ctx,hit,p){
    const r=trimWall(hit.id,ctx.v.cut,p);
    dirty(ctx);
    const AR={start:"من البداية",end:"من النهاية",
     mid:"وسطاً — صار جدارين"};
    if(r.nw)rec(ctx,r.nw,"walls");
    H.rep(r.lost?"wr":"ok",
     `قُصّ ${hit.id} ${AR[r.mode]} · ${m2(r.cut)} م`
     +(r.lost?` · حُذفت ${r.lost} فتحة في المقطوع`:""));
   }}]});

/* ═══ تمديد ═══ */
defTool({
 id:"extend", alias:"ex مدد وسع", label:"تمديد",
 destruct:1,
 hint:"حدّد الحدود بالنقر (Enter ينهي) ثم انقر الطرف المُمَدّ",
 opts:[],
 steps:[
  {p:"انقر حدّاً (Enter ينهي التحديد)",
   ent:"wall", entName:"جدار", loop:1, min:1,
   each(ctx,hit){
    (ctx.v.bnd=ctx.v.bnd||[]).push(hit.id);
    H.rep("in",`${hit.id} حدّ · المجموع ${ctx.v.bnd.length}`);
   }},
  {p:"انقر الطرف المراد تمديده",
   ent:"wall", entName:"جدار", loop:1,
   each(ctx,hit,p){
    const r=extendWall(hit.id,ctx.v.bnd,p);
    dirty(ctx);
    H.rep("ok",`مُدّد ${hit.id} `
     +`${r.mode==="end"?"من النهاية":"من البداية"} · `
     +`+${m2(r.add)} م`);
   }}]});

/* ═══ شدّ ═══ */
defTool({
 id:"stretch", alias:"str شد", label:"شدّ",
 destruct:1,
 hint:"إطار يحوي الأطراف · ثم أساس ووجهة",
 opts:[],
 steps:[
  {p:"الزاوية الأولى لإطار الشدّ"},
  {p:"الزاوية المقابلة", base:0, box:1,
   each(ctx,p){
    const a=ctx.pts[0];
    const r={x0:Math.min(a[0],p[0]),y0:Math.min(a[1],p[1]),
             x1:Math.max(a[0],p[0]),y1:Math.max(a[1],p[1])};
    ctx.v.G=stretchGrab(r);
    if(!ctx.v.G.length)throw new Error("لا أطراف داخل الإطار");
    const both=ctx.v.G.filter(g=>g.a&&g.b).length;
    H.rep("in",`${ctx.v.G.length} جدار متأثّر`
     +(both?` · ${both} منها بطرفَيه (سينتقل كاملاً)`:""));
   }},
  {p:"نقطة الأساس", base:"none"},
  {p:"نقطة الوجهة أو الإزاحة", base:2,
   each(ctx,p){
    const b=ctx.pts[2];
    const n=stretchApply(ctx.v.G,p[0]-b[0],p[1]-b[1]);
    dirty(ctx);
    H.rep("ok",`شُدّ ${n} جدار ${pt2([p[0]-b[0],p[1]-b[1]])} م`
     +` · الفتحات لم تُمَسّ`);
   }}],
 prev(ctx,g){
  const P=ctx.pts;
  if(!g)return [];
  if(P.length===1)return [pvRect(P[0],g,GRN)];
  if(P.length===3&&ctx.v.G){
   const o=stretchPrev(ctx.v.G,g[0]-P[2][0],g[1]-P[2][1])
    .map(s=>pvLine(s[0],s[1],GRN));
   o.push(pvLine(P[2],g,YEL));
   return o;
  }
  return [];
 }});

/* ═══ خطّةُ اللحم تتبع التفاوت ═══ (مسحُ ما قبل المرحلة ٥، شقيقُ alignFresh)
   كانت تُحسَب عند البدء وحده: تغييرُ «التفاوت» بعدها لا يغيّر شيئاً حتى
   تُعاد الأداة. الآن تُعاد الخطّةُ وقائمتُها متى تغيّر. */
function weldFresh(ctx,first){
 const tol=ovLen("weld","tol"), key=String(tol);
 if(!first&&ctx.v.wKey===key)return false;
 ctx.v.wKey=key;
 const plan=ctx.v.plan=weldPlan(ctx.v.ids, tol);
 if(!plan.moves.length){
  H.rep("in",`لا طرف يحتاج لحماً عند تفاوت `
   +`${m2(plan.tol)} م · جرّب تفاوتاً أوسع`);
  return !first;
 }
 H.rep("wr",`${plan.moves.length} طرف سيتحرّك — راجع القائمة `
  +`ثم Enter للتأكيد أو Esc للإلغاء:`);
 plan.moves.slice(0,24).forEach(m=>H.rep("in",
  `  ${m.id}/${m.end}  ${m2(m.d)} م  `
  +arrow(pt2(m.from), pt2(m.to))
  +`  ${WHY[m.why]||m.why}`));
 if(plan.moves.length>24)
  H.rep("in",`  … و ${plan.moves.length-24} طرفاً آخر`);
 return !first;
}
/* ═══ لحم — معاينة ثم تأكيد ═══
   العقد يقول: لا يتحرّك إحداثيٌّ إلا بأمرك. فالخطة تُعرَض بالمليمتر
   قبل التنفيذ، والتنفيذ لا يتجاوزها. */
defTool({
 id:"weld", alias:"wl لحم", label:"لحم",
 destruct:1,
 hint:"يعرض ما سيتحرّك ثم ينتظر تأكيدك",
 opts:[{k:"tol",label:"التفاوت م",type:"len",def:"0.03"}],
 start(ctx){
  const L=H.sel().filter(s=>s.k==="wall");
  if(!L.length){
   H.rep("wr","حدّد جدرانَ اللحم أولاً — اللحم لا يعمل على الكل");
   return false;
  }
  ctx.v.ids=L.map(s=>s.id);
  weldFresh(ctx,true);
  /* بلا حركةٍ عند البدء تبقى الأداة: حقلُ «التفاوت» لا يظهر إلا وهي فعّالة،
     فرفضُها يجعل «جرّب تفاوتاً أوسع» طريقاً مسدوداً (شقيقُ عيب «سلسلة») */
  return true;
 },
 steps:[
  {p:"Enter يؤكّد اللحم · Esc يلغي", confirm:1,
   each(ctx){
    /* ما يُنفَّذ هو ما عُرض: تغييرُ التفاوت بعد العرض يُعيد العرضَ أولاً */
    if(weldFresh(ctx))throw new Error("تغيّر التفاوتُ بعد العرض — راجع القائمةَ الجديدة ثم Enter");
    if(!ctx.v.plan.moves.length)throw new Error("لا طرف يحتاج لحماً بهذا التفاوت — وسّعه أو Esc");
    const r=weldApply(ctx.v.plan);
    dirty(ctx);
    H.rep("ok",`لُحم ${r.moved} طرف`);
    if(r.short.length)
     H.rep("wr",`${r.short.length} جدار صار أقصر من الحدّ الأدنى `
      +`(${r.short.slice(0,6).join(" ")}) — لم يُحذَف، احذفه بيدك `
      +`إن شئت`);
   }}],
 prev(ctx){
  try{weldFresh(ctx)}catch(e){}
  const P=ctx.v.plan;
  if(!P)return [];
  /* السهم من الموضع الحالي إلى المخطَّط — تراه قبل التنفيذ */
  return P.moves.map(m=>pvLine(m.from,m.to,RED));
 }});

/* ═══ تحريرُ الخطّ المتعدّد ═══ §٣/١٠
   التصحيحُ كان حذفاً وإعادةَ رسمٍ من الصفر، وهو ما يجعل الناسَ
   يتجنّبون الخطَّ المتعدّدَ أصلاً. أربعُ عملياتٍ في أداةٍ واحدةٍ لأنّ
   المستخدمَ يفكّر «أُصلِح هذا الخطّ» لا «أُدرِج رأساً»: أربعُ أدواتٍ
   منفصلةٍ تعني أربعَ نقراتٍ في الشريط لعملٍ واحدٍ متّصل.

   والخطُّ يُنقَر مرّةً ويبقى هدفاً: تُصلِح أضلاعَه بنقراتٍ متتالية
   بلا إعادةِ اختيارٍ كلَّ مرّة — وهو عقدُ `pedit` في كلِّ برنامجٍ
   يعرفه المستخدم. وEnter يُنهي الجلسة.

   والتعديلُ **على مكانه**: المعرّفُ يبقى فالمجموعاتُ وما يشير إليه
   لا يُكسَر. */
defTool({
 id:"pedit", alias:"pe حرّر_الخطّ تحرير_الخط", label:"تحرير الخطّ المتعدّد",
 destruct:1,
 hint:"انقر الخطَّ ثم أضلاعَه — العمليةُ من الشريط · Enter يُنهي",
 opts:[
  {k:"op",label:"العملية",type:"sel",
   items:[["ins","أدرِج رأساً"],["del","احذف رأساً"],
    ["arc","اجعله قوساً"],["str","اجعله مستقيماً"]],def:"ins"},
  {k:"bg",label:"انحناء القوس",type:"num",def:0.5,
   hint:"±1 نصفُ دائرة · الإشارةُ تقلب الجهة"}],
 steps:[
  {p:"انقر الخطَّ المتعدّدَ المراد تحريره",
   ent:"pline", entName:"خطّ متعدّد", k:"pl",
   each(ctx,hit){
    ctx.v.id=hit.id;
    const pl=PLN.plineById(hit.id);
    H.rep("in",`${hit.id}: ${(pl&&pl.pts||[]).length} رأساً · `
     +`${PLN.plineSegs(pl)} ضلعاً — انقر ما تريد تعديله · Enter يُنهي`);
   }},
  {p:"انقر الضلعَ أو الرأسَ · Enter يُنهي", loop:1,
   each(ctx,p){
    const pl=PLN.plineById(ctx.v.id);
    if(!pl){H.rep("er","ذهب الخطّ — ربّما حُذِف"); return finish()}
    const op=ov("pedit","op");
    /* `edit` تبتلع الاستثناءَ وتُرجِع الحالةَ، فالسببُ يُلتقَط من
       داخل المعاملةِ ويُعاد رميُه: نفسُ نمطِ `atomic` في
       core/modify.js — ذرّيةٌ بلا إخفاءِ السبب. */
    let err="";
    const run=(fn,label)=>{
     edit(()=>{
      try{return fn()}
      catch(e){err=(e&&e.message)||String(e); throw e}
     },label);
     if(err)throw new Error(err);
    };
    try{
     if(op==="del"){
      const v=PLN.vertNearest(pl,p[0],p[1]);
      run(()=>PLN.delVert(pl,v.i),"حذف رأس");
      H.rep("ok",`حُذِف الرأس ${v.i+1} — بقي ${pl.pts.length} رأساً`);
     }else{
      const g=PLN.segNearest(pl,p[0],p[1]);
      if(!g){H.rep("wr","لا ضلعَ قريب"); return}
      if(op==="ins"){
       run(()=>PLN.insertVert(pl,g.i,p),"إدراج رأس");
       H.rep("ok",`أُدرِج رأسٌ في الضلع ${g.i+1} — `
        +`صار ${pl.pts.length} رأساً`);
      }else{
       const bg=(op==="str")?0:(+ovNum("pedit","bg")||0.5);
       run(()=>PLN.segBulge(pl,g.i,bg),"انحناء ضلع");
       H.rep("ok",(op==="str")
        ?`الضلع ${g.i+1} صار مستقيماً`
        :`الضلع ${g.i+1} صار قوساً بانحناء ${bg}`);
      }
     }
     dirty(ctx);
     rec(ctx,{id:pl.id},"plines");
    }catch(e){H.rep("er",e.message)}
   }}],
 prev(ctx,g){
  if(!ctx.v.id||!g)return [];
  const pl=PLN.plineById(ctx.v.id);
  if(!pl)return [];
  const op=ov("pedit","op");
  const o=[];
  /* رؤوسُ الخطِّ كلُّها مُعلَّمةٌ: ترى ما تحرّره لا ما تظنّه */
  const k=160;
  (pl.pts||[]).forEach(q=>{
   o.push(pvLine([q[0]-k,q[1]-k],[q[0]+k,q[1]+k],YEL));
   o.push(pvLine([q[0]-k,q[1]+k],[q[0]+k,q[1]-k],YEL));
  });
  if(op==="del"){
   const v=PLN.vertNearest(pl,g[0],g[1]);
   const q=pl.pts[v.i];
   if(q){
    const r=k*1.8;
    o.push(pvLine([q[0]-r,q[1]-r],[q[0]+r,q[1]+r],RED));
    o.push(pvLine([q[0]-r,q[1]+r],[q[0]+r,q[1]-r],RED));
    o.push(pvText([q[0],q[1]+r*1.6],`احذف الرأس ${v.i+1}`,RED));
   }
   return o;
  }
  const sg=PLN.segNearest(pl,g[0],g[1]);
  if(!sg)return o;
  const n=pl.pts.length;
  const a=pl.pts[sg.i], b=pl.pts[(sg.i+1)%n];
  if(!a||!b)return o;
  /* الضلعُ المستهدَفُ أخضرُ ليُعرَف أنّه هو لا جارُه */
  o.push(pvLine(a,b,GRN));
  o.push(pvText(labAt(a,b),
   (op==="ins")?`أدرِج في الضلع ${sg.i+1}`
   :(op==="str")?`سطِّح الضلع ${sg.i+1}`
   :`قوِّس الضلع ${sg.i+1}`,GRN));
  return o;
 }});

/* ═══ التسوية ═══ §٣/٨
   ستّةُ أعمدةٍ على خطٍّ واحد كانت ستَّ نقلاتٍ بالعين، والعينُ تخطئ
   بمليمتراتٍ تظهر في التصدير. سبعُ حالاتٍ لا أكثر، والخطّةُ تُعرَض
   شبحاً قبل التنفيذ كـ«كسر الركن»: ترى إلى أين يذهب كلُّ عنصرٍ
   قبل أن يذهب. */
/* ═══ خطّةُ التسوية تتبع الخيارات ═══ (كشفته حلقة «مصفوفة على مسار · تسوية»)
   كانت تُحسَب عند البدء وحده: تغييرُ «المحور» أو «المرجع» من الشريط بعدها
   يُبقي المعاينةَ والرسالةَ على القديم، وEnter ينفّذ الجديدَ بلا عرض.
   الآن تُعاد الخطّةُ ورسالتُها متى تغيّر الخيار. تُعيد true إن أُعيدت بعد البدء. */
function alignFresh(ctx,first){
 const ax=ov("align","ax"), md=ov("align","md"), key=ax+"|"+md;
 if(!first&&ctx.v.alKey===key)return false;
 ctx.v.alKey=key;
 const P=ctx.v.plan=alignPlan(ctx.v.G,ax,md);
 if(P.moves.length)H.rep("wr",`الخطّةُ معروضةٌ على المخطَّط — ${P.moves.length} من `
   +`${P.n} عنصراً تتحرّك ${alignWhy(P.mode)}`
   +(P.mode==="dist"?` بخطوة ${m3(Math.abs(P.step))} م`:"")
   +" · Enter يؤكّد وEsc يلغي");
 else H.rep("in",`العناصرُ مسوّاةٌ أصلاً ${alignWhy(P.mode)} — لا نقل`);
 return !first;
}
defTool({
 id:"align", alias:"al سوِّ تسويه تسوية وزّع", label:"تسوية",
 hint:"حدّد عنصرَين أو أكثرَ · اختر المحورَ والمرجع · Enter يؤكّد",
 opts:[
  {k:"ax",label:"المحور",type:"sel",
   items:[["x","أفقياً (س)"],["y","رأسياً (ص)"]],def:"x"},
  {k:"md",label:"المرجع",type:"sel",
   items:[["min","الأدنى"],["mid","الوسط"],["max","الأقصى"],
    ["dist","وزّع بتباعدٍ متساوٍ"]],def:"mid"}],
 start(ctx){
  if(!needSel(ctx))return false;
  /* الخطّةُ تُحسَب عند البدء: لا نقطةَ تُنقَر، فالعرضُ فوريّ */
  try{ alignFresh(ctx,true) }catch(e){
   H.rep("er",e.message);
   return false;
  }
  if(!ctx.v.plan.moves.length){
   H.rep("in",`العناصرُ مسوّاةٌ أصلاً ${alignWhy(ctx.v.plan.mode)} — لا نقل`);
   return false;
  }
  return true;
 },
 steps:[
  {p:"Enter يؤكّد التسوية · Esc يلغي", confirm:1,
   each(ctx){
    /* ما يُنفَّذ هو ما عُرض: إن تغيّر الخيارُ بعد العرض أُعيد العرضُ أولاً */
    if(alignFresh(ctx))throw new Error("تغيّر الخيارُ بعد العرض — راجع الخطّةَ الجديدة ثم Enter");
    const r=alignAll(ctx.v.G,ctx.v.plan.axis,ctx.v.plan.mode);
    dirty(ctx);
    ctx.v.G.forEach(g=>rec(ctx,{id:g.s.id},COLL[g.s.k]));
    H.rep("ok",`سُوّي ${r.moved} عنصراً `
     +`${alignWhy(r.plan.mode)} على المحور `
     +`${r.plan.axis==="x"?"الأفقيّ":"الرأسيّ"}`);
   }}],
 prev(ctx){
  try{alignFresh(ctx)}catch(e){}
  const P=ctx.v.plan;
  if(!P)return [];
  const X=(P.axis==="x");
  const o=[];
  /* خطُّ المرجعِ ممتدٌّ على مدى المحدَّد: تراه فتعرف إلى أين */
  if(P.target!=null){
   const sp=P.moves.map(m=>m.g.s).concat(ctx.v.G.map(g=>g.s));
   let lo=Infinity, hi=-Infinity;
   ctx.v.G.forEach(g=>{
    const a=anchorPt(g);
    if(!a)return;
    const v=X?a[1]:a[0];
    lo=Math.min(lo,v); hi=Math.max(hi,v);
   });
   if(isFinite(lo)){
    const pad=Math.max(600,(hi-lo)*0.15);
    o.push(X
     ?pvLine([P.target,lo-pad],[P.target,hi+pad],YEL)
     :pvLine([lo-pad,P.target],[hi+pad,P.target],YEL));
   }
  }
  /* سهمٌ من موضعِ كلِّ عنصرٍ إلى موضعه الجديد، ومقدارُ النقل عنده */
  P.moves.forEach(m=>{
   const a=anchorPt(m.g);
   if(!a)return;
   const b=X?[a[0]+m.d,a[1]]:[a[0],a[1]+m.d];
   o.push(pvLine(a,b,RED));
   o.push(pvText(b,`${m3(Math.abs(m.d))} م`,RED));
  });
  return o;
 }});
/* مركزُ صندوقِ عنصرٍ ملقوط — للمعاينة وحدها */
function anchorPt(g){
 const sh=H.box?H.box(g.s):null;
 if(sh)return [(sh.x0+sh.x1)/2,(sh.y0+sh.y1)/2];
 const o=g.o;
 if(o&&o.a&&o.b)return [(o.a[0]+o.b[0])/2,(o.a[1]+o.b[1])/2];
 if(o&&o.e&&isFinite(o.e.x))return [o.e.x,o.e.y];
 if(o&&Array.isArray(o.pts)&&o.pts.length){
  const b=o.pts.reduce((q,p)=>[Math.min(q[0],p[0]),Math.min(q[1],p[1]),
   Math.max(q[2],p[0]),Math.max(q[3],p[1])],
   [Infinity,Infinity,-Infinity,-Infinity]);
  return [(b[0]+b[2])/2,(b[1]+b[3])/2];
 }
 if(o&&Array.isArray(o.p))return o.p.slice();
 return null;
}

/* ═══ مصفوفةٌ على مسار ═══ §٣/٩
   المستطيلةُ والقطبيةُ موجودتان. والثالثةُ تلزم لأعمدةِ شرفةٍ منحنيةٍ
   أو بلاطِ ممشى. والمسارُ خطٌّ متعدّدٌ **قائمٌ يُنقَر** لا يُرسَم:
   المشروعُ يملك `pline` بأقواسِ bulge فالقوسُ مخدومٌ مجّاناً، وإعادةُ
   رسمِ مسارٍ موجودٍ عملٌ مكرَّرٌ وخطأٌ محتمل. */
defTool({
 id:"arraypath", alias:"arrpath مصفوفة_مسار على_مسار",
 label:"مصفوفة على مسار",
 hint:"حدّد العناصرَ ثم انقر خطّاً متعدّداً مساراً — التباعدُ بطول القوس",
 opts:[
  {k:"n",label:"العدد",type:"num",def:5},
  {k:"rot",label:"يتبع ميلَ المسار",type:"chk",def:0},
  OPTS_OPEN],
 start(ctx){return needSel(ctx)},
 steps:[
  {p:"انقر الخطَّ المتعدّدَ ليكون المسار",
   ent:"pline", entName:"خطّ متعدّد", k:"pl",
   each(ctx,hit){
    const pl=PLN.plineById(hit.id);
    if(!pl){H.rep("er","لم يُعثَر على المسار"); return}
    const r=arrayPath(ctx.v.G,pl,Math.round(ovNum("arraypath","n")),
     ovOn("arraypath","rot"), ovOn("arraypath","opens"));
    (r.made||[]).forEach(s=>rec(ctx,{id:s.id},COLL[s.k]));
    dirty(ctx);
    H.rep("ok",`${r.n} عنصراً على مسارٍ طوله ${m3(r.len)} م · `
     +`الخطوة ${m3(r.step)} م`
     +(r.closed?" (مغلقٌ فلا تتراكب الأخيرةُ على الأولى)":"")
     +(r.rot?" · تتبع الميل":"")
     +(r.opens?` · ${r.opens} فتحة`:""));
    if((r.refused||[]).length)
     H.rep("wr",`  لم تَتبع الميلَ: ${r.refused.join(" · ")} — `
      +"لا تدور إلّا بمضاعفات 90°");
   }}],
 prev(ctx,g){
  if(!ctx.v.G||!g)return [];
  const h=H.hit(g[0],g[1]);
  if(!h||h.k!=="pline")return [];
  const pl=PLN.plineById(h.id);
  if(!pl)return [];
  const SM=pathSamples(pl);
  if(SM.length<2)return [];
  const L=SM[SM.length-1].t;
  if(L<1)return [];
  const N=clamp(Math.round(ovNum("arraypath","n"))||2,2,200);
  const closed=(pl.closed===1&&(pl.pts||[]).length>2);
  const step=L/(closed?N:(N-1));
  const k=Math.max(120,L*0.012);
  const o=[];
  /* المسارُ نفسُه أصفرُ ليُعرَف أنّه هو المختار */
  for(let i=0;i+1<SM.length;i++)o.push(pvLine(SM[i].p,SM[i+1].p,YEL));
  /* وصليبٌ عند كلِّ موضعٍ: ترى التباعدَ قبل النسخ */
  for(let i=0;i<N;i++){
   const q=pathAt(SM,step*i);
   if(!q)continue;
   o.push(pvLine([q.p[0]-k,q.p[1]],[q.p[0]+k,q.p[1]],GRN));
   o.push(pvLine([q.p[0],q.p[1]-k],[q.p[0],q.p[1]+k],GRN));
  }
  /* عدَدٌ ومقدارٌ في نصٍّ واحدٍ يحتاج عزلاً: «5 × 2.4 م» تنقلب
     قراءتُها في سياقٍ عربيّ بلا bidi — dim2 تعزل الطرفين. */
  o.push(pvText(SM[Math.floor(SM.length/2)].p,
   dim2(N,`${m3(step)} م`),GRN));
  return o;
 }});

/* ═══ أرقامُ الخطّة على القماش لا في السجلّ ═══ §5
   كانت `chamfer` و`fillet` تطبعان خمسةَ أسطرٍ في السجلّ: المسافتان
   والباقيان والطولُ والزاويةُ والسماكة — فيقرأ المستخدمُ أرقاماً
   وينظرُ إلى شكلٍ بلا أرقام، ويقارنُ بينهما في رأسه. والشبحُ كان
   موجوداً أصلاً (خطوطٌ خضراءُ وحمراء) لكنّه أبكم.

   الآن الأرقامُ تُكتَب عند ما تَصِفُه: مسافةُ كلِّ قطعٍ عند منتصف
   قطعِه بالأحمر، وطولُ الضلعِ الجديد وزاويتُه عند منتصفه بالأخضر.
   والسجلُّ يبقى بسطرٍ واحدٍ لا خمسة: قارئُ الشاشة لا يرى القماشَ،
   فإلغاءُ النصِّ كلِّه كان سيُخفي العمليةَ عن من لا يبصرها (P5-005).

   والإزاحةُ عموديةٌ على ما تُعنوِنه بمقدارٍ ثابتٍ بوحدات الرسم: لا
   مقياسَ شاشةٍ في هذه الطبقة، فالثابتُ أصدقُ من حسابٍ كاذب. */
const LBOFF=420;
const midOf=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
/* منتصفٌ مُزاحٌ عمودياً — ولا يُزاح إن كان الطرفان نقطةً واحدة */
function labAt(a,b,k){
 const m=midOf(a,b);
 const dx=b[0]-a[0], dy=b[1]-a[1];
 const L=Math.hypot(dx,dy);
 if(L<1)return m;
 const o=LBOFF*(k==null?1:k);
 return [m[0]-dy/L*o, m[1]+dx/L*o];
}
/* عناوينُ خطّةِ الركن — تخدم «كسر» و«استدارة» معاً فلا نسختان
   تتفرّقان. `edge` نصُّ الضلعِ الجديد، و`cut` دالّةُ نصِّ كلِّ قطع. */
function cornerLabels(q,edge,cut){
 const o=[];
 [q.a,q.b].forEach(x=>{
  const t=cut(x);
  if(t)o.push(pvText(labAt(x.from,x.to),t,RED));
 });
 if(edge)o.push(pvText(labAt(q.a.to,q.b.to,-1),edge,GRN));
 return o;
}

/* ═══ كسرُ الركن — معاينةٌ ثم تأكيد ═══
   كاللحم: الخطّة تُعرَض بالمليمتر قبل التنفيذ، والتنفيذُ لا
   يتجاوزها. وانقر كلَّ جدارٍ في الجهة التي تريد إبقاءها. */
defTool({
 id:"chamfer", alias:"chm شطف كسر_الركن", label:"كسر الركن",
 destruct:1,
 hint:"انقر الجدارين في جهتهما المُبقاة — تُعرَض الخطّة ثم تنتظر",
 opts:[
  {k:"d", label:"المسافة م",       type:"len", def:"0.5"},
  {k:"d2",label:"مسافة الثاني م",  type:"len", def:"",
   hint:"فارغ = مثل الأولى"}],
 steps:[
  {p:"انقر الجدار الأول في جهته المُبقاة",
   ent:"wall", entName:"جدار", k:"w1",
   each(ctx,hit,p){ctx.v.p1=p}},
  {p:"انقر الجدار الثاني في جهته المُبقاة",
   ent:"wall", entName:"جدار", k:"w2",
   each(ctx,hit,p){
    const d=ovLen("chamfer","d");
    const pl=chamferPlan(ctx.v.w1.id,hit.id,d,
     ovLen("chamfer","d2")||d, ctx.v.p1, p);
    ctx.v.plan=pl;
    /* §5: الأرقامُ على القماش، والسجلُّ سطرٌ واحدٌ لمن لا يُبصره */
    H.rep("wr",`الخطّةُ معروضةٌ على المخطَّط — الضلعُ `
     +`${m3(pl.len)} م بزاوية ${pl.ang}° · Enter يؤكّد وEsc يلغي`);
   }},
  {p:"Enter يؤكّد كسرَ الركن · Esc يلغي", confirm:1,
   each(ctx){
    const r=chamferApply(ctx.v.plan);
    dirty(ctx);
    rec(ctx,r.wall,"walls");
    H.rep(r.lost?"wr":"ok",
     `${r.wall.id} ضلعُ الكسر ${m3(r.len)} م`
     +(r.lost?` · حُذفت ${r.lost} فتحة في المقطوع`:"")
     +` · طرفاه على طرفَي الجدارين تماماً`);
   }}],
 prev(ctx,g){
  /* §5: كلُّ رقمٍ عند ما يصفه. والمقطوعُ يُعلَن مَدَّه إن مُدَّ:
     «يُمَدّ» مفاجأةٌ لو بقيت في السجلّ وحده. */
  const draw=q=>[pvLine(q.a.to,q.b.to,GRN),
   pvLine(q.a.from,q.a.to,RED), pvLine(q.b.from,q.b.to,RED)]
   .concat(cornerLabels(q,
    `${m3(q.len)} م · ${q.ang}°`,
    x=>`${m3(x.d)} م`+(x.grow>0.5?` (+${m3(x.grow)} مَدّ)`:"")));
  if(ctx.v.plan)return draw(ctx.v.plan);
  /* قبل النقرة الثانية: الخطّةُ تُحسَب من الجدار تحت المؤشّر،
     فترى الركنَ قبل أن تنقره. والمتعذّرُ لا يُرسَم. */
  if(!ctx.v.w1||!g)return [];
  const h=H.hit(g[0],g[1]);
  if(!h||h.k!=="wall"||h.id===ctx.v.w1.id)return [];
  const d=ovLen("chamfer","d");
  return draw(chamferPlan(ctx.v.w1.id,h.id,d,
   ovLen("chamfer","d2")||d, ctx.v.p1, g));
 }});

/* ═══ استدارةُ الركن ═══
   توأمُ «كسر الركن» حرفاً بحرف: خطّةٌ تُعرَض ثم تنتظر Enter، والجهةُ
   المُبقاةُ من نقرتك. والفرقُ أنّ الضلعَ الجديد قوسٌ لا خطّ، فـ
   `filletPlan` تحسب bulge من اجتياح الوجهَين.

   والأداةُ كانت الحلقةَ المفقودة: `filletPlan`/`filletApply` في
   `core/modify.js` مكتملتانِ ومُختبَرتانِ في `fillet.test.js` منذ
   البداية، ولا مستوردَ لهما خارج الاختبار — قدرةٌ مدفوعةُ الثمن
   ومحجوبةٌ عن المستخدم. */
defTool({
 id:"fillet", alias:"fl استداره استدارة_الركن", label:"استدارة الركن",
 destruct:1,
 hint:"انقر الجدارين في جهتهما المُبقاة — تُعرَض الخطّة ثم تنتظر",
 opts:[
  {k:"r", label:"نصف القطر م", type:"len", def:"0.5",
   hint:"لا يصحّ أقلَّ من نصف سماكة الجدار"}],
 steps:[
  {p:"انقر الجدار الأول في جهته المُبقاة",
   ent:"wall", entName:"جدار", k:"w1",
   each(ctx,hit,p){ctx.v.p1=p}},
  {p:"انقر الجدار الثاني في جهته المُبقاة",
   ent:"wall", entName:"جدار", k:"w2",
   each(ctx,hit,p){
    const pl=filletPlan(ctx.v.w1.id,hit.id,ovLen("fillet","r"),
     ctx.v.p1, p);
    ctx.v.plan=pl;
    H.rep("wr",`الخطّةُ معروضةٌ على المخطَّط — القوسُ نصفُ قطره `
     +`${m3(pl.r)} م بزاوية ${pl.ang}° · Enter يؤكّد وEsc يلغي`);
   }},
  {p:"Enter يؤكّد الاستدارة · Esc يلغي", confirm:1,
   each(ctx){
    const r=filletApply(ctx.v.plan);
    dirty(ctx);
    rec(ctx,r.wall,"walls");
    H.rep(r.lost?"wr":"ok",
     `${r.wall.id} قوسُ الاستدارة نصفُ قطره ${m3(r.r)} م`
     +(r.lost?` · حُذفت ${r.lost} فتحة في المقطوع`:"")
     +` · طرفاه على طرفَي الجدارين تماماً`);
   }}],
 prev(ctx,g){
  /* الوترُ أخضرُ والمقطوعُ أحمر: القوسُ نفسُه لا يُرسَم شبحاً (لا
     أوّليةَ قوسٍ في المعاينة)، والوترُ يكفي لتبيُّن الموضع والجهة. */
  const draw=q=>[pvLine(q.a.to,q.b.to,GRN),
   pvLine(q.a.from,q.a.to,RED), pvLine(q.b.from,q.b.to,RED)]
   /* نصفُ القطر على الوتر بعلامة نق — الوترُ ليس القوسَ، فلا
      يُكتَب طولُه كأنّه طولُ القوس. */
   .concat(cornerLabels(q,`نق ${m3(q.r)} م · ${q.ang}°`,
    x=>`${m3(q.r)} م`));
  if(ctx.v.plan)return draw(ctx.v.plan);
  if(!ctx.v.w1||!g)return [];
  const h=H.hit(g[0],g[1]);
  if(!h||h.k!=="wall"||h.id===ctx.v.w1.id)return [];
  /* المتعذّرُ لا يُرسَم — كـchamfer */
  try{
   return draw(filletPlan(ctx.v.w1.id,h.id,ovLen("fillet","r"),
    ctx.v.p1, g));
  }catch(e){return []}
 }});

/* ═══ المقياس ═══
   العمليةُ الرابعةُ التي كانت ناقصة: نقلٌ ودورانٌ ومرآةٌ ولا مقياس.
   موحَّدٌ فقط، والمقاساتُ تُقاس معه، وارتفاعُ النصّ لا — الأسبابُ
   الثلاثةُ مشروحةٌ عند `scaleAll` في core/modify.js.

   والمعاملُ من نقرتَيك لا من حقلٍ وحده: المسافةُ المرجعيةُ ثم الجديدة
   فترى النسبةَ قبل أن تقع (كالمصفوفة). والحقلُ بديلٌ لمن يعرف الرقم. */
function applyScale(ctx,k){
 const c=ctx.pts[0];
 const r=scaleAll(ctx.v.G,c,k,ovOn("scale","copy"),
  ovOn("scale","opens"),ovOn("scale","keep"));
 if(ovOn("scale","copy"))
  (r.made||[]).forEach(s=>rec(ctx,{id:s.id},COLL[s.k]));
 else dirty(ctx);
 H.rep("ok",`قُيس ${r.walls} عنصر ×${r.k}`
  +(r.opens?` · ${r.opens} فتحة`:"")
  +(ovOn("scale","copy")?" (نسخة)":"")
  +(r.keep?" · السماكاتُ والفتحاتُ والقطعُ بمقاساتها":" · مقياسٌ منتظم: السماكاتُ تُقاس أيضاً"));
 (r.refused||[]).forEach(x=>H.rep("wr",
  `  رُفض ${x} — البُعدُ الزاويُّ ونصفُ القطر والقطرُ لا تُقاس`));
}
defTool({
 id:"scale", alias:"sc مقياس كبر صغر", label:"مقياس",
 destruct:1,
 hint:"نقطةُ الأساس ثم مسافةٌ مرجعيةٌ وجديدة · أو اكتب المعامل في الشريط",
 opts:[
  {k:"k",   label:"المعامل", type:"num", def:0,
   hint:"صفر = خُذه من النقرتين"},
  {k:"keep",label:"ثبّت المقاسات",type:"chk", def:1,
   hint:"السماكة والفتحات والأعمدة والقطع تبقى بمقاسها — المواضع والأطوال وحدها تُقاس"},
  {k:"copy",label:"نسخة",    type:"chk", def:0},
  OPTS_OPEN],
 start(ctx){return needSel(ctx)},
 steps:[
  {p:"نقطة الأساس — ما عليها لا يتحرّك",
   each(ctx){
    /* معاملٌ مكتوبٌ ⇒ خطوةٌ واحدةٌ وينتهي */
    const k=ovNum("scale","k");
    if(k>0){applyScale(ctx,k); finish()}   /* كان finish(ctx): يطبع «[object Object]» */
   }},
  {p:"المسافة المرجعية — انقر نقطةً على بُعدٍ تعرفه", base:0,
   each(ctx,p){
    const d=Math.hypot(p[0]-ctx.pts[0][0],p[1]-ctx.pts[0][1]);
    if(d<1)throw new Error("المسافةُ المرجعيةُ صفرٌ — انقر أبعدَ عن الأساس");
    ctx.v.d0=d;
    H.rep("in",`المرجع ${m3(d)} م — انقر الآن ما يصير إليه`);
   }},
  {p:"المسافة الجديدة", base:0,
   each(ctx,p){
    const d=Math.hypot(p[0]-ctx.pts[0][0],p[1]-ctx.pts[0][1]);
    applyScale(ctx,Math.round((d/ctx.v.d0)*1e4)/1e4);
   }}],
 prev(ctx,g){
  if(!ctx.v.G||!ctx.pts.length||!g)return [];
  const c=ctx.pts[0];
  if(!ctx.v.d0){
   /* قبل المرجع: خطُّ القياس وحده */
   return [pvLine(c,g,YEL)];
  }
  const d=Math.hypot(g[0]-c[0],g[1]-c[1]);
  const k=d/ctx.v.d0;
  if(!(k>0)||!isFinite(k))return [pvLine(c,g,YEL)];
  const M=q=>[c[0]+(q[0]-c[0])*k, c[1]+(q[1]-c[1])*k];
  const o=[pvLine(c,g,YEL),
   pvText(g,`×${(Math.round(k*100)/100)}`,YEL)];
  segsOf(ctx.v.G).forEach(sg=>o.push(pvLine(M(sg[0]),M(sg[1]),GRN)));
  return o;
 }});

/* ═══ تفكيكُ كتلة ═══
   مثيلُ الكتلة لا يُحدَّد ولا يُحذَف (ليس كياناً مسجَّلاً)، فالأداةُ
   تنقر الموضعَ وتبحث عنه بنفسها — الشرحُ الكاملُ عند `instanceAt`
   في tools/blockops.js. والمخرَجُ خطوطٌ متعدّدةٌ حقيقيةٌ تُحدَّد وتُحرَّك
   وتُحذَف كغيرها، فالتفكيكُ هو أيضاً المخرجُ الوحيدُ من كتلةٍ وُضِعت
   في الموضع الخطأ. */
defTool({
 id:"explode", alias:"x تفكيك فكك_كتله", label:"تفكيك كتلة",
 destruct:1,
 hint:"انقر كتلةً مُدرَجة — تصير خطوطاً متعدّدةً قابلةً للتعديل",
 steps:[
  {p:"انقر الكتلة المُدرَجة",
   each(ctx,p){
    const inst=instanceAt(p,300);
    if(!inst)throw new Error(
     "لا كتلةَ هنا — انقر على خطٍّ من كتلةٍ مُدرَجة. "
     +"ولا تعمل على الجدران ولا القطع (تلك كياناتٌ لا كتل)");
    const r=explodeInstance(inst);
    dirty(ctx);
    (r.made||[]).forEach(pl=>rec(ctx,pl,"plines"));
    H.rep(r.skipped?"wr":"ok",
     `فُكّت «${r.name}» إلى ${r.count} خطّاً متعدّداً`
     +(r.skipped?` · تُخطّيت ${r.skipped} أوّليةً لا تُمثَّل`:"")
     +" · الأقواسُ حُفظت أقواساً لا مضلّعات");
   }}],
 prev(ctx,g){
  /* ما تحت المؤشّر يُبرَز قبل النقر: أوّلياتُ المثيل وتراً وتراً */
  if(!g)return [];
  const inst=instanceAt(g,300);
  if(!inst)return [];
  const out=[];
  try{
   (BLKX.explode(inst)||[]).forEach(q=>{
    if(q.t==="line")out.push(pvLine(q.a,q.b,YEL));
    else if(q.t==="pline"){
     const P=q.pts||[];
     for(let i=0;i+1<P.length;i++)out.push(pvLine(P[i],P[i+1],YEL));
     if(q.closed&&P.length>2)out.push(pvLine(P[P.length-1],P[0],YEL));
    }else if(q.t==="arc"){
     const at=t=>[q.cx+q.r*Math.cos(t), q.cy+q.r*Math.sin(t)];
     const a0=(+q.a0||0)*Math.PI/180, a1=(+q.a1||0)*Math.PI/180;
     const n=16;
     for(let i=0;i<n;i++)
      out.push(pvLine(at(a0+(a1-a0)*i/n),
       at(a0+(a1-a0)*(i+1)/n),YEL));
    }
   });
  }catch(e){return []}
  return out;
 }});

/* ═══ المصفوفة المستطيلة ═══
   الأصلُ خليّةٌ في الشبكة، والتباعدُ من نقرتَيك لا من حقلٍ — فتراه
   قبل أن يقع. وتعمل على ما يعمل عليه «نسخ»: كلُّ الأنواع، والفتحةُ
   تتبع جدارها ولا تُنسَخ وحدها. */
defTool({
 id:"array", alias:"arr مصفوفه", label:"مصفوفة",
 hint:"أساسٌ ثم ركنُ الخليّة · الصفوفُ والأعمدةُ من الشريط",
 opts:[
  {k:"nx",label:"الأعمدة",type:"num",def:3},
  {k:"ny",label:"الصفوف", type:"num",def:1},
  OPTS_OPEN],
 start(ctx){return needSel(ctx)},
 steps:[
  {p:"نقطة الأساس"},
  {p:"ركن الخليّة (تباعد X و Y)", base:0, box:1,
   each(ctx,p){
    const a=ctx.pts[0];
    const r=arrayRect(ctx.v.G,
     Math.round(ovNum("array","nx")), Math.round(ovNum("array","ny")),
     p[0]-a[0], p[1]-a[1], ovOn("array","opens"));
    (r.made||[]).forEach(s=>rec(ctx,{id:s.id},COLL[s.k]));
    H.rep("ok",`${dim2(r.nx,r.ny)} · ${r.cells} خليّةً منسوخة · `
     +`${r.walls} عنصر`+(r.opens?` و ${r.opens} فتحة`:""));
    if(ctx.v.G.some(x=>x.s.k==="col"))
     H.rep("in","  وأوسامُ الأعمدة لا تُنسَخ — "
      +"استعمل «رقّم الأعمدة» على المحدَّد");
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g)return [];
  const a=ctx.pts[0], dx=g[0]-a[0], dy=g[1]-a[1];
  const NX=clamp(Math.round(ovNum("array","nx"))||1,1,100);
  const NY=clamp(Math.round(ovNum("array","ny"))||1,1,100);
  const S2=segsOf(ctx.v.G);
  const k=Math.max(120,Math.hypot(dx,dy)*0.05);
  const o=[pvLine(a,g,YEL)];
  let budget=700;                   /* المعاينةُ في كل إطار */
  for(let j=0;j<NY&&budget>0;j++)for(let i=0;i<NX&&budget>0;i++){
   if(!i&&!j)continue;
   const px=a[0]+dx*i, py=a[1]+dy*j;
   /* صليبٌ لكل خليّة: يُرى ولو كان المحدَّد بلا مسارات */
   o.push(pvLine([px-k,py],[px+k,py],YEL));
   o.push(pvLine([px,py-k],[px,py+k],YEL));
   budget-=2;
   S2.forEach(s=>{
    if(budget--<=0)return;
    o.push(pvLine([s[0][0]+dx*i,s[0][1]+dy*j],
                  [s[1][0]+dx*i,s[1][1]+dy*j],GRN));
   });
  }
  return o;
 }});

/* ═══ المصفوفة القطبية ═══
   نقرةٌ واحدةٌ: المركز. والعددُ والزاويةُ من الشريط، والخطوةُ
   تُقال في السجلّ فلا تُخمَّن. */
defTool({
 id:"arraypolar", alias:"arrp مصفوفه_قطبيه", label:"مصفوفة قطبية",
 hint:"انقر مركز الدوران — العددُ والزاويةُ من الشريط",
 opts:[
  {k:"n",    label:"عدد التكرارات",     type:"num",def:6},
  {k:"total",label:"الزاوية الإجمالية °",type:"num",def:360,
   hint:"٣٦٠ توزّع دورةً كاملة · وما دونها تمتدّ من الأصل إلى "
    +"آخر نسخة"},
  {k:"rot",  label:"دوّر النسخ",type:"chk",def:1,
   hint:"مطفأً يدور الموضعُ وتبقى الهيئة"},
  OPTS_OPEN],
 start(ctx){return needSel(ctx)},
 steps:[
  {p:"مركز الدوران",
   each(ctx,p){
    const r=arrayPolar(ctx.v.G,p, ovNum("arraypolar","total"),
     Math.round(ovNum("arraypolar","n")),
     ovOn("arraypolar","rot"), ovOn("arraypolar","opens"));
    (r.made||[]).forEach(s=>rec(ctx,{id:s.id},COLL[s.k]));
    H.rep("ok",`${r.n} تكراراً حول ${pt2(p)} م · الخطوة `
     +`${r.step}°${r.full?" (دورةٌ كاملة)":""} · ${r.walls} عنصر`
     +(r.opens?` و ${r.opens} فتحة`:""));
    (r.refused||[]).slice(0,6).forEach(x=>H.rep("wr",
     `  تُخطّي ${x} — لا يدور إلّا بمضاعفات 90°`));
    if((r.refused||[]).length>6)
     H.rep("in",`  … و ${r.refused.length-6} تخطّياً آخر`);
    if(ctx.v.G.some(x=>x.s.k==="col"))
     H.rep("in","  وأوسامُ الأعمدة لا تُنسَخ — "
      +"استعمل «رقّم الأعمدة» على المحدَّد");
   }}],
 prev(ctx,g){
  if(!g||!ctx.v.G)return [];
  const N=clamp(Math.round(ovNum("arraypolar","n"))||2,2,200);
  const T=ovNum("arraypolar","total")||0;
  const full=Math.abs(Math.abs(T)-360)<0.05;
  const st=T/(full?N:Math.max(1,N-1));
  const rot=ovOn("arraypolar","rot");
  const S2=segsOf(ctx.v.G);
  const o=[pvLine([g[0]-300,g[1]],[g[0]+300,g[1]],YEL),
           pvLine([g[0],g[1]-300],[g[0],g[1]+300],YEL)];
  let budget=700;
  for(let k=1;k<N&&budget>0;k++){
   const a=st*k;
   S2.forEach(s=>{
    if(budget--<=0)return;
    if(rot){
     o.push(pvLine(rotP(s[0],g,a),rotP(s[1],g,a),GRN));
     return;
    }
    /* بلا دوران: الموضعُ يدور والهيئةُ تبقى — والمرجعُ منتصفُ
       المسار، وهو مركزُ صندوقه في الجدار. */
    const an=[(s[0][0]+s[1][0])/2,(s[0][1]+s[1][1])/2];
    const q=rotP(an,g,a);
    const ddx=q[0]-an[0], ddy=q[1]-an[1];
    o.push(pvLine([s[0][0]+ddx,s[0][1]+ddy],
                  [s[1][0]+ddx,s[1][1]+ddy],GRN));
   });
  }
  return o;
 }});

/* ═══ مطابقة الخصائص ═══
   تقرأ حقول المصدر بـ readField ثم تكتبها بـ applyField، فتنالها
   المُثبِّتات نفسها: ما لا يملكه الهدف يُتخطّى، وما يُرفَض يُذكَر
   بسببه — لا كتابة عمياء.
   النصّ البديل للبُعد لا يُنسَخ افتراضاً: نسخُ رقمٍ يدويّ إلى بُعدٍ
   آخر يعرض مقاساً كاذباً بهيئة يقين. */
defTool({
 id:"match", alias:"ma مطابقه انسخ_الخصائص", label:"مطابقة",
 destruct:1,
 hint:"انقر المصدر ثم الأهداف من نوعه · Enter ينهي",
 opts:[{k:"txt",label:"انسخ النصّ البديل",type:"chk",def:0,
  hint:"للأبعاد — مطفأ لئلّا يُنسَخ رقمٌ يدويّ"}],
 steps:[
  {p:"انقر العنصر المصدر", ent:1, k:"src",
   each(ctx,hit){
    const K=hit.k;
    if(!FLD[K])
     throw new Error(`${NAME[K]||K} بلا حقول تُنسَخ`);
    const drop=ovOn("match","txt")?[]:["txt"];
    const F=[];
    FLD[K].forEach(f=>{
     if(drop.includes(f.k))return;
     const r=readField(K,[hit],f.k);
     if(!r.own)return;
     /* الطول يُقرأ مليمتراً ويُكتَب متراً — M() يفهم الرقم متراً */
     F.push({k:f.k,n:f.n,
      raw:(f.t==="len")?mnum(r.value):r.value});
    });
    if(!F.length)throw new Error(`${hit.id} بلا حقول يملكها`);
    ctx.v.kind=K; ctx.v.flds=F;
    H.rep("in",`المصدر ${hit.id} ${NAME[K]||K} · ${F.length} حقلاً: `
     +F.map(f=>f.n).join(" · "));
   }},
  {p:"انقر الهدف (Enter ينهي)", ent:1, loop:1,
   each(ctx,hit){
    const K=ctx.v.kind;
    if(hit.k!==K)
     throw new Error(`المصدر ${NAME[K]||K} — انقر ${NAME[K]||K} `
      +`مثله`);
    if(hit.id===ctx.v.src.id)
     throw new Error("هذا هو المصدر نفسه");
    let done=0;
    const ref=[];
    ctx.v.flds.forEach(f=>{
     try{
      const r=applyField(K,[hit],f.k,f.raw);
      if(r.done)done++;
      r.refused.forEach(x=>ref.push(`${f.n}: ${x.msg}`));
     }catch(e){ref.push(`${f.n}: ${e.message}`)}
    });
    if(done)dirty(ctx);
    H.rep(ref.length?"wr":"ok",
     `${hit.id} ← ${ctx.v.src.id} · ${done} من `
     +`${ctx.v.flds.length} حقلاً`);
    ref.slice(0,5).forEach(m=>H.rep("er","  "+m));
    if(ref.length>5)H.rep("in",`  … و ${ref.length-5} رفضاً آخر`);
   }}]});

/* ═══ قسمة الجدار ═══
   قطعٌ متكرّر عند نقاطٍ محسوبة على مسار الأصل — بعقد breakWall
   نفسها: الفتحة العابرة نقطة القطع تُحذَف ويُذكَر عددها، والباقية
   تنتقل بموضعها معادَ القياس من البداية الجديدة. */
defTool({
 id:"divide", alias:"dv اقسم قسمه", label:"قسمة",
 destruct:1,
 hint:"اختر جداراً — يُقسَم أجزاءً متساوية · Enter ينهي",
 opts:[{k:"n",label:"عدد الأجزاء",type:"num",def:2}],
 steps:[
  {p:"اختر الجدار المقسوم", ent:"wall", entName:"جدار", loop:1,
   each(ctx,hit){
    const n=clamp(Math.round(ovNum("divide","n"))||2,2,40);
    const w=wallById(hit.id);
    if(!w)throw new Error("الجدار غير موجود");
    const u=dir(w);
    if(!u)throw new Error("الجدار صفري");
    const seg=u.L/n;
    if(seg<MINW)
     throw new Error(`الجزء ${m3(seg)} م — الأدنى ${m3(MINW)} م · `
      +`الأقصى ${Math.floor(u.L/MINW)} جزءاً`);
    const A=w.a.slice();
    const sn=snapshot();
    let cur=hit.id, lost=0, moved=0;
    try{
     for(let i=1;i<n;i++){
      const r=breakWall(cur,
       [Math.round(A[0]+u.ux*seg*i), Math.round(A[1]+u.uy*seg*i)]);
      rec(ctx,r.nw,"walls");
      lost+=r.lost; moved+=r.moved;
      cur=r.nw.id;
     }
    }catch(e){
     loadState(JSON.parse(sn),false);
     throw e;
    }
    H.rep(lost?"wr":"ok",
     `قُسِم ${hit.id} إلى ${dim2(n,m3(seg),"م")}`
     +(moved?` · ${moved} فتحة انتقلت`:"")
     +(lost?` · حُذفت ${lost} فتحة تعبر نقاط القطع`:"")
     +` · الأطراف لم تُلحَم`);
   }}],
 prev(ctx,g){
  if(!g)return [];
  const h=H.hit(g[0],g[1]);
  if(!h||h.k!=="wall")return [];
  const w=wallById(h.id), u=w&&dir(w);
  if(!u)return [];
  const n=clamp(Math.round(ovNum("divide","n"))||2,2,40);
  const seg=u.L/n, t=Math.max(w.t,300), o=[];
  const c=(seg<MINW)?RED:GRN;
  for(let i=1;i<n;i++){
   const q=[w.a[0]+u.ux*seg*i, w.a[1]+u.uy*seg*i];
   o.push(pvLine([q[0]+u.nx*t,q[1]+u.ny*t],
                 [q[0]-u.nx*t,q[1]-u.ny*t],c));
  }
  return o;
 }});

/* ═══ تحديد بالمعرّف ═══
   أدوات التعديل تقرأ تحديداً قائماً، ولم يكن للتحديد طريقٌ إلا
   الفأرة. هذه تُكملها: تحدّد بالكتابة ثم تنقل أو تنسخ. */
/* ليست هادمة: تقرأ وتكتب في التحديد ولا تمسّ هندسةً */
defTool({
 id:"sel", alias:"se اختر تحديد", label:"تحديد بالمعرّف",
 hint:"W3 · O5 · -K2 يزيل · «الكل» · Enter ينهي",
 opts:[],
 steps:[{p:"معرّف عنصر (Enter ينهي)", text:1, loop:1,
  each(ctx,tok){
   const t=String(tok||"").trim();
   if(!t)return;
   if(/^(الكل|كلها|all)$/.test(norm(t))){
    const L=pickEnts();
    H.setSel(L);
    H.rep("ok",`${L.length} عنصر محدَّد`);
    return;
   }
   const neg=/^-/.test(t);
   const f=findById(t.replace(/^[-+]/,""));
   if(!f)throw new Error(`لا عنصر بالمعرّف «${t}»`);
   if(!pickable(f))throw new Error(`${f.id} مخفيّ أو مقفل`);
   const L=H.sel().filter(x=>!(x.k===f.k&&x.id===f.id));
   if(!neg)L.push(f);
   H.setSel(L);
   H.rep("in",`${neg?"أُزيل":"أُضيف"} ${f.id} `
    +`${NAME[f.k]||f.k} · المجموع ${L.length}`);
  }}]});

/* ═══ حذف ═══
   كان الحذف مفتاحاً في app.js وفعلاً في القائمة السياقية وحدهما:
   لا سطر إدخال يحذف، ولا خطّة مساعدٍ تحذف، ولا لوحة أوامر تجده.
   إدخاله السجلّ يُنيله ما ينال بقيّة الأوامر — اسمٌ يُكتَب، وعلَمٌ
   هادم تقرؤه البوّابة، وموضعٌ في الشريط.

   والتنفيذ يُفوَّض إلى delSel نفسه: لا منطق حذفٍ ثانٍ يتخلّف عن
   الأول. وهو يمرّ بـ edit() فيدير لقطته وتاريخه — فلا dirty(ctx)
   هنا، وإلّا دُفعت خطوتا تراجعٍ لعمليةٍ واحدة. */
defTool({
 id:"del", alias:"احذف امسح حذف", label:"حذف",
 destruct:1, own:1,       /* start يفوّض إلى edit() — معاملته الخاصة */
 hint:"يحذف التحديد القائم · Ctrl+Z يستعيده",
 opts:[],
 start(ctx){
  if(!H.sel().length){
   H.rep("wr","حدّد عناصر أولاً — الحذف يقع على التحديد");
   return false;
  }
  const r=H.del();
  if(!r){
   H.rep("wr","لم يُحذف شيء — المخفيّ والمقفل خارج التحديد");
   return false;
  }
  H.rep("ok","حُذف "+delSay(r)
   +(r.skipped?` · تُخطّي ${r.skipped}`:""));
  return false;                    /* أمر لحظي — لا خطوات */
 },
 steps:[]});
