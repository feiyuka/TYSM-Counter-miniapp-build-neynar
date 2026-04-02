import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/neynar-db-sdk/db';
import { userStreaks, claims } from '@/db/schema';
import { desc, sql, eq } from 'drizzle-orm';
import { getPoolBalanceFromContract, getTotalClaimed, getTotalClaimers } from '@/db/actions/claim-actions';

const CREATOR_FID = Number(process.env.NEXT_PUBLIC_USER_FID ?? 0);

export async function GET(req: NextRequest) {
  const fidHeader = req.headers.get('x-fid');
  const fid = Number(fidHeader ?? 0);

  if (!fid || fid !== CREATOR_FID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [
      poolBalance,
      totalClaimed,
      totalClaimers,
      totalUsers,
      recentClaims,
      topUsers,
    ] = await Promise.all([
      getPoolBalanceFromContract(),
      getTotalClaimed(),
      getTotalClaimers(),
      db.select({ count: sql<number>`COUNT(*)` }).from(userStreaks).then(r => Number(r[0]?.count ?? 0)),
      db.select().from(claims).orderBy(desc(claims.createdAt)).limit(20),
      db.select().from(userStreaks).orderBy(desc(userStreaks.tysmBalance)).limit(20),
    ]);

    // Active users in last 48h
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const activeUsersResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(userStreaks)
      .where(sql`${userStreaks.lastCheckIn} >= ${cutoff}`);
    const activeUsers48h = Number(activeUsersResult[0]?.count ?? 0);

    // Total claims count
    const totalClaimsCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(claims)
      .then(r => Number(r[0]?.count ?? 0));

    return NextResponse.json({
      stats: {
        poolBalance,
        totalClaimed,
        totalClaimers,
        totalUsers,
        activeUsers48h,
        totalClaimsCount,
      },
      recentClaims,
      topUsers,
    });
  } catch (err) {
    console.error('[admin/stats] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
