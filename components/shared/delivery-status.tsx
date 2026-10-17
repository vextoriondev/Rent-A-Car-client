import type {Notice} from '@/lib/demo';
import {Badge} from '@/components/ui/badge';
import {statusLabel} from '@/lib/copy/labels';

const tone={Failed:'bad',Delivered:'good',Queued:'warn'} as const;

/** Delivery state of a notification. Distinct from the posting state of the entry it refers to. */
export function DeliveryStatus({status}:{status:Notice['status']}){
 return <Badge tone={tone[status]}>{statusLabel(status)}</Badge>;
}
