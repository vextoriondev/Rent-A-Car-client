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
import {t} from '@/lib/copy';
import {fmtDay} from '@/lib/format';
import {monthLabel} from '@/lib/clock';
import {statusLabel} from '@/lib/copy/labels';


const role=(v:string)=>statusLabel(v);
const num=(v:string)=>Number(v||0);

/** API mode: terms history, driver arrangement, driver assignments and ownership history for one agreement (backend M2/M3b). */
export function AgreementTerms({agreementId}:{agreementId:string}){
 const rf=useRentflowStore();
 const backend=rf.store.backend;
 const orgId=backend?.orgId;
 const pk=Number(agreementId.replace('AGR-',''));
 const [detail,setDetail]=useState<AgreementDetail|null>(null);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const [billMonth,setBillMonth]=useState('');
 const [dialog,setDialog]=useState<''|'revise'|'driver'|'owner'|'end'>('');

 const load=useCallback(async()=>{
  if(orgId==null)return;
  try{setDetail(await apiRequest(`/orgs/${orgId}/agreements/${pk}`));setError('')}
  catch(e){setError((e as Error).message)}
 },[orgId,pk]);
 // keyed on the agreement and org only: a data refresh makes a new `backend` object and must not wipe the message
 useEffect(()=>{setDetail(null);setMessage('');if(apiMode)void load()},[load]);

 if(!apiMode)return <p className="note">{t('agreements.agreementTerms.apiModeOnlyTerms')}</p>;
 if(error)return <ErrorState message={error} onRetry={()=>void load()}/>;
 if(!detail)return <p className="note">{t('agreements.agreementTerms.loadingTheAgreementTerms')}</p>;

 const current=[...detail.versions].reverse().find(v=>v.status==='active')||detail.versions[detail.versions.length-1];
 const say=(text:string)=>{setMessage(text);rf.setToast(text)};
 const done=async(text:string)=>{setDialog('');await rf.refreshLive();await load();say(text)};
 const bill=async(path:string,okText:(r:any)=>string)=>{
  if(!backend)return;
  setBusy(true);setMessage('');
  try{const r=await livePost(backend.orgId,`/agreements/${pk}/${path}`,{});await done(okText(r))}
  catch(e){say((e as Error).message)}finally{setBusy(false)}
 };
 const billOne=()=>billMonth?bill(`periods?month=${billMonth}-01`,r=>t('agreements.agreementTerms.billed',{month: r.month.slice(0,7)})):undefined;
 const billAll=()=>bill('periods/catch-up',r=>r.issued.length?t('agreements.agreementTerms.billedList',{count: String(r.issued.length), months: r.issued.map((m:string)=>monthLabel(m)).join(', ')}):t('agreements.agreementTerms.alreadyUpToDate'));
 const activate=async()=>{
  if(!backend)return;
  setBusy(true);setMessage('');
  try{const r=await livePost(backend.orgId,`/agreements/${pk}/activate`,{});await done(t('terms.activated')+((r.warnings||[]).length?t('terms.warnings')+r.warnings.join(' '):''))}
  catch(e){say((e as Error).message)}finally{setBusy(false)}
 };

 return <div className="terms-section">
  <div className="settlement-status"><h3 className="detail-subheading">{t('agreements.agreementTerms.agreementTerms')}</h3><Badge tone={detail.status==='active'?'good':'warn'}>{role(detail.status)}</Badge></div>
  {current&&<div className="terms">
   {current.driver_provider==='none'
    ?<div><span>{t('common.driver')}</span><b>{t('common.noDriverVehicleOnly')}</b></div>
    :<><div><span>{t('agreements.agreementTerms.driverSuppliedBy')}</span><b>{role(current.driver_provider)}</b></div><div><span>{t('agreements.agreementTerms.driverPaidBy')}</span><b>{role(current.driver_paid_by)}</b></div></>}
   <div><span>{t('agreements.agreementTerms.runs')}</span><b>{t('period.range',{from:fmtDay(detail.start_date),to:detail.end_date?fmtDay(detail.end_date):t('terms.noEnd')})}</b></div>
   <div><span>{t('common.customerRent')}</span><b>{basisLabel(current.customer_rent_basis)}</b></div><div><span>{t('agreements.agreementTerms.ownerRent')}</span><b>{basisLabel(current.owner_rent_basis)}</b></div>{current.driver_provider!=='none'&&<div><span>{t('agreements.agreementTerms.driverSalary')}</span><b>{basisLabel(current.driver_salary_basis)}</b></div>}
   <div><span>{t('agreements.agreementTerms.customerPaysOn')}</span><b>{describeSpec(current.payment_schedule?.customer)}</b></div><div><span>{t('agreements.agreementTerms.ownerIsPaidOn')}</span><b>{describeSpec(current.payment_schedule?.owner)}</b></div>{current.driver_provider!=='none'&&<div><span>{t('agreements.agreementTerms.driverIsPaidOn')}</span><b>{describeSpec(current.payment_schedule?.driver)}</b></div>}
   {current.overtime_rate&&<div><span>{t('agreements.agreementTerms.overtimeRate')}</span><b>{t('terms.overtimePer',{rate: money(num(current.overtime_rate)), unit: current.overtime_unit||t('terms.unit')})}</b></div>}
   <div><span>{t('common.clauses')}</span><b>{current.clauses||t('common.noneRecorded')}</b></div>
  </div>}
  <div className="settlement-buttons">
   {detail.status==='draft'&&<Can action="agreement.write"><Button disabled={busy} onClick={()=>void activate()}>{t('common.activateAgreement')}</Button></Can>}
   {detail.status==='active'&&<Can action="finance"><Button variant="outline" onClick={()=>setDialog('revise')}>{t('common.reviseTerms')}</Button></Can>}
   {detail.status==='active'&&<Can action="finance"><Button variant="outline" onClick={()=>setDialog('end')}>{t('agreements.agreementTerms.changeEndDate')}</Button></Can>}
   {detail.status==='active'&&<Can action="finance"><label className="check-label">{t('agreements.agreementTerms.billAMonth')} <input type="month" value={billMonth} min={detail.start_date.slice(0,7)} max={detail.end_date?detail.end_date.slice(0,7):undefined} onChange={e=>setBillMonth(e.target.value)}/></label><Button variant="outline" disabled={busy||!billMonth} onClick={()=>void billOne()}>{t('agreements.agreementTerms.billThisMonth')}</Button><Button variant="outline" disabled={busy} onClick={()=>void billAll()}>{t('agreements.agreementTerms.billAllMonthsToNow')}</Button></Can>}
   <Can action="driver.assign"><Button variant="outline" onClick={()=>setDialog('driver')}>{t('common.assignDriver')}</Button></Can>
   <Can action="finance"><Button variant="outline" onClick={()=>setDialog('owner')}>{t('common.transferOwnership')}</Button></Can>
  </div>
  {message&&<p role="status" className="note" style={{fontWeight:600}}>{message}</p>}

  <h4 className="detail-subheading">{t('agreements.agreementTerms.termsHistory')}</h4>
  <div className="billing-table terms-table" role="table" aria-label={t('agreements.agreementTerms.termsHistory')}>
   <div role="row" className="head"><span>{t('common.version')}</span><span>{t('common.effectiveFrom')}</span><span>{t('common.customerRent')}</span><span>{t('agreements.agreementTerms.ownerRent')}</span><span>{t('agreements.agreementTerms.driverSalary')}</span><span>{t('common.reason')}</span></div>
   {detail.versions.map(v=><div role="row" key={v.id}><span><b>{t('terms.versionShort',{number: v.number})}</b> <Badge tone={v.status==='active'?'good':v.status==='draft'?'warn':'neutral'}>{role(v.status)}</Badge></span><span>{fmtDay(v.effective_from)}</span><b className="nums"><Money value={num(v.customer_rent)}/> <small>{basisUnit(v.customer_rent_basis)}</small></b><b className="nums"><Money value={num(v.owner_rent)}/> <small>{basisUnit(v.owner_rent_basis)}</small></b><b className="nums">{v.driver_paid_by==='operator'&&v.driver_provider!=='none'?<><Money value={num(v.driver_salary)}/> <small>{basisUnit(v.driver_salary_basis)}</small></>:t('terms.none')}</b><span>{v.reason&&v.reason!=='Initial terms'?v.reason:t('agreements.agreementTerms.originalTerms')}</span></div>)}
  </div>

  <PaymentDays agreementPk={pk} hasDriver={!!detail.driver}/>

  <h4 className="detail-subheading">{t('agreements.agreementTerms.driverHistory')}</h4>
  <div className="billing-table terms-table" role="table" aria-label={t('agreements.agreementTerms.driverHistory')}>
   <div role="row" className="head"><span>{t('common.driver')}</span><span>{t('common.from')}</span><span>{t('common.to')}</span><span>{t('agreements.agreementTerms.salaryOverride')}</span></div>
   {!detail.driver&&detail.driver_assignments.length===0&&<p className="note">{t('agreements.agreementTerms.thisAgreementHasNo')}</p>}
   {detail.driver&&detail.driver_assignments.length===0&&<div role="row"><span>{detail.driver.name}</span><span>{fmtDay(detail.start_date)}</span><span>{t('agreements.agreementTerms.current')}</span><span>-</span></div>}
   {detail.driver_assignments.map((d,i)=><div role="row" key={i}><span><b>{d.driver}</b></span><span>{fmtDay(d.effective_from)}</span><span>{d.effective_to||t('terms.current')}</span><span>{d.salary_override?<Money value={num(d.salary_override)}/>:'-'}</span></div>)}
  </div>

  <h4 className="detail-subheading">{t('agreements.agreementTerms.ownerHistory')}</h4>
  <div className="billing-table terms-table" role="table" aria-label={t('agreements.agreementTerms.ownerHistory')}>
   <div role="row" className="head"><span>{t('common.owner')}</span><span>{t('common.from')}</span><span>{t('common.to')}</span></div>
   {detail.ownerships.map((o,i)=><div role="row" key={i}><span><b>{o.owner}</b></span><span>{fmtDay(o.effective_from)}</span><span>{o.effective_to||t('terms.current')}</span></div>)}
  </div>

  <DocumentList targetType="vehicle" targetId={detail.vehicle.id} title={t('terms.vehicleFiles',{plate: detail.vehicle.registration})}/>

  {current&&<ReviseTermsDialog open={dialog==='revise'} agreementPk={pk} current={current} onClose={()=>setDialog('')} onDone={done}/>}
  <EndDateDialog open={dialog==='end'} agreementPk={pk} endDate={fmtDay(detail.end_date)} startDate={fmtDay(detail.start_date)} onClose={()=>setDialog('')} onDone={done}/>
  <AssignDriverDialog open={dialog==='driver'} agreementPk={pk} currentDriverId={detail.driver?.id??0} onClose={()=>setDialog('')} onDone={done}/>
  <TransferOwnerDialog open={dialog==='owner'} vehicleId={detail.vehicle.id} currentOwnerId={detail.owner.id} onClose={()=>setDialog('')} onDone={done}/>
 </div>;
}
