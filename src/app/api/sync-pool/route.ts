import { NextRequest, NextResponse } from 'next/server';
import { getPoolBalanceFromContract, getTotalClaimed, getTotalClaimers } from '@/db/actions/claim-actions';

const NOTIFY_SECRET = process.env.NOTIFY_SECRET || 'tysm-notify-secret';

/**
 * GET /api/sync-pool?secret=xxx
 * Returns real-time pool stats directly from contract
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== NOTIFY_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [contractBalance, totalClaimed, totalClaimers] = await Promise.all([
    getPoolBalanceFromContract(),
    getTotalClaimed(),
    getTotalClaimers(),
  ]);

  return NextResponse.json({
    success: true,
    contractBalance,
    totalClaimed,
    remainingPool: contractBalance - totalClaimed,
    totalClaimers,
    source: 'contract',
    timestamp: new Date().toISOString(),
  });
}
