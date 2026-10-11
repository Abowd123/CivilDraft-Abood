/* ═══ تصدير حصر الكميات المسعّر إلى CSV متوافق مع Excel العربي ═══ */
const q = v => {
  const s = String(v == null ? "" : v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function toCSV(rows, columns) {
  const head = columns.map(c => q(c.title)).join(",");
  const body = (rows || []).map(r => columns.map(c => q(r[c.key])).join(",")).join("\r\n");
  return "\uFEFF" + head + (body ? "\r\n" + body : "");
}
export function boqToCSV(priced) {
  const cols = [
    { key: "label", title: "البند" }, { key: "unit", title: "الوحدة" },
    { key: "qty", title: "الكمية" }, { key: "rate", title: "سعر الوحدة" },
    { key: "amount", title: "الإجمالي" }
  ];
  const rows = priced.rows.slice();
  rows.push({});
  rows.push({ label: "المجموع الفرعي", amount: priced.subtotal });
  rows.push({ label: `ضريبة (${Math.round(priced.taxRate * 100)}%)`, amount: priced.tax });
  rows.push({ label: "الإجمالي النهائي", amount: priced.total });
  return toCSV(rows, cols);
}
export function download(filename, text, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type: mime }), url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}