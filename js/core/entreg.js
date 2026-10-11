/* ═══ سجلّ الأنواع ═══
   جدولٌ بدل ثماني سلاسل من الشروط. قبله كانت إضافة نوعٍ تعني
   تعديل ents.js في ثمانية مواضع و layers.js في موضعين
   و modify.js في موضع — وأيُّ موضعٍ يُنسى يعطب صامتاً: كيانٌ
   يُرسَم ولا يُحدَّد، أو يُحدَّد ولا يُحذَف.
   بعده: نوعٌ واحد = سطرٌ واحد هنا.

   وهو جدولٌ خالص لا يعرف الطبقات ولا حالتها: التصفية سياسةٌ
   تسكن ents.js، فلا دورةَ استيراد مع layers.js — بل layers.js
   يقرأ منه lay(e) فيسقط عنه معرفة الأنواع كلّها.

   الترتيبان مقصودان:
     hitO  ترتيب الإصابة — الأصغر أوّلاً فلا يحجب الجدارُ فتحته.
     pick  ترتيب العدّ والتقرير — يخدم pickInRect و allEnts
           و delSay و groupOrder، فلا أربع قوائم تتفرّق. */
import {S} from "./state.js";
import {clamp,deg} from "./units.js";
import {pip,nearOnSeg,bboxOf,pArea} from "./geom.js";
import {dir,band,wallById,wallLen,wallAt,delWall,
        isLow,isArc,arcParams,arcMidPoint} from "./walls.js";
import {opensOf,openById,openPt,span,sAt,delOpen,nearestFree,okOf,
        MINW,EDGE} from "./opens.js";
import {areaById,areaAt,delArea,labelPt} from "./areas.js";
import {dimById,chainById,annoById,dimGeom,dimMid,chainPt,
        chainBounds,annoPt,delDim,delChain,delAnno,
        posFromPt,dimGeomRad,dimGeomAng,mtBox} from "./dims.js";
import {colById,colPoly,colW,delCol} from "./cols.js";
import {roofById,delRoof} from "./roof.js";
import {plineById,delPline,plineAt,plineBox} from "./plines.js";
import {cloudById,delCloud,cloudAt} from "./clouds.js";
import {tblById,tblPoly,tblAt,delTable,TB_LAY} from "./tables.js";
import {TBLIM} from "./tabledef.js";
import {liveById,delLive} from "./live.js";
import {fixLay,fixById,fixPoly,fixW,fixD,frameOf,delFix} from "./fixt.js";
import {stById,stPolys,stOutline,stGeom,stGeoms,stType,delStair,SMIN_W} from "./stairs.js";
import {strById,strPoly,strBBox,strKind,delStruct} from "./struct.js";
import {instDist,instPoly} from "./blocks.js";
import {BLK_LAY} from "./laydef.js";

const R=v=>Math.round(v);
export const ENT={};
export function defEnt(d){ENT[d.k]=d; return d}

/* ═══ الجدار ═══ */
defEnt({k:"wall",coll:"walls",n:"جدار",pre:"W",pick:1,hitO:7,
 /* bump: أيَّ نسخةٍ يُقدّم تعديلُه — geom يُبطِل الاتحاد والحلقات
    وشبكة الأطراف والمراسي والبصمات · open الأجسام وحدها ·
    view لا شيء منها. والمجهول يُعَدّ geom: الافتراض آمن. */
 bump:"geom",
 byId:wallById,
 lay:w=>isLow(w)?"A-WALL-LOW":"A-WALL",
 /* wallAt يفضّل الأقرب إلى المحور ولا يقبل مرشِّحاً — فإن كان
    الأفضل مخفيّاً أو مقفلاً يُتخطّى النوع كلّه، كما كان */
 hit:(x,y,T,tol,ok,cand)=>wallAt(x,y,tol,cand),
 shape:w=>({t:"seg",a:w.a,b:w.b}),
 outline:w=>band(w),
 /* مقبضُ المنتصف على القوس نفسه لا على وتره — منتصفُ الوتر خارج
    الجسم (٢٩٣ مم لربع دائرةٍ نصف قطرها ١ م) فيبدو المقبضُ عائماً. */
 grips:w=>[{p:w.a.slice(),k:"a"},
  {p:(isArc(w)&&arcMidPoint(w))
    ||[R((w.a[0]+w.b[0])/2),R((w.a[1]+w.b[1])/2)],k:"mid"},
  {p:w.b.slice(),k:"b"}],
 grab:w=>{const o={e:w,a:w.a.slice(),b:w.b.slice()};
  if(w.bulge!=null)o.bulge=w.bulge;    /* المرآة تقلبها من الأصل */
  return o},
 drag(o,g,p,dx,dy){
  const w=o.e, a0=w.a, b0=w.b;
  if(g.k==="a")w.a=[p[0],p[1]];
  else if(g.k==="b")w.b=[p[0],p[1]];
  else{w.a=[o.a[0]+dx,o.a[1]+dy]; w.b=[o.b[0]+dx,o.b[1]+dy]}
  /* سحبُ طرفِ قوسٍ يُبقي انحناءه ويُغيّر نصفَ قطره: عند نصف القطر
     ≤ t/2 لا يُبنى (band ترجع null فيختفي الجدار). فالسحبُ يقف
     عند آخر وضعٍ صالح بدل أن يعبر إلى ما لا يُرسَم — كالمُثبِّتات
     التي تقف عند حدّها. الإزاحةُ الصلبة (mid) لا تغيّر نصف القطر. */
  if(isArc(w)&&g.k!=="mid"){
   const P=arcParams(w);
   if(!P||P.R<=w.t/2+1){w.a=a0; w.b=b0}
  }
 },
 move(o,dx,dy){
  o.e.a=[o.a[0]+dx,o.a[1]+dy];
  o.e.b=[o.b[0]+dx,o.b[1]+dy];
 },
 del:delWall,
 /* حذف الجدار يحذف فتحاته: الحاضن زال فلا معنى لبقائها،
    ويُبلَّغ العدد لأنه فقدٌ لم تطلبه صراحة */
 cascade(ids){
  const kill=S.opens.filter(o=>ids.has(o.wall));
  S.opens=S.opens.filter(o=>!ids.has(o.wall));
  return {opens:kill.length};
 }});

