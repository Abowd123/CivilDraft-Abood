/* ═══ مِعمَل اختبار بلا اعتماديات ═══
   يعمل على Node بلا مكتبات: يُلبِس ما تحتاجه نواةُ البرنامج من
   بيئة المتصفّح (localStorage وحده)، ثم يشغّل الحالات.
   لا يستورد شيئاً من ui/* — الواجهة تُختبر يدوياً. */

/* ═══ اللبوس ═══ يُنادى قبل أي استيراد لـ core/* ═══ */
export function shim(){
 if(!globalThis.localStorage){
  const M=new Map();
  globalThis.localStorage={
   getItem:k=>(M.has(k)?M.get(k):null),
   setItem:(k,v)=>{M.set(k,String(v))},
   removeItem:k=>{M.delete(k)},
   clear:()=>M.clear(),
   get length(){return M.size},
   key:i=>[...M.keys()][i]||null};
 }
 if(!globalThis.performance)
  globalThis.performance={now:()=>Date.now()};
}
/* ═══ شِبه القماش ═══
   أصغرُ ما يكفي io/png.js و io/pdf.js: مقاسُ النصّ يُقدَّر بعرضٍ
   ثابت، وfillText يُظلِّم مستطيلاً فلا يخرج القناعُ فارغاً — فما
   نفحصه بنيةُ المخرَج لا شكلُ الحرف.
   ويُنادى قبل استيراد المُصدِّرَين. */
export function shimCanvas(){
 if(globalThis.document&&globalThis.document.__mistarCanvas)return;
 const mk=(w,h)=>{
  const st={w:w||300,h:h||150,ink:[]};
  const ctx={
   font:"", direction:"", fillStyle:"", strokeStyle:"",
   lineWidth:1, lineCap:"", lineJoin:"", globalAlpha:1,
   textAlign:"", textBaseline:"",
   save(){}, restore(){}, translate(){}, rotate(){},
   beginPath(){}, moveTo(){}, lineTo(){}, closePath(){},
   arc(){}, stroke(){}, fill(){}, rect(){},
   setLineDash(){}, setTransform(){},
   fillRect(x,y,w,h){
    if(String(ctx.fillStyle).toLowerCase()==="#ffffff")st.ink=[];
   },
   clearRect(){}, strokeRect(){},
   measureText:s=>({width:String(s||"").length*10}),
   fillText(s,x,y){
    /* مستطيلٌ في الوسط: بِتّاتٌ مضبوطة فلا يكون القناع فارغاً */
    st.ink.push([Math.max(0,Math.round(st.w*0.2)),
     Math.max(0,Math.round(st.h*0.3)),
     Math.round(st.w*0.6), Math.round(st.h*0.4)]);
   },
   createPattern:()=>({__pat:1}),
   getImageData(x,y,w,h){
    const d=new Uint8ClampedArray(w*h*4).fill(255);
    st.ink.forEach(([rx,ry,rw,rh])=>{
     for(let j=ry;j<Math.min(h,ry+rh);j++)
      for(let i=rx;i<Math.min(w,rx+rw);i++){
       const o=(j*w+i)*4;
       d[o]=d[o+1]=d[o+2]=0;
      }
    });
    return {data:d,width:w,height:h};
   }
  };
  const cv={
   get width(){return st.w}, set width(v){st.w=v|0; st.ink=[]},
   get height(){return st.h}, set height(v){st.h=v|0; st.ink=[]},
   style:{}, getContext:()=>ctx,
   toBlob:cb=>{setTimeout(()=>cb(null),0)},
   toDataURL:()=>"data:image/png;base64,"};
  return cv;
 };
 globalThis.document={
  __mistarCanvas:1,
  createElement:t=>(String(t).toLowerCase()==="canvas")
   ? mk() : {style:{},dataset:{},appendChild(){},setAttribute(){}},
  getElementById:()=>null,
  querySelector:()=>null,
  querySelectorAll:()=>[],
  addEventListener(){}, body:{appendChild(){}}};
 if(!globalThis.devicePixelRatio)globalThis.devicePixelRatio=1;
}
/* ═══ شِبهُ DOM ═══
   ui/* يحتاج شجرةً وأحداثاً — خلافاً لـtools/* الذي لا يلمس
   document. وأقلُّ ما يكفي: عقدةٌ بنسبٍ وسمات، وquerySelector
   بمحدِّداتٍ بسيطة (#id · .cls · tag · [attr=v] · تسلسلٌ ونسب)،
   وdispatchEvent يصعد فيعمل التفويضُ على document كما في الإنتاج.

   ولا مصفوفاتٌ حيّة ولا تخطيطٌ ولا CSS: ما يُفحَص بنيةُ المخرَج
   وسلوكُ المستمعين، لا هيئتُهما. والمقاساتُ صفرٌ صريحاً — فحالةٌ
   تعتمد على offsetWidth تُعلَن متروكةً لا ناجحة.
   وinnerHTML يُحلَّل تحليلاً بسيطاً: وسومٌ وسماتٌ ونصّ، بلا
   تعليقاتٍ ولا CDATA ولا نصٍّ خامّ في <script>. */
