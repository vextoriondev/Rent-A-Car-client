"use client";
import {useEffect,useState} from 'react';
import {apiMode,apiRequest,livePost} from '@/lib/api';
import {bases,basisUnit,buildSchedule} from '@/lib/schedule';
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
import {t,dateLocale,localizeDigits} from '@/lib/copy';
import {HelpTip} from '@/components/shared/help-tip';
import {fmtDay} from '@/lib/format';
import {partyLabel} from '@/lib/copy/labels';


const steps=()=>[t('wizard.step.parties'),t('wizard.step.vehicleDriver'),t('wizard.step.amounts'),t('wizard.step.paymentDays'),t('wizard.step.review')];
const LAST=4;   // five steps: names, car and driver, amounts, payment days, rules and check

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
 const driverField=()=><FormField control={form.control} name="driver" render={({field})=><FormItem><FormLabel>{t('common.assignedDriver')}</FormLabel><DriverPicker value={field.value} drivers={drivers} onChange={(name,m)=>{field.onChange(name);form.setValue('driverId',m&&apiMode?String(m.id):'')}}/><FormMessage/></FormItem>}/>;
 const basisField=(name:'rentBasis'|'ownerRentBasis'|'salaryBasis',label:string)=><FormField control={form.control} name={name} render={({field})=><FormItem><FormLabel>{label}</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger aria-label={label}><SelectValue/></SelectTrigger></FormControl><SelectContent>{bases().map(([b,l])=><SelectItem key={b} value={b}>{l}</SelectItem>)}</SelectContent></Select></FormItem>}/>;
 const amountField=(name:'rent'|'ownerRent'|'salary',basis:'rentBasis'|'ownerRentBasis'|'salaryBasis',label:string)=><div className="amount-with-basis"><FormField control={form.control} name={name} render={({field})=><FormItem><FormLabel>{t('wizard.amountLabel',{label, unit: basisUnit(v[basis])})}</FormLabel><FormControl><Input {...field} type="text" inputMode="numeric"/></FormControl><FormMessage/></FormItem>}/>{basisField(basis,t('wizard.howCounts'))}</div>;
 const role=(name:'driverProvider'|'driverPaidBy',label:string)=><FormField control={form.control} name={name} render={({field})=><FormItem><FormLabel>{label}</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{(name==='driverProvider'?driverProviders:driverRoles).map(x=><SelectItem value={x} key={x}>{driverProviderLabel(x)}</SelectItem>)}</SelectContent></Select></FormItem>}/>;
 const responsibility=(name:'fuel'|'repair',label:string)=><FormField control={form.control} name={name} render={({field})=><FormItem><FormLabel>{label}</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{responsibilities.map(x=><SelectItem value={x} key={x}>{partyLabel(x)}</SelectItem>)}</SelectContent></Select></FormItem>}/>;

 return <Dialog open={agreementOpen} onOpenChange={rf.setAgreementOpen}>
  <DialogContent className="agreement-dialog">
   <DialogHeader><DialogTitle>{t('agreements.newAgreementDialog.newRentalAgreement')}</DialogTitle><DialogDescription>{t('agreements.newAgreementDialog.setTheRelationshipAnd')}</DialogDescription></DialogHeader>
   <div className="wizard-progress">{steps().map((x,i)=><button type="button" key={x} className={step===i?'current':step>i?'done':''} onClick={()=>setStep(i)}><span>{step>i?'✓':localizeDigits(i+1)}</span>{x}</button>)}</div>
   <Form {...form}>
    <form onSubmit={submit} noValidate>
     <div className="wizard-body">
      {step===0&&<div className="form-grid">{text('customer',t('wizard.customerParty'),t('wizard.customerPlaceholder'))}{text('owner',t('wizard.owner'),t('wizard.ownerPlaceholder'))}</div>}
      {step===1&&<div className="form-grid">{text('vehicle',t('wizard.vehicle'),t('wizard.vehiclePlaceholder'))}{text('registration',t('wizard.plate'),t('wizard.platePlaceholder'))}{!noDriver&&driverField()}<FormField control={form.control} name="start" render={({field})=><FormItem><FormLabel>{t('common.starts')}</FormLabel><FormControl><Input {...field} type="date"/></FormControl></FormItem>}/><FormField control={form.control} name="end" render={({field})=><FormItem><FormLabel>{t('agreements.newAgreementDialog.ends')}</FormLabel><FormControl><Input {...field} type="date"/></FormControl><FormMessage/></FormItem>}/>{role('driverProvider',t('wizard.whoSupplies'))}{!noDriver&&role('driverPaidBy',t('wizard.whoPays'))}{noDriver&&<p className="note">{t('agreements.newAgreementDialog.vehicleOnlyNoDriver')}</p>}</div>}
      {step===2&&<><div className="form-grid">{amountField('rent','rentBasis',t('wizard.customerRent'))}{amountField('ownerRent','ownerRentBasis',t('wizard.ownerRent'))}{operatorPaysDriver&&amountField('salary','salaryBasis',t('wizard.driverSalary'))}</div><p className="note">{t('wizard.basisNote')}<HelpTip tip="tip.fixedAmount"/></p>{noDriver&&<p className="note">{t('agreements.newAgreementDialog.noDriverOnThis')}</p>}{!noDriver&&v.driverPaidBy!=='Operator'&&<p className="note">{t('wizard.thirdPartyPays',{payer: partyLabel(v.driverPaidBy).toLowerCase()})}</p>}</>}
      {step===3&&<>
       <ScheduleEditor label={t('common.customerPaysUs')} value={v.customerSchedule} onChange={x=>form.setValue('customerSchedule',x,{shouldValidate:true})}/>
       <ScheduleEditor label={t('common.wePayTheOwner')} value={v.ownerSchedule} onChange={x=>form.setValue('ownerSchedule',x,{shouldValidate:true})}/>
       {operatorPaysDriver&&<ScheduleEditor label={t('common.wePayTheDriver')} value={v.driverSchedule} onChange={x=>form.setValue('driverSchedule',x,{shouldValidate:true})}/>}
       <PreviewSummary preview={preview} error={previewError} loading={apiMode&&!preview&&!previewError}/>
      </>}
      {step===4&&<>
       <div className="form-grid">{responsibility('fuel',t('wizard.fuel'))}{responsibility('repair',t('wizard.repair'))}</div>
       <FormField control={form.control} name="offset" render={({field})=><FormItem><label className="check-label"><Checkbox checked={field.value} onCheckedChange={c=>field.onChange(c===true)}/> {t('agreements.newAgreementDialog.permitOwnerCostOffsets')}</label></FormItem>}/>
       <FormField control={form.control} name="clauses" render={({field})=><FormItem><FormLabel>{t('agreements.newAgreementDialog.clausesOptional')}</FormLabel><FormControl><Textarea {...field} rows={3} placeholder={t('agreements.newAgreementDialog.anythingTheWrittenAgreement')}/></FormControl></FormItem>}/>
       <div className="consequence"><strong>{t('agreements.newAgreementDialog.sampleMonthlyStatement')}</strong><p>{t('wizard.sample',{customer: money(Number(v.rent)||0), owner: money(Number(v.ownerRent)||0), salary: noDriver?t('wizard.noDriverNone'):v.driverPaidBy==='Operator'?money(Number(v.salary)||0):t('wizard.paidByNone',{payer: partyLabel(v.driverPaidBy).toLowerCase()})})}</p></div>
      </>}
      {formError&&<p role="alert" className="form-error">{formError}</p>}
     </div>
     <DialogFooter>
      <Button type="button" variant="outline" onClick={()=>step?setStep(step-1):rf.setAgreementOpen(false)}>{step?t('wizard.back'):t('common.cancel')}</Button>
      {step<LAST
       ?<Button key="continue" type="button" onClick={()=>setStep(step+1)}>{t('agreements.newAgreementDialog.continue')}</Button>
       :<Button key="activate" type="submit" disabled={rf.apiBusy}>{rf.apiBusy?t('wizard.saving'):t('common.activateAgreement')}</Button>}
     </DialogFooter>
    </form>
   </Form>
  </DialogContent>
 </Dialog>;
}

