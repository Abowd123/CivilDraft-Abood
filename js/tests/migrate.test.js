/* ═══ اختبار الهجرة من «mistar» إلى «civildraft» ═══
   شِبهُ IndexedDB هنا يعرف الأسماء: قواعد متعدّدة، وفتحٌ بلا رقمٍ
   لقاعدةٍ غائبة يُطلِق معاملة الترقية فإن أُجهضت لم تُنشَأ — وهذا هو
   السلوك الذي تعتمد عليه الهجرة كي لا تخلق «mistar» فارغةً.
   وكل سيناريو يأخذ نسخةً جديدةً من الوحدة (?tag) — فذاكرتها الداخلية
   (الاتصال المحفوظ، وعلم الهجرة) لا تتسرّب بين السيناريوهات كأنها
   إعادةُ تحميلٍ حقيقية.
   التشغيل:  node js/tests/migrate.test.js                          */
import {shim,group,groupAsync,ok,eq,deep,summary} from "./harness.js";
shim();

/* ═══ IndexedDB بالأسماء ═══ */
const OPENED=[];              /* أسماء ما فُتح — لفحص ما لم يُفتَح */
let WITH_DATABASES=false;
const DBS=new Map();          /* الاسم ⇒ {ver, stores:Map(اسم ⇒ Map)} */
const later=fn=>setTimeout(fn,0);
const conn=rec=>({
 objectStoreNames:{contains:n=>rec.stores.has(n)},
 createObjectStore:n=>{rec.stores.set(n,new Map())},
 close(){},
 transaction(st){
  if(!rec.stores.has(st))throw new Error("NotFoundError");
  const M=rec.stores.get(st);
  const tx={objectStore:()=>({
   put:(v,k)=>{M.set(k,structuredClone(v))},
   delete:k=>{M.delete(k)},
   get:k=>{
    const rq={};
    later(()=>{
     rq.result=M.has(k)?structuredClone(M.get(k)):undefined;
     if(rq.onsuccess)rq.onsuccess();
    });
    return rq;
   }})};
  later(()=>{if(tx.oncomplete)tx.oncomplete()});
  return tx;
 }});
globalThis.indexedDB={
 open(name,ver){
  OPENED.push(name);
  const rq={};
  later(()=>{
   let rec=DBS.get(name);
   if(!rec){
    let aborted=false;
    rec={ver:ver||1,stores:new Map()};
    rq.result=conn(rec);
    rq.transaction={abort(){aborted=true}};
    if(rq.onupgradeneeded)rq.onupgradeneeded();
    if(aborted){
     if(rq.onerror)rq.onerror({preventDefault(){}});
     return;                      /* لم تُنشَأ */
    }
    DBS.set(name,rec);
   }else if(ver&&ver>rec.ver){
    rec.ver=ver; rq.result=conn(rec);
    if(rq.onupgradeneeded)rq.onupgradeneeded();
   }
   rq.result=conn(rec);
   if(rq.onsuccess)rq.onsuccess();
  });
  return rq;
 },
 deleteDatabase(n){DBS.delete(n); return {}},
 databases(){
  if(!WITH_DATABASES)return undefined;
  return Promise.resolve([...DBS.keys()].map(name=>({name})));
 }};
/* لا databases() إلّا حين نطلبها — فيُفحَص المسارَان معاً */
const realDatabases=globalThis.indexedDB.databases;
Object.defineProperty(globalThis.indexedDB,"databases",{
 get(){return WITH_DATABASES?realDatabases:undefined}});

const reset=()=>{
 DBS.clear(); OPENED.length=0; localStorage.clear();
};
const seed=(name,ver,stores)=>{
 DBS.set(name,{ver,stores:new Map(Object.entries(stores).map(
  ([s,o])=>[s,new Map(Object.entries(o))]))});
};
const peek=(name,st,k)=>{
 const r=DBS.get(name);
 return r&&r.stores.has(st)?r.stores.get(st).get(k):undefined;
};
let N=0;
const fresh=f=>import(f+"?t"+(++N));      /* إعادةُ تحميلٍ */
/* ونسخةٌ ثابتةٌ لفحص دالّةٍ خالصةٍ لا تمسّ التخزين (P5-012) */
const RG=await import("../tools/registry.js");

