/* ═══ قشرة الإرساء ═══
   قاعدةٌ واحدة تحكم الملفّ كلّه: العُقَد تُنقَل ولا تُعاد بناءً.
   appendChild ينقل العنصر بمستمعيه وقيَم حقوله وموضع تمريره،
   فلوحةٌ تنتقل من عمودٍ إلى نافذةٍ عائمة تحفظ كل ذلك. ولذلك
   انتقل تفويض props.js إلى document: لوحةٌ خارج #side لا يصلها
   مستمعٌ مربوطٌ عليه.

   ولا حالةَ موازية: الموضع في UIS.layout، والانفتاح في نفس
   المكان (secSet في store.js تكتب فيه)، والمرسوم يُقرأ من DOM.
   فلا يفترق ما تراه عمّا يُحفَظ. */
import {PANELS,ZONES,ZN,MODES,WMIN,WMAX,WS,DEFLAY,normLay,
        wsNorm,pDef,pIds,isPanel} from "./layout.js";
import {UIS,saveUI} from "./store.js";
import {keepObserver} from "../core/delegate.js";
import {icon} from "./icons.js";
import {renderVisible,markDirty} from "./panels.js";
import {HOOK} from "./bus.js";
import {escapeHtml as esc} from "../core/escape.js";

const $=s=>document.querySelector(s);
const ic=(n,s)=>UIS.icons?icon(n,s||14):"";
const rtl=()=>getComputedStyle(document.documentElement)
 .direction==="rtl";
const clamp=(v,a,b)=>v<a?a:(v>b?b:v);

let L=null;                    /* مرجعٌ إلى UIS.layout */
const TITLE={};                /* المعرّف ⇒ التسمية · تُقرأ من DOM */
const save=()=>saveUI();

export const zoneEl=z=>$(z==="s"?"#side":"#sideE");
export const stripEl=z=>$(z==="s"?"#stripS":"#stripE");
export const secEl=id=>document.querySelector(
 `details.sec[data-sec="${id}"]`);
export const fltEl=id=>document.querySelector(`.flt[data-flt="${id}"]`);
export const zoneOf=id=>(L&&L.p[id])?L.p[id].z:null;
export const titleOf=id=>TITLE[id]||id;
export const layout=()=>L;

/* الترتيب من DOM لا من الرقم — المرسوم هو المرجع.
   ‏.sec بلا data-sec ليست لوحة: النقصُ لا يجوز أن يُدخِل undefined
   في القائمة فيرمي لاحقاً في buildTabs أو pDef(null). */
export function order(z){
 const el=zoneEl(z);
 if(!el)return [];
 return [...el.querySelectorAll(":scope > details.sec")]
  .map(d=>d.dataset.sec).filter(isPanel);
}
function reindex(){
 ZONES.forEach(z=>order(z).forEach((id,i)=>{
  if(L.p[id])L.p[id].i=i;
 }));
}
/* ═══ الحصاد ═══
   يُنادى مرّةً بعد buildSide: يقرأ التسميات، ويحقن أدوات الترويسة،
   ويُودِع الجميع في المرآب ثم يوزّعهم بالتخطيط. */
