"use client";
import {useEffect, useRef, useState} from 'react';
import {Camera, Loader2, Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {IMAGE_ACCEPT, checkFile, fetchFileLimits, fileUrl, shrinkPhoto, uploadFiles, deleteFile, listFiles, type AttachmentItem, type EntityType, type FileLimits} from '@/lib/files';

const initials = (name: string) => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

/** Small round picture for list rows: the server thumbnail, or the initials when there is none (or it fails to load). */
export function Avatar({name, url, size = 34, square = false}: {name: string; url?: string; size?: number; square?: boolean}) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [url]);
  const radius = square ? 8 : '50%';
  if (url && !bad) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fileUrl(url)} alt="" loading="lazy" width={size} height={size} onError={() => setBad(true)} style={{width: size, height: size, borderRadius: radius, objectFit: 'cover', background: '#e2e8f0', flex: 'none'}} />;
  }
  return <span aria-hidden style={{width: size, height: size, borderRadius: radius, background: '#dbeafe', color: '#1d4ed8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.max(11, size * 0.38), fontWeight: 700, flex: 'none'}}>{initials(name)}</span>;
}

type Props = {
  entity: EntityType;
  id?: number | string | null;          // missing while the record is still being created: the picture is kept until the parent calls upload
  name: string;
  url?: string;                          // current picture (server URL), from the record
  size?: number;
  square?: boolean;
  editable?: boolean;
  label?: string;
  onChanged?: (item: AttachmentItem | null) => void;
  pending?: File | null;                 // create mode: the chosen file lives in the parent form
  onPick?: (f: File | null) => void;
};

/** Profile / main picture control with a default avatar, preview, change and remove. Works both for saved records and inside a create form. */
export function ProfilePhoto({entity, id, name, url, size = 96, square = false, editable = true, label = 'Photo', onChanged, pending, onPick}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [limits, setLimits] = useState<FileLimits | null>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState('');
  const [current, setCurrent] = useState<string | undefined>(url);
  const [preview, setPreview] = useState('');
  useEffect(() => setCurrent(url), [url]);
  useEffect(() => { fetchFileLimits().then(setLimits).catch(() => {}); }, []);
  useEffect(() => {
    if (!pending) { setPreview(''); return; }
    const u = URL.createObjectURL(pending);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [pending]);

  async function choose(f?: File | null) {
    setErr('');
    if (!f) return;
    const problem = checkFile(f, limits, true);
    if (problem) { setErr(problem); return; }
    if (!id) { onPick?.(f); return; }             // create mode: uploaded after the record exists
    setBusy(true); setPct(0);
    try {
      const small = await shrinkPhoto(f);
      const r = await uploadFiles(entity, id, [small], {kind: 'profile', onProgress: setPct});
      const item = r.items[0];
      setCurrent(item.urls.medium);
      onChanged?.(item);
    } catch (e: any) {
      setErr(e?.message || 'The picture could not be uploaded');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function remove() {
    if (!id) { onPick?.(null); return; }
    setBusy(true); setErr('');
    try {
      const all = await listFiles(entity, id);
      const main = all.find(a => a.kind === 'profile');
      if (main) await deleteFile(main.id);
      setCurrent(undefined);
      onChanged?.(null);
    } catch (e: any) {
      setErr(e?.message || 'The picture could not be removed');
    } finally {
      setBusy(false);
    }
  }

  const shown = preview || (current ? fileUrl(current) : '');
  const hasPicture = !!shown;
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
      <div style={{position: 'relative', width: size, height: size, flex: 'none'}}>
        {shown
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={shown} alt={`${label} of ${name}`} style={{width: size, height: size, objectFit: 'cover', borderRadius: square ? 12 : '50%', border: '2px solid #e2e8f0', background: '#f1f5f9'}} />
          : <Avatar name={name} size={size} square={square} />}
        {busy && <span style={{position: 'absolute', inset: 0, borderRadius: square ? 12 : '50%', background: 'rgba(255,255,255,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', fontSize: 11, color: '#334155'}}><Loader2 size={18} className="animate-spin" />{pct ? pct + '%' : ''}</span>}
      </div>
      {editable && (
        <div style={{display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start'}}>
          <input ref={input} type="file" accept={IMAGE_ACCEPT} hidden aria-label={`Choose ${label.toLowerCase()}`} onChange={e => choose(e.target.files?.[0])} />
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}><Camera size={14} style={{marginRight: 6}} />{hasPicture ? `Change ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`}</Button>
          {hasPicture && <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={remove}><Trash2 size={13} style={{marginRight: 6}} />Remove</Button>}
          <span style={{fontSize: 11, color: '#64748b'}}>JPEG, PNG or WebP · optimized automatically</span>
          {err && <span role="alert" style={{fontSize: 12, color: '#b42318'}}>{err}</span>}
        </div>
      )}
    </div>
  );
}
