/* ═══ حارسُ الوصولِ إلى لوحاتِ الإرساء ═══ حرسُ المرحلةِ ٥
   (audit/10-ui-plan.md)
   شرطُ الإقفالِ المكتوبُ في الخطّة: **«فتحُ أيِّ لوحةٍ من الشريطِ
   يصل إليها في نقرةٍ واحدةٍ من أيِّ حالةِ تخطيط»**. فهذا الملفُّ
   يفحص الدّعوى حرفاً:
     ١) لكلِّ لوحةٍ من الأربعَ عشرةَ **مُفتتِحٌ معروضٌ** (كان `guide`
        بلا مُفتتِحٍ أصلاً — لا فعلٌ ولا `dlg:`).
     ٢) و`revealPanel` تُظهِرها فعلاً **من كلِّ حالةٍ**: مغلقةٌ ·
        عائمةٌ · في العمودِ الآخرِ · عمودٌ مخفيٌّ تلقائياً · وضعُ
        تبويباتٍ وهي ليست الجاريةَ · قسمٌ مطويٌّ · شاشةٌ نظيفة.
     ٣) وكلُّ سطحِ عملٍ **يُعلِن لوحتَه الافتراضيةَ** في عمودِه.
   التشغيل:  node js/tests/dock-reach.test.js                        */
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {shim,shimCanvas,shimDOM,group,groupAsync,ok,eq,summary}
 from "./harness.js";
const ROOT=join(fileURLToPath(new URL(".",import.meta.url)),"..","..");
const rd=p=>{try{return readFileSync(join(ROOT,p),"utf8")}catch(e){return ""}};

shim(); shimCanvas();
const doc=shimDOM();
const $=s=>doc.querySelector(s);
const IDS=["top","appBtn","qat","appMenu","ribbon","tools","optbar",
 "main","stripS","side","work","stage","cv","vpLabel","navbar",
 "compass","dynBox","qpCard","qpHead","qpClose","qpBody","cmdWrap",
 "cmdline","clPrompt","clIn","clLive","clSug","log","status",
 "stItems","osPop","stMenu","vMenu","cmdFloat","cMenu","ctxMenu",
 "helpBox","pPark","floats","pMenu","wsMenu","sideE","stripE"];
doc.body.innerHTML=IDS.map(id=>`<div id="${id}"></div>`).join("");
(()=>{
 const st=doc.getElementById("stage");
 const old=doc.getElementById("cv");
 if(old)old.remove();
 const cv=doc.createElement("canvas");
 cv.setAttribute("id","cv");
 st.appendChild(cv);
 const sd=$("#side"), se=$("#sideE"), mn=$("#main");
 sd.setAttribute("class","dock"); sd.dataset.zone="s";
 se.setAttribute("class","dock"); se.dataset.zone="e";
 $("#stripS").setAttribute("class","strip"); $("#stripS").dataset.zone="s";
 $("#stripE").setAttribute("class","strip"); $("#stripE").dataset.zone="e";
 for(const z of ["s","e"]){
  const r=doc.createElement("div");
  r.setAttribute("class","dsz"); r.dataset.rsz=z;
  mn.appendChild(r);
 }
})();
if(!globalThis.window)
 globalThis.window={prompt:()=>null,confirm:()=>true};

const B =await import("../ui/bus.js");
for(const k of ["report","refresh","props","prompt","status","toggles",
 "clean","ws"])B.HOOK[k]=()=>{};
const LY=await import("../ui/layout.js");
const PR=await import("../ui/props.js");
const DK=await import("../ui/dock.js");
const ST=await import("../ui/store.js");
const AC=await import("../ui/actions.js");
const S  =await import("../ui/ribbon/schema.js");
const AM=await import("../ui/appmenu.js");

PR.buildSide(); PR.wireForms();
DK.initDock();

