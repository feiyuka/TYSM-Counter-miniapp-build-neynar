'use client';

import { useState } from 'react';
import {
  SketchMiniLayout,
  SketchButton,
  SketchCard,
  SketchHeading,
} from '@/components/sketch';

// Mock user data
const mockUser = {
  fid: 12345,
  username: 'alice',
  displayName: 'Alice',
  pfpUrl: 'https://api.dicebear.com/9.x/lorelei/svg?seed=alice',
};

// Mock scores - these need to be BALANCED to qualify
const mockScores = {
  neynarScore: 0.72,
  quotientScore: 0.68,
};

// Check if scores are balanced (within 0.1 difference)
function isBalanced(neynar: number, quotient: number) {
  return Math.abs(neynar - quotient) <= 0.1;
}

// Get tier based on average of balanced scores
function getTier(neynar: number, quotient: number) {
  if (!isBalanced(neynar, quotient)) return null;
  const avg = (neynar + quotient) / 2;
  if (avg >= 0.9) return { name: '🏆 LEGENDARY', color: 'text-yellow-400' };
  if (avg >= 0.75) return { name: '💎 DIAMOND', color: 'text-cyan-400' };
  if (avg >= 0.5) return { name: '🥇 GOLD', color: 'text-amber-400' };
  if (avg >= 0.25) return { name: '🥈 SILVER', color: 'text-gray-300' };
  return { name: '🥉 BRONZE', color: 'text-orange-400' };
}

// Mock streak data
const mockStreak = {
  currentWeek: 2,
  currentDay: 3, // Day 3 of week 2
  totalTYSM: 98, // Accumulated from week 1 + week 2 so far
  todayClaimed: false,
};

