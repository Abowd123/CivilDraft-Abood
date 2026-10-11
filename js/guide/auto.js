/* ═══ التوليد الآلي للدروس ═══
   يملأ كل الحقول الآلية من سجلّ الأدوات ومخطّط الشريط وقاعدة المعرفة،
   ثم يعلوها بالطبقة البشرية (lessons.js) بنفس المفتاح — وصفٌ يُقرأ
   لا يُنسخ، فلا ينفكّ الدليل عن سجلّه الحيّ. */
import { toolList } from "../tools/registry.js";
import { toolCard, ARTICLES } from "../ai/help/kb.js";
import { RIBBON } from "../ui/ribbon/schema.js";
import { LES } from "./lessons.js";

/* خريطة المواضع: أمرٌ في الشريط → تبويبه ولوحُه وأيقونته */
const walk = (items, fn) => (items || []).forEach(it =>
  it.group ? walk(it.group, fn) : fn(it));

let PLACE = null;
export function placements() {
  if (PLACE) return PLACE;
  const m = {};
  RIBBON.forEach(t => (t.panels || []).forEach(p =>
    walk(p.items, it => {
      if (it.cmd && !m[it.cmd]) m[it.cmd] = { tab: t.n, panel: p.n, icon: it.ico || null };
    })));
  PLACE = m;
  return m;
}

/* درسُ الأداة: الآلي من toolCard، والبشري يعلوه في الحقول السردية وحدها
   (نسخة نظيفة معتمدة — استبدلت السطر المعطوب من الدفعة الأولى) */
function toolLesson(id) {
  const d = toolList().find(x => x.id === id);
  if (!d) return null;
  const c = toolCard(d), p = placements()[id], h = LES[id] || {};
  return {
    id: d.id, kind: "tool",
    title: h.title || (c && c.label) || d.label || d.id,
    level: h.level || 1, minutes: h.minutes || 4,
    prereqs: h.prereqs || [], related: h.related || [],
    icon: p ? p.icon : null,
    placement: p ? { tab: p.tab, panel: p.panel } : null,
    goals: h.goals || [], why: h.why || [],
    script: h.script || [], exercises: h.exercises || [],
    mistakes: h.mistakes || [], faq: h.faq || [],
    fixture: h.fixture || null, body: null,
    aliases: (c && c.alias) || [], hint: (c && c.hint) || "",
    destructive: !!(c && c.destructive)
  };
}

/* درسُ المقال: الجسد من قاعدة المعرفة نفسها */
function articleLesson(a) {
  const h = LES[a.id] || {};
  return {
    id: a.id, kind: "article",
    title: h.title || a.title,
    level: h.level || 1, minutes: h.minutes || 3,
    prereqs: h.prereqs || [], related: h.related || [],
    icon: "help", placement: null,
    goals: h.goals || [], why: h.why || [], script: [], exercises: [],
    mistakes: h.mistakes || [], faq: h.faq || [], fixture: null,
    body: a.body, aliases: [], hint: "", destructive: false
  };
}

let CACHE = null;
export function autoLessons(force) {
  if (CACHE && !force) return CACHE;
  const out = [];
  toolList().forEach(d => { const l = toolLesson(d.id); if (l) out.push(l); });
  ARTICLES.forEach(a => out.push(articleLesson(a)));
  CACHE = out;
  return CACHE;
}

export const toolLessonById = id => autoLessons().find(
  l => l.kind === "tool" && l.id === id) || null;
export const articleLessonById = id => autoLessons().find(
  l => l.kind === "article" && l.id === id) || null;
