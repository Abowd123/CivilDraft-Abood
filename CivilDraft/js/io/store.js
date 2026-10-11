/* ═══ التخزين الدائم ═══
   IndexedDB أوّلاً و localStorage بديلاً. ثلاثة مكاسب:

   ١ · لا حدَّ عملياً — كان الحدّ ٥ م.ب، ومرجعٌ مستورد بستّين ألف
       كيانٍ يتجاوزه، فيفشل الحفظ التلقائي.
   ٢ · لا JSON.stringify — النسخ البنيوي يقبل الكائن كما هو، فيسقط
       تسلسلُ كل شيءٍ كل سبعمئة مللي.
   ٣ · الفشل يُقال. كان catch(e){} صامتاً، فيفقد المستخدم الحفظ
       التلقائي ولا يعلم.

   وليس فيه استيرادٌ واحد بقصد: ورقةٌ في شجرة الاعتماد، فاستيراده
   من core/state.js لا يصنع دورةً ولا يقلب اتجاهاً. */

const DB="civildraft", STORE="state", SNAPS="snaps", KEY="doc", DBV=2;
export const LSK="civildraft.v1";
/* ═══ هجرة مفتاح localStorage الاحتياطي — دفعة 3.9 ═══
   كانت هذه الوحدة تكتب المستند نفسه (المسار الاحتياطي حين لا يتوفّر
   IndexedDB، والكتابة المتزامنة عند الإغلاق) في «mistar.v1» رغم أن
   قاعدة IndexedDB أعلاه هُوجرت من «mistar» إلى «civildraft» منذ
   البداية — تناقضٌ بقي بلا ملاحظة لأن كلا الاسمين كانا يعملان.
   النسخ لا النقل، والقديم يبقى نسخةً احتياطية صامتة كأخواتها. */
const OLD_LSK="mistar.v1";
let LSK_MIGD=false;
function migrateLSKey(){
 if(LSK_MIGD)return; LSK_MIGD=true;
 if(typeof localStorage==="undefined")return;
 try{
  if(localStorage.getItem(LSK)!==null)return;
  const v=localStorage.getItem(OLD_LSK);
  if(v!==null)localStorage.setItem(LSK,v);
 }catch(e){}
}
/* ═══ الهجرة من الاسم القديم ═══
   القاعدة كانت «mistar» وصارت «civildraft». عند أول فتحٍ تُنسَخ آخر
   حالةٍ محفوظة من القديمة إلى الجديدة — تُنسَخ ولا تُنقَل: القديمة
   تبقى نسخةً احتياطيةً صامتة لا يقرؤها البرنامج ولا يكتب فيها.
   وعلامة MIG داخل القاعدة الجديدة تجعلها لمرةٍ واحدة حقاً: بدونها
   كان newState() — وهو يحذف المستند — يُحيي المشروعَ القديم في
   الإقلاع التالي، لأن «لا نسخة جديدة» تصدق بعد كل حذف. */
const OLD_DB="mistar", MIG="__migrated", MIG_MS=4000;
const idbGet=(d,st,k)=>new Promise((res,rej)=>{
 const rq=d.transaction(st,"readonly").objectStore(st).get(k);
 rq.onsuccess=()=>res(rq.result||null);
 rq.onerror  =()=>rej(rq.error);
});
const idbPut=(d,st,k,v)=>new Promise((res,rej)=>{
 const tx=d.transaction(st,"readwrite");
 tx.objectStore(st).put(v,k);
 tx.oncomplete=()=>res();
 tx.onerror=()=>rej(tx.error);
 tx.onabort=()=>rej(tx.error);
});
/* يفتح القاعدة القديمة إن وُجدت فقط. فتحٌ بلا رقم إصدارٍ لقاعدةٍ
   غائبة كان سيُنشئها فارغةً، فنُجهض معاملة الترقية — وهذا يُبطل
   الإنشاء — ونعود بـnull. ويُسأل databases() أوّلاً حيث يتوفّر. */
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
  rq.onupgradeneeded=()=>{
   absent=true;
   try{rq.transaction.abort()}catch(e){}
  };
  rq.onsuccess=()=>{
   if(absent){try{rq.result.close()}catch(e){} res(null)}
   else res(rq.result);
  };
  rq.onerror=e=>{
   try{e&&e.preventDefault&&e.preventDefault()}catch(x){}
   res(null);
  };
  rq.onblocked=()=>res(null);
 });
}
/* فهرس اللقطات في localStorage هو ما يعرف معرّفاتها: من لا يظهر فيه
   لا تعرضه الواجهة أصلاً، فنسخُ ما فيه يكفي — ولا حاجة لمؤشّرٍ على
   المخزن (الذي لا يوفّره شِبهُ الاختبار). */
