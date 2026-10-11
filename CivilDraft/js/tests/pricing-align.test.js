import {shim,group,eq,ok,summary} from "./harness.js";
shim();
const {S,newState,ensureShape}=await import("../core/state.js");
const {addWall}=await import("../core/walls.js");
const {addOpen}=await import("../core/opens.js");
const {boq}=await import("../core/boq.js");
const {pricingItems,boqWallKey,boqOpenKey}=await import("../tools/boq.js");
const {price}=await import("../core/pricing.js");

group("مفاتيح التسعير من تصنيف BOQ — W5",()=>{
 newState();
 S.meta.wallH=3000; S.meta.scale=100;
 const ext=addWall([0,0],[4000,0],250,"ext","c");
 addWall([0,1000],[4000,1000],150,"int","c");
 addWall([0,2000],[4000,2000],200,"low","c",1000);
 addOpen(ext,1000,"door",900,2100,0);
 addOpen(ext,3000,"window",1200,1400,900);
 ensureShape();

 const items=pricingItems(boq());
 ok(items.some(i=>i.key==="wall_ext"),"الجدار الخارجي بمفتاحه");
 ok(items.some(i=>i.key==="wall_int"),"الجدار الداخلي بمفتاحه");
 ok(items.some(i=>i.key==="wall_low"),"السترة بمفتاحها");
 ok(!items.some(i=>i.key==="wall"&&i.qty>0),"لا مفتاح wall عامّ بعد اليوم");

 eq(boqWallKey("ext"),"wall_ext","الخريطة صريحة: ext");
 eq(boqOpenKey("arch"),"door","قوس → باب");
 eq(boqOpenKey("sliding"),"door","انزلاق → باب");
 eq(boqOpenKey("fixed"),"window","فكس → شباك");

 const P=price(items);
 ok(P.rows.some(r=>r.key==="wall_ext"&&r.rate===120),
  "سعر الجدار الخارجي مأخوذ من البند المفصّل");
});

process.exit(summary());
