/* ═══ توليد عناصر من وصف عربي — محلّياً بلا اتصال ═══
   يحوّل جملةً عربيةً إلى قائمة ops بصيغة SPEC نفسها المُعلَنة في
   ai/ops.js، ثم يمرّرها عبر البوّابة ذاتها التي يستعملها مسار
   المساعد الشبكي: validate → runOps. لا يكتب على الحالة مباشرةً
   ولا يتجاوز أي قيد نواة؛ النواة تحكم كما تحكم في js/ui/ai.js.

   الفرق عن لوحة المساعد (js/ui/ai.js + ai/net.js): هذه المفردة لا
   تتّصل بأي خادم ولا تحتاج AI.on/AI.url — أنماطٌ ثابتة معدودة
   فقط. لذا فهي إضافةٌ صغيرة عندما لا يريد المستخدم إعداد مزوّد،
   لا بديلاً عن المساعد الحقيقي. ما لم يُطابق نمطاً معلوماً يُترَك
   دون تخمينٍ صامت — يظهر في unmatched. */
import {validate} from "./ops.js";
import {runOps}   from "./opsrun.js";
import {stripFence} from "./ctx.js";
import {LIM} from "../core/limits.js";

/* أرقام عربية/هندية + كسور → Number بالمتر (نصّ الإدخال بالمتر،
   كما في SPEC نفسها). */
const AR="٠١٢٣٤٥٦٧٨٩";
const toEn=s=>String(s).replace(/[٠-٩۰-۹]/g,d=>{
  const a="٠١٢٣٤٥٦٧٨٩".indexOf(d);
  if(a>=0) return a;
  return "۰۱۲۳۴۵۶۷۸۹".indexOf(d);
}).replace(/[٫٬]/g,".").replace(/،/g,",");

/* أعداد مكتوبة بالحروف حتى العشرة (شائعة في الوصف) */
const WORD={ "صفر":0,"واحد":1,"واحدة":1,"اثنان":2,"اثنين":2,"اثنتين":2,
 "ثلاثة":3,"ثلاث":3,"أربعة":4,"أربع":4,"خمسة":5,"خمس":5,"ستة":6,"ست":6,
 "سبعة":7,"سبع":7,"ثمانية":8,"ثمان":8,"تسعة":9,"تسع":9,"عشرة":10,"عشر":10 };

const num=s=>{
 if(s==null) return null;
 const t=String(s).trim();
 if(WORD[t]!=null) return WORD[t];
 const v=parseFloat(toEn(t).replace(",","."));
 return isFinite(v)?v:null;
};

/* مفردات الفتحات كما في OK (core/opens.js) و SPEC (ai/ops.js) */
const KIND={ "باب":"door","باب مزدوج":"double","منزلق":"sliding",
 "نافذة":"window","شباك":"window","ثابت":"fixed",
 "فتحة":"opening","قوس":"arch","كوة":"niche","كوّة":"niche" };

/* ═══ G8-2-06 ═══ NUM كانت تلتقط الأرقام العربية/الإنجليزية والفاصلة
   العادية فقط — فـ"٤٫٥" (فاصلةٌ عشرية عربية ٫ ، أو آلافٌ ٬) توقف
   الالتقاط عند ٤ فيفشل النمط كلّه على «عند» أو «في» التالية.
   toEn تُحوِّل ٫/٬ والأرقام الفارسية ۰-٩ فعلاً — فالنقص كان في
   صنف الأحرف الذي يجمع الرقم من النصّ الخام قبل الوصول إلى toEn. */
const NUM="[\\d٠-٩۰-۹.,٫٬]+|[ء-ي]+"; // رقم أو كلمة رقمية

