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

const SIDES:[string,string][]=[['customer','Customer pays us'],['owner','We pay the owner'],['driver','We pay the driver']];
const tone:Record<DueRow['state'],'good'|'warn'|'bad'|'blue'>={paid:'good',partly_paid:'warn',overdue:'bad',due:'blue'};
const label:Record<DueRow['state'],string>={paid:'Paid',partly_paid:'Partly paid',overdue:'Overdue',due:'Due'};

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
  <h4 className="detail-subheading">Payment days</h4>
  <div className="billing-toolbar"><label>Side
   <Select value={side} onValueChange={setSide}><SelectTrigger aria-label="Payment days for"><SelectValue/></SelectTrigger><SelectContent>{SIDES.filter(([s])=>hasDriver||s!=='driver').map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
  </label>{data&&<p className="note">{describeSpec(data.schedule.kind==='monthly'&&data.schedule.day==='last'?null:data.schedule as unknown as ApiSpec)}{data.next_due?` · next: ${data.next_due.due_date}`:''}</p>}</div>
  {error&&<ErrorState message={error}/>}
  {!data&&!error&&<p className="note">Loading the payment days...</p>}
  {data&&<div className="billing-table terms-table" role="table" aria-label="Payment days">
   <div role="row" className="head"><span>Due</span><span>Covers</span><span>Amount</span><span>Paid so far</span><span>State</span></div>
   {data.items.map(d=><div role="row" key={d.due_date}><span><b>{d.due_date}</b></span><span>{d.covers_from} to {d.covers_to}</span><b className="nums"><Money value={Number(d.amount)}/></b><b className="nums"><Money value={Number(d.paid)}/></b><span><Badge tone={tone[d.state]}>{label[d.state]}</Badge></span></div>)}
   {data.items.length===0&&<p className="note">No payment days yet.</p>}
  </div>}
 </div>;
}
