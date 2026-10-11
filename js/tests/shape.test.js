/* ═══ اختبار 2.4: سجلّ التطبيع — لا حذفَ صامت عند التحميل ═══
   (١) shape.js وحدَه: البنية والتجميع والرسائل والسقف.
   (٢) ensureShape: كلُّ إسقاطٍ وإصلاحٍ وتقويمٍ يظهر في shapeNotes،
       وما كان يمرّ صامتاً (فسادُ a[1] أو b[0] · إحداثيٌّ ناقص
       يصير الأصل) يُسقَط ويُقال.                                    */
import {shim,group,ok,eq,deep,summary} from "./harness.js";
shim();
const {newLog,add,norm,repair,drop,count,empty,dump,totals,notes}=
 await import("../core/shape.js");
const SH={newLog,add,norm,repair,drop,count,empty,dump,totals,notes};
const {S,newState,ensureShape,shapeNotes,pack,edit,undo,canUndo}=
 await import("../core/state.js");
const W=await import("../core/walls.js");

group("newLog — البنية",()=>{
 const L=SH.newLog();
 ok(SH.empty(L),"فارغ"); eq(SH.count(L),0,"count=0");
 deep(SH.dump(L),[],"dump فارغ"); eq(SH.notes(L).length,0,"لا رسائل");
});
group("add — التسجيل والتجميع",()=>{
 const L=SH.newLog();
 SH.norm(L,"meta",null,"scale",0,100,"حدود");
 SH.repair(L,"wall","W3","قوسٌ");
 SH.drop(L,"open","O5","جدارها زال");
 SH.drop(L,"open","O6","جدارها زال");
 eq(SH.count(L),4,"أربعة");
 const t=SH.totals(L);
 eq(t.drop.open,2,"drop.open=2"); eq(t.repair.wall,1,"repair.wall=1");
 eq(t.normalize.meta,1,"normalize.meta=1");
 eq(SH.dump(L)[0].type,"normalize","السطر الخامّ يحمل نوعه");
 eq(SH.dump(L)[3].id,"O6","ومعرّفه");
});
group("notes — الترتيب والصياغة",()=>{
 const L=SH.newLog();
 SH.norm(L,"meta",null,"x",0,1,"سبب");
 SH.repair(L,"wall","W1","إصلاح");
 SH.drop(L,"wall","W2","حذف");
 SH.drop(L,"wall","W9","حذف");
 const N=SH.notes(L);
 ok(/^حُذف 2 جدار/.test(N[0][1]),"drop أولاً بعددٍ ومذكّر");
 ok(/W2 · W9/.test(N[0][1]),"ومعرّفاته");
 ok(/^أُصلح 1 جدار/.test(N[1][1]),"ثم repair");
 ok(/^قُوِّمت 1 قيمة/.test(N[2][1]),"ثم normalize");
 eq(N[0][0],"wr","drop = wr"); eq(N[1][0],"wr","repair = wr");
 eq(N[2][0],"in","normalize = in");
 const L2=SH.newLog(); SH.drop(L2,"open","O1","س");
 ok(/^حُذفت 1 فتحة/.test(SH.notes(L2)[0][1]),"المؤنّث: حُذفت");
});
group("notes — أكثر من خمسة معرّفات",()=>{
 const L=SH.newLog();
 for(let i=1;i<=8;i++)SH.drop(L,"wall","W"+i,"سبب");
 ok(/و3 غيرها/.test(SH.notes(L)[0][1]),"يذكر الباقي");
});
group("notes — كيانٌ بلا معرّف",()=>{
 const L=SH.newLog(); SH.drop(L,"wall",null,"كيانٌ فارغ");
 const m=SH.notes(L)[0][1];
 ok(/حُذف 1 جدار/.test(m)&&!/\(/.test(m),"لا أقواس معرّفات");
});
group("السقف — الذاكرة لا تنمو والعدُّ صحيح",()=>{
 const L=SH.newLog();
 for(let i=0;i<5000;i++)SH.drop(L,"wall","W"+i,"سبب");
 ok(SH.dump(L).length<=300,"سطورٌ خامّ ≤ 300");
 eq(SH.count(L),5000,"والعدد كاملٌ 5000");
 ok(/حُذف 5000 جدار/.test(SH.notes(L)[0][1]),"والرسالة بالعدد الصحيح");
 const L2=SH.newLog(); SH.drop(L2,"refEnt",null,"س",{n:1234});
 eq(SH.count(L2),1234,"حذفٌ بالجملة بعدد n");
});

const fresh=()=>{newState(); ensureShape(); shapeNotes()};
const msgs=()=>shapeNotes().map(x=>x[1]).join("\n");

group("ensureShape — ما كان يمرّ صامتاً يُسقَط ويُقال",()=>{
 fresh();
 /* الفلتر القديم فحص a[0] وb[1] فقط: هذان الجداران كانا يمرّان */
 S.walls=[
  {id:"W1",a:[0,"x"],b:[5000,0],t:200,type:"int",align:"c"},
  {id:"W2",a:[0,0],b:["y",0],t:200,type:"int",align:"c"},
  {id:"W3",a:[0,0],b:[5000,NaN],t:200,type:"int",align:"c"},
  {id:"W4",a:[0,0],b:[5000,5000],t:200,type:"int",align:"c"}];
 ensureShape();
 eq(S.walls.length,1,"جدارٌ واحدٌ سليم يبقى");
 eq(S.walls[0].id,"W4","هو W4");
 ok(!S.walls.some(w=>w.a[0]===0&&w.a[1]===0&&w.b[0]===0),
  "ولا جدارَ صار (0,0)");
 const m=msgs();
 ok(/حُذف 3 جدار/.test(m),"«حُذف 3 جدار»");
 ok(/W1/.test(m)&&/W2/.test(m)&&/W3/.test(m),"بمعرّفاتها");
});
group("ensureShape — عمودٌ وأداةٌ ودرجٌ وبُعدٌ وكتلةٌ بإحداثيٍّ ناقص",()=>{
 fresh();
 S.cols=[{id:"K1",x:null,y:5,w:300,h:300},{id:"K2",x:100,y:100,w:300,h:300}];
 S.fixt=[{id:"F1",kind:"wc",x:undefined,y:0},{id:"F2",kind:"zzz",x:0,y:0}];
 S.stairs=[{id:"S1",a:[0,0],b:[0]}];
 S.dims=[{id:"D1",a:[0,0],b:null}];
 S.blocks=[{id:"b1",block:"door",x:null,y:0}];
 ensureShape();
 eq(S.cols.length,1,"عمودٌ واحد"); eq(S.fixt.length,0,"أداتان أُسقطتا");
 eq(S.stairs.length,0,"درج"); eq(S.dims.length,0,"بُعد");
 eq(S.blocks.length,0,"مثيلُ كتلة (كان +null=0 يضعه في الأصل)");
 const m=msgs();
 ["عمود","أداة","درج","بُعد","كتلة"].forEach(n=>
  ok(new RegExp(n).test(m),`الرسالة تذكر «${n}»`));
 ok(/K1/.test(m)&&/F1/.test(m)&&/F2/.test(m),"والمعرّفات");
});
group("ensureShape — منطقةٌ بحلقةٍ فيها رأسٌ فاسد تُسقَط كلُّها",()=>{
 fresh();
 S.areas=[{id:"A1",ring:[[0,0],[4000,0],[NaN,4000],[0,4000]]},
          {id:"A2",ring:[[0,0],[4000,0],[4000,4000],[0,4000]]},
          {id:"A3",ring:[[0,0],[1,1]]}];
 ensureShape();
 eq(S.areas.length,1,"A2 وحدَها");
 const m=msgs();
 ok(/حُذفت 1 منطقة.*A1/.test(m)&&/رأسٌ فاسد/.test(m),"A1: رأسٌ فاسد في الحلقة");
 ok(/حُذفت 1 منطقة.*A3/.test(m)&&/الأدنى 3/.test(m),"A3: حلقةٌ أقصر من ثلاثة");
});
group("ensureShape — قائدٌ: رأسٌ فاسد يُصلَح ويُقال",()=>{
 fresh();
 S.anno=[{id:"T1",kind:"lead",pts:[[0,0],[100,100],[NaN,5]],s:"قائد"},
         {id:"T2",kind:"lead",pts:[[0,0],[NaN,5]],s:"قائد"},
         {id:"T3",kind:"text",x:null,y:0,s:"نصّ"},
         {id:"T4",kind:"text",x:1,y:1,s:""}];
 ensureShape();
 eq(S.anno.length,1,"القائد الأوّل وحدَه");
 eq(S.anno[0].pts.length,2,"برأسَين");
 const m=msgs();
 /* T2 أُصلح (رأسٌ فاسدٌ أُسقط) ثم أُسقط هو نفسه (بقي برأسٍ واحد) —
    السطران معاً يظهران، لا يتعارضان */
 ok(/أُصلح 2 تأشير.*\(T1 · T2\)/.test(m),"إصلاح T1 وT2");
 ok(/حُذف 1 تأشير.*T2.*يحتاج نقطتين/.test(m),"وT2 أُسقط بعد إصلاحه (بقي برأسٍ واحد)");
 ok(/حُذف 1 تأشير.*T3.*موضعٌ ناقص/.test(m),"وT3: موضعٌ ناقص");
 ok(/حُذف 1 تأشير.*T4.*نصٌّ فارغ/.test(m),"وT4: نصٌّ فارغ");
});
group("ensureShape — القيمُ المقوَّمة تُقال (normalize)",()=>{
 fresh();
 S.meta.scale=99999; S.meta.wallH=99999;
 S.walls=[{id:"W1",a:[0,0],b:[5000,0],t:5000,type:"zzz",align:"q"}];
 S.opens=[{id:"O1",wall:"W1",kind:"nope",s:1000,w:900,h:2100}];
 ensureShape();
 eq(S.meta.scale,5000,"scale قُسرت"); eq(S.walls[0].t,1000,"t قُسرت");
 const n=shapeNotes(); const inf=n.find(x=>x[0]==="in");
 ok(!!inf,"ملاحظةٌ إعلاميّة");
 ok(/إعداد/.test(inf[1])&&/جدار/.test(inf[1])&&/فتحة/.test(inf[1]),
  "بكياناتها: إعداد · جدار · فتحة");
 ok(/scale/.test(inf[1])||/wallH/.test(inf[1])||/\bt\b/.test(inf[1]),
  "وتذكر أمثلة الحقول");
});
group("ensureShape — ملفٌّ سليم بلا رسالةٍ زائدة",()=>{
 fresh();
 S.walls=[{id:"W1",a:[0,0],b:[5000,0],t:200,type:"int",align:"c"}];
 S.opens=[{id:"O1",wall:"W1",kind:"door",s:1000,w:900,h:2100}];
 S.areas=[{id:"A1",ring:[[0,0],[4000,0],[4000,4000],[0,4000]]}];
 ensureShape();
 eq(shapeNotes().length,0,"لا رسالة (لا ضجيجَ عن التقريب ولا عن الغائب)");
});
group("ensureShape — التراجع لا يُنتج ضجيجاً",()=>{
 fresh();
 edit(()=>{W.addWall([0,0],[5000,0],200,"int","c")},"جدار");
 undo(); ensureShape();
 eq(shapeNotes().length,0,"لا رسالة بعد تراجعٍ عاديّ");
});
group("shapeNotes — التراكم بين استدعاءَي ensureShape ثم التفريغ",()=>{
 fresh();
 /* project.fromJSON: loadState (ensureShape #1) ثم ensureShape #2 —
    الثانية لا تمحو ما سجّلته الأولى */
 S.walls=[{id:"W1",a:[0,"x"],b:[5000,0]},
          {id:"W2",a:[0,0],b:[5000,0],t:200,type:"int",align:"c"}];
 ensureShape(); ensureShape();
 const n=shapeNotes();
 ok(n.some(x=>/حُذف 1 جدار/.test(x[1])),"الرسالة باقيةٌ بعد الثانية");
 eq(shapeNotes().length,0,"والقراءة الثانية فارغة — لا تُعاد");
 ok(!("__shapeLog" in S),"والسجلّ مُسِح من S");
});
group("السجلّ لا يدخل pack ولا التاريخ",()=>{
 fresh();
 S.walls=[{id:"W1",a:[0,"x"],b:[5000,0]}];
 ensureShape();
 ok(!JSON.stringify(pack()).includes("__shapeLog"),"pack بلا السجلّ");
 shapeNotes();
});
group("المرجع والصورة — تُسجَّل ولا تُخفى",()=>{
 fresh();
 S.ref.ents=[{t:"l",a:[0,0],b:[100,100],sl:"A"},
  {t:"l",a:[0,null],b:[1,1],sl:"A"},
  {t:"p",pts:[[0,0],[1,1],[NaN,2]],sl:"A"},
  {t:"p",pts:[[0,0],[NaN,1]],sl:"A"},
  {t:"zzz"},null,
  {t:"t",p:[0,0],s:"",sl:"A"}];
 S.underlay.src="http://evil.example/x.png";
 ensureShape();
 eq(S.ref.ents.length,2,"سطرٌ سليم وخطٌّ متعدّد أُصلح");
 eq(S.underlay.src,"","والمصدر الخارجيّ طُرح");
 const m=msgs();
 ok(/حُذف 2 كيان مرجع.*نوعٌ مجهول/.test(m),"2: نوعٌ مجهول أو فارغ (zzz·null)");
 ok(/حُذف 3 كيان مرجع.*إحداثيٌّ فاسد/.test(m),
  "3: إحداثيٌّ فاسد أو نصٌّ فارغ (خطٌّ ناقص · مضلّعٌ برأسٍ واحد · نصٌّ فارغ)");
 ok(/أُصلح 1 خط مرجع متعدّد/.test(m),"وخطٌّ متعدّدٌ أُصلح (المضلّع الأول)");
 ok(/طُرحت 1 صورة مرجعية/.test(m),"والصورة طُرحت");
});
group("المحاور — قيمٌ غير منتهية تُقال",()=>{
 fresh();
 S.grid={xs:[0,1000,NaN,"x",1e12],ys:[500]};
 ensureShape();
 deep(S.grid.xs,[0,1000],"القيم الصالحة");
 ok(/محاور/.test(msgs()),"والإصلاح يُقال");
});
process.exit(summary()?1:0);
