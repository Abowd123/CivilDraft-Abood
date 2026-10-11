/* ═══ محرّر الشريط ═══
   يعرض أساس المصنف كاملاً (حتى المخفيّ — ليُعاد إظهاره)، وكل تغييرٍ
   حيّ: يُحفَظ فوراً ويُعرض في الشريط. المصنفُ قارٌّ والمحرِّر يكتب في
   الدلتا وحدها، و«أعِد المصنع» يمسح الدلتا.
   لا أنماط مضمَّنة (CSP) — الفئات .re- تُعرَّف في css/ribbon.css. */
import {RIBBON as BASE} from "./schema.js";
import {itemKey,flatItems,loadRibbonDelta,saveRibbonDelta,
        resetRibbonDelta} from "./custom.js";
import {rebuildRibbon} from "./render.js";
import {HOOK} from "../bus.js";
import {escapeHtml as esc} from "../../core/escape.js";

let root=null, D=null, OPEN=new Set();

const $=id=>document.getElementById(id);
const completeOrder=(cur,all)=>{
 const a=(cur&&cur.length)?cur.slice():[];
 return a.concat(all.filter(x=>!a.includes(x)));
};
const move=(arr,id,dir)=>{
 const i=arr.indexOf(id);
 if(i<0)return false;
 const j=i+dir;
 if(j<0||j>=arr.length)return false;
 const t=arr[i];arr[i]=arr[j];arr[j]=t;
 return true;
};
/* إعادة بناء الشريط كاملاً: الكاش يُبطَل داخل saveRibbonDelta/reset،
   وrebuildRibbon يقرأ effectiveRibbon الجديد ويحفظ التبويب الحاليّ. */
const applyNow=()=>{rebuildRibbon()};

function curTabs(){return completeOrder(D.tabOrder||[],BASE.map(t=>t.id))}
function curPanels(tid){
 const t=BASE.find(x=>x.id===tid);
 return t?completeOrder((D.panelOrder||{})[tid]||[],
  (t.panels||[]).map(p=>p.id)):[];
}

/* موضع الحقل في الدلتا حسب النوع */
const slot=(ek,tid,pid,ik)=>
 ek==="tab"?[D.tabs,tid]
 :ek==="panel"?[D.panels,tid+"/"+pid]
 :[D.items,tid+"/"+pid+"/"+ik];

function baseName(ek,tid,pid,ik){
 const t=BASE.find(x=>x.id===tid);
 if(!t)return "";
 if(ek==="tab")return t.n||tid;
 const p=(t.panels||[]).find(y=>y.id===pid);
 if(!p)return "";
 if(ek==="panel")return p.n||pid;
 const it=flatItems(p.items).find(z=>itemKey(z)===ik);
 return (it&&it.n)||ik;
}

/* أزرار العرض — الإخفاء/الإظهار */
function eyeBtn(kind,tid,pid,ik,st){
 const dt=`data-ek="${esc(kind)}" data-tid="${esc(tid)}"`
  +(pid?` data-pid="${esc(pid)}"`:"");
 const off=st&&st.hidden;
 return `<button type="button" ${dt}`
  +(ik?` data-ik="${esc(ik)}"`:"")
  +` data-ea="eye" title="${off?"أظهر":"أخفِ"}">${off?"○":"◉"}</button>`;
}
function itemRow(tid,pid,it,grp){
 const ik=itemKey(it);
 if(!ik)return "";
 const path=tid+"/"+pid+"/"+ik;
 const st=(D.items||{})[path]||{};
 const nm=st.label||it.n||ik;
 return `<div class="rit i${st.hidden?" off":""}">`
  +`<span class="pb">${grp?"└":""}</span>`
  +eyeBtn("item",tid,pid,ik,st)
  +`<button type="button" class="nm" data-ea="ren" data-ek="item" `
  +`data-tid="${esc(tid)}" data-pid="${esc(pid)}" data-ik="${esc(ik)}">`
  +`${esc(nm)}</button></div>`;
}
function leaves(tid,p){
 const out=[];
 (p.items||[]).forEach(it=>{
  if(!it)return;
  if(it.group)(it.group||[]).forEach(k=>out.push(itemRow(tid,p.id,k,1)));
  else out.push(itemRow(tid,p.id,it,0));
 });
 return out.join("");
}
function panelRow(tid,p){
 const key=tid+"/"+p.id;
 const st=(D.panels||{})[key]||{};
 const nm=st.label||p.n;
 const open=OPEN.has("p:"+key);
 const a=`data-ek="panel" data-tid="${esc(tid)}" data-pid="${esc(p.id)}"`;
 return `<div class="rit p${st.hidden?" off":""}">`
  +`<div class="r">`
  +`<button type="button" data-ea="up" ${a}>↑</button>`
  +`<button type="button" data-ea="dn" ${a}>↓</button>`
  +eyeBtn("panel",tid,p.id,"",st)
  +`<button type="button" class="nm" data-ea="open" ${a}>${esc(nm)}</button>`
  +`<button type="button" data-ea="ren" ${a}>✎</button>`
  +`</div>`
  +`<div class="rkids"${open?"":" hidden"}>${leaves(tid,p)}</div></div>`;
}
function tabRow(tid){
 const t=BASE.find(x=>x.id===tid);
 if(!t)return "";
 const st=(D.tabs||{})[tid]||{};
 const nm=st.label||t.n;
 const open=OPEN.has("t:"+tid);
 const a=`data-ek="tab" data-tid="${esc(tid)}"`;
 return `<div class="rit t${st.hidden?" off":""}">`
  +`<div class="r">`
  +`<button type="button" data-ea="up" ${a}>↑</button>`
  +`<button type="button" data-ea="dn" ${a}>↓</button>`
  +eyeBtn("tab",tid,"","",st)
  +`<button type="button" class="nm" data-ea="open" ${a}>${esc(nm)}</button>`
  +`<button type="button" data-ea="ren" ${a}>✎</button>`
  +`</div>`
  +`<div class="rkids"${open?"":" hidden"}>`
  +curPanels(tid).map(pid=>{
     const p=(t.panels||[]).find(y=>y.id===pid);
     return p?panelRow(tid,p):"";
    }).join("")
  +`</div></div>`;
}
function renderList(){
 const body=$("ribEdBody");
 if(!body)return;
 if(!D)D=loadRibbonDelta().delta;
 body.innerHTML=`<div class="re-hint">انقر ◉ للإخفاء · ○ للإظهار · `
  +`✎ لإعادة التسمية · ↑↓ للترتيب. المصنفُ نفسُه لا يتغيّر.</div>`
  +curTabs().map(tabRow).join("");
}

