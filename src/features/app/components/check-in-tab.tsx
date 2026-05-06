'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, Button, H6, P } from '@neynar/ui';
import { useFarcasterUser, ShareButton } from '@/neynar-farcaster-sdk/mini';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract, useSimulateContract } from 'wagmi';
import { Attribution } from 'ox/erc8021';
import { MILESTONES } from '@/data/mocks';
import { calculateReward } from '@/db/actions/streak-utils';
import { TYSM_CHECKIN_ADDRESS, TYSM_CHECKIN_ABI } from '@/contracts/tysm-checkin-abi';
import { publicConfig } from '@/config/public-config';
import type { UserStreak } from '@/features/app/types';

const BUILDER_DATA_SUFFIX = Attribution.toDataSuffix({ codes: ['bc_rmi5daom'] });

/**
 * Hook that returns a composeCast function.
 * - If farcasterUser exists → we're inside Farcaster → use sdk.actions.composeCast()
 *   This works from async callbacks (no user gesture required in Farcaster context).
 * - Otherwise (Base App / browser) → fallback to window.open() Warpcast compose URL.
 */
function useComposeCast(isFarcaster: boolean) {
  return useCallback(async (text: string, embedUrl: string) => {
    if (isFarcaster) {
      try {
        const { default: sdk } = await import('@farcaster/miniapp-sdk');
        await sdk.actions.composeCast({
          text,
          embeds: [embedUrl as `https://${string}`],
        });
        return;
      } catch {
        // SDK call failed — fall through to window.open
      }
    }
    // Base App / browser fallback: open Warpcast compose
    const shareText = `${text}\n${embedUrl}`;
    window.open(
      `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`,
      '_blank',
    );
  }, [isFarcaster]);
}

function getTier(balance: number) {
  if (balance >= 500000) return 'LEGENDARY';
  if (balance >= 250000) return 'DIAMOND';
  if (balance >= 100000) return 'GOLD';
  if (balance >= 50000) return 'SILVER';
  return 'BRONZE';
}

/** Format ms remaining into { hours, minutes, seconds } */
function msToHMS(ms: number) {
  const total = Math.max(0, ms);
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor(total / 1000 / 60 / 60);
  return { hours, minutes, seconds, total };
}

