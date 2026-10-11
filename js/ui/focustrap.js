/* ═══ حصرُ التركيز في الحوار ═══ P5-004
   ثلاثُ نوافذ (التقارير · العرض الثلاثي · المعرض) تُعلن
   `role=dialog` و`aria-modal=true` ثم لا تفعل ما يستلزمه الإعلان:
   لا تحفظ العنصرَ الذي كان مركَّزاً، ولا تركّز شيئاً عند الفتح، ولا
   تحصر Tab، ولا تُعيد التركيزَ عند الإغلاق. النتيجةُ أنّ Tab يخرج
   من حوارٍ modal إلى صفحةٍ تحته مُعلَنةٍ معطَّلة، وأنّ التركيزَ يقفز
   إلى بداية الوثيقة بعد الإغلاق — وهما ما تشترطه ARIA صريحاً.

   وحدةٌ واحدةٌ لثلاثتها: `trapFocus(box,{onEsc})` تُعيد `release()`.
   ولا تعرف شيئاً عن محتوى الحوار — تقرأ العناصرَ القابلةَ للتركيز
   عند كل Tab لا مرّةً واحدة، فحوارٌ يُعاد رسمُ جسمِه يبقى محصوراً.

   ولا DOM مفترَضٌ: كلُّ نداءٍ محميّ، فتعمل تحت شِبه DOM في Node. */

const SEL=[
 "a[href]","button:not([disabled])","input:not([disabled])",
 "select:not([disabled])","textarea:not([disabled])",
 "summary","[tabindex]"
].join(",");

/* العناصرُ القابلةُ للتركيز الآن: مرئيةٌ وغيرُ مخفيّةٍ وtabindex ≥ 0 */
export function focusables(box){
 if(!box||typeof box.querySelectorAll!=="function")return [];
 let list=[];
 try{list=[...box.querySelectorAll(SEL)]}catch(e){return []}
 return list.filter(el=>{
  if(!el)return false;
  if(el.hasAttribute&&el.hasAttribute("disabled"))return false;
  if(el.hasAttribute&&el.hasAttribute("hidden"))return false;
  const ti=el.getAttribute&&el.getAttribute("tabindex");
  if(ti!=null&&+ti<0)return false;
  if(el.closest&&el.closest("[hidden]"))return false;
  return true;
 });
}

export function trapFocus(box,opt){
 const O=opt||{};
 const doc=(typeof document!=="undefined")?document:null;
 const prev=(doc&&doc.activeElement)||null;
 let live=true;

 const onKey=e=>{
  if(!live||!e)return;
  if(e.key==="Escape"){
   if(typeof O.onEsc==="function"){e.stopPropagation(); O.onEsc()}
   return;
  }
  if(e.key!=="Tab")return;
  const F=focusables(box);
  if(!F.length){
   /* لا شيءَ يُركَّز داخله: نمنع الخروجَ لا أكثر */
   if(e.preventDefault)e.preventDefault();
   return;
  }
  const first=F[0], last=F[F.length-1];
  const cur=(doc&&doc.activeElement)||null;
  const inside=box&&box.contains&&cur?box.contains(cur):false;
  if(!inside){
   if(e.preventDefault)e.preventDefault();
   focus(e.shiftKey?last:first);
   return;
  }
  if(e.shiftKey&&cur===first){
   if(e.preventDefault)e.preventDefault();
   focus(last);
  }else if(!e.shiftKey&&cur===last){
   if(e.preventDefault)e.preventDefault();
   focus(first);
  }
 };
 const focus=el=>{ try{ if(el&&el.focus)el.focus() }catch(e){} };

 /* أوّلُ عنصرٍ — أو الصندوقُ نفسه إن كان قابلاً للتركيز (canvas) */
 const F=focusables(box);
 if(O.initial&&O.initial.focus)focus(O.initial);
 else if(F.length)focus(F[0]);
 else focus(box);

 if(doc&&doc.addEventListener)doc.addEventListener("keydown",onKey,true);

 return function release(){
  if(!live)return false;
  live=false;
  if(doc&&doc.removeEventListener)doc.removeEventListener("keydown",onKey,true);
  /* إعادةُ التركيز: العنصرُ السابقُ إن كان ما زال في الوثيقة */
  const back=prev&&(!doc||!doc.contains||doc.contains(prev))?prev:null;
  if(back)focus(back);
  return true;
 };
}
