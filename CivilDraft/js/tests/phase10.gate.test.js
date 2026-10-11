import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const {S,newState}=await import("../core/state.js");
const {addWall}=await import("../core/walls.js");
const {boq,wallDetailRows}=await import("../core/boq.js");
const {toCSV}=await import("../io/boq.js");
const {scene}=await import("../core/render.js");
const {toDXFBytes}=await import("../io/dxf.js");

group("124-133: BOQ دقيق فردي + BOM+CRLF",()=>{
 newState(); const w=addWall([0,0],[4000,0],200,"int","c"); w.bulge=0.2;
 S.meta.name='خطة, ١ "رئيسية"';
 const B=boq(); const C=toCSV(B,{sep:"\r\n"});
 ok(C.txt.charCodeAt(0)===0xFEFF,"BOM"); ok(C.txt.includes("\r\n"),"CRLF");
 ok(C.txt.includes('"'),"اقتباس");
 const d=wallDetailRows()[0]; ok(d.face===Math.round(d.len*d.h),"face فردي");
 ok(d.vol===Math.round(d.len*d.h*d.t),"vol للقوس = len×h×t (G9-6-12)");
});
group("132: الشاشة والمصدّر نفس الأوليات",()=>{
 newState(); addWall([0,0],[1000,0],200,"int","c");
 const P=scene().P; const r=toDXFBytes(P,{x0:0,y0:0,x1:1000,y1:1000});
 ok(r.bytes.length>0,"DXF صدر من نفس P"); eq(P,scene().P,"P لم يتغير");
});
process.exit(summary()?1:0);
