import type { Milestone } from '@/features/app/types';

// Milestone rewards (1 month streak bonuses)
// These are constants, not mock data
export const MILESTONES: Milestone[] = [
  { day: 29, bonus: 500, label: 'Day 29' },
  { day: 30, bonus: 1000, label: '1 Month! 🎉' },
];
