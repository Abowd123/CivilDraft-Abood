/* ═══ حراسة التزامن بين التبويبات ═══ P4-009
   كانت الكتابة غير مشروطة: تبويبان يفتحان V0، فيحفظ B الـV1، ثم
   يحفظ A ما عنده — فيُمحى تعديل B بلا كلمة. الاختبار يُحاكي
   التبويبين بنسختين مستقلّتين من الوحدة (localStorage مشترك بينهما
   كما يشترك التبويبان في أصلٍ واحد)، فيفشل قبل الإصلاح وينجح بعده.
   التشغيل:  node js/tests/store-rev.test.js                      */
import {shim,groupAsync,ok,eq,summary} from "./harness.js";
shim();

/* localStorage مشترك — هو المخزن الذي يراه التبويبان */
const M=new Map();
globalThis.localStorage={
 getItem:k=>(M.has(k)?M.get(k):null),
 setItem:(k,v)=>{M.set(k,String(v))},
 removeItem:k=>{M.delete(k)},
 clear:()=>M.clear(),
 get length(){return M.size},
 key:i=>[...M.keys()][i]||null};
/* لا IndexedDB: المسار الاحتياطي وحده — يكفي لإثبات العقد */
delete globalThis.indexedDB;

const doc=(n,mark)=>({walls:[{id:"W"+n,a:[0,0],b:[n*1000,0],t:200}],
 opens:[],lay:{},__by:mark});
/* نسختان مستقلّتان = تبويبان: الوحدة تحفظ REV في مجالها */
const A=await import("../io/store.js?tab=A");
const B=await import("../io/store.js?tab=B");

await groupAsync("لقطةُ الانطلاق V0 مشتركة",async()=>{
 const r=await A.save(doc(0,"V0"));
 ok(r.ok,"A كتب V0");
 eq(r.rev,1,"المراجعة ١");
 const l=await B.load();
 ok(!!l&&l.data.__by==="V0","B قرأ V0 نفسها");
 eq(B.revision(),1,"وتبنّى مراجعتها");
});

await groupAsync("B يحفظ V1 ثم A يحاول الحفظ",async()=>{
 const rb=await B.save(doc(1,"V1"));
 ok(rb.ok,"B كتب V1");
 eq(rb.rev,2,"المراجعة ٢");
 /* A ما زال على مراجعة ١: الكتابة يجب أن تُرفَض لا أن تمحو V1 */
 let seen=null;
 A.onConflict(c=>{seen=c});
 const ra=await A.save(doc(9,"V0+A"));
 ok(!ra.ok&&ra.conflict,"حفظُ A يُرفَض تعارضاً");
 eq(ra.theirs,2,"يعرف أن المخزَّن مراجعة ٢");
 eq(ra.ours,1,"وأنه هو على ١");
 ok(!!seen&&seen.conflict,"والتعارض يُبلَّغ بالخطّاف");
 /* الشرط الجوهري: تعديل B لم يضع */
 const cur=JSON.parse(localStorage.getItem(A.LSK));
 eq(cur.__by,"V1","تعديل B باقٍ — لم يُمحَ بصمت");
 eq(cur.__rev,2,"والمراجعة لم ترتدّ");
 /* ونسخةُ A محفوظةٌ جانباً فلا تضيع هي أيضاً */
 ok(ra.kept,"نسخةُ A احتُفظ بها");
 const k=A.conflictGet();
 ok(!!k&&k.__by==="V0+A","والنسخة الجانبية هي نسخة A");
});

await groupAsync("المسارانِ بعد التعارض",async()=>{
 /* «حمّل الأحدث» */
 const l=await A.load();
 eq(l.data.__by,"V1","A يقرأ الأحدث");
 eq(A.revision(),2,"فتتساوى مراجعته");
 const ra=await A.save(doc(3,"V2"));
 ok(ra.ok,"ثم يكتب بلا تعارض");
 eq(ra.rev,3,"المراجعة ٣");
 /* «احتفظ بنسختي»: كتابةٌ صريحة فوق الأحدث بموافقةٍ */
 const rb=await B.save(doc(4,"B-force"),{force:1});
 ok(rb.ok,"force يكتب فوق الأحدث");
 eq(JSON.parse(localStorage.getItem(A.LSK)).__by,"B-force",
  "والمخزَّن صار نسخة B");
});

await groupAsync("flushSync عند الإغلاق يحترم الأحدث",async()=>{
 await A.load();                       /* A يتبنّى الحالي */
 const rb=await B.save(doc(7,"newer"));
 ok(rb.ok,"B كتب أحدث أثناء ذلك");
 const r=A.flushSync(doc(8,"A-close"));
 ok(!r.ok&&r.conflict,"الكتابةُ الأخيرة تُرفَض تعارضاً");
 eq(JSON.parse(localStorage.getItem(A.LSK)).__by,"newer",
  "ولا تمحو الأحدث عند الإغلاق");
 ok(A.conflictGet().__by==="A-close","ونسخةُ الإغلاق محفوظةٌ جانباً");
 const r2=A.flushSync(doc(8,"A-close"),{force:1});
 ok(r2.ok,"وforce يكتبها عند الطلب الصريح");
});

await groupAsync("المنارةُ والبثّ",async()=>{
 ok(typeof A.watchDoc==="function","watchDoc مُصدَّرة");
 ok(typeof A.watchDoc(()=>{})==="function","وتعيد دالّة فكّ ارتباط");
 const r0=A.revision();
 eq(A.setRevision(0),0,"setRevision تُثبّت ما يعرفه التبويب");
 A.setRevision(r0);
 eq(A.revision(),r0,"وتُعاد كما كانت");
 ok(typeof localStorage.getItem(A.REVK)==="string",
  "منارةُ المراجعة مكتوبة — حدث storage يصل للتبويب بلا قناة");
 eq(+localStorage.getItem(A.REVK),A.revision(),"وقيمتُها المراجعة");
 A.conflictClear();
 eq(A.conflictGet(),null,"ومسحُ النسخة الجانبية يعمل");
});

process.exit(summary()?1:0);
