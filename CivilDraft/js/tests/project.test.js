/* ═══ اختبار 2.6: io/project.js — التحقّق قبل الاستبدال ═══
   ملفٌّ فاسدٌ لا يغيّر المشروع الحالي ولا تاريخه (D11)، وإصدارٌ
   مستقبليٌّ يُرفَض، ومعرّفاتٌ مكرّرة تُرفَض قبل أن تدخل الحالة.     */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,edit,undo,canUndo,snapshot}=
 await import("../core/state.js");
const W=await import("../core/walls.js");
const PRJ=await import("../io/project.js");

const reset=()=>{newState(); ensureShape()};
const wall=(a,b)=>W.addWall(a,b,200,"int","c");

group("fromJSON — ملفٌّ سليم يُحمَّل",()=>{
 reset();
 const txt=PRJ.toJSON();
 edit(()=>wall([0,0],[3000,0]),"جدار");
 const r=PRJ.fromJSON(txt);
 eq(S.walls.length,0,"عاد الملفّ الأصليّ الفارغ");
 eq(r.walls,0,"والعائد يقول 0");
});
group("fromJSON — JSON غير صالح لا يمسّ الحالة",()=>{
 reset();
 edit(()=>wall([0,0],[3000,0]),"جدار");
 const before=snapshot();
 let threw=false;
 try{PRJ.fromJSON("{ليس جيسون")}catch(e){threw=true}
 ok(threw,"رُمي");
 eq(snapshot(),before,"المشروع لم يتغيّر");
 ok(canUndo(),"والتاريخ باقٍ");
});
group("fromJSON — لا مصفوفة جدران",()=>{
 reset();
 edit(()=>wall([0,0],[3000,0]),"جدار");
 const before=snapshot();
 let threw=false;
 try{PRJ.fromJSON(JSON.stringify({__app:"civildraft"}))}catch(e){threw=true}
 ok(threw,"رُمي"); eq(snapshot(),before,"لم يتغيّر");
});
group("fromJSON — تعريفات كتلٍ فاسدة لا تمسّ المشروع (D11)",()=>{
 reset();
 edit(()=>wall([0,0],[3000,0]),"جدار");
 const before=snapshot();
 const bad=JSON.stringify({__app:"civildraft",
  walls:[{id:"W9",a:[0,0],b:[9000,0],t:200,type:"int",align:"c"}],
  opens:[],areas:[],dims:[],chains:[],anno:[],cols:[],fixt:[],stairs:[],
  meta:{name:"T",scale:100},
  ref:{name:"",tr:{k:1,rot:0,dx:0,dy:0},src:{},off:{},ents:[]},
  blockDefs:{defs:[{name:"x",prims:[{t:"line",a:[NaN,0],b:[1,1]}]}]}});
 let threw=false;
 try{PRJ.fromJSON(bad)}catch(e){threw=true}
 ok(threw,"رُمي");
 eq(snapshot(),before,"الجدار W1 القديم ما زال — لا مزيجٌ مع W9");
 eq(S.walls.length,1,"جدارٌ واحدٌ فقط (القديم)");
 ok(canUndo(),"والتاريخ لم يُمسَح");
});
group("fromJSON — معرّفٌ مكرّر يُرفَض قبل الاستبدال",()=>{
 reset();
 edit(()=>wall([0,0],[3000,0]),"جدار");
 const before=snapshot();
 const bad=JSON.stringify({__app:"civildraft",
  walls:[{id:"W1",a:[0,0],b:[1000,0],t:200,type:"int",align:"c"},
         {id:"W1",a:[0,1000],b:[1000,1000],t:200,type:"int",align:"c"}]});
 let threw=false, msg="";
 try{PRJ.fromJSON(bad)}catch(e){threw=true; msg=e.message}
 ok(threw,"رُمي"); ok(/مكرّر/.test(msg),"السبب: معرّفٌ مكرّر");
 eq(snapshot(),before,"لم يتغيّر");
});
group("fromJSON — إصدارٌ مستقبليّ يُرفَض",()=>{
 reset();
 edit(()=>wall([0,0],[3000,0]),"جدار");
 const before=snapshot();
 const bad=JSON.stringify({__app:"civildraft",__ver:9999,
  walls:[{id:"W9",a:[0,0],b:[9000,0],t:200,type:"int",align:"c"}]});
 let threw=false, msg="";
 try{PRJ.fromJSON(bad)}catch(e){threw=true; msg=e.message}
 ok(threw,"رُمي"); ok(/أحدث|إصدار/.test(msg),"السبب يذكر الإصدار");
 eq(snapshot(),before,"لم يتغيّر");
});
group("fromJSON — تطبيقٌ من تطبيقٍ آخر يُرفَض",()=>{
 reset();
 let threw=false, msg="";
 try{PRJ.fromJSON(JSON.stringify({__app:"other",walls:[]}))}
 catch(e){threw=true; msg=e.message}
 ok(threw,"رُمي"); ok(/other/.test(msg),"يسمّي التطبيق");
});
group("fromJSON — توافق mistar القديم",()=>{
 reset();
 ok(PRJ.fromJSON(JSON.stringify({__app:"mistar",walls:[]})),"لا يرمي");
});
group("fromJSON — نجاحٌ يمسح التاريخ فعلاً",()=>{
 reset();
 edit(()=>wall([0,0],[3000,0]),"جدار");
 ok(canUndo(),"شرطٌ مسبق");
 PRJ.fromJSON(JSON.stringify({__app:"civildraft",walls:[]}));
 ok(!canUndo(),"مُسِح بعد نجاحٍ حقيقيّ");
});
process.exit(summary()?1:0);
