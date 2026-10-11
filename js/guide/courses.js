/* ═══ المسارات الخمسة ووحداتها ═══
   المعرف flow.* يدخل الفهرس والبحث كسائر الدروس. الدرس الذي لا
   توجد له بطاقةٌ بشرية بعدُ يُعرض «قيد الإعداد» — التغطية تكشفه
   ولا تسكت عنه. */
export const COURSES = [
  {
    id: "flow.smallflat",
    title: "ارسم شقة صغيرة",
    units: [
      { id: "u1", title: "الأساس: الوحدات والإحداثيات", lessons: ["units", "coords"] },
      { id: "u2", title: "ارسم الجدران", lessons: ["wall", "rect"] },
      { id: "u3", title: "الفتحات والمناطق", lessons: ["door", "area"] },
      { id: "u4", title: "راجع وسلّم", lessons: ["boq", "layers"] }
    ]
  },
  {
    id: "flow.contracts",
    title: "العقود التصميمية",
    units: [
      { id: "u1", title: "القياس والإدخال", lessons: ["units", "coords"] },
      { id: "u2", title: "الجدران والمناطق", lessons: ["wall", "area"] },
      { id: "u3", title: "الطبقات والحصر", lessons: ["layers", "boq"] }
    ]
  },
  {
    id: "flow.modify",
    title: "عدّل بلا خوف",
    units: [
      { id: "u1", title: "التحريك", lessons: ["move"] },
      { id: "u2", title: "التوليد والتكرار (قيد الإعداد)", lessons: ["copy", "rotate", "mirror"] },
      { id: "u3", title: "القص واللحم", lessons: ["trim", "weld", "extend"] }
    ]
  },
  {
    id: "flow.dxf",
    title: "من DXF إلى مخطّط",
    units: [
      { id: "u1", title: "المرجع المستورد", lessons: ["ref"] },
      { id: "u2", title: "الرسم فوق المرجع", lessons: ["coords", "wall"] }
    ]
  },
  {
    id: "flow.sheets",
    title: "الأوراق والطباعة",
    units: [
      { id: "u1", title: "الأوراق المتعددة", lessons: ["sheet"] },
      { id: "u2", title: "المنافذ والمقياس", lessons: ["vport"] }
    ]
  }
];

export const courseById = id => COURSES.find(c => c.id === id) || null;
