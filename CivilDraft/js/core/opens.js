/* ═══ الفتحات ═══
   الفتحة كائن صريح على جدار: s المسافة من بداية مساره إلى مركزها.
   لا تُقطع الجدار في البيانات — الطرح يقع في render.js وقت العرض،
   فحذفها يعيد الجدار كاملاً بلا أثر.

   الأنواع: sub=1 تقطع الجسم · part=1 تُرقّقه ولا تقطعه
            sw=1 تقبل قلب جهة الفتح · pan=1 تقبل عدد مصاريع */
import {S,VER,touchOpen} from "./state.js";
import {V} from "./validate.js";
import {newId,clamp,m2,m3,rng2,dm2} from "./units.js";
import {dir,wallById,wallLen,alignOff,isArc} from "./walls.js";
import {normLevel} from "./level.js";

const R=v=>Math.round(v);
export const OK={
 door:   {n:"باب مفرد",   lay:"A-DOOR", sub:1, sw:1},
 double: {n:"باب مزدوج",  lay:"A-DOOR", sub:1, sw:1},
 sliding:{n:"باب سحب",    lay:"A-DOOR", sub:1},
 window: {n:"شباك",       lay:"A-GLAZ", sub:1, pan:1},
 fixed:  {n:"شباك ثابت",  lay:"A-GLAZ", sub:1, pan:1},
 opening:{n:"فتحة صافية", lay:"A-GLAZ", sub:1},
 arch:   {n:"فتحة مقنطرة",lay:"A-GLAZ", sub:1},
 niche:  {n:"كوّة",        lay:"A-GLAZ", part:1}
};
export const OKINDS=Object.keys(OK);
export const okOf=k=>OK[k]||OK.door;
export const okName=k=>okOf(k).n;
export const isPart=o=>!!okOf(o&&o.kind).part;
export const panOf=o=>clamp(R(+(o&&o.pan)||1),1,6);
export const depOf=(o,t)=>clamp(
 R(+(o&&o.dep)||R(t*0.45)),20,Math.max(20,t-40));

export const MINW=100;          /* أضيق فتحة مقبولة */
export const EDGE=50;           /* أقلّ ما يبقى من الجدار على كل جانب */

/* ═══ فهرس الفتحات ═══
   opensOf كانت مرشِّحاً خطّياً على كل S.opens، وتُنادى من openState داخل
   حلقةٍ على كل الفتحات (badOpens في كل مشهد) ومن freeSpans وnearestFree
   أثناء السحب — فمئةُ فتحةٍ تعني عشرة آلاف مقارنةٍ في الإطار الواحد.
   وopenById خطّيةٌ كذلك، وتُنادى من pickable لكل مرشَّحٍ فيُصبح الالتقاط
   والتحديد بالإطار تربيعيّاً.

   الفهرس خريطتان (جدار ← فتحاته بترتيب S.opens نفسه، ومعرّف ← فتحة)
   ومفتاحُه كلُّ ما قد يُغيّر الجواب: هويّة المصفوفة وطولها (فحذفٌ أو
   إضافةٌ أو استبدالٌ بمصفوفةٍ جديدة يُبطله حتى لو لم يُنادَ touch) ونسخ
   VER الثلاث. وما لا يُبطله المفتاح — تغيير o.wall في موضعه — تعلنه
   invalidateOpens() صراحةً (shiftOpensTo).

   والقوائم المُعادة مجمَّدة: مشتركةٌ بين المستدعين، فمن يحاول
   push/sort عليها يفشل صريحاً بدل أن يُفسد الفهرس صامتاً. */
