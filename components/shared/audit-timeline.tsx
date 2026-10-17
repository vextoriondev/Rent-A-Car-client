import {t} from '@/lib/copy';
/** Placeholder. The backend has no audit-event model or endpoint yet, so there is nothing to render. */
export function AuditTimeline(){
 return <div>
  <h3 className="detail-subheading">{t('common.activity')}</h3>
  <p className="note">{t('shared.auditTimeline.noActivityRecordedYet')}</p>
</div>;
}
