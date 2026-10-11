/* ═══ الحالة · التاريخ ═══
   لا كاش استنتاج هنا: VER عدّاد نسخة يُبطِل كاش العرض وحده.
   كل تعديل يمرّ بـ edit() فيصير ذرّياً وله خطوة تراجع واحدة.
   الطبقات جدولٌ حيّ في S.layers (انظر core/layers.js) — بياناتُ
   مشروعٍ لا تفضيلَ نافذة، لأن إخفاء طبقةٍ يغيّر ما يُصدَّر. */
import {clamp,deg,setIdc,idc,bumpIdc,idNum,newId} from "./units.js";
import * as Store from "../io/store.js";
import {DEFLAYS} from "./laydef.js";
import {TBDEF,TBLIM} from "./tabledef.js";
import {PT} from "./coords.js";
import {isConvexRing} from "./geom.js";
import {LIM} from "./limits.js";
import * as SH from "./shape.js";
export {LAYERS} from "./laydef.js";   /* توافقٌ لمن كان يستورده هنا */
/* دورةٌ ظاهرية (layers.js يستورد S وVER وtouch من هنا) مقبولةٌ في
   وحدات ES: normLays لا تُنادى وقت التحميل بل من ensureShape —
   أي بعد اكتمال الوحدتين. */
import * as LY from "./layers.js";
import * as LTN from "./ltypes.js";
import * as DST from "./dimstyles.js";
import * as HT from "./hatches.js";
/* isArc وarcParams تُنادَيان داخل ensureShape (وقتَ التشغيل لا وقت
   التحميل)، فالدورةُ الظاهرة (state ↔ walls عبر layers/entreg) آمنةٌ
   كسابقتها الموثَّقة في تعليق layers.js أعلاه. */
import {isArc,arcParams} from "./walls.js";
import {FKINDS} from "./fixt.js";   /* دائريٌّ آمن: يُقرأ داخل ensureShape لا عند التحميل */
import {normLevel,levelTag} from "./level.js";
/* مقاساتُ الورقة المقبولة — مرآةٌ لمفاتيح SIZES في sheet.js (لا يُستورَد
   هنا: sheet.js يستورد state.js فتنشأ دورة) + custom. يفحص الاتفاقَ بينهما
   اختبارُ الورقة في tests/run.js. */
const SZOK={A0:1,A1:1,A2:1,"A2+":1,A3:1,"A3+":1,A4:1,custom:1};
/* تعريفات الكتل (DEFS في blocks.js) خارج S — حالةُ وحدةٍ لا حالةُ
   مشروع. لكنّها جزءٌ من اللقطة: مثيلٌ يُحفَظ بلا تعريفه يُرسَم
   فارغاً بعد إعادة الفتح. وblocks.js لا يستورد شيئاً، فلا دورة. */
import {toJSON as blocksToJSON,fromJSON as blocksFromJSON,
        installBlockHook,installBlockSnapshotFn,
        installBlockUsageFn} from "./blocks.js";
import {BLK_LAY} from "./laydef.js";
/* تُسجَّل مرّةً عند التحميل — لا تحتاج S جاهزةً، فsnapshot() تقرأ
   S وقت النداء الفعليّ (قُبيل كل defineBlock/removeBlock) لا وقت
   التسجيل. */
installBlockSnapshotFn(()=>snapshot());
/* عدُّ مثيلات كتلة: removeBlock تسأله لترفض حذفَ تعريفٍ مستعمَل */
installBlockUsageFn(name=>{
 let n=0;
 (S.blocks||[]).forEach(b=>{if(b&&b.block===name)n++});
 return n;
});

export const LSK=Store.LSK;   /* أُبقي للتوافق مع من يستورده */
export const saveMode=()=>Store.mode();

export const COLLS=["walls","opens","areas","dims","chains","anno",
 "cols","fixt","stairs","roofs","plines","clouds","livefields","tables",
 "struct"];
/* ═══ المخطّطُ الكبير ═══ (المرحلة ٥ من خطّة الفحص · مخاطرة P4-006)
   إعادةُ بناءِ المشهدِ بعد كلِّ تعديلٍ ≈ ١٦٥ م.ث لكلِّ ألفِ كيانٍ مقيساً
   (perf.budget: 1k=117 · 10k=1648). تحسينُ render مؤجَّلٌ بقرارِ المالك،
   فالأقلُّ أن يُقال للمستخدم **قبل** أن يظنّ البرنامجَ متجمّداً.
   يُقال مرّةً عند عبورِ كلِّ عتبة، ويُعاد تسليحُه إن نزل الحجمُ تحتَ ٨٠٪
   منها — لا سيلَ رسائل مع كلِّ نقرة. دالّةٌ خالصةٌ بحالةٍ صغيرة، تُختبَر. */
export const BIG_PLAN=Object.freeze({warn:5000, slow:10000, msPerK:165});
const BIG_ARMED={warn:1, slow:1};
export const planSize=()=>COLLS.reduce((n,c)=>n+((S&&Array.isArray(S[c]))?S[c].length:0),0)
 +((S&&Array.isArray(S.blocks))?S.blocks.length:0);
export function sizeNotice(n){
 n=(n==null)?planSize():+n||0;
 for(const k of ["warn","slow"])
  if(n<BIG_PLAN[k]*0.8)BIG_ARMED[k]=1;
 const k=(n>=BIG_PLAN.slow&&BIG_ARMED.slow)?"slow"
  :(n>=BIG_PLAN.warn&&BIG_ARMED.warn)?"warn":null;
 if(!k)return null;
 BIG_ARMED[k]=0; if(k==="slow")BIG_ARMED.warn=0;
 const sec=Math.max(0.1,Math.round(n*BIG_PLAN.msPerK/1e5)/10);   /* n÷1000 × م.ث ÷ 1000 = ث، لعُشرٍ واحد */
 return {sev:k==="slow"?"wr":"in", n, sec,
  msg:`مخطّطٌ كبير: ${n} عنصراً — كلُّ تعديلٍ يعيد بناءَ المشهد في نحو `
   +`${sec} ث، فتأخُّرُ الاستجابةِ متوقَّعٌ لا عطل.`
   +(k==="slow"?" قسّمه على طوابقَ أو ملفّات، أو أخفِ الطبقاتِ غيرَ اللازمة.":"")};
}
/* كلّ مجموعة كيانات ↔ نوع الكيان في entreg. مصدرٌ وحيد تستعمله
   المجموعات (تطبيع) والمقارنة (رسم الفروق). */
export const COLL_KIND={
 walls:"wall", opens:"open", areas:"area", cols:"col", fixt:"fix",
 stairs:"stair", roofs:"roof", dims:"dim", chains:"chain", anno:"anno",
 plines:"pline", clouds:"cloud", livefields:"live", tables:"table",
 struct:"struct"
};
export const KIND_COLL=Object.fromEntries(
 Object.entries(COLL_KIND).map(([c,k])=>[k,c]));
const KEYS=["meta"].concat(COLLS,
 ["grid","opt","rb","os","pol","sheet","sheets","activeSheet","title",
  "layers","layst","ltypes","dimstyles","hatches","ref","blocks","underlay",
  "levelDefs","callouts","groups"]);

export const DEF=()=>({
 meta:{name:"PLAN",scale:100,txtMM:2.2,
  tExt:250,tInt:150,tLow:200,lowH:1000,wallH:3000,
  snap:50,dimDec:2,dimTick:"slash",north:0,level:0,
  date:new Date().toISOString().slice(0,10)},
 /* ═══ تعريفات الطوابق — B ═══ كيانٌ صريحٌ بجانب meta.level (الطابق
    النشط يبقى رقماً في meta كما كان). كلُّ تعريفٍ منسوبٌ برقمه n،
    وطابق 0 موجودٌ افتراضاً فلا مشروع بلا طابقٍ معرَّف. */
 levelDefs:[{n:0,name:"أرضي",elev:0,h:3000,slab:200,color:"#cccccc"}],
 walls:[],opens:[],areas:[],dims:[],chains:[],anno:[],
  cols:[],fixt:[],stairs:[],roofs:[],plines:[],clouds:[],livefields:[],tables:[],struct:[],callouts:[],groups:[],blocks:[],
 /* off: إزاحةُ بالونات المحاور بالمليمتر الورقي فوق الخلوص
    الافتراضي — 0 يُبقي المخرَج كما كان حرفاً بحرف. */
 grid:{xs:[],ys:[],off:0},
 /* levelAll (F4): 0 افتراضاً — المشهد يرسم الطابق النشط وحده.
    1 يُعطِّل النطاق فيعود المشهد مكدَّساً كل الطوابق معاً، خيارٌ
    صريحٌ من شارة الطوابق لا سلوكٌ ضمنيّ. */
 opt:{joins:1,fill:"none",colSolo:0,levelAll:0,ghost:0,plotsOnly:0},
 rb:{ortho:1,snap:1,polar:0,grips:1,ends:1,grid:1,gsnap:1,paths:1,
  dyn:1},
 os:{end:1,mid:1,int:1,per:1,par:0,near:0,nod:1,ref:1,cen:1,tan:0},
 pol:{inc:15,extra:[]},
 /* tbStyle: "col" عمودُ أسفل اليمين كما كان · "side" شريطٌ
    كاملُ الارتفاع بجداوله. الافتراضي col فلا يتغيّر تسليمٌ قديم. */
 sheet:{on:0,size:"A3",orient:"l",margin:12,tb:1,tbStyle:"col",north:1,
  cx:null,cy:null,customW:420,customH:297},
 /* ═══ الأوراق المتعددة والمنافذ — المرحلة 4 ═══
    sheets قائمةُ أوراقٍ فعليّةٍ (كلٌّ بمنافذه) تُحفَظ وتدخل التاريخ،
    activeSheet معرّفُ النشطة منها. بياناتُ مشروعٍ كسائر الحقول:
    إضافتها/تعديلها يمرّ بـedit() كغيرها. فارغةٌ افتراضياً — فلا
    ينكسر أي مشروعٍ قديم يقرأ S.sheet المفردة وحدها. */
 sheets:[], activeSheet:null,
 title:{proj:"",owner:"",loc:"",sheet:"A-101",rev:"0",by:""},
 /* الطبقات بياناتُ مشروع: تُحفَظ وتدخل التاريخ لأنها تغيّر ما
    يُصدَّر — لا تفضيلَ نافذة. وS.lay القديم يُطوى فيها بالهجرة. */
 layers:DEFLAYS(),
 layst:{},
 /* أنواع الخطوط: بياناتُ مشروعٍ كحالات الطبقات — normLtypes
    يعيد بناءها من المصنع عند كل ensureShape */
 ltypes:LTN.defLtypes(),
 /* طُرز الأبعاد: بياناتُ مشروعٍ كأنواع الخطوط — فارغةٌ افتراضاً،
    والمصدرُ الافتراضيّ يبقى meta (dimDec/dimTick) كما كان */
 dimstyles:DST.defDimstyles(),
 /* أنماط التهشير: بياناتُ مشروع — نمطان مصنعيّان (ANSI31 عام،
    SOLID مصمت) تُقرأ زواياهما حيَّاً في style.js:hatchOf */
 hatches:HT.defHatches(),
 ref:{name:"",units:"",uf:1,enc:"",guessed:0,
  tr:{k:1,rot:0,dx:0,dy:0},ents:[],src:{},off:{},
  skip:{},trunc:0,approx:{}},
 /* ═══ الصورة المرجعية ═══
    كانت حالةَ وحدةٍ في underlay.js، لا تدخل pack ولا التاريخ —
    فتضيع عند الإغلاق، ومعايرتُها لا تُتراجَع. وبعد اليوم بياناتُ
    مشروعٍ كالمرجع المستورد: تُحفَظ وتُتراجَع وتُصدَّر مع اللقطة.
    وsrc عنوانُ data: URL قد يكون كبيراً (صورةٌ بميغابايتات) —
    والحدُّ الأقصى المفروض عند التحميل في setImage. */
 underlay:{src:"",x:0,y:0,mpp:0.01,rot:0,opacity:0.5,
  visible:0,w:0,h:0}
});
export const S=DEF();

/* ═══ ثلاث نسخ ═══
   n  عامّة: تتقدّم بكل تعديل. يقرأها كاش المشهد والفهرس المكاني —
      وهما يتبعان كل شيء يُرسَم أو يُصاب.
   g  هندسية: الجدران والأعمدة وخيار الدمج. وهي وحدها ما يُبطِل
      polyBool وحلقات المناطق وشبكة الأطراف وشبكة المراسي
      وبصمات المناطق وجدول الطبقات.
   o  الفتحات: تُطرَح من الأجسام ولا تُبطِل الحلقات.

   والسبب: سحب مقبض بُعدٍ كان يعيد بناء اتحاد ألف مضلّعٍ في كل
   إطار، وstampOf لكل منطقة، وشبكتَي الأطراف والمراسي، وكاش
   الألوان. والفصل يجعل الكلفة تتبع ما تغيّر فعلاً.

   وtouch يُقدّم n وg معاً بقصد — لا n وحده كما يبدو أوّل النظر:
   سبعةُ مواضع تُعدّل هندسةً بـtouch (applyField · اللوحة المفردة ·
   stretchApply · edit · finish · ops · trace)، فلو كان الافتراض
   سريعاً لأخرج أحدُها مشهداً قديماً. والافتراض الآمن يجعل النسيان
   يُكلِّف أداءً لا صحّة، والإعلان في المواضع الحارّة وحدها:
   سحبُ المقابض وبنّاؤو المجموعات. */
export const VER={n:0,g:0,o:0};
S.__ver=0;
export const touch    =()=>{VER.n++; VER.g++; S.__ver=VER.n};
export const touchGeom=()=>{VER.n++; VER.g++; S.__ver=VER.n};
export const touchOpen=()=>{VER.n++; VER.o++; S.__ver=VER.n};
export const touchView=()=>{VER.n++;          S.__ver=VER.n};
/* عدّاد إصدار الحالة — يُقرأ للكاشات (المقارنة) */
export const stateVer=()=>VER.n;
export const txtH=()=>Math.max(1,S.meta.txtMM*Math.max(1,S.meta.scale));
/* ═══ سجلُّ التطبيع — 2.4 ═══
   PT هنا هي coords.PT الصارمة (2.2): تعيد null لما ليس نقطةً كاملةً
   منتهيةً داخل الحدّ — لا [0,0]. كانت تعريفاً محلّياً يُسقِط الفاشل
   صفراً، فجدارٌ نقطتُه «abc» يصير جداراً من الأصل بلا تنبيه.
   وكل تعديلٍ في ensureShape يُسجَّل بنوعه (normalize · repair ·
   drop) وكيانه وسببه، وshapeNotes تُجمِّعه — لا اختفاءَ صامت.
   والسجلّ يتراكم حتى يُقرأ (ensureShape تُنادى أكثر من مرّة في
   تحميلٍ واحد: loadState ثم fromJSON) ولا يدخل pack. */
