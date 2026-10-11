/* ═══ «مؤخّراً» ═══ المرحلة ١ من خطّة الواجهة (audit/10-ui-plan.md)
   العيبُ المقيسُ: ٨١٪ من عناصرِ الشريطِ وراءَ منسدلة. والبحثُ يحلُّ
   مشكلةَ **العثور**، وهذا الشريطُ يحلُّ ما بعدها: الأداةُ التي
   استعملتَها قبل دقيقةٍ لا يصحُّ أن تُبحَث من جديد.

   ستٌّ لا أكثر: سبعةٌ تُزحِم الترويسةَ وتُفقِد البلاطاتِ ثباتَ
   الموضعِ — والثباتُ هو كلُّ قيمةِ شريطٍ كهذا (تحفظ عينُك موضعَ
   الأداةِ فتنقرها بلا قراءة). والأحدثُ **يمينَ** الشريطِ لا يساره:
   اتجاهُ القراءةِ العربيُّ يبدأ من اليمين، فالأحدثُ أقربُ إلى حيث
   تنظر، والعنصرُ المنسيُّ يخرج من الطرفِ البعيد.

   ولا يُعلَن فارغاً: `hidden` حتى أوّلِ استعمالٍ، فلا مساحةٌ تطلب
   انتباهاً بلا محتوى. ولا يُعرَض فيه فعلٌ ولا نافذةٌ — الأدواتُ
   وحدَها: «تصدير PDF» ليس شيئاً تكرّره في الدقيقة.

   والحالةُ تُحفَظ في تفضيلاتِ الواجهة: شريطٌ يتعلّم ثم يُنسى كلَّ
   صباحٍ لا يتعلّم. */
import * as R from "../tools/registry.js";
import {UIS,uiSet} from "./store.js";
import {icon as ic} from "./icons.js";
import {escapeHtml as esc} from "../core/escape.js";
import {HOOK} from "./bus.js";

export const RECENT_MAX=6;
const $=s=>document.querySelector(s);
const bar=()=>$("#recent");

/* الأدواتُ وحدَها، والمعرّفُ يجب أن يكون حيّاً: أداةٌ حُذِفت من بناءٍ
   لاحقٍ تخرج من الشريطِ ولا تُعرَض زرّاً يكسر. */
const live=id=>{
 const d=R.findTool(id);
 return (d&&d.id===id)?d:null;
};

export function recentList(){
 return (UIS.recent||[]).filter(live).slice(0,RECENT_MAX);
}
/* تسجيلُ استعمال: الأحدثُ أوّلاً، ولا تكرار. */
export function noteUse(id){
 const k=String(id||"");
 if(!live(k))return false;
 const L=[k].concat((UIS.recent||[]).filter(x=>x!==k))
  .slice(0,RECENT_MAX);
 uiSet("recent",L);
 renderRecent(); renderThumb();
 return true;
}
export function clearRecent(){
 uiSet("recent",[]);
 renderRecent(); renderThumb();
 return true;
}
/* ═══ شريطُ الإبهام ═══ المرحلة ٧ من audit/10-ui-plan.md
   العيبُ المقيس: البحثُ و«مؤخّراً» وشريطُ الوصولِ السريعِ كلُّها في
   `#top` — **أعلى الشاشة**، وعلى ≤٧٦٨ بكسلاً تُمرَّر الترويسةُ أفقياً
   ويفقد زرُّ البحثِ تسميتَه. فأكثرُ ثلاثةِ أسطحٍ استعمالاً تجلس في
   المنطقةِ **الأبعدِ عن الإبهام**، والهاتفُ يُمسَك بيدٍ واحدةٍ.
   فعلى الهاتفِ وحدَه يُبنى شريطٌ أسفلَ الشاشةِ فوقَ الشريطِ السفليِّ:
   **بحثٌ + ستُّ أدواتٍ** — وهو حرفُ ما طلبته الخطّة.

   ولا يُكرَّر سطحٌ بصرياً: `#recent` يُخفى على الهاتفِ بالتنسيقِ،
   فواحدٌ يُرى في كلِّ عرضٍ لا اثنان.

   ═══ ولِمَ بذرةٌ مُعلَنةٌ؟ ═══
   «الستُّ الأكثرُ استعمالاً» لا وجودَ لها في أوّلِ جلسةٍ: السجلُّ
   فارغٌ، فيبقى الشريطُ زرَّ بحثٍ وحدَه فيما أثمنُ مساحةٍ في الشاشةِ
   خاليةٌ. فتُعلَن ستٌّ تُكمِل الناقصَ، والمُستعمَلُ **يسبقها** دائماً
   فيدفعها خارجاً مع الاستعمال. واختيارُها ليس ذوقاً: جدارٌ وبابٌ
   وشباكٌ هي ثلاثةُ أرباعِ أيِّ مخطَّطٍ معماريٍّ، والبُعدُ والنقلُ
   والنصُّ أشيعُ ما يليها (وهي بعينها ما اختارته `BEGINNER` للمبتدئ).

   والتسميةُ صادقةٌ: «أدواتٌ سريعة» لا «مؤخّراً» — بذرةٌ لم تُستعمَل
   بعد، فتسميتُها «استعملتَها مؤخّراً» كذبٌ صغيرٌ يُفقِد الثقةَ. */
