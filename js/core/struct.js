/* ═══ العناصرُ الإنشائية: كمرةٌ وقاعدةٌ وبلاطة ═══ §٣/١٢
   كان في المشروع **عمودٌ وحدَه**. ومن يرسم أعمدةً يرسم كمراتٍ
   وقواعدَ معها — فلا عمودَ بلا قاعدةٍ تحته ولا كمرةٍ فوقه. والمعماريُّ
   يسلّم مخطَّطَ أعمدةٍ ومخطَّطَ قواعدَ في كلِّ مشروع.

   ═══ ثلاثةُ أنواعٍ في كيانٍ واحد ═══
   هيئاتُها مختلفة (خطّيةٌ · مستطيلةٌ · مضلّعة) لكنّها تتشارك ما يهمّ:
   كلُّها **مخفيّةٌ** عن مستوى القطع (فوقه أو تحته) فتُرسَم متقطّعةً،
   وكلُّها على طبقةٍ واحدةٍ تُطفَأ معاً، وكلُّها تُحصَر بالحجم لا
   بالطول. فجمعُها في كيانٍ واحدٍ بحقل `kind` هو ما يفعله المشروعُ
   سلفاً في `anno` (نصّ/قائد/منسوب) وفي `fixt` — عرفٌ قائمٌ لا بدعة.

   وثلاثُ مجموعاتٍ منفصلةٍ كانت ستعني ثلاثةَ تسجيلاتٍ في سجلّ
   الكيانات وثلاثةَ مُدقِّقاتٍ وثلاثةَ مصدِّرين — وكلُّها تقول الشيءَ
   نفسه.

   ═══ المتقطّعُ عرفٌ لا زينة ═══
   في المخطَّط المعماريّ: ما قُطِع يُرسَم مصمَّتاً، وما فوق مستوى
   القطع أو تحته يُرسَم متقطّعاً. الكمرةُ فوق الرأس والقاعدةُ تحت
   الأرض — فكلتاهما متقطّعة، والبلاطةُ حدُّها متقطّعٌ كذلك. ولو
   رُسِمت مصمَّتةً لقُرِئت جداراً.

   ═══ ما لا يفعله هذا الملفّ ═══
   لا حسابَ إنشائيّاً: لا عزومَ ولا حديدَ ولا تحقّقَ من كفاية مقطع.
   هذا برنامجُ **رسمٍ معماريّ**، والأبعادُ يضعها المهندسُ الإنشائيُّ
   وتُرسَم هنا كما أعطاها. وادّعاءُ حسابٍ لا يقع كذبٌ خطِر. */
import {S,touchView,txtH} from "./state.js";
import {V} from "./validate.js";
import {newId,clamp,deg,m2,m3,dim2} from "./units.js";
import {bboxOf,pArea,pip,cleanRing} from "./geom.js";
import {normLevel} from "./level.js";

const R=v=>Math.round(v);
const D=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);

export const SK={beam:"كمرة",footing:"قاعدة",slab:"بلاطة"};
export const SKINDS=["beam","footing","slab"];
export const SMAT={conc:"خرسانة",steel:"حديد"};
/* الحدود: أدناها مقطعٌ يُرسَم ويُقرأ، وأقصاها يمنع خطأَ الكتابة
   (٥٠٠٠ بدل ٥٠٠) لا يمنع تصميماً غريباً. */
export const BW_MIN=100,  BW_MAX=3000;      /* عرضُ الكمرة */
export const BD_MIN=150,  BD_MAX=3000;      /* عمقُها */
export const FW_MIN=300,  FW_MAX=12000;     /* ضلعُ القاعدة */
export const TH_MIN=80,   TH_MAX=1200;      /* سماكةُ البلاطة */
export const SLAB_MAXV=120;                 /* رؤوسُ البلاطة */

export const strById=id=>S.struct.find(e=>e.id===id)||null;
export const strKind=e=>SK[e&&e.kind]?e.kind:"beam";

/* ═══ الهيئة ═══ مضلّعٌ واحدٌ لكلِّ نوعٍ — عليه تقوم الإصابةُ
   والمحيطُ والصندوقُ والمساحة، فلا ثلاثُ حساباتٍ تتفرّق. */