const VOID=new Set(["br","hr","img","input","meta","link","use",
 "area","base","col","embed","source","track","wbr"]);

function parseHTML(doc,html){
 const out=[];
 const stack=[];
 const push=n=>{
  if(stack.length)stack[stack.length-1].appendChild(n);
  else out.push(n);
 };
 const RE=/<\/?([A-Za-z][\w-]*)((?:\s+[^\s/>"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s">]+))?)*)\s*(\/?)>|<!--[\s\S]*?-->/g;
 let last=0, m;
 while((m=RE.exec(html))){
  const txt=html.slice(last,m.index);
  if(txt.trim())push(doc.createTextNode(txt));
  last=RE.lastIndex;
  if(m[0].slice(0,4)==="<!--")continue;
  const tag=m[1].toLowerCase();
  if(m[0][1]==="/"){
   for(let i=stack.length-1;i>=0;i--)
    if(stack[i].tagName===tag.toUpperCase()){
     stack.length=i;
     break;
    }
   continue;
  }
  const el=doc.createElement(tag);
  const AT=/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s">]+)))?/g;
  let a;
  while((a=AT.exec(m[2]||""))){
   const v=(a[2]!==undefined)?a[2]
    :((a[3]!==undefined)?a[3]:((a[4]!==undefined)?a[4]:""));
   el.setAttribute(a[1],v);
  }
  push(el);
  if(!m[3]&&!VOID.has(tag))stack.push(el);
 }
 const tail=html.slice(last);
 if(tail.trim())push(doc.createTextNode(tail));
 return out;
}
/* ═══ المحدِّد ═══ tag#id.cls[attr=v] · والفراغُ نسبٌ و«>» أبوّة ═══
   والقديمُ يقسم على الفراغ وحده، فيصير «>» جزءاً مستقلّاً لا يطابق
   شيئاً — وdock.js يقرأ «:scope > details.sec» و«.flt > details.sec
   > summary»، فلا يعمل منه شيء. */
function parseOne(t){
 const q={tag:"",id:"",cls:[],at:[],scope:0};
 if(t===":scope"){q.scope=1; return q}
 const RE=/^([A-Za-z*][\w-]*)|#([\w-]+)|\.([\w-]+)|\[([^\]=~^$*]+)(?:([~^$*]?=)"?([^\]"]*)"?)?\]|:scope/;
 let rest=t, m;
 while(rest&&(m=RE.exec(rest))){
  if(m[1])q.tag=m[1].toLowerCase();
  else if(m[2])q.id=m[2];
  else if(m[3])q.cls.push(m[3]);
  else if(m[4])q.at.push([m[4],m[5]||"",m[6]||""]);
  else q.scope=1;
  rest=rest.slice(m[0].length);
 }
 return q;
}
function parseSel(s){
 const P=[];
 const toks=String(s||"").trim()
  .replace(/\s*>\s*/g," > ").split(/\s+/).filter(Boolean);
 let comb=" ";
 toks.forEach(t=>{
  if(t===">"){comb=">"; return}
  const q=parseOne(t);
  q.comb=comb;
  P.push(q);
  comb=" ";
 });
 return P;
}
function matchOne(el,q,root){
 if(!el||el.nodeType!==1)return false;
 if(q.scope)return el===root;
 if(q.tag&&q.tag!=="*"&&el.tagName!==q.tag.toUpperCase())
  return false;
 if(q.id&&el.getAttribute("id")!==q.id)return false;
 if(q.cls.length){
  const C=String(el.getAttribute("class")||"").split(/\s+/);
  if(!q.cls.every(c=>C.includes(c)))return false;
 }
 return q.at.every(([n,op,v])=>{
  const a=el.getAttribute(n);
  if(a==null)return false;
  if(!op)return true;
  if(op==="=")return a===v;
  if(op==="^=")return a.startsWith(v);
  if(op==="$=")return a.endsWith(v);
  if(op==="*=")return a.includes(v);
  if(op==="~=")return a.split(/\s+/).includes(v);
  return false;
 });
}
/* السلسلةُ تُطابَق من آخرها صعوداً: «>» أبٌ مباشرٌ والفراغُ أيُّ سلف.
   وroot حدُّ الصعود: هو وعاءُ البحث لا جزءٌ منه، فلا يُطابَق أبداً
   بمصادفة سِمَتِه — وإلّا صار d.querySelectorAll("div button") يُصيب
   زرّاً ابناً مباشراً لـd بحجّة أنّ d نفسَه «div». ويُستثنى من هذا
   المنعِ رمزُ ‎:scope‏ نفسُه، فهو يقصد root عمداً — ودock.js يقرأ
   «:scope > details.sec» يعتمد على أنّ الجذرَ يُطابِقه. */
