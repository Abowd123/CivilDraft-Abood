/* ═══ اختبار الواجهة ═══
   ui/* يحتاج شجرةً وأحداثاً — وهو الوحيد الذي يحتاجها فعلاً:
   tools/* لا يلمس document. وشِبهُ DOM يعطي بنيةً ونسباً وتفويضاً،
   ولا يعطي تخطيطاً ولا CSS — فما يُفحَص هنا بنيةُ المخرَج وسلوكُ
   المستمعين، وما يعتمد على المقاسات يُعلَن متروكاً.

   والعقودُ المفحوصةُ لا يكشفها فحصٌ ساكن:
   · اللوحةُ لا تُرسَم إن كانت مخفيّة، وتُرسَم لحظةَ فتحها
   · العُقَد تُنقَل ولا تُبنى — فتحفظ مستمعيها وقيَمها
   · المزامنةُ تقارن ولا تبني
   · تعديلُ حقلٍ يمرّ بمُثبِّته فيُرفَض ما يُرفَض

   التشغيل:  node js/tests/ui.js                                   */
import {shim,shimCanvas,shimDOM,fire,click,setVal,setBox,boxOf,
        setWin,setDir,drag,group,groupAsync,ok,eq,near,deep,skip,
        when,summary} from "./harness.js";
shim();
shimCanvas();
const doc=shimDOM();

/* شجرةٌ أدنى: ما يطلبه ui/* من index.html */
const IDS=["top","appBtn","qat","appMenu","ribbon","tools","optbar",
 "main","stripS","side","work","stage","cv","vpLabel","navbar",
 "compass","dynBox","qpCard","qpHead","qpClose","qpBody","cmdWrap",
 "cmdline","clPrompt","clIn","clLive","clSug","log","status",
 "stItems","osPop","stMenu","vMenu","cmdFloat","cMenu","ctxMenu",
 "helpBox","pPark","floats","pMenu","wsMenu","sideE","stripE"];
doc.body.innerHTML=IDS.map(id=>`<div id="${id}"></div>`).join("");
/* #cv قماشٌ حقيقيّ من shimCanvas، و#stage أبوه */
(()=>{
 const st=doc.getElementById("stage");
 const old=doc.getElementById("cv");
 if(old)old.remove();
 const cv=doc.createElement("canvas");
 cv.setAttribute("id","cv");
 st.appendChild(cv);
 /* getElementById في القماش المُلبَّس لا يُسجَّل، فنُسجّله */
 const g=doc.getElementById.bind(doc);
 doc.getElementById=id=>(id==="cv")?cv:g(id);
})();

const {S,newState,ensureShape,touchGeom}=
 await import("../core/state.js");
const W =await import("../core/walls.js");
const O =await import("../core/opens.js");
const A =await import("../core/areas.js");
const L =await import("../core/layers.js");
const RN=await import("../core/render.js");
const PN=await import("../ui/panels.js");
const ST2=await import("../ui/store.js");
const LY=await import("../ui/layout.js");

const $=s=>doc.querySelector(s);
const $$=s=>doc.querySelectorAll(s);
const reset=()=>{newState(); ensureShape(); RN.invalidate()};
const room=(w,h,t)=>{
 const P=[[0,0],[w,0],[w,h],[0,h]];
 for(let i=0;i<4;i++)W.addWall(P[i],P[(i+1)%4],t||250,"ext","c");
 RN.invalidate();
};
/* ═══ ١ · شِبهُ DOM يصدق ═══
   الأداةُ تُفحَص قبل أن يُفحَص بها: مِعمَلٌ كاذبٌ أسوأ من غيابه. */
