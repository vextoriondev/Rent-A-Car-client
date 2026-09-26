import {Eye} from 'lucide-react';
import {money,type Agreement,type EntryType} from '@/lib/demo';

/** "Balance preview" text shown while recording an entry. Wording is unchanged from the original single-page app. */
export function EntryConsequencePreview({agreement,type,amount,payer,liable,offset}:{agreement?:Agreement;type:EntryType;amount:number;payer:string;liable:string;offset:boolean}){
 const text=!agreement||!amount
  ?'Enter an amount to preview this entry.'
  :type==='Expense'
   ?`${payer} pays ${money(amount)}; ${liable} is responsible. ${liable==='Owner'&&payer==='Operator'&&offset&&agreement.rules.offset?`Owner payable decreases by ${money(amount)} after approval.`:'No automatic owner offset.'}`
   :type==='Customer payment'?`Customer outstanding decreases by ${money(amount)} when posted.`
   :type==='Owner payout'?`Owner payable decreases by ${money(amount)} when posted.`
   :type==='Salary advance'?`Driver outstanding decreases by ${money(amount)} as an advance.`
   :`Driver outstanding decreases by ${money(amount)} when posted.`;
 return <div className="consequence"><strong><Eye size={16}/> Balance preview</strong><p>{text}{type==='Expense'&&amount>=5000?' Expense requires approval before balances change.':''}</p></div>;
}
