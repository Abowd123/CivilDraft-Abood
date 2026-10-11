/* ═══ كاتب PDF 1.4 يدوياً ═══
   الهندسة متّجهة كاملةً. النصّ: ما كان لاتينياً أو رقمياً يُكتَب
   بخطّ Helvetica المدمَج في القارئ، وما كان عربياً يُدرَج قناعاً
   أحاديّ البِت لكل نصّ فريد — لأن الخطوط الأربعة عشر القياسية لا
   تحمل العربية، وتضمين خطٍّ يحتاج ملفّ خطّ.

   والهيئة من io/style.js — مصدرٌ واحد يقرأه الأربعة. وكان هنا
   جدولُ ألوانٍ ثالث، ونسخةٌ ثانية من hatchLines بتبريرٍ غير صحيح،
   وتجاهلٌ لـplots() وللشرطة والشفافية، ولونٌ معتمٌ حرفيّ لصبغة
   المنطقة يخالف الشاشة اختلافاً لا يُخطَأ.

   لا اعتماديات: الضغط بـCompressionStream المدمج في المتصفّح. */
import {S} from "../core/state.js";
import {clamp} from "../core/units.js";
import {styleOf,fillOf,hatchOf,hatchLines,ctxOf} from "./style.js";

const MM2PT=72/25.4;
const ASCII=/^[\x20-\x7E]*$/;
/* عروض Helvetica لأشيع المحارف (لكل ١٠٠٠) */
const WID={32:278,37:889,40:333,41:333,43:584,44:278,45:333,46:278,
 47:278,48:556,49:556,50:556,51:556,52:556,53:556,54:556,55:556,
 56:556,57:556,58:278,88:667,120:500};
const strW=(s,size)=>{
 let w=0;
 for(let i=0;i<s.length;i++){
  const c=s.charCodeAt(i);
  w+=(WID[c]!=null?WID[c]:((c>=65&&c<=90)?722:556));
 }
 return w/1000*size;
};
const esc=s=>String(s).replace(/\\/g,"\\\\")
 .replace(/\(/g,"\\(").replace(/\)/g,"\\)");
const N=v=>String(Math.round((+v||0)*100)/100);
const enc=s=>{
 const a=new Uint8Array(s.length);
 for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i)&0xff;
 return a;
};
/* المُحلّ يعيد css نصّاً، وPDF يريد ٠–١ */
const hex2rgb=h=>{
 const s=String(h||"#000000").replace("#","");
 const n=(s.length===3)
  ? s.split("").map(c=>parseInt(c+c,16))
  : [parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),
     parseInt(s.slice(4,6),16)];
 return n.map(v=>(isFinite(v)?v:0)/255);
};
/* ═══ قناع نصٍّ عربي ═══
   الخطوط الأربعة عشر القياسية لا تحمل العربية، وتضمين خطٍّ يحتاج
   ملفّ خطّ. فالنصّ صورة — لكن قناعاً لا صورةً ملوّنة:
   · بلا خلفية معتمة تحجب ما تحتها (كانت JPEG أبيض)
   · بلون طبقته لا أسودَ ثابتاً (كان الأسود، فأرقام الأبعاد
     اللاتينية تخرج بلون A-DIMS وأسماء الغرف سوداء)
   · بِتٌّ لكل بكسل بدل ثلاثة بايتات — نحو ٣٪ من الحجم */
