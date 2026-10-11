/* ═══ B1 — الدرج L/U: رحلات + بسطة ═══
   الأصل المخزَّن type + flights=[{a,b,n}]. يُثبت: الإنشاء والهندسة
   والبسطة والفحص والأوّليات والهجرة من a,b,n والتحديد والأداتين.
   التشغيل: node js/tests/stairs-lu.test.js */
import {shim,toolRig,group,ok,eq,near,throws,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,snapshot,loadState}=
 await import("../core/state.js");
const {addStair,addStairL,addStairU,stGeoms,stPolys,stOutline,stType,
       landingPoly,stCheck,stPrims,stAt,stBBox,ST_TYPES}=
 await import("../core/stairs.js");
const EN=await import("../core/ents.js");
const RN=await import("../core/render.js");
const {boq}=await import("../core/boq.js");
await import("../tools/parts.js");
const R=await import("../tools/registry.js");
const rig=toolRig(R,{hit:(x,y)=>EN.hitTest(x,y,150),
 invalidate:()=>RN.invalidate()});
const reset=()=>{newState(); ensureShape(); RN.invalidate();
 rig.pick([]); rig.clear(); if(R.active())R.cancel(true)};

group("أنواع الدرج",()=>{
 ok(ST_TYPES.length===3&&ST_TYPES.includes("L")&&ST_TYPES.includes("U"),
  "ثلاثة أنواع: straight وL وU");
 eq(stType({type:"U"}),"U","U تُقرأ");
 eq(stType({type:"x"}),"straight","والمجهول مستقيم");
 eq(stType(null),"straight","وغياب الدرج مستقيم");
});

group("المستقيم رحلةٌ واحدة",()=>{
 reset();
 const s=addStair([0,0],[4200,0],1200,17,{h:3000});
 eq(s.type,"straight","النوع");
 eq(s.flights.length,1,"رحلة واحدة");
 eq(s.flights[0].n,17,"عدد قوائمها");
 ok(!("a" in s)&&!("b" in s)&&!("n" in s),"لا a,b,n على الدرج");
 ok(!landingPoly(s),"بلا بسطة");
 eq(stPolys(s).length,1,"مضلّعٌ واحد");
});

group("درج L — رحلتان وبسطة عند المنعطف",()=>{
 reset();
 const s=addStairL([0,0],[3000,0],[3000,3000],1000,6,6,{h:2400});
 eq(s.type,"L","النوع L");
 eq(stGeoms(s).length,2,"رحلتان");
 deep_(s.flights[1].a,s.flights[0].b,"بداية الرحلة 2 = نهاية الرحلة 1");
 const lp=landingPoly(s);
 ok(lp&&lp.length===4,"بسطةٌ رباعية");
 eq(stPolys(s).length,3,"رحلتان + بسطة");
 const c=stCheck(s);
 eq(c.n,12,"مجموع القوائم");
 near(c.rise,200,0.01,"القائمة = الارتفاع ÷ المجموع");
 ok(stAt(3000,0)===s,"التحديد عند البسطة");
 ok(stAt(1500,0)===s,"والتحديد على الرحلة 1");
 ok(stAt(3000,1500)===s,"والتحديد على الرحلة 2");
 ok(!stAt(-2000,-2000),"وخارجه لا شيء");
 const o=stOutline(s);
 ok(o&&o.length>=4,"المحيط الخارجي");
 const bb=stBBox(s);
 ok(bb.x1>=3500&&bb.y1>=3000,"الصندوق يشمل الرحلتين والبسطة");
 const pr=stPrims(s);
 ok(pr.some(p=>p.t==="poly"&&p.pts.length===4),"أوّليّات فيها مضلّع البسطة");
 ok(pr.filter(p=>p.t==="text").length===1,"بطاقةٌ واحدة");
 ok(/\(L\)/.test(pr.find(p=>p.t==="text").s),"والبطاقة تذكر النوع");
});

group("درج U — رحلتان متعاكستان وبسطة تصل نهايتيهما",()=>{
 reset();
 const s=addStairU([0,0],[1400,0],[1400,1200],[0,1200],1000,6,6,{h:2160});
 eq(s.type,"U","النوع U");
 eq(stGeoms(s).length,2,"رحلتان");
 const lp=landingPoly(s);
 ok(lp&&lp.length===4,"بسطةٌ رباعية");
 const xs=lp.map(p=>p[0]), ys=lp.map(p=>p[1]);
 ok(Math.min(...xs)===1400&&Math.max(...xs)>1400,"تبدأ من نهاية الرحلتين وتمتدّ بعدها");
 ok(Math.min(...ys)<=-500&&Math.max(...ys)>=1700,"وتغطّي عرضَي الرحلتين");
 ok(stAt(1900,600)===s,"التحديد داخل البسطة");
 ok(stAt(700,1200)===s,"والتحديد على الرحلة 2");
 ok(stCheck(s).ok===1,"ومقاييسه سليمة");
 /* رحلتان متداخلتان: البُعد بين المحورين أقلّ من العرض */
 const t=addStairU([0,0],[3000,0],[3000,500],[0,500],1000,6,6,{h:2400});
 const c=stCheck(t);
 ok(c.msgs.some(m=>/متداخلتان/.test(m)),"التداخل يُبلَّغ");
});

