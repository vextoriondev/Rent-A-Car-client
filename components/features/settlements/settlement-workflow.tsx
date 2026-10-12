"use client";
import {useCallback,useEffect,useState} from 'react';
import {AlertTriangle,CheckCircle2,Circle,OctagonAlert} from 'lucide-react';
import {apiMode,apiRequest} from '@/lib/api';
import {monthLabel} from '@/lib/clock';
import {usePeriod} from '@/lib/period';
import {useRentflowStore} from '@/lib/store-context';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Money} from '@/components/shared/money';
import {ErrorState} from '@/components/shared/error-state';

export type SettlementState='draft'|'pending_approval'|'approved'|'closed'|'reopened';
export type SettlementRow={id:number;period_id:number;agreement_id:number;state:SettlementState;version:number;approved_at:string|null;closed_at:string|null;reopen_reason:string};
type Line={section:string;label:string;amount:string;source_type:string;source_id:string};
type Exception={code:string;severity:'blocking'|'warning';message:string;ref:string};
type Preview={ready:boolean;exceptions:Exception[];statement:{customer:{due:string};owner:{due:string};driver:{due:string};operator:{accrual_margin:string}}};

export const stateLabel:Record<SettlementState,string>={draft:'Draft',pending_approval:'Waiting for approval',approved:'Approved',closed:'Closed',reopened:'Reopened: needs a new approval'};
export const stateTone=(s?:SettlementState):'good'|'warn'|'blue'|'neutral'=>s==='closed'?'good':s==='approved'?'blue':s==='pending_approval'||s==='reopened'?'warn':'neutral';
const steps:[string,SettlementState[]][]=[['Prepared',['draft','reopened','pending_approval','approved','closed']],['Approval requested',['pending_approval','approved','closed']],['Approved',['approved','closed']],['Closed',['closed']]];
const sectionTitle:Record<string,string>={customer:'Customer',owner:'Owner',driver:'Driver',operator:'Operator'};

