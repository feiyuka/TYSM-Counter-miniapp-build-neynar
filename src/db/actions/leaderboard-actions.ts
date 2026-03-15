'use server';

import { db } from '@/neynar-db-sdk/db';
import { userStreaks } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

/**
 * Get tier based on average score
 * Note: This uses a simplified version - in production, would integrate with Neynar scores
 */
function getTierFromBalance(balance: number): string {
  if (balance >= 500000) return '🏆 LEGENDARY';
  if (balance >= 250000) return '💎 DIAMOND';
  if (balance >= 100000) return '🥇 GOLD';
  if (balance >= 50000) return '🥈 SILVER';
  return '🥉 BRONZE';
}

/**
 * Get top claimers for leaderboard
 */
export async function getTopClaimers(limit: number = 10) {
  const result = await db
    .select()
    .from(userStreaks)
    .orderBy(desc(userStreaks.tysmBalance))
    .limit(limit);

  return result.map((user, index) => ({
    rank: index + 1,
    fid: user.fid,
    username: user.username,
    pfpUrl: user.pfpUrl,
    totalTYSM: user.tysmBalance,
    streakWeek: user.streakWeek,
    tier: getTierFromBalance(user.tysmBalance),
  }));
}

/**
 * Get user's rank position
 */
export async function getUserRank(fid: number) {
  // Get user's balance
  const user = await db
    .select()
    .from(userStreaks)
    .where(eq(userStreaks.fid, fid))
    .limit(1);

  if (!user[0]) return null;

  // Count users with higher balance
  const result = await db
    .select({
      rank: sql<number>`COUNT(*) + 1`,
    })
    .from(userStreaks)
    .where(sql`${userStreaks.tysmBalance} > ${user[0].tysmBalance}`);

  return {
    rank: Number(result[0]?.rank ?? 1),
    username: user[0].username,
    pfpUrl: user[0].pfpUrl,
    totalTYSM: user[0].tysmBalance,
    streakWeek: user[0].streakWeek,
    tier: getTierFromBalance(user[0].tysmBalance),
  };
}

/**
 * Get leaderboard stats (max week, top TYSM, total claimers)
 */
export async function getLeaderboardStats() {
  const result = await db
    .select({
      maxWeek: sql<number>`COALESCE(MAX(${userStreaks.streakWeek}), 0)`,
      topTysm: sql<number>`COALESCE(MAX(${userStreaks.tysmBalance}), 0)`,
      totalClaimers: sql<number>`COUNT(*)`,
    })
    .from(userStreaks);

  return {
    maxWeek: Number(result[0]?.maxWeek ?? 0),
    topTysm: Number(result[0]?.topTysm ?? 0),
    totalClaimers: Number(result[0]?.totalClaimers ?? 0),
  };
}