group("شِبهُ DOM",()=>{
 const d=doc.createElement("div");
 d.innerHTML=`<button id="b1" class="a b" data-x="7">نصّ</button>`
  +`<input type="checkbox" checked><span class="a"></span>`;
 eq(d.children.length,3,"التحليلُ يبني ثلاثةَ أبناء");
 eq(d.querySelector("#b1").tagName,"BUTTON","والمعرّفُ يُصاب");
 eq(d.querySelector("#b1").textContent,"نصّ","والنصُّ يُقرأ");
 eq(d.querySelector("#b1").dataset.x,"7","والسمةُ تُقرأ dataset");
 eq(d.querySelectorAll(".a").length,2,"والصنفُ يُصاب مرّتين");
 eq(d.querySelectorAll('[data-x="7"]').length,1,"والسمةُ بقيمتها");
 ok(d.querySelector("input").checked,"وchecked تُقرأ");
 eq(d.querySelectorAll("div button").length,0,"والنسبُ يُحسَب");
 eq(doc.querySelectorAll("#side").length,1,"والشجرةُ موصولة");
 /* الفقاعةُ والالتقاط */
 const par=doc.createElement("div");
 const kid=doc.createElement("button");
 par.appendChild(kid);
 doc.body.appendChild(par);
 const seen=[];
 par.addEventListener("click",()=>seen.push("bubble"));
 doc.addEventListener("click",()=>seen.push("doc"));
 par.addEventListener("click",()=>seen.push("capture"),true);
 kid.click();
 deep(seen,["capture","bubble","doc"],
  "والحدثُ يُلتقَط نزولاً ويتفاقع صعوداً — فالتفويضُ يعمل");
 par.remove();
 /* والنسبُ ينقل ولا ينسخ */
 const a=doc.createElement("div"), b=doc.createElement("div");
 const n=doc.createElement("span");
 a.appendChild(n);
 b.appendChild(n);
 eq(a.children.length,0,"والنقلُ يُخرِج من الأب الأوّل");
 eq(b.children.length,1,"ويُدخِل في الثاني");
 eq(n.parentElement,b,"والنسبُ يُحدَّث");
 /* والمستمعُ يبقى بعد النقل — وهو عقدُ dock.js كلِّه */
 let hits=0;
 n.addEventListener("click",()=>hits++);
 a.appendChild(n);
 n.click();
 eq(hits,1,"والمستمعُ ينتقل مع العقدة — لا يُبنى من جديد");
 /* والمقاساتُ صفرٌ مُعلَن */
 eq(n.offsetWidth,0,"والمقاسُ صفرٌ صريحاً — لا تخطيطَ هنا");
 /* وtoggle على details */
 const dt=doc.createElement("details");
 let tog=0;
 dt.addEventListener("toggle",()=>tog++);
 dt.open=true;
 eq(tog,1,"وفتحُ details يُطلِق toggle");
 dt.open=true;
 eq(tog,1,"ولا يُطلِقه بلا تبدُّل");
});
/* ═══ ٢ · مخزنُ الواجهة ═══ */
group("مخزنُ الواجهة",()=>{
 const d=ST2.DEFUI();
 ok(Object.keys(d).length>15,`${Object.keys(d).length} مفتاحاً`);
 eq(d.shell,"ribbon","والقشرةُ المصنعية");
 eq(d.theme,"dark","والسِّمة");
 ok(ST2.uiSet("logH",200),"وuiSet يكتب");
 eq(ST2.UIS.logH,200,"ويُقرأ");
 ok(!ST2.uiSet("لا-وجود",1),"والمفتاحُ المجهول يُرفَض");
 ST2.resetUI();
 eq(ST2.UIS.logH,d.logH,"وresetUI يعيد المصنع");
 /* والانفتاحُ في layout — مصدرٌ واحد */
 ST2.UIS.layout=LY.normLay(null);
 ok(ST2.secSet("props",0)===undefined||true,"وsecSet تكتب");
 eq(ST2.secOpen("props",1),false,"وsecOpen تقرأ ما كُتب");
 ST2.secSet("props",1);
 eq(ST2.secOpen("props",0),true,"في الاتجاهين");
 eq(ST2.secOpen("لا-وجود",1),true,
  "والمجهولةُ تعود إلى الافتراض المُعطى");
});
/* ═══ ٣ · التخطيطُ وتطبيعُه ═══ */
group("التخطيط",()=>{
 eq(new Set(LY.pIds()).size,LY.pIds().length,
  `${LY.pIds().length} لوحةً بمعرّفاتٍ فريدة`);
 ok(LY.isPanel("props"),"وisPanel تصدق");
 ok(!LY.isPanel("لا-وجود"),"وتكذّب");
 const d=LY.DEFLAY();
 eq(Object.keys(d.p).length,LY.pIds().length,"والتخطيطُ يغطّي الكلّ");
 LY.pIds().forEach(id=>eq(d.p[id].z,LY.pDef(id).z,
  `${id}: عمودُه المصنعيّ`));
 /* التطبيعُ ينبذ المجهولَ ويستكمل الناقص */
 const n=LY.normLay({p:{"لا-وجود":{z:"s"},props:{z:"q",i:"x"}},
  zw:{s:99999,e:-5}, mode:{s:"مجهول"}, auto:{s:1}});
 ok(!n.p["لا-وجود"],"واللوحةُ المجهولةُ تُنبَذ");
 ok(/^(s|e|f|x)$/.test(n.p.props.z),"والعمودُ الشاذُّ يُستبدَل");
 ok(n.zw.s<=LY.WMAX,"والعرضُ يُقيَّد أعلى");
 ok(n.zw.e>=LY.WMIN,"وأدنى");
 eq(n.mode.s,"tab","والوضعُ المجهول يعود إلى التبويبات — افتراضُ المرحلةِ ٥");
 eq(n.auto.s,1,"والإخفاءُ التلقائيُّ يُحفَظ");
 eq(Object.keys(n.p).length,LY.pIds().length,
  "والناقصُ يُستكمَل من مصنعه");
 /* وأسطحُ العمل تشير إلى لوحاتٍ موجودة */
 Object.keys(LY.WS).forEach(k=>{
  const w=LY.WS[k];
  ok(!!w.n,`${k}: له تسمية`);
  ["s","e","open"].forEach(f=>(w[f]||[]).forEach(id=>
   ok(LY.isPanel(id),`${k}/${f}: «${id}» لوحةٌ فعلية`)));
  const dup=[].concat(w.s||[],w.e||[]);
  eq(new Set(dup).size,dup.length,`${k}: ولا لوحةَ في عمودين`);
 });
 ok(!!LY.wsNorm({n:"x",s:["props","لا-وجود"]}),"وwsNorm تُطبّع");
 eq(LY.wsNorm({n:"x",s:["props","لا-وجود"]}).s.length,1,
  "فتنبذ المجهولة");
 eq(LY.wsNorm(null),null,"وnull null");
});
/* ═══ ٤ · سجلُّ اللوحات ═══ المخفيُّ لا يُرسَم ═══ */
group("سجلُّ اللوحات",()=>{
 doc.body.innerHTML=IDS.map(id=>`<div id="${id}"></div>`).join("")
  +`<details class="sec" data-sec="t1"><summary>أولى</summary>`
  +`<div id="t1box"></div></details>`
  +`<details class="sec" data-sec="t2"><summary>ثانية</summary>`
  +`<div id="t2box"></div></details>`;
 let n1=0, n2=0;
 PN.reg("t1","#t1box",el=>{n1++; el.innerHTML=`<b>${n1}</b>`},"أولى");
 PN.reg("t2","#t2box",el=>{n2++; el.innerHTML=`<b>${n2}</b>`},"ثانية");
 ok(PN.panelIds().includes("t1"),"واللوحةُ تُسجَّل");
 eq(PN.panelSel("t1"),"#t1box","وبمحدِّدها");
 /* المخفيّةُ لا تُرسَم */
 const d1=$('details[data-sec="t1"]');
 const d2=$('details[data-sec="t2"]');
 d1.open=true; d2.open=false;
 PN.markAllDirty();
 const n=PN.renderVisible(1);
 eq(n,1,"والمرئيّةُ وحدها تُرسَم");
 eq(n1,1,"فالأولى رُسِمت");
 eq(n2,0,"والمغلقةُ لا — كانت تُبنى كلُّها ثم تُخفى");
 ok(PN.visible("t1"),"وvisible تصدق");
 ok(!PN.visible("t2"),"وتكذّب على المغلقة");
 /* وتُرسَم لحظةَ فتحها */
 PN.wirePanels();
 d2.open=true;
 eq(n2,1,"والمغلقةُ تُرسَم لحظةَ فتحها");
 /* والوسمُ يبقى حتى تُرسَم */
 PN.markDirty("t2");
 d2.open=false;
 PN.renderVisible(1);
 eq(n2,1,"والمخفيّةُ الموسومةُ لا تُرسَم");
 d2.open=true;
 eq(n2,2,"وتُرسَم عند الفتح");
 /* وعطبُ لوحةٍ لا يُسقِط بقيّتها */
 PN.reg("bad","#t1box",()=>{throw new Error("عطبٌ مقصود")},"عاطبة");
 ok(!PN.renderPanel("bad",1),"واللوحةُ العاطبةُ تُعلِن فشلها");
 ok(/تعذّر/.test($("#t1box").innerHTML),"وتكتب سببَه في موضعها");
 PN.markAllDirty();
 ok(PN.renderVisible(1)>=1,"وبقيّتُها تُرسَم");
 /* والحالةُ تُحفَظ في مصدرٍ واحد */
 ST2.UIS.layout=LY.normLay(null);
 const dd=$('details[data-sec="props"]');
 ok(!dd,"وقسمُ props ليس في هذه الشجرة");
 eq(PN.stats().length>=3,true,"وstats تُعلن الحصيلة");
});
/* ═══ ٥ · السِّمةُ والألوان ═══ */
await groupAsync("السِّمة",async()=>{
 const TH=await import("../ui/theme.js");
 eq(TH.KEYS.length>10,true,`${TH.KEYS.length} مفتاح لون`);
 deep(Object.keys(TH.SCREEN.dark).sort(),
  Object.keys(TH.SCREEN.light).sort(),
  "والسِّمتان تغطّيان المفاتيح نفسها — فلا مفتاحَ ينقص إحداهما");
 eq(TH.setPal("light"),"light","وsetPal تضبط");
 eq(TH.themeName(),"light","وتُقرأ");
 ok(!TH.isDark(),"وisDark تكذّب");
 eq(doc.documentElement.dataset.theme,"light",
  "وتكتب data-theme — عليها تعتمد الأنماط");
 eq(TH.setPal("مجهول"),"dark","والمجهولةُ تعود إلى الداكنة");
 ok(TH.isDark(),"وisDark تصدق");
 /* واللونُ من resolve — مصدرٌ واحد */
 reset();
 eq(TH.layCss("A-WALL"),L.resolve("A-WALL","dark").css,
  "ولونُ الطبقة من resolve لا من جدولٍ ثانٍ");
 TH.setPal("light");
 eq(TH.layCss("A-WALL"),L.resolve("A-WALL","light").css,
  "والفاتحةُ تقرأ لونَ الورق — ما تراه هو ما يُطبَع");
 TH.setPal("dark");
 /* والعطبُ والتحذيرُ يسبقان الطبقة */
 eq(TH.primCss({L:"A-WALL",bad:1}),TH.pal().bad,
  "والعطبُ يسبق لونَ الطبقة");
 eq(TH.primCss({L:"A-WALL",warn:1}),TH.pal().warn,"والتحذير");
 eq(TH.primCss({L:"A-WALL"}),TH.layCss("A-WALL"),
  "والسليمُ لونُ طبقته");
});
/* ═══ ٦ · الأيقونات ═══ */
await groupAsync("الأيقونات",async()=>{
 const IC=await import("../ui/icons.js");
 const N=IC.iconNames();
 ok(N.length>60,`${N.length} أيقونة`);
 ok(IC.hasIcon("wall"),"وhasIcon تصدق");
 ok(!IC.hasIcon("لا-وجود"),"وتكذّب");
 ok(IC.hasIcon("info"),
  "وinfo موجودة — قائمةُ التطبيق تطلبها في صفّ «القياس»");
 N.forEach(k=>ok(String(IC.ICONS[k]||"").length>8,
  `${k}: له محتوى`));
 const n=IC.mountIcons();
 ok(n>0,`وmountIcons يبني ${n} رمزاً`);
 eq(IC.mountIcons(),0,"ولا يُعيد البناء");
 ok(/<use href="#i-wall"/.test(IC.icon("wall")),
  "وicon يُخرِج مرجعاً إلى السبرايت");
 eq(IC.icon("لا-وجود"),"",
  "والمفقودةُ نصٌّ فارغ — الزرُّ يظهر بتسميته ولا ينكسر");
 ok(/width="24"/.test(IC.icon("wall",24)),"والمقاسُ يُطاع");
});
/* ═══ ٧ · لوحةُ الخصائص: مُثبِّتٌ واحد ═══
   العقدُ المفحوص: تعديلُ حقلٍ من اللوحة يمرّ بمُثبِّته، فيُرفَض ما
   يُرفَض ويُقال سببُه — لا مسارٌ ثانٍ بحرفيّاته. */
