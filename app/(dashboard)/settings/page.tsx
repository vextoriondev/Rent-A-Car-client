"use client";
import {useEffect,useState} from 'react';
import {LogOut,RotateCcw} from 'lucide-react';
import {apiMode,apiRequest} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {SectionHeading} from '@/components/shared/section-heading';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {CostCategoriesSettings} from '@/components/features/expenses/cost-categories-settings';
import {MembersSettings} from '@/components/features/branches/members-settings';
import {SettlementSettings} from '@/components/features/settlements/settlement-settings';
import {Can} from '@/lib/roles';
import {t,fmtNumber,getLanguage,setBanglaDigits,usesBanglaDigits} from '@/lib/copy';
import {roleLabel} from '@/lib/copy/labels';
import {LanguageSwitch} from '@/components/shared/language-switch';
import {Checkbox} from '@/components/ui/checkbox';

const policies=():[string,string][]=>[
 [t('settings.policy.currency'),t('settings.policy.currencyValueDemo')],
 [t('settings.policy.approval'),t('settings.policy.approvalValueDemo')],
 [t('settings.policy.ownerRepair'),t('settings.policy.ownerRepairValue')],
 [t('settings.policy.billing'),t('settings.policy.billingValue')],
 [t('settings.policy.messages'),t('settings.policy.messagesValueDemo')],
];

type Workspace={name:string;currency:string;default_expense_threshold:string;month_end:{cutoff_day:number;approval_role:string};message_delivery:'not_connected'|'partly_connected'|'connected'};
const taka=(v:string)=>'৳'+fmtNumber(Number(v));

/** API mode: the policies come from the server, so nothing shown here can drift from what the backend really does. */
function LivePolicies(){
 const orgId=useRentflowStore().store.backend?.orgId;
 const [w,setW]=useState<Workspace|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{if(orgId)apiRequest(`/orgs/${orgId}/workspace`).then(setW).catch(e=>setError((e as Error).message))},[orgId]);
 const rows:[string,string][]=w?[
  [t('settings.policy.workspace'),w.name],
  [t('settings.policy.currencyLive'),w.currency],
  [t('settings.policy.approval'),t('settings.policy.approvalLive',{amount: taka(w.default_expense_threshold)})],
  [t('settings.policy.rentSalary'),t('settings.policy.rentSalaryValue')],
  [t('settings.policy.paymentDays'),t('settings.policy.paymentDaysValue')],
  [t('settings.policy.monthEnd'),t('settings.policy.monthEndValue',{role: roleLabel(w.month_end.approval_role)})],
  [t('settings.policy.sending'),w.message_delivery==='connected'?t('settings.policy.sendingOn'):w.message_delivery==='partly_connected'?t('settings.policy.sendingPartly'):t('settings.policy.sendingOff')],
 ]:[];
 return <Card>
  <SectionHeading title={t('settings.workspacePolicies')} subtitle={t('settings.readFromYourWorkspace')}/>
  {error&&<p className="note">{error}</p>}
  {!w&&!error&&<p className="note">{t('settings.loading')}</p>}
  {rows.map(([k,v])=><div className="policy-row" key={k}><span>{k}</span><b>{v}</b></div>)}
 </Card>;
}

export default function SettingsPage(){
 const rf=useRentflowStore();
 return <div className="settings-grid">
  {apiMode?<LivePolicies/>:<Card>
   <SectionHeading title={t('settings.workspacePolicies')}/>
   {policies().map(([k,v])=><div className="policy-row" key={k}><span>{k}</span><b>{v}</b></div>)}
  </Card>}
  <Card>
   <SectionHeading title={apiMode?t('settings.backendWorkspace'):t('settings.demoData')} subtitle={apiMode?t('settings.postgresqlStoresEntriesAnd'):t('settings.changesAreSavedTo')}/>
   <p className="settings-copy">{apiMode?t('settings.resetIsAvailableOnly'):t('settings.resetRestoresTheFour')}</p>
   <Button variant="outline" disabled={apiMode} onClick={()=>{if(window.confirm(t('settings.confirmReset')))rf.resetDemo()}}><RotateCcw size={16}/> {t('settings.resetSampleData')}</Button>
  </Card>
  <Card>
   <SectionHeading title={t('lang.title')} subtitle={t('lang.note')}/>
   <LanguageSwitch/>
   {getLanguage()==='bn'&&<label className="check-label"><Checkbox checked={usesBanglaDigits()} onCheckedChange={v=>setBanglaDigits(v===true)}/> {t('lang.digits')}</label>}
  </Card>
  {apiMode&&<Can action="admin"><SettlementSettings/></Can>}
  {apiMode&&<Can action="admin"><MembersSettings/></Can>}
  {apiMode&&<Can action="admin"><CostCategoriesSettings/></Can>}
  {apiMode&&<Card>
   <SectionHeading title={t('settings.session')} subtitle={t('settings.signedInWithYour')}/>
   <p className="settings-copy">{t('settings.signingOutEndsYour')}</p>
   <Button variant="outline" onClick={()=>{if(window.confirm(t('settings.confirmSignOut')))rf.signOut()}}><LogOut size={16}/> {t('settings.signOut')}</Button>
  </Card>}
 </div>;
}
