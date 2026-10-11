/* ═══ أدوات الرسم ═══
   كل أداة تُنشئ ما طلبتَه بالحرف: جدار واحد بسماكته ومحاذاته،
   ولا لحم ولا كائن مشتقّ ولا تعديل على ما سبق. */
import {edit} from "../core/state.js";
import {m2,m3,mm,dm2} from "../core/units.js";
import {addWall,ALIGN,dir,wallLen,bulgeFrom3,arcParams,band,
        arcTess} from "../core/walls.js";
import {addPline,plineLen} from "../core/plines.js";
import {addDim} from "../core/dims.js";
import {defTool,H,rec,finish,endChain,undoStep,ov,ovLen,ovOn,
        pvLine,pvRect,pvBand,pvPoly,pvText} from "./registry.js";

const GRN="#5cd98e", YEL="#ffd06b", PNK="#ff8f8f";
const TY=[["int","داخلي"],["ext","خارجي"],["low","سترة"]];
const AL=[["c","مركزي"],["l","الوجه الأيسر"],["r","الوجه الأيمن"]];

/* ═══ جدار ═══ */
function mkWall(ctx,a,b){
 const w=addWall(a,b,
  ovLen("wall","t"), ov("wall","type"), ov("wall","align"),
  ovLen("wall","h"));
 rec(ctx,w,"walls");
 const d=dir(w);
 H.rep("ok",`${w.id} · ${m2(wallLen(w))} م · `
  +`${d?d.ang.toFixed(1):"0"}° · ${mm(w.t).toFixed(2)} م `
  +`${ALIGN[w.align]}`
  +(w.type==="low"?` · سترة ${m2(w.h)} م`:""));
 return w;
}
defTool({
 id:"wall", alias:"w جدار خط", label:"جدار",
 hint:"نقطتان لكل جدار · C يغلق · Enter ينهي السلسلة · Esc يخرج · U يتراجع",
 opts:[
  {k:"t",    label:"السماكة م", type:"len", def:"0.15"},
  {k:"type", label:"النوع",     type:"sel", seg:1, items:TY, def:"int"},
  {k:"align",label:"المسار على",type:"sel", items:AL, def:"c",
   hint:"يسار ويمين بالنسبة لاتجاه الرسم"},
  {k:"h",    label:"ارتفاع السترة م", type:"len", def:"1",
   when:o=>o.type==="low"},
  {k:"chain",label:"متّصل",     type:"chk", def:1}],
 steps:[
  {p:"نقطة البداية"},
  {p:"النقطة التالية", loop:1, base:-1, chainRestart:1,
   opts:{
    c:{n:"إغلاق",run(ctx){
     if(ctx.pts.length<3)throw new Error("الإغلاق يحتاج ثلاث نقاط");
     mkWall(ctx,ctx.pts[ctx.pts.length-1],ctx.pts[0]);
     H.rep("ok","أُغلق المضلع — ابدأ سلسلة جديدة أو Esc للخروج");
     endChain();
    }},
    u:{n:"تراجع",run(){undoStep()}}},
   each(ctx,p){
    const P=ctx.pts;
    if(P.length<2)return;
    mkWall(ctx,P[P.length-2],p);
    /* غير المتّصل: كل جدار مستقلّ بنقطتيه */
    if(!ovOn("wall","chain")){
     ctx.pts.length=0;
     ctx.pts.push(p);
    }
   }}],
 prev(ctx,g){
  const o=[], P=ctx.pts, t=ovLen("wall","t")||150;
  for(let i=0;i<P.length-1;i++)o.push(pvLine(P[i],P[i+1],"#4b5a6b"));
  if(P.length&&g){
   o.push(pvBand(P[P.length-1],g,t,GRN));
   o.push(pvLine(P[P.length-1],g,YEL));
  }
  return o;
 }});

