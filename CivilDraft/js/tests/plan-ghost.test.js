/* ═══ شبحُ الخطّة: الأرقامُ على القماش لا في السجلّ ═══ §5
   `chamfer` و`fillet` كانتا تطبعان خمسةَ أسطرٍ في السجلّ (المسافتان
   والباقيان والطولُ والزاويةُ والسماكة) ثم ترسمان شبحاً أبكم: يقرأ
   المستخدمُ أرقاماً وينظرُ إلى شكلٍ بلا أرقام ويقارنُ في رأسه.
   الآن كلُّ رقمٍ مكتوبٌ عند ما يصفه، والسجلُّ سطرٌ واحدٌ يبقى لقارئ
   الشاشة (P5-005) لا خمسة.
   التشغيل:  node js/tests/plan-ghost.test.js                        */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,summary}
 from "./harness.js";
shim(); shimCanvas();
const DOC=shimDOM();
{const cv=DOC.createElement("canvas"); cv.setAttribute("id","cv");
 DOC.body.appendChild(cv);}
if(!globalThis.window)
 globalThis.window={prompt:()=>null,confirm:()=>true};

const {S,newState,ensureShape,clearHistory,edit}=
 await import("../core/state.js");
const W =await import("../core/walls.js");
const EN=await import("../core/ents.js");
const RN=await import("../core/render.js");
await import("../tools/modify.js");
const R=await import("../tools/registry.js");

const rig=toolRig(R,{hit:(x,y)=>EN.hitTest(x,y,150),
 invalidate:()=>RN.invalidate()});

const hw=(x1,y1,x2,y2)=>{
 let w=null;
 edit(()=>{w=W.addWall([x1,y1],[x2,y2],200,"int","c")},"جدار");
 return w;
};
/* ركنٌ قائمٌ عند المبدأ: جدارٌ شرقاً وآخرُ شمالاً */
function corner(){
 newState(); ensureShape(); clearHistory();
 hw(0,0,4000,0); hw(0,0,0,4000);
 RN.invalidate();
 rig.clear();
}
/* شبحُ الخطّة بعد النقرتين */
function ghostOf(id){
 corner();
 rig.defs(id);
 R.begin(id);
 rig.at(2000,0);
 rig.at(0,2000);
 const g=R.T.def.prev(R.T.ctx,[0,0]);
 return {g, lines:g.filter(x=>x.t==="l"),
  texts:g.filter(x=>x.t==="tx")};
}
const txt=o=>o.texts.map(x=>x.s);
/* هل العنوانُ قريبٌ من منتصفِ القطعة التي يصفها؟ */
const near2=(p,a,b,tol)=>{
 const m=[(a[0]+b[0])/2,(a[1]+b[1])/2];
 return Math.hypot(p[0]-m[0],p[1]-m[1])<=tol;
};

group("كسرُ الركن: الأرقامُ على القماش",()=>{
 const o=ghostOf("chamfer");
 eq(o.lines.length,3,"الخطوطُ الثلاثةُ كما كانت — الشبحُ لم يُستبدَل");
 eq(o.texts.length,3,"وثلاثةُ عناوينَ: قطعانِ وضلعٌ جديد");
 const T=txt(o);
 eq(T.filter(s=>/^0\.500 م/.test(s)).length,2,
  `مسافةُ القطعِ 0.5 م مكتوبةٌ مرّتين — جاء ${JSON.stringify(T)}`);
 /* الزاويةُ زاويةُ الركنِ (٩٠°) لا ميلُ الضلع — هذا ما تحسبه الخطّة */
 ok(T.some(s=>/0\.707 م · 90°/.test(s)),
  `وضلعُ الكسرِ بطوله وزاويةِ الركن: ${JSON.stringify(T)}`);
});

