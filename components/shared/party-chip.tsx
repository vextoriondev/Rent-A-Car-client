import type {ReactNode} from 'react';

export type PartyRole='Customer'|'Owner'|'Driver'|'Operator';

/** Name cell for a customer/owner/driver. `detail` is the optional second line (e.g. the driver under an owner). Renders a button when `onClick` is given. */
export function PartyChip({name,role,detail,onClick}:{name:string;role:PartyRole;detail?:ReactNode;onClick?:()=>void}){
 const content=<><b>{name}</b>{detail&&<small>{detail}</small>}</>;
 if(onClick)return <button type="button" className="party-chip" data-role={role} aria-label={`${role}: ${name}`} onClick={e=>{e.stopPropagation();onClick()}}>{content}</button>;
 return <span className="party-chip" data-role={role}>{content}</span>;
}
