import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/neynar-db-sdk/db';
import { userStreaks } from '@/db/schema';
import { isNotNull, lte, and, gte } from 'drizzle-orm';
import { privateConfig } from '@/config/private-config';
import { publicConfig } from '@/config/public-config';

/**
 * Cron: Streak Reminder Notification
 *
 * Runs every hour. Finds users whose last check-in was between 40–47 hours ago
 * (inside the streak window but approaching the 48h reset deadline).
 * Sends a push notification to remind them to check in before they lose their streak.
 *
 * Secured by CRON_SECRET header (set by platform) or NOTIFY_SECRET for manual trigger.
 */
export const dynamic = 'force-dynamic';

const STREAK_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours
const WARN_AFTER_MS   = 40 * 60 * 60 * 1000;  // warn after 40h (8h before reset)

export async function GET(req: NextRequest) {
  // Accept either CRON_SECRET (platform cron) or NOTIFY_SECRET (manual trigger)
  const authHeader = req.headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET ?? '';
  const notifySecret = privateConfig.notifySecret;

  const isValidCron    = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isValidManual  = authHeader === `Bearer ${notifySecret}`;
  const isVercelCron   = req.headers.get('x-vercel-cron') === '1'; // Vercel always sends this

  if (!isValidCron && !isValidManual && !isVercelCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const warnCutoff  = new Date(now - WARN_AFTER_MS);    // 40h ago
  const resetCutoff = new Date(now - STREAK_WINDOW_MS); // 48h ago

  try {
    // Find users who last checked in 40–47h ago (approaching streak reset)
    const usersAtRisk = await db
      .select({ fid: userStreaks.fid, username: userStreaks.username, lastCheckIn: userStreaks.lastCheckIn, streakDay: userStreaks.streakDay, streakWeek: userStreaks.streakWeek })
      .from(userStreaks)
      .where(and(
        isNotNull(userStreaks.lastCheckIn),
        lte(userStreaks.fid, 10_000_000),      // real Farcaster FIDs only
        lte(userStreaks.lastCheckIn, warnCutoff),   // checked in > 40h ago
        gte(userStreaks.lastCheckIn, resetCutoff),  // but not yet expired (< 48h)
      ));

    if (usersAtRisk.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No users at risk right now' });
    }

    const fids = usersAtRisk.map(u => u.fid);
    console.log(`[cron/streak-reminder] ${fids.length} users at risk of streak reset`);

    const BATCH_SIZE = 100;
    let totalSent = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    for (let i = 0; i < fids.length; i += BATCH_SIZE) {
      const batch = fids.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch('https://api.neynar.com/v2/farcaster/frame/notifications/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': privateConfig.neynarApiKey,
          },
          body: JSON.stringify({
            target_fids: batch,
            notification: {
              title: '⚠️ Streak Expiring Soon!',
              body: "Check in now before your streak resets in less than 8 hours! Don't lose your TYSM multiplier 🔥",
              target_url: publicConfig.homeUrl,
            },
          }),
        });

        if (res.ok) {
          totalSent += batch.length;
        } else {
          const text = await res.text();
          totalFailed += batch.length;
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed (${res.status}): ${text}`);
          console.error(`[cron/streak-reminder] batch failed:`, text);
        }
      } catch (err) {
        totalFailed += batch.length;
        errors.push(`Batch error: ${err}`);
      }
    }

    return NextResponse.json({
      success: true,
      usersAtRisk: fids.length,
      sent: totalSent,
      failed: totalFailed,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err) {
    console.error('[cron/streak-reminder] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
