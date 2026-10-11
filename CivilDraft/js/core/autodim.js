/* ═══ الأبعاد التلقائية للغرف ═══
   دوالٌّ خالصة: تقرأ حلقة منطقةٍ (ring بالمليمتر) وتعيد مواصفات
   الأبعاد والملصق — لا تكتب في الحالة. الأداةُ في tools/annotate.js
   هي من تُنشئ addDim/addText داخل edit() واحد.

   القرار: بُعدٌ أفقيّ أسفل الغرفة وبُعدٌ رأسيّ يسارها، بإزاحةٍ ثابتة
   عن حدود الحلقة، وملصقٌ «العرض×الطول» + المساحة في وسط الغرفة. */
import {bboxOf, pArea, centroid} from "./geom.js";
import {dm2} from "./units.js";

const R=v=>Math.round(v);
export function roomDims(ring, opt){
 const O=Object.assign({off:1000}, opt||{});
 const B=bboxOf(ring||[]);
 if(!B)return null;
 const w=B.x1-B.x0, h=B.y1-B.y0;
 if(w<300||h<300)return null;             /* أصغر من أن يُبعَّد */
 const off=Math.max(300, O.off);          /* إزاحة خطّ البُعد (مم) */
 const c=centroid(ring||[]);
 const area=Math.abs(pArea(ring||[]));
 const dims=[
  {kind:"h", a:[R(B.x0),R(B.y0)], b:[R(B.x1),R(B.y0)], pos:R(B.y0-off)},
  {kind:"v", a:[R(B.x0),R(B.y0)], b:[R(B.x0),R(B.y1)], pos:R(B.x0-off)}
 ];
 return {
  w, h, area,
  center:[R(c[0]),R(c[1])],
  dims,
  sizeText:dm2(w,h),                       /* معزولٌ ltr — «5.00×4.00» */
  areaText:(area/1e6).toFixed(2)+" م²"
 };
}
