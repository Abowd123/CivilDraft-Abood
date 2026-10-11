/* ═══ تشغيل الماكرو — C2 ═══
   تحقّقٌ مسبق بلا كتابة (parsePlan: قائمة سماحٍ للسطور والمعرّفات) ثم
   تنفيذٌ فعليّ عبر trial → commit: خطوةُ تراجعٍ واحدة للماكرو كلّه،
   وأيُّ سطرٍ يفشل يُرجِع الكلّ (rollback من لقطة ما قبل التنفيذ).
   هذا هو المسار الذي تستعمله الخطط وإعادة السجلّ نفسها، فلا مسارَ ثالث
   يتفرّق عنهما. (ai/opsrun.js لعمليات ops الكتلية لا لأسطر الأدوات.)
   jrMute أثناء التشغيل: المُعاد لا يُسجَّل في السجلّ ولا يُسجَّل ماكروٌ
   بداخله. */
import {parsePlan,planReady} from "./plan.js";
import {trial,commit,rollback} from "./run.js";
import * as R from "../tools/registry.js";
import {jrMute} from "../core/journal.js";
import {macroText,recActive,MACRO_LIM} from "../core/macros.js";

let PLAYING=0;
export const macroPlaying=()=>!!PLAYING;

/* فحصٌ بلا كتابة: {ok,plan} أو {ok:0,error} — يصلح لعرض السبب قبل التشغيل */
export function checkMacro(m){
 if(!m||!Array.isArray(m.lines)||!m.lines.length)
  return {ok:0,error:"ماكرو فارغ"};
 const p=parsePlan(macroText(m),1,MACRO_LIM.lines);
 if(!planReady(p))
  return {ok:0,plan:p,error:p.errs[0]||"سطرٌ غير مفهوم"};
 return {ok:1,plan:p};
}

/* opt.allowDestruct: تصريحٌ مسبق. وإلا يُسأل المستخدم إن وُجد confirm،
   وفي غياب الواجهة يُرفَض — الهدم لا يمرّ بالسكوت. */
export function playMacro(m,opt){
 const O=opt||{};
 if(PLAYING)return {ok:0,error:"ماكرو يعمل الآن"};
 if(recActive())return {ok:0,error:"أوقف التسجيل أولاً — لا تشغيل أثناءه"};
 if(R.active())return {ok:0,error:"أنهِ الأداة الجارية (Esc) قبل تشغيل الماكرو"};
 const c=checkMacro(m);
 if(!c.ok)return {ok:0,error:`الماكرو «${m&&m.name}» مرفوض: ${c.error}`};
 const p=c.plan;
 if(p.destruct.length&&!O.allowDestruct){
  const ask=typeof confirm==="function"
   ?confirm(`الماكرو «${m.name}» فيه أوامر هادمة: ${[...new Set(p.destruct)].join("، ")}.\nيُنفَّذ؟ (Ctrl+Z يتراجع عنه كلّه)`)
   :false;
  if(!ask)return {ok:0,error:"أُلغي — فيه أوامر هادمة لم تُصرَّح"};
 }
 PLAYING=1; let r=null;
 try{
  jrMute(1);
  try{r=trial(p.lines,{stopOnError:1})}finally{jrMute(0)}
  if(r.errs){
   const bad=(r.res||[]).find(x=>x.err);
   rollback(r);
   return {ok:0,error:`تعذّر الماكرو عند السطر ${bad?bad.i:"؟"}`
    +(bad?` «${bad.s}»: ${bad.err}`:"")+" — أُرجع كل شيء"};
  }
  const made=commit(r,`ماكرو: ${m.name}`);
  return {ok:1,ran:r.ran,made};
 }catch(e){
  try{if(r)rollback(r)}catch(_){}
  return {ok:0,error:(e&&e.message)||String(e)};
 }finally{PLAYING=0}
}
