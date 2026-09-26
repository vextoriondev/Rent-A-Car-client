"use client";
import {useEffect,useState} from 'react';
import {useForm,type FieldErrors} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {agreementDefaults,agreementSchema,responsibilities,WIZARD_INCOMPLETE,wizardStepOf,type AgreementFormValues} from '@/lib/forms';
import {money} from '@/lib/demo';
import {useRentflowStore} from '@/lib/store-context';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Form,FormControl,FormField,FormItem,FormLabel,FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';

const steps=['Parties','Vehicle & driver','Monthly terms','Rules & review'];
const LAST=steps.length-1;

export function NewAgreementDialog(){
 const rf=useRentflowStore();
 const form=useForm<AgreementFormValues>({resolver:zodResolver(agreementSchema),defaultValues:agreementDefaults});
 const [step,setStep]=useState(0);
 const [formError,setFormError]=useState('');
 const {agreementOpen}=rf;

 useEffect(()=>{
  if(!agreementOpen)return;
  form.reset(agreementDefaults);setStep(0);setFormError('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[agreementOpen]);

 const v=form.watch();

 const onInvalid=(errors:FieldErrors<AgreementFormValues>)=>{
  const first=Math.min(...Object.keys(errors).map(k=>wizardStepOf[k as keyof AgreementFormValues]));
  setStep(first);
  setFormError(WIZARD_INCOMPLETE);
 };
 const submit=form.handleSubmit(async values=>{
  setFormError('');
  const error=await rf.createAgreement(values);
  if(error)setFormError(error);
 },onInvalid);

 const text=(name:'customer'|'owner'|'vehicle'|'registration'|'driver',label:string,placeholder:string)=><FormField control={form.control} name={name} render={({field})=><FormItem><FormLabel>{label}</FormLabel><FormControl><Input {...field} placeholder={placeholder}/></FormControl><FormMessage/></FormItem>}/>;
 const amountField=(name:'rent'|'ownerRent'|'salary',label:string)=><FormField control={form.control} name={name} render={({field})=><FormItem><FormLabel>{label}</FormLabel><FormControl><Input {...field} type="number" min="1"/></FormControl><FormMessage/></FormItem>}/>;
 const responsibility=(name:'fuel'|'repair',label:string)=><FormField control={form.control} name={name} render={({field})=><FormItem><FormLabel>{label}</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{responsibilities.map(x=><SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select></FormItem>}/>;

 return <Dialog open={agreementOpen} onOpenChange={rf.setAgreementOpen}>
  <DialogContent className="agreement-dialog">
   <DialogHeader><DialogTitle>New rental agreement</DialogTitle><DialogDescription>Set the relationship and the monthly terms before activation.</DialogDescription></DialogHeader>
   <div className="wizard-progress">{steps.map((x,i)=><button type="button" key={x} className={step===i?'current':step>i?'done':''} onClick={()=>setStep(i)}><span>{step>i?'✓':i+1}</span>{x}</button>)}</div>
   <Form {...form}>
    <form onSubmit={submit} noValidate>
     <div className="wizard-body">
      {step===0&&<div className="form-grid">{text('customer','Customer / billing party','Organization or person')}{text('owner','Car owner',"Owner's full name")}</div>}
      {step===1&&<div className="form-grid">{text('vehicle','Vehicle name','e.g. Toyota Axio')}{text('registration','Registration','DHA-METRO-...')}{text('driver','Assigned driver','Driver name')}<FormField control={form.control} name="start" render={({field})=><FormItem><FormLabel>Effective from</FormLabel><FormControl><Input {...field} type="date"/></FormControl></FormItem>}/></div>}
      {step===2&&<div className="form-grid">{amountField('rent','Customer rent / month (BDT)')}{amountField('ownerRent','Owner rent / month (BDT)')}{amountField('salary','Driver salary / month (BDT)')}</div>}
      {step===3&&<>
       <div className="form-grid">{responsibility('fuel','Fuel responsibility')}{responsibility('repair','Repair responsibility')}</div>
       <FormField control={form.control} name="offset" render={({field})=><FormItem><label className="check-label"><Checkbox checked={field.value} onCheckedChange={c=>field.onChange(c===true)}/> Permit owner cost offsets from owner rent</label></FormItem>}/>
       <div className="consequence"><strong>Sample monthly statement</strong><p>Customer rent {money(Number(v.rent)||0)} · owner gross {money(Number(v.ownerRent)||0)} · driver salary {money(Number(v.salary)||0)}. Expenses and payments will be recorded separately.</p></div>
      </>}
      {formError&&<p role="alert" className="form-error">{formError}</p>}
     </div>
     <DialogFooter>
      <Button type="button" variant="outline" onClick={()=>step?setStep(step-1):rf.setAgreementOpen(false)}>{step?'Back':'Cancel'}</Button>
      {step<LAST
       ?<Button key="continue" type="button" onClick={()=>setStep(step+1)}>Continue</Button>
       :<Button key="activate" type="submit" disabled={rf.apiBusy}>{rf.apiBusy?'Saving...':'Activate agreement'}</Button>}
     </DialogFooter>
    </form>
   </Form>
  </DialogContent>
 </Dialog>;
}