const NONE=Object.freeze([]);
let OXm=null, OXi=null, OXa=null, OXl=-1, OXn=-1, OXg=-1, OXo=-1;
function opensIdx(){
 const A=S.opens;
 if(OXm&&OXa===A&&OXl===A.length&&OXn===VER.n&&OXg===VER.g&&OXo===VER.o)
  return OXm;
 const M=new Map(), I=new Map();
 A.forEach(o=>{
  let L=M.get(o.wall);
  if(!L){L=[]; M.set(o.wall,L)}
  L.push(o);
  if(!I.has(o.id))I.set(o.id,o);       /* الأولى تفوز كما كانت find */
 });
 M.forEach(L=>Object.freeze(L));
 OXm=M; OXi=I; OXa=A; OXl=A.length;
 OXn=VER.n; OXg=VER.g; OXo=VER.o;
 return M;
}
export const invalidateOpens=()=>{OXm=null; OXi=null};
export const opensOf=id=>opensIdx().get(id)||NONE;
export const openById=id=>{opensIdx(); return OXi.get(id)||null};
export const span=o=>[o.s-o.w/2, o.s+o.w/2];

/* ═══ حالة الفتحة — تقرير لا إصلاح ═══
   ok سليمة · over تخرج عن مدى جدارها (أو تنتهك EDGE، وهو حدٌّ من مدى
   الجدار نفسه لا حالةٌ رابعة — addOpen يفرضه عند الإنشاء [D05]، فما
   دونه بعد شدّ الجدار أو قصّه ليس أقلّ عطباً من الخروج عن الجدار
   تماماً) · clash تتراكب مع أخرى
   تُرسَم الحالتان الأخيرتان بالأحمر وتُذكران في لوحة الحالة. */
export function openState(o){
 const w=wallById(o.wall);
 if(!w)return "orphan";
 const L=wallLen(w);
 const [a,b]=span(o);
 if(a<-1||b>L+1)return "over";
 if(a<EDGE-1||b>L-EDGE+1)return "over";
 for(const x of opensOf(o.wall)){
  if(x===o)continue;
  const [c,d]=span(x);
  if(a<d-1&&c<b-1)return "clash";
 }
 return "ok";
}
/* ═══ المعطوبة ═══
   تُمسَح في كل مشهد — أي في كل إطارٍ أثناء سحب أي شيء. وopenState
   صار أثقل بعد الدفعة ٤ (يقيس على الفترات الحرّة لا على الغلاف)،
   فمئةُ فتحةٍ تعني مئةَ مسحٍ للفتحات المجاورة ستّين مرّةً في
   الثانية.
   والمفتاح نسختا الهندسة والفتحات: تحرّكُ بُعدٍ لا يُعطِب فتحة. */
let BO=null, BOK="";
export function badOpens(){
 const k=`${VER.g}|${VER.o}`;
 if(BO&&BOK===k)return BO;
 const out=[];
 S.opens.forEach(o=>{if(openState(o)!=="ok")out.push(o)});
 BO=out; BOK=k;
 return BO;
}
export const badStats=()=>({key:BOK,n:BO?BO.length:-1});

/* ═══ الفترات الحرّة لمركز فتحةٍ بعرض W ═══
   الجدار يُقصّ عند كل فتحةٍ قائمة، فيبقى مدىً متقطّع. والدالّة
   القديمة (allowed) كانت تعيد غلافاً واحداً متّصلاً — يَعِد بموضعٍ
   مشغول، والمُثبِّت يرفضه بسببٍ لا يذكره الوعد.
   والنتيجة مرتَّبةٌ بالموضع لا بترتيب S.opens، فلا يتوقّف الجواب
   على ترتيب المصفوفة. */
export function freeSpans(w,W,skip){
 const L=wallLen(w);
 const lo=W/2+EDGE, hi=L-W/2-EDGE;
 if(hi<lo)return {L,spans:[],fits:false};
 /* كل فتحةٍ تمنع مركزاً يقع في [a−W/2 , b+W/2] */
 const block=[];
 opensOf(w.id).forEach(o=>{
  if(o===skip)return;
  const [a,b]=span(o);
  block.push([a-W/2, b+W/2]);
 });
 block.sort((p,q)=>p[0]-q[0]);
 const out=[];
 let s=lo;
 block.forEach(([a,b])=>{
  if(b<=s)return;                    /* خلف موضعنا */
  if(a>s+1)out.push([R(s),R(Math.min(a,hi))]);
  s=Math.max(s,b);
 });
 if(s<hi-1)out.push([R(s),R(hi)]);
 const spans=out.filter(([a,b])=>b-a>=1);
 return {L,spans,fits:spans.length>0};
}
/* أقرب موضعٍ حرٍّ إلى s — للسحب: يتوقّف عند الحدّ ولا يرفض.
   وعند تساوي المسافتين يبقى في فترته: السحب لا يقفز فوق فتحةٍ
   قائمة إلى الجهة الأخرى منها. */
