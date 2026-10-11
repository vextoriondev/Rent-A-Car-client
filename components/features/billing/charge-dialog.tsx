"use client";
import {useEffect,useState} from 'react';
import {apiRequest,apiUpload,livePost} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {ErrorState} from '@/components/shared/error-state';

type Side='customer'|'owner'|'driver';
const kinds:[string,string,string][]=[
 ['charge','Charge','Extra amount the party owes more (e.g. late fee, extra km).'],
 ['credit','Credit','Reduces what the party owes (e.g. goodwill discount).'],
 ['adjustment','Adjustment','Correction in either direction; pick the effect below.'],
 ['reimbursement','Reimbursement','Bill a customer for a cost the operator fronted, or reduce an owner or driver payable for one.'],
 ['opening_balance','Opening balance','A balance that existed before this month, in either direction.'],
 ['overtime','Overtime','Extra hours or days the customer used: quantity x rate, added to the customer bill.'],
 ['absence_deduction','Absence deduction','Days the driver was absent: quantity x daily rate, taken off the salary.'],
 ['fine','Fine','A traffic or other fine charged to the customer, or deducted from the driver salary. A reason is required.'],
];
/** Kinds that need a reason, may carry a proof file and can be priced as quantity x rate. */
const extra=['overtime','absence_deduction','fine'];
const priced=['overtime','absence_deduction'];
const sidesFor=(kind:string,hasDriver:boolean,driverOnly=false):[Side,string][]=>{
 if(driverOnly)return [['driver','Driver']];   // a standalone driver agreement has no customer or owner side
 const all:[Side,string][]=[['customer','Customer'],['owner','Owner'],['driver','Driver']];
 const allowed:Record<string,Side[]>={overtime:['customer'],absence_deduction:['driver'],fine:['customer','driver']};
 return all.filter(([s])=>(allowed[kind]?allowed[kind].includes(s):true)&&(s!=='driver'||hasDriver));
};
const taka=(n:number)=>'৳'+n.toLocaleString('en-BD');

