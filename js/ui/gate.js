/* ═══ بوابة التسليم ═══ تجميعٌ لا منطقٌ جديد: preflight (PDF وDXF) +
   محاذاة الطوابق + التكرار (26) + الطبقات الفارغة والكتل غير المستعملة (25).
   قراءةٌ خالصة — لا تكتب في الحالة. er يمنع زرّ التصدير. */
import {preflight} from "../io/export.js";
import {findMisaligned} from "../core/levelAlign.js";
import {S} from "../core/state.js";
import {H} from "../tools/registry.js";
import {buildReport} from "../tools/cleanup.js";
import {findDupes} from "../tools/dedup.js";
import {ACTIONS} from "./actions.js";
import {escapeHtml as esc} from "../core/escape.js";
import {rptOpen,rptClose} from "./rpt.js";

export function gateReport(){
 const seen=new Set(), out=[];
 const push=r=>{
  const k=r.lv+"|"+r.s;
  if(!seen.has(k)){seen.add(k); out.push(r)}
 };
 preflight("pdf").forEach(push);
 preflight("dxf").forEach(push);
 findMisaligned(S,50).forEach(m=>push({lv:"wr",s:m.msg}));
 findDupes().forEach(d=>push({lv:"wr",s:d.msg}));
 const c=buildReport();
 c.emptyLayers.forEach(l=>push({lv:"in",s:`طبقة ${l.n} فارغة`}));
 c.unusedBlocks.forEach(b=>push({lv:"in",s:`كتلة ${b.name} غير مستعملة`}));
 return out;
}

const ICON={er:"⛔",wr:"⚠",in:"ℹ"};

export function openGate(){
 const rep=gateReport();
 const er=rep.filter(r=>r.lv==="er").length;
 let h=rep.length
  ?rep.map(r=>`<div class="ln ${r.lv}">${ICON[r.lv]||"ℹ"} ${esc(r.s)}</div>`).join("")
  :`<div class="ln rpt-ok">✅ لا ملاحظات</div>`;
 h+=`<div class="rpt-act">`
  +(er?"":`<button type="button" data-do="pdf">تصدير PDF</button>`)
  +`<button type="button" data-rpt="close">إغلاق</button></div>`;
 const box=rptOpen(`بوابة التسليم — ${er?"⛔ غير جاهز":"✅ جاهز"} `
  +`(${rep.length} ملاحظة)`,h);
 const b=box.querySelector("[data-do=pdf]");
 if(b)b.addEventListener("click",()=>{
  rptClose();
  const a=ACTIONS.xPdf;
  if(a&&a.fn)a.fn(); else H.rep("er","زرّ تصدير PDF غير متاح");
 });
}

/* التسجيل النصّي لـgate في ui/appcmds.js وحده (تسجيلٌ واحد لكل معرّف) */
