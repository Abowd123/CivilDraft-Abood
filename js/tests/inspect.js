/* ═══ اختبار الفاحص ═══
   أربعةَ عشرَ فحصاً وأربعةٌ وعشرون شفرةً، ومنها عشرٌ بلا حالةٍ
   خاصّة. والعقدُ المُعلَن: يخبرك ولا يصلح — فكلُّ حالةٍ هنا تفحص
   شيئين: أن الملاحظةَ تقع بشفرتها ورسالتِها وهدفِ قفزها، وأن
   الحالةَ لم تُمَسّ بعدها حرفاً بحرف.

   وموضعُ القفز عقدٌ كذلك: سطرٌ يُنقَر فلا يقفز إلى شيءٍ أسوأُ من
   سطرٍ لا يُنقَر.

   التشغيل:  node js/tests/inspect.js                              */
import {shim,group,ok,eq,near,deep,summary} from "./harness.js";
shim();

const {S,newState,ensureShape,touch,touchGeom,touchOpen,touchView,
 edit,pack}=await import("../core/state.js");
const W =await import("../core/walls.js");
const O =await import("../core/opens.js");
const A =await import("../core/areas.js");
const D =await import("../core/dims.js");
const K =await import("../core/cols.js");
const FX=await import("../core/fixt.js");
const SR=await import("../core/stairs.js");
const L =await import("../core/layers.js");
const RF=await import("../core/ref.js");
const RN=await import("../core/render.js");
const IN=await import("../core/inspect.js");
const BL=await import("../core/blocks.js");

const reset=()=>{newState(); ensureShape(); RN.invalidate()};
const room=(w,h,t)=>{
 const P=[[0,0],[w,0],[w,h],[0,h]];
 for(let i=0;i<4;i++)W.addWall(P[i],P[(i+1)%4],t||250,"ext","c");
 RN.invalidate();
};
/* الفحصُ لا يعدّل: كلُّ نداءٍ يُقاس قبلَه وبعده */
function scan(bbox,opt){
 const b4=JSON.stringify(pack());
 const f=IN.inspect(bbox,opt);
 ok(JSON.stringify(pack())===b4,"والفحصُ لم يعدّل شيئاً");
 return f;
}
const has=(f,code)=>f.list.some(x=>x.code===code);
const of=(f,code)=>f.list.filter(x=>x.code===code);
/* الغائبُ يُعلَن ولا يُرمى: دعوى ساقطةٌ خيرٌ من مجموعةٍ منقطعة —
   ما بعدها يفحص أشياءَ أخرى، ورمياً واحداً من one(...).msg على
   null يحجبها كلَّها. */
