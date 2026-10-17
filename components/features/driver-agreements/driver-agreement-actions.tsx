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
import {t,fmtNumber} from '@/lib/copy';
import {fmtDay} from '@/lib/format';

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
   await onDone(t('driverAgr.recorded',{kind: kind==='salary_advance'?t('driverAgr.advance'):t('driverAgreements.driverAgreementActions.salaryPayment'), amount: '৳'+fmtNumber(Number(amount)), month: month.slice(0,7)}));
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };
 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader><DialogTitle>{t('driverAgr.paySalary',{month: month.slice(0,7)})}</DialogTitle><DialogDescription>{t('driverAgreements.driverAgreementActions.stillOpenOnThis')} <b><Money value={openAmount}/></b>{t('driverAgreements.driverAgreementActions.anAdvanceCountsAgainst')}</DialogDescription></DialogHeader>
   <div className="entry-form">
    <label>{t('common.kindOf')}
     <Select value={kind} onValueChange={setKind}><SelectTrigger aria-label={t('driverAgreements.driverAgreementActions.paymentType')}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="driver_payout">{t('driverAgreements.driverAgreementActions.salaryPayment')}</SelectItem><SelectItem value="salary_advance">{t('driverAgreements.driverAgreementActions.salaryAdvance')}</SelectItem></SelectContent></Select>
    </label>
    <label>{t('common.amount2')}<Input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0"/></label>
    <label>{t('common.reference')}<Input value={reference} onChange={e=>setReference(e.target.value)} placeholder={t('common.bankOrMobileMoney')}/></label>
    <label>{t('common.date')}<Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    {over&&<p className="form-error" role="alert">{t('driverAgreements.driverAgreementActions.thatIsMoreThan')}</p>}
    {error&&<ErrorState message={error}/>}
    <div className="sheet-footer"><Button disabled={busy||!target||over||!(Number(amount)>0)||!reference.trim()||!date} onClick={()=>void submit()}>{t('driverAgreements.driverAgreementActions.recordPayment')}</Button><Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button></div>
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
  try{const v=await livePost(orgId,`/driver-agreements/${agreementId}/revise`,{effective_from:from,salary:String(Number(salary)),reason:reason.trim()});await onDone(t('driverAgr.salarySaved',{date: fmtDay(v.effective_from), number: v.number}))}
  catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };
 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader><DialogTitle>{t('common.changeSalary')}</DialogTitle><DialogDescription>{t('driverAgreements.driverAgreementActions.theOldSalaryStays')}</DialogDescription></DialogHeader>
   <div className="entry-form">
    <label>{t('common.effectiveFrom')}<Input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
    {Number(from.slice(8,10))>1&&<p className="note">{t('driverAgreements.driverAgreementActions.aMidMonthDate')}</p>}
    <label>{t('driverAgreements.driverAgreementActions.newSalaryMonth')}<Input inputMode="numeric" value={salary} onChange={e=>setSalary(e.target.value)}/></label>
    <label>{t('common.reasonRequired')}<Input value={reason} onChange={e=>setReason(e.target.value)} placeholder={t('driverAgreements.driverAgreementActions.whyIsTheSalary')}/></label>
    {error&&<ErrorState message={error}/>}
    <div className="sheet-footer"><Button disabled={busy||!reason.trim()||!(Number(salary)>0)||!from} onClick={()=>void submit()}>{t('driverAgreements.driverAgreementActions.saveNewSalary')}</Button><Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button></div>
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
   await onDone(t('driverAgr.updated'));
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };
 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader><DialogTitle>{t('common.editEndDateOr')}</DialogTitle><DialogDescription>{t('driverAgr.endNote')}</DialogDescription></DialogHeader>
   <div className="entry-form">
    <label>{t('common.endsLeaveEmptyFor')}<Input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label>
    <label>{t('common.staffTerms')}<Textarea rows={4} value={text} onChange={e=>setText(e.target.value)}/></label>
    {error&&<ErrorState message={error}/>}
    <div className="sheet-footer"><Button disabled={busy} onClick={()=>void submit()}>{t('common.save')}</Button><Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button></div>
   </div>
  </DialogContent>
 </Dialog>;
}
