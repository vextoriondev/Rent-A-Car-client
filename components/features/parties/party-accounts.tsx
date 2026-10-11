"use client";
import {useMemo} from 'react';
import type {ColumnDef} from '@tanstack/react-table';
import {statement,type Agreement} from '@/lib/demo';
import {useRentflowStore} from '@/lib/store-context';
import {useSortParam} from '@/lib/use-list-filters';
import {useRelatedAgreements} from '@/lib/use-related-agreements';
import {SectionHeading} from '@/components/shared/section-heading';
import {Card} from '@/components/ui/card';
import {EmptyState} from '@/components/shared/empty-state';
import {LedgerTable} from '@/components/shared/ledger-table';
import {Money} from '@/components/shared/money';
import {PartyChip} from '@/components/shared/party-chip';

type Role='Customer'|'Owner'|'Driver';
type Row={a:Agreement;s:ReturnType<typeof statement>};

const config={
 Customer:{name:(a:Agreement)=>a.customer,gross:(a:Agreement)=>a.rent,due:(s:Row['s'])=>s.customerDue,grossLabel:'Billed rent',dueLabel:'Outstanding'},
 Owner:{name:(a:Agreement)=>a.owner,gross:(a:Agreement)=>a.ownerRent,due:(s:Row['s'])=>s.ownerDue,grossLabel:'Gross entitlement',dueLabel:'Amount due'},
 Driver:{name:(a:Agreement)=>a.noDriver?'No driver':a.driver,gross:(a:Agreement)=>a.salary,due:(s:Row['s'])=>s.driverDue,grossLabel:'Salary earned',dueLabel:'Amount due'},
} as const;

/** One screen for Customers, Owners and Drivers: the same ledger, parameterized by which party of each agreement it lists. */
export function PartyAccounts({role}:{role:Role}){
 const rf=useRentflowStore();
 const {store}=rf;
 const {agreements}=useRelatedAgreements();
 const [sorting,onSortingChange]=useSortParam('party');
 const c=config[role];
 const rows=useMemo<Row[]>(()=>agreements.filter(a=>role!=='Driver'||!a.noDriver).map(a=>({a,s:statement(a,store.entries)})),[agreements,store.entries,role]);
 const columns=useMemo<ColumnDef<Row>[]>(()=>[
  {id:'party',header:role,accessorFn:r=>c.name(r.a),sortingFn:(x,y)=>c.name(x.original.a).localeCompare(c.name(y.original.a)),cell:({row:{original:r}})=><PartyChip name={c.name(r.a)} role={role}/>},
  {id:'vehicle',header:'Vehicle / agreement',enableSorting:false,cell:({row:{original:r}})=><>{r.a.vehicle}<small>{r.a.id}</small></>},
  {id:'gross',header:c.grossLabel,accessorFn:r=>c.gross(r.a),meta:{align:'right'},cell:({row:{original:r}})=><Money value={c.gross(r.a)}/>},
  {id:'due',header:c.dueLabel,accessorFn:r=>c.due(r.s),meta:{align:'right',className:'due'},cell:({row:{original:r}})=><Money value={c.due(r.s)}/>},
 ],[role,c]);
 return <Card>
  <SectionHeading title={`${role} accounts`} subtitle="Select a person to inspect the related agreement and statement."/>
  <LedgerTable data={rows} columns={columns} getRowId={r=>r.a.id} sorting={sorting} onSortingChange={onSortingChange} onRowClick={r=>rf.setSelected(r.a.id)} rowActionLabel={r=>'Open '+r.a.id} empty={<EmptyState title="No matching accounts."/>}/>
 </Card>;
}