/* ═══ جدار قوسيّ — ثلاث نقاط ═══
   البداية والنهاية ثم نقطةٌ على القوس (bulgeFrom3). لا محاذاةَ: جسمُ
   القوس متماثلٌ حول مساره دائماً. والقوسُ الضيّق (نصفُ قطره ≤ t/2)
   يرفضه addWall بسببه فتبقى الأداة على الخطوة نفسها لنقطةٍ أخرى.

   ما يقبله من أدوات التعديل مُعلَنٌ في core/modify.js (ARC_OK):
   نقل · نسخ · دوران · مرآة · مصفوفات · حذف. وما عداه يُرفَض. */
function mkArcWall(ctx,a,b,p){
 const bg=bulgeFrom3(a,b,p);
 if(!bg)throw new Error(
  "النقاط الثلاث على استقامةٍ (أو تكاد) — لا قوسَ بينها");
 const w=addWall(a,b,ovLen("arcwall","t"),ov("arcwall","type"),"c",
  ovLen("arcwall","h"),bg);
 rec(ctx,w,"walls");
 const P=arcParams(w);
 H.rep("ok",`${w.id} · قوس ${m2(wallLen(w))} م · نصف القطر `
  +`${P?m2(P.R):"—"} م · ${P?(Math.abs(P.sweep)*180/Math.PI).toFixed(1):"—"}° `
  +`· ${mm(w.t).toFixed(2)} م`
  +(w.type==="low"?` · سترة ${m2(w.h)} م`:""));
 return w;
}
defTool({
 id:"arcwall", alias:"aw arc قوس جدارقوسي", label:"جدار قوسي",
 hint:"البداية · النهاية · نقطةٌ على القوس",
 opts:[
  {k:"t",    label:"السماكة م", type:"len", def:"0.15"},
  {k:"type", label:"النوع",     type:"sel", seg:1, items:TY, def:"int"},
  {k:"h",    label:"ارتفاع السترة م", type:"len", def:"1",
   when:o=>o.type==="low"}],
 steps:[
  {p:"نقطة البداية"},
  {p:"نقطة النهاية", base:0},
  {p:"نقطة على القوس", base:0, box:1, restart:1,
   each(ctx,p){
    /* ctx.pts قد تحمل نقطةً ثالثةً مرفوضةً سابقاً: الأوّلتان وحدهما
       هما البداية والنهاية */
    mkArcWall(ctx,ctx.pts[0],ctx.pts[1],p);
   }}],
 prev(ctx,g){
  const P=ctx.pts, o=[], t=ovLen("arcwall","t")||150;
  if(P.length<1||!g)return o;
  if(P.length===1){o.push(pvLine(P[0],g,YEL)); return o}
  const a=P[0], b=P[1];
  o.push(pvLine(a,b,"#4b5a6b"));
  const bg=bulgeFrom3(a,b,g);
  if(!bg){
   o.push(pvLine(a,g,PNK));
   o.push(pvText([g[0]+600,g[1]+600],"استقامة — لا قوس",PNK));
   return o;
  }
  const w={a,b,t,bulge:bg};
  const A=arcParams(w);
  const ring=band(w);
  if(ring)o.push(pvPoly(ring,GRN,1));
  else{const c=arcTess(w,0); if(c)o.push(pvPoly(c,PNK,0))}
  /* MT1: يُقرأ إن وُلد القوس من جذوره قبل النقرة — الشعاعُ والزاوية
     والوترُ أرقامٌ تسبق الالتزام، وإن استُبعِد قيل سببه نصّاً لا
     لوناً وحده، فالرفضُ لم يعد مفاجئاً. */
  if(A){
   const chord=Math.hypot(b[0]-a[0],b[1]-a[1]);
   const sw=Math.abs(A.sweep)*180/Math.PI;
   const s=ring
    ? `R ${m2(A.R)} م · ${sw.toFixed(1)}° · وتر ${m2(chord)} م`
    : `مرفوض: نصف القطر ${m2(A.R)} م < نصف السماكة ${m2(t/2)} م`;
   o.push(pvText([g[0]+600,g[1]+600],s,ring?YEL:PNK));
  }
  return o;
 }});

