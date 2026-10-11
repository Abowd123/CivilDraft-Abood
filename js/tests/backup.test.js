/* ═══ النسخةُ الاحتياطيةُ الخارجية ═══ P-تحسين
   التخزينُ كلُّه محلّيٌّ، فمتصفّحٌ يُمسَح = مشروعٌ يضيع. والحلُّ بلا
   خادم: ملفٌّ يختاره المستخدمُ مرّةً ونكتب فيه بمهلة. وهذا الاختبارُ
   يركّب مقبضاً مزيَّفاً (_setHandle) فيقيس العقدَ كلَّه في Node بلا
   متصفّح: المهلةُ تجمع، آخرُ نصٍّ يفوز، الإذنُ المسحوبُ يُقال مرّةً،
   الكتابةُ الفاشلةُ لا تُبلَع، والإطفاءُ يُلغي ما لم يُكتَب.
   التشغيل:  node js/tests/backup.test.js                          */
import {shim,group,groupAsync,ok,eq,summary} from "./harness.js";
shim();
const B=await import("../io/backup.js");

/* مقبضٌ مزيَّف: يسجّل ما كُتِب، ويملك إذناً قابلاً للسحب */
function fake(opt){
 const o=opt||{};
 const h={name:o.name||"bk.json", writes:[], perm:o.perm||"granted",
  asked:0, fail:o.fail||0};
 h.queryPermission=async()=>h.perm;
 h.requestPermission=async()=>{h.asked++; return h.perm};
 h.createWritable=async()=>{
  if(h.fail)throw new Error("القرصُ ممتلئ");
  let buf="";
  return {write:async t=>{buf+=t}, close:async()=>{h.writes.push(buf)}};
 };
 return h;
}
const said=[];
B.onBackupSay((lv,m)=>said.push([lv,m]));
const clr=()=>{said.length=0};

group("الحالةُ تُقرأ ولا تُخمَّن",()=>{
 B._setHandle(null);
 eq(B.BK.on,0,"بلا مقبضٍ ⇒ مُطفأة");
 const st=B.backupState();
 ok("supported" in st,"والحالةُ تعلن الدعمَ صراحةً");
 eq(st.supported,false,"وNode ليس متصفّحاً داعماً");
 ok(B.supported()===false,"supported() لا ترمي بلا window");
 ok(B.BK_DELAY>=1000,"والمهلةُ معلَنةٌ ومصدَّرة");
});

await groupAsync("المتصفّحُ غيرُ الدّاعم يُعلَن لا يَصمت",async()=>{
 clr();
 const r=await B.enable("مشروع");
 eq(r.ok,false,"التفعيلُ يرفض بلا showSaveFilePicker");
 ok(/يدعم/.test(r.msg||""),"والسببُ مكتوبٌ في النتيجة");
 ok(said.length===1,"ويُقال مرّةً للمستخدم");
 ok(/حفظ باسم/.test(said[0][1]),"ويُدَلُّ على البديل اليدويّ");
});

await groupAsync("الكتابةُ تحتاج تفعيلاً",async()=>{
 B._setHandle(null);
 const r=await B.writeNow("{}");
 eq(r.ok,false,"بلا مقبضٍ لا كتابة");
 eq(B.schedule("{}"),false,"والجدولةُ ترفض كذلك");
 eq(B._pending(),null,"ولا نصَّ معلَّقاً");
});

await groupAsync("الكتابةُ تصل الملفَّ فعلاً",async()=>{
 const h=fake();
 eq(B._setHandle(h,"bk.json"),1,"المقبضُ المزيَّفُ يُفعِّل");
 clr();
 const r=await B.writeNow('{"a":1}');
 eq(r.ok,true,"الكتابةُ نجحت");
 eq(h.writes.length,1,"ومرّةً واحدةً");
 eq(h.writes[0],'{"a":1}',"والنصُّ كما أُرسِل حرفاً بحرف");
 eq(B.BK.n,1,"والعدّادُ ارتفع");
 eq(B.BK.err,"","ولا خطأَ باقٍ");
 eq(said.length,0,"والنجاحُ لا يُزعِج");
});

await groupAsync("المهلةُ تجمع وآخرُ نصٍّ يفوز",async()=>{
 const h=fake();
 B._setHandle(h,"bk.json");
 eq(B.schedule("أ",1000),true,"جُدِولت");
 eq(B.schedule("ب",1000),true,"ثم ثانيةٌ في المهلة نفسها");
 eq(B.schedule("ج",1000),true,"ثم ثالثة");
 eq(B._pending(),"ج","والمعلَّقُ هو الأخيرُ وحده");
 eq(h.writes.length,0,"ولا كتابةَ قبل انقضاء المهلة");
 eq(B.flushSoon(),true,"والتفريغُ الفوريُّ يعمل");
 await new Promise(r=>setTimeout(r,0));
 eq(h.writes.length,1,"كتابةٌ واحدةٌ لا ثلاث");
 eq(h.writes[0],"ج","وبالنصِّ الأخير");
 eq(B._pending(),null,"ولا شيءَ معلَّقٌ بعده");
 eq(B.flushSoon(),false,"وتفريغٌ ثانٍ بلا مهلةٍ لا يفعل شيئاً");
});

