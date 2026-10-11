/* ═══ دفعة 7.1 — purge المنتظِر + فهرس اللقطات + حراس المؤقت ═══
   node js/tests/phase7-1.test.js */
import {shim,group,groupAsync,ok,eq,summary} from "./harness.js";
shim();
const DEL_MS=120;
/* IndexedDB في الذاكرة: deleteDatabase تُنهي بعد DEL_MS فعلاً (لا فوراً) */
const dbs=new Set(); const snaps=new Map(); let dels=[];
const later=(fn,ms=0)=>setTimeout(fn,ms);
const store=m=>({put:(v,k)=>{m.set(k,v)},delete:k=>{m.delete(k)},
 get:k=>{const rq={};later(()=>{rq.result=m.get(k);rq.onsuccess&&rq.onsuccess()});return rq}});
const docM=new Map();
const db={objectStoreNames:{contains:()=>true},createObjectStore:()=>{},close:()=>{},
 transaction:(n)=>{const tx={objectStore:()=>store(n==="snaps"?snaps:docM)};
  later(()=>tx.oncomplete&&tx.oncomplete());return tx}};
globalThis.indexedDB={
 open:()=>{const rq={result:db};later(()=>rq.onsuccess&&rq.onsuccess());return rq},
 deleteDatabase:n=>{const rq={};dels.push(n);
  later(()=>{docM.clear();snaps.clear();dbs.add(n);rq.onsuccess&&rq.onsuccess()},DEL_MS);return rq}};
let N=0; const fresh=f=>import(f+"?t7_1_"+(++N));

await groupAsync("بند 61: purge لا يعود قبل اكتمال deleteDatabase",async()=>{
 localStorage.clear();
 const ST=await fresh("../io/store.js");
 await ST.save({walls:[{id:"W1"}],opens:[],areas:[]});
 await ST.snapPut("s1",{walls:[]});
 dels=[]; dbs.clear();
 const t0=Date.now();
 const r=await ST.purge();
 const dt=Date.now()-t0;
 ok(dt>=DEL_MS-25,`انتظر الحذف الفعلي (${dt}ms)`);
 eq(dbs.size,dels.length,"كل قاعدةٍ طُلب حذفها اكتمل حذفها قبل العودة");
 eq(r.idb,1,"ويُعلَن الحذف");
 eq(await ST.snapGet("s1"),null,"وبعد purge لا لقطة قديمة تظهر");
 eq(await ST.load(),null,"ولا مستند");
});

await groupAsync("بند 45-46: snapsClean تُسقط الفهرس الميت وتُبقي الحيّ",async()=>{
 localStorage.clear(); snaps.clear();
 const ST=await fresh("../io/store.js");
 await ST.snapPut("live",{walls:[]});
 localStorage.setItem("civildraft.snaps",JSON.stringify(
  [{id:"live",t:1},{id:"dead",t:2},{t:3}]));
 const SN=await fresh("../io/snaps.js");
 const first=SN.snapsLoad();
 eq(first.length,3,"snapsLoad متزامنة كما كانت وتعيد القائمة فوراً");
 const r=await SN.snapsClean();
 eq(r.ok,1,"التنظيف نجح");
 eq(SN.snapList().map(x=>x.id).join(),"live","الميت والسجل بلا معرّف سقطا");
 eq(JSON.parse(localStorage.getItem("civildraft.snaps")).length,1,
  "والفهرس المخزَّن نُظِّف");
});

await groupAsync("لا يُمحى الفهرس حين IndexedDB غير متاح",async()=>{
 localStorage.clear(); snaps.clear();
 /* store.js المشترك مع snaps.js يحفظ اتصاله: نُصفّره بـpurge ثم نُغيّب IndexedDB */
 await (await import("../io/store.js")).purge();
 const keep=globalThis.indexedDB; delete globalThis.indexedDB;
 const raw=JSON.stringify([{id:"a",t:1},{id:"b",t:2}]);
 localStorage.setItem("civildraft.snaps",raw);
 const SN=await fresh("../io/snaps.js");
 SN.snapsLoad();
 const r=await SN.snapsClean();
 eq(r.ok,0,"لا تنظيف");
 eq(SN.snapList().length,2,"والقائمة كاملة");
 eq(localStorage.getItem("civildraft.snaps"),raw,"والفهرس المخزَّن سليم");
 globalThis.indexedDB=keep;
});

await groupAsync("بند 47-48: مؤقتُ اللقطات لا يُطلِق رفضاً غير معالَج",async()=>{
 const SN=await fresh("../io/snaps.js");
 let unhandled=0; const h=()=>{unhandled++};
 process.on("unhandledRejection",h);
 const realSet=globalThis.setInterval; let tick=null;
 globalThis.setInterval=fn=>{tick=fn;return 1};
 const ST=await import("../core/state.js");
 SN.snapAutoStart(2);
 ST.S.__ver=(ST.S.__ver||0)+1;      /* تغيّر المستند ⇒ تلتقط */
 globalThis.setInterval=realSet;
 ok(typeof tick==="function","المؤقت سُجِّل");
 tick(); await new Promise(r=>later(r,50));
 process.off("unhandledRejection",h);
 eq(unhandled,0,"لا unhandledRejection");
 SN.snapAutoStop();
});
process.exit(summary());
