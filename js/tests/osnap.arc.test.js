/* ═══ التقاط الأقواس والموازي والقرب — ورشة W2 ═══
   يثبت أنّ التقاطع يحلّ قوس×خط وقوس×قوس، وأنّ الموازي يُلتقَط من
   نقطة أساس، وأنّ القرب يغطي العمودين المستطيل والدائري، وأنّ
   تقاطع المستقيمين لم يندثر بعد التعديل.
   التشغيل: node js/tests/osnap.arc.test.js */
import {shim,shimCanvas,group,ok,summary} from "./harness.js";
shim(); shimCanvas();
const {S,newState}=await import("../core/state.js");
const {osnap}=await import("../core/osnap.js");
const {addWall}=await import("../core/walls.js");
const {addCol}=await import("../core/cols.js");

const ALL=["end","mid","int","nod","per","par","near","ref","cen","tan"];
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

group("التقاط الأقواس والموازي والقرب — ورشة W2",()=>{

 /* 1 — تقاطع قوس × خط: قوس ربعيٌّ مركزه الأصل يقطع المحور الأفقي */
 newState();
 addWall([0,0],[6000,0],200,"int","c");
 addWall(cpt(0,0,3000,-45),cpt(0,0,3000,45),200,"int","c",null,BULGE);
 only("int");
 check("قوس × خط", osnap(3000,0,100), "int", [3000,0]);

 /* 2 — تقاطع قوسين حقيقي (تقاطعٌ صريح لا تماسّ) */
 newState();
 addWall(cpt(0,0,3000,-45),cpt(0,0,3000,45),200,"int","c",null,BULGE);
 addWall(cpt(3000,3000,3000,-135),cpt(3000,3000,3000,-45),
  200,"int","c",null,BULGE);
 only("int");
 check("قوس × قوس", osnap(3000,5,100), "int", [3000,0]);

 /* 3 — الموازي من نقطة أساس: المؤشّر يعبر شعاعاً يوازي الجدار */
 newState();
 addWall([0,0],[3000,0],200,"int","c");
 only("par");
 check("موازٍ", osnap(1500,120,200,[500,100]), "par", [1500,100], 5);

 /* 4 — قرب عمود مستطيل على حدّه */
 newState();
 addCol("rect",[1000,1000],400,400,0,"conc");
 only("near");
 check("قرب عمود مستطيل", osnap(1300,1000,300), "near", [1200,1000], 5);

 /* 5 — قرب عمود دائري على دائرته الحقيقية لا مضلّعه */
 newState();
 addCol("circ",[1000,1000],400,0,0,"conc");
 only("near");
 check("قرب عمود دائري", osnap(1300,1000,300), "near", [1200,1000], 5);

 /* 6 — تقاطع المستقيمين لم يندثر بعد التعديل */
 newState();
 addWall([0,0],[6000,0],200,"int","c");
 addWall([3000,-3000],[3000,3000],200,"int","c");
 only("int");
 check("خط × خط", osnap(3000,0,100), "int", [3000,0]);
});

const r=summary();
process.exit(r?1:0);
