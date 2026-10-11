/* ═══ تقرير التصدير ═══
   يُبنى من مخرَج export.run نفسه، ويُحفَظ ملفّاً مستقلّاً.
   لا يعرف صيغةً ولا قماشاً: يقرأ plan وreport فقط. */
export function buildReport(plan,result){
 const rep=(result&&result.report)||[];
 return {app:"civildraft", ver:1, date:new Date().toISOString(),
  file:plan.name, fmt:plan.fmt, scale:plan.scale, page:plan.page,
  box:plan.box,
  warnings:rep.filter(r=>r.lv==="wr").map(r=>r.s),
  notes:rep.filter(r=>r.lv==="in").map(r=>r.s),
  size:result?result.size:0,
  caps:(result&&result.caps)||null};
}
export function saveReport(r){
 const b=new Blob([JSON.stringify(r,null,2)],
  {type:"application/json"});
 const a=document.createElement("a");
 const u=URL.createObjectURL(b);
 a.href=u;
 a.download=String(r.file||"export").replace(/\.[^.]+$/,"")+".report.json";
 document.body.appendChild(a);
 a.click();
 setTimeout(()=>{URL.revokeObjectURL(u); a.remove()},5000);
}