const D={walls:[{id:"W1",a:[0,0],b:[5000,0],t:200,type:"int",align:"c"}],
 opens:[],areas:[],dims:[],meta:{name:"قديم",scale:100},__t:1000};
const D2={walls:[],opens:[],areas:[],meta:{name:"جديد"},__t:2000};
const SN={walls:[{id:"W9"}],opens:[],areas:[],meta:{name:"لقطة"}};

/* ═══ io/store.js — IndexedDB ═══ */
await groupAsync("io/store: التثبيت على الاسم الجديد",async()=>{
 reset();
 const ST=await fresh("../io/store.js");
 await ST.save(D2);
 ok(DBS.has("civildraft"),"الحفظ يقع في «civildraft»");
 eq(peek("civildraft","state","doc").meta.name,"جديد","والمحتوى هناك");
 ok(!DBS.has("mistar"),"ولا تُنشَأ «mistar» ببصرِ الهجرة");
});

await groupAsync("io/store: تثبيتٌ جديد بلا قديم",async()=>{
 reset();
 const ST=await fresh("../io/store.js");
 const r=await ST.load();
 eq(r,null,"لا شيء يُحمَّل");
 ok(!DBS.has("mistar"),"والفحص لا يخلق قاعدةً قديمةً فارغة");
 ok(!!peek("civildraft","state","__migrated"),"وتُسجَّل علامة الهجرة");
});

await groupAsync("io/store: نسخُ آخر حالة مع بقاء القديم",async()=>{
 reset();
 seed("mistar",2,{state:{doc:D},snaps:{s1:SN}});
 localStorage.setItem("mistar.snaps",JSON.stringify([{id:"s1"}]));
 const ST=await fresh("../io/store.js");
 const r=await ST.load();
 ok(!!r&&!!r.data,"الحالة القديمة تُحمَّل");
 deep(r.data,D,"كما هي");
 deep(peek("civildraft","state","doc"),D,"وتُكتَب في «civildraft»");
 deep(await ST.snapGet("s1"),SN,"واللقطات تُنسَخ معها — وإلّا يتيتم فهرسها");
 deep(peek("mistar","state","doc"),D,"والقديمة لم تُمَسّ");
 deep(peek("mistar","snaps","s1"),SN,"ولا لقطاتها");
 ok(!peek("mistar","state","__migrated"),"ولا علامةَ فيها — لا يُكتَب فيها شيء");
});

await groupAsync("io/store: الجديد الموجود لا يُكتَب فوقه",async()=>{
 reset();
 seed("mistar",2,{state:{doc:D},snaps:{}});
 seed("civildraft",2,{state:{doc:D2},snaps:{}});
 const ST=await fresh("../io/store.js");
 const r=await ST.load();
 eq(r.data.meta.name,"جديد","يفوز الجديد");
 eq(peek("civildraft","state","doc").meta.name,"جديد","ويبقى كما هو");
 ok(!OPENED.includes("mistar"),"والقديمة لا تُفتَح أصلاً");
});

await groupAsync("io/store: لمرةٍ واحدة — الحذف لا يُحيي القديم",async()=>{
 reset();
 seed("mistar",2,{state:{doc:D},snaps:{}});
 const A=await fresh("../io/store.js");
 ok(!!(await A.load()),"الإقلاع الأول يُهاجِر");
 await A.del();                       /* newState() تنادي هذا */
 eq(peek("civildraft","state","doc"),undefined,"المستند حُذف عمداً");
 const B=await fresh("../io/store.js"); /* إقلاعٌ تالٍ */
 eq(await B.load(),null,"ولا يعود القديم");
 eq(peek("civildraft","state","doc"),undefined,"ولا يُكتَب ثانيةً");
 ok(!!peek("mistar","state","doc"),"وهو باقٍ نسخةً احتياطية");
});

