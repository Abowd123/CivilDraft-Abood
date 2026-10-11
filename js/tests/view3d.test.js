/* ═══ العرض الثلاثي وأنماط الرسم — اختبار السلوك ═══
   proj3d (الإسقاط والوجوه والملاءمة) + model3d (بناء الوجوه من المخطّط)
   + مسار الإضافة والحذف لأنواع الخطوط وأنماط التهشير وطرز الأبعاد
   كما تستعمله نافذة أنماط الرسم (ui/styleManager.js). */
import {shim,shimCanvas,group,eq,ok,summary} from "./harness.js";
shim(); shimCanvas();

const {S,newState,ensureShape,undo,editFailed}=await import("../core/state.js");
const {addWall}=await import("../core/walls.js");
const {addLevelDef}=await import("../core/level.js");
const P=await import("../core/proj3d.js");
const {build3d,extrude,wallFaces,usableOpens,MAX_FACES}=await import("../core/model3d.js");
const {addOpen}=await import("../core/opens.js");
const {band,isArc}=await import("../core/walls.js");
const LT=await import("../core/ltypes.js");
const HT=await import("../core/hatches.js");
const DS=await import("../core/dimstyles.js");

const near=(a,b,e=1e-6)=>Math.abs(a-b)<=e;

group("proj3d — الوجوه والعمق والملاءمة",()=>{
 const top={yaw:0,pitch:Math.PI/2}, front={yaw:0,pitch:0};
 ok(P.facing([0,0,1],top)>0.99,"من فوق: وجهُ السقف يواجه الناظر");
 ok(P.facing([0,0,-1],top)<-0.99,"والوجهُ السفليّ لا");
 ok(P.facing([0,-1,0],front)>0.99,"من الأمام: الوجهُ الجنوبيّ يواجه الناظر");
 ok(P.facing([0,1,0],front)<-0.99,"والشماليّ خلفيّ");
 const r=P.rotN([1,0,0],{yaw:Math.PI/2});
 ok(near(r[0],0)&&near(r[1],1),"rotN تدوّر الناظم حول Z");
 const a=[[0,0,0]], b=[[0,1000,0]];
 ok(P.faceDepth(b,front)>P.faceDepth(a,front),"الأبعد عن الكاميرا أكبر عمقاً");
 ok(P.faceDepth([],front)===0,"بلا نقاط: صفر");
 const pts=[[0,0,0],[6000,0,0],[6000,4000,3000],[0,4000,3000]];
 const cam={yaw:-0.6,pitch:0.96};
 const f=P.fitCam(pts,cam,800,600,20);
 const c2=Object.assign({},cam,f);
 let x0=1/0,y0=1/0,x1=-1/0,y1=-1/0;
 pts.forEach(p=>{const q=P.projScreen(p,c2);
  x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1])});
 ok(x0>=19.9&&x1<=780.1&&y0>=19.9&&y1<=580.1,"fitCam تُبقي المجسّم داخل اللوحة بهامشه");
 ok(near((x0+x1)/2,400,0.5)&&near((y0+y1)/2,300,0.5),"وتتوسّطه");
 const e=P.fitCam([],cam,800,600);
 ok(e.scale===1&&e.ox===400&&e.oy===300,"مجموعةٌ فارغة: كاميرا افتراضية سليمة");
});

