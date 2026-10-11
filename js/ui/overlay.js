/* ═══ تركيبات فوق اللوحة ═══
   بوصلة الشمال وبطاقة المنظور. كلتاهما داخل #stage المعزول بـ
   dir=ltr، فلا يتسرّب اتجاه الواجهة إلى ما يُركَّب على الرسم —
   وهذا ما أعدّته و٠ لهذه اللحظة.

   البوصلة مؤشّرٌ على S.meta.north وناقلٌ إليه: تعرض الزاوية
   وتحرّرها. والسهم المُصدَّر يخرج من sheet.js لأنه رمزٌ على اللوحة
   لا شارةُ شاشة. */
import {S,edit} from "../core/state.js";
import {deg,scl} from "../core/units.js";
import {UIS} from "./store.js";
import "./canvas.js";
import {scene} from "../core/render.js";
import {anyHidden,hiddenCount} from "../core/layers.js";
import {HOOK} from "./bus.js";
import {escapeHtml as esc} from "../core/escape.js";   /* يشترطه a11y/esc-guard وإن لم يُستعمَل الآن */

const $=s=>document.querySelector(s);

/* ═══ البوصلة ═══ */
export function buildCompass(){
 const c=$("#compass");
 if(!c)return 0;
 c.innerHTML=`
<button type="button" id="cmpBtn" title="زاوية الشمال — انقر للتعديل"
 aria-label="زاوية الشمال">
 <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
  <circle cx="24" cy="24" r="20.5" class="cmpR"/>
  <g id="cmpG">
   <path d="M24 5 L30 26 L24 22 L18 26 Z" class="cmpN"/>
   <path d="M24 22 L24 43" class="cmpT"/>
  </g>
  <text x="24" y="47" class="cmpL" text-anchor="middle">ش</text>
 </svg>
</button>
<div id="cmpPop" hidden>
 <div class="pmH">زاوية الشمال</div>
 <div class="cmpRow">
  <input id="cmpIn" type="number" class="num" min="0" max="359.9"
   step="0.5" aria-label="زاوية الشمال بالدرجات"> <span>°</span>
 </div>
 <div class="cmpPre">
  <button type="button" data-cmp="0">0</button>
  <button type="button" data-cmp="90">90</button>
  <button type="button" data-cmp="180">180</button>
  <button type="button" data-cmp="270">270</button>
 </div>
 <p class="hint">تُقاس عكس عقارب الساعة. تُصدَّر سهماً في زاوية
  الإطار حين تكون الورقة ظاهرة.</p>
</div>`;
 return 1;
}
export function syncCompass(){
 const g=$("#cmpG");
 if(g)g.setAttribute("transform",
  `rotate(${-(+S.meta.north||0)} 24 24)`);
 const b=$("#cmpBtn");
 if(b)b.title=`زاوية الشمال ${(+S.meta.north||0).toFixed(1)}° — `
  +`انقر للتعديل`;
 const i=$("#cmpIn");
 if(i&&document.activeElement!==i)
  i.value=String(+S.meta.north||0);
 const c=$("#compass");
 if(c)c.hidden=!!UIS.clean||!UIS.compass;
}
function setNorth(v){
 const a=deg(parseFloat(v)||0);
 edit(()=>{S.meta.north=a});
 syncCompass();
 HOOK.refresh(0);
 HOOK.report("in",`زاوية الشمال ${a.toFixed(1)}°`);
}
/* ═══ بطاقة المنظور ═══
   لا «الطبقة الحالية» فيها: لا مفهومَ لها اليوم — الطبقة تُشتَقّ من
   نوع الكيان، وم٠ يجعلها جدولاً حيّاً فتدخل حينها. */