/* ═══ مستطيل ═══
   المحاذاة تُطبَّق على كل ضلع بحيث تنتظم كلها إلى الداخل أو الخارج.
   الاتجاه يُوحَّد عكس عقارب الساعة، فيكون «اليسار» هو الخارج. */
defTool({
 id:"rect", alias:"r مستطيل", label:"مستطيل",
 hint:"ركنان متقابلان · أو اكتب مقاساً مثل 9x14",
 opts:[
  {k:"t",    label:"السماكة م", type:"len", def:"0.25"},
  {k:"type", label:"النوع",     type:"sel", seg:1, items:TY, def:"ext"},
  {k:"align",label:"القياس",    type:"sel",
   items:[["c","محوري"],["l","داخلي صافٍ"],["r","خارجي كلّي"]],
   def:"c"}],
 steps:[
  {p:"الركن الأول"},
  {p:"الركن المقابل أو المقاس", base:0, box:1, restart:1,
   each(ctx,p){
    const a=ctx.pts[0];
    const x0=Math.min(a[0],p[0]), x1=Math.max(a[0],p[0]);
    const y0=Math.min(a[1],p[1]), y1=Math.max(a[1],p[1]);
    if(x1-x0<500||y1-y0<500)
     throw new Error("المستطيل أصغر من 0.50 م");
    const t=ovLen("rect","t"), ty=ov("rect","type");
    const al=ov("rect","align");
    /* عكس الساعة مع Y للأعلى: الداخل يسار كل ضلعٍ موجَّه.
       فalign=l يعني المسار على الوجه الداخلي والجسم يمتدّ خارجاً
       ⇒ المقاس المرسوم هو الصافي. وr عكسه: المقاس كلّيّ. */
    const Q=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
    for(let i=0;i<4;i++)rec(ctx,
     addWall(Q[i],Q[(i+1)%4],t,ty,al),"walls");
    const nm={c:"محورياً",l:"صافياً",r:"كلّياً"}[al];
    H.rep("ok",`4 جدران · ${dm2(x1-x0,y1-y0,"م")} ${nm}`);
   }}],
 prev(ctx,g){
  return (ctx.pts.length&&g)?[pvRect(ctx.pts[0],g,GRN)]:[];
 }});

