"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthChange } from '@/lib/auth';
import ExpenseCard from '@/components/ExpenseCard';
import VerifyModal from '@/components/VerifyModal';

const NAV_ITEMS = [
  { path: '/room', label: 'Feed', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
  { path: '/room/verify', label: 'Verify', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  { path: '/room/settle', label: 'Settle', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  { path: '/room/settings', label: 'Settings', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /> },
];

export default function VerifyPage() {
  const [user, setUser] = useState<any>(null);
  const [pendingExpenses, setPendingExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
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
        else loadPendingExpenses(d.currentRoomId, uid);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadPendingExpenses = (roomId: string, uid: string) => {
    const q = query(collection(db, 'rooms', roomId, 'expenses'), where('status', '==', 'pending'));
    return onSnapshot(q, snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data(), date: d.data().date?.toDate() || new Date() }))
        .filter((e: any) => e.paidBy !== uid && !e.verifications?.some((v: any) => v.userId === uid));
      setPendingExpenses(list);
    });
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
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to verify'); }
      setSelectedExpense(null);
    } catch (e: any) { alert(e.message); } finally { setVerifying(false); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="bg-mesh" style={{ minHeight: '100vh' }}>
      {/* Ambient blobs */}
      <div style={{ position: 'fixed', top: '-10%', right: '-5%', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,252,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Header */}
      <div className="page-header" style={{ padding: '0.875rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => router.push('/room')}
            style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.5rem', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <span className="logo-text" style={{ fontSize: '1.25rem', display: 'block' }}>Verify</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>Review pending expenses</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '1.5rem 1.25rem 100px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Count banner */}
        {pendingExpenses.length > 0 && (
          <div className="animate-slide-down" style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', marginBottom: '1.25rem',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '12px',
              background: 'rgba(245,158,11,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="20" height="20" fill="none" stroke="#f59e0b" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.9375rem' }}>
                {pendingExpenses.length} expense{pendingExpenses.length !== 1 ? 's' : ''} awaiting your review
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Tap any card to verify or dispute</p>
            </div>
          </div>
        )}

        {/* Expense List */}
        {pendingExpenses.length === 0 ? (
          <div className="animate-fade-up" style={{
            textAlign: 'center', padding: '4rem 1.5rem',
            background: 'var(--bg-card)', border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <div className="animate-float" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
            <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
              All caught up!
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No expenses waiting for your review right now.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pendingExpenses.map((expense, i) => (
              <div key={expense.id} style={{ animationDelay: `${i * 0.05}s` }}>
                <ExpenseCard
                  expense={expense}
                  currentUser={user}
                  onVerify={() => setSelectedExpense(expense)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verify Modal */}
      <VerifyModal
        expense={selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onAction={handleVerify}
        loading={verifying}
      />

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
