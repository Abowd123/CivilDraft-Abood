/* ═══ المرحلة C1 — الحقول الحيّة LV ═══
   node js/tests/phaseC1-live.test.js */
import {shim,group,ok,eq,throws,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,edit,undo}=await import("../core/state.js");
const LV=await import("../core/live.js");
const RN=await import("../core/render.js");
const ER=await import("../core/entreg.js");
const {VLD}=await import("../core/validate.js");
const reset=()=>{newState(); ensureShape(); RN.invalidate()};

group("فكّ المصدر والقراءة",()=>{
 reset();
 eq(LV.parseSrc("meta:scale").kind,"meta","عام: نوع");
 eq(LV.parseSrc("dim:D7:value").id,"D7","معيّن: معرّف");
 ok(LV.parseSrc("nonsense")===null&&LV.parseSrc("a:b:c:d")===null,"مصدرٌ لا يُفكّ");
 eq(LV.resolveLive("meta:scale").v,+S.meta.scale||100,"meta:scale");
 const ev=LV.evaluateLive({src:"meta:scale",fmt:"raw",pre:"1:",suf:""});
 eq(ev.txt,"1:"+(+S.meta.scale||100),"evaluateLive يقيّم بلا كتابة");
 ok(LV.evaluateLive({src:"meta:nope"}).stale===1,"مصدرٌ غائب ⇒ متوسَّم");
 ok(!LV.resolveLive("meta:nope").ok,"حقل meta مجهول");
 ok(!LV.resolveLive("zzz:x").ok,"نوعٌ مجهول");
 eq(LV.formatLive(1500,"m"),"1.500","م");
 eq(LV.formatLive(2500000,"m2"),"2.50","م²");
 eq(LV.formatLive(12.6,"mm"),"13","مم");
 eq(LV.formatLive(7,"raw"),"7","خام");
 eq(LV.resolveLive("count:walls:count").v,S.walls.length,"عدّاد");
});

group("الإنشاء يرفض المجهول ويحسب الآن",()=>{
 reset();
 const n0=S.livefields.length;
 throws(()=>LV.addLive("nonsense:xyz",[0,0]),null,"مصدرٌ مجهول يُرفض");
 throws(()=>LV.addLive("meta:nope",[0,0]),null,"حقل meta مجهول يُرفض");
 throws(()=>LV.addLive("dim:D99:value",[0,0]),null,"بُعدٌ غائب يُرفض");
 eq(S.livefields.length,n0,"لا كتابة عند الرفض");
 const f=LV.addLive("meta:scale",[1000,1000],{suf:"x"});
 eq(f.cached,String(LV.resolveLive("meta:scale").v)+"x","يُحسب عند الإنشاء");
 ok(/^LV\d+$/.test(f.id),"بادئة LV");
 ok(LV.liveById(f.id)===f,"liveById");
 ok(LV.delLive(f)&&!LV.delLive(f),"حذف مرّة واحدة");
});

group("لا شيء يتحرّك خلسة",()=>{
 reset();
 const sc=LV.resolveLive("meta:scale").v;
 const f=LV.addLive("meta:scale",[1000,1000],{suf:"x"});
 S.meta.scale=sc+50;
 RN.invalidate(); RN.scene();
 eq(f.cached,String(sc)+"x","render/scene لا يعيدان الحساب");
 eq(f.pos[0],1000,"الموضع صريحٌ لا يزحف");
 const r=edit(()=>LV.refreshLive(),"تحديث",{bump:"view"});
 ok(r.n===1&&r.changed===1,"التحديث الصريح غيّر النص");
 eq(S.livefields[0].cached,String(sc+50)+"x","النص الجديد");
 eq(S.livefields[0].pos[1],1000,"التحديث لا يمسّ الموضع");
 ok(!LV.liveWouldChange(),"لا تغيير بعد التحديث");
 undo();
 eq(S.livefields[0].cached,String(sc)+"x","التراجع يعيد النص القديم");
 ok(LV.liveWouldChange(),"والفحص المسبق يرى الفرق");
});

group("القدَامة المتسلسلة واليتيم",()=>{
 reset();
 S.dims.push({id:"D7",a:[0,0],b:[3000,0],pos:-1000,kind:"h",txt:"يدوي"});
 const g=LV.addLive("dim:D7:value",[500,500],{fmt:"m"});
 eq(g.stale,1,"مصدرٌ قديم ⇒ حقلٌ قديم منذ نشأته");
 eq(LV.livePrims(g)[0].s,"*3.000","نجمةٌ بادئة");
 eq(LV.livePrims(g)[0].warn,1,"وwarn");
 eq(LV.staleLiveCount(),1,"العدّاد");
 eq(RN.scene().live,1,"وscene().live");
 S.dims=S.dims.filter(d=>d.id!=="D7");
 LV.refreshLive();
 ok(LV.liveById(g.id),"اليتيم يبقى");
 eq(g.cached,"—","يعرض —");
 eq(g.stale,1,"ومتوسَّم");
});

group("التطبيع والكيان",()=>{
 reset();
 const f=LV.addLive("meta:scale",[10,20]);
 delete f.cached;
 ensureShape();
 const f2=LV.liveById(f.id);
 eq(f2.cached,"—","cached الغائب يُملأ");
 eq(f2.stale,1,"ويُوسَم قديماً");
 S.livefields.push({id:"LVX",src:"meta:scale",pos:["a",1]});
 ensureShape();
 ok(!LV.liveById("LVX"),"موضعٌ فاسد يُسقَط");
 const d=ER.ENT.live;
 ok(d&&d.coll==="livefields"&&d.pre==="LV","الكيان مسجَّل");
 const o=d.grab(f2); d.drag(o,{k:"p"},[300,400]);
 eq(f2.pos.join(),"300,400","السحب بالمقبض");
 d.move(d.grab(f2),10,10);
 eq(f2.pos.join(),"310,410","النقل");
 ok(d.hit(310,410,5,0,()=>true)===f2,"الإصابة");
 ok(typeof VLD.live==="object","V يغطي الحقل الحيّ");
});

group("العرض",()=>{
 reset();
 const f=LV.addLive("meta:scale",[0,0],{pre:"1:"});
 RN.invalidate();
 const P=RN.scene().P.filter(g=>g.lid===f.id);
 ok(P.length===1&&P[0].t==="text"&&P[0].L==="A-ANNO","أوّلية نصٍّ على A-ANNO");
 eq(P[0].oid,f.id,"وهويّة oid");
 ok(RN.bandNames().includes("live"),"النطاق في BANDS");
});
summary();
