import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/neynar-db-sdk/db';
import { userStreaks } from '@/db/schema';
import { isNotNull, lte, and } from 'drizzle-orm';
import { privateConfig } from '@/config/private-config';
import { publicConfig } from '@/config/public-config';

// App UUID from WEBHOOK_URL — used for mini-app notifications
// Format: https://api.neynar.com/f/app/{UUID}/event
const APP_UUID = publicConfig.webhookUrl
  ? publicConfig.webhookUrl.match(/app\/([^/]+)\/event/)?.[1] ?? ''
  : '';

// Notification messages
const MESSAGES = {
  morning: {
    title: '☀️ Morning Check-in',
    body: "Don't lose your streak! Claim your TYSM reward before midnight UTC 🔥",
  },
  evening: {
    title: '🌙 Evening Reminder',
    body: "⏰ Only a few hours left! Check in now to keep your streak alive 💎",
  },
};

export async function POST(req: NextRequest) {
  // Verify secret via header
  const secret = req.headers.get('x-notify-secret');
  if (secret !== privateConfig.notifySecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const type = body.type === 'evening' ? 'evening' : 'morning';
  const message = MESSAGES[type];

  try {
    // Only notify real Farcaster users (fid < 10_000_000 = not pseudo-fid from wallet)
    // Pseudo-fids are derived from wallet addresses and cannot receive Farcaster notifications
    const users = await db
      .select({ fid: userStreaks.fid })
      .from(userStreaks)
      .where(and(
        isNotNull(userStreaks.lastCheckIn),
        lte(userStreaks.fid, 10_000_000), // real Farcaster FIDs only
      ));

    if (users.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No Farcaster users to notify' });
    }

    const fids = users.map((u) => u.fid);
    console.log(`[notify] Sending ${type} notification to ${fids.length} users, app_uuid=${APP_UUID}`);

    // Correct Neynar endpoint for mini-app notifications
    // https://docs.neynar.com/reference/publish-frame-notifications
    const BATCH_SIZE = 100;
    let totalSent = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    for (let i = 0; i < fids.length; i += BATCH_SIZE) {
      const batch = fids.slice(i, i + BATCH_SIZE);

      try {
        const response = await fetch('https://api.neynar.com/v2/farcaster/notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': privateConfig.neynarApiKey,
          },
          body: JSON.stringify({
            target_fids: batch,
            notification: {
              title: message.title,
              body: message.body,
              target_url: publicConfig.homeUrl,
            },
          }),
        });

        const responseText = await response.text();

        if (response.ok) {
          totalSent += batch.length;
          console.log(`[notify] Batch ${Math.floor(i / BATCH_SIZE) + 1}: sent ${batch.length}`);
        } else {
          totalFailed += batch.length;
          const errMsg = `Batch ${Math.floor(i / BATCH_SIZE) + 1} failed (${response.status}): ${responseText}`;
          console.error('[notify]', errMsg);
          errors.push(errMsg);
        }
      } catch (err) {
        totalFailed += batch.length;
        const errMsg = `Batch ${Math.floor(i / BATCH_SIZE) + 1} error: ${err}`;
        console.error('[notify]', errMsg);
        errors.push(errMsg);
      }
    }

    return NextResponse.json({
      success: totalSent > 0 || totalFailed === 0,
      type,
      totalUsers: fids.length,
      sent: totalSent,
      failed: totalFailed,
      errors: errors.length > 0 ? errors : undefined,
      message: message.body,
    });

  } catch (err) {
    console.error('Notify route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint — status check (header auth only, no query param secret)
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-notify-secret');
  if (secret !== privateConfig.notifySecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await db
    .select({ fid: userStreaks.fid })
    .from(userStreaks)
    .where(and(
      isNotNull(userStreaks.lastCheckIn),
      lte(userStreaks.fid, 10_000_000),
    ));

  return NextResponse.json({
    status: 'ok',
    totalUsersToNotify: users.length,
    appUuid: APP_UUID,
    messages: MESSAGES,
  });
}
