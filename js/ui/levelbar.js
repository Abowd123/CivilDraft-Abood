/* ═══ شارة الطابق النشط — L3 · F4 ═══
   يُظهر المستوى النشط وعدد عناصره، وزران يدوِّران الطوابق عبر
   edit({bump:"view"}) — تعديلُ عرضٍ (meta.level) لا هندسة ولا طبقة.
   ومفتاحٌ ثالثٌ (allBtn) يبدّل S.opt.levelAll: المشهد يرسم الطابق
   النشط وحده افتراضاً (F4)، وهذا المفتاح يعيده مكدَّساً كل
   الطوابق معاً — صريحاً لا ضمنياً.

   ذاتيّ التركيب دفاعاً: يعثر على حاضنٍ محتمل (#status ثم #stItems
   ثم أيّ footer ثم body) فإن غاب الكلّ لم ينهَر. والأساليب تُضبَط
   عبر CSSOM لا عبر سلسلة style — الطريقة المتوافقة مع CSP الصارم
   التي يستعملها props.js#paintBg (el.style.x= لا setAttribute
   ("style",...)). */
import {S,edit} from "../core/state.js";
import {levelsOf,levelCounts,levelLabel,levelTag,
        nextLevelFrom,activeLevel} from "../core/level.js";

let root=null, lab=null, cnt=null, prev=null, next=null, allBtn=null,
    ghostBtn=null, mounted=false;

function setCss(el,css){
 Object.assign(el.style,{
  display:"inline-flex", alignItems:"center", gap:"5px",
  padding:"0 6px", height:"22px", borderRadius:"4px",
  font:"12px Tahoma,Arial,sans-serif", direction:"rtl",
  background:"rgba(127,140,155,.18)", color:"inherit",
  border:"1px solid rgba(127,140,155,.35)",
  marginInlineStart:"8px", userSelect:"none", ...css});
}
function btn(el,dir){
 setCss(el,{
  background:"transparent", border:"none", cursor:"pointer",
  padding:"0 6px", height:"100%", fontSize:"11px", color:"inherit"});
 el.title=dir>0?"الطابق التالي":"الطابق السابق";
 el.type="button";
}
/* ═══ مفتاح «كل الطوابق» — F4 ═══
   يبدّل S.opt.levelAll (المشهد يقرأه في render.js#levelScope). ليس
   زرَّ دورانٍ فيُميَّز بحدٍّ لا بخلفيةٍ شفّافة، وحالته مُعلَنةٌ
   aria-pressed لقارئ الشاشة. */
function allBtnCss(el,on){
 setCss(el,{
  background:on?"rgba(90,160,255,.35)":"transparent",
  border:"1px solid rgba(127,140,155,.35)", cursor:"pointer",
  padding:"0 6px", height:"100%", fontSize:"11px", color:"inherit",
  borderRadius:"3px"});
}

function host(){
 return document.getElementById("status")
  || document.getElementById("stItems")
  || document.querySelector(".status,footer.statusbar,footer")
  || document.body;
}

function mount(){
 if(mounted||typeof document==="undefined")return false;
 const h=host();
 if(!h)return false;
 root=document.createElement("div");
 root.id="lvlBar";
 setCss(root,{});
 prev=document.createElement("button"); next=document.createElement("button");
 lab=document.createElement("span");
 cnt=document.createElement("span"); setCss(cnt,{opacity:"0.75"});
 allBtn=document.createElement("button"); allBtn.type="button";
 allBtnCss(allBtn,false);
 ghostBtn=document.createElement("button"); ghostBtn.type="button";
 allBtnCss(ghostBtn,false);
 ghostBtn.textContent="شبح";
 btn(prev,-1); btn(next,1);
 prev.textContent="◀"; next.textContent="▶";
 lab.setAttribute("role","status"); lab.setAttribute("aria-live","polite");
 root.append(prev,lab,cnt,allBtn,ghostBtn,next);
 h.appendChild(root);
 prev.addEventListener("click",()=>cycle(-1));
 next.addEventListener("click",()=>cycle(1));
 allBtn.addEventListener("click",toggleAll);
 ghostBtn.addEventListener("click",toggleGhost);
 mounted=true;
 return true;
}

function refresh(){
 if(!mounted||!root)return;
 const L=activeLevel(S.meta);
 if(lab)lab.textContent=`الطابق: ${levelLabel(S)}`;
 const c=levelCounts(S)[L];
 const n=c?((c.walls||0)+(c.opens||0)+(c.areas||0)+(c.cols||0)
  +(c.stairs||0)+(c.fixt||0)+(c.roofs||0)):0;
 if(cnt)cnt.textContent=n?`${n} عنصر`:"فارغ";
 const single=levelsOf(S).length<=1;
 if(prev)prev.disabled=single;
 if(next)next.disabled=single;
 if(prev)prev.style.opacity=single?"0.4":"1";
 if(next)next.style.opacity=single?"0.4":"1";
 const all=!!+S.opt.levelAll;
 if(allBtn){
  allBtn.textContent=all?"الكلّ":"طابق";
  allBtn.title=all
   ?"يُعرَض الآن كل الطوابق معاً — اضغط للعودة إلى الطابق النشط وحده"
   :"يُعرَض الآن الطابق النشط وحده — اضغط لعرض كل الطوابق معاً";
  allBtn.setAttribute("aria-pressed",all?"true":"false");
  allBtnCss(allBtn,all);
 }
 if(ghostBtn){
  const g=!!+S.opt.ghost;
  ghostBtn.title=g
   ?"الطابق الذي تحته يظهر شبحاً باهتاً — اضغط للإخفاء"
   :"أظهر الطابق الذي تحت النشط شبحاً باهتاً للمحاذاة";
  ghostBtn.setAttribute("aria-pressed",g?"true":"false");
  allBtnCss(ghostBtn,g);
 }
}

function cycle(dir){
 const target=nextLevelFrom(S,dir);
 if(target===activeLevel(S.meta))return;
 edit(()=>{ S.meta.level=target; return target; },
  `الطابق النشط: ${levelTag(target)}`, {bump:"view"});
 refresh();
}
/* لا يمسّ S.meta.level: يبدّل نطاق العرض وحده، فيبقى الطابق النشط
   (ومن يُنشَأ عليه لاحقاً) كما كان. */
function toggleAll(){
 const on=+S.opt.levelAll?0:1;
 edit(()=>{ S.opt.levelAll=on; return on; },
  on?"عرض كل الطوابق":"عرض الطابق النشط فقط", {bump:"view"});
 refresh();
}

/* شبح الطابق السفلي: عرضٌ فقط (لا BOQ ولا تصدير) — نفس عقد levelAll */
function toggleGhost(){
 const on=+S.opt.ghost?0:1;
 edit(()=>{ S.opt.ghost=on; return on; },
  on?"إظهار شبح الطابق السفلي":"إخفاء شبح الطابق السفلي", {bump:"view"});
 refresh();
}

/* يُنادى من نقطة الإقلاع بعد تهيئة بقية اللوحات */
export function initLevelBar(){ if(mount())refresh(); }
/* يُنادى مع كل مزامنةٍ عامّة للواجهة (refresh() في props.js) —
   فأيّ مسارٍ يُبدِّل meta.level (فتح ملفّ، تراجع، استعادة) يُظهَر
   بلا حاجةٍ لتعقّب كل موضع loadState على حدة. رخيصةٌ: نفس درجة
   syncStatus/syncOverlay اللتين تُنادَيان من المسار نفسه. */
export function syncLevelBar(){ if(mounted)refresh(); }