group("لكلِّ لوحةٍ مُفتتِحٌ معروض",()=>{
 const ids=LY.pIds();
 eq(ids.length,14,"أربعَ عشرةَ لوحةً");
 /* المُفتتِحُ ثلاثةُ أشكالٍ: فعلٌ في جدولِ الأفعالِ معروضٌ في الشريطِ
    أو في قائمةِ التطبيق، أو `dlg:` في ذيلِ لوحٍ من الشريط. */
 const acs=rd("js/ui/actions.js");
 const dlg=new Set([...rd("js/ui/ribbon/schema.js")
  .matchAll(/dlg:"(\w+)"/g)].map(m=>m[1]));
 const shownAct=new Set([...S.ribbonActs(),
  ...AM.ROWS.filter(r=>r&&r.act).map(r=>r.act)]);
 /* الفعلُ يُربَط بلوحتِه من `revealSec("<id>")` في جدولِ الأفعالِ
    نفسِه — لا من جدولٍ ثانٍ يُكتَب بيدٍ وينجرف (درسُ المرحلةِ ٢). */
 const actFor=id=>[...acs.matchAll(
   /(\w+):\s*\{id:"\1",[\s\S]{0,220}?revealSec\("(\w+)"\)/g)]
  .filter(m=>m[2]===id).map(m=>m[1]);
 for(const id of ids){
  const a=actFor(id).filter(x=>shownAct.has(x));
  ok(a.length>0||dlg.has(id),
     `${id}: مُفتتِحٌ معروضٌ (${a.join("/")||(dlg.has(id)?"dlg":"—")})`);
 }
 /* و`guide` بعينها: كانت الوحيدةَ بلا مُفتتِحٍ، فتُفحَص صراحةً كي
    لا يُظنَّ أنّ الحارسَ مرَّ عليها بالعموم. */
 ok(actFor("guide").includes("guideDlg"),"و`guide` لها فعلٌ مُسمّى");
 ok(shownAct.has("guideDlg"),"وهو معروضٌ فعلاً");
});

group("أسطحُ العملِ تُعلِن لوحتَها",()=>{
 const W=LY.WS;
 const keys=Object.keys(W);
 eq(keys.length,6,"ستَّةُ أسطحِ عملٍ مدمجة");
 for(const k of keys){
  const w=W[k];
  ok(w.def&&typeof w.def==="object",`${k}: يُعلِن def`);
  for(const z of LY.ZONES){
   const d=w.def[z], list=w[z]||[];
   if(!list.length){
    /* عمودٌ فارغٌ لا يُعلِن لوحةً — الإعلانُ وعدٌ، والوعدُ بما لا
       وجودَ له أسوأُ من الصمت. */
    ok(d==null,`${k}/${z}: عمودٌ فارغٌ بلا إعلان`);
    continue;
   }
   ok(d&&list.includes(d),`${k}/${z}: ${d} في عمودِه`);
  }
  /* والوضعُ تبويباتٌ: هو ما تعنيه «لوحةٌ واحدةٌ مُرسًى». */
  for(const z of LY.ZONES)
   eq(w.mode[z],"tab",`${k}/${z}: تبويباتٌ لا أقسام`);
 }
 eq(LY.DEFLAY().mode.s,"tab","والمصنعُ تبويباتٌ كذلك");
 /* والأقسامُ **خيارٌ لم يُحذَف**: §٨ تمنع حذفَ ما هو نادرٌ. */
 ok(LY.MODES.acc,"والأقسامُ خيارٌ قائم");
 ok(/dockTabS/.test(rd("js/ui/ribbon/wire.js")),"ومبدّلٌ يصل إليه");
});

/* ═══ الدّعوى الحقيقيةُ: الإظهارُ من كلِّ حالة ═══
   الحالةُ تُبنى ثمّ تُقاس **بعد** `revealPanel`: ظاهرةٌ في عمودٍ
   غيرِ مخفيٍّ، ومفتوحةٌ (أو هي الجاريةُ في التبويبات). ولا يُقنَع
   بأنّ الدالّةَ أعادت عنصراً: عنصرٌ مُعاد في عمودٍ مخفيٍّ لا يُرى. */
const visible=id=>{
 const d=DK.secEl(id);
 if(!d)return "لا عنصر";
 const L=DK.layout(), z=L.p[id].z;
 if(z==="x")return "ما زالت مغلقة";
 if(z==="f")return (L.p[id].o&&d.open)?"":"عائمةٌ مطويّة";
 if(L.auto[z]&&DK.peeking()!==z)return "عمودٌ مخفيٌّ لم يُكشَف";
 if(d.hidden)return "مخفيّةٌ بـhidden";
 if(L.mode[z]==="tab")
  return (L.cur[z]===id)?"":`ليست الجاريةَ (${L.cur[z]})`;
 return d.open?"":"قسمٌ مطويّ";
};

await groupAsync("الإظهارُ من كلِّ حالةٍ لكلِّ لوحة",async()=>{
 const ids=LY.pIds();
 const states=[
  ["مغلقة",       id=>{DK.closePanel(id); DK.layout().p[id].z="x"}],
  ["عائمة",       id=>{DK.dockTo(id,"f")}],
  ["العمودُ الآخر",id=>{DK.dockTo(id,"e")}],
  ["مخفيٌّ تلقائياً",id=>{DK.dockTo(id,"s"); DK.setAuto("s",1)}],
  ["تبويباتٌ وليست الجارية",id=>{
    DK.setAuto("s",0); DK.dockTo(id,"s"); DK.setMode("s","tab");
    const o=DK.order("s").find(x=>x!==id);
    if(o)DK.layout().cur.s=o;
  }],
  ["قسمٌ مطويّ",  id=>{DK.setMode("s","acc"); DK.dockTo(id,"s");
    DK.closePanel(id)}],
  ["شاشةٌ نظيفة", id=>{ST.UIS.clean=1; DK.dockTo(id,"s")}]
 ];
 for(const [name,setup] of states){
  for(const id of ids){
   ST.UIS.clean=0; DK.setAuto("s",0); DK.setAuto("e",0);
   setup(id);
   const el=DK.revealPanel(id);
   ok(!!el,`${name} · ${id}: الإظهارُ أعاد العنصر`);
   const why=visible(id);
   eq(why,"",`${name} · ${id}: صارت مرئيّةً${why?" — "+why:""}`);
  }
 }
 ST.UIS.clean=0; DK.setAuto("s",0); DK.setMode("s","tab");
});

await groupAsync("سطحُ العملِ يفتح على ما أعلَن",async()=>{
 for(const k of Object.keys(LY.WS)){
  const w=LY.WS[k];
  ok(DK.wsApply(k,1),`${k}: طُبِّق`);
  for(const z of LY.ZONES){
   const d=w.def[z];
   if(!d)continue;
   /* `syncZones` يداوي الفراغَ بأوّلِ لوحةٍ، فلو لم يُقرأ `def`
      لَوافقَ ترتيبُ القائمةِ الإعلانَ مصادفةً أحياناً ولم يُكشَف
      العيب. فالفحصُ على **المُعلَنِ** لا على «شيءٌ ما ظاهر». */
   eq(DK.layout().cur[z],d,`${k}/${z}: الجاريةُ هي المُعلَنة`);
   /* و«بلا شريط» و«تابلت» تُخفيان العمودَ **بقصدٍ** (`auto:1`): غايتُهما
      أكبرُ مساحةِ رسمٍ ممكنة. فالمعيارُ هناك ليس «مرئيّةٌ الآن» بل
      «تُكشَف بنقرةٍ» — وهو شرطُ الإقفالِ نفسُه لا تخفيفٌ له. */
   if(DK.layout().auto[z]){
    ok(!!DK.revealPanel(d),`${k}/${z}: عمودٌ مخفيٌّ بقصدٍ — وتُكشَف بنقرة`);
    eq(visible(d),"",`${k}/${z}: وبعد النقرةِ مرئيّةٌ`);
    continue;
   }
   eq(visible(d),"",`${k}/${z}: ومرئيّةٌ فعلاً`);
  }
 }
});

group("لا لوحةَ بلا موضعٍ ولا موضعَ مزدوج",()=>{
 /* إعادةُ ترتيبٍ قد تُسقِط لوحةً من كلِّ الأعمدةِ أو تُكرّرَها في
    عمودَين. وdockStats يُعلِن الأعمدةَ الأربعةَ فالمجموعُ يُقابَل. */
 const S2=DK.dockStats();
 eq(S2.s.length+S2.e.length+S2.f.length+S2.x.length,
    LY.pIds().length,"كلُّ لوحةٍ في موضعٍ واحدٍ لا أكثرَ ولا أقلّ");
 const all=[...S2.s,...S2.e,...S2.f,...S2.x];
 eq(new Set(all).size,all.length,"ولا معرّفَ مكرّر");
});

process.exit(summary()?1:0);
