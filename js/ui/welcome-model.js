/* ═══ نموذج شاشة البداية ═══ خالصٌ بلا DOM — يُختبَر في node.
   الدمجُ أ+ب+ج: ورقةُ اللوحة (الهيكل وجدول العنوان) · صندوقُ الأوامر
   (طريقةُ البدء) · المخطط الحي (الحركة). وخياراتُ البدء الأربعة هي
   **الحالةُ الفاضيةُ** للصندوق نفسه: فارغٌ ⇒ ٠١…٠٤، تكتب ⇒ نتائج. */
import {norm} from "./searchcommon.js";

/* الجهة — سطرٌ واحدٌ يُعدَّل هنا وحده. الشعارُ ملفٌّ محلّيٌّ (img-src 'self') */
export const ORG={name:"كلية الهندسة · قسم الهندسة المدنية",
 logo:"icons/college-logo.svg"};

export const MAIN=[
 {n:"01",t:"مشروع جديد",s:"ارسم أول جدار",a:"wall"},
 {n:"02",t:"فيلا العرض",s:"قالب بكل الأدوات",a:"tpl-showcase"},
 {n:"03",t:"افتح ملف DXF",s:"مرجع ترسم فوقه",a:"dxf"},
 {n:"04",t:"تعلّم خطوة بخطوة",s:"الواجهة التعليمية",a:"learn"}];

/* ما لا تعرفه لوحةُ الأوامر: قوالبُ المشروع الكاملة والاستوديو والجولة */
export const LOCAL=[
 {t:"فيلا العرض",s:"قالب · كل الأدوات",k:"قالب",a:"tpl-showcase"},
 {t:"بيت بمحاور ١٠×٩",s:"قالب",k:"قالب",a:"tpl-grid10x9"},
 {t:"عمارة شقّتين",s:"قالب",k:"قالب",a:"tpl-twin15"},
 {t:"فيلا",s:"قالب",k:"قالب",a:"tpl-villa"},
 {t:"شقة ٣ غرف",s:"قالب",k:"قالب",a:"tpl-apt3"},
 {t:"مكتب",s:"قالب",k:"قالب",a:"tpl-office"},
 {t:"استوديو",s:"قالب شقة صغيرة",k:"قالب",a:"tpl-studio"},
 {t:"غرفة سريعة",s:"قالب",k:"قالب",a:"tpl-room"},
 {t:"استوديو الدروس",s:"16 درساً بالصوت والحركة",k:"F1",a:"studio"},
 {t:"جولة سريعة",s:"تعرّف على الواجهة",k:"?",a:"tour"},
 {t:"افتح ملف DXF",s:"مرجع جامد",k:"DXF",a:"dxf"}];

export const LIMIT=7;
const hay=r=>norm(`${r.t} ${r.s}`);
/* search(q) ⇒ عناصرُ لوحة الأوامر {label,sub,home,sc}. يُحقَن ولا يُستورَد */
export function rowsFor(q,search){
 const k=norm(String(q||"").trim());
 if(!k)return MAIN.map(r=>({...r,k:String(+r.n)}));
 const out=LOCAL.filter(r=>hay(r).includes(k)).map(r=>({...r,n:""}));
 let ext=[];
 try{ext=search?search(q)||[]:[]}catch(e){ext=[]}
 for(const it of ext){
  if(out.length>=LIMIT)break;
  if(!it||!it.label)continue;
  out.push({n:"",t:it.label,s:it.home||it.sub||"",k:it.sc||"",a:"pal",it});
 }
 return out.slice(0,LIMIT);
}
/* ١…٤ لاتينيةً أو هنديةً، والصندوقُ فارغ ⇒ فهرسُ الخيار وإلا -1 */
export function digitPick(key,empty){
 if(!empty)return -1;
 const i="1234".indexOf(key), j="١٢٣٤".indexOf(key);
 return i>=0?i:j;
}
export const wrap=(i,n)=>n?((i%n)+n)%n:0;

/* ج: تعليقُ المخطط الحي — يتبع ترتيبَ رسم المسارات في welcome.css */
export const CAPS=[
 ["W","جدار","المحيط 16 × 12"],["W","جدار","فاصل الصالة"],
 ["W","جدار","فاصل المطبخ"],["D","باب","عرض 0.90"],
 ["D","باب","عرض 0.80"],["DI","بُعد","16.00 م"],["DI","بُعد","12.00 م"]];
