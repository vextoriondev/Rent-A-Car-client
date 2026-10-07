"use client";
import {useMemo} from 'react';
import {useRentflowStore} from '@/lib/store-context';
import {useQueryParam} from '@/lib/use-list-filters';
import {ALL_OWNERS,useRelatedAgreements} from '@/lib/use-related-agreements';
import {entriesTable,fileStem,scopeText} from '@/lib/reports';
import {DownloadButtons} from '@/components/shared/download-buttons';
import {SectionHeading} from '@/components/shared/section-heading';
import {Card} from '@/components/ui/card';
import {FilterToolbar} from '@/components/shared/filter-toolbar';
import {EntriesLedger} from '@/components/features/entries/entries-ledger';

export default function CashbookPage(){
 const rf=useRentflowStore();
 const {agreements,owners}=useRelatedAgreements();
 const [status]=useQueryParam('status','All');
 const [owner]=useQueryParam('owner',ALL_OWNERS);
 const [q]=useQueryParam('q');
 const entries=useMemo(()=>rf.store.entries.filter(e=>(status==='All'||e.status===status)&&agreements.some(a=>a.id===e.agreementId)),[rf.store.entries,status,agreements]);
 const table=useMemo(()=>entriesTable(entries,scopeText([{label:'Owner',value:owner,all:ALL_OWNERS},{label:'Status',value:status,all:'All'},{label:'Search',value:q,all:''}])),[entries,owner,status,q]);
 return <Card>
  <SectionHeading title="Cashbook and entries" subtitle="Recorded receipts, expenses, advances and payouts." action={<DownloadButtons table={table} stem={fileStem('entries')}/>}/>
  <FilterToolbar filters={[{param:'owner',label:'Filter by owner',allValue:ALL_OWNERS,options:owners},{param:'status',label:'Filter by status',allValue:'All',options:['Posted','Pending approval','Reversed']}]}/>
  <EntriesLedger entries={entries} store={rf.store} onSelect={rf.setSelected}/>
 </Card>;
}