await groupAsync("io/store: لا تُعاد الهجرة بعد تغيّر القديم",async()=>{
 reset();
 seed("mistar",2,{state:{doc:D},snaps:{}});
 const A=await fresh("../io/store.js");
 await A.load();
 DBS.get("mistar").stores.get("state").set("doc",D2);   /* نسخة قديمة أحدث */
 const B=await fresh("../io/store.js");
 eq((await B.load()).data.meta.name,"قديم","يبقى المهاجَر لا الأحدث في القديم");
});

await groupAsync("io/store: قاعدةٌ قديمة بلا مستند ولا لقطات (إصدار ١)",async()=>{
 reset();
 seed("mistar",1,{state:{}});
 const ST=await fresh("../io/store.js");
 eq(await ST.load(),null,"لا شيء يُنقَل");
 ok(!!peek("civildraft","state","__migrated"),"وتُغلَق الهجرة");
 reset();
 seed("mistar",1,{state:{doc:D}});          /* بلا مخزن snaps */
 const S2=await fresh("../io/store.js");
 deep((await S2.load()).data,D,"ومستندٌ بلا مخزن لقطاتٍ يُنقَل بلا رمي");
});

await groupAsync("io/store: مع indexedDB.databases()",async()=>{
 WITH_DATABASES=true;
 reset();
 const A=await fresh("../io/store.js");
 await A.load();
 ok(!OPENED.includes("mistar"),"غائبةٌ في القائمة ⇒ لا تُفتَح");
 reset();
 seed("mistar",2,{state:{doc:D},snaps:{}});
 const B=await fresh("../io/store.js");
 deep((await B.load()).data,D,"وحاضرةٌ ⇒ تُنسَخ");
 WITH_DATABASES=false;
});

/* ═══ purge — لا يُبقي نسخةً تُحيي ما مُسِح ═══ */
await groupAsync("io/store: المسح يشمل النسخ الاحتياطية",async()=>{
 reset();
 seed("mistar",2,{state:{doc:D},snaps:{}});
 seed("mistar.autosave",1,{snapshots:{current:{v:1,ts:1,data:{}}}});
 seed("civildraft.autosave",1,{snapshots:{current:{v:1,ts:2,data:{}}}});
 localStorage.setItem("mistar.ui",'{"theme":"dark"}');
 localStorage.setItem("mistar.ai",'{"key":"سرّ","keep":1}');
 localStorage.setItem("civildraft.ai",'{"key":"سرّ","keep":1}');
 localStorage.setItem("civildraft.opts",'{}');
 /* مفتاحان بصيغة colon لا يُعدَّدان صراحةً — يجب أن يُمسحا كذلك */
 localStorage.setItem("mistar:pricing",'{"wall":{"rate":1}}');
 localStorage.setItem("civildraft:pricing",'{"wall":{"rate":2}}');
 const ST=await fresh("../io/store.js");
 await ST.load();                       /* تُهاجَر */
 const r=await ST.purge();
 ok(r.keys.includes("mistar.ai")&&r.keys.includes("civildraft.ai"),
  "يمسح القديم والجديد معاً");
 ok(r.keys.includes("mistar.ui")&&r.keys.includes("civildraft.opts"),
  "لكل المفاتيح الستّة");
 ok(r.keys.includes("mistar:pricing")&&r.keys.includes("civildraft:pricing"),
  "وأيضاً مفاتيح colon غير المُعدَّدة صراحةً");
 eq(localStorage.getItem("mistar.ai"),null,"ومفتاح المزوّد القديم لا يبقى");
 eq(localStorage.getItem("mistar:pricing"),null,"ولا مفتاح التسعير القديم");
 eq(localStorage.getItem("civildraft:pricing"),null,"ولا الجديد");
 eq(DBS.size,0,"وكل القواعد الأربع");
 const B=await fresh("../io/store.js");
 eq(await B.load(),null,"والإقلاع بعده فارغ — لا إحياء");
});

