"use client";
import {useEffect,useState} from 'react';
import {apiRequest,apiUpload,livePost} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {ErrorState} from '@/components/shared/error-state';
import {t,fmtNumber} from '@/lib/copy';
import {partyLabel} from '@/lib/copy/labels';

type Side='customer'|'owner'|'driver';
const kindsList=():[string,string,string][]=>[
 ['charge',t('charge.kind.charge'),t('charge.kind.chargeHelp')],
 ['credit',t('charge.kind.credit'),t('charge.kind.creditHelp')],
 ['adjustment',t('charge.kind.adjustment'),t('charge.kind.adjustmentHelp')],
 ['reimbursement',t('charge.kind.reimbursement'),t('charge.kind.reimbursementHelp')],
 ['opening_balance',t('charge.kind.openingBalance'),t('charge.kind.openingBalanceHelp')],
 ['overtime',t('charge.kind.overtime'),t('charge.kind.overtimeHelp')],
 ['absence_deduction',t('charge.kind.absence'),t('charge.kind.absenceHelp')],
 ['fine',t('charge.kind.fine'),t('charge.kind.fineHelp')],
];
/** Kinds that need a reason, may carry a proof file and can be priced as quantity x rate. */
const extra=['overtime','absence_deduction','fine'];
const priced=['overtime','absence_deduction'];
const sidesFor=(kind:string,hasDriver:boolean,driverOnly=false):[Side,string][]=>{
 if(driverOnly)return [['driver',t('charge.side.driver')]];   // a standalone driver agreement has no customer or owner side
 const all:[Side,string][]=[['customer',t('charge.side.customer')],['owner',t('charge.side.owner')],['driver',t('charge.side.driver')]];
 const allowed:Record<string,Side[]>={overtime:['customer'],absence_deduction:['driver'],fine:['customer','driver']};
 return all.filter(([s])=>(allowed[kind]?allowed[kind].includes(s):true)&&(s!=='driver'||hasDriver));
};
const taka=(n:number)=>'৳'+fmtNumber(n);

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

 const kindInfo=kindsList().find(k=>k[0]===kind)!;
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
  ?(effective==='increase'?t('charge.customerMore'):t('charge.customerLess'))
  :(effective==='increase'?t('charge.youOweMore',{side: partyLabel(side).toLowerCase()}):t(side==='driver'&&isExtra?'charge.youOweLessSalary':'charge.youOweLess',{side: partyLabel(side).toLowerCase()}));

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
    catch(e){note=t('charge.proofFailed',{reason: (e as Error).message})}
   }
   onDone(t('charge.saved',{kind: kindInfo[1], amount: taka(total), consequence, note}));
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };

 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader>
    <DialogTitle>{t('billing.chargeDialog.addAChargeCredit')}</DialogTitle>
    <DialogDescription>{t('charge.savedNote')}</DialogDescription>
   </DialogHeader>
   <div className="entry-form">
    <label>{t('common.kindOf')}
     <Select value={kind} onValueChange={changeKind}><SelectTrigger aria-label={t('common.type')}><SelectValue/></SelectTrigger><SelectContent>{kindsList().filter(([k])=>(hasDriver||k!=='absence_deduction')&&!(driverOnly&&(k==='overtime'||k==='reimbursement'||k==='opening_balance'))).map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
     <small className="hint">{kindInfo[2]}</small>
    </label>
    {sides.length>1&&<label>{t('common.appliesTo')}
     <Select value={side} onValueChange={v=>setSide(v as Side)}><SelectTrigger aria-label={t('billing.chargeDialog.appliesTo')}><SelectValue/></SelectTrigger><SelectContent>{sides.map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
    </label>}
    {!hasDriver&&<p className="note">{t('billing.chargeDialog.thisAgreementHasNo')}</p>}
    {!fixed&&<label>{t('common.whatChanges')}
     <Select value={direction} onValueChange={setDirection}><SelectTrigger aria-label={t('common.effect')}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="increase">{t('billing.chargeDialog.increasesTheBalance')}</SelectItem><SelectItem value="decrease">{t('billing.chargeDialog.reducesTheBalance')}</SelectItem></SelectContent></Select>
    </label>}
    {isPriced
     ?<>
      <label>{unit?t('charge.quantityUnit',{unit}):kind==='absence_deduction'?t('charge.quantityDays'):t('charge.quantity')}<Input inputMode="decimal" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="0"/></label>
      <label>{t('charge.ratePer',{unit: unit||(kind==='absence_deduction'?t('charge.unitDay'):t('charge.unitUnit'))})}<Input inputMode="decimal" value={rate} onChange={e=>{setRate(e.target.value);setRateTouched(true)}} placeholder={kind==='overtime'?t('charge.rateOvertime'):t('charge.rateSalary')}/></label>
      <p className="note" aria-live="polite">{computed>0?t('charge.amountLine',{quantity: Number(quantity), rate: taka(Number(rate)), total: taka(computed)}):t('billing.chargeDialog.enterAQuantityAnd')}</p>
     </>
     :<label>{t('common.amount2')}<Input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0"/></label>}
    <label>{isExtra?t('common.reasonRequired'):t('charge.description')}<Input value={description} onChange={e=>setDescription(e.target.value)} placeholder={isExtra?t('billing.chargeDialog.whyIsThisBeing'):t('billing.chargeDialog.whatIsThisFor')}/></label>
    <label>{t('billing.chargeDialog.referenceOptional')}<Input value={reference} onChange={e=>setReference(e.target.value)}/></label>
    {isExtra&&<label>{t('billing.chargeDialog.proofOptional')}<Input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={e=>setProof(e.target.files?.[0]??null)}/><small className="hint">{t('billing.chargeDialog.aTicketNoticeOr')}</small></label>}
    <p className="note" aria-live="polite">{valid?consequence:needsReason?t('billing.chargeDialog.aReasonIsRequired'):t('billing.chargeDialog.enterAnAmountTo')}</p>
    {isExtra&&<p className="note">{t('charge.largeNeedsAdmin')}</p>}
    {error&&<ErrorState message={error}/>}
    <div className="sheet-footer"><Button disabled={busy||!valid} onClick={()=>void submit()}>{t('charge.save',{kind: kindInfo[1].toLowerCase()})}</Button><Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button></div>
   </div>
  </DialogContent>
 </Dialog>;
}
