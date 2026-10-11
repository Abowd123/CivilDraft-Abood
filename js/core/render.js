/* ═══ المشهد ═══
   قائمةُ أوّلياتٍ واحدة يقرأها الرسم والتصدير والفاحص، فلا يفترق
   ما يُرى عمّا يُصدَّر. ولا رسمَ هنا: هذا الملفّ لا يعرف قماشاً ولا
   سياقاً ولا لوناً — الهيئة في io/style.js.

   ═══ ولا بنّاءَ أوّلياتٍ هنا كذلك ═══
   الرمزُ يسكن مع كيانه: openPrims في opens.js وcolPrims في cols.js
   وstPrims في stairs.js وgridPrims في dims.js. وبناءُ نسخةٍ ثانية
   هنا كان يُنتِج أربع خسائر: عمودٌ يُرسَم حدُّه فوق صمته المدمَج،
   وبابٌ مزدوجٌ بمصراعٍ واحد، وثلاثةُ أنواعِ فتحاتٍ على طبقةٍ تخالف
   طبقةَ كيانها (فتُخفى ولا تختفي)، وعلاماتُ العطب لا تُرسَم أصلاً.

   ═══ الترتيب جدولٌ مُعلَن ═══
   كان ترتيبُ الطلاء ضمنياً في تسلسل الأسطر داخل scene: لا يُقرأ
   ولا يُختبَر ولا يُكاش جزءاً جزءاً. وصيرورتُه بياناتٍ (BANDS) هي
   ما يجعل التجزيء ممكناً بلا تغييرٍ في ما يُطلى — فالمناطق تحت
   الجدران وهي «عرض» والجدران «هندسة»، والتجزيء بالنوع وحده
   يقلبهما.

   ═══ ولكلّ نطاقٍ مفتاحه ═══
   سحبُ بُعدٍ كان يعيد بناء أوراق الأبواب ونقوش الهاشور ونتوءات
   الدرج وستّين ألف أوّليةٍ مرجعية — في كل إطار. وبعد اليوم يُعاد
   بناء ما تغيّر مفتاحُه وحده.

   والمفاتيح آمنةٌ لأن touch يُقدّم VER.g (الدفعة ٨أ): من نسي أن
   يُعلن نوع تعديله يخسر أداءً لا صحّة. ومع ذلك أُدرِجت خياراتُ
   العرض في المفتاح صريحاً (optKey) فلا يتّكل النطاق على افتراض. */
import {S,VER,txtH,refVersion} from "./state.js";
import {levelOf,levelScope,levelBelow} from "./level.js";
import {bboxOf,bboxUnion,bandPoly,rectPoly,circPoly,polyBool,PERF as GP} from "./geom.js";
import {band,centerLine,dir,isLow,isArc} from "./walls.js";
import {span,depOf,badOpens,badPrims,openPrims,
        okOf} from "./opens.js";
import {areaPrims,staleCount} from "./areas.js";
import {dimPrims,chainPrims,annoPrims,gridPrims,looseDims,
        isOverridden} from "./dims.js";
import {fixPrims} from "./fixt.js";
import {stPrims} from "./stairs.js";
import {strPrims} from "./struct.js";
import {roofPrims} from "./roof.js";
import {plinePrims} from "./plines.js";
import {cloudPrims} from "./clouds.js";
import {tablePrims,setLegendUsage} from "./tables.js";
import {calloutPrims} from "./callouts.js";
import {livePrims,staleLiveCount} from "./live.js";
import {colPrims} from "./cols.js";
import {refPrims} from "./ref.js";
import {sheetPrims} from "./sheet.js";
import {explode} from "./blocks.js";
import {BLK_LAY} from "./laydef.js";
import {vis,plots,hiddenCount,layVer} from "./layers.js";
import {bump,bumpMs} from "./perf.js";

const R=v=>Math.round(v);

/* ═══ صندوق الأوّليات ═══
   القوس: كان صندوقُ الدائرة كاملةً حتى لتسعين درجة واحدة —
   يُقاس الآن بنقطتي الطرفين + extrema (0/90/180/270) الواقعة
   داخل مدى القوس فعلاً؛ فقط. والدائرة الكاملة (٣٦٠°) تستثني
   الأربع كلّها.

   النصّ: قياسُه الحقيقيّ يحتاج قماشاً، وopt.measureText يتيح
   حَقنَه (مثلاً من canvas.measureText) — وحين يغيب يُقدَّر عرضاً
   كما كان، والتقدير يزيد ولا ينقص فلا يُقصّ نصٌّ في التصدير.
   والصندوق الآن يحترم المحاذاة (al) والدوران (rot) بدل افتراض
   توسّطٍ غير مدوَّر دائماً. */
