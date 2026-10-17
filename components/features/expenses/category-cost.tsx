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
import {t,tn} from '@/lib/copy';
import {categoryName} from '@/lib/copy/labels';

type Report={columns:string[];column_ids:string[];rows:string[][];totals:Record<string,string>;count:number};

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

 const name=category?categoryName(category.code,category.name):code;
 const scope=t('catCost.scope',{name, label});
 const table=useMemo(()=>({title: t('expenses.categoryCost.costCategoryByVehicle', {name}),scope,columns:data?.columns??[],rows:data?.rows.map(r=>[r[0],r[1],Number(r[2]),Number(r[3])])??[],totals:data?[t('catCost.total'),'','',Number(data.totals.amount)]:undefined}),[data,name,scope]);
 if(!apiMode)return <Card><SectionHeading title={t('expenses.categoryCost.costByCategory')}/><EmptyState title={t('common.apiModeOnly')} description={t('expenses.categoryCost.costCategoriesReadThe')}/></Card>;
 const total=data?Number(data.totals.amount):0;

 return <Card>
  <SectionHeading title={t('catCost.title',{name})} subtitle={t('catCost.subtitle',{label})} action={<div className="download-buttons"><Link className="text-button" href="/settings">{t('common.costCategories')}</Link>{data&&<DownloadButtons table={table} stem={`rentflow-category-${code}-${periodStem}`} serverPath={`/orgs/${orgId}/reports/category-by-vehicle/export?${query}`}/>}</div>}/>
  <div className="toolbar daily-filters">
   <Select value={code} onValueChange={v=>router.push(`/expenses/categories/${v}${typeof window!=='undefined'?window.location.search:''}`)}>
    <SelectTrigger aria-label={t('common.category')}><SelectValue/></SelectTrigger>
    <SelectContent>{(categories??[]).map(c=><SelectItem key={c.code} value={c.code}>{c.active?categoryName(c.code,c.name):t('catCost.inactive',{name: categoryName(c.code,c.name)})}</SelectItem>)}</SelectContent>
   </Select>
   {category&&!category.active&&<Badge tone="neutral">{t('expenses.categoryCost.inactiveKeptForHistory')}</Badge>}
  </div>
  {error&&<ErrorState message={error}/>}
  {data&&data.rows.length===0&&<EmptyState title={t('expenses.categoryCost.noPostedCostIn')} description={t('expenses.categoryCost.tryAWiderPeriod')}/>}
  {data&&data.rows.length>0&&<Table>
   <TableHeader><TableRow>{data.columns.map((c,i)=><TableHead key={data.column_ids[i]} className={i>=2?'text-right':undefined}>{c}</TableHead>)}</TableRow></TableHeader>
   <TableBody>{data.rows.map((r,i)=><TableRow key={i}><TableCell>{r[0]}</TableCell><TableCell>{r[1]}</TableCell><TableCell className="text-right nums">{r[2]}</TableCell><TableCell className="text-right nums"><Money value={Number(r[3])}/></TableCell></TableRow>)}</TableBody>
   <TableFooter><TableRow><TableCell colSpan={2}>{tn('catCost.footer',data.count)}</TableCell><TableCell/><TableCell className="text-right nums"><Money value={total}/></TableCell></TableRow></TableFooter>
  </Table>}
 </Card>;
}
