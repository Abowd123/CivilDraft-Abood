/* ═══ الواجهة التعليمية: شهادةُ الإنجاز ═══ المرحلة ٨
   SVG مستقلٌّ (A4 أفقي بالمليمتر) يُنزَّل ويُطبع: اسمُ المتعلّم وتاريخُه
   وأرقامُه وشعارُ الكلية مضمَّناً صورةً (لا رابط) فيبقى الملفُّ صحيحاً خارج
   التطبيق. الألوانُ قيمٌ ثابتة لأنّ الشهادة ورقٌ لا سمة. */
import {escapeHtml as esc} from "../core/escape.js";

const AR=n=>String(n).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[+d]);
export const CERT_ORG="كلية الهندسة · قسم الهندسة المدنية";
/* الشعارُ صورةٌ PNG مضمَّنة (data:) ترسمها الواجهةُ من icons/college-logo.svg على
   لوحة — لا طلبَ شبكيّ (CSP) ولا SVG خارجيٌّ يُدمج نصّاً فيحمل ما لا نريد.
   وما ليس PNG مضمَّناً يُهمَل. */
export const logoOk=h=>typeof h==="string"&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(h);
export function certSVG(o){
 const name=String(o&&o.name||"").trim().slice(0,60)||"متعلّم CivilDraft";
 const st=(o&&o.stats)||{};
 const d=(o&&o.date)||new Date();
 /* التاريخُ بالكلمات لا بالشرطات: «٢٠٢٦/١٠/٠٦» ينقلب ترتيبُه في سطرٍ عربيّ */
 const MON=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
 const date=`${AR(d.getDate())} ${MON[d.getMonth()]} ${AR(d.getFullYear())}`;
 const logo=o&&logoOk(o.logo)?o.logo:null;
 const org=esc((o&&o.org)||CERT_ORG);
 /* الأرقامُ تفصلها كلماتٌ لا رموزٌ محايدة — فلا يلتصق رقمان في الاتجاه */
 const line=`أتمّ ${AR(st.lessons|0)} درساً من ${AR(st.lessonsTotal|0)}، وجمع ${AR(st.stars|0)} نجمة، وجرّب ${AR(st.cards|0)} بطاقة أداة`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 297 210" direction="rtl">
<rect width="297" height="210" fill="#fbf8f1"/>
<rect x="8" y="8" width="281" height="194" fill="none" stroke="#8a6a20" stroke-width="1.2"/>
<rect x="11" y="11" width="275" height="188" fill="none" stroke="#8a6a20" stroke-width=".35"/>
<g stroke="#8a6a20" stroke-width=".25" opacity=".35">${Array.from({length:9},(_,i)=>`<line x1="${30+i*30}" y1="11" x2="${30+i*30}" y2="16"/>`).join("")}</g>
${logo?`<image x="133.5" y="20" width="30" height="30" href="${logo}"/>`:""}
<g font-family="IBM Plex Sans Arabic, Tahoma, sans-serif" text-anchor="middle" fill="#161a20" direction="rtl" unicode-bidi="embed">
<text x="148.5" y="60" font-size="5" fill="#5a6472">${org}</text>
<text x="148.5" y="80" font-size="13" font-weight="700" fill="#8a6a20">شهادة إنجاز</text>
<text x="148.5" y="94" font-size="5.5" fill="#4a525d">تشهد الواجهة التعليمية في CivilDraft بأنّ</text>
<text x="148.5" y="115" font-size="12" font-weight="700">${esc(name)}</text>
<line x1="88" y1="120" x2="209" y2="120" stroke="#8a6a20" stroke-width=".4"/>
<text x="148.5" y="133" font-size="5.5" fill="#4a525d">أتمّ مسار «من الصفر إلى الاحتراف» في الرسم المعماري والإنشائي،</text>
<text x="148.5" y="142" font-size="5.5" fill="#4a525d">وختمه بمشروع فيلا كاملة من المحاور إلى ورقة الطباعة.</text>
<text x="148.5" y="158" font-size="4.6" fill="#5a6472">${line}</text>
<text x="70" y="185" font-size="4.2" fill="#5a6472">التاريخ: ${date}</text>
<text x="227" y="185" font-size="4.2" fill="#5a6472">الواجهة التعليمية في CivilDraft</text>
</g></svg>`;
}
