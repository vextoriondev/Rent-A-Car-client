import {FileText} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {EmptyState} from '@/components/shared/empty-state';
import {SectionHeading} from '@/components/shared/section-heading';

/** Placeholder shell. There is no document model or private storage on the backend yet, and receipt upload keeps only the file name. */
export function DocumentViewer(){
 return <Card>
  <SectionHeading title="Documents" subtitle="Receipts, agreements and statements linked to their source records."/>
  <EmptyState icon={FileText} title="No documents yet" description="Uploaded receipts and generated statements will appear here once private document storage is connected."/>
 </Card>;
}
