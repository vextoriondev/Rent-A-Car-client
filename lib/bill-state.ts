/** Colour-coded bill state (F5). Step 1 derives it from the statement; step 2 (backend M13) reads the server `bill_state` and deletes this derivation. */
export type BillState='outstanding'|'paid'|'owed_to_us';

export const billStateLabel:Record<BillState,string>={outstanding:'Outstanding',paid:'Paid',owed_to_us:'Owed to us'};

/** Customer side: they owe us when due > 0; nothing left (or overpaid) counts as paid. */
export const customerBillState=(due:number):BillState=>due>0?'outstanding':'paid';

/** Owner or driver side: we owe them when due > 0; a negative due means they owe the operator. */
export const payableBillState=(due:number):BillState=>due>0?'outstanding':due<0?'owed_to_us':'paid';
