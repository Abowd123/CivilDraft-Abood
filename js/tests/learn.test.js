/* ═══ الواجهة التعليمية — المرحلة ١ ═══
   ١ الدروس: كلُّ خطوةٍ قصيرةٌ ولها expect، والمساعدات الهندسية صادقة
   ٢ المحرّك: التقدّم والخطأ وسلّم المساعدة والنجوم — بوقتٍ مُمرَّر
   ٣ الدرس الأول يكتمل بأفعال «سوّها عني» وحدها عبر الأدوات الحقيقية
   ٤ الصندوق: الحالة والسجلّ والخيارات والحفظ تعود كما كانت
   ٦ المرحلة ٢: تهيئةُ الدروس، ودروسُ المحطّتين كلُّها تكتمل، والفتحُ بالنجوم
   ٥ البنية: الزرّ في الوصول السريع والترحيب، ولا style="" (CSP)
   التشغيل:  node js/tests/learn.test.js                              */
import {shim,shimCanvas,shimDOM,group,ok,eq,summary} from "./harness.js";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const src=p=>readFileSync(ROOT+p,"utf8");
const St=await import("../core/state.js");
const R=await import("../tools/registry.js");
const EN=await import("../core/ents.js");
await import("../tools/draw.js"); await import("../tools/openings.js"); await import("../tools/areas.js");
const LS=await import("../learn/lessons.js");
const RN=await import("../learn/runner.js");
const SB=await import("../learn/sandbox.js");
const AC=await import("../learn/acts.js");
const CD=await import("../learn/cards.js");
const CT=await import("../learn/cert.js");
await import("../tools/modify.js");
await import("../tools/annotate.js");
await import("../tools/parts.js");
await import("../tools/roof.js"); await import("../tools/section.js");
for(const m of ["sheet","boq","blocks","clouds","groups","macros","elev","ref","sketch","presets","cleanup","dedup","blockops","boqreport","levelmgr"])await import(`../tools/${m}.js`);
R.H.hit=(x,y,k)=>EN.hitTest(x,y,250,k);
let SEL=[]; R.H.sel=()=>SEL; R.H.setSel=l=>{SEL=l||[]};
R.H.rep=()=>{};
R.toolList().forEach(d=>(d.opts||[]).forEach(f=>{if(f.def!==undefined)R.OPT[d.id]=Object.assign(R.OPT[d.id]||{},{[f.k]:f.def})}));