export function primsBBox(list,opt){
 const measure=(opt&&opt.measureText)||null;
 const P=[];
 (list||[]).forEach(g=>{
  if(!g)return;
  if(g.t==="line"){P.push(g.a,g.b); return}
  if(g.t==="poly"){(g.pts||[]).forEach(p=>P.push(p)); return}
  if(g.t==="fill"){(g.ring||[]).forEach(p=>P.push(p)); return}
  if(g.t==="hatch"){
   (g.loops||[]).forEach(l=>(l||[]).forEach(p=>P.push(p)));
   return;
  }
  if(g.t==="arc"){
   const r=Math.abs(g.r)||0;
   if(r<0.1)return;
   const a0=g.a0||0, a1=g.a1||0;
   const rd=a=>a*Math.PI/180;
   /* الاجتياح موقَّع بعلامته: السالبُ كان يُطبَّع إلى «360−|sw|»
      فيتّسع صندوقُ قوسِ 90° سالبٍ إلى صندوقِ دائرته الكاملة.
      وزوايا القصوى (0/90/180/270) تُفحَص في اتجاه الاجتياح نفسه:
         موجب: d > 0  و d < sweep
         سالب: d > 360+sweep  و d < 360  (sweep سالبٌ هنا) */
   const sweep=a1-a0;
   const full=Math.abs(sweep)>=359.9;
   if(full){
    /* الدائرة الكاملة: الطرفان يقعان في نقطةٍ واحدة، فبلا قصوى
       صريحةٍ ينحلّ الصندوقُ إلى صفر */
    P.push([g.cx+r,g.cy],[g.cx-r,g.cy],
           [g.cx,g.cy+r],[g.cx,g.cy-r]);
    return;
   }
   P.push([g.cx+r*Math.cos(rd(a0)), g.cy+r*Math.sin(rd(a0))]);
   P.push([g.cx+r*Math.cos(rd(a1)), g.cy+r*Math.sin(rd(a1))]);
   [0,90,180,270].forEach(ang=>{
    const d=((ang-a0)%360+360)%360;
    const hit=sweep>=0 ? (d>0&&d<sweep) : (d>360+sweep&&d<360);
    if(hit)
     P.push([g.cx+r*Math.cos(rd(ang)), g.cy+r*Math.sin(rd(ang))]);
   });
   return;
  }
  if(g.t==="text"){
   let w,h;
   if(measure){
    const m=measure(String(g.s==null?"":g.s),g.h,g.rot);
    w=(m&&m.w)||1; h=(m&&m.h)||g.h;
   }else{
    w=Math.max(1,String(g.s==null?"":g.s).length)*g.h*0.62;
    h=g.h;
   }
   const al=g.al||"";
   const isL=/l$/.test(al), isR=/r$/.test(al), isM=/^m/.test(al);
   let x0=isL?g.x:(isR?g.x-w:g.x-w/2);
   let x1=isL?g.x+w:(isR?g.x:g.x+w/2);
   let y0=isM?g.y-h/2:g.y-h*0.85;
   let y1=isM?g.y+h/2:g.y+h*0.15;
   if(g.rot){
    const ca=Math.cos(g.rot*Math.PI/180), sa=Math.sin(g.rot*Math.PI/180);
    [[x0,y0],[x1,y0],[x1,y1],[x0,y1]].forEach(p=>{
     const dx=p[0]-g.x, dy=p[1]-g.y;
     P.push([g.x+dx*ca-dy*sa, g.y+dx*sa+dy*ca]);
    });
   }else{
    P.push([x0,y0],[x1,y1]);
   }
  }
 });
 return bboxOf(P);
}
/* ═══ التصفية ═══
   المخفيّ ليس في المشهد: لا يُرسَم ولا يُصدَّر ولا يدخل الصندوق.
   وما لا يُطبَع يبقى — يُرى على الشاشة ويُستثنى عند الهيئة. */
export const filterPrims=list=>
 (list||[]).filter(g=>g&&vis(g.L||"0"));

/* ═══ المحاور المدمجة ═══
   جداران متّصلان على استقامةٍ واحدة بسماكةٍ واحدة يصيران محوراً
   واحداً، فلا يظهر خطُّ الوصل بينهما. والدمج عرضٌ لا تعديل: البيانات
   تبقى جدارَين، ويُلغى بخيار S.opt.joins.

   ويعيد lo/hi على المحور لا نقطتين وحدهما: طرحُ الفتحات يقع على
   المحور المدمج، فيحتاج إحداثياً واحداً يُقاس عليه. */
const centerPt=(g,s)=>[R(g.u[0]*s+g.n[0]*g.off), R(g.u[1]*s+g.n[1]*g.off)];
/* نقطتا جسم المحور عند طرفٍ ما — على بُعد نصف السماكة يميناً ويساراً
   من الطرف، على المحور الحقيقي (بعد المحاذاة). */
const endCorners=(g,end)=>{
 const c=centerPt(g,(end==="lo")?g.lo:g.hi), h=g.t/2;
 return [[c[0]+g.n[0]*h,c[1]+g.n[1]*h],[c[0]-g.n[0]*h,c[1]-g.n[1]*h]];
};
/* ═══ لحمُ الأركان ═══
   محوران يلتقيان بزاويةٍ (لا استقامة) عند طرفَي مسارهما الأصليَّين
   يترك اتحادُ جسميهما ثلمةً في الركن الخارجي: كلُّ جسمٍ يقف عند
   الطرف، فلا يغطّي أحدُهما نتوء الركن الذي وراء الآخر. وحجمُ الثلمة
   يتغيَّر بالمحاذاة (مركزية أو على وجه)، فلا يكفيها رقمٌ ثابت.

   والحلّ مدُّ محور كلّ جدارٍ عند طرفه الملتقي بآخر حتى يبلغ أبعدَ
   نقطةٍ من جسم ذلك الآخر على امتداد محوره هو — فيغطّي جسمه الثلمة
   مهما كانت المحاذاة، والاتحاد بعدها يمتصّ أيّ تراكبٍ زائد. ولمّا
   كان المدُّ يزيد لا ينقص، فتكرارُه من الطرفين معاً بلا ضرر. */
