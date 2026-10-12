import type {Agreement} from './demo';

export type PartyKindName='Owner'|'Driver'|'Customer';
const BASE:Record<PartyKindName,string>={Owner:'/owners',Driver:'/drivers',Customer:'/customers'};

/** Profile page of the party on one side of an agreement: addressed by the server id in API mode, by name in the demo. Null when there is no such party (a vehicle-only agreement has no driver). */
export function partyHref(role:PartyKindName,a:Agreement):string|undefined{
 const id=role==='Owner'?a.ownerId:role==='Driver'?a.driverId:a.customerId;
 const name=role==='Owner'?a.owner:role==='Driver'?a.driver:a.customer;
 if(role==='Driver'&&a.noDriver)return undefined;
 return `${BASE[role]}/${id!=null?id:encodeURIComponent(name)}`;
}
