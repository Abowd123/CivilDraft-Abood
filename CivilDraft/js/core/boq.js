/* ═══ جدول الكميات ═══
   تقريرٌ يُجمَع عند الطلب: لا حقل يُخزَّن، ولا شيء يُصلَح.
   كجدول المساحات في areas.js وجدول الفتحات في opens.js —
   الحالةُ هي الأصل، والجدولُ قراءةٌ لها في لحظة.

   ولا DOM هنا ولا تنزيل ولا تنسيق: المليمتر يخرج كما هو،
   والقسمةُ على ألفٍ أو مليون شأنُ من يعرض. فمن يختبر يقارن
   أعداداً صحيحة لا نصوصاً تُقرَّب — والتقريب في مكانٍ واحد
   (io/boq.js) لا في اثنين يفترقان.

   القديمة تدخل: حذفُها يجعل المجموع كذبة، وإدخالُها بلا علامة
   يجعله كذبةً أخرى. فتدخل بعلامة — كما يُبلِّغ arearef ولا يُصلح.

   ═══ نطاق الجدول (مرحلة ٤ · ١) ═══
   القرار: BOQ يحسب العناصر **القابلة للطباعة** — نفس معيار
   التصدير الفعليّ في io/dxf.js وio/style.js وio/elev.js
   (vis(L)&&plots(L))، لا معيار الشاشة وحده (vis فقط) ولا
   «كامل المشروع» بلا تصفية. السبب: BOQ مستندُ مشترياتٍ يرافق
   DXF/PDF المُسلَّمين — فعدُّ عنصرٍ لن يُطبَع في المخطَّط يكذب
   على من يشتري بكميته.

   وكما في io/export.js (lossOf) وio/elev.js (elevPage): لا
   إسقاط صامت. المخفيّ (vis=false) يُستبعَد لأنه لا يُرسَم أصلاً،
   والمرئيُّ غير القابل للطباعة (vis=true&&plots=false) يُستبعَد
   لأنه لا يخرج في أيّ تصديرٍ ورقيّ — وكلاهما يُعَدّ ويُبلَّغ في
   الملاحظات (io/boq.js) بدل أن يختفي بصمت. أمّا **المقفل** فلا
   يُستبعَد: القفل يمنع التعديل لا الرسم ولا التصدير (README:
   «المقفل يُرى ولا يُلمَس»)، فهو يدخل الجدول كأيّ عنصرٍ مرئيّ
   قابلٍ للطباعة. */
import {S} from "./state.js";
import {netArea,netPerim,isStale} from "./areas.js";
import {okName,okOf,panOf,openState} from "./opens.js";
import {wallLen,WTYPE,isLow,lowH} from "./walls.js";
import {vis,plots} from "./layers.js";
import {CK,CT,colW,colArea} from "./cols.js";
import {fixName} from "./fixt.js";
import {stGeoms,stCheck} from "./stairs.js";
import {levelOf,activeLevel,levelTag,levelsOf} from "./level.js";

/* عنصرٌ يدخل الجدول إن كانت طبقتُه مرئيةً وقابلةً للطباعة معاً —
   القفل لا يدخل في القرار (انظر تعليق النطاق أعلاه). */
const inScope=L=>vis(L)&&plots(L);
/* ═══ تصفية المستوى — مشتركة لكل جداول BOQ ═══
   lvl==null يعني «كل المستويات» فلا تصفية — سلوكٌ قديم بلا تغيير.
   وres.nolevel يُعَدّ عنصراً غاب حقلُ مستواه صراحةً (لا يُخفى). */
function levelFilter(arr,lvl,res){
 if(lvl==null)return arr;
 const out=[];
 arr.forEach(e=>{
  if(levelOf(e)===lvl){
   if(e!=null&&e.level==null)res.nolevel++;
   out.push(e);
  }
 });
 return out;
}
/* طبقة الجدار — نسخةٌ من entreg.js ENT.wall.lay، فلا استيراد
   دائريّ (entreg يستورد من walls.js وopens.js أصلاً) */
const wallLay=w=>isLow(w)?"A-WALL-LOW":"A-WALL";

