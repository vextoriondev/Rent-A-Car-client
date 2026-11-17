"use client";
import {useState} from 'react';
import {postOpeningBalance} from '@/lib/finance-api';
import {Field, FormDialog, Input, NativeSelect, errText, todayISO} from './common';

export type OpeningValue = {amount: string; type: string; direction: string; date: string; description: string; reference: string};
export const blankOpening = (type: string): OpeningValue => ({amount: '', type, direction: 'party_owes_us', date: todayISO(), description: '', reference: ''});

const TYPES: Record<string, {value: string; label: string}[]> = {
  owner: [{value: 'payable', label: 'Previous amount payable to the owner'}, {value: 'receivable', label: 'Previous amount receivable from the owner'}, {value: 'other', label: 'Other previous balance'}],
  customer: [{value: 'receivable', label: 'Previous receivable (client owes us)'}, {value: 'payable', label: 'Previous payable (we owe the client)'}, {value: 'other', label: 'Other previous balance'}],
  driver: [{value: 'salary_due', label: 'Previous salary due'}, {value: 'advance', label: 'Previous advance due'}, {value: 'fuel_gas', label: 'Previous fuel/gas due'}, {value: 'other', label: 'Other previous due'}],
};

/** Optional section for the Add Owner / Add Client forms. Leave the amount empty for no previous balance (defaults to zero). */
export function OpeningBalanceFields({kind, value, onChange}: {kind: 'owner' | 'customer'; value: OpeningValue; onChange: (v: OpeningValue) => void}) {
  const set = (patch: Partial<OpeningValue>) => onChange({...value, ...patch});
  const neg = Number(value.amount) < 0;
  return (
    <fieldset style={{border: '1px dashed #cbd5e1', borderRadius: 10, padding: 12, display: 'grid', gap: 10}}>
      <legend style={{fontSize: 12, fontWeight: 700, color: '#475569', padding: '0 6px'}}>Opening balance / previous due (optional)</legend>
      <div className="form-grid">
        <Field label="Balance type">
          <NativeSelect value={value.type} onChange={v => set({type: v})}>{TYPES[kind].map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</NativeSelect>
        </Field>
        <Field label="Opening amount (৳)" error={neg ? 'Amount cannot be negative' : ''} hint="Leave empty for zero">
          <Input type="number" min="0" step="0.01" value={value.amount} onChange={e => set({amount: e.target.value})} placeholder="0.00" />
        </Field>
        {value.type === 'other' && (
          <Field label="Direction">
            <NativeSelect value={value.direction} onChange={v => set({direction: v})}>
              <option value="party_owes_us">Party owes us</option><option value="we_owe_party">We owe the party</option>
            </NativeSelect>
          </Field>
        )}
        <Field label="As-of date"><Input type="date" value={value.date} onChange={e => set({date: e.target.value})} /></Field>
        <Field label="Reference"><Input value={value.reference} onChange={e => set({reference: e.target.value})} placeholder="Old ledger page / voucher" /></Field>
        <Field label="Description"><Input value={value.description} onChange={e => set({description: e.target.value})} /></Field>
      </div>
    </fieldset>
  );
}

export const openingPayload = (v: OpeningValue) => Number(v.amount) > 0 ? {
  opening_balance: v.amount, opening_balance_type: v.type, opening_balance_direction: v.type === 'other' ? v.direction : undefined,
  opening_balance_date: v.date, opening_balance_description: v.description, opening_balance_reference: v.reference,
} : {};

/** Add an opening balance to an existing owner / client / driver (one per type; duplicates are rejected by the server). */
export function OpeningBalanceDialog({open, onOpenChange, partyId, partyName, kind, onDone}: {
  open: boolean; onOpenChange: (o: boolean) => void; partyId: string | number; partyName: string; kind: 'owner' | 'customer' | 'driver'; onDone: () => void;
}) {
  const [v, setV] = useState<OpeningValue>(blankOpening(TYPES[kind][0].value));
  const amount = Number(v.amount);
  return (
    <FormDialog open={open} onOpenChange={o => { if (o) setV(blankOpening(TYPES[kind][0].value)); onOpenChange(o); }} title={`Opening balance – ${partyName}`}
      description="Records a historical balance in the ledger. It is not an invoice, salary or expense." submitLabel="Save opening balance" disabled={!(amount > 0)}
      confirmText={`Post an opening balance of ৳ ${amount.toLocaleString()} for ${partyName}? Only one of each type is allowed.`}
      onSubmit={async () => {
        try { await postOpeningBalance(partyId, {balance_type: v.type, amount: v.amount, date: v.date, direction: v.type === 'other' ? v.direction : undefined, description: v.description, reference: v.reference}); onDone(); return null; }
        catch (e) { return errText(e); }
      }}>
      <Field label="Balance type"><NativeSelect value={v.type} onChange={t => setV({...v, type: t})}>{TYPES[kind].map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</NativeSelect></Field>
      {v.type === 'other' && <Field label="Direction"><NativeSelect value={v.direction} onChange={d => setV({...v, direction: d})}><option value="party_owes_us">Party owes us</option><option value="we_owe_party">We owe the party</option></NativeSelect></Field>}
      <Field label="Amount (৳) *"><Input type="number" min="0" step="0.01" value={v.amount} onChange={e => setV({...v, amount: e.target.value})} /></Field>
      <Field label="As-of date"><Input type="date" value={v.date} onChange={e => setV({...v, date: e.target.value})} /></Field>
      <Field label="Reference"><Input value={v.reference} onChange={e => setV({...v, reference: e.target.value})} /></Field>
      <Field label="Description"><Input value={v.description} onChange={e => setV({...v, description: e.target.value})} /></Field>
    </FormDialog>
  );
}
