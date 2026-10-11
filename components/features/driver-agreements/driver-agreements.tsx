"use client";
import {useCallback,useEffect,useState} from 'react';
import {Plus} from 'lucide-react';
import {apiMode,apiRequest} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {EmptyState} from '@/components/shared/empty-state';
import {ErrorState} from '@/components/shared/error-state';
import {Money} from '@/components/shared/money';
import {SectionHeading} from '@/components/shared/section-heading';
import {Can} from '@/lib/roles';
import {NewDriverAgreementDialog} from './new-driver-agreement-dialog';
import {DriverAgreementDialog} from './driver-agreement-dialog';
import type {DriverAgreementRow} from './types';

/** API mode: standalone driver agreements, the simple salary and staff arrangement a driver has with the operator outside any vehicle agreement (backend M16b). */
export function DriverAgreements(){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const [rows,setRows]=useState<DriverAgreementRow[]|null>(null);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [creating,setCreating]=useState(false);
 const [openId,setOpenId]=useState<number|null>(null);

 const load=useCallback(async()=>{
  if(!orgId)return;
  try{const r=await apiRequest(`/orgs/${orgId}/driver-agreements?limit=200`);setRows(r.items);setError('')}
  catch(e){setError((e as Error).message)}
 },[orgId]);
 useEffect(()=>{if(apiMode)void load()},[load]);

 return <Card>
  <SectionHeading title="Driver agreements" subtitle="A simple salary and staff agreement between you and a driver, made outside any vehicle agreement (for example when the car is rented without a driver)." action={<Can action="agreement.write"><Button onClick={()=>setCreating(true)}><Plus size={16}/> New driver agreement</Button></Can>}/>
  {!apiMode&&<p className="note">API mode only: driver agreements need the Django backend. This demo keeps drivers on vehicle agreements.</p>}
  {message&&<p role="status" className="note">{message}</p>}
  {error&&<ErrorState message={error} onRetry={()=>void load()}/>}
  {apiMode&&!error&&!rows&&<p className="note">Loading driver agreements...</p>}
  {rows&&rows.length===0&&<EmptyState title="No driver agreements yet" description="Add one when you hire a driver outside a vehicle agreement."/>}
  {rows&&rows.length>0&&<div className="billing-table driver-agreements" role="table" aria-label="Driver agreements">
   <div role="row" className="head"><span>Agreement</span><span>Driver</span><span>Vehicle</span><span>From</span><span>To</span><span>Salary / month</span><span/></div>
   {rows.map(r=><div role="row" key={r.id} className="clickable" tabIndex={0} onClick={()=>setOpenId(r.id)} onKeyDown={e=>{if(e.key==='Enter')setOpenId(r.id)}}>
    <span><b>{r.ref}</b> <Badge tone={r.status==='active'?'good':'neutral'}>{r.status==='active'?'Active':'Ended'}</Badge></span><span>{r.driver.name}</span><span>{r.vehicle?r.vehicle.registration:'-'}</span><span>{r.start_date}</span><span>{r.end_date||'Open'}</span><b className="nums"><Money value={Number(r.salary)}/></b>
    <span className="row-actions"><Button size="sm" variant="outline" onClick={e=>{e.stopPropagation();setOpenId(r.id)}} aria-label={`Open ${r.ref}`}>Open</Button></span></div>)}
  </div>}
  <NewDriverAgreementDialog open={creating} onClose={()=>setCreating(false)} onDone={async(m,id)=>{setCreating(false);await load();setMessage(m);setOpenId(id)}}/>
  <DriverAgreementDialog agreementId={openId} onClose={()=>{setOpenId(null);void load()}} onChanged={async m=>{await load();if(m)setMessage(m)}}/>
 </Card>;
}

