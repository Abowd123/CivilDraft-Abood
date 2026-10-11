/* ═══ أنماط التهشير — حيويةُ الزاوية والتوافقُ والمصنفُ المحميّ ═══
   التركيز: تغييرُ النمط يسري في hatchOf بلا كاش، والمصمت لا يلتفت
   لزاويةٍ، وsc الصريح يغلب في التباعد وحده. التشغيل:
   node js/tests/hatches.test.js */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..","..");
const src=r=>readFileSync(join(ROOT,r),"utf8")
 .replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");

const ST=await import("../core/state.js");
const {S,DEF,loadState,clearHistory,snapshot,canUndo,undo,editFailed,ensureShape}=ST;
const HT=await import("../core/hatches.js");
const SY=await import("../io/style.js");

const reset=()=>{loadState(DEF(),true); clearHistory(); ensureShape()};

group("hatches — المصنع والرجوع",()=>{
 reset();
 eq(S.hatches.ANSI31.ang,45,"المصنع ANSI31 بزاوية 45");
 eq(S.hatches.SOLID.solid,1,"وSOLID مصمت");
 eq(HT.hatchDef("MB-X").ang,45,"والمجهول يرجع للنمط العام");
 eq(HT.hatchDef("SOLID").solid,1,"والرجوعيّ SOLID مصمت");
 const ho=SY.hatchOf({t:"hatch",L:"A-WALL-PATT",pat:"ANSI31",loops:[]},
  "svg",SY.ctxOf("svg"));
 eq(ho.sets[0][0],45,"الزاوية الافتراضية 45 كما كانت");
});

group("hatches — أدوات الوصول: الاسم واللائحة والوصف",()=>{
 reset();
 ok(HT.patNameOk("MB-BRICK"),"اسمٌ لاتينيٌّ سليم مقبول");
 eq(HT.patNameOk("١خطأ"),false,"واسمٌ غير لاتينيٍّ مرفوض");
 eq(Object.keys(HT.defHatches()).length,2,"المصنع نمطان: ANSI31 وSOLID");
 eq(HT.patLabel("ANSI31"),"تهشير عام","الوصف من المصنع");
 eq(HT.patLabel("MB-NONE"),"تهشير عام","والمجهول يرجع لوصف النمط العام");
 HT.addHatch("MB-BRICK2","طوب مزخرف",15,4,0);
 eq(HT.patLabel("MB-BRICK2"),"طوب مزخرف","والوصف المخصَّص بعد الإضافة");
 const base=Object.keys(HT.defHatches()).length;
 const list=HT.patList();
 eq(list.length,base+1,"القائمة تضمّ المصنع والمخصَّص");
 ok(list.some(x=>x.k==="MB-BRICK2"&&x.custom&&x.ang===15),
  "والمخصَّص يحمل ang وعلامة custom");
 ok(list.some(x=>x.k==="ANSI31"&&!x.custom),
  "والمصنعيّ بلا علامة custom");
});

group("hatches — الزاوية والتباعد يصلان hatchOf حيَّين",()=>{
 reset();
 eq(HT.addHatch("MB-BRICK","طوب",0,8,0),"MB-BRICK","أُضيف");
 const raw={t:"hatch",L:"A-WALL-PATT",pat:"MB-BRICK",loops:[]};
 const ho=SY.hatchOf(raw,"svg",SY.ctxOf("svg",{k:1}));
 eq(ho.sets[0][0],0,"الزاوية من النمط 0");
 eq(ho.sets[0][1],8,"والتباعد من النمط 8 (بلا sc صريح)");
 eq(ho.solid,0,"وليس مصمتاً");
 const ho2=SY.hatchOf(Object.assign({},raw,{sc:99}),"svg",SY.ctxOf("svg"));
 eq(ho2.sets[0][1],99,"sc الصريح يغلب في التباعد");
 eq(ho2.sets[0][0],0,"والزاوية تبقى من النمط");
});

