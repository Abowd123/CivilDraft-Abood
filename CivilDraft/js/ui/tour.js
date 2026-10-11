/* ═══ جولة أول تشغيل ═══ */
import {S} from "../core/state.js";
import {setOpt,begin,cancel} from "../tools/registry.js";
import {SIZES,applySize} from "../tools/presets.js";
import {paletteIsOpen} from "./palette.js";
import {HOOK} from "./bus.js";
import {escapeHtml as esc} from "../core/escape.js";

/* ═══ هجرة المفتاح من الاسم القديم — دفعة 3.9 ═══
   نُسيت هذه الوحدة في دفعات الهجرة السابقة (ai/net.js, ui/store.js,
   tools/registry.js, core/pricing.js, core/code.js) رغم أنها تكتب
   مباشرةً في «mistar.tour» بلا أي مسارِ هجرة. النسخ لا النقل، والقديم
   يبقى نسخةً احتياطية صامتة — كأخواتها. */
const K="civildraft.tour";
const OLD_K="mistar.tour";
let MIGD=false;
function migrateKey(){
 if(MIGD)return; MIGD=true;
 if(typeof localStorage==="undefined")return;
 try{
  if(localStorage.getItem(K)!==null)return;
  const v=localStorage.getItem(OLD_K);
  if(v!==null)localStorage.setItem(K,v);
 }catch(e){}
}
const $=s=>document.querySelector(s);
const size=id=>SIZES.find(p=>p.id===id);
const seen=()=>{migrateKey();try{return localStorage.getItem(K)==="1"}catch(e){return true}};
const mark=()=>{try{localStorage.setItem(K,"1")}catch(e){}};
const STEPS=[
 {t:"أهلاً بك في CivilDraft",s:"الإدخال بالمتر، والتخزين بالمليمتر. سطر الإدخال أسفل اللوحة هو مركز الأوامر. ست خطوات قصيرة ونصير جاهزين."},
 {t:"١ · ارسم غرفة",s:"فعّلتُ أداة «مستطيل» بسماكة ٠٫٢٥ م. انقر ركناً ثم اكتب <code>4x3</code> واضغط Enter.",
  go(){setOpt("rect","t","0.25");setOpt("rect","type","ext");setOpt("rect","align","l");begin("rect")},
  ok(){return S.walls.length>=4}},
 {t:"٢ · ضع باباً",s:"فعّلتُ «باب غرفة» ٠٫٩٠ × ٢٫١٠ م. انقر على أي جدار، وEsc ينهي الأداة.",
  go(){const p=size("s.door.room");if(p)applySize(p)},ok(){return S.opens.some(o=>/^(door|double|sliding)$/.test(o.kind))}},
 {t:"٣ · ضع شباكاً",s:"فعّلتُ «شباك غرفة نوم» ١٫٥٠ × ١٫٤٠ م. انقر على جدار خارجي.",
  go(){const p=size("s.win.room");if(p)applySize(p)},ok(){return S.opens.some(o=>/^(window|fixed)$/.test(o.kind))}},
 {t:"٤ · اخبز المنطقة",s:"فعّلتُ أداة «منطقة». انقر داخل الغرفة فتُحسَب مساحتها وتُحفظ ككائن مستقل.",
  go(){cancel(true);begin("area")},ok(){return S.areas.length>=1}},
 {t:"٥ · افحص عملك",s:"اضغط <b>F7</b>. الفاحص يجمع الملاحظات الهندسية واشتراطات التصميم، ويخبرك ولا يصلح."},
 {t:"٦ · لوحة الأوامر",s:"اضغط <b>Ctrl+K</b>. ابحث بالعربية أو اللاتينية عن الأدوات والمقاسات والقوالب.",
  ok(){return paletteIsOpen()}},
 {t:"٧ · اللمس",s:"على تابلت أو جوال: قرصة بإصبعين للتكبير، وسحب بإصبعين للتحريك، وضغطٌ مطوّل لقائمة السياق. زر ☰ أسفل الشاشة يفتح لوحة الخصائص."},
 {t:"جاهز",s:"كده تمام! <b>F1</b> للمساعدة · <b>Ctrl+Z</b> يرجّع اللي فات · <b>Ctrl+S</b> يحفظ. وارتاح: شغلك بيتحفظ لوحده."}
];
let I=-1,TM=null;
const stop=()=>{if(TM){clearInterval(TM);TM=null}};
export function tourEnd(q){
 stop();I=-1;mark();const B=$("#tour");if(B)B.hidden=true;
 if(!q)HOOK.report("in","انتهت الجولة — Ctrl+K لكل شيء");
}
function watch(){
 stop();const st=STEPS[I];if(!st?.ok)return;
 TM=setInterval(()=>{let done=false;try{done=!!st.ok()}catch(e){}
  if(done)go(I+1,1)},400);
}
function render(){
 const B=$("#tour"),st=STEPS[I];if(!B||!st)return;
 B.innerHTML=`<div class="tc" role="note"><div class="th"><b>${esc(st.t)}</b>
  <span class="tn">${I+1} من ${STEPS.length}</span></div><div class="tb">${st.s}</div>
  <div class="tf"><button data-t="next">${I+1<STEPS.length?(st.ok?"تخطّ هذه":"التالي"):"تمّ"}</button>
  <button data-t="end" class="gh">أنهِ الجولة</button></div></div>`;
 B.hidden=false;
}
function go(i,auto){
 stop();if(i>=STEPS.length){tourEnd();return}I=i;const st=STEPS[I];
 if(st.go){try{st.go()}catch(e){HOOK.report("wr",e.message)}}
 render();if(auto)HOOK.report("ok","تمّت الخطوة");HOOK.prompt();watch();
}
export function tourStart(){go(0)}
export const tourActive=()=>I>=0;
export function tourMaybe(safe,had){
 if(safe||had||seen()||S.walls.length||S.areas.length)return false;
 setTimeout(tourStart,700);return true;
}
export function wireTour(){
 const B=$("#tour");if(!B)return;B.hidden=true;
 B.addEventListener("click",e=>{
  const b=e.target.closest("[data-t]");if(!b)return;
  if(b.dataset.t==="end")tourEnd();else go(I+1);
 });
}