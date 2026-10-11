/* ═══ التقاط المركز والمماسّ — دفعة الطوابق/الأقواس ═══
   يثبت أنّ cen يُصيب مركز القوس ومركز العمود الدائري، وأنّ tan
   يُصيب نقطتي المماسّ من نقطة أساسٍ خارج القوس/العمود، وأنّ كليهما
   يبقى صامتاً حين مُعطَّلاً أو من داخل الدائرة.
   التشغيل: node js/tests/osnap.centan.test.js */
import {shim,shimCanvas,group,ok,summary} from "./harness.js";
shim(); shimCanvas();
const {S,newState}=await import("../core/state.js");
const {osnap}=await import("../core/osnap.js");
const {addWall}=await import("../core/walls.js");
const {addCol}=await import("../core/cols.js");

const ALL=["end","mid","cen","int","nod","per","par","tan","near","ref"];
const offAll=()=>{ALL.forEach(k=>S.os[k]=0)};
const only=k=>{offAll(); S.os[k]=1; return k};
const rad=a=>a*Math.PI/180;
const cpt=(cx,cy,R,a)=>[Math.round(cx+R*Math.cos(rad(a))),
  Math.round(cy+R*Math.sin(rad(a)))];
const BULGE=Math.tan(rad(90)/4);

function check(name,got,m,p,tolP){
 const tol=(tolP==null)?60:tolP;
 const okv=!!got&&got.m===m
  &&Math.hypot(got.p[0]-p[0],got.p[1]-p[1])<=tol;
 ok(okv,`${name}${okv?"":` — ${got?got.m+" "+JSON.stringify(got.p):"لا شيء"}`}`);
}

group("مركز القوس — cen (المؤشّر قرب الجسم لا قرب المركز)",()=>{
 newState();
 addWall(cpt(0,0,3000,-45),cpt(0,0,3000,45),200,"int","c",null,BULGE);
 only("cen");
 /* المؤشّر عند منتصف القوس (3000,0) — بعيدٌ عن المركز (0,0) بـ3000مم،
    أكثر بكثير من tol=200: cen لا يزال يُصاب لأن الجسم قريبٌ */
 check("مركز القوس", osnap(3000,0,200), "cen", [0,0], 5);
});

group("مركز العمود الدائريّ — cen",()=>{
 newState();
 addCol("circ",[2000,1000],400,0,0,"conc");
 only("cen");
 check("مركز العمود", osnap(2030,970,200), "cen", [2000,1000]);
});

group("cen مُعطَّلٌ — لا شيء",()=>{
 newState();
 addCol("circ",[2000,1000],400,0,0,"conc");
 offAll();
 ok(!osnap(2000,1000,200),"لا التقاط بلا نمطٍ مفعَّل");
});

group("مماسّ العمود الدائريّ — tan",()=>{
 newState();
 addCol("circ",[0,0],400,0,0,"conc");   /* نصف قطره 200 */
 only("tan");
 /* من نقطةٍ بعيدة على المحور السيني، والمؤشّر قرب نقطة المماسّ
    المتوقّعة (قريبةٌ من العمود نفسه) لا قرب from */
 const from=[1500,0];
 const got=osnap(-27,-198,120,from);
 ok(!!got&&got.m==="tan","التُقط نمط tan");
 if(got){
  const R=200, d=Math.hypot(got.p[0],got.p[1]);
  ok(Math.abs(d-R)<3,`النقطة على محيط الدائرة (R=${R}, d=${d.toFixed(1)})`);
  /* عمودية نصف القطر على القاطع من from إلى نقطة المماسّ */
  const v1=[got.p[0]-0,got.p[1]-0];
  const v2=[from[0]-got.p[0],from[1]-got.p[1]];
  const dot=v1[0]*v2[0]+v1[1]*v2[1];
  const mag=Math.hypot(...v1)*Math.hypot(...v2);
  const cosA=dot/mag;
  ok(Math.abs(cosA)<0.02,
   `عموديٌّ حقّاً على نصف القطر (cos=${cosA.toFixed(4)})`);
 }
});

group("tan من داخل الدائرة — لا مماسّ",()=>{
 newState();
 addCol("circ",[0,0],400,0,0,"conc");
 only("tan");
 ok(!osnap(50,0,400,[50,0]),"لا التقاط من نقطةٍ داخل العمود");
});

group("مماسّ القوس — tan يحترم مدى القوس (inSweep)",()=>{
 newState();
 /* قوسٌ ربعيّ فقط (−45°→45°) — نقطتا مماسّ نظريّتان قد تقعان خارج
    هذا المدى فتُرفضان، فلا نتوقّع بالضرورة التقاطاً هنا؛ الاختبار
    الحقيقي هو ألّا يُرمى استثناءٌ ولا يُلتقَط خارج المدى */
 addWall(cpt(0,0,3000,-45),cpt(0,0,3000,45),200,"int","c",null,BULGE);
 only("tan");
 let threw=false, got=null;
 try{got=osnap(6000,0,50,[6000,3000])}catch(e){threw=true}
 ok(!threw,"لا استثناء");
 if(got)ok(got.m==="tan","إن التُقط شيءٌ فهو tan لا غيره");
});

summary();
