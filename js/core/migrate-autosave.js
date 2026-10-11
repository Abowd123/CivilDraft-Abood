/* ═══ هجرة الحفظ التلقائي الثانوي — لمرّة واحدة ═══
   كان core/persist.js نظامَ حفظٍ ثانياً موازياً للأساسيّ في state.js
   + io/store.js. وكان مركَّباً فعلاً في app.js رغم أن تعليقه كان
   يزعم العكس — فوقع تنازعٌ حقيقيّ: كتابةٌ مزدوجةٌ كاملةٌ كلَّ ثماني
   ثوانٍ، وحوارُ استعادةٍ قد يعرض نسخةً أقدم من جلسة النظام الأساسيّ
   فيطرد آخرَ عملٍ سليم.

   وبعد المراجعة: النظامُ الأساسيّ يكفي (saveNow متزامنة عند الإغلاق
   والإخفاء · autosave مؤجَّلة عند التعديل · استعادة عند الإقلاع)،
   والنظامُ الثانويّ لا يزيد أماناً بل يُنقصه بحواره. فأُزيل الربطُ
   كلُّه (persist.js وrecoverdialog.js حُذفا بالكامل — لا يُستوردان
   من أي مكان، وفاحص «الاستيرادات تُحَلّ» في tests/dom.js يرفض أصلاً
   إبقاء ملفٍّ لا يستورده أحد)، وبقيت هذه الوحدة لهجرةٍ واحدة: تنقل
   آخر لقطةٍ من mistar.autosave إلى civildraft.autosave، ثم تصمت أبداً.

   النسخ لا النقل — القديم يبقى نسخةً احتياطية صامتة، ولا يُكتَب
   فيها أبداً بعد اليوم. ومن احتاجها للطوارئ فليفتح وحدة التحكّم
   وينادي peekOldAutosave(). */
const OLD_DB="mistar.autosave";
const NEW_DB="civildraft.autosave";
const STORE="snapshots";
const KEY="current";
const MIG="__migrated";
const MS=4000;

const getIn=(db,k)=>new Promise((res,rej)=>{
 const rq=db.transaction(STORE,"readonly").objectStore(STORE).get(k);
 rq.onsuccess=()=>res(rq.result||null);
 rq.onerror=()=>rej(rq.error);
});
const putIn=(db,k,v)=>new Promise((res,rej)=>{
 const tx=db.transaction(STORE,"readwrite");
 tx.objectStore(STORE).put(v,k);
 tx.oncomplete=()=>res(true);
 tx.onerror=()=>rej(tx.error);
});
/* القديمة إن وُجدت فقط — فتحٌ بلا رقمٍ لقاعدةٍ غائبةٍ يُنشئها،
   فنُجهض الترقية ليُبطَل الإنشاء. وهذا نفسُ الحرس في persist.js
   السابق (قبل الإزالة) حرفاً بحرف. */
async function legacyOpen(name){
 if(typeof indexedDB==="undefined")return null;
 try{
  if(typeof indexedDB.databases==="function"){
   const l=await indexedDB.databases();
   if(Array.isArray(l)&&!l.some(x=>x&&x.name===name))return null;
  }
 }catch(e){}
 return new Promise(res=>{
  let rq, absent=false;
  try{rq=indexedDB.open(name)}catch(e){res(null);return}
  rq.onupgradeneeded=()=>{absent=true; try{rq.transaction.abort()}catch(e){}};
  rq.onsuccess=()=>{
   if(absent){try{rq.result.close()}catch(e){} res(null);}
   else res(rq.result);
  };
  rq.onerror=e=>{try{e&&e.preventDefault&&e.preventDefault()}catch(x){} res(null);};
  rq.onblocked=()=>res(null);
 });
}
function openDB(){
 return new Promise((res,rej)=>{
  if(typeof indexedDB==="undefined"){rej(new Error("لا IndexedDB")); return;}
  const rq=indexedDB.open(NEW_DB,1);
  rq.onupgradeneeded=()=>{
   const db=rq.result;
   if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);
  };
  rq.onsuccess=()=>res(rq.result);
  rq.onerror=()=>rej(rq.error||new Error("فشل فتح القاعدة"));
 });
}
async function migrateOnce(){
 const db=await openDB();
 try{
  if(await getIn(db,MIG))return {from:null,why:"مضت مرّةً"};
  let from=null;
  if(!(await getIn(db,KEY))){
   const o=await legacyOpen(OLD_DB);
   if(o){
    try{
     if(o.objectStoreNames.contains(STORE)){
      const cur=await getIn(o,KEY);
      if(cur){await putIn(db,KEY,cur); from=OLD_DB;}
     }
    }finally{try{o.close()}catch(e){}}
   }
  }
  await putIn(db,MIG,{from,t:Date.now()});
  return {from,why:from?"نُقلت":"لا لقطة قديمة"};
 }finally{try{db.close()}catch(e){}}
}

let P=null;
/* ═══ المهلة الحاسمة ═══
   لا تحجب الإقلاع، ولا ترمي أبداً — قاعدتان مُعلَنتان في CHANGES.md
   للهجرة كلّها. وسقفُ أربع ثوانٍ كما كان في persist.js. */
export function migrateAutosave(){
 if(P)return P;
 P=new Promise(res=>{
  const t=setTimeout(()=>res({from:null,why:"مهلة"}),MS);
  let p;
  try{p=migrateOnce()}catch(e){p=Promise.resolve({from:null,why:"خطأ"})}
  p.then(r=>{clearTimeout(t); res(r||{from:null,why:"فراغ"})},
         ()=>  {clearTimeout(t); res({from:null,why:"رفض"})});
 });
 return P;
}
/* ═══ للطوارئ وحدها ═══
   تُنادى من وحدة التحكّم يدوياً: peekOldAutosave().then(console.log)
   — لا واجهةَ لها، ولا زرّ، ولا استدعاءَ تلقائيّاً. من احتاج
   نسخةً احتياطيةً من العصر السابق يقرؤها من هنا بنفسه. */
export function peekOldAutosave(){
 return legacyOpen(OLD_DB).then(o=>{
  if(!o)return null;
  return getIn(o,KEY).then(s=>{try{o.close()}catch(e){} return s})
   .catch(()=>{try{o.close()}catch(e){} return null});
 });
}
