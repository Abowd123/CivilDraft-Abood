/* ═══ خريطة المفاتيح العامّة ═══ D12-EP7: مستخرَجة من app.js بلا تغيير
   سلوك. كلُّ اختصارٍ يصعد هنا بصرف النظر عن الطبقة النشطة، وحارسُ
   حقول الإدخال في موضعه نفسه
   (D12-EP1: Ctrl+K/Shift+P بعد حارس الكتابة). */
import * as R from "../tools/registry.js";
import * as E from "../core/ents.js";
import {jrAdd,jrTaint} from "../core/journal.js";
import {S,undo,redo,edit,editFailed,touch,autosave}
 from "../core/state.js";
import {showAll} from "../core/layers.js";
import {m2} from "../core/units.js";
import {osSummary} from "../core/osnap.js"; /* مصحَّح: كان "../tools/osnap.js" — الملفّ الفعليّ في core/ (طابق app.js) */
import {UIS} from "./store.js";
import {setShift,draw,selectAll,delSel,setSel,selList,
        navSet,navMode} from "./canvas.js";
import {eInfo,rep,refresh,syncToggles} from "./props.js";
import {setMin} from "./ribbon/render.js"; /* مصحَّح: setMin يُصدَّر من render.js لا wire.js — طابق app.js */
import {setClean,setTheme} from "./ribbon/wire.js";
import {isOpen as appMenuOpen,close as closeAppMenu} from "./appmenu.js"; /* مصحَّح: كان بلا الاسمين المستعارين appMenuOpen/closeAppMenu — طابق app.js */
import {ctxIsOpen,ctxClose} from "./ctxmenu.js";
import {historyPanelOpen,closeHistoryPanel,toggleHistoryPanel,endCompareIfActive}
 from "./historypanel.js";
import {qpToggle} from "./quickprops.js";
import {paletteToggle,paletteClose,paletteIsOpen} from "./palette.js";
import {hideDyn,dynRoute} from "./dyninput.js";
import {runInspect} from "./inspector.js";
import {isInserting,onKey as onBlockKey} from "../tools/blocks.js"; /* مصحَّح: كان onBlockKey بلا استعارة الاسم — طابق app.js */
import {toggleBlockPanel} from "./blockpanel.js";
import {help} from "./helppan.js";

const $=s=>document.querySelector(s);
const ARR={ArrowLeft:[-1,0],ArrowRight:[1,0],
 ArrowUp:[0,1],ArrowDown:[0,-1]};

function nudge(dx,dy){
 edit(()=>selList().forEach(s=>{
  const o=E.grabOf(s);
  if(o)E.moveEnt(s,o,dx,dy);
 }),"تحريك بالمفاتيح");
}
/* ═══ مفاتيح الحالة ═══ تُصدَّر لأنّ تفويض شريط الحالة يستعملها أيضاً */
export function rbToggle(k){
 S.rb[k]=S.rb[k]?0:1;
 if(k==="ortho"&&S.rb.ortho)S.rb.polar=0;
 if(k==="polar"&&S.rb.polar)S.rb.ortho=0;
 touch(); syncToggles(); autosave(); draw();
 if(k==="dyn"&&!S.rb.dyn)hideDyn();
 const AR={snap:"التقاط الكائنات",ortho:"التعامد",
  polar:"التتبّع القطبي",grips:"المقابض",ends:"علامات الأطراف",
  grid:"الشبكة",gsnap:"الالتقاط على الخطوة",
  paths:"مسارات الجدران",dyn:"الإدخال الحركي"};
 eInfo(`${AR[k]||k}: ${S.rb[k]?"مُشغّل":"مُوقف"}`
  +(k==="snap"&&S.rb[k]?" · "+osSummary():"")
  +(k==="polar"&&S.rb[k]?` · كل ${S.pol.inc}°`:"")
  +(k==="gsnap"&&S.rb[k]?` · كل ${m2(S.meta.snap)} م`:""));
}

