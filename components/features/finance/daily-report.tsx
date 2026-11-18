"use client";
import {useCallback, useEffect, useRef, useState} from 'react';
import {Printer} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {fetchDailyReport} from '@/lib/finance-api';
import {Input, Stat, errText, taka, todayISO} from './common';

type Report = {
  date: string; businessName: string; generatedAt: string; totalIncome: string; totalExpense: string; netBalance: string; transactionCount: number;
  incomeByCategory: Record<string, string>; expenseByCategory: Record<string, string>;
  transactions: {id: number; transactionId: string; type: string; category: string; description: string; paymentMethod: string; party: string; vehicle: string; reference: string; amount: string}[];
};

/** Select one date and see every posted income / expense transaction for it. Cash basis: invoices and unpaid dues are not counted. */
export function DailyReport() {
  const [day, setDay] = useState(todayISO());
  const [r, setR] = useState<Report | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const latest = useRef(0);
  const load = useCallback(() => {
    if (!day) return;
    const ticket = ++latest.current;   // a slow response for an earlier date must not replace the report of the selected date
    setLoading(true); setErr(''); setR(null);
    fetchDailyReport(day)
      .then(x => { if (ticket === latest.current) setR(x); })
      .catch(e => { if (ticket === latest.current) { setR(null); setErr(errText(e)); } })
      .finally(() => { if (ticket === latest.current) setLoading(false); });
  }, [day]);
  useEffect(load, [load]);

  const cat = (m: Record<string, string>) => Object.entries(m).sort((a, b) => Number(b[1]) - Number(a[1]));
  const net = Number(r?.netBalance || 0);

  return (
    <div className="daily-report" style={{display: 'flex', flexDirection: 'column', gap: 14}}>
      <style>{`@media print{body *{visibility:hidden}.daily-report-print,.daily-report-print *{visibility:visible}.daily-report-print{position:absolute;left:0;top:0;width:100%;padding:0}.no-print{display:none!important}@page{size:A4;margin:14mm}.daily-report-print table{font-size:11px}.daily-report-print thead{display:table-header-group}.daily-report-print tr{break-inside:avoid;page-break-inside:avoid}.daily-report-print{box-shadow:none!important;border:0!important}}`}</style>
      <div className="no-print" style={{display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap'}}>
        <label><span className="field-label">Report date</span><Input type="date" value={day} onChange={e => setDay(e.target.value)} /></label>
        <button className="btn-primary-blue" style={{height: 38, padding: '0 16px', borderRadius: 8}} disabled={!r} onClick={() => window.print()}><Printer size={15} /> Print report</button>
        <span style={{fontSize: 12, color: '#64748b'}}>Shows posted transactions only (cash basis). Transfers between your own accounts are excluded.</span>
      </div>
      {err && <div role="alert" style={{background: '#fef3f2', border: '1px solid #fecdca', color: '#b42318', borderRadius: 8, padding: '8px 12px', fontSize: 13}}>{err}</div>}
      {loading && !r && <div style={{color: '#64748b', fontSize: 13}}>Loading report…</div>}
      {r && (
        <Card className="daily-report-print" style={{padding: 18, borderRadius: 12}}>
          <div style={{display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 10, marginBottom: 12}}>
            <div><h2 style={{margin: 0, fontSize: 18}}>{r.businessName}</h2><div style={{fontSize: 13, color: '#475569'}}>Daily Income &amp; Expense Report – <b>{r.date}</b></div></div>
            <div style={{fontSize: 11.5, color: '#64748b', textAlign: 'right'}}>Generated {new Date(r.generatedAt).toLocaleString()}<br />{r.transactionCount} transaction(s)</div>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 8, marginBottom: 14}}>
            <Stat label="Total income" value={taka(r.totalIncome)} tone="good" /><Stat label="Total expense" value={taka(r.totalExpense)} tone="warn" />
            <Stat label="Net daily balance" value={taka(r.netBalance)} tone={net >= 0 ? 'good' : 'warn'} /><Stat label="Transactions" value={String(r.transactionCount)} />
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14, marginBottom: 14}}>
            {([['Income by category', r.incomeByCategory], ['Expense by category', r.expenseByCategory]] as const).map(([title, m]) => (
              <div key={title}><h4 style={{fontSize: 13, margin: '0 0 6px'}}>{title}</h4>
                {cat(m).length === 0 ? <div style={{fontSize: 12, color: '#64748b'}}>None</div> : (
                  <table style={{width: '100%', fontSize: 12.5, borderCollapse: 'collapse'}}><tbody>{cat(m).map(([k, v]) => <tr key={k} style={{borderTop: '1px solid #f1f5f9'}}><td style={{padding: '4px 0'}}>{k}</td><td className="nums" style={{textAlign: 'right'}}>{taka(v)}</td></tr>)}</tbody></table>)}
              </div>))}
          </div>
          <h4 style={{fontSize: 13, margin: '0 0 6px'}}>Transactions</h4>
          {r.transactions.length === 0 ? <div style={{padding: 16, textAlign: 'center', color: '#64748b', fontSize: 13}}>No transactions were posted on this date.</div> : (
            <div style={{overflowX: 'auto'}}>
              <table style={{width: '100%', fontSize: 12, borderCollapse: 'collapse'}}>
                <thead><tr style={{background: '#f8fafc', textAlign: 'left'}}>{['Txn ID', 'Type', 'Category', 'Description', 'Method', 'Party / Vehicle', 'Reference', 'Amount'].map(h => <th key={h} style={{padding: '6px 8px', whiteSpace: 'nowrap'}}>{h}</th>)}</tr></thead>
                <tbody>{r.transactions.map(t => (
                  <tr key={t.id} style={{borderTop: '1px solid #f1f5f9'}}>
                    <td style={{padding: '6px 8px', whiteSpace: 'nowrap'}}>{t.transactionId}</td>
                    <td style={{padding: '6px 8px', color: t.type === 'Income' ? '#067647' : '#b42318', fontWeight: 600}}>{t.type}</td>
                    <td style={{padding: '6px 8px'}}>{t.category}</td><td style={{padding: '6px 8px'}}>{t.description}</td><td style={{padding: '6px 8px'}}>{t.paymentMethod}</td>
                    <td style={{padding: '6px 8px'}}>{[t.party, t.vehicle].filter(Boolean).join(' · ')}</td><td style={{padding: '6px 8px'}}>{t.reference}</td>
                    <td className="nums" style={{padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap'}}>{taka(t.amount)}</td>
                  </tr>))}</tbody>
              </table>
            </div>)}
        </Card>
      )}
    </div>
  );
}
