"use client";

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

export default function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  return (
    <button onClick={onClick}
      style={{
        position: 'relative', background: 'var(--bg-glass)',
        border: '1px solid var(--border)', borderRadius: '0.75rem',
        padding: '0.5rem', cursor: 'pointer', color: 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}
      onMouseOver={e => { e.currentTarget.style.color = 'var(--accent-light)'; e.currentTarget.style.borderColor = 'rgba(124,92,252,0.4)'; }}
      onMouseOut={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {unreadCount > 0 && (
        <span className="animate-pulse-glow" style={{
          position: 'absolute', top: '-6px', right: '-6px',
          height: '20px', minWidth: '20px', paddingInline: '3px',
          background: 'var(--danger)', color: 'white',
          fontSize: '10px', fontWeight: 700,
          borderRadius: '100px', border: '2px solid var(--bg-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
