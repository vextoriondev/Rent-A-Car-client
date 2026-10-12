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

type Report={title:string;columns:string[];rows:(string|number)[][];totals:Record<string,string>;count:number;next:number|null;bill_states?:BillState[]};
type ReportType={type:string;title:string};
const ALL='All';
/** These two have their own pages (a day picker; a category is required). */
const OWN_PAGE=['daily-expenses','category-by-vehicle'];
const isMoney=(c:string)=>c.endsWith('BDT');
const isCount=(c:string)=>c==='Entries'||c==='Days overdue';

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
 const scope=`Period: ${label}${agreement!==ALL?`; Agreement: ${agreement}`:''}`;
 const table=useMemo(()=>({title,scope,columns:data?.columns??[],rows:data?.rows.map(r=>r.map((c,i)=>data.columns[i]&&(isMoney(data.columns[i])||isCount(data.columns[i]))?Number(c):c))??[],totals:data&&Object.keys(data.totals).length?data.columns.map((c,i)=>i===0?'Total':data.totals[c]!==undefined?Number(data.totals[c]):''):undefined}),[data,title,scope]);
 const billed=!!data?.bill_states;
 return <>
  <div className="report-header"><Card>
   <span className="eyebrow">REPORT BUILDER</span><h2>{label} reports</h2><p>Reports use exactly the dates in the period picker. Balance reports add an Opening column (the balance before the first day); Outstanding or Due is the balance on the last day. Download the CSV (opens in Excel) or print to PDF.</p>
   <div className="report-controls">
    <Select value={type} onValueChange={setType}><SelectTrigger aria-label="Report type"><SelectValue/></SelectTrigger><SelectContent>{types.map(r=><SelectItem key={r.type} value={r.type}>{r.title}</SelectItem>)}</SelectContent></Select>
    <Select value={agreement} onValueChange={setAgreement}><SelectTrigger aria-label="Filter report by agreement"><SelectValue/></SelectTrigger><SelectContent><SelectItem value={ALL}>All agreements</SelectItem>{rf.store.agreements.map(a=><SelectItem key={a.id} value={a.id}>{a.registration} · {a.id}</SelectItem>)}</SelectContent></Select>
    {data&&<DownloadButtons table={table} stem={fileStem(type,stem)} serverPath={`/orgs/${orgId}/reports/${type}/export?${query}`}/>}
   </div>
   <p className="note"><Link className="text-button" href="/expenses/daily">Daily expense inspection</Link> · <Link className="text-button" href="/settings">Cost by category (open a category in Settings)</Link></p>
  </Card></div>
  <Card>
   <SectionHeading title={title} subtitle={data?`${data.count} ${data.count===1?'row':'rows'} · ${label}`:'Loading...'}/>
   {error&&<ErrorState message={error}/>}
   {data&&data.rows.length===0&&<EmptyState title="Nothing to report for this period" description="Try a wider period or clear the agreement filter."/>}
   {data&&data.rows.length>0&&<Table>
    <TableHeader><TableRow>{data.columns.map(c=><TableHead key={c} className={isMoney(c)||isCount(c)?'text-right':undefined}>{c}</TableHead>)}{billed&&<TableHead>Bill</TableHead>}</TableRow></TableHeader>
    <TableBody>{data.rows.map((r,i)=><TableRow key={i}>{r.map((c,j)=><TableCell key={j} className={isMoney(data.columns[j])||isCount(data.columns[j])?'text-right nums':undefined}>{isMoney(data.columns[j])?<Money value={Number(c)} signed/>:String(c)}</TableCell>)}{billed&&<TableCell>{data.bill_states![i]&&<BillStateChip state={data.bill_states![i]}/>}</TableCell>}</TableRow>)}</TableBody>
    {Object.keys(data.totals).length>0&&<TableFooter><TableRow>{data.columns.map((c,j)=><TableCell key={c} className={isMoney(c)?'text-right nums':undefined}>{j===0?'Total':data.totals[c]!==undefined?<Money value={Number(data.totals[c])} signed/>:''}</TableCell>)}{billed&&<TableCell/>}</TableRow></TableFooter>}
   </Table>}
   {data?.next!=null&&<p className="note">Showing the first {data.rows.length} of {data.count} rows on screen; the CSV contains every row.</p>}
  </Card>
 </>;
}
