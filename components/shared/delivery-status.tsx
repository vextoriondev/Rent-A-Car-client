import type {Notice} from '@/lib/demo';
import {Badge} from '@/components/ui/badge';
import {statusLabel} from '@/lib/copy/labels';

const tone={Failed:'bad',Delivered:'good',Sent:'good',Queued:'warn',Skipped:'warn'} as const;

/** Delivery state of a notification. Distinct from the posting state of the entry it refers to. "Sent" means the provider accepted it, not that the person read it. */
export function DeliveryStatus({status}:{status:Notice['status']}){
 return <Badge tone={tone[status]}>{statusLabel(status==='Skipped'?'skipped_no_contact':status)}</Badge>;
}
