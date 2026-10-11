/* ═══ العناصرُ الإنشائية: كمرةٌ وقاعدةٌ وبلاطة ═══ §٣/١٢
   كان في المشروع عمودٌ وحدَه، ومن يرسم أعمدةً يرسم كمراتٍ وقواعدَ
   معها. ثلاثةُ أنواعٍ في كيانٍ واحدٍ بحقل `kind` — عرفُ `anno` نفسُه.
   والمتقطّعُ عرفٌ لا زينة: ما فوق مستوى القطع أو تحته يُرسَم متقطّعاً،
   ولو رُسِم مصمَّتاً لقُرِئ جداراً.
   التشغيل:  node js/tests/struct.test.js                            */
import {shim,group,groupAsync,ok,eq,near,deep,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,clearHistory,edit,undo,shapeNotes}=
 await import("../core/state.js");
const G =await import("../core/struct.js");
const EN=await import("../core/ents.js");
const LD=await import("../core/laydef.js");

const reset=()=>{newState(); ensureShape(); clearHistory()};
const beam=(a,b,w,d,tag)=>{let e=null;
 edit(()=>{e=G.addBeam(a,b,w,d,"conc",tag)},"كمرة"); return e};
const foot=(p,w,h,th,tag)=>{let e=null;
 edit(()=>{e=G.addFooting(p,w,h,0,th,"conc",tag)},"قاعدة"); return e};
const slab=(pts,th)=>{let e=null;
 edit(()=>{e=G.addSlab(pts,th,"conc")},"بلاطة"); return e};

group("العقدُ معلَنٌ ومصدَّر",()=>{
 deep(G.SKINDS,["beam","footing","slab"],"ثلاثةُ أنواعٍ لا أكثر");
 G.SKINDS.forEach(k=>ok(/[\u0600-\u06FF]/.test(G.SK[k]),
  `${k}: اسمٌ عربيٌّ معروض`));
 ok(G.SMAT.conc&&G.SMAT.steel,"وجدولُ الموادّ معلَن");
 /* الحدودُ معلَنةٌ ليقرأها المُدقِّقُ والواجهةُ من موضعٍ واحد */
 [["BW",G.BW_MIN,G.BW_MAX],["BD",G.BD_MIN,G.BD_MAX],
  ["FW",G.FW_MIN,G.FW_MAX],["TH",G.TH_MIN,G.TH_MAX]]
  .forEach(([n,lo,hi])=>ok(lo>0&&hi>lo,`${n}: مدًى صالحٌ معلَن`));
 ok(G.SLAB_MAXV>=20,"وسقفُ رؤوسِ البلاطةِ معلَن");
});

group("طبقةٌ مستقلّةٌ تُطفَأ وحدها",()=>{
 ok(LD.ORDER.includes("A-STRU"),"A-STRU في ترتيب العرض");
 ok(LD.DESC["A-STRU"],"ولها وصفٌ عربيّ");
 ok(LD.PRN["A-STRU"],"ولونُ طباعة");
 /* ولا تقع على A-COLS: الأعمدةُ مقطوعةٌ وهذه مخفيّة */
 reset();
 const e=beam([0,0],[6000,0],250,500);
 eq(G.strPrims(e)[0].L,"A-STRU","والأوّلياتُ عليها لا على الأعمدة");
});

group("الكمرة: شريطٌ حول محورها",()=>{
 reset();
 const e=beam([0,0],[6000,0],250,500,"B1");
 eq(G.strKind(e),"beam","نوعُها");
 eq(G.strLen(e),6000,"وطولُها الوتر");
 const p=G.strPoly(e);
 eq(p.length,4,"ومضلّعُها أربعةُ رؤوس");
 const b=G.strBBox(e);
 eq(b.y1-b.y0,250,"وعرضُه عرضُ الكمرة");
 eq(b.x1-b.x0,6000,"وطولُه طولُها");
 near(G.strVol(e)/1e9,6*0.25*0.5,1e-6,"وحجمُها طولٌ×عرضٌ×عمق");
 ok(/B1/.test(G.strLabel(e)),"والبطاقةُ تحمل الوسم");
 ok(/B1/.test(G.strName(e)),"والاسمُ كذلك");
});

