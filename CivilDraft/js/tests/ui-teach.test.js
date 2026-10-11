/* ═══ واجهة التعليم: ما يُكتب ظاهرٌ دائماً ═══ (درسُ صنع الفيديوهات)
   ١ · صفُّ مفاتيح الكتابة تحت سطر الأوامر (cmdkeys.js)
   ٢ · مفتاحُ الكتابة بجانب كلِّ خيار في شريط الخيارات (optbar.js)
   ٣ · وضعُ العرض: السطرُ المنفَّذ والمفاتيحُ فقاعاتٌ كبيرة (presenter.js)
   التشغيل:  node js/tests/ui-teach.test.js                          */
import {shim,shimCanvas,shimDOM,group,ok,eq,summary} from "./harness.js";
import {readdirSync,readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const K=await import("../ui/cmdkeys.js");
const PR=await import("../ui/presenter.js");
const src=p=>readFileSync(HERE+"../../"+p,"utf8");

group("مفاتيح الكتابة: ما يقبله السطر الآن",()=>{
 eq(K.keysFor(null,null).length,0,"بلا أداةٍ لا صفّ");
 const w=R.findTool("wall");
 const st=(w.steps||[]).find(s=>s.opts&&Object.keys(s.opts).length);
 const L=K.keysFor(w,st,k=>R.ov("wall",k));
 ok(L.some(x=>x.kind==="step"&&x.k==="C"),"حرفُ الخطوة C (إغلاق) يظهر في خطوته");
 const tv=R.ov("wall","t")??w.opts.find(o=>o.k==="t").def;
 ok(L.some(x=>x.k==="t="&&x.v===String(tv)),"ومفتاحُ السماكة t= بقيمته الآن");
 ok(L.some(x=>x.kind==="step"&&x.k==="U"&&x.n==="تراجع"&&x.ins==="u"),"وU (تراجع) باسمه، ويُكتب صغيراً كما تقبله الأداة");
 eq(L.filter(x=>x.kind==="opt").length,Math.min(K.KEYS_MAX_OPTS,w.opts.length),"وأوّلُ الخيارات فقط: صفٌّ يُقرأ لا يُزحَم");
 eq(L.slice(-2).map(x=>x.k).join(" "),"Enter Esc","وينتهي بـ Enter وEsc");
 const L0=K.keysFor(w,w.steps[0],k=>R.ov("wall",k));
 ok(!L0.some(x=>x.kind==="step"&&x.k==="C"),"وC لا يظهر في الخطوة الأولى (لا ضلعَ يُغلق)");
});
group("الرسمُ يقارن ولا يبني",()=>{
 const box={childElementCount:0,hidden:true,innerHTML:""};
 Object.defineProperty(box,"innerHTML",{get(){return this._h||""},set(v){this._h=v; this.childElementCount=(v.match(/class="ck/g)||[]).length},configurable:true});
 K.resetKeys();
 const w=R.findTool("wall"), L=K.keysFor(w,w.steps[0],k=>R.ov("wall",k));
 ok(K.renderKeys(box,L),"أوّلُ رسم");
 ok(!K.renderKeys(box,L),"ولا رسمَ ثانٍ لنفس الصفّ (تُنادى مع كل حركة مؤشّر)");
 ok(/data-ins="t="/.test(box.innerHTML)&&/<kbd>Enter<\/kbd>/.test(box.innerHTML),"الأزرار تكتب المفتاح، وEnter/Esc تسميات");
 ok(!/<script|onclick/i.test(box.innerHTML),"بلا onclick (CSP)");
 K.renderKeys(box,[]); eq(box.hidden,true,"وبلا أداةٍ يختفي");
});
group("شريط الخيارات يُري مفتاح الكتابة",()=>{
 const ob=src("js/ui/optbar.js");
 eq((ob.match(/\$\{ky\}/g)||[]).length,5,"كلُّ أنواع الضوابط الخمسة تحمل data-key");
 ok(/data-key\]>span:first-child::after/.test(src("css/tools.css"))&&/content:attr\(data-key\) "="/.test(src("css/tools.css")),"والمفتاحُ يُرسم بـ CSS لا نصّاً في التسمية");
});
group("وضعُ العرض",()=>{
 eq(PR.keyLabel({key:"Enter"}),"Enter","Enter");
 eq(PR.keyLabel({key:"Escape"}),"Esc","Esc");
 eq(PR.keyLabel({key:"z",ctrlKey:true}),"Ctrl+Z","Ctrl+Z");
 eq(PR.keyLabel({key:"F8"}),"F8","F8");
 eq(PR.keyLabel({key:"a"}),"","والحروفُ العادية لا (تظهر في السطر نفسه)");
 eq(PR.keyLabel(null),"","والمدخلُ الناقص لا يكسر");
 ok(!PR.presenterOn(),"مُطفأ افتراضاً");
 ok(typeof document!=="undefined","document متاح في الحاضنة");
});
group("موصول بالواجهة",()=>{
 ok(/id="clKeys"/.test(src("index.html")),"#clKeys في الصفحة");
 ok(/renderKeys\(\$\("#clKeys"\)/.test(src("js/app.js")),"وsyncPrompt يرسمه");
 ok(/new CustomEvent\("cd:cmd"/.test(src("js/ui/sugg.js"))&&/new CustomEvent\("cd:cmd"/.test(src("js/ui/studio.js")),"السطرُ المنفَّذ وسطرُ الدرس يطلقان cd:cmd");
 ok(/act:"presenter"/.test(src("js/ui/ribbon/schema.js")),"«وضع العرض» زرٌّ في تبويب «عرض»");
 ok(/setPresenter\(1\)/.test(src("js/ui/studio.js")),"والاستوديو يسجّل بوضع العرض");
});
process.exit(summary()?1:0);