function matchChain(el,P,root){
 let i=P.length-1;
 if(!matchOne(el,P[i],root))return false;
 let comb=P[i].comb, n=el.parentElement;
 i--;
 while(i>=0){
  const q=P[i];
  const rootBlocked=x=>x===root&&!q.scope;
  if(comb===">"){
   if(!n||rootBlocked(n)||!matchOne(n,q,root))return false;
  }else{
   while(n&&!rootBlocked(n)&&!matchOne(n,q,root))n=n.parentElement;
   if(!n||rootBlocked(n))return false;
  }
  comb=q.comb;
  n=n?n.parentElement:null;
  i--;
 }
 return true;
}
export function shimDOM(){
 if(globalThis.document&&globalThis.document.__mistarDOM)
  return globalThis.document;
 const CANV=globalThis.document&&globalThis.document.__mistarCanvas
  ? globalThis.document.createElement : null;

 class Node2{
  constructor(doc,tag,text){
   this.__doc=doc;
   this.nodeType=(tag==null)?3:1;
   this.tagName=(tag||"").toUpperCase();
   this.parentElement=null;
   this.childNodes=[];
   this.__at=new Map();
   this.__L=new Map();
   this.__txt=(text==null)?"":String(text);
   /* `style` في المتصفّح كائنٌ له setProperty/getPropertyValue —
      والمتغيّراتُ المخصّصة (--rbH) لا تُكتَب إلّا بها. وشريطُ الأدوات
      يُعلِن ارتفاعَه هكذا، فغيابُها كان يُسقِط مجموعاتِ محرّر
      الشريطِ بـ«setProperty is not a function». شِمٌّ ناقصٌ لا عطبُ
      منتَج — والمكتوبُ يُقرَأ فيُختبَر السلوكُ لا يُخرَس. */
   const SP={};
   this.style=new Proxy(SP,{
    get:(o,k)=>{
     if(k==="setProperty")
      return (n,v)=>{o[String(n)]=String(v==null?"":v)};
     if(k==="getPropertyValue")
      return n=>(String(n) in o)?o[String(n)]:"";
     if(k==="removeProperty")
      return n=>{delete o[String(n)]};
     return (k in o)?o[k]:"";
    },
    set:(o,k,v)=>{o[k]=String(v); return true}});
   const self=this;
   this.dataset=new Proxy({},{
    get:(o,k)=>self.getAttribute("data-"+dashOf(k)),
    set:(o,k,v)=>{self.setAttribute("data-"+dashOf(k),v);
     return true},
    has:(o,k)=>self.getAttribute("data-"+dashOf(k))!=null,
    deleteProperty:(o,k)=>{
     self.removeAttribute("data-"+dashOf(k));
     return true;
    }});
   this.classList={
    add:(...c)=>self.__cls(C=>{c.forEach(x=>{
     if(x&&!C.includes(x))C.push(x)})}),
    remove:(...c)=>self.__cls(C=>{c.forEach(x=>{
     const i=C.indexOf(x);
     if(i>=0)C.splice(i,1);
    })}),
    toggle:(c,on)=>{
     const has=self.classList.contains(c);
     const want=(on===undefined)?!has:!!on;
     if(want)self.classList.add(c); else self.classList.remove(c);
     return want;
    },
    contains:c=>String(self.getAttribute("class")||"")
     .split(/\s+/).includes(c)};
  }
  __cls(fn){
   const C=String(this.getAttribute("class")||"")
    .split(/\s+/).filter(Boolean);
   fn(C);
   this.setAttribute("class",C.join(" "));
  }
  /* السماتُ والخصائصُ المرآة — hidden وdisabled وvalue وchecked */
  getAttribute(n){
   const v=this.__at.get(String(n).toLowerCase());
   return (v===undefined)?null:v;
  }
  setAttribute(n,v){
   const k=String(n).toLowerCase();
   this.__at.set(k,String(v));
   if(k==="hidden")this.__hidden=true;
   if(k==="disabled")this.__dis=true;
   if(k==="value")this.__val=String(v);
   if(k==="checked")this.__chk=true;
   if(k==="type")this.type=String(v);
  }
  removeAttribute(n){
   const k=String(n).toLowerCase();
   this.__at.delete(k);
   if(k==="hidden")this.__hidden=false;
   if(k==="disabled")this.__dis=false;
   if(k==="checked")this.__chk=false;
  }
  hasAttribute(n){return this.__at.has(String(n).toLowerCase())}
  get hidden(){return !!this.__hidden}
  set hidden(v){
   this.__hidden=!!v;
   if(v)this.__at.set("hidden",""); else this.__at.delete("hidden");
  }
  get disabled(){return !!this.__dis}
  set disabled(v){
   this.__dis=!!v;
   if(v)this.__at.set("disabled",""); else this.__at.delete("disabled");
  }
  get checked(){return !!this.__chk}
  set checked(v){this.__chk=!!v}
  get value(){return (this.__val===undefined)?"":this.__val}
  set value(v){this.__val=String(v)}
  get open(){return !!this.__open}
  set open(v){
   const was=!!this.__open;
   this.__open=!!v;
   if(v)this.__at.set("open",""); else this.__at.delete("open");
   if(was!==!!v)this.dispatchEvent({type:"toggle"});
  }
  /* النسبُ */
  appendChild(n){
   if(n.parentElement)n.parentElement.removeChild(n);
   n.parentElement=this;
   this.childNodes.push(n);
   return n;
  }
  insertBefore(n,ref){
   if(!ref)return this.appendChild(n);
   const i=this.childNodes.indexOf(ref);
   if(i<0)return this.appendChild(n);
   if(n.parentElement)n.parentElement.removeChild(n);
   n.parentElement=this;
   this.childNodes.splice(i,0,n);
   return n;
  }
  removeChild(n){
   const i=this.childNodes.indexOf(n);
   if(i>=0){this.childNodes.splice(i,1); n.parentElement=null}
   return n;
  }
  remove(){if(this.parentElement)this.parentElement.removeChild(this)}
  get children(){return this.childNodes.filter(n=>n.nodeType===1)}
  get firstChild(){return this.childNodes[0]||null}
  get firstElementChild(){return this.children[0]||null}
  get childElementCount(){return this.children.length}
  __sib(d){
   const p=this.parentElement;
   if(!p)return null;
   const C=p.children, i=C.indexOf(this);
   return (i<0)?null:(C[i+d]||null);
  }
  get previousElementSibling(){return this.__sib(-1)}
  get nextElementSibling(){return this.__sib(1)}
  get isConnected(){
   for(let n=this;n;n=n.parentElement)
    if(n===this.__doc.documentElement||n===this.__doc.body)
     return true;
   return false;
  }
  /* النصُّ والبناء */
  get textContent(){
   if(this.nodeType===3)return this.__txt;
   return this.childNodes.map(n=>n.textContent).join("");
  }
  set textContent(v){
   this.childNodes.forEach(n=>{n.parentElement=null});
   this.childNodes.length=0;
   if(v!=="")this.appendChild(this.__doc.createTextNode(v));
  }
  get innerHTML(){return this.__html||""}
  set innerHTML(h){
   this.__html=String(h==null?"":h);
   this.childNodes.forEach(n=>{n.parentElement=null});
   this.childNodes.length=0;
   parseHTML(this.__doc,this.__html).forEach(n=>this.appendChild(n));
  }
  insertAdjacentHTML(pos,h){
   const N=parseHTML(this.__doc,String(h||""));
   if(pos==="beforeend")N.forEach(n=>this.appendChild(n));
   else if(pos==="afterbegin")
    N.reverse().forEach(n=>this.insertBefore(n,this.firstChild));
   else if(pos==="beforebegin"&&this.parentElement)
    N.forEach(n=>this.parentElement.insertBefore(n,this));
   else if(pos==="afterend"&&this.parentElement)
    N.reverse().forEach(n=>
     this.parentElement.insertBefore(n,this.nextElementSibling));
  }
  /* الاستعلام */
  matches(sel){
   return String(sel||"").split(",").some(s=>{
    const P=parseSel(s);
    return P.length>0&&matchChain(this,P,null);
   });
  }
  closest(sel){
   for(let n=this;n&&n.nodeType===1;n=n.parentElement)
    if(n.matches(sel))return n;
   return null;
  }
  __all(out){
   this.children.forEach(c=>{out.push(c); c.__all(out)});
   return out;
  }
  querySelectorAll(sel){
   const out=[];
   String(sel||"").split(",").forEach(one=>{
    const P=parseSel(one);
    if(!P.length)return;
    this.__all([]).forEach(el=>{
     if(!matchChain(el,P,this))return;
     if(!out.includes(el))out.push(el);
    });
   });
   return out;
  }
  querySelector(sel){return this.querySelectorAll(sel)[0]||null}
  /* الأحداثُ تصعد — فالتفويضُ على document يعمل كما في الإنتاج */
  addEventListener(t,fn,opt){
   const cap=!!(opt===true||(opt&&opt.capture));
   const k=t+(cap?"!":"");
   const A=this.__L.get(k)||[];
   A.push(fn);
   this.__L.set(k,A);
  }
  removeEventListener(t,fn,opt){
   const cap=!!(opt===true||(opt&&opt.capture));
   const k=t+(cap?"!":"");
   const A=this.__L.get(k)||[];
   const i=A.indexOf(fn);
   if(i>=0)A.splice(i,1);
  }
  dispatchEvent(ev){
   const e=Object.assign({type:"",bubbles:true,defaultPrevented:false,
    target:this, currentTarget:null,
    preventDefault(){e.defaultPrevented=true},
    stopPropagation(){e.__stop=true},
    stopImmediatePropagation(){e.__stop=true}},ev);
   e.target=e.target||this;
   const path=[];
   for(let n=this;n;n=n.parentElement)path.push(n);
   if(this.__doc&&!path.includes(this.__doc))path.push(this.__doc);
   /* الالتقاطُ نزولاً ثم الفقاعةُ صعوداً */
   path.slice().reverse().forEach(n=>{
    if(e.__stop)return;
    (n.__L.get(e.type+"!")||[]).slice()
     .forEach(fn=>{e.currentTarget=n; fn.call(n,e)});
   });
   path.forEach(n=>{
    if(e.__stop)return;
    (n.__L.get(e.type)||[]).slice()
     .forEach(fn=>{e.currentTarget=n; fn.call(n,e)});
    if(e.bubbles===false)e.__stop=true;
   });
   return !e.defaultPrevented;
  }
  click(){
   if(this.disabled)return;
   if(this.type==="checkbox")this.checked=!this.checked;
   if(typeof this.onclick==="function")this.onclick({target:this});
   this.dispatchEvent({type:"click"});
  }
  focus(){this.__doc.activeElement=this}
  blur(){if(this.__doc.activeElement===this)
   this.__doc.activeElement=this.__doc.body}
  scrollIntoView(){}
  /* ═══ المقاسُ مُعلَنٌ لا محسوب ═══
     لا محرِّكَ تخطيطٍ هنا ولا يُزيَّف: الاختبارُ يُعلن الصندوق
     بـsetBox، والشِبهُ يُبلِّغه. وما لم يُعلَن صفرٌ صريحاً —
     فحالةٌ تعتمد على مقاسٍ لم يُعلَن تسقط، ولا تنجح كذباً.

     وطبقةُ الأنماط لا تُقرأ بقصد: style.inlineSize مرآةٌ يكتبها
     البرنامج، فقراءتُها مقياساً تجعل الاختبارَ يفحص ما كتبه
     الكودُ لنفسه — لا ما يراه المستخدم. */
  getBoundingClientRect(){
   const b=this.__box||{x:0,y:0,w:0,h:0};
   return {left:b.x, top:b.y, right:b.x+b.w, bottom:b.y+b.h,
    width:b.w, height:b.h, x:b.x, y:b.y};
  }
  get offsetWidth(){return (this.__box||{}).w||0}
  get offsetHeight(){return (this.__box||{}).h||0}
  get offsetParent(){return this.parentElement}
  /* className مرآةُ السمة لا حقلاً جافّاً: dock يكتب f.className="flt"
     وt.className="zTabs"، وprops سطرَ السجلّ — وبلا هذه لا تُطابِق
     ‏.flt ولا .zTabs، فتُلام الشفرةُ على نقصٍ في المِعمَل. */
  get className(){return this.getAttribute("class")||""}
  set className(v){this.setAttribute("class",String(v))}
  /* id كذلك مرآةُ السمة: icons.js يكتب d.id="icoSheet" كما يفعل أيّ
     كودٍ حقيقيّ يثق بانعكاس الخاصّية على السمة — وبلا هذا الانعكاس
     يضيع المعرّف صامتاً فلا يجده getElementById لاحقاً. */
  get id(){return this.getAttribute("id")||""}
  set id(v){this.setAttribute("id",String(v))}
  /* والاحتواءُ يشمل نفسَه — dock وappmenu وctxmenu وغيرها تسأله
     قبل إغلاق قائمةٍ منبثقة أو لوحةٍ عائمة */
  contains(n){
   for(let p=n;p;p=p.parentElement)if(p===this)return true;
   return false;
  }
 }
 const dashOf=k=>String(k).replace(/[A-Z]/g,c=>"-"+c.toLowerCase());

 const doc={
  __mistarDOM:1,
  createElement(t){
   const tag=String(t).toLowerCase();
   const n=new Node2(doc,tag);
   /* #cv قماشٌ حقيقيّ من shimCanvas، لكنه يبقى عقدةً DOM: يُدمَج
      سلوكُ القماش (width/height/getContext/toBlob/toDataURL) فوق
      Node2 لا بدلاً منه — فتعمل setAttribute وappendChild
      وdataset معه كأي عنصر. */
   if(tag==="canvas"&&CANV){
    const c=CANV.call(null,"canvas");
    const desc=Object.getOwnPropertyDescriptors(c);
    Object.keys(desc).forEach(k=>{
     if(k==="style")return;
     Object.defineProperty(n,k,desc[k]);
    });
   }
   return n;
  },
  createTextNode(s){return new Node2(doc,null,s)},
  createElementNS(ns,t){return doc.createElement(t)}
 };
 doc.documentElement=new Node2(doc,"html");
 doc.body=new Node2(doc,"body");
 doc.documentElement.appendChild(doc.body);
 doc.activeElement=doc.body;
 doc.__L=new Map();
 doc.nodeType=9;
 doc.parentElement=null;
 doc.addEventListener=Node2.prototype.addEventListener;
 doc.removeEventListener=Node2.prototype.removeEventListener;
 doc.dispatchEvent=Node2.prototype.dispatchEvent;
 doc.querySelector=s=>doc.documentElement.querySelector(s);
 doc.querySelectorAll=s=>doc.documentElement.querySelectorAll(s);
 doc.getElementById=id=>doc.documentElement
  .querySelector("#"+id);
 globalThis.document=doc;
 globalThis.Node=Node2;
 setDir("rtl");
 if(!globalThis.devicePixelRatio)globalThis.devicePixelRatio=1;
 if(!globalThis.innerWidth)globalThis.innerWidth=1440;
 if(!globalThis.innerHeight)globalThis.innerHeight=900;
 if(!globalThis.requestAnimationFrame)
  globalThis.requestAnimationFrame=fn=>{fn(0); return 0};
 if(!globalThis.addEventListener){
  const W=new Map();
  globalThis.addEventListener=(t,fn,o)=>{
   const k=t+((o===true||(o&&o.capture))?"!":"");
   const A=W.get(k)||[]; A.push(fn); W.set(k,A);
  };
  globalThis.removeEventListener=(t,fn,o)=>{
   const k=t+((o===true||(o&&o.capture))?"!":"");
   const A=W.get(k)||[];
   const i=A.indexOf(fn);
   if(i>=0)A.splice(i,1);
  };
  globalThis.dispatchEvent=ev=>{
   /* new Event("resize") حقيقيّةٌ في dock/cmdline/ribbon/app:
      "type" فيها خاصّيةُ نموذجٍ (accessor على Event.prototype) لا
      حقلاً مملوكاً، فObject.assign لا ينسخها ويبقى النوعُ فارغاً
      فلا يبلغ مستمعاً. نقرأ ev.type صراحةً قبل الدمج. */
   const t=String((ev&&ev.type)||"");
   const e=Object.assign({type:t,preventDefault(){},
    stopPropagation(){}},ev,{type:t});
   ["!",""].forEach(sfx=>(W.get(e.type+sfx)||[]).slice()
    .forEach(fn=>fn(e)));
   return true;
  };
  globalThis.__winL=W;
 }
 if(!globalThis.confirm)globalThis.confirm=()=>true;
 if(!globalThis.prompt)globalThis.prompt=()=>null;
 if(!globalThis.alert)globalThis.alert=()=>{};
 if(!globalThis.location)globalThis.location={search:""};
 return doc;
}
/* ═══ قارعُ الأحداث ═══
   النقرُ يصعد فيبلغ التفويضَ على document — والمستمعُ في الإنتاج
   هو المستمعُ هنا نفسه. */
