'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, H6, P } from '@neynar/ui';

interface PoolStats {
  totalPool: number;
  remainingPool: number;
  totalClaimed: number;
  totalClaimers: number;
}

interface LiveClaim {
  id: string;
  fid: number;
  username: string;
  pfpUrl?: string | null;
  amount: number;
  txHash: string;
  createdAt: Date;
  time: string;
}

export function LiveClaimsTab() {
  const [pool, setPool] = useState<PoolStats>({
    totalPool: 0,
    remainingPool: 0,
    totalClaimed: 0,
    totalClaimers: 0,
  });
  const [claims, setClaims] = useState<LiveClaim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const res = await fetch('/api/live-claims');
        const data = await res.json();
        if (!mounted) return;
        if (data.stats) setPool(data.stats);
        if (data.claims) setClaims(data.claims as LiveClaim[]);
      } catch (e) {
        console.error('LiveClaimsTab error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    const interval = setInterval(loadData, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Card key={i} className="border border-amber-400/30 rounded-xl animate-pulse">
            <CardContent className="p-4"><div className="h-24 bg-amber-500/10 rounded" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const poolPct = pool.totalPool > 0
    ? Math.min((pool.remainingPool / pool.totalPool) * 100, 100)
    : 100;

  return (
    <div className="space-y-3">

      {/* Pool Stats */}
      <Card className="border border-amber-400/70 rounded-xl">
        <CardContent className="p-4">
          <div className="text-center mb-3">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <P className="text-xs text-gray-400">Live Pool Balance</P>
            </div>
            <P className="text-3xl font-bold text-amber-400">
              {pool.remainingPool > 0 ? pool.remainingPool.toLocaleString() : '—'}
            </P>
            <P className="text-xs text-gray-500">TYSM in contract</P>
          </div>

          {pool.totalPool > 0 && (
            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
                style={{ width: `${poolPct}%` }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2 rounded-lg bg-black/30 border border-yellow-400/40">
              <P className="text-lg font-bold text-yellow-400">{pool.totalClaimed.toLocaleString()}</P>
              <P className="text-xs text-gray-400">Total Claimed</P>
            </div>
            <div className="p-2 rounded-lg bg-black/30 border border-blue-400/40">
              <P className="text-lg font-bold text-blue-400">{pool.totalClaimers.toLocaleString()}</P>
              <P className="text-xs text-gray-400">Claimers</P>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Feed */}
      <Card className="border border-blue-400/70 rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <H6>Recent Claims</H6>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <P className="text-xs text-red-400 font-bold">LIVE</P>
            </div>
          </div>

          {claims.length > 0 ? (
            <div className="space-y-2">
              {claims.map((claim) => (
                <div
                  key={claim.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-amber-500/10 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={claim.pfpUrl || `https://api.dicebear.com/9.x/lorelei/svg?seed=${claim.username}`}
                      alt={claim.username}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <P className="font-medium text-sm truncate">@{claim.username}</P>
                      <P className="text-xs text-gray-500">{claim.time}</P>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <P className="text-amber-400 font-bold text-sm">{claim.amount.toLocaleString()}</P>
                    <button
                      onClick={() => window.open(`https://basescan.org/tx/${claim.txHash}`, '_blank')}
                      className="text-xs text-blue-400 underline"
                    >
                      {claim.txHash.slice(0, 6)}…
                    </button>
                  </div>
                </div>
              ))}
              <P className="text-xs text-center text-gray-500 pt-1">Refreshes every 30s</P>
            </div>
          ) : (
            <div className="text-center py-8">
              <P className="text-4xl mb-3">🌟</P>
              <P className="font-bold text-amber-400">No claims yet</P>
              <P className="text-sm text-gray-400 mt-1">Be the first to check in!</P>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract link */}
      <div className="text-center">
        <button
          onClick={() => window.open('https://basescan.org/address/0xfEfcF3c2Aa08c6FF0BA3BD40ffEAD1F860A93d91', '_blank')}
          className="text-xs text-blue-400 underline"
        >
          View TYSM contract on BaseScan →
        </button>
      </div>

    </div>
  );
}
