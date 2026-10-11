/* ═══ الإدخال الحركي ═══
   حقولٌ عند المؤشّر تُظهر الطول والزاوية وتقبلهما. ولا مُحلِّل ثانٍ:
   ما تكتبه يُركَّب سلسلةً بصيغة سطر الإدخال نفسها ويمرّ بـ
   feedText — فالمعنى واحد في الموضعين، ولا تتفرّق قراءةُ «5» عن
   قراءتها هناك.

   وTab يقفل الحقل: الطول يُقيّد المؤشّر على مسافةٍ ثابتة، والزاوية
   على اتجاهٍ ثابت. القفل مساعدةُ إدخال لا تعديل — يزول بوقوع
   النقطة كما يزول قفل الزاوية القائم. */
import {S} from "../core/state.js";
import {Mx,m3,deg,clamp} from "../core/units.js";
import {angOf,lenOf} from "../core/coords.js";
import * as R from "../tools/registry.js";
import {V,W2S,draw} from "./canvas.js";
import {UIS} from "./store.js";
import {HOOK} from "./bus.js";
import {jrAdd} from "../core/journal.js";
import {escapeHtml as esc} from "../core/escape.js";

const $=s=>document.querySelector(s);

let SIG=null, IDX=0, EDIT=[0,0];
export const dynOn=()=>!!+S.rb.dyn;

/* ═══ أي حقولٍ تليق بالخطوة الجارية ═══
   الكيان والنصّ والتأكيد لا تقبل إحداثياً، فلا حقولَ لها. */
function fieldsOf(st){
 if(!st||st.ent||st.text||st.confirm)return null;
 if(st.ang)return [{k:"a",n:"الزاوية",u:"°"}];
 return R.baseOf()
  ? [{k:"L",n:"الطول",u:"م"},{k:"a",n:"الزاوية",u:"°"}]
  : [{k:"x",n:"س",u:"م"},{k:"y",n:"ص",u:"م"}];
}
function build(F,sig){
 const box=$("#dynBox");
 box.innerHTML=F.map((f,i)=>
  `<span class="dF"><label for="dyn${i}">${esc(f.n)}</label>`
  +`<input id="dyn${i}" class="num" type="text" data-df="${i}"`
  +` spellcheck="false" autocomplete="off" inputmode="decimal">`
  +`<span class="du">${esc(f.u)}</span></span>`).join("")
 +`<span class="dK" hidden>⟨مقفل⟩</span>`;
 SIG=sig; IDX=0; EDIT=F.map(()=>0);
}
const inp=i=>$(`#dynBox [data-df="${i}"]`);

