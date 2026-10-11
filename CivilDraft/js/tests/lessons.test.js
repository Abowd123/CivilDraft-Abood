/* ═══ سلسلة الدروس تُشغَّل على الأدوات الحقيقية ═══
   كلُّ درسٍ في js/tutor/lessons.js يُنفَّذ هنا خطوةً خطوة بالمحرّك نفسِه
   الذي يشغّله «استوديو الدروس» في المتصفّح ويسجّله فيديو. فإن تغيّرت أداةٌ
   (اسمُها أو خطواتها أو رسائلها) فشل الدرسُ هنا قبل أن يكذب على المتعلّم.
   التشغيل:  node js/tests/lessons.test.js                               */
import {shim,shimCanvas,shimDOM,toolRig,group,groupAsync,ok,eq,summary} from "./harness.js";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
shim(); shimCanvas(); shimDOM();
const HERE=fileURLToPath(new URL(".",import.meta.url));
const ST=await import("../core/state.js");
const EN=await import("../core/ents.js");
const RN=await import("../core/render.js");
for(const f of readdirSync(HERE+"../tools").filter(f=>f.endsWith(".js")))await import(`../tools/${f}`);
const R=await import("../tools/registry.js");
const L=await import("../tutor/lessons.js");
const E=await import("../tutor/engine.js");
const rig=toolRig(R,{hit:(x,y,k)=>EN.hitTest(x,y,250,k),invalidate:()=>RN.invalidate()});
const S=ST.S;
const H={pick:l=>rig.pick(l),after:()=>RN.invalidate()};

group("السلسلة: بياناتٌ سليمة",()=>{
 ok(L.SERIES.length>=8,"ثمانيةُ دروسٍ على الأقل");
 eq(new Set(L.SERIES.map(x=>x.id)).size,L.SERIES.length,"معرّفاتٌ فريدة");
 L.SERIES.forEach((x,i)=>{
  eq(x.n,i+1,`${x.id}: مرقَّمٌ بالترتيب`);
  ok(x.title&&x.goal&&x.steps.length>=2,`${x.id}: عنوانٌ وهدفٌ وخطوتان على الأقل`);
  x.steps.forEach((s,j)=>ok(typeof s.t==="string"&&s.t.length>8&&!/—/.test(s.t),`${x.id}/${j+1}: نصُّ خطوةٍ مقروء`));
  x.steps.flatMap(s=>s.a).filter(a=>a.tool).forEach(a=>ok(!!R.findTool(a.tool),`${x.id}: الأداة «${a.tool}» موجودة`));
 });
});
const CNT={walls:"walls",opens:"opens",areas:"areas",fixt:"fixt",cols:"cols",dims:"dims",tables:"tables"};
for(const X of L.SERIES){
 await groupAsync(`الدرس ${X.n} «${X.title}» يُنفَّذ كما هو مكتوب`,async()=>{
  rig.clear(); R.toolList().forEach(d=>rig.defs(d.id));
  const done=await E.runLesson(X,H);
  ok(done,"اكتمل");
  const er=rig.errs(); ok(!er.length,"بلا رسالة خطأ"+(er.length?": "+er[0]:""));
  ok(!R.active(),"ولا أداةٌ معلّقة في آخره");
  for(const k in X.expect){
   const v=X.expect[k];
   if(k==="wallT"){ok(S.walls.every(w=>w.t===v),`كلُّ جدارٍ بسماكة ${v}`); continue}
   const n=(S[CNT[k]]||[]).length;
   if(typeof v==="object")ok(n>=v.min,`${k} ≥ ${v.min} (جاء ${n})`);
   else eq(n,v,k);
  }
 });
}
await groupAsync("الواجهةُ تخطو خطوةً خطوة (زرّ «خطوة واحدة») بالنتيجة نفسِها",async()=>{
 const X=L.lessonById("l1"); ok(X===L.SERIES[0],"lessonById"); eq(L.lessonById("لا"),null,"والمجهولُ null");
 rig.clear();
 for(const s of X.steps)ok(await E.runStep(s,H),"خطوةٌ اكتملت");
 eq(S.walls.length+S.opens.length+S.areas.length,7,"4 جدران + بابٌ وشباك + منطقة");
 await E.runAct({fresh:1},H); eq(S.walls.length,0,"runAct: مشروعٌ فارغ");
 let n=0; const stop={...H,stopped:()=>++n>2};
 ok(!(await E.runLesson(X,stop)),"والإيقافُ يقطع الدرس");
 ok(S.walls.length<4,"قبل أن يكتمل");
});
group("نصُّ الخطوات والترجمة",()=>{
 const X=L.SERIES[0];
 const md=E.lessonMarkdown(X);
 ok(md.startsWith("# الدرس 1: أوّل غرفة"),"عنوانُ Markdown");
 eq((md.match(/^\d+\. /gm)||[]).length,X.steps.length,"سطرٌ لكلِّ خطوة");
 const s=E.srt(X,[{i:0,at:0},{i:1,at:2500},{i:2,at:61234}],65000);
 ok(/^1\n00:00:00,000 --> 00:00:02,450\n/.test(s),"التوقيتُ الأوّل");
 ok(/00:01:01,234 --> 00:01:04,950/.test(s),"والدقائقُ والملّي ثانية");
 eq((s.match(/-->/g)||[]).length,3,"ثلاثُ ترجمات");
 const all=E.seriesMarkdown(L.SERIES,L.NEXT);
 ok(all.includes("## قادمة")&&all.includes("الطوابق"),"والسلسلة كاملةً مع القادم");
});
/* ═══ أفعالُ النوافذ ═══ الدرسُ الذي يفتح نافذةً لا يُرسم شيئاً يفحصه
   الاختبار، فيُفحَص الهدفُ نفسُه: كلُّ فعلٍ معروفٌ للمُرسِل (runSpec)،
   وكلُّ عنصرٍ يشار إليه مكتوبٌ فعلاً في الواجهة. فإن أُعيدت تسميةُ زرٍّ
   سقط الدرس هنا قبل أن يشير إلى فراغ في المتصفّح. */
