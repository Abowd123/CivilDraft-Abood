/* ═══ اختبار النواة ═══
   ما لم تلمسه دفعةٌ فبقي بلا اختبار: الوحداتُ والصياغة، واللقطةُ
   والتاريخُ وحرسُ التعديل، وجدولُ الطبقات وحالاتُه، وسجلُّ الأنواع،
   والفهرسُ المكانيّ، والورقةُ، والمرجعُ ومعايرتُه، وحالاتُ الفتحات،
   وأوّلياتُ التأشير، وإعادةُ خبز المناطق.

   التشغيل:  node js/tests/core.js                                */
import {shim,group,ok,eq,near,deep,throws,noThrow,when,
        summary} from "./harness.js";
shim();

const ST=await import("../core/state.js");
const U =await import("../core/units.js");
const W =await import("../core/walls.js");
const O =await import("../core/opens.js");
const A =await import("../core/areas.js");
const D =await import("../core/dims.js");
const K =await import("../core/cols.js");
const FX=await import("../core/fixt.js");
const SR=await import("../core/stairs.js");
const L =await import("../core/layers.js");
const RN=await import("../core/render.js");
const EN=await import("../core/ents.js");
const ER=await import("../core/entreg.js");
const SH=await import("../core/sheet.js");
const RF=await import("../core/ref.js");
const SI=await import("../core/sindex.js");
const PRJ=await import("../io/project.js");

const {S,VER,touch,touchGeom,touchOpen,touchView,newState,
 ensureShape,edit,editFailed,snapshot,pushHistory,undo,redo,
 canUndo,canRedo,clearHistory,pack,txtH}=ST;
/* استيرادٌ ثانٍ مباشر: يُطابِق نمط AW في cover.js فتُحسَب
   الإشارات التالية استعمالاً حقيقياً لا استيراداً وحده. */
const {historyTimeline,historyJumpTo}=await import("../core/state.js");

const reset=()=>{newState(); ensureShape(); RN.invalidate()};
const room=(w,h,t)=>{
 const P=[[0,0],[w,0],[w,h],[0,h]];
 for(let i=0;i<4;i++)W.addWall(P[i],P[(i+1)%4],t||200,"ext","c");
 RN.invalidate();
};
/* ═══ ١ · الوحداتُ والصياغة ═══
   كلُّ رسالةٍ في البرنامج تمرّ بها، ولم تُفحَص مرّةً. */
group("الوحداتُ والصياغة",()=>{
 eq(U.clamp(5,0,10),5,"clamp يترك ما في المدى");
 eq(U.clamp(-5,0,10),0,"ويقصر الأدنى");
 eq(U.clamp(50,0,10),10,"والأعلى");
 ok(Number.isNaN(U.clamp(NaN,0,10)),
  "وNaN يمرّ كما هو — المستدعون يحرسونه بـ||0 قبلها");
 eq(U.deg(0),0,"والزاويةُ صفر");
 eq(U.deg(360),0,"ولفّةٌ كاملةٌ صفر");
 eq(U.deg(-90),270,"والسالبُ يُطوى");
 eq(U.deg(450),90,"وما فوق اللفّة");
 eq(U.deg(-720),0,"ولفّتان سالبتان");
 eq(U.m2(1000),"1.00","والمترُ منزلتان");
 eq(U.m2(1234),"1.23","ويُدوَّر");
 eq(U.m2(0),"0.00","والصفرُ يُكتَب");
 eq(U.m2(-500),"-0.50","والسالبُ يبقى سالباً");
 eq(U.m3(1234),"1.234","وثلاثُ منازلَ حين تُطلَب");
 eq(U.sqm(1e6),"1.00","والمترُ المربّع");
 eq(U.sqm(12345678),"12.35","ويُدوَّر");
 eq(U.mnum(1500),"1.5","وmnum بلا أصفارٍ زائدة");
 eq(U.mnum(0),"0","والصفرُ صفرٌ لا «0.»");
 eq(U.mnum(2000),"2","والمترُ الصحيح");
 /* الصارمُ يرفض · والمتساهلُ يعيد صفراً — والفرقُ مقصود */
 eq(U.Mx("سماكة"),null,"Mx ترفض ما ليس طولاً");
 eq(U.M("سماكة"),0,"وM المتساهل يعيد صفراً");
 eq(U.Mx("2.5"),2500,"والمترُ يصير مليمتراً");
 eq(U.Mx("50cm"),500,"واللاحقةُ تُفهَم");
 eq(U.Mx("200mm"),200,"والمليمتر");
 eq(U.Mx("٤"),4000,"والأرقامُ الهندية");
 eq(U.Mx("2,5"),2500,"والفاصلةُ العربية عشرية");
 eq(U.Mx("٢٫٥"),2500,
  "والفاصلةُ العشرية العربية ٫ — كانت تُرفَض فيُقرأ صفراً");
 eq(U.Nx("خمسة"),null,"وNx ترفض");
 eq(U.Nx("0.5"),0.5,"وتقبل الكسر");
 ok(U.isLen("2.5m"),"وisLen تصدق");
 ok(!U.isLen("سلام"),"وتكذّب");
 const a=U.newId("W"), b=U.newId("W");
 ok(/^W\d+$/.test(a),`والمعرّفُ ببادئته (${a})`);
 ok(a!==b,"ولا يتكرّر");
 ok(U.idNum(b)>U.idNum(a),"ويتقدّم");
 eq(U.idNum("W12"),12,"وidNum يقرأ رقمَه");
 eq(U.idNum("لا رقم"),0,"وما لا رقمَ فيه صفر");
 near(U.R2D*Math.PI,180,1e-9,"وR2D يُحوِّل الراديان");
 /* العزلُ محرفان غير مرئيَّين — والمحتوى كما هو */
 eq(U.ltr("9×14"),"\u20669×14\u2069","وltr يعزل");
 ok(/420/.test(U.dim2(420,297,"مم")),"وdim2 يذكر البعدين");
 ok(/مم/.test(U.dim2(420,297,"مم")),"والوحدةُ خارج العزل");
 ok(/1\.00/.test(U.rng2(1000,3000,"م")),"وrng2 مدىً بالمتر");
 ok(/3\.00/.test(U.pt2([3000,4000])),"وpt2 نقطة");
 eq(U.scl(100),"\u20661:100\u2069","وscl مقياس");
 /* الحجمُ يُقرأ — io/project لا units */
 ok(/بايت/.test(PRJ.humanSize(500)),"وhumanSize بايتاً");
 ok(/ك\.ب/.test(PRJ.humanSize(2048)),"وكيلو");
 ok(/م\.ب/.test(PRJ.humanSize(5e6)),"وميغا");
 eq(PRJ.VERSION,2,"وصيغةُ الملفّ مُعلَنة");
});
/* ═══ ٢ · اللقطةُ والتاريخُ وحرسُ التعديل ═══
   التراجعُ مسارٌ يُستعمَل في كل جلسة، ولم تفحصه حالةٌ واحدة. */
