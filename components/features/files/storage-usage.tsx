"use client";
import {useEffect, useState} from 'react';
import {fetchFileUsage, fmtBytes} from '@/lib/files';

/** Admin overview of the central file store: counts, bytes, bytes saved by optimization, per module, largest files, failures. */
export function StorageUsageCard() {
  const [u, setU] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => { fetchFileUsage().then(setU).catch(e => setErr(e?.message || 'Storage usage could not be loaded')); }, []);
  const label = (k: string) => ({owner: 'Owners', driver: 'Drivers', client: 'Clients', vehicle: 'Vehicles', agreement: 'Agreements', maintenance: 'Maintenance', transaction: 'Transactions'} as Record<string, string>)[k] || k;
  const saved = u && u.bytesOriginalUploaded > 0 ? Math.max(0, Math.round(100 - (100 * u.bytesTotal) / u.bytesOriginalUploaded)) : 0;
  return (
    <section aria-label="Storage usage" style={{border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 16}}>
      <h3 style={{margin: '0 0 4px', fontSize: 15, fontWeight: 700}}>Files & storage</h3>
      <p style={{margin: '0 0 12px', fontSize: 12.5, color: '#64748b'}}>Photos and documents are kept in {u?.backend === 's3' ? 'cloud object storage' : 'server storage'}; only their details are in the database.</p>
      {err && <div role="alert" style={{color: '#b42318', fontSize: 13}}>{err}</div>}
      {!u && !err && <span style={{fontSize: 13, color: '#64748b'}}>Loading…</span>}
      {u && (
        <>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 12}}>
            {[['Files', u.files], ['Images', u.images], ['Documents', u.documents], ['Stored', fmtBytes(u.bytesTotal)], ['Uploaded originals', fmtBytes(u.bytesOriginalUploaded)], ['Saved by optimization', saved + '%'], ['Failed', u.failed]].map(([k, v]) => (
              <div key={String(k)} style={{background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 10px'}}><div style={{fontSize: 11, color: '#64748b'}}>{k}</div><div style={{fontSize: 17, fontWeight: 700}}>{v as any}</div></div>
            ))}
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16}}>
            <table style={{width: '100%', fontSize: 12.5, borderCollapse: 'collapse'}}>
              <thead><tr style={{textAlign: 'left', color: '#64748b'}}><th>Module</th><th style={{textAlign: 'right'}}>Files</th><th style={{textAlign: 'right'}}>Size</th></tr></thead>
              <tbody>{Object.entries(u.byModule).map(([k, v]: any) => <tr key={k} style={{borderTop: '1px solid #f1f5f9'}}><td>{label(k)}</td><td style={{textAlign: 'right'}}>{v.files}</td><td style={{textAlign: 'right'}}>{fmtBytes(v.bytes)}</td></tr>)}</tbody>
            </table>
            <table style={{width: '100%', fontSize: 12.5, borderCollapse: 'collapse'}}>
              <thead><tr style={{textAlign: 'left', color: '#64748b'}}><th>Largest files</th><th style={{textAlign: 'right'}}>Size</th></tr></thead>
              <tbody>{u.largest.map((f: any) => <tr key={f.id} style={{borderTop: '1px solid #f1f5f9'}}><td style={{maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={f.fileName}>{f.fileName}</td><td style={{textAlign: 'right'}}>{fmtBytes(f.bytes)}</td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