export function MiniApp() {
  const [streak, setStreak] = useState(mockStreak);
  const [showHistory, setShowHistory] = useState(false);

  const balanced = isBalanced(mockScores.neynarScore, mockScores.quotientScore);
  const tier = getTier(mockScores.neynarScore, mockScores.quotientScore);
  const difference = Math.abs(mockScores.neynarScore - mockScores.quotientScore);

  // Calculate today's reward: day * week multiplier
  const todayReward = streak.currentDay * streak.currentWeek;
  // Week streak bonus = 7 * week multiplier
  const weekBonus = streak.currentDay === 7 ? 7 * streak.currentWeek : 0;

  const handleCheckIn = () => {
    setStreak((prev) => ({
      ...prev,
      todayClaimed: true,
      totalTYSM: prev.totalTYSM + todayReward + weekBonus,
    }));
  };

  // Generate week preview
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = i + 1;
    const reward = day * streak.currentWeek;
    const isPast = day < streak.currentDay;
    const isToday = day === streak.currentDay;
    const isFuture = day > streak.currentDay;
    return { day, reward, isPast, isToday, isFuture };
  });

  return (
    <SketchMiniLayout title="TYSM Counter" mode="scroll">
      {/* User Profile */}
      <SketchCard padding="md">
        <div className="flex items-center gap-3">
          <img
            src={mockUser.pfpUrl}
            alt={mockUser.displayName}
            className="w-12 h-12 rounded-full border-2 border-purple-400"
          />
          <div className="flex-1">
            <p className="font-bold">{mockUser.displayName}</p>
            <p className="sketch-text text-sm opacity-70">@{mockUser.username}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-400">{streak.totalTYSM}</p>
            <p className="text-xs opacity-60">Total TYSM</p>
          </div>
        </div>
      </SketchCard>

      {/* Score Balance Check */}
      <SketchCard padding="md">
        <SketchHeading level={6}>Score Balance</SketchHeading>
        <div className="mt-3 grid grid-cols-2 gap-4">
          {/* Neynar Score */}
          <div className="text-center p-3 rounded-lg bg-purple-500/20">
            <p className="text-xs opacity-70 mb-1">Neynar Score</p>
            <p className="text-2xl font-bold text-purple-400">
              {mockScores.neynarScore.toFixed(2)}
            </p>
          </div>
          {/* Quotient Score */}
          <div className="text-center p-3 rounded-lg bg-blue-500/20">
            <p className="text-xs opacity-70 mb-1">Quotient Score</p>
            <p className="text-2xl font-bold text-blue-400">
              {mockScores.quotientScore.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Balance Status */}
        <div className={`mt-4 p-3 rounded-lg text-center ${
          balanced ? 'bg-green-500/20 border border-green-400' : 'bg-red-500/20 border border-red-400'
        }`}>
          {balanced ? (
            <>
              <p className="text-green-400 font-bold">✅ BALANCED</p>
              <p className="sketch-text text-sm opacity-70">
                Difference: {(difference * 100).toFixed(1)}% (max 10%)
              </p>
            </>
          ) : (
            <>
              <p className="text-red-400 font-bold">❌ NOT BALANCED</p>
              <p className="sketch-text text-sm opacity-70">
                Difference: {(difference * 100).toFixed(1)}% — needs ≤10%
              </p>
            </>
          )}
        </div>

        {/* Tier Display */}
        {tier ? (
          <div className="mt-3 text-center">
            <p className="text-xs opacity-60">Your Tier</p>
            <p className={`text-xl font-bold ${tier.color}`}>{tier.name}</p>
          </div>
        ) : (
          <div className="mt-3 text-center">
            <p className="text-xs opacity-60">Your Tier</p>
            <p className="text-lg font-bold text-gray-500">⚠️ No Tier (Unbalanced)</p>
          </div>
        )}
      </SketchCard>

      {/* Daily Check-in */}
      <SketchCard padding="md">
        <div className="flex items-center justify-between mb-3">
          <SketchHeading level={6}>Daily Check-in</SketchHeading>
          <div className="text-right">
            <p className="text-sm font-bold text-purple-400">Week {streak.currentWeek}</p>
            <p className="text-xs opacity-60">{streak.currentWeek}x Multiplier</p>
          </div>
        </div>

        {/* Week Progress */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {weekDays.map(({ day, reward, isPast, isToday, isFuture }) => (
            <div
              key={day}
              className={`text-center p-2 rounded-lg ${
                isPast
                  ? 'bg-green-500/30 border border-green-400'
                  : isToday
                  ? 'bg-purple-500/30 border-2 border-purple-400'
                  : 'bg-gray-500/20 opacity-50'
              }`}
            >
              <p className="text-xs opacity-70">D{day}</p>
              <p className={`text-sm font-bold ${isPast ? 'text-green-400' : isToday ? 'text-purple-400' : ''}`}>
                {isPast ? '✓' : `+${reward}`}
              </p>
            </div>
          ))}
        </div>

        {/* Week Bonus Indicator */}
        <div className="text-center p-2 rounded-lg bg-yellow-500/20 border border-yellow-400/50 mb-4">
          <p className="text-xs opacity-70">Week {streak.currentWeek} Streak Bonus</p>
          <p className="text-lg font-bold text-yellow-400">+{7 * streak.currentWeek} TYSM</p>
          <p className="text-xs opacity-50">Complete all 7 days to claim!</p>
        </div>

        {/* Today's Reward & Check-in Button */}
        {balanced ? (
          !streak.todayClaimed ? (
            <div className="text-center">
              <p className="sketch-text text-sm mb-2">Today's Reward</p>
              <p className="text-3xl font-bold text-green-400 mb-3">+{todayReward} TYSM</p>
              <SketchButton variant="primary" onClick={handleCheckIn}>
                🎁 Check In Day {streak.currentDay}
              </SketchButton>
            </div>
          ) : (
            <div className="text-center p-4 bg-green-500/20 rounded-lg border border-green-400">
              <p className="text-green-400 font-bold text-lg">✅ Checked In!</p>
              <p className="sketch-text text-sm opacity-70">+{todayReward} TYSM earned</p>
              <p className="sketch-text text-xs opacity-50 mt-2">Come back tomorrow!</p>
            </div>
          )
        ) : (
          <div className="text-center p-4 bg-red-500/20 rounded-lg border border-red-400">
            <p className="text-red-400 font-bold">🚫 Check-in Locked</p>
            <p className="sketch-text text-sm opacity-70">Balance your scores to unlock daily rewards</p>
          </div>
        )}
      </SketchCard>

      {/* Streak History Toggle */}
      <SketchButton variant="outline" onClick={() => setShowHistory(!showHistory)}>
        {showHistory ? 'Hide Streak Info' : 'How Streaks Work'}
      </SketchButton>

      {showHistory && (
        <SketchCard padding="sm">
          <SketchHeading level={6}>Streak System</SketchHeading>
          <div className="mt-2 space-y-2 text-sm">
            <div className="p-2 rounded bg-black/20">
              <p className="font-bold text-purple-400">Week 1 (1x)</p>
              <p className="sketch-text opacity-70">1+2+3+4+5+6+7 = 28 + 7 bonus = 35 TYSM</p>
            </div>
            <div className="p-2 rounded bg-black/20">
              <p className="font-bold text-purple-400">Week 2 (2x)</p>
              <p className="sketch-text opacity-70">2+4+6+8+10+12+14 = 56 + 14 bonus = 70 TYSM</p>
            </div>
            <div className="p-2 rounded bg-black/20">
              <p className="font-bold text-purple-400">Week 3 (3x)</p>
              <p className="sketch-text opacity-70">3+6+9+12+15+18+21 = 84 + 21 bonus = 105 TYSM</p>
            </div>
            <p className="sketch-text text-xs opacity-50 mt-2">
              Miss a day? Streak resets to Week 1, Day 1!
            </p>
          </div>
        </SketchCard>
      )}

      {/* Share Button */}
      {streak.todayClaimed && (
        <div className="mt-2">
          <SketchButton variant="secondary">Share My Progress</SketchButton>
        </div>
      )}
    </SketchMiniLayout>
  );
}