function harvest(){
 const src=$("#side");
 if(!src)return 0;
 const park=$("#pPark");
 let n=0;
 PANELS.forEach(p=>{
  const d=secEl(p.id);
  if(!d)return;
  const sum=d.querySelector(":scope > summary");
  if(sum&&!sum.dataset.wired){
   TITLE[p.id]=sum.textContent.trim();
   sum.dataset.wired="1";
   sum.insertAdjacentHTML("beforeend",
    `<span class="pT">`
    +`<button type="button" class="pB" data-pm="${esc(p.id)}"`
    +` title="خيارات اللوحة" aria-label="خيارات ${esc(TITLE[p.id])}"`
    +`>⋮</button>`
    +`<button type="button" class="pB pX" data-pc="${esc(p.id)}"`
    +` title="إغلاق اللوحة" aria-label="إغلاق ${esc(TITLE[p.id])}"`
    +`>✕</button></span>`);
  }
  park.appendChild(d);
  n++;
 });
 return n;
}
/* ═══ التوزيع ═══ */
function applyLayout(){
 const park=$("#pPark"), fl=$("#floats");
 /* بالترتيب المخزَّن لا بترتيب الإعلان */
 const byZ={s:[],e:[],f:[],x:[]};
 PANELS.forEach(p=>{
  const st=L.p[p.id];
  (byZ[st.z]||byZ.x).push(p.id);
 });
 ZONES.forEach(z=>{
  byZ[z].sort((a,b)=>L.p[a].i-L.p[b].i);
  const host=zoneEl(z);
  byZ[z].forEach(id=>{
   const d=secEl(id);
   if(d)host.appendChild(d);
  });
 });
 byZ.f.forEach(id=>mkFloat(id));
 byZ.x.forEach(id=>{
  const d=secEl(id);
  if(d)park.appendChild(d);
 });
 PANELS.forEach(p=>{
  const d=secEl(p.id);
  if(d)d.open=!!L.p[p.id].o;
 });
 syncZones();
}
/* ═══ النوافذ العائمة ═══ */
function mkFloat(id){
 const d=secEl(id);
 if(!d)return null;
 let f=fltEl(id);
 if(!f){
  f=document.createElement("div");
  f.className="flt";
  f.dataset.flt=id;
  $("#floats").appendChild(f);
 }
 f.appendChild(d);
 d.open=true;                  /* العائمة لا تُطوى — تُغلَق */
 placeFloat(id);
 return f;
}
function placeFloat(id){
 const f=fltEl(id), st=L.p[id];
 if(!f||!st)return;
 f.classList.toggle("max",!!st.max);
 if(st.max){f.style.inlineSize="";f.style.blockSize="";return}
 const W=innerWidth, H=innerHeight;
 st.w=clamp(st.w,220,Math.max(240,W-40));
 st.h=clamp(st.h,120,Math.max(160,H-60));
 /* موضعٌ افتراضيٌّ لم يُحرَّك بعد (120،110) يطفو في المنتصف:
    نُلصقه بالحافة اليسرى الفعلية، مقابل العمود الرئيس */
 if(st.x===120&&st.y===110){
  st.x=rtl()?Math.max(0,W-st.w-8):8;
  st.y=60;
 }
 st.x=clamp(st.x,-st.w+80,Math.max(0,W-80));
 st.y=clamp(st.y,0,Math.max(0,H-60));
 f.style.insetInlineStart=st.x+"px";
 f.style.insetBlockStart=st.y+"px";
 f.style.inlineSize=st.w+"px";
 f.style.blockSize=st.h+"px";
}
export function toFront(id){
 const f=fltEl(id);
 if(!f)return;
 $("#floats").appendChild(f);
}
/* ═══ النقل ═══ */
export function dockTo(id,z,before){
 if(!isPanel(id)||!ZONES.includes(z))return false;
 const d=secEl(id);
 if(!d)return false;
 const f=fltEl(id);
 const host=zoneEl(z);
 if(before&&before.parentElement===host)host.insertBefore(d,before);
 else host.appendChild(d);
 if(f)f.remove();
 L.p[id].z=z; L.p[id].max=0;
 reindex(); syncZones(); save();
 markDirty(id); renderVisible(1);
 return true;
}
export function toFloat(id,x,y){
 if(!isPanel(id))return false;
 const d=secEl(id);
 if(!d)return false;
 const st=L.p[id];
 if(x!=null){st.x=Math.round(x); st.y=Math.round(y)}
 else{
  const r=d.getBoundingClientRect();
  if(r.width>8){
   st.x=Math.round(rtl()?(innerWidth-r.right):r.left);
   st.y=Math.round(r.top);
   st.w=Math.round(clamp(r.width,240,720));
  }else{
   /* اللوحة مركونة (غير ظاهرة): تُفتح عند الحافة اليسرى الفعلية */
   st.x=rtl()?Math.max(0,innerWidth-st.w-8):8;
   st.y=60;
  }
 }
 st.z="f"; st.o=1;
 mkFloat(id);
 reindex(); syncZones(); save();
 markDirty(id); renderVisible(1);
 return true;
}
export function closePanel(id){
 if(!isPanel(id))return false;
 const d=secEl(id);
 if(!d)return false;
 const f=fltEl(id);
 $("#pPark").appendChild(d);
 if(f)f.remove();
 L.p[id].z="x";
 reindex(); syncZones(); save();
 HOOK.report("in",`قفلنا لوحة «${titleOf(id)}» — تحب ترجّعها؟ `
  +`من عرض ← لوحات`);
 return true;
}
export function openPanel(id,z){
 if(!isPanel(id))return false;
 const st=L.p[id];
 if(st.z==="x")return dockTo(id,z||pDef(id).z||"s");
 if(st.z==="f"){toFront(id); return true}
 return true;
}
export function movePanel(id,dir){
 const st=L.p[id];
 if(!st||st.z==="f"||st.z==="x")return false;
 const host=zoneEl(st.z);
 const d=secEl(id);
 const sib=(dir<0)?d.previousElementSibling:d.nextElementSibling;
 const tgt=(sib&&sib.matches("details.sec"))?sib:null;
 if(!tgt)return false;
 if(dir<0)host.insertBefore(d,tgt);
 else host.insertBefore(tgt,d);
 reindex(); syncZones(); save();
 return true;
}
export function setOpen(id,v){
 const d=secEl(id);
 if(!d)return false;
 d.open=!!v;                   /* toggle يُنصَت في panels.js فيُرسَم */
 return true;
}
/* ═══ العمود: الوضع · العرض · الإخفاء التلقائي ═══ */
export function setMode(z,m){
 if(!MODES[m])return false;
 L.mode[z]=m;
 if(m==="tab"&&!order(z).includes(L.cur[z]))L.cur[z]=order(z)[0]||null;
 syncZones(); save();
 renderVisible(1);
 HOOK.report("in",`${ZN[z]}: ${MODES[m]}`);
 return true;
}
export function setZoneW(z,w){
 L.zw[z]=Math.round(clamp(w,WMIN,WMAX));
 const el=zoneEl(z);
 if(el)el.style.inlineSize=L.zw[z]+"px";
 dispatchEvent(new Event("resize"));
 return L.zw[z];
}
export function setAuto(z,v){
 L.auto[z]=v?1:0;
 if(!L.auto[z])unpeek();
 syncZones(); save();
 HOOK.report("in",`${ZN[z]}: ${L.auto[z]
  ?"إخفاء تلقائي — انقر شارته لتنكشف":"مثبَّت"}`);
 return L.auto[z];
}
let PEEK=null;
export function peek(z,id){
 unpeek();
 const el=zoneEl(z);
 if(!el)return;
 PEEK=z;
 el.classList.add("peek");
 el.hidden=false;
 if(L.mode[z]==="tab"&&id)L.cur[z]=id;
 else if(id)setOpen(id,1);
 syncZones();
 renderVisible(1);
}
export function unpeek(){
 if(!PEEK)return;
 const el=zoneEl(PEEK);
 if(el)el.classList.remove("peek");
 PEEK=null;
 syncZones();
}
export const peeking=()=>PEEK;

