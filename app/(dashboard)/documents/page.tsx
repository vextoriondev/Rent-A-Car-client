"use client";
import {useCallback, useEffect, useMemo, useState} from 'react';
import {FileText, Plus, Eye, CheckCircle2, X, Search, AlertTriangle, ShieldCheck, Calendar, Edit2, Trash2} from 'lucide-react';
import {fetchVehicles} from '@/lib/api';
import {addVehicleDocument, deleteDocument, fetchAllDocuments, updateDocument} from '@/lib/finance-api';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription} from '@/components/ui/dialog';
import {EmptyState} from '@/components/shared/empty-state';
import {errText} from '@/components/features/finance/common';
import {DocumentCenter} from '@/components/features/files/document-center';
import {ACCEPT, checkFile, uploadFiles} from '@/lib/files';

/** Global Documents: reads and writes the same vehicle-paper records the Vehicle Profile uses (one source of truth). */
const TYPES: {value: string; label: string}[] = [
  {value: 'fitness', label: 'Fitness Certificate'}, {value: 'tax_token', label: 'Tax Token'}, {value: 'registration', label: 'Registration Certificate'},
  {value: 'insurance', label: 'Insurance'}, {value: 'route_permit', label: 'Route Permit'}, {value: 'custom', label: 'Other Document'},
];

interface Doc {
  id: number; vehicleId: number; vehicle: string; paperType: string; typeLabel: string; title: string; paperNumber: string;
  issueDate: string; expiryDate: string; status: 'Valid' | 'Expiring Soon' | 'Expired'; documentUrl: string;
}

