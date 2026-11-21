"use client";
import {useCallback, useEffect, useRef, useState} from 'react';
import {Download, Edit2, Eye, FileText, File as FileIcon, Image as ImageIcon, Loader2, Plus, Repeat2, Search, Trash2, UploadCloud, X} from 'lucide-react';
import {fetchClients, fetchDrivers, fetchOwners, fetchVehicles} from '@/lib/api';
import {ACCEPT, checkFile, deleteFile, fetchCentralFiles, fetchFileLimits, fileUrl, fmtBytes, replaceFile, shrinkPhoto, updateFile, uploadFiles,
  type CentralFile, type EntityType, type FileLimits} from '@/lib/files';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {EmptyState} from '@/components/shared/empty-state';

/** Central document management: every uploaded file of every owner, driver, vehicle and client in one searchable place.
 *  Each file is linked to its record in the database; it also appears on that record's own profile. */
const ENTITIES: {value: EntityType; label: string}[] = [{value: 'owner', label: 'Owner'}, {value: 'driver', label: 'Driver'}, {value: 'vehicle', label: 'Vehicle / Car'}, {value: 'client', label: 'Client'}];
// must match the server's CATEGORIES
const CATS: Record<string, string[]> = {
  owner: ['nid', 'ownership', 'financial', 'other'], driver: ['nid', 'license', 'passport', 'other'], client: ['trade_license', 'nid', 'other'],
  vehicle: ['registration', 'insurance', 'fitness', 'tax_token', 'inspection', 'route_permit', 'other'],
};
const CUSTOM = '__custom__';
const ALL_CATS = Array.from(new Set(Object.values(CATS).flat()));
const label = (v: string) => (v === 'nid' ? 'NID' : v.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()));
const entityLabel = (t: string) => ({owner: 'Owner', driver: 'Driver', vehicle: 'Vehicle', client: 'Client', agreement: 'Agreement', maintenance: 'Maintenance', transaction: 'Transaction'} as Record<string, string>)[t] || t;

type Rec = {id: number; name: string};
async function loadRecords(t: EntityType): Promise<Rec[]> {
  const fn = t === 'owner' ? fetchOwners : t === 'driver' ? fetchDrivers : t === 'vehicle' ? fetchVehicles : fetchClients;
  const rows: any[] = await fn(1);
  return (Array.isArray(rows) ? rows : []).map(r => ({id: Number(r.id), name: t === 'vehicle' ? [r.registration, r.model].filter(Boolean).join(' · ') : r.name || String(r.id)}));
}