const NIL={sev:"",code:"",msg:"",k:null,id:null,p:null};
const one=(f,code)=>of(f,code)[0]||NIL;
/* ═══ ١ · شكلُ الحصيلة ═══ */
group("شكلُ الحصيلة",()=>{
 ok(!!IN.SEV.er&&!!IN.SEV.wr&&!!IN.SEV.in,
  "ودرجاتُ الخطورة الثلاثُ مُعلَنةٌ بالعربية");
 reset();
 const f=scan(null);
 ok(Array.isArray(f.list),"والحصيلةُ قائمة");
 ["er","wr","in"].forEach(k=>ok(typeof f[k]==="number",
  `و${k} عددٌ`));
 eq(f.er+f.wr+f.in,f.list.length,"ومجموعُها طولُ القائمة");
 /* لا شيء مرسوم */
 ok(has(f,"empty"),"وبلا جدرانٍ ولا أعمدةٍ تُقال «empty»");
 eq(one(f,"empty").sev,"in","ملاحظةً لا خطأً — ليست عيباً");
 eq(one(f,"empty").p,null,"وبلا هدفِ قفز");
 /* وبالرسمِ تزول */
 room(6000,4000,250);
 ok(!has(scan(null),"empty"),"وبالرسمِ تزول");
});
/* ═══ ٢ · الجدران ═══ */
group("الجدران",()=>{
 /* الأطرافُ غير المتّصلة */
 reset();
 W.addWall([0,0],[3000,0],200,"int","c");
 W.addWall([3050,0],[3050,3000],200,"int","c");
 const f=scan(null);
 eq(of(f,"end").length,4,"وأربعةُ أطرافٍ حرّةٍ تُقال");
 of(f,"end").forEach(x=>{
  eq(x.sev,"wr","تنبيهاً");
  eq(x.k,"wall","وبنوعها");
  ok(!!x.id,"وبمعرّفها");
  ok(Array.isArray(x.p),"ولها هدفُ قفز");
  ok(/البداية|النهاية/.test(x.msg),"والرسالةُ تسمّي الطرف");
 });
 /* والتفاوتُ وسيط */
 eq(of(scan(null,{endTol:100}),"end").length,2,
  "وبتفاوتٍ ١٠ سم يبقى طرفان");
 /* الجدارُ القصيرُ والصفريّ — بالمقابض لا بالمنفذ */
 reset();
 const w=W.addWall([0,0],[3000,0],200,"int","c");
 w.b=[10,0]; touchGeom();
 const f2=scan(null);
 ok(has(f2,"wshort"),"وجدارٌ أقصرُ من الحدّ يُقال");
 eq(one(f2,"wshort").sev,"wr","تنبيهاً — لا يُحذَف");
 ok(/الحدّ الأدنى/.test(one(f2,"wshort").msg),"ويُذكَر الحدّ");
 eq(W.wallLen(w),10,"ولا يُصلَح");
 w.b=w.a.slice(); touchGeom();
 const f3=scan(null);
 ok(has(f3,"w0"),"والصفريُّ يُقال");
 eq(one(f3,"w0").sev,"er","خطأً — لا معنى له هندسياً");
 /* المتطابقان */
 reset();
 W.addWall([0,0],[5000,0],200,"int","c");
 W.addWall([0,0],[5000,0],300,"ext","c");
 const f4=scan(null);
 ok(has(f4,"wdup"),"وجدارانِ على مسارٍ واحدٍ يُقالان");
 ok(/مكرَّر/.test(one(f4,"wdup").msg),"ويُسأل: مقصودٌ أم سهو؟");
 eq(S.walls.length,2,"ولا يُحذَف أحدهما");
 /* والمعكوسُ متطابقٌ كذلك — المفتاحُ غيرُ مرتَّب */
 reset();
 W.addWall([0,0],[5000,0],200,"int","c");
 W.addWall([5000,0],[0,0],200,"int","c");
 ok(has(scan(null),"wdup"),
  "والمعكوسُ مسارُه هو — فلا يُفلِت بقلب طرفيه");
 /* الجدارُ القوسي — يُستبعَد من الواجهات/المقاطع، ويُقال لا يُخفى */
 reset();
 const qb=Math.tan(Math.PI/8);
 const wa=W.addWall([1000,0],[0,1000],200,"ext","c",null,qb);
 const f5=scan(null);
 ok(has(f5,"warcnoelev"),"والقوسيُّ يُقال إنه مستبعَدٌ من الواجهة");
 eq(one(f5,"warcnoelev").sev,"in","ملاحظةً — لا خطأ ولا تنبيهاً حادّاً");
 ok(W.isArc(wa),"وما زال قوسياً بعدها — لا يُصلَح");
});
/* ═══ مثيلُ كتلةٍ بلا تعريف ═══ explode تعيد [] فلا يُرسَم ولا يُقال ═══ */
group("مثيلُ كتلةٍ بلا تعريف",()=>{
 reset();
 const B=BL;
 B.defineBlock({name:"bd-a",prims:[{t:"line",a:[0,0],b:[100,0]}]});
 S.blocks=[B.makeInstance("bd-a",{x:500,y:700})];
 ok(!has(scan(null),"bdef"),"مثيلٌ بتعريفه سليم — لا شفرة");
 B.removeBlock("bd-a",{force:true});
 const f=scan(null);
 ok(has(f,"bdef"),"وبعد حذف التعريف (force) يُقال إن المثيل معلَّق");
 eq(one(f,"bdef").sev,"er","خطأً — يختفي من الرسم والطباعة");
 ok(/bd-a/.test(one(f,"bdef").msg),"والرسالةُ تُسمّي الكتلة");
 deep(one(f,"bdef").p,[500,700],"وهدفُ القفز موضعُ المثيل");
 eq(S.blocks.length,1,"ولا يُحذَف المثيل — يخبر ولا يصلح");
 /* المخفيّ خارج الحساب كسائر الفاحص */
 L.setLay("A-BLKS","off",1);
 ok(!has(scan(null),"bdef"),"وطبقتُه مطفأة: لا يُبلَّغ عمّا لا يُرى");
});
/* ═══ ٣ · الفتحات ═══ */
group("الفتحات",()=>{
 reset();
 const w=W.addWall([0,0],[6000,0],200,"int","c");
 const o=O.addOpen(w,4500,"door",900,2100,0);
 eq(of(scan(null),"open").length,0,"والسليمةُ لا تُقال");
 /* الخارجةُ عن جدارها */
 w.b=[3000,0]; touchGeom();
 const f=scan(null);
 ok(has(f,"open"),"والخارجةُ تُقال");
 const x=one(f,"open");
 eq(x.sev,"wr","تنبيهاً");
 eq(x.k,"open","وبنوعها");
 eq(x.id,o.id,"وبمعرّفها");
 ok(/تخرج عن مدى/.test(x.msg),"وتُسمّى علّتُها");
 ok(/لم تُزحَف/.test(x.msg),
  "ويُصرَّح أنها لم تُزحَف — عقدُ البرنامج في رسالته");
 eq(o.s,4500,"وفعلاً لم تُزحَف");
 /* المتراكبتان */
 reset();
 const w2=W.addWall([0,0],[6000,0],200,"int","c");
 const a=O.addOpen(w2,2000,"window",1000,1400,900);
 const b=O.addOpen(w2,4000,"window",1000,1400,900);
 b.s=2400; touchOpen();
 const f2=scan(null);
 ok(has(f2,"open"),"والمتراكبتان تُقالان");
 ok(/تتراكب/.test(one(f2,"open").msg),"وتُسمّى علّتُهما");
 eq(b.s,2400,"ولا يُقلَّم موضعُها");
 /* واليتيمةُ خطأٌ لا تنبيه */
 reset();
 const w3=W.addWall([0,0],[6000,0],200,"int","c");
 const o3=O.addOpen(w3,3000,"door",900,2100,0);
 o3.wall="W999"; touchOpen();
 const f3=scan(null);
 ok(has(f3,"open"),"واليتيمةُ تُقال");
 eq(one(f3,"open").sev,"er","خطأً — حاضنُها زال");
 eq(one(f3,"open").p,null,"وبلا هدفِ قفز — لا جدارَ يُقفَز إليه");
});
/* ═══ ٤ · المناطق ═══ */
group("المناطق",()=>{
 reset();
 room(8000,5000,250);
 const a=A.addArea(A.regionAt(RN.regionLoops(),4000,2500),"صالة");
 const f=scan(null);
 ok(!has(f,"astale"),"والجديدةُ لا تُقال");
 ok(!has(f,"aname"),"والمسمّاةُ كذلك");
 /* القديمة */
 S.walls[0].t=500; touchGeom(); RN.invalidate();
 const f2=scan(null);
 ok(has(f2,"astale"),"والقديمةُ تُقال");
 eq(one(f2,"astale").sev,"wr","تنبيهاً");
 eq(one(f2,"astale").k,"area","وبنوعها");
 ok(/لم تُمَسّ/.test(one(f2,"astale").msg),
  "ويُصرَّح أن حلقتَها لم تُمَسّ");
 ok(/م²/.test(one(f2,"astale").msg),"وتُذكَر مساحتُها المخزَّنة");
 ok(A.isStale(a),"ولا تُحدَّث");
 /* بلا اسم */
 reset();
 room(8000,5000,250);
 A.addArea(A.regionAt(RN.regionLoops(),4000,2500),"");
 const f3=scan(null);
 ok(has(f3,"aname"),"وبلا اسمٍ تُقال");
 eq(one(f3,"aname").sev,"in","ملاحظةً — ليست عيباً");
 /* المتراكبتان */
 reset();
 room(12000,8000,250);
 A.addArea(A.regionAt(RN.regionLoops(),6000,4000),"كبيرة");
 A.addArea([[2000,2000],[5000,2000],[5000,5000],[2000,5000]],
  "داخلية");
 const f4=scan(null);
 ok(has(f4,"aover"),"والمتراكبتان تُقالان");
 ok(/متراكبتان/.test(one(f4,"aover").msg),"وتُسمّى علّتُهما");
 eq(S.areas.length,2,"ولا تُحذَف إحداهما");
});
/* ═══ ٥ · الأبعادُ والسلاسل ═══ */
group("الأبعادُ والسلاسل",()=>{
 reset();
 room(8000,5000,250);
 const d=D.addDim("h",[0,0],[8000,0],-1200);
 ok(!has(scan(null),"dloose"),"والبُعدُ على الهندسة لا يُقال");
 /* المعلَّق */
 const lo=D.addDim("h",[60000,60000],[66000,60000],-1200);
 const f=scan(null);
 ok(has(f,"dloose"),"والمعلَّقُ يُقال");
 eq(one(f,"dloose").sev,"wr","تنبيهاً");
 ok(/لم يُزحَف/.test(one(f,"dloose").msg),
  "ويُصرَّح أنه لم يُزحَف ولم يُحذَف");
 ok(Array.isArray(one(f,"dloose").p),"وله هدفُ قفز");
 eq(D.dimValue(lo),6000,"ولا يُمَسّ");
 eq(of(scan(null,{dimTol:99000}),"dloose").length,0,
  "وبتفاوتٍ أوسعَ لا يُقال — الوسيطُ يُطاع");
 /* النصُّ البديل */
 d.txt="≈8"; touchView();
 const f2=scan(null);
 ok(has(f2,"dtxt"),"والبديلُ يُقال");
 ok(/المقاس الحقيقي/.test(one(f2,"dtxt").msg),
  "ويُذكَر المقاسُ الحقيقيُّ إلى جانبه");
 eq(d.txt,"≈8","ولا يُمسَح");
 /* السلسلةُ المخالفة */
 reset();
 room(8000,5000,250);
 const c=D.addChain("h",[0,0],-2400,[1234,2345,3456],1);
 const f3=scan(null,{chainTol:10});
 ok(has(f3,"coff"),"والسلسلةُ المخالفةُ تُقال");
 eq(one(f3,"coff").sev,"in","ملاحظةً — القيَمُ مكتوبةٌ بيدك");
 ok(/المجموع المكتوب/.test(one(f3,"coff").msg),
  "ويُذكَر مجموعُها المكتوب");
 deep(D.chainVals(c),[1234,2345,3456],"ولا تُعدَّل قيمة");
 eq(of(scan(null,{chainTol:900000}),"coff").length,0,
  "وبتفاوتٍ واسعٍ لا تُقال");
});
/* ═══ ٦ · الأعمدةُ والأدواتُ والدرج ═══ */
group("الأعمدةُ والأدواتُ والدرج",()=>{
 /* العمودُ المنفرد */
 reset();
 room(8000,5000,250);
 const c=K.addCol("rect",[4000,2500],400,400,0,"conc","C1");
 const f=scan(null);
 ok(has(f,"kfree"),"والعمودُ المنفردُ يُقال");
 eq(one(f,"kfree").sev,"in","ملاحظةً — قد يكون مقصوداً");
 ok(/لا يلامس جداراً/.test(one(f,"kfree").msg),"وتُسمّى حالُه");
 /* وداخلَ منطقةٍ يُبلَّغ أن مساحتَها لا تخصمه */
 A.addArea(A.regionAt(RN.regionLoops(),1000,1000),"صالة");
 const f2=scan(null);
 ok(has(f2,"kinarea"),"وداخلَ منطقةٍ يُقال");
 ok(/لا تخصمه/.test(one(f2,"kinarea").msg),
  "ويُصرَّح أن المساحةَ لا تخصمه");
 /* والملامسُ لا يُقال */
 reset();
 const wl=W.addWall([0,0],[8000,0],400,"int","c");
 K.addCol("rect",[4000,0],400,400,0,"conc");
 RN.invalidate();
 ok(!has(scan(null),"kfree"),"والملامسُ لا يُقال");
 /* والمتراكبان */
 reset();
 room(8000,5000,250);
 K.addCol("rect",[4000,2500],600,600,0,"conc");
 K.addCol("rect",[4200,2500],600,600,0,"conc");
 const f3=scan(null);
 ok(has(f3,"kover"),"والمتراكبان يُقالان");
 ok(/مقصود أم سهو/.test(one(f3,"kover").msg),
  "ويُسأل — لا يُحكَم");
 eq(S.cols.length,2,"ولا يُحذَف أحدهما");
 /* الأدواتُ الصحية */
 reset();
 room(8000,5000,250);
 FX.addFix("wc",[4000,2500],0);
 const f4=scan(null);
 ok(has(f4,"ffree"),"والأداةُ الحرّةُ تُقال");
 eq(one(f4,"ffree").sev,"in","ملاحظةً");
 ok(/لا يلاصق جداراً/.test(one(f4,"ffree").msg),"وتُسمّى حالُها");
 FX.addFix("lav",[4050,2550],0);
 const f5=scan(null);
 ok(has(f5,"fover"),"والمتراكبتان تُقالان");
 ok(/تتراكب/.test(one(f5,"fover").msg),"بتسميةِ نوعَيهما");
 /* والملصَقةُ لا تُقال */
 reset();
 const w2=W.addWall([0,1000],[8000,1000],200,"int","c");
 RN.invalidate();
 const sn=FX.snapToWall([4000,1300],1500);
 FX.addFix("wc",sn.p,sn.rot);
 ok(!has(scan(null),"ffree"),"والملصَقةُ لا تُقال");
 /* الدرج: يُقاس فيُقال، سليماً وغيرَ سليم */
 reset();
 SR.addStair([0,0],[4000,0],1100,17,{h:3000});
 const f6=scan(null);
 ok(has(f6,"stairok"),"والدرجُ السليمُ يُقال ملاحظةً");
 eq(one(f6,"stairok").sev,"in","ملاحظةً — تقريرٌ نافع");
 ok(/2ق\+ن/.test(one(f6,"stairok").msg),"وتُذكَر قاعدتُه");
 ok(/داخل المدى/.test(one(f6,"stairok").msg),"وأنه في المدى");
 reset();
 const bad=SR.addStair([0,0],[2000,0],700,20,{h:3000});
 const f7=scan(null);
 ok(of(f7,"stair").length>=2,"وغيرُ السليمِ يُقال بكلِّ ملاحظة");
 of(f7,"stair").forEach(x=>{
  eq(x.sev,"wr","تنبيهاً");
  eq(x.k,"stair","وبنوعه");
  ok(Array.isArray(x.p),"وله هدفُ قفز");
 });
 ok(!has(f7,"stairok"),"ولا يُقال سليماً في الوقت نفسه");
 eq(bad.flights[0].n,20,"ولا يُصحَّح عددُ قوائمه");
});
/* ═══ ٧ · الطبقاتُ والورقة ═══ */
group("الطبقاتُ والورقة",()=>{
 reset();
 room(8000,5000,250);
 D.addDim("h",[0,0],[8000,0],-1200);
 ok(!has(scan(null),"lhid"),"وبلا إخفاءٍ لا يُقال");
 edit(()=>L.toggleOff("A-DIMS"));
 const f=scan(null);
 ok(has(f,"lhid"),"والمخفيّةُ تُقال");
 eq(one(f,"lhid").sev,"wr",
  "تنبيهاً — سببٌ لغياب ما تتوقّع رؤيته");
 ok(/لن يُرسَم/.test(one(f,"lhid").msg),
  "ويُصرَّح أنها لن تُرسَم ولن تُصدَّر");
 ok(has(f,"lhidn"),"وتُفصَّل بعددِ كياناتها");
 eq(one(f,"lhidn").sev,"in","ملاحظةً");
 edit(()=>L.showAll());
 /* والمقفلةُ ملاحظة */
 edit(()=>L.toggleLock("A-WALL"));
 const f2=scan(null);
 ok(has(f2,"llock"),"والمقفلةُ تُقال");
 eq(one(f2,"llock").sev,"in","ملاحظةً — تُرى ولا تُحدَّد");
 ok(/تُرى ولا تُحدَّد/.test(one(f2,"llock").msg),"ويُصرَّح");
 edit(()=>L.unlockAll());
 /* والورقةُ يُقاس تجاوزُها */
 reset();
 S.meta.scale=100;
 S.sheet.on=1; S.sheet.size="A4"; S.sheet.orient="p";
 S.sheet.cx=null; S.sheet.cy=null;
 room(40000,30000,250);
 const B=RN.sceneBBox();
 const f3=scan(B);
 ok(has(f3,"sheet"),"والرسمُ المتجاوزُ يُقال");
 eq(one(f3,"sheet").sev,"wr","تنبيهاً");
 ok(/كبّر الورقة|صغّر المقياس/.test(one(f3,"sheet").msg),
  "ويُقال ما يُفعَل — لا لومٌ بلا مخرَج");
 S.meta.scale=500;
 RN.invalidate();
 ok(!has(scan(RN.sceneBBox()),"sheet"),
  "وبمقياسٍ يتّسع لا يُقال");
 S.sheet.on=0; S.meta.scale=100;
});
/* ═══ ٨ · المرجع ═══ */
group("المرجع",()=>{
 const mk=(n,ex)=>Object.assign({
  ents:Array.from({length:n||10},(_,i)=>({t:"l",
   a:[i*100,0],b:[i*100,1000],sl:"REF"})),
  src:{REF:n||10}, units:{name:"مليمتر",f:1}},ex||{});
 reset();
 room(8000,5000,250);
 ok(!has(scan(null),"refn"),"وبلا مرجعٍ لا يُقال");
 edit(()=>RF.setRef(mk(10),"مرجع.dxf"));
 const f=scan(RN.sceneBBox());
 ok(has(f,"refn"),"وبالمرجعِ يُقال");
 eq(one(f,"refn").sev,"in","ملاحظةً");
 ok(/جامد/.test(one(f,"refn").msg),
  "ويُصرَّح أنه جامدٌ لا يدخل الاتحاد ولا المساحات");
 ok(/مرجع\.dxf/.test(one(f,"refn").msg),"ويُسمّى ملفُّه");
 /* والوحدةُ المفترضةُ تنبيهٌ حتى يُعايَر */
 edit(()=>RF.setRef(mk(10,{guessed:1}),"مجهول.dxf"));
 const f2=scan(RN.sceneBBox());
 ok(has(f2,"refunit"),"والوحدةُ المفترضةُ تُقال");
 eq(one(f2,"refunit").sev,"wr","تنبيهاً — يُقاس عليه");
 ok(/قبل أن تقيس/.test(one(f2,"refunit").msg),"ويُقال ما يُفعَل");
 edit(()=>RF.calRef([0,0],[1000,0],2000));
 ok(!has(scan(RN.sceneBBox()),"refunit"),
  "وبالمعايرةِ تزول — القياسُ صار موثوقاً");
 /* والمنقوصُ يُقال */
 edit(()=>RF.setRef(mk(10,{trunc:1200}),"كبير.dxf"));
 const f3=scan(RN.sceneBBox());
 ok(has(f3,"reftrunc"),"والمنقوصُ يُقال");
 eq(one(f3,"reftrunc").sev,"wr","تنبيهاً");
 ok(/منقوص/.test(one(f3,"reftrunc").msg),"ويُصرَّح");
 /* والمتخطّى يُلخَّص */
 edit(()=>RF.setRef(mk(10,{skip:{HATCH:5,"3DSOLID":2}}),"x.dxf"));
 const f4=scan(RN.sceneBBox());
 ok(has(f4,"refskip"),"والمتخطّى يُقال");
 ok(/HATCH/.test(one(f4,"refskip").msg),"بأسماءِ ما تُخطّي");
 /* والتقريباتُ تُسمّى */
 edit(()=>RF.setRef(mk(10,{approx:{spline:4,ellipse:2,arc:1}}),
  "y.dxf"));
 const f5=scan(RN.sceneBBox());
 ok(has(f5,"refapx"),"والتقريباتُ تُقال");
 ok(/SPLINE/.test(one(f5,"refapx").msg),"ويُسمّى المنحنى");
 ok(/متقطّع/.test(one(f5,"refapx").msg),
  "ويُذكَر أن التقطيعَ علامتُه");
 /* والبعيدُ يُقال */
 edit(()=>RF.setRef({ents:[{t:"l",a:[900000,900000],
  b:[901000,900000],sl:"R"}],src:{R:1},
  units:{name:"مليمتر",f:1}},"بعيد.dxf"));
 const f6=scan(RN.sceneBBox());
 ok(has(f6,"reffar"),"والبعيدُ عن رسمك يُقال");
 ok(/حاذِه|انقله/.test(one(f6,"reffar").msg),"ويُقال ما يُفعَل");
 edit(()=>RF.clearRef());
});
/* ═══ ٩ · الترتيبُ والحصيلةُ الجامعة ═══ */
group("الترتيبُ والحصيلة",()=>{
 reset();
 /* حالةٌ واحدةٌ تجمع خطأً وتنبيهاً وملاحظة */
 const w=W.addWall([0,0],[8000,0],250,"int","c");
 W.addWall([9000,0],[9000,5000],250,"int","c");
 const o=O.addOpen(w,4000,"door",900,2100,0);
 o.wall="W999"; touchOpen();          /* خطأ */
 K.addCol("rect",[20000,20000],400,400,0,"conc");  /* ملاحظة */
 const d=D.addDim("h",[0,0],[8000,0],-1200);
 d.txt="≈8"; touchView();             /* تنبيه */
 RN.invalidate();
 const f=scan(RN.sceneBBox());
 ok(f.er>0&&f.wr>0&&f.in>0,
  `والثلاثةُ تقع معاً (${f.er}/${f.wr}/${f.in})`);
 /* الترتيبُ: الأخطرُ أوّلاً ثم بالشفرة */
 const ORD={er:0,wr:1,in:2};
 let okOrd=true;
 for(let i=1;i<f.list.length;i++){
  const a=f.list[i-1], b=f.list[i];
  const da=ORD[a.sev], db=ORD[b.sev];
  if(da>db){okOrd=false; break}
  if(da===db&&a.code.localeCompare(b.code)>0){okOrd=false; break}
 }
 ok(okOrd,"والترتيبُ بالخطورةِ ثم بالشفرة — الأخطرُ أوّلاً");
 /* وكلُّ ملاحظةٍ مفيدةٌ وشفرتُها مُعلَنة */
 ok(f.list.length>4,`و${f.list.length} ملاحظة`);
 f.list.forEach(x=>{
  ok(!!x.code&&/^[a-z0-9]+$/.test(x.code),
   `${x.code}: شفرةٌ لاتينيةٌ مستقرّة`);
  ok(x.msg&&x.msg.length>8,`${x.code}: ورسالةٌ مفيدة`);
  ok(["er","wr","in"].includes(x.sev),`${x.code}: ودرجةٌ معروفة`);
  if(x.k)ok(!!x.id,`${x.code}: والنوعُ مع معرّفه`);
  if(x.p){
   ok(x.p.length===2,`${x.code}: وهدفُ القفزِ نقطة`);
   ok(isFinite(x.p[0])&&isFinite(x.p[1]),
    `${x.code}: بإحداثيَّينِ صحيحين`);
   eq(x.p[0],Math.round(x.p[0]),`${x.code}: مُدوَّرَين`);
  }
 });
 /* والشفراتُ لا تتبدّل: عقدٌ مع الواجهة تقرؤها لتقفز */
 const CODES=["end","w0","wshort","wdup","open","astale","aname",
  "aover","dloose","dtxt","coff","kfree","kinarea","kover",
  "ffree","fover","stair","stairok","lhid","lhidn","llock",
  "refn","refunit","reftrunc","refskip","refapx","reffar","loopopen",
  "sheet","empty","align"];
 f.list.forEach(x=>ok(CODES.includes(x.code),
  `${x.code}: شفرةٌ مُعلَنةٌ في العقد`));
 /* والفحصُ الثاني يعطي الحصيلةَ نفسها — لا حالةَ متبقّية */
 const g=IN.inspect(RN.sceneBBox());
 eq(g.list.length,f.list.length,"والفحصُ الثاني حصيلتُه هي");
 deep(g.list.map(x=>x.code),f.list.map(x=>x.code),
  "بشفراتها بالترتيب نفسه — لا حالةَ تتراكم");
});
group("١٫٥ — الفاحص يستبعد المخفيّ من تقارير الأزواج",()=>{
 reset();
 room(12000,8000,250);
 A.addArea(A.regionAt(RN.regionLoops(),6000,4000),"كبيرة");
 A.addArea([[2000,2000],[5000,2000],[5000,5000],[2000,5000]],
  "داخلية");
 RN.invalidate();
 ok(has(scan(null),"aover"),
  "قبل الإخفاء: منطقتان متراكبتان تُقالان كالمعتاد");
 L.setLay("A-AREA","off",1);
 RN.invalidate();
 const f=scan(null);
 ok(!has(f,"aover"),
  "بعد إخفاء الطبقة: التراكب لا يُقال — المخفيّ ليس في المشهد");
 L.setLay("A-AREA","off",0);
 RN.invalidate();
 ok(has(scan(null),"aover"),
  "وبعد إظهارها من جديد: التراكب يُقال ثانيةً");
});
group("loopopen: قطعٌ لم تُخَط في اتحاد الأجسام تُقال",()=>{
 /* مشهدٌ حقيقيّ من فحصٍ عشوائيّ: خمسةُ جدرانٍ مائلةٍ متقاطعة يقع
    فيها الاتحادُ على قطعةٍ لم تُخَط (loopOpen=1 عند ≈(1158،1155)).
    ليس مُصطنَعاً: الشرطُ نفسُه يُلاحَظ في الاستعمال. */
 reset();
 [[[1000,1200],[1200,1900],334],[[1400,2100],[300,3400],326],
  [[2000,2900],[1000,2700],233],[[2400,800],[2700,1600],307],
  [[1200,1400],[500,500],235]]
  .forEach(([a,b,t])=>W.addWall(a,b,t,"int","c"));
 RN.invalidate(); RN.regionLoops();
 const n=RN.loopOpen(), at=RN.loopOpenAt();
 ok(n>0&&!!at,"المشهدُ يُنتج فعلاً قطعةً لم تُخَط (شرطُ الاختبار)");
 const f=scan(null);
 ok(has(f,"loopopen"),"والفاحصُ يقولها — كان العدّادُ يُحسَب ولا يُقال");
 const x=one(f,"loopopen");
 eq(x.sev,"wr","تنبيهاً");
 ok(x.msg.includes(`${n} قطعةً`),"بعددها");
 deep(x.p,[Math.round(at[0]),Math.round(at[1])],
  "وهدفُ القفز موضعُ آخرِ قطعة (مُدوَّراً)");
 eq(x.k,null,"ولا كيانَ يُحدَّد — الموضعُ وحدَه");
 /* بعد اللحم وإصلاح الجدران: يزول */
 reset();
 room(6000,4000,250);
 ok(!has(scan(null),"loopopen"),"غرفةٌ سليمة: لا تنبيه");
 reset();
 ok(!has(scan(null),"loopopen"),"ومشهدٌ فارغٌ: لا تنبيه");
 /* النصُّ خالص */
 ok(IN.loopOpenMsg(3,null).includes("3 قطعةً")
  &&!IN.loopOpenMsg(3,null).includes("عند ("),
  "والنصّ بلا موضعٍ إن غاب");
 ok(IN.loopOpenMsg(1,[1500,2500]).includes("عند ("),
  "ومعه الموضع إن وُجد");
});
group("١٦ — محاذاة الطوابق (F7): تنبيهٌ بهدف قفزٍ ولا تعديل",()=>{
 reset();
 S.meta.level=0; K.addCol("rect",[0,0],300,300,0,"conc");
 S.meta.level=1; const up=K.addCol("rect",[2000,0],300,300,0,"conc");
 let f=scan(null);
 ok(has(f,"align"),"عمودٌ علويٌّ لا يقع فوق سفليٍّ يُقال");
 const x=one(f,"align");
 eq(x.sev,"wr","تنبيهاً"); eq(x.k,"col","عمود"); eq(x.id,up.id,"المعنيُّ العلويّ");
 deep(x.p,[2000,0],"وهدفُ القفز موضعُه");
 /* محاذاة: يزول */
 reset();
 S.meta.level=0; K.addCol("rect",[0,0],300,300,0,"conc");
 S.meta.level=1; K.addCol("rect",[10,0],300,300,0,"conc");
 ok(!has(scan(null),"align"),"ضمن 50مم: لا تنبيه");
 /* مخفيّ الطبقة خارج الحساب كسائر الفاحص */
 reset();
 S.meta.level=0; K.addCol("rect",[0,0],300,300,0,"conc");
 S.meta.level=1; const h=K.addCol("rect",[2000,0],300,300,0,"conc");
 ok(has(scan(null),"align"),"قبل الإخفاء: يُقال");
 const hl=L.layOfEnt({k:"col",id:h.id});
 ok(!!hl,"طبقةُ العمود تُشتقّ عبر layOfEnt (لا حقلَ layer عليه)");
 L.setLay(hl,"off",1); RN.invalidate();
 ok(!has(scan(null),"align"),"بعد إخفاء طبقة العمود العلويّ: لا يُقال");
 L.setLay(hl,"off",0); RN.invalidate();
 ok(has(scan(null),"align"),"وبعد إظهارها: يُقال ثانيةً");
});
process.exit(summary()?1:0);
