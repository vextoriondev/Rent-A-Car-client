import type {ApiSchedule,Basis} from '@/lib/schedule';
export type Version={id:number;number:number;effective_from:string;status:string;reason:string;customer_rent:string;owner_rent:string;driver_salary:string;fuel_responsible:string;repair_responsible:string;owner_offset_allowed:boolean;driver_provider:string;driver_paid_by:string;clauses:string;overtime_rate:string|null;overtime_unit:string;customer_rent_basis:Basis;owner_rent_basis:Basis;driver_salary_basis:Basis;payment_schedule:ApiSchedule};
export type AgreementDetail={id:number;status:string;start_date:string;end_date:string|null;vehicle:{id:number;model_name:string;registration:string};owner:{id:number;name:string};driver:{id:number;name:string}|null;versions:Version[];
 driver_assignments:{driver_id:number;driver:string;effective_from:string;effective_to:string|null;salary_override:string|null}[];
 ownerships:{owner_id:number;owner:string;effective_from:string;effective_to:string|null}[]};
export type PartyOption={id:number;name:string};
export type DueRow={side:string;due_date:string;covers_from:string;covers_to:string;amount:string;paid:string;state:'paid'|'partly_paid'|'due'|'overdue'};
export type DuesResponse={side:string;schedule:{kind:string;[k:string]:unknown};items:DueRow[];next_due:DueRow|null};
