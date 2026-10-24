"use client";
import {useEffect,useState} from 'react';
import {apiRequest} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Badge} from '@/components/ui/badge';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {ErrorState} from '@/components/shared/error-state';
import {Money} from '@/components/shared/money';
import type {ApiSpec} from '@/lib/schedule';
import {describeSpec} from '@/lib/schedule';
import type {DueRow,DuesResponse} from './terms-types';
import {t} from '@/lib/copy';
import {HelpTip} from '@/components/shared/help-tip';
import {fmtDay} from '@/lib/format';


const SIDES:[string,string][]=[['customer',t('pay.customer')],['owner',t('pay.owner')],['driver',t('pay.driver')]];
const tone:Record<DueRow['state'],'good'|'warn'|'bad'|'blue'>={paid:'good',partly_paid:'warn',overdue:'bad',due:'blue'};
const label:Record<DueRow['state'],string>={get paid(){return t('pay.paid')},get partly_paid(){return t('common.partlyPaid')},get overdue(){return t('pay.overdue')},get due(){return t('pay.due')}};

/** The payment days of one side: when each stretch falls due, what it covers, what is paid so far (oldest first) and its state (GET /agreements/{id}/dues). */
export function PaymentDays({agreementPk,hasDriver}:{agreementPk:number;hasDriver:boolean}){
 const orgId=useRentflowStore().store.backend?.orgId;
 const [side,setSide]=useState('customer');
 const [data,setData]=useState<DuesResponse|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(!orgId)return;
  let stale=false;setData(null);setError('');
  apiRequest(`/orgs/${orgId}/agreements/${agreementPk}/dues?side=${side}`).then(d=>{if(!stale)setData(d)}).catch(e=>{if(!stale)setError((e as Error).message)});
  return()=>{stale=true};
 },[orgId,agreementPk,side]);
 return <div>
  <h4 className="detail-subheading">{t('agreements.paymentDays.paymentDays')}<HelpTip tip="tip.paymentDay"/></h4>
  <div className="billing-toolbar"><label>{t('common.side')}
   <Select value={side} onValueChange={setSide}><SelectTrigger aria-label={t('agreements.paymentDays.paymentDaysFor')}><SelectValue/></SelectTrigger><SelectContent>{SIDES.filter(([s])=>hasDriver||s!=='driver').map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
  </label>{data&&<p className="note">{describeSpec(data.schedule.kind==='monthly'&&data.schedule.day==='last'?null:data.schedule as unknown as ApiSpec)}{data.next_due?t('pay.next',{date: data.next_due.due_date}):''}</p>}</div>
  {error&&<ErrorState message={error}/>}
  {!data&&!error&&<p className="note">{t('agreements.paymentDays.loadingThePaymentDays')}</p>}
  {data&&<div className="billing-table terms-table" role="table" aria-label={t('agreements.paymentDays.paymentDays')}>
   <div role="row" className="head"><span>{t('common.due')}</span><span>{t('agreements.paymentDays.covers')}</span><span>{t('common.amount')}</span><span>{t('agreements.paymentDays.paidSoFar')}</span><span>{t('common.state')}</span></div>
   {data.items.map(d=><div role="row" key={fmtDay(d.due_date)}><span><b>{fmtDay(d.due_date)}</b></span><span>{t('period.range',{from:fmtDay(d.covers_from),to:fmtDay(d.covers_to)})}</span><b className="nums"><Money value={Number(d.amount)}/></b><b className="nums"><Money value={Number(d.paid)}/></b><span><Badge tone={tone[d.state]}>{label[d.state]}</Badge></span></div>)}
   {data.items.length===0&&<p className="note">{t('agreements.paymentDays.noPaymentDaysYet')}</p>}
  </div>}
 </div>;
}
