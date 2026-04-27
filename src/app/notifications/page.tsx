'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { onAuthChange } from '@/lib/auth';

interface User {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  currentRoomId: string | null;
  fcmToken: string | null;
  createdAt: Date;
}

interface AppNotification {
  id: string;
  type: string;
  message: string;
  roomId: string;
  read: boolean;
  createdAt: Date;
}

export default function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthChange(async (currentUser) => {
      if (currentUser) {
        await loadUserData(currentUser.uid);
      } else {
        router.push('/login');
      }
    });
    return unsubscribe;
  }, []);

  const loadUserData = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setUser({ ...userData, uid });
        if (!userData.currentRoomId) {
          router.push('/');
        } else {
          loadNotifications(uid);
        }
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async (userId: string) => {
    try {
      const notifsRef = collection(db, 'notifications', userId, 'items');
      const q = query(notifsRef, orderBy('createdAt', 'desc'));
      const querySnap = await getDocs(q);

      const notifs: AppNotification[] = [];
      querySnap.forEach((docSnap) => {
        const data = docSnap.data();
        notifs.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        } as AppNotification);
      });
      setNotifications(notifs);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAsRead(true);
    try {
      for (const notif of notifications.filter(n => !n.read)) {
        await updateDoc(doc(db, 'notifications', user!.uid, 'items', notif.id), {
          read: true,
        });
      }
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    } finally {
      setMarkingAsRead(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="spinner" />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="bg-mesh" style={{ minHeight: '100vh' }}>
      {/* Ambient blob */}
      <div style={{ position: 'fixed', top: '-10%', right: '-5%', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,252,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

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
              <span className="logo-text" style={{ fontSize: '1.25rem', display: 'block' }}>Notifications</span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>Stay updated on your room</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllAsRead} disabled={markingAsRead}
              style={{
                background: 'rgba(124,92,252,0.15)', color: 'var(--accent-light)',
                border: '1px solid rgba(124,92,252,0.25)', borderRadius: '0.625rem',
                padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontWeight: 600,
                cursor: markingAsRead ? 'not-allowed' : 'pointer', opacity: markingAsRead ? 0.6 : 1,
              }}>
              {markingAsRead ? 'Marking…' : 'Mark all read'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '1.5rem 1.25rem 40px', maxWidth: '600px', margin: '0 auto' }}>
        {notifications.length === 0 ? (
          <div className="animate-fade-up" style={{
            textAlign: 'center', padding: '4rem 1.5rem',
            background: 'var(--bg-card)', border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <div className="animate-float" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📭</div>
            <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
              All caught up!
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              You don't have any notifications right now.
            </p>
          </div>
        ) : (
          <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {notifications.map((notif) => (
              <div key={notif.id} style={{
                background: 'var(--bg-card)', border: notif.read ? '1px solid var(--border)' : '1px solid var(--accent)',
                borderRadius: 'var(--radius-lg)', padding: '1.125rem',
                display: 'flex', gap: '1rem', alignItems: 'flex-start',
                boxShadow: notif.read ? 'none' : '0 4px 20px rgba(124,92,252,0.1)',
                transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden'
              }}>
                {!notif.read && (
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: 'var(--accent)' }} />
                )}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                  background: notif.read ? 'var(--bg-glass)' : 'rgba(124,92,252,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {notif.type.includes('verify') ? (
                    <svg width="20" height="20" fill="none" stroke={notif.read ? 'var(--text-muted)' : 'var(--accent-light)'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : notif.type.includes('dispute') ? (
                    <svg width="20" height="20" fill="none" stroke="var(--danger)" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" fill="none" stroke={notif.read ? 'var(--text-muted)' : 'var(--accent-light)'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: notif.read ? 'var(--text-secondary)' : 'var(--text-primary)', fontSize: '0.9375rem', fontWeight: notif.read ? 500 : 600, marginBottom: '0.375rem', lineHeight: 1.4 }}>
                    {notif.message}
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    {notif.createdAt.toLocaleDateString()} at {notif.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
