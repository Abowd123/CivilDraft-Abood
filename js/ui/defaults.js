/* ═══ لوحة الإعدادات الافتراضية ═══
   تُبنى من سجلّ الأدوات نفسه فلا تتخلّف عنه: كل حقلٍ هنا هو الحقل
   الذي يظهر في شريط الخيارات، والقيمة واحدة في الموضعين لأن
   المصدر واحد (OPT في registry).
   الافتراضات لزجة بين الجلسات سلفاً؛ الناقص كان العرض لا الحفظ.

   وتُعرَض الحقول كلّها بلا شرط when: تضبط ارتفاع السترة قبل أن
   تختار «سترة». ولأن الشرط ملغى فمجموعة الحقول ثابتة، فينقسم
   العمل قسمين كما في شريط الخيارات:
     renderDefaults  يبني — مرّةً في الإقلاع، وعند إعادة المصنع.
     syncDefaults    يحدّث القيَم بمقارنة، ويتخطّى المركَّز عليه.
   وكان البناء الكامل يقع مع كل تغيير خيار، فتُغلَق الأقسام
   الفرعية المفتوحة ويُفقَد موضع التمرير. */
import * as R from "../tools/registry.js";
import {reg,renderPanel,markDirty} from "./panels.js";
import {HOOK} from "./bus.js";
import {escapeHtml as esc} from "../core/escape.js";

const $=s=>document.querySelector(s);

const withOpts=()=>R.toolList()
 .filter(d=>d&&d.id&&(d.opts||[]).length)
 .sort((a,b)=>a.label.localeCompare(b.label,"ar"));

function field(d,f){
 const o=R.OPT[d.id]||{};
 const v=(o[f.k]===undefined)?f.def:o[f.k];
 const tag=`data-dt="${esc(d.id)}" data-dk="${esc(f.k)}"`;
 if(f.type==="chk")
  return `<div class="row"><label class="chk">`
   +`<input type="checkbox" ${tag}`
   +`${(v===1||v===true||v==="1")?" checked":""}> `
   +`${esc(f.label)}</label></div>`;
 let ctl;
 if(f.type==="sel")
  ctl=`<select ${tag}>`+f.items.map(([iv,it])=>
   `<option value="${esc(iv)}"`
   +`${String(iv)===String(v)?" selected":""}>${esc(it)}</option>`)
   .join("")+`</select>`;
 else
  ctl=`<input class="num" type="${f.type==="num"?"number":"text"}" `
   +`${tag} value="${esc(v)}"${f.type==="num"?' step="0.1"':""}>`;
 return `<div class="row"><label>${esc(f.label)}</label>${ctl}</div>`;
}
/* box يأتي من سجلّ اللوحات · و$ احتياطٌ للنداء المباشر */
export function renderDefaults(box){
 const el=box||$("#defs");
 if(!el)return;
 const T=withOpts();
 el.innerHTML=`<p class="hint">${T.length} أداة لها خيارات — `
  +`تُقرأ عند إنشاء العنصر لا قبله، فتغييرها وسط سلسلة يسري على `
  +`القطعة التالية وحدها.</p>`
  +T.map(d=>`<details class="sub"><summary>${esc(d.label)}`
   +` <span class="mono u-c1d97" >`
   +`${esc(d.id)}</span></summary><div>`
   +(d.opts||[]).map(f=>field(d,f)).join("")
   +`</div></details>`).join("");
}
export function syncDefaults(){
 const box=$("#defs");
 if(!box)return;
 const A=document.activeElement;
 box.querySelectorAll("[data-dt]").forEach(el=>{
  if(el===A)return;              /* لا نكتب فوق ما يكتبه المستخدم */
  const o=R.OPT[el.dataset.dt]||{};
  const v=o[el.dataset.dk];
  if(el.type==="checkbox"){
   const on=(v===1||v===true||v==="1");
   if(el.checked!==on)el.checked=on;
   return;
  }
  const s=String(v==null?"":v);
  if(el.value!==s)el.value=s;
 });
}
export function wireDefaults(){
 const box=$("#defs");
 if(!box)return;
 reg("defs","#defs",renderDefaults,"الإعدادات الافتراضية");
 box.addEventListener("change",e=>{
  const dt=e.target.dataset.dt, dk=e.target.dataset.dk;
  if(!dt||!dk)return;
  const v=(e.target.type==="checkbox")?(e.target.checked?1:0)
   :e.target.value;
  R.setOpt(dt,dk,v);
  const d=R.TOOLS[dt];
  const f=d&&(d.opts||[]).find(x=>x.k===dk);
  HOOK.report("in",`${d?d.label:dt} · ${f?f.label:dk}: `
   +((f&&f.type==="chk")?(v?"مُشغّل":"مُوقف"):v));
  HOOK.prompt();          /* شريط الخيارات يُبنى من OPT نفسه */
 });
 box.addEventListener("keydown",e=>{
  if(e.key==="Escape"){e.target.blur();return}
  e.stopPropagation();
 });
 const rst=$("#dRst");
 if(rst)rst.onclick=()=>{
  if(!confirm("إعادة كل خيارات الأدوات إلى مصنعها؟"))return;
  let n=0;
  withOpts().forEach(d=>(d.opts||[]).forEach(f=>{
   const o=R.OPT[d.id]||{};
   if(String(o[f.k])!==String(f.def))n++;
   R.setOpt(d.id,f.k,f.def);
  }));
  markDirty("defs");
  renderPanel("defs");
  HOOK.report(n?"ok":"in",n?`أُعيد ${n} خياراً إلى مصنعه`
   :"كلّها على المصنع سلفاً");
  HOOK.prompt();
 };
 renderPanel("defs");
}
