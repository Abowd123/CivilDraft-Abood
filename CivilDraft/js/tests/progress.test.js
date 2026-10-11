/* ═══ عملٌ طويل بتقدّمٍ وإلغاء · وحفظ التركيز ═══
   node js/tests/progress.test.js
   ui/overlay.withProgress: صفٌّ في #log بزرّ إلغاء، يُزال بعد العمل
   نجح أو فشل، وعمليةٌ واحدة في وقتٍ واحد، والإلغاء يقلب الإشارة.
   ui/cmdline.keepFocus: يُعيد التركيز إلى #clIn إن ضاع إلى body فقط. */
import {shim,shimCanvas,shimDOM,click,group,groupAsync,ok,eq,summary} from "./harness.js";
shim(); shimCanvas();
const doc=shimDOM();
const IDS=["top","appBtn","qat","appMenu","ribbon","tools","optbar",
 "main","stripS","side","work","stage","cv","vpLabel","navbar",
 "compass","dynBox","qpCard","qpHead","qpClose","qpBody","cmdWrap",
 "cmdline","clPrompt","clIn","clLive","clSug","log","status",
 "stItems","osPop","stMenu","vMenu","cmdFloat","cMenu","ctxMenu",
 "helpBox","pPark","floats","pMenu","wsMenu","sideE","stripE"];
doc.body.innerHTML=IDS.map(id=>`<div id="${id}"></div>`).join("");
(()=>{
 const st=doc.getElementById("stage");
 const old=doc.getElementById("cv");
 if(old)old.remove();
 const cv=doc.createElement("canvas");
 cv.setAttribute("id","cv");
 st.appendChild(cv);
 const g=doc.getElementById.bind(doc);
 doc.getElementById=id=>(id==="cv")?cv:g(id);
})();
const OV=await import("../ui/overlay.js");
const CL=await import("../ui/cmdline.js");
const log=()=>doc.getElementById("log");
const tick=()=>new Promise(r=>setTimeout(r,5));

await groupAsync("withProgress — صفٌّ بزرّ إلغاء يُزال بعد النجاح",async()=>{
 let seen=0, sig=null;
 const r=await OV.withProgress("يُبنى",async s=>{
  sig=s; seen=log().children.length;
  ok(!!log().querySelector("button"),"زرّ الإلغاء موجود أثناء العمل");
  ok(OV.getSignal()===s,"getSignal تعيد إشارة العملية الجارية");
  return 42;
 });
 eq(r,42,"تُعيد قيمة العملية");
 eq(seen,1,"صفٌّ واحد أثناء العمل");
 eq(log().children.length,0,"والصفّ يُزال بعد انتهائها");
 eq(OV.getSignal(),null,"ولا إشارة جارية بعدها");
 ok(sig&&!sig.aborted,"ولم تُلغَ");
});

await groupAsync("withProgress — الفشل يُزيل الصفّ ويُمرِّر الخطأ",async()=>{
 let err=null;
 try{await OV.withProgress("x",async()=>{throw new Error("boom")})}
 catch(e){err=e}
 ok(err&&err.message==="boom","الخطأ يصل للمستدعي");
 eq(log().children.length,0,"والصفّ أُزيل");
 eq(OV.getSignal(),null,"والحالة نُظِّفت");
});

await groupAsync("withProgress — عمليةٌ واحدة في وقتٍ واحد",async()=>{
 let release; const gate=new Promise(r=>{release=r});
 const first=OV.withProgress("أ",()=>gate);
 await tick();
 let err=null;
 try{await OV.withProgress("ب",async()=>1)}catch(e){err=e}
 ok(err&&/أخرى/.test(err.message),"الثانية تُرفَض بسببٍ مقروء");
 eq(log().children.length,1,"ولا صفَّ ثانياً");
 release(); await first;
 eq(log().children.length,0,"وبعد الأولى يُسمَح من جديد");
});

await groupAsync("withProgress — زرّ الإلغاء يقلب الإشارة",async()=>{
 let release, sig=null; const gate=new Promise(r=>{release=r});
 const p=OV.withProgress("ج",s=>{sig=s; return gate});
 await tick();
 ok(sig&&!sig.aborted,"قبل الضغط: غير ملغاة");
 const bt=log().querySelector("button");
 click(bt);
 ok(sig.aborted,"بعد الضغط: ملغاة");
 ok(bt.disabled,"والزرّ يُعطَّل فلا يُضغط مرّتين");
 release(); await p;
 eq(log().children.length,0,"والصفّ يُزال");
});

group("keepFocus — يُعيد التركيز إن ضاع فقط",()=>{
 ok(typeof CL.keepFocus==="function","مُصدَّرة");
});
await groupAsync("keepFocus — التركيز الضائع يعود إلى #clIn",async()=>{
 const inp=doc.getElementById("clIn");
 doc.activeElement=doc.body;
 CL.keepFocus(); await tick();
 ok(doc.activeElement===inp,"ضاع إلى body ⇒ عاد إلى #clIn");
});
await groupAsync("keepFocus — لا يسرق التركيز من حقلٍ آخر",async()=>{
 const other=doc.createElement("input");
 doc.body.appendChild(other);
 other.focus();
 CL.keepFocus(); await tick();
 ok(doc.activeElement===other,"حقلٌ آخر يكتب فيه المستخدم يبقى مركَّزاً");
});
process.exit(summary()?1:0);
