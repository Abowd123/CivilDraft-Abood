/* ═══ المزوّد ═══ الموضع الوحيد الذي يخرج منه شيء من هذا الجهاز.
   الإعداد في localStorage لا في المشروع — فلا يُحفَظ ولا يُصدَّر.
   واجهة OpenAI-متوافقة، فتصلح لـ OpenAI و Groq و OpenRouter
   و Ollama و llama.cpp المحلّيين بلا تغيير كود. */

const K="civildraft.ai";
/* حدّ حجم الردّ: 1 م.ب — يكفي لخطّةٍ من 200 سطرٍ بأريحية، ويمنع
   ردّاً ضخماً من استهلاك الذاكرة أو تعليق الواجهة. */
export const MAX_RESPONSE=1024*1024;
/* مهلة الاتصال: 60 ثانية — النماذج المحلّية قد تكون بطيئة، لكن
   لا يجوز أن يعلّق الطلب بلا نهاية. */
const TIMEOUT_MS=60000;
/* ═══ حدود الطلب — بند 98 ═══
   ما يخرج من الجهاز له سقف يُفرَض قبل fetch لا بعده.
   الأرقام نسخٌ من LIM.aiQuestion/aiContext/aiResponse في
   core/limits.js — وهذا الملفّ ورقةٌ بلا استيراد بقصدٍ محروس
   (dom.js) فلا يستورد الجدول، ويحرس التطابقَ اختبارُ
   phase8.gate.test.js فلا تنجرف النسختان.
   · MAX_QUESTION  سؤال المستخدم وحده
   · MAX_CONTEXT   خلاصة المشروع (digest) وتعليمات النظام
   · MAX_IMAGE     محارف data: URL للصورة (= LIM.imageBytes)
   ورسالةُ المستخدم في ask() = خلاصة + سؤال، فسقفها مجموعهما
   (+ هامش العنوان). */
export const MAX_QUESTION=8000;
export const MAX_CONTEXT=20000;
export const MAX_IMAGE=4*1024*1024;
/* هامشُ عنوان «## الطلب» وفواصله بين الخلاصة والسؤال */
const ENVELOPE=200;
/* جلب قائمة النماذج قراءةٌ خفيفة: مهلةٌ قصيرةٌ منفصلة عن مهلة الطلب */
export const MODELS_TIMEOUT_MS=15000;
/* هجرة لمرةٍ واحدة من «mistar.ai»: نسخٌ خام إن لم يوجد الجديد، والقديم
   يبقى نسخةً احتياطية صامتة. (ملفٌّ بلا استيراد — فالمقطع مضمَّن) */
const OLD_K="mistar.ai";
function migrateAI(){
 try{
  if(localStorage.getItem(K)!==null)return;
  const v=localStorage.getItem(OLD_K);
  if(v!==null)localStorage.setItem(K,v);
 }catch(e){}
}
export const AI={url:"http://localhost:11434/v1/chat/completions",
 key:"", model:"", preset:"ollama", temp:0, vision:0, maxLines:200, on:0,
 keep:0,              /* الافتراضي: المفتاح للجلسة وحدها */
 wantIns:0, wantTtl:0};

/* قائمةُ سماحٍ للمفاتيح: مخزنٌ معطوب أو محرَّرٌ يدوياً لا يحقن
   حقولاً لا نعرفها في كائنٍ يُرسَل جسمُه في كل نداء */
const KEYS=["url","key","model","preset","temp","vision","maxLines","on",
 "keep","wantIns","wantTtl"];

/* ═══ مزوّدون جاهزون ═══ كلها واجهة OpenAI-متوافقة بلا تغيير كود.
   «مخصّص» يترك العنوان كما كتبه المستخدم، لكنّه **لا يعمل إلّا ضمن
   CSP_ORIGINS** (منفذٌ محلّيٌّ آخر لنفس الخدمتين مثلاً). مضيفٌ بعيدٌ
   آخر (Together، DeepSeek…) تحجبه السياسة، وvalidateUrl يقول ذلك. */
