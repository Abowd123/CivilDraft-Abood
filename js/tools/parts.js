/* ═══ أدوات الأعمدة والأدوات الصحية والدرج ═══
   كلّها تبقى فعّالة حتى Esc، وكلّها تخزّن إحداثيات صريحة:
   «ألصِق بالجدار» أمرٌ يُنفَّذ عند الوضع لا رابطةٌ تُحفَظ. */
import {S} from "../core/state.js";
import {m3,clamp,dm2} from "../core/units.js";
import {pip} from "../core/geom.js";
import {band} from "../core/walls.js";
import {axLabel} from "../core/dims.js";
import {addCol,nextTag,colLabel,CK,CT,colOnWall} from "../core/cols.js";
import {addFix,snapToWall,FK,fixName,FREE_KINDS} from "../core/fixt.js";
import {addStair,addStairL,addStairU,stCheck} from "../core/stairs.js";
import {addBeam,addFooting,addSlab,nextStrTag,strLabel,strLen,
        strArea,strVol} from "../core/struct.js";
import {defTool,H,rec,ov,ovLen,ovNum,ovOn,
        pvLine} from "./registry.js";

const GRN="#5cd98e", YEL="#ffd06b", BLU="#5aa9ff", RED="#ff6f6f";
const RCT=(p,w,h,rot,c)=>{
 const a=(rot||0)*Math.PI/180, ca=Math.cos(a), sa=Math.sin(a);
 const Q=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]]
  .map(q=>[p[0]+q[0]*ca-q[1]*sa, p[1]+q[0]*sa+q[1]*ca]);
 return Q.map((q,i)=>({t:"l",a:q,b:Q[(i+1)%4],c}));
};
/* ═══ العناصرُ الإنشائية: كمرةٌ وقاعدةٌ وبلاطة ═══ §٣/١٢
   ثلاثُ أدواتٍ لا واحدةٌ بخيارِ نوع: الكمرةُ تُرسَم بطرفَين، والقاعدةُ
   بنقرةٍ واحدةٍ، والبلاطةُ بحلقةٍ من النقاط — فمدخلاتُها مختلفةٌ
   أصلاً، وأداةٌ واحدةٌ تبدّل عددَ خطواتها بحسب خيارٍ تُربك.
   وكلُّها على طبقةِ A-STRU المتقطّعة (انظر core/struct.js). */
