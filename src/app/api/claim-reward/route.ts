import { NextRequest, NextResponse } from 'next/server';
import { parseUnits } from 'viem';
import { performCheckIn } from '@/db/actions/streak-actions';
import { saveClaim } from '@/db/actions/claim-actions';
import { privateConfig } from '@/config/private-config';

// TYSM Token contract (ERC-20) on Base Network
const TYSM_CONTRACT = '0x0358795322C04DE04EAD2338A803A9D3518a9877';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fid, username, pfpUrl, walletAddress, txHash: contractTxHash } = body;

    // Validate required fields
    if (!fid || !walletAddress || !contractTxHash) {
      return NextResponse.json(
        { error: 'Missing required fields: fid, walletAddress, txHash' },
        { status: 400 }
      );
    }

    if (typeof fid !== 'number' || fid <= 0) {
      return NextResponse.json({ error: 'Invalid fid' }, { status: 400 });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // performCheckIn handles ALL logic:
    // - Creates user if new
    // - Checks if already checked in today
    // - Resets streak if missed day
    // - Calculates x100 reward (Day × Week × 100 + week bonus + milestone)
    // - Updates DB with new streak/balance
    const checkInResult = await performCheckIn(fid, username || 'user', pfpUrl);

    if (!checkInResult.success) {
      return NextResponse.json(
        { error: checkInResult.error || 'Check-in failed' },
        { status: 400 }
      );
    }

    const totalReward = checkInResult.reward ?? 0;

    console.log(
      `[claim-reward] fid=${fid} ` +
      `day=${checkInResult.streak?.streakDay} week=${checkInResult.streak?.streakWeek} ` +
      `daily=${checkInResult.dailyReward} weekBonus=${checkInResult.weekBonus} ` +
      `milestone=${checkInResult.milestoneBonus} total=${totalReward}`
    );

    // Send TYSM from server wallet to user wallet via Neynar API
    const sendResponse = await fetch('https://api.neynar.com/v2/farcaster/fungible/send', {
      method: 'POST',
      headers: {
        'x-api-key': privateConfig.neynarApiKey,
        'x-wallet-id': privateConfig.neynarWalletId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipients: [
          {
            address: walletAddress,
            amount: parseUnits(String(totalReward), 18).toString(),
          },
        ],
        token_address: TYSM_CONTRACT,
        network: 'base',
      }),
    });

    const sendData = await sendResponse.json();
    console.log(
      `[claim-reward] Neynar response status=${sendResponse.status}:`,
      JSON.stringify(sendData)
    );

    if (!sendResponse.ok) {
      console.error('Server wallet send failed:', sendData);
      // DB already updated — still return success so user knows their streak is recorded
      // but flag that token send failed
      return NextResponse.json(
        {
          success: true,
          reward: totalReward,
          dailyReward: checkInResult.dailyReward,
          weekBonus: checkInResult.weekBonus,
          milestoneBonus: checkInResult.milestoneBonus,
          txHash: contractTxHash,
          contractTxHash,
          streak: checkInResult.streak,
          wasReset: checkInResult.wasReset,
          tokenSendFailed: true,
          tokenSendError: sendData.message || 'Failed to send TYSM reward',
        }
      );
    }

    // transaction_hash may be at top level or nested
    const rewardTxHash =
      sendData.transaction_hash ??
      sendData.data?.transaction_hash ??
      contractTxHash;

    // Save claim record with reward tx hash
    await saveClaim(fid, username || 'user', totalReward, rewardTxHash, pfpUrl);

    return NextResponse.json({
      success: true,
      reward: totalReward,
      dailyReward: checkInResult.dailyReward,
      weekBonus: checkInResult.weekBonus,
      milestoneBonus: checkInResult.milestoneBonus,
      txHash: rewardTxHash,
      contractTxHash,
      streak: checkInResult.streak,
      wasReset: checkInResult.wasReset,
    });

  } catch (err) {
    console.error('Claim reward error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
