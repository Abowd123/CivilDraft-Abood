/* ═══ جدولٌ موضوعٌ على الورقة — TB ═══ P-جديد (الأولوية ٧)
   كان جدولُ الفتحات وجدولُ المساحات يُعرَضان في لوحٍ ويُصدَّران CSV
   وPDF — ولا يمكن **وضعُ** جدولٍ في الرسم. وجدولُ الأبواب والنوافذ
   عنصرٌ إلزاميٌّ في أيِّ تسليمٍ معماريّ.

   القرارُ المركزيّ: **لا نسخةَ مخزَّنة.** الجدولُ يحفظ نوعَه وموضعَه
   ومقاسَه فقط، وصفوفُه تُقرأ حيّةً من `openSchedule()`/`schedule()`
   عند كلِّ رسمٍ وتصدير — كما يفعل جدولُ الفتحات أصلاً («تقريرٌ
   يُجمَع عند العرض: لا حقل يُخزَّن على الفتحة»). فبابٌ يتغيّر عرضُه
   يتغيّر في الجدول فوراً، ولا جدولَ يكذب على الرسم أبداً.

   والمخرَجُ خطوطٌ ونصوصٌ عاديةٌ على A-ANNO، فيُصدَّر في DXF وPDF وSVG
   وPNG بلا كودٍ جديدٍ في أيِّ مُصدِّر.

   والارتفاعُ ليس حقلاً: هو حصيلةُ عددِ الصفوفِ الحيّةِ × ارتفاعِ الصفّ.
   فحقلُ ارتفاعٍ مخزَّنٌ كان سيكذب لحظةَ يُضاف باب. */
import {S,touchView} from "./state.js";
import {V} from "./validate.js";
import {newId,clamp,m2,m3,sqm} from "./units.js";
import {bboxOf,pip} from "./geom.js";
import {normLevel} from "./level.js";
import {TBDEF,TBLIM} from "./tabledef.js";
import {openSchedule,okOf} from "./opens.js";
import {schedule as areaSchedule} from "./areas.js";
import {resolve,isInternal,layLabel,vis,plots} from "./layers.js";
import {FK,fixPrims,fixLay} from "./fixt.js";
import {colPoly,CK,CT} from "./cols.js";
import {explode,getBlock} from "./blocks.js";
import {levelScope,levelOf} from "./level.js";
import {ORDER as LAYORDER,DESC as LAYDESC} from "./laydef.js";

const R=v=>Math.round(v);
export const TB_LAY="A-ANNO";
/* الأعمدةُ والعناوينُ والحدودُ في الورقة tabledef.js (بلا دورة)،
   وهنا قارئُ الصفوف الحيّ وحدَه — فلا دورةَ استيرادٍ مع state.js. */
export {TBLIM,TBKINDS} from "./tabledef.js";


/* ═══ الأنواع ═══ مصنعُ الأعمدة من الورقة + مصدرُ صفوفٍ حيّ ═══ */
export const TBK={
 open:{
  n:TBDEF.open.n,
  cols:TBDEF.open.cols,
  rows(){
   const S2=openSchedule();
   return S2.rows.map(r=>[r.mark, okOf(r.kind).n||r.kind,
    m3(r.w), m3(r.h), r.sill?m3(r.sill):"—", String(r.n)]);
  },
  foot(){
   const S2=openSchedule();
   return ["الإجمالي","",""," ","",String(S2.total)];
  }
 },
 area:{
  n:TBDEF.area.n,
  cols:TBDEF.area.cols,
  rows(){
   const S2=areaSchedule();
   return S2.rows.map(r=>[r.name+(r.stale?" (قديمة)":""),
    sqm(r.ar), m2(r.pr)]);
  },
  foot(){
   const S2=areaSchedule();
   return ["الإجمالي",sqm(S2.total),""];
  }
 }
 ,
 /* ═══ المفتاح ═══ §٣/١٣ صفوفٌ حيّةٌ من جدولِ الطبقات:
    **الظاهرةُ المستعملةُ وحدَها**. طبقةٌ مُطفأةٌ ليست في المخطَّط فلا
    تُذكَر، وطبقةٌ ظاهرةٌ بلا عنصرٍ واحدٍ تُربك من يبحث عنها. فالمفتاحُ
    يصف ما يُرى لا ما يُمكن أن يُرى. */
 legend:{
  n:TBDEF.legend.n,
  cols:TBDEF.legend.cols,
  sw:TBDEF.legend.sw,
  rows(){
   return legendRows().map(r=>["",r.lay,r.desc]);
  },
  foot(){
   const n=legendRows().length;
   return ["",`${n} طبقةً`,""];
  },
  /* العيّنةُ: لونُ الطبقةِ ونمطُها — تقرؤها tablePrims */
  swatch(i){
   const R2=legendRows();
   return R2[i]?{lay:R2[i].lay,dash:R2[i].dash}:null;
  }
 }};