/* ═══ الأشيع ═══
   السماكةُ الأكثر تكراراً في النوع. وعند التعادل تُختار الأكبر:
   قرارٌ صريح لا ترتيبُ مصفوفة — فجدارٌ يُحذَف ويُعاد لا يقلب
   الجواب. وn عددُ السماكات المختلفة: واحدةٌ تعني نوعاً متجانساً،
   وأكثرُ تعني أن «الأشيع» يخفي تنوّعاً — فيُقال. */
export function modeOf(vals){
 const m=new Map();
 (vals||[]).forEach(v=>{
  const k=Math.round(+v||0);
  m.set(k,(m.get(k)||0)+1);
 });
 let best=0, bn=-1;
 m.forEach((c,k)=>{
  if(c>bn||(c===bn&&k>best)){bn=c; best=k}
 });
 return {v:m.size?best:0, n:m.size};
}
/* ═══ المناطق ═══
   المساحةُ صافيةٌ بين الوجوه الداخلية — netArea هي هي، لا حساب
   ثانٍ يفترق عنها. والمحيطُ معها لأنه يُقاس من الحلقة نفسها.

   وطبقةُ كل المناطق واحدة (A-AREA) — فالفحص مرّةً واحدة يقرّر
   للكل، لا لكلّ منطقةٍ على حدة. */
export function areaRows(level){
 const L="A-AREA", scope=inScope(L);
 const res={nolevel:0};
 const src=levelFilter(S.areas,level,res);
 const hidden=scope?0:(vis(L)?0:src.length);
 const noplot=scope?0:(vis(L)?src.length:0);
 const rows=(scope?src:[]).map(a=>{
  const ar=netArea(a), st=isStale(a)?1:0;
  /* valid: علامةٌ نصّيةٌ مختصرة لعمود «الحالة» في CSV — قديمة
     من isStale، صفرية إن كانت أصغر من ١٠٠٠ مم² (٠٫٠٠١ م²)،
     وإلا سليمة. لا تُستخدَم في الحساب، عرضٌ فقط. */
  let valid="سليمة";
  if(st)valid="قديمة";
  else if(ar<1000)valid="صفرية";
  return {id:a.id, name:a.name||"(بلا اسم)", area:ar,
   perim:netPerim(a), stale:st, valid};
 });
 rows.sort((x,y)=>(y.area-x.area)||x.id.localeCompare(y.id));
 return {rows,
  total:rows.reduce((s,r)=>s+r.area,0),
  stale:rows.reduce((s,r)=>s+r.stale,0),
  n:rows.length,
  hidden, noplot, nolevel:res.nolevel};
}
/* ═══ الفتحات ═══
   تُجمَع بالنوع وحده — لا بالمقاس. فجدول الكميات يسأل «كم باباً
   مفرداً؟» لا «كم باباً بعرض ٩٠٠؟»؛ ذاك سؤالُ openSchedule وله
   جوابُه هناك بمقاسه ورمزه.

   والمساحة الإجمالية تُذكَر لأنها الكميّةُ التي تُشترى: زجاجٌ
   بالمتر المربّع، وحشوةُ بابٍ كذلك. وأصغرُ وأكبرُ عرضٍ يقولان
   إن كان النوع متجانساً.

   ═══ الحالة (مرحلة ٤ · ٣) ═══
   openState() هي الدالّة الواحدة التي يقرأها الرسم (render.js
   عبر badOpens) والفاحص (inspect.js) والآن BOQ أيضاً — لا حسابٌ
   بديل يفسّر «معطوبة» بمعنىً آخر هنا. فتحةٌ حالتها ليست ok (تخرج
   عن مدى جدارها، أو تتراكب، أو يتيمة) تبقى **داخل** العدّ —
   فهي تُرسَم وتُصدَّر فعلاً (بعلامة تحذيرٍ حمراء لا حذفاً) فتخصمُ
   من الكمّية الحقيقية إن حُذفت هنا بصمت. لكن عددها يُقال صراحةً
   (`bad` لكلّ صفٍّ وإجمالاً) — كما تُقال «القديمة» في areaRows،
   فلا يُشترى بابٌ على حساب رقمٍ لا يعرف قارئُه أنه مشكوكٌ فيه. */
