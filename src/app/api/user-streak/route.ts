import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUserStreak, canCheckInToday } from '@/db/actions/streak-actions';
import { privateConfig } from '@/config/private-config';

export const dynamic = 'force-dynamic';

const COOLDOWN_MS = 72_000 * 1000; // 20 hours — must match contract

/** Fetch Neynar user score (0–1). Returns null on error or for Base App pseudo-FIDs. */
async function fetchNeynarScore(fid: number): Promise<number | null> {
  if (fid > 10_000_000) return null; // Base App pseudo-FID — exempt from score check
  try {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}&viewer_fid=${fid}`,
      { headers: { 'x-api-key': privateConfig.neynarApiKey }, next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.users?.[0]?.experimental?.neynar_user_score ?? null;
  } catch {
    return null;
  }
}

/**
 * GET /api/user-streak
 *
 * Params:
 *   fid           — Farcaster FID (real) or pseudo-FID (Base App wallet-derived)
 *   username      — display name
 *   walletAddress — (optional) Base wallet address; used for display name fallback
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fidParam      = searchParams.get('fid');
    const username      = searchParams.get('username') || 'user';
    const walletAddress = searchParams.get('walletAddress') ?? '';

    if (!fidParam || isNaN(parseInt(fidParam))) {
      return NextResponse.json({ error: 'Missing or invalid fid' }, { status: 400 });
    }

    const fid           = parseInt(fidParam);
    const isBaseAppUser = fid > 10_000_000;

    // For Base App wallet users, use wallet short address as display name if no username provided
    const displayName = isBaseAppUser && walletAddress && username === 'user'
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : username;

    // Run streak fetch, cooldown check, and score check in parallel
    const [streak, canCheckIn, neynarScore] = await Promise.all([
      getOrCreateUserStreak(fid, displayName),
      canCheckInToday(fid),
      fetchNeynarScore(fid),
    ]);

    // Calculate ms remaining until next check-in (based on 20h cooldown)
    let msUntilNextCheckIn = 0;
    if (!canCheckIn && streak?.lastCheckIn) {
      const elapsed = Date.now() - new Date(streak.lastCheckIn).getTime();
      msUntilNextCheckIn = Math.max(0, COOLDOWN_MS - elapsed);
    }

    const scoreQualified = neynarScore === null || neynarScore >= 0.5;

    return NextResponse.json({
      streak,
      canCheckIn,
      msUntilNextCheckIn,
      neynarScore,
      scoreQualified,
    });

  } catch (err) {
    console.error('[user-streak] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