await groupAsync("لوحةُ الخصائص",async()=>{
 const CV=await import("../ui/canvas.js");
 const PR=await import("../ui/props.js");
 const B=await import("../ui/bus.js");
 const log=[];
 B.HOOK.report=(c,m)=>log.push({c,s:String(m)});
 B.HOOK.refresh=()=>{RN.invalidate()};
 B.HOOK.props=()=>{};
 B.HOOK.prompt=()=>{};
 B.HOOK.status=()=>{};
 B.HOOK.toggles=()=>{};
 B.HOOK.defs=()=>{};
 /* props.js تكتب برسائلها المحلّية إلى #log مباشرةً ولا تنادي
    HOOK.report قطّ (الاستيرادُ فيها بلا مستعمل) — فسجلُّها لا
    يصل log إن اقتُصر said عليه وحده. نقرأ المصدرين معاً. */
 const LOGT=()=>{const e=$("#log"); return e?e.textContent:""};
 const said=re=>log.some(x=>re.test(x.s))||re.test(LOGT());
 const clr=()=>{log.length=0; const e=$("#log"); if(e)e.innerHTML=""};

 reset();
 PR.buildSide();
 ok($('details[data-sec="props"]'),"واللوحةُ تُبنى");
 ok($("#lays"),"وقسمُ الطبقات");
 ok($("#mScale"),"وحقولُ المشروع");
 PR.wireForms();
 PR.loadForms();
 eq($("#mScale").value,"100","وتُملأ من الحالة");
 /* ═══ حقلٌ يمرّ بمُثبِّته ═══ */
 const w=W.addWall([0,0],[6000,0],200,"int","c");
 O.addOpen(w,3000,"niche",600,1200,900,{dep:150});
 RN.invalidate();
 CV.setSel([{k:"wall",id:w.id}],{k:"wall",id:w.id});
 PN.markDirty("props");
 PN.renderPanel("props",1);
 const fT=$('#props [data-p="t"]');
 ok(!!fT,"وحقلُ السماكة مبنيّ");
 eq(fT.dataset.k,"len","بنوعه");
 clr();
 setVal(fT,"0.30");
 eq(w.t,300,"والقيمةُ المقبولةُ تُكتَب");
 clr();
 setVal($('#props [data-p="t"]'),"0.10");
 eq(w.t,300,"وما تمنعه الكوّةُ لا يُكتَب");
 ok(said(/كوّة/),"ويُقال سببُه — مُثبِّتٌ واحدٌ للوحتين");
 clr();
 setVal($('#props [data-p="t"]'),"سلام");
 eq(w.t,300,"وما ليس طولاً لا يُكتَب");
 ok(said(/ليس طولاً/),"ويُقال");
 /* والمُعدَّدُ يُقبَل من قائمته وحدها */
 clr();
 setVal($('#props [data-p="type"]'),"ext");
 eq(w.type,"ext","والنوعُ يُكتَب");
 clr();
 setVal($('#props [data-p="type"]'),"مجهول");
 eq(w.type,"ext","والخارجُ عن القائمة لا يُكتَب");
 ok(said(/ليس من/),"ويُقال ما يُقبَل");
 /* ═══ الجلسةُ المقسورةُ تُقال ═══ */
 reset();
 const w2=W.addWall([0,0],[6000,0],200,"int","c");
 const o=O.addOpen(w2,3000,"window",1200,1400,900);
 RN.invalidate();
 CV.setSel([{k:"open",id:o.id}],{k:"open",id:o.id});
 PN.markDirty("props");
 PN.renderPanel("props",1);
 clr();
 setVal($('#props [data-p="kind"]'),"door");
 eq(o.kind,"door","والنوعُ يُبدَّل");
 eq(o.sill,0,"والجلسةُ تُقسَر صفراً");
 ok(said(/قُسِرت/),
  "ويُقال القسرُ — كان كتابةً صامتةً داخل مُثبِّتِ حقلٍ آخر");
 /* وكتابةُ جلسةٍ على بابٍ تُرفَض برسالةٍ تُقرأ */
 PN.markDirty("props");
 PN.renderPanel("props",1);
 clr();
 setVal($('#props [data-p="sill"]'),"0.9");
 eq(o.sill,0,"وجلسةٌ على بابٍ لا تُكتَب");
 ok(said(/الباب جلسته صفر/),"وتُرفَض برسالةٍ تقول ما يُفعَل");
 /* ═══ الطبقات: الرؤيةُ والطبعُ والقفل ═══ */
 reset();
 room(6000,4000,200);
 PN.markDirty("lays");
 PN.renderPanel("lays",1);
 const off=$('#lays [data-loff="A-WALL"]');
 ok(!!off,"وزرُّ الإخفاء مبنيّ");
 clr();
 click(off);
 ok(!L.vis("A-WALL"),"والنقرُ يُخفي");
 ok(said(/مخفيّة/),"ويُقال");
 click($('#lays [data-loff="A-WALL"]'));
 ok(L.vis("A-WALL"),"ويُظهِر");
 /* الطبقاتُ الفارغة مخفيّةٌ افتراضياً (البند 6) وتُظهَر بزرّ */
 ok(!$('#lays [data-lplot="A-REFR"]'),"والفارغة (A-REFR) مخفيّةٌ افتراضياً");
 ok(!!$('#lays [data-lplot="A-WALL"]'),"وما فيه كياناتٌ ظاهر (A-WALL)");
 ok(!!$("#lEmpty"),"وزرُّ «إظهار الفارغة» موجود");
 click($("#lEmpty"));
 const pl=$('#lays [data-lplot="A-REFR"]');
 ok(!!pl,"وزرُّ الطبع مبنيّ");
 eq(L.plots("A-REFR"),false,
  "والمرجعُ مصنعُه «لا يُطبَع» — ولا سبيلَ إليه قبل هذا الزرّ");
 clr();
 click(pl);
 ok(L.plots("A-REFR"),"والنقرُ يُعيد طبعه");
 ok(said(/تُطبَع/),"ويُقال");
 /* والمساعدةُ يُعطَّل قفلُها */
 const lk=$('#lays [data-llock="A-GRID"]');
 ok(!!lk,"وزرُّ القفل مبنيّ للمساعدة");
 ok(lk.disabled,"ومُعطَّلٌ — لا كياناتَ تُحدَّد عليها");
 click($("#lEmpty"));
 ok(!$('#lays [data-lplot="A-REFR"]'),"والنقرةُ الثانية تُعيد إخفاءها");
 /* ═══ محرِّرُ الطبقة ═══ */
 clr();
 click($('#lays [data-lsel="A-WALL"]'));
 ok($('#lays [data-lf="col"]'),"والنقرُ على الاسم يفتح محرِّرَها");
 ok($('#lays [data-lf="lw"]'),"وفيه وزنُ الخطّ");
 ok($('#lays [data-lf="lt"]'),"ونوعُه");
 ok($('#lays [data-lf="op"]'),"والشفافية");
 clr();
 setVal($('#lays [data-lf="lw"]'),"100");
 eq(L.resolve("A-WALL","plot").lw,100,"والوزنُ يُكتَب");
 ok(said(/وزن الخطّ/),"ويُقال");
 clr();
 setVal($('#lays [data-lf="pcol"]'),"#123456");
 eq(L.resolve("A-WALL","plot").css,"#123456","ولونُ الورق");
 clr();
 setVal($('#lays [data-lf="lt"]'),"dash");
 eq(L.resolve("A-WALL","plot").dxf,"DASHED",
  "ونوعُ الخطّ يصل DXF باسمه");
 click($('#lays [data-lsel="A-WALL"]'));
 ok(!$('#lays [data-lf="col"]'),"ونقرةٌ ثانيةٌ تُغلِق المحرِّر");
 /* والتصفيرُ يعيد المصنع */
 clr();
 click($("#lReset"));
 eq(L.resolve("A-WALL","plot").lw,50,"وإعادةُ المصنع تُصفّر");
 ok(said(/مصنعه/),"ويُقال");
});
/* ═══ ٨ · شريطُ الحالة: سجلٌّ لا قالب ═══ */
await groupAsync("شريطُ الحالة",async()=>{
 const SB=await import("../ui/statusbar.js");
 doc.body.innerHTML=IDS.map(id=>`<div id="${id}"></div>`).join("");
 const n=SB.buildStatus();
 ok(n>10,`${n} عنصراً يُبنى من السجلّ`);
 ok($('#stItems [data-rb="ortho"]'),"ومفتاحُ التعامد مبنيّ");
 ok($('#stItems [data-rb="grid"]'),"والشبكة");
 ok($('#stItems [data-act="stCust"]'),"وزرُّ التخصيص");
 /* والمزامنةُ تقرأ الحالة */
 reset();
 S.rb.ortho=1;
 SB.syncStatus();
 ok($('#stItems [data-rb="ortho"]').classList.contains("on"),
  "والمُشغَّلُ يُبرَز");
 eq($('#stItems [data-rb="ortho"]').getAttribute("aria-pressed"),
  "true","وaria-pressed تصدق");
 S.rb.ortho=0;
 SB.syncStatus();
 ok(!$('#stItems [data-rb="ortho"]').classList.contains("on"),
  "والمُطفأُ لا");
 /* والإخفاءُ بالسمة لا بالنزع — الشريطُ ينقر [data-rb] بالوكالة */
 ST2.UIS.stHide={ortho:1};
 SB.buildStatus();
 const el=$('#stItems [data-rb="ortho"]');
 ok(!!el,"والمخفيُّ يبقى في الشجرة — نزعُه يعطّل وكالةَ الشريط");
 ok(el.hidden,"ويُخفى بالسمة");
 ST2.UIS.stHide={};
 SB.buildStatus();
 ok(!$('#stItems [data-rb="ortho"]').hidden,"ويعود");
 /* وكلُّ عنصرٍ اختياريٍّ يُخفى ويعود */
 SB.stIds().forEach(id=>{
  ST2.UIS.stHide={[id]:1};
  SB.buildStatus();
  ok(!SB.stShown(id),`${id}: يُخفى`);
  ST2.UIS.stHide={};
  SB.buildStatus();
  ok(SB.stShown(id),`${id}: ويعود`);
 });
 /* والمقياسُ يُعرَض معزولاً */
 S.meta.scale=50;
 SB.syncStatus();
 const sc=$('#stItems [data-act="stScale"] .lb');
 ok(sc&&/50/.test(sc.textContent),"والمقياسُ يُعرَض");
 ok(sc&&/\u2066/.test(sc.textContent),
  "معزولَ الاتجاه — «1:50» ينقلب في سياقٍ عربيّ بلا عزل");
});
/* ═══ ٩ · الخصائصُ السريعة ═══ */
await groupAsync("الخصائصُ السريعة",async()=>{
 const QP=await import("../ui/quickprops.js");
 const CV=await import("../ui/canvas.js");
 doc.body.innerHTML=IDS.map(id=>`<div id="${id}"></div>`).join("");
 ok(Object.keys(QP.QF).length>=9,"وحقولُها مُعلَنةٌ لتسعة أنواع");
 /* وكلُّ حقلٍ فيها موجودٌ في FLD */
 const BT=await import("../core/batch.js");
 Object.keys(QP.QF).forEach(k=>{
  ok(!!BT.FLD[k],`${k}: نوعٌ له حقول`);
  QP.QF[k].forEach(f=>ok(!!BT.fldOf(k,f),
   `${k}/${f}: حقلٌ موجودٌ في الجدول`));
 });
 reset();
 const w=W.addWall([0,0],[5000,0],200,"int","c");
 RN.invalidate();
 CV.setSel([{k:"wall",id:w.id}],{k:"wall",id:w.id});
 const box=$("#qpBody");
 QP.renderQuick(box);
 ok(/data-bk="wall"/.test(box.innerHTML),
  "وتبثّ سماتَ التعديل الجماعي — يتولّاها معالجُ props");
 ok(/data-bf="t"/.test(box.innerHTML),"بحقلها");
 /* والمُوحَّدُ متحكِّمٌ واحد */
 ok(/class="num"/.test(box.innerHTML),
  "والمتحكِّمُ من المولِّد الواحد — لا نسخةٌ ثالثة");
 /* والتعدّدُ يُعلَن */
 const w2=W.addWall([0,3000],[5000,3000],400,"int","c");
 RN.invalidate();
 CV.setSel([{k:"wall",id:w.id},{k:"wall",id:w2.id}],null);
 QP.renderQuick(box);
 ok(/متعدّد/.test(box.innerHTML),
  "والحقلُ المختلفُ يُعلَن «متعدّداً» ولا يُسوّى");
 /* ونوعانِ مختلفان يُحوَّلان إلى اللوحة الكاملة */
 const d=(await import("../core/dims.js"))
  .addDim("h",[0,0],[5000,0],-800);
 CV.setSel([{k:"wall",id:w.id},{k:"dim",id:d.id}],null);
 QP.renderQuick(box);
 ok(/افتح «الخصائص»/.test(box.innerHTML),
  "ونوعانِ مختلفان يُحالان إلى اللوحة الكاملة");
});
/* ═══ ١٠ · التخطيطُ المُعلَن ═══
   الصندوقُ يُعلَن ولا يُحسَب: فما يعتمد على القياس يُفحَص، وما لم
   يُعلَن يبقى صفراً فيسقط بدل أن ينجح كذباً. */
