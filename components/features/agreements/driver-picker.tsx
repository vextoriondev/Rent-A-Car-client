"use client";
import {useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {Input} from '@/components/ui/input';

export type DriverOption={id:number;name:string};

/** Driver name box that lists the drivers already created as soon as it is clicked, narrows the list as you type, and says plainly when the name is new. */
export function DriverPicker({value,drivers,onChange}:{value:string;drivers:DriverOption[];onChange:(name:string,match:DriverOption|undefined)=>void}){
 const [open,setOpen]=useState(false);
 const typed=value.trim().toLowerCase();
 const match=drivers.find(d=>d.name.toLowerCase()===typed);
 const shown=drivers.filter(d=>d.name.toLowerCase().includes(typed));
 const pick=(d:DriverOption)=>{onChange(d.name,d);setOpen(false)};
 return <div>
  <div className="relative">
   <Input value={value} autoComplete="off" role="combobox" aria-expanded={open} aria-label="Assigned driver" placeholder="Click to choose a driver, or type a new name"
    onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);else setOpen(true)}}
    onChange={e=>{setOpen(true);onChange(e.target.value,drivers.find(d=>d.name.toLowerCase()===e.target.value.trim().toLowerCase()))}}/>
   <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-50"/>
  </div>
  {open&&<ul role="listbox" className="mt-1 max-h-48 overflow-y-auto rounded-md border bg-white p-1 shadow-sm">
   {shown.map(d=><li key={d.id} role="option" aria-selected={d.id===match?.id}>
    <button type="button" className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100" onMouseDown={e=>{e.preventDefault();pick(d)}}>{d.name}</button>
   </li>)}
   {shown.length===0&&<li className="px-3 py-2 text-sm opacity-70">{drivers.length===0?'No drivers created yet.':'No driver matches this name.'}</li>}
  </ul>}
  {value.trim()&&<p className="note">{match?'Existing driver selected.':'New driver: this name will be created when you activate the agreement.'}</p>}
 </div>;
}
