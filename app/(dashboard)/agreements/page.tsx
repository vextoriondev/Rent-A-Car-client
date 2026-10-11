"use client";
import {useMemo} from 'react';
import {Plus} from 'lucide-react';
import type {ColumnDef} from '@tanstack/react-table';
import {driverLabel,money,type Agreement} from '@/lib/demo';
import {useRentflowStore} from '@/lib/store-context';
import {useSortParam} from '@/lib/use-list-filters';
import {ALL_OWNERS,useRelatedAgreements} from '@/lib/use-related-agreements';
import {SectionHeading} from '@/components/shared/section-heading';
import {Card} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {EmptyState} from '@/components/shared/empty-state';
import {FilterToolbar} from '@/components/shared/filter-toolbar';
import {LedgerTable} from '@/components/shared/ledger-table';
import {PartyChip} from '@/components/shared/party-chip';

export default function AgreementsPage(){
 const rf=useRentflowStore();
 const [sorting,onSortingChange]=useSortParam('customer');
 const {agreements:rows,owners}=useRelatedAgreements();
 const columns=useMemo<ColumnDef<Agreement>[]>(()=>[
  {id:'agreement',header:'Agreement / car',enableSorting:false,cell:({row:{original:a}})=><><b>{a.id}</b><small>{a.vehicle} · {a.registration}</small></>},
  {id:'customer',header:'Customer',accessorFn:a=>a.customer,sortingFn:(x,y)=>x.original.customer.localeCompare(y.original.customer),cell:({row:{original:a}})=><PartyChip name={a.customer} role="Customer"/>},
  {id:'owner',header:'Owner · driver',enableSorting:false,cell:({row:{original:a}})=><PartyChip name={a.owner} role="Owner" detail={driverLabel(a)}/>},
  {id:'rent',header:'Customer rent',accessorFn:a=>a.rent,meta:{align:'right'},cell:({row:{original:a}})=>money(a.rent)},
  {id:'status',header:'Status',enableSorting:false,cell:({row:{original:a}})=><Badge tone="good">{a.status}</Badge>},
 ],[]);
 return <Card>
  <SectionHeading title="Rental agreements" subtitle={`${rows.length} visible · monthly contracts`} action={<Button onClick={()=>{rf.setAgreementOpen(true)}}><Plus size={16}/> New agreement</Button>}/>
  <FilterToolbar filters={[{param:'owner',label:'Filter by owner',allValue:ALL_OWNERS,options:owners}]}/>
  <LedgerTable data={rows} columns={columns} getRowId={a=>a.id} sorting={sorting} onSortingChange={onSortingChange} onRowClick={a=>rf.setSelected(a.id)} rowActionLabel={a=>'Open '+a.id} empty={<EmptyState title="No agreements match this search." description="Clear your filters to see all accounts."/>}/>
 </Card>;
}
