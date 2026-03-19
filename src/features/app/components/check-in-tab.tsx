'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, Button, H6, P } from '@neynar/ui';
import { useFarcasterUser, ShareButton } from '@/neynar-farcaster-sdk/mini';
import { useUser } from '@/neynar-web-sdk/src/neynar/api-hooks';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { Attribution } from 'ox/erc8021';
import type { UserStreak } from '@/features/app/types';
import { MILESTONES } from '@/data/mocks';
import { meetsMinimumScore, getTimeUntilReset, MIN_NEYNAR_SCORE } from '@/features/app/utils';
import {
  getOrCreateUserStreak,
  canCheckInToday,
} from '@/db/actions/streak-actions';
import { calculateReward } from '@/db/actions/streak-utils';
import { TYSM_CHECKIN_ADDRESS, TYSM_CHECKIN_ABI } from '@/contracts/tysm-checkin-abi';

// Constants - Use Warpcast mini app deep link format
const APP_URL = 'https://warpcast.com/~/frames/launch?domain=miniapp-generator-fid-544548-260128213922530.neynar.app';

// ERC-8021 Builder Code attribution — registered at base.dev
// Appended to every check-in transaction so Base can attribute usage to this app
const BUILDER_DATA_SUFFIX = Attribution.toDataSuffix({ codes: ['bc_rmi5daom'] });

