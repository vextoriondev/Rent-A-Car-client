export type Charge={id:number;kind:string;direction:'increase'|'decrease';side:'customer'|'owner'|'driver';party_id:number;period_id:number;amount:string;description:string;reference:string;obligation_id:number|null;quantity?:string|null;unit_rate?:string|null};
export type InvoiceStatus='issued'|'partially_paid'|'paid'|'overdue'|'void';
export type Invoice={id:number;number:string;period_id:number;issue_date:string;due_date:string;state:string;status:InvoiceStatus;amount:string;paid:string;outstanding:string;lines:{obligation_id:number;description:string;amount:string}[]};
type Side={due:string;[k:string]:string|boolean};
export type Ledger={reconciles:boolean;statement:{customer:Side&{billed:string;received:string;carried_forward:string};owner:Side&{gross:string;offsets:string;paid:string};driver:Side&{earned:string;advance:string;paid:string}};lines:{entry_id:number;source_type:string;source_id:string;account:string;debit:string;credit:string;party_id:number|null}[]};

export const invoiceLabel:Record<InvoiceStatus,string>={issued:'Issued',partially_paid:'Partly paid',paid:'Paid',overdue:'Overdue',void:'Void'};
export const invoiceTone:Record<InvoiceStatus,'good'|'warn'|'bad'|'blue'|'neutral'>={issued:'blue',partially_paid:'warn',paid:'good',overdue:'bad',void:'neutral'};
