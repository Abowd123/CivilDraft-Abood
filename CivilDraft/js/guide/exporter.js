/* ═══ guide/exporter.js — مولّد الدليل المستقل ═══
   يبني ملف HTML واحداً يُفتح بلا خادم ولا استيراد ES، للقراءة
   والطباعة. التفاعل الحي يبقى داخل التطبيق — نفس فصل «عرضٌ لا
   تعديل» الذي يسري في المشروع.

   صفاءُ الاختبار: buildStandalone دالّةٌ خالصة تقبل مصادرها،
   وexportGuideHTML يمرّر المصادر الحقيقية. وesc() على كل نصّ —
   تأميناً من حقن العلامات قبل بلوغها DOM. */
import { findTool } from "../tools/registry.js";
import { toolCard } from "../ai/help/kb.js";
import { RIBBON } from "../ui/ribbon/schema.js";
import { autoLessons } from "./auto.js";
import { COURSES } from "./courses.js";
import { escapeHtml as esc } from "../core/escape.js";

/* ═══ العقود — نصٌّ موجز يُعرض كما يُعرَض في المرجع ═══ */
const CONTRACTS = [
  ["لا لحام تلقائي", "لا يتصل جداران إلا بأمرك: لا لحم ولا تقريب صامت — ما ترسمه هو ما يُخزَّن."],
  ["الفتحات عرضٌ", "الفتحة كائنٌ على الجدار، تُطرح من جسمه وقت العرض لا في البيانات — حذفها يعيد الجدار كاملاً."],
  ["المنطقة تُخبَز", "تُخبَز بأمرك فتصير كائناً مسمّى ومقاساً؛ تغيّر الجدار يجعلها «قديمة» حتى تحدّثها."],
  ["المخفي والمقفل", "المخفي لا يُرسم ولا يُصدَّر، والمقفل يُرى ولا يُلمس."],
  ["BOQ الموحّد", "يحسب القابل للطباعة فقط — نفس معيار التصدير — والمعطوب يُذكَر لا يُخفى."],
  ["القوس حقيقي", "قوسٌ بصيغة bulge يُصدَّر قوساً في DXF وSVG وPDF لا مضلّعاً."]
];

const KEYS = [
  ["Ctrl+Z", "تراجع"], ["Ctrl+Shift+Z", "إعادة"], ["Ctrl+A", "تحديد المرئي"],
  ["Ctrl+S", "حفظ"], ["Ctrl+K", "لوحة الأوامر"], ["F1", "مرجع سريع"],
  ["F7", "الفاحص"], ["Esc", "يلغي الأداة أو التحديد"]
];

const CSS = `*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;
 margin:0;color:#1c2430;line-height:1.7}header.d{display:flex;align-items:center;
 gap:8px;padding:18px 26px;background:#16222f;color:#fff}header h1{margin:0;font-size:22px}
 header small{opacity:.75}.wrap{max-width:960px;margin:0 auto;padding:22px}
 nav{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}nav a{color:#1c60b6;
 text-decoration:none;padding:4px 10px;border:1px solid #d4dbe4;border-radius:6px;
 font-size:13px}h2{border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin-top:34px}
 h3{margin-bottom:2px}.lesson{background:#fafbfc;border:1px solid #e2e8f0;
 border-radius:10px;padding:16px 18px;margin:14px 0;break-inside:avoid}
 .meta{font-size:12px;color:#64748b;margin-bottom:8px}h4{margin:14px 0 6px;
 font-size:15px;color:#334155}ul,ol,dl{margin:6px 0}.alias{font-size:12px;
 color:#64748b}.alias code{margin-inline-start:4px}code{background:#eef2f6;
 padding:1px 6px;border-radius:4px;font-size:12.5px}.warn{color:#b91c1c;
 font-weight:bold}.h{color:#64748b;font-size:12.5px}.idx li{list-style:decimal;
 margin-inline-start:20px;margin-bottom:6px}@media print{nav{display:none}
 .lesson{break-inside:avoid}body{font-size:12px}}`;

const group = (title, items) => items && items.length
  ? `<h4>${esc(title)}</h4><ul>${items.map(x => `<li>${x}</li>`).join("")}</ul>` : "";

/* ═══ كتلة الأداة الآلية: خيارات وخطوات وأسماء بديلة ═══
   تُقرأ من toolCard في لحظة البناء لا من نصّ منسوخ. */
function toolAutoBlock(id) {
  const d = findTool(id);
  if (!d) return "";
  const c = toolCard(d);
  if (!c) return "";
  const opts = (c.opts || []).map(o => {
    const def = (o.def == null || o.def === "") ? "" : ` <code>${esc(String(o.def))}</code>`;
    const ch = (o.choices && o.choices.length)
      ? ` — ${o.choices.map(x => esc(x)).join(" / ")}` : "";
    return `<li>${esc(o.label || o.k)}${def}${ch}</li>`;
  }).join("");
  const steps = (c.steps || []).map(s => `<li>${s.n}. ${esc(s.text)}</li>`).join("");
  const alias = (c.alias && c.alias.length)
    ? `<div class="alias">الأسماء: ${c.alias.map(a => `<code>${esc(a)}</code>`).join(" ")}</div>` : "";
  return `<h4>الخيارات</h4><ul>${opts || "<li>لا خيارات</li>"}</ul>`
    + `<h4>الخطوات</h4><ol>${steps}</ol>${alias}`
    + (c.destructive ? `<p class="warn">⚠ أداةٌ تُعدّل ما هو مرسوم سلفاً</p>` : "");
}

