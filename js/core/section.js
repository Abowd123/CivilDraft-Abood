/* ═══ المقاطع (Section) ═══
   وحدةٌ هندسية بحتة كأختها الواجهة: تُسأل فتجيب، ولا تُكتَب في S
   حرفاً، ولا يستدعيها مشهدٌ ولا إطار. المقطع يُولَّد بأمر SECTION
   صريحاً وحده، وإن تبدّل المخطّط بعده بقي كما وُلد ويُبلَّغ أنه
   أقدم من الحالة (sectStale) — تقريرٌ لا إصلاح.

   ═══ الفرق عن الواجهة ═══
   الإسقاط واحد (projectWalls في elevation.js)، والفرق في ثلاثة:

   ١ · التصفية: الواجهة تختار بالناظم واتجاهٍ ثابت، والمقطع يختار
       بالمسافة العمودية عن خطّ قطعٍ حرٍّ ترسمه بنقطتين.

   ٢ · الموضع الأفقي: الواجهة تُفرَد تراكمياً، والمقطع يقع في موضعه
       الحقيقي على خطّ القطع (x = المسافة من نقطته الأولى). ومن أراد
       الفرد: {unfold:1}.

   ٣ · العرض: عرضُ الجدار في الواجهة طولُه، وفي المقطع وترُ خطّ
       القطع في جسمه — سماكتُه إن كان عمودياً على الخطّ، وأطولُ منها
       إن كان مائلاً. يُحسَب بتقاطع خطّ القطع مع وجهَي الجدار.

   المخرَج مسطّح: {kind:"rect", x,y,w,h, layer} بالمليمتر، y‑up. */
import {S,VER,txtH} from "./state.js";
import {clamp,deg,m2,dm2,R2D} from "./units.js";
import {dir,band,faces,centerLine,wallsIn,TMAX,WTYPE,isArc}
 from "./walls.js";
import {opensOf,isPart,openState,depOf,span} from "./opens.js";
import {distSeg,distPoly,segSeg,pip,lineX,bboxOf,bboxPad} from "./geom.js";
import {viewFrame,projectWalls,wallHeight,angDiff} from "./elevation.js";
import {levelOf,activeLevel,levelTag,normLevel} from "./level.js";

const R=v=>Math.round(v);

export const SLAY="A-SECT";
export const CUT=300;            /* نطاق القبول العمودي — مم */
export const MINCUT=200;         /* أقصر خطّ قطعٍ مقبول */
export const PAR=1e-6;           /* حدُّ التوازي */

/* ═══ إطار المقطع ═══ */
export function cutFrame(a,b,back){
 const A=[R(a[0]),R(a[1])], B=[R(b[0]),R(b[1])];
 const dx=B[0]-A[0], dy=B[1]-A[1], L=Math.hypot(dx,dy);
 if(L<MINCUT)
  throw new Error(`خطّ القطع ${m2(L)} م — الأقلّ ${m2(MINCUT)} م`);
 const cut=deg(Math.atan2(dy,dx)*R2D);
 const F=viewFrame(deg(cut+(back?90:-90)));
 return {A,B,L,cut,back:back?1:0,
  v:F.v, rt:F.rt, view:F.ang, org:back?B:A};
}
export const uOf=(F,p)=>
 (p[0]-F.org[0])*F.rt.x+(p[1]-F.org[1])*F.rt.y;

export function sectName(ang){
 const A=deg(ang);
 if(Math.min(Math.abs(angDiff(A,0)),Math.abs(angDiff(A,180)))<0.5)
  return "مقطع أفقي";
 if(Math.min(Math.abs(angDiff(A,90)),Math.abs(angDiff(A,270)))<0.5)
  return "مقطع رأسي";
 return `مقطع بزاوية ${R(A)}°`;
}

export function cutDist(w,A,B){
 const p=band(w);
 if(!p)return 1/0;
 const n=p.length;
 for(let i=0;i<n;i++)
  if(segSeg(A,B,p[i],p[(i+1)%n]))return 0;
 if(pip(p,A[0],A[1])||pip(p,B[0],B[1]))return 0;
 let m=1/0;
 for(let i=0;i<n;i++){
  const d=distSeg(A,B,p[i][0],p[i][1]);
  if(d<m)m=d;
 }
 return Math.min(m, distPoly(p,A[0],A[1]), distPoly(p,B[0],B[1]));
}