group("الأخطاء",()=>{
 reset();
 throws(()=>addStairL([0,0],[300,0],[300,3000],1000,6,6),/أقصر/,
  "رحلةٌ قصيرة في L تُرفَض");
 throws(()=>addStairU([0,0],[3000,0],[3000,500],[2800,500],1000,6,6),/أقصر/,
  "رحلةٌ قصيرة في U تُرفَض");
 throws(()=>addStairL([0,0],[3000,0],null,1000,6,6),/.*/,
  "نقطةٌ ناقصة تُرفَض");
 eq(S.stairs.length,0,"ولا يُنشَأ شيءٌ عند الرفض");
});

group("الهجرة من a,b,n",()=>{
 reset(); S.meta.level=0;
 S.stairs.push({id:"S1",a:[0,0],b:[4000,0],w:1100,n:15,up:"up",cut:0.5});
 ensureShape();
 const s=S.stairs[0];
 eq(s.type,"straight","نوعٌ مستقيم");
 eq(s.flights.length,1,"رحلة واحدة");
 deep_(s.flights[0].b,[4000,0],"نهاية الرحلة محفوظة");
 eq(s.flights[0].n,15,"وعدد القوائم");
 ok(!("a" in s)&&!("b" in s)&&!("n" in s),"حُذفت الحقول القديمة");
 near(s.cut,0.5,1e-9,"وخطّ القطع محفوظ");
 ensureShape();
 eq(S.stairs[0].flights.length,1,"idempotent");
 /* نوعٌ L بلا رحلتين يعود مستقيماً بدل أن يتعطّل */
 reset();
 S.stairs.push({id:"S2",type:"L",w:1000,up:"up",
  flights:[{a:[0,0],b:[3000,0],n:8}]});
 ensureShape();
 eq(S.stairs[0].type,"straight","L برحلةٍ واحدة يعود مستقيماً");
 /* رحلةٌ فاسدة تُسقِط الدرج بلا تعطّل */
 reset();
 S.stairs.push({id:"S3",type:"U",w:1000,
  flights:[{a:[0,0],b:[3000,0],n:8},{a:"x",b:[0,1200],n:8}]});
 ensureShape();
 eq(S.stairs.length,0,"إحداثيٌّ فاسد يُسقِط الدرج");
});

group("الحفظ والاسترجاع",()=>{
 reset();
 addStairL([0,0],[3000,0],[3000,3000],1000,6,6,{h:2400});
 addStairU([0,5000],[3000,5000],[3000,6200],[0,6200],1000,6,6,{h:2400});
 const snap=JSON.parse(snapshot());
 loadState(snap);
 eq(S.stairs.length,2,"درجان بعد التحميل");
 eq(S.stairs[0].type,"L","L محفوظ");
 eq(S.stairs[1].type,"U","U محفوظ");
 eq(S.stairs[0].flights.length,2,"رحلتا L");
 ok(!!S.stairs[1].landing,"وبسطةُ U");
});

group("BOQ يجمع رحلات الدرج",()=>{
 reset();
 addStairL([0,0],[3000,0],[3000,3000],1000,6,6,{h:2400});
 const B=boq();
 eq(B.stairs.n,1,"درجٌ واحد");
 const r=B.stairs.rows[0];
 eq(r.n,12,"مجموع قوائم الرحلتين");
 near(r.len,6000,2,"وطولٌ كلّيٌّ للرحلتين");
});

group("المقابض والتحويل",()=>{
 reset();
 const s=addStairL([0,0],[3000,0],[3000,3000],1000,6,6,{h:2400});
 const ks=EN.gripsOf({k:"stair",id:s.id}).map(g=>g.k);
 ok(ks.includes("a")&&ks.includes("b")&&ks.includes("b1"),
  "مقابض a وb وb1 في L");
 ok(!ks.includes("a1"),"ولا مقبض لبداية الرحلة 2 في L");
});

group("أداتا الرسم",()=>{
 reset(); rig.defs("stairl");
 R.begin("stairl");
 rig.at(0,0); rig.at(3000,0); rig.at(3000,3000);
 eq(S.stairs.length,1,"ثلاث نقرات = درج L");
 eq(S.stairs[0].type,"L","بنوع L");
 ok(R.active(),"والأداةُ تُعيد نفسها");
 rig.esc();
 reset(); rig.defs("stairu");
 R.begin("stairu");
 rig.at(0,0); rig.at(1400,0); rig.at(1400,1200); rig.at(0,1200);
 eq(S.stairs.length,1,"أربع نقرات = درج U");
 eq(S.stairs[0].type,"U","بنوع U");
 rig.esc();
});

function deep_(a,b,m){ok(JSON.stringify(a)===JSON.stringify(b),m)}
process.exit(summary()?1:0);
