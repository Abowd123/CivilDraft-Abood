/* ═══ أداة الخربشة ═══
   اسحب لترسم بحرّية كما على ورقة. Enter ينهي الرسم فتُعرَض الخطّة:
   مساراتٌ بأطوالها وانحرافها. Enter الثانية تُنشئ الجدران عبر
   addWall نفسها — فتنالها قيوده كلّها، وما رُفض يُذكَر بسببه.
   Esc قبل التأكيد لا يترك أثراً، والتأكيد خطوةُ تراجعٍ واحدة.

   لا شيء يُنشأ من ضربةٍ وحدها: الخربشة اقتراح، والجدار أمرك. */
import {S} from "../core/state.js";
import {m2,m3,clamp,arrow} from "../core/units.js";
import {addWall,ALIGN} from "../core/walls.js";
import {trace,scalePlan,snapPts,planSay,cornerSay} from "../core/trace.js";
import {defTool,H,T,rec,step,ov,ovLen,ovNum,ovOn,
        pvLine,pvBand,pvPoly,pvText} from "./registry.js";

const GRN="#5cd98e", YEL="#ffd06b", RED="#ff6f6f", DIM="#3d4a58";
const TY=[["int","داخلي"],["ext","خارجي"],["low","سترة"]];
const AL=[["c","مركزي"],["l","الوجه الأيسر"],["r","الوجه الأيمن"]];

/* مفتاح الكاش: الضربات + كل خيارٍ يؤثّر في الاستنباط. تغييرُ حقلٍ
   في الشريط يُعيد الاستنباط فوراً وتراه قبل أن تؤكّد. */
const keyOf=ctx=>[
 (ctx.v.st||[]).length,
 (ctx.v.st||[]).reduce((s,p)=>s+p.length,0),
 ov("sketch","eps"), ov("sketch","angTol"),
 ov("sketch","minSeg"), ov("sketch","nodeTol"),
 ov("sketch","cal"), ov("sketch","grid")].join("|");

