"use client";
import {useMemo} from 'react';
import {useRentflowStore} from '@/lib/store-context';
import {useQueryParam} from '@/lib/use-list-filters';
import {usePeriod} from '@/lib/period';
import {useRangeEntries} from '@/lib/use-range-entries';
import {ALL_OWNERS,useRelatedAgreements} from '@/lib/use-related-agreements';
import {entriesTable,fileStem,scopeText} from '@/lib/reports';
import {DownloadButtons} from '@/components/shared/download-buttons';
import {SectionHeading} from '@/components/shared/section-heading';
import {Card} from '@/components/ui/card';
import {FilterToolbar} from '@/components/shared/filter-toolbar';
import {EntriesLedger} from '@/components/features/entries/entries-ledger';
import {t} from '@/lib/copy';
import {entryStatusLabel} from '@/lib/copy/labels';

export default function CashbookPage(){
 const rf=useRentflowStore();
 const {agreements,owners}=useRelatedAgreements();
 const period=usePeriod();
 const inPeriod=useRangeEntries();
 const [status]=useQueryParam('status','All');
 const [owner]=useQueryParam('owner',ALL_OWNERS);
 const [q]=useQueryParam('q');
 const entries=useMemo(()=>inPeriod.filter(e=>(status==='All'||e.status===status)&&agreements.some(a=>a.id===e.agreementId)),[inPeriod,status,agreements]);
 const table=useMemo(()=>entriesTable(entries,scopeText([{label: t('common.owner'),value:owner,all:ALL_OWNERS},{label: t('common.status'),value:status,all:'All'},{label: t('common.search'),value:q,all:''}],period.label)),[entries,owner,status,q,period.label]);
 return <Card>
  <SectionHeading title={t('common.cashbookAndEntries')} subtitle={t('cashbook.recordedReceiptsExpensesAdvances')} action={<DownloadButtons table={table} stem={fileStem('entries',period.stem)}/>}/>
  <FilterToolbar filters={[{param:'owner',label: t('common.filterByOwner'),allValue:ALL_OWNERS,allLabel:t('common.allOwners'),options:owners},{param:'status',label: t('common.filterByStatus'),allValue:'All',options:['Posted','Pending approval','Reversed'].map(v=>({value:v,label:entryStatusLabel(v)}))}]}/>
  <EntriesLedger entries={entries} store={rf.store} onSelect={rf.setSelected}/>
 </Card>;
}