export function cutFoot(w,F){
 /* دفاعٌ: faces() تعمل على الوتر، فقوسٌ يصل إلى هنا يُقاس بوجهَين
    ليسا وجهَيه. المنبع (projectWall) يستبعده أصلاً — وهذا يمنع
    مستدعياً مستقبليّاً من تسريبه صامتاً. */
 if(isArc(w))return null;
 const d=dir(w), f=faces(w);
 if(!d||!f)return null;
 const cr=d.ux*F.rt.y-d.uy*F.rt.x;
 if(Math.abs(cr)<PAR)return {par:1};
 const Pl=lineX(F.A,F.B,f.l[0],f.l[1]);
 const Pr=lineX(F.A,F.B,f.r[0],f.r[1]);
 if(!Pl||!Pr)return {par:1};
 const ul=uOf(F,Pl), ur=uOf(F,Pr);
 return {par:0, ul, ur,
  u0:Math.min(ul,ur), u1:Math.max(ul,ur),
  skew:Math.abs(ul-ur)};
}

export function sOfCut(w,F){
 if(isArc(w))return null;               /* انظر cutFoot */
 const d=dir(w), c=centerLine(w);
 if(!d||!c)return null;
 const P=lineX(F.A,F.B,c.a,c.b);
 if(!P)return null;
 return (P[0]-w.a[0])*d.ux+(P[1]-w.a[1])*d.uy;
}

export function sectWalls(a,b,opt){
 const o=opt||{};
 const F=cutFrame(a,b,!!o.back);
 const lvl=(o.level==null)?activeLevel(S.meta):normLevel(o.level);
 const tol=clamp((o.tol==null)?CUT:+o.tol,0,5000);
 const box=bboxPad(bboxOf([F.A,F.B]),tol+TMAX);
 const cand=wallsIn(box);
 const P=projectWalls(cand,F,{ref:null,keep:w=>levelOf(w)===lvl});
 /* المستويات الأخرى المارّة بصندوق البحث تُعلَن ولا تُخفى */
 const skip={};
 cand.forEach(w=>{
  if(isArc(w))return;
  const L=levelOf(w);
  if(L!==lvl){const t=levelTag(L); skip[t]=(skip[t]||0)+1}
 });
 const list=[], miss=[];
 P.forEach(p=>{
  const w=p.w;
  const dd=cutDist(w,F.A,F.B);
  if(dd>tol)return;
  const f=cutFoot(w,F);
  if(!f||f.par){
   miss.push({code:"par",id:w.id,d:R(dd),
    msg:`${w.id} موازٍ لخطّ القطع — لا وترَ له فلا مقطع`});
   return;
  }
  const s=sOfCut(w,F);
  if(s==null||s<-tol||s>p.L+tol){
   miss.push({code:"end",id:w.id,d:R(dd),
    msg:`${w.id} يقارب الخطّ عند طرفه ولا يعبره`});
   return;
  }
  if(f.u1<=-1||f.u0>=F.L+1){
   miss.push({code:"span",id:w.id,d:R(dd),
    msg:`${w.id} خارج مدى خطّ القطع — مدِّده إن أردته`});
   return;
  }
  list.push(Object.assign({},p,{d:dd,f,s}));
 });
 /* القوسيّ لا يُسقَط (projectWall) فلا يدخل P أصلاً: يُقال هنا إن كان
    الخطّ يقاربه أو يعبره — وإلّا خرج المقطعُ ناقصَ جدارٍ بلا كلمة.
    cutDist تقيس على جسم القوس (band) لا على وتره. للمستوى المختار
    وحده، كتحذير القوس في الواجهة. */
 cand.forEach(w=>{
  if(!isArc(w)||levelOf(w)!==lvl)return;
  const dd=cutDist(w,F.A,F.B);
  if(dd>tol)return;
  miss.push({code:"arc",id:w.id,d:R(dd),
   msg:`${w.id} جدارٌ قوسيّ — لا يُقطَع في المقاطع بعد فيظهر المقطعُ `
    +`ناقصاً`});
 });
 list.sort((p,q)=>(p.f.u0-q.f.u0)||(p.d-q.d)||(p.i-q.i));
 return {F,tol,L:F.L,level:lvl,skip,list,miss};
}

