/* ═══ الورقة وبلوك العنوان ═══
   يُبنى كلّه بالمليمتر النموذجي: مقاس الورقة × المقياس. فيمرّ في
   خطّ الأنابيب نفسه، ويُصدَّر مع كل شيء، ولا فضاء ورقة منفصل.
   لا يستورد render.js — الصندوق يُمرَّر وسيطاً، فلا دورة. */
import {S,touchView} from "./state.js";
import {clamp,D2R,scl,newId} from "./units.js";
import {V} from "./validate.js";
import {LIM} from "./limits.js";
import {normLevel} from "./level.js";
import {calloutTitleLine} from "./callouts.js";
import {pArea,pip,isConvexRing} from "./geom.js";

const R=v=>Math.round(v);
/* المقاسات بالمليمتر · أفقياً (عرض × ارتفاع) */
export const SIZES={
 A4:[297,210], A3:[420,297], "A3+":[483,329], A2:[594,420],
 "A2+":[610,430], A1:[841,594], A0:[1189,841]};
export const SNAMES=Object.keys(SIZES);

/* ═══ المقاس المخصّص ═══ size==="custom" ⇒ customW×customH مم بترتيب
   «أفقي» كسائر SIZES (العرض × الارتفاع)، والاتجاه "p" يقلبهما كالبقية. */
export const isCustom=sh=>!!sh&&sh.size==="custom";
export function customDims(sh){
 const L=LIM.sheetCustom, c=v=>clamp(Math.round(+v),L.min,L.max);
 const w=(sh&&isFinite(+sh.customW)&&+sh.customW>0)?+sh.customW:420;
 const h=(sh&&isFinite(+sh.customH)&&+sh.customH>0)?+sh.customH:297;
 return [c(w),c(h)];
}
/* أبعاد الورقة أفقياً (عرض×ارتفاع) لورقةٍ ما: مقاسٌ قياسيّ أو مخصّص */
export function baseDims(sh){
 if(isCustom(sh))return customDims(sh);
 return (sh&&SIZES[sh.size])||SIZES.A3;
}
/* الاسم المعروض: «مخصص» بدل الرمز الداخلي custom */
export const sizeName=sh=>isCustom(sh)?"مخصص":((sh&&SIZES[sh.size])?sh.size:"A3");

export function paperMM(){
 const s=baseDims(S.sheet);
 return (S.sheet.orient==="p")?[s[1],s[0]]:[s[0],s[1]];
}
/* مقاس الورقة محوَّلاً إلى مليمتر نموذجي */
export function paperModel(){
 const k=Math.max(1,S.meta.scale);
 const p=paperMM();
 return [p[0]*k, p[1]*k];
}
/* ═══ مستطيل الورقة في إحداثيات النموذج ═══
   المركز من S.sheet.cx/cy إن ضُبط، وإلا مركز الرسم. */
export function sheetRect(bbox){
 const [W,H]=paperModel();
 let cx=S.sheet.cx, cy=S.sheet.cy;
 if(cx==null||cy==null){
  if(bbox){cx=(bbox.x0+bbox.x1)/2; cy=(bbox.y0+bbox.y1)/2}
  else{cx=W/2; cy=H/2}
 }
 return {x0:R(cx-W/2), y0:R(cy-H/2),
         x1:R(cx+W/2), y1:R(cy+H/2), W, H};
}
export const innerRect=r=>{
 const m=Math.max(0,S.sheet.margin)*Math.max(1,S.meta.scale);
 return {x0:r.x0+m, y0:r.y0+m, x1:r.x1-m, y1:r.y1-m};
};
/* هل يقع الرسم كلّه داخل الإطار الداخلي؟ */
export function fitsSheet(bbox){
 if(!bbox)return {ok:1,over:0};
 const i=innerRect(sheetRect(bbox));
 const over=Math.max(0, i.x0-bbox.x0, bbox.x1-i.x1,
                        i.y0-bbox.y0, bbox.y1-i.y1);
 return {ok:over<=0?1:0, over:R(over)};
}
/* ═══ بلوك العنوان ═══
   عمود واحد أسفل يمين الإطار الداخلي · الصفوف بالمليمتر الورقي. */
const TB_W=180;
/* ═══ تسليمٌ بلا بيانات المحرّر ═══
   بلوك العنوان أوّلياتٌ تُرسَم على الورقة من S.title — فتجريدُ الحقول
   من الحمولة (PDF info · اسم الملف) وحده لا يكفي: اسم المصمّم يبقى
   مرسوماً في الرسم نفسه. لذا تُعلَّق نسخةٌ مجرَّدة (TOV) طوال بناء
   الخطّة المتزامن فقط، ثم تُرفَع. S.title الأصلية لا تُمَسّ أبداً،
   والنسخة تُبطَل بـtouchView قبلاً وبعداً فلا يبقى مشهدٌ مُكاشٌ بها.
   المحتفَظ به: رقم اللوحة والمراجعة (هويّة التسليم لا هويّة المحرّر). */
let TOV=null;
export const stripTitle=t=>({proj:"",owner:"",loc:"",
 sheet:(t&&t.sheet)||"",rev:(t&&t.rev)||"",by:""});
export function withTitle(strip,fn){
 if(!strip)return fn();
 TOV=stripTitle(S.title);
 touchView();
 try{return fn()}
 finally{TOV=null; touchView()}
}
export function titleRows(ov){
 const t=TOV||S.title||{}, o=ov||{};
 return [
  {n:"المشروع", v:t.proj||"—", h:11, big:1},
  {n:"المالك",  v:t.owner||"—", h:8},
  {n:"الموقع",  v:t.loc||"—",  h:8},
  {n:"اسم اللوحة", v:o.name||S.meta.name||"—", h:11, big:1},
  {n:"المقياس · التاريخ",
   v:`${o.scale||scl(S.meta.scale)}   ·   ${S.meta.date||""}`, h:9},
  {n:"اللوحة · المراجعة · الرسم",
   v:`${o.sheet||t.sheet||"—"}   ·   ${t.rev||"0"}   ·   ${t.by||"—"}`, h:9}];
}
/* ═══ سهم الشمال ═══
   رمزٌ حقيقي في زاوية الإطار الداخلي، زاويته S.meta.north مقيسةً
   عكس الساعة من الشمال. يُصدَّر مع كل شيء لأنه أوّلياتٌ لا شارةُ
   شاشة — والشارة في الواجهة مؤشّرٌ عليه لا بديلٌ عنه. */
export function northPrims(i,k){
 if(!+S.sheet.north)return [];
 const L="A-SHET", out=[];
 const r=8*k, pad=13*k;
 const cx=R(i.x0+pad), cy=R(i.y0+pad);
 const a=(90+(+S.meta.north||0))*D2R;
 const ux=Math.cos(a), uy=Math.sin(a);
 const nx=-uy, ny=ux;
 const P=(u,v)=>[R(cx+ux*u+nx*v), R(cy+uy*u+ny*v)];
 out.push({t:"arc",L,cx,cy,r:R(r),a0:0,a1:359.9,sheet:1});
 /* رأسٌ مصمَّت وذيلٌ مشروح — يُقرأ اتجاهه بلا لبس */
 out.push({t:"poly",L,sheet:1,cl:1,
  pts:[P(r*1.05,0),P(-r*0.3,r*0.42),P(-r*0.3,-r*0.42)]});
 out.push({t:"line",L,sheet:1,a:P(-r*0.3,0),b:P(-r*1.05,0)});
 out.push({t:"text",L,sheet:1,s:"ش",
  x:P(r*1.75,0)[0], y:R(P(r*1.75,0)[1]-k*1.2),
  h:R(k*3.4), al:"mc"});
 return out;
}
/* ═══★ بلوك العنوان الجانبي — شريطٌ كاملُ الارتفاع ★═══
   الطراز الثاني لا بديلُ الأول: S.sheet.tbStyle==="col" (الافتراضي)
   يُبقي عمودَ أسفل اليمين كما كان حرفاً بحرف، و"side" يرسم شريطاً
   بعرض TBS_W على كامل ارتفاع الإطار الداخلي بجداوله — خانة التواقيع
   وختم الاعتماد والملاحظات والمشروع والمفتاح التخطيطي وسجلّ
   المراجعات وبيانات اللوحة والشعار.

   المقاسات كلّها مليمترٌ ورقيّ تُضرَب بالمقياس k كبقيّة الورقة، فلا
   فضاءَ ورقةٍ جديداً ولا مسارَ تصديرٍ ثانياً. والكتلتان المرنتان
   (الملاحظات والمفتاح) تمتصّان فائضَ الارتفاع فيصحّ الشريط على A4
   كما على A0؛ وإن ضاق الإطار عن الثوابت صُغِّر الكلّ بنسبةٍ واحدة
   فلا يخرج صفٌّ عن الإطار. */
