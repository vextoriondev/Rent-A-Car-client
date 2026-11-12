"use client";
import {useState, useEffect, useMemo} from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  RotateCcw,
  Shield,
  CreditCard,
  Wrench,
  Search,
  Check,
  X
} from 'lucide-react';
import {fetchSystemAlerts, markAlertRead} from '@/lib/api';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';

export default function NotificationsPage(){
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [readFilter, setReadFilter] = useState('All');
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetchSystemAlerts(1);
      if (Array.isArray(res)) {
        setAlerts(res);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleMarkRead = async (id: number | string) => {
    try {
      await markAlertRead(1, id);
      setAlerts(prev => prev.map(a => a.id === String(id) ? { ...a, isRead: true } : a));
      showToast('Notification marked as read');
    } catch {
      showToast('Error marking notification read');
    }
  };

  const handleMarkAllRead = async () => {
    const unread = alerts.filter(a => !a.isRead);
    await Promise.all(unread.map(a => markAlertRead(1, a.id).catch(() => {})));
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    showToast('All notifications marked as read');
  };

  const filtered = useMemo(() => {
    return alerts.filter(a => {
      const qLower = q.toLowerCase();
      const matchQ = !q || a.title?.toLowerCase().includes(qLower) || a.detail?.toLowerCase().includes(qLower);
      const matchType = typeFilter === 'All' || a.type === typeFilter;
      const matchRead = readFilter === 'All' || (readFilter === 'Unread' ? !a.isRead : a.isRead);
      return matchQ && matchType && matchRead;
    });
  }, [alerts, q, typeFilter, readFilter]);

  const unreadCount = alerts.filter(a => !a.isRead).length;
  const dangerCount = alerts.filter(a => a.severity === 'danger' || a.severity === 'error').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* ─── Header ─── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:46,height:46,borderRadius:12,background:'#e6f0ff',display:'grid',placeItems:'center',color:'#1677ff'}}>
            <Bell size={26}/>
          </div>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:'#0f172a',margin:0,lineHeight:1.2}}>System Notifications & Expiry Alerts</h1>
            <p style={{fontSize:12.5,color:'#64748b',margin:'2px 0 0'}}>Real-time alerts for document expiry, driver license validity, and due payment reminders from Neon DB</p>
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <Button variant="outline" onClick={loadAlerts} style={{display:'flex',alignItems:'center',gap:6}}>
            <RotateCcw size={14}/> Refresh Alerts
          </Button>
          <Button variant="outline" disabled={unreadCount === 0} onClick={handleMarkAllRead} style={{display:'flex',alignItems:'center',gap:6}}>
            <Check size={14}/> Mark All Read ({unreadCount})
          </Button>
        </div>
      </div>

      {/* ─── Summary KPIs ─── */}
      <div className="kpi-grid-4">
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:48,height:48,borderRadius:10,background:'#e6f0ff',display:'grid',placeItems:'center',color:'#1677ff',flexShrink:0}}>
            <Bell size={26}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Total System Alerts</span>
            <strong style={{fontSize:26,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{alerts.length}</strong>
          </div>
        </Card>

        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:48,height:48,borderRadius:10,background:'#fee4e2',display:'grid',placeItems:'center',color:'#ef4444',flexShrink:0}}>
            <AlertTriangle size={26}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Critical / Expired</span>
            <strong style={{fontSize:26,fontWeight:800,color:'#ef4444',display:'block',marginTop:2}}>{dangerCount}</strong>
          </div>
        </Card>

        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:48,height:48,borderRadius:10,background:'#fff3e6',display:'grid',placeItems:'center',color:'#f79009',flexShrink:0}}>
            <Clock size={26}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Expiring Soon (30 Days)</span>
            <strong style={{fontSize:26,fontWeight:800,color:'#f79009',display:'block',marginTop:2}}>{warningCount}</strong>
          </div>
        </Card>

        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:48,height:48,borderRadius:10,background:'#e6f9f0',display:'grid',placeItems:'center',color:'#12b76a',flexShrink:0}}>
            <CheckCircle2 size={26}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Unread Notifications</span>
            <strong style={{fontSize:26,fontWeight:800,color:'#12b76a',display:'block',marginTop:2}}>{unreadCount}</strong>
          </div>
        </Card>
      </div>

      {/* ─── Alerts Filter Toolbar & List ─── */}
      <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10}}>
          <div style={{position:'relative',width:260}}>
            <Input
              placeholder="Search notifications..."
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{height:36,fontSize:12,paddingLeft:32}}
            />
            <Search size={14} style={{position:'absolute',left:10,top:11,color:'#94a3b8'}}/>
          </div>

          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger style={{height:36,fontSize:12,width:140}}><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                <SelectItem value="document">Vehicle Paper Expiry</SelectItem>
                <SelectItem value="payment">Due Payment</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="custom">General Alerts</SelectItem>
              </SelectContent>
            </Select>

            <Select value={readFilter} onValueChange={setReadFilter}>
              <SelectTrigger style={{height:36,fontSize:12,width:120}}><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Unread">Unread Only</SelectItem>
                <SelectItem value="Read">Read Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Alerts List */}
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {filtered.length === 0 ? (
            <div style={{padding:'36px 12px',textAlign:'center',color:'#94a3b8'}}>
              <CheckCircle2 size={36} style={{margin:'0 auto 10px',color:'#cbd5e1'}}/>
              <strong style={{fontSize:14,color:'#475569',display:'block'}}>All caught up!</strong>
              <span style={{fontSize:12}}>No matching notifications or expiry alerts.</span>
            </div>
          ) : (
            filtered.map((a, i) => (
              <div
                key={a.id || i}
                style={{
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'space-between',
                  padding:'12px 16px',
                  borderRadius:10,
                  background: a.isRead ? '#f8fafc' : a.severity === 'danger' ? '#fef2f2' : a.severity === 'warning' ? '#fffbeb' : '#eff6ff',
                  border: '1px solid',
                  borderColor: a.isRead ? '#e2e8f0' : a.severity === 'danger' ? '#fca5a5' : a.severity === 'warning' ? '#fde68a' : '#bfdbfe',
                  gap: 12
                }}
              >
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{
                    width:38,
                    height:38,
                    borderRadius:8,
                    background: a.severity === 'danger' ? '#ef4444' : a.severity === 'warning' ? '#f59e0b' : '#3b82f6',
                    display:'grid',
                    placeItems:'center',
                    color:'#fff',
                    flexShrink:0
                  }}>
                    {a.type === 'document' ? <Shield size={18}/> : a.type === 'payment' ? <CreditCard size={18}/> : <Bell size={18}/>}
                  </div>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <strong style={{fontSize:13,color:'#0f172a'}}>{a.title}</strong>
                      {!a.isRead && (
                        <span style={{background:'#1677ff',color:'#fff',fontSize:10,padding:'1px 6px',borderRadius:4,fontWeight:700}}>NEW</span>
                      )}
                    </div>
                    <p style={{fontSize:12,color:'#475569',margin:'2px 0 0'}}>{a.detail}</p>
                    <span style={{fontSize:11,color:'#94a3b8',marginTop:4,display:'inline-block'}}>
                      Date: {a.date} {a.dueDate ? `• Due Date: ${a.dueDate}` : ''}
                    </span>
                  </div>
                </div>

                {!a.isRead && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkRead(a.id)}
                    style={{fontSize:11,height:28}}
                  >
                    Mark as Read
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Toast notification */}
      {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
    </div>
  );
}
