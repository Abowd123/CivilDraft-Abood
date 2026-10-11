/* ═══ مسح التكرار — منطقٌ خالص؛ الواجهة في ui/hygiene.js ═══
   تقريرٌ قبل الحذف.
   جدارٌ يطابق آخر: النوع والسماكة والانحناء **والطابق** واحدة، وطرفاه
   متطابقان بتسامح 1 مم بأيّ اتجاه. عمودٌ يطابق آخر: الطابق والنوع
   والشكل والمقاس والدوران. الطابقُ شرطٌ لازم: عمودان بمركزٍ واحد على
   طابقين متتاليين تحميلٌ رأسيٌّ مقصود (انظر addCol وlevelAlign) لا تكرار.
   يحذف الثاني من كل زوج عبر delEnts (فتحاتُ الجدار المحذوف تذهب معه
   ويُبلَّغ ذلك). لا حذفَ قبل الموافقة. */
import {S,edit} from "../core/state.js";
import {delEnts} from "../core/ents.js";
import {levelOf} from "../core/level.js";

const TOL=1;   /* مم */
const near=(p,q)=>Math.abs(p[0]-q[0])<=TOL&&Math.abs(p[1]-q[1])<=TOL;

/* مسحٌ مرتَّبٌ بأصغر x: لا O(n²) كاملة على مشاريع كبيرة */
function pairs(list,minX,same){
 const arr=list.map(e=>({e,x:minX(e)})).sort((a,b)=>a.x-b.x);
 const out=[];
 for(let i=0;i<arr.length;i++)
  for(let j=i+1;j<arr.length&&arr[j].x-arr[i].x<=TOL;j++)
   if(same(arr[i].e,arr[j].e))out.push([arr[i].e,arr[j].e]);
 return out;
}

export function findDupes(){
 const out=[];
 const sameWall=(a,b)=>
  a.t===b.t&&(a.type||"int")===(b.type||"int")
  &&(a.bulge||0)===(b.bulge||0)&&levelOf(a)===levelOf(b)
  &&((near(a.a,b.a)&&near(a.b,b.b))||(near(a.a,b.b)&&near(a.b,b.a)));
 pairs(S.walls||[],w=>Math.min(w.a[0],w.b[0]),sameWall)
  .forEach(([a,b])=>out.push({k:"wall",id1:a.id,id2:b.id,
   msg:`${a.id} ≡ ${b.id} جدار متطابق هندسياً`}));
 const sameCol=(a,b)=>
  levelOf(a)===levelOf(b)&&a.kind===b.kind&&a.type===b.type
  &&Math.abs(a.x-b.x)<=TOL&&Math.abs(a.y-b.y)<=TOL
  &&a.w===b.w&&a.h===b.h&&(a.rot||0)===(b.rot||0);
 pairs(S.cols||[],c=>c.x,sameCol)
  .forEach(([a,b])=>out.push({k:"col",id1:a.id,id2:b.id,
   msg:`${a.id} ≡ ${b.id} عمود مكرَّر`}));
 return out;
}

/* الحذف: الثاني من كل زوج، بلا تكرار معرّف (ثلاثيةٌ متطابقة تُنتج
   زوجين يشتركان في أحدها) */
export function applyDedup(dups,idx){
 const seen=new Set(), list=[];
 idx.forEach(i=>{
  const d=dups[i]; if(!d)return;
  const key=d.k+d.id2;
  if(seen.has(key))return;
  seen.add(key); list.push({k:d.k,id:d.id2});
 });
 let res=null;
 edit(()=>{res=delEnts(list)},"مسح تكرار");
 return {asked:list.length,res};
}
