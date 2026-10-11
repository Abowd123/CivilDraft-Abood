/* ═══ مخزن الواجهة ═══
   حالة النافذة لا حالة الرسم: مفتاحٌ منفصل لا يدخل pack() ولا
   التاريخ ولا ملفّ المشروع. فتح لوحةٍ ليس تعديلاً على المخطط،
   وحفظ المشروع لا يحمل تفضيلات نافذتك إلى حاسبٍ آخر.

   وS.lay يبقى في المشروع لأن إخفاء طبقةٍ يغيّر ما يُصدَّر — فهو
   حالة رسم. هذا هو الفرق بين المخزنَين، وهو صريح لا ضمنيّ. */

const KEY="civildraft.ui";
/* هجرة لمرةٍ واحدة من الاسم القديم: تُنسَخ القيمة كما هي (نصّاً بلا
   تحليل) إن لم يوجد المفتاح الجديد، ولا يُحذَف القديم — يبقى نسخةً
   احتياطية صامتة. المفتاح الجديد الموجود لا يُكتَب فوقه أبداً. */
const OLD_KEY="mistar.ui";
let MIGD=false;
function migrateKey(){
 if(MIGD)return; MIGD=true;
 if(typeof localStorage==="undefined")return;
 try{
  if(localStorage.getItem(KEY)!==null)return;
  const v=localStorage.getItem(OLD_KEY);
  if(v!==null)localStorage.setItem(KEY,v);
 }catch(e){}
}

export const DEFUI=()=>({
 shell:"ribbon",       /* classic | ribbon — الشريط المجمَّع افتراضياً */
 theme:"dark",        /* dark | light */
 icons:1,
 tab:"draw",          /* آخر تبويبٍ نشط — «رسم» بعد حذف «رئيسي» (المرحلة ٤) */
 ribbonMin:0,         /* الشريط مطويّ */
 beginner:0,          /* وضع المبتدئ: شريطٌ مختصر (ribbon/beginner.js) */
 clean:0,             /* الشاشة النظيفة */
 ctxAuto:0,           /* الانتقال التلقائي إلى التبويب السياقي */
 welcomed:0,          /* D12-EP6: هل أُغلقت بطاقة الترحيب */
 layout:null,         /* يُطبَّع في dock.js — DEFLAY مصنعه */
 ws:{},               /* أسطح عملٍ محفوظة بالاسم */
 wsCur:"",            /* السطح الجاري */
 logH:84,             /* D12-EP6: سجلٌّ منخفضٌ افتراضياً بدل 120 */
 stHide:{joins:1,solo:1,theme:1,save:1},  /* معرّف عنصرٍ في شريط الحالة ⇒ 1 مخفيّ — الجديدة المتكاملة مع العلوي مخفيةٌ افتراضياً لضيق الشريط */
 views:[],            /* مناظر مسمّاة — إحداثيُّ عرضٍ لا بياناتُ رسم */
 compass:1, vpLabel:1, navbar:1, lockUI:0,
 cmdMode:"bottom", cmdOpa:100, cmdX:24, cmdY:0, cmdW:620,
 rclick:"auto",       /* auto | enter | menu */
 qp:1, qpFree:0, qpX:16, qpY:16,
 /* «مؤخّراً» — المرحلة ١ من audit/10-ui-plan.md
    معرّفاتُ أدواتٍ بترتيبِ آخرِ استعمال، أحدثُها أوّلاً. يُحفَظ لأنّ
    قيمتَه في العبورِ بين الجلسات: شريطٌ يتعلّم ثم يُنسى كلَّ صباحٍ
    لا يتعلّم. والسقفُ في الوحدةِ نفسِها (`recentbar.js`) لا هنا. */
 recent:[],
 /* ═══ الكثافة ═══ المرحلة ٣ من audit/10-ui-plan.md
    comfy | compact | touch — مضاعفٌ واحدٌ على سلّمِ المسافاتِ في
    css/tokens.css. و«مريحة» هي المظهرُ كما كان حرفاً. */
 density:"comfy",
 /* ═══ الواجهة التعليمية ═══ تقدّمُ المتعلّم: {معرّفُ الدرس: {stars,at,dur}} */
 learn:{}
});
export const UIS=DEFUI();
let FAIL=0;
/* ═══ المراجعة بين التبويبات ═══ P4-009
   تفضيلات الواجهة كانت تُكتَب غير مشروطة أيضاً: تبويبٌ يحفظ تخطيطه
   فيمحو تخطيطاً أحدث حفظه تبويبٌ آخر. المراجعةُ نفسها هنا: رقمٌ مع
   كل حفظ، ومقارنةٌ قبل الكتابة، وحدث storage يُبلّغ الباقين. */