export function openRows(level){
 const G=new Map();
 const res={nolevel:0};
 const src=levelFilter(S.opens,level,res);
 let hidden=0, noplot=0, total=0, bad=0;
 src.forEach(o=>{
  const k=o.kind, L=okOf(k).lay;
  if(!inScope(L)){
   if(!vis(L))hidden++; else noplot++;
   return;
  }
  total++;
  const isBad=openState(o)!=="ok";
  if(isBad)bad++;
  let r=G.get(k);
  if(!r){
   r={kind:k, name:okName(k), n:0, ar:0,
    wMin:1/0, wMax:0, hMin:1/0, hMax:0, pan:0, bad:0};
   G.set(k,r);
  }
  r.n++;
  if(isBad)r.bad++;
  r.ar+=(+o.w||0)*(+o.h||0);
  if(o.w<r.wMin)r.wMin=o.w;
  if(o.w>r.wMax)r.wMax=o.w;
  if(o.h<r.hMin)r.hMin=o.h;
  if(o.h>r.hMax)r.hMax=o.h;
  if(okOf(k).pan)r.pan+=panOf(o);
 });
 const rows=[...G.values()].map(r=>{
  if(!isFinite(r.wMin))r.wMin=0;
  if(!isFinite(r.hMin))r.hMin=0;
  return r;
 });
 /* الترتيب بالعدد نازلاً ثم بالمفتاح — لا بترتيب S.opens، فلا
    يتبدّل الجدولُ بإضافةِ فتحةٍ لا تغيّر شيئاً في العدّ */
 rows.sort((a,b)=>(b.n-a.n)||a.kind.localeCompare(b.kind));
 return {rows,
  total,
  ar:rows.reduce((s,r)=>s+r.ar,0),
  n:rows.length,
  hidden, noplot, bad, nolevel:res.nolevel};
}
/* ═══ الجدران ═══
   الطولُ مجموعُ wallLen على المسار المرسوم — لا على محور الجسم
   ولا على الوجه. فالمسارُ هو ما رُسم، وما عداه اشتقاقٌ يختلف
   بالمحاذاة.

   والفتحاتُ لا تُطرَح: طرحُها يحتاج ارتفاعَ الجدار وارتفاعَ كل
   فتحةٍ وجلستَها، وذلك حسابُ حجومٍ لا أطوال. فيُذكَر عددُ فتحات
   النوع تنبيهاً، ويُترَك الطرحُ لمن يريده صريحاً.

   وارتفاعُ السترة من w.h لا من meta.wallH — والباقي من
   meta.wallH، فهو ارتفاعُ الجدار المعلَن. */
