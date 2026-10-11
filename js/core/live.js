/* ═══ الحقول الحيّة — LV ═══
   نصٌّ مشتقٌّ من مصدرٍ معلن، بموضعٍ صريحٍ يُكتب عند الإنشاء ويُحرَّك
   بمقبضه (كيانٌ مكانيٌّ كامل). المشتقُّ هو النصُّ وحده، ولا يُعاد
   حسابه إلا: عند الإنشاء، أو بأمر «تحديث الحقول» الصريح عبر edit().
   وما عدا ذلك يبقى cached كما حُسِب آخر مرّة، ويتوسَّم بنجمةٍ قبل
   نصّه إن قدُم — فلا رقمٌ يتحرّك خلسة (عقد المشروع).

   المصدر سلسلةٌ معلنة: kind:field للعام (meta:scale) ·
   kind:id:field للمعيّن (dim:D7:value). resolveLive يقرأ ولا يكتب،
   وتتسلسل القدَامة: مصدرٌ قديم (بُعدٌ بنصّ بديل، منطقةٌ قديمة)
   يجعل الحقل قديماً. */
import {S,touchView,txtH} from "./state.js";
import {V} from "./validate.js";
import {newId,m3,sqm} from "./units.js";
import {dimById,isOverridden,dimValue} from "./dims.js";
import {areaById,isStale,netArea} from "./areas.js";
import {stById} from "./stairs.js";

const R=v=>Math.round(v);

export const liveById=id=>(S.livefields||[]).find(f=>f.id===id)||null;

/* فكّ المصدر: "dim:D7:value" → {kind,id,field} · "meta:scale" → {kind,id:null,field} */
export function parseSrc(src){
 const P=String(src||"").trim().split(":");
 if(P.length===2&&P[0]&&P[1])return {kind:P[0],id:null,field:P[1]};
 if(P.length===3&&P[0]&&P[1]&&P[2])return {kind:P[0],id:P[1],field:P[2]};
 return null;
}

/* ═══ قراءة المصدر ═══ تعيد {ok,stale,v,why} — قيمةٌ خام وقدَامتها.
   ok=0 لمصدرٍ مجهولٍ أو زائل؛ اليتيمُ لا يُسقَط من الحقل، بل يعرض
   «—» متوسَّماً حتى تُصلح مصدره. */
export function resolveLive(src){
 const p=parseSrc(src);
 if(!p)return {ok:0,stale:0,v:null,
  why:"مصدرٌ لا يُفكّ — مثل meta:scale أو dim:D7:value"};
 const {kind,id,field}=p;
 if(kind==="area"){
  const a=id?areaById(id):(S.areas&&S.areas[0]);
  if(!a||field!=="area")return {ok:0,stale:0,v:null,why:"منطقةٌ غائبة"};
  return {ok:1,stale:isStale(a)?1:0,v:netArea(a)};
 }
 if(kind==="dim"){
  const d=id?dimById(id):null;
  if(!d)return {ok:0,stale:0,v:null,why:"بُعدٌ غائب"};
  if(field==="value")return {ok:1,stale:isOverridden(d)?1:0,v:dimValue(d)};
  if(field==="txt")return {ok:1,stale:isOverridden(d)?1:0,
   v:(d.txt?d.txt:dimValue(d))};
  return {ok:0,stale:0,v:null,why:`حقلُ بُعدٍ مجهول: ${field}`};
 }
 if(kind==="count"){
  const C={walls:S.walls,opens:S.opens,areas:S.areas,cols:S.cols,
   fixt:S.fixt,stairs:S.stairs,dims:S.dims,plines:S.plines,clouds:S.clouds};
  const c=id?C[id]:null;
  if(!c||field!=="count")
   return {ok:0,stale:0,v:null,why:`عددٌ مجهول: ${src}`};
  return {ok:1,stale:0,v:c.length};
 }
 if(kind==="stair"){
  const t=id?stById(id):(S.stairs&&S.stairs[0]);
  if(!t)return {ok:0,stale:0,v:null,why:"درجٌ غائب"};
  if(field==="n")
   return {ok:1,stale:0,v:(t.flights||[]).reduce((s,f)=>s+(+f.n||0),0)};
  return {ok:0,stale:0,v:null,why:`حقلُ درجٍ مجهول: ${field}`};
 }
 if(kind==="meta"){
  if(field==="scale")return {ok:1,stale:0,v:+S.meta.scale||100};
  if(field==="wallH")return {ok:1,stale:0,v:+S.meta.wallH||3000};
  if(field==="level")return {ok:1,stale:0,v:+S.meta.level||0};
  return {ok:0,stale:0,v:null,why:`حقل meta مجهول: ${field}`};
 }
 return {ok:0,stale:0,v:null,why:`مصدرٌ مجهول: ${kind}`};
}

