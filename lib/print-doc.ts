/** One A4 print template for statement-style documents (driver / owner / client / garage statements).
 *  Opens a popup with a clean document (no app chrome), repeats the table header on every page, never splits a row,
 *  shows a totals block, and prints. HTML is escaped; nothing here invents business content. */
export type PrintDoc = {
  title: string;
  subtitle?: string;
  business?: string;
  meta?: [string, string][];           // label/value pairs under the title
  columns: {label: string; align?: 'left' | 'right'}[];
  rows: (string | number)[][];
  totals?: [string, string][];         // label/value pairs after the table
  empty?: string;
  sections?: {heading: string; columns: {label: string; align?: 'left' | 'right'}[]; rows: (string | number)[][]}[];   // extra tables after the totals
};

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c] as string));

export function printDocHtml(d: PrintDoc): string {
  const head = d.columns.map(c => `<th${c.align === 'right' ? ' class="r"' : ''}>${esc(c.label)}</th>`).join('');
  const body = d.rows.length
    ? d.rows.map(r => `<tr>${r.map((cell, i) => `<td${d.columns[i]?.align === 'right' ? ' class="r"' : ''}>${esc(cell)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${d.columns.length}" class="empty">${esc(d.empty || 'No transactions in this period.')}</td></tr>`;
  const meta = (d.meta || []).map(([k, v]) => `<span><b>${esc(k)}:</b> ${esc(v)}</span>`).join(' · ');
  const sections = (d.sections || []).map(sec => `<h3>${esc(sec.heading)}</h3><table class="data"><thead><tr>${sec.columns.map(c => `<th${c.align === 'right' ? ' class="r"' : ''}>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${sec.rows.map(r => `<tr>${r.map((cell, i) => `<td${sec.columns[i]?.align === 'right' ? ' class="r"' : ''}>${esc(cell)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${sec.columns.length}" class="empty">None</td></tr>`}</tbody></table>`).join('');
  const totals = (d.totals || []).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="r">${esc(v)}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.title)}</title><style>
@page{size:A4;margin:14mm}
body{font-family:Arial,Helvetica,sans-serif;font-size:11.5px;color:#111;margin:0}
h1{font-size:17px;margin:0}h2{font-size:14px;margin:2px 0 4px}h3{font-size:12.5px;margin:16px 0 4px}
.meta{margin:4px 0 10px;color:#444}
table.data{border-collapse:collapse;width:100%}
table.data th,table.data td{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top}
table.data th{background:#f1f4f6}
.r{text-align:right;white-space:nowrap}
thead{display:table-header-group}tr{page-break-inside:avoid;break-inside:avoid}
.empty{text-align:center;color:#666;padding:14px}
table.totals{border-collapse:collapse;margin:12px 0 0 auto;min-width:240px}
table.totals td{padding:3px 8px;border-bottom:1px solid #ddd}table.totals td:last-child{font-weight:700}
.foot{margin-top:14px;color:#777;font-size:10px}
</style></head><body>
<h1>${esc(d.business || 'TASIN ENTERPRISE')}</h1><h2>${esc(d.title)}</h2>
${d.subtitle ? `<div>${esc(d.subtitle)}</div>` : ''}<div class="meta">${meta}</div>
<table class="data"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
${totals ? `<table class="totals">${totals}</table>` : ''}
${sections}
<div class="foot">Generated ${esc(new Date().toLocaleString())}</div>
</body></html>`;
}

/** Opens the document in a popup and prints it. Returns false when the browser blocked the popup. */
export function printDoc(d: PrintDoc): boolean {
  const w = window.open('', '_blank', 'width=900,height=800');
  if (!w) return false;
  w.document.write(printDocHtml(d));
  w.document.close();
  w.focus();
  w.print();
  return true;
}
