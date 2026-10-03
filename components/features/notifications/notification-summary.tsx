import type {Notice} from '@/lib/demo';

/** Counts shown above the notification list. Delivery state is independent of whether the entry itself was posted. */
export function notificationCounts(notices:Notice[]){
 return {
  queued:notices.filter(n=>n.status==='Queued').length,
  delivered:notices.filter(n=>n.status==='Delivered').length,
  failed:notices.filter(n=>n.status==='Failed').length,
  unread:notices.filter(n=>!n.read).length,
 };
}

export function NotificationSummary({notices}:{notices:Notice[]}){
 const c=notificationCounts(notices);
 return <div className="mini-metrics notice-metrics" aria-label="Notification summary">
  <div className="card"><span>Queued</span><strong>{c.queued}</strong></div>
  <div className="card"><span>Delivered</span><strong>{c.delivered}</strong></div>
  <div className="card"><span>Failed</span><strong>{c.failed}</strong></div>
  <div className="card"><span>Unread</span><strong>{c.unread}</strong></div>
 </div>;
}
