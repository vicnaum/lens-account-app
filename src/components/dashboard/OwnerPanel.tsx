"use client";

import { type Address, isAddress } from "viem";
import { useState } from "react";
import { ExclamationTriangleIcon, CheckCircleIcon, ArrowPathIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";
import { DocumentDuplicateIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useLensAccount } from "@/contexts/LensAccountContext";
import { LENS_ACCOUNT_ABI, LENS_CHAIN_ID } from "@/lib/constants";

interface OwnerPanelProps {
  ownerAddress: Address;
}

export function OwnerPanel({ ownerAddress }: OwnerPanelProps) {
  const [isChangingOwner, setIsChangingOwner] = useState(false);
  const [newOwner, setNewOwner] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Wagmi hooks
  const { address: connectedOwnerAddress, chainId } = useAccount();
  const { lensAccountAddress } = useLensAccount();
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ownerAddress);
      setCopied(true);
      console.log("Address copied to clipboard:", ownerAddress);
      // Reset icon after a short delay
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
      alert("Failed to copy address."); // Simple error feedback
    }
  };

  const handleOpenExplorer = () => {
    window.open(`https://explorer.lens.xyz/address/${ownerAddress}`, "_blank");
  };

  const handleToggleChangeOwner = () => {
    setIsChangingOwner(!isChangingOwner);
    setNewOwner("");
    setInputError(null);
    reset(); // Reset wagmi state on toggle
  };

  const handleNewOwnerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setNewOwner(value);
    if (value && !isAddress(value)) {
      setInputError("Invalid address format");
    } else {
      setInputError(null);
    }
  };

  const handleConfirmChangeOwner = () => {
    if (!isAddress(newOwner) || !lensAccountAddress || !connectedOwnerAddress) {
      setInputError("A valid new owner address is required and wallet must be connected.");
      return;
    }
    if (newOwner.toLowerCase() === ownerAddress.toLowerCase()) {
      setInputError("New owner cannot be the same as the current owner.");
      return;
    }
    // Ensure the connected wallet IS the current owner
    if (connectedOwnerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
      setInputError("Only the current owner can initiate this transfer.");
      return;
    }
    // Ensure connected to the correct chain
    if (chainId !== LENS_CHAIN_ID) {
      setInputError(`Please switch your wallet to Lens Chain (ID: ${LENS_CHAIN_ID}) to proceed.`);
      return;
    }

    console.log(`Initiating ownership transfer to ${newOwner} for account ${lensAccountAddress}`);
    writeContract({
      address: lensAccountAddress,
      abi: LENS_ACCOUNT_ABI,
      functionName: "transferOwnership",
      args: [newOwner as Address],
      account: connectedOwnerAddress,
      chainId: LENS_CHAIN_ID,
    });
  };

  // Display Success/Error messages after transaction attempt
  let statusMessage = null;
  if (isLoading) {
    statusMessage = (
      <div className="flex items-center text-indigo-600 text-sm mt-2">
        <ArrowPathIcon className="w-4 h-4 mr-1 animate-spin" />
        {isWritePending ? "Waiting for confirmation..." : "Processing transaction..."}
      </div>
    );
  } else if (isConfirmed) {
    statusMessage = (
      <div className="flex items-center text-green-600 text-sm mt-2">
        <CheckCircleIcon className="w-4 h-4 mr-1" />
        Ownership transferred successfully! Please login with the new owner account.
      </div>
    );
  } else if (txError) {
    statusMessage = (
      <div className="flex items-center text-red-600 text-sm mt-2">
        <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
        Error: {txError.message.split(":")[0]} {/* Show concise error */}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Account Owner</h2>
      <div className="flex items-center bg-gray-50 p-3 rounded-md border border-gray-200 mb-4">
        <p className="text-sm font-mono text-gray-700 break-all flex-1">{ownerAddress}</p>
        <button
          onClick={handleOpenExplorer}
          title="View on Explorer"
          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-200 rounded-md transition-colors duration-150"
        >
          <ArrowTopRightOnSquareIcon className="w-5 h-5" />
        </button>
        <button
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy Address"}
          className={`p-2 rounded-md transition-colors duration-150 ${
            copied ? "text-green-600 bg-green-100" : "text-gray-500 hover:text-indigo-600 hover:bg-gray-200"
          }`}
        >
          {copied ? <CheckIcon className="w-5 h-5" /> : <DocumentDuplicateIcon className="w-5 h-5" />}
        </button>
      </div>

      {!isChangingOwner && (
        <button onClick={handleToggleChangeOwner} className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline">
          Change Owner
        </button>
      )}

      {isChangingOwner && (
        <div className="mt-4 p-4 border border-red-200 rounded-md bg-red-50 space-y-4">
          <div className="flex items-center text-red-700">
            <ExclamationTriangleIcon className="w-6 h-6 mr-2" />
            <p className="text-sm font-semibold">Danger Zone: Transfer Ownership</p>
          </div>
          <p className="text-xs text-red-600">
            Warning: Transferring ownership is irreversible. Ensure the new address is correct and accessible. You will lose control of this Lens
            Account if you proceed.
          </p>
          <div>
            <label htmlFor="new-owner" className="block text-sm font-medium text-gray-700 mb-1">
              New Owner Address
            </label>
            <input
              id="new-owner"
              name="new-owner"
              type="text"
              value={newOwner}
              onChange={handleNewOwnerChange}
              placeholder="0x..."
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
                inputError ? "border-red-500 ring-red-500" : "border-gray-300 focus:ring-red-500 focus:border-red-500"
              }`}
            />
            {inputError && <p className="mt-1 text-xs text-red-600">{inputError}</p>}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleConfirmChangeOwner}
              disabled={!isAddress(newOwner) || newOwner.toLowerCase() === ownerAddress.toLowerCase() || isLoading || isConfirmed}
              className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Processing..." : isConfirmed ? "Transferred" : "Confirm Change Owner"}
            </button>
            <button
              onClick={handleToggleChangeOwner}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
          {/* Display status message */}
          <div className="min-h-[20px]">{statusMessage}</div>
        </div>
      )}
    </div>
  );
}
