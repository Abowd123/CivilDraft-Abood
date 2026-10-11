/* ═══ اختبار الميزات الجديدة ═══
   POC خالص في Node: (1) هندسة الجدار القوسي، (2) الإسقاط 3D،
   (3) الأبعاد التلقائية. لا واجهة — نواةٌ فقط. */
import {shim} from "./harness.js";
shim();
import {group, ok, eq, near, deep, throws, summary} from "./harness.js";
import {isArc, arcParams, arcTess, arcLen, band, bulgeFrom3, addWall,
 wallLen, arcPoint, arcMidPoint, arcNear, arcPerp, wallAt}
 from "../core/walls.js";
import {osnap} from "../core/osnap.js";
import {snapToWall} from "../core/fixt.js";
import {bandPoly, pArea, bboxOf} from "../core/geom.js";
import {S, ensureShape, shapeNotes} from "../core/state.js";
import * as MOD from "../core/modify.js";
import {ENT} from "../core/entreg.js";
import {bodyOf,centers} from "../core/render.js";
import {project, projScreen, projBBox, shade} from "../core/proj3d.js";
import {roomDims} from "../core/autodim.js";
import {projectWall, viewFrame, elevation} from "../core/elevation.js";
import {sectWalls,cutFoot,sOfCut} from "../core/section.js";

const QB=Math.tan(Math.PI/8);            /* bulge لربع دائرة (90°) */

group("قوس: المعاملات لربع دائرة", ()=>{
 const w={id:"W1", a:[1000,0], b:[0,1000], t:200, bulge:QB};
 ok(isArc(w), "الجدار يُعرَف قوسياً");
 const P=arcParams(w);
 near(P.cx, 0, 0.5, "مركز X ≈ 0");
 near(P.cy, 0, 0.5, "مركز Y ≈ 0");
 near(P.R, 1000, 0.5, "نصف القطر ≈ 1000");
 near(Math.abs(P.sweep), Math.PI/2, 1e-3, "الزاوية المحصورة ≈ 90°");
 near(arcLen(w), (Math.PI/2)*1000, 1, "طول القوس ≈ πR/2");
 const pts=arcTess(w, 0);
 ok(Array.isArray(pts)&&pts.length>=7, "arcTess يعيد نقاطاً على المسار");
 near(pts[0][0], 1000, 0.5, "أوّل نقطةٍ عند a");
});

group("قوس: الجسم مضلّعٌ مغلق صالح", ()=>{
 const w={id:"W1", a:[1000,0], b:[0,1000], t:200, bulge:QB};
 const poly=band(w);
 ok(Array.isArray(poly)&&poly.length>6, "المضلّع فيه رؤوسٌ عدّة");
 ok(Math.abs(pArea(poly))>0, "مساحة الجسم موجبة");
 const B=bboxOf(poly);
 /* القوس ينتفخ نحو الخارج: الحدّ يتجاوز نقطتي الطرف */
 ok(B.x1>1000-1 && B.y1>1000-1, "الصندوق يشمل انتفاخ القوس");
 /* مساحة شريط القوس ≈ الطول × السماكة (تقريباً) */
 near(Math.abs(pArea(poly)), (Math.PI/2)*1000*200, 20000,
  "مساحة الشريط ≈ الطول×السماكة");
});

group("قوس: bulge=0 مطابقٌ للجدار المستقيم", ()=>{
 const w={id:"W1", a:[0,0], b:[4000,0], t:200};
 ok(!isArc(w), "بلا bulge ليس قوسياً");
 const got=band(w);
 const want=bandPoly(0,0,4000,0,200);
 deep(got, want, "الجسم يطابق bandPoly المستقيم بالضبط");
});

group("قوس: استرجاع bulge من ثلاث نقاط", ()=>{
 const bg=bulgeFrom3([1000,0],[0,1000],[707,707]);
 near(bg, QB, 0.03, "النقطة على ربع الدائرة تعطي bulge≈tan(π/8)");
 const straight=bulgeFrom3([0,0],[1000,0],[500,1]);
 near(straight, 0, 0.02, "نقطةٌ شبه مستقيمة ⇒ bulge≈0");
 const other=bulgeFrom3([1000,0],[0,1000],[-707,-707]);
 ok(other<0, "النقطة على الجهة الأخرى ⇒ إشارةٌ سالبة");
});

group("قوس: يدخل bodyOf مع الجدران المستقيمة", ()=>{
 ensureShape();
 S.walls.length=0;                                 /* لوحةٌ نظيفة */
 /* مربّع 5×4 بجدارٍ علويّ قوسيّ */
 addWall([0,0],[5000,0],200,"ext","c");            /* سفلي */
 addWall([5000,0],[5000,4000],200,"ext","c");       /* يمين */
 addWall([0,0],[0,4000],200,"ext","c");             /* يسار */
 addWall([0,4000],[5000,4000],200,"ext","c",null,QB*0.5); /* علوي قوسي */
 const rings=bodyOf(S.walls, S.cols, false);
 ok(rings.length>=1, "bodyOf يعيد حلقةً واحدة على الأقلّ");
 const arcW=S.walls[S.walls.length-1];
 ok(isArc(arcW), "الجدار العلويّ قوسيّ");
 const B=bboxOf(band(arcW));
 ok(B.y1>4000, "القوس العلويّ ينتفخ فوق 4000");
});

