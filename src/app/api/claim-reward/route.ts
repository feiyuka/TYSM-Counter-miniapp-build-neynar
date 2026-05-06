import { NextRequest, NextResponse } from 'next/server';
import { performCheckIn } from '@/db/actions/streak-actions';
import { saveClaim } from '@/db/actions/claim-actions';
import { privateConfig } from '@/config/private-config';
import { checkRateLimit } from '@/lib/rate-limit';

// TYSM Token contract (ERC-20) on Base Network
const TYSM_CONTRACT = '0x0358795322C04DE04EAD2338A803A9D3518a9877';

/**
 * Fetch Neynar user score for a FID.
 * Returns null on error (fail open — don't block legit users due to API downtime).
 * Pseudo-FIDs (Base App wallet users > 10M) are exempt.
 */
async function fetchNeynarScore(fid: number): Promise<number | null> {
  if (fid > 10_000_000) return null; // Base App wallet user — exempt
  try {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}&viewer_fid=${fid}`,
      { headers: { 'x-api-key': privateConfig.neynarApiKey } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const user = data?.users?.[0];
    return user?.experimental?.neynar_user_score ?? null;
  } catch {
    return null;
  }
}

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

    // Rate limit: keyed by wallet address (consistent for both Farcaster + Base App users)
    // Max 20 requests per hour — generous for retries, blocks spam bots
    const rateResult = checkRateLimit(`wallet:${walletAddress.toLowerCase()}`, { limit: 20, windowMs: 60 * 60 * 1000 });
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429 }
      );
    }

    // Score guard: only applies to real Farcaster users (fid <= 10_000_000)
    // Base App wallet-only users (pseudo-fid > 10_000_000) are fully exempt
    const isBaseAppUser = fid > 10_000_000;
    if (!isBaseAppUser) {
      const neynarScore = await fetchNeynarScore(fid);
      if (neynarScore !== null && neynarScore < 0.5) {
        console.warn(`[claim-reward] Score guard blocked fid=${fid} score=${neynarScore}`);
        return NextResponse.json(
          { error: `Score too low (${(neynarScore * 100).toFixed(0)}/100). Minimum score of 50 required to claim TYSM.` },
          { status: 403 }
        );
      }
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

    // Save claim record — also deduplicates: same txHash = double-claim attempt
    const saveResult = await saveClaim(fid, username || 'user', totalReward, contractTxHash, pfpUrl);
    if (saveResult.duplicate) {
      console.warn(`[claim-reward] Double-claim blocked fid=${fid} txHash=${contractTxHash}`);
      return NextResponse.json(
        { error: 'This transaction has already been claimed.' },
        { status: 409 }
      );
    }

    // Skip token send if reward is 0
    if (totalReward <= 0) {
      return NextResponse.json({
        success: true, reward: 0, dailyReward: 0, weekBonus: 0, milestoneBonus: 0,
        txHash: contractTxHash, streak: checkInResult.streak, wasReset: checkInResult.wasReset, tokenSendFailed: false,
      });
    }

    // Determine send recipient:
    // Strategy 1 — Farcaster user: send by FID (direct, most reliable)
    // Strategy 2 — Base App user with no Farcaster: try FID lookup from wallet, fall back to address-based send
    let recipientFid: number | null = isBaseAppUser ? null : fid;
    let recipientAddress: string | null = null;

    if (isBaseAppUser) {
      console.log(`[claim-reward] Base App user — looking up FID for wallet: ${walletAddress}`);
      recipientFid = await getFidFromAddress(walletAddress);
      if (recipientFid) {
        console.log(`[claim-reward] Found Farcaster FID ${recipientFid} for Base App wallet ${walletAddress}`);
      } else {
        // No Farcaster account — send directly to wallet address
        recipientAddress = walletAddress;
        console.log(`[claim-reward] No Farcaster FID — will send to address: ${walletAddress}`);
      }
    }

    // Build recipient object: FID takes priority, fall back to address
    const recipient = recipientFid
      ? { fid: recipientFid, amount: totalReward }
      : recipientAddress
        ? { address: recipientAddress, amount: totalReward }
        : null;

    if (recipient) {
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
          recipients: [recipient],
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

    // No valid recipient (no FID, no address) — streak saved but token send skipped
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
      tokenSendError: 'Could not determine recipient — please try again.',
    });

  } catch (err) {
    console.error('[claim-reward] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
