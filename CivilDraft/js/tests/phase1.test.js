/* ═══ اختبارات المرحلة 1: المدقّق (lint) + هجرة الحفظ الاحتياطي ═══
   بأسلوب المعمل الذاتي (كما في help.test.js) لا vitest — المشروع
   بلا اعتماديات عمداً. lint.js يُختبَر على حالةٍ حقيقية (S وaddWall
   وaddStair الحقيقيّان)، لا سجلٌّ مُصطنَع. migrate-autosave.js يحتاج
   IndexedDB فقط، فيُلبَس شِبهاً صغيراً محلّياً هنا (لا في harness.js
   العام، إذ لا وحدة نواةٍ أخرى تحتاجه).

   التشغيل:  node js/tests/phase1.test.js                          */
import {shim,group,groupAsync,ok,eq,deep,summary} from "./harness.js";
shim();

const {S,touchGeom}=await import("../core/state.js");
const {addWall}=await import("../core/walls.js");
const {addStair}=await import("../core/stairs.js");
const {lint,lintText}=await import("../ai/lint.js");

function resetState(){
 S.walls.length=0; S.opens.length=0; S.areas.length=0; S.stairs.length=0;
 touchGeom();   /* يُبطل كاش looseEnds — تعديلٌ مباشر على المصفوفة
                   لا يزيد VER.g تلقائياً كما يفعل addWall/delWall */
}

group("lint — على النواة الحقيقية",()=>{
 resetState();
 let rep=lint();
 ok(rep.ok,"حالةٌ فارغة = لا مشاكل");
 eq(rep.counts.total,0,"لا ملاحظات على رسمٍ فارغ");
 ok(lintText(rep).includes("سليم"),"lintText يبشّر بالسلامة");

 resetState();
 addWall([0,0],[3000,0],200,"int","c");   /* جدارٌ منعزل: طرفان طليقان */
 rep=lint();
 ok(rep.counts.warn>0,"جدارٌ منعزل يُنتج تحذيراً");
 ok(rep.issues.some(i=>i.code==="loose-ends"),"مصنّفٌ loose-ends");

 resetState();
 S.opens.push({id:"O1",wall:"لا-وجود-لهذا-الجدار"});   /* يتيمة */
 rep=lint();
 ok(rep.counts.err>0,"فتحةٌ يتيمة تُنتج خطأً");
 const bad=rep.issues.find(i=>i.code==="open-state");
 ok(!!bad&&bad.refs.includes("O1"),"مرجع الفتحة اليتيمة مذكور");

 resetState();
 S.areas.push({id:"A1",name:"مجلس",ring:[]});   /* حلقةٌ فارغة = صفرية */
 rep=lint();
 ok(rep.issues.some(i=>i.code==="area-open"),"مساحةٌ صفرية تُصنَّف area-open");

 resetState();
 addStair([1000,6000],[3000,6000],700,20,{h:3000});   /* عرضٌ أقلّ من الحدّ */
 rep=lint();
 ok(rep.issues.some(i=>i.code==="stair-check"),"درجٌ ضيّق يُصنَّف stair-check");

 resetState();
 ok(lint().ok,"إعادة الضبط تعيد الحالة للسلامة — لا تسريبَ بين الحالات");
});

/* ═══ core/migrate-autosave.js — بشِبه IndexedDB محلّي ═══
   شِبهٌ بالاسم (لا مخزنٌ واحد): يميّز mistar.autosave عن
   civildraft.autosave كما تفعل migrateOnce فعلاً. كل سيناريو يأخذ
   نسخةً جديدةً من الوحدة (?t=) لأن P (وعدُ الهجرة) داخليٌّ للوحدة
   ولا ينبغي أن يتسرّب بين سيناريوهات مستقلّة. */
await groupAsync("migrate-autosave: هجرةٌ لمرّةٍ واحدة",async()=>{
 const DBS=new Map();
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
    }
    rq.result=conn(rec);
    if(rq.onsuccess)rq.onsuccess();
   });
   return rq;
  },
  databases(){return undefined}
 };
 const seed=(name,stores)=>{
  DBS.set(name,{ver:1,stores:new Map(Object.entries(stores).map(
   ([s,o])=>[s,new Map(Object.entries(o))]))});
 };
 let N=0;
 const fresh=()=>import("../core/migrate-autosave.js?t="+(++N));

 /* بلا قديمٍ: لا شيء يُنقَل، ولا تُخلَق mistar.autosave */
 const A=await fresh();
 const rA=await A.migrateAutosave();
 eq(rA.from,null,"لا لقطة قديمة");
 ok(!DBS.has("mistar.autosave"),"ولا قاعدةٌ قديمةٌ فارغة تُنشَأ");

 /* بقديمٍ: تُنسَخ اللقطة الأخيرة، والقديمة تبقى كما هي */
 DBS.clear();
 const SNAP={v:1,ts:5,meta:{name:"س"},data:{walls:[1]}};
 seed("mistar.autosave",{snapshots:{current:SNAP}});
 const B=await fresh();
 const rB=await B.migrateAutosave();
 eq(rB.from,"mistar.autosave","from يذكر القاعدة القديمة");
 deep(DBS.get("civildraft.autosave").stores.get("snapshots").get("current"),
  SNAP,"واللقطة تُنسَخ حرفياً إلى الجديدة");
 deep(DBS.get("mistar.autosave").stores.get("snapshots").get("current"),
  SNAP,"والقديمة لا تُمَسّ");

 /* مرّةٌ ثانية على نفس القاعدة الجديدة: لا إعادة هجرة */
 const C=await fresh();
 const rC=await C.migrateAutosave();
 eq(rC.from,null,"العلامة __migrated تمنع الإحياء");
 eq(rC.why,"مضت مرّةً","والسبب يوضّح ذلك");

 /* peekOldAutosave: للطوارئ وحدها، تقرأ القديمة مباشرةً */
 const D=await fresh();
 const peeked=await D.peekOldAutosave();
 deep(peeked,SNAP,"peekOldAutosave يعيد لقطة القديمة كما هي");
});

process.exit(summary());

