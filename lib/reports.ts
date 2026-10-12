import {period,statement,type Agreement,type Entry} from '@/lib/demo';
import type {DownloadTable} from '@/lib/downloads';

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

export const partyName=(party:PartyKind,a:Agreement)=>party==='Owner'?a.owner:party==='Driver'?(a.noDriver?'No driver':a.driver):a.customer;

/** Backend report slug for each on-screen report type (GET /reports/{slug}/export). */
export const reportSlug=(type:string)=>type.toLowerCase().replaceAll(' ','-');

/** Describes the on-screen scope for the file preamble and the PDF heading. */
export function scopeText(parts:{label:string;value:string;all:string}[],periodLabel:string){
 const used=parts.filter(p=>p.value&&p.value!==p.all).map(p=>`${p.label}: ${p.value}`);
 return [`Period: ${periodLabel}`,...used].join('; ');
}

/** The entries exactly as listed on screen (the owner, search and status filters apply). */
export function entriesTable(entries:Entry[],scope:string):DownloadTable{
 return {title:'Cashbook and entries',scope,columns:['ID','Agreement','Date','Type','Amount BDT','Paid by','Responsible','Status','Reference'],rows:entries.map(e=>[e.id,e.agreementId,e.date,e.type,e.amount,e.paidBy,e.responsible,e.status,e.reference])};
}

export function reportTable(type:string,agreements:Agreement[],entries:Entry[],scope:string):DownloadTable{
 const config=reportConfig(type);
 const rows=agreements.map(a=>{const s=statement(a,entries);return[a.id,a.registration,partyName(config.party,a),...config.values(a,s)]});
 const sums=config.columns.map((_c,i)=>rows.reduce((t,r)=>t+Number(r[3+i]),0));
 return {title:type,scope,columns:['Agreement','Vehicle',config.party,...config.columns.map(c=>c+' BDT')],rows,totals:rows.length?['Total','','',...sums]:undefined};
}

export const fileStem=(name:string,stem:string=period)=>`rentflow-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g,'-')}-${stem}`;
