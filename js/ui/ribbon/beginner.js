/* ═══ وضع المبتدئ ═══
   مرشِّحٌ فوق الشريط الفعّال (الأساس + تخصيص المستخدم) لا شريطٌ ثانٍ:
   العناصر تُنتقى بمفاتيحها من schema.js، فتبقى تسمياتها وأيقوناتها
   ومنفِّذها واحدةً في الوضعين، وأيّ زرٍّ يُحذف من الأساس يختفي هنا
   تلقائياً بلا كسر.

   المبدأ: أقلّ من ربع الأزرار، وكل لوحٍ يجيب عن سؤالٍ واحد
   (ارسم · عدّل · أشير · احفظ وسلّم). الأدوات المخفيّة لا تُعطَّل:
   تبقى في سطر الأوامر ولوحة الأوامر (Ctrl+K) واختصاراتها.

   التفضيل في UIS.beginner (نافذةٌ لا رسم) — لا يدخل المشروع ولا التاريخ. */
import {effectiveRibbon,flatItems,itemKey} from "./custom.js";
import {UIS} from "../store.js";

/* tab → panel → مفاتيح العناصر بالترتيب المطلوب.
   c:أداة · a:فعل · t:مفتاح — كما في itemKey. */
/* أُعيدت على التبويباتِ السبعةِ (المرحلة ٤): «رئيسي» حُذِف فلم يبقَ
   سطحٌ يكرّر، فالمبتدئُ صار يرى **بيوتَ الأدواتِ الحقيقيةَ مُقلَّمةً**
   لا نسخةً ثانيةً يتعلّمها ثمّ يُضطرّ إلى نسيانِها. */
export const BEGINNER={
 draw:{
  shapes:["c:wall","c:rect"],
  opens: ["c:door","c:win","c:opening"],
  areas: ["c:area","c:arearef"]},
 edit:{
  xform:["c:move","c:copy","c:rotate","c:mirror","c:offset"],
  ends: ["c:trim","c:extend"]},
 annt:{
  dims:["c:dim","c:chain","c:measure"],
  txt: ["c:text","c:mtext"]},
 serv:{
  stru:["c:col"],
  vert:["c:stair","c:roof"],
  san: ["c:wc","c:lav","c:shower","c:sink","c:tub","c:wm"]},
 view:{
  lays:["a:laysDlg"],
  look:["a:fit","a:view3dDlg"],
  aids:['t:[data-rb="ortho"]','t:[data-rb="snap"]','t:[data-rb="grid"]']},
 out:{
  exp: ["a:xPdf","a:xPng","a:xDxf"],
  qty: ["c:boq"],
  hand:["a:inspect"]},
 mng:{
  fil:["a:fnew","a:xOpen","a:xSave"]}
};
/* الزرّ الأكبر في كل لوحٍ مبتدئ: أوّل عنصرين — ما سواهما أعمدةٌ صغيرة */
const BIG_N=2;

/* يبني لوحاً مبتدئاً من لوحٍ فعّال: يحفظ ترتيب BEGINNER، ويُكبّر
   أوّل عنصرين، ويجمع الباقي في أعمدةٍ من ثلاثة (لا عمودَ بزرٍّ وحيد). */
function slimPanel(p,keys){
 const byKey=new Map(flatItems(p.items).map(it=>[itemKey(it),it]));
 const picked=keys.map(k=>byKey.get(k)).filter(Boolean);
 if(!picked.length)return null;
 const items=[];
 picked.slice(0,BIG_N).forEach(it=>items.push({...it,big:1}));
 const rest=picked.slice(BIG_N).map(it=>{const c={...it}; delete c.big; return c});
 for(let i=0;i<rest.length;i+=3){
  const col=rest.slice(i,i+3);
  if(col.length===1)items.push(col[0]); else items.push({group:col});
 }
 const np={...p,items};
 delete np.dlg;              /* المبتدئ لا يحتاج مُفتتِح اللوحات الجانبية */
 return np;
}

/* المرشِّح نفسه — نقيٌّ (يقبل الأساس صراحةً للاختبار) */
export function beginnerRibbon(tabs,spec=BEGINNER){
 const out=[];
 (tabs||[]).forEach(t=>{
  const tp=spec[t.id];
  if(!tp)return;
  const panels=[];
  Object.keys(tp).forEach(pid=>{
   const p=(t.panels||[]).find(x=>x.id===pid);
   if(!p)return;
   const np=slimPanel(p,tp[pid]);
   if(np)panels.push(np);
  });
  if(panels.length)out.push({...t,panels});
 });
 return out.length?out:(tabs||[]).slice();   /* لا شريطَ فارغاً أبداً */
}

export const isBeginner=()=>!!UIS.beginner;

/* ما يُرسَم فعلاً — المصيّر وKeyTips يقرآن هذا لا effectiveRibbon */
export function shownRibbon(){
 const T=effectiveRibbon();
 return isBeginner()?beginnerRibbon(T):T;
}