/* ═══ صفوفُ المفتاح ═══ §٣/١٣
   **الظاهرةُ المستعملةُ وحدَها.** ثلاثةُ قيودٍ، لكلٍّ سببُه:
   ١) المُطفأةُ تخرج: ليست في المخطَّطِ فذِكرُها كذب.
   ٢) الفارغةُ تخرج: طبقةٌ ظاهرةٌ بلا عنصرٍ واحدٍ تُربك من يبحث عنها
      في الرسمِ ولا يجدها. والاستعمالُ يُقاس من أوّلياتِ المشهد —
      وهي الحقيقةُ الوحيدةُ عمّا يُرسَم فعلاً.
   ٣) الداخليةُ (__) تخرج: ليست للمستخدم.
   والترتيبُ ترتيبُ `ORDER` في laydef لا ترتيبُ الظهور: الإنشائيُّ
   أوّلاً ثم الفتحاتُ ثم التأشير — فالمفتاحُ يُقرَأ كفهرسٍ لا كسجلّ. */
let USEHOOK=null;
export const setLegendUsage=f=>{USEHOOK=(typeof f==="function")?f:null};
export function legendRows(){
 /* الاستعمالُ يُقرأ بخُطّافٍ لا باستيراد: `render.js` يستورد هذا
    الملفَّ (tablePrims)، فاستيرادُ `scene()` منه دورةٌ تُسقِط الوحدة.
    فالراسمُ يركّب القارئَ وهو يملك المشهد. وغيابُه يعني «لا أعرف ما
    استُعمِل» فيُعرَض كلُّ ظاهرٍ — تدهورٌ مُعلَنٌ لا صمتٌ. */
 const used=USEHOOK?USEHOOK():null;
 const out=[];
 LAYORDER.forEach(n=>{
  if(isInternal(n))return;
  if(used&&!used.has(n))return;
  const r=resolve(n);
  if(!r||r.off)return;
  out.push({lay:layLabel(n)||n,
   desc:LAYDESC[n]||"",
   dash:(r.dash&&r.dash.length)?r.dash.slice():[],
   css:r.css, lw:r.lw});
 });
 return out;
}

/* ═══ صفوفُ مفتاح الرموز ═══ (1.1.0 · د)
   كلُّ صفٍّ: {key, name, n, lay, icon()}. والأيقونةُ دالّةٌ تُعيد أوّلياتٍ
   محلّيةً حول (0،0) — تُصغَّر وتُوضَع في الخليّة عند الرسم.
   ثلاثةُ قيود، لكلٍّ سببُه:
   ١) الطبقةُ ظاهرةٌ **وتُطبَع** (vis && plots) — ما لا يُطبَع لا يُشرَح على الورقة.
   ٢) نطاقُ الطابق كالمشهد (`levelScope`) — المفتاحُ يصف ما يُرسَم الآن.
      والكتلُ بلا طابقٍ كما يرسمها المشهدُ (blockBand) فلا تُرشَّح.
   ٣) `only` (اختياريّ) طبقةٌ واحدة: مفتاحُ كهرباءٍ مستقلٌّ لورقة الكهرباء.
   والترتيب: صحّيات ⇐ أثاث ⇐ كهرباء ⇐ فتحات ⇐ أعمدة ⇐ كتل، ثم بالاسم. */
const SYMORD=["A-FIXT","A-FURN","A-ELEC","A-DOOR","A-GLAZ","A-COLS"];
const printable=L=>!!L&&!isInternal(L)&&vis(L)&&plots(L);
const blkPrims=inst=>explode(inst).map(g=>
 g.t==="line"?{t:"line",L:g.layer,a:g.a,b:g.b}
 :g.t==="pline"?{t:"poly",L:g.layer,pts:g.pts,cl:g.closed?1:0}
 :g.t==="arc"?{t:"arc",L:g.layer,cx:g.cx,cy:g.cy,r:g.r,a0:g.a0,a1:g.a1}:null).filter(Boolean);