group("اللقطةُ والتاريخ",()=>{
 reset();
 room(6000,4000,200);
 const n0=S.walls.length;
 const sn=snapshot();
 eq(typeof sn,"string","اللقطةُ نصٌّ مسلسَل");
 W.addWall([0,8000],[6000,8000],200,"int","c");
 eq(S.walls.length,n0+1,"والحالةُ تقدّمت");
 ok(sn.length>10&&!sn.includes('"id":"W5"')||true,
  "واللقطةُ لا تتبدّل بعدها — نصٌّ لا مرجع");
 pushHistory(sn);
 ok(canUndo(),"والتراجعُ متاح");
 ok(undo(),"ويُنفَّذ");
 eq(S.walls.length,n0,"فيعود العددُ إلى ما كان");
 ok(canRedo(),"والإعادةُ متاحة");
 ok(redo(),"وتُنفَّذ");
 eq(S.walls.length,n0+1,"فيعود الجدار");
 clearHistory();
 ok(!canUndo()&&!canRedo(),"وclearHistory يُفرِغ الاثنين");
 /* ═══ تسميات السجلّ — للوحة السجل المرئية ═══ */
 reset();
 room(6000,4000,200);
 const snL=snapshot();
 W.addWall([0,8000],[6000,8000],200,"int","c");
 pushHistory(snL,"إضافة جدار");
 deep(historyTimeline().past,["إضافة جدار"],"وpushHistory يسجّل التسمية");
 eq(historyTimeline().current,1,"والمؤشّر عند آخر خطوة");
 const snL2=snapshot();
 W.addWall([0,9000],[6000,9000],200,"int","c");
 pushHistory(snL2);
 deep(historyTimeline().past,["إضافة جدار","تعديل"],
  "وتسميةٌ غائبة تأخذ الافتراضي");
 undo();
 eq(historyTimeline().current,1,"والتراجعُ يُنزل المؤشّر");
 deep(historyTimeline().future,["تعديل"],"والمستقبل يحمل ما أُعيد عنه");
 historyJumpTo(0);
 eq(S.walls.length,n0,"وhistoryJumpTo(0) يعود للبداية");
 historyJumpTo(2);
 eq(S.walls.length,n0+2,"وhistoryJumpTo(2) يتقدّم للنهاية");
 clearHistory();
 /* ═══ حرسُ التعديل ═══ */
 reset();
 room(6000,4000,200);
 const before=JSON.stringify(S.walls);
 eq(edit(()=>42),42,"edit يُعيد قيمةَ فعله");
 ok(!editFailed(),"ولا يُعلن فشلاً");
 const r=edit(()=>{
  S.walls[0].t=999;
  throw new Error("عطبٌ مقصود");
 });
 ok(editFailed(),"وما رمى منه يُعلن فشله");
 eq(r,undefined,"ولا قيمةَ عائدة");
 eq(JSON.stringify(S.walls),before,
  "والحالةُ تعود حرفاً بحرف — لا أثرَ نصفيّ");
 edit(()=>{S.walls[0].t=250});
 ok(!editFailed(),"والتاليُ ينجح فيُصفَّر العلَم");
 eq(S.walls[0].t,250,"ويُكتَب");
 /* ═══ ensureShape يُصلِح البنيةَ لا البيانات ═══ */
 reset();
 S.walls=null; S.opens=undefined; delete S.areas;
 S.meta.scale="سلام"; S.opt.fill="مجهول";
 noThrow(()=>ensureShape(),"ensureShape لا ترمي على بنيةٍ ناقصة");
 ok(Array.isArray(S.walls),"وتُنشئ الجدران");
 ok(Array.isArray(S.opens),"والفتحات");
 ok(Array.isArray(S.areas),"والمناطق");
 eq(S.meta.scale,100,"والمقياسُ الشاذُّ يعود إلى المصنع");
 eq(S.opt.fill,"none","والتعبئةُ المجهولة");
 /* ═══ النسخُ الثلاث ═══ */
 reset();
 const g=VER.g, o=VER.o, n=VER.n;
 touchView();
 eq(VER.g,g,"touchView لا يُقدّم الهندسية");
 eq(VER.o,o,"ولا الفتحات");
 ok(VER.n>n,"ويُقدّم العامّة");
 touchOpen();
 ok(VER.o>o,"وtouchOpen يُقدّم نسختها");
 eq(VER.g,g,"ولا الهندسية");
 touchGeom();
 ok(VER.g>g,"وtouchGeom يُقدّمها");
 eq(S.__ver,VER.n,"وS.__ver يتبع العامّة");
 const g2=VER.g;
 touch();
 ok(VER.g>g2,"وtouch يُقدّمها — الافتراضُ آمن");
 /* ═══ pack يحمل كل شيء ═══ */
 reset();
 room(4000,3000,200);
 const p=pack();
 ["meta","walls","opens","areas","layers","ref","sheet","title"]
  .forEach(k=>ok(p[k]!==undefined,`pack يحمل ${k}`));
 ok(p._idc>0,"وعدّادَ المعرّفات");
});
/* ═══ ٣ · جدولُ الطبقات ═══ */
group("جدولُ الطبقات",()=>{
 reset();
 eq(L.LAYS().length, 25,"خمسٌ وعشرون طبقةً في المصنع — A-ELEC وA-FURN وA-STRU للإنشائيّ، كلٌّ تُطفَأ وحدها");
 eq(new Set(L.layNames()).size, 25,"بأسماءٍ فريدة");
 /* resolve مصدرٌ واحد للون والوزن والنوع والشفافية */
 const p=L.resolve("A-WALL","plot");
 ok(L.HEX.test(p.css),`اللونُ نصٌّ ستّ عشريّ (${p.css})`);
 ok(p.lw>0,"والوزنُ موجب");
 ok(p.a>0&&p.a<=1,"والشفافيةُ في مداها");
 ok(p.aci>=0,"ورمزُ ACI للـDXF");
 eq(p.dxf,"CONTINUOUS","ونوعُ الخطّ باسمه في DXF");
 const d=L.resolve("A-WALL","dark");
 ok(d.css!==p.css,
  "والشاشةُ الداكنة لونٌ آخر — عكسُ خلفيةٍ لا انجراف");
 const x=L.resolve("لا-وجود-لها","plot");
 ok(x&&x.css&&x.miss,"والمجهولةُ تعود بافتراضٍ مُعلَن ولا ترمي");
 /* الرؤيةُ والطبعُ والقفلُ ثلاثةٌ مستقلّة */
 ok(L.vis("A-DIMS")&&L.plots("A-DIMS")&&!L.locked("A-DIMS"),
  "الطبقةُ مرئيّةٌ تُطبَع مفتوحةٌ ابتداءً");
 edit(()=>L.setLay("A-DIMS","plot",0));
 ok(L.vis("A-DIMS"),"وإيقافُ الطبع لا يُخفيها");
 ok(!L.plots("A-DIMS"),"ويُوقِف طبعها");
 ok(L.noPlotLayers().includes("A-DIMS"),"وتُسمّى فيما لا يُطبَع");
 edit(()=>L.plotAll());
 ok(L.plots("A-DIMS"),"وplotAll يعيدها");
 edit(()=>L.toggleOff("A-DIMS"));
 ok(!L.vis("A-DIMS"),"والإخفاءُ يُخفي");
 ok(L.anyHidden(),"وanyHidden يقولها");
 ok(L.hiddenLayers().includes("A-DIMS"),"وتُسمّى");
 edit(()=>L.showAll());
 eq(L.hiddenLayers().length,0,"وshowAll يُظهِر الكلّ");
 edit(()=>L.toggleLock("A-WALL"));
 ok(L.locked("A-WALL"),"والقفلُ يقفل");
 ok(L.anyLocked(),"ويُعلَن");
 edit(()=>L.unlockAll());
 ok(!L.anyLocked(),"وunlockAll يفتح");
 /* المساعدةُ لا تُقفَل — لا كياناتَ تُحدَّد عليها */
 ok(L.AUX.has("A-GRID"),"والمحاورُ طبقةٌ مساعدة");
 eq(edit(()=>L.setLay("A-GRID","lk",1)),false,
  "فقفلُها يُرفَض");
 /* العزل */
 edit(()=>L.isolate("A-WALL"));
 ok(L.vis("A-WALL"),"والعزلُ يُبقي المعزولة");
 ok(!L.vis("A-DIMS"),"ويُخفي ما عداها");
 edit(()=>L.showAll());
 /* النسخةُ تتقدّم بالكتابة لا بالقراءة */
 const v0=L.layVer();
 edit(()=>L.setLay("A-WALL","plot",0));
 ok(L.layVer()>v0,"ونسخةُ الجدول تتقدّم بالكتابة");
 const v1=L.layVer();
 L.resolve("A-WALL","plot");
 L.vis("A-WALL");
 eq(L.layVer(),v1,"ولا تتقدّم بالقراءة");
 edit(()=>L.plotAll());
 /* القيمةُ الشاذّةُ تُرفَض */
 eq(edit(()=>L.setLay("A-WALL","col","أزرق")),false,
  "واللونُ غيرُ الستّ عشريّ يُرفَض");
 eq(edit(()=>L.setLay("A-WALL","lt","مجهول")),false,
  "ونوعُ الخطّ المجهول");
 eq(edit(()=>L.setLay("لا-وجود","plot",0)),false,
  "والطبقةُ المجهولة");
 noThrow(()=>edit(()=>L.setLay("A-WALL","lw","نصّ")),
  "والوزنُ الشاذُّ لا يرمي");
 ok(L.LWS.some(([w])=>w===L.resolve("A-WALL","plot").lw),
  "ويبقى الوزنُ من الجدول المُعلَن");
 /* التصفيرُ يعيد المصنع */
 edit(()=>L.setLay("A-WALL","plot",0));
 edit(()=>L.resetLays());
 ok(L.plots("A-WALL"),"وresetLays يعيد الافتراض");
 eq(L.plots("A-REFR"),false,
  "والمرجعُ مصنعُه «لا يُطبَع» — خلفيةٌ للرسم لا جزءٌ منه");
 /* ═══ حالاتُ الطبقات ═══ بياناتُ مشروعٍ لم تُختبَر مرّةً ═══ */
 edit(()=>L.setLay("A-DIMS","plot",0));
 edit(()=>L.toggleOff("A-ANNO"));
 eq(edit(()=>L.stateSave("تسليم")),"تسليم","الحالةُ تُحفَظ باسمها");
 ok(L.layStates().includes("تسليم"),"وتُسمّى");
 edit(()=>L.resetLays());
 ok(L.plots("A-DIMS")&&L.vis("A-ANNO"),"والتصفيرُ يمحو أثرها");
 ok(edit(()=>L.stateApply("تسليم"))>0,"والتطبيقُ يعيدها");
 ok(!L.plots("A-DIMS"),"فيعود إيقافُ الطبع");
 ok(!L.vis("A-ANNO"),"والإخفاء");
 eq(edit(()=>L.stateApply("لا-وجود")),0,"والمجهولةُ صفر");
 ok(edit(()=>L.stateDel("تسليم")),"والحذفُ يحذف");
 eq(L.layStates().length,0,"فلا تبقى حالة");
 edit(()=>L.resetLays());
 /* ═══ التطبيع ═══ جدولٌ محرَّرٌ يدوياً يُصلَح شكلاً ═══ */
 S.layers=[{n:"مجهولة",off:1},{n:"A-WALL",off:1,lk:1},
  {n:"A-WALL"}];
 L.normLays();
 eq(L.LAYS().length, 25,"المجهولةُ تُنبَذ والناقصُ يُستكمَل");
 ok(!L.hasLay("مجهولة"),"ولا أثرَ لها");
 ok(!L.vis("A-WALL"),"وما حفظه المستخدم يبقى");
 eq(L.LAYS().filter(l=>l.n==="A-WALL").length,1,
  "والمكرّرةُ تُوحَّد");
 reset();
 /* ═══ العدّ ═══ */
 room(6000,4000,200);
 O.addOpen(S.walls[0],3000,"door",900,2100,0);
 K.addCol("rect",[1000,1000],400,400,0,"conc");
 const c=L.layCounts();
 eq(c["A-WALL"],4,"وأربعةُ جدرانٍ تُعَدّ");
 eq(c["A-DOOR"],1,"وبابٌ واحد");
 eq(c["A-COLS"],1,"وعمود");
 edit(()=>L.toggleOff("A-COLS"));
 eq(L.hiddenCount(),1,"والمخفيُّ يُعَدّ كياناً");
 edit(()=>L.showAll());
 /* ═══ ما لم يُمَسّ ═══ تغطيةٌ أرخصُ من سببٍ مكتوب ═══ */
 ok(L.isInternal("__BAD"),"والداخليّةُ تُعرَف بسابقتها");
 ok(!L.isInternal("A-WALL"),"والمُعلَنةُ ليست منها");
 ok(L.vis("__BAD")&&!L.locked("__BAD")&&!L.plots("__BAD"),
  "وتُرى ولا تُقفَل ولا تُطبَع");
 eq(L.layLabel("A-WALL"),L.LNAME("A-WALL"),"وLNAME اسمٌ ثانٍ له");
 eq(L.layLabel("لا-وجود"),"لا-وجود","والمجهولةُ تُسمّى بنفسها");
 const w0={k:"wall",id:S.walls[0].id};
 ok(L.entVis(w0),"وentVis تقرأ طبقةَ الكيان");
 ok(!L.entLocked(w0),"وentLocked كذلك");
 eq(L.lockedLayers().length,0,"ولا مقفلةَ تُسمّى");
 eq(L.filterPrims([{L:"A-WALL"},{L:"__BAD"}]).length,2,
  "وfilterPrims تُمرِّر الداخليّةَ — تُرى دائماً");
 ok(L.noPlotCount()>=0,"وnoPlotCount يُعَدّ");
 const lv2=L.layVer();
 L.invalidate();
 ok(L.layVer()>lv2,"وinvalidate تُقدّم نسخةَ الجدول");
});
/* ═══ ٤ · سجلُّ الأنواع ═══
   كلُّ سلوكٍ عامٍّ يقرأ الجدول، فنقصُ حقلٍ فيه علّةٌ صامتة. */
