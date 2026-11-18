"use client";
import {useCallback, useEffect, useState} from 'react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {apiRequest, fetchGarages} from '@/lib/api';
import {newIdemKey} from '@/lib/finance-api';
import {printDoc} from '@/lib/print-doc';
import {Field, FormDialog, HistoryTable, Input, MethodSelect, NativeSelect, Stat, errText, taka, todayISO, useIdemKey} from './common';

const call = (method: string, path: string, body?: unknown, key?: string) =>
  apiRequest(`/orgs/1${path}`, {method, body: body ? JSON.stringify(body) : undefined, headers: key ? {'Idempotency-Key': key} : undefined});

/** Garage / vendor payables: outstanding per garage, statement (vendor and vehicle breakdown), partial/full payment, reversal. */
export function GaragePayables() {
  const [garages, setGarages] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<any>(null);
  const load = useCallback(() => { fetchGarages(1).then((g: any) => { setGarages(Array.isArray(g) ? g : []); setErr(''); }).catch(e => setErr(errText(e))); }, []);
  useEffect(load, [load]);
  return (
    <Card style={{padding: 16, marginTop: 16}} id="garage-payables">
      <h3 style={{margin: '0 0 8px', fontSize: 15, fontWeight: 750}}>Garage payables</h3>
      {err && <div role="alert" style={{color: '#b42318', fontSize: 12.5}}>{err}</div>}
      <div style={{overflowX: 'auto'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 12.5}}>
          <thead><tr style={{background: '#f8fafc', textAlign: 'left'}}>{['Garage', 'Billed', 'Paid', 'Outstanding', ''].map(h => <th key={h} style={{padding: '8px 10px'}}>{h}</th>)}</tr></thead>
          <tbody>
            {garages.length === 0 && <tr><td colSpan={5} style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No garages yet.</td></tr>}
            {garages.map(g => (
              <tr key={g.id} style={{borderTop: '1px solid #f1f5f9'}}>
                <td style={{padding: '8px 10px', fontWeight: 600}}>{g.name}</td><td className="nums" style={{padding: '8px 10px'}}>{taka(g.totalBill)}</td>
                <td className="nums" style={{padding: '8px 10px'}}>{taka(g.totalPaid)}</td><td className="nums" style={{padding: '8px 10px', fontWeight: 700}}>{taka(g.due)}</td>
                <td style={{padding: '8px 10px'}}><button className="btn-reset" style={{height: 28, fontSize: 11.5}} onClick={() => setOpen(g)}>Statement &amp; pay</button></td>
              </tr>))}
          </tbody>
        </table>
      </div>
      {open && <GarageDialog garage={open} onClose={() => setOpen(null)} onChanged={load} />}
    </Card>
  );
}