const TBS_W=100;
const TBS_SIGS=[["معماري","كهرباء"],["إنشائي","اتصالات"],
                ["صحي","تكييف"]];
const TBS_STAMP=["الاسم","رقم القيد","رقم الختم"];
/* الثوابت بالمليمتر الورقي · fx المرنتان تُحسَبان لا تُكتَبان */
const TBS={hdr:6, sig:6, stamp:6, projRow:9, revHdr:6, revRow:5,
 nameRow:10, dataRow:8, logo:14, notesMin:10, keyMin:10};
function tbsFixed(){
 return TBS.hdr+TBS.sig*3            /* خانة التواقيع */
  +TBS.hdr+TBS.stamp*3               /* ختم الاعتماد */
  +TBS.hdr                           /* ترويسة الملاحظات */
  +TBS.projRow*2                     /* المشروع · المالك */
  +TBS.hdr                           /* ترويسة المفتاح */
  +TBS.revHdr+TBS.revRow*4           /* سجلّ المراجعات */
  +TBS.nameRow+TBS.dataRow*4         /* بيانات اللوحة */
  +TBS.logo;
}
export function tbSidePrims(i,k){
 const L="A-SHET", out=[];
 const W=TBS_W*k;
 const x1=i.x1, x0=i.x1-W;
 const innerH=i.y1-i.y0;
 /* سُلّمٌ واحد إن ضاق الإطار — لا صفٌّ يخرج ولا تداخل */
 const fixedMM=tbsFixed()+TBS.notesMin+TBS.keyMin;
 const sc=Math.min(1,innerH/(fixedMM*k));
 const u=k*sc;                       /* مليمترٌ ورقيّ ← وحدةُ رسم */
 const extra=Math.max(0,innerH-(tbsFixed()+TBS.notesMin+TBS.keyMin)*u);
 const notesH=TBS.notesMin*u+extra*0.45;
 const keyH  =TBS.keyMin*u+extra*0.55;

 const box=(a,b,c,d)=>out.push({t:"poly",L,sheet:1,cl:1,
  pts:[[R(a),R(b)],[R(c),R(b)],[R(c),R(d)],[R(a),R(d)]]});
 const hl=(y,a,b)=>out.push({t:"line",L,sheet:1,
  a:[R(a==null?x0:a),R(y)],b:[R(b==null?x1:b),R(y)]});
 const vl=(x,yb,yt)=>out.push({t:"line",L,sheet:1,
  a:[R(x),R(yb)],b:[R(x),R(yt)]});
 /* نصٌّ وسطَ خليّةٍ · al "mc" مركزاً و"mr" ملتصقاً بيمينها (RTL) */
 const tx=(s,xa,xb,yb,yt,hmm,al)=>{
  const t=String(s==null?"":s);
  if(!t)return;
  out.push({t:"text",L,sheet:1,s:t,h:R(Math.max(1,hmm*u)),
   al:al||"mc", y:R((yb+yt)/2),
   x:R(al==="mr" ? xb-u*1.6 : (xa+xb)/2)});
 };
 /* ترويسةٌ مُفرَدة تمتدّ العرضَ كلّه */
 const hdr=(s,yb,yt)=>{hl(yt); tx(s,x0,x1,yb,yt,2.6,"mc")};

 box(x0,i.y0,x1,i.y1);               /* الشريط كلّه */
 let y=i.y1;                         /* نهبط من أعلى الإطار */
 const down=h=>{const yt=y; y-=h; return [y,yt]};

 /* ١. خانة التواقيع — ثلاثة صفوف، كلٌّ زوجان من (اسم · توقيع) */
 {const [yb,yt]=down(TBS.hdr); hdr("خانة التواقيع",yb,yt)}
 TBS_SIGS.forEach(pair=>{
  const [yb,yt]=down(TBS.sig*u);
  hl(yt);
  /* أربعة أعمدة: قيمة · تسمية · قيمة · تسمية — التسمية يميناً */
  const cw=(x1-x0)/4;
  const cx=n=>x1-cw*n;
  [0,1].forEach(n=>{
   const lx1=cx(n*2), lx0=cx(n*2+1);     /* خليّة التسمية */
   const vx1=lx0,     vx0=cx(n*2+2);     /* خليّة التوقيع */
   tx(pair[n],lx0,lx1,yb,yt,2.3,"mc");
   vl(lx0,yb,yt);
   if(n===0)vl(vx0,yb,yt);
   void vx1;
  });
 });
 /* ٢. ختم الاعتماد — تسمية ثابتة وقيمةٌ يكتبها المكتب بالقلم */
 {const [yb,yt]=down(TBS.hdr); hdr("ختم الاعتماد",yb,yt)}
 TBS_STAMP.forEach(lb=>{
  const [yb,yt]=down(TBS.stamp*u);
  hl(yt);
  const xm=x1-(x1-x0)*0.38;
  tx(lb,xm,x1,yb,yt,2.3,"mc");
  vl(xm,yb,yt);
 });
 /* ٣. الملاحظات — فراغٌ مرنٌ يُكتَب عليه نصّاً أو يُترَك */
 {const [yb,yt]=down(TBS.hdr); hdr("ملاحظات",yb,yt)}
 {const [yb,yt]=down(notesH); hl(yt); void yb}
 /* ٤. المشروع والمالك — القيمة من S.title كعمود الأسفل نفسه */
 const rows=titleRows();
 const pick=n=>(rows.find(r=>r.n===n)||{v:"—"}).v;
 [["المشروع",pick("المشروع")],["المالك",pick("المالك")]]
  .forEach(([lb,v])=>{
   const [yb,yt]=down(TBS.projRow*u);
   hl(yt);
   tx(lb,x0,x1,yt-2.9*u,yt,2.1,"mr");
   tx(v, x0,x1,yb,yt-2.6*u,3.1,"mr");
  });
 /* ٥. المفتاح التخطيطي — فراغٌ مرنٌ لمخطّطٍ مصغّر */
 {const [yb,yt]=down(TBS.hdr); hdr("المفتاح التخطيطي",yb,yt)}
 {const [yb,yt]=down(keyH); hl(yt); void yb}
 /* ٦. سجلّ المراجعات — أربعة صفوف مرقّمةٍ فارغةٍ بقصد */
 {const [yb,yt]=down(TBS.revHdr);
  hl(yt);
  const cA=x1-(x1-x0)*0.18, cB=x1-(x1-x0)*0.46;
  tx("المراجعة",cA,x1,yb,yt,2.2,"mc");
  tx("التاريخ", cB,cA,yb,yt,2.2,"mc");
  tx("الوصف",  x0,cB,yb,yt,2.2,"mc");
  vl(cA,yb,yt); vl(cB,yb,yt);
 }
 for(let n=4;n>=1;n--){
  const [yb,yt]=down(TBS.revRow*u);
  hl(yt);
  const cA=x1-(x1-x0)*0.18, cB=x1-(x1-x0)*0.46;
  tx(String(n),cA,x1,yb,yt,2.0,"mc");
  vl(cA,yb,yt); vl(cB,yb,yt);
 }
 /* ٧. بيانات اللوحة — اسمُها بارزاً ثم أربعةُ صفوف ثنائية */
 {const [yb,yt]=down(TBS.nameRow*u);
  hl(yt);
  tx("اسم اللوحة",x0,x1,yt-2.9*u,yt,2.1,"mr");
  tx(pick("اسم اللوحة"),x0,x1,yb,yt-2.6*u,4.2,"mr");
 }
 const sh=S.title||{};
 const PAIRS=[
  ["رقم اللوحة",sh.sheet||"—","المراجعة",sh.rev||"0"],
  ["المقياس",scl(S.meta.scale),"التاريخ",S.meta.date||"—"],
  ["الرسم",sh.by||"—","التدقيق","—"],
  ["الاعتماد","—","الموقع",pick("الموقع")]];
 PAIRS.forEach(([l1,v1,l2,v2])=>{
  const [yb,yt]=down(TBS.dataRow*u);
  hl(yt);
  const xm=(x0+x1)/2;
  vl(xm,yb,yt);
  /* النصفُ الأيمن أوّلاً (RTL) */
  tx(l1,xm,x1,yt-2.4*u,yt,1.9,"mr");
  tx(v1,xm,x1,yb,yt-2.2*u,2.8,"mr");
  tx(l2,x0,xm,yt-2.4*u,yt,1.9,"mr");
  tx(v2,x0,xm,yb,yt-2.2*u,2.8,"mr");
 });
 /* ٨. الشعار — خليّةٌ واحدةٌ تُدرَج فيها كتلةُ المكتب */
 {const [yb,yt]=down(Math.max(TBS.logo*u,y-i.y0));
  hl(yt);
  tx("شعار المكتب",x0,x1,yb,yt,2.6,"mc");
 }
 return out;
}

