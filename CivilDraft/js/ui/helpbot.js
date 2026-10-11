/* ═══ نافذة روبوت الإرشاد — واجهة عصرية ═══
   شاتٌ يجيب على «كيف أفعل كذا؟» مع زرّ عائم، رأسٍ مرتّب، وحالة
   اتصالٍ للمزوّد. يحقن دالة تفعيل الأداة. a11y كامل. */
import {answerQuestion, suggestTopics, TOPIC_Q} from "../ai/help/answer.js";
import {providerReady} from "../ai/help/provider.js";
import {createGallery} from "./gallery.js";

export function createHelpBot(opts={}){
 const activate=typeof opts.activate==="function"?opts.activate:()=>{};

 /* ── الزرّ العائم (FAB) ── */
 const fab=document.createElement("button");
 fab.className="hb-fab"; fab.type="button";
 fab.setAttribute("aria-label","فتح المساعدة");
 fab.title="المساعدة — اسأل: كيف أفعل كذا؟";
 fab.innerHTML=`<svg viewBox="0 0 24 24" width="22" height="22"
   fill="none" stroke="currentColor" stroke-width="2"
   stroke-linecap="round" stroke-linejoin="round">
   <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7
    a8.5 8.5 0 0 1 3.5-11.3 8.38 8.38 0 0 1 11.3 3.5 8.38 8.38 0 0 1 1.3 4z"/>
   <path d="M9.5 9a2.5 2.5 0 0 1 4.9.7c0 1.7-2.4 2.3-2.4 2.3"/>
   <line x1="12" y1="16" x2="12" y2="16"/></svg>`;

 /* ── النافذة ── */
 const root=document.createElement("div");
 root.className="helpbot"; root.setAttribute("role","dialog");
 root.setAttribute("aria-label","روبوت المساعدة");
 root.setAttribute("aria-modal","false"); root.dir="rtl"; root.hidden=true;
 root.innerHTML=`
  <div class="hb-head">
    <div class="hb-brand">
      <span class="hb-logo" aria-hidden="true">؟</span>
      <div class="hb-titles">
        <span class="hb-title">مساعد CivilDraft</span>
        <span class="hb-sub"><i class="hb-dot"></i><span class="hb-status">محلي</span></span>
      </div>
    </div>
    <div class="hb-actions">
      <button class="hb-icon hb-clear" type="button"
        aria-label="مسح المحادثة" title="مسح المحادثة">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round">
         <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>
      <button class="hb-icon hb-close" type="button"
        aria-label="إغلاق" title="إغلاق">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round">
         <path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>
  </div>
  <div class="hb-log" role="log" aria-live="polite"></div>
  <div class="hb-chips" role="group" aria-label="أسئلة شائعة"></div>
  <form class="hb-form">
    <input class="hb-in" type="text" autocomplete="off"
      placeholder="اكتب سؤالك… مثل: كيف أبني غرفة؟" aria-label="اكتب سؤالك">
    <button class="hb-send" type="submit" aria-label="إرسال" title="إرسال">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round"
       stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>
    </button>
  </form>`;

 const mount=opts.mount||document.body;
 mount.appendChild(fab); mount.appendChild(root);

 /* ── معرض القوالب والكتل ── يفتح فوق نافذة الشات عبر زرّ إجراء ── */
 const gallery=createGallery({ mount,
  onDone:(item,rep)=>{
   if(rep&&rep.committed){
    let msg=`تم إدراج «${item.label}» (${rep.valid} عنصر)`;
    if(rep.rejected&&rep.rejected.length) msg+=` · رُفض ${rep.rejected.length}`;
    if(rep.doorRejected) msg+=" · تعذّر إدراج الباب";
    bubble("bot",msg);
   } else if(rep&&rep.error){
    bubble("bot",rep.error);
   } else {
    bubble("bot",`تعذّر إدراج «${item.label}» — راجع القياسات.`);
   }
  }
 });

 const log=root.querySelector(".hb-log");
 const chips=root.querySelector(".hb-chips");
 const form=root.querySelector(".hb-form");
 const input=root.querySelector(".hb-in");
 const statusEl=root.querySelector(".hb-status");
 const dotEl=root.querySelector(".hb-dot");

 function refreshStatus(){
  const on=providerReady();
  statusEl.textContent=on?"مزوّد متصل":"محلي";
  dotEl.classList.toggle("on",on);
 }

 function bubble(who,text){
  const row=document.createElement("div"); row.className="hb-row hb-"+who;
  const av=document.createElement("span"); av.className="hb-avatar";
  av.textContent=who==="user"?"أنت":"م";
  const b=document.createElement("div"); b.className="hb-msg";
  b.textContent=text;
  row.appendChild(av); row.appendChild(b);
  log.appendChild(row); log.scrollTop=log.scrollHeight; return b;
 }

 function renderAnswer(ans){
  const row=document.createElement("div"); row.className="hb-row hb-bot";
  const av=document.createElement("span"); av.className="hb-avatar";
  av.textContent="م";
  const wrap=document.createElement("div"); wrap.className="hb-msg";
  const t=document.createElement("div"); t.className="hb-ans-text";
  t.textContent=ans.text; wrap.appendChild(t);
  if(ans.warn){ const w=document.createElement("div");
   w.className="hb-warn"; w.textContent="⚠ "+ans.warn; wrap.appendChild(w); }
  if(ans.actions&&ans.actions.length){
   const bar=document.createElement("div"); bar.className="hb-actbar";
   ans.actions.forEach(a=>{ const btn=document.createElement("button");
    btn.className="hb-act"; btn.type="button"; btn.textContent=a.label;
    btn.addEventListener("click",()=>{
     if(a.type==="activateTool"&&a.toolId){
      activate(a.toolId);
      bubble("bot","تم تفعيل الأداة — اتبع الخطوات على اللوحة.");
     } else if(a.type==="runLint"){
      ask("افحص رسمي");
     } else if(a.type==="openGallery"){
      gallery.open();
     }
    });
    bar.appendChild(btn); });
   wrap.appendChild(bar); }
  if(ans.related&&ans.related.length){
   const r=document.createElement("div"); r.className="hb-related";
   const lbl=document.createElement("span"); lbl.className="hb-related-lbl";
   lbl.textContent="قد يهمّك:"; r.appendChild(lbl);
   ans.related.forEach(rel=>{ const link=document.createElement("button");
    link.className="hb-chip hb-sm"; link.type="button";
    link.textContent=rel.title;
    link.addEventListener("click",()=>ask(rel.title)); r.appendChild(link); });
   wrap.appendChild(r); }
  row.appendChild(av); row.appendChild(wrap);
  log.appendChild(row); log.scrollTop=log.scrollHeight;
 }

 async function ask(q){ const text=String(q||"").trim(); if(!text) return;
  chips.classList.add("hb-hidden");            // أخفِ الرقائق بعد أول سؤال
  bubble("user",text);
  const thinking=bubble("bot","");
  thinking.parentElement.classList.add("hb-typing");
  thinking.innerHTML=`<span></span><span></span><span></span>`;
  try{ const ans=await answerQuestion(text);
   thinking.parentElement.remove(); renderAnswer(ans); refreshStatus(); }
  catch(e){ thinking.textContent="حدث خطأ: "+e.message;
   thinking.parentElement.classList.remove("hb-typing"); } }

 function renderChips(){ chips.innerHTML=""; chips.classList.remove("hb-hidden");
  suggestTopics().forEach(t=>{ const c=document.createElement("button");
   c.className="hb-chip"; c.type="button"; c.textContent=t.title;
   c.addEventListener("click",()=>ask(TOPIC_Q[t.id]||t.title));
   chips.appendChild(c); }); }

 function greet(){ if(!log.childElementCount)
   bubble("bot","مرحباً! أنا مساعد CivilDraft. اسألني كيف تعمل أي أداة"
    +" أو مهمة، وسأشرح الخطوات لك."); }

 form.addEventListener("submit",e=>{ e.preventDefault();
  ask(input.value); input.value=""; input.focus(); });
 root.querySelector(".hb-close").addEventListener("click",()=>api.close());
 root.querySelector(".hb-clear").addEventListener("click",()=>{
  log.innerHTML=""; greet(); renderChips(); input.focus(); });
 fab.addEventListener("click",()=>api.toggle());
 window.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!root.hidden) api.close(); });

 const api={ el:root, fab, gallery,
  open(){ root.hidden=false; fab.classList.add("hb-open");
   refreshStatus(); greet(); renderChips(); input.focus(); },
  close(){ root.hidden=true; fab.classList.remove("hb-open");
   if(opts.onClose) opts.onClose(); },
  toggle(){ root.hidden?api.open():api.close(); }, ask };
 return api;
}
