import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/neynar-db-sdk/db';
import { userStreaks } from '@/db/schema';
import { isNotNull, lte, and, gte } from 'drizzle-orm';
import { privateConfig } from '@/config/private-config';
import { publicConfig } from '@/config/public-config';

/**
 * Cron: Check-in Ready Notification
 *
 * Runs every hour. Finds users whose 20h cooldown just expired (20–21h ago).
 * Sends a push notification telling them their daily TYSM is ready to claim.
 *
 * Secured by CRON_SECRET header (set by platform) or NOTIFY_SECRET for manual trigger.
 */
export const dynamic = 'force-dynamic';

const COOLDOWN_MS = 20 * 60 * 60 * 1000; // 20 hours
const CHECK_WINDOW = 60 * 60 * 1000;     // 1h window to catch them

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET ?? '';
  const notifySecret = privateConfig.notifySecret;

  const isValidCron   = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isValidManual = authHeader === `Bearer ${notifySecret}`;

  if (!isValidCron && !isValidManual) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const cooldownCutoff = new Date(now - COOLDOWN_MS);             // 20h ago
  const windowCutoff   = new Date(now - COOLDOWN_MS - CHECK_WINDOW); // 21h ago

  try {
    // Users whose cooldown JUST expired in the last hour (20–21h ago)
    const readyUsers = await db
      .select({ fid: userStreaks.fid })
      .from(userStreaks)
      .where(and(
        isNotNull(userStreaks.lastCheckIn),
        lte(userStreaks.fid, 10_000_000),
        lte(userStreaks.lastCheckIn, cooldownCutoff),  // cooldown expired
        gte(userStreaks.lastCheckIn, windowCutoff),    // within 1h window
      ));

    if (readyUsers.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No users ready right now' });
    }

    const fids = readyUsers.map(u => u.fid);
    console.log(`[cron/checkin-reminder] ${fids.length} users ready to check in`);

    const BATCH_SIZE = 100;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < fids.length; i += BATCH_SIZE) {
      const batch = fids.slice(i, i + BATCH_SIZE);
      const res = await fetch('https://api.neynar.com/v2/farcaster/frame/notifications/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': privateConfig.neynarApiKey,
        },
        body: JSON.stringify({
          target_fids: batch,
          notification: {
            title: '🔥 TYSM Ready to Claim!',
            body: 'Your 20h cooldown is up! Check in now to earn TYSM and keep your streak alive 🚀',
            target_url: publicConfig.homeUrl,
          },
        }),
      }).catch(() => null);

      if (res?.ok) {
        totalSent += batch.length;
      } else {
        totalFailed += batch.length;
      }
    }

    return NextResponse.json({ success: true, ready: fids.length, sent: totalSent, failed: totalFailed });

  } catch (err) {
    console.error('[cron/checkin-reminder] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
