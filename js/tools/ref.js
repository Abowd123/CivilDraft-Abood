/* ═══ أدوات المرجع ═══
   ثلاثتها تكتب في التحويل المخزَّن ولا تلمس إحداثيات المرجع —
   فلا تراكم ولا فقدان للأصل.
   وثلاثتها destruct: تحرّك ما هو معروضٌ سلفاً وتُبطِل معايرةً
   قائمة، فلا يُصدِرها المزوّد بلا تصريح. */
import {S} from "../core/state.js";
import {m3,arrow,pt2} from "../core/units.js";
import {hasRef,alignRef,calRef,moveRef} from "../core/ref.js";
import {defTool,H,dirty,ovLen,pvLine} from "./registry.js";

const YEL="#ffd06b", GRN="#5cd98e";
const need=()=>{
 if(hasRef())return true;
 H.rep("wr","لا مرجع مستورد — استورد DXF أوّلاً من لوحة المرجع");
 return false;
};
/* ═══ محاذاة: نقطتان على المرجع ثم موضعهما الصحيح ═══ */
defTool({
 id:"refalign", alias:"ra حاذِ محاذاه", label:"محاذاة المرجع",
 hint:"نقطتان على المرجع ثم وجهتاهما — يُحسَب النقل والدوران والمقياس",
 destruct:1,
 opts:[],
 start(){return need()},
 steps:[
  {p:"النقطة الأولى على المرجع"},
  {p:"النقطة الثانية على المرجع", base:0},
  {p:"وجهة النقطة الأولى", base:"none"},
  {p:"وجهة النقطة الثانية", base:2,
   each(ctx,p){
    const r=alignRef(ctx.pts[0],ctx.pts[1],ctx.pts[2],p);
    dirty(ctx);
    H.rep("ok",`المرجع: مقياس ×${r.k.toFixed(5)} · دوران `
     +`${r.rot.toFixed(2)}° · ${arrow(m3(r.from),m3(r.to))} م`);
    H.rep("in","الإحداثيات المستوردة لم تُمَسّ — التحويل مخزَّن "
     +"فالمحاذاة التالية لا تتراكم على هذه");
   }}],
 prev(ctx,g){
  const P=ctx.pts;
  if(!g)return [];
  if(P.length===1)return [pvLine(P[0],g,YEL)];
  if(P.length===2)return [pvLine(P[0],P[1],YEL),
   pvLine(P[1],g,"#3d4a58")];
  if(P.length===3)return [pvLine(P[0],P[1],YEL),
   pvLine(P[2],g,GRN)];
  return [];
 }});

/* ═══ معايرة: مسافة تعرفها ═══ */
defTool({
 id:"refcal", alias:"rc عاير معايره", label:"معايرة المرجع",
 hint:"نقطتان على المرجع ثم المسافة الحقيقية بينهما",
 destruct:1,
 opts:[{k:"d",label:"المسافة الحقيقية م",type:"len",def:"1"}],
 start(){return need()},
 steps:[
  {p:"النقطة الأولى"},
  {p:"النقطة الثانية", base:0,
   each(ctx,p){
    const r=calRef(ctx.pts[0],p,ovLen("refcal","d"));
    dirty(ctx);
    H.rep("ok",`عُوير المرجع ×${r.k.toFixed(5)} · `
     +`${arrow(m3(r.was),m3(r.now))} م`);
    if(S.ref.guessed)
     H.rep("in","الوحدة كانت مفترضة مليمتراً — صارت معايرتك هي "
      +"المرجع");
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g)return [];
  return [pvLine(ctx.pts[0],g,GRN)];
 }});

/* ═══ نقل ═══ */
defTool({
 id:"refmove", alias:"rm انقل_المرجع", label:"نقل المرجع",
 hint:"نقطة أساس ثم وجهتها",
 destruct:1,
 opts:[],
 start(){return need()},
 steps:[
  {p:"نقطة الأساس"},
  {p:"الوجهة", base:0,
   each(ctx,p){
    const r=moveRef(ctx.pts[0],p);
    dirty(ctx);
    H.rep("ok",`نُقل المرجع ${pt2([r.dx,r.dy])} م`);
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g)return [];
  return [pvLine(ctx.pts[0],g,YEL)];
 }});
