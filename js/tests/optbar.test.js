/* ═══ حارسُ شريطِ الخيارات ═══ حرسُ المرحلةِ ٦ (audit/10-ui-plan.md)
   الدّعوى التي يحرسها: أنّ **لا أداةَ تعرض أكثرَ من ثلاثِ وحداتٍ
   ابتداءً**، وأنّ ما خُفِي **لم يُحذَف** بل صار وراءَ «المزيد» ويُنادي
   إن غُيِّرَ عن افتراضه.
   القياسُ قبل العمل: ٣٧٩ حقلاً ظاهراً على ٩٧ أداةً، أقصاها تسعةٌ،
   و٦٠ أداةً فوق الحدّ.
   التشغيل:  node js/tests/optbar.test.js                           */
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {shim,shimDOM,shimCanvas,group,ok,eq,summary} from "./harness.js";
const ROOT=join(fileURLToPath(new URL(".",import.meta.url)),"..","..");
const rd=p=>readFileSync(join(ROOT,p),"utf8");

await shim(); shimCanvas();
const DOC=shimDOM();
{const cv=DOC.createElement("canvas"); cv.setAttribute("id","cv");
 DOC.body.appendChild(cv);}
for(const id of ["optbar","tools"]){
 const e=DOC.createElement("div"); e.setAttribute("id",id);
 DOC.body.appendChild(e);
}
if(!globalThis.window)
 globalThis.window={prompt:()=>null,confirm:()=>true};

for(const f of ["draw","sketch","openings","parts","roof","areas","modify",
 "annotate","ref","boq","boqreport","elev","section","sheet","clouds",
 "groups","macros"])await import(`../tools/${f}.js`);
for(const f of ["hygiene","gate","levelManager","appcmds","viewcmds",
 "blockpanel"])await import(`../ui/${f}.js`);
const R =await import("../tools/registry.js");
const OB=await import("../ui/optbar.js");

const L=R.toolList();
const byId=id=>L.find(d=>d.id===id);
const vis=d=>{
 const o=R.OPT[d.id]||{};
 return (d.opts||[]).filter(f=>!f.when||f.when(o));
};
/* الأداةُ تُنصَّب بكتابةِ تعريفِها في `T.def` لأنّ هذا هو **بعينه** ما
   يقرأه الشريطُ — وبدءُ الأداةِ الكامل يُشغِّل خطواتِها ويطلب نقراتٍ
   لا شأنَ لها بالشريط. */
const use=d=>{R.T.def=d; OB.buildOptbar(); return DOC.querySelector("#optbar")};
/* لا تخزينَ في Node فلا يُنادى `loadOpts`، ومِلءُ الافتراضاتِ يجري هناك.
   فالاختبارُ يملؤها كما يملؤها الإقلاعُ — لا يفترض أنّها مملوءة. */
for(const d of L){
 const o=R.OPT[d.id]=R.OPT[d.id]||{};
 for(const f of (d.opts||[]))if(o[f.k]===undefined)o[f.k]=f.def;
}
const q =s=>DOC.querySelector(s);
const qa=s=>[...DOC.querySelectorAll(s)];

group("الحدُّ مُعلَنٌ ومصدرُه واحد",()=>{
 eq(OB.OPT_VIS,3,"ثلاثةٌ ظاهرةٌ — الرقمُ مُصدَّرٌ لا مبثوثٌ في موضعَين");
 const src=rd("js/ui/optbar.js");
 ok(/export const OPT_VIS=3/.test(src),"الحدُّ ثابتٌ مُصدَّر");
 /* القاعدةُ تُقرأ من ترتيبِ `opts` في الأداةِ نفسِها، فلا جدولَ
    أسماءٍ ثانياً ينجرف عنها. هذا ما يُثبِته غيابُ أيِّ جدولِ أدواتٍ
    في الملفّ. */
 ok(!/const\s+(OPT_HEAD|VISFIELDS|HEADMAP)\s*=/.test(src),
    "لا جدولَ ثانياً يُعلِن ما يظهر لكلِّ أداة");
});

group("لا أداةَ فوقَ الحدّ",()=>{
 const over=[];
 for(const d of L){
  const h=OB.headUnits(d);
  if(h.length>OB.OPT_VIS)over.push(d.id+":"+h.length);
 }
 eq(over.length,0,"صفرُ أداةٍ تعرض أكثرَ من ثلاثِ وحداتٍ"
  +(over.length?" — "+over.slice(0,5).join(" · "):""));
 /* ولا تُقاس الدّعوى على عيّنةٍ: العددُ المقيسُ قبلَ العملِ ٩٧ أداةً
    ذاتَ خيارات، فإن هبط فقد ضاعت أدواتٌ لا أن تحسّن الشريط. */
 const withOpts=L.filter(d=>vis(d).length).length;
 ok(withOpts>=97,`٩٧ أداةً ذاتَ خياراتٍ على الأقلّ (${withOpts})`);
});

