/* ═══ تصدير PNG ═══
   رسّامٌ مستقلّ يقرأ الأوّليات نفسها، بلا اعتماد على قماش الشاشة —
   فيمكن التنقيط بأي دقّة دون تغيير العرض.

   والهيئة من io/style.js — مصدرٌ واحد يقرأه الأربعة. وكانت هنا
   نسخةٌ رابعة تقرأ theme.PRINT (اعتمادٌ من io على ui، معكوسٌ)،
   وتُهمِل plots() فتُصدِّر طبقةً أُوقِف طبعها، وتُهمِل شرطة الطبقة
   وشفافيتها، وتكتب لون صبغة المنطقة حرفياً، وتقرأ طبقة الهاشور
   باسمٍ ثابت فيخرج هاشور العمود بلونٍ خاطئ. */
import {S} from "../core/state.js";
import {clamp} from "../core/units.js";
import {styleOf,fillOf,hatchOf,ctxOf} from "./style.js";
import {paperMM} from "../core/sheet.js";

/* ═══ كاشُ النقوش ═══
   بمفتاح (مقاس · لون · تشابك): كان يُبنى قماشٌ جديد لكل تعبئةٍ
   ولكل هاشور — مئةُ منطقةٍ مهشَّرة تعني مئة قماشٍ في إطارٍ واحد. */
const PC=new Map();
/* الزاويةُ معاملٌ لا ثابتٌ مطبوعٌ 45 — نفسُ علّةِ canvas.js وحلُّها:
   بلاطةٌ أفقيةٌ تُدوَّر بـsetTransform، ورجوعٌ مُعلَنٌ إلى القُطريّ
   إن غابت. وإلّا اختلف PNG عن DXF وPDF في النقش نفسه. */
function patFor(ctx,px,color,cross,ang){
 const s=clamp(Math.round(px),4,120);
 const A=((((+ang||0)%180)+180)%180);
 const key=`${s}|${color}|${cross?1:0}|${Math.round(A)}`;
 const hit=PC.get(key);
 if(hit)return hit;
 const mk=diag=>{
  const c=document.createElement("canvas");
  c.width=c.height=s;
  const x=c.getContext("2d");
  x.strokeStyle=color; x.lineWidth=Math.max(1,s*0.06);
  x.beginPath();
  if(diag){
   x.moveTo(0,s); x.lineTo(s,0);
   /* solid تشابكٌ في اتجاهين — كان خطّاً واحداً هنا واتجاهين في
      DXF وPDF، فالمخرَجات تختلف في النقش نفسه */
   if(cross){x.moveTo(0,0); x.lineTo(s,s)}
  }else{
   x.moveTo(0,s*0.5); x.lineTo(s,s*0.5);
   if(cross){x.moveTo(s*0.5,0); x.lineTo(s*0.5,s)}
  }
  x.stroke();
  return ctx.createPattern(c,"repeat");
 };
 let p=mk(0), rot=1;
 if(p&&typeof p.setTransform==="function"
    &&typeof DOMMatrix==="function"){
  try{p.setTransform(new DOMMatrix().rotate(A))}catch(e){rot=0}
 }else rot=0;
 if(!rot)p=mk(1);
 if(PC.size>60)PC.clear();
 PC.set(key,p);
 return p;
}
export const clearPatCache=()=>PC.clear();

