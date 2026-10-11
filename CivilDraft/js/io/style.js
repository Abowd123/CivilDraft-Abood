/* ═══ هيئة الأوّلية ═══
   الأربعة كانوا يترجمون كلٌّ على حدة، فاختلفوا في ستّ تفاصيل:
   شرطة الطبقة تُطبَّق في اثنين وتُهمَل في اثنين · الشفافية في
   اثنين · صبغة المنطقة بأربع صيغ · تعبئة solid بنمطين ·
   طبقة الهاشور مكتوبةٌ حرفياً في ثلاثة · التنبيه في ثلاثة.

   هنا مصدرٌ واحد. والعجز في الصيغة يُعلَن لا يُسكَت عنه: CAPS
   تقول ما تحمله الصيغة، وnotes تجمع ما فُقِد فيُقال للمستخدم.

   ولا يستورد إلّا core/layers وcore/hatches، فلا دورة: dxf و svg
   و png و pdf يستوردونه، وهو لا يعرفهم — وhatches.js نفسها لا
   تستورد layers ولا style، فلا دورةَ بينهما أيضاً. */
import {resolve,plots} from "../core/layers.js";
import {hatchDef} from "../core/hatches.js";

/* ما تحمله كل صيغة — قرارٌ معلَنٌ لا سلوكٌ مُستنتَج.
   cut=1 يعني: الشرطة تُقطَّع قطعاً حقيقية بدل نمط LTYPE — فهي
   مُطبَّقةٌ لا مُهمَلة، لكن بوسيلةٍ أخرى. */
export const CAPS={
 dxf:{dash:0, cut:1, alpha:0, fill:0, warn:0, lw:1,
  why:{dash:"الشرطة تُقطَّع قطعاً حقيقية بدل نمط LTYPE",
   alpha:"لا شفافية في DXF",
   fill:"لا تعبئة شفافة — حدُّ المنطقة وحده",
   warn:"ألوان التنبيه لا تُصدَّر"}},
 svg:{dash:1, cut:0, alpha:1, fill:1, warn:1, lw:1, why:{}},
 png:{dash:1, cut:0, alpha:1, fill:1, warn:1, lw:1, why:{}},
 pdf:{dash:1, cut:0, alpha:1, fill:1, warn:1, lw:1, why:{}},
 /* الشاشة صيغةٌ خامسة معلَنة — لا استثناء صامت يقرأ resolve بنفسه */
 canvas:{dash:1, cut:0, alpha:1, fill:1, warn:1, lw:1, why:{}}
};
/* لون التنبيه والعطب — واحدٌ للأربعة، وكان ثلاثة حرفيّات */
export const WARN={warn:"#b8860b", bad:"#b00020"};
/* شفافية صبغة المنطقة — واحدةٌ للأربعة، وكانت أربع صيغ */
export const TINT_A=0.11;
/* طبقة الهاشور الافتراضية حين لا تُعلَنها الأوّلية */
export const HLAY="A-WALL-PATT";

function note(o,k,C){
 if(!o||!o.notes)return;
 const m=(C.why||{})[k];
 if(m&&!o.notes.includes(m))o.notes.push(m);
}
const capsOf=fmt=>CAPS[fmt]||CAPS.svg;
const modeOf=o=>(o&&o.dark)?"dark":"plot";
const kOf=o=>Math.max(1,(o&&o.k)||1);
const pxOf=o=>((o&&o.px)==null)?1:o.px;
const minOf=o=>((o&&o.minLw)==null)?0.15:o.minLw;

/* ═══ الهيئة ═══
   g   الأوّلية · fmt اسم الصيغة · O.dark وضع اللون · O.k المقياس
   O.px معامل النقطة/البكسل (١ لوحدات النموذج)
   O.showWarn هل تُصدَّر ألوان التنبيه (خيارُ مستخدم)

   تعيد: {skip · css · lw · dash · cut · alpha · aci · lt · dxfLt}
   وpush إلى O.notes ما فُقِد.

   dash تُعاد بوحدات المخرَج (مضروبةً بـpx)، وcut تعني «طبِّقها
   بالتقطيع لا بنمطٍ» — فالقرار في موضعٍ واحد ولا يعود المستدعي
   يقرأ resolve بنفسه. */
export function styleOf(g,fmt,O){
 const C=capsOf(fmt);
 const o=O||{};
 const L=(g&&g.L)||"0";
 if(!plots(L))return {skip:1};
 const r=resolve(L,modeOf(o));
 const k=kOf(o), px=pxOf(o);
 const bad=!!(g&&g.bad), wr=!!(g&&g.warn);
 const wantWarn=(bad||wr)&&(o.showWarn!==false);
 const css=wantWarn
  ? (C.warn?(bad?WARN.bad:WARN.warn):r.css)
  : r.css;
 if(wantWarn&&!C.warn)note(o,"warn",C);
 /* الوزن: (lw/100) مم ورقيّ × المقياس = وحدة نموذج، ثم × px */
 const w=(r.lw||25)/100*k*px;
 const lw=Math.max(minOf(o),w)*((bad||wr)?1.2:1);
 /* الشرطة: دَشّ الأوّلية بوحدات النموذج، ودَشّ الطبقة بالمليمتر
    الورقيّ — كارتفاع النصّ تماماً، فيُضرَب بالمقياس. */
 let dash=null;
 if(g&&g.dash&&g.dash.length)
  dash=g.dash.map(v=>Math.max(0.1,v*px));
 else if(r.dash&&r.dash.length)
  dash=r.dash.map(v=>Math.max(0.1,v*k*px));
 let cut=0;
 if(dash&&!C.dash){
  note(o,"dash",C);
  if(C.cut)cut=1; else dash=null;
 }
 let alpha=(r.a<1)?r.a:1;
 if(alpha<1&&!C.alpha){note(o,"alpha",C); alpha=1}
 return {skip:0, css, lw, dash, cut, alpha,
  aci:r.aci, lt:r.lt, dxfLt:r.dxf, n:L};
}
/* ═══ التعبئات ═══
   صبغة المنطقة كانت أربع صيغ: حدٌّ فقط · لون الطبقة ١٠٪ ·
   rgba حرفيّ · لونٌ معتمٌ حرفيّ. والآن لونُ طبقتها بشفافيةٍ
   واحدة — والصيغة التي لا تحملها تُصدِّر الحدّ وتُبلِّغ.

   والهاشور فيها يأخذ لون المنطقة وتباعُدَ الهاشور: خلطٌ مقصود،
   فالنقش هويّةُ المنطقة لا هويّةُ الجدران. */
