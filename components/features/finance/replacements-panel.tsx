"use client";
import {useCallback, useEffect, useState} from 'react';
import {Plus, Trash2} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {createReplacement, deleteReplacement, fetchReplacements} from '@/lib/finance-api';
import {fetchDrivers, fetchVehicles} from '@/lib/api';
import {Field, FormDialog, Input, NativeSelect, errText, todayISO} from './common';

/** Replacement-driver history: who replaced whom, on which date, in which vehicle. Informational – never changes salary. */
export function ReplacementsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [f, setF] = useState({date_from: '', date_to: '', driver_id: '', replacement_driver_id: '', vehicle_id: ''});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);
  const blank = {date: todayISO(), date_to: '', original: '', replacement: '', vehicle: '', reason: '', notes: ''};
  const [form, setForm] = useState(blank);
  const [toast, setToast] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v; });
    fetchReplacements(params).then(r => { setRows(Array.isArray(r) ? r : []); setErr(''); }).catch(e => setErr(errText(e))).finally(() => setLoading(false));
  }, [f]);
  useEffect(load, [load]);
  useEffect(() => {
    fetchDrivers(1).then((d: any) => Array.isArray(d) && setDrivers(d)).catch(() => {});
    fetchVehicles(1).then((v: any) => Array.isArray(v) && setVehicles(v)).catch(() => {});
  }, []);

  // A range of dates saves one record per day (each day is its own auditable row)
  function dates() {
    const end = form.date_to || form.date;
    const out: string[] = [];
    for (let d = new Date(form.date + 'T00:00:00'); d <= new Date(end + 'T00:00:00') && out.length < 62; d.setDate(d.getDate() + 1)) out.push(d.toISOString().slice(0, 10));
    return out;
  }
  const list = form.date ? dates() : [];
  const invalid = !form.date || !form.original || !form.replacement || !form.vehicle || form.original === form.replacement || (form.date_to && form.date_to < form.date);

  async function save(): Promise<string | null> {
    const done: string[] = [];
    for (const day of list) {
      try { await createReplacement({date: day, original_driver_id: Number(form.original), replacement_driver_id: Number(form.replacement), vehicle_id: Number(form.vehicle), reason: form.reason, notes: form.notes}); done.push(day); }
      catch (e) { load(); return `${day}: ${errText(e)}${done.length ? ` (${done.length} earlier day(s) were saved)` : ''}`; }
    }
    setToast(`${done.length} replacement record(s) saved`); setTimeout(() => setToast(''), 3500); setForm(blank); load();
    return null;
  }

  return (
    <Card style={{padding: 16}}>
      <div style={{display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12}}>
        <div><h3 style={{fontSize: 15, fontWeight: 750, margin: 0}}>Replacement driver history</h3>
          <p style={{fontSize: 12, color: '#64748b', margin: '2px 0 0'}}>Records who covered for whom. Salary is not changed automatically.</p></div>
        <button className="btn-primary-blue" style={{height: 38, padding: '0 16px', borderRadius: 8}} onClick={() => setOpen(true)}><Plus size={15} /> Record replacement</button>
      </div>
      {toast && <div role="status" style={{background: '#ecfdf3', border: '1px solid #abefc6', color: '#067647', borderRadius: 8, padding: '6px 10px', fontSize: 12.5, marginBottom: 8}}>{toast}</div>}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8, marginBottom: 12}}>
        <Field label="From"><Input type="date" value={f.date_from} onChange={e => setF({...f, date_from: e.target.value})} /></Field>
        <Field label="To"><Input type="date" value={f.date_to} onChange={e => setF({...f, date_to: e.target.value})} /></Field>
        <Field label="Regular driver"><NativeSelect value={f.driver_id} onChange={v => setF({...f, driver_id: v})}><option value="">All</option>{drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</NativeSelect></Field>
        <Field label="Replacement driver"><NativeSelect value={f.replacement_driver_id} onChange={v => setF({...f, replacement_driver_id: v})}><option value="">All</option>{drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</NativeSelect></Field>
        <Field label="Vehicle"><NativeSelect value={f.vehicle_id} onChange={v => setF({...f, vehicle_id: v})}><option value="">All</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.registration}</option>)}</NativeSelect></Field>
      </div>
      {err && <div role="alert" style={{color: '#b42318', fontSize: 12.5}}>{err}</div>}
      <div style={{overflowX: 'auto'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 12.5}}>
          <thead><tr style={{background: '#f8fafc', textAlign: 'left'}}>{['Date', 'Regular driver', 'Replacement driver', 'Vehicle', 'Reason', ''].map(h => <th key={h} style={{padding: '8px 10px'}}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} style={{padding: 24, textAlign: 'center', color: '#64748b'}}>{loading ? 'Loading…' : 'No replacement records for these filters.'}</td></tr>}
            {rows.map(r => (
              <tr key={r.id} style={{borderTop: '1px solid #f1f5f9'}}>
                <td style={{padding: '8px 10px', whiteSpace: 'nowrap'}}>{r.date}</td><td style={{padding: '8px 10px'}}>{r.originalDriver}</td><td style={{padding: '8px 10px'}}>{r.replacementDriver}</td>
                <td style={{padding: '8px 10px'}}>{r.vehicle}</td><td style={{padding: '8px 10px'}}>{r.reason}{r.notes ? ` – ${r.notes}` : ''}</td>
                <td style={{padding: '8px 10px'}}><button className="action-btn action-btn-red" title="Delete record" onClick={async () => {
                  if (!confirm(`Delete the ${r.date} replacement record?`)) return;
                  try { await deleteReplacement(r.id); load(); } catch (e) { setErr(errText(e)); }
                }}><Trash2 size={14} /></button></td>
              </tr>))}
          </tbody>
        </table>
      </div>

      <FormDialog open={open} onOpenChange={setOpen} title="Record replacement driver" submitLabel={`Save ${list.length > 1 ? list.length + ' days' : 'record'}`} disabled={!!invalid}
        description="Choose a single date, or a date range to save one record per day." onSubmit={save}>
        <div className="form-grid">
          <Field label="From date *"><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></Field>
          <Field label="To date (optional)" error={form.date_to && form.date_to < form.date ? 'Must not be before the start date' : ''}><Input type="date" value={form.date_to} onChange={e => setForm({...form, date_to: e.target.value})} /></Field>
        </div>
        <Field label="Regular (original) driver *"><NativeSelect value={form.original} onChange={v => setForm({...form, original: v})}><option value="">Select…</option>{drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</NativeSelect></Field>
        <Field label="Replacement driver *" error={form.original && form.original === form.replacement ? 'A driver cannot replace themself' : ''}><NativeSelect value={form.replacement} onChange={v => setForm({...form, replacement: v})}><option value="">Select…</option>{drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</NativeSelect></Field>
        <Field label="Vehicle *"><NativeSelect value={form.vehicle} onChange={v => setForm({...form, vehicle: v})}><option value="">Select…</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.registration}</option>)}</NativeSelect></Field>
        <Field label="Reason (optional)"><Input value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="e.g. Sick leave" /></Field>
        <Field label="Notes"><Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></Field>
      </FormDialog>
    </Card>
  );
}