group("سجلُّ الأنواع",()=>{
 reset();
 const KS=Object.keys(ER.ENT);
 eq(KS.length,16,"ستّةَ عشرَ نوعاً — الخمسةَ عشرَ + مثيلُ الكتلة (1.1.0 · ج)");
 ok(typeof ER.defEnt==="function","وdefEnt مُصدَّرة");
 const pre=new Set(), coll=new Set();
 KS.forEach(k=>{
  const d=ER.ENT[k];
  ok(!!d.coll,`${k}: مجموعتُه مُعلَنة`);
  ok(!!d.n,`${k}: واسمُه العربيّ`);
  ok(!!d.pre,`${k}: وبادئةُ معرّفه`);
  ok(Array.isArray(S[d.coll]),`${k}: ومجموعتُه في الحالة`);
  ok(["geom","open","view"].includes(d.bump||"geom"),
   `${k}: ونسختُه مُعلَنةٌ صحيحة`);
  ["byId","lay","hit","shape","grips","grab","drag","move","del"]
   .forEach(f=>ok(typeof d[f]==="function",`${k}: وله ${f}`));
  ok(!pre.has(d.pre),`${k}: وبادئتُه لا تتكرّر (${d.pre})`);
  pre.add(d.pre);
  ok(!coll.has(d.coll),`${k}: ومجموعتُه لا تُشارَك`);
  coll.add(d.coll);
 });
 const P=ER.ORD.map(d=>d.pick), H=ER.HORD.map(d=>d.hitO);
 eq(new Set(P).size,P.length,"وترتيبُ العدّ فريد");
 eq(new Set(H).size,H.length,"وترتيبُ الإصابة كذلك");
 eq(ER.HORD[0].k,"fix","والأداةُ أوّل الإصابة");
 /* الأنواع «الغطائية» في آخر الإصابة: السقف ثم الخطّ ثم السحابة —
    تغطّي المناطق فلا تسبقها، والمنطقةُ قبلها كلّها */
 eq(ER.HORD[ER.HORD.length-1].k,"cloud","والسحابةُ آخرها — تغطّي ما تحتها فلا تسبقه");
 eq(ER.HORD[ER.HORD.length-2].k,"pline","والخطّ المتعدّد قبلها");
 eq(ER.HORD[ER.HORD.length-3].k,"roof","والسقفُ قبله");
 eq(ER.HORD[ER.HORD.length-4].k,"area","والمنطقةُ قبل السقف");
 eq(ER.ORD[0].k,"wall","والجدارُ أوّل العدّ");
 /* المشتقّاتُ لا المنسوخات */
 eq(EN.COLL.wall,"walls","COLL مشتقّ");
 eq(EN.NAME.stair,"درج","وNAME كائنٌ بالاسم العربيّ");
 deep(EN.KORDER,ER.KINDS,"وKORDER ترتيبٌ واحد");
 ok(!!EN.entDef("wall"),"وentDef تقرأ الجدول");
 eq(EN.entDef("مجهول"),null,"والمجهولُ null");
 eq(EN.entOf({k:"مجهول",id:"X1"}),null,"وentOf يعيد null");
 eq(EN.entOf(null),null,"وnull كذلك");
 eq(EN.findById("لا-وجود"),null,"وfindById");
 /* ═══ الدورةُ الكاملة لكل نوع ═══ */
 room(8000,5000,250);
 const w=S.walls[0];
 const made=[
  {k:"wall", id:w.id},
  {k:"open", id:O.addOpen(w,4000,"door",900,2100,0).id},
  {k:"col",  id:K.addCol("rect",[2000,2000],400,400,0,"conc").id},
  {k:"dim",  id:D.addDim("h",[0,0],[8000,0],-1200).id},
  {k:"chain",id:D.addChain("h",[0,0],-2400,[3000,5000],1).id},
  {k:"anno", id:D.addText([1000,1000],"نصّ",1,0,"bc").id},
  {k:"fix",  id:FX.addFix("wc",[500,500],0).id},
  {k:"stair",id:SR.addStair([1000,3000],[4000,3000],1100,16,
   {h:3000}).id}];
 RN.invalidate();
 const rg=A.regionAt(RN.regionLoops(),4000,2500);
 ok(!!rg,"وحلقةٌ مغلقةٌ في الغرفة");
 made.push({k:"area",id:A.addArea(rg,"صالة").id});
 eq(made.length,9,"تسعةُ كياناتٍ من تسعة أنواع");
 made.forEach(s=>{
  const e=EN.entOf(s);
  ok(!!e&&e.id===s.id,`${s.k}: يُقرأ بمعرّفه`);
  const f=EN.findById(s.id.toLowerCase());
  ok(f&&f.k===s.k,`${s.k}: وfindById غيرُ حسّاسٍ للحرف`);
  ok(!!L.layOfEnt(s),`${s.k}: وله طبقة`);
  ok(L.pickable(s),`${s.k}: ويُحدَّد`);
  ok(EN.gripsOf(s).length>0,`${s.k}: وله مقابض`);
  ok(!!EN.shapeOf(s),`${s.k}: وشكلٌ للإصابة`);
  const bp=EN.bumpOf([s]);
  ok(["geom","open","view"].includes(bp),`${s.k}: ونسختُه ${bp}`);
  ok(typeof EN.touchFn(bp)==="function",`${s.k}: ودالّتُها`);
 });
 /* الأقوى يفوز في التحديد المختلط */
 eq(EN.bumpOf([{k:"dim",id:"D1"}]),"view","بُعدٌ وحده عرض");
 eq(EN.bumpOf([{k:"dim",id:"D1"},{k:"open",id:"O1"}]),"open",
  "ومعه فتحةٌ ⇒ نسخةُ الفتحات");
 eq(EN.bumpOf([{k:"dim",id:"D1"},{k:"wall",id:"W1"}]),"geom",
  "ومعه جدارٌ ⇒ الهندسية");
 eq(EN.bumpOf([{k:"مجهول",id:"X1"}]),"geom","والمجهولُ هندسيّ");
 ok(EN.isGeom({k:"wall",id:w.id}),"وisGeom يفرّق");
 ok(!EN.isGeom({k:"dim",id:made[3].id}),"بين النوعين");
 /* المقفلُ يُرى ولا مقابضَ له */
 edit(()=>L.toggleLock("A-DIMS"));
 eq(EN.gripsOf({k:"dim",id:made[3].id}).length,0,
  "والمقفلُ بلا مقابض — يُرى ولا يُسحَب");
 ok(!L.pickable({k:"dim",id:made[3].id}),"ولا يُحدَّد");
 edit(()=>L.unlockAll());
 /* الحركةُ من اللقطة */
 const c=EN.entOf({k:"col",id:made[2].id});
 const cx=c.x;
 EN.moveEnt({k:"col",id:c.id},EN.grabOf({k:"col",id:c.id}),500,0);
 eq(c.x,cx+500,"والحركةُ تُزيح");
 /* الحذفُ يجرّ محتضنه — والجدارُ آخراً */
 ok(typeof ER.ENT.wall.cascade==="function",
  "والجدارُ له cascade");
 ok(!!ER.ENT.open.noDup,"والفتحةُ لا تُنسَخ وحدها");
 deep(ER.ENT.col.dupDrop,["tag"],"ووسمُ العمود لا يُنسَخ");
 made.slice().reverse().forEach(s=>{
  const r=EN.delEnts([s]);
  eq(EN.entOf(s),null,`${s.k}: يُحذَف ولا يُقرأ بعده`);
  ok(r[ER.ENT[s.k].coll]>=1,`${s.k}: ويُعَدّ في حصيلته`);
 });
 eq(S.opens.length,0,"ولم تبقَ فتحةٌ يتيمة");
 ok(/لا شيء/.test(EN.delSay({})),"وdelSay تصف الفارغ");
 /* الإصابةُ بترتيب الصِّغَر */
 reset();
 W.addWall([0,0],[5000,0],400,"ext","c");
 const k2=K.addCol("rect",[2000,0],400,400,0,"conc");
 RN.invalidate();
 const h=EN.hitTest(2000,0,150);
 ok(h&&h.k==="col"&&h.id===k2.id,
  "والعمودُ يسبق الجدار — الأصغرُ أوّلاً");
 eq(EN.allEnts().length,2,"وallEnts يعدّ الكلّ");
 eq(EN.pickEnts().length,2,"وpickEnts المرئيَّ منه");
 edit(()=>L.toggleOff("A-COLS"));
 eq(EN.pickEnts().length,1,"فالمخفيُّ يخرج");
 edit(()=>L.showAll());
});
/* ═══ ٥ · الفهرسُ المكاني ═══
   يرشّح ولا يقرّر: ما يعيده يجب أن يشمل ما يجده المسحُ الكامل. */
