/* ═══ أمر تقرير العميل — MT4 ═══
   فوريّ بلا خطوات كأمر boq نفسه: منطقُه في start ويعود false، فلا
   يدخل وضع التقاط نقاط. لا edit ولا rec — القراءة لا تدخل التاريخ.
   يتمّم أمر «boq» (CSV الكامل مع التسعير) لا يستبدله: هذا الأمر
   يُنتج HTML جاهزاً للعرض على العميل، وCSV فتحاتٍ مختصراً وحده. */
import {S} from "../core/state.js";
import {boq} from "../core/boq.js";
import {boqHTML,opensCSV} from "../io/boqreport.js";
import {boqSchedulePDF} from "../io/boqpdf.js";
import {dl} from "../io/project.js";
import {defTool,H,ovOn} from "./registry.js";

const safeName=s=>String(s||"PLAN").replace(/[\\/:*?"<>|]+/g,"_")
 .slice(0,40).trim().replace(/\s+/g,"_");

defTool({
 id:"report", stay:1, alias:"report تقرير",
 label:"تقرير العميل",
 hint:"يولّد تقرير HTML وجدول فتحات CSV ويُنزّلهما — قراءةٌ لا تعديل",
 opts:[
  {k:"html",label:"نزّل تقرير HTML", type:"chk", def:1},
  {k:"csv", label:"نزّل جدول الفتحات",type:"chk", def:1},
  {k:"pdf", label:"نزّل جداول PDF",   type:"chk", def:1}],
 start(){
  const B=boq();
  const excl=B.walls.hidden+B.walls.noplot+B.opens.hidden+B.opens.noplot
   +B.areas.hidden+B.areas.noplot
   +(B.cols?B.cols.hidden+B.cols.noplot:0)
   +(B.fixt?B.fixt.hidden+B.fixt.noplot:0)
   +(B.stairs?B.stairs.hidden+B.stairs.noplot:0);
  const empty=!B.walls.n&&!B.opens.total&&!B.areas.n
   &&!(B.cols&&B.cols.n)&&!(B.fixt&&B.fixt.n)&&!(B.stairs&&B.stairs.n);
  if(empty&&!excl){
   H.rep("in","المشروع فارغ — لا تقرير");
   return false;
  }
  let n=0;
  if(ovOn("report","html")){
   const nm=safeName(S.meta.name)+"-تقرير.html";
   const size=dl(nm,boqHTML(B),"text/html;charset=utf-8");
   H.rep("ok",`نُزّل ${nm} · ${size} بايت`);
   n++;
  }
  if(ovOn("report","csv")){
   const nm=safeName(S.meta.name)+"-فتحات.csv";
   const size=dl(nm,opensCSV(B),"text/csv;charset=utf-8");
   H.rep("ok",`نُزّل ${nm} · ${size} بايت`);
   n++;
  }
  if(ovOn("report","pdf")){
   /* toPDFz غير متزامنة (قناع النصّ العربي والضغط) — start() يجب
      أن تعود مباشرةً كسائر الأدوات، فتُطلَق مهمّةٌ منفصلة تُبلِّغ
      بنتيجتها عبر H.rep حين تنتهي، لا تعديلاً على الحالة ولا خطوة
      تاريخٍ (القراءة محضة كما في فرعَي html/csv أعلاه). */
   H.rep("in","يُبنى PDF الجداول…");
   (async()=>{
    try{
     const r=await boqSchedulePDF(B);
     if(r.empty){
      H.rep("in","لا فتحات ولا أعمدة ولا مناطق للجدولة — لم يُبنَ PDF");
      return;
     }
     if(r.over)
      H.rep("wr",`تجاوزت الجداولُ ارتفاع الصفحة بـ ${r.over} مم `
       +"— قلّل البنود أو استعمل CSV/HTML بدلاً منه");
     const nm=safeName(S.meta.name)+"-جداول.pdf";
     const size=dl(nm,r.bytes,"application/pdf");
     H.rep("ok",`نُزّل ${nm} · ${size} بايت`);
    }catch(e){
     H.rep("er","تعذّر بناء PDF الجداول: "+((e&&e.message)||String(e)));
    }
   })();
   n++;
  }
  if(!n)H.rep("in","كل خيارات التنزيل معطّلة — شغّل html أو csv أو pdf");
  return false;                    /* أمر لحظي */
 },
 steps:[]});
