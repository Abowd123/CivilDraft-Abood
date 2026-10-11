/* ═══ طُرز الأبعاد — حقل تعديل (لا وسيط إنشاء) ═══
   غياب الطراز يبقي meta حرفياً، والمُعيِّن يفرض tick/dec/hMul
   ويرفع الخطّ معه. التشغيل: node js/tests/dimstyles.test.js */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();

const ST=await import("../core/state.js");
const {S,DEF,loadState,clearHistory,snapshot,canUndo,undo,editFailed,ensureShape}=ST;
const D =await import("../core/dims.js");
const DST=await import("../core/dimstyles.js");

const reset=()=>{loadState(DEF(),true); clearHistory(); ensureShape()};

group("dimstyles — بلا طراز: سلوك meta القديم حرفياً",()=>{
 reset();
 S.meta.dimTick="slash"; S.meta.dimDec=2;
 D.addDim("h",[0,0],[3000,0],1200);
 const st=DST.styleOf(S.dims[0].style);
 eq(st.tick,"slash","العلامة من meta");
 eq(st.dec,2,"والخانات من meta");
 eq(D.dimText(S.dims[0],st.dec),"3.00","والنص كما كان");
});

group("dimstyles — المُعيِّن يفرض الهيئة ويُتراجَع عنه كخطوة واحدة",()=>{
 reset();
 S.meta.dimDec=2;
 DST.addDimstyle("DS-AR","بالسهم","arrow",1,1.8);
 D.addDim("h",[0,0],[1234,0],1200);
 const id=S.dims[0].id;
 D.setDimStyle(id,"DS-AR");
 const st=DST.styleOf(S.dims[0].style);
 eq(st.tick,"arrow","السهم يُفرَض");
 eq(st.dec,1,"وخانةٌ واحدة");
 eq(st.hMul,1.8,"وارتفاعٌ مضاعف");
 eq(D.dimText(S.dims[0],st.dec),"1.2","وفرض الخانة يعيد 1.2");
 ok(canUndo(),"والمُعيِّن دفع خطوة تاريخ");
 undo();
 eq(S.dims[0].style,undefined,"وتراجعٌ واحد يزيل الطراز");
});

group("dimstyles — السلسلة والصيانة ورفضُ المجهول",()=>{
 reset();
 DST.addDimstyle("DS-C","سلسلة","slash",2,1.5);
 const vs=D.parseVals("3 2.5");
 D.addChain("h",[0,0],500,vs,false);
 D.setChainStyle(S.chains[0].id,"DS-C");
 eq(DST.styleOf(S.chains[0].style).hMul,1.5,"الارتفاع يصل السلسلة");
 D.setChainStyle(S.chains[0].id,"لا_يوجد");
 eq(S.chains[0].style,"DS-C","طرازُ مجهول لا يُعتمَد");
 ok(editFailed(),"وسببٌ معلَم بالفشل");
});

group("dimstyles — حذفٌ مرفوض ما دام مستعملاً",()=>{
 reset();
 DST.addDimstyle("DS-X","مستعمل","slash",2,1);
 D.addDim("h",[0,0],[3000,0],500);
 D.setDimStyle(S.dims[0].id,"DS-X");
 eq(DST.delDimstyle("DS-X"),undefined,"الحذف مرفوض");
 ok(editFailed(),"وعلّم الفشل");
 eq(DST.dsOk("DS-X"),"DS-X","والطراز باقٍ");
 D.setDimStyle(S.dims[0].id,"");
 eq(DST.delDimstyle("DS-X"),true,"وبعد الفكّ يُحذف");
});

group("dimstyles — حفظٌ وفتح",()=>{
 reset();
 DST.addDimstyle("DS-S","ثابت","slash",3,1.2);
 const j=snapshot();
 reset();
 DST.addDimstyle("DS-Tmp","مؤقت","slash",2,1);
 eq(DST.dsOk("DS-S"),null,"قبل الفتح");
 loadState(JSON.parse(j),true);
 eq(DST.dsOk("DS-S"),"DS-S","وبعد الفتح يعود");
 eq(DST.styleOf("DS-S").dec,3,"وبخاناته الثلاث");
});

group("dimstyles — الدوالّ المساعدة المتبقية: تسمية، قائمة، تطبيع، إعادة",()=>{
 reset();
 ok(DST.dsNameOk("DS-Z"),"اسمٌ لاتينيٌّ سليم مقبول");
 eq(DST.dsNameOk("١خطأ"),false,"واسمٌ غير لاتينيٍّ مرفوض");
 eq(JSON.stringify(DST.defDimstyles()),"{}","المصنع فارغٌ افتراضاً");
 DST.addDimstyle("DS-Z","تسمية عربية","slash",2,1);
 eq(DST.dsLabel("DS-Z"),"تسمية عربية","dsLabel تقرأ الوصف المخزَّن");
 eq(DST.dsLabel("مجهول"),"مجهول","والاسمُ المجهول يعود كما كُتب");
 const list=DST.dsList();
 eq(list.length,1,"القائمة تضمّ الطراز المضاف");
 eq(list[0].k,"DS-Z","بمفتاحه");
 eq(list[0].hMul,1,"وارتفاعه");
 /* normDimstyles مباشرةً: مدخلٌ فاسدٌ يُطرَح والاسمُ غير الصالح يُرفَض */
 S.dimstyles={"DS-Z":{n:"سليم",tick:"arrow",dec:1,hMul:1.2},
  "1bad":{n:"مرفوض",dec:1,hMul:1}, "DS-BAD":"نص لا كائن"};
 DST.normDimstyles();
 ok(DST.dsOk("DS-Z"),"الصالح يبقى بعد التطبيع المباشر");
 eq(DST.dsOk("1bad"),null,"واسمٌ غير لاتينيٍّ يُطرَح");
 eq(DST.dsOk("DS-BAD"),null,"وقيمةٌ ليست كائناً تُطرَح");
 eq(DST.resetDimstyles(),0,"الإعادة تنجح لعدم استعمال أيّ طراز");
 eq(Object.keys(S.dimstyles).length,0,"والمصنع عاد فارغاً");
});

process.exit(summary()?1:0);
