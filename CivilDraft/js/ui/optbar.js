/* ═══ شريط الأدوات وشريط خياراتها ═══
   الخيارات تُقرأ عند إنشاء العنصر لا قبله ولا بعده،
   فتغييرها وسط سلسلة يسري على القطعة التالية وحدها.

   ملاحظة أداء وسلوك: HOOK.prompt() تُنادى من mousemove مع كل حركة
   مؤشّر أثناء أي أداة. فكان الشريط يُهدَم ويُبنى ستّين مرّةً في
   الثانية، ويسرق التركيز من حقلٍ تكتب فيه إن حرّكتَ الفأرة.
   فانقسم قسمين:
     buildOptbar  يهدم ويبني — عند تغيّر الأداة أو تغيّر الحقول
                  الظاهرة (بصمةٌ تُقارَن، لا تخمين).
     syncOptbar   يحدّث القيَم بمقارنةٍ فلا يهدم شيئاً، ويتخطّى
                  العنصر المركَّز عليه فلا يُكتَب فوق ما تكتبه. */
import "../core/state.js";
import * as R from "../tools/registry.js";
import {icon} from "./icons.js";
import {UIS} from "./store.js";
import {HOOK} from "./bus.js";
import {escapeHtml as esc} from "../core/escape.js";

const $=s=>document.querySelector(s);
const ic=(n,s)=>UIS.icons?icon(n,s||15):"";

/* ترتيب الظهور · @ يعني أمراً لا أداة
   ويُصدَّر ليقرأه مولّدُ `docs/tools.md`: عنوانُ الزرِّ هنا هو
   اختصارُ الأداةِ، فلا يُكتَب في الوثيقةِ بيدٍ وينجرف. */
export const BAR=[
 {cmd:"",       label:"تحديد", title:"Esc", ico:"select"},
 {cmd:"sel",    label:"تحديد بالمعرّف",title:"SE", ico:"selid"},
 {sp:1},
 {cmd:"wall",   label:"جدار",   title:"W",  ico:"wall"},
 {cmd:"rect",   label:"مستطيل", title:"R",  ico:"rect"},
 {cmd:"col",    label:"عمود",   title:"K",  ico:"col"},
 {cmd:"gridcols",label:"أعمدة المحاور",title:"GK", ico:"gridcols"},
 {sp:1},
 {cmd:"door",   label:"باب",    title:"D",  ico:"door"},
 {cmd:"win",    label:"شباك",   title:"N",  ico:"window"},
 {cmd:"opening",label:"فتحة",   title:"OP", ico:"opening"},
 {cmd:"niche",  label:"كوّة",    title:"",   ico:"niche"},
 {sp:1},
 {cmd:"stair",  label:"درج",    title:"ST", ico:"stair"},
 {cmd:"wc",     label:"كرسي",   title:"",   ico:"wc"},
 {cmd:"lav",    label:"مغسلة",  title:"",   ico:"lav"},
 {cmd:"shower", label:"دُش",     title:"",   ico:"shower"},
 {cmd:"sink",   label:"مجلى",   title:"",   ico:"sink"},
 {sp:1},
 {cmd:"area",   label:"منطقة",  title:"A",  ico:"area"},
 {cmd:"arearef",label:"حدّث",    title:"AR", ico:"arearef"},
 {sp:1},
 {cmd:"move",   label:"نقل",    title:"M",  ico:"move"},
 {cmd:"copy",   label:"نسخ",    title:"CP", ico:"copy"},
 {cmd:"rotate", label:"دوران",  title:"RO", ico:"rotate"},
 {cmd:"mirror", label:"مرآة",   title:"MR", ico:"mirror"},
 {cmd:"offset", label:"إزاحة",  title:"OF", ico:"offset"},
 {sp:1},
 {cmd:"break",  label:"قطع",    title:"BR", ico:"brk"},
 {cmd:"divide", label:"قسمة",   title:"DV", ico:"divide"},
 {cmd:"trim",   label:"قصّ",     title:"TR", ico:"trim"},
 {cmd:"extend", label:"تمديد",  title:"EX", ico:"extend"},
 {cmd:"stretch",label:"شدّ",     title:"STR",ico:"stretch"},
 {cmd:"weld",   label:"لحم",    title:"WL", ico:"weld"},
 {cmd:"match",  label:"مطابقة", title:"MA", ico:"match"},
 {sp:1},
 {cmd:"dim",    label:"بُعد",    title:"D1", ico:"dim"},
 {cmd:"chain",  label:"سلسلة",  title:"CH", ico:"chain"},
 {cmd:"text",   label:"نصّ",     title:"T",  ico:"text"},
 {cmd:"lead",   label:"قائد",   title:"LE", ico:"lead"},
 {cmd:"level",  label:"منسوب",  title:"LV", ico:"level"},
 {cmd:"axis",   label:"محور",   title:"AX", ico:"axis"},
 {sp:1},
 {cmd:"measure",label:"قياس",   title:"MI", ico:"measure"},
 {cmd:"@insp",  label:"افحص",   title:"F7", ico:"inspect"}
];

