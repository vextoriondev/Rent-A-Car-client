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
import {Can} from '@/lib/roles';
import {t} from '@/lib/copy';

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
   <SectionHeading title={t('notifications.notificationActivity')} subtitle={t('notifications.deliveryStatusIsDistinct')} action={<Button variant="outline" disabled={unread===0} onClick={rf.markAllNoticesRead}>{t('notifications.markAllRead')}</Button>}/>
   <p className="note delivery-note"><Info size={14} aria-hidden/> {apiMode?t('notifications.messagesAreRecordedAnd'):t('notifications.sampleDataInThe')}</p>
   <FilterToolbar filters={[{param:'status',label: t('notifications.filterByDeliveryStatus'),allValue:'All',options:[{value:'Queued',label:t('notices.status.queued')},{value:'Delivered',label:t('notices.status.delivered')},{value:'Failed',label:t('notices.status.failed')}]},{param:'read',label: t('notifications.filterByReadState'),allValue:'All',options:[{value:'Unread',label:t('notices.status.unread')}]}]}/>
   <div className="notice-list">{shown.map(n=><div className="notice-row" key={n.id}>
    <button type="button" className={'notice '+(!n.read?'unread':'')} onClick={()=>{rf.markNoticeRead(n.id);rf.setSelected(n.id)}}>
     <span className={'notice-symbol '+(n.status==='Failed'?'red':'teal')}><Bell size={18}/></span>
     <span><strong>{n.title}</strong><small>{n.detail} · {n.recipient}</small></span>
     <span className="notice-end"><DeliveryStatus status={n.status}/><small>{fmtDate(n.date)}</small></span>
     <ChevronRight size={17}/>
    </button>
    {n.status==='Failed'&&<Can action="finance"><Button variant="outline" size="sm" className="notice-retry" onClick={()=>rf.retryNotice(n.id)}><RotateCcw size={14}/> {t('common.retry')}</Button></Can>}
   </div>)}</div>
   {notices.length===0&&<EmptyState title={t('notifications.noNotificationsYet')}/>}
   {notices.length>0&&shown.length===0&&<EmptyState title={t('notifications.noNotificationsMatchThese')}/>}
  </Card>
  <ContactPreferences/>
 </div>;
}
