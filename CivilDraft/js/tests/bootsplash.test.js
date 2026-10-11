/* ═══ ٤٫٤ — شاشة الإقلاع عند الفشل ═══
   المؤقّتُ ووحدةُ DOM مُزيَّفان: الاختبار لا ينتظر عشر ثوانٍ ولا يحتاج
   متصفّحاً. ما يُحرَس:
     ١ · bootok قبل المهلة ⇒ يُخفى الشعار (المسار السعيد لم يتغيّر).
     ٢ · المهلة بلا bootok ⇒ لا يُخفى الشعار، بل يصير «تعذّر الإقلاع».
     ٣ · وينزل الشعار تحت #bootErr (٩٠٠٠ < ٩٩٩٩) فلا يحجب رسالة السبب.
     ٤ · وbootok المتأخّر بعد الفشل يُخفي الشعار كالمعتاد.

   التشغيل:  node js/tests/bootsplash.test.js                        */
import {groupAsync,ok,eq,summary} from "./harness.js";

/* عنصرٌ مزيَّف بما تستعمله boot-splash.js فقط */
const node=()=>({
 style:{}, attrs:{}, text:"", cls:new Set(), kids:{}, removed:false,
 classList:{add(){}},
 setAttribute(k,v){this.attrs[k]=v},
 addEventListener(){},
 querySelector(sel){return this.kids[sel]||null},
 remove(){this.removed=true},
 get textContent(){return this.text},
 set textContent(v){this.text=v}
});
function rig(){
 const el=node();
 el.cls=new Set();
 el.classList={add:c=>el.cls.add(c)};
 el.kids[".splash-tag"]=node();
 el.kids[".splash-bar"]=node();
 el.kids[".splash-mark"]=node();
 const timers=[], handlers={};
 globalThis.document={getElementById:id=>id==="splash"?el:null};
 globalThis.addEventListener=(t,f)=>{handlers[t]=f};
 globalThis.setTimeout=(f,ms)=>{timers.push({f,ms}); return timers.length};
 return {el,timers,handlers,
  fire:t=>handlers[t]&&handlers[t](),
  /* المهلةُ الطويلة وحدها (المؤقّت القصير ٤٥٠ للحذف بعد الإخفاء) */
  safety:()=>timers.filter(t=>t.ms>=5000)};
}
let n=0;
const load=()=>import(`../boot-splash.js?case=${++n}`);

await groupAsync("المسار السعيد: bootok يُخفي الشعار",async()=>{
 const R=rig();
 await load();
 eq(R.safety().length,1,"مهلةُ أمانٍ واحدة بعشر ثوان");
 R.fire("civildraft:bootok");
 ok(R.el.cls.has("splash-hide"),"bootok أخفى الشعار");
 eq(R.el.attrs["aria-hidden"],"true","وأُخفي عن قارئ الشاشة");
 /* والمهلة بعده لا تفعل شيئاً */
 R.safety()[0].f();
 eq(R.el.kids[".splash-tag"].text,"","والمهلةُ بعد النجاح لا تكتب رسالة فشل");
 eq(R.el.style.zIndex,undefined,"ولا تُنزِل الشعار");
});

await groupAsync("المهلة بلا bootok: الفشل ظاهرٌ لا صامت",async()=>{
 const R=rig();
 await load();
 R.safety()[0].f();
 ok(!R.el.cls.has("splash-hide"),"الشعار لم يُخفَ (الإخفاءُ هو الشاشة البيضاء)");
 ok(R.el.attrs["aria-hidden"]===undefined,"ولم يُخفَ عن قارئ الشاشة");
 ok(/تعذّر الإقلاع/.test(R.el.kids[".splash-tag"].text),
  "سطر التحميل صار «تعذّر الإقلاع»");
 /* لا شريط أحمر لمهلة البطء الآن (وحدة التحكّم فقط): يُحيل إلى الشريط إن وُجد،
    وإلا يوجّه لإعادة التحميل — لا إحالةً إلى رسالةٍ غير موجودة */
 ok(/أعلى الشاشة|أعِد تحميل/.test(R.el.kids[".splash-tag"].text),
  "ويُرشد المستخدم (شريط السبب إن وُجد وإلا إعادة التحميل)");
 eq(R.el.kids[".splash-bar"].style.display,"none","والشريط المتحرّك توقّف");
 eq(R.el.kids[".splash-mark"].style.animation,"none","والشعار توقّف عن النبض");
 ok(/الإقلاع/.test(R.el.attrs["aria-label"]||""),
  "ووصفُه لقارئ الشاشة تغيّر إلى الفشل");
 ok(+R.el.style.zIndex<9999,
  "ونزل تحت #bootErr (٩٩٩٩) فلا يحجب الرسالة التي يُحيل إليها");

 /* bootok متأخّراً — جهازٌ بطيء لا إقلاعٌ فاشل */
 R.fire("civildraft:bootok");
 ok(R.el.cls.has("splash-hide"),"وإن وصل bootok متأخّراً أُخفي الشعار");
});

await groupAsync("عنصرٌ غائب لا يكسر المهلة",async()=>{
 const R=rig();
 await load();
 globalThis.document={getElementById:()=>null};
 let threw=false;
 try{R.safety()[0].f()}catch(e){threw=true}
 ok(!threw,"غيابُ #splash لا يُسقِط المؤقّت");
});

process.exit(summary()?1:0);
