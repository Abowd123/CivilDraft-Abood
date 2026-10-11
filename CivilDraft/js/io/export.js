/* ═══ مسار التصدير الواحد ═══
   أربعةُ أزرارٍ كانت تُكرِّر خمسة أشياء: النطاق · التسمية · الحصيلة ·
   التحذيرات · التنزيل. والتكرارُ انجرف: warnClip في الأربعة
   وsayNotes في اثنين، وزرّان غير متزامنَين واثنان متزامنان، وواحدٌ
   يُعطِّل نفسه أثناء العمل وثلاثةٌ لا.

   وثلاثةُ قراراتٍ مُعلَنة:

   ١ · لا طبعَ من هنا. run تُعيد قائمةَ رسائل {lv,s} والواجهة تطبعها —
       فاستيرادُ ui/bus من io هو الاعتمادُ المعكوس نفسه الذي أُصلح في
       الدفعة ٧ب. والمكسب الثاني أن المسار يُختبَر في node بلا واجهة.

   ٢ · لا تنزيلَ من هنا. تُعيد الحِمل واسمَه ونوعَه، والواجهة تُنزِّله —
       فالتنزيل حدثُ متصفّحٍ لا صيغةَ ملفّ.

   ٣ · ترتيب الرسائل مُعلَن: الحصيلة أوّلاً (تُسمّي الملفّ فيُعرَف عمّا
       يُتكلَّم) · ثم ما فُقِد أو عُطِب · ثم ما يُشرَح. والفقدُ قبل
       الشرح لأن أخطر ما في التصدير أن تمضي وأنت تحسبه تمّ.

   والمشروع (‏xSave) ليس مخرَجاً فلا يمرّ بهنا: يحمل كل شيء بلا هيئةٍ
   ولا نطاقٍ ولا مقياس — الإخفاء عرضٌ لا حذف، والملفّ يحمل المخفيّ. */
import {S,VER,shapeNotes} from "../core/state.js";
import {clamp,dim2,m2} from "../core/units.js";
import {humanSize} from "./project.js";
import {scene,sceneBBox,sceneBBoxInk,
        sceneBBoxPlot} from "../core/render.js";
import {sheetRect,activeSheetDef,sheetPapers,composeSheet,paperFrame,
        visibleViewportCount,customDims,sizeName,
        stripTitle,withTitle} from "../core/sheet.js";
import {vis,plots,anyHidden,hiddenCount,
        hiddenLayers} from "../core/layers.js";
import {toDXFBytes,dxfStats} from "./dxf.js";
import * as BLK from "../core/blocks.js";
import {toSVG} from "./svg.js";
import {toPNGBlob} from "./png.js";
import {toPDFz} from "./pdf.js";
import {createZip} from "./zip.js";
import {CAPS} from "./style.js";

/* ═══ جدول الصيغ ═══
   قرارٌ معلَنٌ لا سلوكٌ مُستنتَج — كجدول CAPS في io/style.js.
   paper=0 لـDXF بقصد: هو فضاءُ نموذجٍ بالمليمتر لا صفحةً، فمقاس
   الورقة لا معنى له فيه. والورقة تُصدَّر إليه هندسةً (خطوطُ إطارها
   وبلوكها في المشهد) لا وسمَ صفحة. */
export const FMT={
 dxf:{ext:"dxf", mime:"application/dxf",  n:"DXF R2000",
      vector:1, paper:0, notes:1},
 svg:{ext:"svg", mime:"image/svg+xml",    n:"SVG متّجه",
      vector:1, paper:1, notes:1},
 png:{ext:"png", mime:"image/png",        n:"PNG",
      vector:0, paper:1, notes:1},
 pdf:{ext:"pdf", mime:"application/pdf",  n:"PDF متّجه",
      vector:1, paper:1, notes:1}
};

/* ═══ المقاسات الاسمية ═══
   تكرارٌ مُعلَنٌ لجدول core/sheet.js: sheetRect يعيد المليمتر
   النموذجيَّ مُدوَّراً (مقاسٌ × مقياسٌ ثم تدوير)، والصفحة تحتاج
   الاسميَّ نفسه — و٤١٩٫٩٨ مم ليست A3 عند الطابعة.
   وحالةٌ في run.js تفحص أن الجدولين يتّفقان لكل مقاسٍ واتجاه، فلا
   ينجرف أحدهما عن الآخر بلا أن يسقط الاختبار. */
/* الجدول عموديّ (عرض×ارتفاع) — A2+ وA3+ هنا مقلوبان عن SIZES عمداً */
const APS={A0:[841,1189],A1:[594,841],"A2+":[430,610],A2:[420,594],
 "A3+":[329,483],A3:[297,420],A4:[210,297]};
