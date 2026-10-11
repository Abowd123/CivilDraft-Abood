/* ═══ نافذة «عن CivilDraft» ═══
   شعارٌ + رقمُ الإصدار (من js/core/version.js — المصدرُ الواحد) + باب
   «تواصل مع المطوّر» وزرُّ واتساب يفتح محادثةً برسالةٍ جاهزة.
   لا style مضمَّن ولا onclick (CSP) — الأنماطُ في css/about.css وكلُّ
   ربطٍ addEventListener. الحصرُ والعودةُ والـEscape من focustrap.js. */
import {VERSION} from "../core/version.js";
import {escapeHtml as esc} from "../core/escape.js";
import {trapFocus} from "./focustrap.js";
import {installApp,isStandalone,onInstallChange} from "./install.js";

export const DEV_WA="967779355671";            /* بلا + ولا مسافات (صيغة wa.me) */
export const DEV_WA_SHOW="+967 779 355 671";

export function waLink(){
 const msg=`السلام عليكم، أتواصل معك بخصوص CivilDraft (الإصدار ${VERSION})`;
 return `https://wa.me/${DEV_WA}?text=${encodeURIComponent(msg)}`;
}

const WA_ICO=`<svg class="abt-waI" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`;

const INST_ICO=`<svg class="abt-instI" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><path d="M12 6.5v5M9.6 9.4 12 11.8l2.4-2.4"/></svg>`;

let back=null, release=null, unsub=null;

export function closeAbout(){
 if(unsub){try{unsub()}catch(e){} unsub=null}
 if(release){try{release()}catch(e){} release=null}
 if(back){back.remove(); back=null}
}
export const aboutIsOpen=()=>!!back;

export function openAbout(){
 closeAbout();
 back=document.createElement("div");
 back.className="abt-back";
 back.setAttribute("dir","rtl");
 back.innerHTML=`
<div class="abt" role="dialog" aria-modal="true" aria-labelledby="abtTitle">
 <button type="button" class="abt-x" data-abt="close" aria-label="إغلاق">×</button>
 <div class="abt-hero">
  <div class="abt-logo"><img src="favicon.svg" alt="" width="96" height="96"></div>
  <h2 id="abtTitle" class="abt-name">CivilDraft</h2>
  <p class="abt-sub">مرسمة مخطّطات معمارية عربية تعمل في المتصفّح</p>
  <span class="abt-ver mono" dir="ltr">v${esc(VERSION)}</span>
  <div class="abt-chips">
   <span>عربي بالكامل</span><span>بلا اعتماديات</span><span>يعمل بلا إنترنت</span>
  </div>
 </div>
 <div class="abt-body">
  <h3 class="abt-h">تواصل مع المطوّر</h3>
  <p class="abt-p">لأي ملاحظة أو اقتراح أو مشكلة صادفتك — راسلني مباشرةً وسأرد عليك.</p>
  ${isStandalone()?"":`<button type="button" class="abt-inst" id="abtInst">${INST_ICO}<span>ثبّت التطبيق على الحاسوب</span></button>`}
  <a class="abt-wa" id="abtWa" href="${esc(waLink())}" target="_blank" rel="noopener noreferrer">
   ${WA_ICO}<span>تواصل عبر واتساب</span>
  </a>
  <div class="abt-num mono" dir="ltr">${esc(DEV_WA_SHOW)}</div>
 </div>
</div>`;
 back.addEventListener("click",e=>{
  if(e.target===back||(e.target.closest&&e.target.closest("[data-abt=close]")))
   closeAbout();
 });
 document.body.appendChild(back);
 release=trapFocus(back,{onEsc:closeAbout});
 const ib=back.querySelector("#abtInst");
 if(ib){
  ib.addEventListener("click",()=>{
   installApp().then(r=>{if(r==="accepted"){closeAbout()}});
  });
  unsub=onInstallChange(()=>{if(back&&isStandalone())ib.remove()});
 }
 const w=back.querySelector("#abtWa");
 if(w&&w.focus)try{w.focus()}catch(e){}
 return back;
}

/* شارةُ الإصدار في شريط الحالة تفتح هذه النافذة. الربطُ هنا لا في app.js:
   app.js لا يُركِّب معالجَ keydown بنفسه (حرسُ D12-EP7). */
export function wireVersionBadge(el){
 if(!el||el.dataset.abt==="1")return;
 el.dataset.abt="1";
 el.setAttribute("role","button");
 el.setAttribute("tabindex","0");
 el.addEventListener("click",openAbout);
 el.addEventListener("keydown",e=>{
  if(e.key==="Enter"||e.key===" "){e.preventDefault(); openAbout()}
 });
}
