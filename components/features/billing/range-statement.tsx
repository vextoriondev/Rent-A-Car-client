"use client";
import {useEffect,useMemo,useState} from 'react';
import {apiRequest} from '@/lib/api';
import {usePeriod} from '@/lib/period';
import {useRentflowStore} from '@/lib/store-context';
import type {BillState} from '@/lib/bill-state';
import {Card} from '@/components/ui/card';
import {BillStateChip} from '@/components/shared/bill-state-chip';
import {DownloadButtons} from '@/components/shared/download-buttons';
import {ErrorState} from '@/components/shared/error-state';
import {Money} from '@/components/shared/money';
import {SectionHeading} from '@/components/shared/section-heading';
import type {DownloadTable} from '@/lib/downloads';

type Side={opening:{due:string};movements:Record<string,string>;closing:{due:string;bill_state:BillState}};
type RangeStatementData={from:string;to:string;customer:Side;owner:Side;driver:Side;operator:{accrual_margin:string;recorded_cash_movement:string;operator_borne_costs:string}};

/** Which movement lines each side shows, with a sign: money that raises the balance is positive, money that lowers it negative. */
const LINES:Record<'customer'|'owner'|'driver',[string,string,1|-1][]>={
 customer:[['billed','Billed (rent and charges)',1],['received','Received',-1],['carried_forward','Carried forward',-1]],
 owner:[['gross','Gross rent',1],['offsets','Offsets for costs paid',-1],['paid','Paid out',-1],['carried_forward','Carried forward',-1]],
 driver:[['earned','Salary earned',1],['paid','Paid (including advances)',-1],['carried_forward','Carried forward',-1]],
};
const TITLE={customer:'Customer',owner:'Owner',driver:'Driver'} as const;
const num=(v?:string)=>Number(v||0);

/** One agreement over exactly the picker's dates: the opening balance, every movement in the range, and the closing balance (GET /agreements/{id}/statement?from&to).
 * Rent, owner rent and salary accrue only for the days inside the range; payments and costs count on their own date. */
export function RangeStatement({agreementPk,agreementLabel,hasDriver}:{agreementPk:number;agreementLabel:string;hasDriver:boolean}){
 const orgId=useRentflowStore().store.backend?.orgId;
 const {range,label}=usePeriod();
 const [data,setData]=useState<RangeStatementData|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(!orgId)return;
  let stale=false;setData(null);setError('');
  apiRequest(`/orgs/${orgId}/agreements/${agreementPk}/statement?from=${range.from}&to=${range.to}`).then(d=>{if(!stale)setData(d)}).catch(e=>{if(!stale)setError((e as Error).message)});
  return()=>{stale=true};
 },[orgId,agreementPk,range.from,range.to]);

 const sides=(['customer','owner','driver'] as const).filter(s=>hasDriver||s!=='driver');
 const table=useMemo<DownloadTable|null>(()=>{
  if(!data)return null;
  const rows:(string|number)[][]=[];
  for(const s of sides){
   rows.push([TITLE[s],'Opening balance',num(data[s].opening.due)]);
   for(const [k,l,sign] of LINES[s])rows.push([TITLE[s],l,sign*num(data[s].movements[k])]);
   rows.push([TITLE[s],'Closing balance',num(data[s].closing.due)]);
  }
  rows.push(['Operator','Accrual margin',num(data.operator.accrual_margin)],['Operator','Net cash movement',num(data.operator.recorded_cash_movement)]);
  return {title:`Statement ${agreementLabel}`,scope:`${agreementLabel}; ${range.from} to ${range.to}`,columns:['Side','Item','Amount BDT'],rows};
 },[data,sides.join(),agreementLabel,range.from,range.to]);  // eslint-disable-line react-hooks/exhaustive-deps

 return <Card>
  <SectionHeading title={`Statement for ${label}`} subtitle="The balance when the period starts, everything that moved inside it, and the balance when it ends. Rent accrues only for the days in the period."/>
  {error&&<ErrorState message={error}/>}
  {!data&&!error&&<p className="note">Working out the statement...</p>}
  {data&&table&&<>
   <div className="billing-toolbar"><span/><DownloadButtons table={table} stem={`${agreementLabel}-statement-${range.from}_${range.to}`}/></div>
   <div className="billing-ledger" aria-label="Statement for the chosen dates">
    {sides.map(s=><div key={s}><h3 className="detail-subheading">{TITLE[s]}</h3>
     <p><span>Opening balance</span><b><Money value={num(data[s].opening.due)} signed/></b></p>
     {LINES[s].map(([k,l,sign])=><p key={k}><span>{l}</span><b><Money value={sign*num(data[s].movements[k])} signed/></b></p>)}
     <p className="total"><span>Closing balance <BillStateChip state={data[s].closing.bill_state}/></span><b><Money value={num(data[s].closing.due)} signed state={data[s].closing.bill_state}/></b></p></div>)}
   </div>
   <p className="note">Operator over these dates: accrual margin <b><Money value={num(data.operator.accrual_margin)} signed/></b> · net cash <b><Money value={num(data.operator.recorded_cash_movement)} signed/></b>.</p>
  </>}
 </Card>;
}
