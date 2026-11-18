"use client";
import {useCallback, useEffect, useRef, useState} from 'react';
import {Printer, Wallet, HandCoins, Fuel, Landmark} from 'lucide-react';
import {fetchDriverFinance, issueDriverAdvance, issueDriverFuelGas, payDriverSalary, reverseSalaryPayment} from '@/lib/finance-api';
import {fetchVehicles} from '@/lib/api';
import {Field, FormDialog, HistoryTable, Input, MethodSelect, NativeSelect, Stat, errText, taka, thisMonth, todayISO, useIdemKey} from './common';
import {OpeningBalanceDialog} from './opening-balance';
import {Card} from '@/components/ui/card';
import {printDoc} from '@/lib/print-doc';

type Summary = Record<string, any>;

/** Driver Profile financial summary: salary, advance ledger, fuel/gas ledger, salary payments, history. All values come from the party ledger. */
export function DriverFinancePanel({driverId, driverName, onChanged, request, onRequestHandled}: {driverId: string; driverName: string; onChanged?: () => void; request?: 'salary' | 'advance' | 'fuel' | null; onRequestHandled?: () => void}) {
  const [s, setS] = useState<Summary | null>(null);
  const [err, setErr] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dlg, setDlg] = useState<'' | 'advance' | 'fuel' | 'salary' | 'opening'>('');
  const [toast, setToast] = useState('');

  const latest = useRef(0);
  const load = useCallback(() => {
    const ticket = ++latest.current;   // only the latest request may update the panel (driver or date filters may have changed)
    setErr('');
    fetchDriverFinance(driverId, from || undefined, to || undefined)
      .then(x => { if (ticket === latest.current) setS(x); })
      .catch(e => { if (ticket === latest.current) setErr(errText(e)); });
  }, [driverId, from, to]);
  useEffect(() => { setS(null); load(); }, [load]);
  useEffect(() => { if (request) { setDlg(request); onRequestHandled?.(); } }, [request]); // eslint-disable-line react-hooks/exhaustive-deps
  const done = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); load(); onChanged?.(); };

  const [report, setReport] = useState<'all' | 'salary' | 'advance' | 'fuel'>('all');
  const REPORTS: Record<string, {title: string; accounts: string[] | null}> = {
    all: {title: 'Driver Financial Statement', accounts: null},
    salary: {title: 'Driver Salary Report', accounts: ['driver_salary']},
    advance: {title: 'Driver Advance Report', accounts: ['driver_advance']},
    fuel: {title: 'Driver Fuel/Gas Report', accounts: ['driver_fuel_gas', 'driver_fuel_reimb']},
  };
  function printStatement() {
    if (!s) return;
    const def = REPORTS[report];
    const rows = (s.history as any[]).filter(h => !def.accounts || def.accounts.includes(h.account));
    const total = rows.reduce((a, h) => a + Number(h.delta), 0);
    const balances: [string, string][] = report === 'salary' ? [['Salary due', s.remainingSalaryDue], ['Total salary paid', s.totalSalaryPaid]]
      : report === 'advance' ? [['Advance received', s.totalAdvanceReceived], ['Advance adjusted', s.totalAdvanceAdjusted], ['Remaining advance due', s.remainingAdvanceDue]]
      : report === 'fuel' ? [['Fuel/Gas money total', s.totalFuelGas], ['Settled', s.fuelGasSettled], ['Remaining fuel/gas', s.remainingFuelGas], ['Reimbursable to driver', s.remainingFuelGasReimbursable]]
      : [['Monthly salary', s.monthlySalary], ['Salary due', s.remainingSalaryDue], ['Advance due', s.remainingAdvanceDue], ['Fuel/Gas due', s.remainingFuelGas]];
    const ok = printDoc({
      title: `${def.title} – ${driverName}`, subtitle: `${from || 'Start'} to ${to || 'today'}`,
      columns: [{label: 'Date'}, {label: 'Account'}, {label: 'Type'}, {label: 'Description'}, {label: 'Reference'}, {label: 'Amount (৳)', align: 'right'}],
      rows: rows.map(h => [h.date, String(h.account).replace(/_/g, ' '), h.type, h.description || '', h.reference || '', Number(h.delta).toLocaleString('en-US', {minimumFractionDigits: 2})]),
      totals: [...balances.map(([k, v]) => [k, '৳ ' + Number(v).toLocaleString('en-US', {minimumFractionDigits: 2})] as [string, string]), ['Net movement in this period', '৳ ' + total.toLocaleString('en-US', {minimumFractionDigits: 2})]],
    });
    if (!ok) setErr('Allow pop-ups to print the statement');
  }

  return (
    <Card id="driver-finance" style={{padding: 16, borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10}}>
        <h3 style={{margin: 0, fontSize: 14, fontWeight: 800}}>Financial summary – {driverName}</h3>
        <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
          <button className="btn-reset" onClick={() => setDlg('advance')}><HandCoins size={14} /> Issue advance</button>
          <button className="btn-reset" onClick={() => setDlg('fuel')}><Fuel size={14} /> Fuel/Gas money</button>
          <button className="btn-reset" onClick={() => setDlg('opening')}><Landmark size={14} /> Previous due</button>
          <button className="btn-primary-blue" style={{height: 34, padding: '0 14px', borderRadius: 8}} onClick={() => setDlg('salary')}><Wallet size={14} /> Pay salary</button>
        </div>
      </div>
      {toast && <div role="status" style={{background: '#ecfdf3', border: '1px solid #abefc6', color: '#067647', borderRadius: 8, padding: '6px 10px', fontSize: 12.5, marginBottom: 8}}>{toast}</div>}
      {err && <div role="alert" style={{color: '#b42318', fontSize: 12.5}}>{err}</div>}
      {!s && !err && <div style={{color: '#64748b', fontSize: 12.5}}>Loading financial summary…</div>}
      {s && (<>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8}}>
          <Stat label="Monthly salary" value={taka(s.monthlySalary)} />
          <Stat label="Previous salary due" value={taka(s.previousSalaryDue)} />
          <Stat label="Total salary earned" value={taka(s.totalSalaryEarned)} />
          <Stat label="Total salary paid" value={taka(s.totalSalaryPaid)} />
          <Stat label="Remaining salary due" value={taka(s.remainingSalaryDue)} tone={Number(s.remainingSalaryDue) > 0 ? 'warn' : 'good'} />
          <Stat label="Advance received" value={taka(s.totalAdvanceReceived)} />
          <Stat label="Advance adjusted" value={taka(s.totalAdvanceAdjusted)} />
          <Stat label="Remaining advance due" value={taka(s.remainingAdvanceDue)} tone={Number(s.remainingAdvanceDue) > 0 ? 'warn' : 'good'} />
          <Stat label="Fuel/Gas money total" value={taka(s.totalFuelGas)} />
          <Stat label="Fuel/Gas settled" value={taka(s.fuelGasSettled)} />
          <Stat label="Remaining Fuel/Gas" value={taka(s.remainingFuelGas)} tone={Number(s.remainingFuelGas) > 0 ? 'warn' : 'good'} />
          <Stat label="Fuel/Gas reimbursable to driver" value={taka(s.remainingFuelGasReimbursable)} />
          <Stat label="Other outstanding" value={taka(s.otherOutstanding)} />
        </div>

        <h4 style={{fontSize: 13, margin: '14px 0 6px'}}>Salary payments</h4>
        {s.salaryPayments.length === 0 ? <div style={{fontSize: 12.5, color: '#64748b'}}>No salary has been paid through the system yet.</div> : (
          <div style={{overflowX: 'auto'}}><table style={{width: '100%', fontSize: 12, borderCollapse: 'collapse'}}>
            <thead><tr style={{background: '#f8fafc', textAlign: 'left'}}>{['Month', 'Net payable', 'Advance adj.', 'Fuel/Gas', 'Paid', 'Remaining', 'Status', ''].map(h => <th key={h} style={{padding: '6px 8px'}}>{h}</th>)}</tr></thead>
            <tbody>{s.salaryPayments.map((p: any) => (
              <tr key={p.id} style={{borderTop: '1px solid #f1f5f9', opacity: p.status === 'reversed' ? 0.5 : 1}}>
                <td style={{padding: '6px 8px'}}>{p.month}</td><td className="nums" style={{padding: '6px 8px'}}>{taka(p.net)}</td><td className="nums" style={{padding: '6px 8px'}}>{taka(p.advance)}</td>
                <td className="nums" style={{padding: '6px 8px'}}>{taka(p.fuelGas)}</td><td className="nums" style={{padding: '6px 8px'}}>{taka(p.paid)}</td><td className="nums" style={{padding: '6px 8px'}}>{taka(p.remaining)}</td>
                <td style={{padding: '6px 8px'}}>{p.status}</td>
                <td style={{padding: '6px 8px'}}>{p.status === 'posted' && <button className="btn-reset" style={{height: 26, fontSize: 11}} onClick={async () => {
                  const reason = prompt('Reason for reversing this salary payment?');
                  if (!reason) return;
                  try { await reverseSalaryPayment(p.id, reason); done('Salary payment reversed'); } catch (e) { setErr(errText(e)); }
                }}>Reverse</button>}</td>
              </tr>))}</tbody></table></div>)}

        <div style={{display: 'flex', alignItems: 'end', gap: 8, flexWrap: 'wrap', margin: '14px 0 6px'}}>
          <h4 style={{fontSize: 13, margin: 0, flex: 1}}>Transaction history</h4>
          <label><span className="field-label">From</span><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label><span className="field-label">To</span><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
          <label><span className="field-label">Report</span><select value={report} onChange={e => setReport(e.target.value as any)} style={{height: 38, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 8px', background: '#fff'}}><option value="all">Full statement</option><option value="salary">Salary</option><option value="advance">Advance</option><option value="fuel">Fuel/Gas</option></select></label>
          <button className="btn-reset" onClick={printStatement}><Printer size={14} /> Print</button>
        </div>
        <HistoryTable rows={s.history} />
      </>)}

      <AdvanceDialog open={dlg === 'advance'} onOpenChange={o => !o && setDlg('')} driverId={driverId} driverName={driverName} onDone={() => done('Advance recorded')} />
      <FuelDialog open={dlg === 'fuel'} onOpenChange={o => !o && setDlg('')} driverId={driverId} driverName={driverName} onDone={() => done('Fuel/Gas money recorded')} />
      {s && <SalaryDialog open={dlg === 'salary'} onOpenChange={o => !o && setDlg('')} driverId={driverId} driverName={driverName} summary={s} onDone={() => done('Salary payment recorded')} />}
      <OpeningBalanceDialog open={dlg === 'opening'} onOpenChange={o => !o && setDlg('')} partyId={driverId} partyName={driverName} kind="driver" onDone={() => done('Previous due recorded')} />
    </Card>
  );
}

