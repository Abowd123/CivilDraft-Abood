/* ═══ أمر الواجهة ═══
   أداةٌ فوريّة بلا خطوات — كboq: منطقُها في start وتعود false، فلا
   تدخل وضعَ التقاط نقاط.

   ولا تعدّل شيئاً: لا rec ولا dirty ولا edit. القراءةُ لا تدخل
   التاريخ، وضغطُ التراجع بعدها يتراجع عمّا قبلها.

   arg:1 يُعلن أنها تقبل وسيطاً من سطر الإدخال — «ELEV S» و
   «ELEV 315». */
import {S} from "../core/state.js";
import {elevCmd,elevSay} from "../core/elevation.js";
import {elevFile} from "../io/elev.js";
import {dl} from "../io/project.js";
import {m2} from "../core/units.js";
import {defTool,H,ov,ovLen,ovNum,ovOn} from "./registry.js";

/* الوسيط يسبق الخيار: ما كتبتَه في السطر أصدقُ من لوحةٍ لزجة */
export function viewArg(arg){
 if(arg!=null&&String(arg).trim()!=="")return arg;
 const v=ov("elev","view");
 return (v==="ang")?ovNum("elev","ang"):(v||"S");
}
export function runElev(arg){
 const gap=Math.max(0,ovLen("elev","gap")||0);
 const e=elevCmd(viewArg(arg),{gap});     /* يرمي إن لا جدار يواجه */

 H.rep("ok",elevSay(e));
 e.runs.forEach(r=>{
  H.rep("in",`${r.id}: ${m2(r.x0)} → ${m2(r.x1)} م · `
   +`${r.opens} فتحة${r.flip?" · معكوس":""}`
   +(r.sure?"":" · جهةُ خارجه غير محسومة"));
 });
 e.warn.forEach(w=>H.rep("wr",w.msg));

 const fmt=String(ov("elev","fmt")||"none");
 if(fmt==="none")return e;
 const F=elevFile(fmt,e);
 F.notes.forEach(s=>H.rep("wr",s));
 if(F.bad)H.rep("wr",`${F.bad} محرفاً تعذّر ترميزه`);
 if(ovOn("elev","save")){
  const size=dl(F.name,(F.txt!=null)?F.txt:F.bytes,F.mime);
  H.rep("ok",`نُزّل ${F.name}`+(size?` · ${size} بايت`:""));
 }else{
  H.rep("in",`${F.name} جاهز — شغّل «نزّل الملفّ» ليُكتَب`);
 }
 return e;
}
defTool({
 id:"elev", stay:1, alias:"واجهة الواجهة elevation",
 label:"واجهة", arg:1,
 hint:"يفرد الجدران الخارجية المواجهة · ELEV S أو ELEV 315 — "
  +"ولا تتحدّث تلقائياً بعدها",
 opts:[
  {k:"view", label:"الاتجاه", type:"sel", def:"S", items:[
   ["S","جنوبية"],["N","شمالية"],["E","شرقية"],["W","غربية"],
   ["ang","زاوية حرّة"]]},
  {k:"ang",  label:"الزاوية (°)", type:"num", def:"0"},
  {k:"gap",  label:"فاصل بين الفرود", type:"len", def:"0"},
  {k:"fmt",  label:"التصدير", type:"sel", def:"none", items:[
   ["none","لا شيء"],["svg","SVG"],["dxf","DXF"],["pdf","PDF"]]},
  {k:"save", label:"نزّل الملفّ", type:"chk", def:1}],
 start(ctx){
  if(!S.walls.some(w=>w.type==="ext")){
   H.rep("in",'لا جدار خارجيّ — الواجهة تُبنى من type="ext" وحدها');
   return false;
  }
  runElev(ctx.arg);        /* الرمي يبلغ H.rep عبر مصيدة begin */
  return false;            /* أمرٌ لحظيّ — لا خطوات */
 },
 steps:[]});