/* ═══ الفتحة ═══ */
defEnt({k:"open",coll:"opens",n:"فتحة",pre:"O",pick:2,hitO:6,
 bump:"open",
 byId:openById,
 lay:o=>okOf(o.kind).lay,
 /* منطقة الإصابة تختلف عن الشكل: openPt يُزيح بالمحاذاة، ونصفُ
    العرض يدخل في نصف قطر الإصابة — فتُعلَن للفهرس صريحاً */
 hbox(o){
  const w=wallById(o.wall);
  if(!w)return null;
  const [a,b]=span(o);
  const B=bboxOf([openPt(w,a),openPt(w,b),openPt(w,o.s)]);
  if(!B)return null;
  const r=o.w/2;
  return {x0:B.x0-r,y0:B.y0-r,x1:B.x1+r,y1:B.y1+r};
 },
 hit(x,y,T,tol,ok,cand){
  for(const o of (cand||S.opens)){
   if(!ok(o.id))continue;
   const w=wallById(o.wall);
   if(!w)continue;
   const c=openPt(w,o.s);
   if(Math.hypot(x-c[0],y-c[1])<Math.max(o.w/2,T))return o;
  }
  return null;
 },
 shape(o){
  const w=wallById(o.wall);
  if(!w)return null;
  const d=dir(w);
  if(!d)return null;
  const [a,b]=span(o);
  return {t:"seg",
   a:[R(w.a[0]+d.ux*a),R(w.a[1]+d.uy*a)],
   b:[R(w.a[0]+d.ux*b),R(w.a[1]+d.uy*b)]};
 },
 grips(o){
  const w=wallById(o.wall);
  if(!w)return [];
  const [a,b]=span(o);
  return [{p:openPt(w,o.s),k:"c"},
          {p:openPt(w,a),k:"e0"},
          {p:openPt(w,b),k:"e1"}];
 },
 grab:o=>({e:o,s:o.s,w:o.w}),
 drag(o,g,p){
  const op=o.e, w=wallById(op.wall);
  if(!w)return;
  const s=sAt(w,p), L=wallLen(w);
  if(g.k==="c"){
   /* الفترات الحرّة لا الغلاف: السحب لا يعبر فتحةً قائمة.
      يتوقّف عند الحدّ ولا يرفض — التوقّف مرئيٌّ فلا مفاجأة فيه.
      وكان القصّ على [lo,hi] يُنشئ clash في أشهر تفاعلٍ في
      البرنامج، بينما مقبض الحدّ والمُثبِّت وaddOpen يرفضونه. */
   const q=nearestFree(w,op.w,s,op);
   if(q!=null)op.s=q;
   return;
  }
  /* حدّ الفتحة: يغيّر العرض والمركز معاً والطرف الآخر ثابت */
  const fix=(g.k==="e0")?(o.s+o.w/2):(o.s-o.w/2);
  let lo=Math.min(fix,s), hi=Math.max(fix,s);
  lo=Math.max(lo,EDGE); hi=Math.min(hi,L-EDGE);
  if(hi-lo<MINW)return;
  const nw=R(hi-lo), ns=R((lo+hi)/2);
  for(const x of opensOf(w.id)){
   if(x===op)continue;
   const [a,b]=span(x);
   if(ns-nw/2<b-1&&a<ns+nw/2-1)return;
  }
  op.w=nw; op.s=ns;
 },
 move(o,dx,dy){
  /* الفتحة تنزلق على جدارها — الإزاحة تُسقَط على مساره، ثم
     تُقصَر على الفترة الحرّة لا على الغلاف */
  const w=wallById(o.e.wall);
  if(!w)return;
  const d=dir(w);
  if(!d)return;
  const q=nearestFree(w,o.e.w,R(o.s+dx*d.ux+dy*d.uy),o.e);
  if(q!=null)o.e.s=q;
 },
 del:delOpen,
 noDup:1});          /* تُنسَخ مع جدارها لا وحدها */

/* ═══ المنطقة ═══ */
defEnt({k:"area",coll:"areas",n:"منطقة",pre:"A",pick:6,hitO:9,
 bump:"view",
 byId:areaById,
 lay:()=>"A-AREA",
 hit:(x,y,T,tol,ok,cand)=>areaAt(x,y,cand),
 shape:a=>({t:"poly",pts:a.ring}),
 outline:a=>a.ring,
 grips(a){
  const g=[{p:labelPt(a),k:"L"}];
  if(a.ring.length<=40)
   a.ring.forEach((p,i)=>g.push({p:p.slice(),k:"v"+i}));
  return g;
 },
 grab:a=>({e:a,ring:a.ring.map(p=>p.slice()),
  lp:a.lp?a.lp.slice():null, lc:labelPt(a)}),
 drag(o,g,p){
  const a=o.e;
  /* سحب التسمية يجعل موضعها صريحاً، فلا تزحف بعدها أبداً */
  if(g.k==="L"){a.lp=[p[0],p[1]]; return}
  const i=parseInt(g.k.slice(1),10);
  if(!(i>=0&&i<a.ring.length))return;
  a.ring[i]=[p[0],p[1]];
 },
 move(o,dx,dy){
  o.e.ring=o.ring.map(p=>[p[0]+dx,p[1]+dy]);
  if(o.lp)o.e.lp=[o.lp[0]+dx,o.lp[1]+dy];
 },
 del:delArea});

