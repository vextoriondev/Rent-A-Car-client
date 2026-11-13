"use client";
import {useState, useEffect, useMemo} from 'react';
import Link from 'next/link';
import {
  fetchFinancialAccounts,
  createFinancialAccount,
  fetchFinancialTransactions,
  transferAccountFunds,
  createExpense
} from '@/lib/api';
import {
  BookOpen,
  Building2,
  Wallet,
  ArrowRightLeft,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  RotateCcw,
  Printer,
  CheckCircle2,
  X,
  CreditCard,
  Landmark,
  CircleDollarSign
} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter,DialogDescription} from '@/components/ui/dialog';

const fmt=(n:number)=>'৳ '+(Number(n)||0).toLocaleString('en-US');

export default function AccountsPage(){
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [accountFilter, setAccountFilter] = useState('All');

  // Modals
  const [addAccOpen, setAddAccOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [newAcc, setNewAcc] = useState({
    name: '',
    account_number: '',
    account_type: 'Bank',
    bank_name: '',
    branch_name: '',
    opening_balance: 0
  });

  const [transferData, setTransferData] = useState({
    from_account_id: 0,
    to_account_id: 0,
    amount: 10000,
    reference: '',
    description: 'Internal fund transfer'
  });

  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, txnRes] = await Promise.all([
        fetchFinancialAccounts(1),
        fetchFinancialTransactions(1)
      ]);
      if (Array.isArray(accRes)) {
        setAccounts(accRes);
        if (accRes.length >= 2) {
          setTransferData(prev => ({
            ...prev,
            from_account_id: Number(accRes[0].id),
            to_account_id: Number(accRes[1].id)
          }));
        }
      }
      if (Array.isArray(txnRes)) setTransactions(txnRes);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Aggregates
  const totalBalance = accounts.reduce((acc, a) => acc + (Number(a.currentBalance) || 0), 0);
  const cashBalance = accounts.filter(a => a.type === 'Cash').reduce((acc, a) => acc + (Number(a.currentBalance) || 0), 0);
  const bankBalance = accounts.filter(a => a.type === 'Bank' || a.type === 'Mobile Banking').reduce((acc, a) => acc + (Number(a.currentBalance) || 0), 0);

  const totalInflow = transactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const totalOutflow = transactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const filteredTxns = useMemo(() => {
    return transactions.filter(t => {
      const qLower = q.toLowerCase();
      const matchQ = !q || (t.transactionId?.toLowerCase().includes(qLower) || t.description?.toLowerCase().includes(qLower) || t.relatedPerson?.toLowerCase().includes(qLower) || t.category?.toLowerCase().includes(qLower));
      const matchType = typeFilter === 'All' || t.type === typeFilter;
      return matchQ && matchType;
    });
  }, [transactions, q, typeFilter]);

  async function handleCreateAccount() {
    if (!newAcc.name.trim()) {
      showToast('Account name is required');
      return;
    }
    try {
      await createFinancialAccount(1, {
        name: newAcc.name.trim(),
        account_number: newAcc.account_number.trim(),
        account_type: newAcc.account_type,
        bank_name: newAcc.bank_name.trim(),
        branch_name: newAcc.branch_name.trim(),
        opening_balance: Number(newAcc.opening_balance) || 0
      });
      loadData();
      setAddAccOpen(false);
      setNewAcc({ name: '', account_number: '', account_type: 'Bank', bank_name: '', branch_name: '', opening_balance: 0 });
      showToast('Account created successfully');
    } catch {
      showToast('Error creating account');
    }
  }

  async function handleTransfer() {
    if (transferData.from_account_id === transferData.to_account_id) {
      showToast('Source and Destination accounts must be different');
      return;
    }
    if (transferData.amount <= 0) {
      showToast('Amount must be greater than zero');
      return;
    }
    try {
      await transferAccountFunds(1, {
        from_account_id: Number(transferData.from_account_id),
        to_account_id: Number(transferData.to_account_id),
        amount: Number(transferData.amount),
        reference: transferData.reference.trim(),
        description: transferData.description.trim()
      });
      loadData();
      setTransferOpen(false);
      showToast('Fund transfer completed successfully');
    } catch {
      showToast('Error transferring funds. Check balance.');
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* ─── Header ─── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:46,height:46,borderRadius:12,background:'#e6f0ff',display:'grid',placeItems:'center',color:'#1677ff'}}>
            <BookOpen size={26}/>
          </div>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:'#0f172a',margin:0,lineHeight:1.2}}>Accounts & Transactions</h1>
            <p style={{fontSize:12.5,color:'#64748b',margin:'2px 0 0'}}>Manage cash boxes, bank accounts, fund transfers, and ledger entries</p>
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <Button variant="outline" onClick={() => setTransferOpen(true)} style={{display:'flex',alignItems:'center',gap:6}}>
            <ArrowRightLeft size={16}/> Transfer Funds
          </Button>
          <button
            onClick={() => setAddAccOpen(true)}
            className="btn-primary-blue"
            style={{height:40,borderRadius:8,padding:'0 20px',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:6}}
          >
            <Plus size={16}/> Add New Account
          </button>
        </div>
      </div>

      {/* ─── Top 4 KPI Metrics (Live from Neon DB) ─── */}
      <div className="kpi-grid-4">
        {/* Total Liquidity */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:48,height:48,borderRadius:10,background:'#e6f0ff',display:'grid',placeItems:'center',color:'#1677ff',flexShrink:0}}>
            <Wallet size={26}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Total Available Liquidity</span>
            <strong style={{fontSize:24,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{fmt(totalBalance)}</strong>
          </div>
        </Card>

        {/* Cash Balance */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:48,height:48,borderRadius:10,background:'#e6f9f0',display:'grid',placeItems:'center',color:'#12b76a',flexShrink:0}}>
            <CircleDollarSign size={26}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Main Cash Box</span>
            <strong style={{fontSize:24,fontWeight:800,color:'#12b76a',display:'block',marginTop:2}}>{fmt(cashBalance)}</strong>
          </div>
        </Card>

        {/* Bank Balance */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:48,height:48,borderRadius:10,background:'#f3e8ff',display:'grid',placeItems:'center',color:'#9333ea',flexShrink:0}}>
            <Landmark size={26}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Bank & Mobile Accounts</span>
            <strong style={{fontSize:24,fontWeight:800,color:'#9333ea',display:'block',marginTop:2}}>{fmt(bankBalance)}</strong>
          </div>
        </Card>

        {/* Total Outflow */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:48,height:48,borderRadius:10,background:'#fee4e2',display:'grid',placeItems:'center',color:'#ef4444',flexShrink:0}}>
            <ArrowDownRight size={26}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Recent Recorded Outflow</span>
            <strong style={{fontSize:24,fontWeight:800,color:'#ef4444',display:'block',marginTop:2}}>{fmt(totalOutflow)}</strong>
          </div>
        </Card>
      </div>

      {/* ─── Cash & Bank Accounts Cards ─── */}
      <div>
        <h3 style={{fontSize:15,fontWeight:750,color:'#0f172a',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
          <Building2 size={18} color="#1677ff"/> Financial Accounts ({accounts.length})
        </h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',gap:12}}>
          {accounts.map((a, i) => (
            <Card key={a.id || i} style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <div>
                  <span style={{fontSize:11,color:'#64748b',textTransform:'uppercase',fontWeight:700,letterSpacing:0.5}}>{a.type}</span>
                  <strong style={{fontSize:15,fontWeight:800,color:'#0f172a',display:'block'}}>{a.name}</strong>
                  {a.bankName && <span style={{fontSize:12,color:'#475569'}}>{a.bankName}</span>}
                </div>
                <div style={{width:36,height:36,borderRadius:8,background: a.type === 'Cash' ? '#e6f9f0' : '#e6f0ff',display:'grid',placeItems:'center',color: a.type === 'Cash' ? '#12b76a' : '#1677ff'}}>
                  {a.type === 'Cash' ? <CircleDollarSign size={20}/> : <Landmark size={20}/>}
                </div>
              </div>
              {a.accountNumber && (
                <div style={{fontSize:12,color:'#64748b',marginBottom:8}}>
                  Acc: <span style={{fontFamily:'monospace',fontWeight:600,color:'#334155'}}>{a.accountNumber}</span>
                </div>
              )}
              <div style={{borderTop:'1px solid #f1f5f9',paddingTop:10,display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                <span style={{fontSize:11.5,color:'#64748b'}}>Current Balance:</span>
                <strong style={{fontSize:17,fontWeight:800,color:'#1677ff'}}>{fmt(a.currentBalance)}</strong>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ─── Real-Time Transaction Ledger ─── */}
      <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
          <h3 style={{fontSize:14,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
            <CreditCard size={16} color="#1677ff"/> General Transaction Ledger ({filteredTxns.length})
          </h3>

          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{position:'relative',width:220}}>
              <Input
                placeholder="Search ledger..."
                value={q}
                onChange={e => setQ(e.target.value)}
                style={{height:34,fontSize:12,paddingLeft:28}}
              />
              <Search size={14} style={{position:'absolute',left:8,top:10,color:'#94a3b8'}}/>
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger style={{height:34,fontSize:12,width:120}}><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                <SelectItem value="Income">Income (+)</SelectItem>
                <SelectItem value="Expense">Expense (-)</SelectItem>
                <SelectItem value="Transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>

            <Button size="sm" variant="outline" onClick={() => window.print()} style={{height:34}}>
              <Printer size={14}/> Print
            </Button>
          </div>
        </div>

        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
            <thead>
              <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                <th style={{padding:'0 10px'}}>Date</th>
                <th style={{padding:'0 10px'}}>Txn ID</th>
                <th style={{padding:'0 10px'}}>Type</th>
                <th style={{padding:'0 10px'}}>Category</th>
                <th style={{padding:'0 10px'}}>Party / Vehicle</th>
                <th style={{padding:'0 10px'}}>Description</th>
                <th style={{padding:'0 10px'}}>Method</th>
                <th style={{padding:'0 10px',textAlign:'right'}}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxns.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{padding:'24px 10px',textAlign:'center',color:'#94a3b8'}}>No transaction records found</td>
                </tr>
              ) : (
                filteredTxns.map((t, i) => (
                  <tr key={t.id || i} style={{borderBottom:'1px solid #f8fafc',height:42}}>
                    <td style={{padding:'0 10px',color:'#64748b'}}>{t.date}</td>
                    <td style={{padding:'0 10px',fontFamily:'monospace',color:'#1677ff',fontWeight:600}}>{t.transactionId}</td>
                    <td style={{padding:'0 10px'}}>
                      <span style={{
                        background: t.type === 'Income' ? '#e6f9f0' : t.type === 'Expense' ? '#fee2e2' : '#eff6ff',
                        color: t.type === 'Income' ? '#12b76a' : t.type === 'Expense' ? '#ef4444' : '#1677ff',
                        padding:'2px 8px',
                        borderRadius:6,
                        fontSize:11,
                        fontWeight:700
                      }}>
                        {t.type}
                      </span>
                    </td>
                    <td style={{padding:'0 10px',fontWeight:600,color:'#0f172a'}}>{t.category}</td>
                    <td style={{padding:'0 10px',color:'#475569'}}>{t.relatedPerson || t.vehicleReg || '—'}</td>
                    <td style={{padding:'0 10px',color:'#64748b'}}>{t.description || '—'}</td>
                    <td style={{padding:'0 10px',color:'#475569'}}>{t.paymentMethod || 'Cash'}</td>
                    <td style={{
                      padding:'0 10px',
                      textAlign:'right',
                      fontWeight:800,
                      color: t.type === 'Income' ? '#16a34a' : t.type === 'Expense' ? '#ef4444' : '#1677ff'
                    }}>
                      {t.type === 'Income' ? '+' : t.type === 'Expense' ? '-' : ''}{fmt(t.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── Add Account Modal ─── */}
      <Dialog open={addAccOpen} onOpenChange={setAddAccOpen}>
        <DialogContent style={{maxWidth:500}}>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>Register a cash drawer, bank checking account, or mobile banking wallet.</DialogDescription>
          </DialogHeader>

          <div style={{display:'flex',flexDirection:'column',gap:12,padding:'8px 0'}}>
            <label>
              <span className="field-label">Account Name *</span>
              <Input placeholder="e.g. Dhaka Bank - Corporate Account" value={newAcc.name} onChange={e => setNewAcc(a => ({ ...a, name: e.target.value }))}/>
            </label>

            <label>
              <span className="field-label">Account Type</span>
              <Select value={newAcc.account_type} onValueChange={v => setNewAcc(a => ({ ...a, account_type: v }))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank">Bank Account</SelectItem>
                  <SelectItem value="Cash">Cash Drawer</SelectItem>
                  <SelectItem value="Mobile Banking">Mobile Banking (bKash/Nagad)</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label>
              <span className="field-label">Account Number</span>
              <Input placeholder="Account / Wallet Number" value={newAcc.account_number} onChange={e => setNewAcc(a => ({ ...a, account_number: e.target.value }))}/>
            </label>

            <label>
              <span className="field-label">Bank Name</span>
              <Input placeholder="e.g. Dhaka Bank Ltd." value={newAcc.bank_name} onChange={e => setNewAcc(a => ({ ...a, bank_name: e.target.value }))}/>
            </label>

            <label>
              <span className="field-label">Branch Name</span>
              <Input placeholder="e.g. Gulshan Branch" value={newAcc.branch_name} onChange={e => setNewAcc(a => ({ ...a, branch_name: e.target.value }))}/>
            </label>

            <label>
              <span className="field-label">Opening Balance (৳)</span>
              <Input type="number" value={newAcc.opening_balance} onChange={e => setNewAcc(a => ({ ...a, opening_balance: Number(e.target.value) }))}/>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAccOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAccount} disabled={!newAcc.name.trim()}>Save Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Fund Transfer Modal ─── */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent style={{maxWidth:500}}>
          <DialogHeader>
            <DialogTitle>Transfer Funds Between Accounts</DialogTitle>
            <DialogDescription>Move money between cash boxes and bank accounts atomically.</DialogDescription>
          </DialogHeader>

          <div style={{display:'flex',flexDirection:'column',gap:12,padding:'8px 0'}}>
            <label>
              <span className="field-label">From Account (Source) *</span>
              <Select value={String(transferData.from_account_id)} onValueChange={v => setTransferData(d => ({ ...d, from_account_id: Number(v) }))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name} ({fmt(a.currentBalance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label>
              <span className="field-label">To Account (Destination) *</span>
              <Select value={String(transferData.to_account_id)} onValueChange={v => setTransferData(d => ({ ...d, to_account_id: Number(v) }))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name} ({fmt(a.currentBalance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label>
              <span className="field-label">Transfer Amount (৳) *</span>
              <Input type="number" value={transferData.amount} onChange={e => setTransferData(d => ({ ...d, amount: Number(e.target.value) }))}/>
            </label>

            <label>
              <span className="field-label">Reference / Cheque No.</span>
              <Input placeholder="TR-2026-BANK-01" value={transferData.reference} onChange={e => setTransferData(d => ({ ...d, reference: e.target.value }))}/>
            </label>

            <label>
              <span className="field-label">Notes / Description</span>
              <Input value={transferData.description} onChange={e => setTransferData(d => ({ ...d, description: e.target.value }))}/>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button onClick={handleTransfer} disabled={transferData.amount <= 0 || transferData.from_account_id === transferData.to_account_id} style={{background:'#1677ff'}}>
              Execute Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast notification */}
      {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
    </div>
  );
}

