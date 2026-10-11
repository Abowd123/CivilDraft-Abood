/* ═══ الواجهة صفحةً تُصدَّر ═══
   لا مسارَ ثانياً في io/*: المصدِّرات الثلاثة تقرأ الأوّليات العامّة،
   وelevPrims تُخرجها بنوعٍ تعرفه (poly مغلقة). فهذا الملفّ يبني
   الصندوق والاسم والملاحظات، ويسلّم — لا أكثر.

   والطبقة A-ELEV تُعلَن في DXF من نفسها: toDXF يجمع الطبقات
   المستعملة من أوّليات المشهد ثم يقرأ resolve، فلا جدولَ ثانٍ
   يُحدَّث. */
import {S} from "../core/state.js";
import {ELAY,elevPrims,lastElev} from "../core/elevation.js";
import {vis,plots,filterPrims} from "../core/layers.js";
import {toSVG} from "./svg.js";
import {toDXFBytes} from "./dxf.js";
import {toPDF,toPDFz} from "./pdf.js";

export const PAD=200;            /* هامشٌ نموذجيّ حول الفرد — مم */
const TAG={0:"E",90:"N",180:"W",270:"S"};
export const elevTag=e=>{
 const a=Math.round((e&&e.view)||0);
 return TAG[a]||`${a}deg`;
};
export const safeName=s=>String(s==null?"":s).trim()
 .replace(/[\\/:*?"<>|]+/g,"_").replace(/\s+/g,"_")
 .slice(0,40)||"PLAN";
export const elevName=(e,ext)=>
 `${safeName(S.meta.name)}-ELEV-${elevTag(e)}.${ext}`;

/* ═══ الصفحة ═══
   الهامش يُطبَّق على الصندوق لا بـopt.pad: toDXFBytes لا تأخذ
   خياراتٍ، فلو تُرك لكلٍّ هامشُه لاختلفت الثلاثة في المقاس. */
export function elevPage(e,opt){
 const o=opt||{};
 const t=e||lastElev();
 if(!t)throw new Error("لا واجهة — نفّذ ELEV أوّلاً");
 const pad=(o.pad==null)?PAD:Math.max(0,Math.round(+o.pad||0));
 const raw=elevPrims(t,0,0);
 const prims=filterPrims(raw);
 const box=raw.length
  ? {x0:-pad, y0:-pad, x1:t.w+pad, y1:t.h+pad}
  : {x0:0,y0:0,x1:1000,y1:1000};
 const notes=[];
 if(!prims.length)notes.push("الواجهة خالية — لا شكل يُصدَّر");
 if(!vis(ELAY))
  notes.push(`طبقة ${ELAY} مخفيّة — لن يخرج منها شيء`);
 else if(!plots(ELAY))
  notes.push(`طبقة ${ELAY} لا تُطبَع — الملفّ يخرج فارغاً`);
 return {e:t, prims, box, pad, notes};
}
const infoOf=e=>({
 title:`${S.meta.name||"PLAN"} — ${e.name}`,
 sheet:S.title.sheet, rev:S.title.rev,
 proj:S.title.proj, by:S.title.by});

export function elevSVG(e,opt){
 const P=elevPage(e,opt);
 const r=toSVG(P.prims,P.box,{dark:0,pad:0,showWarn:false,
  page:(opt&&opt.page)||null});
 return {name:elevName(P.e,"svg"), mime:"image/svg+xml;charset=utf-8",
  txt:r.txt, notes:P.notes.concat(r.notes||[]), page:P};
}
export function elevDXF(e,opt){
 const P=elevPage(e,opt);
 const r=toDXFBytes(P.prims,P.box);
 return {name:elevName(P.e,"dxf"), mime:"application/dxf",
  bytes:r.bytes, bad:r.bad,
  notes:P.notes.concat(r.notes||[]), page:P};
}
/* المتزامنة للأمر: الواجهة عشراتُ أشكالٍ لا مئاتُ آلاف، فالضغط
   لا يفيد ويُدخل الانتظار في مسارٍ لحظيّ. وelevPDFz لمن أراده. */
export function elevPDF(e,opt){
 const P=elevPage(e,opt);
 const r=toPDF(P.prims,P.box,{pad:0,showWarn:false,
  info:infoOf(P.e), page:(opt&&opt.page)||null});
 return {name:elevName(P.e,"pdf"), mime:"application/pdf",
  bytes:r.bytes, arabic:r.arabic,
  notes:P.notes.concat(r.notes||[]), page:P};
}
export async function elevPDFz(e,opt){
 const P=elevPage(e,opt);
 const r=await toPDFz(P.prims,P.box,{pad:0,showWarn:false,
  info:infoOf(P.e), page:(opt&&opt.page)||null});
 return {name:elevName(P.e,"pdf"), mime:"application/pdf",
  bytes:r.bytes, arabic:r.arabic, zip:r.zip,
  notes:P.notes.concat(r.notes||[]), page:P};
}
export const elevFile=(fmt,e,opt)=>{
 const f=String(fmt||"svg").toLowerCase();
 if(f==="dxf")return elevDXF(e,opt);
 if(f==="pdf")return elevPDF(e,opt);
 if(f==="svg")return elevSVG(e,opt);
 throw new Error(`صيغةٌ غير معروفة: «${fmt}» — svg أو dxf أو pdf`);
};
