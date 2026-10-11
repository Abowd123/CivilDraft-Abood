/* ═══ ربطٌ لمرّةٍ واحدة وتفويضٌ واحد ═══ P2-001 · P2-002 · P2-013
   نوافذُ تُعاد رسمُها كانت تُعيد الربطَ على الحاضنِ الباقي: كل حفظٍ
   في «إدارة الطوابق» يضيف مستمعَ click جديداً إلى نفس الصندوق، فبعد
   n عمليةٍ تعمل n معاودات وتبقى closures حيّةً بالنافذة كلِّها.
   والعلاجُ مستمعٌ واحدٌ مفوَّضٌ على الحاضن: المحتوى يُستبدَل بحرية
   و«closest» يصل إلى الهدف — فلا ربطَ ثانٍ ولا إزالةٌ منسيّة.

   والعلامةُ خصيصةٌ على العنصر لا سمةٌ في HTML: لا تُسرَّب إلى
   الصفحة، ولا تتصادم مع dataset، وتزول مع العنصر نفسه.
   وbindOnce تُعيد true إن ربطت و false إن كان مربوطاً — فالاختبار
   يعرف أيَّهما وقع.

   ولا DOM في هذا الملفّ: يقبل أيَّ كائنٍ له addEventListener، فيُختبَر
   بشِبه DOM في Node كغيره. */

const K=(type,key)=>"__bind1_"+(key||type);

export function bindOnce(el,type,fn,key){
 if(!el||typeof el.addEventListener!=="function")return false;
 if(typeof fn!=="function")return false;
 const k=K(type,key);
 if(el[k])return false;
 el[k]=fn;
 el.addEventListener(type,fn);
 return true;
}
export const isBound=(el,type,key)=>!!(el&&el[K(type,key)]);
/* الفكُّ صريحٌ لمن يملك teardown — ويُعيد العلامةَ إلى الصفر فيُسمَح
   بربطٍ جديد بعده */
export function unbind(el,type,key){
 if(!el||typeof el.removeEventListener!=="function")return false;
 const k=K(type,key);
 const fn=el[k];
 if(!fn)return false;
 el.removeEventListener(type,fn);
 el[k]=null;
 return true;
}

/* ═══ سجلُّ المراقبين ═══ P2-013
   ستّةُ مراقبين كانوا يُنشَأون بلا مرجعٍ ولا disconnect: مقبولٌ ما
   دامت الوحداتُ singleton، لكنه يصير تسريباً عند أيّ إعادة mount —
   ولا عقدَ lifecycle يمنع إعادة النداء. الآن كلٌّ يُسجَّل باسمه:
   إعادةُ النداء تفصل القديمَ قبل إنشاء الجديد، وdisposeObservers
   تفصلُ الجميع. */
const OBS=new Map();
export function keepObserver(name,ob){
 if(!name||!ob)return ob;
 const old=OBS.get(name);
 if(old&&old!==ob&&typeof old.disconnect==="function"){
  try{old.disconnect()}catch(e){}
 }
 OBS.set(name,ob);
 return ob;
}
export const observerNames=()=>[...OBS.keys()];
export const observerOf=name=>OBS.get(name)||null;
export function disposeObservers(name){
 const names=name?[name]:[...OBS.keys()];
 let n=0;
 names.forEach(k=>{
  const ob=OBS.get(k);
  if(!ob)return;
  if(typeof ob.disconnect==="function"){try{ob.disconnect(); n++}catch(e){}}
  OBS.delete(k);
 });
 return n;
}

/* ═══ كتابةُ التفضيلات تُبلِّغ ═══ P2-005
   خمسةُ كتّابٍ كانوا يبتلعون امتلاءَ التخزين ويُكمِلون كأنّ شيئاً لم
   يكن: المفتاحُ والخيارُ والسعرُ والوحدةُ تضيع، والمستخدمُ يكتشفها في
   الجلسة التالية. الآن كلُّهم يمرّون من هنا: النتيجةُ تُعاد، والتنبيهُ
   يُقال مرّةً واحدة في الجلسة لكل مفتاح — فلا يتحوّل إلى ضجيج.
   ولا DOM ولا استيرادَ هنا كذلك: المُنادي هو من يعرض. */
let PREF_FAIL=null;
const SAID=new Set();
export const setPrefError=f=>{PREF_FAIL=(typeof f==="function")?f:null};
export function writePref(key,value){
 if(typeof localStorage==="undefined")return {ok:0,err:"لا تخزين"};
 try{
  localStorage.setItem(key,typeof value==="string"?value:JSON.stringify(value));
  SAID.delete(key);
  return {ok:1};
 }catch(e){
  const n=(e&&e.name)||"خطأ";
  if(PREF_FAIL&&!SAID.has(key)){SAID.add(key); PREF_FAIL(key,n)}
  return {ok:0,err:n};
 }
}
export const prefSaid=()=>[...SAID];


/* ═══ تحليلٌ لا يثق ═══ P2-008
   ثمانيةٌ وثلاثون `JSON.parse` فُحِصت؛ المهمُّ منها محميّ، لكن أربعةً
   كانت تُمرِّر أيَّ ناتجٍ إلى `Object.assign` أو إلى دمجٍ في الحالة:
   مصفوفةٌ أو رقمٌ أو null يصير «تفضيلات»، فيُعطِب ما بعده صامتاً.
   `parseObj` تُعيد كائناً مستوياً أو null — لا مصفوفةً ولا بدائيّاً —
   و`parseArr` مصفوفةً أو null. والنصُّ الفاسدُ لا يرمي من هنا:
   المُنادي يعود إلى مصنعه. */
export const isPlain=v=>!!v&&typeof v==="object"&&!Array.isArray(v);
export function parseObj(raw){
 if(raw==null||raw==="")return null;
 let v=null;
 try{v=JSON.parse(raw)}catch(e){return null}
 return isPlain(v)?v:null;
}
export function parseArr(raw){
 if(raw==null||raw==="")return null;
 let v=null;
 try{v=JSON.parse(raw)}catch(e){return null}
 return Array.isArray(v)?v:null;
}
/* دمجٌ بالمفاتيح المعروفة وحدها: مفتاحٌ غريبٌ لا يدخل، ونوعٌ مخالفٌ
   لنوعِ المصنع لا يُكتَب. هذا ما كان ينقص registry وpricing. */
export function mergeKnown(target,src,shape){
 const d=isPlain(src)?src:null;
 if(!d)return 0;
 let n=0;
 Object.keys(shape||{}).forEach(k=>{
  if(d[k]===undefined)return;
  if(typeof d[k]!==typeof shape[k])return;
  if(Array.isArray(shape[k])!==Array.isArray(d[k]))return;
  target[k]=d[k]; n++;
 });
 return n;
}
