/* ═══ التسريبُ والتزامن ═══
   P2-001 إعادةُ رسم نافذةٍ لا تُضاعف مستمعاتها · P2-002 حاضنُ الدليل
   الباقي يُربَط مرّةً · P2-013 كلُّ مراقبٍ مسجَّلٌ ويُفصَل القديم ·
   P2-003 عمليات اللقطات في طابورٍ واحد لا تتزاحم · P2-005 امتلاءُ
   التخزين يُقال ولا يُبتلَع.
   التشغيل:  node js/tests/leaks.test.js                           */
import {shim,group,groupAsync,ok,eq,summary} from "./harness.js";
shim();
const D=await import("../core/delegate.js");

/* عنصرٌ أدنى: يَعُدّ ما رُبط به فعلاً */
const mkEl=()=>{
 const L=[];
 return {
  L,
  addEventListener(t,f){L.push([t,f])},
  removeEventListener(t,f){
   const i=L.findIndex(x=>x[0]===t&&x[1]===f);
   if(i>=0)L.splice(i,1);
  },
  fire(t,ev){L.filter(x=>x[0]===t).forEach(x=>x[1](ev))}
 };
};

group("P2-001/P2-002 · الربطُ لمرّةٍ واحدة",()=>{
 const el=mkEl();
 let hits=0;
 const h=()=>{hits++};
 ok(D.bindOnce(el,"click",h,"win"),"الربطُ الأوّل يقع");
 for(let i=0;i<20;i++)ok(!D.bindOnce(el,"click",h,"win")||false,
  i?"":"وإعادةُ النداء لا تربط ثانية");
 eq(el.L.length,1,"مستمعٌ واحدٌ بعد عشرين إعادةَ رسم");
 el.fire("click");
 eq(hits,1,"ومعاودةٌ واحدةٌ لا عشرون");
 ok(D.isBound(el,"click","win"),"والعلامةُ مقروءة");
 /* مفتاحٌ آخر على نفس النوع ربطٌ مستقلّ */
 ok(D.bindOnce(el,"click",()=>{},"other"),"مفتاحٌ آخر يُربَط");
 eq(el.L.length,2,"فيصيران اثنين");
 /* والفكُّ صريحٌ ويُعيد السماح */
 ok(D.unbind(el,"click","win"),"الفكُّ يقع");
 eq(el.L.length,1,"فيعود واحداً");
 ok(!D.isBound(el,"click","win"),"والعلامةُ زالت");
 ok(D.bindOnce(el,"click",h,"win"),"ويُسمَح بربطٍ جديد بعده");
 /* ولا رميَ على ما ليس عنصراً */
 ok(!D.bindOnce(null,"click",h),"null لا يُربَط ولا يرمي");
 ok(!D.bindOnce(el,"click",null,"z"),"ولا دالّةَ null");
});

group("P2-013 · المراقبُ مسجَّلٌ والقديمُ يُفصَل",()=>{
 D.disposeObservers();
 const mk=()=>({gone:0,disconnect(){this.gone++}});
 const a=mk(), b=mk();
 D.keepObserver("stage",a);
 eq(D.observerNames().length,1,"مراقبٌ واحدٌ مسجَّل");
 D.keepObserver("stage",b);
 eq(a.gone,1,"إعادةُ التسجيل تفصل القديم");
 eq(D.observerOf("stage"),b,"والجديدُ هو المسجَّل");
 eq(D.observerNames().length,1,"ولا يتراكمان");
 D.keepObserver("ribbonH",mk());
 eq(D.observerNames().length,2,"واسمٌ آخرُ سجلٌّ آخر");
 eq(D.disposeObservers(),2,"والفصلُ الشاملُ يفصل الاثنين");
 eq(D.observerNames().length,0,"فيفرُغ السجلّ");
 eq(b.gone,1,"والمفصولُ فُصل فعلاً");
});

