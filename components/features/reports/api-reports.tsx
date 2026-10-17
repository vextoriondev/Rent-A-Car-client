"use client";
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {apiRequest} from '@/lib/api';
import {usePeriod} from '@/lib/period';
import {fileStem} from '@/lib/reports';
import {useRentflowStore} from '@/lib/store-context';
import {useQueryParam} from '@/lib/use-list-filters';
import type {BillState} from '@/lib/bill-state';
import {Card} from '@/components/ui/card';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Table,TableBody,TableCell,TableFooter,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {BillStateChip} from '@/components/shared/bill-state-chip';
import {DownloadButtons} from '@/components/shared/download-buttons';
import {EmptyState} from '@/components/shared/empty-state';
import {ErrorState} from '@/components/shared/error-state';
import {Money} from '@/components/shared/money';
import {SectionHeading} from '@/components/shared/section-heading';
import {t,tn} from '@/lib/copy';
import {fmtDay} from '@/lib/format';

type Report={title:string;columns:string[];column_ids:string[];column_types:('text'|'money'|'count'|'date')[];rows:(string|number)[][];totals:Record<string,string>;count:number;next:number|null;bill_states?:BillState[]};
type ReportType={type:string;title:string};
const ALL='All';
/** These two have their own pages (a day picker; a category is required). */
const OWN_PAGE=['daily-expenses','category-by-vehicle'];
type Kind='text'|'money'|'count'|'date';
const isNumber=(k?:Kind)=>k==='money'||k==='count';

/** API mode: every server report (GET /reports/{type}) for the period picker's dates, with the server CSV as the download. Bill colours come from the server's `bill_states`; the aging report's `Days overdue` is a column. */
export function ApiReports(){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const {range,label,stem}=usePeriod();
 const [type,setType]=useQueryParam('type','income');
 const [agreement,setAgreement]=useQueryParam('agreement',ALL);
 const [types,setTypes]=useState<ReportType[]>([]);
 const [data,setData]=useState<Report|null>(null);
 const [error,setError]=useState('');
 const query=useMemo(()=>{const q=new URLSearchParams({from:range.from,to:range.to});if(agreement!==ALL)q.set('agreement_id',agreement.replace('AGR-',''));return q.toString()},[range,agreement]);

 useEffect(()=>{if(orgId)apiRequest(`/orgs/${orgId}/report-types`).then((t:ReportType[])=>setTypes(t.filter(x=>!OWN_PAGE.includes(x.type)))).catch(e=>setError((e as Error).message))},[orgId]);
 useEffect(()=>{
  if(!orgId)return;
  let stale=false;setData(null);
  apiRequest(`/orgs/${orgId}/reports/${type}?${query}&limit=500`).then(d=>{if(!stale){setData(d);setError('')}}).catch(e=>{if(!stale){setError((e as Error).message)}});
  return()=>{stale=true};
 },[orgId,type,query]);

 const title=types.find(t=>t.type===type)?.title??type;
 const scope=t('rep.period',{label})+(agreement!==ALL?t('rep.agreementScope',{agreement}):'');
 const table=useMemo(()=>({title,scope,columns:data?.columns??[],rows:data?.rows.map(r=>r.map((c,i)=>isNumber(data.column_types[i])?Number(c):data.column_types[i]==='date'?fmtDay(String(c)):c))??[],totals:data&&Object.keys(data.totals).length?data.column_ids.map((id,i)=>i===0?t('rep.total'):data.totals[id]!==undefined?Number(data.totals[id]):''):undefined}),[data,title,scope]);
 const billed=!!data?.bill_states;
 return <>
  <div className="report-header"><Card>
   <span className="eyebrow">{t('common.reportBuilder')}</span><h2>{t('rep.heading',{label})}</h2><p>{t('rep.intro')}</p>
   <div className="report-controls">
    <Select value={type} onValueChange={setType}><SelectTrigger aria-label={t('common.reportType')}><SelectValue/></SelectTrigger><SelectContent>{types.map(r=><SelectItem key={r.type} value={r.type}>{r.title}</SelectItem>)}</SelectContent></Select>
    <Select value={agreement} onValueChange={setAgreement}><SelectTrigger aria-label={t('reports.apiReports.filterReportByAgreement')}><SelectValue/></SelectTrigger><SelectContent><SelectItem value={ALL}>{t('reports.apiReports.allAgreements')}</SelectItem>{rf.store.agreements.map(a=><SelectItem key={a.id} value={a.id}>{a.registration} · {a.id}</SelectItem>)}</SelectContent></Select>
    {data&&<DownloadButtons table={table} stem={fileStem(type,stem)} serverPath={`/orgs/${orgId}/reports/${type}/export?${query}`}/>}
   </div>
   <p className="note"><Link className="text-button" href="/expenses/daily">{t('common.dailyExpenseInspection')}</Link> · <Link className="text-button" href="/settings">{t('reports.apiReports.costByCategoryOpen')}</Link></p>
  </Card></div>
  <Card>
   <SectionHeading title={title} subtitle={data?tn('rep.rows',data.count)+' · '+label:t('rep.loading')}/>
   {error&&<ErrorState message={error}/>}
   {data&&data.rows.length===0&&<EmptyState title={t('reports.apiReports.nothingToReportFor')} description={t('reports.apiReports.tryAWiderPeriod')}/>}
   {data&&data.rows.length>0&&<Table>
    <TableHeader><TableRow>{data.columns.map((c,j)=><TableHead key={data.column_ids[j]} className={isNumber(data.column_types[j])?'text-right':undefined}>{c}</TableHead>)}{billed&&<TableHead>{t('common.bill')}</TableHead>}</TableRow></TableHeader>
    <TableBody>{data.rows.map((r,i)=><TableRow key={i}>{r.map((c,j)=><TableCell key={j} className={isNumber(data.column_types[j])?'text-right nums':undefined}>{data.column_types[j]==='money'?<Money value={Number(c)} signed/>:data.column_types[j]==='date'?fmtDay(String(c)):String(c)}</TableCell>)}{billed&&<TableCell>{data.bill_states![i]&&<BillStateChip state={data.bill_states![i]}/>}</TableCell>}</TableRow>)}</TableBody>
    {Object.keys(data.totals).length>0&&<TableFooter><TableRow>{data.column_ids.map((id,j)=><TableCell key={id} className={data.column_types[j]==='money'?'text-right nums':undefined}>{j===0?t('rep.total'):data.totals[id]!==undefined?(data.column_types[j]==='money'?<Money value={Number(data.totals[id])} signed/>:data.totals[id]):''}</TableCell>)}{billed&&<TableCell/>}</TableRow></TableFooter>}
   </Table>}
   {data?.next!=null&&<p className="note">{t('rep.first',{shown: data.rows.length, count: data.count})}</p>}
  </Card>
 </>;
}
