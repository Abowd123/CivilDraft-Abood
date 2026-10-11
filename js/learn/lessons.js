/* ═══ الواجهة التعليمية: الدروس ═══ المرحلة ١
   بياناتٌ صِرفة بلا DOM ولا حالة: كلُّ خطوةٍ تقول ما يُفعل (≤ ست كلمات)،
   وتُشير إلى زرٍّ أو موضعٍ على اللوحة، وتعرف متى تمّت (expect) بقراءة
   الحالة نفسِها لا بعدّ النقرات، فطريقُ المتعلّم إلى النتيجة حرّ: زرٌّ أو
   مفتاحٌ أو سطرُ أوامر.

   الخطوة:
     say     ما يُقال للمتعلّم
     target  "cmd:wall" زرُّ الشريط · "opt:kind" حقلُ شريط الخيارات · null = اللوحة
             "act:view3dDlg" فعلٌ من الشريط · "sel:<css>" عنصرٌ في نافذة (المرحلة ٦)
             والحالةُ st.ui {lvlMgr,v3d} وst.log (رسائلُ الأدوات) تُقرأ في expect
     grow    خطوةٌ تُبنى بعدّة عناصر: الزيادةُ قبل الإتمام ليست خطأ (المرحلة ٣)
     ghost   {pts:[[x,y]…], seg:[[a],[b]], box:[x0,y0,x1,y1]} بالمليمتر
     keys    مفاتيحُ تُعرض أزراراً [["C","إغلاق"],["Enter"]]
     expect  (st)=>bool   st = {S, tool, pts, active}
     hint    جملةٌ أطول تظهر في السلّم الأوّل
     auto    أفعالٌ تُنفَّذ عند «شاهدني» (صيغة learn/acts.js)
   والدرس: setup أفعالٌ تُبني بها اللوحةُ قبل أوّل خطوة (المرحلة ٢)،
   فدرسُ التعديل يبدأ من رسمٍ جاهز لا من الصفر. */

import {SHOWCASE} from "../tools/showcase.js";
export const TOL=250;          /* مم: سماحُ النقرة حول الهدف */
const near=(p,q,t=TOL)=>!!p&&!!q&&Math.hypot(p[0]-q[0],p[1]-q[1])<=t;
/* جدارٌ بين نقطتين في أيّ اتّجاه */
export const hasWall=(S,a,b,t=TOL)=>(S.walls||[]).some(w=>
 (near(w.a,a,t)&&near(w.b,b,t))||(near(w.a,b,t)&&near(w.b,a,t)));
export const hasOpen=(S,kind)=>(S.opens||[]).some(o=>o.kind===kind);
export function inRing(ring,p){
 let c=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i], b=ring[j];
  if(((a[1]>p[1])!==(b[1]>p[1]))&&(p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]))c=!c;
 }
 return c;
}
/* هل التحديدُ جدارٌ بين نقطتين */
export const selWall=(st,a,b)=>(st.sel||[]).some(x=>x&&x.k==="wall"&&
 (st.S.walls||[]).some(w=>w.id===x.id&&((near(w.a,a)&&near(w.b,b))||(near(w.a,b)&&near(w.b,a)))));
/* فتحةٌ من نوعٍ على جدارٍ بين نقطتين */
export const openOn=(S,kind,a,b)=>(S.opens||[]).some(o=>o.kind===kind&&(S.walls||[]).some(w=>
 w.id===o.wall&&((near(w.a,a)&&near(w.b,b))||(near(w.a,b)&&near(w.b,a)))));
export const countOpen=(S,kind)=>(S.opens||[]).filter(o=>o.kind===kind).length;
export const optIs=(st,tool,k,v)=>!!st.opt&&!!st.opt[tool]&&String(st.opt[tool][k])===String(v);
const areaAt=(S,p)=>(S.areas||[]).find(a=>Array.isArray(a.ring)&&a.ring.length>2&&inRing(a.ring,p))||null;
/* الأداةُ تُرقّم الاسم افتراضاً («صالة 1»)، فالاسمُ أو الاسمُ برقمه */
export const areaNamed=(S,p,name)=>{const a=areaAt(S,p); return !!a&&typeof a.name==="string"&&(a.name===name||new RegExp("^"+name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+" \\d+$").test(a.name))};
export const areaFilled=(S,p,fill)=>{const a=areaAt(S,p); return !!a&&a.fill===fill};
/* المحطّة ٤: بُعدٌ بين نقطتين (بأيّ ترتيب) ومن نوعٍ إن طُلب */
export const hasDim=(S,kind,a,b)=>(S.dims||[]).some(d=>(!kind||d.kind===kind)&&
 ((near(d.a,a)&&near(d.b,b))||(near(d.a,b)&&near(d.b,a))));
export const annoOf=(S,kind,s)=>(S.anno||[]).filter(t=>t.kind===kind&&(s==null||t.s===s));
/* المحطّة ٥: المحاورُ والأعمدةُ والكمراتُ والقواعدُ والدرج */
const hasNear=(L,v)=>(L||[]).some(x=>Math.abs(x-v)<=TOL);
export const hasAxes=(S,xs,ys)=>!!S.grid&&(xs||[]).every(v=>hasNear(S.grid.xs,v))&&(ys||[]).every(v=>hasNear(S.grid.ys,v));
export const colAt=(S,p)=>(S.cols||[]).find(c=>near([c.x,c.y],p))||null;
export const structOf=(S,kind)=>(S.struct||[]).filter(g=>g.kind===kind);
export const hasBeam=(S,a,b)=>structOf(S,"beam").some(g=>(near(g.a,a)&&near(g.b,b))||(near(g.a,b)&&near(g.b,a)));
export const footAt=(S,p)=>structOf(S,"footing").some(g=>near([g.x,g.y],p));
/* المحطّة ٦: الطوابقُ والأسقف */
export const hasWallOn=(S,a,b,lv)=>(S.walls||[]).some(w=>(w.level|0)===lv&&
 ((near(w.a,a)&&near(w.b,b))||(near(w.a,b)&&near(w.b,a))));
export const roofOn=(S,lv,type)=>(S.roofs||[]).some(r=>(r.level|0)===lv&&(!type||r.type===type));
export const logHas=(st,re)=>(st.log||[]).some(m=>re.test(m));
export const hasAreaAt=(S,p)=>(S.areas||[]).some(a=>Array.isArray(a.ring)&&a.ring.length>2&&inRing(a.ring,p));