function AdvanceDialog({open, onOpenChange, driverId, driverName, onDone}: {open: boolean; onOpenChange: (o: boolean) => void; driverId: string; driverName: string; onDone: () => void}) {
  const [amount, setAmount] = useState(''); const [date, setDate] = useState(todayISO()); const [method, setMethod] = useState('Cash'); const [ref, setRef] = useState(''); const [desc, setDesc] = useState('');
  const key = useIdemKey(open);
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={`Issue advance – ${driverName}`} submitLabel="Record advance" disabled={!(Number(amount) > 0)}
      confirmText={`Issue an advance of ${taka(amount)} to ${driverName}?`}
      onSubmit={async () => { try { await issueDriverAdvance(driverId, {amount, date, payment_method: method, reference: ref, description: desc}, key.get()); key.renew(); setAmount(''); setRef(''); setDesc(''); onDone(); return null; } catch (e) { return errText(e); } }}>
      <Field label="Amount (৳) *"><Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
      <Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      <Field label="Payment method"><MethodSelect value={method} onChange={setMethod} /></Field>
      <Field label="Reference"><Input value={ref} onChange={e => setRef(e.target.value)} /></Field>
      <Field label="Description"><Input value={desc} onChange={e => setDesc(e.target.value)} /></Field>
    </FormDialog>
  );
}