function snapIds(){
 try{
  const a=JSON.parse(localStorage.getItem("mistar.snaps")||"[]");
  return Array.isArray(a)?a.map(x=>x&&x.id).filter(x=>typeof x==="string"):[];
 }catch(e){return []}
}
async function migrateIdb(d){
 if(await idbGet(d,STORE,MIG))return;          /* مضت مرّةً */
 let from=null;
 if(!(await idbGet(d,STORE,KEY))){              /* لا نسخة جديدة بعد */
  const o=await legacyOpen(OLD_DB);
  if(o){
   try{
    if(o.objectStoreNames.contains(STORE)){
     const cur=await idbGet(o,STORE,KEY);
     if(cur){
      /* اللقطات أوّلاً والمستند آخراً: انقطاعٌ في الوسط لا يُترك
         نصفَ مُهاجَر، فالمستند الغائب يعيد المحاولة في الإقلاع التالي */
      if(o.objectStoreNames.contains(SNAPS)){
       for(const id of snapIds()){
        const sn=await idbGet(o,SNAPS,id);
        if(sn)await idbPut(d,SNAPS,id,sn);
       }
      }
      await idbPut(d,STORE,KEY,cur);
      from=OLD_DB;
     }
    }
   }finally{try{o.close()}catch(e){}}
  }
 }
 /* لا تُكتَب العلامة إن رمى شيءٌ أعلاه — فتُعاد المحاولة لاحقاً */
 await idbPut(d,STORE,MIG,{from,t:Date.now()});
}
/* الهجرة لا تحجب الإقلاع: سقفٌ زمنيّ، وأي علّةٍ تُبتلَع — فالقاعدة
   الجديدة صالحةٌ للعمل والقديمة سليمةٌ لم تُمَسّ */
const guarded=(p,ms)=>new Promise(res=>{
 const t=setTimeout(res,ms);
 p.then(()=>{clearTimeout(t);res()},()=>{clearTimeout(t);res()});
});

let dbP=null, MODE="?", FAIL=0, LAST="";
export const mode=()=>MODE;
export const failed=()=>FAIL;

const OPEN_MS=5000;
function open(){
 if(dbP)return dbP;
 dbP=new Promise(res=>{
  if(typeof indexedDB==="undefined"){MODE="ls"; res(null); return}
  let rq, settled=false;
  const finish=(v,mode)=>{
   if(settled)return; settled=true; clearTimeout(guard);
   if(mode)MODE=mode; res(v);
  };
  /* بعض البيئات (خاصّ، تخزينٌ ممتلئ أو تالف، سياسات المتصفّح) لا
     تُطلق أيّ حدثٍ من indexedDB.open() على الإطلاق — لا نجاح ولا
     خطأ ولا حجب. كانت هذه الحالة تُعلِّق وعد open() إلى الأبد، ومن
     ورائه restore() فboot() كلَّه، فيظهر مرقبُ bootguard وحده بلا
     أيّ خطأٍ في السجلّ. سقفٌ هنا — بمثل ما تُحمى به الهجرة أدناه —
     يهبط إلى localStorage بدل التعليق. */
  const guard=setTimeout(()=>finish(null,"ls"),OPEN_MS);
  /* المتصفّح في وضعٍ خاصّ قد يرمي من الفتح نفسه لا من الحدث */
  try{rq=indexedDB.open(DB,DBV)}
  catch(e){finish(null,"ls"); return}
  rq.onupgradeneeded=()=>{
   const d=rq.result;
   if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE);
   if(!d.objectStoreNames.contains(SNAPS))d.createObjectStore(SNAPS);
  };
  rq.onsuccess=()=>{
   if(settled)return;      /* السقف سبق وحسم بـls؛ الاتصال متأخّرٌ الآن */
   const d=rq.result;
   /* لا تُسلَّم القاعدة قبل الهجرة: load() الأولى يجب أن ترى النسخة */
   guarded(migrateIdb(d),MIG_MS).then(()=>finish(d,"idb"));
  };
  rq.onerror  =()=>finish(null,"ls");
  rq.onblocked=()=>finish(null,"ls");
 });
 return dbP;
}
/* ═══ الطابع والعلامة ═══
   الطابع يحكم بين النسختين: الكتابة الأخيرة عند الإغلاق تقع في
   localStorage، فلا يجوز أن تحجبها نسخةٌ أقدم في IndexedDB.
   و__lite يقول إن النسخة منقوصة، فلا تحجب كاملةً أقدم منها:
   الأحدث ليس الأصحّ إن كان ناقصاً. وكان غيابُ هذه العلامة يُفقِد
   المرجعَ المستورد كلَّه عند أول إغلاقٍ لا يتّسع فيه localStorage. */
