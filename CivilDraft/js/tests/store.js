/* ═══ اختبار التخزين ═══
   الموضع الوحيد الذي يضيع فيه عمل المستخدم، وكان بصفر اختبارات.
   شِبهٌ لـlocalStorage بسعةٍ محدودة نُحدّدها فنُشغِّل مسار الامتلاء
   فعلاً، وشِبهٌ لـIndexedDB في الذاكرة فنفحص الترميم — وهو حجر
   الدفعة: النسخة المنقوصة كانت تحجب الكاملة فيختفي المرجع.
   التشغيل:  node js/tests/store.js                              */
import {shim,group,groupAsync,ok,eq,deep,summary} from "./harness.js";
shim();

/* ═══ localStorage بسعةٍ نُحدّدها ═══ */
function lsQuota(bytes){
 const M=new Map();
 let cap=bytes;
 globalThis.localStorage={
  getItem:k=>(M.has(k)?M.get(k):null),
  setItem:(k,v)=>{
   const s=String(v);
   let tot=s.length;
   M.forEach((x,kk)=>{if(kk!==k)tot+=x.length});
   if(tot>cap){
    const e=new Error("quota");
    e.name="QuotaExceededError";
    throw e;
   }
   M.set(k,s);
  },
  removeItem:k=>{M.delete(k)},
  clear:()=>M.clear(),
  get length(){return M.size},
  key:i=>[...M.keys()][i]||null};
 return {map:M,setCap:v=>{cap=v}};
}
/* ═══ IndexedDB في الذاكرة ═══
   أصغرُ ما يكفي واجهةَ store.js: open/transaction/put/get/delete
   وclose وdeleteDatabase. والأحداث على تِكّةٍ تالية كالأصل، فلو
   قُلب ترتيبُ الإسناد في store.js لانكشف. */
function fakeIDB(){
 const M=new Map();
 const later=fn=>setTimeout(fn,0);
 const store={
  put:(v,k)=>{M.set(k,v)},
  delete:k=>{M.delete(k)},
  get:k=>{
   const rq={result:undefined};
   later(()=>{rq.result=M.get(k); if(rq.onsuccess)rq.onsuccess()});
   return rq;
  }};
 const db={
  objectStoreNames:{contains:()=>true},
  createObjectStore:()=>store,
  close:()=>{},
  transaction:()=>{
   const tx={objectStore:()=>store};
   later(()=>{if(tx.oncomplete)tx.oncomplete()});
   return tx;
  }};
 globalThis.indexedDB={
  open:()=>{
   const rq={result:db};
   later(()=>{if(rq.onsuccess)rq.onsuccess()});
   return rq;
  },
  deleteDatabase:()=>{M.clear()}};
 return M;
}
const Q=lsQuota(1e9);
const IDB=fakeIDB();
const ST=await import("../io/store.js");

const doc=(nWalls,nRef)=>({
 walls:Array.from({length:nWalls},(_,i)=>({id:"W"+(i+1),
  a:[0,i*100],b:[5000,i*100],t:200,type:"int",align:"c"})),
 opens:[],areas:[],dims:[],chains:[],anno:[],cols:[],fixt:[],
 stairs:[],
 meta:{name:"T",scale:100},
 ref:{name:"r.dxf",tr:{k:1,rot:0,dx:0,dy:0},src:{},off:{},
  ents:Array.from({length:nRef},(_,i)=>({t:"l",
   a:[i,0],b:[i,1000],sl:"0"}))}});