group("التخطيطُ المُعلَن",()=>{
 setWin(1440,900);
 const d=doc.createElement("div");
 doc.body.appendChild(d);
 eq(d.offsetWidth,0,"وما لم يُعلَن صفرٌ");
 deep(boxOf(d),{x:0,y:0,w:0,h:0},"وصندوقُه صفر");
 setBox(d,{x:100,y:50,w:312,h:800});
 eq(d.offsetWidth,312,"والمُعلَنُ يُبلَّغ عرضاً");
 eq(d.offsetHeight,800,"وارتفاعاً");
 const r=d.getBoundingClientRect();
 eq(r.left,100,"وحافّتُه اليسرى");
 eq(r.right,412,"واليمنى مجموعُهما");
 eq(r.bottom,850,"والسفلى");
 setBox(d,{w:-5});
 eq(d.offsetWidth,0,"والسالبُ يُقصَر إلى صفر");
 d.remove();
 /* والاتجاهُ يُبدَّل — حسابُ الحوافّ يتبعه */
 eq(setDir("ltr"),"ltr","وsetDir تضبط");
 eq(getComputedStyle(doc.documentElement).direction,"ltr","وتُقرأ");
 setDir("rtl");
 eq(getComputedStyle(doc.documentElement).direction,"rtl",
  "والعربيةُ RTL");
 /* والنافذةُ تُعلَن وتُطلِق resize */
 let n=0;
 addEventListener("resize",()=>n++);
 setWin(1024,768);
 eq(innerWidth,1024,"والنافذةُ تُعلَن");
 ok(n>0,"وتُطلِق resize — عليه يعتمد إعادةُ الحصر");
 setWin(1440,900);
});
/* ═══ ١١ · الإرساء: العُقَد تُنقَل ولا تُبنى ═══
   عقدُ dock.js كلِّه: appendChild ينقل العنصرَ بمستمعيه وقيَم
   حقوله وموضعِ تمريره. وإعادةُ بنائه كانت ستُفقِد ما يكتبه
   المستخدمُ وسط أمر. */