function place(g){
 const box=$("#dynBox");
 const s=W2S(g[0],g[1]);
 const w=box.offsetWidth||190, h=box.offsetHeight||30;
 const x=clamp(s[0]+18,2,Math.max(2,V.w-w-4));
 const y=clamp(s[1]+14,2,Math.max(2,V.h-h-4));
 box.style.transform=`translate(${Math.round(x)}px,`
  +`${Math.round(y)}px)`;
}
function fill(F,g){
 const b=R.baseOf();
 F.forEach((f,i)=>{
  const el=inp(i);
  if(!el||el===document.activeElement||EDIT[i])return;
  let v="";
  if(f.k==="L")v=b?((lenOf(b,g)/1000).toFixed(3)):"";
  else if(f.k==="a")v=b?(angOf(b,g).toFixed(1)):"";
  else if(f.k==="x")v=(g[0]/1000).toFixed(3);
  else if(f.k==="y")v=(g[1]/1000).toFixed(3);
  if(el.value!==v)el.value=v;
 });
 const kk=$("#dynBox .dK");
 if(kk){
  const L=(R.T.lenLock!=null), A=(R.T.lock!=null);
  kk.hidden=!(L||A);
  if(!kk.hidden)kk.textContent="⟨"
   +(L?`طول ${m3(R.T.lenLock)}`:"")+(L&&A?" · ":"")
   +(A?`زاوية ${R.T.lock}°`:"")+"⟩";
 }
}
export function hideDyn(){
 const box=$("#dynBox");
 if(box&&!box.hidden){
  box.hidden=true;
  EDIT=EDIT.map(()=>0);
 }
}
/* تُنادى من syncPrompt مع كل حركة مؤشّر — تُقارِن ولا تبني */
export function syncDyn(){
 const box=$("#dynBox");
 if(!box)return;
 if(!dynOn()||!R.active()||UIS.clean){hideDyn(); return}
 const F=fieldsOf(R.step());
 const g=R.T.ghost;
 if(!F||!g){hideDyn(); return}
 const sig=F.map(f=>f.k).join(",");
 /* القياس بعد الإظهار: المخفيّ عرضه صفر */
 if(sig!==SIG)build(F,sig);
 box.hidden=false;
 place(g);
 fill(F,g);
}
/* ═══ التركيب والتغذية ═══ */
const val=i=>{
 const el=inp(i);
 return el?String(el.value||"").trim():"";
};
function compose(F){
 if(F.length===1&&F[0].k==="a")return val(0);
 if(F[0].k==="x"){
  const x=val(0), y=val(1);
  if(!x&&!y)return "";
  return `${x||"0"},${y||"0"}`;
 }
 const L=val(0), a=val(1);
 if(L&&a)return `@${L}<${a}`;
 if(L)return L;                 /* الطول على الاتجاه الجاري */
 if(a)return `<${a}`;           /* قفل زاوية */
 return "";
}
function commit(){
 const F=fieldsOf(R.step());
 if(!F)return false;
 const s=compose(F);
 /* السجلّ: القيمة نفسها التي تُركَّب وتُغذَّى — لا سطر إدخالٍ
    منفصل يمرّ بها، فبلا هذا النداء كان الإدخال الحركيّ كلُّه
    شائبةً صامتة (يعمل، لكن لا يُسجَّل ولا يُصدَّر). */
 if(!s){jrAdd("enter"); R.enter(); return true}
 R.lockLen(null);
 R.T.lock=null;
 EDIT=EDIT.map(()=>0);
 jrAdd(s);
 R.feedText(s);
 HOOK.prompt(); draw();
 return true;
}
function lockField(i){
 const F=fieldsOf(R.step());
 if(!F||!F[i])return;
 const v=val(i);
 if(!v)return;
 if(F[i].k==="L"){
  /* ═══ D6-09 ═══ M المتساهلة تُعيد 0 لنصٍّ فاسد، وlockLen يحصر
     الأدنى في 1 — فقفلٌ بطول 1مم يمرّ صامتاً. استعمل Mx الصارمة:
     null نصٌّ فاسد فلا قفل، وأبلِغ بدل الصمت. */
  const mm=Mx(v);
  if(mm==null){HOOK.report("wr",`«${v}» دي مش طول مفهوم — اكتب رقم واضح`); return}
  R.lockLen(mm);
 }
 else if(F[i].k==="a")R.lockAng(deg(parseFloat(v)||0));
}
function clearAll(){
 const F=fieldsOf(R.step())||[];
 F.forEach((f,i)=>{const el=inp(i); if(el)el.value=""});
 EDIT=EDIT.map(()=>0);
 R.lockLen(null);
 R.lockAng(null);
}
/* ═══ التوجيه ═══
   الأرقام إلى هنا، والحروف وصيغُ @ و < إلى سطر الإدخال — قاعدةٌ
   واحدة تُفسَّر: هذه حقولُ قيَمٍ، وذاك سطرُ صيَغٍ وأسماء أدوات. */
export function dynRoute(ch){
 if(!dynOn()||!R.active())return false;
 const box=$("#dynBox");
 if(!box||box.hidden)return false;
 if(!/^[0-9.\-٠-٩۰-۹]$/.test(ch))return false;
 const el=inp(IDX)||inp(0);
 if(!el)return false;
 el.focus();
 el.value=ch;
 EDIT[IDX]=1;
 try{el.setSelectionRange(ch.length,ch.length)}catch(e){}
 return true;
}
export function wireDyn(){
 const box=$("#dynBox");
 if(!box)return false;
 box.addEventListener("input",e=>{
  const i=+e.target.dataset.df;
  if(isFinite(i))EDIT[i]=e.target.value?1:0;
 });
 box.addEventListener("keydown",e=>{
  const i=+e.target.dataset.df;
  const F=fieldsOf(R.step())||[];
  if(e.key==="Enter"){
   e.preventDefault(); e.stopPropagation();
   commit();
   return;
  }
  if(e.key==="Tab"){
   e.preventDefault(); e.stopPropagation();
   if(F.length<2)return;
   if(!e.shiftKey)lockField(i);
   const j=(i+(e.shiftKey?-1:1)+F.length)%F.length;
   IDX=j;
   const n=inp(j);
   if(n){n.focus(); n.select()}
   return;
  }
  if(e.key==="Escape"){
   e.stopPropagation();
   const dirty=val(0)||val(1)||R.T.lock!=null||R.T.lenLock!=null;
   if(dirty){
    e.preventDefault();
    clearAll();
    HOOK.prompt(); draw();
    return;
   }
   /* نظيفٌ ⇒ نُسلّم للمعالج العامّ ليلغي الأداة */
   const cv=document.getElementById("cv");
   if(cv)cv.focus();
   return;
  }
  if(e.key==="ArrowUp"||e.key==="ArrowDown")return;
  e.stopPropagation();
 });
 box.addEventListener("focusin",e=>{
  const i=+e.target.dataset.df;
  if(isFinite(i))IDX=i;
 });
 return true;
}
