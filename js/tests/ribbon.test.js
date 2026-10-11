/* ═══ المرحلة D — تخصيص الشريط (دلتا فوق أساسٍ قارّ) ═══
   node js/tests/ribbon.test.js */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const {RIBBON,allItems,ribbonCmds,ribbonActs,HOME_MENU,homeOf}=await import("../ui/ribbon/schema.js");
const C=await import("../ui/ribbon/custom.js");
const S_=await import("../core/state.js");
const {normalizeDelta,mergeRibbon,itemKey,flatItems,effectiveRibbon,
 resetRibbonDelta,saveRibbonDelta,loadRibbonDelta}=C;

/* localStorage بديلٌ في الذاكرة إن لم يوفّره shim */
if(typeof globalThis.localStorage==="undefined"){
 const m=new Map();
 globalThis.localStorage={getItem:k=>m.has(k)?m.get(k):null,
  setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
}
const empty=()=>({tabs:{},tabOrder:[],panels:{},panelOrder:{},items:{}});

group("بلا دلتا: المصنع حرفياً",()=>{
 resetRibbonDelta();
 eq(effectiveRibbon().length,RIBBON.length,"بلا دلتا يعود الأساس");
 const leaf=flatItems(RIBBON[0].panels[0].items).find(it=>itemKey(it));
 ok(/^(c|a|t):/.test(itemKey(leaf)),"مفتاح العنصر من cmd/act/tog");
 ok(itemKey({})===null&&itemKey(null)===null,"وصفٌ بلا هويّة ⇒ null");
});

group("التطبيع",()=>{
 const w1=[];
 eq(normalizeDelta({version:999,tabs:{}},w1).version,1,"الإصدار المجهول يُهمَل");
 ok(w1.length>0,"تنبيه");
 const w0=[];
 normalizeDelta({tabs:{}},w0);
 eq(w0.length,0,"لا تنبيه لدلتا بلا version");
 const w2=[];
 const d2=normalizeDelta({version:1,tabs:{ghost:{hidden:1}}},w2);
 eq(d2.tabs.ghost,undefined,"التبويب الزائل يُطرح");
 ok(w2.length>0,"التبويب الزائل يُذكَر");
 const bad=RIBBON[0].id, w3=[];
 let d3=null, threw=false;
 try{d3=normalizeDelta({version:1,panelOrder:{[bad]:"ليست مصفوفة"},
  tabOrder:"x",tabs:"y",items:5},w3)}catch(e){threw=true}
 ok(!threw,"دلتا تالفة الشكل لا ترمي");
 eq(Object.keys(d3.panelOrder).length,0,"ترتيبٌ تالف يُهمَل");
 ok(w3.length>0,"تنبيه للتالف");
 eq(normalizeDelta("نص",[]).tabOrder.length,0,"جذرٌ غير كائن");
 ok(normalizeDelta(null,[]).version===1,"null ⇒ دلتا فارغة");
 const p=RIBBON[0].id+"/"+RIBBON[0].panels[0].id;
 const d5=normalizeDelta({version:1,panelOrder:{[RIBBON[0].id]:["ghost"]}},[]);
 eq(Object.keys(d5.panelOrder).length,0,"ترتيبٌ فارغ بعد الطرح لا يُحفَظ");
 ok(p.includes("/"),"مفتاح لوح tab/panel");
});

const base=[{id:"t1",n:"تبويب",panels:[{id:"p1",n:"لوح",items:[
 {cmd:"wall",n:"جدار"},
 {group:[{cmd:"col",n:"عمود"},{cmd:"door",n:"باب"}]}]}]}];

group("الدمج",()=>{
 const m=mergeRibbon(base,{...empty(),
  items:{"t1/p1/c:col":{hidden:1},"t1/p1/c:wall":{label:"حائط"}}});
 const items=m[0].panels[0].items;
 eq(items[0].n,"حائط","إعادة التسمية");
 eq(items[1].group.length,1,"المجموعة تبقى بعنصرٍ واحد");
 eq(base[0].panels[0].items[0].n,"جدار","الأساس لم يُمسّ");
 const m2=mergeRibbon(base,{...empty(),
  items:{"t1/p1/c:col":{hidden:1},"t1/p1/c:door":{hidden:1}}});
 eq(m2[0].panels[0].items.length,1,"مجموعةٌ فارغة تُطرح");
 const b2=[{id:"a",n:"A",panels:[]},{id:"b",n:"B",panels:[]},{id:"c",n:"C",panels:[]}];
 eq(mergeRibbon(b2,{...empty(),tabOrder:["c"]}).map(t=>t.id).join(""),"cab","ترتيبٌ مستقرّ");
 eq(mergeRibbon(b2,{...empty(),tabs:{b:{hidden:1}}}).map(t=>t.id).join(""),"ac","إخفاء تبويب");
 eq(mergeRibbon(b2,{...empty(),tabs:{a:{label:"س"}}})[0].n,"س","تسمية تبويب");
 const m3=mergeRibbon(base,{...empty(),panels:{"t1/p1":{hidden:1}}});
 eq(m3[0].panels.length,0,"إخفاء لوح");
 const d4=normalizeDelta({version:1,items:{"t1/p1/c:col":{hidden:1},
  "t1/p1/c:none":{hidden:1}}},[],base);
 ok(d4.items["t1/p1/c:col"],"عنصرٌ موجود يبقى");
 eq(d4.items["t1/p1/c:none"],undefined,"عنصرٌ زال يُطرح");
});

group("الحفظ والكاش والفهرس",()=>{
 resetRibbonDelta();
 const t0=RIBBON[0].id;
 const acts0=ribbonActs().join(),cmds0=ribbonCmds().join(),n0=allItems().length;
 ok(saveRibbonDelta({version:1,tabs:{[t0]:{hidden:1}}}),"حفظ");
 eq(effectiveRibbon().some(t=>t.id===t0),false,"الكاش أُبطل والتبويب أُخفي");
 eq(loadRibbonDelta().delta.tabs[t0].hidden,1,"الحفظ فعليٌّ (يقرأ من التخزين)");
 eq(RIBBON.some(t=>t.id===t0),true,"الأساس لم يُمسّ");
 eq(ribbonActs().join(),acts0,"ribbonActs ثابتة");
 eq(ribbonCmds().join(),cmds0,"ribbonCmds ثابتة");
 eq(allItems().length,n0,"allItems ثابتة");
 ok(resetRibbonDelta(),"مسح");
 eq(effectiveRibbon().length,RIBBON.length,"المصنع بعد المسح");
 localStorage.setItem("civildraft.ribbon","{نص فاسد");
 C.invalidateRibbonCache();
 eq(effectiveRibbon().length,RIBBON.length,"JSON فاسد لا يكسر");
 localStorage.setItem("civildraft.ribbon",JSON.stringify({version:999}));
 C.invalidateRibbonCache();
 eq(effectiveRibbon().length,RIBBON.length,"إصدار مجهول ⇒ المصنع");
 resetRibbonDelta();
});

group("قائمة الإغلاق 2 و9: تفضيلُ نافذةٍ و?safe",()=>{
 const {snapshot,canUndo}=S_;
 resetRibbonDelta();
 const before=JSON.stringify(snapshot()), u0=canUndo();
 const t0=RIBBON[0].id;
 saveRibbonDelta({version:1,tabs:{[t0]:{hidden:1,label:"س"}}});
 eq(JSON.stringify(snapshot()),before,"snapshot() قبل الحفظ = بعده");
 eq(canUndo(),u0,"ولا خطوةَ تاريخ");
 ok(!JSON.stringify(snapshot()).includes("civildraft.ribbon"),"الدلتا ليست في اللقطة");
 eq(effectiveRibbon().some(t=>t.id===t0),false,"الدلتا فعّالة");
 const oldLoc=globalThis.location;
 globalThis.location={search:"?safe"};
 eq(effectiveRibbon().length,RIBBON.length,"?safe يعرض المصنع رغم الدلتا");
 eq(effectiveRibbon().some(t=>t.id===t0),true,"وتبويبُ المخفيّ حاضر");
 if(oldLoc===undefined)delete globalThis.location; else globalThis.location=oldLoc;
 resetRibbonDelta();
});

group("هجرة mistar.ribbon تُقرأ ثم تُمسح مع المصنع",()=>{
 resetRibbonDelta();
 const t0=RIBBON[0].id;
 localStorage.setItem("mistar.ribbon",JSON.stringify({version:1,tabs:{[t0]:{hidden:1}}}));
 C.invalidateRibbonCache();
 eq(effectiveRibbon().some(t=>t.id===t0),false,"المفتاح القديم يُقرأ");
 resetRibbonDelta();
 eq(localStorage.getItem("mistar.ribbon"),null,"والمصنع يمسحه");
});

group("زرّ التخصيص موصولٌ",()=>{
 /* المرحلة ٤ نقلته إلى قائمةِ التطبيق: تخصيصُ الشريطِ ضبطُ برنامجٍ
    لا رسمُ مخطَّط. فالمعيارُ صار **أن له بيتاً معلَناً** لا أن يكون
    زرّاً في الشريطِ — و`homeOf` هي من يُجيب. */
 ok(HOME_MENU.includes("ribbonEditDlg"),"بيتُه قائمةُ التطبيقِ معلَناً");
 const h=homeOf("ribbonEditDlg");
 ok(h&&h.path==="قائمةُ التطبيق",`و`+"`homeOf`"+` تدلُّ عليه (${h&&h.path})`);
});
summary();
