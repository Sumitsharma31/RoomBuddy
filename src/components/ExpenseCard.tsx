"use client";

import { format } from 'date-fns';

interface ExpenseCardProps {
  expense: {
    id: string; item: string; amount: number;
    paidBy: string; paidByName: string;
    date: Date; status: 'pending' | 'verified' | 'disputed';
  };
  currentUser: { uid: string } | null;
  onVerify?: (id: string) => void;
}

const STATUS_CONFIG = {
  verified: { label: 'Verified', emoji: '✅', class: 'badge-verified' },
  disputed: { label: 'Disputed', emoji: '⚠️', class: 'badge-disputed' },
  pending:  { label: 'Pending',  emoji: '⏳', class: 'badge-pending'  },
};

export default function ExpenseCard({ expense, currentUser, onVerify }: ExpenseCardProps) {
  const isOwn = expense.paidBy === currentUser?.uid;
  const config = STATUS_CONFIG[expense.status];

  return (
    <div className="expense-card animate-fade-up">
      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px',
        borderRadius: '0 2px 2px 0',
        background: expense.status === 'verified'
          ? 'var(--success)' : expense.status === 'disputed'
          ? 'var(--danger)' : 'var(--warning)',
      }} />

      <div style={{ paddingLeft: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {expense.item}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
              Paid by <span style={{ color: isOwn ? 'var(--accent-light)' : 'var(--text-primary)', fontWeight: 600 }}>
                {isOwn ? 'You' : expense.paidByName}
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem', flexShrink: 0, marginLeft: '0.75rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              ₹{expense.amount.toFixed(2)}
            </span>
            <span className={`badge ${config.class}`}>{config.emoji} {config.label}</span>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {format(expense.date, 'MMM d, yyyy')}
            </span>
            {expense.status !== 'pending' && expense.verifications && expense.verifications.length > 0 && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {expense.status === 'verified' ? 'Verified by' : 'Disputed by'}{' '}
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {expense.verifications.map(v => v.userName || 'Member').join(', ')}
                </span>
              </span>
            )}
          </div>
          <div>
            {!isOwn && expense.status === 'pending' && onVerify && (
              <button onClick={() => onVerify(expense.id)}
                style={{
                  background: 'rgba(124,92,252,0.15)', color: 'var(--accent-light)',
                  border: '1px solid rgba(124,92,252,0.25)', borderRadius: '0.625rem',
                  padding: '0.375rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(124,92,252,0.25)')}
                onMouseOut={e => (e.currentTarget.style.background = 'rgba(124,92,252,0.15)')}
              >
                Verify
              </button>
            )}
            {isOwn && expense.status === 'pending' && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Awaiting review…</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
