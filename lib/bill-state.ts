/** Colour-coded bill state (F5). In API mode the server `bill_state` (via `useBillStates`) wins; these derivations are the demo-mode fallback and mirror `statements.py`. */
export type BillState='outstanding'|'paid'|'owed_to_us';

export const billStateLabel:Record<BillState,string>={outstanding:'Outstanding',paid:'Paid',owed_to_us:'Owed to us'};

/** Customer side (M13b): they owe us when due > 0, so amber `owed_to_us`; nothing left (or overpaid) counts as paid. */
export const customerBillState=(due:number):BillState=>due>0?'owed_to_us':'paid';

/** Owner or driver side: a bill we still pay out when due > 0 (red); a negative due means they owe the operator (amber). */
export const payableBillState=(due:number):BillState=>due>0?'outstanding':due<0?'owed_to_us':'paid';