export function paperMM(){
 /* المخصّص: customW×customH أفقياً كسائر المقاسات، فيُقلَب للعموديّ */
 const a=(S.sheet.size==="custom")
  ? customDims(S.sheet).slice().reverse()
  : (APS[S.sheet.size]||APS.A3);
 const n=sizeName(S.sheet);
 return (S.sheet.orient==="p")
  ? {w:a[0],h:a[1],n,or:"عمودي"}
  : {w:a[1],h:a[0],n,or:"أفقي"};
}
export const onSheet=()=>!!(+S.sheet.on&&vis("A-SHET"));

/* ═══ النطاق ═══
   نُقل من ui/inspector: قرارُ نطاقٍ لا قرارُ زرّ — والدليل أنه كان
   يُقرَأ أربع مرّات ويُعدَّل مرّتين (الدفعتان ٧أ و٩).
   وصندوقُ ما يُطبَع لا ما يُرى: طبقةٌ أُوقِف طبعها كانت تُوسِّع
   الورقة فتخرج بهامشٍ خالٍ. والمخفيّ خارج الاثنين أصلاً — الصناديق
   تُحسَب بعد التصفية منذ الدفعة ٩. */
export function exportBox(){
 if(onSheet())
  return {box:sheetRect(sceneBBox()),pad:0,mode:"sheet"};
 const B=sceneBBoxPlot();
 const pad=Math.max(1,S.meta.scale)*8;
 return {box:B||{x0:0,y0:0,x1:1000,y1:1000},pad,mode:"fit"};
}
const padded=(B,pad)=>pad
 ? {x0:B.x0-pad,y0:B.y0-pad,x1:B.x1+pad,y1:B.y1+pad} : B;

/* ═══ الاحتواء ═══
   الورقة تقصّ ما خرج عنها، والقياسُ على صندوق الحبر بلا الورقة —
   وإلّا قِيسَت الورقة مقابل نفسها فلا تتجاوز أبداً.
   ويُعاد عددُ الورقات ومقياسٌ يكفي: «كبّر أو صغّر» نصيحةٌ بلا رقم،
   والرقم هو ما يُنفَّذ. */
const SCALES=[20,25,50,100,200,250,500,1000,1250,2500,5000];
export function fits(){
 if(!onSheet())return null;
 const p=paperMM(), k=Math.max(1,S.meta.scale);
 const r=sheetRect(sceneBBox()), ink=sceneBBoxInk();
 if(!r||!ink)return null;
 const over=Math.max(0, r.x0-ink.x0, ink.x1-r.x1,
                        r.y0-ink.y0, ink.y1-r.y1);
 const iw=(ink.x1-ink.x0)/1, ih=(ink.y1-ink.y0)/1;
 const nx=Math.max(1,Math.ceil(iw/(p.w*k)));
 const ny=Math.max(1,Math.ceil(ih/(p.h*k)));
 /* أصغرُ مقياسٍ قياسيّ يتّسع — بهامشٍ ٢٪ فلا يلامس الحدّ */
 const need=Math.max(iw/p.w, ih/p.h)*1.02;
 const fitK=SCALES.find(s=>s>=need)||Math.ceil(need/100)*100;
 return {over, nx, ny, n:nx*ny, fitK, paper:p};
}
/* ═══ الصفحة ═══
   اسميّةٌ حين تكون الورقة قائمةً والصيغة تحمل صفحة. والهندسة
   تُتَمركَز فيها: فرقُ التدوير دون المليمتر ويُقسَم على الجانبين،
   والنسبة تبقى 1:k بالضبط — لا 1:k±خطأً. */
export function pageOf(fmt){
 const F=FMT[fmt];
 if(!F||!F.paper||!onSheet())return null;
 const p=paperMM();
 return {w:p.w, h:p.h, name:p.n, or:p.or};
}
/* ═══ التسمية ═══
   في موضعٍ واحد للأربعة. وبلوكُ العنوان يدخلها: رقمُ اللوحة
   والمراجعة يُطبَعان على الورق، فثلاثُ لوحاتٍ من مشروعٍ واحد كانت
   تخرج بثلاثة أسماء متطابقة.
   والحرس على أسماء الملفّات لا على النصّ: ما يمنعه ويندوز
   (< > : " / \ | ? *) والمحارف الضابطة والنقطة الأخيرة والأسماء
   المحجوزة. والعربية تبقى كما هي — لا تحويلَ إلى لاتينية. */