type Due={due_date:string;covers_from:string;covers_to:string;amount:string};
type Preview={days:number|null;months:{month:string;customer:string;owner:string;driver?:string}[];dues:Record<string,Due[]>;totals:Record<string,string>};
const SIDE_LABEL:Record<string,string>={customer:t('agreements.newAgreementDialog.customerPays'),owner:t('common.wePayTheOwner'),driver:t('common.wePayTheDriver')};
const fmt=(iso:string)=>new Date(iso+'T12:00:00').toLocaleDateString(dateLocale(),{weekday:'short',day:'numeric',month:'short',year:'numeric'});

/** What the terms mean in plain figures: total days, the first month and the first payment days (worked out by the server; saves nothing). */
function PreviewSummary({preview,error,loading}:{preview:Preview|null;error:string;loading:boolean}){
 if(!apiMode)return <p className="note">{t('agreements.newAgreementDialog.apiModeOnlyThis')}</p>;
 if(error)return <p role="alert" className="form-error">{error}</p>;
 if(loading)return <p className="note">{t('agreements.newAgreementDialog.workingOutTheAmounts')}</p>;
 if(!preview)return <p className="note">{t('agreements.newAgreementDialog.enterTheAmountsTo')}</p>;
 const first=preview.months[0];
 return <div className="consequence" aria-live="polite"><strong>{t('agreements.newAgreementDialog.whatThisMeans')}</strong>
  <p>{preview.days?t('wizard.previewDays',{days: preview.days}):t('wizard.previewOpen')} {t('wizard.previewFirst',{customer: money(Number(first.customer)), owner: money(Number(first.owner)), driver: first.driver!==undefined?t('wizard.previewDriver',{driver: money(Number(first.driver))}):''})}{preview.totals.customer&&' '+t('wizard.previewTotal',{customer: money(Number(preview.totals.customer)), owner: money(Number(preview.totals.owner))})}</p>
  {Object.entries(preview.dues).map(([side,list])=><div key={side}><b>{SIDE_LABEL[side]}</b><ul>{list.slice(0,3).map(d=><li key={fmtDay(d.due_date)}>{fmt(d.due_date)} · {money(Number(d.amount))} <small>{t('wizard.covers',{from: fmtDay(d.covers_from), to: fmtDay(d.covers_to)})}</small></li>)}</ul></div>)}
 </div>;
}
