"use client";
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useParams,useRouter} from 'next/navigation';
import {apiMode,apiRequest} from '@/lib/api';
import {usePeriod} from '@/lib/period';
import {useExpenseCategories} from '@/lib/use-expense-categories';
import {Badge} from '@/components/ui/badge';
import {Card} from '@/components/ui/card';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Table,TableBody,TableCell,TableFooter,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {DownloadButtons} from '@/components/shared/download-buttons';
import {EmptyState} from '@/components/shared/empty-state';
import {ErrorState} from '@/components/shared/error-state';
import {Money} from '@/components/shared/money';
import {SectionHeading} from '@/components/shared/section-heading';

type Report={columns:string[];rows:string[][];totals:Record<string,string>;count:number};

/** Posted cost of one category per vehicle for the period picker's dates (GET /reports/category-by-vehicle). A deactivated category still works. */
export function CategoryCost(){
 const code=decodeURIComponent(String(useParams<{code:string}>().code??''));
 const router=useRouter();
 const {range,label,stem:periodStem}=usePeriod();
 const {categories,orgId}=useExpenseCategories();
 const [data,setData]=useState<Report|null>(null);
 const [error,setError]=useState('');
 const category=categories?.find(c=>c.code===code);
 const query=useMemo(()=>new URLSearchParams({category:code,from:range.from,to:range.to}).toString(),[code,range]);

 useEffect(()=>{
  if(!apiMode||!orgId)return;
  let stale=false;
  apiRequest(`/orgs/${orgId}/reports/category-by-vehicle?${query}&limit=200`).then(d=>{if(!stale){setData(d);setError('')}}).catch(e=>{if(!stale){setData(null);setError((e as Error).message)}});
  return()=>{stale=true};
 },[orgId,query]);

 const name=category?.name??code;
 const scope=`Category: ${name}; Period: ${label}`;
 const table=useMemo(()=>({title:`Cost category by vehicle: ${name}`,scope,columns:data?.columns??[],rows:data?.rows.map(r=>[r[0],r[1],Number(r[2]),Number(r[3])])??[],totals:data?['Total','','',Number(data.totals['Amount BDT'])]:undefined}),[data,name,scope]);
 if(!apiMode)return <Card><SectionHeading title="Cost by category"/><EmptyState title="API mode only" description="Cost categories read the Django backend. In this demo, filter Expenses by category."/></Card>;
 const total=data?Number(data.totals['Amount BDT']):0;

 return <Card>
  <SectionHeading title={`${name} cost by vehicle`} subtitle={`Posted entries dated ${label}. Change the dates with the period picker above.`} action={<div className="download-buttons"><Link className="text-button" href="/settings">Cost categories</Link>{data&&<DownloadButtons table={table} stem={`rentflow-category-${code}-${periodStem}`} serverPath={`/orgs/${orgId}/reports/category-by-vehicle/export?${query}`}/>}</div>}/>
  <div className="toolbar daily-filters">
   <Select value={code} onValueChange={v=>router.push(`/expenses/categories/${v}${typeof window!=='undefined'?window.location.search:''}`)}>
    <SelectTrigger aria-label="Category"><SelectValue/></SelectTrigger>
    <SelectContent>{(categories??[]).map(c=><SelectItem key={c.code} value={c.code}>{c.active?c.name:`${c.name} (inactive)`}</SelectItem>)}</SelectContent>
   </Select>
   {category&&!category.active&&<Badge tone="neutral">Inactive: kept for history, not offered on new entries</Badge>}
  </div>
  {error&&<ErrorState message={error}/>}
  {data&&data.rows.length===0&&<EmptyState title="No posted cost in this period" description="Try a wider period or another category."/>}
  {data&&data.rows.length>0&&<Table>
   <TableHeader><TableRow>{data.columns.map((c,i)=><TableHead key={c} className={i>=2?'text-right':undefined}>{c}</TableHead>)}</TableRow></TableHeader>
   <TableBody>{data.rows.map((r,i)=><TableRow key={i}><TableCell>{r[0]}</TableCell><TableCell>{r[1]}</TableCell><TableCell className="text-right nums">{r[2]}</TableCell><TableCell className="text-right nums"><Money value={Number(r[3])}/></TableCell></TableRow>)}</TableBody>
   <TableFooter><TableRow><TableCell colSpan={2}>Total ({data.count} {data.count===1?'vehicle':'vehicles'})</TableCell><TableCell/><TableCell className="text-right nums"><Money value={total}/></TableCell></TableRow></TableFooter>
  </Table>}
 </Card>;
}