/* ═══ أوّليات الورقة ═══ */
export function sheetPrims(bbox){
 if(!+S.sheet.on)return [];
 const k=Math.max(1,S.meta.scale);
 const r=sheetRect(bbox), i=innerRect(r);
 const L="A-SHET", out=[];
 const RC=q=>[[R(q.x0),R(q.y0)],[R(q.x1),R(q.y0)],
              [R(q.x1),R(q.y1)],[R(q.x0),R(q.y1)]];
 out.push({t:"poly",L,pts:RC(r),cl:1,sheet:1});
 out.push({t:"poly",L,pts:RC(i),cl:1,sheet:1});
 northPrims(i,k).forEach(g=>out.push(g));
 if(!+S.sheet.tb)return out;
 /* الطراز الجانبي مسارٌ منفصل تماماً — الافتراضي "col" لا يمرّ به */
 if(S.sheet.tbStyle==="side"){
  tbSidePrims(i,k).forEach(g=>out.push(g));
  return out;
 }

 tbColPrims(i,k).forEach(g=>out.push(g));
 return out;
}
/* بلوكُ العنوان العمودي في مستطيلٍ داخليّ i بمعامل k — يستعمله النموذجُ
   (k = المقياس) والورقةُ بمنافذها (k = 1، مليمتراً فيزيائياً) */
function tbColPrims(i,k,ov){
 const L="A-SHET", out=[];
 const rows=titleRows(ov);
 const totH=rows.reduce((s,x)=>s+x.h,0);
 const w=TB_W*k, H=totH*k;
 const x0=i.x1-w, x1=i.x1, yb=i.y0;
 out.push({t:"poly",L,sheet:1,cl:1,pts:[
  [R(x0),R(yb)],[R(x1),R(yb)],[R(x1),R(yb+H)],[R(x0),R(yb+H)]]});
 /* الصفوف من الأسفل إلى الأعلى بترتيب معكوس */
 let y=yb;
 const lab=k*2.0, val=k*3.2, valBig=k*4.6;
 for(let n=rows.length-1;n>=0;n--){
  const rw=rows[n], hh=rw.h*k;
  if(n<rows.length-1)
   out.push({t:"line",L,sheet:1,
    a:[R(x0),R(y)], b:[R(x1),R(y)]});
  out.push({t:"text",L,sheet:1,s:rw.n,
   x:R(x1-k*2.5), y:R(y+hh-lab*1.35), h:R(lab), al:"br"});
  out.push({t:"text",L,sheet:1,s:rw.v,
   x:R(x1-k*2.5), y:R(y+k*1.8),
   h:R(rw.big?valBig:val), al:"br"});
  y+=hh;
 }
 return out;
}

/* ═══★ المرحلة 4 — الأوراق المتعددة والمنافذ ★═══
   كل ما يلي إضافيٌّ خالص: لا يمسّ دالّةً واحدةً ممّا سبق. الأوراق
   المتعددة (S.sheets) تتعايش مع الورقة المفردة القديمة (S.sheet) —
   الأولى فضاءٌ ورقيٌّ منفصل لا يدخل modelScene ولا boq ولا الفاحص،
   والثانية تبقى كما كانت لكل مستدعٍ حاليّ (render.js وexport.js). */

/* الورقة النشطة من S.sheets إن وُجدت، وإلا null — لا سقوط تلقائيّ
   على S.sheet هنا: من يريد ذلك التوافق يفعله صراحةً (4C). */
export function activeSheetDef(){
 if(!Array.isArray(S.sheets)||!S.sheets.length)return null;
 return S.sheets.find(sh=>sh.id===S.activeSheet)||S.sheets[0];
}

/* مقاس ورقةٍ صريحة (من سجلّ الأوراق الجديد) — {w,h} مليمتر ورقي */
export function sheetPapers(sh){
 const orient=(sh&&sh.orient==="p")?"p":"l";
 const a=baseDims(sh);
 return orient==="p"?{w:a[1],h:a[0]}:{w:a[0],h:a[1]};
}

/* ═══ بنّاءو ورقة/منفذ — خالصان: لا يكتبان في S ولا يُنادَيان إلا
   عبر addSheet/addViewport (اللذين يمرّان بـV() أوّلاً). ═══ */
export function mkSheet(o){
 const p=o||{};
 return {
  id:(p.id!=null&&String(p.id))||newId("sh"),
  name:String(p.name==null?"":p.name).slice(0,200)||"ورقة",
  size:(SIZES[p.size]||p.size==="custom")?p.size:"A3",
  customW:customDims(p)[0], customH:customDims(p)[1],
  orient:p.orient==="p"?"p":"l",
  margin:clamp(+p.margin||12,0,60),
  tb:p.tb?1:0,
  north:p.north?1:0,
  cx:(p.cx!=null&&isFinite(+p.cx))?Math.round(+p.cx):null,
  cy:(p.cy!=null&&isFinite(+p.cy))?Math.round(+p.cy):null,
  viewports:[]
 };
}
export function mkViewport(o){
 const p=o||{};
 return {
  id:(p.id!=null&&String(p.id))||newId("vp"),
  name:String(p.name==null?"":p.name).slice(0,200)||"منفذ",
  modelRect:p.modelRect, paperRect:p.paperRect,
  layers:Array.isArray(p.layers)?p.layers.slice():null,
  frozen:Array.isArray(p.frozen)?p.frozen.slice():null,
  visible:p.visible==null?1:(p.visible?1:0),
  /* levelScope — B/F5: أيّ طابقٍ يعرضه هذا المنفذ، بمعزلٍ عن
     الطابق النشط حالياً في التحرير. null (الافتراض) يعني بلا
     تخصيصٍ: يعرض ما يعرضه المشهد العامّ كما كان قبل هذا الحقل.
     ═══ تنبيهٌ صريح ═══ الحقل هنا بياناتٌ محفوظةٌ ومُطبَّعةٌ فقط.
     composeSheet أسفله لا يقرأه بعد: تصفية prims فعلياً بطابقٍ
     مختلفٍ عن طابق scene() الحاليّ تتطلّب من io/export.js حساب
     مشهدٍ مستقلٍّ لكل طابقٍ مطلوب (تبديل S.meta.level مؤقّتاً)
     قبل composeSheet — تغييرٌ في نقطة استدعاءٍ أخرى، لا هنا، وهو
     خارج هذه الدفعة. تفعيلُ الحقل الآن بلا ذلك التوصيل قد يوهم
     بتصفيةٍ لا تجري فعلاً، فتُرك التوصيل لدفعةٍ لاحقة. */
  levelScope:(p.levelScope==null)?null:normLevel(p.levelScope)
 };
}

