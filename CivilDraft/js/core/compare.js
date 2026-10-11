/* ═══ مقارنة الإصدارات ═══
   تُقارن لقطةَ أساسٍ بالحالة الجارية: عدٌّ بالمعرّف ومطابقةُ القيمة بالتسلسل
   الحرفي. عرضٌ محض: لا undo/redo ولا edit ولا autosave، والفروق لا تدخل
   scene() فتعزل نفسها عن كل التصدير وBOQ بنيةً. */
import {S,snapshot,COLLS,COLL_KIND,historySnapshotAt,stateVer} from "./state.js";
import {shapeOf,entDef} from "./ents.js";

let BASE=null, GEN=0, CACHE=null, CK="";
export const setCompareBase=o=>{BASE=o||null; GEN++; CACHE=null};
export const clearCompareBase=()=>{BASE=null; GEN++; CACHE=null};
export const compareGen=()=>GEN;
export const compareActive=()=>!!BASE;

/* كائنُ موضعِ n في السجلّ */
/* P2-008: لقطةٌ فاسدةٌ كانت ترمي من داخل المقارنة فيصعد الرميُ إلى
   مسارِ undo/السجلّ. الآن تُقرأ بحذرٍ وتعيد null، والمُنادي يرى
   «لا أساس» بدل انهيارٍ غامض. */
const readSnap=s=>{
 if(!s)return null;
 let v=null;
 try{v=JSON.parse(s)}catch(e){return null}
 return (!!v&&typeof v==="object"&&!Array.isArray(v)
  &&Array.isArray(v.walls))?v:null;
};
export function baseObjectAt(n){
 return readSnap(historySnapshotAt(n));
}
export const currentObject=()=>readSnap(snapshot());

const META=["meta","layers","sheets","callouts","groups","title","grid","levelDefs"];

/* diff(base) → {added,removed,changed:[{coll,k,id,e}], meta:[مفاتيح]} */
export function diff(base){
 const out={added:[],removed:[],changed:[],meta:[]};
 if(!base)return out;
 COLLS.forEach(coll=>{
  const A=new Map(), B=new Map(), k=COLL_KIND[coll];
  (S[coll]||[]).forEach(e=>A.set(e.id,e));
  (base[coll]||[]).forEach(e=>B.set(e.id,e));
  A.forEach((e,id)=>{
   const b=B.get(id);
   if(!b)out.added.push({coll,k,id,e});
   else if(JSON.stringify(e)!==JSON.stringify(b))out.changed.push({coll,k,id,e});
  });
  B.forEach((e,id)=>{if(!A.has(id))out.removed.push({coll,k,id,e})});
 });
 META.forEach(key=>{
  if(JSON.stringify(S[key])!==JSON.stringify(base[key]))out.meta.push(key);
 });
 return out;
}

export function diffView(){
 const k=`${GEN}|${stateVer()}`;
 if(CACHE&&CK===k)return CACHE;
 CACHE=diff(BASE); CK=k;
 return CACHE;
}

/* أشكال الرسم: المضاف/المعدَّل من الحالة الجارية، والمحذوف من كيان اللقطة نفسه */
export function diffShapes(){
 const d=diffView();
 const live=x=>{
  try{const sh=shapeOf({k:x.k,id:x.id}); return sh?{x,sh}:null}
  catch(_){return null}
 };
 const ghost=x=>{
  try{
   const D=entDef(x.k);
   const sh=D&&D.shape?D.shape(x.e):null;
   return sh?{x,sh}:null;
  }catch(_){return null}
 };
 return {added:d.added.map(live).filter(Boolean),
  removed:d.removed.map(ghost).filter(Boolean),
  changed:d.changed.map(live).filter(Boolean),
  meta:d.meta};
}