defTool({
 id:"beam", alias:"bm كمره كمرة جسر", label:"كمرة",
 hint:"طرفانِ · المقطعُ من الشريط · Enter ينهي",
 opts:[
  {k:"w",label:"العرض م",type:"len",def:"0.25"},
  {k:"d",label:"العمق م",type:"len",def:"0.50"},
  {k:"mat",label:"المادّة",type:"sel",
   items:[["conc","خرسانة"],["steel","حديد"]],def:"conc"},
  {k:"tag",label:"الوسم",type:"text",def:"",
   hint:"فارغ = ترقيمٌ تلقائيٌّ B1 B2"}],
 steps:[
  {p:"الطرف الأول"},
  {p:"الطرف الثاني (Enter ينهي)", loop:1, base:-1,
   each(ctx,p){
    const a=ctx.pts[ctx.pts.length-2];
    const tg=String(ov("beam","tag")||"").trim()||nextStrTag("B");
    const e=addBeam(a,p,ovLen("beam","w"),ovLen("beam","d"),
     ov("beam","mat"),tg);
    rec(ctx,e,"struct");
    H.rep("ok",`${e.id} ${strLabel(e)} · الطول ${m3(strLen(e))} م`
     +` · ${(strVol(e)/1e9).toFixed(3)} م³`);
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g)return [];
  const a=ctx.pts[ctx.pts.length-1];
  const w=ovLen("beam","w")||250;
  const L=Math.hypot(g[0]-a[0],g[1]-a[1]);
  if(L<1)return [];
  const ux=(g[0]-a[0])/L, uy=(g[1]-a[1])/L, nx=-uy, ny=ux, hw=w/2;
  const P=(s,v)=>[a[0]+ux*s+nx*v, a[1]+uy*s+ny*v];
  return [
   pvLine(P(0,hw),P(L,hw),GRN), pvLine(P(0,-hw),P(L,-hw),GRN),
   pvLine(P(0,-hw),P(0,hw),GRN), pvLine(P(L,-hw),P(L,hw),GRN),
   pvLine(a,g,YEL)];
 }});

defTool({
 id:"footing", alias:"ft قاعده قاعدة", label:"قاعدة",
 hint:"انقر مركزَ القاعدة — المقاسُ من الشريط · Enter ينهي",
 opts:[
  {k:"w",label:"العرض م",type:"len",def:"1.50"},
  {k:"h",label:"الطول م",type:"len",def:"",
   hint:"فارغ = مربّعةٌ مثلُ العرض"},
  {k:"th",label:"السماكة م",type:"len",def:"0.40"},
  {k:"rot",label:"الدوران °",type:"num",def:0},
  {k:"tag",label:"الوسم",type:"text",def:"",
   hint:"فارغ = ترقيمٌ تلقائيٌّ F1 F2"}],
 steps:[
  {p:"مركز القاعدة (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const w=ovLen("footing","w");
    const tg=String(ov("footing","tag")||"").trim()||nextStrTag("F");
    const e=addFooting(p,w,ovLen("footing","h")||w,
     ovNum("footing","rot"),ovLen("footing","th"),
     "conc",tg);
    rec(ctx,e,"struct");
    H.rep("ok",`${e.id} ${strLabel(e)} · `
     +`${(strArea(e)/1e6).toFixed(2)} م² · `
     +`${(strVol(e)/1e9).toFixed(2)} م³`);
   }}],
 prev(ctx,g){
  if(!g)return [];
  const w=ovLen("footing","w")||1500;
  const o=RCT(g,w,ovLen("footing","h")||w,ovNum("footing","rot"),GRN);
  /* قطرانِ كما تُرسَم فعلاً — فالشبحُ يطابق الناتج */
  o.push({t:"l",a:o[0].a,b:o[2].a,c:GRN});
  o.push({t:"l",a:o[1].a,b:o[3].a,c:GRN});
  return o;
 }});

defTool({
 id:"slab", alias:"sl بلاطه بلاطة", label:"بلاطة",
 hint:"انقر رؤوسَ البلاطةِ ثم Enter — ثلاثةُ رؤوسٍ على الأقل",
 opts:[
  {k:"th",label:"السماكة م",type:"len",def:"0.15"},
  {k:"tag",label:"الوسم",type:"text",def:"",
   hint:"فارغ = ترقيمٌ تلقائيٌّ S1 S2"}],
 steps:[
  {p:"الرأس الأول"},
  {p:"الرأسُ التالي (ثلاثةٌ على الأقلّ ثم Enter)", loop:1, base:-1}],
 /* `done` خُطّافُ الأداةِ لا الخطوة — كـ`cloud`: الحلقةُ تُغلَق عند
    Enter مرّةً واحدةً، لا عند كلِّ نقرة. */
 done(ctx){
  if(ctx.pts.length<3)
   throw new Error("البلاطةُ تحتاج ثلاثةَ رؤوسٍ على الأقل");
  const tg=String(ov("slab","tag")||"").trim()||nextStrTag("S");
  const e=addSlab(ctx.pts,ovLen("slab","th"),"conc",tg);
  rec(ctx,e,"struct");
  H.rep("ok",`${e.id} ${strLabel(e)} · `
   +`${(strArea(e)/1e6).toFixed(2)} م² · `
   +`${(strVol(e)/1e9).toFixed(2)} م³`);
 },
 prev(ctx,g){
  const P=ctx.pts.slice();
  if(g)P.push(g);
  if(P.length<2)return [];
  const o=[];
  for(let i=0;i+1<P.length;i++)o.push(pvLine(P[i],P[i+1],GRN));
  /* الإغلاقُ يُرسَم من الآن: البلاطةُ حلقةٌ دائماً، فإظهارُ الوترِ
     الأخيرِ قبل Enter يُظهِر المساحةَ الحقيقيةَ لا المفتوحة. */
  if(P.length>2)o.push(pvLine(P[P.length-1],P[0],YEL));
  return o;
 }});

