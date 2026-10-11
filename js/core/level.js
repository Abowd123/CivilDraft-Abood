/* ═══ المستويات (الطوابق) ═══
   المستوى حقلُ بياناتٍ لكل كيانٍ مكانيّ، صفرٌ أرضيٌّ افتراضاً،
   وقيمته مصدراً واحداً في النواة: المستوى النشط في S.meta.level
   هو ما يُسنَد للجديد عند إنشائه. لا يستورد هذا الملفّ state،
   فيبقى ورقةً يستوردها state والكيانات والقارئون بلا دورة. */
export const normLevel=v=>{
 const n=Math.round(+v||0);
 return (Number.isFinite(n)&&n>=0)?n:0;
};
/* بلا استيراد units.js (انظر تعليق الملفّ أعلاه) — نسخةٌ محليّةٌ صغيرة */
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
export const levelOf=e=>((e!=null&&Number.isFinite(+e.level))
 ?Math.round(+e.level):0);
export const activeLevel=meta=>normLevel(meta&&meta.level);
export const levelTag=L=>(L===0?"أرضي":(L>=1?`طابق ${L}`:String(L)));
/* كل المستويات الحيّة في المشروع — للعرض والفصل لا للحذف.
   الدرج والأداة الصحية منسوبان (F1 · F3) فيدخلان القراءة. */
export function levelsOf(S){
 const s=new Set([activeLevel(S.meta)]);
 ["walls","opens","areas","cols","stairs","fixt"].forEach(k=>
  (S[k]||[]).forEach(e=>s.add(levelOf(e))));
 return [...s].sort((a,b)=>a-b);
}
export function levelCounts(S){
 const c={};
 ["walls","opens","areas","cols","stairs","fixt"].forEach(k=>{
  (S[k]||[]).forEach(e=>{
   const L=levelOf(e);
   c[L]=c[L]||{};
   c[L][k]=(c[L][k]||0)+1;
  });
 });
 return c;
}
/* ═══ دورةُ الطوابق — L3 ═══
   منطقُ التبديل خالصٌ هنا لا في الواجهة، فيُختَبَر في node بلا DOM.
   يدور بين المستويات الحيّة تصاعدياً (dir≥0) أو تنازلياً، بلا قفزةٍ
   فوق مستوٍ خالٍ، ويعيد النشطَ نفسَه إن لم يوجد غيرُه. */
/* ═══ الدرج بين المستويات — أ ═══
   قراءةٌ تُخبِر ولا تُصلح: سطرٌ لكل قِلعةٍ بمستواها والنشط، حتى
   يُبنى الربط الفعليّ (سطر level في addStair) فلا يبقى الدرج
   صامتَ الانتماء. */
export function stairLevels(S){
 const act=activeLevel(S.meta);
 return {active:act,
  stairs:(S.stairs||[]).map(s=>({
   id:s.id||"?", level:levelOf(s)}))};
}
export function stairsOutsideActive(S){
 return (S.stairs||[]).filter(s=>levelOf(s)!==activeLevel(S.meta));
}
export function nextLevelFrom(S,dir){
 const ls=levelsOf(S);
 if(!ls.length)return 0;
 const cur=activeLevel(S.meta);
 if(ls.length===1)return cur;
 const i=ls.indexOf(cur);
 return dir>=0 ? ls[(i+1)%ls.length] : ls[(i-1+ls.length)%ls.length];
}
export function levelLabel(S){
 return levelTag(activeLevel(S.meta));
}
/* ═══ نطاق العرض — F4 ═══
   القرار: تبديل الطابق في الشارة يُعيد رسم الطابق النشط وحده، لا
   المشهد المكدَّس القديم. وS.opt.levelAll مفتاحٌ صريحٌ («كل
   الطوابق») يُعطِّل النطاق فيعود المشهد مكدَّساً كسابق عهده —
   خيارٌ من الشارة نفسها لا سلوكٌ ضمنيّ.
   null يعني «بلا نطاق»: كلّ الكيانات مهما كان مستواها. */
export function levelScope(S){
 return (+((S.opt&&S.opt.levelAll)||0))?null:activeLevel(S.meta);
}
/* هل الكيان e داخل نطاق مستوىً L؟ L=null تعني كلَّ شيء داخلاً.
   اسمٌ مغايرٌ عمداً لـ core/boq.js#inScope (تلك بشأن الطبقة لا
   المستوى) فلا يلتبس القارئ بين النطاقين. */
export function inLevelScope(e,L){
 return L==null||levelOf(e)===L;
}
/* ═══ تعريفات الطوابق — B ═══ levelDefs بيانات المشروع (state.js
   يهاجرها ويطبّعها)، وهذه قراءةٌ خالصة عليها. */
export function levelDef(S,n){
 return (S.levelDefs||[]).find(ld=>ld.n===normLevel(n))||null;
}
export function levelDefs(S){
 return (S.levelDefs||[]).slice().sort((a,b)=>a.n-b.n);
}
/* منسوب الطابق: من تعريفه إن وُجد، وإلّا تقديرٌ بارتفاعٍ معياريّ
   3م — حتى لا يكسر مشروعاً بلا تعريفاتٍ بعد (قبل هذه الدفعة) */
export function levelElev(S,n){
 const d=levelDef(S,n);
 return d?d.elev:normLevel(n)*3000;
}
export function levelHeight(S,n){
 const d=levelDef(S,n);
 return d?d.h:3000;
}
/* أقرب طابقٍ حيٍّ تحت n (أو تحت النشط إن غاب n) — للعرض الشبح */
export function levelBelow(S,n){
 const cur=(n==null)?activeLevel(S.meta):normLevel(n);
 const ls=levelsOf(S).filter(x=>x<cur).sort((a,b)=>b-a);
 return ls.length?ls[0]:null;
}
/* إضافة تعريف طابقٍ جديد — يرفض رقماً مكرَّراً (حرّره أو احذفه
   أوّلاً)، ويلي نمط ensureShape في التطبيع فلا يُدخل قيماً فاسدة */
export function addLevelDef(S,o){
 const p=o||{};
 const n=normLevel(p.n??(Math.max(-1,...levelsOf(S))+1));
 if((S.levelDefs||[]).some(ld=>ld.n===n))
  throw new Error(`الطابق ${n} معرَّفٌ أصلاً`);
 const ld={n,
  name:String(p.name||levelTag(n)).slice(0,40),
  elev:Math.round(+p.elev||n*3000),
  h:clamp(Math.round(+p.h||3000),2000,8000),
  slab:clamp(Math.round(+p.slab||200),0,1000),
  color:/^#[0-9a-fA-F]{6}$/.test(p.color||"")?p.color:"#cccccc"};
 if(!Array.isArray(S.levelDefs))S.levelDefs=[];
 S.levelDefs.push(ld);
 S.levelDefs.sort((a,b)=>a.n-b.n);
 return ld;
}
