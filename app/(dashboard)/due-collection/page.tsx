"use client";
import {useState, useMemo, useEffect} from 'react';
import {CircleDollarSign, AlertCircle, TrendingDown, Wrench, UserRound, CheckCircle2, ChevronUp, ChevronDown, ChevronsUpDown, ArrowUpRight} from 'lucide-react';
import {fetchDueCollection, recordClientCollection, recordOwnerPayment, recordDriverPayment} from '@/lib/api';
import {demoClients, demoOwners, demoDrivers, demoGarages, demoVehicles} from '@/lib/tasin-data';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from '@/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {SectionHeading} from '@/components/shared/section-heading';
import {Money} from '@/components/shared/money';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientDue {
  id: string;
  name: string;
  contactPerson: string;
  mobile: string;
  totalInvoice: number;
  paid: number;
  remaining: number;
  overdueDays: number;
  status: 'overdue' | 'partial' | 'paid';
}

interface OwnerDue {
  id: string;
  name: string;
  mobile: string;
  vehicleCount: number;
  totalPayable: number;
  paid: number;
  remaining: number;
}

interface DriverDue {
  id: string;
  name: string;
  mobile: string;
  vehicleReg: string;
  salary: number;
  allowance: number;
  advance: number;
  totalPaid: number;
  remaining: number;
}

interface GarageDue {
  id: string;
  name: string;
  contactPerson: string;
  mobile: string;
  garageType: string;
  totalBill: number;
  paid: number;
  remaining: number;
}

interface PaymentForm {
  date: string;
  amount: string;
  method: string;
  reference: string;
  note: string;
}

type ModalTarget =
  | {kind: 'client'; row: ClientDue}
  | {kind: 'owner'; row: OwnerDue}
  | {kind: 'driver'; row: DriverDue}
  | {kind: 'garage'; row: GarageDue}
  | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getOverdueDays(id: string): number {
  const seed: Record<string, number> = {
    'CLT-001': 42, 'CLT-002': 0, 'CLT-003': 25, 'CLT-004': 60, 'CLT-005': 0,
  };
  return seed[id] ?? 0;
}

function getClientStatus(remaining: number, overdueDays: number): 'overdue' | 'partial' | 'paid' {
  if (remaining === 0) return 'paid';
  if (overdueDays > 30) return 'overdue';
  return 'partial';
}

// ─── Build initial rows from mock data ───────────────────────────────────────

function buildClientRows(): ClientDue[] {
  return demoClients.map(c => {
    const remaining = c.totalReceivable - c.totalCollected;
    const overdueDays = getOverdueDays(c.id);
    return {
      id: c.id,
      name: c.name,
      contactPerson: c.contactPerson,
      mobile: c.mobile,
      totalInvoice: c.totalReceivable,
      paid: c.totalCollected,
      remaining,
      overdueDays,
      status: getClientStatus(remaining, overdueDays),
    };
  });
}

function buildOwnerRows(): OwnerDue[] {
  return demoOwners.map(o => ({
    id: o.id,
    name: o.name,
    mobile: o.mobile,
    vehicleCount: o.totalVehicles,
    totalPayable: o.totalPayable,
    paid: o.totalPaid,
    remaining: o.totalPayable - o.totalPaid,
  }));
}

function buildDriverRows(): DriverDue[] {
  return demoDrivers.map(d => {
    const vehicle = d.assignedVehicleId
      ? demoVehicles.find(v => v.id === d.assignedVehicleId)
      : undefined;
    const remaining = d.monthlySalary + d.advance - d.totalPaid;
    return {
      id: d.id,
      name: d.name,
      mobile: d.mobile,
      vehicleReg: vehicle?.registration ?? '—',
      salary: d.monthlySalary,
      allowance: d.dailyAllowance,
      advance: d.advance,
      totalPaid: d.totalPaid,
      remaining: Math.max(0, remaining),
    };
  });
}

