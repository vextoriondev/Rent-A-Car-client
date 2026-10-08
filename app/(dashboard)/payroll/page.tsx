"use client";
import {ArrowUpRight,Plus} from 'lucide-react';
import {useRentflowStore} from '@/lib/store-context';
import {useRelatedAgreements} from '@/lib/use-related-agreements';
import {SectionHeading} from '@/components/shared/section-heading';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {StatementLedger,type StatementColumn} from '@/components/features/accounts/statement-ledger';

const columns:StatementColumn[]=[
 {label:'Earned',value:(_a,s)=>s.driverEarned},
 {label:'Advance',value:(_a,s)=>s.advance},
 {label:'Paid',value:(_a,s)=>s.driverPaid},
 {label:'Due',value:(_a,s)=>s.driverDue,due:true},
];

export default function PayrollPage(){
 const rf=useRentflowStore();
 const {agreements}=useRelatedAgreements();
 return <Card>
  <SectionHeading title="Driver pay and advances" subtitle="Only salary, advances and payouts are shown here." action={<Button onClick={()=>rf.openEntry('Driver payout')}><Plus size={16}/> Record payout</Button>}/>
  <StatementLedger billChip party="Driver" partyHeader="Driver / car" columns={columns} agreements={agreements} store={rf.store} onSelect={rf.setSelected} emptyTitle="No drivers match your search."/>
  <div className="under-table"><button type="button" className="text-button" onClick={()=>rf.openEntry('Salary advance')}>Record a salary advance <ArrowUpRight size={15}/></button></div>
 </Card>;
}
