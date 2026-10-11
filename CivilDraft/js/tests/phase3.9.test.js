/* ═══ دفعة 3.9 — توحيد مفاتيح التخزين تحت «civildraft» ═══
   node js/tests/phase3.9.test.js

   جرد الهجرة (migrate.test.js) غطّى ai/net.js وui/store.js
   وtools/registry.js وcore/pricing.js وcore/code.js والقاعدةَ
   الرئيسة في IndexedDB (io/store.js: mistar ⇒ civildraft) — لكن
   ثلاثةَ مفاتيحَ نشطة بقيت بلا هجرة:

     • io/snaps.js  — فهرس اللقطات: mistar.snaps ⇒ civildraft.snaps
     • ui/tour.js   — علامة رؤية الجولة: mistar.tour ⇒ civildraft.tour
     • io/store.js  — المستند الاحتياطي في localStorage
       (LSK): mistar.v1 ⇒ civildraft.v1

   وكلّ سيناريو يأخذ نسخةً جديدةً من الوحدة (?t) — فذاكرتها الداخلية
   (علم الهجرة MIGD) لا تتسرّب بين السيناريوهات.
   التشغيل:  node js/tests/phase3.9.test.js                        */
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {shim,group,groupAsync,ok,eq,summary} from "./harness.js";
shim();
const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const rd=p=>readFileSync(join(ROOT,p),"utf8");
const reset=()=>{localStorage.clear()};
let N=0;
const fresh=f=>import(f+"?t3_9_"+(++N));

