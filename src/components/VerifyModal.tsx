"use client";

interface VerifyModalProps {
  expense: { id: string; item: string; amount: number; paidByName: string; } | null;
  onClose: () => void;
  onAction: (id: string, action: 'verified' | 'disputed') => void;
  loading: boolean;
}

export default function VerifyModal({ expense, onClose, onAction, loading }: VerifyModalProps) {
  if (!expense) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ maxWidth: '420px' }}>
        {/* Handle bar (mobile) */}
        <div style={{ width: '40px', height: '4px', borderRadius: '100px', background: 'var(--border)', margin: '0 auto 1.25rem' }} />

        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '60px', height: '60px', borderRadius: '20px',
            background: 'rgba(124,92,252,0.15)', marginBottom: '0.75rem',
          }}>
            <svg width="28" height="28" fill="none" stroke="var(--accent-light)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 style={{ fontWeight: 700, fontSize: '1.1875rem', color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
            Review Expense
          </h3>
        </div>

        {/* Expense details pill */}
        <div style={{
          background: 'var(--bg-glass)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>{expense.item}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>by {expense.paidByName}</p>
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent-light)' }}>
            ₹{expense.amount.toFixed(2)}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={() => onAction(expense.id, 'verified')} disabled={loading}
            style={{
              width: '100%', padding: '0.875rem', borderRadius: 'var(--radius)',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white',
              fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1, fontSize: '0.9375rem',
              boxShadow: '0 4px 16px rgba(34,197,94,0.25)', transition: 'all 0.2s ease',
            }}>
            {loading ? 'Processing…' : '✅ Confirm Verified'}
          </button>
          <button
            onClick={() => onAction(expense.id, 'disputed')} disabled={loading}
            className="btn-danger"
            style={{ width: '100%', padding: '0.875rem', fontSize: '0.9375rem' }}>
            {loading ? 'Processing…' : '❌ Dispute Expense'}
          </button>
          <button onClick={onClose} disabled={loading} className="btn-secondary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.9375rem' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