/* الصياغة: م · م² · مم · خام */
export function formatLive(v,fmt){
 const k=String(fmt||"raw");
 if(k==="m")return m3(Math.abs(+v||0));
 if(k==="m2")return sqm(Math.abs(+v||0));
 if(k==="mm")return String(Math.round(+v||0));
 return String(v==null?"":v);
}

/* تقييمٌ حيّ: يعيد {txt,stale,why} بلا أيّ كتابةٍ في الحالة */
export function evaluateLive(f){
 const r=resolveLive(f.src);
 if(!r.ok)return {txt:(f.pre||"")+"—"+(f.suf||""),stale:1,why:r.why};
 return {txt:(f.pre||"")+formatLive(r.v,f.fmt)+(f.suf||""),
  stale:r.stale?1:0,why:""};
}

/* ═══ الإنشاء ═══ المصدر المرفوض يُرمى هنا — قبل أن يُكتب شيء.
   cached يُملأ الآن، والموضع صريحٌ لا يزحف بعده. */
export function addLive(src,pos,opt){
 const o=opt||{};
 const raw={src,pos};
 ["fmt","pre","suf","rot","hm"].forEach(k=>{
  if(o[k]!==undefined&&o[k]!==null)raw[k]=o[k];
 });
 const v=V("live",raw);
 const r=resolveLive(v.src);
 if(!r.ok)throw new Error(r.why||"مصدرٌ لا يُقرأ");
 const fmt=v.fmt||"raw", pre=v.pre||"", suf=v.suf||"";
 const f={id:newId("LV"),src:v.src,pos:v.pos.slice(),
  fmt,pre,suf,rot:v.rot||0,hm:v.hm||1,
  cached:pre+formatLive(r.v,fmt)+suf,stale:r.stale?1:0};
 if(!Array.isArray(S.livefields))S.livefields=[];
 S.livefields.push(f); touchView();
 return f;
}
export function delLive(f){
 if(!Array.isArray(S.livefields))return false;
 const i=S.livefields.indexOf(f);
 if(i<0)return false;
 S.livefields.splice(i,1); touchView();
 return true;
}

/* ═══ فحصٌ مسبق بلا كتابة ═══ هل سيغيّر «التحديث» شيئاً (نصّاً أو وسمَ
   قدَامة)؟ تستعمله الأداة لتتفادى خطوة تراجعٍ فارغة. */
export function liveWouldChange(){
 return (S.livefields||[]).some(f=>{
  const ev=evaluateLive(f);
  return ev.txt!==f.cached||(ev.stale?1:0)!==(f.stale?1:0);
 });
}

/* ═══ التحديث الصريح ═══ يمرّ عبر edit() من الأداة. المنفذ الوحيد الذي
   يغيّر النصَّ المشتقّ. يعيد {n,stale,changed}: عدد ما تغيّر نصّه،
   وعدد المتوسَّم قديماً، وهل تغيّر شيءٌ (نصٌّ أو وسمُ قدَامة). */
export function refreshLive(){
 if(!Array.isArray(S.livefields))return {n:0,stale:0,changed:0};
 let n=0,stale=0,changed=0;
 S.livefields.forEach(f=>{
  const ev=evaluateLive(f);
  const st=ev.stale?1:0;
  if(ev.txt!==f.cached){n++;changed=1}
  if(st!==(f.stale?1:0))changed=1;
  f.cached=ev.txt;
  f.stale=st;
  if(st)stale++;
 });
 if(changed)touchView();
 return {n,stale,changed};
}
export const staleLiveCount=()=>(S.livefields||[])
 .filter(f=>f.stale).length;

/* ═══ أوّلية العرض ═══ النصّ المعروض cached لا المشتقَّ الحي، ونجمةٌ
   بادئةٌ للقديم — نفس لغة النصّ البديل في الأبعاد، وwarn يُلوّنه. */
export function livePrims(f){
 const h=txtH()*(+f.hm||1);
 return [{t:"text",L:"A-ANNO",
  s:((f.stale?"*":"")+(f.cached||"—")),
  x:R(f.pos[0]),y:R(f.pos[1]),h,al:"mc",rot:f.rot||0,
  lid:f.id,oid:f.id,warn:f.stale?1:0}];
}
