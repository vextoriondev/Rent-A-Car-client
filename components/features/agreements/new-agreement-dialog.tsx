"use client";
import {useEffect,useState} from 'react';
import {apiMode,apiRequest,livePost} from '@/lib/api';
import {BASES,basisUnit,buildSchedule} from '@/lib/schedule';
import {ScheduleEditor} from './schedule-editor';
import {DriverPicker} from './driver-picker';
import {useForm,type FieldErrors} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {agreementDefaults,agreementSchema,driverProviderLabel,driverProviders,driverRoles,responsibilities,WIZARD_INCOMPLETE,wizardStepOf,type AgreementFormValues} from '@/lib/forms';
import {money} from '@/lib/demo';
import {useRentflowStore} from '@/lib/store-context';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Form,FormControl,FormField,FormItem,FormLabel,FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';

const steps=['Parties','Vehicle & driver','Amounts','Payment days','Rules & review'];
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
 const noDriver=v.driverProvider==='None';
 const operatorPaysDriver=!noDriver&&v.driverPaidBy==='Operator';
 const orgId=rf.store.backend?.orgId;
 const [drivers,setDrivers]=useState<{id:number;name:string}[]>([]);
 // drivers already created, offered as suggestions so the same person is never entered twice
 useEffect(()=>{
  if(!agreementOpen)return;
  if(apiMode&&orgId){apiRequest(`/orgs/${orgId}/parties?kind=driver&limit=200`).then((r:{items:{id:number;name:string}[]})=>setDrivers(r.items.map(d=>({id:d.id,name:d.name})))).catch(()=>setDrivers([]));return}
  setDrivers([...new Set(rf.store.agreements.map(a=>a.driver).filter(Boolean))].map((name,i)=>({id:i,name})));
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[agreementOpen,orgId]);
 const [preview,setPreview]=useState<Preview|null>(null);
 const [previewError,setPreviewError]=useState('');
 // the server works out the summary (it owns the date maths); shown on the payment-days step
 useEffect(()=>{
  setPreview(null);setPreviewError('');
  if(step!==3||!apiMode||!orgId||!agreementOpen||!(Number(v.rent)>0)||!(Number(v.ownerRent)>0)||!v.start)return;
  const id=setTimeout(()=>{
   livePost(orgId,'/agreement-preview',{start:v.start,end:v.end||null,rent:String(Number(v.rent)),owner_rent:String(Number(v.ownerRent)),salary:operatorPaysDriver?String(Number(v.salary)||0):'0',rent_basis:v.rentBasis,owner_rent_basis:v.ownerRentBasis,salary_basis:v.salaryBasis,has_driver:operatorPaysDriver,
    payment_schedule:buildSchedule({customer:v.customerSchedule,owner:v.ownerSchedule,driver:operatorPaysDriver?v.driverSchedule:undefined})}).then(setPreview).catch(e=>setPreviewError((e as Error).message));
  },350);
  return()=>clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[step,agreementOpen,JSON.stringify([v.start,v.end,v.rent,v.ownerRent,v.salary,v.rentBasis,v.ownerRentBasis,v.salaryBasis,v.customerSchedule,v.ownerSchedule,v.driverSchedule,operatorPaysDriver])]);

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
 const driverField=()=><FormField control={form.control} name="driver" render={({field})=><FormItem><FormLabel>Assigned driver</FormLabel><DriverPicker value={field.value} drivers={drivers} onChange={(name,m)=>{field.onChange(name);form.setValue('driverId',m&&apiMode?String(m.id):'')}}/><FormMessage/></FormItem>}/>;
 const basisField=(name:'rentBasis'|'ownerRentBasis'|'salaryBasis',label:string)=><FormField control={form.control} name={name} render={({field})=><FormItem><FormLabel>{label}</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger aria-label={label}><SelectValue/></SelectTrigger></FormControl><SelectContent>{BASES.map(([b,l])=><SelectItem key={b} value={b}>{l}</SelectItem>)}</SelectContent></Select></FormItem>}/>;
 const amountField=(name:'rent'|'ownerRent'|'salary',basis:'rentBasis'|'ownerRentBasis'|'salaryBasis',label:string)=><div className="amount-with-basis"><FormField control={form.control} name={name} render={({field})=><FormItem><FormLabel>{label} (BDT {basisUnit(v[basis])})</FormLabel><FormControl><Input {...field} type="number" min="1"/></FormControl><FormMessage/></FormItem>}/>{basisField(basis,'How the amount counts')}</div>;
 const role=(name:'driverProvider'|'driverPaidBy',label:string)=><FormField control={form.control} name={name} render={({field})=><FormItem><FormLabel>{label}</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{(name==='driverProvider'?driverProviders:driverRoles).map(x=><SelectItem value={x} key={x}>{driverProviderLabel(x)}</SelectItem>)}</SelectContent></Select></FormItem>}/>;
 const responsibility=(name:'fuel'|'repair',label:string)=><FormField control={form.control} name={name} render={({field})=><FormItem><FormLabel>{label}</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{responsibilities.map(x=><SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select></FormItem>}/>;

 return <Dialog open={agreementOpen} onOpenChange={rf.setAgreementOpen}>
  <DialogContent className="agreement-dialog">
   <DialogHeader><DialogTitle>New rental agreement</DialogTitle><DialogDescription>Set the relationship and the monthly terms before activation.</DialogDescription></DialogHeader>
   <div className="wizard-progress">{steps.map((x,i)=><button type="button" key={x} className={step===i?'current':step>i?'done':''} onClick={()=>setStep(i)}><span>{step>i?'✓':i+1}</span>{x}</button>)}</div>
   <Form {...form}>
    <form onSubmit={submit} noValidate>
     <div className="wizard-body">
      {step===0&&<div className="form-grid">{text('customer','Customer / billing party','Organization or person')}{text('owner','Car owner',"Owner's full name")}</div>}
      {step===1&&<div className="form-grid">{text('vehicle','Vehicle name','e.g. Toyota Axio')}{text('registration','Registration','DHA-METRO-...')}{!noDriver&&driverField()}<FormField control={form.control} name="start" render={({field})=><FormItem><FormLabel>Starts</FormLabel><FormControl><Input {...field} type="date"/></FormControl></FormItem>}/><FormField control={form.control} name="end" render={({field})=><FormItem><FormLabel>Ends</FormLabel><FormControl><Input {...field} type="date"/></FormControl><FormMessage/></FormItem>}/>{role('driverProvider','Who supplies the driver')}{!noDriver&&role('driverPaidBy','Who pays the driver')}{noDriver&&<p className="note">Vehicle only: no driver and no salary on this agreement. If you hire a driver yourself, record them separately as a driver agreement on the Drivers page.</p>}</div>}
      {step===2&&<><div className="form-grid">{amountField('rent','rentBasis','Customer rent')}{amountField('ownerRent','ownerRentBasis','Owner rent')}{operatorPaysDriver&&amountField('salary','salaryBasis','Driver salary')}</div><p className="note">Per month bills a full month exactly and a part month by its days. Per day bills every day. Fixed total is spread evenly over the agreement&apos;s days.</p>{noDriver&&<p className="note">No driver on this agreement, so no salary appears on the statement.</p>}{!noDriver&&v.driverPaidBy!=='Operator'&&<p className="note">The {v.driverPaidBy.toLowerCase()} pays the driver directly, so there is no salary payable and none appears on the statement.</p>}</>}
      {step===3&&<>
       <ScheduleEditor label="Customer pays us" value={v.customerSchedule} onChange={x=>form.setValue('customerSchedule',x,{shouldValidate:true})}/>
       <ScheduleEditor label="We pay the owner" value={v.ownerSchedule} onChange={x=>form.setValue('ownerSchedule',x,{shouldValidate:true})}/>
       {operatorPaysDriver&&<ScheduleEditor label="We pay the driver" value={v.driverSchedule} onChange={x=>form.setValue('driverSchedule',x,{shouldValidate:true})}/>}
       <PreviewSummary preview={preview} error={previewError} loading={apiMode&&!preview&&!previewError}/>
      </>}
      {step===4&&<>
       <div className="form-grid">{responsibility('fuel','Fuel responsibility')}{responsibility('repair','Repair responsibility')}</div>
       <FormField control={form.control} name="offset" render={({field})=><FormItem><label className="check-label"><Checkbox checked={field.value} onCheckedChange={c=>field.onChange(c===true)}/> Permit owner cost offsets from owner rent</label></FormItem>}/>
       <FormField control={form.control} name="clauses" render={({field})=><FormItem><FormLabel>Clauses (optional)</FormLabel><FormControl><Textarea {...field} rows={3} placeholder="Anything the written agreement says about the driver, costs or payments"/></FormControl></FormItem>}/>
       <div className="consequence"><strong>Sample monthly statement</strong><p>Customer rent {money(Number(v.rent)||0)} · owner gross {money(Number(v.ownerRent)||0)} · driver salary {noDriver?'none (no driver)':v.driverPaidBy==='Operator'?money(Number(v.salary)||0):'none (paid by '+v.driverPaidBy.toLowerCase()+')'}. Expenses and payments will be recorded separately.</p></div>
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

type Due={due_date:string;covers_from:string;covers_to:string;amount:string};
type Preview={days:number|null;months:{month:string;customer:string;owner:string;driver?:string}[];dues:Record<string,Due[]>;totals:Record<string,string>};
const SIDE_LABEL:Record<string,string>={customer:'Customer pays',owner:'We pay the owner',driver:'We pay the driver'};
const fmt=(iso:string)=>new Date(iso+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});

/** What the terms mean in plain figures: total days, the first month and the first payment days (worked out by the server; saves nothing). */
function PreviewSummary({preview,error,loading}:{preview:Preview|null;error:string;loading:boolean}){
 if(!apiMode)return <p className="note">API mode only: this demo keeps the simple monthly flow.</p>;
 if(error)return <p role="alert" className="form-error">{error}</p>;
 if(loading)return <p className="note">Working out the amounts...</p>;
 if(!preview)return <p className="note">Enter the amounts to see the first payment days.</p>;
 const first=preview.months[0];
 return <div className="consequence" aria-live="polite"><strong>What this means</strong>
  <p>{preview.days?`${preview.days} days. `:'Open-ended. '}First month: customer {money(Number(first.customer))}, owner {money(Number(first.owner))}{first.driver!==undefined&&`, driver ${money(Number(first.driver))}`}.{preview.totals.customer&&` Whole agreement: customer ${money(Number(preview.totals.customer))}, owner ${money(Number(preview.totals.owner))}.`}</p>
  {Object.entries(preview.dues).map(([side,list])=><div key={side}><b>{SIDE_LABEL[side]}</b><ul>{list.slice(0,3).map(d=><li key={d.due_date}>{fmt(d.due_date)} · {money(Number(d.amount))} <small>covers {d.covers_from} to {d.covers_to}</small></li>)}</ul></div>)}
 </div>;
}