export function fire(el,type,ex){
 if(!el)return false;
 return el.dispatchEvent(Object.assign({type},ex||{}));
}
export const click=el=>{
 if(!el)return false;
 el.click();
 return true;
};
export function setVal(el,v){
 if(!el)return false;
 if(el.type==="checkbox")el.checked=!!v;
 else el.value=String(v);
 return el.dispatchEvent({type:"change"});
}
/* ═══ إعلانُ الصندوق ═══
   يفتح ما يعتمد على القياس: قصُّ العرض من الحافة المُثبَّتة في
   RTL، وحصرُ القوائم داخل النافذة، وحصرُ العائمة. وهو إعلانٌ
   صريحٌ لا تخطيطٌ مُستنتَج — فما لم يُعلَن يبقى صفراً. */
export function setBox(el,b){
 if(!el)return null;
 const o=b||{};
 el.__box={x:+o.x||0, y:+o.y||0,
  w:Math.max(0,+o.w||0), h:Math.max(0,+o.h||0)};
 return el.__box;
}
export const boxOf=el=>(el&&el.__box)
 ? Object.assign({},el.__box) : {x:0,y:0,w:0,h:0};
/* ═══ نافذةٌ بمقاسٍ مُعلَن ═══ */
export function setWin(w,h){
 globalThis.innerWidth=Math.max(1,Math.round(w||1440));
 globalThis.innerHeight=Math.max(1,Math.round(h||900));
 if(globalThis.dispatchEvent)
  globalThis.dispatchEvent({type:"resize"});
 return [globalThis.innerWidth,globalThis.innerHeight];
}
/* ═══ الاتجاه ═══ العربيةُ RTL، وحسابُ الحوافّ يتبعه ═══ */
export function setDir(d){
 const v=(d==="ltr")?"ltr":"rtl";
 if(globalThis.document&&globalThis.document.documentElement)
  globalThis.document.documentElement.setAttribute("dir",v);
 globalThis.getComputedStyle=()=>({direction:v,
  getPropertyValue:()=>""});
 return v;
}
/* تسلسلُ سحبٍ كاملٌ: dock وcmdline يُنصتان على النافذة لا العنصر */
export function drag(el,from,to,ex){
 const E=Object.assign({button:0},ex||{});
 if(el)fire(el,"mousedown",Object.assign({clientX:from[0],
  clientY:from[1]},E));
 const N=Math.max(2,(E.steps|0)||3);
 for(let i=1;i<=N;i++){
  const t=i/N;
  globalThis.dispatchEvent({type:"mousemove",
   clientX:Math.round(from[0]+(to[0]-from[0])*t),
   clientY:Math.round(from[1]+(to[1]-from[1])*t)});
 }
 globalThis.dispatchEvent({type:"mouseup",
  clientX:to[0], clientY:to[1]});
 return true;
}
/* ═══ الحصيلة ═══ */
const ST={pass:0,fail:0,skip:0,groups:[],cur:null,fails:[]};
const C={ok:"\x1b[32m",er:"\x1b[31m",wr:"\x1b[33m",
 dim:"\x1b[90m",b:"\x1b[1m",z:"\x1b[0m"};
