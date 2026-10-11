/* ═══ بوابة R3 — محرّر طبقات المنفذ ومقياسه ═══
   ساكنٌ على المصدر: المفاتيح data- موجودة ولا سمة style (CSP) ·
   سلوكيٌّ على النواة: updateViewport يطبّق الترشيح كما تقتضيه
   لوحة المنفذ. */
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {shim,group,ok,eq,deep,summary} from "./harness.js";
shim();
const {S,DEF,loadState,edit}=await import("../core/state.js");
const SH=await import("../core/sheet.js");
const P=readFileSync(
 fileURLToPath(new URL("../ui/props.js",import.meta.url)),"utf8");

group("محرّر المنفذ — ساكن (CSP + مفاتيح)",()=>{
 ok(/data-vpvis=/.test(P),"زر إظهار/إخفاء المنفذ موجود");
 ok(/data-vpall=/.test(P),"زر كل الطبقات موجود");
 ok(/data-vpscale=/.test(P),"قائمة المقياس القياسي موجودة");
 ok(/data-vpf=/.test(P),"خانات طبقات المنفذ موجودة");
 ok(!/style\s*=/.test(P),"لا سمة style في المصدر (CSP)");
});

group("محرّر المنفذ — سلوك الترشيح",()=>{
 loadState(DEF(),true);
 const sh=edit(()=>SH.addSheet({name:"م",size:"A2",orient:"l"}),
  "ورقة");
 const vp=edit(()=>SH.addViewport(sh.id,{
  modelRect:{x0:0,y0:0,x1:1000,y1:1000},
  paperRect:{x0:0,y0:0,x1:200,y1:200}}),"منفذ");

 edit(()=>SH.updateViewport(sh.id,vp.id,{layers:["A-WALL"]}),
  "ترشيح طبقات");
 deep(sh.viewports[0].layers,["A-WALL"],"طبقات المنفذ حُدّثت");
 edit(()=>SH.updateViewport(sh.id,vp.id,{layers:null}),"كل الطبقات");
 eq(sh.viewports[0].layers,null,"الكل أعاد null");
});

process.exit(summary()?1:0);