/* ═══ المزامنة ═══ حالة الأعمدة والشارات والتبويبات ═══ */
export function syncZones(){
 ZONES.forEach(z=>{
  const el=zoneEl(z), st=stripEl(z);
  const ids=order(z);
  const has=ids.length>0;
  const auto=!!L.auto[z]&&has;
  el.dataset.mode=L.mode[z];
  el.classList.toggle("auto",auto);
  el.hidden=!has||(auto&&PEEK!==z)||!!UIS.clean;
  el.style.inlineSize=L.zw[z]+"px";
  const rs=document.querySelector(`.dsz[data-rsz="${z}"]`);
  if(rs)rs.hidden=el.hidden;
  if(st){st.hidden=!auto||!!UIS.clean; if(auto)buildStrip(z,ids)}
  if(L.mode[z]==="tab"){
   if(!ids.includes(L.cur[z]))L.cur[z]=ids[0]||null;
   buildTabs(z,ids);
  }else{
   const t=el.querySelector(":scope > .zTabs");
   if(t)t.remove();
  }
  ids.forEach(id=>{
   const d=secEl(id);
   if(!d)return;
   const tabMode=(L.mode[z]==="tab");
   d.classList.toggle("inTab",tabMode);
   d.hidden=tabMode&&(id!==L.cur[z]);
   if(tabMode&&id===L.cur[z])d.open=true;
  });
 });
 const fl=$("#floats");
 if(fl)fl.hidden=!!UIS.clean;
}
function buildTabs(z,ids){
 const el=zoneEl(z);
 let t=el.querySelector(":scope > .zTabs");
 if(!t){
  t=document.createElement("div");
  t.className="zTabs";
  t.setAttribute("role","tablist");
  t.dataset.zone=z;
  el.insertBefore(t,el.firstChild);
 }
 t.innerHTML=ids.map(id=>
  `<button type="button" role="tab" data-ztab="${esc(id)}"`
  +` data-zone="${esc(z)}" aria-selected="${id===L.cur[z]}"`
  +` tabindex="${id===L.cur[z]?0:-1}"`
  +` class="${id===L.cur[z]?"on":""}" title="${esc(titleOf(id))}">`
  +`${ic(pDef(id).ico,14)}<span>${esc(titleOf(id))}</span>`
  +`</button>`).join("");
}
function buildStrip(z,ids){
 const st=stripEl(z);
 st.innerHTML=ids.map(id=>
  `<button type="button" data-peek="${esc(id)}"`
  +` data-zone="${esc(z)}" title="${esc(titleOf(id))}">`
  +`${ic(pDef(id).ico,14)}<span>${esc(titleOf(id))}</span>`
  +`</button>`).join("");
}
/* ═══ الإظهار ═══ يستعمله الشريط بدلاً من فتح القسم مباشرةً ═══ */
export function revealPanel(id){
 if(!isPanel(id))return null;
 if(UIS.clean)HOOK.clean(0);      /* الخروج كاملٌ لا نصفه */
 const st=L.p[id];
 if(st.z==="x")dockTo(id,pDef(id).z||"s");
 const z=L.p[id].z;
 if(z==="f"){
  toFront(id);
  setOpen(id,1);
  renderVisible(1);
  return secEl(id);
 }
 if(L.auto[z]&&PEEK!==z)peek(z,id);
 if(L.mode[z]==="tab"){L.cur[z]=id; syncZones()}
 else setOpen(id,1);
 renderVisible(1);
 const d=secEl(id);
 if(d)d.scrollIntoView({block:"nearest",behavior:"smooth"});
 save();
 return d;
}
/* مزامنةُ الأعمدة مع علَمٍ يملكه غيرُها — لا كتابةَ للعلَم هنا */
export function dockClean(){ syncZones() }
/* ═══ قائمة اللوحة ═══ أوامرٌ صريحة لا سحبٌ يُخمَّن ═══ */
function pmHtml(id){
 const st=L.p[id], z=st.z;
 const R=[];
 const it=(a,n,i,dis)=>R.push(
  `<button type="button" class="pmI" data-pma="${a}"`
  +`${dis?" disabled":""}>${ic(i)}<span>${esc(n)}</span></button>`);
 ZONES.forEach(k=>it("dock:"+k,"أرسِ في "+ZN[k],
  k==="s"?"dockS":"dockE",z===k));
 it("float","نافذة عائمة","float",z==="f");
 if(z==="f")it("max",st.max?"أعِد الحجم":"كبّر","maxi");
 if(z!=="f"&&z!=="x"){
  R.push(`<div class="pmS"></div>`);
  it("up","إلى الأعلى","up",!secEl(id).previousElementSibling
   ||!secEl(id).previousElementSibling.matches("details.sec"));
  it("down","إلى الأسفل","down",!secEl(id).nextElementSibling);
  R.push(`<div class="pmS"></div>`);
  it("mode","وضع العمود: "
   +MODES[L.mode[z]==="acc"?"tab":"acc"],
   L.mode[z]==="acc"?"tabs":"acc");
  it("auto",L.auto[z]?"ثبّت العمود":"إخفاء تلقائي للعمود","autohide");
 }
 R.push(`<div class="pmS"></div>`);
 it("close","إغلاق اللوحة","close");
 return R.join("");
}
export function pmOpen(id,x,y){
 const m=$("#pMenu");
 if(!m)return;
 m.dataset.for=id;
 m.innerHTML=`<div class="pmH">${esc(titleOf(id))}</div>`+pmHtml(id);
 m.hidden=false;
 const w=m.offsetWidth||220, h=m.offsetHeight||240;
 m.style.insetInlineStart=Math.round(
  clamp(rtl()?(innerWidth-x-4):(x-w+4),4,innerWidth-w-4))+"px";
 m.style.insetBlockStart=Math.round(
  clamp(y+4,4,innerHeight-h-8))+"px";
 const f=m.querySelector(".pmI:not([disabled])");
 if(f)f.focus();
}
export const pmClose=()=>{
 const m=$("#pMenu");
 if(m&&!m.hidden){m.hidden=true; m.dataset.for=""}
};
function pmRun(id,a){
 pmClose();
 if(a==="close")return closePanel(id);
 if(a==="float")return toFloat(id);
 if(a==="up")return movePanel(id,-1);
 if(a==="down")return movePanel(id,1);
 if(a==="max"){
  L.p[id].max=L.p[id].max?0:1;
  placeFloat(id); save();
  return true;
 }
 const d=/^dock:(s|e)$/.exec(a);
 if(d)return dockTo(id,d[1]);
 const z=L.p[id].z;
 if(a==="mode")return setMode(z,L.mode[z]==="acc"?"tab":"acc");
 if(a==="auto")return setAuto(z,!L.auto[z]);
 return false;
}
/* ═══ أسطح العمل ═══ */
export const wsAll=()=>{
 const o={};
 Object.keys(WS).forEach(k=>{o[k]={...WS[k],built:1}});
 Object.keys(UIS.ws||{}).forEach(k=>{
  const w=wsNorm(UIS.ws[k]);
  if(w)o[k]={...w,built:0};
 });
 return o;
};
export function wsApply(key,quiet){
 const A=wsAll(), w=A[key];
 if(!w){HOOK.report("wr",`مافيش سطح عمل اسمه «${key}»`); return false}
 ZONES.forEach(z=>{
  L.zw[z]=clamp(+((w.zw||{})[z])||DEFLAY().zw[z],WMIN,WMAX);
  L.mode[z]=MODES[(w.mode||{})[z]]?w.mode[z]:"tab";
  L.auto[z]=((w.auto||{})[z])?1:0;
  /* ═══ المرحلة ٥ ═══ كان هذا يُصفِّر الجاريةَ دائماً، فسطحُ عملٍ
     بوضعِ تبويباتٍ يفتح على ما يُصادِفه `syncZones` أوّلاً — أي على
     ترتيبِ القائمةِ لا على قصدِ السطح. والآن السطحُ **يُعلِن** لوحتَه
     (`def`)، وما لم يُعلِن يبقى على المداواةِ القديمةِ بأوّلِ لوحة. */
  const d=(w.def||{})[z];
  L.cur[z]=((w[z]||[]).includes(d))?d:null;
 });
 const open=new Set(w.open||[]);
 PANELS.forEach(p=>{L.p[p.id].z="x"; L.p[p.id].max=0});
 ZONES.forEach(z=>(w[z]||[]).forEach((id,i)=>{
  if(!L.p[id])return;
  L.p[id].z=z; L.p[id].i=i; L.p[id].o=open.has(id)?1:0;
 }));
 // D6-03: استعادة العائمة
 (w.f||[]).forEach(o=>{
  if(!L.p[o.id]) return;
  L.p[o.id].z="f"; L.p[o.id].o=1;
  L.p[o.id].x=o.x; L.p[o.id].y=o.y;
  L.p[o.id].w=o.w; L.p[o.id].h=o.h;
 });
 UIS.wsCur=key;
 applyLayout();
 markDirtyAll();
 renderVisible(1);
 save();
 /* القشرة والتبويب — يتولّاهما app.js عبر الخطّاف فلا دورة */
 if(HOOK.ws)HOOK.ws(w);
 if(!quiet)HOOK.report("ok",`سطح العمل: ${w.n}`);
 return true;
}
export function wsSave(name){
 const n=String(name||"").trim().slice(0,32);
 if(!n){HOOK.report("wr","الاسم فارغ"); return false}
 if(WS[n]){HOOK.report("wr",`«${n}» اسمٌ مدمج — اختر غيره`);
  return false}
 UIS.ws=UIS.ws||{};
 if(!UIS.ws[n]&&Object.keys(UIS.ws).length>=24){
  HOOK.report("wr","٢٤ سطح عملٍ محفوظاً — احذف واحداً أوّلاً");
  return false;
 }
 reindex();
 UIS.ws[n]={n,
  shell:UIS.shell, tab:UIS.tab, clean:UIS.clean?1:0,
  zw:{s:L.zw.s,e:L.zw.e}, mode:{s:L.mode.s,e:L.mode.e},
  auto:{s:L.auto.s,e:L.auto.e},
  s:order("s"), e:order("e"),
  f:pIds().filter(id=>L.p[id].z==="f").map(id=>({id,x:L.p[id].x,y:L.p[id].y,w:L.p[id].w,h:L.p[id].h})),
  open:pIds().filter(id=>L.p[id].o&&L.p[id].z!=="x")};
 UIS.wsCur=n;
 save();
 HOOK.report("ok",`حُفظ سطح العمل «${n}»`);
 return true;
}
export function wsDel(name){
 if(WS[name]){HOOK.report("wr","السطح المدمج لا يُحذَف"); return false}
 if(!UIS.ws||!UIS.ws[name])return false;
 delete UIS.ws[name];
 if(UIS.wsCur===name)UIS.wsCur="";
 save();
 HOOK.report("ok",`حُذف سطح العمل «${name}»`);
 return true;
}
export function wsReset(){
 const d=DEFLAY();
 L.zw=d.zw; L.mode=d.mode; L.auto=d.auto; L.cur=d.cur;
 PANELS.forEach(p=>{L.p[p.id]={...d.p[p.id]}});
 UIS.wsCur="";
 applyLayout(); markDirtyAll(); renderVisible(1); save();
 HOOK.report("ok","أُعيد تخطيط اللوحات إلى مصنعه");
}
const markDirtyAll=()=>PANELS.forEach(p=>markDirty(p.id));