const RK="__rev";
let REV=0, ONCONF=null, WATCH=false, SUBS=[];
export const uiRevision=()=>REV;
export const onUiConflict=f=>{ONCONF=(typeof f==="function")?f:null};
const revOf=o=>{const v=o&&+o[RK]; return (isFinite(v)&&v>0)?(v|0):0};
function peekRev(){
 if(typeof localStorage==="undefined")return 0;
 try{
  const raw=localStorage.getItem(KEY);
  return raw?revOf(JSON.parse(raw)):0;
 }catch(e){return 0}
}
/* يُنادى من app.js: تغيّرٌ من تبويبٍ آخر يُعاد تحميله لا يُكتَب فوقه */
export function watchUI(fn){
 if(typeof fn==="function"&&SUBS.indexOf(fn)<0)SUBS.push(fn);
 if(!WATCH&&typeof addEventListener==="function"){
  WATCH=true;
  addEventListener("storage",e=>{
   if(!e||e.key!==KEY)return;
   if(peekRev()<=REV)return;
   if(loadUI())SUBS.slice().forEach(f=>{try{f({rev:REV})}catch(x){}});
  });
 }
 return ()=>{SUBS=SUBS.filter(x=>x!==fn)};
}

export function loadUI(skip){
 migrateKey();                      /* نسخٌ خام — لا يقرأ ولا يُفسِد */
 if(skip)return false;              /* وضع الإنقاذ: المصنع وحده */
 if(typeof localStorage==="undefined")return false;
 try{
  const raw=localStorage.getItem(KEY);
  if(!raw)return false;
  const d=JSON.parse(raw);
  if(!d||typeof d!=="object")return false;
  REV=Math.max(REV,revOf(d));
  const def=DEFUI();
  Object.keys(def).forEach(k=>{
   if(d[k]!==undefined&&typeof d[k]===typeof def[k])UIS[k]=d[k];
  });
  if(!/^(classic|ribbon)$/.test(UIS.shell))UIS.shell="ribbon";
  if(!/^(dark|light)$/.test(UIS.theme))UIS.theme="dark";
  if(!/^(comfy|compact|touch)$/.test(UIS.density))UIS.density="comfy";
  UIS.icons=UIS.icons?1:0;
  if(typeof UIS.tab!=="string"||!/^[\w-]{1,16}$/.test(UIS.tab))
   UIS.tab="draw";
  ["ribbonMin","beginner","clean","ctxAuto","welcomed"].forEach(k=>{UIS[k]=UIS[k]?1:0});
  UIS.logH=Math.max(0,Math.min(400,+UIS.logH||120));
  /* بعد — الكائن المستوي وحده: المصفوفة تمرّ من typeof فيدخل
     `ws:[]` فيُعطب Object.keys ويُفرغ أسطح العمل صامتاً */
  const plain=v=>!!v&&typeof v==="object"&&!Array.isArray(v);
  if(!plain(UIS.layout))UIS.layout=null;
  if(!plain(UIS.ws))UIS.ws={};
  /* «مؤخّراً»: معرّفاتٌ نصّيةٌ قصيرةٌ وحدَها، وستّةٌ على الأكثر.
     ملفٌّ محرَّرٌ يدوياً بمصفوفةِ كائناتٍ لا يُعطِب الشريط. */
  if(!Array.isArray(UIS.recent))UIS.recent=[];
  UIS.recent=UIS.recent
   .filter(v=>typeof v==="string"&&/^[\w.-]{1,32}$/.test(v))
   .slice(0,6);
  UIS.ws=Object.fromEntries(Object.entries(UIS.ws).slice(0,24));
  UIS.wsCur=String(UIS.wsCur||"").slice(0,32);
  if(!plain(UIS.stHide))UIS.stHide={};
  /* تقدّمُ الدروس: معرّفاتٌ قصيرة ونجومٌ بين ٠ و٣ وحدها */
  UIS.learn=Object.fromEntries(Object.entries(plain(UIS.learn)?UIS.learn:{})
   .filter(([k,v])=>/^[\w-]{1,32}$/.test(k)&&plain(v))
   .slice(0,256)        /* المرحلة ٨: ٤٢ درساً وبطاقاتُ الأدوات (c-…) */
   .map(([k,v])=>[k,{stars:Math.max(0,Math.min(3,(+v.stars|0))),at:isFinite(+v.at)?+v.at:0,
    dur:Math.max(0,Math.min(86400,(+v.dur|0)))}]));
  UIS.views=(Array.isArray(UIS.views)?UIS.views:[])
   .filter(v=>v&&typeof v.n==="string"&&isFinite(v.k)
    &&isFinite(v.cx)&&isFinite(v.cy)).slice(0,24);
  ["compass","vpLabel","navbar","lockUI"]
   .forEach(k=>{UIS[k]=UIS[k]?1:0});
  if(!/^(bottom|top|float)$/.test(UIS.cmdMode))UIS.cmdMode="bottom";
  if(!/^(auto|enter|menu)$/.test(UIS.rclick))UIS.rclick="auto";
  UIS.cmdOpa=Math.max(40,Math.min(100,+UIS.cmdOpa||100));
  ["qp","qpFree"].forEach(k=>{UIS[k]=UIS[k]?1:0});
  ["cmdX","cmdY","cmdW","qpX","qpY"].forEach(k=>{
   UIS[k]=isFinite(+UIS[k])?Math.round(+UIS[k]):0;
  });
  return true;
 }catch(e){return false}
}
let T=null, ONFAIL=null, WARNED=false;
/* الفشل يُقال مرّةً: الصمت هو ما كان يُفقِد المستخدم تخطيطه بلا
   كلمة، فيكتشفه في الإقلاع التالي — وuiFailed كان يُقرأ في boot
   وحده، فامتلاءٌ وسط الجلسة لا يُبلَّغ عنه أبداً. */