/* ═══ كتلة درسٍ واحد ═══ */
function lessonBlock(L) {
  const head = `<article class="lesson" id="tool-${esc(L.id)}" data-tool="${esc(L.id)}">`
    + `<h3>${esc(L.title)}</h3>`
    + `<div class="meta">${L.kind === "tool" ? "أداة" : (L.kind === "article" ? "مقال" : "مسار")}`
    + (L.placement ? ` · ${esc(L.placement.tab)} ← ${esc(L.placement.panel)}` : "")
    + ` · المستوى ${L.level} · نحو ${L.minutes} دقائق</div>`;

  const goals = group("ماذا تتعلم", (L.goals || []).map(g => esc(g)));
  const why = group("لماذا", (L.why || []).map(w => esc(w)));
  const auto = (L.kind === "tool") ? toolAutoBlock(L.id) : "";
  const body = L.body ? `<h4>الشرح</h4><div>${esc(L.body)}</div>` : "";
  const ex = (L.exercises && L.exercises.length)
    ? `<h4>تمارين</h4><ul>${L.exercises.map(x =>
        `<li><b>${esc(x.goal)}</b>${x.why ? `<div class="h">${esc(x.why)}</div>` : ""}</li>`).join("")}</ul>` : "";
  const mistakes = (L.mistakes && L.mistakes.length)
    ? `<h4>أخطاء شائعة</h4><ul>${L.mistakes.map(m =>
        `<li><b>${esc(m.when)}</b> — ${esc(m.why)}</li>`).join("")}</ul>` : "";
  const faq = (L.faq && L.faq.length)
    ? `<h4>أسئلة شائعة</h4><dl>${L.faq.map(f =>
        `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join("")}</dl>` : "";

  return `${head}${goals}${why}${auto}${body}${ex}${mistakes}${faq}</article>`;
}

/* ═══ فهرس الأدوات مبوّباً بتبويبات الشريط ═══
   الترتيب ترتيب RIBBON نفسه، وما لا موضعَ له يُجمَع في نهايته. */
function toolIndex(lessons, ribbon) {
  const byTab = new Map();
  lessons.filter(l => l.kind === "tool").forEach(l => {
    const tab = (l.placement && l.placement.tab) || "أدوات أخرى";
    const a = byTab.get(tab) || (byTab.set(tab, []), byTab.get(tab));
    a.push(l);
  });
  const ordered = [], seen = new Set();
  ribbon.forEach(t => { if (byTab.has(t.n)) { ordered.push([t.n, byTab.get(t.n)]); seen.add(t.n); } });
  byTab.forEach((v, k) => { if (!seen.has(k)) ordered.push([k, v]); });
  return ordered.map(([tab, list]) => `
   <section class="tab"><h2>${esc(tab)}</h2><ul class="idx">${
     list.map(l => `<li><a href="#tool-${esc(l.id)}">${esc(l.title)}</a></li>`).join("")
   }</ul></section>`).join("");
}

/* ═══ البناء الكامل ═══ */
export function buildStandalone({ lessons = autoLessons(), courses = COURSES, ribbon = RIBBON, date = "" } = {}) {
  const tools = lessons.filter(l => l.kind === "tool");
  const articles = lessons.filter(l => l.kind === "article");
  const bodyPart = [
    `<section id="contracts"><h2>العقود التصميمية</h2><ul>${
      CONTRACTS.map(([n, d]) => `<li><b>${esc(n)}</b> — ${esc(d)}</li>`).join("")
    }</ul></section>`,
    `<section id="keys"><h2>الاختصارات الأساسية</h2><ul>${
      KEYS.map(([k, d]) => `<li><code>${esc(k)}</code> — ${esc(d)}</li>`).join("")
    }</ul></section>`,
    `<section id="tools"><h2>الأدوات حسب التبويب</h2>${toolIndex(lessons, ribbon)}</section>`,
    `<section id="lessons"><h2>بطاقات الأدوات</h2>${tools.map(lessonBlock).join("")}</section>`,
    articles.length
      ? `<section id="articles"><h2>المقالات التعريفية</h2>${articles.map(lessonBlock).join("")}</section>` : "",
    courses.length
      ? `<section id="courses"><h2>مسارات التعلّم</h2>${courses.map(c => `
       <article class="lesson"><h3>${esc(c.title)}</h3>
       ${c.units.map(u => `<h4>${esc(u.title)}</h4><ul>${
         u.lessons.map(id => `<li><a href="#tool-${esc(id)}">${esc(id)}</a></li>`).join("")
       }</ul>`).join("")}</article>`).join("")}</section>` : ""
  ].join("");

  const navLinks = [
    ["#contracts", "العقود"],
    ["#keys", "الاختصارات"],
    ["#tools", "فهرس الأدوات"],
    ["#lessons", "البطاقات"]
  ].concat(
    articles.length ? [["#articles", "المقالات"]] : [],
    courses.length ? [["#courses", "المسارات"]] : []
  );

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CivilDraft — الدليل التعليمي</title>
<style>${CSS}</style>
</head>
<body>
<header class="d"><div class="wrap"><h1>CivilDraft — الدليل التعليمي</h1>
<small>مرجع كامل بلا خادم${date ? " · " + esc(date) : ""}</small>
<nav>${navLinks.map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join("")}</nav></div></header>
<main class="wrap">${bodyPart}</main>
</body>
</html>`;
}

export function exportGuideHTML() {
  return buildStandalone();
}
export const guideFileName = () => "civildraft-guide.html";