const size=(w,r)=>JSON.stringify(doc(w,r)).length;
/* الطابع يُقسَر: الاختبار لا يعتمد على مللي ثانيةٍ بين نداءَين */
const bump=ms=>{
 const o=JSON.parse(localStorage.getItem(ST.LSK));
 o.__t=(+o.__t||0)+ms;
 localStorage.setItem(ST.LSK,JSON.stringify(o));
 return o;
};
group("الكتابة الأخيرة",()=>{
 Q.map.clear(); Q.setCap(1e9);
 const r=ST.flushSync(doc(3,0));
 ok(r.ok,"تُكتَب متزامناً");
 eq(r.lite,undefined,"وكاملةً حين تتّسع");
 const back=JSON.parse(localStorage.getItem(ST.LSK));
 eq(back.walls.length,3,"والمحتوى صحيح");
 ok(+back.__t>0,"وعليها طابع");
 ok(!back.__lite,"ولا تُعلَّم ناقصةً");
});
group("النسخة المنقوصة",()=>{
 Q.map.clear();
 /* سعةٌ تكفي الرسم ولا تكفي المرجع */
 const full=size(3,4000), lite=size(3,0);
 ok(full>lite*3,"المرجع يضاعف الحجم");
 Q.setCap(Math.round((full+lite)/2));
 const r=ST.flushSync(doc(3,4000));
 ok(r.ok,"تُكتَب على أي حال");
 eq(r.lite,1,"منقوصةً");
 eq(r.refs,4000,"ويُذكَر ما استُثني");
 const back=JSON.parse(localStorage.getItem(ST.LSK));
 eq(back.__lite,1,"وتُعلَّم في المحتوى نفسه");
 eq(back.ref.ents.length,0,"بلا كيانات المرجع");
 eq(back.walls.length,3,"ورسمك كامل");
});
await groupAsync("الترميم",async()=>{
 /* كاملةٌ أقدم في IndexedDB (٣ جدران · ٤٠٠٠ كيان مرجعي)،
    ومنقوصةٌ أحدث في localStorage (٥ جدران · بلا مرجع).
    فالمُعاد يجب أن يحمل الخمسة والأربعة آلاف معاً. */
 Q.map.clear(); IDB.clear(); Q.setCap(1e9);
 const s=await ST.save(doc(3,4000));
 ok(s.ok,"الكاملة تُكتَب في IndexedDB");
 eq(s.via,"idb","بمعاملةٍ غير متزامنة");
 Q.setCap(Math.round((size(5,4000)+size(5,0))/2));
 const f=ST.flushSync(doc(5,4000));
 eq(f.lite,1,"والإغلاق لا يتّسع للمرجع");
 bump(1000);
 Q.setCap(1e9);
 const l=await ST.load();
 eq(l.via,"healed","فتُرمَّم عند الفتح");
 eq(l.refs,4000,"ويُذكَر عددُ ما رُمِّم");
 eq(l.data.walls.length,5,"رسمك من الأحدث");
 eq(l.data.ref.ents.length,4000,"والمرجع من الأقدم");
 ok(!l.data.__lite,"ولا تبقى معلَّمةً ناقصة");
 /* والحالة المقابلة: idb ناقصة وls كاملة */
 Q.map.clear(); IDB.clear(); Q.setCap(1e9);
 ST.flushSync(doc(2,4000));
 IDB.set("doc",Object.assign({},doc(7,0),
  {__t:Date.now()+9000,__lite:1}));
 const l2=await ST.load();
 eq(l2.via,"healed","تُرمَّم في الاتجاه الآخر أيضاً");
 eq(l2.data.walls.length,7,"الرسم من الناقصة الأحدث");
 eq(l2.data.ref.ents.length,4000,"والمرجع من الكاملة");
});
await groupAsync("الطابع يحكم",async()=>{
 /* الترميم لا يتكرّر: بعده يُثبَّت الكامل في IndexedDB فيصير
    أحدث، فلو رُمِّم بلا شرطٍ زمنيّ لظهر التنبيه كل إقلاع. */
 Q.map.clear(); IDB.clear(); Q.setCap(1e9);
 ST.flushSync(doc(5,0));
 bump(-9000);                   /* المنقوصة أقدم */
 const o=JSON.parse(localStorage.getItem(ST.LSK));
 o.__lite=1;
 localStorage.setItem(ST.LSK,JSON.stringify(o));
 await ST.save(doc(5,4000));    /* الكاملة أحدث */
 const l=await ST.load();
 eq(l.via,"idb","الكاملة الأحدث تُقرأ بلا ترميم");
 eq(l.data.ref.ents.length,4000,"وفيها المرجع");
 /* وmigrate تُقال حين تصدق وحدها */
 Q.map.clear(); IDB.clear();
 ST.flushSync(doc(4,0));
 const m=await ST.load();
 eq(m.via,"migrate","IndexedDB متاحٌ وفارغ ⇒ هجرة");
 await ST.save(doc(4,0));
 ST.flushSync(doc(6,0));        /* ls أحدث وكاملة */
 const m2=await ST.load();
 eq(m2.via,"ls","وبعد الهجرة تُقال «ls» لا «migrate»");
 eq(m2.data.walls.length,6,"والأحدث يفوز");
});
group("الفشل يُقال",()=>{
 Q.map.clear();
 Q.setCap(10);                        /* لا يتّسع لشيء */
 const r=ST.flushSync(doc(3,4000));
 ok(!r.ok,"الفشل يُعاد صريحاً");
 ok(r.err,"وباسم العلّة");
 ok(ST.failed()>0,"ويُعَدّ");
});
await groupAsync("المسح",async()=>{
 Q.map.clear(); IDB.clear(); Q.setCap(1e9);
 localStorage.setItem("mistar.ai",'{"key":"سرّ"}');
 localStorage.setItem("mistar.ui",'{"theme":"dark"}');
 localStorage.setItem("mistar.opts",'{"wall":{"t":"0.2"}}');
 ST.flushSync(doc(1,0));
 await ST.save(doc(1,0));
 const r=await ST.purge();
 ok(r.keys.includes("mistar.ai"),"مفتاح المزوّد يُمسَح");
 ok(r.keys.includes("mistar.opts"),"وخيارات الأدوات");
 ok(r.keys.includes(ST.LSK),"والجلسة");
 eq(localStorage.getItem("mistar.ai"),null,"ولا يبقى شيء");
 eq(localStorage.getItem(ST.LSK),null,"ولا الجلسة");
 eq(IDB.size,0,"وقاعدة البيانات فارغة");
 ok(r.idb===1,"ويُذكَر حذفها");
});
process.exit(summary()?1:0);
