/* ═══ قائمة «مِسطَر» ═══
   بديل زرّ التطبيق في أوتوكاد. وفيها بحثُ الأوامر الذي يقابل
   صندوق «Type a keyword»، إلّا أنه يقرأ سجلّ الأدوات نفسه
   بأسمائها ومختصراتها المعلَنة في alias — فلا قائمةَ ثانية
   تتخلّف عن الأولى.

   «الملفّات الحديثة» مؤجَّلة إلى م٨: لا سجلَّ ملفّاتٍ اليوم،
   وقائمةٌ فارغة تَعِد بما لا تُنجز. */
import {icon} from "./icons.js";
import {UIS} from "./store.js";
import {ACT,runItem} from "./ribbon/wire.js";
import * as R from "../tools/registry.js";
import {draw} from "./canvas.js";
import {HOOK} from "./bus.js";
import {escapeHtml as esc} from "../core/escape.js";
import {search as unifiedSearch} from "./searchIndex.js";

const $=s=>document.querySelector(s);
const ic=(n,s)=>UIS.icons?icon(n,s||16):"";

/* يُصدَّر ليقابله حارسُ البيوتِ: قائمةُ التطبيقِ بيتٌ معلَنٌ في
   `schema.js`، والحارسُ يفرض ألّا يفترق المُعلَنُ عن المعروض. */
export const ROWS=[
 {act:"fnew", n:"مشروع جديد", ico:"fnew", k:""},
 {act:"xOpen",n:"افتح مشروعاً",ico:"open", k:""},
 {act:"xSave",n:"احفظ المشروع",ico:"save", k:"Ctrl+S"},
 {sep:1},
 {act:"xDxf",n:"تصدير DXF",ico:"dxf",k:""},
 {act:"xSvg",n:"تصدير SVG",ico:"svg",k:""},
 {act:"xPng",n:"تصدير PNG",ico:"png",k:""},
 {act:"xPdf",n:"تصدير PDF",ico:"pdf",k:""},
 {sep:1},
 {act:"rImp",   n:"استورد DXF مرجعاً",ico:"ref",    k:""},
 {act:"inspect",n:"افحص المخطط",      ico:"inspect",k:"F7"},
 {sep:1},
 /* ═══ ضبطُ البرنامجِ ═══ المرحلة ٤ من audit/10-ui-plan.md
    هذه نُقِلت من الشريطِ إلى هنا بسببٍ مقيس: التبويباتُ السبعةُ تحمل
    ٢٠٩ عناصرَ، وحدُّ «٣٠ عنصراً للتبويب» يجعل ٧×٣٠=٢١٠ سقفاً لا
    فُسحةَ فيه. والفرقُ ليس حسابياً وحدَه: **ضبطُ البرنامجِ ليس رسمَ
    المخطَّطِ**، وموضعُه قائمةُ التطبيقِ كما في كلِّ برنامجِ رسم.
    وهذه القائمةُ **بيتٌ معلَنٌ** يعرفه `homeOf`، فمن سأل «أين
    الكثافة؟» أُجيب «قائمة التطبيق» لا صمتاً. */
 {act:"shell",n:"بدّل القشرة",ico:"shell",k:""},
 {act:"theme",n:"بدّل السِّمة",  ico:"theme",k:""},
 {act:"density",n:"بدّل الكثافة",ico:"density",k:""},
 {act:"clean",n:"شاشة نظيفة", ico:"clean",k:"Ctrl+0"},
 {act:"rbMin",n:"اطوِ الشريط",ico:"rbmin",k:"Ctrl+F1"},
 {act:"beginner",n:"وضع المبتدئ",ico:"help",k:""},
 {act:"ribbonEditDlg",n:"تخصيص الشريط",ico:"shell",k:""},
 {sep:1},
 {act:"qpTog",   n:"خصائص سريعة",      ico:"qp",   k:""},
 {act:"rclick",  n:"سلوك الزرّ الأيمن", ico:"ctx",  k:""},
 {act:"cmdMode", n:"موضع سطر الأوامر",  ico:"cmdl", k:""},
 {act:"cmdFloat",n:"سطر أوامر عائم",    ico:"float",k:""},
 {act:"cmdBottom",n:"أعِد سطر الأوامر للأسفل",ico:"down",k:""},
 {sep:1},
 {act:"dRst",n:"أعِد إعدادات المصنع",ico:"undo",k:""},
 {sep:1},
 {act:"perfShow",n:"القياس",ico:"info",k:""},
 {act:"purgeAll",n:"امسح كل ما هو محفوظ محلّياً",ico:"del",k:""},
 {sep:1},
 {act:"guideDlg",n:"الدليل التعليمي",ico:"help",k:""},
 {act:"help",n:"المساعدة",ico:"help",k:"F1"},
 {act:"installApp",n:"ثبّت التطبيق (نافذة مستقلّة)",ico:"down",k:""},
 {act:"aboutDlg",n:"عن CivilDraft · تواصل مع المطوّر",ico:"info",k:""}
];
/* ═══ بحث الأوامر ═══ فوق الفهرس الموحّد (searchIndex.js) — يُطلَب
   نطاقٌ أوسع من الفهرس المُختلط (٢٤) قبل تصفية الأدوات وحدها وقصّ
   التسعة الأُوَل، فلا يُزاحم مطابقاتِ الأفعال (act) مطابقاتِ
   الأدوات المطلوبة هنا فعلاً. الشكل المُعاد {d,al,rank} كما كان
   تماماً — renderSearch/runSearch أدناه لا تُمسّان. */
