import { NextRequest, NextResponse } from 'next/server';
import { parseUnits } from 'viem';
import { performCheckIn, getUserStreak } from '@/db/actions/streak-actions';
import { saveClaim } from '@/db/actions/claim-actions';

// TYSM Token contract (ERC-20) on Base Network
const TYSM_CONTRACT = '0x0358795322C04DE04EAD2338A803A9D3518a9877';

// Reward formula constants (x100 multiplier, applied server-side)
const MULTIPLIER = 100;
const MAX_WEEK = 52;

// Milestone bonuses
const MILESTONE_29 = 50000;
const MILESTONE_30 = 100000;

// Max reward per claim safety cap (Week 52, Day 7 + Week bonus + milestone)
// 7 * 52 * 100 + 7 * 52 * 100 + 100000 = 72,800 + 72,800 + 100,000 = 245,600
const MAX_REWARD_SAFETY_CAP = 300_000;

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

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // Get current streak BEFORE performing check-in (to calculate correct reward)
    const currentStreak = await getUserStreak(fid);

    // Determine streak values for reward calculation
    // If no streak or missed a day, it will reset to W1D1
    let streakDay = currentStreak?.streakDay ?? 1;
    let streakWeek = currentStreak?.streakWeek ?? 1;
    let totalDays = currentStreak?.totalStreakDays ?? 0;

    // Check if streak needs to reset (missed a day)
    if (currentStreak?.lastCheckIn) {
      const lastCheckIn = new Date(currentStreak.lastCheckIn);
      const now = new Date();
      const diffMs = now.getTime() - lastCheckIn.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        streakDay = 1;
        streakWeek = 1;
        totalDays = 0;
      }
    }

    // Calculate x100 reward
    const effectiveWeek = Math.min(streakWeek, MAX_WEEK);
    const dailyReward = streakDay * effectiveWeek * MULTIPLIER;
    const isLastDayOfWeek = streakDay === 7;
    const weekBonus = isLastDayOfWeek ? 7 * effectiveWeek * MULTIPLIER : 0;

    let milestoneBonus = 0;
    if (totalDays + 1 === 29) milestoneBonus = MILESTONE_29;
    if (totalDays + 1 === 30) milestoneBonus = MILESTONE_30;

    const totalReward = dailyReward + weekBonus + milestoneBonus;

    // Safety cap to prevent any accidental huge payouts
    if (totalReward > MAX_REWARD_SAFETY_CAP) {
      console.error(`Reward ${totalReward} exceeds safety cap for fid ${fid}`);
      return NextResponse.json({ error: 'Reward calculation error' }, { status: 500 });
    }

    // Send TYSM from server wallet to user's wallet via Neynar API
    const sendResponse = await fetch('https://api.neynar.com/v2/farcaster/fungible/send', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.NEYNAR_API_KEY!,
        'x-wallet-id': process.env.NEYNAR_WALLET_ID!,
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

    if (!sendResponse.ok) {
      console.error('Server wallet send failed:', sendData);
      return NextResponse.json(
        { error: sendData.message || 'Failed to send TYSM reward' },
        { status: 500 }
      );
    }

    const rewardTxHash = sendData.transaction_hash;

    // Record check-in in database
    const result = await performCheckIn(fid, username || 'user', pfpUrl);

    // Save claim record with the server wallet tx hash
    await saveClaim(fid, username || 'user', totalReward, rewardTxHash, pfpUrl);

    return NextResponse.json({
      success: true,
      reward: totalReward,
      dailyReward,
      weekBonus,
      milestoneBonus,
      txHash: rewardTxHash,
      contractTxHash,
      streak: result.streak,
      wasReset: result.wasReset,
    });

  } catch (err) {
    console.error('Claim reward error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
