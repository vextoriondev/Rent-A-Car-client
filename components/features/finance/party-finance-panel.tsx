"use client";
import {useCallback, useEffect, useState} from 'react';
import {Landmark, Printer, CalendarPlus, Banknote} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {postOwnerCharge, accrueRent, collectClientLedger, fetchClientFinance, fetchOwnerFinance, payOwnerLedger, previewRent, reverseRentAccrual} from '@/lib/finance-api';
import {Field, FormDialog, HistoryTable, Input, MethodSelect, Stat, errText, taka, thisMonth, todayISO, useIdemKey} from './common';
import {OpeningBalanceDialog} from './opening-balance';

/** Owner / Client financial summary built from the party ledger: opening balance is shown separately from accrued rent / invoices. */
export function PartyFinancePanel({kind, partyId, partyName, onChanged}: {kind: 'owner' | 'customer'; partyId: string; partyName: string; onChanged?: () => void}) {
  const isOwner = kind === 'owner';
  const [s, setS] = useState<Record<string, any> | null>(null);
  const [err, setErr] = useState('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [dlg, setDlg] = useState<'' | 'pay' | 'opening' | 'rent' | 'charge'>('');
  const [toast, setToast] = useState('');

  const load = useCallback(() => {
    setErr('');
    (isOwner ? fetchOwnerFinance : fetchClientFinance)(partyId, from || undefined, to || undefined).then(setS).catch(e => setErr(errText(e)));
  }, [isOwner, partyId, from, to]);
  useEffect(() => { setS(null); load(); }, [load]);
  const done = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); load(); onChanged?.(); };

  function print() {
    if (!s) return;
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return;
    const rows = s.history.map((h: any) => `<tr><td>${h.date}</td><td>${String(h.account).replace(/_/g, ' ')}</td><td>${h.type}</td><td>${h.description || ''}</td><td>${h.reference || ''}</td><td style="text-align:right">${h.delta}</td></tr>`).join('');
    w.document.write(`<html><head><title>Statement</title><style>body{font-family:Arial;font-size:12px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:4px 6px}@page{size:A4;margin:14mm}thead{display:table-header-group}tr{page-break-inside:avoid}tfoot{display:table-footer-group}</style></head><body><h2>${isOwner ? 'Owner' : 'Client'} statement – ${partyName}</h2><p>${from || 'Start'} to ${to || 'today'} · generated ${new Date().toLocaleString()}</p><table><thead><tr><th>Date</th><th>Account</th><th>Type</th><th>Description</th><th>Ref</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close(); w.print();
  }

  return (
    <Card style={{padding: 16, borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10}}>
        <h3 style={{margin: 0, fontSize: 14, fontWeight: 800}}>{isOwner ? 'Owner' : 'Client'} financial summary – {partyName}</h3>
        <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
          <button className="btn-reset" onClick={() => setDlg('opening')}><Landmark size={14} /> Opening balance</button>
          {isOwner && <button className="btn-reset" onClick={() => setDlg('rent')}><CalendarPlus size={14} /> Monthly rent accrual</button>}
          {isOwner && <button className="btn-reset" onClick={() => setDlg('charge')}><Banknote size={14} /> Additional charge</button>}
          <button className="btn-primary-blue" style={{height: 34, padding: '0 14px', borderRadius: 8}} onClick={() => setDlg('pay')}><Banknote size={14} /> {isOwner ? 'Pay owner' : 'Receive payment'}</button>
        </div>
      </div>
      {toast && <div role="status" style={{background: '#ecfdf3', border: '1px solid #abefc6', color: '#067647', borderRadius: 8, padding: '6px 10px', fontSize: 12.5, marginBottom: 8}}>{toast}</div>}
      {err && <div role="alert" style={{color: '#b42318', fontSize: 12.5}}>{err}</div>}
      {!s && !err && <div style={{color: '#64748b', fontSize: 12.5}}>Loading financial summary…</div>}
      {s && (<>
        {isOwner ? (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8}}>
            <Stat label="Opening balance" value={taka(s.openingBalance)} /><Stat label="Total accrued rent" value={taka(s.totalAccruedRent)} />
            <Stat label="Total payments" value={taka(s.totalPayments)} /><Stat label="Total adjustments" value={taka(s.totalAdjustments)} />
            <Stat label="Current payable" value={taka(s.currentPayable)} tone={Number(s.currentPayable) > 0 ? 'warn' : 'good'} />
            <Stat label="Current receivable" value={taka(s.currentReceivable)} /><Stat label="Outstanding balance" value={taka(s.outstandingBalance)} tone={Number(s.outstandingBalance) > 0 ? 'warn' : 'good'} />
          </div>
        ) : (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8}}>
            <Stat label="Opening receivable" value={taka(s.openingReceivable)} /><Stat label="Invoiced" value={taka(s.totalInvoiced)} />
            <Stat label="Collected" value={taka(s.totalCollected)} /><Stat label="Outstanding receivable" value={taka(s.outstandingReceivable)} tone={Number(s.outstandingReceivable) > 0 ? 'warn' : 'good'} />
            <Stat label="Previous payable (we owe)" value={taka(s.previousPayable)} /><Stat label="Other receivable" value={taka(s.otherReceivable)} />
          </div>
        )}
        {isOwner && s.vehicleBreakdown.length > 0 && (<>
          <h4 style={{fontSize: 13, margin: '14px 0 6px'}}>Vehicle-wise accrued rent</h4>
          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>{s.vehicleBreakdown.map((v: any) => <Stat key={v.vehicle} label={v.vehicle} value={taka(v.accrued)} />)}</div>
        </>)}
        {isOwner && s.monthlyStatement.length > 0 && (<>
          <h4 style={{fontSize: 13, margin: '14px 0 6px'}}>Monthly statement</h4>
          <div style={{overflowX: 'auto'}}><table style={{width: '100%', fontSize: 12, borderCollapse: 'collapse'}}>
            <thead><tr style={{background: '#f8fafc', textAlign: 'left'}}><th style={{padding: '6px 8px'}}>Month</th><th style={{padding: '6px 8px'}}>Accrued rent</th><th style={{padding: '6px 8px'}}>Paid / settled</th></tr></thead>
            <tbody>{s.monthlyStatement.map((m: any) => <tr key={m.month} style={{borderTop: '1px solid #f1f5f9'}}><td style={{padding: '6px 8px'}}>{m.month}</td><td className="nums" style={{padding: '6px 8px'}}>{taka(m.accrued)}</td><td className="nums" style={{padding: '6px 8px'}}>{taka(m.paid)}</td></tr>)}</tbody>
          </table></div>
        </>)}
        <div style={{display: 'flex', alignItems: 'end', gap: 8, flexWrap: 'wrap', margin: '14px 0 6px'}}>
          <h4 style={{fontSize: 13, margin: 0, flex: 1}}>Transaction history</h4>
          <label><span className="field-label">From</span><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label><span className="field-label">To</span><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
          <button className="btn-reset" onClick={print}><Printer size={14} /> Print</button>
        </div>
        <HistoryTable rows={s.history} />
      </>)}

      <PayDialog open={dlg === 'pay'} onOpenChange={o => !o && setDlg('')} isOwner={isOwner} partyId={partyId} partyName={partyName}
        outstanding={isOwner ? Number(s?.currentPayable || 0) : Number(s?.outstandingReceivable || 0)} onDone={() => done(isOwner ? 'Payment recorded' : 'Collection recorded')} />
      <OpeningBalanceDialog open={dlg === 'opening'} onOpenChange={o => !o && setDlg('')} partyId={partyId} partyName={partyName} kind={kind} onDone={() => done('Opening balance recorded')} />
      {isOwner && <ChargeDialog open={dlg === 'charge'} onOpenChange={o => !o && setDlg('')} ownerId={partyId} ownerName={partyName} onDone={() => done('Charge recorded')} />}
      {isOwner && <RentDialog open={dlg === 'rent'} onOpenChange={o => !o && setDlg('')} ownerId={partyId} accruals={s?.accruals || []} onDone={() => done('Rent accrual updated')} />}
    </Card>
  );
}

function PayDialog({open, onOpenChange, isOwner, partyId, partyName, outstanding, onDone}: {open: boolean; onOpenChange: (o: boolean) => void; isOwner: boolean; partyId: string; partyName: string; outstanding: number; onDone: () => void}) {
  const [amount, setAmount] = useState(''); const [date, setDate] = useState(todayISO()); const [method, setMethod] = useState('Cash'); const [ref, setRef] = useState(''); const [note, setNote] = useState('');
  const key = useIdemKey(open);
  const n = Number(amount);
  const err = n > outstanding ? `Cannot exceed the outstanding ${isOwner ? 'payable' : 'receivable'} (${taka(outstanding)})` : n < 0 ? 'Cannot be negative' : '';
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={isOwner ? `Pay owner – ${partyName}` : `Receive payment – ${partyName}`} submitLabel={isOwner ? 'Record payment' : 'Record collection'} disabled={!(n > 0) || !!err}
      description={`Outstanding: ${taka(outstanding)}`} confirmText={`${isOwner ? 'Pay' : 'Receive'} ${taka(amount)} ${isOwner ? 'to' : 'from'} ${partyName}?`}
      onSubmit={async () => {
        try { await (isOwner ? payOwnerLedger : collectClientLedger)(partyId, {amount, date, payment_method: method, reference: ref, note}, key.get()); key.renew(); setAmount(''); setRef(''); setNote(''); onDone(); return null; }
        catch (e) { return errText(e); }
      }}>
      <Field label="Amount (৳) *" error={err}><Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
      <Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      <Field label="Payment method"><MethodSelect value={method} onChange={setMethod} /></Field>
      <Field label="Reference"><Input value={ref} onChange={e => setRef(e.target.value)} /></Field>
      <Field label="Note"><Input value={note} onChange={e => setNote(e.target.value)} /></Field>
    </FormDialog>
  );
}

function RentDialog({open, onOpenChange, ownerId, accruals, onDone}: {open: boolean; onOpenChange: (o: boolean) => void; ownerId: string; accruals: any[]; onDone: () => void}) {
  const [period, setPeriod] = useState(thisMonth());
  const [lines, setLines] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => { setLines(null); previewRent(period, ownerId).then((r: any) => setLines(r.lines)).catch(e => setErr(errText(e))); }, [period, ownerId]);
  useEffect(() => { if (open) load(); }, [open, load]);
  const todo = (lines || []).filter(l => !l.alreadyPosted);
  const total = todo.reduce((a, l) => a + Number(l.amount), 0);
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} wide title="Monthly rent accrual" submitLabel={`Post ${todo.length} accrual(s)`} disabled={todo.length === 0}
      description="Review the rent for each eligible vehicle, then post it to the owner's payable. A vehicle is never accrued twice for the same month."
      confirmText={`Post ${taka(total)} of rent for ${period}?`}
      onSubmit={async () => { try { await accrueRent(period, ownerId); onDone(); return null; } catch (e) { return errText(e); } }}>
      <Field label="Billing month"><Input type="month" value={period} onChange={e => setPeriod(e.target.value)} /></Field>
      {err && <div role="alert" style={{color: '#b42318', fontSize: 12.5}}>{err}</div>}
      {!lines ? <div style={{fontSize: 12.5, color: '#64748b'}}>Loading eligible vehicles…</div> : lines.length === 0 ? <div style={{fontSize: 12.5, color: '#64748b'}}>No active vehicles with a rent agreement cover this month.</div> : (
        <div style={{overflowX: 'auto'}}><table style={{width: '100%', fontSize: 12, borderCollapse: 'collapse'}}><thead><tr style={{textAlign: 'left', background: '#f8fafc'}}>{['Vehicle', 'Monthly rate', 'Basis', 'Days charged', 'Calculation', 'Amount', 'Status'].map(h => <th key={h} style={{padding: 6, whiteSpace: 'nowrap'}}>{h}</th>)}</tr></thead>
          <tbody>{lines.map(l => <tr key={l.vehicleId} style={{borderTop: '1px solid #f1f5f9'}}><td style={{padding: 6}}>{l.registration}</td><td className="nums" style={{padding: 6}}>{taka(l.monthlyRate)}</td>
            <td style={{padding: 6}}>{String(l.basis).replace(/_/g, ' ')}</td><td style={{padding: 6}}>{l.daysCharged} / {l.daysInBasis}</td><td style={{padding: 6}}>{l.calculation}</td>
            <td className="nums" style={{padding: 6, fontWeight: 700}}>{taka(l.amount)}</td><td style={{padding: 6}}>{l.alreadyPosted ? `Posted ${taka(l.postedAmount)}` : 'To post'}</td></tr>)}</tbody></table></div>)}
      {accruals.filter(a => a.status === 'posted').length > 0 && (<>
        <h4 style={{fontSize: 12.5, margin: '6px 0 0'}}>Correct a posted accrual</h4>
        {accruals.filter(a => a.status === 'posted').map(a => (
          <div key={a.id} style={{display: 'flex', justifyContent: 'space-between', fontSize: 12.5, alignItems: 'center'}}>
            <span>{a.period} · {a.vehicle} · {taka(a.amount)}</span>
            <button className="btn-reset" style={{height: 26, fontSize: 11}} onClick={async () => {
              const reason = prompt('Reason for reversing this accrual? (history is kept)'); if (!reason) return;
              try { await reverseRentAccrual(a.id, reason); onDone(); load(); } catch (e) { setErr(errText(e)); }
            }}>Reverse</button>
          </div>))}
      </>)}
    </FormDialog>
  );
}

function ChargeDialog({open, onOpenChange, ownerId, ownerName, onDone}: {open: boolean; onOpenChange: (o: boolean) => void; ownerId: string; ownerName: string; onDone: () => void}) {
  const [amount, setAmount] = useState(''); const [date, setDate] = useState(todayISO()); const [desc, setDesc] = useState(''); const [ref, setRef] = useState('');
  const key = useIdemKey(open);
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={`Additional charge – ${ownerName}`} description="An approved extra amount payable to the owner (not monthly rent)." submitLabel="Add charge"
      disabled={!(Number(amount) > 0) || !desc.trim()} confirmText={`Add a payable of ${taka(amount)} to ${ownerName}?`}
      onSubmit={async () => { try { await postOwnerCharge(ownerId, {amount, date, description: desc, reference: ref}, key.get()); key.renew(); setAmount(''); setDesc(''); setRef(''); onDone(); return null; } catch (e) { return errText(e); } }}>
      <Field label="Amount (৳) *"><Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
      <Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      <Field label="Description *"><Input value={desc} onChange={e => setDesc(e.target.value)} /></Field>
      <Field label="Reference"><Input value={ref} onChange={e => setRef(e.target.value)} /></Field>
    </FormDialog>
  );
}