function weldCorners(out){
 const key=p=>R(p[0])+","+R(p[1]);
 const M=new Map();
 out.forEach(g=>{
  [["lo",g.rawLo],["hi",g.rawHi]].forEach(([end,p])=>{
   if(!p)return;
   const k=key(p);
   let a=M.get(k);
   if(!a){a=[]; M.set(k,a)}
   a.push({g,end});
  });
 });
 const ext=new Map();
 M.forEach(list=>{
  if(new Set(list.map(e=>e.g)).size<2)return;
  list.forEach(({g,end})=>{
   list.forEach(o=>{
    if(o.g===g)return;
    endCorners(o.g,o.end).forEach(c=>{
     const proj=c[0]*g.u[0]+c[1]*g.u[1];
     const cur=ext.get(g)||{};
     if(end==="lo")cur.lo=Math.min(cur.lo==null?g.lo:cur.lo,proj);
     else cur.hi=Math.max(cur.hi==null?g.hi:cur.hi,proj);
     ext.set(g,cur);
    });
   });
  });
 });
 ext.forEach((v,g)=>{
  if(v.lo!=null)g.lo=Math.min(g.lo,v.lo);
  if(v.hi!=null)g.hi=Math.max(g.hi,v.hi);
 });
 out.forEach(g=>{ g.a=centerPt(g,g.lo); g.b=centerPt(g,g.hi); });
}
export function centers(walls,joins){
 const out=[];
 /* centerLine/dir على الوتر: قوسٌ هنا يُرسَم وتراً مستقيماً بلا كلمة.
    bodyOf يفصل الأقواس قبل النداء (band)؛ وهذا الترشيح يُبقي ذلك
    صحيحاً لو نادى غيرُه. */
 walls=(walls||[]).filter(w=>!isArc(w));
 const mk=w=>{
  const c=centerLine(w), d=dir(w);
  if(!c||!d)return null;
  let ang=Math.atan2(d.uy,d.ux);
  if(ang<0)ang+=Math.PI;
  const ux=Math.cos(ang), uy=Math.sin(ang);
  const nx=-uy, ny=ux;
  const s0=c.a[0]*ux+c.a[1]*uy, s1=c.b[0]*ux+c.b[1]*uy;
  const lo0=(s0<=s1), rawLo=lo0?w.a:w.b, rawHi=lo0?w.b:w.a;
  return {ang,u:[ux,uy],n:[nx,ny],
   off:c.a[0]*nx+c.a[1]*ny,
   lo:Math.min(s0,s1), hi:Math.max(s0,s1), t:w.t, ws:[w],
   rawLo,rawHi};
 };
 const pt=centerPt;
 if(!joins){
  (walls||[]).forEach(w=>{
   const g=mk(w);
   if(g){g.a=pt(g,g.lo); g.b=pt(g,g.hi); out.push(g)}
  });
  weldCorners(out);
  return out;
 }
 const G=new Map();
 (walls||[]).forEach(w=>{
  const g=mk(w);
  if(!g)return;
  const k=`${Math.round(g.ang*1e4)}|${Math.round(g.off)}|${g.t}`;
  let a=G.get(k);
  if(!a){a=[]; G.set(k,a)}
  a.push(g);
 });
 G.forEach(list=>{
  list.sort((p,q)=>p.lo-q.lo);
  let cur=null;
  const flush=()=>{
   if(!cur)return;
   cur.a=pt(cur,cur.lo); cur.b=pt(cur,cur.hi);
   out.push(cur); cur=null;
  };
  list.forEach(g=>{
   if(cur&&g.lo<=cur.hi+1){
    if(g.hi>cur.hi)cur.rawHi=g.rawHi;
    cur.hi=Math.max(cur.hi,g.hi);
    cur.ws.push(g.ws[0]);
    return;
   }
   flush();
   cur=g;
  });
  flush();
 });
 weldCorners(out);
 return out;
}
/* الفتحات العابرة تُطرَح من الأجسام — والكوّة لا تعبر فلا تُطرَح.
   وخريطةٌ واحدة لكل نداء: المسحُ لكل جدارٍ يجعلها جدرانٌ × فتحات. */
function openMap(){
 const M=new Map();
 S.opens.forEach(o=>{
  if(o.kind==="niche")return;
  let a=M.get(o.wall);
  if(!a){a=[]; M.set(o.wall,a)}
  a.push(o);
 });
 return M;
}
/* نسخةٌ مكاشة: openMap تُبنى مرّةً لكل حالةٍ (هندسة · فتحات · عدد)
   بدل كل نداء bodyOf — bodies() تُناديها مرّتين (الجدران والمنخفضة). */
let OMC=null, OMK="", OMA=null;
function openMapCached(){
 const k=`${VER.g}|${VER.o}|${S.opens.length}`;
 if(OMC&&OMK===k&&OMA===S.opens)return OMC;
 OMC=openMap(); OMK=k; OMA=S.opens;
 return OMC;
}
function solidRuns(g,OM){
 const cuts=[];
 g.ws.forEach(w=>{
  const list=OM.get(w.id);
  if(!list||!list.length)return;
  const c=centerLine(w);
  if(!c)return;
  const s0=c.a[0]*g.u[0]+c.a[1]*g.u[1];
  const s1=c.b[0]*g.u[0]+c.b[1]*g.u[1];
  const sg=(s1>=s0)?1:-1;
  list.forEach(o=>{
   const [a,b]=span(o);
   const p=s0+sg*a, q=s0+sg*b;
   cuts.push([Math.min(p,q),Math.max(p,q)]);
  });
 });
 if(!cuts.length)return [[g.lo,g.hi]];
 cuts.sort((a,b)=>a[0]-b[0]);
 const runs=[];
 let at=g.lo;
 cuts.forEach(([a,b])=>{
  if(b<=at)return;
  if(a>at+1)runs.push([at,Math.min(a,g.hi)]);
  at=Math.max(at,b);
 });
 if(at<g.hi-1)runs.push([at,g.hi]);
 return runs.filter(([a,b])=>b-a>1);
}
/* ═══ الأجسام ═══
   forLoops=1: بلا طرح الفتحات — الباب لا يوسّع الغرفة، ولو طُرح
   لتسرّبت الحلقة من الفتحة. */