group("model3d — extrude",()=>{
 const sq=[[0,0],[1000,0],[1000,1000],[0,1000]];
 const fs=extrude(sq,0,3000,"wall",0);
 eq(fs.length,5,"أربعة جوانب وغطاء");
 ok(fs.slice(0,4).every(f=>near(f.n[2],0)),"نواظم الجوانب أفقية");
 const s=fs[0];                                  /* الضلع الجنوبيّ */
 ok(near(s.n[1],-1)&&near(s.n[0],0),"الجانب الجنوبيّ ناظمُه للخارج (−y)");
 eq(fs[4].n[2],1,"والغطاء ناظمُه +z");
 const cw=extrude(sq.slice().reverse(),0,3000,"wall",0);
 ok(near(cw[0].n[0]*cw[0].n[0]+cw[0].n[1]*cw[0].n[1],1)
  &&cw.every(f=>f.kind==="wall"),"الحلقة المعكوسة تُقلَب فتبقى النواظم للخارج");
 eq(cw.filter(f=>near(f.n[1],-1)).length,1,"وواحدٌ فقط يواجه الجنوب");
 eq(extrude(sq,0,0,"wall",0).length,0,"ارتفاعٌ صفريّ: لا وجوه");
 eq(extrude([[0,0],[1,1]],0,10,"wall",0).length,0,"أقلّ من ثلاثة رؤوس: لا وجوه");
 eq(extrude(null,0,10,"wall",0).length,0,"مدخلٌ فاسد لا يُسقِط");
 ok(MAX_FACES>1000,"حدّ الوجوه معلَن");
});

group("model3d — build3d من المخطّط",()=>{
 newState();
 S.meta.wallH=3000;
 addWall([0,0],[6000,0],250,"ext","c");
 addWall([6000,0],[6000,4000],250,"ext","c");
 addWall([6000,4000],[0,4000],250,"ext","c");
 addWall([0,4000],[0,0],250,"ext","c");
 ensureShape();
 const m=build3d(S);
 ok(m.faces.length>=4*5-4,"أربعة جدرانٍ تنتج وجوهاً");
 ok(m.faces.every(f=>f.kind==="wall"),"كلها جدران");
 const zs=m.pts.map(p=>p[2]);
 ok(Math.min(...zs)===0&&Math.max(...zs)===3000,"من الأرض إلى ارتفاع الجدار");
 eq(m.levels.join(),"0","طابقٌ واحد");
 eq(m.truncated,0,"لا قطع");

 /* طابقٌ ثانٍ بمنسوبه */
 addLevelDef(S,{n:1,name:"أول",elev:3200,h:3000,slab:200,color:"#cccccc"});
 S.meta.level=1;
 addWall([0,0],[6000,0],250,"ext","c");
 ensureShape();
 const all=build3d(S), l1=build3d(S,{level:1}), l0=build3d(S,{level:0});
 eq(all.levels.join(),"0,1","الطابقان");
 ok(l1.faces.length>0&&l1.faces.every(f=>f.level===1),"تصفية الطابق 1");
 ok(Math.min(...l1.pts.map(p=>p[2]))===3200,"وقاعدته عند منسوبه 3200");
 ok(l0.faces.every(f=>f.level===0),"وتصفية الطابق 0");
 eq(build3d(S,{level:"all"}).faces.length,all.faces.length,"«all» كلُّها");

 /* لا كتابةَ في S: نفس اللقطة قبل وبعد */
 const before=JSON.stringify(S);
 build3d(S); build3d(S,{level:1});
 eq(JSON.stringify(S),before,"البناء قراءةٌ محضة");

 /* عمودٌ وسقف */
 newState(); S.meta.wallH=3000;
 S.cols.push({id:"C1",x:1000,y:1000,w:300,h:300,kind:"rect",level:0,type:"conc"});
 S.roofs.push({id:"R1",ring:[[0,0],[4000,0],[4000,4000],[0,4000]],level:0,h:3000,type:"flat",slope:5});
 const m2=build3d(S);
 ok(m2.faces.some(f=>f.kind==="col"),"العمود يُبنى");
 ok(m2.faces.some(f=>f.kind==="roof"),"والسقف يُبنى");
 ok(Math.max(...m2.pts.map(p=>p[2]))===3150,"السقف عند ارتفاعه + سماكته");

 newState();
 eq(build3d(S).faces.length,0,"مشروعٌ فارغ: لا وجوه");
});