/** Posts one charge, credit, adjustment, reimbursement, opening balance, overtime, absence deduction or fine to the month (POST /charges, one idempotency key per attempt). */
export function ChargeDialog({open,periodId,hasDriver=true,driverOnly=false,onClose,onDone}:{open:boolean;periodId:number;hasDriver?:boolean;/** A standalone driver agreement's month: only the driver side exists */driverOnly?:boolean;onClose:()=>void;onDone:(message:string)=>void}){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const [side,setSide]=useState<Side>('customer');
 const [kind,setKind]=useState('charge');
 const [direction,setDirection]=useState('increase');
 const [amount,setAmount]=useState('');
 const [quantity,setQuantity]=useState('');
 const [rate,setRate]=useState('');
 const [rateTouched,setRateTouched]=useState(false);
 const [unit,setUnit]=useState('');
 const [description,setDescription]=useState('');
 const [reference,setReference]=useState('');
 const [proof,setProof]=useState<File|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [key,setKey]=useState('');
 useEffect(()=>{if(open){setSide(driverOnly?'driver':'customer');setKind('charge');setDirection('increase');setAmount('');setQuantity('');setRate('');setRateTouched(false);setUnit('');setDescription('');setReference('');setProof(null);setError('');setKey(crypto.randomUUID())}},[open]);

 const kindInfo=kinds.find(k=>k[0]===kind)!;
 const isExtra=extra.includes(kind);
 const isPriced=priced.includes(kind);
 const sides=sidesFor(kind,hasDriver,driverOnly);
 const changeKind=(k:string)=>{setKind(k);setRateTouched(false);setRate('');setUnit('');const allowed=sidesFor(k,hasDriver,driverOnly);if(!allowed.some(([s])=>s===side))setSide(allowed[0][0])};

 // the server suggests a rate from the agreement terms (overtime) or the driver salary (absence); the user can overwrite it
 useEffect(()=>{
  if(!open||!orgId||!isPriced||!(Number(quantity)>0))return;
  let stale=false;
  apiRequest(`/orgs/${orgId}/periods/${periodId}/charge-suggestion?kind=${kind}&quantity=${encodeURIComponent(quantity)}`).then(s=>{if(stale)return;setUnit(s.unit||'');if(!rateTouched&&s.unit_rate)setRate(String(Number(s.unit_rate)))}).catch(()=>undefined);
  return()=>{stale=true};
 },[open,orgId,periodId,kind,quantity,isPriced,rateTouched]);

 const fixed=kind==='charge'||kind==='overtime'?'increase':kind==='credit'||kind==='absence_deduction'?'decrease':kind==='fine'?(side==='customer'?'increase':'decrease'):'';
 const effective=fixed||direction;
 const computed=isPriced&&Number(quantity)>0&&Number(rate)>0?Math.round(Number(quantity)*Number(rate)*100)/100:0;
 const total=isPriced?computed:Number(amount);
 const needsReason=isExtra&&!description.trim();
 const valid=total>0&&!needsReason;
 const consequence=side==='customer'
  ?(effective==='increase'?'The customer will owe more.':'The customer will owe less.')
  :(effective==='increase'?`We will owe the ${side} more.`:`We will owe the ${side} less${side==='driver'&&isExtra?': it comes off the salary':''}.`);

 const submit=async()=>{
  if(!orgId)return;
  setBusy(true);setError('');
  try{
   const body:Record<string,unknown>={period_id:periodId,side,kind,description:description.trim(),reference:reference.trim()};
   if(isPriced){body.quantity=String(Number(quantity));body.unit_rate=String(Number(rate))}
   else body.amount=String(Number(amount));
   if(!isExtra)body.direction=effective;
   const saved=await livePost(orgId,'/charges',body,key);
   let note='';
   if(proof){
    try{const form=new FormData();form.append('target_type','charge');form.append('target_id',String(saved.id));form.append('file',proof);await apiUpload(`/orgs/${orgId}/documents`,form)}
    catch(e){note=` The proof file was not attached: ${(e as Error).message}`}
   }
   onDone(`${kindInfo[1]} of ${taka(total)} posted. ${consequence}${note}`);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };

 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader>
    <DialogTitle>Add a charge, credit or adjustment</DialogTitle>
    <DialogDescription>It is posted to this month and cannot be edited later; correct a mistake with an opposite entry.</DialogDescription>
   </DialogHeader>
   <div className="entry-form">
    <label>Type
     <Select value={kind} onValueChange={changeKind}><SelectTrigger aria-label="Type"><SelectValue/></SelectTrigger><SelectContent>{kinds.filter(([k])=>(hasDriver||k!=='absence_deduction')&&!(driverOnly&&(k==='overtime'||k==='reimbursement'||k==='opening_balance'))).map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
     <small className="hint">{kindInfo[2]}</small>
    </label>
    {sides.length>1&&<label>Applies to
     <Select value={side} onValueChange={v=>setSide(v as Side)}><SelectTrigger aria-label="Applies to"><SelectValue/></SelectTrigger><SelectContent>{sides.map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
    </label>}
    {!hasDriver&&<p className="note">This agreement has no driver, so driver charges are not offered.</p>}
    {!fixed&&<label>Effect
     <Select value={direction} onValueChange={setDirection}><SelectTrigger aria-label="Effect"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="increase">Increases the balance</SelectItem><SelectItem value="decrease">Reduces the balance</SelectItem></SelectContent></Select>
    </label>}
    {isPriced
     ?<>
      <label>Quantity{unit?` (${unit}s)`:kind==='absence_deduction'?' (days)':''}<Input inputMode="decimal" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="0"/></label>
      <label>Rate per {unit||(kind==='absence_deduction'?'day':'unit')} (৳)<Input inputMode="decimal" value={rate} onChange={e=>{setRate(e.target.value);setRateTouched(true)}} placeholder={kind==='overtime'?'Set an overtime rate in the terms, or type one':'Salary / days in the month'}/></label>
      <p className="note" aria-live="polite">{computed>0?`Amount: ${Number(quantity)} x ${taka(Number(rate))} = ${taka(computed)}`:'Enter a quantity and a rate to see the amount.'}</p>
     </>
     :<label>Amount (৳)<Input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0"/></label>}
    <label>{isExtra?'Reason (required)':'Description'}<Input value={description} onChange={e=>setDescription(e.target.value)} placeholder={isExtra?'Why is this being charged?':'What is this for?'}/></label>
    <label>Reference (optional)<Input value={reference} onChange={e=>setReference(e.target.value)}/></label>
    {isExtra&&<label>Proof (optional)<Input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={e=>setProof(e.target.files?.[0]??null)}/><small className="hint">A ticket, notice or photo. PDF, PNG, JPEG or WebP, up to 10 MB.</small></label>}
    <p className="note" aria-live="polite">{valid?consequence:needsReason?'A reason is required for this kind.':'Enter an amount to see the effect.'}</p>
    {total>=5000&&isExtra&&<p className="note">Charges of ৳5,000 or more need an administrator to post them.</p>}
    {error&&<ErrorState message={error}/>}
    <div className="sheet-footer"><Button disabled={busy||!valid} onClick={()=>void submit()}>Post {kindInfo[1].toLowerCase()}</Button><Button variant="outline" onClick={onClose}>Cancel</Button></div>
   </div>
  </DialogContent>
 </Dialog>;
}