function GarageDialog({garage, onClose, onChanged}: {garage: any; onClose: () => void; onChanged: () => void}) {
  const [st, setSt] = useState<any>(null);
  const [err, setErr] = useState('');
  const [amount, setAmount] = useState(''); const [date, setDate] = useState(todayISO()); const [method, setMethod] = useState('Cash'); const [ref, setRef] = useState(''); const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const key = useIdemKey(true);
  const load = useCallback(() => { call('GET', `/garages/${garage.id}/statement`).then(setSt).catch(e => setErr(errText(e))); }, [garage.id]);
  useEffect(load, [load]);
  const out = Number(st?.outstanding || 0);
  const n = Number(amount);
  const amountErr = n > out ? `Cannot exceed the outstanding payable (${taka(out)})` : n < 0 ? 'Cannot be negative' : '';
  return (
    <FormDialog open onOpenChange={o => !o && onClose()} wide title={`Garage payable – ${garage.name}`} submitLabel="Record payment" disabled={!(n > 0) || !!amountErr || !ref.trim()}
      confirmText={`Pay ${taka(amount)} to ${garage.name}?`} keepOpen
      onSubmit={async () => {
        try { await call('POST', `/garages/${garage.id}/payments`, {amount, date, payment_method: method, reference: ref, note}, key.get()); key.renew(); setAmount(''); setRef(''); setNote(''); setMsg('Payment recorded'); load(); onChanged(); return null; }
        catch (e) { return errText(e); }
      }}>
      {err && <div role="alert" style={{color: '#b42318', fontSize: 12.5}}>{err}</div>}
      {msg && <div role="status" style={{color: '#067647', fontSize: 12.5}}>{msg}</div>}
      {st && <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8}}>
        <Stat label="Total billed" value={taka(st.totalBilled)} /><Stat label="Total paid" value={taka(st.totalPaid)} /><Stat label="Outstanding" value={taka(st.outstanding)} tone={out > 0 ? 'warn' : 'good'} />
        <Stat label="Carried forward (old system)" value={taka(st.carriedForward)} /></div>}
      <div className="form-grid">
        <Field label="Amount (৳)" error={amountErr}><Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
        <Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Method"><MethodSelect value={method} onChange={setMethod} /></Field>
        <Field label="Vendor invoice / reference *" hint="Must be unique per garage"><Input value={ref} onChange={e => setRef(e.target.value)} /></Field>
      </div>
      <Field label="Note"><Input value={note} onChange={e => setNote(e.target.value)} /></Field>
      {st && st.vehicleBreakdown.length > 0 && (<><h4 style={{fontSize: 12.5, margin: '6px 0 0'}}>Vehicle-wise</h4>
        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>{st.vehicleBreakdown.map((v: any) => <Stat key={v.vehicle} label={`${v.vehicle} billed / paid`} value={`${taka(v.billed)} / ${taka(v.paid)}`} />)}</div></>)}
      <div style={{display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 0'}}>
        <h4 style={{fontSize: 12.5, margin: 0, flex: 1}}>History</h4>
        <button type="button" className="btn-reset" style={{height: 28, fontSize: 11.5}} disabled={!st} onClick={() => {
          if (!st) return;
          const money = (v: string | number) => '৳ ' + Number(v).toLocaleString('en-US', {minimumFractionDigits: 2});
          const ok = printDoc({
            title: `Garage Payable Statement – ${garage.name}`,
            columns: [{label: 'Date'}, {label: 'Type'}, {label: 'Vehicle'}, {label: 'Reference'}, {label: 'Description'}, {label: 'Amount (৳)', align: 'right'}],
            rows: [...st.history].reverse().map((h: any) => [h.date, h.type + (h.reversed ? ' (reversed)' : ''), h.vehicle, h.reference, h.description, Number(h.delta).toLocaleString('en-US', {minimumFractionDigits: 2})]),
            totals: [['Total billed', money(st.totalBilled)], ['Total paid', money(st.totalPaid)], ['Carried forward (old system)', money(st.carriedForward)], ['Outstanding', money(st.outstanding)]],
          });
          if (!ok) setErr('Allow pop-ups to print the statement');
        }}>Print statement</button>
      </div>
      {st && (st.history.length === 0 ? <div style={{fontSize: 12.5, color: '#64748b'}}>No transactions.</div> : (
        <div style={{overflowX: 'auto', maxHeight: 260}}><table style={{width: '100%', fontSize: 12, borderCollapse: 'collapse'}}>
          <thead><tr style={{background: '#f8fafc', textAlign: 'left'}}>{['Date', 'Type', 'Vehicle', 'Reference', 'Description', 'Amount', ''].map(h => <th key={h} style={{padding: '5px 8px'}}>{h}</th>)}</tr></thead>
          <tbody>{st.history.map((h: any) => (
            <tr key={h.id} style={{borderTop: '1px solid #f1f5f9', opacity: h.reversed ? 0.5 : 1}}>
              <td style={{padding: '5px 8px'}}>{h.date}</td><td style={{padding: '5px 8px'}}>{h.type}{h.reversed ? ' (reversed)' : ''}</td><td style={{padding: '5px 8px'}}>{h.vehicle}</td>
              <td style={{padding: '5px 8px'}}>{h.reference}</td><td style={{padding: '5px 8px'}}>{h.description}</td>
              <td className="nums" style={{padding: '5px 8px', textAlign: 'right', color: Number(h.delta) < 0 ? '#067647' : '#b42318'}}>{Number(h.delta) > 0 ? '+' : ''}{Number(h.delta).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
              <td style={{padding: '5px 8px'}}>{h.type === 'payment' && !h.reversed && <button className="btn-reset" style={{height: 24, fontSize: 11}} onClick={async () => {
                const reason = prompt('Reason for reversing this payment?'); if (!reason) return;
                try { await call('POST', `/garage-payments/${h.id}/reverse`, {reason}); load(); onChanged(); } catch (e) { setErr(errText(e)); }
              }}>Reverse</button>}</td>
            </tr>))}</tbody></table></div>))}
    </FormDialog>
  );
}

/** Organization finance policy: rent proration and fuel/gas defaults. Provisional until the client confirms. */
export function FinanceSettingsCard() {
  const [s, setS] = useState<any>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { call('GET', '/finance-settings').then(setS).catch(e => setErr(errText(e))); }, []);
  useEffect(load, [load]);
  async function save(patch: Record<string, string>) {
    setBusy(true); setErr(''); setMsg('');
    try { setS(await call('PUT', '/finance-settings', patch)); setMsg('Saved. Already-posted rent and settlements are not recalculated.'); } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }
  if (!s && !err) return <Card style={{padding: 16}}>Loading finance policy…</Card>;
  return (
    <Card style={{padding: 16}} id="finance-policy">
      <h3 style={{margin: 0, fontSize: 15, fontWeight: 750}}>Accounting policy</h3>
      <p style={{margin: '4px 0 12px', fontSize: 12, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 10px'}}>
        Provisional policy pending client confirmation. Changes apply to new postings only and are recorded in the audit log{s?.updatedBy ? ` (last changed by ${s.updatedBy})` : ''}.</p>
      {err && <div role="alert" style={{color: '#b42318', fontSize: 12.5}}>{err}</div>}
      {msg && <div role="status" style={{color: '#067647', fontSize: 12.5}}>{msg}</div>}
      {s && <div className="form-grid">
        <Field label="Monthly rent proration"><NativeSelect value={s.rentProration} onChange={v => save({rent_proration: v})}>
          <option value="full_month">Full month (current behaviour)</option><option value="calendar_days">Daily – actual calendar days</option><option value="thirty_day">Daily – fixed 30-day basis</option></NativeSelect></Field>
        <Field label="Fuel/Gas default direction"><NativeSelect value={s.fuelDefaultDirection} onChange={v => save({fuel_default_direction: v})}>
          <option value="driver_owes">Company gives money to driver (driver owes)</option><option value="company_owes">Driver pays, company reimburses</option></NativeSelect></Field>
        <Field label="Fuel/Gas default settlement"><NativeSelect value={s.fuelDefaultSettlement} onChange={v => save({fuel_default_settlement: v})}>
          <option value="carry_forward">Carry forward as outstanding</option><option value="cash">Settle separately in cash</option><option value="salary_deduction">Deduct from salary</option></NativeSelect></Field>
      </div>}
      {busy && <span style={{fontSize: 12, color: '#64748b'}}>Saving…</span>}
    </Card>
  );
}
void Button; void newIdemKey; void HistoryTable;
