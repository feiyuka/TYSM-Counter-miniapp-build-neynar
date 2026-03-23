import { NextResponse } from 'next/server';
import { getTopClaimers, getUserRank, getLeaderboardStats } from '@/db/actions/leaderboard-actions';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get('fid');

    const [top10, userRank, stats] = await Promise.all([
      getTopClaimers(10),
      fid ? getUserRank(parseInt(fid)) : Promise.resolve(null),
      getLeaderboardStats(),
    ]);

    return NextResponse.json({ top10, userRank, stats });
  } catch (err) {
    console.error('[leaderboard] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
