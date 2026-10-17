import {period,statement,type Agreement,type Entry} from '@/lib/demo';
import type {DownloadTable} from '@/lib/downloads';
import {t} from '@/lib/copy';
import {entryStatusLabel,entryTypeLabel,partyLabel} from '@/lib/copy/labels';

export type PartyKind='Customer'|'Owner'|'Driver';
type Statement=ReturnType<typeof statement>;
export interface ReportConfig{party:PartyKind;columns:string[];values:(a:Agreement,s:Statement)=>number[]}

export const reportTypes=['Vehicle contribution','Customer balances','Owner liability','Driver payroll','Cash movement'];

export const reportTypeLabel=(type:string)=>type==='Vehicle contribution'?t('reports.type.vehicle'):type==='Customer balances'?t('reports.type.customer'):type==='Owner liability'?t('reports.type.owner'):type==='Driver payroll'?t('reports.type.driver'):type==='Cash movement'?t('reports.type.cash'):type;

export function reportConfig(type:string):ReportConfig{
 switch(type){
  case 'Customer balances':return{party:'Customer',columns:[t('reports.col.billed'),t('reports.col.received'),t('reports.col.moneyToTake')],values:(a,s)=>[a.rent,s.received,s.customerDue]};
  case 'Owner liability':return{party:'Owner',columns:[t('reports.col.ownerRent'),t('reports.col.takenOff'),t('reports.col.paid'),t('reports.col.moneyToGive')],values:(_a,s)=>[s.ownerGross,s.offsets,s.ownerPaid,s.ownerDue]};
  case 'Driver payroll':return{party:'Driver',columns:[t('reports.col.earned'),t('reports.col.paidEarly'),t('reports.col.paid'),t('reports.col.moneyToGive')],values:(_a,s)=>[s.driverEarned,s.advance,s.driverPaid,s.driverDue]};
  case 'Cash movement':return{party:'Customer',columns:[t('reports.col.moneyIn'),t('reports.col.paidOwners'),t('reports.col.paidDrivers'),t('reports.col.cashLeft')],values:(_a,s)=>[s.received,s.ownerPaid,s.driverPaid,s.cash]};
  default:return{party:'Customer',columns:[t('reports.col.earnedRent'),t('reports.col.ownerShare'),t('reports.col.driverSalary'),t('reports.col.yourCosts'),t('reports.col.profit')],values:(a,s)=>[a.rent,a.ownerRent,a.salary,s.operatorCosts,s.margin]};
 }
}

export const partyName=(party:PartyKind,a:Agreement)=>party==='Owner'?a.owner:party==='Driver'?(a.noDriver?t('common.noDriver'):a.driver):a.customer;

/** Backend report slug for each on-screen report type (GET /reports/{slug}/export). */
export const reportSlug=(type:string)=>type.toLowerCase().replaceAll(' ','-');

/** Describes the on-screen scope for the file preamble and the PDF heading. */
export function scopeText(parts:{label:string;value:string;all:string}[],periodLabel:string){
 const used=parts.filter(p=>p.value&&p.value!==p.all).map(p=>`${p.label}: ${p.value}`);
 return [t('reports.scope.period',{period: periodLabel}),...used].join('; ');
}

/** The entries exactly as listed on screen (the owner, search and status filters apply). */
export function entriesTable(entries:Entry[],scope:string):DownloadTable{
 return {title: t('common.cashbookAndEntries'),scope,columns:[t('reports.col.id'),t('reports.col.agreement'),t('reports.col.date'),t('reports.col.type'),t('reports.col.amount'),t('reports.col.paidBy'),t('reports.col.responsible'),t('reports.col.status'),t('reports.col.reference')],rows:entries.map(e=>[e.id,e.agreementId,e.date,entryTypeLabel(e.type),e.amount,partyLabel(e.paidBy),partyLabel(e.responsible),entryStatusLabel(e.status),e.reference])};
}

export function reportTable(type:string,agreements:Agreement[],entries:Entry[],scope:string):DownloadTable{
 const config=reportConfig(type);
 const rows=agreements.map(a=>{const s=statement(a,entries);return[a.id,a.registration,partyName(config.party,a),...config.values(a,s)]});
 const sums=config.columns.map((_c,i)=>rows.reduce((t,r)=>t+Number(r[3+i]),0));
 return {title:reportTypeLabel(type),scope,columns:[t('reports.col.agreement'),t('reports.col.vehicle'),partyLabel(config.party),...config.columns.map(c=>c+' (৳)')],rows,totals:rows.length?[t('reports.col.total'),'','',...sums]:undefined};
}

export const fileStem=(name:string,stem:string=period)=>`rentflow-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g,'-')}-${stem}`;