export function DocumentCenter({onChanged}: {onChanged?: () => void}) {
  const [items, setItems] = useState<CentralFile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [entity, setEntity] = useState('All');
  const [recordId, setRecordId] = useState('All');
  const [records, setRecords] = useState<Rec[]>([]);
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [msg, setMsg] = useState('');
  const [upload, setUpload] = useState(false);
  const [preview, setPreview] = useState<CentralFile | null>(null);
  const [editing, setEditing] = useState<CentralFile | null>(null);
  const [confirm, setConfirm] = useState<CentralFile | null>(null);
  const [busy, setBusy] = useState('');
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<CentralFile | null>(null);
  const [limit, setLimit] = useState(100);

  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    setRecordId('All'); setCat('All'); setRecords([]);
    if (entity !== 'All') loadRecords(entity as EntityType).then(setRecords).catch(() => {});
  }, [entity]);

  const load = useCallback(() => {
    setLoading(true);
    fetchCentralFiles({entity: entity === 'All' ? '' : entity, entityId: recordId === 'All' ? '' : recordId, category: cat === 'All' ? '' : cat, q: dq, limit})
      .then(r => { setItems(r.items); setTotal(r.total); setErr(''); })
      .catch(e => setErr(e?.message || 'Documents could not be loaded'))
      .finally(() => setLoading(false));
  }, [entity, recordId, cat, dq, limit]);
  useEffect(() => { load(); }, [load]);

  const catOptions = entity === 'All' ? ALL_CATS : CATS[entity] || ALL_CATS;
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };
  const changed = () => { load(); onChanged?.(); };

  async function doReplace(file: File) {
    const t = replaceTarget.current;
    if (!t) return;
    const bad = checkFile(file, null);
    if (bad) return flash(bad);
    setBusy(t.id);
    try { await replaceFile(t.id, file); flash('Document replaced'); changed(); } catch (e: any) { flash(e?.message || 'Could not replace the document'); } finally { setBusy(''); }
  }
  async function doDelete(f: CentralFile) {
    setBusy(f.id);
    try { await deleteFile(f.id); flash('Document deleted'); changed(); } catch (e: any) { flash(e?.message || 'Could not delete'); } finally { setBusy(''); }
  }
  const canPreview = (f: CentralFile) => f.isImage || f.extension === 'pdf';

  return (
    <div>
      <div className="toolbar search-filter-responsive" style={{marginBottom: 16, flexWrap: 'wrap', gap: 10}}>
        <div className="global-search" style={{flex: '1 1 220px', maxWidth: 320}}><Search size={15} />
          <Input aria-label="Search files" placeholder="Search file, owner, driver, vehicle…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger aria-label="Record type" style={{minWidth: 150}}><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="All">All records</SelectItem>{ENTITIES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}s</SelectItem>)}</SelectContent>
        </Select>
        {entity !== 'All' && (
          <Select value={recordId} onValueChange={setRecordId}>
            <SelectTrigger aria-label="Record" style={{minWidth: 170}}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="All">Every {entityLabel(entity).toLowerCase()}</SelectItem>{records.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger aria-label="Document type" style={{minWidth: 160}}><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="All">All document types</SelectItem>{catOptions.map(c => <SelectItem key={c} value={c}>{label(c)}</SelectItem>)}</SelectContent>
        </Select>
        <div style={{marginLeft: 'auto'}}><Button onClick={() => setUpload(true)}><UploadCloud size={16} /> Upload Documents</Button></div>
      </div>

      {err && <div role="alert" style={{background: '#fef3f2', border: '1px solid #fecdca', color: '#b42318', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13}}>{err} <button className="text-button" onClick={load}>Retry</button></div>}
      {msg && <div role="status" style={{background: '#ecfdf3', border: '1px solid #abefc6', color: '#067647', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13}}>{msg}</div>}

      <div className="table-responsive-container" style={{background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflowX: 'auto'}}>
        <table style={{width: '100%', minWidth: 900, borderCollapse: 'collapse', fontSize: 12.5}} aria-label="Uploaded documents">
          <thead><tr style={{textAlign: 'left', color: '#64748b'}}>{['File', 'Belongs to', 'Document type', 'Size', 'Uploaded', 'Actions'].map(h => <th key={h} style={{padding: '10px 12px', fontWeight: 600, textAlign: h === 'Actions' ? 'right' : 'left'}}>{h}</th>)}</tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{padding: 28, textAlign: 'center', color: '#64748b'}}><Loader2 size={16} className="animate-spin" style={{verticalAlign: 'middle'}} /> Loading documents…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} style={{padding: 30}}><EmptyState title="No documents found" description={entity !== 'All' || cat !== 'All' || dq ? 'Adjust your filters.' : 'Upload the first document: choose the owner, driver or vehicle it belongs to.'} /></td></tr>}
            {!loading && items.map(f => (
              <tr key={f.id} style={{borderTop: '1px solid #f1f5f9', opacity: busy === f.id ? 0.5 : 1}}>
                <td style={{padding: '10px 12px', maxWidth: 280}}>
                  <span style={{display: 'inline-flex', alignItems: 'center', gap: 8}}>
                    {f.isImage ? <ImageIcon size={16} color="#0284c7" /> : f.extension === 'pdf' ? <FileText size={16} color="#dc2626" /> : <FileIcon size={16} color="#2563eb" />}
                    <b style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1e3947'}} title={f.fileName}>{f.fileName}</b>
                  </span>
                  {f.description && <div style={{fontSize: 11, color: '#64748b'}}>{f.description}</div>}
                  {f.status === 'failed' && <div style={{fontSize: 11, color: '#b42318'}}>Processing failed</div>}
                </td>
                <td style={{padding: '10px 12px'}}><span className="badge badge-neutral" style={{fontSize: 10, marginRight: 6}}>{entityLabel(f.entityType)}</span><b>{f.entityName}</b>{f.entityDetail && <div style={{fontSize: 11, color: '#64748b'}}>{f.entityDetail}</div>}</td>
                <td style={{padding: '10px 12px'}}>{f.category ? label(f.category) : '—'}</td>
                <td style={{padding: '10px 12px'}}>{fmtBytes(f.sizeOriginal)}</td>
                <td style={{padding: '10px 12px'}}>{new Date(f.uploadedAt).toLocaleDateString()}{f.uploadedBy && <div style={{fontSize: 11, color: '#64748b'}}>{f.uploadedBy}</div>}</td>
                <td style={{padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap'}}>
                  {canPreview(f) && <button className="text-button" title="Preview" aria-label={`Preview ${f.fileName}`} onClick={() => (f.isImage ? setPreview(f) : window.open(fileUrl(f.urls.view), '_blank', 'noopener'))}><Eye size={14} /></button>}
                  <button className="text-button" title="Download" aria-label={`Download ${f.fileName}`} onClick={() => window.open(fileUrl(f.urls.download), '_self')}><Download size={14} /></button>
                  <button className="text-button" title="Replace file" aria-label={`Replace ${f.fileName}`} onClick={() => { replaceTarget.current = f; replaceInput.current?.click(); }}><Repeat2 size={14} /></button>
                  <button className="text-button" title="Edit type / description" aria-label={`Edit ${f.fileName}`} onClick={() => setEditing(f)}><Edit2 size={14} /></button>
                  <button className="text-button" title="Delete" aria-label={`Delete ${f.fileName}`} style={{color: '#b04b46'}} onClick={() => setConfirm(f)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <input ref={replaceInput} type="file" accept={ACCEPT} hidden aria-label="Choose replacement file" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) doReplace(f); }} />
      {!loading && total > items.length && <div style={{textAlign: 'center', marginTop: 12}}><Button variant="outline" onClick={() => setLimit(l => l + 100)}>Show more ({items.length} of {total})</Button></div>}
      {!loading && total > 0 && total <= items.length && <p style={{fontSize: 12, color: '#64748b', marginTop: 8}}>{total} document{total === 1 ? '' : 's'}</p>}

      {upload && <UploadDialog onClose={() => setUpload(false)} onDone={n => { setUpload(false); flash(`${n} document${n === 1 ? '' : 's'} uploaded`); changed(); }} />}

      <Dialog open={!!preview} onOpenChange={o => !o && setPreview(null)}>
        <DialogContent style={{maxWidth: 900}}>
          <DialogHeader><DialogTitle>{preview?.fileName}</DialogTitle><DialogDescription>{preview ? `${entityLabel(preview.entityType)}: ${preview.entityName}` : ''}</DialogDescription></DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && <img src={fileUrl(preview.urls.view)} alt={preview.fileName} style={{maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto'}} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}>
        <DialogContent style={{maxWidth: 420}}>
          <DialogHeader><DialogTitle>Delete this document?</DialogTitle></DialogHeader>
          <p style={{fontSize: 13, color: '#475569'}}><b>{confirm?.fileName}</b> ({confirm?.entityName}) will be removed permanently, including from that record&apos;s profile.</p>
          <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12}}>
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button style={{background: '#dc2626', color: '#fff'}} onClick={() => { const c = confirm!; setConfirm(null); doDelete(c); }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {editing && <EditDialog f={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); flash('Saved'); changed(); }} />}
    </div>
  );
}

function EditDialog({f, onClose, onSaved}: {f: CentralFile; onClose: () => void; onSaved: () => void}) {
  const cats = CATS[f.entityType] || ['other'];
  const known = cats.includes(f.category) || !f.category;
  const [cat, setCat] = useState(known ? f.category || 'other' : CUSTOM);
  const [custom, setCustom] = useState(known ? '' : f.category);
  const [desc, setDesc] = useState(f.description);
  const [err, setErr] = useState('');
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent style={{maxWidth: 420}}>
        <DialogHeader><DialogTitle>Edit document details</DialogTitle><DialogDescription>{f.fileName} · {entityLabel(f.entityType)}: {f.entityName}</DialogDescription></DialogHeader>
        <label style={{display: 'block', fontSize: 12, marginBottom: 8}}>Document type
          <Select value={cat} onValueChange={setCat}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{cats.map(c => <SelectItem key={c} value={c}>{label(c)}</SelectItem>)}<SelectItem value={CUSTOM}>Other (type your own)…</SelectItem></SelectContent></Select>
          {cat === CUSTOM && <Input aria-label="Custom document type" style={{marginTop: 6}} maxLength={39} value={custom} onChange={e => setCustom(e.target.value)} placeholder="e.g. Bank guarantee" />}</label>
        <label style={{display: 'block', fontSize: 12}}>Description<Input value={desc} maxLength={500} onChange={e => setDesc(e.target.value)} /></label>
        {err && <div role="alert" style={{color: '#b42318', fontSize: 12, marginTop: 6}}>{err}</div>}
        <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12}}>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => { if (cat === CUSTOM && !custom.trim()) return setErr('Type the document type'); try { await updateFile(f.id, {category: cat === CUSTOM ? custom.trim() : cat, description: desc}); onSaved(); } catch (e: any) { setErr(e?.message || 'Could not save'); } }}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type Staged = {uid: string; file: File; error: string};
