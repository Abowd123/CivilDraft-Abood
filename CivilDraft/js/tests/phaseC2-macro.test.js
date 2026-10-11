/* ═══ المرحلة C2 — الماكرو ═══
   تسجيلٌ من السجلّ · رفض المشوب · تشغيلٌ بخطوة تراجعٍ واحدة · إرجاع الكل
   عند الفشل · أوامر التحكم خارج السجلّ والخطط.
   node js/tests/phaseC2-macro.test.js */
import {shim,toolRig,group,ok,eq,summary} from "./harness.js";
shim();
/* localStorage وهميّ: يُثبت الحفظ الدائم والتحميل والتحصين */
const LS=new Map();
globalThis.localStorage={getItem:k=>LS.has(k)?LS.get(k):null,
 setItem:(k,v)=>{LS.set(k,String(v))},removeItem:k=>{LS.delete(k)}};

const {S,newState,ensureShape,undo,clearHistory,canUndo}=await import("../core/state.js");
const RN=await import("../core/render.js");
await import("../tools/draw.js");
await import("../tools/modify.js");
await import("../tools/macros.js");
const R=await import("../tools/registry.js");
const J=await import("../core/journal.js");
const M=await import("../core/macros.js");
const MR=await import("../ai/macrorun.js");
const PL=await import("../ai/plan.js");
const rig=toolRig(R,{invalidate:()=>RN.invalidate()});
const reset=()=>{newState(); ensureShape(); clearHistory(); RN.invalidate();
 rig.pick([]); rig.clear(); if(R.active())R.cancel(true);
 J.jrClear(); M.recReset(); M.MAC.list=[]; M.MAC.loaded=1; LS.clear()};
/* يرسم جداراً بأداة حقيقية فيدخل السجلّ كما يدخل عند المستخدم */
const wall=(a,b)=>{R.begin("wall"); R.feedText(a); R.feedText(b); R.cancel(true)};
const rec=(name,fn)=>{ok(M.recStart().ok,"بدأ التسجيل"); fn(); return M.recStop(name)};
const tick=()=>new Promise(r=>setTimeout(r,0));

group("السجلّ: العلامات والاستبعاد",()=>{
 reset();
 J.jrAdd("wall"); const m=J.jrMark(); J.jrAdd("1,1"); J.jrAdd("play x"); J.jrAdd("rec");
 const s=J.jrSince(m);
 eq(s.lines.join("|"),"1,1","أوامر التحكم لا تدخل السجلّ");
 eq(s.lost,0,"المقطع سليم");
 J.jrClear();
 ok(J.jrSince(m).lost,"مسح السجلّ يُضيّع المقطع — يُقال لا يُخمَّن");
 const m2=J.jrMark(); J.jrTaint("سحب مباشر"); J.jrTaint("سحب مباشر");
 eq(J.jrSince(m2).taint.length,2,"الشائبة المدموجة تُعَدّ");
});

group("تسجيلٌ ناجح وحفظٌ دائم",()=>{
 reset();
 const r=rec("جدار",()=>wall("0,0","4,0"));
 ok(r.ok,"حُفظ"); eq(r.macro.lines[0],"wall","أوّل سطر أداة");
 ok(!r.macro.lines.some(l=>/rec|macro/i.test(l)),"لا أوامر تحكم داخل الماكرو");
 ok(LS.get(M.MKEY).includes("جدار"),"كُتب في localStorage");
 M.MAC.list=[]; M.loadMacros();
 eq(M.macroCount(),1,"يعود بعد إعادة التحميل");
 ok(M.macroByName("  جدار ")&&M.macroByName("جدار"),"الاسم يُطبَّع");
 ok(!M.addMacro("جدار",["wall"]).ok,"اسمٌ مكرّر يُرفَض");
 ok(M.addMacro("جدار",["wall","0,0","1,0","esc"],{replace:1}).ok,"والاستبدال صريح");
 eq(M.macroCount(),1,"بلا تكرار");
});

group("الرفض الصريح: مشوب · فارغ · مُضاع",()=>{
 reset();
 const r=rec("س",()=>{wall("0,0","1,0"); J.jrTaint("تراجع")});
 ok(!r.ok&&r.tainted,"المشوب يُرفَض"); ok(/تراجع/.test(r.error),"ويُسمّي السبب");
 eq(M.macroCount(),0,"لم يُحفَظ شيء"); ok(!M.recActive(),"وانتهى التسجيل");
 const e=rec("ف",()=>{}); ok(!e.ok&&/فارغ/.test(e.error),"الفارغ يُرفَض");
 M.recStart(); J.jrAdd("wall"); J.jrClear();
 const l=M.recStop("ض"); ok(!l.ok&&/ضاع/.test(l.error),"مسح السجلّ أثناء التسجيل يُرفَض");
 ok(!M.recStop("x").ok,"لا إيقاف بلا تسجيل");
 M.recStart(); ok(!M.recStart().ok,"لا تسجيلان"); M.recCancel();
});