export function bodyOf(walls,cols,forLoops){
 const polys=[];
 const OM=forLoops?null:openMapCached();
 /* القوسية تُبنى مضلّعاً مباشرةً (band) فتدخل الاتحاد كسائر
    الأجسام؛ والمستقيمة تمرّ بالمحاور فتنال الدمج وطرح الفتحات. */
 const straight=[], arcs=[];
 (walls||[]).forEach(w=>{(isArc(w)?arcs:straight).push(w)});
 arcs.forEach(w=>{
  const p=band(w);
  if(p&&p.length>2)polys.push(p);
 });
 centers(straight,!!+S.opt.joins).forEach(g=>{
  const runs=forLoops?[[g.lo,g.hi]]:solidRuns(g,OM);
  runs.forEach(([a,b])=>{
   const p1=[g.u[0]*a+g.n[0]*g.off, g.u[1]*a+g.n[1]*g.off];
   const p2=[g.u[0]*b+g.n[0]*g.off, g.u[1]*b+g.n[1]*g.off];
   const bp=bandPoly(p1[0],p1[1],p2[0],p2[1],g.t);
   if(bp)polys.push(bp);
  });
 });
 (cols||[]).forEach(c=>{
  const p=(c.kind==="circ")
   ? circPoly(c.x,c.y,c.w/2,32)
   : rectPoly(c.x,c.y,c.w,c.h,c.rot);
  if(p)polys.push(p);
 });
 if(!polys.length)return [];
 return polyBool(polys,{eps:1,minArea:400});
}
/* ═══ حلقات المناطق ═══
   تتجاهل الإخفاء تماماً — الإخفاء عرضٌ لا حذف. والأعمدة تدخلها
   ولو عُرضت مستقلّة: العمود مانعٌ فعليّ.
   وما لم يُخَط يُقرأ فرقاً في عدّاد geom لا من المخرَج: bodyOf
   يُرشِّح الحلقات فتُفقَد خاصّية open عليها. */
/* ═══ نطاق المستوى — F4 ═══
   المشهدُ يقرأ نطاقه من levelScope(S) في كلّ بنّاء نطاقٍ مكانيّ
   (جدار/فتحة/منطقة/عمود/أداةٍ صحيةٍ/درج) — فالفلترة هنا لا في
   البيانات، والتبديل عرضٌ لا تعديل. ودخول النطاق في مفاتيح الكاش
   (lvlKey أسفله) ضروريٌّ: تبديل الطابق ينادي edit() بـ{bump:"view"}
   فيرفع VER.n وحده، وgKey/goKey تعتمدان VER.g/VER.o — فبلا هذا
   المفتاح تبقى الأجسامُ والهاشورُ والأعمدة على طابقٍ سابق. */
const scoped=list=>{
 const L=levelScope(S);
 return L==null?(list||[]):(list||[]).filter(e=>levelOf(e)===L);
};
const lvlKey=()=>{const L=levelScope(S); return L==null?"A":("L"+L)};
const optKey=()=>`${S.opt.fill}|${+S.opt.joins}|${+S.opt.colSolo}|${lvlKey()}`;
const gKey =()=>`${VER.g}|${optKey()}`;
const goKey=()=>`${gKey()}|${VER.o}`;
const nKey =()=>String(VER.n);

let RL=null, RLK="", RLO=0, RLW=0, RLAt=null;
export function regionLoops(){
 const k=`${VER.g}|${+S.opt.joins}|${lvlKey()}`;
 if(RLK===k&&RL)return RL;
 const t0=performance.now();
 const o0=GP.open, w0=GP.weld;
 RL=bodyOf(scoped(S.walls), scoped(S.cols), true);
 RLK=k;
 RLO=GP.open-o0; RLW=GP.weld-w0;
 /* الموضعُ يُقرأ بعد الفرق: openAt آخرُ ما وقع، فإن لم يقع في
    ندائنا هذا فهو من نداءٍ سابقٍ ويدلّ على غير مكانه. */
 RLAt=RLO?GP.openAt:null;
 bump("loops");
 bumpMs("loops", performance.now()-t0);
 return RL;
}
export const loopOpen  =()=>RLO;
export const loopOpenAt=()=>RLAt;
export const loopWeld  =()=>RLW;

let BC=null, BCK="", BCO=0, BCW=0, BCAt=null;
function bodies(){
 const k=goKey();
 if(BC&&BCK===k)return BC;
 const t0=performance.now();
 const solo=!!+S.opt.colSolo;
 const W=scoped(S.walls), CL=scoped(S.cols);
 const cut=W.filter(w=>!isLow(w));
 const low=W.filter(isLow);
 const o0=GP.open, w0=GP.weld;
 BC={solid:bodyOf(cut, solo?null:CL, false),
     lows :bodyOf(low, null, false)};
 BCK=k;
 BCO=GP.open-o0; BCW=GP.weld-w0;
 BCAt=BCO?GP.openAt:null;
 bump("bodies");
 bumpMs("bodies", performance.now()-t0);
 return BC;
}
export const bodyOpen  =()=>BCO;
export const bodyWeld  =()=>BCW;
export const bodyStats=()=>({key:BCK,loops:RLK,
 open:BCO+RLO, weld:BCW+RLW, at:BCAt||RLAt});

