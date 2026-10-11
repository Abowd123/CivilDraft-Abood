/* ═══ أدوات سحب المراجعة ═══
   cloud: حلقة حرّة. cloude: سحابة تلتفّ حول محيط تحديدٍ قائم.
   (الاختصاران rcl/rcle لا rc — فـ«rc» محجوز لمعايرة المرجع refcal.) */
import {m2,sqm} from "../core/units.js";
import {pArea} from "../core/geom.js";
import {outlineOf} from "../core/ents.js";
import {addCloud} from "../core/clouds.js";
import {defTool,H,rec,finish,ovLen,pvPoly} from "./registry.js";

const GRN="#5cd98e";

defTool({
 id:"cloud", alias:"rcl cloud سحابه مراجعه غيمه", label:"سحابة مراجعة",
 hint:"نقاط الحلقة · C أو Enter يغلق · نصف قطر الفَلَقة في الخيارات",
 opts:[
  {k:"r",label:"نصف قطر الفَلَقة م",type:"len",def:"0.5"}],
 steps:[
  {p:"النقطة الأولى"},
  {p:"النقطة التالية", loop:1, base:-1,
   opts:{
    c:{n:"إغلاق",run(ctx){
     if(ctx.pts.length<3)throw new Error("الإغلاق يحتاج ثلاث نقاط");
     finish("أُغلقت السحابة");
    }}}}],
 done(ctx){
  if(ctx.pts.length<3)
   throw new Error("السحابة تحتاج 3 نقاط على الأقل");
  const c=addCloud(ctx.pts,{r:ovLen("cloud","r")});
  rec(ctx,c,"clouds");
  H.rep("ok",`${c.id} · ${c.label} · ${sqm(Math.abs(pArea(c.ring)))} م² · `
   +`${m2(c.r)} م`);
 },
 prev(ctx,g){
  const P=ctx.pts.concat(g?[g]:[]);
  return (P.length>1)?[pvPoly(P,GRN,1)]:[];
 }});

/* سحابة حول التحديد: محيطُ كل عنصر مغلقٍ في التحديد يصير حلقةً.
   أمرٌ لحظيّ: يعيد false فيُثبِّت registry ما صُنع بخطوة تاريخٍ واحدة
   (لا own — فـstart داخل معاملة الأداة). */
defTool({
 id:"cloude", alias:"rcle سحابه_التحديد", label:"سحابة حول التحديد",
 hint:"حدّد عناصر مغلقة ثم شغّل الأمر · نصف القطر: rcle r=0.3",
 opts:[
  {k:"r",label:"نصف قطر الفَلَقة م",type:"len",def:"0.5"}],
 start(ctx){
  const L=(H.sel&&H.sel())||[];
  const rings=L.map(s=>outlineOf(s)).filter(r=>r&&r.length>2);
  if(!rings.length){
   H.rep("wr","حدّد عناصر لها محيط مغلق أولاً");
   return false;
  }
  let n=0;
  rings.forEach(r=>{
   try{rec(ctx,addCloud(r,{r:ovLen("cloude","r")}),"clouds"); n++}
   catch(e){H.rep("er",e.message)}
  });
  H.rep(n?"ok":"wr",n?`${n} سحابة حول التحديد`:"لم تُنشأ سحابة");
  return false;                    /* أمر لحظي — لا خطوات */
 },
 steps:[]});
