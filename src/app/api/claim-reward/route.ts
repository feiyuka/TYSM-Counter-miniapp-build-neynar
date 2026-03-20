import { NextRequest, NextResponse } from 'next/server';
import { performCheckIn } from '@/db/actions/streak-actions';
import { saveClaim } from '@/db/actions/claim-actions';
import { privateConfig } from '@/config/private-config';

// TYSM Token contract (ERC-20) on Base Network
const TYSM_CONTRACT = '0x0358795322C04DE04EAD2338A803A9D3518a9877';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fid, username, pfpUrl, walletAddress, txHash: contractTxHash } = body;

    // Validate inputs
    if (!fid || !walletAddress || !contractTxHash) {
      return NextResponse.json({ error: 'Missing: fid, walletAddress, txHash' }, { status: 400 });
    }
    if (typeof fid !== 'number' || fid <= 0 || fid > 4294967295) {
      return NextResponse.json({ error: 'Invalid fid' }, { status: 400 });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // Perform check-in: handles streak logic, reward calc, DB update
    const checkInResult = await performCheckIn(fid, username || 'user', pfpUrl);

    if (!checkInResult.success) {
      return NextResponse.json(
        { error: checkInResult.error || 'Check-in failed' },
        { status: 400 }
      );
    }

    const totalReward = checkInResult.reward ?? 0;

    console.log(
      `[claim-reward] fid=${fid} username=${username} ` +
      `day=${checkInResult.streak?.streakDay} week=${checkInResult.streak?.streakWeek} ` +
      `daily=${checkInResult.dailyReward} weekBonus=${checkInResult.weekBonus} ` +
      `milestone=${checkInResult.milestoneBonus} total=${totalReward}`
    );

    // Always save claim record first (before trying to send tokens)
    // This ensures live claims feed shows up even if token send is delayed
    await saveClaim(fid, username || 'user', totalReward, contractTxHash, pfpUrl);

    // Send TYSM from server wallet to user wallet via Neynar API
    // Amount format: plain decimal string (e.g. "100" for 100 TYSM)
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
            amount: String(totalReward),
          },
        ],
        token_address: TYSM_CONTRACT,
        network: 'base',
      }),
    });

    const sendData = await sendResponse.json().catch(() => ({}));

    console.log(
      `[claim-reward] Neynar send status=${sendResponse.status}:`,
      JSON.stringify(sendData).slice(0, 200)
    );

    if (!sendResponse.ok) {
      console.error('[claim-reward] Token send failed:', sendData);
      // Streak + claim record already saved — inform user reward is pending
      return NextResponse.json({
        success: true,
        reward: totalReward,
        dailyReward: checkInResult.dailyReward,
        weekBonus: checkInResult.weekBonus,
        milestoneBonus: checkInResult.milestoneBonus,
        txHash: contractTxHash,
        streak: checkInResult.streak,
        wasReset: checkInResult.wasReset,
        tokenSendFailed: true,
        tokenSendError: sendData?.message || `Send failed (${sendResponse.status})`,
      });
    }

    const rewardTxHash =
      sendData.transaction_hash ??
      sendData.data?.transaction_hash ??
      contractTxHash;

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
      tokenSendFailed: false,
    });

  } catch (err) {
    console.error('[claim-reward] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
