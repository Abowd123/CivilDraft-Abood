/* ═══ التنفيذ ثم الإرجاع ═══
   الخطة تُنفَّذ فعلاً — لا معاينةً تقريبية — ثم تراها مرسومةً
   وتقرّر. الإرجاع من لقطةٍ كاملة، فلا حالة نصف معدَّلة.
   خطوة تراجعٍ واحدة للخطة كلّها: setBatch يُسكِت تاريخ كل أداة. */
import {S,COLLS,snapshot,loadState,pushHistory,touch,
        autosave} from "../core/state.js";
import * as R from "../tools/registry.js";

const count=()=>COLLS.reduce((n,k)=>n+(S[k]||[]).length,0);

/* ═══ بصمةُ المحتوى — بند 68–78 ═══
   ما يُثبَّت هو ما عُوين: بين «نفّذ للمعاينة» و«ثبّت» قد تُعدَّل
   اللوحةُ بيدٍ أو بتراجعٍ أو بمسارٍ آخر، فيُثبَّت التاريخُ على لقطةٍ
   لا تطابق ما يراه المستخدم. commit تقارن بصمةَ اللحظة ببصمة نهاية
   المعاينة وترفض عند الاختلاف.
   والبصمة للمحتوى وحده (الكيانات والمحاور والطبقات والوصف) — لا
   للقطة كاملةً: أوضاع الرسم (S.rb: التعامد/الالتقاط…) تدخل اللقطة
   (عيب D01 المفتوح) فتبديلُ «تعامد» أثناء المعاينة كان سيحجب
   التثبيتَ بلا سبب. */
const sig=()=>JSON.stringify([COLLS.map(k=>S[k]),S.grid,S.layers,S.meta]);

const goodTrial=t=>!!t&&typeof t.before==="string";

export function trial(lines,opt){
 const O=Object.assign({stopOnError:1},opt||{});
 const before=snapshot(), n0=count();
 const res=[];
 R.setBatch(1);
 try{
  for(const L of lines||[]){
   if(L.bad){
    res.push({...L,err:L.bad,skipped:1});
    if(O.stopOnError)break;
    continue;
   }
   try{
    let accepted=true;
    if(L.kind==="enter")R.enter();
    else if(L.kind==="esc")R.cancel(true);
    else if(L.kind==="tool")R.begin(L.tool);
    else accepted=R.feedText(L.s);
    if(accepted===false)throw new Error("رُفض الإدخال");
    res.push({...L,ok:1});
   }catch(e){
    res.push({...L,err:(e&&e.message)||String(e)});
    if(O.stopOnError)break;
   }
  }
  if(R.active())R.cancel(true);
  touch();
  const after=sig();
  return {before, after, res, made:count()-n0,
   errs:res.filter(x=>x.err).length,
   ran:res.filter(x=>x.ok).length};
 }catch(e){
  /* عيب D10: خطأٌ خارج حلقة الأسطر (مُولِّد الأسطر نفسه مثلاً) كان
     يترك الحالة نصف منفَّذة. الأداةُ الفعّالة تُلغى أولاً وإلا بقيت
     تحمل سياقاً لحالةٍ لم تعد قائمة. */
  try{if(R.active())R.cancel(true)}catch(_){}
  loadState(JSON.parse(before),false);
  throw e;
 }finally{R.setBatch(0)}
}
export function commit(t,label="تنفيذ خطة"){
 if(!goodTrial(t))throw new Error("لقطة المعاينة غير صالحة");
 /* لقطةٌ بلا after (من إصدارٍ أقدم) لا تُخترَع لها بصمة: تُرفَض */
 if(typeof t.after!=="string"||t.after!==sig())
  throw new Error("تغيّرت الحالة منذ المعاينة — أعد المعاينة");
 pushHistory(t.before,label);
 touch(); autosave();
 return t.made;
}
export function rollback(t){
 if(!goodTrial(t))throw new Error("لقطة المعاينة غير صالحة");
 loadState(JSON.parse(t.before),false);
 touch();
 return t.made;
}
