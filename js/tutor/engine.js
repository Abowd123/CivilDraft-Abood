/* ═══ محرّكُ الدروس ═══ يشغّل خطواتِ الدرس على الأدوات الحقيقية.
   خالصٌ من DOM: الواجهةُ (ui/studio.js) تمرّر خُطافاتِ الحركة والانتظار
   والتحديد والرسم، والاختبارُ يمرّر خُطافاتٍ صامتة — فالدرسُ نفسُه
   يُختبَر ويُعرَض ويُسجَّل بمسارٍ واحد. */
import {S,newState,ensureShape,clearHistory} from "../core/state.js";
import * as R from "../tools/registry.js";
import {installDefaults,apply as applyTpl} from "../core/templates.js";
import {setLay} from "../core/layers.js";
import {allEnts} from "../core/ents.js";
import {COLL} from "../core/ents.js";

const noop=()=>{};
const W=h=>Object.assign({move:noop,click:noop,typing:noop,wait:noop,pick:noop,
 view:noop,after:noop,stopped:()=>false,say:noop,
 ui:noop,point:noop,press:noop,close:noop},h||{});
/* أفعالُ النوافذ (ui/point/press/close) لا تمسّ المحرّك: الواجهةُ تنفّذها
   بالمُرسِل نفسِه الذي ينفّذ أزرارَ الشريط (runSpec)، والاختبارُ يمرّرها
   صامتةً ويتحقّق أنّ كلَّ فعلٍ وكلَّ عنصرٍ تشير إليه موجودٌ فعلاً. */

function pickOf(spec){
 if(spec==="none")return [];
 if(spec==="all")return allEnts();
 const m=/^(last|first):(\w+)$/.exec(String(spec||""));
 if(!m)return [];
 const L=S[COLL[m[2]]]||[];
 const e=m[1]==="last"?L[L.length-1]:L[0];
 return e?[{k:m[2],id:e.id}]:[];
}
/* فعلٌ واحد — يعيد وعداً لينتظر الحركةَ في الواجهة، ويعمل متزامناً في الاختبار */
export async function runAct(a,h){
 const H=W(h);
 if(a.fresh){if(R.active())R.cancel(true); newState(); ensureShape(); clearHistory(); installDefaults(); H.pick([])}
 else if(a.tpl){installDefaults(); applyTpl(a.tpl)}
 else if(a.opt)R.setOpt(a.opt[0],a.opt[1],a.opt[2]);
 else if(a.tool){if(R.active())R.cancel(true); R.begin(a.tool)}
 else if(a.click){const p=[Math.round(a.click[0]),Math.round(a.click[1])]; await H.move(p); R.feedPoint(p,p); await H.click(p)}
 else if(a.type!=null){await H.typing(String(a.type)); R.feedText(String(a.type))}
 else if(a.enter)R.enter();
 else if(a.esc)R.cancel(true);
 else if(a.pick)H.pick(pickOf(a.pick));
 else if(a.layer)setLay(a.layer[0],a.layer[1],a.layer[2]);
 else if(a.view)H.view({x0:a.view[0],y0:a.view[1],x1:a.view[2],y1:a.view[3]});
 else if(a.wait)await H.wait(a.wait);
 else if(a.ui)await H.ui(String(a.ui));
 else if(a.point)await H.point(String(a.point));
 else if(a.press)await H.press(String(a.press));
 else if(a.close)await H.close();
 H.after();
}
/* هل يمسح الدرسُ المشروعَ الجاري؟ (مشروعٌ فارغ أو قالب) فيُحفظ ما قبله أولاً.
   وهل يبدّل سطحَ العمل؟ فيُعاد سطحُ المستخدم بعده. */
const acts=L=>(L&&L.steps||[]).flatMap(s=>s.a||[]);
export const lessonWipes=L=>acts(L).some(a=>a.fresh||a.tpl);
export const lessonMovesUI=L=>acts(L).some(a=>a.ui&&/^(ws|dock)/.test(a.ui));
export async function runStep(st,h){
 for(const a of (st.a||[])){
  if(W(h).stopped())return false;
  await runAct(a,h);
 }
 return true;
}
export async function runLesson(L,h){
 const H=W(h);
 for(let i=0;i<L.steps.length;i++){
  if(H.stopped())return false;
  H.say(i,L.steps[i].t);
  await runStep(L.steps[i],h);
 }
 return true;
}
/* ═══ النصوص ═══ نصُّ الخطوات (Markdown) وترجمةُ الفيديو (SRT) */
export function lessonMarkdown(L){
 const o=[`# الدرس ${L.n}: ${L.title}`,"",`**المستوى:** ${L.level} · **المدّة:** ${L.min} دقائق تقريباً`,"",`**الهدف:** ${L.goal}`,"","## الخطوات",""];
 L.steps.forEach((s,i)=>o.push(`${i+1}. ${s.t}`));
 return o.join("\n")+"\n";
}
const ts=ms=>{ms=Math.max(0,Math.round(ms)); const h=Math.floor(ms/3600000), m=Math.floor(ms/60000)%60, s=Math.floor(ms/1000)%60, r=ms%1000;
 const p=(v,n=2)=>String(v).padStart(n,"0"); return `${p(h)}:${p(m)}:${p(s)},${p(r,3)}`};
/* marks: [{i, at}] لحظةُ بدء كلِّ خطوةٍ بالملّي ثانية من بدء التسجيل */
export function srt(L,marks,end){
 const M=(marks||[]).slice().sort((a,b)=>a.at-b.at);
 return M.map((m,k)=>{
  const to=(k+1<M.length)?M[k+1].at:(end!=null?end:m.at+4000);
  return `${k+1}\n${ts(m.at)} --> ${ts(Math.max(m.at+500,to-50))}\n${(L.steps[m.i]||{}).t||""}\n`;
 }).join("\n");
}
export function seriesMarkdown(series,next){
 const o=["# سلسلة دروس CivilDraft",""];
 series.forEach(L=>{o.push(`## ${L.n}. ${L.title} (${L.level} · ${L.min} د)`,"",L.goal,"");L.steps.forEach((s,i)=>o.push(`${i+1}. ${s.t}`));o.push("")});
 if(next&&next.length){o.push("## قادمة","");next.forEach(x=>o.push(`- ${x.n}. ${x.title}`))}
 return o.join("\n")+"\n";
}