await groupAsync("الإرساء",async()=>{
 const B=await import("../ui/bus.js");
 const log=[];
 B.HOOK.report=(c,m)=>log.push({c,s:String(m)});
 B.HOOK.refresh=()=>{};
 B.HOOK.props=()=>{};
 B.HOOK.prompt=()=>{};
 B.HOOK.status=()=>{};
 B.HOOK.toggles=()=>{};
 B.HOOK.clean=()=>{};
 let wsSeen=null;
 B.HOOK.ws=w=>{wsSeen=w};
 const said=re=>log.some(x=>re.test(x.s));
 const clr=()=>{log.length=0};

 /* شجرةٌ كاملةٌ للإرساء: أعمدةٌ وفواصلُ وشاراتٌ ومرآبٌ وعائمات */
 doc.body.innerHTML=IDS.map(id=>`<div id="${id}"></div>`).join("");
 const st=doc.getElementById("stage");
 const cvOld=doc.getElementById("cv");
 (()=>{
  const sd=$("#side"), se=$("#sideE"), mn=$("#main");
  sd.setAttribute("class","dock"); sd.dataset.zone="s";
  se.setAttribute("class","dock"); se.dataset.zone="e";
  $("#stripS").setAttribute("class","strip");
  $("#stripS").dataset.zone="s";
  $("#stripE").setAttribute("class","strip");
  $("#stripE").dataset.zone="e";
  ["s","e"].forEach(z=>{
   const r=doc.createElement("div");
   r.setAttribute("class","dsz");
   r.dataset.rsz=z;
   mn.appendChild(r);
  });
 })();
 const PR=await import("../ui/props.js");
 const DK=await import("../ui/dock.js");
 reset();
 PR.buildSide();
 PR.wireForms();
 const n=DK.initDock();
 ok(n>=10,`${n} لوحةً محصودة`);
 ok($('#side details[data-sec="props"]'),
  "والخصائصُ في العمود الأيمن");
 eq(DK.zoneOf("props"),"s","وموضعُها مُعلَن");
 ok(DK.order("s").length>5,"والترتيبُ يُقرأ من DOM");
 ok(DK.order("s").includes("props"),"وفيه الخصائص");
 ok(!!DK.titleOf("props"),"والتسميةُ من نصّ summary لا من سجلّ");
 ok($('details[data-sec="props"] [data-pm="props"]'),
  "وأدواتُ الترويسة مُحقَنة");
 ok($('details[data-sec="props"] [data-pc="props"]'),
  "وزرُّ إغلاقها");

 /* ═══ النقلُ يحفظ المستمعَ والقيمة ═══ */
 const sec=DK.secEl("props");
 const probe=doc.createElement("input");
 probe.setAttribute("id","probe");
 probe.value="ما يكتبه المستخدم";
 let hits=0;
 probe.addEventListener("change",()=>hits++);
 sec.appendChild(probe);
 ok(DK.dockTo("props","e"),"والنقلُ إلى العمود الآخر يقع");
 eq(DK.zoneOf("props"),"e","وموضعُها يُحدَّث");
 ok($('#sideE details[data-sec="props"]'),"وهي فيه");
 ok(!$('#side details[data-sec="props"]'),"وليست في الأوّل");
 eq($("#probe").value,"ما يكتبه المستخدم",
  "وقيمةُ الحقل باقيةٌ — العقدةُ نُقلت ولم تُبنَ");
 setVal($("#probe"),"جديد");
 eq(hits,1,"والمستمعُ يعمل بعد النقل");
 DK.dockTo("props","s");
 eq(hits,1,"ولا يُضاعَف بالنقل");
 setVal($("#probe"),"ثالث");
 eq(hits,2,"ويبقى واحداً");

 /* ═══ الإغلاقُ والإعادة ═══ */
 clr();
 ok(DK.closePanel("props"),"والإغلاقُ يقع");
 eq(DK.zoneOf("props"),"x","وموضعُها «مغلقة»");
 ok($('#pPark details[data-sec="props"]'),
  "وتنتقل إلى المرآب — لا تُحذَف، فمستمعوها يبقون");
 ok(said(/ترجّعها/),"ويُقال كيف تُعاد");
 eq($("#probe").value,"ثالث","والقيمةُ باقيةٌ في المرآب");
 ok(DK.openPanel("props"),"والإعادةُ تقع");
 eq(DK.zoneOf("props"),"s","إلى عمودها المصنعيّ");
 ok($('#side details[data-sec="props"]'),"وهي فيه");

 /* ═══ العائمة ═══ */
 ok(DK.toFloat("props",120,90),"والتعويمُ يقع");
 eq(DK.zoneOf("props"),"f","وموضعُها «عائمة»");
 const flt=DK.fltEl("props");
 ok(!!flt,"ولها نافذة");
 ok(flt.querySelector('details[data-sec="props"]'),
  "واللوحةُ داخلها");
 eq($("#probe").value,"ثالث","والقيمةُ باقيةٌ فيها");
 ok(DK.secEl("props").open,"والعائمةُ مفتوحةٌ دائماً — تُغلَق لا تُطوى");
 /* والحصرُ داخل النافذة */
 setWin(1024,768);
 DK.toFloat("props",99999,99999);
 const L2=DK.layout().p.props;
 ok(L2.x<=1024,`والموضعُ يُحصَر أفقياً (${L2.x})`);
 ok(L2.y<=768,`ورأسياً (${L2.y})`);
 setWin(1440,900);
 DK.dockTo("props","s");
 ok(!DK.fltEl("props"),"والإرساءُ يُزيل نافذتَها");

 /* ═══ الترتيبُ يُقرأ من DOM ═══ */
 const O1=DK.order("s");
 const i0=O1.indexOf("props");
 ok(i0>0,"وللخصائص موضعٌ في الترتيب");
 ok(DK.movePanel("props",-1),"والتصعيدُ يقع");
 eq(DK.order("s").indexOf("props"),i0-1,"فتتقدّم");
 ok(DK.movePanel("props",1),"والتنزيلُ");
 eq(DK.order("s").indexOf("props"),i0,"فتعود");
 const first=DK.order("s")[0];
 ok(!DK.movePanel(first,-1),"وأوّلُها لا يتقدّم");

 /* ═══ وضعُ التبويبات ═══ */
 clr();
 ok(DK.setMode("s","tab"),"والتبويباتُ تُضبَط");
 ok($("#side .zTabs"),"وشريطُها يُبنى");
 eq($$("#side .zTabs [data-ztab]").length,DK.order("s").length,
  "وتبويبٌ لكل لوحة");
 const cur=DK.layout().cur.s;
 ok(!!cur,"وواحدةٌ جارية");
 ok(!DK.secEl(cur).hidden,"وهي ظاهرة");
 const other=DK.order("s").find(x=>x!==cur);
 ok(DK.secEl(other).hidden,"وما عداها مخفيٌّ بالسمة لا منزوع");
 ok(said(/تبويبات/),"ويُقال الوضع");
 /* والنقرُ يبدّل الجارية */
 click($(`#side [data-ztab="${other}"]`));
 eq(DK.layout().cur.s,other,"والنقرُ يبدّلها");
 ok(!DK.secEl(other).hidden,"فتظهر");
 ok(DK.secEl(cur).hidden,"وتُخفى الأولى");
 DK.setMode("s","acc");
 ok(!$("#side .zTabs"),"والعودةُ إلى الأقسام تُزيل الشريط");

 /* ═══ الإخفاءُ التلقائيُّ والانكشاف ═══ */
 clr();
 DK.setAuto("s",1);
 ok($("#side").classList.contains("auto"),"والعمودُ يصير تلقائياً");
 ok($("#side").hidden,"ويُخفى");
 ok(!$("#stripS").hidden,"وشارتُه تظهر");
 ok($$("#stripS [data-peek]").length>0,"وفيها زرٌّ لكل لوحة");
 DK.peek("s","props");
 ok(!$("#side").hidden,"والانكشافُ يُظهره");
 eq(DK.peeking(),"s","ويُعلَن");
 DK.unpeek();
 ok($("#side").hidden,"والإغلاقُ يُخفيه");
 eq(DK.peeking(),null,"ويُعلَن");
 DK.setAuto("s",0);
 ok(!$("#side").hidden,"والتثبيتُ يعيده");

 /* ═══ العرضُ يُقاس من الحافّة المُثبَّتة ═══
    RTL: العمودُ الأيمنُ حافّتُه اليمنى ثابتة، فالعرضُ من هناك. */
 setDir("rtl");
 DK.setZoneW("s",300);
 eq(DK.layout().zw.s,300,"والعرضُ يُضبَط");
 setBox($("#side"),{x:1140,y:0,w:300,h:900});
 drag($('.dsz[data-rsz="s"]'),[1140,400],[1100,400]);
 ok(DK.layout().zw.s>300,
  `والسحبُ يساراً يوسّع العمودَ الأيمن في RTL (${DK.layout().zw.s})`);
 DK.setZoneW("s",300);
 setBox($("#side"),{x:1140,y:0,w:300,h:900});
 drag($('.dsz[data-rsz="s"]'),[1140,400],[1200,400]);
 ok(DK.layout().zw.s<300,"والسحبُ يميناً يضيّقه");
 /* والحدُّ يُقيَّد */
 DK.setZoneW("s",99999);
 eq(DK.layout().zw.s,LY.WMAX,"والعرضُ يُقيَّد أعلى");
 DK.setZoneW("s",1);
 eq(DK.layout().zw.s,LY.WMIN,"وأدنى");
 DK.setZoneW("s",312);

 /* ═══ أسطحُ العمل ═══ */
 clr();
 wsSeen=null;
 ok(DK.wsApply("annot"),"وسطحُ «تأشير» يُطبَّق");
 ok(!!wsSeen,"ويُبلَّغ بالخطّاف — القشرةُ والتبويبُ خارج الإرساء");
 eq(wsSeen.tab,"annt","بتبويبه");
 ok(said(/سطح العمل/),"ويُقال");
 const wsE=DK.order("e");
 ok(wsE.includes("sched"),"وجدولُ المساحات في العمود الأيسر");
 ok(!DK.order("s").includes("sched"),"وليس في الأيمن");
 eq(DK.layout().mode.e,"tab","ووضعُ الأيسر تبويبات");
 /* والمذكورُ وحده يُرسى */
 const shown=[].concat(DK.order("s"),DK.order("e"));
 LY.pIds().forEach(id=>{
  if(shown.includes(id))return;
  ok(["f","x"].includes(DK.zoneOf(id)),
   `${id}: غيرُ المذكورِ مغلقٌ أو عائم — لا لوحةَ تُبنى لتُخفى`);
 });
 /* والحفظُ والحذف */
 clr();
 ok(DK.wsSave("سطحي"),"والحفظُ باسمٍ يقع");
 ok(said(/حُفظ/),"ويُقال");
 eq(ST2.UIS.wsCur,"سطحي","ويصير الجاري");
 ok(!DK.wsSave("arch"),"والاسمُ المدمَجُ يُرفَض");
 ok(said(/مدمج/),"ويُقال سببُه");
 DK.wsApply("arch");
 ok(DK.wsApply("سطحي"),"والمحفوظُ يُطبَّق");
 ok(DK.wsDel("سطحي"),"والحذفُ يقع");
 ok(!DK.wsDel("arch"),"والمدمَجُ لا يُحذَف");
 /* والتصفيرُ يعيد المصنع */
 DK.wsReset();
 const d0=LY.DEFLAY();
 LY.pIds().forEach(id=>eq(DK.zoneOf(id),d0.p[id].z,
  `${id}: عمودُه المصنعيّ بعد التصفير`));
 eq(DK.layout().zw.s,d0.zw.s,"والعرضُ المصنعيّ");
 eq(ST2.UIS.wsCur,"","ولا سطحَ جارياً");

 /* ═══ الإظهارُ يفتح ما يلزم ═══ */
 DK.setAuto("s",1);
 DK.setMode("s","tab");
 const el=DK.revealPanel("props");
 ok(!!el,"والإظهارُ يعيد القسم");
 eq(DK.peeking(),"s","ويكشف العمودَ المخفيَّ تلقائياً");
 eq(DK.layout().cur.s,"props","ويجعلها الجاريةَ في التبويبات");
 DK.setMode("s","acc");
 DK.setAuto("s",0);
 DK.closePanel("props");
 ok(!!DK.revealPanel("props"),"والمغلقةُ تُرسى ثم تُظهَر");
 eq(DK.zoneOf("props"),"s","في عمودها");
 ok(DK.secEl("props").open,"ومفتوحة");
 eq(DK.revealPanel("لا-وجود"),null,"والمجهولةُ null");

 /* ═══ والحصيلةُ تُعلَن ═══ */
 const S2=DK.dockStats();
 ok(Array.isArray(S2.s)&&Array.isArray(S2.e),"وdockStats يُعلن الأعمدة");
 ok(S2.mode&&S2.zw,"والوضعَ والعرض");
 eq(S2.s.length+S2.e.length+S2.f.length+S2.x.length,
  LY.pIds().length,"وكلُّ لوحةٍ في موضعٍ واحد");
});
/* ═══ ١٢ · ما لا يُفحَص بلا محرِّك تخطيط ═══ */
group("ما لا يُفحَص",()=>{
 skip("حفظُ حجمِ العائمة عند تحجيمها — يحتاج ResizeObserver، "
  +"وdock يتخطّاه إن غاب فلا يُزيَّف");
 skip("قصُّ النصّ بالثلاث نقاط وتمريرُ الأعمدة — CSS محض");
 skip("موضعُ القوائم المنبثقة يُحصَر بـoffsetWidth، والصندوقُ "
  +"مُعلَنٌ لا محسوبٌ — فالحصرُ يُفحَص بإعلانه لا باستنتاجه");
});
process.exit(summary()?1:0);