/* ═══ اللقطات ═══ شِبهُ IndexedDB وlocalStorage بسعةٍ نُحدّدها ═══ */
let CAP=1e9;
const M=new Map();
globalThis.localStorage={
 getItem:k=>(M.has(k)?M.get(k):null),
 setItem:(k,v)=>{
  const s=String(v);
  if(s.length>CAP){const e=new Error("q"); e.name="QuotaExceededError"; throw e}
  M.set(k,s);
 },
 removeItem:k=>{M.delete(k)}, clear:()=>M.clear(),
 get length(){return M.size}, key:i=>[...M.keys()][i]||null};
const DB=new Map();
const later=fn=>setTimeout(fn,0);
const st={put:(v,k)=>{DB.set(k,v)},delete:k=>{DB.delete(k)},
 get:k=>{const rq={};later(()=>{rq.result=DB.get(k); rq.onsuccess&&rq.onsuccess()});return rq}};
const db={objectStoreNames:{contains:()=>true},createObjectStore:()=>st,close(){},
 transaction:()=>{const tx={objectStore:()=>st}; later(()=>tx.oncomplete&&tx.oncomplete()); return tx}};
globalThis.indexedDB={open:()=>{const rq={result:db}; later(()=>rq.onsuccess&&rq.onsuccess()); return rq},
 databases:async()=>[], deleteDatabase:()=>({})};

const ST=await import("../core/state.js");
const W=await import("../core/walls.js");
const SN=await import("../io/snaps.js");
ST.newState(); ST.ensureShape();
ST.edit(()=>W.addWall([0,0],[3000,0],200,"int","c"),"جدار");

await groupAsync("P2-003 · اللقطاتُ المتزامنة لا تتزاحم",async()=>{
 SN.SNAP.list.length=0;
 SN.SNAP.max=4;
 /* ستُّ عملياتٍ تُطلَق معاً — المسارُ اليدويّ والمؤقّت في آنٍ واحد.
    بلا طابورٍ كانت كلُّها تقرأ القائمة نفسها وتكتب فوق بعضها. */
 const rs=await Promise.all([1,2,3,4,5,6].map(i=>SN.snapTake("ت"+i)));
 ok(rs.every(r=>r.ok),"كلُّ العمليات نجحت");
 const ids=rs.map(r=>r.id);
 eq(new Set(ids).size,6,"وستَّةُ معرّفاتٍ متمايزة");
 eq(SN.SNAP.list.length,4,"والقائمةُ عند سقفها لا فوقه ولا دونه");
 /* وكلُّ ما في القائمة من هذه الدفعة، وأحدثُ أربعة لا عشواء */
 ok(SN.SNAP.list.every(e=>ids.indexOf(e.id)>=0),
  "ولا معرّفَ غريبٌ ولا مفقود");
 /* والفهرسُ المكتوب يطابق القائمة — لا كتابةٌ أقدم غلبت الأحدث */
 const idx=JSON.parse(localStorage.getItem("civildraft.snaps")||"[]");
 eq(idx.length,4,"والمكتوبُ أربعة");
 eq(idx.map(x=>x.id).join(),SN.SNAP.list.map(x=>x.id).join(),
  "والمكتوبُ هو المعروض حرفاً");
 /* والحذفُ في الطابور كذلك: لا يحذف ما أضافته عمليةٌ أخرى */
 const keep=SN.SNAP.list[0].id;
 await Promise.all([SN.snapDrop(SN.SNAP.list[3].id),SN.snapTake("بعد")]);
 ok(SN.SNAP.list.some(e=>e.id===keep),"ما لم يُطلَب حذفُه باقٍ");
});

await groupAsync("P2-005 · امتلاءُ التخزين يُقال",async()=>{
 let said=null;
 SN.setSnapError(n=>{said=n});
 CAP=10;                       /* الفهرسُ لن يتّسع */
 const r=await SN.snapTake("ضيق");
 ok(!r.ok,"لا تُعِد نجاحاً والفهرسُ لم يُكتَب");
 eq(r.err,"QuotaExceededError","والسببُ مُسمّى");
 ok(/الفهرس/.test(r.msg||""),"والرسالةُ تشرح ما وقع");
 eq(said,"QuotaExceededError","والخطّافُ أُبلِغ مرّةً");
 CAP=1e9;
});

process.exit(summary()?1:0);
