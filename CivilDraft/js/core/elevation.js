/* ═══ الواجهات (Elevation) ═══
   وحدةٌ هندسية بحتة: لا Canvas ولا DOM ولا مؤقّتات ولا كاشَ نسخة —
   تُسأل فتجيب. ولا يستدعيها مشهدٌ ولا إطار: الواجهة تُولَّد بأمر
   ELEV صريحاً وحده، فلا يتحرّك شيء إلا بأمرك. وإن تبدّل المخطّط
   بعدها بقيت الواجهة كما وُلدت، ويُبلَّغ أنها أقدم من الحالة
   (elevStale) — تقريرٌ لا إصلاح، كحال openState وبصمة المناطق.

   ولا يُكتَب في S حرفٌ واحد: التوليد قراءةٌ محضة، فلا يمرّ بـedit()
   ولا يدخل التاريخ ولا يستدعي حفظاً.

   المخرَج مسطّح: {kind:"rect", x,y,w,h, layer} بالمليمتر.
     x من يسار الواجهة إلى يمينها كما يراها الناظر
     y من منسوب الأرض صاعداً (y‑up كالـDXF)
   فالمصدِّر يقلب المحور إن احتاج، ولا يُقلَب هنا مرّتين. */
import {S,VER} from "./state.js";
import {clamp,deg,m2,dm2} from "./units.js";
import {dir,wallLen,isLow,lowH,isArc} from "./walls.js";
import {opensOf,isPart,openState} from "./opens.js";
import {levelOf,activeLevel,levelTag,normLevel} from "./level.js";

const R=v=>Math.round(v);
const D2R=Math.PI/180;

export const ELAY="A-ELEV";
export const TOL=45;                 /* نصف نطاق القبول بالدرجات */
export const VIEWS={E:0,N:90,W:180,S:270};
export const VNAME={E:"الواجهة الشرقية",N:"الواجهة الشمالية",
 W:"الواجهة الغربية",S:"الواجهة الجنوبية"};

export const angDiff=(a,b)=>((a-b)%360+540)%360-180;

export function viewAngle(v){
 if(typeof v==="number"&&isFinite(v))return deg(v);
 const k=String(v==null?"":v).trim().toUpperCase();
 if(VIEWS[k]!=null)return deg(VIEWS[k]);
 const n=parseFloat(k);
 if(isFinite(n))return deg(n);
 throw new Error(`اتجاه نظر غير مفهوم: «${v}» — `
  +`استعمل N أو S أو E أو W أو زاويةً بالدرجات`);
}
export function viewName(a){
 const A=deg(a);
 for(const k of Object.keys(VIEWS))
  if(Math.abs(angDiff(VIEWS[k],A))<0.5)return VNAME[k];
 return `واجهة بزاوية ${R(A)}°`;
}

/* ═══ جهة الخارج ═══
   تُستنتَج من مركز ثقل أوساط الجدران الخارجية موزوناً بأطوالها؛
   الناظم الخارجي هو المبتعد عن هذا المركز. استنتاجُ عرضٍ لا تعديلَ
   بيانات — لا يُكتَب في S. */
export function extRef(list){
 let sx=0, sy=0, sl=0;
 (list||S.walls).forEach(w=>{
  if(w.type!=="ext")return;
  const L=wallLen(w);
  if(L<1e-6)return;
  sx+=((w.a[0]+w.b[0])/2)*L; sy+=((w.a[1]+w.b[1])/2)*L; sl+=L;
 });
 return sl?[sx/sl,sy/sl]:null;
}
export function outNormal(w,ref){
 const d=dir(w);
 if(!d)return null;
 const l={x:d.nx,y:d.ny,ang:deg(d.ang+90)};
 const r={x:-d.nx,y:-d.ny,ang:deg(d.ang-90)};
 if(!ref)return {n:l,alt:r,sure:0};
 const mx=(w.a[0]+w.b[0])/2-ref[0], my=(w.a[1]+w.b[1])/2-ref[1];
 const p=mx*l.x+my*l.y;
 if(Math.abs(p)<Math.max(1,w.t/2))return {n:l,alt:r,sure:0};
 return (p>0)?{n:l,alt:r,sure:1}:{n:r,alt:l,sure:1};
}

/* ═══ إطار النظر ═══
   v اتجاه النظر · rt يمين الناظر (محور التوزيع الأفقي).
   ويُبنى من زاويةٍ لا من نقطتين: المقطع يشتقّ زاويته من خطّ قطعه
   ثم ينادي هذه — فالإطار واحدٌ للاثنين. */
export function viewFrame(view){
 const a=viewAngle(view);
 const vx=Math.cos(a*D2R), vy=Math.sin(a*D2R);
 return {ang:a, v:{x:vx,y:vy}, rt:{x:-vy,y:vx}};
}

