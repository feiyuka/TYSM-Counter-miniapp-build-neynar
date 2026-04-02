'use client';

import { useState } from 'react';
import { useFarcasterUser, useShare } from '@/neynar-farcaster-sdk/mini';
import { useAccount } from 'wagmi';

// How Streaks Work popup
function HowItWorksPopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-amber-400/70 w-full max-w-sm max-h-[80vh] overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-amber-400 text-lg">⚡ How Streaks Work</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-400/40">
              <p className="font-bold text-amber-400 mb-1">Daily Reward Formula</p>
              <p className="text-gray-200 font-mono">Day × Week × 100 TYSM</p>
              <p className="text-gray-400 text-xs mt-1">Example: Day 3, Week 2 = 3×2×100 = 600 TYSM</p>
            </div>

            <div className="p-3 rounded-lg bg-green-500/10 border border-green-400/40">
              <p className="font-bold text-green-400 mb-1">🎉 Week Completion Bonus</p>
              <p className="text-gray-200">On Day 7: extra 7 × Week × 100 TYSM bonus</p>
              <p className="text-gray-400 text-xs mt-1">Streak resets to Day 1 of next week</p>
            </div>

            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-400/40">
              <p className="font-bold text-blue-400 mb-1">🚀 Booster (Week Multiplier)</p>
              <p className="text-gray-200">Each week boosts your pool payout ×100</p>
              <p className="text-gray-400 text-xs mt-1">Week 1 = 100x · Week 2 = 200x · Week 52 = 5200x</p>
              <p className="text-gray-500 text-xs mt-0.5">Streak runs up to 1 year (52 weeks)</p>
            </div>

            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-400/40">
              <p className="font-bold text-yellow-400 mb-1">🏆 1 Month Milestones</p>
              <p className="text-gray-200">Day 29: +50,000 TYSM bonus</p>
              <p className="text-gray-200">Day 30: +100,000 TYSM bonus</p>
            </div>

            <div className="p-3 rounded-lg bg-red-500/10 border border-red-400/40">
              <p className="font-bold text-red-400 mb-1">⚠️ Streak Reset</p>
              <p className="text-gray-200">Miss 48h = reset to Week 1, Day 1</p>
              <p className="text-gray-400 text-xs mt-1">Check-in window: 20h cooldown per claim</p>
            </div>

            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-400/40">
              <p className="font-bold text-purple-400 mb-1">🏅 Tiers</p>
              <div className="text-xs space-y-0.5 text-gray-300">
                <p>🥉 BRONZE: 0–49,999 TYSM</p>
                <p>🥈 SILVER: 50,000–99,999 TYSM</p>
                <p>🥇 GOLD: 100,000–249,999 TYSM</p>
                <p>💎 DIAMOND: 250,000–499,999 TYSM</p>
                <p>🏆 LEGENDARY: 500,000+ TYSM</p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-4 py-3 rounded-xl bg-amber-500/30 border border-amber-400/70 text-amber-400 font-bold"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

// Notification reminder popup
function NotifPopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-blue-400/70 w-full max-w-sm">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-blue-400 text-lg">🔔 Streak Reminders</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-400/40">
              <p className="text-gray-200 text-sm">We send daily reminders to your Warpcast notifications so you never miss a streak!</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-400/40 text-xs text-gray-300 space-y-1">
              <p>☀️ <span className="text-amber-400 font-bold">Morning:</span> 9:00 AM UTC</p>
              <p>🌙 <span className="text-blue-400 font-bold">Evening:</span> 8:00 PM UTC</p>
            </div>
            <p className="text-xs text-gray-500 text-center">Notifications sent to Farcaster users only</p>
          </div>
          <button
            onClick={onClose}
            className="w-full mt-4 py-3 rounded-xl bg-blue-500/30 border border-blue-400/70 text-blue-400 font-bold"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

