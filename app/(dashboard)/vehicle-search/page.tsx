"use client";
import {useState, useMemo, useCallback, useEffect} from 'react';
import {
  Search, CarFront, User, Building2, FileText, Download, Printer,
  TrendingUp, TrendingDown, X, ChevronRight, Calendar, Phone, Mail,
  Hash, Palette, Wrench, Shield, AlertTriangle, CheckCircle2, Clock
} from 'lucide-react';
import {searchVehicles, fetchVehicleStatement} from '@/lib/api';
import {
  demoVehicles, demoOwners, demoDrivers, demoExpenses, demoDuties, demoMaintenance,
  type Vehicle, type Owner, type Driver
} from '@/lib/tasin-data';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {SectionHeading} from '@/components/shared/section-heading';
import {EmptyState} from '@/components/shared/empty-state';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => `৳${n.toLocaleString('en-US')}`;

function statusBadge(status: Vehicle['status']) {
  const map: Record<Vehicle['status'], string> = {
    'On Duty':    'badge badge-blue',
    'Available':  'badge badge-good',
    'In Garage':  'badge badge-warn',
    'Inactive':   'badge badge-bad',
  };
  return <span className={map[status]}>{status}</span>;
}

function dutyStatusBadge(status: string) {
  const map: Record<string, string> = {
    Running:   'badge badge-blue',
    Scheduled: 'badge badge-neutral',
    Completed: 'badge badge-good',
    Cancelled: 'badge badge-bad',
  };
  return <span className={map[status] ?? 'badge badge-neutral'}>{status}</span>;
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({msg, onClose}: {msg: string; onClose: () => void}) {
  return (
    <div className="toast" role="status">
      <CheckCircle2 size={16} style={{color:'#5ecfda', flexShrink:0}}/>
      <span style={{flex:1}}>{msg}</span>
      <button onClick={onClose} aria-label="Dismiss"><X size={14}/></button>
    </div>
  );
}

// ─── Document Status Row ─────────────────────────────────────────────────────
const DOCS = [
  {label: 'Registration',  ok: true},
  {label: 'Fitness Cert.', ok: true},
  {label: 'Tax Token',     ok: true},
  {label: 'Insurance',     ok: false},
  {label: 'Route Permit',  ok: true},
];

// ─── Vehicle Detail Panel ────────────────────────────────────────────────────
function VehicleDetail({
  vehicle, owner, driver, onClose, showToast
}: {
  vehicle: Vehicle;
  owner: Owner | undefined;
  driver: Driver | undefined;
  onClose: () => void;
  showToast: (msg: string) => void;
}) {
  const duties       = useMemo(() => demoDuties.filter(d => d.vehicleId === vehicle.id), [vehicle.id]);
  const expenses     = useMemo(() => demoExpenses.filter(e => e.vehicleId === vehicle.id), [vehicle.id]);
  const maintenance  = useMemo(() => demoMaintenance.filter(m => m.vehicleId === vehicle.id), [vehicle.id]);

  // Financial statement
  const vehicleIncome   = useMemo(() => duties.filter(d => d.status !== 'Cancelled').reduce((s, d) => s + d.totalAmount, 0), [duties]);
  const ownerRentMonths = useMemo(() => {
    const start = new Date(vehicle.agreementStart);
    const now   = new Date('2026-11-10');
    return Math.max(1, Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  }, [vehicle.agreementStart]);
  const ownerRentTotal  = vehicle.monthlyRent * ownerRentMonths;
  const ownerPaid       = owner ? Math.round(owner.totalPaid / Math.max(1, owner.totalVehicles)) : 0;
  const ownerDue        = Math.max(0, ownerRentTotal - ownerPaid);
  const expenseTotal    = expenses.reduce((s, e) => s + e.amount, 0);
  const maintTotal      = maintenance.reduce((s, m) => s + m.totalCost, 0);
  const netProfit       = vehicleIncome - ownerRentTotal - expenseTotal - maintTotal;

  const handleExport = (type: string) => {
    showToast(`Export feature will be available after backend integration (${type})`);
  };

  return (
    <div style={{marginTop: 24, border: '1.5px solid #bdd8de', borderRadius: 14, background: '#fff', overflow: 'hidden'}}>
      {/* Panel Header */}
      <div style={{background: '#eaf3f4', borderBottom: '1px solid #cce0e4', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14}}>
        <div className="vehicle-art" style={{width: 52, height: 52, borderRadius: 11}}>
          <CarFront size={26}/>
        </div>
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'}}>
            <strong style={{fontSize: 18, color: '#1b3341', letterSpacing: '-.03em'}}>{vehicle.brand} {vehicle.model}</strong>
            {statusBadge(vehicle.status)}
          </div>
          <div style={{fontSize: 12, color: '#5e8b99', marginTop: 3, fontFamily: 'monospace'}}>{vehicle.registration}</div>
        </div>
        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
          <Button size="sm" variant="outline" onClick={() => handleExport('PDF')} style={{fontSize: 11, gap: 5, display:'flex', alignItems:'center'}}>
            <Download size={13}/> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport('Excel')} style={{fontSize: 11, gap: 5, display:'flex', alignItems:'center'}}>
            <FileText size={13}/> Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport('Print')} style={{fontSize: 11, gap: 5, display:'flex', alignItems:'center'}}>
            <Printer size={13}/> Print
          </Button>
          <Button size="sm" variant="outline" onClick={onClose} style={{fontSize: 11}}>
            <X size={13}/>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{padding: '0 22px 22px'}}>
        <Tabs defaultValue="profile" style={{marginTop: 18}}>
          <TabsList className="detail-tabs" style={{width: '100%', justifyContent: 'flex-start', height: 'auto', flexWrap: 'wrap'}}>
            <TabsTrigger value="profile"><CarFront size={13}/> Vehicle Profile</TabsTrigger>
            <TabsTrigger value="owner"><Building2 size={13}/> Owner Info</TabsTrigger>
            <TabsTrigger value="driver"><User size={13}/> Driver Info</TabsTrigger>
            <TabsTrigger value="financial"><TrendingUp size={13}/> Financial Statement</TabsTrigger>
            <TabsTrigger value="history"><Clock size={13}/> History</TabsTrigger>
          </TabsList>

          {/* ── Vehicle Profile ── */}
          <TabsContent value="profile" style={{marginTop: 18}}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 220px', gap: 20, alignItems: 'start'}}>
              <div>
                <div className="detail-relations" style={{gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 0}}>
                  <div><span>Vehicle ID</span><b>{vehicle.id}</b></div>
                  <div><span>Category</span><b>{vehicle.category}</b></div>
                  <div><span>Year</span><b>{vehicle.year}</b></div>
                  <div><span>Color</span><b style={{display:'flex',alignItems:'center',gap:5}}><Palette size={11}/>{vehicle.color}</b></div>
                  <div><span>Chassis No.</span><b style={{fontSize:10, wordBreak:'break-all'}}>{vehicle.chassisNo}</b></div>
                  <div><span>Engine No.</span><b style={{fontSize:10, wordBreak:'break-all'}}>{vehicle.engineNo}</b></div>
                  <div><span>Reg. Date</span><b>{vehicle.registrationDate}</b></div>
                  <div><span>Agreement Start</span><b>{vehicle.agreementStart}</b></div>
                  <div><span>Agreement End</span><b>{vehicle.agreementEnd ?? '—'}</b></div>
                </div>

                <div style={{marginTop: 18}}>
                  <div style={{fontSize: 13, fontWeight: 700, color: '#233b49', marginBottom: 10}}>Document Status</div>
                  <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                    {DOCS.map(doc => (
                      <span key={doc.label} className={`badge ${doc.ok ? 'badge-good' : 'badge-bad'}`}
                        style={{gap: 5, display:'inline-flex', alignItems:'center'}}>
                        {doc.ok ? <CheckCircle2 size={10}/> : <AlertTriangle size={10}/>}
                        {doc.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Photo placeholder */}
              <div style={{background: '#eef4f5', borderRadius: 11, height: 180, display: 'grid', placeItems: 'center', color: '#7daab5', border: '1px dashed #bcd6db'}}>
                <div style={{textAlign: 'center'}}>
                  <CarFront size={40} style={{opacity: .4}}/>
                  <div style={{fontSize: 11, marginTop: 8, color: '#8aadb6'}}>Vehicle Photo</div>
                  <div style={{fontSize: 10, color: '#a4bec4', marginTop: 3}}>Not uploaded</div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Owner Info ── */}
          <TabsContent value="owner" style={{marginTop: 18}}>
            {owner ? (
              <>
                <div className="detail-relations" style={{gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 0}}>
                  <div><span>Owner Name</span><b>{owner.name}</b></div>
                  <div><span>Mobile</span><b style={{display:'flex',alignItems:'center',gap:5}}><Phone size={11}/>{owner.mobile}</b></div>
                  <div><span>Email</span><b style={{display:'flex',alignItems:'center',gap:5}}><Mail size={11}/>{owner.email ?? '—'}</b></div>
                  <div><span>NID</span><b>{owner.nid}</b></div>
                  <div><span>Joining Date</span><b>{owner.joiningDate}</b></div>
                  <div><span>Status</span><b><span className={`badge ${owner.status === 'Active' ? 'badge-good' : 'badge-bad'}`}>{owner.status}</span></b></div>
                  <div style={{gridColumn: '1/-1'}}><span>Present Address</span><b>{owner.presentAddress}</b></div>
                  <div><span>Bank</span><b>{owner.bankName ?? '—'}</b></div>
                  <div><span>Account No.</span><b>{owner.accountNumber ?? '—'}</b></div>
                  <div><span>Branch</span><b>{owner.branchName ?? '—'}</b></div>
                </div>

                <div style={{marginTop: 18}}>
                  <div style={{fontSize: 13, fontWeight: 700, color: '#233b49', marginBottom: 10}}>Payment Summary</div>
                  <div className="statement-lines">
                    <div><span>Monthly Rent (this vehicle)</span><b>{fmt(vehicle.monthlyRent)}</b></div>
                    <div><span>Agreement Start</span><b>{vehicle.agreementStart}</b></div>
                    <div><span>Agreement End</span><b>{vehicle.agreementEnd ?? 'Ongoing'}</b></div>
                    <div><span>Total Payable ({ownerRentMonths} months)</span><b>{fmt(ownerRentTotal)}</b></div>
                    <div><span>Owner Paid (est.)</span><b>{fmt(ownerPaid)}</b></div>
                    <div className="statement-total"><span>Owner Due</span><b>{fmt(ownerDue)}</b></div>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState icon={Building2} title="No owner linked" description="Owner information not available"/>
            )}
          </TabsContent>

          {/* ── Driver Info ── */}
          <TabsContent value="driver" style={{marginTop: 18}}>
            {driver ? (
              <>
                <div className="detail-relations" style={{gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 0}}>
                  <div><span>Driver Name</span><b>{driver.name}</b></div>
                  <div><span>Mobile</span><b style={{display:'flex',alignItems:'center',gap:5}}><Phone size={11}/>{driver.mobile}</b></div>
                  <div><span>License No.</span><b>{driver.licenseNo}</b></div>
                  <div><span>License Type</span><b>{driver.licenseType}</b></div>
                  <div><span>License Expiry</span><b style={{color: new Date(driver.licenseExpiry) < new Date('2026-11-10') ? '#a85851' : 'inherit'}}>{driver.licenseExpiry}</b></div>
                  <div><span>Joining Date</span><b>{driver.joiningDate}</b></div>
                  <div><span>Monthly Salary</span><b>{fmt(driver.monthlySalary)}</b></div>
                  <div><span>Daily Allowance</span><b>{fmt(driver.dailyAllowance)}</b></div>
                  <div><span>Status</span><b><span className={`badge ${driver.status === 'Active' ? 'badge-good' : 'badge-bad'}`}>{driver.status}</span></b></div>
                  <div style={{gridColumn:'1/-1'}}><span>Present Address</span><b>{driver.presentAddress}</b></div>
                </div>

                <div style={{marginTop: 18}}>
                  <div style={{fontSize: 13, fontWeight: 700, color: '#233b49', marginBottom: 8}}>Driver History</div>
                  <div className="note">
                    Currently assigned since joining date <b>{driver.joiningDate}</b>. No previous drivers recorded for this vehicle in the demo dataset.
                  </div>
                </div>
              </>
            ) : (
              <EmptyState icon={User} title="No driver assigned" description="This vehicle currently has no driver assigned"/>
            )}
          </TabsContent>

          {/* ── Financial Statement ── */}
          <TabsContent value="financial" style={{marginTop: 18}}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18}}>
              <Card style={{padding: 16, background: '#eaf4f0', border: '1px solid #c5e0d6'}}>
                <div style={{fontSize: 11, color: '#4c8070', fontWeight: 700, display:'flex', alignItems:'center', gap:6}}>
                  <TrendingUp size={13}/> Total Income
                </div>
                <div style={{fontSize: 24, fontWeight: 800, color: '#1b5944', marginTop: 8}}>{fmt(vehicleIncome)}</div>
                <div style={{fontSize: 11, color: '#5a8f7b', marginTop: 3}}>{duties.filter(d=>d.status!=='Cancelled').length} duties</div>
              </Card>
              <Card style={{padding: 16, background: netProfit >= 0 ? '#eaf4f0' : '#fbe8e6', border: `1px solid ${netProfit >= 0 ? '#c5e0d6' : '#f1c9c4'}`}}>
                <div style={{fontSize: 11, color: netProfit >= 0 ? '#4c8070' : '#9b2a23', fontWeight: 700, display:'flex', alignItems:'center', gap:6}}>
                  {netProfit >= 0 ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}
                  Net {netProfit >= 0 ? 'Profit' : 'Loss'}
                </div>
                <div style={{fontSize: 24, fontWeight: 800, color: netProfit >= 0 ? '#1b5944' : '#9b2a23', marginTop: 8}}>{fmt(Math.abs(netProfit))}</div>
                <div style={{fontSize: 11, color: '#8a9ba2', marginTop: 3}}>After all deductions</div>
              </Card>
            </div>

            <div className="statement-lines">
              <div><span>Vehicle Income (duty revenue)</span><b>{fmt(vehicleIncome)}</b></div>
              <div><span>Owner Monthly Rent × {ownerRentMonths} months</span><b style={{color:'#a85851'}}>−{fmt(ownerRentTotal)}</b></div>
              <div><span>Owner Amount Paid</span><b>{fmt(ownerPaid)}</b></div>
              <div><span>Owner Due Balance</span><b style={{color:'#a85851'}}>{fmt(ownerDue)}</b></div>
              <div><span>Operating Expenses ({expenses.length} records)</span><b style={{color:'#a85851'}}>−{fmt(expenseTotal)}</b></div>
              <div><span>Maintenance Cost ({maintenance.length} records)</span><b style={{color:'#a85851'}}>−{fmt(maintTotal)}</b></div>
              <div className="statement-total">
                <span>Net {netProfit >= 0 ? 'Profit' : 'Loss'}</span>
                <b style={{color: netProfit >= 0 ? '#328562' : '#a85851'}}>{netProfit >= 0 ? '' : '−'}{fmt(Math.abs(netProfit))}</b>
              </div>
            </div>

            {expenses.length > 0 && (
              <div style={{marginTop: 18}}>
                <div style={{fontSize: 13, fontWeight: 700, color: '#233b49', marginBottom: 8}}>Expense Breakdown</div>
                <div className="billing-table" style={{fontSize: 12}}>
                  <div className="head" style={{display:'grid', gridTemplateColumns:'1fr 1.5fr 90px 90px', gap:8, padding:'6px 4px'}}>
                    <span>Date</span><span>Title</span><span>Category</span><span style={{textAlign:'right'}}>Amount</span>
                  </div>
                  {expenses.map(e => (
                    <div key={e.id} style={{display:'grid', gridTemplateColumns:'1fr 1.5fr 90px 90px', gap:8, padding:'8px 4px', borderBottom:'1px solid #edf1f1', alignItems:'center'}}>
                      <span style={{color:'#8a9ba2'}}>{e.date}</span>
                      <span style={{color:'#2b4553', fontWeight:600}}>{e.title}</span>
                      <span className="badge badge-neutral" style={{fontSize:9}}>{e.category}</span>
                      <b style={{textAlign:'right', color:'#a85851'}}>{fmt(e.amount)}</b>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {maintenance.length > 0 && (
              <div style={{marginTop: 18}}>
                <div style={{fontSize: 13, fontWeight: 700, color: '#233b49', marginBottom: 8}}>Maintenance Breakdown</div>
                <div className="billing-table" style={{fontSize: 12}}>
                  <div className="head" style={{display:'grid', gridTemplateColumns:'1fr 2fr 80px 90px', gap:8, padding:'6px 4px'}}>
                    <span>Date</span><span>Description</span><span>Type</span><span style={{textAlign:'right'}}>Cost</span>
                  </div>
                  {maintenance.map(m => (
                    <div key={m.id} style={{display:'grid', gridTemplateColumns:'1fr 2fr 80px 90px', gap:8, padding:'8px 4px', borderBottom:'1px solid #edf1f1', alignItems:'center'}}>
                      <span style={{color:'#8a9ba2'}}>{m.date}</span>
                      <span style={{color:'#2b4553', fontWeight:600, fontSize:11}}>{m.problemDescription}</span>
                      <span className="badge badge-warn" style={{fontSize:9}}>{m.serviceType}</span>
                      <b style={{textAlign:'right', color:'#a85851'}}>{fmt(m.totalCost)}</b>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── History ── */}
          <TabsContent value="history" style={{marginTop: 18}}>
            {duties.length === 0 ? (
              <EmptyState icon={Clock} title="No duty history" description="No duties recorded for this vehicle yet"/>
            ) : (
              <>
                <div style={{fontSize: 13, fontWeight: 700, color: '#233b49', marginBottom: 10}}>
                  Duty History — {duties.length} records
                </div>
                <div className="billing-table" style={{fontSize: 12}}>
                  <div className="head" style={{display:'grid', gridTemplateColumns:'90px 1.6fr 1.4fr 1fr 90px', gap:8, padding:'6px 4px', minWidth:580}}>
                    <span>Date</span><span>Client</span><span>Route</span><span style={{textAlign:'right'}}>Amount</span><span>Status</span>
                  </div>
                  {duties.map(d => (
                    <div key={d.id} style={{display:'grid', gridTemplateColumns:'90px 1.6fr 1.4fr 1fr 90px', gap:8, padding:'10px 4px', borderBottom:'1px solid #edf1f1', alignItems:'center', minWidth:580}}>
                      <span style={{color:'#8a9ba2', fontSize:11}}>{d.date}</span>
                      <div>
                        <b style={{color:'#2b4553', fontSize:12}}>{d.clientName}</b>
                        <small style={{display:'block', color:'#8a9ba2', fontSize:10, marginTop:2}}>{d.dutyType} duty</small>
                      </div>
                      <span style={{color:'#5d7279', fontSize:11}}>{d.pickupLocation} → {d.destination}</span>
                      <b style={{textAlign:'right', color:'#2b4553'}}>{fmt(d.totalAmount)}</b>
                      <span>{dutyStatusBadge(d.status)}</span>
                    </div>
                  ))}
                  <div style={{padding:'10px 4px', display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:700, color:'#1e6e80', borderTop:'2px solid #bdd8de', marginTop:4}}>
                    <span>Total Revenue</span>
                    <span>{fmt(duties.filter(d=>d.status!=='Cancelled').reduce((s,d)=>s+d.totalAmount,0))}</span>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Vehicle Card ─────────────────────────────────────────────────────────────
function VehicleCard({
  vehicle, owner, driver, isSelected, onSelect
}: {
  vehicle: Vehicle;
  owner: Owner | undefined;
  driver: Driver | undefined;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className="vehicle-card"
      style={{
        cursor: 'pointer',
        borderColor: isSelected ? '#215b70' : undefined,
        boxShadow: isSelected ? '0 0 0 2px #215b7026, 0 9px 20px #163c4910' : undefined,
      }}
    >
      <div className="vehicle-card-top">
        <div className="vehicle-art"><CarFront size={22}/></div>
        {statusBadge(vehicle.status)}
      </div>
      <strong>{vehicle.brand} {vehicle.model}</strong>
      <small style={{fontFamily:'monospace', letterSpacing:'.02em'}}>{vehicle.registration}</small>

      <div className="vehicle-divider"/>

      <div><span>Year</span><b>{vehicle.year}</b></div>
      <div><span>Category</span><b>{vehicle.category}</b></div>
      <div><span>Color</span><b>{vehicle.color}</b></div>
      <div><span>Owner</span><b>{owner?.name ?? '—'}</b></div>
      <div><span>Owner Mobile</span><b>{owner?.mobile ?? '—'}</b></div>
      <div><span>Driver</span><b>{driver?.name ?? 'Unassigned'}</b></div>

      <div className="vehicle-foot">
        <span style={{color:'#4c6672', fontWeight:700}}>{fmt(vehicle.monthlyRent)}<span style={{fontWeight:400, color:'#99adb4'}}>/mo</span></span>
        <Button
          size="sm"
          onClick={onSelect}
          style={{
            fontSize: 11, height: 29,
            background: isSelected ? '#215b70' : undefined,
            color: isSelected ? '#fff' : undefined,
            gap: 4, display:'flex', alignItems:'center'
          }}
          variant={isSelected ? 'default' : 'outline'}
        >
          {isSelected ? 'Viewing Profile' : 'View Full Profile'}
          {!isSelected && <ChevronRight size={12}/>}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VehicleSearchPage() {
  const [query,       setQuery]       = useState('');
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [toast,       setToast]       = useState<string | null>(null);
  const [statusFilter,setStatusFilter]= useState<string>('All');
  const [vehiclesList,setVehiclesList]= useState<any[]>(demoVehicles);

  useEffect(() => {
    searchVehicles(1, query).then((data: any) => {
      if (Array.isArray(data) && data.length > 0) {
        setVehiclesList(data.map((v: any) => ({
          id: String(v.id),
          registration: v.registration,
          brand: v.brand,
          model: v.model,
          year: 2021,
          category: 'Sedan',
          color: 'White',
          status: v.status,
          ownerId: '1',
          driverId: '1',
          monthlyRent: Number(v.monthlyRent) || 50000,
          agreementStart: '2026-01-01'
        })));
      }
    }).catch(() => {});
  }, [query]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Look-up maps
  const ownerMap = useMemo(() => Object.fromEntries(demoOwners.map(o => [o.id, o])), []);
  const driverMap = useMemo(() => Object.fromEntries(demoDrivers.map(d => [d.id, d])), []);

  // Filtered vehicles
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return vehiclesList.filter(v => {
      if (statusFilter !== 'All' && v.status !== statusFilter) return false;
      if (!q) return true;
      const owner  = ownerMap[v.ownerId];
      const driver = v.driverId ? driverMap[v.driverId] : undefined;
      return (
        v.registration.toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        (owner?.name.toLowerCase().includes(q) ?? false) ||
        (driver?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [query, statusFilter, ownerMap, driverMap, vehiclesList]);

  const selectedVehicle = selectedId ? vehiclesList.find(v => v.id === selectedId) : null;

  const STATUS_OPTIONS = ['All', 'Available', 'On Duty', 'In Garage', 'Inactive'];

  const handleSelect = (id: string) => {
    setSelectedId(prev => prev === id ? null : id);
  };

  return (
    <div className="content">
      {/* Page Intro */}
      <div className="page-intro">
        <div>
          <div className="eyebrow">MODULE 12</div>
          <h1>Vehicle Search & Statement</h1>
          <p>Search vehicles by registration, ID, owner name, or driver name — then view full profile and financial statements.</p>
        </div>
        <div className="intro-actions">
          <button className="period-chip" onClick={() => showToast('Export feature will be available after backend integration')}>
            <Download size={14}/> Export All
          </button>
          <Button
            className="primary-action"
            onClick={() => showToast('Print feature will be available after backend integration')}
            style={{gap: 7, display:'flex', alignItems:'center'}}
          >
            <Printer size={15}/> Print Statement
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card style={{padding: '18px 20px', marginBottom: 20, background: '#f7fbfc', border: '1.5px solid #c8dfe4'}}>
        <div style={{display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap'}}>
          <div style={{flex: 1, minWidth: 260, position: 'relative', display:'flex', alignItems:'center'}}>
            <Search size={16} style={{position:'absolute', left:11, color:'#7daab5', pointerEvents:'none'}}/>
            <Input
              placeholder="Search by Registration Number, Vehicle ID, Owner Name, or Driver Name"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{paddingLeft: 34, height: 42, fontSize: 13, borderColor: query ? '#215b70' : undefined}}
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{position:'absolute', right:10, background:'none', border:0, color:'#7daab5', cursor:'pointer', display:'flex'}}
                aria-label="Clear search"
              >
                <X size={15}/>
              </button>
            )}
          </div>

          {/* Status filter chips */}
          <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={statusFilter === s ? 'role-choices' : ''}
                style={{
                  border: `1px solid ${statusFilter === s ? '#357f8e' : '#dce7e8'}`,
                  background: statusFilter === s ? '#e5f2f3' : '#fff',
                  color: statusFilter === s ? '#225e70' : '#56737d',
                  fontWeight: statusFilter === s ? 700 : 450,
                  padding: '6px 12px',
                  borderRadius: 7,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{marginTop: 10, fontSize: 12, color: '#7daab5', display: 'flex', alignItems: 'center', gap: 6}}>
          <Hash size={12}/>
          {query || statusFilter !== 'All'
            ? <span>Showing <b style={{color:'#215b70'}}>{filtered.length}</b> of {demoVehicles.length} vehicles</span>
            : <span>All <b style={{color:'#215b70'}}>{demoVehicles.length}</b> vehicles</span>
          }
        </div>
      </Card>

      {/* Vehicle Cards Grid */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Search}
            title="No vehicles found"
            description={`No vehicles match "${query}". Try searching by registration number, vehicle ID, owner name, or driver name.`}
            action={<Button variant="outline" size="sm" onClick={() => { setQuery(''); setStatusFilter('All'); }}>Clear Search</Button>}
          />
        </Card>
      ) : (
        <>
          <SectionHeading
            title={query || statusFilter !== 'All' ? `Search Results (${filtered.length})` : `All Vehicles (${filtered.length})`}
            subtitle="Click &quot;View Full Profile&quot; on any card to see detailed information and financial statement"
          />
          <div className="vehicle-grid" style={{marginBottom: selectedVehicle ? 0 : 0}}>
            {filtered.map(v => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                owner={ownerMap[v.ownerId]}
                driver={v.driverId ? driverMap[v.driverId] : undefined}
                isSelected={selectedId === v.id}
                onSelect={() => handleSelect(v.id)}
              />
            ))}
          </div>

          {/* Detail Panel */}
          {selectedVehicle && (
            <VehicleDetail
              vehicle={selectedVehicle}
              owner={ownerMap[selectedVehicle.ownerId]}
              driver={selectedVehicle.driverId ? driverMap[selectedVehicle.driverId] : undefined}
              onClose={() => setSelectedId(null)}
              showToast={showToast}
            />
          )}
        </>
      )}

      {/* Toast */}
      {toast && <Toast msg={toast} onClose={() => setToast(null)}/>}
    </div>
  );
}