group("القاعدة: مستطيلٌ حول مركزٍ وقطرانِ يميّزانها",()=>{
 reset();
 const e=foot([0,0],1500,1500,400,"F1");
 eq(G.strKind(e),"footing","نوعُها");
 near(G.strArea(e)/1e6,2.25,1e-6,"ومسطّحُها 1.5×1.5");
 near(G.strVol(e)/1e9,2.25*0.4,1e-6,"وحجمُها مسطّحٌ×سماكة");
 const P=G.strPrims(e);
 eq(P.filter(g=>g.t==="line").length,6,
  "أربعةُ أضلاعٍ وقطرانِ — القطرانِ يميّزانها عن مستطيلٍ أيٍّ كان");
 eq(G.strLen(e),0,"ولا طولَ خطّيٍّ لها — فلا تُجمَع مع الكمرات");
});

group("البلاطة: مضلّعٌ مغلق",()=>{
 reset();
 const e=slab([[0,0],[6000,0],[6000,4000],[0,4000]],150);
 eq(G.strKind(e),"slab","نوعُها");
 near(G.strArea(e)/1e6,24,1e-6,"ومساحتُها 6×4");
 near(G.strVol(e)/1e9,24*0.15,1e-6,"وحجمُها مساحةٌ×سماكة");
 ok(/150/.test(G.strLabel(e)),"والبطاقةُ تذكر السماكة");
});

group("المتقطّعُ عرفٌ لا زينة",()=>{
 reset();
 const E=[beam([0,0],[6000,0],250,500),
  foot([0,3000],1500,1500,400),
  slab([[0,6000],[4000,6000],[4000,9000],[0,9000]],150)];
 E.forEach(e=>{
  const L=G.strPrims(e).filter(g=>g.t==="line");
  ok(L.length>0,`${G.SK[e.kind]}: لها خطوط`);
  ok(L.every(g=>Array.isArray(g.dash)&&g.dash.length===2),
   `${G.SK[e.kind]}: كلُّ خطٍّ متقطّعٌ — المصمَّتُ يُقرَأ جداراً`);
 });
 /* ولا تعبئة: ثلاثُ طبقاتٍ متراكبةٍ تُعمي المخطَّط */
 E.forEach(e=>ok(!G.strPrims(e).some(g=>g.t==="poly"),
  `${G.SK[e.kind]}: بلا تعبئةٍ — الحدُّ يكفي`));
 /* ولكلٍّ بطاقةٌ تصف مقطعَها */
 E.forEach(e=>ok(G.strPrims(e).some(g=>g.t==="text"),
  `${G.SK[e.kind]}: لها بطاقة`));
});

group("المرفوضُ يُسمّى سببُه ولا نصفَ تنفيذ",()=>{
 reset();
 const bad=(fn)=>{let m=""; edit(()=>{try{fn()}catch(e){m=e.message;throw e}},"x"); return m};
 ok(/الأدنى|طول/.test(bad(()=>G.addBeam([0,0],[10,0],250,500))),
  "كمرةٌ أقصرُ من أن تُرسَم");
 eq(S.struct.length,0,"ولم تُكتَب");
 ok(/ثلاثة/.test(bad(()=>G.addSlab([[0,0],[1000,0]],150))),
  "وبلاطةٌ برأسَين");
 ok(/مساحة/.test(bad(()=>G.addSlab([[0,0],[50,0],[50,50]],150))),
  "وبلاطةٌ أصغرُ من أن تُرسَم");
 eq(S.struct.length,0,"ولا شيءَ كُتِب");
 /* والحدودُ تُقصَر لا تُرفَض — كعرضِ الجدار */
 reset();
 const e=beam([0,0],[6000,0],5,99999);
 eq(e.w,G.BW_MIN,"عرضٌ دون الحدِّ يُرفَع إليه");
 eq(e.d,G.BD_MAX,"وعمقٌ فوقه يُقصَر");
});

group("التطبيعُ يُصلِح ويُسجِّل ولا يخلط الحقول",()=>{
 reset();
 beam([0,0],[6000,0],250,500);
 slab([[0,3000],[6000,3000],[6000,7000],[0,7000]],150);
 S.struct[0].w=-9;
 S.struct[1].th=99999;
 ensureShape();
 eq(S.struct.length,2,"لم يُسقَط شيء");
 ok(S.struct[0].w>=G.BW_MIN,"عرضُ الكمرةِ أُعيد إلى حدّه");
 ok(S.struct[1].th<=G.TH_MAX,"وسماكةُ البلاطةِ كذلك");
 const NT=JSON.stringify(shapeNotes());
 ok(/struct|إنشائ/.test(NT)||NT.length>2,`والإصلاحُ مُسجَّل: ${NT.slice(0,90)}`);
 /* ولا حقلَ من نوعٍ يبقى على آخر */
 ok(!("pts" in S.struct[0]),"الكمرةُ بلا رؤوس");
 ok(!("w" in S.struct[1]),"والبلاطةُ بلا عرض");
 /* ونوعٌ مجهولٌ يُنبَذ */
 S.struct.push({id:"GX",kind:"ghost"});
 ensureShape();
 ok(!S.struct.some(e=>e.id==="GX"),"ونوعٌ مجهولٌ يُنبَذ");
});