group("أنواع الخطوط — مسار النافذة",()=>{
 newState(); ensureShape();
 const base=LT.ltList().length;
 const k=LT.addLtype("MB-DBL","مزدوج","",[8,2,1,2]);
 ok(!editFailed()&&k==="MB-DBL","إضافة نوعٍ مخصّص");
 eq(LT.ltList().length,base+1,"ظهر في القائمة الحيّة (مصدر قائمة الطبقات)");
 ok(LT.ltList().find(r=>r.k==="MB-DBL").custom===1,"موسومٌ مخصّصاً");
 LT.addLtype("MB-DBL","مزدوج ٢","",[4,1]);
 eq(LT.ltDef("MB-DBL").mm.join(),"4,1","إعادة الحفظ تعدّل الموجود");
 LT.addLtype("1bad","x","",[1,1]);
 ok(editFailed(),"اسمٌ فاسد يُرفَض");
 LT.addLtype("MB-EMPTY","x","",[]);
 ok(editFailed(),"شرطاتٌ فارغة تُرفَض");
 S.layers[0].lt="MB-DBL";
 LT.delLtype("MB-DBL");
 ok(editFailed(),"نوعٌ تستعمله طبقةٌ لا يُحذَف");
 S.layers[0].lt="solid";
 ok(LT.delLtype("MB-DBL")===true,"ويُحذَف بعد تحرير الطبقة");
 eq(LT.ltList().length,base,"عادت القائمة");
 LT.addLtype("MB-U","u","",[3,3]); undo();
 ok(!LT.ltList().some(r=>r.k==="MB-U"),"وتراجعُ الإضافة يعمل");
});

group("أنماط التهشير — مسار النافذة",()=>{
 newState(); ensureShape();
 const base=HT.patList().length;
 HT.addHatch("MB-BRICK","طوب",30,5,0);
 ok(!editFailed(),"إضافة نمط");
 const r=HT.patList().find(x=>x.k==="MB-BRICK");
 ok(r&&r.custom&&r.ang===30&&r.mm===5,"القيم محفوظة");
 HT.addHatch("MB-BRICK","طوب",400,5,0);
 ok(editFailed()&&HT.hatchDef("MB-BRICK").ang===30,"زاويةٌ خارج ±360 تُرفَض وتبقى القيمة");
 HT.addHatch("MB-BRICK","طوب",-30,5,0);
 ok(!editFailed()&&HT.hatchDef("MB-BRICK").ang===330,"والسالبة تُطبَّع إلى 0–360");
 HT.addHatch("ANSI31","x",10,1,0);
 ok(HT.hatchDef("ANSI31").ang===45,"المصنعيّ لا يُظلَّل");
 HT.addHatch("9bad","x",10,1,0);
 ok(editFailed(),"اسمٌ فاسد يُرفَض");
 ok(HT.delHatch("MB-BRICK")===true&&HT.patList().length===base,"حذف");
 ok(HT.delHatch("ANSI31")===false,"المصنعيّ لا يُحذَف");
});

group("طرز الأبعاد — مسار النافذة",()=>{
 newState(); ensureShape();
 eq(DS.dsList().length,0,"فارغةٌ افتراضاً");
 DS.addDimstyle("DS-WORK","عمل","arrow",1,1.5);
 ok(!editFailed(),"إضافة");
 const r=DS.dsList()[0];
 ok(r.k==="DS-WORK"&&r.tick==="arrow"&&r.dec===1&&r.hMul===1.5,"القيم محفوظة");
 DS.addDimstyle("DS-WORK","عمل","slash",null,1);
 const s=DS.styleOf("DS-WORK");
 ok(s.tick==="slash"&&s.dec===(parseInt(S.meta.dimDec,10)||0),
  "عشرية فارغة ترجع لافتراضيّ المشروع");
 DS.addDimstyle("bad name","x","slash",2,1);
 ok(editFailed(),"اسمٌ فاسد يُرفَض");
 S.dims.push({id:"D1",style:"DS-WORK"});
 DS.delDimstyle("DS-WORK");
 ok(editFailed(),"طرازٌ يستعمله بُعدٌ لا يُحذَف");
 S.dims.length=0;
 ok(DS.delDimstyle("DS-WORK")===true&&DS.dsList().length===0,"ويُحذَف بعد تحريره");
});

