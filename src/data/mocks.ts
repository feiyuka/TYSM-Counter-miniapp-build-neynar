import type { Milestone } from '@/features/app/types';

// Milestone rewards (1 month streak bonuses) - 100x multiplier
// These are constants, not mock data
export const MILESTONES: Milestone[] = [
  { day: 29, bonus: 50000, label: 'Day 29' },
  { day: 30, bonus: 100000, label: '1 Month! 🎉' },
];
