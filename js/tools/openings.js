/* ═══ أدوات الفتحات ═══
   النقر يختار الجدار، والموضع من نقرتك أو من حقل «عند».
   لا تقليم صامت: ما لا يتّسع يُرفَض برسالة تذكر المدى المتاح. */
import "../core/state.js";
import {m2,m3,M,dim2} from "../core/units.js";
import {wallById,wallLen,wallAt,dir} from "../core/walls.js";
import {addOpen,sAt,openPt,openById,allowed,saySpans,okName,OK} from "../core/opens.js";
import {defTool,H,T,rec,ov,ovLen,ovNum,pvLine,pvBand,pvText} from "./registry.js";

const GRN="#5cd98e", RED="#ff6f6f";

/* الموضع على الجدار: حقل «عند» إن كُتب، وإلا إسقاط النقرة.
   c أو 50% يعني المنتصف — أوفر من مطاردة نقطةٍ بالفأرة. */
function sOf(w,p,tid){
 const raw=String(ov(tid,"at")||"").trim();
 const L=wallLen(w);
 if(!raw)return sAt(w,p);
 if(/^(c|م|وسط)$/i.test(raw))return Math.round(L/2);
 const pc=/^(\d*\.?\d+)%$/.exec(raw);
 if(pc)return Math.round(L*parseFloat(pc[1])/100);
 const v=M(raw);
 return (ov(tid,"from")==="b")?(L-v):v;
}
function place(ctx,hit,p,tid,kind){
 const w=wallById(hit.id);
 if(!w)throw new Error("انقر على جدار");
 const W=ovLen(tid,"w"), Hh=ovLen(tid,"h"), sl=ovLen(tid,"sill");
 const s=sOf(w,p,tid);
 const ex={hinge:ov(tid,"hinge"),swing:ov(tid,"swing")};
 if(OK[kind].pan)ex.pan=Math.round(ovNum(tid,"pan"))||1;
 if(kind==="niche"){
  ex.dep=ovLen(tid,"dep");
  ex.face=ov(tid,"face");
 }
 const o=addOpen(w,s,kind,W,Hh,sl,ex);
 rec(ctx,o,"opens");
 H.rep("ok",`${o.id} ${okName(kind)} ${dim2(m2(o.w),m2(o.h))} م `
  +`على ${w.id} عند ${m2(o.s)} م`
  +(o.sill?` · جلسة ${m2(o.sill)} م`:"")
  +(o.dep!=null?` · عمق ${m2(o.dep)} م`:""));
 return o;
}
/* ═══ ترتيبُ الحقولِ هو ما يظهر ═══ المرحلة ٦: الثلاثةُ الأولى ظاهرةٌ
   والباقي وراءَ «المزيد». وأمرُ العرضِ والارتفاعِ محسومٌ: لا فتحةَ بلا
   مقاسٍ يُكتَب. والثالثُ يختلف بنوعِ الفتحةِ، فلا يصلح أن يكون
   «الجلسةَ» للجميعِ: جلسةُ الباب **صفرٌ بتعريفه** فحقلٌ لا يُلمَس أبداً
   يأكل أحدَ المواضعِ الثلاثةِ الغالية. فمن أراد ترقيةَ حقلٍ من إضافاتِه
   إلى الظاهرِ أعلنه في `promote` — وهو ترقيةٌ **في ترتيبِ الأداةِ
   نفسِها** لا جدولٌ ثانٍ ينجرف عنها. */
