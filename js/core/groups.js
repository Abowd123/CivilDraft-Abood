/* ═══ المجموعات — GRP ═══
   جدول مراجع فوق الكيانات: لا إحداثيات هنا ولا نسخةٌ تُخزَّن —
   العضو يُقرأ من مكانه عند الطلب. ليس كياناً مكانياً (KEYS لا COLLS)،
   فلا يُحدَّد ولا يُصاب ولا صفّ له في entreg ولا يدخل BOQ.
   التحريك يمرّ بـgrabOf/moveEnt: من لقطة الأصل. وعضوُ مجموعةٍ محدَّد
   يسحب المجموعة كلها عبر expandGroups. */
import {S,touch} from "./state.js";
import {newId} from "./units.js";
import {V} from "./validate.js";
import {entOf,grabOf,moveEnt,outlineOf} from "./ents.js";
import {pickable} from "./layers.js";
import {bboxOf} from "./geom.js";

const KEY=s=>s.k+"/"+s.id;

export const groupById=id=>(S.groups||[]).find(g=>g.id===id)||null;
export const groupByName=n=>{
 const q=String(n||"").trim();
 return (S.groups||[]).find(g=>g.name===q)||null;
};

/* الأعضاء الآن — مُرشَّحون إلى الموجود والقابل للتحديد:
   المقفل أو المخفي لا يتحرّك مع المجموعة. */
export function groupMembers(g){
 const out=[];
 ((g&&g.members)||[]).forEach(m=>{
  if(!m||!pickable(m)||!entOf(m))return;
  out.push(m);
 });
 return out;
}

/* توسيع التحديد: عضوٌ محدَّدٌ يسحب مجموعته كلها. فريدٌ بلا تعارض،
   ومن لا مجموعةَ له يبقى كما هو. الفهرسة بـ k/id */
export function expandGroups(list){
 const out=[], seen=new Set();
 const push=s=>{
  const key=KEY(s);
  if(seen.has(key))return;
  seen.add(key); out.push(s);
 };
 const by=new Set((list||[]).filter(Boolean).map(KEY));
 (S.groups||[]).forEach(g=>{
  const M=groupMembers(g);
  if(!M.some(m=>by.has(KEY(m))))return;
  M.forEach(push);
 });
 (list||[]).forEach(s=>{if(s)push(s)});
 return out;
}

export function groupAdd(name,members){
 const q=String(name||"").trim();
 if(!q)throw new Error("المجموعة تحتاج اسماً");
 const clean=(members||[]).filter(m=>m&&pickable(m)&&entOf(m));
 if(clean.length<2)
  throw new Error("المجموعة تحتاج عنصرين قابلين للتحديد على الأقل");
 const Vr=V("group",{name:q,members:clean});
 if(!Array.isArray(S.groups))S.groups=[];
 let g=groupByName(q);
 if(g){
  const have=new Set(g.members.map(KEY));
  Vr.members.forEach(m=>{if(!have.has(KEY(m)))g.members.push(m)});
  touch();
  return g;
 }
 g={id:newId("GR"),name:q.slice(0,80),members:Vr.members};
 S.groups.push(g); touch();
 return g;
}
export function groupRemove(id){
 if(!Array.isArray(S.groups))return false;
 const i=S.groups.findIndex(g=>g.id===id);
 if(i<0)return false;
 S.groups.splice(i,1); touch(); return true;
}
export function groupRename(id,name){
 const g=groupById(id);
 if(!g)return false;
 g.name=String(name||"").trim().slice(0,80)||g.name;
 touch(); return true;
}
export function groupDropMember(id,s){
 const g=groupById(id);
 if(!g)return false;
 g.members=(g.members||[]).filter(m=>!(m.k===s.k&&m.id===s.id));
 touch(); return true;
}
/* صندوق كلّ الأعضاء — للمركز والمعاينة */
export function groupBounds(g){
 const out=[];
 groupMembers(g).forEach(m=>{
  const o=outlineOf(m);
  if(o&&o.length)o.forEach(p=>out.push(p));
 });
 return bboxOf(out);
}
/* تحريكٌ من لقطة الأصل — الفتحة تتبع جدارها عبر grab/move */
export function groupMove(g,dx,dy){
 const G=groupMembers(g)
  .filter(s=>s.k!=="open")
  .map(s=>{const o=grabOf(s);return o?{s,o}:null}).filter(Boolean);
 G.forEach(({s,o})=>moveEnt(s,o,dx,dy));
 touch();
 return G.length;
}
