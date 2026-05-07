import { NextRequest, NextResponse } from 'next/server';
import { privateConfig } from '@/config/private-config';
import { publicConfig } from '@/config/public-config';

/**
 * Cron: Gas Alert
 *
 * Runs every hour. Checks the pool wallet's ETH balance on Base.
 * If ETH drops below threshold, sends a Farcaster push notification
 * to the app owner (FID from NEXT_PUBLIC_USER_FID) as an alert.
 *
 * Thresholds:
 *   CRITICAL  < 0.005 ETH  → immediate action needed
 *   WARNING   < 0.02  ETH  → top up soon
 */
export const dynamic = 'force-dynamic';

const BASE_RPC = 'https://base-rpc.publicnode.com';
const POOL_WALLET = '0x947234ebadb9480bf51cc8530793bd488a7ff7e9';
const CRITICAL_ETH = 0.005;
const WARNING_ETH  = 0.02;

async function getEthBalance(address: string): Promise<number> {
  const res = await fetch(BASE_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'eth_getBalance',
      params: [address, 'latest'], id: 1,
    }),
  });
  const json = await res.json();
  if (!json.result) return 0;
  return Number(BigInt(json.result)) / 1e18;
}

async function sendOwnerNotif(title: string, body: string): Promise<boolean> {
  const ownerFid = publicConfig.fid;
  if (!ownerFid) return false;

  const res = await fetch('https://api.neynar.com/v2/farcaster/frame/notifications/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': privateConfig.neynarApiKey,
    },
    body: JSON.stringify({
      target_fids: [ownerFid],
      notification: { title, body, target_url: publicConfig.homeUrl },
    }),
  });
  return res.ok;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const cronSecret   = process.env.CRON_SECRET ?? '';
  const notifySecret = privateConfig.notifySecret;

  const isValidCron    = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isValidManual  = authHeader === `Bearer ${notifySecret}`;
  const isVercelCron   = req.headers.get('x-vercel-cron') === '1'; // Vercel always sends this

  if (!isValidCron && !isValidManual && !isVercelCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ethBalance = await getEthBalance(POOL_WALLET);
    const balanceStr = ethBalance.toFixed(6);

    console.log(`[cron/gas-alert] Pool wallet ETH: ${balanceStr}`);

    let level: 'ok' | 'warning' | 'critical' = 'ok';
    let notifSent = false;

    if (ethBalance < CRITICAL_ETH) {
      level = 'critical';
      notifSent = await sendOwnerNotif(
        '🚨 TYSM Pool: CRITICAL LOW GAS',
        `Pool wallet only has ${balanceStr} ETH! Claims will fail. Top up 0x947234...7e9 immediately.`
      );
      console.error(`[cron/gas-alert] CRITICAL: ETH=${balanceStr}`);
    } else if (ethBalance < WARNING_ETH) {
      level = 'warning';
      notifSent = await sendOwnerNotif(
        '⚠️ TYSM Pool: Low Gas Warning',
        `Pool wallet has ${balanceStr} ETH. Consider topping up 0x947234...7e9 soon.`
      );
      console.warn(`[cron/gas-alert] WARNING: ETH=${balanceStr}`);
    }

    return NextResponse.json({
      success: true,
      level,
      ethBalance: balanceStr,
      thresholds: { critical: CRITICAL_ETH, warning: WARNING_ETH },
      notifSent,
    });

  } catch (err) {
    console.error('[cron/gas-alert] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
