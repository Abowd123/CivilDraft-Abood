/* ═══ تنظيف المشروع — منطقٌ خالص؛ الواجهة في ui/hygiene.js ═══
   تقريرٌ قبل الحذف، لا حذفَ صامت.
   يقرأ layCounts() وblockUses() الموجودتين ولا يضيف شيئاً إلى النواة.
   ما يُعدّ فارغاً: طبقةٌ مخصَّصة (ليست من BASE) بلا كيانات · كتلةٌ بلا
   مثيلات. المصنعيّةُ والكتلُ الافتراضية (door/window/table) مستثناة —
   الأولى لا تُحذَف أصلاً (delLay ترفضها) والثانية يعيد الإقلاعُ تعريفها.
   الحذف كلُّه في edit() واحدة: خطوةُ تراجعٍ واحدة، وأيُّ رفضٍ يُبلَّغ
   ولا يُبتلَع. */
import {edit} from "../core/state.js";
import {LAYS,layCounts,delLay} from "../core/layers.js";
import {LAYERS as BASE} from "../core/laydef.js";
import {blockList,blockUses,removeBlock} from "../core/blocks.js";

export const PROTECTED_BLOCKS=new Set(["door","window","table"]);

export function buildReport(){
 const c=layCounts();
 const emptyLayers=LAYS().filter(l=>!BASE[l.n]&&(c[l.n]||0)===0);
 const unusedBlocks=blockList().filter(b=>
  !PROTECTED_BLOCKS.has(b.name)&&blockUses(b.name)===0);
 return {emptyLayers,unusedBlocks};
}

/* التنفيذ منفصلٌ عن الواجهة فيُختبَر بلا DOM. يعيد ما حُذف فعلاً
   وما رُفض مع سببه. */
export function applyCleanup(lays,blks){
 const res={lays:0,blks:0,fail:[]};
 edit(()=>{
  (lays||[]).forEach(n=>{
   try{ if(delLay(n)!==false)res.lays++ }
   catch(e){res.fail.push(`${n}: ${e.message}`)}
  });
  (blks||[]).forEach(n=>{
   try{ if(removeBlock(n))res.blks++ }
   catch(e){res.fail.push(`${n}: ${e.message}`)}
  });
 },"تنظيف المشروع");
 return res;
}