/* ═══ core/migrate-autosave.js — الهجرة الوحيدة الباقية للحفظ
   الاحتياطي الثانوي، بعد إزالة core/persist.js وربطه بالكامل
   (انظر بند ٢٫١ في CHANGES.md). لا createAutosave بعد اليوم —
   الوحدة تكتفي بنقل لقطةٍ واحدة ثم تصمت. ═══ */
await groupAsync("migrate-autosave: الهجرة من mistar.autosave",async()=>{
 reset();
 const SNAP={v:1,ts:5,meta:{name:"س"},data:{walls:[1]}};
 seed("mistar.autosave",1,{snapshots:{current:SNAP}});
 const M=await fresh("../core/migrate-autosave.js");
 const r=await M.migrateAutosave();
 eq(r.from,"mistar.autosave","from يذكر القاعدة القديمة");
 eq(r.why,"نُقلت","والسبب يطابق ذلك");
 deep(peek("civildraft.autosave","snapshots","current"),SNAP,
  "اللقطة القديمة تُنسَخ حرفياً إلى «civildraft.autosave»");
 deep(peek("mistar.autosave","snapshots","current"),SNAP,
  "والقديمة لا تُمَسّ — النسخ لا النقل");
});

await groupAsync("migrate-autosave: لمرّةٍ واحدة — لا إحياء بعد الأولى",async()=>{
 reset();
 seed("mistar.autosave",1,{snapshots:{current:{v:1,ts:5,data:{a:1}}}});
 const A=await fresh("../core/migrate-autosave.js");
 ok((await A.migrateAutosave()).from==="mistar.autosave",
  "الإقلاع الأول يُهاجِر");
 const B=await fresh("../core/migrate-autosave.js");   /* إقلاعٌ تالٍ */
 const r=await B.migrateAutosave();
 eq(r.from,null,"العلامة __migrated تمنع الإحياء");
 eq(r.why,"مضت مرّةً","والسبب يوضّح ذلك");
});

await groupAsync("migrate-autosave: الجديدة الموجودة تفوز ولا تُستبدَل",async()=>{
 reset();
 seed("mistar.autosave",1,{snapshots:{current:{v:1,ts:5,data:{a:1}}}});
 seed("civildraft.autosave",1,{snapshots:{current:{v:1,ts:9,data:{a:2}}}});
 const C=await fresh("../core/migrate-autosave.js");
 const r=await C.migrateAutosave();
 eq(r.from,null,"لقطةٌ جديدةٌ موجودة ⇒ لا هجرة");
 eq(peek("civildraft.autosave","snapshots","current").ts,9,
  "والجديدة تبقى كما هي");
});

await groupAsync("migrate-autosave: بلا قديمٍ لا تُنشَأ «mistar.autosave»",async()=>{
 reset();
 const P=await fresh("../core/migrate-autosave.js");
 const r=await P.migrateAutosave();
 eq(r.from,null,"لا لقطة");
 eq(r.why,"لا لقطة قديمة","والسبب يذكر غياب اللقطة");
 ok(!DBS.has("mistar.autosave"),"ولا قاعدةٌ قديمةٌ فارغة تُنشَأ بالفحص");
});

await groupAsync("migrate-autosave: peekOldAutosave للطوارئ وحدها",async()=>{
 reset();
 const SNAP={v:1,ts:7,meta:{name:"ط"},data:{walls:[9]}};
 seed("mistar.autosave",1,{snapshots:{current:SNAP}});
 const P=await fresh("../core/migrate-autosave.js");
 deep(await P.peekOldAutosave(),SNAP,"يعيد لقطة القديمة كما هي بلا هجرة");
 ok(!DBS.has("civildraft.autosave"),
  "peek وحده لا يكتب في القاعدة الجديدة");

 reset();
 const Q=await fresh("../core/migrate-autosave.js");
 eq(await Q.peekOldAutosave(),null,"بلا قديمٍ: لا شيء");
 ok(!DBS.has("mistar.autosave"),"ولا يخلق قاعدةً فارغة");
});

