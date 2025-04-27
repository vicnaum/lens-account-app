"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { isAddress, parseUnits, formatUnits, encodeFunctionData, type Address, type Hash } from "viem";
import { BaseTxModal } from "./BaseTxModal";
import { useLensAccount } from "@/contexts/LensAccountContext";
import { LENS_ACCOUNT_ABI, LENS_CHAIN_ID, ERC20_ABI } from "@/lib/constants";

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenSymbol: string;
  tokenAddress?: Address; // Undefined for native GHO
  decimals: number;
  balance?: bigint; // Optional: for validation against available balance
}

export function SendModal({ isOpen, onClose, tokenSymbol, tokenAddress, decimals, balance }: SendModalProps) {
  const [recipient, setRecipient] = useState("");
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

  // Reset form when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setRecipient("");
      setAmount("");
      setInputError(null);
      reset(); // Reset wagmi state
    }
  }, [isOpen, reset]);

  // Validate and prepare transaction
  const handleSend = () => {
    setInputError(null);

    // Basic input validation
    if (!isAddress(recipient)) {
      setInputError("Invalid recipient address");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setInputError("Invalid amount");
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
      const amountBigInt = parseUnits(amount, decimals);

      // Optional balance validation
      if (balance !== undefined && amountBigInt > balance) {
        setInputError("Insufficient balance");
        return;
      }

      let targetAddress: Address;
      let txValue: bigint;
      let txData: Hash;

      if (tokenAddress) {
        // ERC20 token transfer
        targetAddress = tokenAddress;
        txValue = 0n;
        txData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [recipient as Address, amountBigInt],
        });
      } else {
        // Native GHO transfer
        targetAddress = recipient as Address;
        txValue = amountBigInt;
        txData = "0x";
      }

      console.log("Sending via executeTransaction:", {
        target: targetAddress,
        value: txValue.toString(),
        data: txData,
        type: tokenAddress ? "ERC20" : "Native",
      });

      writeContract({
        address: lensAccountAddress,
        abi: LENS_ACCOUNT_ABI,
        functionName: "executeTransaction",
        args: [targetAddress, txValue, txData],
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
      title={`Send ${tokenSymbol}`}
      isLoading={isLoading}
      isSuccess={isConfirmed}
      error={txError}
      txHash={hash}
      disableClose={isLoading} // Prevent closing during transaction
    >
      <div className="space-y-4">
        {/* Recipient Input */}
        <div>
          <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">
            Recipient Address
          </label>
          <input
            id="recipient"
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.trim())}
            placeholder="0x..."
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
          />
        </div>

        {/* Amount Input */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
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
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
          />
          {balance !== undefined && (
            <p className="text-xs text-gray-500 mt-1">
              Available: {formatUnits(balance, decimals)} {tokenSymbol}
            </p>
          )}
        </div>

        {/* Error Display */}
        {inputError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{inputError}</p>}

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={isLoading || isConfirmed || !recipient || !amount}
          className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Sending..." : isConfirmed ? "Sent!" : `Send ${tokenSymbol}`}
        </button>
      </div>
    </BaseTxModal>
  );
}
