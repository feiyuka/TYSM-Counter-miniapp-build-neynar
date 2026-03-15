'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { topUpPool } from '@/db/actions/claim-actions';

// TYSM Token contract on Base Network (ERC-20)
const TYSM_CONTRACT = '0x0358795322C04DE04EAD2338A803A9D3518a9877' as const;

// Pool wallet = server wallet (NEYNAR_WALLET_ADDRESS)
const POOL_ADDRESS = '0x947234ebadb9480bf51cc8530793bd488a7ff7e9' as `0x${string}`;

// ERC-20 ABI (minimal)
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export function OnchainPoolForm() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'topup' | 'withdraw'>('topup');
  const [dbUpdated, setDbUpdated] = useState(false);
  const [message, setMessage] = useState('');

  // Read decimals
  const { data: decimals = 18 } = useReadContract({
    address: TYSM_CONTRACT,
    abi: ERC20_ABI,
    functionName: 'decimals',
  });

  // Read user wallet balance
  const { data: userBalance } = useReadContract({
    address: TYSM_CONTRACT,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read pool balance
  const { data: poolBalance } = useReadContract({
    address: TYSM_CONTRACT,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: POOL_ADDRESS ? [POOL_ADDRESS] : undefined,
    query: { enabled: !!POOL_ADDRESS },
  });

  const formatBalance = (val?: bigint) => {
    if (!val) return '0';
    return Number(formatUnits(val, decimals)).toLocaleString();
  };

  // Update DB after successful top up tx — inside useEffect to avoid setState during render
  useEffect(() => {
    if (isSuccess && txHash && !dbUpdated && mode === 'topup') {
      const amountNum = Number(amount);
      if (amountNum > 0) {
        setDbUpdated(true);
        topUpPool(amountNum).then(() => {
          setMessage(`✅ Top up ${amountNum.toLocaleString()} TYSM berhasil! Pool diperbarui.`);
          setAmount('');
        });
      }
    }
  }, [isSuccess, txHash, dbUpdated, mode, amount]);

  async function handleTransaction() {
    if (!address || !amount || !POOL_ADDRESS) return;
    setMessage('');
    setDbUpdated(false);

    try {
      const amountBig = parseUnits(amount, decimals);

      if (mode === 'topup') {
        writeContract({
          address: TYSM_CONTRACT,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [POOL_ADDRESS, amountBig],
        });
      } else {
        const res = await fetch('/api/admin/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-notify-secret': 'tysm-notify-secret' },
          body: JSON.stringify({ toAddress: address, amount: amount }),
        });
        const data = await res.json();
        if (data.success) {
          setMessage(`✅ Withdraw berhasil! TX: ${data.txHash?.slice(0, 10)}...`);
          setAmount('');
        } else {
          setMessage(`❌ Withdraw gagal: ${data.error}`);
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (!error.message?.includes('rejected')) {
        setMessage('❌ Transaksi gagal. Coba lagi.');
      }
    }
  }

  return (
    <div>
      {/* Pool & Wallet Balance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <BalanceCard
          label="Pool Balance (Onchain)"
          value={`${formatBalance(poolBalance as bigint)} TYSM`}
          color="#FFD700"
          emoji="🏦"
        />
        <BalanceCard
          label="Wallet Balance"
          value={isConnected ? `${formatBalance(userBalance as bigint)} TYSM` : 'Not connected'}
          color="#60a5fa"
          emoji="👛"
        />
      </div>

      {/* Connect wallet */}
      {!isConnected ? (
        <button
          onClick={() => connect({ connector: connectors[0] })}
          style={{
            width: '100%', background: '#FFD700', color: '#000', border: 'none',
            borderRadius: '10px', padding: '12px', fontWeight: 'bold',
            fontSize: '14px', cursor: 'pointer', marginBottom: '16px',
          }}
        >
          🔗 Connect Wallet
        </button>
      ) : (
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '16px' }}>
          Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
      )}

      {isConnected && (
        <>
          {/* Mode Toggle */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <ModeBtn active={mode === 'topup'} onClick={() => setMode('topup')} label="⬆️ Top Up Pool" />
            <ModeBtn active={mode === 'withdraw'} onClick={() => setMode('withdraw')} label="⬇️ Withdraw" />
          </div>

          {/* Amount Input */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '6px' }}>
              {mode === 'topup' ? 'Jumlah TYSM yang dikirim ke pool' : 'Jumlah TYSM yang ditarik dari pool'}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="contoh: 100000"
                style={{
                  flex: 1, background: '#0A0A0A', border: '1px solid #333',
                  borderRadius: '8px', padding: '10px 12px', color: '#fff',
                  fontSize: '14px', outline: 'none',
                }}
              />
              <button
                onClick={handleTransaction}
                disabled={isPending || isConfirming || !amount}
                style={{
                  background: mode === 'topup' ? '#FFD700' : '#a78bfa',
                  color: '#000', border: 'none', borderRadius: '8px',
                  padding: '10px 16px', fontWeight: 'bold', fontSize: '13px',
                  cursor: 'pointer', opacity: (isPending || isConfirming || !amount) ? 0.6 : 1,
                }}
              >
                {isPending ? 'Waiting...' : isConfirming ? 'Confirming...' : mode === 'topup' ? 'Top Up' : 'Withdraw'}
              </button>
            </div>

            {/* Preset Buttons */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              {[100000, 500000, 1000000].map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(String(p))}
                  style={{
                    background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px',
                    padding: '4px 10px', color: '#aaa', fontSize: '11px', cursor: 'pointer',
                  }}
                >
                  {(p / 1000).toFixed(0)}K
                </button>
              ))}
            </div>
          </div>

          {/* TX Hash */}
          {txHash && (
            <div style={{ marginBottom: '10px', fontSize: '11px', color: '#666' }}>
              TX:{' '}
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#60a5fa' }}
              >
                {txHash.slice(0, 10)}...{txHash.slice(-6)}
              </a>
            </div>
          )}

          {/* Error */}
          {writeError && !writeError.message?.includes('rejected') && (
            <div style={{ background: '#2a0f0f', border: '1px solid #f87171', borderRadius: '8px', padding: '10px', fontSize: '12px', color: '#f87171', marginBottom: '10px' }}>
              ❌ {writeError.message}
            </div>
          )}
        </>
      )}

      {/* Success/Error Message */}
      {message && (
        <div style={{
          background: message.startsWith('✅') ? '#0f2a1a' : '#2a0f0f',
          border: `1px solid ${message.startsWith('✅') ? '#4ade80' : '#f87171'}`,
          borderRadius: '8px', padding: '10px 12px', fontSize: '13px',
          color: message.startsWith('✅') ? '#4ade80' : '#f87171',
        }}>
          {message}
        </div>
      )}
    </div>
  );
}

function BalanceCard({ label, value, color, emoji }: { label: string; value: string; color: string; emoji: string }) {
  return (
    <div style={{ background: '#0A0A0A', border: '1px solid #222', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
      <div style={{ fontSize: '18px', marginBottom: '4px' }}>{emoji}</div>
      <div style={{ fontSize: '13px', fontWeight: 'bold', color }}>{value}</div>
      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

function ModeBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px',
        fontWeight: active ? 'bold' : 'normal', cursor: 'pointer',
        background: active ? '#222' : '#111',
        border: active ? '1px solid #FFD700' : '1px solid #333',
        color: active ? '#FFD700' : '#666',
      }}
    >
      {label}
    </button>
  );
}
