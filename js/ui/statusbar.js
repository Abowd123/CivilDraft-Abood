/* ═══ شريط الحالة ═══
   سجلٌّ لا قالب: كل عنصرٍ سطرٌ هنا، وقائمة التخصيص تُبنى منه.
   والعنصر المُخفى يبقى في الشجرة بسمة hidden لا يُنزَع — لأن
   الشريط ينقر [data-rb] بالوكالة، فنزعه يعطّل مفتاحه هناك بلا
   خطأٍ ظاهر. والنقر على المخفيّ برمجياً يعمل.

   وما ليس له مُنفِّذ اليوم ليس فيه: لا وزنَ خطٍّ ولا شفافيةَ ولا
   طبقةً حالية ولا نظامَ إحداثيات — تدخل مع مراحلها. */
import {S,edit,touchView,autosave} from "../core/state.js";
import {icon} from "./icons.js";
import {UIS,uiSet,saveUI} from "./store.js";
import {scene} from "../core/render.js";
import {HOOK} from "./bus.js";
import {scl} from "../core/units.js";
import {escapeHtml as esc} from "../core/escape.js";

const $=s=>document.querySelector(s);
const ic=(n,s)=>UIS.icons?icon(n,s||14):"";

/* k: txt · rb · act · dv · gap ═══ opt=1 يقبل الإخفاء */
export const ITEMS=[
 {k:"txt", id:"pos",  el:"stPos", cls:"mono num", n:"الإحداثيات",
  t:"موضع المؤشّر بالمتر", opt:1, v:"0.00 , 0.00 م"},
 {k:"dv"},
 {k:"rb", id:"grid",  rb:"grid",  n:"الشبكة",   ico:"grid",
  t:"إظهار الشبكة · F6", opt:1},
 {k:"rb", id:"gsnap", rb:"gsnap", n:"خطوة",     ico:"gsnap",
  t:"الالتقاط على خطوة الشبكة · F9", opt:1},
 {k:"rb", id:"ortho", rb:"ortho", n:"تعامد",    ico:"ortho",
  t:"F8", opt:1},
 {k:"rb", id:"polar", rb:"polar", n:"قطبي",     ico:"polar",
  t:"F10", opt:1, pop:"polBtn"},
 {k:"rb", id:"snap",  rb:"snap",  n:"التقاط",   ico:"osnap",
  t:"التقاط الكائنات · F3", opt:1, pop:"osBtn"},
 {k:"rb", id:"grips", rb:"grips", n:"مقابض",    ico:"grips",
  t:"F11", opt:1},
 {k:"rb", id:"ends",  rb:"ends",  n:"أطراف",    ico:"ends",
  t:"علامات الأطراف غير المتّصلة · F12", opt:1},
 {k:"rb", id:"paths", rb:"paths", n:"المسارات", ico:"paths",
  t:"المسار المرسوم للجدار المحاذي", opt:1},
 {k:"rb", id:"dyn", rb:"dyn", n:"إدخال حركي", ico:"dyn",
  t:"حقولٌ عند المؤشّر · Ctrl+D", opt:1},
 {k:"dv"},
 {k:"act", id:"sheet", act:"stSheet", n:"الورقة", ico:"sheet",
  t:"إظهار الورقة وبلوك العنوان", opt:1},
 {k:"act", id:"plots", act:"stPlots", n:"طباعة فقط", ico:"print",
  t:"معاينة نهائية: يُخفى ما لا يُطبَع (عرضٌ فقط — لا يمسّ الطبقات)",
  opt:1},
 {k:"act", id:"scale", act:"stScale", n:"1:100", ico:"",
  t:"المقياس — انقر لإعداد المشروع", opt:1, cls:"mono num wide"},
 {k:"act", id:"quick", act:"qpTog", n:"", ico:"qp",
  t:"الخصائص السريعة", opt:1},
 {k:"act", id:"cmd", act:"cmdMode", n:"", ico:"cmdl",
  t:"موضع سطر الأوامر والسجل", opt:1},
 {k:"dv"},
 /* ═══ تكاملٌ مع الشريط العلوي ═══ نفس الأفعال (ACT) لا نسخةٌ ثانية */
 {k:"act", id:"undo", act:"undo", n:"", ico:"undo",
  t:"تراجع · Ctrl+Z", opt:1},
 {k:"act", id:"redo", act:"redo", n:"", ico:"redo",
  t:"إعادة · Ctrl+Shift+Z", opt:1},
 {k:"act", id:"fit", act:"fit", n:"", ico:"fit",
  t:"ملاءمة الرسم للشاشة", opt:1},
 {k:"act", id:"save", act:"xSave", n:"", ico:"save",
  t:"احفظ المشروع · Ctrl+S", opt:1},
 {k:"act", id:"hist", act:"histTog", n:"", ico:"info",
  t:"سجلّ التاريخ ومقارنة الإصدارات · Ctrl+Shift+H", opt:1},
 {k:"act", id:"joins", act:"joinsTog", n:"دمج", ico:"weld",
  t:"دمج الأركان", opt:1},
 {k:"act", id:"solo", act:"soloTog", n:"أعمدة", ico:"col",
  t:"أعمدة مستقلّة", opt:1},
 {k:"act", id:"theme", act:"theme", n:"", ico:"theme",
  t:"بدّل السِّمة", opt:1},
 {k:"dv"},
 {k:"txt", id:"sel", el:"stSel", n:"المحدَّد", t:"", opt:1, v:""},
 {k:"gap"},
 {k:"txt", id:"hint", el:"stHint", n:"إرشاد الأداة", t:"", opt:1,
  v:""},
 {k:"dv"},
 {k:"act", id:"warn", act:"stWarn", n:"—", ico:"warn",
  t:"ملاحظات المشهد — انقر للفاحص", opt:1},
 {k:"dv"},
 /* P5-010: منطقةٌ حيّة — رسائلُ HOOK.status كانت تُكتَب بلا إعلان،
    فيفوّتها قارئُ الشاشة تماماً. polite لا assertive: إعلامٌ لا مقاطعة. */
 /* P6-010: شارةُ الإصدار — نصٌّ لا زرّ، وقابلةٌ للإخفاء كغيرها */
 {k:"txt", id:"ver", el:"stVer", n:"الإصدار", t:"إصدار التطبيق", opt:1,
  cls:"dim"},
 {k:"txt", id:"info", el:"stInfo", n:"آخر رسالة", t:"", opt:1, live:1,
  v:""},
 {k:"dv"},
 {k:"act", id:"ws", act:"wsMenu", n:"", ico:"ws",
  t:"أسطح العمل", opt:1},
 {k:"act", id:"lockUI", act:"stLock", n:"", ico:"lock",
  t:"قفل تخطيط اللوحات", opt:1},
 {k:"act", id:"clean", act:"clean", n:"", ico:"clean",
  t:"شاشة نظيفة · Ctrl+0", opt:1},
 {k:"act", id:"cust", act:"stCust", n:"", ico:"menu",
  t:"عناصر شريط الحالة"}
];
export const stIds=()=>ITEMS.filter(x=>x.opt).map(x=>x.id);
export const stItem=id=>ITEMS.find(x=>x.id===id)||null;
const shownOf=id=>{
 const h=UIS.stHide||{};
 return !h[id];
};
export const stShown=shownOf;

