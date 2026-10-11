/* ═══ مسار التصدير: الفحص المسبق · الإلغاء · التقرير ═══
   node js/tests/export-flow.test.js
   io/export.js لا يلمس واجهةً (القرار ١ في رأسه) فيُختبَر في node:
   ١) preflight: رسمٌ فارغ · لا شيء قابل للطباعة · تجاوز الورقة · نصٌّ
      خارج CP1256 في DXF — er يمنع وwr/in يُقال.
   ٢) run: إشارة إلغاء قبل البدء أو بعد البناء تُسقِط الناتج (لا ملفّ)،
      وناتجُ النجاح يحمل caps الصيغة.
   ٣) buildReport: يقرأ plan وreport فقط، ويفصل التحذير عن الملاحظة. */
import {shim,shimCanvas,group,groupAsync,ok,eq,deep,summary} from "./harness.js";
shim(); shimCanvas();
const {S,newState,ensureShape}=await import("../core/state.js");
const W=await import("../core/walls.js");
const RN=await import("../core/render.js");
const L=await import("../core/layers.js");
const D=await import("../core/dims.js");
const EX=await import("../io/export.js");
const RP=await import("../io/report.js");
const ST=await import("../io/style.js");

const reset=()=>{newState(); ensureShape(); RN.invalidate()};
const room=()=>{
 const P=[[0,0],[4000,0],[4000,3000],[0,3000]];
 for(let i=0;i<4;i++)W.addWall(P[i],P[(i+1)%4],200,"ext","c");
 RN.invalidate();
};
const has=(list,lv,re)=>list.some(m=>m.lv===lv&&re.test(m.s));

group("preflight — رسمٌ فارغ يمنع",()=>{
 reset();
 const r=EX.preflight("svg");
 ok(has(r,"er",/فارغ/),"الرسم الفارغ ⇒ er");
 eq(r.filter(m=>m.lv==="er").length,1,"وخطأٌ واحد لا سيل رسائل");
});

group("preflight — رسمٌ سليم لا يمنع",()=>{
 reset(); room();
 const r=EX.preflight("svg");
 ok(!r.some(m=>m.lv==="er"),"غرفةٌ سليمة ⇒ لا er");
});

group("preflight — كلُّ ما يُرى لا يُطبَع",()=>{
 reset(); room();
 L.setLay("A-WALL","plot",0);
 RN.invalidate();
 const r=EX.preflight("pdf");
 ok(has(r,"er",/قابلة للطباعة/),"طبقةُ الجدران مرئيّةٌ غير مطبوعة ⇒ er");
});

group("preflight — نصٌّ خارج CP1256 يُقال في DXF وحده",()=>{
 reset(); room();
 D.addText([1000,1000],"你好 abc",1,0,"bc");
 RN.invalidate();
 ok(has(EX.preflight("dxf"),"in",/DXF/),"DXF: ملاحظةٌ بالمحارف");
 ok(!EX.preflight("svg").some(m=>/DXF/.test(m.s)),
  "SVG: لا ملاحظة (يحمل Unicode)");
 reset(); room();
 D.addText([1000,1000],"غرفة نوم",1,0,"bc");
 RN.invalidate();
 ok(!EX.preflight("dxf").some(m=>m.lv==="in"&&/محارف/.test(m.s)),
  "العربية داخل CP1256 فلا ملاحظة");
});

await groupAsync("run — النجاح يحمل caps ويعطي ملفّاً",async()=>{
 reset(); room();
 for(const fmt of ["dxf","svg"]){
  const r=await EX.run(fmt,{});
  eq(r.ok,1,`${fmt}: ok`);
  ok(r.size>0,`${fmt}: حجمٌ موجب`);
  deep(r.caps,ST.CAPS[fmt],`${fmt}: caps هي جدول الصيغة نفسه`);
 }
});

await groupAsync("run — فارغٌ يعود ok:0 برسالة",async()=>{
 reset();
 const r=await EX.run("svg",{});
 eq(r.ok,0,"ok:0");
 ok(has(r.report,"er",/فارغ/),"والرسالة تقول السبب");
 eq(r.blob,null,"ولا ملفّ");
});

await groupAsync("run — الإلغاء قبل البدء",async()=>{
 reset(); room();
 const r=await EX.run("svg",{signal:{aborted:true}});
 eq(r.ok,0,"ok:0");
 ok(has(r.report,"in",/أُلغي/),"رسالة الإلغاء");
 eq(r.blob,null,"لا blob");
 eq(r.raw,null,"ولا raw");
});

await groupAsync("run — الإلغاء أثناء البناء يُسقِط الناتج",async()=>{
 reset(); room();
 /* الإشارة تنقلب بعد أوّل قراءة: قبل البدء سليمة، وبعد البناء ملغاة —
    كمن ضغط «إلغاء» أثناء PNG/PDF */
 let reads=0;
 const sig={get aborted(){reads++; return reads>1}};
 const r=await EX.run("svg",{signal:sig});
 eq(r.ok,0,"ok:0 رغم اكتمال البناء");
 ok(has(r.report,"in",/أُلغي/),"رسالة الإلغاء");
 eq(r.blob,null,"لا blob يُنزَّل");
 ok(reads>=2,"فُحصت الإشارة بعد البناء لا قبله فقط");
});

group("buildReport — يفصل التحذير عن الملاحظة",()=>{
 const plan={name:"a.svg",fmt:"svg",scale:100,page:null,box:{x0:0,y0:0,x1:1,y1:1}};
 const res={size:1234,caps:{dash:1},report:[
  {lv:"ok",s:"رأس"},{lv:"wr",s:"تحذير"},{lv:"in",s:"ملاحظة"},
  {lv:"wr",s:"تحذير ٢"}]};
 const r=RP.buildReport(plan,res);
 eq(r.app,"civildraft","اسم التطبيق");
 eq(r.file,"a.svg","الملفّ");
 eq(r.fmt,"svg","الصيغة");
 eq(r.size,1234,"الحجم");
 deep(r.warnings,["تحذير","تحذير ٢"],"التحذيرات بترتيبها");
 deep(r.notes,["ملاحظة"],"الملاحظات");
 deep(r.caps,{dash:1},"caps من النتيجة");
 ok(!isNaN(Date.parse(r.date)),"تاريخٌ ISO صالح");
 eq(RP.buildReport(plan,null).warnings.length,0,"نتيجةٌ غائبة لا ترمي");
 eq(RP.buildReport(plan,{report:[]}).caps,null,"وcaps الغائبة null");
});

await groupAsync("التقرير من تصديرٍ حقيقيّ",async()=>{
 reset(); room();
 const r=await EX.run("svg",{});
 const rep=RP.buildReport(r.plan,r);
 eq(rep.file,r.name,"اسم الملفّ من التصدير نفسه");
 eq(rep.scale,S.meta.scale,"والمقياس");
 ok(rep.size>0,"والحجم");
 deep(rep.caps,ST.CAPS.svg,"وcaps الصيغة");
});
process.exit(summary()?1:0);
