/* ═══ قاعدة معرفة روبوت الإرشاد ═══
   تبني بطاقات شرحٍ عربية لكل أداةٍ تلقائياً من registry.js فيبقى
   الشرح متزامناً مع الأداة. لا يلمس الحالة S — معرفةٌ للقراءة فقط. */
import {toolList, findTool, isDestruct} from "../../tools/registry.js";

const TYPE={ sel:"اختيار", text:"نصّ", chk:"مربّع اختيار",
 len:"طول (متر)", num:"رقم", ang:"زاوية", pt:"نقطة" };

export function toolCard(d){
 if(!d||!d.id) return null;
 const steps=(d.steps||[]).map((s,i)=>({n:i+1,text:String(s.p||"").trim()}))
  .filter(s=>s.text);
 const opts=(d.opts||[]).map(o=>({
  key:o.k, label:o.label||o.k, type:TYPE[o.type]||o.type||"",
  def:(o.def!==undefined?o.def:null), hint:o.hint||"",
  choices:Array.isArray(o.items)
    ? o.items.map(it=>Array.isArray(it)?it[1]:String(it)):null }));
 const alias=String(d.alias||"").split(/\s+/).filter(Boolean);
 return { id:d.id, label:d.label||d.id, hint:d.hint||"", alias,
  destructive:isDestruct(d), steps, opts,
  text:renderCardText({label:d.label||d.id,hint:d.hint||"",steps,opts,
        destructive:isDestruct(d)}) };
}
export function renderCardText({label,hint,steps,opts,destructive}){
 const L=[];
 L.push(`أداة «${label}»`+(destructive?" ⚠ (تُعدّل ما هو مرسوم)":""));
 if(hint) L.push(hint);
 if(steps.length){ L.push("الخطوات:");
  steps.forEach(s=>L.push(`${s.n}. ${s.text}`)); }
 if(opts.length){ L.push("الخيارات:");
  opts.forEach(o=>{ let line=`• ${o.label}`;
   if(o.type) line+=` (${o.type})`;
   if(o.choices&&o.choices.length) line+=`: ${o.choices.join(" / ")}`;
   else if(o.def!=null&&o.def!=="") line+=` — الافتراضي: ${o.def}`;
   L.push(line); }); }
 return L.join("\n");
}
let _index=null;
export function buildIndex(force){
 if(_index&&!force) return _index;
 const cards=toolList().map(toolCard).filter(Boolean);
 _index={cards, byId:Object.fromEntries(cards.map(c=>[c.id,c])),
  count:cards.length};
 return _index;
}
export function cardById(id){ return buildIndex().byId[id]||null; }
export function cardByName(name){ const d=findTool(name);
 return d?toolCard(d):null; }
export function allCards(){ return buildIndex().cards; }

