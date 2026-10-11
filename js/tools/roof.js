/* ═══ أداة السقف — B2 ═══
   نقاط الحلقة تتراكم في ctx.pts (يدفعها feedPoint نفسُه — فلا each
   هنا يدفعها ثانيةً). Enter أو C يُغلق فيُنشأ السقف في done. */
import {addRoof,RTYPE} from "../core/roof.js";
import {defTool,H,rec,ov,ovNum,pvLine,finish,undoStep} from "./registry.js";

const BLU="#86ccf0";

defTool({
 id:"roof", alias:"rf سقف", label:"سقف",
 hint:"نقاط الحلقة · Enter أو C يُغلق · Esc يلغي · U يتراجع",
 opts:[
  {k:"type", label:"النوع", type:"sel",
   items:Object.keys(RTYPE).map(k=>[k,RTYPE[k]]), def:"flat"},
  {k:"slope",label:"الميل %",type:"num", def:5}],
 steps:[
  {p:"نقطة 1"},
  {p:"نقطة 2", base:-1},
  {p:"نقطة تالية (Enter يُغلق)", loop:1, base:-1, min:1,
   opts:{
    c:{n:"إغلاق",run(){finish()}},
    u:{n:"تراجع",run(){undoStep()}}}}],
 done(ctx){
  if(ctx.pts.length<3)
   throw new Error("السقف يحتاج 3 نقاط على الأقل");
  const r=addRoof(ctx.pts,{type:ov("roof","type"),
   slope:ovNum("roof","slope")});
  rec(ctx,r,"roofs");
  H.rep("ok",`${r.id} · ${RTYPE[r.type]} ${r.slope}%`);
 },
 prev(ctx,g){
  const P=ctx.pts.concat(g?[g]:[]), o=[];
  for(let i=0;i<P.length-1;i++)o.push(pvLine(P[i],P[i+1],BLU));
  if(P.length>2)o.push(pvLine(P[P.length-1],P[0],BLU));
  return o;
 }});
