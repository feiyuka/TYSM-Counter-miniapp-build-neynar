'use client';

import { useState, useEffect } from 'react';
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
  walletAddress: '0x1234...5678',
};

// Mock scores - these need to be BALANCED to qualify
const mockScores = {
  neynarScore: 0.72,
  quotientScore: 0.68,
};

// Mock onchain data - fresh user on Week 1, Day 3
const mockOnchain = {
  tysmBalance: 6, // 1+2+3 = 6 $TYSM so far
  lastCheckIn: '2024-01-14',
  streakDay: 3,
  streakWeek: 1, // Week 1 (fresh user)
  totalStreakDays: 3, // Total consecutive days (for milestone tracking)
};

// Mock pool & live claims data
const mockPool = {
  totalPool: 1000000,
  remainingPool: 847523,
  totalClaimed: 152477,
  totalClaimers: 3847,
};

// Mock live claims feed
const mockLiveClaims = [
  { username: 'dwr.eth', amount: 14, time: '2s ago', txHash: '0xabc123...' },
  { username: 'vitalik', amount: 21, time: '15s ago', txHash: '0xdef456...' },
  { username: 'jessepollak', amount: 8, time: '32s ago', txHash: '0xghi789...' },
  { username: 'linda', amount: 6, time: '1m ago', txHash: '0xjkl012...' },
  { username: 'ted', amount: 12, time: '2m ago', txHash: '0xmno345...' },
];

// Mock leaderboard data
const mockLeaderboard = [
  { rank: 1, username: 'dwr.eth', totalTYSM: 4850, streakWeek: 12, tier: '🏆 LEGENDARY' },
  { rank: 2, username: 'vitalik', totalTYSM: 3920, streakWeek: 10, tier: '🏆 LEGENDARY' },
  { rank: 3, username: 'jessepollak', totalTYSM: 3100, streakWeek: 8, tier: '💎 DIAMOND' },
  { rank: 4, username: 'linda', totalTYSM: 2450, streakWeek: 7, tier: '💎 DIAMOND' },
  { rank: 5, username: 'ted', totalTYSM: 1890, streakWeek: 6, tier: '🥇 GOLD' },
  { rank: 6, username: 'ccarella', totalTYSM: 1560, streakWeek: 5, tier: '🥇 GOLD' },
  { rank: 7, username: 'ace', totalTYSM: 1230, streakWeek: 4, tier: '🥇 GOLD' },
  { rank: 8, username: 'brenner', totalTYSM: 980, streakWeek: 4, tier: '🥈 SILVER' },
  { rank: 9, username: 'phil', totalTYSM: 750, streakWeek: 3, tier: '🥈 SILVER' },
  { rank: 10, username: 'sarah', totalTYSM: 620, streakWeek: 3, tier: '🥈 SILVER' },
];

// Mock onchain shows user is on Week 2, Day 3
// But for fresh user demo, let's show Week 1 in progress
// Change mockOnchain to Week 1, Day 3 for better demo
const mockClaimHistory: { week: number; claimed: number; completed: boolean }[] = [
  // Empty - no completed weeks yet (user is still on Week 1)
];

// Milestone rewards (1 month streak bonuses)
// These are one-time bonuses at the end of first month
const MILESTONES = [
  { day: 29, bonus: 500, label: 'Day 29' },
  { day: 30, bonus: 1000, label: '1 Month! 🎉' },
];

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

// Calculate time until next check-in (00:00 UTC)
function getTimeUntilReset() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds, total: diff };
}