export const ARTICLES=[
 { id:"units", title:"نظام الوحدات",
   keywords:["متر","مليمتر","وحدة","مقياس","ابعاد","قياس"],
   body:"كل الأطوال تُكتَب بالمتر في سطر الإدخال (مثل 3 أو 2.5)."
       +" داخلياً تُخزَّن بالمليمتر. اكتب الأرقام مجرّدةً بلا وحدة." },
 { id:"coords", title:"إدخال الإحداثيات",
   keywords:["احداثيات","نقطة","نسبي","قطبي","زاوية","@"],
   body:"الصيغ المقبولة: «3,4» مطلق · «@5,0» نسبي · «@5<45» قطبي"
       +" · «9x14» مقاس مستطيل · «<30» قفل زاوية." },
 { id:"undo", title:"التراجع والإعادة",
   keywords:["تراجع","اعادة","الغاء","undo","redo","خطأ","غلط","رجوع"],
   body:"للتراجع اضغط Ctrl+Z، وللإعادة Ctrl+Y. كل عمليةٍ خطوةٌ واحدة." },
 { id:"delete", title:"حذف عنصر",
   keywords:["حذف","امسح","ازالة","delete","احذف","شيل","مسح"],
   body:"حدّد العنصر بالنقر ثم اضغط Delete. تراجع بـ Ctrl+Z."
       +" لا يُحذَف ما هو على طبقةٍ مقفلة." },
 { id:"select", title:"تحديد العناصر",
   keywords:["تحديد","اختيار","حدد","select","نقر"],
   body:"انقر عنصراً لتحديده. اسحب إطاراً لتحديد عدّة عناصر."
       +" أدوات التعديل تعمل على التحديد القائم." },
 { id:"room", title:"بناء غرفة",
   keywords:["غرفة","غرف","بناء","مستطيل","جدران","حائط","room"],
   body:"ارسم أربعة جدران مغلقة: فعّل أداة الجدار، انقر الأركان"
       +" والعودة للبداية. أو استخدم مقاس «9x14». أغلِق الحلقة"
       +" كي تُحسَب المساحة." },
 { id:"wall", title:"رسم الجدران",
   keywords:["جدار","حائط","جدران","سماكة","خارجي","داخلي","سترة"],
   body:"فعّل أداة الجدار، اضبط السماكة والنوع والمحاذاة، ثم انقر"
       +" البداية والنهاية. تبقى الأداة فعّالة حتى Esc." },
 { id:"opening", title:"الفتحات (أبواب ونوافذ)",
   keywords:["فتحة","باب","نافذة","شباك","كوة","قوس","منزلق","door","window"],
   body:"فعّل أداة الفتحة، اختر النوع، انقر الجدار المضيف وحدّد"
       +" موضعها. تُرفَض إن لم تكفِها سماكة الجدار." },
 { id:"column", title:"الأعمدة",
   keywords:["عمود","اعمدة","قائم","column","دعامة"],
   body:"فعّل أداة العمود وحدّد موضعه ومقاسه. تُرقَّم تلقائياً"
       +" وتظهر في جدول الكميات." },
 { id:"stair", title:"الأدراج والسلالم",
   keywords:["درج","ادراج","سلم","سلالم","درجات","stair"],
   body:"فعّل أداة الدرج، حدّد المسار وعدد القوائم والعرض. يفحص"
       +" البرنامج صحّة أبعاد الدرجة تلقائياً." },
 { id:"area", title:"المساحات والتسمية",
   keywords:["مساحة","مساحات","تسمية","اسم","صافي","area"],
   body:"فعّل أداة المساحة وانقر داخل منطقةٍ مغلقة لحسابها وتسميتها."
       +" تحتاج حلقةً مغلقة كي تُحسَب." },
 { id:"dim", title:"القياس والأبعاد",
   keywords:["بعد","ابعاد","قياس","مسافة","dim","قِس"],
   body:"فعّل أداة البُعد، انقر الطرف الأول ثم الثاني ثم موضع"
       +" خطّ البُعد. للتتالي استخدم «السلسلة»." },
 { id:"chain", title:"سلسلة الأبعاد",
   keywords:["سلسلة","سلاسل","ابعاد متتالية","chain"],
   body:"اكتب القيَم في الشريط (مثل «3 2.5 4»)، ثم انقر البداية"
       +" وموضع خطّ السلسلة." },
 { id:"annotate", title:"التأشير والنصوص",
   keywords:["نص","تأشير","ملاحظة","تعليق","سهم","text"],
   body:"أضِف نصوصاً وأسهم إشارة ومناسيب ومحاور للتوضيح. النصوص"
       +" عناصر توضيحية لا تؤثّر في الحساب." },
 { id:"layers", title:"الطبقات",
   keywords:["طبقة","طبقات","اخفاء","قفل","layer","تنظيم"],
   body:"نظّم عناصرك في طبقات؛ يمكن إخفاء طبقةٍ أو قفلها. المخفيّ"
       +" أو المقفل لا يُعدَّل ولا يُحذَف." },
 { id:"boq", title:"جدول الكميات (BOQ)",
   keywords:["كميات","جدول","حصر","boq","حساب"],
   body:"يحسب البرنامج كميات الجدران والفتحات والأعمدة تلقائياً،"
       +" ويُحدَّث مع كل تعديل. يشمل الجدول العناصر القابلة للطباعة"
       +" فقط — المخفيّ وما على طبقةٍ غير قابلةٍ للطباعة يُستبعَدان"
       +" ويُذكَر عددُهما في الملاحظات؛ المقفل يبقى داخل الجدول."
       +" والفتحة المعطوبة (تخرج عن جدارها أو تتراكب) تبقى داخل"
       +" العدّ مع تنبيهٍ صريح — لأنها تُرسَم وتُصدَّر فعلاً." },
 { id:"pricing", title:"التسعير",
   keywords:["سعر","تسعير","تكلفة","price","ريال","ميزانية"],
   body:"افتح «التسعير» (تبويب إدارة أو تبويب إخراج، أو اكتب pricing) لضبط"
       +" أسعار الوحدات والعملة ونسبة الضريبة؛ يحسب البرنامج التكلفة"
       +" التقديرية من جدول الكميات. المساحات والأدوات الصحية والدرج سعرها"
       +" صفر افتراضياً." },
 { id:"section", title:"المقاطع والواجهات",
   keywords:["مقطع","مقاطع","واجهة","elevation","section","قطاع"],
   body:"أنشئ مقاطع وواجهات من المخطّط لعرض الارتفاعات والتفاصيل." },
 { id:"save", title:"الحفظ والتصدير",
   keywords:["حفظ","احفظ","تصدير","ملف","save","export","تخزين"],
   body:"يُحفَظ عملك تلقائياً محلياً. للتصدير أو الاستيراد استخدم"
       +" قائمة التطبيق." },
 { id:"ai", title:"المساعد الذكي",
   keywords:["مساعد","ذكاء","ai","اوامر","توليد","مزود"],
   body:"صِف ما تريد رسمه بالعربية وينفّذه المساعد عبر أوامر مصدَّقة."
       +" يحتاج ضبط مزوّد. تراجع كل خطوةٍ قبل تثبيتها." },
 { id:"help", title:"استخدام روبوت المساعدة",
   keywords:["مساعدة","help","كيف","روبوت","شرح","دليل"],
   body:"اسألني «كيف أفعل كذا؟» وسأشرح الخطوات وأزوّدك بزرٍّ لبدء"
       +" الأداة. اضغط Esc للإغلاق." }
];
export const articleById=id=>ARTICLES.find(a=>a.id===id)||null;

export function knowledgeEntries(){
 const tools=allCards().map(c=>({kind:"tool",id:c.id,title:c.label,
  keywords:[c.label,...c.alias,c.hint].filter(Boolean),card:c}));
 const arts=ARTICLES.map(a=>({kind:"article",id:a.id,title:a.title,
  keywords:[a.title,...a.keywords],article:a}));
 const commands=[{ kind:"command", id:"lint", title:"افحص رسمي",
  keywords:["افحص","فحص","تدقيق","تحقق","مشاكل","اخطاء","سليم",
   "lint","دقق","راجع الرسم"] },
  { kind:"command", id:"gallery", title:"القوالب والكتل",
   keywords:["قوالب","معرض","كتل","غرفة جاهزة","قالب","مطبخ","حمام",
    "شقة","فيلا","template","block","gallery"] }];
 return [...tools,...arts,...commands];
}
