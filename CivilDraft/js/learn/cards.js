/* ═══ الواجهة التعليمية: بطاقاتُ الأدوات ═══ المرحلة ٨
   كلُّ أداةٍ لا يمسّها درسٌ تأخذ بطاقةً تُبنى من تعريفها نفسه (label ·
   hint · alias · أوّلُ خطوة) فلا تُكتب يدوياً ولا تتقادم: أداةٌ تُضاف إلى
   السجلّ تظهر بطاقتُها وحدها، وأداةٌ يغطّيها درسٌ تختفي بطاقتُها.

   البطاقةُ درسٌ قصير في الصندوق نفسه وعلى غرفةٍ جاهزة: اضغط الزرّ ←
   جرّبها ← Esc. استكشافٌ لا امتحان (grow فلا أخطاء)، وتمامُها نجمةٌ واحدة
   في التقدّم باسم c-<الأداة> لا تشترطه أيُّ محطّة. */
import {LESSONS,ROOM} from "./lessons.js";

export const CARD_PREFIX="c-";
export const isCard=id=>typeof id==="string"&&id.startsWith(CARD_PREFIX);

/* الأدواتُ التي تمسّها الدروس: ما يُفعَّل في تهيئتها أو «شاهدني» أو يُضاء زرُّه */
export function usedTools(lessons){
 const out=new Set();
 Object.values(lessons||LESSONS).forEach(l=>{
  (l.setup||[]).forEach(a=>{if(a&&a.tool)out.add(a.tool)});
  (l.steps||[]).forEach(s=>{
   (s.auto||[]).forEach(a=>{if(a&&a.tool)out.add(a.tool)});
   if(typeof s.target==="string"&&s.target.startsWith("cmd:"))out.add(s.target.slice(4));
  });
 });
 return out;
}
const firstKey=d=>String(d.alias||"").trim().split(/\s+/).find(w=>/^[a-z][a-z0-9]{0,5}$/i.test(w))||"";
const firstPrompt=d=>(Array.isArray(d.steps)&&d.steps[0]&&d.steps[0].p)||"";

export function makeCard(d){
 if(!d||!d.id)return null;
 const key=firstKey(d), label=d.label||d.id;
 const tryHint=[d.hint,firstPrompt(d)].filter(Boolean).join(" · ")||"جرّبها على الغرفة، ثم Esc";
 return {
  id:CARD_PREFIX+d.id, card:1, tool:d.id, level:0, title:label, min:1,
  goal:d.hint||`جرّب «${label}»`, alias:String(d.alias||""),
  frame:{x0:-1600,y0:-1600,x1:7600,y1:5600},
  setup:ROOM(6000,4000).concat([{tool:"door"},{at:[3000,0]},{esc:1},{tool:"area"},{at:[3000,2000]},{esc:1}]),
  steps:[
   {say:`اضغط «${label}»`.slice(0,40), target:"cmd:"+d.id,
    keys:key?[[key.toUpperCase(),"بالكتابة"],["Enter"]]:[],
    hint:"زرُّها في الشريط، أو ابحث عنها بـ Ctrl+K",
    expect:st=>st.last===d.id||st.tool===d.id, auto:[{tool:d.id}]},
   {say:"جرّبها ثم Esc", grow:1, keys:[["Esc","انتهيت"]], hint:tryHint,
    expect:st=>!st.active&&st.last===d.id, auto:[{esc:1}]}
  ]
 };
}
/* البطاقاتُ مرتّبةً بالتسمية العربية؛ toolList يُمرَّر (registry) فتبقى الوحدةُ بلا حالة */
export function buildCards(toolList,lessons){
 const used=usedTools(lessons);
 return (toolList||[]).filter(d=>d&&d.id&&!used.has(d.id)&&!d.hidden)
  .map(makeCard).filter(Boolean)
  .sort((a,b)=>a.title.localeCompare(b.title,"ar"));
}
/* البحث: عنوانُ الدرس وهدفُه، أو تسميةُ الأداة واختصاراتُها — بلا تشكيلٍ ولا همزات */
const norm=s=>String(s||"").toLowerCase()
 .replace(/[\u064B-\u0652\u0640]/g,"").replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي");
export function searchAll(q,lessons,cards){
 const n=norm(q).trim(); if(!n)return [];
 const terms=n.split(/\s+/);
 const hit=x=>{const t=norm([x.title,x.goal,x.alias||""].join(" ")); return terms.every(w=>t.includes(w))};
 return Object.values(lessons||LESSONS).filter(hit).concat((cards||[]).filter(hit)).slice(0,30);
}
/* ═══ الإحصاءات ═══ ما يُعرض في رأس الخريطة وعلى الشهادة */
export function statsOf(progress,lessons,cards){
 const P=progress||{}, L=Object.values(lessons||LESSONS), C=cards||[];
 const done=L.filter(l=>(P[l.id]||{}).stars>0);
 return {
  lessons:done.length, lessonsTotal:L.length,
  stars:done.reduce((a,l)=>a+(P[l.id].stars|0),0), starsTotal:L.length*3,
  cards:C.filter(c=>(P[c.id]||{}).stars>0).length, cardsTotal:C.length,
  mins:Math.round(Object.values(P).reduce((a,v)=>a+((v&&+v.dur)||0),0)/60),
  capstone:((P.villa_final||{}).stars|0)>0
 };
}