/* ═══ الرسم على أي سياق ═══ tr: model → pixel ═══ */
export function paintTo(ctx,prims,tr,opt){
 const O=Object.assign({dark:0,minLW:0.6,showWarn:false,
  notes:null},opt||{});
 const k=(O.k!=null&&+O.k>0)?+O.k:Math.max(1,S.meta.scale);
 /* px=tr.k: الهيئة تُحسَب بالبكسل مباشرةً — الوزن والشرطة معاً،
    فلا يُضرَب أيٌّ منهما مرّةً ثانية هنا */
 const SO=ctxOf("png",{dark:!!O.dark,k,px:tr.k,minLw:O.minLW,
  notes:O.notes,showWarn:O.showWarn,
  hs:Math.max(8,(S.meta.txtMM*k)*2.5)});
 const M=p=>[(p[0]-tr.x0)*tr.k, (tr.y1-p[1])*tr.k];
 const path=(pts,cl)=>{
  ctx.beginPath();
  pts.forEach((q,i)=>{
   const p=M(q);
   if(i)ctx.lineTo(p[0],p[1]); else ctx.moveTo(p[0],p[1]);
  });
  if(cl!==0)ctx.closePath();
 };
 ctx.lineCap="round"; ctx.lineJoin="round";

 /* ═══ التعبئات أوّلاً ═══ */
 (prims||[]).forEach(g=>{
  if(g.t==="fill"){
   const f=fillOf(g,"png",SO);
   if(f.skip)return;
   const r=g.ring||[];
   if(r.length<3)return;
   ctx.save();
   try{
    path(r,1);
    if(f.hatch){
     /* مسارُ ملفٍّ قديمٍ لم يُطبَّع: المنطقةُ تُصدِر hatch الآن */
     ctx.fillStyle=patFor(ctx,Math.max(4,f.sp*tr.k),f.css,0,45);
    }else{
     /* لون طبقتها بشفافية TINT_A — كان rgba حرفياً يخالف
        الشاشة والمخرَجات الأخرى */
     ctx.globalAlpha=f.a;
     ctx.fillStyle=f.css;
    }
    ctx.fill();
   }finally{ctx.restore()}
   return;
  }
  if(g.t!=="hatch")return;
  const hs=hatchOf(g,"png",SO);       /* g.L لا اسمٌ حرفيّ */
  if(hs.skip)return;
  const loops=(g.loops||[]).filter(l=>l&&l.length>2);
  if(!loops.length)return;
  ctx.save();
  try{
   ctx.beginPath();
   loops.forEach(lp=>{
    lp.forEach((q,i)=>{
     const p=M(q);
     if(i)ctx.lineTo(p[0],p[1]); else ctx.moveTo(p[0],p[1]);
    });
    ctx.closePath();
   });
   ctx.fillStyle=patFor(ctx,
    Math.max(4,(hs.solid?hs.sp*0.22:hs.sp)*tr.k), hs.css, hs.solid,
    hs.solid?45:((hs.sets&&hs.sets[0]&&hs.sets[0][0])||45));
   ctx.fill("evenodd");
  }finally{ctx.restore()}
 });
 /* ═══ ثم الخطوط والنصوص ═══ */
 (prims||[]).forEach(g=>{
  if(g.t==="hatch"||g.t==="fill")return;
  const st=styleOf(g,"png",SO);
  if(st.skip)return;                 /* المخفيّ وما لا يُطبَع */
  ctx.save();
  try{
   /* try/finally لا if/else: الشفافية المضبوطة لا تُصفَّر إن
      خرج فرعٌ بـreturn، فتُبهِت كل ما يُرسَم بعدها. والبنية
      تحرس من إضافةٍ لاحقة لا من علّةٍ قائمة. */
   ctx.strokeStyle=st.css; ctx.fillStyle=st.css;
   ctx.globalAlpha=st.alpha;      /* بلا شرط: العودة إلى ١ لازمة */
   ctx.lineWidth=st.lw;
   /* الشرطة بالبكسل سلفاً (px=tr.k في المُحلّ) */
   ctx.setLineDash((st.dash||[]).map(v=>Math.max(1,v)));
   if(g.t==="line"){
    const a=M(g.a), b=M(g.b);
    ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);
    ctx.stroke();
   }else if(g.t==="poly"){
    if(g.pts&&g.pts.length>1){
     path(g.pts,g.cl);
     ctx.stroke();
    }
   }else if(g.t==="arc"){
    const c2=M([g.cx,g.cy]), r=Math.max(0.4,g.r*tr.k);
    ctx.beginPath();
    ctx.arc(c2[0],c2[1],r,-g.a1*Math.PI/180,-g.a0*Math.PI/180);
    ctx.stroke();
   }else if(g.t==="text"){
    const px=g.h*tr.k;
    if(px>=3){
     const p=M([g.x,g.y]);
     ctx.translate(p[0],p[1]);
     if(g.rot)ctx.rotate(-g.rot*Math.PI/180);
     ctx.font=`${px.toFixed(1)}px Tahoma,Arial,sans-serif`;
     ctx.direction="rtl";
     ctx.textAlign=/l$/.test(g.al||"")?"left"
      :(/r$/.test(g.al||"")?"right":"center");
     ctx.textBaseline=/^m/.test(g.al||"")?"middle":"alphabetic";
     ctx.setLineDash([]);
     ctx.fillText(String(g.s),0,0);
    }
   }
  }finally{ctx.restore()}
 });
 ctx.setLineDash([]);
 ctx.globalAlpha=1;
}
/* ═══ التنقيط ═══
   حدّ الضلع وحدّ المساحة معاً: 12000×12000 = ١٤٤ مليون بكسل ×
   أربعة بايتات = ٥٧٦ م.ب، وحدُّ القماش في سفاري المحمول ١٦٫٧
   مليون بكسل — فيعيد toBlob قيمةً فارغة أو قماشاً أبيض بلا خطأ. */