group("إسقاط 3D: حتميّ ومنطقيّ", ()=>{
 const cam={yaw:Math.PI/4, pitch:Math.PI/3, scale:1, ox:0, oy:0};
 const a=project([0,0,0],cam), b=project([0,0,0],cam);
 deep(a, b, "الإسقاط حتميّ لنفس المدخل");
 const top=project([0,0,3000],cam);
 const base=project([0,0,0],cam);
 ok(top.sy>base.sy, "الارتفاع يرفع النقطة على الشاشة");
 ok(top.depth!==base.depth, "الأعلى يغيّر العمق");
 const box=[[0,0,0],[5000,0,0],[5000,4000,0],[0,4000,0],
   [0,0,3000],[5000,0,3000],[5000,4000,3000],[0,4000,3000]];
 const B=projBBox(box, cam);
 ok(B && (B.x1-B.x0)>0 && (B.y1-B.y0)>0, "صندوق الإسقاط غير منحلّ");
 const s=shade([0,0,1],[0,0,1]);
 near(s, 1, 0.001, "وجهٌ مواجهٌ للنور أشدّ إضاءة");
 ok(shade([1,0,0],[0,0,1])<s, "وجهٌ جانبيّ أخفت");
 const sc=projScreen([1000,0,0],cam);
 ok(Array.isArray(sc)&&sc.length===2, "projScreen يعيد [x,y]");
});

group("قوس: wallLen يعطي طول القوس لا الوتر", ()=>{
 const w={id:"W2", a:[1000,0], b:[0,1000], t:200, bulge:QB};
 const chord=Math.hypot(1000,1000);
 const trueArc=(Math.PI/2)*1000;        /* ربع محيط دائرة نصف قطرها 1000 */
 near(arcLen(w), trueArc, 1, "arcLen صحيح");
 ok(Math.abs(wallLen(w)-chord)>50,
  "wallLen لا يساوي الوتر (لم يعد يتجاهل الانحناء)");
 near(wallLen(w), trueArc, 1, "wallLen يساوي arcLen للجدار القوسي");
 const straight={id:"W3", a:[0,0], b:[1000,0], t:200};
 near(wallLen(straight), 1000, 1, "wallLen يبقى الوتر للجدار المستقيم");
});

group("قوس: يُستبعَد من إسقاط الواجهات/المقاطع صراحةً", ()=>{
 const arc={id:"W4", a:[1000,0], b:[0,1000], t:200, bulge:QB, type:"ext"};
 const F=viewFrame("N");
 ok(projectWall(arc,F,null,0)===null,
  "projectWall يعيد null للجدار القوسي بدل إسقاطٍ خاطئ");
 const straight={id:"W5", a:[0,0], b:[1000,0], t:200, type:"ext"};
 ok(projectWall(straight,F,null,0)!==null,
  "المستقيم ما زال يُسقَط كالمعتاد");
});

group("أبعاد تلقائية: مستطيلٌ بسيط", ()=>{
 const ring=[[0,0],[5000,0],[5000,4000],[0,4000]];
 const r=roomDims(ring,{off:1000});
 near(r.w, 5000, 1, "العرض 5000");
 near(r.h, 4000, 1, "الطول 4000");
 eq(r.dims.length, 2, "بُعدان: أفقيّ ورأسيّ");
 eq(r.dims[0].kind, "h", "الأوّل أفقيّ");
 eq(r.dims[1].kind, "v", "الثاني رأسيّ");
 ok(r.sizeText.includes("5.00×4.00"), "نصّ المقاس يحوي 5.00×4.00");
 near(r.area, 20000000, 1, "المساحة 20 م²");
 eq(r.areaText, "20.00 م²", "نصّ المساحة صحيح");
 ok(roomDims([[0,0],[100,0],[100,100],[0,100]])===null,
  "غرفةٌ أصغر من الحدّ تُهمَل");
});

group("قوس: حماية من نصف قطرٍ سالب — الرفض عند الإنشاء", ()=>{
 ensureShape();
 S.walls.length=0;
 S.meta.tInt=150;
 /* قوس ربع دائرة عبر نقطتين بطول ≈282 مم (نصف قطره ≈200) بسماكة
    500 — نصف السماكة (250) أكبر من نصف القطر */
 throws(()=>addWall([0,0],[200,200],500,"int","c",null,1),
  /نصف قطره/, "addWall يرفض قوساً بنصف قطرٍ أصغر من نصف سماكته");
 eq(S.walls.length, 0, "الجدار المرفوض لم يُضَف إلى الحالة");
 const w1=addWall([0,0],[2000,2000],150,"int","c",null,1);
 ok(w1.bulge!=null, "القوس المعقول يُقبَل ويحتفظ بـbulge");
});

