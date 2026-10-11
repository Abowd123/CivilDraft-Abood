/* ═══ العمود الجانبي على التابلت و«موقع سطح المكتب» بالهاتف ═══
   عطلٌ سابق: درجٌ ثابت يُخفى بـ translateX(-100%) في RTL فيظهر في منتصف
   الشاشة (inline-start في RTL هو اليمين). الحارس ساكن: يقرأ touch.css.
   node js/tests/touch-dock.test.js */
import {group,ok,eq,summary} from "./harness.js";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {join} from "node:path";
const ROOT=join(fileURLToPath(new URL(".",import.meta.url)),"..","..");
const css=readFileSync(join(ROOT,"css/touch.css"),"utf8");
const block=(q)=>{
 const i=css.indexOf(q); if(i<0)return "";
 let d=0,k=css.indexOf("{",i),s=k;
 for(;k<css.length;k++){ if(css[k]==="{")d++; else if(css[k]==="}"){d--; if(!d)break} }
 return css.slice(s,k+1);
};
const TAB="@media (max-width:1100px) and (min-width:769px) and (pointer:coarse)";
const PHONE="@media (max-width:768px)";
group("التابلت 769–1100: عمودٌ مُرسى لا درجٌ عائم",()=>{
 const b=block(TAB);
 ok(b.length>0,"كتلة التابلت موجودة");
 ok(!/position\s*:\s*fixed/.test(b),"لا position:fixed للعمود");
 ok(!/translate/.test(b),"لا إزاحة translate تُخرج العمود عن موضعه");
 ok(/max-width\s*:\s*42vw/.test(b),"عرضه محدودٌ كي لا يبتلع الرسم");
});
group("لا translateX(-100%) في أي مكان (عطل RTL)",()=>{
 ok(!/translateX\(\s*-100%\s*\)/.test(css),"غير موجودة");
});
group("الجوال <768: الورقة السفلية باقية",()=>{
 const b=block(PHONE);
 ok(/#side,\s*#sideE\{[^}]*position:fixed/.test(b.replace(/\s+/g," ").replace(/\{ /g,"{")),"العمود ورقةٌ سفلية ثابتة");
 ok(/translateY\(100%\)/.test(b),"يُخفى بإزاحةٍ رأسية (لا أفقية)");
});
summary();
