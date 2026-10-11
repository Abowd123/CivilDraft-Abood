/* ═══ مواضع اللوحات وأسطح العمل ═══
   سجلٌّ للموضع وحده. الرسم في panels.js، والتسمية في اللوحة نفسها
   (نصّ summary) فلا تُكتَب مرّتين ولا تتخلّف إحداهما عن الأخرى.
   المعرّفات هي data-sec القائمة في props.js — وdom.js يقابل
   القائمتين فلا تنفرد إحداهما بعنصر.

   الأعمدة: s بداية السطر (يمين في العربية) · e نهايته.
   وz للوحة: s | e | f عائمة | x مغلقة. */

export const PANELS=[
 {id:"proj",   ico:"props",   z:"s", o:1},
 {id:"lays",   ico:"layers",  z:"s", o:0},
 {id:"props",  ico:"panel",   z:"s", o:1},
 {id:"sched",  ico:"table",   z:"s", o:0},
 {id:"osched", ico:"table",   z:"s", o:0},
 {id:"axes",   ico:"axis",    z:"s", o:0},
 {id:"ref",    ico:"ref",     z:"s", o:0},
 {id:"sheet",  ico:"sheet",   z:"s", o:0},
 {id:"insp",   ico:"inspect", z:"s", o:1},
 {id:"export", ico:"xport",   z:"s", o:0},
 {id:"defs",   ico:"shell",   z:"s", o:0},
 {id:"ai",     ico:"ai",      z:"s", o:0},
 {id:"guide",  ico:"help",    z:"s", o:0},
 {id:"state",  ico:"grid",    z:"s", o:1}
];
export const pIds=()=>PANELS.map(p=>p.id);
export const pDef=id=>PANELS.find(p=>p.id===id)||null;
export const isPanel=id=>!!pDef(id);

export const ZONES=["s","e"];
export const ZN={s:"العمود الأيمن",e:"العمود الأيسر",
 f:"عائمة",x:"مغلقة"};
export const MODES={acc:"أقسام",tab:"تبويبات"};
export const WMIN=210, WMAX=560;

/* ═══ أسطح العمل المدمجة ═══
   s و e قائمتان مرتَّبتان · ما لم يُذكَر فيهما مغلق · open ما يُفتَح.
   والقصد أن كل سطحٍ يعرض ما يخصّ عمله ويُغلق ما عداه — لا لوحةً
   تُبنى لتُخفى.

   ═══ المرحلة ٥ من audit/10-ui-plan.md ═══
   كلُّ سطحٍ صار **يُعلِن لوحتَه الافتراضيةَ** (`def`) لكلِّ عمودٍ،
   ووضعُه صار **تبويباتٍ** لا أقساماً. والسببُ مقيس: «كامل» كان يكدّس
   ثمانيةَ أقسامٍ في عمودٍ عرضُه ٣١٢ بكسلاً فتُقرَأ بالتمرير، وأربعَ
   عشرةَ لوحةً تتنافس على العين. وبالتبويباتِ يُقرَأ **واحدٌ بتسميته
   والباقي أسماءٌ في صفٍّ** — وهو بعينه «لوحةٌ واحدةٌ مُرسًى».
   و`open` بقيَ كما هو: هو من يُفتَح في وضعِ الأقسامِ لمن عاد إليه،
   فالوضعُ خيارٌ لم يُحذَف (§٨ تمنع حذفَ ما هو نادرٌ لا ما هو خطأ). */
export const WS={
 arch:{n:"معماري", shell:"ribbon", tab:"draw", clean:0,
  zw:{s:312,e:270}, mode:{s:"tab",e:"tab"}, auto:{s:0,e:0},
  s:["proj","lays","props","insp","ai","state"], e:[],
  open:["props","insp"], def:{s:"props",e:null}},

 annot:{n:"تأشير", shell:"ribbon", tab:"annt", clean:0,
  zw:{s:300,e:288}, mode:{s:"tab",e:"tab"}, auto:{s:0,e:0},
  s:["props","lays","state"], e:["sched","osched","axes"],
  open:["props","sched","osched","axes"], def:{s:"props",e:"sched"}},

 out:{n:"إخراج", shell:"ribbon", tab:"out", clean:0,
  zw:{s:312,e:264}, mode:{s:"tab",e:"tab"}, auto:{s:0,e:0},
  s:["sheet","export","state"], e:["insp","lays"],
  open:["sheet","export","insp"], def:{s:"sheet",e:"insp"}},

 /* «كامل» هو الحالةُ التي استدعت هذه المرحلةَ: أربعَ عشرةَ لوحةً
     في عمودَين (٨+٦) **بوضعِ أقسامٍ** — أي ثمانيةُ أقسامٍ مكدَّسةٌ في
     ٣١٢ بكسلاً تُقرَأ بالتمرير. وبالتبويباتِ تُقرَأ واحدةً بتسميتها. */
 full:{n:"كامل", shell:"ribbon", tab:"draw", clean:0,
  zw:{s:312,e:270}, mode:{s:"tab",e:"tab"}, auto:{s:0,e:0},
  s:["proj","lays","props","sched","osched","axes","ai","guide"],
  e:["ref","sheet","insp","export","defs","state"],
  open:["props","insp","state"], def:{s:"props",e:"insp"}},

 bare:{n:"بلا شريط", shell:"classic", tab:"draw", clean:0,
  zw:{s:288,e:264}, mode:{s:"tab",e:"tab"}, auto:{s:1,e:0},
  s:["props","lays","insp","state"], e:[],
  open:["props"], def:{s:"props",e:null}},

 tablet:{n:"تابلت", shell:"ribbon", tab:"draw", clean:0,
  zw:{s:360,e:0}, mode:{s:"tab",e:"tab"}, auto:{s:1,e:0},
  s:["props","lays","insp"], e:[],
  open:["props"], def:{s:"props",e:null}}
};