const LOG=()=>S.__shapeLog||(S.__shapeLog=SH.newLog());
const dropE=(k,id,why,o)=>SH.drop(LOG(),k,id,why,o);
const repE=(k,id,why,o)=>SH.repair(LOG(),k,id,why,o);
/* قيمةٌ حاضرةٌ غُيِّرت فعلاً — لا تقريباً ولا افتراضاً لغائب */
const nz=(k,id,f,b,a,why)=>{
 /* P3-004: null قيمةٌ حاضرةٌ لا غائبة — تحويلها إلى افتراضيٍّ تبديلٌ
    يُقال. وكان الصمتُ عنها يُفقِد الملفَّ تطابقَه الحرفيّ بعد تحميلٍ
    واحد (hm:null ⇒ 1) بلا سطرٍ يشرح. undefined وحدها غياب. */
 if(b===undefined)return;
 if(typeof b==="number"&&typeof a==="number"&&Math.abs(a-b)<1)return;
 if(String(b)===String(a))return;
 SH.norm(LOG(),k,id,f,b,a,why||"غير صالحة أو خارج المدى");
};

/* ═══ منع تكرار المعرّفات ═══
   كان فحصُ المكرَّر محصوراً في blocks (D1-02)؛ لا مثيل له في COLLS،
   فملفٌّ محرَّرٌ يدوياً فيه معرّفٌ مكرّرٌ في walls (مثلاً) يمرّ صامتاً،
   والتعديلُ يقع على مثيلٍ لم يَختَرْه المستخدم. هنا الأوّلُ يبقى
   واللاحقُ يُسقَط ويُسجَّل باسم معرّفه. */
function dedupColl(list,k){
 const seen=new Set(), out=[], drop=[];
 for(const e of list){
  if(e&&e.id!=null){
   if(seen.has(e.id)){
    drop.push(e.id);
    continue;
   }
   seen.add(e.id);
  }
  out.push(e);
 }
 if(drop.length){
  const kind=k==="fixt"?"fix":k.replace(/s$/,"");
  drop.forEach(id=>dropE(kind,id,
   "معرّف مكرر — أُبقِي الأوّل وأُسقِط اللاحق"));
 }
 return out;
}

/* ═══ التطبيع الدفاعي ═══
   يُصلح ملفّاً محرَّراً يدوياً، ولا يمسّ هندسةً رسمها المستخدم. */