/* ═══ البُعد ═══ */
/* الأبعاد القطرية والزاوية (rad/dia/ang) لا تخزّن a/b — مركزٌ وقائد
   أو رأسٌ وضلعان — فكل مسارٍ هنا يفرّق بينها وبين h/v/al */
const isRA=d=>d&&(d.kind==="rad"||d.kind==="dia"||d.kind==="ang");
const raSegs=d=>{
 if(d.kind==="ang"){
  const g=dimGeomAng(d); if(!g)return [];
  const rd=a=>a*Math.PI/180;
  const at=a=>[g.vertex[0]+Math.cos(rd(a))*g.r,g.vertex[1]+Math.sin(rd(a))*g.r];
  return [[g.vertex,at(g.a0)],[g.vertex,at(g.a1)]];
 }
 const g=dimGeomRad(d); if(!g||!g.leader)return [];
 return [[g.c,g.leader]];
};
defEnt({k:"dim",coll:"dims",n:"بُعد",pre:"D",pick:7,hitO:4,
 bump:"view",
 byId:dimById,
 lay:()=>"A-DIMS",
 hit(x,y,T,tol,ok,cand){
  for(const d of (cand||S.dims)){
   if(!ok(d.id))continue;
   if(isRA(d)){
    if(raSegs(d).some(([a,b])=>nearOnSeg(a,b,x,y).d<T))return d;
    continue;
   }
   const g=dimGeom(d);
   if(g&&nearOnSeg(g.p1,g.p2,x,y).d<T)return d;
  }
  return null;
 },
 shape(d){
  if(isRA(d)){const s=raSegs(d)[0]; return s?{t:"seg",a:s[0],b:s[1]}:null}
  const g=dimGeom(d);
  return g?{t:"seg",a:g.p1,b:g.p2}:null;
 },
 grips:d=>{
  if(d.kind==="ang")return [{p:d.vertex.slice(),k:"vertex"},
   {p:d.p1.slice(),k:"p1"},{p:d.p2.slice(),k:"p2"}];
  if(d.kind==="rad"||d.kind==="dia"){
   const g=[{p:d.c.slice(),k:"c"}];
   if(d.leader)g.push({p:d.leader.slice(),k:"leader"});
   return g;
  }
  return [{p:d.a.slice(),k:"a"},{p:d.b.slice(),k:"b"},
   {p:dimMid(d),k:"pos"}];
 },
 grab:d=>{
  if(d.kind==="ang")return {e:d,kind:d.kind,vertex:d.vertex.slice(),
   p1:d.p1?d.p1.slice():null,p2:d.p2?d.p2.slice():null};
  if(d.kind==="rad"||d.kind==="dia")return {e:d,kind:d.kind,c:d.c.slice(),
   leader:d.leader?d.leader.slice():null};
  return {e:d,kind:d.kind,a:d.a.slice(),b:d.b.slice(),pos:d.pos};
 },
 drag(o,g,p){
  const d=o.e;
  if(d.kind==="ang"){
   const q=[p[0],p[1]];
   if(g.k==="vertex")d.vertex=q; else if(g.k==="p1")d.p1=q; else if(g.k==="p2")d.p2=q;
   /* الزاويتان المخزّنتان تُشتقّان من النقاط — لا تُترَكان قديمتين */
   if(d.p1&&d.p2){
    d.a0=Math.atan2(d.p1[1]-d.vertex[1],d.p1[0]-d.vertex[0])*180/Math.PI;
    d.a1=Math.atan2(d.p2[1]-d.vertex[1],d.p2[0]-d.vertex[0])*180/Math.PI;
   }
   return;
  }
  if(d.kind==="rad"||d.kind==="dia"){
   if(g.k==="c")d.c=[p[0],p[1]]; else d.leader=[p[0],p[1]];
   return;
  }
  if(g.k==="a")d.a=[p[0],p[1]];
  else if(g.k==="b")d.b=[p[0],p[1]];
  else d.pos=posFromPt(d.kind,d.a,d.b,p);
 },
 move(o,dx,dy){
  const d=o.e, sh=q=>[q[0]+dx,q[1]+dy];
  if(d.kind==="ang"){
   d.vertex=sh(o.vertex); if(o.p1)d.p1=sh(o.p1); if(o.p2)d.p2=sh(o.p2);
   return;
  }
  if(d.kind==="rad"||d.kind==="dia"){
   d.c=sh(o.c); if(o.leader)d.leader=sh(o.leader);
   return;
  }
  d.a=[o.a[0]+dx,o.a[1]+dy];
  d.b=[o.b[0]+dx,o.b[1]+dy];
  d.pos=(d.kind==="h")?(o.pos+dy)
   :((d.kind==="v")?(o.pos+dx):o.pos);
 },
 del:delDim});

/* ═══ السقف ═══
   حلقةٌ مغلقة كالمنطقة: يُحدَّد بالنقر داخله (الأصغر مساحةً يفوز
   عند التداخل)، ويُسحَب رأسه، ويُحرَّك كله، ويُحذَف. النوع والميل
   يُعدَّلان بإعادة الرسم حالياً. */