const F=v=>{
 if(typeof v==="number")return Number.isInteger(v)?String(v)
  :v.toFixed(4);
 if(typeof v==="string")return JSON.stringify(v);
 if(v==null)return String(v);
 try{return JSON.stringify(v)}catch(e){return String(v)}
};
function gBegin(name){
 ST.cur={name,pass:0,fail:0};
 ST.groups.push(ST.cur);
 console.log(`\n${C.b}▸ ${name}${C.z}`);
}
function gBreak(name,e){
 ST.cur.fail++; ST.fail++;
 ST.fails.push(`${name}: انقطعت المجموعة — ${e.message}`);
 console.log(`  ${C.er}✗ انقطعت المجموعة: ${e.message}${C.z}`);
 if(e.stack)console.log(C.dim+e.stack.split("\n").slice(1,4)
  .join("\n")+C.z);
}
export function group(name,fn){
 gBegin(name);
 try{fn()}catch(e){gBreak(name,e)}
 ST.cur=null;
}
/* ═══ مجموعةٌ غير متزامنة ═══
   group تُنادي fn متزامناً ولا تنتظرها، فحالاتُ ما بعد await تقع
   بعد summary() — و process.exit يُنهي العملية قبلها، فالملفّ
   ينجح وهو لم يفحص شيئاً. وتُنادى بـ await فتتسلسل، فلا تتداخل
   مجموعتان على ST.cur الواحد. */