/* ═══ الغرفة الأولى ═══ 4 × 3 م، باب، شباك، منطقة */
const P0=[0,0], P1=[4000,0], P2=[4000,3000], P3=[0,3000];
const UNDO=["U","تراجع"];
const first_room={
 id:"first_room", level:1, title:"أوّل غرفة", min:3,
 goal:"غرفة ٤×٣ م بباب وشباك ومساحة",
 frame:{x0:-800,y0:-800,x1:4800,y1:3800},
 steps:[
  {say:"اضغط زرّ الجدار", target:"cmd:wall", keys:[["W","جدار"]],
   hint:"من تبويب «رسم»، أو اكتب W ثم Enter",
   expect:st=>st.tool==="wall", auto:[{tool:"wall"}]},
  {say:"انقر نقطة البداية", ghost:{pts:[P0]}, keys:[["Esc","إلغاء"]],
   hint:"انقر الدائرة المضيئة، الالتقاط يساعدك",
   expect:st=>st.tool==="wall"&&st.pts.length>0&&near(st.pts[0],P0),
   auto:[{at:P0}]},
  {say:"امدد الجدار يميناً ٤ م", ghost:{pts:[P1],seg:[P0,P1]}, keys:[UNDO],
   hint:"انقر النقطة، أو وجّه المؤشّر يميناً واكتب 4 ثم Enter",
   expect:st=>hasWall(st.S,P0,P1), auto:[{at:P1}]},
  {say:"ثم ٣ م للأعلى", ghost:{pts:[P2],seg:[P1,P2]}, keys:[UNDO],
   hint:"الطول يظهر بجوار المؤشّر وأنت تتحرّك",
   expect:st=>hasWall(st.S,P1,P2), auto:[{at:P2}]},
  {say:"ثم ٤ م لليسار", ghost:{pts:[P3],seg:[P2,P3]}, keys:[UNDO],
   hint:"F8 يُثبّت الاتّجاه أفقياً أو رأسياً",
   expect:st=>hasWall(st.S,P2,P3), auto:[{at:P3}]},
  {say:"أغلق الغرفة بحرف C", ghost:{seg:[P3,P0]}, keys:[["C","إغلاق"],["Enter"]],
   hint:"اكتب C ثم Enter، أو انقر نقطة البداية",
   expect:st=>hasWall(st.S,P3,P0), auto:[{type:"c"}]},
  {say:"اخرج من الأداة بـ Esc", keys:[["Esc","خروج"]],
   hint:"Esc ينهي أيّ أداة",
   expect:st=>!st.active, auto:[{esc:1}]},
  {say:"اضغط زرّ الباب", target:"cmd:door", keys:[["D","باب"]],
   hint:"في لوحة «فتحات» من تبويب «رسم»",
   expect:st=>st.tool==="door", auto:[{tool:"door"}]},
  {say:"انقر الجدار السفلي", ghost:{pts:[[2000,0]]}, keys:[["Esc","خروج"]],
   hint:"الباب يُوضع حيث تنقر على الجدار",
   expect:st=>hasOpen(st.S,"door"), auto:[{at:[2000,0]}]},
  {say:"والآن زرّ الشباك", target:"cmd:win", keys:[["N","شباك"]],
   hint:"بجوار زرّ الباب",
   expect:st=>st.tool==="win", auto:[{tool:"win"}]},
  {say:"انقر الجدار العلوي", ghost:{pts:[[2000,3000]]}, keys:[["Esc","خروج"]],
   hint:"أيُّ موضعٍ على الجدار يصلح",
   expect:st=>hasOpen(st.S,"window"), auto:[{at:[2000,3000]}]},
  {say:"اضغط زرّ المنطقة", target:"cmd:area", keys:[["A","منطقة"]],
   hint:"في لوحة «مناطق وتهشير»",
   expect:st=>st.tool==="area", auto:[{tool:"area"}]},
  {say:"انقر داخل الغرفة", ghost:{box:[75,75,3925,2925],pts:[[2000,1500]]}, keys:[["Esc","خروج"]],
   hint:"المنطقة تتبع الجدران وتحسب المساحة وحدها",
   expect:st=>hasAreaAt(st.S,[2000,1500]), auto:[{at:[2000,1500]}]},
  {say:"Esc وانتهيت!", keys:[["Esc","خروج"]],
   hint:"اضغط Esc لتحفظ نجومك",
   expect:st=>!st.active, auto:[{esc:1}]}
 ]
};

/* ═══ غرفتان ═══ قاطعٌ يقسم غرفةً جاهزة، وبابٌ فيه، ومساحتان */
export const ROOM=(w,h)=>[{tool:"wall"},{at:[0,0]},{at:[w,0]},{at:[w,h]},{at:[0,h]},{type:"c"},{esc:1}];
const two_rooms={
 id:"two_rooms", level:1, title:"غرفتان بقاطع", min:3,
 goal:"قاطعاً يقسم الغرفة، وباباً بينهما، ومساحتين",
 frame:{x0:-800,y0:-800,x1:6800,y1:4800},
 setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط زرّ الجدار", target:"cmd:wall", keys:[["W","جدار"]],
   hint:"القاطع جدارٌ عاديّ بين جدارين",
   expect:st=>st.tool==="wall", auto:[{tool:"wall"}]},
  {say:"انقر منتصف الجدار السفلي", ghost:{pts:[[3000,0]]}, keys:[["F3","الالتقاط"]],
   hint:"الالتقاطُ يقفز إلى المنتصف وحده",
   expect:st=>st.tool==="wall"&&st.pts.length>0&&near(st.pts[0],[3000,0]),
   auto:[{at:[3000,0]}]},
  {say:"ثم منتصف الجدار العلوي", ghost:{pts:[[3000,4000]],seg:[[3000,0],[3000,4000]]}, keys:[UNDO],
   hint:"التعامدُ يُبقيه رأسياً",
   expect:st=>hasWall(st.S,[3000,0],[3000,4000]), auto:[{at:[3000,4000]}]},
  {say:"Esc لإنهاء القاطع", keys:[["Esc","خروج"]],
   hint:"وإلّا استمرّت السلسلة من آخر نقطة",
   expect:st=>!st.active, auto:[{esc:1}]},
  {say:"باباً في القاطع", target:"cmd:door", keys:[["D","باب"]],
   hint:"الأداةُ نفسُها، والجدارُ هو القاطع",
   expect:st=>st.tool==="door", auto:[{tool:"door"}]},
  {say:"انقر وسط القاطع", ghost:{pts:[[3000,2000]]}, keys:[["Esc","خروج"]],
   hint:"الباب يُوضع حيث تنقر",
   expect:st=>(st.S.opens||[]).some(o=>o.kind==="door"&&(st.S.walls||[]).some(w=>w.id===o.wall&&near(w.a,[3000,0])&&near(w.b,[3000,4000]))),
   auto:[{at:[3000,2000]}]},
  {say:"والآن زرّ المنطقة", target:"cmd:area", keys:[["A","منطقة"]],
   hint:"منطقةٌ لكلّ غرفة",
   expect:st=>st.tool==="area", auto:[{tool:"area"}]},
  {say:"انقر الغرفة اليسرى", ghost:{box:[75,75,2925,3925],pts:[[1500,2000]]},
   hint:"القاطعُ حدُّها الآن",
   expect:st=>hasAreaAt(st.S,[1500,2000]), auto:[{at:[1500,2000]}]},
  {say:"ثم الغرفة اليمنى", ghost:{box:[3075,75,5925,3925],pts:[[4500,2000]]},
   hint:"الأداةُ ما زالت تعمل",
   expect:st=>hasAreaAt(st.S,[4500,2000]), auto:[{at:[4500,2000]}]},
  {say:"Esc وانتهيت!", keys:[["Esc","خروج"]],
   expect:st=>!st.active, auto:[{esc:1}]}
 ]
};

/* ═══ ممرٌّ بالإزاحة ═══ جدارٌ موازٍ على بعد ١ م */
const offset_corridor={
 id:"offset_corridor", level:2, title:"ممرٌّ بالإزاحة", min:2,
 goal:"جداراً موازياً يصنع ممرّاً بعرض ١ م",
 frame:{x0:-800,y0:-1600,x1:8800,y1:2600},
 setup:[{tool:"wall"},{at:[0,0]},{at:[8000,0]},{esc:1}],
 steps:[
  {say:"اضغط زرّ الإزاحة", target:"cmd:offset", keys:[["OF","إزاحة"],["Enter"]],
   hint:"في تبويب «تعديل»، والمسافةُ ١ م افتراضاً",
   expect:st=>st.tool==="offset", auto:[{tool:"offset"}]},
  {say:"انقر الجدار", ghost:{pts:[[4000,0]]}, keys:[["Esc","إلغاء"]],
   hint:"الإزاحةُ تبدأ باختيار جدارها",
   expect:st=>st.tool==="offset"&&st.stepIdx>=1, auto:[{at:[4000,0]}]},
  {say:"ثم انقر فوقه", ghost:{pts:[[4000,1000]],seg:[[0,1000],[8000,1000]]}, keys:[["Enter","إنهاء"]],
   hint:"الجهةُ التي تنقرها هي جهةُ الجدار الجديد",
   expect:st=>hasWall(st.S,[0,1000],[8000,1000]), auto:[{at:[4000,1000]}]},
  {say:"Esc وانتهيت!", keys:[["Esc","خروج"]],
   expect:st=>!st.active, auto:[{esc:1}]}
 ]
};