/* ═══ عمود ═══ */
defTool({
 id:"col", alias:"k عمود", label:"عمود",
 hint:"انقر مركز العمود · Enter ينهي",
 opts:[
  {k:"kind",label:"الشكل",type:"sel",
   items:[["rect","مستطيل"],["circ","دائري"]],def:"rect"},
  {k:"w",   label:"العرض / القطر م",type:"len",def:"0.3"},
  {k:"h",   label:"العمق م",        type:"len",def:"0.3",
   when:o=>o.kind!=="circ"},
  {k:"rot", label:"الدوران °",      type:"num",def:0,
   when:o=>o.kind!=="circ"},
  {k:"type",label:"المادة",type:"sel",
   items:[["conc","خرسانة"],["steel","حديد"],["stone","حجر"]],
   def:"conc"},
  {k:"tag", label:"رقّم تلقائياً",type:"chk",def:1}],
 steps:[
  {p:"مركز العمود (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const kind=ov("col","kind");
    const c=addCol(kind,p,ovLen("col","w"),ovLen("col","h"),
     ovNum("col","rot"),ov("col","type"),
     ovOn("col","tag")?nextTag("C"):"");
    rec(ctx,c,"cols");
    const on=colOnWall(c,2);
    H.rep("ok",`${c.id}${c.tag?" "+c.tag:""} ${CK[c.kind]} `
     +`${colLabel(c)} · ${CT[c.type]}`
     +(on?` · يُدمَج مع ${on}`:` · منفرد`));
   }}],
 prev(ctx,g){
  if(!g)return [];
  const w=ovLen("col","w");
  if(ov("col","kind")==="circ"){
   const r=w/2, o=[];
   let pr=null;
   for(let i=0;i<=24;i++){
    const a=i/24*Math.PI*2;
    const q=[g[0]+r*Math.cos(a), g[1]+r*Math.sin(a)];
    if(pr)o.push({t:"l",a:pr,b:q,c:GRN});
    pr=q;
   }
   return o;
  }
  return RCT(g,w,ovLen("col","h")||w,ovNum("col","rot"),GRN);
 }});

/* ═══ ما لا يُلصَق بالجدار افتراضاً ═══ (مسحُ ما قبل المرحلة ٦)
   الإلصاقُ يلتقط أقربَ جدارٍ ضمن 1.5 م، وكان مفعَّلاً لكلّ الـ36: إنارةُ
   سقفٍ أو مروحةٌ أو طاولةٌ على بُعد متر من الجدار تُنقَل إلى وجهه وتُدار.
   ما يُعلَّق بالسقف أو يقف حرّاً في الغرفة يبدأ حرّاً، والخيارُ باقٍ لمن أراده. */