let TBTN=null, lastCur=null;

export function buildTools(){
 $("#tools").innerHTML=BAR.map(b=>b.sp?`<span class="sp"></span>`
  :`<button data-cmd="${esc(b.cmd)}" title="${esc(b.title||"")}">`
   +`${ic(b.ico)}<span>${esc(b.label)}</span></button>`).join("")
  +`<span class="gap"></span>`
  +`<button id="bLall" title="Ctrl+Shift+L">${ic("layers")}`
   +`<span>أظهر الكل</span></button>`
  +`<button id="bUndo" title="تراجع · Ctrl+Z" aria-label="تراجع"`
   +` class="ico">${ic("undo")||"↶"}</button>`
  +`<button id="bRedo" title="إعادة · Ctrl+Shift+Z" aria-label="إعادة"`
   +` class="ico">${ic("redo")||"↷"}</button>`
  +`<button id="bFit" title="ملاءمة العرض">${ic("fit")}`
   +`<span>ملاءمة</span></button>`
  +`<button id="bHelp" title="المساعدة · F1" aria-label="المساعدة"`
   +` class="ico">${ic("help")||"؟"}</button>`;
 TBTN=null; lastCur=null;
}
/* ═══ إبراز الأداة النشطة — لا يعمل إلّا إن تغيّرت ═══ */
export function syncTools(){
 if(!TBTN)TBTN=[...document.querySelectorAll("#tools [data-cmd]")];
 const cur=R.active()?R.T.def.id:"";
 if(cur===lastCur)return;
 lastCur=cur;
 TBTN.forEach(b=>b.classList.toggle("on",b.dataset.cmd===cur));
}
/* ═══ شريط الخيارات ═══ */
const visFields=d=>{
 const o=R.OPT[d.id]||{};
 return (d.opts||[]).filter(f=>!f.when||f.when(o));
};

/* ═══ ثلاثةٌ ظاهرةٌ والباقي وراءَ «المزيد» ═══ المرحلة ٦ من
   audit/10-ui-plan.md
   القياسُ الذي استدعى هذا: **٣٧٩ حقلاً ظاهراً على ٩٧ أداةً، أقصاها
   تسعةٌ على أداةٍ واحدة**، و٦٠ أداةً تعرض أكثرَ من ثلاثة. وشريطٌ
   بتسعةِ حقولٍ ليس شريطَ خياراتٍ بل استمارة: يفيض على النوافذِ
   الضيّقةِ، وتُقرَأ فيه التفاوتاتُ الهندسيةُ الدقيقةُ بوزنِ العرضِ
   والارتفاع.

   والقاعدةُ تُعلَن في **الأداةِ نفسِها لا في جدولٍ ثانٍ** ينجرف عنها:
   **الوحداتُ الثلاثُ الأولى من `opts` هي الظاهرة**. فمن أراد تغييرَ
   ما يظهر رتَّبَ حقولَه، ولا مكانَ ثانيَ يُحدَّث. */
export const OPT_VIS=3;

/* ═══ الوحدةُ لا الحقلُ ═══
   الحدُّ على **ما يُقرَأ** لا على عددِ المدخلات. وأربعةُ صناديقِ «أيُّ
   الجهاتِ تُبعَّد» تُقرأ **ضابطاً واحداً** اسمُه «الجهات»، فعدُّها
   أربعةً يُخرِج أداةً سليمةً عن الحدِّ بلا سببٍ، وتفريقُها ثلاثاً
   ظاهرةً ورابعةً مخفيّةً أسوأُ من إظهارِها كلِّها. فالحقولُ التي
   تتقاسم `grp` تُرسَم ضابطاً مركَّباً واحداً وتُعَدُّ واحداً.
   والحقلُ بلا `grp` وحدةٌ بنفسه — فالأدواتُ القديمةُ لا تتغيّر حرفاً. */