/* ═══ ثقوب الأبواب والشبابيك ═══ */
const area3=f=>{                                  /* مساحة وجهٍ مستوٍ في الفضاء */
 let x=0,y=0,z=0; const p=f.pts;
 for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];
  x+=a[1]*b[2]-a[2]*b[1]; y+=a[2]*b[0]-a[0]*b[2]; z+=a[0]*b[1]-a[1]*b[0]}
 return Math.hypot(x,y,z)/2;
};
/* جدارٌ أفقيّ على المحور x: الجهة الأمامية = ناظمها +y */
const frontArea=fs=>fs.filter(f=>f.kind==="wall"&&near(f.n[1],1)&&near(f.n[2],0))
 .reduce((s,f)=>s+area3(f),0);
const oneWall=(len=6000,t=250)=>{
 newState(); S.meta.wallH=3000;
 const w=addWall([0,0],[len,0],t,"ext","c"); ensureShape(); return w;
};

group("model3d — ثقب باب",()=>{
 const w=oneWall();
 ok(addOpen(w,1500,"door",900,2100,0),"إضافة باب");
 const m=build3d(S);
 const solid=6000*3000, hole=900*2100;
 ok(near(frontArea(m.faces),solid-hole,1e-3),"مساحة الوجه الأمامي = الجدار − الفتحة");
 const back=m.faces.filter(f=>near(f.n[1],-1)).reduce((s,f)=>s+area3(f),0);
 ok(near(back,solid-hole,1e-3),"والخلفي كذلك");
 const jambs=m.faces.filter(f=>near(Math.abs(f.n[0]),1));
 eq(jambs.length,4,"نهايتا الجدار وجانبا الفتحة");
 const inner=jambs.filter(f=>f.pts.every(p=>p[0]>1000&&p[0]<2000));
 eq(inner.length,2,"جانبا الفتحة اثنان");
 ok(inner.every(f=>near(Math.min(...f.pts.map(p=>p[2])),0)&&near(Math.max(...f.pts.map(p=>p[2])),2100)),
  "وحشوتهما من الأرض إلى رأس الباب فقط");
 ok(inner.every(f=>near(area3(f),250*2100,1e-3)),"بعمق الجدار كاملاً");
 const xs=inner.map(f=>f.pts[0][0]).sort((a,b)=>a-b);
 ok(near(xs[0],1050)&&near(xs[1],1950),"عند حدّي الفتحة 1050 و1950");
 const lint=m.faces.filter(f=>near(f.n[1],1)&&f.pts.every(p=>p[0]>=1050-1e-6&&p[0]<=1950+1e-6));
 eq(lint.length,1,"وصلةٌ واحدة أمام الفتحة");
 ok(near(Math.min(...lint[0].pts.map(p=>p[2])),2100)&&near(Math.max(...lint[0].pts.map(p=>p[2])),3000),
  "من رأس الباب إلى رأس الجدار");
 const zs=m.pts.map(p=>p[2]);
 ok(Math.min(...zs)===0&&Math.max(...zs)===3000,"الحدود الرأسية لم تتغير");
 ok(m.faces.every(f=>f.kind==="wall"&&f.level===0),"كلها جدران بمستواها");
 eq(m.arcSolid,0,"لا جدران قوسية");
});