function FuelDialog({open, onOpenChange, driverId, driverName, onDone}: {open: boolean; onOpenChange: (o: boolean) => void; driverId: string; driverName: string; onDone: () => void}) {
  const [amount, setAmount] = useState(''); const [date, setDate] = useState(todayISO()); const [dir, setDir] = useState('driver_owes'); const [vehicle, setVehicle] = useState(''); const [ref, setRef] = useState(''); const [desc, setDesc] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const key = useIdemKey(open);
  useEffect(() => { if (open) fetchVehicles().then((v: any) => Array.isArray(v) && setVehicles(v)).catch(() => {}); }, [open]);
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={`Fuel/Gas money – ${driverName}`} submitLabel="Record" disabled={!(Number(amount) > 0)}
      description="Fuel/Gas money is tracked separately from advances."
      confirmText={`Record ${taka(amount)} of fuel/gas money (${dir === 'driver_owes' ? 'given to the driver' : 'owed to the driver'})?`}
      onSubmit={async () => { try { await issueDriverFuelGas(driverId, {amount, date, direction: dir, vehicle_id: vehicle ? Number(vehicle) : undefined, reference: ref, description: desc}, key.get()); key.renew(); setAmount(''); onDone(); return null; } catch (e) { return errText(e); } }}>
      <Field label="Direction" hint="Company gave money to the driver, or the driver paid from their own pocket">
        <NativeSelect value={dir} onChange={setDir}><option value="driver_owes">Company gave fuel/gas money to the driver</option><option value="company_owes">Driver paid fuel/gas – reimburse the driver</option></NativeSelect>
      </Field>
      <Field label="Amount (৳) *"><Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
      <Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      <Field label="Vehicle (optional)"><NativeSelect value={vehicle} onChange={setVehicle}><option value="">— none —</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.registration}</option>)}</NativeSelect></Field>
      <Field label="Reference"><Input value={ref} onChange={e => setRef(e.target.value)} /></Field>
      <Field label="Reason / description"><Input value={desc} onChange={e => setDesc(e.target.value)} /></Field>
    </FormDialog>
  );
}

