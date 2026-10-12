"use client";
import {useMemo} from 'react';
import type {ColumnDef} from '@tanstack/react-table';
import {statement,type Agreement,type Store} from '@/lib/demo';
import {Badge} from '@/components/ui/badge';
import {EmptyState} from '@/components/shared/empty-state';
import {LedgerTable} from '@/components/shared/ledger-table';
import {BillStateChip} from '@/components/shared/bill-state-chip';
import {customerBillState,payableBillState} from '@/lib/bill-state';
import {Money} from '@/components/shared/money';
import {PartyChip} from '@/components/shared/party-chip';
import {useSortParam} from '@/lib/use-list-filters';
import {useBillStates} from '@/lib/use-bill-states';

type Row={a:Agreement;s:ReturnType<typeof statement>;closed:boolean};

/** Per-agreement customer/owner/driver balance overview (Overview and Billing screens). */
export function AccountsLedger({agreements,store,onSelect}:{agreements:Agreement[];store:Store;onSelect:(id:string)=>void}){
 const [sorting,onSortingChange]=useSortParam('customer');
 const billStates=useBillStates();
 const rows=useMemo<Row[]>(()=>agreements.map(a=>({a,s:statement(a,store.entries),closed:store.closed.includes(a.id)})),[agreements,store.entries,store.closed]);
 const columns=useMemo<ColumnDef<Row>[]>(()=>[
  {id:'customer',header:'Customer / vehicle',accessorFn:r=>r.a.customer,sortingFn:(x,y)=>x.original.a.customer.localeCompare(y.original.a.customer),cell:({row:{original:r}})=><PartyChip name={r.a.customer} role="Customer" detail={`${r.a.vehicle} · ${r.a.id}`}/>},
  {id:'billed',header:'Billed',accessorFn:r=>r.a.rent,meta:{align:'right'},cell:({row:{original:r}})=><Money value={r.a.rent}/>},
  {id:'received',header:'Received',accessorFn:r=>r.s.received,meta:{align:'right'},cell:({row:{original:r}})=><Money value={r.s.received}/>},
  {id:'due',header:'Customer due',accessorFn:r=>r.s.customerDue,meta:{align:'right',className:'due'},cell:({row:{original:r}})=><Money value={r.s.customerDue} state={billStates[r.a.id]?.customer??customerBillState(r.s.customerDue)}/>},
  {id:'ownerDue',header:'Owner due',accessorFn:r=>r.s.ownerDue,meta:{align:'right'},cell:({row:{original:r}})=><Money value={r.s.ownerDue} state={billStates[r.a.id]?.owner??payableBillState(r.s.ownerDue)}/>},
  {id:'driverDue',header:'Driver due',accessorFn:r=>r.s.driverDue,meta:{align:'right'},cell:({row:{original:r}})=>r.a.noDriver?<span>-</span>:<Money value={r.s.driverDue} state={billStates[r.a.id]?.driver??payableBillState(r.s.driverDue)}/>},
  {id:'bill',header:'Bill',enableSorting:false,cell:({row:{original:r}})=><BillStateChip state={billStates[r.a.id]?.customer??customerBillState(r.s.customerDue)}/>},
  {id:'status',header:'Status',enableSorting:false,cell:({row:{original:r}})=><Badge tone={r.closed?'good':'blue'}>{r.closed?'Closed':'Open'}</Badge>},
 ],[billStates]);
 return <LedgerTable data={rows} columns={columns} getRowId={r=>r.a.id} sorting={sorting} onSortingChange={onSortingChange} onRowClick={r=>onSelect(r.a.id)} rowActionLabel={r=>'View '+r.a.id} empty={<EmptyState title="No accounts match your search."/>}/>;
}
