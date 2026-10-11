/* ═══ إسناد طراز الأبعاد من لوحة الخصائص ═══
   الحقل `style` في FLD.dim وFLD.chain: قائمته حيّة من dsList()، و«-» =
   بلا طراز. يمرّ من مسار applyField الواحد (مفرداً وجماعياً وللذكاء
   الاصطناعي) فيرث التحقّق والتراجع الذرّي. التشغيل:
   node js/tests/dimstyleField.test.js */
import {readFileSync} from "node:fs";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {shim,group,ok,eq,summary} from "./harness.js";
shim();

const ST=await import("../core/state.js");
const {S,DEF,loadState,clearHistory,canUndo,undo,ensureShape}=ST;
const D  =await import("../core/dims.js");
const DST=await import("../core/dimstyles.js");
const B  =await import("../core/batch.js");

const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..","..");
const reset=()=>{loadState(DEF(),true); clearHistory(); ensureShape()};
const depth=()=>{let n=0; while(canUndo()){undo(); n++} return n};

group("حقل الطراز — القائمة حيّة و«-» أوّلها",()=>{
 reset();
 const f=B.fldOf("dim","style");
 ok(!!f&&f.t==="sel","الحقل موجود في الأبعاد قائمةً");
 ok(!!B.fldOf("chain","style"),"وفي السلاسل");
 eq(f.items.length,1,"بلا طُرز: بند «افتراضيّ المشروع» وحده");
 eq(f.items[0][0],"-","ورمزه «-»");
 DST.addDimstyle("DS-A","بالسهم","arrow",1,1);
 eq(f.items.length,2,"الطراز المضاف يظهر فوراً بلا إعادة تحميل");
 ok(/بالسهم/.test(f.items[1][1])&&/DS-A/.test(f.items[1][1]),
  "بوصفه ومفتاحه");
 DST.delDimstyle("DS-A");
 eq(f.items.length,1,"والمحذوف يختفي");
});

group("حقل الطراز — إسناد بُعدٍ وخلعه وتراجعٌ واحد",()=>{
 reset();
 DST.addDimstyle("DS-A","بالسهم","arrow",0,2);
 D.addDim("h",[0,0],[3456,0],1200);
 const s={k:"dim",id:S.dims[0].id};
 clearHistory();
 const r=B.applyField("dim",[s],"style","DS-A");
 eq(r.done,1,"كُتب");
 eq(S.dims[0].style,"DS-A","الطراز على البُعد");
 eq(B.readField("dim",[s],"style").value,"DS-A","وتقرؤه القراءة");
 eq(DST.styleOf(S.dims[0].style).dec,0,"وأثره الفعليّ يُحلّ");
 eq(depth(),1,"وخطوة تراجع واحدة");
 eq(S.dims[0].style,undefined,"والتراجع يزيله");
 B.applyField("dim",[s],"style","DS-A");
 clearHistory();
 const r2=B.applyField("dim",[s],"style","-");
 eq(r2.done,1,"«-» تخلع الطراز");
 ok(!("style" in S.dims[0]),"والمفتاح يُحذَف لا يُصفَّر");
 eq(B.readField("dim",[s],"style").value,"-","وتُقرأ «-»");
});

group("حقل الطراز — المجهول يُرفَض بسببه ولا يُكتب",()=>{
 reset();
 DST.addDimstyle("DS-A","أ","slash",2,1);
 D.addDim("h",[0,0],[3000,0],1200);
 const s={k:"dim",id:S.dims[0].id};
 const r=B.applyField("dim",[s],"style","DS-NOPE");
 eq(r.done,0,"لم يُكتب");
 eq(r.refused.length,1,"ورُفض باسمه");
 ok(/ليس من/.test(r.refused[0].msg),"وسببٌ يعدّ الخيارات");
 ok(!("style" in S.dims[0]),"والبُعد كما كان");
 const o=B.applyOne(s,"style","DS-NOPE");
 eq(o.ok,0,"ومسار المفرد يرفض كذلك");
});

