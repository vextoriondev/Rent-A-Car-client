import {z} from 'zod';
import {type Agreement,type EntryType} from '@/lib/demo';
import {todayIso} from '@/lib/clock';
import {defaultSchedule} from '@/lib/schedule';
import {t} from '@/lib/copy';
import {partyLabel} from '@/lib/copy/labels';

export const entryTypes:EntryType[]=['Expense','Customer payment','Owner payout','Driver payout','Salary advance'];
export const entryCategories=['Repair','Fuel','Toll / parking','Maintenance','Cleaning','Damage','Driver allowance','Driver salary (paid directly)','Rent','Owner rent','Salary','Advance','Other'];
export const parties=['Operator','Owner','Customer','Driver'];
export const responsibilities=['Owner','Operator','Customer','Driver'];
/** Category label to the backend expense category code. */
export const expenseCategoryCodes:Record<string,string>={Repair:'repair',Fuel:'fuel','Toll / parking':'toll',Maintenance:'maintenance',Cleaning:'cleaning',Damage:'damage','Driver allowance':'driver_allowance','Driver salary (paid directly)':'driver_salary',Other:'other'};

const wholeTaka=(message:string)=>z.string().refine(v=>v.trim()!==''&&Number.isSafeInteger(Number(v))&&Number(v)>0,message);
const required=(message:string)=>z.string().trim().min(1,message);

/** Field-level rules only. Rules that depend on store state (closed month, duplicate reference, balance limits) live in the store's submit. */
export const entrySchema=z.object({
 type:z.enum(['Expense','Customer payment','Owner payout','Driver payout','Salary advance']),
 agreementId:z.string().min(1,t('storeContext.chooseAnAgreement')),
 amount:wholeTaka(t('forms.enterAnAmountAbove')),
 date:z.string(),
 category:z.string(),
 reference:required(t('forms.addAReferenceSuch')),
 description:z.string(),
 payer:z.string(),
 liable:z.string(),
 offset:z.boolean(),
 receipt:z.string(),
 // API mode only: filled in when the server asks for them
 receiptRef:z.string(),
 overrideReason:z.string(),
 duplicateReason:z.string(),
 lateEntry:z.boolean(),
});
export type EntryFormValues=z.infer<typeof entrySchema>;

export function entryDefaults(type:EntryType,agreement?:Agreement):EntryFormValues{
 return{
  type,agreementId:agreement?.id||'',amount:'',date:todayIso(),
  category:type==='Expense'?'Repair':type==='Salary advance'?'Advance':'Rent',
  reference:'',description:'',
  payer:type==='Customer payment'?agreement?.customer||'Customer':'Operator',
  liable:type==='Expense'?'Owner':'Operator',
  offset:true,receipt:'',receiptRef:'',overrideReason:'',duplicateReason:'',lateEntry:false,
 };
}

const scheduleSchema=z.object({kind:z.enum(['default','monthly','weekly','dates']),day:z.string(),weekday:z.string(),dates:z.array(z.string())});
export const agreementSchema=z.object({
 customer:required(t('forms.enterTheCustomerS')),
 owner:required(t('forms.enterTheCarOwner')),
 vehicle:required(t('forms.enterTheCarS')),
 registration:required(t('forms.enterTheNumberPlate')),
 driver:z.string(),
 driverId:z.string(),
 start:z.string(),
 end:z.string(),
 rentBasis:z.string(),
 ownerRentBasis:z.string(),
 salaryBasis:z.string(),
 customerSchedule:scheduleSchema,
 ownerSchedule:scheduleSchema,
 driverSchedule:scheduleSchema,
 rent:wholeTaka(t('forms.enterAnAmountAbove')),
 ownerRent:wholeTaka(t('forms.enterAnAmountAbove')),
 salary:z.string(),
 fuel:z.string(),
 repair:z.string(),
 offset:z.boolean(),
 billToNow:z.boolean(),
 driverProvider:z.string(),
 driverPaidBy:z.string(),
 clauses:z.string(),
}).superRefine((v,ctx)=>{
 if(!v.end)ctx.addIssue({code:'custom',path:['end'],message: t('forms.enterTheEndDate')});
 else if(v.end<v.start)ctx.addIssue({code:'custom',path:['end'],message: t('common.theEndDateIs')});
 for(const k of ['customerSchedule','ownerSchedule','driverSchedule'] as const)if(v[k].kind==='dates'&&v[k].dates.length===0)ctx.addIssue({code:'custom',path:[k],message: t('forms.addAtLeastOne')});
 if(v.driverProvider!=='None'&&!v.driver.trim())ctx.addIssue({code:'custom',path:['driver'],message: t('forms.enterTheAssignedDriver')});
 if(v.driverProvider!=='None'&&v.driverPaidBy==='Operator'&&!(v.salary.trim()!==''&&Number.isSafeInteger(Number(v.salary))&&Number(v.salary)>0))ctx.addIssue({code:'custom',path:['salary'],message: t('forms.enterAPositiveWhole')});
});
export type AgreementFormValues=z.infer<typeof agreementSchema>;

export const agreementDefaults:AgreementFormValues={customer:'',vehicle:'',registration:'',owner:'',driver:'',driverId:'',rent:'',ownerRent:'',salary:'',start:todayIso(),end:'',rentBasis:'per_month',ownerRentBasis:'per_month',salaryBasis:'per_month',customerSchedule:{...defaultSchedule,dates:[]},ownerSchedule:{...defaultSchedule,dates:[]},driverSchedule:{...defaultSchedule,dates:[]},fuel:'Owner',repair:'Owner',offset:true,billToNow:false,driverProvider:'Operator',driverPaidBy:'Operator',clauses:''};

/** Who may supply or pay the driver (the backend accepts these three). */
export const driverRoles=['Operator','Owner','Customer'];
/** Who supplies the driver in the wizard; 'None' makes a vehicle-only agreement. */
export const driverProviders=[...driverRoles,'None'];
export const driverProviderLabel=(v:string)=>v==='None'?t('common.noDriverVehicleOnly'):partyLabel(v);

export const WIZARD_INCOMPLETE=t('forms.fillInEveryName');

/** Which wizard step (0-3) each field lives on, so a failed submit can jump to the first step with an error. */
export const wizardStepOf:Record<keyof AgreementFormValues,number>={customer:0,owner:0,vehicle:1,registration:1,driver:1,driverId:1,start:1,end:1,rent:2,ownerRent:2,salary:2,rentBasis:2,ownerRentBasis:2,salaryBasis:2,customerSchedule:3,ownerSchedule:3,driverSchedule:3,fuel:4,repair:4,offset:4,billToNow:1,driverProvider:1,driverPaidBy:1,clauses:4};

export const loginSchema=z.object({
 username:required(t('forms.enterYourUsername')),
 password:required(t('forms.enterYourPassword')),
});
export type LoginFormValues=z.infer<typeof loginSchema>;
export const loginDefaults:LoginFormValues={username:'',password:''};

export const registerSchema=z.object({
 organizationName:required(t('forms.enterYourCompanyName')),
 username:required(t('forms.chooseAUsername')),
 email:z.union([z.literal(''),z.string().email('Enter a valid email address.')]),
 password:z.string().min(8,t('forms.useAtLeast8')),
 confirmPassword:z.string().min(1,t('forms.typeYourPasswordAgain')),
}).refine(v=>v.password===v.confirmPassword,{message: t('forms.passwordsDoNotMatch'),path:['confirmPassword']});
export type RegisterFormValues=z.infer<typeof registerSchema>;
export const registerDefaults:RegisterFormValues={organizationName:'',username:'',email:'',password:'',confirmPassword:''};
