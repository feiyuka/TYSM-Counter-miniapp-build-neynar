'use client';

import { Card, CardContent, H6, P } from '@neynar/ui';
import { MOCK_POOL, MOCK_LIVE_CLAIMS } from '@/data/mocks';

export function LiveClaimsTab() {
  const poolPercentage = ((MOCK_POOL.remainingPool / MOCK_POOL.totalPool) * 100).toFixed(1);

  const openTxInBrowser = (txHash: string) => {
    const fullHash = txHash.replace('...', '0'.repeat(54));
    window.open(`https://basescan.org/tx/${fullHash}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Pool Stats */}
      <Card className="border border-amber-400/70 rounded-xl">
        <CardContent className="p-4">
          <div className="text-center mb-4">
            <P className="text-xs opacity-60 mb-1">$TYSM Reward Pool</P>
            <P className="text-3xl font-bold text-amber-400">
              {MOCK_POOL.remainingPool.toLocaleString()}
            </P>
            <P className="text-xs opacity-50">of {MOCK_POOL.totalPool.toLocaleString()} $TYSM</P>
          </div>

          <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
              style={{ width: `${poolPercentage}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-2 rounded bg-black/20 border border-yellow-400/60">
              <P className="text-lg font-bold text-yellow-400">{MOCK_POOL.totalClaimed.toLocaleString()}</P>
              <P className="text-xs opacity-60">Total Claimed</P>
            </div>
            <div className="p-2 rounded bg-black/20 border border-blue-400/60">
              <P className="text-lg font-bold text-blue-400">{MOCK_POOL.totalClaimers.toLocaleString()}</P>
              <P className="text-xs opacity-60">Total Claimers</P>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Claims Feed */}
      <Card className="border border-blue-400/70 rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <H6>Live Claims</H6>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <P className="text-xs text-red-400">LIVE</P>
            </div>
          </div>

          {MOCK_LIVE_CLAIMS.length > 0 ? (
            <>
              <div className="space-y-2">
                {MOCK_LIVE_CLAIMS.map((claim, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors border border-amber-400/60"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${claim.username}`}
                        alt={claim.username}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <P className="font-medium text-sm">@{claim.username}</P>
                        <P className="text-xs opacity-50">{claim.time}</P>
                      </div>
                    </div>
                    <div className="text-right">
                      <P className="text-amber-400 font-bold">+{claim.amount} $TYSM</P>
                      <button
                        onClick={() => openTxInBrowser(claim.txHash)}
                        className="text-xs text-blue-400 underline"
                      >
                        {claim.txHash}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <P className="text-xs opacity-50">Showing latest 5 claims</P>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <P className="text-4xl mb-3">🌟</P>
              <P className="text-amber-400 font-bold">Be the First!</P>
              <P className="text-sm opacity-60 mt-1">No claims yet. Start your streak and be the pioneer!</P>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pool Info */}
      <Card className="border border-green-400/70 rounded-xl">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <P className="text-xs opacity-70">Base Network</P>
            </div>
            <button
              onClick={() => window.open('https://basescan.org/token/0xTYSMTOKEN', '_blank')}
              className="text-xs text-blue-400 underline"
            >
              View Contract →
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
