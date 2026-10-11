/* ═══ المدقّق التلقائي (AI Linting) ═══
   يجمع فحوصات النواة القائمة في تقريرٍ واحد — يُذكَر ولا يُصلَح خلسة
   (نفس فلسفة ai/ops). لا يكتب على الحالة S إطلاقاً: قراءةٌ فقط.
   كل مشكلة: {sev, code, msg, refs:[ids]} — sev: err|warn|info. */
import {S} from "../core/state.js";
import {looseEnds} from "../core/walls.js";
import {openState} from "../core/opens.js";
import {isStale, netArea} from "../core/areas.js";
import {stCheck} from "../core/stairs.js";

const LOOSE_TOL=2;   /* عتبة الأطراف غير المتّصلة بالمليمتر (كما في ctx) */

function safeOpenState(o){ try{ return openState(o); }catch(_){ return "؟"; } }

const CHECKS=[
 function looseWalls(){
  if(typeof looseEnds!=="function") return [];
  const le=looseEnds(LOOSE_TOL)||[];
  if(!le.length) return [];
  return [{ sev:"warn", code:"loose-ends",
   msg:`${le.length} طرف جدارٍ غير متّصل`,
   refs:le.slice(0,20).map(e=>`${e.id}/${e.end}`) }];
 },
 function badOpenings(){
  if(typeof openState!=="function") return [];
  const bad=(S.opens||[]).filter(o=>{
   try{ return openState(o)!=="ok"; }catch(_){ return false; } });
  if(!bad.length) return [];
  return bad.map(o=>({ sev:"err", code:"open-state",
   msg:`الفتحة ${o.id} على ${o.wall}: ${safeOpenState(o)}`, refs:[o.id] }));
 },
 function staleAreas(){
  if(typeof isStale!=="function") return [];
  const stale=(S.areas||[]).filter(a=>{
   try{ return isStale(a); }catch(_){ return false; } });
  if(!stale.length) return [];
  return [{ sev:"info", code:"stale-area",
   msg:`${stale.length} مساحة قديمة تحتاج إعادة حساب`,
   refs:stale.map(a=>a.id).slice(0,20) }];
 },
 function emptyAreas(){
  if(typeof netArea!=="function") return [];
  const zero=(S.areas||[]).filter(a=>{
   try{ return !(netArea(a)>0); }catch(_){ return false; } });
  if(!zero.length) return [];
  return zero.map(a=>({ sev:"warn", code:"area-open",
   msg:`المساحة ${a.id}${a.name?` «${a.name}»`:""} غير مغلقة أو صفرية`,
   refs:[a.id] }));
 },
 function badStairs(){
  if(typeof stCheck!=="function") return [];
  const bad=(S.stairs||[]).filter(t=>{
   try{ return !stCheck(t).ok; }catch(_){ return false; } });
  if(!bad.length) return [];
  return bad.map(t=>({ sev:"warn", code:"stair-check",
   msg:`الدرج ${t.id} خارج الأبعاد المعقولة`, refs:[t.id] }));
 }
];

export function lint(){
 const issues=[];
 for(const fn of CHECKS){
  try{ issues.push(...(fn()||[])); }catch(_){ /* فاحصٌ لا يُسقط الكل */ }
 }
 const by=k=>issues.filter(i=>i.sev===k).length;
 return { issues,
  counts:{ err:by("err"), warn:by("warn"), info:by("info"),
           total:issues.length },
  ok:issues.length===0, ts:Date.now() };
}

export function lintText(rep){
 rep=rep||lint();
 if(rep.ok) return "لا مشاكل — الرسم سليم ✓";
 const L=[`وجدت ${rep.counts.total} ملاحظة `
  +`(${rep.counts.err} خطأ · ${rep.counts.warn} تحذير · ${rep.counts.info} معلومة):`];
 rep.issues.slice(0,12).forEach(i=>{
  const icon=i.sev==="err"?"⛔":i.sev==="warn"?"⚠":"ℹ";
  L.push(`${icon} ${i.msg}`+(i.refs&&i.refs.length
   ?` (${i.refs.slice(0,6).join("، ")})`:""));
 });
 if(rep.issues.length>12) L.push(`… و${rep.issues.length-12} أخرى`);
 return L.join("\n");
}