export function CheckInTab() {
  const { data: farcasterUser, isLoading: farcasterLoading } = useFarcasterUser();
  const { address: walletAddress } = useAccount();

  // Derive a stable numeric ID from wallet address for Base App users
  // For Farcaster users: use real FID
  // For Base App users (no FID): derive pseudo-fid from wallet address
  const effectiveFid = useMemo(() => {
    if (farcasterUser?.fid) return farcasterUser.fid;
    if (walletAddress) {
      // Take last 8 hex chars of address → convert to number (max ~4 billion)
      // Add large offset to avoid collision with real FIDs
      return parseInt(walletAddress.slice(-8), 16);
    }
    return 0;
  }, [farcasterUser?.fid, walletAddress]);

  // Build unified user object — Farcaster user or wallet-only user
  const user = useMemo(() => {
    if (farcasterUser) return farcasterUser;
    if (walletAddress) {
      return {
        fid: effectiveFid,
        username: walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4),
        displayName: 'Base User',
        pfpUrl: `https://api.dicebear.com/9.x/lorelei/svg?seed=${walletAddress}`,
      };
    }
    return null;
  }, [farcasterUser, walletAddress, effectiveFid]);

  // Loading: wait for Farcaster only if wallet not connected yet
  const userLoading = farcasterLoading && !walletAddress && !farcasterUser;

  // Fetch real Neynar Score from API (only for Farcaster users with real FID)
  const { data: neynarUser, isLoading: scoreLoading } = useUser(
    farcasterUser?.fid ?? 0,
    { x_neynar_experimental: true },
    { enabled: !!farcasterUser?.fid }
  );

  // Base App users: auto-eligible (no Neynar Score available)
  // Farcaster users: use real Neynar Score
  const neynarScore = farcasterUser
    ? (neynarUser?.experimental?.neynar_user_score ?? 0)
    : MIN_NEYNAR_SCORE; // Base App users are considered eligible

  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [streakLoading, setStreakLoading] = useState(true);
  const [todayClaimed, setTodayClaimed] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(getTimeUntilReset());
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [claimedReward, setClaimedReward] = useState(0);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const [showAddAppPopup, setShowAddAppPopup] = useState(false);
  const [tokenSendFailed, setTokenSendFailed] = useState(false);

  // Ref to prevent double execution of tx success handler
  const txProcessedRef = useRef<string | null>(null);

  // Calculate tier based on tysmBalance - MUST be before early returns
  const getTier = useCallback((balance: number) => {
    if (balance >= 500000) return 'LEGENDARY';
    if (balance >= 250000) return 'DIAMOND';
    if (balance >= 100000) return 'GOLD';
    if (balance >= 50000) return 'SILVER';
    return 'BRONZE';
  }, []);

  // Check if user has added app before (using localStorage)
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      const hasAddedApp = localStorage.getItem(`tysm_app_added_${user.fid}`);
      if (!hasAddedApp) {
        const timer = setTimeout(() => setShowAddAppPopup(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  // Handle Add App - Base App handles this automatically, just record locally
  const handleAddApp = useCallback(() => {
    if (!user) return;
    localStorage.setItem(`tysm_app_added_${user.fid}`, 'true');
    setShowAddAppPopup(false);
  }, [user]);

  const handleSkipAddApp = useCallback(() => {
    if (user) localStorage.setItem(`tysm_app_added_${user.fid}`, 'skipped');
    setShowAddAppPopup(false);
  }, [user]);

  // Wagmi hooks for contract interaction
  const { writeContract, data: txData, isPending: txPending, error: txError } = useWriteContract();
  const { isLoading: txConfirming, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txData });

  // Read contract: check if user can check in
  const { data: canCheckInData, refetch: refetchCanCheckIn } = useReadContract({
    address: TYSM_CHECKIN_ADDRESS,
    abi: TYSM_CHECKIN_ABI,
    functionName: 'canCheckIn',
    args: walletAddress ? [walletAddress] : undefined,
    query: { enabled: !!walletAddress },
  });

  // Read contract: preview reward
  const { data: previewRewardData } = useReadContract({
    address: TYSM_CHECKIN_ADDRESS,
    abi: TYSM_CHECKIN_ABI,
    functionName: 'previewReward',
    args: walletAddress ? [walletAddress] : undefined,
    query: { enabled: !!walletAddress },
  });

  // Read contract: get user streak from contract
  const { refetch: refetchContractStreak } = useReadContract({
    address: TYSM_CHECKIN_ADDRESS,
    abi: TYSM_CHECKIN_ABI,
    functionName: 'getUserStreak',
    args: walletAddress ? [walletAddress] : undefined,
    query: { enabled: !!walletAddress },
  });

  // Parse contract data - memoized
  const contractData = useMemo(() => ({
    canCheckInOnchain: canCheckInData?.[0] ?? true,
    timeRemainingOnchain: canCheckInData?.[1] ? Number(canCheckInData[1]) : 0,
    willResetOnchain: canCheckInData?.[2] ?? false,
    previewReward: previewRewardData ? Number(formatUnits(previewRewardData, 18)) : 0,
  }), [canCheckInData, previewRewardData]);

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
        const canCheck = await canCheckInToday(user.fid);
        setTodayClaimed(!canCheck);
      }
    } catch (error) {
      console.error('Failed to load streak:', error);
    } finally {
      setStreakLoading(false);
    }
  }, [user]);

  useEffect(() => { loadStreak(); }, [loadStreak]);

  // Countdown timer - optimized with longer interval
  useEffect(() => {
    const timer = setInterval(() => setCountdown(getTimeUntilReset()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check if user meets minimum score threshold
  const eligible = useMemo(() => meetsMinimumScore(neynarScore), [neynarScore]);

  // Check if today is a milestone day
  const nextMilestone = useMemo(() =>
    MILESTONES.find((m) => m.day > (streak?.totalStreakDays || 0)),
    [streak?.totalStreakDays]
  );

  const handleCheckInClick = useCallback(() => setShowConfirmPopup(true), []);

  const handleConfirmCheckIn = useCallback(async () => {
    if (!user || !walletAddress) return;
    setShowConfirmPopup(false);
    try {
      writeContract({
        address: TYSM_CHECKIN_ADDRESS,
        abi: TYSM_CHECKIN_ABI,
        functionName: 'checkIn',
        dataSuffix: BUILDER_DATA_SUFFIX,
      });
    } catch (error) {
      console.error('Check-in error:', error);
    }
  }, [user, walletAddress, writeContract]);

  // Handle transaction success - call server API to send x100 reward via server wallet
  useEffect(() => {
    const handleTxSuccess = async () => {
      if (!txSuccess || !txData || !user || !walletAddress || txProcessedRef.current === txData) return;

      txProcessedRef.current = txData;
      setTxHash(txData);

      try {
        // Call backend API to calculate x100 reward and send TYSM from server wallet
        const response = await fetch('/api/claim-reward', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fid: user.fid,
            username: user.username || 'user',
            pfpUrl: user.pfpUrl,
            walletAddress,
            txHash: txData,
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Update displayed reward with actual x100 amount from server
          setClaimedReward(result.reward);
          setTokenSendFailed(result.tokenSendFailed === true);

          if (result.streak) {
            setStreak({
              tysmBalance: result.streak.tysmBalance,
              lastCheckIn: result.streak.lastCheckIn?.toISOString() || '',
              streakDay: result.streak.streakDay,
              streakWeek: result.streak.streakWeek,
              totalStreakDays: result.streak.totalStreakDays,
            });
          }

          refetchCanCheckIn();
          refetchContractStreak();
          setTodayClaimed(true);
          setShowSuccessPopup(true);
        } else {
          // API failed — still show popup so user knows tx went through onchain
          console.error('Claim reward failed:', result.error);
          setTokenSendFailed(true);
          setTodayClaimed(true);
          setShowSuccessPopup(true);
        }
      } catch (err) {
        console.error('Claim reward error:', err);
        setTodayClaimed(true);
        setShowSuccessPopup(true);
      }
    };

    handleTxSuccess();
  }, [txSuccess, txData, user, walletAddress, refetchCanCheckIn, refetchContractStreak]);

  const openTxInBrowser = useCallback(() => {
    if (txHash) window.open(`https://basescan.org/tx/${txHash}`, '_blank');
  }, [txHash]);

  const handleShareApp = useCallback(() => {
    const text = streak && streak.totalStreakDays > 0
      ? `I'm on a ${streak.totalStreakDays} day streak earning $TYSM! 🔥\n\nJoin me: ${APP_URL}`
      : `Earn $TYSM tokens with daily check-ins! 🎁\n\nTry it: ${APP_URL}`;
    window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`, '_blank');
  }, [streak]);

  // Loading state
  if (userLoading || streakLoading || scoreLoading) {
    return (
      <div className="space-y-4 relative">
        <Card className="border border-amber-400/70 rounded-xl animate-pulse">
          <CardContent className="p-4"><div className="h-20 bg-amber-500/20 rounded" /></CardContent>
        </Card>
        <Card className="border border-amber-400/70 rounded-xl animate-pulse">
          <CardContent className="p-4"><div className="h-32 bg-amber-500/20 rounded" /></CardContent>
        </Card>
      </div>
    );
  }

  // Guest user state — no Farcaster AND no wallet connected
  if (!user) {
    return (
      <div className="space-y-4 relative">
        <Card className="border border-amber-400/70 rounded-xl">
          <CardContent className="p-6 text-center">
            <P className="text-4xl mb-3">🔐</P>
            <H6>Connect Your Wallet</H6>
            <P className="text-sm opacity-70 mt-2">Open in Farcaster or connect a wallet to start earning TYSM tokens!</P>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { canCheckInOnchain, timeRemainingOnchain, willResetOnchain } = contractData;

  // Preview reward using shared calculateReward — same logic as server
  const previewCalc = calculateReward(
    streak?.streakDay ?? 1,
    streak?.streakWeek ?? 1,
    streak?.totalStreakDays ?? 0,
  );
  const previewReward = previewCalc.totalReward;

  return (
    <div className="space-y-4 relative">
      {/* Add App Popup */}
      {showAddAppPopup && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card>
            <CardContent className="p-5">
              <div className="text-center">
                <P className="text-5xl mb-3">🔔</P>
                <H6>Stay Updated!</H6>
                <P className="text-sm opacity-70 mt-2 mb-4">Add TYSM Counter to your favorites and enable daily reminders!</P>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 p-2 rounded bg-amber-500/20 border border-amber-400/60">
                    <span>📱</span><P className="text-sm text-left">Quick access from your apps</P>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-blue-500/20 border border-blue-400/60">
                    <span>🔔</span><P className="text-sm text-left">Daily notification reminders</P>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-green-500/20 border border-green-400/60">
                    <span>🔥</span><P className="text-sm text-left">Never lose your streak!</P>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSkipAddApp}>Maybe Later</Button>
                  <Button onClick={handleAddApp}>✅ Add App</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Share Icon - Top Left */}
      <button onClick={handleShareApp} className="absolute -top-10 left-0 w-8 h-8 rounded-full border border-purple-400/60 bg-purple-500/30 text-purple-300 font-bold flex items-center justify-center hover:bg-purple-500/50 transition-colors text-sm">🚀</button>

      {/* Help Icon - Top Right */}
      <button onClick={() => setShowStreakInfo(true)} className="absolute -top-10 right-0 w-8 h-8 rounded-full border border-amber-400/60 bg-amber-500/30 text-amber-400 font-bold flex items-center justify-center hover:bg-amber-500/50 transition-colors">❓</button>

      {/* User Profile */}
      <button onClick={() => setShowProfilePopup(true)} className="w-full text-left">
        <Card className="border border-amber-400/70 rounded-xl hover:bg-amber-500/10 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={user.pfpUrl || `https://api.dicebear.com/9.x/lorelei/svg?seed=${user.username}`} alt={user.displayName || user.username} className="w-12 h-12 rounded-full border border-amber-400/60" />
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

      {/* Countdown Timer */}
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
                <P className="font-bold">Don&apos;t lose your streak!</P>
                <P className="text-xs opacity-70">Only {countdown.hours}h {countdown.minutes}m left to check in today</P>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Check-in */}
      <Card className="border border-amber-400/70 rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <H6>Daily Check-in</H6>
              <P className="text-xs opacity-50 mt-1">🔗 Onchain rewards</P>
            </div>
            <div className="text-right">
              <P className="text-sm font-bold text-amber-400">Week {streak?.streakWeek || 1}</P>
              <P className="text-xs opacity-60">{(streak?.streakWeek || 1) * 100}x Multiplier</P>
            </div>
          </div>

          {eligible ? (
            !todayClaimed && canCheckInOnchain ? (
              <div className="text-center">
                {txPending || txConfirming ? (
                  <div className="p-4">
                    <span className="text-4xl animate-spin inline-block">⏳</span>
                    <P className="text-sm opacity-70 mt-2">{txPending ? 'Confirm in wallet...' : 'Confirming on Base...'}</P>
                  </div>
                ) : txError ? (
                  <div className="p-4">
                    <P className="text-red-400 font-bold">❌ Transaction Failed</P>
                    <P className="text-xs opacity-70 mt-1">{txError.message?.slice(0, 50)}...</P>
                    <button onClick={handleCheckInClick} className="mt-3 px-4 py-2 rounded-lg bg-amber-500/30 text-amber-400 font-bold hover:bg-amber-500/50 transition-colors">Try Again</button>
                  </div>
                ) : (
                  <>
                    <button onClick={handleCheckInClick} className="w-full py-4 rounded-lg border-amber-400/70 bg-amber-500/30 text-amber-400 font-bold text-lg hover:bg-amber-500/50 transition-colors">🔥 Check In & Claim {previewReward} TYSM</button>
                    {willResetOnchain && <P className="text-yellow-400 text-xs mt-2">⚠️ Streak will reset - you missed a day!</P>}
                  </>
                )}
              </div>
            ) : (
              <div className="text-center p-4 bg-green-500/20 rounded-lg border border-green-400/60">
                <P className="text-green-400 font-bold text-lg">✅ Checked In!</P>
                <P className="text-xs opacity-50 mt-1">Come back in {Math.floor(timeRemainingOnchain / 3600)}h {Math.floor((timeRemainingOnchain % 3600) / 60)}m</P>
              </div>
            )
          ) : (
            <div className="text-center p-4 bg-red-500/20 rounded-lg border border-red-400/60">
              <P className="text-red-400 font-bold">🚫 Check-in Locked</P>
              <P className="text-sm opacity-70">Neynar Score must be ≥{MIN_NEYNAR_SCORE}</P>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Popup */}
      {showConfirmPopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <P className="text-4xl mb-3">🔗</P>
                <H6>Check In Onchain?</H6>
                <P className="text-sm opacity-70 mt-2 mb-4">This will send a transaction to Base Network</P>
                <div className="p-3 rounded-lg bg-amber-500/20 mb-4">
                  <P className="text-xs opacity-60">You will receive</P>
                  <P className="text-2xl font-bold text-amber-400">{previewReward} TYSM</P>
                  {willResetOnchain && <P className="text-sm text-yellow-400">⚠️ Streak will reset</P>}
                </div>
                <P className="text-xs opacity-50 mb-4">Requires small gas fee (~$0.01)</P>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowConfirmPopup(false)}>Cancel</Button>
                  <Button onClick={handleConfirmCheckIn}>Confirm</Button>
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
                <P className="text-5xl mb-3">{tokenSendFailed ? '⚠️' : '🎉'}</P>
                <H6>{tokenSendFailed ? 'Check-in Recorded!' : 'Claim Successful!'}</H6>
                {tokenSendFailed ? (
                  <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-400/60 my-3">
                    <P className="text-yellow-300 font-bold text-sm">Streak saved ✅</P>
                    <P className="text-xs opacity-70 mt-1">TYSM token transfer is pending — pool may be refilling. Your streak is recorded and reward will be sent shortly.</P>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-amber-500/20 border border-amber-400 my-4">
                    <P className="text-3xl font-bold text-amber-400">{claimedReward.toLocaleString()} TYSM</P>
                    <P className="text-xs opacity-60 mt-1">sent to your wallet</P>
                  </div>
                )}
                {txHash && (
                  <div className="p-2 bg-black/30 rounded mb-4">
                    <P className="text-xs opacity-50 mb-1">Check-in TX</P>
                    <P className="text-xs font-mono text-green-300 break-all">{txHash.slice(0, 10)}...{txHash.slice(-8)}</P>
                    <button onClick={openTxInBrowser} className="mt-2 text-xs text-blue-400 underline">View on BaseScan →</button>
                  </div>
                )}
                <div className="flex gap-2">
                  {!tokenSendFailed && (
                    <ShareButton
                      text={`I just claimed ${claimedReward.toLocaleString()} $TYSM! Day ${streak?.totalStreakDays || 1} streak 🔥`}
                      queryParams={{
                        tysmBalance: (streak?.tysmBalance || 0).toString(),
                        streakDay: (streak?.streakDay || 1).toString(),
                        streakWeek: (streak?.streakWeek || 1).toString(),
                        tier: getTier(streak?.tysmBalance || 0),
                        username: user?.username || 'Player',
                      }}
                      variant="default"
                    >
                      Share
                    </ShareButton>
                  )}
                  <Button onClick={() => setShowSuccessPopup(false)}>Done</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scores */}
      <Card className="border border-amber-400/50 rounded-lg">
        <CardContent className="p-3">
          <H6>Score Check</H6>
          <div className="mt-2">
            <div className="flex items-center justify-between p-3 rounded-md bg-amber-500/20 border border-amber-400/40">
              <div>
                <P className="text-xs opacity-60">Neynar Score</P>
                <P className="text-xs opacity-50 mt-0.5">min {MIN_NEYNAR_SCORE} to qualify</P>
              </div>
              <P className="text-3xl font-bold text-amber-400">{neynarScore.toFixed(2)}</P>
            </div>
          </div>
          <div className={`mt-2 p-2 rounded-md text-center ${eligible ? 'bg-green-500/20 border border-green-400/50' : 'bg-red-500/20 border border-red-400/50'}`}>
            {eligible ? (
              <><P className="text-green-400 font-bold">✅ ELIGIBLE</P><P className="text-sm opacity-70">You can check in daily!</P></>
            ) : (
              <><P className="text-red-400 font-bold">❌ NOT ELIGIBLE</P><P className="text-sm opacity-70">Score too low — improve your Farcaster activity</P></>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card className="border border-amber-400/70 rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <H6>1 Month Milestones</H6>
            <P className="text-sm font-bold text-amber-400">Day {streak?.totalStreakDays || 0}</P>
          </div>
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-blue-500 to-amber-400 transition-all" style={{ width: `${Math.min(((streak?.totalStreakDays || 0) / 30) * 100, 100)}%` }} />
          </div>
          <div className="space-y-2">
            {MILESTONES.map((milestone) => {
              const achieved = (streak?.totalStreakDays || 0) >= milestone.day;
              const isNext = nextMilestone?.day === milestone.day;
              return (
                <div key={milestone.day} className={`flex items-center justify-between p-2 rounded ${achieved ? 'bg-green-500/20 border border-green-400/60' : isNext ? 'bg-yellow-500/20 border border-yellow-400/60' : 'bg-blue-500/20 border border-blue-400/40'}`}>
                  <div className="flex items-center gap-2">
                    <span>{achieved ? '✅' : isNext ? '🎯' : '💙'}</span>
                    <span className={`text-sm font-medium ${!achieved && !isNext ? 'text-blue-300' : ''}`}>{milestone.label}</span>
                    <span className={`text-xs ${!achieved && !isNext ? 'text-blue-400/70' : 'opacity-50'}`}>Day {milestone.day}</span>
                  </div>
                  <span className={`font-bold ${achieved ? 'text-green-400' : isNext ? 'text-yellow-400' : 'text-blue-300'}`}>{milestone.bonus} TYSM</span>
                </div>
              );
            })}
          </div>
          {nextMilestone ? (
            <P className="text-xs text-center opacity-50 mt-3">{nextMilestone.day - (streak?.totalStreakDays || 0)} days until next milestone!</P>
          ) : (
            <P className="text-xs text-center text-green-400 mt-3">🎉 All milestones achieved! Keep your streak going!</P>
          )}
        </CardContent>
      </Card>

      {/* Profile Stats Popup */}
      {showProfilePopup && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-blue-400/70 max-h-[80vh] overflow-y-auto w-full max-w-sm">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <H6>📊 My Stats</H6>
                <button onClick={() => setShowProfilePopup(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/20 border border-amber-400/60 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.pfpUrl || `https://api.dicebear.com/9.x/lorelei/svg?seed=${user.username}`} alt={user.displayName || user.username} className="w-12 h-12 rounded-full border border-amber-400/60" />
                <div className="flex-1">
                  <P className="font-bold">{user.displayName || user.username}</P>
                  <P className="text-xs opacity-70 font-mono">FID: {user.fid}</P>
                </div>
              </div>
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
              <div className="p-2 rounded bg-amber-500/20 border border-amber-400/60 mb-4">
                <div className="flex items-center justify-between">
                  <P className="text-xs text-amber-400 font-bold">Week {streak?.streakWeek || 1} • Day {streak?.streakDay || 1}/7</P>
                  <P className="text-xs opacity-60">{(streak?.streakWeek || 1) * 100}x Multiplier</P>
                </div>
              </div>
              <P className="text-xs font-bold text-yellow-400 mb-2">🎯 1 Month Milestones</P>
              <div className="space-y-2">
                {MILESTONES.map((milestone) => {
                  const achieved = (streak?.totalStreakDays || 0) >= milestone.day;
                  return (
                    <div key={milestone.day} className={`flex items-center justify-between p-2 rounded ${achieved ? 'bg-green-500/20 border border-green-400/60' : 'bg-black/20 border border-gray-500/40 opacity-50'}`}>
                      <div className="flex items-center gap-2">
                        <span>{achieved ? '✅' : '🔒'}</span>
                        <span className="text-sm">{milestone.label}</span>
                      </div>
                      <span className={`font-bold ${achieved ? 'text-green-400' : 'opacity-50'}`}>{milestone.bonus} TYSM</span>
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
              <div className="flex items-center justify-between mb-4">
                <H6>❓ How Streaks Work</H6>
                <button onClick={() => setShowStreakInfo(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="p-2 rounded bg-black/20 border border-amber-400/60">
                  <P className="font-bold text-amber-400">Week 1 (1x × 100)</P>
                  <P className="opacity-70">100, 200...700 = 2,800 (700 bonus) = 3,500 TYSM</P>
                </div>
                <div className="p-2 rounded bg-black/20 border border-amber-400/60">
                  <P className="font-bold text-amber-400">Week 2 (2x × 100)</P>
                  <P className="opacity-70">200, 400...1,400 = 5,600 (1,400 bonus) = 7,000 TYSM</P>
                </div>
                <div className="p-2 rounded bg-black/20 border border-amber-400/60">
                  <P className="font-bold text-amber-400">Week 3 (3x × 100)</P>
                  <P className="opacity-70">300, 600...2,100 = 8,400 (2,100 bonus) = 10,500 TYSM</P>
                </div>
                <div className="p-2 rounded bg-black/20 border border-amber-400/60">
                  <P className="font-bold text-amber-400">Week 4 (4x × 100)</P>
                  <P className="opacity-70">400, 800...2,800 = 11,200 (2,800 bonus) = 14,000 TYSM</P>
                </div>
                <div className="p-2 rounded bg-amber-500/20 border border-amber-400/60">
                  <P className="font-bold text-amber-400">♾️ Week 5 → Week 52 (max)</P>
                  <P className="opacity-70">Grows to 52x! Max = 36,400 TYSM/day!</P>
                </div>
                <div className="p-2 rounded bg-green-500/20 border border-green-400/60">
                  <P className="font-bold text-green-400">🎯 1 Month Milestone</P>
                  <P className="opacity-70">Day 29: 50,000 | Day 30: 100,000 TYSM bonus!</P>
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

    </div>
  );
}