defEnt({k:"roof",coll:"roofs",n:"سقف",pre:"RF",pick:10,hitO:10,
 bump:"view",
 byId:roofById,
 lay:()=>"A-ROOF",
 hit(x,y,T,tol,ok,cand){
  let best=null,ba=1/0;
  for(const r of (cand||S.roofs)){
   if(!ok(r.id)||!pip(r.ring,x,y))continue;
   const ar=Math.abs(pArea(r.ring));
   if(ar<ba){ba=ar;best=r}
  }
  return best;
 },
 shape:r=>({t:"poly",pts:r.ring}),
 outline:r=>r.ring,
 grips:r=>r.ring.length<=40
  ?r.ring.map((p,i)=>({p:p.slice(),k:"v"+i})):[],
 grab:r=>({e:r,ring:r.ring.map(p=>p.slice()),
  ridge:r.ridge?r.ridge.map(p=>p.slice()):null,
  drains:(r.drains||[]).map(p=>p.slice())}),
 drag(o,g,p){
  const r=o.e, i=parseInt(g.k.slice(1),10);
  if(!(i>=0&&i<r.ring.length))return;
  r.ring[i]=[p[0],p[1]];
 },
 move(o,dx,dy){
  const sh=p=>[p[0]+dx,p[1]+dy];
  o.e.ring=o.ring.map(sh);
  if(o.ridge)o.e.ridge=o.ridge.map(sh);
  o.e.drains=o.drains.map(sh);
 },
 del:delRoof});

/* ═══ الخطّ المتعدّد الحرّ ═══
   مفتوحٌ أو مغلق؛ يُحدَّد بالقرب من ضلعه/قوسه (أو داخله إن أُغلق).
   hit يحترم ok(id) — الطبقة المقفلة/المخفيّة لا تُصاب. */
defEnt({k:"pline",coll:"plines",n:"خطّ متعدّد",pre:"PL",pick:11,hitO:11,
 bump:"view",
 byId:plineById,
 lay:()=>"A-PLINE",
 /* الخطّ المفتوح يُصاب على كل قطعةٍ منه لا على وتر طرفيه — كالقائد */
 hbox:plineBox,
 hit:(x,y,T,tol,ok,cand)=>
  plineAt(x,y,(cand||S.plines).filter(p=>ok(p.id)),T),
 shape:p=>p.closed===1&&(p.pts||[]).length>2
  ?{t:"poly",pts:p.pts}:{t:"seg",a:p.pts[0],b:p.pts[p.pts.length-1]},
 outline:p=>p.closed===1?p.pts:null,
 grips:p=>(p.pts||[]).length<=40
  ?p.pts.map((q,i)=>({p:q.slice(),k:"v"+i})):[],
 grab:p=>({e:p,pts:p.pts.map(q=>q.slice())}),
 drag(o,g,p){
  const e=o.e, i=parseInt(g.k.slice(1),10);
  if(i>=0&&i<e.pts.length)e.pts[i]=[p[0],p[1]];
 },
 move(o,dx,dy){
  o.e.pts=o.pts.map(q=>[q[0]+dx,q[1]+dy]);
 },
 del:delPline});

/* ═══ سحابة المراجعة ═══ حلقةٌ مغلقة كالسقف: الأصغر مساحةً يفوز عند التداخل */
defEnt({k:"cloud",coll:"clouds",n:"سحابة مراجعة",pre:"RC",pick:12,hitO:12,
 bump:"view",
 byId:cloudById,
 lay:()=>"A-CLOUD",
 hit:(x,y,T,tol,ok,cand)=>
  cloudAt(x,y,(cand||S.clouds).filter(c=>ok(c.id))),
 shape:c=>({t:"poly",pts:c.ring}),
 outline:c=>c.ring,
 grips:c=>c.ring.length<=40
  ?c.ring.map((p,i)=>({p:p.slice(),k:"v"+i})):[],
 grab:c=>({e:c,ring:c.ring.map(p=>p.slice())}),
 drag(o,g,p){
  const c=o.e, i=parseInt(g.k.slice(1),10);
  if(i>=0&&i<c.ring.length)c.ring[i]=[p[0],p[1]];
 },
 move(o,dx,dy){
  o.e.ring=o.ring.map(p=>[p[0]+dx,p[1]+dy]);
 },
 del:delCloud});

/* ═══ الجدول الموضوع ═══ P-جديد (الأولوية ٧)
   يُحدَّد بحدوده ويُسحَب من مقبضٍ واحدٍ في أصله (أعلى يمينه)، ومقبضٌ
   ثانٍ على حدّه الأيسر يوسّعه. والارتفاعُ لا مقبضَ له لأنه ليس حقلاً:
   هو عددُ الصفوف الحيّة × ارتفاع الصفّ. */
/* الاسمُ «table» لا «tbl»: هو نفسُه في COLL_KIND وفي مُدقِّق V،
   فمصدرٌ واحدٌ للاسم في الثلاثة. وhitO=3.2 بين النصّ (3) والحقل
   الحيّ (3.5): الجدولُ تأشيرٌ يُصاب قبل الغطائيات وبعد النصّ. */