group("hatches — المصمت متصالِبٌ مهما كانت زاوية نمطه",()=>{
 reset();
 HT.addHatch("MB-SOLID2","مصمت بزاوية",30,5,1);
 const ho=SY.hatchOf({t:"hatch",L:"A-WALL-PATT",pat:"MB-SOLID2",loops:[]},
  "svg",SY.ctxOf("svg"));
 eq(ho.solid,1,"مصمت");
 eq(ho.sets[0][0],45,"والمتصالب 45");
 eq(ho.sets[1][0],135,"و135");
});

group("hatches — تراجعٌ يزيل الإضافة ويعيد العدّ",()=>{
 reset();
 const n0=Object.keys(S.hatches).length;
 HT.addHatch("MB-UNDO","تراجع",30,6,0);
 ok(canUndo(),"خطوة التاريخ مضافة");
 undo();
 eq(HT.patOk("MB-UNDO"),null,"تراجع واحد يزيل النمط");
 eq(Object.keys(S.hatches).length,n0,"والعد يعود كما كان");
});

group("hatches — حفظٌ وفتح",()=>{
 reset();
 HT.addHatch("MB-SAVE","محفوظ",60,7,0);
 const j=snapshot();
 reset();
 eq(HT.patOk("MB-SAVE"),null,"قبل الفتح");
 loadState(JSON.parse(j),true);
 eq(HT.hatchDef("MB-SAVE").ang,60,"وبعد الفتح زاويته 60");
 eq(HT.hatchDef("MB-SAVE").mm,7,"وتباعده 7");
});

group("hatches — المصنع محميّ والمدخل الفاسد لا يكتب",()=>{
 reset();
 eq(HT.addHatch("ANSI31","x",1,5,0),false,"لا يُظلَّل المصنع");
 eq(HT.delHatch("ANSI31"),false,"ولا يُحذَف");
 eq(HT.delHatch("MB-NONE"),false,"وغيرُ الموجود يُرفَض");
 eq(HT.addHatch("اسم عربي","x",45,5,0),undefined,"اسم غير لاتيني مرفوض");
 ok(editFailed(),"وعلّم الفشل");
 eq(HT.patOk("اسم عربي"),null,"ولم يُكتب");
 const n0=Object.keys(S.hatches).length;
 eq(HT.addHatch("MB-BAD","x",45,-1,0),undefined,"وتباعدٌ سالب مرفوض");
 eq(Object.keys(S.hatches).length,n0,"والعدّ لم يتغيّر");
 /* الحدّ LIM.hatches.max=100 على المخصصة وحدها (كما في dimstyles) —
    المصنعيّان (ANSI31/SOLID) لا يُحسَبان منه فيبلغ المجموع 102 */
 HT.resetHatches();
 for(let i=0;i<100;i++)HT.addHatch("MB-F"+i,"ت",30,5,0);
 eq(Object.keys(S.hatches).length,102,
  "100 مخصصة + المصنعان = 102");
 eq(HT.addHatch("MB-FNEXT","ت",30,5,0),undefined,
  "والنمط رقم 101 المخصَّص فوق السقف مرفوض");
 ok(editFailed(),"وعلّم الفشل");
});

group("hatches — حرّاسٌ مصدرية",()=>{
 const st=src("js/io/style.js");
 ok(/hatchDef\(\(g&&g\.pat\)\|\|"ANSI31"\)/.test(st),
  "style.hatchOf يقرأ النمط من البيانات الحيّة");
 ok(!/\[\[45,sp\]\]\s*:\s*\[\[45,sp\]\]/.test(st.replace(/\s+/g,"")),
  "ولا أثر للزاوية الحرفية 45 في مسار غير المصمت");
 const tm=src("js/core/state.js");
 ok(tm.indexOf("HT.normHatches()")<tm.indexOf("LY.normLays()"),
  "ensureShape تُطبِّع الأنماط قبل الطبقات");
});

process.exit(summary()?1:0);