export function buildVp(){
 const v=$("#vpLabel");
 if(!v)return 0;
 v.innerHTML=`<span class="vpI" id="vpMode" title="فضاء النموذج — `
  +`فضاء الورقة يدخل مع التخطيطات">[النموذج]</span>`
  +`<button type="button" class="vpI" data-act="stScale" `
  +`title="المقياس — انقر لإعداد المشروع"><span id="vpSc" `
  +`class="mono num">[1:100]</span></button>`
  +`<button type="button" class="vpI" data-act="stWarn" id="vpW" `
  +`hidden></button>`;
 return 1;
}
export function syncVp(){
 const box=$("#vpLabel");
 if(!box)return;
 box.hidden=!!UIS.clean||!UIS.vpLabel;
 const sc=$("#vpSc");
 if(sc)sc.textContent=`[${scl(S.meta.scale)}]`;
 const w=$("#vpW");
 if(!w)return;
 let n=0, P=[];
 try{
  const s=scene();
  if(s.bad)P.push(`${s.bad} فتحة معطوبة`);
  if(s.stale)P.push(`${s.stale} منطقة قديمة`);
  if(s.loose)P.push(`${s.loose} بُعداً معلَّقاً`);
  n=s.bad+s.stale+s.loose;
 }catch(e){}
 const hid=anyHidden()?hiddenCount():0;
 if(hid)P.push(`${hid} كياناً مخفيّاً`);
 const tot=n+hid;
 w.hidden=!tot;
 if(!tot)return;
 w.textContent=`[${tot} تنبيه]`;
 w.title=P.join(" · ")+" — انقر للفاحص";
 w.classList.toggle("bad",n>0);
}
export function wireOverlay(){
 buildCompass();
 buildVp();
 const b=$("#cmpBtn"), p=$("#cmpPop");
 if(b&&p){
  b.onclick=e=>{
   e.stopPropagation();
   p.hidden=!p.hidden;
   if(!p.hidden){syncCompass(); const i=$("#cmpIn"); if(i)i.focus()}
  };
  p.addEventListener("click",e=>{
   const q=e.target.closest("[data-cmp]");
   if(q){setNorth(q.dataset.cmp); p.hidden=true}
  });
  p.addEventListener("change",e=>{
   if(e.target.id==="cmpIn")setNorth(e.target.value);
  });
  p.addEventListener("keydown",e=>{
   if(e.key==="Escape"){e.preventDefault(); p.hidden=true;
    b.focus(); return}
   if(e.key==="Enter"&&e.target.id==="cmpIn"){
    e.preventDefault(); setNorth(e.target.value); p.hidden=true;
    return;
   }
   e.stopPropagation();
  });
  addEventListener("mousedown",e=>{
   if(p.hidden)return;
   if(!p.contains(e.target)&&e.target!==b&&!b.contains(e.target))
    p.hidden=true;
  },true);
 }
 syncCompass(); syncVp();
 return true;
}
export const syncOverlay=()=>{syncCompass(); syncVp()};

/* ═══ عملٌ طويل بشريط تقدّم قابل للإلغاء ═══
   يستعمل #log القائم ولا يُنشئ واجهةً جديدة. تُسلَّم العمليةُ إشارةَ
   الإلغاء (AbortSignal) وعلى المستدعي أن يفحصها. والزرّ يُربَط
   بمستمِعٍ لا بـ onclick مضمَّن: CSP يمنع السكربت المضمَّن. */
let abortCtrl=null;

export function withProgress(label,fn){
 if(abortCtrl)
  return Promise.reject(new Error("عمليةٌ أخرى جارية"));
 const ctrl=new AbortController();
 abortCtrl=ctrl;
 const log=document.getElementById("log");
 let row=null;
 if(log){
  row=document.createElement("div");
  row.className="ln in";
  const sp=document.createElement("span");
  sp.textContent=`${String(label)}…`;
  const bt=document.createElement("button");
  bt.type="button"; bt.className="ab"; bt.textContent="إلغاء";
  bt.addEventListener("click",()=>{
   ctrl.abort();
   bt.disabled=true;
  });
  row.appendChild(sp); row.appendChild(bt);
  log.appendChild(row);
 }
 return Promise.resolve()
  .then(()=>fn(ctrl.signal))
  .finally(()=>{
   if(row)row.remove();
   if(abortCtrl===ctrl)abortCtrl=null;
  });
}
export function getSignal(){
 return abortCtrl?abortCtrl.signal:null;
}
