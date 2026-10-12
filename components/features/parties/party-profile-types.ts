import type {BillState} from '@/lib/bill-state';

export type Kind='owner'|'driver'|'customer';
export const KIND_LABEL:Record<Kind,string>={owner:'Owner',driver:'Driver',customer:'Customer'};
export const num=(v?:string|number|null)=>Number(v||0);
export const fmtMonth=(iso:string)=>new Date(iso+'T12:00:00').toLocaleDateString('en-GB',{month:'short',year:'numeric'});

/** The statement columns for each kind of party: only that party's own side exists. */
export const COLUMNS:Record<Kind,[string,string][]>={
 customer:[['billed','Billed'],['received','Received'],['carried_forward','Carried forward'],['due','Due']],
 owner:[['gross','Gross rent'],['offsets','Offsets'],['net','Net rent'],['paid','Paid'],['carried_forward','Carried forward'],['due','Due']],
 driver:[['earned','Earned'],['advance','Advance'],['paid','Paid'],['carried_forward','Carried forward'],['due','Due']],
};
export const SUMMARY:Record<Kind,[string,string][]>={
 customer:[['billed','Billed'],['received','Received'],['due','Due']],
 owner:[['gross','Gross rent'],['offsets','Offsets'],['paid','Paid'],['due','Due']],
 driver:[['earned','Earned'],['advance','Advance'],['paid','Paid'],['due','Due']],
};
export const partyTabs=(kind:Kind):[string,string][]=>[['overview','Overview'],['statement','Statement'],['money','Billed and paid'],...(kind==='owner'?[['deductions','Deductions'] as [string,string]]:[]),['activity','Activity'],['documents','Files'],['notices','Messages']];

export type Page<T>={count:number;items:T[];next:number|null};
export type AgreementLink={ref:string;vehicle:string;model_name?:string;start_date?:string;end_date?:string|null;effective_from?:string;effective_to?:string|null;status?:string;customer_rent?:string;owner_rent?:string;salary?:string};
export type Portal={
 party:{id:number;kind:Kind;name:string;phone:string;email:string;contacts:{id:number;name:string;phone:string;email:string;role:string}[]};
 summary:{kind:Kind;bill_state:BillState;[k:string]:string};
 vehicles:{id?:number;registration:string;model_name?:string}[];
 agreements:AgreementLink[];
 driver_agreements?:{ref:string;vehicle:string|null;start_date:string;end_date:string|null;salary:string;terms:string;status:'active'|'ended'}[];
 split?:{vehicle_agreements:{due:string};standalone:{due:string};total_due:string};
};
export type StatementRow={period_id:number;month:string;ref:string;vehicle:string;bill_state:BillState;[k:string]:string|number};
export type Statement={kind:Kind;from:string|null;to:string|null;rows:StatementRow[];totals:{bill_state:BillState;[k:string]:string}};
export type Obligation={id:number;month:string;ref:string;kind:string;description:string;amount:string;allocated:string;open_amount:string};
export type PaymentRow={id:number;label:string;amount:string;reference:string;event_date:string;allocations:{month:string;amount:string}[]};
export type Deduction={expense_id:string;category:string;amount:string;state:string;event_date:string;reason:string;reference:string;receipt_reference:string;ref:string;vehicle:string;proof:{id:number;name:string}[]};
export type ActivityItem={date:string;type:string;text:string;amount:string;ref:string};
export type NoticeRow={id:number;title:string;text:string;state:string;created_at:string};