export const QUICK_N=6;
export const QUICK_SEED=["wall","door","win","dim","move","text"];
export function quickList(){
 const L=recentList();
 for(const id of QUICK_SEED){
  if(L.length>=QUICK_N)break;
  /* البذرةُ تُفحَص حيّةً كغيرِها: أداةٌ أُعيدت تسميتُها لا تُعرَض
     زرّاً يكسر. */
  if(!L.includes(id)&&live(id))L.push(id);
 }
 return L.slice(0,QUICK_N);
}
const thumbBar=()=>$("#thumb");
export function renderThumb(){
 const B=thumbBar();
 if(!B)return 0;
 const L=quickList();
 const used=new Set(recentList());
 B.innerHTML=`<button type="button" id="thSrch" data-rcsrch="1"`
  +` title="ابحث عن أداةٍ أو أمر" aria-label="ابحث عن أداةٍ أو أمر">`
  +`${ic("search",18)||"⌕"}</button>`
  +`<span class="thDv" aria-hidden="true"></span>`
  +L.map(id=>{
   const d=live(id);
   if(!d)return "";
   const nm=d.label||id;
   /* التلميحُ يفرّق المُستعمَلَ من البذرةِ، فلا يُوهَم المستخدمُ أنّه
      استعمل ما لم يستعمله. */
   return `<button type="button" data-rc="${esc(id)}"`
    +` title="${esc(nm)}${used.has(id)?" — استعملتَها مؤخّراً":""}"`
    +` aria-label="${esc(nm)}">${ic(d.ico||"tool",18)}</button>`;
  }).join("");
 return L.length;
}
export function renderRecent(){
 const B=bar();
 if(!B)return 0;
 const L=recentList();
 if(!L.length){B.hidden=true; B.innerHTML=""; return 0}
 B.hidden=false;
 B.innerHTML=L.map(id=>{
  const d=live(id);
  const nm=d.label||id;
  return `<button type="button" data-rc="${esc(id)}"`
   +` title="${esc(nm)} — استعملتَها مؤخّراً"`
   +` aria-label="${esc(nm)}">${ic(d.ico||"tool",16)}</button>`;
 }).join("");
 return L.length;
}
/* ═══ فتحُ البحثِ خطّافٌ لا استيرادٌ ═══
   `palette.js` يستورد `noteUse` من هذا الملفّ، فاستيرادُ `paletteOpen`
   عكساً دورة. فالخطّافُ يُحقَن من `wirePalette` — وهو النمطُ نفسُه
   المستعملُ في النسخةِ الخارجيةِ ومفتاحِ الرسم. وغيابُ الخطّافِ
   **يُعلَن** ولا يُبلَع: زرٌّ لا يفعل شيئاً أسوأُ من زرٍّ يشكو. */
let SEARCH=null;
export const setSearchHook=fn=>{SEARCH=(typeof fn==="function")?fn:null};
function openSearch(){
 if(SEARCH){SEARCH(); return true}
 HOOK.report("wr","لوحةُ الأوامرِ لم تُوصَل بعد — جرّب Ctrl+K");
 return false;
}
/* ═══ توصيلُ شريطِ الإبهام ═══ مستمعٌ واحدٌ على الحاملِ: الشريطُ
   يُعاد بناؤه مع كلِّ استعمالٍ، فمستمعاتُ الأزرارِ تتسرّب (P2-001). */
export function wireThumb(){
 const B=thumbBar();
 if(!B)return false;
 if(B.dataset.wired)return true;
 B.dataset.wired="1";
 B.addEventListener("click",e=>{
  const s=e.target.closest&&e.target.closest("[data-rcsrch]");
  if(s){e.preventDefault(); openSearch(); return}
  const b=e.target.closest&&e.target.closest("[data-rc]");
  if(!b)return;
  e.preventDefault();
  runTool(b.dataset.rc);
 });
 renderThumb();
 return true;
}
/* تشغيلُ أداةٍ من أيِّ الشريطَين — منطقٌ واحدٌ لا نسختان تتفرّقان */
function runTool(id){
 if(!live(id)){
  /* أداةٌ ذهبت بين بناءَين — تُنظَّف ولا تُبلَع */
  uiSet("recent",(UIS.recent||[]).filter(x=>x!==id));
  renderRecent(); renderThumb();
  HOOK.report("in","أداةٌ من سجلِّ الاستعمال لم تعد موجودةً — أُزيلت");
  return false;
 }
 R.histAdd(id);
 noteUse(id);
 R.begin(id);
 HOOK.prompt();
 return true;
}
export function wireRecent(){
 const B=bar();
 if(!B)return false;
 /* تفويضٌ واحدٌ على الحاملِ لا مستمعٌ لكلِّ زرّ: الشريطُ يُعاد بناؤه
    مع كلِّ استعمالٍ، فمستمعاتُ الأزرارِ كانت ستتسرّب (P2-001). */
 B.addEventListener("click",e=>{
  const b=e.target.closest("[data-rc]");
  if(!b)return;
  e.preventDefault();
  runTool(b.dataset.rc);
 });
 renderRecent();
 /* وشريطُ الإبهامِ يُوصَل معه: مُنادٍ واحدٌ في `app.js` لا اثنان
    يُنسى أحدُهما. */
 wireThumb();
 return true;
}