/* ═══ بنّاؤو النطاقات ═══
   كلٌّ يعيد أوّلياتٍ خامّاً بلا تصفية: التصفية طبقةٌ فوقها بمفتاحٍ
   آخر (نسخة الطبقات)، فإخفاءُ طبقةٍ لا يعيد بناء ستّين ألف أوّلية. */
let RE_last=null, RE_ep=0;
const refKey=()=>{
 if(S.ref.ents!==RE_last){RE_last=S.ref.ents; RE_ep++}
 const t=S.ref.tr||{};
 return `${RE_ep}|${refVersion()}|${t.k},${t.rot},${t.dx},${t.dy}`
  +`|${Object.keys(S.ref.off||{}).sort().join(",")}`;
};
const refBand=()=>refPrims();

const areaBand=()=>{
 const out=[], h=txtH();
 scoped(S.areas).forEach(a=>areaPrims(a,h).forEach(g=>out.push(g)));
 return out;
};
const HP={hatch:"ANSI31", solid:"SOLID"};
const hatchBand=()=>{
 if(S.opt.fill==="none")return [];
 const pat=HP[S.opt.fill]||"ANSI31";
 const sc=Math.max(8,txtH()*1.1);
 const B2=bodies(), out=[];
 if(B2.solid.length)
  out.push({t:"hatch",L:"A-WALL-PATT",loops:B2.solid,pat,sc});
 if(B2.lows.length)
  out.push({t:"hatch",L:"A-WALL-LOW",loops:B2.lows,pat,sc});
 /* ولا هاشورَ للعمود المستقلّ هنا: colPrims يُخرِجه بمادّته —
    ANSI31 للحديد وSOLID للخرسانة — وعلى طبقته A-COLS. */
 return out;
};
const bodyBand=()=>{
 const B2=bodies(), out=[];
 B2.solid.forEach(r=>out.push({t:"poly",L:"A-WALL",pts:r,cl:1}));
 B2.lows.forEach(r=>out.push({t:"poly",L:"A-WALL-LOW",pts:r,cl:1}));
 return out;
};
/* ═══ الفتحات ═══
   الرمزُ من opens.js: البابُ المزدوج مصراعان، والشبّاكُ قوائمُه
   بعدد مصاريعه، وجانبا الفتحة العابرة من حدود الجسم نفسه (الطرحُ
   يقطع الشريط فتظهر أوجهُه) — فلا خطٌّ مزدوج.
   والكوّةُ وحدها تُرسَم هنا: openMap يتخطّاها فلا تُطرَح من الجسم،
   وحدُّها يُرسَم على طبقتها هي لا على A-WALL — فإخفاءُ طبقتها
   يُخفيها، وذلك عقد «المخفيّ ليس في المشهد». */
const openBand=()=>{
 const out=[];
 const WM=new Map(S.walls.map(w=>[w.id,w]));
 scoped(S.opens).forEach(o=>{
  const w=WM.get(o.wall);
  if(!w)return;
  if(o.kind==="niche"){
   const c=centerLine(w), d=dir(w);
   if(!c||!d)return;
   const [a,b]=span(o);
   const hw=w.t/2, dp=depOf(o,w.t);
   const sg=(o.face==="r")?-1:1;
   const at=(s,off)=>[R(c.a[0]+d.ux*s+d.nx*off),
                      R(c.a[1]+d.uy*s+d.ny*off)];
   out.push({t:"poly",L:okOf(o.kind).lay,cl:1,oid:o.id,pts:[
    at(a,hw*sg),at(b,hw*sg),
    at(b,hw*sg-dp*sg),at(a,hw*sg-dp*sg)]});
   return;
  }
  openPrims(o).forEach(g=>{g.oid=o.id; out.push(g)});
 });
 return out;
};
/* علاماتُ العطب: تُرسَم على __BAD فتُرى ولو أُخفيت طبقةُ الفتحة —
   تقريرٌ عن حالتك لا زينة. وplots("__BAD") كاذبةٌ فلا تُصدَّر. */
const badBand=()=>{
 const out=[];
 const L=levelScope(S);
 badOpens().forEach(o=>{
  if(L!=null&&levelOf(o)!==L)return;
  badPrims(o).forEach(g=>out.push(g));
 });
 return out;
};
/* العمودُ المدمَج لا حدَّ خاصّ له — حدُّه من الاتحاد نفسه، ويبقى
   صليبُ مركزه ووسمُه. والمستقلُّ يُرسَم محيطاً وهاشوراً، والدائريُّ
   قوساً حقيقياً فيُصدَّر CIRCLE لا مضلّعاً بـ٣٢ ضلعاً. */