function html(x){
 const hid=(x.opt&&!shownOf(x.id))?" hidden":"";
 if(x.k==="dv")return `<span class="dv"${hid}></span>`;
 if(x.k==="gap")return `<span class="gap"></span>`;
 if(x.k==="txt")
  return `<span id="${esc(x.el)}" data-sti="${esc(x.id)}"`
   +` class="${esc(x.cls||"")}"${hid}${x.t?` title="${esc(x.t)}"`:""}`
   +(x.live?` role="status" aria-live="polite" aria-atomic="true"`:"")
   +`>${esc(x.v||"")}</span>`;
 /* ═══ الاسمُ الميسَّر ═══ P5-003
    عند ≤768px أو ≤1080px تُخفى `.lb` فيصل إلى قارئ الشاشة زرُّ
    أيقونةٍ بلا اسم. و`title` ليس بديلاً موثوقاً عن الاسم الميسَّر
    (لا يُعلَن في كل قارئٍ ولا على اللمس). `aria-label` من x.n دائماً. */
 if(x.k==="rb")
  return `<button type="button" data-rb="${esc(x.rb)}"`
   +` data-sti="${esc(x.id)}" title="${esc(x.n+" · "+(x.t||""))}"`
   +` aria-label="${esc(x.n)}"`
   +` aria-pressed="false"${hid}>${ic(x.ico)}`
   +`<span class="lb">${esc(x.n)}</span></button>`
   +(x.pop?`<button type="button" id="${esc(x.pop)}" class="stPop"`
    +` data-sti="${esc(x.id)}" title="خيارات ${esc(x.n)}"`
    +` aria-label="خيارات ${esc(x.n)}"${hid}>▾</button>`:"");
 return `<button type="button" data-act="${esc(x.act)}"`
  +` data-sti="${esc(x.id)}" class="${esc(x.cls||"")}"`
  +` title="${esc(x.t||x.n)}" aria-label="${esc(x.n||x.t||x.id)}"`
  +`${hid}>${ic(x.ico)}`
  +(x.n?`<span class="lb">${esc(x.n)}</span>`:"")+`</button>`;
}
export function buildStatus(){
 const box=$("#stItems");
 if(!box)return 0;
 box.innerHTML=ITEMS.map(html).join("");
 return ITEMS.length;
}
/* ═══ المزامنة ═══ رخيصةٌ: تُنادى مع كل تحديثٍ للواجهة ═══
   لا مذاكرةَ في مستوى الوحدة: buildStatus يعيد بناء العناصر إلى
   نصوصها المُعلَنة بلا تصفيرها، فمذاكرةٌ هنا تكذب بعد أي إعادة
   بناء. القارن هو محتوى العنصر نفسه. */
