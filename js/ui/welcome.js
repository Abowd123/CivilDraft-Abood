/* ═══ شاشة البداية — أول تشغيل ═══
   الدمج أ+ب+ج (انظر welcome-model.js): ورقةُ لوحةٍ بإطارٍ وجدول عنوان
   فيه شعارُ الجهة، وصندوقُ أوامرٍ واحدٌ حالتُه الفاضية خياراتُ البدء،
   وإطارُ عرضٍ يرسم المخطط أمراً بأمر.
   تظهر للجلسات الفارغة (بلا جدران ولا مناطق) لمرّة. إغلاقُها يُثبَّت
   في UIS.welcomed — تفضيلُ نافذةٍ لا بياناتِ رسم. D12-EP6.
   لا style="" ولا معالجَ مضمَّناً: style-src/script-src 'self'. */
import {S} from "../core/state.js";
import {UIS,uiSet} from "./store.js";
import {VERSION} from "../core/version.js";
import {escapeHtml as esc} from "../core/escape.js";
import {ORG,rowsFor,digitPick,wrap,CAPS} from "./welcome-model.js";

const $=s=>document.querySelector(s);

const PLAN=`<svg class="wc-plan" viewBox="0 0 172 128" aria-hidden="true">
 <path class="w" pathLength="1" d="M10 14H160V120H10Z"/>
 <path class="w" pathLength="1" d="M75 14V58M75 72V80H160"/>
 <path class="w" pathLength="1" d="M10 80H52M118 80V120"/>
 <path class="d" pathLength="1" d="M75 58A14 14 0 0 1 89 72M75 72H89"/>
 <path class="d" pathLength="1" d="M52 80A12 12 0 0 1 64 68M64 80V68"/>
 <path class="m" pathLength="1" d="M10 5H160M10 2V8M160 2V8"/>
 <path class="m" pathLength="1" d="M166 14V120M163 14H169M163 120H169"/>
 <text x="85" y="3.6" text-anchor="middle">16.00</text>
 <text x="0" y="0" text-anchor="middle" transform="translate(171 67) rotate(-90)">12.00</text>
 <text class="r" x="42" y="48" text-anchor="middle">صالة</text>
 <text class="r" x="118" y="48" text-anchor="middle">مجلس</text>
 <text class="r" x="139" y="102" text-anchor="middle">مطبخ</text>
 <text class="r" x="62" y="102" text-anchor="middle">نوم</text>
</svg>`;

