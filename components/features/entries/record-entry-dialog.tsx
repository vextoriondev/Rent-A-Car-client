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
import {t} from '@/lib/copy';
import {categoryLabel,categoryName,entryTypeLabel,partyLabel} from '@/lib/copy/labels';

const emptyForm=entryDefaults('Expense');

export function RecordEntryDialog(){
 const canPay=useCan('payment.post');
 const rf=useRentflowStore();
 const {store}=rf;
 const form=useForm<EntryFormValues>({resolver:zodResolver(entrySchema),defaultValues:emptyForm});
 const [formError,setFormError]=useState('');
 const [formCode,setFormCode]=useState('');
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
 const categoryOptions=serverExpense?serverCategories!.filter(c=>c.active).map(c=>({value:c.code,label:categoryName(c.code,c.name)})):entryCategories.map(x=>({value:x,label:categoryLabel(x)}));
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
  if(error){setFormError(error);setFormCode(rf.lastErrorCode.current)}
 });
 const saveDraft=form.handleSubmit(async values=>{
  setFormError('');
  const error=await rf.submitEntry(values,{draft:true,file,maintenanceCaseId:caseId?Number(caseId):undefined});
  if(error){setFormError(error);setFormCode(rf.lastErrorCode.current)}
 });
 // The server explains what it needs; reveal only the matching extra field.
 const askDuplicate=formCode==='possible_duplicate'||v.duplicateReason!=='';
 const askOverride=formCode==='expense_rule_differs'||formCode==='override_needs_permission'||v.overrideReason!=='';
 const askLate=formCode==='period_closed_late_entry'||v.lateEntry;

 return <Dialog open={entryOpen} onOpenChange={rf.setEntryOpen}>
  <DialogContent className="entry-dialog">
   <DialogHeader><DialogTitle>{t('entries.recordEntryDialog.recordFinancialEntry')}</DialogTitle><DialogDescription>{t('entries.recordEntryDialog.reviewWhoPaidWho')}</DialogDescription></DialogHeader>
   <Form {...form}>
    <form onSubmit={submit} noValidate>
     <div className="entry-form">
      <div className="form-grid">
       <FormField control={form.control} name="type" render={({field})=><FormItem><FormLabel>{t('entries.recordEntryDialog.entryType')}</FormLabel><Select value={field.value} onValueChange={x=>changeType(x as EntryType)}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{entryTypes.filter(x=>x==='Expense'||canPay).map(x=><SelectItem value={x} key={x}>{entryTypeLabel(x)}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>}/>
       <FormField control={form.control} name="agreementId" render={({field})=><FormItem><FormLabel>{t('common.agreement')}</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{store.agreements.map(a=><SelectItem key={a.id} value={a.id}>{a.id} · {a.vehicle}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>}/>
       <FormField control={form.control} name="amount" render={({field})=><FormItem><FormLabel>{t('entries.recordEntryDialog.amountBdt')}</FormLabel><FormControl><Input {...field} type="text" inputMode="numeric" placeholder={t('entry.amountExample')}/></FormControl><FormMessage/></FormItem>}/>
       <FormField control={form.control} name="date" render={({field})=><FormItem><FormLabel>{t('entries.recordEntryDialog.eventDate')}</FormLabel><FormControl><Input {...field} type="date"/></FormControl><FormMessage/></FormItem>}/>
       <FormField control={form.control} name="category" render={({field})=><FormItem><FormLabel>{t('common.category')}</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{categoryOptions.map(o=><SelectItem value={o.value} key={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>}/>
       <FormField control={form.control} name="reference" render={({field})=><FormItem><FormLabel>{t('common.reference')}</FormLabel><FormControl><Input {...field} placeholder={t('entries.recordEntryDialog.receiptBankReference')}/></FormControl><FormMessage/></FormItem>}/>
       {isExpense&&<>
        <FormField control={form.control} name="payer" render={({field})=><FormItem><FormLabel>{t('common.paidBy')}</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{parties.map(x=><SelectItem value={x} key={x}>{partyLabel(x)}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>}/>
        <FormField control={form.control} name="liable" render={({field})=><FormItem><FormLabel>{t('entries.recordEntryDialog.ultimatelyResponsible')}</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{parties.map(x=><SelectItem value={x} key={x}>{partyLabel(x)}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>}/>
       </>}
      </div>
      <FormField control={form.control} name="description" render={({field})=><FormItem><FormLabel>{t('entries.recordEntryDialog.noteWhyThisMoney')}</FormLabel><FormControl><Input {...field} placeholder={t('entries.recordEntryDialog.eGSeptemberRent')}/></FormControl><FormMessage/></FormItem>}/>
      {isExpense&&<>
       <FormField control={form.control} name="offset" render={({field})=><FormItem><label className="check-label"><Checkbox checked={field.value} onCheckedChange={c=>field.onChange(c===true)} disabled={v.liable!=='Owner'||v.payer!=='Operator'||!chosen?.rules.offset}/> {t('entries.recordEntryDialog.deductAnOperatorFunded')}</label></FormItem>}/>
       {apiMode&&<ReceiptAndCase agreementId={v.agreementId} file={file} onFile={setFile} caseId={caseId} onCase={setCaseId}/>}
       {apiMode?<FormField control={form.control} name="receiptRef" render={({field})=><FormItem><FormLabel>{t('entries.recordEntryDialog.receiptReference')}</FormLabel><FormControl><Input {...field} placeholder={t('entries.recordEntryDialog.receiptOrBillNumber')}/></FormControl></FormItem>}/>
       :<FormField control={form.control} name="receipt" render={({field})=><FormItem><FormLabel>{t('entries.recordEntryDialog.receiptOrProof')}</FormLabel><FormControl><Input key={field.value} type="file" accept="image/*,.pdf" onChange={e=>field.onChange(e.target.files?.[0]?.name||'')}/></FormControl></FormItem>}/>}
       {askDuplicate&&<FormField control={form.control} name="duplicateReason" render={({field})=><FormItem><FormLabel>{t('entries.recordEntryDialog.whyRecordThisPossible')}</FormLabel><FormControl><Input {...field} placeholder={t('entries.recordEntryDialog.reasonRequiredToRecord')}/></FormControl></FormItem>}/>}
       {askOverride&&<FormField control={form.control} name="overrideReason" render={({field})=><FormItem><FormLabel>{t('entries.recordEntryDialog.overrideTheAgreementRule')}</FormLabel><FormControl><Input {...field} placeholder={t('entries.recordEntryDialog.adminOrAccountantOnly')}/></FormControl></FormItem>}/>}
       {askLate&&<FormField control={form.control} name="lateEntry" render={({field})=><FormItem><label className="check-label"><Checkbox checked={field.value} onCheckedChange={c=>field.onChange(c===true)}/> {t('entries.recordEntryDialog.postToTheNext')}</label></FormItem>}/>}
       {v.receipt&&<button type="button" className="remove-receipt" onClick={()=>form.setValue('receipt','')}>{t('entry.removeFile',{name: v.receipt})}</button>}
      </>}
      <EntryConsequencePreview agreement={chosen} type={v.type} amount={amount} payer={v.payer} liable={v.liable} offset={v.offset}/>
      {formError&&<p role="alert" className="form-error">{formError}</p>}
     </div>
     <DialogFooter><Button type="button" variant="outline" onClick={()=>rf.setEntryOpen(false)}>{t('common.cancel')}</Button>{apiMode&&isExpense&&<Button type="button" variant="outline" disabled={rf.apiBusy} onClick={()=>void saveDraft()}>{t('entries.recordEntryDialog.saveAsDraft')}</Button>}<Button type="submit" disabled={rf.apiBusy}>{rf.apiBusy?t('entry.saving'):t('entries.recordEntryDialog.saveEntry')}</Button></DialogFooter>
    </form>
   </Form>
  </DialogContent>
 </Dialog>;
}
