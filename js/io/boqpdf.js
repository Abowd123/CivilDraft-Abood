/* ═══ جداول PDF لحصر الكميات ═══
   يبني جدول الفتحات وجدول الأعمدة وجدول المناطق — نفس الأقسام
   وأعمدتها حرفياً كما في io/boqreport.js#boqHTML — في صفحة PDF
   واحدة (A4 أفقي)، ثم يمرّرها عبر io/pdf.js#toPDFz: الكاتب
   الموحَّد نفسه الذي يصدّر اللوحة، لا كاتباً ثانياً.

   قراءةٌ محضة من boq() — لا edit ولا خطوة تاريخ.

   ═══ فصل البناء عن الكتابة ═══
   boqPDFPrims() دالّةٌ خالصة تُعيد أوّلياتٍ ومربّعاً — تُختبَر في
   node بلا قماشٍ ولا CompressionStream. boqSchedulePDF() وحدها
   تحتاج متصفّحاً (قناع النصّ العربي في io/pdf.js يفتح canvas).

   ═══ المقياس ═══
   toPDF يقسم كل إحداثيةٍ على S.meta.scale (لأنه يفترض هندسة لوحةٍ
   حقيقية بمقياس k). فجدولٌ يريد الخروج بمقاس ١:١ على الورق يحتاج
   ضرب إحداثياته بـk أوّلاً — لا مسّاً لـmeta.scale نفسها، بل تعويضٌ
   محليّ في هذا الملفّ وحده.

   ═══ تجاوز الصفحة ═══
   لا قصّ صامت: إن تجاوزت الجداول ارتفاع الصفحة يُحسَب `over`
   بالمليمتر ويُعاد صراحةً — والمستدعي (tools/boqreport.js) يُبلِّغه. */
import {S} from "../core/state.js";
import {boq} from "../core/boq.js";
import {m2,sqm} from "../core/units.js";
import {SIZES} from "../core/sheet.js";
import {toPDFz} from "./pdf.js";

const [PW,PH]=SIZES.A4;           /* 297×210 مم — أفقي بالفعل */
const MRG=15;                     /* هامش الصفحة بالمليمتر */
const L="A-SHET";                 /* طبقة بلوك العنوان نفسها — لا طبقة جديدة تحتاج تسجيلاً في laydef.js */

const tex=(x,y,h,al,s)=>({t:"text",L,x,y,h,al,s:String(s==null?"":s)});
const ln=(a,b)=>({t:"line",L,a,b});

/* ═══ جدولٌ واحد ═══
   شريط عنوانٍ بعرض الجدول كاملاً (بلا فواصل داخلية)، ثم صفّ رؤوسٍ،
   ثم صفوف البيانات — كلّها بحدودٍ كاملة. y ينخفض كلّما نزلنا
   (كإحداثيّات النموذج في core/sheet.js: الأعلى قيمةً أعلى الصفحة). */
function table(P,title,top,x0,widths,head,rows){
 const TTL=8, HDR=7.5, ROW=7;
 const w=widths.reduce((a,b)=>a+b,0);
 const X=[x0]; widths.forEach(ww=>X.push(X[X.length-1]+ww));
 const n=rows.length;
 const yTtl=top, yHead=top-TTL, yBody=yHead-HDR, yBot=yBody-n*ROW;

 /* شريط العنوان */
 P.push(tex(x0+w/2,(yTtl+yHead)/2,4.2,"mc",title));
 /* الحدود الأفقية */
 P.push(ln([x0,yTtl],[x0+w,yTtl]));
 P.push(ln([x0,yHead],[x0+w,yHead]));
 P.push(ln([x0,yBody],[x0+w,yBody]));
 for(let r=1;r<n;r++)P.push(ln([x0,yBody-r*ROW],[x0+w,yBody-r*ROW]));
 P.push(ln([x0,yBot],[x0+w,yBot]));
 /* الحدود الرأسية — لا تعبر شريط العنوان */
 P.push(ln([x0,yHead],[x0,yBot]));
 P.push(ln([x0+w,yHead],[x0+w,yBot]));
 for(let i=1;i<X.length-1;i++)P.push(ln([X[i],yHead],[X[i],yBot]));
 /* نصوص الرؤوس */
 head.forEach((h,i)=>
  P.push(tex((X[i]+X[i+1])/2,(yHead+yBody)/2,3,"mc",h)));
 /* نصوص الصفوف */
 rows.forEach((row,r)=>{
  const cy=yBody-r*ROW-ROW/2;
  row.forEach((c,i)=>P.push(tex((X[i]+X[i+1])/2,cy,2.7,"mc",c)));
 });
 return yBot;
}