group("التشغيل: خطوة تراجع واحدة والسجلّ لا يتلوّث",()=>{
 reset();
 rec("جدارين",()=>{wall("0,0","4,0"); wall("0,0","0,3")});
 S.walls.length=0; clearHistory(); RN.invalidate();
 const before=J.JR.lines.length;
 const p=MR.playMacro(M.macroByName("جدارين"));
 ok(p.ok,"نجح"); eq(S.walls.length,2,"جداران");
 eq(J.JR.lines.length,before,"الإعادة لا تُسجَّل في السجلّ");
 undo(); eq(S.walls.length,0,"Ctrl+Z واحد يزيل الماكرو كلّه");
 ok(!canUndo(),"وخطوةٌ واحدة فقط");
});

group("الفحص المسبق والفشل يُرجِع الكل",()=>{
 reset();
 wall("0,0","1,0"); const n0=S.walls.length;
 const bad={name:"ب",lines:["wall","0,0","2,0","esc","W999"]};
 const c=MR.checkMacro(bad); ok(!c.ok&&/W999/.test(c.error),"معرَّف مُختلَق يُرفَض قبل أي كتابة");
 const r=MR.playMacro(bad); ok(!r.ok,"لا تشغيل"); eq(S.walls.length,n0,"لا كتابة");
 /* فشلٌ وقت التنفيذ: إحداثيٌّ بلا أداة فعّالة */
 const rt=MR.playMacro({name:"ت",lines:["wall","0,0","2,0","esc","9,9"]});
 ok(!rt.ok,"فشل التنفيذ"); eq(S.walls.length,n0,"أُرجع كل شيء (الجدار الأول أيضاً)");
 ok(!MR.playMacro({name:"ف",lines:[]}).ok,"الفارغ مرفوض");
});

group("الهادم يحتاج تصريحاً",()=>{
 reset();
 const m={name:"هـ",lines:["move","esc"]}, keep=globalThis.confirm;
 try{
  globalThis.confirm=()=>false;
  const r=MR.playMacro(m); ok(!r.ok&&/هادم/.test(r.error),"الرفض عند «لا» في السؤال");
  delete globalThis.confirm;
  const r2=MR.playMacro(m); ok(!r2.ok&&/هادم/.test(r2.error),"وبلا واجهة للسؤال: يُرفَض لا يمرّ سكوتاً");
  globalThis.confirm=()=>true;
  const r3=MR.playMacro(m); ok(!/هادم/.test(r3.error||""),"وعند «نعم» تُتجاوز البوّابة");
 }finally{
  if(keep===undefined)delete globalThis.confirm; else globalThis.confirm=keep;
 }
 ok(!/هادم/.test(MR.playMacro(m,{allowDestruct:1}).error||""),"والتصريح المسبق يتجاوزها");
});

group("حراسة التداخل: لا تشغيل أثناء التسجيل ولا داخل خطة",()=>{
 reset();
 rec("ن",()=>wall("0,0","1,0"));
 M.recStart();
 const r=MR.playMacro(M.macroByName("ن")); ok(!r.ok&&/التسجيل/.test(r.error),"محجوب أثناء التسجيل");
 M.recCancel();
 R.begin("wall");
 ok(!MR.playMacro(M.macroByName("ن")).ok,"محجوب والأداة جارية"); R.cancel(true);
 const p=PL.parsePlan("```plan\nplay\n```",1,10);
 ok(p.errs.length&&/داخل خطة/.test(p.errs[0]),"أمر الماكرو مرفوض داخل خطة");
 const p2=PL.parsePlan("```plan\nrec\n```",1,10);
 ok(p2.errs.length,"rec كذلك");
});