group("قوس: حماية من نصف قطرٍ سالب — الحماية عند البناء", ()=>{
 const bad={id:"W9",a:[0,0],b:[200,200],t:500,type:"int",
            align:"c",bulge:1};
 const P9=arcParams(bad);
 ok(!!P9 && P9.R<bad.t/2+1,
  "الاختبار نفسه صالح: نصف القطر أصغر من نصف السماكة+1");
 ok(arcTess(bad,bad.t/2)===null,
  "arcTess تعيد null على قوسٍ بنصف قطر فعّال غير موجب");
 ok(band(bad)===null,
  "band لا تبني مضلّعاً على قوسٍ بنصف قطر سالب");
});

group("قوس: حماية من نصف قطرٍ سالب — التنقية عند التحميل", ()=>{
 S.meta.tInt=150;
 S.walls=[{id:"W1",a:[0,0],b:[200,200],t:500,type:"int",
           align:"c",bulge:1}];
 S.opens=[];
 ensureShape();
 eq(S.walls.length, 1, "الجدار يبقى — يُستقام لا يُحذَف");
 ok(S.walls[0].bulge==null,
  "ensureShape تطرح bulge الفاسد فيعود الجدار مستقيماً");
 ok(band(S.walls[0])!==null,
  "الجدار المُستقام يُبنى بلا مشكلة");

 S.walls=[{id:"W1",a:[0,0],b:[2000,2000],t:150,type:"int",
           align:"c",bulge:1}];
 ensureShape();
 eq(S.walls[0].bulge, 1, "القوس المعقول يبقى كما هو بعد التحميل");
});

group("١٫٤: فتحةٌ على جدارٍ قوسيّ تُطرَد عند التحميل", ()=>{
 S.walls=[{id:"W1",a:[0,0],b:[1000,0],t:150,type:"int",
           align:"c",bulge:0.5}];
 S.opens=[{id:"O1",wall:"W1",kind:"door",s:500,w:900,h:2100}];
 ensureShape();
 eq(S.opens.length, 0, "الفتحة على الجدار القوسي طُردت");

 S.walls=[{id:"W1",a:[0,0],b:[3000,0],t:150,type:"int",align:"c"}];
 S.opens=[{id:"O1",wall:"W1",kind:"door",s:1500,w:900,h:2100}];
 ensureShape();
 eq(S.opens.length, 1, "الفتحة على جدارٍ مستقيم لم تُطرَد خطأً");
});

/* ═══ ٤٫٥ — الجدار القوسيّ يُلتقَط ويُصاب على قوسه لا على وتره ═══
   ربعُ دائرةٍ نصف قطرها ١٠٠٠ حول (0,0) من (1000,0) إلى (0,1000):
   منتصفُ الوتر (500,500) ومنتصفُ القوس (707,707) — بينهما ٢٩٣ مم.
   سُمكه ١٠٠ فوجهاه على نصفَي قطرٍ ٩٥٠ و١٠٥٠. */
const arcRig=(bulge,t)=>{
 S.walls=[]; S.opens=[];
 return addWall([1000,0],[0,1000],t||100,"int","c",null,bulge);
};
const onlyOs=(...k)=>{
 const o={end:0,mid:0,int:0,per:0,near:0,nod:0,ref:0};
 k.forEach(m=>{o[m]=1});
 S.os=o;
};
const rad=p=>Math.hypot(p[0],p[1]);

group("٤٫٥: arcMidPoint وarcPoint من القوس نفسه", ()=>{
 const w=arcRig(QB);
 const m=arcMidPoint(w);
 ok(m&&Math.abs(m[0]-707)<=1&&Math.abs(m[1]-707)<=1,
  "منتصف القوس (٧٠٧،٧٠٧) لا منتصف الوتر");
 near(rad(m),1000,1,"ويبعد R عن المركز");
 near(Math.hypot(m[0]-500,m[1]-500),293,1,
  "وعن منتصف الوتر ٢٩٣ مم (٢٩٪ من R)");
 const q=arcMidPoint(arcRig(-QB));
 ok(q&&Math.abs(q[0]-293)<=1&&Math.abs(q[1]-293)<=1,
  "والقوس السالب (مع عقارب الساعة) مركزُه (١٠٠٠،١٠٠٠) فمنتصفه (٢٩٣،٢٩٣)");
 const w2=arcRig(QB);
 near(rad(arcPoint(w2,0.5,50)),950,1,"ونقطةُ وجهٍ مُزاح +t/2 على نصف قطر ٩٥٠");
 near(rad(arcPoint(w2,0.5,-50)),1050,1,"والمُزاح −t/2 على ١٠٥٠");
 deep(arcPoint(w2,0,0).map(Math.round),[1000,0],"u=0 هو طرف a");
 deep(arcPoint(w2,1,0).map(Math.round),[0,1000],"u=1 هو طرف b");
 eq(arcMidPoint({id:"X",a:[0,0],b:[1000,0],t:100}),null,
  "والمستقيم لا قوسَ له فيعيد null");
});