function textMask(str,px){
 const h=clamp(Math.round(px),10,220);
 const m=document.createElement("canvas").getContext("2d");
 m.font=`${h}px Tahoma,Arial,sans-serif`;
 m.direction="rtl";
 const w=Math.max(4,
  Math.ceil(m.measureText(str).width)+Math.ceil(h*0.3));
 const H=Math.ceil(h*1.42);
 const c=document.createElement("canvas");
 c.width=w; c.height=H;
 const x=c.getContext("2d");
 x.fillStyle="#ffffff"; x.fillRect(0,0,w,H);
 x.font=`${h}px Tahoma,Arial,sans-serif`;
 x.direction="rtl"; x.textAlign="center";
 x.textBaseline="alphabetic";
 x.fillStyle="#000000";
 x.fillText(str,w/2,H-Math.round(h*0.30));
 /* أحاديّ البِت مصفوفاً بالصفوف: ١ يُطلى (Decode [1 0]).
    والصفّ الأول في بيانات الصورة هو أعلاها، كما في القماش. */
 const im=x.getImageData(0,0,w,H).data;
 const rowB=Math.ceil(w/8);
 const bits=new Uint8Array(rowB*H);
 for(let y=0;y<H;y++)for(let xx=0;xx<w;xx++){
  const a=im[(y*w+xx)*4];                /* الرمادي = R */
  if(a<128)bits[y*rowB+(xx>>3)]|=(0x80>>(xx&7));
 }
 return {data:bits, w, h:H, base:Math.round(h*0.30)/H,
  mask:1, rowB};
}
/* نصُّ PDF بالعربية يحتاج UTF-16BE ببادئة BOM: البايتات الخام
   تُقرأ خربشةً في القارئ — العلّة نفسها التي كانت في CP1256
   (الدفعة ٦)، وهنا الحلّ سلسلةٌ سِتّ عشريّة. */