/** API mode: prepare, request approval, approve, close and reopen one agreement's month, with the readiness checks the server reports. */
export function SettlementWorkflow({agreementId,onClose,onChanged}:{agreementId:string|null;onClose:()=>void;onChanged:()=>void}){
 const rf=useRentflowStore();
 const period=usePeriod();
 const backend=rf.store.backend;
 const agreementPk=agreementId?Number(agreementId.replace('AGR-','')):0;
 const periodId=agreementId?backend?.periodIds[agreementId]:undefined;
 const [preview,setPreview]=useState<Preview|null>(null);
 const [settlement,setSettlement]=useState<(SettlementRow&{lines?:Line[]})|null>(null);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const [reason,setReason]=useState('');

 const load=useCallback(async()=>{
  if(!backend||!periodId)return;
  try{
   const pv:Preview=await apiRequest(`/orgs/${backend.orgId}/periods/${periodId}/settlement-preview`);
   const list=await apiRequest(`/orgs/${backend.orgId}/settlements?month=${rf.store.backend?.shownMonth??period.lastMonth}&limit=200`);
   const row:SettlementRow|undefined=list.items.find((x:SettlementRow)=>x.agreement_id===agreementPk);
   const full=row?await apiRequest(`/orgs/${backend.orgId}/settlements/${row.id}`):null;
   setPreview(pv);setSettlement(full);setError('');
  }catch(e){setError((e as Error).message)}
 },[backend,periodId,agreementPk]);
 useEffect(()=>{setPreview(null);setSettlement(null);setMessage('');setReason('');if(agreementId)void load()},[agreementId,load]);

 const act=async(path:string,done:string,body?:unknown)=>{
  if(!backend)return;
  setBusy(true);setMessage('');
  try{
   await apiRequest(`/orgs/${backend.orgId}${path}`,{method:'POST',...(body?{body:JSON.stringify(body)}:{})});
   await rf.refreshLive();await load();onChanged();setMessage(done);setReason('');
  }catch(e){setMessage((e as Error).message)}finally{setBusy(false)}
 };

 const state=settlement?.state;
 const blocking=preview?.exceptions.filter(e=>e.severity==='blocking')||[];
 const warnings=preview?.exceptions.filter(e=>e.severity==='warning')||[];
 const lineGroups=(settlement?.lines||[]).reduce<Record<string,Line[]>>((g,l)=>{(g[l.section]??=[]).push(l);return g},{});
 const drill=(l:Line)=>{if(l.source_type==='expense'){rf.setSelected('EXP-'+l.source_id);onClose()}};

 return <Dialog open={!!agreementId} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog settlement-dialog">
   <DialogHeader>
    <DialogTitle>Settlement for {agreementId}, {apiMode?monthLabel(rf.store.backend?.shownMonth??period.lastMonth):'September 2026'}</DialogTitle>
    <DialogDescription>Check readiness, then move it through approval to close. Anything posted after approval needs a fresh approval.</DialogDescription>
   </DialogHeader>
   {error&&<ErrorState message={error} onRetry={()=>void load()}/>}
   {!error&&!preview&&<p className="note">Loading the readiness checks...</p>}
   {preview&&<div className="entry-form">
    <div className="settlement-status">
     <Badge tone={stateTone(state)}>{state?stateLabel[state]:'Not prepared'}</Badge>
     {settlement&&settlement.version>1&&<small>Version {settlement.version}</small>}
     {state==='reopened'&&settlement?.reopen_reason&&<small>Reopened because: {settlement.reopen_reason}</small>}
    </div>
    <ol className="settlement-steps" aria-label="Settlement progress">{steps.map(([name,on],i)=>{const done=!!state&&on.includes(state);return <li key={name} className={done?'done':''}>{done?<CheckCircle2 size={15}/>:<Circle size={15}/>}<span>{i+1}. {name}</span></li>})}</ol>
    <div className="settlement-figures">
     <div><span>Customer due</span><b><Money value={Number(preview.statement.customer.due)}/></b></div>
     <div><span>Owner due</span><b><Money value={Number(preview.statement.owner.due)}/></b></div>
     <div><span>Driver due</span><b><Money value={Number(preview.statement.driver.due)}/></b></div>
    </div>

    {state!=='closed'&&<div>
     <h3 className="detail-subheading">Readiness</h3>
     {blocking.length===0&&warnings.length===0&&<p className="note"><CheckCircle2 size={14}/> Nothing is blocking this settlement.</p>}
     {blocking.map((e,i)=><p key={'b'+i} className="exception blocking" role="alert"><OctagonAlert size={15}/><span><b>Blocking:</b> {e.message}{e.ref&&` (${e.ref})`}</span></p>)}
     {warnings.map((e,i)=><p key={'w'+i} className="exception warning"><AlertTriangle size={15}/><span><b>Warning:</b> {e.message}{e.ref&&` (${e.ref})`}</span></p>)}
    </div>}

    {settlement&&state!=='draft'&&state!=='reopened'&&Object.keys(lineGroups).length>0&&<div>
     <h3 className="detail-subheading">Frozen statement lines</h3>
     {Object.entries(lineGroups).map(([section,rows])=><div key={section} className="settlement-lines">
      <h4>{sectionTitle[section]||section}</h4>
      {rows.map((l,i)=><div key={i} className={'settlement-line'+(l.label==='Due'?' total':'')}><span>{l.source_type==='expense'?<button type="button" className="text-button" onClick={()=>drill(l)}>{l.label}</button>:l.label}</span><b><Money value={Number(l.amount)} signed/></b></div>)}
     </div>)}
    </div>}

    {message&&<p role="status" className="note">{message}</p>}

    <div className="sheet-footer">
     {!settlement&&<Button disabled={busy} onClick={()=>void act(`/periods/${periodId}/settlement`,'Prepared.')}>Prepare settlement</Button>}
     {(state==='draft'||state==='reopened')&&<Button disabled={busy||blocking.length>0} onClick={()=>void act(`/settlements/${settlement!.id}/request-approval`,'Approval requested; the statement lines are now frozen.')}>Request approval</Button>}
     {state==='pending_approval'&&<Button disabled={busy} onClick={()=>void act(`/settlements/${settlement!.id}/approve`,'Approved.')}>Approve</Button>}
     {state==='approved'&&<Button disabled={busy} onClick={()=>void act(`/settlements/${settlement!.id}/close`,'Closed. The month no longer accepts new entries.')}>Close month</Button>}
     {blocking.length>0&&state!=='closed'&&<small className="hint">Resolve the blocking items to request approval.</small>}
    </div>

    {state==='closed'&&<div className="reopen-box">
     <h3 className="detail-subheading">Reopen</h3>
     <p className="note">Reopening is for admins, only for the latest closed month, and only before its balance was carried forward. A written reason is required and is kept in the audit log.</p>
     <label>Reason<Input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Why does this month need to be reopened?"/></label>
     <Button variant="outline" disabled={busy||!reason.trim()} onClick={()=>void act(`/settlements/${settlement!.id}/reopen`,'Reopened. Request approval again to close it.',{reason:reason.trim()})}>Reopen month</Button>
    </div>}
   </div>}
  </DialogContent>
 </Dialog>;
}