export function syncStatus(){
 const box=$("#stItems");
 if(!box)return;
 box.querySelectorAll("[data-rb]").forEach(b=>{
  const on=!!+S.rb[b.dataset.rb];
  b.classList.toggle("on",on);
  b.setAttribute("aria-pressed",on?"true":"false");
 });
 const sh=box.querySelector('[data-act="stSheet"]');
 if(sh)sh.classList.toggle("on",!!+S.sheet.on);
 const pl=box.querySelector('[data-act="stPlots"]');
 if(pl){
  const on=!!+S.opt.plotsOnly;
  pl.classList.toggle("on",on);
  pl.setAttribute("aria-pressed",on?"true":"false");
  const lb=pl.querySelector(".lb"), t=on?"طباعة فقط ✓":"طباعة فقط";
  if(lb&&lb.textContent!==t)lb.textContent=t;
 }
 const lk=box.querySelector('[data-act="stLock"]');
 if(lk){
  lk.classList.toggle("on",!!UIS.lockUI);
  lk.title=UIS.lockUI?"تخطيط اللوحات مقفل":"قفل تخطيط اللوحات";
 }
 const cl=box.querySelector('[data-act="clean"]');
 if(cl)cl.classList.toggle("on",!!UIS.clean);
 const sc=box.querySelector('[data-act="stScale"] .lb');
 const scv=scl(S.meta.scale);
 if(sc&&sc.textContent!==scv)sc.textContent=scv;
 /* تكاملٌ مع العلوي: الحالة تُقرأ من مصدرها لا نسخةً ثانية */
 const jn=box.querySelector('[data-act="joinsTog"]');
 if(jn)jn.classList.toggle("on",!!+S.opt.joins);
 const so=box.querySelector('[data-act="soloTog"]');
 if(so)so.classList.toggle("on",!!+S.opt.colSolo);
 ["undo","redo"].forEach(k=>{
  const src=$("#b"+k[0].toUpperCase()+k.slice(1));
  const b=box.querySelector(`[data-act="${k}"]`);
  if(src&&b)b.disabled=src.disabled;
 });
 const qp=box.querySelector('[data-act="qpTog"]');
 if(qp)qp.classList.toggle("on",!!UIS.qp);
 const w=box.querySelector('[data-act="stWarn"]');
 if(!w)return;
 let n=0, tip="لا ملاحظات";
 try{
  const s=scene(), P=[];
  if(s.bad)P.push(`${s.bad} فتحة معطوبة`);
  if(s.stale)P.push(`${s.stale} منطقة قديمة`);
  if(s.loose)P.push(`${s.loose} بُعداً معلَّقاً`);
  if(s.over)P.push(`${s.over} بُعداً بنصّ بديل`);
  if(s.hidden)P.push(`${s.hidden} كياناً مخفيّاً`);
  n=s.bad+s.stale+s.loose+s.over+s.hidden;
  if(P.length)tip=P.join(" · ");
 }catch(e){}
 const lb=w.querySelector(".lb");
 const txt=n?String(n):"—";
 if(lb&&lb.textContent!==txt)lb.textContent=txt;
 w.classList.toggle("bad",n>0);
 w.title=tip+" — انقر للفاحص";
}
/* ═══ قائمة التخصيص ═══ */
export function custOpen(x,y){
 const m=$("#stMenu");
 if(!m)return;
 const rtl=getComputedStyle(document.documentElement)
  .direction==="rtl";
 m.innerHTML=`<div class="pmH">عناصر شريط الحالة</div>`
  +ITEMS.filter(i=>i.opt).map(i=>
   `<button type="button" class="pmI" data-stc="${esc(i.id)}">`
   +`${ic(i.ico||"panel")}<span>${esc(i.n||i.id)}</span>`
   +`<span class="ky">${shownOf(i.id)?"●":""}</span></button>`)
   .join("")
  +`<div class="pmS"></div>`
  +`<button type="button" class="pmI" data-stc="__all">`
  +`${ic("grid")}<span>أظهر الكل</span></button>`;
 m.hidden=false;
 const w=m.offsetWidth||226, h=m.offsetHeight||300;
 const cl=(v,a,b)=>v<a?a:(v>b?b:v);
 m.style.insetInlineStart=Math.round(
  cl(rtl?(innerWidth-x-4):(x-w+4),4,innerWidth-w-4))+"px";
 m.style.insetBlockStart=Math.round(cl(y-h-8,4,innerHeight-h-8))+"px";
}
export const custClose=()=>{
 const m=$("#stMenu");
 if(m)m.hidden=true;
};
function custRun(id){
 UIS.stHide=UIS.stHide||{};
 if(id==="__all"){
  UIS.stHide={};
  HOOK.report("in","أُظهرت كل عناصر شريط الحالة");
 }else{
  const it=stItem(id);
  if(!it||!it.opt)return;
  if(UIS.stHide[id])delete UIS.stHide[id]; else UIS.stHide[id]=1;
  HOOK.report("in",`${it.n||id}: ${shownOf(id)?"ظاهر":"مخفيّ"}`);
 }
 saveUI();
 buildStatus();
 syncStatus();
 HOOK.toggles();
 custOpen(innerWidth/2,innerHeight-30);
}
/* ═══ التوصيل ═══
   المفاتيح [data-rb] يتولّاها app.js بالتفويض على #status، فلا
   تُربَط هنا مرّةً ثانية. */
