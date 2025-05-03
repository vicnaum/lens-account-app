"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { isAddress, parseUnits, encodeFunctionData, type Address, maxUint256 } from "viem";
import { BaseTxModal } from "./BaseTxModal";
import { useLensAccount } from "@/contexts/LensAccountContext";
import { LENS_ACCOUNT_ABI, LENS_CHAIN_ID, ERC20_ABI } from "@/lib/constants";

interface ApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenSymbol: string;
  tokenAddress: Address;
  decimals: number;
}

export function ApproveModal({ isOpen, onClose, tokenSymbol, tokenAddress, decimals }: ApproveModalProps) {
  const [spender, setSpender] = useState("");
  const [amount, setAmount] = useState("");
  const [isInfinite, setIsInfinite] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const { lensAccountAddress } = useLensAccount();
  const { address: ownerAddress, chainId } = useAccount();
  const { data: hash, error: writeError, isPending: isWritePending, writeContract, reset } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
    chainId: LENS_CHAIN_ID,
  });

  const isLoading = isWritePending || isConfirming;
  const txError = writeError || receiptError;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSpender("");
      setAmount("");
      setIsInfinite(false);
      setInputError(null);
      reset();
    }
  }, [isOpen, reset]);

  const handleApprove = () => {
    setInputError(null);

    // Input validation
    if (!isAddress(spender)) {
      setInputError("Invalid spender address");
      return;
    }
    if (!isInfinite && (!amount || parseFloat(amount) <= 0)) {
      setInputError("Please enter a valid amount or use infinite approval");
      return;
    }
    if (!lensAccountAddress || !ownerAddress) {
      setInputError("Wallet not connected");
      return;
    }
    if (chainId !== LENS_CHAIN_ID) {
      setInputError(`Please switch to Lens Chain (ID: ${LENS_CHAIN_ID})`);
      return;
    }

    try {
      const amountBigInt = isInfinite ? maxUint256 : parseUnits(amount, decimals);

      const txData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spender as Address, amountBigInt],
      });

      console.log("Preparing approval via executeTransaction:", {
        token: tokenAddress,
        spender,
        amount: isInfinite ? "MAX_UINT256" : amount,
        txData,
      });

      writeContract({
        address: lensAccountAddress,
        abi: LENS_ACCOUNT_ABI,
        functionName: "executeTransaction",
        args: [tokenAddress, 0n, txData],
        account: ownerAddress,
        chainId: LENS_CHAIN_ID,
      });
    } catch (e) {
      console.error("Transaction preparation failed:", e);
      setInputError("Failed to prepare transaction");
    }
  };

  // Form content without the button
  const modalContent = (
    <>
      {/* Spender Input */}
      <div>
        <label htmlFor="spender" className="block text-sm font-medium text-gray-700 mb-1.5">
          Spender Address
        </label>
        <input
          id="spender"
          type="text"
          value={spender}
          onChange={(e) => setSpender(e.target.value.trim())}
          placeholder="0x..."
          disabled={isLoading}
          className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition duration-150 disabled:bg-gray-100"
        />
        <p className="mt-1 text-xs text-gray-500">The address that will be allowed to spend your {tokenSymbol}</p>
      </div>

      {/* Amount Input */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1.5">
          Amount ({tokenSymbol})
        </label>
        <input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          min="0"
          step="any"
          disabled={isLoading || isInfinite}
          className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition duration-150 disabled:bg-gray-100"
        />

        {/* Infinite Approval Toggle */}
        <div className="mt-3 flex items-center">
          <input
            id="infinite"
            type="checkbox"
            checked={isInfinite}
            onChange={(e) => {
              setIsInfinite(e.target.checked);
              if (e.target.checked) setAmount("");
            }}
            disabled={isLoading}
            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
          />
          <label htmlFor="infinite" className="ml-2 text-sm text-gray-700">
            Infinite Approval
          </label>
          <span className="ml-1 text-xs text-gray-500">(Maximum possible amount)</span>
        </div>
      </div>

      {/* Warning for Infinite Approval */}
      {isInfinite && (
        <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
          ⚠️ Infinite approval grants unlimited spending permission to the spender address. Only use this with trusted contracts and platforms.
        </div>
      )}

      {/* Error Display */}
      {inputError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{inputError}</p>}
    </>
  );

  // The action button
  const modalActions = (
    <button
      onClick={handleApprove}
      disabled={isLoading || isConfirmed || !spender || (!isInfinite && !amount)}
      className="w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? "Approving..." : isConfirmed ? "Approved!" : `Approve ${tokenSymbol}`}
    </button>
  );

  return (
    <BaseTxModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Approve ${tokenSymbol} Spending`}
      isLoading={isLoading}
      isSuccess={isConfirmed}
      error={txError}
      txHash={hash}
      disableClose={isLoading}
      content={modalContent}
      actions={modalActions}
    />
  );
}