export async function groupAsync(name,fn){
 gBegin(name);
 try{await fn()}catch(e){gBreak(name,e)}
 ST.cur=null;
}
function win(msg){
 ST.pass++;
 if(ST.cur)ST.cur.pass++;
 console.log(`  ${C.ok}✓${C.z} ${msg}`);
}
function lose(msg,got,want){
 ST.fail++;
 if(ST.cur)ST.cur.fail++;
 const line=`${ST.cur?ST.cur.name+": ":""}${msg}`;
 ST.fails.push(line+(want===undefined?""
  :`  (جاء ${F(got)} · المتوقّع ${F(want)})`));
 console.log(`  ${C.er}✗${C.z} ${msg}`);
 if(want!==undefined)
  console.log(`    ${C.dim}جاء ${F(got)} · المتوقّع ${F(want)}${C.z}`);
}
export const ok=(v,msg)=>{v?win(msg):lose(msg,!!v,true)};
/* مساواةٌ صارمة (Object.is): كانت String(a)===String(b) فيتساوى أيّ
   كائنين عاديين ("[object Object]") ومصفوفتان بنفس النصّ ورقمٌ ونصّه.
   للكائنات والمصفوفات استعمل deep(...) */
export const eq=(a,b,msg)=>{
 Object.is(a,b)?win(msg):lose(msg,a,b);
};
export const near=(a,b,tol,msg)=>{
 const t=(tol==null)?1:tol;
 (Math.abs((+a||0)-(+b||0))<=t)
  ? win(msg)
  : lose(`${msg} (تفاوت ${t})`,a,b);
};
export const deep=(a,b,msg)=>{
 (JSON.stringify(a)===JSON.stringify(b))?win(msg):lose(msg,a,b);
};
/* يتوقّع رمياً · re يفحص الرسالة، فالرسالة عندنا جزءٌ من العقد */
export function throws(fn,re,msg){
 let e=null;
 try{fn()}catch(x){e=x}
 if(!e){lose(msg+" (لم يُرمَ شيء)");return null}
 if(re&&!re.test(e.message)){
  lose(msg+" (رسالة غير متوقّعة)",e.message,String(re));
  return e;
 }
 win(msg+` — «${e.message.slice(0,58)}»`);
 return e;
}
export function noThrow(fn,msg){
 try{fn(); win(msg); return true}
 catch(e){lose(msg+`: ${e.message}`); return false}
}
export const skip=msg=>{
 ST.skip++;
 console.log(`  ${C.wr}○${C.z} ${msg} ${C.dim}(مُتخطّى)${C.z}`);
};
/* ═══ الوجودُ قبل الفحص ═══
   ما لم أرَ توقيعَه لا أُخمِّنه: حالةٌ تسقط لاسمٍ خاطئ تُلام على
   الشفرة، وهي أسوأ من غيابها. فالغيابُ يُقال سبباً مكتوباً ويُعَدّ
   متروكاً لا ناجحاً. */