export function ensureShape(){
 /* أنواع الخطوط قبل الطبقات: normLays تقرأ lt عبر ltOk فلا بدّ
    أن تكون الأنواع جاهزة أوّلاً */
 LTN.normLtypes();
 /* طُرز الأبعاد بعد أنواع الخطوط: مستقلّةٌ عن الطبقات ولا تُقرأ فيها */
 DST.normDimstyles();
 /* أنماط التهشير: مستقلّةٌ عن الطبقات والأبعاد أيضاً */
 HT.normHatches();
 /* الطبقات أوّلاً: يقرأها العدّ والتصفية وresolve، فلا يجوز أن
    يسبقها شيء */
 LY.normLays();
 const d=DEF();
 const rawMeta=Object.assign({},S.meta||{});
 S.meta=Object.assign(d.meta,S.meta||{});
 S.meta.scale=clamp(parseInt(S.meta.scale,10)||100,1,5000);
 S.meta.txtMM=clamp(+S.meta.txtMM||2.2,0.5,20);
 S.meta.tExt=Math.max(50,+S.meta.tExt||250);
 S.meta.tInt=Math.max(50,+S.meta.tInt||150);
 S.meta.tLow=Math.max(50,+S.meta.tLow||200);
 S.meta.wallH=clamp(+S.meta.wallH||3000,1500,8000);
 S.meta.lowH=clamp(Math.round(+S.meta.lowH||1000),200,S.meta.wallH-200);
 S.meta.snap=clamp(+S.meta.snap||50,1,5000);
 S.meta.dimDec=clamp(parseInt(S.meta.dimDec,10),0,3);
 if(!isFinite(S.meta.dimDec))S.meta.dimDec=2;
 if(!/^(slash|arrow)$/.test(S.meta.dimTick))S.meta.dimTick="slash";
 /* زاوية الشمال: بياناتُ مشروعٍ لا تفضيلَ عرض — تُصدَّر مع اللوحة */
 S.meta.north=deg(+S.meta.north||0);
 S.meta.level=normLevel(S.meta.level);
 Object.keys(d.meta).forEach(k=>nz("meta",null,k,rawMeta[k],S.meta[k]));

 /* P4-005: النوعُ الخاطئ كان يصير مصفوفةً فارغةً بصمت، فيضيع محتوى
    الحقل كلُّه بلا سطرٍ واحد. اليوم يُسجَّل بنوعه ويُعرَض عند الفتح. */
 COLLS.forEach(k=>{
  if(Array.isArray(S[k]))return;
  const had=S[k];
  S[k]=[];
  if(had===undefined||had===null)return;
  dropE(k==="fixt"?"fix":k.replace(/s$/,""),null,
   `«${k}» لم تكن مصفوفة (${Array.isArray(had)?"array":typeof had})`
   +" — أُفرغت ولم يُقرأ منها شيء");
 });
 /* ═══ بند 31-36: سقف عدد الكيانات ═══
    LIM.elements.max لكل مجموعة. ما فوقه يُقصّ من الذيل ويُسجَّل في سجلّ
    التطبيع (عدداً وسبباً) — لا صمت. القصّ قبل التطبيع الفرديّ: لا نعالج
    ما سيُسقَط. (حدّ التعريفات LIM.blockDefs يفرضه blocks.js على التعريفات
    لا على المثيلات، فلا يُستعمل هنا.) */
 COLLS.forEach(k=>{
  const mx=LIM.elements.max, n=S[k].length-mx;
  if(n>0){
   dropE(k==="fixt"?"fix":k.replace(/s$/,""),null,`${n} عنصراً فوق الحدّ ${mx} — قُصّت الزيادة`,{n});
   S[k]=S[k].slice(0,mx);
  }
 });
  /* ═══ مثيلات العناصر ═══
     الكتلة تعريفٌ ثابت خارج الحالة، والمثيل بيانات مشروع صريحة. */
  if(!Array.isArray(S.blocks))S.blocks=[];
  S.blocks=S.blocks.filter(b=>{
   if(!b||typeof b.block!=="string"){
    dropE("block",b&&b.id,"اسم الكتلة مفقود أو ليس نصّاً");
    return false;
   }
   /* +null=0 كانت تُمرِّر إحداثيّاً غائباً فيصير المثيل في الأصل */
   const q=PT([b.x,b.y]);
   if(!q){
    dropE("block",b.id,"إحداثيّ x أو y غير صالح");
    return false;
   }
   b.x=q[0]; b.y=q[1];
   return true;
  });
  if(S.blocks.length>LIM.elements.max){
   const n=S.blocks.length-LIM.elements.max;
   dropE("block",null,`${n} مثيلاً فوق الحدّ ${LIM.elements.max} — قُصّت الزيادة`,{n});
   S.blocks=S.blocks.slice(0,LIM.elements.max);
  }
  S.blocks.forEach(b=>{
   const r0=b.rot, k0=b.scale, kx0=b.scaleX, ky0=b.scaleY;
   b.rot=isFinite(+b.rot)?+b.rot:0;
   b.scale=(isFinite(+b.scale)&&+b.scale>0)?+b.scale:1;
   /* scaleX/scaleY: مقياسٌ مستقلٌّ لكل محور — غيابهما (مشاريع قديمة
      قبل هذه الدفعة) يُطبَّع إلى 1، أي محايدٌ تماماً فوق scale. */
   b.scaleX=(isFinite(+b.scaleX)&&+b.scaleX>0)?+b.scaleX:1;
   b.scaleY=(isFinite(+b.scaleY)&&+b.scaleY>0)?+b.scaleY:1;
   nz("block",b.id,"rot",r0,b.rot); nz("block",b.id,"scale",k0,b.scale);
   nz("block",b.id,"scaleX",kx0,b.scaleX); nz("block",b.id,"scaleY",ky0,b.scaleY);
   b.mirror=b.mirror?1:0;
   /* «0» ليست في جدول الطبقات — كانت الافتراضيَّ فتفلت المثيلاتُ من
      المدير. تُهاجَر إلى طبقتها، وما سمّاه المستخدم صراحةً يبقى. */
   const ly=String(b.layer==null?"":b.layer).slice(0,80);
   b.layer=(ly===""||ly==="0")?BLK_LAY:ly;
   if(b.id==null)b.id=newId("b");
  });
  // D1-02: منع تكرار id في blocks بعد الترقيم
  {
   const seen=new Set();
   const uniq=[];
   for(const b of S.blocks){
    if(seen.has(b.id)){
     dropE("block",b.id,"معرّف مكرر — أُسقط المكرر");
     continue;
    }
    seen.add(b.id);
    uniq.push(b);
   }
   S.blocks=uniq;
  }
 S.grid=Object.assign({xs:[],ys:[],off:0},S.grid||{});
 ["xs","ys"].forEach(k=>{
  if(!Array.isArray(S.grid[k]))S.grid[k]=[];
  const g0=S.grid[k].length;
  const gv=S.grid[k].filter(v=>typeof v==="number"&&isFinite(v)
   &&Math.abs(v)<=LIM.coord.max);
  if(gv.length!==g0)repE("grid",k,`${g0-gv.length} قيمةً غير منتهيةٍ أو خارج الحدّ أُسقطت`,
   {verb:"أُصلحت",noun:"محاور"});
  S.grid[k]=[...new Set(gv.map(v=>Math.round(v)))].sort((a,b)=>a-b);
 });
 /* إزاحة البالونات: رقمٌ منتهٍ بين 0 و120 مم ورقي — وما سواه 0 */
 {const o=+S.grid.off;
  S.grid.off=(isFinite(o)&&o>0)?Math.min(120,Math.round(o)):0;}
 S.opt=Object.assign(d.opt,S.opt||{});
 if(!/^(none|hatch|solid)$/.test(S.opt.fill))S.opt.fill="none";
 S.opt.joins=S.opt.joins?1:0;
 S.opt.colSolo=S.opt.colSolo?1:0;
 S.opt.levelAll=S.opt.levelAll?1:0;
 S.opt.ghost=S.opt.ghost?1:0;
 S.opt.plotsOnly=S.opt.plotsOnly?1:0;
 S.rb=Object.assign(d.rb,S.rb||{});
 /* المفاتيح الجديدة تأخذ افتراضها من d.rb — فالملفّ القديم
    يبقى على سلوكه: شبكةٌ تُرسَم وتُلتقَط ومساراتٌ تُرى */
 ["grid","gsnap","paths","dyn"].forEach(k=>{S.rb[k]=S.rb[k]?1:0});
 S.os=Object.assign(d.os,S.os||{});
 S.os.ref=(S.os.ref==null)?1:(S.os.ref?1:0);
 S.os.cen=(S.os.cen==null)?1:(S.os.cen?1:0);
 S.os.tan=(S.os.tan==null)?0:(S.os.tan?1:0);
 S.pol=Object.assign(d.pol,S.pol||{});
 S.pol.inc=clamp(parseInt(S.pol.inc,10)||15,1,90);
 if(!Array.isArray(S.pol.extra))S.pol.extra=[];
 if(S.rb.polar&&S.rb.ortho)S.rb.ortho=0;

 /* ═══ الجدران ═══ */
 const WT={ext:1,int:1,low:1}, AL={c:1,l:1,r:1};
 /* كان الفلتر يفحص a[0] وb[1] فقط — فجدارٌ فاسدُ a[1] أو b[0] يمرّ ثم
    يصير PT صفراً. اليوم PT الصارمة على النقطتين كاملتَين، والفاشل
    يُسقِط الجدار ويُسجَّل باسم معرّفه. */
 S.walls=S.walls.filter(w=>{
  if(!w||typeof w!=="object"){dropE("wall",null,"كيانٌ فارغ");return false}
  const A=PT(w.a), B=PT(w.b);
  if(!A||!B){
   dropE("wall",w.id,"إحداثيٌّ ناقص أو غير صالح في a أو b");
   return false;
  }
  w.a=A; w.b=B;
  return true;
 });
 S.walls.forEach(w=>{
  const ty0=w.type, al0=w.align, t0=w.t;
  if(!WT[w.type])w.type="int";
  if(!AL[w.align])w.align="c";
  nz("wall",w.id,"type",ty0,w.type); nz("wall",w.id,"align",al0,w.align);
  const df=(w.type==="ext")?S.meta.tExt
   :((w.type==="low")?S.meta.tLow:S.meta.tInt);
  w.t=clamp(Math.round(+w.t||df),50,1000);
  nz("wall",w.id,"t",t0,w.t,"سماكةٌ خارج 50..1000");
  if(w.type==="low")w.h=Math.max(200,Math.round(+w.h||S.meta.lowH));
  else delete w.h;
  /* القوس: bulge اختياريّ · خارج الحدّ يُقسَر · الصفر يُطرَح
     فيبقى الجدار مستقيماً بلا حقلٍ زائد */
  if(isFinite(+w.bulge)&&Math.abs(+w.bulge)>1e-4)
   w.bulge=clamp(+w.bulge,-8,8);
  else delete w.bulge;
  /* ═══ دفاعٌ ثالث ═══
     منفذ التحميل. addWall يرفضها وarcTess تحميها، وهذا يمنعها
     من الدخول إلى الحالة أصلاً — فتبقى البقيّة نظيفة.
     ويُطرح bulge بدل قسره إلى حدٍّ أقصى: قسرُ الانحناء يُنتج
     قوساً لا يشبه ما رسمه المستخدم؛ وطرحُه يُنتج جداراً مستقيماً
     مرئيّاً مفهوم الشكل — سلوكٌ مرئيٌّ خيرٌ من فسادٍ صامت. */
  if(w.bulge!=null){
   const P=arcParams(w);
   if(!P||P.R<=w.t/2+1){
    delete w.bulge;
    repE("wall",w.id,"نصف قطره أصغر من نصف سماكته فلا يُبنى — راجع "
     +"الجدران القوسيّة في المخطّط",
     {verb:"استُقيم",noun:"جدار قوسيّ"});
   }
  }
  /* المستوى: الغائبُ في ملفٍّ قديمٍ = النشط · والموجود يُطبَّع */
  w.level=(w.level==null)?S.meta.level:normLevel(w.level);
 });
 /* ═══ الفتحات ═══
    تُحذف اليتيمة — حاضنها زال. ولا يُقلَّم موضعها:
    الخارجة عن مدى جدارها تُبلَّغ ولا تُصلَح.
    والحدود العليا هي حدود المُثبِّتات نفسها (batch.js): قيدٌ
    بمنفذَين يُخرج قيمةً لا تُرى ثم تمنع تعديل جدارها. */
 const OKV={door:1,double:1,sliding:1,window:1,fixed:1,
  opening:1,arch:1,niche:1};
 const WMAP=new Map(S.walls.map(w=>[w.id,w]));
 /* اليتيمةُ تُطرَح (حاضنها زال)، والفتحةُ على جدارٍ قوسيّ كذلك.
    addOpen يمنعها، وهذا المنفذ الثاني يُغلَق: ملفٌّ محرَّرٌ يدوياً
    كان يمرّ بصمت، ثم تُسقَط على الوتر في موضعٍ لا يمتّ للجسم بصلة. */
 /* المطروح يُسجَّل باسم معرّفه وسببه (2.4) — كان يُعدّ فقط. */
 S.opens=S.opens.filter(o=>{
  if(!o||typeof o!=="object"){dropE("open",null,"كيانٌ فارغ");return false}
  if(!WMAP.has(o.wall)){
   dropE("open",o.id,"يتيمة — جدارُها غير موجود في الملفّ");
   return false;
  }
  if(isArc(WMAP.get(o.wall))){
   dropE("open",o.id,"كانت على جدرانٍ قوسيّة — الفتحات للجدار المستقيم "
    +"فقط. أعد وضعها على جدارٍ مستقيم");
   return false;
  }
  return true;
 });
 S.opens.forEach(o=>{
  const k0=o.kind, w0=o.w, h0=o.h, sl0=o.sill;
  if(!OKV[o.kind])o.kind="door";
  nz("open",o.id,"kind",k0,o.kind,"نوعٌ مجهول");
  o.s=Math.round(+o.s||0);
  o.w=Math.max(100,Math.round(+o.w||900));
  o.h=clamp(Math.round(+o.h||2100),100,6000);
  o.sill=clamp(Math.round(+o.sill||0),0,6000);
  nz("open",o.id,"w",w0,o.w); nz("open",o.id,"h",h0,o.h);
  nz("open",o.id,"sill",sl0,o.sill);
  o.hinge=(o.hinge==="end")?"end":"start";
  o.swing=(o.swing==="right")?"right":"left";
  if(o.pan!=null)o.pan=clamp(Math.round(o.pan),1,6);
  if(o.dep!=null){
   /* الجدار موجودٌ يقيناً: اليتيمة حُذفت قبل هذا السطر */
   const W2=WMAP.get(o.wall);
   const mx=Math.max(20,((W2&&W2.t)||150)-40);
   o.dep=clamp(Math.round(o.dep),20,mx);
  }
  if(o.face)o.face=(o.face==="r")?"r":"l";
  o.level=(o.level==null)?S.meta.level:normLevel(o.level);
 });
 /* ═══ المناطق ═══
    حلقات مخزَّنة. لا تُعاد حساباً ولا تُقلَّم — الاتّساق
    يُبلَّغ عنه بالبصمة في areas.js، ولا يُصلَح خلسة. */
 /* حلقةٌ فيها رأسٌ فاسد تُسقَط كلُّها: حذفُ رأسٍ وإبقاءُ الباقي كان
    يغيّر شكل المنطقة ومساحتها بصمت. */
 S.areas=S.areas.filter(a=>{
  if(!a||typeof a!=="object"){dropE("area",null,"كيانٌ فارغ");return false}
  if(!Array.isArray(a.ring)){
   dropE("area",a.id,"الحلقة ليست مصفوفة");
   return false;
  }
  const R2=[];
  for(const p of a.ring){
   const q=PT(p);
   if(!q){dropE("area",a.id,"رأسٌ فاسد في الحلقة — أُسقطت المنطقة كلُّها");return false}
   R2.push(q);
  }
  a.ring=R2;
  return true;
 });
 S.areas.forEach(a=>{
  a.name=String(a.name==null?"":a.name).slice(0,40);
  a.stamp=String(a.stamp||"");
  a.showArea=a.showArea?1:0;
  if(!/^(none|tint|hatch)$/.test(a.fill))a.fill="tint";
  /* نمطُ الهاشور: اسمٌ معرَّفٌ وإلّا يُحذَف فيرجع إلى ANSI31.
     ولا يُحذَف صامتاً إن كان مكتوباً وغيرَ معرَّف — يُسجَّل. */
  if(a.pat!=null){
   if(S.hatches&&S.hatches[a.pat]){a.pat=String(a.pat)}
   else{
    repE("area",a.id,`نمطُ هاشورٍ غيرُ معرَّف «${a.pat}» — `
     +`رجعت إلى ANSI31`);
    delete a.pat;
   }
  }
  if(a.lp&&isFinite(a.lp[0])&&isFinite(a.lp[1]))a.lp=PT(a.lp);
  else delete a.lp;
  a.level=(a.level==null)?S.meta.level:normLevel(a.level);
 });
 S.areas=S.areas.filter(a=>{
  if(a.ring.length>2)return true;
  dropE("area",a.id,`حلقةٌ من ${a.ring.length} رأساً — الأدنى 3`);
  return false;
 });

 /* ═══ الأبعاد ═══
    نقطتان صريحتان وموضعُ خطٍّ صريح. لا ترتبط بجدار،
    فلا تُحذَف ولا تُزحَف — «المعلَّق» يُبلَّغ عنه في dims.js. */
 S.dims=S.dims.filter(x=>{
  if(!x||typeof x!=="object"){dropE("dim",null,"كيانٌ فارغ");return false}
  if(x.kind==="rad"||x.kind==="dia"){
   const C=PT(x.c);
   if(!C){dropE("dim",x.id,"مركز نصف القطر غير صالح");return false}
   x.c=C;
   x.r=Math.max(10,Math.round(+x.r||0));
   if(x.leader){const L=PT(x.leader); if(L)x.leader=L; else delete x.leader}
   return true;
  }
  if(x.kind==="ang"){
   const Vc=PT(x.vertex);
   if(!Vc){dropE("dim",x.id,"رأس الزاوية غير صالح");return false}
   x.vertex=Vc;
   if(x.p1){const p=PT(x.p1); if(p)x.p1=p; else delete x.p1}
   if(x.p2){const p=PT(x.p2); if(p)x.p2=p; else delete x.p2}
   x.r=clamp(Math.round(+x.r||2000),200,20000);
   return true;
  }
  const A=PT(x.a), B=PT(x.b);
  if(!A||!B){
   dropE("dim",x.id,"إحداثيٌّ ناقص أو غير صالح في a أو b");
   return false;
  }
  x.a=A; x.b=B;
  return true;
 });
 S.dims.forEach(x=>{
  if(x.kind==="rad"||x.kind==="dia"||x.kind==="ang"){
   /* لا حاجة لفحص kind — مضبوطٌ أعلاه */
  }else{
   const k0=x.kind;
   if(!/^(h|v|al)$/.test(x.kind))x.kind="h";
   nz("dim",x.id,"kind",k0,x.kind,"نوعٌ مجهول");
   x.pos=Math.round(+x.pos||0);
  }
  if(x.txt!=null){
   x.txt=String(x.txt).slice(0,24);
   if(!x.txt)delete x.txt;
  }
  /* الطراز: يُحفَظ اسماً لا يُنسَخ — والمجهولُ يبقى نصّاً فتعيده
     styleOf إلى الافتراضي عند العرض، ويُصلَح بصمتٍ إن فُقد. */
  if(x.style==null){
   delete x.style;
  }else{
   const s0=x.style;
   x.style=String(x.style).slice(0,32)||null;
   if(!x.style)delete x.style;
   nz("dim",x.id,"style",s0,x.style,"اسمٌ غير صالح اقتُصّ");
  }
 });
 /* ═══ السلاسل ═══ قيَم مكتوبة — لا تُطابَق ولا تُصحَّح */
 S.chains=S.chains.filter(c=>{
  if(!c||typeof c!=="object"){dropE("chain",null,"كيانٌ فارغ");return false}
  if(!Array.isArray(c.vals)){
   dropE("chain",c.id,"vals ليست مصفوفة");
   return false;
  }
  const B=PT(c.base);
  if(!B){dropE("chain",c.id,"نقطة الأساس غير صالحة");return false}
  c.base=B;
  return true;
 });
 S.chains.forEach(c=>{
  c.axis=(c.axis==="v")?"v":"h";
  c.pos=Math.round(+c.pos||0);
  const badV=c.vals.filter(v=>!isFinite(+v)||v===null).length;
  if(badV)SH.norm(LOG(),"chain",c.id,"vals",`${badV} قيمة`,"10",
   "قيمٌ غير رقميّة صُيّرت الحدَّ الأدنى");
  c.vals=c.vals.map(v=>Math.max(10,Math.round(+v||0))).slice(0,60);
  if(c.style!=null){
   const s0=c.style;
   c.style=String(c.style).slice(0,32)||null;
   if(!c.style)delete c.style;
   nz("chain",c.id,"style",s0,c.style,"اسمٌ غير صالح اقتُصّ");
  }
  c.total=c.total?1:0;
  /* flip اختياريّ: يُطبَّع إلى 1 أو يُحذَف — فلا يبقى حقلٌ زائفٌ
     في ملفٍّ محفوظ ولا يتغيّر مخرَجُ سلسلةٍ لا تحمله */
  if(c.flip)c.flip=1; else delete c.flip;
 });
 S.chains=S.chains.filter(c=>c.vals.length);

 /* ═══ النصوص والقوائد والمناسيب ═══ */
 const AKV={text:1,lead:1,level:1,mtext:1,slope:1};
 S.anno=S.anno.filter(a=>{
  if(a&&AKV[a.kind])return true;
  dropE("anno",a&&a.id,"نوعٌ مجهول أو كيانٌ فارغ");
  return false;
 });
 /* موضعُ النصّ والمنسوب: كان +undefined||0 يضعه في الأصل بلا ذكر.
    اليوم موضعٌ فاسد يُسقِط التأشير. والقائد يُسقِط رؤوسه الفاسدة
    ويُسجَّل الإصلاح، ويسقط كلُّه إن بقي أقلّ من نقطتين (أدناه). */
 S.anno=S.anno.filter(a=>{
  if(a.kind==="lead"||a.kind==="slope")return true;
  const q=PT([a.x,a.y]);
  if(!q){dropE("anno",a.id,"موضعٌ ناقص أو غير صالح (x أو y)");return false}
  a.x=q[0]; a.y=q[1];
  return true;
 });
 S.anno.forEach(a=>{
  if(a.kind==="lead"){
   const P0=Array.isArray(a.pts)?a.pts:[];
   a.pts=P0.map(PT).filter(Boolean);
   if(a.pts.length!==P0.length)
    repE("anno",a.id,`${P0.length-a.pts.length} رأساً فاسداً في القائد أُسقط`);
  }
  /* سهمُ الميل §٣: نقطتانِ ونسبةٌ — والنصُّ **مُشتَقٌّ** لا مخزَّن،
     فيُعاد بناؤه في كلِّ تحميلٍ من `slope` و`fmt`. فملفٌّ محرَّرٌ
     يدوياً بنصٍّ يكذب على نسبته يُصحَّح ولا يُصدَّق. */
  if(a.kind==="slope"){
   const P0=Array.isArray(a.pts)?a.pts:[];
   a.pts=P0.map(PT).filter(Boolean).slice(0,2);
   const v0=a.slope;
   a.slope=clamp(Math.round((+a.slope||1)*100)/100,0.1,25);
   nz("anno",a.id,"slope",v0,a.slope,"الميلُ خارج 0.1–25٪");
   if(a.fmt!=="ratio")a.fmt="pct";
   /* ولا نصَّ يُخزَّن: `slope.js` يبنيه عند الرسم من `slope`
      و`fmt`. ولا تُستورَد dims.js هنا (دورةٌ: هي تستورد هذا
      الملفَّ)، فالاشتقاقُ يبقى في موضعه الواحدِ عند الراسم. */
   delete a.s;
  }
  if(a.kind==="level"){
   a.z=Math.round(+a.z||0);
   a.pre=String(a.pre==null?"":a.pre).slice(0,8);
  }else if(a.kind!=="slope"){
   /* سهمُ الميل بلا نصٍّ مخزَّن (حُذف أعلاه) — كان هذا الفرعُ يعيده
      «s:""» فيختلف المشروعُ بعد الحفظ والفتح عمّا قبلهما */
   const s0=a.s;
   a.s=String(a.s==null?"":a.s).slice(0,LIM.text.max);
   if(typeof s0==="string"&&s0.length>a.s.length)
    nz("anno",a.id,"s",s0,a.s,`نصٌّ فوق ${LIM.text.max} محرفاً قُصّ`);
   const hm0=a.hm;
   a.hm=clamp(+a.hm||1,0.4,6);
   nz("anno",a.id,"hm",hm0,a.hm,"ارتفاعُ النصّ غير صالحٍ أو خارج 0.4–6");
  }
  if(a.kind==="text"){
   a.rot=deg(+a.rot||0);
   if(!/^(bl|bc|ml|mc)$/.test(a.al))a.al="bc";
  }
  /* الفقرة: عرضُ العمود هو ما يُخزَّن، واللفُّ يُحسَب عند الرسم —
     فعرضٌ فاسدٌ لا يُسقِط النصَّ بل يُعاد إلى حدِّه ويُسجَّل. §٣/١٤ */
  if(a.kind==="mtext"){
   a.rot=deg(+a.rot||0);
   if(a.al!=="bl")a.al="ar";
   const w0=a.wid;
   a.wid=clamp(Math.round(+a.wid||3000),200,200000);
   nz("anno",a.id,"wid",w0,a.wid,"عرضُ الفقرة خارج 0.2–200 م");
  }
 });
 S.anno=S.anno.filter(a=>{
  /* سهمُ الميل: نقطتانِ تكفيانِ — نصُّه مُشتَقٌّ فلا يُشترَط */
  const ok=(a.kind==="lead")
   ? (a.pts.length>1&&a.s)
   : (a.kind==="slope")
   ? (a.pts.length>1)
   : (a.kind==="level"?true:!!a.s);
  if(!ok)dropE("anno",a.id,(a.kind==="lead")
   ?"القائد يحتاج نقطتين ونصّاً"
   :(a.kind==="slope")?"سهمُ الميل يحتاج نقطتين":"نصٌّ فارغ");
  return ok;
 });

 /* ═══ الأعمدة ═══ الدمج عرضٌ لا تعديل، فلا يُخزَّن منه شيء */
 S.cols=S.cols.filter(c=>{
  if(!c||typeof c!=="object"){dropE("col",null,"كيانٌ فارغ");return false}
  const q=PT([c.x,c.y]);
  if(!q){dropE("col",c.id,"إحداثيٌّ x أو y ناقص أو غير صالح");return false}
  c.x=q[0]; c.y=q[1];
  return true;
 });
 S.cols.forEach(c=>{
  c.kind=(c.kind==="circ")?"circ":"rect";
  c.w=clamp(Math.round(+c.w||300),100,4000);
  c.h=(c.kind==="circ")?c.w:clamp(Math.round(+c.h||c.w),100,4000);
  c.rot=(c.kind==="circ")?0:deg(+c.rot||0);
  if(!/^(conc|steel|stone)$/.test(c.type))c.type="conc";
  if(c.tag!=null){
   c.tag=String(c.tag).slice(0,10);
   if(!c.tag)delete c.tag;
  }
  c.level=(c.level==null)?S.meta.level:normLevel(c.level);
 });
 /* ═══ العناصرُ الإنشائية ═══ §٣/١٢
    ثلاثةُ أنواعٍ في مجموعةٍ واحدة، فكلُّ نوعٍ يُطبَّع بحقوله وحدَها:
    خلطُها في حلقةٍ واحدةٍ كان سيكتب `w` على بلاطةٍ لا تعرفه. */
 const SKV={beam:1,footing:1,slab:1};
 if(!Array.isArray(S.struct))S.struct=[];
 S.struct=S.struct.filter(e=>{
  if(!e||typeof e!=="object"){dropE("struct",null,"كيانٌ فارغ");return false}
  if(!SKV[e.kind]){dropE("struct",e.id,"نوعٌ مجهول");return false}
  if(e.kind==="slab"){
   const P0=Array.isArray(e.pts)?e.pts:[];
   e.pts=P0.map(PT).filter(Boolean);
   if(e.pts.length!==P0.length)
    repE("struct",e.id,`${P0.length-e.pts.length} رأساً فاسداً أُسقط`);
   if(e.pts.length<3){
    dropE("struct",e.id,"البلاطةُ دون ثلاثةِ رؤوسٍ صالحة");
    return false;
   }
   if(e.pts.length>120){
    const n0=e.pts.length;
    e.pts=e.pts.slice(0,120);
    repE("struct",e.id,`${n0} رأساً قُصَّ إلى 120`);
   }
   return true;
  }
  if(e.kind==="beam"){
   const A=PT(e.a), B=PT(e.b);
   if(!A||!B){dropE("struct",e.id,"طرفُ الكمرةِ ناقصٌ أو فاسد");return false}
   e.a=A; e.b=B;
   if(Math.hypot(B[0]-A[0],B[1]-A[1])<100){
    dropE("struct",e.id,"طولُ الكمرةِ أصغرُ من أن يُرسَم");
    return false;
   }
   return true;
  }
  const q=PT([e.x,e.y]);
  if(!q){dropE("struct",e.id,"موضعُ القاعدةِ ناقص");return false}
  e.x=q[0]; e.y=q[1];
  return true;
 });
 S.struct.forEach(e=>{
  const cl=(v,lo,hi,dflt)=>clamp(Math.round(+v||dflt),lo,hi);
  if(e.kind==="beam"){
   const w0=e.w, d0=e.d;
   e.w=cl(e.w,100,3000,250);
   e.d=cl(e.d,150,3000,500);
   nz("struct",e.id,"w",w0,e.w,"عرضُ الكمرةِ خارج 0.1–3 م");
   nz("struct",e.id,"d",d0,e.d,"عمقُ الكمرةِ خارج 0.15–3 م");
   delete e.pts; delete e.x; delete e.y; delete e.rot; delete e.th;
  }else if(e.kind==="footing"){
   const w0=e.w;
   e.w=cl(e.w,300,12000,1200);
   e.h=cl(e.h,300,12000,e.w);
   e.rot=deg(+e.rot||0);
   e.th=cl(e.th,80,1200,400);
   nz("struct",e.id,"w",w0,e.w,"ضلعُ القاعدةِ خارج 0.3–12 م");
   delete e.pts; delete e.a; delete e.b; delete e.d;
  }else{
   const t0=e.th;
   e.th=cl(e.th,80,1200,150);
   nz("struct",e.id,"th",t0,e.th,"سماكةُ البلاطةِ خارج 0.08–1.2 م");
   delete e.a; delete e.b; delete e.x; delete e.y;
   delete e.w; delete e.d; delete e.rot;
  }
  if(!/^(conc|steel)$/.test(e.mat))e.mat="conc";
  if(e.tag!=null){
   e.tag=String(e.tag).slice(0,10);
   if(!e.tag)delete e.tag;
  }
  e.level=(e.level==null)?S.meta.level:normLevel(e.level);
 });

 /* ═══ الأدوات الصحية ═══ إحداثيات صريحة — لا رابطة تُحفَظ */
 /* ═══ عيبٌ حرجٌ أُصلح (2026-10-03) ═══ كانت القائمةُ مكتوبةً بيدٍ بالصحّيات
    التسع وحدها، فلمّا أُضيف الأثاثُ (12) والكهرباءُ (15) إلى FK صار كلُّ
    سريرٍ وفيشةٍ «نوعاً مجهولاً» يُحذَف عند **أوّل تراجعٍ أو فتحِ ملفٍّ أو
    إعادةِ تحميل**. المصدرُ الآن واحد: FKINDS من fixt.js، ويحرسه
    fixt-kinds.test.js. */
 const FKV=Object.fromEntries(FKINDS.map(k=>[k,1]));
 S.fixt=S.fixt.filter(f=>{
  if(!f||typeof f!=="object"){dropE("fix",null,"كيانٌ فارغ");return false}
  if(!FKV[f.kind]){dropE("fix",f.id,"نوعٌ مجهول");return false}
  const q=PT([f.x,f.y]);
  if(!q){dropE("fix",f.id,"إحداثيٌّ x أو y ناقص أو غير صالح");return false}
  f.x=q[0]; f.y=q[1];
  return true;
 });
 S.fixt.forEach(f=>{
  f.rot=deg(+f.rot||0);
  f.w=clamp(Math.round(+f.w||400),80,4000);
  f.d=clamp(Math.round(+f.d||400),80,4000);
  if(f.mir)f.mir=1; else delete f.mir;
  f.level=(f.level==null)?S.meta.level:normLevel(f.level);
 });
 /* ═══ الدرج ═══ الأصل: type و flights=[{a,b,n}]، وما عداها مشتقّ.
    والدرج القديم (a,b,n) يُرحَّل هنا إلى رحلةٍ واحدة (straight). */
 S.stairs=S.stairs.filter(s=>{
  if(!s||typeof s!=="object"){dropE("stair",null,"كيانٌ فارغ");return false}
  if(!Array.isArray(s.flights)){
   const A=PT(s.a), B=PT(s.b);
   if(!A||!B){
    dropE("stair",s.id,"إحداثيٌّ ناقص أو غير صالح في a أو b");
    return false;
   }
   s.flights=[{a:A,b:B,n:clamp(Math.round(+s.n||12),2,80)}];
   s.type="straight";
   delete s.a; delete s.b; delete s.n;
   repE("stair",s.id,"هُجِّر من a,b,n إلى flights");
   return true;
  }
  const fl=[];
  for(const f of s.flights){
   const A=f&&PT(f.a), B=f&&PT(f.b);
   if(!A||!B){
    dropE("stair",s.id,"إحداثيٌّ ناقص أو غير صالح في إحدى الرحلات");
    return false;
   }
   fl.push({a:A,b:B,n:clamp(Math.round(+f.n||6),2,80)});
  }
  if(!fl.length){
   dropE("stair",s.id,"لا رحلات");
   return false;
  }
  s.flights=fl;
  return true;
 });
 S.stairs.forEach(s=>{
  /* legacy a,b,n بقيت مع flights (ملفٌّ هجين): flights هي الأصل */
  delete s.a; delete s.b; delete s.n;
  if(s.type!=="L"&&s.type!=="U")s.type="straight";
  /* النوع يحكم عدد الرحلات: straight=1 · L وU=2 */
  if(s.type==="straight"&&s.flights.length>1)s.flights.length=1;
  if(s.type!=="straight"&&s.flights.length<2){
   s.type="straight"; delete s.landing;
   repE("stair",s.id,"رحلةٌ واحدة فقط — عُدّ درجاً مستقيماً");
  }
  if(s.type!=="straight"&&s.flights.length>2)s.flights.length=2;
  s.w=clamp(Math.round(+s.w||1000),600,6000);
  s.up=(s.up==="dn")?"dn":"up";
  if(s.type==="straight"){
   delete s.landing;
   s.cut=clamp(+s.cut||0,0,0.95);
  }else{
   const l=s.landing||{};
   s.landing={w:clamp(Math.round(+l.w||s.w),600,6000),
    d:clamp(Math.round(+l.d||s.w),600,6000)};
   s.cut=0;
  }
  if(s.h!=null){
   s.h=clamp(Math.round(s.h),200,8000);
   if(!s.h)delete s.h;
  }
  s.level=(s.level==null)?S.meta.level:normLevel(s.level);
 });
 /* ═══ السقف ═══ حلقة + نوع + ميل + خطّ جمالون + مصارف. لا بصمة ولا
    stale: يرسمه المستخدم، فلا شيء مشتقّ هنا يُعاد حسابه. */
 if(!Array.isArray(S.roofs))S.roofs=[];
 S.roofs=S.roofs.filter(r=>{
  if(!r||typeof r!=="object"){dropE("roof",null,"كيانٌ فارغ");return false}
  if(!Array.isArray(r.ring)){dropE("roof",r.id,"الحلقة ليست مصفوفة");return false}
  const R2=[];
  for(const p of r.ring){
   const q=PT(p);
   if(!q){dropE("roof",r.id,"رأسٌ فاسد — أُسقط السقف");return false}
   R2.push(q);
  }
  r.ring=R2;
  return true;
 });
 S.roofs.forEach(r=>{
  r.name=String(r.name||"").slice(0,40);
  if(!/^(flat|gable|hip|shed)$/.test(r.type))r.type="flat";
  r.slope=clamp(Math.round(+r.slope||5),0,45);
  r.h=clamp(Math.round(+r.h||S.meta.wallH),200,8000);
  if(r.ridge){
   const a=Array.isArray(r.ridge)?PT(r.ridge[0]):null;
   const b=Array.isArray(r.ridge)?PT(r.ridge[1]):null;
   if(a&&b)r.ridge=[a,b]; else delete r.ridge;
  }
  if(!Array.isArray(r.drains))r.drains=[];
  r.drains=r.drains.map(PT).filter(Boolean).slice(0,20);
  r.level=(r.level==null)?S.meta.level:normLevel(r.level);
 });
 S.roofs=S.roofs.filter(r=>{
  if(r.ring.length>2)return true;
  dropE("roof",r.id,`حلقةٌ من ${r.ring.length} — الأدنى 3`);
  return false;
 });

 /* ═══ الخطوط المتعددة الحرة — PL ═══ */
 if(!Array.isArray(S.plines))S.plines=[];
 S.plines=S.plines.filter(p=>{
  if(!p||typeof p!=="object"){dropE("pline",null,"كيانٌ فارغ");return false}
  if(!Array.isArray(p.pts)){dropE("pline",p.id,"pts ليست مصفوفة");return false}
  const P2=[];
  for(const q of p.pts){
   const r=PT(q);
   if(!r){dropE("pline",p.id,"رأسٌ فاسد — أُسقط الخطّ كله");return false}
   P2.push(r);
  }
  p.pts=P2;
  return true;
 });
 S.plines.forEach(p=>{
  p.closed=p.closed?1:0;
  if(Array.isArray(p.bulge)){
   p.bulge=p.bulge.slice(0,p.pts.length).map(v=>{
    const b=+v;
    if(!isFinite(b)||Math.abs(b)<1e-4)return 0;
    return clamp(b,-8,8);
   });
   if(p.bulge.every(b=>b===0))delete p.bulge;
  }else delete p.bulge;
  p.level=(p.level==null)?S.meta.level:normLevel(p.level);
 });
 S.plines=S.plines.filter(p=>{
  if(p.pts.length>=2)return true;
  dropE("pline",p.id,`نقطةٌ واحدة — الأدنى 2`);
  return false;
 });

 /* ═══ سحب المراجعة — RC ═══ */
 if(!Array.isArray(S.clouds))S.clouds=[];
 S.clouds=S.clouds.filter(c=>{
  if(!c||typeof c!=="object"){dropE("cloud",null,"كيانٌ فارغ");return false}
  if(!Array.isArray(c.ring)){dropE("cloud",c.id,"الحلقة ليست مصفوفة");return false}
  const R2=[];
  for(const q of c.ring){
   const r=PT(q);
   if(!r){dropE("cloud",c.id,"رأسٌ فاسد — أُسقطت السحابة");return false}
   R2.push(r);
  }
  c.ring=R2;
  return true;
 });
 S.clouds.forEach(c=>{
  c.r=clamp(Math.round(+c.r||500),50,5000);
  c.label=String(c.label==null?"":c.label).slice(0,60);
  c.level=(c.level==null)?S.meta.level:normLevel(c.level);
 });
 S.clouds=S.clouds.filter(c=>{
  if(c.ring.length>2)return true;
  dropE("cloud",c.id,`حلقةٌ من ${c.ring.length} — الأدنى 3`);
  return false;
 });
 /* ═══ الجداول الموضوعة — TB ═══ P-جديد (الأولوية ٧)
    موضعٌ ونوعٌ ومقاسٌ فقط: الصفوفُ تُقرأ حيّةً عند الرسم فلا شيءَ
    هنا يمكن أن يَقدُم. والنوعُ المجهولُ يرجع إلى «open» ويُقال. */
 if(!Array.isArray(S.tables))S.tables=[];
 S.tables=S.tables.filter(t=>{
  if(!t||typeof t!=="object"){dropE("table",null,"كيانٌ فارغ");return false}
  const p=PT([t.x,t.y]);
  if(!p){dropE("table",t.id,"موضعٌ فاسد");return false}
  t.x=p[0]; t.y=p[1];
  return true;
 });
 S.tables.forEach(t=>{
  if(!TBDEF[t.kind]){
   repE("table",t.id,`نوعُ جدولٍ مجهول «${t.kind}» — رجع إلى `
    +`جدول الأبواب والنوافذ`);
   t.kind="open";
  }
  t.w =clamp(Math.round(+t.w ||20000),TBLIM.col.min,TBLIM.col.max*8);
  t.rh=clamp(Math.round(+t.rh||3000),TBLIM.row.min,TBLIM.row.max);
  t.level=(t.level==null)?S.meta.level:normLevel(t.level);
  /* lay: مفتاحُ الرموز لطبقةٍ واحدة (1.1.0 · د) — نصٌّ قصيرٌ أو لا شيء */
  if(t.lay!=null&&(t.kind!=="sym"||typeof t.lay!=="string"||!t.lay||t.lay.length>32))delete t.lay;
 });

 /* ═══ الحقول الحيّة — LV ═══ الموضعُ صريحٌ والمصدرُ معلن. المصدرُ
    المجهولُ لا يُسقَط (يعرض «—» متوسَّماً كبُعدٍ معلَّق): يُتوسَّم
    قديماً ولا يُصلَح خلسة. cached إن غاب (ملفٌّ محرَّرٌ يدوياً)
    يُملأ «—» ويُعلَم قديماً حتى يمرّ بتحديثٍ صريح. */
 if(!Array.isArray(S.livefields))S.livefields=[];
 S.livefields=S.livefields.filter(f=>{
  if(!f||typeof f!=="object"){dropE("live",null,"كيانٌ فارغ");return false}
  if(f.id==null)f.id=newId("LV");
  const q=PT(f.pos);
  if(!q){dropE("live",f.id,"موضعٌ ناقص أو غير صالح");return false}
  f.pos=q;
  return true;
 });
 S.livefields.forEach(f=>{
  f.src=String(f.src==null?"":f.src).slice(0,200);
  f.fmt=String(f.fmt==null?"raw":f.fmt).slice(0,8)||"raw";
  f.pre=String(f.pre==null?"":f.pre).slice(0,40);
  f.suf=String(f.suf==null?"":f.suf).slice(0,40);
  f.rot=deg(+f.rot||0);
  f.hm=clamp(+f.hm||1,0.4,6);
  let miss=0;
  if(f.cached==null){f.cached="—"; miss=1}
  else f.cached=String(f.cached).slice(0,200);
  f.stale=(f.stale||miss)?1:0;
 });
 /* ═══ الورقة والعنوان ═══ */
 S.sheet=Object.assign(d.sheet,S.sheet||{});
 if(!SZOK[S.sheet.size])S.sheet.size="A3";
 S.sheet.customW=clamp(Math.round(+S.sheet.customW||420),
  LIM.sheetCustom.min,LIM.sheetCustom.max);
 S.sheet.customH=clamp(Math.round(+S.sheet.customH||297),
  LIM.sheetCustom.min,LIM.sheetCustom.max);
 S.sheet.orient=(S.sheet.orient==="p")?"p":"l";
 S.sheet.margin=clamp(+S.sheet.margin||12,0,60);
 S.sheet.on=S.sheet.on?1:0;
 S.sheet.tb=S.sheet.tb?1:0;
 /* طراز البلوك: col أو side — ومجهولُه يعود col فلا يختفي البلوك */
 if(S.sheet.tbStyle!=="side")S.sheet.tbStyle="col";
 S.sheet.north=S.sheet.north?1:0;
 ["cx","cy"].forEach(k=>{
  S.sheet[k]=(S.sheet[k]!=null&&isFinite(S.sheet[k]))
   ? Math.round(S.sheet[k]) : null;
 });
 S.title=Object.assign(d.title,S.title||{});
 ["proj","owner","loc","sheet","rev","by"].forEach(k=>{
  S.title[k]=String(S.title[k]==null?"":S.title[k]).slice(0,60);
 });
 /* ═══ الأوراق المتعددة والمنافذ — المرحلة 4 ═══
    S.sheet وS.title (المفردان) يبقيان مصدرَ الورقة الافتراضية عند
    غياب sheets، فمشاريعُ ما قبل هذه المرحلة لا تنكسر. والجديدُ
    يُحفَظ كياناتِ أوراقٍ مستقلّة بلا حقولٍ مشتّقة: مقاسُ كل ورقةٍ
    ومستطيلاتُ منافذها صريحةٌ كما أُدخلت — لا شيء يُحسَب هنا. */
 if(!Array.isArray(S.sheets))S.sheets=[];
 const SHMAX=LIM.sheets.max, VPMX=LIM.viewportsPerSheet.max;
 if(S.sheets.length>SHMAX){
  dropE("sheet",null,
   `${S.sheets.length-SHMAX} ورقةً فوق الحدّ ${SHMAX} — قُصّت الزيادة`,
   {n:S.sheets.length-SHMAX});
  S.sheets=S.sheets.slice(0,SHMAX);
 }
  const okRect=r=>{
  if(!r||typeof r!=="object")return false;
  const x0=+r.x0,y0=+r.y0,x1=+r.x1,y1=+r.y1;
  return isFinite(x0)&&isFinite(y0)&&isFinite(x1)&&isFinite(y1)
   &&Math.abs(x0)<=LIM.coord.max&&Math.abs(y0)<=LIM.coord.max
   &&Math.abs(x1)<=LIM.coord.max&&Math.abs(y1)<=LIM.coord.max
   &&x1>=x0&&y1>=y0;
 };
 const seenSh=new Set();
 S.sheets=S.sheets.filter(sh=>{
  if(!sh||typeof sh!=="object"){dropE("sheet",null,"ورقةٌ فارغة");return false}
  if(sh.id==null)sh.id=newId("sh");
  sh.id=String(sh.id);
  if(seenSh.has(sh.id)){
   dropE("sheet",sh.id,"معرّف مكرر — أُبقيت الأولى وأُسقطت اللاحقة");
   return false;
  }
  seenSh.add(sh.id);
  sh.name=String(sh.name==null?"":sh.name).slice(0,200)||"ورقة";
  if(!SZOK[sh.size])sh.size="A3";
  sh.customW=clamp(Math.round(+sh.customW||420),
   LIM.sheetCustom.min,LIM.sheetCustom.max);
  sh.customH=clamp(Math.round(+sh.customH||297),
   LIM.sheetCustom.min,LIM.sheetCustom.max);
  sh.orient=(sh.orient==="p")?"p":"l";
  sh.margin=clamp(+sh.margin||12,0,60);
  sh.tb=sh.tb?1:0;
  sh.north=sh.north?1:0;
  ["cx","cy"].forEach(k=>{
   sh[k]=(sh[k]!=null&&isFinite(+sh[k]))?Math.round(+sh[k]):null;
  });
  if(!Array.isArray(sh.viewports))sh.viewports=[];
  if(sh.viewports.length>VPMX){
   dropE("vpv",sh.id,
    `${sh.viewports.length-VPMX} منفذاً فوق الحدّ ${VPMX} — قُصّت الزيادة`,
    {n:sh.viewports.length-VPMX});
   sh.viewports=sh.viewports.slice(0,VPMX);
  }
  const seenVp=new Set();
  sh.viewports=sh.viewports.filter(vp=>{
   if(!vp||typeof vp!=="object"){dropE("vpv",null,"منفذٌ فارغ");return false}
   if(vp.id==null)vp.id=newId("vp");
   vp.id=String(vp.id);
   if(seenVp.has(vp.id)){
    dropE("vpv",vp.id,"معرّف مكرر — أُبقي الأوّل وأُسقط اللاحق");
    return false;
   }
   seenVp.add(vp.id);
   vp.name=String(vp.name==null?"":vp.name).slice(0,200)||"منفذ";
   if(!okRect(vp.modelRect)||!okRect(vp.paperRect)){
    dropE("vpv",vp.id,"مستطيل النموذج أو الورقة غير صالح");
    return false;
   }
   const mw=Math.abs(vp.modelRect.x1-vp.modelRect.x0);
   const mh=Math.abs(vp.modelRect.y1-vp.modelRect.y0);
   const pw=Math.abs(vp.paperRect.x1-vp.paperRect.x0);
   const ph=Math.abs(vp.paperRect.y1-vp.paperRect.y0);
   if(Math.max(mw,mh)>LIM.vpModelRectMM.max
    ||Math.max(mw,mh)<LIM.vpModelRectMM.min){
    dropE("vpv",vp.id,"مستطيل النموذج خارج الحدّ");
    return false;
   }
   if(Math.max(pw,ph)>LIM.vpPaperRectMM.max
    ||Math.max(pw,ph)<LIM.vpPaperRectMM.min){
    dropE("vpv",vp.id,"مستطيل الورقة خارج الحدّ");
    return false;
   }
   vp.modelRect={x0:Math.round(vp.modelRect.x0),y0:Math.round(vp.modelRect.y0),
    x1:Math.round(vp.modelRect.x1),y1:Math.round(vp.modelRect.y1)};
   vp.paperRect={x0:Math.round(vp.paperRect.x0),y0:Math.round(vp.paperRect.y0),
    x1:Math.round(vp.paperRect.x1),y1:Math.round(vp.paperRect.y1)};
   vp.visible=vp.visible?1:0;
   if(vp.layers!=null){
    if(!Array.isArray(vp.layers))vp.layers=null;
    else vp.layers=vp.layers.map(s2=>String(s2).slice(0,80)).slice(0,500);
   }
   /* ═══ الحدُّ غيرُ المستطيل §٣ ═══ نسبٌ من مستطيلِ الورقةِ (٠–١)
      فلا ينجرف بتحريكِ المنفذ. والمقعَّرُ لا يُقبَل أصلاً عند
      الإسناد، لكنّ ملفّاً محرَّراً يدوياً قد يحمله — فيُنزَع الحدُّ
      كلُّه ويُقال، ولا يُقَصّ بأضلاعٍ وهمية. */
   if(vp.clip!=null){
    const C0=Array.isArray(vp.clip)?vp.clip:[];
    const C=C0.map(p=>(Array.isArray(p)&&isFinite(+p[0])&&isFinite(+p[1]))
     ?[clamp(+p[0],-2,3),clamp(+p[1],-2,3)]:null).filter(Boolean);
    if(C.length<3){
     delete vp.clip;
     if(C0.length)repE("vpv",vp.id,"حدُّ القصِّ دون ثلاثةِ رؤوسٍ صالحة — نُزِع");
    }else if(C.length>120){
     vp.clip=C.slice(0,120);
     repE("vpv",vp.id,`${C.length} رأساً في حدِّ القصِّ قُصَّ إلى 120`);
    }else if(!isConvexRing(C)){
     delete vp.clip;
     repE("vpv",vp.id,"حدُّ القصِّ مقعَّرٌ — نُزِع (المدعومُ محدَّبٌ وحدَه)");
    }else vp.clip=C;
   }
   /* تجميد المنفذ: كقائمة السماح — مصفوفةُ أسماءٍ تُقصّ وتُطبَّع،
      وليست قيداً عالمياً على الطبقة (فهي حالةُ منفذٍ محلية). */
   if(vp.frozen!=null){
    if(!Array.isArray(vp.frozen))vp.frozen=null;
    else vp.frozen=vp.frozen.map(s2=>String(s2).slice(0,80)).slice(0,500);
   }
   return true;
  });
  return true;
 });
 if(!S.sheets.some(sh=>sh.id===S.activeSheet))
  S.activeSheet=S.sheets.length?S.sheets[0].id:null;
 /* معرّفات الأوراق/المنافذ تدخل العدّاد العامّ كسائر المعرّفات —
    وبدونها ملفٌّ فيه sh1/vp1 والعدّادُ عند صفر يُنتِج sh1 جديداً
    يصطدم بموجود. */
 S.sheets.forEach(sh=>{
  bumpIdc(idNum(sh.id));
  (sh.viewports||[]).forEach(vp=>bumpIdc(idNum(vp.id)));
 });

 /* ═══ أوسمة التفاصيل — DC ═══ اليتيم (مصدرٌ أو هدفٌ زال) يُسقَط ويُبلَّغ.
    موضعها هنا لا بعد السقف: التحقق من المنافذ يحتاج S.sheets مُطبَّعةً. */
 if(!Array.isArray(S.callouts))S.callouts=[];
 if(S.callouts.length>LIM.callouts.max){
  dropE("callout",null,
   `${S.callouts.length-LIM.callouts.max} وسماً فوق الحدّ ${LIM.callouts.max} — قُصّت الزيادة`,
   {n:S.callouts.length-LIM.callouts.max});
  S.callouts=S.callouts.slice(0,LIM.callouts.max);
 }
 const vpExists=(sid,vid)=>(S.sheets||[]).some(
  s=>s.id===sid&&(s.viewports||[]).some(v=>v&&v.id===vid));
 const seenDc=new Set();
 S.callouts=S.callouts.filter(c=>{
  if(!c||typeof c!=="object"){dropE("callout",null,"وسمٌ فارغ");return false}
  if(c.id==null)c.id=newId("DC");
  c.id=String(c.id);
  if(seenDc.has(c.id)){
   dropE("callout",c.id,"معرّف مكرر — أُبقي الأول وأُسقط اللاحق");
   return false;
  }
  seenDc.add(c.id);
  const q=PT(c.pos);
  if(!q){dropE("callout",c.id,"موضعٌ ناقص أو غير صالح");return false}
  c.pos=q;
  c.label=String(c.label==null?"":c.label).slice(0,4);
  if(!c.label){dropE("callout",c.id,"تسميةٌ فارغة");return false}
  if(!vpExists(c.srcSheet,c.srcVp)||!vpExists(c.tgtSheet,c.tgtVp)){
   dropE("callout",c.id,"مصدرُه أو هدفُه زال (ورقةٌ أو منفذٌ حُذف)");
   return false;
  }
  return true;
 });
 S.callouts.forEach(c=>bumpIdc(idNum(c.id)));

 /* ═══ المجموعات — GRP ═══ اليتيم يُقصّ والفارغ يُفكّ، وكلاهما يُبلَّغ.
    بعد كتل كل الكيانات (وإلا فُقد أعضاؤها كيتامى). */
 const gent=x=>{
  const c=KIND_COLL[x.k];
  return !!c&&Array.isArray(S[c])&&S[c].some(e=>e&&e.id===x.id);
 };
 if(!Array.isArray(S.groups))S.groups=[];
 if(S.groups.length>LIM.groups.max){
  dropE("group",null,
   `${S.groups.length-LIM.groups.max} مجموعةً فوق الحدّ ${LIM.groups.max} — قُصّت الزيادة`,
   {n:S.groups.length-LIM.groups.max});
  S.groups=S.groups.slice(0,LIM.groups.max);
 }
 const seenGr=new Set();
 S.groups=S.groups.filter(g=>{
  if(!g||typeof g!=="object"){dropE("group",null,"مجموعةٌ فارغة");return false}
  if(g.id==null)g.id=newId("GR");
  g.id=String(g.id);
  if(seenGr.has(g.id)){
   dropE("group",g.id,"معرّف مكرر — أُبقيت الأولى وأُسقطت اللاحقة");
   return false;
  }
  seenGr.add(g.id);
  g.name=String(g.name==null?"":g.name).slice(0,80)||"مجموعة";
  if(!Array.isArray(g.members))g.members=[];
  if(g.members.length>LIM.groupMembers.max){
   dropE("group",g.id,
    `${g.members.length-LIM.groupMembers.max} عضواً فوق الحدّ ${LIM.groupMembers.max} — قُصّت الزيادة`,
    {n:g.members.length-LIM.groupMembers.max});
   g.members=g.members.slice(0,LIM.groupMembers.max);
  }
  const uniq=[], seenM=new Set();
  let bad=0, orphan=0;
  g.members.forEach(m=>{
   if(!m||typeof m!=="object"){bad++;return}
   const k=String(m.k||"").slice(0,16), id=String(m.id==null?"":m.id).slice(0,80);
   if(!k||!id){bad++;return}
   if(!gent({k,id})){orphan++;return}
   const key=k+"/"+id;
   if(seenM.has(key)){bad++;return}
   seenM.add(key); uniq.push({k,id});
  });
  if(bad)dropE("group",g.id,`${bad} عضواً فاسداً أو مكرراً أُسقط`);
  if(orphan)dropE("group",g.id,`${orphan} عضواً زال كيانُه — أُقصّ`);
  g.members=uniq;
  return true;
 });
 /* دون عضوين لا معنى للتجميع — تُفكّ ويُبلَّغ */
 S.groups=S.groups.filter(g=>{
  if(g.members.length>=2)return true;
  dropE("group",g.id,
   g.members.length?"عضوٌ واحد — فُكّت المجموعة":"لا أعضاء — فُكّت المجموعة");
  return false;
 });
 S.groups.forEach(g=>bumpIdc(idNum(g.id)));
 /* ═══ المرجع ═══ جامد: يُطبَّع شكلاً ولا يُصلَح هندسةً ═══
    والحدود هي حدود القارئ نفسها (io/dxfin.js): ملفُّ مشروعٍ
    محرَّرٌ يدوياً منفذٌ ثانٍ إلى الحالة، فلا يُترَك بلا سقف —
    مضلّعٌ بعشرة ملايين رأسٍ يمرّ من هنا كما يمرّ من هناك.
    وهويّة مصفوفة الكيانات تُحفَظ إن لم يُنبَذ منها شيء: مخزنُ
    نسخ المرجع (REFS) يوازن بالهويّة، فإعادةُ بناءٍ بلا سببٍ
    تُنشئ نسخةً زائدة مع كل تراجع، وثمانيةُ تراجعاتٍ تُزحِم
    الحدَّ فتُفقَد نسخةٌ يشير إليها تاريخٌ قائم. */
 const CO=LIM.coord.max, RPTS=LIM.refPts.max, RMAX=LIM.refEnts.max;
 S.ref=Object.assign(d.ref,S.ref||{});
 S.ref.tr=Object.assign({k:1,rot:0,dx:0,dy:0},S.ref.tr||{});
 S.ref.tr.k=clamp(+S.ref.tr.k||1,1e-4,1e4);
 S.ref.tr.rot=deg(+S.ref.tr.rot||0);
 S.ref.tr.dx=Math.round(+S.ref.tr.dx||0);
 S.ref.tr.dy=Math.round(+S.ref.tr.dy||0);
 const RT={l:1,p:1,a:1,t:1,x:1};
 const RE=Array.isArray(S.ref.ents)?S.ref.ents:[];
 let RBADT=0;
 let RK=RE.filter(e=>{
  if(e&&RT[e.t])return true;
  RBADT++; return false;
 });
 if(RBADT)dropE("refEnt",null,"نوعٌ مجهول أو كيانٌ فارغ",{n:RBADT});
 if(RK.length>RMAX){
  dropE("refEnt",null,`تجاوز الحدّ ${RMAX} — قُصّت الزيادة`,
   {n:RK.length-RMAX});
  RK=RK.slice(0,RMAX);
 }
 let RBADP=0, RBADV=0;
 RK.forEach(e=>{
  e.sl=String(e.sl==null?"0":e.sl).slice(0,80)||"0";
  if(e.t==="l"){e.a=PT(e.a); e.b=PT(e.b)}
  else if(e.t==="p"){
   const P0=Array.isArray(e.pts)?e.pts:[];
   e.pts=P0.slice(0,RPTS).map(PT).filter(Boolean);     /* MAXPTS القارئ */
   if(P0.length>RPTS)RBADV+=P0.length-RPTS;
   RBADV+=Math.min(P0.length,RPTS)-e.pts.length;
  }
  else if(e.t==="a"){
   e.c=PT(e.c);
   /* قيمةٌ خارج المدى تُقسَر: صندوقٌ هائل يصفّر التكبير وتخلو
      الشاشة بلا رسالة */
   e.r=clamp(Math.round(+e.r||1),1,CO);
   e.a0=deg(+e.a0||0); e.a1=deg(+e.a1||0);
  }
  else if(e.t==="t"){
   e.p=PT(e.p);
   e.s=String(e.s==null?"":e.s).slice(0,LIM.text.max*2);   /* 240 → 200 أدناه */
   e.s=e.s.slice(0,200);
   e.h=clamp(Math.round(+e.h||100),1,1e7);
   e.rot=deg(+e.rot||0);
  }else e.p=PT(e.p);
 });
 if(RBADV)repE("refEnt",null,`${RBADV} رأساً فاسداً أو زائداً عن الحدّ أُسقط من خطوطٍ متعدّدة`,
  {verb:"أُصلح",noun:"خط مرجع متعدّد"});
 /* PT الصارمة تعيد null لنقطةٍ فاسدة — فالنقطةُ المعطوبة تُنبَذ ولا
    تصير الأصل (كان PT القديم يعيد [0,0] وكانت فلترةٌ ثالثة تُنقذ) */
 RK=RK.filter(e=>{
  let okk;
  if(e.t==="l")okk=!!(e.a&&e.b);
  else if(e.t==="p")okk=e.pts.length>1;
  else if(e.t==="a")okk=!!e.c;
  else if(e.t==="t")okk=!!(e.p&&e.s);
  else okk=!!e.p;
  if(!okk)RBADP++;
  return okk;
 });
 if(RBADP)dropE("refEnt",null,"إحداثيٌّ فاسد أو نصٌّ فارغ أو خطٌّ بأقلّ من رأسين",
  {n:RBADP});
 S.ref.ents=(RK.length===RE.length)?RE:RK;
 S.ref.src={};
 S.ref.ents.forEach(e=>{
  S.ref.src[e.sl]=(S.ref.src[e.sl]||0)+1});
 const OF={};
 Object.keys(S.ref.off||{}).forEach(k=>{
  if(S.ref.src[k])OF[k]=1});
 S.ref.off=OF;

 /* W3 — لا معرّفاتٍ مكرّرة في مجموعة: الأوّلُ يبقى واللاحقُ يُسقَط
    ويُسجَّل (كان الفحص محصوراً في blocks). */
 COLLS.forEach(k=>{ S[k]=dedupColl(S[k],k); });
 COLLS.forEach(k=>S[k].forEach(e=>bumpIdc(idNum(e.id))));
 /* معرّفات الكتل تدخل العدّاد العامّ كما تدخل بقيّة الأنواع —
    وبدونها ملفٌّ فيه b1 وb2 والعدّادُ عند صفر يُنتِج b1 جديداً
    يصطدم. COLLS لا يشمل blocks، فالفحص صريح. */
 (S.blocks||[]).forEach(b=>bumpIdc(idNum(b.id)));
 /* ═══ الصورة المرجعية ═══
    src عنوانُ data: URL. حمايةٌ من ملفٍّ محرَّرٍ يدوياً: نُبقي
    عنواناً يبدأ بـdata:image/ فقط، وأيُّ نصٍّ آخر يُطرَح. */
 S.underlay=Object.assign(d.underlay,S.underlay||{});
 S.underlay.src=String(S.underlay.src||"");
 if(S.underlay.src&&!/^data:image\//.test(S.underlay.src)){
  dropE("underlay",null,"مصدرٌ ليس data:image/ — طُرح",
   {verb:"طُرحت",noun:"صورة مرجعية"});
  S.underlay.src="";
 }
 if(S.underlay.src.length>LIM.imageBytes.max){
  dropE("underlay",null,`أكبر من الحدّ ${LIM.imageBytes.max} محرفاً — طُرحت`,
   {verb:"طُرحت",noun:"صورة مرجعية"});
  S.underlay.src="";
 }
 S.underlay.x=Math.round(+S.underlay.x||0);
 S.underlay.y=Math.round(+S.underlay.y||0);
 S.underlay.mpp=clamp(+S.underlay.mpp||0.01,1e-9,1000);
 S.underlay.rot=deg(+S.underlay.rot||0);
 S.underlay.opacity=clamp(+S.underlay.opacity||0.5,0,1);
 S.underlay.visible=S.underlay.visible?1:0;
 S.underlay.w=Math.max(0,Math.round(+S.underlay.w||0));
 S.underlay.h=Math.max(0,Math.round(+S.underlay.h||0));
 /* لا صورةَ بلا أبعاد: بلا w/h لا شيءَ يُرسَم */
 if(!S.underlay.w||!S.underlay.h)S.underlay.visible=0;
 /* تعريفات الكتل: كل تغييرٍ فيها (define/remove) يُبطل المشهد
    ويُدخل التاريخ. installBlockHook يُسجَّل مرّةً واحدة — وإن
    نُودي مرّاتٍ فالأخيرة تفوز، وهو المقصود.
    كانت تكتفي بـtouchView() فلا تدفع لقطةً — فحذف كتلةٍ كان يعمل
    بلا خطوة تراجع (يُستعاد بالصدفة بعد edit() تالٍ يحمل لقطةً
    "قبل" فيها الكتلة). اليوم تدفع خطوةً حقيقية: blocks.js يلتقط
    اللقطة عبر SNAP قُبيل التعديل (كما تفعل edit() بـfn())،
    وHOOK هنا يدفعها بعد نجاح التعديل — فالتراجع يعيد فعلاً حالة
    "قبل"، لا نسخةً من "بعد" لا تُغيّر شيئاً. */
 installBlockHook((what,name,pre)=>{
  if(!pre)return;
  /* داخل معاملةٍ: edit() الخارجية تلتقط لقطتها وتدفع خطوتها وتحفظ
     مرّةً واحدة — فالدفع هنا كان خطوةَ تاريخٍ مزدوجة (شبحاً). */
  if(inTransaction())return;
  pushHistory(pre,
   (what==="remove"?"حذف كتلة ":"تعريف كتلة ")+name);
  touchView(); autosave();
 });
 /* ═══ تعريفات الطوابق — B: هجرة وتطبيع ═══
    ملفٌّ قديمٌ بلا levelDefs يهاجر إلى طابق 0 وحده — الحقل جديدٌ،
    فغيابه ليس عطباً يُسجَّل، بل حالةً سابقةً لهذه الدفعة. */
 if(!Array.isArray(S.levelDefs)||!S.levelDefs.length){
  S.levelDefs=[{n:0,name:"أرضي",elev:0,h:3000,slab:200,color:"#cccccc"}];
 }
 S.levelDefs.forEach(ld=>{
  ld.n=normLevel(ld.n);
  ld.name=String(ld.name||`طابق ${ld.n}`).slice(0,40);
  ld.elev=Math.round(+ld.elev||0);
  ld.h=clamp(Math.round(+ld.h||3000),2000,8000);
  ld.slab=clamp(Math.round(+ld.slab||200),0,1000);
  if(!/^#[0-9a-fA-F]{6}$/.test(ld.color||""))ld.color="#cccccc";
 });
 /* رقمٌ مكرَّر: الأوّل يبقى — تنبيهٌ لا رفضاً كسائر التطبيع هنا */
 {
  const seen=new Set(), out=[];
  let dup=0;
  S.levelDefs.forEach(ld=>{
   if(seen.has(ld.n)){dup++; return}
   seen.add(ld.n); out.push(ld);
  });
  if(dup)dropE("level",null,`${dup} تعريف طابقٍ مكرَّر الرقم — أُسقط`,{n:dup});
  out.sort((a,b)=>a.n-b.n);
  S.levelDefs=out;
 }
 /* طابق meta.level النشط يجب أن يملك تعريفاً — غيابه يُنشئ واحداً
    بدل أن يُترك طابقٌ نشطٌ بلا تعريفٍ يقرؤه levelDef() */
 if(!S.levelDefs.some(ld=>ld.n===S.meta.level)){
  S.levelDefs.push({n:S.meta.level,name:levelTag(S.meta.level),
   elev:S.meta.level*3000,h:3000,slab:200,color:"#cccccc"});
  S.levelDefs.sort((a,b)=>a.n-b.n);
 }
 return S;
}
/* ═══ المرجع خارج اللقطة ═══
   كيانات المرجع جامدةٌ بالتصميم: لا يتغيّر منها إلّا tr و off.
   فتسلسلُها في كل خطوةِ تراجعٍ كان يضاعف كلفة كل نقرةٍ بحجم
   الملفّ المستورد — ستّون ألف كيانٍ في مئة خطوة، وثلاث مئة
   ميغابايت في الذاكرة، ومقارنةُ نصٍّ بحجم ميغابايت في pushHistory.
   والكيانات تتبدّل بحدثَين صريحَين فقط: setRef و clearRef.

   الحلّ مشاركةٌ بنيوية: الخطوات تحمل رقم نسخةٍ، والمحتوى في مخزنٍ
   واحد. وأمّا tr و off فيدخلان اللقطة كاملَين — فمحاذاةٌ واحدةٌ
   تُتراجَع عنها.

   عدّادان لا واحد: ver تصاعديٌّ لا يعود، وcur نسخةُ الحالة الآن.
   والفصل لازم — التراجع يعيد cur إلى نسخةٍ سابقة، ولو أعاد
   الترقيم معها لكتب استيرادٌ جديدٌ فوق نسخةٍ يشير إليها تاريخٌ
   قائم. */
const RCAP=8;
let refVer=0, refCur=0;
const REFS=new Map();
let ONREF=null;
export const setRefLost=f=>{ONREF=(typeof f==="function")?f:null};
export const refVersion=()=>refCur;
export const refStore=()=>({n:REFS.size,ver:refVer,cur:refCur});

function refTrim(){
 /* لا تنمو بلا حدّ: أقدمُ نسخةٍ لا تشير إليها الحالة تُنسى.
    والمرجع الواحد نسختان في العادة (قبل الاستيراد وبعده). */
 while(REFS.size>RCAP){
  let old=null;
  for(const k of REFS.keys()){if(k!==refCur){old=k; break}}
  if(old==null)break;
  REFS.delete(old);
 }
}
export function refBump(){
 refVer++; refCur=refVer;
 REFS.set(refCur,(S.ref&&S.ref.ents)||[]);
 refTrim();
 return refCur;
}
/* ═══ الصورة المرجعية في اللقطات التاريخية ═══
   src قد يكون data: URL بحجم ميغابايتات (حتى MAX_SRC في
   underlay.js). تسلسلُه في كل خطوة تراجع يُضاعف الذاكرة بمئة
   خطوة — والعمليات الشائعة عليه (نقل · معايرة · دوران · شفافية)
   تُعدّل الأرقام لا src. فما تجاوز حدّاً صغيراً (٢٠٠ ك.ب) يُستثنى
   من اللقطة التاريخية ويُخزَّن في مخزنٍ مشترك بمفتاح نسخةٍ
   تصاعديّ — بنفس بنية REFS تماماً، فتحميل صورتين متتاليتين ثم
   التراجع مرّتين يستعيد كلّاً منهما صحيحةً (لا يستعيد الأحدث
   خطأً، كما يقع مع مخزنٍ بخانةٍ واحدة). */
const USRC_MAX=200*1024, UCAP=8;
let uVer=0, uCur=0;
const USRCS=new Map();
/* النسخ التي يشير إليها التاريخ (تراجعٌ وإعادة) فعلاً: مفتاح __uv في
   لقطاته. ما لا يشير إليه أحدٌ (فرعٌ أُلغي بتعديلٍ جديد) يُطرَد أوّلاً؛
   فإن ظلّ الحجم فوق UCAP طُرد الأقدم — السقفُ ثابتٌ في الحالتين. */
function uRefs(){
 const s=new Set([uCur]), re=/"__uv":(\d+)/g;
 [HIST.u,HIST.r].forEach(a=>a.forEach(x=>{
  if(typeof x!=="string")return;
  let m; re.lastIndex=0;
  while((m=re.exec(x))!==null)s.add(+m[1]);
 }));
 return s;
}
function uTrim(){
 if(USRCS.size<=UCAP)return;
 const live=uRefs();
 while(USRCS.size>UCAP){
  let old=null;
  for(const k of USRCS.keys()){if(!live.has(k)){old=k; break}}
  if(old==null)for(const k of USRCS.keys()){if(k!==uCur){old=k; break}}
  if(old==null)break;
  USRCS.delete(old);
 }
}
/* ═══ التاريخ ═══ */
const MAX=100, HIST={u:[],r:[]};
/* تسمياتٌ موازية لسجلّ التراجع — اختياريّة، لا تُغيّر توقيع من
   ينادي pushHistory(snap) بلا تسمية. لوحة السجل المرئية (انظر
   ui/historypanel.js) تقرأ منها. */
const HLBL={u:[],r:[]};
const DEF_LBL="تعديل";
export function pack(){
 const o={};
 KEYS.forEach(k=>{o[k]=S[k]});
 o._idc=idc();
 /* التعريفات خارج S، فتُضاف يدوياً. والبادئة _ تفصلها عن مفاتيح
    الحالة فلا تتصادم مع أيٍّ منها. */
 o._blocks=blocksToJSON();
 return o;
}
export function snapshot(){
 const o=pack();
 const ents=(o.ref&&o.ref.ents)||[];
 if(ents.length){
  /* الهويّة هي الميزان: مصفوفةٌ جديدة تعني محتوىً جديداً — وقد
     تأتي من استيرادٍ لم يُعلن نسخته، أو من فتح ملفّ. */
  if(REFS.get(refCur)!==ents)refBump();
  o.ref=Object.assign({},o.ref,{ents:[],__rv:refCur});
 }
 const usrc=o.underlay&&o.underlay.src;
 if(usrc&&usrc.length>USRC_MAX){
  if(USRCS.get(uCur)!==usrc){uVer++; uCur=uVer; USRCS.set(uCur,usrc); uTrim()}
  o.underlay=Object.assign({},o.underlay,{src:"",__uv:uCur});
 }
 return JSON.stringify(o);
}
function apply(d,opt){
 if(!d)return;
 /* full=true فقط عند تحميل مشروعٍ كامل (loadState). أوضاع الرسم
    S.rb (تعامد/التقاط/قطبي…) وشفافية المرجع S.underlay.opacity
    تفضيلا جلسةٍ لا بيانات مشروع (D01/D02): يُحفَظان في اللقطة
    (pack) لأن ملفّ المشروع يُبقي عليهما بين الجلسات، لكن apply()
    لا يستعيدهما من لقطات undo/redo أو تراجع edit() الفاشل — تلك
    استعادةٌ ضمن الجلسة نفسها، فلا يجوز أن تقلب تفضيلاً غيّره
    المستخدم بعد أخذ اللقطة. */
 const full=!!(opt&&opt.full);
 const prevRb=S.rb, prevOp=S.underlay&&S.underlay.opacity;
 KEYS.forEach(k=>{if(d[k]!==undefined)S[k]=d[k]});
 if(!full)S.rb=prevRb;
 /* تعريفات الكتل: تُستعاد قبل ensureShape لأنّها لا تمسّ S —
    DEFS في blocks.js وحدةٌ مستقلّة. وإن كان d._blocks غائباً
    (لقطةٌ من إصدارٍ أقدم) يُحفَظ DEFS الحاليّ بلا تغيير. */
 if(d._blocks)blocksFromJSON(d._blocks);
 /* لقطةٌ كاملة: كل شيء تبدّل يقيناً — الجدران والفتحات والطبقات.
    والكاشات المفتاحيّة (بصمة المناطق) تتّكل على هذا. */
 VER.g++; VER.o++;
 /* استرجاع الكيانات من مخزن النسخ. وإن ضاعت النسخة (تجاوزت
    الحدّ) فالمرجع يزول ويُبلَّغ — ولا تُخترَع كياناتٌ.
    والمصفوفة مشتركةٌ مع المخزن: لا مسارَ يُدخل فيها أو يُخرج،
    فsetRef وclearRef يستبدلانها استبدالاً. */
 if(d.ref&&d.ref.__rv!=null){
  /* P2-004: النسخةُ تُقرأ أوّلاً في متغيّرٍ ثم تُحذَف. كان الحذفُ
     والقراءةُ متشابكَين، فأيُّ تبديلٍ لترتيبهما (أو مرورُ d===S)
     يجعل النسخةَ الجارية undefined فتتعطّل دقّةُ الاحتفاظ. */
  const rv=d.ref.__rv;
  const e=REFS.get(rv);
  S.ref=Object.assign({},d.ref,{ents:e||[]});
  delete S.ref.__rv;
  refCur=rv;
  if(!e&&ONREF)ONREF(rv);
 }
 /* الصورة المرجعية الكبيرة: تُعاد من مخزن USRCS قبل ensureShape —
    التي تفحص src بتعبيرٍ نمطيّ وتطرح ما لا يبدأ بـdata:image/.
    فُقدت النسخة (تجاوزت UCAP)؟ تعود src فارغةً — لا كياناتٌ
    تُخترَع، مثل المرجع سواءً بسواء. */
 if(d.underlay&&d.underlay.__uv!=null){
  const uv=d.underlay.__uv;      /* P2-004: تُقرأ قبل الحذف */
  S.underlay=Object.assign({},d.underlay,{src:USRCS.get(uv)||""});
  delete S.underlay.__uv;
  uCur=uv;
 }
 if(!full&&S.underlay&&prevOp!==undefined)S.underlay.opacity=prevOp;
 setIdc(d._idc||0);
 ensureShape();
}
/* ═══ سقفُ ذاكرة التاريخ ═══ P4-007
   السقفُ كان عدداً وحده: مئةُ لقطةٍ كاملة. وعلى مشروعِ ألفِ جدار
   بلغت الزيادةُ 35.8 م.ب بعد ألف عملية و112.25 م.ب بعد خمسة آلاف —
   العددُ يُسقِط القديمَ فعلاً لكنه لا يحدُّ الحجم، فالمشروعُ الكبير
   يملأ الكومةَ بمئةِ لقطةٍ فقط.
   الآن سقفانِ: العددُ كما كان، وحجمٌ تقريبيٌّ بالمحارف يُحسَب مرّةً
   عند الدفع لا بمسحٍ متكرّر. وعند التجاوز تُسقَط الأقدمُ حتى يعود
   الحجمُ تحت السقف — ويبقى آخرُ تراجعٍ واحدٌ دائماً مهما كانت
   اللقطةُ ضخمة، فلا تضيع خطوةُ التراجع الأخيرة.
   والقياسُ بالمحارف لا بالبايت: JSON نصٌّ، والنسبةُ ثابتةٌ تكفي
   لسقفٍ عمليّ ولا تحتاج قياساً دقيقاً للكومة. */
export const HIST_MAXCHARS=32*1024*1024;      /* ≈ 32 م.ب نصّاً */
let HBYTES=0;
export const historyBytes=()=>HBYTES;
const hlen=x=>(typeof x==="string")?x.length:0;
function trimHistory(){
 let dropped=0;
 /* العددُ أوّلاً */
 while(HIST.u.length>MAX){
  HBYTES-=hlen(HIST.u.shift()); HLBL.u.shift(); dropped++;
 }
 /* ثم الحجم — ولا نُفرِغ آخرَ لقطة */
 while(HBYTES>HIST_MAXCHARS&&(HIST.u.length+HIST.r.length)>1){
  if(HIST.r.length){HBYTES-=hlen(HIST.r.shift()); HLBL.r.shift()}
  else {HBYTES-=hlen(HIST.u.shift()); HLBL.u.shift()}
  dropped++;
 }
 if(HBYTES<0)HBYTES=0;
 return dropped;
}
export function pushHistory(snap,label){
 if(!snap)return;
 if(HIST.u[HIST.u.length-1]===snap)return;
 HIST.u.push(snap); HLBL.u.push(label||DEF_LBL);
 HBYTES+=hlen(snap);
 HIST.r.forEach(x=>{HBYTES-=hlen(x)});
 HIST.r.length=0; HLBL.r.length=0;
 trimHistory();
}
/* ═══ ركنُ السجلّ ═══ الدرسُ يبدأ بسجلٍّ فارغ، وسجلُّ المستخدم يُركَن
   جانباً بكامله (اللقطات والتسميات والحجم) ثم يعود كما كان. */
let PARK=null;
export function historyPark(){
 if(PARK)return false;
 PARK={u:HIST.u.slice(),r:HIST.r.slice(),lu:HLBL.u.slice(),lr:HLBL.r.slice(),b:HBYTES};
 HIST.u.length=0; HIST.r.length=0; HLBL.u.length=0; HLBL.r.length=0; HBYTES=0;
 return true;
}
export function historyUnpark(){
 if(!PARK)return false;
 HIST.u.length=0; HIST.r.length=0; HLBL.u.length=0; HLBL.r.length=0;
 HIST.u.push(...PARK.u); HIST.r.push(...PARK.r);
 HLBL.u.push(...PARK.lu); HLBL.r.push(...PARK.lr); HBYTES=PARK.b;
 PARK=null;
 return true;
}
export const historyParked=()=>!!PARK;
export const canUndo=()=>HIST.u.length>0;
export const canRedo=()=>HIST.r.length>0;
export const clearHistory=()=>{
 HIST.u.length=0; HIST.r.length=0; HLBL.u.length=0; HLBL.r.length=0;
 HBYTES=0;
};
/* ═══ الخط الزمني — للوحة السجل المرئية ═══
   past: من الأقدم إلى الأحدث · future: ما أُعيد التراجع عنه، من
   الأقرب إلى الأبعد. current = عدد خطوات past (موضع المؤشّر). */
export function historyTimeline(){
 return {past:HLBL.u.slice(), future:HLBL.r.slice().reverse(),
  current:HLBL.u.length};
}
/* لقطةُ أيِّ موضعٍ بلا تنفيذ: الموضع n (< الطول) = HIST.u[n] ·
   الجاريُّ = snapshot() · المستقبل = HIST.r من آخره عكساً.
   قراءةٌ محضة — لا undo/redo ولا touch ولا autosave. */
export function historyTotal(){
 return HIST.u.length+HIST.r.length;
}
export function historySnapshotAt(n){
 const total=HIST.u.length+HIST.r.length;
 n=Math.max(0,Math.min(Math.round(+n||0),total));
 if(n===HIST.u.length)return snapshot();
 if(n<HIST.u.length)return HIST.u[n];
 const d=n-HIST.u.length-1;
 return HIST.r[HIST.r.length-1-d]||null;
}
/* ينقل المؤشّر إلى الخطوة n (0=البداية). يُنادي undo()/redo()
   الحقيقيّتين خطوةً خطوة فيبقى التخزين والحفظ التلقائي سليمَين. */
export function historyJumpTo(n){
 const total=HIST.u.length+HIST.r.length;
 n=Math.max(0,Math.min(n,total));
 while(HIST.u.length>n){if(!undo())break}
 while(HIST.u.length<n){if(!redo())break}
}

let AFTER=()=>{}, ONERR=()=>{};
export const setAfterEdit=f=>{AFTER=(typeof f==="function")?f:(()=>{})};
export const setEditError=f=>{ONERR=(typeof f==="function")?f:(()=>{})};

/* P4-007: العدّادُ يتوازن مع كل نقلةٍ بين السجلَّين — لقطةٌ تُسحَب
   تُطرَح، وأخرى تُدفَع تُجمَع. ثم trimHistory تفرض السقفين معاً. */
export function undo(){
 if(!HIST.u.length)return false;
 const cur=snapshot();
 const taken=HIST.u.pop();
 HBYTES-=hlen(taken);
 apply(JSON.parse(taken));
 const lbl=HLBL.u.pop()||DEF_LBL;
 HIST.r.push(cur); HLBL.r.push(lbl); HBYTES+=hlen(cur);
 while(HIST.r.length>MAX){HBYTES-=hlen(HIST.r.shift()); HLBL.r.shift()}
 trimHistory();
 touch(); AFTER(true); autosave();
 return true;
}
export function redo(){
 if(!HIST.r.length)return false;
 const cur=snapshot();
 const taken=HIST.r.pop();
 HBYTES-=hlen(taken);
 apply(JSON.parse(taken));
 const lbl=HLBL.r.pop()||DEF_LBL;
 HIST.u.push(cur); HLBL.u.push(lbl); HBYTES+=hlen(cur);
 while(HIST.u.length>MAX){HBYTES-=hlen(HIST.u.shift()); HLBL.u.shift()}
 trimHistory();
 touch(); AFTER(true); autosave();
 return true;
}
/* تعديل ذرّي: الفشل يُرجَع إلى اللقطة ويُبلَّغ — لا حالة نصف معدَّلة */
let FAILED=false;
/* هل أخفق آخر edit()؟ — يُسأل مباشرةً بعده وحده.
   لم نُعِد قيمةً مميّزة لأن كل مستدعٍ يقرأ العائد قيمةً شرعية،
   فأيُّ رمزٍ نعيده يصير صادقاً في شرطٍ قائم. */
export const editFailed=()=>FAILED;

/* ═══ عمق المعاملة ═══
   edit() هي المعاملة الموحَّدة: لقطةٌ قبل → تنفيذٌ كامل → رجوعٌ عند
   الخطأ → touch واحد → pushHistory واحد → autosave واحد.
   والمتداخلة تنضمّ إلى الخارجية: لا لقطةَ ولا دفعَ تاريخٍ ولا حفظَ من
   الداخلية — فتصير العمليةُ المركّبة خطوةً واحدة، وخطأٌ في أيّ طبقةٍ
   يُرجِع كلَّها. (كانت الداخلية تدفع لقطتها ثم الخارجية لقطتَها:
   خطوةُ تاريخٍ شبحٌ هي حالةٌ وسيطةٌ لم يرها المستخدم — عيب D07.) */
let TXN=0;
export const inTransaction=()=>TXN>0;
/* اسم موثّق للعقد بترتيب طبيعي (label, fn) — تفويض كامل إلى edit().
   لا سلوك جديد، فقط واجهة أوضح للكود الجديد؛ edit() تبقى كما هي
   لكل الاستدعاءات القديمة. */
export function transaction(label, fn, opt){ return edit(fn, label, opt); }
/* ═══ الانضمام بلا التزام ═══
   يرفع عمقَ المعاملة حول fn فتنضمّ إليه أيُّ edit() داخله ولا تدفع
   لقطةً ولا تاريخاً ولا حفظاً. لمن يملك معاملتَه بنفسه (registry:
   لقطةٌ عند begin ودفعٌ واحد عند finish) فلا يتحوّل كل نقرةٍ في أداةٍ
   متكرّرة إلى خطوة تراجعٍ شبح. لا يُرجِع عند الخطأ — الخطأ يصعد
   والمالك يقرّر (rollbackTool). */
export function joinTxn(fn){
 TXN++;
 try{return fn()}
 finally{TXN--}
}
/* ═══ درجة الإبطال ═══
   edit() كانت تُقدّم النسخة الهندسية دائماً — فخبزُ منطقةٍ أو تعديلُ
   نصٍّ بديل (عرضٌ محض بعقد ENT.bump) كان يُبطل اتحادَ المضلّعات كلَّه.
   والآن يُعلن المستدعي درجتَه ({bump:"view"|"open"|"geom"})،
   والافتراضُ الآمن geom. وفي المعاملة المركّبة تُرفَع الدرجةُ إلى
   أقوى ما أعلنته أيُّ طبقةٍ — فلا تُخفِّضها داخليةٌ خفيفة. */
const BW={view:1,open:2,geom:3};
let TB="view";
const raise=b=>{if((BW[b]||3)>BW[TB])TB=(BW[b]?b:"geom")};
const bumpTo=b=>(b==="view")?touchView():((b==="open")?touchOpen():touch());
export function edit(fn,label,opt){
 const b=(opt&&opt.bump)||"geom";
 if(TXN>0){
  /* انضمام: الخطأ يصعد إلى الخارجية فترجع هي كلَّ شيء. لا نبتلعه هنا،
     وإلا نجت الخارجية بنصف عمليةٍ وسمّت ذلك نجاحاً. */
  raise(b);
  return fn();
 }
 const sn=snapshot();
 FAILED=false;
 let out=null;
 TB="view"; raise(b);
 TXN++;
 try{out=fn()}
 catch(e){
  TXN--;
  apply(JSON.parse(sn));
  touch(); AFTER(true);
  FAILED=true;
  ONERR((e&&e.message)?e.message:String(e));
  return undefined;
 }
 TXN--;
 pushHistory(sn,label); bumpTo(TB); AFTER(false); autosave();
 return out;
}
/* ═══ الحفظ التلقائي ═══
   يُنادى متزامناً من كل تعديل، ويكتب لاحقاً. والكتابةُ الجارية لا
   تُقاطَع: ما يقع أثناءها يُعلَّم ويُكتَب بعدها — فلا تُفقَد آخر
   لمسة، ولا تتزاحم معاملتان على السجلّ نفسه. */
let AT=null, BUSY=false, DIRTY=false, SEALED=false;
/* ═══ تعليقُ الحفظ ═══ الواجهة التعليمية
   الدرسُ يرسم في حالةٍ مؤقّتة فوق مشروع المستخدم؛ لو حُفظت لكتبت فوقه.
   ما دام التعليقُ قائماً تُسقَط كتاباتُ الحفظ التلقائيّ كلُّها (لا تؤجَّل)،
   والخروجُ من الدرس يُعيد المشروع ثم يرفع التعليق. */
let HOLD=0;
export const saveHold=on=>{
 HOLD=on?1:0;
 if(HOLD){DIRTY=false; if(AT){clearTimeout(AT); AT=null}}
 return HOLD;
};
export const saveHeld=()=>HOLD===1;
let ONSAVE=()=>{};
export const setSaveError=f=>{
 ONSAVE=(typeof f==="function")?f:(()=>{});
};
async function flush(){
 AT=null;
 if(HOLD){DIRTY=false; return}  /* درسٌ جارٍ: لا يُكتب شيء */
 if(SEALED)return;              /* saveNow كتبت الأخيرة — لا تُسبَق */
 if(BUSY){DIRTY=true; return}
 if(!DIRTY)return;
 DIRTY=false; BUSY=true;
 let r;
 try{r=await Store.save(pack())}
 catch(e){r={ok:0,via:"?",err:(e&&e.message)||String(e)}}
 BUSY=false;
 if(SEALED)return;              /* أُغلق الباب أثناء الكتابة */
 /* ═══ تعارضُ تبويبين ═══ P4-009
    المخزَّنُ أحدثُ ممّا يعرفه هذا التبويب: لا نكتب فوقه ولا نُعيد
    المحاولة في حلقة. القرارُ للمستخدم عبر ONCONFLICT (أبقِ النسختين
    أو حمّل الأحدث)، ونسختُه محفوظةٌ جانباً في كل الأحوال. */
 if(r&&r.conflict){
  if(ONCONFLICT)ONCONFLICT(r); else ONSAVE(r);
  return;
 }
 if(!r.ok)ONSAVE(r);
 /* ═══ النسخةُ الاحتياطية الخارجية ═══ P-تحسين
    خطّافٌ لا استيراد: `state.js` لا يعرف io/backup.js ولا io/project.js
    (دورةٌ)، فالواجهةُ تركّب الخطّافَ وهي تملك الاثنين. وغيابُه يعني
    «لا نسخةَ مُفعَّلة» فلا شيءَ يتغيّر. والنصُّ يُبنى داخل الخطّاف
    فلا كلفةَ تسلسلٍ إن كانت مُطفأة. */
 if(BKHOOK){try{BKHOOK()}catch(e){}}
 if(DIRTY&&!AT)AT=setTimeout(flush,700);
}
/* قرارُ المستخدم في التعارض — مسارانِ صريحان لا ثالث لهما */
let ONCONFLICT=null;
export const setConflict=f=>{
 ONCONFLICT=(typeof f==="function")?f:null;
};
/* «حمّل الأحدث»: نتبنّى ما في المخزن ونُسقط ما كان سيُكتَب */
export async function takeNewer(){
 const r=await Store.load();
 if(!r||!r.data||!Array.isArray(r.data.walls))return false;
 loadState(r.data,true);
 DIRTY=false;
 AFTER(true);
 return true;
}
/* «احتفظ بنسختي»: كتابةٌ صريحةٌ فوق الأحدث بعد موافقةٍ مرئية */
export async function keepMine(){
 const r=await Store.save(pack(),{force:1});
 if(r&&r.ok)DIRTY=false;
 return r;
}
/* النسخةُ المحتفظ بها جانباً من آخر تعارض */
export const conflictCopy=()=>Store.conflictGet();
export const conflictDrop=()=>Store.conflictClear();
/* خطّافُ النسخة الاحتياطية — تركّبه الواجهة */
let BKHOOK=null;
export const setBackupHook=f=>{BKHOOK=(typeof f==="function")?f:null};
export function autosave(){
 if(HOLD)return;
 DIRTY=true;
 SEALED=false;              /* تعديلٌ جديد: الصفحة عادت */
 if(AT)clearTimeout(AT);
 AT=setTimeout(flush,700);
}
/* ═══ الكتابة الأخيرة ═══
   تُنادى عند الإغلاق والإخفاء. تكتب متزامناً وتُغلق الباب: كتابةٌ
   آجلة كانت قيد التنفيذ تحمل لقطةً أقدم، فلو أكملت بعدها لكتبت
   فوق الأحدث — وهو الفقد نفسه الذي بُنيت هذه الدالّة لمنعه. */
export function saveNow(){
 if(AT){clearTimeout(AT); AT=null}
 if(HOLD){DIRTY=false; return {ok:1,via:"held"}}
 if(!DIRTY&&!BUSY){SEALED=true; return {ok:1,via:"skip"}}
 DIRTY=false; SEALED=true;
 const r=Store.flushSync(pack());
 if(r&&r.conflict&&ONCONFLICT)ONCONFLICT(r);
 /* المسارُ المتزامنُ يُنادي الخُطّافَ أيضاً: لو أُغلقت الصفحةُ قبل
    انقضاء مهلة flush (٧٠٠ms) ضاع آخرُ تعديلٍ من النسخة الخارجية.
    والكتابةُ نفسُها غيرُ مضمونةٍ في اللحظة الأخيرة — flushSoon في
    app.js تحاول، والمحليُّ هو الضمانُ الوحيد. مكتوبٌ في 08. */
 if(BKHOOK){try{BKHOOK()}catch(e){}}
 return r;
}
/* الصفحة عادت (visibilitychange ⇒ visible): يُفتَح الباب */
export function saveResume(){
 if(!SEALED)return false;
 SEALED=false;
 if(DIRTY)autosave();
 return true;
}
export function loadState(d,resetHist){
 apply(d||DEF(),{full:true});
 if(resetHist)clearHistory();
 touch();
 return S;
}
export function newState(){
 setIdc(0);
 loadState(DEF(),true);
 DIRTY=false; SEALED=false;
 if(AT){clearTimeout(AT); AT=null}
 Store.del();
 AFTER(true);
 return S;
}
/* ═══ الاستعادة ═══
   تعيد اسم المصدر ("idb" · "ls" · "migrate") أو كائناً
   {via:"healed",refs} أو false. والسلسلة صادقة، فمن كان يفحص
   صحّتها يبقى على حاله — والمستدعي يقرأ had.via أو had. */
export async function restore(){
 let r=null;
 try{r=await Store.load()}
 catch(e){return false}
 if(!r||!r.data||!Array.isArray(r.data.walls))return false;
 loadState(r.data,true);
 /* الترميم والهجرة يُثبَّتان في IndexedDB فوراً، فلا يُعاد
    الترميم في كل إقلاع */
 if(r.via==="migrate"||r.via==="healed")autosave();
 return (r.via==="healed")
  ? {via:"healed",refs:r.refs||0} : r.via;
}

/* ═══ ما قوّمته ensureShape عند التحميل — يُقال ولا يُخفى ═══
   ensureShape تنقّي صامتةً (بقيّة تنقياتها كذلك)، والإبلاغ مسؤوليّة
   الطبقة التي تعرف كيف تُظهر رسالة. هذه الدالّة تجمع أثرَ التنقية في
   رسائل جاهزة وتمسح الحقول المؤقتة (لا تدخل pack) فلا تُعاد.
   تُنادى بعد كل تحميل: الإقلاع وفتحُ ملفّ. تُعيد [[sev,msg],…]. */
export function shapeNotes(){
 /* السجلُّ المنظَّم (shape.js): كلُّ drop وrepair وnormalize بنوعه
    وكيانه وسببه. القراءةُ تُفرِّغه فلا تُعاد الرسالة، ولا يدخل pack. */
 const out=S.__shapeLog?SH.notes(S.__shapeLog):[];
 delete S.__shapeLog;
 return out;
}