/* ═══ قياس — لا يُنشئ شيئاً ═══ */
defTool({
 id:"measure", alias:"mi قياس مسافه", label:"قياس",
 hint:"نقاط متتالية · Enter ينهي · «ثبّت» يحوّلها أبعاداً حقيقية",
 /* ═══ «ثبّت» ═══ P-تحسين
    كان القياسُ لحظياً تماماً: ترى الرقمَ في السجلّ ويذهب، فإن أردتَه
    في الرسم أعدتَ العملَ بأداة «بُعد». والقياسُ هو نفسُه هندسةُ
    البُعد المحاذي، فالتحويلُ خطوةٌ واحدةٌ لا إعادةُ عمل.
    ومُطفأٌ افتراضاً: القياسُ في الأغلب سؤالٌ لا تأشير. */
 opts:[
  {k:"keep",label:"ثبّت كأبعاد",type:"chk",def:0,
   hint:"كلُّ ضلعٍ يصير بُعداً محاذياً — خطوةُ تراجعٍ واحدة"},
  {k:"off", label:"إزاحة البُعد م",type:"len",def:"0.5"}],
 steps:[
  {p:"النقطة الأولى"},
  {p:"النقطة التالية (Enter ينهي)", loop:1, base:-1}],
 prev(ctx,g){
  const P=ctx.pts.concat(g?[g]:[]), o=[];
  for(let i=0;i<P.length-1;i++)o.push(pvLine(P[i],P[i+1],PNK));
  return o;
 },
 done(ctx){
  const P=ctx.pts;
  if(P.length<2)return;
  /* التثبيت أوّلاً: الرقمُ الذي يُقال هو الذي كُتب */
  if(ovOn("measure","keep")){
   const off=Math.max(0,ovLen("measure","off"));
   const made=[];
   edit(()=>{
    for(let i=0;i<P.length-1;i++){
     /* البُعدُ المحاذي: `pos` إزاحةٌ على عمود الضلع نفسِه
        (dimGeom)، فلا حسابَ متجهٍ هنا ولا نسخةَ ثانيةٌ منه. */
     try{made.push(addDim("al",P[i],P[i+1],off))}
     catch(e){}
    }
   },"تثبيت القياس أبعاداً");
   made.forEach(d=>rec(ctx,d,"dims"));
   H.rep(made.length?"ok":"wr",
    made.length?`ثُبِّت ${made.length} بُعداً محاذياً — تُحرَّر كأيِّ بُعد`
     :"لم يُثبَّت شيء: الأضلاعُ أقصرُ من الحدّ الأدنى للبُعد");
  }
  let tot=0;
  for(let i=0;i<P.length-1;i++)
   tot+=Math.hypot(P[i+1][0]-P[i][0],P[i+1][1]-P[i][1]);
  let s=`المسافة ${m3(tot)} م`;
  if(P.length===2){
   const a=((Math.atan2(P[1][1]-P[0][1],P[1][0]-P[0][0])
    *180/Math.PI)%360+360)%360;
   s+=` · الزاوية ${a.toFixed(1)}°`;
  }
  if(P.length>3){
   let ar=0;
   for(let i=0,n=P.length;i<n;i++){
    const q=P[i], r=P[(i+1)%n];
    ar+=q[0]*r[1]-r[0]*q[1];
   }
   s+=` · المساحة ${(Math.abs(ar/2)/1e6).toFixed(3)} م²`;
  }
  H.rep("ok",s);
 }});


/* ═══ خطّ متعدّد حرّ ═══
   النقاط تتراكم في ctx.pts (يدفعها feedPoint نفسُه) ولا كيانَ قبل
   الالتزام: Enter ينهي مفتوحاً، وC يغلق. الكيان يُنشأ في done فيكون
   خطوةَ تراجعٍ واحدة ولو نقرت عشرين نقطة. خيار «مغلق» يُقرأ في done
   أيضاً — فلا يبقى مربّعاً بلا أثر. */
defTool({
 id:"pline", alias:"pl polyline متعدد متعرج", label:"خطّ متعدّد",
 hint:"نقاط متتالية · C يغلق · Enter ينهي مفتوحاً · U يتراجع نقطة",
 opts:[
  {k:"closed",label:"مغلق",type:"chk",def:0}],
 steps:[
  {p:"النقطة الأولى"},
  {p:"النقطة التالية (Enter ينهي)", loop:1, base:-1, min:1,
   opts:{
    c:{n:"إغلاق",run(ctx){
     if(ctx.pts.length<3)throw new Error("الإغلاق يحتاج ثلاث نقاط");
     ctx.wantClosed=1;
     finish();
    }},
    u:{n:"تراجع",run(){undoStep()}}}}],
 done(ctx){
  if(ctx.pts.length<2)
   throw new Error("الخطّ المتعدّد يحتاج نقطتين على الأقل");
  const closed=(ctx.wantClosed||ovOn("pline","closed"))
   &&ctx.pts.length>=3?1:0;
  const p=addPline(ctx.pts,{closed});
  rec(ctx,p,"plines");
  H.rep("ok",`${p.id} · ${m2(plineLen(p))} م · `
   +(closed?"مغلق":"مفتوح"));
 },
 prev(ctx,g){
  const P=ctx.pts.concat(g?[g]:[]), o=[];
  for(let i=0;i<P.length-1;i++)o.push(pvLine(P[i],P[i+1],GRN));
  if(g&&ovOn("pline","closed")&&ctx.pts.length>1)
   o.push(pvLine(ctx.pts[0],g,"#4b5a6b"));
  return o;
 }});