export function strPoly(e){
 if(!e)return null;
 const k=strKind(e);
 if(k==="slab"){
  const P=(e.pts||[]).filter(p=>Array.isArray(p)&&isFinite(p[0]));
  return P.length>2?P:null;
 }
 if(k==="footing"){
  const w=Math.max(FW_MIN,+e.w||FW_MIN)/2;
  const h=Math.max(FW_MIN,+e.h||e.w||FW_MIN)/2;
  const a=(+e.rot||0)*Math.PI/180;
  const ca=Math.cos(a), sa=Math.sin(a);
  const P=(dx,dy)=>[R(e.x+dx*ca-dy*sa), R(e.y+dx*sa+dy*ca)];
  return [P(-w,-h),P(w,-h),P(w,h),P(-w,h)];
 }
 /* الكمرة: شريطٌ بعرضها حول محورها */
 const a=e.a, b=e.b;
 if(!a||!b)return null;
 const L=D(a,b);
 if(L<1)return null;
 const ux=(b[0]-a[0])/L, uy=(b[1]-a[1])/L;
 const nx=-uy, ny=ux, hw=Math.max(BW_MIN,+e.w||BW_MIN)/2;
 return [[R(a[0]+nx*hw),R(a[1]+ny*hw)],
         [R(b[0]+nx*hw),R(b[1]+ny*hw)],
         [R(b[0]-nx*hw),R(b[1]-ny*hw)],
         [R(a[0]-nx*hw),R(a[1]-ny*hw)]];
}
export const strBBox=e=>bboxOf(strPoly(e)||[]);
/* المساحةُ للحصر: البلاطةُ بمساحتها، والكمرةُ بطولها، والقاعدةُ
   بمسطّحها. وكلٌّ يُعاد بوحدته فلا تُجمَع أعدادٌ مختلفةُ المعنى. */
export const strLen=e=>(strKind(e)==="beam"&&e.a&&e.b)?R(D(e.a,e.b)):0;
export const strArea=e=>{
 const p=strPoly(e);
 return p?Math.abs(pArea(p)):0;
};
/* الحجمُ: المعنى الوحيدُ الذي يجمع الثلاثةَ — متراً مكعّباً خرسانةً */
export function strVol(e){
 const k=strKind(e);
 if(k==="beam")return strLen(e)*Math.max(BW_MIN,+e.w||0)
  *Math.max(BD_MIN,+e.d||0);
 if(k==="footing")return strArea(e)*Math.max(TH_MIN,+e.th||0);
 return strArea(e)*Math.max(TH_MIN,+e.th||0);
}
export const strAt=(x,y)=>{
 for(const e of S.struct){
  const p=strPoly(e);
  if(p&&pip(p,x,y))return e;
 }
 return null;
};
export const strName=e=>`${SK[strKind(e)]} ${e.tag||e.id}`;
/* البطاقةُ المختصرةُ على الرسم ولوحةِ الخصائص — تصفُ المقطعَ لا الاسم */
export function strLabel(e){
 const k=strKind(e);
 /* مقطعٌ مركَّبٌ (٢٥٠×٥٠٠) ينقلب ترتيبُه في سياقٍ عربيٍّ بلا عزل —
    dim2 تعزل الطرفَين، وهي نفسُها التي تعزل أبعادَ الخليّة والمصفوفة. */
 if(k==="beam")
  return `${e.tag?e.tag+" ":""}`+dim2(R(+e.w||0),R(+e.d||0));
 if(k==="footing")
  return `${e.tag?e.tag+" ":""}`+dim2(m2(+e.w||0),`${m2(+e.h||e.w||0)} م`);
 return `${e.tag?e.tag+" ":""}ث ${R(+e.th||0)}`;
}

