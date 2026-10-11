/* ═══ تقرير حصر الكميات الجاهز للعميل — MT4 ═══
   قراءةٌ محضة من ناتج core/boq.js نفسه — لا تعديل ولا خطوة تاريخ.
   الأرقام تمرّ عبر sqm/m2/m3 من core/units.js (نفس التقريب المستعمل
   في io/boq.js) فلا تحويل ثانٍ يفترق عنها. والمستبعَد (مخفيّ /
   غير قابلٍ للطباعة) يُعلَن عدداً صريحاً في كل قسم، كما في
   io/boq.js#noteOf — لا إسقاط صامت.

   ═══ لا style= ولا <style> — بقصدٍ لا سهو ═══
   سياسة المشروع (js/tests/csp.test.js) تحجب أيّ أنماطٍ مضمّنة في
   أيّ ملفّ JS، بلا استثناءٍ لملفّات التنزيل — فالحرسُ يفحص نصّ
   المصدر لا وجهةَ الإخراج. فهذا HTML بلا CSS إطلاقاً: `dir="rtl"`
   وحدها تكفي لمحاذاة النصّ العربي افتراضياً، وسمات الجدول القديمة
   (border/cellpadding) تقرأها كل المتصفّحات بلا شيءٍ يُحقَن. */
import {boq} from "../core/boq.js";
import {sqm,m2,m3} from "../core/units.js";

const X=s=>String(s==null?"":s)
 .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function note(sec){
 const parts=[];
 if(sec.hidden)parts.push(`${sec.hidden} عنصراً مخفيّاً`);
 if(sec.noplot)parts.push(`${sec.noplot} غير قابلٍ للطباعة`);
 return parts.length?`<p><em>${X(parts.join(" · "))}</em></p>`:"";
}

const TBL='<table border="1" cellpadding="6" cellspacing="0" width="100%">';

export function boqHTML(B){
 B=B||boq();
 const rows=[];
 const hrow=c=>rows.push(`<tr>${c.map(x=>`<th>${X(x)}</th>`).join("")}</tr>`);
 const row=c=>rows.push(`<tr>${c.map(x=>
  `<td>${x.bad?`<b>${x.h}</b>`:x.h}</td>`).join("")}</tr>`);

 rows.push(`<h1>${X(B.name||"مشروع")} — حصر كميات`
  +(B.tag?` (${X(B.tag)})`:"")+`</h1>`);
 rows.push(`<p>المقياس 1:${X(B.scale)}`
  +(B.date?` · التاريخ ${X(B.date)}`:"")
  +` · ارتفاع الجدار ${X(m2(B.wallH))} م</p>`);

 /* ═══ الجدران ═══ */
 rows.push(`<h2>الجدران</h2>${TBL}`);
 hrow(["النوع","العدد","السماكة الأشيع (م)","سماكات",
  "الطول (م)","وجه الجدار (م²)","الحجم (م³)","الفتحات"]);
 (B.walls.rows||[]).forEach(r=>row([
  {h:X(r.name)},{h:String(r.n)},{h:m3(r.t)},
  {h:r.tn>1?String(r.tn):"—"},
  {h:m2(r.len)},{h:sqm(r.face)},
  {h:m3(r.vol)},{h:String(r.opens||0)}]));
 rows.push(`</table>${note(B.walls)}`);

 /* ═══ الفتحات ═══ */
 rows.push(`<h2>الفتحات</h2>${TBL}`);
 hrow(["النوع","العدد","أصغر عرض (م)","أكبر عرض (م)",
  "المساحة (م²)","المصاريع","معطوبة"]);
 (B.opens.rows||[]).forEach(r=>row([
  {h:X(r.name)},{h:String(r.n)},{h:m2(r.wMin)},{h:m2(r.wMax)},
  {h:sqm(r.ar)},{h:r.pan?String(r.pan):"—"},
  {h:r.bad?String(r.bad):"—",bad:!!r.bad}]));
 rows.push(`</table>${note(B.opens)}`);

 /* ═══ المناطق ═══ */
 rows.push(`<h2>المناطق</h2>${TBL}`);
 hrow(["المعرّف","الاسم","المساحة (م²)","المحيط (م)","الحالة"]);
 (B.areas.rows||[]).forEach(r=>row([
  {h:X(r.id)},{h:X(r.name)},{h:sqm(r.area)},{h:m2(r.perim)},
  {h:X(r.valid||(r.stale?"قديمة":"سليمة")),bad:!!r.stale}]));
 rows.push(`</table>${note(B.areas)}`);

 /* ═══ الأعمدة ═══ */
 if(B.cols&&B.cols.n){
  rows.push(`<h2>الأعمدة</h2>${TBL}`);
  hrow(["النوع · المادّة","العدد","أصغر مقاس (م)","أكبر مقاس (م)","المساحة (م²)"]);
  (B.cols.rows||[]).forEach(r=>row([
   {h:X(r.name)},{h:String(r.n)},{h:m2(r.wMin)},{h:m2(r.wMax)},{h:sqm(r.area)}]));
  rows.push(`</table>${note(B.cols)}`);
 }

 /* ═══ الأدوات الصحية والمطبخية ═══ */
 if(B.fixt&&B.fixt.n){
  rows.push(`<h2>الأدوات الصحية والمطبخية</h2>${TBL}`);
  hrow(["النوع","العدد"]);
  (B.fixt.rows||[]).forEach(r=>row([{h:X(r.name)},{h:String(r.n)}]));
  rows.push(`</table>${note(B.fixt)}`);
 }

 /* ═══ الدرج ═══ */
 if(B.stairs&&B.stairs.n){
  rows.push(`<h2>الدرج</h2>${TBL}`);
  hrow(["المعرّف","العرض (م)","عدد القوائم","طول القِلعة (م)","الحالة"]);
  (B.stairs.rows||[]).forEach(r=>row([
   {h:X(r.id)},{h:m2(r.w)},{h:String(r.n)},{h:m2(r.len)},
   {h:r.ok?"سليم":"خارج المدى المريح",bad:!r.ok}]));
  rows.push(`</table>${note(B.stairs)}`);
 }

 const body=rows.join("\n");
 return `<!DOCTYPE html><html lang="ar" dir="rtl"><head>`
  +`<meta charset="utf-8"><title>${X(B.name||"مشروع")} — حصر كميات</title>`
  +`</head><body>${body}</body></html>`;
}

/* جدول الفتحات (خلاصةٌ بالنوع، من boq().opens مباشرة — نفس أعمدة
   وأرقام io/boq.js#toCSV لكن ملفٌّ مستقلٌّ لمن يريد الفتحات وحدها). */
export function opensCSV(B){
 B=B||boq();
 const q=v=>{
  const s=String(v==null?"":v);
  return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
 };
 const head=["النوع","العدد","أصغر عرض (م)","أكبر عرض (م)",
  "المساحة (م²)","المصاريع","معطوبة"];
 const lines=[head].concat((B.opens.rows||[]).map(r=>
  [r.name,r.n,m2(r.wMin),m2(r.wMax),sqm(r.ar),r.pan||0,r.bad||0]));
 return "\uFEFF"+lines.map(row=>row.map(q).join(",")).join("\r\n")+"\r\n";
}