/* ═══ انسخ القاطع ═══ تحديدٌ ثم نسخٌ بنقطتين */
const copy_partition={
 id:"copy_partition", level:2, title:"انسخ القاطع", min:3,
 goal:"ثلاثَ غرفٍ بنسخ قاطعٍ واحد",
 frame:{x0:-800,y0:-800,x1:9800,y1:4800},
 setup:ROOM(9000,4000).concat([{tool:"wall"},{at:[3000,0]},{at:[3000,4000]},{esc:1}]),
 steps:[
  {say:"انقر القاطع لتحديده", ghost:{seg:[[3000,0],[3000,4000]],pts:[[3000,2000]]}, keys:[["Esc","إلغاء التحديد"]],
   hint:"بلا أداة: النقرةُ تحدّد، ويظهر بلونٍ مختلف",
   expect:st=>!st.active&&selWall(st,[3000,0],[3000,4000]),
   auto:[{pick:{k:"wall",at:[3000,2000]}}]},
  {say:"اضغط زرّ النسخ", target:"cmd:copy", keys:[["CP","نسخ"],["Enter"]],
   hint:"في تبويب «تعديل»",
   expect:st=>st.tool==="copy", auto:[{tool:"copy"}]},
  {say:"انقر أسفل القاطع", ghost:{pts:[[3000,0]]}, keys:[["Esc","إلغاء"]],
   hint:"نقطةُ الأساس: من أين تمسك النسخة",
   expect:st=>st.tool==="copy"&&st.pts.length>0&&near(st.pts[0],[3000,0]),
   auto:[{at:[3000,0]}]},
  {say:"ثم ٣ م يميناً", ghost:{pts:[[6000,0]],seg:[[6000,0],[6000,4000]]}, keys:[["Enter","إنهاء"]],
   hint:"أو وجّه المؤشّر يميناً واكتب 3 ثم Enter",
   expect:st=>hasWall(st.S,[6000,0],[6000,4000]), auto:[{at:[6000,0]}]},
  {say:"Esc وانتهيت!", keys:[["Esc","خروج"]],
   expect:st=>!st.active, auto:[{esc:1}]}
 ]
};

/* ═══ المحطّة ٣: فتحات ومناطق ═══ كلُّها تبدأ من غرفةٍ ٦×٤ جاهزة.
   الجدران: W1 سفليّ · W2 أيمن · W3 علويّ · W4 أيسر (ترتيبُ الرسم) */
const Q0=[0,0], Q1=[6000,0], Q2=[6000,4000], Q3=[0,4000];
const FRAME6={x0:-800,y0:-800,x1:6800,y1:4800};
const ESC_END={say:"Esc وانتهيت!", keys:[["Esc","خروج"]], expect:st=>!st.active, auto:[{esc:1}]};
const door_double={
 id:"door_double", level:3, title:"باب مزدوج", min:2,
 goal:"باباً مزدوجاً في واجهة الغرفة",
 frame:FRAME6, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط زرّ الباب", target:"cmd:door", keys:[["D","باب"]],
   expect:st=>st.tool==="door", auto:[{tool:"door"}]},
  {say:"اختر «مزدوج» من الشريط", target:"opt:kind", keys:[["kind=double","بالكتابة"],["Enter"]],
   hint:"شريطُ الخيارات فوق اللوحة يتغيّر مع كلّ أداة",
   expect:st=>optIs(st,"door","kind","double"), auto:[{opt:["door","kind","double"]}]},
  {say:"انقر منتصف الجدار السفلي", ghost:{pts:[[3000,0]]},
   hint:"الخيارُ يسري على كلّ بابٍ تضعه بعده",
   expect:st=>openOn(st.S,"double",Q0,Q1), auto:[{at:[3000,0]}]},
  ESC_END]
};
const window_wide={
 id:"window_wide", level:3, title:"شباك بعرض ٢ م", min:2,
 goal:"شباكاً عرضه ٢ م في الجدار العلوي",
 frame:FRAME6, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط زرّ الشباك", target:"cmd:win", keys:[["N","شباك"]],
   expect:st=>st.tool==="win", auto:[{tool:"win"}]},
  {say:"اكتب العرض w=2", target:"opt:w", keys:[["w=2","العرض"],["Enter"]],
   hint:"اسمُ الخيار ثم = ثم القيمة بالمتر، في سطر الأوامر",
   expect:st=>optIs(st,"win","w","2")||optIs(st,"win","w","2.0")||optIs(st,"win","w","2.00"),
   auto:[{type:"w=2"}]},
  {say:"انقر الجدار العلوي", ghost:{pts:[[3000,4000]],seg:[[2000,4000],[4000,4000]]},
   hint:"الخطُّ الأصفر يريك عرض الشباك قبل النقر",
   expect:st=>(st.S.opens||[]).some(o=>o.kind==="window"&&Math.abs(o.w-2000)<1), auto:[{at:[3000,4000]}]},
  ESC_END]
};
const typed_opening={
 id:"typed_opening", level:3, title:"فتحة بالكتابة", min:2,
 goal:"فتحةً صافية على بعد ١٫٥ م من بداية الجدار الأيمن",
 frame:FRAME6, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط زرّ الفتحة", target:"cmd:opening", keys:[["OP","فتحة"],["Enter"]],
   hint:"فتحةٌ صافية بلا باب",
   expect:st=>st.tool==="opening", auto:[{tool:"opening"}]},
  {say:"اكتب W2@1.5 ثم Enter", ghost:{pts:[[6000,1500]]}, keys:[["W2@1.5","الجدار@المسافة"],["Enter"]],
   hint:"W2 معرّفُ الجدار الأيمن، و1.5 بعدُها من بدايته",
   expect:st=>(st.S.opens||[]).some(o=>o.kind==="opening"&&Math.abs(o.s-1500)<=TOL&&(st.S.walls||[]).some(w=>w.id===o.wall&&near(w.a,Q1)&&near(w.b,Q2))),
   auto:[{type:"W2@1.5"}]},
  ESC_END]
};
const arch_niche={
 id:"arch_niche", level:3, title:"مقنطرة وكوّة", min:3,
 goal:"فتحةً مقنطرة في الجدار الأيسر وكوّةً في السفلي",
 frame:FRAME6, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط زرّ المقنطرة", target:"cmd:arch", keys:[["Esc","إلغاء"]],
   hint:"في لوحة «فتحات» بجوار الفتحة",
   expect:st=>st.tool==="arch", auto:[{tool:"arch"}]},
  {say:"انقر الجدار الأيسر", ghost:{pts:[[0,2000]]},
   expect:st=>openOn(st.S,"arch",Q3,Q0), auto:[{at:[0,2000]}]},
  {say:"والآن زرّ الكوّة", target:"cmd:niche",
   hint:"الكوّة تجويفٌ لا يخترق الجدار",
   expect:st=>st.tool==="niche", auto:[{tool:"niche"}]},
  {say:"انقر الجدار السفلي", ghost:{pts:[[4500,0]]},
   hint:"عمقُها من الشريط، وأقصاه سماكةُ الجدار ناقص ٤ سم",
   expect:st=>openOn(st.S,"niche",Q0,Q1), auto:[{at:[4500,0]}]},
  ESC_END]
};
const named_areas={
 id:"named_areas", level:3, title:"سمِّ الغرف", min:3,
 goal:"منطقتين باسمَي «صالة» و«نوم»",
 frame:FRAME6, setup:ROOM(6000,4000).concat([{tool:"wall"},{at:[3000,0]},{at:[3000,4000]},{esc:1}]),
 steps:[
  {say:"اضغط زرّ المنطقة", target:"cmd:area", keys:[["A","منطقة"]],
   expect:st=>st.tool==="area", auto:[{tool:"area"}]},
  {say:"اكتب name=صالة", target:"opt:name", keys:[["name=صالة","الاسم"],["Enter"]],
   hint:"أو اكتبه في حقل «الاسم» بالشريط",
   expect:st=>optIs(st,"area","name","صالة"), auto:[{type:"name=صالة"}]},
  {say:"انقر الغرفة اليسرى", ghost:{box:[75,75,2925,3925],pts:[[1500,2000]]},
   expect:st=>areaNamed(st.S,[1500,2000],"صالة"), auto:[{at:[1500,2000]}]},
  {say:"ثم اكتب name=نوم", target:"opt:name", keys:[["name=نوم","الاسم"],["Enter"]],
   expect:st=>optIs(st,"area","name","نوم"), auto:[{type:"name=نوم"}]},
  {say:"وانقر الغرفة اليمنى", ghost:{box:[3075,75,5925,3925],pts:[[4500,2000]]},
   expect:st=>areaNamed(st.S,[4500,2000],"نوم"), auto:[{at:[4500,2000]}]},
  ESC_END]
};
const hatch_room={
 id:"hatch_room", level:3, title:"هشّر المنطقة", min:2,
 goal:"تهشيراً على أرضية الغرفة",
 frame:FRAME6, setup:ROOM(6000,4000).concat([{tool:"area"},{at:[3000,2000]},{esc:1}]),
 steps:[
  {say:"اضغط زرّ التهشير", target:"cmd:hatch", keys:[["H","تهشير"]],
   hint:"في لوحة «مناطق وتهشير»",
   expect:st=>st.tool==="hatch", auto:[{tool:"hatch"}]},
  {say:"انقر داخل المنطقة", ghost:{box:[75,75,5925,3925],pts:[[3000,2000]]},
   hint:"النمطُ من الشريط، ويسري على الشاشة والتصدير",
   expect:st=>areaFilled(st.S,[3000,2000],"hatch"), auto:[{at:[3000,2000]}]},
  ESC_END]
};
/* التحدّي: هدفٌ بلا شبحٍ ولا إضاءة — يظهران فقط إن طلب المتعلّمُ المساعدة */
const open_challenge={
 id:"open_challenge", level:3, title:"تحدّي الفتحات", min:4, challenge:1,
 goal:"بابين وشباكين ومنطقةً للغرفة — بلا دليل",
 frame:FRAME6, setup:ROOM(6000,4000),
 steps:[
  {say:"ضع بابين", grow:1, target:"cmd:door", ghost:{pts:[[1500,0],[4500,0]]}, keys:[["D","باب"]],
   hint:"أداةُ الباب تبقى تعمل: نقرتان على جدارين أو جدار",
   expect:st=>countOpen(st.S,"door")>=2,
   auto:[{tool:"door"},{at:[1500,0]},{at:[4500,0]}]},
  {say:"ثم شباكين", grow:1, target:"cmd:win", ghost:{pts:[[1500,4000],[4500,4000]]}, keys:[["N","شباك"]],
   hint:"الشبابيكُ في الجدار العلوي مثلاً",
   expect:st=>countOpen(st.S,"window")>=2,
   auto:[{tool:"win"},{at:[1500,4000]},{at:[4500,4000]}]},
  {say:"ومنطقةً للغرفة", target:"cmd:area", ghost:{box:[75,75,5925,3925],pts:[[3000,2000]]}, keys:[["A","منطقة"]],
   hint:"نقرةٌ داخل الغرفة بأداة المنطقة",
   expect:st=>hasAreaAt(st.S,[3000,2000]),
   auto:[{tool:"area"},{at:[3000,2000]}]},
  ESC_END]
};