defEnt({k:"table",coll:"tables",n:"جدول",pre:"TB",pick:14,hitO:3.2,
 bump:"view",
 byId:tblById,
 lay:()=>TB_LAY,
 hit:(x,y,T,tol,ok,cand)=>
  tblAt(x,y,(cand||S.tables).filter(t=>ok(t.id))),
 shape:t=>({t:"poly",pts:tblPoly(t)}),
 outline:t=>tblPoly(t),
 grips:t=>{
  const P=tblPoly(t);
  return [{p:[t.x,t.y],k:"c"},{p:P[0].slice(),k:"w"}];
 },
 grab:t=>({e:t,x:t.x,y:t.y,w:t.w}),
 drag(o,g,p){
  const t=o.e;
  if(g.k==="c"){t.x=Math.round(p[0]); t.y=Math.round(p[1]); return}
  /* المقبضُ الأيسر يوسّع: العرضُ من الأصل إلى المؤشّر */
  t.w=clamp(Math.round(t.x-p[0]),TBLIM.col.min,TBLIM.col.max*8);
 },
 move(o,dx,dy){o.e.x=o.x+dx; o.e.y=o.y+dy},
 del:delTable});

/* ═══ الحقل الحيّ ═══ يُحدَّد كنقطةٍ عند موضعه فيُسحَب بمقبض،
   والنصُّ المشتقُّ يبقى cached — التحديثُ بأمرٍ صريحٍ لا بسحب. */
defEnt({k:"live",coll:"livefields",n:"حقل حيّ",pre:"LV",pick:13,hitO:3.5,
 bump:"view",
 byId:liveById,
 lay:()=>"A-ANNO",
 hit(x,y,T,tol,ok,cand){
  for(const f of (cand||S.livefields)){
   if(!ok(f.id))continue;
   if(Math.hypot(x-f.pos[0],y-f.pos[1])<T)return f;
  }
  return null;
 },
 shape:f=>({t:"pt",p:f.pos.slice()}),
 outline:f=>[f.pos.slice()],
 grips:f=>[{p:f.pos.slice(),k:"p"}],
 grab:f=>({e:f,x:f.pos[0],y:f.pos[1]}),
 drag(o,g,p){o.e.pos=[p[0],p[1]]},
 move(o,dx,dy){o.e.pos=[o.x+dx,o.y+dy]},
 del:delLive});

/* ═══ السلسلة ═══ */
defEnt({k:"chain",coll:"chains",n:"سلسلة",pre:"C",pick:8,hitO:5,
 bump:"view",
 byId:chainById,
 lay:()=>"A-DIMS",
 hit(x,y,T,tol,ok,cand){
  for(const c of (cand||S.chains)){
   if(!ok(c.id))continue;
   const B=chainBounds(c);
   if(B.length<2)continue;
   if(nearOnSeg(chainPt(c,B[0]),chainPt(c,B[B.length-1]),x,y).d<T)
    return c;
  }
  return null;
 },
 shape(c){
  const B=chainBounds(c);
  return {t:"seg",a:chainPt(c,B[0]),b:chainPt(c,B[B.length-1])};
 },
 grips(c){
  const B=chainBounds(c);
  return [{p:chainPt(c,B[0]),k:"base"},
          {p:chainPt(c,B[B.length-1]),k:"end"}];
 },
 grab:c=>({e:c,axis:c.axis,base:c.base.slice(),pos:c.pos}),
 drag(o,g,p,dx,dy){
  /* الطرفان يحرّكان السلسلة كاملةً: القيَم مكتوبة ولا تُشَدّ */
  const c=o.e;
  c.base=[o.base[0]+dx,o.base[1]+dy];
  c.pos=(c.axis==="h")?p[1]:p[0];
 },
 move(o,dx,dy){
  o.e.base=[o.base[0]+dx,o.base[1]+dy];
  o.e.pos=(o.e.axis==="h")?(o.pos+dy):(o.pos+dx);
 },
 del:delChain});

/* ═══ التأشير ═══ */
defEnt({k:"anno",coll:"anno",n:"تأشير",pre:"T",pick:9,hitO:3,
 bump:"view",
 byId:annoById,
 lay:()=>"A-ANNO",
 /* القائد يُصاب على كل قطعةٍ من مساره، لا على وترِ طرفيه */
 /* الفقرةُ صندوقٌ لا نقطة: الفهرسُ المكانيُّ يرشّح بالصندوق، ونصٌّ
    من عشرة أسطرٍ يمتدُّ متراً — لو بقي نقطةً لفاته. §٣/١٤ */
 hbox:a=>(a.kind==="lead"||a.kind==="slope")?bboxOf(a.pts)
  :(a.kind==="mtext"?mtBox(a):null),
 hit(x,y,T,tol,ok,cand){
  for(const a of (cand||S.anno)){
   if(!ok(a.id))continue;
   if(a.kind==="mtext"){
    /* داخل الصندوقِ كلِّه: الفقرةُ تُنقَر على أيِّ سطرٍ منها */
    const b=mtBox(a);
    if(x>=b.x0-T&&x<=b.x1+T&&y>=b.y0-T&&y<=b.y1+T)return a;
    continue;
   }
   const p=annoPt(a);
   if(Math.hypot(x-p[0],y-p[1])<T*1.2)return a;
   if(a.kind==="lead"||a.kind==="slope"){
    for(let i=0;i<a.pts.length-1;i++)
     if(nearOnSeg(a.pts[i],a.pts[i+1],x,y).d<T)return a;
   }
  }
  return null;
 },
 shape(a){
  if(a.kind==="lead"||a.kind==="slope")
   return {t:"seg",a:a.pts[0],b:a.pts[a.pts.length-1]};
  if(a.kind==="mtext"){
   const b=mtBox(a);
   return {t:"poly",pts:[[b.x0,b.y0],[b.x1,b.y0],[b.x1,b.y1],[b.x0,b.y1]]};
  }
  return {t:"pt",p:[a.x,a.y]};
 },
 grips(a){
  /* سهمُ الميل: طرفاه — الأعلى والمنحدَر. والجهةُ معنًى لا شكلٌ،
     فسحبُ طرفٍ يقلب اتجاهَ الجريان. */
  if(a.kind==="slope")
   return [{p:a.pts[0].slice(),k:"p0"},{p:a.pts[1].slice(),k:"p1"}];
  if(a.kind==="mtext"){
   /* مقبضانِ: الموضعُ وعرضُ العمود. والعرضُ يُسحَب فيُعاد اللفُّ
      لحظةَ السحب — لا حقلَ يُكتَب في نافذة. */
   const b=mtBox(a);
   return [{p:[a.x,a.y],k:"p"},
    {p:[b.x1,R((b.y0+b.y1)/2)],k:"w"}];
  }
  if(a.kind!=="lead")return [{p:[a.x,a.y],k:"p"}];
  return a.pts.map((p,i)=>({p:p.slice(),k:"p"+i}));
 },
 grab:a=>({e:a,x:a.x,y:a.y,
  pts:a.pts?a.pts.map(p=>p.slice()):null}),
 drag(o,g,p){
  const a=o.e;
  if(a.kind==="mtext"&&g.k==="w"){
   a.wid=clamp(R(p[0]-a.x),200,200000);
   return;
  }
  if(a.kind!=="lead"&&a.kind!=="slope"){a.x=p[0]; a.y=p[1]; return}
  const i=parseInt(g.k.slice(1),10);
  if(i>=0&&i<a.pts.length)a.pts[i]=[p[0],p[1]];
 },
 move(o,dx,dy){
  if(o.pts)o.e.pts=o.pts.map(p=>[p[0]+dx,p[1]+dy]);
  else{o.e.x=o.x+dx; o.e.y=o.y+dy}
 },
 del:delAnno});

