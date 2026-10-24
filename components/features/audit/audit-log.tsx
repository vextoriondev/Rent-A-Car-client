"use client";
import {useEffect,useState} from 'react';
import {apiMode,apiRequest} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {useQueryParam} from '@/lib/use-list-filters';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {EmptyState} from '@/components/shared/empty-state';
import {ErrorState} from '@/components/shared/error-state';
import {SectionHeading} from '@/components/shared/section-heading';
import {t} from '@/lib/copy';
import {auditActionLabel,auditTargetLabel} from '@/lib/copy/labels';

type AuditEvent={id:number;at:string;actor_id:number|null;action:string;target_type:string;target_id:string;before:unknown;after:unknown;reason:string;request_id:string;ip:string|null};
const PAGE=25;

/** Who did what and when, for admins and accountants (GET /audit-events). Every filter lives in the URL, so a filtered view can be shared or reloaded. */
export function AuditLog(){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const [action,setAction]=useQueryParam('action');
 const [type,setType]=useQueryParam('target');
 const [targetId,setTargetId]=useQueryParam('id');
 const [actor,setActor]=useQueryParam('actor');
 const [from,setFrom]=useQueryParam('since');
 const [to,setTo]=useQueryParam('until');
 const [page,setPage]=useQueryParam('page','0');
 const [data,setData]=useState<{count:number;items:AuditEvent[]}|null>(null);
 const [error,setError]=useState('');
 const [openRow,setOpenRow]=useState<number|null>(null);
 const offset=Math.max(0,Number(page)||0)*PAGE;

 useEffect(()=>{
  if(!apiMode||!orgId)return;
  const q=new URLSearchParams({limit:String(PAGE),offset:String(offset)});
  if(action)q.set('action',action);
  if(type)q.set('target_type',type);
  if(targetId)q.set('target_id',targetId);
  if(actor)q.set('actor_id',actor);
  if(from)q.set('date_from',from);
  if(to)q.set('date_to',to);
  apiRequest(`/orgs/${orgId}/audit-events?${q}`).then(d=>{setData(d);setError('')}).catch(e=>{setData(null);setError((e as Error).message)});
 },[orgId,action,type,targetId,actor,from,to,offset]);

 if(!apiMode)return <Card><SectionHeading title={t('common.auditLog')}/><EmptyState title={t('common.apiModeOnly')} description={t('audit.auditLog.theAuditLogIs')}/></Card>;
 const reset=(set:(v:string)=>void)=>(v:string)=>{set(v);setPage('')};
 const pages=data?Math.max(1,Math.ceil(data.count/PAGE)):1;
 const current=Math.floor(offset/PAGE);
 const show=(v:unknown)=>v==null||(typeof v==='object'&&Object.keys(v as object).length===0)?'-':JSON.stringify(v,null,1);
 return <Card>
  <SectionHeading title={t('common.auditLog')} subtitle={t('audit.auditLog.everyMoneyTermsDocument')}/>
  <div className="audit-filters">
   <label>{t('audit.auditLog.actionStartsWith')}<Input value={action} onChange={e=>reset(setAction)(e.target.value)} placeholder={t('audit.auditLog.eGExpenseInvoice')}/></label>
   <label>{t('audit.auditLog.recordType')}<Input value={type} onChange={e=>reset(setType)(e.target.value)} placeholder={t('audit.auditLog.eGExpense')}/></label>
   <label>{t('audit.auditLog.recordId')}<Input value={targetId} onChange={e=>reset(setTargetId)(e.target.value)}/></label>
   <label>{t('audit.auditLog.userId')}<Input inputMode="numeric" value={actor} onChange={e=>reset(setActor)(e.target.value)}/></label>
   <label>{t('common.from')}<Input type="date" value={from} onChange={e=>reset(setFrom)(e.target.value)}/></label>
   <label>{t('common.to')}<Input type="date" value={to} onChange={e=>reset(setTo)(e.target.value)}/></label>
  </div>
  {error&&<ErrorState message={error}/>}
  {data&&data.items.length===0&&<EmptyState title={t('audit.auditLog.noEventsMatchThese')}/>}
  {data&&data.items.length>0&&<div className="billing-table audit-table" role="table" aria-label={t('audit.auditLog.auditEvents')}>
   <div role="row" className="head"><span>{t('common.when')}</span><span>{t('audit.auditLog.action')}</span><span>{t('common.record')}</span><span>{t('audit.auditLog.user')}</span><span>{t('common.reason')}</span></div>
   {data.items.map(e=><div key={e.id}>
    <div role="row" className="clickable" tabIndex={0} aria-expanded={openRow===e.id} onClick={()=>setOpenRow(openRow===e.id?null:e.id)} onKeyDown={x=>{if(x.key==='Enter')setOpenRow(openRow===e.id?null:e.id)}}><span>{e.at.slice(0,16).replace('T',' ')}</span><span><b>{auditActionLabel(e.action)}</b></span><span>{auditTargetLabel(e.target_type)} {e.target_id}</span><span>{e.actor_id?t('audit.user',{id: e.actor_id}):t('audit.system')}</span><span>{e.reason||'-'}</span></div>
    {openRow===e.id&&<div className="audit-detail"><div><h4>{t('audit.auditLog.before')}</h4><pre>{show(e.before)}</pre></div><div><h4>{t('audit.auditLog.after')}</h4><pre>{show(e.after)}</pre></div><small>{t('audit.request',{id: e.request_id||'-'})}{e.ip?` · ${e.ip}`:''}</small></div>}
   </div>)}
  </div>}
  {data&&<div className="audit-pager"><span>{t('audit.pager',{count: data.count, page: current+1, pages})}</span>
   <Button variant="outline" size="sm" disabled={current===0} onClick={()=>setPage(current-1>0?String(current-1):'')}>{t('audit.auditLog.previous')}</Button>
   <Button variant="outline" size="sm" disabled={current+1>=pages} onClick={()=>setPage(String(current+1))}>{t('audit.auditLog.next')}</Button></div>}
 </Card>;
}
