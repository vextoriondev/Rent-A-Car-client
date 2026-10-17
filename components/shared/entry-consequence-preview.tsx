import {Eye} from 'lucide-react';
import {apiMode} from '@/lib/api';
import {money,type Agreement,type EntryType} from '@/lib/demo';
import {t} from '@/lib/copy';
import {partyLabel} from '@/lib/copy/labels';

/** "Balance preview" text shown while recording an entry. Wording is unchanged from the original single-page app. */
/** Mirrors the backend ledger rules for who paid and who is responsible (backend M3b). */
export function expenseConsequence(payer:string,liable:string,amount:number,offset:boolean){
 const m=money(amount);
 if(payer===liable&&payer!=='Operator')return t('consequence.samePartyOwnCost',{who: partyLabel(payer), m});
 if(payer==='Operator'){
  if(liable==='Operator')return t('shared.entryConsequencePreview.operatorPaysAndBears', {m});
  if(liable==='Owner'&&offset)return t('shared.entryConsequencePreview.operatorPaysOwnerPayable', {m});
  return t('shared.entryConsequencePreview.operatorPaysForThe', {m, value: partyLabel(liable).toLowerCase()});
 }
 const owes=payer==='Customer'?t('shared.entryConsequencePreview.theCustomerSOutstanding', {m}):t('shared.entryConsequencePreview.theOperatorNowOwes', {value: partyLabel(payer).toLowerCase(), m});
 const bears=liable==='Operator'?t('shared.entryConsequencePreview.itBecomesAnOperator'):t('shared.entryConsequencePreview.itStaysRecoverableFrom', {value: partyLabel(liable).toLowerCase()});
 return liable==='Operator'?t('consequence.paysForYou',{payer: partyLabel(payer), m, owes, bears}):t('consequence.paysFor',{payer: partyLabel(payer), m, liable: partyLabel(liable).toLowerCase(), owes, bears});
}

export function EntryConsequencePreview({agreement,type,amount,payer,liable,offset}:{agreement?:Agreement;type:EntryType;amount:number;payer:string;liable:string;offset:boolean}){
 const text=!agreement||!amount
  ?t('shared.entryConsequencePreview.enterAnAmountTo')
  :type==='Expense'
   ?expenseConsequence(payer,liable,amount,offset&&agreement.rules.offset)
   :type==='Customer payment'?t('shared.entryConsequencePreview.customerOutstandingDecreasesBy', {amount: money(amount)})
   :type==='Owner payout'?t('shared.entryConsequencePreview.ownerPayableDecreasesBy', {amount: money(amount)})
   :type==='Salary advance'?t('shared.entryConsequencePreview.driverOutstandingDecreasesBy', {amount: money(amount)})
   :t('shared.entryConsequencePreview.driverOutstandingDecreasesBy2', {amount: money(amount)});
 return <div className="consequence"><strong><Eye size={16}/> {t('shared.entryConsequencePreview.balancePreview')}</strong><p>{text}{type==='Expense'&&amount>=5000?(apiMode?t('shared.entryConsequencePreview.largeExpensesNeedApproval'):t('shared.entryConsequencePreview.expenseRequiresApprovalBefore')):''}</p></div>;
}
