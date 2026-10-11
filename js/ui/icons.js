/* ═══ سبرايت الأيقونات ═══
   SVG مضمَّن في الشفرة: لا ملفّات صور ولا اعتماديات ولا طلبات شبكة.
   كلّها 24×24 خطّية بـ currentColor فتتبع السِّمة والحالة (مُشغّل ·
   مُعطَّل · محدَّد) بلا نسخٍ ثانية.

   القيمة هي المحتوى الداخلي للرمز — فيُقبل path وcircle وrect.
   والمفقود يعيد نصّاً فارغاً، فالزرّ يظهر بتسميته ولا ينكسر. */

export const ICONS={
 /* الواجهة التعليمية: قبّعةُ تخرّج فوق خطّ */
 learn:'<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.6v4.2c1.6 1.5 3.4 2.2 5.5 2.2s3.9-.7 5.5-2.2v-4.2"/><path d="M21.5 9.5v5"/>',
 roof:'<path d="M3 12 12 4l9 8"/><path d="M6 10v9h12v-9"/>'
  +'<path d="M12 4v15" opacity=".45" stroke-dasharray="2 2"/>',
 dimrad:'<circle cx="12" cy="12" r="8" opacity=".5"/>'
  +'<path d="M12 12 18.5 7.5"/><path d="M16 7.4l2.5.1-.1 2.5"/>',
 dimdia:'<circle cx="12" cy="12" r="8" opacity=".5"/>'
  +'<path d="M5.5 16.5l13-9"/><path d="M5.5 14l0 2.5 2.5-.1M18.5 10l0-2.5-2.5.1"/>',
 dimang:'<path d="M4 19h16"/><path d="M4 19 17 6"/>'
  +'<path d="M11 19a7 7 0 0 0-2-5"/>',
 /* الرسم */
 line:'<path d="M4 20 20 4"/>',
 pline:'<path d="M3 18 9 8l6 6 6-9"/>',
 rect:'<path d="M4 6h16v12H4z"/>',
 circle:'<circle cx="12" cy="12" r="8"/>',
 arc:'<path d="M4 18a8 8 0 0 1 16 0"/>'
  +'<circle cx="4" cy="18" r="1.1"/><circle cx="20" cy="18" r="1.1"/>',
 arcwall:'<path d="M3 19a9 9 0 0 1 18 0"/>'
  +'<path d="M7.5 19a4.5 4.5 0 0 1 9 0" opacity=".55"/>',
 wall:'<path d="M3 8h18M3 16h18"/>'
  +'<path d="M7 8l-3 8M13 8l-3 8M19 8l-3 8" opacity=".45"/>',
 col:'<path d="M8 8h8v8H8z"/>'
  +'<path d="M12 4.5v3M12 16.5v3M4.5 12h3M16.5 12h3" opacity=".6"/>',
 gridcols:'<path d="M4 4h4v4H4zM16 4h4v4h-4zM4 16h4v4H4zM16 16h4v4h-4z"/>'
  +'<path d="M6 8v8M18 8v8M8 6h8M8 18h8" opacity=".4"/>',

 /* الفتحات */
 door:'<path d="M3 19h4M17 19h4"/><path d="M7 19V7"/>'
  +'<path d="M7 7a12 12 0 0 1 10 12" stroke-dasharray="2.5 2.5"/>',
 window:'<path d="M3 8v8M21 8v8"/><path d="M3 9.5h18M3 14.5h18"/>'
  +'<path d="M12 9.5v5"/>',
 opening:'<path d="M3 8v8M21 8v8"/>'
  +'<path d="M3 9.5h5M16 9.5h5M3 14.5h5M16 14.5h5"/>',
 niche:'<path d="M3 8h18M3 16h18"/><path d="M9 16v-4.5h6V16"/>',

 /* الأجزاء */
 stair:'<path d="M3 20h4v-4h4v-4h4V8h4V4"/>'
  +'<path d="M6 17l10-10" opacity=".45"/>',
 wc:'<rect x="8" y="4" width="8" height="3" rx="1"/>'
  +'<ellipse cx="12" cy="13.5" rx="4" ry="6"/>',
 lav:'<rect x="5" y="5" width="14" height="14" rx="2"/>'
  +'<ellipse cx="12" cy="13" rx="5" ry="3.5"/><path d="M12 5v3"/>',
 shower:'<rect x="5" y="5" width="14" height="14" rx="1"/>'
  +'<path d="M5 5l14 14M19 5L5 19" opacity=".45"/>'
  +'<circle cx="12" cy="12" r="1.6"/>',
 sink:'<rect x="3" y="6" width="18" height="12" rx="1"/>'
  +'<rect x="5.5" y="8.5" width="13" height="7"/>'
  +'<circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>',
 tub:'<rect x="3" y="7" width="18" height="10" rx="2"/>'
  +'<rect x="5.5" y="9" width="13" height="6" rx="2"/>'
  +'<circle cx="7.5" cy="12" r=".9"/>',

 /* المناطق */
 area:'<path d="M4 5h16v14H4z"/>'
  +'<path d="M6 17l10-10M10 17l6-6M6 13l6-6" opacity=".4"/>',
 arearef:'<path d="M4 6h11v12H4z" opacity=".6"/>'
  +'<path d="M20 13a4.5 4.5 0 1 1-2-3.7"/><path d="M18 6v3.5h-3.2"/>',

 /* التعديل */
 move:'<path d="M12 3v18M3 12h18"/>'
  +'<path d="M9.6 5.4 12 3l2.4 2.4M9.6 18.6 12 21l2.4-2.4'
  +'M5.4 9.6 3 12l2.4 2.4M18.6 9.6 21 12l-2.4 2.4"/>',
 copy:'<rect x="4" y="4" width="11" height="11"/>'
  +'<rect x="9" y="9" width="11" height="11"/>',
 rotate:'<path d="M20 12a8 8 0 1 1-3.2-6.4"/><path d="M17 2.5v4h-4"/>'
  +'<circle cx="12" cy="12" r="1.2"/>',
 mirror:'<path d="M12 3v18" stroke-dasharray="3 2"/>'
  +'<path d="M9 7 4 12l5 5z"/><path d="M15 7l5 5-5 5z"/>',
 offset:'<path d="M5 4v16"/><path d="M11 4v16" stroke-dasharray="3 2"/>'
  +'<path d="M14.5 12h5.5M20 12l-2.2-2.2M20 12l-2.2 2.2"/>',
 brk:'<path d="M3 12h6M15 12h6"/>'
  +'<path d="M11 6v12M13 6v12" opacity=".6"/>',
 divide:'<path d="M3 12h18"/><path d="M9 8v8M15 8v8"/>',
 trim:'<path d="M8 3v18M16 3v18" opacity=".55"/>'
  +'<path d="M2 12h6M16 12h6"/><path d="M9.5 9.5 14.5 14.5M14.5 9.5 9.5 14.5"/>',
 extend:'<path d="M18.5 3v18" opacity=".55"/>'
  +'<path d="M3 12h11"/><path d="M14 12h4M18 12l-2.2-2.2M18 12l-2.2 2.2"/>',
 stretch:'<path d="M4 8h8v8H4z" stroke-dasharray="3 2"/>'
  +'<path d="M13 12h7M20 12l-2.4-2.4M20 12l-2.4 2.4"/>',
 weld:'<path d="M3 16h7M14 16v-8"/><circle cx="12" cy="16" r="2.4"/>',
 match:'<path d="M6 14l6-6 4 4-6 6H6z"/><path d="M14 6l2-2 4 4-2 2z"/>',
 scale:'<path d="M5 19V5h14" opacity=".55"/>'
  +'<path d="M9 19v-6h6v6z"/><path d="M15 13 20 8M20 8h-3.5M20 8v3.5"/>',
 array:'<path d="M4 4h5v5H4zM15 4h5v5h-5zM4 15h5v5H4zM15 15h5v5h-5z"/>',
 info:'<circle cx="12" cy="12" r="8.5"/>'
  +'<path d="M12 11.2v5.6"/><path d="M12 7.4v.4"/>',

 /* التأشير */
 dim:'<path d="M4 7v10M20 7v10"/><path d="M4 12h16"/>'
  +'<path d="M7 9.6 4 12l3 2.4M17 9.6 20 12l-3 2.4"/>',
 chain:'<path d="M3 9v6M9 9v6M15 9v6M21 9v6"/><path d="M3 12h18"/>',
 text:'<path d="M5 6h14M12 6v12"/>',
 lead:'<path d="M4 19l8-8h8"/><path d="M4 19l.6-3.6L8.2 15z"/>',
 level:'<path d="M12 6l-4 5h8z"/><path d="M5 11h14"/><path d="M8.5 15h7"/>',
 griddim:'<path d="M3 5h18M3 3v4M9 3v4M15 3v4M21 3v4M6 12v9M12 12v9M18 12v9" stroke-dasharray="0"/>',
 axis:'<path d="M12 2v16" stroke-dasharray="6 2 1.4 2"/>'
  +'<circle cx="12" cy="20" r="2.4"/>',

 /* الأدوات والحالة */
 measure:'<path d="M3 15L15 3l6 6L9 21z"/>'
  +'<path d="M7 11l2 2M10 8l2 2M13 5l2 2" opacity=".7"/>',
 inspect:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.2 15.2 21 21"/>'
  +'<path d="M10.5 7v4.2M10.5 13.6v.4"/>',
 select:'<path d="M5 4l6 15 2-6 6-2z"/>',
 selid:'<path d="M4 3l5 12 1.6-4.8L15.4 9z"/>'
  +'<path d="M14 15h6M14 19h6M16.4 13v8M19 13v8" opacity=".65"/>',
 cube:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/>'
  +'<path d="M4 7.5l8 4.5 8-4.5M12 12v9" opacity=".6"/>',
 layers:'<path d="M12 4l8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4"/>'
  +'<path d="M4 16l8 4 8-4"/>',
 grid:'<path d="M4 4h16v16H4z"/>'
  +'<path d="M9.3 4v16M14.6 4v16M4 9.3h16M4 14.6h16" opacity=".55"/>',
 ortho:'<path d="M5 19V5h14"/><path d="M5 12h7v7" opacity=".5"/>',
 polar:'<circle cx="12" cy="12" r="8"/>'
  +'<path d="M12 12l6-4.5M12 12h8M12 12l5 5.5" opacity=".65"/>',
 osnap:'<rect x="7.5" y="7.5" width="9" height="9"/>'
  +'<path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
 grips:'<path d="M4 12h16"/>'
  +'<rect x="2.6" y="10.6" width="2.8" height="2.8"/>'
  +'<rect x="10.6" y="10.6" width="2.8" height="2.8"/>'
  +'<rect x="18.6" y="10.6" width="2.8" height="2.8"/>',
 ends:'<path d="M3 16h9"/><path d="M12 16l3.2-3.2L18.4 16l-3.2 3.2z"/>',

 /* الملفّ والإخراج */
 undo:'<path d="M4.5 9h9a5 5 0 0 1 0 10H8"/><path d="M8 5L4.5 9 8 13"/>',
 redo:'<path d="M19.5 9h-9a5 5 0 0 0 0 10H16"/><path d="M16 5l3.5 4L16 13"/>',
 fit:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'
  +'<rect x="9" y="9" width="6" height="6" opacity=".55"/>',
 help:'<circle cx="12" cy="12" r="8.5"/>'
  +'<path d="M9.6 9.6a2.4 2.4 0 1 1 4.8 0c0 1.8-2.4 2-2.4 3.9"/>'
  +'<path d="M12 17.2v.3"/>',
 save:'<path d="M5 4h11l3 3v13H5z"/><path d="M9 4v5h6V4"/>'
  +'<rect x="8" y="13" width="8" height="6"/>',
 open:'<path d="M3 7h6l2 2h10v9H3z"/>',
 fnew:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>'
  +'<path d="M12 11v6M9 14h6"/>',
 print:'<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="1"/>'
  +'<path d="M7 16h10v5H7z"/>',
 xport:'<path d="M12 3v11"/><path d="M8 10l4 4 4-4"/>'
  +'<path d="M4 18h16v3H4z"/>',
 sheet:'<rect x="3" y="5" width="18" height="14"/>'
  +'<rect x="5.5" y="7" width="13" height="10" stroke-dasharray="2 2"/>'
  +'<path d="M13 17v-4h5.5"/>',
 ref:'<rect x="3" y="5" width="18" height="14" stroke-dasharray="4 3"/>'
  +'<path d="M7.5 15.5L12 9l4.5 6.5"/>',
 table:'<rect x="3" y="5" width="18" height="14"/>'
  +'<path d="M3 10h18M3 15h18M9 5v14M15 5v14" opacity=".7"/>'
 ,
 /* ═══ و١ — الفتحات والأدوات الناقصة ═══ */
 fixed:'<path d="M3 8v8M21 8v8"/><path d="M3 9.5h18M3 14.5h18"/>'
  +'<path d="M6 9.5 18 14.5" opacity=".45"/>',
 arch:'<path d="M3 8v8M21 8v8"/>'
  +'<path d="M6 16a6 6 0 0 1 12 0" stroke-dasharray="2.5 2"/>',
 bidet:'<rect x="8" y="4" width="8" height="2.6" rx="1"/>'
  +'<ellipse cx="12" cy="13.5" rx="4" ry="6"/>'
  +'<circle cx="12" cy="13.5" r="1"/>',
 ur:'<path d="M6 5h12v5l-2.5 5.5L12 19l-3.5-3.5L6 10z"/>'
  +'<ellipse cx="12" cy="11.5" rx="2.6" ry="3.4"/>',
 wm:'<rect x="5" y="4" width="14" height="16" rx="1"/>'
  +'<circle cx="12" cy="13" r="4.2"/><path d="M5 8h14"/>',
 fd:'<rect x="7" y="7" width="10" height="10"/>'
  +'<path d="M7 7l10 10M17 7L7 17" opacity=".5"/>',
 chaincmp:'<path d="M3 8h18M3 8v3M9 8v3M15 8v3M21 8v3"/>'
  +'<path d="M4 17h6M14 17h6"/><path d="M11 15.5 13 17l-2 1.5"/>',
 refalign:'<rect x="3" y="6" width="8" height="12" '
  +'stroke-dasharray="3 2"/><rect x="13" y="6" width="8" height="12"/>'
  +'<path d="M11 12h2"/>',
 refcal:'<path d="M4 16 16 4l4 4L8 20z"/>'
  +'<path d="M8 12l2 2M11 9l2 2" opacity=".65"/>',
 refmove:'<rect x="3" y="7" width="10" height="10" '
  +'stroke-dasharray="3 2"/>'
  +'<path d="M15 12h6M21 12l-2.4-2.4M21 12l-2.4 2.4"/>',

 /* ═══ و١ — الملفّ والقشرة ═══ */
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 dxf:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>'
  +'<path d="M8.5 12l3 6M11.5 12l-3 6M13.5 12v6M13.5 12h2.4'
  +'M13.5 15h2" opacity=".8"/>',
 svg:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>'
  +'<path d="M9 13.5a5 5 0 0 1 6 0" opacity=".8"/>'
  +'<circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/>',
 png:'<rect x="3" y="5" width="18" height="14" rx="1"/>'
  +'<circle cx="8.5" cy="10" r="1.6"/><path d="M3 17l5-4 4 3 4-4 5 5"/>',
 pdf:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>'
  +'<path d="M9 12v6M9 12h2a1.6 1.6 0 0 1 0 3.2H9M14 12v6M14 12h2.4'
  +'M14 15h2" opacity=".8"/>',
 csv:'<rect x="3" y="5" width="18" height="14"/>'
  +'<path d="M3 10h18M9 5v14M15 5v14" opacity=".55"/>'
  +'<path d="M5.5 13.5h1.6M11.5 13.5h1.6M17.5 13.5h1"/>',
 clean:'<path d="M4 4h5M4 4v5M20 4h-5M20 4v5'
  +'M4 20h5M4 20v-5M20 20h-5M20 20v-5"/>',
 rbmin:'<path d="M3 5h18"/><path d="M8 11l4 4 4-4" />'
  +'<path d="M4 20h16" opacity=".4"/>',
 theme:'<circle cx="12" cy="12" r="7.5"/>'
  +'<path d="M12 4.5a7.5 7.5 0 0 0 0 15z" fill="currentColor"'
  +' stroke="none"/>',
 shell:'<rect x="3" y="4" width="18" height="16" rx="1"/>'
  +'<path d="M3 9h18"/><path d="M8 4v5M13 4v5" opacity=".55"/>',
 /* لوحةُ المساعد — شرارةٌ رباعيّة الرؤوس، بلا صلةٍ بأيقونةٍ أخرى */
 ai:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10'
  +'l5.2-1.8z"/><path d="M18.5 15.5l.8 2.1 2.1.8-2.1.8-.8 2.1'
  +'-.8-2.1-2.1-.8 2.1-.8z" opacity=".6"/>',
 del:'<path d="M5 7h14"/><path d="M9 7V4h6v3"/>'
  +'<path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v6M14 11v6"'
  +' opacity=".6"/>',
 props:'<rect x="3" y="4" width="18" height="16" rx="1"/>'
  +'<path d="M3 8h18"/><path d="M6 12h5M6 16h5M13 12h5M13 16h5"'
  +' opacity=".65"/>',
 unlock:'<rect x="5" y="11" width="14" height="9" rx="1"/>'
  +'<path d="M8.5 11V8a3.5 3.5 0 0 1 7 0"/>',
 renum:'<path d="M4 6h3M5.5 6v5M4 11h3"/>'
  +'<path d="M4 15h3v2.5H4V20h3" opacity=".8"/>'
  +'<path d="M11 8h9M11 13h9M11 18h9" opacity=".55"/>'
 ,
 /* ═══ و٢ — الإرساء ═══ */
 dockS:'<rect x="3" y="4" width="18" height="16" rx="1"/>'
  +'<path d="M14 4v16"/><path d="M16.5 8h2M16.5 11h2" opacity=".6"/>',
 dockE:'<rect x="3" y="4" width="18" height="16" rx="1"/>'
  +'<path d="M10 4v16"/><path d="M5.5 8h2M5.5 11h2" opacity=".6"/>',
 float:'<rect x="3" y="6" width="13" height="12" rx="1"'
  +' stroke-dasharray="3 2"/>'
  +'<rect x="8" y="3" width="13" height="12" rx="1"/>'
  +'<path d="M8 6.6h13" opacity=".6"/>',
 close:'<path d="M6 6l12 12M18 6L6 18"/>',
 maxi:'<rect x="4" y="5" width="16" height="14" rx="1"/>'
  +'<path d="M4 9h16" opacity=".6"/>',
 autohide:'<rect x="3" y="4" width="4" height="16" rx="1"/>'
  +'<path d="M11 12h9M20 12l-2.6-2.6M20 12l-2.6 2.6"/>',
 tabs:'<rect x="3" y="7" width="18" height="13" rx="1"/>'
  +'<path d="M3 7h6V4h6v3" opacity=".8"/>',
 acc:'<path d="M3 5h18M3 12h18M3 19h18"/>'
  +'<path d="M5.6 8.4 7 7l1.4 1.4" opacity=".55"/>',
 up:'<path d="M12 19V5"/><path d="M6.6 10.4 12 5l5.4 5.4"/>',
 down:'<path d="M12 5v14"/><path d="M6.6 13.6 12 19l5.4-5.4"/>',
 ws:'<rect x="3" y="4" width="18" height="16" rx="1"/>'
  +'<path d="M3 9h18M9 9v11" opacity=".65"/>'
  +'<path d="M12 13h6M12 16h6" opacity=".45"/>',
 panel:'<rect x="3" y="4" width="18" height="16" rx="1"/>'
  +'<path d="M15 4v16M3 8h12" opacity=".65"/>'
 ,
 /* ═══ و٣ — شريط الحالة والتنقّل ═══ */
 gsnap:'<path d="M4 4h16v16H4z" opacity=".35"/>'
  +'<path d="M9.3 4v16M14.6 4v16M4 9.3h16M4 14.6h16" opacity=".35"/>'
  +'<circle cx="9.3" cy="14.6" r="2.2"/>',
 paths:'<path d="M3 8h18M3 16h18" opacity=".4"/>'
  +'<path d="M3 12h18" stroke-dasharray="4 3"/>',
 lock:'<rect x="5" y="11" width="14" height="9" rx="1"/>'
  +'<path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
 warn:'<path d="M12 3.5 21 19.5H3z"/>'
  +'<path d="M12 9.5v4.4M12 16.4v.3"/>',
 zwin:'<rect x="3" y="5" width="12" height="10" stroke-dasharray="3 2"/>'
  +'<circle cx="15" cy="15" r="4.6"/><path d="M18.4 18.4 21.5 21.5"/>',
 zprev:'<circle cx="11" cy="11" r="6.4"/><path d="M15.6 15.6 21 21"/>'
  +'<path d="M15.4 5.6a7 7 0 0 0-9.8.8"/><path d="M5 3.6v3.2h3.2"/>',
 zin:'<circle cx="10.5" cy="10.5" r="6.4"/><path d="M15.2 15.2 21 21"/>'
  +'<path d="M8 10.5h5M10.5 8v5"/>',
 zout:'<circle cx="10.5" cy="10.5" r="6.4"/><path d="M15.2 15.2 21 21"/>'
  +'<path d="M8 10.5h5"/>',
 pan:'<path d="M12 3v18M3 12h18" opacity=".45"/>'
  +'<path d="M8.6 6.4 12 3l3.4 3.4M8.6 17.6 12 21l3.4-3.4'
  +'M6.4 8.6 3 12l3.4 3.4M17.6 8.6 21 12l-3.4 3.4"/>',
 view:'<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z"/>'
  +'<circle cx="12" cy="12" r="2.8"/>',
 north:'<circle cx="12" cy="12" r="8.6" opacity=".45"/>'
  +'<path d="M12 3.4 15 12h-6z"/><path d="M12 12v8.6" opacity=".6"/>'
 ,
 /* ═══ و٤ — الإدخال والقوائم ═══ */
 dyn:'<path d="M4 12h5M15 12h5M12 4v5M12 15v5" opacity=".5"/>'
  +'<rect x="9" y="9" width="11" height="6" rx="1"/>'
  +'<path d="M11.4 11v2" opacity=".8"/>',
 cmdl:'<rect x="3" y="6" width="18" height="12" rx="1"/>'
  +'<path d="M6.5 10l2 2-2 2"/><path d="M10.5 14h5"/>',
 ctx:'<rect x="4" y="4" width="16" height="16" rx="1"/>'
  +'<path d="M7.5 9h9M7.5 12h9M7.5 15h5" opacity=".7"/>',
 /* استدارةُ الركن: توأمُ chamfer بقوسٍ بدل الوتر */
 /* التهشير: مربّعٌ بخطوطٍ مائلة */
 hatch:'<rect x="4" y="4" width="16" height="16" rx="1"/>'
  +'<path d="M6 14l8-8M6 18l12-12M10 18l8-8" opacity=".7"/>',
 /* ═══ أثاثٌ وكهرباء ═══ P-جديد (الأولوية ٥ و٦)
    رموزٌ من فوق كما تُرسَم في المخطَّط — لا صورٌ مجسَّمة. */
 bed:'<rect x="4" y="5" width="16" height="14" rx="1"/>'
  +'<path d="M4 9h16" opacity=".6"/><rect x="6" y="6" width="5" height="2.4" opacity=".5"/>',
 sofa:'<rect x="3" y="8" width="18" height="9" rx="1"/>'
  +'<path d="M3 11h18M7 11v6M17 11v6" opacity=".6"/>',
 tabl:'<rect x="4" y="7" width="16" height="10" rx="1"/>'
  +'<path d="M4 14h16" opacity=".5"/>',
 tablc:'<circle cx="12" cy="12" r="7"/>',
 chairf:'<rect x="7" y="6" width="10" height="12" rx="1"/>'
  +'<path d="M7 9h10" opacity=".6"/>',
 desk:'<rect x="3" y="8" width="18" height="8" rx="1"/>'
  +'<path d="M14 8v8" opacity=".5"/>',
 wardr:'<rect x="5" y="4" width="14" height="16" rx="1"/>'
  +'<path d="M5 4l7 16M19 4l-7 16" opacity=".45"/>',
 fridge:'<rect x="7" y="3" width="10" height="18" rx="1"/>'
  +'<path d="M7 9h10" opacity=".6"/><circle cx="12" cy="6" r="1.3"/>',
 stove:'<rect x="4" y="4" width="16" height="16" rx="1"/>'
  +'<circle cx="9" cy="9" r="2"/><circle cx="15" cy="9" r="2"/>'
  +'<circle cx="9" cy="15" r="2"/><circle cx="15" cy="15" r="2"/>',
 sw:'<circle cx="8" cy="16" r="2.4"/><path d="M9.6 14.4L16 8"/>'
  +'<path d="M13 8h3v3" opacity=".6"/>',
 soc:'<path d="M4 18h16"/><path d="M19 18a7 7 0 0 0-14 0" />'
  +'<path d="M10 13v3M14 13v3" opacity=".7"/>',
 lampc:'<circle cx="12" cy="12" r="4"/>'
  +'<path d="M12 3v3M12 18v3M3 12h3M18 12h3" opacity=".7"/>',
 lampw:'<path d="M4 20h16"/><circle cx="12" cy="13" r="4"/>'
  +'<path d="M12 20v-3" opacity=".6"/>',
 spot:'<circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.8"/>',
 fan:'<circle cx="12" cy="12" r="8"/>'
  +'<path d="M12 12l5 5M12 12l-5 5M12 12l5-5M12 12l-5-5"/>',
 exfan:'<circle cx="12" cy="12" r="8"/>'
  +'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
 db:'<rect x="4" y="6" width="16" height="12" rx="1"/>'
  +'<rect x="7" y="9" width="10" height="6" opacity=".5"/>'
  +'<path d="M7 12h10" opacity=".7"/>',
 telp:'<path d="M4 18h16"/><path d="M19 18a7 7 0 0 0-14 0"/>'
  +'<path d="M9 14h6" opacity=".7"/>',
 tvp:'<path d="M4 18h16"/><path d="M19 18a7 7 0 0 0-14 0"/>'
  +'<path d="M9 14h6M12 14v4" opacity=".7"/>',
 acu:'<rect x="3" y="8" width="18" height="7" rx="1.5"/>'
  +'<path d="M5 12h14M5 13.6h14" opacity=".55"/>',
 fillet:'<path d="M5 20V13a4 4 0 0 1 4-4h11"/>'
  +'<path d="M5 9V5h4" opacity=".4" stroke-dasharray="2 2"/>',
 /* المقياس: مستطيلٌ صغيرٌ يكبر، والسهمُ القطريُّ يقول موحَّد */
 scale:'<rect x="4" y="13" width="7" height="7" rx="1"/>'
  +'<path d="M13 11V4h7v7z" opacity=".4" stroke-dasharray="2 2"/>'
  +'<path d="M11 13l8-8M15 5h4v4" opacity=".9"/>',
 /* التفكيك: كتلةٌ تتطاير أضلاعاً */
 explode:'<rect x="9" y="9" width="6" height="6" rx="1" opacity=".4"/>'
  +'<path d="M8 8L4 4M16 8l4-4M8 16l-4 4M16 16l4 4"/>',
 chamfer:'<path d="M5 20V9l4-4h11"/>'
  +'<path d="M5 9V5h4" opacity=".4" stroke-dasharray="2 2"/>',
 /* §٣/١٢ — الثلاثةُ متقطّعةٌ في أيقوناتها كما في الرسم */
 beam:'<path d="M3 9h18M3 15h18" stroke-dasharray="3 2"/>'
  +'<path d="M3 9v6M21 9v6"/>',
 footing:'<rect x="3" y="6" width="18" height="12" rx="1"'
  +' stroke-dasharray="3 2"/>'
  +'<path d="M3 6l18 12M21 6L3 18" stroke-dasharray="3 2" opacity=".6"/>'
  +'<rect x="10" y="10.5" width="4" height="3" rx=".5"/>',
 slab:'<path d="M3 5h18v14H3z" stroke-dasharray="3 2"/>'
  +'<path d="M6 19V8M10 19V8M14 19V8M18 19V8" opacity=".35"/>',
 /* البحث: عدسةٌ — بابُ المئةِ والخمسينَ أداةً في شريطِ الإبهام */
 search:'<circle cx="11" cy="11" r="6.4"/><path d="M15.7 15.7 20 20"/>',
 /* المزيد: ترسٌ — الاصطلاحُ المتعارَفُ لِما وراءَ الظاهر */
 gear:'<circle cx="12" cy="12" r="3.2"/>'
  +'<path d="M12 4v2.2M12 17.8V20M4 12h2.2M17.8 12H20'
  +'M6.7 6.7l1.6 1.6M15.7 15.7l1.6 1.6M17.3 6.7l-1.6 1.6M8.3 15.7l-1.6 1.6"/>',
 /* الكثافة: ثلاثةُ أسطرٍ تتقارب — المسافةُ هي الموضوع */
 density:'<path d="M4 5h16M4 12h16M4 19h16"/>'
  +'<path d="M20 8.5h-4M20 15.5h-4" opacity=".45"/>',
 /* قصُّ المنفذ: مستطيلٌ متقطّعٌ ودائرةٌ مصمَّتةٌ تقصُّه */
 vpclip:'<path d="M3 5h18v14H3z" opacity=".45" stroke-dasharray="3 2"/>'
  +'<circle cx="12" cy="12" r="6"/>',
 /* قياسُ مساحة: حلقةٌ مغلقةٌ ومؤشّرُ نقرٍ فيها */
 marea:'<path d="M3 5h12v9H3z" opacity=".5" stroke-dasharray="3 2"/>'
  +'<path d="M12 12l3 8 1.6-3.4 3.4-1.6z" fill="currentColor"/>',
 /* سهمُ ميل: خطٌّ مائلٌ وسهمٌ نحو الأسفلِ وشرطةُ الطرفِ الأعلى */
 slope:'<path d="M4 4v5" opacity=".7"/>'
  +'<path d="M4 6.5L18 17"/>'
  +'<path d="M18 17l-4.6-.4 1.9-3.4z" fill="currentColor"/>',
 /* فقرة: أسطرٌ بعرضٍ واحدٍ وآخرُها أقصر — وحدّانِ يحصران العمود */
 mtext:'<path d="M4 4v16M20 4v16" opacity=".45"/>'
  +'<path d="M7 7h10M7 10.5h10M7 14h10M7 17.5h5"/>',
 /* تحريرُ الخطّ: خطٌّ مكسورٌ ورؤوسٌ ظاهرةٌ وقلمٌ عند أحدها */
 pedit:'<path d="M3 17l5-8 4 4 5-7"/>'
  +'<path d="M1.6 15.6h2.8v2.8H1.6zM6.6 7.6h2.8v2.8H6.6z'
  +'M10.6 11.6h2.8v2.8h-2.8z"/>'
  +'<path d="M16 5l4 4-3 1z" opacity=".6"/>',
 /* مصفوفةٌ على مسار: منحنًى متقطّعٌ وثلاثُ قطعٍ عليه بتباعدٍ واحد */
 arraypath:'<path d="M3 18C7 18 8 7 12 7s5 11 9 11" opacity=".4"'
  +' stroke-dasharray="3 2"/>'
  +'<path d="M2 16.5h3v3H2zM10.5 5.5h3v3h-3zM19 16.5h3v3h-3z"/>',
 /* تسوية: ثلاثةُ مستطيلاتٍ بأطوالٍ مختلفةٍ وحدٌّ واحدٌ يجمعها */
 align:'<path d="M4 3v18" stroke-dasharray="2 2"/>'
  +'<path d="M7 5h12v3H7zM7 10.5h7v3H7zM7 16h10v3H7z"/>',
 arraypol:'<circle cx="12" cy="12" r="7" opacity=".4"'
  +' stroke-dasharray="3 2"/>'
  +'<path d="M10.5 3h3v3h-3zM18 10.5h3v3h-3z'
  +'M10.5 18h3v3h-3zM3 10.5h3v3H3z"/>',
 qp:'<rect x="3" y="5" width="18" height="9" rx="1"/>'
  +'<path d="M3 9.5h18" opacity=".5"/>'
  +'<path d="M6 7.2h3M13 7.2h5M6 11.8h4M14 11.8h4" opacity=".7"/>'
  +'<path d="M8 17l2 2 2-2" opacity=".5"/>',
 opa:'<circle cx="12" cy="12" r="8"/>'
  +'<path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"'
  +' stroke="none" opacity=".38"/>',
 clear:'<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/>'
  +'<path d="M6.5 7l1 12.5h9L17.5 7"/>',
 sketch:'<path d="M3 17c3-8 5-8 7-3s4 4 6-3 3-3 5-1"/>'
  +'<path d="M19.5 2.5 22 5l-3.2 3.2" opacity=".5"/>',
 grp:'<rect x="5" y="5" width="6" height="5"/>'
  +'<rect x="13" y="14" width="6" height="5"/>'
  +'<rect x="3" y="3" width="18" height="18" stroke-dasharray="3 2"/>',
 gsel:'<rect x="4" y="4" width="16" height="16" stroke-dasharray="3 2"'
  +' opacity=".85"/><rect x="5.5" y="9.5" width="6" height="6"/>'
  +'<path d="M13.5 13.5l6 6M15.5 13.5h6v6" opacity=".85"/>',
 gm:'<path d="M12 2v5.5M12 16.5V22M2 12h5.5M16.5 12H22"/>'
  +'<path d="M9.6 4.4 12 2l2.4 2.4M9.6 19.6 12 22l2.4-2.4'
  +'M4.4 9.6 2 12l2.4 2.4M19.6 9.6 22 12l-2.4 2.4"/>'
  +'<rect x="8.5" y="8.5" width="7" height="7" stroke-dasharray="3 2"/>',
 ug:'<rect x="3" y="7" width="7" height="6" stroke-dasharray="2.5 2"/>'
  +'<rect x="14" y="7" width="7" height="6" stroke-dasharray="2.5 2"/>'
  +'<path d="M3 16v5M5 16v5M16 16v5M18 16v5" opacity=".7"/>',
 live:'<path d="M4 6h9M4 11h9M4 16h5"/>'
  +'<path d="M19 8a5.5 5.5 0 1 0 1.5 6"/><path d="M17 5v3.2h3.2"/>',
 liver:'<path d="M4 6h7M4 11h7M4 16h4"/>'
  +'<path d="M20 8a5.5 5.5 0 1 1-4-5.5"/><path d="M16 2.5v4h4"/>',
 cloud:'<path d="M17.5 19H8a4.6 4.6 0 0 1-.4-9.2A6.4 6.4 0 0 1 19.8 9'
  +' 5 5 0 0 1 17.5 19z"/>',
 cloude:'<rect x="8.5" y="8.5" width="7" height="7"'
  +' stroke-dasharray="2.5 2"/>'
  +'<path d="M17.5 19H8a4.6 4.6 0 0 1-.4-9.2A6.4 6.4 0 0 1 19.8 9'
  +' 5 5 0 0 1 17.5 19z" opacity=".7"/>',
 elev:'<path d="M5 7v11M19 7v11M5 7h14M8 11h8M8 14h8"/>'
  +'<path d="M3.5 20h17"/>'
  +'<path d="M12 17.5v3M10.5 19 12 21.5l1.5-2.5" opacity=".8"/>',
 section:'<path d="M3 12h4M10 12h4M17 12h4"/>'
  +'<path d="M5 6v12M19 6v12"/>'
  +'<path d="M5 6 3 8M19 6l2 2" opacity=".8"/>',
 detail:'<circle cx="8.5" cy="8.5" r="4.3"/><path d="M4.2 8.5h8.6"/>'
  +'<path d="M12.6 12.6 18.5 18.5" opacity=".8"/>',
 boq:'<rect x="3" y="4" width="18" height="16"/>'
  +'<path d="M3 9h18M3 14h18"/>'
  +'<path d="M6 6.4h7M6 11.4h5M6 16.4h3.5M12 16.4h5" opacity=".65"/>',
 levels:'<path d="M6.5 6h14M6.5 12h14M6.5 18h14" opacity=".85"/>'
  +'<path d="M2 18V7"/><path d="M2 7 4 9M2 7 0 9" opacity=".9"/>',
 report:'<path d="M5 4h11l4 4v14H5z"/><path d="M16 4v4h4"/>'
  +'<path d="M8 11h9M8 14.5h9M8 18h6M8 7.5h2.5" opacity=".8"/>',
 underlay:'<rect x="3" y="4.5" width="18" height="15" rx="1"/>'
  +'<circle cx="8.2" cy="8.8" r="1.5"/>'
  +'<path d="M3 17.5l5-4.2 3.6 3 4-3.4 5.4 4.6"/>'
};
export const iconNames=()=>Object.keys(ICONS);
export const hasIcon=n=>!!ICONS[n];

/* يُنادى مرّةً في الإقلاع قبل بناء أي شريط */
export function mountIcons(){
 if(document.getElementById("icoSheet"))return 0;
 const d=document.createElement("div");
 d.id="icoSheet";
 d.setAttribute("aria-hidden","true");
 d.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">`
  +iconNames().map(k=>`<symbol id="i-${k}" viewBox="0 0 24 24">`
   +`${ICONS[k]}</symbol>`).join("")
  +`</svg>`;
 document.body.appendChild(d);
 return iconNames().length;
}
export function icon(n,size){
 if(!ICONS[n])return "";
 const s=size||16;
 return `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24"`
  +` aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;
}