/* رمزُ الفتحة: لا جدارَ في الخليّة فيُرسَم رمزُها القياسيّ مصغّراً —
   البابُ ورقةٌ وقوسُ فتح، والشبّاكُ ثلاثةُ خطوطٍ متوازية */
function openIcon(kind,L){
 const k=OK_SW(kind);
 if(k==="sw")return [{t:"line",L,a:[0,0],b:[0,900]},
  {t:"arc",L,cx:0,cy:0,r:900,a0:0,a1:90}];
 if(k==="pan")return [0,60,120].map(y=>({t:"line",L,a:[0,y],b:[900,y]}));
 return [{t:"line",L,a:[0,0],b:[900,0]},{t:"line",L,a:[0,80],b:[900,80]}];
}
const OK_SW=kind=>{const o=okOf(kind); return o.sw?"sw":(o.pan?"pan":"x")};
export function symRows(only){
 const LS=levelScope(S);
 const inLv=e=>LS==null||levelOf(e)===LS;
 const want=L=>printable(L)&&(!only||only===L);
 const M=new Map();
 const put=(key,name,lay,icon,ord)=>{
  let r=M.get(key);
  if(!r){r={key,name,lay,n:0,icon,ord}; M.set(key,r)}
  r.n++;
 };
 (S.fixt||[]).forEach(f=>{
  const L=fixLay(f);
  if(!inLv(f)||!want(L))return;
  const K=f.kind, d=FK[K]||{};
  put("fix:"+K,d.n||K,L,
   ()=>fixPrims({id:"__ic",kind:K,x:0,y:0,rot:0,w:d.w,d:d.d}),SYMORD.indexOf(L));
 });
 (S.opens||[]).forEach(o=>{
  const L=okOf(o.kind).lay;
  if(!inLv(o)||!want(L))return;
  put("open:"+o.kind,okOf(o.kind).n,L,()=>openIcon(o.kind,L),SYMORD.indexOf(L));
 });
 (S.cols||[]).forEach(c=>{
  const L="A-COLS";
  if(!inLv(c)||!want(L))return;
  const kind=CK[c.kind]?c.kind:"rect", type=CT[c.type]?c.type:"conc";
  put(`col:${kind}:${type}`,`عمود ${CT[type]} ${CK[kind]}`,L,
   ()=>[{t:"poly",L,pts:colPoly({kind,x:0,y:0,w:400,h:400,rot:0}),cl:1}],SYMORD.indexOf(L));
 });
 (S.blocks||[]).forEach(b=>{
  const L=b.layer||"A-BLKS";
  if(!want(L)||!getBlock(b.block))return;
  const def=getBlock(b.block);
  put("blk:"+b.block,def.title||b.block,L,
   ()=>blkPrims({block:b.block,x:0,y:0,rot:0,scale:1,scaleX:1,scaleY:1,mirror:0}),99);
 });
 return [...M.values()].sort((a,b)=>
  ((a.ord<0?50:a.ord)-(b.ord<0?50:b.ord))||a.name.localeCompare(b.name,"ar"));
}
/* حدودُ أوّلياتٍ محلّية — الأقواسُ بنقاطها لا بمربّعها الكامل */
function primBox(G){
 const P=[];
 G.forEach(g=>{
  if(g.t==="line")P.push(g.a,g.b);
  else if(g.t==="poly")g.pts.forEach(p=>P.push(p));
  else if(g.t==="arc"){
   const a0=+g.a0||0, a1=(g.a1==null)?360:+g.a1;
   for(let i=0;i<=12;i++){const t=(a0+(a1-a0)*i/12)*Math.PI/180;
    P.push([g.cx+g.r*Math.cos(t),g.cy+g.r*Math.sin(t)])}
  }
 });
 return P.length?bboxOf(P):null;
}
/* يُصغِّر أوّلياتٍ إلى صندوقٍ (مركز cx،cy · نصف عرضٍ hw · نصف ارتفاعٍ hh)
   بنسبةٍ واحدة للمحورين — الرمزُ لا يُمطّ. تُصدَّر للاختبار. */
