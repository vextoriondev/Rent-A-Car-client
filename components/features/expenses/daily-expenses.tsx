"use client";
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {apiMode,apiRequest} from '@/lib/api';
import {fmtDate} from '@/lib/format';
import {usePeriod} from '@/lib/period';
import {useQueryParam} from '@/lib/use-list-filters';
import {useRentflowStore} from '@/lib/store-context';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Table,TableBody,TableCell,TableFooter,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {Badge} from '@/components/ui/badge';
import {DownloadButtons} from '@/components/shared/download-buttons';
import {EmptyState} from '@/components/shared/empty-state';
import {ErrorState} from '@/components/shared/error-state';
import {Money} from '@/components/shared/money';
import {SectionHeading} from '@/components/shared/section-heading';

type Report={columns:string[];rows:string[][];totals:Record<string,string>;breakdowns:{by_category:Record<string,string>;by_responsible:Record<string,string>};count:number};
type Category={id:number;code:string;name:string;active:boolean};
const ALL='All';
const PARTIES=['operator','owner','customer','driver'];
const STATES=['posted','pending','reversed','draft'];
const stateTone={Posted:'good',Reversed:'bad',Draft:'neutral'} as const;
const shift=(d:string,n:number)=>{const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const title=(s:string)=>s.charAt(0).toUpperCase()+s.slice(1);

/** One day of expenses for inspection (GET /reports/daily-expenses): filters, totals footer, and the server CSV as "Download Excel". Totals count posted entries only. */
export function DailyExpenses(){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const {range}=usePeriod();
 const [date,setDate]=useQueryParam('date',range.from);
 const [agreement,setAgreement]=useQueryParam('agreement',ALL);
 const [category,setCategory]=useQueryParam('category',ALL);
 const [paidBy,setPaidBy]=useQueryParam('paid_by',ALL);
 const [responsible,setResponsible]=useQueryParam('responsible',ALL);
 const [state,setState]=useQueryParam('state',ALL);
 const [categories,setCategories]=useState<Category[]>([]);
 const [data,setData]=useState<Report|null>(null);
 const [error,setError]=useState('');
 const validDate=/^\d{4}-\d{2}-\d{2}$/.test(date);

 const query=useMemo(()=>{
  const q=new URLSearchParams({date});
  if(agreement!==ALL)q.set('agreement_id',agreement.replace('AGR-',''));
  if(category!==ALL)q.set('category',category);
  if(paidBy!==ALL)q.set('paid_by',paidBy);
  if(responsible!==ALL)q.set('responsible',responsible);
  if(state!==ALL)q.set('state',state);
  return q.toString();
 },[date,agreement,category,paidBy,responsible,state]);

 useEffect(()=>{if(apiMode&&orgId)apiRequest(`/orgs/${orgId}/expense-categories`).then(setCategories).catch(()=>setCategories([]))},[orgId]);
 useEffect(()=>{
  if(!apiMode||!orgId||!validDate)return;
  let stale=false;
  apiRequest(`/orgs/${orgId}/reports/daily-expenses?${query}&limit=200`).then(d=>{if(!stale){setData(d);setError('')}}).catch(e=>{if(!stale){setData(null);setError((e as Error).message)}});
  return()=>{stale=true};
 },[orgId,query,validDate]);


 const scope=[`Date: ${date}`,agreement!==ALL&&`Agreement: ${agreement}`,category!==ALL&&`Category: ${category}`,paidBy!==ALL&&`Paid by: ${paidBy}`,responsible!==ALL&&`Responsible: ${responsible}`,state!==ALL&&`State: ${state}`].filter(Boolean).join('; ');
 const table=useMemo(()=>({title:'Daily expenses',scope,columns:data?.columns??[],rows:data?.rows.map(r=>r.map((c,i)=>i===3?Number(c):c))??[],totals:data?['Total (posted)','','',Number(data.totals['Amount BDT']),'','','','','']:undefined}),[data,scope]);
 if(!apiMode)return <Card><SectionHeading title="Daily expense inspection"/><EmptyState title="API mode only" description="The daily inspection reads the Django backend. In this demo, use Expenses with the period picker set to a single day."/></Card>;
 const stem=`rentflow-daily-expenses-${date}`;
 const num=(v:string)=>Number(v);
 const select=(label:string,value:string,set:(v:string)=>void,options:{value:string;label:string}[])=>
  <Select value={value} onValueChange={set}><SelectTrigger aria-label={label}><SelectValue/></SelectTrigger><SelectContent><SelectItem value={ALL}>{ALL}</SelectItem>{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>;

 return <>
  <Card>
   <SectionHeading title="Daily expense inspection" subtitle="Everything recorded for one day, with who paid and who is responsible. Totals count posted entries only." action={<div className="download-buttons"><Link className="text-button" href="/expenses">All expenses</Link>{data&&<DownloadButtons table={table} stem={stem} serverPath={`/orgs/${orgId}/reports/daily-expenses/export?${query}`}/>}</div>}/>
   <div className="daily-day">
    <Button variant="outline" size="sm" aria-label="Previous day" disabled={!validDate} onClick={()=>setDate(shift(date,-1))}><ChevronLeft size={16}/></Button>
    <label>Day<Input type="date" value={date} onChange={e=>e.target.value&&setDate(e.target.value)}/></label>
    <Button variant="outline" size="sm" aria-label="Next day" disabled={!validDate} onClick={()=>setDate(shift(date,1))}><ChevronRight size={16}/></Button>
    {validDate&&<strong>{fmtDate(date)}</strong>}
   </div>
   <div className="toolbar daily-filters">
    {select('Filter by agreement',agreement,setAgreement,rf.store.agreements.map(a=>({value:a.id,label:`${a.registration} · ${a.id}`})))}
    {select('Filter by category',category,setCategory,categories.map(c=>({value:c.code,label:c.active?c.name:`${c.name} (inactive)`})))}
    {select('Filter by paid by',paidBy,setPaidBy,PARTIES.map(p=>({value:p,label:title(p)})))}
    {select('Filter by responsible',responsible,setResponsible,PARTIES.map(p=>({value:p,label:title(p)})))}
    {select('Filter by state',state,setState,STATES.map(p=>({value:p,label:title(p)})))}
   </div>
   {!validDate&&<ErrorState message="Pick a valid day."/>}
   {error&&<ErrorState message={error}/>}
   {data&&data.rows.length===0&&<EmptyState title="No expenses recorded on this day" description="Try another day or clear a filter."/>}
   {data&&data.rows.length>0&&<Table>
    <TableHeader><TableRow>{data.columns.map((c,i)=><TableHead key={c} className={i===3?'text-right':undefined}>{c}</TableHead>)}</TableRow></TableHeader>
    <TableBody>{data.rows.map((r,i)=><TableRow key={i}>{r.map((c,j)=><TableCell key={j} className={j===3?'text-right nums':undefined}>{j===3?<Money value={num(c)}/>:j===6?<Badge tone={stateTone[c as keyof typeof stateTone]??'warn'}>{c}</Badge>:c}</TableCell>)}</TableRow>)}</TableBody>
    <TableFooter><TableRow><TableCell colSpan={3}>Total (posted entries)</TableCell><TableCell className="text-right nums"><Money value={num(data.totals['Amount BDT'])}/></TableCell><TableCell colSpan={5}>{data.count} {data.count===1?'entry':'entries'} listed</TableCell></TableRow></TableFooter>
   </Table>}
  </Card>
  {data&&data.rows.length>0&&<div className="daily-breakdowns">
   {([['By category',data.breakdowns.by_category],['By responsible party',data.breakdowns.by_responsible]] as const).map(([name,part])=><Card key={name}><SectionHeading title={name}/>
    {Object.keys(part).length===0?<p className="note">No posted entries.</p>:<Table><TableBody>{Object.entries(part).map(([k,v])=><TableRow key={k}><TableCell>{k}</TableCell><TableCell className="text-right nums"><Money value={num(v)}/></TableCell></TableRow>)}</TableBody></Table>}
   </Card>)}
  </div>}
 </>;
}
