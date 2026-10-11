/* ═══ أدوات الماكرو — C2 ═══
   macrorec (rec) — يبدأ التسجيل، ومرّةً ثانية يوقفه ويحفظه.
   macroplay (play) — play <اسم>: يشغّل ماكرو بخطوة تراجعٍ واحدة.
   macrodel (delmacro) — delmacro <اسم>. macrolist (macros) — يعرض المحفوظ.
   كلّها لحظيّة own:1، وثلاثة أعلامٍ في التعريف:
   · nojr   — لا تدخل سجلّ الأوامر (فلا يسجّلها الماكرو ولا تعيدها jrReplay)
              ولا يُشوِّب وسيطُها السجلّ؛
   · noplan — لا تُقبَل داخل خطة (parsePlan)، فلا معاينةَ داخل معاينة؛
   · تُسجَّل أسماؤها في jrIgnore فيُحجَب حتى ما يكتبه المستخدم بأحد أسمائها.
   التشغيل يُؤجَّل إلى ما بعد انتهاء begin() (microtask): الأداة الجارية
   حينها لا تزال «فعّالة» فلا يصحّ أن يتدخّل trial بداخلها. */
import {defTool,H,TOOLS} from "./registry.js";
import {jrIgnore} from "../core/journal.js";
import {recStart,recStop,recActive,recLineCount,macroList,macroByName,
        delMacro} from "../core/macros.js";
import {playMacro} from "../ai/macrorun.js";

const argOf=ctx=>(ctx&&ctx.arg)?String(ctx.arg).trim():"";
const FLAGS={own:1,nojr:1,noplan:1};

/* لا استيرادَ من ui/: الاسم عبر ctx.arg، وprompt احتياطاً كما في groups */
function askName(){
 if(typeof window==="undefined"||typeof window.prompt!=="function")return "";
 try{return String(window.prompt("اسم الماكرو (اتركه فارغاً لاسمٍ تلقائي):")||"").trim()}
 catch(e){return ""}
}
export function toggleRecord(name){
 if(!recActive()){
  const r=recStart();
  H.rep(r.ok?"ok":"er",r.ok?"بدأ التسجيل — نفّذ أوامرك ثم rec ثانيةً لإيقافه"
   :r.error);
  return r;
 }
 const n=recLineCount();
 const r=recStop(name!==undefined?name:askName());
 if(r.ok)H.rep("ok",`حُفظ الماكرو «${r.macro.name}» · ${r.macro.lines.length} سطراً`
  +` — شغّله بـ play ${r.macro.name}`);
 else H.rep("er",r.error+(r.tainted?"":` (${n} سطراً)`));
 return r;
}
export function playNamed(name){
 const m=macroByName(name);
 if(!m){
  const r={ok:0,error:`لا ماكرو باسم «${name}»`};
  H.rep("er",r.error); return r;
 }
 const r=playMacro(m);
 if(r.ok){H.rep("ok",`ماكرو «${m.name}» · ${r.ran} سطراً · ${r.made} كياناً — Ctrl+Z يتراجع عنه كلّه`);
  H.refresh(); H.draw()}
 else H.rep("er",r.error);
 return r;
}
export function sayList(){
 const L=macroList();
 if(!L.length){H.rep("in","لا ماكروهات محفوظة — rec يبدأ التسجيل");return}
 H.rep("in",`الماكروهات (${L.length}):`);
 L.forEach(m=>H.rep("in",` · ${m.name} — ${m.lines.length} سطراً`));
 H.rep("in","التشغيل: play <اسم>");
}

defTool(Object.assign({
 id:"macrorec", arg:1, alias:"rec سجل_ماكرو تسجيل_ماكرو", label:"تسجيل ماكرو",
 hint:"يبدأ تسجيل أوامرك · مرّةً ثانية يوقفه ويحفظه",
 /* «rec أعمدة» عند الإيقاف يسمّيه — كان الوسيطُ يُهمَل ويُسأل بنافذةٍ أو يُسمّى «ماكرو» */
 start(ctx){const nm=argOf(ctx); toggleRecord(nm||undefined); return false},
 steps:[]},FLAGS));

defTool(Object.assign({
 id:"macroplay", arg:1, alias:"play شغل_ماكرو ماكرو", label:"تشغيل ماكرو",
 hint:"play <اسم> — خطوة تراجعٍ واحدة، وأيّ فشلٍ يُرجِع الكلّ",
 start(ctx){
  const nm=argOf(ctx);
  if(!nm){sayList(); return false}
  queueMicrotask(()=>playNamed(nm));
  return false;
 },
 steps:[]},FLAGS));

defTool(Object.assign({
 id:"macrodel", arg:1, alias:"delmacro احذف_ماكرو", label:"حذف ماكرو",
 hint:"delmacro <اسم>",
 start(ctx){
  const nm=argOf(ctx);
  if(!nm){H.rep("wr","اكتب: delmacro <اسم>"); return false}
  const had=!!macroByName(nm), ok=had&&delMacro(nm);
  H.rep(ok?"ok":"er",ok?`حُذف «${nm}»`
   :(had?"تعذّر الحذف — التخزين ممنوع":`لا ماكرو باسم «${nm}»`));
  return false;
 },
 steps:[]},FLAGS));

defTool(Object.assign({
 id:"macrolist", alias:"macros ماكروهات", label:"قائمة الماكروهات",
 hint:"يعرض الماكروهات المحفوظة",
 start(){sayList(); return false},
 steps:[]},FLAGS));

/* كل أسماء هذه الأدوات خارج السجلّ — بالمطبَّع (مفاتيح TOOLS) وبالنصّ
   الخام كما قد يكتبه المستخدم (السجلّ يخزّن ما كُتب لا ما طُبِّع) */
Object.keys(TOOLS).forEach(k=>{
 const d=TOOLS[k];
 if(!d||!d.nojr)return;
 jrIgnore(k); jrIgnore(d.id);
 String(d.alias||"").split(/\s+/).filter(Boolean).forEach(jrIgnore);
});
