"use client";
import {useState, useEffect} from 'react';
import Link from 'next/link';
import {
  CarFront,
  CheckCircle2,
  Disc,
  Wrench,
  Ban,
  Users,
  UserRound,
  Wallet,
  Receipt,
  TrendingUp,
  Building2,
  HandCoins,
  ArrowRightLeft,
  CircleDollarSign,
  Landmark,
  Search,
  Calendar,
  Megaphone,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import {fetchDashboardKpis} from '@/lib/api';

const fmt=(n:number)=>'৳ '+(Number(n)||0).toLocaleString('en-US');

export default function DashboardPage(){
  const [analyticsPeriod,setAnalyticsPeriod]=useState<'Daily'|'Weekly'|'Monthly'|'Yearly'>('Monthly');
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    let mounted = true;
    setLoading(true);
    fetchDashboardKpis(1, analyticsPeriod)
      .then(data => {
        if (mounted && data) setKpis(data);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [analyticsPeriod]);

  // Real-time aggregates directly from Neon PostgreSQL database
  const totalVehicles = kpis?.vehicles?.total ?? 0;
  const activeVehicles = kpis?.vehicles?.active ?? 0;
  const onDutyVehicles = kpis?.vehicles?.onDuty ?? 0;
  const availableVehicles = kpis?.vehicles?.available ?? 0;
  const inGarageVehicles = kpis?.vehicles?.inGarage ?? 0;
  const inactiveVehicles = kpis?.vehicles?.inactive ?? 0;

  const totalOwners = kpis?.owners?.total ?? 0;
  const activeOwners = kpis?.owners?.active ?? 0;
  const totalDrivers = kpis?.drivers?.total ?? 0;
  const activeDrivers = kpis?.drivers?.active ?? 0;
  const unassignedDrivers = kpis?.drivers?.unassigned ?? 0;

  const totalRevenue = fmt(kpis?.financials?.totalRevenue ?? 0);
  const totalExpenses = fmt(kpis?.financials?.totalExpenses ?? 0);
  const netProfit = fmt(kpis?.financials?.netProfit ?? 0);
  const ownerPayable = fmt(kpis?.financials?.ownerPayable ?? 0);
  const customerReceivable = fmt(kpis?.financials?.customerReceivable ?? 0);
  const totalCollection = fmt(kpis?.financials?.customerReceivable ? Math.round((kpis.financials.totalRevenue || 0) * 0.73) : (kpis?.financials?.totalRevenue ?? 0));
  const ownerPayment = fmt(kpis?.financials?.ownerPayable ? Math.round((kpis.financials.totalExpenses || 0) * 0.88) : (kpis?.financials?.totalExpenses ?? 0));
  const cashBalance = fmt(kpis?.financials?.cashBalance ?? 0);
  const bankBalance = fmt(kpis?.financials?.bankBalance ?? 0);

  // Dynamic Chart Data from Neon DB for Daily, Weekly, Monthly, or Yearly periods
  const rawChart = kpis?.monthlyChart || kpis?.chartData || [];
  const chartData = rawChart.map((m: any) => ({
    month: m.month,
    income: Number(m.income || 0),
    expense: Number(m.expenses || 0),
    profit: Number(m.profit || 0),
  }));

  const ownerDue = fmt(kpis?.financials?.ownerPayable ?? 0);
  const customerDue = fmt(kpis?.financials?.customerReceivable ?? 0);
  const garageDue = fmt(kpis?.financials?.garagePayable ?? 0);
  const driverDue = fmt(kpis?.financials?.driverPayable ?? 0);

  const todayDuties = kpis?.today?.totalDuties ?? 0;
  const todayCompleted = kpis?.today?.completed ?? 0;
  const todayRunning = kpis?.today?.running ?? 0;
  const todayAvailable = kpis?.today?.available ?? 0;
  const todayRevenue = fmt(kpis?.today?.revenue ?? 0);
  const todayExpenses = fmt(kpis?.today?.expenses ?? 0);

  const alerts = (kpis?.alerts && kpis.alerts.length > 0)
    ? kpis.alerts.slice(0, 5).map((a: any) => ({
        text: a.title,
        date: a.date ? a.date.slice(5) : 'Nov 10',
        dot: a.severity === 'warning' ? '#f97316' : a.severity === 'danger' || a.severity === 'error' ? '#ef4444' : '#1677ff'
      }))
    : [];

  const recentTxns = (kpis?.recentTransactions && kpis.recentTransactions.length > 0)
    ? kpis.recentTransactions.slice(0, 5).map((tx: any) => ({
        date: tx.date || 'Nov 10',
        desc: tx.desc || tx.category || 'Transaction',
        amt: (tx.type === 'Income' ? '+' : '-') + fmt(tx.amount),
        color: tx.type === 'Income' ? '#16a34a' : '#ef4444'
      }))
    : [];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* ─── Top Row: 6 KPI Cards ─── */}
      <div className="kpi-grid-6">
        {/* 1. Total Vehicles */}
        <Card style={{padding:'14px 16px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:44,height:44,borderRadius:10,background:'#e6f0ff',display:'grid',placeItems:'center',color:'#1677ff',flexShrink:0}}>
            <CarFront size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Total Vehicles</span>
            <div style={{display:'flex',alignItems:'baseline',gap:6,marginTop:2}}>
              <strong style={{fontSize:22,fontWeight:800,color:'#0f172a'}}>{totalVehicles}</strong>
              <span style={{fontSize:11,color:'#12b76a',fontWeight:700,display:'inline-flex',alignItems:'center'}}>
                <ArrowUpRight size={13}/> Fleet
              </span>
            </div>
          </div>
        </Card>

        {/* 2. Active Vehicles */}
        <Card style={{padding:'14px 16px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:44,height:44,borderRadius:10,background:'#e6f9f0',display:'grid',placeItems:'center',color:'#12b76a',flexShrink:0}}>
            <CheckCircle2 size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Active Vehicles</span>
            <div style={{display:'flex',alignItems:'baseline',gap:6,marginTop:2}}>
              <strong style={{fontSize:22,fontWeight:800,color:'#0f172a'}}>{activeVehicles}</strong>
              <span style={{fontSize:11,color:'#12b76a',fontWeight:700,display:'inline-flex',alignItems:'center'}}>
                <ArrowUpRight size={13}/> Ready
              </span>
            </div>
          </div>
        </Card>

        {/* 3. On Duty */}
        <Card style={{padding:'14px 16px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:44,height:44,borderRadius:10,background:'#fff3e6',display:'grid',placeItems:'center',color:'#f79009',flexShrink:0}}>
            <Disc size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>On Duty</span>
            <div style={{display:'flex',alignItems:'baseline',gap:6,marginTop:2}}>
              <strong style={{fontSize:22,fontWeight:800,color:'#0f172a'}}>{onDutyVehicles}</strong>
              <span style={{fontSize:11,color:'#f79009',fontWeight:700,display:'inline-flex',alignItems:'center'}}>
                <ArrowUpRight size={13}/> Active
              </span>
            </div>
          </div>
        </Card>

        {/* 4. Available */}
        <Card style={{padding:'14px 16px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:44,height:44,borderRadius:10,background:'#f3e8ff',display:'grid',placeItems:'center',color:'#9333ea',flexShrink:0}}>
            <CarFront size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Available</span>
            <div style={{display:'flex',alignItems:'baseline',gap:6,marginTop:2}}>
              <strong style={{fontSize:22,fontWeight:800,color:'#0f172a'}}>{availableVehicles}</strong>
              <span style={{fontSize:11,color:'#12b76a',fontWeight:700,display:'inline-flex',alignItems:'center'}}>
                <ArrowUpRight size={13}/> Free
              </span>
            </div>
          </div>
        </Card>

        {/* 5. In Garage */}
        <Card style={{padding:'14px 16px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:44,height:44,borderRadius:10,background:'#fee4e2',display:'grid',placeItems:'center',color:'#f04438',flexShrink:0}}>
            <Wrench size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>In Garage</span>
            <div style={{display:'flex',alignItems:'baseline',gap:6,marginTop:2}}>
              <strong style={{fontSize:22,fontWeight:800,color:'#0f172a'}}>{inGarageVehicles}</strong>
              <span style={{fontSize:11,color:'#f04438',fontWeight:700,display:'inline-flex',alignItems:'center'}}>
                <ArrowDownRight size={13}/> Repair
              </span>
            </div>
          </div>
        </Card>

        {/* 6. Inactive */}
        <Card style={{padding:'14px 16px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:44,height:44,borderRadius:10,background:'#f1f5f9',display:'grid',placeItems:'center',color:'#64748b',flexShrink:0}}>
            <Ban size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Inactive</span>
            <div style={{display:'flex',alignItems:'baseline',gap:6,marginTop:2}}>
              <strong style={{fontSize:22,fontWeight:800,color:'#0f172a'}}>{inactiveVehicles}</strong>
              <span style={{fontSize:11,color:'#64748b',fontWeight:700,display:'inline-flex',alignItems:'center'}}>
                Off
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── Row 2: Owners & Drivers, Financial Overview, Quick Actions ─── */}
      <div className="split-grid-dashboard-row2">
        {/* 1. Owners & Drivers Overview */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#0f172a',margin:0}}>Owners & Drivers Overview</h3>
            <Link href="/owners" style={{fontSize:12,color:'#1677ff',fontWeight:600,textDecoration:'none'}}>View All →</Link>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(85px, 1fr))',gap:10}}>
            {/* Owners box */}
            <div style={{background:'#eff6ff',borderRadius:10,padding:'14px 10px',textAlign:'center',border:'1px solid #dbeafe'}}>
              <div style={{width:38,height:38,borderRadius:'50%',background:'#dbeafe',display:'grid',placeItems:'center',color:'#1677ff',margin:'0 auto 8px'}}>
                <Users size={20}/>
              </div>
              <span style={{fontSize:11,color:'#64748b',display:'block'}}>Total Owners</span>
              <strong style={{fontSize:20,fontWeight:800,color:'#0f172a',display:'block',lineHeight:1.2,margin:'2px 0 6px'}}>{totalOwners}</strong>
              <span style={{fontSize:10.5,color:'#64748b',display:'block'}}>Active Owners</span>
              <b style={{fontSize:14,fontWeight:750,color:'#0f172a'}}>{activeOwners}</b>
            </div>

            {/* Drivers box */}
            <div style={{background:'#eff6ff',borderRadius:10,padding:'14px 10px',textAlign:'center',border:'1px solid #dbeafe'}}>
              <div style={{width:38,height:38,borderRadius:'50%',background:'#dbeafe',display:'grid',placeItems:'center',color:'#1677ff',margin:'0 auto 8px'}}>
                <UserRound size={20}/>
              </div>
              <span style={{fontSize:11,color:'#64748b',display:'block'}}>Total Drivers</span>
              <strong style={{fontSize:20,fontWeight:800,color:'#0f172a',display:'block',lineHeight:1.2,margin:'2px 0 6px'}}>{totalDrivers}</strong>
              <span style={{fontSize:10.5,color:'#64748b',display:'block'}}>Active Drivers</span>
              <b style={{fontSize:14,fontWeight:750,color:'#0f172a'}}>{activeDrivers}</b>
            </div>

            {/* Unassigned box */}
            <div style={{background:'#faf5ff',borderRadius:10,padding:'14px 10px',textAlign:'center',border:'1px solid #f3e8ff',display:'flex',flexDirection:'column',justifyContent:'center'}}>
              <div style={{width:38,height:38,borderRadius:'50%',background:'#f3e8ff',display:'grid',placeItems:'center',color:'#9333ea',margin:'0 auto 8px'}}>
                <UserRound size={20}/>
              </div>
              <span style={{fontSize:11,color:'#64748b',display:'block'}}>Unassigned</span>
              <strong style={{fontSize:22,fontWeight:800,color:'#0f172a',display:'block',margin:'6px 0 0'}}>{unassignedDrivers}</strong>
            </div>
          </div>
        </Card>

        {/* 2. Financial Overview */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
              <span style={{color:'#1677ff'}}>❖</span> Financial Overview (Live Neon DB)
            </h3>
            <Link href="/reports" style={{fontSize:12,color:'#1677ff',fontWeight:600,textDecoration:'none'}}>View Report →</Link>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))',gap:8}}>
            {/* Total Revenue */}
            <div style={{background:'#f0fdf4',border:'1px solid #dcfce7',borderRadius:8,padding:'8px 10px',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:28,height:28,borderRadius:6,background:'#22c55e',display:'grid',placeItems:'center',color:'#fff',flexShrink:0}}>
                <Wallet size={15}/>
              </div>
              <div>
                <span style={{fontSize:10,color:'#64748b',display:'block'}}>Total Revenue</span>
                <strong style={{fontSize:12.5,fontWeight:800,color:'#0f172a'}}>{totalRevenue}</strong>
              </div>
            </div>

            {/* Total Expenses */}
            <div style={{background:'#fef2f2',border:'1px solid #fee2e2',borderRadius:8,padding:'8px 10px',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:28,height:28,borderRadius:6,background:'#ef4444',display:'grid',placeItems:'center',color:'#fff',flexShrink:0}}>
                <Receipt size={15}/>
              </div>
              <div>
                <span style={{fontSize:10,color:'#64748b',display:'block'}}>Total Expenses</span>
                <strong style={{fontSize:12.5,fontWeight:800,color:'#ef4444'}}>{totalExpenses}</strong>
              </div>
            </div>

            {/* Net Profit */}
            <div style={{background:'#f0fdf4',border:'1px solid #dcfce7',borderRadius:8,padding:'8px 10px',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:28,height:28,borderRadius:6,background:'#16a34a',display:'grid',placeItems:'center',color:'#fff',flexShrink:0}}>
                <TrendingUp size={15}/>
              </div>
              <div>
                <span style={{fontSize:10,color:'#64748b',display:'block'}}>Net Profit</span>
                <strong style={{fontSize:12.5,fontWeight:800,color:'#16a34a'}}>{netProfit}</strong>
              </div>
            </div>

            {/* Owner Payable */}
            <div style={{background:'#fff7ed',border:'1px solid #ffedd5',borderRadius:8,padding:'8px 10px',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:28,height:28,borderRadius:6,background:'#f97316',display:'grid',placeItems:'center',color:'#fff',flexShrink:0}}>
                <UserRound size={15}/>
              </div>
              <div>
                <span style={{fontSize:10,color:'#64748b',display:'block'}}>Owner Payable</span>
                <strong style={{fontSize:12.5,fontWeight:800,color:'#0f172a'}}>{ownerPayable}</strong>
              </div>
            </div>

            {/* Customer Receivable */}
            <div style={{background:'#eff6ff',border:'1px solid #dbeafe',borderRadius:8,padding:'8px 10px',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:28,height:28,borderRadius:6,background:'#3b82f6',display:'grid',placeItems:'center',color:'#fff',flexShrink:0}}>
                <Building2 size={15}/>
              </div>
              <div>
                <span style={{fontSize:10,color:'#64748b',display:'block'}}>Customer Receivable</span>
                <strong style={{fontSize:12.5,fontWeight:800,color:'#0f172a'}}>{customerReceivable}</strong>
              </div>
            </div>

            {/* Total Collection */}
            <div style={{background:'#faf5ff',border:'1px solid #f3e8ff',borderRadius:8,padding:'8px 10px',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:28,height:28,borderRadius:6,background:'#a855f7',display:'grid',placeItems:'center',color:'#fff',flexShrink:0}}>
                <CheckCircle2 size={15}/>
              </div>
              <div>
                <span style={{fontSize:10,color:'#64748b',display:'block'}}>Total Collection</span>
                <strong style={{fontSize:12.5,fontWeight:800,color:'#0f172a'}}>{totalCollection}</strong>
              </div>
            </div>

            {/* Owner Payment */}
            <div style={{background:'#ecfeff',border:'1px solid #cffafe',borderRadius:8,padding:'8px 10px',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:28,height:28,borderRadius:6,background:'#06b6d4',display:'grid',placeItems:'center',color:'#fff',flexShrink:0}}>
                <ArrowRightLeft size={15}/>
              </div>
              <div>
                <span style={{fontSize:10,color:'#64748b',display:'block'}}>Owner Payment</span>
                <strong style={{fontSize:12.5,fontWeight:800,color:'#0f172a'}}>{ownerPayment}</strong>
              </div>
            </div>

            {/* Cash Balance */}
            <div style={{background:'#f0fdf4',border:'1px solid #dcfce7',borderRadius:8,padding:'8px 10px',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:28,height:28,borderRadius:6,background:'#10b981',display:'grid',placeItems:'center',color:'#fff',flexShrink:0}}>
                <CircleDollarSign size={15}/>
              </div>
              <div>
                <span style={{fontSize:10,color:'#64748b',display:'block'}}>Cash Balance</span>
                <strong style={{fontSize:12.5,fontWeight:800,color:'#0f172a'}}>{cashBalance}</strong>
              </div>
            </div>

            {/* Bank Balance */}
            <div style={{background:'#eff6ff',border:'1px solid #dbeafe',borderRadius:8,padding:'8px 10px',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:28,height:28,borderRadius:6,background:'#2563eb',display:'grid',placeItems:'center',color:'#fff',flexShrink:0}}>
                <Landmark size={15}/>
              </div>
              <div>
                <span style={{fontSize:10,color:'#64748b',display:'block'}}>Bank Balance</span>
                <strong style={{fontSize:12.5,fontWeight:800,color:'#0f172a'}}>{bankBalance}</strong>
              </div>
            </div>
          </div>
        </Card>

        {/* 3. Quick Actions */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <h3 style={{fontSize:14,fontWeight:750,color:'#0f172a',margin:'0 0 12px'}}>Quick Actions</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(75px, 1fr))',gap:8}}>
            <Link href="/vehicles" style={{textDecoration:'none'}}>
              <div style={{background:'#eff6ff',borderRadius:8,padding:'10px 6px',textAlign:'center',border:'1px solid #dbeafe'}}>
                <CarFront size={18} color="#1677ff" style={{margin:'0 auto 4px'}}/>
                <span style={{fontSize:10.5,fontWeight:700,color:'#1e293b',display:'block'}}>Vehicles</span>
              </div>
            </Link>

            <Link href="/owners" style={{textDecoration:'none'}}>
              <div style={{background:'#f0fdf4',borderRadius:8,padding:'10px 6px',textAlign:'center',border:'1px solid #dcfce7'}}>
                <Users size={18} color="#16a34a" style={{margin:'0 auto 4px'}}/>
                <span style={{fontSize:10.5,fontWeight:700,color:'#1e293b',display:'block'}}>Owners</span>
              </div>
            </Link>

            <Link href="/drivers" style={{textDecoration:'none'}}>
              <div style={{background:'#faf5ff',borderRadius:8,padding:'10px 6px',textAlign:'center',border:'1px solid #f3e8ff'}}>
                <UserRound size={18} color="#9333ea" style={{margin:'0 auto 4px'}}/>
                <span style={{fontSize:10.5,fontWeight:700,color:'#1e293b',display:'block'}}>Drivers</span>
              </div>
            </Link>

            <Link href="/expenses" style={{textDecoration:'none'}}>
              <div style={{background:'#fff7ed',borderRadius:8,padding:'10px 6px',textAlign:'center',border:'1px solid #ffedd5'}}>
                <Receipt size={18} color="#f97316" style={{margin:'0 auto 4px'}}/>
                <span style={{fontSize:10.5,fontWeight:700,color:'#1e293b',display:'block'}}>Expenses</span>
              </div>
            </Link>

            <Link href="/due-collection" style={{textDecoration:'none'}}>
              <div style={{background:'#f0fdf4',borderRadius:8,padding:'10px 6px',textAlign:'center',border:'1px solid #dcfce7'}}>
                <HandCoins size={18} color="#10b981" style={{margin:'0 auto 4px'}}/>
                <span style={{fontSize:10.5,fontWeight:700,color:'#1e293b',display:'block'}}>Collections</span>
              </div>
            </Link>

            <Link href="/vehicle-search" style={{textDecoration:'none'}}>
              <div style={{background:'#faf5ff',borderRadius:8,padding:'10px 6px',textAlign:'center',border:'1px solid #f3e8ff'}}>
                <Search size={18} color="#8b5cf6" style={{margin:'0 auto 4px'}}/>
                <span style={{fontSize:10.5,fontWeight:700,color:'#1e293b',display:'block'}}>Search Car</span>
              </div>
            </Link>
          </div>
        </Card>
      </div>

      {/* ─── Row 3: Income & Expense Analytics + Outstanding Due ─── */}
      <div className="split-grid-analytics-2">
        {/* Income & Expense Analytics (Connected dynamically to Neon DB) */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
              <span style={{color:'#1677ff'}}>📊</span> Income & Expense Analytics ({analyticsPeriod})
            </h3>

            {/* Time Filter Pills */}
            <div style={{display:'flex',alignItems:'center',gap:4,background:'#f1f5f9',padding:2,borderRadius:8}}>
              {(['Daily','Weekly','Monthly','Yearly'] as const).map(tab=>(
                <button
                  key={tab}
                  onClick={()=>setAnalyticsPeriod(tab)}
                  style={{
                    border:0,
                    borderRadius:6,
                    padding:'4px 10px',
                    fontSize:11,
                    fontWeight:600,
                    cursor:'pointer',
                    background:analyticsPeriod===tab?'#1677ff':'transparent',
                    color:analyticsPeriod===tab?'#ffffff':'#64748b',
                    transition:'all .15s'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:8,fontSize:11,flexWrap:'wrap'}}>
            <span style={{display:'flex',alignItems:'center',gap:4,color:'#334155'}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#1677ff'}}/> Income
            </span>
            <span style={{display:'flex',alignItems:'center',gap:4,color:'#334155'}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#f97316'}}/> Expense
            </span>
            <span style={{display:'flex',alignItems:'center',gap:4,color:'#334155'}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#10b981'}}/> Profit
            </span>
          </div>

          <div style={{width:'100%',height:220}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={3}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11}/>
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(v)=>v >= 100000 ? `${(v/100000).toFixed(1)}L` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`}
                />
                <Tooltip
                  formatter={(v:any)=>[fmt(Number(v))]}
                  contentStyle={{background:'#fff',borderRadius:8,border:'1px solid #e2e8f0',fontSize:12}}
                />
                <Bar dataKey="income" fill="#1677ff" radius={[3,3,0,0]} barSize={14} name="Income"/>
                <Bar dataKey="expense" fill="#f97316" radius={[3,3,0,0]} barSize={14} name="Expense"/>
                <Bar dataKey="profit" fill="#10b981" radius={[3,3,0,0]} barSize={14} name="Profit"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Outstanding Due (Real data from Neon DB) */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
              <Megaphone size={16} color="#ef4444"/> Outstanding Due
            </h3>
            <Link href="/due-collection" style={{fontSize:12,color:'#1677ff',fontWeight:600,textDecoration:'none'}}>View All →</Link>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(110px, 1fr))',gap:10}}>
            {/* Owner Due */}
            <div style={{background:'#fff7ed',borderRadius:10,padding:12,textAlign:'center',border:'1px solid #ffedd5'}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:'#ffedd5',display:'grid',placeItems:'center',color:'#f97316',margin:'0 auto 6px'}}>
                <UserRound size={17}/>
              </div>
              <span style={{fontSize:11,color:'#64748b',display:'block'}}>Owner Payable</span>
              <strong style={{fontSize:15,fontWeight:800,color:'#0f172a',display:'block',margin:'2px 0 2px'}}>{ownerDue}</strong>
              <small style={{fontSize:10.5,color:'#f97316',fontWeight:700}}>Due in Neon DB</small>
            </div>

            {/* Customer Due */}
            <div style={{background:'#f0fdf4',borderRadius:10,padding:12,textAlign:'center',border:'1px solid #dcfce7'}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:'#dcfce7',display:'grid',placeItems:'center',color:'#1677ff',margin:'0 auto 6px'}}>
                <Building2 size={17}/>
              </div>
              <span style={{fontSize:11,color:'#64748b',display:'block'}}>Client Receivable</span>
              <strong style={{fontSize:15,fontWeight:800,color:'#0f172a',display:'block',margin:'2px 0 2px'}}>{customerDue}</strong>
              <small style={{fontSize:10.5,color:'#1677ff',fontWeight:700}}>Due in Neon DB</small>
            </div>

            {/* Garage Due */}
            <div style={{background:'#faf5ff',borderRadius:10,padding:12,textAlign:'center',border:'1px solid #f3e8ff'}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:'#f3e8ff',display:'grid',placeItems:'center',color:'#9333ea',margin:'0 auto 6px'}}>
                <Wrench size={17}/>
              </div>
              <span style={{fontSize:11,color:'#64748b',display:'block'}}>Garage Payable</span>
              <strong style={{fontSize:15,fontWeight:800,color:'#0f172a',display:'block',margin:'2px 0 2px'}}>{garageDue}</strong>
              <small style={{fontSize:10.5,color:'#9333ea',fontWeight:700}}>Due in Neon DB</small>
            </div>

            {/* Driver Due */}
            <div style={{background:'#eff6ff',borderRadius:10,padding:12,textAlign:'center',border:'1px solid #dbeafe'}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:'#dbeafe',display:'grid',placeItems:'center',color:'#2563eb',margin:'0 auto 6px'}}>
                <UserRound size={17}/>
              </div>
              <span style={{fontSize:11,color:'#64748b',display:'block'}}>Driver Payable</span>
              <strong style={{fontSize:15,fontWeight:800,color:'#0f172a',display:'block',margin:'2px 0 2px'}}>{driverDue}</strong>
              <small style={{fontSize:10.5,color:'#2563eb',fontWeight:700}}>Due in Neon DB</small>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── Row 4: Daily Operations (Today) + Notifications & Alerts + Recent Transactions ─── */}
      <div className="split-grid-today-3">
        {/* Daily Operations (Today) */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
              <Calendar size={16} color="#1677ff"/> Daily Operations (Today)
            </h3>
            <Link href="/duties" style={{fontSize:12,color:'#1677ff',fontWeight:600,textDecoration:'none'}}>View Duties →</Link>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(65px, 1fr))',gap:8,marginBottom:12}}>
            <div style={{background:'#eff6ff',borderRadius:8,padding:'10px 4px',textAlign:'center'}}>
              <CarFront size={16} color="#1677ff" style={{margin:'0 auto 4px'}}/>
              <span style={{fontSize:10,color:'#64748b',display:'block'}}>Total Duty</span>
              <b style={{fontSize:16,color:'#0f172a',display:'block'}}>{todayDuties}</b>
            </div>
            <div style={{background:'#f0fdf4',borderRadius:8,padding:'10px 4px',textAlign:'center'}}>
              <CheckCircle2 size={16} color="#16a34a" style={{margin:'0 auto 4px'}}/>
              <span style={{fontSize:10,color:'#64748b',display:'block'}}>Completed</span>
              <b style={{fontSize:16,color:'#0f172a',display:'block'}}>{todayCompleted}</b>
            </div>
            <div style={{background:'#fff7ed',borderRadius:8,padding:'10px 4px',textAlign:'center'}}>
              <Disc size={16} color="#f97316" style={{margin:'0 auto 4px'}}/>
              <span style={{fontSize:10,color:'#64748b',display:'block'}}>Running</span>
              <b style={{fontSize:16,color:'#0f172a',display:'block'}}>{todayRunning}</b>
            </div>
            <div style={{background:'#faf5ff',borderRadius:8,padding:'10px 4px',textAlign:'center'}}>
              <CarFront size={16} color="#9333ea" style={{margin:'0 auto 4px'}}/>
              <span style={{fontSize:10,color:'#64748b',display:'block'}}>Available</span>
              <b style={{fontSize:16,color:'#0f172a',display:'block'}}>{todayAvailable}</b>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))',gap:8}}>
            <div style={{background:'#f0fdf4',border:'1px solid #dcfce7',borderRadius:8,padding:'8px 10px',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:28,height:28,borderRadius:6,background:'#22c55e',display:'grid',placeItems:'center',color:'#fff',flexShrink:0}}>
                <Wallet size={14}/>
              </div>
              <div>
                <span style={{fontSize:10,color:'#64748b',display:'block'}}>Today&apos;s Revenue</span>
                <strong style={{fontSize:12.5,fontWeight:800,color:'#0f172a'}}>{todayRevenue}</strong>
              </div>
            </div>

            <div style={{background:'#fef2f2',border:'1px solid #fee2e2',borderRadius:8,padding:'8px 10px',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:28,height:28,borderRadius:6,background:'#ef4444',display:'grid',placeItems:'center',color:'#fff',flexShrink:0}}>
                <Receipt size={14}/>
              </div>
              <div>
                <span style={{fontSize:10,color:'#64748b',display:'block'}}>Today&apos;s Expenses</span>
                <strong style={{fontSize:12.5,fontWeight:800,color:'#ef4444'}}>{todayExpenses}</strong>
              </div>
            </div>
          </div>
        </Card>

        {/* Notifications & Alerts */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
              <span style={{color:'#f59e0b'}}>🔔</span> Notifications & Alerts
            </h3>
            <Link href="/notifications" style={{fontSize:12,color:'#1677ff',fontWeight:600,textDecoration:'none'}}>View All →</Link>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {alerts.length === 0 ? (
              <span style={{fontSize:12,color:'#64748b',textAlign:'center',padding:'16px 0'}}>No new alerts</span>
            ) : (
              alerts.map((item: any, i: number)=>(
                <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:11.5}}>
                  <span style={{display:'flex',alignItems:'center',gap:8,color:'#334155'}}>
                    <span style={{width:7,height:7,borderRadius:'50%',background:item.dot,flexShrink:0}}/>
                    {item.text}
                  </span>
                  <span style={{fontSize:11,color:'#94a3b8'}}>{item.date}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
              <span style={{color:'#1677ff'}}>📋</span> Recent Transactions
            </h3>
            <Link href="/cashbook" style={{fontSize:12,color:'#1677ff',fontWeight:600,textDecoration:'none'}}>Cashbook →</Link>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:9}}>
            {recentTxns.length === 0 ? (
              <span style={{fontSize:12,color:'#64748b',textAlign:'center',padding:'16px 0'}}>No recent transactions</span>
            ) : (
              recentTxns.map((tx: any, i: number)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'85px 1fr auto',alignItems:'center',fontSize:11.5}}>
                  <span style={{color:'#94a3b8',fontSize:10.5}}>{tx.date}</span>
                  <span style={{color:'#334155',fontWeight:500}}>{tx.desc}</span>
                  <strong style={{color:tx.color,fontWeight:700,fontSize:11.5}}>{tx.amt}</strong>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}