export const setUiError=f=>{ONFAIL=(typeof f==="function")?f:null};
export function saveUI(){
 if(typeof localStorage==="undefined")return;
 if(T)clearTimeout(T);
 T=setTimeout(()=>{
  T=null;
  try{
   /* compare-and-swap: الأحدثُ لا يُكتَب فوقه */
   const theirs=peekRev();
   if(theirs>REV){
    REV=theirs;
    loadUI();                    /* نتبنّى الأحدث بدل محوه */
    if(ONCONF)ONCONF({theirs,ours:REV});
    SUBS.slice().forEach(f=>{try{f({rev:REV,conflict:1})}catch(x){}});
    return;
   }
   REV=theirs+1;
   localStorage.setItem(KEY,JSON.stringify(Object.assign({},UIS,{[RK]:REV})));
   FAIL=0;
  }catch(e){
   FAIL++;
   if(!WARNED&&ONFAIL){
    WARNED=true;
    ONFAIL((e&&e.name)||"خطأ");
   }
  }
 },500);
}
export const uiFailed=()=>FAIL;

export function uiSet(k,v){
 if(!(k in UIS))return false;
 UIS[k]=v; saveUI();
 return true;
}
/* ═══ انفتاح اللوحات ═══
   يسكن في layout.p[id].o — مصدرٌ واحد. وpanels.js يكتب هنا عند
   كل طيٍّ أو فتح، فلا يفترق المرسوم عن المحفوظ. */
const pOf=id=>{
 if(!UIS.layout||!UIS.layout.p)return null;
 return UIS.layout.p[id]||null;
};
export function secSet(id,open){
 const p=pOf(id);
 if(!p)return;
 p.o=open?1:0;
 saveUI();
}
export const secOpen=(id,def)=>{
 const p=pOf(id);
 return p?!!p.o:!!def;
};
export function resetUI(){
 const d=DEFUI();
 Object.keys(d).forEach(k=>{UIS[k]=d[k]});
 saveUI();
}
