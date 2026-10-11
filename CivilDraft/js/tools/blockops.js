/* ═══ عمليات تأليف الكتل — MT3 ═══
   طبقةٌ خلفيةٌ فوق core/blocks.js و core/state.js: كلُّ عمليةٍ
   معاملةُ edit() واحدة، فخطأٌ واحدٌ يرجِع الحالة كلَّها، والتعريفاتُ
   تمرّ بـsafeBlockName/defineBlock → V("blockDef") → checkPrims،
   فلا مسارَ مختصرًا يتجاوز بوّابات التحقق. */

import {S,edit} from "../core/state.js";
import * as BLK from "../core/blocks.js";
import {addPline} from "../core/plines.js";

/* إنشاءُ تعريفٍ من بدائيات مجمَّدة — المتصل (UI) يجمعها من التحديد
   ثم ينادي هذا بالنتيجة، فيبقى هذا الملفّ بلا علاقةٍ بالقماش
   أو ents.js، ويُختبَر على Node مباشرة. */
export function createBlock(name,title,prims,base){
 return edit(()=>{
  if(!name)throw new Error("اسم الكتلة مطلوب");
  const safe=BLK.safeBlockName(name);
  if(BLK.hasBlock(safe))
   throw new Error(`اسم «${safe}» معرَّف مسبقاً — اختر اسماً آخر`);
  return BLK.defineFromPrims(safe,title,prims,base||[0,0]);
 },`إنشاء كتلة ${name}`);
}

/* إعادة التسمية: الاسم الجديد يمرّ بـsafeBlockName، والمثيلات تُنقَل
   من S.blocks قبل حذف التعريف القديم — لا تكسيرَ روابط، ولا غيابَ
   صامتاً لمثيلٍ يبقى يشير إلى اسمٍ لا يُحَلّ. */
export function renameBlock(oldName,newName,title){
 return edit(()=>{
  if(!oldName||!newName)throw new Error("الاسمان القديم والجديد مطلوبان");
  const safe=BLK.safeBlockName(newName);
  const def=BLK.getBlock(oldName);
  if(!def)return false;
  if(safe!==oldName&&BLK.hasBlock(safe))
   throw new Error(`اسم «${safe}» معرَّف مسبقاً`);
  const moved=(S.blocks||[]).filter(b=>b.block===oldName);
  moved.forEach(b=>{b.block=safe});
  const nextTitle=title!==undefined?String(title).slice(0,120):def.title;
  BLK.defineBlock({...def,name:safe,title:nextTitle});
  if(safe!==oldName)BLK.removeBlock(oldName,{force:true});
  return {from:oldName,to:safe,moved:moved.length};
 },`إعادة تسمية كتلة ${oldName}`);
}

export function setBlockTitle(name,title){
 return edit(()=>{
  const def=BLK.getBlock(name);
  if(!def)return false;
  BLK.defineBlock({...def,
   title:String(title==null?"":title).slice(0,120)});
  return true;
 },`تعديل عنوان كتلة ${name}`);
}

/* الحذف: removeBlock نفسُها ترفض وفي المشروع مثيلاتٌ، ورسالتُها
   تسمّي العدد، فيصعد الخطأ إلى المتصل فيُقال للمستخدم. */
export function deleteBlock(name){
 return edit(()=>{
  if(!BLK.getBlock(name))return false;
  BLK.removeBlock(name);
  return true;
 },`حذف كتلة ${name}`);
}

/* ═══ تفكيك مثيل كتلة ═══ P-جديد
   `BLK.explode()` كانت موجودةً منذ البداية ويستعملها الرسمُ والتصديرُ
   وحسابُ الصندوق — ولا طريقَ للمستخدم إليها.

   **والأعمقُ من ذلك:** مثيلُ الكتلة ليس كياناً مسجَّلاً (`defEnt`)،
   فلا إصابةَ له ولا تحديدَ ولا حذف. يُدرَج ويُرسَم ثم لا يُمَسّ. فحتى
   الإصابةُ تُبنى هنا: نُفكِّك المثيلَ ذهنياً ونقيس البعدَ عن أوّلياته.
   الحلُّ الجذريُّ كيانٌ جديدٌ كامل (إصابة · مقابض · حذف · طبقات ·
   تصدير)، وهو أكبرُ من هذه الأداة بكثير — مُسجَّلٌ في
   `audit/09-tools-review.md`.

   والتحويلُ لا يُقطِّع: القوسُ يصير قطعةً بـbulge (tan(sweep/4)) لا
   مضلَّعاً مقرَّباً — نفسُ عقدِ المشروع في blockcollect وdxf. والدائرةُ
   الكاملةُ نصفانِ بـbulge ±1، لأنّ قطعةً واحدةً لا تمثّل 360°. */
