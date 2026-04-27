"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthChange } from '@/lib/auth';
import MemberList from '@/components/MemberList';

const NAV_ITEMS = [
  { path: '/room', label: 'Feed', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
  { path: '/room/verify', label: 'Verify', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  { path: '/room/settle', label: 'Settle', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  { path: '/room/settings', label: 'Settings', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /> },
];

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [roomMembers, setRoomMembers] = useState<any[]>([]);
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletionRequest, setDeletionRequest] = useState<any>(null);
  const [copied, setCopied] = useState(false);
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

  const loadRoomData = async (roomId: string) => {
    try {
      const roomDoc = await getDoc(doc(db, 'rooms', roomId));
      if (roomDoc.exists()) {
        setRoomName(roomDoc.data().name || 'Room');
        setRoomCode(roomDoc.data().code || '');
      }
      onSnapshot(collection(db, 'rooms', roomId, 'members'), snap =>
        setRoomMembers(snap.docs.map(d => ({ userId: d.id, ...d.data() }))));
      onSnapshot(doc(db, 'rooms', roomId, 'deletionRequest', 'current'), snap =>
        setDeletionRequest(snap.exists() ? { id: snap.id, ...snap.data() } : null));
    } catch (e) { console.error(e); }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTransferAdmin = async () => {
    if (!user || !user.currentRoomId || !selectedNewAdmin) return;
    setTransferLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/room/transfer-admin', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ roomId: user.currentRoomId, newAdminId: selectedNewAdmin }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setShowTransferModal(false); router.push('/room');
    } catch (e: any) { alert(e.message); } finally { setTransferLoading(false); }
  };

  const handleLeaveRoom = async () => {
    if (!user || !user.currentRoomId) return;
    const isAdmin = roomMembers.find(m => m.userId === user.uid)?.role === 'admin';
    if (isAdmin) { alert('Transfer admin role before leaving'); return; }
    if (!confirm('Are you sure you want to leave this room?')) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/room/leave', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ roomId: user.currentRoomId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      router.push('/');
    } catch (e: any) { alert(e.message); }
  };

  const handleRequestDeletion = async () => {
    if (!user || !user.currentRoomId) return;
    setDeleteLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/room/delete-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ roomId: user.currentRoomId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setShowDeleteModal(false);
    } catch (e: any) { alert(e.message); } finally { setDeleteLoading(false); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="spinner" />
    </div>
  );

  const currentMember = roomMembers.find(m => m.userId === user?.uid);
  const isAdmin = currentMember?.role === 'admin';
  const adminId = roomMembers.find(m => m.role === 'admin')?.userId || '';

  return (
    <div className="bg-mesh" style={{ minHeight: '100vh' }}>
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
            <span className="logo-text" style={{ fontSize: '1.25rem', display: 'block' }}>Settings</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>{roomName}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '1.5rem 1.25rem 100px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="stagger-children">

          {/* Room Info Card */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
            <p className="section-title">Room Information</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Room Name</p>
                <p style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text-primary)' }}>{roomName}</p>
              </div>
              {roomCode && (
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Invite Code</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      flex: 1, background: 'var(--bg-glass)', border: '1px solid var(--border)',
                      borderRadius: '0.75rem', padding: '0.625rem 1rem',
                      fontFamily: 'monospace', fontWeight: 700, fontSize: '1.25rem',
                      letterSpacing: '0.3em', color: 'var(--accent-light)', textAlign: 'center',
                    }}>
                      {roomCode}
                    </div>
                    <button onClick={handleCopyCode}
                      style={{
                        background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(124,92,252,0.15)',
                        border: copied ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(124,92,252,0.3)',
                        borderRadius: '0.75rem', padding: '0.625rem 1rem',
                        color: copied ? '#4ade80' : 'var(--accent-light)',
                        fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap',
                      }}>
                      {copied ? '✓ Copied!' : 'Copy Code'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Members List */}
          <MemberList members={roomMembers} adminId={adminId} />

          {/* Deletion Status */}
          {deletionRequest && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                <h3 style={{ fontWeight: 700, color: 'var(--warning)', fontSize: '0.9375rem' }}>Deletion Request Pending</h3>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                All members must approve to delete the room.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {roomMembers.map(m => {
                  const vote = deletionRequest.votes?.find((v: any) => v.userId === m.userId);
                  return (
                    <div key={m.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--bg-glass)', borderRadius: '0.625rem' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{m.displayName}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: vote ? 'var(--success)' : 'var(--text-muted)' }}>
                        {vote ? '✓ Approved' : 'Pending…'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
            <p className="section-title" style={{ color: 'var(--danger)' }}>Danger Zone</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {isAdmin ? (
                <>
                  <button onClick={() => setShowTransferModal(true)} className="btn-warning" style={{ width: '100%', padding: '0.875rem', textAlign: 'center' }}>
                    🔄 Transfer Admin Role
                  </button>
                  {!deletionRequest && (
                    <button onClick={() => setShowDeleteModal(true)} className="btn-danger" style={{ width: '100%', padding: '0.875rem', textAlign: 'center' }}>
                      🗑️ Delete Room
                    </button>
                  )}
                </>
              ) : (
                <button onClick={handleLeaveRoom} className="btn-danger" style={{ width: '100%', padding: '0.875rem', textAlign: 'center' }}>
                  🚪 Leave Room
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Admin Modal */}
      {showTransferModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowTransferModal(false)}>
          <div className="modal-panel">
            <div style={{ width: '40px', height: '4px', borderRadius: '100px', background: 'var(--border)', margin: '0 auto 1.5rem' }} />
            <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.375rem' }}>Transfer Admin Role</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>Select a member to become the new admin.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto', marginBottom: '1.25rem' }}>
              {roomMembers.filter(m => m.userId !== user!.uid).map(member => (
                <button key={member.userId} onClick={() => setSelectedNewAdmin(member.userId)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.875rem 1rem', borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left',
                    background: selectedNewAdmin === member.userId ? 'rgba(124,92,252,0.15)' : 'var(--bg-glass)',
                    border: selectedNewAdmin === member.userId ? '1px solid var(--accent)' : '1px solid var(--border)',
                    transition: 'all 0.2s ease',
                  }}>
                  <div className="avatar">{member.displayName.charAt(0).toUpperCase()}</div>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{member.displayName}</span>
                  {selectedNewAdmin === member.userId && <span style={{ marginLeft: 'auto', color: 'var(--accent-light)' }}>✓</span>}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowTransferModal(false)} className="btn-secondary" style={{ flex: 1, padding: '0.875rem' }}>Cancel</button>
              <button onClick={handleTransferAdmin} disabled={transferLoading || !selectedNewAdmin} className="btn-primary" style={{ flex: 2, padding: '0.875rem' }}>
                {transferLoading ? 'Transferring…' : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowDeleteModal(false)}>
          <div className="modal-panel">
            <div style={{ width: '40px', height: '4px', borderRadius: '100px', background: 'var(--border)', margin: '0 auto 1.5rem' }} />
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '3rem' }}>🗑️</span>
            </div>
            <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem' }}>Request Room Deletion</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              All members will be notified. The room is only deleted if <strong style={{ color: 'var(--text-primary)' }}>everyone approves</strong> within 24 hours.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowDeleteModal(false)} className="btn-secondary" style={{ flex: 1, padding: '0.875rem' }}>Cancel</button>
              <button onClick={handleRequestDeletion} disabled={deleteLoading} className="btn-danger" style={{ flex: 2, padding: '0.875rem' }}>
                {deleteLoading ? 'Processing…' : 'Request Deletion'}
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
