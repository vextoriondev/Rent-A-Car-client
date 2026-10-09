"use client";
import {useEffect,useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {entryCategories,entryDefaults,entrySchema,entryTypes,parties,type EntryFormValues} from '@/lib/forms';
import type {EntryType} from '@/lib/demo';
import {useRentflowStore} from '@/lib/store-context';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Form,FormControl,FormField,FormItem,FormLabel,FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {ReceiptAndCase} from '@/components/features/entries/receipt-and-case';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {apiMode} from '@/lib/api';
import {useExpenseCategories} from '@/lib/use-expense-categories';
import {EntryConsequencePreview} from '@/components/shared/entry-consequence-preview';
import {} from '@/lib/roles';
import {useCan} from '@/lib/roles';

const emptyForm=entryDefaults('Expense');

export function RecordEntryDialog(){
 const canPay=useCan('payment.post');
 const rf=useRentflowStore();
 const {store}=rf;
 const form=useForm<EntryFormValues>({resolver:zodResolver(entrySchema),defaultValues:emptyForm});
 const [formError,setFormError]=useState('');
 const [file,setFile]=useState<File|null>(null);
 const [caseId,setCaseId]=useState('');
 const {entryOpen,entryInit}=rf;

 useEffect(()=>{
  if(!entryOpen)return;
  form.reset(entryDefaults(entryInit.type,store.agreements.find(a=>a.id===entryInit.agreementId)));
  setFormError('');setFile(null);setCaseId('');
  // Reset only when the dialog is (re)opened, not whenever the store changes underneath it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[entryOpen,entryInit]);

 const v=form.watch();
 const chosen=store.agreements.find(a=>a.id===v.agreementId);
 const amount=Math.round(Number(v.amount));
 const isExpense=v.type==='Expense';
 // API mode: expenses offer the server's active categories (value = code); everything else keeps the fixed labels.
 const {categories:serverCategories,reload:reloadCategories}=useExpenseCategories();
 useEffect(()=>{if(entryOpen)void reloadCategories()},[entryOpen,reloadCategories]);
 const serverExpense=apiMode&&isExpense&&!!serverCategories?.length;
 const categoryOptions=serverExpense?serverCategories!.filter(c=>c.active).map(c=>({value:c.code,label:c.name})):entryCategories.map(x=>({value:x,label:x}));
 useEffect(()=>{
  if(serverExpense&&!categoryOptions.some(o=>o.value===v.category))form.setValue('category',categoryOptions.find(o=>o.value==='repair')?.value??categoryOptions[0]?.value??'');
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[serverExpense,v.category,serverCategories]);

 const changeType=(next:EntryType)=>{
  form.setValue('type',next);
  form.setValue('category',next==='Expense'?'Repair':'Rent');
  form.setValue('payer',next==='Customer payment'?chosen?.customer||'Customer':'Operator');
  setFormError('');
 };

 const submit=form.handleSubmit(async values=>{
  setFormError('');
  const error=await rf.submitEntry(values,{file,maintenanceCaseId:caseId?Number(caseId):undefined});
  if(error)setFormError(error);
 });
 const saveDraft=form.handleSubmit(async values=>{
  setFormError('');
  const error=await rf.submitEntry(values,{draft:true,file,maintenanceCaseId:caseId?Number(caseId):undefined});
  if(error)setFormError(error);
 });
 // The server explains what it needs; reveal only the matching extra field.
 const askDuplicate=formError.startsWith('Possible duplicate');
 const askOverride=/rule differs|requires permission/.test(formError)||v.overrideReason!=='';
 const askLate=formError.includes('late_entry=true')||v.lateEntry;

 return <Dialog open={entryOpen} onOpenChange={rf.setEntryOpen}>
  <DialogContent className="entry-dialog">
   <DialogHeader><DialogTitle>Record financial entry</DialogTitle><DialogDescription>Review who paid, who owes and the effect on balances.</DialogDescription></DialogHeader>
   <Form {...form}>
    <form onSubmit={submit} noValidate>
     <div className="entry-form">
      <div className="form-grid">
       <FormField control={form.control} name="type" render={({field})=><FormItem><FormLabel>Entry type</FormLabel><Select value={field.value} onValueChange={x=>changeType(x as EntryType)}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{entryTypes.filter(x=>x==='Expense'||canPay).map(x=><SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>}/>
       <FormField control={form.control} name="agreementId" render={({field})=><FormItem><FormLabel>Agreement</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{store.agreements.map(a=><SelectItem key={a.id} value={a.id}>{a.id} · {a.vehicle}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>}/>
       <FormField control={form.control} name="amount" render={({field})=><FormItem><FormLabel>Amount (BDT)</FormLabel><FormControl><Input {...field} type="number" inputMode="numeric" min="1" step="1" placeholder="e.g. 8,000"/></FormControl><FormMessage/></FormItem>}/>
       <FormField control={form.control} name="date" render={({field})=><FormItem><FormLabel>Event date</FormLabel><FormControl><Input {...field} type="date"/></FormControl><FormMessage/></FormItem>}/>
       <FormField control={form.control} name="category" render={({field})=><FormItem><FormLabel>Category</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{categoryOptions.map(o=><SelectItem value={o.value} key={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>}/>
       <FormField control={form.control} name="reference" render={({field})=><FormItem><FormLabel>Reference</FormLabel><FormControl><Input {...field} placeholder="Receipt / bank reference"/></FormControl><FormMessage/></FormItem>}/>
       {isExpense&&<>
        <FormField control={form.control} name="payer" render={({field})=><FormItem><FormLabel>Paid by</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{parties.map(x=><SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>}/>
        <FormField control={form.control} name="liable" render={({field})=><FormItem><FormLabel>Ultimately responsible</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{parties.map(x=><SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>}/>
       </>}
      </div>
      <FormField control={form.control} name="description" render={({field})=><FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} placeholder="What happened?"/></FormControl><FormMessage/></FormItem>}/>
      {isExpense&&<>
       <FormField control={form.control} name="offset" render={({field})=><FormItem><label className="check-label"><Checkbox checked={field.value} onCheckedChange={c=>field.onChange(c===true)} disabled={v.liable!=='Owner'||v.payer!=='Operator'||!chosen?.rules.offset}/> Deduct an operator funded owner cost from owner rent (if authorized)</label></FormItem>}/>
       {apiMode&&<ReceiptAndCase agreementId={v.agreementId} file={file} onFile={setFile} caseId={caseId} onCase={setCaseId}/>}
       {apiMode?<FormField control={form.control} name="receiptRef" render={({field})=><FormItem><FormLabel>Receipt reference</FormLabel><FormControl><Input {...field} placeholder="Receipt or bill number (required for some categories)"/></FormControl></FormItem>}/>
       :<FormField control={form.control} name="receipt" render={({field})=><FormItem><FormLabel>Receipt or proof</FormLabel><FormControl><Input key={field.value} type="file" accept="image/*,.pdf" onChange={e=>field.onChange(e.target.files?.[0]?.name||'')}/></FormControl></FormItem>}/>}
       {askDuplicate&&<FormField control={form.control} name="duplicateReason" render={({field})=><FormItem><FormLabel>Why record this possible duplicate anyway?</FormLabel><FormControl><Input {...field} placeholder="Reason (required to record it)"/></FormControl></FormItem>}/>}
       {askOverride&&<FormField control={form.control} name="overrideReason" render={({field})=><FormItem><FormLabel>Override the agreement rule: reason</FormLabel><FormControl><Input {...field} placeholder="Admin or accountant only; the entry then needs approval"/></FormControl></FormItem>}/>}
       {askLate&&<FormField control={form.control} name="lateEntry" render={({field})=><FormItem><label className="check-label"><Checkbox checked={field.value} onCheckedChange={c=>field.onChange(c===true)}/> Post to the next month as an adjustment (this month is closed)</label></FormItem>}/>}
       {v.receipt&&<button type="button" className="remove-receipt" onClick={()=>form.setValue('receipt','')}>Remove {v.receipt} ×</button>}
      </>}
      <EntryConsequencePreview agreement={chosen} type={v.type} amount={amount} payer={v.payer} liable={v.liable} offset={v.offset}/>
      {formError&&<p role="alert" className="form-error">{formError}</p>}
     </div>
     <DialogFooter><Button type="button" variant="outline" onClick={()=>rf.setEntryOpen(false)}>Cancel</Button>{apiMode&&isExpense&&<Button type="button" variant="outline" disabled={rf.apiBusy} onClick={()=>void saveDraft()}>Save as draft</Button>}<Button type="submit" disabled={rf.apiBusy}>{rf.apiBusy?'Saving...':'Save entry'}</Button></DialogFooter>
    </form>
   </Form>
  </DialogContent>
 </Dialog>;
}