/* ═══ المحطّة ٤: أبعاد وتأشير ═══ الغرفةُ ٦×٤ نفسُها، والتأشيرُ حولها */
const FRAME_A={x0:-2200,y0:-2400,x1:8000,y1:5000};
const dim_h={
 id:"dim_h", level:4, title:"أوّل بُعد", min:2,
 goal:"بُعداً أفقياً لطول الغرفة ٦ م",
 frame:FRAME_A, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط زرّ البُعد", target:"cmd:dim", keys:[["D1","بُعد"],["Enter"]],
   hint:"في تبويب «تأشير»",
   expect:st=>st.tool==="dim", auto:[{tool:"dim"}]},
  {say:"انقر الركن الأيسر السفلي", ghost:{pts:[Q0]}, keys:[["F3","الالتقاط"]],
   hint:"الالتقاطُ يقفز إلى طرف الجدار",
   expect:st=>st.tool==="dim"&&st.pts.length>0&&near(st.pts[0],Q0), auto:[{at:Q0}]},
  {say:"ثم الركن الأيمن", ghost:{pts:[Q1],seg:[Q0,Q1]},
   expect:st=>st.tool==="dim"&&st.pts.length>1&&near(st.pts[1],Q1), auto:[{at:Q1}]},
  {say:"انقر أسفل الغرفة للخطّ", ghost:{pts:[[3000,-1000]],seg:[[0,-1000],[6000,-1000]]},
   hint:"هنا يقع خطُّ البُعد، والرقمُ يُكتب وحده",
   expect:st=>hasDim(st.S,"h",Q0,Q1), auto:[{at:[3000,-1000]}]},
  ESC_END]
};
const dim_v={
 id:"dim_v", level:4, title:"بُعد رأسي", min:2,
 goal:"بُعداً رأسياً لعرض الغرفة ٤ م",
 frame:FRAME_A, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط زرّ البُعد", target:"cmd:dim", keys:[["D1","بُعد"],["Enter"]],
   expect:st=>st.tool==="dim", auto:[{tool:"dim"}]},
  {say:"اختر «رأسي» من الشريط", target:"opt:kind", keys:[["kind=v","بالكتابة"],["Enter"]],
   hint:"أفقيٌّ ورأسيٌّ ومحاذٍ للمائل",
   expect:st=>optIs(st,"dim","kind","v"), auto:[{opt:["dim","kind","v"]}]},
  {say:"انقر الركنين الأيمنين", ghost:{pts:[Q1,Q2],seg:[Q1,Q2]},
   hint:"السفليّ ثم العلويّ",
   expect:st=>st.tool==="dim"&&st.pts.length>1, auto:[{at:Q1},{at:Q2}]},
  {say:"ثم يمين الغرفة للخطّ", ghost:{pts:[[7000,2000]],seg:[[7000,0],[7000,4000]]},
   expect:st=>hasDim(st.S,"v",Q1,Q2), auto:[{at:[7000,2000]}]},
  ESC_END]
};
const room_dims={
 id:"room_dims", level:4, title:"أبعاد الغرفة بنقرة", min:1,
 goal:"أبعادَ الغرفة ومساحتَها بنقرةٍ واحدة",
 frame:FRAME_A, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط «أبعاد الغرفة»", target:"cmd:roomdim", keys:[["RD","أبعاد الغرفة"],["Enter"]],
   hint:"بجوار زرّ البُعد",
   expect:st=>st.tool==="roomdim", auto:[{tool:"roomdim"}]},
  {say:"انقر داخل الغرفة", ghost:{box:[75,75,5925,3925],pts:[[3000,2000]]},
   hint:"بُعدان وملصقُ المساحة في نقرة",
   expect:st=>(st.S.dims||[]).length>=2&&annoOf(st.S,"text").length>=1, auto:[{at:[3000,2000]}]},
  ESC_END]
};
const TITLE="مخطط الدور الأرضي";
const text_title={
 id:"text_title", level:4, title:"عنوان المخطط", min:2,
 goal:"عنواناً تحت المخطط",
 frame:FRAME_A, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط زرّ النصّ", target:"cmd:text", keys:[["T","نصّ"]],
   expect:st=>st.tool==="text", auto:[{tool:"text"}]},
  {say:"اكتب النصّ في الشريط", target:"opt:s", keys:[["s="+TITLE,"النصّ"],["Enter"]],
   hint:"أو اكتب s= ثم العنوان في سطر الأوامر",
   expect:st=>optIs(st,"text","s",TITLE), auto:[{type:"s="+TITLE}]},
  {say:"انقر تحت الغرفة", ghost:{pts:[[3000,-1300]]},
   hint:"النصُّ يُوضع في منتصف النقرة",
   expect:st=>annoOf(st.S,"text",TITLE).length>0, auto:[{at:[3000,-1300]}]},
  ESC_END]
};
const NOTE="جدار خارجي";
const leader_note={
 id:"leader_note", level:4, title:"قائد بملاحظة", min:2,
 goal:"سهماً يشير إلى الجدار الأيسر بملاحظة",
 frame:FRAME_A, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط زرّ القائد", target:"cmd:lead", keys:[["LE","قائد"],["Enter"]],
   expect:st=>st.tool==="lead", auto:[{tool:"lead"}]},
  {say:"اكتب "+NOTE, target:"opt:s", keys:[["s="+NOTE,"النصّ"],["Enter"]],
   expect:st=>optIs(st,"lead","s",NOTE), auto:[{type:"s="+NOTE}]},
  {say:"انقر الجدار لرأس السهم", ghost:{pts:[[0,2000]]},
   expect:st=>st.tool==="lead"&&st.pts.length>0&&near(st.pts[0],[0,2000]), auto:[{at:[0,2000]}]},
  {say:"ثم انقر يسار الغرفة", ghost:{pts:[[-1500,3000]],seg:[[0,2000],[-1500,3000]]}, keys:[["Enter","إنهاء"]],
   hint:"نقطةُ الكسر، ثم Enter ينهي القائد",
   expect:st=>st.tool==="lead"&&st.pts.length>1, auto:[{at:[-1500,3000]}]},
  {say:"Enter لإنهاء القائد", keys:[["Enter","إنهاء"]],
   expect:st=>annoOf(st.S,"lead",NOTE).length>0, auto:[{enter:1}]},
  ESC_END]
};
const level_mark={
 id:"level_mark", level:4, title:"منسوب الأرضية", min:2,
 goal:"منسوبَ +0.15 داخل الغرفة",
 frame:FRAME_A, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط زرّ المنسوب", target:"cmd:level", keys:[["LV","منسوب"],["Enter"]],
   hint:"في لوحة «مناسيب وميل وجداول»",
   expect:st=>st.tool==="level", auto:[{tool:"level"}]},
  {say:"اكتب z=0.15", target:"opt:z", keys:[["z=0.15","المنسوب"],["Enter"]],
   hint:"بالمتر، والسالبُ تحت الصفر",
   expect:st=>optIs(st,"level","z","0.15"), auto:[{type:"z=0.15"}]},
  {say:"انقر داخل الغرفة", ghost:{pts:[[1500,1000]]},
   expect:st=>(st.S.anno||[]).some(t=>t.kind==="level"&&t.z===150), auto:[{at:[1500,1000]}]},
  ESC_END]
};
const annot_challenge={
 id:"annot_challenge", level:4, title:"تحدّي التأشير", min:4, challenge:1,
 goal:"بُعدَي الطول والعرض وعنواناً — بلا دليل",
 frame:FRAME_A, setup:ROOM(6000,4000),
 steps:[
  {say:"بُعدُ الطول ٦ م", target:"cmd:dim", ghost:{seg:[[0,-1000],[6000,-1000]]}, keys:[["D1","بُعد"]],
   hint:"البُعد: ركنان ثم موضعُ الخطّ",
   expect:st=>hasDim(st.S,null,Q0,Q1)||hasDim(st.S,null,Q3,Q2),
   auto:[{tool:"dim"},{opt:["dim","kind","h"]},{at:Q0},{at:Q1},{at:[3000,-1000]}]},
  {say:"وبُعدُ العرض ٤ م", target:"opt:kind", ghost:{seg:[[7000,0],[7000,4000]]},
   hint:"غيّر النوع إلى «رأسي» أوّلاً",
   expect:st=>hasDim(st.S,"v",Q1,Q2)||hasDim(st.S,"v",Q0,Q3),
   auto:[{tool:"dim"},{opt:["dim","kind","v"]},{at:Q1},{at:Q2},{at:[7000,2000]}]},
  {say:"وعنوانٌ تحت المخطط", target:"cmd:text", ghost:{pts:[[3000,-1800]]}, keys:[["T","نصّ"]],
   hint:"أيُّ عنوانٍ تختاره",
   expect:st=>(st.S.anno||[]).some(t=>t.kind==="text"&&t.s&&t.y<0),
   auto:[{tool:"text"},{type:"s="+TITLE},{at:[3000,-1800]}]},
  ESC_END]
};