function buildGarageRows(): GarageDue[] {
  return demoGarages.map(g => ({
    id: g.id,
    name: g.name,
    contactPerson: g.contactPerson,
    mobile: g.mobile,
    garageType: g.garageType,
    totalBill: g.totalBill,
    paid: g.totalPaid,
    remaining: g.totalBill - g.totalPaid,
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({status, days}: {status: 'overdue' | 'partial' | 'paid'; days?: number}) {
  if (status === 'paid') return <span className="badge badge-good">Paid</span>;
  if (status === 'overdue') return <span className="badge badge-bad">Overdue {days ? `${days}d` : ''}</span>;
  return <span className="badge badge-warn">Partial</span>;
}

function SortIcon({dir}: {dir: 'asc' | 'desc' | null}) {
  if (dir === 'asc') return <ChevronUp size={12}/>;
  if (dir === 'desc') return <ChevronDown size={12}/>;
  return <ChevronsUpDown size={12} className="sort-idle"/>;
}

function useSortState(initial: string) {
  const [col, setCol] = useState(initial);
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  function toggle(c: string) {
    if (c === col) setDir(d => d === 'asc' ? 'desc' : 'asc');
    else {setCol(c); setDir('asc');}
  }
  return {col, dir, toggle};
}

function Th({label, sortKey, sort}: {label: string; sortKey: string; sort: ReturnType<typeof useSortState>}) {
  return (
    <th data-slot="table-head">
      <button className="sort-button" onClick={() => sort.toggle(sortKey)}>
        {label} <SortIcon dir={sort.col === sortKey ? sort.dir : null}/>
      </button>
    </th>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

function PaymentModal({
  target, onClose, onConfirm,
}: {
  target: ModalTarget;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}) {
  const [form, setForm] = useState<PaymentForm>({
    date: today(),
    amount: target
      ? String(
          target.kind === 'client' ? target.row.remaining :
          target.kind === 'owner'  ? target.row.remaining :
          target.kind === 'driver' ? target.row.remaining :
          target.kind === 'garage' ? target.row.remaining : 0
        )
      : '',
    method: 'Cash',
    reference: '',
    note: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!target) return null;

  const maxAmount =
    target.kind === 'client' ? target.row.remaining :
    target.kind === 'owner'  ? target.row.remaining :
    target.kind === 'driver' ? target.row.remaining :
    target.kind === 'garage' ? target.row.remaining : 0;

  const modalTitle =
    target.kind === 'client' ? 'Receive Payment' :
    target.kind === 'owner'  ? 'Make Owner Payment' :
    target.kind === 'driver' ? 'Pay Driver Salary' :
    'Pay Garage Bill';

  const partyName =
    target.kind === 'client' ? target.row.name :
    target.kind === 'owner'  ? target.row.name :
    target.kind === 'driver' ? target.row.name :
    target.row.name;

  function handleSubmit() {
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) {setError('Enter a valid amount.'); return;}
    if (amt > maxAmount) {setError(`Amount cannot exceed remaining due of ৳${maxAmount.toLocaleString('en-US')}.`); return;}
    if (!form.date) {setError('Collection date is required.'); return;}
    setError('');
    setSuccess(true);
    setTimeout(() => {
      onConfirm(amt);
      onClose();
    }, 1200);
  }

  if (success) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-sm">
          <div style={{textAlign: 'center', padding: '20px 0 10px'}}>
            <CheckCircle2 size={48} style={{color: '#328562', margin: '0 auto 12px'}}/>
            <strong style={{display:'block', fontSize:16, color:'#1e3947'}}>Payment Recorded!</strong>
            <small style={{color:'#78898e', marginTop:6, display:'block'}}>
              ৳{parseFloat(form.amount).toLocaleString('en-US')} recorded for {partyName}.
            </small>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <p style={{fontSize:12, color:'#78898e', margin:0}}>{partyName}</p>
        </DialogHeader>

        <div className="entry-form" style={{paddingTop:4}}>
          {/* Remaining badge */}
          <div style={{background:'#eaf3f4', borderRadius:8, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span style={{fontSize:11, color:'#4c8391', fontWeight:700}}>Remaining Due</span>
            <strong style={{fontSize:18, color:'#1e5c6e', fontVariantNumeric:'tabular-nums'}}>
              ৳{maxAmount.toLocaleString('en-US')}
            </strong>
          </div>

          <div className="form-grid">
            <label>
              Collection Date
              <Input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))}/>
            </label>
            <label>
              Amount (৳)
              <Input
                type="number"
                min={1}
                max={maxAmount}
                value={form.amount}
                onChange={e => setForm(f => ({...f, amount: e.target.value}))}
                placeholder="Enter amount"
              />
            </label>
          </div>

          <label>
            Payment Method
            <Select value={form.method} onValueChange={v => setForm(f => ({...f, method: v}))}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Mobile Banking">Mobile Banking (bKash/Nagad)</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label>
            Transaction Reference
            <Input
              value={form.reference}
              onChange={e => setForm(f => ({...f, reference: e.target.value}))}
              placeholder="e.g. BEFTN-12345 or bKash TxID"
            />
          </label>

          <label>
            Note (optional)
            <Input
              value={form.note}
              onChange={e => setForm(f => ({...f, note: e.target.value}))}
              placeholder="e.g. Partial payment for November"
            />
          </label>

          {error && (
            <div className="form-error">
              <AlertCircle size={14}/> {error}
            </div>
          )}
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={handleSubmit} style={{background:'#215b70'}}>
            <CheckCircle2 size={14}/> Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Aging Card ───────────────────────────────────────────────────────────────

function AgingSummary({clients}: {clients: ClientDue[]}) {
  const buckets = [
    {label: '0–30 days',  color: '#badge-warn', bg: '#fcf1dc', fg: '#a57a2b', amount: 0},
    {label: '31–60 days', color: '',            bg: '#fde8e6', fg: '#a05048', amount: 0},
    {label: '61–90 days', color: '',            bg: '#fbe0de', fg: '#923830', amount: 0},
    {label: '90+ days',   color: '',            bg: '#f7d2ce', fg: '#7a2920', amount: 0},
  ];
  clients.filter(c => c.remaining > 0).forEach(c => {
    const d = c.overdueDays;
    if      (d <= 30)  buckets[0].amount += c.remaining;
    else if (d <= 60)  buckets[1].amount += c.remaining;
    else if (d <= 90)  buckets[2].amount += c.remaining;
    else               buckets[3].amount += c.remaining;
  });

  return (
    <Card style={{padding:'18px 20px', marginTop:16}}>
      <SectionHeading title="Due Aging Summary" subtitle="Customer receivables by overdue bracket"/>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:12}}>
        {buckets.map(b => (
          <div key={b.label} style={{background:b.bg, borderRadius:9, padding:'13px 15px'}}>
            <span style={{fontSize:10, fontWeight:700, color:b.fg, letterSpacing:'.06em', display:'block'}}>{b.label}</span>
            <strong style={{fontSize:20, color:b.fg, display:'block', marginTop:7, fontVariantNumeric:'tabular-nums'}}>
              ৳{b.amount.toLocaleString('en-US')}
            </strong>
            <small style={{fontSize:10, color:b.fg, opacity:.8}}>
              {clients.filter(c => {
                const d = c.overdueDays;
                return b.label === '0–30 days'  ? (d <= 30 && c.remaining > 0) :
                       b.label === '31–60 days' ? (d > 30 && d <= 60) :
                       b.label === '61–90 days' ? (d > 60 && d <= 90) :
                       d > 90;
              }).length} client(s)
            </small>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Tab 1: Customer Receivable ───────────────────────────────────────────────

function CustomerTab({
  rows, onAction,
}: {
  rows: ClientDue[];
  onAction: (row: ClientDue) => void;
}) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const sort = useSortState('name');

  const filtered = useMemo(() => {
    let r = rows.filter(c =>
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(q.toLowerCase()) ||
      c.mobile.includes(q)
    );
    if (statusFilter !== 'all') r = r.filter(c => c.status === statusFilter);
    r = [...r].sort((a, b) => {
      const mult = sort.dir === 'asc' ? 1 : -1;
      if (sort.col === 'name')      return mult * a.name.localeCompare(b.name);
      if (sort.col === 'invoice')   return mult * (a.totalInvoice - b.totalInvoice);
      if (sort.col === 'paid')      return mult * (a.paid - b.paid);
      if (sort.col === 'remaining') return mult * (a.remaining - b.remaining);
      if (sort.col === 'days')      return mult * (a.overdueDays - b.overdueDays);
      return 0;
    });
    return r;
  }, [rows, q, statusFilter, sort.col, sort.dir]);

  return (
    <>
      <div className="toolbar">
        <Input placeholder="Search client, contact, mobile…" value={q} onChange={e => setQ(e.target.value)} style={{maxWidth:280}}/>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="All Status"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
        <span style={{marginLeft:'auto', fontSize:12, color:'#78898e'}}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <Card style={{overflowX:'auto'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <Th label="Client Name"    sortKey="name"      sort={sort}/>
              <Th label="Contact"        sortKey="contact"   sort={sort}/>
              <Th label="Total Invoice"  sortKey="invoice"   sort={sort}/>
              <Th label="Paid"           sortKey="paid"      sort={sort}/>
              <Th label="Remaining Due"  sortKey="remaining" sort={sort}/>
              <Th label="Overdue Days"   sortKey="days"      sort={sort}/>
              <th data-slot="table-head">Status</th>
              <th data-slot="table-head" style={{textAlign:'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td data-slot="table-cell" colSpan={8} style={{textAlign:'center', padding:'40px 0', color:'#91a3a9'}}>
                No records found.
              </td></tr>
            )}
            {filtered.map(row => (
              <tr key={row.id} className="click-row">
                <td data-slot="table-cell">
                  <b>{row.name}</b>
                  <small>{row.id}</small>
                </td>
                <td data-slot="table-cell">
                  {row.contactPerson}
                  <small>{row.mobile}</small>
                </td>
                <td data-slot="table-cell" className="nums">৳{row.totalInvoice.toLocaleString('en-US')}</td>
                <td data-slot="table-cell" className="nums" style={{color:'#328562'}}>৳{row.paid.toLocaleString('en-US')}</td>
                <td data-slot="table-cell" className="nums due">
                  {row.remaining > 0 ? `৳${row.remaining.toLocaleString('en-US')}` : '—'}
                </td>
                <td data-slot="table-cell">
                  {row.overdueDays > 0
                    ? <span style={{color: row.overdueDays > 30 ? '#a85851' : '#a57a2b', fontWeight:700}}>{row.overdueDays}d</span>
                    : <span style={{color:'#9aa6a9'}}>—</span>
                  }
                </td>
                <td data-slot="table-cell">
                  <StatusBadge status={row.status} days={row.overdueDays}/>
                </td>
                <td data-slot="table-cell" style={{textAlign:'right'}}>
                  <Button
                    size="sm"
                    disabled={row.remaining === 0}
                    onClick={() => onAction(row)}
                    style={{fontSize:11, height:28, background: row.remaining > 0 ? '#215b70' : undefined}}
                  >
                    <ArrowUpRight size={12}/> Receive Payment
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ─── Tab 2: Owner Payable ─────────────────────────────────────────────────────

function OwnerTab({rows, onAction}: {rows: OwnerDue[]; onAction: (row: OwnerDue) => void}) {
  const [q, setQ] = useState('');
  const sort = useSortState('name');

  const filtered = useMemo(() => {
    let r = rows.filter(o => o.name.toLowerCase().includes(q.toLowerCase()) || o.mobile.includes(q));
    return [...r].sort((a, b) => {
      const mult = sort.dir === 'asc' ? 1 : -1;
      if (sort.col === 'name')      return mult * a.name.localeCompare(b.name);
      if (sort.col === 'vehicles')  return mult * (a.vehicleCount - b.vehicleCount);
      if (sort.col === 'payable')   return mult * (a.totalPayable - b.totalPayable);
      if (sort.col === 'paid')      return mult * (a.paid - b.paid);
      if (sort.col === 'remaining') return mult * (a.remaining - b.remaining);
      return 0;
    });
  }, [rows, q, sort.col, sort.dir]);

  return (
    <>
      <div className="toolbar">
        <Input placeholder="Search owner…" value={q} onChange={e => setQ(e.target.value)} style={{maxWidth:280}}/>
        <span style={{marginLeft:'auto', fontSize:12, color:'#78898e'}}>{filtered.length} owner(s)</span>
      </div>
      <Card style={{overflowX:'auto'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <Th label="Owner"          sortKey="name"      sort={sort}/>
              <Th label="Vehicles"       sortKey="vehicles"  sort={sort}/>
              <Th label="Total Payable"  sortKey="payable"   sort={sort}/>
              <Th label="Paid"           sortKey="paid"      sort={sort}/>
              <Th label="Remaining Due"  sortKey="remaining" sort={sort}/>
              <th data-slot="table-head">Status</th>
              <th data-slot="table-head" style={{textAlign:'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id} className="click-row">
                <td data-slot="table-cell">
                  <b>{row.name}</b>
                  <small>{row.mobile}</small>
                </td>
                <td data-slot="table-cell">{row.vehicleCount} vehicle(s)</td>
                <td data-slot="table-cell" className="nums">৳{row.totalPayable.toLocaleString('en-US')}</td>
                <td data-slot="table-cell" className="nums" style={{color:'#328562'}}>৳{row.paid.toLocaleString('en-US')}</td>
                <td data-slot="table-cell" className="nums due">
                  {row.remaining > 0 ? `৳${row.remaining.toLocaleString('en-US')}` : <span style={{color:'#9aa6a9'}}>—</span>}
                </td>
                <td data-slot="table-cell">
                  {row.remaining === 0
                    ? <span className="badge badge-good">Cleared</span>
                    : <span className="badge badge-warn">Pending</span>
                  }
                </td>
                <td data-slot="table-cell" style={{textAlign:'right'}}>
                  <Button
                    size="sm"
                    disabled={row.remaining === 0}
                    onClick={() => onAction(row)}
                    style={{fontSize:11, height:28, background: row.remaining > 0 ? '#215b70' : undefined}}
                  >
                    Make Payment
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ─── Tab 3: Driver Payable ────────────────────────────────────────────────────

function DriverTab({rows, onAction}: {rows: DriverDue[]; onAction: (row: DriverDue) => void}) {
  const [q, setQ] = useState('');
  const sort = useSortState('name');

  const filtered = useMemo(() => {
    let r = rows.filter(d => d.name.toLowerCase().includes(q.toLowerCase()) || d.vehicleReg.includes(q));
    return [...r].sort((a, b) => {
      const mult = sort.dir === 'asc' ? 1 : -1;
      if (sort.col === 'name')      return mult * a.name.localeCompare(b.name);
      if (sort.col === 'salary')    return mult * (a.salary - b.salary);
      if (sort.col === 'remaining') return mult * (a.remaining - b.remaining);
      return 0;
    });
  }, [rows, q, sort.col, sort.dir]);

  return (
    <>
      <div className="toolbar">
        <Input placeholder="Search driver or vehicle…" value={q} onChange={e => setQ(e.target.value)} style={{maxWidth:280}}/>
        <span style={{marginLeft:'auto', fontSize:12, color:'#78898e'}}>{filtered.length} driver(s)</span>
      </div>
      <Card style={{overflowX:'auto'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <Th label="Driver"        sortKey="name"      sort={sort}/>
              <th data-slot="table-head">Vehicle</th>
              <Th label="Salary"        sortKey="salary"    sort={sort}/>
              <th data-slot="table-head">Allowance/Day</th>
              <th data-slot="table-head">Advance</th>
              <th data-slot="table-head">Total Paid</th>
              <Th label="Remaining Due" sortKey="remaining" sort={sort}/>
              <th data-slot="table-head" style={{textAlign:'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id} className="click-row">
                <td data-slot="table-cell">
                  <b>{row.name}</b>
                  <small>{row.mobile}</small>
                </td>
                <td data-slot="table-cell" style={{fontSize:11}}>{row.vehicleReg}</td>
                <td data-slot="table-cell" className="nums">৳{row.salary.toLocaleString('en-US')}</td>
                <td data-slot="table-cell" className="nums">৳{row.allowance.toLocaleString('en-US')}</td>
                <td data-slot="table-cell" className="nums">{row.advance > 0 ? `৳${row.advance.toLocaleString('en-US')}` : '—'}</td>
                <td data-slot="table-cell" className="nums" style={{color:'#328562'}}>৳{row.totalPaid.toLocaleString('en-US')}</td>
                <td data-slot="table-cell" className="nums due">
                  {row.remaining > 0 ? `৳${row.remaining.toLocaleString('en-US')}` : <span style={{color:'#9aa6a9'}}>—</span>}
                </td>
                <td data-slot="table-cell" style={{textAlign:'right'}}>
                  <Button
                    size="sm"
                    disabled={row.remaining === 0}
                    onClick={() => onAction(row)}
                    style={{fontSize:11, height:28, background: row.remaining > 0 ? '#215b70' : undefined}}
                  >
                    Pay Salary
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ─── Tab 4: Garage Payable ────────────────────────────────────────────────────

function GarageTab({rows, onAction}: {rows: GarageDue[]; onAction: (row: GarageDue) => void}) {
  const [q, setQ] = useState('');
  const sort = useSortState('name');

  const filtered = useMemo(() => {
    let r = rows.filter(g =>
      g.name.toLowerCase().includes(q.toLowerCase()) ||
      g.garageType.toLowerCase().includes(q.toLowerCase())
    );
    return [...r].sort((a, b) => {
      const mult = sort.dir === 'asc' ? 1 : -1;
      if (sort.col === 'name')      return mult * a.name.localeCompare(b.name);
      if (sort.col === 'bill')      return mult * (a.totalBill - b.totalBill);
      if (sort.col === 'remaining') return mult * (a.remaining - b.remaining);
      return 0;
    });
  }, [rows, q, sort.col, sort.dir]);

  return (
    <>
      <div className="toolbar">
        <Input placeholder="Search garage…" value={q} onChange={e => setQ(e.target.value)} style={{maxWidth:280}}/>
        <span style={{marginLeft:'auto', fontSize:12, color:'#78898e'}}>{filtered.length} garage(s)</span>
      </div>
      <Card style={{overflowX:'auto'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <Th label="Garage"        sortKey="name"      sort={sort}/>
              <th data-slot="table-head">Type</th>
              <Th label="Total Bill"    sortKey="bill"      sort={sort}/>
              <th data-slot="table-head">Paid</th>
              <Th label="Remaining Due" sortKey="remaining" sort={sort}/>
              <th data-slot="table-head">Status</th>
              <th data-slot="table-head" style={{textAlign:'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id} className="click-row">
                <td data-slot="table-cell">
                  <b>{row.name}</b>
                  <small>{row.contactPerson} · {row.mobile}</small>
                </td>
                <td data-slot="table-cell">
                  <span className="badge badge-blue">{row.garageType}</span>
                </td>
                <td data-slot="table-cell" className="nums">৳{row.totalBill.toLocaleString('en-US')}</td>
                <td data-slot="table-cell" className="nums" style={{color:'#328562'}}>৳{row.paid.toLocaleString('en-US')}</td>
                <td data-slot="table-cell" className="nums due">
                  {row.remaining > 0 ? `৳${row.remaining.toLocaleString('en-US')}` : <span style={{color:'#9aa6a9'}}>—</span>}
                </td>
                <td data-slot="table-cell">
                  {row.remaining === 0
                    ? <span className="badge badge-good">Cleared</span>
                    : <span className="badge badge-warn">Pending</span>
                  }
                </td>
                <td data-slot="table-cell" style={{textAlign:'right'}}>
                  <Button
                    size="sm"
                    disabled={row.remaining === 0}
                    onClick={() => onAction(row)}
                    style={{fontSize:11, height:28, background: row.remaining > 0 ? '#215b70' : undefined}}
                  >
                    Pay Garage
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DueCollectionPage() {
  // Mutable local state mirroring mock data
  const [clients,  setClients]  = useState<ClientDue[]>(buildClientRows);
  const [owners,   setOwners]   = useState<OwnerDue[]>(buildOwnerRows);
  const [drivers,  setDrivers]  = useState<DriverDue[]>(buildDriverRows);
  const [garages,  setGarages]  = useState<GarageDue[]>(buildGarageRows);
  const [modal,    setModal]    = useState<ModalTarget>(null);

  const loadDues = () => {
    fetchDueCollection(1).then((data: any) => {
      if (data) {
        if (Array.isArray(data.clients) && data.clients.length > 0) setClients(data.clients);
        if (Array.isArray(data.owners) && data.owners.length > 0) setOwners(data.owners);
        if (Array.isArray(data.drivers) && data.drivers.length > 0) setDrivers(data.drivers);
        if (Array.isArray(data.garages) && data.garages.length > 0) setGarages(data.garages);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadDues();
  }, []);

  // ── Summary KPIs ────────────────────────────────────────────────────────────
  const customerReceivable = clients.reduce((s, c) => s + c.remaining, 0);
  const ownerPayable       = owners.reduce((s, o) => s + o.remaining, 0);
  const driverPayable      = drivers.reduce((s, d) => s + d.remaining, 0);
  const garagePayable      = garages.reduce((s, g) => s + g.remaining, 0);
  const totalOverdue       = customerReceivable + ownerPayable + driverPayable + garagePayable;

  // ── Payment handlers ────────────────────────────────────────────────────────
  function handlePayment(amount: number) {
    if (!modal) return;
    if (modal.kind === 'client') {
      recordClientCollection(1, modal.row.id, { amount, payment_method: 'Cash', note: 'Collection' })
        .then(() => loadDues()).catch(() => {});
      setClients(prev => prev.map(c =>
        c.id === modal.row.id
          ? {...c, paid: c.paid + amount, remaining: c.remaining - amount,
              status: (c.remaining - amount) === 0 ? 'paid' : c.status === 'overdue' ? 'overdue' : 'partial'}
          : c
      ));
    } else if (modal.kind === 'owner') {
      recordOwnerPayment(1, modal.row.id, { amount, payment_method: 'Cash', note: 'Owner payout' })
        .then(() => loadDues()).catch(() => {});
      setOwners(prev => prev.map(o =>
        o.id === modal.row.id ? {...o, paid: o.paid + amount, remaining: o.remaining - amount} : o
      ));
    } else if (modal.kind === 'driver') {
      recordDriverPayment(1, modal.row.id, { amount, payment_method: 'Cash', note: 'Driver payment' })
        .then(() => loadDues()).catch(() => {});
      setDrivers(prev => prev.map(d =>
        d.id === modal.row.id ? {...d, totalPaid: d.totalPaid + amount, remaining: d.remaining - amount} : d
      ));
    } else if (modal.kind === 'garage') {
      setGarages(prev => prev.map(g =>
        g.id === modal.row.id ? {...g, paid: g.paid + amount, remaining: g.remaining - amount} : g
      ));
    }
  }

  return (
    <div className="content">
      {/* Page Header */}
      <div className="page-intro">
        <div>
          <p className="eyebrow">FINANCE</p>
          <h1>Due &amp; Collection</h1>
          <p>Track receivables from clients and payables to owners, drivers, and garages.</p>
        </div>
      </div>

      {/* ── Summary Metrics ───────────────────────────────────────────────── */}
      <div className="kpi-grid-5">
        <Card className="metric">
          <div className="metric-top">
            <span>Customer Receivable</span>
            <span className="metric-icon blue"><CircleDollarSign size={19}/></span>
          </div>
          <strong className="nums" style={{fontSize:22}}>৳{customerReceivable.toLocaleString('en-US')}</strong>
          <small>From {clients.filter(c => c.remaining > 0).length} client(s)</small>
        </Card>

        <Card className="metric">
          <div className="metric-top">
            <span>Owner Payable</span>
            <span className="metric-icon gold"><UserRound size={19}/></span>
          </div>
          <strong className="nums" style={{fontSize:22}}>৳{ownerPayable.toLocaleString('en-US')}</strong>
          <small>To {owners.filter(o => o.remaining > 0).length} owner(s)</small>
        </Card>

        <Card className="metric">
          <div className="metric-top">
            <span>Driver Payable</span>
            <span className="metric-icon purple"><UserRound size={19}/></span>
          </div>
          <strong className="nums" style={{fontSize:22}}>৳{driverPayable.toLocaleString('en-US')}</strong>
          <small>To {drivers.filter(d => d.remaining > 0).length} driver(s)</small>
        </Card>

        <Card className="metric">
          <div className="metric-top">
            <span>Garage Payable</span>
            <span className="metric-icon gray"><Wrench size={19}/></span>
          </div>
          <strong className="nums" style={{fontSize:22}}>৳{garagePayable.toLocaleString('en-US')}</strong>
          <small>To {garages.filter(g => g.remaining > 0).length} garage(s)</small>
        </Card>

        <Card className="metric" style={{borderColor: totalOverdue > 0 ? '#f1c9c4' : '#d4edda', background: totalOverdue > 0 ? '#fdf5f4' : '#f4fdf6'}}>
          <div className="metric-top">
            <span style={{color: totalOverdue > 0 ? '#a05048' : '#328562'}}>Total Outstanding</span>
            <span className="metric-icon" style={{background: totalOverdue > 0 ? '#fbe8e6' : '#e6f4ed', color: totalOverdue > 0 ? '#a85851' : '#328562'}}>
              <AlertCircle size={19}/>
            </span>
          </div>
          <strong className="nums" style={{fontSize:22, color: totalOverdue > 0 ? '#a05048' : '#328562'}}>
            ৳{totalOverdue.toLocaleString('en-US')}
          </strong>
          <small>Net across all parties</small>
        </Card>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="customer">
        <TabsList style={{marginBottom:16, maxWidth:'100%', overflowX:'auto', whiteSpace:'nowrap', display:'flex', justifyContent:'flex-start'}}>
          <TabsTrigger value="customer">
            Customer Receivable
            {customerReceivable > 0 && (
              <span className="badge badge-bad" style={{marginLeft:6, fontSize:9}}>
                ৳{(customerReceivable/1000).toFixed(0)}K
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="owner">
            Owner Payable
            {ownerPayable > 0 && (
              <span className="badge badge-warn" style={{marginLeft:6, fontSize:9}}>
                ৳{(ownerPayable/1000).toFixed(0)}K
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="driver">
            Driver Payable
            {driverPayable > 0 && (
              <span className="badge badge-warn" style={{marginLeft:6, fontSize:9}}>
                ৳{(driverPayable/1000).toFixed(0)}K
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="garage">
            Garage Payable
            {garagePayable > 0 && (
              <span className="badge badge-warn" style={{marginLeft:6, fontSize:9}}>
                ৳{(garagePayable/1000).toFixed(0)}K
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customer">
          <CustomerTab
            rows={clients}
            onAction={row => setModal({kind:'client', row})}
          />
          <AgingSummary clients={clients}/>
        </TabsContent>

        <TabsContent value="owner">
          <OwnerTab
            rows={owners}
            onAction={row => setModal({kind:'owner', row})}
          />
        </TabsContent>

        <TabsContent value="driver">
          <DriverTab
            rows={drivers}
            onAction={row => setModal({kind:'driver', row})}
          />
        </TabsContent>

        <TabsContent value="garage">
          <GarageTab
            rows={garages}
            onAction={row => setModal({kind:'garage', row})}
          />
        </TabsContent>
      </Tabs>

      {/* ── Payment Modal ──────────────────────────────────────────────────── */}
      <PaymentModal
        target={modal}
        onClose={() => setModal(null)}
        onConfirm={handlePayment}
      />
    </div>
  );
}
