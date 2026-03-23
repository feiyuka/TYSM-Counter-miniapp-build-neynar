import { NextRequest, NextResponse } from 'next/server';
import { performCheckIn } from '@/db/actions/streak-actions';
import { saveClaim } from '@/db/actions/claim-actions';
import { privateConfig } from '@/config/private-config';

// TYSM Token contract (ERC-20) on Base Network
const TYSM_CONTRACT = '0x0358795322C04DE04EAD2338A803A9D3518a9877';

/**
 * Look up a Farcaster FID from a wallet address via Neynar API.
 * Returns null if not found or if address has no Farcaster account.
 */
async function getFidFromAddress(address: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
      { headers: { 'x-api-key': privateConfig.neynarApiKey } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Response: { [address]: User[] }
    const users = data[address.toLowerCase()] ?? data[address] ?? [];
    if (users.length > 0) return users[0].fid as number;
    return null;
  } catch {
    return null;
  }
}

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
        { error: checkInResult.error || 'Already checked in today' },
        { status: 400 }
      );
    }

    const totalReward = checkInResult.reward ?? 0;

    console.log(
      `[claim-reward] fid=${fid} username=${username} wallet=${walletAddress} ` +
      `day=${checkInResult.streak?.streakDay} week=${checkInResult.streak?.streakWeek} ` +
      `daily=${checkInResult.dailyReward} weekBonus=${checkInResult.weekBonus} ` +
      `milestone=${checkInResult.milestoneBonus} TOTAL=${totalReward}`
    );

    // Save claim record immediately (so live feed updates regardless of token send)
    await saveClaim(fid, username || 'user', totalReward, contractTxHash, pfpUrl);

    // Determine the real Farcaster FID to send tokens to.
    // - Real Farcaster users (fid <= 10_000_000): use their fid directly
    // - Base App wallet users (pseudo-fid > 10_000_000): look up real FID from wallet address
    let recipientFid: number | null = fid <= 10_000_000 ? fid : null;
    if (recipientFid === null) {
      console.log(`[claim-reward] Pseudo-fid detected, looking up FID from wallet: ${walletAddress}`);
      recipientFid = await getFidFromAddress(walletAddress);
      if (recipientFid) {
        console.log(`[claim-reward] Found real FID ${recipientFid} for wallet ${walletAddress}`);
      } else {
        console.log(`[claim-reward] No Farcaster FID found for wallet ${walletAddress} — skipping token send`);
      }
    }

    // If we have a valid FID, send TYSM via Neynar server wallet
    // Neynar API: POST /v2/farcaster/fungible/send/
    // Body: { network, fungible_contract_address, recipients: [{ fid: number, amount: number }] }
    if (recipientFid) {
      const sendResponse = await fetch('https://api.neynar.com/v2/farcaster/fungible/send/', {
        method: 'POST',
        headers: {
          'x-api-key': privateConfig.neynarApiKey,
          'x-wallet-id': privateConfig.neynarWalletId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          network: 'base',
          fungible_contract_address: TYSM_CONTRACT,
          recipients: [
            {
              fid: recipientFid,
              amount: totalReward,          // number, plain token units (not wei)
            },
          ],
        }),
      });

      const sendData = await sendResponse.json().catch(() => ({}));

      console.log(
        `[claim-reward] Neynar send → status=${sendResponse.status} recipientFid=${recipientFid}:`,
        JSON.stringify(sendData).slice(0, 300)
      );

      if (!sendResponse.ok) {
        console.error('[claim-reward] Token send FAILED:', sendData);
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
          tokenSendError: sendData?.message || `Neynar API error (${sendResponse.status})`,
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
    }

    // No FID found — streak saved, but token send skipped
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
      tokenSendError: 'No Farcaster account linked to this wallet — connect Farcaster to receive tokens',
    });

  } catch (err) {
    console.error('[claim-reward] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