const stamp=(o,lite,rev)=>{
 const r=Object.assign({},o,{__t:Date.now()});
 if(lite)r.__lite=1; else delete r.__lite;
 if(rev!=null)r.__rev=rev|0;
 return r;
};
/* ═══ المراجعة والتزامن بين التبويبات ═══ P4-009
   كانت الكتابة غير مشروطة: تبويبان يفتحان V0، فيحفظ B الـV1، ثم
   يحفظ A ما عنده فيمحو تعديل B بلا كلمة. الآن مع كل حفظٍ رقمُ
   مراجعةٍ متزايد، ويُقارَن قبل الكتابة (compare-and-swap):
   المخزَّنُ أحدثُ ممّا يعرفه هذا التبويب ⇒ لا كتابة، بل تعارضٌ
   يُبلَّغ للمستخدم ونسخةٌ جانبية تُحتفَظ فلا يضيع عملُ أحدٍ.
   والبثُّ عبر BroadcastChannel، ومنارةٌ في localStorage تُطلق حدث
   storage للتبويبات التي لا تملك القناة. */
export const REVK="civildraft.rev";        /* منارة البثّ */
export const CONFK="civildraft.v1.conflict"; /* النسخة المحتفظ بها */
const CHAN="civildraft.doc";
let REV=0;                 /* آخر مراجعةٍ يعرفها هذا التبويب */
let ONCONF=null, SUBS=[], CH=null, WIRED=false;
export const revision=()=>REV;
/* للاختبار والاستعادة: تثبيتُ ما يعرفه التبويب بلا كتابة */
export const setRevision=n=>{REV=Math.max(0,n|0); return REV};
export const onConflict=f=>{ONCONF=(typeof f==="function")?f:null};
const revOf=o=>{const v=o&&+o.__rev; return (isFinite(v)&&v>0)?(v|0):0};
function chan(){
 if(CH!==null)return CH;
 CH=false;
 try{
  if(typeof BroadcastChannel==="function"){
   CH=new BroadcastChannel(CHAN);
   /* في Node (الاختبارات) القناةُ مِقبضٌ حيٌّ يمنع خروجَ العملية،
      فيبدو الاختبارُ معلّقاً بعد نجاحه. unref موجودةٌ في Node لا في
      المتصفّح، فالنداءُ محروسٌ بنوعها ولا يغيّر سلوكَ الصفحة. */
   if(typeof CH.unref==="function")CH.unref();
  }
 }catch(e){CH=false}
 return CH;
}
function fanout(msg){
 SUBS.slice().forEach(f=>{try{f(msg)}catch(e){}});
}
/* يُنادى مرّةً من المستدعي الأوّل: لا نربط مستمعاتٍ عند الاستيراد */
export function watchDoc(fn){
 if(typeof fn==="function"&&SUBS.indexOf(fn)<0)SUBS.push(fn);
 if(!WIRED){
  WIRED=true;
  const c=chan();
  if(c&&c.addEventListener)
   c.addEventListener("message",e=>{
    const d=e&&e.data;
    if(d&&d.k==="doc"&&revOf(d)>REV)fanout({rev:revOf(d),via:"channel"});
   });
  if(typeof addEventListener==="function")
   addEventListener("storage",e=>{
    if(!e||e.key!==REVK)return;
    const r=(+e.newValue)|0;
    if(r>REV)fanout({rev:r,via:"storage"});
   });
 }
 return ()=>{SUBS=SUBS.filter(x=>x!==fn)};
}
function announce(rev){
 const c=chan();
 if(c&&c.postMessage){try{c.postMessage({k:"doc",__rev:rev,t:Date.now()})}catch(e){}}
 try{localStorage.setItem(REVK,String(rev))}catch(e){}
}
/* مراجعةُ المخزَّن فعلاً — الأعلى بين المستودعَين */
async function peekRev(){
 let a=0,b=0;
 const d=await open();
 if(d){
  try{a=revOf(await idbGet(d,STORE,KEY))}catch(e){}
 }
 b=peekRevLS();
 return Math.max(a,b);
}
function peekRevLS(){
 if(typeof localStorage==="undefined")return 0;
 let r=0;
 try{
  const raw=localStorage.getItem(LSK);
  if(raw)r=revOf(JSON.parse(raw));
 }catch(e){}
 try{r=Math.max(r,(+localStorage.getItem(REVK))|0)}catch(e){}
 return r;
}
/* الاحتفاظ بالنسختين: الأحدثُ يبقى في مكانه، وما كان سيُكتَب فوقه
   يُحفَظ جانباً فيستعيده المستخدم إن أراد. */