function planOf(ctx){
 const k=keyOf(ctx);
 if(ctx.v.plan&&ctx.v.pk===k)return ctx.v.plan;
 const O={};
 const e=ovLen("sketch","eps");     if(e)O.eps=e;
 const m=ovLen("sketch","minSeg");  if(m)O.minSeg=m;
 const n=ovLen("sketch","nodeTol"); if(n)O.nodeTol=n;
 const a=ovNum("sketch","angTol");  if(a)O.angTol=clamp(a,1,44);
 const P=trace(ctx.v.st||[],O);
 /* المعايرة: طولٌ تعرفه لأطول مسار — تحويلٌ متشابه واحد */
 const cal=ovLen("sketch","cal");
 P.cal=null;
 if(cal>0&&P.segs.length){
  const was=P.segs[0].L;
  if(was>1){
   const kk=cal/was;
   scalePlan(P.segs,kk);
   P.cal={k:kk,was,now:cal};
  }
 }
 P.shift=ovOn("sketch","grid")
  ? snapPts(P.segs,Math.max(1,S.meta.snap)) : 0;
 ctx.v.plan=P; ctx.v.pk=k;
 return P;
}
defTool({
 id:"sketch", alias:"sk خربشه مسوده ارسم_بيدك", label:"خربشة",
 hint:"اسحب لترسم · Enter يعرض الخطّة · Enter يؤكّد · U يمسح آخر ضربة",
 opts:[
  {k:"t",      label:"السماكة م", type:"len", def:"0.2"},
  {k:"type",   label:"النوع",     type:"sel", seg:1, items:TY, def:"ext"},
  {k:"align",  label:"المسار على",type:"sel", items:AL, def:"c"},
  {k:"cal",    label:"طول أطول ضلع م", type:"len", def:"",
   hint:"فارغ = بمقياس خربشتك · اكتب طولاً تعرفه لتُعايَر الخطّة"},
  {k:"angTol", label:"أقصى قصٍّ زاويّ °", type:"num", def:18,
   hint:"ما زاد انحرافه يبقى حرّاً ويُبلَّغ"},
  {k:"eps",    label:"تفاوت التبسيط م", type:"len", def:"",
   hint:"فارغ = يُشتقّ من حجم خربشتك"},
  {k:"minSeg", label:"أقصر مسار م", type:"len", def:""},
  {k:"nodeTol",label:"تقارب الأطراف م", type:"len", def:""},
  {k:"grid",   label:"قرّب إلى خطوة الالتقاط", type:"chk", def:0,
   hint:"يُبلَّغ أكبر إزاحة"}],
 steps:[
  {p:"اخربش المخطّط ثم Enter (U يمسح آخر ضربة)",
   freehand:1, loop:1, min:1,
   opts:{
    u:{n:"امسح آخر ضربة",run(ctx){
     if(!(ctx.v.st||[]).length)throw new Error("لا ضربة تُمسَح");
     ctx.v.st.pop(); ctx.v.plan=null; ctx.v.n2=0;
     if(ctx.n>0)ctx.n--;
     H.rep("in",`بقيت ${ctx.v.st.length} ضربة`);
    }},
    c:{n:"امسح الكلّ",run(ctx){
     ctx.v.st=[]; ctx.v.plan=null; ctx.n=0;
     H.rep("in","مُسحت الخربشة");
    }}},
   each(ctx,P){
    ctx.v.st=(ctx.v.st||[]).concat([P]);
    ctx.v.plan=null;
   }},
  {p:"Enter يؤكّد تحويل الخطّة إلى جدران · S يُكمل الخربشة · Esc يلغي",
   confirm:1,
   opts:{s:{n:"أكمل الخربشة",run(){T.i=0; H.rep("in","أكمل الرسم")}}},
   each(ctx){
    const P=planOf(ctx);
    if(!P.segs.length)
     throw new Error("لا مسار في الخطّة — اخربش أطول، أو صغّر "
      +"«أقصر مسار»");
    const t=ovLen("sketch","t"), ty=ov("sketch","type"),
          al=ov("sketch","align");
    let n=0;
    const ref=[];
    P.segs.forEach(s=>{
     try{
      rec(ctx,addWall(s.a,s.b,t,ty,al),"walls");
      n++;
     }catch(e){ref.push(`${m3(s.L)} م: ${e.message}`)}
    });
    if(!n)throw new Error("لم يُقبَل مسارٌ واحد — "
     +(ref[0]||"راجع الخيارات"));
    H.rep("ok",`أُنشئ ${n} جدار من ${P.segs.length} مساراً · `
     +`${m2(t)} م ${ALIGN[al]}`);
    H.rep("in",cornerSay(P)
     +` · الخربشة لم تُحفَظ: الجدران وحدها صارت بيانات`);
    ref.slice(0,6).forEach(m=>H.rep("wr","  رُفض "+m));
    if(ref.length>6)H.rep("in",`  … و ${ref.length-6} رفضاً آخر`);
    if(P.stat.free)H.rep("wr",`${P.stat.free} مساراً بقي حرّاً — `
     +`زاويته كما رسمتها. استعمل «لحم» أو «دوران» إن شئت.`);
   }}],
 prev(ctx,g){
  const out=[];
  (ctx.v.st||[]).forEach(P=>{
   if(P.length>1)out.push(pvPoly(P,DIM,0));
  });
  if(!(ctx.v.st||[]).length)return out;
  const P=planOf(ctx);
  const st=step();
  /* تقريرٌ مرّةً واحدة عند دخول خطوة التأكيد أو تغيّر الخطّة */
  if(st&&st.confirm&&ctx.v.said!==ctx.v.pk){
   ctx.v.said=ctx.v.pk;
   H.rep(P.segs.length?"wr":"er","الخطّة: "+planSay(P));
   H.rep("in","  "+cornerSay(P));
   if(P.cal)H.rep("in",`  معايرة ×${P.cal.k.toFixed(5)} · `
    +`${arrow(m3(P.cal.was),m3(P.cal.now))} م`);
   if(P.shift)H.rep("in",`  التقريب إلى الشبكة أزاح `
    +`${m3(P.shift)} م على الأكثر`);
   P.segs.slice(0,14).forEach((s,i)=>H.rep("in",
    `  ${i+1}· ${m3(s.L)} م · ${s.ang.toFixed(1)}°`
    +(s.snapped?"":` · حرّ (انحراف ${s.dev.toFixed(1)}°)`)
    +(s.merged>1?` · دُمج ${s.merged}`:"")));
   if(P.segs.length>14)
    H.rep("in",`  … و ${P.segs.length-14} مساراً آخر`);
   H.rep("wr","  Enter يؤكّد · Esc يلغي بلا أثر");
  }
  const t=ovLen("sketch","t")||150;
  P.segs.forEach(s=>{
   out.push(pvBand(s.a,s.b,t,s.snapped?GRN:RED));
   out.push(pvLine(s.a,s.b,s.snapped?YEL:RED));
  });
  P.segs.slice(0,24).forEach(s=>{
   if(s.L<t*3)return;
   out.push(pvText([(s.a[0]+s.b[0])/2,(s.a[1]+s.b[1])/2],
    m3(s.L)+(s.snapped?"":" ✗"), s.snapped?GRN:RED));
  });
  return out;
 }});
