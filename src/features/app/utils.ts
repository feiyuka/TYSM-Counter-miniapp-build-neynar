import type { TierInfo, Countdown } from '@/features/app/types';

/** Minimum Neynar Score required to check-in (anti-farming threshold) */
export const MIN_NEYNAR_SCORE = 0.5;

/** Check if user meets minimum score requirement */
export function meetsMinimumScore(neynarScore: number): boolean {
  return neynarScore >= MIN_NEYNAR_SCORE;
}

/** Get tier based on Neynar Score only */
export function getTier(neynarScore: number): TierInfo | null {
  if (!meetsMinimumScore(neynarScore)) return null;
  if (neynarScore >= 0.9) return { name: '🏆 LEGENDARY', color: 'text-yellow-400' };
  if (neynarScore >= 0.8) return { name: '💎 DIAMOND', color: 'text-cyan-400' };
  if (neynarScore >= 0.7) return { name: '🥇 GOLD', color: 'text-amber-400' };
  if (neynarScore >= 0.6) return { name: '🥈 SILVER', color: 'text-gray-300' };
  return { name: '🥉 BRONZE', color: 'text-orange-400' };
}

/** Calculate time until next check-in (00:00 UTC) */
export function getTimeUntilReset(): Countdown {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds, total: diff };
}

/** Get rank badge emoji */
export function getRankBadge(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

/** Get rank style classes */
export function getRankStyle(rank: number): string {
  if (rank === 1) return 'bg-yellow-500/30 border-yellow-400';
  if (rank === 2) return 'bg-gray-400/30 border-gray-300';
  if (rank === 3) return 'bg-orange-500/30 border-orange-400';
  return 'bg-black/20 border-blue-400/50';
}