/* ═══ مفاتيح localStorage ═══ */
await groupAsync("ui/store: mistar.ui ⇒ civildraft.ui",async()=>{
 reset();
 const raw='{"theme":"light","cmdW":700}';
 localStorage.setItem("mistar.ui",raw);
 const U=await fresh("../ui/store.js");
 ok(U.loadUI(false),"يُحمَّل");
 eq(U.UIS.theme,"light","بقيم القديم");
 eq(U.UIS.cmdW,700,"كلِّها");
 eq(localStorage.getItem("civildraft.ui"),raw,"وتُنسَخ نصّاً كما هي");
 eq(localStorage.getItem("mistar.ui"),raw,"والقديم باقٍ");
 U.uiSet("theme","dark");
 await new Promise(r=>setTimeout(r,700));          /* saveUI مؤجَّل ٥٠٠ */
 eq(JSON.parse(localStorage.getItem("civildraft.ui")).theme,"dark",
  "والحفظ يقع في الجديد");
 eq(localStorage.getItem("mistar.ui"),raw,"ولا يمسّ القديم");

 reset();
 localStorage.setItem("mistar.ui",'{"theme":"light"}');
 localStorage.setItem("civildraft.ui",'{"theme":"dark"}');
 const U2=await fresh("../ui/store.js");
 U2.loadUI(false);
 eq(U2.UIS.theme,"dark","الجديد الموجود يفوز ولا يُكتَب فوقه");

 reset();
 localStorage.setItem("mistar.ui",raw);
 const U3=await fresh("../ui/store.js");
 eq(U3.loadUI(true),false,"وضع الإنقاذ: المصنع وحده");
 eq(U3.UIS.theme,"dark","لا يقرأ التفضيلات");
 eq(localStorage.getItem("civildraft.ui"),raw,"لكن النسخ الخام يتمّ");
 reset();
 const U4=await fresh("../ui/store.js");
 eq(U4.loadUI(false),false,"بلا قديمٍ ولا جديد: لا شيء");
 eq(localStorage.getItem("civildraft.ui"),null,"ولا يُخلَق مفتاحٌ فارغ");
});

await groupAsync("tools/registry: mistar.opts ⇒ civildraft.opts",async()=>{
 reset();
 const raw='{"wall":{"t":"0.2"}}';
 localStorage.setItem("mistar.opts",raw);
 const R=await fresh("../tools/registry.js");
 R.loadOpts();
 eq(R.OPT.wall&&R.OPT.wall.t,"0.2","خيارات القديم تُحمَّل");
 eq(localStorage.getItem("civildraft.opts"),raw,"وتُنسَخ");
 eq(localStorage.getItem("mistar.opts"),raw,"والقديم باقٍ");
 R.setOpt("wall","t","0.3");
 eq(JSON.parse(localStorage.getItem("civildraft.opts")).wall.t,"0.3",
  "والحفظ في الجديد");
 eq(localStorage.getItem("mistar.opts"),raw,"لا في القديم");
});

await groupAsync("ai/net: mistar.ai ⇒ civildraft.ai",async()=>{
 reset();
 const raw='{"url":"http://x/v1","model":"m","key":"سرّ","keep":1}';
 localStorage.setItem("mistar.ai",raw);
 const N1=await fresh("../ai/net.js");
 N1.loadAI();
 eq(N1.AI.model,"m","إعداد القديم يُحمَّل");
 eq(N1.AI.key,"سرّ","ومفتاحه");
 eq(localStorage.getItem("civildraft.ai"),raw,"ويُنسَخ");
 eq(localStorage.getItem("mistar.ai"),raw,"والقديم باقٍ");
 N1.AI.model="n"; N1.saveAI();
 eq(JSON.parse(localStorage.getItem("civildraft.ai")).model,"n","الحفظ في الجديد");
 eq(localStorage.getItem("mistar.ai"),raw,"لا في القديم");

 reset();
 localStorage.setItem("mistar.ai",'{"model":"قديم"}');
 localStorage.setItem("civildraft.ai",'{"model":"جديد"}');
 const N2=await fresh("../ai/net.js");
 N2.loadAI();
 eq(N2.AI.model,"جديد","الجديد الموجود يفوز");
});

