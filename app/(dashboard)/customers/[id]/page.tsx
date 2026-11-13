"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Building2, Phone, Mail, MapPin, FileText,
  CreditCard, CheckCircle2, Clock, Printer, Plus, AlertCircle,
  Download, Calendar, ShieldCheck, UserCheck
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchClientProfile, createInvoice, recordInvoicePayment, recordClientCollection, fetchFinancialAccounts } from '@/lib/api';

const fmt = (n: number) => '৳ ' + (Number(n) || 0).toLocaleString('en-US');

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>();
  const clientId = params?.id || '';

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Modals
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [viewInvoiceModalOpen, setViewInvoiceModalOpen] = useState(false);
  const [collectModalOpen, setCollectModalOpen] = useState(false);

  // Form states
  const [newInvoice, setNewInvoice] = useState({
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    discount: '0',
    tax: '0',
    notes: '',
    selectedDutyIds: [] as number[],
    customDesc: '',
    customAmount: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    method: 'Cash',
    accountId: '',
    reference: '',
    notes: ''
  });

  const [collectForm, setCollectForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    method: 'Cash',
    reference: '',
    notes: ''
  });

  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const loadData = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const data = await fetchClientProfile(1, clientId);
      setClient(data);
    } catch {
      showToast('Error loading client profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchFinancialAccounts(1).then(res => {
      if (Array.isArray(res)) setAccounts(res);
    }).catch(() => {});
  }, [clientId]);

  // Handle Invoice Generation
  const handleGenerateInvoice = async () => {
    const customItems = [];
    if (newInvoice.customDesc && Number(newInvoice.customAmount) > 0) {
      customItems.push({
        description: newInvoice.customDesc,
        quantity: 1,
        unit_price: Number(newInvoice.customAmount)
      });
    }

    if (newInvoice.selectedDutyIds.length === 0 && customItems.length === 0) {
      showToast('Select at least one duty or enter a custom line item');
      return;
    }

    try {
      await createInvoice(1, {
        client_id: Number(client.id),
        issue_date: newInvoice.issueDate,
        due_date: newInvoice.dueDate,
        discount: Number(newInvoice.discount) || 0,
        tax: Number(newInvoice.tax) || 0,
        notes: newInvoice.notes,
        duty_ids: newInvoice.selectedDutyIds,
        custom_items: customItems
      });
      showToast('Invoice generated successfully!');
      setInvoiceModalOpen(false);
      setNewInvoice({
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
        discount: '0',
        tax: '0',
        notes: '',
        selectedDutyIds: [],
        customDesc: '',
        customAmount: ''
      });
      loadData();
    } catch {
      showToast('Error creating invoice');
    }
  };

  // Handle Payment on specific Invoice
  const handleRecordInvoicePayment = async () => {
    if (!selectedInvoice || !paymentForm.amount || Number(paymentForm.amount) <= 0) return;
    try {
      await recordInvoicePayment(1, selectedInvoice.id, {
        date: paymentForm.date,
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.method,
        account_id: paymentForm.accountId ? Number(paymentForm.accountId) : null,
        reference: paymentForm.reference,
        notes: paymentForm.notes
      });
      showToast(`Payment of ${fmt(Number(paymentForm.amount))} applied to ${selectedInvoice.invoiceNumber}`);
      setPayModalOpen(false);
      setSelectedInvoice(null);
      loadData();
    } catch {
      showToast('Error recording invoice payment');
    }
  };

  // Handle Direct Collection
  const handleDirectCollection = async () => {
    if (!collectForm.amount || Number(collectForm.amount) <= 0) return;
    try {
      await recordClientCollection(1, client.id, {
        date: collectForm.date,
        amount: Number(collectForm.amount),
        payment_method: collectForm.method,
        reference: collectForm.reference,
        note: collectForm.notes
      });
      showToast(`Collected ${fmt(Number(collectForm.amount))} from ${client.name}`);
      setCollectModalOpen(false);
      loadData();
    } catch {
      showToast('Error recording collection');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        <p>Loading live client profile from database...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <Card style={{ padding: 32, textAlign: 'center' }}>
        <h3>Client Not Found</h3>
        <p style={{ color: '#64748b', marginTop: 8 }}>No client record found for ID #{clientId}.</p>
        <Button asChild style={{ marginTop: 16 }} variant="outline">
          <Link href="/customers">Return to Clients</Link>
        </Button>
      </Card>
    );
  }

  const unbilledDuties = (client.duties || []).filter((d: any) => !d.isInvoiced && d.status === 'Completed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Link href="/customers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1677ff', textDecoration: 'none', fontWeight: 600, fontSize: 13.5 }}>
          <ArrowLeft size={16} /> Back to All Clients
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" onClick={() => setCollectModalOpen(true)}>
            <CreditCard size={15} style={{ marginRight: 6 }} /> Direct Collection
          </Button>
          <Button onClick={() => setInvoiceModalOpen(true)} style={{ background: '#1677ff', color: '#fff' }}>
            <Plus size={15} style={{ marginRight: 6 }} /> Generate Invoice
          </Button>
        </div>
      </div>

      {/* Client Overview Card */}
      <Card style={{ padding: 24, borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 750, color: '#0f172a', margin: 0 }}>{client.name}</h1>
              <span style={{ fontSize: 11.5, background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                {client.clientId}
              </span>
              <span style={{ fontSize: 11.5, background: client.due > 0 ? '#fef2f2' : '#f0fdf4', color: client.due > 0 ? '#b91c1c' : '#15803d', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                {client.due > 0 ? 'Payment Due' : 'All Settled'}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 6, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span><Building2 size={14} style={{ display: 'inline', marginRight: 4 }} /> {client.clientType}</span>
              <span><UserCheck size={14} style={{ display: 'inline', marginRight: 4 }} /> Contact: {client.contactPerson || 'N/A'}</span>
              <span><Phone size={14} style={{ display: 'inline', marginRight: 4 }} /> {client.mobile}</span>
              <span><Mail size={14} style={{ display: 'inline', marginRight: 4 }} /> {client.email}</span>
            </p>
            <p style={{ color: '#64748b', fontSize: 12.5, margin: 0 }}>
              <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} /> {client.address || client.billingAddress || 'Dhaka, Bangladesh'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 24, textAlign: 'right', background: '#f8fafc', padding: '12px 20px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Invoiced</span>
              <div style={{ fontSize: 17, fontWeight: 750, color: '#0f172a' }}>{fmt(client.totalReceivable)}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Collected</span>
              <div style={{ fontSize: 17, fontWeight: 750, color: '#16a34a' }}>{fmt(client.totalCollected)}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Outstanding Due</span>
              <div style={{ fontSize: 18, fontWeight: 800, color: client.due > 0 ? '#ef4444' : '#16a34a' }}>{fmt(client.due)}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="invoices">
        <TabsList style={{ marginBottom: 16 }}>
          <TabsTrigger value="invoices">Invoices ({client.invoices?.length || 0})</TabsTrigger>
          <TabsTrigger value="duties">Duties & Trips ({client.duties?.length || 0})</TabsTrigger>
          <TabsTrigger value="payments">Payment History ({client.payments?.length || 0})</TabsTrigger>
        </TabsList>

        {/* 1. Invoices Tab */}
        <TabsContent value="invoices">
          <Card style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Client Invoice Ledger</h3>
              <Button size="sm" onClick={() => setInvoiceModalOpen(true)}>+ New Invoice</Button>
            </div>
            {(!client.invoices || client.invoices.length === 0) ? (
              <p style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>No invoices generated yet for this client.</p>
            ) : (
              <div className="table-responsive-container">
                <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left', height: 36 }}>
                      <th>Invoice #</th>
                      <th>Issue Date</th>
                      <th>Due Date</th>
                      <th>Total Amount</th>
                      <th>Paid</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.invoices.map((inv: any) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9', height: 44 }}>
                        <td style={{ fontWeight: 600, color: '#1677ff' }}>{inv.invoiceNumber}</td>
                        <td>{inv.issueDate}</td>
                        <td>{inv.dueDate}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(inv.totalAmount)}</td>
                        <td style={{ color: '#16a34a' }}>{fmt(inv.paidAmount)}</td>
                        <td style={{ color: inv.remainingDue > 0 ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                          {fmt(inv.remainingDue)}
                        </td>
                        <td>
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                            background: inv.status === 'Paid' ? '#f0fdf4' : inv.status === 'Partially Paid' ? '#fffbeb' : '#fef2f2',
                            color: inv.status === 'Paid' ? '#16a34a' : inv.status === 'Partially Paid' ? '#d97706' : '#ef4444'
                          }}>
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {inv.remainingDue > 0 && (
                              <Button size="sm" variant="outline" onClick={() => { setSelectedInvoice(inv); setPayModalOpen(true); }}>
                                Pay
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedInvoice(inv); setViewInvoiceModalOpen(true); }}>
                              <Printer size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* 2. Duties & Trips Tab */}
        <TabsContent value="duties">
          <Card style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Associated Duties & Trips</h3>
              {unbilledDuties.length > 0 && (
                <span style={{ fontSize: 12, color: '#d97706', fontWeight: 600 }}>
                  ⚠️ {unbilledDuties.length} completed duty ready for invoicing
                </span>
              )}
            </div>
            {(!client.duties || client.duties.length === 0) ? (
              <p style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>No duties recorded for this client.</p>
            ) : (
              <div className="table-responsive-container">
                <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left', height: 36 }}>
                      <th>Duty ID</th>
                      <th>Date</th>
                      <th>Vehicle</th>
                      <th>Driver</th>
                      <th>Route</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Invoice Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.duties.map((d: any) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9', height: 44 }}>
                        <td style={{ fontWeight: 600 }}>{d.dutyId}</td>
                        <td>{d.date}</td>
                        <td>{d.vehicleReg}</td>
                        <td>{d.driverName}</td>
                        <td>{d.pickup} → {d.destination}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(d.totalAmount)}</td>
                        <td>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>
                            {d.status}
                          </span>
                        </td>
                        <td>
                          {d.isInvoiced ? (
                            <span style={{ color: '#16a34a', fontSize: 11.5, fontWeight: 600 }}>
                              ✓ {d.invoiceNumber || 'Invoiced'}
                            </span>
                          ) : (
                            <span style={{ color: '#d97706', fontSize: 11.5, fontWeight: 600 }}>
                              ● Not Invoiced
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* 3. Payment History Tab */}
        <TabsContent value="payments">
          <Card style={{ padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Collection & Payment Receipts</h3>
            {(!client.payments || client.payments.length === 0) ? (
              <p style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>No collections recorded yet.</p>
            ) : (
              <div className="table-responsive-container">
                <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left', height: 36 }}>
                      <th>Txn ID</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Payment Method</th>
                      <th>Reference</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.payments.map((p: any) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', height: 44 }}>
                        <td style={{ fontWeight: 600, color: '#64748b' }}>{p.transactionId}</td>
                        <td>{p.date}</td>
                        <td style={{ fontWeight: 700, color: '#16a34a' }}>{fmt(p.amount)}</td>
                        <td>{p.method}</td>
                        <td>{p.reference || '—'}</td>
                        <td style={{ color: '#475569' }}>{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: Generate Invoice */}
      <Dialog open={invoiceModalOpen} onOpenChange={setInvoiceModalOpen}>
        <DialogContent style={{ maxWidth: 540 }}>
          <DialogHeader>
            <DialogTitle>Generate New Invoice — {client.name}</DialogTitle>
            <DialogDescription>Create a formal sequential invoice from completed duties or add custom line items.</DialogDescription>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Issue Date</label>
                <Input type="date" value={newInvoice.issueDate} onChange={e => setNewInvoice({ ...newInvoice, issueDate: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Due Date</label>
                <Input type="date" value={newInvoice.dueDate} onChange={e => setNewInvoice({ ...newInvoice, dueDate: e.target.value })} />
              </div>
            </div>

            {/* Select Unbilled Duties */}
            {unbilledDuties.length > 0 && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Select Unbilled Completed Duties</label>
                <div style={{ maxHeight: 130, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, marginTop: 4 }}>
                  {unbilledDuties.map((d: any) => {
                    const isChecked = newInvoice.selectedDutyIds.includes(Number(d.id));
                    return (
                      <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setNewInvoice({ ...newInvoice, selectedDutyIds: [...newInvoice.selectedDutyIds, Number(d.id)] });
                            } else {
                              setNewInvoice({ ...newInvoice, selectedDutyIds: newInvoice.selectedDutyIds.filter(id => id !== Number(d.id)) });
                            }
                          }}
                        />
                        <span><b>{d.dutyId}</b> ({d.date}) — {d.vehicleReg}: {fmt(d.totalAmount)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom line item */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Or Add Custom Billing Item</label>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginTop: 4 }}>
                <Input placeholder="Description (e.g. Monthly Retainer)" value={newInvoice.customDesc} onChange={e => setNewInvoice({ ...newInvoice, customDesc: e.target.value })} />
                <Input type="number" placeholder="Amount (৳)" value={newInvoice.customAmount} onChange={e => setNewInvoice({ ...newInvoice, customAmount: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Discount (৳)</label>
                <Input type="number" value={newInvoice.discount} onChange={e => setNewInvoice({ ...newInvoice, discount: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Tax / VAT (৳)</label>
                <Input type="number" value={newInvoice.tax} onChange={e => setNewInvoice({ ...newInvoice, tax: e.target.value })} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Notes / Payment Terms</label>
              <Input placeholder="Payable within 15 days via bank transfer or cheque" value={newInvoice.notes} onChange={e => setNewInvoice({ ...newInvoice, notes: e.target.value })} />
            </div>
          </div>

          <DialogFooter style={{ marginTop: 16 }}>
            <Button variant="outline" onClick={() => setInvoiceModalOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerateInvoice}>Create Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Record Payment against Invoice */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent style={{ maxWidth: 440 }}>
          <DialogHeader>
            <DialogTitle>Record Payment — {selectedInvoice?.invoiceNumber}</DialogTitle>
            <DialogDescription>
              Total: {fmt(selectedInvoice?.totalAmount || 0)} | Due: {fmt(selectedInvoice?.remainingDue || 0)}
            </DialogDescription>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Payment Date</label>
              <Input type="date" value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Payment Amount (৳)</label>
              <Input type="number" placeholder={`Max ${selectedInvoice?.remainingDue || 0}`} value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Payment Method</label>
              <Select value={paymentForm.method} onValueChange={v => setPaymentForm({ ...paymentForm, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Mobile Banking">bKash / Nagad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Deposit Into Account</label>
              <Select value={paymentForm.accountId} onValueChange={v => setPaymentForm({ ...paymentForm, accountId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Financial Account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.type})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Reference / Cheque No.</label>
              <Input placeholder="CHK-88192" value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} />
            </div>
          </div>

          <DialogFooter style={{ marginTop: 16 }}>
            <Button variant="outline" onClick={() => setPayModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordInvoicePayment}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Direct Collection */}
      <Dialog open={collectModalOpen} onOpenChange={setCollectModalOpen}>
        <DialogContent style={{ maxWidth: 440 }}>
          <DialogHeader>
            <DialogTitle>Direct Collection — {client.name}</DialogTitle>
            <DialogDescription>Record a direct receipt towards outstanding client balance.</DialogDescription>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Amount (৳)</label>
              <Input type="number" placeholder="Amount (৳)" value={collectForm.amount} onChange={e => setCollectForm({ ...collectForm, amount: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Payment Method</label>
              <Select value={collectForm.method} onValueChange={v => setCollectForm({ ...collectForm, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Mobile Banking">Mobile Banking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Reference</label>
              <Input placeholder="Reference" value={collectForm.reference} onChange={e => setCollectForm({ ...collectForm, reference: e.target.value })} />
            </div>
          </div>

          <DialogFooter style={{ marginTop: 16 }}>
            <Button variant="outline" onClick={() => setCollectModalOpen(false)}>Cancel</Button>
            <Button onClick={handleDirectCollection}>Record Collection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Printable Invoice View */}
      <Dialog open={viewInvoiceModalOpen} onOpenChange={setViewInvoiceModalOpen}>
        <DialogContent style={{ maxWidth: 640 }}>
          {selectedInvoice && (
            <div style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>TASIN ENTERPRISE</h2>
                  <p style={{ margin: '4px 0', fontSize: 12, color: '#64748b' }}>Rent a Car Management System</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>Motijheel C/A, Dhaka-1000 | +880 1711-234567</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#1677ff' }}>INVOICE</h3>
                  <p style={{ margin: '4px 0', fontSize: 13, fontWeight: 700 }}>{selectedInvoice.invoiceNumber}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>Date: {selectedInvoice.issueDate}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>Due: {selectedInvoice.dueDate}</p>
                </div>
              </div>

              <div style={{ marginTop: 16, fontSize: 12.5 }}>
                <p style={{ margin: '2px 0', color: '#64748b' }}>Billed To:</p>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{client.name}</p>
                <p style={{ margin: '2px 0' }}>{client.address || 'Dhaka, Bangladesh'}</p>
                <p style={{ margin: '2px 0' }}>Phone: {client.mobile}</p>
              </div>

              <div style={{ marginTop: 20 }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', height: 32, textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Description</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Qty</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Unit Price</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedInvoice.items || []).map((it: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', height: 36 }}>
                        <td style={{ padding: '6px 8px' }}>{it.description}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{it.quantity}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmt(it.unitPrice)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{fmt(it.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <div style={{ width: 220, fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Total Amount:</span>
                    <span style={{ fontWeight: 700 }}>{fmt(selectedInvoice.totalAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Paid Amount:</span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>{fmt(selectedInvoice.paidAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 6 }}>
                    <span style={{ fontWeight: 700 }}>Balance Due:</span>
                    <span style={{ fontWeight: 800, color: selectedInvoice.remainingDue > 0 ? '#ef4444' : '#16a34a' }}>
                      {fmt(selectedInvoice.remainingDue)}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <Button variant="outline" onClick={() => setViewInvoiceModalOpen(false)}>Close</Button>
                <Button onClick={() => window.print()}><Printer size={15} style={{ marginRight: 6 }} /> Print Invoice</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, background: '#0f172a', color: '#fff',
          padding: '10px 18px', borderRadius: 8, fontSize: 13, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
