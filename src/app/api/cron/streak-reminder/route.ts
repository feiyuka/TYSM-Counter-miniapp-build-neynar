import { NextRequest, NextResponse } from 'next/server';
import { privateConfig } from '@/config/private-config';
import { publicConfig } from '@/config/public-config';

/**
 * Cron: Streak Reminder Notification
 *
 * Runs every hour (0 * * * *).
 * Broadcasts "streak at risk" push notification to ALL subscribers.
 * Neynar handles delivery only to users who have enabled notifications.
 *
 * Auth: CRON_SECRET (Vercel), x-vercel-cron header, or NOTIFY_SECRET (manual).
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader   = req.headers.get('authorization') ?? '';
  const cronSecret   = process.env.CRON_SECRET ?? '';
  const notifySecret = privateConfig.notifySecret;

  const isValidCron   = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isValidManual = authHeader === `Bearer ${notifySecret}`;
  const isVercelCron  = req.headers.get('x-vercel-cron') === '1';

  if (!isValidCron && !isValidManual && !isVercelCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[cron/streak-reminder] Broadcasting streak reminder notification');

  try {
    const res = await fetch('https://api.neynar.com/v2/farcaster/frame/notifications/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': privateConfig.neynarApiKey,
      },
      body: JSON.stringify({
        target_fids: [], // broadcast to all subscribers
        notification: {
          title: '⚠️ Streak Expiring Soon!',
          body: "Check in now before your streak resets! Don't lose your multiplier 🔥",
          target_url: publicConfig.homeUrl,
        },
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[cron/streak-reminder] Failed:', res.status, data);
      return NextResponse.json({ success: false, error: data?.message || `HTTP ${res.status}` }, { status: 500 });
    }

    console.log('[cron/streak-reminder] Broadcast success:', data);
    return NextResponse.json({ success: true, neynarResponse: data });

  } catch (err) {
    console.error('[cron/streak-reminder] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
