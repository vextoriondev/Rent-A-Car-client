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
import {partyHref} from '@/lib/party-link';
import {PartyChip} from '@/components/shared/party-chip';
import {t} from '@/lib/copy';
import {partyLabel} from '@/lib/copy/labels';

type Role='Customer'|'Owner'|'Driver';
type Row={a:Agreement;s:ReturnType<typeof statement>};

const config={
 Customer:{name:(a:Agreement)=>a.customer,gross:(a:Agreement)=>a.rent,due:(s:Row['s'])=>s.customerDue,get grossLabel(){return t('parties.partyAccounts.billedRent')},get dueLabel(){return t('ledger.stillToPay')}},
 Owner:{name:(a:Agreement)=>a.owner,gross:(a:Agreement)=>a.ownerRent,due:(s:Row['s'])=>s.ownerDue,get grossLabel(){return t('parties.partyAccounts.grossEntitlement')},get dueLabel(){return t('parties.partyAccounts.amountDue')}},
 Driver:{name:(a:Agreement)=>a.noDriver?t('common.noDriver'):a.driver,gross:(a:Agreement)=>a.salary,due:(s:Row['s'])=>s.driverDue,get grossLabel(){return t('common.salaryEarned')},get dueLabel(){return t('parties.partyAccounts.amountDue')}},
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
  {id:'party',header:partyLabel(role),accessorFn:r=>c.name(r.a),sortingFn:(x,y)=>c.name(x.original.a).localeCompare(c.name(y.original.a)),cell:({row:{original:r}})=><PartyChip name={c.name(r.a)} role={role} href={partyHref(role,r.a)}/>},
  {id:'vehicle',header:t('ledger.carAgreement'),enableSorting:false,cell:({row:{original:r}})=><>{r.a.vehicle}<small>{r.a.id}</small></>},
  {id:'gross',header:c.grossLabel,accessorFn:r=>c.gross(r.a),meta:{align:'right'},cell:({row:{original:r}})=><Money value={c.gross(r.a)}/>},
  {id:'due',header:c.dueLabel,accessorFn:r=>c.due(r.s),meta:{align:'right',className:'due'},cell:({row:{original:r}})=><Money value={c.due(r.s)}/>},
 ],[role,c]);
 return <Card>
  <SectionHeading title={t('ledger.accountsTitle',{party: partyLabel(role)})} subtitle={t('parties.partyAccounts.selectAPersonTo')}/>
  <LedgerTable data={rows} columns={columns} getRowId={r=>r.a.id} sorting={sorting} onSortingChange={onSortingChange} onRowClick={r=>rf.setSelected(r.a.id)} rowActionLabel={r=>t('table.openRow',{id: r.a.id})} empty={<EmptyState title={t('parties.partyAccounts.noMatchingAccounts')}/>}/>
 </Card>;
}
