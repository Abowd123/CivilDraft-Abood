/* ═══ محاذاة الطوابق ═══ تقريرٌ يُخبِر ولا يُصلح: عمودٌ في طابقٍ
   علويّ بلا عمودٍ يحمله في الطابق الذي تحته مباشرةً، أو جدارٌ
   علويّ لا يقع مركزُه فوق جسم جدارٍ سفليّ — كلاهما يُسرَد بلا
   تعديل بياناتٍ، تماماً كـfindMisaligned في stairs/opens.
   خالصةٌ كأخواتها: تُسأل عن S فتجيب، ولا تكتب فيها شيئاً. */
import {levelOf} from "./level.js";
import {band} from "./walls.js";
import {bboxOf} from "./geom.js";

/* أقرب عمودٍ سفليٍّ لعمودٍ علويّ — بالمركز لا بالمضلّع، فمقاسان
   مختلفان بينهما مركزٌ واحد يُعتبَران محاذَيَين */
function nearestCol(c,cands){
 let best=null,bd=1/0;
 cands.forEach(b=>{
  const d=Math.hypot(c.x-b.x,c.y-b.y);
  if(d<bd){bd=d;best=b}
 });
 return {best,d:bd};
}

export function findMisaligned(S,tol){
 const T=Math.max(1,+tol||50);
 const out=[];
 if(!S)return out;

 /* ═══ الأعمدة: هل فوق عمودٍ سفليّ؟ ═══ */
 const colsByLevel=new Map();
 (S.cols||[]).forEach(c=>{
  const L=levelOf(c);
  if(!colsByLevel.has(L))colsByLevel.set(L,[]);
  colsByLevel.get(L).push(c);
 });
 const levels=[...colsByLevel.keys()].sort((a,b)=>a-b);
 for(let i=1;i<levels.length;i++){
  const cur=levels[i], baseL=levels[i-1];
  const baseCols=colsByLevel.get(baseL)||[];
  (colsByLevel.get(cur)||[]).forEach(c=>{
   const {best,d}=nearestCol(c,baseCols);
   if(!best||d>T){
    out.push({type:"col",id:c.id,level:cur,
     baseLevel:baseL,baseId:best?best.id:null,
     dist:best?Math.round(d):null,
     msg:best
      ?`${c.id} طابق ${cur} ليس فوق ${best.id} — بُعدُ المركزين `
       +`${Math.round(d)} مم`
      :`${c.id} طابق ${cur} بلا عمودٍ في طابق ${baseL} تحته`});
   }
  });
 }

 /* ═══ الجدران: هل مركزُها فوق جسم جدارٍ سفليّ؟ ═══ مبسَّطٌ: مركز
    وتر الجدار العلويّ يجب أن يقع داخل صندوق شريط جدارٍ سفليّ +
    تفاوت. فحصٌ تقريبيٌّ يكفي تقريراً — لا معياراً هندسياً صارماً. */
 const wallsByLevel=new Map();
 (S.walls||[]).forEach(w=>{
  const L=levelOf(w);
  if(!wallsByLevel.has(L))wallsByLevel.set(L,[]);
  wallsByLevel.get(L).push(w);
 });
 const wLevels=[...wallsByLevel.keys()].sort((a,b)=>a-b);
 for(let i=1;i<wLevels.length;i++){
  const cur=wLevels[i], baseL=wLevels[i-1];
  const baseWalls=wallsByLevel.get(baseL)||[];
  const baseBoxes=baseWalls.map(bw=>{
   const p=band(bw);
   return p?bboxOf(p):null;
  }).filter(Boolean);
  (wallsByLevel.get(cur)||[]).forEach(w=>{
   if(!w.a||!w.b)return;
   const mx=(w.a[0]+w.b[0])/2, my=(w.a[1]+w.b[1])/2;
   const hit=baseBoxes.some(bb=>
    mx>=bb.x0-T&&mx<=bb.x1+T&&my>=bb.y0-T&&my<=bb.y1+T);
   if(!hit)out.push({type:"wall",id:w.id,level:cur,baseLevel:baseL,
    msg:`${w.id} طابق ${cur} بلا جدارٍ في طابق ${baseL} تحته`});
  });
 }

 return out;
}

export const misalignedSay=list=>!list.length
 ? "كل طابقٍ محاذٍ لما تحته"
 : `${list.length} انحرافاً: ${list.slice(0,3).map(m=>m.id).join(" · ")}`
  +(list.length>3?" …":"");
