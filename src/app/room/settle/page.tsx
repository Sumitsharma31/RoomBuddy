"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc, getDoc, collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthChange } from '@/lib/auth';
import SettlementBreakdown from '@/components/SettlementBreakdown';

const NAV_ITEMS = [
  { path: '/room', label: 'Feed', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
  { path: '/room/verify', label: 'Verify', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  { path: '/room/settle', label: 'Settle', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  { path: '/room/settings', label: 'Settings', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /> },
];

export default function SettlePage() {
  const [user, setUser] = useState<any>(null);
  const [roomMembers, setRoomMembers] = useState<any[]>([]);
  const [verifiedExpenses, setVerifiedExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [lastSettlement, setLastSettlement] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
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
        else loadRoomData(d.currentRoomId);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadRoomData = (roomId: string) => {
    onSnapshot(collection(db, 'rooms', roomId, 'members'), snap =>
      setRoomMembers(snap.docs.map(d => ({ userId: d.id, ...d.data() }))));
    const q = query(collection(db, 'rooms', roomId, 'expenses'), where('status', '==', 'verified'));
    onSnapshot(q, snap => setVerifiedExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const sq = query(collection(db, 'rooms', roomId, 'settlements'), orderBy('settledAt', 'desc'));
    onSnapshot(sq, snap => {
      if (!snap.empty) setLastSettlement({ id: snap.docs[0].id, ...snap.docs[0].data() });
    });
  };

  const handleSettle = async () => {
    setShowConfirm(false);
    setSettling(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ roomId: user.currentRoomId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to settle'); }
    } catch (e: any) { alert(e.message); } finally { setSettling(false); }
  };

  const calculateLiveBreakdown = () => {
    const paid: Record<string, number> = {};
    roomMembers.forEach(m => paid[m.userId] = 0);
    verifiedExpenses.forEach(e => { paid[e.paidBy] = (paid[e.paidBy] || 0) + e.amount; });
    const total = Object.values(paid).reduce((a, b) => a + b, 0);
    const fairShare = roomMembers.length > 0 ? total / roomMembers.length : 0;
    const breakdown = roomMembers.map(m => ({
      userId: m.userId, name: m.displayName,
      totalPaid: paid[m.userId] || 0, balance: (paid[m.userId] || 0) - fairShare,
    }));
    return { total, fairShare, breakdown };
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="spinner" />
    </div>
  );

  const { total, fairShare, breakdown } = calculateLiveBreakdown();
  const isAdmin = roomMembers.find(m => m.userId === user?.uid)?.role === 'admin';

  return (
    <div className="bg-mesh" style={{ minHeight: '100vh' }}>
      {/* Ambient blob */}
      <div style={{ position: 'fixed', bottom: '-15%', right: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Header */}
      <div className="page-header" style={{ padding: '0.875rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => router.push('/room')}
              style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.5rem', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <span className="logo-text" style={{ fontSize: '1.25rem', display: 'block' }}>Settle Up</span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                {verifiedExpenses.length} verified expense{verifiedExpenses.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Settle Now button — admin only, when there are verified expenses */}
          {isAdmin && verifiedExpenses.length > 0 && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={settling}
              className="btn-primary"
              style={{ padding: '0.5rem 1.125rem', fontSize: '0.875rem', opacity: settling ? 0.6 : 1 }}
            >
              {settling
                ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <svg style={{ animation: 'spin-slow 0.8s linear infinite', width: 14, height: 14 }} viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Settling…
                  </span>
                : '⚡ Settle Now'
              }
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '1.5rem 1.25rem 100px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Last settlement chip */}
        {lastSettlement && (
          <div className="animate-slide-down" style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem',
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
            borderRadius: 'var(--radius)', padding: '0.625rem 1rem',
          }}>
            <svg width="14" height="14" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Last settled{' '}
              <span style={{ fontWeight: 600, color: '#4ade80' }}>
                {new Date(lastSettlement.settledAt?.toDate?.() || lastSettlement.settledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </span>
          </div>
        )}

        {verifiedExpenses.length === 0 ? (
          <div className="animate-fade-up" style={{
            textAlign: 'center', padding: '4rem 1.5rem',
            background: 'var(--bg-card)', border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <div className="animate-float" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>💰</div>
            <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
              Nothing to settle yet
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Verified expenses will appear here once your roommates review them.
            </p>
          </div>
        ) : (
          <SettlementBreakdown
            total={total}
            fairShare={fairShare}
            breakdown={breakdown}
            transfers={lastSettlement?.transfers || []}
          />
        )}

        {/* Non-admin notice */}
        {!isAdmin && verifiedExpenses.length > 0 && (
          <div style={{
            marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem',
            background: 'rgba(124,92,252,0.08)', border: '1px solid rgba(124,92,252,0.15)',
            borderRadius: 'var(--radius)', padding: '0.875rem 1rem',
          }}>
            <svg width="16" height="16" fill="none" stroke="var(--accent-light)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Only the room admin can trigger a settlement.
            </p>
          </div>
        )}
      </div>

      {/* Settle Confirm Modal */}
      {showConfirm && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowConfirm(false)}>
          <div className="modal-panel" style={{ maxWidth: '420px' }}>
            <div style={{ width: '40px', height: '4px', borderRadius: '100px', background: 'var(--border)', margin: '0 auto 1.5rem' }} />
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '60px', height: '60px', borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))',
                marginBottom: '0.875rem',
              }}>
                <svg width="28" height="28" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Settle Up?
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                This will calculate balances from all <strong style={{ color: 'var(--text-primary)' }}>{verifiedExpenses.length} verified expense{verifiedExpenses.length !== 1 ? 's' : ''}</strong> and notify all members with their settlement amounts.
              </p>
            </div>

            {/* Preview total */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--bg-glass)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '0.875rem 1rem', marginBottom: '1.25rem',
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total to split</span>
              <span style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--accent-light)' }}>₹{total.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowConfirm(false)} className="btn-secondary" style={{ flex: 1, padding: '0.875rem' }}>
                Cancel
              </button>
              <button onClick={handleSettle} className="btn-primary"
                style={{
                  flex: 2, padding: '0.875rem', fontSize: '0.9375rem',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
                }}>
                ✅ Confirm Settlement
              </button>
            </div>
          </div>
        </div>
      )}

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
