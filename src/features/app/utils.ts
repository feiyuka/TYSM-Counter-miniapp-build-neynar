import type { TierInfo, Countdown } from '@/features/app/types';

/** Check if scores are balanced (within 10% difference) */
export function isBalanced(neynar: number, quotient: number): boolean {
  return Math.abs(neynar - quotient) <= 0.1;
}

/** Get tier based on average of balanced scores */
export function getTier(neynar: number, quotient: number): TierInfo | null {
  if (!isBalanced(neynar, quotient)) return null;
  const avg = (neynar + quotient) / 2;
  if (avg >= 0.9) return { name: '🏆 LEGENDARY', color: 'text-yellow-400' };
  if (avg >= 0.75) return { name: '💎 DIAMOND', color: 'text-cyan-400' };
  if (avg >= 0.5) return { name: '🥇 GOLD', color: 'text-amber-400' };
  if (avg >= 0.25) return { name: '🥈 SILVER', color: 'text-gray-300' };
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