/* ═══ العناصرُ الإنشائية ═══ §٣/١٢
   pick=15 و hitO=2.5: بعد العمودِ (2) وقبل الجدار (؟) في الإصابة —
   القاعدةُ تحت العمودِ وأكبرُ منه، فلو سبقته في الترتيب لحجبته عند
   النقر. والبلاطةُ أكبرُ الثلاثةِ فتُصاب أخيراً بحكمِ المضلّع.
   وbump:"geom" لأنّها هيئةٌ تدخل المشهدَ لا تأشيرٌ فوقه. */
defEnt({k:"struct",coll:"struct",n:"عنصر إنشائي",pre:"G",
 pick:15,hitO:2.5,
 bump:"geom",
 byId:strById,
 lay:()=>"A-STRU",
 hbox:e=>strBBox(e),
 hit(x,y,T,tol,ok,cand){
  for(const e of (cand||S.struct)){
   if(!ok(e.id))continue;
   const p=strPoly(e);
   if(p&&pip(p,x,y))return e;
   /* الكمرةُ الضيّقةُ تُصاب على محورها كذلك: عرضُ 100 مم على
      شاشةٍ مصغَّرةٍ أقلُّ من بكسلٍ، فالنقرةُ لا تقع داخلَه */
   if(e.kind==="beam"&&e.a&&e.b
    &&nearOnSeg(e.a,e.b,x,y).d<T)return e;
  }
  return null;
 },
 shape(e){
  const p=strPoly(e);
  return p?{t:"poly",pts:p}:null;
 },
 outline:e=>strPoly(e),
 grips(e){
  const k=strKind(e);
  if(k==="beam")
   return [{p:e.a.slice(),k:"a"},{p:e.b.slice(),k:"b"}];
  if(k==="slab")
   return (e.pts||[]).length<=40
    ?e.pts.map((q,i)=>({p:q.slice(),k:"v"+i})):[];
  const p=strPoly(e);
  const o=[{p:[e.x,e.y],k:"c"}];
  if(p)o.push({p:p[2].slice(),k:"sz"});
  return o;
 },
 grab:e=>({e,x:e.x,y:e.y,w:e.w,h:e.h,
  a:e.a?e.a.slice():null, b:e.b?e.b.slice():null,
  pts:e.pts?e.pts.map(q=>q.slice()):null}),
 drag(o,g,p){
  const e=o.e;
  if(g.k==="a"){e.a=[p[0],p[1]]; return}
  if(g.k==="b"){e.b=[p[0],p[1]]; return}
  if(g.k==="c"){e.x=p[0]; e.y=p[1]; return}
  if(g.k==="sz"){
   /* الحجمُ من الركن: نصفُ الضلعِ هو بُعدُ الركنِ عن المركز */
   e.w=clamp(R(Math.abs(p[0]-e.x)*2),300,12000);
   e.h=clamp(R(Math.abs(p[1]-e.y)*2),300,12000);
   return;
  }
  if(/^v\d+$/.test(g.k||"")&&e.pts){
   const i=parseInt(g.k.slice(1),10);
   if(i>=0&&i<e.pts.length)e.pts[i]=[p[0],p[1]];
  }
 },
 move(o,dx,dy){
  const e=o.e;
  if(o.pts){e.pts=o.pts.map(q=>[q[0]+dx,q[1]+dy]); return}
  if(o.a){e.a=[o.a[0]+dx,o.a[1]+dy]; e.b=[o.b[0]+dx,o.b[1]+dy]; return}
  e.x=o.x+dx; e.y=o.y+dy;
 },
 del:delStruct});

