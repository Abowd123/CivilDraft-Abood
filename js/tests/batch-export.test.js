/* ═══ التصدير الدفعي — D1 ═══
   node js/tests/batch-export.test.js
   ١) zip.js: بنيةٌ صحيحة (CRC · أسماء UTF-8 · الراية) وحمولةٌ فاسدةٌ تُرفَض.
   ٢) toPDFzMulti: صفحةٌ لكل خطّة، وموارد كل صفحةٍ (قناع عربي · شفافية)
      مُعرَّفةٌ لها لا لغيرها.
   ٣) planForSheet / preflightAll / runAll: ملفٌّ لكل ورقة، أسماءٌ فريدة،
      SVG لا يخرج فارغاً في ZIP، والإلغاء يُسقِط الناتج. */
import {shim,shimCanvas,group,groupAsync,ok,eq,throws,summary} from "./harness.js";
shim(); shimCanvas();
const {S,newState,ensureShape,edit}=await import("../core/state.js");
const W=await import("../core/walls.js");
const RN=await import("../core/render.js");
const SH=await import("../core/sheet.js");
const EX=await import("../io/export.js");
const ZIP=await import("../io/zip.js");
const PDF=await import("../io/pdf.js");

const reset=()=>{newState(); ensureShape(); RN.invalidate()};
const room=()=>{
 const P=[[0,0],[4000,0],[4000,3000],[0,3000]];
 for(let i=0;i<4;i++)W.addWall(P[i],P[(i+1)%4],200,"ext","c");
 RN.invalidate();
};
const mkSheet=(name,size)=>edit(()=>{
 const sh=SH.addSheet({name,size:size||"A3",orient:"l"});
 SH.addViewport(sh.id,{modelRect:{x0:-500,y0:-500,x1:4500,y1:3500},
  paperRect:{x0:20,y0:20,x1:400,y1:280}});
 return sh;
},"ورقة");
const txt=u=>new TextDecoder().decode(u);
const latin=u=>Array.from(u,c=>String.fromCharCode(c)).join("");

/* قارئ ZIP أدنى — يتحقّق من الدليل المركزي لا من ما كتبناه */
function readZip(u){
 const v=new DataView(u.buffer,u.byteOffset,u.byteLength);
 const n=v.getUint16(u.length-22+10,true);
 let p=v.getUint32(u.length-22+16,true);
 const out=[];
 for(let i=0;i<n;i++){
  if(v.getUint32(p,true)!==0x02014b50)throw new Error("central sig");
  const flag=v.getUint16(p+8,true), crc=v.getUint32(p+16,true);
  const sz=v.getUint32(p+24,true), nl=v.getUint16(p+28,true);
  const off=v.getUint32(p+42,true);
  const name=txt(u.subarray(p+46,p+46+nl));
  const lnl=v.getUint16(off+26,true);
  const data=u.subarray(off+30+lnl,off+30+lnl+sz);
  out.push({name,flag,crc,data,date:v.getUint16(p+14,true)});
  p+=46+nl;
 }
 return out;
}

group("zip — بنيةٌ صحيحة وأسماء عربية UTF-8",()=>{
 eq(ZIP.crc32(new TextEncoder().encode("123456789")),0xCBF43926,"CRC32 القياسي");
 const z=ZIP.createZip([
  {name:"معماري.svg",raw:"<svg/>"},
  {name:"b.dxf",raw:new Uint8Array([1,2,3,4])}],
  {date:new Date(2026,8,29,10,0,0)});
 const F=readZip(z);
 eq(F.length,2,"ملفّان");
 eq(F[0].name,"معماري.svg","الاسم العربي سليم");
 ok((F[0].flag&0x0800)!==0,"راية UTF-8 مضبوطة");
 eq(txt(F[0].data),"<svg/>","نصّ SVG محفوظ (لا ملفّ فارغ)");
 eq(Array.from(F[1].data).join(),"1,2,3,4","بايتات DXF");
 eq(F[1].crc,ZIP.crc32(F[1].data),"CRC مطابق");
 ok(F[0].date>0,"تاريخ التعديل صالح لا صفر");
 eq(ZIP.createZip([]).length,22,"ZIP فارغ = EOCD وحده");
 throws(()=>ZIP.createZip([{name:"x",blob:{}}]),null,
  "حمولةٌ بلا بايتات ترمي بدل ملفٍّ فارغ صامت");
});

await groupAsync("toPDFzMulti — صفحةٌ لكل خطّة وموارد كل صفحةٍ لها",async()=>{
 reset();
 const pg=(w,h)=>({w,h,name:"X",or:"أفقي"});
 const box=(w,h)=>({x0:0,y0:0,x1:w,y1:h});
 const line=(L)=>({t:"line",L,a:[10,10],b:[100,50]});
 const plans=[
  {P:[line("A-WALL"),{t:"text",L:"A-DIMS",s:"غرفة",x:50,y:50,h:5,al:"bc",rot:0}],
   box:box(420,297),page:pg(420,297),k:1},
  {P:[line("A-WALL")],box:box(297,210),page:pg(297,210),k:1}];
 const r=await PDF.toPDFzMulti(plans,{});
 const s=latin(r.bytes);
 eq(r.pages,2,"pages=2");
 ok(s.startsWith("%PDF-1.4"),"ترويسة PDF");
 eq((s.match(/\/Type \/Page /g)||[]).length,2,"كائنا صفحة");
 ok(/\/Count 2/.test(s),"/Count 2");
 ok(/MediaBox \[0 0 1190\.55 841\.89\]/.test(s),"مقاس A3 للصفحة الأولى");
 ok(/MediaBox \[0 0 841\.89 595\.28\]/.test(s),"مقاس A4 للصفحة الثانية");
 eq(r.arabic,1,"نصٌّ عربيٌّ واحد");
 eq((s.match(/\/Subtype \/Image/g)||[]).length,1,"قناعٌ واحدٌ فقط");
 /* القناع مُشارٌ إليه من الصفحة الأولى وحدها */
 const pages=s.split("/Type /Page ").slice(1);
 ok(/\/XObject/.test(pages[0]),"الصفحة ١ تحمل XObject");
 ok(!/\/XObject/.test(pages[1].split("endobj")[0]),"الصفحة ٢ بلا XObject");
 /* xref: كل إزاحةٍ تشير إلى «n 0 obj» */
 const xs=s.indexOf("\nxref\n")+1;
 const rows=s.slice(xs).split("\n").slice(3);
 let bad=0, n=0;
 for(let i=1;;i++){
  const m=/^(\d{10}) 00000 n $/.exec(rows[i-1]||"");
  if(!m)break;
  n++;
  if(!s.startsWith(`${i} 0 obj`,+m[1]))bad++;
 }
 ok(n>=8,`جدول xref فيه ${n} مدخلاً`);
 eq(bad,0,"كل مدخل xref يشير إلى كائنه");
 await (async()=>{
  let err=null;
  try{await PDF.toPDFzMulti([],{})}catch(e){err=e}
  ok(err,"بلا خطط ترمي");
 })();
});

