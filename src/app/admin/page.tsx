import { getLeaderboardStats, getTopClaimers } from '@/db/actions/leaderboard-actions';
import { getPoolStats, getRecentClaims } from '@/db/actions/claim-actions';
import { PoolForm } from '@/app/admin/pool-form';
import { OnchainPoolForm } from '@/app/admin/onchain-form';
import { publicConfig } from '@/config/public-config';

const CREATOR_FID = publicConfig.fid;

export default async function AdminPage() {
  const [stats, leaderboard, poolStats, recentClaims] = await Promise.all([
    getLeaderboardStats(),
    getTopClaimers(20),
    getPoolStats(),
    getRecentClaims(20),
  ]);

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', color: '#fff', fontFamily: 'monospace', padding: '24px' }}>
      <h1 style={{ color: '#FFD700', fontSize: '22px', marginBottom: '4px' }}>TYSM Counter — Admin</h1>
      <p style={{ color: '#666', fontSize: '12px', marginBottom: '24px' }}>FID: {CREATOR_FID} · Data langsung dari database</p>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <StatCard label="Total Users" value={stats.totalClaimers.toString()} emoji="👥" />
        <StatCard label="Total TYSM Diklaim" value={poolStats.totalClaimed.toLocaleString()} emoji="💰" />
        <StatCard label="Streak Minggu Terpanjang" value={`Week ${stats.maxWeek}`} emoji="🔥" />
        <StatCard label="TYSM Tertinggi" value={stats.topTysm.toLocaleString()} emoji="🏆" />
      </div>

      {/* Onchain Pool Management */}
      <Section title="⛓️ Onchain Top Up & Withdraw">
        <OnchainPoolForm />
      </Section>

      {/* Pool Management (Database) */}
      <Section title="💧 Pool TYSM (Database)">
        <PoolForm currentPool={poolStats.totalPool} totalClaimed={poolStats.totalClaimed} />
      </Section>

      {/* Leaderboard */}
      <Section title="🏆 Top 20 Users">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ color: '#666', borderBottom: '1px solid #222' }}>
              <th style={{ textAlign: 'left', padding: '6px 4px' }}>#</th>
              <th style={{ textAlign: 'left', padding: '6px 4px' }}>Username</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>TYSM</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>Week</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>Days</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((user) => (
              <tr key={user.fid} style={{ borderBottom: '1px solid #111' }}>
                <td style={{ padding: '8px 4px', color: '#FFD700' }}>{user.rank}</td>
                <td style={{ padding: '8px 4px' }}>@{user.username}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#4ade80' }}>{user.totalTYSM.toLocaleString()}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#60a5fa' }}>W{user.streakWeek}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#a78bfa' }}>{user.tier.split(' ')[0]}</td>
              </tr>
            ))}
            {leaderboard.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#444' }}>Belum ada data</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      {/* Recent Claims */}
      <Section title="📡 20 Claim Terbaru">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ color: '#666', borderBottom: '1px solid #222' }}>
              <th style={{ textAlign: 'left', padding: '6px 4px' }}>Username</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>Amount</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>Waktu</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>TX</th>
            </tr>
          </thead>
          <tbody>
            {recentClaims.map((claim) => (
              <tr key={claim.id} style={{ borderBottom: '1px solid #111' }}>
                <td style={{ padding: '8px 4px' }}>@{claim.username}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#4ade80' }}>{claim.amount}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#666' }}>{claim.time}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                  <a
                    href={`https://basescan.org/tx/${claim.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#60a5fa', textDecoration: 'none' }}
                  >
                    {claim.txHash.slice(0, 6)}...{claim.txHash.slice(-4)}
                  </a>
                </td>
              </tr>
            ))}
            {recentClaims.length === 0 && (
              <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#444' }}>Belum ada claims</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      <p style={{ color: '#333', fontSize: '11px', marginTop: '24px', textAlign: 'center' }}>
        Halaman ini hanya untuk admin. Jangan share URL ini.
      </p>
    </div>
  );
}

function StatCard({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '16px' }}>
      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{emoji}</div>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFD700' }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h2 style={{ fontSize: '14px', color: '#FFD700', marginBottom: '12px' }}>{title}</h2>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '12px', overflowX: 'auto' }}>
        {children}
      </div>
    </div>
  );
}