export function CheckInTab() {
  const { data: farcasterUser, isLoading: farcasterLoading } = useFarcasterUser();
  const { address: walletAddress } = useAccount();

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
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [claimedReward, setClaimedReward] = useState(0);
  const [claimedStreakSnap, setClaimedStreakSnap] = useState<UserStreak | null>(null);
  const [tokenSendFailed, setTokenSendFailed] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  // Countdown based on server-returned ms until next check-in (20h cooldown)
  const [countdownMs, setCountdownMs] = useState(0);
  const txProcessedRef = useRef<string | null>(null);

  // composeCast: Farcaster = sdk.actions.composeCast (async-safe), Base App = window.open fallback
  const isFarcaster = !!farcasterUser;
  const composeCast = useComposeCast(isFarcaster);

  const { writeContract, data: txData, isPending: txPending, error: txError, reset: resetTx } = useWriteContract();
  const { isLoading: txConfirming, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txData });

  // Source of truth: read canCheckIn from contract (refetch every 30s)
  const { data: contractCanCheckIn, isLoading: contractLoading, refetch: refetchContract } = useReadContract({
    address: TYSM_CHECKIN_ADDRESS,
    abi: TYSM_CHECKIN_ABI,
    functionName: 'canCheckIn',
    args: walletAddress ? [walletAddress as `0x${string}`] : undefined,
    query: { enabled: !!walletAddress, refetchInterval: 30_000 },
  });

  // Simulate checkIn only when contract says we can — catches any revert before sending
  const canCheckOnchain = contractCanCheckIn?.[0] === true;
  const { data: simulateData, error: simulateError } = useSimulateContract({
    address: TYSM_CHECKIN_ADDRESS,
    abi: TYSM_CHECKIN_ABI,
    functionName: 'checkIn',
    query: { enabled: !!walletAddress && canCheckOnchain && !todayClaimed },
  });

  // Contract timeRemaining (seconds) for countdown when cooldown is active
  const contractTimeRemaining = contractCanCheckIn?.[1] ? Number(contractCanCheckIn[1]) * 1000 : 0;

  // Load streak from DB
  const loadStreak = useCallback(async () => {
    if (!user) return;
    setStreakLoading(true);
    try {
      const walletParam = walletAddress ? `&walletAddress=${encodeURIComponent(walletAddress)}` : '';
      const res = await fetch(`/api/user-streak?fid=${user.fid}&username=${encodeURIComponent(user.username || 'user')}${walletParam}`);
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
        // Use server-returned ms for initial countdown
        if (data.msUntilNextCheckIn) setCountdownMs(data.msUntilNextCheckIn);
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

  // Sync countdown from contract timeRemaining when available
  useEffect(() => {
    if (contractTimeRemaining > 0) setCountdownMs(contractTimeRemaining);
  }, [contractTimeRemaining]);

  // Countdown ticker — decrements every second
  useEffect(() => {
    if (countdownMs <= 0) return;
    const t = setInterval(() => {
      setCountdownMs(prev => {
        const next = prev - 1000;
        if (next <= 0) {
          // Cooldown expired — refetch contract and DB state
          refetchContract();
          loadStreak();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [countdownMs, refetchContract, loadStreak]);

  // Handle tx success → call backend for reward
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
      .then(r => r.json())
      .then(result => {
        if (result.success) {
          const reward = result.reward ?? 0;
          const s = result.streak;
          setClaimedReward(reward);
          setTokenSendFailed(result.tokenSendFailed === true);
          if (s) {
            const snap: UserStreak = {
              tysmBalance: s.tysmBalance,
              lastCheckIn: s.lastCheckIn ?? '',
              streakDay: s.streakDay,
              streakWeek: s.streakWeek,
              totalStreakDays: s.totalStreakDays,
            };
            setStreak(snap);
            setClaimedStreakSnap(snap);
          }
          setTodayClaimed(true);
          setCountdownMs(72_000 * 1000);
          setShowSuccess(true);
          refetchContract();

          // Auto-compose cast — Farcaster: sdk.actions.composeCast (no gesture needed)
          // Base App: window.open Warpcast compose URL
          const castText = `Just claimed ${reward} $TYSM on Day ${s?.totalStreakDays ?? 1} 🔥 Stack your streak and earn $TYSM daily!`;
          composeCast(castText, publicConfig.homeUrl).catch(() => {/* ignore */});
        } else {
          console.error('claim-reward error:', result.error);
          setTokenSendFailed(true);
          setTodayClaimed(true);
          setShowSuccess(true);
        }
      })
      .catch(e => {
        console.error('claim-reward fetch error:', e);
        setTodayClaimed(true);
        setShowSuccess(true);
      })
      .finally(() => setApiLoading(false));
  }, [txSuccess, txData, user, walletAddress, refetchContract]);

  function handleConfirmCheckIn() {
    setShowConfirm(false);
    if (simulateData?.request) {
      writeContract({ ...simulateData.request, dataSuffix: BUILDER_DATA_SUFFIX });
    } else {
      writeContract({
        address: TYSM_CHECKIN_ADDRESS,
        abi: TYSM_CHECKIN_ABI,
        functionName: 'checkIn',
        dataSuffix: BUILDER_DATA_SUFFIX,
      });
    }
  }

  function handleCloseSuccess() {
    setShowSuccess(false);
    resetTx();
  }

  const previewCalc = calculateReward(
    streak?.streakDay ?? 1,
    streak?.streakWeek ?? 1,
    streak?.totalStreakDays ?? 0,
  );

  const weekMultiplier = streak?.streakWeek ?? 1;
  const nextMilestone = MILESTONES.find(m => m.day > (streak?.totalStreakDays ?? 0));
  const isLoading = (farcasterLoading && !walletAddress && !farcasterUser) || streakLoading;
  const countdown = msToHMS(countdownMs);
  const lessThan1h = countdownMs > 0 && countdownMs < 3_600_000;

  // Ready to claim: DB + contract + score all agree
  const contractAllows = !contractLoading && canCheckOnchain && !simulateError;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
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
          <H6>Connect to Start</H6>
          <P className="text-sm text-gray-300 mt-2 mb-3">Open in Farcaster or connect a Base wallet to start earning TYSM!</P>
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-400/30">
              <span className="text-lg">💜</span>
              <P className="text-xs text-gray-300">Farcaster users — open via Warpcast frame</P>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-400/30">
              <span className="text-lg">🔵</span>
              <P className="text-xs text-gray-300">Base App users — connect your wallet above</P>
            </div>
          </div>
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
                  <P className="text-xs text-green-400 mt-1">{previewCalc.weekBonus.toLocaleString()} week bonus! 🎉</P>
                )}
                {previewCalc.milestoneBonus > 0 && (
                  <P className="text-xs text-yellow-400 mt-1">{previewCalc.milestoneBonus.toLocaleString()} milestone bonus! 🏆</P>
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
          <Card className="w-full max-w-sm border border-amber-400/70">
            <CardContent className="p-5 text-center">
              {/* Close X */}
              <div className="flex justify-end -mt-1 -mr-1 mb-1">
                <button onClick={handleCloseSuccess} className="text-gray-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center">✕</button>
              </div>

              <P className="text-5xl mb-2">{tokenSendFailed ? '⚠️' : '🎉'}</P>
              <H6 className="mb-3">{tokenSendFailed ? 'Streak Saved!' : 'Claimed!'}</H6>

              {!tokenSendFailed ? (
                <div className="p-3 rounded-lg bg-amber-500/20 border border-amber-400 mb-3">
                  <P className="text-3xl font-bold text-amber-400">{claimedReward.toLocaleString()}</P>
                  <P className="text-xs text-gray-300">TYSM sent to your wallet</P>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-400/60 mb-3 text-left">
                  <div className="flex items-start gap-2">
                    <span className="text-lg mt-0.5">⚠️</span>
                    <div>
                      <P className="text-sm font-bold text-orange-300">Streak saved — token delayed</P>
                      <P className="text-xs text-gray-300 mt-1">
                        Your check-in is recorded onchain ✅ but the TYSM transfer hit a temporary issue.
                      </P>
                      <P className="text-xs text-gray-400 mt-1">
                        {claimedReward > 0
                          ? `${claimedReward.toLocaleString()} TYSM will be sent to your wallet shortly.`
                          : 'Your reward will be sent to your wallet shortly.'}
                      </P>
                      <P className="text-xs text-gray-500 mt-1.5">
                        If tokens don&apos;t arrive within 10 mins, contact support with your TX hash.
                      </P>
                    </div>
                  </div>
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

              {/* Share CTA — full width, prominent */}
              <P className="text-xs text-gray-400 mb-2">Tap to post your reward to Farcaster 👇</P>
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
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-base py-3 mb-2"
              >
                🚀 Post to Farcaster
              </ShareButton>

              <button
                onClick={handleCloseSuccess}
                className="w-full text-xs text-gray-500 hover:text-gray-300 py-1"
              >
                Skip
              </button>
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
                <P className="text-xs text-gray-400">Week {weekMultiplier} • {weekMultiplier * 100}x</P>
                {/* Score badge — only for real Farcaster users */}
                {neynarScore !== null && effectiveFid <= 10_000_000 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    scoreQualified
                      ? 'bg-green-500/20 text-green-400 border border-green-400/40'
                      : 'bg-red-500/20 text-red-400 border border-red-400/40'
                  }`}>
                    {scoreQualified ? '✓' : '✗'} Score {(neynarScore * 100).toFixed(0)}
                  </span>
                )}
                {/* Base badge — wallet-only users (no Farcaster) */}
                {!farcasterUser && walletAddress && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-blue-500/20 text-blue-400 border border-blue-400/40">
                    🔵 Base
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

          {/* States: claimed → pending → confirming → score fail → contract loading → not allowed → ready */}
          {todayClaimed ? (
            <div className="p-3 rounded-lg bg-green-500/20 border border-green-400/60 text-center">
              <P className="text-green-400 font-bold">✅ Checked in!</P>
              {countdownMs > 0 && (
                <>
                  <div className="flex justify-center gap-3 mt-2 font-mono text-sm">
                    <span className="bg-black/30 px-2 py-1 rounded text-amber-400">{String(countdown.hours).padStart(2,'0')}h</span>
                    <span className="text-gray-500 self-center">:</span>
                    <span className="bg-black/30 px-2 py-1 rounded text-amber-400">{String(countdown.minutes).padStart(2,'0')}m</span>
                    <span className="text-gray-500 self-center">:</span>
                    <span className="bg-black/30 px-2 py-1 rounded text-amber-400">{String(countdown.seconds).padStart(2,'0')}s</span>
                  </div>
                  <P className="text-xs text-gray-500 mt-1">until next check-in (20h cooldown)</P>
                </>
              )}
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
              <P className="text-red-400 font-bold text-sm">❌ Transaction failed</P>
              <P className="text-xs text-gray-400 mt-1">
                {(txError as Error).message?.includes('revert') ? 'Contract rejected — cooldown may still be active.' : 'Transaction cancelled.'}
              </P>
              <button
                onClick={() => { resetTx(); refetchContract(); }}
                className="mt-2 px-4 py-2 rounded-lg bg-amber-500/30 text-amber-400 text-sm font-bold hover:bg-amber-500/50"
              >
                Try Again
              </button>
            </div>
          ) : !scoreQualified ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-400/40 text-center">
              <P className="text-red-400 font-bold text-sm mb-1">⛔ Score Too Low</P>
              <P className="text-xs text-gray-400">
                Neynar score ({neynarScore !== null ? (neynarScore * 100).toFixed(0) : '—'}/100) must be ≥50.
              </P>
            </div>
          ) : contractLoading ? (
            <div className="p-4 text-center">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <P className="text-xs text-gray-400 mt-2">Checking onchain status...</P>
            </div>
          ) : !contractAllows ? (
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-400/40 text-center">
              <P className="text-orange-400 font-bold text-sm">⏳ Cooldown active</P>
              <P className="text-xs text-gray-400 mt-1">
                {simulateError ? 'Contract not ready — try again shortly.' : 'Wait for 20h cooldown to expire.'}
              </P>
              <button
                onClick={() => { resetTx(); refetchContract(); }}
                className="mt-2 px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 text-xs font-bold"
              >
                Refresh
              </button>
            </div>
          ) : (
            <div>
              {lessThan1h && (
                <div className="mb-2 p-2 rounded bg-yellow-500/20 border border-yellow-400/40 text-center">
                  <P className="text-yellow-400 text-xs font-bold">⚠️ Check in soon before streak window closes!</P>
                </div>
              )}
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full py-4 rounded-xl bg-amber-500/30 border border-amber-400/70 text-amber-400 font-bold text-lg hover:bg-amber-500/50 active:scale-95 transition-all"
              >
                🔥 Claim {previewCalc.totalReward.toLocaleString()} TYSM
              </button>
              <P className="text-xs text-center text-gray-500 mt-2">Onchain tx • Base Network • 20h cooldown</P>
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
            {MILESTONES.map(milestone => {
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
            <p>• Reward = Day × Week × 100 TYSM (e.g. Day 3 Week 2 = 600 TYSM)</p>
            <p>• Day 7 bonus = 7 × Week × 100 extra TYSM</p>
            <p>• Check in every 20h • Miss 48h = streak resets</p>
            <p>• Booster grows weekly: Week 1 = 100x, Week 52 = 5200x (up to 1 year)</p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