/* ═══ قائمة أسطح العمل ═══ */
export function wsMenuOpen(x,y){
 const m=$("#wsMenu");
 if(!m)return;
 const A=wsAll();
 m.innerHTML=`<div class="pmH">أسطح العمل</div>`
  +Object.keys(A).map(k=>
   `<button type="button" class="pmI" data-wsa="use:${esc(k)}">`
   +`${ic("ws")}<span>${esc(A[k].n)}</span>`
   +`<span class="ky">${UIS.wsCur===k?"●":""}</span></button>`
   +(A[k].built?"":`<button type="button" class="pmI pmDel"`
    +` data-wsa="del:${esc(k)}" title="حذف">${ic("close")}</button>`))
   .join("")
  +`<div class="pmS"></div>`
  +`<button type="button" class="pmI" data-wsa="save">`
  +`${ic("save")}<span>احفظ الحالي…</span></button>`
  +`<button type="button" class="pmI" data-wsa="reset">`
  +`${ic("undo")}<span>أعِد تخطيط المصنع</span></button>`;
 m.hidden=false;
 const w=m.offsetWidth||230, h=m.offsetHeight||260;
 m.style.insetInlineStart=Math.round(
  clamp(rtl()?(innerWidth-x-4):(x-w+4),4,innerWidth-w-4))+"px";
 m.style.insetBlockStart=Math.round(
  clamp(y+4,4,innerHeight-h-8))+"px";
}
export const wsMenuClose=()=>{
 const m=$("#wsMenu");
 if(m)m.hidden=true;
};
function wsRun(a){
 const u=/^use:(.+)$/.exec(a);
 if(u){wsMenuClose(); return wsApply(u[1])}
 const d=/^del:(.+)$/.exec(a);
 if(d){
  const A=wsAll();
  if(!confirm(`حذف سطح العمل «${(A[d[1]]||{}).n||d[1]}»؟`))return false;
  wsDel(d[1]);
  wsMenuOpen(innerWidth/2,120);
  return true;
 }
 if(a==="save"){
  wsMenuClose();
  const n=prompt("اسم سطح العمل:",UIS.wsCur||"سطحي");
  return n==null?false:wsSave(n);
 }
 if(a==="reset"){
  wsMenuClose();
  if(!confirm("إعادة تخطيط اللوحات إلى مصنعه؟"))return false;
  wsReset();
  return true;
 }
 return false;
}
/* ═══ السحب: العائمة والفواصل ═══ */
let DRAG=null;