/* ═══ الإنشاء ═══ كلُّ منفذٍ يمرُّ بالمُدقِّق قبل الكتابة ═══ */
const mk=(o)=>{
 const e=Object.assign({id:newId("G"),
  level:normLevel(S.meta.level),
  mat:SMAT[o.mat]?o.mat:"conc"},o);
 delete e.mat2;
 if(e.tag!=null){
  e.tag=String(e.tag).slice(0,10);
  if(!e.tag)delete e.tag;
 }
 S.struct.push(e); touchView();
 return e;
};
export function addBeam(a,b,w,d,mat,tag){
 V("beam",{a,b,w,d});
 const A=[R(a[0]),R(a[1])], B=[R(b[0]),R(b[1])];
 const L=D(A,B);
 if(L<BW_MIN)
  throw new Error(`طولُ الكمرة ${m3(L)} م — الأدنى ${m3(BW_MIN)} م`);
 return mk({kind:"beam",a:A,b:B,
  w:clamp(R(w||250),BW_MIN,BW_MAX),
  d:clamp(R(d||500),BD_MIN,BD_MAX), mat, tag});
}
export function addFooting(p,w,h,rot,th,mat,tag){
 V("footing",{p,w,h,rot});
 const W=clamp(R(w||1200),FW_MIN,FW_MAX);
 return mk({kind:"footing",x:R(p[0]),y:R(p[1]),
  w:W, h:clamp(R(h||W),FW_MIN,FW_MAX), rot:deg(+rot||0),
  th:clamp(R(th||400),TH_MIN,TH_MAX), mat, tag});
}
export function addSlab(pts,th,mat,tag){
 V("slab",{pts,th});
 const P=cleanRing((pts||[]).map(p=>[R(p[0]),R(p[1])]),1);
 if(!P||P.length<3)
  throw new Error("البلاطةُ تحتاج ثلاثةَ رؤوسٍ على الأقل");
 if(P.length>SLAB_MAXV)
  throw new Error(`${P.length} رأساً — الحدّ ${SLAB_MAXV}`);
 if(Math.abs(pArea(P))<1e4)
  throw new Error("مساحةُ البلاطةِ أصغرُ من أن تُرسَم");
 return mk({kind:"slab",pts:P,
  th:clamp(R(th||150),TH_MIN,TH_MAX), mat, tag});
}
export function delStruct(e){
 const i=S.struct.indexOf(e);
 if(i<0)return false;
 S.struct.splice(i,1); touchView();
 return true;
}
/* وسمٌ تالٍ بسابقةٍ — كـnextTag في cols.js، ومستقلٌّ عنها فلا
   يتصادم B1 الكمرةِ مع C1 العمود. */
export function nextStrTag(pre){
 const p=String(pre||"B");
 let mx=0;
 S.struct.forEach(e=>{
  const m=String(e.tag||"").match(new RegExp(`^${p}(\\d+)$`));
  if(m)mx=Math.max(mx,+m[1]);
 });
 return `${p}${mx+1}`;
}

/* ═══ الأوّليات ═══
   المتقطّعُ هو العرفُ (انظر الرأس). والتعبئةُ لا تُرسَم: ثلاثُ
   طبقاتٍ متراكبةٍ من التعبئةِ تُعمي المخطَّطَ، والحدُّ يكفي. */
export function strPrims(e){
 const L="A-STRU", out=[], h=txtH();
 const p=strPoly(e);
 if(!p)return out;
 const dash=[h*1.1,h*0.7];
 const k=strKind(e);
 const n=p.length;
 for(let i=0;i<n;i++)
  out.push({t:"line",L,a:p[i],b:p[(i+1)%n],dash,gid:e.id});
 /* الكمرة: محورٌ متقطّعٌ أدقُّ — يُقرأ امتدادُها ولو ضاق عرضُها */
 if(k==="beam"&&e.a&&e.b)
  out.push({t:"line",L,a:e.a,b:e.b,dash:[h*0.5,h*0.5],gid:e.id});
 /* القاعدة: قطرانِ يميّزانها عن مستطيلٍ أيٍّ كان */
 if(k==="footing"){
  out.push({t:"line",L,a:p[0],b:p[2],dash,gid:e.id});
  out.push({t:"line",L,a:p[1],b:p[3],dash,gid:e.id});
 }
 /* البطاقة: في مركزِ الصندوق، وللكمرةِ على محورها بميلها */
 const b=bboxOf(p);
 if(!b)return out;
 let x=R((b.x0+b.x1)/2), y=R((b.y0+b.y1)/2), rot=0;
 if(k==="beam"&&e.a&&e.b){
  x=R((e.a[0]+e.b[0])/2); y=R((e.a[1]+e.b[1])/2);
  rot=deg(Math.atan2(e.b[1]-e.a[1],e.b[0]-e.a[0])*180/Math.PI);
  if(rot>90.001&&rot<=270)rot=deg(rot+180);
  y=R(y+Math.max(BW_MIN,+e.w||0)/2+h*0.4);
 }
 out.push({t:"text",L,gid:e.id,s:strLabel(e),
  x,y,h:h*0.85,al:"bc",rot});
 return out;
}