export function wireStatus(){
 buildStatus();
 const box=$("#stItems");
 if(!box)return false;
 document.addEventListener("click",e=>{
  const c=e.target.closest("[data-stc]");
  if(c){custRun(c.dataset.stc); return}
 });
 addEventListener("mousedown",e=>{
  const m=$("#stMenu");
  if(!m||m.hidden)return;
  if(!m.contains(e.target)&&!e.target.closest('[data-act="stCust"]'))
   custClose();
 },true);
 addEventListener("keydown",e=>{
  const m=$("#stMenu");
  if(e.key==="Escape"&&m&&!m.hidden){
   e.preventDefault(); e.stopPropagation(); custClose();
  }
 },true);
 return true;
}
/* ═══ أفعالٌ يملكها الشريط ═══ */
export function stSheet(){
 edit(()=>{S.sheet.on=+S.sheet.on?0:1});
 HOOK.report("in",`الورقة: ${+S.sheet.on?"ظاهرة":"مخفيّة"}`);
 HOOK.refresh(0);
}
export function stPlots(){
 S.opt.plotsOnly=+S.opt.plotsOnly?0:1;
 touchView();          /* تُبطل كاش المشهد بلا خطوة تاريخ */
 autosave();
 HOOK.report("in",`معاينة الطباعة: ${+S.opt.plotsOnly
  ?"مفعّلة — ما لا يُطبَع مخفيّ من العرض":"مُطفأة"}`);
 HOOK.refresh(0);
 syncStatus();
}
export function stLock(){
 uiSet("lockUI",UIS.lockUI?0:1);
 syncStatus();
 HOOK.report("in",UIS.lockUI
  ?"تخطيط اللوحات مقفل — لا سحبَ ولا تحجيم"
  :"تخطيط اللوحات مفتوح");
}