group("٤٫٥: arcNear وarcPerp داخل المدى وخارجه", ()=>{
 const w=arcRig(QB);
 let r=arcNear(w,800,800);
 near(rad(r.p),1000,1,"أقربُ نقطةٍ على الدائرة");
 near(r.d,Math.hypot(800,800)-1000,1,"والمسافة فرقُ نصفَي القطر");
 r=arcNear(w,-300,-300);
 ok(Math.hypot(r.p[0]-1000,r.p[1])<1||Math.hypot(r.p[0],r.p[1]-1000)<1,
  "وخارجَ المدى تكون أقربُ نقطةٍ أحدَ الطرفين لا نقطةً على الدائرة");
 const P1=arcPerp(w,2000,2000);
 eq(P1.length,1,"من نقطةٍ خارجيّة قدمٌ واحدة داخل المدى");
 near(P1[0][0],707,1,"عند (٧٠٧،٧٠٧)");
 eq(arcPerp(w,-2000,-2000).length,1,
  "ومن الجهة المقابلة يقع القدمُ الآخر على الدائرة داخل المدى");
 eq(arcPerp(w,2000,-2000).length,0,
  "ومن نقطةٍ تقع زاويتُها وزاويةُ مقابلتها خارجَ المدى لا قدم");
 eq(arcPerp(w,0,0).length,0,"ومن المركز نفسه لا قدم (كلّ النقاط متساوية)");
 /* قوسٌ يعبر ±π: التطبيع لا المقارنة الخام */
 S.walls=[];
 const h=addWall([-1000,100],[-1000,-100],100,"int","c",null,QB);
 ok(arcParams(h),"قوسٌ صغير يعبر زاوية π");
 const mp=arcMidPoint(h);
 near(mp[0],-1041,1,"منتصفُه على الزاوية π نفسها");
 near(arcNear(h,mp[0]-5,mp[1]).d,5,1,
  "وأقربُ نقطةٍ إليه تُحسَب داخل مداه عبر ±π");
});

group("٤٫٥: osnap على القوس الفعلي", ()=>{
 const w=arcRig(QB);
 onlyOs("mid");
 let r=osnap(707,707,60);
 ok(r&&r.m==="mid"&&Math.abs(r.p[0]-707)<=1&&Math.abs(r.p[1]-707)<=1,
  "mid عند منتصف القوس الحقيقي");
 eq(osnap(500,500,100),null,
  "ولا mid عند منتصف الوتر (٢٩٣ مم عن القوس — خارج الجسم أيضاً)");
 /* منتصفا الوجهين على ٩٥٠ و١٠٥٠ لا على وجهَي الوتر */
 r=osnap(672,672,20);
 ok(r&&r.m==="mid"&&Math.abs(rad(r.p)-950)<=1,
  "mid على الوجه الداخلي (نصف قطر ٩٥٠)");
 r=osnap(742,742,20);
 ok(r&&r.m==="mid"&&Math.abs(rad(r.p)-1050)<=1,
  "وعلى الوجه الخارجي (١٠٥٠)");
 onlyOs("end");
 r=osnap(1050,0,20);
 ok(r&&r.m==="end"&&Math.abs(r.p[0]-1050)<=1&&Math.abs(r.p[1])<=1,
  "end عند طرف الوجه (١٠٥٠،٠) لا طرفٍ مُزاحٍ بإزاحة الوتر");
 onlyOs("near");
 r=osnap(800,800,400);
 ok(r&&r.m==="near"&&Math.abs(rad(r.p)-1000)<=1,
  "near على القوس (نصف قطر ١٠٠٠) لا على الوتر");
 eq(osnap(500,500,100),null,"ولا near قرب الوتر بعيداً عن القوس");
 onlyOs("per");
 r=osnap(707,707,60,[2000,2000]);
 ok(r&&r.m==="per"&&Math.abs(r.p[0]-707)<=1,
  "per: قدمُ العمود من نقطة خارجية على القوس");
 r=osnap(707,707,60,[-2000,-2000]);
 ok(r&&r.m==="per"&&Math.abs(r.p[0]-707)<=1,
  "وper من الجهة المقابلة");
 onlyOs("int");
 addWall([0,300],[1000,300],100,"int","c");
 let ri=osnap(500,500,500);
 ok(ri&&ri.m==="int"&&Math.abs(ri.p[0]-954)<=2&&Math.abs(ri.p[1]-300)<=2,
  "int: تقاطعُ القوس الحقيقي مع الجدار المستقيم عند (٩٥٤،٣٠٠)");
 ok(!(ri&&Math.abs(ri.p[0]-700)<=1&&Math.abs(ri.p[1]-300)<=1),
  "لا نقطةَ التقاطع الوهميّة على وتر القوس (٧٠٠،٣٠٠)");
});

group("٤٫٥: المستقيم لم يتغيّر", ()=>{
 S.walls=[]; S.opens=[];
 addWall([0,0],[4000,0],200,"int","c");
 onlyOs("mid");
 let r=osnap(2000,0,50);
 ok(r&&r.m==="mid"&&r.p[0]===2000&&r.p[1]===0,"mid المستقيم عند منتصف الوتر");
 r=osnap(2000,100,20);
 ok(r&&r.m==="mid"&&r.p[1]===100,"ومنتصف وجهه (٢٠٠٠،١٠٠)");
 onlyOs("near");
 r=osnap(1500,60,100);
 ok(r&&r.m==="near"&&r.p[0]===1500&&r.p[1]===0,"near المستقيم على محوره");
});