export function nearestFree(w,W,s,skip){
 const F=freeSpans(w,W,skip);
 if(!F.fits)return null;
 const from=(skip&&isFinite(+skip.s))?+skip.s:s;
 let best=null, bd=1/0, bf=1/0;
 F.spans.forEach(([a,b])=>{
  const q=clamp(s,a,b);
  const d=Math.abs(q-s), f=Math.abs(q-from);
  if(d<bd-0.5||(Math.abs(d-bd)<=0.5&&f<bf)){bd=d; bf=f; best=q}
 });
 return best==null?null:R(best);
}
/* الغلاف المتّصل — للتوافق ولعرض الحدَّين الأقصيَين.
   spans فيه التفصيل، وfits يعني «يوجد موضعٌ حرّ» لا «المدى متّصل». */
export function allowed(w,W,skip){
 const F=freeSpans(w,W,skip);
 if(!F.fits)
  return {lo:0,hi:0,L:F.L,fits:false,spans:[],split:false};
 return {lo:F.spans[0][0], hi:F.spans[F.spans.length-1][1],
  L:F.L, fits:true, spans:F.spans, split:F.spans.length>1};
}
/* نصٌّ للرسائل: يذكر الفترات كلّها لا غلافها */
export const saySpans=F=>((F&&F.spans)||[])
 .map(([a,b])=>rng2(a,b)).join(" أو ")||"لا موضع";

/* ═══ جدول الفتحات ═══
   تقريرٌ يُجمَع عند العرض: لا حقل يُخزَّن على الفتحة. والرمز مشتقٌّ
   من ترتيب الجدول نفسه، فلا يُكتَب ولا يُصدَّر — كجدول المساحات،
   إلّا أن المناطق تُسمّى بيدك والفتحات تُجمَع بمقاسها. */
