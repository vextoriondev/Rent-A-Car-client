"use client";
import {useState} from 'react';
import {CarFront} from 'lucide-react';
import {statement} from '@/lib/demo';
import {useRentflowStore} from '@/lib/store-context';
import {SectionHeading} from '@/components/shared/section-heading';
import {Card} from '@/components/ui/card';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Money} from '@/components/shared/money';

type Role='Owner'|'Driver'|'Customer';
const roles:Role[]=['Owner','Driver','Customer'];

/** Staff-only preview of the limited view each party would get. Not an authenticated portal. */
export default function ActorPreviewPage(){
 const {store}=useRentflowStore();
 const [role,setRole]=useState<Role>('Owner');
 const [actor,setActor]=useState('Farhana Rahman');
 const nameOf=(a:typeof store.agreements[number],r:Role)=>r==='Owner'?a.owner:r==='Driver'?a.driver:a.customer;
 const chooseRole=(r:Role)=>{setRole(r);setActor(store.agreements[0]?nameOf(store.agreements[0],r):'')};
 const accounts=[...new Set(store.agreements.map(a=>nameOf(a,role)))];
 return <div className="actor-layout">
  <Card className="actor-configuration">
   <SectionHeading title="Preview an actor account" subtitle="Choose a role and party to inspect their limited view."/>
   <div className="role-choices">{roles.map(x=><button type="button" key={x} className={role===x?'chosen':''} onClick={()=>chooseRole(x)}>{x}</button>)}</div>
   <label className="field-label" htmlFor="actor-select">Account</label>
   <Select value={actor} onValueChange={setActor}><SelectTrigger id="actor-select" className="w-full"><SelectValue/></SelectTrigger><SelectContent>{accounts.map(x=><SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select>
   <p className="actor-helper">Preview only. A production portal needs server verified identity and record scope.</p>
  </Card>
  <div className="phone-frame">
   <div className="phone-head"><span>RentFlow</span><span>9:41 ◉</span></div>
   <div className="phone-content">
    <div className="phone-greeting">SEPTEMBER 2026<h2>Hello, {actor.split(' ')[0]}</h2><p>Your account at a glance</p></div>
    {store.agreements.filter(a=>nameOf(a,role)===actor).map(a=>{
     const s=statement(a,store.entries);
     const due=role==='Owner'?s.ownerDue:role==='Driver'?s.driverDue:s.customerDue;
     return <div className="phone-card" key={a.id}>
      <div className="phone-card-head"><CarFront size={20}/><span>{a.vehicle}</span></div>
      <small>{a.registration}</small>
      <div className="phone-due"><span>{role==='Customer'?'Your outstanding':'Due to you'}</span><strong><Money value={due}/></strong></div>
      <div className="phone-lines">
       <div><span>{role==='Customer'?'Billed':role==='Owner'?'Net entitlement':'Earned salary'}</span><b><Money value={role==='Customer'?a.rent:role==='Owner'?s.ownerNet:s.driverEarned}/></b></div>
       <div><span>{role==='Customer'?'Paid':role==='Owner'?'Transferred':'Paid / advanced'}</span><b><Money value={role==='Customer'?s.received:role==='Owner'?s.ownerPaid:s.driverPaid+s.advance}/></b></div>
      </div>
     </div>;
    })}
    <div className="phone-nav"><span>⌂<small>Home</small></span><span>▤<small>Statement</small></span><span>◫<small>Messages</small></span></div>
   </div>
  </div>
 </div>;
}
