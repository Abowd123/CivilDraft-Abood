/* ═══ أبعاد نصف القطر / القطر / الزاوي (المرحلة C2) ═══
   يغطّي الأنواع الثلاثة: القيمة والنصّ والأدوات المسجَّلة ومسار
   النقرات الكامل عبر المحرّك. التشغيل: node js/tests/dimRadAng.test.js */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();

const ST=await import("../core/state.js");
const {S,DEF,loadState,clearHistory,ensureShape}=ST;
const D=await import("../core/dims.js");
await import("../tools/annotate.js");
const R=await import("../tools/registry.js");

const reset=()=>{loadState(DEF(),true); clearHistory(); ensureShape();
 S.meta.dimDec=3};

group("dimRadAng — القيمة والنصّ للأنواع الثلاثة",()=>{
 reset();
 const r=D.addDimRad([0,0],1500,[2000,0]);
 eq(D.dimValue(r),1500,"قيمة نصف القطر");
 eq(D.dimText(r),"R 1.500","نصّ نصف القطر");
 const d=D.addDimDia([0,0],1500,[2000,0]);
 eq(D.dimValue(d),3000,"قيمة القطر");
 eq(D.dimText(d),"⌀ 3.000","نصّ القطر");
 const a=D.addDimAng([0,0],[1000,0],[0,1000],1000);
 ok(Math.abs(D.dimValue(a)-90)<0.1,"زاوية ٩٠°");
 eq(D.dimText(a),"90.0°","نصّ الزاوية");
 eq(S.dims.length,3,"ثلاثة أبعاد في الحالة");
});

group("dimRadAng — الأدوات الثلاث مسجَّلة بأسمائها المستعارة",()=>{
 ["dimrad","dimdia","dimang"].forEach(id=>
  ok(R.TOOLS[id]&&R.TOOLS[id].id===id,`الأداة ${id} مسجَّلة`));
 eq(R.findTool("dra").id,"dimrad","الاختصار dra");
 eq(R.findTool("ddi").id,"dimdia","الاختصار ddi");
 eq(R.findTool("dan").id,"dimang","الاختصار dan");
});

group("dimRadAng — مسار النقرات الكامل",()=>{
 reset();
 R.begin("dimrad");
 R.feedPoint([0,0]); R.feedPoint([1500,0]); R.feedPoint([2500,500]);
 R.cancel(true);
 eq(S.dims.length,1,"dimrad أنشأ بُعداً");
 eq(S.dims[0].kind,"rad","النوع rad");
 eq(S.dims[0].r,1500,"نصف القطر ١٥٠٠");
 eq(S.dims[0].leader.join(),"2500,500","موضع النصّ محفوظ");

 reset();
 R.begin("dimdia");
 R.feedPoint([1000,1000]); R.feedPoint([1000,2000]); R.feedPoint([3000,1000]);
 R.cancel(true);
 eq(S.dims.length,1,"dimdia أنشأ بُعداً");
 eq(D.dimValue(S.dims[0]),2000,"القطر ٢٠٠٠");

 reset();
 R.begin("dimang");
 R.feedPoint([0,0]); R.feedPoint([3000,0]); R.feedPoint([0,3000]);
 R.cancel(true);
 eq(S.dims.length,1,"dimang أنشأ بُعداً");
 ok(Math.abs(D.dimValue(S.dims[0])-90)<0.1,"الزاوية ٩٠°");
 ok(S.dims[0].r>=800&&S.dims[0].r<=4000,"نصف قطر القوس ضمن الحدّ");
});

group("dimRadAng — الأدوات تبقى فعّالة (restart) وقيمٌ فاسدة تُرفَض",()=>{
 reset();
 R.begin("dimrad");
 R.feedPoint([0,0]); R.feedPoint([1000,0]); R.feedPoint([1500,0]);
 ok(R.active(),"الأداة فعّالة بعد أول عنصر");
 eq(R.T.i,0,"عادت إلى الخطوة الأولى");
 R.feedPoint([0,0]); R.feedPoint([3,0]);
 eq(R.T.i,1,"نقطة قريبة من المركز لا تتقدّم بالخطوة");
 eq(S.dims.length,1,"نصف قطر أقل من ١٠ مم لا يُنشِئ بُعداً");
 R.cancel(true);
});

group("dimRadAng — المعاينة",()=>{
 reset();
 R.begin("dimang");
 R.feedPoint([0,0]);
 eq(R.T.def.prev(R.T.ctx,[500,0]).length,1,"معاينة بعد نقطة");
 R.feedPoint([1000,0]);
 eq(R.T.def.prev(R.T.ctx,[0,500]).length,2,"معاينة بعد نقطتين");
 R.cancel(true);
});

group("dimRadAng — الهندسة والرسم والتصدير (line/arc/text فقط)",()=>{
 reset();
 const r=D.addDimRad([0,0],1500,[2000,0]);
 const d=D.addDimDia([0,0],1500,[2000,0]);
 const a=D.addDimAng([0,0],[1000,0],[0,1000],1000);
 const gr=D.dimGeomRad(r);
 eq(gr.r,1500,"dimGeomRad نصف القطر");
 eq(gr.c.join(),"0,0","dimGeomRad المركز");
 const ga=D.dimGeomAng(a);
 ok(Math.abs(ga.sweep-90)<0.1,"dimGeomAng المدى ٩٠°");
 eq(D.fmtAng(90),"90.0°","fmtAng");
 [[r,D.dimPrimsRad],[d,D.dimPrimsRad],[a,D.dimPrimsAng]].forEach(([e,fn])=>{
  const P=fn(e);
  ok(P.length>0,`${e.kind}: بدائل مرسومة`);
  ok(P.every(x=>["line","arc","text"].includes(x.t)),
   `${e.kind}: أنواع البدائل line/arc/text فقط`);
  ok(P.some(x=>x.t==="text"&&x.s===D.dimText(e)),`${e.kind}: نصّ القيمة`);
  eq(D.dimPrims(e).length,P.length,`${e.kind}: dimPrims يفوّض`);
 });
});

process.exit(summary()?1:0);