function stash(obj,rev){
 if(typeof localStorage==="undefined")return 0;
 try{
  localStorage.setItem(CONFK,JSON.stringify(
   Object.assign({},obj,{__t:Date.now(),__rev:rev|0})));
  return 1;
 }catch(e){return 0}
}
export function conflictGet(){
 if(typeof localStorage==="undefined")return null;
 try{
  const raw=localStorage.getItem(CONFK);
  if(!raw)return null;
  const o=JSON.parse(raw);
  return (o&&Array.isArray(o.walls))?o:null;
 }catch(e){return null}
}
export function conflictClear(){
 try{localStorage.removeItem(CONFK)}catch(e){}
}
/* المرجع وحده هو ما يُنقَص، فدمجُه من النسخة الكاملة يُتِمّ الناقصة.
   ويُعاد كائنٌ جديد: النسختان المقروءتان لا تُمَسّان. */
const heal=(lite,full)=>{
 if(!lite||!lite.__lite||!full||!full.ref)return lite;
 const n=(full.ref.ents||[]).length;
 if(!n)return lite;
 const o=Object.assign({},lite,{ref:full.ref});
 delete o.__lite;
 o.__healed=n;
 return o;
};
function saveLS(o){
 migrateLSKey();
 if(typeof localStorage==="undefined")return {ok:0,via:"none"};
 try{
  const s=JSON.stringify(o);
  localStorage.setItem(LSK,s);
  FAIL=0; LAST="ls";
  return {ok:1,via:"ls",bytes:s.length};
 }catch(e){
  FAIL++;
  return {ok:0,via:"ls",err:(e&&e.name)||"خطأ",
   refs:(o&&o.ref&&o.ref.ents)?o.ref.ents.length:0};
 }
}
export async function save(obj,opt){
 /* force: المستخدم اختار «اكتب فوق الأحدث» بعد أن رأى التعارض */
 const force=!!(opt&&opt.force);
 const theirs=await peekRev();
 if(!force&&theirs>REV){
  const kept=stash(obj,theirs+1);
  const c={ok:0,via:"conflict",conflict:1,theirs,ours:REV,kept};
  if(ONCONF)ONCONF(c);
  fanout({rev:theirs,via:"conflict"});
  return c;
 }
 const rev=Math.max(theirs,REV)+1;
 const o=stamp(obj,0,rev);          /* كاملةٌ صريحاً — بلا __lite */
 const d=await open();
 if(d){
  try{
   await new Promise((res,rej)=>{
    const tx=d.transaction(STORE,"readwrite");
    tx.objectStore(STORE).put(o,KEY);
    tx.oncomplete=res;
    tx.onerror=()=>rej(tx.error);
    tx.onabort =()=>rej(tx.error);
   });
   FAIL=0; LAST="idb"; REV=rev; announce(rev);
   return {ok:1,via:"idb",rev};
  }catch(e){MODE="ls"}     /* الحصّة أو التلف ⇒ نهبط ونُبلّغ */
 }
 const r=saveLS(o);
 if(r.ok){REV=rev; announce(rev); r.rev=rev}
 return r;
}
export async function load(){
 migrateLSKey();
 let idb=null, ls=null;
 const d=await open();
 if(d){
  try{
   idb=await new Promise((res,rej)=>{
    const tx=d.transaction(STORE,"readonly");
    const rq=tx.objectStore(STORE).get(KEY);
    rq.onsuccess=()=>res(rq.result||null);
    rq.onerror  =()=>rej(rq.error);
   });
  }catch(e){}
 }
 if(typeof localStorage!=="undefined"){
  try{
   const raw=localStorage.getItem(LSK);
   if(raw){
    const o=JSON.parse(raw);
    if(o&&Array.isArray(o.walls))ls=o;
   }
  }catch(e){}
 }
 const tI=(idb&&+idb.__t)||0, tL=(ls&&+ls.__t)||0;
 /* الناقصة الأحدث تُرمَّم من الكاملة الأقدم: رسمك من الأحدث،
    والمرجع من الأقدم — فلا يُفقَد أيٌّ منهما.
    والشرط الزمنيّ لازم: الترميم يُثبَّت في IndexedDB فوراً فيصير
    أحدث، فلو رمّمنا بلا شرطٍ لتكرّر التنبيه في كل إقلاع. */
 if(ls&&ls.__lite&&idb&&tL>tI){
  const h=heal(ls,idb);
  if(h.__healed){REV=Math.max(REV,revOf(ls),revOf(idb));
   return {data:h,via:"healed",refs:h.__healed}}
 }
 if(idb&&ls&&idb.__lite&&!ls.__lite&&tI>=tL){
  /* الحالة المقابلة: idb ناقصة وls كاملة */
  const h=heal(idb,ls);
  if(h.__healed){REV=Math.max(REV,revOf(ls),revOf(idb));
   return {data:h,via:"healed",refs:h.__healed}}
 }
 if(idb&&(!ls||tI>tL)){REV=Math.max(REV,revOf(idb),peekRevLS()); return {data:idb,via:"idb"}}
 /* migrate لا تُعلَن إلّا إن كان IndexedDB متاحاً ولا شيء فيه —
    وهو معنى الكلمة. وكانت تُعلَن كلَّ إقلاعٍ لأن flushSync يجعل
    ls أحدث دائماً، فيُكتَب IndexedDB ولا يُقرَأ في المسار المعتاد
    — وهو الغرض المُعلَن للملفّ كلّه. */
 if(ls){REV=Math.max(REV,revOf(ls),revOf(idb),peekRevLS()); return {data:ls,via:(d&&!idb)?"migrate":"ls"}}
 return null;
}
export async function del(){
 const d=await open();
 if(d){
  try{
   await new Promise(res=>{
    const tx=d.transaction(STORE,"readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete=res; tx.onerror=res; tx.onabort=res;
   });
  }catch(e){}
 }
 try{localStorage.removeItem(LSK)}catch(e){}
 try{localStorage.removeItem(REVK)}catch(e){}
 conflictClear();
 REV=0;
}
/* ═══ الكتابة الأخيرة ═══
   عند إغلاق الصفحة لا يُعتمَد على IndexedDB: معاملاته غير متزامنة
   وقد تُقطَع. فنكتب متزامناً في localStorage بطابعٍ أحدث.
   وإن لم يتّسع: نكتب بلا المرجع المستورد ونُعلِّمها منقوصةً — فيبقى
   رسمك كلّه، ويُرمَّم المرجع من الكاملة عند الفتح. الصمت هنا هو
   الخطأ الحقيقي، وحجبُ الكاملة بالمنقوصة أسوأ منه. */
export function flushSync(obj,opt){
 migrateLSKey();
 if(typeof localStorage==="undefined")return {ok:0,via:"none"};
 /* المقارنة متزامنة هنا: localStorage وحده — فلا معاملة تُقطَع عند
    الإغلاق. المخزَّن أحدث ⇒ لا نكتب فوقه، ونُبقي نسختنا جانباً. */
 const force=!!(opt&&opt.force);
 const theirs=peekRevLS();
 if(!force&&theirs>REV){
  const kept=stash(obj,theirs+1);
  const c={ok:0,via:"conflict",conflict:1,theirs,ours:REV,kept};
  if(ONCONF)ONCONF(c);
  return c;
 }
 const rev=Math.max(theirs,REV)+1;
 try{
  localStorage.setItem(LSK,JSON.stringify(stamp(obj,0,rev)));
  REV=rev; announce(rev);
  return {ok:1,via:"ls",rev};
 }catch(e){}
 const n=(obj&&obj.ref&&obj.ref.ents)?obj.ref.ents.length:0;
 try{
  const lite=stamp(Object.assign({},obj,
   {ref:Object.assign({},obj.ref||{},{ents:[]})}),1,rev);
  localStorage.setItem(LSK,JSON.stringify(lite));
  REV=rev; announce(rev);
  return {ok:1,via:"ls",lite:1,refs:n,rev};
 }catch(e2){FAIL++; return {ok:0,via:"ls",err:(e2&&e2.name)||"خطأ"}}
}
/* ═══ المسح الكامل ═══
   كل ما يُخزّنه البرنامج في هذا المتصفّح: المشروع وجلسته وتفضيلات
   الواجهة وأسطح العمل وخيارات الأدوات وإعداد المزوّد ومفتاحه.
   ولا سبيل إليه من الواجهة قبل الدفعة ٤ إلّا من أدوات المطوّر — وهو
   مطلبٌ عمليّ لمن يستعمل حاسباً مشتركاً.
   ولا يمسّ ما حفظه المستخدم ملفّاً على قرصه. */
/* P2-009: «civildraft:pricing-cfg» و«civildraft.ribbon»
   و«civildraft.guide.usage» ومفتاحا المراجعة والنسخة الجانبية كانوا
   خارج هذا التعداد. المسحُ الفعليُّ في purge يعتمد البادئةَ فيشملهم،
   لكن هذه القائمةَ تُقرأ في الاختبارات والوثائق — فتعدادٌ ناقصٌ هنا
   يُوهِم بأن ما ليس فيه ليس محفوظاً. */
export const LSKEYS=[LSK,"civildraft.ui","civildraft.opts","civildraft.ai",
 "civildraft.snaps","civildraft.code","civildraft.tour","civildraft:pricing",
 "civildraft:pricing-cfg","civildraft.macros","civildraft.ribbon",
 "civildraft.guide.usage",REVK,CONFK];
/* ═══ إصدارُ بنية التفضيلات ═══ P2-009
   المفاتيحُ لا تحمل رقم بنيةٍ، فأقدمُ بناءٍ قد يقرأ بنيةً أحدثَ بعد
   تنزيلٍ للخلف (downgrade) ويكتب فوقها ما يفهمه — وهو فقدٌ صامت.
   منارةٌ واحدةٌ تكفي: البناءُ يكتب رقمَه، ومن يقرأ رقماً أعلى يعلم
   أنّ التفضيلاتَ من بناءٍ أحدثَ منه فلا يثق بها ولا يمحوها.
   رقمٌ واحدٌ لكلّ المفاتيح بقصد: هي تُحدَّث معاً في كل إصدار. */
export const PREFV=1;
export const PREFVK="civildraft.prefv";
export function prefSchema(){
 if(typeof localStorage==="undefined")return {v:PREFV,ours:PREFV,newer:0};
 let v=PREFV;
 try{
  const raw=localStorage.getItem(PREFVK);
  if(raw!=null&&isFinite(+raw))v=(+raw)|0;
 }catch(e){}
 return {v,ours:PREFV,newer:v>PREFV?1:0};
}
/* يُنادى مرّةً عند الإقلاع: يرفع المنارةَ ولا يُنزلها أبداً */
export function stampPrefSchema(){
 const r=prefSchema();
 if(r.newer)return r;                 /* لا نُنزِل رقمَ بناءٍ أحدث */
 try{localStorage.setItem(PREFVK,String(PREFV))}catch(e){}
 return r;
}
/* النسخ الاحتياطية الصامتة التي خلّفتها الهجرة. المسح الكامل يشملها:
   يبقيها الإقلاعُ ما دام المستخدم لم يمسح، فإن مسح فهو يريد غيابَ
   كل شيء — ومفتاح المزوّد فيها. وبقاؤها بعد المسح يُحيي المشروع
   المحذوف في الإقلاع التالي، إذ لا نسخة جديدة ⇒ هجرة. */
const LSKEYS_OLD=["mistar.ui","mistar.opts","mistar.ai",OLD_LSK,
 "mistar.snaps","mistar.code","mistar.tour","mistar:pricing"];
const DBS=[DB,OLD_DB,"civildraft.autosave","mistar.autosave"];
export async function purge(){
 const out={ls:0,idb:0,keys:[]};
 /* ═══ مسحٌ شاملٌ لمفاتيح localStorage ═══
    كان التعداد صريحاً (LSKEYS/LSKEYS_OLD) فترك مفاتيحَ خلفه —
    mistar:pricing وcivildraft:pricing لم تكونا فيه، وأيُّ مفتاحٍ
    جديدٍ يُنسى يُحييه الاستعمالُ التالي بعد أن ظنّ المستخدمُ أنه
    مسح كلَّ شيء.
    والقاعدة الآن: كلُّ ما يحمل بادئةَ المشروعَين (نقطةً أو نقطتين)
    يُمسَح — لأن البرنامجَ مالكُ هذه المساحة، وليس فيها شيءٌ لغيره. */
 if(typeof localStorage!=="undefined"){
  const RE=/^(mistar|civildraft)[.:]/;
  const all=[];
  try{
   const n=localStorage.length|0;
   for(let i=0;i<n;i++){
    const k=localStorage.key(i);
    if(k!=null)all.push(k);
   }
  }catch(e){}
  all.filter(k=>RE.test(k)).forEach(k=>{
   try{
    localStorage.removeItem(k);
    out.ls++; out.keys.push(k);
   }catch(e){}
  });
 }
 try{await del()}catch(e){}
 /* الاتّصال يُغلَق قبل الحذف: قاعدةٌ مفتوحة تحجب deleteDatabase */
 try{
  const d=await open();
  if(d&&d.close)d.close();
 }catch(e){}
 dbP=null; MODE="?";
 if(typeof indexedDB!=="undefined"&&indexedDB.deleteDatabase){
  /* بند 61: لا عودة قبل اكتمال الحذف فعلاً. onblocked لا يُنهي الانتظار
     (القاعدة ما زالت موجودة) — السقف 800ms وحده يحسمها إن حجبها تبويبٌ آخر. */
  /* ═══ D7-05 ═══ out.idb كان يُرفَع 1 لمجرّد انتهاء الانتظار — حتى
     لو حسمته المهلة 800ms أو حجب الحذفَ تبويبٌ آخر (onblocked لا
     onsuccess). الآن كلُّ وعدٍ يُبلِّغ نجاحه الحقيقيّ: 1 فقط عند
     onsuccess، و0 عند onerror أو انقضاء المهلة. */
  const dels=DBS.map(n=>new Promise(res=>{
   let done=false, t=null;
   const fin=ok=>{ if(done)return; done=true; clearTimeout(t); res(!!ok); };
   try{
    const rq=indexedDB.deleteDatabase(n);
    t=setTimeout(fin,800);
    if(rq){ rq.onsuccess=()=>fin(true); rq.onerror=()=>fin(false); }
    else fin(true);   /* لا rq — لم يُبلَّغ خطأ، فالحذف افتُرض تمّ */
   }catch(e){ fin(false); }
  }));
  const oks=await Promise.all(dels);
  out.idb=oks.every(Boolean)?1:0;
 }
 return out;
}

/* ═══ اللقطات ═══ */
export async function snapPut(id,obj){
 const d=await open();
 if(!d)return {ok:0,via:"none"};
 try{
  await new Promise((res,rej)=>{
   const tx=d.transaction(SNAPS,"readwrite");
   tx.objectStore(SNAPS).put(obj,id);
   tx.oncomplete=res; tx.onerror=()=>rej(tx.error); tx.onabort=()=>rej(tx.error);
  });
  return {ok:1,via:"idb"};
 }catch(e){return {ok:0,via:"idb",err:(e&&e.name)||"خطأ"}}
}
export async function snapGet(id){
 const d=await open();
 if(!d)return null;
 try{
  return await new Promise((res,rej)=>{
   const tx=d.transaction(SNAPS,"readonly");
   const rq=tx.objectStore(SNAPS).get(id);
   rq.onsuccess=()=>res(rq.result||null); rq.onerror=()=>rej(rq.error);
  });
 }catch(e){return null}
}
export async function snapDel(id){
 const d=await open();
 if(!d)return;
 try{
  await new Promise(res=>{
   const tx=d.transaction(SNAPS,"readwrite");
   tx.objectStore(SNAPS).delete(id);
   tx.oncomplete=res; tx.onerror=res; tx.onabort=res;
  });
 }catch(e){}
}
