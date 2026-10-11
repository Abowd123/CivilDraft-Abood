/* ═══ تصغيرٌ آمنٌ بلا اعتماديات ═══ (خطّة 1.1.0 · البند ب)
   37٪ من الشيفرة تعليقاتٌ عربيةٌ مفصّلةٌ ومسافاتٌ بادئة. هذا الملفُّ يزيلها
   من نسخة dist وحدها — الأصلُ لا يُلمَس — ولا يفعل غيرَ ذلك:
     • لا إعادةَ تسمية · لا دمجَ أسطر · لا تقصيرَ تعابير
   فالسلوكُ لا يتغيّر بالبناء، والخطأُ في Console يبقى مقروءاً.
   ═══ لماذا ماسحٌ لا تعبيرٌ نمطيّ ═══
   بدايةُ التعليق قد تقع داخل نصٍّ أو قالبٍ أو تعبيرٍ نمطيّ.
   الماسحُ يعرف السلاسلَ الثلاثَ والقوالبَ المتداخلة (${ … } بعمقٍ أيّاً كان)
   والتعابيرَ النمطيةَ (بقاعدة «ما قبل الشرطة»)، فلا يمسّ إلّا تعليقاً حقيقياً.
   ═══ ASI ═══
   تعليقٌ كتليٌّ يحوي سطراً جديداً يُستبدَل بسطرٍ جديد لا بلا شيء، فرمزان
   كانا على سطرين يبقيان على سطرين، ولا تتغيّر نقطةُ فاصلةٍ آلية. والأسطرُ الفارغةُ تُحذَف — لا أثرَ
   لها في ASI ما دام بين الرمزين سطرٌ واحدٌ على الأقلّ.                       */

const KW=new Set(["return","typeof","case","do","else","in","of","new","delete",
 "void","throw","yield","await","instanceof"]);
/* هل يبدأ تعبيرٌ نمطيٌّ بعد هذا الرمز؟ (لا: بعد اسمٍ أو رقمٍ أو ) أو ]) */
function regexOK(prev){
 if(!prev)return true;
 if(/[\w$]$/.test(prev)){
  const m=/([\w$]+)$/.exec(prev);
  return !!(m&&KW.has(m[1]));
 }
 /* بعد ) أو ] قسمة؛ وبعد } بدايةُ جملةٍ غالباً فتعبيرٌ نمطيّ */
 return !/[)\]]$/.test(prev);
}
export function stripJS(src){
 let out="", i=0, prev="";        /* prev: آخرُ رمزٍ ذي معنى (لا مسافة) */
 const n=src.length;
 const stack=[];                  /* لكلّ ${ مفتوح: عمقُ الأقواس داخله */
 const push=s=>{out+=s; const t=s.trim(); if(t)prev=t};
 while(i<n){
  const c=src[i], d=src[i+1];
  /* نهايةُ ${ … } تعيدنا إلى القالب */
  if(stack.length&&c==="}"&&stack[stack.length-1]===0){
   stack.pop(); out+="}"; i++; i=tmpl(i); prev="`"; continue;
  }
  if(stack.length&&c==="{"){stack[stack.length-1]++; push(c); i++; continue}
  if(stack.length&&c==="}"){stack[stack.length-1]--; push(c); i++; continue}
  if(c==="/"&&d==="/"){                       /* تعليقُ سطر */
   while(i<n&&src[i]!=="\n")i++;
   continue;
  }
  if(c==="/"&&d==="*"){                       /* تعليقٌ كتليّ */
   const e=src.indexOf("*/",i+2);
   const end=e<0?n:e+2;
   if(src.slice(i,end).includes("\n"))out+="\n"; else out+=" ";
   i=end; continue;
  }
  if(c==="'"||c==='"'){                       /* سلسلة */
   let j=i+1;
   while(j<n&&src[j]!==c){ if(src[j]==="\\")j++; if(src[j]==="\n")break; j++ }
   push(src.slice(i,j+1)); i=j+1; continue;
  }
  if(c==="`"){out+="`"; i=tmpl(i+1); prev="`"; continue}
  if(c==="/"&&regexOK(prev)){                 /* تعبيرٌ نمطيّ */
   let j=i+1, cls=false;
   while(j<n){
    const ch=src[j];
    if(ch==="\\"){j+=2; continue}
    if(ch==="\n")break;
    if(cls){ if(ch==="]")cls=false }
    else if(ch==="[")cls=true;
    else if(ch==="/")break;
    j++;
   }
   j++;
   while(j<n&&/[a-z]/i.test(src[j]))j++;     /* الأعلام */
   push(src.slice(i,j)); i=j; continue;
  }
  push(c); i++;
 }
 return tidy(out);
 /* يقرأ متنَ قالبٍ حتى ` أو ${ — ويعيد الموضعَ بعدها */
 function tmpl(j){
  while(j<n){
   const ch=src[j];
   if(ch==="\\"){out+=src.slice(j,j+2); j+=2; continue}
   if(ch==="`"){out+="`"; return j+1}
   if(ch==="$"&&src[j+1]==="{"){out+="${"; stack.push(0); prev="{"; return j+2}
   out+=ch; j++;
  }
  return j;
 }
}
/* المسافاتُ البادئةُ والأسطرُ الفارغة — خارج القوالب فقط.
   داخل القالب كلُّ محرفٍ معنى (نصٌّ يُعرَض، HTML يُدرَج)، فنحمي متونَ القوالب
   بالتعرّف على مواضعها في ناتجٍ لا تعليقَ فيه. */
