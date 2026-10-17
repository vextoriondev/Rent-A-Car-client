"use client";
import {useEffect,useState} from 'react';
import {apiMode,apiRequest} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {useQueryParam} from '@/lib/use-list-filters';
import {Card} from '@/components/ui/card';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {EmptyState} from '@/components/shared/empty-state';
import {SectionHeading} from '@/components/shared/section-heading';
import {DocumentList} from '@/components/features/documents/document-list';
import {t} from '@/lib/copy';

type Vehicle={id:number;registration:string;model_name:string};

/** API mode: pick a vehicle or an expense and see, open, add and remove its files. Demo mode keeps the note. */
export function DocumentViewer(){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const [kind,setKind]=useQueryParam('kind','vehicle');
 const [target,setTarget]=useQueryParam('target','');
 const [vehicles,setVehicles]=useState<Vehicle[]>([]);
 useEffect(()=>{if(apiMode&&orgId)apiRequest(`/orgs/${orgId}/vehicles?limit=200`).then(r=>setVehicles(r.items)).catch(()=>{})},[orgId]);
 if(!apiMode)return <Card><SectionHeading title={t('common.documents')} subtitle={t('documents.documentViewer.receiptsAgreementsAndStatements')}/><EmptyState title={t('common.apiModeOnly')} description={t('documents.documentViewer.fileUploadNeedsThe')}/></Card>;
 const expenses=Object.entries(rf.store.backend?.expenseIds||{});
 const options=kind==='vehicle'?vehicles.map(v=>({value:String(v.id),label: t('documents.documentViewer.text', {registration: v.registration, model_name: v.model_name})})):expenses.map(([label,id])=>({value:String(id),label}));
 return <Card>
  <SectionHeading title={t('common.documents')} subtitle={t('documents.documentViewer.receiptsAndFilesKept')}/>
  <div className="billing-toolbar">
   <label>{t('common.filesFor')}
    <Select value={kind} onValueChange={v=>{setKind(v);setTarget('')}}><SelectTrigger aria-label={t('documents.documentViewer.filesFor')}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="vehicle">{t('documents.documentViewer.aVehicle')}</SelectItem><SelectItem value="expense">{t('documents.documentViewer.anExpense')}</SelectItem></SelectContent></Select>
   </label>
   <label>{t('common.record2')}
    <Select value={target} onValueChange={setTarget}><SelectTrigger aria-label={t('common.record')}><SelectValue placeholder={t('documents.documentViewer.chooseARecord')}/></SelectTrigger><SelectContent>{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
   </label>
  </div>
  {target?<DocumentList key={kind+target} targetType={kind} targetId={Number(target)} title={t('common.files')}/>:<EmptyState title={t('documents.documentViewer.chooseARecordTo')}/>}
 </Card>;
}
