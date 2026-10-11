/* ═══ الحوارات والبديلُ البنيويُّ والسحب ═══
   P5-004 حفظُ التركيز وإعادتُه وحصرُ Tab وEsc في الحوارات الثلاثة ·
   P5-005 ملخَّصٌ نصّيٌّ حيٌّ للقماش · P5-006 السحبُ على Pointer Events
   بلا كسر الفأرة · P6-004 اسمُ المالك وconnect-src المضيَّقة.
   التشغيل:  node js/tests/dialogs.test.js                         */
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const ROOT=join(fileURLToPath(new URL(".",import.meta.url)),"..","..");
const rd=p=>readFileSync(join(ROOT,p),"utf8");

/* ═══ P5-004 — عقدُ الحاصر يُشغَّل فعلاً بشِبه DOM أدنى ═══ */
const {trapFocus,focusables}=await import("../ui/focustrap.js");

function mkDoc(){
 const listeners=[];
 const mk=(tag,attrs)=>{
  const el={
   tagName:tag.toUpperCase(), _a:Object.assign({},attrs||{}),
   children:[], focused:0, parent:null,
   getAttribute(k){return (k in this._a)?this._a[k]:null},
   setAttribute(k,v){this._a[k]=String(v)},
   hasAttribute(k){return k in this._a},
   focus(){this.focused++; doc.activeElement=this},
   contains(x){
    if(x===this)return true;
    return this.children.some(c=>c.contains&&c.contains(x));
   },
   closest(sel){
    let n=this;
    while(n){
     if(sel==="[hidden]"&&n.hasAttribute("hidden"))return n;
     n=n.parent;
    }
    return null;
   },
   querySelectorAll(){
    const out=[];
    const walk=n=>n.children.forEach(c=>{
     if(/^(BUTTON|INPUT|SELECT|TEXTAREA|A|SUMMARY)$/.test(c.tagName)
        ||c.hasAttribute("tabindex"))out.push(c);
     walk(c);
    });
    walk(this);
    return out;
   },
   append(c){c.parent=this; this.children.push(c); return c}
  };
  return el;
 };
 const doc={
  activeElement:null, listeners,
  addEventListener(t,f,c){listeners.push([t,f,!!c])},
  removeEventListener(t,f){
   const i=listeners.findIndex(x=>x[0]===t&&x[1]===f);
   if(i>=0)listeners.splice(i,1);
  },
  contains(){return true},
  fire(t,ev){listeners.filter(x=>x[0]===t).forEach(x=>x[1](ev))}
 };
 globalThis.document=doc;
 return {doc,mk};
}
const {doc,mk}=mkDoc();
const key=(k,shift)=>{
 let prevented=0,stopped=0;
 doc.fire("keydown",{key:k,shiftKey:!!shift,
  preventDefault(){prevented=1}, stopPropagation(){stopped=1}});
 return {prevented,stopped};
};

