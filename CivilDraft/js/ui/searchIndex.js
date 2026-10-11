/* ═══ فهرس البحث الموحّد ═══
   مصدرٌ واحد للتطبيع والتسجيل (score) تستعمله قائمة «مِسطَر»
   (appmenu.js) بدل أن تبني نسختها الخاصّة (كما كانت الحال قديماً:
   score()/build() في palette.js، score()/buildIndex() في
   cmdpalette.js الميت الآن، search() في appmenu.js — دوالّ تطبيعٍ
   مختلفة الجودة لنفس المهمّة بالضبط).

   ملاحظة تبنٍّ تدريجي: js/ui/palette.js (لوحة Ctrl+K الكبرى) تبقى
   بمنطقها الحالي في هذه الدفعة — فهرسها أوسع (يضمّ المقاسات والقوالب
   وسجلّ الأوامر واللقطات وأفعال التطبيق، لا الأدوات والأفعال فقط)
   ونقلها بأمانٍ يحتاج دفعةً مستقلّة. D12-EP3: cmdpalette.js حُذف؛
   هذا الملفّ يخدم appmenu.js وحده الآن. */
import * as R from "../tools/registry.js";
import {ACTIONS} from "./actions.js";

/* norm/toLat/score نُقلت إلى searchcommon.js (مصدرٌ واحد) وتُعاد
   تصديرها هنا للتوافق مع من يستوردها من هذا الملف. */
import {norm,toLat,score} from "./searchcommon.js";
export {norm,toLat,score};

/* ═══ بناء الفهرس ═══ أدواتٌ من registry.js (بأسمائها البديلة alias)
   ثم أفعالٌ من actions.js. كائنٌ خفيف مُعاد لكل استدعاء — الاستدعاء
   في appmenu.js يحدث عند فتح القائمة لا مع كل حرف، فلا كلفة أداء
   ملموسة (نفس نمط buildIndex() الأصلي القديم). */
export function buildIndex(){
 const out=[];
 R.toolList().filter(d=>d&&d.id).forEach(d=>{
  const al=Object.keys(R.TOOLS).filter(k=>R.TOOLS[k]===d&&k!==d.id);
  out.push({
   type:"cmd", id:d.id, label:d.label||d.id,
   hint:d.hint||[d.id,...al].join(" · "),
   hay:norm([d.id,d.label,...al,d.hint||""].join(" ")),
   destruct:!!d.destruct,
   run:{cmd:d.id}
  });
 });
 Object.values(ACTIONS).forEach(a=>{
  out.push({
   type:"act", id:a.id, label:a.n,
   hint:"أمر",
   hay:norm(`${a.n} ${a.id}`),
   destruct:false,
   run:{act:a.id}
  });
 });
 return out;
}

/* ═══ البحث ═══ يبني الفهرس عند كل نداء — الاستدعاء غير حارّ (انظر
   الملاحظة أعلاه)؛ لو صار الفهرس ثقيلاً مستقبلاً يُضاف كاشٌ يُبطَل
   بعدد أدوات registry كما في palette.js (BODY/NT). */
export function search(q,limit=9){
 const idx=buildIndex();
 const n=norm(q), na=norm(toLat(q));
 if(!n)return idx.slice(0,limit);
 return idx
  .map(it=>({it,s:Math.max(score(it.hay,n),na!==n?score(it.hay,na):-1)}))
  .filter(x=>x.s>=0)
  .sort((a,b)=>b.s-a.s)
  .slice(0,limit)
  .map(x=>x.it);
}
