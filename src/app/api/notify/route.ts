import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/neynar-db-sdk/db';
import { userStreaks } from '@/db/schema';
import { isNotNull } from 'drizzle-orm';
import { privateConfig } from '@/config/private-config';

// Notification messages - 2 variants for morning and evening
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
  // Verify secret to prevent unauthorized calls
  const secret = req.headers.get('x-notify-secret');
  if (secret !== privateConfig.notifySecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const type = body.type === 'evening' ? 'evening' : 'morning';
  const message = MESSAGES[type];

  try {
    // Get all users who have checked in at least once
    const users = await db
      .select({ fid: userStreaks.fid })
      .from(userStreaks)
      .where(isNotNull(userStreaks.lastCheckIn));

    if (users.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No users to notify' });
    }

    const fids = users.map((u) => u.fid);

    // Send notification via Neynar API in batches of 100
    const BATCH_SIZE = 100;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < fids.length; i += BATCH_SIZE) {
      const batch = fids.slice(i, i + BATCH_SIZE);

      try {
        const response = await fetch('https://api.neynar.com/v2/farcaster/frame/notifications', {
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
            },
          }),
        });

        if (response.ok) {
          totalSent += batch.length;
        } else {
          totalFailed += batch.length;
          console.error('Notification batch failed:', await response.text());
        }
      } catch (err) {
        totalFailed += batch.length;
        console.error('Notification batch error:', err);
      }
    }

    return NextResponse.json({
      success: true,
      type,
      totalUsers: fids.length,
      sent: totalSent,
      failed: totalFailed,
      message: message.body,
    });

  } catch (err) {
    console.error('Notify route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint for quick status check
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== privateConfig.notifySecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await db
    .select({ fid: userStreaks.fid })
    .from(userStreaks)
    .where(isNotNull(userStreaks.lastCheckIn));

  return NextResponse.json({
    status: 'ok',
    totalUsersToNotify: users.length,
    messages: MESSAGES,
  });
}
