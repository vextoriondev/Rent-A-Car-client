"use client";
import {useEffect, useRef, useState, type ReactNode} from 'react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription} from '@/components/ui/dialog';
import {newIdemKey} from '@/lib/finance-api';
import {ApiError} from '@/lib/api';

export const taka = (v: string | number | undefined | null) => '৳ ' + (Number(v) || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const thisMonth = () => new Date().toISOString().slice(0, 7);
export const errText = (e: unknown) => (e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Something went wrong. Please try again.');

/** A key that stays the same while one dialog session is open (so retries replay) and renews after a successful save. */
export function useIdemKey(open: boolean) {
  const ref = useRef(newIdemKey());
  useEffect(() => { if (open) ref.current = newIdemKey(); }, [open]);
  return {get: () => ref.current, renew: () => { ref.current = newIdemKey(); }};
}

export function Field({label, error, children, hint}: {label: string; error?: string; hint?: string; children: ReactNode}) {
  return (
    <label style={{display: 'block'}}>
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span style={{fontSize: 11, color: '#64748b', display: 'block', marginTop: 2}}>{hint}</span>}
      {error && <span role="alert" style={{fontSize: 11.5, color: '#b42318', display: 'block', marginTop: 2}}>{error}</span>}
    </label>
  );
}

export function Stat({label, value, tone}: {label: string; value: string; tone?: 'warn' | 'good' | 'neutral'}) {
  const color = tone === 'warn' ? '#b45309' : tone === 'good' ? '#067647' : '#0f172a';
  return (
    <div style={{background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', minWidth: 0}}>
      <span style={{fontSize: 10.5, color: '#64748b', display: 'block'}}>{label}</span>
      <strong className="nums" style={{fontSize: 14, color, wordBreak: 'break-word'}}>{value}</strong>
    </div>
  );
}

/** Dialog wrapper with a submit button that shows progress, a confirm step for sensitive money actions, and an error line. */
export function FormDialog({open, onOpenChange, title, description, submitLabel, onSubmit, children, disabled, confirmText, wide}: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; submitLabel: string;
  onSubmit: () => Promise<string | null>; children: ReactNode; disabled?: boolean; confirmText?: string; wide?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  useEffect(() => { if (open) { setError(''); setConfirming(false); } }, [open]);
  async function run() {
    if (confirmText && !confirming) { setConfirming(true); return; }
    setBusy(true); setError('');
    try {
      const err = await onSubmit();
      if (err) { setError(err); setConfirming(false); } else onOpenChange(false);
    } catch (e) { setError(errText(e)); setConfirming(false); } finally { setBusy(false); }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{maxWidth: wide ? 640 : 500, maxHeight: '92vh', overflowY: 'auto'}}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div style={{display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0'}}>{children}</div>
        {confirming && confirmText && (
          <div style={{background: '#fffaeb', border: '1px solid #fedf89', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: '#93370d'}}>{confirmText}</div>
        )}
        {error && <div role="alert" style={{background: '#fef3f2', border: '1px solid #fecdca', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: '#b42318'}}>{error}</div>}
        <DialogFooter>
          <Button variant="outline" onClick={() => (confirming ? setConfirming(false) : onOpenChange(false))} disabled={busy}>{confirming ? 'Back' : 'Cancel'}</Button>
          <Button onClick={run} disabled={busy || disabled}>{busy ? 'Saving…' : confirming ? 'Yes, confirm' : submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const METHODS = ['Cash', 'Bank Transfer', 'Mobile Banking'];
export function MethodSelect({value, onChange}: {value: string; onChange: (v: string) => void}) {
  return (
    <select className="input" value={value} onChange={e => onChange(e.target.value)} style={{height: 38, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', width: '100%', background: '#fff'}}>
      {METHODS.map(m => <option key={m}>{m}</option>)}
    </select>
  );
}
export const NativeSelect = ({value, onChange, children}: {value: string | number; onChange: (v: string) => void; children: ReactNode}) => (
  <select value={value} onChange={e => onChange(e.target.value)} style={{height: 38, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', width: '100%', background: '#fff'}}>{children}</select>
);
export {Input, Button};

export function HistoryTable({rows}: {rows: any[]}) {
  if (!rows.length) return <div style={{padding: 16, textAlign: 'center', color: '#64748b', fontSize: 12.5}}>No transactions in this period.</div>;
  return (
    <div style={{overflowX: 'auto'}}>
      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 12}}>
        <thead><tr style={{background: '#f8fafc', color: '#475569', textAlign: 'left'}}>
          {['Date', 'Account', 'Type', 'Description', 'Reference', 'Amount'].map(h => <th key={h} style={{padding: '6px 8px', whiteSpace: 'nowrap'}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{borderTop: '1px solid #f1f5f9'}}>
              <td style={{padding: '6px 8px', whiteSpace: 'nowrap'}}>{r.date}</td>
              <td style={{padding: '6px 8px'}}>{String(r.account).replace(/_/g, ' ')}</td>
              <td style={{padding: '6px 8px', textTransform: 'capitalize'}}>{r.type}</td>
              <td style={{padding: '6px 8px'}}>{r.description}{r.vehicle ? ` · ${r.vehicle}` : ''}</td>
              <td style={{padding: '6px 8px'}}>{r.reference}</td>
              <td className="nums" style={{padding: '6px 8px', textAlign: 'right', color: Number(r.delta) < 0 ? '#b42318' : '#067647', whiteSpace: 'nowrap'}}>{Number(r.delta) > 0 ? '+' : ''}{Number(r.delta).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
