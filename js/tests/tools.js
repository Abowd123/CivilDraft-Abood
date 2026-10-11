/* ═══ اختبار الأدوات ═══
   أكبرُ كتلةٍ مكشوفةٍ في المشروع: ثمانيةُ ملفّاتٍ وأكثرُ من أربعين
   أداةً، وحرسُها بنيويٌّ في dom.js وحده. وهي تُقاد بلا DOM:
   لا ملفَّ أداةٍ يستورد ui/* ولا يلمس document.

   والعقودُ المفحوصةُ هنا لا يكشفها فحصٌ ساكن:
   · الأداةُ تبقى فعّالة حتى Esc
   · الخيارُ يُقرأ عند إنشاء العنصر لا قبله ولا بعده
   · Esc قبل التأكيد لا يترك أثراً
   · ولا شيءَ يُنشَأ بلا أمرٍ صريح

   التشغيل:  node js/tests/tools.js                                */
import {shim,toolRig,group,ok,eq,near,deep,noThrow,
        summary} from "./harness.js";
shim();

const {S,COLLS,newState,ensureShape,touchGeom,pack}=
 await import("../core/state.js");
const W =await import("../core/walls.js");
const O =await import("../core/opens.js");
const A =await import("../core/areas.js");
const D =await import("../core/dims.js");
const K =await import("../core/cols.js");
const RN=await import("../core/render.js");
const EN=await import("../core/ents.js");
const RF=await import("../core/ref.js");
const MD=await import("../core/modify.js");
const LY=await import("../core/layers.js");
/* الاستيرادُ يسجّل — والأدواتُ تُعلَن عند التحميل */
await import("../tools/draw.js");
await import("../tools/sketch.js");
await import("../tools/openings.js");
await import("../tools/parts.js");
await import("../tools/areas.js");
await import("../tools/modify.js");
await import("../tools/annotate.js");
await import("../tools/ref.js");
const R=await import("../tools/registry.js");

const rig=toolRig(R,{hit:(x,y,k)=>EN.hitTest(x,y,150,k),
 invalidate:()=>RN.invalidate()});
const reset=()=>{
 newState(); ensureShape(); RN.invalidate();
 rig.pick([]); rig.clear();
 if(R.active())R.cancel(true);
};
const room=(w,h,t)=>{
 const P=[[0,0],[w,0],[w,h],[0,h]];
 for(let i=0;i<4;i++)W.addWall(P[i],P[(i+1)%4],t||250,"ext","c");
 RN.invalidate();
};
const cnt=()=>COLLS.reduce((n,k)=>n+(S[k]||[]).length,0);
/* مولّدُ خربشةٍ ثابت — كالذي في trace.js */
const lcg=s=>()=>((s=(s*1103515245+12345)&0x7fffffff)/0x7fffffff);
function scribble(Q,amp,per,seed){
 const r=lcg(seed||7), out=[];
 for(let i=0;i<Q.length;i++){
  const a=Q[i], b=Q[(i+1)%Q.length];
  const L=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const n=Math.max(3,Math.round(L/(per||300)));
  const ux=(b[0]-a[0])/L, uy=(b[1]-a[1])/L;
  for(let k=0;k<n;k++){
   const t=k/n, e=(r()-0.5)*2*(amp||80);
   out.push([a[0]+ux*L*t-uy*e, a[1]+uy*L*t+ux*e]);
  }
 }
 out.push([Q[0][0]+(r()-0.5)*amp*3, Q[0][1]+(r()-0.5)*amp*3]);
 return out;
}
/* ═══ ١ · السجلُّ والعقودُ العامّة ═══ */
group("السجلّ",()=>{
 const L=R.toolList().filter(d=>d&&d.id);
 ok(L.length>40,`${L.length} أداةً مسجَّلة`);
 eq(new Set(L.map(d=>d.id)).size,L.length,"بمعرّفاتٍ فريدة");
 ok(!!R.findTool("جدار"),"واللقبُ العربيُّ يُحَلّ");
 ok(!!R.findTool("W"),"والمختصرُ اللاتينيُّ");
 ok(R.findTool("جدار")===R.findTool("wall"),"إلى الأداة نفسها");
 eq(R.findTool("لا-وجود"),null,"والمجهولُ null");
 ok(!R.active(),"ولا أداةَ نشطةً ابتداءً");
 const q=R.promptText();
 eq(q.p,"أداة:","والمُطالبةُ تنتظر");
 eq(q.live,"","ولا قراءةَ حيّة");
 /* الهادمُ مُعلَنٌ في تعريفه لا في قائمةٍ ثانية */
 const DL=R.destructList();
 ok(DL.length>=13,`${DL.length} أداةً هادمة مُعلَنة`);
 ["move","rotate","mirror","break","divide","trim","extend",
  "stretch","weld","match","chamfer","arearef","refalign",
  "refcal","refmove"].forEach(id=>{
  const d=R.findTool(id);
  ok(d&&R.isDestruct(d),`${id}: مُعلَنٌ هادماً`);
 });
 ["wall","rect","copy","offset","dim","text","measure","sel",
  "area","door","col","stair","sketch","array","arraypolar"]
  .forEach(id=>{
  const d=R.findTool(id);
  ok(d&&!R.isDestruct(d),`${id}: ليس هادماً — يُنشئ ولا يمسّ`);
 });
});
/* ═══ ٢ · لا شيءَ يُنشَأ بلا أمر ═══
   أربعون أداةً تُبدأ وتُلغى: لا رميٌ يفلت، ولا كيانٌ يُخلَق. */
group("كلُّ أداةٍ تُبدأ وتُلغى",()=>{
 R.toolList().filter(d=>d&&d.id).forEach(d=>{
  reset();
  const n0=cnt();
  noThrow(()=>{R.begin(d.id); R.cancel(true)},
   `${d.id}: تُبدأ وتُلغى بلا رمي`);
  eq(cnt(),n0,`${d.id}: ولا تُنشئ شيئاً بلا أمر`);
  ok(!R.active(),`${d.id}: وتُلغى فعلاً`);
 });
});
/* ═══ ٣ · الجدار: الاتّصالُ والإغلاقُ والتراجع ═══ */
group("أداةُ الجدار",()=>{
 reset(); rig.defs("wall");
 ok(R.begin("wall"),"تبدأ");
 ok(R.active(),"وتصير نشطة");
 eq(R.step().p,"نقطة البداية","وخطوتُها الأولى تُسمّى");
 eq(R.promptText().tool,"جدار","والمُطالبةُ تسمّيها");
 rig.type("0,0");
 eq(S.walls.length,0,"ونقطةٌ واحدةٌ لا تُنشئ جداراً");
 rig.type("@5,0");
 eq(S.walls.length,1,"والثانيةُ تُنشئه");
 near(W.wallLen(S.walls[0]),5000,1,"بطوله");
 eq(S.walls[0].t,150,"وسماكتِه الافتراضية");
 eq(S.walls[0].align,"c","ومحاذاتِه");
 ok(R.active(),"والأداةُ تبقى فعّالة — حتى Esc");
 /* ═══ الخيارُ يُقرأ عند الإنشاء ═══ */
 R.setOpt("wall","t","0.25");
 rig.type("@0,4");
 eq(S.walls.length,2,"وجدارٌ ثانٍ");
 eq(S.walls[1].t,250,"بالسماكة الجديدة");
 eq(S.walls[0].t,150,"والأوّلُ لم يُمَسّ — القطعةُ التالية وحدها");
 /* والإغلاق */
 rig.type("c");
 eq(S.walls.length,3,"وc يُغلِق المضلّع");
 ok(R.active(),"والأداةُ تبقى فعّالة بعد c — حتى Esc");
 eq(R.step().p,"نقطة البداية","وتبدأ سلسلةً جديدة من الخطوة الأولى");
 deep(S.walls[2].b,[0,0],"والضلعُ الأخير يعود إلى البداية");
 /* سلسلةٌ ثانية ثم Enter واحدٌ يُنهيها وتبقى الأداة */
 rig.type("10,10"); rig.type("@2,0");
 eq(S.walls.length,4,"وسلسلةٌ ثانية");
 rig.enter();
 ok(R.active(),"وEnter واحدٌ يُنهي السلسلة والأداةُ فعّالة");
 eq(R.step().p,"نقطة البداية","ويعود للبداية");
 rig.esc();
 ok(!R.active(),"وEsc يُنهي الأداة");
 eq(S.walls.length,4,"ويُبقي ما رُسم");
 /* ═══ التراجعُ خطوةً ═══ */
 reset(); rig.defs("wall");
 R.begin("wall");
 rig.type("0,0"); rig.type("@3,0"); rig.type("@0,3");
 eq(S.walls.length,2,"جدارانِ");
 ok(R.undoStep(),"وu يتراجع");
 eq(S.walls.length,1,"فيُحذَف الأخير");
 rig.esc();
 eq(S.walls.length,1,"وEsc يُبقي ما أُنشئ — لا يمحوه");
 /* ═══ وبلا اتّصالٍ لا مسارَ يُجمَع ═══ */
 reset(); rig.defs("wall");
 R.setOpt("wall","chain",0);
 R.begin("wall");
 rig.type("0,0"); rig.type("@3,0"); rig.type("@0,3");
 eq(S.walls.length,2,"وجدارانِ كذلك");
 rig.clear();
 rig.type("c");
 ok(rig.said(/ثلاث نقاط/,"er"),
  "لكن لا إغلاق — المسارُ لا يُجمَع");
 rig.esc();
 /* ═══ والسترةُ ترتفع ═══ */
 reset(); rig.defs("wall");
 R.setOpt("wall","type","low");
 R.setOpt("wall","h","1.2");
 R.begin("wall");
 rig.type("0,0"); rig.type("@4,0");
 eq(S.walls[0].type,"low","والنوعُ سترة");
 eq(S.walls[0].h,1200,"وارتفاعُها يُكتَب");
 rig.esc();
 /* ═══ والأقصرُ من الحدّ يُرفَض ═══ */
 reset(); rig.defs("wall");
 R.begin("wall");
 rig.type("0,0");
 rig.clear();
 rig.type("@0.01,0");
 ok(rig.said(/أقل/,"er"),"وما دون ٥ سم يُرفَض");
 eq(S.walls.length,0,"ولا يُنشَأ");
 rig.esc();
});
/* ═══ ٤ · المستطيل والقياس ═══ */
group("المستطيل والقياس",()=>{
 reset(); rig.defs("rect");
 R.begin("rect");
 rig.type("0,0"); rig.type("6,4");
 eq(S.walls.length,4,"والمستطيلُ أربعةُ جدران");
 ok(R.active(),"والأداةُ تُعيد نفسها — restart");
 eq(R.T.ctx.pts.length,0,"ونقاطُها تُفرَغ");
 /* المقاسُ المكتوب */
 rig.type("0,10");
 rig.ghost(1000,11000);
 rig.type("9x14");
 eq(S.walls.length,8,"و9x14 يُنشئ أربعةً أخرى");
 const B=W.wallsBBox();
 ok(B.x1-B.x0>=9000,"بعرضه");
 /* والصغيرُ يُرفَض */
 rig.clear();
 rig.type("0,30"); rig.type("@0.2,0.2");
 ok(rig.said(/أصغر/,"er"),"وما دون ٠٫٥٠ م يُرفَض");
 eq(S.walls.length,8,"ولا يُنشَأ");
 rig.esc();
 /* ═══ القياسُ لا يُنشئ شيئاً ═══ */
 reset(); rig.defs("measure");
 R.begin("measure");
 rig.type("0,0"); rig.type("@3,4");
 rig.enter();
 eq(cnt(),0,"والقياسُ لا يُنشئ شيئاً");
 ok(rig.said(/5\.000/,"ok"),"ويقول المسافة");
 ok(rig.said(/الزاوية/,"ok"),"والزاويةَ لنقطتين");
 ok(!R.active(),"وEnter ينهي");
 rig.clear();
 R.begin("measure");
 rig.type("0,0"); rig.type("@4,0"); rig.type("@0,3");
 rig.type("@-4,0");
 rig.enter();
 ok(rig.said(/المساحة/,"ok"),"والمساحةَ لأربع نقاط");
 eq(cnt(),0,"ولا يُنشئ شيئاً بعدها");
});
/* ═══ ٥-ب · الفتحات: النقر المباشر على الجدار ═══
   كان الالتقاط يمرّ على كل الأنواع بترتيب الأصغر أولاً، فيسرق العمودُ
   أو البُعدُ أو التأشيرُ القريب النقرةَ ويُرفَض الجدار الذي تحتها
   برسالة «انقر على جدار». وكانت النقرة تصل مُلتقَطةً على الشبكة
   فتبتعد أحياناً عن الجدار. */
