"use client";
import {useEffect,useState} from 'react';
import {apiRequest,livePost} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {ErrorState} from '@/components/shared/error-state';
import {Money} from '@/components/shared/money';

/** One customer payment split across several obligations of the month (rent and extra charges), each capped at what is still open (GET /periods/{id}/obligations). The server still enforces it and its message is shown as is. */
type Target={obligation_id:number;description:string;amount:string;open_amount:string};

export function SplitPaymentDialog({open,periodId,onClose,onDone}:{open:boolean;periodId:number;onClose:()=>void;onDone:(message:string)=>void}){
 const rf=useRentflowStore();
 const backend=rf.store.backend;
 const [targets,setTargets]=useState<Target[]|null>(null);
 const [parts,setParts]=useState<Record<number,string>>({});
 const [reference,setReference]=useState('');
 const [date,setDate]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [key,setKey]=useState('');
 useEffect(()=>{if(open){setParts({});setTargets(null);setReference('');setDate(new Date().toISOString().slice(0,10));setError('');setKey(crypto.randomUUID());if(backend)apiRequest(`/orgs/${backend.orgId}/periods/${periodId}/obligations?side=customer`).then(setTargets).catch(e=>setError((e as Error).message))}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[open,periodId]);

 const list=targets||[];
 const rows=list.map(t=>({id:t.obligation_id,open:Number(t.open_amount),part:Number(parts[t.obligation_id]||0)})).filter(t=>t.part>0);
 const over=rows.some(r=>r.part>r.open);
 const total=rows.reduce((s,r)=>s+r.part,0);
 const submit=async()=>{
  if(!backend)return;
  setBusy(true);setError('');
  try{
   await livePost(backend.orgId,'/payments',{kind:'customer_payment',amount:String(total),reference:reference.trim(),method:'bank',event_date:date,allocations:rows.map(r=>({obligation_id:r.id,amount:String(r.part)}))},key);
   onDone(`Payment of ৳${total.toLocaleString('en-BD')} split across ${rows.length} item${rows.length>1?'s':''}.`);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };

 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader>
    <DialogTitle>Split a customer payment</DialogTitle>
    <DialogDescription>Enter how much of the payment goes to each item. The payment total is the sum of the parts.</DialogDescription>
   </DialogHeader>
   <div className="entry-form">
    {!targets&&!error&&<p className="note">Loading what is still open...</p>}
    {targets&&targets.length===0&&<p className="note">Nothing is open to pay on this month.</p>}
    {list.map(t=>{const id=t.obligation_id,open=Number(t.open_amount);return <label key={id}>{t.description} <small className="hint">(billed <Money value={Number(t.amount)}/>, open <Money value={open}/>)</small>
     <Input inputMode="decimal" value={parts[id]||''} disabled={open<=0} onChange={e=>setParts(p=>({...p,[id]:e.target.value}))} placeholder="0" aria-label={`Amount for ${t.description}`}/></label>})}
    <label>Payment reference<Input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Bank or mobile money reference"/></label>
    <label>Date<Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    <p className="note" aria-live="polite">Payment total: <b><Money value={total}/></b>{rows.length>1&&` across ${rows.length} items`}</p>
    {over&&<p className="form-error" role="alert">One of the amounts is more than what is still open on that item.</p>}
    {error&&<ErrorState message={error}/>}
    <div className="sheet-footer"><Button disabled={busy||over||total<=0||!reference.trim()||!date} onClick={()=>void submit()}>Record split payment</Button><Button variant="outline" onClick={onClose}>Cancel</Button></div>
   </div>
  </DialogContent>
 </Dialog>;
}
