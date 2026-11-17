"use client";
import {useCallback, useEffect, useState} from 'react';
import {ArrowDownToLine, ArrowUpFromLine, Download, FileText, Printer} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {apiRequest} from '@/lib/api';
import {postCustomTransaction, postVehiclePayment, fetchVehiclePayments} from '@/lib/finance-api';
import {Field, FormDialog, Input, MethodSelect, NativeSelect, errText, taka, thisMonth, todayISO, useIdemKey} from './common';

const billing = (vehicleId: string, month?: string) => apiRequest(`/orgs/1/vehicles/${vehicleId}/billing${month ? `?month=${month}` : ''}`);
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c] as string));

/** Vehicle billing & payments: billing history by month, printable/exportable monthly invoice, Receive a Payment and Make a Payment. */
export function VehiclePaymentsCard({vehicleId, registration}: {vehicleId: string; registration: string}) {
  const [hist, setHist] = useState<any[] | null>(null);
  const [pays, setPays] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [month, setMonth] = useState(thisMonth());
  const [dlg, setDlg] = useState<'' | 'receive' | 'make'>('');
  const [toast, setToast] = useState('');

  const load = useCallback(() => {
    setErr('');
    Promise.all([billing(vehicleId), fetchVehiclePayments(vehicleId)]).then(([b, p]: any[]) => { setHist(b.history); setPays(p); }).catch(e => setErr(errText(e)));
  }, [vehicleId]);
  useEffect(() => { setHist(null); load(); }, [load]);
  const done = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); load(); };

  async function invoice(mode: 'print' | 'csv') {
    try {
      const b: any = await billing(vehicleId, month);
      const inv = b.invoice;
      if (mode === 'csv') {
        const rows = [['Invoice', inv.number], ['Vehicle', registration], ['Month', inv.month], [], ['Date', 'Description', 'Client', 'Amount'], ...inv.lines.map((l: any) => [l.date, l.description, l.client, l.amount]),
          [], ['Date', 'Direction', 'Party', 'Method', 'Reference', 'Amount'], ...inv.payments.map((p: any) => [p.date, p.direction, p.party, p.method, p.reference, p.amount]),
          [], ['Charges', inv.charges], ['Received', inv.received], ['Balance due', inv.balanceDue]];
        const csv = rows.map(r => r.map((c: any) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv'})); a.download = `${inv.number}.csv`; a.click();
        return;
      }
      const w = window.open('', '_blank', 'width=900,height=800'); if (!w) { setErr('Allow pop-ups to print the invoice'); return; }
      w.document.write(`<html><head><title>${esc(inv.number)}</title><style>@page{size:A4;margin:14mm}body{font-family:Arial;font-size:12px;color:#111}table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #bbb;padding:4px 6px;text-align:left}.r{text-align:right}h2{margin:0}thead{display:table-header-group}tr{page-break-inside:avoid}</style></head><body>
        <h2>${esc(inv.company)}</h2><div>${esc(inv.companyAddress)} · ${esc(inv.companyPhone)}</div><hr/>
        <h3>Vehicle Invoice ${esc(inv.number)}</h3><div>Vehicle: <b>${esc(registration)}</b> · Billing month: <b>${esc(inv.month)}</b> · Owner: ${esc(b.vehicle.owner)}</div>
        <h4>Charges</h4><table><thead><tr><th>Date</th><th>Description</th><th>Client</th><th class="r">Amount</th></tr></thead><tbody>${inv.lines.map((l: any) => `<tr><td>${esc(l.date)}</td><td>${esc(l.description)}</td><td>${esc(l.client)}</td><td class="r">${esc(l.amount)}</td></tr>`).join('') || '<tr><td colspan="4">No charges this month</td></tr>'}</tbody></table>
        <h4>Payments</h4><table><thead><tr><th>Date</th><th>Direction</th><th>Party</th><th>Method</th><th>Reference</th><th class="r">Amount</th></tr></thead><tbody>${inv.payments.map((p: any) => `<tr><td>${esc(p.date)}</td><td>${esc(p.direction)}</td><td>${esc(p.party)}</td><td>${esc(p.method)}</td><td>${esc(p.reference)}</td><td class="r">${esc(p.amount)}</td></tr>`).join('') || '<tr><td colspan="6">No payments this month</td></tr>'}</tbody></table>
        <p><b>Total charges:</b> ৳ ${esc(inv.charges)} &nbsp; <b>Received:</b> ৳ ${esc(inv.received)} &nbsp; <b>Paid out:</b> ৳ ${esc(inv.paid)} &nbsp; <b>Balance due:</b> ৳ ${esc(inv.balanceDue)}</p>
        ${inv.terms.length ? `<h4>Terms &amp; Conditions</h4><ol>${inv.terms.map((t: string) => `<li style="white-space:pre-wrap">${esc(t)}</li>`).join('')}</ol>` : ''}
        <p style="color:#666">Generated ${new Date().toLocaleString()}</p></body></html>`);
      w.document.close(); w.print();
    } catch (e) { setErr(errText(e)); }
  }

  return (
    <Card style={{padding: 16, borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10}}>
        <h4 style={{fontSize: 13, fontWeight: 750, margin: 0, display: 'flex', alignItems: 'center', gap: 6}}><FileText size={15} color="#1677ff" /> Billing &amp; Payments – {registration}</h4>
        <div style={{display: 'flex', gap: 6}}>
          <button className="btn-reset" onClick={() => setDlg('receive')}><ArrowDownToLine size={14} /> Receive a Payment</button>
          <button className="btn-reset" onClick={() => setDlg('make')}><ArrowUpFromLine size={14} /> Make a Payment</button>
        </div>
      </div>
      {toast && <div role="status" style={{background: '#ecfdf3', border: '1px solid #abefc6', color: '#067647', borderRadius: 8, padding: '6px 10px', fontSize: 12.5, marginBottom: 8}}>{toast}</div>}
      {err && <div role="alert" style={{color: '#b42318', fontSize: 12.5, marginBottom: 6}}>{err}</div>}

      <div style={{display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap', marginBottom: 10}}>
        <label><span className="field-label">Billing month</span><Input type="month" value={month} onChange={e => setMonth(e.target.value)} /></label>
        <button className="btn-primary-blue" style={{height: 36, padding: '0 14px', borderRadius: 8}} onClick={() => invoice('print')}><Printer size={14} /> Generate &amp; print invoice</button>
        <button className="btn-reset" onClick={() => invoice('csv')}><Download size={14} /> Export CSV</button>
      </div>

      <h5 style={{fontSize: 12, margin: '6px 0'}}>Billing history</h5>
      {!hist ? <div style={{fontSize: 12.5, color: '#64748b'}}>Loading…</div> : hist.length === 0 ? <div style={{fontSize: 12.5, color: '#64748b'}}>No billing activity for this vehicle yet.</div> : (
        <div style={{overflowX: 'auto'}}><table style={{width: '100%', fontSize: 12, borderCollapse: 'collapse'}}>
          <thead><tr style={{background: '#f8fafc', textAlign: 'left'}}>{['Month', 'Invoice(s)', 'Charges', 'Received', 'Outstanding', 'Status'].map(h => <th key={h} style={{padding: '5px 8px'}}>{h}</th>)}</tr></thead>
          <tbody>{hist.map(h => <tr key={h.month} style={{borderTop: '1px solid #f1f5f9', cursor: 'pointer'}} onClick={() => setMonth(h.month)}>
            <td style={{padding: '5px 8px'}}>{h.month}</td><td style={{padding: '5px 8px'}}>{h.invoices.join(', ') || '—'}</td><td className="nums" style={{padding: '5px 8px'}}>{taka(h.charges)}</td>
            <td className="nums" style={{padding: '5px 8px'}}>{taka(h.received)}</td><td className="nums" style={{padding: '5px 8px'}}>{taka(h.outstanding)}</td><td style={{padding: '5px 8px'}}>{h.status}</td></tr>)}</tbody>
        </table></div>)}

      <h5 style={{fontSize: 12, margin: '12px 0 6px'}}>Payment history</h5>
      {pays.length === 0 ? <div style={{fontSize: 12.5, color: '#64748b'}}>No payments recorded for this vehicle.</div> : (
        <div style={{display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12}}>{pays.map(p => (
          <div key={p.id} style={{display: 'grid', gridTemplateColumns: '84px 1fr auto', gap: 8}}>
            <span style={{color: '#64748b'}}>{p.date}</span><span>{p.type === 'Income' ? 'Received from' : 'Paid to'} {p.counterparty || '—'}{p.reference ? ` · ${p.reference}` : ''}</span>
            <b className="nums" style={{color: p.type === 'Income' ? '#067647' : '#b42318'}}>{p.type === 'Income' ? '+' : '−'}{taka(p.amount)}</b></div>))}</div>)}

      <PaymentDialog open={dlg !== ''} direction={dlg || 'receive'} onOpenChange={o => !o && setDlg('')} vehicleId={vehicleId} registration={registration} onDone={() => done('Payment recorded')} />
    </Card>
  );
}

function PaymentDialog({open, direction, onOpenChange, vehicleId, registration, onDone}: {open: boolean; direction: 'receive' | 'make'; onOpenChange: (o: boolean) => void; vehicleId: string; registration: string; onDone: () => void}) {
  const [amount, setAmount] = useState(''); const [date, setDate] = useState(todayISO()); const [who, setWho] = useState(''); const [method, setMethod] = useState('Cash');
  const [ref, setRef] = useState(''); const [desc, setDesc] = useState(''); const [invoice, setInvoice] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const key = useIdemKey(open);
  const recv = direction === 'receive';
  useEffect(() => { if (open && recv) apiRequest('/orgs/1/tasin-invoices').then((r: any) => Array.isArray(r) && setInvoices(r.filter((i: any) => Number(i.remainingDue) > 0))).catch(() => {}); }, [open, recv]);
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={recv ? `Receive a payment – ${registration}` : `Make a payment – ${registration}`} submitLabel={recv ? 'Record received payment' : 'Record payment made'}
      disabled={!(Number(amount) > 0) || !ref.trim()} confirmText={`${recv ? 'Record receipt of' : 'Record payment of'} ${taka(amount)} ${recv ? 'from' : 'to'} ${who || 'the party'}?`}
      onSubmit={async () => {
        try { await postVehiclePayment(vehicleId, {direction, amount, date, counterparty: who, payment_method: method, reference: ref.trim(), description: desc, invoice_id: invoice ? Number(invoice) : undefined}, key.get()); key.renew(); setAmount(''); setRef(''); setDesc(''); setInvoice(''); onDone(); return null; }
        catch (e) { return errText(e); }
      }}>
      <Field label={recv ? 'Received from (who paid) *' : 'Paid to (who received) *'}><Input value={who} onChange={e => setWho(e.target.value)} placeholder={recv ? 'Client / owner name' : 'Owner, driver, garage…'} /></Field>
      <Field label="Amount (৳) *"><Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
      <Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      <Field label="Payment method"><MethodSelect value={method} onChange={setMethod} /></Field>
      <Field label="Unique reference *" hint="Each payment needs its own reference; a repeated reference is rejected"><Input value={ref} onChange={e => setRef(e.target.value)} /></Field>
      {recv && <Field label="Against invoice (optional)"><NativeSelect value={invoice} onChange={setInvoice}><option value="">— no invoice —</option>{invoices.map(i => <option key={i.id} value={i.id}>{i.invoiceNumber} · {i.clientName} · due {taka(i.remainingDue)}</option>)}</NativeSelect></Field>}
      <Field label="Description"><Input value={desc} onChange={e => setDesc(e.target.value)} /></Field>
    </FormDialog>
  );
}

/** Accounts & Transactions: Custom transaction for items outside the predefined categories. */
export function CustomTransactionDialog({open, onOpenChange, onDone}: {open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void}) {
  const [type, setType] = useState('Expense'); const [title, setTitle] = useState(''); const [amount, setAmount] = useState(''); const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState('Cash'); const [desc, setDesc] = useState(''); const [party, setParty] = useState(''); const [veh, setVeh] = useState(''); const [ref, setRef] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const key = useIdemKey(open);
  useEffect(() => { if (open) apiRequest('/orgs/1/tasin-vehicles').then((r: any) => Array.isArray(r) && setVehicles(r)).catch(() => {}); }, [open]);
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Custom transaction" submitLabel="Save transaction" disabled={!title.trim() || !(Number(amount) > 0)}
      description="For income or expenses outside the predefined categories. It is posted to the ledger and appears in reports." confirmText={`Post a ${type.toLowerCase()} of ${taka(amount)} titled "${title.trim()}"?`}
      onSubmit={async () => {
        try { await postCustomTransaction({transaction_type: type, title, amount, date, payment_method: method, description: desc, related_party: party, vehicle_reg: veh, reference: ref}, key.get()); key.renew(); setTitle(''); setAmount(''); setDesc(''); setRef(''); onDone(); return null; }
        catch (e) { return errText(e); }
      }}>
      <Field label="Type"><NativeSelect value={type} onChange={setType}><option>Expense</option><option>Income</option></NativeSelect></Field>
      <Field label="Custom title / category *"><Input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} placeholder="e.g. Office tea, Court fee" /></Field>
      <Field label="Amount (৳) *"><Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
      <Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      <Field label="Payment method"><MethodSelect value={method} onChange={setMethod} /></Field>
      <Field label="Related party (optional)"><Input value={party} onChange={e => setParty(e.target.value)} /></Field>
      <Field label="Related vehicle (optional)"><NativeSelect value={veh} onChange={setVeh}><option value="">— none —</option>{vehicles.map(v => <option key={v.id} value={v.registration}>{v.registration}</option>)}</NativeSelect></Field>
      <Field label="Reference (optional, must be unique)"><Input value={ref} onChange={e => setRef(e.target.value)} /></Field>
      <Field label="Description"><Input value={desc} onChange={e => setDesc(e.target.value)} /></Field>
    </FormDialog>
  );
}
