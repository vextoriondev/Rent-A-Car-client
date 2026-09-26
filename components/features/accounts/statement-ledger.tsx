"use client";
import {useMemo} from 'react';
import type {ColumnDef} from '@tanstack/react-table';
import {statement,type Agreement,type Store} from '@/lib/demo';
import {partyName,type PartyKind} from '@/lib/reports';
import {EmptyState} from '@/components/shared/empty-state';
import {LedgerTable} from '@/components/shared/ledger-table';
import {Money} from '@/components/shared/money';
import {PartyChip} from '@/components/shared/party-chip';
import {useSortParam} from '@/lib/use-list-filters';

type Statement=ReturnType<typeof statement>;
export interface StatementColumn{label:string;value:(a:Agreement,s:Statement)=>number;due?:boolean}
type Row={a:Agreement;s:Statement};

const slug=(label:string)=>label.toLowerCase().replace(/[^a-z0-9]+/g,'-');

/** One party column plus numeric statement columns per agreement (Owner payables, Payroll, and every report type). */
export function StatementLedger({party,partyHeader,columns:spec,agreements,store,onSelect,signed=false,emptyTitle}:{
 party:PartyKind;partyHeader:string;columns:StatementColumn[];agreements:Agreement[];store:Store;onSelect:(id:string)=>void;
 /** Prefix negative amounts with a minus sign (reports). */
 signed?:boolean;emptyTitle:string;
}){
 const [sorting,onSortingChange]=useSortParam('party');
 const rows=useMemo<Row[]>(()=>agreements.map(a=>({a,s:statement(a,store.entries)})),[agreements,store.entries]);
 const columns=useMemo<ColumnDef<Row>[]>(()=>[
  {id:'party',header:partyHeader,accessorFn:r=>partyName(party,r.a),sortingFn:(x,y)=>partyName(party,x.original.a).localeCompare(partyName(party,y.original.a)),cell:({row:{original:r}})=><PartyChip name={partyName(party,r.a)} role={party} detail={`${r.a.vehicle} · ${r.a.id}`}/>},
  ...spec.map((c):ColumnDef<Row>=>({id:slug(c.label),header:c.label,accessorFn:r=>c.value(r.a,r.s),meta:{align:'right',className:c.due?'due':undefined},cell:({row:{original:r}})=><Money value={c.value(r.a,r.s)} signed={signed}/>})),
 ],[party,partyHeader,spec,signed]);
 return <LedgerTable data={rows} columns={columns} getRowId={r=>r.a.id} sorting={sorting} onSortingChange={onSortingChange} onRowClick={r=>onSelect(r.a.id)} rowActionLabel={r=>'View '+r.a.id} empty={<EmptyState title={emptyTitle}/>}/>;
}
