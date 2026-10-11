/* ═══ الواجهة التعليمية: المحرّك ═══ المرحلة ١
   آلةُ حالةٍ صِرفة: لا DOM ولا مؤقّتات. الواجهةُ تناديها بلقطةِ حالة
   (probe) وبالوقت، فتعرف أين المتعلّم وما المساعدةُ المناسبة له.

   سلّمُ المساعدة (يتصاعد بالخمول أو بالأخطاء، ويعود صفراً مع كلّ خطوة):
     0  إضاءةُ الهدف وحدها
     1  الشبحُ والمفاتيح والتلميحُ الأطول
     2  زرُّ «سوّها عني» (يُنفّذ الخطوة ويُنقص النجوم)
   الخطأ: عنصرٌ جديدٌ على اللوحة لم يُتمّ الخطوة — إلّا في خطوة grow
   التي تُبنى بعدّة عناصر (بابان، شباكان): العنصرُ الأوّل تقدّمٌ لا خطأ. */
export const IDLE1=8000, IDLE2=18000, MISS2=2;

/* عددُ ما على اللوحة: الزيادةُ بلا إتمامٍ خطأ، والنقصُ تصحيحٌ (تراجع) لا يُعدّ */
/* المرحلة ٥: والتأشيرُ والإنشائيُّ يُعدّان أيضاً — بُعدٌ أو عمودٌ في غير موضعه خطأٌ كالجدار */
const COUNTED=["walls","opens","areas","dims","anno","cols","struct","stairs"];
export const sigOf=S=>COUNTED.reduce((n,k)=>n+((S&&Array.isArray(S[k]))?S[k].length:0),0);

export function createRunner(lesson,t0=0){
 const R={lesson, i:0, n:lesson.steps.length, done:false,
  mistakes:0, autos:0, stepMiss:0, level:0, since:t0, sig:null, t0, t1:0};
 R.step=()=>R.done?null:lesson.steps[R.i];
 /* تقدّمٌ واحد: يُمرَّر الوقت صراحةً فيُختبر بلا انتظار */
 R.advance=t=>{
  R.i++; R.stepMiss=0; R.level=0; R.since=t; R.sig=null;
  if(R.i>=R.n){R.done=true; R.i=R.n; R.t1=t}
 };
 /* يعيد ما تغيّر: "next" · "miss" · "hint" · null */
 R.tick=(st,t)=>{
  if(R.done)return null;
  const s=R.step();
  let ok=false;
  try{ok=!!s.expect(st)}catch(e){ok=false}
  const sig=sigOf(st.S||{});
  if(ok){
   /* خطوتان قد تتمّان بفعلٍ واحد (الإغلاق يُنهي الأداة أحياناً):
      نتقدّم ما دام اللاحق متحقّقاً أيضاً، ولا نتخطّى أكثر من المتحقّق */
   R.advance(t);
   while(!R.done){
    let n=false; try{n=!!R.step().expect(st)}catch(e){}
    if(!n||R.step().target)break;   /* خطوةُ زرٍّ لا تُتخطّى: هي الدرس */
    R.advance(t);
   }
   R.sig=sigOf(st.S||{});
   return "next";
  }
  if(R.sig!==null&&sig>R.sig&&!s.grow){
   R.sig=sig; R.mistakes++; R.stepMiss++; R.since=t;
   if(R.stepMiss>=MISS2)R.level=2; else if(R.level<1)R.level=1;
   return "miss";
  }
  R.sig=sig;
  const idle=t-R.since;
  const k=lesson.challenge?2:1;          /* التحدّي يصبر ضِعفَ المدّة قبل أن يساعد */
  const want=idle>=IDLE2*k?2:(idle>=IDLE1*k?1:0);
  if(want>R.level){R.level=want; return "hint"}
  return null;
 };
 /* «سوّها عني»: الواجهةُ تُنفّذ step.auto ثم تنادي هذه */
 R.autoUsed=()=>{R.autos++};
 R.stars=()=>{
  if(R.autos===0&&R.mistakes===0)return 3;
  if(R.autos<=1&&R.mistakes<=2)return 2;
  return 1;
 };
 R.secs=()=>Math.max(0,Math.round(((R.t1||R.since)-R.t0)/1000));
 return R;
}
