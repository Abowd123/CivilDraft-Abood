/* ═══ تصدير SVG ═══
   المسار المتّجه الأصدق للعربية: المتصفّح يرسم النصّ بخطّه، فلا
   مشكلة ترميز ولا تنقيط. المقاس بالمليمتر الورقي والإحداثيات
   بالمليمتر النموذجي.

   والهيئة من io/style.js — مصدرٌ واحد يقرأه الأربعة. وكانت
   هنا نسخةٌ ثالثة اختلفت في صبغة المنطقة وتعبئة solid وطبقة
   الهاشور: نمطان عامّان بلون طبقة الهاشور الثابتة (عبر HLAY) دائماً،
   فهاشور العمود المنفرد يخرج بلونٍ خاطئ ويغيب بإيقاف طبع طبقةٍ أخرى. */
import {S} from "../core/state.js";
import {styleOf,fillOf,hatchOf,ctxOf,HLAY} from "./style.js";

const X=s=>String(s==null?"":s)
 .replace(/&/g,"&amp;").replace(/</g,"&lt;")
 .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const N=v=>String(Math.round((+v||0)*100)/100);

export function toSVG(prims,box,opt){
 const O=Object.assign({dark:0,pad:0,showWarn:false},opt||{});
 const B=box||{x0:0,y0:0,x1:1000,y1:1000};
 const pad=O.pad||0;
 const x0=B.x0-pad, y1=B.y1+pad;
 const W=(B.x1-B.x0)+pad*2, H=(B.y1-B.y0)+pad*2;
 const k=(O.k!=null&&+O.k>0)?+O.k:Math.max(1,S.meta.scale);
 /* الرؤية بمقاس الورقة الاسمية × المقياس، والهندسة تُتَمركَز فيها:
    فالنسبة 1:k بالضبط لا 1:k±خطأَ تدوير. */
 const nom=(O.page&&+O.page.w>0&&+O.page.h>0)?O.page:null;
 const pw=nom?+nom.w:(W/k), ph=nom?+nom.h:(H/k);
 const VW=nom?pw*k:W, VH=nom?ph*k:H;
 const X0=x0-(VW-W)/2, Y1=y1+(VH-H)/2;
 const T=p=>`${N(p[0]-X0)},${N(Y1-p[1])}`;
 const notes=[];
 /* px=1: SVG يعمل في وحدات النموذج مباشرةً */
 const SO=ctxOf("svg",{dark:!!O.dark,k,px:1,minLw:1,notes,
  showWarn:O.showWarn,
  hs:Math.max(8,(S.meta.txtMM*k)*2.5)});
 const out=[];

 out.push(`<?xml version="1.0" encoding="UTF-8"?>\n`);
 out.push(`<svg xmlns="http://www.w3.org/2000/svg" `
  +`width="${N(pw)}mm" height="${N(ph)}mm" `
  +`viewBox="0 0 ${N(VW)} ${N(VH)}">\n`);
 out.push(`<title>${X(S.meta.name||"PLAN")} — `
  +`1:${S.meta.scale}</title>\n`);

 /* ═══ أنماط الهاشور ═══
    نمطٌ لكل طبقةٍ ومقاسٍ يحتاجه، لا نمطان عامّان. وsolid
    تشابكٌ في اتجاهين — كالأربعة الآخرين. */
 const pats=new Map();
 const patKey=(L,solid,sp)=>`${L}|${solid?"s":"h"}|`
  +Math.round(sp);
 /* الزاويةُ في المفتاح: نمطانِ بتباعدٍ واحدٍ وزاويتَين مختلفتَين
    كانا يتشاركان تعريفاً واحداً مطبوعاً rotate(45) — فيُرسَمان
    متشابهَين في SVG ومختلفَين في DXF وPDF. */
 const addPat=(L,solid,sp,css,lw,ang)=>{
  const A=((((+ang||0)%180)+180)%180);
  const key=patKey(L,solid,sp)+"|"+Math.round(A);
  if(pats.has(key))return key;
  pats.set(key,{id:"p"+pats.size,css,sp,lw,solid:solid?1:0,ang:A});
  return key;
 };
 (prims||[]).forEach(g=>{
  if(g.t==="hatch"){
   const hs=hatchOf(g,"svg",SO);
   if(hs.skip)return;
   addPat(g.L||HLAY,hs.solid,hs.sp,hs.css,hs.lw,
    hs.solid?45:((hs.sets&&hs.sets[0]&&hs.sets[0][0])||45));
   return;
  }
  if(g.t==="fill"&&g.style==="hatch"){
   const f=fillOf(g,"svg",SO);
   if(f.skip||!f.hatch)return;
   addPat(g.L||"A-AREA",0,f.sp,f.css,f.lw,45);
  }
 });
 if(pats.size){
  out.push(`<defs>\n`);
  pats.forEach(p=>{
   const s=p.solid?p.sp*0.22:p.sp;
   const sw=N(Math.max(0.5,p.lw));
   /* التشابك: خطٌّ رأسيّ في نمطٍ مُدوَّر ٤٥، وآخر أفقيّ فيه */
   out.push(`<pattern id="${p.id}" patternUnits="userSpaceOnUse" `
    +`width="${N(s)}" height="${N(s)}" `
    +`patternTransform="rotate(${N(p.ang==null?45:p.ang)})">`
    +`<line x1="0" y1="0" x2="0" y2="${N(s)}" `
    +`stroke="${p.css}" stroke-width="${sw}"/>`
    +(p.solid?`<line x1="0" y1="0" x2="${N(s)}" y2="0" `
      +`stroke="${p.css}" stroke-width="${sw}"/>`:"")
    +`</pattern>\n`);
  });
  out.push(`</defs>\n`);
 }
 const patId=key=>{
  const p=pats.get(key);
  return p?p.id:null;
 };
 out.push(`<rect x="0" y="0" width="${N(VW)}" height="${N(VH)}" `
  +`fill="${O.dark?"#0e1216":"#ffffff"}"/>\n`);
 out.push(`<g fill="none" stroke-linecap="round" `
  +`stroke-linejoin="round">\n`);

 (prims||[]).forEach(g=>{
  if(g.t==="fill"){
   const f=fillOf(g,"svg",SO);
   if(f.skip)return;
   const r=g.ring||[];
   if(r.length<3)return;
   const id=f.hatch
    ? patId(patKey(g.L||"A-AREA",0,f.sp)+"|45") : null;
   out.push(`<polygon points="${r.map(T).join(" ")}" `
    +`fill="${(f.hatch&&id)?`url(#${id})`:f.css}" `
    +`fill-opacity="${N(f.a)}" stroke="none"/>\n`);
   return;
  }
  if(g.t==="hatch"){
   const hs=hatchOf(g,"svg",SO);
   if(hs.skip)return;
   /* نفسُ مفتاحِ addPat حرفاً — وإلّا بُني تعريفٌ ولم يُستعمَل */
   const id=patId(patKey(g.L||HLAY,hs.solid,hs.sp)+"|"
    +Math.round((((hs.solid?45
      :((hs.sets&&hs.sets[0]&&hs.sets[0][0])||45))%180)+180)%180));
   if(!id)return;
   (g.loops||[]).forEach(lp=>{
    if(!lp||lp.length<3)return;
    out.push(`<polygon points="${lp.map(T).join(" ")}" `
     +`fill="url(#${id})" fill-rule="evenodd" stroke="none"/>\n`);
   });
   return;
  }
  const st=styleOf(g,"svg",SO);
  if(st.skip)return;
  const w=N(st.lw);
  const ds=st.dash
   ?` stroke-dasharray="${st.dash.map(N).join(",")}"`:"";
  const op=(st.alpha<1)?` stroke-opacity="${N(st.alpha)}"`:"";
  if(g.t==="line"){
   const a=T(g.a).split(","), b=T(g.b).split(",");
   out.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" `
    +`y2="${b[1]}" stroke="${st.css}" `
    +`stroke-width="${w}"${ds}${op}/>\n`);
   return;
  }
  if(g.t==="poly"){
   const pts=(g.pts||[]).map(T).join(" ");
   if(!pts)return;
   out.push(`<${g.cl===0?"polyline":"polygon"} points="${pts}" `
    +`fill="none" stroke="${st.css}" `
    +`stroke-width="${w}"${ds}${op}/>\n`);
   return;
  }
  if(g.t==="arc"){
   const cx=g.cx-X0, cy=Y1-g.cy, r=Math.max(0.5,g.r);
   const sw2=(g.a1||0)-(g.a0||0);
   if(Math.abs(sw2)>=359.5){
    out.push(`<circle cx="${N(cx)}" cy="${N(cy)}" r="${N(r)}" `
     +`fill="none" stroke="${st.css}" `
     +`stroke-width="${w}"${ds}${op}/>\n`);
    return;
   }
   const rd=a=>a*Math.PI/180;
   const p0=[cx+r*Math.cos(rd(g.a0)), cy-r*Math.sin(rd(g.a0))];
   const p1=[cx+r*Math.cos(rd(g.a1)), cy-r*Math.sin(rd(g.a1))];
   /* big من قَدْر الاجتياح لا من نسخته المطبَّعة (السالب كان ٢٧٠)،
      وsweep من علامته: إيجابيُّ SVG في فراغِه (y لأسفل) يساوي عقارب
      الساعة إبصاريّاً، فالنموذجُ الموجبُ (CCW) sweep=0 والسالبُ 1 —
      وكان 0 ثابتاً فسقط السالبُ في طريق ٢٧٠°. */
   const absSw=Math.abs(sw2);
   const big=(absSw%360>180)?1:0;
   const sweep=(sw2<0)?1:0;
   out.push(`<path d="M ${N(p0[0])} ${N(p0[1])} `
    +`A ${N(r)} ${N(r)} 0 ${big} ${sweep} ${N(p1[0])} ${N(p1[1])}" `
    +`fill="none" stroke="${st.css}" `
    +`stroke-width="${w}"${ds}${op}/>\n`);
   return;
  }
  if(g.t==="text"){
   const p=T([g.x,g.y]).split(",");
   const an=/l$/.test(g.al||"")?"start"
    :(/r$/.test(g.al||"")?"end":"middle");
   const bl=/^m/.test(g.al||"")?"central":"alphabetic";
   const rot=g.rot?` rotate(${N(-g.rot)})`:"";
   const fo=(st.alpha<1)?` fill-opacity="${N(st.alpha)}"`:"";
   out.push(`<text transform="translate(${p[0]},${p[1]})${rot}" `
    +`text-anchor="${an}" dominant-baseline="${bl}" `
    +`font-family="Tahoma,Arial,sans-serif" `
    +`font-size="${N(g.h)}" fill="${st.css}" stroke="none" `
    +`direction="rtl"${fo}>${X(g.s)}</text>\n`);
  }
 });
 out.push(`</g>\n</svg>\n`);
 return {txt:out.join(""), notes, hatchCut:0};
}
