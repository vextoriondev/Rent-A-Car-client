import type {ReactNode} from 'react';
import Link from 'next/link';

export type PartyRole='Customer'|'Owner'|'Driver'|'Operator';

/** Name cell for a customer/owner/driver. `detail` is the optional second line (e.g. the driver under an owner). Renders a button when `onClick` is given and a link to the party's profile page when `href` is. */
export function PartyChip({name,role,detail,onClick,href}:{name:string;role:PartyRole;detail?:ReactNode;onClick?:()=>void;href?:string}){
 const content=<><b>{name}</b>{detail&&<small>{detail}</small>}</>;
 if(href)return <Link href={href} className="party-chip party-link" data-role={role} aria-label={`Open ${role.toLowerCase()} profile: ${name}`} onClick={e=>e.stopPropagation()}>{content}</Link>;
 if(onClick)return <button type="button" className="party-chip" data-role={role} aria-label={`${role}: ${name}`} onClick={e=>{e.stopPropagation();onClick()}}>{content}</button>;
 return <span className="party-chip" data-role={role}>{content}</span>;
}
