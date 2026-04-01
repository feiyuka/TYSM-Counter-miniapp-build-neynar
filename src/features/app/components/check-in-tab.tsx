'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, Button, H6, P } from '@neynar/ui';
import { useFarcasterUser, ShareButton } from '@/neynar-farcaster-sdk/mini';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from 'wagmi';
import { Attribution } from 'ox/erc8021';
import { MILESTONES } from '@/data/mocks';
import { getTimeUntilReset } from '@/features/app/utils';
import { calculateReward } from '@/db/actions/streak-utils';
import { TYSM_CHECKIN_ADDRESS, TYSM_CHECKIN_ABI } from '@/contracts/tysm-checkin-abi';
import type { UserStreak } from '@/features/app/types';

const BUILDER_DATA_SUFFIX = Attribution.toDataSuffix({ codes: ['bc_rmi5daom'] });

function getTier(balance: number) {
  if (balance >= 500000) return 'LEGENDARY';
  if (balance >= 250000) return 'DIAMOND';
  if (balance >= 100000) return 'GOLD';
  if (balance >= 50000) return 'SILVER';
  return 'BRONZE';
}

export function CheckInTab() {
  const { data: farcasterUser, isLoading: farcasterLoading } = useFarcasterUser();
  const { address: walletAddress } = useAccount();

  // Unified user identity
  const effectiveFid = useMemo(() => {
    if (farcasterUser?.fid) return farcasterUser.fid;
    if (walletAddress) return parseInt(walletAddress.slice(-8), 16);
    return 0;
  }, [farcasterUser?.fid, walletAddress]);

  const user = useMemo(() => {
    if (farcasterUser) return farcasterUser;
    if (walletAddress) return {
      fid: effectiveFid,
      username: walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4),
      displayName: 'Base User',
      pfpUrl: `https://api.dicebear.com/9.x/lorelei/svg?seed=${walletAddress}`,
    };
    return null;
  }, [farcasterUser, walletAddress, effectiveFid]);

  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [streakLoading, setStreakLoading] = useState(true);
  const [todayClaimed, setTodayClaimed] = useState(false);
  const [neynarScore, setNeynarScore] = useState<number | null>(null);
  const [scoreQualified, setScoreQualified] = useState(true);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(getTimeUntilReset());
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [claimedReward, setClaimedReward] = useState(0);
  const [claimedStreakSnap, setClaimedStreakSnap] = useState<UserStreak | null>(null);
  const [tokenSendFailed, setTokenSendFailed] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const txProcessedRef = useRef<string | null>(null);

  const { writeContract, data: txData, isPending: txPending, error: txError, reset: resetTx } = useWriteContract();
  const { isLoading: txConfirming, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txData });

  // Check contract canCheckIn — prevents revert by reading onchain state first
  const { data: contractCanCheckIn } = useReadContract({
    address: TYSM_CHECKIN_ADDRESS,
    abi: TYSM_CHECKIN_ABI,
    functionName: 'canCheckIn',
    args: walletAddress ? [walletAddress] : undefined,
    query: { enabled: !!walletAddress },
  });
  // contractCanCheckIn = [canCheck: bool, timeRemaining: bigint, willReset: bool]
  const contractAllows = !walletAddress || !contractCanCheckIn || contractCanCheckIn[0] === true;

  // Load streak from DB
  const loadStreak = useCallback(async () => {
    if (!user) return;
    setStreakLoading(true);
    try {
      const res = await fetch(`/api/user-streak?fid=${user.fid}&username=${encodeURIComponent(user.username || 'user')}`);
      const data = await res.json();
      if (data.streak) {
        const s = data.streak;
        setStreak({
          tysmBalance: s.tysmBalance,
          lastCheckIn: s.lastCheckIn ? new Date(s.lastCheckIn).toISOString() : '',
          streakDay: s.streakDay,
          streakWeek: s.streakWeek,
          totalStreakDays: s.totalStreakDays,
        });
        setTodayClaimed(!data.canCheckIn);
      }
      if (data.neynarScore !== undefined) setNeynarScore(data.neynarScore);
      if (data.scoreQualified !== undefined) setScoreQualified(data.scoreQualified);
    } catch (e) {
      console.error('loadStreak error:', e);
    } finally {
      setStreakLoading(false);
    }
  }, [user]);

  useEffect(() => { loadStreak(); }, [loadStreak]);

  // Countdown timer
  useEffect(() => {
    const t = setInterval(() => setCountdown(getTimeUntilReset()), 1000);
    return () => clearInterval(t);
  }, []);

  // Handle tx success → call backend for x100 reward
  useEffect(() => {
    if (!txSuccess || !txData || !user || !walletAddress) return;
    if (txProcessedRef.current === txData) return;
    txProcessedRef.current = txData;

    setTxHash(txData);
    setApiLoading(true);

    fetch('/api/claim-reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fid: user.fid,
        username: user.username || 'user',
        pfpUrl: user.pfpUrl,
        walletAddress,
        txHash: txData,
      }),
    })
      .then((r) => r.json())
      .then((result) => {
        if (result.success) {
          const reward = result.reward ?? 0;
          const updatedStreak = result.streak;
          setClaimedReward(reward);
          setTokenSendFailed(result.tokenSendFailed === true);
          if (updatedStreak) {
            const snap: UserStreak = {
              tysmBalance: updatedStreak.tysmBalance,
              lastCheckIn: updatedStreak.lastCheckIn ?? '',
              streakDay: updatedStreak.streakDay,
              streakWeek: updatedStreak.streakWeek,
              totalStreakDays: updatedStreak.totalStreakDays,
            };
            setStreak(snap);
            setClaimedStreakSnap(snap);
          }
          setTodayClaimed(true);
          setShowSuccess(true);
        } else {
          console.error('claim-reward error:', result.error);
          setTokenSendFailed(true);
          setTodayClaimed(true);
          setShowSuccess(true);
        }
      })
      .catch((e) => {
        console.error('claim-reward fetch error:', e);
        setTodayClaimed(true);
        setShowSuccess(true);
      })
      .finally(() => setApiLoading(false));
  }, [txSuccess, txData, user, walletAddress]);

  // Preview reward calc
  const previewCalc = calculateReward(
    streak?.streakDay ?? 1,
    streak?.streakWeek ?? 1,
    streak?.totalStreakDays ?? 0,
  );

  const weekMultiplier = streak?.streakWeek ?? 1;
  const nextMilestone = MILESTONES.find((m) => m.day > (streak?.totalStreakDays ?? 0));
  const isLoading = (farcasterLoading && !walletAddress && !farcasterUser) || streakLoading;

  // Can user check in? Both DB and contract must agree
  const canCheckIn = !todayClaimed && contractAllows && scoreQualified;

  function handleConfirmCheckIn() {
    setShowConfirm(false);
    writeContract({
      address: TYSM_CHECKIN_ADDRESS,
      abi: TYSM_CHECKIN_ABI,
      functionName: 'checkIn',
      dataSuffix: BUILDER_DATA_SUFFIX,
    });
  }

  function handleCloseSuccess() {
    setShowSuccess(false);
    resetTx();
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border border-amber-400/30 rounded-xl animate-pulse">
            <CardContent className="p-4"><div className="h-16 bg-amber-500/10 rounded" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="border border-amber-400/70 rounded-xl">
        <CardContent className="p-6 text-center">
          <P className="text-4xl mb-3">🔐</P>
          <H6>Connect Your Wallet</H6>
          <P className="text-sm text-gray-300 mt-2">Open in Farcaster or connect a wallet to start earning TYSM!</P>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">

      {/* Confirm Popup */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-5 text-center">
              <P className="text-4xl mb-3">🔗</P>
              <H6>Check In Onchain?</H6>
              <P className="text-sm text-gray-300 mt-1 mb-4">Transaction on Base Network (~$0.01 gas)</P>
              <div className="p-3 rounded-lg bg-amber-500/20 border border-amber-400/60 mb-4">
                <P className="text-xs text-gray-400 mb-1">You will receive</P>
                <P className="text-2xl font-bold text-amber-400">{previewCalc.totalReward.toLocaleString()} TYSM</P>
                {previewCalc.weekBonus > 0 && (
                  <P className="text-xs text-green-400 mt-1">+{previewCalc.weekBonus.toLocaleString()} week bonus! 🎉</P>
                )}
                {previewCalc.milestoneBonus > 0 && (
                  <P className="text-xs text-yellow-400 mt-1">+{previewCalc.milestoneBonus.toLocaleString()} milestone bonus! 🏆</P>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleConfirmCheckIn}>Confirm</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-5 text-center">
              {/* Close button top-right */}
              <div className="flex justify-end mb-1">
                <button
                  onClick={handleCloseSuccess}
                  className="text-gray-400 hover:text-white text-xl leading-none"
                >✕</button>
              </div>

              <P className="text-5xl mb-3">{tokenSendFailed ? '⚠️' : '🎉'}</P>
              <H6>{tokenSendFailed ? 'Streak Saved!' : 'Claimed!'}</H6>

              {!tokenSendFailed ? (
                <div className="p-4 rounded-lg bg-amber-500/20 border border-amber-400 my-3">
                  <P className="text-3xl font-bold text-amber-400">{claimedReward.toLocaleString()}</P>
                  <P className="text-sm text-gray-300">TYSM sent to your wallet</P>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-400/60 my-3">
                  <P className="text-sm text-gray-200">Streak recorded ✅</P>
                  <P className="text-xs text-gray-400 mt-1">Token transfer pending — your reward will arrive shortly.</P>
                </div>
              )}

              {txHash && (
                <button
                  onClick={() => window.open(`https://basescan.org/tx/${txHash}`, '_blank')}
                  className="text-xs text-blue-400 underline mb-3 block mx-auto"
                >
                  View TX on BaseScan →
                </button>
              )}

              {/* Share button — always visible, user-initiated (browser allows popup) */}
              <div className="flex gap-2">
                <ShareButton
                  text={`Just claimed ${claimedReward.toLocaleString()} $TYSM on Day ${claimedStreakSnap?.totalStreakDays ?? streak?.totalStreakDays ?? 1} 🔥 Stack your streak and earn $TYSM daily!`}
                  queryParams={{
                    tysmBalance: String(claimedStreakSnap?.tysmBalance ?? streak?.tysmBalance ?? 0),
                    streakDay: String(claimedStreakSnap?.streakDay ?? streak?.streakDay ?? 1),
                    streakWeek: String(claimedStreakSnap?.streakWeek ?? streak?.streakWeek ?? 1),
                    tier: getTier(claimedStreakSnap?.tysmBalance ?? streak?.tysmBalance ?? 0),
                    username: user.username ?? 'Player',
                  }}
                  channelKey="base"
                  onSuccess={handleCloseSuccess}
                  variant="default"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold"
                >
                  🚀 Share
                </ShareButton>
                <Button variant="outline" className="flex-1" onClick={handleCloseSuccess}>Done</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Card */}
      <Card className="border border-amber-400/70 rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.pfpUrl || `https://api.dicebear.com/9.x/lorelei/svg?seed=${user.fid}`}
              alt={user.displayName || user.username}
              className="w-11 h-11 rounded-full border border-amber-400/60 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <P className="font-bold truncate">{user.displayName || user.username}</P>
              <div className="flex items-center gap-2 flex-wrap">
                <P className="text-xs text-gray-400">Week {weekMultiplier} • {weekMultiplier * 100}x multiplier</P>
                {neynarScore !== null && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    scoreQualified
                      ? 'bg-green-500/20 text-green-400 border border-green-400/40'
                      : 'bg-red-500/20 text-red-400 border border-red-400/40'
                  }`}>
                    {scoreQualified ? '✓' : '✗'} Score {(neynarScore * 100).toFixed(0)}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <P className="text-xl font-bold text-amber-400">{(streak?.tysmBalance ?? 0).toLocaleString()}</P>
              <P className="text-xs text-gray-400">TYSM</P>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streak + Check-in */}
      <Card className="border border-amber-400/70 rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <H6>Daily Check-in</H6>
              <P className="text-xs text-gray-400">Day {streak?.streakDay ?? 1} of Week {weekMultiplier}</P>
            </div>
            <div className="text-right">
              <P className="text-lg font-bold text-amber-400">{streak?.totalStreakDays ?? 0}</P>
              <P className="text-xs text-gray-400">total days</P>
            </div>
          </div>

          {todayClaimed ? (
            <div className="p-3 rounded-lg bg-green-500/20 border border-green-400/60 text-center">
              <P className="text-green-400 font-bold">✅ Checked in today!</P>
              <div className="flex justify-center gap-3 mt-2 font-mono text-sm">
                <span className="bg-black/30 px-2 py-1 rounded text-amber-400">{String(countdown.hours).padStart(2,'0')}h</span>
                <span className="text-gray-500 self-center">:</span>
                <span className="bg-black/30 px-2 py-1 rounded text-amber-400">{String(countdown.minutes).padStart(2,'0')}m</span>
                <span className="text-gray-500 self-center">:</span>
                <span className="bg-black/30 px-2 py-1 rounded text-amber-400">{String(countdown.seconds).padStart(2,'0')}s</span>
              </div>
              <P className="text-xs text-gray-500 mt-1">until next check-in</P>
            </div>
          ) : txPending ? (
            <div className="p-4 text-center">
              <span className="text-3xl">⏳</span>
              <P className="text-sm text-gray-300 mt-2">Confirm in your wallet...</P>
            </div>
          ) : txConfirming || apiLoading ? (
            <div className="p-4 text-center">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <P className="text-sm text-gray-300 mt-2">
                {txConfirming ? 'Confirming on Base...' : 'Calculating reward...'}
              </P>
            </div>
          ) : txError ? (
            <div className="p-3 text-center">
              <P className="text-red-400 font-bold text-sm">❌ Transaction cancelled</P>
              <button
                onClick={() => resetTx()}
                className="mt-2 px-4 py-2 rounded-lg bg-amber-500/30 text-amber-400 text-sm font-bold hover:bg-amber-500/50 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : !scoreQualified ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-400/40 text-center">
              <P className="text-red-400 font-bold text-sm mb-1">⛔ Score Too Low</P>
              <P className="text-xs text-gray-400">
                Your Neynar score ({neynarScore !== null ? (neynarScore * 100).toFixed(0) : '—'}/100) must be ≥50 to claim.
              </P>
              <P className="text-xs text-gray-500 mt-1">Build your Farcaster reputation to qualify.</P>
            </div>
          ) : (
            <div>
              {countdown.total < 3600000 && (
                <div className="mb-2 p-2 rounded bg-yellow-500/20 border border-yellow-400/40 text-center">
                  <P className="text-yellow-400 text-xs font-bold">⚠️ Less than 1h left! Check in now!</P>
                </div>
              )}
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full py-4 rounded-xl bg-amber-500/30 border border-amber-400/70 text-amber-400 font-bold text-lg hover:bg-amber-500/50 active:scale-95 transition-all"
              >
                🔥 Claim {previewCalc.totalReward.toLocaleString()} TYSM
              </button>
              <P className="text-xs text-center text-gray-500 mt-2">Onchain tx • Base Network</P>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reward breakdown */}
      <Card className="border border-blue-400/40 rounded-xl">
        <CardContent className="p-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-black/30 border border-amber-400/30">
              <P className="text-base font-bold text-amber-400">{previewCalc.dailyReward.toLocaleString()}</P>
              <P className="text-xs text-gray-400">Daily</P>
            </div>
            <div className="p-2 rounded bg-black/30 border border-green-400/30">
              <P className="text-base font-bold text-green-400">{previewCalc.weekBonus > 0 ? previewCalc.weekBonus.toLocaleString() : '—'}</P>
              <P className="text-xs text-gray-400">Week Bonus</P>
            </div>
            <div className="p-2 rounded bg-black/30 border border-yellow-400/30">
              <P className="text-base font-bold text-yellow-400">{weekMultiplier * 100}x</P>
              <P className="text-xs text-gray-400">Multiplier</P>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1 Month Progress */}
      <Card className="border border-amber-400/50 rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <H6>1 Month Challenge</H6>
            <P className="text-sm font-bold text-amber-400">Day {streak?.totalStreakDays ?? 0}/30</P>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-amber-400 transition-all duration-500"
              style={{ width: `${Math.min(((streak?.totalStreakDays ?? 0) / 30) * 100, 100)}%` }}
            />
          </div>
          <div className="space-y-2">
            {MILESTONES.map((milestone) => {
              const achieved = (streak?.totalStreakDays ?? 0) >= milestone.day;
              const isNext = nextMilestone?.day === milestone.day;
              return (
                <div
                  key={milestone.day}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    achieved ? 'bg-green-500/20 border border-green-400/50' :
                    isNext ? 'bg-yellow-500/20 border border-yellow-400/50' :
                    'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{achieved ? '✅' : isNext ? '🎯' : '🔒'}</span>
                    <P className={`text-sm ${achieved ? 'text-green-300' : isNext ? 'text-yellow-300' : 'text-gray-400'}`}>
                      {milestone.label}
                    </P>
                    <P className="text-xs text-gray-500">Day {milestone.day}</P>
                  </div>
                  <P className={`font-bold text-sm ${achieved ? 'text-green-400' : isNext ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {milestone.bonus.toLocaleString()} TYSM
                  </P>
                </div>
              );
            })}
          </div>
          {nextMilestone && (
            <P className="text-xs text-center text-gray-500 mt-2">
              {nextMilestone.day - (streak?.totalStreakDays ?? 0)} days until next milestone
            </P>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="border border-gray-600/40 rounded-xl">
        <CardContent className="p-3">
          <P className="text-xs font-bold text-gray-300 mb-2">❓ How rewards work</P>
          <div className="space-y-1 text-xs text-gray-400">
            <p>• Reward = Day × Week × 100 TYSM</p>
            <p>• Day 7 bonus = 7 × Week × 100</p>
            <p>• Week multiplier grows up to 52x</p>
            <p>• Miss a day → streak resets to Week 1 Day 1</p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
