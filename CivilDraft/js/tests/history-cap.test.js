/* ═══ سقفُ ذاكرة التاريخ ═══ P4-007
   السقفُ كان عدداً وحده: مئةُ لقطةٍ كاملة. وعلى مشروعِ ألفِ جدار
   بلغت الزيادةُ 35.8 م.ب بعد ألف عملية و112.25 م.ب بعد خمسة آلاف.
   الآن سقفانِ — عددٌ وحجم — وآخرُ تراجعٍ لا يضيع مهما ضخُمت اللقطة.
   التشغيل:  node js/tests/history-cap.test.js                     */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,edit,undo,redo,canUndo,canRedo,
       clearHistory,pushHistory,historyBytes,historyTimeline,
       HIST_MAXCHARS}=await import("../core/state.js");
const W=await import("../core/walls.js");

const reset=()=>{newState(); ensureShape(); clearHistory()};

group("العدّادُ صادقٌ ويعود إلى الصفر",()=>{
 reset();
 eq(historyBytes(),0,"فارغٌ عند المسح");
 ok(HIST_MAXCHARS>1e6,"والسقفُ معلَنٌ ومصدَّر");
 const a="x".repeat(1000);
 pushHistory(a,"أ");
 eq(historyBytes(),1000,"لقطةٌ بألفِ محرفٍ ⇒ ألف");
 pushHistory("y".repeat(500),"ب");
 eq(historyBytes(),1500,"ثم ألفٌ وخمسمئة");
 clearHistory();
 eq(historyBytes(),0,"والمسحُ يُصفّره");
});

group("سقفُ العدد كما كان — مئةُ لقطة",()=>{
 reset();
 /* طولٌ واحدٌ لكلّ لقطة: الحسابُ يصير مباشراً بلا فروقِ أرقام */
 const mk=i=>"s"+String(i).padStart(4,"0")+"-"+"z".repeat(100);
 for(let i=0;i<150;i++)pushHistory(mk(i),"ت");
 const T=historyTimeline();
 eq(T.past.length,100,"مئةٌ لا أكثر");
 ok(historyBytes()>0,"والحجمُ محسوب");
 eq(historyBytes(),100*mk(0).length,
  "والحجمُ يطابق الباقي لا الكلّ — فالمُسقَط طُرح فعلاً");
});

group("سقفُ الحجم يُسقِط الأقدم",()=>{
 reset();
 /* لقطاتٌ ضخمة: عشرُ لقطاتٍ كلٌّ منها خُمسُ السقف ⇒ الحجمُ يَعُضّ
    قبل أن يَعُضّ العدد */
 const big=n=>"B"+n+"-"+"q".repeat(Math.floor(HIST_MAXCHARS/5));
 for(let i=0;i<10;i++)pushHistory(big(i),"ض");
 const T=historyTimeline();
 ok(T.past.length<100,`العددُ لم يبلغ المئة (${T.past.length}) — الحجمُ حكم`);
 ok(historyBytes()<=HIST_MAXCHARS,
  `والحجمُ تحت السقف (${(historyBytes()/1e6).toFixed(1)} من `
  +`${(HIST_MAXCHARS/1e6).toFixed(0)} مليون محرف)`);
 ok(T.past.length>=1,"ولم يُفرَغ السجلّ");
});

group("آخرُ تراجعٍ لا يضيع ولو تجاوزت لقطتُه السقفَ وحدها",()=>{
 reset();
 pushHistory("H"+"w".repeat(HIST_MAXCHARS+1000),"هائلة");
 const T=historyTimeline();
 eq(T.past.length,1,"اللقطةُ الواحدةُ باقية");
 ok(historyBytes()>HIST_MAXCHARS,
  "والحجمُ فوق السقف — بقصدٍ: خطوةُ التراجع الأخيرة لا تُلغى");
});

group("التراجعُ والإعادةُ يوازنان العدّاد",()=>{
 reset();
 edit(()=>W.addWall([0,0],[3000,0],200,"int","c"),"جدار");
 edit(()=>W.addWall([0,1000],[3000,1000],200,"int","c"),"جدار");
 const b2=historyBytes();
 ok(b2>0,"الحجمُ موجبٌ بعد تعديلَين");
 ok(canUndo(),"ويمكن التراجع");
 undo();
 ok(historyBytes()>0,"وبعد التراجع ما زال موجباً");
 ok(canRedo(),"ويمكن الإعادة");
 redo();
 ok(historyBytes()>0,"وبعد الإعادة كذلك");
 /* الذهابُ والعودةُ لا يُنمّيان العدّادَ بلا حدّ */
 const before=historyBytes();
 for(let i=0;i<20;i++){undo(); redo()}
 const after=historyBytes();
 ok(after<=before*3,
  `عشرونَ ذهاباً وعودةً لا تُضخّم العدّاد (${before} ⇒ ${after})`);
 ok(after>0,"ولا تُصفّره");
 eq(S.walls.length,2,"والحالةُ سليمةٌ بعدها");
});

group("العدّادُ لا يُسالب ولا يفلت",()=>{
 reset();
 for(let i=0;i<30;i++){
  edit(()=>W.addWall([i*1000,0],[i*1000+400,0],200,"int","c"),"ج");
 }
 for(let i=0;i<10;i++)undo();
 for(let i=0;i<10;i++)redo();
 ok(historyBytes()>=0,"لا سالب");
 /* ومجموعُ الطرفَين يطابق المحسوب */
 const T=historyTimeline();
 ok(T.past.length+T.future.length<=100,"والعددُ الكلّيُّ تحت السقف");
 ok(historyBytes()<=HIST_MAXCHARS,"والحجمُ تحت السقف");
 clearHistory();
 eq(historyBytes(),0,"والمسحُ يُصفّره");
});

process.exit(summary()?1:0);
