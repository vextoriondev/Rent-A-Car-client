"use client";
import {Filter} from 'lucide-react';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {useQueryParam} from '@/lib/use-list-filters';
import {t} from '@/lib/copy';

export interface ToolbarFilter{
 /** Query-string key the selection is stored under. */
 param:string;
 /** Accessible name for the select. */
 label:string;
 /** The "no filter" value; also the fallback when the param is absent, and it is never written to the URL. */
 allValue:string;
 options:(string|{value:string;label:string})[];
 /** What the "no filter" choice says on screen (defaults to "All"). */
 allLabel?:string;
}

export function FilterToolbar({filters}:{filters:ToolbarFilter[]}){
 return <div className="toolbar"><div className="filter-icon"><Filter size={16}/></div>{filters.map(f=><FilterSelect key={f.param} {...f}/>)}</div>;
}

export function FilterSelect({param,label,allValue,options,allLabel}:ToolbarFilter){
 const [value,setValue]=useQueryParam(param,allValue);
 return <Select value={value} onValueChange={setValue}><SelectTrigger aria-label={label}><SelectValue/></SelectTrigger><SelectContent><SelectItem value={allValue}>{allLabel??t('common.all')}</SelectItem>{options.map(o=>{const v=typeof o==='string'?o:o.value;return <SelectItem key={v} value={v}>{typeof o==='string'?o:o.label}</SelectItem>})}</SelectContent></Select>;
}
