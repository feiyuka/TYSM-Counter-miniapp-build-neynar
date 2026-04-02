import type { Milestone } from '@/features/app/types';

// Milestone rewards (1 month streak bonuses)
// These are constants, not mock data
// Milestone bonuses apply the x100 booster (same as daily rewards)
export const MILESTONES: Milestone[] = [
  { day: 29, bonus: 50_000, label: 'Day 29' },
  { day: 30, bonus: 100_000, label: '1 Month! 🎉' },
];