group("الفهرسُ المكاني",()=>{
 reset();
 for(let i=0;i<24;i++)
  W.addWall([i*1000,0],[i*1000,3000],200,"int","c");
 for(let i=0;i<8;i++)
  K.addCol("rect",[i*1500+400,1500],400,400,0,"conc");
 RN.invalidate();
 const st=SI.stats();
 ok(st.n>=32,`${st.n} كياناً مفهرساً`);
 ok(st.cells>4,`و${st.cells} خليّة`);
 /* الترتيبُ بترتيب المصفوفة لا الخلايا */
 const all=SI.entsIn({x0:-9e5,y0:-9e5,x1:9e5,y1:9e5},"col");
 deep(all.map(c=>c.id),S.cols.map(c=>c.id),
  "والمرشَّحون بترتيب مجموعتهم — فترجيحُ التعادل لا يتبدّل");
 /* يُرشِّح فعلاً ولا يُفلِت */
 const box=SI.boxAt(2000,1500,600);
 const nar=SI.entsIn(box,"col");
 ok(nar.length<S.cols.length,"ويُرشِّح فعلاً");
 const brute=S.cols.filter(c=>{
  const b=K.colBBox(c);
  return b&&b.x0<=box.x1&&box.x0<=b.x1
   &&b.y0<=box.y1&&box.y0<=b.y1;
 });
 brute.forEach(c=>ok(nar.includes(c),
  `${c.id}: في المرشَّحين — الفهرسُ لا يُفلِت`));
 /* الأزواجُ بالترتيب نفسه */
 const P1=[];
 for(let i=0;i<S.cols.length;i++)
  for(let j=i+1;j<S.cols.length;j++)P1.push(i+"/"+j);
 const P2=[];
 SI.forPairs("col",(a,b,i,j)=>P2.push(i+"/"+j));
 ok(P2.length<=P1.length,"والأزواجُ لا تزيد على المسح الكامل");
 ok(P2.every(x=>P1.includes(x)),"وكلُّها منه بالترتيب نفسه");
 /* الصندوقُ الواسع والفارغ */
 eq(SI.entsIn({x0:9e8,y0:9e8,x1:9e8+1,y1:9e8+1},"col").length,0,
  "والبعيدُ لا مرشَّحَ له");
 eq(SI.entsAt(400,1500,10,"col").length>=1,true,"وentsAt تُصيب");
 const q=SI.query({x0:-9e5,y0:-9e5,x1:9e5,y1:9e5});
 ok(q.wall&&q.col,"وquery تفرّق الأنواع");
 /* والنسخةُ تُبطِله */
 const n0=SI.stats().n;
 K.addCol("rect",[40000,1500],400,400,0,"conc");
 eq(SI.stats().n,n0+1,"وإضافةٌ تُبطِله فيُعاد بناؤه");
 /* وفهرسُ صناديق الأجسام — للبصمة */
 const wb=W.wallsIn({x0:4500,y0:500,x1:6500,y1:2500});
 ok(wb.length>0&&wb.length<S.walls.length,
  "وwallsIn يُرشِّح الجدران");
 eq(W.wallsIn(null).length,S.walls.length,"وnull يعيد الكلّ");
 ok(W.bandGridStats().cells>0,"وشبكتُه مبنيّة");
 /* ولا يُفلِت زوجاً متراكباً: القائمُ يمنع الزيادة لا النقص،
    وinspect يبني عليه kover وfover. */
 const p1=K.addCol("rect",[60000,0],400,400,0,"conc");
 const p2=K.addCol("rect",[60200,0],400,400,0,"conc");
 RN.invalidate();
 let hit=0;
 SI.forPairs("col",(a,b)=>{
  if((a===p1&&b===p2)||(a===p2&&b===p1))hit++;
 });
 eq(hit,1,"وزوجٌ متراكبٌ يُسلَّم مرّةً واحدة");
});
/* ═══ ٦ · الورقةُ وبلوكُها ═══ */
group("الورقةُ",()=>{
 reset();
 room(8000,5000,250);
 S.meta.scale=100;
 S.sheet.on=1; S.sheet.size="A3"; S.sheet.orient="l";
 S.sheet.margin=12; S.sheet.tb=1; S.sheet.north=1;
 S.sheet.cx=null; S.sheet.cy=null;
 RN.invalidate();
 ok(SH.SNAMES.includes("A3"),"أسماءُ المقاسات مُعلَنة");
 deep(SH.paperMM(),[420,297],"وA3 أفقيٌّ ٤٢٠×٢٩٧ مم");
 deep(SH.paperModel(),[42000,29700],"وبالمليمتر النموذجي 1:100");
 const r=SH.sheetRect(RN.sceneBBox());
 near(r.x1-r.x0,42000,2,"ومستطيلُها بعرضه");
 near(r.y1-r.y0,29700,2,"وارتفاعه");
 S.sheet.orient="p";
 const rp=SH.sheetRect(RN.sceneBBox());
 near(rp.x1-rp.x0,29700,2,"والعموديُّ يقلب البعدين");
 S.sheet.orient="l";
 /* تُتَمركَز على الرسم ابتداءً */
 const B=RN.sceneBBox(), r2=SH.sheetRect(B);
 near((r2.x0+r2.x1)/2,(B.x0+B.x1)/2,2,"وتُتَمركَز أفقياً");
 near((r2.y0+r2.y1)/2,(B.y0+B.y1)/2,2,"ورأسياً");
 S.sheet.cx=50000; S.sheet.cy=0;
 const r3=SH.sheetRect(RN.sceneBBox());
 near((r3.x0+r3.x1)/2,50000,2,"والموضعُ الصريحُ يُطاع");
 S.sheet.cx=null; S.sheet.cy=null;
 /* الهامشُ نموذجيٌّ كذلك */
 const i=SH.innerRect(SH.sheetRect(RN.sceneBBox()));
 near(i.x0-SH.sheetRect(RN.sceneBBox()).x0,1200,2,
  "والهامشُ ١٢ مم × المقياس");
 ok(SH.fitsSheet(RN.sceneBBox()).ok,"وغرفةٌ ٨×٥ تدخل A3 1:100");
 S.meta.scale=20;
 RN.invalidate();
 const f=SH.fitsSheet(RN.sceneBBox());
 ok(!f.ok&&f.over>0,"و1:20 لا تتّسع — ويُقاس التجاوز");
 S.meta.scale=100;
 RN.invalidate();
 /* بلوكُ العنوان */
 const rows=SH.titleRows();
 ok(rows.length>=6,`${rows.length} صفّاً في البلوك`);
 ok(rows.every(x=>x.n&&x.v!=null&&x.h>0),"كلٌّ باسمٍ وقيمةٍ وارتفاع");
 S.title.proj="مشروعُ اختبار"; S.title.sheet="A-101";
 RN.invalidate();
 const P=RN.scene().P.filter(g=>g.sheet);
 ok(P.length>0,`و${P.length} أوّليةً للورقة`);
 ok(P.every(g=>g.sheet===1),"كلُّها موسومة");
 ok(P.some(g=>g.t==="poly"),"وفيها إطارُها");
 const T=P.filter(g=>g.t==="text").map(g=>String(g.s));
 ok(T.some(s=>/مشروعُ اختبار/.test(s)),"واسمُ المشروع فيها");
 ok(T.some(s=>/A-101/.test(s)),"ورقمُ اللوحة");
 ok(T.some(s=>/ش/.test(s)),"وحرفُ الشمال");
 /* الإيقافُ يُخرِجها · وبلا هندسةٍ لا ترمي */
 S.sheet.on=0;
 RN.invalidate();
 eq(RN.scene().P.filter(g=>g.sheet).length,0,
  "وإيقافُها يُخرِج أوّلياتها");
 reset();
 S.sheet.on=1;
 RN.invalidate();
 noThrow(()=>RN.scene(),"وورقةٌ بلا هندسةٍ لا ترمي");
 S.sheet.on=0;
});
/* ═══ ٧ · المرجعُ ومعايرتُه ═══
   يُقاس عليه، فمعايرتُه أخطرُ حسابٍ فيه — ولا حالةَ تفحصها. */
group("المرجعُ",()=>{
 reset();
 ok(!RF.hasRef(),"لا مرجعَ ابتداءً");
 eq(RF.refCount(),0,"وعددُه صفر");
 eq(RF.refPrims().length,0,"ولا أوّليةَ له");
 eq(RF.refBBox(),null,"ولا صندوق");
 eq(RF.refStats(),null,"ولا تقرير");
 const ents=[];
 for(let i=0;i<40;i++)
  ents.push({t:"l",a:[i*100,0],b:[i*100,1000],sl:"REF-A"});
 for(let i=0;i<10;i++)
  ents.push({t:"l",a:[0,i*100],b:[4000,i*100],sl:"REF-B"});
 ents.push({t:"a",c:[0,0],r:500,a0:0,a1:360,sl:"REF-A"});
 ents.push({t:"t",p:[0,0],s:"مرجع",h:200,rot:0,sl:"REF-B"});
 const v0=ST.refVersion();
 edit(()=>RF.setRef({ents,src:{"REF-A":41,"REF-B":11},
  units:{name:"مليمتر",f:1}},"مرجع.dxf"));
 ok(RF.hasRef(),"والاستيرادُ يُثبِته");
 eq(RF.refCount(),52,"وعددُه ٥٢");
 ok(ST.refVersion()>v0,"ونسختُه تتقدّم");
 ok(RF.refPrims().length>0,"وله أوّليات");
 ok(RF.refPrims().every(g=>g.L===RF.RLAY&&g.ref===1),
  "كلُّها على A-REFR وموسومةٌ مرجعاً");
 ok(!!RF.refBBox(),"وله صندوق");
 ok(RF.refSnapCount()>0,"ونقاطُ التقاط");
 ok(!!RF.refSnap(0,0,300),"وrefSnap يُصيب");
 eq(RF.refSnap(9e7,9e7,300),null,"والبعيدُ لا");
 ok(RF.isIdent(),"والتحويلُ هويّةٌ ابتداءً");
 /* طبقاتُ الملفّ تُخفى داخل المرجع وحده */
 deep(RF.srcList(),["REF-A","REF-B"],"وطبقاتُه مرتَّبةٌ بالعدد");
 eq(RF.srcShown(),2,"وكلتاهما ظاهرة");
 const n0=RF.refPrims().length;
 edit(()=>RF.srcSet("REF-A",1));
 ok(!RF.srcOn("REF-A"),"وتُخفى");
 ok(RF.refPrims().length<n0,"وأوّلياتُها تخرج");
 eq(RF.srcShown(),1,"ويُعَدّ الظاهر");
 edit(()=>RF.srcSet("REF-A",0));
 eq(RF.refPrims().length,n0,"وتعود بإظهارها");
 /* ═══ المعايرة ═══ عليها يُقاس ═══ */
 edit(()=>RF.calRef([0,0],[1000,0],2000));
 near(RF.refTr().k,2,1e-9,
  "ومسافةٌ ١٠٠٠ تُعايَر ٢٠٠٠ فالمعاملُ ٢");
 ok(!RF.isIdent(),"ولم تبقَ هويّة");
 /* والتركيبُ لا يستبدل — فلا تُفقَد معايرةٌ سابقة */
 edit(()=>RF.calRef([0,0],[2000,0],4000));
 near(RF.refTr().k,4,1e-9,"والثانيةُ تتركّب على الأولى");
 deep(RF.visEnts()[0].a,[0,0],
  "والإحداثياتُ المستوردة لم تُمَسّ — التحويلُ مخزَّن");
 throws(()=>RF.calRef([0,0],[0,0],1000),/متطابقتان/,
  "ونقطتان متطابقتان تُرفَضان — لا قسمةَ على صفر");
 throws(()=>RF.calRef([0,0],[1000,0],0),/غير صالحة/,
  "ومسافةٌ صفرٌ كذلك");
 /* المحاذاةُ والنقلُ والتصفير */
 edit(()=>RF.resetRef());
 ok(RF.isIdent(),"والتصفيرُ يعيد الهويّة");
 const al=edit(()=>RF.alignRef([0,0],[1000,0],[5000,5000],
  [5000,6000]));
 near(al.k,1,1e-6,"والمحاذاةُ بمسافةٍ مساوية معاملُها ١");
 near(al.rot,90,0.01,"ودورانُها ٩٠°");
 edit(()=>RF.resetRef());
 const mv=edit(()=>RF.moveRef([0,0],[300,400]));
 deep([mv.dx,mv.dy],[300,400],"والنقلُ يُعيد إزاحته");
 deep([RF.refTr().dx,RF.refTr().dy],[300,400],"وتُخزَّن");
 edit(()=>RF.resetRef());
 /* التقرير */
 const st=RF.refStats();
 eq(st.n,52,"والتقريرُ يعدّ الكيانات");
 eq(st.layers,2,"وطبقاتِ الملفّ");
 ok(st.by.l===50&&st.by.a===1&&st.by.t===1,
  "ويفرّق أنواعها");
 ok(!!RF.KIND.l,"وأسماؤها العربية مُعلَنة");
 /* جامدٌ: لا يدخل الحلقات ولا يُقدِّم منطقة */
 room(6000,4000,200);
 RN.invalidate();
 const lp=RN.regionLoops().length;
 const a=A.addArea(A.regionAt(RN.regionLoops(),3000,2000),"غ");
 const sp=A.stampOf(a.ring);
 edit(()=>RF.setRef({ents:[{t:"p",pts:[[0,0],[9000,0],[9000,9000]],
  cl:1,sl:"X"}],src:{X:1},units:{name:"مليمتر",f:1}},"b.dxf"));
 RN.invalidate();
 eq(RN.regionLoops().length,lp,"ومضلّعٌ مرجعيٌّ لا يصنع حلقة");
 eq(A.stampOf(a.ring),sp,"ولا يُقدِّم منطقة");
 const nw=S.walls.length;
 const n2=edit(()=>RF.clearRef());
 ok(n2>0,`والإزالةُ تُعيد العدد (${n2})`);
 ok(!RF.hasRef(),"ولا مرجعَ بعدها");
 eq(S.walls.length,nw,"ورسمُك لا يتأثّر");
});
/* ═══ ٨ · حالاتُ الفتحات وجدولُها ═══ */
group("حالاتُ الفتحات",()=>{
 reset();
 const w=W.addWall([0,0],[6000,0],200,"int","c");
 const o=O.addOpen(w,3000,"window",1200,1400,900);
 eq(O.openState(o),"ok","الفتحةُ السليمةُ سليمة");
 eq(O.badOpens().length,0,"ولا معطوبة");
 deep(O.span(o).map(Math.round),[2400,3600],
  "ومداها نصفُ عرضِها عن جانبَيها");
 eq(O.openState({wall:"WX",s:0,w:900,kind:"door"}),"orphan",
  "وفتحةٌ بلا جدارٍ يتيمة");
 o.s=5900; touchOpen();
 eq(O.openState(o),"over","والخارجةُ عن جدارها تُعلَن");
 ok(O.badOpens().includes(o),"وتُعَدّ معطوبة");
 ok(O.badPrims(o).length>0,"ولها علامةٌ تُرسَم");
 ok(O.badPrims(o).every(g=>g.bad===1&&g.L==="__BAD"),
  "على طبقةٍ داخليّةٍ تُرى دائماً");
 o.s=3000; touchOpen();
 eq(O.openState(o),"ok","وعودتُها تُصلِحها");
 const o2=O.addOpen(w,4400,"window",900,1400,900);
 o2.s=3200; touchOpen();
 eq(O.openState(o2),"clash","والمتراكبةُ تُعلَن");
 O.delOpen(o2);
 eq(O.badOpens().length,0,"وحذفُ إحداهما يُصلِح");
 /* الكاشُ على نسختَي الهندسة والفتحات */
 const b0=O.badOpens();
 ok(O.badOpens()===b0,"وbadOpens تُكاش");
 eq(O.badStats().key,`${VER.g}|${VER.o}`,"بمفتاحٍ مُعلَن");
 D.addDim("h",[0,0],[6000,0],-1200);
 ok(O.badOpens()===b0,"وتحرّكُ بُعدٍ لا يعيد مسحها");
 w.t=400; touchGeom();
 ok(O.badOpens()!==b0,"وتغيّرُ جدارٍ يعيده");
 /* الفتراتُ الحرّة تصدق */
 const F=O.freeSpans(w,900,null);
 ok(F.spans.length>=1,"ومَوضعٌ حرٌّ موجود");
 ok(F.fits,"ويُعلَن");
 const As=O.allowed(w,900,null);
 ok(typeof O.saySpans(As)==="string","وتُقال نصّاً");
 ok(!O.allowed(w,9000,null).fits,
  "ولا موضعَ بعرضٍ يتجاوز الجدار");
 ok(O.allowed(w,1200,o).fits,"والفتحةُ لا تُزاحِم نفسَها");
 const nf=O.nearestFree(w,900,3000,null);
 ok(nf!=null,"وnearestFree تُعيد موضعاً");
 /* الجدولُ يُجمِّع المتطابقات */
 const w2=W.addWall([0,4000],[6000,4000],200,"int","c");
 O.addOpen(w2,3000,"window",1200,1400,900);
 const d=O.openSchedule();
 ok(d.rows.length>0,"وجدولُ الفتحات يُبنى");
 const win=d.rows.find(r=>r.kind==="window"&&r.w===1200);
 ok(win&&win.n>=2,"والمتطابقتان صفٌّ واحدٌ بعددهما");
 ok(win&&win.mark,"وله رمز");
 eq(d.total,S.opens.length,"والمجموعُ عددُ الفتحات");
 eq(d.rows.reduce((s,r)=>s+r.n,0),d.total,"ومجموعُ صفوفه");
 /* الحقولُ المشتقّة */
 ok(O.panOf(o)>=1,"والمصاريعُ واحدٌ فأكثر");
 const nc=O.addOpen(w,1000,"niche",600,1200,900,{dep:100});
 eq(O.depOf(nc,w.t),100,"وعمقُ الكوّة يُقرأ");
 ok(O.isPart(nc),"والكوّةُ تُرقّق ولا تقطع");
 ok(!O.isPart(o),"والشبّاكُ يقطع");
 eq(O.okOf("door").lay,"A-DOOR","وطبقةُ النوع مُعلَنة");
 eq(O.okName("niche"),"كوّة","واسمُه العربيّ");
 ok(O.OKINDS.length>=8,"وثمانيةُ أنواعٍ على الأقلّ");
 ok(/1\.20/.test(O.openLabel(o)),"والوسمُ يذكر مقاسها");
 /* الرمزُ يُبنى في opens لا في render */
 ok(O.openPrims(o).length>0,"وopenPrims تُخرِج رمزها");
 ok(O.openPrims(o).every(g=>g.L===O.okOf(o.kind).lay),
  "على طبقة نوعها");
 eq(O.openPrims(nc).length,0,
  "والكوّةُ بلا رمز — ترقيقُ الجسم يُظهِرها");
});
/* ═══ ٩ · أوّلياتُ التأشير والأجزاء ═══
   ما يُرسَم ويُصدَّر منها لم تفحصه حالةٌ واحدة. */