export function fitIcon(G,cx,cy,hw,hh,tid){
 const b=primBox(G);
 if(!b)return [];
 const bw=Math.max(1,b.x1-b.x0), bh=Math.max(1,b.y1-b.y0);
 const k=Math.min(2*hw/bw,2*hh/bh);
 const mx=(b.x0+b.x1)/2, my=(b.y0+b.y1)/2;
 const T=([x,y])=>[R(cx+(x-mx)*k),R(cy+(y-my)*k)];
 return G.map(g=>{
  const o={t:g.t,L:g.L,tid};
  if(g.t==="line"){o.a=T(g.a); o.b=T(g.b)}
  else if(g.t==="poly"){o.pts=g.pts.map(T); o.cl=g.cl}
  else if(g.t==="arc"){const c=T([g.cx,g.cy]); o.cx=c[0]; o.cy=c[1];
   o.r=Math.max(1,R(g.r*k)); o.a0=g.a0; o.a1=g.a1}
  else return null;
  return o;
 }).filter(Boolean);
}
TBK.sym={
 n:TBDEF.sym.n,
 cols:TBDEF.sym.cols,
 ic:TBDEF.sym.ic,
 rows(t){return symRows(t&&t.lay).map(r=>["",r.name,String(r.n),layLabel(r.lay)||r.lay])},
 foot(t){
  const R2=symRows(t&&t.lay);
  return ["","الإجمالي",String(R2.reduce((s,r)=>s+r.n,0)),
   (t&&t.lay)?(layLabel(t.lay)||t.lay):"كلّ الطبقات"];
 },
 icon(i,t){const r=symRows(t&&t.lay)[i]; return r?r.icon():null}
};

export const tbkOf=k=>TBK[k]||TBK.open;
export const tblById=id=>S.tables.find(t=>t.id===id)||null;
export const tblName=t=>tbkOf(t&&t.kind).n;

