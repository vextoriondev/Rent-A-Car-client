"use client";
import {useEffect,useState} from 'react';
import {apiRequest,livePost} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {ErrorState} from '@/components/shared/error-state';
import {Money} from '@/components/shared/money';

const nextMonth=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth()+1,1,12).toISOString().slice(0,10)};

/** Pays or advances salary against one issued month (POST /payments with the month's driver obligation). */
export function PayDriverDialog({open,periodId,month,onClose,onDone}:{open:boolean;periodId:number;month:string;onClose:()=>void;onDone:(m:string)=>Promise<void>}){
 const orgId=useRentflowStore().store.backend?.orgId;
 const [target,setTarget]=useState<{obligation_id:number;open_amount:string}|null>(null);
 const [kind,setKind]=useState('driver_payout');
 const [amount,setAmount]=useState('');
 const [reference,setReference]=useState('');
 const [date,setDate]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [key,setKey]=useState('');
 useEffect(()=>{
  if(!open||!orgId)return;
  setTarget(null);setKind('driver_payout');setAmount('');setReference('');setDate(new Date().toISOString().slice(0,10));setError('');setKey(crypto.randomUUID());
  apiRequest(`/orgs/${orgId}/periods/${periodId}/obligations?side=driver`).then((r:{obligation_id:number;kind:string;open_amount:string}[])=>setTarget(r.find(x=>x.kind==='driver_salary')||null)).catch(e=>setError((e as Error).message));
 },[open,orgId,periodId]);
 const openAmount=Number(target?.open_amount||0);
 const over=Number(amount)>openAmount;
 const submit=async()=>{
  if(!orgId||!target)return;
  setBusy(true);setError('');
  try{
   await livePost(orgId,'/payments',{kind,amount:String(Number(amount)),reference:reference.trim(),method:'bank',event_date:date,allocations:[{obligation_id:target.obligation_id,amount:String(Number(amount))}]},key);
   await onDone(`${kind==='salary_advance'?'Advance':'Salary payment'} of ৳${Number(amount).toLocaleString('en-BD')} recorded for ${month.slice(0,7)}.`);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };
 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader><DialogTitle>Pay salary for {month.slice(0,7)}</DialogTitle><DialogDescription>Still open on this month: <b><Money value={openAmount}/></b>. An advance counts against the same salary.</DialogDescription></DialogHeader>
   <div className="entry-form">
    <label>Type
     <Select value={kind} onValueChange={setKind}><SelectTrigger aria-label="Payment type"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="driver_payout">Salary payment</SelectItem><SelectItem value="salary_advance">Salary advance</SelectItem></SelectContent></Select>
    </label>
    <label>Amount (৳)<Input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0"/></label>
    <label>Reference<Input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Bank or mobile money reference"/></label>
    <label>Date<Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    {over&&<p className="form-error" role="alert">That is more than what is still open on this month.</p>}
    {error&&<ErrorState message={error}/>}
    <div className="sheet-footer"><Button disabled={busy||!target||over||!(Number(amount)>0)||!reference.trim()||!date} onClick={()=>void submit()}>Record payment</Button><Button variant="outline" onClick={onClose}>Cancel</Button></div>
   </div>
  </DialogContent>
 </Dialog>;
}

/** A dated salary change (POST /driver-agreements/{id}/revise). It applies from the first of a month and never rewrites months already issued. */
export function ReviseSalaryDialog({open,agreementId,currentSalary,onClose,onDone}:{open:boolean;agreementId:number;currentSalary:string;onClose:()=>void;onDone:(m:string)=>Promise<void>}){
 const orgId=useRentflowStore().store.backend?.orgId;
 const [from,setFrom]=useState(nextMonth());
 const [salary,setSalary]=useState('');
 const [reason,setReason]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{if(open){setFrom(nextMonth());setSalary(String(Number(currentSalary)));setReason('');setError('')}},[open,currentSalary]);
 const submit=async()=>{
  if(!orgId)return;
  setBusy(true);setError('');
  try{const v=await livePost(orgId,`/driver-agreements/${agreementId}/revise`,{effective_from:from,salary:String(Number(salary)),reason:reason.trim()});await onDone(`Salary version ${v.number} saved, effective ${v.effective_from}.`)}
  catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };
 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader><DialogTitle>Change salary</DialogTitle><DialogDescription>The old salary stays in the history. Months already issued are never changed.</DialogDescription></DialogHeader>
   <div className="entry-form">
    <label>Effective from<Input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
    {Number(from.slice(8,10))>1&&<p className="note">A mid-month date applies from the next month.</p>}
    <label>New salary / month (৳)<Input inputMode="numeric" value={salary} onChange={e=>setSalary(e.target.value)}/></label>
    <label>Reason (required)<Input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Why is the salary changing?"/></label>
    {error&&<ErrorState message={error}/>}
    <div className="sheet-footer"><Button disabled={busy||!reason.trim()||!(Number(salary)>0)||!from} onClick={()=>void submit()}>Save new salary</Button><Button variant="outline" onClick={onClose}>Cancel</Button></div>
   </div>
  </DialogContent>
 </Dialog>;
}

/** End date and free-text staff terms (PATCH /driver-agreements/{id}). Clearing the end date makes the agreement open-ended again. */
export function EditTermsDialog({open,agreementId,endDate,terms,onClose,onDone}:{open:boolean;agreementId:number;endDate:string|null;terms:string;onClose:()=>void;onDone:(m:string)=>Promise<void>}){
 const orgId=useRentflowStore().store.backend?.orgId;
 const [end,setEnd]=useState('');
 const [text,setText]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{if(open){setEnd(endDate||'');setText(terms);setError('')}},[open,endDate,terms]);
 const submit=async()=>{
  if(!orgId)return;
  setBusy(true);setError('');
  try{
   await apiRequest(`/orgs/${orgId}/driver-agreements/${agreementId}`,{method:'PATCH',body:JSON.stringify({end_date:end||null,terms:text})});
   await onDone('Driver agreement updated.');
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };
 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader><DialogTitle>Edit end date or terms</DialogTitle><DialogDescription>Ending the agreement stops new months from being issued; issued months and their balances stay.</DialogDescription></DialogHeader>
   <div className="entry-form">
    <label>Ends (leave empty for open-ended)<Input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label>
    <label>Staff terms<Textarea rows={4} value={text} onChange={e=>setText(e.target.value)}/></label>
    {error&&<ErrorState message={error}/>}
    <div className="sheet-footer"><Button disabled={busy} onClick={()=>void submit()}>Save</Button><Button variant="outline" onClick={onClose}>Cancel</Button></div>
   </div>
  </DialogContent>
 </Dialog>;
}