group("P5-004 · الحاصرُ يحفظ ويحصر ويُعيد",()=>{
 const outside=mk("button",{id:"out"});
 const box=mk("div",{role:"dialog"});
 const b1=box.append(mk("button",{id:"b1"}));
 const inp=box.append(mk("input",{}));
 const b2=box.append(mk("button",{id:"b2"}));
 const hid=box.append(mk("button",{hidden:""}));
 const neg=box.append(mk("button",{tabindex:"-1"}));
 /* العنصرُ المركَّزُ قبل الفتح */
 outside.focus();
 eq(doc.activeElement,outside,"التركيزُ خارجَ الحوار أوّلاً");
 /* القابلُ للتركيز: ثلاثةٌ — المخفيُّ وtabindex السالبُ يُستثنَيان */
 const F=focusables(box);
 eq(F.length,3,"ثلاثةُ عناصرَ قابلةٍ للتركيز");
 ok(F.indexOf(hid)<0,"والمخفيُّ مستثنى");
 ok(F.indexOf(neg)<0,"وtabindex سالبٌ مستثنى");
 /* الفتح: يُركَّز أوّلُ عنصر */
 let escd=0;
 const release=trapFocus(box,{onEsc:()=>{escd++}});
 eq(doc.activeElement,b1,"الفتحُ يركّز أوّلَ عنصر");
 /* Tab من الأخير يلتفّ إلى الأوّل */
 b2.focus();
 let r=key("Tab");
 ok(r.prevented,"Tab من الأخير مُعترَض");
 eq(doc.activeElement,b1,"ويلتفّ إلى الأوّل — لا خروجَ من الحوار");
 /* Shift+Tab من الأوّل يلتفّ إلى الأخير */
 r=key("Tab",true);
 ok(r.prevented,"Shift+Tab من الأوّل مُعترَض");
 eq(doc.activeElement,b2,"ويلتفّ إلى الأخير");
 /* Tab في الوسط يمرّ بلا اعتراض — لا نعطّل التنقّل الطبيعيّ */
 inp.focus();
 r=key("Tab");
 ok(!r.prevented,"وTab في الوسط يمرّ طبيعياً");
 /* Escape ينادي onEsc */
 r=key("Escape");
 eq(escd,1,"Escape يُغلِق");
 ok(r.stopped,"ولا يصعد إلى ما تحته");
 /* الإغلاق: يُعيد التركيزَ ويفكّ المستمع */
 const before=doc.listeners.length;
 ok(release(),"التحريرُ يقع");
 eq(doc.activeElement,outside,"والتركيزُ يعود إلى ما كان");
 ok(doc.listeners.length<before,"والمستمعُ فُكَّ");
 ok(!release(),"والتحريرُ لا يتكرّر");
 /* وبعد التحرير لا يعترض شيئاً */
 b1.focus();
 r=key("Tab");
 ok(!r.prevented,"ولا حصرَ بعد الإغلاق");
});