await groupAsync("planForSheet / preflightAll",async()=>{
 reset(); room();
 const a=mkSheet("معماري"), b=mkSheet("إنشائي","A4");
 const pa=EX.planForSheet(a,"svg");
 eq(pa.mode,"vports","وضع vports");
 eq(pa.page.w,420,"عرض A3");
 eq(EX.planForSheet(b,"svg").page.w,297,"عرض A4 أفقي");
 ok(pa.P.length>0,"أوّليات الورقة غير فارغة");
 eq(pa.name,"معماري.svg","اسم الملف من الورقة");
 eq(EX.preflightAll("svg").filter(m=>m.lv==="er").length,0,"لا er");
 /* منفذٌ لا يرى شيئاً ⇒ er باسم الورقة */
 edit(()=>SH.addViewport(SH.addSheet({name:"فارغة"}).id,
  {modelRect:{x0:90000,y0:90000,x1:91000,y1:91000},
   paperRect:{x0:10,y0:10,x1:100,y1:100}}),"فارغة");
 ok(EX.preflightAll("svg").some(m=>m.lv==="er"&&/فارغة/.test(m.s)),
  "الورقة الفارغة ⇒ er باسمها");
});

await groupAsync("runAll — ZIP بملفٍّ لكل ورقة",async()=>{
 reset(); room();
 mkSheet("معماري"); mkSheet("معماري"); mkSheet("إنشائي");
 /* بلا allSheets ⇒ السلوك القديم */
 const one=await EX.runAll("svg",{});
 eq(one.ok,1,"بلا allSheets يعمل run القديم");
 ok(!one.files,"ولا files");
 for(const fmt of ["svg","dxf"]){
  const r=await EX.runAll(fmt,{allSheets:1});
  eq(r.ok,1,`${fmt}: ok`);
  eq(r.files.length,3,`${fmt}: ثلاثة ملفّات`);
  const names=r.files.map(f=>f.name);
  eq(new Set(names.map(x=>x.toLowerCase())).size,3,`${fmt}: أسماءٌ فريدة`);
  ok(names.includes(`معماري-2.${fmt}`),`${fmt}: المكرَّر يُرقَّم`);
  const Z=readZip(r.zip.raw);
  eq(Z.length,3,`${fmt}: ثلاثة داخل ZIP`);
  ok(Z.every(f=>f.data.length>100),`${fmt}: لا ملفّ فارغ في ZIP`);
  ok(Z.every(f=>f.crc===ZIP.crc32(f.data)),`${fmt}: CRC سليم`);
  if(fmt==="svg")ok(/<svg/.test(txt(Z[0].data)),"SVG نصٌّ سليم داخل ZIP");
 }
 const f=await EX.runAll("svg",{allSheets:1,allMode:"files"});
 ok(f.files.length===3&&!f.zip,"وضع files بلا ZIP");
 /* png/pdf بلا متصفّح: مسارٌ بلا قماش يُبلَّغ */
 const ac=new AbortController(); ac.abort();
 const c=await EX.runAll("svg",{allSheets:1,signal:ac.signal});
 eq(c.ok,0,"الإلغاء المسبق ⇒ ok:0");
 ok(c.report.some(m=>/أُلغي/.test(m.s)),"ورسالة الإلغاء");
 let n=0;
 const c2=await EX.runAll("svg",{allSheets:1,signal:{get aborted(){return ++n>3}}});
 eq(c2.ok,0,"الإلغاء أثناء الحلقة يُسقِط الناتج كلّه");
});

await groupAsync("runAll — PDF مجمَّع",async()=>{
 reset(); room();
 mkSheet("معماري"); mkSheet("إنشائي","A4");
 const r=await EX.runAll("pdf",{allSheets:1,allMode:"singlePdf"});
 eq(r.ok,1,"ok");
 ok(/كل_الأوراق\.pdf$/.test(r.name),"الاسم");
 ok(latin(r.raw.subarray(0,8)).startsWith("%PDF-1.4"),"PDF صالح");
 ok(/\/Count 2/.test(latin(r.raw)),"صفحتان");
 const z=await EX.runAll("pdf",{allSheets:1});
 eq(z.files.length,2,"وضع zip للـPDF: ملفٌّ لكل ورقة");
 ok(latin(z.files[0].raw.subarray(0,5))==="%PDF-","محتوى الملفّ PDF");
});

process.exit(summary()?1:0);
