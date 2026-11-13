"use client";
import {useState, useEffect, useMemo} from 'react';
import {
  BarChart3,
  PieChart as PieIcon,
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  TrendingUp,
  CarFront,
  Building2,
  Users,
  Briefcase,
  Wrench,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  X
} from 'lucide-react';
import {
  fetchDashboardKpis,
  fetchVehicles,
  fetchOwners,
  fetchClients,
  fetchDrivers,
  fetchMaintenance,
  fetchFinancialAccounts,
  fetchVehicleProfitability,
  fetchDocumentExpiriesReport,
  fetchAccountLedgerReport,
  buildCustomReport
} from '@/lib/api';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend} from 'recharts';

const fmt = (n: number) => '৳' + (Number(n) || 0).toLocaleString('en-US');
const COLORS = ['#236d80', '#d4a971', '#529e72', '#a869a8', '#e07a5f', '#3d5a80'];

export default function ReportsPage() {
  const [periodF, setPeriodF] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Monthly');
  const [activeTab, setActiveTab] = useState('profitability');
  const [kpis, setKpis] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // Specific financial and operational reports
  const [profitData, setProfitData] = useState<{ vehicles: any[]; totals: any }>({ vehicles: [], totals: {} });
  const [expiryData, setExpiryData] = useState<{ documents: any[]; summary: any }>({ documents: [], summary: {} });
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Custom Report Builder state
  const [builderModule, setBuilderModule] = useState<'duties' | 'invoices' | 'expenses' | 'maintenance' | 'parties'>('duties');
  const [builderDateFrom, setBuilderDateFrom] = useState('');
  const [builderDateTo, setBuilderDateTo] = useState('');
  const [builderStatus, setBuilderStatus] = useState('all');
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderResult, setBuilderResult] = useState<any>(null);

  const handleRunReportBuilder = async () => {
    setBuilderLoading(true);
    try {
      const res = await buildCustomReport(1, {
        module: builderModule,
        start_date: builderDateFrom || undefined,
        end_date: builderDateTo || undefined,
        status_filter: builderStatus !== 'all' ? builderStatus : undefined,
        filters: {
          date_from: builderDateFrom || undefined,
          date_to: builderDateTo || undefined,
          status: builderStatus !== 'all' ? builderStatus : undefined,
        }
      });
      setBuilderResult(res);
      showToast(`Generated custom report: ${res?.total_count ?? 0} records found`);
    } catch {
      showToast('Error generating custom report');
    } finally {
      setBuilderLoading(false);
    }
  };

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadAllReports = async () => {
    setLoading(true);
    try {
      const [kRes, vRes, oRes, cRes, dRes, mRes, aRes, pRes, eRes] = await Promise.all([
        fetchDashboardKpis(1, periodF).catch(() => null),
        fetchVehicles(1).catch(() => []),
        fetchOwners(1).catch(() => []),
        fetchClients(1).catch(() => []),
        fetchDrivers(1).catch(() => []),
        fetchMaintenance(1).catch(() => []),
        fetchFinancialAccounts(1).catch(() => []),
        fetchVehicleProfitability(1, startDate, endDate).catch(() => ({ vehicles: [], totals: {} })),
        fetchDocumentExpiriesReport(1, expiryFilter).catch(() => ({ documents: [], summary: {} })),
      ]);
      if (kRes) setKpis(kRes);
      if (Array.isArray(vRes)) setVehicles(vRes);
      if (Array.isArray(oRes)) setOwners(oRes);
      if (Array.isArray(cRes)) setClients(cRes);
      if (Array.isArray(dRes)) setDrivers(dRes);
      if (Array.isArray(mRes)) setMaintenance(mRes);
      if (Array.isArray(aRes)) {
        setAccounts(aRes);
        if (aRes.length > 0 && !selectedAccountId) {
          setSelectedAccountId(String(aRes[0].id));
        }
      }
      if (pRes) setProfitData(pRes);
      if (eRes) setExpiryData(eRes);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllReports();
  }, [periodF]);

  useEffect(() => {
    fetchVehicleProfitability(1, startDate, endDate)
      .then(res => res && setProfitData(res))
      .catch(() => {});
  }, [startDate, endDate]);

  useEffect(() => {
    fetchDocumentExpiriesReport(1, expiryFilter)
      .then(res => res && setExpiryData(res))
      .catch(() => {});
  }, [expiryFilter]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchAccountLedgerReport(1, selectedAccountId, startDate, endDate)
        .then(res => setLedgerData(res))
        .catch(() => {});
    }
  }, [selectedAccountId, startDate, endDate]);

  const totalRevenue = kpis?.financials?.totalRevenue || 0;
  const totalExpense = kpis?.financials?.totalExpenses || 0;
  const netProfit = kpis?.financials?.netProfit || (totalRevenue - totalExpense);
  const customerReceivable = kpis?.financials?.customerReceivable || clients.reduce((s, c) => s + (c.due || 0), 0);
  const ownerPayable = kpis?.financials?.ownerPayable || owners.reduce((s, o) => s + (o.due || 0), 0);

  const rawChart = kpis?.monthlyChart || kpis?.chartData || [];
  const chartData = rawChart.map((m: any) => ({
    month: m.month,
    income: Number(m.income || 0),
    expenses: Number(m.expenses || 0),
    profit: Number(m.profit || 0),
  }));

  const handleExportCSV = () => {
    let filename = `report_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    let content = "";

    if (activeTab === 'profitability') {
      content = "Registration,Model,Owner,DutyIncome,Maintenance,FuelMobil,DriverAllowance,OwnerRent,TotalExpense,NetProfit,MarginPct\n" +
        (profitData.vehicles || []).map(v =>
          `"${v.registration}","${v.model}","${v.owner_name}",${v.duty_income},${v.maintenance_cost},${v.fuel_mobil_cost},${v.driver_allowance},${v.owner_rent},${v.total_expense},${v.net_profit},${v.margin_pct}%`
        ).join("\n");
    } else if (activeTab === 'expiries') {
      content = "Entity,Name,Identifier,DocumentType,ExpiryDate,DaysRemaining,Status\n" +
        (expiryData.documents || []).map(d =>
          `"${d.entity_type}","${d.entity_name}","${d.identifier}","${d.document_type}","${d.expiry_date}",${d.days_remaining},"${d.status}"`
        ).join("\n");
    } else if (activeTab === 'ledger') {
      content = `Ledger: ${ledgerData?.account?.name || 'Account'} (${ledgerData?.account?.type || ''})\n` +
        `Opening Balance: ${ledgerData?.opening_balance || 0}\n` +
        `Closing Balance: ${ledgerData?.closing_balance || 0}\n\n` +
        "Date,Type,Category,Description,Reference,Debit(Outflow),Credit(Inflow),Balance\n" +
        (ledgerData?.transactions || []).map((t: any) =>
          `"${t.date}","${t.type}","${t.category}","${t.description}","${t.reference}",${t.debit},${t.credit},${t.balance}`
        ).join("\n");
    } else if (activeTab === 'financial') {
      content = "Month,Income,Expense,Profit\n" +
        chartData.map((c: any) => `${c.month},${c.income},${c.expenses},${c.profit}`).join("\n");
    } else if (activeTab === 'vehicles') {
      content = "RegNo,Brand,Model,Owner,Driver,Status,MonthlyRent\n" +
        vehicles.map(v => `${v.regNo || v.registration},${v.brand},${v.model},"${v.owner}","${v.driver || ''}",${v.status},${v.monthlyRent}`).join("\n");
    } else if (activeTab === 'owners') {
      content = "Name,Phone,VehiclesCount,TotalRent,TotalPaid,Due\n" +
        owners.map(o => `"${o.name}",${o.mobile || o.phone},${o.totalVehicles || 1},${o.totalRent},${o.totalPaid},${o.due}`).join("\n");
    } else if (activeTab === 'clients') {
      content = "ClientName,ContactPerson,Mobile,Receivable,Collected,Due\n" +
        clients.map(c => `"${c.name}","${c.contactPerson || ''}",${c.mobile},${c.totalReceivable},${c.totalCollected},${c.due}`).join("\n");
    } else if (activeTab === 'drivers') {
      content = "Name,Mobile,License,Salary,Paid,Due\n" +
        drivers.map(d => `"${d.name}",${d.mobile || d.phone},${d.licenseNo || ''},${d.monthlySalary || 18000},${d.totalPaid || 0},${d.remainingDue || 0}`).join("\n");
    } else if (activeTab === 'maintenance') {
      content = "VehicleReg,Garage,ServiceType,Date,Cost,Status\n" +
        maintenance.map(m => `${m.vehicleReg},"${m.garageName}",${m.serviceType},${m.date},${m.totalCost},${m.status}`).join("\n");
    }

    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${activeTab} report to CSV`);
  };

  return (
    <>
      {/* Page Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:'#1e3947',marginBottom:4}}>Reports &amp; Analytics</h1>
          <p style={{fontSize:13,color:'#6a7c83'}}>Operational metrics, vehicle profitability, compliance expiries, and account ledgers.</p>
        </div>

        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <Select value={periodF} onValueChange={(v: any) => setPeriodF(v)}>
            <SelectTrigger style={{minWidth:120}}><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="Daily">Daily</SelectItem>
              <SelectItem value="Weekly">Weekly</SelectItem>
              <SelectItem value="Monthly">Monthly</SelectItem>
              <SelectItem value="Yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExportCSV}>
            <FileSpreadsheet size={15}/> Excel / CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={15}/> Print / PDF
          </Button>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="kpi-grid-5" style={{marginBottom:16}}>
        {[
          {label:'Total Revenue', value:fmt(totalRevenue), color:'blue', icon:TrendingUp},
          {label:'Total Expenses', value:fmt(totalExpense), color:'gold', icon:DollarSign},
          {label:'Net Profit', value:fmt(netProfit), color: netProfit >= 0 ? 'blue' : 'gold', icon:TrendingUp},
          {label:'Client Receivables', value:fmt(customerReceivable), color:'gold', icon:Briefcase},
          {label:'Owner Payables', value:fmt(ownerPayable), color:'purple', icon:Building2},
        ].map(c => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="metric">
              <div className="metric-top">
                <span>{c.label}</span>
                <span className={`metric-icon ${c.color}`}><Icon size={17}/></span>
              </div>
              <strong className="nums" style={{fontSize:20}}>{c.value}</strong>
            </Card>
          );
        })}
      </div>

      {/* Tabs for Different Report Modules */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{marginBottom:16,display:'flex',gap:6,overflowX:'auto',maxWidth:'100%',whiteSpace:'nowrap',paddingBottom:4}}>
          <TabsTrigger value="profitability">Vehicle Profitability</TabsTrigger>
          <TabsTrigger value="expiries">Document Expiries</TabsTrigger>
          <TabsTrigger value="ledger">Cash &amp; Bank Ledger</TabsTrigger>
          <TabsTrigger value="financial">Financial Overview</TabsTrigger>
          <TabsTrigger value="vehicles">Fleet Performance ({vehicles.length})</TabsTrigger>
          <TabsTrigger value="owners">Owner Statements ({owners.length})</TabsTrigger>
          <TabsTrigger value="clients">Client Receivables ({clients.length})</TabsTrigger>
          <TabsTrigger value="drivers">Driver Payroll ({drivers.length})</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance ({maintenance.length})</TabsTrigger>
          <TabsTrigger value="builder" style={{color:'#1677ff',fontWeight:700}}>Custom Report Builder</TabsTrigger>
        </TabsList>

        {/* 1. Vehicle Profitability Report */}
        <TabsContent value="profitability">
          <Card style={{padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:10}}>
              <div>
                <h3 style={{fontSize:15,fontWeight:750,color:'#1e3947'}}>Vehicle Profitability Analysis</h3>
                <p style={{fontSize:12,color:'#64748b',margin:0}}>
                  Net Profit = Duty Income - (Maintenance + Fuel/CNG + Mobil + Driver Allowance + Owner Rent)
                </p>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{width:140,fontSize:12}}
                  placeholder="From"
                />
                <span style={{fontSize:12,color:'#64748b'}}>to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{width:140,fontSize:12}}
                  placeholder="To"
                />
                {(startDate || endDate) && (
                  <Button size="sm" variant="ghost" onClick={() => { setStartDate(''); setEndDate(''); }}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Profitability Summary KPI Row */}
            {profitData.totals && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))',gap:10,marginBottom:16,background:'#f8fafc',padding:12,borderRadius:8,border:'1px solid #e2e8f0'}}>
                <div>
                  <small style={{fontSize:10,color:'#64748b',fontWeight:700}}>TOTAL INCOME</small>
                  <strong style={{fontSize:16,color:'#0f172a',display:'block'}}>{fmt(profitData.totals.duty_income || 0)}</strong>
                </div>
                <div>
                  <small style={{fontSize:10,color:'#64748b',fontWeight:700}}>MAINTENANCE</small>
                  <strong style={{fontSize:16,color:'#e11d48',display:'block'}}>{fmt(profitData.totals.maintenance_cost || 0)}</strong>
                </div>
                <div>
                  <small style={{fontSize:10,color:'#64748b',fontWeight:700}}>FUEL / MOBIL</small>
                  <strong style={{fontSize:16,color:'#d97706',display:'block'}}>{fmt(profitData.totals.fuel_mobil_cost || 0)}</strong>
                </div>
                <div>
                  <small style={{fontSize:10,color:'#64748b',fontWeight:700}}>DRIVER ALLOWANCE</small>
                  <strong style={{fontSize:16,color:'#7c3aed',display:'block'}}>{fmt(profitData.totals.driver_allowance || 0)}</strong>
                </div>
                <div>
                  <small style={{fontSize:10,color:'#64748b',fontWeight:700}}>OWNER RENT</small>
                  <strong style={{fontSize:16,color:'#2563eb',display:'block'}}>{fmt(profitData.totals.owner_rent || 0)}</strong>
                </div>
                <div>
                  <small style={{fontSize:10,color:'#64748b',fontWeight:700}}>NET PROFIT</small>
                  <strong style={{fontSize:16,color: (profitData.totals.net_profit || 0) >= 0 ? '#16a34a' : '#ef4444',display:'block'}}>
                    {fmt(profitData.totals.net_profit || 0)}
                  </strong>
                </div>
              </div>
            )}

            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #e2e8f0',color:'#64748b',fontWeight:700,height:38,background:'#f8fafc'}}>
                    <th style={{padding:'6px 10px'}}>Vehicle</th>
                    <th style={{padding:'6px 10px'}}>Owner</th>
                    <th style={{padding:'6px 10px',textAlign:'right'}}>Duty Income</th>
                    <th style={{padding:'6px 10px',textAlign:'right'}}>Maintenance</th>
                    <th style={{padding:'6px 10px',textAlign:'right'}}>Fuel / Mobil</th>
                    <th style={{padding:'6px 10px',textAlign:'right'}}>Allowance</th>
                    <th style={{padding:'6px 10px',textAlign:'right'}}>Owner Rent</th>
                    <th style={{padding:'6px 10px',textAlign:'right'}}>Total Expenses</th>
                    <th style={{padding:'6px 10px',textAlign:'right'}}>Net Profit</th>
                    <th style={{padding:'6px 10px',textAlign:'right'}}>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {(profitData.vehicles || []).map((v: any, idx: number) => {
                    const isProfit = (v.net_profit || 0) >= 0;
                    return (
                      <tr key={v.vehicle_id || idx} style={{borderBottom:'1px solid #f1f5f9',height:42}}>
                        <td style={{padding:'6px 10px'}}>
                          <strong style={{color:'#1e3947'}}>{v.registration}</strong>
                          <span style={{fontSize:10,color:'#64748b',display:'block'}}>{v.model}</span>
                        </td>
                        <td style={{padding:'6px 10px',color:'#475569'}}>{v.owner_name}</td>
                        <td style={{padding:'6px 10px',textAlign:'right',fontWeight:700,color:'#0f172a'}}>{fmt(v.duty_income)}</td>
                        <td style={{padding:'6px 10px',textAlign:'right',color:'#dc2626'}}>{fmt(v.maintenance_cost)}</td>
                        <td style={{padding:'6px 10px',textAlign:'right',color:'#d97706'}}>{fmt(v.fuel_mobil_cost)}</td>
                        <td style={{padding:'6px 10px',textAlign:'right',color:'#7c3aed'}}>{fmt(v.driver_allowance)}</td>
                        <td style={{padding:'6px 10px',textAlign:'right',color:'#2563eb'}}>{fmt(v.owner_rent)}</td>
                        <td style={{padding:'6px 10px',textAlign:'right',fontWeight:600}}>{fmt(v.total_expense)}</td>
                        <td style={{padding:'6px 10px',textAlign:'right',fontWeight:800,color: isProfit ? '#16a34a' : '#ef4444'}}>
                          {fmt(v.net_profit)}
                        </td>
                        <td style={{padding:'6px 10px',textAlign:'right'}}>
                          <span className={isProfit ? 'badge badge-good' : 'badge badge-bad'}>
                            {v.margin_pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {(!profitData.vehicles || profitData.vehicles.length === 0) && (
                    <tr>
                      <td colSpan={10} style={{padding:24,textAlign:'center',color:'#94a3b8'}}>
                        No vehicle profitability data found for the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 2. Document Expiry Report */}
        <TabsContent value="expiries">
          <Card style={{padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:10}}>
              <div>
                <h3 style={{fontSize:15,fontWeight:750,color:'#1e3947'}}>Document &amp; Compliance Expiry Tracker</h3>
                <p style={{fontSize:12,color:'#64748b',margin:0}}>
                  Fitness, Tax Token, Route Permit, Insurance, and Driving License expiries.
                </p>
              </div>

              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <Select value={expiryFilter} onValueChange={setExpiryFilter}>
                  <SelectTrigger style={{minWidth:140}}><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Documents</SelectItem>
                    <SelectItem value="expired">Expired Only</SelectItem>
                    <SelectItem value="7d">Expiring in 7 Days</SelectItem>
                    <SelectItem value="15d">Expiring in 15 Days</SelectItem>
                    <SelectItem value="30d">Expiring in 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Summary Cards */}
            {expiryData.summary && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))',gap:10,marginBottom:16}}>
                <div style={{background:'#fee2e2',padding:10,borderRadius:8}}>
                  <small style={{fontSize:10,color:'#991b1b',fontWeight:700}}>EXPIRED</small>
                  <strong style={{fontSize:18,color:'#991b1b',display:'block'}}>{expiryData.summary.expired || 0}</strong>
                </div>
                <div style={{background:'#ffedd5',padding:10,borderRadius:8}}>
                  <small style={{fontSize:10,color:'#9a3412',fontWeight:700}}>URGENT (&le; 7 DAYS)</small>
                  <strong style={{fontSize:18,color:'#9a3412',display:'block'}}>{expiryData.summary.urgent_7d || 0}</strong>
                </div>
                <div style={{background:'#fef9c3',padding:10,borderRadius:8}}>
                  <small style={{fontSize:10,color:'#854d0e',fontWeight:700}}>WARNING (&le; 15 DAYS)</small>
                  <strong style={{fontSize:18,color:'#854d0e',display:'block'}}>{expiryData.summary.warning_15d || 0}</strong>
                </div>
                <div style={{background:'#e0f2fe',padding:10,borderRadius:8}}>
                  <small style={{fontSize:10,color:'#075985',fontWeight:700}}>NOTICE (&le; 30 DAYS)</small>
                  <strong style={{fontSize:18,color:'#075985',display:'block'}}>{expiryData.summary.notice_30d || 0}</strong>
                </div>
                <div style={{background:'#dcfce7',padding:10,borderRadius:8}}>
                  <small style={{fontSize:10,color:'#166534',fontWeight:700}}>VALID (&gt; 30 DAYS)</small>
                  <strong style={{fontSize:18,color:'#166534',display:'block'}}>{expiryData.summary.valid || 0}</strong>
                </div>
              </div>
            )}

            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #e2e8f0',color:'#64748b',fontWeight:700,height:38,background:'#f8fafc'}}>
                    <th style={{padding:'6px 10px'}}>Type</th>
                    <th style={{padding:'6px 10px'}}>Entity Name</th>
                    <th style={{padding:'6px 10px'}}>Reg / License</th>
                    <th style={{padding:'6px 10px'}}>Document Type</th>
                    <th style={{padding:'6px 10px'}}>Expiry Date</th>
                    <th style={{padding:'6px 10px',textAlign:'right'}}>Days Left</th>
                    <th style={{padding:'6px 10px',textAlign:'center'}}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(expiryData.documents || []).map((d: any, idx: number) => {
                    let badgeClass = 'badge-good';
                    if (d.status === 'expired') badgeClass = 'badge-bad';
                    else if (d.status === 'urgent_7d') badgeClass = 'badge-bad';
                    else if (d.status === 'warning_15d') badgeClass = 'badge-warn';
                    else if (d.status === 'notice_30d') badgeClass = 'badge-blue';

                    return (
                      <tr key={d.id || idx} style={{borderBottom:'1px solid #f1f5f9',height:40}}>
                        <td style={{padding:'6px 10px'}}>
                          <span style={{fontSize:11,textTransform:'capitalize',color:'#475569'}}>{d.entity_type}</span>
                        </td>
                        <td style={{padding:'6px 10px',fontWeight:600,color:'#1e3947'}}>{d.entity_name}</td>
                        <td style={{padding:'6px 10px',color:'#0284c7',fontWeight:600}}>{d.identifier}</td>
                        <td style={{padding:'6px 10px',fontWeight:700}}>{d.document_type}</td>
                        <td style={{padding:'6px 10px'}}>{d.expiry_date}</td>
                        <td style={{padding:'6px 10px',textAlign:'right',fontWeight:700,color: d.days_remaining <= 0 ? '#ef4444' : d.days_remaining <= 7 ? '#ea580c' : '#0f172a'}}>
                          {d.days_remaining <= 0 ? `${Math.abs(d.days_remaining)}d ago` : `${d.days_remaining}d`}
                        </td>
                        <td style={{padding:'6px 10px',textAlign:'center'}}>
                          <span className={`badge ${badgeClass}`} style={{textTransform:'uppercase',fontSize:10}}>
                            {d.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {(!expiryData.documents || expiryData.documents.length === 0) && (
                    <tr>
                      <td colSpan={7} style={{padding:24,textAlign:'center',color:'#94a3b8'}}>
                        No document records found matching filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 3. Cash & Bank Ledger */}
        <TabsContent value="ledger">
          <Card style={{padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:10}}>
              <div>
                <h3 style={{fontSize:15,fontWeight:750,color:'#1e3947'}}>Cash &amp; Bank Account Ledger</h3>
                <p style={{fontSize:12,color:'#64748b',margin:0}}>
                  Audit trail of receipts, payments, and running balance for financial accounts.
                </p>
              </div>

              <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger style={{minWidth:180}}><SelectValue placeholder="Select Account"/></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name} ({a.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{width:130,fontSize:12}}
                />
                <span style={{fontSize:12,color:'#64748b'}}>to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{width:130,fontSize:12}}
                />
              </div>
            </div>

            {ledgerData && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))',gap:10,marginBottom:16,background:'#f8fafc',padding:12,borderRadius:8,border:'1px solid #e2e8f0'}}>
                <div>
                  <small style={{fontSize:10,color:'#64748b',fontWeight:700}}>OPENING BALANCE</small>
                  <strong style={{fontSize:16,color:'#0f172a',display:'block'}}>{fmt(ledgerData.opening_balance || 0)}</strong>
                </div>
                <div>
                  <small style={{fontSize:10,color:'#64748b',fontWeight:700}}>TOTAL RECEIPTS (CREDITS)</small>
                  <strong style={{fontSize:16,color:'#16a34a',display:'block'}}>{fmt(ledgerData.total_inflow || 0)}</strong>
                </div>
                <div>
                  <small style={{fontSize:10,color:'#64748b',fontWeight:700}}>TOTAL PAYMENTS (DEBITS)</small>
                  <strong style={{fontSize:16,color:'#ef4444',display:'block'}}>{fmt(ledgerData.total_outflow || 0)}</strong>
                </div>
                <div>
                  <small style={{fontSize:10,color:'#64748b',fontWeight:700}}>CLOSING BALANCE</small>
                  <strong style={{fontSize:16,color:'#2563eb',display:'block'}}>{fmt(ledgerData.closing_balance || 0)}</strong>
                </div>
              </div>
            )}

            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #e2e8f0',color:'#64748b',fontWeight:700,height:38,background:'#f8fafc'}}>
                    <th style={{padding:'6px 10px'}}>Date</th>
                    <th style={{padding:'6px 10px'}}>Type</th>
                    <th style={{padding:'6px 10px'}}>Category</th>
                    <th style={{padding:'6px 10px'}}>Description</th>
                    <th style={{padding:'6px 10px'}}>Reference</th>
                    <th style={{padding:'6px 10px',textAlign:'right'}}>Debit (Outflow)</th>
                    <th style={{padding:'6px 10px',textAlign:'right'}}>Credit (Inflow)</th>
                    <th style={{padding:'6px 10px',textAlign:'right'}}>Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {(ledgerData?.transactions || []).map((t: any, idx: number) => (
                    <tr key={idx} style={{borderBottom:'1px solid #f1f5f9',height:40}}>
                      <td style={{padding:'6px 10px',color:'#64748b'}}>{t.date}</td>
                      <td style={{padding:'6px 10px'}}>
                        <span className={`badge ${t.type === 'INFLOW' ? 'badge-good' : 'badge-warn'}`} style={{fontSize:10}}>
                          {t.type}
                        </span>
                      </td>
                      <td style={{padding:'6px 10px',fontWeight:600}}>{t.category}</td>
                      <td style={{padding:'6px 10px',color:'#334155'}}>{t.description}</td>
                      <td style={{padding:'6px 10px',color:'#64748b',fontSize:11}}>{t.reference || '—'}</td>
                      <td style={{padding:'6px 10px',textAlign:'right',color: t.debit > 0 ? '#ef4444' : '#94a3b8'}}>
                        {t.debit > 0 ? fmt(t.debit) : '—'}
                      </td>
                      <td style={{padding:'6px 10px',textAlign:'right',color: t.credit > 0 ? '#16a34a' : '#94a3b8',fontWeight:600}}>
                        {t.credit > 0 ? fmt(t.credit) : '—'}
                      </td>
                      <td style={{padding:'6px 10px',textAlign:'right',fontWeight:700,color:'#0f172a'}}>
                        {fmt(t.balance)}
                      </td>
                    </tr>
                  ))}
                  {(!ledgerData?.transactions || ledgerData.transactions.length === 0) && (
                    <tr>
                      <td colSpan={8} style={{padding:24,textAlign:'center',color:'#94a3b8'}}>
                        No ledger transactions found for this account.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 4. Financial Overview */}
        <TabsContent value="financial">
          <div className="split-grid-analytics-2" style={{marginBottom:16}}>
            <Card style={{padding:16}}>
              <h3 style={{fontSize:14,fontWeight:750,color:'#1e3947',marginBottom:14}}>Period Income vs Expense Trend</h3>
              <div style={{width:'100%',height:260}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="month" stroke="#6a7c83" fontSize={11}/>
                    <YAxis stroke="#6a7c83" fontSize={11} tickFormatter={(v)=>`${v/1000}k`}/>
                    <Tooltip formatter={(v:any)=>[fmt(Number(v)),'Amount']}/>
                    <Legend/>
                    <Bar dataKey="income" name="Income" fill="#236d80" radius={[4,4,0,0]}/>
                    <Bar dataKey="expenses" name="Expense" fill="#d4a971" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card style={{padding:16}}>
              <h3 style={{fontSize:14,fontWeight:750,color:'#1e3947',marginBottom:14}}>Account Balances</h3>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {accounts.map(a=>(
                  <div key={a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'#f8fafc',borderRadius:8,border:'1px solid #e2e8f0'}}>
                    <div>
                      <strong style={{fontSize:13,color:'#0f172a'}}>{a.name}</strong>
                      <span style={{fontSize:11,color:'#64748b',display:'block'}}>{a.type} {a.bankName ? `• ${a.bankName}` : ''}</span>
                    </div>
                    <strong style={{fontSize:14,color:'#1677ff'}}>{fmt(a.currentBalance)}</strong>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* 5. Vehicles Fleet Performance */}
        <TabsContent value="vehicles">
          <Card style={{padding:16}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#1e3947',marginBottom:12}}>Fleet Roster &amp; Status ({vehicles.length} Vehicles)</h3>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                    <th style={{padding:'0 8px'}}>Reg No</th>
                    <th style={{padding:'0 8px'}}>Brand &amp; Model</th>
                    <th style={{padding:'0 8px'}}>Owner</th>
                    <th style={{padding:'0 8px'}}>Driver</th>
                    <th style={{padding:'0 8px'}}>Status</th>
                    <th style={{padding:'0 8px',textAlign:'right'}}>Monthly Rent</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v, i)=>(
                    <tr key={v.id || i} style={{borderBottom:'1px solid #f8fafc',height:40}}>
                      <td style={{padding:'0 8px',fontWeight:700,color:'#1677ff'}}>{v.regNo || v.registration}</td>
                      <td style={{padding:'0 8px'}}>{v.brand} {v.model}</td>
                      <td style={{padding:'0 8px'}}>{v.owner}</td>
                      <td style={{padding:'0 8px'}}>{v.driver || 'Unassigned'}</td>
                      <td style={{padding:'0 8px'}}><span className="badge badge-good">{v.status}</span></td>
                      <td style={{padding:'0 8px',textAlign:'right',fontWeight:700}}>{fmt(v.monthlyRent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 6. Owner Statements */}
        <TabsContent value="owners">
          <Card style={{padding:16}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#1e3947',marginBottom:12}}>Owner Payables &amp; Dues ({owners.length} Owners)</h3>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                    <th style={{padding:'0 8px'}}>Owner Name</th>
                    <th style={{padding:'0 8px'}}>Phone</th>
                    <th style={{padding:'0 8px'}}>Cars</th>
                    <th style={{padding:'0 8px'}}>Monthly Rent</th>
                    <th style={{padding:'0 8px'}}>Total Paid</th>
                    <th style={{padding:'0 8px',textAlign:'right'}}>Outstanding Due</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((o, i)=>(
                    <tr key={o.id || i} style={{borderBottom:'1px solid #f8fafc',height:40}}>
                      <td style={{padding:'0 8px',fontWeight:700}}>{o.name}</td>
                      <td style={{padding:'0 8px'}}>{o.mobile || o.phone}</td>
                      <td style={{padding:'0 8px'}}>{o.totalVehicles || 1}</td>
                      <td style={{padding:'0 8px',fontWeight:700}}>{fmt(o.totalRent)}</td>
                      <td style={{padding:'0 8px',color:'#16a34a',fontWeight:700}}>{fmt(o.totalPaid)}</td>
                      <td style={{padding:'0 8px',textAlign:'right',color: o.due > 0 ? '#ef4444' : '#16a34a',fontWeight:800}}>{fmt(o.due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 7. Client Receivables */}
        <TabsContent value="clients">
          <Card style={{padding:16}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#1e3947',marginBottom:12}}>Client Receivables ({clients.length} Clients)</h3>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                    <th style={{padding:'0 8px'}}>Client / Company</th>
                    <th style={{padding:'0 8px'}}>Contact Person</th>
                    <th style={{padding:'0 8px'}}>Phone</th>
                    <th style={{padding:'0 8px'}}>Total Invoiced</th>
                    <th style={{padding:'0 8px'}}>Collected</th>
                    <th style={{padding:'0 8px',textAlign:'right'}}>Receivable Due</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c, i)=>(
                    <tr key={c.id || i} style={{borderBottom:'1px solid #f8fafc',height:40}}>
                      <td style={{padding:'0 8px',fontWeight:700}}>{c.name}</td>
                      <td style={{padding:'0 8px'}}>{c.contactPerson || '—'}</td>
                      <td style={{padding:'0 8px'}}>{c.mobile}</td>
                      <td style={{padding:'0 8px',fontWeight:700}}>{fmt(c.totalReceivable)}</td>
                      <td style={{padding:'0 8px',color:'#16a34a',fontWeight:700}}>{fmt(c.totalCollected)}</td>
                      <td style={{padding:'0 8px',textAlign:'right',color: c.due > 0 ? '#ef4444' : '#16a34a',fontWeight:800}}>{fmt(c.due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 8. Driver Payroll */}
        <TabsContent value="drivers">
          <Card style={{padding:16}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#1e3947',marginBottom:12}}>Driver Payroll Roster ({drivers.length} Drivers)</h3>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                    <th style={{padding:'0 8px'}}>Driver Name</th>
                    <th style={{padding:'0 8px'}}>Mobile</th>
                    <th style={{padding:'0 8px'}}>License</th>
                    <th style={{padding:'0 8px'}}>Monthly Salary</th>
                    <th style={{padding:'0 8px'}}>Total Paid</th>
                    <th style={{padding:'0 8px',textAlign:'right'}}>Remaining Due</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((d, i)=>(
                    <tr key={d.id || i} style={{borderBottom:'1px solid #f8fafc',height:40}}>
                      <td style={{padding:'0 8px',fontWeight:700}}>{d.name}</td>
                      <td style={{padding:'0 8px'}}>{d.mobile || d.phone}</td>
                      <td style={{padding:'0 8px'}}>{d.licenseNo || '—'}</td>
                      <td style={{padding:'0 8px',fontWeight:700}}>{fmt(d.monthlySalary || 18000)}</td>
                      <td style={{padding:'0 8px',color:'#16a34a',fontWeight:700}}>{fmt(d.totalPaid || 0)}</td>
                      <td style={{padding:'0 8px',textAlign:'right',color: (d.remainingDue || 0) > 0 ? '#ef4444' : '#16a34a',fontWeight:800}}>{fmt(d.remainingDue || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 9. Maintenance & Garages */}
        <TabsContent value="maintenance">
          <Card style={{padding:16}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#1e3947',marginBottom:12}}>Maintenance Logs ({maintenance.length} Records)</h3>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                    <th style={{padding:'0 8px'}}>Vehicle Reg</th>
                    <th style={{padding:'0 8px'}}>Garage</th>
                    <th style={{padding:'0 8px'}}>Service Type</th>
                    <th style={{padding:'0 8px'}}>Date</th>
                    <th style={{padding:'0 8px'}}>Status</th>
                    <th style={{padding:'0 8px',textAlign:'right'}}>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenance.map((m, i)=>(
                    <tr key={m.id || i} style={{borderBottom:'1px solid #f8fafc',height:40}}>
                      <td style={{padding:'0 8px',fontWeight:700,color:'#1677ff'}}>{m.vehicleReg}</td>
                      <td style={{padding:'0 8px'}}>{m.garageName}</td>
                      <td style={{padding:'0 8px'}}>{m.serviceType}</td>
                      <td style={{padding:'0 8px'}}>{m.date}</td>
                      <td style={{padding:'0 8px'}}><span className="badge badge-good">{m.status}</span></td>
                      <td style={{padding:'0 8px',textAlign:'right',fontWeight:700}}>{fmt(m.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 10. Custom Report Builder */}
        <TabsContent value="builder">
          <Card style={{padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16,flexWrap:'wrap',gap:12}}>
              <div>
                <h3 style={{fontSize:15,fontWeight:750,color:'#1e3947'}}>Custom Report Query Builder</h3>
                <p style={{fontSize:12,color:'#64748b',margin:'2px 0 0'}}>
                  Generate tailored analytical views across duties, billing invoices, fleet maintenance, and ledger expenses.
                </p>
              </div>

              <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                <Select value={builderModule} onValueChange={(v: any) => setBuilderModule(v)}>
                  <SelectTrigger style={{minWidth:140,fontSize:12}}><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="duties">Duties &amp; Trips</SelectItem>
                    <SelectItem value="invoices">Billing Invoices</SelectItem>
                    <SelectItem value="expenses">Operating Expenses</SelectItem>
                    <SelectItem value="maintenance">Maintenance Records</SelectItem>
                    <SelectItem value="parties">Client &amp; Vendor Parties</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={builderDateFrom}
                  onChange={e => setBuilderDateFrom(e.target.value)}
                  style={{width:135,fontSize:12}}
                  placeholder="Date From"
                />
                <Input
                  type="date"
                  value={builderDateTo}
                  onChange={e => setBuilderDateTo(e.target.value)}
                  style={{width:135,fontSize:12}}
                  placeholder="Date To"
                />

                <Button
                  size="sm"
                  onClick={handleRunReportBuilder}
                  disabled={builderLoading}
                  style={{background:'#1677ff',color:'#fff',height:36}}
                >
                  {builderLoading ? 'Executing Query...' : 'Generate Report'}
                </Button>
              </div>
            </div>

            {/* Builder Output KPI summary */}
            {builderResult && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:12,marginBottom:16,background:'#f8fafc',padding:12,borderRadius:8,border:'1px solid #e2e8f0'}}>
                <div>
                  <small style={{fontSize:11,color:'#64748b',fontWeight:700,textTransform:'uppercase'}}>TARGET MODULE</small>
                  <strong style={{fontSize:18,color:'#1677ff',display:'block'}}>{builderResult.module?.toUpperCase()}</strong>
                </div>
                <div>
                  <small style={{fontSize:11,color:'#64748b',fontWeight:700,textTransform:'uppercase'}}>RECORDS RETURNED</small>
                  <strong style={{fontSize:18,color:'#0f172a',display:'block'}}>{builderResult.total_count}</strong>
                </div>
                <div>
                  <small style={{fontSize:11,color:'#64748b',fontWeight:700,textTransform:'uppercase'}}>AGGREGATE FINANCIAL SUM</small>
                  <strong style={{fontSize:18,color:'#10b981',display:'block'}}>{fmt(builderResult.aggregations?.total_amount || 0)}</strong>
                </div>
              </div>
            )}

            {/* Dynamic Results Table */}
            <div style={{overflowX:'auto'}}>
              {builderLoading ? (
                <div style={{padding:'40px 0',textAlign:'center',color:'#94a3b8',fontSize:13}}>Querying database...</div>
              ) : !builderResult ? (
                <div style={{padding:'40px 0',textAlign:'center',color:'#94a3b8',fontSize:13}}>
                  Configure query parameters above and click &quot;Generate Report&quot; to build a custom dataset.
                </div>
              ) : builderResult.rows?.length === 0 ? (
                <div style={{padding:'40px 0',textAlign:'center',color:'#94a3b8',fontSize:13}}>No records match your query filters.</div>
              ) : (
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
                  <thead>
                    <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                      {Object.keys(builderResult.rows[0]).map(col => (
                        <th key={col} style={{padding:'0 10px',textTransform:'capitalize'}}>
                          {col.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {builderResult.rows.map((row: any, i: number) => (
                      <tr key={i} style={{borderBottom:'1px solid #f8fafc',height:38}}>
                        {Object.entries(row).map(([k, val]: [string, any], ci: number) => (
                          <td key={ci} style={{padding:'0 10px',color: k.includes('amount') || k.includes('cost') || k.includes('total') ? '#0f172a' : '#475569', fontWeight: k.includes('amount') || k.includes('id') ? 700 : 400}}>
                            {typeof val === 'number' && (k.includes('amount') || k.includes('cost') || k.includes('total') || k.includes('rent')) ? fmt(val) : String(val ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Toast notification */}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18}/>{toast}
          <button onClick={() => setToast('')} aria-label="Dismiss"><X size={16}/></button>
        </div>
      )}
    </>
  );
}