group("٤٫٥: wallAt يُصيب القوس لا وتره", ()=>{
 const w=arcRig(QB);
 const m=arcMidPoint(w);
 ok(wallAt(m[0],m[1],300)===w,"عند منتصف القوس الحقيقي: إصابة");
 ok(wallAt(500,500,200)===null,
  "وعند منتصف الوتر لا إصابة (كانت تُصيب بمسافة صفر من الوتر)");
 ok(wallAt(500,500,350)===w,
  "ويُصاب بتفاوتٍ يكفي المسافةَ الحقيقية (٢٩٣ مم عن القوس)");
 ok(wallAt(720,720,10)===w,"وداخل الجسم إصابةٌ بلا تفاوت");
 /* داخل جسمَين: الأقربُ إلى مساره لا إلى وتره */
 S.walls=[];
 const A=addWall([2000,0],[-2000,0],200,"int","c",null,1);   /* نصف دائرة R=2000 */
 const B=addWall([-500,1900],[500,1900],200,"int","c");
 ok(pipBoth(A,B,0,1990),"النقطة (٠،١٩٩٠) داخل جسمَي الجدارين");
 ok(wallAt(0,1990,50)===A,
  "والقوس أقربُ إليها بمسافة ١٠ لا ١٩٩٠ (الوتر): يُختار القوس");
 /* المستقيم على حاله */
 S.walls=[];
 const L=addWall([0,0],[4000,0],200,"int","c");
 ok(wallAt(2000,80,50)===L,"والمستقيم يُصاب داخل جسمه");
 ok(wallAt(2000,150,10)===null,"وخارجه بتفاوتٍ صغير لا يُصاب");
 ok(wallAt(2000,150,160)===L,"وبتفاوتٍ يكفي بُعدَه عن المحور (١٥٠) يُصاب");
});
function pipBoth(A,B,x,y){
 const inP=(w)=>{
  const p=band(w); if(!p)return false;
  let c=false;
  for(let i=0,j=p.length-1;i<p.length;j=i++){
   const [xi,yi]=p[i],[xj,yj]=p[j];
   if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;
  }
  return c;
 };
 return inP(A)&&inP(B);
}

group("٤٫٥: snapToWall على القوس سليمٌ أصلاً (يُثبَّت لا يُعدَّل)", ()=>{
 /* يقرأ band(w) — مضلّعَ القوس الفعلي — فيقع على وجهه لا على منتصف
    المسار. أيُّ «إصلاحٍ» يُسنده إلى arcMidPoint يضع الأداةَ داخل
    الجسم ويحصرها في نقطةٍ واحدة. */
 arcRig(QB,100);
 let r=snapToWall([800,800],1200);
 ok(r&&Math.abs(rad(r.p)-1050)<=3,
  "من خارج القوس: على الوجه الخارجي (نصف قطر ١٠٥٠)");
 r=snapToWall([600,600],1200);
 ok(r&&Math.abs(rad(r.p)-950)<=3,
  "ومن داخله: على الوجه الداخلي (٩٥٠)");
 const a=snapToWall([1300,300],1200), b=snapToWall([300,1300],1200);
 ok(a&&b&&Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1])>500,
  "ونقطتان مختلفتان تُسنَدان إلى موضعين مختلفين على القوس (لا نقطةٌ واحدة)");
});

