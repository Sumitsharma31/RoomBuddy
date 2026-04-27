"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc, getDoc, collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthChange } from '@/lib/auth';
import ExpenseCard from '@/components/ExpenseCard';
import NotificationBell from '@/components/NotificationBell';
import VerifyModal from '@/components/VerifyModal';

interface Expense {
  id: string; item: string; amount: number;
  paidBy: string; paidByName: string;
  date: any; status: 'pending' | 'verified' | 'disputed';
  verifications: any[]; createdAt: any;
}
interface RoomMember {
  userId: string; role: 'admin' | 'member';
  displayName: string; photoURL: string | null; joinedAt: any;
}

const NAV_ITEMS = [
  { path: '/room', label: 'Feed', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
  { path: '/room/verify', label: 'Verify', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  { path: '/room/settle', label: 'Settle', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  { path: '/room/settings', label: 'Settings', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /> },
];

export default function RoomDashboard() {
  const [user, setUser] = useState<any>(null);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ item: '', amount: '' });
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'disputed'>('all');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      if (u) await loadUserData(u.uid);
      else router.push('/login');
    });
    return unsub;
  }, []);

  const loadUserData = async (uid: string) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const d = snap.data();
        setUser({ ...d, uid });
        if (!d.currentRoomId) router.push('/');
        else { loadRoomData(d.currentRoomId); loadNotifications(uid); }
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadNotifications = (uid: string) => {
    const q = query(collection(db, 'notifications', uid, 'items'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => setUnreadCount(snap.docs.filter(d => !d.data().read).length));
  };

  const loadRoomData = async (roomId: string) => {
    try {
      const roomDoc = await getDoc(doc(db, 'rooms', roomId));
      if (roomDoc.exists()) setRoomName(roomDoc.data().name || 'Room');
      onSnapshot(collection(db, 'rooms', roomId, 'members'), snap =>
        setRoomMembers(snap.docs.map(d => ({ userId: d.id, ...d.data() })) as any));
      const q = query(collection(db, 'rooms', roomId, 'expenses'), orderBy('createdAt', 'desc'));
      onSnapshot(q, snap =>
        setExpenses(snap.docs.map(d => {
          const data = d.data();
          return { id: d.id, ...data, date: data.date?.toDate?.() || new Date(), createdAt: data.createdAt?.toDate?.() || new Date() };
        }) as any));
    } catch (e) { console.error(e); }
  };

  const handleAddExpense = async () => {
    if (!user || !newExpense.item || !newExpense.amount) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/expense/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ roomId: user.currentRoomId, item: newExpense.item, amount: newExpense.amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add expense');
      setNewExpense({ item: '', amount: '' }); setShowAddExpense(false);
    } catch (e: any) { alert(e.message); }
  };

  const handleVerify = async (expenseId: string, action: 'verified' | 'disputed') => {
    setVerifying(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/expense/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ roomId: user.currentRoomId, expenseId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify');
      setSelectedExpense(null);
    } catch (e: any) { alert(e.message); } finally { setVerifying(false); }
  };

  const filteredExpenses = filter === 'all' ? expenses : expenses.filter(e => e.status === filter);
  const totalPending = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="bg-mesh" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="page-header" style={{ padding: '0.875rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span className="logo-text" style={{ fontSize: '1.25rem', display: 'block' }}>RoomBuddy</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              {roomName} · {roomMembers.length} members
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <NotificationBell unreadCount={unreadCount} onClick={() => router.push('/notifications')} />
            <button onClick={() => auth.signOut()}
              style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.5rem 0.75rem', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 500 }}>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Stat Banner */}
      {totalPending > 0 && (
        <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '600px', margin: '0 auto' }}>
            <svg width="16" height="16" fill="none" stroke="var(--warning)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span style={{ fontSize: '0.8125rem', color: 'var(--warning)', fontWeight: 600 }}>
              ₹{totalPending.toFixed(2)} in pending expenses needs review
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, padding: '1.25rem 1.25rem 100px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        {/* Filter Pills */}
        <div className="hide-scrollbar" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem', marginBottom: '1.25rem' }}>
          {(['all', 'pending', 'verified', 'disputed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                flexShrink: 0, padding: '0.375rem 0.875rem', borderRadius: '100px',
                border: filter === f ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: filter === f ? 'rgba(124,92,252,0.15)' : 'var(--bg-card)',
                color: filter === f ? 'var(--accent-light)' : 'var(--text-muted)',
                fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', transition: 'all 0.2s ease',
                textTransform: 'capitalize',
              }}>
              {f} {f !== 'all' && `(${expenses.filter(e => e.status === f).length})`}
            </button>
          ))}
        </div>

        {/* Expense List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredExpenses.length === 0 ? (
            <div className="animate-fade-up" style={{
              textAlign: 'center', padding: '3.5rem 1.5rem',
              background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>💸</div>
              <p style={{ color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '0.25rem' }}>
                {filter === 'all' ? 'No expenses yet' : `No ${filter} expenses`}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {filter === 'all' && 'Tap the + button to add one!'}
              </p>
            </div>
          ) : (
            filteredExpenses.map((expense, i) => (
              <div key={expense.id} style={{ animationDelay: `${i * 0.05}s` }}>
                <ExpenseCard 
                  expense={expense} 
                  currentUser={user} 
                  roomMembers={roomMembers}
                  onVerify={() => setSelectedExpense(expense)} 
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => setShowAddExpense(true)} className="fab"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowAddExpense(false)}>
          <div className="modal-panel">
            <div style={{ width: '40px', height: '4px', borderRadius: '100px', background: 'var(--border)', margin: '0 auto 1.5rem' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(124,92,252,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" fill="none" stroke="var(--accent-light)" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)' }}>Add Expense</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Split with your roommates</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>What was it for?</label>
                <input type="text" value={newExpense.item} onChange={e => setNewExpense({ ...newExpense, item: e.target.value })}
                  className="input-field" placeholder="e.g., Groceries, Electricity…" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Amount (₹)</label>
                <input type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="input-field" placeholder="0.00" min="0" step="0.01" />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.25rem' }}>
                <button onClick={() => setShowAddExpense(false)} className="btn-secondary" style={{ flex: 1, padding: '0.875rem' }}>Cancel</button>
                <button onClick={handleAddExpense} className="btn-primary" style={{ flex: 2, padding: '0.875rem', fontSize: '1rem' }}>
                  Add Expense 💸
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verify Modal */}
      <VerifyModal expense={selectedExpense} onClose={() => setSelectedExpense(null)} onAction={handleVerify} loading={verifying} />

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(item => (
          <button key={item.path} onClick={() => router.push(item.path)}
            className={`nav-item ${pathname === item.path ? 'active' : ''}`}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">{item.icon}</svg>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}