/* ═══ المرحلة A — وسم التفصيلة DC ═══
   node js/tests/phaseA-callouts.test.js */
import {shim,group,ok,eq,throws,summary} from "./harness.js";
shim();
const {S,newState,ensureShape}=await import("../core/state.js");
const CO=await import("../core/callouts.js");
const SH=await import("../core/sheet.js");
const RN=await import("../core/render.js");
const reset=()=>{newState(); ensureShape(); RN.invalidate()};
const rect=(x)=>({modelRect:{x0:0,y0:0,x1:10000,y1:10000},
 paperRect:{x0:10,y0:10+x,x1:200,y1:150+x}});
const mk=()=>{
 const sh1=SH.addSheet({name:"ورقة أ"}), sh2=SH.addSheet({name:"ورقة ب"});
 const v1=SH.addViewport(sh1.id,rect(0)), v2=SH.addViewport(sh2.id,rect(20));
 return {sh1,sh2,v1,v2};
};

group("الإنشاء والترقيم",()=>{
 reset(); const {sh1,sh2,v1,v2}=mk();
 const c=CO.addCallout({srcSheet:sh1.id,srcVp:v1.id,tgtSheet:sh2.id,tgtVp:v2.id,pos:[5000,5000]});
 eq(c.label,"A","أول وسم A"); eq(CO.nextCalloutLabel(),"B","التالي B");
 ok(CO.calloutById(c.id)===c,"calloutById");
 const n=S.callouts.length;
 throws(()=>CO.addCallout({srcSheet:sh1.id,srcVp:"مجهول",tgtSheet:sh2.id,tgtVp:v2.id,pos:[0,0]}),null,"منفذ مصدر مجهول");
 eq(S.callouts.length,n,"لا كتابة عند الرفض");
 ok(CO.delCallout(c.id)&&!CO.delCallout(c.id),"delCallout مرّة واحدة");
 eq(CO.nextCalloutLabel(),"A","الفجوة تُعاد");
});

group("الأوّليات وتركيب الورقة",()=>{
 reset(); const {sh1,sh2,v1,v2}=mk();
 const c=CO.addCallout({srcSheet:sh1.id,srcVp:v1.id,tgtSheet:sh2.id,tgtVp:v2.id,pos:[5000,5000]});
 const pr=CO.calloutPrims(c);
 ok(pr.length===2&&pr.every(g=>g.covp===v1.id&&g.L==="A-CALLOUT"),"رمزٌ بعلامة covp");
 const a=SH.composeSheet(sh1,pr,{}).prims.filter(g=>g.L==="A-CALLOUT");
 ok(a.length>=2,"يظهر في تركيب ورقة المصدر");
 const b=SH.composeSheet(sh2,pr,{}).prims.filter(g=>g.L==="A-CALLOUT");
 ok(b.length===1&&b[0].t==="text"&&b[0].s===CO.calloutTitleLine(c),"الهدف يحمل السطر وحده بلا الرمز");
 ok(/^تفصيلة A — ورقة أ$/.test(CO.calloutTitleLine(c)),"نصّ السطر");
 eq(b[0].h,3.5,"مقاسٌ ورقيٌّ ثابت");
});

group("اليتيم في ensureShape",()=>{
 reset(); const {sh1,sh2,v1,v2}=mk();
 CO.addCallout({srcSheet:sh1.id,srcVp:v1.id,tgtSheet:sh2.id,tgtVp:v2.id,pos:[1,1]});
 S.sheets=S.sheets.filter(s=>s.id!==sh2.id);
 ensureShape();
 eq(S.callouts.length,0,"وسمٌ يتيم يُسقَط");
});

process.exit(summary()?1:0);