group("الفتحة المطروحة عند التحميل تُقال لا تُخفى", ()=>{
 shapeNotes();      /* تفريغُ ما تركته المجموعات السابقة (يتراكم حتى يُقرأ) */
 /* ملفٌّ محرَّر: فتحتان على جدارٍ قوسيّ، وفتحةٌ يتيمة، وواحدةٌ سليمة */
 S.walls=[{id:"W1",a:[0,0],b:[1000,0],t:150,type:"int",align:"c",bulge:0.5},
          {id:"W2",a:[0,2000],b:[3000,2000],t:150,type:"int",align:"c"}];
 S.opens=[{id:"O1",wall:"W1",kind:"door",s:500,w:900,h:2100},
          {id:"O2",wall:"W1",kind:"window",s:300,w:800,h:1200},
          {id:"O3",wall:"NOPE",kind:"door",s:500,w:900,h:2100},
          {id:"O4",wall:"W2",kind:"door",s:1500,w:900,h:2100}];
 ensureShape();
 eq(S.opens.length,1,"لا تبقى إلا الفتحة السليمة");
 const n=shapeNotes();
 const arcMsg=n.find(x=>/قوسيّة/.test(x[1])&&/فتحة/.test(x[1]));
 ok(!!arcMsg,"وفتحاتُ الجدار القوسيّ تُقال");
 ok(arcMsg&&/حُذفت 2 فتحة/.test(arcMsg[1]),"بعددها الصحيح (٢)");
 eq(arcMsg&&arcMsg[0],"wr","تنبيهاً لا ملاحظة — بابٌ اختفى");
 const orMsg=n.find(x=>/يتيمة/.test(x[1]));
 ok(!!orMsg&&/حُذفت 1 فتحة/.test(orMsg[1]),"واليتيمةُ تُقال بعددها (١)");
 /* تُمسَح بعد القراءة: لا تتكرّر */
 eq(shapeNotes().length,0,"والقراءةُ الثانية فارغة — لا تُعاد الرسالة");
 ok(!("__opensArc" in S)&&!("__opensOrphan" in S),
  "والحقلان المؤقتان مُسحا من S (لا يدخلان pack)");
 /* ملفٌّ سليم: لا رسائل */
 S.walls=[{id:"W2",a:[0,2000],b:[3000,2000],t:150,type:"int",align:"c"}];
 S.opens=[{id:"O4",wall:"W2",kind:"door",s:1500,w:900,h:2100}];
 ensureShape();
 eq(shapeNotes().length,0,"وملفٌّ سليمٌ بلا رسالةٍ زائدة");
 /* والقوسُ المُستقام يُقال بالنصّ نفسه الذي كان في الإقلاع */
 S.walls=[{id:"W1",a:[0,0],b:[1000,0],t:1200,type:"int",align:"c",bulge:1}];
 S.opens=[];
 ensureShape();
 const a=shapeNotes();
 /* 2.4: السماكة 1200 قُسرت إلى 1000 وكانت صامتة — تُقال الآن
    ملاحظةً إعلامية («in») إلى جانب تنبيه القوس؛ فيُفحَص تنبيه القوس
    بعينه لا عدد الرسائل كلّها */
 const arcFix=a.filter(x=>/استُقيم 1 جدار قوسيّ/.test(x[1]));
 ok(arcFix.length===1&&arcFix[0][0]==="wr",
  "وشفرةُ القوس المُستقام تمرّ من الدالّة نفسها");
 ok(a.some(x=>x[0]==="in"&&/قُوِّمت 1 قيمة/.test(x[1])&&/wall\.t|جدار\.t/.test(x[1])),
  "وقسرُ السماكة الصامتُ سابقاً يُقال (normalize)");
});

/* ═══ الجدار القوسيّ وأدوات التعديل ═══
   جُرِّب قبل الحرس: القطع ينتج قوسَين نصفُ قطر كلٍّ منهما نصفُ الأصل،
   والإزاحة نسخةً بنصف القطر نفسه، والمرآة تُبقي إشارة bulge. */