group("model3d — شباك بجلسة وفتحتان متجاورتان",()=>{
 const w=oneWall();
 addOpen(w,1500,"window",1200,1200,900);
 const m=build3d(S);
 ok(near(frontArea(m.faces),6000*3000-1200*1200,1e-3),"الشباك: الجدار − مساحة الفتحة");
 const sillF=m.faces.filter(f=>near(f.n[2],1)&&near(Math.max(...f.pts.map(p=>p[2])),900));
 eq(sillF.length,1,"غطاء الجلسة عند 900");
 const jamb=m.faces.filter(f=>near(Math.abs(f.n[0]),1)&&f.pts.every(p=>p[0]>800&&p[0]<2200));
 ok(jamb.length===2&&jamb.every(f=>near(Math.min(...f.pts.map(p=>p[2])),900)
  &&near(Math.max(...f.pts.map(p=>p[2])),2100)),"الحشوة من الجلسة 900 إلى 2100 لا أطول");
 /* فتحتان متجاورتان بينهما فاصلٌ مصمت */
 addOpen(w,3000,"door",900,2100,0);
 const m2=build3d(S);
 const hole=1200*1200+900*2100;
 ok(near(frontArea(m2.faces),6000*3000-hole,1e-3),"فتحتان: الجدار − مجموع الفتحتين");
 const mid=m2.faces.filter(f=>near(f.n[1],1)&&f.pts.every(p=>p[0]>=2100-1e-6&&p[0]<=2550+1e-6)
  &&near(Math.max(...f.pts.map(p=>p[2])),3000)&&near(Math.min(...f.pts.map(p=>p[2])),0));
 eq(mid.length,1,"المقطع المصمت بين الفتحتين كاملُ الارتفاع");
 /* فتحةٌ أعلى من الجدار: تُقصّ عند رأسه بلا وصلة */
 const w3=oneWall();
 addOpen(w3,3000,"opening",1000,2900,0);
 S.opens[0].h=5000;
 const m3=build3d(S);
 ok(near(frontArea(m3.faces),6000*3000-1000*3000,1e-3),"فتحةٌ أعلى من الجدار تُقصّ عند رأسه");
 ok(m3.faces.every(f=>f.pts.every(p=>p[2]>=0&&p[2]<=3000)),"ولا وجهَ فوق الجدار");
});

group("model3d — ما لا يُثقَب أو يُتجاهل",()=>{
 const solidCount=len=>{ const w=oneWall(len); return extrude(band(w),0,3000,"wall",0).length };
 /* كوّة لا تقطع */
 const w=oneWall();
 addOpen(w,3000,"niche",800,1000,900);
 eq(build3d(S).faces.length,solidCount(),"الكوّة تُرسَم مصمتة");
 /* فتحةٌ خارج مدى جدارها (تنتهك EDGE) تُتجاهل */
 const w2=oneWall();
 addOpen(w2,3000,"door",900,2100,0);
 S.opens[0].s=200;                          /* حافتها تتجاوز مدى الجدار */
 eq(build3d(S).faces.length,solidCount(),"الفتحة الخارجة (over) تُتجاهل");
 /* متراكبتان: كلتاهما تُتجاهل كما يفعل openState */
 const w3=oneWall();
 addOpen(w3,2000,"door",900,2100,0); addOpen(w3,4000,"door",900,2100,0);
 S.opens[1].s=2400;
 eq(build3d(S).faces.length,solidCount(),"المتراكبتان (clash) تُتجاهلان");
 /* يتيمة: جدارها غير موجود */
 const w4=oneWall();
 addOpen(w4,3000,"door",900,2100,0);
 S.opens[0].wall="W-NONE";
 eq(build3d(S).faces.length,solidCount(),"الفتحة اليتيمة تُتجاهل");
 /* أبعادٌ فاسدة لا تُسقِط ولا تنتج NaN */
 const w5=oneWall();
 addOpen(w5,3000,"door",900,2100,0);
 S.opens[0].h=NaN;
 const m5=build3d(S);
 ok(m5.pts.every(p=>p.every(Number.isFinite)),"فتحةٌ فاسدة الارتفاع: لا NaN");
 ok(usableOpens(w5,[{kind:"door",s:3000,w:900,h:2100,sill:0}],6000).length===1,"usableOpens تقبل السليمة");
 ok(usableOpens(w5,[{kind:"niche",s:3000,w:900,h:2100,sill:0}],6000).length===0,"وترفض الكوّة");
 ok(wallFaces(w5,[],0,3000,0)===null,"wallFaces بلا فتحات تعيد null (المصمت يتولّى)");
});