const colBand=()=>{
 const solo=!!+S.opt.colSolo;
 const out=[];
 scoped(S.cols).forEach(c=>colPrims(c,solo).forEach(g=>out.push(g)));
 return out;
};
const fixtBand=()=>{
 const out=[];
 scoped(S.fixt).forEach(f=>fixPrims(f).forEach(g=>out.push(g)));
 return out;
};
const stairBand=()=>{
 const out=[];
 scoped(S.stairs).forEach(s=>stPrims(s).forEach(g=>out.push(g)));
 /* العناصرُ الإنشائية §٣/١٢ — مع الهيئةِ لا مع التأشير: متقطّعةٌ
    لكنّها جسمٌ في المخطَّط، والترتيبُ بعد الدرج قبل الفتحات. */
 scoped(S.struct).forEach(e=>strPrims(e).forEach(g=>out.push(g)));
 return out;
};
const roofBand=()=>{
 const out=[];
 scoped(S.roofs).forEach(r=>roofPrims(r).forEach(g=>out.push(g)));
 return out;
};
const plineBand=()=>{
 const out=[];
 scoped(S.plines).forEach(p=>plinePrims(p).forEach(g=>out.push(g)));
 return out;
};
const cloudBand=()=>{
 const out=[];
 scoped(S.clouds).forEach(c=>cloudPrims(c).forEach(g=>out.push(g)));
 return out;
};
/* ═══ الجداولُ الموضوعة ═══ P-جديد (الأولوية ٧)
   نطاقٌ خاصٌّ لا حشرٌ في نطاقٍ آخر: الصفوفُ تُقرأ حيّةً هنا، فلا نسخةَ
   مخزَّنةٌ تَقدُم. وليس `geo` لأنه تأشيرٌ على الورقة لا جسمٌ مبنيّ —
   فلا يوسّع صندوقَ الهندسة الذي تُلائَم عليه الشاشة. */
const tableBand=()=>{
 const out=[];
 scoped(S.tables).forEach(t=>tablePrims(t).forEach(g=>out.push(g)));
 return out;
};
/* الوسم ليس كياناً مكانياً: لا يُصفَّر بالطابق — يُرسَم رمزُه في
   المشهد بعلامة covp فيخصّصه composeSheet لمنفذه المصدر وحده */
const calloutBand=()=>{
 const out=[];
 (S.callouts||[]).forEach(c=>calloutPrims(c).forEach(g=>out.push(g)));
 return out;
};
/* المحاورُ تمتدّ على صندوق الهندسة، فتقرؤه من السياق. وليست geo
   بقصد: لو دخلت الصندوق لنمت الورقةُ به فنمت المحاورُ معها. */
const axisBand=cx=>gridPrims(cx.B);
const dimBand=()=>{
 const out=[];
 S.dims.forEach(d=>dimPrims(d).forEach(g=>out.push(g)));
 S.chains.forEach(c=>chainPrims(c).forEach(g=>out.push(g)));
 return out;
};
const annoBand=()=>{
 const out=[];
 S.anno.forEach(a=>annoPrims(a).forEach(g=>out.push(g)));
 return out;
};
/* الحقل الحيّ يُرسَم نصّاً على طبقة التأشير — النصُّ cached لا
   المشتقُّ الحي، والنجمةُ تسبق القديم كما تفعل مع النصّ البديل. */
const liveBand=()=>{
 const out=[];
 (S.livefields||[]).forEach(f=>livePrims(f).forEach(g=>out.push(g)));
 return out;
};
const blockBand=()=>{
 const out=[];
 (S.blocks||[]).forEach(b=>{
  explode(b).forEach(g=>{
   if(g.t==="line")
    out.push({t:"line",L:g.layer||BLK_LAY,a:g.a,b:g.b,bid:b.id});
   else if(g.t==="pline")
    out.push({t:"poly",L:g.layer||BLK_LAY,pts:g.pts,cl:g.closed?1:0,bid:b.id});
   else if(g.t==="arc")
    out.push({t:"arc",L:g.layer||BLK_LAY,cx:g.cx,cy:g.cy,r:g.r,
     a0:g.a0,a1:g.a1,bid:b.id});
  });
 });
 return out;
};
/* الورقة تستند إلى صندوق الهندسة، فتُبنى آخراً ويُمرَّر إليها.
   وتُوسَم sheet:1 فيُعرَف حبرُها من ورقها في القياس والتقارير. */
const sheetBand=cx=>{
 if(!+S.sheet.on)return [];
 const out=sheetPrims(cx.B)||[];
 out.forEach(g=>{g.sheet=1});
 return out;
};
/* ═══ جدول النطاقات ═══
   الترتيب ترتيبُ الطلاء: الأوّل تحت، والأخير فوق.
   geo=1   يدخل صندوق الهندسة (عليه تُبنى الورقة)
   sheet=1 يُستثنى من صندوق الحبر
   diag=1  تشخيصٌ لا يُطبَع ولا يدخل صندوق الحبر — فلا يُبلَّغ
           بتجاوزٍ للورقة سببُه علامةُ تحذير */
const BANDS=[
 {n:"ref",   key:refKey, f:refBand},
 {n:"roof",  key:nKey,   f:roofBand,  geo:1},
 {n:"pline", key:nKey,   f:plineBand, geo:1},
 {n:"cloud", key:nKey,   f:cloudBand, geo:1},
 {n:"area",  key:nKey,   f:areaBand,  geo:1},
 {n:"hatch", key:goKey,  f:hatchBand, geo:1},
 {n:"body",  key:goKey,  f:bodyBand,  geo:1},
 {n:"open",  key:goKey,  f:openBand,  geo:1},
 {n:"col",   key:gKey,   f:colBand,   geo:1},
 {n:"fixt",  key:nKey,   f:fixtBand,  geo:1},
 {n:"stair", key:nKey,   f:stairBand, geo:1},
 {n:"axis",  key:nKey,   f:axisBand},
 {n:"dim",   key:nKey,   f:dimBand},
 {n:"anno",  key:nKey,   f:annoBand},
 {n:"live",  key:nKey,   f:liveBand},
 {n:"callout",key:nKey,  f:calloutBand},
 {n:"table", key:nKey,   f:tableBand},
 {n:"block", key:nKey,   f:blockBand, geo:1},
 {n:"bad",   key:goKey,  f:badBand,   diag:1},
 {n:"sheet", key:nKey,   f:sheetBand, sheet:1}
];
export const bandNames=()=>BANDS.map(b=>b.n);