/* ═══ الإسقاط ═══ مشتركٌ بين الواجهة والمقطع ═══
   يُسقط جداراً واحداً في إطار النظر ولا يقرّر شيئاً: لا يصفّي بنوعٍ
   ولا بزاويةٍ ولا بمسافة — القرار عند المستدعي. */
export function projectWall(w,F,ref,i){
 /* الجدار القوسي مستبعَدٌ بقصد. إسقاطه كوترٍ مستقيمٍ يعطي مستطيلاً
    في غير موضعه بمقاييسَ خاطئة (ربعُ دائرةٍ نصفُ قطرها ١ م: منتصفُ
    القوس على بعد ٢٩٣ مم من الوتر). فلا إسقاطٌ خاطئ صامت: يُبلَّغ
    الاستبعاد في inspect.js (شفرة warcnoelev) إلى أن تُبنى واجهات
    القوس في مرحلةٍ قادمة. */
 if(isArc(w))return null;
 const d=dir(w);
 if(!d)return null;
 const L=wallLen(w);
 if(L<1e-6)return null;
 const N=outNormal(w,ref);
 if(!N)return null;
 const mx=(w.a[0]+w.b[0])/2, my=(w.a[1]+w.b[1])/2;
 return {w, i:(i==null?-1:i), d, L:R(L),
  n:N.n, alt:N.alt, sure:N.sure,
  lat:mx*F.rt.x+my*F.rt.y, dep:mx*F.v.x+my*F.v.y,
  flip:(d.ux*F.rt.x+d.uy*F.rt.y)<0};
}

/* keep مرشِّحٌ اختياريّ يُنفَّذ قبل الإسقاط. ref===null يعني
   «لا تحسب مرجعاً» — المقطع لا يحتاج جهةَ الخارج. */
export function projectWalls(list,F,opt){
 const o=opt||{};
 const src=list||S.walls;
 const ref=(o.ref===null)?null
  :((o.ref&&isFinite(o.ref[0])&&isFinite(o.ref[1]))
    ? o.ref : extRef(src));
 const keep=(typeof o.keep==="function")?o.keep:null;
 const out=[];
 src.forEach((w,i)=>{
  if(keep&&!keep(w))return;
  const p=projectWall(w,F,ref,i);
  if(p)out.push(p);
 });
 return out;
}

/* ارتفاع الجدار: w.h إن وُجد (السترة)، وإلّا meta.wallH.
   مُصدَّرٌ لأن المقطع يقرأ الارتفاع نفسه. */
export const wallHeight=w=>{
 if(w.h!=null&&isFinite(w.h))return Math.max(200,R(+w.h));
 return isLow(w)?lowH(w):R(S.meta.wallH);
};

/* ═══ اختيار جدران الواجهة وترتيبها ═══ */
export function elevWalls(view,opt){
 const o=opt||{}, F=viewFrame(view), a=F.ang;
 const tol=clamp(+o.tol||TOL,1,90);
 const lvl=(o.level==null)?activeLevel(S.meta):normLevel(o.level);
 const cand=S.walls.filter(w=>w.type==="ext"&&levelOf(w)===lvl);
 const ref=(o.ref&&isFinite(o.ref[0])&&isFinite(o.ref[1]))
  ? o.ref : extRef(cand);
 const P=projectWalls(S.walls,F,
  {ref,keep:w=>w.type==="ext"&&levelOf(w)===lvl});
 const out=[];
 P.forEach(p=>{
  let n=p.n, off=Math.abs(angDiff(p.n.ang,a));
  if(o.both||!p.sure){
   const o2=Math.abs(angDiff(p.alt.ang,a));
   if(o2<off){n=p.alt; off=o2}
  }
  if(off>tol+1e-9)return;
  out.push({w:p.w, i:p.i, L:p.L, n, off, sure:p.sure,
   lat:p.lat, dep:p.dep, flip:p.flip});
 });
 out.sort((p,q)=>(p.lat-q.lat)||(q.dep-p.dep)||(p.i-q.i));
 return {view:a, v:F.v, rt:F.rt, ref, tol, level:lvl, list:out};
}

