"use client";
import {useMemo} from 'react';
import type {ColumnDef} from '@tanstack/react-table';
import type {Entry,Store} from '@/lib/demo';
import {fmtDate} from '@/lib/format';
import {Badge} from '@/components/ui/badge';
import {EmptyState} from '@/components/shared/empty-state';
import {LedgerTable} from '@/components/shared/ledger-table';
import {Money} from '@/components/shared/money';
import {useSortParam} from '@/lib/use-list-filters';
import {t} from '@/lib/copy';
import {entryStatusLabel,entryTypeLabel,partyLabel} from '@/lib/copy/labels';

const statusTone=(s:Entry['status'])=>s==='Posted'?'good':s==='Reversed'?'bad':'warn';

/** Ledger of financial entries (expenses, cashbook). Newest event date first by default. */
export function EntriesLedger({entries,store,onSelect}:{entries:Entry[];store:Store;onSelect:(id:string)=>void}){
 const [sorting,onSortingChange]=useSortParam('-date');
 const columns=useMemo<ColumnDef<Entry>[]>(()=>[
  {id:'date',header:t('ledger.dateReference'),accessorFn:e=>e.date,cell:({row:{original:e}})=><>{fmtDate(e.date)}<small>{e.reference}</small></>},
  {id:'entry',header:t('ledger.entryCar'),enableSorting:false,cell:({row:{original:e}})=><><b>{entryTypeLabel(e.type)}</b><small>{store.agreements.find(a=>a.id===e.agreementId)?.vehicle} · {e.id}</small></>},
  {id:'paidBy',header:t('common.paidBy'),accessorFn:e=>e.paidBy,enableSorting:false,cell:({row:{original:e}})=>partyLabel(e.paidBy)},
  {id:'responsible',header:t('ledger.responsible'),accessorFn:e=>e.responsible,enableSorting:false,cell:({row:{original:e}})=>partyLabel(e.responsible)},
  {id:'recordedBy',header:t('entries.entriesLedger.recordedBy'),accessorFn:e=>e.recordedBy||'',enableSorting:false,cell:({row:{original:e}})=>e.recordedBy||'-'},
  {id:'amount',header:t('ledger.amount'),accessorFn:e=>e.amount,meta:{align:'right'},cell:({row:{original:e}})=><Money value={e.amount}/>},
  {id:'status',header:t('ledger.status'),enableSorting:false,cell:({row:{original:e}})=><Badge tone={statusTone(e.status)}>{entryStatusLabel(e.status)}</Badge>},
 ],[store.agreements]);
 return <LedgerTable data={entries} columns={columns} getRowId={e=>e.id} sorting={sorting} onSortingChange={onSortingChange} onRowClick={e=>onSelect(e.id)} rowActionLabel={e=>t('table.viewRow',{id: e.id})} empty={<EmptyState title={t('entries.entriesLedger.noEntriesMatchThese')}/>}/>;
}
