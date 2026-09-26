"use client";
import {ChevronRight} from 'lucide-react';
import {statement} from '@/lib/demo';
import {useRentflowStore} from '@/lib/store-context';
import {useRelatedAgreements} from '@/lib/use-related-agreements';
import {Card} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {ApprovalBanner} from '@/components/shared/approval-banner';
import {EmptyState} from '@/components/shared/empty-state';
import {Money} from '@/components/shared/money';

export default function SettlementsPage(){
 const rf=useRentflowStore();
 const {store}=rf;
 const {agreements}=useRelatedAgreements();
 return <>
  <div className="settlement-banner"><div><span className="eyebrow">SEPTEMBER 2026 · CLOSE PERIOD</span><h2>Month-end settlement</h2><p>Review customer, owner, driver and operator positions for each agreement.</p></div><div className="settlement-count"><strong>{store.closed.length}/{store.agreements.length}</strong><span>closed</span></div></div>
  <div className="settlement-grid">{agreements.map(a=>{
   const s=statement(a,store.entries);
   const pending=store.entries.some(e=>e.agreementId===a.id&&e.status==='Pending approval');
   const closed=store.closed.includes(a.id);
   return <Card key={a.id} className="settlement-card">
    <div className="settlement-top"><div><small>{a.id} · {a.registration}</small><h3>{a.customer}</h3></div><Badge tone={closed?'good':pending?'warn':'blue'}>{closed?'Closed':pending?'Needs review':'Ready to review'}</Badge></div>
    <div className="settlement-figures"><div><span>Customer due</span><b><Money value={s.customerDue}/></b></div><div><span>Owner due</span><b><Money value={s.ownerDue}/></b></div><div><span>Driver due</span><b><Money value={s.driverDue}/></b></div></div>
    {pending&&<ApprovalBanner>Expense approval required before closing.</ApprovalBanner>}
    <div className="settlement-actions"><button type="button" className="text-button" onClick={()=>rf.setSelected(a.id)}>View four statements <ChevronRight size={15}/></button><Button variant="outline" size="sm" disabled={closed||pending} onClick={()=>rf.setConfirmClose(a.id)}>{closed?'Closed':'Close'}</Button></div>
   </Card>;
  })}</div>
  {agreements.length===0&&<EmptyState title="No settlements match your search."/>}
 </>;
}
