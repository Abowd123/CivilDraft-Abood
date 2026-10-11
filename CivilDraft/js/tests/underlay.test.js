/* ═══ 3.3 + 7.1 + 7.3: الصورة المرجعية في الحالة ═══
   يغطي: تحميل صورةٍ يدخل التاريخ (edit)، رفضَ صورةٍ تتجاوز
   MAX_SRC، وأهمّ من ذلك — أنّ صورةً كبيرةً (فوق حدّ الاستثناء من
   اللقطة التاريخية) تُستعاد صحيحةً عبر التراجع حتى بعد تحميلَين
   متتاليَين، وهو العطبُ الذي كانت مراجعةٌ سابقة قد كشفته في
   تصميمٍ بخانة تخزينٍ واحدة (UIMG). */
import {shim} from "./harness.js";
shim();
import {group, ok, eq, near, summary} from "./harness.js";
import {S, ensureShape, DEF, pack, snapshot, edit, undo, redo, canUndo}
 from "../core/state.js";
import {setImage, calibrate, state} from "../core/underlay.js";
import * as Store from "../io/store.js";

const reset=()=>{Object.assign(S,DEF()); ensureShape()};
/* data: URL بحجمٍ محدَّد تقريباً — يُستعمل لتجاوز حدود الاختبار
   (٢٠٠ ك.ب لاستثناء اللقطة، ٤ م.ب لرفض التحميل) بلا صورةٍ حقيقية. */
const fakeSrc=n=>"data:image/png;base64,"+"A".repeat(Math.max(0,n));

group("تحميل صورة مرجعية يدخل التاريخ", ()=>{
 reset();
 const small=fakeSrc(100);
 setImage(small);
 eq(S.underlay.src, small, "src لم يُكتَب");
 eq(S.underlay.visible, 1, "لم تُظهَر تلقائياً بعد التحميل");
 ok(canUndo(), "التحميل لم يدخل التاريخ");
 undo();
 eq(S.underlay.src, "", "التراجع لم يُعِد الحالة الفارغة");
});

group("MAX_SRC: صورةٌ كبيرة جداً تُرفَض ولا تُغيّر الحالة", ()=>{
 reset();
 const huge=fakeSrc(5*1024*1024);   /* 5 م.ب > الحدّ 4 م.ب */
 const before=canUndo();
 setImage(huge);
 eq(S.underlay.src, "", "صورةٌ متجاوِزةٌ للحدّ كُتِبت رغم الرفض");
 eq(canUndo(), before, "الرفض دفع خطوة تاريخٍ خطأً");
});

group("لقطةٌ صغيرة: src يبقى كاملاً داخل pack() و snapshot()", ()=>{
 reset();
 const small=fakeSrc(1000);   /* دون حدّ الاستثناء 200 ك.ب */
 setImage(small);
 const p=pack();
 eq(p.underlay.src, small, "pack لم يحمل src الصغير كاملاً");
 const sn=JSON.parse(snapshot());
 eq(sn.underlay.src, small, "snapshot استثنت src الصغير خطأً");
});

group("لقطةٌ كبيرة: src يُستثنى من snapshot() ويُستعاد صحيحاً بالتراجع", ()=>{
 reset();
 const big=fakeSrc(300*1024);   /* فوق حدّ الاستثناء 200 ك.ب */
 setImage(big);
 const sn=JSON.parse(snapshot());
 eq(sn.underlay.src, "", "اللقطة التاريخية حملت src الكبير كاملاً — يُضاعف الذاكرة");
 ok(sn.underlay.__uv!=null, "اللقطة لم تحمل مرجع نسخةٍ (__uv)");
 /* لكنّ الحفظ الفعليّ (pack) يبقى كاملاً — فقط التاريخ يُستثنى */
 const p=pack();
 eq(p.underlay.src, big, "pack استثنت src الكبير من ملفّ الحفظ خطأً");
});

