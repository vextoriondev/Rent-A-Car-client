"use client";
import type {ReactNode} from 'react';
import {ArrowDown,ArrowUp,ArrowUpDown,ChevronRight} from 'lucide-react';
import {flexRender,getCoreRowModel,getSortedRowModel,useReactTable,type ColumnDef,type OnChangeFn,type SortingState} from '@tanstack/react-table';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';

declare module '@tanstack/react-table'{
 // eslint-disable-next-line @typescript-eslint/no-unused-vars
 interface ColumnMeta<TData,TValue>{align?:'right';className?:string}
}

/** Sortable, keyboard-accessible ledger table on TanStack Table + components/ui/table. Sorting is controlled so callers can back it with the URL. */
export function LedgerTable<T>({data,columns,getRowId,onRowClick,rowActionLabel,sorting,onSortingChange,empty}:{
 data:T[];columns:ColumnDef<T,any>[];getRowId:(row:T)=>string;onRowClick?:(row:T)=>void;
 /** When set, adds a trailing chevron button labelled by this function (the row itself stays mouse-clickable). */
 rowActionLabel?:(row:T)=>string;
 sorting:SortingState;onSortingChange:OnChangeFn<SortingState>;empty?:ReactNode;
}){
 const table=useReactTable({data,columns,getRowId,state:{sorting},onSortingChange,enableSortingRemoval:false,getCoreRowModel:getCoreRowModel(),getSortedRowModel:getSortedRowModel()});
 const rows=table.getRowModel().rows;
 return <>
  <Table>
   <TableHeader>{table.getHeaderGroups().map(hg=><TableRow key={hg.id}>{hg.headers.map(h=>{
    const col=h.column;const dir=col.getIsSorted();
    const label=h.isPlaceholder?null:flexRender(col.columnDef.header,h.getContext());
    const align=col.columnDef.meta?.align==='right'?'text-right':undefined;
    return <TableHead key={h.id} className={align} aria-sort={dir==='asc'?'ascending':dir==='desc'?'descending':col.getCanSort()?'none':undefined}>
     {col.getCanSort()?<button type="button" className="sort-button" onClick={col.getToggleSortingHandler()}>{label}{dir==='asc'?<ArrowUp size={12}/>:dir==='desc'?<ArrowDown size={12}/>:<ArrowUpDown size={12} className="sort-idle"/>}</button>:label}
    </TableHead>;
   })}{rowActionLabel&&<TableHead><span className="sr-only">Actions</span></TableHead>}</TableRow>)}</TableHeader>
   <TableBody>{rows.map(r=><TableRow key={r.id} className={onRowClick?'click-row':undefined} onClick={onRowClick?()=>onRowClick(r.original):undefined}>
    {r.getVisibleCells().map(c=><TableCell key={c.id} className={[c.column.columnDef.meta?.align==='right'?'text-right nums':'',c.column.columnDef.meta?.className||''].join(' ').trim()||undefined}>{flexRender(c.column.columnDef.cell,c.getContext())}</TableCell>)}
    {rowActionLabel&&<TableCell><button type="button" aria-label={rowActionLabel(r.original)} className="row-link"><ChevronRight size={18}/></button></TableCell>}
   </TableRow>)}</TableBody>
  </Table>
  {rows.length===0&&empty}
 </>;
}