const CB=new Map();          /* اسم النطاق → {k,raw,lv,out,box} */
function bandOf(b,cx){
 let e=CB.get(b.n);
 const k=b.key();
 if(!e||e.k!==k){
  const t0=performance.now();
  const raw=b.f(cx)||[];
  bumpMs("band", performance.now()-t0);
  e={k,raw,lv:-1,out:null,box:null};
  CB.set(b.n,e);
  bump("band"); bump("prims",raw.length);
 }
 /* التصفية على نسخة الطبقات وحدها: كلُّ كاتبٍ في الجدول يُنادي
    layers.invalidate، وهي تُقدّم العدّاد. ولو صفّينا على VER.g
    لأُعيدت تصفيةُ المرجع في كل إطارٍ من سحب جدار. */
 const lv=layVer();
 if(e.lv!==lv){
  const t0=performance.now();
  e.out=filterPrims(e.raw);
  e.box=primsBBox(e.out);
  e.lv=lv;
  bump("filter",e.raw.length);
  bumpMs("filter", performance.now()-t0);
 }
 return e;
}
/* ═══ شبح الطابق السفلي ═══ تقريرٌ بصريٌّ صرفٌ: جدرانُ وأعمدةُ
   الطابق الذي تحت النشط، معتمةً وبخطٍّ متقطّع، لمحاذاة الرسم
   الجديد عليها. لا تدخل BOQ ولا التصدير (ليست من BANDS ولا من
   bodies()) ولا الفهرسَ المكانيّ — طبقةُ عرضٍ مضافةٌ فوق المشهد
   الحقيقي، تُحسَب مستقلّةً بلا مسّ اتحاد الجدران ولا كاشه. */
function sceneGhost(level){
 if(level==null)return [];
 const out=[];
 (S.walls||[]).filter(w=>levelOf(w)===level).forEach(w=>{
  const p=band(w);
  if(p&&p.length)out.push({t:"poly",L:"A-WALL",cl:1,pts:p,
   ghost:1,alpha:0.3,dash:[4,4]});
 });
 (S.cols||[]).filter(c=>levelOf(c)===level).forEach(c=>{
  colPrims(c).forEach(g=>out.push(Object.assign({},g,
   {ghost:1,alpha:0.3,dash:[4,4]})));
 });
 return out;
}
/* ═══ الكاش ═══ */
let CACHE=null, CVER=-1;
let FLAT=null, LASTO=null;
export const invalidate=()=>{
 CVER=-1;
 CB.clear(); FLAT=null; LASTO=null;
 /* والأجسامُ والحلقاتُ لا تُمسَح هنا: مفتاحاهما (goKey/gKey) يكفيان
    داخل الجلسة — bodies() وregionLoops() يقارنان المفتاح ذاتيّاً
    فيُعيدان الاتحادَ نفسَه إن لم تتغيّر الهندسة. مسحُهما هنا كان
    يُجبر إعادة بناء الاتحاد على كلّ نصٍّ أو بُعدٍ يُضاف، رغم أنّ
    نطاقَه (dim/anno) لا صلة له بالجدران. */
};
/* ═══ خُطّافُ استعمالِ الطبقات ═══ §٣/١٣
   المفتاحُ يحتاج أن يعرف **ما رُسِم فعلاً**، وهو ما يعرفه المشهدُ
   وحدَه. والاتجاهُ من هنا إلى tables.js لا العكس: هذا الملفُّ يستورد
   tablePrims، فاستيرادُ scene من هناك دورة.
   والمشهدُ **بلا الجداولِ نفسها**: مفتاحٌ يذكر طبقةَ التأشيرِ لأنّ
   المفتاحَ مرسومٌ عليها حُجّةٌ دائرية. فنقرأ الأوّلياتَ ونُسقِط ما
   حمل tid (جدولاً) — ويبقى A-ANNO إن كان عليه تأشيرٌ حقيقيّ. */
/* ودورةٌ حقيقيةٌ كشفها أوّلُ تشغيل: `scene()` ترسم الجداولَ،
   و`tablePrims` للمفتاح ينادي هذا الخُطّافَ، فينادي `scene()` من
   جديد — ركضٌ لا نهاية له. فحارسٌ صريح: ما دمنا داخل المشهد نُعيد
   آخرَ ما عُرِف. والنتيجةُ أنّ المفتاحَ يتبع الرسمَ بإطارٍ واحدٍ من
   التأخير — وهو ما لا يُرى، والبديلُ تعليقُ المتصفّح. */