const blank = () => ({vehicleId: '', paperType: 'fitness', title: '', paperNumber: '', issueDate: new Date().toISOString().slice(0, 10), expiryDate: '', documentUrl: ''});

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [q, setQ] = useState('');
  const [typeF, setTypeF] = useState('All');
  const [statusF, setStatusF] = useState('All');
  const [dlg, setDlg] = useState<null | {mode: 'add' | 'edit'; id?: number}>(null);
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [viewDoc, setViewDoc] = useState<Doc | null>(null);
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState<'files' | 'papers'>('files');
  const [scan, setScan] = useState<File | null>(null);
  const [filesKey, setFilesKey] = useState(0);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(() => {
    setLoading(true);
    fetchAllDocuments().then((r: any) => { setDocs(Array.isArray(r) ? r : []); setLoadError(''); }).catch(e => setLoadError(errText(e))).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetchVehicles(1).then((v: any) => Array.isArray(v) && setVehicles(v)).catch(() => {}); }, []);
  // refetch when returning to the tab / page so another module's changes are always visible
  useEffect(() => { const h = () => document.visibilityState === 'visible' && load(); document.addEventListener('visibilitychange', h); return () => document.removeEventListener('visibilitychange', h); }, [load]);

  const filtered = useMemo(() => docs.filter(d => {
    const ql = q.toLowerCase();
    return (!q || d.title.toLowerCase().includes(ql) || d.vehicle.toLowerCase().includes(ql) || d.paperNumber.toLowerCase().includes(ql))
      && (typeF === 'All' || d.paperType === typeF) && (statusF === 'All' || d.status === statusF);
  }), [docs, q, typeF, statusF]);

  const kpi = {total: docs.length, valid: docs.filter(d => d.status === 'Valid').length, soon: docs.filter(d => d.status === 'Expiring Soon').length, expired: docs.filter(d => d.status === 'Expired').length};

  function openAdd() { setScan(null); setForm({...blank(), vehicleId: vehicles[0] ? String(vehicles[0].id) : ''}); setErrors({}); setDlg({mode: 'add'}); }
  function openEdit(d: Doc) {
    setForm({vehicleId: String(d.vehicleId), paperType: d.paperType, title: d.title, paperNumber: d.paperNumber, issueDate: d.issueDate, expiryDate: d.expiryDate, documentUrl: d.documentUrl});
    setScan(null); setErrors({}); setDlg({mode: 'edit', id: d.id});
  }

  async function save() {
    const e: Record<string, string> = {};
    if (!form.vehicleId) e.vehicleId = 'Choose a vehicle';
    if (!form.paperNumber.trim()) e.paperNumber = 'Certificate number is required';
    if (form.issueDate && form.expiryDate && form.expiryDate < form.issueDate) e.expiryDate = 'Expiry cannot be before the issue date';
    if (scan) { const bad = checkFile(scan, null); if (bad) e.scan = bad; }
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const body = {paper_type: form.paperType, title: form.title.trim(), paper_number: form.paperNumber.trim(), issue_date: form.issueDate || null, expiry_date: form.expiryDate || null, document_url: form.documentUrl.trim()};
    try {
      if (dlg?.mode === 'edit') await updateDocument(dlg.id!, body); else await addVehicleDocument(form.vehicleId, body);
      let fileNote = '';
      if (scan) {      // the scan is stored centrally and linked to this vehicle; it shows up under Uploaded Files and in the vehicle's own Photos & Documents
        try { await uploadFiles('vehicle', form.vehicleId, [scan], {kind: 'document', category: form.paperType === 'custom' ? 'other' : form.paperType, description: form.title.trim() || form.paperNumber.trim()}); }
        catch (up: any) { fileNote = ` The paper was saved, but the file was not uploaded: ${errText(up)}`; }
      }
      setDlg(null); showToast('Document saved.' + fileNote); load(); setFilesKey(k => k + 1);
    } catch (err) { setErrors({form: errText(err)}); } finally { setSaving(false); }
  }

  async function remove(d: Doc) {
    if (!confirm(`Delete "${d.title}"? This removes it from the vehicle profile too.`)) return;
    try { await deleteDocument(d.id); showToast('Document deleted'); load(); } catch (err) { showToast(errText(err)); }
  }

  const tabs = (
    <div role="tablist" aria-label="Document views" style={{display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid #e2e8f0'}}>
      {([['files', 'Uploaded Files'], ['papers', 'Vehicle Papers & Expiry']] as const).map(([k, l]) => (
        <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{padding: '9px 14px', border: 0, background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13.5,
          color: tab === k ? '#1e3947' : '#64748b', borderBottom: tab === k ? '2px solid #1e3947' : '2px solid transparent', marginBottom: -1}}>{l}</button>
      ))}
    </div>
  );

  if (tab === 'files') return <>{tabs}<DocumentCenter key={filesKey} />{toast && <div className="toast" role="status"><CheckCircle2 size={18} />{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={16} /></button></div>}</>;

  return <>
    {tabs}
    <div className="kpi-grid-4" style={{marginBottom: 16}}>
      {[
        {label: 'Total Documents', value: kpi.total, color: 'blue', icon: FileText},
        {label: 'Valid', value: kpi.valid, color: 'blue', icon: ShieldCheck},
        {label: 'Expiring Soon (<30 Days)', value: kpi.soon, color: 'gold', icon: Calendar},
        {label: 'Expired (Requires Renewal)', value: kpi.expired, color: 'gold', icon: AlertTriangle},
      ].map(c => { const Icon = c.icon; return (
        <Card key={c.label} className="metric"><div className="metric-top"><span>{c.label}</span><span className={`metric-icon ${c.color}`}><Icon size={17} /></span></div><strong className="nums" style={{fontSize: 26}}>{c.value}</strong></Card>
      ); })}
    </div>

    {kpi.expired > 0 && (
      <div style={{padding: '12px 16px', background: '#fbebeb', border: '1px solid #e8b3b0', borderRadius: 8, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 240}}><AlertTriangle size={18} color="#b04b46" style={{flexShrink: 0}} />
          <span style={{fontSize: 13, color: '#852a25'}}><b>Attention:</b> {kpi.expired} document(s) have expired and need renewal.</span></div>
        <Button size="sm" variant="outline" onClick={() => setStatusF('Expired')} style={{borderColor: '#b04b46', color: '#852a25'}}>View Expired Docs</Button>
      </div>
    )}

    <div className="toolbar search-filter-responsive" style={{marginBottom: 16, flexWrap: 'wrap', gap: 10}}>
      <div className="toolbar-search" style={{flex: '1 1 220px', maxWidth: 320}}><Search size={15} />
        <Input placeholder="Search title, vehicle, certificate no…" value={q} onChange={e => setQ(e.target.value)} /></div>
      <Select value={typeF} onValueChange={setTypeF}>
        <SelectTrigger style={{minWidth: 180}}><SelectValue placeholder="Document type" /></SelectTrigger>
        <SelectContent><SelectItem value="All">All Document Types</SelectItem>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={statusF} onValueChange={setStatusF}>
        <SelectTrigger style={{minWidth: 140}}><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent><SelectItem value="All">All Status</SelectItem><SelectItem value="Valid">Valid</SelectItem><SelectItem value="Expiring Soon">Expiring Soon</SelectItem><SelectItem value="Expired">Expired</SelectItem></SelectContent>
      </Select>
      <div style={{marginLeft: 'auto'}}><Button onClick={openAdd}><Plus size={16} /> Add Document</Button></div>
    </div>

    {loadError && <div role="alert" style={{background: '#fef3f2', border: '1px solid #fecdca', color: '#b42318', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13}}>
      Could not load documents: {loadError} <button className="text-button" onClick={load}>Retry</button></div>}

    <Card>
      <div className="table-responsive-container">
        <div className="billing-table">
          <div className="head" style={{gridTemplateColumns: '1.6fr 1.2fr 150px 130px 100px 100px 100px 110px', minWidth: 900}}>
            <span>Document Title</span><span>Vehicle</span><span>Type</span><span>Certificate No.</span><span>Issue Date</span><span>Expiry Date</span><span>Status</span><span>Actions</span>
          </div>
          {loading && <div style={{padding: '30px 0', textAlign: 'center', color: '#64748b', fontSize: 13}}>Loading documents…</div>}
          {!loading && filtered.length === 0 && <div style={{padding: '40px 0'}}><EmptyState title="No documents found" description={docs.length ? 'Adjust your filters.' : 'Add the first vehicle document.'} /></div>}
          {filtered.map(d => (
            <div key={d.id} style={{gridTemplateColumns: '1.6fr 1.2fr 150px 130px 100px 100px 100px 110px', minWidth: 900}}>
              <span><b style={{fontSize: 12, color: '#1e3947'}}>{d.title}</b></span>
              <span style={{fontSize: 11.5}}>{d.vehicle}</span>
              <span><span className="badge badge-neutral" style={{fontSize: 10}}>{d.typeLabel}</span></span>
              <span style={{fontSize: 11, color: '#6a7c83'}}>{d.paperNumber || '—'}</span>
              <span style={{fontSize: 11, color: '#6a7c83'}}>{d.issueDate || '—'}</span>
              <span style={{fontSize: 11, fontWeight: 500, color: d.status === 'Expired' ? '#b04b46' : d.status === 'Expiring Soon' ? '#a57a2b' : '#277b55'}}>{d.expiryDate || 'No expiry'}</span>
              <span><span className={`badge ${d.status === 'Valid' ? 'badge-good' : d.status === 'Expiring Soon' ? 'badge-warn' : 'badge-bad'}`}>{d.status}</span></span>
              <span className="row-actions">
                <button className="text-button" onClick={() => setViewDoc(d)} title="View"><Eye size={14} /></button>
                <button className="text-button" onClick={() => openEdit(d)} title="Edit"><Edit2 size={14} /></button>
                <button className="text-button" onClick={() => remove(d)} title="Delete" style={{color: '#b04b46'}}><Trash2 size={14} /></button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>

    <Dialog open={!!dlg} onOpenChange={o => !o && setDlg(null)}>
      <DialogContent style={{maxWidth: 560, maxHeight: '92vh', overflowY: 'auto'}}>
        <DialogHeader>
          <DialogTitle>{dlg?.mode === 'edit' ? 'Edit Document' : 'Add Vehicle Document'}</DialogTitle>
          <DialogDescription>Saved to the vehicle record, so it appears in the Vehicle Profile and here.</DialogDescription>
        </DialogHeader>
        <div className="entry-form">
          <div className="form-grid">
            <label><span className="field-label">Vehicle *</span>
              <Select value={form.vehicleId} onValueChange={v => setForm(f => ({...f, vehicleId: v}))} disabled={dlg?.mode === 'edit'}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.registration}</SelectItem>)}</SelectContent>
              </Select>{errors.vehicleId && <span className="field-error">{errors.vehicleId}</span>}</label>
            <label><span className="field-label">Document type *</span>
              <Select value={form.paperType} onValueChange={v => setForm(f => ({...f, paperType: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select></label>
          </div>
          <label><span className="field-label">Document title (optional)</span>
            <Input placeholder="Defaults to the type and vehicle, e.g. Tax Token – DHAKA-METRO-1" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} /></label>
          <div className="form-grid">
            <label><span className="field-label">Certificate number *</span>
              <Input value={form.paperNumber} onChange={e => setForm(f => ({...f, paperNumber: e.target.value}))} />{errors.paperNumber && <span className="field-error">{errors.paperNumber}</span>}</label>
            <label><span className="field-label">Issue date</span><Input type="date" value={form.issueDate} onChange={e => setForm(f => ({...f, issueDate: e.target.value}))} /></label>
            <label><span className="field-label">Expiry date</span><Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({...f, expiryDate: e.target.value}))} />{errors.expiryDate && <span className="field-error">{errors.expiryDate}</span>}</label>
            <label><span className="field-label">Scan / file link (optional)</span><Input placeholder="https://…" value={form.documentUrl} onChange={e => setForm(f => ({...f, documentUrl: e.target.value}))} /></label>
          </div>
          <label><span className="field-label">Attach file (PDF, Word or scanned image)</span>
            <Input type="file" accept={ACCEPT} aria-label="Attach file" onChange={e => setScan(e.target.files?.[0] || null)} />
            {errors.scan && <span className="field-error">{errors.scan}</span>}
            <span style={{fontSize: 11, color: '#64748b'}}>Saved to this vehicle; also listed under Uploaded Files and the vehicle&apos;s Photos &amp; Documents.</span></label>
          {errors.form && <div role="alert" style={{color: '#b42318', fontSize: 12.5}}>{errors.form}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDlg(null)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Document'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={!!viewDoc} onOpenChange={o => !o && setViewDoc(null)}>
      <DialogContent style={{maxWidth: 480}}>
        <DialogHeader><DialogTitle>Document Details</DialogTitle><DialogDescription>{viewDoc?.typeLabel} · {viewDoc?.vehicle}</DialogDescription></DialogHeader>
        {viewDoc && (
          <div className="detail-relations" style={{gridTemplateColumns: '1fr 1fr', gap: 11, marginTop: 12}}>
            {[['Title', viewDoc.title], ['Type', viewDoc.typeLabel], ['Vehicle', viewDoc.vehicle], ['Certificate No.', viewDoc.paperNumber || '—'], ['Issue Date', viewDoc.issueDate || '—'], ['Expiry Date', viewDoc.expiryDate || 'No expiry'], ['Status', viewDoc.status]].map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}
            {viewDoc.documentUrl && <div style={{gridColumn: '1 / -1'}}><a href={viewDoc.documentUrl} target="_blank" rel="noopener noreferrer" style={{color: '#1677ff'}}>Open scan / file</a></div>}
          </div>
        )}
      </DialogContent>
    </Dialog>

    {toast && <div className="toast" role="status"><CheckCircle2 size={18} />{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={16} /></button></div>}
  </>;
}
