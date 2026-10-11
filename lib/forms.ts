import {z} from 'zod';
import {today,type Agreement,type EntryType} from '@/lib/demo';

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
 agreementId:z.string().min(1,'Choose an agreement.'),
 amount:wholeTaka('Enter a whole BDT amount greater than zero.'),
 date:z.string(),
 category:z.string(),
 reference:required('Add a transaction or document reference.'),
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
  type,agreementId:agreement?.id||'',amount:'',date:today,
  category:type==='Expense'?'Repair':type==='Salary advance'?'Advance':'Rent',
  reference:'',description:'',
  payer:type==='Customer payment'?agreement?.customer||'Customer':'Operator',
  liable:type==='Expense'?'Owner':'Operator',
  offset:true,receipt:'',receiptRef:'',overrideReason:'',duplicateReason:'',lateEntry:false,
 };
}

export const agreementSchema=z.object({
 customer:required('Enter the customer or billing party.'),
 owner:required("Enter the car owner's name."),
 vehicle:required('Enter the vehicle name.'),
 registration:required('Enter the registration.'),
 driver:z.string(),
 start:z.string(),
 rent:wholeTaka('Enter a positive whole BDT amount.'),
 ownerRent:wholeTaka('Enter a positive whole BDT amount.'),
 salary:z.string(),
 fuel:z.string(),
 repair:z.string(),
 offset:z.boolean(),
 driverProvider:z.string(),
 driverPaidBy:z.string(),
 clauses:z.string(),
}).superRefine((v,ctx)=>{
 if(v.driverProvider!=='None'&&!v.driver.trim())ctx.addIssue({code:'custom',path:['driver'],message:'Enter the assigned driver.'});
 if(v.driverProvider!=='None'&&v.driverPaidBy==='Operator'&&!(v.salary.trim()!==''&&Number.isSafeInteger(Number(v.salary))&&Number(v.salary)>0))ctx.addIssue({code:'custom',path:['salary'],message:'Enter a positive whole BDT amount.'});
});
export type AgreementFormValues=z.infer<typeof agreementSchema>;

export const agreementDefaults:AgreementFormValues={customer:'',vehicle:'',registration:'',owner:'',driver:'',rent:'',ownerRent:'',salary:'',start:today,fuel:'Owner',repair:'Owner',offset:true,driverProvider:'Operator',driverPaidBy:'Operator',clauses:''};

/** Who may supply or pay the driver (the backend accepts these three). */
export const driverRoles=['Operator','Owner','Customer'];
/** Who supplies the driver in the wizard; 'None' makes a vehicle-only agreement. */
export const driverProviders=[...driverRoles,'None'];
export const driverProviderLabel=(v:string)=>v==='None'?'No driver (vehicle only)':v;

export const WIZARD_INCOMPLETE='Complete all parties, vehicle details and positive whole BDT amounts.';

/** Which wizard step (0-3) each field lives on, so a failed submit can jump to the first step with an error. */
export const wizardStepOf:Record<keyof AgreementFormValues,number>={customer:0,owner:0,vehicle:1,registration:1,driver:1,start:1,rent:2,ownerRent:2,salary:2,fuel:3,repair:3,offset:3,driverProvider:1,driverPaidBy:1,clauses:3};

export const loginSchema=z.object({
 username:required('Enter your username.'),
 password:required('Enter your password.'),
});
export type LoginFormValues=z.infer<typeof loginSchema>;
export const loginDefaults:LoginFormValues={username:'',password:''};

export const registerSchema=z.object({
 organizationName:required('Enter your company or workspace name.'),
 username:required('Choose a username.'),
 email:z.union([z.literal(''),z.string().email('Enter a valid email address.')]),
 password:z.string().min(8,'Use at least 8 characters.'),
 confirmPassword:z.string().min(1,'Confirm your password.'),
}).refine(v=>v.password===v.confirmPassword,{message:'Passwords do not match.',path:['confirmPassword']});
export type RegisterFormValues=z.infer<typeof registerSchema>;
export const registerDefaults:RegisterFormValues={organizationName:'',username:'',email:'',password:'',confirmPassword:''};