group("لا حقلَ يسقط بين الظاهرِ والمخفيّ",()=>{
 /* أخطرُ ما قد يفعله هذا التغييرُ: أن يُخفيَ حقلاً **إلى العدَم**.
    فالمقابلةُ على الترتيبِ والمجموعِ معاً لكلِّ أداةٍ لا لعيّنة. */
 let bad=[], fields=0, hidden=0;
 for(const d of L){
  const v=vis(d).map(f=>f.k);
  if(!v.length) continue;
  const h=OB.headUnits(d).flatMap(u=>u.fields).map(f=>f.k);
  const t=OB.tailUnits(d).flatMap(u=>u.fields).map(f=>f.k);
  fields+=v.length; hidden+=t.length;
  if(h.concat(t).join(",")!==v.join(","))bad.push(d.id);
 }
 eq(bad.length,0,"الظاهرُ ثمّ المخفيُّ = الظاهرُ أصلاً بترتيبه"
  +(bad.length?" — "+bad.slice(0,5).join(" · "):""));
 ok(fields>=379,`٣٧٩ حقلاً على الأقلّ ما زالت قائمةً (${fields})`);
 ok(hidden>0&&hidden<fields,`المخفيُّ ${hidden} من ${fields} — بعضٌ لا كلّ`);
});

group("الوحدةُ المجموعةُ تُعَدُّ واحداً",()=>{
 const gd=byId("griddim");
 ok(gd,"أداةُ أبعادِ المحاور قائمة");
 const u=OB.headUnits(gd);
 eq(u.length,3,"ستّةُ حقولٍ صارت ثلاثَ وحدات");
 eq(u[0].fields.length,4,"الجهاتُ الأربعُ وحدةٌ واحدة");
 eq(u[0].grp,"sides","والمجموعةُ مُعلَنةٌ في الأداةِ باسمها");
 eq(u[0].label,"الجهات","ولها تسميةٌ تُقرأ لا اسمُ مفتاح");
 eq(OB.tailUnits(gd).flatMap(x=>x.fields).length,0,
    "فلا جهةٌ منسيّةٌ وراءَ «المزيد»");
 /* والحقلُ بلا `grp` يبقى وحدةً بنفسِه — فالأدواتُ القديمةُ لم تتغيّر. */
 const w=byId("wall");
 ok(OB.headUnits(w).every(x=>x.fields.length===1),
    "أداةٌ بلا مجموعاتٍ: كلُّ وحدةٍ حقلٌ واحد");
});

group("ترتيبُ الحقولِ قُرِئ لا خُمِّن",()=>{
 /* ثلاثُ أدواتٍ رُتِّبت بسببٍ مكتوبٍ — وهذا يحرس السببَ لا الشكل. */
 const hd=d=>OB.headUnits(byId(d)).flatMap(u=>u.fields).map(f=>f.k).join(",");
 eq(hd("door"),"w,h,kind",
    "البابُ: نوعُه ظاهرٌ وجلستُه مخفيّةٌ — جلسةُ البابِ صفرٌ بتعريفه");
 eq(hd("niche"),"w,h,dep","الكوّةُ: عمقُها هو ما يُميِّزها فلا يُخفى");
 eq(hd("wc"),"snap,rot,mir",
    "الأدواتُ الرمزيةُ: الوضعُ ظاهرٌ والمقاسُ القياسيُّ مخفيّ");
 eq(hd("win"),"w,h,sill","والشباكُ: جلستُه تُقرأ فتبقى ظاهرةً");
 /* وعائلةُ `mkFix` تُنشئ ٣٦ أداةً من تعريفٍ واحدٍ: فترتيبُها موضعٌ
    واحدٌ يُصلِح ٣٦ شريطاً — والحارسُ يقيس العائلةَ كلَّها لا فرداً. */
 const fam=L.filter(d=>{
  const k=(d.opts||[]).map(f=>f.k).join(",");
  return k==="snap,rot,mir,w,d";
 });
 ok(fam.length>=36,`عائلةُ الرموزِ ${fam.length} أداةً`);
 for(const d of fam)
  eq(OB.headUnits(d).flatMap(u=>u.fields).map(f=>f.k).join(","),
     "snap,rot,mir",`${d.id}: الوضعُ ظاهرٌ`);
});

