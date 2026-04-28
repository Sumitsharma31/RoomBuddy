"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, signup, loginWithGoogle, resetPassword } from '@/lib/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState({ type: '', text: '' });
  const router = useRouter();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        if (!name) { setError('Name is required'); setLoading(false); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
        const user = await signup(name, email, password);
        await setDoc(doc(db, 'users', user.uid), {
          name, email, photoURL: user.photoURL,
          currentRoomId: null, fcmToken: null, createdAt: new Date(),
        });
      } else {
        await login(email, password);
      }
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(''); setLoading(true);
    try {
      const user = await loginWithGoogle();
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists()) {
          await setDoc(userDocRef, {
            name: user.displayName || 'Roommate', email: user.email,
            photoURL: user.photoURL, currentRoomId: null, fcmToken: null, createdAt: new Date(),
          });
        }
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    setResetMessage({ type: '', text: '' });
    try {
      await resetPassword(resetEmail);
      setResetMessage({ type: 'success', text: 'Password reset link sent! Check your email.' });
    } catch (err: any) {
      setResetMessage({ type: 'error', text: err.message });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="bg-mesh min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Floating decorative blobs */}
      <div style={{
        position: 'fixed', top: '-20%', right: '-10%',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,92,252,0.12) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'fixed', bottom: '-15%', left: '-10%',
        width: '350px', height: '350px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(252,92,125,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div className="w-full max-w-sm animate-fade-up">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div className="animate-float" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '72px', height: '72px', borderRadius: '24px',
            background: 'linear-gradient(135deg, #7c5cfc, #9b7fff)',
            boxShadow: '0 0 40px rgba(124,92,252,0.35)',
            marginBottom: '1.25rem',
          }}>
            <svg width="36" height="36" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h1 className="logo-text" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.25rem' }}>
            RoomBuddy
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            {isSignup ? 'Create your account to get started' : 'Welcome back! Sign in to continue'}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--bg-glass-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.75rem',
          boxShadow: 'var(--shadow)',
        }}>
          {error && <div className="error-banner" style={{ marginBottom: '1.25rem' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {isSignup && (
              <div className="animate-slide-down">
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Full Name
                </label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  className="input-field" placeholder="John Doe" required={isSignup}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Email Address
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-field" placeholder="you@example.com" required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field" placeholder="••••••••" required minLength={6}
                  style={{ paddingRight: '3rem' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    padding: '0.25rem',
                  }}>
                  {showPassword
                    ? <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
              {!isSignup && (
                <div style={{ textAlign: 'right', marginTop: '0.375rem' }}>
                  <button type="button" onClick={() => { setShowResetModal(true); setResetEmail(email); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-light)', fontSize: '0.8125rem', fontWeight: 500 }}>
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '0.25rem', padding: '0.9375rem' }}>
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <svg style={{ animation: 'spin-slow 0.8s linear infinite', width: 18, height: 18 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" /><path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" /></svg>
                    Processing...
                  </span>
                : isSignup ? 'Create Account' : 'Sign In'
              }
            </button>
          </form>

          <div className="divider"><span>OR</span></div>

          <button type="button" onClick={handleGoogleLogin} disabled={loading}
            className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81.58z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {isSignup ? 'Sign up with Google' : 'Sign in with Google'}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" onClick={() => { setIsSignup(!isSignup); setError(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-light)', fontWeight: 600, fontSize: 'inherit' }}>
            {isSignup ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="animate-scale-in" style={{
            background: 'var(--bg-card)', border: '1px solid var(--bg-glass-border)',
            borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: '400px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Reset Password</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {resetMessage.text && (
              <div style={{
                padding: '0.875rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem',
                background: resetMessage.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                color: resetMessage.type === 'error' ? '#ef4444' : '#10b981',
                fontSize: '0.875rem', border: `1px solid ${resetMessage.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`
              }}>
                {resetMessage.text}
              </div>
            )}

            <form onSubmit={handleResetPassword}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Email Address
              </label>
              <input
                type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                className="input-field" placeholder="you@example.com" required
                style={{ marginBottom: '1.5rem' }}
              />

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => { setShowResetModal(false); setResetMessage({ type: '', text: '' }); }}
                  className="btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" disabled={resetLoading} className="btn-primary" style={{ flex: 2 }}>
                  {resetLoading ? 'Sending...' : 'Send Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}