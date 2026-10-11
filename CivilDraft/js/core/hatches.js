/* ═══ أنماط التهشير: بيانات مشروع ═══
   الزاوية والتباعد حالا مشروعٍ تُحفَظان وتدخلان التاريخ عبر
   KEYS/DEF، وتُقرآن حيَّاً في style.hatchOf عند كل رسمٍ وتصديرٍ —
   فتعديلُ زاوية ANSI31 يسري فوراً على هاشور الأعمدة (وأيّ أوّلية
   hatch) بلا مسّ أيّ كاش (hatchOf حسابٌ نقيّ لا يُكاش).

   قيدٌ معلَن: صبغة المنطقة (fill مع style:"hatch") تبقى عند
   زاويتها الثابتة 45 حتى دورةٍ لاحقة — النمط الجديد يغطي أوّلية
   hatch وحدها، وهي مستهلك المهشِّر الوحيد الذي جرت قراءته بالكامل.

   والتوافق: SOLID مصمتٌ متصالِب لا يلتفت لزاوية النمط، والمجهول
   يرجع للنمط العام 45°، وsc الصريح على الأوّلية يغلب النمطَ في
   التباعد وحده. */
import {S, edit} from "./state.js";
import {LIM} from "./limits.js";

const NAME_OK=/^[A-Za-z][A-Za-z0-9_-]{0,31}$/;
export const patNameOk=n=>NAME_OK.test(String(n||""));

export const defHatches=()=>({
 ANSI31:{n:"تهشير عام", ang:45, mm:3, solid:0},
 SOLID:{n:"تعبئة مصمتة", ang:45, mm:3, solid:1}
});

const angOk=v=>{
 const n=+v;
 return (isFinite(n)&&Math.abs(n)<=360)?((n%360)+360)%360:null;
};
const mmOk=v=>{
 const n=+v;
 return (isFinite(n)&&n>0)?Math.min(Math.max(n,0.2),200):null;
};

/* ═══ الوصول: الحيُّ ثم الافتراضُ الرجوعي — بلا كاش ═══ */
export const hatchDef=name=>{
 const s=String(name||"ANSI31");
 const h=S.hatches&&S.hatches[s];
 if(h)return h;
 return (s==="SOLID")
  ? {n:"تعبئة مصمتة",ang:45,mm:3,solid:1}
  : {n:"تهشير عام",ang:45,mm:3,solid:0};
};
export const patOk=name=>(S.hatches&&S.hatches[name])?name:null;
export const patLabel=name=>hatchDef(name).n||String(name||"");
export const patList=()=>Object.keys(S.hatches||{})
 .sort((a,b)=>(defHatches()[a]?0:1)-(defHatches()[b]?0:1)
   ||a.localeCompare(b))
 .map(k=>({k,label:S.hatches[k].n||k,ang:S.hatches[k].ang,
   mm:S.hatches[k].mm,solid:S.hatches[k].solid?1:0,
   custom:!defHatches()[k]}));

/* ═══ التطبيع — من ensureShape: المصنع يُعاد، والمخصصة السليمة تنجو ═══ */
export function normHatches(){
 const ix=(S.hatches&&typeof S.hatches==="object"
  &&!Array.isArray(S.hatches))?S.hatches:{};
 const out=defHatches();
 const keys=Object.keys(ix).filter(k=>!defHatches()[k]&&patNameOk(k));
 if(keys.length>LIM.hatches.max)keys.length=LIM.hatches.max;
 keys.forEach(k=>{
  const r=ix[k];
  if(!r||typeof r!=="object"||Array.isArray(r))return;
  const ang=angOk(r.ang), mm=mmOk(r.mm);
  if(ang==null||mm==null)return;
  out[k]={n:String(r.n==null?"":r.n).slice(0,40)||k,
   ang, mm, solid:r.solid?1:0};
 });
 S.hatches=out;
 return Object.keys(out).length;
}

/* ═══ الكتابة ═══ bump:view — الزاوية هيئةٌ لا هندسة، فلا تمسّ prims */
export function addHatch(name,label,ang,mm,solid){
 return edit(()=>{
  const k=String(name||"").trim();
  if(!patNameOk(k))
   throw new Error("اسم النمط لاتيني يبدأ بحرفٍ ويحوي أحرفاً وأرقاماً "
    +"وشرطاتٍ فحسب (مثل MB-BRICK) — الوصفُ العربيّ في خانة الوصف");
  if(defHatches()[k])return false;         /* المصنعيّ لا يُظلَّل */
  if(!S.hatches||typeof S.hatches!=="object"||Array.isArray(S.hatches))
   S.hatches=defHatches();
  const custom=Object.keys(S.hatches).filter(x=>!defHatches()[x]);
  if(!S.hatches[k]&&custom.length>=LIM.hatches.max)
   throw new Error(`بلغت الأنماطُ حدّها الأقصى ${LIM.hatches.max}`);
  const a=angOk(ang==null?45:ang), m=mmOk(mm==null?3:mm);
  if(a==null||m==null)
   throw new Error("زاويةٌ منتهية مطبَّعةٌ وتباعدٌ موجبٌ مطلوب");
  S.hatches[k]={n:String(label==null?"":label).slice(0,40)||k,
   ang:a, mm:m, solid:solid?1:0};
  return k;
 },"إضافة نمط تهشير",{bump:"view"});
}
export function delHatch(name){
 return edit(()=>{
  const k=String(name||"");
  if(defHatches()[k])return false;
  if(!(S.hatches&&S.hatches[k]))return false;
  delete S.hatches[k];
  return true;
 },"حذف نمط تهشير",{bump:"view"});
}
export function resetHatches(){
 return edit(()=>{
  S.hatches=defHatches();
  return Object.keys(S.hatches).length;
 },"إعادة مصنع أنماط التهشير",{bump:"view"});
}
