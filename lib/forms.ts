import {z} from 'zod';
import {today,type Agreement,type EntryType} from '@/lib/demo';

export const entryTypes:EntryType[]=['Expense','Customer payment','Owner payout','Driver payout','Salary advance'];
export const entryCategories=['Repair','Fuel','Toll / parking','Maintenance','Cleaning','Rent','Owner rent','Salary','Advance','Other'];
export const parties=['Operator','Owner','Customer','Driver'];
export const responsibilities=['Owner','Operator','Customer'];

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
});
export type EntryFormValues=z.infer<typeof entrySchema>;

export function entryDefaults(type:EntryType,agreement?:Agreement):EntryFormValues{
 return{
  type,agreementId:agreement?.id||'',amount:'',date:today,
  category:type==='Expense'?'Repair':type==='Salary advance'?'Advance':'Rent',
  reference:'',description:'',
  payer:type==='Customer payment'?agreement?.customer||'Customer':'Operator',
  liable:type==='Expense'?'Owner':'Operator',
  offset:true,receipt:'',
 };
}

export const agreementSchema=z.object({
 customer:required('Enter the customer or billing party.'),
 owner:required("Enter the car owner's name."),
 vehicle:required('Enter the vehicle name.'),
 registration:required('Enter the registration.'),
 driver:required('Enter the assigned driver.'),
 start:z.string(),
 rent:wholeTaka('Enter a positive whole BDT amount.'),
 ownerRent:wholeTaka('Enter a positive whole BDT amount.'),
 salary:wholeTaka('Enter a positive whole BDT amount.'),
 fuel:z.string(),
 repair:z.string(),
 offset:z.boolean(),
});
export type AgreementFormValues=z.infer<typeof agreementSchema>;

export const agreementDefaults:AgreementFormValues={customer:'',vehicle:'',registration:'',owner:'',driver:'',rent:'',ownerRent:'',salary:'',start:today,fuel:'Owner',repair:'Owner',offset:true};

export const WIZARD_INCOMPLETE='Complete all parties, vehicle details and positive whole BDT amounts.';

/** Which wizard step (0-3) each field lives on, so a failed submit can jump to the first step with an error. */
export const wizardStepOf:Record<keyof AgreementFormValues,number>={customer:0,owner:0,vehicle:1,registration:1,driver:1,start:1,rent:2,ownerRent:2,salary:2,fuel:3,repair:3,offset:3};
