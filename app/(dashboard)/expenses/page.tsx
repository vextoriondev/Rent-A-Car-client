"use client";
import {useMemo} from 'react';
import Link from 'next/link';
import {Plus} from 'lucide-react';
import {useRentflowStore} from '@/lib/store-context';
import {useQueryParam} from '@/lib/use-list-filters';
import {useRangeEntries} from '@/lib/use-range-entries';
import {ALL_OWNERS,useRelatedAgreements} from '@/lib/use-related-agreements';
import {SectionHeading} from '@/components/shared/section-heading';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {FilterToolbar} from '@/components/shared/filter-toolbar';
import {EntriesLedger} from '@/components/features/entries/entries-ledger';

export default function ExpensesPage(){
 const rf=useRentflowStore();
 const {agreements,owners}=useRelatedAgreements();
 const inPeriod=useRangeEntries();
 const [status]=useQueryParam('status','All');
 const entries=useMemo(()=>inPeriod.filter(e=>e.type==='Expense'&&(status==='All'||e.status===status)&&agreements.some(a=>a.id===e.agreementId)),[inPeriod,status,agreements]);
 return <Card>
  <SectionHeading title="Expenses and maintenance" subtitle="Payer and ultimately responsible party are recorded separately." action={<div className="download-buttons"><Button variant="outline" asChild><Link href="/expenses/daily">Daily inspection</Link></Button><Button onClick={()=>rf.openEntry('Expense')}><Plus size={16}/> Record expense</Button></div>}/>
  <FilterToolbar filters={[{param:'owner',label:'Filter by owner',allValue:ALL_OWNERS,options:owners},{param:'status',label:'Filter by status',allValue:'All',options:['Posted','Pending approval','Reversed']}]}/>
  <EntriesLedger entries={entries} store={rf.store} onSelect={rf.setSelected}/>
 </Card>;
}
