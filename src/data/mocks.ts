import type {
  User,
  UserScores,
  UserStreak,
  PoolStats,
  LiveClaim,
  LeaderboardEntry,
  WeekClaimHistory,
  Milestone,
} from '@/features/app/types';

// Mock user data
export const MOCK_USER: User = {
  fid: 12345,
  username: 'alice',
  displayName: 'Alice',
  pfpUrl: 'https://api.dicebear.com/9.x/lorelei/svg?seed=alice',
  walletAddress: '0x1234...5678',
};

// Mock scores - these need to be BALANCED to qualify
export const MOCK_SCORES: UserScores = {
  neynarScore: 0.72,
  quotientScore: 0.68,
};

// Mock onchain data - fresh user on Week 1, Day 3
export const MOCK_STREAK: UserStreak = {
  tysmBalance: 6, // 1+2+3 = 6 $TYSM so far
  lastCheckIn: '2024-01-14',
  streakDay: 3,
  streakWeek: 1, // Week 1 (fresh user)
  totalStreakDays: 3, // Total consecutive days (for milestone tracking)
};

// Mock pool & live claims data - fresh pool for new app
export const MOCK_POOL: PoolStats = {
  totalPool: 1000000,
  remainingPool: 1000000,
  totalClaimed: 0,
  totalClaimers: 0,
};

// Mock live claims feed - empty for new app
export const MOCK_LIVE_CLAIMS: LiveClaim[] = [];

// Mock leaderboard data - empty for new app
export const MOCK_LEADERBOARD: LeaderboardEntry[] = [];

// Mock claim history - empty for fresh user
export const MOCK_CLAIM_HISTORY: WeekClaimHistory[] = [];

// Milestone rewards (1 month streak bonuses)
export const MILESTONES: Milestone[] = [
  { day: 29, bonus: 500, label: 'Day 29' },
  { day: 30, bonus: 1000, label: '1 Month! 🎉' },
];
