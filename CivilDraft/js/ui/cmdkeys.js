/* ═══ مفاتيحُ الكتابة تحت سطر الأوامر ═══
   ما تعلّمناه من صنع الفيديوهات: الطالبُ يتعلّم أسرع حين يرى **ما يكتبه**
   لا أين ينقر. فتحت سطر الأوامر صفٌّ صغير يقول ما يقبله هذا السطر الآن:
   حروفُ الخطوة (C يغلق · U يتراجع)، ومفاتيحُ خيارات الأداة (t= · type=)،
   وEnter وEsc. ونقرةُ المفتاح تكتبه في السطر فلا يُحفَظ شيء.
   keysFor خالصةٌ ومختبَرة (cmdkeys.test.js)، وrenderKeys تقارن ولا تبني. */
import {escapeHtml as esc} from "../core/escape.js";

export const KEYS_MAX_OPTS=4;
/* def: تعريف الأداة الفعّالة · step: الخطوة الجارية · ov(k): قيمة الخيار الآن */
export function keysFor(def,step,ov){
 if(!def)return [];
 const out=[];
 const so=(step&&step.opts)||{};
 Object.keys(so).forEach(k=>{
  const o=so[k], n=(o&&typeof o==="object")?(o.n||k):String(o||k);
  out.push({k:k.toUpperCase(),ins:k,n,kind:"step"});
 });
 (def.opts||[]).slice(0,KEYS_MAX_OPTS).forEach(f=>{
  let v=ov?ov(f.k):undefined;
  if(v==null)v=f.def;
  out.push({k:`${f.k}=`,ins:`${f.k}=`,n:f.label||f.k,
   v:(v==null||v==="")?"":String(v),kind:"opt"});
 });
 out.push({k:"Enter",n:"إنهاء",kind:"key"},{k:"Esc",n:"خروج",kind:"key"});
 return out;
}
const sigOf=L=>L.map(x=>x.k+"|"+(x.v||"")).join(",");
let SIG="";
export function renderKeys(box,L){
 if(!box)return false;
 const s=sigOf(L);
 if(s===SIG&&box.childElementCount===L.length)return false;
 SIG=s;
 box.hidden=!L.length;
 box.innerHTML=L.map(x=>x.kind==="key"
  ?`<span class="ck key"><kbd>${esc(x.k)}</kbd>${esc(x.n)}</span>`
  :`<button type="button" class="ck ${x.kind}" data-ins="${esc(x.ins)}"`
   +` title="${esc(x.kind==="opt"?`اكتب ${x.k}… في سطر الأوامر · الآن ${x.v||"—"}`:x.n)}">`
   +`<kbd>${esc(x.k)}</kbd>${esc(x.n)}</button>`).join("");
 return true;
}
export const resetKeys=()=>{SIG=""};