const RR=v=>Math.round(v);
/* أوّلياتُ المثيل مسطَّحةً إلى قطعٍ للقياس وحده (الأقواسُ بوترها:
   تقريبٌ مقبولٌ للإصابة لا للتحويل). */
/* أقربُ مثيلٍ إلى نقطةٍ عالمية — أو null. القائمةُ تُمرَّر صريحةً
   فتبقى الدالّةُ خالصةً وتُختبَر بلا حالة. */
export function instanceAt(world,tol,list){
 const L=Array.isArray(list)?list:(S.blocks||[]);
 const T=(tol==null)?300:Math.max(1,+tol||1);
 let best=null, bd=T;
 L.forEach(inst=>{
  const d=BLK.instDist(inst,world[0],world[1]);
  if(d<bd){bd=d; best=inst}
 });
 return best;
}
/* الأوّليةُ ⇒ خطٌّ متعدّدٌ حقيقيّ. الأقواسُ بـbulge لا بالتقطيع. */
function plineArgsOf(p){
 if(p.t==="line")
  return [[p.a,p.b],{closed:0}];
 if(p.t==="pline")
  return [p.pts,{closed:p.closed?1:0}];
 if(p.t==="arc"){
  const a0=(+p.a0||0)*Math.PI/180, a1=(+p.a1||0)*Math.PI/180;
  const at=t=>[RR(p.cx+p.r*Math.cos(t)), RR(p.cy+p.r*Math.sin(t))];
  let sw=a1-a0;
  while(sw>2*Math.PI)sw-=2*Math.PI;
  while(sw<-2*Math.PI)sw+=2*Math.PI;
  /* دائرةٌ كاملةٌ (أو ما يقاربها): نصفانِ — قطعةٌ واحدةٌ لا تمثّل
     360° لأنّ وترَها صفرٌ فلا bulge يصفه. */
  if(Math.abs(Math.abs(sw)-2*Math.PI)<1e-6||Math.abs(sw)<1e-9){
   const sg=(sw<0)?-1:1;
   return [[at(a0),at(a0+sg*Math.PI)],
    {closed:1, bulge:[sg*1,sg*1]}];
  }
  return [[at(a0),at(a1)],{closed:0, bulge:[Math.tan(sw/4)]}];
 }
 return null;
}
/* التفكيك: معاملةٌ واحدة — إمّا كلُّ الأوّليات خطوطاً متعدّدةً
   والمثيلُ مُزال، وإمّا لا شيء. */
export function explodeInstance(inst){
 return edit(()=>{
  if(!inst)throw new Error("لا مثيلَ كتلةٍ هنا — انقر على كتلةٍ مُدرَجة");
  const i=(S.blocks||[]).indexOf(inst);
  if(i<0)throw new Error("المثيلُ لم يبقَ — أعِد الأداة");
  const prims=BLK.explode(inst)||[];
  if(!prims.length)
   throw new Error(`تعريفُ «${inst.block}» مفقودٌ أو فارغ — لا شيءَ يُفكَّك`);
  const made=[];
  let skip=0;
  prims.forEach(p=>{
   const a=plineArgsOf(p);
   if(!a){skip++; return}
   try{made.push(addPline(a[0],a[1]))}
   catch(e){skip++}
  });
  if(!made.length)
   throw new Error("لم ينتج التفكيكُ شيئاً صالحاً — لم يُمَسّ المثيل");
  S.blocks.splice(i,1);
  return {made, name:inst.block, count:made.length, skipped:skip};
 },`تفكيك كتلة ${(inst&&inst.block)||""}`);
}
