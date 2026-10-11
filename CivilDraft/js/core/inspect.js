/* ═══ الفاحص ═══
   يُنفَّذ بزرّ لا مع كل رسمة، ويجمع كل ما تفرّق من ملاحظات في قائمة
   واحدة قابلة للنقر. لا يصلح شيئاً ولا يحذف ولا يزحف — يخبرك
   وأنت تقرّر. هذا بديل validate() الذي كان يجري مع كل تحديث. */
import {S} from "./state.js";
import {m2,m3,sqm,pt2} from "./units.js";
import {pip,bboxOf,bboxHit,pArea,centroid} from "./geom.js";
import {looseEnds,wallLen,wallById,MINW,isArc} from "./walls.js";
import {badOpens,openState,okName} from "./opens.js";
import {isStale,netArea,labelPt} from "./areas.js";
import {looseDims,isOverridden,dimValue,fmtLen,dimMid,
        chainCompare,chainPt,chainBounds,chainSum} from "./dims.js";
import {colOnWall,colsOverlap,colPoly,colBBox,
        colLabel} from "./cols.js";
import {fixFree,fixCeil,fixOnWall,fixOverlap,fixBBox,fixCenter,
        fixName} from "./fixt.js";
import * as SI from "./sindex.js";
import {stCheck,stGeom} from "./stairs.js";
import {fitsSheet} from "./sheet.js";
import {hiddenLayers,lockedLayers,LNAME,hiddenCount,
        layCounts,vis,entVis} from "./layers.js";
import {hasRef,refStats} from "./ref.js";
import {skipSummary} from "../io/dxfin.js";
import {CODE,codeCheck} from "./code.js";
import {hasBlock} from "./blocks.js";
import {regionLoops,loopOpen,loopOpenAt} from "./render.js";
import {findMisaligned} from "./levelAlign.js";

export const SEV={er:"خطأ",wr:"تنبيه",in:"ملاحظة"};

/* نصُّ «قطعٌ لم تُخَط» — دالّةٌ خالصة يُختبَر بها النصُّ بلا مشهد */
export const loopOpenMsg=(n,at)=>
 `في اتحاد الأجسام ${n} قطعةً لم تُخَط`
 +(at?` — آخرُها عند (${m2(at[0])}، ${m2(at[1])})`:"")
 +` — قد يمنع ذلك إنشاء منطقةٍ هناك. أزِح أحد الجدارَين بخطوة `
 +`الالتقاط ثم أعِد الفحص.`;


/* الفاحص يخبر عن المرئيّ: المخفيّ وحده خارج الحساب (لا يُرسَم ولا
   يُصدَّر فلا قيمة لتقرير خطئه). المقفل يُفحَص — فهو يُرسَم ويُصدَّر
   فعلياً، وإخفاء أخطائه عن الفاحص يُخفي أخطاءً حقيقية في المخرج
   النهائي (حُسم في المرحلة 4.5؛ كان سؤالاً مفتوحاً في
   KNOWN-DEFECTS.md). لذا هنا vis (عبر entVis) لا pickable —
   pickable يستبعد المقفل أيضاً وهو مقصودٌ للتحديد لا للفحص. */
const pk=(k,id)=>entVis({k,id});

