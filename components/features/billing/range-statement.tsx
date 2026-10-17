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
import {t} from '@/lib/copy';
import {HelpTip} from '@/components/shared/help-tip';

type Side={opening:{due:string};movements:Record<string,string>;closing:{due:string;bill_state:BillState}};
type RangeStatementData={from:string;to:string;customer:Side;owner:Side;driver:Side;operator:{accrual_margin:string;recorded_cash_movement:string;operator_borne_costs:string}};

/** Which movement lines each side shows, with a sign: money that raises the balance is positive, money that lowers it negative. */
const LINES:Record<'customer'|'owner'|'driver',[string,string,1|-1][]>={
 customer:[['billed',t('range.customer.billed'),1],['received',t('range.customer.received'),-1],['carried_forward',t('range.customer.carried'),-1]],
 owner:[['gross',t('range.owner.gross'),1],['offsets',t('range.owner.offsets'),-1],['paid',t('range.owner.paid'),-1],['carried_forward',t('range.customer.carried'),-1]],
 driver:[['earned',t('range.driver.earned'),1],['paid',t('range.driver.paid'),-1],['carried_forward',t('range.customer.carried'),-1]],
};
const TITLE={get customer(){return t('range.side.customer')},get owner(){return t('range.side.owner')},get driver(){return t('range.side.driver')}} as const;
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
   rows.push([TITLE[s],t('range.opening'),num(data[s].opening.due)]);
   for(const [k,l,sign] of LINES[s])rows.push([TITLE[s],l,sign*num(data[s].movements[k])]);
   rows.push([TITLE[s],t('range.closing'),num(data[s].closing.due)]);
  }
  rows.push([t('range.side.operator'),t('range.profit'),num(data.operator.accrual_margin)],[t('range.side.operator'),t('range.netCash'),num(data.operator.recorded_cash_movement)]);
  return {title: t('billing.rangeStatement.statement', {agreementLabel}),scope:t('range.scope',{agreement: agreementLabel, from: range.from, to: range.to}),columns:[t('range.colSide'),t('range.colItem'),t('range.colAmount')],rows};
 },[data,sides.join(),agreementLabel,range.from,range.to]);  // eslint-disable-line react-hooks/exhaustive-deps

 return <Card>
  <SectionHeading title={t('range.statementFor',{label})} subtitle={t('billing.rangeStatement.theBalanceWhenThe')}/>
  {error&&<ErrorState message={error}/>}
  {!data&&!error&&<p className="note">{t('billing.rangeStatement.workingOutTheStatement')}</p>}
  {data&&table&&<>
   <div className="billing-toolbar"><span/><DownloadButtons table={table} stem={`${agreementLabel}-statement-${range.from}_${range.to}`}/></div>
   <div className="billing-ledger" aria-label={t('billing.rangeStatement.statementForTheChosen')}>
    {sides.map(s=><div key={s}><h3 className="detail-subheading">{TITLE[s]}</h3>
     <p><span>{t('common.openingBalance')}<HelpTip tip="tip.balanceStart"/></span><b><Money value={num(data[s].opening.due)} signed/></b></p>
     {LINES[s].map(([k,l,sign])=><p key={k}><span>{l}</span><b><Money value={sign*num(data[s].movements[k])} signed/></b></p>)}
     <p className="total"><span>{t('billing.rangeStatement.closingBalance')}<HelpTip tip="tip.balanceEnd"/> <BillStateChip state={data[s].closing.bill_state}/></span><b><Money value={num(data[s].closing.due)} signed state={data[s].closing.bill_state}/></b></p></div>)}
   </div>
   <p className="note">{t('billing.rangeStatement.operatorOverTheseDates')} <b><Money value={num(data.operator.accrual_margin)} signed/></b> {t('billing.rangeStatement.netCash')} <b><Money value={num(data.operator.recorded_cash_movement)} signed/></b>.</p>
  </>}
 </Card>;
}
