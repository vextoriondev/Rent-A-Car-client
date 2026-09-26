"use client";
import {Bell,ChevronRight} from 'lucide-react';
import {useRentflowStore} from '@/lib/store-context';
import {SectionHeading} from '@/components/shared/section-heading';
import {fmtDate} from '@/lib/format';
import {Card} from '@/components/ui/card';
import {DeliveryStatus} from '@/components/shared/delivery-status';
import {EmptyState} from '@/components/shared/empty-state';

export default function NotificationsPage(){
 const rf=useRentflowStore();
 const {notices}=rf.store;
 return <Card>
  <SectionHeading title="Notification activity" subtitle="Delivery status is distinct from posting state."/>
  <div className="notice-list">{notices.map(n=><button type="button" className={'notice '+(!n.read?'unread':'')} key={n.id} onClick={()=>{rf.markNoticeRead(n.id);rf.setSelected(n.id)}}>
   <span className={'notice-symbol '+(n.status==='Failed'?'red':'teal')}><Bell size={18}/></span>
   <span><strong>{n.title}</strong><small>{n.detail} · {n.recipient}</small></span>
   <span className="notice-end"><DeliveryStatus status={n.status}/><small>{fmtDate(n.date)}</small></span>
   <ChevronRight size={17}/>
  </button>)}</div>
  {notices.length===0&&<EmptyState title="No notifications yet."/>}
 </Card>;
}
