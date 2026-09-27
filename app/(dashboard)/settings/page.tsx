"use client";
import {LogOut,RotateCcw} from 'lucide-react';
import {apiMode} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {SectionHeading} from '@/components/shared/section-heading';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';

const policies:[string,string][]=[
 ['Currency','BDT · whole taka in demo'],
 ['Expense approval','From ৳5,000'],
 ['Owner repair offset','Per agreement'],
 ['Billing cadence','Monthly'],
 ['Message delivery','Simulated queue'],
];

export default function SettingsPage(){
 const rf=useRentflowStore();
 return <div className="settings-grid">
  <Card>
   <SectionHeading title="Workspace policies"/>
   {policies.map(([k,v])=><div className="policy-row" key={k}><span>{k}</span><b>{v}</b></div>)}
  </Card>
  <Card>
   <SectionHeading title={apiMode?'Backend workspace':'Demo data'} subtitle={apiMode?'PostgreSQL stores entries and agreements.':'Changes are saved to your browser only.'}/>
   <p className="settings-copy">{apiMode?'Reset is available only in demo mode. Manage production data through authorized workflows.':'Reset restores the four sample agreements and worked September entries. This cannot affect real accounts.'}</p>
   <Button variant="outline" disabled={apiMode} onClick={()=>{if(window.confirm('Reset all local demo changes?'))rf.resetDemo()}}><RotateCcw size={16}/> Reset sample data</Button>
  </Card>
  {apiMode&&<Card>
   <SectionHeading title="Session" subtitle="Signed in with your Django account."/>
   <p className="settings-copy">Signing out ends your session on this backend. You will need to sign in again to reach live data.</p>
   <Button variant="outline" onClick={()=>{if(window.confirm('Sign out of RentFlow?'))rf.signOut()}}><LogOut size={16}/> Sign out</Button>
  </Card>}
 </div>;
}