export function section(a,b,opt){
 const o=opt||{};
 const Q=sectWalls(a,b,opt);
 const F=Q.F, Lc=F.L;
 const unfold=!!o.unfold;
 const gap=Math.max(0,R(+o.gap||0));
 const shapes=[], runs=[], warn=[];
 Q.miss.forEach(m=>warn.push(m));
 let top=0, cur=0;
 Q.list.forEach(p=>{
  const w=p.w, f=p.f, H=wallHeight(w);
  let x0=f.u0, x1=f.u1, clip=0;
  if(unfold){x0=cur; x1=cur+f.skew}
  else{
   if(x0<0){x0=0; clip=1}
   if(x1>Lc){x1=Lc; clip=1}
  }
  const wid=Math.max(1,R(x1-x0));
  const X=R(x0);
  if(clip)warn.push({code:"clip",id:w.id,
   msg:`${w.id} قُصَّ عند حدّ خطّ القطع — لا قصَّ صامتاً`});
  shapes.push({kind:"rect",x:X,y:0,w:wid,h:H,layer:SLAY,
   role:"wall",id:w.id,wall:w.id});
  const run={id:w.id,x0:X,x1:X+wid,w:wid,h:H,
   t:w.t,type:w.type,d:R(p.d),s:R(p.s),
   skew:R(f.skew),clip,flip:p.flip?1:0,opens:0};
  const kx=(f.skew/Math.max(1,w.t));
  opensOf(w.id).forEach(op=>{
   const [a0,a1]=span(op);
   if(p.s<a0-0.5||p.s>a1+0.5)return;
   const oy=Math.max(0,R(op.sill||0)), oh=Math.max(1,R(op.h));
   let ox=X, ow=wid;
   if(isPart(op)){
    const dep=depOf(op,w.t);
    const dw=Math.max(1,dep*kx);
    const at=(op.face==="r")?f.ur:f.ul;
    const to=(op.face==="r")?f.ul:f.ur;
    const s1=(to>=at)?1:-1;
    let n0=Math.min(at,at+s1*dw), n1=Math.max(at,at+s1*dw);
    if(unfold){const sh=X-f.u0; n0+=sh; n1+=sh}
    n0=Math.max(n0,X); n1=Math.min(n1,X+wid);
    if(n1-n0<1)return;
    ox=R(n0); ow=Math.max(1,R(n1-n0));
   }
   shapes.push({kind:"rect",x:ox,y:oy,w:ow,h:oh,layer:SLAY,
    role:isPart(op)?"niche":"open",kindOf:op.kind,
    id:op.id,wall:w.id});
   run.opens++;
   const st=openState(op);
   if(st!=="ok")warn.push({code:st,id:op.id,
    msg:`${op.id} على ${w.id}: `
     +(st==="over"?"تخرج عن مدى جدارها"
      :st==="clash"?"تتراكب مع فتحةٍ أخرى":"يتيمة")});
   if(oy+oh>H)warn.push({code:"tall",id:op.id,
    msg:`${op.id} تعلو جدارها — ${m2(oy+oh)} م فوق ${m2(H)} م`});
   top=Math.max(top,oy+oh);
  });
  top=Math.max(top,H);
  runs.push(run);
  cur=x1+gap;
 });
 const wid=unfold
  ? Math.max(0,R(cur-(runs.length?gap:0)))
  : R(Lc);
 const hgt=R(top);
 return {a:F.A, b:F.B, ang:R(F.cut), view:F.view, back:F.back,
  name:sectName(F.cut), layer:SLAY, tol:Q.tol, L:R(Lc),
  unfold:unfold?1:0, gap,
  level:Q.level, skip:Q.skip,
  shapes, runs, warn, miss:Q.miss,
  w:wid, h:hgt,
  bbox:runs.length?{x0:0,y0:0,x1:wid,y1:hgt}:null,
  n:{walls:runs.length, opens:shapes.length-runs.length,
     shapes:shapes.length, miss:Q.miss.length},
  ver:{n:VER.n,g:VER.g,o:VER.o}, at:Date.now()};
}

let LAST=null;
/* poche: تسويد جسم الجدار في المقطع (poché) — اختياريٌّ صراحةً.
   "none" (الافتراض) يبقي السلوك القديم حرفاً: مضلّعٌ واحدٌ لكل
   شكل، فلا اختبارٌ قديم يُكسَر بوسيطٍ لم يطلبه. "solid" يضيف تسويداً
   خلف كل شكل جدارٍ (role==="wall")، و"hatch" يضيف هاشوراً بدلاً
   منه — كلاهما إضافةٌ فوق الخطوط لا بديلاً عنها. */
