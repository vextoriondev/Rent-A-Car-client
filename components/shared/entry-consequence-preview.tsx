import {Eye} from 'lucide-react';
import {money,type Agreement,type EntryType} from '@/lib/demo';

/** "Balance preview" text shown while recording an entry. Wording is unchanged from the original single-page app. */
/** Mirrors the backend ledger rules for who paid and who is responsible (backend M3b). */
export function expenseConsequence(payer:string,liable:string,amount:number,offset:boolean){
 const m=money(amount);
 if(payer===liable&&payer!=='Operator')return `${payer} pays ${m} for their own cost. It is recorded for the history; the operator's balances do not change.`;
 if(payer==='Operator'){
  if(liable==='Operator')return `Operator pays ${m} and bears the cost; the operator margin decreases.`;
  if(liable==='Owner'&&offset)return `Operator pays ${m}; owner payable decreases by ${m} after approval.`;
  return `Operator pays ${m} for the ${liable.toLowerCase()}; it stays recoverable from the ${liable.toLowerCase()} until it is billed or deducted.`;
 }
 const owes=payer==='Customer'?`The customer's outstanding decreases by ${m}.`:`The operator now owes the ${payer.toLowerCase()} ${m} more.`;
 const bears=liable==='Operator'?'It becomes an operator cost; the margin decreases.':`It stays recoverable from the ${liable.toLowerCase()}.`;
 return `${payer} pays ${m} for ${liable==='Operator'?'the operator':'the '+liable.toLowerCase()}. ${owes} ${bears}`;
}

export function EntryConsequencePreview({agreement,type,amount,payer,liable,offset}:{agreement?:Agreement;type:EntryType;amount:number;payer:string;liable:string;offset:boolean}){
 const text=!agreement||!amount
  ?'Enter an amount to preview this entry.'
  :type==='Expense'
   ?expenseConsequence(payer,liable,amount,offset&&agreement.rules.offset)
   :type==='Customer payment'?`Customer outstanding decreases by ${money(amount)} when posted.`
   :type==='Owner payout'?`Owner payable decreases by ${money(amount)} when posted.`
   :type==='Salary advance'?`Driver outstanding decreases by ${money(amount)} as an advance.`
   :`Driver outstanding decreases by ${money(amount)} when posted.`;
 return <div className="consequence"><strong><Eye size={16}/> Balance preview</strong><p>{text}{type==='Expense'&&amount>=5000?' Expense requires approval before balances change.':''}</p></div>;
}
