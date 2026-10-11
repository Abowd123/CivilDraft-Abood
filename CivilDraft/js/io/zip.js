/* ═══ ZIP بلا اعتماديات — STORE فقط ═══
   لا ضغط: ملفّاتُ PDF وPNG مضغوطةٌ أصلاً، وSVG وDXF نصٌّ صغير.
   ثلاثة قرارات مُعلَنة:
   ١ · أسماء الملفّات UTF-8 صراحةً (الراية 0x0800): أسماء الأوراق عربية،
       وبلا الراية تقرؤها أدواتٌ كثيرة بـCP437 فتخرج خربشة.
   ٢ · الحمولة بايتاتٌ حاضرة (Uint8Array أو نصّ) — لا Blob: قراءتُه
       غير متزامنة، والمُنادي (runAll) يحوّله قبل الاستدعاء. وما ليس
       بايتاتٍ يرمي بدل أن يُكتَب ملفّاً فارغاً بصمت.
   ٣ · وقتُ التعديل حقيقيّ (أو opt.date للاختبار) لا صفر: الصفر تاريخٌ
       غير صالح تعرضه الأدوات «1980-00-00». */
const TABLE=(()=>{
 const t=new Uint32Array(256);
 for(let n=0;n<256;n++){
  let c=n;
  for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);
  t[n]=c>>>0;
 }
 return t;
})();
export function crc32(buf){
 let c=0xFFFFFFFF;
 for(let i=0;i<buf.length;i++)c=TABLE[(c^buf[i])&0xFF]^(c>>>8);
 return (c^0xFFFFFFFF)>>>0;
}
const enc=new TextEncoder();
const bytesOf=f=>{
 const d=(f&&f.raw!=null)?f.raw:(f?f.data:null);
 if(d instanceof Uint8Array)return d;
 if(typeof d==="string")return enc.encode(d);
 throw new Error(`ZIP: «${f&&f.name}» بلا بايتاتٍ حاضرة (raw)`);
};
const dosOf=d=>{
 const y=Math.max(1980,d.getFullYear());
 return {
  date:((y-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate(),
  time:(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1)
 };
};
export function createZip(files,opt){
 const L=Array.isArray(files)?files:[];
 const dt=dosOf((opt&&opt.date instanceof Date)?opt.date:new Date());
 const FLAG=0x0800;                       /* أسماءٌ UTF-8 */
 const parts=[], central=[];
 let offset=0;
 for(const f of L){
  const nameU8=enc.encode(String((f&&f.name)||"file"));
  const data=bytesOf(f);
  const crc=crc32(data);
  const lh=new Uint8Array(30+nameU8.length);
  const v=new DataView(lh.buffer);
  v.setUint32(0,0x04034b50,true); v.setUint16(4,20,true);
  v.setUint16(6,FLAG,true);       v.setUint16(8,0,true);
  v.setUint16(10,dt.time,true);   v.setUint16(12,dt.date,true);
  v.setUint32(14,crc,true);
  v.setUint32(18,data.length,true); v.setUint32(22,data.length,true);
  v.setUint16(26,nameU8.length,true); v.setUint16(28,0,true);
  lh.set(nameU8,30);
  parts.push(lh,data);
  const ch=new Uint8Array(46+nameU8.length);
  const cv=new DataView(ch.buffer);
  cv.setUint32(0,0x02014b50,true); cv.setUint16(4,20,true); cv.setUint16(6,20,true);
  cv.setUint16(8,FLAG,true);       cv.setUint16(10,0,true);
  cv.setUint16(12,dt.time,true);   cv.setUint16(14,dt.date,true);
  cv.setUint32(16,crc,true);
  cv.setUint32(20,data.length,true); cv.setUint32(24,data.length,true);
  cv.setUint16(28,nameU8.length,true);
  cv.setUint32(42,offset,true);
  ch.set(nameU8,46);
  central.push(ch);
  offset+=lh.length+data.length;
 }
 const centralSize=central.reduce((s,c)=>s+c.length,0);
 const eocd=new Uint8Array(22);
 const ev=new DataView(eocd.buffer);
 ev.setUint32(0,0x06054b50,true);
 ev.setUint16(8,L.length,true); ev.setUint16(10,L.length,true);
 ev.setUint32(12,centralSize,true); ev.setUint32(16,offset,true);
 const out=new Uint8Array(offset+centralSize+22);
 let p=0;
 for(const c of parts){out.set(c,p); p+=c.length}
 for(const c of central){out.set(c,p); p+=c.length}
 out.set(eocd,p);
 return out;
}