export function sectPrims(e,dx,dy,opt){
 const t=e||LAST;
 if(!t)return [];
 const X=R(dx||0), Y=R(dy||0);
 const poche=(opt&&opt.poche)||"none";
 const out=[];
 const h=poche!=="none"?txtH():0;
 /* ═══ الفتحةُ المقطوعةُ فراغ ═══ (حلقة «الواجهات والمقاطع» · المرحلة ٧)
    كان الجدارُ يُرسَم مستطيلاً كاملاً والفتحةُ مستطيلاً فوقه: خطّا وجهَي
    الجدار يعبران فتحةَ الباب فتُقرأ جداراً مصمتاً، و«التسويد» يملأ الفتحةَ
    نفسَها. الآن الجدارُ قطعٌ صلبةٌ بين الفتحات النافذة (باب · فتحة · قنطرة
    · شباك)، والبابُ فراغ، والشباكُ إطارُ زجاجه. والكوّةُ لا تنفذ فتبقى فوقه. */
 const thru=s=>s.role==="open";
 const glaz=s=>s.kindOf==="window"||s.kindOf==="fixed";
 const RECT=(x,y,w,hh)=>[[X+x,Y+y],[X+x+w,Y+y],[X+x+w,Y+y+hh],[X+x,Y+y+hh]];
 t.shapes.forEach(s=>{
  if(s.role==="wall"){
   /* القطعُ الصلبة: [0,H] ناقصاً فترات الفتحات النافذة التي تملأ عرضه */
   const cuts=t.shapes.filter(o=>thru(o)&&o.wall===s.wall&&o.x<=s.x+1&&o.x+o.w>=s.x+s.w-1)
    .map(o=>[Math.max(0,o.y),Math.min(s.h,o.y+o.h)]).filter(c=>c[1]>c[0])
    .sort((p,q)=>p[0]-q[0]);
   const segs=[]; let y=0;
   cuts.forEach(([a,b])=>{if(a>y)segs.push([y,a]); y=Math.max(y,b)});
   if(y<s.h)segs.push([y,s.h]);
   segs.forEach(([a,b])=>{
    const rect=RECT(s.x,s.y+a,s.w,b-a);
    if(poche==="hatch")
     out.push({t:"hatch",L:s.layer,loops:[rect],pat:"ANSI31",sc:Math.max(8,h*1.1)});
    else if(poche==="solid")
     out.push({t:"fill",L:s.layer,ring:rect,style:"solid"});
    out.push({t:"poly",L:s.layer,cl:1,pts:rect});
   });
   return;
  }
  if(thru(s)&&!glaz(s))return;            /* الباب والفتحة والقنطرة: فراغ */
  out.push({t:"poly",L:s.layer,cl:1,pts:RECT(s.x,s.y,s.w,s.h)});
 });
 return out;
}
export const lastSect=()=>LAST;
export const clearSect=()=>{LAST=null};
export function buildSect(a,b,opt){
 LAST=section(a,b,opt);
 return LAST;
}
export const sectStale=e=>{
 const t=e||LAST;
 return t?(t.ver.g!==VER.g||t.ver.o!==VER.o):null;
};
export function sectSay(e){
 const t=e||LAST;
 if(!t)return "لا مقطع — نفّذ SECTION";
 return `${t.name}: ${t.n.walls} جدار · ${t.n.opens} فتحة · `
  +dm2(t.w,t.h,"م")
  +(t.n.miss?` · ${t.n.miss} قارب ولم يُقطَع`:"")
  +(t.warn.length?` · ${t.warn.length} ملاحظة`:"")
  +(sectStale(t)?" · المخطّط تبدّل بعد توليده":"");
}
export function sectCmd(a,b,opt){
 const e=buildSect(a,b,opt);
 if(!e.n.walls)throw new Error(
  `لا جدار يعبره خطّ القطع بنطاق ${m2(e.tol)} م`
  +(e.n.miss?` — ${e.n.miss} قاربه: ${e.miss[0].msg}`:""));
 return e;
}
export const sectRunSay=r=>`${r.id} (${WTYPE[r.type].n}): `
 +`${m2(r.x0)} → ${m2(r.x1)} م · سماكة ${m2(r.t)} م`
 +(r.skew>r.t+1?` · وتر ${m2(r.skew)} م بالميل`:"")
 +` · ${r.opens} فتحة`+(r.clip?" · مقصوص":"");