const FREE=FREE_KINDS;
/* ═══ أداة صحية ═══ */
function mkFix(id,alias,label,kind){
 const d=FK[kind];
 defTool({
  id, alias, label,
  hint:"انقر الموضع — يُلصَق بأقرب جدار إن فُعّل الخيار",
  /* ═══ ترتيبُ الحقولِ هو ما يظهر ═══ المرحلة ٦: الثلاثةُ الأولى
     ظاهرةٌ والباقي وراءَ «المزيد». وهذا التعريفُ وحدَه يُنشئ ٣٦ أداةً،
     فترتيبُه هنا يُصلِح ٣٦ شريطاً في موضعٍ واحد.
     والظاهرُ هو **الوضعُ** (لصوقٌ · دورانٌ · عكسٌ): يتغيّر مع كلِّ
     إدراجٍ. والمخفيُّ هو **المقاسُ** (عرضٌ · عمقٌ): رمزُ الأثاثِ
     والكهرباءِ مقاسٌ قياسيٌّ يُضبَط مرّةً ولا يُلمَس بعدها. */
  opts:[
   {k:"snap",label:"ألصِق بالجدار",type:"chk",def:FREE.has(kind)?0:1,
    hint:"أمرٌ عند الوضع لا رابطة تُحفَظ"},
   {k:"rot", label:"الدوران °",type:"num",def:0},
   {k:"mir", label:"معكوسة",type:"chk",def:0},
   {k:"w",   label:"العرض م",type:"len",def:String(d.w/1000)},
   {k:"d",   label:"العمق م",type:"len",def:String(d.d/1000)}],
  steps:[
   {p:"موضع الأداة (Enter ينهي)", base:"none", loop:1,
    each(ctx,p){
     let at=p, rot=ovNum(id,"rot"), on=null;
     if(ovOn(id,"snap")){
      const s=snapToWall(p,1500);
      if(s){at=s.p; rot=s.rot; on=s.wall}
     }
     const f=addFix(kind,at,rot,{
      w:ovLen(id,"w"), d:ovLen(id,"d"),
      mir:ovOn(id,"mir")?1:0});
     rec(ctx,f,"fixt");
     H.rep("ok",`${f.id} ${fixName(f)} `
      +`${dm2(f.w,f.d,"م")}`
      +(on?` · مُلصَقة بـ ${on} (إحداثيات صريحة بعدها)`
        :` · حرّة`));
    }}],
  prev(ctx,g){
   if(!g)return [];
   let at=g, rot=ovNum(id,"rot");
   if(ovOn(id,"snap")){
    const s=snapToWall(g,1500);
    if(s){at=s.p; rot=s.rot}
   }
   const w=ovLen(id,"w")||d.w, dd=ovLen(id,"d")||d.d;
   const a=rot*Math.PI/180, ca=Math.cos(a), sa=Math.sin(a);
   const m=ovOn(id,"mir")?-1:1;
   const P=(u,v)=>[at[0]+(u*m)*ca-v*sa, at[1]+(u*m)*sa+v*ca];
   const Q=[P(-w/2,0),P(w/2,0),P(w/2,dd),P(-w/2,dd)];
   const o=Q.map((q,i)=>({t:"l",a:q,b:Q[(i+1)%4],c:GRN}));
   o.push({t:"l",a:P(0,0),b:P(0,dd*0.3),c:YEL});  /* دلالة الظهر */
   return o;
  }});
}
mkFix("wc",    "كرسي مرحاض", "كرسي",   "wc");
mkFix("lav",   "مغسله",      "مغسلة",  "lav");
mkFix("shower","دش",         "دُش",     "shower");
mkFix("tub",   "بانيو حوض",  "بانيو",  "tub");
mkFix("sink",  "مجلى",       "حوض مطبخ","sink");
mkFix("bidet", "شطاف",       "شطّاف",   "bidet");
mkFix("ur",    "مبوله",      "مبولة",  "ur");
mkFix("wm",    "غساله",      "غسّالة",  "wm");
mkFix("fd",    "صفايه",      "صفاية",  "fd");

/* ═══ الأثاث والكهرباء ═══ P-جديد (الأولوية ٥ و٦)
   نفسُ المصنع: لا مسارَ ثانيَ للوضع ولا لِلإلصاق ولا للمعاينة —
   فما يصحّ على المغسلة يصحّ على السرير والفيشة بلا نسخةٍ ثانية.
   والمعرّفاتُ مسبوقةٌ بـ`f`/`e` فلا تزاحم أداةً قائمةً (`tv` كانت
   ستزاحم أمر العرض، و`ac` اختصاراً محتملاً).
   والطبقةُ من النوع نفسِه (`fkLay`) فلا تُكرَّر هنا. */
const FURN=[
 ["fbed1",  "سرير_مفرد",     "سرير_مفرد",    "bed1"],
 ["fbed2",  "سرير_مزدوج",    "سرير_مزدوج",   "bed2"],
 ["fsofa2", "كنبه_مقعدين",   "كنبة مقعدين",  "sofa2"],
 ["fsofa3", "كنبه_ثلاثه",    "كنبة ثلاثة",   "sofa3"],
 ["ftable", "طاوله_مستطيله",          "طاولة مستطيلة","tablr"],
 ["ftablec","طاوله_دائريه",  "طاولة دائرية", "tablc"],
 ["fchair", "كرسي_جلوس",     "كرسي",         "chair"],
 ["fdesk",  "مكتب",           "مكتب",         "desk"],
 ["fwardr", "خزانه_ملابس",   "خزانة ملابس",  "wardr"],
 ["fkcab",  "خزانه_مطبخ",    "خزانة مطبخ",   "kcab"],
 ["ffridge","ثلاجه",          "ثلاجة",        "fridge"],
 ["fstove", "بوتاجاز_فرن",   "بوتاجاز",      "stove"]];