let LGBUSY=0, LGSET=null, LGVER=-1;
setLegendUsage(()=>{
 if(LGBUSY)return LGSET;
 if(LGSET&&LGVER===VER.g)return LGSET;
 LGBUSY=1;
 try{
  const out=new Set();
  scene().forEach(g=>{if(g&&g.L&&!g.tid)out.add(g.L)});
  LGSET=out; LGVER=VER.g;
 }catch(e){LGSET=LGSET||null}
 finally{LGBUSY=0}
 return LGSET;
});
export function scene(){
 if(CVER===VER.n&&CACHE)return CACHE;
 const t0=performance.now();
 bump("scene");
 const cx={B:null};
 const outs=[];
 let Bg=null, Bink=null, Ball=null;
 for(let i=0;i<BANDS.length;i++){
  const b=BANDS[i];
  const e=bandOf(b,cx);
  outs.push(e.out);
  if(b.geo)Bg=bboxUnion(Bg,e.box);
  if(!b.sheet&&!b.diag)Bink=bboxUnion(Bink,e.box);
  Ball=bboxUnion(Ball,e.box);
  if(b.geo)cx.B=Bg;          /* الورقة والمحاور تقرآنه */
 }
 /* النسخُ يبقى: تسلسلُ الطلاء واحدٌ فلا سبيل إلى تجزيئه بلا تغيير
    ما يُطلى. وكلفتُه نسخُ مؤشّرات لا بناءُ أوّليات. وحين لا يتبدّل
    نطاقٌ واحد (تبديلُ لاقطٍ · خيارُ شريط) يُعاد المسطَّح كما هو. */
 let same=!!(FLAT&&LASTO&&LASTO.length===outs.length);
 if(same)for(let i=0;i<outs.length;i++)
  if(LASTO[i]!==outs[i]){same=false; break}
 if(!same){
  FLAT=[].concat.apply([],outs);
  LASTO=outs;
 }
 CACHE={P:FLAT, B:Bg, Bink, Ball,
  solid:bodies().solid, lows:bodies().lows,
  bad:badOpens().length,
  stale:staleCount(),
  loose:looseDims(30).length,
  live:staleLiveCount(),
  over:S.dims.filter(isOverridden).length,
  hidden:hiddenCount(),
  /* شظاياً لم تُخَط: الجدار ينفتح على الشاشة والحلقة تغيب —
     تقريرٌ لا إصلاح. وبعد اللحم لا تقع إلّا في مدخلٍ معطوبٍ
     فعلاً، فصار العدُّ ذا معنى. */
  open:BCO, openAt:BCAt, weld:BCW};
 /* الشبح فوق CACHE.P وحده — FLAT (أصل النسخ/same أعلاه) يبقى
    نظيفاً بلا شبحٍ فيه، فلا يُفسد مقارنة same بين استدعاءين
    اختلف فيهما خيار الشبح وحده لا الهندسة */
 /* «طباعة فقط»: عرضٌ لا كتابة — يُسقِط ما لن يُطبَع (طبقةٌ أُوقِف طبعها
    أو داخليّة) من P وحده، فلا يمسّ S.layers ولا التاريخ. والشبحُ لا
    يُطبَع أصلاً فلا يُضاف. FLAT يبقى نظيفاً (أصل same) فالتبديل
    يُعيد الترشيح لا البناء. */
 if(+S.opt.plotsOnly){
  CACHE.P=FLAT.filter(g=>plots(g.L||"0"));
 }else if(+S.opt.ghost){
  const gl=levelBelow(S);
  if(gl!=null){
   const gp=sceneGhost(gl);
   if(gp.length)CACHE.P=FLAT.concat(gp);
  }
 }
 CVER=VER.n;
 const ms=performance.now()-t0;
 /* التحذير فقط حين القياس مفعّلٌ (bumpMs تعيد true مُطفأةً) */
 if(!bumpMs("scene",ms)&&ms>50)
  console.warn(`[CivilDraft] scene ${ms.toFixed(1)}ms >16ms`
   +` — ${FLAT.length} prims`);
 return CACHE;
}
/* ═══ الصناديق ═══
   ثلاثةٌ محسوبةٌ بعد التصفية، فإخفاءُ طبقةٍ يُصغّرها فعلاً — وكانت
   تُحسَب قبلها: تُخفي مرجعاً مستورداً ثم تُصدِّر، فتخرج ورقةٌ
   بهوامش خالية وfit يُصغِّر إلى لا شيء.
     B     الهندسة المبنيّة — عليها تُبنى الورقة
     Bink  كلُّ ما يُطلى إلّا الورقة والتشخيص — به يُقاس تجاوزها
     Ball  الكلّ — عليه تُلائم الشاشة */
export const sceneBBox   =()=>scene().B;
export const sceneBBoxInk=()=>scene().Bink||scene().B;
export const sceneBBoxAll=()=>scene().Ball||scene().B;
/* ═══ صندوق ما يُطبَع ═══
   طبقةٌ تراها ولا تُطبَع لا يجوز أن تُوسِّع الورقة: العقد «ما تراه
   هو ما يُصدَّر» يعمل في الاتجاهين. ويُحسَب بطلب التصدير لا في كل
   إطار — نقرةٌ لا ستّون في الثانية. */
let PB=null, PBP=null, PBL=-1;
export function sceneBBoxPlot(){
 const c=scene(), lv=layVer();
 if(PB&&PBP===c.P&&PBL===lv)return PB;
 PB=primsBBox(c.P.filter(g=>plots(g.L||"0")))||c.B;
 PBP=c.P; PBL=lv;
 return PB;
}
export const sceneStats=()=>{
 const o={};
 CB.forEach((e,n)=>{o[n]={n:e.out?e.out.length:0,key:e.k}});
 return o;
};
