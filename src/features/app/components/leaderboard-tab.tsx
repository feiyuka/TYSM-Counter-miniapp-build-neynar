'use client';

import { Card, CardContent, H6, P } from '@neynar/ui';
import { MOCK_LEADERBOARD } from '@/data/mocks';
import { getRankBadge, getRankStyle } from '@/features/app/utils';

export function LeaderboardTab() {
  const myRank = { rank: 42, username: 'alice', totalTYSM: 98, streakWeek: 2, tier: '🥇 GOLD' };

  return (
    <div className="space-y-4">
      {/* My Rank Card */}
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

      {/* Top 10 Leaderboard */}
      <Card className="border border-blue-400/70 rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <H6>Top Claimers</H6>
            <P className="text-xs opacity-50">All Time</P>
          </div>

          {MOCK_LEADERBOARD.length > 0 ? (
            <div className="space-y-2">
              {MOCK_LEADERBOARD.map((user) => (
                <div
                  key={user.rank}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 ${getRankStyle(user.rank)}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-center font-bold text-lg">
                      {getRankBadge(user.rank)}
                    </div>
                    <img
                      src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${user.username}`}
                      alt={user.username}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <P className="font-medium text-sm">@{user.username}</P>
                      <P className="text-xs opacity-50">{user.tier}</P>
                    </div>
                  </div>
                  <div className="text-right">
                    <P className="text-amber-400 font-bold">{user.totalTYSM.toLocaleString()}</P>
                    <P className="text-xs opacity-50">W{user.streakWeek}</P>
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
              <P className="text-lg font-bold text-yellow-400">0</P>
              <P className="text-xs opacity-60">Max Week</P>
            </div>
            <div className="p-2 rounded bg-black/20 border border-amber-400/60">
              <P className="text-lg font-bold text-amber-400">0</P>
              <P className="text-xs opacity-60">Top $TYSM</P>
            </div>
            <div className="p-2 rounded bg-black/20 border border-blue-400/60">
              <P className="text-lg font-bold text-blue-400">0</P>
              <P className="text-xs opacity-60">Claimers</P>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
