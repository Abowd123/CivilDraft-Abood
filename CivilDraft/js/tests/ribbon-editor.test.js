/* ═══ محرّر الشريط — سلوكٌ فعليّ على DOM مُحاكى ═══
   يفتح المحرّر، ينقر ◉ وّ↑ و«أعِد المصنع»، ويتحقّق أن الشريط أُعيد بناؤه
   وأن الدلتا حُفظت فعلاً (يحمي من خلل commit القديم: لا حفظ ولا تطبيق).
   node js/tests/ribbon-editor.test.js */
import {shim,shimCanvas,shimDOM,group,ok,eq,summary} from "./harness.js";
shim(); shimCanvas();
const doc=shimDOM();
if(typeof globalThis.localStorage==="undefined"){
 const m=new Map();
 globalThis.localStorage={getItem:k=>m.has(k)?m.get(k):null,
  setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
}
globalThis.confirm=()=>true;
const rb=doc.createElement("div"); rb.setAttribute("id","ribbon");
doc.body.appendChild(rb);
const {RIBBON}=await import("../ui/ribbon/schema.js");
const R=await import("../ui/ribbon/render.js");
const C=await import("../ui/ribbon/custom.js");
const ED=await import("../ui/ribbon/editor.js");
const {UIS}=await import("../ui/store.js");
UIS.shell="ribbon";
C.resetRibbonDelta();

const tabIdsInRibbon=()=>rb.querySelectorAll(".rbTab").map(b=>b.dataset.tab);
const clickAct=(ea,ek,tid,pid)=>{
 const q=`[data-ea="${ea}"][data-ek="${ek}"][data-tid="${tid}"]`
  +(pid?`[data-pid="${pid}"]`:"");
 const el=doc.getElementById("ribEditor").querySelectorAll(q)[0];
 ok(!!el,`زرٌّ ${ea}/${ek}/${tid} موجود في المحرّر`);
 if(el)el.dispatchEvent({type:"click",target:el,bubbles:true});
};

group("المحرّر يعيد بناء الشريط ويحفظ فعلاً",()=>{
 R.buildRibbon(); rb.dataset.built="1";
 eq(tabIdsInRibbon().length,RIBBON.length,"الشريط على المصنع");
 ED.openRibbonEditor();
 ok(ED.ribbonEditorOpen(),"المحرّر مفتوح");
 const t=RIBBON[1].id;
 clickAct("eye","tab",t);
 ok(!tabIdsInRibbon().includes(t),"إخفاء التبويب ⇒ يختفي من الشريط فوراً");
 eq(C.loadRibbonDelta().delta.tabs[t].hidden,1,"والدلتا محفوظةٌ في التخزين");
 ok(doc.getElementById("ribEditor").querySelectorAll('[data-ea="eye"][data-ek="tab"]')
  .some(b=>b.textContent==="○"),"وتتحوّل ◉ إلى ○ في المحرّر");
 clickAct("eye","tab",t);
 ok(tabIdsInRibbon().includes(t),"إعادة الإظهار ⇒ يعود");
 eq(Object.keys(C.loadRibbonDelta().delta.tabs).length,0,"والدلتا تعود فارغة");
});

group("الترتيب يُحفَظ ويُطبَّق",()=>{
 const a=RIBBON[0].id, b=RIBBON[1].id;
 clickAct("dn","tab",a);
 const ids=tabIdsInRibbon();
 ok(ids.indexOf(b)<ids.indexOf(a),"↓ يُنزل التبويب");
 ok(C.loadRibbonDelta().delta.tabOrder.length>0,"والترتيب محفوظ");
});

group("«أعِد المصنع» يمسح الدلتا ويعيد البناء",()=>{
 const el=doc.getElementById("ribEditor").querySelectorAll('[data-re="reset"]')[0];
 ok(!!el,"زرّ المصنع");
 el.dispatchEvent({type:"click",target:el,bubbles:true});
 eq(tabIdsInRibbon().join(),RIBBON.map(t=>t.id).join(),"الترتيب الأصلي");
 eq(localStorage.getItem("civildraft.ribbon"),null,"والتخزين نظيف");
});

group("إخفاء «رئيسي» لا يترك الشريط بلا تبويبٍ نشط",()=>{
 UIS.tab="home";
 C.saveRibbonDelta({version:1,tabs:{home:{hidden:1}}});
 R.rebuildRibbon();
 ok(!tabIdsInRibbon().includes("home"),"home مخفي");
 eq(rb.querySelectorAll(".rbTab.on").length,1,"تبويبٌ واحد نشط");
 C.resetRibbonDelta(); R.rebuildRibbon();
});
ED.closeRibbonEditor();
summary();
