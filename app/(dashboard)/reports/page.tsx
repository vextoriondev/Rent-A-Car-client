"use client";
import {useMemo} from 'react';
import {useRentflowStore} from '@/lib/store-context';
import {useQueryParam} from '@/lib/use-list-filters';
import {ALL_OWNERS,useRelatedAgreements} from '@/lib/use-related-agreements';
import {usePeriod} from '@/lib/period';
import {fileStem,reportConfig,reportSlug,reportTable,reportTypes,scopeText} from '@/lib/reports';
import {DownloadButtons} from '@/components/shared/download-buttons';
import {SectionHeading} from '@/components/shared/section-heading';
import {Card} from '@/components/ui/card';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {FilterSelect} from '@/components/shared/filter-toolbar';
import {StatementLedger,type StatementColumn} from '@/components/features/accounts/statement-ledger';

export default function ReportsPage(){
 const rf=useRentflowStore();
 const {agreements,owners}=useRelatedAgreements();
 const [type,setType]=useQueryParam('type',reportTypes[0]);
 const [owner]=useQueryParam('owner',ALL_OWNERS);
 const [q]=useQueryParam('q');
 const period=usePeriod();
 const monthName=new Date((rf.store.backend?.shownMonth??period.lastMonth)+'T12:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'});
 const config=useMemo(()=>reportConfig(type),[type]);
 const columns=useMemo<StatementColumn[]>(()=>config.columns.map((label,i)=>({label,value:(a,s)=>config.values(a,s)[i]})),[config]);
 const table=useMemo(()=>reportTable(type,agreements,rf.store.entries,scopeText([{label:'Owner',value:owner,all:ALL_OWNERS},{label:'Search',value:q,all:''}],monthName)),[type,agreements,rf.store.entries,owner,q,monthName]);
 // The server export covers the whole report, so it is used only when nothing on screen narrows it.
 const unscoped=owner===ALL_OWNERS&&!q;
 const serverPath=unscoped&&rf.store.backend?`/orgs/${rf.store.backend.orgId}/reports/${reportSlug(type)}/export?from=${period.range.from}&to=${period.range.to}`:undefined;
 return <>
  <div className="report-header"><Card>
   <span className="eyebrow">REPORT BUILDER</span><h2>{period.label} account summary</h2><p>Select a report and apply the owner filter. Download what is on screen as CSV (opens in Excel) or PDF.</p>
   <div className="report-controls">
    <Select value={type} onValueChange={setType}><SelectTrigger aria-label="Report type"><SelectValue/></SelectTrigger><SelectContent>{reportTypes.map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
    <FilterSelect param="owner" label="Filter report by owner" allValue={ALL_OWNERS} options={owners}/>
    <DownloadButtons table={table} stem={fileStem(type,period.lastMonth.slice(0,7))} serverPath={serverPath}/>
   </div>
  </Card></div>
  <Card>
   <SectionHeading title={type} subtitle={`${agreements.length} agreements · generated from current demo entries`}/>
   <StatementLedger party={config.party} partyHeader={`${config.party} / vehicle`} columns={columns} agreements={agreements} store={rf.store} onSelect={rf.setSelected} signed emptyTitle="No agreements match this report filter."/>
  </Card>
 </>;
}