function mk(id,alias,label,kind,dw,dh,ds,extra,promote){
 const ex=(extra||[]).slice();
 const up=(promote||[]).map(k=>{
  const i=ex.findIndex(f=>f.k===k);
  /* مفتاحٌ مرقّىٌ غيرُ موجودٍ خطأُ برمجةٍ لا خيارُ مستخدمٍ: يُعلَن
     صراحةً لا يُهمَل صامتاً فيختفي حقلٌ ولا يدري أحد. */
  if(i<0)throw new Error(`promote: ${id} لا حقلَ ${k}`);
  return ex.splice(i,1)[0];
 });
 const opts=[
  {k:"w",   label:"العرض م",   type:"len", def:dw},
  {k:"h",   label:"الارتفاع م",type:"len", def:dh}
 ].concat(up,[
  {k:"sill",label:"الجلسة م",  type:"len", def:ds},
  {k:"at",  label:"عند م",     type:"text", def:"",
   hint:"فارغ = من النقر · c = المنتصف · 50% · أو طول بالمتر"},
  {k:"from",label:"من",        type:"sel",
   items:[["a","بداية الجدار"],["b","نهايته"]], def:"a"}
 ],ex);
 defTool({
  id, alias, label,
  hint:"انقر على جدار — الموضع من نقرتك أو من حقل «عند»",
  opts,
  steps:[{p:"انقر موضع الفتحة على جدار (أو اكتب W7@2.4)",
   ent:"wall", entName:"جدار", loop:1,
   entVia:{open:h=>{
    const o=openById(h.id);
    return o?{k:"wall",id:o.wall}:null;
   }},
   each(ctx,hit,p){
    place(ctx,hit,p,id,
     (id==="door")?(ov("door","kind")||"door"):kind);
   }}],
  prev(ctx,g){
   if(!g)return [];
   /* الجدار الذي ستلتقطه النقرة نفسه (من المؤشّر الخام وبنوعه وحده)،
      فيتّفق المُبرَز والنتيجة؛ وإلا الأقرب إلى النقطة الملتقَطة */
   let w=null;
   const hv=T.hover;
   if(hv){
    const h=H.hit(hv[0],hv[1],["open","wall"]);
    if(h){
     const o=(h.k==="open")?openById(h.id):null;
     w=wallById(o?o.wall:h.id);
    }
   }
   if(!w)w=wallAt(g[0],g[1],250);
   if(!w)return [];
   const d=dir(w);
   if(!d)return [];
   const W=ovLen(id,"w")||900;
   const s=Math.round(sOf(w,g,id));
   const A=allowed(w,W,null);
   const ok=A.fits&&A.spans.some(([a,b])=>s>=a&&s<=b);
   const P=t=>[Math.round(w.a[0]+d.ux*t),
               Math.round(w.a[1]+d.uy*t)];
   return [
    pvLine(w.a,P(s),"#ffd06b"),
    pvBand(openPt(w,s-W/2),openPt(w,s+W/2),w.t,ok?GRN:RED),
    pvText(openPt(w,s),`${w.id} · ${m3(s)} م`
     +(ok?"":` ✗ الحرّ ${saySpans(A)}`), ok?GRN:RED)];
  }});
}
mk("door","d باب","باب","door","0.9","2.1","0",[
 {k:"kind", label:"النوع",   type:"sel", seg:1,
  items:[["door","مفرد"],["double","مزدوج"],["sliding","سحب"]],
  def:"door"},
 {k:"hinge",label:"المفصّلة",type:"sel",
  items:[["start","البداية"],["end","النهاية"]],def:"start"},
 {k:"swing",label:"جهة الفتح",type:"sel",
  items:[["left","يسار المسار"],["right","يمينه"]],def:"left"}],
 /* نوعُ البابِ يتغيّر أكثرَ من جلستِه — وجلستُه صفرٌ دائماً */
 ["kind"]);

mk("win","n window شباك نافذه","شباك","window","1.5","1.4","0.9",[
 {k:"pan",label:"المصاريع",type:"num",def:1}]);

mk("fixed","ثابت زجاج","شباك ثابت","fixed","1.2","1.4","0.9",[
 {k:"pan",label:"المصاريع",type:"num",def:1}]);

mk("opening","op فتحه","فتحة صافية","opening","2","2.1","0");
mk("arch","قنطره","فتحة مقنطرة","arch","1.2","2.2","0");
mk("niche","كوه حنيه","كوّة","niche","0.6","1.2","0.9",[
 {k:"dep", label:"العمق م",type:"len",def:"0.10",   /* كان 0.12: لا يتّسع له الجدارُ الافتراضيّ 0.15 (الأقصى 0.11) */
  hint:"الأقصى = سماكة الجدار − 4 سم"},
 {k:"face",label:"الوجه",  type:"sel",
  items:[["l","يسار المسار"],["r","يمينه"]],def:"l"}],
 /* العمقُ هو ما يُميِّز الكوّةَ عن الفتحةِ — لا يُخفى */
 ["dep"]);
