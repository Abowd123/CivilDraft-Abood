/* ═══ القياس ═══
   عدّاداتٌ لا مؤقّتات: عددُ إعادات البناء وعددُ اختبارات التقاطع
   لا يتبدّلان بحاسبٍ آخر، والمللي ثانية يتبدّل بكل شيء. والدفعة
   الثامنة كلّها عن «ما يُبطَل»، فقياسُه هو التحقّق منها.

   ومُطفأٌ افتراضاً فكلفته صفر: bump يفحص علماً واحداً ويعود.
   ويستورد geom.js وحده — وهو ورقةٌ في الشجرة، فلا دورة. */
import {PERF as G, perfReset as gReset,
        WELD as GEOW} from "./geom.js";

export const P={on:0, frame:0, scene:0, bodies:0, loops:0, stamp:0,
 band:0, filter:0, prims:0,
 scene_ms:0, bodies_ms:0, loops_ms:0, band_ms:0, filter_ms:0,
 frame_ms:0, frame_over:0, scene_over:0};

/* ميزانية المللي ثانية لكل مرحلة — تُقاس فقط حين يكون القياس مفعّلاً */
export const BUDGET={frame:16, scene:16, bodies:50, loops:30};

/* ═══ ميزانيةُ المشهد مرتبطةً بالحجم ═══ P4-006
   كانت الميزانيةُ المعلنةُ رقماً واحداً (scene=16ms) لا يعكس ألفَ
   كيانٍ ولا عشرةَ آلاف، والاختبارُ لا يفشل عند تجاوزها — يحذّر في
   console وحده. فلا حارسَ أداءٍ فعليّاً.

   الآن ميزانيةٌ دالّةٌ في الحجم: ثابتٌ + كلفةٌ لكل ألف كيان، بسقفٍ
   أعلى. وهي ميزانيةُ *بناء مشهدٍ كامل* (scene) لا ميزانيةُ إطار:
   بناءُ المشهد يقع عند تغيّر الهندسة لا في كل رسم، فمقياسُه ثانيةٌ
   لا 16 مللي — والرقمُ المعلن سابقاً كان يقارن تفّاحةً ببرتقالة.

   ═══ والمعامل المادّي مُعلَن ═══
   الزمنُ المطلق يتبدّل بالحاسب ثلاثةَ أضعافٍ بين بيئتين، فالسقفُ
   الثابتُ إمّا هشٌّ أو بلا معنى. يُعاير أوّلاً بحلقةٍ حسابيةٍ ثابتة:
   نسبةُ زمنها إلى المرجع هي معامل الآلة، والميزانيةُ تُضرَب به.
   ولا يقلّ المعاملُ عن 1 — فالآلةُ الأسرعُ لا تُوسَّع لها الميزانية.

   حدٌّ مُعلَن: هذا حارسُ انحدارٍ لا وعدُ تجربةٍ. الأرقامُ الفعلية
   مسجَّلةٌ في KNOWN-DEFECTS.md، وهي أبعدُ من 16ms بكثير. */
export const SCENE_BUDGET=Object.freeze({
 base: 50,        /* مللي ثانية ثابتة لأي مشهد */
 perK: 200,       /* مللي ثانية لكل ألف كيان */
 max:  6000,      /* سقفٌ أعلى مهما كبر المشروع */
 calRef: 11       /* زمنُ حلقة المعايرة المرجعيّ (مللي) */
});
/* حلقةٌ حسابيةٌ خالصة: لا تخصيصَ ذاكرةٍ ولا DOM، فنتيجتُها قدرةُ
   المعالج وحدها. تُنادى مرّتين ويُؤخَذ الأصغرُ (الأولى تُسخّن). */
export function calibrate(){
 const run=()=>{
  const t0=(typeof performance!=="undefined"?performance.now():Date.now());
  let x=0;
  for(let i=0;i<8e6;i++)x+=Math.sqrt(i%97);
  const t=(typeof performance!=="undefined"?performance.now():Date.now())-t0;
  return (x>=0)?t:t;      /* x يُستعمل فلا يُحذَف الحساب */
 };
 run();
 return Math.min(run(),run());
}
let CALMS=0;
export function machineFactor(force){
 if(!CALMS||force)CALMS=calibrate();
 return Math.max(1,CALMS/SCENE_BUDGET.calRef);
}
/* ميزانيةُ بناءِ مشهدٍ لمشروعٍ فيه n كياناً، معدَّلةً بمعامل الآلة */
export function sceneBudget(n,factor){
 const k=(factor==null)?machineFactor():Math.max(1,+factor||1);
 const raw=SCENE_BUDGET.base+SCENE_BUDGET.perK*(Math.max(0,+n||0)/1000);
 return Math.min(SCENE_BUDGET.max,raw)*k;
}
/* هل بقي البناءُ داخل ميزانيته؟ يُعيد تفصيلاً لا بوليانياً وحده،
   فرسالةُ الفشل تذكر الحجمَ والمقيسَ والسقفَ والمعامل. */
