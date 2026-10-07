"use client";
import {useEffect,useState} from 'react';
import {livePost} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {ErrorState} from '@/components/shared/error-state';

const kinds:[string,string,string][]=[
 ['charge','Charge','Extra amount the party owes more (e.g. late fee, extra km).'],
 ['credit','Credit','Reduces what the party owes (e.g. goodwill discount).'],
 ['adjustment','Adjustment','Correction in either direction; pick the effect below.'],
 ['reimbursement','Reimbursement','Bill a customer for a cost the operator fronted, or reduce an owner or driver payable for one.'],
 ['opening_balance','Opening balance','A balance that existed before this month, in either direction.'],
];
const sides:[string,string][]=[['customer','Customer'],['owner','Owner'],['driver','Driver']];

/** Posts one charge, credit, adjustment, reimbursement or opening balance to the month (POST /charges, one idempotency key per attempt). */
export function ChargeDialog({open,periodId,onClose,onDone}:{open:boolean;periodId:number;onClose:()=>void;onDone:(message:string)=>void}){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const [side,setSide]=useState('customer');
 const [kind,setKind]=useState('charge');
 const [direction,setDirection]=useState('increase');
 const [amount,setAmount]=useState('');
 const [description,setDescription]=useState('');
 const [reference,setReference]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [key,setKey]=useState('');
 useEffect(()=>{if(open){setSide('customer');setKind('charge');setDirection('increase');setAmount('');setDescription('');setReference('');setError('');setKey(crypto.randomUUID())}},[open]);

 const kindInfo=kinds.find(k=>k[0]===kind)!;
 const fixed=kind==='charge'?'increase':kind==='credit'?'decrease':'';
 const effective=fixed||direction;
 const valid=Number(amount)>0;
 const consequence=side==='customer'
  ?(effective==='increase'?'The customer will owe more.':'The customer will owe less.')
  :(effective==='increase'?`We will owe the ${side} more.`:`We will owe the ${side} less.`);

 const submit=async()=>{
  if(!orgId)return;
  setBusy(true);setError('');
  try{
   await livePost(orgId,'/charges',{period_id:periodId,side,kind,amount:String(Number(amount)),direction:effective,description:description.trim(),reference:reference.trim()},key);
   onDone(`${kindInfo[1]} of ৳${Number(amount).toLocaleString('en-BD')} posted. ${consequence}`);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };

 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader>
    <DialogTitle>Add a charge, credit or adjustment</DialogTitle>
    <DialogDescription>It is posted to this month and cannot be edited later; correct a mistake with an opposite entry.</DialogDescription>
   </DialogHeader>
   <div className="entry-form">
    <label>Applies to
     <Select value={side} onValueChange={setSide}><SelectTrigger aria-label="Applies to"><SelectValue/></SelectTrigger><SelectContent>{sides.map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
    </label>
    <label>Type
     <Select value={kind} onValueChange={setKind}><SelectTrigger aria-label="Type"><SelectValue/></SelectTrigger><SelectContent>{kinds.map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
     <small className="hint">{kindInfo[2]}</small>
    </label>
    {!fixed&&<label>Effect
     <Select value={direction} onValueChange={setDirection}><SelectTrigger aria-label="Effect"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="increase">Increases the balance</SelectItem><SelectItem value="decrease">Reduces the balance</SelectItem></SelectContent></Select>
    </label>}
    <label>Amount (৳)<Input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0"/></label>
    <label>Description<Input value={description} onChange={e=>setDescription(e.target.value)} placeholder="What is this for?"/></label>
    <label>Reference (optional)<Input value={reference} onChange={e=>setReference(e.target.value)}/></label>
    <p className="note" aria-live="polite">{valid?consequence:'Enter an amount to see the effect.'}</p>
    {error&&<ErrorState message={error}/>}
    <div className="sheet-footer"><Button disabled={busy||!valid} onClick={()=>void submit()}>Post {kindInfo[1].toLowerCase()}</Button><Button variant="outline" onClick={onClose}>Cancel</Button></div>
   </div>
  </DialogContent>
 </Dialog>;
}