export const have=(M,n)=>!!(M&&typeof M[n]!=="undefined");
export function when(M,names,why,fn){
 const miss=[].concat(names).filter(n=>!have(M,n));
 if(miss.length){skip(`${why} — غائبٌ: ${miss.join(" · ")}`); return 0}
 fn();
 return 1;
}
/* ═══ رِكازُ الأدوات ═══
   tools/* لا يستورد ui/* ولا يلمس document: الأدواتُ تُقاد بـ
   feedPoint و feedText و feedStroke و enter و cancel، وخطّافاتُ
   R.H هي الوصلة التي يملؤها app.js. فلا شِبهَ أحداثٍ يُحتاج —
   يُملأ الوصل وتُلتقَط التقارير، فتُختبَر الأدواتُ سلوكياً كما
   تُستعمَل.

   وharness يبقى ورقةً بلا استيراد: الوحداتُ تُمرَّر وسائط.
   o.hit مرشِّحُ الإصابة (ents.hitTest) · o.invalidate يُبطِل كاش
   المشهد كما يفعل refresh في الواجهة — لا draw، فذلك عقدُ
   الإنتاج نفسه. */
export function toolRig(R,o){
 const O=o||{};
 const log=[], sel=[];
 R.H.draw=()=>{R.preview()};
 R.H.rep=(c,m)=>{log.push({c:String(c||"in"),
  s:String(m==null?"":m)})};
 R.H.prompt=()=>{};
 R.H.refresh=()=>{if(O.invalidate)O.invalidate()};
 R.H.hit=(x,y,k)=>O.hit?O.hit(x,y,k):null;
 R.H.sel=()=>sel.slice();
 R.H.setSel=l=>{sel.length=0; (l||[]).forEach(s=>sel.push(s))};
 R.loadOpts();
 const pick=c=>log.filter(x=>!c||x.c===c);
 return {
  log, sel,
  clear:()=>{log.length=0},
  reps:c=>pick(c).map(x=>x.s),
  last:c=>{
   const A=pick(c);
   return A.length?A[A.length-1].s:"";
  },
  said:(re,c)=>pick(c).some(x=>re.test(x.s)),
  errs:()=>pick("er").map(x=>x.s),
  pick:l=>{sel.length=0; (l||[]).forEach(s=>sel.push(s))},
  /* المؤشّرُ الوهميّ: dirOf وإشارةُ المقاس تقرآنه */
  ghost:(x,y)=>{R.T.ghost=(x==null)?null
   :[Math.round(x),Math.round(y)]},
  /* raw: النقرةُ الخام قبل الالتقاط (snap) — كما يمرّرها canvas */
  at:(x,y,raw)=>R.feedPoint([Math.round(x),Math.round(y)],
   raw?[Math.round(raw[0]),Math.round(raw[1])]:undefined),
  type:s=>R.feedText(s),
  enter:()=>R.enter(),
  esc:()=>R.cancel(true),
  stroke:P=>R.feedStroke(P),
  /* الخياراتُ لزجةٌ بين الجلسات، فتُعاد إلى إعلانها بين الحالات */
  defs:id=>{
   const d=R.findTool(id);
   if(!d)return 0;
   (d.opts||[]).forEach(f=>R.setOpt(d.id,f.k,f.def));
   return (d.opts||[]).length;
  }
 };
}
export function summary(){
 const n=ST.pass+ST.fail;
 console.log(`\n${C.b}════ الحصيلة ════${C.z}`);
 ST.groups.forEach(g=>{
  const c=g.fail?C.er:C.ok;
  console.log(` ${c}${g.fail?"✗":"✓"}${C.z} ${g.name} `
   +`${C.dim}${g.pass}/${g.pass+g.fail}${C.z}`);
 });
 if(ST.fails.length){
  console.log(`\n${C.er}${C.b}الإخفاقات:${C.z}`);
  ST.fails.forEach(f=>console.log(`  • ${f}`));
 }
 const c=ST.fail?C.er:C.ok;
 console.log(`\n${c}${C.b}${ST.pass}/${n} نجحت${C.z}`
  +(ST.fail?`  ${C.er}${ST.fail} أخفقت${C.z}`:"")
  +(ST.skip?`  ${C.wr}${ST.skip} مُتخطّاة${C.z}`:""));
 return ST.fail;
}
export const stats=()=>({...ST});
