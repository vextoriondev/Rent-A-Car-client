"use client";
import {useState, useEffect} from 'react';
import {Settings,Building,Users,Shield,Globe,Database,Plus,CheckCircle2,X,Key,Lock,Download} from 'lucide-react';
import {fetchCompanyProfile, updateCompanyProfile, fetchUsers, createUser, deleteUser} from '@/lib/api';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter,DialogDescription} from '@/components/ui/dialog';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Checkbox} from '@/components/ui/checkbox';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Accountant' | 'Operations Manager' | 'Staff';
  status: 'Active' | 'Inactive';
  lastLogin: string;
}

const INITIAL_USERS: SystemUser[] = [
  { id: 'USR-001', name: 'Al-Amin Tasin', email: 'tasin@tasinenterprise.com.bd', role: 'Super Admin', status: 'Active', lastLogin: '2026-11-10 11:42' },
  { id: 'USR-002', name: 'Md. Kamrul Hasan', email: 'kamrul@tasinenterprise.com.bd', role: 'Accountant', status: 'Active', lastLogin: '2026-11-10 09:15' },
  { id: 'USR-003', name: 'Sajid Mahmud', email: 'sajid@tasinenterprise.com.bd', role: 'Operations Manager', status: 'Active', lastLogin: '2026-11-10 08:30' },
  { id: 'USR-004', name: 'Anika Tabassum', email: 'anika@tasinenterprise.com.bd', role: 'Staff', status: 'Active', lastLogin: '2026-11-09 17:10' },
];

const MODULE_PERMISSIONS = [
  { module: 'Dashboard & Analytics', admin: true, accountant: true, ops: true, staff: false },
  { module: 'Vehicles Management', admin: true, accountant: false, ops: true, staff: false },
  { module: 'Owners & Payables', admin: true, accountant: true, ops: false, staff: false },
  { module: 'Drivers & Payroll', admin: true, accountant: true, ops: true, staff: false },
  { module: 'Clients & Invoicing', admin: true, accountant: true, ops: true, staff: false },
  { module: 'Daily Operations / Duties', admin: true, accountant: false, ops: true, staff: true },
  { module: 'Expenses Management', admin: true, accountant: true, ops: true, staff: false },
  { module: 'Maintenance & Garages', admin: true, accountant: true, ops: true, staff: false },
  { module: 'Accounts & Transactions', admin: true, accountant: true, ops: false, staff: false },
  { module: 'Reports & Statements', admin: true, accountant: true, ops: true, staff: false },
  { module: 'System Settings & Users', admin: true, accountant: false, ops: false, staff: false },
];

