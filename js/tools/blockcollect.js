/* ═══ جمع التحديد كبدائيات لإنشاء كتلة — MT3 ═══
   يحوّل تحديداً إلى بدائيات عامة (pline/line/circle/arc) لا روابط
   نواة، ويمرّ عبرها إنشاءُ الكتلة بـdefineFromPrims → V("blockDef")
   → checkPrims. ويستبعد المخفيّ وغير القابل للطباعة ويعلن العدد.

   ═══ المرحلة 5: الأقواس حقيقية لا مُقرَّبة ═══
   كان كلُّ عنصرٍ يُسقَط إمّا إلى outlineOf (مضلّع) وإمّا shapeOf
   (خطّ) — فعمودٌ دائريّ وجدارٌ قوسيٌّ يتحوّلان دائماً إلى مضلّعٍ
   مقرَّب أو وترٍ فاقدِ الانحناء، ويموت القوس قبل أن يبلغ explode
   أو المُصدِّرَين. اليوم:
     · العمود الدائريّ → دائرةٌ حقيقية (t:"circle") بمركزه ونصف قطره.
     · الجدار القوسيّ → قوسُ محوره (t:"arc") محسوبٌ من bulge عبر
       arcParams (core/arcmath.js) — المصدر الوحيد لهذه الرياضيات في
       المشروع، فلا يُعاد اشتقاقها هنا بصيغةٍ ثانية قد تنحرف عنها.
       الزوايا بالراديان كأوّليات الكتلة (explode يحوّلها درجاتٍ في
       التصدير: D14).
     · سماكةُ الجدار القوسي لا تمثّلها أوّليّاتُ الخطّ/المضلّع —
       قوسُ المحور هو التمثيلُ الوفيّ، والحَدُّ موثّقٌ في
       KNOWN-DEFECTS بوصفه قراراً صريحاً لا تقريباً. */
import * as E from "../core/ents.js";
import * as LAY from "../core/layers.js";
import {bboxOf} from "../core/geom.js";
import {wallById,isArc} from "../core/walls.js";
import {arcParams} from "../core/arcmath.js";
import {colById,colW} from "../core/cols.js";

const R=v=>Math.round(v);

/* قوسُ محور جدارٍ قوسي من bulge — زوايا بالراديان لأوّليات الكتلة */
function arcOfWall(w){
 const P=arcParams(w);
 if(!P)return null;
 return {t:"arc", c:[R(P.cx),R(P.cy)], r:Math.max(1,R(P.R)),
  a0:P.a0, a1:P.a1};
}

/* دائرةُ عمودٍ دائري — مركزه ونصف قطره الحقيقيّان */
function circleOfCol(c){
 return {t:"circle", c:[R(c.x),R(c.y)], r:Math.max(1,R(colW(c)/2))};
}

export function collectFromSel(list){
 const out=[]; let excluded=0;
 const pts=[];
 for(const s of (list||[])){
  const L=LAY.layOfEnt(s);
  if(!L||!LAY.vis(L)||!LAY.plots(L)){excluded++; continue}
  /* ═══ الأقواس والدوائر تبقى حقيقية — المرحلة 5 ═══ */
  if(s.k==="wall"){
   const w=wallById(s.id);
   if(w&&isArc(w)){
    const arc=arcOfWall(w);
    if(arc){
     out.push(arc);
     pts.push(arc.c,w.a,w.b);
     const r=arc.r, c=arc.c;
     [[c[0]+r,c[1]],[c[0]-r,c[1]],[c[0],c[1]+r],[c[0],c[1]-r]]
      .forEach(p=>pts.push(p));
     continue;
    }
   }
  }
  if(s.k==="col"){
   const c=colById(s.id);
   if(c&&c.kind==="circ"){
    const circ=circleOfCol(c);
    out.push(circ);
    pts.push(circ.c);
    const r=circ.r, q=circ.c;
    [[q[0]+r,q[1]],[q[0]-r,q[1]],[q[0],q[1]+r],[q[0],q[1]-r]]
     .forEach(p=>pts.push(p));
    continue;
   }
  }
  const poly=E.outlineOf(s);
  if(Array.isArray(poly)&&poly.length>2){
   const ring=poly.map(p=>[Math.round(p[0]),Math.round(p[1])]);
   out.push({t:"pline",closed:true,pts:ring});
   ring.forEach(p=>pts.push(p));
   continue;
  }
  const sh=E.shapeOf(s);
  if(sh&&sh.t==="seg"&&Array.isArray(sh.a)&&Array.isArray(sh.b)){
   const a=[Math.round(sh.a[0]),Math.round(sh.a[1])];
   const b=[Math.round(sh.b[0]),Math.round(sh.b[1])];
   out.push({t:"line",a,b});
   pts.push(a,b);
  }else{
   excluded++;                       /* لم يُجمَّد خطاً ولا مضلّعاً */
  }
 }
 return {prims:out,excluded,bb:bboxOf(pts)};
}
