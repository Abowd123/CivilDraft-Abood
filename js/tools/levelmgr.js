/* ═══ إدارة الطوابق — منطقٌ خالص؛ الواجهة في ui/levelManager.js ═══
   يقرأ ويكتب levelDefs عبر level.js الموجودة (levelDefs·levelCounts·
   addLevelDef) ولا يضيف شيئاً إلى النواة. كل كتابةٍ في edit() واحدة:
   خطوةُ تراجعٍ واحدة، وأيُّ رفضٍ يُبلَّغ ولا يُبتلَع.
   التطبيعُ هنا مرآةُ تطبيع state.js (الاسم ≤40 · الارتفاع 2000–8000 ·
   البلاطة 0–1000 · اللون #rrggbb) فلا تدخل قيمةٌ يرفضها التحميل. */
import {S,edit} from "../core/state.js";
import {levelDefs,levelDef,levelCounts,addLevelDef,
        activeLevel,normLevel,levelTag} from "../core/level.js";

const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const HEX=/^#[0-9a-fA-F]{6}$/;

/* صفوف الجدول: تعريفٌ + عدد الكيانات عليه + هل هو النشط */
export function levelRows(){
 const cnt=levelCounts(S), act=activeLevel(S.meta);
 return levelDefs(S).map(ld=>{
  const c=cnt[ld.n]||{};
  return {n:ld.n,name:ld.name,elev:ld.elev,h:ld.h,slab:ld.slab,
   color:ld.color,active:ld.n===act,
   ents:Object.values(c).reduce((a,b)=>a+b,0)};
 });
}

/* تطبيعُ صفٍّ واحد: يعيد {v,err}. الفارغ/غير الرقميّ لا يمرّ بصمت. */
export function normRow(r){
 const name=String(r&&r.name!=null?r.name:"").trim().slice(0,40);
 if(!name)return {err:"اسم الطابق فارغ"};
 const num=(x,d)=>{ if(x===""||x==null)return d; const n=+x; return Number.isFinite(n)?Math.round(n):NaN };
 const elev=num(r.elev,0), h=num(r.h,3000), slab=num(r.slab,200);
 if(Number.isNaN(elev)||Number.isNaN(h)||Number.isNaN(slab))
  return {err:`«${name}»: قيمةٌ رقميّةٌ غير صالحة`};
 return {v:{name,elev,
  h:clamp(h,2000,8000),slab:clamp(slab,0,1000),
  color:HEX.test(r.color||"")?r.color:"#cccccc"}};
}

/* تنبيهاتٌ لا رفض: المنسوب يجب أن يزيد مع رقم الطابق */
export function levelWarnings(rows){
 const out=[], s=(rows||levelRows()).slice().sort((a,b)=>a.n-b.n);
 for(let i=1;i<s.length;i++){
  if(s[i].elev<=s[i-1].elev)
   out.push(`منسوب «${s[i].name}» (${s[i].elev}) لا يعلو منسوب «${s[i-1].name}» (${s[i-1].elev})`);
 }
 const names=new Map();
 s.forEach(r=>{
  const k=r.name.trim();
  if(names.has(k))out.push(`الاسم «${k}» مكرَّر بين طابقين`);
  names.set(k,1);
 });
 return out;
}

/* رقمُ الطابق التالي: فوق أعلى تعريفٍ موجود (لا فوق أعلى كيانٍ فقط —
   وإلا اصطدم بتعريفٍ خالٍ فيرفضه addLevelDef) */
export const nextLevelNo=()=>Math.max(-1,...levelDefs(S).map(d=>d.n))+1;

export function addLevel(){
 return edit(()=>{
  const n=nextLevelNo();
  const prev=levelDef(S,n-1);
  return addLevelDef(S,{n,name:levelTag(normLevel(n)),
   elev:prev?prev.elev+prev.h:n*3000});
 },"إضافة طابق");
}

/* rows: [{n,name,elev,h,slab,color}] · poche: bool أو undefined.
   يعيد {saved,fail[]} — الصفّ الفاسد يُرفَض وحده ويُبلَّغ، والباقي
   يُحفَظ. الـpoché: إن كان مفعَّلاً أصلاً (hatch/solid) يبقى كما هو. */
export function applyLevels(rows,poche){
 const res={saved:0,fail:[]};
 edit(()=>{
  (rows||[]).forEach(r=>{
   const ld=levelDef(S,r.n);
   if(!ld){res.fail.push(`الطابق ${r.n} غير معرَّف`);return}
   const p=normRow(r);
   if(p.err){res.fail.push(p.err);return}
   Object.assign(ld,p.v);
   res.saved++;
  });
  if(poche!==undefined){
   const on=S.opt.fill!=="none";
   if(!!poche&&!on)S.opt.fill="solid";
   else if(!poche&&on)S.opt.fill="none";
  }
 },"حفظ الطوابق");
 return res;
}