export function initWelcome(opts={}){
 const SAFE=!!opts.safe;
 if(SAFE||S.walls.length||S.areas.length||UIS.welcomed)return false;

 const stage=$("#stage");
 if(!stage)return false;

 let root=$("#welcome");
 if(!root){
  root=document.createElement("div");
  root.id="welcome";
  root.setAttribute("dir","rtl");
  stage.appendChild(root);
 }
 root.innerHTML=`<div class="wc" role="dialog" aria-label="شاشة البداية">
 <svg class="wc-frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
  <rect pathLength="1" x="0" y="0" width="100" height="100"/>
  <rect pathLength="1" x="1.3" y="2" width="97.4" height="96"/></svg>
 <button type="button" class="wc-close" data-wc="close"
  title="إغلاق (Esc)" aria-label="إغلاق شاشة البداية">✕</button>
 <div class="wc-body">
  <div class="wc-vp" aria-hidden="true">
   <div class="wc-vph"><span>إطار عرض · فيلا العرض</span><span class="wc-mono">1:100</span></div>
   ${PLAN}
   <div class="wc-cap"><span class="wc-kbd" data-cap="k">W</span><b data-cap="t">جدار</b><span data-cap="s">المحيط 16 × 12</span></div>
  </div>
  <div class="wc-intro">
   <div class="wc-eye">CivilDraft ${esc(VERSION)}</div>
   <h3>وش بنرسم <span>اليوم؟</span></h3>
   <div class="wc-q">
    <label class="wc-ql"><span class="wc-prompt" aria-hidden="true">›_</span>
     <input type="text" data-wc="q" autocomplete="off" spellcheck="false"
      role="combobox" aria-expanded="true" aria-controls="wcList"
      aria-label="اكتب أمراً أو اختر بالأرقام ١ إلى ٤"
      placeholder="اكتب أمراً: جدار، فيلا، افتح… أو اضغط ١ إلى ٤"></label>
    <div class="wc-list" id="wcList" role="listbox"></div>
   </div>
   <div class="wc-under">
    <label class="wc-beg"><input type="checkbox" data-wc="beginner"${UIS.beginner?" checked":""}>
     <span>وضع المبتدئ <small>الأدوات الأساسية فقط</small></span></label>
    <button type="button" class="wc-link" data-wc="tour">جولة سريعة</button>
   </div>
  </div>
 </div>
 <div class="wc-tb">
  <div><small>المشروع</small><strong>بدون عنوان</strong></div>
  <div class="wc-sc"><small>المقياس</small><strong class="wc-mono">1:100</strong></div>
  <div class="wc-st"><small>الحالة</small><strong data-wc-st>جاهز</strong></div>
  <div class="wc-org"><span class="wc-logo"><img alt="شعار الكلية" width="46" height="46"></span>
   <div><small>الجهة</small><strong>${esc(ORG.name)}</strong></div></div>
 </div>
</div>`;
 root.hidden=false;

 /* الشعار: يُحمَّل بمستمعٍ لا بمعالجٍ مضمَّن؛ وإن غاب الملفّ بقيت خانةٌ منقّطة */
 const img=root.querySelector(".wc-logo img");
 img.addEventListener("error",()=>{img.remove(); root.querySelector(".wc-logo").classList.add("wc-ph")},{once:true});
 img.src=ORG.logo;

 const inp=root.querySelector('[data-wc="q"]');
 const list=root.querySelector(".wc-list");
 let rows=[], sel=0, T=[];

 function render(){
  rows=rowsFor(inp.value,opts.search);
  sel=Math.min(sel,Math.max(0,rows.length-1));
  list.innerHTML=rows.length?rows.map((r,i)=>`<div class="wc-row" role="option" data-i="${i}" aria-selected="${i===sel}">
   <span class="wc-n">${esc(r.n)}</span><span class="wc-t">${esc(r.t)}<small>${esc(r.s)}</small></span><span class="wc-k">${esc(r.k)}</span></div>`).join("")
   :`<div class="wc-none">ما في أمر بهالاسم. جرّب «جدار» أو «قالب».</div>`;
 }
 function close(){
  T.forEach(clearTimeout); T=[];
  root.hidden=true;
  uiSet("welcomed",1);
 }
 function act(r){
  if(!r)return;
  close();
  const a=r.a;
  if(a==="wall"){if(opts.startWall)opts.startWall(); return}
  if(a==="dxf"){if(opts.openDxf)opts.openDxf(); return}
  if(a==="tour"){if(opts.openTour)opts.openTour(); return}
  if(a==="studio"){if(opts.openStudio)opts.openStudio(); return}
  if(a==="learn"){if(opts.openLearn)opts.openLearn(); else if(opts.openStudio)opts.openStudio(); return}
  if(a==="pal"){if(opts.exec)opts.exec(r.it); return}
  if(a.startsWith("tpl-")){if(opts.useTemplate)opts.useTemplate(a.slice(4)); return}
 }

 /* ج: تعليقٌ يتبع رسمَ المسارات؛ بلا مؤقّتاتٍ لمن طلب تقليل الحركة */
 const still=typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion:reduce)").matches;
 const cap=k=>root.querySelector(`[data-cap="${k}"]`);
 const setCap=c=>{cap("k").textContent=c[0]; cap("t").textContent=c[1]; cap("s").textContent=c[2]};
 if(still)setCap(CAPS[CAPS.length-1]);
 else{
  root.classList.add("wc-boot");
  CAPS.forEach((c,i)=>T.push(setTimeout(()=>setCap(c),350+i*150)));
  T.push(setTimeout(()=>root.classList.remove("wc-boot"),2600));
 }

 render();
 inp.focus();

 inp.addEventListener("input",()=>{sel=0; render()});
 inp.addEventListener("keydown",e=>{
  const n=rows.length;
  if(e.key==="ArrowDown"){sel=wrap(sel+1,n); render(); e.preventDefault(); return}
  if(e.key==="ArrowUp"){sel=wrap(sel-1,n); render(); e.preventDefault(); return}
  if(e.key==="Enter"){act(rows[sel]); e.preventDefault(); return}
  if(e.key==="Escape"){close(); $("#clIn")?.focus(); e.preventDefault(); return}
  const d=digitPick(e.key,!inp.value);
  if(d>=0){act(rows[d]); e.preventDefault()}
 });
 list.addEventListener("mousemove",e=>{
  const r=e.target.closest(".wc-row");
  if(r&&+r.dataset.i!==sel){sel=+r.dataset.i; render()}
 });

 /* وضع المبتدئ: يُطبَّق فوراً والشاشة تبقى — ليس خطوة بداية */
 root.addEventListener("change",e=>{
  const t=e.target;
  if(t&&t.dataset&&t.dataset.wc==="beginner"&&opts.setBeginner)
   opts.setBeginner(t.checked);
 });

 root.addEventListener("click",e=>{
  /* نقرٌ على الخلفية خارج الورقة يُغلق كالنقر على ✕ */
  if(!e.target.closest(".wc")){close(); return}
  const row=e.target.closest(".wc-row");
  if(row){act(rows[+row.dataset.i]); return}
  const k=e.target.closest("[data-wc]")?.dataset.wc;
  if(!k||k==="beginner"||k==="q")return;
  if(k==="close"){close(); $("#clIn")?.focus(); return}
  if(k==="tour"){act({a:"tour"}); return}
 });

 return true;
}
