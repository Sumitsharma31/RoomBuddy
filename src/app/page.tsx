"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthChange } from '@/lib/auth';

interface User {
  uid: string; name: string; email: string;
  photoURL: string | null; currentRoomId: string | null;
  fcmToken: string | null; createdAt: any;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthChange((u) => {
      if (u) {
        getUserData(u.uid);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const getUserData = async (uid: string) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = snap.data() as User;
        setUser({ ...data, uid });
        if (data.currentRoomId) router.push('/room');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) { setError('Room name is required'); return; }
    setCreatingRoom(true); setError('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No auth token found');
      const res = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: roomName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room');
      router.push('/room');
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length !== 6) { setError('Please enter a valid 6-character room code'); return; }
    setJoiningRoom(true); setError('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No auth token found');
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: roomCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join room');
      router.push('/room');
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
    } finally {
      setJoiningRoom(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="spinner" />
    </div>
  );

  // Landing Page for Unauthenticated Users
  if (!user) {
    return (
      <div className="bg-mesh" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
        {/* Decorative blobs */}
        <div style={{ position: 'fixed', top: '-20%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,252,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'fixed', bottom: '-20%', left: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(252,92,125,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="animate-fade-up" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <div className="animate-float" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '96px', height: '96px', borderRadius: '32px',
            background: 'linear-gradient(135deg, #7c5cfc, #fc5c7d)',
            boxShadow: '0 0 60px rgba(124,92,252,0.4)', marginBottom: '2rem',
          }}>
            <svg width="48" height="48" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          
          <h1 className="logo-text" style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-0.04em' }}>
            RoomBuddy
          </h1>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>
            The smartest way to split expenses with your roommates. Track, verify, and settle balances effortlessly.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <button onClick={() => router.push('/login')} className="btn-primary" style={{ width: '100%', maxWidth: '320px', padding: '1.125rem', fontSize: '1.125rem', borderRadius: '100px' }}>
              Get Started
            </button>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Free forever. No credit card required.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const firstLetter = user?.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="bg-mesh" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Background decor */}
      <div style={{ position: 'fixed', top: '-15%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,252,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-20%', left: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(252,92,125,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Header */}
      <div className="page-header" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="logo-text" style={{ fontSize: '1.375rem' }}>RoomBuddy</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.8125rem' }}>{firstLetter}</div>
            <button onClick={() => auth.signOut()}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '2rem 1.25rem 3rem', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
        {/* Hero Section */}
        <div className="animate-fade-up" style={{ textAlign: 'center', marginBottom: '2.5rem', paddingTop: '0.5rem' }}>
          <div className="animate-float" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '80px', height: '80px', borderRadius: '28px',
            background: 'linear-gradient(135deg, #7c5cfc, #fc5c7d)',
            boxShadow: '0 0 50px rgba(124,92,252,0.4)', marginBottom: '1.5rem',
          }}>
            <svg width="42" height="42" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.75rem', lineHeight: 1.2 }}>
            Hi {user?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
            Create a new room or join an existing one to start splitting expenses with your roommates.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="animate-fade-up" style={{
          display: 'flex', background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          padding: '0.25rem', marginBottom: '1.5rem',
          animationDelay: '0.1s'
        }}>
          {(['create', 'join'] as const).map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setError(''); }}
              style={{
                flex: 1, padding: '0.75rem', borderRadius: '0.875rem',
                border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9375rem',
                transition: 'all 0.2s ease',
                background: activeTab === tab ? 'linear-gradient(135deg, var(--accent), var(--accent-light))' : 'transparent',
                color: activeTab === tab ? 'white' : 'var(--text-muted)',
                boxShadow: activeTab === tab ? '0 2px 12px var(--accent-glow)' : 'none',
              }}>
              {tab === 'create' ? '🏠 Create Room' : '🔑 Join Room'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* Create Room Form */}
        {activeTab === 'create' && (
          <div className="animate-scale-in" style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '1.5rem',
          }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(124,92,252,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" fill="none" stroke="var(--accent-light)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h2 style={{ fontWeight: 700, fontSize: '1.0625rem' }}>Create New Room</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>You'll become the admin</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Room Name
                </label>
                <input
                  type="text" value={roomName} onChange={e => setRoomName(e.target.value)}
                  className="input-field" placeholder="e.g., Downtown Apartment" required
                />
              </div>
              <button type="submit" disabled={creatingRoom} className="btn-primary" style={{ width: '100%', padding: '0.9375rem', fontSize: '1rem' }}>
                {creatingRoom
                  ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <svg style={{ animation: 'spin-slow 0.8s linear infinite', width: 18, height: 18 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" /><path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" /></svg>
                      Creating...
                    </span>
                  : 'Create Room ✨'
                }
              </button>
            </form>
          </div>
        )}

        {/* Join Room Form */}
        {activeTab === 'join' && (
          <div className="animate-scale-in" style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '1.5rem',
          }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h2 style={{ fontWeight: 700, fontSize: '1.0625rem' }}>Join Existing Room</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Enter the 6-character code from your admin</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleJoinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Room Code
                </label>
                <input
                  type="text" value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  className="input-field" placeholder="ABC123" maxLength={6}
                  style={{ letterSpacing: '0.3em', fontSize: '1.25rem', fontWeight: 700, textAlign: 'center' }}
                />
              </div>
              <button type="submit" disabled={joiningRoom}
                style={{
                  width: '100%', padding: '0.9375rem', fontSize: '1rem',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: 'white', fontWeight: 600, border: 'none', borderRadius: 'var(--radius)',
                  cursor: joiningRoom ? 'not-allowed' : 'pointer', opacity: joiningRoom ? 0.6 : 1,
                  boxShadow: '0 4px 20px rgba(34,197,94,0.25)',
                  transition: 'all 0.2s ease',
                }}>
                {joiningRoom
                  ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <svg style={{ animation: 'spin-slow 0.8s linear infinite', width: 18, height: 18 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" /><path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" /></svg>
                      Joining...
                    </span>
                  : 'Join Room 🔑'
                }
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}