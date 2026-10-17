import {hasCopy,t,type CopyKey} from './index';

/** Words shown on screen for values the code stores in English (entry types, parties, statuses, categories). The stored value never changes; only what the user reads. */

export const entryTypeLabel=(v:string)=>{
 switch(v){
  case 'Expense':return t('label.entryType.expense');
  case 'Customer payment':return t('label.entryType.customerPayment');
  case 'Owner payout':return t('label.entryType.ownerPayout');
  case 'Driver payout':return t('label.entryType.driverPayout');
  case 'Salary advance':return t('label.entryType.salaryAdvance');
  default:return v;
 }
};

/** "Operator" is the rental business itself, so the screen says "You". */
export const partyLabel=(v:string)=>{
 switch((v||'').toLowerCase()){
  case 'operator':return t('label.party.operator');
  case 'owner':return t('label.party.owner');
  case 'customer':return t('label.party.customer');
  case 'driver':return t('label.party.driver');
  case 'none':return t('label.party.none');
  default:return v;
 }
};

/** Short status words the server sends in lower case (active, draft, in_progress ...). Unknown words are shown readable instead of raw. */
export const statusLabel=(v?:string|null)=>{
 const key=(v||'').toLowerCase();
 switch(key){
  case 'active':return t('label.status.active');
  case 'draft':return t('label.status.draft');
  case 'ended':return t('label.status.ended');
  case 'closed':return t('label.status.closed');
  case 'open':return t('label.status.open');
  case 'approved':return t('label.status.approved');
  case 'requested':return t('label.status.requested');
  case 'in_progress':return t('label.status.inProgress');
  case 'done':return t('label.status.done');
  case 'cancelled':return t('label.status.cancelled');
  case 'queued':return t('label.status.queued');
  case 'sent':return t('label.status.sent');
  case 'delivered':return t('label.status.delivered');
  case 'failed':return t('label.status.failed');
  case 'skipped_no_contact':return t('label.status.noContact');
  case 'paid':return t('label.status.paid');
  case 'partly_paid':return t('label.status.partlyPaid');
  case 'overdue':return t('label.status.overdue');
  case 'due':return t('label.status.due');
  case 'issued':return t('label.status.issued');
  case 'void':return t('label.status.void');
  case 'posted':return t('label.status.posted');
  case 'reversed':return t('label.status.reversed');
  case 'pending_approval':case 'pending':return t('label.status.pendingApproval');
  case 'operator':case 'owner':case 'customer':case 'driver':return partyLabel(key);
  case '':return '';
  default:return key.charAt(0).toUpperCase()+key.slice(1).replace(/_/g,' ');
 }
};

export const entryStatusLabel=(v:string)=>{
 switch(v){
  case 'Posted':return t('label.entryStatus.posted');
  case 'Pending approval':return t('label.entryStatus.pending');
  case 'Draft':return t('label.entryStatus.draft');
  case 'Reversed':return t('label.entryStatus.reversed');
  default:return v;
 }
};

export const categoryLabel=(v:string)=>{
 switch((v||'').toLowerCase().replace(/_/g,' ')){
  case 'repair':return t('label.category.repair');
  case 'fuel':return t('label.category.fuel');
  case 'toll / parking':case 'toll':return t('label.category.toll');
  case 'maintenance':return t('label.category.maintenance');
  case 'cleaning':return t('label.category.cleaning');
  case 'damage':return t('label.category.damage');
  case 'driver allowance':return t('label.category.driverAllowance');
  case 'driver salary (paid directly)':case 'driver salary':return t('label.category.driverSalaryDirect');
  case 'rent':return t('label.category.rent');
  case 'owner rent':return t('label.category.ownerRent');
  case 'salary':return t('label.category.salary');
  case 'advance':return t('label.category.advance');
  case 'other':return t('label.category.other');
  default:return v;
 }
};

export const roleLabel=(r?:string)=>{
 switch(r){
  case 'admin':return t('role.admin');
  case 'accountant':return t('role.accountant');
  case 'operations':return t('role.operations');
  case 'viewer':return t('role.viewer');
  case 'mechanic':return t('role.mechanic');
  default:return t('role.staff');
 }
};

/** The account names inside the books, in everyday words (shown to accountants only). */
export const accountLabel=(code:string)=>{
 switch(code){
  case 'CASH':return t('label.account.cash');
  case 'CUSTOMER_RECEIVABLE':return t('label.account.customerReceivable');
  case 'RENT_REVENUE':return t('label.account.rentRevenue');
  case 'OTHER_REVENUE':return t('label.account.otherRevenue');
  case 'OWNER_RENT_EXPENSE':return t('label.account.ownerRentExpense');
  case 'OWNER_PAYABLE':return t('label.account.ownerPayable');
  case 'DRIVER_SALARY_EXPENSE':return t('label.account.driverSalaryExpense');
  case 'DRIVER_PAYABLE':return t('label.account.driverPayable');
  case 'OPERATING_EXPENSE':return t('label.account.operatingExpense');
  case 'OWNER_RECOVERABLE':return t('label.account.ownerRecoverable');
  case 'CUSTOMER_RECOVERABLE':return t('label.account.customerRecoverable');
  case 'OPENING_BALANCE':return t('label.account.openingBalance');
  case 'DRIVER_RECOVERABLE':return t('label.account.driverRecoverable');
  default:return code.replace(/_/g,' ').toLowerCase();
 }
};

export const sourceLabel=(type:string)=>{
 switch(type){
  case 'obligation':return t('label.source.obligation');
  case 'payment':return t('label.source.payment');
  case 'payment_advance':return t('label.source.paymentAdvance');
  case 'expense':return t('label.source.expense');
  case 'expense_reversal':return t('label.source.expenseReversal');
  case 'carry_out':return t('label.source.carryOut');
  case 'carry_in':return t('label.source.carryIn');
  case 'charge':return t('label.source.charge');
  case 'invoice':return t('label.source.invoice');
  default:return type.replace(/_/g,' ');
 }
};

/** A readable name for an audit-log action such as `expense.created`; the catalog can supply wording as `audit.action.<code>`. */
export const auditActionLabel=(action:string)=>{
 const key=`audit.action.${action}`;
 return hasCopy(key)?t(key as CopyKey):action.replace(/[._]/g,' ').replace(/^./,c=>c.toUpperCase());
};

/** A readable name for what an audit-log row is about (`payment`, `expense_category` ...). */
export const auditTargetLabel=(type:string)=>{
 const key=`audit.target.${type}`;
 return hasCopy(key)?t(key as CopyKey):type.replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());
};

/** The kinds of cost the server creates for every company (code → its English name). A company can rename them, so only an unchanged name is translated. */
const SEEDED_CATEGORIES:Record<string,string>={cleaning:'Cleaning',damage:'Damage',driver_allowance:'Driver allowance',driver_salary:'Driver salary paid directly',fuel:'Fuel / gas',other:'Miscellaneous',repair:'Repairs',maintenance:'Routine maintenance',toll:'Toll / parking'};
export const categoryName=(code:string,name:string)=>SEEDED_CATEGORIES[code]===name?categoryLabel(code):name;
