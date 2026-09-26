import {period,statement,type Agreement,type Entry} from '@/lib/demo';

export type PartyKind='Customer'|'Owner'|'Driver';
type Statement=ReturnType<typeof statement>;
export interface ReportConfig{party:PartyKind;columns:string[];values:(a:Agreement,s:Statement)=>number[]}

export const reportTypes=['Vehicle contribution','Customer balances','Owner liability','Driver payroll','Cash movement'];

export function reportConfig(type:string):ReportConfig{
 switch(type){
  case 'Customer balances':return{party:'Customer',columns:['Billed','Received','Outstanding'],values:(a,s)=>[a.rent,s.received,s.customerDue]};
  case 'Owner liability':return{party:'Owner',columns:['Gross','Offsets','Paid','Due'],values:(_a,s)=>[s.ownerGross,s.offsets,s.ownerPaid,s.ownerDue]};
  case 'Driver payroll':return{party:'Driver',columns:['Earned','Advance','Paid','Due'],values:(_a,s)=>[s.driverEarned,s.advance,s.driverPaid,s.driverDue]};
  case 'Cash movement':return{party:'Customer',columns:['Receipts','Owner paid','Driver paid','Net cash'],values:(_a,s)=>[s.received,s.ownerPaid,s.driverPaid,s.cash]};
  default:return{party:'Customer',columns:['Earned rent','Owner gross','Driver salary','Operator costs','Accrual margin'],values:(a,s)=>[a.rent,a.ownerRent,a.salary,s.operatorCosts,s.margin]};
 }
}

export const partyName=(party:PartyKind,a:Agreement)=>party==='Owner'?a.owner:party==='Driver'?a.driver:a.customer;

export function csv(rows:(string|number)[][],filename:string){
 const content=rows.map(row=>row.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n');
 const blob=new Blob(['\uFEFF'+content],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}

/** Same behaviour as the old single-page app: filters by status only, not by the owner/search scope shown on screen. */
export function exportEntriesCsv(entries:Entry[],statusFilter:string){
 csv([['ID','Agreement','Date','Type','Amount BDT','Paid by','Responsible','Status','Reference'],...entries.filter(e=>statusFilter==='All'||e.status===statusFilter).map(e=>[e.id,e.agreementId,e.date,e.type,e.amount,e.paidBy,e.responsible,e.status,e.reference])],`rentflow-entries-${period}.csv`);
}

export function exportReportCsv(type:string,agreements:Agreement[],entries:Entry[]){
 const config=reportConfig(type);
 csv([['Agreement','Vehicle',config.party,...config.columns.map(c=>c+' BDT'),'Generated at'],...agreements.map(a=>{const s=statement(a,entries);return[a.id,a.registration,partyName(config.party,a),...config.values(a,s),new Date().toISOString()]})],`rentflow-${type.toLowerCase().replaceAll(' ','-')}-${period}.csv`);
}
