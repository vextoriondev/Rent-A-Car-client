"use client";
import {useCallback, useEffect, useRef, useState} from 'react';
import {Plus, Trash2, Printer} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {apiRequest, fetchOwners, fetchClients, fetchVehicles} from '@/lib/api';
import {createTasinAgreement, fetchTasinAgreements, updateTasinAgreement} from '@/lib/finance-api';
import {AttachmentPanel} from '@/components/features/files/attachment-panel';
import {Field, FormDialog, Input, NativeSelect, errText, taka, todayISO} from './common';

type Tab = 'all' | 'client' | 'owner';
const TAB_LABEL: Record<Tab, string> = {all: 'All Agreements', client: 'Client Agreements', owner: 'Owner Agreements'};
void apiRequest;

/** Client / Owner agreements with an Agreement Type selector and a dynamic list of custom Terms & Conditions. */
export function TasinAgreements() {
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState<null | {id?: number}>(null);
  const [view, setView] = useState<any>(null);
  const [toast, setToast] = useState('');

  const latest = useRef(0);
  const load = useCallback(() => {
    const ticket = ++latest.current;   // an older, slower response must never overwrite the list of the tab now selected
    setLoading(true);
    setRows([]);                       // never show another tab's rows while the new tab loads
    fetchTasinAgreements(tab === 'all' ? undefined : tab, q || undefined)
      .then((r: any) => { if (ticket === latest.current) { setRows(Array.isArray(r) ? r : []); setErr(''); } })
      .catch(e => { if (ticket === latest.current) setErr(errText(e)); })
      .finally(() => { if (ticket === latest.current) setLoading(false); });
  }, [tab, q]);
  useEffect(load, [load]);

  return (
    <Card style={{padding: 16, marginTop: 16}}>
      <div style={{display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10}}>
        <div><h3 style={{margin: 0, fontSize: 15, fontWeight: 750}}>Client &amp; Owner Agreements</h3>
          <p style={{margin: '2px 0 0', fontSize: 12, color: '#64748b'}}>Agreements with custom terms &amp; conditions. Client and owner agreements are kept separate.</p></div>
        <button className="btn-primary-blue" style={{height: 38, padding: '0 16px', borderRadius: 8}} onClick={() => setDlg({})}><Plus size={15} /> Add Agreement</button>
      </div>
      <div style={{display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10}}>
        {(Object.keys(TAB_LABEL) as Tab[]).map(k => (
          <button key={k} onClick={() => setTab(k)} className="btn-reset" style={{height: 32, fontWeight: tab === k ? 700 : 500, background: tab === k ? '#eff6ff' : undefined, color: tab === k ? '#1677ff' : undefined}}>{TAB_LABEL[k]}</button>))}
        <Input style={{maxWidth: 240, marginLeft: 'auto'}} placeholder="Search title, party, vehicle…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {toast && <div role="status" style={{background: '#ecfdf3', border: '1px solid #abefc6', color: '#067647', borderRadius: 8, padding: '6px 10px', fontSize: 12.5, marginBottom: 8}}>{toast}</div>}
      {err && <div role="alert" style={{color: '#b42318', fontSize: 12.5}}>{err}</div>}
      <div style={{overflowX: 'auto'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 12.5}}>
          <thead><tr style={{background: '#f8fafc', textAlign: 'left'}}>{['Type', 'Title', 'Party', 'Vehicle', 'Period', 'Monthly', 'Terms', 'Status', ''].map(h => <th key={h} style={{padding: '8px 10px', whiteSpace: 'nowrap'}}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={9} style={{padding: 24, textAlign: 'center', color: '#64748b'}}>{loading ? 'Loading…' : `No ${tab === 'all' ? '' : tab + ' '}agreements yet.`}</td></tr>}
            {rows.map(a => (
              <tr key={a.id} style={{borderTop: '1px solid #f1f5f9'}}>
                <td style={{padding: '8px 10px'}}><span className="badge badge-neutral">{a.typeLabel}</span></td>
                <td style={{padding: '8px 10px', fontWeight: 600}}>{a.title}</td><td style={{padding: '8px 10px'}}>{a.party}</td><td style={{padding: '8px 10px'}}>{a.vehicle || '—'}</td>
                <td style={{padding: '8px 10px', whiteSpace: 'nowrap'}}>{a.startDate} → {a.endDate || 'open'}</td><td className="nums" style={{padding: '8px 10px'}}>{taka(a.monthlyAmount)}</td>
                <td style={{padding: '8px 10px'}}>{a.defaultTerms.length + a.customTerms.length}</td><td style={{padding: '8px 10px', textTransform: 'capitalize'}}>{a.status}</td>
                <td style={{padding: '8px 10px', whiteSpace: 'nowrap'}}>
                  <button className="btn-reset" style={{height: 26, fontSize: 11}} onClick={() => setView(a)}>View</button>{' '}
                  {a.status === 'draft' && <button className="btn-reset" style={{height: 26, fontSize: 11}} onClick={() => setDlg({id: a.id})}>Edit</button>}
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>
      {dlg && <AgreementDialog key={dlg.id ?? 'new'} existing={rows.find(r => r.id === dlg.id)} defaultType={tab === 'owner' ? 'owner' : 'client'} onClose={() => setDlg(null)} onDone={() => { setDlg(null); setToast('Agreement saved'); setTimeout(() => setToast(''), 3500); load(); }} />}
      {view && <ViewDialog a={view} onClose={() => setView(null)} />}
    </Card>
  );
}

function ViewDialog({a, onClose}: {a: any; onClose: () => void}) {
  const terms: string[] = [...a.defaultTerms, ...a.customTerms];
  const content = a.finalContent || [a.title, `${a.typeLabel} – ${a.party}`, '', 'Terms & Conditions', ...terms.map((t, i) => `${i + 1}. ${t}`)].join('\n');
  return (
    <FormDialog open onOpenChange={o => !o && onClose()} title={a.title} description={`${a.typeLabel} · ${a.party}${a.vehicle ? ' · ' + a.vehicle : ''}`} submitLabel="Print"
      onSubmit={async () => { const w = window.open('', '_blank'); if (w) { w.document.write(`<pre style="font-family:Arial;font-size:13px;white-space:pre-wrap;padding:24px">${content.replace(/[&<>]/g, (c: string) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'} as Record<string, string>)[c])}</pre>`); w.document.close(); w.print(); } return null; }}>
      <pre style={{whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 12.5, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, maxHeight: 360, overflow: 'auto'}}>{content}</pre>
      <span style={{fontSize: 11.5, color: '#64748b'}}><Printer size={12} /> Printing uses the saved agreement text.</span>
      <AttachmentPanel entity="agreement" id={a.id} title="Agreement Documents" showPhotos={false} documentCategories={['agreement_pdf','scan','stamp_paper','signed','legal','other']} />
    </FormDialog>
  );
}

function AgreementDialog({existing, defaultType, onClose, onDone}: {existing?: any; defaultType: string; onClose: () => void; onDone: () => void}) {
  const [type, setType] = useState<string>(existing?.type || defaultType);
  const [party, setParty] = useState<string>(existing ? String(existing.partyId) : '');
  const [vehicle, setVehicle] = useState<string>(existing?.vehicleId ? String(existing.vehicleId) : '');
  const [title, setTitle] = useState<string>(existing?.title || '');
  const [start, setStart] = useState<string>(existing?.startDate || todayISO());
  const [end, setEnd] = useState<string>(existing?.endDate || '');
  const [amount, setAmount] = useState<string>(existing ? String(Number(existing.monthlyAmount)) : '');
  const [terms, setTerms] = useState<string[]>(existing?.customTerms?.length ? existing.customTerms : []);
  const [finalize, setFinalize] = useState(false);
  const [owners, setOwners] = useState<any[]>([]); const [clients, setClients] = useState<any[]>([]); const [vehicles, setVehicles] = useState<any[]>([]);
  useEffect(() => {
    fetchOwners(1).then((r: any) => Array.isArray(r) && setOwners(r)).catch(() => {});
    fetchClients(1).then((r: any) => Array.isArray(r) && setClients(r)).catch(() => {});
    fetchVehicles(1).then((r: any) => Array.isArray(r) && setVehicles(r)).catch(() => {});
  }, []);
  const parties = type === 'client' ? clients : owners;
  const vehicleOptions = type === 'owner' && party ? vehicles.filter(v => String(v.ownerId) === party) : vehicles;
  const dateErr = end && end < start ? 'End date cannot be before the start date' : '';
  const setTerm = (i: number, v: string) => setTerms(t => t.map((x, j) => (j === i ? v : x)));
  return (
    <FormDialog open onOpenChange={o => !o && onClose()} wide title={existing ? 'Edit Agreement' : 'Add Agreement'} submitLabel={finalize ? 'Save & finalize' : 'Save draft'}
      disabled={!party || !title.trim() || !!dateErr} confirmText={finalize ? 'Finalizing locks the agreement text so it can no longer be edited. Continue?' : undefined}
      onSubmit={async () => {
        const body = {agreement_type: type, party_id: Number(party), vehicle_id: vehicle ? Number(vehicle) : undefined, title, start_date: start, end_date: end || undefined, monthly_amount: amount || '0',
          default_terms: existing?.defaultTerms || [], custom_terms: terms.filter(t => t.trim()), finalize};
        try { await (existing ? updateTasinAgreement(existing.id, body) : createTasinAgreement(body)); onDone(); return null; } catch (e) { return errText(e); }
      }}>
      <Field label="Agreement type *">
        <NativeSelect value={type} onChange={v => { setType(v); setParty(''); setVehicle(''); }}>
          <option value="client" disabled={!!existing && existing.type !== 'client'}>Client Agreement</option><option value="owner" disabled={!!existing && existing.type !== 'owner'}>Owner Agreement</option>
        </NativeSelect>
      </Field>
      <Field label={type === 'client' ? 'Client *' : 'Owner *'}><NativeSelect value={party} onChange={v => { setParty(v); setVehicle(''); }}><option value="">Select…</option>{parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</NativeSelect></Field>
      <Field label="Vehicle (optional)"><NativeSelect value={vehicle} onChange={setVehicle}><option value="">— none —</option>{vehicleOptions.map(v => <option key={v.id} value={v.id}>{v.registration}</option>)}</NativeSelect></Field>
      <Field label="Agreement title *"><Input value={title} onChange={e => setTitle(e.target.value)} /></Field>
      <div className="form-grid">
        <Field label="Start date *"><Input type="date" value={start} onChange={e => setStart(e.target.value)} /></Field>
        <Field label="End date" error={dateErr}><Input type="date" value={end} onChange={e => setEnd(e.target.value)} /></Field>
        <Field label="Monthly amount (৳)"><Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
      </div>
      <div>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6}}>
          <span className="field-label" style={{margin: 0}}>Custom terms &amp; conditions</span>
          <button type="button" className="btn-reset" style={{height: 28}} onClick={() => setTerms(t => [...t, ''])}><Plus size={13} /> Add term</button>
        </div>
        {terms.length === 0 && <div style={{fontSize: 12, color: '#64748b'}}>No custom terms. Use “Add term” for anything beyond the standard fields.</div>}
        {terms.map((t, i) => (
          <div key={i} style={{display: 'flex', gap: 6, alignItems: 'start', marginBottom: 6}}>
            <span style={{fontSize: 12, paddingTop: 8, color: '#64748b', minWidth: 18}}>{i + 1}.</span>
            <textarea value={t} onChange={e => setTerm(i, e.target.value)} rows={2} placeholder="Type the term. Line breaks are kept." style={{flex: 1, border: '1px solid #cbd5e1', borderRadius: 8, padding: 8, fontSize: 12.5, fontFamily: 'inherit', resize: 'vertical'}} />
            <button type="button" className="action-btn action-btn-red" title="Remove term" onClick={() => setTerms(x => x.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
          </div>))}
      </div>
      <label style={{display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5}}><input type="checkbox" checked={finalize} onChange={e => setFinalize(e.target.checked)} /> Finalize now (generates the agreement text; terms can no longer be edited)</label>
      {existing ? <AttachmentPanel entity="agreement" id={existing.id} title="Agreement Documents" showPhotos={false} documentCategories={['agreement_pdf','scan','stamp_paper','signed','legal','other']} /> : <span style={{fontSize: 11.5, color: '#64748b'}}>Save the agreement first, then attach the signed PDF, scans and stamp-paper photos here.</span>}
    </FormDialog>
  );
}