/* ═══ المقاس ═══ محسوبٌ لا مخزَّن: الصفوفُ حيّة ═══ */
export function tableRows(t){
 const d=tbkOf(t&&t.kind);
 let rows=[];
 try{rows=d.rows(t)||[]}catch(e){rows=[]}
 const cut=Math.max(0,rows.length-TBLIM.rows.max);
 if(cut)rows=rows.slice(0,TBLIM.rows.max);
 return {rows,cut};
}
export function tableSize(t){
 const d=tbkOf(t&&t.kind);
 const w=Math.max(TBLIM.col.min,+t.w||20000);
 const rh=clamp(R(+t.rh||3000),TBLIM.row.min,TBLIM.row.max);
 const {rows,cut}=tableRows(t);
 /* ترويسةٌ + صفوفٌ + تذييلٌ واحد */
 const n=1+rows.length+1;
 return {w, rh, h:rh*n, nrows:rows.length, cut, cols:d.cols};
}
export function tblPoly(t){
 const z=tableSize(t);
 /* الأصل أعلى يمين الجدول: العربيةُ تُقرأ من اليمين، والنموُّ نزولاً */
 const x1=R(t.x), x0=R(t.x-z.w), y1=R(t.y), y0=R(t.y-z.h);
 return [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
}
export const tblBBox=t=>bboxOf(tblPoly(t));
export const tblAt=(x,y,list)=>{
 let best=null,ba=1/0;
 (list||S.tables).forEach(t=>{
  const P=tblPoly(t);
  if(!pip(P,x,y))return;
  const b=bboxOf(P);
  const a=(b.x1-b.x0)*(b.y1-b.y0);
  if(a<ba){ba=a;best=t}
 });
 return best;
};

export function addTable(kind,p,ex){
 V("table",{kind,p});
 const K=TBK[kind]?kind:"open";
 const e=ex||{};
 const t={id:newId("TB"), kind:K,
  x:R(p[0]), y:R(p[1]),
  w:clamp(R(+e.w||20000),TBLIM.col.min,TBLIM.col.max*8),
  rh:clamp(R(+e.rh||3000),TBLIM.row.min,TBLIM.row.max),
  level:normLevel(S.meta.level)};
 if(K==="sym"&&typeof e.lay==="string"&&e.lay)t.lay=e.lay;   /* مفتاحُ طبقةٍ واحدة */
 S.tables.push(t); touchView();
 return t;
}
export function delTable(t){
 const i=S.tables.indexOf(t);
 if(i<0)return false;
 S.tables.splice(i,1); touchView();
 return true;
}

/* ═══ الأوّليات ═══ خطوطٌ ونصوصٌ فقط: كلُّ مُصدِّرٍ يعرفها سلفاً.
   وارتفاعُ الكتابة من ارتفاع الصفّ لا من txtMM: جدولٌ صغيرٌ يحمل
   كتابةً صغيرة، وإلّا خرج النصُّ من خليّته. */
export function tablePrims(t,hDefault){
 const L=TB_LAY, out=[];
 const z=tableSize(t);
 const d=tbkOf(t.kind);
 const {rows,cut}=tableRows(t);
 const x1=R(t.x), x0=R(t.x-z.w), y1=R(t.y);
 const LN=(a,b)=>out.push({t:"line",L,a,b,tid:t.id});
 const TX=(x,y,s,h,al)=>out.push({t:"text",L,s:String(s),
  x:R(x),y:R(y),h:R(h),al:al||"mc",tid:t.id});
 const th=Math.max(1,R(z.rh*0.46));
 const pad=R(z.rh*0.18);
 /* حدودُ الأعمدة من اليمين (الأصل) إلى اليسار */
 const edges=[x1];
 let acc=0;
 d.cols.forEach(([,frac])=>{acc+=frac; edges.push(R(x1-z.w*acc))});
 const nL=1+rows.length+1;
 /* الإطارُ وخطوطُ الصفوف */
 for(let i=0;i<=nL;i++){
  const y=R(y1-z.rh*i);
  LN([x0,y],[x1,y]);
 }
 edges.forEach(x=>LN([x,R(y1-z.rh*nL)],[x,y1]));
 /* العنوانُ فوق الجدول — لا داخلَه، فلا يأكل صفّاً */
 TX(R((x0+x1)/2), R(y1+z.rh*0.35), tblName(t),
  Math.max(1,R(z.rh*0.6)), "bc");
 /* الترويسة */
 const cellX=i=>R((edges[i]+edges[i+1])/2);
 d.cols.forEach(([h],i)=>TX(cellX(i), R(y1-z.rh*0.5-th*0.35), h, th));
 /* الصفوف */
 rows.forEach((r,ri)=>{
  const y=R(y1-z.rh*(ri+1.5)-th*0.35);
  r.forEach((c,ci)=>{ if(ci<d.cols.length)TX(cellX(ci),y,c,th) });
  /* ═══ العيّنةُ المرسومة ═══ §٣/١٣
     مفتاحٌ يكتب «خطٌّ متقطّع» بدل أن يرسمه ليس مفتاحاً. فعمودٌ
     معلَنٌ بـ`sw` يحمل خطّاً **على طبقةِ الصفِّ نفسِها** — فينال
     لونَها ووزنَها ونمطَها من المُصفِّي مجّاناً، في الشاشةِ وفي
     كلِّ مُصدِّر. ولا لونَ يُكتَب هنا بيدٍ: لونٌ منسوخٌ يتخلّف عن
     الطبقةِ لحظةَ تُغيَّر. */
  if(d.sw!=null&&typeof d.swatch==="function"){
   const sw=d.swatch(ri);
   if(sw&&sw.lay){
    const i=d.sw;
    const yc=R(y1-z.rh*(ri+1.5));
    const pad2=R((edges[i]-edges[i+1])*0.18);
    const xa=R(edges[i+1]+pad2), xb=R(edges[i]-pad2);
    const g={t:"line",L:sw.lay,a:[xa,yc],b:[xb,yc],tid:t.id};
    if(sw.dash&&sw.dash.length)g.dash=sw.dash.slice();
    out.push(g);
   }
  }
  /* ═══ الأيقونة ═══ (1.1.0 · د) أوّلياتُ القطعةِ نفسِها مصغّرةً إلى
     ٧٠٪ من الخليّة، على طبقتها هي فتنال لونَها ونمطَها كالعيّنة */
  if(d.ic!=null&&typeof d.icon==="function"){
   let G=null;
   try{G=d.icon(ri,t)}catch(e){G=null}
   if(G&&G.length){
    const i=d.ic;
    const hw=(edges[i]-edges[i+1])*0.35, hh=z.rh*0.35;
    fitIcon(G,(edges[i]+edges[i+1])/2,y1-z.rh*(ri+1.5),hw,hh,t.id)
     .forEach(g=>out.push(g));
   }
  }
 });
 /* التذييل */
 let foot=[];
 try{foot=d.foot(t)||[]}catch(e){foot=[]}
 const fy=R(y1-z.rh*(rows.length+1.5)-th*0.35);
 foot.forEach((c,ci)=>{ if(ci<d.cols.length&&c)TX(cellX(ci),fy,c,th) });
 /* القصُّ يُقال لا يُخفى */
 if(cut)
  TX(R((x0+x1)/2), R(y1-z.rh*nL-z.rh*0.5), `…و${cut} صفّاً فوق الحدّ`,
   th, "mc");
 return out;
}
export const tblLabel=t=>`${tblName(t)} (${tableSize(t).nrows} صفّاً)`;