const dimOf=r=>({w:Math.abs(r.x1-r.x0), h:Math.abs(r.y1-r.y0)});
function checkVpRects(modelRect,paperRect){
 const m=dimOf(modelRect), p=dimOf(paperRect);
 const mm=Math.max(m.w,m.h), pm=Math.max(p.w,p.h);
 if(mm>LIM.vpModelRectMM.max||mm<LIM.vpModelRectMM.min)
  throw new Error(`مستطيل النموذج خارج الحدّ (${LIM.vpModelRectMM.min}–`
   +`${LIM.vpModelRectMM.max} مم)`);
 if(pm>LIM.vpPaperRectMM.max||pm<LIM.vpPaperRectMM.min)
  throw new Error(`مستطيل الورقة خارج الحدّ (${LIM.vpPaperRectMM.min}–`
   +`${LIM.vpPaperRectMM.max} مم)`);
}

/* ═══ عمليّات الكتابة — كلٌّ منها ذرّيٌّ ويُستدعى داخل edit() من
   المستدعي (أداةٌ في الواجهة، أو اختبار). لا شيء هنا يستدعي edit()
   بنفسه: فذلك قرار المستدعي وحده (كسائر core/*.js). ═══ */
export function addSheet(o){
 V("sheet",o||{});
 if((S.sheets||[]).length>=LIM.sheets.max)
  throw new Error(`بلغ عدد الأوراق الحدّ الأقصى ${LIM.sheets.max}`);
 const sh=mkSheet(o);
 if(!Array.isArray(S.sheets))S.sheets=[];
 S.sheets.push(sh);
 if(S.activeSheet==null)S.activeSheet=sh.id;
 touchView();
 return sh;
}
export function removeSheet(id){
 const i=(S.sheets||[]).findIndex(sh=>sh.id===id);
 if(i<0)return false;
 S.sheets.splice(i,1);
 if(S.activeSheet===id)
  S.activeSheet=S.sheets.length?S.sheets[0].id:null;
 touchView();
 return true;
}
export function renameSheet(id,name){
 const sh=(S.sheets||[]).find(s=>s.id===id);
 if(!sh)return false;
 sh.name=String(name==null?"":name).slice(0,200)||"ورقة";
 touchView();
 return true;
}
export function setActiveSheet(id){
 if(!(S.sheets||[]).some(sh=>sh.id===id))return false;
 S.activeSheet=id;
 touchView();
 return true;
}
export function addViewport(sheetId,o){
 const sh=(S.sheets||[]).find(s=>s.id===sheetId);
 if(!sh)throw new Error("لا وجود لورقةٍ بهذا المعرّف");
 const vv=V("vpv",o||{});
 if((sh.viewports||[]).length>=LIM.viewportsPerSheet.max)
  throw new Error(`بلغ عدد منافذ الورقة الحدّ الأقصى `
   +`${LIM.viewportsPerSheet.max}`);
 checkVpRects(vv.modelRect,vv.paperRect);
 const vp=mkViewport(Object.assign({},o,
  {modelRect:vv.modelRect,paperRect:vv.paperRect}));
 if(!Array.isArray(sh.viewports))sh.viewports=[];
 sh.viewports.push(vp);
 touchView();
 return vp;
}
export function updateViewport(sheetId,vpId,patch){
 const sh=(S.sheets||[]).find(s=>s.id===sheetId);
 const vp=sh&&(sh.viewports||[]).find(v=>v.id===vpId);
 if(!vp)return false;
 const p=patch||{};
 if(p.modelRect!=null||p.paperRect!=null){
  const mr=p.modelRect!=null?V("vpv",{modelRect:p.modelRect,
   paperRect:vp.paperRect}).modelRect:vp.modelRect;
  const pr=p.paperRect!=null?V("vpv",{modelRect:vp.modelRect,
   paperRect:p.paperRect}).paperRect:vp.paperRect;
  checkVpRects(mr,pr);
  vp.modelRect=mr; vp.paperRect=pr;
 }
 if(p.name!=null)vp.name=String(p.name).slice(0,200)||"منفذ";
 if(p.visible!=null)vp.visible=p.visible?1:0;
 if(p.layers!==undefined)
  vp.layers=Array.isArray(p.layers)?p.layers.slice():null;
 if(p.frozen!==undefined)
  vp.frozen=Array.isArray(p.frozen)?p.frozen.slice():null;
 if(p.levelScope!==undefined)
  vp.levelScope=(p.levelScope==null)?null:normLevel(p.levelScope);
 touchView();
 return true;
}
export function removeViewport(sheetId,vpId){
 const sh=(S.sheets||[]).find(s=>s.id===sheetId);
 if(!sh)return false;
 const i=(sh.viewports||[]).findIndex(v=>v.id===vpId);
 if(i<0)return false;
 sh.viewports.splice(i,1);
 touchView();
 return true;
}

/* ═══ تحويل المنفذ ═══ مقياسٌ موحّد يمنع التشويه:
   k=min(pw/mw, ph/mh)، والفرقُ يتوسّط داخل مستطيل الورقة. */
export function viewportTransform(vp){
 const m=vp.modelRect, p=vp.paperRect;
 if(!m||!p)return null;
 const mw=m.x1-m.x0, mh=m.y1-m.y0;
 const pw=p.x1-p.x0, ph=p.y1-p.y0;
 if(mw<=0||mh<=0||pw<=0||ph<=0)return null;
 const k=Math.min(pw/mw, ph/mh);
 const dx=p.x0+(pw-mw*k)/2-m.x0*k;
 const dy=p.y0+(ph-mh*k)/2-m.y0*k;
 return {k,dx,dy};
}
/* الإطار الفعليّ للمنفذ بعد التوسيط — هو حدود القصّ على الورقة */
export function viewportFrame(vp){
 const t=viewportTransform(vp);
 if(!t)return null;
 return {x0:R(vp.modelRect.x0*t.k+t.dx),
         y0:R(vp.modelRect.y0*t.k+t.dy),
         x1:R(vp.modelRect.x1*t.k+t.dx),
         y1:R(vp.modelRect.y1*t.k+t.dy)};
}

/* ═══ مقاييس المنفذ القياسية ═══ لا حقل مقياس مستقلّ على المنفذ:
   paperRect وحده مصدرُ التحويل، والمقياس مشتقٌّ منه 1:k حيث
   k=paper/model — فلا حقلان ينجرفان عن بعضهما. */
export const VP_SCALES=[20,25,50,75,100,125,150,200,250,300,500,750,1000];
export const kForScale=s=>(s&&+s>0)?1/(+s):null;