group("io/store.js: LSK صار civildraft.v1",()=>{
 const src=rd("js/io/store.js");
 ok(/export const LSK\s*=\s*"civildraft\.v1"/.test(src),
  "LSK = civildraft.v1");
 ok(/const OLD_LSK\s*=\s*"mistar\.v1"/.test(src),
  "OLD_LSK = mistar.v1 (نسخةٌ احتياطية)");
 ok(/function migrateLSKey/.test(src),"migrateLSKey مُعرَّفة");
 ok(/localStorage\.setItem\(OLD_LSK/.test(src)===false,
  "لا كتابةَ في OLD_LSK أبداً");
});

await groupAsync("io/store.js: mistar.v1 ⇒ civildraft.v1 (سلوكياً)",async()=>{
 reset();
 const raw=JSON.stringify({walls:[{id:"W1"}],opens:[],areas:[],
  meta:{name:"قديم"},__t:1000});
 localStorage.setItem("mistar.v1",raw);
 const ST=await fresh("../io/store.js");
 eq(ST.LSK,"civildraft.v1","الثابت المُصدَّر");
 const r=await ST.load();
 ok(!!r,"يُحمَّل شيءٌ");
 eq(r.data.meta.name,"قديم","بمحتوى القديم");
 eq(localStorage.getItem("civildraft.v1"),raw,"نُسخ نصّاً كما هو");
 eq(localStorage.getItem("mistar.v1"),raw,"والقديم باقٍ بلا مساس");

 /* الكتابة اللاحقة (المتزامنة) تقع في الجديد فقط */
 ST.flushSync({walls:[{id:"W2"}],opens:[],areas:[],meta:{name:"جديد"}});
 ok(JSON.parse(localStorage.getItem("civildraft.v1")).meta.name==="جديد",
  "flushSync يكتب في الجديد");
 eq(localStorage.getItem("mistar.v1"),raw,"ولا يمسّ القديم إطلاقاً");
});

await groupAsync("io/store.js: الجديد الموجود لا يُكتَب فوقه بالهجرة",
 async()=>{
 reset();
 localStorage.setItem("mistar.v1",JSON.stringify(
  {walls:[],opens:[],areas:[],meta:{name:"قديم"},__t:1}));
 localStorage.setItem("civildraft.v1",JSON.stringify(
  {walls:[],opens:[],areas:[],meta:{name:"جديد بالفعل"},__t:2}));
 const ST=await fresh("../io/store.js");
 const r=await ST.load();
 eq(r.data.meta.name,"جديد بالفعل","الجديد الموجود يفوز");
});

await groupAsync("io/snaps.js: mistar.snaps ⇒ civildraft.snaps",async()=>{
 reset();
 const raw=JSON.stringify([{id:"s1",t:1,why:"يدوية",w:2,o:1,a:0}]);
 localStorage.setItem("mistar.snaps",raw);
 const SN=await fresh("../io/snaps.js");
 const list=SN.snapsLoad();
 eq(list.length,1,"الفهرس القديم يُحمَّل");
 eq(list[0].id,"s1","بمحتواه");
 eq(localStorage.getItem("civildraft.snaps"),raw,"ويُنسَخ إلى الجديد");
 eq(localStorage.getItem("mistar.snaps"),raw,"والقديم باقٍ");

 reset();
 localStorage.setItem("mistar.snaps",'[{"id":"old"}]');
 localStorage.setItem("civildraft.snaps",'[{"id":"new"}]');
 const SN2=await fresh("../io/snaps.js");
 eq(SN2.snapsLoad()[0].id,"new","الجديد الموجود يفوز ولا يُستبدَل");

 reset();
 const SN3=await fresh("../io/snaps.js");
 eq(SN3.snapsLoad().length,0,"بلا قديمٍ ولا جديد: فهرسٌ فارغ");
 eq(localStorage.getItem("civildraft.snaps"),null,
  "ولا يُخلَق مفتاحٌ جديدٌ فارغ من فراغ");
});

/* ui/tour.js يستورد سلسلةً تصل إلى ui/canvas.js التي تطلب عنصر
   القماش وسياقه عند الاستيراد (document.getElementById("cv")
   .getContext) — فالاستيراد الديناميكي هنا يحتاج شِبهَ DOM وقماشٍ
   كاملَين لا يضيفان شيئاً لفحص الهجرة نفسها. فحصٌ ساكنٌ كأمثاله في
   canvas-drag-guard.test.js يكفي: يتأكّد من المسار الثلاثي
   (K الجديد · OLD_K القديم · migrateKey داخل seen()) دون استيراد
   الوحدة فعلياً. الفحص السلوكي الكامل (بالاستيراد) يقع على
   io/store.js وio/snaps.js أعلاه، حيث لا تبعيةَ قماشٍ تعترض. */
group("ui/tour.js: مسار الهجرة موجودٌ بنيوياً (فحصٌ ساكن)",()=>{
 const src=rd("js/ui/tour.js");
 ok(/const K\s*=\s*"civildraft\.tour"/.test(src),"K = civildraft.tour");
 ok(/const OLD_K\s*=\s*"mistar\.tour"/.test(src),
  "OLD_K = mistar.tour (نسخةٌ احتياطية)");
 ok(/function migrateKey/.test(src),"migrateKey مُعرَّفة");
 ok(/const seen=\(\)=>\{migrateKey\(\)/.test(src),
  "seen() تستدعي migrateKey() قبل القراءة");
 ok(!/localStorage\.setItem\(OLD_K/.test(src),"لا كتابةَ في OLD_K");
 ok(/localStorage\.getItem\(K\)===\"1\"/.test(src),
  "seen() تقرأ من المفتاح الجديد K");
 ok(/localStorage\.setItem\(K,\"1\"\)/.test(src),
  "mark() تكتب في المفتاح الجديد K");
});

group("لا وحدةٌ نشطة تكتب في مفتاح mistar.* بعد اليوم",()=>{
 const files=["js/io/snaps.js","js/ui/tour.js","js/io/store.js"];
 files.forEach(f=>{
  const src=rd(f);
  /* أيّ setItem بمفتاح OLD_* هو خطأ — النسخ يقع في اتجاهٍ واحد */
  ok(!/localStorage\.setItem\(OLD_K/.test(src),
   `${f}: لا setItem(OLD_K`);
  ok(!/localStorage\.setItem\(OLD_LSK/.test(src),
   `${f}: لا setItem(OLD_LSK`);
 });
});

group("io/store.js: LSKEYS مُحدَّثةٌ بالأسماء الجديدة",()=>{
 const src=rd("js/io/store.js");
 ok(/LSKEYS\s*=\s*\[LSK,"civildraft\.ui","civildraft\.opts",/.test(src),
  "LSKEYS تبدأ بالمفاتيح الجديدة");
 ok(/"civildraft\.snaps"/.test(src),"LSKEYS تذكر civildraft.snaps");
 ok(!/LSKEYS\s*=\s*\[[^\]]*"mistar\.snaps"/.test(src),
  "LSKEYS لا تذكر mistar.snaps كمفتاحٍ حيّ");
});

process.exit(summary());