const MK={door:"ب",double:"ب",sliding:"ب",niche:"ك"};
export function openSchedule(){
 const G=new Map();
 S.opens.forEach(o=>{
  const pan=okOf(o.kind).pan?panOf(o):1;
  const dep=(o.kind==="niche")?(o.dep||0):0;
  const k=`${o.kind}|${o.w}|${o.h}|${o.sill||0}|${pan}|${dep}`;
  let r=G.get(k);
  if(!r){
   r={kind:o.kind,w:o.w,h:o.h,sill:o.sill||0,pan,dep,n:0,ids:[]};
   G.set(k,r);
  }
  r.n++; r.ids.push(o.id);
 });
 const rows=[...G.values()];
 rows.sort((a,b)=>(MK[a.kind]||"ش").localeCompare(MK[b.kind]||"ش","ar")
  ||(b.w-a.w)||(b.h-a.h));
 const c={};
 rows.forEach(r=>{
  const p=MK[r.kind]||"ش";
  c[p]=(c[p]||0)+1;
  r.mark=p+c[p];
 });
 return {rows, total:S.opens.length,
  bad:S.opens.filter(o=>openState(o)!=="ok").length};
}
export function addOpen(w,s,kind,W,H,sill,ex){
 V("open",{s,kind,W,H,sill});      /* 2.3 */
 if(!w)throw new Error("لا جدار مستهدف");
 if(isArc(w))throw new Error("الفتحات على الجدران المستقيمة فقط "
  +"— الجدار قوسيّ");
 const K=OK[kind]?kind:"door";
 const L=wallLen(w);
 W=Math.max(MINW,R(W||900));
 H=Math.max(MINW,R(H||2100));
 sill=Math.max(0,R(sill||0));
 s=R(s);
 if(W+EDGE*2>L)
  throw new Error(`العرض ${m2(W)} م لا يتّسع في ${w.id} `
   +`(طوله ${m2(L)} م · الأقصى ${m2(L-EDGE*2)} م)`);
 /* الفترات الحرّة لا الغلاف: الرسالة تذكر ما يُقبَل فعلاً */
 const A=allowed(w,W,null);
 if(!A.fits)
  throw new Error(`لا موضع حرٌّ بعرض ${m2(W)} م على ${w.id} — `
   +`الفتحات القائمة تشغل مداه`);
 if(s-W/2<-1||s+W/2>L+1)
  throw new Error(`الموضع ${m2(s)} م يخرج عن ${w.id} — `
   +`المواضع الحرّة ${saySpans(A)} م`);
 for(const o of opensOf(w.id)){
  const [a,b]=span(o);
  if(s-W/2<b&&a<s+W/2)
   throw new Error(`تتراكب مع ${o.id} (${rng2(a,b,"م")}) — `
    +`المواضع الحرّة ${saySpans(A)} م`);
 }
 const o={id:newId("O"),wall:w.id,kind:K,s,w:W,h:H,sill,
  hinge:"start",swing:"left",
  level:normLevel(S.meta.level)};
 if(ex){
  if(ex.hinge==="end")o.hinge="end";
  if(ex.swing==="right")o.swing="right";
  if(ex.pan!=null)o.pan=clamp(R(ex.pan),1,6);
  const dp=(ex.dep!=null)?ex.dep:ex.d;
  if(dp!=null){
   /* القيد عند المنفذ لا عند التعديل وحده: كوّةٌ أعمق من جدارها
      كانت تُنشأ بلا اعتراض وتُرسَم صحيحةً (depOf يقصّها عند
      العرض) ثم تمنع تعديل سماكة جدارها إلى الأبد. */
   const mx=Math.max(20,w.t-40);
   const d=R(dp);
   if(K==="niche"&&d>mx)
    throw new Error(`عمق الكوّة ${m3(d)} م لا يكفيه جدارٌ سماكته `
     +`${m3(w.t)} م — الأقصى ${m3(mx)} م`);
   o.dep=clamp(d,20,mx);
  }
  if(ex.face)o.face=(ex.face==="r")?"r":"l";
 }
 S.opens.push(o); touchOpen();
 return o;
}
export function delOpen(o){
 const i=S.opens.indexOf(o);
 if(i<0)return false;
 S.opens.splice(i,1); touchOpen();
 return true;
}
/* الإسقاط على مسار الجدار — لحساب s من نقرة */
export function sAt(w,p){
 const d=dir(w);
 if(!d)return 0;
 return R((p[0]-w.a[0])*d.ux+(p[1]-w.a[1])*d.uy);
}
/* موضع مركز الفتحة على محور الجسم — للمقابض والرموز */
export function openPt(w,s){
 const d=dir(w);
 if(!d)return [w.a[0],w.a[1]];
 const o=alignOff(w);
 return [R(w.a[0]+d.ux*s+d.nx*o), R(w.a[1]+d.uy*s+d.ny*o)];
}
/* ═══ رموز الفتحات ═══
   تُبنى بالإحداثيات العالمية مباشرة: لا بلوكات في هذه المرحلة —
   المصدِّر يقرأ الأوّليات نفسها. */
const LN=(L,a,b,x)=>Object.assign({t:"line",L,
 a:[R(a[0]),R(a[1])], b:[R(b[0]),R(b[1])]},x||{});
const PL=(L,pts,cl)=>({t:"poly",L,
 pts:pts.map(p=>[R(p[0]),R(p[1])]),cl:cl===0?0:1});
const AC=(L,c,r,a0,a1)=>({t:"arc",L,cx:R(c[0]),cy:R(c[1]),
 r:Math.max(1,R(r)),a0,a1});
const ang=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;