/* المقياس المشتقّ من منفذٍ: scale=1/k مقرّباً لخمسة — للعرض لا
   لاتخاذ القرار (المصدر k لا عكسه). */
export const viewportScale=v=>{
 const t=viewportTransform(v);
 if(!t)return null;
 return Math.max(1,Math.round((1/t.k)/5)*5);
};

/* ═══ ضبط مقياس منفذٍ قائم ═══
   يعيد حساب paperRect بمقياسٍ موحّدٍ بلا تشويه، متمركزاً حول
   anchor (أو مركز الورقة الحاليّ إن غاب). modelRect لا يُمَسّ،
   والرفضُ رميٌ قبل أي كتابة — كسائر عمليات النواة. */
export function setViewportScale(sheetId,vpId,scale,anchor){
 scale=+scale;
 const k=kForScale(scale);
 if(!k)throw new Error(`«${scale}» ليس مقياساً صالحاً`);
 const sh=(S.sheets||[]).find(s=>s.id===sheetId);
 if(!sh)throw new Error("لا وجود لورقةٍ بهذا المعرّف");
 const vp=(sh.viewports||[]).find(v=>v.id===vpId);
 if(!vp)throw new Error("لا وجود لمنفذٍ بهذا المعرّف");
 const m=vp.modelRect, p=vp.paperRect;
 if(!m||!p)throw new Error("منفذٌ بلا مستطيلَي نموذجٍ وورقة");
 const mw=m.x1-m.x0, mh=m.y1-m.y0;
 const pw=mw*k, ph=mh*k;
 /* المرساة: مركز مستطيل الورقة الحاليّ ما لم يُعطَ anchor */
 const ax=(anchor&&isFinite(+anchor[0]))?+anchor[0]:(p.x0+p.x1)/2;
 const ay=(anchor&&isFinite(+anchor[1]))?+anchor[1]:(p.y0+p.y1)/2;
 /* يمرّ بـV فيُقرَّب ويُرفَض المعكوس، ثم بفحص حدود المنفذ */
 const pr=V("vpv",{modelRect:m,paperRect:{
  x0:ax-pw/2, y0:ay-ph/2, x1:ax+pw/2, y1:ay+ph/2}}).paperRect;
 checkVpRects(m,pr);
 vp.paperRect=pr;
 touchView();
 return vp;
}

/* ═══ القصّ ═══ Cohen–Sutherland لقطعة · Sutherland–Hodgman لمضلع */
export function clipSegToRect(a,b,r){
 const code=p=>(p[0]<r.x0?1:0)|(p[0]>r.x1?2:0)
             |(p[1]<r.y0?4:0)|(p[1]>r.y1?8:0);
 let p0=[a[0],a[1]], p1=[b[0],b[1]];
 let c0=code(p0), c1=code(p1), guard=0;
 while(guard++<8){
  if(!(c0|c1))return [p0,p1];
  if(c0&c1)return null;
  const c=c0||c1;
  let x,y;
  if(c&8){y=r.y1; x=p0[0]+(p1[0]-p0[0])*(r.y1-p0[1])/(p1[1]-p0[1]);}
  else if(c&4){y=r.y0; x=p0[0]+(p1[0]-p0[0])*(r.y0-p0[1])/(p1[1]-p0[1]);}
  else if(c&2){x=r.x1; y=p0[1]+(p1[1]-p0[1])*(r.x1-p0[0])/(p1[0]-p0[0]);}
  else{x=r.x0; y=p0[1]+(p1[1]-p0[1])*(r.x0-p0[0])/(p1[0]-p0[0]);}
  if(c===c0){p0=[R(x),R(y)]; c0=code(p0);}
  else{p1=[R(x),R(y)]; c1=code(p1);}
 }
 return null;
}
export function clipPolyToRect(pts,r){
 if(!pts||pts.length<3)return [];
 let out=pts.slice();
 const EDGES=[
  {a:0, lim:r.x0, s: 1}, {a:0, lim:r.x1, s:-1},
  {a:1, lim:r.y0, s: 1}, {a:1, lim:r.y1, s:-1}];
 for(const e of EDGES){
  if(!out.length)break;
  const res=[], n=out.length;
  const inn=p=>(p[e.a]-e.lim)*e.s>=0;
  for(let i2=0;i2<n;i2++){
   const cur=out[i2], nxt=out[(i2+1)%n];
   const ci=inn(cur), ni=inn(nxt);
   if(ci)res.push(cur);
   if(ci!==ni){
    const p=[cur[0],cur[1]];
    const d=nxt[e.a]-cur[e.a];
    if(d){
     p[0]=cur[0]+(nxt[0]-cur[0])*(e.lim-cur[e.a])/d;
     p[1]=cur[1]+(nxt[1]-cur[1])*(e.lim-cur[e.a])/d;
    }
    p[e.a]=e.lim;
    res.push([R(p[0]),R(p[1])]);
   }
  }
  out=res;
 }
 return out;
}

/* ═══ قصّ قوسٍ حقيقيّ على إطار المنفذ ═══
   القصُّ تحليليٌّ على الحواف الأربعة. والفرق عن المضلّع أنّ القوس
   قد يخرج داخلاً في عدّة قطع (أربعٌ حين يعبر الأركان)، وقد يكون
   عابراً أو خارجاً كلّياً.
   والاجتياح موقَّعٌ بعلامته: القوس 0→90 يبقى 0→90 حين يكون داخل
   الإطار كلّه، و0→−90 يبقى سالباً — فالعلامة محفوظةٌ كجزءٍ من
   هويّة القوس لا عرضٌ يُطيعَ القصّ.
   والدائرة الكاملة (|sweep|≥359.5) تُعامل بإبسيلون حتى لا تتشقق
   على فرق 0.1° · بلا تقاطعٍ تُعاد نسختُها كما جاءت. */
const mkA=(cx,cy,r,a0,a1)=>({cx,cy,r,a0,a1});
/* ═══ قصُّ المنفذ بحدٍّ غيرِ مستطيل ═══ §٣ (أولوية منخفضة)
   المنفذُ كان مستطيلاً دائماً، فتفصيلةٌ دائريةٌ (وهي العرفُ في
   التفاصيل المكبَّرة) كانت تُرسَم مستطيلةً ويُقَصّ الباقي بالعين —
   أو لا يُقَصّ فيظهر ما لا يُراد.

   ═══ الحدُّ **محدَّبٌ** وحدَه — وهذا قرارٌ مُعلَنٌ لا نقصٌ مخفيّ ═══
   خوارزمية Sutherland–Hodgman تقصُّ قصّاً صحيحاً تماماً بحدٍّ محدَّب،
   وتُنتج بحدٍّ مقعَّرٍ مضلّعاتٍ **خاطئةً** (أضلاعٌ وهميةٌ تصل أجزاءً
   منفصلة) بلا أيِّ خطأٍ ظاهر. فالمقعَّرُ **يُرفَض عند الإسناد**
   برسالةٍ تسمّي السبب، لا يُقبَل ثم يُرسَم كذباً. والمحدَّبُ يكفي
   لكلِّ ما يُطلَب فعلاً: دائرةٌ (مضلَّعةٌ) · مثمَّنٌ · شبهُ منحرفٍ ·
   مثلّث.

   والقوسُ يُفتَّت أضلاعاً حين يوجد حدٌّ مضلّع: `clipArcToRect` تقصُّ
   القوسَ قصّاً هندسياً حقيقياً بحدٍّ مستطيلٍ وحدَه، ومدُّ ذلك إلى
   مضلّعٍ أيٍّ كان حسابٌ آخر. فالتفتيتُ **مُعلَنٌ** هنا وفي
   audit/08، وأثرُه قوسٌ يُصدَّر أضلاعاً في منفذٍ مقصوصٍ بمضلّع. */
