/* ═══ أنواع بيانات الدليل التعليمي ═══
   تعريفُ الأنواع وتصديقُها فحسب — لا محتوى ولا تنفيذ.

   Lesson = {
     id: string,              // === TOOLS[id] أو ARTICLE[id] أو flow.id
     kind: "tool"|"article"|"flow",
     title: string,
     level: 1|2|3, minutes: number,
     prereqs: string[], related: string[],
     icon: string|null, placement: {tab:string,panel:string}|null,
     goals: string[], why: string[],
     script: Step[], exercises: Exercise[],
     mistakes: [{when,why}], faq: [{q,a}],
     fixture: any|null,       // ما يبنيه المعيد قبل الدرس
     body: string|null        // المقالات: النصّ المرجعي
   }
   Step={do:"begin"|"setOpt"|"say"|"feed"|"enter"|"finish"|"restore",
        arg:any, val:any, say:string, expect:any}
   Exercise={goal:string, assert:(S)=>bool, why:string}
   Course={id:"flow.*", title, units:[{id,title,lessons:string[]}]} */

export const KINDS = { tool: 1, article: 1, flow: 1 };
export const LEVELS = [null, { n: "مبتدئ" }, { n: "متوسط" }, { n: "متقدم" }];
export const STEPS_DO = new Set(["begin", "setOpt", "say", "feed", "enter", "finish", "restore"]);

/* مُدقِّق شكلي — يخبر ولا يصلح، بروح validate.js في النواة */
export function validateLesson(L, where) {
  const msgs = [];
  const w = where || (L && L.id) || "?";
  if (!L || !L.id) return [`${w}: لا id`];
  if (!KINDS[L.kind]) msgs.push(`${w}: kind غير معروف («${L.kind}»)`);
  if (typeof L.title !== "string" || !L.title.trim())
    msgs.push(`${w}: title فارغ`);
  if (!(L.level >= 1 && L.level <= 3)) msgs.push(`${w}: level خارج 1..3`);
  if (!Number.isFinite(L.minutes)) msgs.push(`${w}: minutes غير رقم`);
  if (!Array.isArray(L.goals)) msgs.push(`${w}: goals ليست مصفوفة`);
  if (!Array.isArray(L.why)) msgs.push(`${w}: why ليس مصفوفة`);
  (L.script || []).forEach((s, i) => {
    if (!s || !STEPS_DO.has(s.do)) msgs.push(`${w}.script[${i}]: do غير معروف`);
    if (s.do === "feed" && s.val == null) msgs.push(`${w}.script[${i}]: feed بلا val`);
  });
  (L.exercises || []).forEach((e, i) => {
    if (!e || typeof e.assert !== "function")
      msgs.push(`${w}.exercises[${i}]: assert ليست دالّة`);
  });
  return msgs;
}