/* ═══ العمود ═══ */
defEnt({k:"col",coll:"cols",n:"عمود",pre:"K",pick:3,hitO:2,
 bump:"geom",
 byId:colById,
 lay:()=>"A-COLS",
 hit(x,y,T,tol,ok,cand){
  for(const c of (cand||S.cols)){
   if(!ok(c.id))continue;
   const p=colPoly(c);
   if(p&&pip(p,x,y))return c;
  }
  return null;
 },
 shape:c=>({t:"poly",pts:colPoly(c)}),
 outline:c=>colPoly(c),
 grips(c){
  const g=[{p:[c.x,c.y],k:"c"}];
  if(c.kind==="circ")g.push({p:[R(c.x+colW(c)/2),c.y],k:"r"});
  else{
   const p=colPoly(c);
   g.push({p:p[2].slice(),k:"sz"});
   g.push({p:[R((p[1][0]+p[2][0])/2),R((p[1][1]+p[2][1])/2)],
    k:"rot"});
  }
  return g;
 },
 grab:c=>({e:c,x:c.x,y:c.y,w:c.w,h:c.h,rot:c.rot}),
 drag(o,g,p){
  const c=o.e;
  if(g.k==="c"){c.x=p[0]; c.y=p[1]; return}
  if(g.k==="r"){
   c.w=clamp(R(Math.hypot(p[0]-c.x,p[1]-c.y)*2),100,4000);
   c.h=c.w; return;
  }
  if(g.k==="rot"){
   c.rot=deg(Math.round(
    Math.atan2(p[1]-c.y,p[0]-c.x)*180/Math.PI*10)/10);
   return;
  }
  /* المقاس من الرُّكن: يُقاس في الإطار المحلّي فلا يتأثّر بالدوران */
  const a=(c.rot||0)*Math.PI/180;
  const dxl=(p[0]-c.x)*Math.cos(a)+(p[1]-c.y)*Math.sin(a);
  const dyl=-(p[0]-c.x)*Math.sin(a)+(p[1]-c.y)*Math.cos(a);
  c.w=clamp(R(Math.abs(dxl)*2),100,4000);
  c.h=clamp(R(Math.abs(dyl)*2),100,4000);
 },
 move(o,dx,dy){o.e.x=o.x+dx; o.e.y=o.y+dy},
 del:delCol,
 dupDrop:["tag"]});   /* الوسم لا يُنسَخ — يُرقَّم */

/* ═══ الأداة الصحية ═══ */
defEnt({k:"fix",coll:"fixt",n:"أداة",pre:"F",pick:4,hitO:1,
 bump:"view",
 byId:fixById,
 /* الطبقةُ من نوع القطعة لا ثابتة: الكهرباءُ على A-ELEC والأثاثُ
    على A-FURN (P-جديد ٥ و٦) — فيُطفَأ أحدُها وحدَه ويُقفَل وحدَه.
    والصحّياتُ على A-FIXT كما كانت حرفاً. */
 lay:f=>fixLay(f),
 hit(x,y,T,tol,ok,cand){
  for(const f of (cand||S.fixt)){
   if(!ok(f.id))continue;
   if(pip(fixPoly(f),x,y))return f;
  }
  return null;
 },
 shape:f=>({t:"poly",pts:fixPoly(f)}),
 outline:f=>fixPoly(f),
 grips(f){
  const P=frameOf(f);
  return [{p:[f.x,f.y],k:"c"},
          {p:P(0,fixD(f)),k:"rot"},
          {p:P(fixW(f)/2,fixD(f)),k:"sz"}];
 },
 grab:f=>({e:f,x:f.x,y:f.y,w:f.w,d:f.d,rot:f.rot}),
 drag(o,g,p){
  const f=o.e;
  if(g.k==="c"){f.x=p[0]; f.y=p[1]; return}
  if(g.k==="rot"){
   f.rot=deg(Math.round(
    (Math.atan2(p[1]-f.y,p[0]-f.x)*180/Math.PI-90)*10)/10);
   return;
  }
  const a=(f.rot||0)*Math.PI/180;
  const u=(p[0]-f.x)*Math.cos(a)+(p[1]-f.y)*Math.sin(a);
  const v=-(p[0]-f.x)*Math.sin(a)+(p[1]-f.y)*Math.cos(a);
  f.w=clamp(R(Math.abs(u)*2),80,4000);
  f.d=clamp(R(Math.abs(v)),80,4000);
 },
 move(o,dx,dy){o.e.x=o.x+dx; o.e.y=o.y+dy},
 del:delFix});

/* ═══ مثيلُ الكتلة ═══ (خطّة 1.1.0 · البند ج)
   كان S.blocks يُرسَم ويُصدَّر ولا يُلمَس: لا إصابةَ ولا تحديدَ ولا مقابضَ
   ولا حذف — و«تفكيك» بنى إصابتَه وحدَه. الآن سطرٌ هنا فيراه كلُّ شيء:
   النقرُ · التحديدُ بالمستطيل · المقابضُ · Delete · النقلُ والنسخُ (grab/move)،
   والدورانُ والمرآةُ والمقياسُ في core/modify.js بفرعٍ صريح.
   الدورانُ هنا **بالراديان** كما يقرؤه xform في blocks.js (لا بالدرجات كالقطع).
   ولا يدخل COLLS: blocks مفتاحٌ مستقلٌّ في KEYS يُحفَظ ويُطبَّع ويُفحَص تكرارُه
   صريحاً (state.js)، وإدخالُه هناك يكرّره. */