const ELEC=[
 ["esw1",  "مفتاح",           "مفتاح مفرد",   "sw1"],
 ["esw2",  "مفتاح_مزدوج",    "مفتاح_مزدوج",  "sw2"],
 ["eswd",  "مفتاح_باهت","مفتاح باهت",  "swd"],
 ["esoc",  "فيشه_بريزه",     "فيشة عادية",   "soc"],
 ["esoc2", "فيشه_مزدوجه",    "فيشة مزدوجة",  "soc2"],
 ["esocw", "فيشه_محميه",     "فيشة محميّة",  "socw"],
 ["elamp", "اناره_سقف",     "إنارة سقف",    "lampc"],
 ["elampw","اناره_جدار",     "إنارة جدار",   "lampw"],
 ["espot", "سبوت",            "سبوت",         "spot"],
 ["efan",  "مروحه_سقف",           "مروحة سقف",    "fan"],
 ["eexfan","شفاط",            "شفّاط",        "exfan"],
 ["edb",   "لوحه_توزيع",     "لوحة توزيع",   "db"],
 ["etel",  "هاتف_شبكه",      "نقطة هاتف/شبكة","tel"],
 ["etv",   "تلفاز_نقطه",     "نقطة تلفاز",   "tv"],
 ["eac",   "مكيف_سبليت",     "مكيّف سبليت",  "ac"]];
FURN.concat(ELEC).forEach(([id,alias,label,kind])=>
 mkFix(id,alias,label,kind));

/* ═══ أعمدة على تقاطعات المحاور ═══
   أمرٌ يُنفَّذ مرّة على S.grid: لكل تقاطعٍ عمودٌ بمقاسك، بترتيب
   القراءة العربية (من أعلى اليمين) فيأتي الترقيم منتظماً.
   ما وُجد عمودُه يُتخطّى ويُذكَر — لا تكرار ولا إزاحة صامتة. */
defTool({
 id:"gridcols", alias:"gk اعمده_المحاور شبكه_اعمده",
 label:"أعمدة المحاور",
 hint:"عمود على كل تقاطع محورين — الموجود يُتخطّى ولا يُزاح · المقاس: gk w=0.3 h=0.5",
 opts:[
  {k:"kind",label:"الشكل",type:"sel",
   items:[["rect","مستطيل"],["circ","دائري"]],def:"rect"},
  {k:"w",   label:"العرض / القطر م",type:"len",def:"0.4"},
  {k:"h",   label:"العمق م",type:"len",def:"0.4",
   when:o=>o.kind!=="circ"},
  {k:"rot", label:"الدوران °",type:"num",def:0,
   when:o=>o.kind!=="circ"},
  {k:"type",label:"المادة",type:"sel",
   items:[["conc","خرسانة"],["steel","حديد"],["stone","حجر"]],
   def:"conc"},
  {k:"pre", label:"سابقة الوسم",type:"text",def:"C"},
  {k:"tag", label:"رقّم",type:"chk",def:1},
  {k:"inside",label:"داخل الجدران وحدها",type:"chk",def:0,
   hint:"يشترط أن يقع التقاطع في جسم جدار"}],
 start(ctx){
  const X=S.grid.xs, Y=S.grid.ys;
  if(!X.length||!Y.length){
   H.rep("wr","تحتاج محوراً رأسياً وأفقياً على الأقلّ — "
    +"استعمل أداة «محور»");
   return false;
  }
  const N=X.length*Y.length;
  if(N>400){
   H.rep("er",`${N} تقاطعاً — أكثر من 400. امسح محاور أو نفّذها `
    +`على دفعات`);
   return false;
  }
  const inside=ovOn("gridcols","inside");
  const bands=inside?S.walls.map(band).filter(Boolean):null;
  const P=[];
  X.forEach((x,i)=>Y.forEach((y,j)=>P.push({x,y,i,j})));
  /* من أعلى اليمين: y نازلاً ثم x نازلاً — كترقيم renumberCols */
  P.sort((a,b)=>(b.y-a.y)||(b.x-a.x));
  const kind=ov("gridcols","kind");
  const pre=String(ov("gridcols","pre")||"C");
  let made=0, dup=0, out=0;
  const dupIds=[];
  P.forEach(q=>{
   if(bands&&!bands.some(bp=>pip(bp,q.x,q.y))){out++; return}
   try{
    const c=addCol(kind,[q.x,q.y],
     ovLen("gridcols","w"), ovLen("gridcols","h"),
     ovNum("gridcols","rot"), ov("gridcols","type"),
     ovOn("gridcols","tag")?nextTag(pre):"");
    rec(ctx,c,"cols");
    made++;
   }catch(e){
    dup++;
    dupIds.push(`${axLabel("x",q.i)}${axLabel("y",q.j)}`);
   }
  });
  H.rep(made?"ok":"wr",`${made} عموداً على ${N} تقاطعاً · `
   +`${colLabel({kind,w:ovLen("gridcols","w"),
     h:ovLen("gridcols","h")})}`);
  if(dup)H.rep("in",`تُخطّي ${dup} تقاطعاً عليه عمود سلفاً`
   +(dupIds.length<=12?`: ${dupIds.join(" · ")}`:""));
  if(out)H.rep("in",`تُخطّي ${out} تقاطعاً خارج الجدران`);
  return false;                    /* أمر لحظي — لا خطوات */
 },
 steps:[]});