/* أنماط صريحة — كلٌّ ينتج op واحدةً أو أكثر بصيغة SPEC حرفياً */
const RULES=[
 /* غرفة مستطيلة: «غرفة 4 في 5 عند 0 0» → 4 جدران خارجية بمحاذاة
    مركزية (align:"c") كما في افتراض addWall */
 { re:new RegExp(`غرفة\\s+(${NUM})\\s*(?:في|×|x|\\*)\\s*(${NUM})`
     +`(?:\\s+عند\\s+(${NUM})\\s+(${NUM}))?`,"i"),
   make(m){
    const w=num(m[1]), h=num(m[2]);
    const x0=num(m[3])??0, y0=num(m[4])??0;
    if(w==null||h==null||w<=0||h<=0) return null;
    const x1=x0+w, y1=y0+h, t=0.2, type="ext";
    return [
     {op:"wall",a:[x0,y0],b:[x1,y0],t,type,align:"c"},
     {op:"wall",a:[x1,y0],b:[x1,y1],t,type,align:"c"},
     {op:"wall",a:[x1,y1],b:[x0,y1],t,type,align:"c"},
     {op:"wall",a:[x0,y1],b:[x0,y0],t,type,align:"c"}
    ];
   }},
 /* جدار: «جدار من 0 0 إلى 5 0» (اختياري: سماكة X) */
 { re:new RegExp(`جدار\\s+من\\s+(${NUM})\\s+(${NUM})\\s+إلى\\s+`
     +`(${NUM})\\s+(${NUM})(?:\\s+سماكة\\s+(${NUM}))?`,"i"),
   make(m){
    const a=[num(m[1]),num(m[2])], b=[num(m[3]),num(m[4])];
    if(a.some(v=>v==null)||b.some(v=>v==null)) return null;
    const o={op:"wall",a,b,type:"int",align:"c"};
    const t=num(m[5]); if(t!=null&&t>0) o.t=t;
    return [o];
   }},
 /* فتحة على جدار: «باب على W3 عند 1.2 عرض 0.9 ارتفاع 2.1»
    — W3 معرّفُ جدارٍ حقيقيٌّ في مشروعك، كما يشترط SPEC نفسها */
 { re:new RegExp(`(باب مزدوج|باب|نافذة|شباك|منزلق|ثابت|فتحة|قوس|كوّة|كوة)`
     +`\\s+على\\s+(W\\d+)\\s+عند\\s+(${NUM})`
     +`(?:\\s+عرض\\s+(${NUM}))?(?:\\s+ارتفاع\\s+(${NUM}))?`,"i"),
   make(m){
    const kind=KIND[m[1]]; if(!kind) return null;
    const at=num(m[3]); if(at==null) return null;
    const o={op:"open",wall:m[2].toUpperCase(),kind,at};
    const w=num(m[4]); o.w=(w!=null&&w>0)?w:(kind==="window"?1.2:0.9);
    const h=num(m[5]); if(h!=null&&h>0) o.h=h;
    return [o];
   }},
 /* تسمية مساحة: «مساحة مجلس عند 2 2» — يشترط حلقةً مغلقة عند
    النقطة، كما في applyOps نفسها (regionAt) */
 { re:new RegExp(`مساحة\\s+(.+?)\\s+عند\\s+(${NUM})\\s+(${NUM})`,"i"),
   make(m){
    const at=[num(m[2]),num(m[3])];
    if(at.some(v=>v==null)) return null;
    return [{op:"area",at,name:stripFence(m[1]).trim().slice(0,40)}];
   }},
 /* نصّ: «نصّ "مدخل" عند 1 1» */
 { re:new RegExp(`نصّ?\\s+["«](.+?)["»]\\s+عند\\s+(${NUM})\\s+(${NUM})`,"i"),
   make(m){
    const at=[num(m[2]),num(m[3])];
    if(at.some(v=>v==null)) return null;
    return [{op:"text",at,s:stripFence(m[1]).slice(0,120),hm:1}];
   }}
];

/* نصّ → ops دون أي كتابة على الحالة. يعيد {ops, unmatched} */
export function opsFromText(text){
 const src=String(text==null?"":text);
 /* G8-2-01: \. وحدها كانت تقسّم كل عدد عشري (4.5 ⇐ 4 و5). الفاصلة
    العشرية لا مسافة قبلها ولا بعدها، فـ(?!\d) بعد النقطة تكفي
    لتمييزها عن نقطة نهاية الجملة (تتبعها مسافةٌ أو نهاية النص). */
 const parts=src.split(/\s*(?:ثمّ?|،|؛|\.(?!\d)|\n)\s*/).filter(s=>s.trim());
 const ops=[], unmatched=[];
 parts.forEach(p=>{
  let made=null;
  for(const r of RULES){
   const m=p.match(r.re);
   if(m){ const out=r.make(m); if(out){ made=out; break; } }
  }
  if(made) ops.push(...made);
  else unmatched.push(p.trim());
 });
 /* السقف (بند 79): وصفٌ يولّد أكثر من LIM.aiOps عملية يُقصّ عنده
    ويُذكَر ما أُسقط — لا يُكتَب ولا يُسكَت عنه. */
 let dropped=0;
 if(ops.length>LIM.aiOps.max){
  dropped=ops.length-LIM.aiOps.max;
  ops.length=LIM.aiOps.max;
 }
 return {ops, unmatched, dropped};
}

/* المسار الكامل: نصّ → ops → validate (ops.js) → (اختياري)
   runOps (opsrun.js). بلا commit: تقرير جافّ للمعاينة فقط — لا
   يُكتَب شيء على الحالة. مع commit: يكتب عبر edit() فخطوةُ تراجعٍ
   واحدة (Ctrl+Z)، تماماً كما يفعل زرّ «نفّذ» في لوحة المساعد.

   الترتيب مقصود: validate أوّلاً، ولا runOps إلا بعده وبما صحّ
   وحده. والمُنفَّذ هو الخامُّ بالمتر للعمليات الصالحة (لا مخرَج
   validate().ok — بالمليمتر — فإعادةُ تصديقه تضخّم الأبعاد ألفاً).
   ولا commit تلقائياً أبداً: الافتراضيّ false، والواجهة لا تمرّر
   true إلا بنقرةٍ صريحة على «توليد ونفّذ». */
export function generateFromText(text,{commit=false}={}){
 const {ops,unmatched,dropped}=opsFromText(text);
 const {ok,bad}=validate(ops);          // بوّابة ops.js نفسها
 const rejected=bad.slice();
 if(dropped)rejected.push({i:ops.length,
  why:`تجاوز الوصفُ حدَّ ${LIM.aiOps.max} عملية — أُسقطت ${dropped} `
   +`زائدة (اطلب الباقي على دفعة أخرى)`});
 const report={ generated:ops.length, valid:ok.length,
                rejected, unmatched };
 if(commit && ok.length){
  const badAt=new Set(bad.map(b=>b.i));
  const good=ops.filter((_,i)=>!badAt.has(i));
  report.result=runOps(good);           // edit() ⇒ خطوة تراجع واحدة
  report.committed=true;
 }
 return report;
}