export const PRESETS=[
 {id:"ollama",    label:"Ollama (محلّي)",
  url:"http://localhost:11434/v1/chat/completions"},
 {id:"llamacpp",  label:"llama.cpp (محلّي)",
  url:"http://localhost:8080/v1/chat/completions"},
 {id:"openai",    label:"OpenAI",
  url:"https://api.openai.com/v1/chat/completions"},
 {id:"groq",      label:"Groq",
  url:"https://api.groq.com/openai/v1/chat/completions"},
 {id:"gemini",    label:"Google Gemini",
  url:"https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"},
 {id:"openrouter",label:"OpenRouter",
  url:"https://openrouter.ai/api/v1/chat/completions"},
 {id:"custom",    label:"مخصّص (المضيفون المدعومون فقط)", url:""}
];

export function loadAI(){
 if(typeof localStorage==="undefined")return AI;
 migrateAI();
 try{
  const raw=localStorage.getItem(K);
  if(!raw)return AI;
  const d=JSON.parse(raw)||{};
  KEYS.forEach(k=>{if(d[k]!==undefined)AI[k]=d[k]});
  AI.url=String(AI.url||"").slice(0,300);
  AI.key=String(AI.key||"");
  AI.key=AI.key.slice(0,500);
  AI.model=String(AI.model||"").slice(0,80);
  AI.preset=String(AI.preset||"").slice(0,40);
  AI.temp=Math.max(0,Math.min(1,+AI.temp||0));
  AI.maxLines=Math.max(1,Math.min(2000,+AI.maxLines||200));
  ["vision","on","keep","wantIns","wantTtl"]
   .forEach(k=>{AI[k]=AI[k]?1:0});
  delete AI.__ok;          /* موافقةُ جلسةٍ لا تُستعاد */
 }catch(e){}
 return AI;
}
/* P2-005: الامتلاءُ كان يُبتلَع فيضيع المفتاحُ والمزوِّدُ بلا كلمة.
   والكتابةُ محلّيّةٌ هنا بقصد: هذا الملفّ ورقةٌ بلا استيرادٍ واحد
   (يحرسه dom.js) فلا يجرّ معه حالةً ولا واجهة. */
let AIFAIL=null, AISAID=false;
export const setAiError=f=>{AIFAIL=(typeof f==="function")?f:null};
export function saveAI(){
 if(typeof localStorage==="undefined")return {ok:0,err:"لا تخزين"};
 const o={};
 KEYS.forEach(k=>{o[k]=AI[k]});
 if(!AI.keep)o.key="";      /* لا يُكتَب على القرص */
 try{
  localStorage.setItem(K,JSON.stringify(o));
  AISAID=false;
  return {ok:1};
 }catch(e){
  const n=(e&&e.name)||"خطأ";
  if(AIFAIL&&!AISAID){AISAID=true; AIFAIL(n)}
  return {ok:0,err:n};
 }
}
/* ═══ فحص العنوان — بند 98 ═══
   عنوانٌ يُكتَب بيدٍ أو يُقرأ من مخزنٍ محرَّر لا يُسلَّم إلى fetch
   قبل أن يمرّ من هنا: http وhttps وحدهما، بلا file: ولا javascript:
   ولا data: ولا blob:، ومنفذٌ بين 1 و65535 إن وُجد، وبلا بيانات
   دخولٍ داخل العنوان (fetch نفسها ترفضها، وهي حيلةُ تمويهٍ معروفة:
   «http://localhost@evil.com»). يعيد كائن URL المحلَّل. */
export function validateUrl(url){
 const s=String(url==null?"":url).trim();
 if(!s)throw new Error("عنوان المزوّد فارغ");
 if(s.length>300)throw new Error("عنوان المزوّد أطول من 300 محرف");
 let u;
 try{u=new URL(s)}
 catch(e){throw new Error("عنوان المزوّد غير صالح")}
 if(u.protocol!=="http:"&&u.protocol!=="https:")
  throw new Error(`بروتوكول «${u.protocol}» غير مسموح — `
   +`http أو https فقط`);
 if(!u.hostname)throw new Error("عنوان المزوّد بلا مضيف");
 if(u.username||u.password)
  throw new Error("لا بيانات دخولٍ داخل العنوان — ضعها في حقل المفتاح");
 if(u.port!==""){
  const p=+u.port;
  if(!(p>=1&&p<=65535))throw new Error("منفذٌ خارج 1–65535");
 }
 return u;
}
/* ═══ قائمةُ السماح = connect-src ═══ (مراجعة 2026-10-03)
   بقرارِ المالك المزوّدُ المخصّصُ غيرُ مدعوم وconnect-src مضيّقةٌ إلى
   هذه الأصول، لكنّ الواجهةَ ظلّت تعرض «مخصّص» فيكتب المستخدمُ عنواناً
   تحجبه CSP بصمت ويرى «Failed to fetch» بعد محاولتين. الآن يُرفَض
   العنوانُ قبل fetch برسالةٍ تقول السبب. والقائمةُ هي نفسُها في
   index.html و_headers وnetlify.toml — يحرس ذلك csp-origins.test.js. */
