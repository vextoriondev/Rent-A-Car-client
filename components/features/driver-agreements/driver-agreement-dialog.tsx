"use client";
import {useCallback,useEffect,useState} from 'react';
import {apiRequest,livePost} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {ErrorState} from '@/components/shared/error-state';
import {Money} from '@/components/shared/money';
import {BillStateChip} from '@/components/shared/bill-state-chip';
import {DocumentList} from '@/components/features/documents/document-list';
import {ChargeDialog} from '@/components/features/billing/charge-dialog';
import {Can} from '@/lib/roles';
import {PayDriverDialog,ReviseSalaryDialog,EditTermsDialog} from './driver-agreement-actions';
import type {DriverAgreementDetail,DriverPeriod} from './types';

const firstOfNextMonth=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth()+1,1,12).toISOString().slice(0,10)};
const firstOfThisMonth=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1,12).toISOString().slice(0,10)};

/** One standalone driver agreement: terms, salary history, issued months with what is still due, and the actions on them. */
export function DriverAgreementDialog({agreementId,onClose,onChanged}:{agreementId:number|null;onClose:()=>void;onChanged:(message?:string)=>Promise<void>}){
 const orgId=useRentflowStore().store.backend?.orgId;
 const [detail,setDetail]=useState<DriverAgreementDetail|null>(null);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const [month,setMonth]=useState(firstOfThisMonth());
 const [sub,setSub]=useState<''|'revise'|'terms'>('');
 const [paying,setPaying]=useState<DriverPeriod|null>(null);
 const [charging,setCharging]=useState<DriverPeriod|null>(null);

 const load=useCallback(async()=>{
  if(!orgId||agreementId===null)return;
  try{setDetail(await apiRequest(`/orgs/${orgId}/driver-agreements/${agreementId}`));setError('')}
  catch(e){setError((e as Error).message)}
 },[orgId,agreementId]);
 useEffect(()=>{setDetail(null);setMessage('');setSub('');setPaying(null);setCharging(null);setMonth(firstOfThisMonth());if(agreementId!==null)void load()},[agreementId,load]);

 const changed=async(text:string)=>{setSub('');setPaying(null);setCharging(null);await load();await onChanged();setMessage(text)};
 const issue=async()=>{
  if(!orgId||agreementId===null)return;
  setBusy(true);setMessage('');
  try{const p=await livePost(orgId,`/driver-agreements/${agreementId}/periods?month=${month}`,{});await changed(`Salary for ${p.month.slice(0,7)} issued: ${Number(p.earned).toLocaleString('en-BD')} BDT due.`)}
  catch(e){setMessage((e as Error).message)}finally{setBusy(false)}
 };

 return <Dialog open={agreementId!==null} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="agreement-dialog">
   <DialogHeader>
    <DialogTitle>{detail?`${detail.ref} · ${detail.driver.name}`:'Driver agreement'}</DialogTitle>
    <DialogDescription>Salary and staff arrangement outside any vehicle agreement. It has no customer, owner, invoices or month-end closing.</DialogDescription>
   </DialogHeader>
   {error&&<ErrorState message={error} onRetry={()=>void load()}/>}
   {!detail&&!error&&<p className="note">Loading...</p>}
   {detail&&<div className="terms-section">
    {message&&<p role="status" className="note">{message}</p>}
    {detail.warnings.length>0&&<ul className="exception warning">{detail.warnings.map(w=><li key={w}>{w}</li>)}</ul>}
    <div className="terms">
     <div><span>Status</span><b><Badge tone={detail.status==='active'?'good':'neutral'}>{detail.status==='active'?'Active':'Ended'}</Badge></b></div>
     <div><span>Salary / month</span><b><Money value={Number(detail.salary)}/></b></div>
     <div><span>From</span><b>{detail.start_date}</b></div>
     <div><span>To</span><b>{detail.end_date||'Open'}</b></div>
     <div><span>Usual vehicle</span><b>{detail.vehicle?`${detail.vehicle.registration} · ${detail.vehicle.model_name}`:'None'}</b></div>
     <div><span>Staff terms</span><b>{detail.terms||'None recorded'}</b></div>
    </div>
    <Can action="agreement.write"><div className="settlement-buttons">
     <Button variant="outline" onClick={()=>setSub('revise')}>Change salary</Button>
     <Button variant="outline" onClick={()=>setSub('terms')}>Edit end date or terms</Button>
    </div></Can>

    <h4 className="detail-subheading">Monthly salary</h4>
    <Can action="finance"><div className="billing-toolbar">
     <label>Issue the month of<Input type="date" value={month} onChange={e=>setMonth(e.target.value)}/></label>
     <Button disabled={busy||!month} onClick={()=>void issue()}>Issue salary for this month</Button>
    </div></Can>
    <p className="note">Pick the first day of a month (for example {firstOfNextMonth()}). Each month is a full month of salary.</p>
    {detail.periods.length===0?<p className="note">No month has been issued yet.</p>:<div className="billing-table terms-table" role="table" aria-label="Issued months">
     <div role="row" className="head"><span>Month</span><span>Earned</span><span>Paid</span><span>Due</span><span>Bill</span><span/></div>
     {detail.periods.map(p=><div role="row" key={p.id}><span><b>{p.month.slice(0,7)}</b></span><b className="nums"><Money value={Number(p.earned)}/></b><b className="nums"><Money value={Number(p.paid)}/></b><b className="nums"><Money value={Number(p.due)} signed state={p.bill_state}/></b><span><BillStateChip state={p.bill_state}/></span>
      <span className="row-actions"><Can action="payment.post"><Button size="sm" variant="outline" onClick={()=>setPaying(p)}>Pay</Button><Button size="sm" variant="outline" onClick={()=>setCharging(p)}>Deduct</Button></Can></span></div>)}
    </div>}

    <h4 className="detail-subheading">Salary history</h4>
    <div className="billing-table terms-table" role="table" aria-label="Salary history">
     <div role="row" className="head"><span>Version</span><span>Effective from</span><span>Salary</span><span>Reason</span></div>
     {detail.versions.map(v=><div role="row" key={v.number}><span><b>v{v.number}</b></span><span>{v.effective_from}</span><b className="nums"><Money value={Number(v.salary)}/></b><span>{v.reason||'-'}</span></div>)}
    </div>

    <DocumentList targetType="driver_agreement" targetId={detail.id} title="Signed agreement and files"/>

    <ReviseSalaryDialog open={sub==='revise'} agreementId={detail.id} currentSalary={detail.salary} onClose={()=>setSub('')} onDone={changed}/>
    <EditTermsDialog open={sub==='terms'} agreementId={detail.id} endDate={detail.end_date} terms={detail.terms} onClose={()=>setSub('')} onDone={changed}/>
    {paying&&<PayDriverDialog open periodId={paying.id} month={paying.month} onClose={()=>setPaying(null)} onDone={changed}/>}
    {charging&&<ChargeDialog open periodId={charging.id} driverOnly onClose={()=>setCharging(null)} onDone={changed}/>}
   </div>}
  </DialogContent>
 </Dialog>;
}