await groupAsync("الإذنُ المسحوبُ يُقال ولا يُكتَب",async()=>{
 const h=fake({perm:"denied"});
 B._setHandle(h,"bk.json");
 clr();
 const r=await B.writeNow("{}");
 eq(r.ok,false,"الكتابةُ تتوقّف");
 eq(h.writes.length,0,"ولا بايتَ وصل الملفَّ");
 ok(h.asked>=1,"والإذنُ طُلِب لا افتُرِض");
 eq(said.length,1,"ويُقال للمستخدم");
 ok(/إذن/.test(said[0][1]),"والرسالةُ تسمّي السبب");
 /* مرّةً لا كلَّ محاولة — كسياسة writePref */
 await B.writeNow("{}");
 await B.writeNow("{}");
 eq(said.length,1,"ومحاولاتٌ تالياتٌ لا تكرّر الرسالة");
});

await groupAsync("الفشلُ يُقال لا يُبلَع",async()=>{
 const h=fake({fail:1});
 B._setHandle(h,"bk.json");
 clr();
 const r=await B.writeNow("{}");
 eq(r.ok,false,"القرصُ الممتلئُ يُرجِع فشلاً");
 ok(/ممتلئ/.test(B.BK.err),"والسببُ محفوظٌ في الحالة");
 eq(said.length,1,"ويُقال مرّةً");
 eq(said[0][0],"er","بمستوى خطأ");
 /* ثم نجاحٌ يمسح الكتمَ فيُقال الفشلُ التالي من جديد */
 h.fail=0;
 await B.writeNow("{}");
 h.fail=1;
 await B.writeNow("{}");
 eq(said.length,2,"ونجاحٌ بينهما يعيد صدقَ التبليغ");
});

await groupAsync("الإطفاءُ يُلغي ما لم يُكتَب",async()=>{
 const h=fake();
 B._setHandle(h,"bk.json");
 B.schedule("أ",1000);
 ok(B._pending()!=null,"نصٌّ معلَّق");
 await B.disable();
 eq(B.BK.on,0,"أُطفئت");
 eq(B._pending(),null,"والمعلَّقُ ذهب معها");
 await new Promise(r=>setTimeout(r,20));
 eq(h.writes.length,0,"ولا كتابةَ بعد الإطفاء");
 eq(B.schedule("ب"),false,"والجدولةُ مرفوضةٌ بعده");
});

await groupAsync("الاستعادةُ بلا دعمٍ لا ترمي",async()=>{
 B._setHandle(null);
 const r=await B.restore();
 eq(r.ok,false,"بلا showSaveFilePicker لا استعادة");
 eq(B.BK.on,0,"والحالةُ تبقى مُطفأة");
});

await groupAsync("الخُطّافُ مُركَّبٌ لا مستورَد",async()=>{
 /* الحالةُ لا تستورد io/project.js ولا io/backup.js (دورةٌ)، فالربطُ
    خُطّافٌ تركّبه الواجهةُ وهي تملك الاثنين. هنا نتحقّق أنّ الخُطّافَ
    يُنادى فعلاً عند الحفظ، وأنّ غيابَه لا يكسر شيئاً. */
 eq(typeof B.schedule,"function","schedule جاهزةٌ للخُطّاف");
 eq(typeof B.flushSoon,"function","وflushSoon للإغلاق");
 const St=await import("../core/state.js");
 eq(typeof St.setBackupHook,"function","والحالةُ تتيح تركيبَه");
 let n=0;
 St.setBackupHook(()=>{n++});
 St.newState(); St.ensureShape();
 const W=await import("../core/walls.js");
 St.edit(()=>{W.addWall([0,0],[3000,0],200,"int","c")},"جدار");
 await St.saveNow();
 ok(n>=1,"تعديلٌ ثمّ حفظٌ ⇒ نُودي الخُطّاف");
 /* خُطّافٌ يرمي لا يُسقط الحفظ: الحالةُ أهمُّ من النسخة */
 St.setBackupHook(()=>{throw new Error("عطب")});
 St.edit(()=>{W.addWall([0,1000],[3000,1000],200,"int","c")},"جدار٢");
 let threw=0;
 try{await St.saveNow()}catch(e){threw=1}
 eq(threw,0,"وخُطّافٌ عاطبٌ لا يُسقط الحفظ");
 St.setBackupHook(null);
 const before=n;
 St.edit(()=>{W.addWall([0,2000],[3000,2000],200,"int","c")},"جدار٣");
 await St.saveNow();
 eq(n,before,"ونزعُه يوقف النداءَ تماماً");
});

process.exit(summary()?1:0);
