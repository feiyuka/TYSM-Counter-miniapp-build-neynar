import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUserStreak, canCheckInToday } from '@/db/actions/streak-actions';
import { privateConfig } from '@/config/private-config';

export const dynamic = 'force-dynamic';

/** Fetch Neynar user score (0–1). Returns null on error or if not a real Farcaster FID. */
async function fetchNeynarScore(fid: number): Promise<number | null> {
  // Pseudo-FIDs (Base App wallet users) have no Neynar score
  if (fid > 10_000_000) return null;
  try {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}&viewer_fid=${fid}`,
      { headers: { 'x-api-key': privateConfig.neynarApiKey }, next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const user = data?.users?.[0];
    // Neynar returns experimental.neynar_user_score (0–1 float)
    return user?.experimental?.neynar_user_score ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get('fid');
    const username = searchParams.get('username') || 'user';

    if (!fid || isNaN(parseInt(fid))) {
      return NextResponse.json({ error: 'Missing fid' }, { status: 400 });
    }

    const fidNum = parseInt(fid);
    const [streak, canCheck, neynarScore] = await Promise.all([
      getOrCreateUserStreak(fidNum, username),
      canCheckInToday(fidNum),
      fetchNeynarScore(fidNum),
    ]);

    // Score guard: real Farcaster users must have score >= 0.5 to check in
    // If score fetch fails (null), we allow check-in (fail open for network errors)
    const scoreQualified = neynarScore === null ? true : neynarScore >= 0.5;

    return NextResponse.json({
      streak,
      canCheckIn: canCheck,
      neynarScore,
      scoreQualified,
    });
  } catch (err) {
    console.error('[user-streak] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
