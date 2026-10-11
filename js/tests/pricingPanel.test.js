/* ═══ شاشة التسعير (ui/pricingPanel.js) ═══
   السلوك خلف اللوح: الحقول تصل إلى setRate/setCurrency/setTaxRate، والمعاينة
   تتبع الكميّات الحيّة من boq()، والقيم الفاسدة تُرفَض وتُعاد الخانة إلى
   الصحيح، والاستعادة تمسّ الأسعار فقط، والأسعار تعبر حفظ المشروع وإعادة فتحه. */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,near,summary,fire,click,setVal} from "./harness.js";
shim(); shimCanvas();
const DOC=shimDOM();
{const cv=DOC.createElement("canvas"); cv.setAttribute("id","cv");
 DOC.body.appendChild(cv);}
if(!globalThis.window)globalThis.window={prompt:()=>null,confirm:()=>true};

const {S,newState,ensureShape}=await import("../core/state.js");
const P=await import("../core/pricing.js");
const R=await import("../tools/registry.js");
const PJ=await import("../io/project.js");
const M=await import("../ui/pricingPanel.js");
const {rptClose,rptBox}=await import("../ui/rpt.js");
const rig=toolRig(R,{});

const fresh=()=>{
 newState(); ensureShape(); rptClose(); rig.clear();
 P.resetRates(); P.setCurrency("ر.س"); P.setTaxRate(0.15);
};
const row=k=>rptBox().querySelector(`tr[data-k="${k}"]`);
const rateBox=k=>row(k).querySelector('[data-f="rate"]');
const totals=()=>rptBox().querySelector('[data-o="tot"]').textContent;

/* مشروعٌ فيه بابان وعمودان — كميّاتٌ معلومة بلا رسم */
const seed=()=>{
 S.cols.push({id:"c1",x:0,y:0,w:300,h:300,lay:"0"},
  {id:"c2",x:2000,y:0,w:300,h:300,lay:"0"});
};

group("التسعير — فتح اللوح والبنود المعروضة",()=>{
 fresh();
 const box=M.openPricingPanel();
 ok(box&&rptBox()===box&&box.classList.contains("pr"),"اللوح مفتوح بصنفه");
 for(const k of ["wall_ext","wall_int","wall_low","area","door","window",
  "column","fixture","stair"])
  ok(!!row(k),"بندٌ: "+k);
 ok(!row("floor")&&!row("dim"),"«أرضيات» و«أبعاد» لا يستهلكهما الحصر فلا يُعرضان");
 eq(rateBox("door").value,"350","سعر الباب الافتراضي 350");
 eq(rateBox("fixture").value,"0","والأدوات الصحية صفر افتراضياً");
});

group("التسعير — تعديل السعر ينعكس على الإجمالي",()=>{
 fresh(); seed();
 M.openPricingPanel();
 const before=P.price([{key:"column",qty:2}]).subtotal;
 eq(before,500,"تمهيد: عمودان × 250");
 setVal(rateBox("column"),"1000");
 near(P.getRate("column"),1000,1e-9,"setRate استُدعيت");
 ok(/2[\s\S]*عدد|2/.test(row("column").querySelector('[data-o="qty"]').textContent),
  "الكمية الحيّة عمودان");
 ok(/٢٬?٠٠٠|2,?000/.test(row("column").querySelector('[data-o="amt"]').textContent),
  "مبلغ البند 2000");
 ok(/٢٬?٣٠٠|2,?300/.test(totals()),"الإجمالي بعد الضريبة 2000×1.15 = 2300");
});

group("التسعير — بندٌ له كمية وسعره صفر يُنبَّه إليه",()=>{
 fresh(); seed();
 M.openPricingPanel();
 const warn=k=>row(k).querySelector('[data-o="warn"]').textContent;
 eq(warn("column"),"","عمودان بسعرٍ 250: لا تنبيه");
 setVal(rateBox("column"),"0");
 ok(/غير مسعَّر/.test(warn("column")),"صار السعر صفراً والكمية 2: تنبيه «غير مسعَّر»");
 eq(warn("door"),"","وبندٌ بلا كمية لا يُنبَّه إليه");
 setVal(rateBox("column"),"10");
 eq(warn("column"),"","ويزول التنبيه بعد ضبط السعر");
});