group("عطبٌ مكتشَف سابقاً: تحميلان كبيران متتاليان ثم تراجعان", ()=>{
 /* هذا هو الاختبار الحاسم: تصميمٌ بخانة تخزينٍ واحدة (UIMG) كان
    يُعيد الصورة الأحدث خطأً عند التراجع إلى النسخة الأقدم. */
 reset();
 const A=fakeSrc(250*1024), B=fakeSrc(260*1024);
 setImage(A);
 setImage(B);
 eq(S.underlay.src, B, "الحالة الحالية ليست الصورة الثانية");
 undo();   /* يُفترض العودة إلى ما قبل تحميل B، أي: A ظاهرةً */
 eq(S.underlay.src, A,
  "التراجع بعد تحميلَين أعاد الصورة الخطأ (عطب UIMG القديم)");
 undo();   /* يُفترض العودة إلى ما قبل تحميل A، أي: لا صورة */
 eq(S.underlay.src, "", "التراجع الثاني لم يُعِد الحالة الفارغة");
 redo();
 eq(S.underlay.src, A, "الإعادة لم تُعِد A");
 redo();
 eq(S.underlay.src, B, "الإعادة الثانية لم تُعِد B");
});

group("calibrate يدخل التاريخ ويُتراجَع عنه", ()=>{
 reset();
 setImage(fakeSrc(100));
 const before=state().mpp;
 const after=calibrate({x:0,y:0},{x:100,y:0},10);
 near(after, before*(10/100), 1e-9, "calibrate لم يُعدِّل mpp صحيحاً");
 eq(S.underlay.mpp, after, "calibrate لم يكتب mpp في الحالة");
 undo();
 near(S.underlay.mpp, before, 1e-9, "التراجع لم يُعِد mpp إلى ما قبل المعايرة");
});

group("ensureShape يطرد src لا يبدأ بـ data:image/", ()=>{
 reset();
 S.underlay.src="javascript:alert(1)";
 ensureShape();
 eq(S.underlay.src, "", "src الخبيث لم يُطرَد");
});

/* ═══ سقف الصور الحيّة: onload متأخّرٌ من تحميلٍ سابق لا يطغى ═══
   img/imgSrc في underlay.js خانةٌ واحدة لا مصفوفة — فتحميلان
   متتاليان قبل اكتمال الأوّل يجب أن يُبقيا الأحدثَ وحده حيّاً.
   الحارسُ الفعليّ (imgSrc!==src ⇒ تجاهل onload) لا يُختبَر اليوم
   لأنّ Node بلا Image عالميّ فيعود loadImg مبكراً (img=null دوماً).
   هنا نموذجٌ مصغّرٌ لـImage يتحكّم بتوقيت onload يدوياً ليثبت أنّ
   الأقدم المتأخّر لا يكتب فوق أبعاد الأحدث. */
group("سقف الصور الحيّة: onload متأخّرٌ لتحميلٍ سابق لا يطغى على الأحدث", ()=>{
 reset();
 const created=[];
 class FakeImage{
  constructor(){ created.push(this); this.onload=null;
   this.naturalWidth=0; this.naturalHeight=0; this._src=""; }
  set src(v){ this._src=v; }
  get src(){ return this._src; }
 }
 const prevImage=globalThis.Image;
 globalThis.Image=FakeImage;
 try{
  const A=fakeSrc(100), B=fakeSrc(120);
  setImage(A);
  eq(created.length, 1, "صورةٌ حيّةٌ واحدة أُنشئت لأوّل تحميل");
  const imgA=created[0];
  setImage(B);
  eq(created.length, 2, "صورةٌ حيّةٌ ثانية أُنشئت للتحميل الثاني");
  const imgB=created[1];
  /* الأحدث (B) يكتمل أوّلاً */
  imgB.naturalWidth=200; imgB.naturalHeight=150; imgB.onload();
  eq(S.underlay.w, 200, "أبعاد B سُجّلت");
  eq(S.underlay.h, 150, "وارتفاعها");
  /* والأقدم (A) يكتمل متأخّراً — onload شبحٌ يجب تجاهله */
  imgA.naturalWidth=50; imgA.naturalHeight=50; imgA.onload();
  eq(S.underlay.w, 200, "onload المتأخّر لصورةٍ سابقة لم يطغَ على الأحدث");
  eq(S.underlay.h, 150, "ولا ارتفاعها");
 } finally {
  if(prevImage===undefined)delete globalThis.Image;
  else globalThis.Image=prevImage;
 }
});

process.exit(summary());
