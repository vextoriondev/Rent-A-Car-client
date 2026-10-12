"use client";
import {useEffect,useState} from 'react';
import {LogOut,RotateCcw} from 'lucide-react';
import {apiMode,apiRequest} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {SectionHeading} from '@/components/shared/section-heading';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {CostCategoriesSettings} from '@/components/features/expenses/cost-categories-settings';
import {MembersSettings} from '@/components/features/branches/members-settings';
import {SettlementSettings} from '@/components/features/settlements/settlement-settings';
import {Can} from '@/lib/roles';

const policies:[string,string][]=[
 ['Currency','BDT · whole taka in demo'],
 ['Expense approval','From ৳5,000'],
 ['Owner repair offset','Per agreement'],
 ['Billing cadence','Monthly'],
 ['Message delivery','Simulated queue'],
];

type Workspace={name:string;currency:string;default_expense_threshold:string;month_end:{cutoff_day:number;approval_role:string};message_delivery:'not_connected'|'connected'};
const taka=(v:string)=>'৳'+Number(v).toLocaleString('en-BD');

/** API mode: the policies come from the server, so nothing shown here can drift from what the backend really does. */
function LivePolicies(){
 const orgId=useRentflowStore().store.backend?.orgId;
 const [w,setW]=useState<Workspace|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{if(orgId)apiRequest(`/orgs/${orgId}/workspace`).then(setW).catch(e=>setError((e as Error).message))},[orgId]);
 const rows:[string,string][]=w?[
  ['Workspace',w.name],
  ['Currency',w.currency],
  ['Expense approval',`From ${taka(w.default_expense_threshold)}, unless an agreement sets its own limit`],
  ['Rent and salary','By dates: per day, per month or a fixed total, set on each agreement'],
  ['Payment days','Set on each agreement (month end unless changed)'],
  ['Month-end close',`Approved by ${w.month_end.approval_role}; edit the close rules below`],
  ['Message sending',w.message_delivery==='connected'?'Connected':'Not connected yet: messages are recorded but not sent'],
 ]:[];
 return <Card>
  <SectionHeading title="Workspace policies" subtitle="Read from your workspace, not typed in."/>
  {error&&<p className="note">{error}</p>}
  {!w&&!error&&<p className="note">Loading...</p>}
  {rows.map(([k,v])=><div className="policy-row" key={k}><span>{k}</span><b>{v}</b></div>)}
 </Card>;
}

export default function SettingsPage(){
 const rf=useRentflowStore();
 return <div className="settings-grid">
  {apiMode?<LivePolicies/>:<Card>
   <SectionHeading title="Workspace policies"/>
   {policies.map(([k,v])=><div className="policy-row" key={k}><span>{k}</span><b>{v}</b></div>)}
  </Card>}
  <Card>
   <SectionHeading title={apiMode?'Backend workspace':'Demo data'} subtitle={apiMode?'PostgreSQL stores entries and agreements.':'Changes are saved to your browser only.'}/>
   <p className="settings-copy">{apiMode?'Reset is available only in demo mode. Manage production data through authorized workflows.':'Reset restores the four sample agreements and worked September entries. This cannot affect real accounts.'}</p>
   <Button variant="outline" disabled={apiMode} onClick={()=>{if(window.confirm('Reset all local demo changes?'))rf.resetDemo()}}><RotateCcw size={16}/> Reset sample data</Button>
  </Card>
  {apiMode&&<Can action="admin"><SettlementSettings/></Can>}
  {apiMode&&<Can action="admin"><MembersSettings/></Can>}
  {apiMode&&<Can action="admin"><CostCategoriesSettings/></Can>}
  {apiMode&&<Card>
   <SectionHeading title="Session" subtitle="Signed in with your Django account."/>
   <p className="settings-copy">Signing out ends your session on this backend. You will need to sign in again to reach live data.</p>
   <Button variant="outline" onClick={()=>{if(window.confirm('Sign out of RentFlow?'))rf.signOut()}}><LogOut size={16}/> Sign out</Button>
  </Card>}
 </div>;
}