export function wallRows(level){
 const G=new Map();
 const byId=new Map();
 const res={nolevel:0};
 const srcW=levelFilter(S.walls,level,res);
 let hidden=0, noplot=0;
 srcW.forEach(w=>{
  byId.set(w.id,w);
  const L=wallLay(w);
  if(!inScope(L)){if(!vis(L))hidden++; else noplot++}
 });
 /* الفتحاتُ المنسوبة لكل نوع جدارٍ تُعَدّ ضمن نطاق BOQ نفسه فقط —
    فلا يذكر جدارٌ «فتحتين» إحداهما مستبعَدةٌ من قسم الفتحات فوق. */
 const opn=new Map();
 levelFilter(S.opens,level,{nolevel:0}).forEach(o=>{
  const w=byId.get(o.wall);
  if(!w)return;                      /* اليتيمة لا تُحسَب */
  const L=okOf(o.kind).lay;
  if(!inScope(L))return;             /* خارج نطاق الفتحات أعلاه */
  const t=w.type;
  opn.set(t,(opn.get(t)||0)+1);
 });
 srcW.forEach(w=>{
  if(!inScope(wallLay(w)))return;    /* خارج نطاق الجدران */
  const t=w.type;
  let r=G.get(t);
  if(!r){
   r={type:t, name:(WTYPE[t]||{}).n||t, n:0, len:0, face:0, vol:0,
    ts:[], hs:[], t:0, tn:0, h:0, opens:0};
   G.set(t,r);
  }
  const len=wallLen(w);
  const h=isLow(w)?lowH(w):(+S.meta.wallH||3000);
  r.n++;
  r.len+=len;
  /* المساحة والحجم يُجمَعان جداراً جداراً بطوله وسماكته الفعليّين
     — لا بالسماكة الأشيع مضروبةً في مجموع الأطوال. فنوعٌ فيه
     سماكتان (tn=2) كان يُقدَّر حجمُه كلّه بالأشيع؛ الآن كلّ جدارٍ
     يُحسَب بسماكته هو، والمجموع مجموع حسابٍ دقيق لا تقدير. */
  r.face+=Math.round(len*h);
  r.vol+=Math.round(len*h*w.t);
  r.ts.push(w.t);
  r.hs.push(h);
 });
 const rows=[...G.values()].map(r=>{
  const M=modeOf(r.ts);
  r.t=M.v; r.tn=M.n;      /* للعرض والملخّص فقط — لا للحساب */
  r.h=modeOf(r.hs).v;
  r.len=Math.round(r.len);
  r.opens=opn.get(r.type)||0;
  delete r.ts; delete r.hs;
  return r;
 });
 const ORD={ext:0,int:1,low:2};
 rows.sort((a,b)=>((ORD[a.type]==null?9:ORD[a.type])
  -(ORD[b.type]==null?9:ORD[b.type]))||a.type.localeCompare(b.type));
 return {rows,
  len:rows.reduce((s,r)=>s+r.len,0),
  face:rows.reduce((s,r)=>s+r.face,0),
  vol:rows.reduce((s,r)=>s+r.vol,0),
  n:rows.reduce((s,r)=>s+r.n,0),
  hidden, noplot, nolevel:res.nolevel};
}
/* ═══ جدولٌ تفصيليّ للجدران — كلّ جدارٍ سطر (شفافيةٌ لا فلترة) ═══
   خلافاً لـ wallRows فهذا لا يستبعد المخفيّ ولا غير القابل
   للطباعة: يذكرهما في عمود «الحالة» بدل حذفهما، فمن أراد رؤية
   كامل المشروع تفصيلاً وجده هنا — والمجموع المُعتمَد يبقى في
   wallRows وفق نطاق الطباعة كما هو موثَّقٌ أعلاه. */
export function wallDetailRows(){
 const cnt=new Map();
 S.opens.forEach(o=>cnt.set(o.wall,(cnt.get(o.wall)||0)+1));
 return S.walls.map(w=>{
  const len=wallLen(w);
  const h=isLow(w)?lowH(w):(+S.meta.wallH||3000);
  const L=wallLay(w);
  let state="سليم";
  if(!vis(L))state="طبقة مخفية";
  else if(!plots(L))state="غير قابلة للطباعة";
  return {id:w.id, type:w.type, name:(WTYPE[w.type]||{}).n||w.type,
   len, t:w.t, h, face:Math.round(len*h), vol:Math.round(len*h*w.t),
   state, valid:state, opens:cnt.get(w.id)||0, level:levelOf(w)};
 });
}
/* ═══ جدولٌ تفصيليّ للفتحات — حالة الفتحة وحالة طبقتها معاً ═══
   openState() نفسها من opens.js (لا حسابٌ بديل)، وطبقةُ الفتحة
   عبر okOf().lay كما في openRows. شفافيةٌ أيضاً — لا فلترة. */