function unitsOf(d){
 const U=[], byGrp=new Map();
 for(const f of visFields(d)){
  if(!f.grp){U.push({grp:null,label:f.label,fields:[f]}); continue}
  let u=byGrp.get(f.grp);
  if(!u){u={grp:f.grp,label:f.grpLabel||f.grp,fields:[]};
   byGrp.set(f.grp,u); U.push(u)}
  u.fields.push(f);
 }
 return U;
}
export const headUnits=d=>unitsOf(d).slice(0,OPT_VIS);
export const tailUnits=d=>unitsOf(d).slice(OPT_VIS);
/* ولا حقلَ يسقط بين الاثنَين: هذا ما يحرسه `optbar.test.js` بمقابلةِ
   مجموعِ المفاتيحِ بالظاهرِ أصلاً — فالترتيبُ يُخفي ولا يحذف. */

/* ═══ الافتراضُ صامتٌ ═══
   خيارٌ على افتراضِه لا شيءَ يُقال عنه؛ وخيارٌ غُيِّرَ ثمّ اختفى وراءَ
   «المزيد» **يجب أن يُنادي**، وإلّا رسم المستخدمُ بقيمةٍ لا يراها
   ويظنُّ الأداةَ معطوبة. فالعلامةُ تُحسَب من `def` لا من جدول. */
const changed=(f,o)=>{
 if(f.def===undefined)return false;
 const a=o[f.k], b=f.def;
 if(f.type==="chk")
  return (a===1||a===true||a==="1")!==(b===1||b===true||b==="1");
 return String(a==null?"":a)!==String(b==null?"":b);
};
export const tailChanged=d=>{
 if(!d)return 0;
 const o=R.OPT[d.id]||{};
 return tailUnits(d).flatMap(u=>u.fields).filter(f=>changed(f,o)).length;
};

/* البصمة: الأداة + مفاتيح الحقول الظاهرة. تغيّرها وحده يوجب البناء */
const sigOf=d=>d?(d.id+"|"+visFields(d).map(f=>f.k).join(",")):"";
let barSig=null;
/* المُنسدلُ مفتوحٌ أو لا — تُحفَظ عبر البناءِ وإلّا أُغلِق في وجهِ من
   يكتب فيه كلّما ظهر حقلٌ شرطيّ أو اختفى. */
let moreOpen=false;

/* ═══ قائمةٌ حيّةٌ لا ثابتة ═══ P-جديد (الأولوية ٤)
   كانت `items` مصفوفةً مُجمَّدةً عند تعريف الأداة. وأنماطُ التهشير
   بياناتُ مشروعٍ يضيفها المستخدمُ في «مدير الهيئة»، فلا تُعرَف وقتَ
   التعريف. فصارت تقبل دالّةً تُنادى عند كلِّ رسمٍ للشريط — والمصفوفةُ
   تعمل كما كانت حرفاً، فلا أداةَ قديمةٌ تتغيّر.
   والناتجُ المعطوب (غيرُ مصفوفةٍ) يصير فارغاً بلا رمي: شريطُ خياراتٍ
   ناقصٌ أهونُ من إقلاعٍ ساقط. */
const itemsOf=f=>{
 if(typeof f.items!=="function")return f.items||[];
 try{
  const r=f.items();
  return Array.isArray(r)?r:[];
 }catch(e){return []}
};
function ctlOf(f,v){
 const tag=`data-ok="${esc(f.k)}"`;
 /* مفتاحُ الكتابة يُعرض بجانب التسمية (CSS ::after من data-key) فيتعلّم
    المستخدم أنّ «السماكة» تُكتب t=0.25 في سطر الأوامر — بلا نصٍّ يُضاف
    إلى التسمية نفسها، فقارئُ الشاشة واختباراتُ النصّ لا تتغيّر. */
 const ky=` data-key="${esc(f.k)}"`;
 /* seg: أزرار بدل القائمة المنسدلة — نقرة واحدة بدل نقرتين.
    القيمة نفسها تُكتب عبر setOpt فلا يتغيّر شيء في التخزين. */
 if(f.type==="sel"&&f.seg)
  return `<span class="of"${ky}><span>${esc(f.label)}</span>`
   +`<span class="seg" role="radiogroup" aria-label="${esc(f.label)}">`
   +itemsOf(f).map(([iv,it])=>{
     const on=String(iv)===String(v);
     return `<button type="button" role="radio" data-seg="${esc(f.k)}"`
      +` data-v="${esc(iv)}" aria-checked="${on}"`
      +`${on?' class="on"':""}>${esc(it)}</button>`;
    }).join("")+`</span></span>`;
 if(f.type==="sel")
  return `<span class="of"${ky}><span>${esc(f.label)}</span>`
   +`<select ${tag}>`
   +itemsOf(f).map(([iv,it])=>`<option value="${esc(iv)}"`
    +`${String(iv)===String(v)?" selected":""}>${esc(it)}</option>`)
    .join("")+`</select></span>`;
 if(f.type==="chk")
  return `<label class="chk"${ky}><input type="checkbox" ${tag}`
   +`${(v===1||v===true||v==="1")?" checked":""}> `
   +`${esc(f.label)}</label>`;
 if(f.type==="num")
  return `<span class="of"${ky}><span>${esc(f.label)}</span>`
   +`<input class="num" type="number" inputmode="decimal" ${tag} `
   +`value="${esc(v)}" step="0.1"></span>`;
 /* الحقول الرقمية المكتوبة كنصّ (len/ext/int/low وأمثالها) تستفيد من
    لوحة أرقام على اللمس، أمّا "text" الحرّ (اسم/سابقة/نصّ بديل) فلا —
    لوحة أرقام عليه تمنع كتابة الحروف. */
 const numeric=f.type!=="text";
 return `<span class="of"${ky}><span>${esc(f.label)}</span>`
  +`<input class="num" type="text"`
  +(numeric?` inputmode="decimal"`:"")
  +` ${tag} value="${esc(v)}"></span>`;
}
/* الوحدةُ المركَّبةُ: تسميةٌ واحدةٌ ثمّ ضوابطُها متلاصقةً، فتُقرأ
   ضابطاً واحداً كما تُعَدُّ واحداً. */