const BADN=/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
export function safeName(s,ext){
 let n=String(s==null?"":s)
  .replace(/[\u0000-\u001f\u007f]/g,"")
  .replace(/[<>:"/\\|?*]/g,"-")
  .replace(/[\u200e\u200f\u2066-\u2069]/g,"")
  .replace(/\s+/g,"-")
  .replace(/-{2,}/g,"-")
  .replace(/^[-.\s]+|[-.\s]+$/g,"")
  .slice(0,90);
 if(!n||BADN.test(n))n="لوحة";
 if(!ext)return n;
 const e=String(ext).replace(/^\./,"");
 return new RegExp(`\\.${e}$`,"i").test(n)?n:`${n}.${e}`;
}
export function fileName(fmt){
 const t=S.title||{};
 const P=[String(S.meta.name||"PLAN").trim()||"PLAN"];
 const sh=String(t.sheet||"").trim();
 const rv=String(t.rev||"").trim();
 if(sh)P.push(sh);
 if(rv&&rv!=="0")P.push("مر"+rv);
 return safeName(P.join("-"),FMT[fmt]?FMT[fmt].ext:"txt");
}
/* ═══ تصدير الورقة النشطة بمنافذها — 4C ═══
   يُحسب بالطلب فقط ويُخزَّن مؤقّتاً بمفتاح نسخة المشهد وعدد
   المنافذ: preflight ثم run في العملية الواحدة يقرآن النتيجة
   نفسها بلا إعادة تركيب. */
let VP_LAST=null, VP_KEY="";
export function vportScene(){
 const sh=activeSheetDef();
 if(!sh||!visibleViewportCount(sh)){
  VP_LAST=null; VP_KEY=""; return null;
 }
 const key=`${VER.n}|${sh.id}|${visibleViewportCount(sh)}`
  +`|${(Array.isArray(S.sheets)?S.sheets.length:0)}`;
 if(VP_LAST&&VP_KEY===key)return VP_LAST;
 const composed=composeSheet(sh,scene().P,{});
 const p=sheetPapers(sh);
 /* الإطارُ وبلوكُ العنوان والشمال بالمليمتر — كانت الورقةُ تخرج بلاها */
 VP_LAST={P:composed.prims.concat(paperFrame(sh,p)),
  box:{x0:0,y0:0,x1:p.w,y1:p.h},
  page:{w:p.w,h:p.h,name:sizeName(sh),
   or:(sh.orient==="p")?"عمودي":"أفقي"},
  dropped:composed.dropped||0,
  n:visibleViewportCount(sh)};
 VP_KEY=key;
 return VP_LAST;
}
/* ═══ الخطّة ═══ ما سيُنتَج بلا إنتاج — تقرؤه الواجهة قبل النقر ═══
   4C: للورقة النشطة منافذُ ظاهرة ⇒ فضاء الورق (composeSheet)، وإلا
   المساران القديمان (sheet/fit) كما هما. */
export function plan(fmt){
 const F=FMT[fmt]||FMT.pdf;
 const vp=vportScene();
 const base={fmt, name:fileName(fmt), vector:!!F.vector};
 if(vp){
  return Object.assign(base,{mode:"vports", P:vp.P,
   box:vp.box, pad:0, page:vp.page, k:1,
   scale:Math.max(1,S.meta.scale), fit:null,
   vpN:vp.n, dropped:vp.dropped});
 }
 const {box,pad,mode}=exportBox();
 return Object.assign(base,{mode, box, pad, page:pageOf(fmt),
  scale:Math.max(1,S.meta.scale), fit:fits()});
}
export function summary(){
 const vp=vportScene();
 if(vp){
  return `الورقة ${vp.page.name} ${vp.page.or} `
   +`${dim2(vp.page.w,vp.page.h,"مم")} · ${vp.n} منفذ ظاهر `
   +`· 1:1 بالمليمتر الحقيقي · `
   +`«${fileName("pdf").replace(/\.pdf$/,"")}»`;
 }
 const k=Math.max(1,S.meta.scale);
 const f=fits();
 const L=[];
 if(onSheet()){
  const p=paperMM();
  L.push(`الورقة ${p.n} ${p.or} ${dim2(p.w,p.h,"مم")}`);
 }else L.push("النطاق: كل ما يُطبَع + هامش");
 L.push(`1:${k}`);
 L.push(`«${fileName("pdf").replace(/\.pdf$/,"")}»`);
 if(f&&f.over>0)
  L.push(`⚠ يتجاوز ${m2(f.over)} م — ${f.n} ورقة أو 1:${f.fitK}`);
 return L.join(" · ");
}
/* ═══ التحذيرات المشتركة ═══
   الفقدُ أوّلاً ثم العطب: الأوّل يُنقِص ما يخرج، والثاني يُخرِج
   ما ليس صحيحاً — وكلاهما يقع في مسار التسليم للعميل. */
const overMsg=pl=>`يتجاوز الورقة بـ ${m2(pl.fit.over)} م `
 +`فيُقصّ في المخرَج — بهذا المقياس يحتاج `
 +`${pl.fit.nx}×${pl.fit.ny} ورقة. كبّر الورقة أو انزل إلى `
 +`1:${pl.fit.fitK} أو أزِحها.`;
function lossOf(fmt,pl){
 const out=[], c=scene();
 if(pl.mode==="sheet"&&pl.fit&&pl.fit.over>0)
  out.push({lv:"wr",s:overMsg(pl)});
 if(anyHidden())
  out.push({lv:"wr",s:`${hiddenCount()} طبقةً مخفيّة ليست في `
   +`${FMT[fmt].n}: ${hiddenLayers().join(" · ")} — الإخفاء عرضٌ `
   +`لا حذف، وملفّ المشروع يحملها`});
 const np=[...new Set((c.P||[]).map(g=>g.L||"0"))]
  .filter(n=>!plots(n));
 if(np.length)
  out.push({lv:"in",s:`طبقاتٌ تُرى ولا تُطبَع فاستُثنيت: `
   +`${np.join(" · ")}`});
 /* عطبُ الرسم — يُقال قبل التنزيل لا بعده */
 if(c.bad)out.push({lv:"wr",s:`${c.bad} فتحةً معطوبة (خارج جدارها `
  +`أو متراكبة) صُدِّرت كما هي`});
 if(c.over)out.push({lv:"wr",s:`${c.over} بُعداً نصُّه مُستبدَل — `
  +`الرقم المطبوع لا يطابق الهندسة`});
 if(c.stale)out.push({lv:"wr",s:`${c.stale} منطقةً قديمة: بصمة `
  +`جوارها تبدّلت ومساحتُها لم تُحدَّث`});
 if(c.loose)out.push({lv:"in",s:`${c.loose} بُعداً معلَّقاً — طرفٌ `
  +`لا يصادف عقدةً ولا وجهاً`});
 if(c.open)out.push({lv:"wr",s:`${c.open} قطعةً لم تُخَط في اتحاد `
  +`الأجسام — جداران يتلامسان بمقدارٍ دون المليمتر، فحدٌّ ينفتح`});
 return out;
}
const pageStr=pl=>pl.page
 ? `${pl.page.name} ${pl.page.or} ${dim2(pl.page.w,pl.page.h,"مم")}`
 : null;
const sizeOf=v=>{
 if(!v)return 0;
 if(typeof v==="string")
  return (typeof TextEncoder!=="undefined")
   ? new TextEncoder().encode(v).length : v.length;
 if(v.length!=null)return v.length;
 if(v.size!=null)return v.size;
 return 0;
};
/* ═══ الكتلُ للمُصدِّر ═══ P-تحسين
   التعريفاتُ والمثيلاتُ تُمرَّران خاماً، فيُخرِجها DXF كتلاً حقيقيةً
   (BLOCK/INSERT) بدل خطوطٍ مفكَّكة. والصيَغُ الأخرى لا تعرف الكتل
   فلا تُمرَّر إليها: تبقى على المفكَّك كما كانت حرفاً. */
const blocksFor=()=>({
 defs:(BLK.toJSON().defs||[]),
 insts:(S.blocks||[])
});
const blobOf=(raw,mime)=>(typeof Blob==="undefined")
 ? null : new Blob([raw],{type:mime});

/* ═══ الفحص المسبق ═══
   يجمع ما يمكن قوله قبل بدء التنفيذ: رسمٌ فارغ · لا شيء قابل
   للطباعة · تجاوز الورقة · نصوصٌ قد لا تنجو من CP1256 في DXF.
   لا يبني شيئاً ولا يكتب في الحالة. تُنادى من inspector.js قبل
   run، وrun تعيد فحصَ الأخطاء (er) خطَّ دفاعٍ ثانياً.
   يعيد [{lv:"er"|"wr"|"in", s}] — er يمنع التنفيذ. */
export function preflight(fmt){
 const out=[];
 const c=scene();
 if(!c.P||!c.P.length){
  out.push({lv:"er",s:"الرسم فارغ — لا شيء ليُصدَّر"});
  return out;
 }
 const printable=c.P.some(g=>plots(g.L||"0"));
 if(!printable)
  out.push({lv:"er",
   s:"لا عناصر قابلة للطباعة — كل الطبقات مخفية أو غير مطبوعة"});
 /* 4C: المنفذُ المركَّب قد يفرغ وإن كان النموذج مليئاً — قصٌّ كامل */
 const vpv=vportScene();
 if(vpv&&(!vpv.P||!vpv.P.length)){
  out.push({lv:"er",
   s:"لا شيء داخل المنافذ الظاهرة — وسّع نطاقها أو أظهر منفذاً آخر"});
  return out;
 }
 /* 4C: قصّ الأقواس/النصوص/المضلعات العابرة يُبلَّغ ولا يُخفى */
 if(vpv&&vpv.dropped)
  out.push({lv:"in",s:`${vpv.dropped} أوّليةً قُصّت أو سقطت خارج `
   +`إطار منافذها — طبيعيٌّ حين يتجاوز عنصرٌ حدود منفذه المختار`});
 const pl=plan(fmt);
 if(pl.mode==="sheet"&&pl.fit&&pl.fit.over>0)
  out.push({lv:"wr",s:overMsg(pl)});
 /* 4C: DXF لا يحمل صفحة، فالورقة تُصدَّر إليه هندسةً 1:1 */
 if(pl.mode==="vports"&&fmt==="dxf")
  out.push({lv:"in",s:"DXF للورقة النشطة: الهندسة بالمليمتر "
   +"الحقيقي 1:1 — المقياس يُقرَأ في صندوق المتلقّي لا في الوحدة"});
 if(fmt==="dxf"){
  const bad=c.P.filter(g=>g.t==="text"
   &&/[^\u0000-\u00ff\u0600-\u06ff\s]/.test(String(g.s||"")));
  if(bad.length)
   out.push({lv:"in",
    s:`${bad.length} نصّاً يحوي محارف قد لا تظهر في DXF`
    +` — استعمل SVG للنصّ الكامل`});
 }
 return out;
}
/* ═══ التنفيذ ═══
   تعيد {ok · name · mime · blob · raw · size · report · plan}.
   وترمي فيما لا يُتوقَّع وحده؛ وما يُتوقَّع فشلُه (قماشٌ يتجاوز حدَّه)
   يعود ok:0 برسالةٍ تقول ما يُفعَل. */
export async function run(fmt,opt){
 const F=FMT[fmt];
 if(!F)throw new Error(`صيغةٌ مجهولة: ${fmt}`);
 if((fmt==="png"||fmt==="pdf") && typeof document==="undefined"){
  return {ok:0, fmt, name:fileName(fmt), mime:F.mime, blob:null, raw:null, size:0,
   report:[{lv:"er",s:"PNG/PDF يحتاج متصفح — لا يُختبر في node بلا قماش"}], plan:plan(fmt)};
 }
 const O=Object.assign({dark:0,showWarn:false,dpi:300},opt||{});
 /* إلغاءٌ (withProgress في ui/overlay.js يسلّم الإشارة). يُفحَص قبل
    البدء وبعد كل بناءٍ غير متزامن: العملُ الجاري لا يُقطَع في منتصفه
    (PNG/PDF يبنيان في مهمّةٍ واحدة) لكن ناتجَه يُسقَط فلا يُنزَّل. */
 const aborted=()=>!!(opt&&opt.signal&&opt.signal.aborted);
 const cancelled=()=>({ok:0, fmt, name:fileName(fmt), mime:F.mime,
  blob:null, raw:null, size:0,
  report:[{lv:"in",s:"أُلغي التصدير — لم يُنزَّل شيء"}], plan:plan(fmt)});
 if(aborted())return cancelled();
 const pre=preflight(fmt);
 if(pre.some(p=>p.lv==="er"))
  return {ok:0, fmt, name:fileName(fmt), mime:F.mime, blob:null,
   raw:null, size:0, report:pre, plan:plan(fmt)};
 /* stripAuthor: الخطّة (وفيها مشهدٌ يحمل بلوك العنوان) تُبنى والعنوانُ
    مجرَّد؛ وinfo الـPDF يقرأ TT لا S.title. S الأصلية لا تُمَسّ. */
 const strip=!!(opt&&opt.stripAuthor);
 const TT=strip?stripTitle(S.title):S.title;
 let pl=null, P=null;
 withTitle(strip,()=>{pl=plan(fmt); P=pl.P||scene().P});
 const notes=[], extra=[];
 let raw=null, blob=null, name=pl.name, head="";

 if(fmt==="dxf"){
  const bb=padded(pl.box,pl.pad);
  const r=toDXFBytes(P,bb,{k:pl.k,blocks:blocksFor()});
  raw=r.bytes; blob=blobOf(raw,F.mime);
  (r.notes||[]).forEach(m=>notes.push(m));
  if(r.hatchCut)extra.push({lv:"wr",s:`هاشورٌ في ${r.hatchCut} `
   +`موضعاً تجاوز حدّ الخطوط فلم يُصدَّر`});
  if(r.bad)extra.push({lv:"wr",s:`${r.bad} محرفاً لا وجود له في `
   +`CP1256 وكُتب «؟» — صفحةُ الرمز تحمل العربية والفرنسية ولا `
   +`تحمل ما عداهما. للنصّ الكامل استعمل SVG.`});
  const st=dxfStats(P);
  head=`${F.n} · ${name} · ${humanSize(sizeOf(raw))} · `
   +((pl.mode==="vports")?"الورقة بالمليمتر الحقيقي":"فضاء النموذج بالمليمتر")
   +` · `+Object.keys(st).map(k=>`${st[k]} ${k}`).join(" · ");
  notes.push("الشرطة مُقطَّعة قطعاً حقيقية · الهاشور خطوط مولَّدة "
   +"(HATCH غير مكتوبة) · الترميز CP1256 بايتاً بايتاً");
 }
 else if(fmt==="svg"){
  const r=toSVG(P,pl.box,{pad:pl.pad,dark:O.dark?1:0,
   showWarn:!!O.showWarn, page:pl.page, k:pl.k});
  raw=r.txt; blob=blobOf(raw,F.mime);
  (r.notes||[]).forEach(m=>notes.push(m));
  if(r.hatchCut)extra.push({lv:"wr",s:`هاشورٌ في ${r.hatchCut} `
   +`موضعاً لم يُصدَّر`});
  /* الحجم بايتاتٌ لا محارف: العربية محرفان في UTF-8، وطولُ
     السلسلة كان يُنقِص الرقم إلى الثلث في لوحةٍ عربية */
  head=`${F.n} · ${name} · ${humanSize(sizeOf(raw))}`
   +(pageStr(pl)?` · ${pageStr(pl)}`:"")+` · 1:${pl.scale}`;
  notes.push("العربية نصٌّ متّجه بخطّ النظام — لا صورةَ ولا تنقيط");
 }
 else if(fmt==="png"){
  const dpi=clamp(parseInt(O.dpi,10)||300,72,1200);
  const nn=[];
  const {blob:b,info}=await toPNGBlob(P,pl.box,
   {pad:pl.pad,dpi,dark:O.dark?1:0,notes:nn,
    showWarn:!!O.showWarn, page:pl.page, k:pl.k});
  nn.forEach(m=>notes.push(m));
  if(!b)return {ok:0,fmt,name,plan:pl,report:[{lv:"er",
   s:"تعذّر التنقيط — الأبعاد تتجاوز حدّ القماش في هذا "
    +"المتصفّح. قلّل الدقّة أو صغّر النطاق."}]};
  blob=b; raw=null;
  head=`${F.n} · ${name} · ${dim2(info.px,info.py,"بكسل")} · `
   +`${info.dpi} نقطة/بوصة · ${humanSize(sizeOf(b))}`
   +(pageStr(pl)?` · ${pageStr(pl)}`:"");
  if(info.scaled)extra.push({lv:"in",s:`خُفِّضت الدقّة من ${dpi} `
   +`لحدّ الأبعاد والمساحة`});
 }
 else{
  const r=await toPDFz(P,pl.box,{pad:pl.pad,
   showWarn:!!O.showWarn, page:pl.page, k:pl.k,
   info:{title:S.meta.name, sheet:TT.sheet,
    rev:TT.rev, by:TT.by, proj:TT.proj}});
  raw=r.bytes; blob=blobOf(raw,F.mime);
  (r.notes||[]).forEach(m=>notes.push(m));
  if(r.hatchCut)extra.push({lv:"wr",s:`هاشورٌ في ${r.hatchCut} `
   +`موضعاً لم يُصدَّر`});
  head=`${F.n} · ${name} · ${humanSize(sizeOf(raw))} · `
   +(pageStr(pl)||dim2(r.pw.toFixed(0),r.ph.toFixed(0),"مم"))
   +` · 1:${pl.scale}`
   +(r.zip?` · ضُغِط المحتوى `
     +`${(r.zip.from/Math.max(1,r.zip.to)).toFixed(1)}×`:"");
  if(r.arabic)notes.push(`${r.arabic} نصّاً عربياً أُدرج قناعاً `
   +`بلون طبقته (${r.images} قناعاً فريداً) — الخطوط القياسية لا `
   +`تحمل العربية. للنصّ المتّجه استعمل SVG.`);
 }
 if(aborted())return cancelled();
 const shapeMsgs=shapeNotes().map(([sev,msg])=>({lv:sev==="wr"?"wr":"in", s:msg}));
 const report=[{lv:"ok",s:head}]
  .concat(extra, shapeMsgs, lossOf(fmt,pl),
   notes.map(s=>({lv:"in",s:`${FMT[fmt].n}: ${s}`})));
 return {ok:1, fmt, name, mime:F.mime, blob, raw,
  size:sizeOf(raw||blob), report, plan:pl,
  caps:CAPS[fmt]||null};
}

/* ═══ التصدير الدفعي — D ═══
   ورقةٌ واحدة = run() القديم بلا تغيير. كلّ الأوراق = حلقةٌ على
   S.sheets بلا كاش عامّ (vportScene مخصّصةٌ للورقة النشطة وحدها).
   تُركَّب الورقةُ من مشهد النموذج الحالي؛ levelScope للمنفذ بياناتٌ
   لا تُطبَّق بعد (انظر تنبيه mkViewport في core/sheet.js). */
const batchSheets=()=>(S.sheets||[]).filter(s=>visibleViewportCount(s)>0);

export function planForSheet(sh,fmt){
 const composed=composeSheet(sh,scene().P,{});
 const p=sheetPapers(sh);
 return {
  mode:"vports", fmt,
  name:safeName(sh.name||S.meta.name||"PLAN",FMT[fmt].ext),
  P:composed.prims,
  box:{x0:0,y0:0,x1:p.w,y1:p.h}, pad:0,
  page:{w:p.w,h:p.h,name:sizeName(sh),or:sh.orient==="p"?"عمودي":"أفقي"},
  dropped:composed.dropped||0, k:1, scale:1,
  sh, vpN:visibleViewportCount(sh)
 };
}

export function preflightAll(fmt){
 const sheets=batchSheets();
 if(!sheets.length)return preflight(fmt);
 const out=[];
 sheets.forEach(sh=>{
  const pl=planForSheet(sh,fmt);
  if(!pl.P||!pl.P.length)
   out.push({lv:"er",s:`${sh.name}: لا شيء داخل المنافذ — وسّع نطاقها`});
  if(pl.dropped)
   out.push({lv:"in",s:`${sh.name}: ${pl.dropped} أوّليةً قُصّت خارج الإطار`});
 });
 if(fmt==="dxf"){
  const bad=scene().P.filter(g=>g.t==="text"
   &&/[^\u0000-\u00ff\u0600-\u06ff\s]/.test(String(g.s||"")));
  if(bad.length)
   out.push({lv:"in",s:`${bad.length} نصّاً يحوي محارف قد لا تظهر في DXF`});
 }
 return out;
}

/* تنفيذ ورقةٍ واحدة بخطّةٍ جاهزة — يستدعيه runAll */
async function runOne(pl,fmt,opt){
 const F=FMT[fmt];
 const TT=(opt&&opt.stripAuthor)?stripTitle(S.title):S.title;
 const O=Object.assign({dark:0,showWarn:false,dpi:300},opt||{});
 const notes=[], extra=[];
 let raw=null, blob=null;
 const bb=padded(pl.box,pl.pad||0);
 if(fmt==="dxf"){
  /* ═══ مسارُ الأوراق: الكتلُ تبقى مفكَّكةً بقصد ═══ P-تحسين
     أوّلياتُ هذا المسار مقصوصةٌ ومحوَّلةٌ بمنفذها (composeSheet)،
     فمثيلُ الكتلة فيه ليس في فضاء النموذج. وINSERT داخل منفذٍ
     يحتاج تحويلَ المنفذ في كتلةٍ ثانيةٍ حاوية — وذاك عملٌ آخر.
     فحدٌّ مُعلَنٌ: تصديرُ النموذج يحمل كتلاً حقيقية، وتصديرُ
     الأوراقِ يحمل خطوطاً كما كان. */
  const r=toDXFBytes(pl.P,bb,{k:pl.k});
  raw=r.bytes; blob=blobOf(raw,F.mime);
  (r.notes||[]).forEach(m=>notes.push(m));
  if(r.bad)extra.push({lv:"wr",s:`${r.bad} محرفاً لا وجود له في CP1256`});
  if(r.hatchCut)extra.push({lv:"wr",s:`هاشورٌ في ${r.hatchCut} موضعاً لم يُصدَّر`});
 }else if(fmt==="svg"){
  const r=toSVG(pl.P,pl.box,{pad:pl.pad,dark:O.dark?1:0,
   showWarn:!!O.showWarn,page:pl.page,k:pl.k});
  raw=r.txt; blob=blobOf(raw,F.mime);
  (r.notes||[]).forEach(m=>notes.push(m));
 }else if(fmt==="png"){
  const dpi=clamp(parseInt(O.dpi,10)||300,72,1200);
  const nn=[];
  const {blob:b}=await toPNGBlob(pl.P,pl.box,{pad:pl.pad,dpi,
   dark:O.dark?1:0,notes:nn,showWarn:!!O.showWarn,page:pl.page,k:pl.k});
  nn.forEach(m=>notes.push(m));
  if(!b)return {ok:0,report:[{lv:"er",
   s:`${pl.sh?pl.sh.name:""}: تعذّر التنقيط — قلّل الدقّة`}]};
  blob=b;
 }else{
  const r=await toPDFz(pl.P,pl.box,{pad:pl.pad,showWarn:!!O.showWarn,
   page:pl.page,k:pl.k,
   info:{title:S.meta.name,sheet:pl.sh?pl.sh.name:TT.sheet,
    rev:TT.rev,by:TT.by,proj:TT.proj}});
  raw=r.bytes; blob=blobOf(raw,F.mime);
  (r.notes||[]).forEach(m=>notes.push(m));
  if(r.hatchCut)extra.push({lv:"wr",s:`هاشورٌ في ${r.hatchCut} موضعاً لم يُصدَّر`});
 }
 return {ok:1,raw,blob,notes,extra,pl};
}

/* بايتاتٌ حاضرةٌ لكل ملفّ (ZIP لا يقرأ Blob): DXF بايتات جاهزة · SVG
   نصٌّ يُرمَّز UTF-8 · PNG يُقرأ من Blob */
async function bytesOfOne(one){
 if(one.raw instanceof Uint8Array)return one.raw;
 if(typeof one.raw==="string")return new TextEncoder().encode(one.raw);
 if(one.blob&&typeof one.blob.arrayBuffer==="function")
  return new Uint8Array(await one.blob.arrayBuffer());
 return null;
}
/* أسماءٌ فريدة داخل الدفعة: ورقتان بالاسم نفسه كانتا تُنتجان
   ملفَّين بالاسم نفسه فيُكتب أحدهما فوق الآخر عند فكّ الضغط */
function uniqueName(name,ext,used){
 let n=name, i=2;
 const stem=name.replace(new RegExp(`\\.${ext}$`,"i"),"");
 while(used.has(n.toLowerCase()))n=`${stem}-${i++}.${ext}`;
 used.add(n.toLowerCase());
 return n;
}

export async function runAll(fmt,opt){
 const F=FMT[fmt];
 if(!F)throw new Error(`صيغةٌ مجهولة: ${fmt}`);
 const sheets=batchSheets();
 /* لا أوراق بمنافذ أو لم يُطلَب «كل الأوراق» → السلوك القديم */
 if(!sheets.length||!(opt&&opt.allSheets))return run(fmt,opt);
 const fail=(report)=>({ok:0,fmt,name:null,mime:F.mime,blob:null,raw:null,
  size:0,report});
 if((fmt==="png"||fmt==="pdf")&&typeof document==="undefined")
  return fail([{lv:"er",s:"PNG/PDF يحتاج متصفّحاً — لا يُختبر في node بلا قماش"}]);
 const aborted=()=>!!(opt&&opt.signal&&opt.signal.aborted);
 const cancelled=()=>fail([{lv:"in",s:"أُلغي التصدير — لم يُنزَّل شيء"}]);
 if(aborted())return cancelled();
 const mode=(opt&&opt.allMode)||"zip";       /* zip | files | singlePdf */

 /* PDF واحدٌ مجمَّع — كلّ الأوراق صفحاتٌ في ملفٍّ واحد */
 if(fmt==="pdf"&&mode==="singlePdf"){
  const pre=preflightAll(fmt);
  if(pre.some(p=>p.lv==="er"))return fail(pre);
  const strip=!!(opt&&opt.stripAuthor);
  const plans=withTitle(strip,()=>sheets.map(sh=>planForSheet(sh,fmt)));
  const {toPDFzMulti}=await import("./pdf.js");
  const r=await toPDFzMulti(plans,Object.assign({},opt||{},
   {title:strip?stripTitle(S.title):S.title}));
  if(aborted())return cancelled();
  const name=safeName((S.meta.name||"PLAN")+"-كل_الأوراق",F.ext);
  const rep=[{lv:"ok",s:`PDF مجمَّع · ${sheets.length} ورقة · `
   +`${humanSize(r.bytes.length)}`}].concat(pre);
  if(r.hatchCut)rep.push({lv:"wr",s:`هاشورٌ في ${r.hatchCut} موضعاً لم يُصدَّر`});
  if(r.arabic)rep.push({lv:"in",
   s:`${r.arabic} نصّاً عربياً أُدرج قناعاً بلون طبقته`});
  return {ok:1,fmt,name,mime:F.mime,blob:blobOf(r.bytes,F.mime),
   raw:r.bytes,size:r.bytes.length,report:rep,plans};
 }

 /* ملفٌّ مستقلٌّ لكل ورقة، ومعها ZIP جاهزٌ في وضع zip */
 const files=[], reports=[], used=new Set();
 for(let i=0;i<sheets.length;i++){
  if(aborted())return cancelled();
  const sh=sheets[i];
  const pl=withTitle(!!(opt&&opt.stripAuthor),()=>planForSheet(sh,fmt));
  if(!pl.P.length){
   reports.push({lv:"wr",s:`${sh.name}: فارغة — تخطّي`});
   continue;
  }
  const one=await runOne(pl,fmt,opt);
  if(!one.ok){reports.push(...(one.report||[])); continue}
  const raw=await bytesOfOne(one);
  if(!raw){reports.push({lv:"er",s:`${sh.name}: لا بايتات للملفّ`}); continue}
  files.push({name:uniqueName(safeName(sh.name||`ورقة-${i+1}`,F.ext),F.ext,used),
   blob:one.blob, raw});
  one.extra.forEach(m=>reports.push(m));
 }
 if(aborted())return cancelled();
 if(!files.length)
  return fail([{lv:"er",s:"لا ملفّات أُنتجت"}].concat(reports));
 const res={ok:1,fmt,mime:F.mime,files,
  report:[{lv:"ok",s:`${files.length} ورقة جاهزة`}].concat(reports)};
 if(mode==="zip"){
  const z=createZip(files.map(f=>({name:f.name,raw:f.raw})));
  res.zip={name:safeName((S.meta.name||"PLAN")+"-كل_الأوراق","zip"),
   mime:"application/zip",raw:z,size:z.length,
   blob:blobOf(z,"application/zip")};
 }
 return res;
}
