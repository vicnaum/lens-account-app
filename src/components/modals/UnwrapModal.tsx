"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits, encodeFunctionData, type Address } from "viem";
import { BaseTxModal } from "./BaseTxModal";
import { useLensAccount } from "@/contexts/LensAccountContext";
import { LENS_ACCOUNT_ABI, LENS_CHAIN_ID, WGHO_TOKEN_ADDRESS, WGHO_ABI, lensChain } from "@/lib/constants";

interface UnwrapModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance?: bigint; // Optional: WGHO balance for validation
}

export function UnwrapModal({ isOpen, onClose, balance }: UnwrapModalProps) {
  const [amount, setAmount] = useState("");
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
      setAmount("");
      setInputError(null);
      reset();
    }
  }, [isOpen, reset]);

  const handleUnwrap = () => {
    setInputError(null);

    // Input validation
    if (!amount || parseFloat(amount) <= 0) {
      setInputError("Please enter a valid amount");
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
      const amountBigInt = parseUnits(amount, lensChain.nativeCurrency.decimals);

      // Optional balance validation
      if (balance !== undefined && amountBigInt > balance) {
        setInputError("Insufficient WGHO balance");
        return;
      }

      const txData = encodeFunctionData({
        abi: WGHO_ABI,
        functionName: "withdraw",
        args: [amountBigInt],
      });

      console.log("Preparing unwrap via executeTransaction:", {
        target: WGHO_TOKEN_ADDRESS,
        value: "0",
        amount: amountBigInt.toString(),
        data: txData,
      });

      writeContract({
        address: lensAccountAddress,
        abi: LENS_ACCOUNT_ABI,
        functionName: "executeTransaction",
        args: [WGHO_TOKEN_ADDRESS as Address, 0n, txData],
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
      {/* Amount Input */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1.5">
          Amount (WGHO)
        </label>
        <input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          min="0"
          step="any"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition duration-150 disabled:bg-gray-100"
        />
        {balance !== undefined && (
          <p className="text-xs text-gray-500 mt-1">Available: {formatUnits(balance, lensChain.nativeCurrency.decimals)} WGHO</p>
        )}
      </div>

      {/* Information Box */}
      <div className="text-sm text-gray-700 bg-slate-50 p-4 rounded-lg border border-slate-200">
        Unwrapping converts your WGHO (Wrapped {lensChain.nativeCurrency.symbol}) back into native {lensChain.nativeCurrency.symbol}. This is useful
        when you need to use the native token for gas fees or other native transactions.
      </div>

      {/* Error Display */}
      {inputError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{inputError}</p>}
    </>
  );

  // The action button
  const modalActions = (
    <button
      onClick={handleUnwrap}
      disabled={isLoading || isConfirmed || !amount}
      className="w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? "Unwrapping..." : isConfirmed ? "Unwrapped!" : "Unwrap WGHO"}
    </button>
  );

  return (
    <BaseTxModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Unwrap WGHO to ${lensChain.nativeCurrency.symbol}`}
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
