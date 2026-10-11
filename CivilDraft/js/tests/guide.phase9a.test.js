/* ═══ مرحلة ٩أ — بنود منقولة من وحدة «تعلّم» (16.1–16.3) ═══
   اللوحة المرساة (dockPane.js) وتتبّع الاستخدام الفعلي (usage.js)،
   بلا أي مسٍّ لـengine.js ولا لتوقيع floaterOpen/Close/Body/IsOpen.
   التشغيل: node js/tests/guide.phase9a.test.js */
import {shim,shimDOM,fire,click,group,groupAsync,ok,eq,summary} from "./harness.js";
shim();
const doc=shimDOM();

/* ═══ 16.2 — usage.js: طبقةٌ صرفة فوق coverage()، لا تلمس S/OPT/hist ═══ */
const U=await import("../guide/usage.js");

group("16.2: markUsed/usedBefore — أول استخدامٍ يُسجَّل مرّةً واحدة",()=>{
 ok(!U.usedBefore("wall"),"لا استخدام مسبق لـwall");
 eq(U.markUsed("wall"),true,"أول تعليمٍ يعيد true");
 ok(U.usedBefore("wall"),"وصار مُستخدَماً");
 eq(U.markUsed("wall"),false,"التكرار لا يُعلَن استخداماً جديداً");
 eq(U.markUsed(""),false,"معرّفٌ فارغ يُرفَض");
 eq(U.markUsed(null),false,"و null كذلك");
 ok(U.USED.wall===1,"وUSED يحمل القيمة الخام مباشرةً");
});

group("16.2: loadUsage — تُحمَّل من localStorage وتتجاهل الفاسد",()=>{
 localStorage.clear();
 eq(U.loadUsage(),false,"لا شيء محفوظ بعد — تعيد false");
 localStorage.setItem("civildraft.guide.usage",JSON.stringify({door:1,win:0}));
 eq(U.loadUsage(),true,"محتوىً صالح يُحمَّل");
 ok(U.usedBefore("door")&&!U.usedBefore("win"),
  "door مُستخدمة وwin مُسجَّلة صفراً لا مستخدمة");
 localStorage.setItem("civildraft.guide.usage","{بيانات فاسدة");
 eq(U.loadUsage(),false,"JSON فاسد لا يُسقط — يعيد false بأمان");
});

group("16.2: usageCoverage — طبقةٌ مركّبة لا بديلاً عن coverage()",()=>{
 const fakeCoverage=()=>({total:10,covered:7,missing:["a","b","c"],pct:70});
 const r=U.usageCoverage(fakeCoverage);
 eq(r.total,10,"حقول coverage() الأصلية محفوظة");
 eq(r.covered,7,"كذلك");
 ok(typeof r.usedCount==="number","usedCount رقمٌ مضاف");
 ok(typeof r.usedPct==="number","usedPct كذلك");
 eq(r.usedPct,Math.round(r.usedCount/10*100),"النسبة محسوبةٌ من total الأصلي");
});

/* ═══ 16.1 — dockPane.js: استهلاكٌ بحتٌ لـcatalog.search وguideOpen ═══ */
/* أدواتٌ حقيقية تُسجَّل فيبني الفهرسُ نتائج فعلية (كما في guide.catalog.test.js) */
await import("../tools/draw.js");
await import("../tools/openings.js");
const {reg,renderPanel}=await import("../ui/panels.js");
const {wireDockPane}=await import("../guide/dockPane.js");

doc.body.innerHTML=`<div id="guidePane"></div>`;

await groupAsync("16.1: wireDockPane — لا شيء بلا عنصر الاستقبال",async()=>{
 let calls=0;
 wireDockPane("#doesNotExist",(id)=>{calls++; return id},()=>{});
 eq(calls,0,"reg لا تُنادى إن غاب العنصر المستهدف");
});

await groupAsync("16.1: يبني الفهرس ويستجيب للبحث وفتح الدليل",async()=>{
 let opened=null;
 wireDockPane("#guidePane",reg,id=>{opened=id===undefined?"__full__":id;});
 const el=doc.getElementById("guidePane");
 renderPanel("guide",true);
 ok(/gd-prow/.test(el.innerHTML),"القسم الأساسي يُبنى (شريط البحث)");
 ok(/أداة موثّقة/.test(el.innerHTML),"وسطر التغطية ظاهر");

 const q=el.querySelector("#gdQp");
 ok(!!q,"حقل البحث موجود");
 q.value="جدار";
 fire(q,"input");
 await new Promise(r=>setTimeout(r,140)); /* تأخير debounce 120ms */
 const list=el.querySelector("#gdList");
 ok(/data-open=/.test(list.innerHTML),"نتيجةٌ واحدة على الأقل لبحث «جدار»");

 const btn=el.querySelector("[data-open]");
 ok(!!btn,"زرّ نتيجة قابلٌ للنقر");
 click(btn);
 ok(opened&&opened!=="__full__","النقر على نتيجة يفتح مُعرِّفها عبر openFn(id)");

 opened=null;
 const full=el.querySelector("[data-gfull]");
 ok(!!full,"زرّ «فتح الدليل الكامل» موجود");
 click(full);
 eq(opened,"__full__","وفتح الدليل الكامل يُنادي openFn() بلا مُعرِّف");
});

process.exit(summary()?1:0);
