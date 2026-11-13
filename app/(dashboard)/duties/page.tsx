"use client";

import {useState, useMemo, useEffect} from 'react';
import {
  CalendarDays, Plus, Play, CheckCircle, XCircle, Edit2, Printer,
  Filter, Car, Users, TrendingUp, AlertCircle, Clock, CheckCheck,
  ChevronUp, ChevronDown, ChevronsUpDown, X, Search, Send, Smartphone,
} from 'lucide-react';
import {fetchDuties, createDuty, updateDutyStatus, fetchClients, fetchVehicles, fetchDrivers, dispatchTripSheet} from '@/lib/api';
import {
  Duty, DutyStatus, DutyType,
} from '@/lib/tasin-data';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {SectionHeading} from '@/components/shared/section-heading';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatMoney = (n: number) => '৳' + n.toLocaleString('en-US');

const TODAY = '2026-11-10';

const STATUS_BADGE: Record<DutyStatus, string> = {
  Running:   'badge badge-blue',
  Completed: 'badge badge-good',
  Scheduled: 'badge badge-neutral',
  Cancelled: 'badge badge-bad',
};

const DUTY_TYPES: DutyType[] = ['Monthly', 'Daily', 'Trip', 'Outstation'];
const ALL_STATUSES: DutyStatus[] = ['Scheduled', 'Running', 'Completed', 'Cancelled'];

// ─── Empty form state ─────────────────────────────────────────────────────────
type FormData = {
  date: string;
  clientId: string;
  vehicleId: string;
  driverId: string;
  pickupLocation: string;
  destination: string;
  startTime: string;
  endTime: string;
  dutyType: DutyType | '';
  customerContact: string;
  description: string;
  agreedRent: string;
  fuelCost: string;
  overtimeCharge: string;
  driverAllowance: string;
  additionalCharge: string;
  discount: string;
};

const emptyForm = (): FormData => ({
  date: TODAY,
  clientId: '',
  vehicleId: '',
  driverId: '',
  pickupLocation: '',
  destination: '',
  startTime: '',
  endTime: '',
  dutyType: '',
  customerContact: '',
  description: '',
  agreedRent: '',
  fuelCost: '0',
  overtimeCharge: '0',
  driverAllowance: '0',
  additionalCharge: '0',
  discount: '0',
});

type FormErrors = Partial<Record<keyof FormData, string>>;

function computeTotal(f: FormData): number {
  const n = (v: string) => parseFloat(v) || 0;
  return n(f.agreedRent) + n(f.fuelCost) + n(f.overtimeCharge) +
         n(f.driverAllowance) + n(f.additionalCharge) - n(f.discount);
}

// ─── Sort helper ──────────────────────────────────────────────────────────────
type SortKey = 'date' | 'clientName' | 'vehicleReg' | 'driverName' | 'dutyType' | 'status' | 'totalAmount';
type SortDir = 'asc' | 'desc';

