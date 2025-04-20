// src/components/WcRequestDisplay.tsx
"use client";

import React, { useState, useEffect } from "react"; // <<<--- IMPORT useEffect
import { useWalletConnect } from "@/contexts/WalletConnectProvider";
import { useLensAccount } from "@/contexts/LensAccountContext";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem"; // Removed parseAbiItem as it's not used here
import { getSdkError } from "@walletconnect/utils";
// Import formatters from the correct package
import { formatJsonRpcError, formatJsonRpcResult } from "@walletconnect/jsonrpc-utils"; // <<<--- CORRECTED IMPORT
import { LENS_ACCOUNT_ABI, LENS_CHAIN_ID, lensChain } from "@/lib/constants";
import Image from "next/image";

// Basic Fallback Icon Component
const FallbackIcon = ({ size = 30 }: { size?: number }) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className="rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs"
  >
    ?
  </div>
);

// Helper function to resolve icon URL
const resolveIconUrl = (iconPath: string | null | undefined, baseUrl: string | null | undefined): string | undefined => {
  if (!iconPath) return undefined;
  try {
    if (iconPath.startsWith("http://") || iconPath.startsWith("https://")) {
      return iconPath;
    }
    if (iconPath.startsWith("/") && baseUrl) {
      const origin = new URL(baseUrl).origin;
      return `${origin}${iconPath}`;
    }
    console.warn("Invalid icon URL format:", iconPath);
    return undefined;
  } catch (e) {
    console.warn("Error resolving icon URL:", e);
    return undefined;
  }
};

// Icon component with error handling
const DAppIcon = ({ iconUrl, name, size = 40 }: { iconUrl?: string; name: string; size?: number }) => {
  const [hasError, setHasError] = useState(false);
  useEffect(() => setHasError(false), [iconUrl]); // Reset error state if URL changes

  if (!iconUrl || hasError) return <FallbackIcon size={size} />; // Use size prop here too

  return (
    <Image
      src={iconUrl}
      alt={`${name} icon`}
      width={size}
      height={size}
      className="rounded-full"
      unoptimized
      onError={() => {
        console.warn("Failed to load icon:", iconUrl);
        setHasError(true);
      }}
    />
  );
};