/* كل نتيجة: {sev, code, msg, k, id, p} — p هدف القفز */
export function inspect(bbox,opt){
 const O=Object.assign({endTol:2,dimTol:30,chainTol:60},opt||{});
 const F=[];
 const add=(sev,code,msg,k,id,p)=>F.push({sev,code,msg,k,id,
  p:p?[Math.round(p[0]),Math.round(p[1])]:null});

 /* ١ — أطراف الجدران غير المتّصلة
    التقاطُ نفسه (من متى يُعدّ الطرفُ متّصلاً) يبقى على كل S.walls
    بلا تصفية: جدارٌ مخفيّ لا يُلحَم تلقائياً ولا يختفي هندسياً،
    فيبقى سنداً حقيقياً لطرف جارٍ مرئيّ. التصفية على التقرير فقط —
    لا بلاغ عن طرف جدارٍ لا يُرسَم أصلاً. */
 looseEnds(O.endTol).filter(e=>pk("wall",e.id))
  /* الجدارُ المنخفض (سورُ حديقة، حوضُ زرع، دروة) قائمٌ وحدَه بطبيعته */
  .filter(e=>{const w=wallById(e.id); return !(w&&w.type==="low")}).forEach(e=>add("wr","end",
  `${e.id}: طرف ${e.end==="a"?"البداية":"النهاية"} لا يلامس شيئاً `
  +`${pt2(e.p)}`,
  "wall",e.id,e.p));

 /* ٢ — جدران أقصر من الحدّ الأدنى أو صفرية */
 S.walls.forEach(w=>{
  if(!pk("wall",w.id))return;
  const L=wallLen(w);
  if(L<1)add("er","w0",`${w.id}: جدار صفري الطول`,
   "wall",w.id,w.a);
  else if(L<MINW)add("wr","wshort",
   `${w.id}: طوله ${m3(L)} م — أقصر من الحدّ الأدنى `
   +`${m3(MINW)} م`,"wall",w.id,w.a);
 });
 /* ٢ب — جدران قوسية: لا تُسقَط بعد في الواجهات/المقاطع */
 S.walls.forEach(w=>{
  if(!pk("wall",w.id))return;
  if(isArc(w))add("in","warcnoelev",
   `${w.id}: جدار قوسي — يُستبعَد من الواجهات والمقاطع حالياً `
   +`(غير مدعوم بعد)`,"wall",w.id,w.a);
 });
 /* ٢ب٢ — اتحاد الأجسام: قطعٌ لم تُخَط. كان العدّادُ يُحسَب ولا يُقال
    إلا حين تفشل أداة المنطقة نفسُها — فيرى المستخدمُ مناطقَ ناقصةً
    ولا يعرف السبب. الآن يُقال هنا مع موضع آخرِ قطعة (قفزٌ بنقرة).
    regionLoops مُكاشةٌ على VER.g فلا كلفة بعد أوّل نداء، وهي لا
    تمسّ S (الفاحصُ لا يعدّل). */
 if(S.walls.length){
  regionLoops();
  const nOpen=loopOpen()|0;
  if(nOpen>0){
   const at=loopOpenAt();
   add("wr","loopopen",loopOpenMsg(nOpen,at),null,null,at);
  }
 }
 /* ٢ج — مثيلات كتلٍ بلا تعريف: explode تعيد [] فلا يُرسَم منها شيء
    ولا يُقال. تقع من ملفٍّ فقد تعريفه أو من حذفٍ بـforce — والمخفيّة
    (طبقتها مطفأة) خارج الحساب كسائر الفاحص. */
 (S.blocks||[]).forEach(b=>{
  if(hasBlock(b.block)||!vis(b.layer))return;
  add("er","bdef",
   `${b.id}: كتلتها «${b.block}» غير معرّفة — المثيل لا يُرسَم `
   +`ولا يُطبَع. أعِد تعريفها أو احذف المثيل`,null,null,[b.x,b.y]);
 });
 /* ٣ — جدران متطابقة تماماً
    seen تُبنى من كل الجدران (مخفيّها ومقفلها) فلا يفوت الفاحصُ
    تطابقاً مرجعُه جدارٌ مخفيّ؛ والتقرير — كسابقيه — على الجدار
    المُبلَّغ عنه وحده فلا بلاغ عن مخفيّ. */
 const seen=new Map();
 S.walls.forEach(w=>{
  const a=`${w.a[0]},${w.a[1]}`, b=`${w.b[0]},${w.b[1]}`;
  const k=(a<b)?`${a}|${b}`:`${b}|${a}`;
  if(seen.has(k)){
   if(pk("wall",w.id))add("wr","wdup",
    `${w.id}: مسارُه مطابق لـ ${seen.get(k)} تماماً — جدار مكرَّر؟`,
    "wall",w.id,w.a);
  }else seen.set(k,w.id);
 });
 /* ٤ — الفتحات المعطوبة */
 badOpens().filter(o=>pk("open",o.id)).forEach(o=>{
  const st=openState(o);
  const w=wallById(o.wall);
  const p=w?[(w.a[0]+w.b[0])/2,(w.a[1]+w.b[1])/2]:null;
  const T={over:"تخرج عن مدى جدارها",
   clash:"تتراكب مع فتحة أخرى على الجدار نفسه",
   orphan:"جدارها غير موجود"};
  add(st==="orphan"?"er":"wr","open",
   `${o.id} ${okName(o.kind)}: ${T[st]||st} — لم تُزحَف ولم `
   +`تُقلَّم`,"open",o.id,p);
 });
 /* ٥ — المناطق: القديمة والمتراكبة وبلا اسم */
 S.areas.forEach(a=>{
  if(!pk("area",a.id))return;
  if(isStale(a))add("wr","astale",
   `${a.id} ${a.name||""}: قديمة — تغيّر جدار يجاورها. الحلقة `
   +`المخزَّنة ${sqm(netArea(a))} م² لم تُمَسّ`,
   "area",a.id,labelPt(a));
  if(!a.name)add("in","aname",
   `${a.id}: بلا اسم · ${sqm(netArea(a))} م²`,
   "area",a.id,labelPt(a));
 });
 SI.forPairs("area",(A,B)=>{
  const ba=bboxOf(A.ring), bb=bboxOf(B.ring);
  if(!ba||!bb||!bboxHit(ba,bb,-1))return;
  const c=centroid(B.ring);
  if(pip(A.ring,c[0],c[1]))add("wr","aover",
   `${B.id} ${B.name||""} داخل ${A.id} ${A.name||""} — `
   +`منطقتان متراكبتان`,"area",B.id,c);
 },0,a=>pk("area",a.id));
 /* ٦ — الأبعاد المعلَّقة والمكتوبة يدوياً */
 looseDims(O.dimTol).filter(d=>pk("dim",d.id)).forEach(d=>add("wr","dloose",
  `${d.id}: طرفٌ لا يصادف هندسةً — البُعد ${fmtLen(dimValue(d))} م `
  +`لم يُزحَف ولم يُحذَف`,"dim",d.id,dimMid(d)));
 S.dims.filter(isOverridden).filter(d=>pk("dim",d.id)).forEach(d=>add("wr","dtxt",
  `${d.id}: نصّ بديل «${d.txt}» يُعرَض بدل المقاس الحقيقي `
  +`${fmtLen(dimValue(d))} م`,"dim",d.id,dimMid(d)));

 /* ٧ — السلاسل المخالفة للهندسة (تقرير) */
 S.chains.forEach(c=>{
  if(!pk("chain",c.id))return;
  const r=chainCompare(c,O.chainTol);
  if(!r.off)return;
  const B=chainBounds(c);
  add("in","coff",
   `${c.id}: ${r.off} من ${r.rows.length} حدّاً خارج التفاوت — `
   +`المجموع المكتوب ${fmtLen(chainSum(c))} م`,
   "chain",c.id,chainPt(c,B[Math.floor(B.length/2)]));
 });
 /* ٨ — الأعمدة */
 S.cols.forEach(c=>{
  if(!pk("col",c.id))return;
  const b=colBBox(c);
  const on=colOnWall(c,2,b?SI.entsIn(SI.expand(b,4),"wall"):null);
  if(!on)add("in","kfree",
   `${c.id}${c.tag?" "+c.tag:""}: عمود منفرد لا يلامس جداراً — `
   +`${colLabel(c)}`,"col",c.id,[c.x,c.y]);
  /* المساحة لا تخصم العمود المنفرد: تُبلَّغ ولا تُخصَم */
  if(!on)SI.entsAt(c.x,c.y,0,"area").forEach(a=>{
   if(!pip(a.ring,c.x,c.y))return;
   add("in","kinarea",
    `${c.id}${c.tag?" "+c.tag:""} داخل ${a.id} ${a.name||""} — `
    +`المساحة المعروضة لا تخصمه `
    +`(${sqm(Math.abs(pArea(colPoly(c))))} م²)`,
    "col",c.id,[c.x,c.y]);
  });
 });
 SI.forPairs("col",(a,b)=>{
  if(!colsOverlap(a,b))return;
  add("wr","kover",
   `${a.id} و ${b.id} متراكبان — مقصود أم سهو؟`,
   "col",b.id,[b.x,b.y]);
 },0,c=>pk("col",c.id));

 /* ٩ — الأدوات الصحية */
 S.fixt.forEach(f=>{
  if(!pk("fix",f.id))return;
  /* إنارةُ السقف والمروحة والطاولة والكرسي حرّةٌ بطبيعتها — لا ظهرَ لها */
  if(fixFree(f))return;
  const b=fixBBox(f);
  const W=b?SI.entsIn(SI.expand(b,200),"wall"):null;
  if(!fixOnWall(f,150,W))add("in","ffree",
   `${f.id} ${fixName(f)}: ظهرها لا يلاصق جداراً`,
   "fix",f.id,fixCenter(f));
 });
 SI.forPairs("fix",(a,b)=>{
  if(fixCeil(a)!==fixCeil(b))return;   /* سقفٌ فوق أرض: لا تراكب */
  if(!fixOverlap(a,b))return;
  add("wr","fover",
   `${a.id} ${fixName(a)} تتراكب مع ${b.id} ${fixName(b)}`,
   "fix",b.id,fixCenter(b));
 },0,f=>pk("fix",f.id));

 /* ١٠ — الدرج: يُقاس ويُبلَّغ ولا يُصحَّح */
 S.stairs.forEach(t=>{
  if(!pk("stair",t.id))return;
  const c=stCheck(t);
  const g=stGeom(t);
  const p=g?g.P(g.L/2,0):(t.flights&&t.flights[0]?t.flights[0].a:null);
  c.msgs.forEach(m=>add("wr","stair",`${t.id}: ${m}`,
   "stair",t.id,p));
  if(c.ok)add("in","stairok",
   `${t.id}: ${c.n} قائمة · ق ${m3(c.rise)} · ن ${m3(c.tread)} م `
   +`· 2ق+ن ${m3(c.rule)} م — داخل المدى المريح`,
   "stair",t.id,p);
 });
 /* ١١ — الطبقات المخفيّة والمقفلة
    ليس عيباً، لكنه سببٌ لغياب ما تتوقّع رؤيته. */
 const HD=hiddenLayers(), C=layCounts();
 if(HD.length){
  add("wr","lhid",
   `${HD.length} طبقة مخفيّة (${HD.map(LNAME).join(" · ")}) — `
   +`${hiddenCount()} كياناً لن يُرسَم ولن يُصدَّر`,null,null,null);
  HD.forEach(L=>{
   if(!(C[L]>0))return;
   add("in","lhidn",`${LNAME(L)}: ${C[L]} كياناً مخفيّاً`,
    null,null,null);
  });
 }
 const LK=lockedLayers();
 if(LK.length)add("in","llock",
  `${LK.length} طبقة مقفلة (${LK.map(LNAME).join(" · ")}) — `
  +`تُرى ولا تُحدَّد`,null,null,null);

 /* ١٢ — المرجع */
 if(hasRef()){
  const r=refStats();
  add("in","refn",
   `المرجع «${r.name||"بلا اسم"}»: ${r.n} كياناً على `
   +`${r.layers} طبقة (${r.shownLayers} ظاهرة) · الترميز `
   +`${r.enc} · جامدٌ لا يدخل الاتحاد ولا المساحات`,
   null,null,null);
  if(r.guessed&&Math.abs(r.k-1)<1e-9)
   add("wr","refunit",
    `وحدة المرجع مجهولة في الملفّ وفُرضت مليمتراً، ولم تُعايره `
    +`بعد — استعمل «معايرة المرجع» بمسافةٍ تعرفها قبل أن تقيس `
    +`عليه`,null,null,null);
  if(r.trunc)
   add("wr","reftrunc",
    `استُثني ${r.trunc} كياناً لتجاوز الحدّ — المرجع منقوص`,
    null,null,null);
  const sk=skipSummary(r.skip);
  if(sk)add("in","refskip",
   `تُخطّي من المرجع: ${sk}`,null,null,null);
  const ap=r.approx||{}, A=[];
  if(ap.spline)A.push(`${ap.spline} منحنى SPLINE (متقطّع)`);
  if(ap.ellipse)A.push(`${ap.ellipse} قطع ناقص`);
  if(ap.arc)A.push(`${ap.arc} قوساً بمقياس غير متساوٍ`);
  if(A.length)add("in","refapx",
   `تقريباتٌ في المرجع: ${A.join(" · ")}`,null,null,null);
  if(r.bbox&&bbox){
   const gap=Math.max(r.bbox.x0-bbox.x1, bbox.x0-r.bbox.x1,
                      r.bbox.y0-bbox.y1, bbox.y0-r.bbox.y1);
   if(gap>500000)add("wr","reffar",
    `المرجع يبعد عن رسمك ${m2(gap)} م — حاذِه أو انقله`,
    null,null,null);
  }
 }
 /* ١٣ — الورقة */
 if(+S.sheet.on){
  const f=fitsSheet(bbox);
  if(!f.ok)add("wr","sheet",
   `الرسم يتجاوز الإطار الداخلي بـ ${m2(f.over)} م — كبّر الورقة `
   +`أو صغّر المقياس أو أزِح الورقة`,null,null,null);
 }
 /* ١٤ — لا شيء مرسوم */
 if(!S.walls.length&&!S.cols.length)
  add("in","empty","لا جدران ولا أعمدة في المشروع",
   null,null,null);

 /* ١٤ب — محاذاة الطوابق: تقريرٌ يُخبِر ولا يُصلح (levelAlign.js).
    مخفيّ الطبقة خارج الحساب كسائر الفاحص. */
 findMisaligned(S,50).forEach(m=>{
  if(!pk(m.type,m.id))return;
  const e=(m.type==="col"?S.cols:S.walls).find(x=>x.id===m.id);
  const p=e?(m.type==="col"?[e.x,e.y]:e.a):null;
  add("wr","align",m.msg,m.type,m.id,p);
 });

 /* ١٥ — الاشتراطات: طبقةٌ ثانية تفحص التصميم لا الهندسة.
    نتائجها بالشكل نفسه فتقفز إلى مواضعها كبقيّة الملاحظات. */
 if(+CODE.on)codeCheck().forEach(f=>F.push(f));

 const ORD={er:0,wr:1,in:2};
 F.sort((a,b)=>ORD[a.sev]-ORD[b.sev]||a.code.localeCompare(b.code));
 return {list:F,
  er:F.filter(x=>x.sev==="er").length,
  wr:F.filter(x=>x.sev==="wr").length,
  in:F.filter(x=>x.sev==="in").length};
}
