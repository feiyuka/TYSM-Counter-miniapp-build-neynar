import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getLeaderboardStats, getTopClaimers } from '@/db/actions/leaderboard-actions';
import { getPoolStats, getRecentClaims, getTotalClaimed } from '@/db/actions/claim-actions';
import { db } from '@/neynar-db-sdk/db';
import { userStreaks, claims } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { PoolForm } from '@/app/admin/pool-form';
import { OnchainPoolForm } from '@/app/admin/onchain-form';
import { publicConfig } from '@/config/public-config';

const ADMIN_SECRET = process.env.NOTIFY_SECRET || 'tysm-notify-secret';
const CREATOR_FID = publicConfig.fid;

export const metadata = {
  title: 'Admin — TYSM Counter',
  robots: 'noindex, nofollow',
};

// Force dynamic so we can read searchParams and headers
export const dynamic = 'force-dynamic';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string }>;
}) {
  const params = await searchParams;
  const secret = params.secret;

  // Auth guard: require ?secret=xxx matching NOTIFY_SECRET
  if (!secret || secret !== ADMIN_SECRET) {
    return (
      <div style={{
        background: '#0A0A0A', minHeight: '100vh', color: '#fff',
        fontFamily: 'monospace', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: '16px',
      }}>
        <div style={{ fontSize: '48px' }}>🔐</div>
        <h1 style={{ color: '#FFD700', fontSize: '20px', margin: 0 }}>Admin Only</h1>
        <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
          Akses ditolak. URL ini memerlukan secret yang valid.
        </p>
        <code style={{
          background: '#111', border: '1px solid #333', borderRadius: '8px',
          padding: '8px 16px', fontSize: '12px', color: '#888',
        }}>
          /admin?secret=YOUR_SECRET
        </code>
      </div>
    );
  }

  // Fetch all data in parallel
  const [stats, leaderboard, poolStats, recentClaims, totalClaimsCount, activeUsersResult] = await Promise.all([
    getLeaderboardStats(),
    getTopClaimers(20),
    getPoolStats(),
    getRecentClaims(20),
    db.select({ count: sql<number>`COUNT(*)` }).from(claims).then(r => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`COUNT(*)` }).from(userStreaks)
      .where(sql`${userStreaks.lastCheckIn} >= NOW() - INTERVAL '48 hours'`)
      .then(r => Number(r[0]?.count ?? 0)),
  ]);

  const activeUsers48h = activeUsersResult;

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', color: '#fff', fontFamily: 'monospace', padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#FFD700', fontSize: '22px', marginBottom: '4px', margin: 0 }}>👑 TYSM Counter — Admin</h1>
          <p style={{ color: '#666', fontSize: '12px', marginTop: '4px', margin: '4px 0 0' }}>
            Creator FID: {CREATOR_FID} · Halaman ini hanya untuk admin
          </p>
        </div>
        <div style={{ fontSize: '11px', color: '#444', textAlign: 'right' }}>
          Data realtime dari DB<br />
          <span style={{ color: '#333' }}>Refresh halaman untuk update</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <StatCard label="Total Users" value={stats.totalClaimers.toLocaleString()} emoji="👥" color="#60a5fa" />
        <StatCard label="Aktif (48h)" value={activeUsers48h.toLocaleString()} emoji="🔥" color="#4ade80" />
        <StatCard label="Total Claims" value={totalClaimsCount.toLocaleString()} emoji="📋" color="#a78bfa" />
        <StatCard label="Total TYSM Diklaim" value={poolStats.totalClaimed.toLocaleString()} emoji="💰" color="#FFD700" />
        <StatCard label="Streak Minggu Terpanjang" value={`Week ${stats.maxWeek}`} emoji="🚀" color="#f97316" />
        <StatCard label="TYSM Balance Tertinggi" value={stats.topTysm.toLocaleString()} emoji="🏆" color="#FFD700" />
      </div>

      {/* Booster Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: '#111', border: '1px solid #854d0e', borderRadius: '12px', padding: '14px' }}>
          <p style={{ color: '#f97316', fontWeight: 'bold', fontSize: '12px', marginBottom: '6px' }}>🚀 Booster Formula (Pool Wallet)</p>
          <p style={{ color: '#fde68a', fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace' }}>Day × Week × 100 TYSM</p>
          <p style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>Contoh: Day 3 Week 2 = 600 TYSM dikirim dari pool</p>
        </div>
        <div style={{ background: '#111', border: '1px solid #1e3a5f', borderRadius: '12px', padding: '14px' }}>
          <p style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '12px', marginBottom: '6px' }}>📅 Week Booster Range</p>
          <p style={{ color: '#ddd', fontSize: '12px' }}>Week 1 = <span style={{ color: '#4ade80' }}>100x</span></p>
          <p style={{ color: '#ddd', fontSize: '12px' }}>Week 52 = <span style={{ color: '#f97316', fontWeight: 'bold' }}>5,200x</span></p>
          <p style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>Streak hingga 1 tahun (52 minggu)</p>
        </div>
      </div>

      {/* Onchain Pool Management */}
      <Section title="⛓️ Onchain — Top Up & Withdraw">
        <OnchainPoolForm />
      </Section>

      {/* Pool Management (Database) */}
      <Section title="💧 Pool TYSM (Database)">
        <PoolForm currentPool={poolStats.totalPool} totalClaimed={poolStats.totalClaimed} />
      </Section>

      {/* Leaderboard */}
      <Section title="🏆 Top 20 Users (by TYSM Balance)">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ color: '#555', borderBottom: '1px solid #1a1a1a' }}>
              <th style={{ textAlign: 'left', padding: '8px 6px' }}>#</th>
              <th style={{ textAlign: 'left', padding: '8px 6px' }}>FID</th>
              <th style={{ textAlign: 'left', padding: '8px 6px' }}>Username</th>
              <th style={{ textAlign: 'right', padding: '8px 6px' }}>TYSM</th>
              <th style={{ textAlign: 'right', padding: '8px 6px' }}>Tier</th>
              <th style={{ textAlign: 'right', padding: '8px 6px' }}>Streak</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((user) => (
              <tr key={user.fid} style={{ borderBottom: '1px solid #0f0f0f' }}>
                <td style={{ padding: '8px 6px', color: user.rank <= 3 ? '#FFD700' : '#555' }}>
                  {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : user.rank}
                </td>
                <td style={{ padding: '8px 6px', color: '#444', fontSize: '11px' }}>{user.fid}</td>
                <td style={{ padding: '8px 6px' }}>
                  <a
                    href={`https://warpcast.com/${user.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#ddd', textDecoration: 'none' }}
                  >
                    @{user.username}
                  </a>
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', color: '#4ade80', fontWeight: 'bold' }}>
                  {user.totalTYSM.toLocaleString()}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', fontSize: '11px' }}>{user.tier}</td>
                <td style={{ padding: '8px 6px', textAlign: 'right', color: '#60a5fa' }}>W{user.streakWeek}</td>
              </tr>
            ))}
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#333' }}>
                  Belum ada data user
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      {/* Recent Claims */}
      <Section title="📡 20 Claim Terbaru">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ color: '#555', borderBottom: '1px solid #1a1a1a' }}>
              <th style={{ textAlign: 'left', padding: '8px 6px' }}>FID</th>
              <th style={{ textAlign: 'left', padding: '8px 6px' }}>Username</th>
              <th style={{ textAlign: 'right', padding: '8px 6px' }}>Amount (TYSM)</th>
              <th style={{ textAlign: 'right', padding: '8px 6px' }}>Waktu</th>
              <th style={{ textAlign: 'right', padding: '8px 6px' }}>TX Hash</th>
            </tr>
          </thead>
          <tbody>
            {recentClaims.map((claim) => (
              <tr key={claim.id} style={{ borderBottom: '1px solid #0f0f0f' }}>
                <td style={{ padding: '8px 6px', color: '#444', fontSize: '11px' }}>{claim.fid}</td>
                <td style={{ padding: '8px 6px' }}>
                  <a
                    href={`https://warpcast.com/${claim.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#ddd', textDecoration: 'none' }}
                  >
                    @{claim.username}
                  </a>
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', color: '#4ade80', fontWeight: 'bold' }}>
                  {Number(claim.amount).toLocaleString()}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', color: '#555' }}>{claim.time}</td>
                <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                  <a
                    href={`https://basescan.org/tx/${claim.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#60a5fa', textDecoration: 'none', fontFamily: 'monospace' }}
                  >
                    {claim.txHash.slice(0, 8)}...{claim.txHash.slice(-6)}
                  </a>
                </td>
              </tr>
            ))}
            {recentClaims.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#333' }}>
                  Belum ada claim
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      <p style={{ color: '#222', fontSize: '11px', marginTop: '32px', textAlign: 'center' }}>
        Admin TYSM Counter · Jangan share URL ini
      </p>
    </div>
  );
}

function StatCard({ label, value, emoji, color }: { label: string; value: string; emoji: string; color: string }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '16px' }}>
      <div style={{ fontSize: '20px', marginBottom: '6px' }}>{emoji}</div>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <h2 style={{ fontSize: '13px', color: '#FFD700', marginBottom: '10px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
        {title}
      </h2>
      <div style={{ background: '#0e0e0e', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '16px', overflowX: 'auto' }}>
        {children}
      </div>
    </div>
  );
}
