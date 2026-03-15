import { NextRequest, NextResponse } from 'next/server';
import { parseUnits } from 'viem';

const NOTIFY_SECRET = process.env.NOTIFY_SECRET || 'tysm-notify-secret';
const TYSM_CONTRACT = '0xfEfcF3c2Aa08c6FF0BA3BD40ffEAD1F860A93d91';
const CREATOR_FID = Number(process.env.NEXT_PUBLIC_USER_FID);

export async function POST(req: NextRequest) {
  // Verify secret
  const secret = req.headers.get('x-notify-secret');
  if (secret !== NOTIFY_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { toAddress, amount } = body;

  if (!toAddress || !amount) {
    return NextResponse.json({ error: 'Missing toAddress or amount' }, { status: 400 });
  }

  const amountNum = Number(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  // Max withdraw limit safety check: 10M TYSM per transaction
  if (amountNum > 10_000_000) {
    return NextResponse.json({ error: 'Amount exceeds max withdraw limit' }, { status: 400 });
  }

  try {
    // Send TYSM from server wallet to admin address via Neynar API
    const response = await fetch('https://api.neynar.com/v2/farcaster/fungible/send', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.NEYNAR_API_KEY!,
        'x-wallet-id': process.env.NEYNAR_WALLET_ID!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipients: [
          {
            address: toAddress,
            amount: parseUnits(String(amountNum), 18).toString(),
          },
        ],
        token_address: TYSM_CONTRACT,
        network: 'base',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Withdraw failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      txHash: data.transaction_hash,
      amount: amountNum,
      to: toAddress,
    });

  } catch (err) {
    console.error('Withdraw error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