group("كيانٌ كاملُ العضوية: إصابةٌ ومقابضُ ونقلٌ وحذف",()=>{
 reset();
 const e=beam([0,0],[6000,0],250,500,"B1");
 const h=EN.hitTest(3000,0,150);
 ok(h&&h.k==="struct"&&h.id===e.id,"النقرةُ تصيبها");
 const g=EN.gripsOf({k:"struct",id:e.id});
 eq(g.length,2,"ومقبضانِ لطرفَيها");
 const o=EN.grabOf({k:"struct",id:e.id});
 edit(()=>{EN.moveEnt({k:"struct",id:e.id},o,1000,2000)},"نقل");
 deep(e.a,[1000,2000],"والنقلُ يُحرّكها");
 /* القاعدةُ بمقبضِ مركزٍ وحجم */
 reset();
 const f=foot([0,0],1500,1500,400);
 eq(EN.gripsOf({k:"struct",id:f.id}).length,2,"القاعدةُ بمقبضَين");
 const of2=EN.grabOf({k:"struct",id:f.id});
 edit(()=>{EN.dragGrip({s:{k:"struct",id:f.id},k:"sz"},of2,[2000,2000])},"حجم");
 eq(f.w,4000,"وسحبُ الركنِ يضبط الضلعَ من المركز");
 /* والحذفُ يُزيلها */
 edit(()=>{EN.delEnts([{k:"struct",id:f.id}])},"حذف");
 eq(S.struct.length,0,"والحذفُ يعمل");
});

group("الوسمُ التالي مستقلٌّ عن الأعمدة",()=>{
 reset();
 beam([0,0],[6000,0],250,500,"B1");
 beam([0,1000],[6000,1000],250,500,"B2");
 eq(G.nextStrTag("B"),"B3","يتبع أكبرَ رقمٍ قائم");
 eq(G.nextStrTag("F"),"F1","وسابقةٌ أخرى تبدأ من واحد — فلا تصادمَ مع C1 العمود");
});

group("الموضعُ المباشرُ والبحثُ بالمعرّفِ والحذفُ المباشر",()=>{
 reset();
 const e=foot([0,0],1500,1500,400);
 ok(G.strAt(0,0)===e,"strAt تجدها بلا سجلّ");
 ok(!G.strAt(99999,99999),"ولا شيءَ بعيداً عنها");
 /* strById وdelStruct منفذانِ مباشرانِ يستعملهما سجلُّ الكيانات
    (byId وdel في entreg) — ويُقاسانِ هنا صريحَين */
 eq(G.strById(e.id),e,"strById تجدها بمعرّفها");
 eq(G.strById("لا-شيء"),null,"ومعرّفٌ مجهولٌ يُعيد null لا يرمي");
 let n=0;
 edit(()=>{n=G.delStruct(e)?1:0},"حذف مباشر");
 eq(n,1,"delStruct تحذفها وتُقِرّ");
 eq(S.struct.length,0,"ولم تبقَ");
 eq(G.delStruct(e),false,"وحذفُ ما ليس موجوداً يُعيد false لا يرمي");
 reset();
 foot([0,0],1500,1500,400);
 undo();
 eq(S.struct.length,0,"والتراجعُ خطوةٌ واحدة");
});

/* ═══ الأدواتُ الثلاث ═══ §٣/١٢
   ثلاثُ أدواتٍ لا واحدةٌ بخيارِ نوع: مدخلاتُها مختلفةٌ أصلاً (طرفانِ ·
   نقرةٌ · حلقة)، وأداةٌ تبدّل عددَ خطواتها بحسب خيارٍ تُربك. */
