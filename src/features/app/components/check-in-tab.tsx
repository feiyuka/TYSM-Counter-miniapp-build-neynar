'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, Button, H6, P } from '@neynar/ui';
import { useFarcasterUser } from '@/neynar-farcaster-sdk/mini';
import { ShareButton } from '@/neynar-farcaster-sdk/mini';
import { useUser } from '@/neynar-web-sdk/api-hooks';
import type { UserStreak } from '@/features/app/types';
import { MILESTONES } from '@/data/mocks';
import { isBalanced, getTier, getTimeUntilReset } from '@/features/app/utils';
import {
  getOrCreateUserStreak,
  performCheckIn,
  canCheckInToday,
} from '@/db/actions/streak-actions';
import { saveClaim } from '@/db/actions/claim-actions';

// Quotient Score is not available via Neynar API yet - using mock
const MOCK_QUOTIENT_SCORE = 0.68;

export function CheckInTab() {
  const { data: user, isLoading: userLoading } = useFarcasterUser();

  // Fetch real Neynar Score from API with experimental features
  const { data: neynarUser, isLoading: scoreLoading } = useUser(
    user?.fid ?? 0,
    { x_neynar_experimental: true },
    { enabled: !!user?.fid }
  );

  // Real Neynar Score from API (0-1 range)
  const neynarScore = neynarUser?.neynar_user_score ?? 0;
  // Quotient Score - mock for now (API not available yet)
  const quotientScore = MOCK_QUOTIENT_SCORE;

  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [streakLoading, setStreakLoading] = useState(true);
  const [txPending, setTxPending] = useState(false);
  const [todayClaimed, setTodayClaimed] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(getTimeUntilReset());
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [claimedReward, setClaimedReward] = useState(0);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showStreakInfo, setShowStreakInfo] = useState(false);

  // Load user streak from database
  const loadStreak = useCallback(async () => {
    if (!user) return;

    setStreakLoading(true);
    try {
      const existingStreak = await getOrCreateUserStreak(user.fid, user.username || 'user');
      if (existingStreak) {
        setStreak({
          tysmBalance: existingStreak.tysmBalance,
          lastCheckIn: existingStreak.lastCheckIn?.toISOString() || '',
          streakDay: existingStreak.streakDay,
          streakWeek: existingStreak.streakWeek,
          totalStreakDays: existingStreak.totalStreakDays,
        });

        // Check if already claimed today
        const canCheck = await canCheckInToday(user.fid);
        setTodayClaimed(!canCheck);
      }
    } catch (error) {
      console.error('Failed to load streak:', error);
    } finally {
      setStreakLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadStreak();
  }, [loadStreak]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getTimeUntilReset());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const balanced = isBalanced(neynarScore, quotientScore);
  const tier = getTier(neynarScore, quotientScore);
  const difference = Math.abs(neynarScore - quotientScore);

  const todayReward = (streak?.streakDay || 1) * (streak?.streakWeek || 1);
  const isLastDayOfWeek = (streak?.streakDay || 1) === 7;
  const weekBonus = isLastDayOfWeek ? 7 * (streak?.streakWeek || 1) : 0;

  // Check if today is a milestone day
  const nextMilestone = MILESTONES.find((m) => m.day > (streak?.totalStreakDays || 0));
  const todayMilestone = MILESTONES.find((m) => m.day === (streak?.totalStreakDays || 0) + 1);

  const handleCheckInClick = () => {
    setShowConfirmPopup(true);
  };

  const handleConfirmCheckIn = async () => {
    if (!user) return;

    setShowConfirmPopup(false);
    setTxPending(true);

    try {
      // Perform check-in
      const result = await performCheckIn(user.fid, user.username || 'user');

      if (!result.success) {
        console.error('Check-in failed:', result.error);
        setTxPending(false);
        return;
      }

      // Generate mock tx hash (in production, this would be a real onchain tx)
      const mockTxHash = '0x' + Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');

      setTxHash(mockTxHash);
      setClaimedReward(result.reward || 0);

      // Save claim to database
      await saveClaim(user.fid, user.username || 'user', result.reward || 0, mockTxHash);

      // Update local state
      if (result.streak) {
        setStreak({
          tysmBalance: result.streak.tysmBalance,
          lastCheckIn: result.streak.lastCheckIn?.toISOString() || '',
          streakDay: result.streak.streakDay,
          streakWeek: result.streak.streakWeek,
          totalStreakDays: result.streak.totalStreakDays,
        });
      }

      setTxPending(false);
      setTodayClaimed(true);
      setShowSuccessPopup(true);
    } catch (error) {
      console.error('Check-in error:', error);
      setTxPending(false);
    }
  };

  const openTxInBrowser = () => {
    if (txHash) {
      window.open(`https://basescan.org/tx/${txHash}`, '_blank');
    }
  };

  // Loading state
  if (userLoading || streakLoading || scoreLoading) {
    return (
      <div className="space-y-4 relative">
        <Card className="border border-amber-400/70 rounded-xl animate-pulse">
          <CardContent className="p-4">
            <div className="h-20 bg-amber-500/20 rounded"></div>
          </CardContent>
        </Card>
        <Card className="border border-amber-400/70 rounded-xl animate-pulse">
          <CardContent className="p-4">
            <div className="h-32 bg-amber-500/20 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Guest user state
  if (!user) {
    return (
      <div className="space-y-4 relative">
        <Card className="border border-amber-400/70 rounded-xl">
          <CardContent className="p-6 text-center">
            <P className="text-4xl mb-3">🔐</P>
            <H6>Connect to Farcaster</H6>
            <P className="text-sm opacity-70 mt-2">
              Open this app in Farcaster to start earning TYSM tokens!
            </P>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {/* Help Icon - Top Right */}
      <button
        onClick={() => setShowStreakInfo(true)}
        className="absolute -top-10 right-0 w-8 h-8 rounded-full border border-amber-400/60 bg-amber-500/30 text-amber-400 font-bold flex items-center justify-center hover:bg-amber-500/50 transition-colors"
      >
        ❓
      </button>

      {/* User Profile with Wallet - Clickable */}
      <button
        onClick={() => setShowProfilePopup(true)}
        className="w-full text-left"
      >
        <Card className="border border-amber-400/70 rounded-xl hover:bg-amber-500/10 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <img
                src={user.pfpUrl || `https://api.dicebear.com/9.x/lorelei/svg?seed=${user.username}`}
                alt={user.displayName || user.username}
                className="w-12 h-12 rounded-full border border-amber-400/60"
              />
              <div className="flex-1">
                <P className="font-bold">{user.displayName || user.username}</P>
                <P className="text-xs opacity-70 font-mono">FID: {user.fid}</P>
              </div>
              <div className="text-right">
                <P className="text-2xl font-bold text-amber-400">{streak?.tysmBalance || 0}</P>
                <P className="text-xs opacity-60">TYSM Balance</P>
              </div>
            </div>
            <P className="text-xs text-center text-blue-400 mt-2">Tap to view stats →</P>
          </CardContent>
        </Card>
      </button>

      {/* Countdown Timer - Next Check-in */}
      {todayClaimed && (
        <Card className="border border-blue-400/70 rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">⏰</span>
                <P className="text-sm opacity-70">Next check-in in</P>
              </div>
              <div className="flex gap-2 font-mono">
                <div className="bg-amber-500/30 px-2 py-1 rounded text-center">
                  <P className="text-lg font-bold text-amber-400">{String(countdown.hours).padStart(2, '0')}</P>
                  <P className="text-xs opacity-50">hr</P>
                </div>
                <P className="text-lg font-bold self-start mt-1">:</P>
                <div className="bg-amber-500/30 px-2 py-1 rounded text-center">
                  <P className="text-lg font-bold text-amber-400">{String(countdown.minutes).padStart(2, '0')}</P>
                  <P className="text-xs opacity-50">min</P>
                </div>
                <P className="text-lg font-bold self-start mt-1">:</P>
                <div className="bg-amber-500/30 px-2 py-1 rounded text-center">
                  <P className="text-lg font-bold text-amber-400">{String(countdown.seconds).padStart(2, '0')}</P>
                  <P className="text-xs opacity-50">sec</P>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Streak Reminder Warning */}
      {!todayClaimed && countdown.total < 3600000 && (
        <Card className="border border-yellow-400/70 rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center gap-3 text-yellow-400">
              <span className="text-2xl animate-bounce">🔔</span>
              <div>
                <P className="font-bold">Don't lose your streak!</P>
                <P className="text-xs opacity-70">
                  Only {countdown.hours}h {countdown.minutes}m left to check in today
                </P>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Onchain Check-in */}
      <Card className="border border-amber-400/70 rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <H6>Daily Check-in</H6>
              <P className="text-xs opacity-50 mt-1">🔗 Onchain rewards</P>
            </div>
            <div className="text-right">
              <P className="text-sm font-bold text-amber-400">Week {streak?.streakWeek || 1}</P>
              <P className="text-xs opacity-60">{streak?.streakWeek || 1}x Multiplier</P>
            </div>
          </div>

          {balanced ? (
            !todayClaimed ? (
              <div className="text-center">
                {txPending ? (
                  <div className="p-4">
                    <span className="text-4xl animate-spin inline-block">⏳</span>
                    <P className="text-sm opacity-70 mt-2">Confirming transaction...</P>
                  </div>
                ) : (
                  <button
                    onClick={handleCheckInClick}
                    className="w-full py-4 rounded-lg border-amber-400/70 bg-amber-500/30 text-amber-400 font-bold text-lg hover:bg-amber-500/50 transition-colors"
                  >
                    🔥 Check In
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center p-4 bg-green-500/20 rounded-lg border border-green-400/60">
                <P className="text-green-400 font-bold text-lg">✅ Checked In!</P>
                <P className="text-xs opacity-50 mt-1">Come back tomorrow</P>
              </div>
            )
          ) : (
            <div className="text-center p-4 bg-red-500/20 rounded-lg border border-red-400/60">
              <P className="text-red-400 font-bold">🚫 Check-in Locked</P>
              <P className="text-sm opacity-70">Balance your scores to unlock</P>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Check-in Popup */}
      {showConfirmPopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <P className="text-4xl mb-3">🔗</P>
                <H6>Check In Onchain?</H6>
                <P className="text-sm opacity-70 mt-2 mb-4">
                  This will send a transaction to Base Network
                </P>
                <div className="p-3 rounded-lg bg-amber-500/20 mb-4">
                  <P className="text-xs opacity-60">Today's Reward</P>
                  <P className="text-2xl font-bold text-amber-400">{todayReward} TYSM</P>
                  {isLastDayOfWeek && (
                    <P className="text-sm text-yellow-400">{weekBonus} week bonus</P>
                  )}
                  {todayMilestone && (
                    <P className="text-sm text-orange-400">{todayMilestone.bonus} milestone bonus</P>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowConfirmPopup(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleConfirmCheckIn}>
                    Confirm
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <P className="text-5xl mb-3">🎉</P>
                <H6>Claim Successful!</H6>
                <div className="p-4 rounded-lg bg-amber-500/20 border border-amber-400 my-4">
                  <P className="text-3xl font-bold text-amber-400">{claimedReward} TYSM</P>
                  <P className="text-xs opacity-60 mt-1">sent to your wallet</P>
                </div>
                {txHash && (
                  <div className="p-2 bg-black/30 rounded mb-4">
                    <P className="text-xs opacity-50 mb-1">Transaction Hash</P>
                    <P className="text-xs font-mono text-green-300 break-all">
                      {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </P>
                    <button
                      onClick={openTxInBrowser}
                      className="mt-2 text-xs text-blue-400 underline"
                    >
                      View on BaseScan →
                    </button>
                  </div>
                )}
                <Button onClick={() => setShowSuccessPopup(false)}>
                  Done
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Score Balance Check */}
      <Card className="border border-blue-400/50 rounded-lg">
        <CardContent className="p-3">
          <H6>Score Balance</H6>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="text-center p-2 rounded-md bg-amber-500/20 border border-amber-400/40">
              <P className="text-xs opacity-70">Neynar Score</P>
              <P className="text-xl font-bold text-amber-400">
                {neynarScore.toFixed(2)}
              </P>
            </div>
            <div className="text-center p-2 rounded-md bg-blue-500/20 border border-blue-400/40">
              <P className="text-xs opacity-70">Quotient Score</P>
              <P className="text-xl font-bold text-blue-400">
                {quotientScore.toFixed(2)}
              </P>
            </div>
          </div>

          <div className={`mt-2 p-2 rounded-md text-center ${
            balanced ? 'bg-green-500/20 border border-green-400/50' : 'bg-red-500/20 border border-red-400/50'
          }`}>
            {balanced ? (
              <>
                <P className="text-green-400 font-bold">✅ BALANCED</P>
                <P className="text-sm opacity-70">
                  Difference: {(difference * 100).toFixed(1)}% (max 10%)
                </P>
              </>
            ) : (
              <>
                <P className="text-red-400 font-bold">❌ NOT BALANCED</P>
                <P className="text-sm opacity-70">
                  Difference: {(difference * 100).toFixed(1)}% — needs ≤10%
                </P>
              </>
            )}
          </div>

          {tier ? (
            <div className="mt-2 text-center">
              <P className="text-xs opacity-60">Your Tier</P>
              <P className={`text-lg font-bold ${tier.color}`}>{tier.name}</P>
            </div>
          ) : (
            <div className="mt-2 text-center">
              <P className="text-xs opacity-60">Your Tier</P>
              <P className="text-sm font-bold text-gray-500">⚠️ No Tier (Unbalanced)</P>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 1 Month Milestone Progress */}
      <Card className="border border-amber-400/70 rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <H6>1 Month Milestones</H6>
            <P className="text-sm font-bold text-amber-400">Day {streak?.totalStreakDays || 0}</P>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-amber-400 transition-all"
              style={{ width: `${Math.min(((streak?.totalStreakDays || 0) / 30) * 100, 100)}%` }}
            />
          </div>

          {/* Milestone Markers */}
          <div className="space-y-2">
            {MILESTONES.map((milestone) => {
              const achieved = (streak?.totalStreakDays || 0) >= milestone.day;
              const isNext = nextMilestone?.day === milestone.day;
              return (
                <div
                  key={milestone.day}
                  className={`flex items-center justify-between p-2 rounded ${
                    achieved
                      ? 'bg-green-500/20 border border-green-400/60'
                      : isNext
                      ? 'bg-yellow-500/20 border border-yellow-400/60'
                      : 'bg-black/20 border border-gray-500/40 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{achieved ? '✅' : isNext ? '🎯' : '⬜'}</span>
                    <span className="text-sm font-medium">{milestone.label}</span>
                    <span className="text-xs opacity-50">Day {milestone.day}</span>
                  </div>
                  <span className={`font-bold ${achieved ? 'text-green-400' : isNext ? 'text-yellow-400' : ''}`}>
                    {milestone.bonus} TYSM
                  </span>
                </div>
              );
            })}
          </div>

          {nextMilestone ? (
            <P className="text-xs text-center opacity-50 mt-3">
              {nextMilestone.day - (streak?.totalStreakDays || 0)} days until next milestone!
            </P>
          ) : (
            <P className="text-xs text-center text-green-400 mt-3">
              🎉 All milestones achieved! Keep your streak going!
            </P>
          )}
        </CardContent>
      </Card>

      {/* Profile Stats Popup */}
      {showProfilePopup && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-blue-400/70 max-h-[80vh] overflow-y-auto w-full max-w-sm">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <H6>📊 My Stats</H6>
                <button
                  onClick={() => setShowProfilePopup(false)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>

              {/* Profile Info */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/20 border border-amber-400/60 mb-4">
                <img
                  src={user.pfpUrl || `https://api.dicebear.com/9.x/lorelei/svg?seed=${user.username}`}
                  alt={user.displayName || user.username}
                  className="w-12 h-12 rounded-full border border-amber-400/60"
                />
                <div className="flex-1">
                  <P className="font-bold">{user.displayName || user.username}</P>
                  <P className="text-xs opacity-70 font-mono">FID: {user.fid}</P>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div className="p-2 rounded bg-black/20 border border-amber-400/60">
                  <P className="text-lg font-bold text-amber-400">{streak?.tysmBalance || 0}</P>
                  <P className="text-xs opacity-60">Total TYSM</P>
                </div>
                <div className="p-2 rounded bg-black/20 border border-blue-400/60">
                  <P className="text-lg font-bold text-blue-400">{streak?.totalStreakDays || 0}</P>
                  <P className="text-xs opacity-60">Streak Days</P>
                </div>
                <div className="p-2 rounded bg-black/20 border border-yellow-400/60">
                  <P className="text-lg font-bold text-yellow-400">{streak?.streakWeek || 1}</P>
                  <P className="text-xs opacity-60">Current Week</P>
                </div>
              </div>

              {/* Current Week Status */}
              <div className="p-2 rounded bg-amber-500/20 border border-amber-400/60 mb-4">
                <div className="flex items-center justify-between">
                  <P className="text-xs text-amber-400 font-bold">Week {streak?.streakWeek || 1} • Day {streak?.streakDay || 1}/7</P>
                  <P className="text-xs opacity-60">{streak?.streakWeek || 1}x Multiplier</P>
                </div>
              </div>

              {/* 1 Month Milestones */}
              <P className="text-xs font-bold text-yellow-400 mb-2">🎯 1 Month Milestones</P>
              <div className="space-y-2">
                {MILESTONES.map((milestone) => {
                  const achieved = (streak?.totalStreakDays || 0) >= milestone.day;
                  return (
                    <div
                      key={milestone.day}
                      className={`flex items-center justify-between p-2 rounded ${
                        achieved
                          ? 'bg-green-500/20 border border-green-400/60'
                          : 'bg-black/20 border border-gray-500/40 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{achieved ? '✅' : '🔒'}</span>
                        <span className="text-sm">{milestone.label}</span>
                      </div>
                      <span className={`font-bold ${achieved ? 'text-green-400' : 'opacity-50'}`}>
                        {milestone.bonus} TYSM
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Streak Info Popup */}
      {showStreakInfo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-amber-400/70 max-h-[80vh] overflow-y-auto w-full max-w-sm">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <H6>❓ How Streaks Work</H6>
                <button
                  onClick={() => setShowStreakInfo(false)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="p-2 rounded bg-black/20 border border-amber-400/60">
                  <P className="font-bold text-amber-400">Week 1 (1x)</P>
                  <P className="opacity-70">1, 2, 3, 4, 5, 6, 7 = 28 (7 bonus) = 35 TYSM</P>
                </div>
                <div className="p-2 rounded bg-black/20 border border-amber-400/60">
                  <P className="font-bold text-amber-400">Week 2 (2x)</P>
                  <P className="opacity-70">2, 4, 6, 8, 10, 12, 14 = 56 (14 bonus) = 70 TYSM</P>
                </div>
                <div className="p-2 rounded bg-black/20 border border-amber-400/60">
                  <P className="font-bold text-amber-400">Week 3 (3x)</P>
                  <P className="opacity-70">3, 6, 9, 12, 15, 18, 21 = 84 (21 bonus) = 105 TYSM</P>
                </div>
                <div className="p-2 rounded bg-black/20 border border-amber-400/60">
                  <P className="font-bold text-amber-400">Week 4 (4x)</P>
                  <P className="opacity-70">4, 8, 12, 16, 20, 24, 28 = 112 (28 bonus) = 140 TYSM</P>
                </div>
                <div className="p-2 rounded bg-amber-500/20 border border-amber-400/60">
                  <P className="font-bold text-amber-400">♾️ Week 5, 6, 7... ∞</P>
                  <P className="opacity-70">Multiplier keeps growing! Streak up to 1 year!</P>
                </div>
                <div className="p-2 rounded bg-green-500/20 border border-green-400/60">
                  <P className="font-bold text-green-400">🎯 1 Month Milestone</P>
                  <P className="opacity-70">Day 29: 500 | Day 30: 1000 TYSM (one-time bonus)</P>
                </div>
                <div className="p-2 rounded bg-red-500/20 border border-red-400/60">
                  <P className="font-bold text-red-400">⚠️ Miss a Day?</P>
                  <P className="opacity-70">Streak resets to Week 1, Day 1!</P>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Button */}
      {todayClaimed && (
        <ShareButton
          text={`I just claimed ${claimedReward.toLocaleString()} TYSM on day ${streak?.totalStreakDays || 0}! Week ${streak?.streakWeek || 1} streak 🔥`}
          queryParams={{
            tysmBalance: (streak?.tysmBalance || 0).toString(),
            streakDay: (streak?.streakDay || 1).toString(),
            streakWeek: (streak?.streakWeek || 1).toString(),
            tier: tier?.name || 'No Tier',
            username: user?.username || 'Player',
          }}
          variant="secondary"
          className="w-full"
        >
          Share My Streak
        </ShareButton>
      )}
    </div>
  );
}