group("الدروس: بياناتٌ قصيرةٌ قابلةٌ للفحص",()=>{
 eq(LS.LEVELS.length,7,"سبعُ محطّات");
 const L=LS.lessonOf("first_room");
 ok(!!L&&LS.LESSONS.first_room===L,"«أوّل غرفة» موجود");
 eq(LS.lessonOf("nope"),null,"والمجهولُ null");
 ok(L.steps.every(s=>typeof s.expect==="function"&&Array.isArray(s.auto)),"كلُّ خطوةٍ لها expect وauto");
 ok(L.steps.every(s=>s.say.trim().split(/\s+/).length<=6),"ولا جملةَ فوق ست كلمات");
 ok(LS.levelOpen(1,{})&&!LS.levelOpen(2,{})&&!LS.levelOpen(9,{}),"الأولى مفتوحة والباقي مقفل");
 ok(LS.TOL>=150&&LS.TOL<=300,"سماحُ النقرة معقول");
});
group("المساعداتُ الهندسية",()=>{
 const S={walls:[{a:[0,0],b:[4000,0]}],opens:[{kind:"door"}],areas:[{ring:[[0,0],[4000,0],[4000,3000],[0,3000]]}]};
 ok(LS.hasWall(S,[4000,0],[0,0])&&LS.hasWall(S,[100,-100],[3900,120]),"الجدار بأيّ اتّجاهٍ وضمن السماح");
 ok(!LS.hasWall(S,[0,0],[0,3000]),"وغيرُه لا");
 ok(LS.hasOpen(S,"door")&&!LS.hasOpen(S,"window"),"نوعُ الفتحة");
 ok(LS.inRing(S.areas[0].ring,[2000,1500])&&!LS.inRing(S.areas[0].ring,[5000,1500]),"النقطة داخل الحلقة وخارجها");
 ok(LS.hasAreaAt(S,[100,100])&&!LS.hasAreaAt({areas:[]},[1,1]),"منطقةٌ عند نقطة");
});
group("المحرّك: تقدّمٌ وخطأٌ وسلّمٌ ونجوم",()=>{
 const les={steps:[
  {say:"أ",expect:st=>st.S.walls.length>=1},
  {say:"ب",expect:st=>st.S.walls.length>=2&&st.ok2}]};
 const r=RN.createRunner(les,0);
 const st=(w,ok2)=>({S:{walls:Array(w).fill({})},ok2});
 eq(RN.sigOf({walls:[1],opens:[1,2]}),3,"البصمةُ عددُ العناصر");
 eq(r.tick(st(0),0),null,"لا شيء بعد");
 eq(r.tick(st(0),RN.IDLE1+1),"hint","الخمولُ يرفع السلّم");
 eq(r.level,1,"إلى ١");
 eq(r.tick(st(1),RN.IDLE1+2),"next","الإتمامُ يتقدّم");
 eq(r.level,0,"والسلّمُ يعود صفراً");
 eq(r.tick(st(2,false),100000),"miss","عنصرٌ جديدٌ بلا إتمامٍ خطأ");
 eq(r.tick(st(3,false),100001),"miss","وخطآن…");
 eq(r.level,2,"…يفتحان «سوّها عني»");
 eq(r.tick(st(2,false),100002),null,"والتراجعُ لا يُعدّ خطأ");
 r.autoUsed();
 eq(r.tick(st(3,true),100003),"next","ثم الإتمام");
 ok(r.done&&r.step()===null,"انتهى الدرس");
 eq(r.stars(),2,"خطآن ومساعدةٌ = نجمتان");
 eq(r.secs(),100,"والزمنُ بالثواني");
 const p=RN.createRunner(les,0); p.tick(st(2,true),5);
 ok(p.done&&p.stars()===3,"خطوتان بفعلٍ واحد تُحسبان، وبلا خطأ ثلاثُ نجوم");
});
group("الدرسُ الأول يكتمل بالأدوات الحقيقية",()=>{
 const L=LS.lessonOf("first_room");
 St.loadState(St.DEF(),true);
 const r=RN.createRunner(L,0);
 const probe=()=>({S:St.S,tool:R.T.id||null,pts:(R.T.ctx&&R.T.ctx.pts)||[],active:R.active()});
 let guard=0;
 while(!r.done&&guard++<40){
  r.step().auto.forEach(a=>{
   if(a.tool){if(R.active())R.cancel(true); R.begin(a.tool)}
   else if(a.at)R.feedPoint(a.at.slice(),a.at.slice());
   else if(a.type!=null)R.feedText(a.type);
   else if(a.esc)R.cancel(true);
  });
  r.autoUsed();
  r.tick(probe(),guard*1000);
 }
 ok(r.done,`اكتمل في ${guard} دورة`);
 eq(St.S.walls.length,4,"أربعةُ جدران");
 ok(LS.hasOpen(St.S,"door")&&LS.hasOpen(St.S,"window"),"بابٌ وشباك");
 ok(LS.hasAreaAt(St.S,[2000,1500]),"ومنطقةٌ داخل الغرفة");
 eq(r.stars(),1,"ومن سوّاها عنه كلَّها نجمةٌ واحدة");
});
group("الصندوق: مشروعُ المستخدم لا يُمسّ",()=>{
 St.loadState(St.DEF(),true);
 R.OPT.wall.t="0.3";
 St.edit(()=>{R.begin("wall");R.feedPoint([0,0],[0,0]);R.feedPoint([9000,0],[9000,0]);R.cancel(true)},"قبل");
 const before=St.snapshot();
 let view={k:1,cx:5,cy:5}, snapped=0;
 const hooks={view:{get:()=>({...view}),set:v=>{view=v}},snap:()=>{snapped++; return Promise.resolve()},sel:()=>{}};
 ok(!SB.inSandbox(),"خارج الصندوق");
 ok(SB.enterSandbox({id:"t"},hooks),"دخول");
 ok(!SB.enterSandbox({id:"t"},hooks),"ولا دخولَ مرّتين");
 ok(SB.inSandbox()&&St.saveHeld()&&St.historyParked(),"الحفظُ معلَّقٌ والسجلّ مركون");
 eq(St.S.walls.length,0,"اللوحةُ نظيفة");
 ok(!St.canUndo(),"والتراجعُ لا يصل للمشروع");
 eq(R.OPT.wall.t,"0.15","والخياراتُ افتراضية");
 eq(snapped,1,"ولقطةٌ احتياطية");
 view={k:9,cx:0,cy:0};
 St.edit(()=>{R.begin("wall");R.feedPoint([0,0],[0,0]);R.feedPoint([1000,0],[1000,0]);R.cancel(true)},"درس");
 ok(SB.exitSandbox(),"خروج");
 ok(!SB.exitSandbox(),"والخروجُ الثاني لا يفعل شيئاً");
 eq(St.snapshot(),before,"الحالةُ كما كانت حرفاً");
 ok(!St.saveHeld()&&!St.historyParked(),"الحفظُ مُطلَقٌ والسجلّ عاد");
 eq(R.OPT.wall.t,"0.3","وخيارُ المستخدم عاد");
 eq(view.k,1,"والعرضُ عاد");
 ok(St.undo()&&St.S.walls.length===0,"وتراجعُه يعمل على مشروعه");
});
group("تعليقُ الحفظ وركنُ السجلّ مباشرةً",()=>{
 eq(St.saveHold(1),1,"تعليق"); ok(St.saveHeld(),"معلَّق");
 eq(St.saveNow().via,"held","saveNow لا يكتب وهو معلَّق");
 St.saveHold(0); ok(!St.saveHeld(),"وإطلاق");
 St.clearHistory(); St.pushHistory(St.snapshot(),"س");
 ok(St.historyPark()&&!St.historyPark(),"ركنٌ مرّةً واحدة");
 ok(!St.canUndo(),"والسجلُّ فارغٌ وهو مركون");
 ok(St.historyUnpark()&&St.canUndo()&&!St.historyUnpark(),"ويعود مرّةً واحدة");
});
group("البنية: المدخلُ والأمان",()=>{
 const sch=src("js/ui/ribbon/schema.js"), q=sch.slice(sch.indexOf("export const QAT"));
 ok(/act:"learn"/.test(q.slice(0,q.indexOf("];"))),"الزرُّ في شريط الوصول السريع");
 ok(/learn:\{id:"learn"/.test(src("js/ui/actions.js")),"وفعلُه في ACTIONS");
 ok(/\blearn:'/.test(src("js/ui/icons.js")),"وأيقونتُه");
 ok(/a:"learn"/.test(src("js/ui/welcome-model.js"))&&/openLearn/.test(src("js/app.js")),"والترحيبُ يفتحه");
 ok(/css\/learn\.css/.test(src("index.html")),"والأنماطُ مربوطة");
 const ui=src("js/ui/learn.js");
 ok(!/style="/.test(ui),"لا style=\"\" في القوالب (CSP)");
 ok(/from "\.\.\/core\/escape\.js"/.test(ui)&&!/function esc\(/.test(ui),"والهروبُ من core/escape.js");
 ok(/--z-learn:/.test(src("css/theme.css"))&&/--z-learnmap:/.test(src("css/theme.css")),"وطبقتاه رمزان في theme.css");
});
/* واجهةٌ مزيَّفة للمرحلة ٦: النوافذُ أعلامٌ يفتحها ويغلقها خطّافُ المنفّذ */
const UI={lvlMgr:false,v3d:false,v3dMoved:false}, UICALLS=[], FAKELOG=[];
const MSG={xPdf:"PDF متّجه · PLAN-A-101.pdf",xDxf:"DXF R2000 · PLAN-A-101.dxf",inspect:"الفاحص: لا ملاحظات"};
AC.setUiRunner(a=>{UICALLS.push(a);
 if(MSG[a.act])FAKELOG.push(MSG[a.act]);
 if(a.act==="levelMgrDlg")UI.lvlMgr=true;
 if(a.act==="view3dDlg")UI.v3d=true;
 if(a.click&&/data-rpt/.test(a.click))UI.lvlMgr=false;
 if(a.click&&/v3 canvas/.test(a.click))UI.v3dMoved=true;
 if(a.click&&/data-v3/.test(a.click))UI.v3d=false;
 return true});
const probe=()=>({S:St.S,tool:R.T.id||null,pts:(R.T.ctx&&R.T.ctx.pts)||[],active:R.active(),stepIdx:R.T.i|0,last:R.T.last||null,sel:R.H.sel(),opt:R.OPT,ui:{...UI},log:SB.sandboxLog().concat(FAKELOG)});
function play(les){
 ok(SB.enterSandbox(les,{sel:l=>{SEL=l}}),`${les.id}: دخول`);
 ok(SB.setupOk(),`${les.id}: التهيئةُ بُنيت بلا خطأ`);
 const r=RN.createRunner(les,0);
 r.tick(probe(),0);
 ok(r.i===0,`${les.id}: لا خطوةَ تتمّ وحدها من الرسم الجاهز`);
 let n=0;
 while(!r.done&&n++<40){AC.runActs(r.step().auto); r.autoUsed(); r.tick(probe(),n*1000)}
 ok(r.done,`${les.id}: اكتمل بـ«شاهدني» عبر الأدوات الحقيقية (${n} خطوة)`);
 return r;
}
group("المرحلة ٢: منفّذُ الأفعال",()=>{
 St.loadState(St.DEF(),true);
 ok(AC.runActs([{tool:"wall"},{at:[0,0]},{at:[2000,0]},{esc:1}]),"أداةٌ ونقرتان وEsc");
 eq(St.S.walls.length,1,"جدارٌ واحد");
 ok(AC.runAct({pick:{k:"wall",at:[1000,0]}})&&SEL.length===1&&SEL[0].k==="wall","pick يحدّد ما تحت النقطة");
 ok(!AC.runAct({pick:{k:"wall",at:[9e5,9e5]}})&&SEL.length===0,"وفي الفراغ لا تحديد");
 ok(!AC.runAct({bogus:1})&&!AC.runAct(null),"والمجهولُ يُرفض");
 eq(AC.actPoint({at:[1,2]}).join(),"1,2","موضعُ النقرة");
 eq(AC.actPoint({pick:{k:"wall",at:[3,4]}}).join(),"3,4","وموضعُ التحديد");
 eq(AC.actPoint({tool:"wall"}),null,"والأداةُ بلا موضع");
});
group("المرحلة ٢: الخريطة والترتيب",()=>{
 eq(LS.LEVELS[0].lessons.slice(0,2).concat(LS.LEVELS[1].lessons.slice(0,2)).join(),"first_room,two_rooms,offset_corridor,copy_partition","دروسُ المحطّتين الأوليين بترتيب الخريطة");
 eq(LS.nextLesson("first_room"),"two_rooms","التالي");
 eq(LS.nextLesson(LS.ORDER[LS.ORDER.length-1]),null,"ولا تالي بعد الأخير");
 eq(LS.nextLesson("mirror_partition"),"door_double","والتالي يعبر إلى المحطّة الثالثة");
 eq(LS.levelOfLesson("copy_partition"),2,"محطّةُ الدرس");
 eq(LS.levelOfLesson("x"),0,"والمجهولُ صفر");
 ok(!LS.levelOpen(2,{first_room:{stars:3}}),"المحطّة ٢ لا تُفتح بدرسٍ واحد من الأولى");
 ok(LS.levelOpen(2,{first_room:{stars:1},two_rooms:{stars:2}}),"وتُفتح بنجمةٍ في كلّ دروسها");
 const P7=Object.fromEntries(LS.ORDER.map(id=>[id,{stars:1}]));
 ok(LS.levelOpen(4,P7),"الرابعةُ تُفتح");
 ok(Object.values(LS.LESSONS).every(l=>l.steps.every(s=>s.say.trim().split(/\s+/).length<=6)),"كلُّ جملةٍ ست كلمات على الأكثر");
 const S={walls:[{id:"W1",a:[0,0],b:[0,4000]}]};
 ok(LS.selWall({S,sel:[{k:"wall",id:"W1"}]},[0,4000],[0,0]),"selWall: المحدَّدُ هو الجدار");
 ok(!LS.selWall({S,sel:[]},[0,0],[0,4000])&&!LS.selWall({S,sel:[{k:"open",id:"W1"}]},[0,0],[0,4000]),"وغيرُه لا");
});
group("المرحلة ٢: كلُّ الدروس تكتمل والمشروعُ يعود",()=>{
 St.loadState(St.DEF(),true);
 St.edit(()=>{AC.runActs([{tool:"wall"},{at:[0,0]},{at:[7777,0]},{esc:1}])},"مشروعي");
 const mine=St.snapshot();
 Object.values(LS.LESSONS).forEach(les=>{
  const r=play(les);
  if(les.id==="two_rooms"){eq(St.S.walls.length,5,"غرفتان: خمسةُ جدران"); eq(St.S.areas.length,2,"ومساحتان")}
  if(les.id==="offset_corridor")eq(St.S.walls.length,2,"الممرّ: جداران");
  if(les.id==="copy_partition")eq(St.S.walls.length,6,"النسخ: ستّةُ جدران");
  if(les.id==="door_double")ok(LS.countOpen(St.S,"double")===1,"بابٌ مزدوجٌ واحد");
  if(les.id==="window_wide")ok(St.S.opens.some(o=>o.kind==="window"&&o.w===2000),"شباكٌ بعرض ٢ م");
  if(les.id==="typed_opening")ok(St.S.opens.some(o=>o.kind==="opening"&&o.s===1500&&o.wall==="W2"),"فتحةٌ على W2 عند ١٫٥ م");
  if(les.id==="arch_niche")ok(LS.countOpen(St.S,"arch")===1&&LS.countOpen(St.S,"niche")===1,"مقنطرةٌ وكوّة");
  if(les.id==="named_areas")ok(LS.areaNamed(St.S,[1500,2000],"صالة")&&LS.areaNamed(St.S,[4500,2000],"نوم"),"صالةٌ ونوم");
  if(les.id==="hatch_room")ok(LS.areaFilled(St.S,[3000,2000],"hatch"),"الأرضيةُ مهشَّرة");
  if(les.id==="dim_h")ok(LS.hasDim(St.S,"h",[0,0],[6000,0]),"بُعدٌ أفقيّ ٦ م");
  if(les.id==="dim_v")ok(LS.hasDim(St.S,"v",[6000,0],[6000,4000]),"بُعدٌ رأسيّ ٤ م");
  if(les.id==="room_dims")ok(St.S.dims.length>=2&&LS.annoOf(St.S,"text").length===1,"بُعدان وملصقُ المساحة");
  if(les.id==="text_title")eq(LS.annoOf(St.S,"text","مخطط الدور الأرضي").length,1,"العنوان");
  if(les.id==="leader_note")ok(LS.annoOf(St.S,"lead","جدار خارجي").length===1&&LS.annoOf(St.S,"lead")[0].pts.length===2,"قائدٌ بنقطتين وملاحظة");
  if(les.id==="level_mark")ok(St.S.anno.some(t=>t.kind==="level"&&t.z===150),"منسوب +0.150");
  if(les.id==="annot_challenge")ok(St.S.dims.length===2&&LS.annoOf(St.S,"text").length===1,"التحدّي: بُعدان وعنوان");
  if(les.id==="axes_grid")ok(LS.hasAxes(St.S,[0,6000],[0,4000]),"محوران رأسيّان وأفقيّان");
  if(les.id==="grid_cols")eq(St.S.cols.length,4,"أربعةُ أعمدة على التقاطعات");
  if(les.id==="col_single")ok(St.S.cols.length===1&&St.S.cols[0].w===400,"عمودٌ ٠٫٤ م");
  if(les.id==="beam_span")ok(LS.hasBeam(St.S,[0,0],[6000,0])&&LS.structOf(St.S,"beam").length===1,"كمرةٌ واحدة بين العمودين");
  if(les.id==="footings")eq(LS.structOf(St.S,"footing").length,2,"قاعدتان");
  if(les.id==="stair_run")ok(St.S.stairs.length===1&&St.S.stairs[0].flights[0].n===16,"درجٌ بـ١٦ قائمة");
  if(les.id==="struct_challenge")ok(St.S.cols.length===4&&LS.structOf(St.S,"beam").length===2,"التحدّي: أربعةُ أعمدة وكمرتان");
  if(les.id==="add_floor")eq(St.S.levelDefs.length,2,"طابقان");
  if(les.id==="upper_floor")ok(LS.hasWallOn(St.S,[0,0],[6000,0],1)&&St.S.meta.level===0,"جدارٌ على الطابق ١ والعودةُ للأرضي");
  if(les.id==="roof_flat")ok(LS.roofOn(St.S,0,"flat"),"سقفٌ مسطّح");
  if(les.id==="roof_hip")ok(LS.roofOn(St.S,0,"hip"),"سقفٌ هرمي");
  if(les.id==="section_cut")ok(SB.sandboxLog().some(m=>/مقطع/.test(m)),"المقطعُ بُني (رسالتُه في السجلّ)");
  if(les.id==="view_3d")ok(!UI.v3d&&UI.v3dMoved,"المجسّمُ فُتح ودُوّر وأُغلق");
  if(les.id==="floors_challenge")ok(LS.roofOn(St.S,1)&&St.S.walls.some(w=>w.level===1),"التحدّي: جدارٌ وسقفٌ على الطابق ١");
  if(les.id==="rect_room")eq(St.S.walls.length,4,"المستطيل: أربعةُ جدران");
  if(les.id==="arc_planter")ok(St.S.walls.some(w=>Math.abs(w.bulge||0)>0.1),"جدارٌ قوسي");
  if(les.id==="move_partition")ok(LS.hasWall(St.S,[4000,0],[4000,4000])&&St.S.walls.length===5,"القاطعُ انتقل ولم يُنسخ");
  if(les.id==="mirror_partition")eq(St.S.walls.length,6,"المرآة: القاطعُ وصورتُه");
  if(les.id==="out_sheet")eq(St.S.sheets.length,1,"ورقة");
  if(les.id==="out_boq")ok(SB.sandboxLog().some(m=>/الإجمالي/.test(m)),"الحصرُ مسعَّر");
  if(les.id==="villa_final"){eq(St.S.walls.length,11,"الفيلا: ١١ جداراً"); eq(St.S.opens.length,16,"و١٦ فتحة"); eq(St.S.areas.length,7,"و٧ مناطق"); eq(St.S.fixt.length,43,"و٤٣ قطعة"); eq(St.S.levelDefs.length,2,"وطابقان"); eq(St.S.sheets.length,1,"وورقة")}
  if(les.id==="open_challenge")ok(LS.countOpen(St.S,"door")>=2&&LS.countOpen(St.S,"window")>=2,"التحدّي: بابان وشباكان");
  ok(r.stars()>=1,`${les.id}: نجمة`);
  ok(SB.exitSandbox(),`${les.id}: خروج`);
  eq(St.snapshot(),mine,`${les.id}: مشروعي كما هو`);
 });
 ok(!SB.setupOk(),"وخارج الصندوق لا تهيئة");
});
group("المرحلة ٣: الخيارات والتحدّي وخطوة grow",()=>{
 eq(LS.LEVELS[2].lessons.length,7,"المحطّة ٣: سبعةُ دروس");
 ok(LS.ORDER.length>=11,"وأحدَ عشرَ درساً على الأقلّ في الخريطة");
 const P2={first_room:{stars:1},two_rooms:{stars:1},offset_corridor:{stars:1}};
 ok(!LS.levelOpen(3,P2)&&LS.levelOpen(3,{...P2,copy_partition:{stars:1}}),"الثالثةُ تُفتح بنجوم الثانية كلِّها");
 ok(LS.optIs({opt:{door:{kind:"double"}}},"door","kind","double")&&!LS.optIs({opt:{}},"door","kind","double")&&!LS.optIs({},"door","kind","x"),"optIs");
 const S={walls:[{id:"W1",a:[0,0],b:[6000,0]}],opens:[{kind:"arch",wall:"W1"}],areas:[{ring:[[0,0],[10,0],[10,10],[0,10]],name:"ص",fill:"hatch"}]};
 ok(LS.openOn(S,"arch",[6000,0],[0,0])&&!LS.openOn(S,"niche",[0,0],[6000,0]),"openOn");
 ok(LS.areaNamed(S,[5,5],"ص")&&LS.areaNamed({areas:[{...S.areas[0],name:"ص 2"}]},[5,5],"ص")&&!LS.areaNamed({areas:[{...S.areas[0],name:"صx"}]},[5,5],"ص")&&!LS.areaNamed(S,[50,50],"ص")&&LS.areaFilled(S,[5,5],"hatch"),"areaNamed وareaFilled");
 St.loadState(St.DEF(),true);
 ok(AC.runAct({opt:["win","w","1.8"]})&&R.OPT.win.w==="1.8","فعلُ opt يضبط الخيار");
 const g={steps:[{say:"س",grow:1,expect:st=>st.S.walls.length>=2}]};
 const r=RN.createRunner(g,0), st=n=>({S:{walls:Array(n).fill({})}});
 r.tick(st(0),0); eq(r.tick(st(1),1),null,"grow: العنصرُ الأوّل ليس خطأ"); eq(r.mistakes,0,"صفرُ أخطاء");
 eq(r.tick(st(2),2),"next","والثاني يُتمّها");
 const c=RN.createRunner({challenge:1,steps:[{say:"س",expect:()=>false}]},0);
 c.tick(st(0),0); eq(c.tick(st(0),RN.IDLE1+1),null,"التحدّي لا يساعد عند المهلة العادية");
 eq(c.tick(st(0),RN.IDLE1*2+1),"hint","بل بعد ضِعفها");
 ok(LS.LESSONS.open_challenge.challenge===1,"وآخرُ المحطّة تحدٍّ");
});
group("المرحلة ٤: الأبعاد والتأشير",()=>{
 eq(LS.LEVELS[3].lessons.length,7,"المحطّة ٤: سبعةُ دروس");
 ok(LS.ORDER.length>=18,"وثمانيةَ عشرَ درساً على الأقلّ في الخريطة");
 ok(LS.LESSONS[LS.LEVELS[3].lessons[6]].challenge===1,"وآخرُها تحدٍّ");
 const P3=Object.fromEntries(LS.LEVELS.slice(0,3).flatMap(L=>L.lessons).filter(id=>id!=="open_challenge").map(id=>[id,{stars:1}]));
 ok(!LS.levelOpen(4,P3)&&LS.levelOpen(4,{...P3,open_challenge:{stars:1}}),"الرابعةُ تُفتح بإكمال الثالثة وتحدّيها");
 ok(LS.levelOpen(5,Object.fromEntries(LS.ORDER.map(id=>[id,{stars:3}]))),"والخامسةُ تُفتح بإكمال ما قبلها");
 const S={dims:[{kind:"v",a:[0,0],b:[0,4000]}],anno:[{kind:"text",s:"أ"},{kind:"lead",s:"ب"}]};
 ok(LS.hasDim(S,"v",[0,4000],[0,0])&&LS.hasDim(S,null,[0,0],[0,4000])&&!LS.hasDim(S,"h",[0,0],[0,4000]),"hasDim بالنوع وبلا نوع وبأيّ ترتيب");
 ok(LS.annoOf(S,"text").length===1&&LS.annoOf(S,"lead","ب").length===1&&LS.annoOf(S,"lead","x").length===0&&LS.annoOf({},"text").length===0,"annoOf");
 ok(LS.nextLesson("open_challenge")==="dim_h","والتالي بعد تحدّي الفتحات أوّلُ بُعد");
});
group("المرحلة ٥: الإنشائي",()=>{
 eq(LS.LEVELS[4].lessons.length,7,"المحطّة ٥: سبعةُ دروس");
 ok(LS.ORDER.length>=25,"وخمسةٌ وعشرون درساً على الأقلّ في الخريطة");
 ok(LS.LESSONS.struct_challenge.challenge===1,"وآخرُها تحدٍّ");
 ok(LS.levelOpen(6,Object.fromEntries(LS.ORDER.map(id=>[id,{stars:3}]))),"والسادسةُ تُفتح بإكمال ما قبلها");
 const S={grid:{xs:[0,6000],ys:[100]},cols:[{x:0,y:0}],struct:[{kind:"beam",a:[0,0],b:[6000,0]},{kind:"footing",x:0,y:0}]};
 ok(LS.hasAxes(S,[0,6000],[0])&&!LS.hasAxes(S,[3000],[])&&!LS.hasAxes({},[0],[]),"hasAxes بالسماح");
 ok(!!LS.colAt(S,[50,50])&&!LS.colAt(S,[900,900]),"colAt");
 ok(LS.hasBeam(S,[6000,0],[0,0])&&!LS.hasBeam(S,[0,0],[0,4000]),"hasBeam بأيّ ترتيب");
 ok(LS.footAt(S,[0,0])&&!LS.footAt(S,[6000,0])&&LS.structOf({},"beam").length===0,"footAt وstructOf");
 eq(RN.sigOf({walls:[1],cols:[1,2],struct:[1],dims:[1],anno:[1],stairs:[1]}),7,"البصمةُ تعدّ الإنشائيَّ والتأشيرَ أيضاً");
});
group("المرحلة ٦: الطوابق والأسقف والنوافذ",()=>{
 eq(LS.LEVELS[5].lessons.length,7,"المحطّة ٦: سبعةُ دروس");
 ok(LS.ORDER.length>=32,"واثنان وثلاثون درساً على الأقلّ في الخريطة");
 ok(LS.LESSONS.floors_challenge.challenge===1,"وآخرُها تحدٍّ");
 ok(LS.levelOpen(7,Object.fromEntries(LS.ORDER.map(id=>[id,{stars:3}]))),"والسابعةُ تُفتح بإكمال ما قبلها");
 const S={walls:[{a:[0,0],b:[10,0],level:1}],roofs:[{level:1,type:"hip"}]};
 ok(LS.hasWallOn(S,[0,0],[10,0],1)&&!LS.hasWallOn(S,[0,0],[10,0],0),"hasWallOn بالطابق");
 ok(LS.roofOn(S,1)&&LS.roofOn(S,1,"hip")&&!LS.roofOn(S,1,"flat")&&!LS.roofOn(S,0)&&!LS.roofOn({},0),"roofOn");
 ok(LS.logHas({log:["مقطع رأسي"]},/مقطع/)&&!LS.logHas({},/x/),"logHas");
 ok(UICALLS.some(a=>a.act==="levelMgrDlg")&&UICALLS.some(a=>a.act==="view3dDlg"),"«شاهدني» يفتح النوافذ عبر خطّاف الواجهة");
 AC.setUiRunner(null); ok(AC.runAct({ui:"x"})&&AC.runAct({click:"y"}),"وبلا خطّافٍ لا يرمي");
 St.loadState(St.DEF(),true); ok(AC.runAct({addLevel:1})&&St.S.levelDefs.length===2,"addLevel");
 ok(AC.runAct({level:1})&&St.S.meta.level===1,"level"); AC.runAct({level:0});
 ok(SB.sandboxLog().length===0,"والسجلُّ فارغٌ خارج الصندوق");
});
group("المرحلة ٧: الإخراج والإضافيّ والفيلا",()=>{
 eq(LS.ORDER.length,42,"اثنان وأربعون درساً — الخطّةُ كاملة");
 eq(LS.LEVELS.map(L=>L.lessons.length).join(","),"4,4,7,7,7,7,6","توزيعُها على المحطّات السبع");
 ok(LS.LEVELS.every(L=>L.lessons.every(id=>LS.LESSONS[id]&&LS.LESSONS[id].level===L.n)),"كلُّ درسٍ في محطّته المعلَنة");
 const base={first_room:{stars:1},two_rooms:{stars:1}};
 ok(LS.levelOpen(2,base),"الإضافيُّ لا يشترطه فتحُ المحطّة التالية");
 ok(LS.LESSONS.rect_room.extra&&LS.LESSONS.mirror_partition.extra,"rect_room وmirror_partition إضافيّان");
 const V=LS.LESSONS.villa_final;
 ok(V.capstone===1&&V.steps.length===16,"الفيلا: خمسةَ عشرَ فصلاً وخاتمة");
 ok(V.steps.slice(0,15).every(s=>s.grow&&s.chapter&&Object.keys(s.need).length),"كلُّ فصلٍ grow وله عددُه المطلوب");
 ok(V.steps[0].say==="الفصل ١: شبكة المحاور"&&V.steps[14].chapter==="الورقة","الفصولُ بترتيب القالب");
 ok(V.steps.every(s=>!s.ghost||s.ghost.pts.length<=24),"والشبحُ ٢٤ نقطة على الأكثر");
 ok(LS.nextLesson("villa_final")===null,"والفيلا آخرُ الدروس");
 St.loadState(St.DEF(),true);
 AC.runActs([{tool:"wall"},{at:[[0,0],[3000,0],[3000,2000]]},{esc:1}]);
 eq(St.S.walls.length,2,"صيغةُ القالب: نقاطٌ متعدّدة في at");
 ok(AC.runAct({pick:"last:wall"})&&SEL.length===1&&AC.runAct({pick:"all:wall"})&&SEL.length===2&&AC.runAct({pick:"idx:wall:0"})&&SEL.length===1&&AC.runAct({pick:"none"})&&SEL.length===0,"والتحديدُ بالنصّ");
 ok(AC.runAct({onLevel:1})&&St.S.meta.level===1&&AC.runAct({onLevel:0}),"onLevel");
 ok(AC.runAct({meta:{scale:50}})&&St.S.meta.scale===50&&AC.runAct({ch:"x"})&&AC.runAct({say:"y"}),"meta والعلامات");
 eq(AC.actPoint({at:[[5,6],[7,8]]}).join(),"5,6","موضعُ أوّل نقطةٍ لمؤشّر «شاهدني»");
});
group("المرحلة ٨: بطاقاتُ الأدوات",()=>{
 const used=CD.usedTools();
 ok(used.has("wall")&&used.has("roof")&&used.has("gridcols")&&used.has("addsheet"),"الدروسُ تمسّ أدواتِها (تهيئةً وشاهدني وإضاءة)");
 const C=CD.buildCards(R.toolList());
 ok(C.length>=40,`${C.length} بطاقة لأدواتٍ بلا درس`);
 eq(C.length+R.toolList().filter(d=>used.has(d.id)).length,R.toolList().length,"البطاقاتُ والدروسُ تغطّي كلَّ أداةٍ مسجَّلة — بلا ثغرةٍ ولا تكرار");
 ok(C.every(c=>CD.isCard(c.id)&&c.card===1&&!used.has(c.tool)),"كلُّ بطاقةٍ c-<أداة> لأداةٍ لا يمسّها درس");
 ok(C.every(c=>c.steps.length===2&&c.steps[1].grow&&c.steps.every(s=>s.say.trim().split(/\s+/).length<=6)),"خطوتان قصيرتان، والتجربةُ لا تُعدّ أخطاء");
 ok(!CD.makeCard(null)&&CD.makeCard({id:"x",label:"س",alias:"xx ص"}).steps[0].keys[0][0]==="XX","والاختصارُ من أوّل كلمةٍ لاتينية");
 eq(CD.makeCard({id:"y",label:"ع"}).steps[0].keys.length,0,"وبلا اختصارٍ لا مفاتيح");
 let n=0, bad=[];
 C.forEach(c=>{
  if(!SB.enterSandbox(c,{sel:l=>{SEL=l}})){bad.push(c.id); return}
  const r=RN.createRunner(c,0); let k=0;
  try{while(!r.done&&k++<6){AC.runActs(r.step().auto); r.tick(probe(),k*1000)}}catch(e){}
  if(r.done)n++; else bad.push(c.id);
  if(R.active())R.cancel(true);
  SB.exitSandbox();
 });
 eq(bad.join(","),"",`كلُّ البطاقات (${n}) تكتمل في الصندوق`);
});
group("المرحلة ٨: البحثُ والإحصاءات",()=>{
 const C=CD.buildCards(R.toolList());
 ok(CD.searchAll("باب",null,C).some(l=>l.id==="door_double"),"«باب» يجد درسَ الباب المزدوج");
 ok(CD.searchAll("سقف هرمي",null,C).some(l=>l.id==="roof_hip"),"وكلمتان معاً");
 ok(CD.searchAll("اسقاط",null,[{title:"إسقاط",goal:""}]).length===1,"والهمزةُ لا تحجب النتيجة");
 ok(CD.searchAll("",null,C).length===0&&CD.searchAll("zzzz",null,C).length===0,"والفارغُ والمجهولُ لا شيء");
 const P={first_room:{stars:3,dur:120},two_rooms:{stars:1,dur:60},[C[0].id]:{stars:1},villa_final:{stars:2,dur:2700}};
 const S0=CD.statsOf(P,null,C);
 ok(S0.lessons===3&&S0.stars===6&&S0.cards===1&&S0.lessonsTotal===42&&S0.starsTotal===126,"الدروسُ والنجومُ والبطاقات");
 ok(S0.mins===48&&S0.capstone,"والوقتُ بالدقائق، والختاميُّ يفتح الشهادة");
 ok(!CD.statsOf({},null,C).capstone,"وبلا فيلا لا شهادة");
});
group("المرحلة ٨: الشهادة",()=>{
 const svg=CT.certSVG({name:"سالم <b>",stats:{lessons:42,lessonsTotal:42,stars:100,cards:9},date:new Date(2026,9,6),
  logo:"data:image/png;base64,iVBORw0KGgo="});
 ok(/^<svg xmlns=/.test(svg)&&/width="297mm"/.test(svg),"SVG مستقلٌّ بمقاس A4 أفقي");
 ok(svg.includes("سالم &lt;b&gt;")&&!svg.includes("<b>"),"الاسمُ مهرَّب");
 ok(svg.includes("أتمّ ٤٢ درساً من ٤٢، وجمع ١٠٠ نجمة")&&svg.includes("٦ أكتوبر ٢٠٢٦"),"الأرقامُ تفصلها كلمات، والتاريخُ بالكلمات (لا ينقلب)");
 ok(!/>[A-Za-z]/.test(svg.replace(/<[^>]+>/g,m=>m)),"ولا سطرَ يبدأ بكلمةٍ لاتينية (ينقلب في RTL)");
 ok(svg.includes('href="data:image/png;base64,iVBORw0KGgo="'),"الشعارُ PNG مضمَّن");
 ok(!CT.certSVG({logo:"javascript:x"}).includes("<image")&&!CT.certSVG({logo:'data:image/png;base64,"><x'}).includes("<image"),"وغيرُ PNG المضمَّن يُهمَل");
 ok(CT.certSVG({}).includes("متعلّم CivilDraft")&&!CT.certSVG({}).includes("<image"),"وبلا اسمٍ ولا شعارٍ لا تنكسر");
 ok(CT.logoOk("data:image/png;base64,AAAA")&&!CT.logoOk("data:image/svg+xml;base64,AA")&&!CT.logoOk(null),"logoOk");
 eq(CD.CARD_PREFIX,"c-","بادئةُ البطاقات");
 eq(LS.ROOM(2000,1000).filter(a=>a.at).length,4,"ROOM: أربعةُ أركان");
 ok(CT.CERT_ORG.includes("كلية الهندسة"),"واسمُ الكلية");
});
process.exit(summary()?1:0);
