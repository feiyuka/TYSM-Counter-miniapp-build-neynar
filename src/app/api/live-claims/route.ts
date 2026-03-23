import { NextResponse } from 'next/server';
import { getRecentClaims, getPoolStats } from '@/db/actions/claim-actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [claims, stats] = await Promise.all([
      getRecentClaims(20),
      getPoolStats(),
    ]);

    return NextResponse.json({ claims, stats });
  } catch (err) {
    console.error('[live-claims] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