export function openPrims(o){
 const w=wallById(o.wall);
 if(!w)return [];
 const d=dir(w);
 if(!d)return [];
 const K=okOf(o.kind), L=K.lay;
 const off=alignOff(w), t=w.t;
 /* الإطار المحلّي: P(u,v) — u على طول الجدار من حدّ الفتحة الأول،
    v عبر السماكة حول محور الجسم (−t/2 … +t/2) */
 const [s0]=span(o);
 const P=(u,v)=>[w.a[0]+d.ux*(s0+u)+d.nx*(off+v),
                 w.a[1]+d.uy*(s0+u)+d.ny*(off+v)];
 const W=o.w, out=[];

 /* الكوّة تظهر من ترقيق الجسم نفسه — لا رمز لها */
 if(K.part)return out;

 if(o.kind==="door"||o.kind==="double"){
  const leaf=(hs,sg,side)=>{
   /* hs موضع المفصّلة على u · sg اتجاه الورقة · side جهة الفتح */
   const R0=W*0.98, lt=Math.max(20,W*0.05);
   const H=P(hs,0);
   const tip=P(hs, side*R0);
   const far=P(hs+sg*R0, 0);
   out.push(PL(L,[H, tip, P(hs-sg*lt, side*R0), P(hs-sg*lt,0)],1));
   const a1=ang(H,tip), a2=ang(H,far);
   out.push((side*sg>0)?AC(L,H,R0,a2,a1):AC(L,H,R0,a1,a2));
  };
  const side=(o.swing==="left")?1:-1;
  if(o.kind==="door"){
   const sg=(o.hinge==="end")?-1:1;
   leaf((sg>0)?0:W, sg, side);
  }else{
   leaf(0, 1, side);
   leaf(W,-1, side);
  }
  return out;
 }
 if(o.kind==="sliding"){
  const p=t*0.30;
  out.push(LN(L,P(0,-t/2),P(W,-t/2)));
  out.push(LN(L,P(0, t/2),P(W, t/2)));
  out.push(PL(L,[P(W*0.02, p*0.2),P(W*0.54, p*0.2),
                 P(W*0.54, p*1.0),P(W*0.02, p*1.0)],1));
  out.push(PL(L,[P(W*0.46,-p*1.0),P(W*0.98,-p*1.0),
                 P(W*0.98,-p*0.2),P(W*0.46,-p*0.2)],1));
  out.push(LN(L,P(0,0),P(W,0)));            /* السكّة */
  return out;
 }
 if(o.kind==="window"||o.kind==="fixed"){
  const n=panOf(o), g=(o.kind==="fixed")?0.14:0.20;
  out.push(LN(L,P(0,-t/2),P(W,-t/2)));
  out.push(LN(L,P(0, t/2),P(W, t/2)));
  out.push(LN(L,P(0,-t*g),P(W,-t*g)));
  out.push(LN(L,P(0, t*g),P(W, t*g)));
  for(let i=1;i<n;i++){
   const u=W*i/n, k=Math.max(10,W*0.012);
   out.push(PL(L,[P(u-k,-t/2),P(u+k,-t/2),
                  P(u+k, t/2),P(u-k, t/2)],1));
  }
  return out;
 }
 if(o.kind==="arch"){
  out.push(LN(L,P(0,-t/2),P(0,t/2)));
  out.push(LN(L,P(W,-t/2),P(W,t/2)));
  out.push(LN(L,P(W*0.05,0),P(W*0.95,0),
   {dash:[Math.max(20,t*0.5),Math.max(16,t*0.4)]}));
  return out;
 }
 /* فتحة صافية: عضادتان فقط */
 out.push(LN(L,P(0,-t/2),P(0,t/2)));
 out.push(LN(L,P(W,-t/2),P(W,t/2)));
 return out;
}
/* علامة تحذير على الفتحة المعطوبة — تُرسَم فوق كل شيء وتُرى دائماً */
export function badPrims(o){
 const w=wallById(o.wall);
 if(!w)return [];
 const c=openPt(w,o.s);
 const r=Math.max(180,w.t*0.8);
 return [
  {t:"arc",L:"__BAD",cx:c[0],cy:c[1],r:R(r),a0:0,a1:359.9,bad:1},
  {t:"line",L:"__BAD",bad:1,
   a:[R(c[0]-r*0.7),R(c[1]-r*0.7)], b:[R(c[0]+r*0.7),R(c[1]+r*0.7)]}];
}
export const openLabel=o=>`${okName(o.kind)} ${dm2(o.w,o.h,"م")}`
 +(o.sill?` · جلسة ${m2(o.sill)} م`:"");
