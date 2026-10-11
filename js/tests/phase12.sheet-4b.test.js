/* ═══ بوابة المرحلة 4B — واجهة الأوراق والمنافذ ═══
   تغطي:
   ١ · addsheet (بلا وسيط وبوسيط) تُضيف وتُفعّل الورقة
   ٢ · renamesheet/delsheet/nextsheet/prevsheet تدير القائمة ذرّياً
   ٣ · vport: نقرة + نقرة تُنشئ منفذاً بمقياس موحّد داخل الورقة
   ٤ · vport: نطاق دون 1 مم يُرفَض برسالة ولا يُنشئ منفذاً */
import "./harness.js";
import {S,DEF,loadState} from "../core/state.js";
import {begin,T as TOOL,feedPoint,cancel,OPT,setOpt} from "../tools/registry.js";
import * as SH from "../core/sheet.js";
import "../tools/sheet.js";

let PASS=0, FAIL=0;
const chk=(name,fn)=>{
 try{fn(); PASS++; console.log("  ✓ "+name)}
 catch(e){FAIL++; console.error("  ✗ "+name+"\n    "+((e&&e.message)||e))}
};
const ok=(c,m)=>{if(!c)throw new Error(m||"شرطٌ خاطئ")};
const eq=(a,b,m)=>{
 const A=JSON.stringify(a), B=JSON.stringify(b);
 if(A!==B)throw new Error((m||"")+"\nمتوقّع: "+B+"\nفعلي: "+A);
};

console.log("═ phase12.sheet-4b.test.js — بوابة 4B ═");

/* ═══ الضيافة: خطّافات السجل وهبط الواجهة وبيئة window ═══ */
let reps=[];
const H0={draw:()=>{},rep:(ls,m)=>{reps.push({ls,m})},
 prompt:()=>{},refresh:()=>{}, hit:()=>null, sel:()=>[],
 setSel:()=>{}, del:()=>null};
Object.assign(Hosther());
global.window={confirm:()=>true, prompt:()=>"اسمي"};

function Hosther(){return ({});}
/* ضبط خطّافات السجل */
import {H} from "../tools/registry.js";
Object.assign(H,H0);

const reset=()=>{
 if(TOOL&&TOOL.def)cancel(true);
 loadState(DEF(),true);
 reps=[];
};
reset();

/* ── ١ · إضافة ورقة ── */
chk("addsheet بلا وسيط: ورقة واحدة نشطة",()=>{
 begin("addsheet");
 ok(Array.isArray(S.sheets)&&S.sheets.length===1,"لم تُضَف ورقة");
 ok(S.activeSheet===S.sheets[0].id,"النشطة لا تطابق الأولى");
});
chk("addsheet بوسيط: ثانيةٌ باسمٍ صريحٍ ونشطة",()=>{
 begin("addsheet","الموقف");
 eq(S.sheets.length,2);
 eq(S.sheets[1].name,"الموقف");
 eq(S.activeSheet,S.sheets[1].id);
});

/* ── ٢ · التنقل والتسمية والحذف ── */
chk("prevsheet/nextsheet تتنقلان دائريّاً",()=>{
 begin("prevsheet"); eq(S.activeSheet,S.sheets[0].id);
 begin("nextsheet"); eq(S.activeSheet,S.sheets[1].id);
 begin("nextsheet"); eq(S.activeSheet,S.sheets[0].id);
});
chk("renamesheet بوسيط يعيد التسمية",()=>{
 begin("renamesheet","معدَّل");
 const sh=S.sheets.find(x=>x.id===S.activeSheet);
 eq(sh.name,"معدَّل");
});
chk("delsheet يحذف النشطة ويُسقط على الباقية",()=>{
 begin("delsheet");
 eq(S.sheets.length,1);
 ok(S.activeSheet===S.sheets[0].id,"لم تُسقِط النشطة");
});

/* ── ٣ · أداة المنفذ ── */
chk("vport: نقرة+نقرة تنشئ منفذاً بمقياس موحّد",()=>{
 begin("vport");
 feedPoint([0,0]);
 feedPoint([1000,500]);
 const sh=S.sheets.find(x=>x.id===S.activeSheet);
 ok(sh&&Array.isArray(sh.viewports)&&sh.viewports.length===1,
  "لم يُنشَأ المنفذ");
 const vp=sh.viewports[0];
 eq(vp.modelRect,{x0:0,y0:0,x1:1000,y1:500});
 const mw=vp.modelRect.x1-vp.modelRect.x0;
 const mh=vp.modelRect.y1-vp.modelRect.y0;
 const pw=vp.paperRect.x1-vp.paperRect.x0;
 const ph=vp.paperRect.y1-vp.paperRect.y0;
 const kx=pw/mw, ky=ph/mh;
 ok(Math.abs(kx-ky)<0.001,"المقياس غير موحّد — سيتشوّه المخطط");
 /* داخل حدود الورقة الورقية مع هامش */
 const pp=SH.sheetPapers(sh);
 ok(vp.paperRect.x0>=0&&vp.paperRect.y0>=0
   &&vp.paperRect.x1<=pp.w&&vp.paperRect.y1<=pp.h,
  "المنفذ خارج حدود ورقة الورق");
});
chk("vport: نطاق دون 1 مم يُرفَض بلا إنشاء",()=>{
 begin("vport"); reps=[];
 feedPoint([0,0]); feedPoint([0.5,0.5]);
 const sh=S.sheets.find(x=>x.id===S.activeSheet);
 eq(sh.viewports.length,1,"أُنشئ منفذٌ من نطاقٍ باطل");
 ok(reps.some(r=>r.ls==="er"),"لا رسالة رفضٍ للنطاق الصغير");
 if(TOOL.def)cancel(true);
});

chk("vport بمقياسٍ قياسيٍّ مفروض: 1:100",()=>{
 reset();
 setOpt("vport","scale","100");
 begin("addsheet");
 begin("vport");
 feedPoint([0,0]);
 feedPoint([10000,5000]);
 setOpt("vport","scale","0");          /* إعادة الوضع التلقائي */
 const sh=S.sheets.find(x=>x.id===S.activeSheet);
 ok(sh&&Array.isArray(sh.viewports)&&sh.viewports.length===1,
  "لم يُنشَأ المنفذ");
 const vp=sh.viewports[0];
 const pw=vp.paperRect.x1-vp.paperRect.x0;
 const ph=vp.paperRect.y1-vp.paperRect.y0;
 ok(Math.abs(pw-100)<0.5&&Math.abs(ph-50)<0.5,
  `خرج ∗${pw}×${ph}∗ بدل 100×50 مم`);
});

console.log(`\n${PASS} نجح · ${FAIL} فشل —`);
if(FAIL)process.exitCode=1;
