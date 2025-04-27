"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits, encodeFunctionData, type Address, type Hash } from "viem";
import { BaseTxModal } from "./BaseTxModal";
import { useLensAccount } from "@/contexts/LensAccountContext";
import { LENS_ACCOUNT_ABI, LENS_CHAIN_ID, WGHO_TOKEN_ADDRESS, WGHO_ABI, lensChain } from "@/lib/constants";

interface WrapModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance?: bigint; // Optional: native GHO balance for validation
}

export function WrapModal({ isOpen, onClose, balance }: WrapModalProps) {
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

  const handleWrap = () => {
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
        setInputError("Insufficient GHO balance");
        return;
      }

      // WGHO deposit() is called with value, no args needed
      const txData = encodeFunctionData({
        abi: WGHO_ABI,
        functionName: "deposit",
      });

      console.log("Preparing wrap via executeTransaction:", {
        target: WGHO_TOKEN_ADDRESS,
        value: amountBigInt.toString(),
        data: txData,
      });

      writeContract({
        address: lensAccountAddress,
        abi: LENS_ACCOUNT_ABI,
        functionName: "executeTransaction",
        args: [WGHO_TOKEN_ADDRESS as Address, amountBigInt, txData],
        account: ownerAddress,
        chainId: LENS_CHAIN_ID,
      });
    } catch (e) {
      console.error("Transaction preparation failed:", e);
      setInputError("Failed to prepare transaction");
    }
  };

  return (
    <BaseTxModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Wrap ${lensChain.nativeCurrency.symbol} to WGHO`}
      isLoading={isLoading}
      isSuccess={isConfirmed}
      error={txError}
      txHash={hash}
      disableClose={isLoading}
    >
      <div className="space-y-4">
        {/* Amount Input */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount ({lensChain.nativeCurrency.symbol})
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
          />
          {balance !== undefined && (
            <p className="text-xs text-gray-500 mt-1">
              Available: {formatUnits(balance, lensChain.nativeCurrency.decimals)} {lensChain.nativeCurrency.symbol}
            </p>
          )}
        </div>

        {/* Information Box */}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
          Wrapping converts your native {lensChain.nativeCurrency.symbol} into WGHO (Wrapped {lensChain.nativeCurrency.symbol}), an ERC20 token that
          can be used in DeFi applications. You can unwrap back to native {lensChain.nativeCurrency.symbol} at any time.
        </div>

        {/* Error Display */}
        {inputError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{inputError}</p>}

        {/* Wrap Button */}
        <button
          onClick={handleWrap}
          disabled={isLoading || isConfirmed || !amount}
          className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Wrapping..." : isConfirmed ? "Wrapped!" : `Wrap ${lensChain.nativeCurrency.symbol}`}
        </button>
      </div>
    </BaseTxModal>
  );
}