/* ═══ التوليد ═══ */
export function elevation(view,opt){
 const o=opt||{}, P=elevWalls(view,opt);
 const lvl=P.level;
 const gap=Math.max(0,R(+o.gap||0));
 const shapes=[], runs=[], warn=[];
 let x=0, top=0;
 /* المستويات الأخرى تُسقَط من هذه الواجهة — تُعلَن هنا لا تُخفى:
    من يفتح واجهة الطابق النشط يرى كم جداراً من طابقٍ آخر أُقصي. */
 const skip={};
 S.walls.forEach(w=>{
  if(w.type!=="ext")return;
  const L=levelOf(w);
  if(L!==lvl){const t=levelTag(L); skip[t]=(skip[t]||0)+1}
 });
 /* الجدار القوسيّ الخارجيّ مستبعَدٌ من الإسقاط (projectWall) — يُقال
    هنا في الحصيلة لا في الفاحص وحده: من يفتح الواجهة يرى ملاحظةً
    بأنّ جداراً ناقص، لا واجهةً تبدو كاملةً وفيها ثقب. */
 S.walls.forEach(w=>{
  if(isArc(w)&&w.type==="ext"&&levelOf(w)===lvl)warn.push({code:"arc",id:w.id,
   msg:`${w.id} جدارٌ قوسيّ خارجيّ — مستبعَدٌ من الواجهة (لا تُبنى `
    +`واجهةُ القوس بعد) فتظهر ناقصةً`});
 });
 P.list.forEach(p=>{
  const w=p.w, L=p.L, H=wallHeight(w);
  shapes.push({kind:"rect",x,y:0,w:L,h:H,layer:ELAY,
   role:"wall",id:w.id,wall:w.id});
  const run={id:w.id,x0:x,x1:x+L,L,h:H,flip:p.flip?1:0,
   off:R(p.off),dep:R(p.dep),sure:p.sure,opens:0};
  if(!p.sure)warn.push({code:"side",id:w.id,
   msg:`${w.id} يمرّ بمركز المسقط — جهة خارجه غير محسومة`});
  opensOf(w.id)
   .map(op=>({op, c:p.flip?(L-op.s):op.s}))
   .sort((m,n)=>(m.c-n.c)||(m.op.id<n.op.id?-1:1))
   .forEach(({op,c})=>{
    const ow=Math.max(1,R(op.w)), oh=Math.max(1,R(op.h));
    const oy=Math.max(0,R(op.sill||0));
    const ox=R(x+c-ow/2);
    shapes.push({kind:"rect",x:ox,y:oy,w:ow,h:oh,layer:ELAY,
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
    if(ox<x-1||ox+ow>x+L+1)warn.push({code:"out",id:op.id,
     msg:`${op.id} تخرج عن فرد ${w.id}`});
    top=Math.max(top,oy+oh);
   });
  top=Math.max(top,H);
  runs.push(run);
  x+=L+gap;
 });
 const wid=Math.max(0,R(x-(runs.length?gap:0))), hgt=R(top);
 return {view:P.view, name:viewName(P.view), layer:ELAY,
  shapes, runs, warn, gap, ref:P.ref, tol:P.tol, level:lvl, skip,
  w:wid, h:hgt,
  bbox:runs.length?{x0:0,y0:0,x1:wid,y1:hgt}:null,
  n:{walls:runs.length, opens:shapes.length-runs.length,
     shapes:shapes.length},
  ver:{n:VER.n,g:VER.g,o:VER.o}, at:Date.now()};
}

/* ═══ إلى أوّليات المشروع ═══ */
let LAST=null;
export function elevPrims(e,dx,dy){
 const t=e||LAST;
 if(!t)return [];
 const X=R(dx||0), Y=R(dy||0);
 return t.shapes.map(s=>({t:"poly",L:s.layer,cl:1,
  pts:[[X+s.x, Y+s.y], [X+s.x+s.w, Y+s.y],
       [X+s.x+s.w, Y+s.y+s.h], [X+s.x, Y+s.y+s.h]]}));
}

/* ═══ الأمر ELEV ═══
   آخر واجهةٍ وُلّدت تُحفَظ في الوحدة لا في S — تقريرٌ مشتقّ لا
   بيانات مشروع. */
export const lastElev=()=>LAST;
export const clearElev=()=>{LAST=null};
export function buildElev(view,opt){
 LAST=elevation(view,opt);
 return LAST;
}
export const elevStale=e=>{
 const t=e||LAST;
 return t?(t.ver.g!==VER.g||t.ver.o!==VER.o):null;
};
export function elevSay(e){
 const t=e||LAST;
 if(!t)return "لا واجهة — نفّذ ELEV";
 return `${t.name}: ${t.n.walls} جدار · ${t.n.opens} فتحة · `
  +dm2(t.w,t.h,"م")
  +(t.warn.length?` · ${t.warn.length} ملاحظة`:"")
  +(elevStale(t)?" · المخطّط تبدّل بعد توليدها":"");
}
export function elevCmd(arg,opt){
 const e=buildElev(arg==null?"S":arg,opt);
 if(!e.n.walls)throw new Error(
  `لا جدار خارجيّ يواجه ${e.name} بتفاوت ${e.tol}° — `
  +`الواجهة تُبنى من type="ext" وحدها`);
 return e;
}