export const CSP_ORIGINS=Object.freeze([
 "http://localhost:11434","http://localhost:8080",
 "http://127.0.0.1:11434","http://127.0.0.1:8080",
 "https://api.openai.com","https://api.groq.com",
 "https://generativelanguage.googleapis.com","https://openrouter.ai"]);
/* validateUrl يبقى فحصاً للصياغة وحدها (عقدُ phase8)؛ وهذا فحصُ
   الوصول: يُنادى قبل كلّ fetch. */
export function assertReachable(url){
 const u=(url instanceof URL)?url:validateUrl(url);
 if(!cspAllows(u))
  throw new Error(`المضيف «${u.host}» محجوبٌ بسياسة الأمان (CSP) — `
   +"المدعوم: Ollama وllama.cpp محلّياً، وOpenAI وGroq وGemini وOpenRouter");
 return u;
}
export function cspAllows(u){
 if(CSP_ORIGINS.includes(u.origin))return true;
 /* 'self': الأصلُ نفسُه مسموحٌ دائماً */
 try{return typeof location!=="undefined"&&u.origin===location.origin}
 catch(e){return false}
}
/* ═══ سببٌ مقروءٌ قبل الردّ الخام ═══ (المرحلة ٣) كان «المزوّد 401: {json}»
   وحده؛ المستخدمُ لا يعرف أنّ 401 تعني المفتاح. الرقمُ والردُّ باقيان. */
export const httpHint=s=>s===401||s===403?" (المفتاح غير صالح أو بلا صلاحية)"
 :s===404?" (العنوان أو اسم النموذج غير صحيح)"
 :s===429?" (تجاوزتَ حدَّ الطلبات أو الرصيد — انتظر قليلاً)"
 :s>=500?" (عطلٌ عند المزوّد نفسه)":"";
export const ready=()=>!!(AI.on&&AI.url&&AI.model);
/* ═══ محلّيّ؟ ═══ عليها يقوم سؤال الموافقة، فلا تُخدَع بالبادئة:
   الحكم على hostname المحلَّل بالتساوي التامّ لا على بدايةِ النصّ —
   «http://localhost.evil.com» و«http://127.0.0.1.evil.com» ليسا
   محلّيَّين، وكان التعبير النمطيّ القديم يعدّهما كذلك فيُسقِط
   سؤال الموافقة عن مضيفٍ خارجيّ. عنوانٌ لا يُحلَّل ⇒ غير محلّي. */
const LOCAL_HOSTS=new Set(["localhost","127.0.0.1","::1"]);
export const isLocal=()=>{
 try{
  const u=validateUrl(AI.url);
  const h=u.hostname.replace(/^\[|\]$/g,"").replace(/\.$/,"")
   .toLowerCase();
  return LOCAL_HOSTS.has(h);
 }catch(e){return false}
};
/* عنوانٌ محرَّرٌ يدوياً قد لا يُحلَّل، ولا يجوز أن يُسقط الحوار */
export const hostOf=()=>{
 try{return new URL(AI.url).host}
 catch(e){return String(AI.url||"—").slice(0,60)}
};
/* ═══ الإلغاء ═══ مسارا الطلب والنماذج منفصلان — بند 98.
   كان مِقطَعٌ واحدٌ عامّ: جلبُ النماذج يُلغي طلباً جارياً، والطلبُ
   يُلغي جلبَ النماذج، وطلبان متزامنان (المساعد ومرشد المساعدة)
   يقتل أحدُهما الآخر. اليوم: لكل طلبٍ مِقطَعُه الخاصّ في مجموعةٍ،
   وabortAsk() (زرّ «ألغِ») يُلغي الجارية وحدها، ولا يبدأ نداءٌ
   جديدٌ بإلغاء غيره. */