function unitOf(u,o){
 if(!u.grp)return ctlOf(u.fields[0],o[u.fields[0].k]);
 return `<span class="of grp" role="group" aria-label="${esc(u.label)}">`
  +`<span>${esc(u.label)}</span>`
  +u.fields.map(f=>ctlOf(f,o[f.k])).join("")+`</span>`;
}
export function buildOptbar(){
 const box=$("#optbar");
 if(!box)return;
 const d=R.T.def;
 barSig=sigOf(d);
 if(!d){
  /* وضع التحديد: لا خيارات، والشريط عائم فوق الرسم فيُترك فارغاً
     (يخفيه CSS بـ :empty) بدل تغطية الرسم بنصّ إرشاد. */
  box.innerHTML="";
  return;
 }
 const o=R.OPT[d.id]||{};
 const tail=tailUnits(d), ch=tailChanged(d);
 box.innerHTML=`<span class="tl">${esc(d.label)}</span>`
  +headUnits(d).map(u=>unitOf(u,o)).join("")
  /* «المزيد» لا يظهر لأداةٍ بثلاثةٍ أو أقلّ: زرٌّ يفتح فراغاً يُعلِّم
     أنّ أزرارَ هذا الشريطِ لا تُقرأ. */
  +(tail.length?`<button type="button" id="okMore"`
   +` aria-expanded="${moreOpen}" aria-controls="okPop"`
   +` aria-label="المزيد من خيارات ${esc(d.label)}"`
   +(ch?' class="chg"':"")
   +` title="باقي الخيارات (${tail.length})">${ic("gear")||"⚙"}`
   +`<span>المزيد</span>`
   /* العدَدُ يُقال دائماً، والنقطةُ لا تُرسَم إلّا إن غُيِّر مخفيٌّ عن
      افتراضِه: الافتراضُ صامتٌ والمُغيَّرُ يُنادي. */
   +`<span class="n">${tail.length}</span>`
   /* النقطةُ والنصُّ البديلُ يُرسَمان دائماً ويُكتَمان بصنفٍ على الزرّ:
      فتحديثُهما في المزامنةِ تبديلُ صنفٍ ونصٍّ لا بناءُ HTML — والمزامنةُ
      تُنادى مع كلِّ حركةِ مؤشّرٍ فلا يجوز أن تبني. */
   +`<span class="dot" aria-hidden="true"></span>`
   +`<span class="u-sr" id="okChg">${ch?ch+" خيارٌ مُغيَّرٌ عن افتراضه":""}</span>`
   +`</button>`
   +`<div id="okPop" class="okPop${moreOpen?" on":""}" role="group"`
   +` aria-label="باقي خيارات ${esc(d.label)}"`
   +`${moreOpen?"":" hidden"}>`
   +tail.map(u=>unitOf(u,o)).join("")+`</div>`:"")
  +(d.hint?`<span class="hint">${esc(d.hint)}</span>`:"");
}
/* تحديث القيَم بلا هدم · يُنادى مع كل حركة مؤشّر فلا يجوز أن يبني */
export function syncOptbar(){
 const d=R.T.def;
 if(sigOf(d)!==barSig){buildOptbar(); return}
 if(!d)return;
 const box=$("#optbar");
 if(!box)return;
 const o=R.OPT[d.id]||{};
 const A=document.activeElement;
 /* علامةُ «المزيد» تتبع القيَمَ: خيارٌ غُيِّرَ وهو مخفيٌّ يجب أن يُنادي
    لحظةَ تغيُّرِه لا عند أوّلِ إعادةِ بناء. */
 const mb=box.querySelector("#okMore");
 if(mb){
  const ch=tailChanged(d);
  if(mb.classList.contains("chg")!==(ch>0))mb.classList.toggle("chg",ch>0);
  const sr=box.querySelector("#okChg");
  const txt=ch?ch+" خيارٌ مُغيَّرٌ عن افتراضه":"";
  if(sr&&sr.textContent!==txt)sr.textContent=txt;
 }
 box.querySelectorAll("[data-seg]").forEach(b=>{
  const on=String(o[b.dataset.seg])===b.dataset.v;
  if(b.classList.contains("on")!==on){
   b.classList.toggle("on",on);
   b.setAttribute("aria-checked",String(on));
  }
 });
 box.querySelectorAll("[data-ok]").forEach(el=>{
  if(el===A)return;              /* لا نكتب فوق ما يكتبه المستخدم */
  const v=o[el.dataset.ok];
  if(el.type==="checkbox"){
   const on=(v===1||v===true||v==="1");
   if(el.checked!==on)el.checked=on;
   return;
  }
  const s=String(v==null?"":v);
  if(el.value!==s)el.value=s;
 });
}
function applyOpt(k,v){
 if(!k||!R.T.def)return;
 R.setOpt(R.T.def.id,k,v);
 syncOptbar();      /* يعيد البناء وحده إن ظهر حقلٌ شرطيّ أو اختفى */
 HOOK.prompt();
 HOOK.defs();       /* لوحة الافتراضات تُظهر القيمة نفسها */
}
$("#optbar").addEventListener("change",e=>{
 const k=e.target.dataset.ok;
 if(!k)return;
 applyOpt(k,(e.target.type==="checkbox")?(e.target.checked?1:0)
  :e.target.value);
});
/* أزرار الاختيار السريع */
$("#optbar").addEventListener("click",e=>{
 const b=e.target.closest&&e.target.closest("[data-seg]");
 if(!b)return;
 applyOpt(b.dataset.seg,b.dataset.v);
});
/* ═══ فتحُ «المزيد» وإغلاقُه ═══
   لا إعادةَ بناءٍ للشريطِ عند الفتح: تبديلُ صنفٍ وسمةٍ يكفي، وإعادةُ
   البناءِ كانت ستُفقِد التركيزَ وتُغلِق المُنسدلَ في وجهِ من يكتب فيه. */
