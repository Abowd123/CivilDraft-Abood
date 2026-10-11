/* ═══ الوعدُ المحمي وبنيةُ التفضيلات ═══
   P2-007 لا سلسلةَ وعدٍ تسقط صامتةً · P2-009 منارةُ بنيةِ التفضيلات
   تمنع بناءً أقدمَ من محو بنيةٍ أحدث، والتعدادُ المُعلَن كاملٌ.
   التشغيل:  node js/tests/promise-prefs.test.js                   */
import {shim,group,groupAsync,ok,eq,summary} from "./harness.js";
shim();

/* ═══ P2-007 ═══ bus.js لا يحتاج DOM: HOOK.report خطّافٌ نُلبسه */
const B=await import("../ui/bus.js");
const said=[];
B.HOOK.report=(c,m)=>{said.push([c,m])};

await groupAsync("P2-007 · safe تمسك الرفضَ وتُبلِّغ",async()=>{
 said.length=0;
 const v=await B.safe(Promise.resolve(7),"نجاح");
 eq(v,7,"النجاحُ يمرّ كما هو");
 eq(said.length,0,"ولا رسالةَ بلا سبب");
 const n=await B.safe(Promise.reject(new Error("تعذّر التحميل")),"بوابة التسليم");
 eq(n,null,"والرفضُ يعيد null فيُفحَص");
 eq(said.length,1,"ورسالةٌ واحدةٌ لا صمت");
 eq(said[0][0],"er","بدرجةِ خطأ");
 ok(/بوابة التسليم/.test(said[0][1]),"والرسالةُ تذكر ما كان يُفعَل");
 ok(/تعذّر التحميل/.test(said[0][1]),"وسببَ العطب");
 /* الرسالةُ الطويلةُ تُقلَّم فلا تُغرِق الترويسة */
 said.length=0;
 await B.safe(Promise.reject(new Error("ط".repeat(500))),"طويل");
 ok(said[0][1].length<200,"والطويلةُ مقلَّمة");
 ok(/…$/.test(said[0][1]),"بعلامةِ قطع");
});

await groupAsync("P2-007 · lazy لا تُرجِع وعداً ولا ترمي من مسارٍ متزامن",()=>{
 said.length=0;
 /* استيرادٌ يرمي فوراً (لا وعدٌ مرفوضٌ فقط) */
 eq(B.lazy(()=>{throw new Error("وحدةٌ مفقودة")},"نافذة"),undefined,
  "lazy لا تُعيد شيئاً — فلا ينتظرها أحد");
 return new Promise(res=>setTimeout(()=>{
  eq(said.length,1,"والرميُ المتزامنُ أُبلِغ عنه");
  ok(/نافذة/.test(said[0][1]),"باسم النافذة");
  said.length=0;
  B.lazy(()=>Promise.reject(new Error("شبكة")),"لوح");
  setTimeout(()=>{
   eq(said.length,1,"والوعدُ المرفوضُ كذلك");
   ok(/لوح/.test(said[0][1]),"باسم اللوح");
   res();
  },0);
 },0));
});

/* ═══ P2-009 ═══ */
const M=new Map();
globalThis.localStorage={
 getItem:k=>(M.has(k)?M.get(k):null),
 setItem:(k,v)=>{M.set(k,String(v))},
 removeItem:k=>{M.delete(k)}, clear:()=>M.clear(),
 get length(){return M.size}, key:i=>[...M.keys()][i]||null};
const S=await import("../io/store.js?prefs");

group("P2-009 · منارةُ بنيةِ التفضيلات",()=>{
 ok(S.PREFV>=1,"رقمُ البنية معلَنٌ ومصدَّر");
 /* أوّلُ إقلاعٍ: لا منارة ⇒ نُفترض بنيتَنا ونرفعها */
 let r=S.stampPrefSchema();
 eq(r.newer,0,"لا بناءَ أحدث في أوّل إقلاع");
 eq(+localStorage.getItem(S.PREFVK),S.PREFV,"والمنارةُ مرفوعة");
 /* بناءٌ أحدثُ كتب رقماً أعلى: نعلم ولا نُنزِله */
 localStorage.setItem(S.PREFVK,String(S.PREFV+3));
 r=S.stampPrefSchema();
 eq(r.newer,1,"البناءُ الأحدثُ يُكتشَف");
 eq(r.v,S.PREFV+3,"برقمه");
 eq(+localStorage.getItem(S.PREFVK),S.PREFV+3,
  "ولا يُنزَل الرقمُ — فلا يُخدَع البناءُ الأحدثُ بعدنا");
 /* ورقمٌ أقدمُ يُرفَع إلى رقمنا */
 localStorage.setItem(S.PREFVK,"0");
 r=S.stampPrefSchema();
 eq(r.newer,0,"الأقدمُ ليس أحدث");
 eq(+localStorage.getItem(S.PREFVK),S.PREFV,"ويُرفَع إلى رقمنا");
 /* وقيمةٌ فاسدةٌ لا تُعطِب القراءة */
 localStorage.setItem(S.PREFVK,"ليس رقماً");
 eq(S.prefSchema().v,S.PREFV,"والقيمةُ الفاسدةُ تُقرأ رقمَنا");
});

group("P2-009 · التعدادُ المُعلَن كاملٌ",()=>{
 const K=S.LSKEYS;
 ["civildraft:pricing-cfg","civildraft:pricing","civildraft.ribbon",
  "civildraft.guide.usage","civildraft.ui","civildraft.opts",
  "civildraft.ai","civildraft.snaps","civildraft.code","civildraft.macros",
  "civildraft.tour"].forEach(k=>
   ok(K.indexOf(k)>=0,`«${k}» في التعداد`));
 ok(K.indexOf(S.REVK)>=0,"ومفتاحُ المراجعة");
 ok(K.indexOf(S.CONFK)>=0,"ومفتاحُ النسخة الجانبية");
 /* وكلُّهم يحملون بادئةَ المشروع — وهي ما يعتمده المسحُ الفعليّ */
 ok(K.every(k=>/^(civildraft|mistar)[.:]/.test(k)),
  "وكلُّهم ببادئة المشروع فيشملهم المسحُ الشامل");
});

process.exit(summary()?1:0);