// My Profile popup
function MyProfilePopup({ onClose }: { onClose: () => void }) {
  const { data: farcasterUser } = useFarcasterUser();
  const { address: walletAddress } = useAccount();

  const displayName = farcasterUser?.displayName || farcasterUser?.username || (walletAddress ? walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4) : 'Guest');
  const username = farcasterUser?.username || '';
  const pfpUrl = farcasterUser?.pfpUrl || `https://api.dicebear.com/9.x/lorelei/svg?seed=${walletAddress || 'guest'}`;
  const fid = farcasterUser?.fid;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-amber-400/70 w-full max-w-sm">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-amber-400 text-lg">👤 My Profile</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-400/40 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pfpUrl}
              alt={displayName}
              className="w-14 h-14 rounded-full border-2 border-amber-400/60 flex-shrink-0"
            />
            <div>
              <p className="font-bold text-white text-base">{displayName}</p>
              {username && <p className="text-amber-400 text-sm">@{username}</p>}
              {fid && <p className="text-gray-500 text-xs font-mono">FID: {fid}</p>}
              {!farcasterUser && walletAddress && (
                <p className="text-gray-400 text-xs font-mono">{walletAddress.slice(0, 10)}...</p>
              )}
            </div>
          </div>

          {farcasterUser ? (
            <button
              onClick={() => { window.open(`https://warpcast.com/${username}`, '_blank'); onClose(); }}
              className="w-full py-3 rounded-xl bg-purple-500/30 border border-purple-400/70 text-purple-400 font-bold text-sm"
            >
              🔗 View on Warpcast
            </button>
          ) : (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-400/40 text-center">
              <p className="text-yellow-400 text-sm font-bold">Open in Farcaster</p>
              <p className="text-gray-400 text-xs mt-1">to link your Farcaster account</p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-3 py-3 rounded-xl bg-gray-700/50 border border-gray-600 text-gray-300 font-bold text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function CustomHeader() {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { data: farcasterUser } = useFarcasterUser();
  const { address: walletAddress } = useAccount();
  const { share } = useShare();

  async function handleShare() {
    if (isSharing) return;
    setIsSharing(true);
    try {
      await share({
        text: 'Earning $TYSM daily with streaks! Check in every day on Base Network and stack your rewards 🔥',
        channelKey: 'base',
        close: false,
      });
    } catch {
      // ignore cancel
    } finally {
      setIsSharing(false);
    }
  }

  const pfpUrl = farcasterUser?.pfpUrl || (walletAddress ? `https://api.dicebear.com/9.x/lorelei/svg?seed=${walletAddress}` : null);

  return (
    <>
      {showHowItWorks && <HowItWorksPopup onClose={() => setShowHowItWorks(false)} />}
      {showNotif && <NotifPopup onClose={() => setShowNotif(false)} />}
      {showProfile && <MyProfilePopup onClose={() => setShowProfile(false)} />}

      <div className="flex items-center justify-between py-2 mb-2">
        {/* Left: Profile avatar */}
        <button
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {pfpUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pfpUrl}
              alt="Profile"
              className="w-9 h-9 rounded-full border border-amber-400/70 object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full border border-amber-400/70 bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm font-bold">
              ?
            </div>
          )}
        </button>

        {/* Center: Logo + Title */}
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/1769648461618.png"
            alt="TYSM"
            className="w-8 h-8 rounded-full border border-amber-400/70 object-cover"
          />
          <h1 className="text-lg font-bold text-amber-400">TYSM Counter</h1>
        </div>

        {/* Right: Share + Bell + Info */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="w-9 h-9 rounded-full bg-amber-500/30 border border-amber-400/70 flex items-center justify-center hover:bg-amber-500/50 active:scale-95 transition-all disabled:opacity-50"
            title="Share TYSM"
          >
            <span className="text-base">{isSharing ? '⏳' : '🚀'}</span>
          </button>
          <button
            onClick={() => setShowNotif(true)}
            className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-400/50 flex items-center justify-center hover:bg-blue-500/40 transition-colors"
            title="Notifications"
          >
            <span className="text-base">🔔</span>
          </button>
          <button
            onClick={() => setShowHowItWorks(true)}
            className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center hover:bg-amber-500/40 transition-colors"
            title="How it works"
          >
            <span className="text-base font-bold text-amber-400">?</span>
          </button>
        </div>
      </div>
    </>
  );
}
