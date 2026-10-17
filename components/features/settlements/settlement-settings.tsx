"use client";
import {useEffect,useState} from 'react';
import {apiRequest} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Checkbox} from '@/components/ui/checkbox';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {SectionHeading} from '@/components/shared/section-heading';
import {t} from '@/lib/copy';

type Cfg={cutoff_day:number;approval_role:'admin'|'accountant';negative_owner_blocks_close:boolean};

/** API mode: who may approve a settlement and whether a negative owner balance blocks closing. Only admins can change it; the server enforces that. */
export function SettlementSettings(){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const [cfg,setCfg]=useState<Cfg|null>(null);
 const [note,setNote]=useState('');
 useEffect(()=>{if(!orgId)return;apiRequest(`/orgs/${orgId}/settlement-settings`).then(setCfg).catch(e=>setNote((e as Error).message))},[orgId]);
 if(!orgId)return null;
 const save=async()=>{
  if(!cfg)return;setNote('');
  try{setCfg(await apiRequest(`/orgs/${orgId}/settlement-settings`,{method:'PUT',body:JSON.stringify({approval_role:cfg.approval_role,negative_owner_blocks_close:cfg.negative_owner_blocks_close})}));setNote(t('settlements.settlementSettings.settlementRulesSaved'))}
  catch(e){setNote((e as Error).message)}
 };
 return <Card>
  <SectionHeading title={t('settlements.settlementSettings.settlementRules')} subtitle={t('settlements.settlementSettings.appliesToEveryMonth')}/>
  {!cfg&&!note&&<p className="settings-copy">{t('common.loadingDots')}</p>}
  {cfg&&<div className="entry-form">
   <label>{t('common.whoApproves')}
    <Select value={cfg.approval_role} onValueChange={v=>setCfg({...cfg,approval_role:v as Cfg['approval_role']})}><SelectTrigger aria-label={t('settlements.settlementSettings.approvalRole')}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="admin">{t('settlements.settlementSettings.adminOnly')}</SelectItem><SelectItem value="accountant">{t('settlements.settlementSettings.adminOrAccountant')}</SelectItem></SelectContent></Select>
   </label>
   <label className="check-label"><Checkbox checked={cfg.negative_owner_blocks_close} onCheckedChange={c=>setCfg({...cfg,negative_owner_blocks_close:c===true})} aria-label={t('settlements.settlementSettings.negativeOwnerBalanceBlocks')}/> {t('settlements.settlementSettings.aNegativeOwnerBalance')}</label>
   <p className="settings-copy">{t('settlements.settlementSettings.cutOffIsThe')}</p>
   <div><Button onClick={()=>void save()}>{t('settlements.settlementSettings.saveRules')}</Button></div>
  </div>}
  {note&&<p role="status" className="note">{note}</p>}
 </Card>;
}