function SalaryDialog({open, onOpenChange, driverId, driverName, summary, onDone}: {open: boolean; onOpenChange: (o: boolean) => void; driverId: string; driverName: string; summary: Summary; onDone: () => void}) {
  const [month, setMonth] = useState(thisMonth()); const [date, setDate] = useState(todayISO()); const [method, setMethod] = useState('Cash'); const [ref, setRef] = useState(''); const [notes, setNotes] = useState('');
  const [adv, setAdv] = useState(''); const [fuel, setFuel] = useState(''); const [mode, setMode] = useState('cash'); const [dir, setDir] = useState('driver_owes'); const [paid, setPaid] = useState('');
  const key = useIdemKey(open);
  useEffect(() => { if (open) { setAdv(''); setFuel(''); setPaid(''); setRef(''); setNotes(''); setMonth(thisMonth()); setDate(todayISO()); } }, [open]);
  const accrued: string[] = summary.accruedPeriods || [];
  const alreadyPaid = (summary.salaryPayments || []).some((p: any) => p.month === month && p.status === 'posted');
  const salaryDue = Number(summary.remainingSalaryDue) + (accrued.includes(month) ? 0 : Number(summary.monthlySalary));
  const advBal = Number(summary.remainingAdvanceDue);
  const fuelBal = Number(dir === 'driver_owes' ? summary.remainingFuelGas : summary.remainingFuelGasReimbursable);
  const a = Number(adv) || 0; const f = Number(fuel) || 0;
  const deduction = a + (mode === 'salary_deduction' ? f : 0);
  const addition = mode === 'salary_addition' ? f : 0;
  const net = salaryDue - deduction + addition;
  const errors: Record<string, string> = {};
  if (a < 0) errors.adv = 'Cannot be negative'; else if (a > advBal) errors.adv = `Cannot exceed the outstanding advance (${taka(advBal)})`;
  if (f < 0) errors.fuel = 'Cannot be negative'; else if (f > fuelBal) errors.fuel = `Cannot exceed the outstanding balance (${taka(fuelBal)})`;
  if (deduction > salaryDue) errors.adv = errors.adv || 'Adjustments exceed the salary payable';
  const paidNum = paid === '' ? net : Number(paid);
  if (paidNum > net || paidNum < 0) errors.paid = `Amount paid must be between 0 and ${taka(net)}`;
  if (alreadyPaid) errors.month = `Salary for ${month} has already been settled for this driver`;
  const ok = Object.keys(errors).length === 0 && salaryDue > 0;
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} wide title={`Pay salary – ${driverName}`} submitLabel="Pay salary" disabled={!ok}
      description="Salary, advance adjustment and fuel/gas settlement are posted together or not at all."
      confirmText={`Pay ${taka(paidNum)} for ${month}, adjusting ${taka(a)} advance${f ? ` and settling ${taka(f)} fuel/gas` : ''}? This cannot be repeated for the same month.`}
      onSubmit={async () => {
        try {
          await payDriverSalary(driverId, {salary_month: month, payment_date: date, payment_method: method, reference: ref, notes, advance_adjustment: a || 0, fuel_gas_settlement: f || 0,
            fuel_gas_mode: f ? mode : 'none', fuel_gas_direction: dir, amount_paid: paid === '' ? undefined : paid}, key.get());
          key.renew(); onDone(); return null;
        } catch (e) { return errText(e); }
      }}>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8}}>
        <Stat label="Monthly salary" value={taka(summary.monthlySalary)} /><Stat label="Advance outstanding" value={taka(advBal)} /><Stat label="Fuel/Gas outstanding" value={taka(fuelBal)} />
      </div>
      <div className="form-grid">
        <Field label="Salary month *" error={errors.month}><Input type="month" value={month} onChange={e => setMonth(e.target.value)} /></Field>
        <Field label="Payment date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Advance adjustment (৳)" error={errors.adv} hint={`Remaining advance after: ${taka(advBal - a)}`}><Input type="number" min="0" step="0.01" value={adv} onChange={e => setAdv(e.target.value)} /></Field>
        <Field label="Fuel/Gas type"><NativeSelect value={dir} onChange={setDir}><option value="driver_owes">Money held by driver</option><option value="company_owes">Reimbursable to driver</option></NativeSelect></Field>
        <Field label="Fuel/Gas settlement (৳)" error={errors.fuel} hint={`Remaining after: ${taka(fuelBal - f)}`}><Input type="number" min="0" step="0.01" value={fuel} onChange={e => setFuel(e.target.value)} /></Field>
        <Field label="Settled by">
          <NativeSelect value={mode} onChange={setMode}>
            {dir === 'driver_owes' ? <><option value="cash">Cash returned by driver (separate from salary)</option><option value="salary_deduction">Deduct from salary</option><option value="carry_forward">Leave outstanding (carry forward)</option></> : <><option value="cash">Paid to driver in cash (separate)</option><option value="salary_addition">Add to salary</option><option value="carry_forward">Leave outstanding (carry forward)</option></>}
          </NativeSelect>
        </Field>
        <Field label="Payment method"><MethodSelect value={method} onChange={setMethod} /></Field>
        <Field label="Transaction reference"><Input value={ref} onChange={e => setRef(e.target.value)} /></Field>
      </div>
      <div style={{background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 10, fontSize: 13}}>
        Net salary payable: <b className="nums">{taka(net)}</b> · Remaining after payment: <b className="nums">{taka(net - paidNum)}</b>
      </div>
      <Field label="Amount actually paid (৳)" error={errors.paid} hint="Leave empty to pay the full net amount; pay less for a partial payment"><Input type="number" min="0" step="0.01" value={paid} onChange={e => setPaid(e.target.value)} /></Field>
      <Field label="Notes"><Input value={notes} onChange={e => setNotes(e.target.value)} /></Field>
    </FormDialog>
  );
}