function toggleMore(on){
 const b=$("#okMore"), pop=$("#okPop");
 if(!b||!pop)return;
 moreOpen=(on===undefined)?!moreOpen:!!on;
 b.setAttribute("aria-expanded",String(moreOpen));
 pop.classList.toggle("on",moreOpen);
 if(moreOpen)pop.removeAttribute("hidden"); else pop.setAttribute("hidden","");
}
$("#optbar").addEventListener("click",e=>{
 const b=e.target.closest&&e.target.closest("#okMore");
 if(!b)return;
 toggleMore();
});
/* نقرةٌ خارجَ المُنسدلِ تُغلِقه — وهو فوقَ الرسمِ فالنقرةُ على اللوحةِ
   قصدُها الرسمُ لا الخيارات. ومستمعٌ واحدٌ على المستندِ لا مستمعٌ
   يُعاد ربطُه مع كلِّ بناءٍ (P2-001). */
document.addEventListener("pointerdown",e=>{
 if(!moreOpen)return;
 const t=e.target;
 if(t.closest&&(t.closest("#okPop")||t.closest("#okMore")))return;
 toggleMore(false);
},true);
/* منع تسرّب المفاتيح من حقول الخيارات إلى الاختصارات */
$("#optbar").addEventListener("keydown",e=>{
 if(e.key==="Escape"){
  /* الهروبُ من داخلِ المُنسدلِ يُغلِقه ويُعيد التركيزَ إلى زرِّه، لا
     يُلقي التركيزَ في الفراغِ فيضيعَ مكانُ من يتنقّل بلوحةِ المفاتيح. */
  if(moreOpen&&e.target.closest&&e.target.closest("#okPop")){
   toggleMore(false);
   const b=$("#okMore"); if(b)b.focus();
   e.stopPropagation();
   return;
  }
  e.target.blur(); return;
 }
 e.stopPropagation();
});