group("model3d — الجدار القوسي يبقى مصمتاً",()=>{
 newState(); S.meta.wallH=3000;
 const w=addWall([0,0],[6000,0],250,"ext","c"); ensureShape();
 addOpen(w,2500,"door",900,2100,0);         /* addOpen ترفض القوسي: يُحوَّل بعد إضافتها */
 w.bulge=0.4;
 ok(isArc(w),"جدارٌ صار قوسياً وفتحته باقية");
 const m=build3d(S);
 eq(m.faces.length,extrude(band(w),0,3000,"wall",0).length,"يُبنى مصمتاً كما كان");
 eq(m.arcSolid,1,"ويُعدّ في arcSolid ليُبلَّغ");
});

group("model3d — لا انحدار بلا فتحات",()=>{
 const w=oneWall();
 const a=build3d(S).faces, b=extrude(band(w),0,3000,"wall",0);
 eq(JSON.stringify(a),JSON.stringify(b),"مطابقٌ تماماً لـ extrude القديم");
 /* فتحةٌ في جدارٍ آخر لا تمسّ الأول */
 const w2=addWall([0,2000],[6000,2000],250,"ext","c"); ensureShape();
 addOpen(w2,3000,"door",900,2100,0);
 const m=build3d(S);
 const first=m.faces.filter(f=>f.pts.every(p=>p[1]<=125+1e-6));
 eq(JSON.stringify(first),JSON.stringify(b),"جدارٌ بلا فتحات يبقى كما هو بجوار جدارٍ مثقوب");
 const before=JSON.stringify(S); build3d(S);
 eq(JSON.stringify(S),before,"والبناء قراءةٌ محضة");
});

group("model3d — طابقٌ ثانٍ وسقف الوجوه",()=>{
 newState(); S.meta.wallH=3000;
 addLevelDef(S,{n:1,name:"أول",elev:3200,h:3000,slab:200,color:"#cccccc"});
 S.meta.level=1;
 const w=addWall([0,0],[6000,0],250,"ext","c"); ensureShape();
 addOpen(w,3000,"window",1200,1200,900);
 const m=build3d(S,{level:1});
 ok(Math.min(...m.pts.map(p=>p[2]))===3200&&Math.max(...m.pts.map(p=>p[2]))===6200,"المدى الرأسي بمنسوب الطابق");
 const sill=m.faces.filter(f=>near(f.n[2],1)&&near(Math.max(...f.pts.map(q=>q[2])),3200+900));
 eq(sill.length,1,"الجلسة عند منسوب الطابق + 900");
 /* سقف MAX_FACES ما زال يعمل مع الجدران المثقوبة */
 newState(); S.meta.wallH=3000;
 for(let i=0;i<2700;i++){
  const y=i*400;
  const wi=addWall([0,y],[6000,y],250,"ext","c");
  if(wi){addOpen(wi,1500,"door",900,2100,0); addOpen(wi,4000,"window",1200,1200,900)}
 }
 ensureShape();
 const big=build3d(S);
 ok(big.faces.length<=MAX_FACES,"لا تتجاوز الوجوه الحدّ");
 ok(big.truncated>0,"والزائد يُبلَّغ في truncated");
});

const fsMod=await import("node:fs");
group("العرض الثلاثي — سطر المعلومات",()=>{
 const fs=fsMod;
 const src=fs.readFileSync(new URL("../ui/view3d.js",import.meta.url),"utf8");
 ok(!/الفتحات لا تُثقَب/.test(src),"عبارة «الفتحات لا تُثقَب» حُذفت");
 ok(/arcSolid/.test(src),"وسطر المعلومات يُبلّغ عن القوسية المصمتة");
});

summary();