export const VPCLIP_MIN=3, VPCLIP_MAX=120;
/* تفتيتُ القوسِ عند وجودِ حدٍّ مضلّع — ٦٤ ضلعاً على الدورةِ الكاملةِ
   تكفي لقوسٍ في منفذٍ بمقياسٍ مكبَّر، والعددُ معلَنٌ لا مبثوث. */
export const ARC_SEGS=64;
/* الحدُّ يُخزَّن بإحداثياتٍ **نسبيةٍ** (٠–١) من مستطيلِ الورقة:
   فتحريكُ المنفذِ أو تغييرُ مقياسِه لا يُفقِد الحدَّ موضعَه، ولا
   يُخزَّن موضعٌ مطلقٌ ينجرف عن مربّعه. */
export function vpClipPaper(vp){
 const C=vp&&vp.clip;
 if(!Array.isArray(C)||C.length<VPCLIP_MIN)return null;
 const r=vp.paperRect;
 if(!r)return null;
 const x0=Math.min(r.x0,r.x1), y0=Math.min(r.y0,r.y1);
 const w=Math.abs(r.x1-r.x0), h=Math.abs(r.y1-r.y0);
 return C.map(p=>[x0+p[0]*w, y0+p[1]*h]);
}
/* داخلَ ضلعٍ موجَّه؟ — الاتجاهُ من ترتيبِ الرؤوس */
const sideOf=(a,b,p)=>
 (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
const xcut=(a,b,e0,e1)=>{
 const d1=sideOf(e0,e1,a), d2=sideOf(e0,e1,b);
 const t=(d1-d2)?d1/(d1-d2):0;
 return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t];
};
/* قطعةٌ مقصوصةٌ بمضلّعٍ محدَّب — تقليمٌ متوالٍ على كلِّ ضلع */
export function clipSegToPoly(a,b,P){
 let A=a.slice(), B=b.slice();
 const n=P.length;
 /* الاتجاهُ يُقرَأ مرّةً: المضلّعُ قد يكون بعقاربِ الساعةِ أو عكسَها */
 const ccw=pArea(P)>0;
 for(let i=0;i<n;i++){
  const e0=P[i], e1=P[(i+1)%n];
  const inA=ccw?sideOf(e0,e1,A)>=0:sideOf(e0,e1,A)<=0;
  const inB=ccw?sideOf(e0,e1,B)>=0:sideOf(e0,e1,B)<=0;
  if(!inA&&!inB)return null;
  if(inA&&inB)continue;
  const X=xcut(A,B,e0,e1);
  if(inA)B=X; else A=X;
 }
 return (Math.hypot(B[0]-A[0],B[1]-A[1])<1e-6)?null:[A,B];
}
/* حلقةٌ مقصوصةٌ بمضلّعٍ محدَّب — Sutherland–Hodgman */
export function clipPolyToPoly(pts,P){
 let out=(pts||[]).map(p=>p.slice());
 if(out.length<3)return null;
 const n=P.length;
 const ccw=pArea(P)>0;
 for(let i=0;i<n&&out.length;i++){
  const e0=P[i], e1=P[(i+1)%n];
  const inn=p=>ccw?sideOf(e0,e1,p)>=0:sideOf(e0,e1,p)<=0;
  const next=[];
  for(let j=0;j<out.length;j++){
   const A=out[j], B=out[(j+1)%out.length];
   const iA=inn(A), iB=inn(B);
   if(iA)next.push(A);
   if(iA!==iB)next.push(xcut(A,B,e0,e1));
  }
  out=next;
 }
 return out.length>2?out:null;
}
/* ═══ إسنادُ الحدِّ ونزعُه ═══
   المصدرُ مضلّعٌ في فضاءِ **النموذج** (حلقةُ خطٍّ متعدّدٍ مثلاً)،
   ويُحوَّل هنا إلى نسبٍ من مستطيلِ الورقة. والتحويلُ مرّةً واحدةً
   عند الإسناد لا في كلِّ رسمة: الحدُّ قرارٌ ثابتٌ لا دالّةٌ حيّة.

   والمقعَّرُ يُرفَض برسالةٍ تسمّي السبب (انظر رأسَ القصِّ أعلاه):
   قبولُه ثم رسمُه بأضلاعٍ وهميةٍ أسوأُ من رفضِه. */
export function vpSetClip(vp,modelPts){
 if(!vp)throw new Error("لا منفذ");
 if(!vp.paperRect||!vp.modelRect)
  throw new Error("المنفذُ بلا مستطيلَين — لا حدَّ يُسنَد");
 const t=viewportTransform(vp);
 if(!t)throw new Error("تحويلُ المنفذِ غيرُ صالح");
 const P=(modelPts||[]).filter(p=>Array.isArray(p)
  &&isFinite(p[0])&&isFinite(p[1]));
 if(P.length<VPCLIP_MIN)
  throw new Error(`الحدُّ يحتاج ${VPCLIP_MIN} رؤوسٍ على الأقل`);
 if(P.length>VPCLIP_MAX)
  throw new Error(`${P.length} رأساً — الحدّ ${VPCLIP_MAX}`);
 /* إلى فضاءِ الورقة ثم إلى نسبٍ من مستطيلها */
 const r=vp.paperRect;
 const x0=Math.min(r.x0,r.x1), y0=Math.min(r.y0,r.y1);
 const w=Math.abs(r.x1-r.x0), h=Math.abs(r.y1-r.y0);
 if(w<1||h<1)throw new Error("مستطيلُ الورقةِ أصغرُ من أن يُقسَم");
 const pp=P.map(p=>[p[0]*t.k+t.dx, p[1]*t.k+t.dy]);
 if(!isConvexRing(pp))
  throw new Error("الحدُّ مقعَّر — القصُّ المدعومُ محدَّبٌ وحدَه "
   +"(دائرةٌ · مثمَّنٌ · شبهُ منحرفٍ · مثلّث). المقعَّرُ يُنتج "
   +"أضلاعاً وهميةً تصل أجزاءً منفصلةً بلا خطأٍ ظاهر، فرُفِض.");
 if(Math.abs(pArea(pp))<1)
  throw new Error("مساحةُ الحدِّ صفرٌ — رؤوسٌ على استقامةٍ واحدة");
 vp.clip=pp.map(p=>[
  +(((p[0]-x0)/w)).toFixed(5),
  +(((p[1]-y0)/h)).toFixed(5)]);
 touchView();
 return {n:vp.clip.length};
}
export function vpClearClip(vp){
 if(!vp||!vp.clip)return false;
 delete vp.clip;
 touchView();
 return true;
}
export function clipArcToRect(g,F){
 const r=Math.abs(g.r)||0;
 if(r<0.5||!F)return [];
 const a0=g.a0||0;
 const a1=(g.a1==null)?0:g.a1;
 const sweep=a1-a0;
 const full=Math.abs(sweep)>=359.5;
 const sgn=sweep<0?-1:1;

 /* نقطةٌ داخل الإطار بزاوية th */
 const inside=th=>{
  const d=th*Math.PI/180;
  const px=g.cx+r*Math.cos(d), py=g.cy+r*Math.sin(d);
  return px>=F.x0&&px<=F.x1&&py>=F.y0&&py<=F.y1;
 };

 /* تقاطعاتُ الحواف الأربعة — حلٌّ تحليليٌّ لا تتبُّعٌ رقمي */
 const its=[];
 const put=th=>{
  if(!its.some(x=>Math.abs(x-th)<1e-6))its.push(th);
 };
 const addX=X=>{
  const c=(X-g.cx)/r;
  if(Math.abs(c)<=1.000000001){
   const cc=Math.max(-1,Math.min(1,c));
   const th=Math.acos(cc)*180/Math.PI;
   put(th); put(-th);
  }
 };
 const addY=Y=>{
  const s=(Y-g.cy)/r;
  if(Math.abs(s)<=1.000000001){
   const ss=Math.max(-1,Math.min(1,s));
   const th=Math.asin(ss)*180/Math.PI;
   put(th); put(180-th);
  }
 };
 addX(F.x0); addX(F.x1); addY(F.y0); addY(F.y1);

 /* الدائرة الكاملة: إن لم تتقاطع فهي إمّا داخلةٌ كلُّها أو خارجةٌ
    كلُّها */
 if(full){
  const remaining=Math.abs(sweep);
  if(!its.length)
   return inside(a0)?[mkA(g.cx,g.cy,r,a0,a0+remaining)]:[];
  /* عقدُ التقاطع مطبَّعةٌ على [0,360) ثم حلقةٌ بها خاتمة */
  const A=its.map(t=>((t%360)+360)%360).sort((p,q)=>p-q);
  const out=[];
  for(let i=0;i<A.length;i++){
   const t1=A[i];
   const t2=A[(i+1)%A.length]+((i+1===A.length)?360:0);
   const tm=(t1+t2)/2;
   if(inside(tm))out.push(mkA(g.cx,g.cy,r,t1,t2));
  }
  return out;
 }

 /* قوسٌ محدود المسح: موضعُ كلِّ زاويةٍ على طول المسح من [0,|sweep|]
    — القيمة نفسها تمشي من a0 إلى a1 مهما كانت العلامة. */
 const pos=th=>{
  const rel=((th-a0)%360+360)%360;
  return sgn>0?rel:((rel===0)?0:360-rel);
 };
 const S=Math.abs(sweep);
 const C=[0,S];
 its.forEach(th=>{
  const t=pos(th);
  if(t>=-1e-7&&t<=S+1e-7)C.push(Math.max(0,Math.min(S,t)));
 });
 C.sort((p,q)=>p-q);
 const U=[];
 C.forEach((t,i)=>{if(!i||Math.abs(t-U[U.length-1])>1e-6)U.push(t)});
 const out=[];
 for(let i=0;i+1<U.length;i++){
  const t1=U[i], t2=U[i+1];
  if(t2-t1<1e-6)continue;
  const tm=(t1+t2)/2;
  if(inside(a0+(sgn>0?tm:-tm)))
   out.push(mkA(g.cx,g.cy,r,
    a0+(sgn>0?t1:-t1), a0+(sgn>0?t2:-t2)));
 }
 return out;
}

