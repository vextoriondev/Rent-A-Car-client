"use client";
import {useMemo} from 'react';
import {Download} from 'lucide-react';
import {useRentflowStore} from '@/lib/store-context';
import {useQueryParam} from '@/lib/use-list-filters';
import {ALL_OWNERS,useRelatedAgreements} from '@/lib/use-related-agreements';
import {exportEntriesCsv} from '@/lib/reports';
import {SectionHeading} from '@/components/shared/section-heading';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {FilterToolbar} from '@/components/shared/filter-toolbar';
import {EntriesLedger} from '@/components/features/entries/entries-ledger';

export default function CashbookPage(){
 const rf=useRentflowStore();
 const {agreements,owners}=useRelatedAgreements();
 const [status]=useQueryParam('status','All');
 const entries=useMemo(()=>rf.store.entries.filter(e=>(status==='All'||e.status===status)&&agreements.some(a=>a.id===e.agreementId)),[rf.store.entries,status,agreements]);
 return <Card>
  <SectionHeading title="Cashbook and entries" subtitle="Recorded receipts, expenses, advances and payouts." action={<Button variant="outline" onClick={()=>exportEntriesCsv(rf.store.entries,status)}><Download size={16}/> Export CSV</Button>}/>
  <FilterToolbar filters={[{param:'owner',label:'Filter by owner',allValue:ALL_OWNERS,options:owners},{param:'status',label:'Filter by status',allValue:'All',options:['Posted','Pending approval','Reversed']}]}/>
  <EntriesLedger entries={entries} store={rf.store} onSelect={rf.setSelected}/>
 </Card>;
}
