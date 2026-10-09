"use client";
import {Plus} from 'lucide-react';
import {statement} from '@/lib/demo';
import {useRentflowStore} from '@/lib/store-context';
import {useRelatedAgreements} from '@/lib/use-related-agreements';
import {SectionHeading} from '@/components/shared/section-heading';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Money} from '@/components/shared/money';
import {AccountsLedger} from '@/components/features/accounts/accounts-ledger';
import {BillStateLegend} from '@/components/shared/bill-state-legend';
import {BillingWorkspace} from '@/components/features/billing/billing-workspace';
import {apiMode} from '@/lib/api';

export default function BillingPage(){
 const rf=useRentflowStore();
 const {agreements}=useRelatedAgreements();
 const statements=agreements.map(a=>statement(a,rf.store.entries));
 const billed=agreements.reduce((t,a)=>t+a.rent,0);
 const received=statements.reduce((t,s)=>t+s.received,0);
 const outstanding=statements.reduce((t,s)=>t+s.customerDue,0);
 return <>
  <div className="mini-metrics">
   <Card><span>Total billed</span><strong><Money value={billed}/></strong></Card>
   <Card><span>Received</span><strong><Money value={received}/></strong></Card>
   <Card><span>Outstanding</span><strong><Money value={outstanding}/></strong></Card>
  </div>
  <Card>
   <SectionHeading title="Customer billing and collections" subtitle="Partial receipts reduce each agreement's open rent balance." action={<Button onClick={()=>rf.openEntry('Customer payment')}><Plus size={16}/> Receive payment</Button>}/>
   <BillStateLegend/>
   <AccountsLedger agreements={agreements} store={rf.store} onSelect={rf.setSelected}/>
  </Card>
  {apiMode?<BillingWorkspace/>:<Card><SectionHeading title="Charges, invoices and ledger"/><p className="note">API mode only: extra charges, credits, invoices, the period ledger and split payments need the Django backend. This demo keeps the simple collection flow above.</p></Card>}
 </>;
}
