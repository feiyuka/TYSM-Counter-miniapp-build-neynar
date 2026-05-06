import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUserStreak, canCheckInToday } from '@/db/actions/streak-actions';
import { privateConfig } from '@/config/private-config';

export const dynamic = 'force-dynamic';

const COOLDOWN_MS = 72_000 * 1000; // 20 hours — must match contract

/** Fetch Neynar user score (0–1). Returns null on error or pseudo-FID. */
async function fetchNeynarScore(fid: number): Promise<number | null> {
  if (fid > 10_000_000) return null;
  try {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}&viewer_fid=${fid}`,
      { headers: { 'x-api-key': privateConfig.neynarApiKey }, next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const user = data?.users?.[0];
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
    const walletAddress = searchParams.get('walletAddress') ?? '';

    if (!fid || isNaN(parseInt(fid))) {
      return NextResponse.json({ error: 'Missing fid' }, { status: 400 });
    }

    const fidNum = parseInt(fid);
    // For Base App users (pseudo-fid > 10M), use a stable wallet-derived FID
    // so the same wallet always maps to the same streak record
    const isBaseAppUser = fidNum > 10_000_000;
    const stableFid = isBaseAppUser && walletAddress
      ? Math.abs(
          Array.from(walletAddress.toLowerCase()).reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0)
        ) % 4_000_000_000 + 10_000_001 // always > 10M, always stable for same address
      : fidNum;

    const displayUsername = isBaseAppUser && walletAddress
      ? (username !== 'user' ? username : `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`)
      : username;

    const [streak, canCheck, neynarScore] = await Promise.all([
      getOrCreateUserStreak(stableFid, displayUsername),
      canCheckInToday(stableFid),
      fetchNeynarScore(fidNum), // score check uses original fid (returns null for pseudo-fid)
    ]);

    // Calculate ms until next check-in is allowed (based on 20h cooldown)
    let msUntilNextCheckIn = 0;
    if (!canCheck && streak?.lastCheckIn) {
      const lastMs = new Date(streak.lastCheckIn).getTime();
      msUntilNextCheckIn = Math.max(0, lastMs + COOLDOWN_MS - Date.now());
    }

    const scoreQualified = neynarScore === null ? true : neynarScore >= 0.5;

    return NextResponse.json({
      streak,
      canCheckIn: canCheck,
      msUntilNextCheckIn,
      neynarScore,
      scoreQualified,
    });
  } catch (err) {
    console.error('[user-streak] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