export const MAXSIDE=12000, MAXAREA=64e6;
export function renderCanvas(prims,box,opt){
 const O=Object.assign({dpi:300,dark:0,pad:0,
  max:MAXSIDE,maxArea:MAXAREA,notes:null,showWarn:false},opt||{});
 const B=box||{x0:0,y0:0,x1:1000,y1:1000};
 const pad=O.pad||0;
 const x0=B.x0-pad, y1=B.y1+pad;
 const W=(B.x1-B.x0)+pad*2, H=(B.y1-B.y0)+pad*2;
 const k=(O.k!=null&&+O.k>0)?+O.k:Math.max(1,S.meta.scale);
 /* الورقة الاسمية إن أُعلنت: البكسل يُشتَقّ منها فينطبق المطبوع
    على المتّجه — وكانت تُشتَقّ من الصندوق المُدوَّر، وبلا صفحةٍ
    معلَنة كانت تُشتَقّ من صندوق الهندسة مقسوماً على المقياس، فرسمٌ
    صغيرٌ يُخرِج ورقةً مجهريّة لا تبلغ حدَّي الضلع والمساحة مهما
    عَلَت الدقّة. والافتراضُ الآن مقاسُ الورقة القياسيّ نفسه الذي
    يُصدَّر عليه فعلاً حين لا صفحةَ صريحة — لا الصندوق. */
 const dflt=paperMM();
 const nom=(O.page&&+O.page.w>0&&+O.page.h>0)?O.page:null;
 const pw=nom?+nom.w:dflt[0], ph=nom?+nom.h:dflt[1];  /* مليمتر ورقي */
 const MW=pw*k, MH=ph*k;                    /* مليمتر نموذجي */
 const X0=x0-(MW-W)/2, Y1=y1+(MH-H)/2;
 let px=Math.round(pw/25.4*O.dpi);
 let py=Math.round(ph/25.4*O.dpi);
 let f=Math.min(1, O.max/Math.max(px,py,1));
 const area=(px*f)*(py*f);
 if(area>O.maxArea)f*=Math.sqrt(O.maxArea/area);
 /* الطرحُ لا التقريب في الخطوة الأخيرة: التقريب لأعلى قد يُعيد
    البكسلَ فوق الحدّين بعد ضربٍ في f — كسرٌ واحد يكفي لتجاوز
    حدّ المساحة بضبطه بالضبط. */
 px=Math.max(1,Math.floor(px*f));
 py=Math.max(1,Math.floor(py*f));
 clearPatCache();          /* النقوش بمقاسٍ يتبع tr.k */
 const cv=document.createElement("canvas");
 cv.width=px; cv.height=py;
 const ctx=cv.getContext("2d");
 ctx.fillStyle=O.dark?"#0e1216":"#ffffff";
 ctx.fillRect(0,0,px,py);
 paintTo(ctx,prims,{x0:X0,y1:Y1,k:px/MW},
  {dark:O.dark,minLW:Math.max(0.6,px/2400),
   notes:O.notes,showWarn:O.showWarn,k:O.k});
 return {canvas:cv,px,py,pw,ph,dpi:Math.round(O.dpi*f),
  scaled:f<1};
}
/* حدُّ القماش في Safari على iPhone وiPad نحو 16.7 مليون بكسل: ورقةُ A3
   بدقّة 300 (17.4 مليوناً) كانت تُرجِع toBlob فارغاً فيفشل التصدير كلُّه.
   فإن رجع فارغاً والمساحةُ فوق ذلك الحدّ أُعيد الرسمُ مصغَّراً إليه مرّةً
   واحدة، ويُقال ذلك في الملاحظات بدل أن يُرفض الطلب. */
export const SAFE_AREA=16777216;
const blobOf=cv=>new Promise(res=>{try{cv.toBlob(b=>res(b||null),"image/png")}catch(e){res(null)}});
export async function toPNGBlob(prims,box,opt){
 const r=renderCanvas(prims,box,opt);
 const b=await blobOf(r.canvas);
 if(b||r.px*r.py<=SAFE_AREA)return {blob:b,info:r};
 const O=Object.assign({},opt||{},{maxArea:SAFE_AREA});
 const r2=renderCanvas(prims,box,O);
 const b2=await blobOf(r2.canvas);
 if(b2&&O.notes)O.notes.push(`صُغِّرت الصورة إلى ${r2.px}×${r2.py} بكسل (${r2.dpi} نقطة/بوصة): هذا المتصفّح لا يرسم قماشاً أكبر`);
 return {blob:b2,info:r2};
}
