'use server';

import { db } from '@/neynar-db-sdk/db';
import { kv, claims } from '@/db/schema';
import { desc, sql } from 'drizzle-orm';

const POOL_KEY = 'total_pool';
const DEFAULT_POOL = 991611;

// TYSM Check-in contract on Base Network
const CHECKIN_CONTRACT = '0xfEfcF3c2Aa08c6FF0BA3BD40ffEAD1F860A93d91';
const BASE_RPC = 'https://base-rpc.publicnode.com';

/**
 * Fetch real pool balance directly from contract (getPoolBalance function)
 * Function selector: 0x96365d44
 */
export async function getPoolBalanceFromContract(): Promise<number> {
  try {
    const response = await fetch(BASE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: CHECKIN_CONTRACT, data: '0x96365d44' }, 'latest'],
        id: 1,
      }),
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    const data = await response.json();
    if (data.result && data.result !== '0x') {
      const raw = BigInt(data.result);
      // TYSM has 18 decimals
      const balance = Number(raw / BigInt(10 ** 18));
      return balance;
    }
  } catch (err) {
    console.error('Failed to fetch pool balance from contract:', err);
  }
  return DEFAULT_POOL;
}

/**
 * Get total pool amount - reads directly from contract
 */
export async function getTotalPool(): Promise<number> {
  return getPoolBalanceFromContract();
}

/**
 * Top up pool by adding amount
 */
export async function topUpPool(addAmount: number): Promise<number> {
  const current = await getTotalPool();
  const newTotal = current + addAmount;
  await db
    .insert(kv)
    .values({ key: POOL_KEY, value: String(newTotal) })
    .onConflictDoUpdate({ target: kv.key, set: { value: String(newTotal) } });
  return newTotal;
}

/**
 * Set pool total directly
 */
export async function setPoolTotal(amount: number): Promise<number> {
  await db
    .insert(kv)
    .values({ key: POOL_KEY, value: String(amount) })
    .onConflictDoUpdate({ target: kv.key, set: { value: String(amount) } });
  return amount;
}

/**
 * Save a new claim record
 */
export async function saveClaim(
  fid: number,
  username: string,
  amount: number,
  txHash: string,
  pfpUrl?: string
) {
  await db.insert(claims).values({
    fid,
    username,
    pfpUrl,
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
 * Get pool statistics - pool balance read directly from contract
 */
export async function getPoolStats() {
  const [contractPool, totalClaimed, totalClaimers] = await Promise.all([
    getPoolBalanceFromContract(),
    getTotalClaimed(),
    getTotalClaimers(),
  ]);

  return {
    totalPool: contractPool,
    remainingPool: contractPool, // contract already reflects remaining (pays out on checkin)
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