/* ═══ المحطّة ٥: الإنشائي ═══ المحاورُ أوّلاً ثم ما يقوم عليها.
   المحورُ «x» خطٌّ رأسيٌّ عند x النقرة، و«y» أفقيٌّ عند y النقرة. */
const AXES=[{tool:"axis"},{at:[0,2000]},{at:[6000,2000]},{type:"dir=y"},{at:[3000,0]},{at:[3000,4000]},{esc:1}];
const FRAME_S={x0:-1600,y0:-1600,x1:7600,y1:5600};
const CORNERS=[Q0,Q1,Q2,Q3];
const axes_grid={
 id:"axes_grid", level:5, title:"شبكة المحاور", min:3,
 goal:"محورَين رأسيَّين وأفقيَّين على أركان الغرفة",
 frame:FRAME_S, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط زرّ المحور", target:"cmd:axis", keys:[["AX","محور"],["Enter"]],
   hint:"في لوحة «المحاور» من تبويب «تأشير»",
   expect:st=>st.tool==="axis", auto:[{tool:"axis"}]},
  {say:"انقر الجدارين الأيسر والأيمن", ghost:{pts:[[0,2000],[6000,2000]],seg:[[0,-800],[0,4800]]},
   hint:"كلُّ نقرةٍ محورٌ رأسيّ بحرف: A ثم B",
   expect:st=>hasAxes(st.S,[0,6000],[]), auto:[{at:[0,2000]},{at:[6000,2000]}]},
  {say:"اكتب dir=y للأفقية", target:"opt:dir", keys:[["dir=y","أفقي"],["Enter"]],
   hint:"المحاورُ الأفقيةُ تُرقَّم 1 و2",
   expect:st=>optIs(st,"axis","dir","y"), auto:[{type:"dir=y"}]},
  {say:"انقر الجدارين السفلي والعلوي", ghost:{pts:[[3000,0],[3000,4000]],seg:[[-800,0],[6800,0]]},
   expect:st=>hasAxes(st.S,[0,6000],[0,4000]), auto:[{at:[3000,0]},{at:[3000,4000]}]},
  ESC_END]
};
const grid_cols={
 id:"grid_cols", level:5, title:"أعمدة على التقاطعات", min:1,
 goal:"عموداً على كلّ تقاطعٍ بأمرٍ واحد",
 frame:FRAME_S, setup:ROOM(6000,4000).concat(AXES),
 steps:[
  {say:"اضغط «أعمدة المحاور»", target:"cmd:gridcols", keys:[["Enter","تنفيذ"]],
   hint:"أمرٌ واحد يضع عموداً على كلّ تقاطع",
   expect:st=>CORNERS.every(p=>colAt(st.S,p)), auto:[{tool:"gridcols"}]},
  {say:"أربعةُ أعمدة! تمّ", keys:[["Esc","تم"]],
   expect:st=>!st.active, auto:[{esc:1}]}]
};
const col_single={
 id:"col_single", level:5, title:"عمود منفرد", min:2,
 goal:"عموداً ٠٫٤ م في وسط الغرفة",
 frame:FRAME_S, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط زرّ العمود", target:"cmd:col", keys:[["Esc","إلغاء"]],
   hint:"في تبويب «خدمات» لوحة «إنشائيّ»",
   expect:st=>st.tool==="col", auto:[{tool:"col"}]},
  {say:"اكتب w=0.4 ثم h=0.4", target:"opt:w", keys:[["w=0.4","العرض"],["h=0.4","العمق"]],
   hint:"كلُّ خيارٍ في سطرٍ مستقلّ ثم Enter",
   expect:st=>optIs(st,"col","w","0.4")&&optIs(st,"col","h","0.4"), auto:[{type:"w=0.4"},{type:"h=0.4"}]},
  {say:"انقر وسط الغرفة", ghost:{pts:[[3000,2000]]},
   expect:st=>{const c=colAt(st.S,[3000,2000]); return !!c&&c.w===400&&c.h===400}, auto:[{at:[3000,2000]}]},
  ESC_END]
};
const beam_span={
 id:"beam_span", level:5, title:"كمرة بين عمودين", min:2,
 goal:"كمرةً تربط العمودين السفليين",
 frame:FRAME_S, setup:ROOM(6000,4000).concat(AXES,[{tool:"gridcols"},{esc:1}]),
 steps:[
  {say:"اضغط زرّ الكمرة", target:"cmd:beam", keys:[["Esc","إلغاء"]],
   expect:st=>st.tool==="beam", auto:[{tool:"beam"}]},
  {say:"انقر العمود الأيسر السفلي", ghost:{pts:[Q0]},
   hint:"الالتقاطُ يقفز إلى مركز العمود",
   expect:st=>st.tool==="beam"&&st.pts.length>0&&near(st.pts[0],Q0), auto:[{at:Q0}]},
  {say:"ثم العمود الأيمن", ghost:{pts:[Q1],seg:[Q0,Q1]},
   hint:"الطولُ والحجمُ يظهران في السجلّ",
   expect:st=>hasBeam(st.S,Q0,Q1), auto:[{at:Q1}]},
  ESC_END]
};
const footings={
 id:"footings", level:5, title:"قواعد تحت الأعمدة", min:2,
 goal:"قاعدتين تحت العمودين السفليين",
 frame:FRAME_S, setup:ROOM(6000,4000).concat(AXES,[{tool:"gridcols"},{esc:1}]),
 steps:[
  {say:"اضغط زرّ القاعدة", target:"cmd:footing", keys:[["Esc","إلغاء"]],
   hint:"بجوار العمود والكمرة",
   expect:st=>st.tool==="footing", auto:[{tool:"footing"}]},
  {say:"انقر العمودين السفليين", grow:1, ghost:{pts:[Q0,Q1]},
   hint:"قاعدةٌ ١٫٥×١٫٥ م تحت كلّ نقرة",
   expect:st=>footAt(st.S,Q0)&&footAt(st.S,Q1), auto:[{at:Q0},{at:Q1}]},
  ESC_END]
};
const S0=[4500,500], S1=[4500,4250];
const stair_run={
 id:"stair_run", level:5, title:"درج مستقيم", min:2,
 goal:"درجاً بطول ٣٫٧٥ م و١٦ قائمة",
 frame:{x0:-1000,y0:-1000,x1:7000,y1:5800}, setup:ROOM(6000,4750),
 steps:[
  {say:"اضغط زرّ الدرج", target:"cmd:stair", keys:[["Esc","إلغاء"]],
   hint:"في لوحة «درج وسقف»",
   expect:st=>st.tool==="stair", auto:[{tool:"stair"}]},
  {say:"انقر بداية الدرج", ghost:{pts:[S0]},
   expect:st=>st.tool==="stair"&&st.pts.length>0&&near(st.pts[0],S0), auto:[{at:S0}]},
  {say:"ثم نهايته للأعلى", ghost:{pts:[S1],box:[3950,500,5050,4250]},
   hint:"السجلُّ يفحص قاعدة 2ق+ن ويحذّرك إن خرجت",
   expect:st=>(st.S.stairs||[]).some(x=>x.flights&&x.flights.some(f=>near(f.a,S0)&&near(f.b,S1))), auto:[{at:S1}]},
  ESC_END]
};
const struct_challenge={
 id:"struct_challenge", level:5, title:"تحدّي الهيكل", min:4, challenge:1,
 goal:"أعمدةً على التقاطعات وكمرتين — بلا دليل",
 frame:FRAME_S, setup:ROOM(6000,4000).concat(AXES),
 steps:[
  {say:"أعمدةٌ على التقاطعات", target:"cmd:gridcols", ghost:{pts:CORNERS},
   hint:"المحاورُ جاهزة: أمرٌ واحدٌ يكفي",
   expect:st=>CORNERS.every(p=>colAt(st.S,p)), auto:[{tool:"gridcols"},{esc:1}]},
  {say:"وكمرتان سفليةٌ وعلوية", grow:1, target:"cmd:beam", ghost:{seg:[Q0,Q1]},
   hint:"الكمرةُ من عمودٍ إلى عمود، وEsc بين الاثنتين",
   expect:st=>hasBeam(st.S,Q0,Q1)&&hasBeam(st.S,Q3,Q2),
   auto:[{tool:"beam"},{at:Q0},{at:Q1},{esc:1},{tool:"beam"},{at:Q3},{at:Q2}]},
  ESC_END]
};

