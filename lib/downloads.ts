/** Downloads that open correctly in Excel and print cleanly to PDF. One table shape feeds both, so a CSV and a PDF of the same screen always agree. */
export type Cell=string|number;
export interface DownloadTable{title:string;/** Short sentence on what is included, e.g. "Owner: Farhana Rahman; status: Posted". */scope:string;columns:string[];rows:Cell[][];totals?:Cell[]}

const FORMULA=/^(?:[=+@\t\r]|-(?![\d.]))/;
/** Excel runs a text cell that starts with = + @ (or - not followed by a digit) as a formula; a leading quote makes it plain text. Numbers are left alone. */
export const excelSafe=(cell:Cell):Cell=>typeof cell==='string'&&FORMULA.test(cell)?"'"+cell:cell;

const quote=(cell:Cell)=>'"'+String(excelSafe(cell)).replaceAll('"','""')+'"';
const stamp=()=>new Date().toISOString();

function save(blob:Blob,filename:string){
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/** UTF-8 with a byte order mark (Excel then shows Bangla and symbols correctly), CRLF lines, every cell quoted, same preamble as the server export. */
export function tableCsv(t:DownloadTable){
 const lines:Cell[][]=[['Report',t.title],['Generated at',stamp()],['Filters',t.scope||'none'],[],t.columns,...t.rows,...(t.totals?[t.totals]:[])];
 return '﻿'+lines.map(r=>r.map(quote).join(',')).join('\r\n')+'\r\n';
}
export function downloadCsv(t:DownloadTable,filename:string){save(new Blob([tableCsv(t)],{type:'text/csv;charset=utf-8'}),filename)}

/** API mode: the server's own export (all rows, audit-logged), saved under the name the server suggests. */
export async function downloadServerCsv(path:string,fallbackName:string){
 const res=await fetch('/backend'+path,{credentials:'same-origin'});
 if(!res.ok){const e=await res.json().catch(()=>({detail:res.statusText}));throw new Error(e.detail||`Download failed (${res.status})`)}
 const name=/filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition')||'')?.[1]||fallbackName;
 save(await res.blob(),name);
}

const esc=(v:Cell)=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));
const numeric=(v:Cell)=>typeof v==='number'||/^-?[\d,]+(\.\d+)?$/.test(String(v));

/** A print-ready A4 page for the table (Bangla is shaped by the browser's own fonts). */
export function printHtml(t:DownloadTable,fileName:string){
 const wide=t.columns.length>6;
 const head=t.columns.map(c=>`<th>${esc(c)}</th>`).join('');
 const show=(c:Cell)=>typeof c==='number'?c.toLocaleString('en-BD'):c;
 const row=(r:Cell[],cls='')=>`<tr${cls?` class="${cls}"`:''}>${r.map((c,i)=>`<td${numeric(c)&&i>0?' class="n"':''}>${esc(show(c))}</td>`).join('')}</tr>`;
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(fileName)}</title><style>
@page{size:A4 ${wide?'landscape':'portrait'};margin:14mm}
*{box-sizing:border-box}body{font-family:"Segoe UI","Noto Sans Bengali","Nirmala UI",Arial,sans-serif;color:#142b3a;font-size:11px;margin:0}
h1{font-size:18px;margin:0 0 4px}p{margin:2px 0;color:#4b6470}
table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border-bottom:1px solid #d9e3e6;padding:5px 6px;text-align:left;vertical-align:top}
th{background:#eaf1f3;font-weight:700}td.n{text-align:right;font-variant-numeric:tabular-nums}tr.total td{font-weight:700;border-top:2px solid #142b3a}
thead{display:table-header-group}tr{break-inside:avoid}.foot{margin-top:14px;font-size:10px;color:#6b8089}
</style></head><body><h1>${esc(t.title)}</h1><p>${esc(t.scope||'All records')}</p><p>Generated ${esc(new Date().toLocaleString('en-GB'))}</p>
<table><thead><tr>${head}</tr></thead><tbody>${t.rows.map(r=>row(r)).join('')}${t.totals?row(t.totals,'total'):''}</tbody></table>
<p class="foot">${t.rows.length} row${t.rows.length===1?'':'s'} · RentFlow</p></body></html>`;
}

/** Opens the browser's print dialog on a print-ready page; choose "Save as PDF" there. A hidden frame is used so the app page is never printed. */
export function printPdf(t:DownloadTable,fileName:string){
 const frame=document.createElement('iframe');
 frame.setAttribute('aria-hidden','true');frame.setAttribute('data-print-frame','');
 frame.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';
 frame.srcdoc=printHtml(t,fileName);
 frame.onload=()=>{
  const w=frame.contentWindow;if(!w)return;
  w.onafterprint=()=>frame.remove();
  w.focus();w.print();
  setTimeout(()=>frame.remove(),60000);
 };
 document.body.appendChild(frame);
}