const rig=()=>{
 S.walls=[]; S.opens=[];
 return addWall([1000,0],[0,1000],200,"int","c",null,QB);
};
const snap=()=>JSON.stringify(S.walls);
const centerOf=w=>{const P=arcParams(w); return [Math.round(P.cx),Math.round(P.cy)]};
group("قوس: العملياتُ غير المدعومة تُرفَض وتُسمّي السبب ولا تمسّ شيئاً",()=>{
 const w=rig();
 addWall([3000,0],[3000,2000],200,"int","c");        /* مستقيم — حدٌّ للقصّ */
 const st=S.walls[1];
 const refused=[
  ["الإزاحة",()=>MOD.offsetWall(w.id,300,1,false)],
  ["القطع",()=>MOD.breakWall(w.id,[500,500])],
  ["القصّ",()=>MOD.trimWall(w.id,[st.id],[900,100])],
  ["التمديد",()=>MOD.extendWall(w.id,[st.id],[900,100])],
  ["كسر الركن",()=>MOD.chamferPlan(w.id,st.id,200,200,[900,100],[3000,100])]];
 /* اللحمُ لم يعد يرفض: القوسُ فيه مرساةٌ لا تتحرّك — weld-arc.test.js */
 refused.forEach(([nm,fn])=>{
  const b4=snap();
  let msg=""; try{fn()}catch(e){msg=e.message}
  ok(msg.includes(nm),`${nm}: تُرفَض باسم العملية`);
  ok(msg.includes(w.id)&&/قوسيّ/.test(msg),`${nm}: وتُسمّي الجدار وأنه قوسيّ`);
  ok(msg.includes("نقل")&&msg.includes("مرآة"),`${nm}: وتقول ما هو مدعوم`);
  eq(snap(),b4,`${nm}: ولا تمسّ الجدران حرفاً`);
 });
 /* والحدُّ القوسيّ يُرفَض كذلك: التقاطعُ يُحسَب مع وترٍ لا مع قوس */
 S.walls=[]; S.opens=[];
 const A=addWall([0,0],[4000,0],200,"int","c");
 const C=addWall([2000,-1000],[2000,1000],200,"int","c",null,QB);
 let m2=""; try{MOD.trimWall(A.id,[C.id],[500,0])}catch(e){m2=e.message}
 ok(m2.includes(C.id)&&m2.includes("الحدّ"),"القصّ بحدٍّ قوسيّ يُرفَض ويُسمّي الحدّ");
 let m3=""; try{MOD.extendWall(A.id,[C.id],[3900,0])}catch(e){m3=e.message}
 ok(m3.includes(C.id)&&m3.includes("الحدّ"),"والتمديد إلى حدٍّ قوسيّ كذلك");
});
group("قوس: المستقيم لم يتأثّر بالحرس",()=>{
 ok(MOD.ARC_OK.includes("مرآة")&&MOD.ARC_OK.includes("نقل"),
  "وقائمةُ المدعوم المُعلَنة تشمل المرآة والنقل");
 S.walls=[]; S.opens=[];
 const A=addWall([0,0],[4000,0],200,"int","c");
 const r=MOD.breakWall(A.id,[2000,0]);
 ok(!!r,"القطعُ على مستقيمٍ يعمل");
 eq(S.walls.length,2,"ويُنتج جدارين");
 const o=MOD.offsetWall(S.walls[0].id,500,1,false);
 ok(!!o&&!!o.wall,"والإزاحةُ على مستقيمٍ تعمل");
});
group("قوس: الشدّ — الطرفُ الواحد يُرفَض والصلبُ يصحّ",()=>{
 const w=rig();                                   /* طرفاه (1000,0) و(0,1000) */
 const b4=snap();
 let msg=""; try{MOD.stretchGrab({x0:900,y0:-100,x1:1100,y1:100})}catch(e){msg=e.message}
 ok(msg.includes(w.id)&&msg.includes("الشدّ"),"طرفٌ واحدٌ داخل الإطار: يُرفَض");
 eq(snap(),b4,"ولا يُمَسّ شيء");
 const G=MOD.stretchGrab({x0:-100,y0:-100,x1:1100,y1:1100});
 eq(G.length,1,"والطرفان داخل الإطار: حركةٌ صلبة تُقبَل");
 MOD.stretchApply(G,500,0);
 near(arcParams(S.walls[0]).R,1000,2,"ونصفُ القطر لم يتغيّر");
 eq(MOD.stretchGrab({x0:5000,y0:5000,x1:6000,y1:6000}).length,0,
  "وخارج الإطار: لا شيء");
});
group("قوس: المرآة تقلب إشارة bulge فيبقى المركز منعكساً",()=>{
 let w=rig();
 const c0=centerOf(w);                            /* (0،0) */
 const G=MOD.grab([{k:"wall",id:w.id}]);
 /* نسخة منعكسة حول x=1500 (محورٌ رأسي) */
 const r=MOD.mirrorAll(G,[1500,-1000],[1500,1000],true);
 const mw=S.walls.find(x=>x.id===r.made[0].id);
 ok(!!mw&&isArc(mw),"النسخة المنعكسة قوسيّة");
 eq(mw.bulge,-w.bulge,"وإشارة الانحناء انقلبت");
 const cm=centerOf(mw);
 deep(cm,[3000-c0[0],c0[1]],"ومركزُها هو انعكاسُ مركز الأصل بالضبط");
 near(arcParams(mw).R,arcParams(w).R,1,"ونصفُ القطر نفسه");
 /* بلا نسخ: المعاينةُ تُعاد فلا تتراكم الإشارة */
 w=rig();
 const G2=MOD.grab([{k:"wall",id:w.id}]);
 const b0=w.bulge;
 MOD.mirrorAll(G2,[1500,-1000],[1500,1000],false);
 const once=S.walls[0].bulge;
 MOD.mirrorAll(G2,[1500,-1000],[1500,1000],false);
 eq(S.walls[0].bulge,once,"وإعادةُ المرآة من الأصل لا تقلبها ثانيةً");
 eq(once,-b0,"والنتيجة معكوسةُ الإشارة");
 deep(centerOf(S.walls[0]),[3000,0],"ومركزُها (٣٠٠٠،٠)");
 /* المستقيم بلا bulge لا يكتسب واحداً */
 S.walls=[]; S.opens=[];
 const st=addWall([0,0],[2000,0],200,"int","c");
 MOD.mirrorAll(MOD.grab([{k:"wall",id:st.id}]),[0,-1000],[0,1000],false);
 ok(S.walls[0].bulge==null,"والمستقيمُ لا يكتسب bulge من المرآة");
});
group("قوس: الحركةُ الصلبة تُبقيه قوساً صحيحاً",()=>{
 const w=rig(); const R0=arcParams(w).R, b0=w.bulge;
 MOD.moveAll(MOD.grab([{k:"wall",id:w.id}]),700,-300);
 near(arcParams(S.walls[0]).R,R0,1,"النقل: نصفُ القطر نفسه");
 eq(S.walls[0].bulge,b0,"والانحناء نفسه");
 MOD.rotateAll(MOD.grab([{k:"wall",id:S.walls[0].id}]),[0,0],37,false);
 near(arcParams(S.walls[0]).R,R0,2,"الدوران: نصفُ القطر نفسه");
 eq(S.walls[0].bulge,b0,"والانحناء نفسه");
 const before=S.walls.length;
 MOD.copyAll(MOD.grab([{k:"wall",id:S.walls[0].id}]),2000,0,1,false);
 eq(S.walls.length,before+1,"النسخ ينتج جداراً ثانياً");
 ok(isArc(S.walls[S.walls.length-1]),"وهو قوسيٌّ كأصله");
});
group("قوس: المقابضُ — المنتصفُ على القوس والسحبُ يقف عند الصالح",()=>{
 const w=rig();
 const g=ENT.wall.grips(w);
 const mp=arcMidPoint(w);
 deep(g.find(x=>x.k==="mid").p,mp,"مقبضُ المنتصف على القوس نفسه");
 ok(Math.hypot(mp[0]-500,mp[1]-500)>250,"لا على منتصف الوتر (٢٩٣ مم عنه)");
 /* سحبُ الطرف حتى يصير نصفُ القطر ≤ t/2: يقف عند آخر وضعٍ صالح */
 const o=ENT.wall.grab(w);
 ENT.wall.drag(o,{k:"b"},[300,700],0,0);
 const okB=w.b.slice();
 ok(arcParams(w).R>w.t/2+1,"وضعٌ صالح يُقبَل");
 ENT.wall.drag(o,{k:"b"},[1002,1],0,0);           /* يكاد يطابق الطرف الآخر */
 deep(w.b,okB,"والوضعُ غير الصالح يُتجاهَل فيبقى آخرُ صالح");
 ok(band(w)!==null,"والجدارُ ما زال يُبنى");
 const Rb=arcParams(w).R, ab=w.a.slice();

 const o2=ENT.wall.grab(w);            /* لقطةٌ جديدة: السحبُ يُحسَب من لقطته */
 ENT.wall.drag(o2,{k:"mid"},null,400,0);
 near(arcParams(w).R,Rb,1e-6,"والنقلُ الصلب لا يغيّر نصف القطر");
 ok(w.a[0]!==ab[0],"ويُحرّك الجدار فعلاً");
});