await groupAsync("core/pricing: mistar:pricing ⇒ civildraft:pricing",async()=>{
 reset();
 const raw='{"wall":{"label":"جدران","unit":"م²","rate":999}}';
 localStorage.setItem("mistar:pricing",raw);
 const P1=await fresh("../core/pricing.js");
 eq(P1.getRate("wall"),999,"السعر القديم يُقرأ عند أول تحميل");
 eq(localStorage.getItem("civildraft:pricing"),raw,"ويُنسَخ نصّاً كما هو");
 eq(localStorage.getItem("mistar:pricing"),raw,"والقديم باقٍ نسخةً احتياطية");
 P1.setRate("wall",120);
 eq(JSON.parse(localStorage.getItem("civildraft:pricing")).wall.rate,120,
  "الحفظ اللاحق يقع في المفتاح الجديد");
 eq(localStorage.getItem("mistar:pricing"),raw,"ولا يمسّ القديم");

 reset();
 localStorage.setItem("mistar:pricing",'{"wall":{"rate":1}}');
 localStorage.setItem("civildraft:pricing",'{"wall":{"rate":2}}');
 const P2=await fresh("../core/pricing.js");
 eq(P2.getRate("wall"),2,"الجديد الموجود يفوز ولا يُستبدَل بالقديم");

 reset();
 const P3=await fresh("../core/pricing.js");
 eq(P3.getRate("wall"),120,"بلا قديمٍ ولا جديد: الافتراضي وحده");
 eq(localStorage.getItem("civildraft:pricing"),null,
  "ولا يُخلَق مفتاحٌ جديدٌ فارغ من فراغ");
});

await groupAsync("core/code: mistar.code ⇒ civildraft.code",async()=>{
 reset();
 const raw='{"doorW":850,"corrW":1100}';
 localStorage.setItem("mistar.code",raw);
 const C1=await fresh("../core/code.js");
 C1.loadCode();
 eq(C1.CODE.doorW,850,"الاشتراط القديم يُقرأ");
 eq(C1.CODE.corrW,1100,"كلّه");
 eq(localStorage.getItem("civildraft.code"),raw,"ويُنسَخ إلى المفتاح الجديد");
 eq(localStorage.getItem("mistar.code"),raw,"والقديم باقٍ");

 reset();
 localStorage.setItem("mistar.code",'{"doorW":1000}');
 localStorage.setItem("civildraft.code",'{"doorW":1200}');
 const C2=await fresh("../core/code.js");
 C2.loadCode();
 /* قيمٌ واقعية: loadCode صار يرفض ما خرج عن المدى المعقول (٣٫٤) */
 eq(C2.CODE.doorW,1200,"الجديد الموجود يفوز");
});

/* ═══ P5-012 — هجرةُ أسماء مفاتيح الخيارات ═══
   `griddim.left/right` ⇒ `xmin/xmax`. ما يهمّ هنا ثلاثةٌ: أنّ اختيار
   المستخدم لا يضيع، وأنّ القيمةَ الجديدةَ لا تُكتَب فوقها، وأنّ
   الهجرةَ لا تتكرّر كلَّ إقلاعٍ فتُتعِب التخزين. */
