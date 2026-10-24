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
import {t,fmtNumber} from '@/lib/copy';
import {fmtDay} from '@/lib/format';
import {monthLabel} from '@/lib/clock';

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
  try{const p=await livePost(orgId,`/driver-agreements/${agreementId}/periods?month=${month}`,{});await changed(t('driverAgr.issued',{month: p.month.slice(0,7), amount: '৳'+fmtNumber(Number(p.earned))}))}
  catch(e){setMessage((e as Error).message)}finally{setBusy(false)}
 };

 return <Dialog open={agreementId!==null} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="agreement-dialog">
   <DialogHeader>
    <DialogTitle>{detail?`${detail.ref} · ${detail.driver.name}`:t('driverAgreements.driverAgreementDialog.driverAgreement')}</DialogTitle>
    <DialogDescription>{t('driverAgreements.driverAgreementDialog.salaryAndStaffArrangement')}</DialogDescription>
   </DialogHeader>
   {error&&<ErrorState message={error} onRetry={()=>void load()}/>}
   {!detail&&!error&&<p className="note">{t('driverAgr.loading')}</p>}
   {detail&&<div className="terms-section">
    {message&&<p role="status" className="note">{message}</p>}
    {detail.warnings.length>0&&<ul className="exception warning">{detail.warnings.map(w=><li key={w}>{w}</li>)}</ul>}
    <div className="terms">
     <div><span>{t('common.status')}</span><b><Badge tone={detail.status==='active'?'good':'neutral'}>{detail.status==='active'?t('driverAgr.active'):t('driverAgr.ended')}</Badge></b></div>
     <div><span>{t('common.salaryMonth')}</span><b><Money value={Number(detail.salary)}/></b></div>
     <div><span>{t('common.from')}</span><b>{fmtDay(detail.start_date)}</b></div>
     <div><span>{t('common.to')}</span><b>{detail.end_date||t('terms.noEnd')}</b></div>
     <div><span>{t('common.usualVehicle')}</span><b>{detail.vehicle?`${detail.vehicle.registration} · ${detail.vehicle.model_name}`:t('driverAgr.none')}</b></div>
     <div><span>{t('common.staffTerms')}</span><b>{detail.terms||t('common.noneRecorded')}</b></div>
    </div>
    <Can action="agreement.write"><div className="settlement-buttons">
     <Button variant="outline" onClick={()=>setSub('revise')}>{t('common.changeSalary')}</Button>
     <Button variant="outline" onClick={()=>setSub('terms')}>{t('common.editEndDateOr')}</Button>
    </div></Can>

    <h4 className="detail-subheading">{t('driverAgreements.driverAgreementDialog.monthlySalary')}</h4>
    <Can action="finance"><div className="billing-toolbar">
     <label>{t('driverAgreements.driverAgreementDialog.issueTheMonthOf')}<Input type="date" value={month} onChange={e=>setMonth(e.target.value)}/></label>
     <Button disabled={busy||!month} onClick={()=>void issue()}>{t('driverAgreements.driverAgreementDialog.issueSalaryForThis')}</Button>
    </div></Can>
    <p className="note">{t('driverAgr.pickFirstDay',{example: fmtDay(firstOfNextMonth())})}</p>
    {detail.periods.length===0?<p className="note">{t('driverAgreements.driverAgreementDialog.noMonthHasBeen')}</p>:<div className="billing-table terms-table" role="table" aria-label={t('driverAgreements.driverAgreementDialog.issuedMonths')}>
     <div role="row" className="head"><span>{t('common.month')}</span><span>{t('common.earned')}</span><span>{t('common.paid')}</span><span>{t('common.due')}</span><span>{t('common.bill')}</span><span/></div>
     {detail.periods.map(p=><div role="row" key={p.id}><span><b>{monthLabel(p.month)}</b></span><b className="nums"><Money value={Number(p.earned)}/></b><b className="nums"><Money value={Number(p.paid)}/></b><b className="nums"><Money value={Number(p.due)} signed state={p.bill_state}/></b><span><BillStateChip state={p.bill_state}/></span>
      <span className="row-actions"><Can action="payment.post"><Button size="sm" variant="outline" onClick={()=>setPaying(p)}>{t('driverAgreements.driverAgreementDialog.pay')}</Button><Button size="sm" variant="outline" onClick={()=>setCharging(p)}>{t('driverAgreements.driverAgreementDialog.deduct')}</Button></Can></span></div>)}
    </div>}

    <h4 className="detail-subheading">{t('driverAgreements.driverAgreementDialog.salaryHistory')}</h4>
    <div className="billing-table terms-table" role="table" aria-label={t('driverAgreements.driverAgreementDialog.salaryHistory')}>
     <div role="row" className="head"><span>{t('common.version')}</span><span>{t('common.effectiveFrom')}</span><span>{t('driverAgreements.driverAgreementDialog.salary')}</span><span>{t('common.reason')}</span></div>
     {detail.versions.map(v=><div role="row" key={v.number}><span><b>v{v.number}</b></span><span>{fmtDay(v.effective_from)}</span><b className="nums"><Money value={Number(v.salary)}/></b><span>{v.reason||'-'}</span></div>)}
    </div>

    <DocumentList targetType="driver_agreement" targetId={detail.id} title={t('driverAgreements.driverAgreementDialog.signedAgreementAndFiles')}/>

    <ReviseSalaryDialog open={sub==='revise'} agreementId={detail.id} currentSalary={detail.salary} onClose={()=>setSub('')} onDone={changed}/>
    <EditTermsDialog open={sub==='terms'} agreementId={detail.id} endDate={fmtDay(detail.end_date)} terms={detail.terms} onClose={()=>setSub('')} onDone={changed}/>
    {paying&&<PayDriverDialog open periodId={paying.id} month={paying.month} onClose={()=>setPaying(null)} onDone={changed}/>}
    {charging&&<ChargeDialog open periodId={charging.id} driverOnly onClose={()=>setCharging(null)} onDone={changed}/>}
   </div>}
  </DialogContent>
 </Dialog>;
}
