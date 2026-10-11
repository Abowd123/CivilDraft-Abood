/* ═══ المقطع صفحةً تُصدَّر ═══
   مرآةُ io/elev.js حرفاً بحرف في بنيتها.

   ═══ التسمية ═══ TEST-SECT-0deg.svg
   الرمز زاويةُ خطّ القطع بالدرجات لا حرفَ جهة. وback يُلحَق بـB.
   وخطّان متوازيان في موضعين مختلفين يتشاركان الرمز نفسه — من أراد
   التمييز مرّر opt.mark ("A-A") فيُكتَب بدلها. */
import {S} from "../core/state.js";
import {SLAY,sectPrims,lastSect} from "../core/section.js";
import {vis,plots,filterPrims} from "../core/layers.js";
import {toSVG} from "./svg.js";
import {toDXFBytes} from "./dxf.js";
import {toPDF,toPDFz} from "./pdf.js";

export const PAD=200;            /* هامشٌ نموذجيّ حول المقطع — مم */

export const safeName=s=>String(s==null?"":s).trim()
 .replace(/[\\/:*?"<>|]+/g,"_").replace(/\s+/g,"_")
 .slice(0,40)||"PLAN";
export const sectTag=(e,mark)=>{
 const m=String(mark==null?"":mark).trim();
 if(m)return safeName(m);
 return `${Math.round((e&&e.ang)||0)}deg`+((e&&e.back)?"B":"");
};
export const sectFileName=(e,ext,mark)=>
 `${safeName(S.meta.name)}-SECT-${sectTag(e,mark)}.${ext}`;

export function sectPage(e,opt){
 const o=opt||{};
 const t=e||lastSect();
 if(!t)throw new Error("لا مقطع — نفّذ SECTION أوّلاً");
 const pad=(o.pad==null)?PAD:Math.max(0,Math.round(+o.pad||0));
 const raw=sectPrims(t,0,0);
 const prims=filterPrims(raw);
 const box=raw.length
  ? {x0:-pad, y0:-pad, x1:t.w+pad, y1:t.h+pad}
  : {x0:0,y0:0,x1:1000,y1:1000};
 const notes=[];
 if(!raw.length)notes.push("المقطع خالٍ — لا شكل يُصدَّر");
 if(!vis(SLAY))
  notes.push(`طبقة ${SLAY} مخفيّة — لن يخرج منها شيء`);
 else if(!plots(SLAY))
  notes.push(`طبقة ${SLAY} لا تُطبَع — الملفّ يخرج فارغاً`);
 return {e:t, prims, box, pad, notes};
}
const infoOf=e=>({
 title:`${S.meta.name||"PLAN"} — ${e.name}`,
 sheet:S.title.sheet, rev:S.title.rev,
 proj:S.title.proj, by:S.title.by});

export function sectSVG(e,opt){
 const o=opt||{};
 const P=sectPage(e,o);
 const r=toSVG(P.prims,P.box,{dark:0,pad:0,showWarn:false,
  page:o.page||null});
 return {name:sectFileName(P.e,"svg",o.mark),
  mime:"image/svg+xml;charset=utf-8",
  txt:r.txt, notes:P.notes.concat(r.notes||[]), page:P};
}
export function sectDXF(e,opt){
 const o=opt||{};
 const P=sectPage(e,o);
 const r=toDXFBytes(P.prims,P.box);
 return {name:sectFileName(P.e,"dxf",o.mark),
  mime:"application/dxf",
  bytes:r.bytes, bad:r.bad,
  notes:P.notes.concat(r.notes||[]), page:P};
}
export function sectPDF(e,opt){
 const o=opt||{};
 const P=sectPage(e,o);
 const r=toPDF(P.prims,P.box,{pad:0,showWarn:false,
  info:infoOf(P.e), page:o.page||null});
 return {name:sectFileName(P.e,"pdf",o.mark),
  mime:"application/pdf",
  bytes:r.bytes, arabic:r.arabic,
  notes:P.notes.concat(r.notes||[]), page:P};
}
export async function sectPDFz(e,opt){
 const o=opt||{};
 const P=sectPage(e,o);
 const r=await toPDFz(P.prims,P.box,{pad:0,showWarn:false,
  info:infoOf(P.e), page:o.page||null});
 return {name:sectFileName(P.e,"pdf",o.mark),
  mime:"application/pdf",
  bytes:r.bytes, arabic:r.arabic, zip:r.zip,
  notes:P.notes.concat(r.notes||[]), page:P};
}
export const sectFile=(fmt,e,opt)=>{
 const f=String(fmt||"svg").toLowerCase();
 if(f==="dxf")return sectDXF(e,opt);
 if(f==="pdf")return sectPDF(e,opt);
 if(f==="svg")return sectSVG(e,opt);
 throw new Error(`صيغةٌ غير معروفة: «${fmt}» — svg أو dxf أو pdf`);
};