group("الأدوات: rec · play · macros · delmacro",async()=>{});
reset();
R.begin("rec"); ok(M.recActive(),"rec يبدأ");
wall("0,0","5,0");
R.begin("rec"); ok(!M.recActive(),"rec ثانيةً توقف");
ok(M.macroCount()===1,"وحُفظ باسمٍ تلقائي");
ok(rig.said(/حُفظ الماكرو/,"ok"),"يُبلَّغ");
eq(J.jrTainted(),0,"وسيط/أوامر الماكرو لا تُشوِّب السجلّ");
const nm=M.macroList()[0].name;
S.walls.length=0; clearHistory(); rig.clear();
R.begin("play",nm); await tick();
eq(S.walls.length,1,"play ينفّذ بعد انتهاء الأداة"); ok(!R.active(),"ولا أداةَ عالقة");
eq(J.jrTainted(),0,"play <اسم> لا يُشوِّب السجلّ");
ok(rig.said(/ماكرو «/,"ok"),"ويُبلَّغ");
undo(); eq(S.walls.length,0,"تراجعٌ واحد");
rig.clear(); R.begin("play","لا_وجود"); await tick();
ok(rig.said(/لا ماكرو/,"er"),"اسمٌ مجهول يُقال");
R.begin("macros"); ok(rig.said(new RegExp(nm),"in"),"القائمة");
R.begin("delmacro",nm); eq(M.macroCount(),0,"delmacro يحذف");
ok(!LS.get(M.MKEY).includes(nm),"ويُزال من التخزين");
if(R.active())R.cancel(true);
(()=>{ok(true,"أدوات الماكرو سليمة")})();

group("تحصين ما يُقرأ من التخزين",()=>{
 reset();
 LS.set(M.MKEY,JSON.stringify([
  {name:"سليم",lines:["wall","0,0"]},
  {name:"",lines:["wall"]},
  {name:"بلا_أسطر",lines:[]},
  {name:"نوع",lines:["wall",5]},
  {name:"سطرين",lines:["wall\nrect"]},
  {name:"طويل",lines:["x".repeat(500)]},
  {name:"سليم",lines:["rect"]},
  null,"نص",7]));
 M.MAC.loaded=0; M.loadMacros();
 eq(M.macroCount(),1,"يبقى السليم الوحيد بلا مكرّر");
 LS.set(M.MKEY,"{ليس json"); M.MAC.loaded=0; M.loadMacros();
 eq(M.macroCount(),0,"JSON فاسد ⇒ فارغ بلا استثناء");
 M.MAC.loaded=1;
 for(let i=0;i<M.MACRO_LIM.macros;i++)M.addMacro("م"+i,["wall"]);
 ok(!M.addMacro("زائد",["wall"]).ok,"حدّ عدد الماكروهات");
});

group("الدوالّ المساعدة: uniqueName · macroText · cleanMacro · delMacro · recLineCount · jrIgnore",()=>{
 reset();
 eq(M.uniqueName("ماكرو"),"ماكرو","الاسم الحرّ كما هو");
 M.addMacro("ماكرو",["wall"]);
 eq(M.uniqueName("ماكرو"),"ماكرو 2","المستعمل يُلحَق برقم");
 M.addMacro("ماكرو 2",["wall"]);
 eq(M.uniqueName("ماكرو"),"ماكرو 3","ثم الرقم التالي");
 eq(M.uniqueName("  "),"ماكرو 3","الاسم الفارغ يصير الافتراضيّ ثم يُرقَّم");
 const m=M.macroByName("ماكرو");
 eq(M.macroText(m),"```plan\nwall\n```","macroText سياجُ خطةٍ");
 ok(PL.planReady(PL.parsePlan(M.macroText(m),1,10)),"وتقبله البوّابة");
 eq(M.cleanMacro({name:" س  ص ",lines:[" wall "]}).name,"س ص","cleanMacro تطبّع الاسم");
 eq(M.cleanMacro({name:"س",lines:[" wall "]}).lines[0],"wall","وتقصّ السطر");
 eq(M.cleanMacro({name:"س",lines:["a"],t:-5}).t,0,"وزمنٌ سالب يصير صفراً");
 eq(M.cleanMacro({name:"س",lines:[]}),null,"فارغٌ مرفوض");
 eq(M.cleanMacro({name:"س",lines:Array(M.MACRO_LIM.lines+1).fill("a")}),null,"فوق الحدّ مرفوض");
 eq(M.cleanMacro(null),null,"وغير الكائن مرفوض");
 ok(M.delMacro("ماكرو 2"),"delMacro يحذف الموجود"); ok(!M.delMacro("ماكرو 2"),"وغير الموجود false");
 M.recStart(); eq(M.recLineCount(),0,"لا أسطر بعد");
 J.jrAdd("wall"); J.jrAdd("1,1"); eq(M.recLineCount(),2,"recLineCount تعدّ ما سُجِّل");
 M.recCancel(); eq(M.recLineCount(),0,"ولا شيء بلا تسجيل");
 J.jrIgnore("مخصّص"); J.jrClear(); J.jrAdd("مخصّص 5"); J.jrAdd("wall");
 ok(J.jrIsIgnored("مخصّص 5")&&!J.jrIsIgnored("wall"),"jrIsIgnored تقرأ الكلمة الأولى");
 eq(J.JR.lines.join("|"),"wall","والمستبعَد لا يدخل السجلّ");
});

process.exit(summary());
