/* ═══ تنظيف المشروع ومسح التكرار — الواجهة ═══
   المنطق الخالص في tools/cleanup.js وtools/dedup.js (يُختبَران بلا DOM)،
   وهنا النوافذ وتسجيل الأمرين لسطر الأوامر. تقريرٌ قبل أي حذف،
   وكل نصٍّ من المشروع يمرّ بـesc. */
import {escapeHtml as esc} from "../core/escape.js";
import {H} from "../tools/registry.js";
import {buildReport,applyCleanup} from "../tools/cleanup.js";
import {findDupes,applyDedup} from "../tools/dedup.js";
import {rptOpen,rptClose} from "./rpt.js";

const ACTS=`<div class="rpt-act"><button type="button" data-do="go">`;
const CANCEL=`</button><button type="button" data-rpt="close">إلغاء</button></div>`;

export function openCleanup(){
 const r=buildReport();
 if(!r.emptyLayers.length&&!r.unusedBlocks.length){
  H.rep("in","المشروع نظيف — لا طبقات فارغة ولا كتل غير مستعملة");
  return;
 }
 let h="";
 if(r.emptyLayers.length)
  h+=`<h4>طبقات فارغة (${r.emptyLayers.length})</h4>`
   +r.emptyLayers.map(l=>`<label><input type="checkbox" `
    +`data-lay="${esc(l.n)}" checked> ${esc(l.n)} — ${esc(l.d)}`
    +`</label>`).join("");
 if(r.unusedBlocks.length)
  h+=`<h4>كتل غير مستعملة (${r.unusedBlocks.length})</h4>`
   +r.unusedBlocks.map(b=>`<label><input type="checkbox" `
    +`data-blk="${esc(b.name)}" checked> ${esc(b.title)}</label>`).join("");
 h+=ACTS+"احذف المحدد"+CANCEL;
 const box=rptOpen("تنظيف المشروع — تقرير قبل الحذف",h);
 box.querySelector("[data-do=go]").addEventListener("click",()=>{
  const lays=[...box.querySelectorAll("[data-lay]:checked")]
   .map(e=>e.dataset.lay);
  const blks=[...box.querySelectorAll("[data-blk]:checked")]
   .map(e=>e.dataset.blk);
  const res=applyCleanup(lays,blks);
  rptClose();
  H.rep(res.fail.length?"wr":"ok",
   `حُذفت ${res.lays} طبقة و${res.blks} كتلة`
   +(res.fail.length?` — رُفض: ${res.fail.join(" · ")}`:""));
  H.refresh();
 });
}

export function openDedup(){
 const dups=findDupes();
 if(!dups.length){
  H.rep("in","لا تكرار — كل الكيانات فريدة");
  return;
 }
 let h=dups.map((d,i)=>`<label><input type="checkbox" data-dup="${i}" `
  +`checked> ${esc(d.msg)}</label>`).join("");
 h+=ACTS+"احذف المحدد (الثاني من كل زوج)"+CANCEL;
 const box=rptOpen(`مسح التكرار — ${dups.length} حالة`,h);
 box.querySelector("[data-do=go]").addEventListener("click",()=>{
  const idx=[...box.querySelectorAll("[data-dup]:checked")]
   .map(e=>+e.dataset.dup);
  const r=applyDedup(dups,idx);
  rptClose();
  const c=r.res||{};
  const n=(c.walls||0)+(c.cols||0);
  H.rep(n?"ok":"in",`حُذف ${n} مكرَّر`
   +(c.opens?` مع ${c.opens} فتحة تابعة`:"")
   +(c.skipped?` · تخطّى ${c.skipped} غير قابل للتحديد`:""));
  H.refresh();
 });
}

/* التسجيل النصّي لـcleanup وdedup في ui/appcmds.js وحده (تسجيلٌ واحد لكل معرّف) */
