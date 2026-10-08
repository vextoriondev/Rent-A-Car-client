"use client";
import {Plus} from 'lucide-react';
import {useRentflowStore} from '@/lib/store-context';
import {useRelatedAgreements} from '@/lib/use-related-agreements';
import {SectionHeading} from '@/components/shared/section-heading';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {StatementLedger,type StatementColumn} from '@/components/features/accounts/statement-ledger';

const columns:StatementColumn[]=[
 {label:'Gross',value:(_a,s)=>s.ownerGross},
 {label:'Offsets',value:(_a,s)=>s.offsets},
 {label:'Net payable',value:(_a,s)=>s.ownerNet},
 {label:'Paid',value:(_a,s)=>s.ownerPaid},
 {label:'Due',value:(_a,s)=>s.ownerDue,due:true},
];

export default function OwnerPayablesPage(){
 const rf=useRentflowStore();
 const {agreements}=useRelatedAgreements();
 return <Card>
  <SectionHeading title="Owner payables" subtitle="Gross rent less authorized offsets and transfers." action={<Button onClick={()=>rf.openEntry('Owner payout')}><Plus size={16}/> Record payout</Button>}/>
  <StatementLedger billChip party="Owner" partyHeader="Owner / car" columns={columns} agreements={agreements} store={rf.store} onSelect={rf.setSelected} emptyTitle="No owner payables match your search."/>
 </Card>;
}
