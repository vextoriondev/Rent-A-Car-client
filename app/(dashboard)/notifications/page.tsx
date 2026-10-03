"use client";
import {useMemo} from 'react';
import {Bell,ChevronRight,Info,RotateCcw} from 'lucide-react';
import {useRentflowStore} from '@/lib/store-context';
import {useQueryParam} from '@/lib/use-list-filters';
import {SectionHeading} from '@/components/shared/section-heading';
import {fmtDate} from '@/lib/format';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {DeliveryStatus} from '@/components/shared/delivery-status';
import {EmptyState} from '@/components/shared/empty-state';
import {FilterToolbar} from '@/components/shared/filter-toolbar';
import {NotificationSummary} from '@/components/features/notifications/notification-summary';
import {ContactPreferences} from '@/components/features/notifications/contact-preferences';

export default function NotificationsPage(){
 const rf=useRentflowStore();
 const {notices}=rf.store;
 const apiMode=!!rf.store.backend;
 const [status]=useQueryParam('status','All');
 const [read]=useQueryParam('read','All');
 const [q]=useQueryParam('q','');
 const shown=useMemo(()=>{
  const needle=q.trim().toLowerCase();
  return notices.filter(n=>(status==='All'||n.status===status)&&(read==='All'||!n.read)&&(!needle||`${n.title} ${n.detail} ${n.recipient}`.toLowerCase().includes(needle)));
 },[notices,status,read,q]);
 const unread=notices.filter(n=>!n.read).length;
 return <div className="notice-page">
  <NotificationSummary notices={notices}/>
  <Card>
   <SectionHeading title="Notification activity" subtitle="Delivery status is distinct from posting state." action={<Button variant="outline" disabled={unread===0} onClick={rf.markAllNoticesRead}>Mark all read</Button>}/>
   <p className="note delivery-note"><Info size={14} aria-hidden/> {apiMode?'Messages are recorded and queued, but no SMS, WhatsApp or email provider is connected yet, so nothing is sent until one is chosen.':'Sample data. In the live app, messages are queued until a delivery provider is connected.'}</p>
   <FilterToolbar filters={[{param:'status',label:'Filter by delivery status',allValue:'All',options:['Queued','Delivered','Failed']},{param:'read',label:'Filter by read state',allValue:'All',options:['Unread']}]}/>
   <div className="notice-list">{shown.map(n=><div className="notice-row" key={n.id}>
    <button type="button" className={'notice '+(!n.read?'unread':'')} onClick={()=>{rf.markNoticeRead(n.id);rf.setSelected(n.id)}}>
     <span className={'notice-symbol '+(n.status==='Failed'?'red':'teal')}><Bell size={18}/></span>
     <span><strong>{n.title}</strong><small>{n.detail} · {n.recipient}</small></span>
     <span className="notice-end"><DeliveryStatus status={n.status}/><small>{fmtDate(n.date)}</small></span>
     <ChevronRight size={17}/>
    </button>
    {n.status==='Failed'&&<Button variant="outline" size="sm" className="notice-retry" onClick={()=>rf.retryNotice(n.id)}><RotateCcw size={14}/> Retry</Button>}
   </div>)}</div>
   {notices.length===0&&<EmptyState title="No notifications yet."/>}
   {notices.length>0&&shown.length===0&&<EmptyState title="No notifications match these filters."/>}
  </Card>
  <ContactPreferences/>
 </div>;
}
