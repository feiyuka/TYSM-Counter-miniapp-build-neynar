'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, H6, P, Button } from '@neynar/ui';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { TYSM_CHECKIN_ADDRESS, TYSM_CHECKIN_ABI, TYSM_TOKEN_ADDRESS } from '@/contracts/tysm-checkin-abi';

// ERC20 ABI for token balance check
const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

export function AdminTab() {
  const { address: walletAddress } = useAccount();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawTo, setWithdrawTo] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Read contract owner
  const { data: ownerAddress } = useReadContract({
    address: TYSM_CHECKIN_ADDRESS,
    abi: TYSM_CHECKIN_ABI,
    functionName: 'owner',
  });

  // Read pool balance (TYSM tokens in contract)
  const { data: poolBalanceRaw, refetch: refetchPoolBalance } = useReadContract({
    address: TYSM_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [TYSM_CHECKIN_ADDRESS],
  });

  // Write contract for withdraw
  const { writeContract, data: txHash, isPending } = useWriteContract();

  // Wait for transaction
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Format pool balance
  const poolBalance = poolBalanceRaw ? Number(formatUnits(poolBalanceRaw, 18)) : 0;

  // Check if current wallet is owner
  const isOwner = walletAddress && ownerAddress &&
    walletAddress.toLowerCase() === ownerAddress.toLowerCase();

  // Handle withdraw
  const handleWithdraw = useCallback(() => {
    if (!withdrawAmount || !withdrawTo) return;

    try {
      const amountInWei = parseUnits(withdrawAmount, 18);
      writeContract({
        address: TYSM_CHECKIN_ADDRESS,
        abi: TYSM_CHECKIN_ABI,
        functionName: 'withdrawFunds',
        args: [withdrawTo as `0x${string}`, amountInWei],
      });
      setIsWithdrawing(true);
    } catch (error) {
      console.error('Withdraw error:', error);
    }
  }, [withdrawAmount, withdrawTo, writeContract]);

  // Handle withdraw all
  const handleWithdrawAll = useCallback(() => {
    if (!walletAddress || !poolBalanceRaw) return;

    setWithdrawTo(walletAddress);
    setWithdrawAmount(formatUnits(poolBalanceRaw, 18));
  }, [walletAddress, poolBalanceRaw]);

  // Reset after successful tx
  useEffect(() => {
    if (isTxSuccess && isWithdrawing) {
      setWithdrawAmount('');
      setWithdrawTo('');
      setIsWithdrawing(false);
      refetchPoolBalance();
    }
  }, [isTxSuccess, isWithdrawing, refetchPoolBalance]);

  return (
    <div className="space-y-4">
      {/* Contract Info */}
      <Card className="border border-purple-400/70 rounded-xl">
        <CardContent className="p-4">
          <H6>🔐 Contract Info</H6>

          <div className="mt-3 space-y-3">
            <div className="p-3 rounded-lg bg-black/20 border border-gray-600">
              <P className="text-xs opacity-60">Contract Address</P>
              <P className="text-sm font-mono break-all">{TYSM_CHECKIN_ADDRESS}</P>
            </div>

            <div className="p-3 rounded-lg bg-black/20 border border-gray-600">
              <P className="text-xs opacity-60">Owner Address</P>
              <P className="text-sm font-mono break-all">{ownerAddress || 'Loading...'}</P>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/20 border border-amber-400/60">
              <P className="text-xs opacity-60">Pool Balance</P>
              <P className="text-2xl font-bold text-amber-400">{poolBalance.toLocaleString()} TYSM</P>
            </div>

            <div className="p-3 rounded-lg bg-black/20 border border-gray-600">
              <P className="text-xs opacity-60">Your Wallet</P>
              <P className="text-sm font-mono break-all">{walletAddress || 'Not connected'}</P>
              {walletAddress && (
                <P className={`text-xs mt-1 ${isOwner ? 'text-green-400' : 'text-red-400'}`}>
                  {isOwner ? '✅ You are the owner' : '❌ You are NOT the owner'}
                </P>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdraw Section */}
      <Card className="border border-blue-400/70 rounded-xl">
        <CardContent className="p-4">
          <H6>💸 Withdraw Funds</H6>

          {!walletAddress ? (
            <div className="mt-3 p-4 rounded-lg bg-yellow-500/20 border border-yellow-400/60 text-center">
              <P className="text-yellow-400">⚠️ Connect your wallet first</P>
            </div>
          ) : !isOwner ? (
            <div className="mt-3 p-4 rounded-lg bg-red-500/20 border border-red-400/60 text-center">
              <P className="text-red-400">🚫 Only owner can withdraw</P>
              <P className="text-xs opacity-60 mt-2">Owner: {ownerAddress}</P>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {/* Quick action */}
              <Button
                onClick={handleWithdrawAll}
                className="w-full bg-amber-500/30 border-amber-400/60"
              >
                📥 Withdraw All to My Wallet
              </Button>

              <div className="text-center">
                <P className="text-xs opacity-50">— or custom withdraw —</P>
              </div>

              {/* To address */}
              <div>
                <P className="text-xs opacity-60 mb-1">To Address</P>
                <input
                  type="text"
                  value={withdrawTo}
                  onChange={(e) => setWithdrawTo(e.target.value)}
                  placeholder="0x..."
                  className="w-full p-3 rounded-lg bg-black/30 border border-gray-600 text-white text-sm font-mono"
                />
              </div>

              {/* Amount */}
              <div>
                <P className="text-xs opacity-60 mb-1">Amount (TYSM)</P>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="1000"
                  className="w-full p-3 rounded-lg bg-black/30 border border-gray-600 text-white text-sm"
                />
              </div>

              {/* Withdraw button */}
              <Button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || !withdrawTo || isPending || isTxLoading}
                className="w-full"
              >
                {isPending || isTxLoading ? '⏳ Processing...' : '💸 Withdraw'}
              </Button>

              {/* Transaction status */}
              {txHash && (
                <div className={`p-3 rounded-lg ${isTxSuccess ? 'bg-green-500/20 border-green-400/60' : 'bg-blue-500/20 border-blue-400/60'} border`}>
                  <P className="text-xs">
                    {isTxSuccess ? '✅ Withdrawal successful!' : '⏳ Transaction pending...'}
                  </P>
                  <a
                    href={`https://basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 underline break-all"
                  >
                    {txHash}
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help */}
      <Card className="border border-gray-600 rounded-xl">
        <CardContent className="p-4">
          <H6>ℹ️ Help</H6>
          <div className="mt-3 space-y-2 text-sm opacity-70">
            <P>• Only the contract owner can withdraw funds</P>
            <P>• Pool balance = TYSM tokens available for rewards</P>
            <P>• Withdrawing reduces the reward pool</P>
            <P>• Make sure to leave enough for user rewards!</P>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