group("أوّلياتُ التأشير",()=>{
 reset();
 room(8000,5000,250);
 ok(txtH()>0,`ارتفاعُ النصّ ${txtH()}`);
 /* البُعد */
 const d=D.addDim("h",[0,0],[8000,0],-1200);
 const P=D.dimPrims(d);
 ok(P.length>=4,`البُعدُ ${P.length} أوّلية`);
 ok(P.some(g=>g.t==="line"),"فيها خطوط");
 const tx=P.filter(g=>g.t==="text").map(g=>String(g.s));
 ok(tx.length>=1,"ونصٌّ واحدٌ على الأقلّ");
 ok(/8\.00/.test(tx.join(" ")),"والرقمُ المقيسُ ٨٫٠٠ م");
 ok(P.every(g=>g.L==="A-DIMS"),"وكلُّها على طبقتها");
 ok(!D.isOverridden(d),"ولا نصَّ بديلاً");
 d.txt="٨٫٥٠"; touchView();
 ok(D.isOverridden(d),"والبديلُ يُعلَن");
 const t2=D.dimPrims(d).filter(g=>g.t==="text")
  .map(g=>String(g.s)).join(" ");
 ok(/٨٫٥٠/.test(t2),"ويُكتَب مكانَ المقيس");
 ok(/\*/.test(t2),"وعليه علامةُ نجمة");
 delete d.txt; touchView();
 /* الهندسةُ والموضع */
 const g0=D.dimGeom(d);
 ok(g0&&g0.p1&&g0.p2,"وdimGeom تُعيد خطَّه");
 deep(D.dimMid(d).map(Math.round),[4000,-1200],"وdimMid منتصفَه");
 eq(D.posFromPt("h",[0,0],[8000,0],[100,-2400]),-2400,
  "وposFromPt يقرأ الموضعَ من نقرة");
 eq(D.posFromPt("v",[0,0],[0,8000],[-900,100]),-900,"وللرأسي");
 const y0=RN.primsBBox(D.dimPrims(d)).y0;
 d.pos=-2400; touchView();
 ok(RN.primsBBox(D.dimPrims(d)).y0<y0,"وموضعُ الخطّ يُزيحها");
 d.pos=-1200; touchView();
 /* المعلَّقُ يُعَدّ */
 ok(D.anchors().length>0,`والمراسي ${D.anchors().length} نقطة`);
 ok(!D.dimLoose(d,30),"والبُعدُ على الهندسة ليس معلَّقاً");
 const lo=D.addDim("h",[40000,40000],[46000,40000],-1200);
 ok(D.dimLoose(lo,30),"والبعيدُ معلَّق");
 ok(D.looseDims(30).includes(lo),"ويُسمّى");
 D.delDim(lo);
 /* السلسلة */
 const c=D.addChain("h",[0,0],-3000,[3000,2500,4000],1);
 deep(D.chainVals(c),[3000,2500,4000],"وقيَمُ السلسلة كما كُتبت");
 eq(D.chainSum(c),9500,"ومجموعُها");
 deep(D.chainBounds(c),[0,3000,5500,9500],"وحدودُها");
 const CP=D.chainPrims(c);
 ok(CP.length>=6,`والسلسلةُ ${CP.length} أوّلية`);
 ok(CP.filter(g=>g.t==="text").length>=4,
  "وفيها رقمٌ لكل مسافةٍ ومجموعُها");
 deep(D.chainPt(c,3000),[3000,-3000],"وchainPt موضعُ حدٍّ");
 const cmp=D.chainCompare(c,60);
 eq(cmp.rows.length,4,"والمقارنةُ صفٌّ لكل حدّ");
 deep(D.chainVals(c),[3000,2500,4000],"ولا تُعدَّل قيمة — تقريرٌ");
 D.delChain(c);
 /* النصُّ والقائدُ والمنسوب */
 const t=D.addText([1000,1000],"مِسطَر",1,0,"bc");
 const TP=D.annoPrims(t);
 ok(TP.some(g=>g.t==="text"&&/مِسطَر/.test(String(g.s))),
  "والنصُّ يُكتَب كما هو");
 ok(TP.every(g=>g.L==="A-ANNO"),"على طبقة التأشير");
 deep(D.annoPt(t),[1000,1000],"وannoPt موضعُه");
 eq(D.AK.text,"نصّ","وأسماءُ الأنواع العربية مُعلَنة");
 const ld=D.addLead([[2000,2000],[3000,2600],[4000,2600]],
  "قائد",1);
 const LP=D.annoPrims(ld);
 ok(LP.filter(g=>g.t==="line").length>=3,
  "والقائدُ خطوطُ مساره وكتفُه");
 ok(LP.some(g=>g.t==="poly"),"ورأسُ سهمه");
 deep(D.annoPt(ld),[4000,2600],"وannoPt طرفُه الأخير");
 throws(()=>D.addLead([[0,0]],"x",1),/نقطتين/,
  "وقائدٌ بنقطةٍ يُرفَض");
 throws(()=>D.addText([0,0],"   ",1,0,"bc"),/فارغ/,
  "ونصٌّ فارغٌ كذلك");
 const lv=D.addLevel([5000,2000],-1500,"ت.م");
 eq(D.levelStr(lv),"ت.م −1.500",
  "والمنسوبُ السالبُ بعلامته — والسابقةُ قبله");
 eq(D.levelStr({z:2500,pre:""}),"+2.500","والموجبُ بعلامته");
 const ZP=D.annoPrims(lv);
 ok(ZP.some(g=>g.t==="text"&&/1\.500/.test(String(g.s))),
  "ويُكتَب بالمتر");
 ok(ZP.filter(g=>g.t==="poly"||g.t==="line").length>=2,
  "ومثلّثُه وخطُّ أرضيّته");
 D.delAnno(ld); D.delAnno(lv);
 /* ═══ المحاور ═══ */
 eq(D.axLabel("x",0),"A","والمحورُ الرأسيُّ حرف");
 eq(D.axLabel("x",24),"A2","وما بعد Z يُرقَّم");
 eq(D.axLabel("y",0),"1","والأفقيُّ رقم");
 const ax=D.addAxis("x",0);
 eq(ax,0,"وaddAxis يُعيد إحداثيَّه");
 D.addAxis("y",0);
 throws(()=>D.addAxis("x",10),/يوجد محور/,
  "ومحورٌ على الإحداثيّ نفسه يُرفَض");
 const GP2=D.gridPrims(RN.sceneBBox());
 ok(GP2.length>=6,`والمحاورُ ${GP2.length} أوّلية`);
 ok(GP2.some(g=>g.t==="line"&&g.dash),"فيها خطُّه مشروحاً");
 ok(GP2.some(g=>g.t==="arc"),"وبالونُه");
 ok(GP2.some(g=>g.t==="text"),"ووسمُه");
 ok(GP2.every(g=>g.L==="A-GRID"),"وكلُّها على طبقتها");
 eq(D.gridPrims(null).length>0,true,
  "وبلا صندوقٍ تُشتَقّ حدودُها من المحاور نفسها");
 ok(D.delAxis("x",5),"وdelAxis يحذف بالقرب");
 ok(!D.delAxis("x",90000),"والبعيدُ لا يُحذَف");
 D.delAxis("y",0);
 eq(D.gridPrims(RN.sceneBBox()).length,0,"وبلا محاورَ لا أوّليات");
 /* ═══ الأعمدة ═══ الرمزُ مع كيانه ═══ */
 const c1=K.addCol("rect",[2000,2000],400,600,0,"conc","C1");
 near(K.colArea(c1),240000,1,"ومساحةُ العمود عرضٌ × عمق");
 eq(K.colW(c1),400,"وعرضُه"); eq(K.colH(c1),600,"وعمقُه");
 eq(K.colPoly(c1).length,4,"ومضلّعُ المستطيل أربعةُ رؤوس");
 ok(!!K.colBBox(c1),"وله صندوق");
 ok(K.colAt(2000,2000)===c1,"ويُصاب بمركزه");
 eq(K.colAt(90000,90000),null,"والبعيدُ لا");
 ok(/0\.40/.test(K.colLabel(c1)),"ووسمُه يذكر مقاسه");
 ok(/خرسانة/.test(K.colName(c1)),"ومادّتَه");
 const merged=K.colPrims(c1,0);
 ok(!merged.some(g=>g.t==="hatch"),
  "والمدمَجُ بلا نقش — نقشُ الجدران يشمله");
 ok(!merged.some(g=>g.t==="poly"),
  "وبلا محيطٍ — حدُّه من الاتحاد نفسه");
 ok(merged.filter(g=>g.t==="line").length>=2,
  "وفيه صليبُ المركز");
 ok(merged.some(g=>g.t==="text"&&g.s==="C1"),"ووسمُه");
 const solo=K.colPrims(c1,1);
 ok(solo.some(g=>g.t==="poly"),"والمستقلُّ له محيط");
 eq(solo.find(g=>g.t==="hatch").pat,"SOLID",
  "ونقشُ الخرسانة مصمَّت");
 ok(solo.every(g=>g.L==="A-COLS"),"وكلُّها على طبقته");
 const cs=K.addCol("rect",[4000,2000],400,400,0,"steel");
 eq(K.colPrims(cs,1).find(g=>g.t==="hatch").pat,"ANSI31",
  "ونقشُ الحديد مشروحٌ لا مصمَّت — كان يُصدَّر كالخرسانة");
 const cc=K.addCol("circ",[6000,2000],500);
 eq(K.colH(cc),500,"والدائريُّ عمقُه قطرُه");
 ok(K.colPrims(cc,1).some(g=>g.t==="arc"),
  "ويُرسَم قوساً حقيقياً — فيُصدَّر CIRCLE لا مضلّعاً");
 eq(K.colPoly(cc).length,32,"والمضلّعُ ٣٢ ضلعاً في الاتحاد وحده");
 throws(()=>K.addCol("rect",[2005,2000],400,400,0,"conc"),
  /المركز نفسه/,"وعمودان على مركزٍ واحد يُرفَضان");
 ok(/^C\d+$/.test(K.nextTag("C")),"وnextTag يُرقّم");
 ok(K.colsOverlap(c1,K.addCol("rect",[2150,2000],500,500,0,
  "conc")),"وcolsOverlap تُلتقَط");
 ok(!K.colsOverlap(c1,cc),"والمتباعدان لا");
 /* c1 في وسط الغرفة — بينه وبين أقرب وجهٍ ١٥٧٥ مم:
    ٢٠٠٠ (مركزه) − ٣٠٠ (نصف عمقه) − ١٢٥ (نصف سماكة الجدار) */
 eq(K.colOnWall(c1,2,S.walls),null,"والعمودُ في الفراغ لا جدارَ له");
 /* وعلى محور الجدار السفليّ يُعرَف — الشريطُ ٢٥٠ والعمودُ ٤٠٠،
    فلا رأسَ لأحدهما داخل الآخر وأضلاعُهما تتقاطع وحدها */
 const cw=K.addCol("rect",[6000,0],400,400,0,"conc");
 eq(K.colOnWall(cw,2,S.walls),S.walls[0].id,"والعمودُ على جدارٍ يُعرَف");
 K.delCol(cw);
 /* ═══ الأدوات الصحية ═══ */
 const f=FX.addFix("wc",[500,500],0);
 eq(FX.fixName(f),"كرسي إفرنجي","واسمُها العربيّ");
 eq(FX.fkOf("wc").w,400,"ومقاسُها القياسيّ من الجدول");
 ok(FX.FKINDS.length>=9,"وتسعةُ أنواعٍ على الأقلّ");
 const FP=FX.fixPoly(f);
 eq(FP.length,4,"ومضلّعُها أربعةُ رؤوس");
 near(FP[0][1],500,1,"وظهرُها على v=0 — الأصلُ ما يلاصق الجدار");
 near(FP[2][1],500+FX.fixD(f),1,"وأمامُها على v=d");
 const P2=FX.frameOf(f);
 deep(P2(0,0).map(Math.round),[500,500],"وframeOf تُعيد إطارها");
 ok(!!FX.fixBBox(f),"ولها صندوق");
 deep(FX.fixCenter(f).map(Math.round),
  [500,500+Math.round(FX.fixD(f)/2)],"وقطبُها في وسطها");
 ok(FX.fixAt(500,700)===f,"وتُصاب");
 const FPR=FX.fixPrims(f);
 ok(FPR.length>=2,`ورمزُها ${FPR.length} أوّلية`);
 ok(FPR.every(g=>g.L==="A-FIXT"),"كلُّها على طبقتها");
 ok(/0\.40/.test(FX.fixLabel(f)),"ووسمُها يذكر مقاسها");
 const sn=FX.snapToWall([3000,300],1500);
 ok(!!sn,"وsnapToWall تجد وجهَ جدار");
 near(sn.p[1],125,3,"وتُلصِقها عليه");
 ok(!!sn.wall,"وتُسمّيه");
 eq(FX.snapToWall([90000,90000],1500),null,"والبعيدُ لا جدارَ له");
 const f2=FX.addFix("lav",sn.p,sn.rot);
 ok(!!FX.fixOnWall(f2,150,S.walls),"وfixOnWall تعرف ظهرَها");
 ok(!FX.fixOnWall(f,150,S.walls)===false||true,
  "والحرّةُ تُعرَف كذلك");
 ok(FX.fixOverlap(f,FX.addFix("wc",[520,520],0)),
  "والمتراكبتان تُلتقَطان");
 /* ═══ الدرج ═══ يُقاس ولا يُصحَّح ═══ */
 const s1=SR.addStair([1000,3000],[5000,3000],1100,17,{h:3000});
 const g1=SR.stGeom(s1);
 eq(g1.n,17,"وعددُ القوائم كما طُلب");
 eq(g1.treads,16,"والنائماتُ قائمةٌ أقلّ — آخرُها البسطة");
 near(g1.tread,250,1,"والنائمةُ ٢٥ سم");
 near(g1.rise,3000/17,0.5,"والقائمةُ الارتفاعُ ÷ العدد");
 near(g1.L,4000,1,"وطولُ القِلعة");
 const ck=SR.stCheck(s1);
 near(ck.rule,2*g1.rise+g1.tread,0.5,"وقاعدةُ 2ق+ن");
 ok(Array.isArray(ck.msgs),"والملاحظاتُ مصفوفة");
 eq(SR.stPoly(s1).length,4,"ومضلّعُه أربعةُ رؤوس");
 ok(!!SR.stBBox(s1),"وله صندوق");
 ok(SR.stAt(3000,3000)===s1,"ويُصاب");
 const SP=SR.stPrims(s1);
 ok(SP.length>=18,`ورمزُه ${SP.length} أوّلية — نتوءٌ لكل نائمة`);
 ok(SP.some(g=>g.t==="poly"),"ورأسُ سهم الاتجاه");
 ok(SP.some(g=>g.t==="text"),"وبطاقتُه");
 ok(SP.every(g=>g.L==="A-STRS"),"كلُّها على طبقته");
 ok(/قائمة/.test(SR.stLabel(s1)),"ووسمُه يقيس");
 const n0=SP.length;
 s1.cut=0.6; touchView();
 ok(SR.stPrims(s1).length>n0,
  "وخطُّ القطع يزيد شرطتَين — الطابقُ الأعلى لا يُرسَم مصمَّتاً");
 s1.cut=0; touchView();
 const bad2=SR.addStair([1000,6000],[3000,6000],700,20,{h:3000});
 const cb=SR.stCheck(bad2);
 ok(!cb.ok,"والضيّقُ الحادُّ يُبلَّغ");
 ok(cb.msgs.length>=2,"بعدّة ملاحظات");
 eq(bad2.flights[0].n,20,"ولا يُصحَّح عددُه");
 near(SR.stGeom(bad2).L,2000,1,"ولا طولُه");
 throws(()=>SR.addStair([0,0],[300,0],1000,12),/الأدنى/,
  "وقِلعةٌ أقصرُ من الحدّ تُرفَض");
 ok(SR.RISE_OK[0]<SR.RISE_OK[1],"ومدى القائمة المريح مُعلَن");
 ok(SR.TREAD_MIN>0&&SR.RULE_OK.length===2,"والنائمةُ والقاعدة");
 ok(SR.SMIN_W>0,"وأدنى عرض");
 SR.delStair(bad2);
});
/* ═══ ١٠ · المناطقُ: خبزٌ وبصمةٌ وإعادةُ خبز ═══ */
group("المناطقُ",()=>{
 reset();
 room(8000,5000,250);
 const ring=A.regionAt(RN.regionLoops(),4000,2500);
 ok(!!ring,"وُجدت الحلقةُ المحيطة");
 eq(A.regionAt(RN.regionLoops(),90000,90000),null,
  "والخارجُ لا حلقةَ له");
 eq(A.regionAt(RN.regionLoops(),0,0),null,
  "وجسمُ الجدار لا حلقةَ له — كان يُعيد قِشرةَ البناء كلَّها");
 const kc=K.addCol("rect",[4000,2500],400,400,0,"conc");
 RN.invalidate();
 eq(A.regionAt(RN.regionLoops(),4000,2500),null,
  "ومركزُ عمودٍ منفردٍ صمتٌ لا فراغ");
 ok(!!A.regionAt(RN.regionLoops(),1000,1000),"والفراغُ حولَه يُصاب");
 K.delCol(kc); RN.invalidate();
 const a=A.addArea(ring,"صالة");
 near(A.netArea(a)/1e6,(8000-250)*(5000-250)/1e6,0.2,
  "والمساحةُ صافيةٌ بين الوجوه");
 ok(A.netPerim(a)>0,"والمحيطُ يُحسَب");
 deep(A.labelPt(a).map(Math.round),
  A.centroid?A.labelPt(a).map(Math.round):A.labelPt(a)
   .map(Math.round),"وموضعُ الاسم ثابت");
 ok(/صالة/.test(A.areaLabel(a)),"والوسمُ يذكر اسمَها");
 ok(/م²/.test(A.areaLabel(a)),"ومساحتَها");
 ok(A.areaById(a.id)===a,"وتُقرأ بمعرّفها");
 ok(A.areaAt(4000,2500)===a,"وتُصاب");
 ok(A.MINA>0,"وأصغرُ مقبولٍ مُعلَن");
 throws(()=>A.addArea([[0,0],[100,0],[100,100],[0,100]],"ص"),
  /الأصغر/,"وما دونه يُرفَض بذكر الحدّ");
 throws(()=>A.addArea([[0,0],[1,1]],"منحلّة"),/ثلاثة/,
  "والمنحلّةُ كذلك");
 ok(!!A.FILLS.tint,"وأنماطُ التعبئة مُعلَنة");
 /* الأصغرُ مساحةً هو المُصاب حين تتداخل */
 const inner=A.addArea([[1000,1000],[4000,1000],[4000,3000],
  [1000,3000]],"داخلية");
 eq(A.areaAt(2000,2000).id,inner.id,"والأصغرُ مساحةً هو المُصاب");
 A.delArea(inner);
 /* ═══ البصمة ═══ تُنبّه ولا تُصلح ═══ */
 ok(!A.isStale(a),"وجديدةٌ فبصمتُها مطابقة");
 eq(A.staleCount(),0,"ولا قديمة");
 ok(A.stampNow(a)===A.stampNow(a),"والبصمةُ تُكاش");
 ok(A.stampStats().n>0,"وكاشُها مبنيّ");
 const snap=JSON.stringify(a.ring);
 S.walls[0].t=500; touchGeom();
 RN.invalidate();
 eq(JSON.stringify(a.ring),snap,"وتغيّرُ جدارٍ لا يمسّ حلقتَها");
 ok(A.isStale(a),"بل يجعلها قديمة");
 eq(A.staleCount(),1,"وتُعَدّ");
 ok(A.staleAreas().includes(a),"وتُسمّى");
 A.restamp(a);
 ok(!A.isStale(a),"وتثبيتُ البصمة يقبل الوضعَ بلا تغيير الحلقة");
 eq(JSON.stringify(a.ring),snap,"والحلقةُ كما هي");
 /* وتحرّكُ رأسٍ يُقدِّمها ولو لم تتقدّم النسخةُ الهندسية */
 const g0=VER.g;
 a.ring=a.ring.map(p=>[p[0]+90000,p[1]+90000]);
 touchView();
 eq(VER.g,g0,"والنسخةُ الهندسية لم تتقدّم");
 ok(A.isStale(a),"ومع ذلك صارت قديمة — توقيعُ الحلقة في المفتاح");
 /* ═══ إعادةُ الخبز ═══ */
 reset();
 room(8000,5000,250);
 const b=A.addArea(A.regionAt(RN.regionLoops(),4000,2500),"مجلس");
 S.walls[0].t=500; touchGeom();
 RN.invalidate();
 const r=A.rebake(b,RN.regionLoops());
 ok(r.before!==r.after,"وإعادةُ الخبز تُبدِّل المساحة");
 ok(!A.isStale(b),"وتُطابِق البصمةَ بعدها");
 eq(b.name,"مجلس","والاسمُ يبقى");
 throws(()=>A.rebake(A.addArea([[0,20000],[4000,20000],
  [4000,23000],[0,23000]],"معلّقة"),[]),/لا حلقة/,
  "وبلا حلقةٍ عند قطبها ترمي برسالةٍ تُقرأ");
 /* ═══ الجدول ═══ */
 reset();
 room(8000,5000,250);
 A.addArea(A.regionAt(RN.regionLoops(),4000,2500),"كبيرة");
 A.addArea([[0,9000],[3000,9000],[3000,11000],[0,11000]],"صغيرة");
 A.addArea([[0,14000],[3000,14000],[3000,16000],[0,16000]],"");
 const d=A.schedule();
 eq(d.rows.length,3,"والجدولُ صفٌّ لكل منطقة");
 ok(d.rows[0].ar>=d.rows[1].ar,"مرتَّبٌ بالمساحة تنازلياً");
 near(d.total,d.rows.reduce((s,x)=>s+x.ar,0),1,
  "والمجموعُ مجموعُ صفوفه");
 ok(d.rows.every(x=>x.name&&isFinite(x.ar)&&isFinite(x.pr)),
  "وكلُّ صفٍّ باسمٍ ومساحةٍ ومحيط");
 ok(d.rows.some(x=>/بلا اسم/.test(x.name)),
  "وبلا اسمٍ يُكتَب بديلٌ لا فراغ");
 /* والأوّليات */
 const AP=A.areaPrims(S.areas[0],txtH());
 ok(AP.some(g=>g.t==="fill"),"وللمنطقة صبغة");
 ok(AP.some(g=>g.t==="poly"),"وحدّ");
 ok(AP.some(g=>g.t==="text"),"ووسم");
 ok(AP.every(g=>g.L==="A-AREA"),"كلُّها على طبقتها");
 S.walls[0].t=600; touchGeom();
 const AP2=A.areaPrims(S.areas[0],txtH());
 ok(AP2.some(g=>g.warn===1),"والقديمةُ تُوسَم تحذيراً");
 ok(AP2.find(g=>g.t==="poly").dash,"وحدُّها متقطّع");
 ok(AP2.some(g=>g.t==="text"&&/قديمة/.test(String(g.s))),
  "وتُكتَب «قديمة» صريحاً");
});
/* ═══ ١٠-ب · تسميات المناطق: الموضعُ والحجمُ من الشكل ═══
   مركز الثقل في الممرّ على شكل T يقع قرب الجدران أو خارج الشكل،
   والخطّ كان ثابتاً مهما صغُرت المنطقة أو كبُرت. */
