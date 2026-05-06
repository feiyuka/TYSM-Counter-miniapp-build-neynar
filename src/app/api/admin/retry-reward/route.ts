import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/neynar-db-sdk/db';
import { claims, userStreaks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { privateConfig } from '@/config/private-config';

const TYSM_CONTRACT = '0x0358795322C04DE04EAD2338A803A9D3518a9877';
const CREATOR_FID = Number(process.env.NEXT_PUBLIC_USER_FID ?? 0);

/**
 * POST /api/admin/retry-reward
 *
 * Retries sending TYSM for a claim that had tokenSendFailed.
 * Admin-only endpoint — requires x-fid header matching creator FID.
 *
 * Body: { claimId: string } or { fid: number, amount: number }
 */
export async function POST(req: NextRequest) {
  const fidHeader = req.headers.get('x-fid');
  const fid = Number(fidHeader ?? 0);
  if (!fid || fid !== CREATOR_FID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { claimId, recipientFid, amount } = body;

  // Must provide either claimId (lookup from DB) or recipientFid + amount directly
  if (!claimId && (!recipientFid || !amount)) {
    return NextResponse.json(
      { error: 'Provide claimId or both recipientFid and amount' },
      { status: 400 }
    );
  }

  let targetFid: number = recipientFid;
  let targetAmount: number = amount;

  // If claimId provided, look up claim from DB
  if (claimId) {
    const claimRows = await db
      .select()
      .from(claims)
      .where(eq(claims.id, claimId))
      .limit(1);

    if (!claimRows.length) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const claim = claimRows[0];
    targetFid = claim.fid;
    targetAmount = claim.amount;
  }

  // Safety: max 10M TYSM per retry
  if (targetAmount > 10_000_000) {
    return NextResponse.json({ error: 'Amount exceeds safety limit' }, { status: 400 });
  }

  if (!targetFid || targetFid <= 0 || targetAmount <= 0) {
    return NextResponse.json({ error: 'Invalid fid or amount' }, { status: 400 });
  }

  console.log(`[admin/retry-reward] Retrying: fid=${targetFid} amount=${targetAmount} by admin=${fid}`);

  try {
    const sendRes = await fetch('https://api.neynar.com/v2/farcaster/fungible/send/', {
      method: 'POST',
      headers: {
        'x-api-key': privateConfig.neynarApiKey,
        'x-wallet-id': privateConfig.neynarWalletId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        network: 'base',
        fungible_contract_address: TYSM_CONTRACT,
        recipients: [{ fid: targetFid, amount: targetAmount }],
      }),
    });

    const sendData = await sendRes.json().catch(() => ({}));

    if (!sendRes.ok) {
      console.error('[admin/retry-reward] Send failed:', sendData);
      return NextResponse.json({
        success: false,
        error: sendData?.message || `Neynar API error (${sendRes.status})`,
        details: sendData,
      }, { status: 500 });
    }

    const txHash =
      sendData.transactions?.[0]?.transaction_hash ??
      sendData.transaction_hash ?? null;

    console.log(`[admin/retry-reward] Success: fid=${targetFid} amount=${targetAmount} tx=${txHash}`);

    // Update balance in DB if we have the FID
    const currentStreak = await db
      .select({ tysmBalance: userStreaks.tysmBalance })
      .from(userStreaks)
      .where(eq(userStreaks.fid, targetFid))
      .limit(1);

    if (currentStreak.length > 0) {
      await db
        .update(userStreaks)
        .set({ tysmBalance: currentStreak[0].tysmBalance + targetAmount })
        .where(eq(userStreaks.fid, targetFid));
    }

    return NextResponse.json({
      success: true,
      fid: targetFid,
      amount: targetAmount,
      txHash,
      sendData,
    });

  } catch (err) {
    console.error('[admin/retry-reward] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
