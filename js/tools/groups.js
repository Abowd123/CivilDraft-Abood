/* ═══ أدوات المجموعات ═══
   group: يسمّي التحديد الجاري · ungroup: يفكّ · gselect: يحدّد أعضاءها ·
   gmove: يحرّك مجموعةً بنقطتين. لا استيراد من ui/ — التحديد عبر H.
   كلّها أوامرُ لحظيّة بلا own:1: تعمل داخل معاملة begin، فتُثبَّت
   الخطوة في التاريخ (dirty) وتُرجَع كلّها إن رمى start — أي أن
   التجميع والفكّ والتحريك تُتراجَع بـCtrl+Z كبقية الأدوات. */
import {S} from "../core/state.js";
import {groupAdd,groupById,groupByName,groupRemove,
        groupMembers,groupMove} from "../core/groups.js";
import {defTool,H,dirty} from "./registry.js";

const curSel=()=>(H.sel&&H.sel())||[];
const sayMembers=g=>{
 const M=groupMembers(g);
 return `${g.id} · ${g.name} · ${M.length} عضواً (${M.map(m=>m.id).join(" · ")})`;
};
const byArg=a=>groupById(a)||groupByName(a);
const argOf=ctx=>(ctx&&ctx.arg)?String(ctx.arg).trim():"";

defTool({
 id:"group", arg:1, alias:"grp مجموعه جمّع تجميع", label:"تجميع",
 hint:"يجعل التحديد الجاري مجموعةً واحدة · الاسم وسيطٌ: grp <اسم>",
 start(ctx){
  const L=curSel();
  if(L.length<2){H.rep("wr","حدّد عنصرين على الأقل لتجميعهما");return false}
  let nm=argOf(ctx).slice(0,80);
  if(!nm&&typeof window!=="undefined"&&typeof window.prompt==="function"){
   try{nm=String(window.prompt("اسم المجموعة:")||"").trim().slice(0,80)}
   catch(e){nm=""}                       /* احتياط: قد يُحجَب في الـWebView */
  }
  if(!nm){H.rep("wr","المجموعة تحتاج اسماً — اكتب: grp <اسم>");return false}
  const g=groupAdd(nm,L);               /* يرمي بلا كتابة إن فشل */
  dirty(ctx);
  H.rep("ok",sayMembers(g));
  return false;
 },
 steps:[]});

defTool({
 id:"ungroup", arg:1, alias:"ug فك_مجموعه فك_تجميع", label:"فكّ تجميع",
 hint:"بلا وسيطٍ يفكّ مجموعات التحديد الجاري · مع معرّفٍ أو اسمٍ يفكّها هي",
 start(ctx){
  const arg=argOf(ctx)||null;
  const ls=curSel();
  let n=0;
  (S.groups||[]).slice().forEach(g=>{
   const hit=arg?(g.id===arg||g.name===arg)
    :groupMembers(g).some(m=>ls.some(s=>s.k===m.k&&s.id===m.id));
   if(hit&&groupRemove(g.id))n++;
  });
  if(n)dirty(ctx);
  H.rep(n?"ok":"wr",n?`فُكّت ${n} مجموعة`
   :arg?`لا مجموعة «${arg}»`:"لا مجموعة بين المحدَّد");
  return false;
 },
 steps:[]});

defTool({
 id:"gselect", arg:1, alias:"gsel اختر_مجموعه", label:"تحديد مجموعة",
 hint:"بمعرّفٍ أو اسمٍ — يحدّد أعضاءها القابلين للتحديد",
 start(ctx){
  const arg=argOf(ctx);
  if(!arg){H.rep("wr","اكتب معرّف المجموعة أو اسمها");return false}
  const g=byArg(arg);
  if(!g){H.rep("wr",`لا مجموعة «${arg}»`);return false}
  const M=groupMembers(g);
  if(!M.length){H.rep("wr",`«${g.name}»: لا عضو قابل للتحديد (مخفيّ أو مقفل)`);return false}
  H.setSel(M);                          /* عبر H لا استيراداً من canvas */
  H.rep("ok",sayMembers(g));
  return false;
 },
 steps:[]});

defTool({
 id:"gmove", arg:1, alias:"gm حرك_المجموعه", label:"تحريك مجموعة",
 destruct:1,
 hint:"gm <اسم أو معرّف> ثم نقطتا الأساس والوجهة",
 start(ctx){
  const arg=argOf(ctx)||null;
  const g=arg?byArg(arg):null;
  if(!g){H.rep("wr",arg?`لا مجموعة «${arg}»`
   :"اكتب: gm <اسم المجموعة> مثل gm GR1");return false}
  if(!groupMembers(g).length){
   H.rep("wr",`«${g.name}»: لا عضو قابل للتحريك (مخفيّ أو مقفل)`);return false}
  ctx.v.g=g;
  return true;
 },
 steps:[
  {p:"نقطة الأساس"},
  {p:"نقطة الوجهة أو الإزاحة", base:0,
   each(ctx,p){
    const a=ctx.pts[0];
    const n=groupMove(ctx.v.g,p[0]-a[0],p[1]-a[1]);
    dirty(ctx);
    H.rep("ok",`تحرّكت ${ctx.v.g.name} · ${n} عضواً`);
   }}],
 prev(ctx,p){
  if(!ctx||!ctx.pts.length||!p)return [];
  return [{t:"l",a:ctx.pts[0],b:p,c:"#5cd98e"}];
 }});