/* ═══ المحطّة ٦: طوابق وسقف ═══ */
const RING=[{at:Q0},{at:Q1},{at:Q2},{at:Q3}];
const add_floor={
 id:"add_floor", level:6, title:"طابقٌ ثانٍ", min:2,
 goal:"طابقاً أوّلَ فوق الأرضي",
 frame:FRAME6, setup:ROOM(6000,4000),
 steps:[
  {say:"افتح «إدارة الطوابق»", target:"act:levelMgrDlg",
   hint:"في تبويب «عرض» لوحة «طبقات ومستويات»",
   expect:st=>!!(st.ui&&st.ui.lvlMgr), auto:[{ui:"levelMgrDlg"}]},
  {say:"اضغط «+ طابق»", target:"sel:[data-do=\"add\"]",
   hint:"الطابقُ الجديد يرتفع ٣ م فوق سابقه",
   expect:st=>(st.S.levelDefs||[]).length>=2, auto:[{addLevel:1}]},
  {say:"أغلق النافذة", target:"sel:[data-rpt=\"close\"]", keys:[["Esc","إغلاق"]],
   expect:st=>!(st.ui&&st.ui.lvlMgr), auto:[{click:"[data-rpt=\"close\"]"}]},
  {say:"طابقان! تمّ", expect:st=>!st.active, auto:[{esc:1}]}]
};
const upper_floor={
 id:"upper_floor", level:6, title:"ارسم في الطابق الأول", min:3,
 goal:"جداراً على الطابق الأول فوق الواجهة",
 frame:FRAME6, setup:ROOM(6000,4000).concat([{addLevel:1}]),
 steps:[
  {say:"اضغط ▶ في شريط الطوابق", target:"sel:#lvlBar button:last-child",
   hint:"أسفل الشاشة بجوار اسم الطابق",
   expect:st=>(st.S.meta&&st.S.meta.level)===1, auto:[{level:1}]},
  {say:"اضغط زرّ الجدار", target:"cmd:wall", keys:[["W","جدار"]],
   hint:"الأرضيُّ يختفي: الرسمُ للطابق النشط وحده",
   expect:st=>st.tool==="wall", auto:[{tool:"wall"}]},
  {say:"ارسم فوق الجدار السفلي", ghost:{pts:[Q0,Q1],seg:[Q0,Q1]}, keys:[["Esc","إنهاء"]],
   hint:"نقرتان، والالتقاطُ يرى أركان الطابق الذي تحته",
   expect:st=>hasWallOn(st.S,Q0,Q1,1), auto:[{at:Q0},{at:Q1}]},
  {say:"Esc ثم ◀ للأرضي", target:"sel:#lvlBar button:first-child", keys:[["Esc","إنهاء"]],
   expect:st=>!st.active&&(st.S.meta&&st.S.meta.level)===0, auto:[{esc:1},{level:0}]},
  ESC_END]
};
const roof_flat={
 id:"roof_flat", level:6, title:"سقفٌ مسطّح", min:2,
 goal:"سقفاً مسطّحاً بميل ٥٪ على الغرفة",
 frame:FRAME6, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط زرّ السقف", target:"cmd:roof", keys:[["RF","سقف"],["Enter"]],
   hint:"في تبويب «خدمات» لوحة «درج وسقف»",
   expect:st=>st.tool==="roof", auto:[{tool:"roof"}]},
  {say:"انقر الأركان الأربعة", ghost:{pts:CORNERS,box:[0,0,6000,4000]},
   hint:"بالترتيب حول الغرفة",
   expect:st=>st.tool==="roof"&&st.pts.length>=4, auto:RING},
  {say:"Enter لإغلاق السقف", keys:[["Enter","إغلاق"]],
   expect:st=>roofOn(st.S,0,"flat"), auto:[{enter:1}]},
  ESC_END]
};
const roof_hip={
 id:"roof_hip", level:6, title:"سقفٌ هرمي", min:2,
 goal:"سقفاً هرمياً بأربعة منحدرات",
 frame:FRAME6, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط زرّ السقف", target:"cmd:roof", keys:[["RF","سقف"],["Enter"]],
   expect:st=>st.tool==="roof", auto:[{tool:"roof"}]},
  {say:"اختر «هرمي» من الشريط", target:"opt:type", keys:[["type=hip","بالكتابة"],["Enter"]],
   hint:"مسطّح · جمالون · هرمي · مائل",
   expect:st=>optIs(st,"roof","type","hip"), auto:[{opt:["roof","type","hip"]}]},
  {say:"انقر الأركان ثم Enter", ghost:{pts:CORNERS,box:[0,0,6000,4000]}, keys:[["Enter","إغلاق"]],
   expect:st=>roofOn(st.S,0,"hip"), auto:RING.concat([{enter:1}])},
  ESC_END]
};
const section_cut={
 id:"section_cut", level:6, title:"مقطعٌ رأسي", min:2,
 goal:"مقطعاً يقطع الغرفة من الأسفل إلى الأعلى",
 frame:{x0:-800,y0:-1800,x1:6800,y1:5800}, setup:ROOM(6000,4000).concat([{tool:"door"},{at:[3000,0]},{esc:1}]),
 steps:[
  {say:"اضغط زرّ المقطع", target:"cmd:section", keys:[["Esc","إلغاء"]],
   hint:"في تبويب «عرض» لوحة «واجهات ومقاطع»",
   expect:st=>st.tool==="section", auto:[{tool:"section"}]},
  {say:"انقر تحت الغرفة", ghost:{pts:[[3000,-1000]]},
   hint:"خطُّ القطع يبدأ خارج المبنى",
   expect:st=>st.tool==="section"&&st.pts.length>0, auto:[{at:[3000,-1000]}]},
  {say:"ثم فوقها", ghost:{pts:[[3000,5000]],seg:[[3000,-1000],[3000,5000]]},
   hint:"ما يقطعه الخطّ يظهر في المقطع: جداران وباب",
   expect:st=>logHas(st,/مقطع/), auto:[{at:[3000,5000]}]},
  ESC_END]
};
const view_3d={
 id:"view_3d", level:6, title:"المجسّم الثلاثي", min:2,
 goal:"أن ترى غرفتك وسقفها مجسّماً",
 frame:FRAME6, setup:ROOM(6000,4000).concat([{tool:"roof"}],RING,[{enter:1},{esc:1}]),
 steps:[
  {say:"افتح «العرض الثلاثي»", target:"act:view3dDlg",
   hint:"في تبويب «عرض» لوحة «مناظر ومجسَّم»",
   expect:st=>!!(st.ui&&st.ui.v3d), auto:[{ui:"view3dDlg"}]},
  {say:"اسحب لتدوير المجسّم", target:"sel:.v3 canvas",
   hint:"العجلةُ تقرّب، وأزرارُ الأعلى مناظرُ جاهزة",
   expect:st=>!!(st.ui&&st.ui.v3dMoved), auto:[{click:".v3 canvas"}]},
  {say:"أغلقه بـ Esc", target:"sel:.v3 [data-v3=\"close\"]", keys:[["Esc","إغلاق"]],
   expect:st=>!(st.ui&&st.ui.v3d), auto:[{click:".v3 [data-v3=\"close\"]"}]},
  {say:"رأيتَ مبناك! تمّ", expect:st=>!st.active, auto:[{esc:1}]}]
};
const floors_challenge={
 id:"floors_challenge", level:6, title:"تحدّي الطابقين", min:5, challenge:1,
 goal:"طابقاً أوّلَ عليه جدارٌ وسقف — بلا دليل",
 frame:FRAME6, setup:ROOM(6000,4000),
 steps:[
  {say:"أضف طابقاً أوّل", target:"act:levelMgrDlg",
   hint:"«إدارة الطوابق» ثم «+ طابق»",
   expect:st=>(st.S.levelDefs||[]).length>=2, auto:[{addLevel:1}]},
  {say:"وجداراً عليه", grow:1, target:"sel:#lvlBar button:last-child", ghost:{seg:[Q3,Q2]},
   hint:"انتقل إلى الطابق ١ أوّلاً ثم ارسم",
   expect:st=>(st.S.walls||[]).some(w=>(w.level|0)===1),
   auto:[{level:1},{tool:"wall"},{at:Q3},{at:Q2},{esc:1}]},
  {say:"وسقفاً للطابق الأول", target:"cmd:roof", ghost:{box:[0,0,6000,4000]},
   hint:"السقفُ يقع على الطابق النشط",
   expect:st=>roofOn(st.S,1),
   auto:[{tool:"roof"}].concat(RING,[{enter:1}])},
  ESC_END]
};