function CheckInTab() {
  const [onchain, setOnchain] = useState(mockOnchain);
  const [showHistory, setShowHistory] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [todayClaimed, setTodayClaimed] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(getTimeUntilReset());
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [claimedReward, setClaimedReward] = useState(0);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getTimeUntilReset());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const balanced = isBalanced(mockScores.neynarScore, mockScores.quotientScore);
  const tier = getTier(mockScores.neynarScore, mockScores.quotientScore);
  const difference = Math.abs(mockScores.neynarScore - mockScores.quotientScore);

  const todayReward = onchain.streakDay * onchain.streakWeek;
  const isLastDayOfWeek = onchain.streakDay === 7;
  const weekBonus = isLastDayOfWeek ? 7 * onchain.streakWeek : 0;

  // Check if today is a milestone day
  const nextMilestone = MILESTONES.find((m) => m.day > onchain.totalStreakDays);
  const todayMilestone = MILESTONES.find((m) => m.day === onchain.totalStreakDays + 1);

  const handleCheckInClick = () => {
    setShowConfirmPopup(true);
  };

  const handleConfirmCheckIn = async () => {
    setShowConfirmPopup(false);
    setTxPending(true);
    await new Promise((r) => setTimeout(r, 2000));
    const mockTxHash = '0x' + Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    setTxHash(mockTxHash);
    const totalReward = todayReward + weekBonus + (todayMilestone?.bonus || 0);
    setClaimedReward(totalReward);
    setOnchain((prev) => ({
      ...prev,
      tysmBalance: prev.tysmBalance + totalReward,
      lastCheckIn: new Date().toISOString().split('T')[0],
      streakDay: isLastDayOfWeek ? 1 : prev.streakDay + 1,
      streakWeek: isLastDayOfWeek ? prev.streakWeek + 1 : prev.streakWeek,
      totalStreakDays: prev.totalStreakDays + 1,
    }));
    setTxPending(false);
    setTodayClaimed(true);
    setShowSuccessPopup(true);
  };

  const openTxInBrowser = () => {
    if (txHash) {
      window.open(`https://basescan.org/tx/${txHash}`, '_blank');
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = i + 1;
    const reward = day * onchain.streakWeek;
    const isPast = day < onchain.streakDay;
    const isToday = day === onchain.streakDay;
    return { day, reward, isPast, isToday };
  });

  return (
    <div className="space-y-4">
      {/* User Profile with Wallet */}
      <SketchCard padding="md" className="border-[3px] border-amber-400 rounded-xl">
        <div className="flex items-center gap-3">
          <img
            src={mockUser.pfpUrl}
            alt={mockUser.displayName}
            className="w-12 h-12 rounded-full border-2 border-amber-400"
          />
          <div className="flex-1">
            <p className="font-bold">{mockUser.displayName}</p>
            <p className="sketch-text text-xs opacity-70 font-mono">{mockUser.walletAddress}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-400">{onchain.tysmBalance}</p>
            <p className="text-xs opacity-60">$TYSM Balance</p>
          </div>
        </div>
      </SketchCard>

      {/* Countdown Timer - Next Check-in */}
      {todayClaimed && (
        <SketchCard padding="sm" className="border-[3px] border-blue-400 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">⏰</span>
              <p className="text-sm opacity-70">Next check-in in</p>
            </div>
            <div className="flex gap-2 font-mono">
              <div className="bg-amber-500/30 px-2 py-1 rounded text-center">
                <p className="text-lg font-bold text-amber-400">{String(countdown.hours).padStart(2, '0')}</p>
                <p className="text-xs opacity-50">hr</p>
              </div>
              <p className="text-lg font-bold self-start mt-1">:</p>
              <div className="bg-amber-500/30 px-2 py-1 rounded text-center">
                <p className="text-lg font-bold text-amber-400">{String(countdown.minutes).padStart(2, '0')}</p>
                <p className="text-xs opacity-50">min</p>
              </div>
              <p className="text-lg font-bold self-start mt-1">:</p>
              <div className="bg-amber-500/30 px-2 py-1 rounded text-center">
                <p className="text-lg font-bold text-amber-400">{String(countdown.seconds).padStart(2, '0')}</p>
                <p className="text-xs opacity-50">sec</p>
              </div>
            </div>
          </div>
        </SketchCard>
      )}

      {/* Streak Reminder Warning */}
      {!todayClaimed && countdown.total < 3600000 && (
        <SketchCard padding="sm" className="border-[3px] border-yellow-400 rounded-xl">
          <div className="flex items-center gap-3 text-yellow-400">
            <span className="text-2xl animate-bounce">🔔</span>
            <div>
              <p className="font-bold">Don't lose your streak!</p>
              <p className="text-xs opacity-70">
                Only {countdown.hours}h {countdown.minutes}m left to check in today
              </p>
            </div>
          </div>
        </SketchCard>
      )}

      {/* Score Balance Check */}
      <SketchCard padding="md" className="border-[3px] border-blue-400 rounded-xl">
        <SketchHeading level={6}>Score Balance</SketchHeading>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-amber-500/20 border-2 border-amber-400/60">
            <p className="text-xs opacity-70 mb-1">Neynar Score</p>
            <p className="text-2xl font-bold text-amber-400">
              {mockScores.neynarScore.toFixed(2)}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-500/20 border-2 border-blue-400/60">
            <p className="text-xs opacity-70 mb-1">Quotient Score</p>
            <p className="text-2xl font-bold text-blue-400">
              {mockScores.quotientScore.toFixed(2)}
            </p>
          </div>
        </div>

        <div className={`mt-4 p-3 rounded-lg text-center ${
          balanced ? 'bg-green-500/20 border-2 border-green-400' : 'bg-red-500/20 border-2 border-red-400'
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

      {/* Daily Onchain Check-in */}
      <SketchCard padding="md" className="border-[3px] border-amber-400 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <SketchHeading level={6}>Daily Check-in</SketchHeading>
            <p className="text-xs opacity-50 mt-1">🔗 Onchain rewards</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-amber-400">Week {onchain.streakWeek}</p>
            <p className="text-xs opacity-60">{onchain.streakWeek}x Multiplier</p>
          </div>
        </div>

        {balanced ? (
          !todayClaimed ? (
            <div className="text-center">
              {txPending ? (
                <div className="p-4">
                  <span className="text-4xl animate-spin inline-block">⏳</span>
                  <p className="text-sm opacity-70 mt-2">Confirming transaction...</p>
                </div>
              ) : (
                <SketchButton variant="primary" onClick={handleCheckInClick}>
                  🔥 Check In
                </SketchButton>
              )}
            </div>
          ) : (
            <div className="text-center p-4 bg-green-500/20 rounded-lg border-2 border-green-400">
              <p className="text-green-400 font-bold text-lg">✅ Checked In!</p>
              <p className="sketch-text text-xs opacity-50 mt-1">Come back tomorrow</p>
            </div>
          )
        ) : (
          <div className="text-center p-4 bg-red-500/20 rounded-lg border-2 border-red-400">
            <p className="text-red-400 font-bold">🚫 Check-in Locked</p>
            <p className="sketch-text text-sm opacity-70">Balance your scores to unlock</p>
          </div>
        )}
      </SketchCard>

      {/* Confirm Check-in Popup */}
      {showConfirmPopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <SketchCard padding="md">
            <div className="text-center">
              <p className="text-4xl mb-3">🔗</p>
              <SketchHeading level={5}>Check In Onchain?</SketchHeading>
              <p className="sketch-text text-sm opacity-70 mt-2 mb-4">
                This will send a transaction to Base Network
              </p>
              <div className="p-3 rounded-lg bg-amber-500/20 mb-4">
                <p className="text-xs opacity-60">Today's Reward</p>
                <p className="text-2xl font-bold text-amber-400">{todayReward} $TYSM</p>
                {isLastDayOfWeek && (
                  <p className="text-sm text-yellow-400">{weekBonus} week bonus</p>
                )}
                {todayMilestone && (
                  <p className="text-sm text-orange-400">{todayMilestone.bonus} milestone bonus</p>
                )}
              </div>
              <div className="flex gap-2">
                <SketchButton variant="outline" onClick={() => setShowConfirmPopup(false)}>
                  Cancel
                </SketchButton>
                <SketchButton variant="primary" onClick={handleConfirmCheckIn}>
                  Confirm
                </SketchButton>
              </div>
            </div>
          </SketchCard>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <SketchCard padding="md">
            <div className="text-center">
              <p className="text-5xl mb-3">🎉</p>
              <SketchHeading level={5}>Claim Successful!</SketchHeading>
              <div className="p-4 rounded-lg bg-amber-500/20 border border-amber-400 my-4">
                <p className="text-3xl font-bold text-amber-400">{claimedReward} $TYSM</p>
                <p className="text-xs opacity-60 mt-1">sent to your wallet</p>
              </div>
              {txHash && (
                <div className="p-2 bg-black/30 rounded mb-4">
                  <p className="text-xs opacity-50 mb-1">Transaction Hash</p>
                  <p className="text-xs font-mono text-green-300 break-all">
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </p>
                  <button
                    onClick={openTxInBrowser}
                    className="mt-2 text-xs text-blue-400 underline"
                  >
                    View on BaseScan →
                  </button>
                </div>
              )}
              <SketchButton variant="primary" onClick={() => setShowSuccessPopup(false)}>
                Done
              </SketchButton>
            </div>
          </SketchCard>
        </div>
      )}

      {/* 1 Month Milestone Progress */}
      <SketchCard padding="md" className="border-[3px] border-amber-400 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <SketchHeading level={6}>1 Month Milestones</SketchHeading>
          <p className="text-sm font-bold text-amber-400">Day {onchain.totalStreakDays}</p>
        </div>

        {/* Progress Bar - capped at 30 for display */}
        <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-amber-400 transition-all"
            style={{ width: `${Math.min((onchain.totalStreakDays / 30) * 100, 100)}%` }}
          />
        </div>

        {/* Milestone Markers */}
        <div className="space-y-2">
          {MILESTONES.map((milestone) => {
            const achieved = onchain.totalStreakDays >= milestone.day;
            const isNext = nextMilestone?.day === milestone.day;
            return (
              <div
                key={milestone.day}
                className={`flex items-center justify-between p-2 rounded ${
                  achieved
                    ? 'bg-green-500/20 border-2 border-green-400'
                    : isNext
                    ? 'bg-yellow-500/20 border-2 border-yellow-400'
                    : 'bg-black/20 border-2 border-gray-500/50 opacity-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{achieved ? '✅' : isNext ? '🎯' : '⬜'}</span>
                  <span className="text-sm font-medium">{milestone.label}</span>
                  <span className="text-xs opacity-50">Day {milestone.day}</span>
                </div>
                <span className={`font-bold ${achieved ? 'text-green-400' : isNext ? 'text-yellow-400' : ''}`}>
                  {milestone.bonus} $TYSM
                </span>
              </div>
            );
          })}
        </div>

        {nextMilestone ? (
          <p className="text-xs text-center opacity-50 mt-3">
            {nextMilestone.day - onchain.totalStreakDays} days until next milestone!
          </p>
        ) : (
          <p className="text-xs text-center text-green-400 mt-3">
            🎉 All milestones achieved! Keep your streak going!
          </p>
        )}
      </SketchCard>

      {/* Personal Stats */}
      <button
        onClick={() => setShowStats(!showStats)}
        className="w-full p-3 rounded-xl border-[3px] border-blue-400 bg-blue-500/20 text-blue-400 font-bold hover:bg-blue-500/30 transition-colors"
      >
        {showStats ? 'Hide My Stats' : '📊 View My Stats'}
      </button>

      {showStats && (
        <SketchCard padding="md" className="border-[3px] border-blue-400 rounded-xl">
          <SketchHeading level={6}>My Progress</SketchHeading>

          {/* Week 1-4 Progress */}
          <div className="mt-3 space-y-2">
            {[1, 2, 3, 4].map((week) => {
              const isCurrentWeek = week === onchain.streakWeek;
              const isCompleted = week < onchain.streakWeek;
              const isFuture = week > onchain.streakWeek;
              const maxReward = 28 * week + 7 * week; // (1+2+3+4+5+6+7)*multiplier + bonus
              const completedWeekData = mockClaimHistory.find((h) => h.week === week);
              const currentProgress = isCurrentWeek
                ? Array.from({ length: onchain.streakDay }, (_, i) => (i + 1) * week).reduce((a, b) => a + b, 0)
                : 0;

              return (
                <div key={week} className="flex items-center gap-2">
                  <p className={`text-xs w-16 ${isCurrentWeek ? 'text-amber-400 font-bold' : isFuture ? 'opacity-30' : 'opacity-60'}`}>
                    Week {week}
                  </p>
                  <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden">
                    {isCompleted && completedWeekData && (
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${(completedWeekData.claimed / maxReward) * 100}%` }}
                      />
                    )}
                    {isCurrentWeek && (
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${(currentProgress / maxReward) * 100}%` }}
                      />
                    )}
                  </div>
                  <p className={`text-sm font-bold w-20 text-right ${
                    isCompleted ? 'text-green-400' : isCurrentWeek ? 'text-amber-400' : 'opacity-30'
                  }`}>
                    {isCompleted && completedWeekData
                      ? `${completedWeekData.claimed}/${maxReward}`
                      : isCurrentWeek
                      ? `${currentProgress}/${maxReward}`
                      : `0/${maxReward}`}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Current Week Status */}
          <div className="mt-3 p-2 rounded bg-amber-500/20 border border-amber-400/50">
            <div className="flex items-center justify-between">
              <p className="text-xs text-amber-400 font-bold">Week {onchain.streakWeek} • Day {onchain.streakDay}/7</p>
              <p className="text-xs opacity-60">{onchain.streakWeek}x Multiplier</p>
            </div>
          </div>

          {/* 1 Month Milestones */}
          <div className="mt-4">
            <p className="text-xs font-bold text-yellow-400 mb-2">🎯 1 Month Milestones</p>
            <div className="space-y-2">
              {MILESTONES.map((milestone) => {
                const achieved = onchain.totalStreakDays >= milestone.day;
                return (
                  <div
                    key={milestone.day}
                    className={`flex items-center justify-between p-2 rounded ${
                      achieved
                        ? 'bg-green-500/20 border-2 border-green-400'
                        : 'bg-black/20 border-2 border-gray-500/50 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{achieved ? '✅' : '🔒'}</span>
                      <span className="text-sm">{milestone.label}</span>
                    </div>
                    <span className={`font-bold ${achieved ? 'text-green-400' : 'opacity-50'}`}>
                      {milestone.bonus} $TYSM
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-black/20 border-2 border-amber-400/60">
              <p className="text-lg font-bold text-amber-400">{onchain.tysmBalance}</p>
              <p className="text-xs opacity-60">Total $TYSM</p>
            </div>
            <div className="p-2 rounded bg-black/20 border-2 border-blue-400/60">
              <p className="text-lg font-bold text-blue-400">{onchain.totalStreakDays}</p>
              <p className="text-xs opacity-60">Streak Days</p>
            </div>
            <div className="p-2 rounded bg-black/20 border-2 border-yellow-400/60">
              <p className="text-lg font-bold text-yellow-400">{onchain.streakWeek}</p>
              <p className="text-xs opacity-60">Current Week</p>
            </div>
          </div>
        </SketchCard>
      )}

      {/* Streak Info Toggle */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="w-full p-3 rounded-xl border-[3px] border-amber-400 bg-amber-500/20 text-amber-400 font-bold hover:bg-amber-500/30 transition-colors"
      >
        {showHistory ? 'Hide Streak Info' : '❓ How Streaks Work'}
      </button>

      {showHistory && (
        <SketchCard padding="sm" className="border-[3px] border-amber-400 rounded-xl">
          <SketchHeading level={6}>Streak System</SketchHeading>
          <div className="mt-2 space-y-2 text-sm">
            <div className="p-2 rounded bg-black/20 border-2 border-amber-400/60">
              <p className="font-bold text-amber-400">Week 1 (1x)</p>
              <p className="sketch-text opacity-70">1, 2, 3, 4, 5, 6, 7 = 28 (7 bonus) = 35 $TYSM</p>
            </div>
            <div className="p-2 rounded bg-black/20 border-2 border-amber-400/60">
              <p className="font-bold text-amber-400">Week 2 (2x)</p>
              <p className="sketch-text opacity-70">2, 4, 6, 8, 10, 12, 14 = 56 (14 bonus) = 70 $TYSM</p>
            </div>
            <div className="p-2 rounded bg-black/20 border-2 border-amber-400/60">
              <p className="font-bold text-amber-400">Week 3 (3x)</p>
              <p className="sketch-text opacity-70">3, 6, 9, 12, 15, 18, 21 = 84 (21 bonus) = 105 $TYSM</p>
            </div>
            <div className="p-2 rounded bg-black/20 border-2 border-amber-400/60">
              <p className="font-bold text-amber-400">Week 4 (4x)</p>
              <p className="sketch-text opacity-70">4, 8, 12, 16, 20, 24, 28 = 112 (28 bonus) = 140 $TYSM</p>
            </div>
            <div className="p-2 rounded bg-amber-500/20 border-2 border-amber-400">
              <p className="font-bold text-amber-400">♾️ Week 5, 6, 7... ∞</p>
              <p className="sketch-text opacity-70">Multiplier keeps growing! Streak up to 1 year!</p>
            </div>
            <div className="p-2 rounded bg-green-500/20 border-2 border-green-400">
              <p className="font-bold text-green-400">🎯 1 Month Milestone</p>
              <p className="sketch-text opacity-70">Day 29: 500 | Day 30: 1000 $TYSM (one-time bonus)</p>
            </div>
            <div className="p-2 rounded bg-red-500/20 border-2 border-red-400">
              <p className="font-bold text-red-400">⚠️ Miss a Day?</p>
              <p className="sketch-text opacity-70">Streak resets to Week 1, Day 1!</p>
            </div>
          </div>
        </SketchCard>
      )}

      {/* Share Button */}
      {todayClaimed && (
        <SketchButton variant="secondary">Share My Streak</SketchButton>
      )}
    </div>
  );
}

function LiveClaimsTab() {
  const poolPercentage = ((mockPool.remainingPool / mockPool.totalPool) * 100).toFixed(1);

  const openTxInBrowser = (txHash: string) => {
    const fullHash = txHash.replace('...', '0'.repeat(54));
    window.open(`https://basescan.org/tx/${fullHash}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Pool Stats */}
      <SketchCard padding="md" className="border-[3px] border-amber-400 rounded-xl">
        <div className="text-center mb-4">
          <p className="text-xs opacity-60 mb-1">$TYSM Reward Pool</p>
          <p className="text-3xl font-bold text-amber-400">
            {mockPool.remainingPool.toLocaleString()}
          </p>
          <p className="text-xs opacity-50">of {mockPool.totalPool.toLocaleString()} $TYSM</p>
        </div>

        <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
            style={{ width: `${poolPercentage}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-2 rounded bg-black/20 border-2 border-yellow-400/60">
            <p className="text-lg font-bold text-yellow-400">{mockPool.totalClaimed.toLocaleString()}</p>
            <p className="text-xs opacity-60">Total Claimed</p>
          </div>
          <div className="p-2 rounded bg-black/20 border-2 border-blue-400/60">
            <p className="text-lg font-bold text-blue-400">{mockPool.totalClaimers.toLocaleString()}</p>
            <p className="text-xs opacity-60">Total Claimers</p>
          </div>
        </div>
      </SketchCard>

      {/* Live Claims Feed */}
      <SketchCard padding="md" className="border-[3px] border-blue-400 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <SketchHeading level={6}>Live Claims</SketchHeading>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-xs text-red-400">LIVE</p>
          </div>
        </div>

        <div className="space-y-2">
          {mockLiveClaims.map((claim, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors border-2 border-amber-400/60"
            >
              <div className="flex items-center gap-3">
                <img
                  src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${claim.username}`}
                  alt={claim.username}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <p className="font-medium text-sm">@{claim.username}</p>
                  <p className="text-xs opacity-50">{claim.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-amber-400 font-bold">+{claim.amount} $TYSM</p>
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
          <p className="text-xs opacity-50">Showing latest 5 claims</p>
        </div>
      </SketchCard>

      {/* Pool Info */}
      <SketchCard padding="sm" className="border-[3px] border-green-400 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-xs opacity-70">Base Network</p>
          </div>
          <button
            onClick={() => window.open('https://basescan.org/token/0xTYSMTOKEN', '_blank')}
            className="text-xs text-blue-400 underline"
          >
            View Contract →
          </button>
        </div>
      </SketchCard>
    </div>
  );
}

function LeaderboardTab() {
  const myRank = { rank: 42, username: 'alice', totalTYSM: 98, streakWeek: 2, tier: '🥇 GOLD' };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/30 border-yellow-400';
    if (rank === 2) return 'bg-gray-400/30 border-gray-300';
    if (rank === 3) return 'bg-orange-500/30 border-orange-400';
    return 'bg-black/20 border-blue-400/50';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="space-y-4">
      {/* My Rank Card */}
      <SketchCard padding="md" className="border-[3px] border-amber-400 rounded-xl">
        <SketchHeading level={6}>Your Ranking</SketchHeading>
        <div className="mt-3 flex items-center justify-between p-3 rounded-lg bg-amber-500/20 border-2 border-amber-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/30 flex items-center justify-center font-bold text-amber-400">
              #{myRank.rank}
            </div>
            <div>
              <p className="font-bold">@{myRank.username}</p>
              <p className="text-xs opacity-60">{myRank.tier}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-amber-400">{myRank.totalTYSM}</p>
            <p className="text-xs opacity-50">Week {myRank.streakWeek} streak</p>
          </div>
        </div>
      </SketchCard>

      {/* Top 10 Leaderboard */}
      <SketchCard padding="md" className="border-[3px] border-blue-400 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <SketchHeading level={6}>Top Claimers</SketchHeading>
          <p className="text-xs opacity-50">All Time</p>
        </div>

        <div className="space-y-2">
          {mockLeaderboard.map((user) => (
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
                  <p className="font-medium text-sm">@{user.username}</p>
                  <p className="text-xs opacity-50">{user.tier}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-amber-400 font-bold">{user.totalTYSM.toLocaleString()}</p>
                <p className="text-xs opacity-50">W{user.streakWeek}</p>
              </div>
            </div>
          ))}
        </div>
      </SketchCard>

      {/* Stats */}
      <SketchCard padding="sm" className="border-[3px] border-amber-400 rounded-xl">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded bg-black/20 border-2 border-yellow-400/60">
            <p className="text-lg font-bold text-yellow-400">12</p>
            <p className="text-xs opacity-60">Max Week</p>
          </div>
          <div className="p-2 rounded bg-black/20 border-2 border-amber-400/60">
            <p className="text-lg font-bold text-amber-400">4,850</p>
            <p className="text-xs opacity-60">Top $TYSM</p>
          </div>
          <div className="p-2 rounded bg-black/20 border-2 border-blue-400/60">
            <p className="text-lg font-bold text-blue-400">3,847</p>
            <p className="text-xs opacity-60">Claimers</p>
          </div>
        </div>
      </SketchCard>
    </div>
  );
}

// Custom Header with centered logo and title
function CustomHeader() {
  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <img
        src="/app-logo.png"
        alt="TYSM"
        className="w-10 h-10 rounded-full border-[3px] border-amber-400"
      />
      <h1 className="text-xl font-bold text-amber-400">TYSM Counter</h1>
    </div>
  );
}

export function MiniApp() {
  return (
    <SketchMiniLayout
      title=""
      mode="tabs"
      tabs={[
        { label: '🎁 Check-in', content: <><CustomHeader /><CheckInTab /></> },
        { label: '📡 Live', content: <><CustomHeader /><LiveClaimsTab /></> },
        { label: '🏆 Leaderboard', content: <><CustomHeader /><LeaderboardTab /></> },
      ]}
    />
  );
}
