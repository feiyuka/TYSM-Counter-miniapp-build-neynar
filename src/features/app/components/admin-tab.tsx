'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFarcasterUser } from '@/neynar-farcaster-sdk/mini';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { TYSM_CHECKIN_ADDRESS, TYSM_CHECKIN_ABI, TYSM_TOKEN_ADDRESS } from '@/contracts/tysm-checkin-abi';

const CREATOR_FID = Number(process.env.NEXT_PUBLIC_USER_FID ?? 0);

const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

type AdminStats = {
  poolBalance: number;
  totalClaimed: number;
  totalClaimers: number;
  totalUsers: number;
  activeUsers48h: number;
  totalClaimsCount: number;
};

type UserRow = {
  fid: number;
  username: string;
  pfpUrl: string | null;
  tysmBalance: number;
  streakDay: number;
  streakWeek: number;
  totalStreakDays: number;
  lastCheckIn: string | null;
  createdAt: string;
};

type ClaimRow = {
  id: string;
  fid: number;
  username: string;
  amount: number;
  txHash: string;
  createdAt: string;
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatCard({ label, value, sub, color = 'amber' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    amber: 'border-amber-400/50 bg-amber-500/10 text-amber-400',
    green: 'border-green-400/50 bg-green-500/10 text-green-400',
    blue: 'border-blue-400/50 bg-blue-500/10 text-blue-400',
    purple: 'border-purple-400/50 bg-purple-500/10 text-purple-400',
    red: 'border-red-400/50 bg-red-500/10 text-red-400',
    cyan: 'border-cyan-400/50 bg-cyan-500/10 text-cyan-400',
  };
  const cls = colorMap[color] ?? colorMap.amber;
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${cls.split(' ')[2]}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewSection({ fid }: { fid: number }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats', { headers: { 'x-fid': String(fid) } });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setStats(data.stats);
      setClaims(data.recentClaims);
    } catch {
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [fid]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) return <div className="text-center py-10 text-gray-400">⏳ Loading stats...</div>;
  if (error) return <div className="text-center py-10 text-red-400">{error}</div>;
  if (!stats) return null;

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Pool Balance" value={`${stats.poolBalance.toLocaleString()} TYSM`} color="amber" />
        <StatCard label="Total Claimed" value={`${stats.totalClaimed.toLocaleString()} TYSM`} color="green" />
        <StatCard label="Total Users" value={stats.totalUsers} color="blue" />
        <StatCard label="Active (48h)" value={stats.activeUsers48h} color="purple" />
        <StatCard label="Total Claimers" value={stats.totalClaimers} color="cyan" />
        <StatCard label="Total Claims" value={stats.totalClaimsCount} color="green" />
      </div>

      {/* Recent claims */}
      <div className="rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-4 py-3 bg-gray-800/60 border-b border-gray-700 flex items-center justify-between">
          <p className="font-bold text-white text-sm">Recent Claims</p>
          <button onClick={fetchStats} className="text-xs text-amber-400 hover:text-amber-300">↻ Refresh</button>
        </div>
        <div className="divide-y divide-gray-800 max-h-64 overflow-y-auto">
          {claims.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-6">No claims yet</p>
          )}
          {claims.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-amber-400 font-bold text-sm w-20 flex-shrink-0">
                  {c.amount.toLocaleString()}
                </span>
                <span className="text-gray-300 text-sm truncate">@{c.username}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-gray-500 text-xs">{timeAgo(c.createdAt)}</span>
                <a
                  href={`https://basescan.org/tx/${c.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 text-xs hover:underline"
                >
                  tx↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Users Tab ─────────────────────────────────────────────────────────────────
function UsersSection({ fid }: { fid: number }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/users?${params}`, { headers: { 'x-fid': String(fid) } });
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [fid, page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex gap-2">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search username..."
          className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 rounded-lg bg-amber-500/30 border border-amber-400/60 text-amber-400 text-sm font-bold"
        >
          Search
        </button>
      </div>

      {/* Users list */}
      <div className="rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-800/60 border-b border-gray-700 grid grid-cols-12 text-xs text-gray-500 font-medium">
          <span className="col-span-4">User</span>
          <span className="col-span-3 text-right">TYSM</span>
          <span className="col-span-3 text-right">Streak</span>
          <span className="col-span-2 text-right">Last</span>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No users found</div>
        ) : (
          <div className="divide-y divide-gray-800/60 max-h-80 overflow-y-auto">
            {users.map((u) => (
              <div key={u.fid} className="grid grid-cols-12 items-center px-4 py-2.5">
                <div className="col-span-4 flex items-center gap-2 min-w-0">
                  {u.pfpUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.pfpUrl} alt={u.username} className="w-7 h-7 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-amber-500/30 flex items-center justify-center text-xs text-amber-400 flex-shrink-0">
                      {u.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-gray-200 text-xs truncate">@{u.username}</span>
                </div>
                <span className="col-span-3 text-right text-amber-400 text-xs font-mono">
                  {u.tysmBalance.toLocaleString()}
                </span>
                <span className="col-span-3 text-right text-gray-300 text-xs">
                  W{u.streakWeek} D{u.streakDay}
                </span>
                <span className="col-span-2 text-right text-gray-500 text-xs">
                  {timeAgo(u.lastCheckIn)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 text-sm disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-gray-400 text-xs">Page {page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 text-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Contract Tab ──────────────────────────────────────────────────────────────
function ContractSection() {
  const { address: walletAddress } = useAccount();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawTo, setWithdrawTo] = useState('');

  const { data: ownerAddress } = useReadContract({
    address: TYSM_CHECKIN_ADDRESS,
    abi: TYSM_CHECKIN_ABI,
    functionName: 'owner',
  });

  const { data: poolBalanceRaw, refetch: refetchPool } = useReadContract({
    address: TYSM_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [TYSM_CHECKIN_ADDRESS],
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const poolBalance = poolBalanceRaw ? Number(formatUnits(poolBalanceRaw, 18)) : 0;
  const isOwner = walletAddress && ownerAddress &&
    walletAddress.toLowerCase() === (ownerAddress as string).toLowerCase();

  useEffect(() => {
    if (isTxSuccess) {
      setWithdrawAmount('');
      setWithdrawTo('');
      refetchPool();
    }
  }, [isTxSuccess, refetchPool]);

  function handleWithdraw() {
    if (!withdrawAmount || !withdrawTo) return;
    writeContract({
      address: TYSM_CHECKIN_ADDRESS,
      abi: TYSM_CHECKIN_ABI,
      functionName: 'withdrawFunds',
      args: [withdrawTo as `0x${string}`, parseUnits(withdrawAmount, 18)],
    });
  }

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-4 py-3 bg-gray-800/60 border-b border-gray-700">
          <p className="font-bold text-white text-sm">Contract Info</p>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Contract</p>
            <p className="text-xs font-mono text-gray-300 break-all">{TYSM_CHECKIN_ADDRESS}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Owner</p>
            <p className="text-xs font-mono text-gray-300 break-all">{ownerAddress ?? 'Loading...'}</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-400/40">
            <p className="text-xs text-gray-500 mb-0.5">Pool Balance (on-chain)</p>
            <p className="text-xl font-bold text-amber-400">{poolBalance.toLocaleString()} TYSM</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Your Wallet</p>
            <p className="text-xs font-mono text-gray-300 break-all">{walletAddress ?? 'Not connected'}</p>
            {walletAddress && (
              <p className={`text-xs mt-1 ${isOwner ? 'text-green-400' : 'text-red-400'}`}>
                {isOwner ? '✅ Owner' : '❌ Not owner'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Withdraw */}
      <div className="rounded-xl border border-blue-400/40 overflow-hidden">
        <div className="px-4 py-3 bg-gray-800/60 border-b border-blue-400/30">
          <p className="font-bold text-white text-sm">Withdraw Funds</p>
        </div>
        <div className="p-4">
          {!walletAddress ? (
            <p className="text-yellow-400 text-sm text-center">Connect wallet first</p>
          ) : !isOwner ? (
            <p className="text-red-400 text-sm text-center">Only owner can withdraw</p>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => {
                  if (walletAddress && poolBalanceRaw) {
                    setWithdrawTo(walletAddress);
                    setWithdrawAmount(formatUnits(poolBalanceRaw, 18));
                  }
                }}
                className="w-full py-2.5 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-400 text-sm font-bold"
              >
                Fill: Withdraw All to My Wallet
              </button>

              <div>
                <p className="text-xs text-gray-500 mb-1">To Address</p>
                <input
                  value={withdrawTo}
                  onChange={(e) => setWithdrawTo(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2.5 rounded-lg bg-black/30 border border-gray-600 text-white text-sm font-mono"
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Amount (TYSM)</p>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="1000"
                  className="w-full px-3 py-2.5 rounded-lg bg-black/30 border border-gray-600 text-white text-sm"
                />
              </div>
              <button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || !withdrawTo || isPending || isTxLoading}
                className="w-full py-3 rounded-xl bg-blue-500/30 border border-blue-400/60 text-blue-400 font-bold disabled:opacity-50"
              >
                {isPending || isTxLoading ? '⏳ Processing...' : '💸 Withdraw'}
              </button>

              {txHash && (
                <div className={`p-3 rounded-lg border ${isTxSuccess ? 'bg-green-500/10 border-green-400/40' : 'bg-blue-500/10 border-blue-400/40'}`}>
                  <p className="text-xs text-gray-300 mb-1">{isTxSuccess ? '✅ Success!' : '⏳ Pending...'}</p>
                  <a
                    href={`https://basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 underline break-all"
                  >
                    {txHash}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main AdminTab ──────────────────────────────────────────────────────────────
const ADMIN_TABS = ['Overview', 'Users', 'Contract'];

export function AdminTab() {
  const { data: farcasterUser } = useFarcasterUser();
  const { address: walletAddress } = useAccount();
  const [activeSection, setActiveSection] = useState(0);

  const fid = farcasterUser?.fid;
  const isCreator = fid === CREATOR_FID;

  // Not authenticated
  if (!farcasterUser && !walletAddress) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="text-4xl">🔐</div>
        <p className="text-gray-400 text-sm text-center">Open in Farcaster to access admin</p>
      </div>
    );
  }

  // Not creator
  if (!isCreator || !fid) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="text-4xl">🚫</div>
        <p className="text-gray-300 font-bold">Admin Only</p>
        <p className="text-gray-500 text-sm text-center">This area is restricted to the app creator.</p>
        {fid && <p className="text-gray-600 text-xs font-mono">FID: {fid}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-400/40">
        <span className="text-lg">👑</span>
        <div>
          <p className="text-sm font-bold text-purple-400">Admin Dashboard</p>
          <p className="text-xs text-gray-500">FID {fid}</p>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-800/60 border border-gray-700">
        {ADMIN_TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveSection(i)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSection === i
                ? 'bg-purple-500/30 text-purple-400 border border-purple-400/50'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Section content */}
      {activeSection === 0 && <OverviewSection fid={fid} />}
      {activeSection === 1 && <UsersSection fid={fid} />}
      {activeSection === 2 && <ContractSection />}
    </div>
  );
}