export function WcRequestDisplay() {
  const { pendingRequest, respondRequest, error: wcError, isLoading: isWcLoading } = useWalletConnect();
  const { lensAccountAddress } = useLensAccount();
  const { address: ownerAddress, chainId: ownerChainId } = useAccount();
  const { data: hash, error: writeError, isPending: isWritePending, writeContractAsync } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash, chainId: LENS_CHAIN_ID });

  const [localError, setLocalError] = useState<string | null>(null);
  const [localLoadingMessage, setLocalLoadingMessage] = useState<string | null>(null);

  // Clear local state when pending request changes
  useEffect(() => {
    setLocalError(null);
    setLocalLoadingMessage(null);
  }, [pendingRequest]);

  // Handle transaction submission result
  useEffect(() => {
    if (!pendingRequest || !hash) return;

    if (isConfirming) {
      setLocalLoadingMessage("Waiting for transaction confirmation...");
      return;
    }

    if (receiptError) {
      console.error("Transaction Receipt Error:", receiptError);
      setLocalError(`Transaction failed: ${receiptError.message}`);
      respondRequest(formatJsonRpcError(pendingRequest.id, { code: -32000, message: "Transaction Failed on chain" }));
      return;
    }

    if (isConfirmed && receipt) {
      setLocalLoadingMessage(null);
      if (receipt.status === "success") {
        console.log("Transaction successful:", receipt.transactionHash);
        respondRequest(formatJsonRpcResult(pendingRequest.id, receipt.transactionHash));
      } else {
        console.error("Transaction reverted:", receipt);
        setLocalError("Transaction reverted on chain.");
        respondRequest(formatJsonRpcError(pendingRequest.id, { code: -32000, message: "Transaction reverted" }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirming, isConfirmed, receiptError, receipt, hash, pendingRequest, respondRequest]); // Keep respondRequest here

  // Handle direct write errors (like user rejection)
  useEffect(() => {
    if (writeError && pendingRequest) {
      console.error("Write Contract Error:", writeError);
      setLocalError(`Transaction rejected or failed to send: ${writeError.message}`);
      // Use getSdkError directly as the error payload
      respondRequest(formatJsonRpcError(pendingRequest.id, getSdkError("USER_REJECTED"))); // <<<--- CORRECTED
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeError, pendingRequest, respondRequest]); // Keep respondRequest here

  const handleApprove = async () => {
    if (!pendingRequest || !lensAccountAddress || !ownerAddress) {
      setLocalError("Missing required information to send transaction.");
      return;
    }
    if (ownerChainId !== LENS_CHAIN_ID) {
      setLocalError("Owner wallet is not connected to Lens Chain.");
      return;
    }

    setLocalError(null);
    setLocalLoadingMessage("Please confirm in your wallet...");

    const { method, params } = pendingRequest.params.request;

    if (method !== "eth_sendTransaction") {
      setLocalError(`Unsupported method: ${method}`);
      respondRequest(formatJsonRpcError(pendingRequest.id, { code: 4200, message: "Method not supported" }));
      return;
    }

    const tx = params[0] as { to?: `0x${string}`; value?: string; data?: `0x${string}` };
    const targetAddress = tx.to;
    const value = tx.value ? BigInt(tx.value) : 0n; // BigInt literal should work now
    const data = tx.data || "0x";

    if (!targetAddress) {
      setLocalError("Transaction 'to' address is missing.");
      respondRequest(formatJsonRpcError(pendingRequest.id, { code: -32602, message: "Invalid parameters: missing 'to' address" }));
      return;
    }

    try {
      await writeContractAsync({
        address: lensAccountAddress,
        abi: LENS_ACCOUNT_ABI,
        functionName: "executeTransaction",
        args: [targetAddress, value, data],
        account: ownerAddress,
        chainId: LENS_CHAIN_ID,
      });
    } catch (error) {
      console.error("Error initiating transaction:", error);
      if (!writeError) {
        setLocalError(`Failed to initiate transaction: ${(error as Error).message}`);
      }
    }
  };

  const handleReject = () => {
    if (!pendingRequest) return;
    setLocalError(null);
    setLocalLoadingMessage(null);
    console.log("Rejecting request:", pendingRequest.id);
    // Use getSdkError directly as the error payload
    respondRequest(formatJsonRpcError(pendingRequest.id, getSdkError("USER_REJECTED"))); // <<<--- CORRECTED
  };

  if (!pendingRequest) {
    return (
      <div className="p-4 border rounded-md bg-gray-50">
        <p className="text-gray-600 text-center italic">No pending WalletConnect requests.</p>
      </div>
    );
  }

  // Extract request details
  const { request, chainId } = pendingRequest.params;
  const txDetails = request.params[0] as { to?: string; value?: string; data?: string };
  const dAppName = pendingRequest.verifyContext?.verified.origin || "Unknown dApp"; // Use origin for name/url
  const dAppUrl = pendingRequest.verifyContext?.verified.origin;
  // TODO: Get icon from proposal metadata cache if possible, or use a generic icon
  // const dAppIconUrl = resolveIconUrl(???);

  const formattedValue = txDetails.value
    ? `${formatUnits(BigInt(txDetails.value), lensChain.nativeCurrency.decimals)} ${lensChain.nativeCurrency.symbol}`
    : `0 ${lensChain.nativeCurrency.symbol}`;

  const isLoading = isWritePending || isConfirming || isWcLoading;

  return (
    <div className="p-4 border-2 border-blue-300 rounded-md bg-blue-50 shadow-md space-y-4">
      <h3 className="text-md font-semibold text-blue-800">WalletConnect Request</h3>

      <div className="flex items-center space-x-3 mb-3 pb-3 border-b border-blue-200">
        {/* <DAppIcon iconUrl={dAppIconUrl} name={dAppName} size={30} /> */}
        <FallbackIcon size={30} />
        <div>
          <p className="text-sm font-medium text-gray-800">{dAppName}</p>
          {dAppUrl && <p className="text-xs text-gray-500">{dAppUrl}</p>}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <p>
          <strong className="text-gray-600">Method:</strong> <span className="font-mono bg-gray-100 px-1 rounded">{request.method}</span>
        </p>
        <p>
          <strong className="text-gray-600">Chain:</strong> <span className="font-mono bg-gray-100 px-1 rounded">{chainId}</span>
        </p>
        <p>
          <strong className="text-gray-600">Target (to):</strong> <span className="font-mono text-xs break-all">{txDetails.to ?? "N/A"}</span>
        </p>
        <p>
          <strong className="text-gray-600">Value:</strong> <span className="font-mono">{formattedValue}</span>
        </p>
        <div>
          <strong className="text-gray-600">Data:</strong>
          <textarea
            readOnly
            value={txDetails.data ?? "0x"}
            className="mt-1 w-full h-20 p-1 border border-gray-300 rounded text-xs font-mono bg-gray-50"
          />
        </div>
      </div>

      {/* Status Display */}
      {localLoadingMessage && <p className="text-sm text-center text-indigo-600 animate-pulse">{localLoadingMessage}</p>}
      {localError && <p className="text-sm text-center text-red-600">{localError}</p>}
      {wcError && !localError && <p className="text-sm text-center text-red-600">WC Error: {wcError}</p>}

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-2">
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isWritePending ? "Check Wallet..." : isConfirming ? "Confirming..." : "Approve & Send"}
        </button>
        <button
          onClick={handleReject}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
