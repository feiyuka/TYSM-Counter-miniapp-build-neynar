import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUserStreak, canCheckInToday } from '@/db/actions/streak-actions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get('fid');
    const username = searchParams.get('username') || 'user';

    if (!fid || isNaN(parseInt(fid))) {
      return NextResponse.json({ error: 'Missing fid' }, { status: 400 });
    }

    const fidNum = parseInt(fid);
    const [streak, canCheck] = await Promise.all([
      getOrCreateUserStreak(fidNum, username),
      canCheckInToday(fidNum),
    ]);

    return NextResponse.json({ streak, canCheckIn: canCheck });
  } catch (err) {
    console.error('[user-streak] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