/* ═══ المرحلة ٧: دروسٌ إضافية للمحطّتين ١ و٢ ═══ extra:1 لا يشترطها فتحُ
   المحطّة التالية، فمن أكمل المحطّةَ قبلها لا يُقفَل عليه ما فتحه */
const rect_room={
 id:"rect_room", level:1, extra:1, title:"غرفةٌ بالمستطيل", min:1,
 goal:"أربعةَ جدرانٍ بنقرتين",
 frame:{x0:-800,y0:-800,x1:5800,y1:4800},
 steps:[
  {say:"اضغط زرّ المستطيل", target:"cmd:rect", keys:[["R","مستطيل"]],
   hint:"بجوار الجدار في «جدران وأشكال»",
   expect:st=>st.tool==="rect", auto:[{tool:"rect"}]},
  {say:"انقر ركناً ثم المقابل", ghost:{pts:[[0,0],[5000,4000]],box:[0,0,5000,4000]},
   hint:"المستطيلُ يرسم الجدران الأربعة دفعةً واحدة",
   expect:st=>hasWall(st.S,[0,0],[5000,0])&&hasWall(st.S,[5000,0],[5000,4000])&&hasWall(st.S,[5000,4000],[0,4000])&&hasWall(st.S,[0,4000],[0,0]),
   auto:[{at:[0,0]},{at:[5000,4000]}]},
  ESC_END]
};
const arc_planter={
 id:"arc_planter", level:1, extra:1, title:"حوضٌ قوسي", min:2,
 goal:"جداراً قوسياً أمام الغرفة",
 frame:{x0:-800,y0:-2800,x1:6800,y1:4800}, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط «جدار قوسي»", target:"cmd:arcwall", keys:[["AW","جدار قوسي"],["Enter"]],
   expect:st=>st.tool==="arcwall", auto:[{tool:"arcwall"}]},
  {say:"البداية ثم النهاية", ghost:{pts:[[1000,-500],[5000,-500]]},
   hint:"طرفا القوس أوّلاً",
   expect:st=>st.tool==="arcwall"&&st.pts.length>1, auto:[{at:[1000,-500]},{at:[5000,-500]}]},
  {say:"ثم نقطةً على القوس", ghost:{pts:[[3000,-2000]]},
   hint:"كلّما ابتعدت النقطة زاد انحناؤه",
   expect:st=>(st.S.walls||[]).some(w=>Math.abs(w.bulge||0)>0.1), auto:[{at:[3000,-2000]}]},
  ESC_END]
};
const PART=[{tool:"wall"},{at:[3000,0]},{at:[3000,4000]},{esc:1}];
const move_partition={
 id:"move_partition", level:2, extra:1, title:"انقل القاطع", min:2,
 goal:"القاطعَ متراً إلى اليمين",
 frame:{x0:-800,y0:-800,x1:9800,y1:4800}, setup:ROOM(9000,4000).concat(PART),
 steps:[
  {say:"انقر القاطع لتحديده", ghost:{seg:[[3000,0],[3000,4000]],pts:[[3000,2000]]},
   expect:st=>!st.active&&selWall(st,[3000,0],[3000,4000]), auto:[{pick:{k:"wall",at:[3000,2000]}}]},
  {say:"اضغط زرّ النقل", target:"cmd:move", keys:[["M","نقل"]],
   expect:st=>st.tool==="move", auto:[{tool:"move"}]},
  {say:"انقر أسفل القاطع", ghost:{pts:[[3000,0]]},
   expect:st=>st.tool==="move"&&st.pts.length>0, auto:[{at:[3000,0]}]},
  {say:"ثم متراً يميناً", ghost:{pts:[[4000,0]],seg:[[4000,0],[4000,4000]]},
   hint:"أو وجّه المؤشّر يميناً واكتب 1",
   expect:st=>hasWall(st.S,[4000,0],[4000,4000])&&!hasWall(st.S,[3000,0],[3000,4000]), auto:[{at:[4000,0]}]},
  ESC_END]
};
const mirror_partition={
 id:"mirror_partition", level:2, extra:1, title:"اعكس القاطع", min:2,
 goal:"قاطعاً مقابلاً بالمرآة حول منتصف الغرفة",
 frame:{x0:-800,y0:-800,x1:9800,y1:4800}, setup:ROOM(9000,4000).concat(PART),
 steps:[
  {say:"انقر القاطع لتحديده", ghost:{seg:[[3000,0],[3000,4000]],pts:[[3000,2000]]},
   expect:st=>!st.active&&selWall(st,[3000,0],[3000,4000]), auto:[{pick:{k:"wall",at:[3000,2000]}}]},
  {say:"اضغط زرّ المرآة", target:"cmd:mirror", keys:[["MR","مرآة"],["Enter"]],
   expect:st=>st.tool==="mirror", auto:[{tool:"mirror"}]},
  {say:"انقر منتصفَي السفلي والعلوي", ghost:{pts:[[4500,0],[4500,4000]],seg:[[4500,-500],[4500,4500]]},
   hint:"محورُ المرآة، والأصلُ يبقى",
   expect:st=>hasWall(st.S,[6000,0],[6000,4000])&&hasWall(st.S,[3000,0],[3000,4000]), auto:[{at:[4500,0]},{at:[4500,4000]}]},
  ESC_END]
};