function search(q){
 if(!String(q||"").trim())return [];
 return unifiedSearch(q,24)
  .filter(it=>it.type==="cmd")
  .slice(0,9)
  .map(it=>{
   const d=R.TOOLS[it.id];
   const al=Object.keys(R.TOOLS).filter(k=>R.TOOLS[k]===d&&k!==it.id);
   return {d,al,rank:0};
  });
}
let SR=[], SI=-1;

function renderSearch(){
 const box=$("#amRes");
 if(!box)return;
 if(!SR.length){box.hidden=true; box.innerHTML=""; return}
 box.innerHTML=SR.map((r,i)=>
  `<div class="amR${i===SI?" sel":""}" data-i="${i}">`
  +`<b>${esc(r.d.label)}</b>`
  +`<span class="mono">${esc(r.d.id)}`
  +(r.al.length?" · "+esc(r.al.slice(0,3).join(" ")):"")+`</span>`
  +`</div>`).join("");
 box.hidden=false;
}
function runSearch(i){
 const r=SR[i];
 if(!r)return;
 close();
 R.begin(r.d);
 HOOK.prompt(); draw();
 const c=$("#clIn");
 if(c)c.focus();
}
/* ═══ الفتح والإغلاق ═══ */
export function open(){
 const p=$("#appMenu");
 if(!p)return;
 p.hidden=false;
 $("#appBtn").setAttribute("aria-expanded","true");
 const s=$("#amSearch");
 if(s){s.value=""; SR=[]; SI=-1; renderSearch(); s.focus()}
}
export function close(){
 const p=$("#appMenu");
 if(!p||p.hidden)return;
 p.hidden=true;
 const b=$("#appBtn");
 if(b)b.setAttribute("aria-expanded","false");
 SR=[]; SI=-1;
}
export const isOpen=()=>{
 const p=$("#appMenu");
 return !!p&&!p.hidden;
};
export function buildAppMenu(){
 const p=$("#appMenu");
 if(!p)return 0;
 p.innerHTML=`
<div class="amHead">
 <input id="amSearch" type="text" spellcheck="false"
  autocomplete="off" placeholder="ابحث عن أداة — جدار · باب · بُعد">
 <div id="amRes" hidden></div>
</div>
<div class="amBody" role="menu">
${ROWS.map(r=>r.sep?`<div class="amSep"></div>`
 :`<button type="button" class="amI" role="menuitem" `
  +`data-act="${esc(r.act)}">${ic(r.ico)}`
  +`<span class="lb">${esc(r.n)}</span>`
  +`<span class="ky mono">${esc(r.k||"")}</span></button>`).join("")}
</div>`;
 return ROWS.filter(r=>!r.sep).length;
}
export function wireAppMenu(){
 const b=$("#appBtn"), p=$("#appMenu");
 if(!b||!p)return false;
 buildAppMenu();
 b.onclick=e=>{e.stopPropagation(); isOpen()?close():open()};

 p.addEventListener("click",e=>{
  const r=e.target.closest("[data-i]");
  if(r){runSearch(+r.dataset.i); return}
  const it=e.target.closest("[data-act]");
  if(!it)return;
  const act=it.dataset.act;
  close();
  runItem(it);
  if(!ACT[act])HOOK.report("wr",`فعلٌ غير معروف: ${act}`);
 });
 const s=$("#amSearch");
 if(s){
  s.addEventListener("input",()=>{
   SR=search(s.value); SI=SR.length?0:-1; renderSearch();
  });
  s.addEventListener("keydown",e=>{
   if(e.key==="Escape"){e.preventDefault(); close(); return}
   if(e.key==="ArrowDown"||e.key==="ArrowUp"){
    if(!SR.length)return;
    e.preventDefault();
    SI=(SI+(e.key==="ArrowDown"?1:-1)+SR.length)%SR.length;
    renderSearch();
    return;
   }
   if(e.key==="Enter"){
    e.preventDefault();
    if(SI>=0)runSearch(SI);
    return;
   }
   e.stopPropagation();
  });
 }
 addEventListener("mousedown",e=>{
  if(!isOpen())return;
  if(!p.contains(e.target)&&e.target!==b)close();
 },true);
 return true;
}