const ASK_CTRLS=new Set();
let MODELS_CTRL=null;
export const abortAsk=()=>{
 ASK_CTRLS.forEach(c=>{try{c.abort()}catch(e){}});
 ASK_CTRLS.clear();
};
export const abortModels=()=>{
 if(MODELS_CTRL){try{MODELS_CTRL.abort()}catch(e){} MODELS_CTRL=null}
};
export const abort=()=>{abortAsk(); abortModels()};
export async function ask(sys,user,img){
 if(!ready())throw new Error("المزوّد غير مُهيَّأ — اضبطه في لوحة "
  +"«المساعد»");
 /* ═══ الفحص قبل fetch لا بعده ═══ */
 validateUrl(AI.url);
 assertReachable(AI.url);     /* CSP: رسالةٌ واضحة لا «Failed to fetch» */
 const sysS=String(sys==null?"":sys), userS=String(user==null?"":user);
 if(sysS.length>MAX_CONTEXT)
  throw new Error(`تعليمات النظام ${sysS.length} محرفاً — الحدّ `
   +`${MAX_CONTEXT}`);
 if(userS.length>MAX_CONTEXT+MAX_QUESTION+ENVELOPE)
  throw new Error(`الطلب ${userS.length} محرفاً — الحدّ `
   +`${MAX_CONTEXT+MAX_QUESTION+ENVELOPE} (خلاصة المشروع `
   +`${MAX_CONTEXT} + السؤال ${MAX_QUESTION})`);
 if(img){
  if(typeof img!=="string"||!/^data:image\//i.test(img))
   throw new Error("الصورة ليست data:image");
  if(img.length>MAX_IMAGE)
   throw new Error(`الصورة ${img.length} محرفاً — الحدّ ${MAX_IMAGE}`);
 }
 /* مِقطَعٌ لهذا الطلب وحده — لا abort() تلقائيّ لغيره */
 const content=img
  ? [{type:"text",text:user},
     {type:"image_url",image_url:{url:img}}]
  : user;
 const t0=performance.now();
 /* ═══ إعادةُ محاولةٍ واحدةٌ عند الفشل العابر وحده ═══
    فشل الشبكة و5xx عابرٌ غالباً، و4xx خطأٌ في الطلب نفسه —
    إعادةُ إرساله تُعيد الخطأَ نفسه وتضاعف الزمن بلا فائدة.
    وAbortError لا يُعاد قط: ألغى المستخدم فانتهى.
    D8-03: كلّ محاولةٍ تأخذ AbortController ومؤقّتها الخاصّ — لا
    مشاركةَ ctrl/timer بين المحاولات. */
 const makeSend=()=>{
  const ctrl=new AbortController();
  ASK_CTRLS.add(ctrl);
  const timer=setTimeout(()=>ctrl.abort(),TIMEOUT_MS);
  const p=fetch(AI.url,{method:"POST",signal:ctrl.signal,
   headers:Object.assign({"content-type":"application/json"},
    AI.key?{authorization:"Bearer "+AI.key}:{}),
   body:JSON.stringify({model:AI.model,
    temperature:+AI.temp||0,
    messages:[{role:"system",content:sys},
              {role:"user",content}]})})
   .finally(()=>{clearTimeout(timer); ASK_CTRLS.delete(ctrl)});
  return p;
 };
 let r;
 try{
  try{ r=await makeSend() }
  catch(e1){
   if(e1.name==="AbortError")throw e1;
   r=await makeSend();        /* انقطاعُ شبكةٍ عابر — محاولة أخيرة */
  }
  if(r.status>=500)r=await makeSend();   /* 5xx من الخدمة: محاولة واحدة */
 }catch(e){
  if(e.name==="AbortError")
   throw new Error("أُلغي الطلب أو تجاوز المهلة");
  throw new Error("تعذّر الوصول إلى المزوّد: "+e.message
   +(isLocal()?" — هل الخدمة المحلّية تعمل؟":""));
 }
 if(!r.ok){
  const t=await r.text().catch(()=>"");
  throw new Error(`المزوّد ${r.status}${httpHint(r.status)}: ${t.slice(0,180)}`);
 }
 /* ═══ حدّ الحجم قبل التحليل ═══
    ردٌّ ضخم يستهلك الذاكرة ويعطّل الواجهة. نقرأ النصّ أوّلاً،
    نفحص حجمه، ثم نُحلِّل JSON. */
 const text=await r.text();
 if(text.length>MAX_RESPONSE)
  throw new Error(`ردٌّ أكبر من الحدّ `
   +`(${MAX_RESPONSE} محرف) — المزوّد أرسل ${text.length}`);
 let j;
 try{j=JSON.parse(text)}
 catch(e){throw new Error("ردٌّ ليس JSON صالحاً")}
 const msg=j.choices&&j.choices[0]&&j.choices[0].message;
 if(!msg||msg.content==null)throw new Error("ردٌّ بلا محتوى");
 return {txt:String(msg.content), usage:j.usage||null,
  ms:Math.round(performance.now()-t0)};
}

/* ═══ النماذج المتاحة ═══ قراءةٌ فقط لا نداء — GET واحد على /models
   بمفتاح النداء نفسه. عنوان /models مشتقّ من عنوان النداء:
   يُنزَع «chat/completions» إن وُجد، وإلّا يُلحَق بالأساس مباشرة —
   فيصلح لمزوّدٍ جاهزٍ ولمخصّصٍ كتبه المستخدم بيدِه. */
export function modelsUrl(){
 const s=String(AI.url||"").trim().replace(/\s+/g,"");
 let u;
 try{ u=new URL(s); }catch(e){
   let t=s.replace(/\/+$/,"").replace(/\/chat\/completions$/i,"");
   return t+"/models";
 }
 u.pathname=u.pathname.replace(/\/+$/,"").replace(/\/chat\/completions$/i,"");
 u.search=""; u.hash="";
 let out=u.toString().replace(/\/+$/,"");
 return out+"/models";
}
export async function listModels(){
 if(!AI.url)throw new Error("اضبط العنوان أوّلاً");
 validateUrl(AI.url);
 const url=modelsUrl();
 validateUrl(url);            /* المشتقّ يُفحَص كالأصل */
 assertReachable(url);
 /* يُلغي جلبَ نماذجَ سابقاً وحده — لا طلباً جارياً (بند 98) */
 abortModels();
 const ctrl=new AbortController();
 MODELS_CTRL=ctrl;
 const timer=setTimeout(()=>ctrl.abort(),MODELS_TIMEOUT_MS);
 try{
  const r=await fetch(url,{method:"GET",signal:ctrl.signal,
   headers:AI.key?{authorization:"Bearer "+AI.key}:{}});
  if(!r.ok){
   const t=await r.text().catch(()=>"");
   throw new Error(`المزوّد ${r.status}${httpHint(r.status)}: ${t.slice(0,140)}`);
  }
  /* الحدّ نفسه قبل التحليل: قائمةُ نماذج لا تُقبَل أكبر من ردّ */
  const text=await r.text();
  if(text.length>MAX_RESPONSE)
   throw new Error(`ردٌّ أكبر من الحدّ (${MAX_RESPONSE} محرف)`);
  let j;
  try{j=JSON.parse(text)}
  catch(e){throw new Error("ردٌّ ليس JSON صالحاً")}
  const ids=((j&&(j.data||j.models))||[])
   .map(m=>m&&(m.id||m.name)).filter(Boolean)
   .sort((a,b)=>String(a).localeCompare(String(b)));
  if(!ids.length)throw new Error("ردٌّ بلا نماذج");
  return ids;
 }catch(e){
  if(e.name==="AbortError")
   throw new Error("أُلغي الطلب أو تجاوز مهلة "
    +`${MODELS_TIMEOUT_MS/1000} ثانية`);
  throw new Error("تعذّر جلب النماذج: "+e.message
   +(isLocal()?" — هل الخدمة المحلّية تعمل؟":""));
 }finally{
  clearTimeout(timer);
  if(MODELS_CTRL===ctrl)MODELS_CTRL=null;
 }
}
