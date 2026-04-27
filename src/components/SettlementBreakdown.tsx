"use client";

interface SettlementBreakdownProps {
  total: number;
  fairShare: number;
  breakdown: {
    userId: string;
    name: string;
    totalPaid: number;
    balance: number;
  }[];
  transfers: {
    from: string;
    to: string;
    amount: number;
    fromName: string;
    toName: string;
  }[];
}

const COLORS = ['#7c5cfc', '#fc5c7d', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899'];

export default function SettlementBreakdown({ total, fairShare, breakdown, transfers }: SettlementBreakdownProps) {
  const maxPaid = Math.max(...breakdown.map(b => b.totalPaid), 0.01);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="stagger-children">

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #7c5cfc 0%, #9b7fff 100%)',
          borderRadius: 'var(--radius-lg)', padding: '1.25rem',
          boxShadow: '0 8px 32px rgba(124,92,252,0.3)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Spent</p>
          <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>₹{total.toFixed(2)}</h3>
        </div>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '1.25rem',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(124,92,252,0.06)' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fair Share</p>
          <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-light)' }}>₹{fairShare.toFixed(2)}</h3>
        </div>
      </div>

      {/* Member Balances */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="16" height="16" fill="none" stroke="var(--accent-light)" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>Member Balances</h3>
        </div>
        <div>
          {breakdown.map((item, i) => {
            const isPositive = item.balance >= 0;
            const barWidth = (item.totalPaid / maxPaid) * 100;
            return (
              <div key={item.userId} style={{
                padding: '1rem 1.25rem',
                borderBottom: i < breakdown.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.2s ease',
              }}
              onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-glass)')}
              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Name row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: `linear-gradient(135deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i + 2) % COLORS.length]})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, color: 'white',
                    }}>
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{item.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paid ₹{item.totalPaid.toFixed(2)}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 800, fontSize: '1rem', color: isPositive ? '#4ade80' : '#f87171' }}>
                      {isPositive ? '+' : '-'}₹{Math.abs(item.balance).toFixed(2)}
                    </p>
                    <p style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: isPositive ? '#4ade80' : '#f87171', opacity: 0.8 }}>
                      {isPositive ? 'Gets back' : 'Owes'}
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ height: '4px', background: 'var(--bg-glass)', borderRadius: '100px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '100px', transition: 'width 0.6s ease',
                    width: `${barWidth}%`,
                    background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i + 1) % COLORS.length]})`,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settlement Steps */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="16" height="16" fill="none" stroke="var(--accent-light)" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>Who Pays Whom</h3>
        </div>
        <div style={{ padding: '1rem 1.25rem' }}>
          {transfers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem' }}>
              <p style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>✅</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', fontStyle: 'italic' }}>
                Everyone is already settled up!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {transfers.map((t, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  background: 'var(--bg-glass)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: '0.875rem 1rem',
                }}>
                  {/* Debtor */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#f87171', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.fromName}
                    </p>
                    <p style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginTop: '1px' }}>Owes</p>
                  </div>

                  {/* Amount + Arrow */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                    <span style={{
                      background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.25)',
                      color: 'var(--accent-light)', borderRadius: '100px',
                      padding: '0.2rem 0.625rem', fontSize: '0.8125rem', fontWeight: 800,
                    }}>
                      ₹{t.amount.toFixed(2)}
                    </span>
                    <svg width="16" height="16" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>

                  {/* Creditor */}
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#4ade80', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.toName}
                    </p>
                    <p style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginTop: '1px' }}>Receives</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