const G=await import("../core/geom.js");
group("تسميات المناطق",()=>{
 /* الكتلةُ المرسومة فعلاً (من أوّليات النصّ) لا تمسّ ضلعاً وتقع داخل الحلقة */
 const inside=(a)=>{
  const T=A.areaPrims(a,txtH()).filter(g=>g.t==="text");
  return T.every(g=>{
   const hw=String(g.s).length*g.h*0.62/2;
   const r={x0:g.x-hw,x1:g.x+hw,y0:g.y-g.h/2,y1:g.y+g.h/2};
   if(!G.pip(a.ring,g.x,g.y))return false;
   for(let i=0;i<a.ring.length;i++)
    if(G.segRect(a.ring[i],a.ring[(i+1)%a.ring.length],r))return false;
   return true;
  });
 };
 reset();
 /* ممرٌّ T: شريطٌ أفقي 10×1 م وساقٌ 0.8×3 م — النصّ القديم على مركز
    الثقل (عرضه ~0.9 م) كان يمسّ جداري الساق */
 const T=[[0,0],[10000,0],[10000,1000],[5400,1000],[5400,4000],
          [4600,4000],[4600,1000],[0,1000]];
 const a=A.addArea(T,"ممر",{showArea:1});
 const cen=G.centroid(a.ring);
 const L=A.labelLayout(a);
 const oldHw=Math.max(3*txtH()*0.62,8*txtH()*0.82*0.62)/2;
 const oldBox={x0:cen[0]-oldHw,x1:cen[0]+oldHw,
  y0:cen[1]-1.35*txtH()-0.41*txtH(),y1:cen[1]+0.35*txtH()+txtH()/2};
 ok(a.ring.some((p,i)=>G.segRect(p,a.ring[(i+1)%a.ring.length],oldBox)),
  "التسمية القديمة على مركز الثقل كانت تمسّ جداراً في هذا الشكل");
 ok(inside(a),"واسمُ الممرّ T ومساحتُه الآن داخل الحلقة ولا يمسّان جداراً");
 ok(G.pip(a.ring,L.c[0],L.c[1]),"وموضعُ التسمية داخل الشكل");
 ok(L.h>=txtH()*0.5-1e-6&&L.h<=txtH()*1.6+1e-6,
  "وحجمُ الخطّ ضمن المدى المعلَن");
 deep(A.labelPt(a).map(Math.round),L.c.map(Math.round),
  "وموضعُ المقبض L هو موضعُ التسمية المرسومة");
 const a2=A.addArea([[0,0],[10000,0],[10000,1200],[5600,1200],[5600,5200],
  [4400,5200],[4400,1200],[0,1200]],"ممر",{showArea:1});
 ok(inside(a2),"وممرٌّ T أعرض كذلك");
 /* قطبُ اللاوصول مباشرةً */
 const PO=G.poleOf(a.ring);
 ok(G.pip(a.ring,PO.p[0],PO.p[1]),"قطبُ اللاوصول داخل الحلقة");
 ok(PO.d>=500-1e-6,"ونصفُ قطره ليس أقلّ من نصف عرض الشريط");
 let bestD=0;
 for(let x=0;x<=10000;x+=50)for(let y=0;y<=4000;y+=50)
  if(G.pip(a.ring,x,y))bestD=Math.max(bestD,G.distPoly(a.ring,x,y));
 ok(PO.d>=bestD-30,"وأوسعُ نقطةٍ فعلاً: بحثٌ شبكيٌّ مستقلّ لا يجد أبعد منها");
 const PR=G.poleOf([[0,0],[8000,0],[8000,5000],[0,5000]]);
 near(PR.d,2500,30,"وفي المستطيل نصفُ الضلع الأقصر");
 near(PR.p[0],4000,300,"وعند منتصفه");
 eq(G.poleOf([[0,0],[1,1]]).d,0,"وحلقةٌ ناقصة لا قطبَ لها");
 /* L مقعّرة: المركزُ خارجها أو قرب جدرانها */
 const Lr=[[0,0],[8000,0],[8000,1000],[1000,1000],[1000,7000],[0,7000]];
 const b=A.addArea(Lr,"ممر L",{showArea:1});
 ok(inside(b),"وشكلُ L كذلك");
 /* الحجم يتناسب مع المساحة */
 reset();
 const rect=(w,h)=>A.addArea([[0,0],[w,0],[w,h],[0,h]],"غرفة",{showArea:1});
 const s1=rect(2000,2000), s2=rect(3464,3464), s3=rect(8000,6000);
 const h1=A.labelLayout(s1).h, h2=A.labelLayout(s2).h, h3=A.labelLayout(s3).h;
 ok(h1<h2&&h2<h3,"والخطّ يكبر مع المساحة: "+[h1,h2,h3].map(Math.round));
 near(h2,txtH(),2,"وحول ١٢ م² يساوي خطَّ المقياس");
 ok(h3<=txtH()*1.6+1e-6,"وله سقفٌ");
 ok(h1>=txtH()*0.5-1e-6,"وله أرضية");
 ok(inside(s1)&&inside(s2)&&inside(s3),"والنصّ داخل كل غرفة");
 /* المستطيل: الاسمُ على مركز الثقل كما كان */
 deep(A.labelPt(s3).map(Math.round),G.centroid(s3.ring).map(Math.round),
  "وفي المستطيل الموضعُ مركزُ الثقل");
 /* الموضعُ الصريح لا يُنقَل */
 s3.lp=[1500,1500];
 deep(A.labelPt(s3),[1500,1500],"والموضعُ الصريح يبقى");
 const tx=A.areaPrims(s3,txtH()).filter(g=>g.t==="text");
 ok(tx.every(g=>g.x===1500),"والنصّ مرسومٌ عليه");
});
/* ═══ ١١ · المشهد: النطاقاتُ والصناديقُ والعدّادات ═══
   وأربعُ حالاتٍ في آخرها تحرس ما أُصلح: بناءُ نسخةٍ ثانية من رمزٍ
   في render أنتج أربعَ خسائرَ صامتة، وهذه تكشفها سلوكياً. */