group("الفتحات: النقر المباشر على الجدار",()=>{
 reset(); rig.defs("door");
 const w=W.addWall([0,0],[6000,0],200,"int","c");
 K.addCol("rect",[2000,0],400,400,0,"conc");   /* عمودٌ فوق الجدار */
 RN.invalidate();
 R.begin("door");
 rig.clear();
 rig.at(2000,0);
 eq(S.opens.length,1,"النقر على الجدار تحت عمودٍ يضع الباب");
 eq(S.opens[0].wall,w.id,"على الجدار نفسه");
 ok(!rig.said(/انقر على/,"er"),"ولا رسالة «انقر على جدار»");
 /* النقرة المُلتقَطة بعيدةٌ عن الجدار والخام عليه */
 rig.at(4500,900,[4500,40]);
 eq(S.opens.length,2,"والالتقاط على الشبكة لا يُبعد النقرة عن الجدار");
 eq(S.opens[1].wall,w.id,"والباب على الجدار");
 /* نقرةٌ في الفراغ تُرفَض برسالتها */
 rig.clear();
 rig.at(3000,2500,[3000,2500]);
 eq(S.opens.length,2,"ونقرةٌ في الفراغ لا تضع شيئاً");
 ok(rig.said(/لا عنصر|انقر على/,"er"),"وتُقال علّتها");
 rig.esc();
 /* التمرير: الجدارُ المُبرَز هو الذي سيُلتقَط، ورقمُه يظهر */
 reset(); rig.defs("door");
 const w5=W.addWall([0,0],[6000,0],200,"int","c");
 K.addCol("rect",[2000,0],400,400,0,"conc");
 RN.invalidate();
 R.begin("door");
 R.T.hover=[2000,0];
 rig.ghost(2000,0);
 const pv=R.preview();
 ok(pv.some(x=>x.t==="tx"&&x.s.includes(w5.id)),
  "تمريرُ المؤشّر فوق الجدار يُظهر رقمَه");
 R.T.hover=null;
 rig.esc();
});
/* ═══ ٥ · الفتحات: الموضعُ من النقرة أو من الحقل ═══ */
group("أدواتُ الفتحات",()=>{
 reset(); rig.defs("door");
 const w=W.addWall([0,0],[6000,0],200,"int","c");
 RN.invalidate();
 R.begin("door");
 rig.type(w.id);
 eq(S.opens.length,1,"وبابٌ على الجدار بمعرّفه");
 eq(S.opens[0].s,3000,"عند منتصفه — المعرّفُ وحده منتصفٌ");
 eq(S.opens[0].w,900,"بعرضه الافتراضي");
 eq(S.opens[0].kind,"door","ونوعِه");
 ok(R.active(),"والأداةُ تبقى فعّالة");
 rig.type(w.id+"@1.2");
 eq(S.opens.length,2,"وW1@1.2 موضعٌ على المسار");
 eq(S.opens[1].s,1200,"بمسافته من البداية");
 /* حقلُ «عند» يسبق النقرة */
 R.setOpt("door","at","5");
 rig.type(w.id);
 eq(S.opens[2].s,5000,"وحقلُ «عند» يسبق النقرة");
 /* والمشغولُ يُرفَض بسببه */
 R.setOpt("door","at","c");
 rig.clear();
 rig.type(w.id);
 ok(rig.said(/تتراكب/,"er"),"وc منتصفٌ — فيصطدم بما فيه");
 ok(rig.said(/المواضع الحرّة/,"er"),"ويُقال ما يُقبَل");
 eq(S.opens.length,3,"ولا تُنشَأ");
 rig.esc();
 /* «من النهاية» */
 reset(); rig.defs("door");
 const w2=W.addWall([0,0],[6000,0],200,"int","c");
 R.setOpt("door","at","1"); R.setOpt("door","from","b");
 R.begin("door"); rig.type(w2.id);
 eq(S.opens[0].s,5000,"و«من النهاية» يقيس من الطرف الآخر");
 rig.esc();
 /* الكوّةُ وعمقُها */
 reset(); rig.defs("niche");
 const w3=W.addWall([0,0],[4000,0],300,"int","c");
 R.begin("niche"); rig.type(w3.id);
 eq(S.opens[0].kind,"niche","وكوّة");
 eq(S.opens[0].dep,100,"بعمقها الافتراضي (0.10 — كان 0.12 فلا يتّسع له الجدارُ الافتراضيّ)");
 rig.esc();
 /* الكوّةُ الافتراضيةُ تتّسع للجدارِ الافتراضيّ (0.15 ⇒ الأقصى 0.11) */
 reset(); rig.defs("niche"); rig.defs("wall");
 R.begin("wall"); rig.at(0,0); rig.at(4000,0); rig.esc();
 R.begin("niche"); rig.type(S.walls[0].id);
 eq(S.opens.length,1,"كوّةٌ افتراضيةٌ على جدارٍ افتراضيّ تنجح");
 rig.esc();
 reset(); rig.defs("niche");
 const w4=W.addWall([0,0],[4000,0],150,"int","c");
 R.setOpt("niche","dep","0.5");
 R.begin("niche");
 rig.clear();
 rig.type(w4.id);
 ok(rig.said(/لا يكفيه/,"er"),
  "وعمقٌ يتجاوز جدارَه يُرفَض عند المنفذ");
 eq(S.opens.length,0,"ولا تُنشَأ");
 rig.esc();
 /* والنقرُ على غير جدارٍ يُرفَض */
 reset(); rig.defs("win");
 W.addWall([0,0],[5000,0],200,"int","c");
 R.begin("win");
 rig.clear();
 rig.type("D9");
 ok(rig.said(/نقرة|معرّفه/,"er"),"ومعرّفٌ لا وجودَ له يُرفَض");
 rig.esc();
});
/* ═══ ٦ · المناطق: الرسالةُ تقول ما يُفعَل ═══ */
group("أداةُ المنطقة",()=>{
 reset(); rig.defs("area");
 R.begin("area");
 rig.type("3,2");
 ok(rig.said(/لا حلقة مغلقة/,"er"),"وبلا حلقةٍ يُرفَض");
 ok(rig.said(/أغلق الجدران/,"er"),"ويُقال ما يُفعَل");
 eq(S.areas.length,0,"ولا تُخبَز");
 rig.esc();
 /* وبالحلقةِ تُخبَز */
 reset(); rig.defs("area");
 room(8000,5000,250);
 R.begin("area");
 rig.type("4,2.5");
 eq(S.areas.length,1,"وبالحلقةِ تُخبَز");
 ok(/منطقة 1/.test(S.areas[0].name),"والترقيمُ التلقائيّ");
 eq(S.areas[0].fill,"tint","وتعبئتُها الافتراضية");
 near(A.netArea(S.areas[0])/1e6,(8000-250)*(5000-250)/1e6,0.2,
  "والمساحةُ صافيةٌ بين الوجوه");
 ok(R.active(),"والأداةُ تبقى فعّالة");
 rig.clear();
 rig.type("4,2.5");
 ok(rig.said(/توجد/,"er"),"وثانيةٌ في موضعها تُرفَض باسمِ ما فيه");
 eq(S.areas.length,1,"ولا تُخبَز");
 rig.esc();
 /* والاسمُ الصريحُ يُطاع */
 reset(); rig.defs("area");
 room(8000,5000,250);
 R.setOpt("area","num",0);
 R.setOpt("area","name","مجلس");
 R.begin("area"); rig.type("4,2.5");
 eq(S.areas[0].name,"مجلس","والاسمُ الصريحُ بلا ترقيم");
 rig.esc();
 /* ═══ التحديثُ أمرٌ لحظيٌّ يُنفَّذ بأمرك ═══ */
 reset(); rig.defs("arearef");
 room(8000,5000,250);
 const a=A.addArea(A.regionAt(RN.regionLoops(),4000,2500),"صالة");
 rig.clear();
 R.begin("arearef");
 ok(!R.active(),"وتحديثُ المناطق أمرٌ لحظيٌّ لا خطوات");
 ok(rig.said(/لا منطقة قديمة/,"in"),"وبلا قديمةٍ لا يعمل");
 S.walls[0].t=500; touchGeom(); RN.invalidate();
 ok(A.isStale(a),"وتغيّرُ جدارٍ يُقدِّمها");
 rig.clear();
 R.begin("arearef");
 ok(!A.isStale(a),"والتحديثُ يعيد خبزها");
 ok(rig.said(/حُدّثت/,"ok"),"ويُقال العدد");
 eq(a.name,"صالة","والاسمُ يبقى");
});
/* ═══ ٧ · النقلُ والنسخ ═══ */
group("النقلُ والنسخ",()=>{
 reset(); rig.defs("move");
 const w=W.addWall([0,0],[5000,0],200,"int","c");
 O.addOpen(w,2500,"door",900,2100,0);
 RN.invalidate();
 rig.clear();
 R.begin("move");
 ok(!R.active(),"والنقلُ بلا تحديدٍ لا يبدأ");
 ok(rig.said(/حدّد/,"wr"),"ويُقال ما يُفعَل");
 rig.pick([{k:"wall",id:w.id}]);
 R.begin("move");
 ok(R.active(),"وبالتحديدِ يبدأ");
 rig.at(0,0); rig.at(1000,1000);
 deep(w.a,[1000,1000],"والنقلُ يُزيح");
 eq(O.opensOf(w.id)[0].s,2500,"والفتحةُ تبعت مجّاناً — s نسبيّ");
 ok(!R.active(),"وينهي نفسه");
 /* النسخُ يُبقي الأصل */
 reset(); rig.defs("copy");
 const w2=W.addWall([0,0],[5000,0],200,"int","c");
 O.addOpen(w2,2500,"door",900,2100,0);
 RN.invalidate();
 rig.pick([{k:"wall",id:w2.id}]);
 R.begin("copy");
 rig.at(0,0); rig.at(0,3000);
 eq(S.walls.length,2,"والنسخةُ جدارٌ ثانٍ");
 eq(S.opens.length,2,"وفتحتُه معه");
 deep(S.walls[1].a,[0,3000],"في موضعها");
 rig.at(0,6000);
 eq(S.walls.length,3,"والأداةُ تبقى فعّالة");
 deep(S.walls[2].a,[0,6000],"والنسخُ من الأصل لا من النسخة");
 rig.esc();
 /* والخيارُ يُطاع */
 reset(); rig.defs("copy");
 const w3=W.addWall([0,0],[5000,0],200,"int","c");
 O.addOpen(w3,2500,"door",900,2100,0);
 R.setOpt("copy","opens",0);
 rig.pick([{k:"wall",id:w3.id}]);
 R.begin("copy");
 rig.at(0,0); rig.at(0,3000);
 eq(S.walls.length,2,"والجدارُ يُنسَخ");
 eq(S.opens.length,1,"ولا فتحتُه");
 rig.esc();
 /* والعددُ بنقرةٍ واحدة */
 reset(); rig.defs("copy");
 const w4=W.addWall([0,0],[3000,0],200,"int","c");
 R.setOpt("copy","n",3);
 rig.pick([{k:"wall",id:w4.id}]);
 R.begin("copy");
 rig.at(0,0); rig.at(0,1000);
 eq(S.walls.length,4,"وثلاثُ نسخٍ بنقرةٍ واحدة");
 deep(S.walls[3].a,[0,3000],"متباعدةً بالإزاحة نفسها");
 rig.esc();
});
/* ═══ ٨ · الدورانُ والمرآة ═══ */
group("الدورانُ والمرآة",()=>{
 reset(); rig.defs("rotate");
 const w=W.addWall([1000,0],[5000,0],200,"int","c");
 rig.pick([{k:"wall",id:w.id}]);
 R.begin("rotate");
 rig.at(0,0); rig.type("90");
 deep(w.a.map(Math.round),[0,1000],"والدورانُ ٩٠° حول الأصل");
 deep(w.b.map(Math.round),[0,5000],"في الطرفين");
 ok(!R.active(),"وينهي نفسه");
 /* والبُعدُ الأفقيُّ يُرفَض بزاويةٍ حرّة */
 reset(); rig.defs("rotate");
 const d=D.addDim("h",[0,0],[5000,0],-800);
 rig.pick([{k:"dim",id:d.id}]);
 R.begin("rotate");
 rig.clear();
 rig.at(0,0); rig.type("37");
 ok(rig.said(/رُفض/,"wr"),"والبُعدُ الأفقيُّ يُرفَض بزاويةٍ حرّة");
 eq(D.dimValue(d),5000,"ولا يُمَسّ — لا رقمَ خاطئاً بهيئة يقين");
 /* والمرآةُ تقلب المحاذاة وجهةَ الفتح */
 reset(); rig.defs("mirror");
 const w2=W.addWall([1000,0],[5000,0],200,"int","l");
 const o=O.addOpen(w2,3000,"door",900,2100,0);
 const sw=o.swing;
 rig.pick([{k:"wall",id:w2.id}]);
 R.setOpt("mirror","keep",0);
 R.begin("mirror");
 rig.at(0,0); rig.at(0,1000);
 eq(S.walls.length,1,"وبلا إبقاءِ الأصل جدارٌ واحد");
 eq(w2.align,"r","والمحاذاةُ تُقلَب فيبقى الجسمُ على وجهه");
 ok(o.swing!==sw,"وجهةُ فتح الباب تُقلَب");
 near(w2.a[0],-1000,1,"والانعكاسُ يقع");
 /* وبإبقائه نسختان */
 reset(); rig.defs("mirror");
 const w3=W.addWall([1000,0],[5000,0],200,"int","c");
 rig.pick([{k:"wall",id:w3.id}]);
 R.begin("mirror");
 rig.at(0,0); rig.at(0,1000);
 eq(S.walls.length,2,"وبإبقاءِ الأصل نسختان");
 near(w3.a[0],1000,1,"والأصلُ لم يُمَسّ");
});
/* ═══ ٩ · جراحةُ الجدران ═══ */
group("جراحةُ الجدران",()=>{
 /* الإزاحة */
 reset(); rig.defs("offset");
 const w=W.addWall([0,0],[5000,0],200,"int","c");
 RN.invalidate();
 R.begin("offset");
 rig.type(w.id); rig.at(2500,1000);
 eq(S.walls.length,2,"والإزاحةُ تُنشئ موازياً");
 near(S.walls[1].a[1],1000,1,"بالمسافة المطلوبة");
 ok(rig.said(/لم تُلحَم/,"ok"),
  "ويُقال أن الأطرافَ لم تُلحَم — لا لحمَ يقع بلا أمر");
 rig.at(2500,3000);
 eq(S.walls.length,3,"والسلسلةُ تتوالى");
 near(S.walls[2].a[1],2000,1,"من الجديد لا من الأصل");
 rig.esc();
 /* والصافيةُ بين الوجهَين */
 reset(); rig.defs("offset");
 const w2=W.addWall([0,0],[5000,0],200,"int","c");
 R.setOpt("offset","clear",1);
 R.begin("offset");
 rig.type(w2.id); rig.at(2500,1000);
 near(S.walls[1].a[1],1200,1,"والصافيةُ تُضيف نصفَي السماكتين");
 rig.esc();
 /* القطع */
 reset(); rig.defs("break");
 const w3=W.addWall([0,0],[8000,0],200,"int","c");
 O.addOpen(w3,1000,"door",800,2100,0);
 O.addOpen(w3,4000,"window",1000,1400,900);
 O.addOpen(w3,7000,"door",800,2100,0);
 RN.invalidate();
 rig.clear();
 R.begin("break");
 rig.type(w3.id); rig.at(4000,0);
 eq(S.walls.length,2,"والقطعُ يُنشئ جداراً ثانياً");
 ok(rig.said(/حُذفت/,"wr"),"والفتحةُ العابرةُ تُحذَف ويُقال");
 eq(S.opens.length,2,"فتبقى اثنتان");
 ok(R.active(),"والأداةُ تُعيد نفسها");
 rig.clear();
 rig.type(w3.id); rig.at(10,0);
 ok(rig.said(/تبعد/,"er"),"والقطعُ قربَ الطرف يُرفَض بذكر الحدّ");
 rig.esc();
 /* القسمة */
 reset(); rig.defs("divide");
 const w4=W.addWall([0,0],[9000,0],200,"int","c");
 RN.invalidate();
 R.setOpt("divide","n",3);
 R.begin("divide");
 rig.type(w4.id);
 eq(S.walls.length,3,"والقسمةُ ثلاثةُ أجزاء");
 S.walls.forEach(x=>near(W.wallLen(x),3000,2,"متساوية"));
 rig.clear();
 const sh=W.addWall([0,5000],[1000,5000],200,"int","c");
 RN.invalidate();
 R.setOpt("divide","n",40);
 rig.type(sh.id);
 ok(rig.said(/الأدنى/,"er"),
  "وما دون الحدّ يُرفَض ويُقال أقصى ما يُقبَل");
 eq(S.walls.length,4,"ولا يُقسَم");
 rig.esc();
 /* القصّ بين حدَّين */
 reset(); rig.defs("trim");
 const a=W.addWall([0,0],[9000,0],200,"int","c");
 const b=W.addWall([3000,-2000],[3000,2000],200,"int","c");
 const c=W.addWall([6000,-2000],[6000,2000],200,"int","c");
 RN.invalidate();
 rig.clear();
 R.begin("trim");
 rig.type(b.id); rig.type(c.id);
 ok(rig.said(/حدّ قصّ/,"in"),"والحدودُ تُعَدّ وتُسمّى");
 rig.enter();
 rig.at(4500,0);
 eq(S.walls.length,4,"والقصُّ بين حدَّين يُنشئ جداراً");
 near(W.wallLen(a),3000,2,"والأصلُ يقصر إلى الحدّ الأول");
 ok(rig.said(/قُصّ/,"ok"),"ويُقال ما وقع");
 rig.esc();
 /* التمديد */
 reset(); rig.defs("extend");
 const e1=W.addWall([0,0],[3000,0],200,"int","c");
 const e2=W.addWall([6000,-2000],[6000,2000],200,"int","c");
 RN.invalidate();
 rig.clear();
 R.begin("extend");
 rig.type(e2.id);
 rig.enter();
 rig.at(2900,0);
 near(e1.b[0],6000,2,"والتمديدُ يبلغ الحدّ لا يتجاوزه");
 ok(rig.said(/مُدّد/,"ok"),"ويُقال");
 rig.esc();
 /* الشدُّ لا يمسّ الفتحات */
 reset(); rig.defs("stretch");
 const s1=W.addWall([0,0],[5000,0],200,"int","c");
 O.addOpen(s1,4500,"door",800,2100,0);
 RN.invalidate();
 rig.clear();
 R.begin("stretch");
 rig.at(4000,-500); rig.at(6000,500);
 ok(rig.said(/متأثّر/,"in"),"والإطارُ يُعلن ما يشمله");
 rig.at(5000,0); rig.at(3000,0);
 near(W.wallLen(s1),3000,2,"والشدُّ يُقصّر");
 eq(O.opensOf(s1.id)[0].s,4500,"والفتحةُ لم تُزحَف");
 eq(O.openState(O.opensOf(s1.id)[0]),"over",
  "بل تُبلَّغ معطوبة — تقريرٌ لا إصلاح");
});
/* ═══ ١٠ · اللحمُ والمطابقةُ والتحديد ═══ */
group("اللحمُ والمطابقةُ والتحديد",()=>{
 /* اللحمُ يُخطِّط ثم ينتظر تأكيدك */
 reset(); rig.defs("weld");
 W.addWall([0,0],[3000,0],200,"int","c");
 W.addWall([3040,0],[3040,3000],200,"int","c");
 RN.invalidate();
 rig.pick(S.walls.map(x=>({k:"wall",id:x.id})));
 R.setOpt("weld","tol","0.05");
 const before=JSON.stringify(S.walls);
 rig.clear();
 R.begin("weld");
 ok(R.active(),"واللحمُ يبدأ بخطّة");
 ok(rig.said(/سيتحرّك/,"wr"),"ويُعلن ما سيتحرّك بالمليمتر");
 eq(JSON.stringify(S.walls),before,
  "والتخطيطُ وحده لا يحرّك شيئاً");
 rig.esc();
 eq(JSON.stringify(S.walls),before,"وEsc لا يترك أثراً");
 rig.clear();
 R.begin("weld");
 rig.enter();
 ok(rig.said(/لُحم/,"ok"),"وEnter ينفّذ الخطّة");
 ok(JSON.stringify(S.walls)!==before,"والأطرافُ تتحرّك");
 eq(W.looseEnds(2).length,2,
  "ويبقى الطرفانِ الآخران — لا لحمَ لما لم يُخطَّط له");
 /* المطابقة */
 reset(); rig.defs("match");
 const src=W.addWall([0,0],[5000,0],400,"ext","l");
 const dst=W.addWall([0,3000],[5000,3000],150,"int","c");
 RN.invalidate();
 rig.clear();
 R.begin("match");
 rig.type(src.id);
 ok(rig.said(/المصدر/,"in"),"والمطابقةُ تُعلن حقولَ المصدر");
 rig.type(dst.id);
 eq(dst.t,400,"والسماكةُ تُنسَخ");
 eq(dst.type,"ext","والنوع");
 eq(dst.align,"l","والمحاذاة");
 ok(R.active(),"والأداةُ تبقى فعّالة");
 const d1=D.addDim("h",[0,0],[5000,0],-800);
 rig.clear();
 rig.type(d1.id);
 ok(rig.said(/انقر/,"er"),"ونوعٌ آخرُ يُرفَض بذكر المطلوب");
 rig.esc();
 /* والنصُّ البديلُ لا يُنسَخ افتراضاً */
 reset(); rig.defs("match");
 const a1=D.addDim("h",[0,0],[5000,0],-800);
 a1.txt="≈5";
 const a2=D.addDim("h",[0,3000],[6000,3000],-800);
 RN.invalidate();
 R.begin("match");
 rig.type(a1.id); rig.type(a2.id);
 eq(a2.txt,undefined,
  "والنصُّ البديلُ لا يُنسَخ — رقمٌ يدويٌّ على بُعدٍ آخر يكذب");
 rig.esc();
 /* التحديدُ بالمعرّف */
 reset(); rig.defs("sel");
 const w1=W.addWall([0,0],[5000,0],200,"int","c");
 const w2=W.addWall([0,3000],[5000,3000],200,"int","c");
 RN.invalidate();
 rig.clear();
 R.begin("sel");
 rig.type(w1.id);
 eq(rig.sel.length,1,"والمعرّفُ يُحدِّد");
 rig.type(w2.id);
 eq(rig.sel.length,2,"ويُضاف");
 rig.type("-"+w1.id);
 eq(rig.sel.length,1,"و«-» يُزيل");
 eq(rig.sel[0].id,w2.id,"ويبقى الآخر");
 rig.type("الكل");
 eq(rig.sel.length,2,"و«الكل» يحدّد المرئيّ");
 rig.clear();
 rig.type("W999");
 ok(rig.said(/لا عنصر/,"er"),"والمجهولُ يُرفَض");
 rig.enter();
 ok(!R.active(),"وEnter ينهي");
});
/* ═══ ١١ · أدواتُ التأشير ═══ */
group("أدواتُ التأشير",()=>{
 reset(); rig.defs("dim");
 R.begin("dim");
 rig.at(0,0); rig.at(5000,0); rig.at(0,-1200);
 eq(S.dims.length,1,"والبُعدُ ثلاثُ نقراتٍ صريحة");
 eq(D.dimValue(S.dims[0]),5000,"ومقاسُه من نقطتيه");
 eq(S.dims[0].pos,-1200,"وموضعُ خطّه من الثالثة");
 ok(rig.said(/5\.00/,"ok"),"ويُقال المقاس");
 ok(R.active(),"والأداةُ تُعيد نفسها");
 rig.esc();
 /* والبديلُ يُعلَن */
 reset(); rig.defs("dim");
 R.setOpt("dim","txt","≈5");
 R.begin("dim");
 rig.at(0,0); rig.at(5000,0); rig.at(0,-1200);
 eq(S.dims[0].txt,"≈5","والبديلُ يُكتَب");
 ok(rig.said(/نصّ بديل/,"ok"),"ويُقال أنه بديل");
 rig.esc();
 /* والمتطابقتان تُرفَضان */
 reset(); rig.defs("dim");
 R.begin("dim");
 rig.at(0,0); rig.at(0,4000);
 rig.clear();
 rig.at(0,-1200);
 ok(rig.said(/متطابقتان/,"er"),
  "وبُعدٌ أفقيٌّ بين نقطتين على رأسٍ واحد يُرفَض");
 eq(S.dims.length,0,"ولا يُنشَأ");
 rig.esc();
 /* السلسلةُ قيَمٌ مكتوبة */
 reset(); rig.defs("chain");
 rig.clear();
 R.begin("chain");
 /* كانت تُرفَض فلا يظهر حقلُ «القيَم» أصلاً (طريقٌ مسدود) — الآن تبدأ وتدلّ */
 ok(R.active(),"والسلسلةُ بلا قيَمٍ تبدأ ليظهر حقلُها");
 ok(rig.said(/حقل «القيَم»/,"wr"),"وتقول أين تُكتب");
 rig.at(0,0);
 ok(rig.said(/لا قيَم/,"er"),"والنقرةُ قبل القيَم تُرفَض بالسبب");
 eq(S.chains.length,0,"ولا يُنشأ شيء");
 rig.esc();
 R.setOpt("chain","vals","3 2.5 4");
 rig.clear();
 R.begin("chain");
 ok(R.active(),"وبالقيَمِ تبدأ");
 ok(rig.said(/3 قيمة/,"in"),"وتُعلن عددَها ومجموعها");
 rig.at(0,0); rig.at(0,-1500);
 eq(S.chains.length,1,"وتُنشَأ بنقرتين");
 deep(D.chainVals(S.chains[0]),[3000,2500,4000],"بقيَمها");
 eq(D.chainSum(S.chains[0]),9500,"ومجموعها");
 rig.esc();
 reset(); rig.defs("chain");
 R.setOpt("chain","vals","سلام");
 rig.clear();
 R.begin("chain");
 ok(R.active(),"وقيمةٌ لا تُفهَم: تبدأ ليُصحَّح حقلُها");
 ok(rig.said(/ليست قيمة/,"wr"),"وتُسمّى");
 rig.at(0,0); eq(S.chains.length,0,"والنقرةُ لا تُنشئ شيئاً"); rig.esc();
 /* النصّ */
 reset(); rig.defs("text");
 R.setOpt("text","s","مِسطَر");
 R.begin("text");
 rig.at(1000,1000);
 eq(S.anno.length,1,"والنصُّ نقرةٌ واحدة");
 eq(S.anno[0].s,"مِسطَر","بنصّه");
 rig.at(2000,2000);
 eq(S.anno.length,2,"والأداةُ تبقى فعّالة");
 rig.enter();
 ok(!R.active(),"وEnter ينهي");
 reset(); rig.defs("text");
 R.begin("text");
 rig.clear();
 rig.at(0,0);
 ok(rig.said(/فارغ/,"er"),"ونصٌّ فارغٌ يُرفَض");
 eq(S.anno.length,0,"ولا يُنشَأ");
 rig.esc();
 /* القائدُ يُنشَأ عند الإنهاء */
 reset(); rig.defs("lead");
 R.setOpt("lead","s","قائد");
 R.begin("lead");
 rig.at(1000,1000); rig.at(2000,1600);
 eq(S.anno.length,0,"والقائدُ لا يُنشَأ قبل الإنهاء");
 rig.enter();
 eq(S.anno.length,1,"وEnter يُنشئه");
 eq(S.anno[0].kind,"lead","بنوعه");
 eq(S.anno[0].pts.length,2,"وبنقاطه");
 /* المنسوب */
 reset(); rig.defs("level");
 R.setOpt("level","z","-1.5");
 R.setOpt("level","pre","ت.م");
 R.begin("level");
 rig.at(0,0);
 eq(S.anno[0].z,-1500,"والمنسوبُ السالبُ يُقرأ");
 eq(D.levelStr(S.anno[0]),"ت.م −1.500","ويُعرَض بسابقته");
 rig.esc();
 /* المحور */
 reset(); rig.defs("axis");
 R.begin("axis");
 rig.at(3000,9000);
 eq(S.grid.xs.length,1,"والمحورُ الرأسيُّ يُضاف");
 eq(S.grid.xs[0],3000,"بإحداثيّه — لا بموضع النقرة كاملاً");
 R.setOpt("axis","dir","y");
 rig.at(9000,4000);
 eq(S.grid.ys.length,1,"والأفقيُّ كذلك");
 eq(S.grid.ys[0],4000,"بإحداثيّه");
 rig.clear();
 rig.at(9000,4010);
 ok(rig.said(/يوجد محور/,"er"),"ومحورٌ على إحداثيّه يُرفَض");
 rig.esc();
});
/* ═══ ١٢ · أدواتُ الأجزاء ═══ */
group("أدواتُ الأجزاء",()=>{
 reset(); rig.defs("col");
 R.begin("col");
 rig.at(1000,1000);
 eq(S.cols.length,1,"والعمودُ نقرةٌ واحدة");
 eq(S.cols[0].kind,"rect","بشكله الافتراضي");
 eq(S.cols[0].w,300,"ومقاسه");
 ok(/^C\d+$/.test(S.cols[0].tag||""),"ووسمُه المرقَّم");
 ok(rig.said(/منفرد/,"ok"),"ويُقال أنه منفرد");
 rig.at(3000,1000);
 eq(S.cols.length,2,"والأداةُ تبقى فعّالة");
 ok(S.cols[1].tag!==S.cols[0].tag,"والوسمُ يتقدّم");
 rig.clear();
 rig.at(1010,1000);
 ok(rig.said(/المركز نفسه/,"er"),"وعمودٌ على مركزٍ يُرفَض");
 rig.esc();
 reset(); rig.defs("col");
 R.setOpt("col","kind","circ");
 R.setOpt("col","w","0.5");
 R.begin("col"); rig.at(0,0);
 eq(S.cols[0].h,500,"والدائريُّ عمقُه قطرُه");
 eq(S.cols[0].rot,0,"ولا دورانَ له");
 rig.esc();
 /* أعمدةُ المحاور أمرٌ لحظيّ */
 reset(); rig.defs("gridcols");
 rig.clear();
 R.begin("gridcols");
 ok(!R.active(),"وأعمدةُ المحاور أمرٌ لحظيّ");
 ok(rig.said(/تحتاج محوراً/,"wr"),"وبلا محاورَ لا تعمل");
 D.addAxis("x",0); D.addAxis("x",5000);
 D.addAxis("y",0); D.addAxis("y",4000);
 rig.clear();
 R.begin("gridcols");
 eq(S.cols.length,4,"وبأربعةِ محاورَ أربعةُ أعمدة");
 ok(rig.said(/تقاطعاً/,"ok"),"ويُقال العدد");
 const top=S.cols.find(c=>c.x===5000&&c.y===4000);
 eq(top.tag,"C1","والترقيمُ من أعلى اليمين — قراءةً عربية");
 rig.clear();
 R.begin("gridcols");
 ok(rig.said(/تُخطّي/,"in"),"وإعادتُها تتخطّى ما عليه عمود");
 eq(S.cols.length,4,"ولا تُكرِّر ولا تُزيح");
 /* الأداةُ الصحية والإلصاق */
 reset(); rig.defs("wc");
 W.addWall([0,1000],[6000,1000],200,"int","c");
 RN.invalidate();
 R.begin("wc");
 rig.at(3000,1300);
 eq(S.fixt.length,1,"والأداةُ نقرةٌ واحدة");
 eq(S.fixt[0].kind,"wc","بنوعها");
 near(S.fixt[0].y,1100,3,"ومُلصَقةً على وجه الجدار");
 ok(rig.said(/مُلصَقة/,"ok"),"ويُقال");
 rig.esc();
 reset(); rig.defs("wc");
 W.addWall([0,1000],[6000,1000],200,"int","c");
 R.setOpt("wc","snap",0);
 R.begin("wc"); rig.at(3000,1300);
 eq(S.fixt[0].y,1300,"وبلا إلصاقٍ تبقى حيث نُقِرت");
 ok(rig.said(/حرّة/,"ok"),"ويُقال");
 rig.esc();
 /* الدرجُ يُقاس ولا يُصحَّح */
 reset(); rig.defs("stair");
 R.setOpt("stair","n",17);
 R.begin("stair");
 rig.at(0,0); rig.at(4000,0);
 eq(S.stairs.length,1,"والدرجُ نقرتان");
 eq(S.stairs[0].flights[0].n,17,"بعددِ قوائمه");
 ok(rig.said(/قائمة/,"ok"),"ويُقاس فيُقال");
 ok(R.active(),"والأداةُ تُعيد نفسها");
 rig.clear();
 R.setOpt("stair","n",30);
 R.setOpt("stair","w","0.7");
 rig.at(0,6000); rig.at(2000,6000);
 ok(rig.said(/العرض|القائمة|النائمة/,"wr"),
  "والخارجُ عن المدى المريح يُبلَّغ");
 eq(S.stairs.length,2,"ولا يُصحَّح — يُنشَأ كما رُسم");
 eq(S.stairs[1].flights[0].n,30,"بعددِه");
 rig.esc();
});
/* ═══ ١٣ · الخربشةُ: اقتراحٌ ثم أمر ═══ */
group("أداةُ الخربشة",()=>{
 const RECT=[[0,0],[6000,0],[6000,4000],[0,4000]];
 reset(); rig.defs("sketch");
 R.begin("sketch");
 ok(R.active(),"تبدأ");
 ok(R.step().freehand,"وخطوتُها الأولى ضربةٌ حرّة");
 ok(rig.stroke(scribble(RECT,80,300,11)),"والضربةُ تُقبَل");
 eq(S.walls.length,0,"ولا شيءَ يُنشَأ منها — اقتراحٌ لا أمر");
 rig.enter();
 ok(R.active(),"وEnter ينقل إلى التأكيد لا إلى الإنشاء");
 ok(R.step().confirm,"والخطوةُ تنتظر تأكيداً");
 eq(S.walls.length,0,"ولا جدارَ بعد");
 ok(rig.said(/الخطّة/,"wr"),"والخطّةُ تُعرَض");
 ok(rig.said(/دوران الشبكة/,"wr"),"بدورانِ شبكتها");
 ok(rig.said(/الأركان/,"in"),"وكيف تُحَلّ أركانُها");
 /* وEsc قبل التأكيد لا يترك أثراً */
 const b4=JSON.stringify(pack());
 rig.esc();
 eq(JSON.stringify(pack()),b4,"وEsc قبل التأكيد لا يترك أثراً");
 eq(S.walls.length,0,"ولا جدار");
 /* والتأكيدُ يُنشئ */
 reset(); rig.defs("sketch");
 R.setOpt("sketch","t","0.2");
 R.begin("sketch");
 rig.stroke(scribble(RECT,80,300,11));
 rig.enter();
 rig.clear();
 rig.enter();
 eq(S.walls.length,4,"والتأكيدُ يُنشئ أربعةَ جدران");
 eq(S.walls[0].t,200,"بسماكتها المطلوبة");
 ok(rig.said(/أُنشئ 4 جدار/,"ok"),"ويُقال العدد");
 ok(!R.active(),"وتنهي نفسها");
 RN.invalidate();
 eq(RN.scene().solid.length,2,"وتصنع غرفةً مغلقة: حلقتان");
 eq(W.looseEnds(2).length,0,"ولا طرفَ حرّاً — الأركانُ محلولة");
 /* والمعايرةُ تُصيِّر المقاس */
 reset(); rig.defs("sketch");
 R.setOpt("sketch","cal","12");
 R.begin("sketch");
 rig.stroke(scribble(RECT,80,300,11));
 rig.enter(); rig.enter();
 const B=W.wallsBBox();
 near(B.x1-B.x0,12000,300,"والمعايرةُ تُصيِّر أطولَ ضلعٍ ١٢ م");
 /* والضجيجُ لا يصير جداراً */
 reset(); rig.defs("sketch");
 R.begin("sketch");
 rig.stroke([[9000,1000],[9150,1200],[9000,1400],[9160,1600]]);
 rig.enter();
 rig.clear();
 rig.enter();
 ok(rig.said(/لا مسار/,"er"),"وخربشةٌ صغيرةٌ لا تُنتِج مساراً");
 eq(S.walls.length,0,"ولا جدار");
 rig.esc();
 /* وU يمسح آخر ضربة */
 reset(); rig.defs("sketch");
 R.begin("sketch");
 rig.stroke(scribble(RECT,80,300,11));
 rig.stroke([[0,9000],[6000,9000]]);
 rig.clear();
 rig.type("u");
 ok(rig.said(/بقيت 1 ضربة/,"in"),"وU يمسح آخر ضربة");
 rig.esc();
});
/* ═══ ١٤ · أدواتُ المرجع ═══ */
group("أدواتُ المرجع",()=>{
 const mk=()=>{
  const E=[];
  for(let i=0;i<20;i++)
   E.push({t:"l",a:[i*100,0],b:[i*100,1000],sl:"0"});
  return {ents:E,src:{"0":20},units:{name:"مليمتر",f:1}};
 };
 reset(); rig.defs("refcal");
 rig.clear();
 R.begin("refcal");
 ok(!R.active(),"وبلا مرجعٍ لا تبدأ");
 ok(rig.said(/لا مرجع/,"wr"),"ويُقال ما يُفعَل");
 RF.setRef(mk(),"t.dxf");
 rig.clear();
 R.setOpt("refcal","d","2");
 R.begin("refcal");
 ok(R.active(),"وبالمرجعِ تبدأ");
 rig.at(0,0); rig.at(1000,0);
 near(RF.refTr().k,2,1e-6,"ومسافةٌ ١٠٠٠ تُعايَر ٢ م فالمعاملُ ٢");
 ok(rig.said(/عُوير/,"ok"),"ويُقال");
 deep(RF.visEnts()[0].a,[0,0],
  "والإحداثياتُ المستوردة لم تُمَسّ — التحويلُ مخزَّن");
 /* النقل */
 rig.clear();
 R.begin("refmove");
 rig.at(0,0); rig.at(500,700);
 deep([RF.refTr().dx,RF.refTr().dy],[500,700],"والنقلُ يُزيح");
 /* المحاذاة */
 RF.resetRef();
 rig.clear();
 R.begin("refalign");
 rig.at(0,0); rig.at(1000,0); rig.at(5000,5000); rig.at(5000,7000);
 near(RF.refTr().k,2,1e-6,"والمحاذاةُ تحسب المقياس");
 near(RF.refTr().rot,90,0.01,"والدوران");
 ok(rig.said(/مقياس/,"ok"),"ويُقال");
 /* ورسمُك لا يتأثّر */
 const w=W.addWall([0,0],[5000,0],200,"int","c");
 RF.resetRef();
 rig.clear();
 R.begin("refcal");
 rig.at(0,0); rig.at(1000,0);
 eq(S.walls.length,1,"ورسمُك لا يتأثّر بمعايرة المرجع");
 near(W.wallLen(w),5000,1,"ولا أطوالُه");
});
/* ═══ ١٥ · الخيارُ من سطر الإدخال ═══ */
group("الخيارُ من سطر الإدخال",()=>{
 reset(); rig.defs("wall");
 R.begin("wall");
 rig.clear();
 rig.type("t=0.3");
 ok(rig.said(/السماكة/,"in"),"وk=v يضبط الخيار ويُقال");
 eq(R.ov("wall","t"),"0.3","ويُكتَب");
 rig.at(0,0); rig.at(4000,0);
 eq(S.walls[0].t,300,"ويُقرأ عند الإنشاء");
 rig.clear();
 rig.type("type=مجهول");
 ok(rig.said(/ليس من/,"er"),"والقيمةُ الخارجةُ عن القائمة تُرفَض");
 eq(R.ov("wall","type"),"int","ولا تُكتَب");
 rig.clear();
 rig.type("t=سلام");
 ok(rig.said(/ليس طولاً/,"er"),"وما ليس طولاً يُرفَض");
 eq(R.ov("wall","t"),"0.3","ولا يُكتَب");
 rig.type("chain=0");
 eq(R.ov("wall","chain"),0,"والمفتاحُ يُقرأ منطقياً");
 rig.esc();
 /* واسمُ أداةٍ وسط أداةٍ تبديلٌ لا رفض */
 reset(); rig.defs("wall");
 R.begin("wall");
 rig.at(0,0);
 rig.type("مستطيل");
 eq(R.T.def.id,"rect","واسمُ أداةٍ وسط أداةٍ يُبدِّلها");
 eq(S.walls.length,0,"وما لم يكتمل لا يُنشَأ");
 rig.esc();
 reset(); rig.defs("wall");
 R.begin("wall");
 rig.clear();
 rig.type("سلام عليكم");
 ok(rig.said(/ليست إحداثياً/,"er"),"وما لا يُفهَم يُرفَض بوضوح");
 rig.esc();
 /* وقفلُ الزاوية مساعدةُ إدخالٍ تزول بوقوع النقطة */
 reset(); rig.defs("wall");
 R.begin("wall");
 rig.at(0,0);
 rig.clear();
 rig.type("<90");
 ok(rig.said(/زاوية مقفلة/,"in"),"و<90 يقفل الزاوية");
 eq(R.T.lock,90,"وتُخزَّن");
 rig.type("5");
 near(S.walls[0].b[1],5000,1,"والطولُ يتبعها");
 near(S.walls[0].b[0],0,1,"لا اتجاهَ المؤشّر");
 eq(R.T.lock,null,"والقفلُ يزول بوقوع النقطة");
 rig.esc();
});
/* ═══ ١٦ · كسرُ الركن ═══ */
group("كسرُ الركن",()=>{
 reset(); rig.defs("chamfer");
 const a=W.addWall([0,0],[5000,0],200,"int","c");
 const b=W.addWall([5000,0],[5000,4000],200,"int","c");
 RN.invalidate();
 R.setOpt("chamfer","d","1");
 rig.clear();
 /* الحسابُ مُصدَّرٌ فيُسأل قبل الأداة */
 const pl=MD.chamferPlan(a.id,b.id,1000,1000,[2500,0],[5000,2000]);
 near(pl.len,Math.hypot(1000,1000),2,"وطولُ الوتر في الخطّة");
 eq(pl.ang,90,"وزاويةُ الركن ٩٠°");
 eq(pl.a.end,"b","والأوّلُ يتحرّك طرفُه الأخير");
 eq(pl.b.end,"a","والثاني بدايتُه");
 eq(S.walls.length,2,"والتخطيطُ وحده لا يُنشئ شيئاً");
 near(W.wallLen(a),5000,1,"ولا يُقصِّر");
 /* والأداةُ تعرض ثم تنتظر */
 R.begin("chamfer");
 rig.type(a.id); rig.type(b.id);
 ok(R.active(),"والأداةُ تنتظر التأكيد");
 ok(rig.said(/الخطّة/,"wr"),"وتُعرَض الخطّة");
 eq(S.walls.length,2,"ولا شيءَ يُنشَأ قبل Enter");
 const b4=JSON.stringify(pack());
 rig.esc();
 eq(JSON.stringify(pack()),b4,"وEsc لا يترك أثراً");
 rig.clear();
 R.begin("chamfer");
 rig.type(a.id); rig.type(b.id);
 rig.enter();
 eq(S.walls.length,3,"وEnter يُنشئ ضلعَ الكسر");
 near(W.wallLen(a),4000,2,"والأوّلُ يقصر بالمسافة");
 near(W.wallLen(b),3000,2,"والثاني كذلك");
 near(W.wallLen(S.walls[2]),Math.hypot(1000,1000),3,"وطولُ الضلع");
 eq(W.looseEnds(2).length,2,
  "والركنُ مُغلَقٌ — طرفانِ حرّان لا أربعة");
 ok(!R.active(),"وتنهي نفسها");
 /* ═══ والحسابُ مُصدَّرٌ يُسأل مباشرةً ═══ */
 reset();
 const da=W.addWall([0,0],[5000,0],200,"int","c");
 const db=W.addWall([5000,0],[5000,4000],200,"int","c");
 RN.invalidate();
 const dpl=MD.chamferPlan(da.id,db.id,1000,1000,[2500,0],[5000,2000]);
 const dr=MD.chamferApply(dpl);
 near(dr.len,Math.hypot(1000,1000),2,"وchamferApply يبني بطول الخطّة");
 eq(S.walls.length,3,"فثلاثةُ جدران");
 near(W.wallLen(da),4000,2,"والأوّلُ يقصر مباشرةً بلا أداة");
 /* ═══ والرفضُ يُذكَر بسببه ═══ */
 reset(); rig.defs("chamfer");
 const c1=W.addWall([0,0],[1000,0],200,"int","c");
 const c2=W.addWall([1000,0],[1000,1000],200,"int","c");
 RN.invalidate();
 R.setOpt("chamfer","d","2");
 rig.clear();
 R.begin("chamfer");
 rig.type(c1.id); rig.type(c2.id);
 ok(rig.said(/يبقى منه/,"er"),"ومسافةٌ تفوق الجدار تُرفَض");
 ok(rig.said(/الأدنى/,"er"),"ويُذكَر الحدّ");
 eq(S.walls.length,2,"ولا يُنشَأ شيء");
 near(W.wallLen(c1),1000,1,"ولا يُقصَّر");
 rig.esc();
 /* والمتوازيان لا ركنَ بينهما */
 reset(); rig.defs("chamfer");
 const p1=W.addWall([0,0],[5000,0],200,"int","c");
 const p2=W.addWall([0,2000],[5000,2000],200,"int","c");
 RN.invalidate();
 rig.clear();
 R.begin("chamfer");
 rig.type(p1.id); rig.type(p2.id);
 ok(rig.said(/متوازيان/,"er"),"والمتوازيان يُرفَضان");
 eq(S.walls.length,2,"ولا يُنشَأ شيء");
 rig.clear();
 rig.type(p1.id);
 ok(rig.said(/واحد/,"er"),"والجدارُ نفسُه مرّتين يُرفَض");
 rig.esc();
 /* والفتحةُ في المقطوع تُحذَف ويُقال */
 reset(); rig.defs("chamfer");
 const e1=W.addWall([0,0],[5000,0],200,"int","c");
 const e2=W.addWall([5000,0],[5000,4000],200,"int","c");
 O.addOpen(e1,4600,"door",700,2100,0);
 RN.invalidate();
 R.setOpt("chamfer","d","1");
 rig.clear();
 R.begin("chamfer");
 rig.type(e1.id); rig.type(e2.id);
 rig.enter();
 ok(rig.said(/حُذفت/,"wr"),"والفتحةُ في المقطوع تُحذَف ويُقال");
 eq(S.opens.length,0,"فلا تبقى");
 /* كانت تنصح بـ«لحم»، واللحمُ لا يجد ما يفعله: الأطرافُ متطابقةٌ بالبناء */
 ok(rig.said(/طرفاه على طرفَي الجدارين تماماً/,"wr"),
  "ويُصرَّح أين يقع طرفاه — بلا نصيحةٍ بلحمٍ لا يلزم");
});
/* ═══ ١٧ · المصفوفة ═══ */
group("المصفوفة",()=>{
 /* ═══ المستطيلة ═══ */
 reset(); rig.defs("array");
 const w=W.addWall([0,0],[2000,0],200,"int","c");
 O.addOpen(w,1000,"door",800,2100,0);
 RN.invalidate();
 rig.clear();
 R.begin("array");
 ok(!R.active(),"والمصفوفةُ بلا تحديدٍ لا تبدأ");
 ok(rig.said(/حدّد/,"wr"),"ويُقال ما يُفعَل");
 rig.pick([{k:"wall",id:w.id}]);
 R.setOpt("array","nx",3); R.setOpt("array","ny",2);
 R.begin("array");
 ok(R.active(),"وبالتحديدِ تبدأ");
 rig.at(0,0); rig.at(3000,4000);
 eq(S.walls.length,6,"و٣×٢ ستّةُ جدران — الأصلُ خليّةٌ فيها");
 eq(S.opens.length,6,"وفتحةٌ مع كلٍّ — تتبع جدارها");
 ok(S.walls.some(x=>x.a[0]===6000&&x.a[1]===4000),
  "والخليّةُ القصوى في موضعها");
 near(W.wallLen(w),2000,1,"والأصلُ لم يُمَسّ");
 ok(!R.active(),"وتنهي نفسها بعد مصفوفةٍ واحدة");
 /* والخيارُ يُطاع */
 reset(); rig.defs("array");
 const w2=W.addWall([0,0],[2000,0],200,"int","c");
 O.addOpen(w2,1000,"door",800,2100,0);
 RN.invalidate();
 rig.pick([{k:"wall",id:w2.id}]);
 R.setOpt("array","nx",2); R.setOpt("array","ny",1);
 R.setOpt("array","opens",0);
 R.begin("array");
 rig.at(0,0); rig.at(3000,0);
 eq(S.walls.length,2,"والجدارُ يُنسَخ");
 eq(S.opens.length,1,"ولا فتحتُه");
 R.setOpt("array","opens",1);
 /* ═══ والرفضُ يُذكَر بسببه ═══ */
 reset(); rig.defs("array");
 const w3=W.addWall([0,0],[2000,0],200,"int","c");
 RN.invalidate();
 rig.pick([{k:"wall",id:w3.id}]);
 R.setOpt("array","nx",1); R.setOpt("array","ny",1);
 R.begin("array");
 rig.clear();
 rig.at(0,0); rig.at(3000,0);
 ok(rig.said(/لا نسخةَ تُنشَأ/,"er"),"وخليّةٌ واحدةٌ تُرفَض");
 eq(S.walls.length,1,"ولا شيءَ يُنشَأ");
 R.setOpt("array","nx",3);
 rig.clear();
 rig.at(0,0); rig.at(0,4000);
 ok(rig.said(/تتراكب/,"er"),
  "وتباعدُ X صفرٌ مع ثلاثة أعمدةٍ يُرفَض — لا نسخٌ متراكبةٌ صامتة");
 eq(S.walls.length,1,"ولا شيءَ يُنشَأ");
 R.setOpt("array","nx",30); R.setOpt("array","ny",30);
 rig.clear();
 rig.at(0,0); rig.at(3000,3000);
 ok(rig.said(/الحدّ 500/,"er"),"وما فوق الحدّ يُرفَض بذكره");
 eq(S.walls.length,1,"ولا شيءَ يُنشَأ");
 rig.esc();
 /* والمخفيُّ لا يُنسَخ */
 reset(); rig.defs("array");
 const w4=W.addWall([0,0],[2000,0],200,"int","c");
 const k4=K.addCol("rect",[6000,0],400,400,0,"conc");
 RN.invalidate();
 rig.pick([{k:"wall",id:w4.id},{k:"col",id:k4.id}]);
 LY.toggleOff("A-COLS");
 R.setOpt("array","nx",2); R.setOpt("array","ny",1);
 R.begin("array");
 rig.at(0,0); rig.at(3000,0);
 eq(S.walls.length,2,"والجدارُ يُنسَخ");
 eq(S.cols.length,1,"والعمودُ على طبقةٍ مخفيّةٍ لا يُنسَخ");
 LY.showAll();
 /* ═══ القطبية ═══ */
 reset(); rig.defs("arraypolar");
 const c=K.addCol("rect",[3000,0],400,400,30,"conc");
 RN.invalidate();
 rig.pick([{k:"col",id:c.id}]);
 R.setOpt("arraypolar","n",4);
 R.setOpt("arraypolar","total",360);
 R.setOpt("arraypolar","rot",1);
 R.begin("arraypolar");
 rig.at(0,0);
 eq(S.cols.length,4,"وأربعةُ تكراراتٍ حول المركز");
 ok(rig.said(/الخطوة 90/,"ok"),
  "ودورةٌ كاملةٌ تُقسَم على العدد — فلا تتراكب الأخيرةُ على الأصل");
 ok(S.cols.some(x=>Math.abs(x.x)<2&&Math.abs(x.y-3000)<2),
  "والثانيةُ على ٩٠°");
 ok(S.cols.some(x=>Math.abs(x.rot-120)<0.01),
  "وهيئتُها تدور معها");
 eq(c.rot,30,"والأصلُ لم يُمَسّ");
 /* وبلا دورانٍ تبقى الهيئة */
 reset(); rig.defs("arraypolar");
 const c2=K.addCol("rect",[3000,0],400,400,30,"conc");
 RN.invalidate();
 rig.pick([{k:"col",id:c2.id}]);
 R.setOpt("arraypolar","n",4);
 R.setOpt("arraypolar","rot",0);
 R.begin("arraypolar");
 rig.at(0,0);
 eq(S.cols.length,4,"وأربعةٌ كذلك");
 ok(S.cols.every(x=>Math.abs(x.rot-30)<0.01),
  "وكلُّها بهيئة الأصل — الموضعُ يدور وحده");
 ok(S.cols.some(x=>Math.abs(x.x)<3&&Math.abs(x.y-3000)<3),
  "والموضعُ على القوس");
 /* والزاويةُ الجزئيةُ تمتدّ إلى آخر نسخة */
 reset(); rig.defs("arraypolar");
 const c3=K.addCol("rect",[3000,0],400,400,0,"conc");
 RN.invalidate();
 rig.pick([{k:"col",id:c3.id}]);
 R.setOpt("arraypolar","n",4);
 R.setOpt("arraypolar","total",90);
 R.setOpt("arraypolar","rot",1);
 rig.clear();
 R.begin("arraypolar");
 rig.at(0,0);
 ok(rig.said(/الخطوة 30/,"ok"),"و٩٠° على أربعةٍ خطوتُها ٣٠°");
 ok(S.cols.some(x=>Math.abs(x.x)<3&&Math.abs(x.y-3000)<3),
  "وآخرُها يبلغ ٩٠° بالضبط");
 /* ═══ وقاعدةُ الدوران واحدةٌ ═══ */
 reset(); rig.defs("arraypolar");
 const d=D.addDim("h",[0,0],[5000,0],-800);
 RN.invalidate();
 ok(MD.canRotate({k:"dim",id:d.id},90),
  "وcanRotate تقبل البُعدَ الأفقيَّ بمضاعفات ٩٠");
 ok(!MD.canRotate({k:"dim",id:d.id},37),"وترفضه بزاويةٍ حرّة");
 rig.pick([{k:"dim",id:d.id}]);
 R.setOpt("arraypolar","n",5);
 R.setOpt("arraypolar","total",360);
 rig.clear();
 R.begin("arraypolar");
 rig.at(0,0);
 ok(rig.said(/لا عنصرَ يقبل/,"er"),
  "وخطوةُ ٧٢° تُرفَض — البُعدُ الأفقيُّ لا يدور إلّا بمضاعفات ٩٠");
 eq(S.dims.length,1,
  "ولا نسخةَ تبقى في موضع الأصل — الترشيحُ قبل النسخ");
 R.setOpt("arraypolar","n",4);
 rig.clear();
 R.begin("arraypolar");
 rig.at(0,0);
 eq(S.dims.length,4,"وبخطوةِ ٩٠° يُقبَل");
 ok(S.dims.some(x=>x.kind==="v"),"والنوعُ يُقلَب مع الربع");
 /* ═══ والحسابُ مُصدَّرٌ يُسأل مباشرةً ═══ */
 reset();
 const w5=W.addWall([0,0],[2000,0],200,"int","c");
 RN.invalidate();
 const G=MD.grab([{k:"wall",id:w5.id}]);
 const r1=MD.arrayRect(G,2,1,3000,0,1);
 eq(r1.cells,1,"وarrayRect خليّةٌ واحدةٌ تُنسَخ");
 eq(S.walls.length,2,"فجدارانِ");
 const r2=MD.arrayPolar(MD.grab([{k:"wall",id:w5.id}]),
  [0,0],180,3,1,1);
 eq(r2.n,3,"وarrayPolar ثلاثةُ تكرارات");
 eq(r2.step,90,"وخطوتُها ٩٠° — جزئيةٌ تمتدّ إلى آخر نسخة");
 eq(S.walls.length,4,"فأربعةُ جدران");
});/* ═══ الجدار القوسيّ — ثلاث نقاط ═══ */
group("الجدار القوسيّ: الرسم بثلاث نقاط",()=>{
 const d=R.findTool("arcwall");
 ok(!!d,"الأداةُ مُعلَنة");
 ok(R.findTool("aw")===d&&R.findTool("arc")===d&&R.findTool("قوس")===d,
  "وأسماؤها المختصرة تصل إليها");
 ok(!R.isDestruct(d),"وليست هادمة — تُنشئ ولا تمسّ");
 reset(); rig.defs("arcwall");
 R.begin("arcwall");
 rig.type("0,0"); rig.type("4,0");
 /* المعاينةُ بعد نقطتين لا ترمي، وتُنتج ما يُرسَم */
 rig.ghost(2000,1500);
 const pv=R.preview();
 ok(pv.some(x=>x.t==="pg"),"والمعاينةُ ترسم جسم القوس");
 rig.type("2,1.5");
 eq(S.walls.length,1,"ثلاثُ نقاطٍ ← جدارٌ واحد");
 const w=S.walls[0];
 ok(W.isArc(w),"وهو قوسيّ");
 near(W.arcParams(w).R,(4+2.25)/3*1000,3,"نصفُ قطره ٢٫٠٨٣ م (وتر ٤ · سهم ١٫٥)");
 const mp=W.arcMidPoint(w);
 ok(Math.hypot(mp[0]-2000,mp[1]-1500)<3,
  "ومنتصفُه هو النقطةُ التي نُقر عليها");
 eq(w.align,"c","ومركزيُّ المحاذاة");
 ok(R.active()&&R.T.ctx.pts.length===0,"والأداةُ تُعيد نفسها نظيفة");
 ok(rig.said(/قوس .* نصف القطر/,"ok"),"ويُقال نصفُ القطر والزاوية");
 /* الخيارُ يُقرأ عند الإنشاء */
 rig.type("t=0.3"); rig.type("type=ext");
 rig.type("0,5"); rig.type("4,5"); rig.type("2,6.5");
 eq(S.walls.length,2,"وجدارٌ ثانٍ");
 eq(S.walls[1].t,300,"بالسماكة المضبوطة");
 eq(S.walls[1].type,"ext","وبالنوع المضبوط");
 rig.esc();
 eq(S.walls.length,2,"وEsc لا يُنشئ شيئاً");
});
group("الجدار القوسيّ: الرفضُ يُسمّي السبب ويبقى على الخطوة",()=>{
 reset(); rig.defs("arcwall");
 R.begin("arcwall");
 rig.type("0,0"); rig.type("0.8,0");                /* وتر ٨٠ سم */
 rig.type("0.4,0");                                 /* على استقامة */
 ok(rig.said(/استقامة/,"er"),"ثلاثُ نقاطٍ على استقامة: تُرفَض بسببها");
 eq(S.walls.length,0,"ولا يُنشَأ شيء");
 ok(R.active()&&R.T.i===2,"وتبقى الأداةُ على خطوة النقطة الثالثة");
 rig.clear();
 /* سماكةٌ لا يتّسع لها القوس: سهمٌ ٣٥ سم على وتر ٨٠ ← نصف القطر ٤٠٤ مم،
    والسماكةُ ١٠٠٠ مم ← نصفُها ٥٠٠ ≥ نصف القطر */
 rig.type("t=1");
 rig.type("0.4,0.35");
 ok(rig.said(/نصف قطره/,"er"),"وسماكةٌ أكبر من نصف القطر: يرفضها addWall بسببها");
 eq(S.walls.length,0,"ولا يُنشَأ");
 ok(R.T.i===2,"وتبقى على الخطوة");
 /* المعاينةُ للمرفوض لا ترمي: مسارٌ وردي بلا جسم */
 rig.ghost(400,350);
 const pv=R.preview();
 ok(pv.length>0&&pv.every(x=>x.t!=="pg"||x.cl===0),
  "والمعاينةُ للمرفوض مسارٌ لا جسم");
 /* نقطةٌ ثالثةٌ صالحة بعد الرفض تنجح (النقطةُ المرفوضةُ لم تفسد ctx) */
 rig.type("t=0.15");
 rig.type("0.4,0.35");
 eq(S.walls.length,1,"ثم النقطةُ نفسها بسماكةٍ صالحة تُنشئ الجدار");
 const P=W.arcParams(S.walls[0]);
 near(P.R,(0.16+0.1225)/0.7*1000,3,"ونصفُ القطر من النقاط الأولى لا من المرفوضة");
 rig.esc();
});
group("الجدار القوسيّ: أدواتُ التعديل تُرفَض عند التنفيذ",()=>{
 reset(); rig.defs("arcwall");
 R.begin("arcwall"); rig.type("0,0"); rig.type("4,0"); rig.type("2,1.5"); rig.esc();
 const id=S.walls[0].id, b4=JSON.stringify(S.walls);
 /* الإزاحة: اختيارُ الجدار ثم الجهة */
 rig.defs("offset"); rig.clear();
 R.begin("offset"); rig.type(id); rig.type("2,3");
 ok(rig.said(/الإزاحة.*قوسيّ/,"er"),"الإزاحة تُرفَض باسمها");
 eq(JSON.stringify(S.walls),b4,"ولا يتغيّر شيء");
 rig.esc();
 /* القطع */
 rig.clear();
 R.begin("break"); rig.type(id); rig.type("2,1.5");
 ok(rig.said(/القطع.*قوسيّ/,"er"),"والقطع");
 eq(JSON.stringify(S.walls),b4,"ولا يتغيّر شيء");
 rig.esc();
 /* اللحم: يحتاج تحديداً */
 rig.pick([{k:"wall",id}]); rig.clear();
 R.begin("weld");
 /* اللحمُ لم يعد يرفض القوس: هو مرساةٌ لا تتحرّك (weld-arc.test.js) */
 ok(!rig.said(/اللحم.*قوسيّ/,"er")&&rig.said(/لا طرف يحتاج لحماً/),"واللحمُ لا يرفضه بل لا يجد ما يلحمه");
 /* تبقى فعّالةً ليظهر حقلُ «التفاوت»، وEnter لا يُنفّذ شيئاً، وEsc يُخرج */
 const w4=JSON.stringify(S.walls); rig.enter();
 eq(JSON.stringify(S.walls),w4,"وEnter بلا حركةٍ لا يمسّ شيئاً");
 R.cancel(true); ok(!R.active(),"وEsc يُخرج");
 rig.pick([]);
});
/* ═══ أبعاد الغرفة — مستهلكُ autodim ═══ */
group("أبعاد الغرفة: نقرةٌ داخل غرفةٍ مغلقة",()=>{
 const d=R.findTool("roomdim");
 ok(!!d&&R.findTool("rd")===d,"الأداةُ مُعلَنةٌ باسمٍ مختصر");
 ok(!R.isDestruct(d),"وليست هادمة — تُنشئ ولا تمسّ");
 reset(); rig.defs("roomdim");
 room(6000,4000,250);
 const walls0=JSON.stringify(S.walls);
 R.begin("roomdim");
 rig.type("3,2");
 eq(S.dims.length,2,"بُعدان");
 eq(S.anno.length,1,"وملصقٌ واحد");
 const h=S.dims.find(x=>x.kind==="h"), v=S.dims.find(x=>x.kind==="v");
 ok(!!h&&!!v,"أفقيٌّ ورأسيّ");
 near(D.dimValue(h),5750,2,"العرضُ صافٍ ٥٫٧٥ م (٦ م − سماكة الجدار)");
 near(D.dimValue(v),3750,2,"والطولُ صافٍ ٣٫٧٥ م");
 ok(/5\.75/.test(S.anno[0].s)&&/21\.56/.test(S.anno[0].s),
  "والملصقُ فيه العرض×الطول والمساحة الفعلية ٢١٫٥٦ م²");
 ok(h.pos<h.a[1]&&v.pos<v.a[0],"والبُعدان خارج الغرفة (أسفلها ويسارها)");
 ok(!rig.said(/ليست مستطيلة/,"wr"),"غرفةٌ مستطيلة: لا تنبيه");
 eq(JSON.stringify(S.walls),walls0,"ولا يُمَسّ جدار");
 ok(R.active(),"والأداةُ تبقى فعّالة");
 /* الخيارات */
 rig.clear(); rig.type("label=0"); rig.type("off=2");
 rig.type("3,2");
 eq(S.dims.length,4,"نقرةٌ ثانية: بُعدان آخران");
 eq(S.anno.length,1,"بلا ملصقٍ حين يُطفأ");
 ok(S.dims[2].pos<S.dims[0].pos,"والإزاحةُ ٢ م أبعدُ من ١ م");
 rig.esc();
});
group("أبعاد الغرفة: الرفضُ والتنبيه",()=>{
 reset(); rig.defs("roomdim");
 /* جدرانٌ مفتوحة: لا حلقة */
 W.addWall([0,0],[4000,0],200,"int","c"); RN.invalidate();
 R.begin("roomdim");
 rig.type("2,1");
 ok(rig.said(/لا حلقة مغلقة/,"er"),"بلا حلقةٍ مغلقة: يُرفَض بسببه");
 eq(S.dims.length+S.anno.length,0,"ولا يُنشَأ شيء");
 rig.esc();
 /* غرفةٌ على شكل L: تُبعَّد بصندوقها ويُنبَّه */
 reset(); rig.defs("roomdim");
 const P=[[0,0],[6000,0],[6000,2000],[3000,2000],[3000,5000],[0,5000]];
 for(let i=0;i<P.length;i++)W.addWall(P[i],P[(i+1)%P.length],200,"ext","c");
 RN.invalidate();
 R.begin("roomdim");
 rig.type("1,1");
 eq(S.dims.length,2,"غرفة L تُبعَّد كذلك");
 ok(rig.said(/ليست مستطيلة/,"wr"),"ويُقال إنها ليست مستطيلة (الصندوق ≠ الغرفة)");
 rig.esc();
});

process.exit(summary()?1:0);