group("حقل الطراز — تحديدٌ متعدّد: «متعدّد» ثم كتابةٌ جماعية بخطوة واحدة",()=>{
 reset();
 DST.addDimstyle("DS-A","أ","arrow",1,1);
 D.addDim("h",[0,0],[3000,0],1200);
 D.addDim("h",[0,0],[4000,0],1600);
 D.setDimStyle(S.dims[0].id,"DS-A");
 const L=S.dims.map(d=>({k:"dim",id:d.id}));
 const rd=B.readField("dim",L,"style");
 eq(rd.mixed,1,"قيمتان مختلفتان ⇒ متعدّد");
 clearHistory();
 const blank=B.applyField("dim",L,"style","",{skipBlank:1});
 eq(blank.blank,1,"الفراغ في الجماعية «لا تكتب»");
 const r=B.applyField("dim",L,"style","-",{skipBlank:1});
 eq(r.done,2,"«-» تعبر skipBlank وتخلع من الاثنين");
 ok(S.dims.every(d=>!d.style),"لا طراز على أيٍّ منهما");
 const r2=B.applyField("dim",L,"style","DS-A",{skipBlank:1});
 eq(r2.done,2,"وإسنادٌ جماعيّ");
 ok(S.dims.every(d=>d.style==="DS-A"),"كلاهما DS-A");
 eq(depth(),2,"وكل عمليةٍ خطوةٌ واحدة لا خطوتان لكل بُعد");
});

group("حقل الطراز — السلسلة",()=>{
 reset();
 DST.addDimstyle("DS-C","سلسلة","slash",3,1.5);
 D.addChain("h",[0,0],500,D.parseVals("3 2.5"),false);
 const s={k:"chain",id:S.chains[0].id};
 clearHistory();
 eq(B.applyField("chain",[s],"style","DS-C").done,1,"أُسند");
 eq(S.chains[0].style,"DS-C","على السلسلة");
 eq(DST.styleOf(S.chains[0].style).hMul,1.5,"وأثره يصل الارتفاع");
 eq(depth(),1,"وتراجعٌ واحد");
 ok(B.applyField("chain",[s],"style","DS-X").refused.length===1,
  "والمجهول مرفوض");
});

group("حقل الطراز — أثرٌ مرئيّ وعبورٌ للحفظ وطرازٌ معلَّق",()=>{
 reset();
 S.meta.dimDec=2;
 DST.addDimstyle("DS-A","أ","slash",0,1);
 D.addDim("h",[0,0],[3456,0],1200);
 const s={k:"dim",id:S.dims[0].id};
 const txt=()=>D.dimPrims(S.dims[0]).filter(p=>p.t==="text")[0].s;
 eq(txt(),"3.46","قبل: خانتان من meta");
 B.applyField("dim",[s],"style","DS-A");
 eq(txt(),"3","بعد: خانات الطراز تظهر في الرسم");
 const j=JSON.stringify(S);
 reset();
 loadState(JSON.parse(j),true);
 eq(S.dims[0].style,"DS-A","الإسناد يعبر الحفظ والفتح");
 eq(B.readField("dim",[s],"style").value,"DS-A","وتقرؤه اللوحة");
 /* طرازٌ محذوف من ملفٍّ قديم: يُقرأ «بلا طراز» لا اسماً مجهولاً في القائمة */
 S.dims[0].style="GONE";
 eq(B.readField("dim",[s],"style").value,"-","معلَّقٌ ⇒ «-»");
});

group("حقل الطراز — لوحات الخصائص تعرضه",()=>{
 const src=readFileSync(join(ROOT,"js/ui/props.js"),"utf8");
 ok(/fldRow\("dim",d,"style"\)/.test(src)
  &&(src.match(/fldRow\("dim",d,"style"\)/g)||[]).length===2,
  "لوحتا البُعد (الخطّي والدائري/الزاوي)");
 ok(/fldRow\("chain",c,"style"\)/.test(src),"ولوحة السلسلة");
});

process.exit(summary()?1:0);
