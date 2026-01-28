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

// Mock Neynar Score data
const mockNeynarScore = {
  score: 0.847,
  percentile: 92,
};

// Quotient thresholds and rewards
const REWARD_TIERS = [
  { threshold: 0.9, reward: '🏆 LEGENDARY', tysm: 1000, color: 'text-yellow-400' },
  { threshold: 0.75, reward: '💎 DIAMOND', tysm: 500, color: 'text-cyan-400' },
  { threshold: 0.5, reward: '🥇 GOLD', tysm: 250, color: 'text-amber-400' },
  { threshold: 0.25, reward: '🥈 SILVER', tysm: 100, color: 'text-gray-300' },
  { threshold: 0, reward: '🥉 BRONZE', tysm: 50, color: 'text-orange-400' },
];

function getRewardTier(score: number) {
  return REWARD_TIERS.find((tier) => score >= tier.threshold) || REWARD_TIERS[REWARD_TIERS.length - 1];
}

export function MiniApp() {
  const [claimed, setClaimed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const tier = getRewardTier(mockNeynarScore.score);
  const scorePercentage = Math.round(mockNeynarScore.score * 100);

  return (
    <SketchMiniLayout title="TYSM Counter" mode="fixed">
      <div className="flex-1 flex flex-col p-4 gap-4">
        {/* User Profile Card */}
        <SketchCard padding="md">
          <div className="flex items-center gap-3">
            <img
              src={mockUser.pfpUrl}
              alt={mockUser.displayName}
              className="w-14 h-14 rounded-full border-2 border-purple-400"
            />
            <div className="flex-1">
              <p className="font-bold text-lg">{mockUser.displayName}</p>
              <p className="sketch-text text-sm opacity-70">@{mockUser.username}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-60">FID</p>
              <p className="font-mono font-bold">{mockUser.fid}</p>
            </div>
          </div>
        </SketchCard>

        {/* Neynar Score Display */}
        <SketchCard padding="lg">
          <div className="text-center">
            <p className="sketch-text text-sm opacity-70 mb-2">Your Neynar Score</p>
            <div className="relative w-32 h-32 mx-auto mb-4">
              {/* Circular progress background */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="opacity-20"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${scorePercentage * 2.83} 283`}
                  className="text-purple-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold">{mockNeynarScore.score.toFixed(3)}</span>
              </div>
            </div>
            <p className="sketch-text">
              Top <span className="font-bold text-purple-400">{mockNeynarScore.percentile}%</span> of users
            </p>
          </div>
        </SketchCard>

        {/* Reward Tier */}
        <SketchCard padding="md">
          <div className="text-center">
            <p className="sketch-text text-sm opacity-70 mb-1">Your Tier</p>
            <p className={`text-2xl font-bold ${tier.color}`}>{tier.reward}</p>
            <div className="mt-3 p-3 rounded-lg bg-black/20">
              <p className="sketch-text text-sm opacity-70">TYSM Reward</p>
              <p className="text-3xl font-bold text-green-400">+{tier.tysm} TYSM</p>
            </div>
          </div>
        </SketchCard>

        {/* Threshold Details */}
        {showDetails && (
          <SketchCard padding="sm">
            <SketchHeading level={6}>Quotient Thresholds</SketchHeading>
            <div className="space-y-2 mt-2">
              {REWARD_TIERS.map((t, i) => (
                <div
                  key={i}
                  className={`flex justify-between items-center p-2 rounded ${
                    tier.threshold === t.threshold ? 'bg-purple-500/30 border border-purple-400' : 'opacity-60'
                  }`}
                >
                  <span className={`font-medium ${t.color}`}>{t.reward}</span>
                  <span className="sketch-text text-sm">≥ {t.threshold} → {t.tysm} TYSM</span>
                </div>
              ))}
            </div>
          </SketchCard>
        )}

        <SketchButton
          variant="outline"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Thresholds' : 'View All Thresholds'}
        </SketchButton>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 space-y-3">
        {!claimed ? (
          <SketchButton variant="primary" onClick={() => setClaimed(true)}>
            🎁 Claim {tier.tysm} TYSM
          </SketchButton>
        ) : (
          <>
            <div className="text-center p-3 bg-green-500/20 rounded-lg border border-green-400">
              <p className="text-green-400 font-bold">✅ Claimed!</p>
              <p className="sketch-text text-sm opacity-70">Come back tomorrow for more</p>
            </div>
            <SketchButton variant="secondary">Share</SketchButton>
          </>
        )}
      </div>
    </SketchMiniLayout>
  );
}