group("«المزيد» يُبنى ويَصِل",()=>{
 const box=use(byId("door"));
 ok(/okMore/.test(box.innerHTML),"زرُّ المزيدِ موجودٌ لأداةٍ ذاتِ بقيّة");
 const b=q("#okMore");
 eq(b.getAttribute("aria-expanded"),"false","مُغلَقٌ ابتداءً");
 eq(b.getAttribute("aria-controls"),"okPop","ومربوطٌ بما يفتحه");
 ok(/aria-label=/.test(box.innerHTML),"وله تسميةٌ لقارئِ الشاشة");
 const pop=q("#okPop");
 ok(pop,"المُنسدلُ مبنيٌّ في DOM");
 ok(pop.hasAttribute("hidden"),"ومخفيٌّ عن قارئِ الشاشةِ لا بالتنسيقِ وحده");
 /* ولكلِّ حقلٍ مخفيٍّ ضابطٌ حقيقيٌّ داخلَه: زرٌّ يفتح فراغاً أسوأُ من
    شريطٍ طويل. */
 const tail=OB.tailUnits(byId("door")).flatMap(u=>u.fields);
 const ctl=new Set([...pop.querySelectorAll("[data-ok]")]
  .map(e=>e.getAttribute("data-ok"))
  .concat([...pop.querySelectorAll("[data-seg]")]
   .map(e=>e.getAttribute("data-seg"))));
 for(const f of tail)ok(ctl.has(f.k),`الحقلُ ${f.k} له ضابطٌ في المُنسدل`);
 /* وكلُّ حقلٍ ظاهرٍ له ضابطٌ **خارجَ** المُنسدلِ لا داخلَه */
 const headKeys=OB.headUnits(byId("door")).flatMap(u=>u.fields).map(f=>f.k);
 for(const k of headKeys)
  ok(!ctl.has(k),`الحقلُ الظاهرُ ${k} ليس في المُنسدل`);
});

group("لا زرَّ لأداةٍ لا بقيّةَ لها",()=>{
 /* زرٌّ يفتح فراغاً يُعلِّم أنّ أزرارَ هذا الشريطِ لا تُقرأ. */
 const small=L.find(d=>vis(d).length&&OB.tailUnits(d).length===0);
 ok(small,"توجد أداةٌ بثلاثةٍ أو أقلّ");
 const box=use(small);
 ok(!/okMore/.test(box.innerHTML),`${small.id}: لا زرَّ مزيدٍ`);
 ok(!q("#okPop"),"ولا مُنسدلَ فارغاً في DOM");
});

group("الافتراضُ صامتٌ والمُغيَّرُ يُنادي",()=>{
 const d=byId("door");
 const tail=OB.tailUnits(d).flatMap(u=>u.fields);
 const f=tail.find(x=>x.type==="len"||x.type==="text")||tail[0];
 /* القيمةُ تُعاد في النهايةِ فلا يُلوَّث حالُ بقيّةِ المجموعات. */
 const old=R.OPT[d.id][f.k];
 R.OPT[d.id][f.k]=f.def;
 eq(OB.tailChanged(d),0,"كلُّ المخفيِّ على افتراضه ⇒ لا علامة");
 let box=use(d);
 ok(!/class="chg"/.test(box.innerHTML),"ولا صنفَ تغييرٍ على الزرّ");
 R.OPT[d.id][f.k]="9.5";
 ok(OB.tailChanged(d)>=1,"غُيِّرَ مخفيٌّ ⇒ العلامةُ تُحسَب");
 box=use(d);
 ok(/class="chg"/.test(box.innerHTML),"والزرُّ يحمل صنفَ التغيير");
 ok(/خيارٌ مُغيَّرٌ عن افتراضه/.test(box.innerHTML),
    "ومعه نصٌّ لقارئِ الشاشة — النقطةُ وحدَها لا تُقرَأ");
 /* والعدَدُ يُقال دائماً: المستخدمُ يعرف كم خلفَ الزرِّ قبلَ أن يفتحه */
 ok(new RegExp(`class="n">${tail.length}<`).test(box.innerHTML),
    `العدَدُ ${tail.length} مكتوبٌ على الزرّ`);
 R.OPT[d.id][f.k]=old;
});

