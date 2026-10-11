export type Version={id:number;number:number;effective_from:string;status:string;reason:string;customer_rent:string;owner_rent:string;driver_salary:string;fuel_responsible:string;repair_responsible:string;owner_offset_allowed:boolean;driver_provider:string;driver_paid_by:string;clauses:string;overtime_rate:string|null;overtime_unit:string};
export type AgreementDetail={id:number;status:string;start_date:string;vehicle:{id:number;model_name:string;registration:string};owner:{id:number;name:string};driver:{id:number;name:string}|null;versions:Version[];
 driver_assignments:{driver_id:number;driver:string;effective_from:string;effective_to:string|null;salary_override:string|null}[];
 ownerships:{owner_id:number;owner:string;effective_from:string;effective_to:string|null}[]};
export type PartyOption={id:number;name:string};
