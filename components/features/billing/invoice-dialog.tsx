"use client";
import {useCallback,useEffect,useState} from 'react';
import {apiRequest,livePost} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {ErrorState} from '@/components/shared/error-state';
import {Money} from '@/components/shared/money';

type Line={obligation_id:number;kind:string;description:string;amount:string};
type Preview={lines:Line[];total:string};

/** Preview what an invoice would contain, tick the lines to include, then issue it (POST /invoices). Carried-out lines are never invoiced. */
export function InvoiceDialog({open,periodId,onClose,onDone}:{open:boolean;periodId:number;onClose:()=>void;onDone:(message:string)=>void}){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const [preview,setPreview]=useState<Preview|null>(null);
 const [picked,setPicked]=useState<number[]>([]);
 const [dueDate,setDueDate]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [key,setKey]=useState('');

 const load=useCallback(async()=>{
  if(!orgId)return;
  try{const p:Preview=await apiRequest(`/orgs/${orgId}/periods/${periodId}/invoice-preview`);setPreview(p);setPicked(p.lines.map(l=>l.obligation_id));setError('')}
  catch(e){setError((e as Error).message)}
 },[orgId,periodId]);
 useEffect(()=>{if(open){setPreview(null);setDueDate('');setError('');setKey(crypto.randomUUID());void load()}},[open,load]);

 const total=(preview?.lines||[]).filter(l=>picked.includes(l.obligation_id)).reduce((t,l)=>t+Number(l.amount),0);
 const toggle=(id:number)=>setPicked(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
 const issue=async()=>{
  if(!orgId)return;
  setBusy(true);setError('');
  try{
   const inv=await livePost(orgId,'/invoices',{period_id:periodId,obligation_ids:picked,...(dueDate?{due_date:dueDate}:{})},key);
   onDone(`${inv.number} issued for ৳${Number(inv.amount).toLocaleString('en-BD')}.`);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };

 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader>
    <DialogTitle>Issue an invoice</DialogTitle>
    <DialogDescription>Only customer amounts that are not already on a live invoice are listed. An invoice posts nothing new; it groups what is already owed.</DialogDescription>
   </DialogHeader>
   <div className="entry-form">
    {!preview&&!error&&<p className="note">Loading the preview...</p>}
    {preview&&preview.lines.length===0&&<p className="note">Nothing left to invoice for this month.</p>}
    {preview&&preview.lines.length>0&&<div className="statement-lines">
     {preview.lines.map(l=><label key={l.obligation_id} className="check-row"><input type="checkbox" checked={picked.includes(l.obligation_id)} onChange={()=>toggle(l.obligation_id)}/><span>{l.description}</span><b className="nums"><Money value={Number(l.amount)} signed/></b></label>)}
     <div className="total"><span>Invoice total</span><b className="nums"><Money value={total}/></b></div>
    </div>}
    <label>Due date (optional, default 15 days)<Input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label>
    {error&&<ErrorState message={error}/>}
    <div className="sheet-footer"><Button disabled={busy||picked.length===0||total<=0} onClick={()=>void issue()}>Issue invoice</Button><Button variant="outline" onClick={onClose}>Cancel</Button></div>
   </div>
  </DialogContent>
 </Dialog>;
}