group("التسعير — القيم الفاسدة تُرفَض وتُعاد الخانة",()=>{
 fresh();
 M.openPricingPanel();
 setVal(rateBox("door"),"-5");
 eq(P.getRate("door"),350,"سالب: السعر لم يتغيّر");
 eq(rateBox("door").value,"350","والخانة عادت إلى الصحيح");
 ok(rig.said(/غير سالب/,"wr"),"ويُقال السبب");
 setVal(rateBox("door"),"");
 eq(P.getRate("door"),350,"فارغ: لا يتحوّل إلى صفرٍ صامت");
 setVal(rateBox("door"),"abc");
 eq(P.getRate("door"),350,"نصّ: مرفوض");
 const tax=rptBox().querySelector('[data-f="tax"]');
 setVal(tax,"150");
 near(P.taxRate(),0.15,1e-9,"ضريبة >100 مرفوضة");
 setVal(tax,"5");
 near(P.taxRate(),0.05,1e-9,"5٪ ← 0.05");
 const cur=rptBox().querySelector('[data-f="currency"]');
 setVal(cur,"   ");
 eq(P.currency(),"ر.س","عملة فارغة مرفوضة");
 eq(cur.value,"ر.س","والخانة عادت");
 setVal(cur,"USD");
 eq(P.currency(),"USD","عملة صالحة");
});

group("التسعير — استعادة الأسعار لا تمسّ العملة والضريبة",()=>{
 fresh();
 P.setRate("door",999); P.setTaxRate(0.05); P.setCurrency("USD");
 M.openPricingPanel();
 click(rptBox().querySelector('[data-pr="reset"]'));
 eq(P.getRate("door"),350,"سعر الباب عاد");
 eq(rateBox("door").value,"350","والخانة تبعته");
 eq(P.currency(),"USD","العملة كما هي");
 near(P.taxRate(),0.05,1e-9,"والضريبة كما هي");
});

group("التسعير — يعبر حفظ المشروع وإعادة فتحه",()=>{
 fresh();
 P.setRate("door",777); P.setRate("stair",1234); P.setTaxRate(0.05); P.setCurrency("EUR");
 const txt=PJ.toJSON();
 P.resetRates(); P.setTaxRate(0.15); P.setCurrency("ر.س");
 eq(P.getRate("door"),350,"تمهيد: مُسحت");
 PJ.fromJSON(txt);
 eq(P.getRate("door"),777,"سعر الباب رجع");
 eq(P.getRate("stair"),1234,"وسعر الدرج");
 near(P.taxRate(),0.05,1e-9,"والضريبة");
 eq(P.currency(),"EUR","والعملة");
});

group("التسعير — العملة والضريبة تُحفَظان في المتصفّح",()=>{
 fresh();
 P.setCurrency("AED"); P.setTaxRate(0.05);
 const raw=JSON.parse(localStorage.getItem("civildraft:pricing-cfg"));
 eq(raw.currency,"AED","العملة في المفتاح المستقلّ");
 near(raw.taxRate,0.05,1e-9,"والضريبة");
 ok(!("currency" in JSON.parse(localStorage.getItem("civildraft:pricing")||"{}")),
  "ولا تلوّث مفتاحَ الأسعار");
});

group("التسعير — الأداة والأكشن",()=>{
 fresh();
 ok(!!R.findTool("pricing"),"الأمر pricing مسجَّل");
 R.begin("pricing");
 ok(rptBox()&&rptBox().classList.contains("pr"),"وفتحه يُظهر اللوح");
 ok(!R.active(),"ولا تبقى جلسة التقاط مفتوحة");
});

try{summary()}finally{}
