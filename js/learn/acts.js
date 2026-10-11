/* ═══ الواجهة التعليمية: منفّذُ الأفعال ═══ المرحلة ٢
   مصدرٌ واحد لثلاثة مستهلكين: تهيئةُ الدرس (setup) في الصندوق،
   و«شاهدني» في الواجهة، والاختبار. الأفعالُ صيغةُ tplscript نفسها
   (tool · at · type · enter · esc · opt) وأفعالُ المرحلة ٦ (ui · click · addLevel · level) وفوقها pick: تحديدُ ما تحت نقطةٍ
   كما تفعل نقرةُ اليد بلا أداة. كلُّها تمرّ بـregistry كاللوحة. */
import * as R from "../tools/registry.js";
import {S,edit} from "../core/state.js";
import {addLevel} from "../tools/levelmgr.js";
import {COLL} from "../core/ents.js";

/* المرحلة ٦: أفعالُ الواجهة (فتحُ نافذة · نقرُ زرٍّ فيها) تمرّ بخطّافٍ تركّبه
   ui/learn.js — فالمنفّذُ يبقى بلا DOM ويُختبَر على Node بخطّافٍ مزيَّف. */
let UIRUN=()=>true;
export const setUiRunner=f=>{UIRUN=(typeof f==="function")?f:(()=>true)};

/* المرحلة ٧: صيغةُ قوالب tplscript نفسها (فيلا العرض): تحديدٌ بنصّ
   "last:fix:5" · "idx:area:3,5" · "none" — كما في tools/tplscript.js */
function pickSpec(spec){
 if(spec==="none")return [];
 const q=/^idx:(\w+):([\d,]+)$/.exec(String(spec||""));
 if(q){const L=S[COLL[q[1]]]||[]; return q[2].split(",").map(i=>L[+i]).filter(Boolean).map(e=>({k:q[1],id:e.id}))}
 const m=/^(last|first|all):(\w+)(?::(\d+))?$/.exec(String(spec||""));
 if(!m)return [];
 const L=S[COLL[m[2]]]||[], n=+m[3]||1;
 const E=m[1]==="all"?L:(m[1]==="last"?L.slice(-n):L.slice(0,n));
 return E.map(e=>({k:m[2],id:e.id}));
}
export function runAct(a){
 if(!a)return false;
 if(a.at&&Array.isArray(a.at[0])){a.at.forEach(p=>R.feedPoint(p.slice(),p.slice())); return true}
 if(typeof a.pick==="string"){if(R.active())R.cancel(true); R.H.setSel(pickSpec(a.pick)); return true}
 if(a.onLevel!=null){S.meta.level=+a.onLevel; return true}
 if(a.meta){Object.assign(S.meta,a.meta); return true}
 if(a.ch!=null||a.say!=null)return true;           /* علاماتُ الفصول في القوالب */
 if(a.tool){if(R.active())R.cancel(true); R.begin(a.tool,a.arg); return true}
 if(a.at){R.feedPoint(a.at.slice(),a.at.slice()); return true}
 if(a.type!=null){R.feedText(String(a.type)); return true}
 if(a.enter){R.enter(); return true}
 if(a.ui){if(R.active())R.cancel(true); return UIRUN({act:a.ui})!==false}       /* فعلٌ من الشريط (نافذة) */
 if(a.click){return UIRUN({click:a.click})!==false}                               /* زرٌّ داخل نافذة */
 if(a.addLevel){addLevel(); return true}                                          /* «+ طابق» */
 if(a.level!=null){edit(()=>{S.meta.level=+a.level},"طابق نشط",{bump:"view"}); return true}
 if(a.opt){R.setOpt(a.opt[0],a.opt[1],a.opt[2]); return true}   /* خيارُ أداة كما يضبطه الشريط */
 if(a.esc){if(R.active())R.cancel(true); return true}
 if(a.pick){
  if(R.active())R.cancel(true);
  const h=R.H.hit(a.pick.at[0],a.pick.at[1],[a.pick.k]);
  R.H.setSel(h?[h]:[]);
  return !!h;
 }
 return false;
}
export const runActs=L=>(L||[]).every(a=>runAct(a)!==false);
/* موضعُ الفعل على اللوحة (مم) — لمؤشّر «شاهدني» */
export const actPoint=a=>{
 if(!a)return null;
 if(a.at)return Array.isArray(a.at[0])?a.at[0]:a.at;
 return (a.pick&&a.pick.at)||null;
};