function onMove(e){
 if(!DRAG)return;
 const dx=e.clientX-DRAG.px, dy=e.clientY-DRAG.py;
 if(!DRAG.on&&Math.hypot(dx,dy)<4)return;
 DRAG.on=true;
 if(DRAG.k==="flt"){
  const st=L.p[DRAG.id];
  if(st.max)return;
  const sx=rtl()?-dx:dx;
  st.x=Math.round(DRAG.x0+sx);
  st.y=Math.round(DRAG.y0+dy);
  placeFloat(DRAG.id);
  return;
 }
 /* الفاصل: العرض يُقاس من حافة العمود الثابتة لا من الإزاحة */
 const el=zoneEl(DRAG.z);
 const r=el.getBoundingClientRect();
 const anchorRight=(DRAG.z==="s")===rtl();
 setZoneW(DRAG.z, anchorRight?(r.right-e.clientX)
  :(e.clientX-r.left));
}
function onUp(){
 if(!DRAG)return;
 const d=DRAG;
 DRAG=null;
 document.documentElement.classList.remove("dragging");
 if(!d.on)return;
 if(d.k==="flt"){
  // D6-10: حفظ فوري بلا انتظار ResizeObserver 400ms
  const st=L.p[d.id];
  if(st){ st.w=Math.round(document.querySelector(`.flt[data-flt="${d.id}"]`)?.offsetWidth||st.w); }
 }
 save();
 if(d.k==="rsz")dispatchEvent(new Event("resize"));
}
/* ═══ التوصيل ═══ */
export function wireDock(){
 /* أدوات الترويسة داخل summary: النقر لا يجوز أن يطوي اللوحة */
 document.addEventListener("click",e=>{
  const pm=e.target.closest("[data-pm]");
  if(pm){
   e.preventDefault(); e.stopPropagation();
   const r=pm.getBoundingClientRect();
   pmOpen(pm.dataset.pm,rtl()?r.left:r.right,r.bottom);
   return;
  }
  const pc=e.target.closest("[data-pc]");
  if(pc){
   e.preventDefault(); e.stopPropagation();
   closePanel(pc.dataset.pc);
   return;
  }
  const a=e.target.closest("[data-pma]");
  if(a&&!a.disabled){
   const m=$("#pMenu");
   pmRun(m.dataset.for,a.dataset.pma);
   return;
  }
  const w=e.target.closest("[data-wsa]");
  if(w){wsRun(w.dataset.wsa); return}
  const zt=e.target.closest("[data-ztab]");
  if(zt){
   L.cur[zt.dataset.zone]=zt.dataset.ztab;
   syncZones(); renderVisible(1); save();
   return;
  }
  const pk=e.target.closest("[data-peek]");
  if(pk){
   const z=pk.dataset.zone;
   if(PEEK===z&&(L.mode[z]!=="tab"||L.cur[z]===pk.dataset.peek))
    unpeek();
   else peek(z,pk.dataset.peek);
   return;
  }
  /* زر إغلاق اللوحة العائمة (Drawer/Bottom Sheet) على اللمس —
     أكيد الوصول دائماً حتى لو الشريط strip مغطّى خلف اللوحة المفتوحة */
  const dc=e.target.closest("[data-dockclose]");
  if(dc){unpeek(); return}
 });
 /* إغلاق اللوحة العائمة بالنقر/اللمس خارجها. هذا يكرّر منطق مستمع
    "mousedown" الآتي، لكن كمستمع "pointerdown" مستقلّ في طور الالتقاط:
    عناصر اللمس على #cv تستدعي preventDefault() على pointerdown، وهذا
    -حسب مواصفة Pointer Events- يمنع المتصفح من توليد mousedown/click
    التعويضيين بعده. فبدون هذا المستمع، لمس اللوحة أو المسند خارج اللوحة
    العائمة على جهاز لمسٍ حقيقي لا يُغلقها أبداً وإن نجح ذلك بالماوس. */
 document.addEventListener("pointerdown",e=>{
  if(!PEEK)return;
  const el=zoneEl(PEEK);
  if(el&&!el.contains(e.target)
   &&!e.target.closest(".strip")
   &&!e.target.closest("[data-dockclose]")
   &&!e.target.closest("#fabDock"))
   unpeek();
 },true);
 /* الطيّ بمفتاح المسافة على الترويسة يعمل أصلاً — details أصيل.
    والأسهم بين تبويبات العمود بمنطق القراءة العربية. */
 document.addEventListener("keydown",e=>{
  const m=$("#pMenu"), wm=$("#wsMenu");
  if(e.key==="Escape"){
   if(m&&!m.hidden){e.preventDefault();e.stopPropagation();
    pmClose();return}
   if(wm&&!wm.hidden){e.preventDefault();e.stopPropagation();
    wsMenuClose();return}
   if(PEEK){e.preventDefault();e.stopPropagation();unpeek();return}
  }
  const zt=e.target.closest&&e.target.closest("[data-ztab]");
  if(zt){
   const step=(e.key==="ArrowLeft")?1:((e.key==="ArrowRight")?-1:0);
   if(!step)return;
   e.preventDefault();
   const z=zt.dataset.zone, ids=order(z);
   const i=ids.indexOf(zt.dataset.ztab);
   const j=(i+step+ids.length)%ids.length;
   L.cur[z]=ids[j];
   syncZones(); renderVisible(1); save();
   const nb=document.querySelector(`[data-ztab="${ids[j]}"]`);
   if(nb)nb.focus();
   return;
  }
  const rs=e.target.closest&&e.target.closest("[data-rsz]");
  if(rs){
   const step=(e.key==="ArrowLeft")?-16
    :((e.key==="ArrowRight")?16:0);
   if(!step)return;
   e.preventDefault();
   const z=rs.dataset.rsz;
   const sg=((z==="s")===rtl())?-1:1;
   setZoneW(z,L.zw[z]+step*sg);
   save();
  }
 },true);
 /* ═══ السحبُ على Pointer Events ═══ P5-006
    كان سحبُ العوامات والفواصل مربوطاً بـmouse* وحدها — بخلاف القماش
    والعرض الثلاثي. على اللمس يعتمد ذلك على أحداثِ ماوسٍ اصطناعيةٍ
    يُطلِقها المتصفّح، وأيُّ عنصرٍ يمنعها (touch-action · preventDefault
    في مستمعٍ لاحق) يُعطِّل السحبَ بلا رسالة.
    الآن المنفِّذُ واحدٌ ويُسجَّل للمسارَين: الماوسُ كما كان حرفاً،
    وpointer لغير الماوس وحده — فلا معالجةٌ مزدوجة.
    وsetPointerCapture على الفاصل والترويسة: السحبُ لا يُفلِت إن خرج
    المؤشّرُ من العنصر. */
 const notMouse=e=>!e||e.pointerType!=="mouse";
 const onDockDown=e=>{
  const m=$("#pMenu"), wm=$("#wsMenu");
  if(m&&!m.hidden&&!m.contains(e.target)
   &&!e.target.closest("[data-pm]"))pmClose();
  if(wm&&!wm.hidden&&!wm.contains(e.target)
   &&!e.target.closest("[data-wsx]"))wsMenuClose();
  if(PEEK){
   const el=zoneEl(PEEK);
   if(el&&!el.contains(e.target)&&!e.target.closest(".strip"))
    unpeek();
  }
  const rs=e.target.closest(".dsz");
  if(rs){
   e.preventDefault();
   if(UIS.lockUI)return;      /* التخطيط مقفل: لا تحجيم */
   DRAG={k:"rsz",z:rs.dataset.rsz,px:e.clientX,py:e.clientY,on:0};
   document.documentElement.classList.add("dragging");
   return;
  }
  const sum=e.target.closest(".flt > details.sec > summary");
  if(!sum||e.target.closest(".pB"))return;
  const f=sum.closest(".flt");
  const id=f.dataset.flt;
  toFront(id);
  if(UIS.lockUI)return;        /* التخطيط مقفل: لا سحب */
  DRAG={k:"flt",id,px:e.clientX,py:e.clientY,
   x0:L.p[id].x,y0:L.p[id].y,on:0};
  document.documentElement.classList.add("dragging");
 };
 document.addEventListener("mousedown",onDockDown,true);
 document.addEventListener("pointerdown",e=>{
  if(!notMouse(e))return;           /* الماوسُ له مسارُه القديم */
  onDockDown(e);
  if(DRAG){
   const t=e.target.closest&&(e.target.closest(".dsz")
    ||e.target.closest(".flt > details.sec > summary"));
   try{ if(t&&t.setPointerCapture)t.setPointerCapture(e.pointerId) }catch(_){}
  }
 },true);
 /* السحب لا يطوي: النقرة التالية للنقل تُبطَل */
 document.addEventListener("click",e=>{
  const sum=e.target.closest(".flt > details.sec > summary");
  if(sum&&sum.dataset.moved){delete sum.dataset.moved;
   e.preventDefault()}
 },true);
 const onDockMove=e=>{
  if(DRAG&&DRAG.k==="flt"&&!DRAG.on){
   const s=secEl(DRAG.id);
   const sm=s&&s.querySelector(":scope > summary");
   if(sm&&Math.hypot(e.clientX-DRAG.px,e.clientY-DRAG.py)>=4)
    sm.dataset.moved="1";
  }
  onMove(e);
 };
 addEventListener("mousemove",onDockMove);
 addEventListener("pointermove",e=>{if(notMouse(e))onDockMove(e)});
 addEventListener("mouseup",onUp);
 addEventListener("pointerup",e=>{if(notMouse(e))onUp(e)});
 addEventListener("pointercancel",e=>{if(notMouse(e))onUp(e)});
 addEventListener("lostpointercapture",()=>onUp());
 addEventListener("blur",onUp);
 /* تغيير الحجم يُحفَظ بعد سكون · والعائمة تُقيَّد داخل النافذة */
 addEventListener("resize",()=>{
  PANELS.forEach(p=>{if(L.p[p.id].z==="f")placeFloat(p.id)});
 });
 if(typeof ResizeObserver!=="undefined"){
  let t=null;
  const ro=new ResizeObserver(es=>{
   es.forEach(x=>{
    const id=x.target.dataset.flt;
    if(!id||L.p[id].max)return;
    L.p[id].w=Math.round(x.target.offsetWidth);
    L.p[id].h=Math.round(x.target.offsetHeight);
   });
   if(t)clearTimeout(t);
   t=setTimeout(()=>{t=null; save()},400);
  });
  const mo=new MutationObserver(()=>{
   document.querySelectorAll(".flt").forEach(f=>{
    if(f.dataset.ro)return;
    f.dataset.ro="1"; ro.observe(f);
   });
  });
  keepObserver("floatSize",ro);           /* P2-013 */
  keepObserver("floatList",mo);
  mo.observe($("#floats"),{childList:true});
  document.querySelectorAll(".flt").forEach(f=>{
   f.dataset.ro="1"; ro.observe(f);
  });
 }
}
/* ═══ الإقلاع ═══ يُنادى بعد buildSide وقبل أي رسم ═══ */
export function initDock(){
 UIS.layout=normLay(UIS.layout);
 L=UIS.layout;
 const n=harvest();
 applyLayout();
 wireDock();
 return n;
}
export const dockStats=()=>({
 s:order("s"), e:order("e"),
 f:pIds().filter(id=>L.p[id].z==="f"),
 x:pIds().filter(id=>L.p[id].z==="x"),
 mode:{...L.mode}, auto:{...L.auto}, zw:{...L.zw},
 ws:UIS.wsCur||""
});