/* ═══ التخطيط الافتراضي ═══ يوافق ما كان قبل و٢ حرفياً ═══ */
export const DEFLAY=()=>({
 zw:{s:312,e:270},
 /* تبويباتٌ افتراضاً (المرحلة ٥): الأقسامُ تكدّس ثمانيةً في عمودٍ
    واحدٍ، والتبويباتُ تُظهِر واحدةً وتُسمّي الباقيَ. */
 mode:{s:"tab",e:"tab"},
 auto:{s:0,e:0},
 /* واللوحةُ الجاريةُ تُعلَن لا تُترَك فارغةً: `syncZones` يداوي
    الفراغَ بأوّلِ لوحةٍ، لكنّ **الإعلانَ أصدقُ من المداواة**. */
 cur:{s:"props",e:null},
 p:PANELS.reduce((a,p)=>{
  a[p.id]={z:p.z,i:PANELS.indexOf(p),o:p.o,
   x:120,y:110,w:320,h:300,max:0};
  return a;
 },{})
});
/* ═══ التطبيع الدفاعي ═══
   تخطيطٌ محرَّر يدوياً أو من إصدارٍ أقدم يُصلَح شكلاً: لوحةٌ مجهولة
   تُنبذ، وناقصةٌ تُستكمل من مصنعها. */
export function normLay(L){
 const d=DEFLAY();
 const o={zw:{},mode:{},auto:{},cur:{},p:{}};
 const num=(v,a,b,f)=>{
  const n=Math.round(+v);
  return isFinite(n)?Math.max(a,Math.min(b,n)):f;
 };
 ZONES.forEach(z=>{
  o.zw[z]=num(L&&L.zw&&L.zw[z],WMIN,WMAX,d.zw[z]);
  const m=L&&L.mode&&L.mode[z];
  o.mode[z]=MODES[m]?m:"tab";
  o.auto[z]=(L&&L.auto&&L.auto[z])?1:0;
  const c=L&&L.cur&&L.cur[z];
  o.cur[z]=isPanel(c)?c:null;
 });
 PANELS.forEach(p=>{
  const s=(L&&L.p&&L.p[p.id])||{};
  const z=/^(s|e|f|x)$/.test(s.z)?s.z:p.z;
  o.p[p.id]={z,
   i:num(s.i,0,999,PANELS.indexOf(p)),
   o:(s.o===undefined)?p.o:(s.o?1:0),
   x:num(s.x,-4000,8000,120), y:num(s.y,0,8000,110),
   w:num(s.w,220,1200,320), h:num(s.h,120,2000,300),
   max:s.max?1:0};
 });
 return o;
}
export const wsNorm=w=>{
 if(!w||typeof w!=="object")return null;
 if(typeof w.n==="string"&&w.n.length>32)return null; /* رفضٌ لا قصّ */
 const F=id=>isPanel(id);
 const s=(Array.isArray(w.s)?w.s:[]).filter(F);
 const e=(Array.isArray(w.e)?w.e:[]).filter(F);
 const all=[...s,...e];
 if(new Set(all).size!==all.length)return null; /* تكرارٌ بين/داخل العمودين */
 return {n:String(w.n||"سطح").slice(0,32),
  shell:(w.shell==="classic")?"classic":"ribbon",
  tab:String(w.tab||"draw").slice(0,16),
  clean:w.clean?1:0,
  zw:{s:+w.zw?.s||312, e:+w.zw?.e||270},
  mode:{s:MODES[w.mode?.s]?w.mode.s:"tab",
        e:MODES[w.mode?.e]?w.mode.e:"tab"},
  auto:{s:w.auto?.s?1:0, e:w.auto?.e?1:0},
  s, e,
  open:(Array.isArray(w.open)?w.open:[]).filter(F),
  /* اللوحةُ الافتراضيةُ لكلِّ عمودٍ: تُقبَل فقط إن كانت **في ذلك
     العمودِ** — إعلانُ لوحةٍ ليست هناك وعدٌ لا يُنجَز، فيُنبَذ
     صامتاً إلى `null` ويتولّى `syncZones` الاختيارَ. */
  def:{s:(w.def&&s.includes(w.def.s))?w.def.s:null,
       e:(w.def&&e.includes(w.def.e))?w.def.e:null}};
};
