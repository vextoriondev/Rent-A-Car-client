"use client";
import {Fragment,Suspense,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  CarFront,
  UserRound,
  UsersRound,
  CalendarDays,
  ReceiptText,
  Wrench,
  FileSignature,
  BookOpen,
  CircleDollarSign,
  Search,
  ChartNoAxesCombined,
  Bell,
  Settings2,
  Menu,
  X,
  LogOut,
  Calendar,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import {RentflowStoreProvider,useRentflowStore} from '@/lib/store-context';
import {useBackendStatus} from '@/lib/use-backend-status';
import {SourceDrawer} from '@/components/shared/source-drawer';
import {RecordEntryDialog} from '@/components/features/entries/record-entry-dialog';
import {NewAgreementDialog} from '@/components/features/agreements/new-agreement-dialog';
import {LoadingState} from '@/components/shared/loading-state';

export default function DashboardLayout({children}:{children:React.ReactNode}){
  return (
    <Suspense fallback={<div className="app-shell"><div className="main-shell"><main className="content"><LoadingState/></main></div></div>}>
      <RentflowStoreProvider>
        <DashboardShell>{children}</DashboardShell>
      </RentflowStoreProvider>
    </Suspense>
  );
}

const MENU_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Owners', href: '/owners', icon: Building2 },
  { label: 'Vehicles', href: '/vehicles', icon: CarFront },
  { label: 'Drivers', href: '/drivers', icon: UserRound },
  { label: 'Clients & Companies', href: '/customers', icon: UsersRound },
  { label: 'Daily Operations', href: '/duties', icon: CalendarDays },
  { label: 'Daily Expenses', href: '/expenses', icon: ReceiptText },
  { label: 'Maintenance & Garage', href: '/maintenance', icon: Wrench },
  { label: 'Agreements & Documents', href: '/documents', icon: FileSignature },
  { label: 'Accounts & Transactions', href: '/cashbook', icon: BookOpen },
  { label: 'Due & Collection', href: '/due-collection', icon: CircleDollarSign },
  { label: 'Vehicle Search', href: '/vehicle-search', icon: Search },
  { label: 'Reports & Analytics', href: '/reports', icon: ChartNoAxesCombined },
  { label: 'Notifications & Alerts', href: '/notifications', icon: Bell, badge: '3' },
  { label: 'System Settings', href: '/settings', icon: Settings2 },
];

function DashboardShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const router=useRouter();
  const [mobileMenu,setMobileMenu]=useState(false);
  const {isConnected}=useBackendStatus();
  const rf=useRentflowStore();
  const {store,ready,toast,setToast}=rf;

  if(!ready)return <div className="app-shell"><div className="main-shell"><main className="content"><LoadingState/></main></div></div>;

  return (
    <div className="app-shell">
      {/* Mobile Backdrop overlay */}
      {mobileMenu && (
        <div
          className="mobile-backdrop"
          onClick={() => setMobileMenu(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar matching screenshot */}
      <aside className={'sidebar '+(mobileMenu?'mobile-open':'')}>
        {/* Brand Logo Header */}
        <div className="brand" style={{display:'flex',alignItems:'center',gap:12,padding:'0 18px',height:80}}>
          <div style={{width:44,height:44,borderRadius:10,background:'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)',display:'grid',placeItems:'center',flexShrink:0,boxShadow:'0 2px 8px rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.15)'}}>
            <CarFront size={26} color="#ffffff"/>
          </div>
          <div>
            <div className="brand-title" style={{fontSize:15,fontWeight:800,letterSpacing:'-0.02em',color:'#fff',lineHeight:1.15}}>
              TASIN ENTERPRISE
            </div>
            <div className="brand-sub" style={{fontSize:10,color:'#93c5fd',letterSpacing:'0.04em',marginTop:2}}>
              Rent-a-Car Solution
            </div>
          </div>
          <button aria-label="Close menu" className="mobile-close" onClick={()=>setMobileMenu(false)} style={{marginLeft:'auto'}}>
            <X size={20}/>
          </button>
        </div>

        {/* Navigation Items */}
        <nav aria-label="Main navigation" style={{padding:'12px 10px',flex:1,overflowY:'auto'}}>
          {MENU_ITEMS.map((item)=>{
            const Icon=item.icon;
            const isActive=pathname===item.href||(item.href!=='/'&&pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={'nav-link '+(isActive?'active':'')}
                onClick={()=>setMobileMenu(false)}
                style={{
                  display:'flex',
                  alignItems:'center',
                  gap:12,
                  height:40,
                  borderRadius:8,
                  padding:'0 14px',
                  marginBottom:3,
                  fontSize:12.5,
                  fontWeight:isActive?700:500,
                  color:isActive?'#ffffff':'#cbd5e1',
                  background:isActive?'#1677ff':'transparent',
                  boxShadow:isActive?'0 4px 12px rgba(22,119,255,0.35)':'none',
                  textDecoration:'none',
                }}
              >
                <Icon size={18} color={isActive?'#ffffff':'#94a3b8'}/>
                <span style={{flex:1}}>{item.label}</span>
                {item.badge&&(
                  <span style={{
                    background:'#ef4444',
                    color:'#ffffff',
                    fontSize:10,
                    fontWeight:700,
                    borderRadius:'999px',
                    padding:'1px 6px',
                    lineHeight:1.4
                  }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Profile */}
        <div style={{borderTop:'1px solid #1e3557',padding:'12px 16px',background:'#0a192f'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <div style={{
              width:38,
              height:38,
              borderRadius:'50%',
              background:'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display:'grid',
              placeItems:'center',
              color:'#ffffff',
              fontWeight:700,
              fontSize:13,
              border:'2px solid #60a5fa'
            }}>
              TA
            </div>
            <div style={{flex:1}}>
              <strong style={{fontSize:13,color:'#ffffff',display:'block',lineHeight:1.2}}>Admin</strong>
              <small style={{fontSize:11,color:'#94a3b8',display:'block'}}>Super Admin</small>
            </div>
            <ChevronDown size={14} color="#94a3b8"/>
          </div>

          <button
            onClick={()=>router.push('/login')}
            className="sidebar-logout"
            style={{
              padding:'6px 0',
              display:'flex',
              alignItems:'center',
              gap:8,
              color:'#94a3b8',
              fontSize:12,
              fontWeight:600,
              background:'none',
              border:0,
              cursor:'pointer',
            }}
          >
            <LogOut size={14}/> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-shell" style={{background:'#f0f4f9'}}>
        {/* Topbar matching screenshot */}
        <header className="topbar">
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <button className="menu-button" onClick={()=>setMobileMenu(true)} aria-label="Open menu">
              <Menu size={20}/>
            </button>
            <div className="topbar-title">
              <h2 style={{fontWeight:800,color:'#0f172a',margin:0,lineHeight:1.2,letterSpacing:'-0.02em'}}>
                TASIN ENTERPRISE
              </h2>
              <p className="topbar-subtitle" style={{fontSize:11.5,color:'#64748b',margin:'2px 0 0',fontWeight:500}}>
                Rent-a-Car Management System
              </p>
            </div>
          </div>

          <div style={{display:'flex',alignItems:'center',gap:10}}>
            {/* Backend Live Connection Status */}
            <div
              title={isConnected ? 'Backend API is connected & live' : 'Running in demo mode (backend offline)'}
              style={{
                display:'inline-flex',
                alignItems:'center',
                gap:6,
                padding:'4px 9px',
                borderRadius:20,
                fontSize:11.5,
                fontWeight:700,
                background:isConnected ? '#ecfdf5' : '#fef3c7',
                color:isConnected ? '#059669' : '#d97706',
                border:isConnected ? '1px solid #a7f3d0' : '1px solid #fde68a',
              }}
            >
              <span style={{
                width:7,
                height:7,
                borderRadius:'50%',
                background:isConnected ? '#10b981' : '#f59e0b',
                boxShadow:isConnected ? '0 0 6px #10b981' : 'none',
              }}/>
              <span className="topbar-badge-text">{isConnected ? 'Backend Live' : 'Demo Mode'}</span>
            </div>

            {/* Date Pill Selector */}
            <div className="date-pill topbar-date-pill">
              <Calendar size={15} color="#64748b"/>
              <span>November 2026</span>
              <ChevronDown size={14} color="#64748b"/>
            </div>

            {/* Notification Bell with Badge */}
            <button
              onClick={()=>router.push('/notifications')}
              className="bell-btn"
              aria-label="Notifications"
            >
              <Bell size={17}/>
              <span className="bell-badge">
                3
              </span>
            </button>

            {/* User Avatar Circle */}
            <div
              onClick={()=>router.push('/settings')}
              className="user-avatar-circle"
              style={{
                width:36,
                height:36,
                borderRadius:'50%',
                background:'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display:'grid',
                placeItems:'center',
                color:'#ffffff',
                fontWeight:700,
                fontSize:12,
                border:'2px solid #1677ff',
                cursor:'pointer',
                flexShrink:0
              }}
              title="Admin Profile"
            >
              TA
            </div>
          </div>
        </header>

        {/* Content Shell */}
        <main className="content" style={{maxWidth:1700,margin:'0 auto'}}>
          {children}
        </main>
      </div>

      <SourceDrawer/>
      <RecordEntryDialog/>
      <NewAgreementDialog/>

      {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
    </div>
  );
}