const AC=await import("../ui/actions.js");
const LY=await import("../ui/layout.js");
const SC=await import("../ui/ribbon/schema.js");
const {readFileSync}=await import("node:fs");
const SRC=[readFileSync(HERE+"../../index.html","utf8")]
 .concat(readdirSync(HERE+"../ui",{recursive:true}).filter(f=>String(f).endsWith(".js"))
 .map(f=>readFileSync(HERE+"../ui/"+f,"utf8"))).join("\n");
const actKnown=id=>id.startsWith("dlg:")?LY.isPanel(id.slice(4)):!!(AC.getAct(id)||AC.LOCAL_TO_WIRE.has(id));
function targetOk(t){
 if(t.startsWith("act:"))return actKnown(t.slice(4));
 if(t.startsWith("sec:"))return LY.isPanel(t.slice(4));
 let m=/^#([\w-]+)$/.exec(t);
 if(m)return new RegExp(`id=\\\\?["']${m[1]}\\\\?["']`).test(SRC);
 m=/^\[([\w-]+)="([^"]+)"\]$/.exec(t);
 if(m)return SRC.includes(`${m[1]}="${m[2]}"`);
 return false;
}
const DLG=new Set(["styleMgrDlg","levelMgrDlg","view3dDlg","pricingDlg","gateDlg","cleanupDlg","dedupDlg"]);
group("أفعالُ النوافذ: كلُّ هدفٍ موجود",()=>{
 ok(targetOk("#xPdf")&&targetOk("act:xPdf")&&targetOk("sec:proj")&&targetOk('[data-do="add"]'),"المحقِّقُ يعرف الصيغ الأربع");
 ok(!targetOk("#noSuchId")&&!targetOk("act:noSuch")&&!targetOk("sec:noSuch")&&!targetOk(".x"),"ويرفض المجهول");
 let n=0;
 for(const X of L.SERIES){let open=0; X.steps.forEach((st,j)=>{
  for(const a of st.a){
   if(a.ui){n++; ok(actKnown(a.ui),`${X.id}/${j+1}: الفعل «${a.ui}» معروف`);
    if(!a.ui.startsWith("dlg:")&&!a.ui.startsWith("st")&&!AC.LOCAL_TO_WIRE.has(a.ui))
     ok(!!SC.homeOf(a.ui),`${X.id}/${j+1}: «${a.ui}» له بيتٌ في الشريط يراه المتعلّم`);
    if(DLG.has(a.ui))open=1}
   if(a.point||a.press){n++; ok(targetOk(a.point||a.press),`${X.id}/${j+1}: العنصر «${a.point||a.press}» موجود`)}
   if(a.press)ok(open||st.a.some(b=>b.ui),`${X.id}/${j+1}: النقرُ داخل نافذةٍ فُتحت قبلها`);
   if(a.close){ok(open,`${X.id}/${j+1}: الإغلاقُ بعد نافذةٍ فتحها الدرس`); open=0}
  }
  });
  ok(!open,`${X.id}: كلُّ نافذةٍ فتحها الدرس تُغلق قبل نهايته`)}
 ok(n>=50,`أفعالُ نوافذ كثيرة (${n})`);
 ["xOpen","bkTog","fnew"].forEach(id=>ok(!L.SERIES.some(X=>X.steps.some(s=>s.a.some(a=>a.ui===id))),
  `«${id}» يُشار إليه ولا يُنقر عن المتعلّم: المتصفّح يحتاج يده`));
});
await groupAsync("المحرّكُ يمرّر أفعالَ النوافذ بترتيبها إلى الواجهة",async()=>{
 const log=[];
 const Hk={...H,ui:id=>log.push("ui:"+id),point:t=>log.push("pt:"+t),press:t=>log.push("pr:"+t),close:()=>log.push("x")};
 await E.runStep({a:[{ui:"levelMgrDlg"},{press:'[data-do="add"]'},{close:1},{point:"#xPdf"}]},Hk);
 eq(log.join(" "),'ui:levelMgrDlg pr:[data-do="add"] x pt:#xPdf',"بالترتيب");
 const X=L.lessonById("l11"); let picked=null;
 await E.runStep(X.steps[0],H);
 await E.runStep(X.steps[1],{...H,pick:l=>{picked=l; rig.pick(l)}});
 ok(picked&&picked.length===1&&picked[0].k==="wall","«first:wall» يحدّد جداراً حقيقياً للوحة الخصائص");
 rig.pick([]);
});
process.exit(summary()?1:0);