export function fillOf(g,fmt,O){
 const C=capsOf(fmt);
 const o=O||{};
 const L=(g&&g.L)||"A-AREA";
 if(!plots(L))return {skip:1};
 const r=resolve(L,modeOf(o));
 if(g&&g.style==="hatch"){
  const h=resolve(HLAY,modeOf(o));
  return {skip:0, hatch:1, css:r.css, a:1,
   sp:Math.max(1,(o.hs||300)),
   lw:Math.max(minOf(o),(h.lw||13)/100*kOf(o)*pxOf(o))};
 }
 if(!C.fill){
  note(o,"fill",C);
  return {skip:0, hatch:0, css:r.css, a:1, edgeOnly:1};
 }
 return {skip:0, hatch:0, css:r.css, a:TINT_A};
}
/* ═══ الهاشور ═══
   الطبقة من g.L لا من اسمٍ حرفيّ: هاشور العمود المنفرد يحمل
   A-COLS، وكان يُصدَّر بلون تعبئة الجدران ويغيب بإيقاف طبعها.
   وsolid تشابكٌ في اتجاهين في الأربعة — كان اثنان بخطٍّ واحد. */
export function hatchOf(g,fmt,O){
 const o=O||{};
 const L=(g&&g.L)||HLAY;
 if(!plots(L))return {skip:1};
 const r=resolve(L,modeOf(o));
 const k=kOf(o), px=pxOf(o);
 /* النمط من البيانات الحيّة: زاويةٌ من g.pat، وتباعدٌ صريحٌ على
    الأوّلية (sc) يغلب، وإلا من النمط (مم ورقي × مقياس × نقطة)
    كدَشّ الطبقات تماماً. والمصمت متصالِبٌ 45/135 مهما كانت
    زاويةُ النمط — لا معنى لزاويةٍ في تعبئةٍ مصمتة. */
 const pat=hatchDef((g&&g.pat)||"ANSI31");
 const solid=!!pat.solid;
 const ang=((pat.ang%360)+360)%360;
 const sp=Math.max(1,(g&&g.sc)||Math.max(1,pat.mm*k*px));
 const sets=solid
  ? [[45,sp*0.22],[135,sp*0.22]] : [[ang,sp]];
 return {skip:0, css:r.css, sets, sp, solid:solid?1:0,
  lw:Math.max(minOf(o),(r.lw||13)/100*kOf(o)*pxOf(o))};
}
/* ═══ الهاشور المولَّد خطوطاً ═══
   نسخةٌ واحدة كانت في dxf وpdf بتبريرٍ غير صحيح («تفادي دورة
   الاستيراد») — وهنا لا دورة لأن style.js لا يستورد إلّا layers.

   والحدّ يُعلَن بدل أن يُبتَر صامتاً: كان return [] فيغيب
   الهاشور كلّه بلا كلمة. */
export function hatchLines(loops,angDeg,spacing){
 const a=angDeg*Math.PI/180;
 const ca=Math.cos(-a), sa=Math.sin(-a);
 const cb=Math.cos(a),  sb=Math.sin(a);
 const rot=p=>[p[0]*ca-p[1]*sa, p[0]*sa+p[1]*ca];
 const inv=p=>[p[0]*cb-p[1]*sb, p[0]*sb+p[1]*cb];
 const E=[];
 let y0=1/0, y1=-1/0;
 (loops||[]).forEach(lp=>{
  if(!lp||lp.length<3)return;
  const R=lp.map(rot);
  for(let i=0;i<R.length;i++){
   const A=R[i], B=R[(i+1)%R.length];
   E.push([A,B]);
   if(A[1]<y0)y0=A[1]; if(A[1]>y1)y1=A[1];
  }
 });
 if(!E.length)return {lines:[],cut:0};
 const s=Math.max(1,spacing), out=[];
 const k0=Math.ceil(y0/s), k1=Math.floor(y1/s);
 if(k1-k0>6000)return {lines:[],cut:k1-k0};
 for(let k=k0;k<=k1;k++){
  const y=k*s, xs=[];
  E.forEach(([A,B])=>{
   if((A[1]>y)===(B[1]>y))return;
   const t=(y-A[1])/(B[1]-A[1]);
   xs.push(A[0]+t*(B[0]-A[0]));
  });
  xs.sort((p,q)=>p-q);
  for(let i=0;i+1<xs.length;i+=2){
   if(xs[i+1]-xs[i]<1)continue;
   out.push([inv([xs[i],y]), inv([xs[i+1],y])]);
  }
 }
 return {lines:out,cut:0};
}
/* سياقٌ جاهز — يُغني كل مصدِّرٍ عن تركيبه بيده */
export const ctxOf=(fmt,o)=>Object.assign(
 {dark:0,k:1,px:1,minLw:0.15,notes:[],showWarn:false,
  hs:300,hatchCut:0,fmt},o||{});
