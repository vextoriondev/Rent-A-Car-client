export type DriverAgreementRow={id:number;ref:string;driver:{id:number;name:string};vehicle:{id:number;registration:string;model_name:string}|null;branch_id:number|null;start_date:string;end_date:string|null;salary:string;terms:string;status:'active'|'ended'};
export type DriverAgreementVersion={number:number;effective_from:string;salary:string;terms:string;reason:string};
export type DriverPeriod={id:number;month:string;closed:boolean;earned:string;paid:string;due:string;bill_state:'outstanding'|'paid'|'owed_to_us'};
export type DriverAgreementDetail=DriverAgreementRow&{versions:DriverAgreementVersion[];periods:DriverPeriod[];warnings:string[]};
export type Option={id:number;name:string};