group("P5-004 · الحوارات الثلاثة تستعمله",()=>{
 [["js/ui/rpt.js","rptOpen"],["js/ui/view3d.js","open3d"],
  ["js/ui/gallery.js","createGallery"]].forEach(([f])=>{
  const s=rd(f);
  ok(/from "\.\/focustrap\.js"/.test(s),`${f}: يستورد الحاصر`);
  ok(/trapFocus\(/.test(s),`${f}: ويُحصُر عند الفتح`);
  ok(/release/.test(s),`${f}: ويُحرّر عند الإغلاق`);
  ok(/aria-modal/.test(s),`${f}: ويعلن aria-modal`);
 });
 /* ولا مستمعَ Escape مكرّرٌ بقي في rpt.js (كان له واحدٌ خاصّ) */
 ok(!/document\.addEventListener\("keydown",onKey/.test(rd("js/ui/rpt.js")),
  "rpt.js: لا مستمعَ Escape ثانٍ — الحاصرُ يتولّاه");
 /* والمعرضُ لم يبقَ مستمعُه على window بعد الإغلاق */
 ok(!/window\.addEventListener\("keydown"/.test(rd("js/ui/gallery.js")),
  "gallery.js: لا مستمعَ keydown دائمٌ على window");
});

group("P5-005 · ملخَّصٌ نصّيٌّ حيٌّ للقماش",()=>{
 const html=rd("index.html");
 ok(/id="cvAlt"/.test(html),"عنصرُ البديل موجودٌ في الصفحة");
 ok(/aria-describedby="cvAlt"/.test(html),"والقماشُ يشير إليه");
 ok(/role="status"/.test(html)&&/aria-live="polite"/.test(html),
  "وهو منطقةٌ حيّةٌ polite");
 ok(/class="u-sr"/.test(html),"ومرئيٌّ لقارئ الشاشة وحده");
 ok(/\.u-sr\{/.test(rd("css/util.css")),"والصنفُ معرَّفٌ في CSS");
 const css=rd("css/util.css");
 ok(/clip-path:inset\(50%\)/.test(css),"بـclip-path لا display:none");
 ok(!/\.u-sr\{[^}]*display:none/.test(css),
  "فلا يخرج من شجرة إتاحة الوصول");
 const cv=rd("js/ui/canvas.js");
 ok(/canvasAltText/.test(cv),"والنصُّ دالّةٌ مُصدَّرةٌ تُختبَر");
 ok(/publishAlt\(\)/.test(cv),"ويُنشَر مع كل رسم");
 ok(/textContent=t/.test(cv),"بـtextContent لا innerHTML");
 ok(/t!==altLast/.test(cv),"ولا يُعلَن إلّا إن تغيّر");
});

group("P5-006 · السحبُ على Pointer بلا كسر الفأرة",()=>{
 [["js/ui/dock.js","الإرساء"],["js/ui/cmdline.js","سطر الأوامر"]]
  .forEach(([f,nm])=>{
  const s=rd(f);
  ok(/addEventListener\("pointerdown"/.test(s),`${nm}: pointerdown`);
  ok(/addEventListener\("pointermove"/.test(s),`${nm}: pointermove`);
  ok(/addEventListener\("pointerup"/.test(s),`${nm}: pointerup`);
  ok(/pointercancel/.test(s),`${nm}: pointercancel`);
  /* الفأرةُ كما كانت حرفاً — لا تُحذَف مستمعاتُها */
  ok(/addEventListener\("mousedown"/.test(s),`${nm}: والفأرةُ باقية`);
  ok(/addEventListener\("mousemove"/.test(s),`${nm}: ومسارُ حركتها`);
  ok(/addEventListener\("mouseup"/.test(s),`${nm}: ونهايتُها`);
  /* ولا معالجةٌ مزدوجة: pointerType==="mouse" يُستثنى */
  ok(/pointerType!=="mouse"/.test(s),`${nm}: والماوسُ يُستثنى من pointer`);
  ok(/setPointerCapture/.test(s),`${nm}: وsetPointerCapture`);
  ok(/lostpointercapture/.test(s),`${nm}: وتنظيفٌ عند فقد الالتقاط`);
 });
 /* وtouch-action:none على المقابض وحدها لا على الصفحة */
 const dk=rd("css/dock.css"), cm=rd("css/cmd.css");
 ok(/\.dsz\{touch-action:none\}/.test(dk),"الفاصلُ touch-action:none");
 ok(/summary\{touch-action:none\}/.test(dk),"والترويسةُ كذلك");
 ok(/#cmdline\{touch-action:none\}/.test(cm),"وسطرُ الأوامر العائم");
 ok(/input\{touch-action:auto\}/.test(cm),"وحقلُه يبقى auto");
 ok(!/^body\{[^}]*touch-action:none/m.test(dk+cm),
  "ولا منعٌ شاملٌ على الصفحة");
});

group("P6-004 + P6-009 · قرارُ المالك مطبَّق",()=>{
 const lic=rd("LICENSE");
 ok(/Copyright \(c\) 2026 Abraham/.test(lic),"LICENSE باسم المالك");
 ok(!/<اسمك>/.test(lic),"ولا قيمةَ مؤقتةٍ باقية");
 ok(!/<اسمك>/.test(rd("README.md")),"ولا في README");
 /* connect-src: المضيفونَ الفعليّون لا 'https:' المفتوحة */
 const need=["https://api.openai.com","https://api.groq.com",
  "https://generativelanguage.googleapis.com","https://openrouter.ai"];
 ["index.html","netlify.toml","_headers","serving/static-server.js"]
  .forEach(f=>{
   const s=rd(f);
   const cs=/connect-src ([^;"]+)/.exec(s.replace(/<!--[\s\S]*?-->/g,""))
    ||/connect-src ([\s\S]{0,320}?)object-src/.exec(s);
   ok(!!cs,`${f}: connect-src موجودة`);
   if(!cs)return;
   need.forEach(h=>ok(cs[1].includes(h)||s.includes(h),
    `${f}: ${h} مسموح`));
   /* لا 'https:' كمخطّطٍ مفتوح */
   ok(!/(^|\s)https:(\s|$)/.test(cs[1]),
    `${f}: ولا 'https:' مفتوحة — المزوّدُ المخصّصُ غير مدعوم`);
  });
});

process.exit(summary()?1:0);
