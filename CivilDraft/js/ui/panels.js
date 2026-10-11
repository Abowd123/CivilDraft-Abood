/* ═══ سجلّ اللوحات ═══
   قبله: refresh() تعيد بناء ثماني لوحات مع كل تعديل حقل، ومنها
   لوحاتٌ في أقسامٍ مغلقة لا يراها أحد — جدول الفتحات والمساحات
   والورقة والمرجع تُبنى كلّها لتُخفى.
   بعده: كل لوحة تُعلَن مرّة، ولا تُرسَم إلّا إن كانت مرئيّة.
   والمغلقة تُوسَم «متّسخة» فتُرسَم لحظةَ فتحها.

   وهذا نصف ما يحتاجه الإرساء٢: بقيّته قشرةٌ حول الأجسام
   نفسها، لا تعديلٌ فيها. */
import {secSet,secOpen} from "./store.js";
import {errMsgHtml} from "../core/escape.js";

const REG=new Map();

export function reg(id,sel,render,label){
 REG.set(id,{id,sel,render,label:label||id,dirty:1,n:0});
 return id;
}
export const panelIds=()=>[...REG.keys()];
export const panelSel=id=>{
 const p=REG.get(id);
 return p?p.sel:null;
};
export const markDirty=id=>{
 const p=REG.get(id);
 if(p)p.dirty=1;
};
export const markAllDirty=()=>{REG.forEach(p=>{p.dirty=1})};

/* ═══ الرؤية ═══
   اللوحة قد تسكن عموداً أو نافذةً عائمة أو مرآباً مغلقاً، فلا
   يكفي فحص details.sec: نصعد الأسلاف حتى الجذر.
   نتخطّى offsetParent بقصد — يفرض إعادة تخطيطٍ ويكذب على
   العناصر الثابتة الموضع. */
const shown=el=>{
 if(!el||!el.isConnected)return false;
 for(let n=el;n&&n.nodeType===1;n=n.parentElement){
  if(n.hidden)return false;
  if(n.tagName==="DETAILS"&&n.classList.contains("sec")&&!n.open)
   return false;
 }
 return true;
};
export function visible(id){
 const p=REG.get(id);
 if(!p)return false;
 return shown(document.querySelector(p.sel));
}
/* الرسم يعزل خطأ لوحةٍ عن بقيّتها: عطبٌ في جدولٍ لا يُسقط الخصائص.
   ورسالةُ العطب تُهرَّب (3.5): e.message قد يحوي بيانات مشروع
   (اسم منطقة، نصّ بُعد، معرّف كيان) — وكانت تُدرَج خاماً في
   innerHTML، وهو سطح XSS حقيقيّ. */
export function renderPanel(id,force){
 const p=REG.get(id);
 if(!p)return false;
 const el=document.querySelector(p.sel);
 if(!el)return false;
 if(!force&&!shown(el)){p.dirty=1; return false}
 try{p.render(el); p.dirty=0; p.n++; return true}
 catch(e){
  p.dirty=1;
  el.innerHTML=`<p class="hint warn">تعذّر بناء اللوحة: `
   +`${errMsgHtml(e)}</p>`;
  return false;
 }
}
/* dirtyOnly=1 يرسم المتّسخ المرئيّ وحده */
export function renderVisible(dirtyOnly){
 let n=0;
 REG.forEach(p=>{
  if(dirtyOnly&&!p.dirty)return;
  if(renderPanel(p.id))n++;
 });
 return n;
}
/* ═══ حالة الأقسام ═══
   toggle لا يصعد، فنُنصت في طور الالتقاط على document: اللوحة قد
   تسكن عموداً ثانياً أو نافذةً عائمة، ومستمعٌ مربوطٌ على #side
   يتوقّف صامتاً عند أول نقل. */
let WIRED=false;
export function wirePanels(){
 const D=[...document.querySelectorAll("details.sec[data-sec]")];
 D.forEach(d=>{d.open=secOpen(d.dataset.sec,d.open)});
 if(WIRED)return D.length;
 WIRED=true;
 document.addEventListener("toggle",e=>{
  const d=e.target;
  if(!d.dataset||!d.dataset.sec)return;
  if(!d.classList||!d.classList.contains("sec"))return;
  secSet(d.dataset.sec,d.open);
  if(d.open)renderVisible(1);
 },true);
 return D.length;
}
export const stats=()=>[...REG.values()]
 .map(p=>({id:p.id,dirty:p.dirty,n:p.n,vis:visible(p.id)}));