const hex16=s=>{
 let h="FEFF";
 for(const ch of String(s==null?"":s).slice(0,120)){
  let c=ch.codePointAt(0);
  if(c>0xFFFF){
   c-=0x10000;
   h+=(0xD800+(c>>10)).toString(16).toUpperCase().padStart(4,"0");
   h+=(0xDC00+(c&0x3FF)).toString(16).toUpperCase().padStart(4,"0");
   continue;
  }
  h+=c.toString(16).toUpperCase().padStart(4,"0");
 }
 return "<"+h+">";
};
/* ═══ البناء ═══ */
export function toPDF(prims,box,opt){
 const O=Object.assign({pad:0,showWarn:false},opt||{});
 const B=box||{x0:0,y0:0,x1:1000,y1:1000};
 const pad=O.pad||0;
 const x0=B.x0-pad, y0=B.y0-pad;
 const W=(B.x1-B.x0)+pad*2, H=(B.y1-B.y0)+pad*2;
 const k=(O.k!=null&&+O.k>0)?+O.k:Math.max(1,S.meta.scale);
 /* ═══ الصفحة الاسمية ═══
    sheetRect يعيد المليمتر النموذجيَّ مُدوَّراً، فالصفحة المشتقّة
    منه ٤١٩٫٩٨ مم لا ٤٢٠ — والطابعة تُقيس على الاسميّ فتُصغِّر إلى
    «احتواء»، فالمقياس المطبوع ليس ١:١٠٠.
    فالمقاس اسميٌّ والهندسة تُتَمركَز فيه: الفرق دون المليمتر
    ويُقسَم على الجانبين، والنسبة تبقى 1:k بالضبط. */
 const cW=W/k*MM2PT, cH=H/k*MM2PT;
 const pg=(O.page&&+O.page.w>0&&+O.page.h>0)
  ? {pw:+O.page.w*MM2PT, ph:+O.page.h*MM2PT} : null;
 const pw=pg?pg.pw:cW, ph=pg?pg.ph:cH;
 const ox=pg?(pw-cW)/2:0, oy=pg?(ph-cH)/2:0;
 const S2=MM2PT/k;                       /* نموذج مم → نقطة */
 const X=v=>N((v-x0)*S2+ox), Y=v=>N((v-y0)*S2+oy);
 const notes=O.notes||[];
 /* px=S2: الوزن والشرطة بالنقاط مباشرةً */
 const SO=ctxOf("pdf",{dark:0,k,px:S2,minLw:0.15,notes,
  showWarn:O.showWarn!==false&&!!O.showWarn,
  hs:Math.max(8,(S.meta.txtMM*k)*2.5), hatchCut:0});
 const sty=g=>{
  const s=styleOf(g,"pdf",SO);
  if(!s.skip)s.rgb=hex2rgb(s.css);
  return s;
 };
 let c="";
 let cc=null, cw=null, cd=null;
 const setCol=v=>{
  const s=`${N(v[0])} ${N(v[1])} ${N(v[2])}`;
  if(s===cc)return;
  cc=s; c+=`${s} RG\n${s} rg\n`;
 };
 const setW=v=>{
  const s=N(v);
  if(s===cw)return;
  cw=s; c+=`${s} w\n`;
 };
 const setDash=d=>{
  /* الشرطة بالنقاط سلفاً (px=S2 في المُحلّ) */
  const s=(d&&d.length)?`[${d.map(N).join(" ")}] 0`:"[] 0";
  if(s===cd)return;
  cd=s; c+=`${s} d\n`;
 };
 /* ═══ حالات الشفافية ═══
    واحدةٌ لكل قيمةٍ مستعملة: CAPS تُعلن أن PDF يحمل الشفافية،
    فلا يجوز أن تُطبَّق على الصبغة وحدها. */
 const GS=new Map();
 const gsOf=a=>{
  const key=N(a);
  let g=GS.get(key);
  if(!g){g={name:"GA"+GS.size, a:+a}; GS.set(key,g)}
  return g.name;
 };
 const poly=(pts,cl)=>{
  pts.forEach((p,i)=>{
   c+=`${X(p[0])} ${Y(p[1])} ${i?"l":"m"}\n`;
  });
  if(cl!==0)c+="h\n";
 };
 const arc=(cx,cy,r,a0,a1)=>{
  /* PDF يقرأ Y كالنموذج (صاعداً)، فالاجتياحُ موقَّع كما هو يحمل
     اتجاهه للخطوة st (موجبة CCW وسالبة CW)؛ وكان while(sw<0) يُكمل
     السالبَ إلى موجبه الطويل فتُرسَم ٢٧٠° بدل ٩٠، وif(sw<0.05)
     يضخِّم الدقيقَ دائرةً كاملة. */
  const sw=(a1||0)-(a0||0);
  const n=Math.max(1,Math.ceil(Math.abs(sw)/90));
  const st=sw/n, rd=a=>a*Math.PI/180;
  const P=a=>[cx+r*Math.cos(rd(a)), cy+r*Math.sin(rd(a))];
  const p=P(a0);
  c+=`${X(p[0])} ${Y(p[1])} m\n`;
  const t=(4/3)*Math.tan(rd(st)/4);
  for(let i=0;i<n;i++){
   const A=a0+st*i, Bg=A+st;
   const pa=P(A), pb=P(Bg);
   const c1=[pa[0]-t*r*Math.sin(rd(A)), pa[1]+t*r*Math.cos(rd(A))];
   const c2=[pb[0]+t*r*Math.sin(rd(Bg)),pb[1]-t*r*Math.cos(rd(Bg))];
   c+=`${X(c1[0])} ${Y(c1[1])} ${X(c2[0])} ${Y(c2[1])} `
    +`${X(pb[0])} ${Y(pb[1])} c\n`;
  }
 };
 const imgs=new Map();
 let arabic=0;

 c+=`q\n1 1 1 rg\n0 0 ${N(pw)} ${N(ph)} re f\n`;
 setW(0.5); setDash(null);

 /* ═══ التعبئات ═══ نقشُ خطوطٍ مولَّد صريحاً — لا أنماط PDF ═══ */
 (prims||[]).forEach(g=>{
  if(g.t==="fill"){
   const f=fillOf(g,"pdf",SO);
   if(f.skip)return;
   const r=g.ring||[];
   if(r.length<3)return;
   if(f.hatch){
    /* المنطقة المهشَّرة: خطوطٌ بلون طبقتها — وكانت تُصدَّر
       لوناً معتماً واحداً يخالف الشاشة */
    setCol(hex2rgb(f.css)); setW(f.lw);
    const H2=hatchLines([r],45,f.sp);
    SO.hatchCut+=H2.cut;
    H2.lines.forEach(s=>{
     c+=`${X(s[0][0])} ${Y(s[0][1])} m `
      +`${X(s[1][0])} ${Y(s[1][1])} l S\n`;
    });
    return;
   }
   /* لون الطبقة بشفافيةٍ حقيقية */
   c+=`q /${gsOf(f.a)} gs\n`;
   setCol(hex2rgb(f.css));
   poly(r,1); c+="f\nQ\n";
   cc=null;
   return;
  }
  if(g.t!=="hatch")return;
  const hs=hatchOf(g,"pdf",SO);        /* g.L لا اسمٌ حرفيّ */
  if(hs.skip)return;
  setCol(hex2rgb(hs.css)); setW(hs.lw);
  hs.sets.forEach(([ang,d])=>{
   const H2=hatchLines(g.loops,ang,d);
   SO.hatchCut+=H2.cut;
   H2.lines.forEach(s=>{
    c+=`${X(s[0][0])} ${Y(s[0][1])} m `
     +`${X(s[1][0])} ${Y(s[1][1])} l S\n`;
   });
  });
 });
 /* ═══ خطوط ونصوص ═══ */
 (prims||[]).forEach(g=>{
  if(g.t==="hatch"||g.t==="fill")return;
  const st=sty(g);
  if(st.skip)return;                   /* المخفيّ وما لا يُطبَع */
  const tr=(st.alpha<1);
  if(tr)c+=`q /${gsOf(st.alpha)} gs\n`;
  setCol(st.rgb);
  setW(st.lw);
  setDash(st.dash);            /* دَشّ الطبقة صار مُطبَّقاً */
  if(g.t==="line"){
   c+=`${X(g.a[0])} ${Y(g.a[1])} m ${X(g.b[0])} ${Y(g.b[1])} l S\n`;
  }else if(g.t==="poly"){
   if(g.pts&&g.pts.length>1){poly(g.pts,g.cl); c+="S\n"}
  }else if(g.t==="arc"){
   arc(g.cx,g.cy,Math.max(0.1,g.r),g.a0,g.a1); c+="S\n";
  }else if(g.t==="text"){
   const size=g.h*S2;
   if(size>=1.2){
    const s=String(g.s);
    const a=(g.rot||0)*Math.PI/180;
    const ca=Math.cos(a), sa=Math.sin(a);
    if(ASCII.test(s)){
     const w=strW(s,size);
     const ax=/l$/.test(g.al||"")?0:(/r$/.test(g.al||"")?-w:-w/2);
     const ay=/^m/.test(g.al||"")?-size*0.36:0;
     const px=(g.x-x0)*S2+ax*ca-ay*sa+ox;
     const py=(g.y-y0)*S2+ax*sa+ay*ca+oy;
     c+=`BT /F1 ${N(size)} Tf ${N(ca)} ${N(sa)} ${N(-sa)} ${N(ca)} `
      +`${N(px)} ${N(py)} Tm (${esc(s)}) Tj ET\n`;
    }else{
     /* عربي → قناع بلون الطبقة */
     arabic++;
     const key=s+"|"+Math.round(size*4);
     if(!imgs.has(key))imgs.set(key,
      Object.assign(textMask(s,Math.max(14,size*4)),
       {name:"Im"+(imgs.size+1)}));
     const im=imgs.get(key);
     const hpt=size*1.42;
     const wpt=hpt*(im.w/im.h);
     const ax=/l$/.test(g.al||"")?0
      :(/r$/.test(g.al||"")?-wpt:-wpt/2);
     const ay=/^m/.test(g.al||"")?(-hpt*0.5):(-im.base*hpt);
     const px=(g.x-x0)*S2+ax*ca-ay*sa+ox;
     const py=(g.y-y0)*S2+ax*sa+ay*ca+oy;
     /* القناع يُطلى بلون التعبئة الجاري — فيُضبَط قبله */
     const cs=`${N(st.rgb[0])} ${N(st.rgb[1])} ${N(st.rgb[2])}`;
     c+=`q ${cs} rg `
      +`${N(wpt*ca)} ${N(wpt*sa)} ${N(-hpt*sa)} ${N(hpt*ca)} `
      +`${N(px)} ${N(py)} cm /${im.name} Do Q\n`;
     cc=null; cw=null; cd=null;
    }
   }
  }
  if(tr){c+="Q\n"; cc=null; cw=null; cd=null}
 });
 c+="Q\n";

 /* ═══ تجميع الملفّ ═══ */
 const chunks=[], offs=[];
 let len=0;
 const push=u=>{chunks.push(u); len+=u.length};
 const obj=(n,body,bin)=>{
  offs[n]=len;
  push(enc(`${n} 0 obj\n`));
  push(enc(body));
  if(bin){push(bin); push(enc("\nendstream\n"))}
  push(enc("endobj\n"));
 };
 const IM=[...imgs.values()];
 const GL=[...GS.values()];
 const nImg0=6;
 const nGs0=6+IM.length;
 const nInfo=6+IM.length+GL.length;
 const total=nInfo;
 push(enc("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"));
 obj(1,`<< /Type /Catalog /Pages 2 0 R >>\n`);
 obj(2,`<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n`);
 const xo=IM.length
  ? ` /XObject << ${IM.map((im,i)=>
     `/${im.name} ${nImg0+i} 0 R`).join(" ")} >>` : "";
 const xg=GL.length
  ? ` /ExtGState << ${GL.map((g,i)=>
     `/${g.name} ${nGs0+i} 0 R`).join(" ")} >>` : "";
 obj(3,`<< /Type /Page /Parent 2 0 R /MediaBox `
  +`[0 0 ${N(pw)} ${N(ph)}] /Resources << /Font << /F1 5 0 R >>`
  +`${xo}${xg} >> /Contents 4 0 R >>\n`);
 const cs=enc(c);
 let body=cs, filt="";
 if(O.deflated&&O.deflated.length){
  body=O.deflated; filt=" /Filter /FlateDecode";
 }
 obj(4,`<< /Length ${body.length}${filt} >>\nstream\n`,body);
 obj(5,`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica `
  +`/Encoding /WinAnsiEncoding >>\n`);
 IM.forEach((im,i)=>{
  obj(nImg0+i,`<< /Type /XObject /Subtype /Image /Width ${im.w} `
   +`/Height ${im.h} /ImageMask true /Decode [1 0] `
   +`/BitsPerComponent 1 /Length ${im.data.length} >>\nstream\n`,
   im.data);
 });
 GL.forEach((g,i)=>{
  obj(nGs0+i,`<< /Type /ExtGState /ca ${N(g.a)} /CA ${N(g.a)} >>\n`);
 });
 /* بلوك العنوان يبلغ القارئ: اسمُ اللوحة يُرى في شريطه، ورقمُها
    ومراجعتُها في خصائص الملفّ — وكانت تُطبَع على الورق ولا تصل
    البيانات الوصفية. */
 const IF=O.info||{};
 const ttl=[IF.title,IF.sheet,IF.rev&&IF.rev!=="0"?"مر"+IF.rev:""]
  .filter(Boolean).join(" — ");
 obj(nInfo,`<< /Title ${hex16(ttl||"لوحة")} `
  +`/Subject ${hex16(IF.proj||"")} `
  +`/Author ${hex16(IF.by||"")} `
  +`/Creator ${hex16("CivilDraft")} /Producer ${hex16("CivilDraft")} >>\n`);
 const xref=len;
 let x=`xref\n0 ${total+1}\n0000000000 65535 f \n`;
 for(let i=1;i<=total;i++)
  x+=String(offs[i]||0).padStart(10,"0")+" 00000 n \n";
 x+=`trailer\n<< /Size ${total+1} /Root 1 0 R `
  +`/Info ${nInfo} 0 R >>\n`
  +`startxref\n${xref}\n%%EOF\n`;
 push(enc(x));

 const out=new Uint8Array(len);
 let p=0;
 chunks.forEach(u=>{out.set(u,p); p+=u.length});
 return {bytes:out, arabic, images:IM.length, gs:GL.length,
  pw:pw/MM2PT, ph:ph/MM2PT, notes, hatchCut:SO.hatchCut,
  stream:cs, res:{images:IM, gs:GL}};
}
/* ═══ الضغط ═══
   CompressionStream في المتصفّح بلا مكتبة، فالوعد المُعلَن
   («لا اعتماديات») قائم. ومجرى المحتوى نصٌّ فيضغط خمسةً إلى
   عشرة أضعاف — والهندسة الكثيفة تُخرِج ملفّاتٍ بالميغابايتات.

   بناءٌ أوّل لاستخراج المجرى، ثم ضغطُه، ثم بناءٌ ثانٍ به. البناء
   رخيصٌ مقابل الضغط، والبديل تفكيكُ toPDF إلى مرحلتين. */
