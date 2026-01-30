'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, H6, P, Button } from '@neynar/ui';
import { useFarcasterUser } from '@/neynar-farcaster-sdk/mini';
import { getTopClaimers, getUserRank, getLeaderboardStats } from '@/db/actions/leaderboard-actions';
import { getRankBadge, getRankStyle } from '@/features/app/utils';
import { useUser, useCastsByUser } from '@/neynar-web-sdk/src/neynar/api-hooks';
import type { Cast } from '@/neynar-web-sdk/src/neynar/api-hooks/sdk-response-types';

interface LeaderboardEntry {
  rank: number;
  fid: number;
  username: string;
  pfpUrl?: string | null;
  totalTYSM: number;
  streakWeek: number;
  tier: string;
}

interface LeaderboardStats {
  maxWeek: number;
  topTysm: number;
  totalClaimers: number;
}

interface UserRank {
  rank: number;
  username: string;
  totalTYSM: number;
  streakWeek: number;
  tier: string;
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

export function LeaderboardTab() {
  const { data: user } = useFarcasterUser();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<UserRank | null>(null);
  const [stats, setStats] = useState<LeaderboardStats>({
    maxWeek: 0,
    topTysm: 0,
    totalClaimers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [topClaimers, leaderboardStats] = await Promise.all([
          getTopClaimers(10),
          getLeaderboardStats(),
        ]);

        setLeaderboard(topClaimers);
        setStats(leaderboardStats);

        // Get user's rank if logged in
        if (user) {
          const userRank = await getUserRank(user.fid);
          setMyRank(userRank);
        }
      } catch (error) {
        console.error('Failed to load leaderboard:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const handleUserClick = useCallback((fid: number, username: string) => {
    setSelectedUser({ fid, username });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="border border-amber-400/70 rounded-xl animate-pulse">
          <CardContent className="p-4">
            <div className="h-24 bg-amber-500/20 rounded"></div>
          </CardContent>
        </Card>
        <Card className="border border-blue-400/70 rounded-xl animate-pulse">
          <CardContent className="p-4">
            <div className="h-64 bg-blue-500/20 rounded"></div>
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

      {/* My Rank Card */}
      {user && myRank && (
        <Card className="border border-amber-400/70 rounded-xl">
          <CardContent className="p-4">
            <H6>Your Ranking</H6>
            <div className="mt-3 flex items-center justify-between p-3 rounded-lg bg-amber-500/20 border border-amber-400/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/30 flex items-center justify-center font-bold text-amber-400">
                  #{myRank.rank}
                </div>
                <div>
                  <P className="font-bold">@{myRank.username}</P>
                  <P className="text-xs opacity-60">{myRank.tier}</P>
                </div>
              </div>
              <div className="text-right">
                <P className="text-xl font-bold text-amber-400">{myRank.totalTYSM}</P>
                <P className="text-xs opacity-50">Week {myRank.streakWeek} streak</P>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not logged in state */}
      {!user && (
        <Card className="border border-amber-400/70 rounded-xl">
          <CardContent className="p-4 text-center">
            <P className="text-2xl mb-2">🔐</P>
            <P className="text-sm opacity-70">Connect to Farcaster to see your ranking</P>
          </CardContent>
        </Card>
      )}

      {/* Top 10 Leaderboard */}
      <Card className="border border-blue-400/70 rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <H6>Top Claimers</H6>
            <P className="text-xs opacity-50">All Time</P>
          </div>

          {leaderboard.length > 0 ? (
            <>
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <button
                    key={entry.fid}
                    onClick={() => handleUserClick(entry.fid, entry.username)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 ${getRankStyle(entry.rank)} hover:opacity-80 transition-opacity text-left`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 text-center font-bold text-lg">
                        {getRankBadge(entry.rank)}
                      </div>
                      <UserAvatar fid={entry.fid} username={entry.username} className="w-8 h-8 rounded-full" />
                      <div>
                        <P className="font-medium text-sm">@{entry.username}</P>
                        <P className="text-xs opacity-50">{entry.tier}</P>
                      </div>
                    </div>
                    <div className="text-right">
                      <P className="text-amber-400 font-bold">{entry.totalTYSM.toLocaleString()}</P>
                      <P className="text-xs opacity-50">W{entry.streakWeek}</P>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-4 text-center">
                <P className="text-xs opacity-50">Tap user to view profile</P>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <P className="text-4xl mb-3">🏆</P>
              <P className="text-amber-400 font-bold">Leaderboard Coming Soon!</P>
              <P className="text-sm opacity-60 mt-1">Be the first to claim and top the charts!</P>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <Card className="border border-amber-400/70 rounded-xl">
        <CardContent className="p-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-black/20 border border-yellow-400/60">
              <P className="text-lg font-bold text-yellow-400">{stats.maxWeek}</P>
              <P className="text-xs opacity-60">Max Week</P>
            </div>
            <div className="p-2 rounded bg-black/20 border border-amber-400/60">
              <P className="text-lg font-bold text-amber-400">{stats.topTysm.toLocaleString()}</P>
              <P className="text-xs opacity-60">Top TYSM</P>
            </div>
            <div className="p-2 rounded bg-black/20 border border-blue-400/60">
              <P className="text-lg font-bold text-blue-400">{stats.totalClaimers}</P>
              <P className="text-xs opacity-60">Claimers</P>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
