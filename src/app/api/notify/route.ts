import { NextRequest, NextResponse } from 'next/server';
import { privateConfig } from '@/config/private-config';
import { publicConfig } from '@/config/public-config';

/**
 * POST /api/notify
 *
 * Sends push notifications to ALL subscribers of this app.
 * Uses target_fids: [] which broadcasts to everyone who has enabled
 * notifications for TYSM Counter — Neynar handles the subscriber list.
 *
 * Two message types:
 *   morning → "Check-in Ready" (20h cooldown expired)
 *   evening → "Streak at Risk" (streak about to expire)
 */

const MESSAGES = {
  morning: {
    title: '🔥 TYSM Check-in Ready!',
    body: 'Your 20h cooldown is up! Claim TYSM and keep your streak alive 🚀',
  },
  evening: {
    title: '⚠️ Streak Expiring Soon!',
    body: "Check in now before your streak resets! Don't lose your multiplier 🔥",
  },
};

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-notify-secret');
  if (secret !== privateConfig.notifySecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const type = body.type === 'evening' ? 'evening' : 'morning';
  const message = MESSAGES[type];

  console.log(`[notify] Broadcasting ${type} notification to all subscribers`);

  try {
    // target_fids: [] = broadcast to ALL subscribers who enabled notifications
    // Neynar manages the subscriber list — no need to query our DB for FIDs
    const response = await fetch('https://api.neynar.com/v2/farcaster/frame/notifications/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': privateConfig.neynarApiKey,
      },
      body: JSON.stringify({
        target_fids: [],
        notification: {
          title: message.title,
          body: message.body,
          target_url: publicConfig.homeUrl,
        },
      }),
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[notify] Broadcast failed:', response.status, responseData);
      return NextResponse.json({
        success: false,
        type,
        error: responseData?.message || `Neynar API error (${response.status})`,
        details: responseData,
      }, { status: 500 });
    }

    console.log('[notify] Broadcast success:', responseData);

    return NextResponse.json({
      success: true,
      type,
      message: message.body,
      neynarResponse: responseData,
    });

  } catch (err) {
    console.error('[notify] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET — status check
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-notify-secret');
  if (secret !== privateConfig.notifySecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    status: 'ok',
    messages: MESSAGES,
    note: 'Broadcasts to all subscribers via target_fids: []',
  });
}
