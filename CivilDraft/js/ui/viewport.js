/* ═══ viewport.js — ثبات الواجهة على الهاتف ═══
   1) ResizeObserver على #stage: لوحة الرسم تتبع حجم حاويتها مهما كان سبب
      تغيّره (فتح/إغلاق عمود، طيّ الشريط، لوحة المفاتيح) لا حدث النافذة وحده
      — كان هذا يترك مساحةً سوداء بجوار الرسم.
   2) «موقع سطح المكتب» على الهاتف: المتصفّح يمنح الصفحة ~980px فلا تعمل
      قواعد max-width:768. نضع الفئة dsk-on-phone على <html> لتتولّاها CSS. */
import {resize} from "./canvas.js";
import {keepObserver} from "../core/delegate.js";

function isDesktopSiteOnPhone(){
 const coarse=matchMedia("(pointer:coarse)").matches;
 const sw=Math.min(screen.width||9999,screen.height||9999);
 return coarse&&sw<=600&&innerWidth>768;
}
function sync(){
 document.documentElement.classList.toggle("dsk-on-phone",isDesktopSiteOnPhone());
}
export function initViewport(){
 sync();
 addEventListener("resize",sync);
 addEventListener("orientationchange",()=>setTimeout(()=>{sync();resize()},200));
 const st=document.getElementById("stage");
 if(st&&typeof ResizeObserver!=="undefined"){
  let raf=0;
  keepObserver("stage",new ResizeObserver(()=>{        /* P2-013 */
   if(raf)return;
   raf=requestAnimationFrame(()=>{raf=0; resize()});
  })).observe(st);
 }
 if(window.visualViewport)
  visualViewport.addEventListener("resize",()=>resize());
}