function ensureDom(){
 if(root)return;
 root=document.createElement("aside");
 root.id="ribEditor"; root.hidden=true; root.setAttribute("dir","rtl");
 root.innerHTML=
  `<header class="re-h"><span class="re-t">تخصيص الشريط</span>`
  +`<span class="re-note">التخصيص محفوظ لك في هذا المتصفّح — ملفّ المشروع لا يحمله</span>`
  +`<button type="button" data-re="reset" class="re-btn">أعِد المصنع</button>`
  +`<button type="button" data-re="close" class="re-x" title="إغلاق">✕</button></header>`
  +`<div class="re-body"><div id="ribEdBody"></div></div>`
  +`<footer class="re-f"><button type="button" data-re="close" class="re-ok">تم — يُحفَظ تلقائياً</button></footer>`;
 document.body.appendChild(root);
 root.addEventListener("click",onClick);
 root.addEventListener("keydown",e=>{
  if(e.key==="Escape"){close(); return}
  e.stopPropagation();
 });
}

function show(){
 ensureDom();
 const L=loadRibbonDelta();
 D=L.delta;
 L.warnings.slice(0,3).forEach(m=>HOOK.report("in","الشريط: "+m));
 renderList();
 root.hidden=false;
}
function close(){if(root)root.hidden=true}

/* يحفظ دائماً (saveRibbonDelta يطبّع ويطرح الفائض ويُبطل الكاش)،
   ثم يعيد التحميل والرسم والتطبيق على الشريط. */
function commit(){
 if(!saveRibbonDelta(D)){
  HOOK.report("er","تعذّر حفظ التخصيص — التخزين المحلي محجوب أو ممتلئ");
  return;
 }
 D=loadRibbonDelta().delta;
 renderList();
 applyNow();
}

const setLabel=(holder,key,v)=>{
 const o=Object.assign({},holder[key]||{});
 if(v)o.label=v; else delete o.label;
 if(Object.keys(o).length)holder[key]=o; else delete holder[key];
};
const toggleHidden=(holder,key)=>{
 const o=Object.assign({},holder[key]||{});
 if(o.hidden)delete o.hidden; else o.hidden=1;
 if(Object.keys(o).length)holder[key]=o; else delete holder[key];
};

function onClick(e){
 const t=e.target.closest("[data-re]");
 if(t){
  const a=t.dataset.re;
  if(a==="close"){close();return}
  if(a==="reset"){
   if(!confirm("إعادة الشريط إلى المصنع؟ تخصيصُك يُمسح."))return;
   resetRibbonDelta();
   D=loadRibbonDelta().delta;
   OPEN=new Set();
   renderList(); applyNow();
   HOOK.report("ok","أُعيد الشريط إلى مصنعه");
  }
  return;
 }
 const b=e.target.closest("[data-ea]");
 if(!b)return;
 const ea=b.dataset.ea, ek=b.dataset.ek, tid=b.dataset.tid,
       pid=b.dataset.pid||"", ik=b.dataset.ik||null;

 if(ea==="open"){
  const k=(ek==="tab"?"t:"+tid:"p:"+tid+"/"+pid);
  OPEN.has(k)?OPEN.delete(k):OPEN.add(k);
  renderList();
  return;
 }
 if(ea==="ren"){
  const [holder,key]=slot(ek,tid,pid,ik);
  const cur=((holder[key]||{}).label)||baseName(ek,tid,pid,ik);
  const nm=window.prompt("التسمية الجديدة (فارغ = الأصل):",cur);
  if(nm==null)return;
  setLabel(holder,key,String(nm).trim().slice(0,60));
  commit();
  return;
 }
 if(ea==="eye"){
  const [holder,key]=slot(ek,tid,pid,ik);
  toggleHidden(holder,key);
  commit();
  return;
 }
 if(ea==="up"||ea==="dn"){
  const dir=ea==="up"?-1:1;
  if(ek==="tab"){
   const arr=curTabs();
   if(move(arr,tid,dir))D.tabOrder=arr;
  }else{
   if(!D.panelOrder)D.panelOrder={};
   const arr=curPanels(tid);
   if(move(arr,pid,dir))D.panelOrder[tid]=arr;
  }
  commit();
 }
}

export const openRibbonEditor=show;
export const closeRibbonEditor=close;
export const toggleRibbonEditor=()=>{
 if(root&&!root.hidden)close(); else show();
};
export const ribbonEditorOpen=()=>!!(root&&!root.hidden);