group("كلُّ رقمٍ عند ما يصفه لا في زاويةٍ واحدة",()=>{
 const o=ghostOf("chamfer");
 /* عنوانُ الضلعِ الجديد على ضلعه، وعنوانا القطعَين على قطعَيهما:
    ثلاثةُ مواضعَ متفرّقةٌ لا كومةٌ في نقطةٍ واحدة. */
 const P=o.texts.map(x=>x.p);
 ok(P.every(p=>Array.isArray(p)&&p.length===2&&
  isFinite(p[0])&&isFinite(p[1])),"كلُّ موضعٍ نقطةٌ منتهية");
 const far=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])>200;
 ok(far(P[0],P[1])&&far(P[1],P[2])&&far(P[0],P[2]),
  "والمواضعُ الثلاثةُ متفرّقة");
 /* الضلعُ الجديد: عنوانُه قريبٌ من منتصفِ الوتر الأخضر */
 const e=o.lines[0];
 const lab=o.texts[2];
 ok(near2(lab.p,e.a,e.b,900),
  "وعنوانُ الضلعِ عند منتصفه لا بعيداً عنه");
 /* والإزاحةُ عموديةٌ: العنوانُ ليس فوق الخطِّ تماماً فيُقرأ */
 ok(!near2(lab.p,e.a,e.b,100),"ومُزاحٌ عنه قليلاً فلا يُطمَس");
});

group("الألوانُ تحمل المعنى: الأحمرُ يُقطَع والأخضرُ يُنشَأ",()=>{
 const o=ghostOf("chamfer");
 const C=o.texts.map(x=>x.c);
 eq(C.filter(c=>c==="#ff6f6f").length,2,"عنوانا القطعِ أحمرانِ");
 eq(C.filter(c=>c==="#5cd98e").length,1,"وعنوانُ الضلعِ الجديد أخضر");
 /* وبلونِ الخطِّ الذي يُعنوِنه لا بلونٍ ثالثٍ يُربِك */
 eq(o.lines[0].c,"#5cd98e","الوترُ أخضر");
 eq(o.lines[1].c,"#ff6f6f","والقطعانِ حمراء");
});

group("استدارةُ الركن: نق لا طولُ وتر",()=>{
 const o=ghostOf("fillet");
 eq(o.lines.length,3,"الخطوطُ الثلاثة");
 eq(o.texts.length,3,"وثلاثةُ عناوين");
 const T=txt(o);
 ok(T.some(s=>/^نق 0\.500 م/.test(s)),
  `نصفُ القطرِ مُعلَمٌ بـ«نق» — الوترُ ليس القوسَ: ${JSON.stringify(T)}`);
 ok(!T.some(s=>/0\.707/.test(s)),
  "ولا يُكتَب طولُ الوترِ كأنّه طولُ القوس");
});

group("السجلُّ سطرٌ واحدٌ لا خمسة",()=>{
 corner();
 rig.defs("chamfer");
 R.begin("chamfer");
 rig.at(2000,0);
 rig.clear();
 rig.at(0,2000);
 const L=rig.reps();
 eq(L.length,1,`سطرٌ واحدٌ بعد النقرة الثانية — جاء ${L.length}`);
 ok(/المخطَّط/.test(L[0]),"يُحيل إلى المخطَّط حيث الأرقام");
 ok(/Enter/.test(L[0])&&/Esc/.test(L[0]),"ويذكر المفتاحَين");
 /* والخلاصةُ الرقميةُ تبقى فيه: قارئُ الشاشة لا يرى القماش */
 ok(/0\.707/.test(L[0])&&/90°/.test(L[0]),
  `والرقمُ الحاسمُ منطوقٌ لمن لا يُبصر: ${L[0]}`);
});

group("التنفيذُ لم يتغيّر — التحسينُ في العرضِ وحده",()=>{
 corner();
 rig.defs("chamfer");
 R.begin("chamfer");
 rig.at(2000,0);
 rig.at(0,2000);
 rig.enter();
 eq(S.walls.length,3,"ثلاثةُ جدرانٍ كما كان العقد");
 ok(S.walls.some(w=>Math.abs(W.wallLen(w)-707.1)<3),
  "والقطريُّ 707 مم");
});

group("شبحٌ قبل النقرةِ الثانية — من الجدار تحت المؤشّر",()=>{
 corner();
 rig.defs("chamfer");
 R.begin("chamfer");
 rig.at(2000,0);
 const g=R.T.def.prev(R.T.ctx,[0,2000]);
 ok(g.filter(x=>x.t==="tx").length===3,
  "الأرقامُ تظهر قبل النقرِ فترى الناتجَ قبل أن تُلزِمَ نفسك");
 /* ولا شبحَ على جدارٍ لا يصلح */
 eq(R.T.def.prev(R.T.ctx,[99999,99999]).length,0,
  "ولا شبحَ حيث لا ركن");
});

process.exit(summary()?1:0);