/* ═══ المحطّة ٧: إخراج وطباعة ═══ رسائلُ التصدير والفحص تُقرأ من st.log */
const out_sheet={
 id:"out_sheet", level:7, title:"ورقة الطباعة", min:1,
 goal:"ورقةً جديدةً للمخطّط",
 frame:FRAME6, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط «ورقة جديدة»", target:"cmd:addsheet",
   hint:"في تبويب «إخراج» لوحة «أوراق»",
   expect:st=>(st.S.sheets||[]).length>=1, auto:[{tool:"addsheet"}]},
  ESC_END]
};
const out_boq={
 id:"out_boq", level:7, title:"جدول الكميات", min:1,
 goal:"حصرَ الجدران وتسعيرَها",
 frame:FRAME6, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط «جدول الكميات»", target:"cmd:boq",
   hint:"في لوحة «حصر وتسعير»",
   expect:st=>logHas(st,/جداراً|الإجمالي/), auto:[{tool:"boq"}]},
  ESC_END]
};
const out_pdf={
 id:"out_pdf", level:7, title:"اطبع PDF", min:1,
 goal:"ملفَّ PDF متّجهاً بمقياس ١:١٠٠",
 frame:FRAME6, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط زرّ PDF", target:"act:xPdf",
   hint:"في لوحة «التصدير»، والمقياسُ من الورقة",
   expect:st=>logHas(st,/PDF/), auto:[{ui:"xPdf"}]},
  ESC_END]
};
const out_dxf={
 id:"out_dxf", level:7, title:"صدّر DXF", min:1,
 goal:"ملفَّ DXF يفتحه أوتوكاد",
 frame:FRAME6, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط زرّ DXF", target:"act:xDxf",
   hint:"بالمليمتر، والعربيةُ بترميز CP1256",
   expect:st=>logHas(st,/DXF/), auto:[{ui:"xDxf"}]},
  ESC_END]
};
const out_inspect={
 id:"out_inspect", level:7, title:"افحص قبل التسليم", min:1,
 goal:"أن يفحص البرنامجُ مخطّطك",
 frame:FRAME6, setup:ROOM(6000,4000),
 steps:[
  {say:"اضغط «افحص» أو F7", target:"act:inspect", keys:[["F7","الفاحص"]],
   hint:"يجمع الملاحظات: جدرانٌ غير ملتحمة، فتحاتٌ متداخلة…",
   expect:st=>logHas(st,/الفاحص/), auto:[{ui:"inspect"}]},
  ESC_END]
};

/* ═══ مشروعُ الفيلا الختامي ═══ فصولُ «فيلا العرض» نفسُها (tools/showcase.js)
   خطوةٌ لكلّ فصل: شبحُ نقاطه، وتلميحُه أوّلُ شرحه، و«شاهدني» ينفّذه كاملاً.
   الإتمامُ عددُ العناصر عند نهاية الفصل كما يبنيه القالب (NEED — يحرسه
   learn.test.js بتشغيل الفصول كلّها). */
const NEED=[{chains:4},{walls:4},{walls:10},{walls:11},{opens:16},{areas:7},{cols:15,struct:6},
 {stairs:1},{fixt:10},{fixt:21,groups:1},{fixt:43},{dims:6,chains:5,anno:1,plines:1},
 {anno:7,tables:1,clouds:1,livefields:1},{roofs:1,levelDefs:2},{sheets:1}];
const AN="٠١٢٣٤٥٦٧٨٩";
const arN=n=>String(n).replace(/\d/g,d=>AN[+d]);
function villaSteps(){
 const CH=[]; let cur=null;
 SHOWCASE.forEach(a=>{if(a.ch){cur={t:a.ch,acts:[],says:[]}; CH.push(cur)} else if(cur){if(a.say)cur.says.push(a.say); else cur.acts.push(a)}});
 return CH.map((c,i)=>{
  const pts=[];
  c.acts.forEach(a=>{if(a.at){(Array.isArray(a.at[0])?a.at:[a.at]).forEach(p=>{if(pts.length<24)pts.push(p)})}});
  const need=NEED[i]||{};
  return {say:`الفصل ${arN(i+1)}: ${c.t}`, grow:1, ghost:pts.length?{pts}:null,
   hint:c.says[0]||"", chapter:c.t, need,
   expect:st=>Object.keys(need).every(k=>((st.S[k]||[]).length)>=need[k]),
   auto:JSON.parse(JSON.stringify(c.acts)).concat([{esc:1}])};
 });
}
const villa_final={
 id:"villa_final", level:7, capstone:1, title:"مشروع الفيلا الختامي", min:45,
 goal:"فيلا ١٦×١٢ م كاملة: من المحاور إلى ورقة الطباعة",
 frame:{x0:-2500,y0:-7000,x1:25500,y1:14500}, setup:[{meta:{scale:100}}],
 steps:villaSteps().concat([ESC_END])
};

/* ═══ الخريطة ═══ سبعُ محطّات كلُّها مفتوحة في المرحلة ٧ */
export const LEVELS=[
 {n:1, title:"الأساسيات",       lessons:["first_room","two_rooms","rect_room","arc_planter"]},
 {n:2, title:"تعديل وتحرير",    lessons:["offset_corridor","copy_partition","move_partition","mirror_partition"]},
 {n:3, title:"فتحات ومناطق",    lessons:["door_double","window_wide","typed_opening","arch_niche","named_areas","hatch_room","open_challenge"]},
 {n:4, title:"أبعاد وتأشير",    lessons:["dim_h","dim_v","room_dims","text_title","leader_note","level_mark","annot_challenge"]},
 {n:5, title:"الإنشائي",        lessons:["axes_grid","grid_cols","col_single","beam_span","footings","stair_run","struct_challenge"]},
 {n:6, title:"طوابق وسقف",      lessons:["add_floor","upper_floor","roof_flat","roof_hip","section_cut","view_3d","floors_challenge"]},
 {n:7, title:"إخراج وطباعة",    lessons:["out_sheet","out_boq","out_pdf","out_dxf","out_inspect","villa_final"]}
];
export const LESSONS={first_room,two_rooms,offset_corridor,copy_partition,
 door_double,window_wide,typed_opening,arch_niche,named_areas,hatch_room,open_challenge,
 dim_h,dim_v,room_dims,text_title,leader_note,level_mark,annot_challenge,
 axes_grid,grid_cols,col_single,beam_span,footings,stair_run,struct_challenge,
 add_floor,upper_floor,roof_flat,roof_hip,section_cut,view_3d,floors_challenge,
 rect_room,arc_planter,move_partition,mirror_partition,
 out_sheet,out_boq,out_pdf,out_dxf,out_inspect,villa_final};
/* ترتيبُ الدروس كلِّها كما في الخريطة، والتالي بعد درسٍ (أو null) */
export const ORDER=LEVELS.flatMap(L=>L.lessons);
export const nextLesson=id=>{const i=ORDER.indexOf(id); return i>=0&&i<ORDER.length-1?ORDER[i+1]:null};
export const levelOfLesson=id=>(LEVELS.find(L=>L.lessons.includes(id))||{}).n||0;
export const lessonOf=id=>LESSONS[id]||null;
/* المحطّة مفتوحةٌ إن كان فيها درس، والأولى دائماً أو بعد نجمةٍ في سابقتها */
export function levelOpen(n,progress){
 const L=LEVELS[n-1];
 if(!L||!L.lessons.length)return false;
 if(n===1)return true;
 const prev=LEVELS[n-2];
 /* الإضافيُّ (extra) إثراءٌ لا شرط: فتحُ المحطّة بدروسها الأساسية وحدها */
 const must=prev.lessons.filter(id=>!(LESSONS[id]&&LESSONS[id].extra));
 return must.length>0&&must.every(id=>((progress||{})[id]||{}).stars>0);
}
