"use client";
import {useState, useMemo, useCallback, useEffect} from 'react';
import {
  Search, CarFront, User, Building2, FileText, Download, Printer,
  TrendingUp, TrendingDown, X, ChevronRight, Calendar, Phone, Mail,
  Hash, Palette, Wrench, Shield, AlertTriangle, CheckCircle2, Clock
} from 'lucide-react';
import {searchVehicles, fetchVehicleStatement} from '@/lib/api';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {EmptyState} from '@/components/shared/empty-state';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => `৳${(Number(n) || 0).toLocaleString('en-US')}`;

function statusBadge(status: string) {
  const map: Record<string, string> = {
    'On Duty':    'badge badge-blue',
    'Available':  'badge badge-good',
    'In Garage':  'badge badge-warn',
    'Inactive':   'badge badge-bad',
  };
  return <span className={map[status] || 'badge badge-neutral'}>{status}</span>;
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

// ─── Vehicle Detail Panel (Live Statement from Neon DB) ──────────────────────
function VehicleDetail({
  vehicleId, onClose, showToast
}: {
  vehicleId: string;
  onClose: () => void;
  showToast: (msg: string) => void;
}) {
  const [statement, setStatement] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchVehicleStatement(1, vehicleId)
      .then(res => setStatement(res))
      .catch(() => setStatement(null))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  const handleExportCSV = () => {
    if (!statement) return;
    const v = statement.vehicle || {};
    const f = statement.financials || {};
    const csvContent = "data:text/csv;charset=utf-8," +
      `Vehicle Statement - TASIN ENTERPRISE\n` +
      `Registration,${v.registration}\n` +
      `Brand & Model,${v.brand} ${v.model}\n` +
      `Owner,${v.owner}\n` +
      `Driver,${v.driver}\n` +
      `Status,${v.status}\n\n` +
      `Financial Summary\n` +
      `Total Duty Income,${f.totalIncome}\n` +
      `Owner Monthly Rent,${f.ownerRent}\n` +
      `Maintenance Cost,${f.maintenanceCost}\n` +
      `Net Profit,${f.netProfit}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `statement_${v.registration}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Statement for ${v.registration} downloaded as CSV`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{marginTop: 24, padding: 32, textAlign: 'center', background: '#fff', borderRadius: 14, border: '1.5px solid #bdd8de'}}>
        <div style={{color: '#64748b', fontSize: 14}}>Loading live vehicle statement from database...</div>
      </div>
    );
  }

  if (!statement || !statement.vehicle) {
    return (
      <div style={{marginTop: 24, padding: 32, textAlign: 'center', background: '#fff', borderRadius: 14, border: '1.5px solid #bdd8de'}}>
        <div style={{color: '#ef4444', fontSize: 14}}>Could not load statement for vehicle #{vehicleId}</div>
        <Button size="sm" variant="outline" onClick={onClose} style={{marginTop: 12}}>Close</Button>
      </div>
    );
  }

  const v = statement.vehicle;
  const f = statement.financials || { totalIncome: 0, ownerRent: 0, maintenanceCost: 0, netProfit: 0 };
  const papers = statement.papers || [];
  const duties = statement.dutyHistory || [];
  const maintenance = statement.maintenanceHistory || [];

  return (
    <div style={{marginTop: 24, border: '1.5px solid #bdd8de', borderRadius: 14, background: '#fff', overflow: 'hidden'}}>
      {/* Panel Header */}
      <div style={{background: '#eaf3f4', borderBottom: '1px solid #cce0e4', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14}}>
        <div className="vehicle-art" style={{width: 52, height: 52, borderRadius: 11}}>
          <CarFront size={26}/>
        </div>
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'}}>
            <strong style={{fontSize: 18, color: '#1b3341', letterSpacing: '-.03em'}}>{v.brand} {v.model}</strong>
            {statusBadge(v.status)}
          </div>
          <div style={{fontSize: 12, color: '#5e8b99', marginTop: 3, fontFamily: 'monospace'}}>{v.registration}</div>
        </div>
        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
          <Button size="sm" variant="outline" onClick={handleExportCSV} style={{fontSize: 11, gap: 5, display:'flex', alignItems:'center'}}>
            <Download size={13}/> Export CSV / Excel
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint} style={{fontSize: 11, gap: 5, display:'flex', alignItems:'center'}}>
            <Printer size={13}/> Print / Save PDF
          </Button>
          <Button size="sm" variant="outline" onClick={onClose} style={{fontSize: 11}}>
            <X size={13}/>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{padding: '0 22px 22px'}}>
        <Tabs defaultValue="financial" style={{marginTop: 18}}>
          <TabsList className="detail-tabs" style={{width: '100%', justifyContent: 'flex-start', height: 'auto', flexWrap: 'wrap'}}>
            <TabsTrigger value="financial"><TrendingUp size={13}/> Financial Statement</TabsTrigger>
            <TabsTrigger value="profile"><CarFront size={13}/> Vehicle Profile</TabsTrigger>
            <TabsTrigger value="history"><Clock size={13}/> Duty & Maintenance History</TabsTrigger>
            <TabsTrigger value="documents"><Shield size={13}/> Documents & Papers</TabsTrigger>
          </TabsList>

          {/* ── Financial Statement ── */}
          <TabsContent value="financial" style={{marginTop: 18}}>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12, marginBottom:18}}>
              <div style={{background:'#f0fdf4', border:'1px solid #dcfce7', borderRadius:10, padding:14}}>
                <span style={{fontSize:11, color:'#64748b', display:'block'}}>Total Duty Income</span>
                <strong style={{fontSize:20, color:'#16a34a', fontWeight:800}}>{fmt(f.totalIncome)}</strong>
              </div>
              <div style={{background:'#eff6ff', border:'1px solid #dbeafe', borderRadius:10, padding:14}}>
                <span style={{fontSize:11, color:'#64748b', display:'block'}}>Owner Monthly Rent</span>
                <strong style={{fontSize:20, color:'#1e293b', fontWeight:800}}>{fmt(f.ownerRent)}</strong>
              </div>
              <div style={{background:'#fef2f2', border:'1px solid #fee2e2', borderRadius:10, padding:14}}>
                <span style={{fontSize:11, color:'#64748b', display:'block'}}>Maintenance Cost</span>
                <strong style={{fontSize:20, color:'#ef4444', fontWeight:800}}>{fmt(f.maintenanceCost)}</strong>
              </div>
              <div style={{background: f.netProfit >= 0 ? '#f0fdf4' : '#fef2f2', border:'1px solid', borderColor: f.netProfit >= 0 ? '#86efac' : '#fca5a5', borderRadius:10, padding:14}}>
                <span style={{fontSize:11, color:'#64748b', display:'block'}}>Net Profit / Margin</span>
                <strong style={{fontSize:20, color: f.netProfit >= 0 ? '#16a34a' : '#ef4444', fontWeight:800}}>{fmt(f.netProfit)}</strong>
              </div>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16}}>
              <Card style={{padding:16, border:'1px solid #e2e8f0'}}>
                <h4 style={{fontSize:13, fontWeight:750, color:'#0f172a', marginBottom:10}}>Income from Client Duties</h4>
                <div style={{fontSize:12, color:'#475569'}}>
                  Total completed duty earnings: <strong>{fmt(f.totalIncome)}</strong>
                </div>
              </Card>
              <Card style={{padding:16, border:'1px solid #e2e8f0'}}>
                <h4 style={{fontSize:13, fontWeight:750, color:'#0f172a', marginBottom:10}}>Total Operating Deductions</h4>
                <div style={{fontSize:12, color:'#475569'}}>
                  Owner Rent + Repairs: <strong>{fmt(f.ownerRent + f.maintenanceCost)}</strong>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ── Vehicle Profile ── */}
          <TabsContent value="profile" style={{marginTop: 18}}>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, alignItems: 'start'}}>
              <div>
                <div className="detail-relations" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', marginTop: 0}}>
                  <div><span>Registration</span><b>{v.registration}</b></div>
                  <div><span>Brand & Model</span><b>{v.brand} {v.model}</b></div>
                  <div><span>Category</span><b>{v.category || 'Sedan'}</b></div>
                  <div><span>Year</span><b>{v.year || 2021}</b></div>
                  <div><span>Color</span><b>{v.color || 'White'}</b></div>
                  <div><span>Owner Name</span><b>{v.owner}</b></div>
                  <div><span>Assigned Driver</span><b>{v.driver || 'Unassigned'}</b></div>
                  <div><span>Status</span><b>{v.status}</b></div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── History ── */}
          <TabsContent value="history" style={{marginTop: 18}}>
            <div style={{display:'flex', flexDirection:'column', gap:16}}>
              <div>
                <h4 style={{fontSize:13, fontWeight:750, color:'#0f172a', marginBottom:8}}>Recent Duties ({duties.length})</h4>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%', borderCollapse:'collapse', fontSize:12, textAlign:'left'}}>
                    <thead>
                      <tr style={{borderBottom:'1px solid #f1f5f9', color:'#64748b', fontWeight:700, height:32}}>
                        <th>Duty ID</th>
                        <th>Date</th>
                        <th>Client</th>
                        <th>Driver</th>
                        <th>Status</th>
                        <th style={{textAlign:'right'}}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duties.length === 0 ? (
                        <tr><td colSpan={6} style={{padding:'12px 0', textAlign:'center', color:'#94a3b8'}}>No duty records recorded yet</td></tr>
                      ) : (
                        duties.map((d: any, i: number) => (
                          <tr key={i} style={{borderBottom:'1px solid #f8fafc', height:36}}>
                            <td style={{fontFamily:'monospace', color:'#1677ff'}}>{d.id}</td>
                            <td>{d.date}</td>
                            <td>{d.client}</td>
                            <td>{d.driver}</td>
                            <td>{dutyStatusBadge(d.status)}</td>
                            <td style={{textAlign:'right', fontWeight:700}}>{fmt(d.amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 style={{fontSize:13, fontWeight:750, color:'#0f172a', marginBottom:8}}>Maintenance Records ({maintenance.length})</h4>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%', borderCollapse:'collapse', fontSize:12, textAlign:'left'}}>
                    <thead>
                      <tr style={{borderBottom:'1px solid #f1f5f9', color:'#64748b', fontWeight:700, height:32}}>
                        <th>MNT ID</th>
                        <th>Date</th>
                        <th>Garage</th>
                        <th>Service Type</th>
                        <th>Status</th>
                        <th style={{textAlign:'right'}}>Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {maintenance.length === 0 ? (
                        <tr><td colSpan={6} style={{padding:'12px 0', textAlign:'center', color:'#94a3b8'}}>No maintenance records recorded yet</td></tr>
                      ) : (
                        maintenance.map((m: any, i: number) => (
                          <tr key={i} style={{borderBottom:'1px solid #f8fafc', height:36}}>
                            <td style={{fontFamily:'monospace', color:'#1677ff'}}>{m.id}</td>
                            <td>{m.date}</td>
                            <td>{m.garage}</td>
                            <td>{m.service}</td>
                            <td><span className="badge badge-good">{m.status}</span></td>
                            <td style={{textAlign:'right', fontWeight:700}}>{fmt(m.cost)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Documents & Papers ── */}
          <TabsContent value="documents" style={{marginTop: 18}}>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12}}>
              {papers.length === 0 ? (
                <div style={{color:'#64748b', fontSize:12, padding:'12px 0'}}>No document records registered</div>
              ) : (
                papers.map((p: any, i: number) => (
                  <Card key={i} style={{padding:12, border:'1px solid #e2e8f0'}}>
                    <div style={{fontSize:12, fontWeight:700, color:'#0f172a', textTransform:'capitalize'}}>{p.type?.replace('_', ' ')}</div>
                    <div style={{fontSize:11, color:'#64748b', marginTop:4}}>Doc No: {p.number || 'N/A'}</div>
                    <div style={{fontSize:11, color:'#64748b'}}>Expiry: {p.expiry || 'Active'}</div>
                    <div style={{marginTop:6}}>
                      <span className={p.status === 'Valid' ? 'badge badge-good' : 'badge badge-bad'}>{p.status}</span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Vehicle Search Result Card ──────────────────────────────────────────────
function VehicleCard({
  vehicle, isSelected, onSelect
}: {
  vehicle: any;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`vehicle-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      style={{cursor:'pointer'}}
    >
      <div className="card-top">
        <div className="vehicle-art">
          <CarFront size={22}/>
        </div>
        <div style={{flex: 1, minWidth: 0}}>
          <strong style={{fontSize: 14, color: '#1b3341', display: 'block'}}>{vehicle.brand} {vehicle.model}</strong>
          <span style={{fontSize: 11, color: '#5e8b99', fontFamily: 'monospace'}}>{vehicle.registration}</span>
        </div>
        {statusBadge(vehicle.status)}
      </div>

      <div className="card-relations">
        <div className="rel-row">
          <Building2 size={13}/>
          <span style={{flex: 1, minWidth: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'}}>
            {vehicle.owner}
          </span>
        </div>
        <div className="rel-row">
          <User size={13}/>
          <span style={{flex: 1, minWidth: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'}}>
            {vehicle.driver || 'Unassigned'}
          </span>
        </div>
      </div>

      <div className="card-footer">
        <div>
          <span className="rent-label">Monthly Rent</span>
          <span className="rent-amt">{fmt(vehicle.monthlyRent)}</span>
        </div>
        <Button
          size="sm"
          variant={isSelected ? 'default' : 'outline'}
          className={isSelected ? 'action-selected' : ''}
          style={{fontSize: 11, gap: 4, height: 28, display:'flex', alignItems:'center'}}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
        >
          {isSelected ? 'Viewing' : 'View Statement'}
          {!isSelected && <ChevronRight size={12}/>}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VehicleSearchPage() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVehicles = (q: string = '') => {
    setLoading(true);
    searchVehicles(1, q)
      .then((data: any) => {
        if (Array.isArray(data)) {
          setVehiclesList(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadVehicles(query);
  }, [query]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const filtered = useMemo(() => {
    return vehiclesList.filter(v => {
      if (statusFilter !== 'All' && v.status !== statusFilter) return false;
      return true;
    });
  }, [vehiclesList, statusFilter]);

  const handleExportAll = () => {
    if (vehiclesList.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," +
      `ID,Registration,Brand,Model,Owner,Driver,Status,MonthlyRent\n` +
      vehiclesList.map(v => `${v.id},${v.registration},${v.brand},${v.model},"${v.owner}","${v.driver || ''}",${v.status},${v.monthlyRent}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `all_vehicles_fleet.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${vehiclesList.length} vehicles to CSV`);
  };

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
          <p>Search vehicles by registration, model, owner, or driver — and view real-time financial statements directly from Neon DB.</p>
        </div>
        <div className="intro-actions">
          <button className="period-chip" onClick={handleExportAll}>
            <Download size={14}/> Export Fleet CSV
          </button>
          <Button
            className="primary-action"
            onClick={() => window.print()}
            style={{gap: 7, display:'flex', alignItems:'center'}}
          >
            <Printer size={15}/> Print Report
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card style={{padding: '18px 20px', marginBottom: 20, background: '#f7fbfc', border: '1.5px solid #c8dfe4'}}>
        <div style={{display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap'}}>
          <div style={{flex: 1, minWidth: 260, position: 'relative', display:'flex', alignItems:'center'}}>
            <Search size={16} style={{position:'absolute', left:11, color:'#7daab5', pointerEvents:'none'}}/>
            <Input
              type="search"
              placeholder="Search by registration (e.g. GA-12-3456), model, owner, driver..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{paddingLeft: 34, background: '#fff', borderColor: '#b5d4db'}}
            />
          </div>

          {/* Status Filter Pills */}
          <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                className={`period-chip ${statusFilter === s ? 'active' : ''}`}
                onClick={() => setStatusFilter(s)}
                style={{fontSize: 11, padding: '5px 11px'}}
              >
                {s}
              </button>
            ))}
          </div>

          {(query || statusFilter !== 'All') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setQuery(''); setStatusFilter('All'); }}
              style={{fontSize: 11, gap: 4, display:'flex', alignItems:'center'}}
            >
              <X size={12}/> Clear Filters
            </Button>
          )}
        </div>

        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 11.5, color: '#7daab5'}}>
          <span>Showing <strong>{filtered.length}</strong> of {vehiclesList.length} vehicles</span>
          {query && <span>Filtering by: &ldquo;{query}&rdquo;</span>}
        </div>
      </Card>

      {/* Selected Vehicle Full Statement Panel */}
      {selectedId && (
        <VehicleDetail
          vehicleId={selectedId}
          onClose={() => setSelectedId(null)}
          showToast={showToast}
        />
      )}

      {/* Results Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No vehicles found"
          description={query ? `No vehicles matched "${query}". Try searching by registration number, brand, or owner.` : "No vehicles registered."}
          action={<Button size="sm" variant="outline" onClick={() => { setQuery(''); setStatusFilter('All'); }}>Reset Search</Button>}
        />
      ) : (
        <div className="vehicles-grid" style={{marginTop: selectedId ? 24 : 0}}>
          {filtered.map(vehicle => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              isSelected={selectedId === vehicle.id}
              onSelect={() => handleSelect(vehicle.id)}
            />
          ))}
        </div>
      )}

      {/* Toast Notification */}
      {toast && <Toast msg={toast} onClose={() => setToast(null)}/>}
    </div>
  );
}