export async function toPDFz(prims,box,opt){
 const O=Object.assign({},opt||{});
 const r1=toPDF(prims,box,O);
 if(typeof CompressionStream==="undefined"
  ||typeof Blob==="undefined"
  ||typeof Response==="undefined"
  ||!r1.stream)return r1;
 let z=null;
 try{
  const cz=new Blob([r1.stream]).stream()
   .pipeThrough(new CompressionStream("deflate"));
  z=new Uint8Array(await new Response(cz).arrayBuffer());
 }catch(e){return r1}
 if(!z||z.length>=r1.stream.length)return r1;   /* لم يفد */
 const r2=toPDF(prims,box,Object.assign({},O,{deflated:z}));
 r2.zip={from:r1.stream.length, to:z.length};
 return r2;
}

/* ═══ PDF متعدّد الصفحات — D ═══
   كل خطّةٍ صفحةٌ بمقاسها. لا نُعيد كتابة منطق الرسم: toPDF تبني مجرى
   الصفحة وموارده (أقنعة العربية وحالات الشفافية) وتعيدها في r.stream
   وr.res، وهنا يُجمَع كلُّ ذلك في ملفٍّ واحد.
   وأسماء الموارد (Im1 · GA0) مكرَّرةٌ بين الصفحات بقصد: لكل صفحةٍ قاموسُ
   موارد خاصٌّ يشير إلى كائناتها هي، فلا تصادم. والخطّ F1 مشترك.
   المجرى يُضغَط بـFlateDecode حيث يتوفّر CompressionStream. */
