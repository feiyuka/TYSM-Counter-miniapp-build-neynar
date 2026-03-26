import { NextRequest, NextResponse } from 'next/server';
import { privateConfig } from '@/config/private-config';
import { publicConfig } from '@/config/public-config';

const TYSM_CONTRACT = '0x0358795322C04DE04EAD2338A803A9D3518a9877';
const BASE_RPC = 'https://base-rpc.publicnode.com';

/** Read ERC-20 balance of an address from chain */
async function getTokenBalance(walletAddress: string, tokenContract: string): Promise<string> {
  try {
    // balanceOf(address) = 0x70a08231
    const data = '0x70a08231' + walletAddress.slice(2).toLowerCase().padStart(64, '0');
    const res = await fetch(BASE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'eth_call',
        params: [{ to: tokenContract, data }, 'latest'],
        id: 1,
      }),
    });
    const json = await res.json();
    if (json.result && json.result !== '0x') {
      const raw = BigInt(json.result);
      const whole = raw / BigInt(10 ** 18);
      const frac = raw % BigInt(10 ** 18);
      return `${whole}.${frac.toString().padStart(18, '0').slice(0, 4)}`;
    }
    return '0';
  } catch (e) {
    return `error: ${e}`;
  }
}

/** Read ETH balance of an address from chain */
async function getEthBalance(walletAddress: string): Promise<string> {
  try {
    const res = await fetch(BASE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'eth_getBalance',
        params: [walletAddress, 'latest'],
        id: 2,
      }),
    });
    const json = await res.json();
    if (json.result) {
      const raw = BigInt(json.result);
      const whole = raw / BigInt(10 ** 18);
      const frac = raw % BigInt(10 ** 18);
      return `${whole}.${frac.toString().padStart(18, '0').slice(0, 6)} ETH`;
    }
    return '0 ETH';
  } catch (e) {
    return `error: ${e}`;
  }
}

export async function GET(req: NextRequest) {
  // Simple secret check via query param
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  if (secret !== privateConfig.notifySecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const walletId = privateConfig.neynarWalletId;
  const apiKey = privateConfig.neynarApiKey;

  // 1. Get wallet address from Neynar
  let walletAddress = '';
  let walletInfo: Record<string, unknown> = {};
  try {
    const res = await fetch(`https://api.neynar.com/v2/farcaster/wallet/${walletId}`, {
      headers: { 'x-api-key': apiKey },
    });
    walletInfo = await res.json().catch(() => ({}));
    walletAddress = (walletInfo as { address?: string }).address ?? '';
  } catch (e) {
    walletInfo = { error: String(e) };
  }

  // 2. Get onchain balances
  const [tysmBalance, ethBalance] = walletAddress
    ? await Promise.all([
        getTokenBalance(walletAddress, TYSM_CONTRACT),
        getEthBalance(walletAddress),
      ])
    : ['(no address)', '(no address)'];

  // 3. Test a dry-run send to self (1 TYSM) to validate API format
  let testSendResult: Record<string, unknown> = {};
  const testFid = publicConfig.fid; // send to app owner's FID
  if (testFid && searchParams.get('test') === 'true') {
    try {
      const sendRes = await fetch('https://api.neynar.com/v2/farcaster/fungible/send/', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'x-wallet-id': walletId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          network: 'base',
          fungible_contract_address: TYSM_CONTRACT,
          recipients: [{ fid: testFid, amount: 1 * (10 ** 18) }], // 1 TYSM in wei
        }),
      });
      const sendData = await sendRes.json().catch(() => ({}));
      testSendResult = { status: sendRes.status, ok: sendRes.ok, data: sendData };
    } catch (e) {
      testSendResult = { error: String(e) };
    }
  }

  return NextResponse.json({
    wallet: {
      id: walletId ? `${walletId.slice(0, 8)}...` : 'NOT SET',
      address: walletAddress || 'NOT FOUND',
      info: walletInfo,
    },
    balances: {
      TYSM: tysmBalance,
      ETH: ethBalance,
    },
    config: {
      apiKeySet: !!apiKey && apiKey.length > 10,
      walletIdSet: !!walletId && walletId.length > 10,
      tysmContract: TYSM_CONTRACT,
      appFid: testFid,
    },
    testSend: searchParams.get('test') === 'true' ? testSendResult : 'Add ?test=true to run a 1 TYSM test send',
  });
}