let seq = 0;

function UploadDialog({onClose, onDone}: {onClose: () => void; onDone: (n: number) => void}) {
  const [entity, setEntity] = useState<EntityType>('driver');
  const [records, setRecords] = useState<Rec[] | null>(null);
  const [recordId, setRecordId] = useState('');
  const [cat, setCat] = useState('other');
  const [custom, setCustom] = useState('');
  const [desc, setDesc] = useState('');
  const [staged, setStaged] = useState<Staged[]>([]);
  const [limits, setLimits] = useState<FileLimits | null>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const key = useRef('');

  useEffect(() => { fetchFileLimits().then(setLimits).catch(() => {}); }, []);
  useEffect(() => {
    setRecords(null); setRecordId(''); setCat(CATS[entity].includes('other') ? 'other' : CATS[entity][0]);
    loadRecords(entity).then(setRecords).catch(e => { setRecords([]); setErr(e?.message || 'Could not load the list'); });
  }, [entity]);

  function add(list: FileList | File[] | null) {
    if (!list) return;
    setErr(''); key.current = '';
    const next = [...staged];
    for (const f of Array.from(list)) {
      if (limits && next.length >= limits.maxFiles) { setErr(`At most ${limits.maxFiles} files per upload`); break; }
      next.push({uid: 'f' + ++seq, file: f, error: checkFile(f, limits)});
    }
    setStaged(next);
  }
  const valid = staged.filter(s => !s.error);

  async function send() {
    if (!recordId) return setErr(`Choose the ${entityLabel(entity).toLowerCase()} this document belongs to`);
    if (!valid.length) return setErr('Add at least one valid file');
    if (cat === CUSTOM && !custom.trim()) return setErr('Type the document type');
    setBusy(true); setErr(''); setPct(0);
    if (!key.current) key.current = crypto.randomUUID();
    try {
      const files = await Promise.all(valid.map(s => shrinkPhoto(s.file)));
      const r = await uploadFiles(entity, recordId, files, {kind: 'document', category: cat === CUSTOM ? custom.trim() : cat, description: desc, key: key.current, onProgress: setPct});
      if (r.errors.length) {
        setErr('Some files were not uploaded: ' + r.errors.map(e => `${e.fileName}: ${e.message}`).join('; '));
        setStaged([]);
        if (r.items.length) setTimeout(() => onDone(r.items.length), 2500);
      } else onDone(r.items.length);
    } catch (e: any) { setErr((e?.message || 'Upload failed') + ' — your files are still listed; press Upload to try again.'); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={o => !o && !busy && onClose()}>
      <DialogContent style={{maxWidth: 620, maxHeight: '92vh', overflowY: 'auto'}}>
        <DialogHeader><DialogTitle>Upload Documents</DialogTitle><DialogDescription>Choose who the documents belong to. They are saved to that record and appear on its profile too.</DialogDescription></DialogHeader>
        <div className="entry-form">
          <div className="form-grid">
            <label><span className="field-label">Belongs to *</span>
              <Select value={entity} onValueChange={v => setEntity(v as EntityType)}><SelectTrigger aria-label="Record type"><SelectValue /></SelectTrigger>
                <SelectContent>{ENTITIES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent></Select></label>
            <label><span className="field-label">{entityLabel(entity)} *</span>
              <Select value={recordId} onValueChange={setRecordId}><SelectTrigger aria-label="Record"><SelectValue placeholder={records === null ? 'Loading…' : records.length ? `Select ${entityLabel(entity).toLowerCase()}` : `No ${entityLabel(entity).toLowerCase()}s yet`} /></SelectTrigger>
                <SelectContent>{(records || []).map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent></Select></label>
            <label><span className="field-label">Document type *</span>
              <Select value={cat} onValueChange={setCat}><SelectTrigger aria-label="Document type"><SelectValue /></SelectTrigger>
                <SelectContent>{CATS[entity].map(c => <SelectItem key={c} value={c}>{label(c)}</SelectItem>)}<SelectItem value={CUSTOM}>Other (type your own)…</SelectItem></SelectContent></Select>
              {cat === CUSTOM && <Input aria-label="Custom document type" style={{marginTop: 6}} maxLength={39} value={custom} onChange={e => setCustom(e.target.value)} placeholder="Type the document type, e.g. Bank guarantee" />}</label>
            <label><span className="field-label">Description (optional)</span><Input value={desc} maxLength={500} onChange={e => setDesc(e.target.value)} placeholder="e.g. expires 2027" /></label>
          </div>
          <div onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
            style={{border: `2px dashed ${over ? '#2563eb' : '#cbd5e1'}`, background: over ? '#eff6ff' : '#f8fafc', borderRadius: 10, padding: '16px 12px', textAlign: 'center', color: '#475569', fontSize: 13, marginTop: 8}}>
            <UploadCloud size={20} style={{verticalAlign: 'middle', marginRight: 6}} />Drop PDF, Word or scanned images here (several at once)
            <input ref={input} type="file" multiple accept={ACCEPT} hidden aria-label="Choose documents" onChange={e => { add(e.target.files); e.target.value = ''; }} />
            <Button type="button" size="sm" variant="outline" style={{marginLeft: 10}} disabled={busy} onClick={() => input.current?.click()}><Plus size={14} /> Browse</Button>
            {limits && <div style={{fontSize: 11, color: '#94a3b8', marginTop: 4}}>Up to {limits.maxFiles} files · images {fmtBytes(limits.maxImageBytes)} · PDF {fmtBytes(limits.maxPdfBytes)} · Word {fmtBytes(limits.maxDocBytes)}</div>}
          </div>
          {staged.length > 0 && (
            <ul style={{listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 6}}>
              {staged.map(s => (
                <li key={s.uid} style={{display: 'flex', gap: 8, alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 8px', background: s.error ? '#fef3f2' : '#fff'}}>
                  <FileText size={20} color={/pdf$/i.test(s.file.name) ? '#dc2626' : '#2563eb'} />
                  <div style={{flex: 1, minWidth: 0}}>
                    <div style={{fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={s.file.name}>{s.file.name}</div>
                    <div style={{fontSize: 11, color: s.error ? '#b42318' : '#64748b'}} role={s.error ? 'alert' : undefined}>{s.error || fmtBytes(s.file.size)}</div>
                  </div>
                  <Button type="button" size="sm" variant="ghost" aria-label={`Remove ${s.file.name}`} disabled={busy} onClick={() => { setStaged(a => a.filter(v => v.uid !== s.uid)); key.current = ''; }}><X size={14} /></Button>
                </li>
              ))}
            </ul>
          )}
          {err && <div role="alert" style={{color: '#b42318', fontSize: 12.5, marginTop: 8}}>{err}</div>}
        </div>
        <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 14}}>
          {busy && <progress value={pct} max={100} style={{maxWidth: 160}} />}
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={send} disabled={busy || !valid.length}>{busy ? `Uploading ${pct}%` : `Upload ${valid.length || ''} file${valid.length === 1 ? '' : 's'}`}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
