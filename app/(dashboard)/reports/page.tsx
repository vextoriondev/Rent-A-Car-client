"use client";
import {useMemo} from 'react';
import {useRentflowStore} from '@/lib/store-context';
import {useQueryParam} from '@/lib/use-list-filters';
import {ALL_OWNERS,useRelatedAgreements} from '@/lib/use-related-agreements';
import {usePeriod} from '@/lib/period';
import {fileStem,reportConfig,reportSlug,reportTable,reportTypeLabel,reportTypes,scopeText} from '@/lib/reports';
import {partyLabel} from '@/lib/copy/labels';
import {DownloadButtons} from '@/components/shared/download-buttons';
import {SectionHeading} from '@/components/shared/section-heading';
import {Card} from '@/components/ui/card';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {FilterSelect} from '@/components/shared/filter-toolbar';
import {apiMode} from '@/lib/api';
import {ApiReports} from '@/components/features/reports/api-reports';
import {StatementLedger,type StatementColumn} from '@/components/features/accounts/statement-ledger';
import {t,dateLocale} from '@/lib/copy';

export default function ReportsPage(){return apiMode?<ApiReports/>:<DemoReports/>}

function DemoReports(){
 const rf=useRentflowStore();
 const {agreements,owners}=useRelatedAgreements();
 const [type,setType]=useQueryParam('type',reportTypes[0]);
 const [owner]=useQueryParam('owner',ALL_OWNERS);
 const [q]=useQueryParam('q');
 const period=usePeriod();
 const monthName=new Date((rf.store.backend?.shownMonth??period.lastMonth)+'T12:00:00').toLocaleDateString(dateLocale(),{month:'long',year:'numeric'});
 const config=useMemo(()=>reportConfig(type),[type]);
 const columns=useMemo<StatementColumn[]>(()=>config.columns.map((label,i)=>({label,value:(a,s)=>config.values(a,s)[i]})),[config]);
 const table=useMemo(()=>reportTable(type,agreements,rf.store.entries,scopeText([{label: t('common.owner'),value:owner,all:ALL_OWNERS},{label: t('common.search'),value:q,all:''}],monthName)),[type,agreements,rf.store.entries,owner,q,monthName]);
 // The server export covers the whole report, so it is used only when nothing on screen narrows it.
 const unscoped=owner===ALL_OWNERS&&!q;
 const serverPath=unscoped&&rf.store.backend?`/orgs/${rf.store.backend.orgId}/reports/${reportSlug(type)}/export?from=${period.range.from}&to=${period.range.to}`:undefined;
 return <>
  <div className="report-header"><Card>
   <span className="eyebrow">{t('common.reportBuilder')}</span><h2>{t('reports.summaryTitle',{period: period.label})}</h2><p>{t('reports.selectAReportAnd')}</p>
   <div className="report-controls">
    <Select value={type} onValueChange={setType}><SelectTrigger aria-label={t('common.reportType')}><SelectValue/></SelectTrigger><SelectContent>{reportTypes.map(r=><SelectItem key={r} value={r}>{reportTypeLabel(r)}</SelectItem>)}</SelectContent></Select>
    <FilterSelect param="owner" label={t('reports.filterReportByOwner')} allValue={ALL_OWNERS} allLabel={t('common.allOwners')} options={owners}/>
    <DownloadButtons table={table} stem={fileStem(type,period.lastMonth.slice(0,7))} serverPath={serverPath}/>
   </div>
  </Card></div>
  <Card>
   <SectionHeading title={reportTypeLabel(type)} subtitle={t('reports.agreementsShown',{count: agreements.length})}/>
   <StatementLedger party={config.party} partyHeader={t('reports.partyVehicle',{party: partyLabel(config.party)})} columns={columns} agreements={agreements} store={rf.store} onSelect={rf.setSelected} signed emptyTitle={t('reports.noAgreementsMatchThis')}/>
  </Card>
 </>;
}