await groupAsync("tools/registry: griddim.left/right ⇒ xmin/xmax",async()=>{
 reset();
 /* مستخدمٌ أطفأ «يمين» وأبقى «يسار» — اختيارٌ لا افتراض */
 localStorage.setItem("civildraft.opts",
  JSON.stringify({griddim:{top:1,bot:1,left:1,right:0,gap:"2.5"}}));
 const R=await fresh("../tools/registry.js");
 R.loadOpts();
 const g=R.OPT.griddim;
 eq(g.xmin,1,"left ⇒ xmin بقيمتها");
 eq(g.xmax,0,"وright ⇒ xmax — والإطفاءُ لم يُستبدَل بالافتراض 1");
 eq(g.left,undefined,"والمفتاحُ القديم زال");
 eq(g.right,undefined,"وكذلك الثاني — لا قيمةَ ميتةٌ تُربِك قارئاً");
 eq(g.gap,"2.5","وما لم يُهاجَر كما هو");
 eq(g.top,1,"وtop لم تُمَسّ — المحورُ الكتليُّ لا يُعكَس في RTL");
 /* وكُتِب فوراً: إقلاعٌ ثانٍ لا يجد ما يهاجر */
 const onDisk=JSON.parse(localStorage.getItem("civildraft.opts")).griddim;
 eq(onDisk.xmin,1,"والهجرةُ محفوظةٌ على القرص");
 eq(onDisk.left,undefined,"والقديمُ ليس فيه");
 const R2=await fresh("../tools/registry.js");
 R2.loadOpts();
 eq(R2.OPT.griddim.xmax,0,"وإقلاعٌ ثانٍ يقرأ الجديدَ مباشرةً");
});

await groupAsync("tools/registry: الجديدُ الموجودُ يفوز ولا يُكتَب فوقه",async()=>{
 reset();
 /* ملفٌّ خُزِّن بعد الهجرة ثم فُتح بنسخةٍ قديمةٍ من التطبيق فأعادت
    القديم: الجديدُ أحدثُ فلا يُدَس فوقه */
 localStorage.setItem("civildraft.opts",
  JSON.stringify({griddim:{left:1,xmin:0,right:1,xmax:0}}));
 const R=await fresh("../tools/registry.js");
 R.loadOpts();
 eq(R.OPT.griddim.xmin,0,"xmin الموجودةُ باقيةٌ كما هي");
 eq(R.OPT.griddim.xmax,0,"وxmax كذلك");
 eq(R.OPT.griddim.left,undefined,"والقديمُ يُحذَف لا يُدمَج");
});

group("tools/registry: renameOpts دالّةٌ خالصةٌ ومحروسة",()=>{
 /* تُستدعى على ما يُقرأ من التخزين، وقد يكون أيَّ شيء */
 const R=RG;
 eq(R.renameOpts(null),0,"null لا يرمي");
 eq(R.renameOpts("نصّ"),0,"ونصّ");
 eq(R.renameOpts([1,2]),0,"ومصفوفة");
 eq(R.renameOpts({}),0,"وكائنٌ فارغٌ لا يُهاجِر شيئاً");
 eq(R.renameOpts({griddim:"تالف"}),0,"وقيمةٌ غيرُ كائنٍ لأداةٍ تُتجاوَز");
 eq(R.renameOpts({wall:{left:1}}),0,
  "ومفتاحُ left في أداةٍ أخرى ليس هذا المفتاح — الجدولُ صريح");
 const o={griddim:{left:1}};
 eq(R.renameOpts(o),1,"ويعيد عددَ ما نُقِل");
 eq(o.griddim.xmin,1,"بعد النقل");
 eq(R.renameOpts(o),0,"والنداءُ الثاني لا ينقل شيئاً — خاملٌ");
 /* والجدولُ ثلاثياتٌ لا مفاتيحُ كائن (حارسُ الاتجاه في dom.js) */
 ok(Array.isArray(R.OPTRENAME),"والجدولُ مصفوفةٌ لا كائنٌ بمفاتيحَ فيزيائية");
 ok(R.OPTRENAME.every(r=>Array.isArray(r)&&r.length===3),
  "وكلُّ بندٍ ثلاثيّ: الأداة · القديم · الجديد");
});

process.exit(summary()?1:0);
