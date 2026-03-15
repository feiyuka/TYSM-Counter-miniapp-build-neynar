'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, H6, P, Button } from '@neynar/ui';
import { getRecentClaims, getPoolStats } from '@/db/actions/claim-actions';
import { useUser, useCastsByUser } from '@/neynar-web-sdk/src/neynar/api-hooks';
import type { Cast } from '@/neynar-web-sdk/src/neynar/api-hooks/sdk-response-types';

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

interface SelectedUser {
  fid: number;
  username: string;
}

// Real-time User Avatar Component - fetches live photo from Neynar
function UserAvatar({ fid, username, className }: { fid: number; username: string; className?: string }) {
  const { data: userData } = useUser(fid);
  const fallbackUrl = `https://api.dicebear.com/9.x/lorelei/svg?seed=${username}`;

  return (
    <img
      src={userData?.pfp_url || fallbackUrl}
      alt={username}
      className={className || "w-8 h-8 rounded-full"}
    />
  );
}

// User Profile Popup Component
function UserProfilePopup({
  user,
  onClose
}: {
  user: SelectedUser;
  onClose: () => void;
}) {
  const { data: userData, isLoading: userLoading } = useUser(user.fid);
  const { data: castsData, isLoading: castsLoading } = useCastsByUser(user.fid, { limit: 3 });

  const visitProfile = () => {
    window.open(`https://warpcast.com/${user.username}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-blue-400/70 max-h-[80vh] overflow-y-auto w-full max-w-sm">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <H6>👤 Profile</H6>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
          </div>

          {userLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-24" />
                  <div className="h-3 bg-gray-700 rounded w-16" />
                </div>
              </div>
            </div>
          ) : userData ? (
            <>
              {/* User Info */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/20 border border-blue-400/60 mb-4">
                <img
                  src={userData.pfp_url || `https://api.dicebear.com/9.x/lorelei/svg?seed=${userData.username}`}
                  alt={userData.display_name || userData.username}
                  className="w-16 h-16 rounded-full border-2 border-blue-400/60"
                />
                <div className="flex-1">
                  <P className="font-bold text-lg">{userData.display_name || userData.username}</P>
                  <P className="text-sm text-blue-400">@{userData.username}</P>
                  <P className="text-xs opacity-60 font-mono">FID: {userData.fid}</P>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div className="p-2 rounded bg-black/20 border border-gray-600">
                  <P className="text-lg font-bold text-white">{userData.follower_count?.toLocaleString() || 0}</P>
                  <P className="text-xs opacity-60">Followers</P>
                </div>
                <div className="p-2 rounded bg-black/20 border border-gray-600">
                  <P className="text-lg font-bold text-white">{userData.following_count?.toLocaleString() || 0}</P>
                  <P className="text-xs opacity-60">Following</P>
                </div>
                <div className="p-2 rounded bg-black/20 border border-gray-600">
                  <P className="text-lg font-bold text-white">{userData.power_badge ? '⚡' : '👤'}</P>
                  <P className="text-xs opacity-60">Badge</P>
                </div>
              </div>

              {/* Bio */}
              {userData.profile?.bio?.text && (
                <div className="p-3 rounded-lg bg-black/20 border border-gray-600 mb-4">
                  <P className="text-sm opacity-80">{userData.profile.bio.text}</P>
                </div>
              )}

              {/* Recent Casts */}
              <P className="text-xs font-bold text-amber-400 mb-2">📝 Recent Casts</P>
              {castsLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-16 bg-gray-700 rounded" />
                  <div className="h-16 bg-gray-700 rounded" />
                </div>
              ) : castsData?.pages?.[0]?.items && castsData.pages[0].items.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {castsData.pages[0].items.slice(0, 3).map((cast: Cast) => (
                    <div key={cast.hash} className="p-2 rounded bg-black/20 border border-gray-600">
                      <P className="text-sm opacity-80 line-clamp-2">{cast.text}</P>
                      <P className="text-xs opacity-40 mt-1">
                        {new Date(cast.timestamp).toLocaleDateString()}
                      </P>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded bg-black/20 border border-gray-600 mb-4 text-center">
                  <P className="text-sm opacity-60">No recent casts</P>
                </div>
              )}

              {/* Visit Profile Button */}
              <Button onClick={visitProfile} className="w-full">
                🔗 Visit Profile on Warpcast
              </Button>
            </>
          ) : (
            <div className="text-center py-4">
              <P className="text-sm opacity-60">Could not load profile</P>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function LiveClaimsTab() {
  const [pool, setPool] = useState<PoolStats>({
    totalPool: 1000000,
    remainingPool: 1000000,
    totalClaimed: 0,
    totalClaimers: 0,
  });
  const [claims, setClaims] = useState<LiveClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [poolData, claimsData] = await Promise.all([
          getPoolStats(),
          getRecentClaims(10),
        ]);
        setPool(poolData);
        setClaims(claimsData as LiveClaim[]);
      } catch (error) {
        console.error('Failed to load live claims:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const poolPercentage = ((pool.remainingPool / pool.totalPool) * 100).toFixed(1);

  const openTxInBrowser = (txHash: string) => {
    window.open(`https://basescan.org/tx/${txHash}`, '_blank');
  };

  const handleUserClick = useCallback((fid: number, username: string) => {
    setSelectedUser({ fid, username });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="border border-amber-400/70 rounded-xl animate-pulse">
          <CardContent className="p-4">
            <div className="h-32 bg-amber-500/20 rounded"></div>
          </CardContent>
        </Card>
        <Card className="border border-blue-400/70 rounded-xl animate-pulse">
          <CardContent className="p-4">
            <div className="h-48 bg-blue-500/20 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* User Profile Popup */}
      {selectedUser && (
        <UserProfilePopup
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* Pool Stats */}
      <Card className="border border-amber-400/70 rounded-xl">
        <CardContent className="p-4">
          <div className="text-center mb-4">
            <P className="text-xs opacity-60 mb-1">TYSM Reward Pool</P>
            <P className="text-3xl font-bold text-amber-400">
              {pool.remainingPool.toLocaleString()}
            </P>
            <P className="text-xs opacity-50">of {pool.totalPool.toLocaleString()} TYSM</P>
          </div>

          <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
              style={{ width: `${poolPercentage}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-2 rounded bg-black/20 border border-yellow-400/60">
              <P className="text-lg font-bold text-yellow-400">{pool.totalClaimed.toLocaleString()}</P>
              <P className="text-xs opacity-60">Total Claimed</P>
            </div>
            <div className="p-2 rounded bg-black/20 border border-blue-400/60">
              <P className="text-lg font-bold text-blue-400">{pool.totalClaimers.toLocaleString()}</P>
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

          {claims.length > 0 ? (
            <>
              <div className="space-y-2">
                {claims.map((claim) => (
                  <div
                    key={claim.id}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-blue-500/20 transition-colors border border-amber-400/60"
                  >
                    <button
                      onClick={() => handleUserClick(claim.fid, claim.username)}
                      className="flex items-center gap-3 text-left"
                    >
                      <UserAvatar fid={claim.fid} username={claim.username} className="w-8 h-8 rounded-full" />
                      <div>
                        <P className="font-medium text-sm">@{claim.username}</P>
                        <P className="text-xs opacity-50">{claim.time}</P>
                      </div>
                    </button>
                    <div className="text-right">
                      <P className="text-amber-400 font-bold">+{claim.amount} TYSM</P>
                      <button
                        onClick={() => openTxInBrowser(claim.txHash)}
                        className="text-xs text-blue-400 underline"
                      >
                        {claim.txHash.slice(0, 6)}...{claim.txHash.slice(-4)}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <P className="text-xs opacity-50">Tap user to view profile • Auto-refreshes every 30s</P>
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
              onClick={() => window.open('https://basescan.org', '_blank')}
              className="text-xs text-blue-400 underline"
            >
              View on BaseScan →
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
