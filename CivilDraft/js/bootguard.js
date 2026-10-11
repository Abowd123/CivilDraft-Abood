/* ═══ حرس الإقلاع ═══
   أوّل ما يُحمَّل، وورقةٌ في شجرة الاعتماد. يمسك عطب التحميل وعطب
   البناء وأيَّ وعدٍ مرفوض، ويكتب سبباً مرئياً — فالشاشة البيضاء
   الصامتة أسوأ ما قد يقع في برنامجٍ يحمل عمل المستخدم.

   تنبيهٌ CSP: style.cssText محجوبٌ فعلياً بسياسة style-src بلا
   unsafe-inline (خلافاً لِما ظننّاه سابقاً) — المتصفّح يتجاهله
   بصمتٍ، فيَظهر مربّع العطب بلا أي تنسيق. الخصائص المفردة
   (el.style.prop=value) وحدَها مُستثناة من الحجب، فهي المستعملة
   هنا بدل cssText. راجع js/tests/csp.test.js لفحصٍ آليّ.

   ومنفذ إنقاذ: ?safe يتجاهل تفضيلات الواجهة والجلسة المحفوظة ولا
   يمحوهما — فتُفتَح النسخة السليمة ويُحفَظ الملفّ ثم يُصلَح ما فسد. */

export const SAFE=/[?&]safe\b/.test(location.search);
let DONE=false, SHOWN=false;

const box=()=>{
 let b=document.getElementById("bootErr");
 if(b)return b;
 b=document.createElement("div");
 b.id="bootErr";
 b.setAttribute("dir","rtl");
 Object.assign(b.style,{
  position:"fixed", insetInline:"0", insetBlockStart:"0",
  zIndex:"9999", background:"#3a1c1c", color:"#ffd9d9",
  borderBlockEnd:"1px solid #6b2b2b", padding:"10px 14px",
  font:"13px/1.6 Tahoma,Arial,sans-serif", maxBlockSize:"60vh",
  overflow:"auto", whiteSpace:"pre-wrap",
 });
 /* زرّ إغلاق: الإشعار يُقرأ ثم يُغلَق، ولا يحجب الواجهة. (بلا onclick مضمَّن — CSP) */
 const x=document.createElement("button");
 x.type="button"; x.textContent="×"; x.setAttribute("aria-label","إغلاق");
 Object.assign(x.style,{position:"absolute",insetBlockStart:"6px",
  insetInlineStart:"8px",background:"transparent",color:"#ffd9d9",
  border:"0",font:"20px/1 Tahoma,Arial,sans-serif",cursor:"pointer",
  padding:"4px 8px"});
 x.addEventListener("click",()=>b.remove());
 b.appendChild(x);
 (document.body||document.documentElement).appendChild(b);
 return b;
};
export function fatal(msg,where){
 SHOWN=true;
 const b=box();
 const line=(where?`[${where}] `:"")+String(msg==null?"":msg);
 b.appendChild(document.createTextNode(line+"\n"));
 if(!b.dataset.tail){
  b.dataset.tail="1";
  const a=document.createElement("div");
  Object.assign(a.style,{marginBlockStart:"8px",color:"#ffb3b3"});
  a.textContent=SAFE
   ? "أنت في وضع الإنقاذ سلفاً — احفظ ملفّاً إن ظهر رسمك."
   : "جرّب وضع الإنقاذ: أضِف ?safe إلى العنوان — "
     +"يتجاهل التفضيلات المحفوظة ولا يمحوها.";
  b.appendChild(a);
 }
 return false;
}
/* يُنادى من آخر boot() فيُلغي المرقب. يُطلق أيضاً حدثاً على window
   كي تلتقطه شاشة الإقلاع (js/boot-splash.js) دون أي آلية موازية —
   هذا هو نداء النجاح الحقيقي الوحيد، لا مؤقّت مستقلّ يخمّنه. */
export const bootOk=()=>{
 DONE=true;
 const b=document.getElementById("bootErr"); if(b&&!SHOWN)b.remove();
 dispatchEvent(new Event("civildraft:bootok"));
};

addEventListener("error",e=>{
 if(DONE&&SHOWN)return;
 const m=e.error&&e.error.stack
  ? String(e.error.stack).split("\n").slice(0,3).join("\n")
  : (e.message||"عطبٌ غير موصوف");
 fatal(m,"تحميل");
},true);
addEventListener("unhandledrejection",e=>{
 const r=e.reason;
 fatal((r&&r.message)||String(r),"وعدٌ مرفوض");
});
/* مرقب: يمسك فشل جلب وحدةٍ — لا يفير error على النافذة */
const T0=Date.now(), SLOW_MS=45000;
function watchdog(){
 if(DONE||SHOWN)return;
 const loading=typeof document!=="undefined"
  &&(document.readyState==="loading"||document.readyState==="interactive");
 if(loading&&Date.now()-T0<SLOW_MS){setTimeout(watchdog,2000);return}
 /* البطء ليس عطباً يستحقّ شريطاً أحمر: نسجّله في وحدة التحكّم فقط،
    والشعار (boot-splash) يبقى ويُخبر المستخدم. الأخطاء الحقيقية
    (وحدةٌ رمت · وعدٌ مرفوض) تظهر كما كانت — وقابلةً للإغلاق. */
 try{console.warn("[مرقب] لم يكتمل الإقلاع"+(loading?" — الشبكة بطيئة":"")
  +" — راجع تبويب Network لأي ملفٍّ فاشل")}catch(e){}
}
setTimeout(watchdog,10000);
