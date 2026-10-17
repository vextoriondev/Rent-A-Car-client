"use client";
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
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
import {t} from '@/lib/copy';
import {fmtDay} from '@/lib/format';


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
  <SectionHeading title={t('common.driverAgreements')} subtitle={t('driverAgreements.driverAgreements.aSimpleSalaryAnd')} action={<Can action="agreement.write"><Button onClick={()=>setCreating(true)}><Plus size={16}/> {t('common.newDriverAgreement')}</Button></Can>}/>
  {!apiMode&&<p className="note">{t('driverAgreements.driverAgreements.apiModeOnlyDriver')}</p>}
  {message&&<p role="status" className="note">{message}</p>}
  {error&&<ErrorState message={error} onRetry={()=>void load()}/>}
  {apiMode&&!error&&!rows&&<p className="note">{t('driverAgreements.driverAgreements.loadingDriverAgreements')}</p>}
  {rows&&rows.length===0&&<EmptyState title={t('driverAgreements.driverAgreements.noDriverAgreementsYet')} description={t('driverAgreements.driverAgreements.addOneWhenYou')}/>}
  {rows&&rows.length>0&&<div className="billing-table driver-agreements" role="table" aria-label={t('common.driverAgreements')}>
   <div role="row" className="head"><span>{t('common.agreement')}</span><span>{t('common.driver')}</span><span>{t('common.vehicle')}</span><span>{t('common.from')}</span><span>To</span><span>{t('common.salaryMonth')}</span><span/></div>
   {rows.map(r=><div role="row" key={r.id} className="clickable" tabIndex={0} onClick={()=>setOpenId(r.id)} onKeyDown={e=>{if(e.key==='Enter')setOpenId(r.id)}}>
    <span><b>{r.ref}</b> <Badge tone={r.status==='active'?'good':'neutral'}>{r.status==='active'?t('driverAgr.active'):t('driverAgr.ended')}</Badge></span><span><Link href={`/drivers/${r.driver.id}`} className="text-button">{r.driver.name}</Link></span><span>{r.vehicle?r.vehicle.registration:'-'}</span><span>{fmtDay(r.start_date)}</span><span>{r.end_date||t('driverAgr.open')}</span><b className="nums"><Money value={Number(r.salary)}/></b>
    <span className="row-actions"><Button size="sm" variant="outline" onClick={e=>{e.stopPropagation();setOpenId(r.id)}} aria-label={t('driverAgr.ariaOpen',{ref: r.ref})}>{t('common.open')}</Button></span></div>)}
  </div>}
  <NewDriverAgreementDialog open={creating} onClose={()=>setCreating(false)} onDone={async(m,id)=>{setCreating(false);await load();setMessage(m);setOpenId(id)}}/>
  <DriverAgreementDialog agreementId={openId} onClose={()=>{setOpenId(null);void load()}} onChanged={async m=>{await load();if(m)setMessage(m)}}/>
 </Card>;
}

