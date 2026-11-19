"use client";
import {useCallback, useEffect, useRef, useState} from 'react';
import {Download, Eye, File as FileIcon, FileText, Image as ImageIcon, Loader2, RotateCw, Star, Trash2, UploadCloud, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {ACCEPT, IMAGE_ACCEPT, checkFile, deleteFile, fetchFileLimits, fileUrl, fmtBytes, listFiles, makeMainPhoto, retryFile, shrinkPhoto, updateFile, uploadFiles,
  type AttachmentItem, type EntityType, type FileLimits} from '@/lib/files';

const label = (v: string) => v.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
type Staged = {uid: string; file: File; category: string; description: string; error: string; preview: string};
let seq = 0;

type Props = {
  entity: EntityType;
  id: number | string;
  title?: string;
  documentCategories?: string[];        // e.g. ['nid','license'] (must be accepted by the server for this entity)
  photoCategories?: string[];
  showPhotos?: boolean;
  showDocuments?: boolean;
  canMakeMain?: boolean;                // entity has a main picture (driver, owner, client, vehicle)
  readOnly?: boolean;
  onChange?: (items: AttachmentItem[]) => void;
};

/** Documents & photos for one record: drag and drop, previews, progress, categories, download, replace-by-delete, with confirmation. */
export function AttachmentPanel({entity, id, title = 'Documents & Photos', documentCategories = ['other'], photoCategories = ['other'], showPhotos = true, showDocuments = true, canMakeMain = false, readOnly = false, onChange}: Props) {
  const [items, setItems] = useState<AttachmentItem[] | null>(null);
  const [limits, setLimits] = useState<FileLimits | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [lightbox, setLightbox] = useState<AttachmentItem | null>(null);
  const [confirm, setConfirm] = useState<AttachmentItem | null>(null);
  const [busyId, setBusyId] = useState('');
  const [msg, setMsg] = useState('');

  const reload = useCallback(async () => {
    try {
      setLoadErr('');
      const list = await listFiles(entity, id);
      setItems(list);
      onChange?.(list);
    } catch (e: any) {
      setLoadErr(e?.message || 'Files could not be loaded');
      setItems([]);
    }
  }, [entity, id, onChange]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { fetchFileLimits().then(setLimits).catch(() => {}); }, []);

  async function act(item: AttachmentItem, fn: () => Promise<unknown>, done: string) {
    setBusyId(item.id); setMsg('');
    try { await fn(); setMsg(done); await reload(); } catch (e: any) { setMsg(e?.message || 'The action failed'); } finally { setBusyId(''); }
  }

  const photos = (items || []).filter(i => i.kind !== 'document');
  const docs = (items || []).filter(i => i.kind === 'document');

  return (
    <section aria-label={title} style={{border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 16}}>
      <h3 style={{margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#0f172a'}}>{title}</h3>
      {loadErr && <div role="alert" style={{color: '#b42318', fontSize: 13, marginBottom: 8}}>{loadErr} <Button type="button" size="sm" variant="ghost" onClick={reload}>Retry</Button></div>}
      {msg && <div role="status" style={{fontSize: 12.5, color: '#334155', marginBottom: 8}}>{msg}</div>}

      {showPhotos && (
        <div style={{marginBottom: showDocuments ? 18 : 0}}>
          <h4 style={{margin: '0 0 8px', fontSize: 13, color: '#334155'}}>Photos{photos.length ? ` (${photos.length})` : ''}</h4>
          {items === null ? <Loader2 size={16} className="animate-spin" /> : photos.length === 0 ? <p style={{fontSize: 12.5, color: '#64748b', margin: '0 0 8px'}}>No photos yet.</p> : (
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(112px,1fr))', gap: 10, marginBottom: 10}}>
              {photos.map(p => (
                <figure key={p.id} style={{margin: 0, position: 'relative', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#f8fafc'}}>
                  {p.status === 'completed' && p.hasThumb
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={fileUrl(p.urls.thumb)} alt={p.description || p.fileName} loading="lazy" onClick={() => setLightbox(p)} style={{width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', cursor: 'zoom-in'}} />
                    : <div style={{aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#b42318', padding: 6, textAlign: 'center'}}>{p.status === 'failed' ? 'Processing failed' : 'Processing…'}</div>}
                  {p.kind === 'profile' && <span style={{position: 'absolute', top: 6, left: 6, background: '#16a34a', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999}}>Main</span>}
                  <figcaption style={{padding: '5px 6px', fontSize: 11, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={p.fileName}>{p.category ? label(p.category) + ' · ' : ''}{p.fileName}</figcaption>
                  {!readOnly && (
                    <div style={{display: 'flex', gap: 2, padding: '0 4px 5px'}}>
                      {p.status === 'failed' && <Button type="button" size="sm" variant="ghost" title="Retry processing" disabled={busyId === p.id} onClick={() => act(p, () => retryFile(p.id), 'Reprocessed')}><RotateCw size={13} /></Button>}
                      {canMakeMain && p.kind === 'photo' && p.status === 'completed' && <Button type="button" size="sm" variant="ghost" title="Set as main picture" disabled={busyId === p.id} onClick={() => act(p, () => makeMainPhoto(p.id), 'Main picture updated')}><Star size={13} /></Button>}
                      <Button type="button" size="sm" variant="ghost" title="Delete" disabled={busyId === p.id} onClick={() => setConfirm(p)}><Trash2 size={13} /></Button>
                    </div>
                  )}
                </figure>
              ))}
            </div>
          )}
          {!readOnly && <Uploader entity={entity} id={id} kind="photo" categories={photoCategories} limits={limits} imagesOnly accept={IMAGE_ACCEPT} caption="Drop photos here or browse" onDone={reload} />}
        </div>
      )}

      {showDocuments && (
        <div>
          <h4 style={{margin: '0 0 8px', fontSize: 13, color: '#334155'}}>Documents{docs.length ? ` (${docs.length})` : ''}</h4>
          {items === null ? <Loader2 size={16} className="animate-spin" /> : docs.length === 0 ? <p style={{fontSize: 12.5, color: '#64748b', margin: '0 0 8px'}}>No documents yet.</p> : (
            <div style={{overflowX: 'auto', marginBottom: 10}}>
              <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 12.5}}>
                <thead><tr style={{textAlign: 'left', color: '#64748b'}}><th style={{padding: '4px 6px'}}>File</th><th>Category</th><th>Size</th><th>Uploaded</th><th>Status</th><th style={{textAlign: 'right'}}>Actions</th></tr></thead>
                <tbody>
                  {docs.map(d => (
                    <tr key={d.id} style={{borderTop: '1px solid #f1f5f9'}}>
                      <td style={{padding: '6px', maxWidth: 260}}>
                        <span style={{display: 'inline-flex', alignItems: 'center', gap: 6}}>
                          {d.isImage ? <ImageIcon size={15} color="#0284c7" /> : d.extension === 'pdf' ? <FileText size={15} color="#dc2626" /> : <FileIcon size={15} color="#2563eb" />}
                          <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={d.fileName}>{d.fileName}</span>
                        </span>
                        {d.description && <div style={{fontSize: 11, color: '#64748b'}}>{d.description}</div>}
                      </td>
                      <td>{d.category ? label(d.category) : '—'}</td>
                      <td>{fmtBytes(d.sizeOriginal)}</td>
                      <td>{new Date(d.uploadedAt).toLocaleDateString()}</td>
                      <td>{d.status === 'completed' ? <span style={{color: '#16a34a'}}>Completed</span> : d.status === 'failed' ? <span style={{color: '#b42318'}} title={d.error}>Failed</span> : 'Processing'}</td>
                      <td style={{textAlign: 'right', whiteSpace: 'nowrap'}}>
                        {d.isImage
                          ? <Button type="button" size="sm" variant="ghost" title="Preview" onClick={() => setLightbox(d)}><Eye size={14} /></Button>
                          : d.extension === 'pdf' ? <Button type="button" size="sm" variant="ghost" title="Preview" onClick={() => window.open(fileUrl(d.urls.view), '_blank', 'noopener')}><Eye size={14} /></Button> : null}
                        <Button type="button" size="sm" variant="ghost" title="Download" onClick={() => window.open(fileUrl(d.urls.download), '_self')}><Download size={14} /></Button>
                        {!readOnly && d.status === 'failed' && <Button type="button" size="sm" variant="ghost" title="Retry processing" onClick={() => act(d, () => retryFile(d.id), 'Reprocessed')}><RotateCw size={14} /></Button>}
                        {!readOnly && <Button type="button" size="sm" variant="ghost" title="Delete" disabled={busyId === d.id} onClick={() => setConfirm(d)}><Trash2 size={14} /></Button>}
                        {!readOnly && <DescEdit item={d} onSaved={reload} categories={documentCategories} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!readOnly && <Uploader entity={entity} id={id} kind="document" categories={documentCategories} limits={limits} accept={ACCEPT} caption="Drop PDF, Word or scanned images here or browse" onDone={reload} />}
        </div>
      )}

      <Dialog open={!!lightbox} onOpenChange={o => !o && setLightbox(null)}>
        <DialogContent style={{maxWidth: 900}}>
          <DialogHeader><DialogTitle>{lightbox?.fileName}</DialogTitle></DialogHeader>
          {lightbox && (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileUrl(lightbox.urls.view)} alt={lightbox.description || lightbox.fileName} style={{maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto'}} />
              <p style={{fontSize: 12, color: '#64748b', marginTop: 8}}>{lightbox.width && lightbox.height ? `${lightbox.width}×${lightbox.height} · ` : ''}uploaded {fmtBytes(lightbox.sizeOriginal)} → stored {fmtBytes(lightbox.sizeStored)}{lightbox.description ? ' · ' + lightbox.description : ''}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => window.open(fileUrl(lightbox.urls.download), '_self')}><Download size={14} style={{marginRight: 6}} />Download original</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}>
        <DialogContent style={{maxWidth: 420}}>
          <DialogHeader><DialogTitle>Delete this file?</DialogTitle></DialogHeader>
          <p style={{fontSize: 13, color: '#475569'}}><b>{confirm?.fileName}</b> will be removed permanently. Other files on this record are not affected.</p>
          <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12}}>
            <Button type="button" variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button type="button" style={{background: '#dc2626', color: '#fff'}} onClick={() => { const c = confirm!; setConfirm(null); act(c, () => deleteFile(c.id), 'File deleted'); }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function DescEdit({item, onSaved, categories}: {item: AttachmentItem; onSaved: () => void; categories: string[]}) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState(item.description);
  const [cat, setCat] = useState(item.category || 'other');
  const [err, setErr] = useState('');
  return (
    <>
      <Button type="button" size="sm" variant="ghost" title="Edit category / description" onClick={() => setOpen(true)}>✎</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{maxWidth: 420}}>
          <DialogHeader><DialogTitle>Edit file details</DialogTitle></DialogHeader>
          <label style={{display: 'block', fontSize: 12, marginBottom: 8}}>Category
            <Select value={cat} onValueChange={setCat}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{label(c)}</SelectItem>)}</SelectContent></Select>
          </label>
          <label style={{display: 'block', fontSize: 12}}>Description
            <input value={desc} maxLength={500} onChange={e => setDesc(e.target.value)} style={{width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 9px', marginTop: 4}} />
          </label>
          {err && <div role="alert" style={{color: '#b42318', fontSize: 12, marginTop: 6}}>{err}</div>}
          <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12}}>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={async () => { try { await updateFile(item.id, {description: desc, category: cat}); setOpen(false); onSaved(); } catch (e: any) { setErr(e?.message || 'Could not save'); } }}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Uploader({entity, id, kind, categories, limits, imagesOnly = false, accept, caption, onDone}: {entity: EntityType; id: number | string; kind: 'photo' | 'document'; categories: string[]; limits: FileLimits | null; imagesOnly?: boolean; accept: string; caption: string; onDone: () => void}) {
  const input = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<Staged[]>([]);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState('');
  const [partial, setPartial] = useState<string[]>([]);
  const batchKey = useRef('');
  const defaultCat = categories.includes('other') ? 'other' : categories[0];

  useEffect(() => () => staged.forEach(s => s.preview && URL.revokeObjectURL(s.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  function add(list: FileList | File[] | null) {
    if (!list) return;
    setErr(''); setPartial([]);
    const next: Staged[] = [...staged];
    for (const f of Array.from(list)) {
      if (limits && next.length >= limits.maxFiles) { setErr(`At most ${limits.maxFiles} files per upload`); break; }
      next.push({uid: 'f' + ++seq, file: f, category: defaultCat, description: '', error: checkFile(f, limits, imagesOnly), preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : ''});
    }
    if (limits && next.reduce((n, s) => n + s.file.size, 0) > limits.maxTotalBytes) setErr(`Total size is over the ${fmtBytes(limits.maxTotalBytes)} limit; upload in smaller batches`);
    batchKey.current = '';
    setStaged(next);
  }
  const remove = (uid: string) => { setStaged(s => { const x = s.find(v => v.uid === uid); if (x?.preview) URL.revokeObjectURL(x.preview); return s.filter(v => v.uid !== uid); }); batchKey.current = ''; };
  const valid = staged.filter(s => !s.error);

  async function send() {
    if (!valid.length) return;
    setBusy(true); setErr(''); setPartial([]); setPct(0);
    if (!batchKey.current) batchKey.current = crypto.randomUUID();           // the same key on every retry of this batch: no duplicates
    try {
      // one request per category/description group (the server applies one category and description per request)
      const groups = new Map<string, Staged[]>();
      valid.forEach(s => { const k = s.category + '\u0000' + s.description; groups.set(k, [...(groups.get(k) || []), s]); });
      const errors: string[] = [];
      let g = 0;
      for (const [, list] of groups) {
        const files = kind === 'photo' ? await Promise.all(list.map(s => shrinkPhoto(s.file))) : list.map(s => s.file);
        const r = await uploadFiles(entity, id, files, {kind, category: list[0].category === 'other' ? 'other' : list[0].category, description: list[0].description, key: `${batchKey.current}-${g++}`, onProgress: setPct});
        r.errors.forEach(e => errors.push(`${e.fileName}: ${e.message}`));
      }
      staged.forEach(s => s.preview && URL.revokeObjectURL(s.preview));
      setStaged(errors.length ? [] : []);
      setPartial(errors);
      batchKey.current = '';
      onDone();
    } catch (e: any) {
      setErr((e?.message || 'Upload failed') + ' — your files are still listed; press Upload to try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
        style={{border: `2px dashed ${over ? '#2563eb' : '#cbd5e1'}`, background: over ? '#eff6ff' : '#f8fafc', borderRadius: 10, padding: '14px 12px', textAlign: 'center', color: '#475569', fontSize: 13}}>
        <UploadCloud size={20} style={{verticalAlign: 'middle', marginRight: 6}} />{caption}
        <input ref={input} type="file" multiple accept={accept} hidden aria-label={kind === 'photo' ? 'Choose photos' : 'Choose documents'} onChange={e => { add(e.target.files); if (input.current) input.current.value = ''; }} />
        <Button type="button" size="sm" variant="outline" style={{marginLeft: 10}} disabled={busy} onClick={() => input.current?.click()}>Browse</Button>
        {limits && <div style={{fontSize: 11, color: '#94a3b8', marginTop: 4}}>Up to {limits.maxFiles} files · images {fmtBytes(limits.maxImageBytes)} · PDF {fmtBytes(limits.maxPdfBytes)} · Word {fmtBytes(limits.maxDocBytes)}</div>}
      </div>
      {staged.length > 0 && (
        <ul style={{listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 8}}>
          {staged.map(s => (
            <li key={s.uid} style={{display: 'flex', gap: 10, alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 10, padding: 8, background: s.error ? '#fef3f2' : '#fff', flexWrap: 'wrap'}}>
              {s.preview
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={s.preview} alt="" style={{width: 44, height: 44, objectFit: 'cover', borderRadius: 6}} />
                : <FileText size={34} color={/pdf$/i.test(s.file.name) ? '#dc2626' : '#2563eb'} />}
              <div style={{flex: '1 1 160px', minWidth: 0}}>
                <div style={{fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={s.file.name}>{s.file.name}</div>
                <div style={{fontSize: 11, color: s.error ? '#b42318' : '#64748b'}} role={s.error ? 'alert' : undefined}>{s.error || fmtBytes(s.file.size)}</div>
              </div>
              {!s.error && categories.length > 1 && (
                <select aria-label="Category" value={s.category} onChange={e => setStaged(a => a.map(v => v.uid === s.uid ? {...v, category: e.target.value} : v))} style={{border: '1px solid #cbd5e1', borderRadius: 8, padding: '5px 6px', fontSize: 12}}>
                  {categories.map(c => <option key={c} value={c}>{label(c)}</option>)}
                </select>
              )}
              {!s.error && <input aria-label="Description" placeholder="Description (optional)" maxLength={500} value={s.description} onChange={e => setStaged(a => a.map(v => v.uid === s.uid ? {...v, description: e.target.value} : v))} style={{border: '1px solid #cbd5e1', borderRadius: 8, padding: '5px 8px', fontSize: 12, flex: '1 1 140px'}} />}
              <Button type="button" size="sm" variant="ghost" aria-label={`Remove ${s.file.name}`} disabled={busy} onClick={() => remove(s.uid)}><X size={14} /></Button>
            </li>
          ))}
        </ul>
      )}
      {staged.length > 0 && (
        <div style={{display: 'flex', alignItems: 'center', gap: 10, marginTop: 10}}>
          <Button type="button" size="sm" disabled={busy || !valid.length} onClick={send}>{busy ? <><Loader2 size={14} className="animate-spin" style={{marginRight: 6}} />Uploading {pct}%</> : `Upload ${valid.length} file${valid.length === 1 ? '' : 's'}`}</Button>
          {busy && <progress value={pct} max={100} style={{flex: 1, maxWidth: 220}} />}
        </div>
      )}
      {err && <div role="alert" style={{color: '#b42318', fontSize: 12.5, marginTop: 8}}>{err}</div>}
      {partial.length > 0 && <div role="alert" style={{color: '#b54708', fontSize: 12.5, marginTop: 8}}>Some files were not uploaded:<ul style={{margin: '4px 0 0 18px'}}>{partial.map(p => <li key={p}>{p}</li>)}</ul></div>}
    </div>
  );
}
