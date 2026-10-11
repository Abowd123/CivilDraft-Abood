/* ═══ الصورة المرجعية — أداة المعايرة بنقطتين ═══
   السلوك خلف لوح التحكّم (ui/underlayPanel.js): الأداة ulcal ترفض بلا
   صورة، وتعاير من نقطتين ومسافةٍ حقيقية، وتدخل التاريخ بخطوةٍ واحدة
   (بلا dirty(ctx) كانت تُطبَّق ولا تُتراجَع). النقاط مصفوفاتٌ [x,y]
   لا {x,y} — وهو ما كسر أوّل تنفيذ. */
import {shim,shimCanvas,shimDOM,toolRig,group,ok,eq,near,summary} from "./harness.js";
shim(); shimCanvas();
const DOC=shimDOM();
{const cv=DOC.createElement("canvas"); cv.setAttribute("id","cv");
 DOC.body.appendChild(cv);}
if(!globalThis.window)globalThis.window={prompt:()=>null,confirm:()=>true};

const {S,newState,ensureShape,undo,redo}=await import("../core/state.js");
const U=await import("../core/underlay.js");
const R=await import("../tools/registry.js");
await import("../ui/underlayPanel.js");
const rig=toolRig(R,{});

/* Image وهميّة تكتمل يدوياً — Node بلا Image عالميّ */
class FakeImage{
 constructor(){this.onload=null; this.naturalWidth=400; this.naturalHeight=300;
  this._src=""}
 set src(v){this._src=v; this.onload&&this.onload()}
 get src(){return this._src}
}
const prevImage=globalThis.Image;
globalThis.Image=FakeImage;
const fresh=()=>{
 newState(); ensureShape();
 if(R.active())R.cancel(true);
 rig.clear(); rig.defs("ulcal");
};
const load=()=>{
 U.setImage("data:image/png;base64,AAAA");
 U.setScale(20);          /* 400px × 20مم = 8م عرضاً */
};

try{
 group("ulcal — يرفض بلا صورة",()=>{
  fresh();
  R.begin("ulcal");
  ok(!R.active(),"لا جلسة تبقى مفتوحة بلا صورة");
  ok(rig.said(/لا صورة مرجعية/,"wr"),"ويُقال السبب");
  eq(S.underlay.mpp,0.01,"ولم يُمَسّ المقياس");
 });

 group("ulcal — نقطتان ومسافة حقيقية",()=>{
  fresh(); load();
  near(S.underlay.mpp,20,1e-9,"تمهيد: 20 مم/بكسل");
  R.setOpt("ulcal","d","1");                 /* متر واحد */
  R.begin("ulcal");
  ok(R.active(),"الجلسة مفتوحة");
  rig.at(0,0); rig.at(4000,0);               /* 4م مقيسة على الصورة */
  near(S.underlay.mpp,5,1e-9,"المقياس ×¼ : 1م حقيقيّ ÷ 4م مقيسة");
  near(U.state().w*S.underlay.mpp,2000,1e-6,"عرض الصورة صار 2م");
  ok(rig.said(/عُويرت الصورة/,"ok"),"ويُقال الناتج");
 });

 group("ulcal — تدخل التاريخ بخطوةٍ واحدة",()=>{
  fresh(); load();
  R.setOpt("ulcal","d","1");
  R.begin("ulcal"); rig.at(0,0); rig.at(4000,0);
  near(S.underlay.mpp,5,1e-9,"عُويرت");
  undo();
  near(S.underlay.mpp,20,1e-9,"تراجعٌ واحد يُعيد ما قبل المعايرة لا ما قبل التحميل");
  redo();
  near(S.underlay.mpp,5,1e-9,"والإعادة تُعيدها");
 });

 group("ulcal — نقطتان متطابقتان لا تُشوِّهان",()=>{
  fresh(); load();
  R.setOpt("ulcal","d","1");
  R.begin("ulcal"); rig.at(100,100); rig.at(100,100);
  near(S.underlay.mpp,20,1e-9,"المقياس لم يتغيّر");
  ok(rig.said(/تعذّرت المعايرة/,"wr"),"ويُقال الفشل");
 });

 group("ulcal — صورةٌ مخفيّة تُرفَض",()=>{
  fresh(); load();
  U.setVisible(false);
  rig.clear();
  R.begin("ulcal");
  ok(!R.active(),"لا معايرة على صورةٍ لا تُرى");
 });
 group("القفل يمنع النقل ولا يمنع التعديل الآخر",()=>{
  fresh(); load();
  ok(U.move(1500,-2000),"النقل يعمل غير مقفول");
  eq(S.underlay.x,1500,"س");
  eq(S.underlay.y,-2000,"ص");
  U.setLocked(true);
  ok(!U.move(3000,3000),"النقل مرفوض مقفولاً");
  eq(S.underlay.x,1500,"ولم يتحرّك");
  ok(U.setRotation(0.5),"الدوران لا يقفله القفل");
  U.setLocked(false);
  ok(U.move(3000,3000),"وبعد الفكّ يعود النقل");
  ok(!U.move("",""),"وغيرُ الرقمي يُرفَض لا يُصفَّر");
 });
}finally{
 if(prevImage===undefined)delete globalThis.Image; else globalThis.Image=prevImage;
}
process.exit(summary());