/* ═══ درج ═══ */
defTool({
 id:"stair", alias:"st درج سلم", label:"درج",
 hint:"بداية القِلعة ثم نهايتها · القياسات تُقاس ولا تُصحَّح",
 opts:[
  {k:"w",  label:"العرض م",   type:"len",def:"1.1"},
  {k:"n",  label:"عدد القوائم",type:"num",def:16},
  {k:"h",  label:"ارتفاع الدور م",type:"len",def:"",
   hint:"فارغ = من إعداد المشروع"},
  {k:"up", label:"الاتجاه",type:"sel",
   items:[["up","صاعد"],["dn","هابط"]],def:"up"},
  {k:"cut",label:"خطّ القطع",type:"num",def:0,
   hint:"0 = بلا · 0.6 = عند 60٪"}],
 steps:[
  {p:"بداية القِلعة"},
  {p:"نهاية القِلعة", base:0, restart:1,
   each(ctx,p){
    const st=addStair(ctx.pts[0],p, ovLen("stair","w"),
     ovNum("stair","n"),
     {h:ovLen("stair","h")||0, up:ov("stair","up"),
      cut:ovNum("stair","cut")});
    rec(ctx,st,"stairs");
    const c=stCheck(st);
    H.rep(c.ok?"ok":"wr",
     `${st.id} ${c.n} قائمة · ق ${m3(c.rise)} · ن ${m3(c.tread)} م `
     +`· 2ق+ن ${m3(c.rule)} م`);
    c.msgs.forEach(m=>H.rep("wr","  "+m));
    if(!c.ok)H.rep("in","  القياسات كما رسمتها — عدّل الطول أو "
     +"عدد القوائم إن شئت");
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g)return [];
  const a=ctx.pts[0];
  const w=ovLen("stair","w")||1100;
  const n=clamp(Math.round(ovNum("stair","n"))||2,2,80);
  const dx=g[0]-a[0], dy=g[1]-a[1], L=Math.hypot(dx,dy);
  if(L<1)return [];
  const ux=dx/L, uy=dy/L, nx=-uy, ny=ux, hw=w/2;
  const P=(s,v)=>[a[0]+ux*s+nx*v, a[1]+uy*s+ny*v];
  const o=[pvLine(P(0,-hw),P(L,-hw),GRN),
           pvLine(P(0, hw),P(L, hw),GRN)];
  const t=L/(n-1);
  for(let i=0;i<=n-1;i++)
   o.push(pvLine(P(t*i,-hw),P(t*i,hw),(t<250)?RED:BLU));
  return o;
 }});

/* ═══ درج L وU — رحلتان وبسطة ═══
   الرحلة الواحدة تُرسَم بنقطتين. عدد القوائم (n) لكل رحلة. */
const stairOpts=()=>[
 {k:"w",  label:"العرض م",   type:"len",def:"1.1"},
 {k:"n",  label:"قوائم كل رحلة",type:"num",def:8},
 {k:"h",  label:"ارتفاع الدور م",type:"len",def:"",
  hint:"فارغ = من إعداد المشروع"},
 {k:"up", label:"الاتجاه",type:"sel",
  items:[["up","صاعد"],["dn","هابط"]],def:"up"}];
function stairReport(st){
 const c=stCheck(st);
 H.rep(c.ok?"ok":"wr",
  `${st.id} ${st.type} ${c.n} قائمة · ق ${m3(c.rise)} · ن ${m3(c.tread)} م `
  +`· 2ق+ن ${m3(c.rule)} م`);
 c.msgs.forEach(m=>H.rep("wr","  "+m));
 if(!c.ok)H.rep("in","  القياسات كما رسمتها — عدّل الطول أو عدد القوائم إن شئت");
}
/* معاينة رحلةٍ من a إلى b بعرض w وعدد قوائم n */
function flightPrev(a,b,w,n){
 const dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy);
 if(L<1)return [];
 const ux=dx/L, uy=dy/L, nx=-uy, ny=ux, hw=w/2;
 const P=(s,v)=>[a[0]+ux*s+nx*v, a[1]+uy*s+ny*v];
 const o=[pvLine(P(0,-hw),P(L,-hw),GRN),pvLine(P(0,hw),P(L,hw),GRN)];
 const t=L/(n-1);
 for(let i=0;i<=n-1;i++)
  o.push(pvLine(P(t*i,-hw),P(t*i,hw),(t<250)?RED:BLU));
 return o;
}
const stN=k=>clamp(Math.round(ovNum(k,"n"))||2,2,80);