await groupAsync("الأدواتُ الثلاثُ تعمل من النقرةِ إلى الكيان",async()=>{
 const {shimCanvas,shimDOM,toolRig}=await import("./harness.js");
 shimCanvas();
 const DOC=shimDOM();
 {const cv=DOC.createElement("canvas"); cv.setAttribute("id","cv");
  DOC.body.appendChild(cv);}
 if(!globalThis.window)
  globalThis.window={prompt:()=>null,confirm:()=>true};
 const RN=await import("../core/render.js");
 await import("../tools/parts.js");
 const R=await import("../tools/registry.js");
 const rig=toolRig(R,{hit:(x,y)=>EN.hitTest(x,y,150),
  invalidate:()=>RN.invalidate()});

 /* ── الكمرة: طرفانِ ── */
 reset(); rig.defs("beam"); rig.clear();
 R.begin("beam");
 rig.at(0,0); rig.at(6000,0);
 eq(S.struct.length,1,"نقرتانِ ⇒ كمرةٌ واحدة");
 eq(S.struct[0].kind,"beam","نوعُها كمرة");
 eq(G.strLen(S.struct[0]),6000,"بطولِ ما نُقِر");
 ok(/^B\d+$/.test(S.struct[0].tag||""),
  `والوسمُ تلقائيٌّ: ${S.struct[0].tag}`);
 ok(rig.said(/م³/),"والسجلُّ يذكر الحجمَ — لا «أُضيف عنصر» وحدها");
 /* وتبقى فعّالةً: الطرفُ الثاني يصير أوّلَ التالية (سلسلةٌ كـالجدار) */
 rig.at(6000,4000);
 eq(S.struct.length,2,"والنقرةُ التالية تُنشئ كمرةً متّصلة");
 deep(S.struct[1].a,[6000,0],"تبدأ من حيث انتهت سابقتُها");
 ok(S.struct[1].tag!==S.struct[0].tag,"وبوسمٍ جديدٍ لا مكرَّر");
 R.cancel(true);

 /* ── القاعدة: نقرةٌ واحدة ── */
 reset(); rig.defs("footing"); rig.clear();
 R.begin("footing");
 rig.at(1000,1000);
 eq(S.struct.length,1,"نقرةٌ واحدةٌ ⇒ قاعدة");
 eq(S.struct[0].kind,"footing","نوعُها قاعدة");
 deep([S.struct[0].x,S.struct[0].y],[1000,1000],"في موضعِ النقرة");
 eq(S.struct[0].w,S.struct[0].h,"ومربّعةٌ إذ تُرِك «الطول» فارغاً");
 ok(/^F\d+$/.test(S.struct[0].tag||""),"ووسمُها F");
 rig.at(5000,1000);
 eq(S.struct.length,2,"وتبقى فعّالةً لقاعدةٍ تالية");
 R.cancel(true);

 /* ── البلاطة: حلقةٌ ثم Enter ── */
 reset(); rig.defs("slab"); rig.clear();
 R.begin("slab");
 rig.at(0,0); rig.at(6000,0); rig.at(6000,4000); rig.at(0,4000);
 eq(S.struct.length,0,"لا بلاطةَ قبل Enter — الحلقةُ تُغلَق بالتأكيد");
 rig.enter();
 eq(S.struct.length,1,"وEnter يُنشئها");
 eq(S.struct[0].kind,"slab","نوعُها بلاطة");
 eq(S.struct[0].pts.length,4,"بأربعةِ رؤوس");
 near(G.strArea(S.struct[0])/1e6,24,0.01,"ومساحتُها 6×4");
 ok(/^S\d+$/.test(S.struct[0].tag||""),"ووسمُها S");

 /* ورأسانِ لا يكفيانِ: الحدُّ الأدنى ثلاثةٌ وEnter لا يُنشئ ناقصاً */
 reset(); rig.defs("slab"); rig.clear();
 R.begin("slab");
 rig.at(0,0); rig.at(6000,0);
 rig.enter();
 eq(S.struct.length,0,"رأسانِ ⇒ لا بلاطة");
 R.cancel(true);

 /* ── المعاينةُ تطابق الناتج ── */
 reset(); rig.defs("beam"); rig.clear();
 R.begin("beam");
 rig.at(0,0);
 const pv=R.T.def.prev(R.T.ctx,[6000,0]);
 ok(pv.length>=4,"شبحُ الكمرةِ أربعةُ أضلاعٍ على الأقل");
 /* الشبحُ بعرضِ المقطعِ نفسِه الذي سيُنشَأ */
 const ys=pv.filter(x=>x.t==="l").flatMap(x=>[x.a[1],x.b[1]]);
 near(Math.max(...ys)-Math.min(...ys),
  ovOfBeamW(R),1,"وبعرضِ المقطعِ المعلَن لا بعرضٍ آخر");
 R.cancel(true);
 function ovOfBeamW(R2){return R2.ovLen?R2.ovLen("beam","w"):250}
});

process.exit(summary()?1:0);