async function deflateBytes(u8){
 if(typeof CompressionStream==="undefined"||typeof Blob==="undefined"
  ||typeof Response==="undefined")return null;
 try{
  const cz=new Blob([u8]).stream()
   .pipeThrough(new CompressionStream("deflate"));
  const z=new Uint8Array(await new Response(cz).arrayBuffer());
  return (z.length&&z.length<u8.length)?z:null;
 }catch(e){return null}
}
export async function toPDFzMulti(plans,opt){
 const O=Object.assign({showWarn:false},opt||{});
 const L=Array.isArray(plans)?plans:[];
 if(!L.length)throw new Error("PDF متعدّد الصفحات بلا خطط");
 const T=O.title||S.title||{};
 const built=[];
 let arabic=0, images=0, hatchCut=0;
 const notes=[];
 for(const pl of L){
  const r=toPDF(pl.P,pl.box,{pad:0,showWarn:O.showWarn,page:pl.page,
   k:pl.k||1,notes:[]});
  if(!r.stream)throw new Error("toPDF لم تُعِد مجرى الصفحة");
  const z=await deflateBytes(r.stream);
  built.push({r,z});
  arabic+=r.arabic||0; images+=r.images||0; hatchCut+=r.hatchCut||0;
  (r.notes||[]).forEach(m=>{if(notes.indexOf(m)<0)notes.push(m)});
 }
 /* ترقيم الكائنات: 1 فهرس · 2 صفحات · ثم لكل صفحةٍ: الصفحة والمحتوى
    وأقنعتها وشفافياتها · ثم الخطّ والمعلومات */
 let next=3;
 built.forEach(b=>{
  b.pageId=next++; b.contentId=next++;
  b.imgIds=b.r.res.images.map(()=>next++);
  b.gsIds=b.r.res.gs.map(()=>next++);
 });
 const nFont=next++, nInfo=next++, total=nInfo;
 const chunks=[], offs=[];
 let len=0;
 const push=u=>{chunks.push(u); len+=u.length};
 const obj=(n,body,bin)=>{
  offs[n]=len;
  push(enc(`${n} 0 obj\n`)); push(enc(body));
  if(bin){push(bin); push(enc("\nendstream\n"))}
  push(enc("endobj\n"));
 };
 push(enc("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"));
 obj(1,`<< /Type /Catalog /Pages 2 0 R >>\n`);
 obj(2,`<< /Type /Pages /Kids [${built.map(b=>`${b.pageId} 0 R`).join(" ")}] `
  +`/Count ${built.length} >>\n`);
 built.forEach(b=>{
  const {r}=b, IM=r.res.images, GL=r.res.gs;
  const xo=IM.length?` /XObject << ${IM.map((im,i)=>
   `/${im.name} ${b.imgIds[i]} 0 R`).join(" ")} >>`:"";
  const xg=GL.length?` /ExtGState << ${GL.map((g,i)=>
   `/${g.name} ${b.gsIds[i]} 0 R`).join(" ")} >>`:"";
  obj(b.pageId,`<< /Type /Page /Parent 2 0 R /MediaBox `
   +`[0 0 ${N(r.pw*MM2PT)} ${N(r.ph*MM2PT)}] `
   +`/Resources << /Font << /F1 ${nFont} 0 R >>${xo}${xg} >> `
   +`/Contents ${b.contentId} 0 R >>\n`);
  const body=b.z||r.stream;
  obj(b.contentId,`<< /Length ${body.length}${b.z?" /Filter /FlateDecode":""} >>\nstream\n`,body);
  IM.forEach((im,i)=>obj(b.imgIds[i],
   `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} `
   +`/ImageMask true /Decode [1 0] /BitsPerComponent 1 `
   +`/Length ${im.data.length} >>\nstream\n`,im.data));
  GL.forEach((g,i)=>obj(b.gsIds[i],
   `<< /Type /ExtGState /ca ${N(g.a)} /CA ${N(g.a)} >>\n`));
 });
 obj(nFont,`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica `
  +`/Encoding /WinAnsiEncoding >>\n`);
 const IF=O.info||{title:S.meta.name, sheet:"كل الأوراق",
  rev:T.rev, by:T.by, proj:T.proj};
 const ttl=[IF.title,IF.sheet,IF.rev&&IF.rev!=="0"?"مر"+IF.rev:""]
  .filter(Boolean).join(" — ");
 obj(nInfo,`<< /Title ${hex16(ttl||"لوحة")} `
  +`/Subject ${hex16(IF.proj||"")} /Author ${hex16(IF.by||"")} `
  +`/Creator ${hex16("CivilDraft")} /Producer ${hex16("CivilDraft")} >>\n`);
 const xref=len;
 let x=`xref\n0 ${total+1}\n0000000000 65535 f \n`;
 for(let i=1;i<=total;i++)
  x+=String(offs[i]||0).padStart(10,"0")+" 00000 n \n";
 x+=`trailer\n<< /Size ${total+1} /Root 1 0 R /Info ${nInfo} 0 R >>\n`
  +`startxref\n${xref}\n%%EOF\n`;
 push(enc(x));
 const out=new Uint8Array(len);
 let q=0;
 chunks.forEach(u=>{out.set(u,q); q+=u.length});
 return {bytes:out, arabic, images, pages:built.length, notes, hatchCut,
  pw:built[0].r.pw, ph:built[0].r.ph};
}