defTool({
 id:"stairl", alias:"stl درجL", label:"درج L",
 hint:"بداية الرحلة 1 · نقطة المنعطف · نهاية الرحلة 2",
 opts:stairOpts(),
 steps:[
  {p:"بداية الرحلة 1"},
  {p:"نقطة المنعطف", base:0},
  {p:"نهاية الرحلة 2", base:1, restart:1,
   each(ctx,p){
    const [a,b]=ctx.pts;
    const n=ovNum("stairl","n");
    const st=addStairL(a,b,p, ovLen("stairl","w"), n,n,
     {h:ovLen("stairl","h")||0, up:ov("stairl","up")});
    rec(ctx,st,"stairs");
    stairReport(st);
   }}],
 prev(ctx,g){
  const P=ctx.pts;
  if(!P.length||!g)return [];
  const w=ovLen("stairl","w")||1100, n=stN("stairl");
  if(P.length===1)return flightPrev(P[0],g,w,n);
  return flightPrev(P[0],P[1],w,n).concat(flightPrev(P[1],g,w,n));
 }});

defTool({
 id:"stairu", alias:"stu درجU", label:"درج U",
 hint:"بداية 1 · نهاية 1 · بداية 2 · نهاية 2",
 opts:stairOpts(),
 steps:[
  {p:"بداية الرحلة 1"},
  {p:"نهاية الرحلة 1", base:0},
  {p:"بداية الرحلة 2"},
  {p:"نهاية الرحلة 2", base:2, restart:1,
   each(ctx,p){
    const [a,b,c]=ctx.pts;
    const n=ovNum("stairu","n");
    const st=addStairU(a,b,c,p, ovLen("stairu","w"), n,n,
     {h:ovLen("stairu","h")||0, up:ov("stairu","up")});
    rec(ctx,st,"stairs");
    stairReport(st);
   }}],
 prev(ctx,g){
  const P=ctx.pts;
  if(!P.length||!g)return [];
  const w=ovLen("stairu","w")||1100, n=stN("stairu");
  if(P.length===1)return flightPrev(P[0],g,w,n);
  if(P.length===2)return flightPrev(P[0],P[1],w,n);
  if(P.length===3)return flightPrev(P[0],P[1],w,n)
   .concat(flightPrev(P[2],g,w,n));
  return [];
 }});
