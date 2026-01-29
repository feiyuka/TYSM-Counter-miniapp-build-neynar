'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, H6, P } from '@neynar/ui';
import { useFarcasterUser } from '@/neynar-farcaster-sdk/mini';
import { getTopClaimers, getUserRank, getLeaderboardStats } from '@/db/actions/leaderboard-actions';
import { getRankBadge, getRankStyle } from '@/features/app/utils';

interface LeaderboardEntry {
  rank: number;
  fid: number;
  username: string;
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
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <div
                  key={entry.fid}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 ${getRankStyle(entry.rank)}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-center font-bold text-lg">
                      {getRankBadge(entry.rank)}
                    </div>
                    <img
                      src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${entry.username}`}
                      alt={entry.username}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <P className="font-medium text-sm">@{entry.username}</P>
                      <P className="text-xs opacity-50">{entry.tier}</P>
                    </div>
                  </div>
                  <div className="text-right">
                    <P className="text-amber-400 font-bold">{entry.totalTYSM.toLocaleString()}</P>
                    <P className="text-xs opacity-50">W{entry.streakWeek}</P>
                  </div>
                </div>
              ))}
            </div>
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
