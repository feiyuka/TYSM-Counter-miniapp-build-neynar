'use server';

import { db } from '@/neynar-db-sdk/db';
import { claims } from '@/db/schema';
import { desc, sql } from 'drizzle-orm';

/**
 * Save a new claim record
 */
export async function saveClaim(
  fid: number,
  username: string,
  amount: number,
  txHash: string
) {
  await db.insert(claims).values({
    fid,
    username,
    amount,
    txHash,
  });
}

/**
 * Get recent claims for live feed
 */
export async function getRecentClaims(limit: number = 10) {
  const result = await db
    .select()
    .from(claims)
    .orderBy(desc(claims.createdAt))
    .limit(limit);

  // Format time ago
  return result.map((claim) => ({
    ...claim,
    time: formatTimeAgo(claim.createdAt),
  }));
}

/**
 * Get total amount claimed across all users
 */
export async function getTotalClaimed(): Promise<number> {
  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${claims.amount}), 0)`,
    })
    .from(claims);

  return Number(result[0]?.total ?? 0);
}

/**
 * Get count of unique claimers
 */
export async function getTotalClaimers(): Promise<number> {
  const result = await db
    .select({
      count: sql<number>`COUNT(DISTINCT ${claims.fid})`,
    })
    .from(claims);

  return Number(result[0]?.count ?? 0);
}

/**
 * Get pool statistics
 */
export async function getPoolStats(totalPool: number = 1000000) {
  const [totalClaimed, totalClaimers] = await Promise.all([
    getTotalClaimed(),
    getTotalClaimers(),
  ]);

  return {
    totalPool,
    remainingPool: totalPool - totalClaimed,
    totalClaimed,
    totalClaimers,
  };
}

/**
 * Helper: Format time ago string
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