defEnt({k:"blk",coll:"blocks",n:"كتلة",pre:"b",pick:16,hitO:1.5,
 bump:"view",
 byId:id=>(S.blocks||[]).find(b=>b&&b.id===id)||null,
 lay:b=>(b&&b.layer)||BLK_LAY,
 hit(x,y,T,tol,ok,cand){
  let best=null, bd=Math.max(60,T||150);
  for(const b of (cand||S.blocks||[])){
   if(!ok(b.id))continue;
   const d=instDist(b,x,y);
   if(d<bd){bd=d; best=b}
  }
  return best;
 },
 shape:b=>({t:"poly",pts:instPoly(b)}),
 outline:b=>instPoly(b),
 grips(b){
  const P=instPoly(b), h=Math.max(300,Math.hypot(P[2][0]-P[0][0],P[2][1]-P[0][1])/2);
  const a=+b.rot||0;
  return [{p:[b.x,b.y],k:"c"},
          {p:[R(b.x+h*Math.cos(a)),R(b.y+h*Math.sin(a))],k:"rot"},
          {p:P[2],k:"sz"}];
 },
 grab:b=>({e:b,x:b.x,y:b.y,rot:+b.rot||0,scale:+b.scale||1,
  scaleX:+b.scaleX||1,scaleY:+b.scaleY||1,mirror:b.mirror?1:0,
  sz0:Math.max(1,Math.hypot(instPoly(b)[2][0]-b.x,instPoly(b)[2][1]-b.y))}),
 drag(o,g,p){
  const b=o.e;
  if(g.k==="c"){b.x=p[0]; b.y=p[1]; return}
  if(g.k==="rot"){
   /* لعُشرِ درجة كما في القطع، ثم إلى راديان */
   const d=Math.round(Math.atan2(p[1]-b.y,p[0]-b.x)*1800/Math.PI)/10;
   b.rot=d*Math.PI/180; return;
  }
  const k=Math.hypot(p[0]-b.x,p[1]-b.y)/o.sz0;
  b.scale=clamp(Math.round(o.scale*k*1000)/1000,0.01,100);
 },
 move(o,dx,dy){o.e.x=o.x+dx; o.e.y=o.y+dy},
 del(b){
  const i=(S.blocks||[]).indexOf(b);
  if(i<0)return false;
  S.blocks.splice(i,1);
  return true;
 }});

/* ═══ الدرج ═══ */
defEnt({k:"stair",coll:"stairs",n:"درج",pre:"S",pick:5,hitO:8,
 bump:"view",
 byId:stById,
 lay:()=>"A-STRS",
 hit(x,y,T,tol,ok,cand){
  for(const t of (cand||S.stairs)){
   if(!ok(t.id))continue;
   if(stPolys(t).some(p=>p&&pip(p,x,y)))return t;
  }
  return null;
 },
 shape(t){
  const p=stOutline(t);
  return p?{t:"poly",pts:p}:null;
 },
 outline:t=>stOutline(t),
 /* المقابض: a وb للرحلة 1 · a1 وb1 للرحلة 2 · mid يحرّك الدرج كلَّه ·
    w عرضُه. في L نقطة نهاية الرحلة 1 هي بداية الرحلة 2 فتتحرّكان معاً
    ولا يُعرَض مقبضٌ ثانٍ لبدايتها. */
 grips(t){
  const gs=stGeoms(t);
  if(!gs.length)return [];
  const o=[{p:gs[0].a.slice(),k:"a"},{p:gs[0].b.slice(),k:"b"}];
  if(gs[1]){
   if(stType(t)==="U")o.push({p:gs[1].a.slice(),k:"a1"});
   o.push({p:gs[1].b.slice(),k:"b1"});
  }
  o.push({p:gs[0].P(gs[0].L/2,0),k:"mid"},
         {p:gs[0].P(gs[0].L/2,gs[0].hw),k:"w"});
  return o;
 },
 grab:t=>({e:t,w:t.w,type:t.type,
  fl:t.flights.map(f=>({a:f.a.slice(),b:f.b.slice(),n:f.n}))}),
 drag(o,g,p,dx,dy){
  const t=o.e, F=t.flights, q=[p[0],p[1]];
  const L=(t.type==="L");
  if(g.k==="a"){F[0].a=q; return}
  if(g.k==="b"){F[0].b=q; if(L&&F[1])F[1].a=q.slice(); return}
  if(g.k==="a1"&&F[1]){F[1].a=q; return}
  if(g.k==="b1"&&F[1]){F[1].b=q; return}
  if(g.k==="mid"){
   F.forEach((f,i)=>{
    f.a=[o.fl[i].a[0]+dx,o.fl[i].a[1]+dy];
    f.b=[o.fl[i].b[0]+dx,o.fl[i].b[1]+dy];
   });
   return;
  }
  const G=stGeom({flights:[{a:o.fl[0].a,b:o.fl[0].b,n:o.fl[0].n}],w:o.w});
  if(!G)return;
  const v=(p[0]-o.fl[0].a[0])*G.nx+(p[1]-o.fl[0].a[1])*G.ny;
  t.w=clamp(R(Math.abs(v)*2),SMIN_W,6000);
 },
 move(o,dx,dy){
  o.e.flights.forEach((f,i)=>{
   f.a=[o.fl[i].a[0]+dx,o.fl[i].a[1]+dy];
   f.b=[o.fl[i].b[0]+dx,o.fl[i].b[1]+dy];
  });
 },
 del:delStair});

/* ═══ الترتيبان ═══ تُبنى مرّةً بعد الإعلان كلّه ═══ */
const V=Object.keys(ENT).map(k=>ENT[k]);
export const ORD =V.slice().sort((a,b)=>a.pick-b.pick);
export const HORD=V.slice().sort((a,b)=>a.hitO-b.hitO);
export const KINDS=ORD.map(d=>d.k);
export const COLL=ORD.reduce((o,d)=>{o[d.k]=d.coll; return o},{});
export const NAME=ORD.reduce((o,d)=>{o[d.k]=d.n;    return o},{});
export const entDef=k=>ENT[k]||null;
