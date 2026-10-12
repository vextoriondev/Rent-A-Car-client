"use client";
import {useCallback,useEffect,useState} from 'react';
import {apiRequest,apiMode,livePost} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {ErrorState} from '@/components/shared/error-state';
import {Money} from '@/components/shared/money';
import {money} from '@/lib/demo';
import {DocumentList} from '@/components/features/documents/document-list';
import {AssignDriverDialog,EndDateDialog,ReviseTermsDialog,TransferOwnerDialog} from './terms-dialogs';
import {PaymentDays} from './payment-days';
import {basisLabel,basisUnit,describeSpec} from '@/lib/schedule';
import type {AgreementDetail} from './terms-types';
import {Can} from '@/lib/roles';

const role=(v:string)=>v.charAt(0).toUpperCase()+v.slice(1);
const num=(v:string)=>Number(v||0);

/** API mode: terms history, driver arrangement, driver assignments and ownership history for one agreement (backend M2/M3b). */
export function AgreementTerms({agreementId}:{agreementId:string}){
 const rf=useRentflowStore();
 const backend=rf.store.backend;
 const pk=Number(agreementId.replace('AGR-',''));
 const [detail,setDetail]=useState<AgreementDetail|null>(null);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const [dialog,setDialog]=useState<''|'revise'|'driver'|'owner'|'end'>('');

 const load=useCallback(async()=>{
  if(!backend)return;
  try{setDetail(await apiRequest(`/orgs/${backend.orgId}/agreements/${pk}`));setError('')}
  catch(e){setError((e as Error).message)}
 },[backend,pk]);
 useEffect(()=>{setDetail(null);setMessage('');if(apiMode)void load()},[load]);

 if(!apiMode)return <p className="note">API mode only: terms history, driver assignment and ownership transfer need the Django backend. This demo keeps the current terms.</p>;
 if(error)return <ErrorState message={error} onRetry={()=>void load()}/>;
 if(!detail)return <p className="note">Loading the agreement terms...</p>;

 const current=[...detail.versions].reverse().find(v=>v.status==='active')||detail.versions[detail.versions.length-1];
 const done=async(text:string)=>{setDialog('');await rf.refreshLive();await load();setMessage(text)};
 const activate=async()=>{
  if(!backend)return;
  setBusy(true);setMessage('');
  try{const r=await livePost(backend.orgId,`/agreements/${pk}/activate`,{});await done('Agreement activated.'+((r.warnings||[]).length?' Warnings: '+r.warnings.join(' '):''))}
  catch(e){setMessage((e as Error).message)}finally{setBusy(false)}
 };

 return <div className="terms-section">
  <div className="settlement-status"><h3 className="detail-subheading">Agreement terms</h3><Badge tone={detail.status==='active'?'good':'warn'}>{role(detail.status)}</Badge></div>
  {message&&<p role="status" className="note">{message}</p>}
  {current&&<div className="terms">
   {current.driver_provider==='none'
    ?<div><span>Driver</span><b>No driver (vehicle only)</b></div>
    :<><div><span>Driver supplied by</span><b>{role(current.driver_provider)}</b></div><div><span>Driver paid by</span><b>{role(current.driver_paid_by)}</b></div></>}
   <div><span>Runs</span><b>{detail.start_date} to {detail.end_date||'open-ended'}</b></div>
   <div><span>Customer rent</span><b>{basisLabel(current.customer_rent_basis)}</b></div><div><span>Owner rent</span><b>{basisLabel(current.owner_rent_basis)}</b></div>{current.driver_provider!=='none'&&<div><span>Driver salary</span><b>{basisLabel(current.driver_salary_basis)}</b></div>}
   <div><span>Customer pays on</span><b>{describeSpec(current.payment_schedule?.customer)}</b></div><div><span>Owner is paid on</span><b>{describeSpec(current.payment_schedule?.owner)}</b></div>{current.driver_provider!=='none'&&<div><span>Driver is paid on</span><b>{describeSpec(current.payment_schedule?.driver)}</b></div>}
   {current.overtime_rate&&<div><span>Overtime rate</span><b>{money(num(current.overtime_rate))} per {current.overtime_unit||'unit'}</b></div>}
   <div><span>Clauses</span><b>{current.clauses||'None recorded'}</b></div>
  </div>}
  <div className="settlement-buttons">
   {detail.status==='draft'&&<Can action="agreement.write"><Button disabled={busy} onClick={()=>void activate()}>Activate agreement</Button></Can>}
   {detail.status==='active'&&<Can action="finance"><Button variant="outline" onClick={()=>setDialog('revise')}>Revise terms</Button></Can>}
   {detail.status==='active'&&<Can action="finance"><Button variant="outline" onClick={()=>setDialog('end')}>Change end date</Button></Can>}
   <Can action="driver.assign"><Button variant="outline" onClick={()=>setDialog('driver')}>Assign driver</Button></Can>
   <Can action="finance"><Button variant="outline" onClick={()=>setDialog('owner')}>Transfer ownership</Button></Can>
  </div>

  <h4 className="detail-subheading">Terms history</h4>
  <div className="billing-table terms-table" role="table" aria-label="Terms history">
   <div role="row" className="head"><span>Version</span><span>Effective from</span><span>Customer rent</span><span>Owner rent</span><span>Driver salary</span><span>Reason</span></div>
   {detail.versions.map(v=><div role="row" key={v.id}><span><b>v{v.number}</b> <Badge tone={v.status==='active'?'good':v.status==='draft'?'warn':'neutral'}>{role(v.status)}</Badge></span><span>{v.effective_from}</span><b className="nums"><Money value={num(v.customer_rent)}/> <small>{basisUnit(v.customer_rent_basis)}</small></b><b className="nums"><Money value={num(v.owner_rent)}/> <small>{basisUnit(v.owner_rent_basis)}</small></b><b className="nums">{v.driver_paid_by==='operator'&&v.driver_provider!=='none'?<><Money value={num(v.driver_salary)}/> <small>{basisUnit(v.driver_salary_basis)}</small></>:'None'}</b><span>{v.reason||'Original terms'}</span></div>)}
  </div>

  <PaymentDays agreementPk={pk} hasDriver={!!detail.driver}/>

  <h4 className="detail-subheading">Driver history</h4>
  <div className="billing-table terms-table" role="table" aria-label="Driver history">
   <div role="row" className="head"><span>Driver</span><span>From</span><span>To</span><span>Salary override</span></div>
   {!detail.driver&&detail.driver_assignments.length===0&&<p className="note">This agreement has no driver. Any driver works under a separate driver agreement (Drivers page), outside this agreement.</p>}
   {detail.driver&&detail.driver_assignments.length===0&&<div role="row"><span>{detail.driver.name}</span><span>{detail.start_date}</span><span>Current</span><span>-</span></div>}
   {detail.driver_assignments.map((d,i)=><div role="row" key={i}><span><b>{d.driver}</b></span><span>{d.effective_from}</span><span>{d.effective_to||'Current'}</span><span>{d.salary_override?<Money value={num(d.salary_override)}/>:'-'}</span></div>)}
  </div>

  <h4 className="detail-subheading">Owner history</h4>
  <div className="billing-table terms-table" role="table" aria-label="Owner history">
   <div role="row" className="head"><span>Owner</span><span>From</span><span>To</span></div>
   {detail.ownerships.map((o,i)=><div role="row" key={i}><span><b>{o.owner}</b></span><span>{o.effective_from}</span><span>{o.effective_to||'Current'}</span></div>)}
  </div>

  <DocumentList targetType="vehicle" targetId={detail.vehicle.id} title={`Vehicle files (${detail.vehicle.registration})`}/>

  {current&&<ReviseTermsDialog open={dialog==='revise'} agreementPk={pk} current={current} onClose={()=>setDialog('')} onDone={done}/>}
  <EndDateDialog open={dialog==='end'} agreementPk={pk} endDate={detail.end_date} startDate={detail.start_date} onClose={()=>setDialog('')} onDone={done}/>
  <AssignDriverDialog open={dialog==='driver'} agreementPk={pk} currentDriverId={detail.driver?.id??0} onClose={()=>setDialog('')} onDone={done}/>
  <TransferOwnerDialog open={dialog==='owner'} vehicleId={detail.vehicle.id} currentOwnerId={detail.owner.id} onClose={()=>setDialog('')} onDone={done}/>
 </div>;
}
