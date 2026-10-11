/* ═══ لوحة السجل ═══ سجلّ تراجع/إعادة مرئي — قفزٌ لأي خطوة.
   تعتمد على core/state.js الحقيقي (historyTimeline/historyJumpTo/
   canUndo/canRedo/undo/redo) — لا سجلّ ثانٍ، ولا لقطة مستقلّة.
   تُستدعى refreshHistoryPanel() من نفس معاودة setAfterEdit في
   app.js، فتبقى متزامنةً مع كل تعديلٍ أو تراجعٍ أو إعادة. */
import {historyTimeline,historyJumpTo,historySnapshotAt,canUndo,canRedo,undo,redo}
 from "../core/state.js";
import {setCompareBase,clearCompareBase,compareActive} from "../core/compare.js";
import {draw} from "./canvas.js";
import {HOOK} from "./bus.js";
import {escapeHtml as esc} from "../core/escape.js";

const ID="histPanel";
let root=null,listEl=null,countEl=null,mounted=false;

function build(){
 root=document.getElementById(ID);
 if(!root){
  root=document.createElement("aside");
  root.id=ID; root.hidden=true; root.setAttribute("dir","rtl");
  root.innerHTML=
   `<header class="hp-h"><span class="hp-title">السجل</span>
      <span class="hp-count"></span>
      <button type="button" class="hp-x" data-act="close" title="إغلاق">✕</button></header>
    <div class="hp-body"><ul class="hp-list"></ul></div>
    <footer class="hp-f">
      <button type="button" data-act="undo" title="تراجع">↶ تراجع</button>
      <button type="button" data-act="redo" title="إعادة">↷ إعادة</button>
      <button type="button" data-act="cmpclear" title="إنهاء المقارنة">مسح المقارنة</button></footer>`;
  document.body.appendChild(root);
 }
 listEl=root.querySelector(".hp-list"); countEl=root.querySelector(".hp-count");
 root.addEventListener("click",onClick);
}
export function refreshHistoryPanel(){
 if(!mounted||!root||root.hidden)return;
 const {past,future,current}=historyTimeline();
 const steps=past.concat(future); const total=steps.length;
 countEl.textContent=total?`${current}/${total}`:"";
 root.querySelector('[data-act="undo"]').disabled=!canUndo();
 root.querySelector('[data-act="redo"]').disabled=!canRedo();
 root.querySelector('[data-act="cmpclear"]').disabled=!compareActive();
 if(!total){listEl.innerHTML=`<li class="hp-empty">لا خطوات بعد — ابدأ الرسم</li>`; return}
 const rows=[];
 for(let a=total;a>=1;a--){
  const cls=a===current?"cur":(a>current?"future":"");
  rows.push(`<li class="hp-it ${cls}" data-jump="${a}" title="${esc(steps[a-1])}">
   <span class="dot"></span><span class="lbl">${esc(steps[a-1])}</span>
   <button type="button" class="hp-cmp" data-cmp="${a}"
    title="قارن الحالة الجارية بهذه الخطوة">⇄</button><span class="n">${a}</span></li>`);
 }
 rows.push(`<li class="hp-it ${current===0?"cur":""}" data-jump="0" title="الحالة الأولية">
  <span class="dot"></span><span class="lbl">البداية</span>
  <button type="button" class="hp-cmp" data-cmp="0"
   title="قارن الحالة الجارية بالحالة الأولية">⇄</button><span class="n">0</span></li>`);
 listEl.innerHTML=rows.join("");
}
function endCompare(){
 clearCompareBase(); draw();
 if(HOOK&&HOOK.report)HOOK.report("in","أُنهيت المقارنة");
 refreshHistoryPanel();
}
/* تُستدعى من keymap عند Esc — تعيد true إن كانت مقارنةٌ فعّالة فأُنهيت */
export function endCompareIfActive(){
 if(!compareActive())return false;
 endCompare(); return true;
}
function onClick(e){
 const cmp=e.target.closest("[data-cmp]");
 if(cmp){
  const n=+cmp.dataset.cmp;
  const sn=historySnapshotAt(n);
  if(!sn){
   if(HOOK&&HOOK.report)HOOK.report("wr","تعذّر قراءة هذه الخطوة");
   return;
  }
  setCompareBase(JSON.parse(sn));
  draw();
  if(HOOK&&HOOK.report)
   HOOK.report("in",`المقارنة مع الخطوة ${n} — Esc أو «مسح المقارنة» لإنهائها`);
  refreshHistoryPanel();
  return;
 }
 const act=e.target.closest("[data-act]");
 if(act){
  if(act.dataset.act==="close")return closeHistoryPanel();
  if(act.dataset.act==="cmpclear"){endCompare(); return}
  if(act.dataset.act==="undo"){undo(); refreshHistoryPanel(); return}
  if(act.dataset.act==="redo"){redo(); refreshHistoryPanel(); return}
 }
 const it=e.target.closest("[data-jump]");
 if(it){
  const n=+it.dataset.jump; historyJumpTo(n);
  if(HOOK&&HOOK.report)HOOK.report("in",`السجل: انتقال إلى الخطوة ${n}`);
  refreshHistoryPanel();
 }
}
export function initHistoryPanel(){
 if(mounted)return;
 build(); mounted=true;
}
export function openHistoryPanel(){
 if(!mounted)initHistoryPanel();
 root.hidden=false; refreshHistoryPanel();
}
export function closeHistoryPanel(){ if(root)root.hidden=true; }
export function toggleHistoryPanel(){
 if(!mounted)initHistoryPanel();
 root.hidden=!root.hidden;
 if(!root.hidden)refreshHistoryPanel();
}
export const historyPanelOpen=()=>!!(root&&!root.hidden);
