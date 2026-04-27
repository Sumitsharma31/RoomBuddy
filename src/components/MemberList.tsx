"use client";

interface Member {
  userId: string; role: 'admin' | 'member';
  displayName: string; photoURL: string | null;
}
interface MemberListProps { members: Member[]; adminId: string; }

const COLORS = ['#7c5cfc', '#fc5c7d', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899'];

export default function MemberList({ members, adminId }: MemberListProps) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="16" height="16" fill="none" stroke="var(--accent-light)" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>Room Members</h3>
        </div>
        <span className="badge badge-admin" style={{ fontSize: '0.7rem' }}>{members.length} total</span>
      </div>
      <div style={{ divide: 'var(--border)' }} className="stagger-children">
        {members.map((member, i) => (
          <div key={member.userId} style={{
            padding: '0.875rem 1.25rem',
            borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'background 0.2s ease',
          }}
          onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-glass)')}
          onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="avatar" style={{ background: `linear-gradient(135deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i + 2) % COLORS.length]})` }}>
                {member.photoURL
                  ? <img src={member.photoURL} alt={member.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : member.displayName.charAt(0).toUpperCase()
                }
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{member.displayName}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{member.role}</p>
              </div>
            </div>
            {member.userId === adminId && (
              <span className="badge badge-admin">👑 Admin</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