export function openDetailRows(){
 return S.opens.map(o=>{
  const st=openState(o);
  const valid={ok:"سليم", orphan:"يتيم", over:"خارج المدى",
   clash:"متراكب"}[st]||st;
  const L=okOf(o.kind).lay;
  let layValid="سليم";
  if(!vis(L))layValid="طبقة مخفية";
  else if(!plots(L))layValid="غير قابلة للطباعة";
  return {id:o.id, wall:o.wall, kind:o.kind, name:okName(o.kind),
   w:o.w, h:o.h, sill:o.sill||0, s:o.s, state:st, valid, layValid,
   level:levelOf(o)};
 });
}
/* ═══ الأعمدة ═══
   تُجمَع بالنوع والمادّة معاً (المراجعة #5): "مستطيل · خرسانة"
   وليس "مستطيل" وحدها، لأن سعر الحديد يختلف عن الخرسانة وإن تشابه
   المقطع. المساحةُ إجماليةٌ (تُشترى خرسانةً بالحجم لاحقاً، والعددُ
   وحده كافٍ لبند «أعمدة» في pricing.js الذي كان معرَّفاً منذ البداية
   بلا أي عنصرٍ يغذّيه). */
export function colRows(level){
 const L="A-COLS", scope=inScope(L), G=new Map();
 const res={nolevel:0};
 const src=levelFilter(S.cols,level,res);
 const hidden=scope?0:(vis(L)?0:src.length);
 const noplot=scope?0:(vis(L)?src.length:0);
 (scope?src:[]).forEach(c=>{
  const k=(c.kind==="circ")?"circ":"rect", ty=c.type||"conc";
  const key=k+"|"+ty;
  let r=G.get(key);
  if(!r){
   r={kind:k, type:ty, name:`${CK[k]||k} · ${CT[ty]||ty}`,
    n:0, area:0, wMin:1/0, wMax:0};
   G.set(key,r);
  }
  r.n++; r.area+=colArea(c);
  const w=colW(c);
  if(w<r.wMin)r.wMin=w;
  if(w>r.wMax)r.wMax=w;
 });
 const rows=[...G.values()].map(r=>{
  if(!isFinite(r.wMin))r.wMin=0;
  return r;
 });
 rows.sort((a,b)=>(b.n-a.n)||a.kind.localeCompare(b.kind));
 return {rows,
  n:rows.reduce((s,r)=>s+r.n,0),
  area:rows.reduce((s,r)=>s+r.area,0),
  hidden, noplot, nolevel:res.nolevel};
}
/* ═══ الأدوات الصحية والمطبخية ═══
   تُجمَع بالنوع وحده — كالفتحات، سؤال «كم مغسلة؟» لا «كم مغسلةً
   بمقاسٍ بعينه؟». ومنضورةٌ للمستوى (F3): تُقسَّم مع سائر الجداول
   المكانية، وبلا وسيطٍ تبقى «الكل» للمستدعين القدامى. */
export function fixRows(level){
 const L="A-FIXT", scope=inScope(L), G=new Map();
 const res={nolevel:0};
 const src=levelFilter(S.fixt,level,res);
 const hidden=scope?0:(vis(L)?0:src.length);
 const noplot=scope?0:(vis(L)?src.length:0);
 (scope?src:[]).forEach(f=>{
  const k=f.kind;
  let r=G.get(k);
  if(!r){r={kind:k, name:fixName(f), n:0}; G.set(k,r)}
  r.n++;
 });
 const rows=[...G.values()];
 rows.sort((a,b)=>(b.n-a.n)||a.kind.localeCompare(b.kind));
 return {rows, n:rows.reduce((s,r)=>s+r.n,0),
  hidden, noplot, nolevel:res.nolevel};
}
/* ═══ الدرج ═══
   سطرٌ لكل قِلعة — لا تجميع بنوع (لا نوع لها أصلاً، كل درجٍ
   قياساته الخاصّة). stCheck نفسها التي يقرأها الفاحص وprops.js —
   لا حسابٌ بديل لـ«خارج المدى المريح» هنا كما في openState.
   والتصفية بالمستوى كسائر الجداول المكانية (المرحلة ٣ · F1). */