/* ═══ هل الورقة بلا منافذ ظاهرة؟ · عدُّ المنافذ الظاهرة ═══ */
export function sheetHasViewports(sh){
 return !!(sh&&Array.isArray(sh.viewports)&&sh.viewports.some(
  vp=>vp&&vp.visible&&vp.modelRect&&vp.paperRect));
}
export function visibleViewportCount(sh){
 if(!sh||!Array.isArray(sh.viewports))return 0;
 return sh.viewports.filter(vp=>vp&&vp.visible
  &&vp.modelRect&&vp.paperRect).length;
}

/* ═══ تركيب الورقة ═══ يحوّل أوّليات المشهد النموذجي إلى أوّلياتٍ
   في فضاء الورقة (مليمتر فيزيائي) مقصوصةً على إطار كل منفذ ظاهر.
   خالصةٌ تماماً: {prims,dropped,papers} — لا تكتب في S، ولا تدخل
   الأوّلياتُ الناتجة boq ولا الفاحص (فليست من modelScene). ترتيب
   المنافذ في sh.viewports هو ترتيب رسمها (اللاحق فوق السابق).

   الصبغة (fill) تُقصّ حلقتُها كلّها، والهاشور تُقصّ حلقاتُه كلُّها
   مع تحويل تباعده sc بعامل المنفذ، والشرطة (dash) تُحوَّل بالعامل
   نفسه، والأقواس تُقصّ قصّاً هندسياً حقيقياً بلا تفتيت (clipArcToRect).
   وما يقع خارج الإطار كليّاً يُعَدّ ضمن dropped — الإسقاطُ معلَن لا
   صامت. */
