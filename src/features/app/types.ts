// TYSM Counter - Type Definitions

/** User profile data from Farcaster */
export interface User {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  walletAddress: string;
}

/** User's score data for qualification check */
export interface UserScores {
  neynarScore: number;
  quotientScore: number;
}

/** User's onchain streak data */
export interface UserStreak {
  tysmBalance: number;
  lastCheckIn: string;
  streakDay: number;
  streakWeek: number;
  totalStreakDays: number;
}

/** Pool statistics */
export interface PoolStats {
  totalPool: number;
  remainingPool: number;
  totalClaimed: number;
  totalClaimers: number;
}

/** Live claim entry */
export interface LiveClaim {
  username: string;
  amount: number;
  time: string;
  txHash: string;
}

/** Leaderboard entry */
export interface LeaderboardEntry {
  rank: number;
  username: string;
  totalTYSM: number;
  streakWeek: number;
  tier: string;
}

/** Weekly claim history */
export interface WeekClaimHistory {
  week: number;
  claimed: number;
  completed: boolean;
}

/** Milestone definition */
export interface Milestone {
  day: number;
  bonus: number;
  label: string;
}

/** Tier information */
export interface TierInfo {
  name: string;
  color: string;
}

/** Countdown timer values */
export interface Countdown {
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}