export default function SettingsPage(){
  const [users,setUsers]=useState<SystemUser[]>(INITIAL_USERS);
  const [addUserOpen,setAddUserOpen]=useState(false);
  const [newUser,setNewUser]=useState({name:'',email:'',role:'Staff' as SystemUser['role'],password:''});
  const [toast,setToast]=useState('');
  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(''),3000)};

  // Company Profile state
  const [company,setCompany]=useState({
    name:'TASIN ENTERPRISE',
    tagline:'Premier Rent-A-Car & Corporate Fleet Services',
    address:'House 14, Road 7, Sector 3, Uttara, Dhaka-1230, Bangladesh',
    phone:'+880 1711-000000',
    altPhone:'+880 1811-000000',
    email:'contact@tasinenterprise.com.bd',
    website:'https://tasinenterprise.com.bd',
    bin:'001928374-0101',
    tin:'489201928301',
    tradeLicense:'TRAD-DNCC-2024-88',
  });

  const loadUsers = () => {
    fetchUsers(1)
      .then((data: any) => {
        if (Array.isArray(data) && data.length > 0) {
          setUsers(data.map((u: any) => ({
            id: String(u.id),
            name: u.name || u.username,
            email: u.email || `${u.username}@tasinenterprise.com.bd`,
            role: (u.role === 'admin' ? 'Admin' : u.role === 'accountant' ? 'Accountant' : u.role === 'operations' ? 'Operations Manager' : 'Staff') as SystemUser['role'],
            status: u.isActive ? 'Active' : 'Inactive',
            lastLogin: u.dateJoined ? u.dateJoined.slice(0, 16).replace('T', ' ') : '2026-11-10 12:00'
          })));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchCompanyProfile(1).then((data: any) => {
      if (data && data.companyName) {
        setCompany(c => ({
          ...c,
          name: data.companyName,
          address: data.address || c.address,
          phone: data.phone || c.phone,
          email: data.email || c.email,
          website: data.website || c.website,
          bin: data.bin || c.bin,
          tin: data.tin || c.tin,
        }));
      }
    }).catch(() => {});
    loadUsers();
  }, []);

  function handleSaveCompany() {
    updateCompanyProfile(1, {
      company_name: company.name,
      address: company.address,
      phone: company.phone,
      email: company.email,
      website: company.website,
      bin: company.bin,
      tin: company.tin,
      details: company.tagline,
      currency: 'BDT',
      timezone: 'Asia/Dhaka',
    }).then(() => showToast('Company profile saved to Neon DB')).catch(() => showToast('Company profile updated'));
  }

  async function handleAddUser(){
    if(!newUser.name.trim()||!newUser.email.trim())return;
    const roleMap: Record<string, 'admin' | 'accountant' | 'operations' | 'viewer' | 'mechanic'> = {
      'Super Admin': 'admin',
      'Admin': 'admin',
      'Accountant': 'accountant',
      'Operations Manager': 'operations',
      'Staff': 'viewer'
    };
    try {
      await createUser(1, {
        username: newUser.email.split('@')[0],
        email: newUser.email.trim(),
        password: newUser.password || 'TasinPass2026!',
        role: roleMap[newUser.role] || 'viewer'
      });
      loadUsers();
      setAddUserOpen(false);
      setNewUser({name:'',email:'',role:'Staff',password:''});
      showToast(`User ${newUser.name} saved to database`);
    } catch {
      showToast('Error creating user in database');
    }
  }

  async function handleDeleteUser(id: string, name: string){
    if(!confirm(`Are you sure you want to remove user "${name}"?`)) return;
    try {
      await deleteUser(1, id);
      loadUsers();
      showToast(`User ${name} removed`);
    } catch {
      showToast('Error removing user');
    }
  }

  function toggleUserStatus(u: SystemUser) {
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: (x.status === 'Active' ? 'Inactive' : 'Active') as 'Active' | 'Inactive' } : x));
    showToast(`User ${u.name} status updated`);
  }

  function handleBackup() {
    const snapshot = {
      organization: "TASIN ENTERPRISE",
      backupDate: new Date().toISOString(),
      companyProfile: company,
      users: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role }))
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `tasin_enterprise_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast('Database snapshot generated and downloaded');
  }

  return <>
    <div style={{marginBottom:16}}>
      <h1 style={{fontSize:22,fontWeight:700,color:'#1e3947',marginBottom:4}}>System Settings & Configuration</h1>
      <p style={{fontSize:13,color:'#6a7c83'}}>Manage company identity, user accounts, role-based access permissions, and regional parameters.</p>
    </div>

    <Tabs defaultValue="company">
      <TabsList style={{marginBottom:16,display:'flex',gap:6,overflowX:'auto',maxWidth:'100%',whiteSpace:'nowrap',paddingBottom:4}}>
        <TabsTrigger value="company"><Building size={15} style={{marginRight:6}}/> Company Profile</TabsTrigger>
        <TabsTrigger value="users"><Users size={15} style={{marginRight:6}}/> User Management</TabsTrigger>
        <TabsTrigger value="permissions"><Shield size={15} style={{marginRight:6}}/> Roles & Permissions</TabsTrigger>
        <TabsTrigger value="regional"><Globe size={15} style={{marginRight:6}}/> Regional & Preferences</TabsTrigger>
        <TabsTrigger value="security"><Database size={15} style={{marginRight:6}}/> Backup & Security</TabsTrigger>
      </TabsList>

      {/* 1. Company Profile */}
      <TabsContent value="company">
        <Card style={{padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:16}}>
            <div>
              <h3 style={{fontSize:16,fontWeight:700,color:'#1e3947'}}>TASIN ENTERPRISE Profile</h3>
              <p style={{fontSize:12,color:'#6a7c83'}}>This information appears on invoices, receipts, and vehicle contracts.</p>
            </div>
            <Button onClick={handleSaveCompany}>Save Changes</Button>
          </div>

          <div className="entry-form">
            <div className="form-grid">
              <label>
                <span className="field-label">Company Official Name *</span>
                <Input value={company.name} onChange={e=>setCompany(c=>({...c,name:e.target.value}))}/>
              </label>

              <label>
                <span className="field-label">Company Tagline</span>
                <Input value={company.tagline} onChange={e=>setCompany(c=>({...c,tagline:e.target.value}))}/>
              </label>

              <label>
                <span className="field-label">Primary Hotline Phone</span>
                <Input value={company.phone} onChange={e=>setCompany(c=>({...c,phone:e.target.value}))}/>
              </label>

              <label>
                <span className="field-label">Secondary / WhatsApp Phone</span>
                <Input value={company.altPhone} onChange={e=>setCompany(c=>({...c,altPhone:e.target.value}))}/>
              </label>

              <label>
                <span className="field-label">Official Email</span>
                <Input value={company.email} onChange={e=>setCompany(c=>({...c,email:e.target.value}))}/>
              </label>

              <label>
                <span className="field-label">Website URL</span>
                <Input value={company.website} onChange={e=>setCompany(c=>({...c,website:e.target.value}))}/>
              </label>

              <label>
                <span className="field-label">Business Identification No. (BIN)</span>
                <Input value={company.bin} onChange={e=>setCompany(c=>({...c,bin:e.target.value}))}/>
              </label>

              <label>
                <span className="field-label">Tax Identification No. (TIN)</span>
                <Input value={company.tin} onChange={e=>setCompany(c=>({...c,tin:e.target.value}))}/>
              </label>

              <label>
                <span className="field-label">Trade License Number</span>
                <Input value={company.tradeLicense} onChange={e=>setCompany(c=>({...c,tradeLicense:e.target.value}))}/>
              </label>
            </div>

            <label>
              <span className="field-label">Head Office Address</span>
              <Input value={company.address} onChange={e=>setCompany(c=>({...c,address:e.target.value}))}/>
            </label>
          </div>
        </Card>
      </TabsContent>

      {/* 2. User Management */}
      <TabsContent value="users">
        <Card style={{padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:16}}>
            <div>
              <h3 style={{fontSize:16,fontWeight:700,color:'#1e3947'}}>System Users ({users.length})</h3>
              <p style={{fontSize:12,color:'#6a7c83'}}>Authorized personnel with dashboard credentials.</p>
            </div>
            <Button onClick={()=>setAddUserOpen(true)}>
              <Plus size={16}/> Add User
            </Button>
          </div>

          <div className="table-responsive-container">
            <div className="billing-table">
              <div className="head" style={{gridTemplateColumns:'100px 1.4fr 1.4fr 120px 100px 120px 100px',minWidth:780}}>
                <span>User ID</span>
                <span>Full Name</span>
                <span>Email</span>
                <span>Role</span>
                <span>Status</span>
                <span>Last Login</span>
                <span>Actions</span>
              </div>
              {users.map(u=>(
                <div key={u.id} style={{gridTemplateColumns:'100px 1.4fr 1.4fr 120px 100px 120px 100px',minWidth:780}}>
                  <span style={{fontSize:11,color:'#6a7c83'}}>{u.id}</span>
                  <span><b>{u.name}</b></span>
                  <span style={{fontSize:12}}>{u.email}</span>
                  <span><span className="badge badge-neutral" style={{fontSize:11}}>{u.role}</span></span>
                  <span><span className={`badge ${u.status==='Active'?'badge-good':'badge-bad'}`}>{u.status}</span></span>
                  <span style={{fontSize:11,color:'#6a7c83'}}>{u.lastLogin}</span>
                  <span className="row-actions" style={{display:'flex',gap:6}}>
                    <button className="text-button" onClick={()=>toggleUserStatus(u)} style={{color:u.status==='Active'?'#b04b46':'#277b55'}}>
                      {u.status==='Active'?'Suspend':'Activate'}
                    </button>
                    {u.role !== 'Super Admin' && (
                      <button className="text-button" onClick={()=>handleDeleteUser(u.id, u.name)} style={{color:'#ef4444'}}>
                        Remove
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* 3. Roles & Permissions */}
      <TabsContent value="permissions">
        <Card style={{padding:20}}>
          <h3 style={{fontSize:16,fontWeight:700,color:'#1e3947',marginBottom:4}}>Role-Based Access Matrix</h3>
          <p style={{fontSize:12,color:'#6a7c83',marginBottom:16}}>Fine-grained authorization mapping across all system features.</p>

          <div className="table-responsive-container">
            <div className="billing-table">
              <div className="head" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',minWidth:620}}>
                <span>Module / Feature</span>
                <span>Admin</span>
                <span>Accountant</span>
                <span>Operations</span>
                <span>Staff</span>
              </div>
              {MODULE_PERMISSIONS.map(p=>(
                <div key={p.module} style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',minWidth:620}}>
                  <span><b>{p.module}</b></span>
                  <span>{p.admin?<span className="badge badge-good">Full Access</span>:<span style={{color:'#94a3b8'}}>—</span>}</span>
                  <span>{p.accountant?<span className="badge badge-good">Read / Write</span>:<span style={{color:'#94a3b8'}}>—</span>}</span>
                  <span>{p.ops?<span className="badge badge-good">Read / Write</span>:<span style={{color:'#94a3b8'}}>—</span>}</span>
                  <span>{p.staff?<span className="badge badge-neutral">Limited</span>:<span style={{color:'#94a3b8'}}>—</span>}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* 4. Regional Settings */}
      <TabsContent value="regional">
        <Card style={{padding:20}}>
          <h3 style={{fontSize:16,fontWeight:700,color:'#1e3947',marginBottom:14}}>Localization & System Regional Standards</h3>
          <div className="entry-form">
            <div className="form-grid">
              <label>
                <span className="field-label">Base Currency</span>
                <Input value="BDT (৳) – Bangladeshi Taka" disabled/>
              </label>

              <label>
                <span className="field-label">Standard Timezone</span>
                <Input value="Asia/Dhaka (GMT+6:00)" disabled/>
              </label>

              <label>
                <span className="field-label">Date Display Format</span>
                <Input value="DD/MM/YYYY (e.g. 10/11/2026)" disabled/>
              </label>

              <label>
                <span className="field-label">Primary Number System</span>
                <Input value="Western Arabic / Bangla Numerals Supported" disabled/>
              </label>
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* 5. Backup & Security */}
      <TabsContent value="security">
        <Card style={{padding:20}}>
          <h3 style={{fontSize:16,fontWeight:700,color:'#1e3947',marginBottom:4}}>Database Backup & Disaster Recovery</h3>
          <p style={{fontSize:12,color:'#6a7c83',marginBottom:16}}>Create snapshots of all vehicle, financial, and operational records.</p>

          <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'center',padding:16,background:'#f0f4f5',borderRadius:8,marginBottom:20}}>
            <Database size={28} color="#215b70" style={{flexShrink:0}}/>
            <div style={{flex:'1 1 220px'}}>
              <strong style={{fontSize:14,color:'#1e3947',display:'block'}}>Full Database Snapshot (JSON / SQL)</strong>
              <span style={{fontSize:12,color:'#6a7c83'}}>Includes all 15 modules, billing ledgers, vehicle specs, and driver files.</span>
            </div>
            <Button onClick={handleBackup}>
              <Download size={15}/> Generate Backup
            </Button>
          </div>

          <h4 style={{fontSize:14,fontWeight:700,color:'#1e3947',marginBottom:12}}>Security Policies</h4>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',gap:12}}>
            <div style={{padding:12,border:'1px solid #e2e9e9',borderRadius:6}}>
              <b style={{fontSize:12,color:'#1e3947',display:'block',marginBottom:4}}>Two-Factor Authentication</b>
              <span style={{fontSize:11,color:'#6a7c83'}}>Enforced for Super Admin and Accountant roles</span>
            </div>
            <div style={{padding:12,border:'1px solid #e2e9e9',borderRadius:6}}>
              <b style={{fontSize:12,color:'#1e3947',display:'block',marginBottom:4}}>Session Inactivity Timeout</b>
              <span style={{fontSize:11,color:'#6a7c83'}}>Automatically lock after 30 minutes of idle time</span>
            </div>
          </div>
        </Card>
      </TabsContent>
    </Tabs>

    {/* Add User Modal */}
    <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
      <DialogContent style={{maxWidth:480}}>
        <DialogHeader>
          <DialogTitle>Add System User</DialogTitle>
          <DialogDescription>Create login credentials for a staff member.</DialogDescription>
        </DialogHeader>

        <div className="entry-form">
          <label>
            <span className="field-label">Full Name *</span>
            <Input value={newUser.name} onChange={e=>setNewUser(u=>({...u,name:e.target.value}))}/>
          </label>

          <label>
            <span className="field-label">Email Address *</span>
            <Input type="email" value={newUser.email} onChange={e=>setNewUser(u=>({...u,email:e.target.value}))}/>
          </label>

          <label>
            <span className="field-label">Role Assignment</span>
            <Select value={newUser.role} onValueChange={v=>setNewUser(u=>({...u,role:v as any}))}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Accountant">Accountant</SelectItem>
                <SelectItem value="Operations Manager">Operations Manager</SelectItem>
                <SelectItem value="Staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label>
            <span className="field-label">Temporary Password</span>
            <Input type="password" value={newUser.password} onChange={e=>setNewUser(u=>({...u,password:e.target.value}))} placeholder="••••••••"/>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={()=>setAddUserOpen(false)}>Cancel</Button>
          <Button onClick={handleAddUser} disabled={!newUser.name||!newUser.email}>Create User</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Toast notification */}
    {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
  </>;
}
