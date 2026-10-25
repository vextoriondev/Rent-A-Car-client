import type {Notice} from '@/lib/demo';
import {t,localizeDigits} from '@/lib/copy';

/** Counts shown above the notification list. Delivery state is independent of whether the entry itself was posted. */
export function notificationCounts(notices:Notice[]){
 return {
  queued:notices.filter(n=>n.status==='Queued').length,
  delivered:notices.filter(n=>n.status==='Delivered'||n.status==='Sent').length,
  failed:notices.filter(n=>n.status==='Failed').length,
  skipped:notices.filter(n=>n.status==='Skipped').length,
  unread:notices.filter(n=>!n.read).length,
 };
}

export function NotificationSummary({notices}:{notices:Notice[]}){
 const c=notificationCounts(notices);
 return <div className="mini-metrics notice-metrics" aria-label={t('notifications.notificationSummary.notificationSummary')}>
  <div className="card"><span>{t('notifications.notificationSummary.queued')}</span><strong>{localizeDigits(c.queued)}</strong></div>
  <div className="card"><span>{t('notifications.notificationSummary.delivered')}</span><strong>{localizeDigits(c.delivered)}</strong></div>
  <div className="card"><span>{t('notifications.notificationSummary.failed')}</span><strong>{localizeDigits(c.failed)}</strong></div>
  <div className="card"><span>{t('notifications.notificationSummary.noContact')}</span><strong>{localizeDigits(c.skipped)}</strong></div>
  <div className="card"><span>{t('notifications.notificationSummary.unread')}</span><strong>{localizeDigits(c.unread)}</strong></div>
 </div>;
}