function sortDuties(arr: Duty[], key: SortKey, dir: SortDir): Duty[] {
  return [...arr].sort((a, b) => {
    let av: string | number = a[key] as string | number;
    let bv: string | number = b[key] as string | number;
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

// ─── Page Component ───────────────────────────────────────────────────────────
export default function DutiesPage() {
  const [duties, setDuties] = useState<Duty[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  const loadData = () => {
    fetchDuties(1)
      .then((data: any) => {
        if (Array.isArray(data)) {
          const mapped: (Duty & { rawId?: number })[] = data.map((d: any) => ({
            id: d.dutyId || `DTY-${String(d.id).padStart(3, '0')}`,
            rawId: d.id,
            date: d.date,
            clientId: String(d.clientId || ''),
            clientName: d.clientName,
            vehicleId: String(d.vehicleId || ''),
            vehicleReg: d.vehicleReg,
            driverId: String(d.driverId || ''),
            driverName: d.driverName,
            pickupLocation: d.pickupLocation,
            destination: d.destination,
            startTime: d.startTime,
            endTime: d.endTime || undefined,
            dutyType: d.dutyType as DutyType,
            customerContact: d.customerContact || '',
            description: d.description || undefined,
            agreedRent: Number(d.agreedRent) || 0,
            fuelCost: Number(d.fuelCost) || 0,
            overtimeCharge: Number(d.overtimeCharge) || 0,
            driverAllowance: Number(d.driverAllowance) || 0,
            additionalCharge: Number(d.additionalCharge) || 0,
            discount: Number(d.discount) || 0,
            totalAmount: Number(d.totalAmount) || 0,
            status: d.status as DutyStatus,
          }));
          setDuties(mapped);
        }
      })
      .catch(() => {});

    fetchClients(1).then((data: any) => {
      if (Array.isArray(data)) {
        setClients(data.map((c: any) => ({ id: String(c.id), name: c.name, phone: c.mobile || c.phone })));
      }
    }).catch(() => {});

    fetchVehicles(1).then((data: any) => {
      if (Array.isArray(data)) {
        setVehicles(data.map((v: any) => ({
          id: String(v.id),
          registration: v.registration || v.regNo,
          model: v.model,
          status: v.status || 'Available'
        })));
      }
    }).catch(() => {});

    fetchDrivers(1).then((data: any) => {
      if (Array.isArray(data)) {
        setDrivers(data.map((d: any) => ({
          id: String(d.id),
          name: d.name,
          status: d.status || 'Active'
        })));
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── Filters ──
  const [q, setQ] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');

  // ── Sort ──
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // ── Pagination ──
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // ── Dialogs ──
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Duty | null>(null);
  const [confirmAction, setConfirmAction] = useState<{type: 'start'|'complete'|'cancel'; duty: Duty} | null>(null);
  const [dispatchDuty, setDispatchDuty] = useState<(Duty & { rawId?: number }) | null>(null);
  const [dispatchChannel, setDispatchChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [dispatchPhone, setDispatchPhone] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchLoading, setDispatchLoading] = useState(false);

  // ── Toast ──
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // ── Add form state ──
  const [form, setForm] = useState<FormData>(emptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // ── Edit form state ──
  const [editForm, setEditForm] = useState<FormData>(emptyForm());
  const [editErrors, setEditErrors] = useState<FormErrors>({});

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const today = duties.filter(d => d.date === TODAY);
    const running   = today.filter(d => d.status === 'Running').length;
    const completed = today.filter(d => d.status === 'Completed').length;
    const cancelled = today.filter(d => d.status === 'Cancelled').length;
    const revenue   = duties
      .filter(d => d.status !== 'Cancelled')
      .reduce((s, d) => s + d.totalAmount, 0);
    const available = vehicles.filter(v => v.status === 'Available').length;
    return {total: today.length, running, completed, cancelled, revenue, available};
  }, [duties]);

  // ─── Filtered + sorted list ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let arr = duties;
    if (q.trim()) {
      const lq = q.toLowerCase();
      arr = arr.filter(d =>
        d.clientName.toLowerCase().includes(lq) ||
        d.vehicleReg.toLowerCase().includes(lq) ||
        d.driverName.toLowerCase().includes(lq) ||
        d.id.toLowerCase().includes(lq) ||
        d.pickupLocation.toLowerCase().includes(lq) ||
        d.destination.toLowerCase().includes(lq)
      );
    }
    if (filterStatus !== 'all') arr = arr.filter(d => d.status === filterStatus);
    if (filterType   !== 'all') arr = arr.filter(d => d.dutyType === filterType);
    if (filterDate)             arr = arr.filter(d => d.date === filterDate);
    return sortDuties(arr, sortKey, sortDir);
  }, [duties, q, filterStatus, filterType, filterDate, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ─── Sort toggle ─────────────────────────────────────────────────────────────
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const SortIcon = ({k}: {k: SortKey}) => {
    if (sortKey !== k) return <ChevronsUpDown size={11} className="sort-idle"/>;
    return sortDir === 'asc' ? <ChevronUp size={11}/> : <ChevronDown size={11}/>;
  };

  // ─── Validation ──────────────────────────────────────────────────────────────
  const validateForm = (f: FormData): FormErrors => {
    const e: FormErrors = {};
    if (!f.date)             e.date = 'Date is required';
    if (!f.clientId)         e.clientId = 'Client is required';
    if (!f.vehicleId)        e.vehicleId = 'Vehicle is required';
    if (!f.driverId)         e.driverId = 'Driver is required';
    if (!f.pickupLocation.trim()) e.pickupLocation = 'Pickup location is required';
    if (!f.destination.trim())    e.destination = 'Destination is required';
    if (!f.startTime)        e.startTime = 'Start time is required';
    if (!f.dutyType)         e.dutyType = 'Duty type is required';
    if (!f.customerContact.trim()) e.customerContact = 'Contact is required';
    if (!f.agreedRent || isNaN(Number(f.agreedRent)) || Number(f.agreedRent) <= 0)
      e.agreedRent = 'Valid rent amount required';
    return e;
  };

  // ─── Submission ──────────────────────────────────────────────────────────────
  const handleAddSubmit = () => {
    const errs = validateForm(form);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSubmitting(true);

    const nextId = `DTY-${String(duties.length + 1).padStart(3, '0')}`;
    const client  = clients.find(c => c.id === form.clientId) || { name: 'Client' };
    const vehicle = vehicles.find(v => v.id === form.vehicleId) || { registration: 'DHA-METRO' };
    const driver  = drivers.find(d => d.id === form.driverId) || { name: 'Driver' };
    const total   = computeTotal(form);

    const newDuty: Duty = {
      id: nextId,
      date: form.date,
      clientId: form.clientId,
      clientName: client.name,
      vehicleId: form.vehicleId,
      vehicleReg: vehicle.registration,
      driverId: form.driverId,
      driverName: driver.name,
      pickupLocation: form.pickupLocation,
      destination: form.destination,
      startTime: form.startTime,
      endTime: form.endTime || undefined,
      dutyType: form.dutyType as DutyType,
      customerContact: form.customerContact,
      description: form.description || undefined,
      agreedRent: Number(form.agreedRent),
      fuelCost: Number(form.fuelCost) || 0,
      overtimeCharge: Number(form.overtimeCharge) || 0,
      driverAllowance: Number(form.driverAllowance) || 0,
      additionalCharge: Number(form.additionalCharge) || 0,
      discount: Number(form.discount) || 0,
      totalAmount: total,
      status: 'Scheduled',
    };

    createDuty(1, {
      date: form.date,
      client_name: client.name,
      vehicle_reg: vehicle.registration,
      driver_name: driver.name,
      pickup_location: form.pickupLocation,
      destination: form.destination,
      start_time: form.startTime,
      end_time: form.endTime || '',
      duty_type: form.dutyType,
      customer_contact: form.customerContact,
      description: form.description || '',
      agreed_rent: Number(form.agreedRent),
      fuel_cost: Number(form.fuelCost) || 0,
      overtime_charge: Number(form.overtimeCharge) || 0,
      driver_allowance: Number(form.driverAllowance) || 0,
      additional_charge: Number(form.additionalCharge) || 0,
      discount: Number(form.discount) || 0,
      status: 'Scheduled'
    }).then(() => loadData()).catch(() => {});

    setTimeout(() => {
      setDuties(prev => [newDuty, ...prev]);
      setAddOpen(false);
      setForm(emptyForm());
      setFormErrors({});
      setSubmitting(false);
      showToast(`✓ Duty ${nextId} created successfully`);
      setPage(1);
    }, 350);
  };

  // ─── Edit submission ─────────────────────────────────────────────────────────
  const openEdit = (duty: Duty) => {
    setEditTarget(duty);
    setEditForm({
      date: duty.date,
      clientId: duty.clientId,
      vehicleId: duty.vehicleId,
      driverId: duty.driverId,
      pickupLocation: duty.pickupLocation,
      destination: duty.destination,
      startTime: duty.startTime,
      endTime: duty.endTime ?? '',
      dutyType: duty.dutyType,
      customerContact: duty.customerContact,
      description: duty.description ?? '',
      agreedRent: String(duty.agreedRent),
      fuelCost: String(duty.fuelCost),
      overtimeCharge: String(duty.overtimeCharge),
      driverAllowance: String(duty.driverAllowance),
      additionalCharge: String(duty.additionalCharge),
      discount: String(duty.discount),
    });
    setEditErrors({});
  };

  const handleEditSubmit = () => {
    if (!editTarget) return;
    const errs = validateForm(editForm);
    if (Object.keys(errs).length) { setEditErrors(errs); return; }

    const client  = clients.find(c => c.id === editForm.clientId) || { name: 'Client' };
    const vehicle = vehicles.find(v => v.id === editForm.vehicleId) || { registration: 'DHA-METRO' };
    const driver  = drivers.find(d => d.id === editForm.driverId) || { name: 'Driver' };
    const total   = computeTotal(editForm);

    setDuties(prev => prev.map(d =>
      d.id === editTarget.id ? {
        ...d,
        date: editForm.date,
        clientId: editForm.clientId,
        clientName: client.name,
        vehicleId: editForm.vehicleId,
        vehicleReg: vehicle.registration,
        driverId: editForm.driverId,
        driverName: driver.name,
        pickupLocation: editForm.pickupLocation,
        destination: editForm.destination,
        startTime: editForm.startTime,
        endTime: editForm.endTime || undefined,
        dutyType: editForm.dutyType as DutyType,
        customerContact: editForm.customerContact,
        description: editForm.description || undefined,
        agreedRent: Number(editForm.agreedRent),
        fuelCost: Number(editForm.fuelCost) || 0,
        overtimeCharge: Number(editForm.overtimeCharge) || 0,
        driverAllowance: Number(editForm.driverAllowance) || 0,
        additionalCharge: Number(editForm.additionalCharge) || 0,
        discount: Number(editForm.discount) || 0,
        totalAmount: total,
      } : d
    ));
    setEditTarget(null);
    showToast(`✓ Duty ${editTarget.id} updated`);
  };

  // ─── Status actions ───────────────────────────────────────────────────────────
  const executeConfirm = () => {
    if (!confirmAction) return;
    const {type, duty} = confirmAction;
    const nextStatus: DutyStatus =
      type === 'start'    ? 'Running'   :
      type === 'complete' ? 'Completed' : 'Cancelled';

    updateDutyStatus(1, duty.id, nextStatus).catch(() => {});

    setDuties(prev => prev.map(d =>
      d.id === duty.id ? {...d, status: nextStatus} : d
    ));
    setConfirmAction(null);
    showToast(`✓ Duty ${duty.id} marked as ${nextStatus}`);
  };

  // ─── Print handler ────────────────────────────────────────────────────────────
  const handlePrint = (duty: Duty) => {
    const w = window.open('', '_blank', 'width=700,height=800');
    if (!w) return;
    w.document.write(`
      <html><head><title>Duty Slip – ${duty.id}</title>
      <style>body{font-family:Arial,sans-serif;padding:30px;color:#1a1a1a}
      h2{margin-bottom:4px}p{margin:0 0 4px;font-size:13px}
      table{border-collapse:collapse;width:100%;margin-top:16px}
      th,td{border:1px solid #ccc;padding:8px 10px;font-size:12px}
      th{background:#f0f4f4;text-align:left}.total{font-weight:700}</style></head>
      <body>
      <h2>TASIN ENTERPRISE – Duty Slip</h2>
      <p><b>Duty ID:</b> ${duty.id} &nbsp;|&nbsp; <b>Date:</b> ${duty.date} &nbsp;|&nbsp; <b>Type:</b> ${duty.dutyType}</p>
      <p><b>Status:</b> ${duty.status}</p>
      <table>
        <tr><th>Client</th><td>${duty.clientName}</td><th>Contact</th><td>${duty.customerContact}</td></tr>
        <tr><th>Vehicle</th><td>${duty.vehicleReg}</td><th>Driver</th><td>${duty.driverName}</td></tr>
        <tr><th>Pickup</th><td>${duty.pickupLocation}</td><th>Destination</th><td>${duty.destination}</td></tr>
        <tr><th>Start Time</th><td>${duty.startTime}</td><th>End Time</th><td>${duty.endTime ?? '—'}</td></tr>
        ${duty.description ? `<tr><th>Note</th><td colspan="3">${duty.description}</td></tr>` : ''}
      </table>
      <table style="margin-top:12px">
        <tr><th>Agreed Rent</th><td>${formatMoney(duty.agreedRent)}</td></tr>
        <tr><th>Fuel Cost</th><td>${formatMoney(duty.fuelCost)}</td></tr>
        <tr><th>Overtime</th><td>${formatMoney(duty.overtimeCharge)}</td></tr>
        <tr><th>Driver Allowance</th><td>${formatMoney(duty.driverAllowance)}</td></tr>
        <tr><th>Additional</th><td>${formatMoney(duty.additionalCharge)}</td></tr>
        <tr><th>Discount</th><td>– ${formatMoney(duty.discount)}</td></tr>
        <tr class="total"><th>Total</th><td>${formatMoney(duty.totalAmount)}</td></tr>
      </table>
      <p style="margin-top:20px;font-size:11px;color:#777">Printed on ${new Date().toLocaleString()}</p>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  // ─── Dispatch Trip Sheet handler ──────────────────────────────────────────────
  const openDispatch = (duty: Duty & { rawId?: number }) => {
    setDispatchDuty(duty);
    setDispatchChannel('whatsapp');
    setDispatchPhone(duty.customerContact || '');
    setDispatchNotes(`Duty Assignment ${duty.id}: Route ${duty.pickupLocation} -> ${duty.destination}. Vehicle: ${duty.vehicleReg}. Driver: ${duty.driverName}. Agreed Rent: ${formatMoney(duty.agreedRent)}.`);
  };

  const handleSendDispatch = async () => {
    if (!dispatchDuty) return;
    setDispatchLoading(true);
    try {
      const dutyNumericId = dispatchDuty.rawId || parseInt(dispatchDuty.id.replace(/\D/g, '')) || 1;
      await dispatchTripSheet(1, dutyNumericId, {
        channel: dispatchChannel,
        recipient_phone: dispatchPhone,
        notes: dispatchNotes,
      });
      showToast(`✓ Trip sheet dispatched to ${dispatchPhone} via ${dispatchChannel.toUpperCase()}`);
      setDispatchDuty(null);
    } catch (err: any) {
      showToast(`❌ Dispatch failed: ${err.message || 'Error sending'}`);
    } finally {
      setDispatchLoading(false);
    }
  };

  // ─── Shared form renderer ─────────────────────────────────────────────────────
  const renderForm = (
    f: FormData,
    setF: (u: Partial<FormData>) => void,
    errs: FormErrors,
  ) => {
    const fld = (key: keyof FormData, val: string) => setF({[key]: val} as Partial<FormData>);
    const total = computeTotal(f);

    return (
      <div className="entry-form" style={{maxHeight:'65vh', overflowY:'auto', paddingRight:4}}>
        {/* Row 1 */}
        <div className="form-grid">
          <label>
            Duty Date *
            <Input type="date" value={f.date} onChange={e=>fld('date',e.target.value)}/>
            {errs.date && <span className="field-error">{errs.date}</span>}
          </label>
          <label>
            Duty Type *
            <Select value={f.dutyType} onValueChange={v=>fld('dutyType',v)}>
              <SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger>
              <SelectContent>
                {DUTY_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            {errs.dutyType && <span className="field-error">{errs.dutyType}</span>}
          </label>
        </div>
        {/* Client */}
        <label>
          Client / Company *
          <Select value={f.clientId} onValueChange={v=>fld('clientId',v)}>
            <SelectTrigger><SelectValue placeholder="Select client"/></SelectTrigger>
            <SelectContent>
              {clients.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {errs.clientId && <span className="field-error">{errs.clientId}</span>}
        </label>
        {/* Vehicle + Driver */}
        <div className="form-grid">
          <label>
            Vehicle *
            <Select value={f.vehicleId} onValueChange={v=>fld('vehicleId',v)}>
              <SelectTrigger><SelectValue placeholder="Select vehicle"/></SelectTrigger>
              <SelectContent>
                {vehicles.filter(v=>v.status!=='Inactive').map(v=>(
                  <SelectItem key={v.id} value={v.id}>
                    {v.registration} ({v.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errs.vehicleId && <span className="field-error">{errs.vehicleId}</span>}
          </label>
          <label>
            Driver *
            <Select value={f.driverId} onValueChange={v=>fld('driverId',v)}>
              <SelectTrigger><SelectValue placeholder="Select driver"/></SelectTrigger>
              <SelectContent>
                {drivers.filter(d=>d.status==='Active').map(d=>(
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errs.driverId && <span className="field-error">{errs.driverId}</span>}
          </label>
        </div>
        {/* Pickup + Destination */}
        <div className="form-grid">
          <label>
            Pickup Location *
            <Input placeholder="e.g. Gulshan-1, Dhaka" value={f.pickupLocation}
              onChange={e=>fld('pickupLocation',e.target.value)}/>
            {errs.pickupLocation && <span className="field-error">{errs.pickupLocation}</span>}
          </label>
          <label>
            Destination *
            <Input placeholder="e.g. Airport Road" value={f.destination}
              onChange={e=>fld('destination',e.target.value)}/>
            {errs.destination && <span className="field-error">{errs.destination}</span>}
          </label>
        </div>
        {/* Times + Contact */}
        <div className="form-grid">
          <label>
            Start Time *
            <Input type="time" value={f.startTime} onChange={e=>fld('startTime',e.target.value)}/>
            {errs.startTime && <span className="field-error">{errs.startTime}</span>}
          </label>
          <label>
            End Time (optional)
            <Input type="time" value={f.endTime} onChange={e=>fld('endTime',e.target.value)}/>
          </label>
        </div>
        <label>
          Customer Contact *
          <Input type="tel" placeholder="01XXXXXXXXX" value={f.customerContact}
            onChange={e=>fld('customerContact',e.target.value)}/>
          {errs.customerContact && <span className="field-error">{errs.customerContact}</span>}
        </label>
        <label>
          Description / Notes
          <textarea
            rows={2}
            placeholder="Additional notes..."
            value={f.description}
            onChange={e=>fld('description',e.target.value)}
            style={{
              border:'1px solid var(--input)',borderRadius:'var(--radius-md)',
              padding:'8px 10px',fontSize:12,fontFamily:'inherit',
              resize:'vertical',outline:'none',width:'100%',
            }}
          />
        </label>
        {/* Charges */}
        <div style={{borderTop:'1px solid var(--border)',paddingTop:12}}>
          <p style={{fontSize:12,fontWeight:700,color:'#3d5a66',marginBottom:8}}>Billing Details (BDT)</p>
          <div className="form-grid">
            <label>
              Agreed Rent (৳) *
              <Input type="number" min="0" placeholder="0" value={f.agreedRent}
                onChange={e=>fld('agreedRent',e.target.value)}/>
              {errs.agreedRent && <span className="field-error">{errs.agreedRent}</span>}
            </label>
            <label>
              Fuel Cost (৳)
              <Input type="number" min="0" placeholder="0" value={f.fuelCost}
                onChange={e=>fld('fuelCost',e.target.value)}/>
            </label>
            <label>
              Overtime Charge (৳)
              <Input type="number" min="0" placeholder="0" value={f.overtimeCharge}
                onChange={e=>fld('overtimeCharge',e.target.value)}/>
            </label>
            <label>
              Driver Allowance (৳)
              <Input type="number" min="0" placeholder="0" value={f.driverAllowance}
                onChange={e=>fld('driverAllowance',e.target.value)}/>
            </label>
            <label>
              Additional Charge (৳)
              <Input type="number" min="0" placeholder="0" value={f.additionalCharge}
                onChange={e=>fld('additionalCharge',e.target.value)}/>
            </label>
            <label>
              Discount (৳)
              <Input type="number" min="0" placeholder="0" value={f.discount}
                onChange={e=>fld('discount',e.target.value)}/>
            </label>
          </div>
          {/* Auto total */}
          <div style={{
            background:'#eaf3f4',border:'1px solid #c8dfe3',borderRadius:8,
            padding:'10px 14px',marginTop:10,display:'flex',justifyContent:'space-between',
            alignItems:'center',
          }}>
            <span style={{fontSize:12,fontWeight:700,color:'#315c6a'}}>Auto-calculated Total</span>
            <strong style={{fontSize:18,color:'#1e5a6e',letterSpacing:'-.03em'}}>{formatMoney(total)}</strong>
          </div>
        </div>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* Page Header */}
      <div className="page-intro">
        <div>
          <div className="eyebrow">OPERATIONS</div>
          <h1>Daily Duty Management</h1>
          <p>Manage vehicle assignments, duty scheduling, and daily operations</p>
        </div>
        <div className="intro-actions">
          <div className="period-chip">
            <CalendarDays size={14}/>
            <span>{TODAY}</span>
          </div>
          <Button className="primary-action" onClick={()=>{setForm(emptyForm());setFormErrors({});setAddOpen(true);}}>
            <Plus size={15}/> Add Duty
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="kpi-grid-6">
        <Card className="metric">
          <div className="metric-top">
            <span>Today's Duties</span>
            <span className="metric-icon blue"><CalendarDays size={19}/></span>
          </div>
          <strong className="nums" style={{fontSize:26}}>{stats.total}</strong>
          <small>Total scheduled today</small>
        </Card>
        <Card className="metric">
          <div className="metric-top">
            <span>Running</span>
            <span className="metric-icon blue"><Play size={19}/></span>
          </div>
          <strong className="nums" style={{fontSize:26,color:'#2e7f96'}}>{stats.running}</strong>
          <small>Currently on duty</small>
        </Card>
        <Card className="metric">
          <div className="metric-top">
            <span>Completed</span>
            <span className="metric-icon" style={{background:'#e6f4ed',color:'#328562'}}><CheckCheck size={19}/></span>
          </div>
          <strong className="nums" style={{fontSize:26,color:'#328562'}}>{stats.completed}</strong>
          <small>Finished today</small>
        </Card>
        <Card className="metric">
          <div className="metric-top">
            <span>Cancelled</span>
            <span className="metric-icon" style={{background:'#f9e8e6',color:'#a85851'}}><XCircle size={19}/></span>
          </div>
          <strong className="nums" style={{fontSize:26,color:'#a85851'}}>{stats.cancelled}</strong>
          <small>Cancelled duties</small>
        </Card>
        <Card className="metric">
          <div className="metric-top">
            <span>Available</span>
            <span className="metric-icon gold"><Car size={19}/></span>
          </div>
          <strong className="nums" style={{fontSize:26,color:'#7a5f1a'}}>{stats.available}</strong>
          <small>Vehicles free now</small>
        </Card>
        <Card className="metric">
          <div className="metric-top">
            <span>Revenue</span>
            <span className="metric-icon" style={{background:'#eeecf7',color:'#7975a9'}}><TrendingUp size={19}/></span>
          </div>
          <strong className="nums" style={{fontSize:22,color:'#1e3947'}}>{formatMoney(stats.revenue)}</strong>
          <small>All-time (excl. cancelled)</small>
        </Card>
      </div>

      {/* ── Toolbar ── */}
      <SectionHeading
        title="Duty Register"
        subtitle={`${filtered.length} record${filtered.length!==1?'s':''} found`}
      />
      <div className="toolbar" style={{flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:'1 1 220px',minWidth:160}}>
          <Search size={13} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'#79909a'}}/>
          <Input
            placeholder="Search client, vehicle, driver, ID…"
            value={q}
            onChange={e=>{setQ(e.target.value);setPage(1);}}
            style={{paddingLeft:28}}
          />
        </div>
        <Select value={filterStatus} onValueChange={v=>{setFilterStatus(v);setPage(1);}}>
          <SelectTrigger style={{minWidth:140}}>
            <Filter size={12} className="filter-icon"/>
            <SelectValue placeholder="All Statuses"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ALL_STATUSES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={v=>{setFilterType(v);setPage(1);}}>
          <SelectTrigger style={{minWidth:130}}>
            <SelectValue placeholder="All Types"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {DUTY_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <label style={{fontSize:11,fontWeight:700,color:'#5e7a84',whiteSpace:'nowrap'}}>Date</label>
          <Input type="date" value={filterDate}
            onChange={e=>{setFilterDate(e.target.value);setPage(1);}}
            style={{width:148}}/>
          {filterDate && (
            <button className="text-button" onClick={()=>{setFilterDate('');setPage(1);}}>
              <X size={12}/>
            </button>
          )}
        </div>
        {(q||filterStatus!=='all'||filterType!=='all'||filterDate) && (
          <button className="text-button" onClick={()=>{setQ('');setFilterStatus('all');setFilterType('all');setFilterDate('');setPage(1);}}>
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <Card style={{padding:0, overflow:'hidden'}}>
        <div className="table-responsive-container">
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
            <thead>
              <tr style={{background:'#f7f9f9'}}>
                {([
                  ['date','Date'],
                  [null,'Duty ID'],
                  ['clientName','Client'],
                  ['vehicleReg','Vehicle'],
                  ['driverName','Driver'],
                  ['dutyType','Type'],
                  ['status','Status'],
                  ['totalAmount','Amount'],
                  [null,'Actions'],
                ] as [SortKey|null, string][]).map(([k,label])=>(
                  <th key={label}
                    data-slot="table-head"
                    style={{textAlign: label==='Amount'||label==='Actions'?'right':'left', cursor: k?'pointer':'default'}}
                    onClick={k ? ()=>toggleSort(k) : undefined}
                  >
                    <span className="sort-button">
                      {label}
                      {k && <SortIcon k={k}/>}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={9} data-slot="table-cell" style={{textAlign:'center',padding:'40px 0'}}>
                    <div className="empty">
                      <CalendarDays size={28} style={{opacity:.35}}/>
                      <span>No duties found</span>
                      <small>Try adjusting your filters or add a new duty</small>
                    </div>
                  </td>
                </tr>
              ) : paged.map(duty=>(
                <tr key={duty.id} className="click-row">
                  <td data-slot="table-cell">{duty.date}</td>
                  <td data-slot="table-cell"><b>{duty.id}</b></td>
                  <td data-slot="table-cell">
                    <b>{duty.clientName}</b>
                    <small>{duty.pickupLocation} → {duty.destination}</small>
                  </td>
                  <td data-slot="table-cell">
                    <b>{duty.vehicleReg}</b>
                    <small>{duty.startTime}{duty.endTime ? ` – ${duty.endTime}` : ''}</small>
                  </td>
                  <td data-slot="table-cell">{duty.driverName}</td>
                  <td data-slot="table-cell">
                    <span className="badge badge-neutral">{duty.dutyType}</span>
                  </td>
                  <td data-slot="table-cell">
                    <span className={STATUS_BADGE[duty.status]}>{duty.status}</span>
                  </td>
                  <td data-slot="table-cell" style={{textAlign:'right'}}>
                    <b className="nums">{formatMoney(duty.totalAmount)}</b>
                  </td>
                  <td data-slot="table-cell" style={{textAlign:'right'}}>
                    <div className="row-actions">
                      {duty.status === 'Scheduled' && (
                        <button title="Start Duty"
                          style={{border:0,background:'none',color:'#2e7f96',cursor:'pointer',padding:'2px 4px'}}
                          onClick={()=>setConfirmAction({type:'start',duty})}>
                          <Play size={14}/>
                        </button>
                      )}
                      {duty.status === 'Running' && (
                        <button title="Complete Duty"
                          style={{border:0,background:'none',color:'#328562',cursor:'pointer',padding:'2px 4px'}}
                          onClick={()=>setConfirmAction({type:'complete',duty})}>
                          <CheckCircle size={14}/>
                        </button>
                      )}
                      {(duty.status === 'Scheduled' || duty.status === 'Running') && (
                        <button title="Cancel Duty"
                          style={{border:0,background:'none',color:'#a85851',cursor:'pointer',padding:'2px 4px'}}
                          onClick={()=>setConfirmAction({type:'cancel',duty})}>
                          <XCircle size={14}/>
                        </button>
                      )}
                      <button title="Edit"
                        style={{border:0,background:'none',color:'#79909a',cursor:'pointer',padding:'2px 4px'}}
                        onClick={()=>openEdit(duty)}>
                        <Edit2 size={14}/>
                      </button>
                      <button title="Print Duty Slip"
                        style={{border:0,background:'none',color:'#79909a',cursor:'pointer',padding:'2px 4px'}}
                        onClick={()=>handlePrint(duty)}>
                        <Printer size={14}/>
                      </button>
                      <button title="Dispatch Trip Sheet (SMS/WhatsApp)"
                        style={{border:0,background:'none',color:'#2e7f96',cursor:'pointer',padding:'2px 4px'}}
                        onClick={()=>openDispatch(duty)}>
                        <Send size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            borderTop:'1px solid var(--border)',padding:'10px 20px',
            display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,
            fontSize:12,color:'#6a7c83',
          }}>
            <span>
              Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length}
            </span>
            <div style={{display:'flex',gap:6}}>
              <Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>
                Prev
              </Button>
              {Array.from({length:totalPages},(_,i)=>i+1).map(n=>(
                <Button key={n} variant={n===page?'default':'outline'} size="sm"
                  onClick={()=>setPage(n)} style={{minWidth:32}}>
                  {n}
                </Button>
              ))}
              <Button variant="outline" size="sm" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          Add Duty Dialog
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={addOpen} onOpenChange={o=>{if(!submitting){setAddOpen(o);if(!o){setForm(emptyForm());setFormErrors({}); }}}}>
        <DialogContent className="entry-dialog" style={{maxWidth:720}}>
          <DialogHeader>
            <DialogTitle>Add New Duty</DialogTitle>
            <DialogDescription>Fill in all required fields to schedule a new duty assignment.</DialogDescription>
          </DialogHeader>
          {renderForm(form, (u)=>setForm(prev=>({...prev,...u})), formErrors)}
          <DialogFooter style={{marginTop:12}}>
            <Button variant="outline" onClick={()=>setAddOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleAddSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Create Duty'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          Edit Duty Dialog
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!editTarget} onOpenChange={o=>{if(!o)setEditTarget(null);}}>
        <DialogContent className="entry-dialog" style={{maxWidth:720}}>
          <DialogHeader>
            <DialogTitle>Edit Duty – {editTarget?.id}</DialogTitle>
            <DialogDescription>Update the details for this duty assignment.</DialogDescription>
          </DialogHeader>
          {editTarget && renderForm(editForm, (u)=>setEditForm(prev=>({...prev,...u})), editErrors)}
          <DialogFooter style={{marginTop:12}}>
            <Button variant="outline" onClick={()=>setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleEditSubmit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          Confirm Action Dialog
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!confirmAction} onOpenChange={o=>{if(!o)setConfirmAction(null);}}>
        <DialogContent style={{maxWidth:420}}>
          <DialogHeader>
            <DialogTitle style={{display:'flex',alignItems:'center',gap:8}}>
              {confirmAction?.type === 'start'    && <><Play size={18} style={{color:'#2e7f96'}}/> Start Duty</>}
              {confirmAction?.type === 'complete' && <><CheckCircle size={18} style={{color:'#328562'}}/> Complete Duty</>}
              {confirmAction?.type === 'cancel'   && <><AlertCircle size={18} style={{color:'#a85851'}}/> Cancel Duty</>}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === 'start'    && `Mark duty ${confirmAction.duty.id} as Running? This confirms the vehicle has departed.`}
              {confirmAction?.type === 'complete' && `Mark duty ${confirmAction.duty.id} as Completed? This closes the duty record.`}
              {confirmAction?.type === 'cancel'   && `Are you sure you want to cancel duty ${confirmAction.duty.id}? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          {confirmAction && (
            <div style={{
              background:'#f7f9f9',border:'1px solid var(--border)',borderRadius:8,
              padding:'10px 14px',fontSize:12,display:'grid',gap:4,
            }}>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'#6a7c83'}}>Client</span>
                <b>{confirmAction.duty.clientName}</b>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'#6a7c83'}}>Vehicle</span>
                <b>{confirmAction.duty.vehicleReg}</b>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'#6a7c83'}}>Driver</span>
                <b>{confirmAction.duty.driverName}</b>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'#6a7c83'}}>Amount</span>
                <b>{formatMoney(confirmAction.duty.totalAmount)}</b>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={()=>setConfirmAction(null)}>Go Back</Button>
            <Button
              onClick={executeConfirm}
              style={confirmAction?.type==='cancel' ? {background:'#a85851',color:'white'} : {}}
            >
              {confirmAction?.type === 'start'    && 'Yes, Start Duty'}
              {confirmAction?.type === 'complete' && 'Yes, Mark Complete'}
              {confirmAction?.type === 'cancel'   && 'Yes, Cancel Duty'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          Dispatch Trip Sheet Dialog
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!dispatchDuty} onOpenChange={o=>{if(!o)setDispatchDuty(null);}}>
        <DialogContent style={{maxWidth:480}}>
          <DialogHeader>
            <DialogTitle style={{display:'flex',alignItems:'center',gap:8}}>
              <Send size={18} style={{color:'#2e7f96'}}/> Dispatch Trip Sheet – {dispatchDuty?.id}
            </DialogTitle>
            <DialogDescription>
              Transmit verified duty slip and driver dispatch instructions via WhatsApp or SMS.
            </DialogDescription>
          </DialogHeader>

          {dispatchDuty && (
            <div style={{display:'grid',gap:12,paddingTop:8}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <label style={{fontSize:12,fontWeight:600,display:'flex',flexDirection:'column',gap:4}}>
                  Dispatch Channel
                  <Select value={dispatchChannel} onValueChange={(v:any)=>setDispatchChannel(v)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp Message</SelectItem>
                      <SelectItem value="sms">SMS Text Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label style={{fontSize:12,fontWeight:600,display:'flex',flexDirection:'column',gap:4}}>
                  Recipient Phone
                  <Input
                    placeholder="017XXXXXXXX"
                    value={dispatchPhone}
                    onChange={e=>setDispatchPhone(e.target.value)}
                  />
                </label>
              </div>

              <div style={{background:'#f7f9f9',border:'1px solid var(--border)',borderRadius:8,padding:10,fontSize:12}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{color:'#6a7c83'}}>Client:</span>
                  <b>{dispatchDuty.clientName}</b>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{color:'#6a7c83'}}>Vehicle:</span>
                  <b>{dispatchDuty.vehicleReg}</b>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{color:'#6a7c83'}}>Driver:</span>
                  <b>{dispatchDuty.driverName}</b>
                </div>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{color:'#6a7c83'}}>Route:</span>
                  <span style={{fontWeight:500}}>{dispatchDuty.pickupLocation} → {dispatchDuty.destination}</span>
                </div>
              </div>

              <label style={{fontSize:12,fontWeight:600,display:'flex',flexDirection:'column',gap:4}}>
                Dispatch Note / Instructions
                <textarea
                  rows={3}
                  value={dispatchNotes}
                  onChange={e=>setDispatchNotes(e.target.value)}
                  style={{
                    width:'100%',padding:'8px 10px',borderRadius:6,
                    border:'1px solid var(--border)',fontSize:12,fontFamily:'inherit',
                    resize:'none'
                  }}
                />
              </label>
            </div>
          )}

          <DialogFooter style={{marginTop:8}}>
            <Button variant="outline" onClick={()=>setDispatchDuty(null)} disabled={dispatchLoading}>Cancel</Button>
            <Button onClick={handleSendDispatch} disabled={dispatchLoading || !dispatchPhone}>
              {dispatchLoading ? 'Dispatching...' : `Send via ${dispatchChannel.toUpperCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Toast ── */}
      {toast && (
        <div className="toast">
          <CheckCircle size={16} style={{color:'#7dd9c0',flexShrink:0}}/>
          <span>{toast}</span>
          <button onClick={()=>setToast(null)}><X size={14}/></button>
        </div>
      )}
    </div>
  );
}
