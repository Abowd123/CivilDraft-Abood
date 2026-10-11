/* ═══ زرّ روبوت المساعدة في الشريط ═══ يحقن زرّاً في #top.
   يستقلّ عمداً عن HOOK.help و#bHelp وF1 (تلك للوحة المرجع
   الثابتة الموجودة مسبقاً في app.js) فلا يتصادم معها — زرٌّ إضافيٌّ
   لروبوت المحادثة، لا بديلٌ لها. onClick صريحٌ يحدّد من يُفتَح. */
export function mountHelpButton(opts={}){
 const bar=document.querySelector(opts.mountSelector||"#top");
 if(!bar) return null;
 if(bar.querySelector(".hb-open-btn")) return null;
 const btn=document.createElement("button");
 btn.className="hb-open-btn"; btn.type="button";
 btn.setAttribute("aria-label", opts.ariaLabel||"فتح مساعد الدردشة");
 btn.title=opts.title||"مساعد CivilDraft (اسأل: كيف أفعل كذا؟)";
 btn.textContent=opts.label||"؟ مساعد";
 const onClick=typeof opts.onClick==="function"?opts.onClick:()=>{};
 btn.addEventListener("click",onClick);
 const gap=bar.querySelector(".gap");
 if(gap && gap.nextSibling) bar.insertBefore(btn, gap.nextSibling);
 else bar.appendChild(btn);
 return btn;
}