export function withinSceneBudget(n,ms,factor){
 const k=(factor==null)?machineFactor():Math.max(1,+factor||1);
 const lim=sceneBudget(n,k);
 return {ok:ms<=lim, n:+n||0, ms:+ms||0, limit:lim, factor:k};
}

export function perfClear(){
 P.frame=0; P.scene=0; P.bodies=0; P.loops=0; P.stamp=0;
 P.band=0; P.filter=0; P.prims=0;
 P.scene_ms=0; P.bodies_ms=0; P.loops_ms=0; P.band_ms=0; P.filter_ms=0;
 P.frame_ms=0; P.frame_over=0; P.scene_over=0;
 gReset();
 return P;
}
export function perfOn(v){
 P.on=v?1:0;
 if(P.on)perfClear();
 return P.on;
}
export const bump=(k,n)=>{
 if(P.on)P[k]=(P[k]||0)+((n==null)?1:n);
};

/* يُراكم زمن مرحلةٍ ويعدّ تجاوز الميزانية. يُعيد false إن تجاوزت.
   مُطفأً: يعود true فوراً بلا أي عمل. */
export function bumpMs(k,ms){
 if(!P.on)return true;
 P[k+"_ms"]=(P[k+"_ms"]||0)+ms;
 if(ms>(BUDGET[k]||16)){
  P[k+"_over"]=(P[k+"_over"]||0)+1;
  return false;
 }
 return true;
}

export function perfReport(){
 const L=[];
 L.push(`إطار ${P.frame} · مشهد ${P.scene} · أجسام ${P.bodies}`
  +` · حلقات ${P.loops} · بصمة ${P.stamp}`);
 L.push(`زمن: مشهد ${P.scene_ms.toFixed(1)} مس`
  +` · أجسام ${P.bodies_ms.toFixed(1)} مس`
  +` · حلقات ${P.loops_ms.toFixed(1)} مس`);
 L.push(`نطاقاتٌ مُعاد بناؤها ${P.band} · ${P.prims} أوّلية`
  +` · تصفية ${P.filter}`);
 L.push(`اتحاد ${G.union} · شظايا ${G.frags} ⇒ ${G.kept} مُبقاة`
  +` · حلقات ${G.rings}`);
 L.push(`اختبار تقاطع ${G.pairs.toLocaleString("en")}`
  +` · احتواء ${G.pip.toLocaleString("en")}`
  +` · خلايا ${G.cells}`);
 /* اللحم عملٌ عاديّ لا عطب: كلُّ زاويةٍ كسريّة تُنتِجه، فيُقال
    في القياس ولا يُقال في التصدير — والتقريرُ الذي يُطلَق دائماً
    لا يُقرأ أبداً. */
 if(G.weld||G.dup||G.nil)
  L.push(`عُقدٌ مُلحَمة ${G.weld} · قطعٌ مكرّرة ${G.dup}`
   +` · صفريّة ${G.nil} (حدُّ اللحم ${GEOW} مم)`);
 if(G.ms>1)L.push(`زمن الاتحاد ${Math.round(G.ms)} مس`);
 if(P.scene_over)L.push(`⚠ تجاوز ميزانية المشهد ${BUDGET.scene} مس × ${P.scene_over}`);
 if(P.frame_over)L.push(`⚠ تجاوز ميزانية الإطار ${BUDGET.frame} مس × ${P.frame_over}`);
 if(G.open){
  L.push(`⚠ ${G.open} قطعةً لم تُخَط — مدخلٌ معطوبٌ لا تفاوتُ `
   +`تدوير: اللحم يبلغ ${GEOW} مم`);
  if(G.openAt)L.push(`   آخرُ موضعٍ: `
   +`(${Math.round(G.openAt[0])}، ${Math.round(G.openAt[1])}) مم`);
 }
 return L.join("\n");
}