group("المزامنةُ تُحدِّث العلامةَ بلا بناء",()=>{
 /* `syncOptbar` تُنادى مع كلِّ حركةِ مؤشّرٍ — فلو بنَت لسرقت التركيزَ
    وأغلقت المُنسدلَ في وجهِ من يكتب فيه (العقدُ نفسُه في ترويسةِ
    الملفّ). فالعلامةُ تتبدَّل بصنفٍ ونصٍّ لا بـinnerHTML. */
 const d=byId("door");
 const f=OB.tailUnits(d).flatMap(u=>u.fields)[0];
 const old=R.OPT[d.id][f.k];
 R.OPT[d.id][f.k]=f.def;
 use(d);
 const b=q("#okMore");
 ok(!b.classList.contains("chg"),"ابتداءً بلا علامة");
 R.OPT[d.id][f.k]="7.25";
 OB.syncOptbar();
 ok(q("#okMore")===b,"الزرُّ هو هو — لم يُهدَم الشريط");
 ok(b.classList.contains("chg"),"والعلامةُ ظهرت في المزامنة");
 R.OPT[d.id][f.k]=f.def;
 OB.syncOptbar();
 ok(!b.classList.contains("chg"),"وتزول إذا عاد إلى افتراضه");
 R.OPT[d.id][f.k]=old;
});

group("الفتحُ والإغلاقُ والوصولُ بلوحةِ المفاتيح",()=>{
 const src=rd("js/ui/optbar.js");
 /* الفتحُ تبديلُ سمةٍ لا إعادةُ بناء */
 ok(/function toggleMore/.test(src),"للفتحِ دالّةٌ واحدةٌ");
 ok(/aria-expanded",String\(moreOpen\)/.test(src),"والسمةُ تتبع الحال");
 /* نقرةٌ خارجَه تُغلِقه: المُنسدلُ فوقَ الرسمِ والنقرةُ على اللوحةِ
    قصدُها الرسم. ومستمعٌ واحدٌ على المستندِ لا يُعاد ربطُه مع كلِّ
    بناءٍ (P2-001). */
 ok(/document\.addEventListener\("pointerdown"/.test(src),
    "نقرةٌ خارجَه تُغلِقه");
 eq((src.match(/document\.addEventListener\("pointerdown"/g)||[]).length,1,
    "ومستمعٌ واحدٌ لا يتكرّر مع كلِّ بناء");
 /* والهروبُ من داخلِه يُعيد التركيزَ إلى زرِّه لا إلى الفراغ */
 ok(/toggleMore\(false\);[\s\S]{0,120}okMore"\);[\s\S]{0,40}\.focus\(\)/
    .test(src),"الهروبُ يُعيد التركيزَ إلى الزرّ");
 /* والفتحُ محفوظٌ عبرَ البناءِ: حقلٌ شرطيٌّ يظهر فلا يُغلَق في وجهِك */
 ok(/let moreOpen=false/.test(src)&&/moreOpen\?" on":""/.test(src),
    "حالُ الفتحِ تَعبُر إعادةَ البناء");
});

group("التنسيقُ والمسُّ",()=>{
 const t=rd("css/tools.css"), tc=rd("css/touch.css");
 ok(/#okMore\{/.test(t),"للزرِّ تنسيقٌ");
 ok(/\.okPop\{/.test(t),"وللمُنسدلِ تنسيقٌ");
 ok(/#okMore\.chg \.dot\{/.test(t),"والنقطةُ لا تُرى إلّا بصنفِ التغيير");
 ok(/#okMore \.dot\{display:none\}/.test(t),"فهي مكتومةٌ ابتداءً");
 /* P5-001: هدفُ لمسٍ ٤٤ بكسلاً على اللمس */
 ok(/#okMore\{min-height:44px/.test(tc),"وهو هدفُ لمسٍ ٤٤ بكسلاً");
 /* والمرحلةُ ٣ تحرس أن لا مسافةَ مبثوثةٌ — فالجديدُ يستعمل السلّمَ */
 const blk=/#okMore\{[^}]*\}/.exec(t)[0]+(/\.okPop\{[^}]*\}/.exec(t)[0]);
 /* والقاعدةُ على المسافاتِ وأنصافِ الأقطارِ لا على حجمِ الخطّ: للخطِّ
    سلّمُه الخاصُّ (`--fs-*`) وهو خارجُ نطاقِ المرحلةِ ٣. */
 const sp=blk.replace(/var\([^)]*\)|calc\([^)]*\)/g,"")
  .split(";").filter(s=>/^\s*(padding|margin|gap|inset|border-radius|block-size|inline-size)/.test(s));
 ok(!sp.some(s=>/\d+px/.test(s)),
    "ولا مسافةَ ولا نصفَ قطرٍ مبثوثاً في تنسيقِه");
});

process.exit(summary()?1:0);