/* ═══ التوصيل ═══ */
export function initKeymap(ctx){
 const cl=ctx.cl, syncPrompt=ctx.syncPrompt;
 if(!cl)return false;

 addEventListener("keydown",e=>{
  setShift(e.shiftKey);
  const tg=(e.target.tagName||"").toLowerCase();
  const inCl=(e.target===cl);
  const typing=!inCl&&(tg==="input"||tg==="select"||tg==="textarea");
  const ck=e.ctrlKey||e.metaKey;
  const k=(e.key||"").toLowerCase();

  if(e.key==="Escape"){
   const hb=$("#helpBox");
   if(hb&&!hb.hidden){e.preventDefault();hb.hidden=true;return}
  }
  if(e.key==="Escape"&&endCompareIfActive()){e.preventDefault(); return}
  if(e.key==="Escape"&&historyPanelOpen()){
   e.preventDefault(); closeHistoryPanel(); return;
  }
  if(e.key==="Escape"&&appMenuOpen()){
   e.preventDefault(); closeAppMenu(); return;
  }
  if(e.key==="Escape"&&navMode()){
   e.preventDefault(); navSet(null); eInfo(""); return;
  }
  if(e.key==="Escape"&&ctxIsOpen()){
   e.preventDefault(); ctxClose(); return;
  }
  if(isInserting()&&onBlockKey(e)){e.preventDefault();return}
  if(ck&&e.key==="F1"){e.preventDefault();
   setMin(!UIS.ribbonMin); dispatchEvent(new Event("resize")); return}
  /* لكلٍّ بديلٌ لا يحتجزه المتصفّح، والأصل يبقى لمن يعمل عنده */
  if((ck&&e.key==="0")||(ck&&e.shiftKey&&k==="c")){e.preventDefault();
   setClean(!UIS.clean); return}
  if(ck&&e.shiftKey&&(k==="t"||k==="m")){e.preventDefault();
   setTheme(UIS.theme==="dark"?"light":"dark"); return}
  if(e.key==="F1"){e.preventDefault();help();return}
  if(e.key==="F3"){e.preventDefault();rbToggle("snap");return}
  if(e.key==="F7"){e.preventDefault();runInspect();return}
  if(e.key==="F8"){e.preventDefault();rbToggle("ortho");return}
  if(e.key==="F10"){e.preventDefault();rbToggle("polar");return}
  if(e.key==="F11"){e.preventDefault();rbToggle("grips");return}
  if(e.key==="F12"||(ck&&e.shiftKey&&k==="e")){
   e.preventDefault(); rbToggle("ends"); return;
  }
  if(e.key==="F6"){e.preventDefault();rbToggle("grid");return}
  if(e.key==="F9"){e.preventDefault();rbToggle("gsnap");return}
  if(ck&&e.shiftKey&&k==="l"){
   e.preventDefault();
   const n=edit(()=>showAll(),"إظهار كل الطبقات");
   if(editFailed())return;
   rep(n?"ok":"in",n?`أُظهرت ${n} طبقة`:"كل الطبقات ظاهرة");
   refresh(false); return;
  }
  if(ck&&k==="d"&&!e.shiftKey){e.preventDefault();
   rbToggle("dyn"); return}
  if(ck&&e.shiftKey&&k==="q"){e.preventDefault(); qpToggle(); return}
  if(e.key==="Escape"&&paletteIsOpen()){
   e.preventDefault(); paletteClose(); return;
  }
  if(ck&&e.shiftKey&&k==="h"){e.preventDefault();
   toggleHistoryPanel(); return}
  if(ck&&k==="z"){
   e.preventDefault();
   const ok=e.shiftKey?redo():undo();
   if(ok)jrTaint(e.shiftKey?"إعادة":"تراجع");
   eInfo(ok?(e.shiftKey?"اتعملت إعادة":"اتعمل تراجع")
    :"مافيش حاجة تتراجع عنها");
   return;
  }
  if(inCl){
   const passS=ck&&k==="s";
   const passEmpty=!cl.value
    &&(e.key==="Delete"||e.key==="Backspace"||ARR[e.key]);
   if(!passS&&!passEmpty)return;
  }
  if(typing){if(e.key==="Escape")e.target.blur();return}
  /* D12-EP1: نُقل اختصارُ اللوحة إلى ما بعد حارس حقل الإدخال —
     كتابة P الكبيرة داخل أي حقل لم تعد تفتح اللوحة، والمسافة في
     سطر الأوامر لم تعُد تُسرَق. */
  if(ck&&(k==="k"||(e.shiftKey&&k==="p"))){
   e.preventDefault(); paletteToggle(); return;
  }
  if(!typing&&!inCl&&!ck&&!e.altKey&&k==="b"){
   e.preventDefault();toggleBlockPanel();return;
  }
  if(ck&&k==="a"){e.preventDefault();eInfo(`${selectAll()} محدد`);return}
  if(ck&&k==="s"){
   e.preventDefault();
   const b=$("#xSave");
   if(b)b.click();
   return;
  }
  if(e.key==="Escape"){
   hideDyn();
   /* jrAdd نفسها تدمج الإسكيب المتتالي: سطرٌ واحد مهما ضغطت */
   if(R.active()){jrAdd("esc"); R.cancel()}
   else{jrAdd("esc"); setSel([],null)}
   syncPrompt(); draw(); return;
  }
  if(e.key==="Delete"||e.key==="Backspace"){
   if(!R.active()){
    e.preventDefault();
    const r=delSel();
    if(r)eInfo("حُذف "+E.delSay(r)
     +(r.skipped?` · تُخطّي ${r.skipped}`:""));
   }
   return;
  }
  if(e.key==="Enter"||e.key===" "){
   /* لا تسرق كتابةً معلّقة في سطر الأوامر: السطر غير الفارغ يعني
      أن المستخدم في منتصف مقاسٍ/إحداثي/اسم أمر.
      (حارس «Space داخل حقل آخر» غير لازم هنا: typing/inCl أعلاه
      يُخرجان قبل بلوغ هذا الموضع. ولو شُرط activeElement===cl
      لتعطّل تكرار الأمر بالمسافة من اللوحة.) */
   if(cl.value.trim()!=="")return;
   e.preventDefault();
   if(R.active()){jrAdd("enter"); R.enter()}
   else if(R.T.last){jrAdd("enter"); R.begin(R.T.last,R.T.lastArg)}
   else return;
   syncPrompt(); draw(); return;
  }
  if(ARR[e.key]&&!R.active()&&selList().length){
   e.preventDefault();
   const st=Math.max(1,S.meta.snap)*(e.shiftKey?10:1);
   nudge(ARR[e.key][0]*st, ARR[e.key][1]*st);
   return;
  }
  /* أي حرف مطبوع يذهب إلى سطر الإدخال — كما في أوتوكاد */
  if(!ck&&!e.altKey&&e.key.length===1){
   if(dynRoute(e.key)){e.preventDefault(); return}
   cl.focus();
   return;
  }
 });
 addEventListener("keyup",e=>setShift(e.shiftKey));
 return true;
}