/* ═══ البنّاء الخالص ═══ */
export function boqPDFPrims(B){
 B=B||boq();
 const P=[];
 const w=PW-2*MRG, x0=MRG;
 let y=PH-MRG-3;

 P.push(tex(PW/2,y,5.5,"mc",`${B.name||"مشروع"} — جداول الكميات`
  +(B.tag?` (${B.tag})`:"")));
 y-=8;
 P.push(tex(PW/2,y,3.2,"mc",
  `المقياس 1:${B.scale} · التاريخ ${B.date||"—"}`));
 y-=10;

 const nOpens=B.opens.n||0, nCols=(B.cols&&B.cols.n)||0,
       nAreas=B.areas.n||0;

 if(nOpens){
  const rows=(B.opens.rows||[]).map(r=>[
   r.name, String(r.n), m2(r.wMin), m2(r.wMax),
   sqm(r.ar), r.pan?String(r.pan):"—", r.bad?String(r.bad):"—"]);
  y=table(P,"جدول الفتحات",y,x0,[50,25,38,38,38,35,43],
   ["النوع","العدد","أصغر عرض (م)","أكبر عرض (م)",
    "المساحة (م²)","المصاريع","معطوبة"],rows)-10;
 }
 if(nCols){
  const rows=(B.cols.rows||[]).map(r=>[
   r.name, String(r.n), m2(r.wMin), m2(r.wMax), sqm(r.area)]);
  y=table(P,"جدول الأعمدة",y,x0,[70,30,45,45,77],
   ["النوع · المادّة","العدد","أصغر مقاس (م)",
    "أكبر مقاس (م)","المساحة (م²)"],rows)-10;
 }
 if(nAreas){
  const rows=(B.areas.rows||[]).map(r=>[
   r.id, r.name, sqm(r.area), m2(r.perim),
   r.valid||(r.stale?"قديمة":"سليمة")]);
  y=table(P,"جدول المناطق",y,x0,[30,90,45,45,57],
   ["المعرّف","الاسم","المساحة (م²)","المحيط (م)","الحالة"],rows)-10;
 }

 const over=y<(MRG-10)?Math.round(MRG-10-y):0;
 const k=Math.max(1,+S.meta.scale||100);
 const prims=P.map(g=>g.t==="text"
  ? {...g,x:g.x*k,y:g.y*k,h:g.h*k}
  : {...g,a:[g.a[0]*k,g.a[1]*k],b:[g.b[0]*k,g.b[1]*k]});
 return {prims, box:{x0:0,y0:0,x1:PW*k,y1:PH*k}, page:{w:PW,h:PH},
  over, empty:!nOpens&&!nCols&&!nAreas,
  n:{opens:nOpens,cols:nCols,areas:nAreas}};
}

/* ═══ التنفيذ الفعليّ (متصفّح) ═══ */
export async function boqSchedulePDF(B){
 const r=boqPDFPrims(B);
 const out=await toPDFz(r.prims,r.box,
  {pad:0, page:r.page, showWarn:false,
   info:{title:S.meta.name, sheet:S.title&&S.title.sheet,
    rev:S.title&&S.title.rev, by:S.title&&S.title.by,
    proj:S.title&&S.title.proj}});
 return {bytes:out.bytes, over:r.over, empty:r.empty, n:r.n,
  arabic:out.arabic, images:out.images};
}