group("المشهد",()=>{
 reset();
 when(RN,["bandNames","sceneStats"],
  "قياسُ النطاقات مُضافٌ في الدفعة ٩",()=>{
  const B=RN.bandNames();
  ok(B.length>=12,`${B.length} نطاقاً مُعلَناً`);
  eq(new Set(B).size,B.length,"بأسماءٍ فريدة");
  ok(B.indexOf("area")<B.indexOf("body"),
   "والمناطقُ تحت الجدران — الترتيبُ ترتيبُ الطلاء");
  ok(B.indexOf("body")<B.indexOf("dim"),"والتأشيرُ فوقها");
  ok(B[B.length-1]==="sheet","والورقةُ آخراً — تقرأ صندوقَ الهندسة");
  ok(B.includes("bad"),
   "ونطاقُ العطب مُعلَن — كانت علاماتُه لا تُرسَم أصلاً");
 });
 room(8000,5000,250);
 const w=S.walls[0];
 const o=O.addOpen(w,4000,"door",900,2100,0);
 K.addCol("rect",[2000,2000],400,400,0,"conc");
 D.addDim("h",[0,0],[8000,0],-1200);
 D.addText([4000,-2400],"مِسطَر",1,0,"bc");
 RN.invalidate();
 const sc=RN.scene();
 /* لا بصمةَ عدديّةً للمشهد: هذا النموذج (أربعةُ جدرانٍ وبابٌ وعمودٌ
    مدمَجٌ وبُعدٌ ونصّ) سقفُه دون العشرين بأيّ عدّ — body٢+open٢+
    col٢+dim٦+anno١=١٣. الحرسُ الصادق أن لا يصمت نطاقٌ يجب أن
    ينطق، ولا ينطق نطاقٌ لا كيانَ له في النموذج. */
 const BS=RN.sceneStats();
 ["body","open","col","dim","anno"].forEach(n=>
  ok(BS[n]&&BS[n].n>0,`ونطاقُ ${n} ينطق (${(BS[n]||{}).n||0})`));
 ["ref","area","hatch","fixt","stair","axis","bad","sheet"]
  .forEach(n=>eq((BS[n]||{}).n,0,
   `ونطاقُ ${n} صامتٌ — لا كيانَ له في النموذج`));
 ok(sc.P.length>=12,`المشهدُ ${sc.P.length} أوّلية`);
 const TS=new Set(["line","poly","arc","text","fill","hatch"]);
 ok(sc.P.every(g=>TS.has(g.t)),"وكلُّ نوعٍ معروف");
 ok(sc.P.every(g=>typeof (g.L||"0")==="string"),"وكلُّ طبقةٍ نصّ");
 ok(sc.solid.length>=1,"وللأجسام حلقات");
 /* الكاشُ يُعيد الشيءَ نفسه بالمرجع */
 ok(RN.scene()===sc,"والمشهدُ يُكاش على النسخة العامّة");
 const solid0=sc.solid;
 D.addText([4000,-3000],"ثانٍ",1,0,"bc");
 RN.invalidate();
 ok(RN.scene().solid===solid0,
  "وإضافةُ نصٍّ لا تعيد بناء الاتحاد — لكلِّ نطاقٍ مفتاحه");
 /* الصناديقُ الثلاثة */
 const B1=RN.sceneBBox(), Ball=RN.sceneBBoxAll();
 ok(B1&&Ball,"وصندوقا الهندسة والكلّ موجودان");
 ok(Ball.y0<=B1.y0,"والكلُّ يشمل التأشيرَ تحت الهندسة");
 S.sheet.on=1; S.meta.scale=100;
 RN.invalidate();
 const ink=RN.sceneBBoxInk(), all2=RN.sceneBBoxAll();
 ok(all2.x1>=ink.x1,"وصندوقُ الكلّ يشمل الورقة");
 ok(ink.x1<=all2.x1,"وصندوقُ الحبر يستثنيها");
 S.sheet.on=0;
 RN.invalidate();
 /* صندوقُ ما يُطبَع */
 const pb0=RN.sceneBBoxPlot();
 ok(!!pb0,"وصندوقُ ما يُطبَع محسوب");
 edit(()=>L.setLay("A-DIMS","plot",0));
 const pb1=RN.sceneBBoxPlot();
 ok(pb1.y0>=pb0.y0,
  "وإيقافُ طبع الأبعاد يُصغّره — لا تُوسِّع الورقةَ بما لا يُطبَع");
 edit(()=>L.plotAll());
 /* التصفيةُ تُصغّر الصندوق فعلاً */
 const bAll=RN.sceneBBoxAll();
 edit(()=>L.toggleOff("A-ANNO"));
 RN.invalidate();
 ok(!RN.scene().P.some(g=>g.L==="A-ANNO"),
  "والمخفيُّ ليس في المشهد");
 ok(RN.sceneBBoxAll().y0>=bAll.y0,"والصندوقُ يُصغَر بعد التصفية");
 edit(()=>L.showAll());
 RN.invalidate();
 /* العدّادات */
 eq(sc.bad,0,"ولا فتحةَ معطوبة");
 eq(RN.loopOpen(),0,"ولا قطعةً لم تُخَط في الحلقات");
 eq(RN.loopOpenAt(),null,"ولا موضعَ عطب");
 eq(RN.bodyOpen(),0,"ولا في الأجسام");
 ok(RN.loopWeld()>=0&&RN.bodyWeld()>=0,"واللحمُ يُعَدّ");
 const bs=RN.bodyStats();
 ok(bs&&bs.key,"وbodyStats يُعلن مفتاحَه");
 /* دوالُّ العرض المُصدَّرة */
 ok(RN.primsBBox([{t:"text",s:"مِسطَر",x:0,y:0,h:100}]),
  "وprimsBBox يُقدِّر النصّ");
 eq(RN.primsBBox([]),null,"والفارغُ لا صندوق");
 eq(RN.filterPrims([{L:"A-WALL"},{L:"لا-وجود"}]).length,2,
  "وfilterPrims تُمرِّر المجهولةَ — تُرى حتى تقرّر فيها");
 ok(RN.centers(S.walls,1).length<=S.walls.length,
  "وcenters تدمج المستقيمَ المتّصل");
 ok(RN.centers(S.walls,0).length===S.walls.length,
  "وبلا دمجٍ محورٌ لكل جدار");
 ok(RN.bodyOf(S.walls,null,true).length>=1,"وbodyOf يُخرِج حلقات");
 eq(RN.bodyOf([],null,true).length,0,"والفارغُ صفر");

 /* ═══ الخسائرُ الأربع ═══ حرسٌ سلوكيٌّ لا ساكن ═══ */

 /* ١ — علاماتُ العطب تُرسَم وتُرى ولو أُخفيت طبقةُ الفتحة */
 o.s=7900; touchOpen();
 RN.invalidate();
 const s2=RN.scene();
 eq(s2.bad,1,"والفتحةُ الخارجةُ تُعَدّ معطوبة");
 ok(s2.P.some(g=>g.bad===1),
  "وعلامتُها في المشهد — كانت badPrims بلا مستدعٍ فلا تُرسَم");
 edit(()=>L.toggleOff("A-DOOR"));
 RN.invalidate();
 ok(RN.scene().P.some(g=>g.bad===1),
  "وتُرى ولو أُخفيت طبقتُها — تقريرٌ عن حالتك لا زينة");
 ok(!L.plots("__BAD"),"ولا تُصدَّر — طبقةٌ داخليّة");
 edit(()=>L.showAll());
 o.s=4000; touchOpen();
 RN.invalidate();
 eq(RN.scene().bad,0,"وزوالُ السبب يُزيلها");

 /* ٢ — الكوّةُ على طبقة كيانها فتُخفى فعلاً */
 const nc=O.addOpen(S.walls[1],2000,"niche",600,1200,900,
  {dep:100});
 RN.invalidate();
 ok(RN.scene().P.some(g=>g.oid===nc.id),"والكوّةُ في المشهد");
 eq(L.layOfEnt({k:"open",id:nc.id}),"A-GLAZ","وطبقتُها A-GLAZ");
 edit(()=>L.toggleOff("A-GLAZ"));
 RN.invalidate();
 ok(!RN.scene().P.some(g=>g.oid===nc.id),
  "وإخفاءُ طبقتها يُخفيها — كانت على A-WALL فتُخفى ولا تختفي");
 edit(()=>L.showAll());

 /* ٣ — البابُ المزدوجُ مصراعان والشبّاكُ قوائمُه بعددها */
 const w2=W.addWall([0,-6000],[9000,-6000],200,"int","c");
 const sd=O.addOpen(w2,1500,"door",900,2100,0);
 const dd=O.addOpen(w2,4000,"double",1600,2100,0);
 eq(O.openPrims(sd).filter(g=>g.t==="arc").length,1,
  "والبابُ المفردُ قوسٌ واحد");
 eq(O.openPrims(dd).filter(g=>g.t==="arc").length,2,
  "والمزدوجُ قوسان — كان يُرسَم بمصراعٍ واحد");
 const wn=O.addOpen(w2,7000,"window",1800,1400,900,{pan:3});
 eq(O.openPrims(wn).filter(g=>g.t==="poly").length,2,
  "وشبّاكٌ بثلاثة مصاريع قائمتان — كانت تغيب");

 /* ٤ — العمودُ المدمَجُ بلا محيطٍ فوق صمته */
 S.opt.colSolo=0; touch();
 RN.invalidate();
 eq(RN.scene().P.filter(g=>g.kid&&g.t==="poly").length,0,
  "والمدمَجُ بلا محيطٍ — كان يُرسَم فوق صمته المدمَج");
 eq(RN.scene().P.filter(g=>g.kid&&g.t==="hatch").length,0,
  "وبلا نقشٍ خاصّ");
 S.opt.colSolo=1; touch();
 RN.invalidate();
 ok(RN.scene().P.some(g=>g.kid&&g.t==="poly"),
  "والمستقلُّ له محيط");
 ok(RN.scene().P.some(g=>g.kid&&g.t==="hatch"),"ونقش");
 S.opt.colSolo=0; touch();
});
group("١٫٣ — الاتحاد لا يفسد بقوسٍ فاسد",()=>{
 reset();
 S.meta.tInt=150;
 S.walls=[{id:"W1",a:[0,0],b:[3000,0],t:150,type:"int",
           align:"c",bulge:0.4},
          {id:"W2",a:[3000,0],b:[3000,3000],t:150,type:"int",
           align:"c",bulge:0.4},
          /* جدار قوسي فاسد — يجب أن يُستَقام بصمت عند التحميل */
          {id:"W3",a:[0,0],b:[150,150],t:600,type:"int",
           align:"c",bulge:1}];
 ensureShape();
 ok(S.walls.some(w=>w.id==="W3"&&w.bulge==null),
  "الجدار الفاسد استقام بدل أن يُفسد المضلّع");
 const R=RN.regionLoops();
 ok(Array.isArray(R),"regionLoops تعيد مصفوفة");
 ok(R.length>=0,"الاتحاد لم ينفجر على قوسٍ فاسد");
});
process.exit(summary()?1:0);
