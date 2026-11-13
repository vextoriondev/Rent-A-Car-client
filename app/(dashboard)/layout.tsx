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
  CheckCircle2,
  Command,
  ArrowRight
} from 'lucide-react';
import {RentflowStoreProvider,useRentflowStore} from '@/lib/store-context';
import {useBackendStatus} from '@/lib/use-backend-status';
import {SourceDrawer} from '@/components/shared/source-drawer';
import {RecordEntryDialog} from '@/components/features/entries/record-entry-dialog';
import {NewAgreementDialog} from '@/components/features/agreements/new-agreement-dialog';
import {LoadingState} from '@/components/shared/loading-state';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {fetchUserPermissions, searchVehicles} from '@/lib/api';
import {navItems, routeAllowed} from '@/lib/nav';

export default function DashboardLayout({children}:{children:React.ReactNode}){
  return (
    <Suspense fallback={<div className="app-shell"><div className="main-shell"><main className="content"><LoadingState/></main></div></div>}>
      <RentflowStoreProvider>
        <DashboardShell>{children}</DashboardShell>
      </RentflowStoreProvider>
    </Suspense>
  );
}

function DashboardShell({children}:{children:React.ReactNode}){
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenu, setMobileMenu] = useState(false);
  const {isConnected} = useBackendStatus();
  const rf = useRentflowStore();
  const {store, ready, toast, setToast} = rf;

  // RBAC User info
  const [userRole, setUserRole] = useState('super_admin');
  const [roleTitle, setRoleTitle] = useState('Super Admin');
  const [username, setUsername] = useState('Admin');

  // Global Ctrl+K Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    fetchUserPermissions(1).then((res: any) => {
      if (res && res.role) {
        setUserRole(res.role);
        setRoleTitle(res.role_title || res.role);
        setUsername(res.username || 'Admin');
      }
    }).catch(() => {});
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search execution
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    searchVehicles(1, q).then((data: any) => {
      if (Array.isArray(data)) {
        setSearchResults(data.slice(0, 8).map(v => ({
          type: 'Vehicle',
          title: v.registration || v.regNo,
          subtitle: `${v.brand || ''} ${v.model || ''} • Owner: ${v.owner || 'Company'}`,
          href: `/vehicle-search?q=${v.registration || v.regNo}`
        })));
      }
    }).catch(() => {});
  }, [searchQuery]);

  if (!ready) return <div className="app-shell"><div className="main-shell"><main className="content"><LoadingState/></main></div></div>;

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

      {/* Sidebar */}
      <aside className={'sidebar ' + (mobileMenu ? 'mobile-open' : '')}>
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

        {/* Sidebar Nav filtered by RBAC */}
        <nav style={{padding:'12px 10px',flex:1,overflowY:'auto'}}>
          {navItems.filter(item => routeAllowed(item.href, userRole)).map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
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
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'}/>
                <span style={{flex:1}}>{item.label}</span>
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
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div style={{flex:1}}>
              <strong style={{fontSize:13,color:'#ffffff',display:'block',lineHeight:1.2}}>{username}</strong>
              <small style={{fontSize:11,color:'#94a3b8',display:'block'}}>{roleTitle}</small>
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
        {/* Topbar */}
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
            {/* Global Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              style={{
                display:'flex',
                alignItems:'center',
                gap:8,
                background:'#ffffff',
                border:'1px solid #cbd5e1',
                borderRadius:8,
                padding:'6px 12px',
                fontSize:12,
                color:'#64748b',
                cursor:'pointer'
              }}
            >
              <Search size={14} color="#64748b"/>
              <span className="hidden sm:inline">Search anything...</span>
              <kbd style={{fontSize:10,background:'#f1f5f9',padding:'1px 5px',borderRadius:4,border:'1px solid #cbd5e1'}}>Ctrl K</kbd>
            </button>

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

            {/* Notification Bell with Badge */}
            <button
              onClick={()=>router.push('/notifications')}
              className="bell-btn"
              aria-label="Notifications"
            >
              <Bell size={17}/>
              <span className="bell-badge">3</span>
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
              title={`${username} (${roleTitle})`}
            >
              {username.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content Shell */}
        <main className="content" style={{maxWidth:1700,margin:'0 auto'}}>
          {children}
        </main>
      </div>

      {/* Global Omni-Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent style={{maxWidth:540,padding:16}}>
          <DialogHeader>
            <DialogTitle style={{display:'flex',alignItems:'center',gap:8}}>
              <Search size={18} color="#1677ff"/> Global Search (Vehicles, Parties, Invoices)
            </DialogTitle>
          </DialogHeader>

          <Input
            autoFocus
            placeholder="Type registration, client, owner, driver name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{fontSize:14,height:40}}
          />

          <div style={{marginTop:12,maxHeight:300,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
            {searchResults.map((r, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSearchOpen(false);
                  router.push(r.href);
                }}
                style={{
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'space-between',
                  padding:'8px 12px',
                  background:'#f8fafc',
                  borderRadius:8,
                  cursor:'pointer',
                  border:'1px solid #e2e8f0'
                }}
              >
                <div>
                  <span style={{fontSize:10,fontWeight:700,color:'#1677ff',textTransform:'uppercase'}}>{r.type}</span>
                  <strong style={{fontSize:13,color:'#0f172a',display:'block'}}>{r.title}</strong>
                  <small style={{fontSize:11,color:'#64748b'}}>{r.subtitle}</small>
                </div>
                <ArrowRight size={14} color="#94a3b8"/>
              </div>
            ))}
            {searchQuery && searchResults.length === 0 && (
              <p style={{textAlign:'center',color:'#94a3b8',fontSize:12,padding:12}}>
                No records matching "{searchQuery}"
              </p>
            )}
            {!searchQuery && (
              <div style={{padding:'8px 4px',fontSize:11,color:'#94a3b8'}}>
                Quick navigation: Type <b>DHA-METRO</b> for vehicles, or <b>Square</b> for clients.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SourceDrawer/>
      <RecordEntryDialog/>
      <NewAgreementDialog/>

      {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
    </div>
  );
}