export function composeSheet(sh,prims,opts){
 const papers=sheetPapers(sh);
 const out=[];
 let dropped=0;
 (sh&&sh.viewports||[])
  .filter(vp=>vp&&vp.visible&&vp.modelRect&&vp.paperRect)
  .forEach(vp=>{
   const t=viewportTransform(vp), F=viewportFrame(vp);
   if(!t||!F)return;
   const allowed=Array.isArray(vp.layers)
    ?(L)=>vp.layers.indexOf(L)>=0
    :()=>true;
   /* تجميد المنفذ: إنكارٌ محليّ. إسقاطه صامتٌ (لا dropped) لأنه
      قرارُ مستخدمٍ معلَن، والفلترُ العام scene() لا يدرى به — فلا
      أثرَ على مشهد العمل ولا على BOQ ولا على التصدير العالمي. */
   const frozen=new Set(Array.isArray(vp.frozen)?vp.frozen:[]);
   const gx=x=>R(x*t.k+t.dx), gy=y=>R(y*t.k+t.dy);
   /* ═══ الحدُّ غيرُ المستطيل §٣ ═══ المستطيلُ يُقَصّ أوّلاً (رفضٌ
      رخيصٌ لما يقع بعيداً) ثم المضلّعُ. والمقعَّرُ لا يصل هنا:
      يُرفَض عند الإسناد (vpSetClip) — فالقصُّ هنا يثق بمحدَّبٍ. */
   const CP=vpClipPaper(vp);
   const cSeg=(A,B)=>{
    const e=clipSegToRect(A,B,F);
    if(!e||!CP)return e;
    return clipSegToPoly(e[0],e[1],CP);
   };
   const cPoly=(pts)=>{
    const e=clipPolyToRect(pts,F);
    if(!e||e.length<3||!CP)return e;
    return clipPolyToPoly(e,CP)||[];
   };
   /* شرطةٌ وتباعد هاشورٍ يُحوَّلان بعامل المنفذ نفسه */
   const kDash=d=>(d||[]).map(v=>Math.max(0.1,v*t.k));
   (prims||[]).forEach(g=>{
    if(!g)return;
    /* إطارُ الورقة وبلوكُها يُرسَمان في فضاء النموذج بعلامة sheet،
       وعلاماتُ التشخيص عرضٌ محض — لا شيء منهما يدخل تركيبَ منفذ. */
    if(g.sheet||g.diag)return;
    /* رمزُ وسمٍ له مانحٌ آخر لا يُرسَم هنا — تأشيرٌ خالصٌ يتبع
       منفذَ مصدره وحده */
    if(g.covp&&g.covp!==vp.id)return;
    if(frozen.has(g.L||"0"))return;
    if(!allowed(g.L||"0")){dropped++; return}
    if(g.t==="line"){
     const e=cSeg([gx(g.a[0]),gy(g.a[1])],
      [gx(g.b[0]),gy(g.b[1])]);
     if(e){
      const q={t:"line",L:g.L||"0",a:e[0],b:e[1],vp:vp.id};
      if(g.dash&&g.dash.length)q.dash=kDash(g.dash);
      out.push(q);
     }else dropped++;
     return;
    }
    if(g.t==="poly"){
     const pts=(g.pts||[]).map(p=>[gx(p[0]),gy(p[1])]);
     const e=cPoly(pts);
     if(e.length>=3){
      const q={t:"poly",L:g.L||"0",pts:e,cl:g.cl?1:0,vp:vp.id};
      if(g.dash&&g.dash.length)q.dash=kDash(g.dash);
      out.push(q);
     }else dropped++;
     return;
    }
    /* ═══ صبغة المنطقة ═══ حلقتُها تُقصّ كاملةً. والنمطُ يبقى
       (tint/hatch) لأنّ تباعده يُحسَب في القارئ من مقاس المخرَج. */
    if(g.t==="fill"){
     const ring=(g.ring||[]).map(p=>[gx(p[0]),gy(p[1])]);
     const e=cPoly(ring);
     if(e.length>=3)
      out.push({t:"fill",L:g.L||"0",ring:e,
       style:g.style||"tint",aid:g.aid,vp:vp.id});
     else dropped++;
     return;
    }
    /* ═══ هاشور الجدران ═══ حلقةٌ تُقصّ حلقةً والتباعدُ بعامل
       المنفذ. والحلقةُ الأصغر من ثلاثة أضلاع تُسقَط. */
    if(g.t==="hatch"){
     const loops=[];
     (g.loops||[]).forEach(lp=>{
      if(!lp)return;
      const e=cPoly(lp.map(p=>[gx(p[0]),gy(p[1])]));
      if(e.length>=3)loops.push(e);
     });
     if(loops.length){
      const q={t:"hatch",L:g.L||"0",loops,
       pat:g.pat||"ANSI31",vp:vp.id};
      if(g.sc)q.sc=Math.max(1,(g.sc||1)*t.k);
      out.push(q);
     }else dropped++;
     return;
    }
    if(g.t==="arc"||g.t==="circle"){
     const rr=R((g.r||0)*t.k);
     if(rr<0.5){dropped++; return}
     const base=(g.t==="circle")
      ? {cx:gx(g.cx),cy:gy(g.cy),r:rr,a0:0,a1:359.9}
      : {cx:gx(g.cx),cy:gy(g.cy),r:rr,a0:g.a0,a1:g.a1};
     /* القوسُ يُقَصّ قصّاً هندسياً حقيقياً بحدٍّ مستطيلٍ وحدَه.
        ومع حدٍّ مضلّعٍ يُفتَّت أضلاعاً: مدُّ القصِّ الهندسيِّ إلى
        مضلّعٍ أيٍّ كان حسابٌ آخر، والتفتيتُ **مُعلَنٌ** هنا وفي
        audit/08 — أثرُه قوسٌ يُصدَّر أضلاعاً في منفذٍ مقصوصٍ
        بمضلّع، وهو منفذُ تفصيلةٍ صغيرٌ بطبعه. */
     if(CP){
      const segs=ARC_SEGS;
      const a0=(base.a0||0)*D2R, a1=(base.a1||0)*D2R;
      let sw=a1-a0;
      if(Math.abs(sw)<1e-9)sw=Math.PI*2;
      let prev=null, any=0;
      for(let i=0;i<=segs;i++){
       const u=a0+sw*(i/segs);
       const q=[R(base.cx+base.r*Math.cos(u)),
                R(base.cy+base.r*Math.sin(u))];
       if(prev){
        const e=cSeg(prev,q);
        if(e){
         out.push({t:"line",L:g.L||"0",a:e[0],b:e[1],vp:vp.id});
         any=1;
        }
       }
       prev=q;
      }
      if(!any)dropped++;
      return;
     }
     const parts=clipArcToRect(base,F);
     if(parts.length)
      parts.forEach(p=>out.push({t:"arc",L:g.L||"0",
       cx:p.cx,cy:p.cy,r:p.r,a0:p.a0,a1:p.a1,vp:vp.id}));
     else dropped++;
     return;
    }
    if(g.t==="text"){
     const x=gx(g.x), y=gy(g.y);
     /* النصُّ يُبقى أو يُسقَط كلُّه — نصفُ حرفٍ لا يُقرَأ،
        فالمرساةُ هي الحكم (كما كان مع المستطيل). */
     if(x>=F.x0&&x<=F.x1&&y>=F.y0&&y<=F.y1
      &&(!CP||pip(CP,x,y)))
      out.push({t:"text",L:g.L||"0",s:g.s,x,y,
       h:R((g.h||1)*t.k),rot:g.rot||0,al:(g.al||"").slice(0,4),
       vp:vp.id});
     else dropped++;
     return;
    }
    /* نوعٌ آخر غير مدعومٍ بعد: يُسقَط ويُعَدّ — لا صمت */
    dropped++;
   });
   /* سطر التفصيلة: وسمُ الهدف لهذا المنفذ يُرسَم تحت إطاره الورقي
      بمقاسٍ ورقيٍّ ثابت (3.5 مم) لا بمعامل المنفذ */
   (S.callouts||[]).forEach(c=>{
    if(c.tgtSheet===sh.id&&c.tgtVp===vp.id)
     out.push({t:"text",L:"A-CALLOUT",s:calloutTitleLine(c),
      x:R((F.x0+F.x1)/2), y:R(F.y0-7), h:3.5, al:"mc", vp:vp.id});
   });
  });
 /* ═══ إطارُ الورقة وبلوكُ عنوانها وسهمُ الشمال ═══ (حلقة «الأوراق والمنافذ» · المرحلة ٨)
    كانت تُستثنى من المنافذ (تُرسَم في فضاء النموذج بعلامة sheet) ولا
    يُضيفها أحدٌ في فضاء الورقة: الورقةُ المصدَّرة بمنافذها تخرج رسماً
    عارياً بلا إطارٍ ولا عنوانٍ ولا شمال. paperFrame يرسمها بالمليمتر،
    ويضيفها التصديرُ (io/export.js#vportScene) فوق تركيب المنافذ؛
    composeSheet نفسها تبقى المنافذَ وحدها. */
 return {prims:out, dropped, papers};
}
export function paperFrame(sh,p){
 const L="A-SHET", out=[], m=Math.max(0,+(sh&&sh.margin!=null?sh.margin:S.sheet.margin)||0);
 const r={x0:0,y0:0,x1:p.w,y1:p.h}, i={x0:m,y0:m,x1:p.w-m,y1:p.h-m};
 const RC=q=>[[R(q.x0),R(q.y0)],[R(q.x1),R(q.y0)],[R(q.x1),R(q.y1)],[R(q.x0),R(q.y1)]];
 out.push({t:"poly",L,pts:RC(r),cl:1,paper:1});
 out.push({t:"poly",L,pts:RC(i),cl:1,paper:1});
 const north=(sh&&sh.north!=null)?+sh.north:+S.sheet.north;
 if(north)northPrims(i,1).forEach(g=>out.push(Object.assign({},g,{paper:1})));
 const tb=(sh&&sh.tb!=null)?+sh.tb:+S.sheet.tb;
 /* لكلّ ورقةٍ اسمُها ورقمُها ومقياسُ منافذها — لا اسمُ المشروع العامّ على كلّ ورقة */
 const ix=(S.sheets||[]).indexOf(sh), n=(S.sheets||[]).length;
 const ks=[...new Set((sh&&sh.viewports||[]).filter(v=>v&&v.visible&&v.modelRect&&v.paperRect)
  .map(v=>Math.round((v.modelRect.x1-v.modelRect.x0)/Math.max(1e-9,v.paperRect.x1-v.paperRect.x0))))];
 const base=(S.title&&S.title.sheet)||"—";
 const ov={name:(sh&&sh.name)||null,
  sheet:n>1&&ix>=0?`${base}-${ix+1}`:null,
  scale:ks.length===1?scl(ks[0]):(ks.length>1?"متعدّد":null)};
 if(tb)(S.sheet.tbStyle==="side"?tbSidePrims(i,1):tbColPrims(i,1,ov))
  .forEach(g=>out.push(Object.assign({},g,{paper:1})));
 return out;
}