function tidy(s){
 /* مسحٌ ثانٍ بسيط: نعلّم كلَّ سطرٍ يبدأ داخل قالب فلا نقصّ بدايتَه */
 const startsInTmpl=[]; let t=false, st=[]; let q=null;
 for(let k=0;k<s.length;k++){
  const ch=s[k];
  if(k===0||s[k-1]==="\n")startsInTmpl.push(t||!!q);
  if(q){ if(ch==="\\"){k++;continue} if(ch===q||ch==="\n")q=null; continue }
  if(t){
   if(ch==="\\"){k++;continue}
   if(ch==="`"){t=false;continue}
   if(ch==="$"&&s[k+1]==="{"){t=false; st.push(0); k++; continue}
   continue;
  }
  if(st.length){
   if(ch==="{")st[st.length-1]++;
   else if(ch==="}"){ if(st[st.length-1]===0){st.pop(); t=true; continue} st[st.length-1]--; }
  }
  if(ch==="'"||ch==='"'){q=ch;continue}
  if(ch==="`"){t=true;continue}
 }
 const L=s.split("\n");
 return L.map((ln,ix)=>startsInTmpl[ix]?ln:ln.replace(/^[ \t]+/,"").replace(/[ \t]+$/,""))
  .filter((ln,ix)=>startsInTmpl[ix]||ln.length)
  .join("\n")+"\n";
}
export function stripCSS(src){
 let out="", i=0; const n=src.length;
 while(i<n){
  const c=src[i];
  if(c==="/"&&src[i+1]==="*"){const e=src.indexOf("*/",i+2); i=e<0?n:e+2; continue}
  if(c==="'"||c==='"'){let j=i+1; while(j<n&&src[j]!==c){if(src[j]==="\\")j++; j++} out+=src.slice(i,j+1); i=j+1; continue}
  out+=c; i++;
 }
 return out.split("\n").map(l=>l.trim()).filter(Boolean).join("\n")+"\n";
}
export function stripHTML(src){
 /* تعليقاتُ HTML وحدها، ولا داخل <script>/<style> (لا يوجد منهما مضمَّنٌ — CSP) */
 return src.replace(/<!--[\s\S]*?-->/g,"").split("\n").map(l=>l.replace(/[ \t]+$/,""))
  .filter(l=>l.trim().length).join("\n")+"\n";
}