export function stairRows(level){
 const L="A-STRS", scope=inScope(L);
 const res={nolevel:0};
 const src=levelFilter(S.stairs,level,res);
 const hidden=scope?0:(vis(L)?0:src.length);
 const noplot=scope?0:(vis(L)?src.length:0);
 let bad=0;
 const rows=(scope?src:[]).map(st=>{
  const gs=stGeoms(st), c=stCheck(st);
  if(!c.ok)bad++;
  /* n وlen مجموعُ الرحلات كلِّها (المستقيم رحلةٌ واحدة) */
  return {id:st.id, type:st.type||"straight", w:st.w, n:c.n,
   len:gs.reduce((s,g)=>s+g.L,0), ok:c.ok};
 });
 return {rows,
  n:rows.length,
  len:rows.reduce((s,r)=>s+r.len,0),
  bad, hidden, noplot, nolevel:res.nolevel};
}
/* ═══ الجدول كاملاً ═══
   ثلاثة أقسام وترويسة. والترويسة من meta لا من التاريخ الحيّ:
   جدولان يُبنيان من الحالة نفسها يتطابقان — فلو حملا وقتَ البناء
   لاختلفا في حرفٍ لا معنى له. وdate حقلُ مشروعٍ قائم في meta. */
export function boq(){
 return {
  level:activeLevel(S.meta), levels:levelsOf(S),
  name:String(S.meta.name||"PLAN"),
  scale:+S.meta.scale||100,
  date:String(S.meta.date||""),
  wallH:+S.meta.wallH||3000,
  areas:areaRows(),
  opens:openRows(),
  walls:wallRows(),
  cols:colRows(),
  fixt:fixRows(),
  stairs:stairRows(),
  wallsDetail:wallDetailRows(),
  opensDetail:openDetailRows()};
}
/* ═══ جدول مستوًى واحد ═══ لبناء BOQ منسوباً لطابقٍ بعينه */
export function boqLevel(level){
 const L=level==null?activeLevel(S.meta):Math.round(+level||0);
 return {
  level:L, tag:levelTag(L),
  name:String(S.meta.name||"PLAN"),
  scale:+S.meta.scale||100,
  date:String(S.meta.date||""),
  wallH:+S.meta.wallH||3000,
  areas:areaRows(L), opens:openRows(L),
  walls:wallRows(L), cols:colRows(L),
  fixt:fixRows(L), stairs:stairRows(L),
  wallsDetail:wallDetailRows().filter(r=>r.level===L),
  opensDetail:openDetailRows().filter(r=>r.level===L)};
}
/* ═══ كل المستويات دفعةً واحدة ═══ لواجهة تبديل الطابق
   الدرج والأداة الصحية منسوبان فيدخلان مجموعاتهما (F1 · F3).
   فارغةُ الحصة المشتركة تُبقى شكلاً ليتوافق مع كل مستدعٍ سابق،
   ولا جدول مكانيَّ خارج مجموعاته. */
export function levelGroups(){
 const ls=levelsOf(S), act=activeLevel(S.meta);
 return {active:act, levels:ls,
  common:{},
  groups:ls.map(L=>({level:L, tag:levelTag(L), active:L===act?1:0,
   walls:wallRows(L), opens:openRows(L),
   areas:areaRows(L), cols:colRows(L),
   stairs:stairRows(L), fixt:fixRows(L)}))};
}
/* سطرُ حصيلةٍ للوحة الحالة — نصٌّ واحد لا كائن */
export const boqLine=B=>{
 const ex=(B.walls.hidden+B.walls.noplot+B.opens.hidden+B.opens.noplot
  +B.areas.hidden+B.areas.noplot+B.cols.hidden+B.cols.noplot
  +B.fixt.hidden+B.fixt.noplot+B.stairs.hidden+B.stairs.noplot);
 return `${B.walls.n} جداراً · `
  +`${B.opens.total} فتحة · ${B.areas.n} منطقة`
  +(B.cols.n?` · ${B.cols.n} عموداً`:"")
  +(B.fixt.n?` · ${B.fixt.n} أداة`:"")
  +(B.stairs.n?` · ${B.stairs.n} درجاً`:"")
  +(B.opens.bad?` · ${B.opens.bad} معطوبة`:"")
  +(B.areas.stale?` · ${B.areas.stale} قديمة`:"")
  +(B.stairs.bad?` · ${B.stairs.bad} درجاً خارج المدى`:"")
  +(ex?` · ${ex} خارج الطباعة`:"");
};
