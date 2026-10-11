/* ═══ كلُّ نوعِ قطعةٍ ينجو من التطبيع ═══ (عيبٌ حرجٌ أُصلح 2026-10-03)
   ensureShape كانت تقبل الصحّيات التسع وحدها، فالأثاثُ والكهرباءُ (27 نوعاً)
   يُحذَفان عند أوّل تراجعٍ أو فتحِ ملفٍّ أو إعادةِ تحميل — بصمت إلّا من سطرٍ
   في سجلّ الشكل. هذا الحارسُ يضع **كلَّ** نوعٍ في FK ويمرّره بالمسارات الثلاثة.
   التشغيل:  node js/tests/fixt-kinds.test.js                            */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const ST=await import("../core/state.js");
const FX=await import("../core/fixt.js");
const PRJ=await import("../io/project.js");
const {S,newState,ensureShape,edit,undo}=ST;
const put=()=>{newState(); edit(()=>FX.FKINDS.forEach((k,i)=>FX.addFix(k,[i*3000,0],0)),"كلّ الأنواع")};

group("القائمةُ ليست قصيرة",()=>{ok(FX.FKINDS.length>=36,`${FX.FKINDS.length} نوعاً (9 صحّيات + 12 أثاث + 15 كهرباء)`)});
group("ensureShape لا يحذف نوعاً معروفاً",()=>{
 put(); const n=S.fixt.length; ensureShape();
 eq(S.fixt.length,n,"العددُ كما هو بعد التطبيع");
 eq(S.fixt.map(f=>f.kind).join(),FX.FKINDS.join(),"والأنواعُ كلُّها");
});
group("التراجعُ عن تعديلٍ لاحقٍ لا يمحو القطع",()=>{
 put(); const n=S.fixt.length;
 edit(()=>{S.fixt[0].x+=10},"نقلٌ صغير"); undo();
 eq(S.fixt.length,n,`${n} قطعةً بعد التراجع`);
});
group("الحفظُ ثم الفتحُ يحفظ الأثاثَ والكهرباء",()=>{
 put(); const n=S.fixt.length; const txt=PRJ.toJSON(); newState(); PRJ.fromJSON(txt);
 eq(S.fixt.length,n,`${n} قطعةً بعد الفتح`);
 ok(S.fixt.some(f=>f.kind==="bed2")&&S.fixt.some(f=>f.kind==="soc"),"سريرٌ وفيشةٌ بينها");
});
group("والنوعُ المجهولُ حقّاً ما زال يُرفَض",()=>{
 newState(); S.fixt.push({id:"F99",kind:"rocket",x:0,y:0,rot:0,w:100,d:100,level:0});
 ensureShape(); eq(S.fixt.length,0,"«rocket» يُحذَف كما يجب");
});
process.exit(summary()?1:0);