group("قوس: الاستبعادُ من الواجهة والمقطع يُقال في الحصيلة",()=>{
 S.walls=[]; S.opens=[];
 const st=addWall([0,-3000],[6000,-3000],250,"ext","c");
 const ar=addWall([1000,0],[0,1000],200,"ext","c",null,QB);
 const e=elevation("S");
 const w=e.warn.find(x=>x.code==="arc");
 ok(!!w&&w.id===ar.id,"الواجهةُ تقول إنّ الجدار القوسيّ الخارجيّ مستبعَد");
 ok(/قوسيّ/.test(w.msg)&&/ناقصة/.test(w.msg),"وأنّها تظهر ناقصة");
 ok(!e.warn.some(x=>x.code==="arc"&&x.id===st.id),"والمستقيمُ لا يُوسَم");
 /* الداخليّ لا يدخل الواجهات أصلاً فلا ملاحظةَ عنه */
 S.walls=[]; addWall([1000,0],[0,1000],200,"int","c",null,QB);
 ok(!elevation("S").warn.some(x=>x.code==="arc"),
  "والقوسيّ الداخليّ خارج الواجهة أصلاً فلا ملاحظة");
 /* المقطع: خطٌّ يعبر القوس عند y=707 */
 S.walls=[]; S.opens=[];
 const a2=addWall([1000,0],[0,1000],200,"int","c",null,QB);
 const r=sectWalls([-500,707],[1500,707]);
 eq(r.list.length,0,"المقطعُ لا يقطع القوس (لا إسقاطَ له)");
 const m=r.miss.find(x=>x.code==="arc");
 ok(!!m&&m.id===a2.id,"لكنه يقول إنّه قارب قوساً ولم يقطعه");
 eq(m&&m.d,0,"وبمسافةٍ صفرٍ من جسمه (الخطُّ يعبره)");
 /* خطٌّ بعيدٌ عنه: لا ملاحظة */
 const far=sectWalls([-500,5000],[1500,5000]);
 ok(!far.miss.some(x=>x.code==="arc"),"وخطٌّ بعيدٌ عنه لا يُبلَّغ");
});

group("قوس: centerLine/faces لا تُسرِّب الوتر — المستهلكون فُحصوا",()=>{
 /* المستهلكون: osnap (فرعُ القوس يعود قبل faces) · render.centers (يُنادى
    بالمستقيم وحده) · section.cutFoot/sOfCut (projectWall يستبعد القوس) ·
    opens (الفتحات على القوس ممنوعة). والدفاعُ هنا يمنع تسريباً مستقبلياً. */
 S.walls=[]; S.opens=[];
 const arc=addWall([1000,0],[0,1000],200,"ext","c",null,QB);
 const st=addWall([0,0],[3000,0],200,"ext","c");
 eq(centers([arc],false).length,0,"centers ترفض القوسيّ بدل رسمه وتراً");
 eq(centers([arc,st],false).length,1,"وتُبقي المستقيم");
 const F={A:[500,-1000],B:[500,1000],rt:{x:1,y:0},L:2000};
 eq(cutFoot(arc,F),null,"cutFoot(قوس) = null لا وجهان محسوبان على الوتر");
 eq(sOfCut(arc,F),null,"sOfCut(قوس) = null");
 ok(cutFoot(st,{A:[500,-1000],B:[500,1000],rt:{x:1,y:0},L:2000})!==null,
  "والمستقيم يعمل كما كان");
});

process.exit(summary());
